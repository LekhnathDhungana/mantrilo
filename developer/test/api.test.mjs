import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MemoryStore, FirestoreStore } from '../server/store.mjs';
import { hash, secret, currentPeriod, newApiKey } from '../server/domain.mjs';
import { KeyResolver } from '../api/keys.mjs';
import { MemoryContent, SANDBOX_SAMPLE_SIZE } from '../api/content.mjs';
import { MemoryMedia } from '../api/media.mjs';
import {
  FirestoreUsageSink,
  MemoryUsageSink,
  UsageMeter,
  RateLimiter,
  SANDBOX_AUDIO_BYTES,
} from '../api/usage.mjs';
import { createApiServer } from '../api/server.mjs';

const shloka = (n, extra = {}) => ({
  id: `shloka-${String(n).padStart(2, '0')}`,
  title: `Shloka ${n}`,
  deityKey: n % 2 ? 'shiva' : 'devi',
  deity: n % 2 ? 'Lord Shiva' : 'Devi',
  category: 'Stotras',
  source: 'Sanatana Shastras',
  description: 'Example',
  hasAudio: true,
  audioPath: `shlokam_audio/s${n}.m4a`,
  audioUrl: 'https://firebasestorage.googleapis.com/secret-token-link',
  themeColor: '#000',
  shlokas: [
    {
      shlokaNumber: 1,
      title: 'Verse 1',
      sanskrit: 'ॐ',
      transliteration: 'om',
      translation: 'Om',
      wordMeaning: [{ word: 'ॐ (om)', meaning: 'the sacred syllable' }],
    },
  ],
  ...extra,
});

async function fixture(t, { plan = 'Starter', rate, ...serverOptions } = {}) {
  const store = new MemoryStore();
  await store.ensureWorkspace('w1', 'owner', 'Acme');
  await store.transact('w1', (w) => {
    w.plan = plan;
  });
  const keys = {};
  for (const environment of ['sandbox', 'production']) {
    const raw = `mtr_${environment === 'sandbox' ? 'sbx' : 'live'}_${secret()}`;
    keys[environment] = raw;
    await store.transact('w1', (w) => {
      w.keys.push({
        id: randomUUID(),
        name: environment,
        environment,
        prefix: raw.slice(0, 16),
        hash: hash(raw),
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      });
    });
  }
  const shlokas = Array.from({ length: 12 }, (_, i) => shloka(i + 1));
  shlokas.push(shloka(13, { hasAudio: false, audioPath: null }));
  const files = Object.fromEntries(
    shlokas.map((s) => [s.audioPath, { bytes: 4 * 1024 * 1024, contentType: 'audio/x-m4a' }]),
  );
  const content = new MemoryContent({
    shlokas,
    mantras: [
      {
        id: 'agni_gayatri_mantra',
        title: 'Agni Gayatri Mantra',
        deity: ['Agni'],
        tags: ['fire'],
        originalLanguage: 'ॐ महाज्वालाय विद्महे',
        transliteration_en: 'Om Mahajwalaya Vidmahe',
        translation_en: 'Om, we meditate on the great flame',
        translation_hi: 'ओम',
        backgroundImage: 'backgroundimage/x.webp',
      },
    ],
  });
  const sink = new MemoryUsageSink();
  const limiter = new RateLimiter();
  if (rate)
    limiter.take = (
      (take) => (id) =>
        take.call(limiter, id, rate)
    )(limiter.take);
  const server = createApiServer({
    keys: new KeyResolver(store, { ttlMs: 0 }),
    content,
    media: new MemoryMedia(files),
    meter: new UsageMeter(sink, { ttlMs: 0, keyActivity: store }),
    limiter,
    logger: { error() {} },
    ...serverOptions,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, key, init = {}) => {
    const response = await fetch(base + path, {
      redirect: 'manual',
      ...init,
      headers: { ...init.headers, ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  return { store, keys, sink, call };
}

test('requests without a valid, active key are rejected and not charged', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call('/v1/shlokas')).status, 401);
  assert.equal((await f.call('/v1/shlokas', 'not-a-key')).body.error.code, 'invalid_api_key');
  assert.equal((await f.call('/v1/shlokas', `mtr_live_${secret()}`)).status, 401);
  assert.equal((await f.call('/v1/shlokas', f.keys.production, { headers: {} })).status, 200);
  const keyId = (await f.store.getWorkspace('w1')).keys.find(
    (k) => k.environment === 'production',
  ).id;
  await f.store.transact('w1', (w) => {
    w.keys.find((k) => k.id === keyId).status = 'revoked';
  });
  assert.equal((await f.call('/v1/shlokas', f.keys.production)).body.error.code, 'revoked_api_key');
  assert.equal(f.sink.events.length, 1);
  assert.equal((await f.call('/v1')).status, 200);
  assert.equal((await f.call('/v1/shlokas', f.keys.sandbox, { method: 'POST' })).status, 405);
});

test('production keys need a paid plan', async (t) => {
  const f = await fixture(t, { plan: 'Sandbox' });
  const r = await f.call('/v1/shlokas', f.keys.production);
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'plan_inactive');
  assert.equal((await f.call('/v1/shlokas', f.keys.sandbox)).status, 200);
});

test('lists paginate with an opaque cursor and filter by deity', async (t) => {
  const f = await fixture(t);
  const first = await f.call('/v1/shlokas?limit=5', f.keys.production);
  assert.equal(first.status, 200);
  assert.deepEqual(
    first.body.data.map((s) => s.id),
    ['shloka-01', 'shloka-02', 'shloka-03', 'shloka-04', 'shloka-05'],
  );
  assert.ok(first.body.nextCursor);
  const second = await f.call(
    `/v1/shlokas?limit=5&cursor=${first.body.nextCursor}`,
    f.keys.production,
  );
  assert.equal(second.body.data[0].id, 'shloka-06');
  const shiva = await f.call('/v1/shlokas?limit=100&deity=shiva', f.keys.production);
  assert.ok(shiva.body.data.every((s) => s.deity.id === 'shiva'));
  assert.equal(shiva.body.nextCursor, null);
  assert.equal(
    (await f.call('/v1/shlokas?limit=500', f.keys.production)).body.error.code,
    'invalid_limit',
  );
  assert.equal(
    (await f.call('/v1/shlokas?cursor=%2F%2F', f.keys.production)).body.error.code,
    'invalid_cursor',
  );
});

test('responses use the public shape and never expose storage paths or links', async (t) => {
  const f = await fixture(t);
  const detail = await f.call('/v1/shlokas/shloka-01', f.keys.production);
  assert.equal(detail.body.data.verses[0].wordMeanings[0].meaning, 'the sacred syllable');
  assert.equal(detail.body.data.audio.href, '/v1/shlokas/shloka-01/audio');
  const serialized = JSON.stringify(detail.body);
  for (const leak of ['shlokam_audio', 'firebasestorage', 'audioPath', 'themeColor'])
    assert.ok(!serialized.includes(leak), `leaked ${leak}`);
  const mantra = await f.call('/v1/mantras/agni_gayatri_mantra', f.keys.production);
  assert.deepEqual(mantra.body.data.translations, {
    en: 'Om, we meditate on the great flame',
    hi: 'ओम',
  });
  assert.ok(!JSON.stringify(mantra.body).includes('backgroundimage'));
  assert.equal((await f.call('/v1/shlokas/missing-id', f.keys.production)).status, 404);
  assert.equal(
    (await f.call('/v1/mantras/agni_gayatri_mantra/audio', f.keys.production)).status,
    404,
  );
});

test('sandbox keys only see the sample catalog', async (t) => {
  const f = await fixture(t);
  const list = await f.call('/v1/shlokas?limit=100', f.keys.sandbox);
  assert.equal(list.body.data.length, SANDBOX_SAMPLE_SIZE);
  assert.equal(list.body.sandbox, true);
  assert.equal((await f.call('/v1/shlokas/shloka-01', f.keys.sandbox)).status, 200);
  const outside = await f.call('/v1/shlokas/shloka-09', f.keys.sandbox);
  assert.equal(outside.status, 403);
  assert.equal(outside.body.error.code, 'sandbox_sample_only');
  assert.equal((await f.call('/v1/shlokas/shloka-01/audio', f.keys.sandbox)).status, 302);
});

test('audio redirects to a short-lived link and is charged by size', async (t) => {
  const f = await fixture(t);
  const redirect = await f.call('/v1/shlokas/shloka-02/audio', f.keys.production);
  assert.equal(redirect.status, 302);
  assert.match(redirect.headers.get('location'), /^https:\/\/media\.test\//);
  const json = await f.call('/v1/shlokas/shloka-02/audio?format=json', f.keys.production);
  assert.equal(json.body.data.bytes, 4 * 1024 * 1024);
  assert.ok(Date.parse(json.body.data.expiresAt) > Date.now());
  assert.equal(
    (await f.call('/v1/shlokas/shloka-13/audio', f.keys.production)).body.error.code,
    'audio_unavailable',
  );
  const charged = f.sink.events.filter((e) => e.endpoint === 'shlokas.audio');
  assert.equal(charged.length, 2);
  assert.equal(charged[0].audioBytes, 4 * 1024 * 1024);
  assert.equal(charged[0].period, currentPeriod());
});

test('sandbox audio stops at its allowance', async (t) => {
  const f = await fixture(t, { plan: 'Sandbox', rate: { rate: 1000, burst: 1000 } });
  const perFile = 4 * 1024 * 1024,
    allowed = Math.floor(SANDBOX_AUDIO_BYTES / perFile);
  for (let i = 0; i < allowed; i++)
    assert.equal((await f.call('/v1/shlokas/shloka-01/audio', f.keys.sandbox)).status, 302);
  const over = await f.call('/v1/shlokas/shloka-01/audio', f.keys.sandbox);
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, 'audio_quota_exceeded');
});

test('monthly request quota and per-key rate limits', async (t) => {
  const f = await fixture(t, { plan: 'Sandbox', rate: { rate: 1000, burst: 1000 } });
  f.sink.events.push({ workspaceId: 'w1', period: currentPeriod(), requests: 999, audioBytes: 0 });
  assert.equal((await f.call('/v1/shlokas', f.keys.sandbox)).status, 200);
  const over = await f.call('/v1/shlokas', f.keys.sandbox);
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, 'quota_exceeded');

  const g = await fixture(t, { rate: { rate: 1, burst: 2 } });
  assert.equal((await g.call('/v1/shlokas', g.keys.production)).status, 200);
  assert.equal((await g.call('/v1/shlokas', g.keys.production)).status, 200);
  const limited = await g.call('/v1/shlokas', g.keys.production);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, 'rate_limited');
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});

test('astrology calculations cost one content request on sandbox and production keys', async (t) => {
  const f = await fixture(t),
    post = (key, body) =>
      f.call('/v1/astrology/calculate', key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    input = { operation: 'positions', datetime: '2026-11-07T12:00:00Z' },
    charged = () => f.sink.events.filter((e) => e.endpoint === 'astrology.positions');
  for (const key of [f.keys.sandbox, f.keys.production]) {
    const result = await post(key, input);
    assert.equal(result.status, 200);
    assert.equal(result.body.calculated, true);
    assert.equal(result.body.data.planets.length, 7);
  }
  assert.deepEqual(
    charged().map((e) => [e.requests, e.audioBytes]),
    [
      [1, 0],
      [1, 0],
    ],
  );
  assert.equal((await post(f.keys.sandbox, { ...input, datetime: 'bad' })).status, 400);
  assert.equal((await post(undefined, input)).status, 401);
  assert.equal(charged().length, 2);
  assert.equal((await f.call('/v1/astrology/calculate', f.keys.sandbox)).status, 405);
  assert.equal((await f.call('/v1/shlokas', f.keys.sandbox, { method: 'POST' })).status, 405);
});

test('astrology calculations stop at the monthly request quota', async (t) => {
  const f = await fixture(t, { plan: 'Sandbox' });
  f.sink.events.push({ workspaceId: 'w1', period: currentPeriod(), requests: 1000, audioBytes: 0 });
  const over = await f.call('/v1/astrology/calculate', f.keys.sandbox, {
    method: 'POST',
    body: JSON.stringify({ operation: 'panchang', datetime: '2026-11-07T12:00:00Z' }),
  });
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, 'quota_exceeded');
});

test('repeated invalid keys from one client are throttled', async (t) => {
  const f = await fixture(t);
  const codes = [];
  for (let i = 0; i < 12; i++)
    codes.push((await f.call('/v1/shlokas', `mtr_live_${secret()}`)).status);
  assert.deepEqual(codes.slice(0, 10), Array(10).fill(401));
  assert.equal(codes.at(-1), 429);
});

test('console key changes keep the per-key index in sync', async () => {
  const store = new MemoryStore();
  await store.ensureWorkspace('w2', 'u', 'X');
  const raw = `mtr_sbx_${secret()}`;
  await store.transact('w2', (w) => {
    w.keys.push({
      id: 'k1',
      name: 'n',
      environment: 'sandbox',
      prefix: raw.slice(0, 16),
      hash: hash(raw),
      status: 'active',
      createdAt: 'now',
    });
  });
  assert.equal((await store.findKey(hash(raw))).status, 'active');
  await store.transact('w2', (w) => {
    w.keys[0].status = 'revoked';
  });
  const record = await store.findKey(hash(raw));
  assert.equal(record.status, 'revoked');
  assert.equal(record.workspaceId, 'w2');
  assert.equal(record.id, 'k1');
  assert.ok(!('hash' in record));
});

async function addKey(store, environment, raw = newApiKey(environment)) {
  await store.transact('w1', (w) => {
    w.keys.push({
      id: randomUUID(),
      name: 'extra',
      environment,
      prefix: raw.slice(0, 16),
      hash: hash(raw),
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    });
  });
  return raw;
}

function countLookups(store) {
  const counter = { reads: 0 },
    findKey = store.findKey.bind(store);
  store.findKey = (keyHash) => {
    counter.reads += 1;
    return findKey(keyHash);
  };
  return counter;
}

test('keys with a checksum work; a bad checksum is refused without a database read', async (t) => {
  const f = await fixture(t),
    raw = await addKey(f.store, 'production'),
    lookups = countLookups(f.store);
  assert.equal((await f.call('/v1/shlokas', raw)).status, 200);
  assert.equal(lookups.reads, 1);
  const last = raw.at(-1) === 'A' ? 'B' : 'A',
    tampered = await f.call('/v1/shlokas', raw.slice(0, -1) + last);
  assert.equal(tampered.body.error.code, 'invalid_api_key');
  assert.equal(lookups.reads, 1);
});

test('extra keys do not add rate-limit capacity, and sandbox cannot starve production', async (t) => {
  const f = await fixture(t, { rate: { rate: 0.001, burst: 2 } }),
    second = await addKey(f.store, 'production');
  assert.equal((await f.call('/v1/shlokas', f.keys.production)).status, 200);
  assert.equal((await f.call('/v1/shlokas', second)).status, 200);
  const limited = await f.call('/v1/shlokas', second);
  assert.equal(limited.body.error.code, 'rate_limited');
  assert.equal((await f.call('/v1/shlokas', f.keys.sandbox)).status, 200);
});

test('a throttled client causes no lookups, and a forged forwarding header cannot evade it', async (t) => {
  const f = await fixture(t, { trustProxy: true }),
    lookups = countLookups(f.store);
  const attempt = (n) =>
    f.call('/v1/shlokas', `mtr_live_${secret()}`, {
      headers: { 'X-Forwarded-For': `10.0.0.${n}, 203.0.113.9` },
    });
  for (let i = 0; i < 10; i++) assert.equal((await attempt(i)).status, 401);
  assert.equal(lookups.reads, 10);
  const blocked = await attempt(99);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error.code, 'too_many_failed_attempts');
  assert.equal(lookups.reads, 10);
});

test('unknown keys are cached, so repeating one costs a single lookup', async () => {
  let reads = 0;
  const resolver = new KeyResolver({
      findKey: async () => {
        reads += 1;
        return null;
      },
    }),
    raw = `mtr_live_${secret()}`;
  await assert.rejects(resolver.resolve(raw), { code: 'invalid_api_key' });
  await assert.rejects(resolver.resolve(raw), { code: 'invalid_api_key' });
  assert.equal(reads, 1);
});

test('public API requests record when the key was last used', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call('/v1/shlokas', f.keys.production)).status, 200);
  await new Promise((resolve) => setImmediate(resolve));
  const { id } = (await f.store.getWorkspace('w1')).keys.find(
    (k) => k.environment === 'production',
  );
  assert.ok((await f.store.keyActivity('w1'))[id]);
});

test('last-used writes are limited per key', async () => {
  const writes = [],
    meter = new UsageMeter(new MemoryUsageSink(), {
      keyActivity: { touchKey: async (...args) => writes.push(args) },
    });
  await meter.record({ workspaceId: 'w', keyId: 'k', endpoint: 'e' });
  await meter.record({ workspaceId: 'w', keyId: 'k', endpoint: 'e' });
  await meter.record({ workspaceId: 'w', keyId: 'other', endpoint: 'e' });
  assert.deepEqual(
    writes.map(([, keyId]) => keyId),
    ['k', 'other'],
  );
});

test('Firestore usage records daily endpoints and the console adds its shards together', async () => {
  const written = [];
  await new FirestoreUsageSink({
    doc: (path) => ({ set: async (data) => written.push({ path, data }) }),
  }).add({
    workspaceId: 'w',
    keyId: 'k',
    endpoint: 'shlokas.list',
    requests: 1,
    audioBytes: 0,
    period: '2026-11',
    at: new Date('2026-11-08T10:00:00Z'),
  });
  assert.ok(written[0].data.daily['2026-11-08'].endpoints['shlokas.list']);
  const shard = {
    contentRequests: 2,
    audioBytes: 10,
    endpoints: { 'shlokas.list': 2 },
    daily: {
      '2026-11-08': { contentRequests: 2, audioBytes: 10, endpoints: { 'shlokas.list': 2 } },
    },
  };
  const filters = [],
    query = {
      where(...args) {
        filters.push(args);
        return query;
      },
      get: async () => ({ docs: [{ data: () => shard }, { data: () => shard }] }),
    };
  const total = await new FirestoreStore({ collection: () => query }).apiUsage('w', '2026-11');
  assert.deepEqual(filters, [
    ['workspaceId', '==', 'w'],
    ['period', '==', '2026-11'],
  ]);
  assert.equal(total.contentRequests, 4);
  assert.equal(total.daily['2026-11-08'].endpoints['shlokas.list'], 4);
});
