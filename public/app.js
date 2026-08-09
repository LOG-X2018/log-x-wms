const state = { db: null, language: 'hu', actor: 'u-admin', page: 'entities', modal: null, toast: '' };
const entityFields = ['code', 'name', 'owner', 'status', 'risk'];
const userFields = ['name', 'email', 'role', 'active'];
const auditFields = ['actor', 'table', 'record', 'action', 'field', 'before', 'after', 'when'];
const areaFields = { entity: entityFields, users: userFields, permissions: [], audit: auditFields, translations: ['language', 'translation_key', 'translation_value'] };
const pageArea = { entities: 'entity', users: 'users', permissions: 'permissions', audit: 'audit', languages: 'translations' };
const nav = [['entities', 'nav_entities'], ['users', 'nav_users'], ['permissions', 'nav_permissions'], ['audit', 'nav_audit'], ['languages', 'nav_languages']];

const get = (object, keys) => keys.split('.').reduce((value, key) => value && value[key], object);
const t = key => get(state.db?.translations?.[state.language], key) ?? get(state.db?.translations?.hu, key) ?? key;
const actor = () => state.db?.users?.find(user => user.id === state.actor) || null;
const permissionConfig = (userId, area) => state.db?.permissions?.[userId]?.[area] || { table: 'deny', fields: {} };
const permission = (area, userId = state.actor) => permissionConfig(userId, area).table || 'deny';
const fieldAccess = (area, field, userId = state.actor) => {
  const config = permissionConfig(userId, area);
  if (config.table === 'deny') return 'deny';
  const value = config.fields?.[field] || config.table;
  return config.table === 'read' && value === 'write' ? 'read' : value;
};
const can = (area, level = 'read', userId = state.actor) => permission(area, userId) === 'write' || (level === 'read' && permission(area, userId) === 'read');
const areaLabel = area => t(area === 'entity' ? 'nav_entities' : area === 'users' ? 'nav_users' : area === 'permissions' ? 'nav_permissions' : area === 'audit' ? 'nav_audit' : 'nav_languages');
const roleLabel = role => t(`role_${role}`);

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Actor-Id': state.actor, ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok && response.status !== 204) throw new Error((await response.json()).error);
  return response.status === 204 ? null : response.json();
}
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function select(options, current, label = value => value) { return options.map(value => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label(value))}</option>`).join(''); }
function showToast(message) { state.toast = message; render(); setTimeout(() => { state.toast = ''; render(); }, 1800); }
function formatValue(value) { if (value === null || value === undefined || value === '') return '—'; return typeof value === 'object' ? JSON.stringify(value) : String(value); }

function layout(content) {
  const currentActor = actor();
  return `<main class="shell">
    <header class="top"><div class="brand"><h1>${t('app_title')}</h1><p>${t('app_subtitle')}</p></div><select aria-label="${t('language')}" data-action="language">${state.db.languages.filter(item => item.enabled).map(item => `<option value="${item.code}" ${item.code === state.language ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></header>
    <section class="context"><label>${t('demo_user')}</label><select data-action="actor">${state.db.users.filter(user => user.active).map(user => `<option value="${user.id}" ${user.id === state.actor ? 'selected' : ''}>${esc(user.name)} · ${roleLabel(user.role)}</option>`).join('')}</select><span class="hint">${t('access')}: ${t(permission('entity'))}</span></section>
    <nav class="tabs">${nav.filter(([page]) => can(pageArea[page])).map(([page, key]) => `<button data-page="${page}" class="${state.page === page ? 'active' : ''}">${t(key)}</button>`).join('')}</nav>
    ${currentActor ? content : empty()}
  </main>${modal()}${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ''}`;
}
function empty() { return `<div class="notice">${t('no_access')}</div>`; }
function entities() {
  if (!can('entity')) return empty();
  const visible = entityFields.filter(field => fieldAccess('entity', field) !== 'deny');
  const canWrite = can('entity', 'write');
  const canCreate = canWrite && entityFields.every(field => fieldAccess('entity', field) === 'write');
  return `<section class="panel"><div class="heading"><div><h2>${t('nav_entities')}</h2><div class="hint">${t('audit_hint')}</div></div>${canCreate ? `<button data-action="new-entity">${t('new')}</button>` : ''}</div>
    <div class="table-wrap"><table><thead><tr>${visible.map(field => `<th>${t(field)}</th>`).join('')}${canWrite ? `<th>${t('actions')}</th>` : ''}</tr></thead><tbody>
    ${state.db.entities.length ? state.db.entities.map(entity => `<tr>${visible.map(field => `<td>${field === 'status' || field === 'risk' ? `<span class="tag ${esc(entity[field])}">${t(entity[field])}</span>` : esc(entity[field])}</td>`).join('')}${canWrite ? `<td><div class="actions"><button class="ghost" data-action="edit-entity" data-id="${entity.id}">${t('edit')}</button><button class="danger" data-action="delete-entity" data-id="${entity.id}">${t('delete')}</button></div></td>` : ''}</tr>`).join('') : `<tr><td colspan="${visible.length + (canWrite ? 1 : 0)}">${t('empty')}</td></tr>`}
    </tbody></table></div></section>`;
}
function users() {
  if (!can('users')) return empty();
  const visible = userFields.filter(field => fieldAccess('users', field) !== 'deny');
  const canWrite = can('users', 'write');
  return `<section class="panel"><div class="heading"><h2>${t('nav_users')}</h2>${canWrite ? `<button data-action="new-user">${t('add_user')}</button>` : ''}</div><div class="grid">
    ${state.db.users.map(user => `<article class="card"><h3>${visible.includes('name') ? esc(user.name) : esc(user.id)}</h3>${visible.includes('email') ? `<div class="hint">${esc(user.email)}</div>` : ''}${visible.includes('role') ? `<span class="tag">${roleLabel(user.role)}</span>` : ''}${visible.includes('active') ? `<span class="tag ${user.active ? 'active' : ''}">${t(user.active ? 'active' : 'inactive')}</span>` : ''}${canWrite ? `<div class="actions card-actions"><button class="ghost" data-action="edit-user" data-id="${user.id}">${t('edit')}</button><button class="danger" data-action="delete-user" data-id="${user.id}" ${user.id === state.actor ? 'disabled' : ''}>${t('delete')}</button></div>` : ''}</article>`).join('')}
  </div></section>`;
}
function permissionToggle(userId, area, field, level, checked, disabled) {
  return `<input type="checkbox" data-permission="${userId}|${area}|${field || ''}" data-level="${level}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="${level === 'view' ? t('visible') : t('modifiable')}">`;
}
function permissions() {
  if (!can('permissions')) return empty();
  const editable = can('permissions', 'write');
  const areas = Object.keys(areaFields);
  return `<section class="panel"><div class="heading"><div><h2>${t('nav_permissions')}</h2><div class="hint">${t('permission_hint')}</div></div></div><div class="permission-users">
    ${state.db.users.map(user => `<article class="permission-user"><h3>${esc(user.name)} <span class="tag">${roleLabel(user.role)}</span></h3><div class="table-wrap"><table class="matrix"><thead><tr><th>${t('scope')}</th><th>${t('visible')}</th><th>${t('modifiable')}</th></tr></thead><tbody>
      ${areas.map(area => {
        const tableValue = permission(area, user.id); const selfLock = user.id === state.actor && area === 'permissions';
        const tableRow = `<tr class="matrix-table"><td>${areaLabel(area)}</td><td>${permissionToggle(user.id, area, '', 'view', tableValue !== 'deny', !editable || selfLock)}</td><td>${permissionToggle(user.id, area, '', 'edit', tableValue === 'write', !editable || selfLock)}</td></tr>`;
        const fieldRows = areaFields[area].map(field => { const value = fieldAccess(area, field, user.id); return `<tr class="matrix-field"><td>↳ ${t(field)}</td><td>${permissionToggle(user.id, area, field, 'view', value !== 'deny', !editable || tableValue === 'deny')}</td><td>${permissionToggle(user.id, area, field, 'edit', value === 'write', !editable || tableValue !== 'write')}</td></tr>`; }).join('');
        return tableRow + fieldRows;
      }).join('')}
    </tbody></table></div></article>`).join('')}
  </div></section>`;
}
function audit() {
  if (!can('audit')) return empty();
  const visible = auditFields.filter(field => fieldAccess('audit', field) !== 'deny');
  return `<section class="panel"><div class="heading"><div><h2>${t('nav_audit')}</h2><div class="hint">${t('audit_hint')}</div></div></div><div class="table-wrap"><table><thead><tr>${visible.map(field => `<th>${t(field)}</th>`).join('')}</tr></thead><tbody>
    ${state.db.audit.length ? state.db.audit.map(entry => `<tr>${visible.map(field => `<td>${field === 'when' ? new Date(entry.when).toLocaleString(state.language) : field === 'action' ? t(entry.action) : esc(formatValue(entry[field]))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${visible.length}">${t('empty')}</td></tr>`}
  </tbody></table></div></section>`;
}
function languages() {
  if (!can('translations')) return empty();
  const editable = can('translations', 'write'); const values = state.db.translations[state.language] || {};
  return `<section class="panel"><div class="heading"><div><h2>${t('nav_languages')}</h2><div class="hint">${t('admin_only')}</div></div>${editable ? `<button data-action="new-language">${t('add_language')}</button>` : ''}</div><div class="grid">${state.db.languages.map(language => `<article class="card"><h3>${esc(language.name)}</h3><div class="hint">${esc(language.code)}</div></article>`).join('')}</div><hr><div class="heading"><h2>${t('translation_value')}</h2></div><div class="lang-editor">${Object.entries(values).sort().map(([key, value]) => `<label><span class="hint">${esc(key)}</span><input data-translation="${esc(key)}" value="${esc(value)}" ${editable ? '' : 'disabled'}></label>`).join('')}</div></section>`;
}
function control(field, value, area, type) {
  const writable = fieldAccess(area, field) === 'write'; const disabled = writable ? '' : 'disabled';
  if (field === 'status') return `<select name="status" ${disabled}>${select(['draft', 'active'], value || 'draft', t)}</select>`;
  if (field === 'risk') return `<select name="risk" ${disabled}>${select(['low', 'medium', 'high'], value || 'medium', t)}</select>`;
  if (field === 'role') return `<select name="role" ${disabled}>${select(['admin', 'editor', 'viewer'], value || 'viewer', roleLabel)}</select>`;
  if (field === 'active') return `<input type="checkbox" name="active" ${value !== false ? 'checked' : ''} ${disabled}>`;
  return `<input ${field === 'email' ? 'type="email"' : ''} required name="${field}" value="${esc(value || '')}" ${disabled}>`;
}
function modal() {
  if (!state.modal) return '';
  const { type, item = {} } = state.modal;
  if (type === 'entity') { const visible = entityFields.filter(field => fieldAccess('entity', field) !== 'deny'); return `<div class="modal"><form class="dialog form" data-form="entity"><h2>${t(item.id ? 'edit' : 'new')}</h2>${visible.map(field => `<label>${t(field)}${control(field, item[field], 'entity', type)}</label>`).join('')}<div class="form-actions"><button type="button" class="ghost" data-action="close">${t('cancel')}</button><button>${t('save')}</button></div></form></div>`; }
  if (type === 'user') { const visible = userFields.filter(field => fieldAccess('users', field) !== 'deny'); return `<div class="modal"><form class="dialog form" data-form="user"><h2>${t(item.id ? 'edit_user' : 'add_user')}</h2>${visible.map(field => `<label>${t(field)}${control(field, item[field], 'users', type)}</label>`).join('')}<div class="form-actions"><button type="button" class="ghost" data-action="close">${t('cancel')}</button><button>${t('save')}</button></div></form></div>`; }
  return `<div class="modal"><form class="dialog form" data-form="language"><h2>${t('add_language')}</h2><label>${t('language_code')}<input required name="code" pattern="[A-Za-z]{2,8}"></label><label>${t('language_name')}<input required name="name"></label><div class="form-actions"><button type="button" class="ghost" data-action="close">${t('cancel')}</button><button>${t('save')}</button></div></form></div>`;
}
function currentPage() { return ({ entities, users, permissions, audit, languages })[state.page](); }
function render() { document.getElementById('app').innerHTML = layout(currentPage()); }
function ensurePage() { if (!can(pageArea[state.page])) state.page = nav.find(([page]) => can(pageArea[page]))?.[0] || 'entities'; }
async function refresh() { state.db = await api('/api/bootstrap'); state.actor = state.db.currentActorId || state.actor; ensurePage(); render(); }

document.addEventListener('change', async event => {
  try {
    const target = event.target;
    if (target.dataset.action === 'language') { state.language = target.value; render(); return; }
    if (target.dataset.action === 'actor') { state.actor = target.value; await refresh(); return; }
    if (target.dataset.permission) {
      const [userId, area, field] = target.dataset.permission.split('|');
      const selector = `[data-permission="${CSS.escape(target.dataset.permission)}"]`;
      const controls = [...document.querySelectorAll(selector)]; const view = controls.find(item => item.dataset.level === 'view'); const edit = controls.find(item => item.dataset.level === 'edit');
      if (target.dataset.level === 'edit' && target.checked) view.checked = true; if (target.dataset.level === 'view' && !target.checked) edit.checked = false;
      const nextAccess = edit.checked ? 'write' : view.checked ? 'read' : 'deny';
      await api('/api/permissions', { method: 'PUT', body: JSON.stringify({ userId, area, field: field || null, access: nextAccess }) }); state.page = 'permissions'; await refresh(); showToast(t('saved')); return;
    }
    if (target.dataset.translation) { await api('/api/translations', { method: 'PUT', body: JSON.stringify({ language: state.language, key: target.dataset.translation, value: target.value }) }); state.page = 'languages'; await refresh(); showToast(t('saved')); }
  } catch (error) { showToast(error.message); }
});
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  try {
    if (button.dataset.page) { state.page = button.dataset.page; if (state.page === 'audit') await refresh(); else render(); return; }
    const action = button.dataset.action;
    if (action === 'new-entity') state.modal = { type: 'entity', item: { status: 'draft', risk: 'medium' } };
    if (action === 'edit-entity') state.modal = { type: 'entity', item: state.db.entities.find(item => item.id === button.dataset.id) };
    if (action === 'new-user') state.modal = { type: 'user', item: { role: 'viewer', active: true } };
    if (action === 'edit-user') state.modal = { type: 'user', item: state.db.users.find(item => item.id === button.dataset.id) };
    if (action === 'new-language') state.modal = { type: 'language' };
    if (action === 'close') state.modal = null;
    if (action === 'delete-entity' && confirm(t('confirm_delete'))) { await api(`/api/entities/${button.dataset.id}`, { method: 'DELETE' }); state.toast = t('deleted'); await refresh(); return; }
    if (action === 'delete-user' && confirm(t('confirm_delete_user'))) { await api(`/api/users/${button.dataset.id}`, { method: 'DELETE' }); state.toast = t('deleted'); await refresh(); return; }
    render();
  } catch (error) { showToast(error.message); }
});
document.addEventListener('submit', async event => {
  if (!event.target.dataset.form) return; event.preventDefault();
  try {
    const form = event.target; const value = Object.fromEntries(new FormData(form)); const { type, item = {} } = state.modal;
    if (form.elements.active && !form.elements.active.disabled) value.active = form.elements.active.checked;
    if (type === 'entity') await api(item.id ? `/api/entities/${item.id}` : '/api/entities', { method: item.id ? 'PUT' : 'POST', body: JSON.stringify(value) });
    else if (type === 'user') await api(item.id ? `/api/users/${item.id}` : '/api/users', { method: item.id ? 'PUT' : 'POST', body: JSON.stringify(value) });
    else { value.code = value.code.toLowerCase(); await api('/api/languages', { method: 'POST', body: JSON.stringify(value) }); }
    state.modal = null; state.toast = t('saved'); await refresh();
  } catch (error) { showToast(error.message); }
});

refresh().catch(error => { document.getElementById('app').innerHTML = `<main class="shell"><div class="notice">${esc(error.message)}</div></main>`; });
