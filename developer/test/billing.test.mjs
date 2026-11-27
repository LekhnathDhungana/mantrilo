import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createConsoleServer } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { StripeBilling, amountCents, createBilling, stripeModeOf } from '../server/billing.mjs';
import contentPlans from '../../shared/content-plans.json' with { type: 'json' };
import indiaPrices from '../../shared/india-prices.json' with { type: 'json' };
import indiaAnnualPrices from '../../shared/india-annual-prices.json' with { type: 'json' };
import indiaAnnualTotals from '../../shared/india-annual-totals.json' with { type: 'json' };

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
  items: { data: [{ id: 'si_1', price: { id: 'price_s' }, current_period_end: 1_800_000_000 }] },
  ...overrides,
});

class FakeStripe {
  webhooks = webhooks;
  subs = new Map();
  calls = { customers: [], checkouts: [], portal: [], cancelled: [] };
  live = [];
  failCancel = false;
  priceOverrides = {};
  merchantName = 'Mantrilo';
  accounts = {
    retrieve: async () => ({
      business_profile: { name: this.merchantName },
      settings: {
        branding: {
          logo: 'file_logo',
          icon: 'file_icon',
          primary_color: '#ffffff',
          secondary_color: '#f28c28',
        },
      },
    }),
  };
  prices = {
    retrieve: async (id) => ({
      active: true,
      livemode: this.mode === 'live',
      currency: 'usd',
      unit_amount: { price_s: 4999, price_g: 14900, price_b: 39900 }[id],
      recurring: { interval: 'month', interval_count: 1 },
      ...this.priceOverrides[id],
    }),
  };
  uploaded = [];
  files = {
    retrieve: async (id) => ({
      filename: id === 'file_logo' ? 'mantrilo-logo.png' : 'mantrilo-icon.png',
    }),
    list: async ({ purpose }) => ({ data: this.uploaded.filter((f) => f.purpose === purpose) }),
    create: async ({ purpose, file }) => {
      const stored = { id: `file_${this.uploaded.length + 1}`, purpose, filename: file.name };
      this.uploaded.push(stored);
      return stored;
    },
  };
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
        const price = params.line_items[0].price;
        if (price === 'price_in_s')
          return { id: 'cs_1', url: 'https://checkout.stripe.test/s', currency: 'inr', amount_subtotal: 149900 };
        const subtotal = { price_s: 4999, price_g: 14900, price_b: 39900 }[
          price
        ];
        return {
          id: 'cs_1',
          url: 'https://checkout.stripe.test/s',
          ...(params.discounts && {
            currency: 'usd',
            amount_total: this.discountedTotal ?? 99,
            amount_subtotal: subtotal,
            total_details: { amount_discount: subtotal - 99 },
          }),
        };
      },
      expire: async (id) => {
        this.expiredCheckout = id;
      },
    },
  };
  billingPortal = {
    configurations: {
      retrieve: async () => ({
        active: true,
        is_default: false,
        livemode: this.mode === 'live',
        business_profile: { headline: 'Mantrilo Customer Portal' },
      }),
    },
    sessions: {
      create: async (params) => {
        this.calls.portal.push(params);
        return { url: 'https://billing.stripe.test/p' };
      },
    },
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

async function fixture(
  t,
  {
    configured = true,
    secret = webhookSecret,
    mode = 'live',
    portalConfiguration = 'bpc_mantrilo',
    promotionIds,
    indiaPrices,
    annualPrices,
    indiaAnnualPrices,
  } = {},
) {
  const store = new MemoryStore(),
    sessions = new FakeSessions(),
    stripe = new FakeStripe();
  stripe.mode = mode;
  await store.ensureWorkspace(workspaceId, 'u1', 'Acme');
  await store.putUser('u1', { workspaceId, role: 'owner' });
  const billing = configured
    ? new StripeBilling({
        stripe,
        webhookSecret: secret,
        prices,
        appOrigin: 'http://localhost:4190',
        mode,
        portalConfiguration,
        promotionIds,
        indiaPrices,
        annualPrices,
        indiaAnnualPrices,
      })
    : null;
  const server = createConsoleServer({
    store,
    sessions,
    billing,
    billingMode: mode,
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
    const payload = JSON.stringify({
      id: 'evt_1',
      object: 'event',
      livemode: mode === 'live',
      ...event,
    });
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

test('India checkout requires verified eligibility and the INR price grants the matching plan', async (t) => {
  const f = await fixture(t, { indiaPrices: { Starter: 'price_in_s' } });
  f.stripe.priceOverrides.price_in_s = { currency: 'inr', unit_amount: 149900 };
  const route = '/api/billing/checkout';
  const request = { market: 'IN', plan: 'Starter' };
  assert.equal((await f.call(route, 'POST', request)).status, 403);
  assert.equal(f.stripe.calls.checkouts.length, 0);
  await f.store.transact(workspaceId, (workspace) => { workspace.indiaPricing = true; });
  assert.deepEqual((await f.call('/api/billing')).body.indiaPurchasable, ['Starter']);
  assert.equal((await f.call(route, 'POST', { ...request, plan: 'Business' })).status, 400);
  assert.equal((await f.call(route, 'POST', { ...request, promotionCode: 'STARTER99' })).status, 400);
  assert.equal((await f.call(route, 'POST', request)).status, 200);
  assert.equal(f.stripe.calls.checkouts[0].line_items[0].price, 'price_in_s');
  assert.equal(f.stripe.calls.checkouts[0].billing_address_collection, 'required');
  await f.send(subscription({ items: { data: [{ id: 'si_1', price: { id: 'price_in_s', currency: 'inr' } }] } }));
  const workspace = await f.workspace();
  assert.equal(workspace.plan, 'Starter');
  assert.equal(workspace.billing.currency, 'inr');
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
  assert.equal((await f.workspace()).plan, 'Free');
  await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  assert.equal(f.stripe.calls.customers.length, 1);
});

test('STARTER99 applies a plan-specific discount and verifies the first-month amount', async (t) => {
  const promotionIds = {
    Starter: 'promo_starter99',
    Growth: 'promo_growth99',
    Business: 'promo_business99',
  };
  const f = await fixture(t, { promotionIds });
  assert.deepEqual((await f.call('/api/billing')).body.promotionPlans, Object.keys(promotionIds));
  const checkout = (plan, promotionCode) =>
    f.call('/api/billing/checkout', 'POST', { plan, promotionCode });
  assert.equal((await checkout('Starter', 'OTHER')).status, 400);
  assert.equal(f.stripe.calls.customers.length, 0);
  for (const plan of Object.keys(promotionIds)) {
    assert.equal((await checkout(plan, 'starter99')).status, 200);
    assert.deepEqual(f.stripe.calls.checkouts.at(-1).discounts, [
      { promotion_code: promotionIds[plan] },
    ]);
    assert.deepEqual(f.stripe.calls.checkouts.at(-1).line_items, [
      { price: prices[plan], quantity: 1 },
    ]);
  }
  assert.equal((await f.workspace()).plan, 'Free');
  f.stripe.discountedTotal = 39900;
  const wrongAmount = await checkout('Business', 'STARTER99');
  assert.equal(wrongAmount.status, 503);
  assert.equal(wrongAmount.body.error.code, 'promotion_price_mismatch');
  assert.equal(wrongAmount.body.url, undefined);
  assert.equal(f.stripe.expiredCheckout, 'cs_1');
});

test('checkout rejects bad plans, unverified accounts and existing subscribers', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.call('/api/billing/checkout', 'POST', { plan: 'Free' })).body.error.code,
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
  assert.equal((await f.workspace()).plan, 'Free');
});

test('a paid subscription raises the quota and adds a live key', async (t) => {
  const f = await fixture(t);
  const before = (await f.call('/api/me')).body,
    active = (me) => me.workspace.keys.filter((k) => k.status === 'active'),
    sandbox = active(before)[0].secret;
  assert.deepEqual(
    active(before).map((k) => k.environment),
    ['sandbox'],
  );
  assert.equal(before.allowance.requests, 500);
  const early = await f.call('/api/keys/rotate', 'POST', { environment: 'production' });
  assert.equal(early.body.error.code, 'production_plan_required');
  assert.equal((await f.send(subscription())).status, 200);
  const w = await f.workspace();
  assert.equal(w.plan, 'Starter');
  assert.equal(w.billing.subscriptionId, 'sub_1');
  assert.equal(w.billing.currentPeriodEnd, new Date(1_800_000_000_000).toISOString());
  const after = (await f.call('/api/me')).body;
  assert.equal(after.allowance.requests, 50_000);
  const keys = active(after);
  assert.deepEqual(
    keys.map((k) => k.environment),
    ['sandbox', 'production'],
  );
  assert.equal(keys[0].secret, sandbox);
  assert.match(keys[1].secret, /^mtr_live_[\w-]{49}$/);
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
  assert.equal(ended.plan, 'Free');
  assert.equal(ended.billing.status, 'canceled');
});

test('an unpaid first attempt grants nothing, and old subscriptions cannot downgrade', async (t) => {
  const f = await fixture(t);
  await f.send(subscription({ status: 'incomplete' }));
  assert.equal((await f.workspace()).plan, 'Free');
  await f.send(subscription({ id: 'sub_new' }));
  await f.send(subscription({ id: 'sub_old', status: 'canceled' }));
  assert.equal((await f.workspace()).plan, 'Starter');
  assert.equal((await f.workspace()).billing.subscriptionId, 'sub_new');
});

test('other products and deleted workspaces are acknowledged and ignored', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.send(subscription({ metadata: {} }))).status, 200);
  assert.equal((await f.workspace()).plan, 'Free');
  assert.equal((await f.send(subscription({ metadata: { workspaceId: 'gone' } }))).status, 200);
});

test('an unconfigured price fails so Stripe retries, and leaves the plan alone', async (t) => {
  const f = await fixture(t);
  const items = { data: [{ price: { id: 'price_unknown' }, current_period_end: 1 }] };
  assert.equal((await f.send(subscription({ items }))).status, 500);
  assert.equal((await f.workspace()).plan, 'Free');
});

test('the portal needs a billing account', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call('/api/billing/portal', 'POST')).body.error.code, 'no_subscription');
  await f.send(subscription());
  assert.equal(
    (await f.call('/api/billing/portal', 'POST')).body.url,
    'https://billing.stripe.test/p',
  );
  assert.equal(f.stripe.calls.portal[0].configuration, 'bpc_mantrilo');
});

test('billing refuses portal sessions without a dedicated Mantrilo brand', async (t) => {
  for (const setup of [{ portalConfiguration: null }, {}]) {
    const f = await fixture(t, setup);
    f.stripe.merchantName = 'Other business';
    await f.send(subscription());
    f.stripe.live = [subscription()];
    assert.equal((await f.call('/api/billing')).body.portalAvailable, false);
    assert.equal(
      (await f.call('/api/billing/portal', 'POST')).body.error.code,
      'portal_branding_unavailable',
    );
    assert.equal(
      (await f.call('/api/billing/portal', 'POST', { plan: 'Free' })).body.error.code,
      'portal_branding_unavailable',
    );
    assert.equal(f.stripe.calls.portal.length, 0);
  }
});

test('plan buttons open Stripe for the chosen price or cancellation without changing entitlement', async (t) => {
  const f = await fixture(t);
  const current = subscription();
  await f.send(current);
  f.stripe.live = [subscription({ id: 'sub_other', metadata: {} }), current];
  for (const [plan, price] of [
    ['Growth', 'price_g'],
    ['Business', 'price_b'],
  ]) {
    const result = await f.call('/api/billing/portal', 'POST', { plan });
    assert.equal(result.body.url, 'https://billing.stripe.test/p');
    const { customer, flow_data: flow } = f.stripe.calls.portal.at(-1);
    assert.equal(customer, 'cus_1');
    assert.equal(flow.type, 'subscription_update_confirm');
    assert.deepEqual(flow.subscription_update_confirm, {
      subscription: 'sub_1',
      items: [{ id: 'si_1', price, quantity: 1 }],
    });
  }
  assert.equal((await f.call('/api/billing/portal', 'POST', { plan: 'Free' })).status, 200);
  const { flow_data: cancel } = f.stripe.calls.portal.at(-1);
  assert.equal(cancel.type, 'subscription_cancel');
  assert.equal(cancel.subscription_cancel.subscription, 'sub_1');
  assert.equal((await f.workspace()).plan, 'Starter');
  assert.equal(f.stripe.calls.checkouts.length, 0);
  assert.equal(f.stripe.calls.cancelled.length, 0);
});

test('incorrect prices and subscriptions belonging to another workspace cannot open plan links', async (t) => {
  const f = await fixture(t);
  f.stripe.priceOverrides.price_g = { unit_amount: 100 };
  const purchase = await f.call('/api/billing/checkout', 'POST', { plan: 'Growth' });
  assert.equal(purchase.body.error.code, 'plan_unavailable');
  assert.equal(f.stripe.calls.checkouts.length, 0);
  await f.send(subscription());
  f.stripe.live = [subscription({ metadata: { workspaceId: 'other' } })];
  const unauthorized = await f.call('/api/billing/portal', 'POST', { plan: 'Growth' });
  assert.equal(unauthorized.body.error.code, 'no_subscription');
  f.stripe.live = [subscription()];
  const switchPlan = await f.call('/api/billing/portal', 'POST', { plan: 'Growth' });
  assert.equal(switchPlan.body.error.code, 'plan_unavailable');
  assert.equal(f.stripe.calls.portal.length, 0);
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
  assert.equal((await f.workspace()).plan, 'Free');
  await f.call('/api/billing/checkout', 'POST', { plan: 'Starter' });
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Free');
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
  assert.equal((await f.workspace()).plan, 'Free');
  f.stripe.live = [subscription({ id: 'sub_try', status: 'incomplete' })];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Free');
  f.stripe.live = [subscription()];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Starter');
  f.stripe.live = [
    subscription({ id: 'sub_expired', status: 'incomplete_expired' }),
    subscription({ status: 'canceled' }),
  ];
  await f.call('/api/billing/sync', 'POST');
  assert.equal((await f.workspace()).plan, 'Free');
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

test('a replayed webhook changes nothing the second time and never touches usage', async (t) => {
  const f = await fixture(t);
  await f.store.recordApiUsage({
    workspaceId,
    keyId: 'k',
    lane: 'live',
    endpoint: 'mantras.list',
    requests: 7,
    audioBytes: 0,
    period: new Date().toISOString().slice(0, 7),
    at: new Date(),
  });
  for (let i = 0; i < 3; i++) assert.equal((await f.send(subscription())).status, 200);
  for (let i = 0; i < 2; i++)
    await f.post({
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', subscription: 'sub_1' } },
    });
  const w = await f.workspace();
  assert.equal(w.plan, 'Starter');
  assert.equal(w.logs.filter((l) => l.type === 'billing').length, 1);
  const me = (await f.call('/api/me')).body;
  assert.equal(me.usage.contentRequests, 7);
  assert.equal(me.workspace.keys.filter((k) => k.environment === 'production').length, 1);
  await f.send(subscription());
  const again = (await f.call('/api/me')).body;
  assert.equal(again.usage.contentRequests, 7);
  assert.equal(again.workspace.keys.filter((k) => k.environment === 'production').length, 1);
});

test('test-mode payments never unlock live access, and live ones never unlock test access', async (t) => {
  const live = await fixture(t);
  // A sandbox subscription, or an event from the sandbox, reaching the live console is ignored.
  assert.equal((await live.send(subscription({ livemode: false }))).status, 200);
  live.stripe.subs.set('sub_1', subscription());
  await live.post({
    type: 'customer.subscription.updated',
    livemode: false,
    data: { object: subscription() },
  });
  assert.equal((await live.workspace()).plan, 'Free');
  assert.equal((await live.call('/api/me')).body.plan.name, 'Free');

  const sandbox = await fixture(t, { mode: 'test' });
  assert.equal((await sandbox.send(subscription({ livemode: true }))).status, 200);
  assert.equal((await sandbox.workspace()).testPlan, undefined);
  assert.equal((await sandbox.send(subscription({ livemode: false }))).status, 200);
  const w = await sandbox.workspace();
  assert.equal(w.testPlan, 'Starter');
  assert.equal(w.testBilling.livemode, false);
  assert.equal(w.plan, 'Free'); // the live entitlement is untouched
  assert.equal(w.billing, undefined);
  const me = (await sandbox.call('/api/me')).body;
  assert.equal(me.plan.name, 'Starter');
  assert.equal(me.billingMode, 'test');
  assert.equal(me.workspace.testPlan, undefined); // never sent to the browser
});

test('billing records from before modes existed move to test mode', async (t) => {
  const f = await fixture(t);
  await f.store.transact(workspaceId, (w) => {
    w.plan = 'Starter';
    w.billing = { customerId: 'cus_1', subscriptionId: 'sub_1', status: 'active' };
  });
  const me = (await f.call('/api/me')).body;
  assert.equal(me.plan.name, 'Free');
  const w = await f.workspace();
  assert.equal(w.testPlan, 'Starter');
  assert.equal(w.testBilling.livemode, false);
  assert.equal(w.billing, undefined);
});

test('the Stripe key decides the mode, and prices are checked against the plans', async () => {
  assert.equal(stripeModeOf('sk_live_x'), 'live');
  assert.equal(stripeModeOf('rk_live_x'), 'live');
  assert.equal(stripeModeOf('sk_test_x'), 'test');
  const price = (unit_amount, extra = {}) => ({
    active: true,
    livemode: false,
    currency: 'usd',
    unit_amount,
    recurring: { interval: 'month', interval_count: 1 },
    ...extra,
  });
  const stored = {
    price_s: price(4900),
    price_g: price(14900),
    price_b: price(39900, { recurring: { interval: 'year', interval_count: 1 } }),
  };
  const billing = new StripeBilling({
    stripe: { prices: { retrieve: async (id) => stored[id] } },
    prices,
    appOrigin: 'http://x',
    mode: 'test',
  });
  assert.deepEqual(await billing.verifyPrices(), [
    'Starter: Stripe charges $49.00, plans list $49.99',
    'Business: not a monthly subscription price',
  ]);
});

test('checkout carries Mantrilo branding and reuses the uploaded logo', async () => {
  const stripe = new FakeStripe();
  const billing = new StripeBilling({ stripe, prices, appOrigin: 'http://x', mode: 'test' });
  await billing.checkoutUrl({ workspaceId, customerId: 'cus_1', plan: 'Growth' });
  const branding = stripe.calls.checkouts[0].branding_settings;
  assert.equal(branding.display_name, 'Mantrilo');
  assert.equal(branding.logo.file, stripe.uploaded.find((f) => f.purpose === 'business_logo').id);
  assert.equal(branding.icon.file, stripe.uploaded.find((f) => f.purpose === 'business_icon').id);
  // A restarted server finds the logo already in Stripe instead of uploading it again.
  const restarted = new StripeBilling({ stripe, prices, appOrigin: 'http://x', mode: 'test' });
  await restarted.checkoutUrl({ workspaceId, customerId: 'cus_1', plan: 'Growth' });
  assert.equal(stripe.uploaded.length, 2);
  assert.deepEqual(stripe.calls.checkouts[1].branding_settings, branding);
});

test('checkout refuses to fall back to account branding when Stripe rejects Mantrilo assets', async () => {
  const stripe = new FakeStripe();
  const create = stripe.checkout.sessions.create;
  stripe.checkout.sessions.create = async (params) => {
    if (params.branding_settings)
      throw Object.assign(new Error('bad'), { param: 'branding_settings[logo]' });
    return create(params);
  };
  const billing = new StripeBilling({ stripe, prices, appOrigin: 'http://x', mode: 'test' });
  await assert.rejects(billing.checkoutUrl({ workspaceId, customerId: 'cus_1', plan: 'Growth' }), {
    code: 'checkout_branding_unavailable',
  });
  assert.equal(stripe.calls.checkouts.length, 0);
});

test('a verified price is not fetched again; a failing one is', async () => {
  const stripe = new FakeStripe();
  let reads = 0;
  const retrieve = stripe.prices.retrieve;
  stripe.prices.retrieve = async (id) => (reads++, retrieve(id));
  const billing = new StripeBilling({ stripe, prices, appOrigin: 'http://x', mode: 'test' });
  await billing.requirePlanPrice('Growth');
  await billing.requirePlanPrice('Growth');
  assert.equal(reads, 1);
  stripe.priceOverrides.price_s = { active: false };
  await assert.rejects(billing.requirePlanPrice('Starter'), { code: 'plan_unavailable' });
  assert.deepEqual(await billing.availablePlans(), ['Growth', 'Business']);
  stripe.priceOverrides.price_s = {};
  assert.deepEqual(await billing.availablePlans(), ['Starter', 'Growth', 'Business']);
  await billing.requirePlanPrice('Starter');
  assert.equal(reads, 5);
});

// Yearly prices charge each plan's annualTotal: $479.99, $1,429.99 and $3,829.99.
const annualPrices = { Starter: 'price_s_y', Growth: 'price_g_y', Business: 'price_b_y' };
function yearlyPrices(stripe) {
  for (const [id, unit_amount] of Object.entries({
    price_s_y: 47999,
    price_g_y: 142999,
    price_b_y: 382999,
  }))
    stripe.priceOverrides[id] = { unit_amount, recurring: { interval: 'year', interval_count: 1 } };
}

test('annual checkout uses the yearly price and refuses promo codes and unknown intervals', async (t) => {
  const f = await fixture(t, {
    annualPrices,
    promotionIds: { Starter: 'promo_s' },
  });
  yearlyPrices(f.stripe);
  const { body } = await f.call('/api/billing');
  assert.deepEqual(body.annualPurchasable, ['Starter', 'Growth', 'Business']);
  const route = '/api/billing/checkout';
  const result = await f.call(route, 'POST', { plan: 'Growth', interval: 'year' });
  assert.equal(result.status, 200);
  const [params] = f.stripe.calls.checkouts;
  assert.deepEqual(params.line_items, [{ price: 'price_g_y', quantity: 1 }]);
  assert.match(params.cancel_url, /interval=year/);
  const promo = await f.call(route, 'POST', {
    plan: 'Starter',
    interval: 'year',
    promotionCode: 'STARTER99',
  });
  assert.equal(promo.body.error.code, 'invalid_promotion_code');
  const weekly = await f.call(route, 'POST', { plan: 'Starter', interval: 'week' });
  assert.equal(weekly.body.error.code, 'invalid_interval');
  assert.equal(f.stripe.calls.checkouts.length, 1);
  // Monthly checkout is unchanged.
  await f.call(route, 'POST', { plan: 'Starter' });
  assert.equal(f.stripe.calls.checkouts[1].line_items[0].price, 'price_s');
});

test('annual checkout is unavailable until yearly prices are configured and correct', async (t) => {
  const off = await fixture(t);
  assert.deepEqual((await off.call('/api/billing')).body.annualPurchasable, []);
  const missing = await off.call('/api/billing/checkout', 'POST', { plan: 'Growth', interval: 'year' });
  assert.equal(missing.body.error.code, 'plan_unavailable');
  assert.equal(off.stripe.calls.checkouts.length, 0);

  const f = await fixture(t, { annualPrices });
  yearlyPrices(f.stripe);
  // A monthly price configured as annual, and a yearly price at the undiscounted amount.
  f.stripe.priceOverrides.price_s_y = { unit_amount: 47999 };
  f.stripe.priceOverrides.price_g_y = {
    unit_amount: 178800,
    recurring: { interval: 'year', interval_count: 1 },
  };
  assert.deepEqual((await f.call('/api/billing')).body.annualPurchasable, ['Business']);
  for (const plan of ['Starter', 'Growth']) {
    const result = await f.call('/api/billing/checkout', 'POST', { plan, interval: 'year' });
    assert.equal(result.body.error.code, 'plan_unavailable');
  }
  assert.equal(f.stripe.calls.checkouts.length, 0);
});

test('an annual subscription grants its plan, reports its interval and changes plan within annual', async (t) => {
  const f = await fixture(t, { annualPrices });
  yearlyPrices(f.stripe);
  const annual = subscription({
    items: {
      data: [{ id: 'si_1', price: { id: 'price_g_y', currency: 'usd', recurring: { interval: 'year' } } }],
    },
  });
  await f.send(annual);
  assert.equal((await f.workspace()).plan, 'Growth');
  const { body } = await f.call('/api/billing');
  assert.equal(body.interval, 'year');
  assert.equal(body.monthlyTotal, 119);
  f.stripe.live = [annual];
  assert.equal((await f.call('/api/billing/portal', 'POST', { plan: 'Business' })).status, 200);
  assert.deepEqual(f.stripe.calls.portal.at(-1).flow_data.subscription_update_confirm.items, [
    { id: 'si_1', price: 'price_b_y', quantity: 1 },
  ]);
  const same = await f.call('/api/billing/portal', 'POST', { plan: 'Growth' });
  assert.equal(same.body.error.code, 'already_on_plan');
});

test('India annual checkout uses the yearly INR price', async (t) => {
  const f = await fixture(t, { indiaAnnualPrices: { Starter: 'price_in_s_y' } });
  f.stripe.priceOverrides.price_in_s_y = {
    currency: 'inr',
    unit_amount: 1439900,
    recurring: { interval: 'year', interval_count: 1 },
  };
  const create = f.stripe.checkout.sessions.create;
  f.stripe.checkout.sessions.create = async (params) => ({
    ...(await create(params)),
    currency: 'inr',
    amount_subtotal: 1439900,
  });
  await f.store.transact(workspaceId, (workspace) => {
    workspace.indiaPricing = true;
  });
  assert.deepEqual((await f.call('/api/billing')).body.indiaAnnualPurchasable, ['Starter']);
  const request = { plan: 'Starter', market: 'IN', interval: 'year' };
  assert.equal((await f.call('/api/billing/checkout', 'POST', request)).status, 200);
  assert.equal(f.stripe.calls.checkouts[0].line_items[0].price, 'price_in_s_y');
});

test('annual price ids are read from the environment when set', () => {
  const billing = createBilling(
    {
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_PRICE_STARTER: 'a',
      STRIPE_PRICE_GROWTH: 'b',
      STRIPE_PRICE_BUSINESS: 'c',
      STRIPE_PRICE_GROWTH_ANNUAL: ' b_y ',
      STRIPE_IN_PRICE_STARTER_ANNUAL: 'in_a_y',
    },
    'http://x',
  );
  assert.deepEqual(billing.annualPrices, { Growth: 'b_y' });
  assert.deepEqual(billing.indiaAnnualPrices, { Starter: 'in_a_y' });
  assert.equal(billing.planFor('b_y'), 'Growth');
  assert.equal(billing.intervalFor('b_y'), 'year');
  assert.equal(billing.intervalFor('b'), 'month');
});

// The yearly totals are rounded up by hand, so check they still honour "save 20%" (within 1%)
// and that the per-month figure shown beside each is that total spread over twelve months.
test('yearly totals are about 20% off and match the advertised per-month price', () => {
  const rows = [
    ...contentPlans.map((p) => [p.name, p.price, p.annualPrice, p.annualTotal, undefined]),
    ...Object.keys(indiaAnnualTotals).map((name) => [
      name,
      indiaPrices[name],
      indiaAnnualPrices[name],
      indiaAnnualTotals[name],
      'IN',
    ]),
  ];
  for (const [name, monthly, perMonth, total, market] of rows) {
    if (!monthly || total === null) continue;
    const label = `${name}${market ? ' (India)' : ''}`;
    const saving = 1 - total / (monthly * 12);
    assert.ok(saving >= 0.19 && saving <= 0.21, `${label} saves ${(saving * 100).toFixed(1)}%`);
    assert.equal(Math.floor((total / 12) * 100) / 100 >= perMonth, true, `${label} per month`);
    assert.ok(total / 12 - perMonth < 1, `${label} per month is within a unit of the total`);
    assert.equal(amountCents(name, market, 'year'), Math.round(total * 100));
  }
});
