(function exposeAuditFilters(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AuditFilters = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function createAuditFiltersModule() {
  'use strict';

  const FIELD_TYPES = Object.freeze({
    actor: 'text', table: 'text', record: 'text', action: 'action',
    field: 'text', before: 'text', after: 'text', when: 'time'
  });
  const OPERATORS = Object.freeze({
    text: Object.freeze(['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty']),
    action: Object.freeze(['equals', 'not_equals']),
    time: Object.freeze(['before', 'after', 'on_date'])
  });
  const VALUELESS_OPERATORS = new Set(['is_empty', 'is_not_empty']);

  function createRow(field = 'actor') {
    const safeField = FIELD_TYPES[field] ? field : 'actor';
    return { field: safeField, operator: OPERATORS[FIELD_TYPES[safeField]][0], value: '' };
  }
  function createGroup(join = 'and') { return { join, mode: 'and', rows: [createRow()] }; }
  function createFilterState() { return { groups: [createGroup()] }; }
  function groupAt(state, groupIndex) { return state.groups[Number(groupIndex)] || null; }

  function addFilter(state, groupIndex = state.groups.length - 1) {
    const group = groupAt(state, groupIndex);
    if (group) group.rows.push(createRow());
    return state;
  }
  function removeFilter(state, groupIndex, rowIndex) {
    const group = groupAt(state, groupIndex);
    if (group && Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < group.rows.length) group.rows.splice(rowIndex, 1);
    return state;
  }
  function addGroup(state) { state.groups.push(createGroup('and')); return state; }
  function removeGroup(state, groupIndex) {
    if (state.groups.length > 1 && Number.isInteger(groupIndex) && groupIndex >= 0 && groupIndex < state.groups.length) state.groups.splice(groupIndex, 1);
    return state;
  }
  function resetFilters(state) { state.groups.splice(0, state.groups.length, createGroup()); return state; }
  function updateGroup(state, groupIndex, property, value) {
    const group = groupAt(state, groupIndex);
    if (!group) return state;
    if (property === 'join') group.join = value === 'or' ? 'or' : 'and';
    if (property === 'mode') group.mode = value === 'or' ? 'or' : 'and';
    return state;
  }
  function updateFilter(state, groupIndex, rowIndex, property, value) {
    const row = groupAt(state, groupIndex)?.rows[Number(rowIndex)];
    if (!row) return state;
    if (property === 'field' && FIELD_TYPES[value]) {
      row.field = value;
      row.operator = OPERATORS[FIELD_TYPES[value]][0];
      row.value = '';
    }
    if (property === 'operator' && OPERATORS[FIELD_TYPES[row.field]].includes(value)) {
      row.operator = value;
      if (VALUELESS_OPERATORS.has(value)) row.value = '';
    }
    if (property === 'value') row.value = String(value ?? '');
    return state;
  }
  function restrictFilters(state, allowedFields) {
    const allowed = allowedFields.filter(field => FIELD_TYPES[field]);
    for (const group of state.groups) for (const row of group.rows) {
      if (!allowed.includes(row.field) && allowed.length) {
        row.field = allowed[0]; row.operator = OPERATORS[FIELD_TYPES[row.field]][0]; row.value = '';
      }
    }
    return state;
  }

  function fieldValue(entry, field) { return field === 'when' ? entry.when ?? entry.at ?? '' : entry[field]; }
  function printable(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') { try { return JSON.stringify(value); } catch (_error) { return String(value); } }
    return String(value);
  }
  function normalized(value, locale) {
    const text = printable(value).normalize('NFKC');
    try { return text.toLocaleLowerCase(locale); } catch (_error) { return text.toLowerCase(); }
  }
  function validDate(value) { const timestamp = new Date(value).getTime(); return Number.isNaN(timestamp) ? null : timestamp; }
  function localDateKey(value) {
    const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function isActive(row, allowedFields) {
    if (!row || !allowedFields.includes(row.field) || !OPERATORS[FIELD_TYPES[row.field]]?.includes(row.operator)) return false;
    if (VALUELESS_OPERATORS.has(row.operator)) return true;
    if (!String(row.value ?? '').trim()) return false;
    return FIELD_TYPES[row.field] !== 'time' || (row.operator === 'on_date' ? /^\d{4}-\d{2}-\d{2}$/.test(row.value) : validDate(row.value) !== null);
  }
  function matches(entry, row, locale) {
    const type = FIELD_TYPES[row.field]; const source = fieldValue(entry, row.field);
    if (type === 'time') {
      if (row.operator === 'on_date') return localDateKey(source) === row.value;
      const sourceTime = validDate(source); const targetTime = validDate(row.value);
      if (sourceTime === null || targetTime === null) return false;
      return row.operator === 'before' ? sourceTime < targetTime : sourceTime > targetTime;
    }
    const actual = normalized(source, locale); const expected = normalized(row.value, locale);
    if (row.operator === 'contains') return actual.includes(expected);
    if (row.operator === 'not_contains') return !actual.includes(expected);
    if (row.operator === 'equals') return actual === expected;
    if (row.operator === 'not_equals') return actual !== expected;
    if (row.operator === 'starts_with') return actual.startsWith(expected);
    if (row.operator === 'ends_with') return actual.endsWith(expected);
    if (row.operator === 'is_empty') return actual === '';
    if (row.operator === 'is_not_empty') return actual !== '';
    return true;
  }
  function activeGroups(state, allowedFields = Object.keys(FIELD_TYPES)) {
    return state.groups.map(group => ({ ...group, rows: group.rows.filter(row => isActive(row, allowedFields)) })).filter(group => group.rows.length);
  }
  function hasActiveFilters(state, allowedFields = Object.keys(FIELD_TYPES)) { return activeGroups(state, allowedFields).length > 0; }
  function applyFilters(entries, state, options = {}) {
    const groups = activeGroups(state, options.allowedFields || Object.keys(FIELD_TYPES));
    if (!groups.length) return entries.slice();
    return entries.filter(entry => groups.reduce((combined, group, index) => {
      const groupResult = group.mode === 'or'
        ? group.rows.some(row => matches(entry, row, options.locale))
        : group.rows.every(row => matches(entry, row, options.locale));
      if (index === 0) return groupResult;
      return group.join === 'or' ? combined || groupResult : combined && groupResult;
    }, true));
  }

  function renderControls({ state, entries, allowedFields, translate, escape }) {
    const label = key => escape(translate(key));
    const fieldOptions = allowedFields.filter(field => FIELD_TYPES[field]);
    const actions = [...new Set(entries.map(entry => printable(entry.action)).filter(Boolean))].sort();
    const option = (value, current, text) => `<option value="${escape(value)}" ${value === current ? 'selected' : ''}>${escape(text)}</option>`;
    const renderValue = (row, groupIndex, rowIndex) => {
      if (VALUELESS_OPERATORS.has(row.operator)) return `<span class="audit-filter__no-value">${label('audit_filter_no_value')}</span>`;
      const attrs = `data-audit-filter-group="${groupIndex}" data-audit-filter-index="${rowIndex}" data-audit-filter-property="value"`;
      if (FIELD_TYPES[row.field] === 'action') return `<select ${attrs} aria-label="${label('audit_filter_value')}">${option('', row.value, translate('audit_filter_select_value'))}${actions.map(action => option(action, row.value, translate(action))).join('')}</select>`;
      const type = FIELD_TYPES[row.field] === 'time' ? (row.operator === 'on_date' ? 'date' : 'datetime-local') : 'text';
      return `<input type="${type}" ${attrs} value="${escape(row.value)}" placeholder="${label('audit_filter_value_placeholder')}" aria-label="${label('audit_filter_value')}">`;
    };
    const groups = state.groups.map((group, groupIndex) => {
      const rows = group.rows.map((row, rowIndex) => {
        const type = FIELD_TYPES[row.field] || 'text';
        const attrs = `data-audit-filter-group="${groupIndex}" data-audit-filter-index="${rowIndex}"`;
        const operators = OPERATORS[type].map(operator => option(operator, row.operator, translate(`audit_filter_operator_${operator}`))).join('');
        return `<div class="audit-filter__row">
          <label><span>${label('audit_filter_field')}</span><select ${attrs} data-audit-filter-property="field">${fieldOptions.map(field => option(field, row.field, translate(field))).join('')}</select></label>
          <label><span>${label('audit_filter_operator')}</span><select ${attrs} data-audit-filter-property="operator">${operators}</select></label>
          <label><span>${label('audit_filter_value')}</span>${renderValue(row, groupIndex, rowIndex)}</label>
          <button type="button" class="ghost audit-filter__remove" data-action="audit-filter-remove" data-group="${groupIndex}" data-index="${rowIndex}" aria-label="${label('audit_filter_remove')}">${label('audit_filter_remove')}</button>
        </div>`;
      }).join('');
      const groupJoin = groupIndex ? `<label><span>${label('audit_filter_group_join')}</span><select data-audit-filter-group-control="${groupIndex}" data-audit-filter-property="join">${option('and', group.join, translate('audit_filter_and'))}${option('or', group.join, translate('audit_filter_or'))}</select></label>` : `<span class="audit-filter__where">${label('audit_filter_where')}</span>`;
      return `<section class="audit-filter__group"><div class="audit-filter__group-header"><div>${groupJoin}<strong>${label('audit_filter_group')} ${groupIndex + 1}</strong></div><div class="audit-filter__group-tools"><label><span>${label('audit_filter_group_mode')}</span><select data-audit-filter-group-control="${groupIndex}" data-audit-filter-property="mode">${option('and', group.mode, translate('audit_filter_all_conditions'))}${option('or', group.mode, translate('audit_filter_any_condition'))}</select></label><button type="button" class="ghost" data-action="audit-filter-add" data-group="${groupIndex}">${label('audit_filter_add')}</button>${state.groups.length > 1 ? `<button type="button" class="ghost" data-action="audit-filter-remove-group" data-group="${groupIndex}">${label('audit_filter_remove_group')}</button>` : ''}</div></div><div class="audit-filter__rows">${rows || `<div class="audit-filter__empty">${label('audit_filter_empty_rules')}</div>`}</div></section>`;
    }).join('');
    return `<section class="audit-filter" aria-label="${label('audit_filter_title')}"><div class="audit-filter__header"><div><h3>${label('audit_filter_title')}</h3><p>${label('audit_filter_help')}</p></div><div class="audit-filter__actions"><button type="button" class="ghost" data-action="audit-filter-add-group">${label('audit_filter_add_group')}</button><button type="button" class="ghost" data-action="audit-filter-reset">${label('audit_filter_reset')}</button></div></div>${groups}</section>`;
  }

  return Object.freeze({
    FIELD_TYPES, OPERATORS, createFilterState, addFilter, removeFilter, addGroup,
    removeGroup, resetFilters, updateGroup, updateFilter, restrictFilters,
    hasActiveFilters, applyFilters, renderControls
  });
});
