import test from 'node:test';
import assert from 'node:assert/strict';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { MemoryContent, SANDBOX_SAMPLE_SIZE } from '../api/content.mjs';

const shloka = (n) => ({
  id: `shloka-${String(n).padStart(3, '0')}`,
  title: `Shloka ${n}`,
  audioPath: `private/${n}.m4a`,
  hasAudio: true,
  shlokas: [{ shlokaNumber: 1, sanskrit: 'ॐ' }],
});

async function fixture(t, plan, content = new MemoryContent({ shlokas: [], mantras: [] })) {
  const store = new MemoryStore();
  await seedDemo(store);
  const server = createConsoleServer({
    store,
    sessions: new DemoSessions(),
    content,
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
  return { call };
}
const catalog = () =>
  new MemoryContent({ shlokas: Array.from({ length: 30 }, (_, i) => shloka(i + 1)), mantras: [] });

test('free plans browse only the sample, and browsing costs nothing', async (t) => {
  const f = await fixture(t, 'Sandbox', catalog());
  const list = await f.call('/api/library/shlokas');
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, SANDBOX_SAMPLE_SIZE);
  assert.equal(list.body.nextCursor, null);
  assert.equal((await f.call('/api/library/shlokas/shloka-001')).status, 200);
  assert.equal((await f.call('/api/library/shlokas/shloka-030')).status, 404);
  assert.equal((await f.call('/api/me')).body.usage.contentRequests, 0);
});

test('paid plans page through the real catalog without storage paths', async (t) => {
  const f = await fixture(t, 'Starter', catalog());
  const first = await f.call('/api/library/shlokas');
  assert.equal(first.body.data.length, 24);
  const second = await f.call(`/api/library/shlokas?cursor=${first.body.nextCursor}`);
  assert.equal(second.body.data.length, 6);
  assert.equal(second.body.nextCursor, null);
  const item = await f.call('/api/library/shlokas/shloka-030');
  assert.equal(item.body.data.verses.length, 1);
  assert.ok(!JSON.stringify([first.body, item.body]).includes('private/'));
});

test('the library rejects unknown types and bad pages', async (t) => {
  const f = await fixture(t, 'Starter', catalog());
  assert.equal((await f.call('/api/library/secrets')).status, 400);
  assert.equal((await f.call('/api/library/constructor')).status, 400);
  assert.equal((await f.call('/api/library/shlokas?cursor=%2F%2F')).status, 400);
});
