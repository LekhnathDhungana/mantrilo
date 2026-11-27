import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { MemoryContent, SANDBOX_SAMPLE_SIZE } from '../api/content.mjs';
import { demoPustak } from '../server/pustak.mjs';

const mantra = (n) => ({
  id: `mantra-${String(n).padStart(3, '0')}`,
  title: `Mantra ${n}`,
  deityKey: n % 3 ? 'shiva' : 'devi',
  deity: n % 3 ? 'Lord Shiva' : 'Devi',
  audioPath: `private/${n}.m4a`,
  hasAudio: true,
  shlokas: [{ shlokaNumber: 1, sanskrit: 'ॐ' }],
});

async function fixture(t, plan, content = new MemoryContent({ mantras: [] }), media) {
  const store = new MemoryStore();
  await seedDemo(store);
  const server = createConsoleServer({
    store,
    sessions: new DemoSessions(),
    content,
    media,
    books: demoPustak,
    appOrigin: 'http://localhost:4190',
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`,
    csrfResponse = await fetch(`${base}/api/auth/csrf`),
    { csrfToken } = await csrfResponse.json(),
    jar = new Map();
  const call = async (path, method = 'GET', data) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: 'http://localhost:4190',
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    for (const cookie of [...response.headers.getSetCookie()]) {
      const entry = cookie.split(';')[0],
        i = entry.indexOf('=');
      jar.set(entry.slice(0, i), entry.slice(i + 1));
    }
    return { status: response.status, body: await response.json() };
  };
  for (const cookie of csrfResponse.headers.getSetCookie()) {
    const entry = cookie.split(';')[0],
      i = entry.indexOf('=');
    jar.set(entry.slice(0, i), entry.slice(i + 1));
  }
  await call('/api/auth/demo', 'POST', { role: 'customer' });
  const { workspace } = (await call('/api/me')).body;
  await store.transact(workspace.id, (w) => {
    w.plan = plan;
  });
  return {
    call,
    audio: (path, headers = {}) =>
      fetch(base + path, {
        headers: {
          Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
          ...headers,
        },
      }),
  };
}
const catalog = () =>
  new MemoryContent({ mantras: Array.from({ length: 30 }, (_, i) => mantra(i + 1)) });

test('library recordings support seeking and enforce the same Free plan catalog access', async (t) => {
  const bytes = Buffer.from('0123456789');
  const media = {
    async describe() {
      return { bytes: bytes.length, contentType: 'audio/x-m4a' };
    },
    open(_path, { start, end } = {}) {
      return Readable.from([bytes.subarray(start, end === undefined ? undefined : end + 1)]);
    },
  };
  const f = await fixture(t, 'Free', catalog(), media);
  const path = '/api/library/mantras/mantra-001/audio';
  const response = await f.audio(path, { Range: 'bytes=2-5' });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(response.headers.get('content-type'), 'audio/mp4');
  assert.equal(await response.text(), '2345');
  const invalid = await f.audio(path, { Range: 'bytes=10-' });
  assert.equal(invalid.status, 416);
  assert.equal((await f.call('/api/library/mantras/mantra-030/audio')).status, 404);
  assert.equal((await f.audio(path, { Cookie: '' })).status, 401);
});

test('free plans browse only the sample, and browsing costs nothing', async (t) => {
  const f = await fixture(t, 'Free', catalog());
  const list = await f.call('/api/library/mantras');
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, SANDBOX_SAMPLE_SIZE);
  assert.equal(list.body.nextCursor, null);
  assert.equal((await f.call('/api/library/mantras/mantra-001')).status, 200);
  assert.equal((await f.call('/api/library/mantras/mantra-030')).status, 404);
  assert.equal((await f.call('/api/me')).body.usage.contentRequests, 0);
});

test('paid plans page through the real catalog without storage paths', async (t) => {
  const f = await fixture(t, 'Starter', catalog());
  const first = await f.call('/api/library/mantras');
  assert.equal(first.body.data.length, 24);
  const second = await f.call(`/api/library/mantras?cursor=${first.body.nextCursor}`);
  assert.equal(second.body.data.length, 6);
  assert.equal(second.body.nextCursor, null);
  const item = await f.call('/api/library/mantras/mantra-030');
  assert.equal(item.body.data.verses.length, 1);
  assert.ok(!JSON.stringify([first.body, item.body]).includes('private/'));
});

test('the library rejects unknown types and bad pages', async (t) => {
  const f = await fixture(t, 'Starter', catalog());
  assert.equal((await f.call('/api/library/secrets')).status, 400);
  assert.equal((await f.call('/api/library/constructor')).status, 400);
  assert.equal((await f.call('/api/library/mantras?cursor=%2F%2F')).status, 400);
});

test('mantras filter by deity id, and Free plans filter the sample', async (t) => {
  const content = catalog();
  const f = await fixture(t, 'Starter', content);
  const deity = (await f.call('/api/library/mantras')).body.data[0].deity.id;
  const filtered = await f.call(`/api/library/mantras?deity=${deity}`);
  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.data.length > 0);
  assert.ok(filtered.body.data.every((item) => item.deity.id === deity));
  assert.equal((await f.call('/api/library/mantras?deity=%3Cscript%3E')).status, 400);
  assert.equal((await f.call('/api/library/texts')).status, 400);
  const free = await fixture(t, 'Free', content);
  const sample = await free.call(`/api/library/mantras?deity=${deity}`);
  assert.ok(sample.body.data.length <= 5);
  assert.equal(sample.body.nextCursor, null);
});

test('books open with a chapter index and the Free plan can only read the opening preview', async (t) => {
  const f = await fixture(t, 'Free');
  const list = await f.call('/api/library/books');
  assert.equal(list.status, 200);
  assert.equal(list.body.data[0].id, 'demo-pustak');
  const book = await f.call('/api/library/books/demo-pustak');
  assert.deepEqual(
    book.body.data.chapters.map((chapter) => chapter.number),
    [1],
  );
  assert.equal(book.body.data.chapters[0].verses, undefined);
  const preview = await f.call('/api/library/books/demo-pustak/chapters/1');
  assert.deepEqual(
    preview.body.data.verses.map((verse) => verse.number),
    [0, 1, 2],
  );
  assert.equal(preview.body.data.nextOffset, null);
  assert.equal((await f.call('/api/library/books/demo-pustak/chapters/1?offset=3')).status, 404);
  assert.equal((await f.call('/api/library/books/demo-pustak/chapters/2')).status, 404);
  assert.equal((await f.call('/api/me')).body.usage.contentRequests, 0);
});

test('paid workspaces can open later book chapters', async (t) => {
  const f = await fixture(t, 'Starter');
  const book = await f.call('/api/library/books/demo-pustak');
  assert.deepEqual(
    book.body.data.chapters.map((chapter) => chapter.number),
    [1, 2],
  );
  const chapter = await f.call('/api/library/books/demo-pustak/chapters/2');
  assert.equal(chapter.status, 200);
  assert.equal(chapter.body.data.title, 'Sample chapter 2');
  assert.equal(chapter.body.data.verses.length, 4);
});
