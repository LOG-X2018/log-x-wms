const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-x-wms-'));
process.env.LOG_X_WMS_DB_FILE = path.join(tempDir, 'db.json');
const { server, seed, access } = require('../server');

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

test('seed uses clean UTF-8 and per-user effective permissions', () => {
  const db = seed();
  assert.equal(db.translations.hu.app_subtitle, 'Adatvezérelt validációs környezet');
  assert.equal(db.users[2].name, 'Megfigyelő');
  assert.equal(db.permissions['u-admin'].permissions.table, 'write');
  assert.equal(access(db, 'u-viewer', 'entity', 'risk'), 'deny');
  assert.equal(access(db, 'u-editor', 'entity', 'code'), 'read');
});

test('API audits entities, users and permission changes and enforces denied fields', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (url, options = {}, actor = 'u-admin') => {
    const response = await fetch(base + url, { ...options, headers: { 'Content-Type': 'application/json', 'X-Actor-Id': actor, ...(options.headers || {}) } });
    const value = response.status === 204 ? null : await response.json();
    return { response, value };
  };
  try {
    const bootstrap = await call('/api/bootstrap');
    assert.equal(bootstrap.response.status, 200);
    assert.equal(bootstrap.value.translations.hu.nav_permissions, 'Jogosultságok');

    const created = await call('/api/users', { method: 'POST', body: JSON.stringify({ name: 'Teszt Elek', email: 'teszt@example.com', role: 'viewer' }) });
    assert.equal(created.response.status, 201);
    const userId = created.value.id;

    const permission = await call('/api/permissions', { method: 'PUT', body: JSON.stringify({ userId, area: 'entity', field: 'name', access: 'read' }) });
    assert.equal(permission.response.status, 200);

    const updated = await call('/api/entities/e-2', { method: 'PUT', body: JSON.stringify({ name: 'Naplózott módosítás' }) });
    assert.equal(updated.response.status, 200);

    const deniedBootstrap = await call('/api/bootstrap', {}, userId);
    assert.equal(deniedBootstrap.response.status, 200);
    assert.equal(Object.hasOwn(deniedBootstrap.value.entities[0], 'risk'), false);
    const deniedWrite = await call('/api/entities/e-2', { method: 'PUT', body: JSON.stringify({ name: 'Tiltott írás' }) }, userId);
    assert.equal(deniedWrite.response.status, 403);

    const audit = await call('/api/audit');
    assert.equal(audit.response.status, 200);
    assert.ok(audit.value.some(entry => entry.table === 'users' && entry.action === 'create'));
    assert.ok(audit.value.some(entry => entry.table === 'access_permissions' && entry.action === 'permission_change'));
    assert.ok(audit.value.some(entry => entry.table === 'test_entities' && entry.field === 'name' && entry.after === 'Naplózott módosítás'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
