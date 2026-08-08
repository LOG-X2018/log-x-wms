const test = require('node:test');
const assert = require('node:assert/strict');
const { seed } = require('../server');

test('seed contains the validation roles, translations and entity sample', () => {
  const db = seed();
  assert.deepEqual(Object.keys(db.permissions), ['admin', 'editor', 'viewer']);
  assert.equal(db.languages.length, 3);
  assert.ok(db.entities.length > 0);
  assert.equal(db.permissions.viewer.entity.fields.risk, 'deny');
});
