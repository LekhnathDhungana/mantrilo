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
export const getPlan = (name) => plans.find((plan) => plan.name === name) || plans[0];
export function allowance(plan) {
  return {
    requests: Number(plan.requests.replaceAll(',', '')),
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
    plan: 'Sandbox',
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
// One document per key (apiKeys/{sha256}) so the public API resolves and revokes keys with a
// single read/write. The raw secret is never stored; only its hash and a display prefix.
export function apiKeyRecord(workspaceId, key) {
  return {
    workspaceId,
    keyId: key.id,
    name: key.name,
    prefix: key.prefix,
    environment: key.environment,
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
export function publicWorkspace(workspace, activity = {}) {
  const copy = structuredClone(workspace);
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
export function chargeRequest(workspace, keyHash, endpoint, requestId) {
  const key = workspace.keys.find((key) => key.hash === keyHash && key.status === 'active');
  insist(key, 401, 'invalid_api_key', 'The API key is invalid or revoked.');
  insist(
    key.environment === 'sandbox',
    403,
    'sandbox_only',
    'This demo endpoint accepts sandbox keys only.',
  );
  const plan = getPlan(workspace.plan),
    limits = allowance(plan),
    period = currentPeriod(),
    today = new Date().toISOString().slice(0, 10);
  const meter = usage(workspace, period);
  insist(
    meter.contentRequests < limits.requests,
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
  return { meter, period };
}
export const accountingPolicy =
  'Each successful API request or astrology calculation uses one content request, and each audio link also counts the file size toward audio delivery. Sandbox and production keys share the workspace allowance. Errors, key management and console browsing cost nothing.';
