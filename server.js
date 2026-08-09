const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  defaultTranslations,
  defaultDictionaries,
  ensureTranslationData,
  initializeLanguageStructure,
  localizedDictionaries,
  buildTranslationEditor,
  setTranslationValue,
  hasDictionaryOption
} = require('./lib/translations');
const { createStateStore } = require('./lib/supabase-store');

const ROOT = __dirname;
const DB_FILE = process.env.LOG_X_WMS_DB_FILE || path.join(ROOT, 'data', 'db.json');
const stateStore = createStateStore({ env: process.env, fallbackFile: DB_FILE, seedFactory: initialState });
const SCHEMA_VERSION = 4;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const AREA_FIELDS = {
  entity: ['code', 'name', 'owner', 'status', 'risk'],
  users: ['name', 'email', 'role', 'active', 'highlightColor'],
  permissions: [],
  audit: ['actor', 'table', 'record', 'action', 'field', 'before', 'after', 'when'],
  translations: ['language', 'translation_key', 'translation_value'],
  inventory_items: ['sku', 'name', 'unit', 'status', 'onHand', 'reorderPoint'],
  stock_movements: ['itemId', 'locationId', 'type', 'quantity', 'reference', 'note', 'occurredAt'],
  warehouse_locations: ['code', 'name', 'type', 'capacity', 'active'],
  inbound_receipts: ['receiptNo', 'supplier', 'status', 'itemId', 'locationId', 'quantity', 'receivedAt', 'note'],
  outbound_orders: ['orderNo', 'customer', 'status', 'priority', 'itemId', 'locationId', 'quantity', 'shipBy', 'note']
};
const now = () => new Date().toISOString();
const rank = { deny: 0, read: 1, write: 2 };
const VALID_ROLES = new Set(['admin', 'editor', 'viewer']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const ROLE_HIGHLIGHTS = { admin: '#4F46E5', editor: '#0F766E', viewer: '#B45309' };

function dictionary(key, englishName, options) {
  return {
    key,
    englishName,
    options: options.map(([code, english, hu, de], index) => ({
      code,
      key: `option.${key}.${code}`,
      englishName: english,
      sortOrder: (index + 1) * 10,
      enabled: true,
      labels: { en: english, hu, de }
    }))
  };
}

function businessDictionaries() {
  return {
    unit_of_measure: dictionary('unit_of_measure', 'Unit of measure', [
      ['pcs', 'Pieces', 'Darab', 'Stück'], ['kg', 'Kilograms', 'Kilogramm', 'Kilogramm'], ['pallet', 'Pallets', 'Raklap', 'Paletten']
    ]),
    item_status: dictionary('item_status', 'Item status', [
      ['active', 'Active', 'Aktív', 'Aktiv'], ['blocked', 'Blocked', 'Zárolt', 'Gesperrt'], ['discontinued', 'Discontinued', 'Kifutott', 'Eingestellt']
    ]),
    stock_movement_type: dictionary('stock_movement_type', 'Stock movement type', [
      ['receipt', 'Receipt', 'Bevételezés', 'Wareneingang'], ['issue', 'Issue', 'Kiadás', 'Ausgabe'], ['adjustment_in', 'Positive adjustment', 'Pozitív korrekció', 'Positive Korrektur'], ['adjustment_out', 'Negative adjustment', 'Negatív korrekció', 'Negative Korrektur']
    ]),
    warehouse_location_type: dictionary('warehouse_location_type', 'Warehouse location type', [
      ['receiving', 'Receiving', 'Áruátvétel', 'Wareneingang'], ['storage', 'Storage', 'Tárolás', 'Lagerung'], ['picking', 'Picking', 'Kiszedés', 'Kommissionierung'], ['shipping', 'Shipping', 'Kiadás', 'Versand']
    ]),
    inbound_status: dictionary('inbound_status', 'Inbound receipt status', [
      ['planned', 'Planned', 'Tervezett', 'Geplant'], ['in_progress', 'In progress', 'Folyamatban', 'In Bearbeitung'], ['received', 'Received', 'Bevételezve', 'Empfangen'], ['cancelled', 'Cancelled', 'Törölve', 'Storniert']
    ]),
    outbound_status: dictionary('outbound_status', 'Outbound order status', [
      ['new', 'New', 'Új', 'Neu'], ['picking', 'Picking', 'Kiszedés alatt', 'Kommissionierung'], ['packed', 'Packed', 'Csomagolva', 'Verpackt'], ['shipped', 'Shipped', 'Kiszállítva', 'Versandt'], ['cancelled', 'Cancelled', 'Törölve', 'Storniert']
    ]),
    order_priority: dictionary('order_priority', 'Order priority', [
      ['low', 'Low', 'Alacsony', 'Niedrig'], ['normal', 'Normal', 'Normál', 'Normal'], ['high', 'High', 'Magas', 'Hoch']
    ])
  };
}

function area(table, fields = {}) { return { table, fields }; }
function allFields(access, fields) { return Object.fromEntries(fields.map(field => [field, access])); }
function businessPermissionAreas(tableAccess, fieldAccess = tableAccess) {
  return Object.fromEntries(['inventory_items', 'stock_movements', 'warehouse_locations', 'inbound_receipts', 'outbound_orders'].map(areaName => [
    areaName,
    area(tableAccess, allFields(fieldAccess, AREA_FIELDS[areaName]))
  ]));
}
function permissionTemplate(role) {
  if (role === 'admin') return {
    entity: area('write', allFields('write', AREA_FIELDS.entity)),
    users: area('write', allFields('write', AREA_FIELDS.users)),
    permissions: area('write'),
    audit: area('read', allFields('read', AREA_FIELDS.audit)),
    translations: area('write', allFields('write', AREA_FIELDS.translations)),
    ...businessPermissionAreas('write')
  };
  if (role === 'editor') return {
    entity: area('write', { code: 'read', name: 'write', owner: 'write', status: 'write', risk: 'read' }),
    users: area('read', allFields('read', AREA_FIELDS.users)),
    permissions: area('deny'), audit: area('read', allFields('read', AREA_FIELDS.audit)), translations: area('deny'),
    ...businessPermissionAreas('write')
  };
  return {
    entity: area('read', { code: 'read', name: 'read', owner: 'read', status: 'read', risk: 'deny' }),
    users: area('deny'), permissions: area('deny'), audit: area('deny'), translations: area('deny'),
    ...businessPermissionAreas('read')
  };
}

function seed() {
  const users = [
    { id: 'u-admin', name: 'Rendszeradmin', email: 'admin@logxwms.local', role: 'admin', active: true, highlightColor: '#4F46E5' },
    { id: 'u-editor', name: 'Projektgazda', email: 'owner@logxwms.local', role: 'editor', active: true, highlightColor: '#0F766E' },
    { id: 'u-viewer', name: 'Megfigyelő', email: 'viewer@logxwms.local', role: 'viewer', active: true, highlightColor: '#B45309' }
  ];
  const warehouseLocations = [
    { id: 'loc-receiving', code: 'REC-01', name: 'Központi áruátvétel', type: 'receiving', capacity: 60, active: true, updatedAt: '2026-08-08T07:30:00.000Z' },
    { id: 'loc-storage-a', code: 'A-01-01', name: 'A csarnok 1. állvány', type: 'storage', capacity: 240, active: true, updatedAt: '2026-08-08T07:30:00.000Z' },
    { id: 'loc-picking', code: 'PICK-01', name: 'Gyors kiszedőhely', type: 'picking', capacity: 80, active: true, updatedAt: '2026-08-08T07:30:00.000Z' }
  ];
  const inventoryItems = [
    { id: 'item-scanner', sku: 'SCAN-MOB-01', name: 'Mobil vonalkódolvasó', unit: 'pcs', status: 'active', onHand: 128, reorderPoint: 24, updatedAt: '2026-08-08T08:15:00.000Z' },
    { id: 'item-label', sku: 'LBL-100X150', name: 'Raklapcímke 100 × 150 mm', unit: 'pcs', status: 'active', onHand: 36, reorderPoint: 100, updatedAt: '2026-08-08T09:20:00.000Z' }
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    entities: [
      { id: 'e-1', code: 'WMS-001', name: 'Belépési folyamat validáció', owner: 'Projektgazda', status: 'active', risk: 'medium', updatedAt: '2026-08-08T08:30:00.000Z' },
      { id: 'e-2', code: 'WMS-002', name: 'Jogosultságmátrix teszt', owner: 'Rendszeradmin', status: 'draft', risk: 'high', updatedAt: '2026-08-07T15:12:00.000Z' }
    ],
    permissions: Object.fromEntries(users.map(user => [user.id, permissionTemplate(user.role)])),
    warehouseLocations,
    inventoryItems,
    stockMovements: [
      { id: 'move-in-1', itemId: 'item-scanner', locationId: 'loc-storage-a', type: 'receipt', quantity: 128, reference: 'PO-2026-0042', note: 'Nyitókészlet', occurredAt: '2026-08-08T08:15:00.000Z', updatedAt: '2026-08-08T08:15:00.000Z' },
      { id: 'move-in-2', itemId: 'item-label', locationId: 'loc-receiving', type: 'receipt', quantity: 40, reference: 'PO-2026-0043', note: 'Címkeutánpótlás', occurredAt: '2026-08-08T09:00:00.000Z', updatedAt: '2026-08-08T09:00:00.000Z' },
      { id: 'move-out-1', itemId: 'item-label', locationId: 'loc-picking', type: 'issue', quantity: 4, reference: 'SO-2026-0188', note: 'Kiszedési csomag', occurredAt: '2026-08-08T09:20:00.000Z', updatedAt: '2026-08-08T09:20:00.000Z' }
    ],
    inboundReceipts: [
      { id: 'receipt-1', receiptNo: 'IN-2026-0043', supplier: 'Demo Supply Kft.', status: 'received', itemId: 'item-label', locationId: 'loc-receiving', quantity: 40, receivedAt: '2026-08-08T09:00:00.000Z', note: 'Mennyiségi ellenőrzés rendben', updatedAt: '2026-08-08T09:00:00.000Z' }
    ],
    outboundOrders: [
      { id: 'order-1', orderNo: 'OUT-2026-0188', customer: 'Minta Áruház Zrt.', status: 'picking', priority: 'high', itemId: 'item-label', locationId: 'loc-picking', quantity: 4, shipBy: '2026-08-10T14:00:00.000Z', note: 'Mobil komissiózási bemutató', updatedAt: '2026-08-08T09:20:00.000Z' }
    ],
    audit: [
      { id: 'a-1', actorId: 'u-admin', actor: 'Rendszeradmin', table: 'test_entities', record: 'e-1', action: 'update', field: 'status', before: 'draft', after: 'active', at: '2026-08-08T08:30:00.000Z' },
      { id: 'a-2', actorId: 'u-editor', actor: 'Projektgazda', table: 'test_entities', record: 'e-2', action: 'update', field: 'name', before: 'Jogosultság teszt', after: 'Jogosultságmátrix teszt', at: '2026-08-07T15:12:00.000Z' }
    ],
    languages: [{ code: 'hu', name: 'Magyar', enabled: true }, { code: 'en', name: 'English', enabled: true }, { code: 'de', name: 'Deutsch', enabled: true }],
    translations: defaultTranslations(),
    dictionaries: { ...defaultDictionaries(), ...businessDictionaries() }
  };
}

function ensureBusinessData(db) {
  const seeded = seed();
  db.users ||= [];
  db.permissions ||= {};
  for (const user of db.users) {
    if (!HEX_COLOR_PATTERN.test(user.highlightColor || '')) user.highlightColor = ROLE_HIGHLIGHTS[user.role] || '#4F46E5';
    else user.highlightColor = user.highlightColor.toUpperCase();
    const template = permissionTemplate(user.role);
    const userPermissions = db.permissions[user.id] ||= template;
    for (const [areaName, areaTemplate] of Object.entries(template)) {
      userPermissions[areaName] ||= structuredClone(areaTemplate);
    }
  }
  for (const collection of ['warehouseLocations', 'inventoryItems', 'stockMovements', 'inboundReceipts', 'outboundOrders']) {
    if (!Array.isArray(db[collection])) db[collection] = structuredClone(seeded[collection]);
  }
  db.dictionaries ||= {};
  for (const [dictionaryKey, defaultDictionary] of Object.entries(businessDictionaries())) {
    const target = db.dictionaries[dictionaryKey] ||= structuredClone(defaultDictionary);
    target.key ||= defaultDictionary.key;
    target.englishName ||= defaultDictionary.englishName;
    target.options ||= [];
    for (const defaultOption of defaultDictionary.options) {
      const existing = target.options.find(option => option.code === defaultOption.code);
      if (!existing) target.options.push(structuredClone(defaultOption));
      else {
        existing.key ||= defaultOption.key;
        existing.englishName ||= defaultOption.englishName;
        existing.sortOrder ??= defaultOption.sortOrder;
        existing.enabled ??= defaultOption.enabled;
        existing.labels = { ...defaultOption.labels, ...(existing.labels || {}) };
      }
    }
    target.options.sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
  }
  return db;
}

function initialState() { return ensureTranslationData(ensureBusinessData(seed())); }

async function load() {
  const stored = await stateStore.loadState();
  const before = JSON.stringify(stored);
  ensureBusinessData(stored);
  ensureTranslationData(stored);
  stored.schemaVersion = SCHEMA_VERSION;
  if (JSON.stringify(stored) !== before) await save(stored);
  return stored;
}
async function save(value) { await stateStore.saveState(value); }
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(status === 204 ? '' : JSON.stringify(value)); }
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooLarge = false;
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) tooLarge = true;
    });
    req.on('end', () => {
      if (tooLarge) {
        const error = new Error('Request body is too large'); error.status = 413; error.code = 'body_too_large'; reject(error); return;
      }
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (_error) { const error = new Error('Invalid JSON body'); error.status = 400; error.code = 'invalid_json'; reject(error); }
    });
  });
}
function fail(status, message, code = 'invalid') { const error = new Error(message); error.status = status; error.code = code; throw error; }
function requiredText(value) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result) fail(400, 'Missing required field', 'required');
  return result;
}
function normalizedEmail(value) {
  const result = requiredText(value).toLowerCase();
  if (!EMAIL_PATTERN.test(result)) fail(400, 'Invalid email address', 'invalid_email');
  return result;
}
function normalizedHighlightColor(value) {
  if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value)) fail(400, 'Invalid highlight color', 'invalid_color');
  return value.toUpperCase();
}
function boundedText(value, field, maximum = 160) {
  const result = requiredText(value);
  if (result.length > maximum) fail(400, `${field} is too long`, 'invalid_field');
  return result;
}
function optionalText(value, field, maximum = 500) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') fail(400, `${field} must be text`, 'invalid_field');
  const result = value.trim();
  if (result.length > maximum) fail(400, `${field} is too long`, 'invalid_field');
  return result;
}
function finiteNumber(value, field, { minimum = 0, maximum = 1_000_000_000, integer = false, positive = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (positive && value <= 0) || (integer && !Number.isInteger(value))) {
    fail(400, `Invalid ${field}`, 'invalid_number');
  }
  return value;
}
function booleanValue(value, field) {
  if (typeof value !== 'boolean') fail(400, `Invalid ${field}`, 'invalid_field');
  return value;
}
function isoDate(value, field, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string') fail(400, `Invalid ${field}`, 'invalid_date');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) fail(400, `Invalid ${field}`, 'invalid_date');
  return parsed.toISOString();
}
function dictionaryCode(db, dictionaryKey, value, fallback) {
  const result = value === undefined || value === null || value === '' ? fallback : value;
  if (typeof result !== 'string' || !hasDictionaryOption(db, dictionaryKey, result)) fail(400, 'Invalid dictionary option', 'invalid_option');
  return result;
}
function referencedRecord(db, collection, id, field) {
  if (typeof id !== 'string' || !db[collection].some(item => item.id === id)) fail(400, `Invalid ${field}`, 'invalid_reference');
  return id;
}
function assertUnique(db, collection, field, value, ignoredId) {
  if (db[collection].some(item => item.id !== ignoredId && String(item[field]).toLocaleLowerCase() === String(value).toLocaleLowerCase())) {
    fail(409, `${field} already exists`, 'duplicate');
  }
}
function isLastActiveAdmin(db, user) {
  return user.role === 'admin' && user.active && db.users.filter(item => item.role === 'admin' && item.active).length === 1;
}
function requestActor(db, req, fallback = false) {
  const user = db.users.find(item => item.id === req.headers['x-actor-id'] && item.active);
  if (user) return user;
  if (fallback) return db.users.find(item => item.active) || null;
  fail(401, 'Unknown or inactive actor');
}
function access(db, userId, areaName, field) {
  const config = db.permissions[userId]?.[areaName];
  const tableAccess = config?.table || 'deny';
  if (!field || tableAccess === 'deny') return tableAccess;
  const fieldAccess = config?.fields?.[field] || tableAccess;
  return rank[fieldAccess] > rank[tableAccess] ? tableAccess : fieldAccess;
}
function requireAccess(db, actor, areaName, needed, field) {
  if (rank[access(db, actor.id, areaName, field)] < rank[needed]) fail(403, 'Access denied', 'access');
}
function audit(db, actor, table, record, action, field, before, after) {
  db.audit.unshift({ id: randomUUID(), actorId: actor.id, actor: actor.name, table, record: String(record || ''), action, field, before: before ?? null, after: after ?? null, at: now() });
}
function auditFields(db, actor, table, record, action, before, after, fields) {
  for (const field of fields) if (action === 'create' || before?.[field] !== after?.[field]) audit(db, actor, table, record, action, field, before?.[field], after?.[field]);
}
function auditPermissionChanges(db, actor, userId, before = {}, after = {}) {
  const areas = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const areaName of areas) {
    const previous = before?.[areaName]; const next = after?.[areaName]; const record = `${userId}:${areaName}`;
    if ((previous?.table ?? null) !== (next?.table ?? null)) audit(db, actor, 'access_permissions', record, 'permission_change', '__table__', previous?.table, next?.table);
    const fields = new Set([...Object.keys(previous?.fields || {}), ...Object.keys(next?.fields || {})]);
    for (const field of fields) if ((previous?.fields?.[field] ?? null) !== (next?.fields?.[field] ?? null)) audit(db, actor, 'access_permissions', record, 'permission_change', field, previous?.fields?.[field], next?.fields?.[field]);
  }
}
function pickFields(db, actor, areaName, value, fields) {
  const result = { id: value.id };
  for (const field of fields) if (rank[access(db, actor.id, areaName, field)] >= rank.read && value[field] !== undefined) result[field] = value[field];
  return result;
}
function readableCollection(db, actor, areaName, collectionName) {
  if (rank[access(db, actor.id, areaName)] < rank.read) return [];
  return db[collectionName].map(value => pickFields(db, actor, areaName, value, AREA_FIELDS[areaName]));
}
function bootstrap(db, actor, requestedLanguage = 'hu') {
  ensureTranslationData(db);
  const translationEditor = buildTranslationEditor(db, requestedLanguage);
  const canReadPermissions = rank[access(db, actor.id, 'permissions')] >= rank.read;
  const canReadUsers = rank[access(db, actor.id, 'users')] >= rank.read;
  const canReadAudit = rank[access(db, actor.id, 'audit')] >= rank.read;
  return {
    schemaVersion: db.schemaVersion,
    persistence: { kind: stateStore.kind, enabled: stateStore.enabled, persistent: stateStore.persistent, securityMode: stateStore.securityMode || 'local-demo', publicWritable: Boolean(stateStore.publicWritable) },
    currentActorId: actor.id,
    currentActor: { id: actor.id, name: actor.name, role: actor.role, active: actor.active, highlightColor: actor.highlightColor },
    selectedLanguage: translationEditor.targetLanguage,
    users: canReadUsers ? db.users.map(user => pickFields(db, actor, 'users', user, AREA_FIELDS.users)) : db.users.map(({ id, active }) => ({ id, active })),
    entities: rank[access(db, actor.id, 'entity')] >= rank.read ? db.entities.map(entity => pickFields(db, actor, 'entity', entity, AREA_FIELDS.entity)) : [],
    permissions: canReadPermissions ? db.permissions : { [actor.id]: db.permissions[actor.id] },
    audit: canReadAudit ? db.audit.map(entry => pickFields(db, actor, 'audit', { ...entry, id: entry.id, when: entry.at }, AREA_FIELDS.audit)) : [],
    languages: db.languages,
    translations: db.translations,
    lookups: localizedDictionaries(db, translationEditor.targetLanguage),
    translationEditor,
    wms: {
      inventoryItems: readableCollection(db, actor, 'inventory_items', 'inventoryItems'),
      stockMovements: readableCollection(db, actor, 'stock_movements', 'stockMovements'),
      warehouseLocations: readableCollection(db, actor, 'warehouse_locations', 'warehouseLocations'),
      inboundReceipts: readableCollection(db, actor, 'inbound_receipts', 'inboundReceipts'),
      outboundOrders: readableCollection(db, actor, 'outbound_orders', 'outboundOrders')
    }
  };
}

function upperCode(value, field) { return boundedText(value, field, 64).toUpperCase(); }
function validateInventoryItem(db, input, before = null) {
  if (Object.hasOwn(input, 'onHand')) fail(400, 'Stock is changed through movements', 'calculated_field');
  const candidate = { ...(before || {}), ...input };
  const item = {
    ...(before || {}),
    sku: upperCode(candidate.sku, 'sku'),
    name: boundedText(candidate.name, 'name', 160),
    unit: dictionaryCode(db, 'unit_of_measure', candidate.unit, 'pcs'),
    status: dictionaryCode(db, 'item_status', candidate.status, 'active'),
    onHand: before ? before.onHand : 0,
    reorderPoint: finiteNumber(candidate.reorderPoint ?? 0, 'reorderPoint'),
    updatedAt: now()
  };
  assertUnique(db, 'inventoryItems', 'sku', item.sku, before?.id);
  return item;
}
function validateWarehouseLocation(db, input, before = null) {
  const candidate = { ...(before || {}), ...input };
  const item = {
    ...(before || {}),
    code: upperCode(candidate.code, 'code'),
    name: boundedText(candidate.name, 'name', 160),
    type: dictionaryCode(db, 'warehouse_location_type', candidate.type, 'storage'),
    capacity: finiteNumber(candidate.capacity, 'capacity', { positive: true, integer: true }),
    active: candidate.active === undefined ? true : booleanValue(candidate.active, 'active'),
    updatedAt: now()
  };
  assertUnique(db, 'warehouseLocations', 'code', item.code, before?.id);
  return item;
}
function validateStockMovement(db, input, before = null) {
  const candidate = { ...(before || {}), ...input };
  return {
    ...(before || {}),
    itemId: referencedRecord(db, 'inventoryItems', candidate.itemId, 'itemId'),
    locationId: referencedRecord(db, 'warehouseLocations', candidate.locationId, 'locationId'),
    type: dictionaryCode(db, 'stock_movement_type', candidate.type, 'receipt'),
    quantity: finiteNumber(candidate.quantity, 'quantity', { positive: true }),
    reference: optionalText(candidate.reference, 'reference', 80),
    note: optionalText(candidate.note, 'note', 500),
    occurredAt: candidate.occurredAt ? isoDate(candidate.occurredAt, 'occurredAt') : now(),
    updatedAt: now()
  };
}
function validateInboundReceipt(db, input, before = null) {
  const candidate = { ...(before || {}), ...input };
  const status = dictionaryCode(db, 'inbound_status', candidate.status, 'planned');
  let receivedAt = isoDate(candidate.receivedAt, 'receivedAt', true);
  if (status === 'received' && !receivedAt) receivedAt = now();
  const item = {
    ...(before || {}),
    receiptNo: upperCode(candidate.receiptNo, 'receiptNo'),
    supplier: boundedText(candidate.supplier, 'supplier', 160),
    status,
    itemId: referencedRecord(db, 'inventoryItems', candidate.itemId, 'itemId'),
    locationId: referencedRecord(db, 'warehouseLocations', candidate.locationId, 'locationId'),
    quantity: finiteNumber(candidate.quantity, 'quantity', { positive: true }),
    receivedAt,
    note: optionalText(candidate.note, 'note', 500),
    updatedAt: now()
  };
  assertUnique(db, 'inboundReceipts', 'receiptNo', item.receiptNo, before?.id);
  return item;
}
function validateOutboundOrder(db, input, before = null) {
  const candidate = { ...(before || {}), ...input };
  const item = {
    ...(before || {}),
    orderNo: upperCode(candidate.orderNo, 'orderNo'),
    customer: boundedText(candidate.customer, 'customer', 160),
    status: dictionaryCode(db, 'outbound_status', candidate.status, 'new'),
    priority: dictionaryCode(db, 'order_priority', candidate.priority, 'normal'),
    itemId: referencedRecord(db, 'inventoryItems', candidate.itemId, 'itemId'),
    locationId: referencedRecord(db, 'warehouseLocations', candidate.locationId, 'locationId'),
    quantity: finiteNumber(candidate.quantity, 'quantity', { positive: true }),
    shipBy: isoDate(candidate.shipBy, 'shipBy', true),
    note: optionalText(candidate.note, 'note', 500),
    updatedAt: now()
  };
  assertUnique(db, 'outboundOrders', 'orderNo', item.orderNo, before?.id);
  return item;
}
function movementDelta(movement) {
  return ['receipt', 'adjustment_in'].includes(movement.type) ? movement.quantity : -movement.quantity;
}
function applyMovementBalance(db, actor, before, after) {
  const balances = new Map();
  if (before) balances.set(before.itemId, (balances.get(before.itemId) ?? db.inventoryItems.find(item => item.id === before.itemId).onHand) - movementDelta(before));
  if (after) balances.set(after.itemId, (balances.get(after.itemId) ?? db.inventoryItems.find(item => item.id === after.itemId).onHand) + movementDelta(after));
  for (const balance of balances.values()) if (balance < 0) fail(409, 'Stock cannot become negative', 'negative_stock');
  for (const [itemId, balance] of balances) {
    const item = db.inventoryItems.find(value => value.id === itemId);
    if (item.onHand === balance) continue;
    const previous = item.onHand;
    item.onHand = balance;
    item.updatedAt = now();
    audit(db, actor, 'inventory_items', item.id, 'update', 'onHand', previous, balance);
  }
}
function assertInventoryDeleteAllowed(db, _actor, item) {
  const references = [db.stockMovements, db.inboundReceipts, db.outboundOrders];
  if (references.some(collection => collection.some(record => record.itemId === item.id))) fail(409, 'Item is referenced by warehouse transactions', 'referenced_record');
}
function assertLocationDeleteAllowed(db, _actor, location) {
  const references = [db.stockMovements, db.inboundReceipts, db.outboundOrders];
  if (references.some(collection => collection.some(record => record.locationId === location.id))) fail(409, 'Location is referenced by warehouse transactions', 'referenced_record');
}

const WMS_RESOURCES = [
  { segment: 'inventory-items', area: 'inventory_items', collection: 'inventoryItems', table: 'inventory_items', validate: validateInventoryItem, beforeDelete: assertInventoryDeleteAllowed },
  { segment: 'stock-movements', area: 'stock_movements', collection: 'stockMovements', table: 'stock_movements', validate: validateStockMovement, beforeCreate: (db, actor, item) => applyMovementBalance(db, actor, null, item), beforeUpdate: (db, actor, before, after) => applyMovementBalance(db, actor, before, after), beforeDelete: (db, actor, item) => applyMovementBalance(db, actor, item, null) },
  { segment: 'warehouse-locations', area: 'warehouse_locations', collection: 'warehouseLocations', table: 'warehouse_locations', validate: validateWarehouseLocation, beforeDelete: assertLocationDeleteAllowed },
  { segment: 'inbound-receipts', area: 'inbound_receipts', collection: 'inboundReceipts', table: 'inbound_receipts', validate: validateInboundReceipt },
  { segment: 'outbound-orders', area: 'outbound_orders', collection: 'outboundOrders', table: 'outbound_orders', validate: validateOutboundOrder }
];

function resourceRoute(pathname) {
  for (const config of WMS_RESOURCES) {
    const base = `/api/${config.segment}`;
    if (pathname === base) return { config, id: null };
    if (pathname.startsWith(`${base}/`) && !pathname.slice(base.length + 1).includes('/')) return { config, id: decodeURIComponent(pathname.slice(base.length + 1)) };
  }
  return null;
}
async function handleWmsApi(req, res, pathname, db, actor) {
  const route = resourceRoute(pathname);
  if (!route) return false;
  const { config, id } = route;
  const fields = AREA_FIELDS[config.area];
  if (req.method === 'GET') {
    requireAccess(db, actor, config.area, 'read');
    if (!id) return json(res, 200, readableCollection(db, actor, config.area, config.collection)), true;
    const item = db[config.collection].find(record => record.id === id);
    if (!item) fail(404, 'Not found', 'not_found');
    return json(res, 200, pickFields(db, actor, config.area, item, fields)), true;
  }
  if (req.method === 'POST' && !id) {
    requireAccess(db, actor, config.area, 'write');
    const input = await body(req);
    const item = config.validate(db, input);
    for (const field of Object.keys(input).filter(field => fields.includes(field))) requireAccess(db, actor, config.area, 'write', field);
    item.id = randomUUID();
    config.beforeCreate?.(db, actor, item);
    db[config.collection].unshift(item);
    auditFields(db, actor, config.table, item.id, 'create', null, item, fields);
    await save(db);
    json(res, 201, pickFields(db, actor, config.area, item, fields));
    return true;
  }
  const index = id ? db[config.collection].findIndex(record => record.id === id) : -1;
  if (id && ['PUT', 'DELETE'].includes(req.method) && index < 0) fail(404, 'Not found', 'not_found');
  if (req.method === 'PUT' && id) {
    requireAccess(db, actor, config.area, 'write');
    const input = await body(req);
    const allowed = Object.fromEntries(Object.entries(input).filter(([field]) => fields.includes(field)));
    if (!Object.keys(allowed).length) fail(400, 'No editable fields supplied', 'invalid_field');
    for (const field of Object.keys(allowed)) requireAccess(db, actor, config.area, 'write', field);
    const before = db[config.collection][index];
    const updated = config.validate(db, allowed, before);
    updated.id = before.id;
    config.beforeUpdate?.(db, actor, before, updated);
    auditFields(db, actor, config.table, before.id, 'update', before, updated, fields);
    db[config.collection][index] = updated;
    await save(db);
    json(res, 200, pickFields(db, actor, config.area, updated, fields));
    return true;
  }
  if (req.method === 'DELETE' && id) {
    requireAccess(db, actor, config.area, 'write');
    const item = db[config.collection][index];
    config.beforeDelete?.(db, actor, item);
    db[config.collection].splice(index, 1);
    audit(db, actor, config.table, item.id, 'remove', '__record__', item, null);
    await save(db);
    json(res, 204, null);
    return true;
  }
  return false;
}
function serveFile(res, pathname) {
  const publicRoot = path.join(ROOT, 'public');
  const file = pathname === '/' ? path.join(publicRoot, 'index.html') : path.join(publicRoot, pathname.replace(/^\//, ''));
  if (!file.startsWith(publicRoot) || !fs.existsSync(file)) return json(res, 404, { error: 'Not found' });
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return serveFile(res, url.pathname);
    const db = await load();
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, {
      status: 'ok',
      app: 'LOG-X WMS',
      persistence: {
        kind: stateStore.kind,
        persistent: stateStore.persistent,
        securityMode: stateStore.securityMode || 'local-demo'
      }
    });
    if (url.pathname === '/api/bootstrap' && req.method === 'GET') return json(res, 200, bootstrap(db, requestActor(db, req, true), url.searchParams.get('language')));
    const actor = requestActor(db, req);

    if (await handleWmsApi(req, res, url.pathname, db, actor)) return;

    if (url.pathname === '/api/audit' && req.method === 'GET') { requireAccess(db, actor, 'audit', 'read'); return json(res, 200, bootstrap(db, actor).audit); }
    if (url.pathname === '/api/translations' && req.method === 'GET') { requireAccess(db, actor, 'translations', 'read'); return json(res, 200, buildTranslationEditor(db, url.searchParams.get('language'))); }
    if (url.pathname === '/api/entities' && req.method === 'POST') {
      requireAccess(db, actor, 'entity', 'write'); const input = await body(req);
      for (const field of AREA_FIELDS.entity) requireAccess(db, actor, 'entity', 'write', field);
      const code = requiredText(input.code); const name = requiredText(input.name); const owner = requiredText(input.owner);
      if (db.entities.some(item => item.code.toLocaleLowerCase() === code.toLocaleLowerCase())) fail(409, 'Entity code already exists', 'duplicate');
      const status = input.status || 'draft'; const risk = input.risk || 'medium';
      if (!hasDictionaryOption(db, 'status', status) || !hasDictionaryOption(db, 'risk', risk)) fail(400, 'Invalid dictionary option', 'invalid_option');
      const item = { id: randomUUID(), code, name, owner, status, risk, updatedAt: now() };
      db.entities.unshift(item); auditFields(db, actor, 'test_entities', item.id, 'create', null, item, AREA_FIELDS.entity); await save(db); return json(res, 201, item);
    }
    const entityMatch = url.pathname.match(/^\/api\/entities\/([^/]+)$/);
    if (entityMatch && req.method === 'PUT') {
      requireAccess(db, actor, 'entity', 'write'); const index = db.entities.findIndex(item => item.id === entityMatch[1]); if (index < 0) fail(404, 'Not found');
      const changes = await body(req); for (const field of Object.keys(changes)) if (AREA_FIELDS.entity.includes(field)) requireAccess(db, actor, 'entity', 'write', field);
      const before = db.entities[index]; const allowed = Object.fromEntries(Object.entries(changes).filter(([field]) => AREA_FIELDS.entity.includes(field)));
      for (const field of ['code', 'name', 'owner']) if (Object.hasOwn(allowed, field)) allowed[field] = requiredText(allowed[field]);
      const updated = { ...before, ...allowed, id: before.id };
      if (db.entities.some(item => item.id !== before.id && item.code.toLocaleLowerCase() === updated.code.toLocaleLowerCase())) fail(409, 'Entity code already exists', 'duplicate');
      if (!hasDictionaryOption(db, 'status', updated.status) || !hasDictionaryOption(db, 'risk', updated.risk)) fail(400, 'Invalid dictionary option', 'invalid_option');
      if (AREA_FIELDS.entity.some(field => before[field] !== updated[field])) updated.updatedAt = now();
      auditFields(db, actor, 'test_entities', before.id, 'update', before, updated, AREA_FIELDS.entity); db.entities[index] = updated; await save(db); return json(res, 200, pickFields(db, actor, 'entity', updated, AREA_FIELDS.entity));
    }
    if (entityMatch && req.method === 'DELETE') {
      requireAccess(db, actor, 'entity', 'write'); const index = db.entities.findIndex(item => item.id === entityMatch[1]); if (index < 0) fail(404, 'Not found');
      const [removed] = db.entities.splice(index, 1); audit(db, actor, 'test_entities', removed.id, 'remove', '__record__', removed, null); await save(db); return json(res, 204, null);
    }
    if (url.pathname === '/api/users' && req.method === 'POST') {
      requireAccess(db, actor, 'users', 'write'); const input = await body(req); for (const field of ['name', 'email', 'role']) requireAccess(db, actor, 'users', 'write', field);
      if (Object.hasOwn(input, 'active')) { requireAccess(db, actor, 'users', 'write', 'active'); if (typeof input.active !== 'boolean') fail(400, 'Invalid active flag', 'invalid_user'); }
      if (Object.hasOwn(input, 'highlightColor')) requireAccess(db, actor, 'users', 'write', 'highlightColor');
      const name = requiredText(input.name); const email = normalizedEmail(input.email); const role = input.role || 'viewer';
      if (!VALID_ROLES.has(role)) fail(400, 'Invalid user role', 'invalid_user');
      if (db.users.some(item => item.email.toLocaleLowerCase() === email)) fail(409, 'Email already exists', 'duplicate');
      const highlightColor = input.highlightColor === undefined ? ROLE_HIGHLIGHTS[role] : normalizedHighlightColor(input.highlightColor);
      const user = { id: randomUUID(), name, email, role, active: input.active !== false, highlightColor }; const permissions = permissionTemplate(user.role);
      db.users.push(user); db.permissions[user.id] = permissions; auditFields(db, actor, 'users', user.id, 'create', null, user, AREA_FIELDS.users); auditPermissionChanges(db, actor, user.id, {}, permissions); await save(db); return json(res, 201, pickFields(db, actor, 'users', user, AREA_FIELDS.users));
    }
    const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && req.method === 'PUT') {
      requireAccess(db, actor, 'users', 'write'); const index = db.users.findIndex(item => item.id === userMatch[1]); if (index < 0) fail(404, 'Not found');
      const changes = await body(req); for (const field of Object.keys(changes)) if (AREA_FIELDS.users.includes(field)) requireAccess(db, actor, 'users', 'write', field);
      const before = db.users[index]; const allowed = Object.fromEntries(Object.entries(changes).filter(([field]) => AREA_FIELDS.users.includes(field)));
      if (Object.hasOwn(allowed, 'name')) allowed.name = requiredText(allowed.name);
      if (Object.hasOwn(allowed, 'email')) allowed.email = normalizedEmail(allowed.email);
      if (Object.hasOwn(allowed, 'role') && !VALID_ROLES.has(allowed.role)) fail(400, 'Invalid user role', 'invalid_user');
      if (Object.hasOwn(allowed, 'active') && typeof allowed.active !== 'boolean') fail(400, 'Invalid active flag', 'invalid_user');
      if (Object.hasOwn(allowed, 'highlightColor')) allowed.highlightColor = normalizedHighlightColor(allowed.highlightColor);
      const updated = { ...before, ...allowed, id: before.id };
      if (db.users.some(item => item.id !== before.id && item.email.toLocaleLowerCase() === updated.email.toLocaleLowerCase())) fail(409, 'Email already exists', 'duplicate');
      if (updated.id === actor.id && updated.active === false) fail(400, 'Cannot deactivate current actor', 'protected_admin');
      if (isLastActiveAdmin(db, before) && (updated.role !== 'admin' || updated.active === false)) fail(400, 'Cannot remove last active administrator', 'protected_admin');
      auditFields(db, actor, 'users', before.id, 'update', before, updated, AREA_FIELDS.users); db.users[index] = updated; await save(db); return json(res, 200, pickFields(db, actor, 'users', updated, AREA_FIELDS.users));
    }
    if (userMatch && req.method === 'DELETE') {
      requireAccess(db, actor, 'users', 'write'); if (userMatch[1] === actor.id) fail(400, 'Cannot delete current actor', 'protected_admin'); const index = db.users.findIndex(item => item.id === userMatch[1]); if (index < 0) fail(404, 'Not found', 'not_found');
      if (isLastActiveAdmin(db, db.users[index])) fail(400, 'Cannot remove last active administrator', 'protected_admin');
      const [removed] = db.users.splice(index, 1); const removedPermissions = db.permissions[removed.id] || {}; delete db.permissions[removed.id]; audit(db, actor, 'users', removed.id, 'remove', '__record__', removed, null); auditPermissionChanges(db, actor, removed.id, removedPermissions, {}); await save(db); return json(res, 204, null);
    }
    if (url.pathname === '/api/permissions' && req.method === 'PUT') {
      requireAccess(db, actor, 'permissions', 'write'); const input = await body(req); const { userId, area: areaName, field, access: nextAccess } = input;
      if (!db.users.some(user => user.id === userId) || !AREA_FIELDS[areaName] || !rank.hasOwnProperty(nextAccess)) fail(400, 'Invalid permission', 'invalid_permission');
      if (field && !AREA_FIELDS[areaName].includes(field)) fail(400, 'Invalid field', 'invalid_permission');
      if (userId === actor.id && areaName === 'permissions' && !field && nextAccess !== 'write') fail(400, 'Cannot remove own permission management access', 'protected_admin');
      db.permissions[userId] ||= permissionTemplate('viewer'); db.permissions[userId][areaName] ||= area('deny'); const config = db.permissions[userId][areaName];
      const previous = field ? (config.fields?.[field] || config.table) : config.table; if (field) { config.fields ||= {}; config.fields[field] = nextAccess; } else config.table = nextAccess;
      audit(db, actor, 'access_permissions', `${userId}:${areaName}`, 'permission_change', field || '__table__', previous, nextAccess); await save(db); return json(res, 200, db.permissions);
    }
    if (url.pathname === '/api/languages' && req.method === 'POST') {
      requireAccess(db, actor, 'translations', 'write'); const language = await body(req); const languageCode = String(language.code || '').trim().toLowerCase(); const languageName = typeof language.name === 'string' ? language.name.trim() : '';
      if (!/^[a-z]{2,8}$/.test(languageCode) || !languageName || db.languages.some(item => item.code === languageCode)) fail(400, 'Invalid or existing language code', 'invalid_language');
      const item = { code: languageCode, name: languageName, enabled: true }; db.languages.push(item); initializeLanguageStructure(db, item.code);
      auditFields(db, actor, 'languages', item.code, 'create', null, item, ['code', 'name', 'enabled']); await save(db); return json(res, 201, item);
    }
    if (url.pathname === '/api/translations' && req.method === 'PUT') {
      requireAccess(db, actor, 'translations', 'write'); const { language, key, value } = await body(req);
      if (typeof language !== 'string' || typeof key !== 'string' || typeof value !== 'string' || !value.trim()) fail(400, 'Invalid translation', 'required');
      const nextValue = value.trim(); let change; try { change = setTranslationValue(db, language, key, nextValue); } catch (error) { fail(400, error.message, 'unknown_translation'); }
      const table = change.scope === 'option' ? 'dictionary_option_labels' : 'translation_values';
      const record = change.scope === 'option' ? `${language}:${change.dictionaryKey}:${change.optionCode}` : `${language}:${key}`;
      audit(db, actor, table, record, 'update', key, change.previous, nextValue); await save(db); return json(res, 200, buildTranslationEditor(db, language));
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    const conflict = error.code === 'STATE_CONFLICT';
    json(res, conflict ? 409 : (error.status || 500), { error: error.message, code: conflict ? 'state_conflict' : (error.code || 'server') });
  }
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('LOG-X WMS: http://localhost:' + (process.env.PORT || 3000)));
module.exports = { server, seed, access, permissionTemplate, AREA_FIELDS };
