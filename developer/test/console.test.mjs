import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { hash, currentPeriod, plans, secret } from '../server/domain.mjs';
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
    (
      await c.call(
        '/api/keys',
        'POST',
        { name: 'blocked', environment: 'sandbox' },
        { Origin: 'https://untrusted.invalid' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await c.call(
        '/api/keys',
        'POST',
        { name: 'blocked', environment: 'sandbox' },
        { 'X-CSRF-Token': 'wrong' },
      )
    ).status,
    403,
  );
  const oldSession = c.jar.get('mantrilo_session');
  assert.ok(oldSession);
  assert.equal((await c.call('/api/auth/logout', 'POST')).status, 200);
  c.jar.set('mantrilo_session', oldSession);
  assert.equal((await c.call('/api/me')).status, 401);
});
test('one-time key disclosure, hashes, ownership isolation, and revocation', async (t) => {
  const f = await fixture(t),
    owner = f.client();
  await owner.login();
  const result = await owner.call('/api/keys', 'POST', {
    name: 'My server',
    environment: 'sandbox',
  });
  assert.equal(result.status, 201);
  assert.match(result.body.secret, /^mtr_sbx_/);
  const raw = result.body.secret,
    id = result.body.key.id,
    list = await owner.call('/api/keys');
  assert.ok(!JSON.stringify(list.body).includes(raw));
  assert.ok(!JSON.stringify(list.body).includes('"hash"'));
  assert.ok(!JSON.stringify(await f.store.getWorkspace('workspace_demo_owner')).includes(raw));
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
  assert.equal((await other.call(`/api/keys/${id}`, 'DELETE')).status, 404);
  assert.deepEqual((await other.call('/api/keys')).body.keys, []);
  assert.equal(
    (
      await owner.call('/api/demo/catalog?type=books', 'GET', undefined, {
        Authorization: `Bearer ${raw}`,
      })
    ).status,
    200,
  );
  assert.equal((await owner.call(`/api/keys/${id}`, 'DELETE')).status, 200);
  assert.equal(
    (await owner.call('/api/demo/catalog', 'GET', undefined, { Authorization: `Bearer ${raw}` }))
      .status,
    401,
  );
  const me = (await owner.call('/api/me')).body;
  assert.equal(me.usage.contentRequests, 1);
  assert.equal(me.usage.audioBytes, 0);
});
test('concurrent quota reservations cannot exceed remaining allowance; failures cost zero', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  const created = await c.call('/api/keys', 'POST', {
    name: 'Concurrency',
    environment: 'sandbox',
  });
  await f.store.transact('workspace_demo_owner', (w) => {
    w.usage[currentPeriod()] = {
      contentRequests: 999,
      audioBytes: 0,
      daily: {},
      endpoints: {},
    };
  });
  const responses = await Promise.all(
    Array.from({ length: 16 }, () =>
      c.call('/api/demo/catalog?type=text', 'GET', undefined, {
        Authorization: `Bearer ${created.body.secret}`,
      }),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 429).length, 15);
  const me = (await c.call('/api/me')).body;
  assert.equal(me.usage.contentRequests, 1000);
  assert.ok(
    me.workspace.logs.filter((l) => l.type === 'error').every((l) => l.cost.contentRequests === 0),
  );
  assert.ok(!JSON.stringify(me.workspace.logs).includes(created.body.secret));
});
test('new keys carry a checksum and show their last public API use', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  const created = await c.call('/api/keys', 'POST', { name: 'Used', environment: 'sandbox' });
  assert.match(created.body.secret, /^mtr_sbx_[\w-]{49}$/);
  assert.equal(created.body.key.lastUsedAt, null);
  const at = '2026-11-08T10:00:00.000Z';
  await f.store.touchKey('workspace_demo_owner', created.body.key.id, at);
  assert.equal((await c.call('/api/keys')).body.keys[0].lastUsedAt, at);
  assert.equal((await c.call('/api/me')).body.workspace.keys[0].lastUsedAt, at);
});
test('revoked keys do not use up the cap, and old revoked records are pruned', async (t) => {
  const f = await fixture(t),
    c = f.client();
  await c.login();
  const create = () => c.call('/api/keys', 'POST', { name: 'Key', environment: 'sandbox' });
  let first;
  for (let i = 0; i < 60; i++) {
    const created = await create();
    assert.equal(created.status, 201);
    first ||= created.body.secret;
    assert.equal((await c.call(`/api/keys/${created.body.key.id}`, 'DELETE')).status, 200);
  }
  assert.equal(await f.store.findKey(hash(first)), null);
  for (let i = 0; i < 50; i++) assert.equal((await create()).status, 201);
  assert.equal((await create()).body.error.code, 'key_capacity');
  assert.ok((await f.store.getWorkspace('workspace_demo_owner')).keys.length <= 100);
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
  const key = (await c.call('/api/keys', 'POST', { name: 'P', environment: 'sandbox' })).body
    .secret;
  const ok = await c.call('/api/playground', 'POST', { path: '/v1/shlokas?limit=2', key });
  assert.equal(ok.body.response.status, 200);
  assert.equal(ok.body.response.requestId, 'upstream-id');
  assert.deepEqual(seen, [{ url: '/v1/shlokas?limit=2', authorization: `Bearer ${key}` }]);
  for (const path of [
    '//evil.invalid/v1',
    '/v1/../healthz',
    '/v1/shlokas/%2e%2e/audio',
    '/internal',
    '/v1/mantras/a/b',
  ])
    assert.equal(
      (await c.call('/api/playground', 'POST', { path, key })).body.error.code,
      'invalid_path',
    );
  const foreign = await c.call('/api/playground', 'POST', {
    path: '/v1/shlokas',
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
  const key = (await b.call('/api/keys', 'POST', { name: 'P', environment: 'sandbox' })).body
    .secret;
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
    event(new Date(), 'shlokas.list'),
    event(new Date(), 'shlokas.audio', 2048),
    event(lastMonth, 'mantras.get'),
    { ...event(new Date(), 'shlokas.list'), workspaceId: 'someone-else' },
  );
  const me = (await c.call('/api/me')).body;
  assert.equal(me.usage.contentRequests, 2);
  assert.equal(me.usage.audioBytes, 2048);
  assert.equal(me.allowance.audioBytes, 50 * 1024 * 1024);
  const thisMonth = (await c.call(`/api/usage?from=${period}-01&to=${today}`)).body;
  assert.deepEqual(thisMonth.endpoints, { 'shlokas.list': 1, 'shlokas.audio': 1 });
  assert.equal(thisMonth.daily.find((d) => d.day === today).contentRequests, 2);
  const from = lastMonth.toISOString().slice(0, 10),
    range = (await c.call(`/api/usage?from=${from}&to=${today}`)).body;
  assert.equal(range.endpoints['mantras.get'], 1);
  assert.equal(range.daily.length, 2);
  assert.ok(range.policy.includes('audio link'));
});
test('paid product limits and Sandbox production restriction are server-side', async (t) => {
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
  assert.equal(
    (await c.call('/api/keys', 'POST', { name: 'Live', environment: 'production' })).status,
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
    plans.map((p) => [p.price, p.requests, p.audio, p.products]),
    [
      [0, '1,000', 'Sample audio only', 'Testing only'],
      [49, '50,000', '10 GB', '1'],
      [149, '250,000', '50 GB', '3'],
      [399, '1,000,000', '200 GB', '10'],
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
