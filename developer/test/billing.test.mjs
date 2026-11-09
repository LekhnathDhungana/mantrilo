import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createConsoleServer } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { StripeBilling, createBilling } from '../server/billing.mjs';

const webhookSecret = 'whsec_test',
  prices = { Starter: 'price_s', Growth: 'price_g', Business: 'price_b' },
  webhooks = new Stripe('sk_test_unused').webhooks,
  workspaceId = 'workspace_u1';

const subscription = (overrides = {}) => ({
  id: 'sub_1',
  status: 'active',
  customer: 'cus_1',
  cancel_at: null,
  metadata: { workspaceId },
  items: { data: [{ price: { id: 'price_s' }, current_period_end: 1_800_000_000 }] },
  ...overrides,
});

class FakeStripe {
  webhooks = webhooks;
  subs = new Map();
  calls = { customers: [], checkouts: [], cancelled: [] };
  live = [];
  failCancel = false;
  customers = {
    create: async (params, options) => {
      this.calls.customers.push({ params, options });
      return { id: 'cus_1' };
    },
  };
  subscriptions = {
    list: async () => ({ data: this.live }),
    retrieve: async (id) => this.subs.get(id),
    cancel: async (id) => {
      if (this.failCancel) throw new Error('stripe down');
      this.calls.cancelled.push(id);
    },
  };
  checkout = {
    sessions: {
      create: async (params) => {
        this.calls.checkouts.push(params);
        return { url: 'https://checkout.stripe.test/s' };
      },
    },
  };
  billingPortal = {
    sessions: { create: async () => ({ url: 'https://billing.stripe.test/p' }) },
  };
}

class FakeSessions {
  deleted = [];
  session = {
    uid: 'u1',
    email: 'owner@example.com',
    admin: false,
    verified: true,
    authTime: Math.floor(Date.now() / 1000),
  };
  async get(token) {
    return token === 'session' ? this.session : null;
  }
  async deleteAccount(uid) {
    this.deleted.push(uid);
  }
}

async function fixture(t, { configured = true, secret = webhookSecret } = {}) {
  const store = new MemoryStore(),
    sessions = new FakeSessions(),
    stripe = new FakeStripe();
  await store.ensureWorkspace(workspaceId, 'u1', 'Acme');
  await store.putUser('u1', { workspaceId, role: 'owner' });
  const billing = configured
    ? new StripeBilling({
        stripe,
        webhookSecret: secret,
        prices,
        appOrigin: 'http://localhost:4190',
      })
    : null;
  const server = createConsoleServer({
    store,
    sessions,
    billing,
    mode: 'firebase',
    appOrigin: 'http://localhost:4190',
    staticRoot: '/tmp/nonexistent-console-test',
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const csrf = (await (await fetch(`${base}/api/auth/csrf`)).json()).csrfToken;
  const call = async (path, method = 'GET', data) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: 'http://localhost:4190',
        Cookie: `mantrilo_session=session; mantrilo_csrf=${csrf}`,
        ...(method === 'GET' ? {} : { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const post = async (event, signature) => {
    const payload = JSON.stringify({ id: 'evt_1', object: 'event', ...event });
    const response = await fetch(`${base}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Stripe-Signature':
          signature ?? webhooks.generateTestHeaderString({ payload, secret: webhookSecret }),
      },
      body: payload,
    });
    return { status: response.status, body: await response.json() };
  };
  const send = (sub, type = 'customer.subscription.updated') => {
    stripe.subs.set(sub.id, sub);
    return post({ type, data: { object: sub } });
  };
  const workspace = () => store.getWorkspace(workspaceId);
  return { store, sessions, stripe, call, post, send, workspace };
}

test('billing reports when it is off and refuses purchases', async (t) => {
  const f = await fixture(t, { configured: false });
  const { body } = await f.call('/api/billing');
  assert.equal(body.setupRequired, true);
  assert.deepEqual(body.purchasable, []);
  const checkout = await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  assert.equal(checkout.body.error.code, 'billing_unconfigured');
});

test('checkout uses the right price and tags the subscription with the workspace', async (t) => {
  const f = await fixture(t);
  const result = await f.call('/api/billing/checkout', 'POST', { plan: 'Growth' });
  assert.equal(result.body.url, 'https://checkout.stripe.test/s');
  const [params] = f.stripe.calls.checkouts;
  assert.deepEqual(params.line_items, [{ price: 'price_g', quantity: 1 }]);
  assert.equal(params.mode, 'subscription');
  assert.equal(params.customer, 'cus_1');
  assert.deepEqual(params.subscription_data.metadata, { workspaceId });
  assert.equal((await f.workspace()).billing.customerId, 'cus_1');
  assert.equal((await f.workspace()).plan, 'Sandbox');
  await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  assert.equal(f.stripe.calls.customers.length, 1);
});

test('checkout rejects bad plans, unverified accounts and existing subscribers', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.call('/api/billing/checkout', 'POST', { plan: 'Sandbox' })).body.error.code,
    'invalid_plan',
  );
  f.sessions.session.verified = false;
  assert.equal(
    (await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' })).body.error.code,
    'email_unverified',
  );
  f.sessions.session.verified = true;
  await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  f.stripe.live = [subscription()];
  assert.equal(
    (await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' })).body.error.code,
    'already_subscribed',
  );
  assert.equal(f.stripe.calls.checkouts.length, 1);
});

test('an unsigned or forged webhook changes nothing', async (t) => {
  const f = await fixture(t);
  f.stripe.subs.set('sub_1', subscription());
  const event = { type: 'customer.subscription.updated', data: { object: subscription() } };
  for (const signature of ['', 't=1,v1=forged'])
    assert.equal((await f.post(event, signature)).body.error.code, 'invalid_signature');
  assert.equal((await f.workspace()).plan, 'Sandbox');
});

test('a paid subscription unlocks the plan and production keys', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.call('/api/keys', 'POST', { name: 'L', environment: 'production' })).status,
    403,
  );
  assert.equal((await f.send(subscription())).status, 200);
  const w = await f.workspace();
  assert.equal(w.plan, 'Starter');
  assert.equal(w.billing.subscriptionId, 'sub_1');
  assert.equal(w.billing.currentPeriodEnd, new Date(1_800_000_000_000).toISOString());
  assert.equal(
    (await f.call('/api/keys', 'POST', { name: 'L', environment: 'production' })).status,
    201,
  );
});

test('checkout completion reads the subscription from Stripe', async (t) => {
  const f = await fixture(t);
  f.stripe.subs.set('sub_1', subscription());
  await f.post({
    type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', subscription: 'sub_1' } },
  });
  assert.equal((await f.workspace()).plan, 'Starter');
});

test('the plan follows upgrades, failed payments and cancellation', async (t) => {
  const f = await fixture(t);
  await f.send(subscription());
  const growth = { data: [{ price: { id: 'price_g' }, current_period_end: 1_800_000_000 }] };
  await f.send(subscription({ items: growth }));
  assert.equal((await f.workspace()).plan, 'Growth');
  await f.send(subscription({ items: growth, status: 'past_due' }));
  assert.equal((await f.workspace()).plan, 'Growth');
  await f.send(subscription({ items: growth, cancel_at: 1_800_000_000 }));
  assert.ok((await f.workspace()).billing.cancelsAt);
  await f.send(
    subscription({ items: growth, status: 'canceled' }),
    'customer.subscription.deleted',
  );
  const ended = await f.workspace();
  assert.equal(ended.plan, 'Sandbox');
  assert.equal(ended.billing.status, 'canceled');
});

test('an unpaid first attempt grants nothing, and old subscriptions cannot downgrade', async (t) => {
  const f = await fixture(t);
  await f.send(subscription({ status: 'incomplete' }));
  assert.equal((await f.workspace()).plan, 'Sandbox');
  await f.send(subscription({ id: 'sub_new' }));
  await f.send(subscription({ id: 'sub_old', status: 'canceled' }));
  assert.equal((await f.workspace()).plan, 'Starter');
  assert.equal((await f.workspace()).billing.subscriptionId, 'sub_new');
});

test('other products and deleted workspaces are acknowledged and ignored', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.send(subscription({ metadata: {} }))).status, 200);
  assert.equal((await f.workspace()).plan, 'Sandbox');
  assert.equal((await f.send(subscription({ metadata: { workspaceId: 'gone' } }))).status, 200);
});

test('an unconfigured price fails so Stripe retries, and leaves the plan alone', async (t) => {
  const f = await fixture(t);
  const items = { data: [{ price: { id: 'price_unknown' }, current_period_end: 1 }] };
  assert.equal((await f.send(subscription({ items }))).status, 500);
  assert.equal((await f.workspace()).plan, 'Sandbox');
});

test('the portal needs a billing account', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call('/api/billing/portal', 'POST')).body.error.code, 'no_subscription');
  await f.send(subscription());
  assert.equal(
    (await f.call('/api/billing/portal', 'POST')).body.url,
    'https://billing.stripe.test/p',
  );
});

test('deleting an account cancels its subscription first', async (t) => {
  const f = await fixture(t);
  await f.send(subscription());
  f.stripe.failCancel = true;
  const failed = await f.call('/api/account/delete', 'POST', { confirm: 'DELETE' });
  assert.equal(failed.status, 500);
  assert.ok(await f.workspace());
  assert.deepEqual(f.sessions.deleted, []);
  f.stripe.failCancel = false;
  assert.equal((await f.call('/api/account/delete', 'POST', { confirm: 'DELETE' })).status, 200);
  assert.deepEqual(f.stripe.calls.cancelled, ['sub_1']);
  assert.deepEqual(f.sessions.deleted, ['u1']);
});

test('without a webhook, returning to Billing activates what Stripe says was paid', async (t) => {
  const f = await fixture(t, { secret: null });
  const event = { type: 'customer.subscription.updated', data: { object: subscription() } };
  assert.equal((await f.post(event, 'x')).status, 503);
  assert.equal((await f.call('/api/billing/sync', 'POST')).status, 200);
  assert.equal((await f.workspace()).plan, 'Sandbox');
  await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Sandbox');
  f.stripe.live = [subscription()];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Starter');
  assert.equal((await f.workspace()).billing.status, 'active');
});

test('sync ignores other products and unpaid attempts, and notices cancellations', async (t) => {
  const f = await fixture(t, { secret: null });
  await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  f.stripe.live = [subscription({ id: 'sub_other', metadata: {} })];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Sandbox');
  f.stripe.live = [subscription({ id: 'sub_try', status: 'incomplete' })];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Sandbox');
  f.stripe.live = [subscription()];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Starter');
  f.stripe.live = [
    subscription({ id: 'sub_expired', status: 'incomplete_expired' }),
    subscription({ status: 'canceled' }),
  ];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Sandbox');
});

test('billing stays off until it is fully configured', () => {
  assert.equal(createBilling({}, 'http://x'), null);
  const error = console.error;
  console.error = () => {};
  try {
    assert.equal(createBilling({ STRIPE_SECRET_KEY: 'sk_test_x' }, 'http://x'), null);
  } finally {
    console.error = error;
  }
  assert.ok(
    createBilling(
      {
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_PRICE_STARTER: 'a',
        STRIPE_PRICE_GROWTH: 'b',
        STRIPE_PRICE_BUSINESS: 'c',
      },
      'http://x',
    ),
  );
});
