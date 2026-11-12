import { FieldValue } from 'firebase-admin/firestore';
import { allowance, currentPeriod } from '../server/domain.mjs';

// The Free plan includes "sample audio only"; cap it so sample playback stays testing-sized.
export const SANDBOX_AUDIO_BYTES = 50 * 1024 * 1024;

// Each usage lane gets the plan's monthly request allowance. Sandbox keys read only the sample, so
// their audio stays testing-sized on every plan.
export function limitsFor(plan, environment = 'production') {
  const base = allowance(plan);
  return {
    requests: base.requests,
    audioBytes: plan.price && environment !== 'sandbox' ? base.audioBytes : SANDBOX_AUDIO_BYTES,
  };
}

// Requests per second and burst per workspace and environment, by plan. Tune as real traffic arrives.
export const RATE_LIMITS = {
  Free: { rate: 2, burst: 10 },
  Starter: { rate: 10, burst: 20 },
  Growth: { rate: 25, burst: 50 },
  Business: { rate: 50, burst: 100 },
};

// In-memory token buckets. Per instance: with N Cloud Run instances the effective limit is up
// to N times higher, which is acceptable for abuse protection (quotas are enforced separately).
export class RateLimiter {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.buckets = new Map();
  }
  // Whether take() would succeed, without spending a token.
  available(id, { rate, burst }) {
    const bucket = this.buckets.get(id);
    if (!bucket) return true;
    return Math.min(burst, bucket.tokens + ((this.now() - bucket.at) / 1000) * rate) >= 1;
  }
  take(id, { rate, burst }) {
    const now = this.now(),
      bucket = this.buckets.get(id) || { tokens: burst, at: now };
    bucket.tokens = Math.min(burst, bucket.tokens + ((now - bucket.at) / 1000) * rate);
    bucket.at = now;
    this.buckets.set(id, bucket);
    if (this.buckets.size > 50_000) this.buckets.delete(this.buckets.keys().next().value);
    if (bucket.tokens < 1)
      return { ok: false, retryAfter: Math.ceil((1 - bucket.tokens) / rate), remaining: 0 };
    bucket.tokens -= 1;
    return { ok: true, remaining: Math.floor(bucket.tokens) };
  }
}

// How close to the allowance (in requests) the meter stops trusting cached totals and checks
// exactly. Covers what other instances may have counted since their caches were filled.
export function exactMargin(rate, { ttlMs = 30_000, instances = 10 } = {}) {
  return Math.max(100, Math.ceil(rate.rate * (ttlMs / 1000) * instances));
}

// Monthly usage per workspace and lane, written as increments spread over shard documents
// (apiUsage/{workspace}_{period}_{lane}_{n}) so a busy key never contends on one document.
// Far from the allowance, requests are counted against briefly cached totals. Within `margin`
// of it, every request is checked and counted in one transaction, so concurrent calls can't go
// over. A request reserved but then refused (not found, bad input, server error) is refunded.
export class UsageMeter {
  // `keyActivity` receives each key's last use, written at most once per `touchMs` per instance.
  constructor(
    sink,
    {
      ttlMs = 30_000,
      now = () => Date.now(),
      keyActivity = null,
      touchMs = 60_000,
      onError = (error) => console.error(`usage write failed: ${error.message}`),
    } = {},
  ) {
    this.onError = onError;
    this.sink = sink;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
    this.keyActivity = keyActivity;
    this.touchMs = touchMs;
    this.touched = new Map();
  }
  async touch(workspaceId, keyId, at) {
    if (!this.keyActivity || this.touched.get(keyId) > this.now() - this.touchMs) return;
    this.touched.delete(keyId);
    this.touched.set(keyId, this.now());
    if (this.touched.size > 10_000) this.touched.delete(this.touched.keys().next().value);
    await this.keyActivity.touchKey(workspaceId, keyId, at.toISOString());
  }
  cacheId(workspaceId, lane, period) {
    return `${workspaceId}_${period}_${lane}`;
  }
  async totals(workspaceId, lane, period = currentPeriod()) {
    const id = this.cacheId(workspaceId, lane, period),
      cached = this.cache.get(id);
    if (cached && cached.expires > this.now()) return cached.totals;
    const totals = await this.sink.sum(workspaceId, period, lane);
    this.cache.set(id, { totals, expires: this.now() + this.ttlMs });
    if (this.cache.size > 20_000) this.cache.delete(this.cache.keys().next().value);
    return totals;
  }
  adjustCache(workspaceId, lane, period, requests, audioBytes) {
    const cached = this.cache.get(this.cacheId(workspaceId, lane, period));
    if (cached) {
      cached.totals.contentRequests += requests;
      cached.totals.audioBytes += audioBytes;
    }
  }
  // Counts usage that needs no allowance check (audio bytes after a reserved request, refunds).
  record({ workspaceId, keyId, lane, endpoint, requests = 1, audioBytes = 0, at = new Date() }) {
    const period = currentPeriod(at);
    this.adjustCache(workspaceId, lane, period, requests, audioBytes);
    return Promise.all([
      this.sink.add({ workspaceId, keyId, lane, endpoint, requests, audioBytes, period, at }),
      requests > 0 || audioBytes > 0 ? this.touch(workspaceId, keyId, at) : null,
    ]);
  }
  // Reserves `requests` against `limit`. Resolves { ok, used, refund() }; ok is false when the
  // allowance would be exceeded, and nothing is counted then.
  async reserve({ workspaceId, keyId, lane, endpoint, limit, margin = 100, requests = 1 }) {
    const at = new Date(),
      period = currentPeriod(at),
      event = { workspaceId, keyId, lane, endpoint, requests, audioBytes: 0, period, at };
    const totals = await this.totals(workspaceId, lane, period);
    let used;
    if (totals.contentRequests + requests + margin <= limit) {
      totals.contentRequests += requests;
      used = totals.contentRequests;
      // Not awaited: far from the limit, a lost write costs one uncounted request at most.
      this.sink.add(event).catch(this.onError);
    } else {
      const result = await this.sink.reserve(event, limit);
      const id = this.cacheId(workspaceId, lane, period);
      this.cache.set(id, {
        totals: { contentRequests: result.used, audioBytes: result.audioBytes },
        expires: this.now() + this.ttlMs,
      });
      if (!result.ok) return { ok: false, used: result.used };
      used = result.used;
    }
    this.touch(workspaceId, keyId, at).catch(() => {});
    let refunded = false;
    return {
      ok: true,
      used,
      refund: () => {
        if (refunded) return Promise.resolve();
        refunded = true;
        return this.record({ workspaceId, keyId, lane, endpoint, requests: -requests, at });
      },
    };
  }
}

// Usage documents written before lanes existed have no lane. Paid plans did not exist then, so
// all of that traffic came from sandbox keys.
const laneOf = (data) => data.lane || 'sandbox';
const shardDoc = (db, { workspaceId, period, lane }, shard) =>
  db.doc(`apiUsage/${workspaceId}_${period}_${lane}_${shard}`);
function increments({ workspaceId, keyId, lane, endpoint, requests, audioBytes, period, at }) {
  const day = at.toISOString().slice(0, 10),
    inc = FieldValue.increment;
  return {
    workspaceId,
    period,
    lane,
    contentRequests: inc(requests),
    audioBytes: inc(audioBytes),
    daily: {
      [day]: {
        contentRequests: inc(requests),
        audioBytes: inc(audioBytes),
        endpoints: { [endpoint]: inc(requests) },
      },
    },
    endpoints: { [endpoint]: inc(requests) },
    keys: { [keyId]: { requests: inc(requests), audioBytes: inc(audioBytes) } },
  };
}
const sumDocs = (docs, lane) =>
  docs
    .filter((doc) => laneOf(doc.data()) === lane)
    .reduce(
      (total, doc) => ({
        contentRequests: total.contentRequests + (doc.get('contentRequests') || 0),
        audioBytes: total.audioBytes + (doc.get('audioBytes') || 0),
      }),
      { contentRequests: 0, audioBytes: 0 },
    );

export class FirestoreUsageSink {
  constructor(db, { shards = 10 } = {}) {
    this.db = db;
    this.shards = shards;
  }
  query(workspaceId, period) {
    return this.db
      .collection('apiUsage')
      .where('workspaceId', '==', workspaceId)
      .where('period', '==', period);
  }
  async add(event) {
    const shard = Math.floor(Math.random() * this.shards);
    await shardDoc(this.db, event, shard).set(increments(event), { merge: true });
  }
  async sum(workspaceId, period, lane) {
    return sumDocs((await this.query(workspaceId, period).get()).docs, lane);
  }
  // Reads every shard and counts in one transaction, so a concurrent reservation that would
  // cross the limit retries against the new total instead of both succeeding.
  async reserve(event, limit) {
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(this.query(event.workspaceId, event.period)),
        totals = sumDocs(snapshot.docs, event.lane);
      if (totals.contentRequests + event.requests > limit)
        return { ok: false, used: totals.contentRequests, audioBytes: totals.audioBytes };
      transaction.set(shardDoc(this.db, event, 0), increments(event), { merge: true });
      return {
        ok: true,
        used: totals.contentRequests + event.requests,
        audioBytes: totals.audioBytes,
      };
    });
  }
}

export class MemoryUsageSink {
  constructor(events = []) {
    this.events = events;
  }
  async add(event) {
    this.events.push(event);
  }
  totalsNow(workspaceId, period, lane) {
    return this.events
      .filter((e) => e.workspaceId === workspaceId && e.period === period)
      .filter((e) => (e.lane || 'sandbox') === lane)
      .reduce(
        (t, e) => ({
          contentRequests: t.contentRequests + e.requests,
          audioBytes: t.audioBytes + e.audioBytes,
        }),
        { contentRequests: 0, audioBytes: 0 },
      );
  }
  async sum(workspaceId, period, lane) {
    return this.totalsNow(workspaceId, period, lane);
  }
  // Check and count happen in one synchronous step, the in-memory equivalent of a transaction.
  async reserve(event, limit) {
    const totals = this.totalsNow(event.workspaceId, event.period, event.lane);
    if (totals.contentRequests + event.requests > limit)
      return { ok: false, used: totals.contentRequests, audioBytes: totals.audioBytes };
    this.events.push(event);
    return {
      ok: true,
      used: totals.contentRequests + event.requests,
      audioBytes: totals.audioBytes,
    };
  }
}
