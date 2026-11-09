import Stripe from 'stripe';
import { ApiError, log } from './domain.mjs';

// past_due keeps access while Stripe retries the card; its retry settings decide when it ends.
export const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);
const ENDED_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired', 'paused']);
export const PAID_PLANS = ['Starter', 'Growth', 'Business'];
const REQUIRED_ENV = PAID_PLANS.map(priceVariable);

function priceVariable(plan) {
  return `STRIPE_PRICE_${plan.toUpperCase()}`;
}
const isoDate = (seconds) => (seconds ? new Date(seconds * 1000).toISOString() : null);

export class StripeBilling {
  constructor({ stripe, webhookSecret, prices, appOrigin }) {
    Object.assign(this, { stripe, webhookSecret, prices, appOrigin });
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
  });
}

export function applySubscription(workspace, subscription, planFor) {
  const { status, id } = subscription,
    entitled = ENTITLED_STATUSES.has(status);
  if (!entitled && !ENDED_STATUSES.has(status)) return; // Not paid yet, so nothing changes.
  // An old subscription ending must not cancel access from a newer one.
  if (!entitled && workspace.billing?.subscriptionId && workspace.billing.subscriptionId !== id)
    return;
  const item = subscription.items.data[0],
    plan = entitled ? planFor(item?.price.id) : 'Sandbox';
  // Thrown so Stripe retries once the missing price is configured.
  if (!plan) throw new Error(`Subscription ${id} uses an unconfigured price.`);
  const { customer } = subscription,
    previous = workspace.plan;
  workspace.billing = {
    customerId: typeof customer === 'string' ? customer : customer.id,
    subscriptionId: id,
    status,
    currentPeriodEnd: isoDate(item?.current_period_end),
    cancelsAt: isoDate(subscription.cancel_at),
  };
  workspace.plan = plan;
  if (previous !== plan)
    log(workspace, {
      type: 'billing',
      message: `Plan changed: ${previous} to ${plan}`,
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
  const id = subscriptionIdFrom(event);
  if (!id) return;
  const subscription = await billing.retrieveSubscription(id),
    workspaceId = subscription.metadata?.workspaceId; // Absent on your other Stripe products.
  if (!workspaceId || !(await store.getWorkspace(workspaceId))) return;
  await store.transact(workspaceId, (workspace) =>
    applySubscription(workspace, subscription, (priceId) => billing.planFor(priceId)),
  );
}

// Brings a workspace up to date from Stripe, using the customer saved on the workspace. It takes
// nothing from the browser, so a customer can only ever activate what Stripe says they paid for.
export async function syncWorkspace(workspace, { store, billing }) {
  const customerId = workspace.billing?.customerId;
  if (!customerId) return;
  const subscriptions = (await billing.listSubscriptions(customerId)).filter(
    (subscription) => subscription.metadata?.workspaceId === workspace.id,
  );
  const current =
    subscriptions.find((subscription) => ENTITLED_STATUSES.has(subscription.status)) ||
    subscriptions.find((subscription) => subscription.id === workspace.billing.subscriptionId) ||
    subscriptions[0];
  if (!current) return;
  await store.transact(workspace.id, (w) =>
    applySubscription(w, current, (priceId) => billing.planFor(priceId)),
  );
}
