const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { defaultTranslations } = require('./lib/translations');

const ROOT = __dirname;
const DB_FILE = process.env.LOG_X_WMS_DB_FILE || path.join(ROOT, 'data', 'db.json');
const SCHEMA_VERSION = 2;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const AREA_FIELDS = {
  entity: ['code', 'name', 'owner', 'status', 'risk'],
  users: ['name', 'email', 'role', 'active'],
  permissions: [],
  audit: ['actor', 'table', 'record', 'action', 'field', 'before', 'after', 'when'],
  translations: ['language', 'translation_key', 'translation_value']
};
const now = () => new Date().toISOString();
const rank = { deny: 0, read: 1, write: 2 };

function area(table, fields = {}) { return { table, fields }; }
function allFields(access, fields) { return Object.fromEntries(fields.map(field => [field, access])); }
function permissionTemplate(role) {
  if (role === 'admin') return {
    entity: area('write', allFields('write', AREA_FIELDS.entity)),
    users: area('write', allFields('write', AREA_FIELDS.users)),
    permissions: area('write'),
    audit: area('read', allFields('read', AREA_FIELDS.audit)),
    translations: area('write', allFields('write', AREA_FIELDS.translations))
  };
  if (role === 'editor') return {
    entity: area('write', { code: 'read', name: 'write', owner: 'write', status: 'write', risk: 'read' }),
    users: area('read', allFields('read', AREA_FIELDS.users)),
    permissions: area('deny'), audit: area('read', allFields('read', AREA_FIELDS.audit)), translations: area('deny')
  };
  return {
    entity: area('read', { code: 'read', name: 'read', owner: 'read', status: 'read', risk: 'deny' }),
    users: area('deny'), permissions: area('deny'), audit: area('deny'), translations: area('deny')
  };
}

function seed() {
  const users = [
    { id: 'u-admin', name: 'Rendszeradmin', email: 'admin@logxwms.local', role: 'admin', active: true },
    { id: 'u-editor', name: 'Projektgazda', email: 'owner@logxwms.local', role: 'editor', active: true },
    { id: 'u-viewer', name: 'Megfigyelő', email: 'viewer@logxwms.local', role: 'viewer', active: true }
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    entities: [
      { id: 'e-1', code: 'WMS-001', name: 'Belépési folyamat validáció', owner: 'Projektgazda', status: 'active', risk: 'medium', updatedAt: '2026-08-08T08:30:00.000Z' },
      { id: 'e-2', code: 'WMS-002', name: 'Jogosultságmátrix teszt', owner: 'Rendszeradmin', status: 'draft', risk: 'high', updatedAt: '2026-08-07T15:12:00.000Z' }
    ],
    permissions: Object.fromEntries(users.map(user => [user.id, permissionTemplate(user.role)])),
    audit: [
      { id: 'a-1', actorId: 'u-admin', actor: 'Rendszeradmin', table: 'test_entities', record: 'e-1', action: 'update', field: 'status', before: 'draft', after: 'active', at: '2026-08-08T08:30:00.000Z' },
      { id: 'a-2', actorId: 'u-editor', actor: 'Projektgazda', table: 'test_entities', record: 'e-2', action: 'update', field: 'name', before: 'Jogosultság teszt', after: 'Jogosultságmátrix teszt', at: '2026-08-07T15:12:00.000Z' }
    ],
    languages: [{ code: 'hu', name: 'Magyar', enabled: true }, { code: 'en', name: 'English', enabled: true }, { code: 'de', name: 'Deutsch', enabled: true }],
    translations: defaultTranslations()
  };
}

function load() {
  if (fs.existsSync(DB_FILE)) {
    const stored = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (stored.schemaVersion === SCHEMA_VERSION) return stored;
  }
  const value = seed();
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(value, null, 2));
  return value;
}
function save(value) { fs.writeFileSync(DB_FILE, JSON.stringify(value, null, 2)); }
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(status === 204 ? '' : JSON.stringify(value)); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } }); }); }
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
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
  if (rank[access(db, actor.id, areaName, field)] < rank[needed]) fail(403, 'Access denied');
}
function audit(db, actor, table, record, action, field, before, after) {
  db.audit.unshift({ id: randomUUID(), actorId: actor.id, actor: actor.name, table, record: String(record || ''), action, field, before: before ?? null, after: after ?? null, at: now() });
}
function auditFields(db, actor, table, record, action, before, after, fields) {
  for (const field of fields) if (action === 'create' || before?.[field] !== after?.[field]) audit(db, actor, table, record, action, field, before?.[field], after?.[field]);
}
function pickFields(db, actor, areaName, value, fields) {
  const result = { id: value.id };
  for (const field of fields) if (rank[access(db, actor.id, areaName, field)] >= rank.read && value[field] !== undefined) result[field] = value[field];
  return result;
}
function bootstrap(db, actor) {
  const canReadPermissions = rank[access(db, actor.id, 'permissions')] >= rank.read;
  const canReadUsers = rank[access(db, actor.id, 'users')] >= rank.read;
  const canReadAudit = rank[access(db, actor.id, 'audit')] >= rank.read;
  return {
    schemaVersion: db.schemaVersion,
    currentActorId: actor.id,
    users: canReadUsers ? db.users.map(user => pickFields(db, actor, 'users', user, AREA_FIELDS.users)) : db.users.map(({ id, name, role, active }) => ({ id, name, role, active })),
    entities: rank[access(db, actor.id, 'entity')] >= rank.read ? db.entities.map(entity => pickFields(db, actor, 'entity', entity, AREA_FIELDS.entity)) : [],
    permissions: canReadPermissions ? db.permissions : { [actor.id]: db.permissions[actor.id] },
    audit: canReadAudit ? db.audit.map(entry => pickFields(db, actor, 'audit', { ...entry, id: entry.id, when: entry.at }, AREA_FIELDS.audit)) : [],
    languages: db.languages,
    translations: db.translations
  };
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
    const db = load();
    if (url.pathname === '/api/bootstrap' && req.method === 'GET') return json(res, 200, bootstrap(db, requestActor(db, req, true)));
    const actor = requestActor(db, req);

    if (url.pathname === '/api/audit' && req.method === 'GET') { requireAccess(db, actor, 'audit', 'read'); return json(res, 200, bootstrap(db, actor).audit); }
    if (url.pathname === '/api/entities' && req.method === 'POST') {
      requireAccess(db, actor, 'entity', 'write'); const input = await body(req);
      for (const field of AREA_FIELDS.entity) requireAccess(db, actor, 'entity', 'write', field);
      if (!input.code || !input.name || !input.owner) fail(400, 'Missing required field');
      const item = { id: randomUUID(), code: input.code, name: input.name, owner: input.owner, status: input.status || 'draft', risk: input.risk || 'medium', updatedAt: now() };
      db.entities.unshift(item); auditFields(db, actor, 'test_entities', item.id, 'create', null, item, AREA_FIELDS.entity); save(db); return json(res, 201, item);
    }
    const entityMatch = url.pathname.match(/^\/api\/entities\/([^/]+)$/);
    if (entityMatch && req.method === 'PUT') {
      requireAccess(db, actor, 'entity', 'write'); const index = db.entities.findIndex(item => item.id === entityMatch[1]); if (index < 0) fail(404, 'Not found');
      const changes = await body(req); for (const field of Object.keys(changes)) if (AREA_FIELDS.entity.includes(field)) requireAccess(db, actor, 'entity', 'write', field);
      const before = db.entities[index]; const allowed = Object.fromEntries(Object.entries(changes).filter(([field]) => AREA_FIELDS.entity.includes(field))); const updated = { ...before, ...allowed, id: before.id, updatedAt: now() };
      auditFields(db, actor, 'test_entities', before.id, 'update', before, updated, AREA_FIELDS.entity); db.entities[index] = updated; save(db); return json(res, 200, pickFields(db, actor, 'entity', updated, AREA_FIELDS.entity));
    }
    if (entityMatch && req.method === 'DELETE') {
      requireAccess(db, actor, 'entity', 'write'); const index = db.entities.findIndex(item => item.id === entityMatch[1]); if (index < 0) fail(404, 'Not found');
      const [removed] = db.entities.splice(index, 1); audit(db, actor, 'test_entities', removed.id, 'remove', '__record__', removed, null); save(db); return json(res, 204, null);
    }
    if (url.pathname === '/api/users' && req.method === 'POST') {
      requireAccess(db, actor, 'users', 'write'); const input = await body(req); for (const field of ['name', 'email', 'role']) requireAccess(db, actor, 'users', 'write', field);
      if (!input.name || !input.email) fail(400, 'Missing required field'); const user = { id: randomUUID(), name: input.name, email: input.email, role: input.role || 'viewer', active: input.active !== false };
      db.users.push(user); db.permissions[user.id] = permissionTemplate(user.role); auditFields(db, actor, 'users', user.id, 'create', null, user, AREA_FIELDS.users); save(db); return json(res, 201, user);
    }
    const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && req.method === 'PUT') {
      requireAccess(db, actor, 'users', 'write'); const index = db.users.findIndex(item => item.id === userMatch[1]); if (index < 0) fail(404, 'Not found');
      const changes = await body(req); for (const field of Object.keys(changes)) if (AREA_FIELDS.users.includes(field)) requireAccess(db, actor, 'users', 'write', field);
      const before = db.users[index]; const allowed = Object.fromEntries(Object.entries(changes).filter(([field]) => AREA_FIELDS.users.includes(field))); const updated = { ...before, ...allowed, id: before.id };
      if (updated.id === actor.id && updated.active === false) fail(400, 'Cannot deactivate current actor'); auditFields(db, actor, 'users', before.id, 'update', before, updated, AREA_FIELDS.users); db.users[index] = updated; save(db); return json(res, 200, updated);
    }
    if (userMatch && req.method === 'DELETE') {
      requireAccess(db, actor, 'users', 'write'); if (userMatch[1] === actor.id) fail(400, 'Cannot delete current actor'); const index = db.users.findIndex(item => item.id === userMatch[1]); if (index < 0) fail(404, 'Not found');
      const [removed] = db.users.splice(index, 1); delete db.permissions[removed.id]; audit(db, actor, 'users', removed.id, 'remove', '__record__', removed, null); save(db); return json(res, 204, null);
    }
    if (url.pathname === '/api/permissions' && req.method === 'PUT') {
      requireAccess(db, actor, 'permissions', 'write'); const input = await body(req); const { userId, area: areaName, field, access: nextAccess } = input;
      if (!db.users.some(user => user.id === userId) || !AREA_FIELDS[areaName] || !rank.hasOwnProperty(nextAccess)) fail(400, 'Invalid permission');
      if (field && !AREA_FIELDS[areaName].includes(field)) fail(400, 'Invalid field');
      if (userId === actor.id && areaName === 'permissions' && !field && nextAccess !== 'write') fail(400, 'Cannot remove own permission management access');
      db.permissions[userId] ||= permissionTemplate('viewer'); db.permissions[userId][areaName] ||= area('deny'); const config = db.permissions[userId][areaName];
      const previous = field ? (config.fields?.[field] || config.table) : config.table; if (field) { config.fields ||= {}; config.fields[field] = nextAccess; } else config.table = nextAccess;
      audit(db, actor, 'access_permissions', `${userId}:${areaName}`, 'permission_change', field || '__table__', previous, nextAccess); save(db); return json(res, 200, db.permissions);
    }
    if (url.pathname === '/api/languages' && req.method === 'POST') {
      requireAccess(db, actor, 'translations', 'write'); const language = await body(req); if (!/^[a-z]{2,8}$/i.test(language.code) || db.languages.some(item => item.code === language.code)) fail(400, 'Invalid or existing language code');
      language.code = language.code.toLowerCase(); const item = { code: language.code, name: language.name, enabled: true }; db.languages.push(item); db.translations[item.code] = { ...db.translations.hu };
      auditFields(db, actor, 'languages', item.code, 'create', null, item, ['code', 'name', 'enabled']); save(db); return json(res, 201, item);
    }
    if (url.pathname === '/api/translations' && req.method === 'PUT') {
      requireAccess(db, actor, 'translations', 'write'); const { language, key, value } = await body(req); if (!db.translations[language]) fail(400, 'Unknown language');
      const previous = db.translations[language][key]; db.translations[language][key] = value; audit(db, actor, 'translation_values', `${language}:${key}`, 'update', key, previous, value); save(db); return json(res, 200, db.translations[language]);
    }
    serveFile(res, url.pathname);
  } catch (error) { json(res, error.status || 500, { error: error.message }); }
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('LOG-X WMS: http://localhost:' + (process.env.PORT || 3000)));
module.exports = { server, seed, access, permissionTemplate, AREA_FIELDS };
