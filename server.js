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

const ROOT = __dirname;
const DB_FILE = process.env.LOG_X_WMS_DB_FILE || path.join(ROOT, 'data', 'db.json');
const SCHEMA_VERSION = 3;
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
const VALID_ROLES = new Set(['admin', 'editor', 'viewer']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    translations: defaultTranslations(),
    dictionaries: defaultDictionaries()
  };
}

function load() {
  if (fs.existsSync(DB_FILE)) {
    const stored = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const before = JSON.stringify(stored);
    ensureTranslationData(stored);
    stored.schemaVersion = SCHEMA_VERSION;
    if (JSON.stringify(stored) !== before) save(stored);
    return stored;
  }
  const value = ensureTranslationData(seed());
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(value, null, 2));
  return value;
}
function save(value) { fs.writeFileSync(DB_FILE, JSON.stringify(value, null, 2)); }
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(status === 204 ? '' : JSON.stringify(value)); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (error) { reject(error); } }); }); }
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
function bootstrap(db, actor, requestedLanguage = 'hu') {
  ensureTranslationData(db);
  const translationEditor = buildTranslationEditor(db, requestedLanguage);
  const canReadPermissions = rank[access(db, actor.id, 'permissions')] >= rank.read;
  const canReadUsers = rank[access(db, actor.id, 'users')] >= rank.read;
  const canReadAudit = rank[access(db, actor.id, 'audit')] >= rank.read;
  return {
    schemaVersion: db.schemaVersion,
    currentActorId: actor.id,
    selectedLanguage: translationEditor.targetLanguage,
    users: canReadUsers ? db.users.map(user => pickFields(db, actor, 'users', user, AREA_FIELDS.users)) : db.users.map(({ id, name, role, active }) => ({ id, name, role, active })),
    entities: rank[access(db, actor.id, 'entity')] >= rank.read ? db.entities.map(entity => pickFields(db, actor, 'entity', entity, AREA_FIELDS.entity)) : [],
    permissions: canReadPermissions ? db.permissions : { [actor.id]: db.permissions[actor.id] },
    audit: canReadAudit ? db.audit.map(entry => pickFields(db, actor, 'audit', { ...entry, id: entry.id, when: entry.at }, AREA_FIELDS.audit)) : [],
    languages: db.languages,
    translations: db.translations,
    lookups: localizedDictionaries(db, translationEditor.targetLanguage),
    translationEditor
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
    if (!url.pathname.startsWith('/api/')) return serveFile(res, url.pathname);
    if (url.pathname === '/api/bootstrap' && req.method === 'GET') return json(res, 200, bootstrap(db, requestActor(db, req, true), url.searchParams.get('language')));
    const actor = requestActor(db, req);

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
      db.entities.unshift(item); auditFields(db, actor, 'test_entities', item.id, 'create', null, item, AREA_FIELDS.entity); save(db); return json(res, 201, item);
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
      auditFields(db, actor, 'test_entities', before.id, 'update', before, updated, AREA_FIELDS.entity); db.entities[index] = updated; save(db); return json(res, 200, pickFields(db, actor, 'entity', updated, AREA_FIELDS.entity));
    }
    if (entityMatch && req.method === 'DELETE') {
      requireAccess(db, actor, 'entity', 'write'); const index = db.entities.findIndex(item => item.id === entityMatch[1]); if (index < 0) fail(404, 'Not found');
      const [removed] = db.entities.splice(index, 1); audit(db, actor, 'test_entities', removed.id, 'remove', '__record__', removed, null); save(db); return json(res, 204, null);
    }
    if (url.pathname === '/api/users' && req.method === 'POST') {
      requireAccess(db, actor, 'users', 'write'); const input = await body(req); for (const field of ['name', 'email', 'role']) requireAccess(db, actor, 'users', 'write', field);
      if (Object.hasOwn(input, 'active')) { requireAccess(db, actor, 'users', 'write', 'active'); if (typeof input.active !== 'boolean') fail(400, 'Invalid active flag', 'invalid_user'); }
      const name = requiredText(input.name); const email = normalizedEmail(input.email); const role = input.role || 'viewer';
      if (!VALID_ROLES.has(role)) fail(400, 'Invalid user role', 'invalid_user');
      if (db.users.some(item => item.email.toLocaleLowerCase() === email)) fail(409, 'Email already exists', 'duplicate');
      const user = { id: randomUUID(), name, email, role, active: input.active !== false }; const permissions = permissionTemplate(user.role);
      db.users.push(user); db.permissions[user.id] = permissions; auditFields(db, actor, 'users', user.id, 'create', null, user, AREA_FIELDS.users); auditPermissionChanges(db, actor, user.id, {}, permissions); save(db); return json(res, 201, pickFields(db, actor, 'users', user, AREA_FIELDS.users));
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
      const updated = { ...before, ...allowed, id: before.id };
      if (db.users.some(item => item.id !== before.id && item.email.toLocaleLowerCase() === updated.email.toLocaleLowerCase())) fail(409, 'Email already exists', 'duplicate');
      if (updated.id === actor.id && updated.active === false) fail(400, 'Cannot deactivate current actor', 'protected_admin');
      if (isLastActiveAdmin(db, before) && (updated.role !== 'admin' || updated.active === false)) fail(400, 'Cannot remove last active administrator', 'protected_admin');
      auditFields(db, actor, 'users', before.id, 'update', before, updated, AREA_FIELDS.users); db.users[index] = updated; save(db); return json(res, 200, pickFields(db, actor, 'users', updated, AREA_FIELDS.users));
    }
    if (userMatch && req.method === 'DELETE') {
      requireAccess(db, actor, 'users', 'write'); if (userMatch[1] === actor.id) fail(400, 'Cannot delete current actor', 'protected_admin'); const index = db.users.findIndex(item => item.id === userMatch[1]); if (index < 0) fail(404, 'Not found', 'not_found');
      if (isLastActiveAdmin(db, db.users[index])) fail(400, 'Cannot remove last active administrator', 'protected_admin');
      const [removed] = db.users.splice(index, 1); const removedPermissions = db.permissions[removed.id] || {}; delete db.permissions[removed.id]; audit(db, actor, 'users', removed.id, 'remove', '__record__', removed, null); auditPermissionChanges(db, actor, removed.id, removedPermissions, {}); save(db); return json(res, 204, null);
    }
    if (url.pathname === '/api/permissions' && req.method === 'PUT') {
      requireAccess(db, actor, 'permissions', 'write'); const input = await body(req); const { userId, area: areaName, field, access: nextAccess } = input;
      if (!db.users.some(user => user.id === userId) || !AREA_FIELDS[areaName] || !rank.hasOwnProperty(nextAccess)) fail(400, 'Invalid permission', 'invalid_permission');
      if (field && !AREA_FIELDS[areaName].includes(field)) fail(400, 'Invalid field', 'invalid_permission');
      if (userId === actor.id && areaName === 'permissions' && !field && nextAccess !== 'write') fail(400, 'Cannot remove own permission management access', 'protected_admin');
      db.permissions[userId] ||= permissionTemplate('viewer'); db.permissions[userId][areaName] ||= area('deny'); const config = db.permissions[userId][areaName];
      const previous = field ? (config.fields?.[field] || config.table) : config.table; if (field) { config.fields ||= {}; config.fields[field] = nextAccess; } else config.table = nextAccess;
      audit(db, actor, 'access_permissions', `${userId}:${areaName}`, 'permission_change', field || '__table__', previous, nextAccess); save(db); return json(res, 200, db.permissions);
    }
    if (url.pathname === '/api/languages' && req.method === 'POST') {
      requireAccess(db, actor, 'translations', 'write'); const language = await body(req); const languageCode = String(language.code || '').trim().toLowerCase(); const languageName = typeof language.name === 'string' ? language.name.trim() : '';
      if (!/^[a-z]{2,8}$/.test(languageCode) || !languageName || db.languages.some(item => item.code === languageCode)) fail(400, 'Invalid or existing language code', 'invalid_language');
      const item = { code: languageCode, name: languageName, enabled: true }; db.languages.push(item); initializeLanguageStructure(db, item.code);
      auditFields(db, actor, 'languages', item.code, 'create', null, item, ['code', 'name', 'enabled']); save(db); return json(res, 201, item);
    }
    if (url.pathname === '/api/translations' && req.method === 'PUT') {
      requireAccess(db, actor, 'translations', 'write'); const { language, key, value } = await body(req);
      if (typeof language !== 'string' || typeof key !== 'string' || typeof value !== 'string' || !value.trim()) fail(400, 'Invalid translation', 'required');
      const nextValue = value.trim(); let change; try { change = setTranslationValue(db, language, key, nextValue); } catch (error) { fail(400, error.message, 'unknown_translation'); }
      const table = change.scope === 'option' ? 'dictionary_option_labels' : 'translation_values';
      const record = change.scope === 'option' ? `${language}:${change.dictionaryKey}:${change.optionCode}` : `${language}:${key}`;
      audit(db, actor, table, record, 'update', key, change.previous, nextValue); save(db); return json(res, 200, buildTranslationEditor(db, language));
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) { json(res, error.status || 500, { error: error.message, code: error.code || 'server' }); }
});

if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('LOG-X WMS: http://localhost:' + (process.env.PORT || 3000)));
module.exports = { server, seed, access, permissionTemplate, AREA_FIELDS };
