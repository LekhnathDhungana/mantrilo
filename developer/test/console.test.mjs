import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { hash, currentPeriod, plans, secret } from '../server/domain.mjs';
import { configurePromo } from '../server/promo.mjs';
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

test('the console alias preserves sign-in links and leaves API requests on their original host', async (t) => {
  const alias = 'console-alias.example';
  const { base } = await fixture(t, 'demo', { redirectFromHost: alias });
  const request = (path) => new Promise((resolve, reject) => {
    get(base + path, { headers: { Host: alias } }, (response) => {
      response.resume();
      response.once('end', () => resolve(response));
      response.once('error', reject);
    }).once('error', reject);
  });
  const login = await request('/login?mode=signup');
  assert.equal(login.statusCode, 307);
  assert.equal(login.headers.location, 'http://localhost:4190/login?mode=signup');

  const config = await request('/api/auth/config');
  assert.equal(config.statusCode, 200);
  assert.equal(config.headers.location, undefined);
});

test('the hosted console keeps session and CSRF protection in the single forwarded cookie', async (t) => {
  const { base } = await fixture(t, 'demo', { basePath: '/console', hostingSession: true });
  const origin = 'http://localhost:4190';
  const csrf = await fetch(`${base}/console/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  const csrfCookie = csrf.headers.get('set-cookie');
  assert.match(csrfCookie, /^__session=[^:]+:; HttpOnly; Path=\/console; SameSite=Strict/);
  const cookie = csrfCookie.split(';')[0];
  const post = (route, headers) => fetch(`${base}/console/api/auth/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
    body: JSON.stringify({ role: 'customer' }),
  });
  assert.equal((await post('demo', { Cookie: cookie })).status, 403);
  const login = await post('demo', { Cookie: cookie, 'X-CSRF-Token': csrfToken });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${base}/console/api/me`, { headers: { Cookie: sessionCookie } })).status, 200);
  const logout = await post('logout', { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken });
  assert.equal(logout.status, 200);
  assert.equal((await fetch(`${base}/console/api/me`, { headers: { Cookie: sessionCookie } })).status, 401);
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

test('the personal promo applies to an exhausted workspace across console request paths', async (t) => {
  const code = 'workspace-promo';
  const workspaceId = 'workspace_demo_owner';
  const promo = configurePromo(JSON.stringify({ workspaceId, code }));
  const f = await fixture(t, 'demo', { promo });
  const owner = f.client(),
    other = f.client();
  const redeem = (client, value = code) =>
    client.call('/api/promo/redeem', 'POST', { code: value });
  assert.equal((await redeem(owner)).status, 401);
  await owner.login();
  await other.login('admin');
  assert.equal((await owner.call('/api/me')).body.promo.canRedeem, true);
  assert.equal((await other.call('/api/me')).body.promo.canRedeem, false);
  assert.equal((await redeem(other)).status, 403);
  assert.equal((await redeem(owner, secret())).status, 400);

  const key = await workspaceKey(owner);
  await f.store.transact(workspaceId, (w) => {
    w.usage[currentPeriod()] = { contentRequests: 500, audioBytes: 0, daily: {}, endpoints: {} };
  });
  await f.store.usageSink.add({
    workspaceId,
    keyId: key.id,
    period: currentPeriod(),
    lane: 'sandbox',
    endpoint: 'astrology.positions',
    requests: 500,
    audioBytes: 0,
    at: new Date(),
  });
  const calculate = () =>
    owner.call('/api/astrology/calculate', 'POST', {
      operation: 'positions',
      datetime: '2026-03-20T12:00:00Z',
    });
  const demo = () =>
    owner.call('/api/demo/catalog', 'GET', undefined, { Authorization: `Bearer ${key.secret}` });
  assert.equal((await calculate()).status, 429);
  assert.equal((await demo()).status, 429);

  const redemption = await Promise.all([redeem(owner), redeem(owner)]);
  assert.deepEqual(
    redemption.map(({ status }) => status),
    [200, 200],
  );
  const calculation = await calculate();
  assert.equal(calculation.status, 200);
  assert.equal(calculation.body.usage.remaining, null);
  const catalog = await demo();
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.usage.remaining, null);
  const { body: me } = await owner.call('/api/me');
  assert.equal(me.plan.name, 'Free');
  assert.equal(me.allowance.requests, null);
  assert.equal(me.usage.contentRequests, 1002);
  assert.equal(me.promo.canRedeem, false);
  assert.equal(me.workspace.logs.filter(({ type }) => type === 'promo_redeemed').length, 1);
  assert.ok(!JSON.stringify(me).includes(code));
  const { body: astrology } = await owner.call('/api/astrology');
  assert.equal(astrology.allowance, null);
  assert.equal(astrology.balance, null);
  assert.equal((await other.call('/api/me')).body.allowance.requests, 500);
});

test('a matching email must be verified to redeem a promo in Firebase mode', async (t) => {
  const code = secret();
  const promo = configurePromo(JSON.stringify({ email: 'DEVELOPER@demo.invalid', code }));
  const f = await fixture(t, 'firebase', { promo });
  const client = f.client();
  const token = await f.sessions.createDemo();
  client.jar.set('mantrilo_session', token);
  const redeem = () => client.call('/api/promo/redeem', 'POST', { code });
  assert.equal((await redeem()).status, 403);
  f.sessions.sessions.get(hash(token)).verified = true;
  assert.equal((await redeem()).status, 403);
  f.sessions.sessions.get(hash(token)).emailVerified = true;
  assert.equal((await redeem()).status, 200);
  assert.equal((await client.call('/api/me')).body.allowance.requests, null);
});

test('a private live grant provisions a live key without subscribing or upgrading billing', async (t) => {
  const f = await fixture(t);
  const owner = f.client();
  await owner.login();
  const id = 'workspace_demo_owner';
  await f.store.transact(id, (w) => {
    w.unlimitedRequestsSince = new Date().toISOString();
  });
  assert.equal((await owner.call('/api/me')).body.liveAccess, false);
  await f.store.transact(id, (w) => {
    w.promoLiveAccess = true;
  });
  const me = (await owner.call('/api/me')).body;
  assert.equal(me.plan.name, 'Free');
  assert.equal(me.workspace.billing, undefined);
  assert.equal(me.allowance.requests, null);
  assert.equal(me.liveAccess, true);
  assert.equal(me.usageLane, 'live');
  const live = me.workspace.keys.find((key) => key.environment === 'production');
  assert.match(live.secret, /^mtr_live_/);
  assert.equal((await f.store.findKey(hash(live.secret))).workspaceId, id);
  assert.equal((await owner.call('/api/keys/rotate', 'POST', { environment: 'production' })).status, 201);
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
