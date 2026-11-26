import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MemoryStore, FirestoreStore } from '../server/store.mjs';
import { hash, secret, currentPeriod, newApiKey, allowance, getPlan } from '../server/domain.mjs';
import { KeyResolver } from '../api/keys.mjs';
import { MemoryContent, SANDBOX_SAMPLE_SIZE } from '../api/content.mjs';
import { MemoryMedia } from '../api/media.mjs';
import {
  FirestoreUsageSink,
  MemoryUsageSink,
  UsageMeter,
  RateLimiter,
  SANDBOX_AUDIO_BYTES,
  exactMargin,
  limitsFor,
} from '../api/usage.mjs';
import { createApiServer } from '../api/server.mjs';
import { createAstrologyService } from '../server/astrology/service.mjs';
import { demoPustak, FirestorePustak } from '../server/pustak.mjs';

const mantra = (n, extra = {}) => ({
  id: `mantra-${String(n).padStart(2, '0')}`,
  title: `Mantra ${n}`,
  deityKey: n % 2 ? 'shiva' : 'devi',
  deity: n % 2 ? 'Lord Shiva' : 'Devi',
  category: 'Stotras',
  source: 'Sanatana Shastras',
  seoDescription: 'Short example',
  description: 'Internal general description',
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

async function fixture(
  t,
  { plan = 'Starter', rate, billingMode = 'live', testPlan, ...serverOptions } = {},
) {
  const store = new MemoryStore();
  await store.ensureWorkspace('w1', 'owner', 'Acme');
  await store.transact('w1', (w) => {
    w.plan = plan;
    if (testPlan) w.testPlan = testPlan;
  });
  const keys = {};
  for (const [name, kind] of [
    ['sandbox', 'sbx'],
    ['live', 'live'],
  ]) {
    const raw = `mtr_${kind}_${secret()}`;
    keys[name] = raw;
    await store.transact('w1', (w) => {
      w.keys.push({
        id: randomUUID(),
        name,
        prefix: raw.slice(0, 16),
        hash: hash(raw),
        status: 'active',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      });
    });
  }
  const mantras = Array.from({ length: 12 }, (_, i) => mantra(i + 1));
  mantras.push(mantra(13, { hasAudio: false, audioPath: null, seoDescription: '  ' }));
  const files = Object.fromEntries(
    mantras.map((s) => [s.audioPath, { bytes: 4 * 1024 * 1024, contentType: 'audio/x-m4a' }]),
  );
  const content = new MemoryContent({ mantras });
  const sink = new MemoryUsageSink();
  const limiter = new RateLimiter();
  if (rate)
    limiter.take = (
      (take) => (id) =>
        take.call(limiter, id, rate)
    )(limiter.take);
  const server = createApiServer({
    keys: new KeyResolver(store, { ttlMs: 0, billingMode }),
    billingMode,
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
  assert.equal((await f.call('/v1/mantras')).status, 401);
  assert.equal((await f.call('/v1/mantras', 'not-a-key')).body.error.code, 'invalid_api_key');
  assert.equal((await f.call('/v1/mantras', `mtr_live_${secret()}`)).status, 401);
  assert.equal((await f.call('/v1/mantras', f.keys.live, { headers: {} })).status, 200);
  const keyId = (await f.store.getWorkspace('w1')).keys.find((k) => k.name === 'live').id;
  await f.store.transact('w1', (w) => {
    w.keys.find((k) => k.id === keyId).status = 'revoked';
  });
  assert.equal((await f.call('/v1/mantras', f.keys.live)).body.error.code, 'revoked_api_key');
  assert.equal(f.sink.events.length, 1);
  assert.equal((await f.call('/v1')).status, 200);
  assert.equal((await f.call('/v1/mantras', f.keys.sandbox, { method: 'POST' })).status, 405);
});

test('prose books return chapter sections with source references', async (t) => {
  const header = {
    chapter: 1,
    name: 'The opening',
    format: 'prose',
    source: 'Ramayana — Bala Kanda',
    sectionCount: 1,
    verseCount: 0,
  };
  const sections = [{ sectionNumber: 1, title: 'Ayodhya', paragraphs: ['The story begins.'] }];
  const docs = {
    'pustak_metadata/catalogue': {
      books: [{ id: 'ramayana', isLive: true, format: 'prose', language: 'en', totalVerses: 0 }],
    },
    'pustak/ramayana': { isLive: true, chapterIndex: [header] },
    'pustak/ramayana/chapters/1': { ...header, sections },
  };
  const books = new FirestorePustak({
    doc(path) {
      assert.ok(docs[path]);
      return {
        get: async () => ({
          exists: true,
          get: (key) => docs[path][key],
          data: () => docs[path],
        }),
      };
    },
  });
  const f = await fixture(t, { books });
  const path = '/v1/books/ramayana';
  const book = await f.call(path, f.keys.live);
  assert.equal(book.status, 200);
  assert.equal(book.body.data.format, 'prose');
  assert.equal(book.body.data.language, 'en');
  assert.equal(book.body.data.chapters[0].source, header.source);
  assert.equal(book.body.data.chapters[0].sections, undefined);

  const chapter = await f.call(`${path}/chapters/1`, f.keys.live);
  assert.equal(chapter.status, 200);
  assert.deepEqual(chapter.body.data.sections, sections);
  assert.deepEqual(chapter.body.data.verses, []);
  assert.equal(chapter.body.data.nextOffset, null);
  assert.equal((await f.call(`${path}/chapters/1?offset=30`, f.keys.live)).status, 404);
  assert.equal((await f.call(path, f.keys.sandbox)).status, 404);
});

test('book discovery and reading honor authentication, previews, and usage', async (t) => {
  const f = await fixture(t, { books: demoPustak });
  const discovery = await f.call('/v1');
  assert.ok(discovery.body.resources.includes('/v1/books/{id}/chapters/{chapter}'));
  assert.ok(discovery.body.resources.includes('/v1/mantras/{id}/audio'));
  assert.ok(!discovery.body.resources.some((path) => path.includes('shloka')));
  assert.equal((await f.call('/v1/books')).status, 401);

  const sample = await f.call('/v1/books', f.keys.sandbox);
  assert.equal(sample.body.sandbox, true);
  assert.equal(sample.body.data[0].id, 'demo-pustak');
  const path = '/v1/books/demo-pustak';
  const preview = await f.call(path, f.keys.sandbox);
  assert.deepEqual(
    preview.body.data.chapters.map(({ number }) => number),
    [1],
  );
  const opening = await f.call(`${path}/chapters/1`, f.keys.sandbox);
  assert.equal(opening.body.data.verses.length, 3);
  assert.equal(opening.body.data.nextOffset, null);
  assert.equal((await f.call(`${path}/chapters/1?offset=3`, f.keys.sandbox)).status, 404);
  assert.equal((await f.call(`${path}/chapters/2`, f.keys.sandbox)).status, 404);

  const full = await f.call(path, f.keys.live);
  assert.deepEqual(
    full.body.data.chapters.map(({ number }) => number),
    [1, 2],
  );
  const chapter = await f.call(`${path}/chapters/2`, f.keys.live);
  assert.equal(chapter.body.data.verses.length, 4);
  assert.equal(chapter.body.sandbox, undefined);
  assert.equal(net(f.sink, 'sandbox'), 3);
  assert.equal(net(f.sink, 'live'), 2);
});

test('live keys need a paid plan; sandbox keys read the sample on every plan', async (t) => {
  const free = await fixture(t, { plan: 'Free' });
  const refused = await free.call('/v1/mantras', free.keys.live);
  assert.equal(refused.status, 403);
  assert.equal(refused.body.error.code, 'plan_inactive');
  const sample = await free.call('/v1/mantras?limit=100', free.keys.sandbox);
  assert.equal(sample.body.data.length, SANDBOX_SAMPLE_SIZE);
  const paid = await fixture(t);
  assert.equal(
    (await paid.call('/v1/mantras?limit=100', paid.keys.sandbox)).body.data.length,
    SANDBOX_SAMPLE_SIZE,
  );
  const full = await paid.call('/v1/mantras?limit=100', paid.keys.live);
  assert.equal(full.body.data.length, 13);
  assert.equal(full.body.sandbox, undefined);
});

test('lists paginate with an opaque cursor and filter by deity', async (t) => {
  const f = await fixture(t);
  const sample = await f.call('/v1/mantras?limit=1', f.keys.sandbox);
  assert.ok(sample.body.nextCursor);
  const sampleNext = await f.call(
    `/v1/mantras?limit=1&cursor=${sample.body.nextCursor}`,
    f.keys.sandbox,
  );
  assert.equal(sampleNext.body.data[0].id, 'mantra-02');
  const first = await f.call('/v1/mantras?limit=5', f.keys.live);
  assert.equal(first.status, 200);
  assert.deepEqual(
    first.body.data.map((s) => s.id),
    ['mantra-01', 'mantra-02', 'mantra-03', 'mantra-04', 'mantra-05'],
  );
  assert.ok(first.body.nextCursor);
  const second = await f.call(`/v1/mantras?limit=5&cursor=${first.body.nextCursor}`, f.keys.live);
  assert.equal(second.body.data[0].id, 'mantra-06');
  const shiva = await f.call('/v1/mantras?limit=100&deity=shiva', f.keys.live);
  assert.ok(shiva.body.data.every((s) => s.deity.id === 'shiva'));
  assert.equal(shiva.body.nextCursor, null);
  assert.equal(
    (await f.call('/v1/mantras?limit=500', f.keys.live)).body.error.code,
    'invalid_limit',
  );
  assert.equal(
    (await f.call('/v1/mantras?cursor=%2F%2F', f.keys.live)).body.error.code,
    'invalid_cursor',
  );
});

test('responses use the public shape and never expose storage paths or links', async (t) => {
  const f = await fixture(t);
  const detail = await f.call('/v1/mantras/mantra-01', f.keys.live);
  assert.equal(detail.body.data.verses[0].translation, null);
  assert.deepEqual(detail.body.data.verses[0].wordMeanings, []);
  assert.equal(detail.body.data.audio.href, '/v1/mantras/mantra-01/audio');
  assert.equal(detail.body.data.description, 'Short example');
  assert.ok(!('seoDescription' in detail.body.data));
  const serialized = JSON.stringify(detail.body);
  for (const leak of [
    'shlokam_audio',
    'firebasestorage',
    'audioPath',
    'themeColor',
    'Internal general description',
  ])
    assert.ok(!serialized.includes(leak), `leaked ${leak}`);
  assert.equal((await f.call('/v1/mantras/missing-id', f.keys.live)).status, 404);
  // The former name still answers, so existing integrations keep working.
  const legacy = await f.call('/v1/shlokas/mantra-01', f.keys.live);
  assert.equal(legacy.body.data.audio.href, '/v1/mantras/mantra-01/audio');
});

test('description is the SEO paragraph in list, detail, sandbox and live', async (t) => {
  const f = await fixture(t);
  for (const key of [f.keys.live, f.keys.sandbox]) {
    const list = await f.call('/v1/mantras?limit=3', key);
    assert.deepEqual(
      list.body.data.map((m) => m.description),
      ['Short example', 'Short example', 'Short example'],
    );
    assert.ok(list.body.data.every((m) => !('seoDescription' in m)));
    assert.equal(
      (await f.call('/v1/mantras/mantra-01', key)).body.data.description,
      'Short example',
    );
  }
  // No SEO paragraph: null, as for every other missing field. The general text never fills in.
  const bare = await f.call('/v1/mantras/mantra-13', f.keys.live);
  assert.equal(bare.body.data.description, null);
  assert.ok(!JSON.stringify(bare.body).includes('Internal general description'));
});

test('sandbox keys only see the sample catalog, even on a paid plan', async (t) => {
  const f = await fixture(t);
  const list = await f.call('/v1/mantras?limit=100', f.keys.sandbox);
  assert.equal(list.body.data.length, SANDBOX_SAMPLE_SIZE);
  assert.equal(list.body.sandbox, true);
  assert.equal((await f.call('/v1/mantras/mantra-01', f.keys.sandbox)).status, 200);
  const outside = await f.call('/v1/mantras/mantra-09', f.keys.sandbox);
  assert.equal(outside.status, 403);
  assert.equal(outside.body.error.code, 'sandbox_sample_only');
  assert.equal((await f.call('/v1/mantras/mantra-01/audio', f.keys.sandbox)).status, 302);
});

test('audio redirects to a short-lived link and is charged by size', async (t) => {
  const f = await fixture(t);
  const redirect = await f.call('/v1/mantras/mantra-02/audio', f.keys.live);
  assert.equal(redirect.status, 302);
  assert.match(redirect.headers.get('location'), /^https:\/\/media\.test\//);
  const json = await f.call('/v1/mantras/mantra-02/audio?format=json', f.keys.live);
  assert.equal(json.body.data.bytes, 4 * 1024 * 1024);
  assert.ok(Date.parse(json.body.data.expiresAt) > Date.now());
  assert.equal(
    (await f.call('/v1/mantras/mantra-13/audio', f.keys.live)).body.error.code,
    'audio_unavailable',
  );
  const audio = f.sink.events.filter((e) => e.endpoint === 'mantras.audio'),
    bytes = audio.filter((e) => e.audioBytes > 0),
    requests = audio.reduce((sum, e) => sum + e.requests, 0);
  assert.equal(bytes.length, 2);
  assert.equal(bytes[0].audioBytes, 4 * 1024 * 1024);
  assert.equal(bytes[0].period, currentPeriod());
  assert.equal(bytes[0].lane, 'live');
  // Two links counted; the missing recording was refunded.
  assert.equal(requests, 2);
});

test('public recording previews need no key, are limited per IP and are not metered', async (t) => {
  const f = await fixture(t);
  const ok = await f.call('/v1/public/mantras/mantra-02/preview');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), '*');
  assert.match(ok.body.data.url, /^https:\/\/media\.test\//);
  assert.ok(Date.parse(ok.body.data.expiresAt) > Date.now());
  assert.equal(
    (await f.call('/v1/public/mantras/mantra-13/preview')).body.error.code,
    'audio_unavailable',
  );
  assert.equal((await f.call('/v1/public/mantras/missing/preview')).status, 404);
  for (let i = 0; i < 7; i++) await f.call('/v1/public/mantras/mantra-02/preview');
  const limited = await f.call('/v1/public/mantras/mantra-02/preview');
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, 'preview_limited');
  assert.equal(f.sink.events.length, 0);
});

test('repeat previews reuse the recording path and signed link', async (t) => {
  const content = new MemoryContent({
    mantras: [mantra(2), mantra(13, { hasAudio: false, audioPath: null })],
  });
  const media = new MemoryMedia({});
  let reads = 0,
    signs = 0;
  const get = content.get.bind(content),
    sign = media.sign.bind(media);
  content.get = (...args) => (reads++, get(...args));
  media.sign = (...args) => (signs++, sign(...args));
  const f = await fixture(t, { content, media });

  const first = await f.call('/v1/public/mantras/mantra-02/preview');
  const second = await f.call('/v1/public/mantras/mantra-02/preview');
  assert.equal(first.status, 200);
  assert.equal(second.body.data.url, first.body.data.url);
  assert.equal(second.body.data.expiresAt, first.body.data.expiresAt);
  assert.equal(reads, 1);
  assert.equal(signs, 1);
  assert.doesNotMatch(second.headers.get('server-timing'), /content|sign/);
  // A mantra without a recording is never cached as playable.
  assert.equal((await f.call('/v1/public/mantras/mantra-13/preview')).status, 404);
  assert.equal((await f.call('/v1/public/mantras/mantra-13/preview')).status, 404);
  assert.equal(signs, 1);
});

test('Free plan audio stops at its allowance', async (t) => {
  const f = await fixture(t, { plan: 'Free', rate: { rate: 1000, burst: 1000 } });
  const perFile = 4 * 1024 * 1024,
    allowed = Math.floor(SANDBOX_AUDIO_BYTES / perFile);
  for (let i = 0; i < allowed; i++)
    assert.equal((await f.call('/v1/mantras/mantra-01/audio', f.keys.sandbox)).status, 302);
  const over = await f.call('/v1/mantras/mantra-01/audio', f.keys.sandbox);
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, 'audio_quota_exceeded');
});

test('the Free plan stops at 500 calls a month, and rate limits apply', async (t) => {
  const f = await fixture(t, { plan: 'Free', rate: { rate: 1000, burst: 1000 } });
  f.sink.events.push({ workspaceId: 'w1', period: currentPeriod(), requests: 499, audioBytes: 0 });
  const last = await f.call('/v1/mantras', f.keys.sandbox);
  assert.equal(last.status, 200);
  assert.equal(last.headers.get('x-quota-requests-remaining'), '0');
  const over = await f.call('/v1/mantras', f.keys.sandbox);
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, 'quota_exceeded');

  const g = await fixture(t, { rate: { rate: 1, burst: 2 } });
  assert.equal((await g.call('/v1/mantras', g.keys.live)).status, 200);
  assert.equal((await g.call('/v1/mantras', g.keys.live)).status, 200);
  const limited = await g.call('/v1/mantras', g.keys.live);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, 'rate_limited');
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});

test('an unlimited workspace can exceed both request quotas and still records successful calls', async (t) => {
  const f = await fixture(t, { rate: { rate: 1000, burst: 1000 } });
  const limit = allowance(getPlan('Starter')).requests;
  for (const lane of ['sandbox', 'live']) {
    await f.sink.add({
      workspaceId: 'w1',
      period: currentPeriod(),
      lane,
      requests: limit,
      audioBytes: lane === 'sandbox' ? SANDBOX_AUDIO_BYTES : 0,
    });
    const blocked = await f.call('/v1/mantras', f.keys[lane]);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, 'quota_exceeded');
  }
  await f.store.transact('w1', (w) => {
    w.unlimitedRequestsSince = new Date().toISOString();
  });
  for (const lane of ['sandbox', 'live']) {
    const result = await f.call('/v1/mantras', f.keys[lane]);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('x-quota-requests-remaining'), 'unlimited');
    assert.equal(net(f.sink, lane), limit + 1);
  }
  const audio = await f.call('/v1/mantras/mantra-01/audio', f.keys.sandbox);
  assert.equal(audio.status, 429);
  assert.equal(audio.body.error.code, 'audio_quota_exceeded');
  assert.equal(audio.headers.get('x-quota-requests-remaining'), 'unlimited');
  assert.equal(net(f.sink, 'sandbox'), limit + 1);

  await f.store.transact('w1', (w) => {
    delete w.unlimitedRequestsSince;
  });
  assert.equal((await f.call('/v1/mantras', f.keys.live)).body.error.code, 'quota_exceeded');
});

test('only an explicit live promo grants a free workspace production catalog access', async (t) => {
  const f = await fixture(t, { plan: 'Free' });
  const get = () => f.call('/v1/mantras/mantra-12', f.keys.live);
  await f.store.transact('w1', (w) => {
    w.unlimitedRequestsSince = new Date().toISOString();
  });
  assert.equal((await get()).body.error.code, 'plan_inactive');
  await f.store.transact('w1', (w) => {
    w.promoLiveAccess = true;
  });
  const result = await get();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('x-quota-requests-remaining'), 'unlimited');
  assert.equal(result.headers.get('x-ratelimit-limit'), '2');
  await f.store.transact('w1', (w) => {
    delete w.unlimitedRequestsSince;
  });
  assert.equal((await get()).body.error.code, 'plan_inactive');
});

test('Vedic operations are authenticated, normalized, and refunded on upstream errors', async (t) => {
  const sign = { sign_id: 2, sign: 'Taurus' };
  const chart = {
    ascendant: { ...sign, degree: 33.5 },
    planets: [{ ...sign, name: 'Moon', absolute_degree: 52, house: 1 }],
    houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: 'Example' })),
  };
  const lunar = { name: 'Example', number: 1, ends_at_iso: '2026-11-12T01:00:00+05:30' };
  const period = { level: 'Mahadasha', lord: 'Venus', start: '2020-01-01', end: '2040-01-01' };
  const upstream = new Map([
    [
      '/vedic/calculate',
      {
        chart,
        vargas: { vargas: { D9: chart } },
        vimshottari_dasha: {
          birth_balance: { lord: 'Venus' },
          timeline: [period],
          active_periods: [period],
        },
      },
    ],
    [
      '/vedic/panchang',
      {
        date: '2026-11-11',
        sunrise: '06:32',
        sunset: '17:28',
        tithi: lunar,
        nakshatra: lunar,
        yoga: lunar,
        karanas: [lunar],
        rahu_kalam: { start: '12:00', end: '13:30' },
      },
    ],
    [
      '/vedic/match',
      {
        ashtakoota: {
          score: 27,
          max_score: 36,
          kootas: Array.from({ length: 8 }, () => ({ score: 1, max_score: 2 })),
        },
      },
    ],
    [
      '/geo/search',
      { results: [{ name: 'New Delhi', lat: 28.6, lng: 77.2, timezone: 'Asia/Kolkata' }] },
    ],
  ]);
  const outbound = [];
  let outage = false;
  const astrologyService = createAstrologyService({
    key: 'server-only-fixture',
    fetcher: async (url, init) => {
      assert.equal(init.headers['x-api-key'], 'server-only-fixture');
      const parsed = new URL(url);
      const path = parsed.pathname.replace('/api/v2', '');
      outbound.push({
        path,
        payload: init.body ? JSON.parse(init.body) : null,
        query: parsed.searchParams.get('q'),
      });
      if (outage) return new Response('private upstream message', { status: 429 });
      if (path === '/vedic/visual/chart')
        return new Response(Buffer.from('89504e470d0a1a0a', 'hex'), {
          headers: { 'Content-Type': 'image/png' },
        });
      assert.ok(upstream.has(path));
      return Response.json({
        ...upstream.get(path),
        metadata: { vendor: 'private upstream identity' },
      });
    },
  });
  const f = await fixture(t, { astrologyService });
  const place = { latitude: 28.6, longitude: 77.2, timezone: 'Asia/Kolkata' };
  const birth = { ...place, datetime: '1995-06-20T12:30:00+05:30' };
  const call = (data, key = f.keys.live) =>
    f.call('/v1/astrology/calculate', key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  const kundli = { operation: 'chart', birth, dashaLevels: 1, referenceDate: '2026-11-11' };
  assert.equal((await call(kundli, null)).status, 401);
  assert.equal(
    (await call({ ...kundli, birth: { ...birth, datetime: '1995-06-20T12:30:00Z' } })).body.error
      .code,
    'invalid_local_time',
  );
  const repeated = {
    ...birth,
    timezone: 'America/New_York',
    datetime: '2026-11-01T01:30:00-04:00',
  };
  assert.equal(
    (await call({ ...kundli, birth: repeated })).body.error.code,
    'ambiguous_local_time',
  );
  assert.equal(outbound.length, 0);
  const result = await call(kundli);
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.body.data.charts.map((row) => row.division),
    [1, 9],
  );
  assert.equal(result.body.data.charts[0].houses[0].rashi.number, 2);
  assert.equal(result.body.data.vimshottariDasha.activePeriods[0].lord, 'Venus');
  assert.equal(outbound[0].payload.ayanamsha, 'lahiri');
  assert.equal(outbound[0].payload.tz_str, 'Asia/Kolkata');
  assert.equal(outbound[0].payload.reference_date, '2026-11-11');
  assert.ok(!JSON.stringify(result.body).includes('private upstream identity'));

  const daily = await call({ operation: 'daily-panchang', date: '2026-11-11', ...place });
  assert.equal(daily.body.data.tithi.endsAt, '2026-11-12T01:00:00+05:30');
  const match = await call({ operation: 'match', person1: birth, person2: birth });
  assert.equal(match.body.data.maxScore, 36);
  const image = await call({ operation: 'chart-image', birth, layout: 'east' });
  assert.equal(image.body.data.contentType, 'image/png');
  assert.equal(outbound[3].payload.chart_style, 'east_indian');
  const places = await call({ operation: 'places', query: 'New Delhi' });
  assert.equal(places.body.data.places[0].timezone, 'Asia/Kolkata');
  assert.equal(outbound[4].query, 'New Delhi');

  outage = true;
  const failure = await call(kundli);
  assert.equal(failure.status, 503);
  assert.equal(failure.body.error.code, 'astrology_unavailable');
  assert.ok(!JSON.stringify(failure.body).includes('private upstream message'));
  assert.equal(net(f.sink, 'live'), 5);
});

test('astrology discovery and expanded calculations keep the service identity private', async (t) => {
  const calls = [];
  const f = await fixture(t, {
    astrologyService: createAstrologyService({
      key: 'server-fixture',
      fetcher: async (url, init) => {
        calls.push({ url: new URL(url), init });
        return Response.json({
          life_path: 8,
          provider: 'FreeAstroAPI',
          docs: 'https://www.freeastroapi.com/docs/numerology/profile',
          api_key: 'server-fixture',
        });
      },
    }),
  });
  const discovery = await f.call('/v1/astrology');
  assert.equal(discovery.status, 200);
  assert.ok(
    discovery.body.data.some(
      ({ id, category }) => id === 'numerology-profile' && category === 'Numerology',
    ),
  );
  assert.ok(discovery.body.data.some(({ id }) => id === 'western-natal'));
  assert.ok(!JSON.stringify(discovery.body).includes('freeastroapi'));
  const calculate = (body, key = f.keys.live) =>
    f.call('/v1/astrology/calculate', key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const params = { subject: { birth_date: '1992-07-16' } };
  assert.equal(
    (await calculate({ operation: 'numerology-profile', parameters: params }, null)).status,
    401,
  );
  assert.equal((await calculate({ operation: 'chinese-bazi', parameters: {} })).status, 400);
  assert.equal(
    (
      await calculate({
        operation: 'numerology-profile',
        parameters: { ...params, api_key: 'other' },
      })
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
  const { body } = await calculate({ operation: 'numerology-profile', parameters: params });
  assert.equal(calls[0].url.pathname, '/api/v1/numerology/profile');
  assert.equal(calls[0].init.headers['x-api-key'], 'server-fixture');
  assert.deepEqual(JSON.parse(calls[0].init.body), params);
  assert.equal(body.data.result.life_path, 8);
  assert.ok(!/freeastroapi|server-fixture/i.test(JSON.stringify(body)));
  await calculate({ operation: 'western-daily-sign', parameters: { sign: 'aries' } });
  assert.equal(calls[1].init.method, 'GET');
  assert.equal(calls[1].url.searchParams.get('sign'), 'aries');
  assert.equal(net(f.sink, 'live'), 2);
});

test('astrology calculations cost one content request on any active key', async (t) => {
  const f = await fixture(t),
    post = (key, body) =>
      f.call('/v1/astrology/calculate', key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    input = { operation: 'positions', datetime: '2026-11-07T12:00:00Z' },
    charged = () => f.sink.events.filter((e) => e.endpoint === 'astrology.positions');
  for (const key of [f.keys.sandbox, f.keys.live]) {
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
  assert.equal((await f.call('/v1/mantras', f.keys.sandbox, { method: 'POST' })).status, 405);
});

test('astrology calculations stop at the monthly request quota', async (t) => {
  const f = await fixture(t, { plan: 'Free' });
  f.sink.events.push({ workspaceId: 'w1', period: currentPeriod(), requests: 500, audioBytes: 0 });
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
    codes.push((await f.call('/v1/mantras', `mtr_live_${secret()}`)).status);
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

async function addKey(store, raw = newApiKey('production')) {
  await store.transact('w1', (w) => {
    w.keys.push({
      id: randomUUID(),
      name: 'extra',
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
    raw = await addKey(f.store),
    lookups = countLookups(f.store);
  assert.equal((await f.call('/v1/mantras', raw)).status, 200);
  assert.equal(lookups.reads, 1);
  const last = raw.at(-1) === 'A' ? 'B' : 'A',
    tampered = await f.call('/v1/mantras', raw.slice(0, -1) + last);
  assert.equal(tampered.body.error.code, 'invalid_api_key');
  assert.equal(lookups.reads, 1);
});

test('extra keys do not add rate-limit capacity, and sandbox cannot starve live', async (t) => {
  const f = await fixture(t, { rate: { rate: 0.001, burst: 2 } }),
    second = await addKey(f.store);
  assert.equal((await f.call('/v1/mantras', f.keys.live)).status, 200);
  assert.equal((await f.call('/v1/mantras', second)).status, 200);
  const limited = await f.call('/v1/mantras', second);
  assert.equal(limited.body.error.code, 'rate_limited');
  assert.equal((await f.call('/v1/mantras', f.keys.sandbox)).status, 200);
});

test('a throttled client causes no lookups, and a forged forwarding header cannot evade it', async (t) => {
  const f = await fixture(t, { trustProxy: true }),
    lookups = countLookups(f.store);
  const attempt = (n) =>
    f.call('/v1/mantras', `mtr_live_${secret()}`, {
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
  assert.equal((await f.call('/v1/mantras', f.keys.live)).status, 200);
  await new Promise((resolve) => setImmediate(resolve));
  const { id } = (await f.store.getWorkspace('w1')).keys.find((k) => k.name === 'live');
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
    endpoint: 'mantras.list',
    requests: 1,
    audioBytes: 0,
    period: '2026-11',
    at: new Date('2026-11-08T10:00:00Z'),
  });
  assert.ok(written[0].data.daily['2026-11-08'].endpoints['mantras.list']);
  const shard = {
    contentRequests: 2,
    audioBytes: 10,
    endpoints: { 'mantras.list': 2 },
    daily: {
      '2026-11-08': { contentRequests: 2, audioBytes: 10, endpoints: { 'mantras.list': 2 } },
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
  assert.equal(total.daily['2026-11-08'].endpoints['mantras.list'], 4);
});

const net = (sink, lane) =>
  sink.events.filter((e) => (e.lane || 'sandbox') === lane).reduce((sum, e) => sum + e.requests, 0);
const preload = (sink, lane, requests, audioBytes = 0) =>
  sink.events.push({
    workspaceId: 'w1',
    keyId: 'seed',
    lane,
    endpoint: 'seed',
    period: currentPeriod(),
    requests,
    audioBytes,
    at: new Date(),
  });

for (const name of ['Starter', 'Growth', 'Business']) {
  test(`${name}: the live key reads the full catalog, and the allowance is a hard stop`, async (t) => {
    const f = await fixture(t, { plan: name, rate: { rate: 1000, burst: 1000 } }),
      quota = allowance(getPlan(name)).requests;
    // Allowed: the full catalog, not the sandbox sample.
    const page = await f.call('/v1/mantras?limit=10', f.keys.live);
    assert.equal(page.status, 200);
    assert.equal(page.body.data.length, 10);
    assert.ok(page.body.nextCursor);
    assert.equal(page.body.sandbox, undefined);
    assert.equal(page.headers.get('x-quota-requests-remaining'), String(quota - 1));
    // Outside the plan: audio beyond the plan's delivery allowance.
    preload(f.sink, 'live', 0, limitsFor(getPlan(name)).audioBytes);
    const audio = await f.call('/v1/mantras/mantra-02/audio', f.keys.live);
    assert.equal(audio.status, 429);
    assert.equal(audio.body.error.code, 'audio_quota_exceeded');
    // Quota: the last request is allowed, the next is refused and costs nothing.
    preload(f.sink, 'live', quota - net(f.sink, 'live') - 1);
    assert.equal((await f.call('/v1/mantras', f.keys.live)).status, 200);
    const over = await f.call('/v1/mantras', f.keys.live);
    assert.equal(over.status, 429);
    assert.equal(over.body.error.code, 'quota_exceeded');
    assert.equal(net(f.sink, 'live'), quota);
    // The sandbox lane has its own allowance, so it still works.
    assert.equal((await f.call('/v1/mantras', f.keys.sandbox)).status, 200);
  });
}

test('concurrent calls near the allowance never go over it', async (t) => {
  const f = await fixture(t, { plan: 'Starter', rate: { rate: 1000, burst: 1000 } }),
    quota = allowance(getPlan('Starter')).requests;
  preload(f.sink, 'live', quota - 5);
  const results = await Promise.all(
    Array.from({ length: 25 }, () => f.call('/v1/mantras?limit=1', f.keys.live)),
  );
  assert.equal(results.filter((r) => r.status === 200).length, 5);
  assert.equal(results.filter((r) => r.body.error?.code === 'quota_exceeded').length, 20);
  assert.equal(net(f.sink, 'live'), quota);
});

test('the meter is exact within its margin even with a cached total', async () => {
  const sink = new MemoryUsageSink(),
    meter = new UsageMeter(sink, { ttlMs: 60_000 }),
    request = { workspaceId: 'w', keyId: 'k', lane: 'live', endpoint: 'x', limit: 300 };
  // Warm the cache, then let other instances use up to the margin behind its back.
  assert.equal((await meter.reserve({ ...request, margin: 100 })).ok, true);
  sink.events.push({ ...request, period: currentPeriod(), requests: 90, audioBytes: 0 });
  const results = await Promise.all(
    Array.from({ length: 300 }, () => meter.reserve({ ...request, margin: 100 })),
  );
  const total = sink.events.reduce((sum, e) => sum + e.requests, 0);
  assert.equal(total, 300);
  assert.equal(results.filter((r) => r.ok).length, 300 - 91);
  assert.equal(exactMargin({ rate: 10 }), 3000);
  assert.equal(exactMargin({ rate: 1 }, { ttlMs: 1000, instances: 2 }), 100);
});

test('refused requests are refunded or never counted', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call('/v1/mantras?limit=500', f.keys.live)).status, 400);
  assert.equal((await f.call('/v1/mantras?cursor=%%%', f.keys.live)).status, 400);
  assert.equal((await f.call('/v1/mantras/nope', f.keys.live)).status, 404);
  assert.equal((await f.call('/v1/mantras/mantra-13/audio', f.keys.live)).status, 404);
  assert.equal((await f.call('/v1/mantras/mantra-12', f.keys.sandbox)).status, 403);
  assert.equal((await f.call('/v1/mantras', 'mtr_live_wrong')).status, 401);
  assert.equal(net(f.sink, 'live'), 0);
  assert.equal(net(f.sink, 'sandbox'), 0);
  assert.equal((await f.call('/v1/mantras/mantra-01', f.keys.live)).status, 200);
  assert.equal(net(f.sink, 'live'), 1);
});

test('server errors are refunded', async (t) => {
  // Content that fails after the request was reserved.
  const failing = await fixture(t, {
    content: {
      page: async () => {
        throw new Error('database down');
      },
    },
  });
  assert.equal((await failing.call('/v1/mantras', failing.keys.live)).status, 500);
  assert.equal(net(failing.sink, 'live'), 0);
});

test('sandbox and live usage are separate lanes, and test-mode billing has its own', async (t) => {
  const f = await fixture(t);
  await f.call('/v1/mantras', f.keys.live);
  await f.call('/v1/mantras', f.keys.sandbox);
  await f.call('/v1/mantras', f.keys.sandbox);
  assert.equal(net(f.sink, 'live'), 1);
  assert.equal(net(f.sink, 'sandbox'), 2);

  // A local console on test-mode billing reads testPlan, and its live calls use their own lane.
  const local = await fixture(t, { plan: 'Free', testPlan: 'Growth', billingMode: 'test' });
  assert.equal((await local.call('/v1/mantras', local.keys.live)).status, 200);
  assert.equal(net(local.sink, 'live-test'), 1);
  assert.equal(net(local.sink, 'live'), 0);
  // The same workspace in production is still Free, so its live key is refused.
  const production = await fixture(t, { plan: 'Free', testPlan: 'Growth' });
  const refused = await production.call('/v1/mantras', production.keys.live);
  assert.equal(refused.status, 403);
  assert.equal(refused.body.error.code, 'plan_inactive');
});

test('book collections are callable directly and paginate with limit and cursor', async (t) => {
  const book = (id, subcategory, extra = {}) => ({
    id,
    title: id,
    author: 'Author',
    category: 'Shruti (The Revealed Texts)',
    subcategory,
    shortDescription: `${id} short`,
    longDescription: `${id} long internal`,
    isLive: true,
    totalVerses: 10,
    ...extra,
  });
  const catalogue = [
    book('ishaUpanishad', '', { category: '' }),
    book('kenaUpanishad', 'Upanishads'),
    book('kathaUpanishad', 'Upanishads', { shortDescription: '' }),
    book('bhagavadGita', 'Bhagavad Gita'),
    book('hiddenUpanishad', 'Upanishads', { isLive: false }),
  ];
  const books = { ...demoPustak, catalogue: async () => catalogue };
  const f = await fixture(t, { books });

  const first = await f.call('/v1/books?collection=upanishads&limit=2', f.keys.live);
  assert.equal(first.status, 200);
  assert.deepEqual(
    first.body.data.map((b) => b.id),
    ['ishaUpanishad', 'kenaUpanishad'],
  );
  assert.deepEqual(first.body.data[0].collection, { id: 'upanishads', name: 'Upanishads' });
  assert.equal(first.body.data[0].description, 'ishaUpanishad short');
  const second = await f.call(
    `/v1/books?collection=upanishads&limit=2&cursor=${first.body.nextCursor}`,
    f.keys.live,
  );
  assert.deepEqual(
    second.body.data.map((b) => b.id),
    ['kathaUpanishad'],
  );
  assert.equal(second.body.nextCursor, null);
  // The long description is internal: without a short one, description is null.
  assert.equal(second.body.data[0].description, null);
  assert.ok(!JSON.stringify(first.body).includes('long internal'));

  // Sandbox keys see the sample titles within the collection.
  const sandbox = await f.call('/v1/books?collection=upanishads', f.keys.sandbox);
  assert.deepEqual(
    sandbox.body.data.map((b) => b.id),
    ['ishaUpanishad'],
  );
  assert.equal(sandbox.body.sandbox, true);

  assert.equal((await f.call('/v1/books?collection=gita', f.keys.live)).body.data.length, 0);
  const bad = await f.call('/v1/books?collection=Bad%20Id', f.keys.live);
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'invalid_collection');
  assert.equal((await f.call('/v1/books?limit=0', f.keys.live)).body.error.code, 'invalid_limit');
});

test('the public sign calculator needs no key, converts local time and is limited per IP', async (t) => {
  const row = (name, signId, nakshatra) => ({
    ...(name ? { name } : {}),
    sign_id: signId,
    sign: 'Example',
    degree_in_sign: 10.5,
    nakshatra,
    nakshatra_id: 13,
    pada: 3,
    nakshatra_lord: 'Moon',
  });
  const outbound = [];
  const astrologyService = createAstrologyService({
    key: 'server-only-fixture',
    fetcher: async (url, init) => {
      const path = new URL(url).pathname.replace('/api/v2', '');
      outbound.push({ path, payload: init.body ? JSON.parse(init.body) : null });
      if (path === '/geo/search')
        return Response.json({
          results: [
            { name: 'Kathmandu', country: 'NP', lat: 27.7, lng: 85.3, timezone: 'Asia/Kathmandu' },
          ],
        });
      return Response.json({
        chart: {
          ascendant: row(null, 6, 'Hasta'),
          planets: [row('Sun', 2, 'Rohini'), row('Moon', 12, 'Revati')],
          houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: 'Example' })),
        },
      });
    },
  });
  const f = await fixture(t, { astrologyService, publicDailyCap: 20 });
  const place = 'latitude=28.6&longitude=77.2&timezone=Asia/Kolkata';
  const ok = await f.call(`/v1/public/signs?date=1995-06-20&time=12:30&${place}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), '*');
  const { western, vedic, timeKnown } = ok.body.data;
  assert.equal(timeKnown, true);
  assert.equal(western.sun.name, 'Gemini');
  assert.equal(western.rising.name, 'Libra');
  assert.deepEqual(vedic.moon.rashi, { number: 12, name: 'Meena', english: 'Pisces' });
  assert.equal(vedic.lagna.rashi.name, 'Kanya');
  assert.equal(vedic.moon.nakshatra.name, 'Revati');
  assert.equal(outbound[0].payload.hour, 12);
  assert.equal(outbound[0].payload.tz_str, 'Asia/Kolkata');

  const noTime = await f.call(`/v1/public/signs?date=1995-06-20&${place}`);
  assert.equal(noTime.body.data.timeKnown, false);
  assert.equal(noTime.body.data.western.rising, null);
  assert.equal(noTime.body.data.vedic.lagna, null);

  const skipped = await f.call(
    '/v1/public/signs?date=2026-03-08&time=02:30&latitude=40.7&longitude=-74&timezone=America/New_York',
  );
  assert.equal(skipped.body.error.code, 'invalid_local_time');
  assert.equal(
    (await f.call(`/v1/public/signs?date=1995-02-30&${place}`)).body.error.code,
    'invalid_date',
  );
  assert.equal(
    (await f.call('/v1/public/signs?date=1995-06-20&timezone=Asia/Kolkata')).body.error.code,
    'invalid_coordinates',
  );

  const places = await f.call('/v1/public/places?query=Kathmandu');
  assert.equal(places.body.data.places[0].timezone, 'Asia/Kathmandu');
  assert.equal(f.sink.events.length, 0);

  for (let i = 0; i < 12; i++) await f.call(`/v1/public/signs?date=1995-06-20&${place}`);
  const limited = await f.call(`/v1/public/signs?date=1995-06-20&${place}`);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, 'calculator_limited');
  // Place search has its own allowance.
  assert.equal((await f.call('/v1/public/places?query=Kathmandu')).status, 200);
});

test('the public calculator stops at its daily cap', async (t) => {
  const astrologyService = createAstrologyService({
    key: 'k',
    fetcher: async () => Response.json({ results: [] }),
  });
  const f = await fixture(t, { astrologyService, publicDailyCap: 2 });
  assert.equal((await f.call('/v1/public/places?query=Pune')).status, 200);
  assert.equal((await f.call('/v1/public/places?query=Pune')).status, 200);
  assert.equal((await f.call('/v1/public/places?query=Pune')).body.error.code, 'calculator_busy');
});
