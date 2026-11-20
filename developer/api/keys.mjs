import {
  ApiError,
  getPlan,
  hasLiveAccess,
  hasUnlimitedRequests,
  hasValidChecksum,
  hash,
  keyEnvironment,
  planFor,
} from '../server/domain.mjs';

// mtr_sbx_ (sandbox) or mtr_live_ (live) then 32 random bytes in base64url and a 6-character checksum (newApiKey in
// server/domain.mjs). Keys issued before the checksum have only the first 43 characters.
export const KEY_PATTERN = /^mtr_(?:sbx|live)_[A-Za-z0-9_-]{43}([A-Za-z0-9_-]{6})?$/;

function wellFormed(rawKey) {
  const match = rawKey.match(KEY_PATTERN);
  return Boolean(match) && (match[1] === undefined || hasValidChecksum(rawKey));
}

export function readKey(request) {
  const header = request.headers.authorization || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : '';
}

const invalid = () =>
  new ApiError(401, 'invalid_api_key', 'Provide a valid Mantrilo API key as a Bearer token.');

// Resolves a raw key to its workspace and plan. Results, including unknown keys, are cached
// briefly so repeat requests cost no reads; a revoked key stops working within `ttlMs`.
// `beforeLookup` runs just before a database read and may throw to refuse it.
export class KeyResolver {
  // `billingMode` picks which Stripe mode's entitlement applies (see planFor in server/domain.mjs).
  constructor(store, { ttlMs = 60_000, now = () => Date.now(), billingMode = 'live' } = {}) {
    this.store = store;
    this.billingMode = billingMode;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }
  async resolve(rawKey, { beforeLookup = () => {} } = {}) {
    if (!wellFormed(rawKey)) throw invalid();
    const keyHash = hash(rawKey),
      cached = this.cache.get(keyHash),
      hit = cached && cached.expires > this.now();
    let entry = hit ? cached.value : null;
    if (!hit) {
      beforeLookup();
      entry = await this.lookup(keyHash);
      this.cache.set(keyHash, { value: entry, expires: this.now() + this.ttlMs });
      if (this.cache.size > 10_000) this.cache.delete(this.cache.keys().next().value);
    }
    if (!entry) throw invalid();
    if (entry.status !== 'active')
      throw new ApiError(401, 'revoked_api_key', 'This API key has been revoked.');
    const plan = getPlan(entry.plan);
    if (entry.environment === 'production' && !entry.liveAccess)
      throw new ApiError(
        403,
        'plan_inactive',
        'Live keys require active live access. Use your sandbox key, or check access in the console.',
      );
    return { ...entry, keyHash, plan };
  }
  async lookup(keyHash) {
    const record = await this.store.findKey(keyHash);
    if (!record) return null;
    const workspace = await this.store.getWorkspace(record.workspaceId);
    if (!workspace) return null;
    return {
      keyId: record.keyId ?? record.id,
      workspaceId: record.workspaceId,
      environment: keyEnvironment(record),
      status: record.status,
      plan: planFor(workspace, this.billingMode).name,
      unlimitedRequests: hasUnlimitedRequests(workspace),
      liveAccess: hasLiveAccess(workspace, this.billingMode),
    };
  }
}
