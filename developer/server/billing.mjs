import Stripe from 'stripe';
import {
  ApiError,
  FREE_PLAN,
  billingFor,
  getPlan,
  log,
  planFor,
  setEntitlement,
} from './domain.mjs';

// past_due keeps access while Stripe retries the card; its retry settings decide when it ends.
export const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);
const ENDED_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired', 'paused']);
export const PAID_PLANS = ['Starter', 'Growth', 'Business'];
const REQUIRED_ENV = PAID_PLANS.map(priceVariable);

function priceVariable(plan) {
  return `STRIPE_PRICE_${plan.toUpperCase()}`;
}
const isoDate = (seconds) => (seconds ? new Date(seconds * 1000).toISOString() : null);
// sk_test_/rk_test_ keys belong to a sandbox or test mode; sk_live_/rk_live_ to live mode.
export const stripeModeOf = (secretKey) => (/^[sr]k_live_/.test(secretKey) ? 'live' : 'test');

export class StripeBilling {
  constructor({ stripe, webhookSecret, prices, appOrigin, mode = 'live' }) {
    Object.assign(this, { stripe, webhookSecret, prices, appOrigin, mode });
  }
  // Checks each configured price against shared/content-plans.json: it must exist, be active,
  // recur monthly in USD, and cost what the plan says. Returns a list of problems (empty if none).
  async verifyPrices() {
    const problems = [];
    for (const [name, id] of Object.entries(this.prices)) {
      const expected = Math.round(getPlan(name).price * 100);
      try {
        const price = await this.stripe.prices.retrieve(id);
        if (!price.active) problems.push(`${name}: price ${id} is archived`);
        if (price.livemode !== (this.mode === 'live'))
          problems.push(`${name}: price ${id} is not a ${this.mode}-mode price`);
        if (price.currency !== 'usd')
          problems.push(`${name}: billed in ${price.currency}, not usd`);
        if (price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1)
          problems.push(`${name}: not a monthly subscription price`);
        if (price.unit_amount !== expected)
          problems.push(
            `${name}: Stripe charges $${(price.unit_amount / 100).toFixed(2)}, plans list $${(expected / 100).toFixed(2)}`,
          );
      } catch (error) {
        problems.push(`${name}: price ${id} could not be read (${error.message})`);
      }
    }
    return problems;
  }
  planFor(priceId) {
    return Object.keys(this.prices).find((plan) => this.prices[plan] === priceId) || null;
  }
  parseEvent(rawBody, signature) {
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new ApiError(400, 'invalid_signature', 'The webhook signature is not valid.');
    }
  }
  // The idempotency key means a double click can't create two customers for one workspace.
  async createCustomer(workspaceId, email) {
    const customer = await this.stripe.customers.create(
      { ...(email.includes('@') ? { email } : {}), metadata: { workspaceId } },
      { idempotencyKey: `customer-${workspaceId}` },
    );
    return customer.id;
  }
  // Newest first.
  async listSubscriptions(customerId) {
    const { data } = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 20,
    });
    return data;
  }
  // Asks Stripe directly, because the workspace record may be behind.
  async hasLiveSubscription(customerId) {
    const subscriptions = await this.listSubscriptions(customerId);
    return subscriptions.some((subscription) => ENTITLED_STATUSES.has(subscription.status));
  }
  async checkoutUrl({ workspaceId, customerId, plan }) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: workspaceId,
      line_items: [{ price: this.prices[plan], quantity: 1 }],
      subscription_data: { metadata: { workspaceId } },
      success_url: `${this.appOrigin}/billing?checkout=success`,
      cancel_url: `${this.appOrigin}/billing?checkout=cancelled`,
    });
    return session.url;
  }
  async portalUrl(customerId) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.appOrigin}/billing`,
    });
    return session.url;
  }
  retrieveSubscription(id) {
    return this.stripe.subscriptions.retrieve(id);
  }
  cancelSubscription(id) {
    return this.stripe.subscriptions.cancel(id);
  }
}

// Returns null when billing is off, so the console shows that instead of failing to start.
// The webhook secret is optional: without it, plans update through syncWorkspace only.
export function createBilling(env, appOrigin) {
  if (!env.STRIPE_SECRET_KEY) return null;
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) {
    console.error(`Billing is off. Missing: ${missing.join(', ')}`);
    return null;
  }
  return new StripeBilling({
    stripe: new Stripe(env.STRIPE_SECRET_KEY),
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || null,
    prices: Object.fromEntries(PAID_PLANS.map((plan) => [plan, env[priceVariable(plan)]])),
    appOrigin,
    mode: stripeModeOf(env.STRIPE_SECRET_KEY),
  });
}

// Writes the subscription into the entitlement fields for `mode` only. A subscription from the
// other Stripe mode is ignored, so test payments never unlock live access and vice versa.
// Applying the same subscription state twice changes nothing and logs nothing.
export function applySubscription(workspace, subscription, priceToPlan, mode = 'live') {
  if (subscription.livemode !== undefined && subscription.livemode !== (mode === 'live')) return;
  const { status, id } = subscription,
    entitled = ENTITLED_STATUSES.has(status),
    current = billingFor(workspace, mode);
  if (!entitled && !ENDED_STATUSES.has(status)) return; // Not paid yet, so nothing changes.
  // An old subscription ending must not cancel access from a newer one.
  if (!entitled && current?.subscriptionId && current.subscriptionId !== id) return;
  const item = subscription.items.data[0],
    plan = entitled ? priceToPlan(item?.price.id) : FREE_PLAN;
  // Thrown so Stripe retries once the missing price is configured.
  if (!plan) throw new Error(`Subscription ${id} uses an unconfigured price.`);
  const { customer } = subscription,
    previous = planFor(workspace, mode).name;
  setEntitlement(workspace, mode, {
    plan,
    billing: {
      customerId: typeof customer === 'string' ? customer : customer.id,
      subscriptionId: id,
      status,
      currentPeriodEnd: isoDate(item?.current_period_end),
      cancelsAt: isoDate(subscription.cancel_at),
      livemode: mode === 'live',
    },
  });
  if (previous !== plan)
    log(workspace, {
      type: 'billing',
      message: `${mode === 'test' ? 'Test mode: plan' : 'Plan'} changed: ${previous} to ${plan}`,
      status: 200,
    });
}

function subscriptionIdFrom(event) {
  const object = event.data.object;
  if (event.type === 'checkout.session.completed')
    return object.mode === 'subscription' ? object.subscription : null;
  return event.type.startsWith('customer.subscription.') ? object.id : null;
}

// Always reads the subscription's current state from Stripe, so events that arrive twice or out
// of order can't leave a workspace on the wrong plan.
export async function syncFromEvent(event, { store, billing }) {
  // Events from the other Stripe mode (a shared webhook endpoint, say) are not ours to apply.
  if (event.livemode !== undefined && event.livemode !== (billing.mode === 'live')) return;
  const id = subscriptionIdFrom(event);
  if (!id) return;
  const subscription = await billing.retrieveSubscription(id),
    workspaceId = subscription.metadata?.workspaceId; // Absent on your other Stripe products.
  if (!workspaceId || !(await store.getWorkspace(workspaceId))) return;
  await store.transact(workspaceId, (workspace) =>
    applySubscription(workspace, subscription, (priceId) => billing.planFor(priceId), billing.mode),
  );
}

// Brings a workspace up to date from Stripe, using the customer saved on the workspace. It takes
// nothing from the browser, so a customer can only ever activate what Stripe says they paid for.
export async function syncWorkspace(workspace, { store, billing }) {
  const record = billingFor(workspace, billing.mode),
    customerId = record?.customerId;
  if (!customerId) return;
  const subscriptions = (await billing.listSubscriptions(customerId)).filter(
    (subscription) => subscription.metadata?.workspaceId === workspace.id,
  );
  const current =
    subscriptions.find((subscription) => ENTITLED_STATUSES.has(subscription.status)) ||
    subscriptions.find((subscription) => subscription.id === record.subscriptionId) ||
    subscriptions[0];
  if (!current) return;
  await store.transact(workspace.id, (w) =>
    applySubscription(w, current, (priceId) => billing.planFor(priceId), billing.mode),
  );
}
