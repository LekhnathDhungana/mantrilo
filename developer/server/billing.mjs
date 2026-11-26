import { readFile } from 'node:fs/promises';
import Stripe from 'stripe';
import indiaAmounts from '../../shared/india-prices.json' with { type: 'json' };
import indiaAnnualAmounts from '../../shared/india-annual-prices.json' with { type: 'json' };
import {
  ApiError,
  FREE_PLAN,
  billingFor,
  getPlan,
  insist,
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

// Checkout shows Mantrilo's name, logo and colours, not the Stripe account's own branding.
// The icon is also the browser-tab icon on the checkout page.
const BRAND_FILES = {
  logo: { purpose: 'business_logo', name: 'mantrilo-logo.png' },
  icon: { purpose: 'business_icon', name: 'mantrilo-icon.png' },
};
const BRANDING = {
  display_name: 'Mantrilo',
  background_color: '#ffffff',
  button_color: '#f28c28',
  border_style: 'rounded',
  font_family: 'inter',
};
// A price that passed the check is trusted for this long, so checkout skips the Stripe lookup.
// Failures are never cached: fixing the price in Stripe works on the next click.
const PRICE_CHECK_TTL_MS = 10 * 60 * 1000;
const OUTREACH_CODE = 'STARTER99';
const FIRST_MONTH_CENTS = 99;
// Plans bill monthly or yearly. A yearly price charges twelve months of the plan's annual
// per-month price (annualPrice in shared/content-plans.json, 20% below the monthly price).
export const BILLING_INTERVALS = ['month', 'year'];
const priceKey = (plan, market, interval = 'month') =>
  `${market === 'IN' ? 'IN:' : ''}${interval === 'year' ? 'year:' : ''}${plan}`;
const priceLabel = (plan, interval) => (interval === 'year' ? `${plan} (annual)` : plan);
// What Stripe should charge per billing period, in the smallest currency unit.
export function amountCents(plan, market, interval = 'month') {
  const regional = market === 'IN';
  const perMonth =
    interval === 'year'
      ? regional
        ? indiaAnnualAmounts[plan]
        : getPlan(plan).annualPrice
      : regional
        ? indiaAmounts[plan]
        : getPlan(plan).price;
  return Math.round(perMonth * 100) * (interval === 'year' ? 12 : 1);
}

export class StripeBilling {
  constructor({
    stripe,
    webhookSecret,
    prices,
    indiaPrices = {},
    annualPrices = {},
    indiaAnnualPrices = {},
    appOrigin,
    mode = 'live',
    portalConfiguration,
    promotionIds = {},
  }) {
    Object.assign(this, {
      stripe,
      webhookSecret,
      prices,
      indiaPrices,
      annualPrices,
      indiaAnnualPrices,
      appOrigin,
      mode,
      portalConfiguration,
      promotionIds,
    });
    this.verifiedAt = new Map();
    this.brandFiles = {};
  }
  // The configured Stripe price ids for a market and billing interval, by plan name.
  priceTable(market, interval = 'month') {
    if (market === 'IN') return interval === 'year' ? this.indiaAnnualPrices : this.indiaPrices;
    return interval === 'year' ? this.annualPrices : this.prices;
  }
  // Checks every price and fetches the logo once at startup, so the first checkout is quick.
  warm() {
    const checks = [undefined, 'IN'].flatMap((market) =>
      BILLING_INTERVALS.map((interval) =>
        this.verifyPrices(Object.keys(this.priceTable(market, interval)), market, interval),
      ),
    );
    Promise.all(checks).then((results) => {
      const problems = results.flat();
      if (problems.length) console.error(`Stripe price check: ${problems.join('; ')}`);
    });
    for (const kind of Object.keys(BRAND_FILES)) this.brandFile(kind);
  }
  // Reuses the image already uploaded to Stripe; uploads it the first time. Resolves to the
  // file id, or null (checkout then goes without that image).
  brandFile(kind) {
    const { purpose, name } = BRAND_FILES[kind];
    this.brandFiles[kind] ??= (async () => {
      const { data } = await this.stripe.files.list({ purpose, limit: 100 });
      const existing = data.find((file) => file.filename === name);
      if (existing) return existing.id;
      const path = new URL(`../assets/${name}`, import.meta.url);
      const file = await this.stripe.files.create({
        purpose,
        file: { data: await readFile(path), name, type: 'image/png' },
      });
      return file.id;
    })().catch((error) => {
      console.error(`Stripe ${kind} upload failed: ${error.message}`);
      delete this.brandFiles[kind];
      return null;
    });
    return this.brandFiles[kind];
  }
  async brandingSettings() {
    const [logo, icon] = await Promise.all([this.brandFile('logo'), this.brandFile('icon')]);
    return {
      ...BRANDING,
      ...(logo ? { logo: { type: 'file', file: logo } } : {}),
      ...(icon ? { icon: { type: 'file', file: icon } } : {}),
    };
  }
  // Each configured price must match its advertised amount, currency and billing interval.
  async verifyPrices(names = Object.keys(this.prices), market, interval = 'month') {
    const regional = market === 'IN';
    const currency = regional ? 'inr' : 'usd';
    const symbol = regional ? '₹' : '$';
    const checks = names.map(async (name) => {
      const problems = [];
      const label = priceLabel(name, interval);
      const id = this.priceTable(market, interval)[name];
      const expected = amountCents(name, market, interval);
      const cacheKey = priceKey(name, market, interval);
      try {
        insist(id, 503, 'plan_unavailable', 'No price is configured.');
        const price = await this.stripe.prices.retrieve(id);
        if (!price.active) problems.push(`${label}: price ${id} is archived`);
        if (price.livemode !== (this.mode === 'live'))
          problems.push(`${label}: price ${id} is not a ${this.mode}-mode price`);
        if (price.currency !== currency)
          problems.push(`${label}: billed in ${price.currency}, not ${currency}`);
        if (price.recurring?.interval !== interval || price.recurring?.interval_count !== 1)
          problems.push(
            `${label}: not a ${interval === 'year' ? 'yearly' : 'monthly'} subscription price`,
          );
        if (price.unit_amount !== expected)
          problems.push(
            `${label}: Stripe charges ${symbol}${(price.unit_amount / 100).toFixed(2)}, plans list ${symbol}${(expected / 100).toFixed(2)}`,
          );
      } catch (error) {
        problems.push(`${label}: price ${id} could not be read (${error.message})`);
      }
      if (problems.length) this.verifiedAt.delete(cacheKey);
      else this.verifiedAt.set(cacheKey, Date.now());
      return problems;
    });
    return (await Promise.all(checks)).flat();
  }
  async availablePlans(market, interval = 'month') {
    const names = Object.keys(this.priceTable(market, interval));
    const key = (name) => priceKey(name, market, interval);
    const stale = names.filter(
      (name) => Date.now() - (this.verifiedAt.get(key(name)) ?? 0) >= PRICE_CHECK_TTL_MS,
    );
    if (stale.length) await this.verifyPrices(stale, market, interval);
    return names.filter((name) => this.verifiedAt.has(key(name)));
  }
  async requirePlanPrice(plan, market, interval = 'month') {
    const checked = this.verifiedAt.get(priceKey(plan, market, interval));
    if (checked && Date.now() - checked < PRICE_CHECK_TTL_MS) return;
    const problems = await this.verifyPrices([plan], market, interval);
    if (problems.length) {
      console.error(`Stripe price check: ${problems.join('; ')}`);
      throw new ApiError(
        503,
        'plan_unavailable',
        'This plan is temporarily unavailable in Stripe.',
      );
    }
  }
  // Every configured price, monthly and yearly, in both markets.
  get allPriceTables() {
    return [this.prices, this.indiaPrices, this.annualPrices, this.indiaAnnualPrices];
  }
  planFor(priceId) {
    if (!priceId) return null;
    return (
      PAID_PLANS.find((plan) => this.allPriceTables.some((table) => table[plan] === priceId)) ??
      null
    );
  }
  // 'year' for a configured annual price, 'month' for a monthly one, null for anything else.
  intervalFor(priceId) {
    if (!priceId) return null;
    if ([this.annualPrices, this.indiaAnnualPrices].some((t) => Object.values(t).includes(priceId)))
      return 'year';
    if ([this.prices, this.indiaPrices].some((t) => Object.values(t).includes(priceId)))
      return 'month';
    return null;
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
  get promotionPlans() {
    return PAID_PLANS.filter((plan) => /^promo_[A-Za-z0-9]+$/.test(this.promotionIds[plan] ?? ''));
  }
  outreachPromotion(plan, code) {
    if (code === undefined) return null;
    insist(
      this.promotionPlans.includes(plan) &&
        typeof code === 'string' &&
        code.trim().toUpperCase() === OUTREACH_CODE,
      400,
      'invalid_promotion_code',
      'This promo code is unavailable for the selected plan.',
    );
    return this.promotionIds[plan];
  }
  async checkoutUrl({ workspaceId, customerId, plan, promotionCode, market, interval = 'month' }) {
    const regional = market === 'IN';
    // STARTER99 is a first-month offer, so it only applies to monthly billing.
    insist(
      interval === 'month' || promotionCode === undefined,
      400,
      'invalid_promotion_code',
      'Promo codes apply to monthly billing only.',
    );
    const promotion = this.outreachPromotion(plan, promotionCode);
    const renewalCents = amountCents(plan, market, interval);
    const [, branding_settings] = await Promise.all([
      this.requirePlanPrice(plan, market, interval),
      this.brandingSettings(),
    ]);
    const back = `${regional ? '&market=IN' : ''}${interval === 'year' ? '&interval=year' : ''}`;
    const params = {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: workspaceId,
      line_items: [{ price: this.priceTable(market, interval)[plan], quantity: 1 }],
      ...(regional ? {
        billing_address_collection: 'required',
        customer_update: { address: 'auto' },
        adaptive_pricing: { enabled: false },
      } : {}),
      subscription_data: { metadata: { workspaceId } },
      success_url: `${this.appOrigin}/billing?checkout=success#plans`,
      cancel_url: `${this.appOrigin}/billing?checkout=cancelled${back}#plans`,
      ...(promotion ? { discounts: [{ promotion_code: promotion }] } : {}),
    };
    insist(
      branding_settings.logo && branding_settings.icon,
      503,
      'checkout_branding_unavailable',
      'Mantrilo checkout is temporarily unavailable. Contact hello@mantrilo.com for help.',
    );
    try {
      const session = await this.stripe.checkout.sessions.create({ ...params, branding_settings });
      if (regional && (session.currency !== 'inr' || session.amount_subtotal !== renewalCents)) {
        await this.stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        throw new ApiError(503, 'regional_price_mismatch', 'The INR checkout price could not be verified.');
      }
      if (
        promotion &&
        (session.currency !== 'usd' ||
          session.amount_total !== FIRST_MONTH_CENTS ||
          session.amount_subtotal !== renewalCents ||
          session.total_details?.amount_discount !== renewalCents - FIRST_MONTH_CENTS)
      ) {
        await this.stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        throw new ApiError(
          503,
          'promotion_price_mismatch',
          'The offer could not be applied. No payment was taken.',
        );
      }
      return session.url;
    } catch (error) {
      if (
        promotion &&
        error.type === 'StripeInvalidRequestError' &&
        (String(error.param ?? '').startsWith('discounts') ||
          String(error.code ?? '').includes('promotion_code'))
      )
        throw new ApiError(
          400,
          'promotion_not_eligible',
          'This offer is only for eligible new customers.',
        );
      if (!String(error.param ?? '').startsWith('branding_settings')) throw error;
      throw new ApiError(
        503,
        'checkout_branding_unavailable',
        'Mantrilo checkout is temporarily unavailable. Contact hello@mantrilo.com for help.',
      );
    }
  }
  async portalAvailable() {
    if (!/^bpc_[A-Za-z0-9]+$/.test(this.portalConfiguration ?? '')) return false;
    try {
      const [configuration, account] = await Promise.all([
        this.stripe.billingPortal.configurations.retrieve(this.portalConfiguration),
        this.stripe.accounts.retrieve(null),
      ]);
      const branding = account.settings?.branding;
      const looksBranded =
        configuration.active === true &&
        configuration.is_default === false &&
        configuration.livemode === (this.mode === 'live') &&
        configuration.business_profile?.headline === 'Mantrilo Customer Portal' &&
        account.business_profile?.name === BRANDING.display_name &&
        Boolean(branding?.logo && branding?.icon) &&
        branding.primary_color?.toLowerCase() === BRANDING.background_color &&
        branding.secondary_color?.toLowerCase() === BRANDING.button_color;
      if (!looksBranded) return false;
      const [logo, icon] = await Promise.all([
        this.stripe.files.retrieve(branding.logo),
        this.stripe.files.retrieve(branding.icon),
      ]);
      return logo.filename === BRAND_FILES.logo.name && icon.filename === BRAND_FILES.icon.name;
    } catch {
      return false;
    }
  }
  async portalUrl(customerId, flow) {
    insist(
      await this.portalAvailable(),
      503,
      'portal_branding_unavailable',
      'Online billing management is temporarily unavailable. Contact hello@mantrilo.com for invoices or subscription changes.',
    );
    const returnUrl = `${this.appOrigin}/billing`;
    const params = {
      customer: customerId,
      configuration: this.portalConfiguration,
      return_url: flow ? `${returnUrl}#plans` : returnUrl,
      ...(flow && {
        flow_data: {
          ...flow,
          after_completion: {
            type: 'redirect',
            redirect: { return_url: `${returnUrl}?stripe=confirmed#plans` },
          },
        },
      }),
    };
    let session;
    try {
      session = await this.stripe.billingPortal.sessions.create(params);
    } catch (error) {
      if (flow && error.type === 'StripeInvalidRequestError') {
        console.error(`Stripe portal ${flow.type}: ${error.code ?? error.type}`);
        throw new ApiError(
          503,
          'portal_flow_unavailable',
          'Stripe could not open this plan change. Use Manage subscription or contact support.',
        );
      }
      throw error;
    }
    return session.url;
  }
  async planPortalUrl({ workspaceId, customerId, plan }) {
    const subscriptions = await this.listSubscriptions(customerId);
    const subscription = subscriptions.find(
      (record) =>
        record.metadata?.workspaceId === workspaceId &&
        ENTITLED_STATUSES.has(record.status) &&
        this.planFor(record.items.data[0]?.price.id),
    );
    insist(
      subscription,
      409,
      'no_subscription',
      'This workspace has no active subscription in Stripe.',
    );
    if (plan === FREE_PLAN) {
      return this.portalUrl(customerId, {
        type: 'subscription_cancel',
        subscription_cancel: { subscription: subscription.id },
      });
    }

    const [item] = subscription.items.data;
    insist(
      item?.id && subscription.items.data.length === 1,
      409,
      'subscription_change_unavailable',
      'This subscription needs to be changed through Manage subscription or support.',
    );
    insist(
      ![this.indiaPrices, this.indiaAnnualPrices].some((t) => Object.values(t).includes(item.price.id)),
      400,
      'contact_billing',
      'Contact billing support to change an INR subscription.',
    );
    // A plan change keeps the subscription's billing interval: annual stays annual.
    const interval = this.intervalFor(item.price.id) ?? 'month';
    const price = this.priceTable(undefined, interval)[plan];
    insist(
      price,
      409,
      'subscription_change_unavailable',
      'This subscription needs to be changed through Manage subscription or support.',
    );
    insist(item.price.id !== price, 409, 'already_on_plan', 'This is already your plan in Stripe.');
    await this.requirePlanPrice(plan, undefined, interval);
    return this.portalUrl(customerId, {
      type: 'subscription_update_confirm',
      subscription_update_confirm: {
        subscription: subscription.id,
        items: [{ id: item.id, price, quantity: 1 }],
      },
    });
  }
  retrieveSubscription(id) {
    return this.stripe.subscriptions.retrieve(id);
  }
  cancelSubscription(id) {
    return this.stripe.subscriptions.cancel(id);
  }
}

// Reads the price ids that are set, e.g. STRIPE_IN_PRICE_STARTER or STRIPE_PRICE_GROWTH_ANNUAL.
function optionalPrices(env, plans, prefix, suffix = '') {
  return Object.fromEntries(
    plans.flatMap((plan) => {
      const id = env[`${prefix}${plan.toUpperCase()}${suffix}`]?.trim();
      return id ? [[plan, id]] : [];
    }),
  );
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
    indiaPrices: optionalPrices(env, ['Starter', 'Growth'], 'STRIPE_IN_PRICE_'),
    // Annual prices are optional: without them, annual checkout shows as unavailable.
    annualPrices: optionalPrices(env, PAID_PLANS, 'STRIPE_PRICE_', '_ANNUAL'),
    indiaAnnualPrices: optionalPrices(env, ['Starter', 'Growth'], 'STRIPE_IN_PRICE_', '_ANNUAL'),
    appOrigin,
    mode: stripeModeOf(env.STRIPE_SECRET_KEY),
    portalConfiguration: env.STRIPE_MANTRILO_PORTAL_CONFIGURATION?.trim(),
    promotionIds: Object.fromEntries(
      PAID_PLANS.map((plan) => [plan, env[`STRIPE_${plan.toUpperCase()}_PROMOTION_ID`]?.trim()]),
    ),
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
      ...(item?.price.currency ? { currency: item.price.currency } : {}),
      ...(item?.price.recurring?.interval ? { interval: item.price.recurring.interval } : {}),
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
