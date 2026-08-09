const state = {
  db: null,
  language: 'hu',
  actor: 'u-admin',
  page: 'entities',
  modal: null,
  toast: '',
  permissionRole: 'all',
  permissionUser: 'u-admin',
  openPermissionAreas: [],
  translationLanguage: 'hu',
  theme: readPreference('logx-theme', 'system'),
  tooltips: readPreference('logx-tooltips', 'false') === 'true',
  erpTaskStatus: 'all'
};
const entityFields = ['code', 'name', 'owner', 'status', 'risk'];
const userFields = ['name', 'email', 'role', 'active', 'highlightColor'];
const auditFields = ['actor', 'table', 'record', 'action', 'field', 'before', 'after', 'when'];
const wmsAreaFields = {
  inventory_items: ['sku', 'name', 'unit', 'status', 'onHand', 'reorderPoint'],
  stock_movements: ['itemId', 'locationId', 'type', 'quantity', 'reference', 'note', 'occurredAt'],
  warehouse_locations: ['code', 'name', 'type', 'capacity', 'active'],
  inbound_receipts: ['receiptNo', 'supplier', 'status', 'itemId', 'locationId', 'quantity', 'receivedAt', 'note'],
  outbound_orders: ['orderNo', 'customer', 'status', 'priority', 'itemId', 'locationId', 'quantity', 'shipBy', 'note']
};
const wmsCreateRequiredFields = {
  inventory_items: ['sku', 'name'],
  stock_movements: ['itemId', 'locationId', 'quantity'],
  warehouse_locations: ['code', 'name', 'capacity'],
  inbound_receipts: ['receiptNo', 'supplier', 'itemId', 'locationId', 'quantity'],
  outbound_orders: ['orderNo', 'customer', 'itemId', 'locationId', 'quantity']
};
const areaFields = { entity: entityFields, ...wmsAreaFields, users: userFields, permissions: [], audit: auditFields, translations: ['language', 'translation_key', 'translation_value'] };
const pageArea = { entities: 'entity', users: 'users', permissions: 'permissions', audit: 'audit', languages: 'translations', operations: null, mobile: null };
const nav = [['entities', 'nav_entities'], ['operations', 'nav_operations'], ['users', 'nav_users'], ['permissions', 'nav_permissions'], ['audit', 'nav_audit'], ['languages', 'nav_languages'], ['mobile', 'nav_mobile_demo']];
const auditFilterState = AuditFilters.createFilterState();
let toastTimer = null;

function readPreference(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function writePreference(key, value) { try { localStorage.setItem(key, value); } catch { /* Preferences remain session-only when storage is unavailable. */ } }
function normalizeColor(value) { return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : '#4f46e5'; }
function contrastColor(hex) {
  const channels = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const darkLuminance = 0.0097;
  const lightContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  return darkContrast >= lightContrast ? '#111827' : '#ffffff';
}
function applyAppearance() {
  document.documentElement.dataset.theme = ['light', 'dark', 'system'].includes(state.theme) ? state.theme : 'system';
  const color = normalizeColor(actor()?.highlightColor || actor()?.highlight_color);
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-contrast', contrastColor(color));
  document.documentElement.lang = state.language;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

const get = (object, keys) => keys.split('.').reduce((value, key) => value && value[key], object);
const t = key => get(state.db?.translations?.[state.language], key) ?? get(state.db?.translations?.hu, key) ?? key;
const actor = () => {
  const user = state.db?.users?.find(item => item.id === state.actor) || null;
  return state.db?.currentActor?.id === state.actor ? { ...(user || {}), ...state.db.currentActor } : user;
};
const permissionConfig = (userId, area) => state.db?.permissions?.[userId]?.[area] || { table: 'deny', fields: {} };
const permission = (area, userId = state.actor) => permissionConfig(userId, area).table || 'deny';
const fieldAccess = (area, field, userId = state.actor) => {
  const config = permissionConfig(userId, area);
  if (config.table === 'deny') return 'deny';
  const value = config.fields?.[field] || config.table;
  return config.table === 'read' && value === 'write' ? 'read' : value;
};
const can = (area, level = 'read', userId = state.actor) => permission(area, userId) === 'write' || (level === 'read' && permission(area, userId) === 'read');
const canUseOperations = () => Object.keys(wmsAreaFields).some(area => can(area));
const canOpenPage = page => page === 'operations' ? canUseOperations() : !pageArea[page] || can(pageArea[page]);
const areaLabel = area => t({ entity: 'nav_entities', users: 'nav_users', permissions: 'nav_permissions', audit: 'nav_audit', translations: 'nav_languages', inventory_items: 'wms_inventory_items', stock_movements: 'wms_stock_movements', warehouse_locations: 'wms_warehouse_locations', inbound_receipts: 'wms_inbound_receipts', outbound_orders: 'wms_outbound_orders' }[area] || area);
const roleLabel = role => t(`role_${role}`);
const lookupOptions = key => state.db?.lookups?.[key]?.options || [];
const lookupLabel = (key, code, language = state.language) => {
  const option = lookupOptions(key).find(item => item.code === code);
  return option?.labels?.[language] || option?.label || option?.englishName || code;
};

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Actor-Id': state.actor, ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok && response.status !== 204) {
    const payload = await response.json(); const key = `error_${payload.code || 'server'}`; const localized = t(key);
    throw new Error(localized === key ? t('error_server') : localized);
  }
  return response.status === 204 ? null : response.json();
}
function esc(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function htmlT(key) { return esc(t(key)); }
function infoIcon(key) { return state.tooltips ? `<span class="info-icon" tabindex="0" role="img" aria-label="${htmlT(key)}" data-tooltip="${htmlT(key)}">i</span>` : ''; }
function fieldLabel(key, tooltipKey = `tooltip_${key}`) { return `<span class="field-label">${htmlT(key)}${infoIcon(tooltipKey)}</span>`; }
function select(options, current, label = value => value) { return options.map(value => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label(value))}</option>`).join(''); }
function updateToastDom() {
  const root = document.querySelector('[data-toast-root]');
  if (!root) return;
  root.replaceChildren();
  if (!state.toast) return;
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.textContent = state.toast;
  root.append(toast);
}
function showToast(message) {
  state.toast = String(message ?? '');
  if (toastTimer) clearTimeout(toastTimer);
  updateToastDom();
  toastTimer = setTimeout(() => { state.toast = ''; toastTimer = null; updateToastDom(); }, 1800);
}
function formatValue(value) { if (value === null || value === undefined || value === '') return '—'; return typeof value === 'object' ? JSON.stringify(value) : String(value); }

function layout(content) {
  const currentActor = actor();
  return `<main class="shell">
    <header class="top"><div class="brand"><h1>${htmlT('app_title')}</h1><p>${htmlT('app_subtitle')}</p></div><div class="top-controls">
      <label class="compact-control"><span>${htmlT('language')}</span><select aria-label="${htmlT('language')}" data-action="language">${state.db.languages.filter(item => item.enabled).map(item => `<option value="${esc(item.code)}" ${item.code === state.language ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
      <label class="compact-control"><span>${htmlT('theme')}</span><select aria-label="${htmlT('theme')}" data-action="theme">${['system', 'light', 'dark'].map(theme => `<option value="${theme}" ${state.theme === theme ? 'selected' : ''}>${htmlT(`theme_${theme}`)}</option>`).join('')}</select></label>
      <label class="tooltip-toggle"><input type="checkbox" data-action="tooltips" ${state.tooltips ? 'checked' : ''}><span>${htmlT('tooltip_toggle')}</span></label>
    </div></header>
    <section class="context"><label for="active-demo-user">${htmlT('demo_user')}</label><select id="active-demo-user" aria-label="${htmlT('demo_user')}" data-action="actor">${state.db.users.filter(user => user.active !== false).map(user => `<option value="${esc(user.id)}" ${user.id === state.actor ? 'selected' : ''}>${esc(user.name || user.id)}${user.role ? ` · ${esc(roleLabel(user.role))}` : ''}</option>`).join('')}</select><span class="actor-accent" style="--swatch:${normalizeColor(currentActor?.highlightColor || currentActor?.highlight_color)}" aria-hidden="true"></span><span class="hint">${htmlT('access')}: ${htmlT(permission('entity'))}</span>${state.db.persistence ? `<span class="persistence-badge" data-kind="${esc(state.db.persistence.kind)}">${htmlT(state.db.persistence.kind === 'supabase' && state.db.persistence.persistent ? 'persistence_supabase' : 'persistence_demo')}</span>` : ''}<span class="demo-security-warning">${htmlT('demo_security_warning')}</span></section>
    <nav class="tabs" aria-label="${htmlT('primary_navigation')}">${nav.filter(([page]) => canOpenPage(page)).map(([page, key]) => `<button data-page="${page}" class="${state.page === page ? 'active' : ''}" ${state.page === page ? 'aria-current="page"' : ''}>${htmlT(key)}</button>`).join('')}</nav>
    ${currentActor ? content : empty()}
  </main>${modal()}<div data-toast-root aria-live="polite" aria-atomic="true"></div>`;
}
function empty() { return `<div class="notice">${htmlT('no_access')}</div>`; }
function entities() {
  if (!can('entity')) return empty();
  const visible = entityFields.filter(field => fieldAccess('entity', field) !== 'deny');
  const canWrite = can('entity', 'write');
  const canCreate = canWrite && entityFields.every(field => fieldAccess('entity', field) === 'write');
  const canEdit = canWrite && entityFields.some(field => fieldAccess('entity', field) === 'write');
  return `<section class="panel"><div class="heading"><div><h2>${htmlT('nav_entities')}</h2><div class="hint">${htmlT('audit_hint')}</div></div>${canCreate ? `<button data-action="new-entity">${htmlT('new')}</button>` : ''}</div>
    <div class="table-wrap responsive-table"><table><thead><tr>${visible.map(field => `<th>${fieldLabel(field)}</th>`).join('')}${canWrite ? `<th>${htmlT('actions')}</th>` : ''}</tr></thead><tbody>
    ${state.db.entities.length ? state.db.entities.map(entity => `<tr>${visible.map(field => `<td data-label="${htmlT(field)}">${field === 'status' || field === 'risk' ? `<span class="tag ${esc(entity[field])}">${esc(lookupLabel(field, entity[field]))}</span>` : esc(entity[field])}</td>`).join('')}${canWrite ? `<td data-label="${htmlT('actions')}"><div class="actions">${canEdit ? `<button class="ghost" data-action="edit-entity" data-id="${esc(entity.id)}">${htmlT('edit')}</button>` : ''}<button class="danger" data-action="delete-entity" data-id="${esc(entity.id)}">${htmlT('delete')}</button></div></td>` : ''}</tr>`).join('') : `<tr><td colspan="${visible.length + (canWrite ? 1 : 0)}">${htmlT('empty')}</td></tr>`}
    </tbody></table></div></section>`;
}
function users() {
  if (!can('users')) return empty();
  const visible = userFields.filter(field => fieldAccess('users', field) !== 'deny');
  const canWrite = can('users', 'write');
  const canCreate = canWrite && ['name', 'email', 'role'].every(field => fieldAccess('users', field) === 'write');
  const canEdit = canWrite && userFields.some(field => fieldAccess('users', field) === 'write');
  return `<section class="panel"><div class="heading"><h2>${htmlT('nav_users')}</h2>${canCreate ? `<button data-action="new-user">${htmlT('add_user')}</button>` : ''}</div><div class="grid">
    ${state.db.users.map(user => `<article class="card user-card"><div class="user-card__title"><span class="user-swatch" style="--swatch:${normalizeColor(user.highlightColor || user.highlight_color)}" aria-hidden="true"></span><h3>${visible.includes('name') ? esc(user.name) : esc(user.id)}</h3></div>${visible.includes('email') ? `<div class="hint">${esc(user.email)}</div>` : ''}${visible.includes('role') ? `<span class="tag">${esc(roleLabel(user.role))}</span>` : ''}${visible.includes('active') ? `<span class="tag ${user.active ? 'active' : ''}">${htmlT(user.active ? 'active' : 'inactive')}</span>` : ''}${visible.includes('highlightColor') ? `<div class="color-value">${fieldLabel('highlightColor')} <code>${esc(normalizeColor(user.highlightColor || user.highlight_color))}</code></div>` : ''}${canWrite ? `<div class="actions card-actions">${canEdit ? `<button class="ghost" data-action="edit-user" data-id="${esc(user.id)}">${htmlT('edit')}</button>` : ''}<button class="danger" data-action="delete-user" data-id="${esc(user.id)}" ${user.id === state.actor ? 'disabled' : ''}>${htmlT('delete')}</button></div>` : ''}</article>`).join('')}
  </div></section>`;
}
function localizedCode(prefix, value) {
  const key = `${prefix}_${String(value ?? '').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
  const translated = t(key);
  return translated === key ? String(value ?? '—') : translated;
}
const wmsModules = {
  inventory_items: { data: 'inventoryItems', route: 'inventory-items', title: 'wms_inventory_items', help: 'wms_inventory_help' },
  stock_movements: { data: 'stockMovements', route: 'stock-movements', title: 'wms_stock_movements', help: 'wms_movements_help' },
  warehouse_locations: { data: 'warehouseLocations', route: 'warehouse-locations', title: 'wms_warehouse_locations', help: 'wms_locations_help' },
  inbound_receipts: { data: 'inboundReceipts', route: 'inbound-receipts', title: 'wms_inbound_receipts', help: 'wms_inbound_help' },
  outbound_orders: { data: 'outboundOrders', route: 'outbound-orders', title: 'wms_outbound_orders', help: 'wms_outbound_help' }
};
const wmsLookupFields = {
  unit: 'unit_of_measure', status_inventory_items: 'item_status', type_warehouse_locations: 'warehouse_location_type',
  type_stock_movements: 'stock_movement_type', status_inbound_receipts: 'inbound_status', status_outbound_orders: 'outbound_status', priority: 'order_priority'
};
function wmsItems(area) { return state.db?.wms?.[wmsModules[area].data] || []; }
function wmsLookup(area, field) { return wmsLookupFields[`${field}_${area}`] || wmsLookupFields[field] || ''; }
function wmsReference(field, value) {
  if (field === 'itemId') { const item = state.db?.wms?.inventoryItems?.find(row => row.id === value); return item ? `${item.sku} · ${item.name}` : value; }
  if (field === 'locationId') { const location = state.db?.wms?.warehouseLocations?.find(row => row.id === value); return location ? `${location.code} · ${location.name}` : value; }
  return value;
}
function wmsCell(area, field, value) {
  if (field === 'itemId' || field === 'locationId') return esc(wmsReference(field, value));
  const dictionary = wmsLookup(area, field);
  if (dictionary) return `<span class="tag ${esc(value)}">${esc(lookupLabel(dictionary, value))}</span>`;
  if (field === 'active') return htmlT(value ? 'active' : 'inactive');
  if ((field === 'occurredAt' || field === 'receivedAt' || field === 'shipBy') && value) return esc(new Date(value).toLocaleString(state.language));
  return esc(formatValue(value));
}
function wmsModule(area) {
  if (!can(area)) return '';
  const module = wmsModules[area]; const fields = wmsAreaFields[area].filter(field => fieldAccess(area, field) !== 'deny'); const rows = wmsItems(area);
  const canDelete = can(area, 'write');
  const canEdit = canDelete && wmsAreaFields[area].some(field => field !== 'onHand' && fieldAccess(area, field) === 'write');
  const canCreate = canDelete && wmsCreateRequiredFields[area].every(field => fieldAccess(area, field) === 'write');
  const showActions = canEdit || canDelete;
  return `<article class="module-card module-card--wide"><div class="module-heading"><div><h3>${htmlT(module.title)}</h3><p>${htmlT(module.help)}</p></div>${canCreate ? `<button data-action="new-wms" data-area="${esc(area)}">${htmlT('new')}</button>` : `<span class="module-badge">${htmlT('wms_module_badge')}</span>`}</div>
    <div class="table-wrap responsive-table"><table><thead><tr>${fields.map(field => `<th>${fieldLabel(field)}</th>`).join('')}${showActions ? `<th>${htmlT('actions')}</th>` : ''}</tr></thead><tbody>
      ${rows.length ? rows.map(item => `<tr>${fields.map(field => `<td data-label="${htmlT(field)}">${wmsCell(area, field, item[field])}</td>`).join('')}${showActions ? `<td data-label="${htmlT('actions')}"><div class="actions">${canEdit ? `<button class="ghost" data-action="edit-wms" data-area="${esc(area)}" data-id="${esc(item.id)}">${htmlT('edit')}</button>` : ''}${canDelete ? `<button class="danger" data-action="delete-wms" data-area="${esc(area)}" data-id="${esc(item.id)}">${htmlT('delete')}</button>` : ''}</div></td>` : ''}</tr>`).join('') : `<tr><td colspan="${fields.length + (showActions ? 1 : 0)}">${htmlT('empty')}</td></tr>`}
    </tbody></table></div></article>`;
}
function operations() {
  if (!canUseOperations()) return empty();
  const wms = state.db?.wms || {}; const stock = wms.inventoryItems || []; const inbound = wms.inboundReceipts || []; const outbound = wms.outboundOrders || [];
  const kpis = [
    ['erp_kpi_inventory_lines', stock.length, 'erp_kpi_master_data'],
    ['erp_kpi_units_on_hand', stock.reduce((sum, item) => sum + Number(item.onHand || 0), 0), 'erp_kpi_live_balance'],
    ['erp_kpi_receipts', inbound.filter(item => !['received', 'cancelled'].includes(item.status)).length, 'erp_kpi_open'],
    ['erp_kpi_orders', outbound.filter(item => !['shipped', 'cancelled'].includes(item.status)).length, 'erp_kpi_open']
  ];
  return `<section class="panel operations-panel"><div class="heading"><div><h2>${fieldLabel('nav_operations', 'tooltip_operations')}</h2><div class="hint">${htmlT('erp_intro')}</div></div></div>
    <div class="kpi-grid">${kpis.map(([label, value, detail]) => `<article class="kpi-card"><span>${htmlT(label)}</span><strong>${esc(value)}</strong><small>${htmlT(detail)}</small></article>`).join('')}</div>
    <div class="module-grid">${Object.keys(wmsModules).map(wmsModule).join('')}</div>
  </section>`;
}
function mobileDemo() {
  return `<section class="panel"><div class="heading"><div><h2>${fieldLabel('nav_mobile_demo', 'tooltip_mobile_demo')}</h2><div class="hint">${htmlT('mobile_demo_intro')}</div></div></div>${MobileIntegrations.render({ translate: t, escape: esc })}</section>`;
}
function permissionToggle(userId, area, field, level, checked, disabled) {
  return `<input type="checkbox" data-permission="${esc(userId)}|${esc(area)}|${esc(field || '')}" data-level="${esc(level)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="${htmlT(level === 'view' ? 'visible' : 'modifiable')}">`;
}
function permissions() {
  if (!can('permissions')) return empty();
  const editable = can('permissions', 'write');
  const areas = Object.keys(areaFields);
  const roleUsers = state.db.users.filter(user => state.permissionRole === 'all' || user.role === state.permissionRole);
  if (!roleUsers.some(user => user.id === state.permissionUser)) state.permissionUser = roleUsers[0]?.id || '';
  const user = roleUsers.find(item => item.id === state.permissionUser);
  const roleOptions = ['all', 'admin', 'editor', 'viewer'].map(role => `<option value="${esc(role)}" ${role === state.permissionRole ? 'selected' : ''}>${role === 'all' ? htmlT('all_roles') : esc(roleLabel(role))}</option>`).join('');
  const userOptions = roleUsers.map(item => `<option value="${esc(item.id)}" ${item.id === state.permissionUser ? 'selected' : ''}>${esc(item.name)} · ${esc(roleLabel(item.role))}</option>`).join('');
  const branches = user ? areas.map(area => {
    const tableValue = permission(area, user.id);
    const selfLock = user.id === state.actor && area === 'permissions';
    const open = state.openPermissionAreas.includes(area);
    const fields = areaFields[area];
    return `<section class="permission-branch">
      <div class="permission-branch__header">
        <button type="button" class="permission-branch__toggle" data-action="toggle-permission-area" data-area="${esc(area)}" aria-expanded="${open}">
          <span class="permission-branch__chevron" aria-hidden="true">${open ? '−' : '+'}</span><span>${esc(areaLabel(area))}</span>
        </button>
        <div class="permission-branch__access">
          <label><span>${htmlT('visible')}</span>${permissionToggle(user.id, area, '', 'view', tableValue !== 'deny', !editable || selfLock)}</label>
          <label><span>${htmlT('modifiable')}</span>${permissionToggle(user.id, area, '', 'edit', tableValue === 'write', !editable || selfLock)}</label>
        </div>
      </div>
      ${open ? `<div class="permission-fields">${fields.length ? fields.map(field => {
        const value = fieldAccess(area, field, user.id);
        return `<div class="permission-field"><span>${htmlT(field)}</span><label><span>${htmlT('visible')}</span>${permissionToggle(user.id, area, field, 'view', value !== 'deny', !editable || tableValue === 'deny')}</label><label><span>${htmlT('modifiable')}</span>${permissionToggle(user.id, area, field, 'edit', value === 'write', !editable || tableValue !== 'write')}</label></div>`;
      }).join('') : `<div class="permission-field permission-field--empty">${htmlT('no_field_permissions')}</div>`}</div>` : ''}
    </section>`;
  }).join('') : `<div class="notice">${htmlT('empty')}</div>`;
  return `<section class="panel"><div class="heading"><div><h2>${htmlT('nav_permissions')}</h2><div class="hint">${htmlT('permission_hint')}</div></div></div>
    <div class="permission-toolbar">
      <label><span>${htmlT('role_filter')}</span><select data-action="permission-role">${roleOptions}</select></label>
      <label><span>${htmlT('permission_user')}</span><select data-action="permission-user" ${roleUsers.length ? '' : 'disabled'}>${userOptions}</select></label>
    </div>
    ${user ? `<article class="permission-user permission-user--selected"><h3>${esc(user.name)} <span class="tag">${esc(roleLabel(user.role))}</span></h3>${branches}</article>` : branches}
  </section>`;
}
function auditResults(visible) {
  const filtered = AuditFilters.applyFilters(state.db.audit, auditFilterState, { allowedFields: visible, locale: state.language });
  const noResults = AuditFilters.hasActiveFilters(auditFilterState, visible) ? htmlT('audit_filter_no_results') : htmlT('empty');
  return `<div data-audit-results><div class="audit-filter__summary">${filtered.length} / ${state.db.audit.length} ${htmlT('audit_filter_results')}</div><div class="table-wrap responsive-table"><table><thead><tr>${visible.map(field => `<th>${htmlT(field)}</th>`).join('')}</tr></thead><tbody>
    ${filtered.length ? filtered.map(entry => `<tr>${visible.map(field => `<td data-label="${htmlT(field)}">${field === 'when' ? esc(new Date(entry.when).toLocaleString(state.language)) : field === 'action' ? htmlT(entry.action) : esc(formatValue(entry[field]))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${visible.length}">${noResults}</td></tr>`}
  </tbody></table></div></div>`;
}
function updateAuditResults() {
  if (state.page !== 'audit') return;
  const current = document.querySelector('[data-audit-results]');
  if (!current) return;
  const visible = auditFields.filter(field => fieldAccess('audit', field) !== 'deny');
  current.outerHTML = auditResults(visible);
}
function updateAuditFilterRow(target, groupIndex, rowIndex) {
  const rowElement = target.closest('.audit-filter__row');
  const row = auditFilterState.groups[groupIndex]?.rows[rowIndex];
  if (!rowElement || !row) return;
  const type = AuditFilters.FIELD_TYPES[row.field] || 'text';
  const option = (value, current, text) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(text)}</option>`;
  const operatorSelect = rowElement.querySelector('select[data-audit-filter-property="operator"]');
  if (operatorSelect) operatorSelect.innerHTML = AuditFilters.OPERATORS[type].map(operator => option(operator, row.operator, t(`audit_filter_operator_${operator}`))).join('');
  const valueLabel = rowElement.querySelectorAll('label')[2];
  if (!valueLabel) return;
  const attrs = `data-audit-filter-group="${groupIndex}" data-audit-filter-index="${rowIndex}" data-audit-filter-property="value"`;
  let control;
  if (row.operator === 'is_empty' || row.operator === 'is_not_empty') {
    control = `<span class="audit-filter__no-value">${htmlT('audit_filter_no_value')}</span>`;
  } else if (type === 'action') {
    const actions = [...new Set(state.db.audit.map(entry => String(entry.action ?? '')).filter(Boolean))].sort();
    control = `<select ${attrs} aria-label="${htmlT('audit_filter_value')}">${option('', row.value, t('audit_filter_select_value'))}${actions.map(action => option(action, row.value, t(action))).join('')}</select>`;
  } else {
    const inputType = type === 'time' ? (row.operator === 'on_date' ? 'date' : 'datetime-local') : 'text';
    control = `<input type="${inputType}" ${attrs} value="${esc(row.value)}" placeholder="${htmlT('audit_filter_value_placeholder')}" aria-label="${htmlT('audit_filter_value')}">`;
  }
  valueLabel.innerHTML = `<span>${htmlT('audit_filter_value')}</span>${control}`;
}
function audit() {
  if (!can('audit')) return empty();
  const visible = auditFields.filter(field => fieldAccess('audit', field) !== 'deny');
  AuditFilters.restrictFilters(auditFilterState, visible);
  // AuditFilters receives raw translations and performs its own context escaping.
  const filterControls = AuditFilters.renderControls({ state: auditFilterState, entries: state.db.audit, allowedFields: visible, translate: t, escape: esc });
  return `<section class="panel"><div class="heading"><div><h2>${htmlT('nav_audit')}</h2><div class="hint">${htmlT('audit_hint')}</div></div></div>${filterControls}${auditResults(visible)}</section>`;
}
function languages() {
  if (!can('translations')) return empty();
  const editable = can('translations', 'write');
  const targets = state.db.languages.filter(language => language.enabled && language.code !== 'en');
  if (!targets.some(language => language.code === state.translationLanguage)) state.translationLanguage = targets[0]?.code || 'en';
  const editor = state.db.translationEditor || { entries: [] };
  const sourceLanguage = state.db.languages.find(language => language.code === editor.sourceLanguage) || { code: editor.sourceLanguage, name: editor.sourceLanguage };
  const entries = editor.targetLanguage === state.translationLanguage ? editor.entries : [];
  const uiEntries = entries.filter(entry => entry.scope === 'ui');
  const optionEntries = entries.filter(entry => entry.scope === 'option');
  const targetOptions = targets.map(language => `<option value="${esc(language.code)}" ${language.code === state.translationLanguage ? 'selected' : ''}>${esc(language.name)} (${esc(language.code)})</option>`).join('');
  const rows = values => values.map(entry => `<div class="translation-row">
    <div class="translation-key"><strong>${esc(entry.key)}</strong>${entry.dictionaryKey ? `<span>${esc(entry.dictionaryKey)} · ${esc(entry.optionCode)}</span>` : ''}</div>
    <div class="translation-source" lang="en" data-source-label="${htmlT('english_source')}">${esc(entry.english)}</div>
    <label class="translation-editor"><span class="sr-only">${htmlT('target_translation')}: ${esc(entry.key)}</span><input required aria-label="${htmlT('target_translation')}: ${esc(entry.key)}" data-translation="${esc(entry.key)}" data-initial-value="${esc(entry.target)}" value="${esc(entry.target)}" ${editable ? '' : 'disabled'}>${editable ? `<button type="button" data-action="save-translation" disabled>${htmlT('save')}</button>` : ''}</label>
  </div>`).join('');
  return `<section class="panel"><div class="heading"><div><h2>${htmlT('nav_languages')}</h2><div class="hint">${htmlT('translation_help')}</div></div>${editable ? `<button data-action="new-language">${htmlT('add_language')}</button>` : ''}</div>
    <div class="translation-toolbar"><label><span>${htmlT('target_language')}</span><select data-action="translation-language" ${targets.length ? '' : 'disabled'}>${targetOptions}</select></label><div class="translation-source-note"><strong>${htmlT('source_language')}:</strong> ${esc(sourceLanguage.name)} (${esc(sourceLanguage.code)})</div></div>
    <div class="translation-table"><div class="translation-row translation-row--head"><div>${htmlT('translation_key')}</div><div>${htmlT('english_source')}</div><div>${htmlT('target_translation')}</div></div>${rows(uiEntries)}</div>
    <div class="heading translation-section-heading"><div><h2>${htmlT('dropdown_translations')}</h2><div class="hint">${htmlT('dropdown_translation_help')}</div></div></div>
    <div class="translation-table"><div class="translation-row translation-row--head"><div>${htmlT('dictionary_key')}</div><div>${htmlT('english_source')}</div><div>${htmlT('target_translation')}</div></div>${rows(optionEntries)}</div>
  </section>`;
}
function control(field, value, area, type) {
  const writable = fieldAccess(area, field) === 'write'; const disabled = writable ? '' : 'disabled';
  if (field === 'status' || field === 'risk') {
    const options = lookupOptions(field);
    const current = value || options[0]?.code || '';
    return `<select required name="${field}" ${disabled}>${options.map(option => `<option value="${esc(option.code)}" ${option.code === current ? 'selected' : ''}>${esc(lookupLabel(field, option.code))}</option>`).join('')}</select>`;
  }
  if (field === 'role') return `<select required name="role" ${disabled}>${select(['admin', 'editor', 'viewer'], value || 'viewer', roleLabel)}</select>`;
  if (field === 'active') return `<input type="checkbox" name="active" ${value !== false ? 'checked' : ''} ${disabled}>`;
  if (field === 'highlightColor') return `<div class="color-control"><input type="color" required name="highlightColor" value="${esc(normalizeColor(value))}" ${disabled}><output>${esc(normalizeColor(value))}</output></div>`;
  return `<input ${field === 'email' ? 'type="email"' : 'type="text"'} required ${field === 'email' ? 'autocomplete="email"' : 'pattern=".*\\S.*"'} name="${field}" value="${esc(value ?? '')}" ${disabled}>`;
}
const wmsDefaults = {
  inventory_items: { unit: 'pcs', status: 'active', onHand: 0, reorderPoint: 0 },
  stock_movements: { type: 'receipt', quantity: 1 },
  warehouse_locations: { type: 'storage', capacity: 1000, active: true },
  inbound_receipts: { status: 'planned', quantity: 1 },
  outbound_orders: { status: 'new', priority: 'normal', quantity: 1 }
};
function localDateValue(value, dateOnly = false) {
  if (!value) return '';
  const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return dateOnly ? local.slice(0, 10) : local.slice(0, 16);
}
function wmsControl(area, field, value) {
  const disabled = fieldAccess(area, field) === 'write' && field !== 'onHand' ? '' : 'disabled';
  const initial = value ?? wmsDefaults[area]?.[field] ?? '';
  const initialAttribute = `data-initial-value="${esc(String(initial))}"`;
  if (field === 'itemId' || field === 'locationId') {
    const values = field === 'itemId' ? state.db?.wms?.inventoryItems || [] : state.db?.wms?.warehouseLocations || [];
    return `<select required name="${esc(field)}" ${initialAttribute} ${disabled}><option value="">${htmlT(field === 'itemId' ? 'wms_select_item' : 'wms_select_location')}</option>${values.map(item => `<option value="${esc(item.id)}" ${item.id === initial ? 'selected' : ''}>${esc(field === 'itemId' ? `${item.sku} · ${item.name}` : `${item.code} · ${item.name}`)}</option>`).join('')}</select>`;
  }
  const dictionary = wmsLookup(area, field);
  if (dictionary) return `<select required name="${esc(field)}" ${initialAttribute} ${disabled}>${lookupOptions(dictionary).map(option => `<option value="${esc(option.code)}" ${option.code === initial ? 'selected' : ''}>${esc(lookupLabel(dictionary, option.code))}</option>`).join('')}</select>`;
  if (field === 'active') return `<input type="checkbox" name="active" ${initial !== false ? 'checked' : ''} ${disabled}>`;
  if (['onHand', 'reorderPoint', 'capacity', 'quantity'].includes(field)) return `<input type="number" name="${esc(field)}" value="${esc(initial)}" min="0" ${field === 'quantity' ? 'step="0.01" min="0.01"' : 'step="1"'} ${initialAttribute} ${disabled} required>`;
  if (field === 'occurredAt' || field === 'receivedAt') { const local = localDateValue(initial); return `<input type="datetime-local" name="${esc(field)}" value="${esc(local)}" data-initial-value="${esc(local)}" ${disabled}>`; }
  if (field === 'shipBy') { const local = localDateValue(initial, true); return `<input type="date" name="shipBy" value="${esc(local)}" data-initial-value="${esc(local)}" ${disabled}>`; }
  if (field === 'note') return `<textarea name="note" ${initialAttribute} ${disabled}>${esc(initial)}</textarea>`;
  const optional = field === 'reference';
  return `<input type="text" name="${esc(field)}" value="${esc(initial)}" ${initialAttribute} ${optional ? '' : 'required pattern=".*\\S.*"'} ${disabled}>`;
}
function normalizeWmsPayload(values) {
  const payload = { ...values };
  for (const field of ['reorderPoint', 'capacity', 'quantity']) if (Object.hasOwn(payload, field)) payload[field] = Number(payload[field]);
  for (const field of ['occurredAt', 'receivedAt', 'shipBy']) if (payload[field]) payload[field] = new Date(payload[field]).toISOString();
  return payload;
}
function formValues(form) {
  return [...form.elements].reduce((values, element) => {
    if (!element.name || element.disabled || element.type === 'submit' || element.type === 'button') return values;
    values[element.name] = element.type === 'checkbox' ? element.checked : element.value.trim();
    return values;
  }, {});
}
function originalFormValue(form, item, field) {
  const element = form.elements[field];
  if (element?.type === 'checkbox') return item[field] !== false;
  if (element?.dataset.initialValue !== undefined) return element.dataset.initialValue;
  return String(item[field] ?? '').trim();
}
function changedFormValues(form, item = {}) {
  const values = formValues(form);
  if (!item.id) return values;
  return Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== originalFormValue(form, item, field)));
}
function updateFormState(form = document.querySelector('form[data-form]')) {
  if (!form || !['entity', 'user', 'language', 'wms'].includes(form.dataset.form)) return;
  const submit = form.querySelector('[data-submit]');
  if (!submit) return;
  const item = state.modal?.item || {};
  const valid = form.checkValidity();
  const changed = !item.id || Object.keys(changedFormValues(form, item)).length > 0;
  submit.disabled = !(valid && changed);
  submit.setAttribute('aria-disabled', String(submit.disabled));
  const validation = form.querySelector('[data-form-validation]');
  const invalid = [...form.elements].filter(element => element.name && !element.validity.valid && (element.dataset.touched === 'true' || form.dataset.submitted === 'true'));
  [...form.elements].filter(element => element.name).forEach(element => element.setAttribute('aria-invalid', String(!element.validity.valid && (element.dataset.touched === 'true' || form.dataset.submitted === 'true'))));
  if (validation) {
    validation.classList.toggle('form-validation--valid', valid);
    validation.textContent = invalid.length ? t(invalid[0].validity.typeMismatch ? 'validation_email' : invalid[0].validity.patternMismatch ? 'validation_pattern' : 'validation_required') : t(valid ? 'form_validation_ready' : 'form_validation_hint');
  }
}
function modal() {
  if (!state.modal) return '';
  const { type, item = {} } = state.modal;
  const validation = `<div class="form-validation" data-form-validation role="status">${htmlT('form_validation_hint')}</div>`;
  if (type === 'entity') { const visible = entityFields.filter(field => fieldAccess('entity', field) !== 'deny'); return `<div class="modal"><form class="dialog form" data-form="entity" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${htmlT(item.id ? 'edit' : 'new')}</h2>${visible.map(field => `<label>${fieldLabel(field)}${control(field, item[field], 'entity', type)}</label>`).join('')}${validation}<div class="form-actions"><button type="button" class="ghost" data-action="close">${htmlT('cancel')}</button><button type="submit" data-submit disabled>${htmlT('save')}</button></div></form></div>`; }
  if (type === 'user') { const visible = userFields.filter(field => fieldAccess('users', field) !== 'deny'); return `<div class="modal"><form class="dialog form" data-form="user" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${htmlT(item.id ? 'edit_user' : 'add_user')}</h2>${visible.map(field => `<label>${fieldLabel(field)}${control(field, item[field] ?? item.highlight_color, 'users', type)}</label>`).join('')}${validation}<div class="form-actions"><button type="button" class="ghost" data-action="close">${htmlT('cancel')}</button><button type="submit" data-submit disabled>${htmlT('save')}</button></div></form></div>`; }
  if (type === 'wms') { const area = state.modal.area; const visible = wmsAreaFields[area].filter(field => fieldAccess(area, field) !== 'deny'); return `<div class="modal"><form class="dialog form" data-form="wms" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${htmlT(item.id ? 'edit' : 'new')} · ${htmlT(wmsModules[area].title)}</h2>${visible.map(field => `<label>${fieldLabel(field)}${wmsControl(area, field, item[field])}</label>`).join('')}${validation}<div class="form-actions"><button type="button" class="ghost" data-action="close">${htmlT('cancel')}</button><button type="submit" data-submit disabled>${htmlT('save')}</button></div></form></div>`; }
  return `<div class="modal"><form class="dialog form" data-form="language" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${htmlT('add_language')}</h2><label>${fieldLabel('language_code')}<input required name="code" pattern="[A-Za-z]{2,8}" maxlength="8" autocapitalize="none"></label><label>${fieldLabel('language_name')}<input required name="name" pattern=".*\\S.*"></label>${validation}<div class="form-actions"><button type="button" class="ghost" data-action="close">${htmlT('cancel')}</button><button type="submit" data-submit disabled>${htmlT('save')}</button></div></form></div>`;
}
function currentPage() { return ({ entities, operations, users, permissions, audit, languages, mobile: mobileDemo })[state.page](); }
function render() {
  MobileIntegrations.stop();
  applyAppearance();
  document.getElementById('app').innerHTML = layout(currentPage());
  const shell = document.querySelector('.shell');
  if (shell) shell.inert = Boolean(state.modal);
  updateFormState(); updateToastDom();
  if (state.modal) queueMicrotask(() => document.querySelector('.dialog input:not([disabled]),.dialog select:not([disabled]),.dialog textarea:not([disabled]),.dialog button:not([disabled])')?.focus());
}
function ensurePage() { if (!canOpenPage(state.page)) state.page = nav.find(([page]) => canOpenPage(page))?.[0] || 'mobile'; }
async function refresh() { state.db = await api(`/api/bootstrap?language=${encodeURIComponent(state.translationLanguage)}`); state.actor = state.db.currentActorId || state.actor; ensurePage(); render(); }

document.addEventListener('input', event => {
  const form = event.target.closest('form[data-form]');
  if (form) { event.target.dataset.touched = 'true'; updateFormState(form); }
  if (event.target.name === 'highlightColor') {
    const output = event.target.closest('.color-control')?.querySelector('output'); if (output) output.textContent = event.target.value;
  }
  const translation = event.target.closest('input[data-translation]');
  if (translation) {
    const button = translation.closest('.translation-editor')?.querySelector('[data-action="save-translation"]');
    if (button) button.disabled = !translation.value.trim() || translation.value === translation.dataset.initialValue;
  }
});
document.addEventListener('change', async event => {
  try {
    const target = event.target;
    const editedForm = target.closest('form[data-form]');
    if (editedForm) { target.dataset.touched = 'true'; updateFormState(editedForm); return; }
    if (target.dataset.auditFilterGroupControl !== undefined) {
      AuditFilters.updateGroup(auditFilterState, Number(target.dataset.auditFilterGroupControl), target.dataset.auditFilterProperty, target.value);
      updateAuditResults(); return;
    }
    if (target.dataset.auditFilterIndex !== undefined) {
      const property = target.dataset.auditFilterProperty;
      const groupIndex = Number(target.dataset.auditFilterGroup); const rowIndex = Number(target.dataset.auditFilterIndex);
      AuditFilters.updateFilter(auditFilterState, groupIndex, rowIndex, property, target.value);
      // Change may fire on blur before the pressed button receives click. Only the dependent
      // row controls and result region are updated, preserving that button and click chain.
      if (property === 'field' || property === 'operator') updateAuditFilterRow(target, groupIndex, rowIndex);
      updateAuditResults();
      return;
    }
    if (target.dataset.action === 'permission-role') { state.permissionRole = target.value; state.permissionUser = ''; state.openPermissionAreas = []; render(); return; }
    if (target.dataset.action === 'permission-user') { state.permissionUser = target.value; state.openPermissionAreas = []; render(); return; }
    if (target.dataset.action === 'translation-language') { state.translationLanguage = target.value; state.db.translationEditor = await api(`/api/translations?language=${encodeURIComponent(target.value)}`); render(); return; }
    if (target.dataset.action === 'language') { state.language = target.value; render(); return; }
    if (target.dataset.action === 'theme') { state.theme = target.value; writePreference('logx-theme', state.theme); render(); return; }
    if (target.dataset.action === 'tooltips') { state.tooltips = target.checked; writePreference('logx-tooltips', String(state.tooltips)); render(); return; }
    if (target.dataset.action === 'actor') { state.actor = target.value; await refresh(); return; }
    if (target.dataset.permission) {
      const [userId, area, field] = target.dataset.permission.split('|');
      const selector = `[data-permission="${CSS.escape(target.dataset.permission)}"]`;
      const controls = [...document.querySelectorAll(selector)]; const view = controls.find(item => item.dataset.level === 'view'); const edit = controls.find(item => item.dataset.level === 'edit');
      if (target.dataset.level === 'edit' && target.checked) view.checked = true; if (target.dataset.level === 'view' && !target.checked) edit.checked = false;
      const nextAccess = edit.checked ? 'write' : view.checked ? 'read' : 'deny';
      try {
        await api('/api/permissions', { method: 'PUT', body: JSON.stringify({ userId, area, field: field || null, access: nextAccess }) });
      } catch (error) {
        state.page = 'permissions'; await refresh(); throw error;
      }
      state.page = 'permissions'; await refresh(); showToast(t('saved')); return;
    }
  } catch (error) { showToast(error.message); }
});
document.addEventListener('keydown', event => {
  if (!state.modal) return;
  if (event.key === 'Escape') { event.preventDefault(); state.modal = null; render(); return; }
  if (event.key !== 'Tab') return;
  const dialog = document.querySelector('.dialog');
  const focusable = [...(dialog?.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') || [])];
  if (!focusable.length) return;
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  try {
    if (button.dataset.mobileAction) { await MobileIntegrations.run(button.dataset.mobileAction, { translate: t, escape: esc, root: button.closest('[data-mobile-integrations]') }); return; }
    if (button.dataset.page) { if (state.page === 'mobile' && button.dataset.page !== 'mobile') MobileIntegrations.stop(); state.page = button.dataset.page; if (state.page === 'audit') await refresh(); else render(); return; }
    const action = button.dataset.action;
    if (!action) return;
    if (action === 'save-translation') {
      const input = button.closest('.translation-editor')?.querySelector('input[data-translation]');
      if (!input || !input.value.trim() || input.value === input.dataset.initialValue) return;
      button.disabled = true;
      await api('/api/translations', { method: 'PUT', body: JSON.stringify({ language: state.translationLanguage, key: input.dataset.translation, value: input.value.trim() }) });
      state.page = 'languages'; await refresh(); showToast(t('saved')); return;
    }
    if (action === 'toggle-permission-area') {
      const area = button.dataset.area;
      state.openPermissionAreas = state.openPermissionAreas.includes(area) ? state.openPermissionAreas.filter(item => item !== area) : [...state.openPermissionAreas, area];
      render(); return;
    }
    if (action === 'audit-filter-add') { AuditFilters.addFilter(auditFilterState, Number(button.dataset.group)); render(); return; }
    if (action === 'audit-filter-remove') { AuditFilters.removeFilter(auditFilterState, Number(button.dataset.group), Number(button.dataset.index)); render(); return; }
    if (action === 'audit-filter-add-group') { AuditFilters.addGroup(auditFilterState); render(); return; }
    if (action === 'audit-filter-remove-group') { AuditFilters.removeGroup(auditFilterState, Number(button.dataset.group)); render(); return; }
    if (action === 'audit-filter-reset') { AuditFilters.resetFilters(auditFilterState); render(); return; }
    if (action === 'new-entity') state.modal = { type: 'entity', item: { status: 'draft', risk: 'medium' } };
    if (action === 'edit-entity') state.modal = { type: 'entity', item: state.db.entities.find(item => item.id === button.dataset.id) };
    if (action === 'new-user') state.modal = { type: 'user', item: { role: 'viewer', active: true } };
    if (action === 'edit-user') state.modal = { type: 'user', item: state.db.users.find(item => item.id === button.dataset.id) };
    if (action === 'new-wms') state.modal = { type: 'wms', area: button.dataset.area, item: { ...(wmsDefaults[button.dataset.area] || {}) } };
    if (action === 'edit-wms') state.modal = { type: 'wms', area: button.dataset.area, item: wmsItems(button.dataset.area).find(item => item.id === button.dataset.id) };
    if (action === 'new-language') state.modal = { type: 'language' };
    if (action === 'close') state.modal = null;
    if (action === 'delete-entity' && confirm(t('confirm_delete'))) { await api(`/api/entities/${button.dataset.id}`, { method: 'DELETE' }); await refresh(); showToast(t('deleted')); return; }
    if (action === 'delete-user' && confirm(t('confirm_delete_user'))) { await api(`/api/users/${button.dataset.id}`, { method: 'DELETE' }); await refresh(); showToast(t('deleted')); return; }
    if (action === 'delete-wms' && confirm(t('confirm_delete'))) { await api(`/api/${wmsModules[button.dataset.area].route}/${button.dataset.id}`, { method: 'DELETE' }); state.page = 'operations'; await refresh(); showToast(t('deleted')); return; }
    render();
  } catch (error) { showToast(error.message); }
});
document.addEventListener('submit', async event => {
  if (!event.target.dataset.form) return; event.preventDefault();
  try {
    const form = event.target; const { type, item = {} } = state.modal;
    form.dataset.submitted = 'true';
    if (type === 'entity' || type === 'user') {
      updateFormState(form);
      const value = changedFormValues(form, item);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (item.id && Object.keys(value).length === 0) return;
      if (type === 'entity') await api(item.id ? `/api/entities/${item.id}` : '/api/entities', { method: item.id ? 'PUT' : 'POST', body: JSON.stringify(value) });
      else await api(item.id ? `/api/users/${item.id}` : '/api/users', { method: item.id ? 'PUT' : 'POST', body: JSON.stringify(value) });
    } else if (type === 'wms') {
      updateFormState(form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const value = normalizeWmsPayload(changedFormValues(form, item)); if (item.id && Object.keys(value).length === 0) return;
      const module = wmsModules[state.modal.area];
      await api(item.id ? `/api/${module.route}/${item.id}` : `/api/${module.route}`, { method: item.id ? 'PUT' : 'POST', body: JSON.stringify(value) });
      state.page = 'operations';
    } else {
      updateFormState(form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const value = formValues(form); value.code = value.code.toLowerCase();
      await api('/api/languages', { method: 'POST', body: JSON.stringify(value) });
      state.translationLanguage = value.code;
    }
    state.modal = null; await refresh(); showToast(t('saved'));
  } catch (error) { showToast(error.message); }
});

refresh().catch(error => { document.getElementById('app').innerHTML = `<main class="shell"><div class="notice">${esc(error.message)}</div></main>`; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
