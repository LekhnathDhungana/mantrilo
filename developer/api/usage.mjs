import { FieldValue } from 'firebase-admin/firestore';
import { allowance, currentPeriod } from '../server/domain.mjs';

// The Sandbox plan includes "sample audio only"; cap it so sample playback stays testing-sized.
export const SANDBOX_AUDIO_BYTES = 50 * 1024 * 1024;

export function limitsFor(plan) {
  const base = allowance(plan);
  return {
    requests: base.requests,
    audioBytes: plan.price ? base.audioBytes : SANDBOX_AUDIO_BYTES,
  };
}

// Requests per second and burst per key, by plan. Tune as real traffic arrives.
export const RATE_LIMITS = {
  Sandbox: { rate: 2, burst: 10 },
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

// Monthly usage per workspace, written as increments spread over shard documents
// (apiUsage/{workspace}_{period}_{n}) so a busy key never contends on a single document.
// Totals are cached briefly; quota checks can overshoot by a few requests, billing totals stay exact.
export class UsageMeter {
  constructor(sink, { ttlMs = 30_000, now = () => Date.now() } = {}) {
    this.sink = sink;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }
  async totals(workspaceId, period = currentPeriod()) {
    const id = `${workspaceId}_${period}`,
      cached = this.cache.get(id);
    if (cached && cached.expires > this.now()) return cached.totals;
    const totals = await this.sink.sum(workspaceId, period);
    this.cache.set(id, { totals, expires: this.now() + this.ttlMs });
    return totals;
  }
  record({ workspaceId, keyId, endpoint, requests = 1, audioBytes = 0, at = new Date() }) {
    const period = currentPeriod(at),
      cached = this.cache.get(`${workspaceId}_${period}`);
    if (cached) {
      cached.totals.contentRequests += requests;
      cached.totals.audioBytes += audioBytes;
    }
    return this.sink.add({ workspaceId, keyId, endpoint, requests, audioBytes, period, at });
  }
}

export class FirestoreUsageSink {
  constructor(db, { shards = 10 } = {}) {
    this.db = db;
    this.shards = shards;
  }
  async add({ workspaceId, keyId, endpoint, requests, audioBytes, period, at }) {
    const shard = Math.floor(Math.random() * this.shards),
      day = at.toISOString().slice(0, 10),
      inc = FieldValue.increment;
    await this.db.doc(`apiUsage/${workspaceId}_${period}_${shard}`).set(
      {
        workspaceId,
        period,
        contentRequests: inc(requests),
        audioBytes: inc(audioBytes),
        daily: { [day]: { contentRequests: inc(requests), audioBytes: inc(audioBytes) } },
        endpoints: { [endpoint]: inc(requests) },
        keys: {
          [keyId]: {
            requests: inc(requests),
            audioBytes: inc(audioBytes),
            lastUsedAt: at.toISOString(),
          },
        },
      },
      { merge: true },
    );
  }
  async sum(workspaceId, period) {
    const snapshot = await this.db
      .collection('apiUsage')
      .where('workspaceId', '==', workspaceId)
      .where('period', '==', period)
      .get();
    return snapshot.docs.reduce(
      (total, doc) => ({
        contentRequests: total.contentRequests + (doc.get('contentRequests') || 0),
        audioBytes: total.audioBytes + (doc.get('audioBytes') || 0),
      }),
      { contentRequests: 0, audioBytes: 0 },
    );
  }
}

export class MemoryUsageSink {
  constructor() {
    this.events = [];
  }
  async add(event) {
    this.events.push(event);
  }
  async sum(workspaceId, period) {
    return this.events
      .filter((e) => e.workspaceId === workspaceId && e.period === period)
      .reduce(
        (t, e) => ({
          contentRequests: t.contentRequests + e.requests,
          audioBytes: t.audioBytes + e.audioBytes,
        }),
        { contentRequests: 0, audioBytes: 0 },
      );
  }
}
