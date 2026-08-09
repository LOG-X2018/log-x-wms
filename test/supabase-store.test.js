'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  createStateStore,
  StateConflictError
} = require('../lib/supabase-store');

function response(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('file fallback is selected only when Supabase environment is absent', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'log-x-wms-store-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'state.json');
  const store = createStateStore({
    env: {},
    fallbackFile: filePath,
    seedFactory: () => ({ schemaVersion: 1, users: [] })
  });

  assert.equal(store.kind, 'file');
  assert.equal(store.enabled, false);
  const state = await store.loadState();
  state.users.push({ id: 'demo' });
  await store.saveState(state);

  const reloaded = await createStateStore({ env: {}, fallbackFile: filePath }).loadState();
  assert.deepEqual(reloaded.users, [{ id: 'demo' }]);
});

test('partial or implicit publishable configuration fails instead of silently using a file', () => {
  assert.throws(
    () => createStateStore({ env: { SUPABASE_URL: 'https://project.supabase.co' }, fallbackFile: 'unused.json' }),
    error => error.code === 'INVALID_CONFIG'
  );
  assert.throws(
    () => createStateStore({
      env: {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo'
      },
      fallbackFile: 'unused.json'
    }),
    error => error.code === 'INVALID_CONFIG' && /PUBLIC_DEMO_MODE/.test(error.message)
  );
  assert.throws(
    () => createStateStore({ env: { SUPABASE_PUBLIC_DEMO_MODE: 'true' }, fallbackFile: 'unused.json' }),
    error => error.code === 'INVALID_CONFIG'
  );
});

test('explicit publishable-key demo mode initializes the single public demo state', async () => {
  const calls = [];
  const replies = [
    response([]),
    response([{ state: { schemaVersion: 4 }, revision: 1, updated_at: '2026-08-09T10:00:00Z' }])
  ];
  const store = createStateStore({
    env: {
      SUPABASE_URL: 'https://project.supabase.co/',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
      SUPABASE_PUBLIC_DEMO_MODE: 'true'
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return replies.shift();
    },
    fallbackFile: 'must-not-be-used.json',
    seedFactory: () => ({ schemaVersion: 4 })
  });

  const state = await store.loadState();
  assert.deepEqual(state, { schemaVersion: 4 });
  assert.equal(store.securityMode, 'public-demo');
  assert.equal(store.publicWritable, true);
  assert.match(calls[0].url, /\/rpc\/log_x_wms_read_demo_state$/);
  assert.match(calls[1].url, /\/rpc\/log_x_wms_write_demo_state$/);
  assert.equal(calls[0].options.headers.apikey, 'sb_publishable_demo');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    payload: { schemaVersion: 4 },
    expected_revision: 0
  });
});

test('loaded revision is sent on the next production write', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/log_x_wms_read_state')) {
      return response([{ state: { users: [] }, revision: 7, updated_at: '2026-08-09T10:00:00Z' }]);
    }
    return response([{ state: { users: [{ id: 'one' }] }, revision: 8, updated_at: '2026-08-09T10:01:00Z' }]);
  };
  const store = createStateStore({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy.service.role.jwt'
    },
    fetchImpl,
    fallbackFile: 'must-not-be-used.json'
  });

  const state = await store.loadState();
  state.users.push({ id: 'one' });
  const saved = await store.saveState(state);
  const request = calls.at(-1).options;
  assert.equal(request.headers.Authorization, 'Bearer legacy.service.role.jwt');
  assert.equal(JSON.parse(request.body).expected_revision, 7);
  assert.equal(saved.revision, 8);
});

test('Supabase errors never fall back and revision conflicts are typed', async () => {
  const remoteStore = createStateStore({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_backend'
    },
    fetchImpl: async () => response({ code: '42501', message: 'permission denied' }, 403),
    fallbackFile: 'must-not-be-used.json'
  });
  await assert.rejects(remoteStore.loadState(), error => error.code === 'STATE_REMOTE_ERROR');

  const conflictStore = createStateStore({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_backend'
    },
    fetchImpl: async () => response({ code: '40001', message: 'state revision conflict' }, 500),
    fallbackFile: 'must-not-be-used.json'
  });
  await assert.rejects(
    conflictStore.saveState({ users: [] }, { expectedRevision: 3 }),
    error => error instanceof StateConflictError && error.code === 'STATE_CONFLICT'
  );
  await assert.rejects(
    conflictStore.saveState({ users: [] }, { expectedRevision: -1 }),
    error => error.code === 'INVALID_REVISION'
  );
});

test('new migration contains explicit state and ERP/WMS security boundaries', async () => {
  const migration = await fs.readFile(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260809120000_persistent_demo_erp_wms.sql'),
    'utf8'
  );
  for (const table of ['inventory_items', 'warehouse_locations', 'stock_movements', 'inbound_receipts', 'outbound_orders']) {
    assert.match(migration, new RegExp(`create table public\\.${table} \\(`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /profiles_accent_color_rgb_hex_check/);
  assert.match(migration, /grant execute on function[\s\S]*log_x_wms_read_state\(\)[\s\S]*to service_role/);
  assert.match(migration, /log_x_wms_write_demo_state[\s\S]*to anon, authenticated, service_role/);
  assert.doesNotMatch(migration, /grant all on table[\s\S]{0,300}to anon/);
});

test('runtime dropdown synchronization uses qualified PL/pgSQL variables', async () => {
  const migration = await fs.readFile(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260809150000_runtime_dictionary_sync.sql'),
    'utf8'
  );
  assert.match(migration, /target_dictionary_key text/);
  assert.match(migration, /target_option_code text/);
  assert.match(migration, /target_translation_key text/);
  assert.match(migration, /target_language_code text/);
  assert.doesNotMatch(migration, /^\s{2}(dictionary_key|option_code|translation_key|language_code) text;/m);
  assert.match(migration, /jsonb_set\(stored\.state, '\{dictionaries\}', public\.read_dictionaries\('en'\), true\)/);
});
