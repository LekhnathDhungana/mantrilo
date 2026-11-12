import test from 'node:test';
import assert from 'node:assert/strict';
import { createConsoleServer } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { hash, secret } from '../server/domain.mjs';
import { EmailCodes, Throttle, CODE_TTL_MS, RESEND_COOLDOWN_MS } from '../server/email-codes.mjs';

// Stands in for Firebase: an ID token is just "uid:<id>", and a custom token is its source.
class FakeSessions {
  sessions = new Map();
  accounts = new Map();
  deleted = [];
  update(change) {
    for (const session of this.sessions.values()) Object.assign(session, change);
  }
  async verificationToken(uid) {
    return `custom:${uid}`;
  }
  async signInToken(email) {
    if (!this.accounts.has(email)) this.accounts.set(email, `uid_${this.accounts.size + 1}`);
    return `uid:${this.accounts.get(email)}`;
  }
  async create(idToken) {
    const token = secret();
    this.sessions.set(token, {
      uid: idToken.slice(4),
      email: 'person@example.com',
      admin: idToken.endsWith('admin'),
      verified: true,
      authTime: Math.floor(Date.now() / 1000),
    });
    return token;
  }
  async get(token) {
    return this.sessions.get(token) || null;
  }
  async delete(token) {
    this.sessions.delete(token);
  }
  async deleteAccount(uid) {
    this.deleted.push(uid);
    for (const [token, session] of this.sessions)
      if (session.uid === uid) this.sessions.delete(token);
  }
}

async function fixture(t, options = {}) {
  const store = new MemoryStore(),
    sessions = new FakeSessions(),
    sent = [],
    clock = { now: 1_000_000 };
  const mailer = {
    send: async (to, code) => {
      if (options.mailFails) throw new Error('provider down');
      sent.push({ to, code });
    },
  };
  const server = createConsoleServer({
    store,
    sessions,
    mode: 'firebase',
    appOrigin: 'http://localhost:4190',
    staticRoot: '/tmp/nonexistent-console-test',
    emailCodes:
      options.emailCodes === null ? null : new EmailCodes(store, mailer, { now: () => clock.now }),
    ...(options.codeThrottle ? { codeThrottle: options.codeThrottle } : {}),
    ...(options.mailer ? { mailer: options.mailer } : {}),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`,
    jar = new Map();
  let csrf = '';
  async function call(path, method = 'GET', data) {
    if (method !== 'GET' && !csrf) csrf = (await call('/api/auth/csrf')).body.csrfToken;
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: 'http://localhost:4190',
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(method !== 'GET' ? { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [entry] = cookie.split(';'),
        index = entry.indexOf('=');
      jar.set(entry.slice(0, index), entry.slice(index + 1));
    }
    return { status: response.status, body: await response.json() };
  }
  const request = (email) => call('/api/auth/email/request', 'POST', { email }),
    verify = (email, code) => call('/api/auth/email/verify', 'POST', { email, code });
  async function signIn(email = 'person@example.com') {
    assert.equal((await request(email)).status, 200);
    const { body } = await verify(email, sent.at(-1).code);
    assert.equal((await call('/api/auth/session', 'POST', { idToken: body.token })).status, 200);
  }
  return { store, sessions, sent, clock, call, request, verify, signIn };
}

const wrongCode = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

test('a correct code signs in once, and only its hash is stored', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request(' Person@Example.com ')).status, 200);
  const { to, code } = f.sent[0];
  assert.equal(to, 'person@example.com');
  assert.equal(JSON.stringify([...f.store.authCodes]).includes(code), false);
  const ok = await f.verify('person@example.com', code);
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal((await f.verify('person@example.com', code)).body.error.code, 'code_expired');
});

test('five wrong codes lock it, even for the right code', async (t) => {
  const f = await fixture(t);
  await f.request('a@b.co');
  const { code } = f.sent[0],
    wrong = wrongCode(code);
  for (let i = 0; i < 4; i++)
    assert.equal((await f.verify('a@b.co', wrong)).body.error.code, 'code_wrong');
  assert.equal((await f.verify('a@b.co', wrong)).body.error.code, 'code_locked');
  assert.equal((await f.verify('a@b.co', code)).body.error.code, 'code_locked');
});

test('codes expire, resends cool down, and each email is capped per hour', async (t) => {
  const f = await fixture(t);
  await f.request('a@b.co');
  assert.equal((await f.request('a@b.co')).body.error.code, 'code_cooldown');
  f.clock.now += CODE_TTL_MS + 1;
  assert.equal((await f.verify('a@b.co', f.sent[0].code)).body.error.code, 'code_expired');
  const g = await fixture(t);
  for (let i = 0; i < 5; i++) {
    assert.equal((await g.request('a@b.co')).status, 200);
    g.clock.now += RESEND_COOLDOWN_MS;
  }
  assert.equal((await g.request('a@b.co')).body.error.code, 'too_many_codes');
});

test('one address cannot request codes without limit', async (t) => {
  const f = await fixture(t, { codeThrottle: new Throttle({ limit: 2, windowMs: 60_000 }) });
  await f.request('a@b.co');
  await f.request('b@b.co');
  assert.equal((await f.request('c@b.co')).body.error.code, 'too_many_requests');
});

test('email sign-in reports when it is unavailable or the provider fails', async (t) => {
  const off = await fixture(t, { emailCodes: null });
  assert.equal((await off.request('a@b.co')).body.error.code, 'email_unavailable');
  assert.equal((await off.call('/api/auth/config')).body.emailCodes, false);
  assert.equal((await off.call('/api/auth/config')).body.phoneCodes, false);
  const failing = await fixture(t, { mailFails: true });
  assert.equal((await failing.request('a@b.co')).body.error.code, 'email_failed');
  assert.equal(failing.store.authCodes.size, 0);
});

test('a first sign-in creates a Free workspace with a key and asks for onboarding once', async (t) => {
  const f = await fixture(t);
  await f.signIn();
  const first = await f.call('/api/me');
  assert.equal(first.status, 200);
  assert.equal(first.body.plan.name, 'Free');
  assert.equal(first.body.allowance.requests, 500);
  const [key] = first.body.workspace.keys;
  assert.equal(key.status, 'active');
  assert.equal((await f.store.findKey(hash(key.secret))).status, 'active');
  assert.equal(first.body.user.onboarded, false);
  const done = await f.call('/api/onboarding', 'POST', {
    name: 'Asha',
    workspaceName: 'Temple App',
    emailNotifications: true,
  });
  assert.equal(done.status, 200);
  const after = await f.call('/api/me');
  assert.equal(after.body.user.onboarded, true);
  assert.equal(after.body.user.name, 'Asha');
  assert.equal(after.body.workspace.name, 'Temple App');
  assert.equal(after.body.workspace.preferences.emailNotifications, true);
  assert.equal(after.body.workspace.preferences.usageAlertThreshold, 80);
});

test('deleting an account removes its workspace, keys and sessions', async (t) => {
  const f = await fixture(t);
  await f.signIn();
  const { body: me } = await f.call('/api/me');
  const raw = me.workspace.keys[0].secret;
  assert.ok(await f.store.findKey(hash(raw)));
  assert.equal(
    (await f.call('/api/account/delete', 'POST', { confirm: 'nope' })).body.error.code,
    'confirmation_required',
  );
  assert.equal((await f.call('/api/account/delete', 'POST', { confirm: 'DELETE' })).status, 200);
  assert.equal(await f.store.findKey(hash(raw)), null);
  assert.equal(await f.store.getWorkspace(`workspace_${me.user.uid}`), null);
  assert.deepEqual(f.sessions.deleted, [me.user.uid]);
  assert.equal((await f.call('/api/me')).status, 401);
});

test('administrators cannot delete their account from the console', async (t) => {
  const f = await fixture(t);
  const session = await f.call('/api/auth/session', 'POST', { idToken: 'uid:admin' });
  assert.equal(session.status, 200);
  await f.call('/api/me');
  const result = await f.call('/api/account/delete', 'POST', { confirm: 'DELETE' });
  assert.equal(result.body.error.code, 'admin_protected');
  assert.deepEqual(f.sessions.deleted, []);
});

test('unverified accounts still get a working key and can ask for a verification email', async (t) => {
  const f = await fixture(t);
  await f.signIn();
  assert.equal((await f.call('/api/me')).body.user.verified, true);
  assert.equal((await f.call('/api/auth/verification-token', 'POST')).status, 409);
  f.sessions.update({ verified: false });
  const { body: me } = await f.call('/api/me');
  assert.equal(me.user.verified, false);
  assert.ok(me.workspace.keys[0].secret);
  const token = await f.call('/api/auth/verification-token', 'POST');
  assert.equal(token.body.token, `custom:${me.user.uid}`);
});

test('regenerating the key emails the owner without exposing the secret', async (t) => {
  const notices = [],
    f = await fixture(t, {
      mailer: { sendKeyCreated: async (to, key) => notices.push({ to, key }) },
    });
  await f.signIn();
  await f.call('/api/me');
  assert.equal(notices.length, 0);
  const rotated = await f.call('/api/keys/rotate', 'POST', { environment: 'sandbox' });
  assert.equal(rotated.status, 201);
  const { keys } = (await f.call('/api/me')).body.workspace,
    current = keys.find((key) => key.status === 'active');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].to, 'person@example.com');
  assert.equal(notices[0].key.prefix, rotated.body.key.prefix);
  assert.ok(!JSON.stringify(notices).includes(current.secret));
  assert.ok(!JSON.stringify(rotated.body).includes(current.secret));
});

test('a failed key notice does not fail regeneration', async (t) => {
  const f = await fixture(t, {
    mailer: {
      sendKeyCreated: async () => {
        throw new Error('provider down');
      },
    },
  });
  await f.signIn();
  await f.call('/api/me');
  assert.equal((await f.call('/api/keys/rotate', 'POST', { environment: 'sandbox' })).status, 201);
});
