import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import plans from '../../shared/content-plans.json' with { type: 'json' };
export { plans };
export const INITIAL_ADMIN_EMAIL = 'bebaslekhnath@gmail.com';
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function insist(condition, status, code, message) {
  if (!condition) throw new ApiError(status, code, message);
}
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export const MAX_ACTIVE_KEYS = 50;
export const MAX_REVOKED_KEYS = 50;
const KEY_CHECKSUM_LENGTH = 6;
// Lets the API discard mistyped or made-up keys without a database read. It is not a secret:
// anything that passes still has to match a stored hash.
const keyChecksum = (body) =>
  createHash('sha256').update(body).digest('base64url').slice(0, KEY_CHECKSUM_LENGTH);
// Sandbox keys (mtr_sbx_) read the sample catalog on any plan. Live keys (mtr_live_) read the full
// catalog and need a paid plan.
export const ENVIRONMENTS = ['sandbox', 'production'];
export function newApiKey(environment) {
  const body = `mtr_${environment === 'sandbox' ? 'sbx' : 'live'}_${secret()}`;
  return `${body}${keyChecksum(body)}`;
}
export function hasValidChecksum(rawKey) {
  const body = rawKey.slice(0, -KEY_CHECKSUM_LENGTH);
  return keyChecksum(body) === rawKey.slice(-KEY_CHECKSUM_LENGTH);
}
export const equal = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function cleanText(value, name, max = 120) {
  insist(
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max,
    400,
    'invalid_input',
    `${name} is required and must be at most ${max} characters.`,
  );
  return value.trim();
}
export async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    insist(Buffer.byteLength(raw) < 16384, 413, 'request_too_large', 'Request is too large.');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'invalid_json', 'Expected JSON request body.');
  }
}
// Unknown names, including the retired "Sandbox", fall back to the free plan.
export const FREE_PLAN = plans[0].name;
export const getPlan = (name) => plans.find((plan) => plan.name === name) || plans[0];
// Stripe test-mode and live-mode entitlements are stored apart, because local development and
// production share one Firestore database. A deployment reads only its own mode's fields
// (MANTRILO_BILLING_MODE), so a sandbox checkout can never unlock a plan in production.
export const BILLING_MODES = ['live', 'test'];
const ENTITLEMENT_FIELDS = {
  live: { plan: 'plan', billing: 'billing' },
  test: { plan: 'testPlan', billing: 'testBilling' },
};
export function billingModeFrom(env = process.env) {
  const mode = env.MANTRILO_BILLING_MODE || 'live';
  if (!BILLING_MODES.includes(mode))
    throw new Error(`MANTRILO_BILLING_MODE must be live or test, not "${mode}".`);
  return mode;
}
export const planFor = (workspace, mode = 'live') =>
  getPlan(workspace[ENTITLEMENT_FIELDS[mode].plan]);
export const billingFor = (workspace, mode = 'live') =>
  workspace[ENTITLEMENT_FIELDS[mode].billing] || null;
export function setEntitlement(workspace, mode, { plan, billing }) {
  const fields = ENTITLEMENT_FIELDS[mode];
  if (plan !== undefined) workspace[fields.plan] = plan;
  if (billing !== undefined) workspace[fields.billing] = billing;
}
// Usage is metered in separate lanes: sandbox keys, live keys in production, and live keys under
// test-mode billing (local development). Each lane has its own monthly allowance.
export const USAGE_LANES = ['sandbox', 'live', 'live-test'];
export const usageLane = (environment, mode = 'live') =>
  environment === 'sandbox' ? 'sandbox' : mode === 'test' ? 'live-test' : 'live';
export const hasUnlimitedRequests = (workspace) => Boolean(workspace.unlimitedRequestsSince);
export const hasLiveAccess = (workspace, mode = 'live') =>
  planFor(workspace, mode).price > 0 ||
  (mode === 'live' && hasUnlimitedRequests(workspace) && workspace.promoLiveAccess === true);
export const requestsRemaining = (limit, used) =>
  limit === null ? null : Math.max(0, limit - used);
export function allowance(plan, unlimitedRequests = false) {
  return {
    requests: unlimitedRequests ? null : Number(plan.requests.replaceAll(',', '')),
    audioBytes: plan.price ? Number(plan.audio.split(' ')[0]) * 1e9 : 0,
    products: plan.price ? Number(plan.products) : null,
  };
}
export const currentPeriod = (date = new Date()) => date.toISOString().slice(0, 7);
export function newWorkspace(id, ownerUid, name) {
  return {
    id,
    ownerUid,
    name,
    plan: FREE_PLAN,
    createdAt: new Date().toISOString(),
    products: [],
    keys: [],
    usage: {},
    logs: [],
    preferences: { emailNotifications: false, usageAlertThreshold: 80 },
  };
}
export function log(workspace, entry) {
  workspace.logs.unshift({ id: randomUUID(), at: new Date().toISOString(), ...entry });
  workspace.logs = workspace.logs.slice(0, 200);
}
// Keys made before environments were recorded are told apart by their prefix.
export const keyEnvironment = (key) =>
  key.environment ?? (key.prefix?.startsWith('mtr_sbx_') ? 'sandbox' : 'production');
// The workspace's own key for an environment: the active one whose secret the console can show.
export const primaryKey = (workspace, environment) =>
  workspace.keys.find(
    (key) => key.status === 'active' && key.secret && keyEnvironment(key) === environment,
  ) || null;
// Live access can come from a subscription or an explicit private promo grant.
const wantedKeys = (workspace, mode) =>
  hasLiveAccess(workspace, mode) ? ENVIRONMENTS : ['sandbox'];
function issueKey(workspace, environment) {
  const rawKey = newApiKey(environment);
  const key = {
    id: randomUUID(),
    name: environment === 'sandbox' ? 'Sandbox key' : 'Live key',
    environment,
    prefix: rawKey.slice(0, 16),
    hash: hash(rawKey),
    secret: rawKey,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  addKey(workspace, key);
  return key;
}
const knownPlan = (workspace) => plans.some((plan) => plan.name === workspace.plan);
// Billing records from before modes were tracked came from the Stripe sandbox: production never
// had a Stripe key until modes existed, so they move to the test-mode fields.
const legacyBilling = (workspace) =>
  Boolean(workspace.billing) && workspace.billing.livemode === undefined;
export const needsMigration = (workspace, mode = 'live') =>
  !knownPlan(workspace) ||
  legacyBilling(workspace) ||
  wantedKeys(workspace, mode).some((env) => !primaryKey(workspace, env));
// Moves the retired Sandbox plan to Free and issues any key the plan calls for: a sandbox key for
// everyone, and a live key once the workspace has paid. Older keys stay active so integrations
// keep working until the owner revokes them. A live key is kept when a subscription ends, so it
// works again on resubscribing; the API refuses it meanwhile. Idempotent.
export function migrateWorkspace(workspace, mode = 'live') {
  if (!knownPlan(workspace)) workspace.plan = FREE_PLAN;
  if (legacyBilling(workspace)) {
    setEntitlement(workspace, 'test', {
      plan: workspace.plan,
      billing: { ...workspace.billing, livemode: false },
    });
    workspace.plan = FREE_PLAN;
    delete workspace.billing;
  }
  for (const environment of wantedKeys(workspace, mode))
    if (!primaryKey(workspace, environment)) issueKey(workspace, environment);
}
// Replaces one of the workspace keys. The old key stops working at once.
export function rotateKey(workspace, environment, mode = 'live') {
  insist(
    ENVIRONMENTS.includes(environment),
    400,
    'invalid_environment',
    'Choose the sandbox or live key.',
  );
  insist(
    environment === 'sandbox' || hasLiveAccess(workspace, mode),
    403,
    'production_plan_required',
    'A paid plan or a live-access promo is required for a live key.',
  );
  const current = primaryKey(workspace, environment);
  if (current) {
    current.status = 'revoked';
    delete current.secret;
  }
  const key = issueKey(workspace, environment);
  log(workspace, {
    type: 'key_rotated',
    message: `Regenerated the ${environment === 'sandbox' ? 'sandbox' : 'live'} key`,
    status: 201,
  });
  return key;
}
// The first day of next month (UTC), when monthly allowances reset.
export function resetDate(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
}
// One document per key (apiKeys/{sha256}) so the public API resolves and revokes keys with a
// single read/write. The index holds only the hash and a display prefix, never the secret.
export function apiKeyRecord(workspaceId, key) {
  return {
    workspaceId,
    keyId: key.id,
    name: key.name,
    prefix: key.prefix,
    environment: keyEnvironment(key),
    status: key.status,
    createdAt: key.createdAt,
  };
}
// Keys whose index record must be written: new keys and keys whose status changed.
export function changedKeys(previousKeys, keys) {
  const before = new Map(previousKeys.map((key) => [key.hash, key.status]));
  return keys.filter((key) => before.get(key.hash) !== key.status);
}
// Index records to delete: keys pruned from the workspace.
export function removedKeys(previousKeys, keys) {
  const kept = new Set(keys.map((key) => key.hash));
  return previousKeys.filter((key) => !kept.has(key.hash));
}
// Adds a key, capping active keys and dropping the oldest revoked records so the document stays small.
export function addKey(workspace, key) {
  insist(
    workspace.keys.filter((k) => k.status === 'active').length < MAX_ACTIVE_KEYS,
    409,
    'key_capacity',
    `This workspace has ${MAX_ACTIVE_KEYS} active keys. Revoke one to create another.`,
  );
  const revoked = workspace.keys.filter((k) => k.status !== 'active'),
    pruned = new Set(revoked.slice(0, Math.max(0, revoked.length - MAX_REVOKED_KEYS)));
  workspace.keys = workspace.keys.filter((k) => !pruned.has(k));
  workspace.keys.push(key);
}
// `activity` maps key id to its latest /v1 use, which the public API records outside the workspace.
// The browser sees only the entitlement for this deployment's billing mode.
export function publicWorkspace(workspace, activity = {}, mode = 'live') {
  const copy = structuredClone(workspace);
  copy.plan = planFor(workspace, mode).name;
  copy.billing = billingFor(workspace, mode) ?? undefined;
  delete copy.testPlan;
  delete copy.testBilling;
  copy.keys = copy.keys.map(({ hash: _hash, ...key }) => {
    const apiUse = activity[key.id];
    return apiUse && !(key.lastUsedAt > apiUse) ? { ...key, lastUsedAt: apiUse } : key;
  });
  return copy;
}
export function usage(workspace, period = currentPeriod()) {
  return (
    workspace.usage[period] || {
      contentRequests: 0,
      audioBytes: 0,
      daily: {},
      endpoints: {},
    }
  );
}
const COUNTERS = ['contentRequests', 'audioBytes'];
function addCounts(total, meter) {
  for (const field of COUNTERS) total[field] = (total[field] || 0) + (meter[field] || 0);
  total.endpoints ||= {};
  for (const [endpoint, count] of Object.entries(meter.endpoints || {}))
    total.endpoints[endpoint] = (total.endpoints[endpoint] || 0) + count;
}
// Adds meters together: console usage on the workspace and public API usage stored separately.
export function mergeUsage(...meters) {
  const total = { contentRequests: 0, audioBytes: 0, daily: {}, endpoints: {} };
  for (const meter of meters) {
    addCounts(total, meter);
    for (const [day, counts] of Object.entries(meter.daily || {}))
      addCounts((total.daily[day] ||= {}), counts);
  }
  return total;
}
export function chargeRequest(workspace, keyHash, endpoint, requestId, billingMode = 'live') {
  const key = workspace.keys.find((key) => key.hash === keyHash && key.status === 'active');
  insist(key, 401, 'invalid_api_key', 'The API key is invalid or revoked.');
  insist(
    keyEnvironment(key) === 'sandbox',
    403,
    'sandbox_only',
    'This demo endpoint accepts sandbox keys only.',
  );
  const limits = allowance(planFor(workspace, billingMode), hasUnlimitedRequests(workspace)),
    period = currentPeriod(),
    today = new Date().toISOString().slice(0, 10);
  const meter = usage(workspace, period);
  insist(
    limits.requests === null || meter.contentRequests < limits.requests,
    429,
    'quota_exceeded',
    'The monthly content request allowance has been reached.',
  );
  meter.contentRequests += 1;
  meter.daily[today] ||= { contentRequests: 0, audioBytes: 0 };
  meter.daily[today].contentRequests += 1;
  meter.daily[today].endpoints ||= {};
  meter.daily[today].endpoints[endpoint] = (meter.daily[today].endpoints[endpoint] || 0) + 1;
  meter.endpoints[endpoint] = (meter.endpoints[endpoint] || 0) + 1;
  workspace.usage[period] = meter;
  key.lastUsedAt = new Date().toISOString();
  log(workspace, {
    type: 'request',
    endpoint,
    status: 200,
    requestId,
    cost: { contentRequests: 1, audioBytes: 0 },
    billable: false,
  });
  return { meter, period, remaining: requestsRemaining(limits.requests, meter.contentRequests) };
}
export const accountingPolicy =
  'Each successful API request or astrology calculation uses one content request, and each audio link also counts the file size toward audio delivery. Sandbox and live keys are metered separately, each against the plan’s monthly allowance, and all keys of one kind share it. Refused requests (invalid input, unknown ids, bad keys, rate limits, an exhausted allowance) and server errors are refunded and cost nothing, as do key management and console browsing.';
