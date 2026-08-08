const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const now = () => new Date().toISOString();
const seed = () => ({
  users: [
    { id: 'u-admin', name: 'Rendszeradmin', email: 'admin@logxwms.local', role: 'admin', active: true },
    { id: 'u-editor', name: 'Projektgazda', email: 'owner@logxwms.local', role: 'editor', active: true },
    { id: 'u-viewer', name: 'MegfigyelÅ‘', email: 'viewer@logxwms.local', role: 'viewer', active: true }
  ],
  entities: [
    { id: 'e-1', code: 'WMS-001', name: 'BelÃ©pÃ©si folyamat validÃ¡ciÃ³', owner: 'Projektgazda', status: 'active', risk: 'medium', updatedAt: '2026-08-08T08:30:00.000Z' },
    { id: 'e-2', code: 'WMS-002', name: 'JogosultsÃ¡gmÃ¡trix teszt', owner: 'Rendszeradmin', status: 'draft', risk: 'high', updatedAt: '2026-08-07T15:12:00.000Z' }
  ],
  permissions: {
    admin: { entity: { table: 'write', fields: { code: 'write', name: 'write', owner: 'write', status: 'write', risk: 'write' } }, users: { table: 'write' }, audit: { table: 'read' }, translations: { table: 'write' } },
    editor: { entity: { table: 'write', fields: { code: 'read', name: 'write', owner: 'write', status: 'write', risk: 'read' } }, users: { table: 'deny' }, audit: { table: 'read' }, translations: { table: 'deny' } },
    viewer: { entity: { table: 'read', fields: { code: 'read', name: 'read', owner: 'read', status: 'read', risk: 'deny' } }, users: { table: 'deny' }, audit: { table: 'deny' }, translations: { table: 'deny' } }
  },
  audit: [
    { id: 'a-1', actor: 'Rendszeradmin', table: 'test_entities', field: 'status', before: 'draft', after: 'active', at: '2026-08-08T08:30:00.000Z' },
    { id: 'a-2', actor: 'Projektgazda', table: 'test_entities', field: 'name', before: 'JogosultsÃ¡g teszt', after: 'JogosultsÃ¡gmÃ¡trix teszt', at: '2026-08-07T15:12:00.000Z' }
  ],
  languages: [
    { code: 'hu', name: 'Magyar', enabled: true }, { code: 'en', name: 'English', enabled: true }, { code: 'de', name: 'Deutsch', enabled: true }
  ],
  translations: {
    hu: { app_title:'LOG-X WMS', app_subtitle:'AdatvezÃ©relt validÃ¡ciÃ³s kÃ¶rnyezet', nav_entities:'Teszt-entitÃ¡sok', nav_users:'FelhasznÃ¡lÃ³k', nav_permissions:'JogosultsÃ¡gok', nav_audit:'AuditnaplÃ³', nav_languages:'Nyelvek', new:'Ãšj rekord', edit:'SzerkesztÃ©s', delete:'TÃ¶rlÃ©s', save:'MentÃ©s', cancel:'MÃ©gse', code:'KÃ³d', name:'NÃ©v', owner:'FelelÅ‘s', status:'Ãllapot', risk:'KockÃ¡zat', active:'AktÃ­v', draft:'Piszkozat', low:'Alacsony', medium:'KÃ¶zepes', high:'Magas', access:'HozzÃ¡fÃ©rÃ©s', role:'SzerepkÃ¶r', email:'E-mail', table_access:'TÃ¡blaszint', column_access:'MezÅ‘szint', read:'OlvasÃ¡s', write:'ÃrÃ¡s', deny:'Tiltva', actor:'Ki', table:'TÃ¡bla', field:'MezÅ‘', before:'KorÃ¡bbi Ã©rtÃ©k', after:'Ãšj Ã©rtÃ©k', when:'Mikor', add_language:'Ãšj nyelv', language_code:'NyelvkÃ³d', language_name:'Nyelv neve', translation_key:'FordÃ­tÃ¡si kulcs', translation_value:'Ã‰rtÃ©k', add_user:'FelhasznÃ¡lÃ³ hozzÃ¡adÃ¡sa', no_access:'Nincs hozzÃ¡fÃ©rÃ©sed ehhez a terÃ¼lethez.', demo_user:'AktÃ­v demo felhasznÃ¡lÃ³', confirm_delete:'ValÃ³ban tÃ¶rlÃ¶d ezt a rekordot?', actions:'MÅ±veletek', empty:'Nincs megjelenÃ­thetÅ‘ adat.', close:'BezÃ¡rÃ¡s', language:'Nyelv', audit_hint:'Minden mÃ³dosÃ­tÃ¡s mezÅ‘szinten kerÃ¼l naplÃ³zÃ¡sra.', saved:'Sikeresen mentve.', deleted:'Sikeresen tÃ¶rÃ¶lve.', admin_only:'Csak adminisztrÃ¡toroknak.' },
    en: { app_title:'LOG-X WMS', app_subtitle:'Data-driven validation environment', nav_entities:'Test entities', nav_users:'Users', nav_permissions:'Permissions', nav_audit:'Audit log', nav_languages:'Languages', new:'New record', edit:'Edit', delete:'Delete', save:'Save', cancel:'Cancel', code:'Code', name:'Name', owner:'Owner', status:'Status', risk:'Risk', active:'Active', draft:'Draft', low:'Low', medium:'Medium', high:'High', access:'Access', role:'Role', email:'Email', table_access:'Table level', column_access:'Field level', read:'Read', write:'Write', deny:'Denied', actor:'Actor', table:'Table', field:'Field', before:'Before', after:'After', when:'When', add_language:'Add language', language_code:'Language code', language_name:'Language name', translation_key:'Translation key', translation_value:'Value', add_user:'Add user', no_access:'You do not have access to this area.', demo_user:'Active demo user', confirm_delete:'Delete this record?', actions:'Actions', empty:'No data to display.', close:'Close', language:'Language', audit_hint:'Every change is recorded at field level.', saved:'Saved successfully.', deleted:'Deleted successfully.', admin_only:'Administrators only.' },
    de: { app_title:'LOG-X WMS', app_subtitle:'Datengesteuerte Validierungsumgebung', nav_entities:'TestentitÃ¤ten', nav_users:'Benutzer', nav_permissions:'Berechtigungen', nav_audit:'Auditprotokoll', nav_languages:'Sprachen', new:'Neuer Datensatz', edit:'Bearbeiten', delete:'LÃ¶schen', save:'Speichern', cancel:'Abbrechen', code:'Code', name:'Name', owner:'Verantwortlich', status:'Status', risk:'Risiko', active:'Aktiv', draft:'Entwurf', low:'Niedrig', medium:'Mittel', high:'Hoch', access:'Zugriff', role:'Rolle', email:'E-Mail', table_access:'Tabellenebene', column_access:'Feldebene', read:'Lesen', write:'Schreiben', deny:'Gesperrt', actor:'Akteur', table:'Tabelle', field:'Feld', before:'Vorher', after:'Nachher', when:'Wann', add_language:'Sprache hinzufÃ¼gen', language_code:'Sprachcode', language_name:'Sprachname', translation_key:'ÃœbersetzungsschlÃ¼ssel', translation_value:'Wert', add_user:'Benutzer hinzufÃ¼gen', no_access:'Sie haben keinen Zugriff auf diesen Bereich.', demo_user:'Aktiver Demo-Benutzer', confirm_delete:'Diesen Datensatz lÃ¶schen?', actions:'Aktionen', empty:'Keine Daten vorhanden.', close:'SchlieÃŸen', language:'Sprache', audit_hint:'Jede Ã„nderung wird auf Feldebene protokolliert.', saved:'Erfolgreich gespeichert.', deleted:'Erfolgreich gelÃ¶scht.', admin_only:'Nur fÃ¼r Administratoren.' }
  }
});
function load() { if (!fs.existsSync(DB_FILE)) { const value = seed(); fs.mkdirSync(path.dirname(DB_FILE), { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(value, null, 2)); return value; } return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function save(value) { fs.writeFileSync(DB_FILE, JSON.stringify(value, null, 2)); }
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); }
function body(req) { return new Promise((resolve, reject) => { let raw=''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } }); }); }
function audit(db, actor, field, before, after) { db.audit.unshift({ id: randomUUID(), actor, table: 'test_entities', field, before: String(before ?? ''), after: String(after ?? ''), at: now() }); }
function serveFile(res, pathname) { const file = pathname === '/' ? path.join(ROOT, 'public', 'index.html') : path.join(ROOT, 'public', pathname.replace(/^\//, '')); if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file)) return json(res, 404, { error: 'Not found' }); res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res); }
const server = http.createServer(async (req, res) => { try {
  const url = new URL(req.url, 'http://localhost'); const db = load();
  if (url.pathname === '/api/bootstrap' && req.method === 'GET') return json(res, 200, db);
  if (url.pathname === '/api/entities' && req.method === 'POST') { const item = { id: randomUUID(), ...await body(req), updatedAt: now() }; db.entities.unshift(item); Object.entries(item).filter(([k]) => !['id','updatedAt'].includes(k)).forEach(([k,v]) => audit(db, req.headers['x-actor'] || 'Rendszeradmin', k, '', v)); save(db); return json(res, 201, item); }
  const entity = url.pathname.match(/^\/api\/entities\/([^/]+)$/);
  if (entity && req.method === 'PUT') { const index = db.entities.findIndex(x => x.id === entity[1]); if (index < 0) return json(res, 404, { error:'Not found' }); const before = db.entities[index], changes = await body(req); const updated = { ...before, ...changes, id: before.id, updatedAt: now() }; Object.keys(changes).filter(k => !['id','updatedAt'].includes(k) && String(before[k] ?? '') !== String(updated[k] ?? '')).forEach(k => audit(db, req.headers['x-actor'] || 'Rendszeradmin', k, before[k], updated[k])); db.entities[index] = updated; save(db); return json(res, 200, updated); }
  if (entity && req.method === 'DELETE') { const index = db.entities.findIndex(x => x.id === entity[1]); if (index < 0) return json(res, 404, { error:'Not found' }); const [removed] = db.entities.splice(index, 1); audit(db, req.headers['x-actor'] || 'Rendszeradmin', '__record__', JSON.stringify(removed), 'deleted'); save(db); return json(res, 204, {}); }
  if (url.pathname === '/api/users' && req.method === 'POST') { const user = { id: randomUUID(), ...await body(req), active: true }; db.users.push(user); save(db); return json(res, 201, user); }
  if (url.pathname === '/api/permissions' && req.method === 'PUT') { db.permissions = await body(req); save(db); return json(res, 200, db.permissions); }
  if (url.pathname === '/api/languages' && req.method === 'POST') { const lang = await body(req); if (!/^[a-z]{2,8}$/i.test(lang.code) || db.languages.some(x => x.code === lang.code)) return json(res, 400, { error:'Invalid or existing language code' }); db.languages.push({ ...lang, enabled:true }); db.translations[lang.code] = { ...db.translations.hu }; save(db); return json(res, 201, lang); }
  if (url.pathname === '/api/translations' && req.method === 'PUT') { const { language, key, value } = await body(req); if (!db.translations[language]) return json(res, 400, { error:'Unknown language' }); db.translations[language][key] = value; save(db); return json(res, 200, db.translations[language]); }
  serveFile(res, url.pathname);
} catch (error) { json(res, 500, { error: error.message }); } });
if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('LOG-X WMS: http://localhost:' + (process.env.PORT || 3000)));
module.exports = { server, seed };
