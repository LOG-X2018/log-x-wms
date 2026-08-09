'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const READ_RPC = 'log_x_wms_read_state';
const WRITE_RPC = 'log_x_wms_write_state';
const DEMO_READ_RPC = 'log_x_wms_read_demo_state';
const DEMO_WRITE_RPC = 'log_x_wms_write_demo_state';
const DEFAULT_TIMEOUT_MS = 12_000;

class StateStoreError extends Error {
  constructor(message, { code = 'STATE_STORE_ERROR', status, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'StateStoreError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class StateConflictError extends StateStoreError {
  constructor(message = 'The application state changed before it could be saved.', options = {}) {
    super(message, { ...options, code: 'STATE_CONFLICT' });
    this.name = 'StateConflictError';
  }
}

function jsonObject(value, label = 'Application state') {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch (cause) {
    throw new StateStoreError(`${label} must be JSON serializable.`, { code: 'INVALID_STATE', cause });
  }
  if (!serialized) throw new StateStoreError(`${label} is required.`, { code: 'INVALID_STATE' });
  const parsed = JSON.parse(serialized);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new StateStoreError(`${label} must be a JSON object.`, { code: 'INVALID_STATE' });
  }
  return parsed;
}

function validRevision(value, fallback = null) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : fallback;
}

function requestedRevision(value) {
  if (value === null) return null;
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new StateStoreError('Expected revision must be a non-negative safe integer or null.', {
      code: 'INVALID_REVISION'
    });
  }
  return revision;
}

function normalizeUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch (cause) {
    throw new StateStoreError('SUPABASE_URL must be a valid HTTP(S) URL.', { code: 'INVALID_CONFIG', cause });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new StateStoreError('SUPABASE_URL must be a plain HTTP(S) project URL.', { code: 'INVALID_CONFIG' });
  }
  return parsed.toString().replace(/\/$/, '');
}

function firstRpcRow(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  return payload && typeof payload === 'object' ? payload : null;
}

class SupabaseStateStore {
  constructor({ url, apiKey, publicDemo = false, fetchImpl = globalThis.fetch, seedFactory, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    if (typeof fetchImpl !== 'function') {
      throw new StateStoreError('A fetch implementation is required for Supabase persistence.', { code: 'INVALID_CONFIG' });
    }
    this.kind = 'supabase';
    this.enabled = true;
    this.persistent = true;
    this.securityMode = publicDemo ? 'public-demo' : 'server-secret';
    this.publicWritable = publicDemo;
    this.url = normalizeUrl(url);
    this.apiKey = String(apiKey);
    this.readRpc = publicDemo ? DEMO_READ_RPC : READ_RPC;
    this.writeRpc = publicDemo ? DEMO_WRITE_RPC : WRITE_RPC;
    this.fetchImpl = fetchImpl;
    this.seedFactory = seedFactory;
    this.timeoutMs = timeoutMs;
    this.revision = null;
    this.updatedAt = null;
    this.stateRevisions = new WeakMap();
  }

  async rpc(name, parameters) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    timer.unref?.();
    const headers = {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    // Opaque sb_secret_* keys are authenticated by the gateway through `apikey`.
    // Legacy service_role JWT keys must also be the bearer token so PostgREST uses
    // the service_role database role. Neither form is ever sent to the browser.
    if (this.securityMode === 'server-secret' && !this.apiKey.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let response;
    try {
      response = await this.fetchImpl(`${this.url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parameters || {}),
        signal: controller.signal
      });
    } catch (cause) {
      const timeout = cause?.name === 'AbortError';
      throw new StateStoreError(timeout ? 'Supabase state request timed out.' : 'Supabase state request failed.', {
        code: timeout ? 'STATE_TIMEOUT' : 'STATE_UNAVAILABLE',
        cause
      });
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.text();
    let payload = null;
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = { message: raw }; }
    }
    if (!response.ok) {
      const remoteCode = payload?.code;
      const remoteMessage = String(payload?.message || 'Supabase rejected the state request.');
      if (remoteCode === '40001' || /state revision conflict/i.test(remoteMessage)) {
        throw new StateConflictError(undefined, { status: response.status, details: remoteCode });
      }
      throw new StateStoreError(remoteMessage, {
        code: 'STATE_REMOTE_ERROR',
        status: response.status,
        details: remoteCode
      });
    }
    return payload;
  }

  remember(state, revision, updatedAt) {
    const normalizedRevision = validRevision(revision, 0);
    this.revision = normalizedRevision;
    this.updatedAt = updatedAt || null;
    this.stateRevisions.set(state, normalizedRevision);
    return state;
  }

  async readExisting() {
    const row = firstRpcRow(await this.rpc(this.readRpc, {}));
    if (!row) return null;
    const state = jsonObject(row.state, 'Stored application state');
    return this.remember(state, row.revision, row.updated_at);
  }

  async loadState(seedOverride) {
    const existing = await this.readExisting();
    if (existing) return existing;
    const factory = seedOverride || this.seedFactory;
    if (typeof factory !== 'function') return null;

    const initial = jsonObject(await factory());
    this.stateRevisions.set(initial, 0);
    try {
      await this.saveState(initial, { expectedRevision: 0 });
      return initial;
    } catch (error) {
      // Another instance can initialize the singleton between our read and write.
      if (!(error instanceof StateConflictError)) throw error;
      const winner = await this.readExisting();
      if (!winner) throw error;
      return winner;
    }
  }

  async saveState(value, { expectedRevision } = {}) {
    const state = jsonObject(value);
    const remembered = value && typeof value === 'object' ? this.stateRevisions.get(value) : undefined;
    const expected = expectedRevision === undefined
      ? (remembered ?? this.revision)
      : requestedRevision(expectedRevision);
    const row = firstRpcRow(await this.rpc(this.writeRpc, {
      payload: state,
      expected_revision: expected
    }));
    if (!row) throw new StateStoreError('Supabase returned no saved state.', { code: 'INVALID_RESPONSE' });
    const saved = jsonObject(row.state, 'Saved application state');
    this.remember(value, row.revision, row.updated_at);
    return {
      state: saved,
      revision: this.revision,
      updatedAt: this.updatedAt
    };
  }
}

class JsonFileStateStore {
  constructor({ filePath, seedFactory }) {
    if (!filePath) throw new StateStoreError('A fallback state file path is required.', { code: 'INVALID_CONFIG' });
    this.kind = 'file';
    this.enabled = false;
    this.persistent = false;
    this.filePath = path.resolve(filePath);
    this.seedFactory = seedFactory;
    this.revision = 0;
    this.updatedAt = null;
    this.stateRevisions = new WeakMap();
  }

  remember(state) {
    this.stateRevisions.set(state, this.revision);
    return state;
  }

  async loadState(seedOverride) {
    try {
      const state = jsonObject(JSON.parse(await fs.readFile(this.filePath, 'utf8')), 'Stored application state');
      const info = await fs.stat(this.filePath);
      this.updatedAt = info.mtime.toISOString();
      return this.remember(state);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        if (error instanceof StateStoreError) throw error;
        throw new StateStoreError('The local state file could not be read.', { code: 'FILE_READ_ERROR', cause: error });
      }
    }

    const factory = seedOverride || this.seedFactory;
    if (typeof factory !== 'function') return null;
    const initial = jsonObject(await factory());
    await this.saveState(initial);
    return initial;
  }

  async saveState(value) {
    const state = jsonObject(value);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temporary, this.filePath);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
    this.revision += 1;
    this.updatedAt = new Date().toISOString();
    this.remember(value);
    return { state, revision: this.revision, updatedAt: this.updatedAt };
  }
}

function createStateStore({
  env = process.env,
  fetchImpl = globalThis.fetch,
  fallbackFile,
  seedFactory,
  timeoutMs
} = {}) {
  const url = String(env.SUPABASE_URL || '').trim();
  const secret = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const publishable = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  const publicDemo = String(env.SUPABASE_PUBLIC_DEMO_MODE || '').trim().toLowerCase() === 'true';
  const selectedKey = secret || publishable;
  if (publicDemo && !url && !selectedKey) {
    throw new StateStoreError(
      'SUPABASE_PUBLIC_DEMO_MODE=true requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.',
      { code: 'INVALID_CONFIG' }
    );
  }
  if (Boolean(url) !== Boolean(selectedKey)) {
    throw new StateStoreError(
      'SUPABASE_URL and a supported Supabase API key must be configured together.',
      { code: 'INVALID_CONFIG' }
    );
  }
  if (url && publishable && !secret && !publicDemo) {
    throw new StateStoreError(
      'SUPABASE_PUBLISHABLE_KEY persistence requires SUPABASE_PUBLIC_DEMO_MODE=true because the demo state is publicly writable.',
      { code: 'INVALID_CONFIG' }
    );
  }
  if (url && selectedKey) return new SupabaseStateStore({
    url,
    apiKey: selectedKey,
    publicDemo: !secret && publicDemo,
    fetchImpl,
    seedFactory,
    timeoutMs
  });
  return new JsonFileStateStore({ filePath: fallbackFile, seedFactory });
}

module.exports = {
  createStateStore,
  SupabaseStateStore,
  JsonFileStateStore,
  StateStoreError,
  StateConflictError,
  READ_RPC,
  WRITE_RPC,
  DEMO_READ_RPC,
  DEMO_WRITE_RPC
};
