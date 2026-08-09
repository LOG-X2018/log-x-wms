const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-x-wms-erp-'));
process.env.LOG_X_WMS_DB_FILE = path.join(tempDir, 'db.json');
const { server, seed, access, AREA_FIELDS } = require('../server');

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

test('ERP/WMS seed exposes permission areas, dictionaries and user highlight colors', () => {
  const db = seed();
  assert.equal(db.users[0].highlightColor, '#4F46E5');
  assert.equal(db.dictionaries.stock_movement_type.options[0].code, 'receipt');
  assert.equal(db.dictionaries.outbound_status.options.at(-1).code, 'cancelled');
  assert.deepEqual(AREA_FIELDS.inventory_items, ['sku', 'name', 'unit', 'status', 'onHand', 'reorderPoint']);
  assert.equal(access(db, 'u-viewer', 'warehouse_locations', 'code'), 'read');
  assert.equal(access(db, 'u-editor', 'outbound_orders', 'status'), 'write');
});

test('highlight validation and ERP/WMS CRUD preserve stock, permissions and field audit', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (url, options = {}, actor = 'u-admin') => {
    const response = await fetch(base + url, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'X-Actor-Id': actor, ...(options.headers || {}) }
    });
    const value = response.status === 204 ? null : await response.json();
    return { response, value };
  };
  const post = (url, value, actor) => call(url, { method: 'POST', body: JSON.stringify(value) }, actor);
  const put = (url, value, actor) => call(url, { method: 'PUT', body: JSON.stringify(value) }, actor);
  try {
    const bootstrap = await call('/api/bootstrap?language=de');
    assert.equal(bootstrap.response.status, 200);
    assert.deepEqual({ kind: bootstrap.value.persistence.kind, persistent: bootstrap.value.persistence.persistent }, { kind: 'file', persistent: false });
    assert.equal(bootstrap.value.currentActor.highlightColor, '#4F46E5');
    assert.ok(bootstrap.value.wms.inventoryItems.length >= 2);
    assert.equal(bootstrap.value.lookups.warehouse_location_type.options[1].code, 'storage');
    assert.equal(bootstrap.value.lookups.warehouse_location_type.options[1].label, 'Lagerung');

    const invalidColor = await post('/api/users', { name: 'Hibás szín', email: 'bad.color@example.com', role: 'viewer', highlightColor: '#12FG00' });
    assert.equal(invalidColor.response.status, 400);
    assert.equal(invalidColor.value.code, 'invalid_color');
    const coloredUser = await post('/api/users', { name: 'Színes felhasználó', email: 'color@example.com', role: 'viewer', highlightColor: '#a1b2c3' });
    assert.equal(coloredUser.response.status, 201);
    assert.equal(coloredUser.value.highlightColor, '#A1B2C3');
    const recolored = await put(`/api/users/${coloredUser.value.id}`, { highlightColor: '#102030' });
    assert.equal(recolored.response.status, 200);
    assert.equal(recolored.value.highlightColor, '#102030');

    const badLocation = await post('/api/warehouse-locations', { code: 'BAD', name: 'Hibás', type: 'storage', capacity: 'sok', active: true });
    assert.equal(badLocation.response.status, 400);
    assert.equal(badLocation.value.code, 'invalid_number');
    const location = await post('/api/warehouse-locations', { code: 'qa-01', name: 'QA tárolóhely', type: 'storage', capacity: 25, active: true });
    assert.equal(location.response.status, 201);
    assert.equal(location.value.code, 'QA-01');

    const item = await post('/api/inventory-items', { sku: 'qa-item', name: 'QA készletcikk', unit: 'pcs', status: 'active', reorderPoint: 3 });
    assert.equal(item.response.status, 201);
    assert.equal(item.value.sku, 'QA-ITEM');
    assert.equal(item.value.onHand, 0);
    const directStock = await put(`/api/inventory-items/${item.value.id}`, { onHand: 12 });
    assert.equal(directStock.response.status, 400);
    assert.equal(directStock.value.code, 'calculated_field');

    const negative = await post('/api/stock-movements', { itemId: item.value.id, locationId: location.value.id, type: 'issue', quantity: 1, reference: 'NEG' });
    assert.equal(negative.response.status, 409);
    assert.equal(negative.value.code, 'negative_stock');
    const movement = await post('/api/stock-movements', { itemId: item.value.id, locationId: location.value.id, type: 'receipt', quantity: 10, reference: 'IN-QA', note: 'Beérkezés' });
    assert.equal(movement.response.status, 201);
    assert.equal((await call(`/api/inventory-items/${item.value.id}`)).value.onHand, 10);
    const adjustedMovement = await put(`/api/stock-movements/${movement.value.id}`, { quantity: 6 });
    assert.equal(adjustedMovement.response.status, 200);
    assert.equal((await call(`/api/inventory-items/${item.value.id}`)).value.onHand, 6);

    const badReceipt = await post('/api/inbound-receipts', { receiptNo: 'IN-QA', supplier: 'QA Supplier', status: 'unknown', itemId: item.value.id, locationId: location.value.id, quantity: 4 });
    assert.equal(badReceipt.response.status, 400);
    assert.equal(badReceipt.value.code, 'invalid_option');
    const receipt = await post('/api/inbound-receipts', { receiptNo: 'IN-QA', supplier: 'QA Supplier', status: 'planned', itemId: item.value.id, locationId: location.value.id, quantity: 4, note: '' });
    assert.equal(receipt.response.status, 201);
    const received = await put(`/api/inbound-receipts/${receipt.value.id}`, { status: 'received' });
    assert.equal(received.response.status, 200);
    assert.match(received.value.receivedAt, /^\d{4}-\d{2}-\d{2}T/);

    const order = await post('/api/outbound-orders', { orderNo: 'OUT-QA', customer: 'QA Customer', status: 'new', priority: 'high', itemId: item.value.id, locationId: location.value.id, quantity: 2, shipBy: '2026-08-12T08:30:00Z' });
    assert.equal(order.response.status, 201);
    const picked = await put(`/api/outbound-orders/${order.value.id}`, { status: 'picking' });
    assert.equal(picked.response.status, 200);
    assert.equal(picked.value.status, 'picking');

    const referencedDelete = await call(`/api/inventory-items/${item.value.id}`, { method: 'DELETE' });
    assert.equal(referencedDelete.response.status, 409);
    assert.equal(referencedDelete.value.code, 'referenced_record');

    await put('/api/permissions', { userId: 'u-viewer', area: 'inventory_items', field: 'onHand', access: 'deny' });
    const viewerBootstrap = await call('/api/bootstrap', {}, 'u-viewer');
    assert.equal(Object.hasOwn(viewerBootstrap.value.wms.inventoryItems[0], 'onHand'), false);
    assert.equal((await post('/api/inventory-items', { sku: 'DENIED', name: 'Tiltott', unit: 'pcs', status: 'active', reorderPoint: 0 }, 'u-viewer')).response.status, 403);

    assert.equal((await call(`/api/outbound-orders/${order.value.id}`, { method: 'DELETE' })).response.status, 204);
    assert.equal((await call(`/api/inbound-receipts/${receipt.value.id}`, { method: 'DELETE' })).response.status, 204);
    assert.equal((await call(`/api/stock-movements/${movement.value.id}`, { method: 'DELETE' })).response.status, 204);
    assert.equal((await call(`/api/inventory-items/${item.value.id}`)).value.onHand, 0);
    assert.equal((await call(`/api/inventory-items/${item.value.id}`, { method: 'DELETE' })).response.status, 204);
    assert.equal((await call(`/api/warehouse-locations/${location.value.id}`, { method: 'DELETE' })).response.status, 204);

    const auditLog = await call('/api/audit');
    assert.ok(auditLog.value.some(entry => entry.table === 'users' && entry.record === coloredUser.value.id && entry.field === 'highlightColor' && entry.after === '#102030'));
    assert.ok(auditLog.value.some(entry => entry.table === 'inventory_items' && entry.record === item.value.id && entry.field === 'onHand' && entry.after === 10));
    assert.ok(auditLog.value.some(entry => entry.table === 'stock_movements' && entry.record === movement.value.id && entry.action === 'update' && entry.field === 'quantity'));
    assert.ok(auditLog.value.some(entry => entry.table === 'inbound_receipts' && entry.record === receipt.value.id && entry.field === 'status' && entry.after === 'received'));
    assert.ok(auditLog.value.some(entry => entry.table === 'outbound_orders' && entry.record === order.value.id && entry.field === 'status' && entry.after === 'picking'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
