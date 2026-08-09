const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createFilterState,
  addFilter,
  addGroup,
  removeFilter,
  resetFilters,
  updateGroup,
  updateFilter,
  applyFilters,
  hasActiveFilters
} = require('../public/audit-filter');

const rows = [
  { actor: 'Rendszeradmin', action: 'update', table: 'test_entities', field: 'name', after: 'Árvíztűrő tükörfúrógép', when: '2026-08-08T08:30:00.000Z' },
  { actor: 'Projektgazda', action: 'create', table: 'users', field: 'email', after: 'teszt@example.com', when: '2026-08-09T10:00:00.000Z' },
  { actor: 'Rendszeradmin', action: 'remove', table: 'users', field: '__record__', after: null, when: '2026-08-10T12:00:00.000Z' }
];

test('text, action and date-time audit filters work together', () => {
  const state = createFilterState();
  updateFilter(state, 0, 0, 'field', 'actor');
  updateFilter(state, 0, 0, 'value', 'rendszer');
  addFilter(state, 0);
  updateFilter(state, 0, 1, 'field', 'action');
  updateFilter(state, 0, 1, 'value', 'update');
  addFilter(state, 0);
  updateFilter(state, 0, 2, 'field', 'when');
  updateFilter(state, 0, 2, 'operator', 'before');
  updateFilter(state, 0, 2, 'value', '2026-08-09T00:00');
  assert.deepEqual(applyFilters(rows, state, { locale: 'hu' }), [rows[0]]);
});

test('nested AND/OR groups combine conditions at two levels', () => {
  const state = createFilterState();
  updateGroup(state, 0, 'mode', 'or');
  updateFilter(state, 0, 0, 'field', 'action');
  updateFilter(state, 0, 0, 'value', 'create');
  addFilter(state, 0);
  updateFilter(state, 0, 1, 'field', 'action');
  updateFilter(state, 0, 1, 'value', 'remove');
  addGroup(state);
  updateGroup(state, 1, 'join', 'and');
  updateFilter(state, 1, 0, 'field', 'table');
  updateFilter(state, 1, 0, 'value', 'users');
  assert.deepEqual(applyFilters(rows, state), [rows[1], rows[2]]);
});

test('empty rules are inactive and rows can be removed or reset', () => {
  const state = createFilterState();
  assert.equal(hasActiveFilters(state), false);
  assert.deepEqual(applyFilters(rows, state), rows);
  addFilter(state, 0); removeFilter(state, 0, 0); resetFilters(state);
  assert.equal(state.groups.length, 1);
  assert.equal(state.groups[0].rows.length, 1);
  assert.equal(hasActiveFilters(state), false);
});
