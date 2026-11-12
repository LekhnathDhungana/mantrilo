import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { hash, currentPeriod, plans, secret } from '../server/domain.mjs';
// The workspace's one key, which the console shows to its owner.
async function workspaceKey(c) {
  const { keys } = (await c.call('/api/me')).body.workspace;
  return keys.find((key) => key.status === 'active' && key.secret);
}
import { bootstrapAdmin } from '../server/bootstrap.mjs';
async function fixture(t, mode = 'demo', options = {}) {
  const store = new MemoryStore(),
    sessions = new DemoSessions();
  await seedDemo(store);
  const server = createConsoleServer({
    store,
    sessions,
    mode,
    appOrigin: 'http://localhost:4190',
    staticRoot: '/tmp/nonexistent-console-test',
    ...options,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  function client() {
    const jar = new Map();
    let csrf = '';
    return {
      jar,
      async call(path, method = 'GET', data, extra = {}) {
        if (method !== 'GET' && !csrf) {
          const r = await this.call('/api/auth/csrf');
          csrf = r.body.csrfToken;
        }
        const response = await fetch(base + path, {
          method,
          headers: {
            Origin: 'http://localhost:4190',
            Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
            ...(method !== 'GET'
              ? { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }
              : {}),
            ...extra,
          },
          ...(data === undefined ? {} : { body: JSON.stringify(data) }),
        });
        for (const cookie of response.headers.getSetCookie()) {
          const [entry] = cookie.split(';');
          const index = entry.indexOf('=');
          jar.set(entry.slice(0, index), entry.slice(index + 1));
        }
        return { status: response.status, body: await response.json(), headers: response.headers };
      },
      async login(role = 'customer') {
        return this.call('/api/auth/demo', 'POST', { role });
      },
    };
  }
  return { store, sessions, server, base, client };
}

test('unauthenticated routes, CSRF, origin checking and logout invalidation', async (t) => {
  const f = await fixture(t),
    c = f.client();
  assert.equal((await c.call('/api/me')).status, 401);
  assert.equal((await c.login()).status, 200);
  assert.equal((await c.call('/api/me')).body.user.admin, false);
  assert.equal(
    (await c.call('/api/keys/rotate', 'POST', undefined, { Origin: 'https://untrusted.invalid' }))
      .status,
    403,
  );
  assert.equal(
    (await c.call('/api/keys/rotate', 'POST', undefined, { 'X-CSRF-Token': 'wrong' })).status,
    403,
  );
  const oldSession = c.jar.get('mantrilo_session');
  assert.ok(oldSession);
  assert.equal((await c.call('/api/auth/logout', 'POST')).status, 200);
  c.jar.set('mantrilo_session', oldSession);
  assert.equal((await c.call('/api/me')).status, 401);
});
test('a new workspace starts on the Free plan with a working sandbox key and no setup', async (t) => {
  const f = await fixture(t),
    owner = f.client();
  await owner.login();
  const me = (await owner.call('/api/me')).body;
  assert.equal(me.plan.name, 'Free');
  assert.equal(me.allowance.requests, 500);
  const now = new Date();
  assert.equal(
    me.resetsAt,
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  );
  assert.equal(me.workspace.keys.length, 1);
  const [key] = me.workspace.keys,
    raw = key.secret;
  assert.equal(key.status, 'active');
  assert.match(raw, /^mtr_sbx_[\w-]{49}$/);
  assert.equal(key.environment, 'sandbox');
  assert.equal((await f.store.findKey(hash(raw))).status, 'active');
  assert.ok(!JSON.stringify(await owner.call('/api/keys')).includes('"hash"'));
  // Loading again does not issue another key.
  assert.equal((await owner.call('/api/me')).body.workspace.keys.length, 1);
  assert.equal(
    (
      await owner.call('/api/demo/catalog?type=books', 'GET', undefined, {
        Authorization: `Bearer ${raw}`,
      })
    ).status,
    200,
  );
  assert.equal((await owner.call('/api/me')).body.usage.contentRequests, 1);
});
test('keys are isolated per workspace, and workspace keys are regenerated, not revoked', async (t) => {
  const f = await fixture(t),
    owner = f.client();
  await owner.login();
  const original = await workspaceKey(owner);
  await f.store.ensureWorkspace('other-workspace', 'other-owner', 'Other');
  await f.store.putUser('other-owner', { workspaceId: 'other-workspace' });
  const token = secret();
  f.sessions.sessions.set(hash(token), {
    uid: 'other-owner',
    email: 'other@demo.invalid',
    admin: false,
    expiresAt: Date.now() + 100000,
  });
  const other = f.client();
  other.jar.set('mantrilo_session', token);
  assert.equal((await other.call(`/api/keys/${original.id}`, 'DELETE')).status, 404);
  const otherKeys = (await other.call('/api/keys')).body.keys;
  assert.equal(otherKeys.length, 1);
  assert.notEqual(otherKeys[0].secret, original.secret);
  const revoke = await owner.call(`/api/keys/${original.id}`, 'DELETE');
  assert.equal(revoke.status, 409);
  assert.equal(revoke.body.error.code, 'primary_key');
  const rotated = await owner.call('/api/keys/rotate', 'POST', { environment: 'sandbox' });
  assert.equal(rotated.status, 201);
  const next = await workspaceKey(owner);
  assert.equal(next.id, rotated.body.key.id);
  assert.notEqual(next.secret, original.secret);
  const keys = (await owner.call('/api/keys')).body.keys;
  assert.equal(keys.filter((key) => key.status === 'active').length, 1);
  assert.ok(!JSON.stringify(keys).includes(original.secret));
  assert.equal((await f.store.findKey(hash(original.secret))).status, 'revoked');
  const catalog = (key) =>
    owner.call('/api/demo/catalog', 'GET', undefined, { Authorization: `Bearer ${key}` });
  assert.equal((await catalog(original.secret)).status, 401);
  assert.equal((await catalog(next.secret)).status, 200);
});
test('existing workspaces move to the free tier and keep their older keys working', async (t) => {
  const f = await fixture(t),
    c = f.client(),
    legacy = `mtr_sbx_${secret()}`;
  await f.store.transact('workspace_demo_owner', (w) => {
    w.plan = 'Sandbox';
    w.keys.push({
      id: 'legacy',
      name: 'Old sandbox key',
      environment: 'sandbox',
      prefix: legacy.slice(0, 16),
      hash: hash(legacy),
      status: 'active',
      createdAt: '2026-10-01T00:00:00.000Z',
      lastUsedAt: null,
    });
  });
  await c.login();
  const me = (await c.call('/api/me')).body;
  assert.equal(me.plan.name, 'Free');
  assert.equal(me.workspace.plan, 'Free');
  assert.equal(me.workspace.keys.length, 2);
  assert.ok(await workspaceKey(c));
  assert.equal((await f.store.findKey(hash(legacy))).status, 'active');
  assert.equal((await c.call('/api/keys/legacy', 'DELETE')).status, 200);
  assert.equal((await f.store.findKey(hash(legacy))).status, 'revoked');
});
test('concurrent quota reservations cannot exceed remaining allowance; failures cost zero', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  const { secret: raw } = await workspaceKey(c);
  await f.store.transact('workspace_demo_owner', (w) => {
    w.usage[currentPeriod()] = {
      contentRequests: 499,
      audioBytes: 0,
      daily: {},
      endpoints: {},
    };
  });
  const responses = await Promise.all(
    Array.from({ length: 16 }, () =>
      c.call('/api/demo/catalog?type=text', 'GET', undefined, {
        Authorization: `Bearer ${raw}`,
      }),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 429).length, 15);
  const me = (await c.call('/api/me')).body;
  assert.equal(me.usage.contentRequests, 500);
  assert.ok(
    me.workspace.logs.filter((l) => l.type === 'error').every((l) => l.cost.contentRequests === 0),
  );
  assert.ok(!JSON.stringify(me.workspace.logs).includes(raw));
});
test('the workspace key shows its last public API use', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  const key = await workspaceKey(c);
  assert.equal(key.lastUsedAt, null);
  const at = '2026-11-08T10:00:00.000Z';
  await f.store.touchKey('workspace_demo_owner', key.id, at);
  assert.equal((await c.call('/api/keys')).body.keys[0].lastUsedAt, at);
  assert.equal((await workspaceKey(c)).lastUsedAt, at);
});
test('regenerating many times prunes old revoked records', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  const first = (await workspaceKey(c)).secret;
  for (let i = 0; i < 60; i++)
    assert.equal(
      (await c.call('/api/keys/rotate', 'POST', { environment: 'sandbox' })).status,
      201,
    );
  assert.equal(await f.store.findKey(hash(first)), null);
  const keys = (await f.store.getWorkspace('workspace_demo_owner')).keys;
  assert.ok(keys.length <= 51);
  assert.equal(keys.filter((key) => key.status === 'active').length, 1);
  assert.ok(keys.filter((key) => key.status === 'revoked').every((key) => !key.secret));
});
test("the playground relays /v1 requests only, and only with this workspace's keys", async (t) => {
  const seen = [];
  const upstream = createServer((request, response) => {
    seen.push({ url: request.url, authorization: request.headers.authorization });
    response.setHeader('X-Request-Id', 'upstream-id');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ data: [], requestId: 'upstream-id' }));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => upstream.close(resolve)));
  const apiUrl = `http://127.0.0.1:${upstream.address().port}`,
    f = await fixture(t, 'demo', { apiUrl }),
    c = f.client();
  await c.login();
  assert.equal((await c.call('/api/auth/config')).body.apiUrl, apiUrl);
  const key = (await workspaceKey(c)).secret;
  const ok = await c.call('/api/playground', 'POST', { path: '/v1/mantras?limit=2', key });
  assert.equal(ok.body.response.status, 200);
  assert.equal(ok.body.response.requestId, 'upstream-id');
  assert.deepEqual(seen, [{ url: '/v1/mantras?limit=2', authorization: `Bearer ${key}` }]);
  for (const path of [
    '//evil.invalid/v1',
    '/v1/../healthz',
    '/v1/mantras/%2e%2e/audio',
    '/internal',
    '/v1/shlokas',
    '/v1/mantras/a/b',
  ])
    assert.equal(
      (await c.call('/api/playground', 'POST', { path, key })).body.error.code,
      'invalid_path',
    );
  const foreign = await c.call('/api/playground', 'POST', {
    path: '/v1/mantras',
    key: `mtr_sbx_${secret()}`,
  });
  assert.equal(foreign.body.error.code, 'key_not_in_workspace');
  assert.equal(seen.length, 1);
});
test('the playground reports an unconfigured or unreachable API', async (t) => {
  const off = await fixture(t),
    a = off.client();
  await a.login();
  assert.equal(
    (await a.call('/api/playground', 'POST', { path: '/v1', key: 'x' })).body.error.code,
    'api_unconfigured',
  );
  const down = await fixture(t, 'demo', { apiUrl: 'http://127.0.0.1:9' }),
    b = down.client();
  await b.login();
  const key = (await workspaceKey(b)).secret;
  assert.equal(
    (await b.call('/api/playground', 'POST', { path: '/v1', key })).body.error.code,
    'api_unreachable',
  );
});
test('overview and usage include public API traffic', async (t) => {
  const f = await fixture(t),
    c = f.client(),
    id = 'workspace_demo_owner',
    period = currentPeriod(),
    today = new Date().toISOString().slice(0, 10),
    event = (at, endpoint, audioBytes = 0) => ({
      workspaceId: id,
      keyId: 'k',
      endpoint,
      requests: 1,
      audioBytes,
      period: at.toISOString().slice(0, 7),
      at,
    });
  await c.login();
  const lastMonth = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 15),
  );
  f.store.apiEvents.push(
    event(new Date(), 'mantras.list'),
    event(new Date(), 'mantras.audio', 2048),
    event(lastMonth, 'mantras.get'),
    { ...event(new Date(), 'mantras.list'), workspaceId: 'someone-else' },
  );
  const me = (await c.call('/api/me')).body;
  assert.equal(me.usage.contentRequests, 2);
  assert.equal(me.usage.audioBytes, 2048);
  assert.equal(me.allowance.audioBytes, 50 * 1024 * 1024);
  const thisMonth = (await c.call(`/api/usage?from=${period}-01&to=${today}`)).body;
  assert.deepEqual(thisMonth.endpoints, { 'mantras.list': 1, 'mantras.audio': 1 });
  assert.equal(thisMonth.daily.find((d) => d.day === today).contentRequests, 2);
  const from = lastMonth.toISOString().slice(0, 10),
    range = (await c.call(`/api/usage?from=${from}&to=${today}`)).body;
  assert.equal(range.endpoints['mantras.get'], 1);
  assert.equal(range.daily.length, 2);
  assert.ok(range.policy.includes('audio link'));
});
test('paid product limits and the Free plan production restriction are server-side', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  assert.equal(
    (
      await c.call('/api/products', 'POST', {
        name: 'Not paid',
        type: 'app',
        environment: 'production',
      })
    ).status,
    403,
  );
  await f.store.transact('workspace_demo_owner', (w) => {
    w.plan = 'Starter';
  });
  const records = await Promise.all([
    c.call('/api/products', 'POST', { name: 'One', type: 'app', environment: 'production' }),
    c.call('/api/products', 'POST', { name: 'Two', type: 'website', environment: 'production' }),
  ]);
  assert.deepEqual(records.map((r) => r.status).sort(), [201, 409]);
});
test('administrator actions reject customers', async (t) => {
  const f = await fixture(t),
    customer = f.client(),
    admin = f.client();
  await customer.login();
  await admin.login('admin');
  assert.equal((await customer.call('/api/admin/workspaces')).status, 403);
  assert.equal((await admin.call('/api/admin/workspaces')).status, 200);
  const bill = (await customer.call('/api/billing')).body;
  assert.equal(bill.monthlyTotal, 0);
  assert.deepEqual(bill.invoices, []);
  assert.equal(bill.period, null);
});
test('settings persist, date filters validate, errors do not expose input details', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  assert.equal(
    (
      await c.call('/api/settings', 'PATCH', {
        name: 'Updated workspace',
        emailNotifications: true,
        usageAlertThreshold: 75,
      })
    ).status,
    200,
  );
  assert.equal((await c.call('/api/me')).body.workspace.name, 'Updated workspace');
  assert.equal((await c.call('/api/usage?from=2026-02-30&to=2026-03-01')).status, 400);
  assert.equal((await c.call('/api/not-supported?birth=private-exact-birth-detail')).status, 404);
  assert.ok(
    !JSON.stringify((await c.call('/api/me')).body.workspace.logs).includes(
      'private-exact-birth-detail',
    ),
  );
});
test('Firebase mode exposes no demo login or simulated catalog', async (t) => {
  const f = await fixture(t, 'firebase'),
    c = f.client();
  assert.equal((await c.login()).status, 404);
  assert.equal((await c.call('/api/demo/catalog')).status, 503);
});
test('content prices match the requested contract, and every plan includes astrology', () => {
  assert.deepEqual(
    plans.map((p) => [p.name, p.price, p.requests, p.audio, p.products]),
    [
      ['Free', 0, '500', 'Sample audio only', 'Testing only'],
      ['Starter', 49.99, '50,000', '10 GB', '1'],
      ['Growth', 149, '250,000', '50 GB', '3'],
      ['Business', 399, '1,000,000', '200 GB', '10'],
    ],
  );
  assert.ok(plans.every((p) => p.astrology === 'Astrology calculations included'));
});
test('administrator bootstrap is idempotent and never resets an existing password', async () => {
  let record = null,
    creations = 0,
    claimUpdates = 0;
  const auth = {
    async getUserByEmail() {
      if (record) return record;
      throw Object.assign(new Error('missing'), { code: 'auth/user-not-found' });
    },
    async createUser(input) {
      creations++;
      record = { uid: 'admin-test', email: input.email, customClaims: { existing: true } };
      return record;
    },
    async setCustomUserClaims(uid, claims) {
      claimUpdates++;
      record.customClaims = claims;
    },
  };
  const store = new MemoryStore();
  await assert.rejects(() => bootstrapAdmin({ auth, store }), /MANTRILO_INITIAL_ADMIN_PASSWORD/);
  assert.equal((await bootstrapAdmin({ auth, store, password: secret() })).created, true);
  assert.equal((await bootstrapAdmin({ auth, store })).created, false);
  assert.equal(creations, 1);
  assert.equal(claimUpdates, 2);
  assert.equal(record.customClaims.admin, true);
  assert.equal(record.customClaims.existing, true);
  assert.equal((await store.listWorkspaces()).length, 1);
});
