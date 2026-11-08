import { ApiError, getPlan, hash } from '../server/domain.mjs';

// mtr_sbx_/mtr_live_ followed by 32 random bytes in base64url (see POST /api/keys in the console).
export const KEY_PATTERN = /^mtr_(sbx|live)_[A-Za-z0-9_-]{43}$/;

export function readKey(request) {
  const header = request.headers.authorization || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : '';
}

const invalid = () =>
  new ApiError(401, 'invalid_api_key', 'Provide a valid Mantrilo API key as a Bearer token.');

// Resolves a raw key to its workspace and plan. Results are cached briefly so each request
// costs no extra reads; a revoked key stops working within `ttlMs`.
export class KeyResolver {
  constructor(store, { ttlMs = 60_000, now = () => Date.now() } = {}) {
    this.store = store;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }
  async resolve(rawKey) {
    if (!KEY_PATTERN.test(rawKey)) throw invalid();
    const keyHash = hash(rawKey),
      cached = this.cache.get(keyHash);
    let entry = cached && cached.expires > this.now() ? cached.value : null;
    if (!entry) {
      entry = await this.lookup(keyHash);
      this.cache.set(keyHash, { value: entry, expires: this.now() + this.ttlMs });
      if (this.cache.size > 10_000) this.cache.delete(this.cache.keys().next().value);
    }
    if (!entry) throw invalid();
    if (entry.status !== 'active')
      throw new ApiError(401, 'revoked_api_key', 'This API key has been revoked.');
    const plan = getPlan(entry.plan);
    if (entry.environment === 'production' && !plan.price)
      throw new ApiError(
        403,
        'plan_inactive',
        'Production keys require an active paid plan. Use a sandbox key or upgrade the plan.',
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
      environment: record.environment,
      status: record.status,
      plan: workspace.plan,
    };
  }
}
