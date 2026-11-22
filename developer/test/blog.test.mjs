import test from 'node:test';
import assert from 'node:assert/strict';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { createBlog, MemoryArticles, prepareShell, renderMarkdown } from '../server/blog.mjs';
import {
  articleFromPaste,
  describeSlot,
  fromEasternInput,
  recommendCategory,
  suggestSlot,
} from '../server/blog-core.mjs';

const SHELL = `<!DOCTYPE html><html lang="en"><head><title>Blog Layout | Mantrilo</title>
<meta name="description" content="layout"/><meta name="robots" content="noindex,follow"/>
<link rel="canonical" href="https://www.mantrilo.com/blog-shell"/>
<link rel="preload" href="/_expo/static/js/web/entry-abc.js" as="script"/>
<link rel="stylesheet" href="/_expo/static/css/site-abc.css"/>
<script type="application/ld+json">{"@type":"BreadcrumbList"}</script></head>
<body><div class="mh"><header class="mh-header"><nav id="mh-navigation"><a href="/docs">Docs</a><a href="/blog">Blog</a></nav>
<a href="https://www.mantrilo.com/console/login?mode=signup&amp;source=site">Get API key</a></header>
<main id="main"><div data-blog-slot=""></div></main></div>
<script defer="" src="/_expo/static/js/web/entry-abc.js"></script><script id="_R_">globalThis.__EXPO_ROUTER_HYDRATE__=true;</script></body></html>`;

const day = 24 * 3600 * 1000;

async function fixture(t) {
  const store = new MemoryStore(),
    sessions = new DemoSessions(),
    articles = new MemoryArticles();
  await seedDemo(store);
  const clock = { now: new Date() };
  const blog = createBlog({
    articles,
    fetchShell: async () => SHELL,
    clock: () => clock.now,
  });
  const server = createConsoleServer({
    store,
    sessions,
    mode: 'demo',
    appOrigin: 'http://localhost:4190',
    staticRoot: '/tmp/nonexistent-console-test',
    basePath: '/console',
    articles,
    blog,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  function client() {
    const jar = new Map();
    let csrf = '';
    return {
      async call(path, method = 'GET', data) {
        if (method !== 'GET' && !csrf)
          csrf = (await this.call('/console/api/auth/csrf')).body.csrfToken;
        const response = await fetch(base + path, {
          method,
          headers: {
            Origin: 'http://localhost:4190',
            Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
            ...(method !== 'GET'
              ? { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }
              : {}),
          },
          ...(data === undefined ? {} : { body: JSON.stringify(data) }),
        });
        for (const cookie of response.headers.getSetCookie()) {
          const [entry] = cookie.split(';');
          const i = entry.indexOf('=');
          jar.set(entry.slice(0, i), entry.slice(i + 1));
        }
        return { status: response.status, body: await response.json() };
      },
      login(role) {
        return this.call('/console/api/auth/demo', 'POST', { role });
      },
    };
  }
  const page = async (path) => {
    const response = await fetch(base + path, { redirect: 'manual' });
    return { status: response.status, headers: response.headers, html: await response.text() };
  };
  return { articles, clock, client, page };
}

const article = (overrides = {}) => ({
  title: 'Build a daily Panchang widget',
  description:
    'Fetch tithi, nakshatra and sunrise for any city with one request to the Mantrilo API.',
  slug: 'daily-panchang-widget',
  keyword: 'panchang api',
  category: 'Vedic Astrology',
  author: 'Someone Else',
  markdown: '## Request\n\n```bash\ncurl "$API/v1/astrology/calculate"\n```\n\nDone.',
  create: true,
  status: 'scheduled',
  ...overrides,
});

test('the suggested slot is the next open Monday, Wednesday or Friday at 9:00 AM Eastern', () => {
  const friday10am = new Date('2026-11-20T15:00:00Z');
  const monday = suggestSlot([], friday10am);
  assert.equal(monday.toISOString(), '2026-11-23T14:00:00.000Z');
  assert.equal(describeSlot(monday), 'Mon, Nov 23 at 9:00 AM EST');
  // A taken day is skipped; a post on another weekday doesn't block a slot.
  assert.equal(
    suggestSlot([monday, new Date('2026-11-24T14:00:00Z')], friday10am).toISOString(),
    '2026-11-25T14:00:00.000Z',
  );
  // Earlier the same Friday, that morning's slot is still open.
  assert.equal(
    suggestSlot([], new Date('2026-11-20T13:00:00Z')).toISOString(),
    '2026-11-20T14:00:00.000Z',
  );
  // After the March clock change 9:00 AM is 13:00 UTC.
  assert.equal(
    suggestSlot([], new Date('2027-03-12T20:00:00Z')).toISOString(),
    '2027-03-15T13:00:00.000Z',
  );
  assert.equal(fromEasternInput('2026-07-01T09:30').toISOString(), '2026-07-01T13:30:00.000Z');
});

test('a pasted article fills its fields and gets a recommended category', () => {
  const pasted = articleFromPaste(
    '---\ntitle: "Streaming mantra audio with signed URLs"\ndescription: How playback works\nkeyword: mantra audio api\n---\n\n# Ignored heading\n\nSigned link, audio player, recording.',
  );
  assert.equal(pasted.slug, 'streaming-mantra-audio-with-signed-urls');
  assert.equal(pasted.category, 'Sacred Audio');
  assert.equal(pasted.categoryRecommended, true);
  assert.equal(pasted.author, 'Sri Kumar');
  assert.equal(
    articleFromPaste('---\ntitle: T\nauthor: Someone Else\n---\nText').author,
    'Sri Kumar',
  );
  assert.ok(!pasted.markdown.includes('---'));
  const stated = articleFromPaste('---\ntitle: Anything\ncategory: scripture books\n---\nText');
  assert.equal(stated.category, 'Scripture Books');
  assert.equal(stated.categoryRecommended, false);
  assert.equal(
    recommendCategory('Caching proxy for your API keys', ''),
    'Engineering & Architecture',
  );
  assert.equal(
    recommendCategory('Read the Bhagavad Gita chapter by chapter', ''),
    'Scripture Books',
  );
});

test('only administrators can write articles, and slugs are unique', async (t) => {
  const f = await fixture(t);
  const customer = f.client();
  await customer.login('customer');
  assert.equal((await customer.call('/console/api/admin/articles')).status, 403);
  assert.equal(
    (await customer.call('/console/api/admin/articles/x', 'PUT', article())).status,
    403,
  );

  const admin = f.client();
  await admin.login('admin');
  const empty = await admin.call('/console/api/admin/articles');
  assert.equal(empty.status, 200);
  assert.match(empty.body.suggestedSlot.label, /^(Mon|Wed|Fri), .+ at 9:00 AM E[SD]T$/);

  const tomorrow = new Date(Date.now() + day).toISOString();
  const created = await admin.call('/console/api/admin/articles/daily-panchang-widget', 'PUT', {
    ...article(),
    publishAt: tomorrow,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.article.status, 'scheduled');
  const duplicate = await admin.call('/console/api/admin/articles/daily-panchang-widget', 'PUT', {
    ...article(),
    publishAt: tomorrow,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'slug_taken');

  // Renaming moves the article; the old slug is gone.
  const renamed = await admin.call('/console/api/admin/articles/daily-panchang-widget', 'PUT', {
    ...article({ slug: 'panchang-widget', create: false }),
    publishAt: tomorrow,
  });
  assert.equal(renamed.status, 200);
  assert.equal(await f.articles.get('daily-panchang-widget'), null);
  assert.ok(await f.articles.get('panchang-widget'));

  const bad = await admin.call(
    '/console/api/admin/articles/Bad_Slug',
    'PUT',
    article({ slug: 'Bad_Slug' }),
  );
  assert.equal(bad.status, 404);
  const invalid = await admin.call(
    '/console/api/admin/articles/x',
    'PUT',
    article({ slug: 'x', category: 'Gossip' }),
  );
  assert.equal(invalid.status, 400);

  const preview = await admin.call('/console/api/admin/articles/preview', 'POST', {
    markdown: '# Hi\n\n<script>alert(1)</script>',
  });
  assert.ok(preview.body.html.includes('&lt;script&gt;'));
  assert.ok(!preview.body.html.includes('<script>'));

  assert.equal(
    (await admin.call('/console/api/admin/articles/panchang-widget', 'DELETE')).status,
    200,
  );
  assert.equal((await admin.call('/console/api/admin/articles')).body.articles.length, 0);
});

test('scheduled articles go live at their time with no cron, drafts never do', async (t) => {
  const f = await fixture(t);
  const admin = f.client();
  await admin.login('admin');
  const later = new Date(Date.now() + 2 * day);
  await admin.call('/console/api/admin/articles/daily-panchang-widget', 'PUT', {
    ...article(),
    publishAt: later.toISOString(),
  });
  await admin.call('/console/api/admin/articles/draft-post', 'PUT', {
    ...article({ slug: 'draft-post', title: 'A draft', status: 'draft' }),
  });

  let post = await f.page('/blog/daily-panchang-widget');
  assert.equal(post.status, 404);
  assert.match(post.html, /noindex/);
  assert.equal((await f.page('/blog/draft-post')).status, 404);
  assert.ok(!(await f.page('/blog')).html.includes('daily-panchang-widget'));
  assert.ok(!(await f.page('/blog/sitemap.xml')).html.includes('daily-panchang-widget'));

  // Time passes: the same article is now served, listed and in the sitemap.
  f.clock.now = new Date(later.getTime() + 60_000);
  post = await f.page('/blog/daily-panchang-widget');
  assert.equal(post.status, 200);
  assert.match(post.headers.get('cache-control'), /s-maxage=/);
  assert.equal(post.headers.get('x-robots-tag'), null);
  assert.match(post.html, /<title>Build a daily Panchang widget \| Mantrilo<\/title>/);
  // The byline is always Sri Kumar, whatever the request said.
  assert.ok(post.html.includes('<strong>Sri Kumar</strong>'));
  assert.ok(!post.html.includes('Someone Else'));
  assert.ok(post.html.includes('"@type":"Person","name":"Sri Kumar"'));
  assert.match(
    post.html,
    /<link rel="canonical" href="https:\/\/www\.mantrilo\.com\/blog\/daily-panchang-widget">/,
  );
  assert.match(post.html, /"@type":"TechArticle"/);
  assert.match(post.html, /<meta property="og:title"/);
  assert.match(post.html, /class="hljs language-bash"/);
  assert.match(post.html, /mh-copy-code/);
  assert.match(post.html, /console\/login\?mode=signup&amp;source=site/);
  // The shell's own tags and the React scripts are gone; the stylesheet and header stay.
  assert.ok(!post.html.includes('Blog Layout'));
  assert.ok(!post.html.includes('entry-abc.js'));
  assert.ok(!post.html.includes('__EXPO_ROUTER_HYDRATE__'));
  assert.ok(post.html.includes('/_expo/static/css/site-abc.css'));
  assert.ok(post.html.includes('<a aria-current="page" href="/blog">Blog</a>'));
  assert.equal((post.html.match(/<h1>/g) ?? []).length, 1);

  const index = await f.page('/blog');
  assert.equal(index.status, 200);
  assert.ok(index.html.includes('/blog/daily-panchang-widget'));
  assert.ok(!index.html.includes('draft-post'));
  const category = await f.page('/blog/category/vedic-astrology');
  assert.ok(category.html.includes('/blog/daily-panchang-widget'));
  assert.match((await f.page('/blog/category/sacred-audio')).html, /noindex,follow/);
  assert.equal((await f.page('/blog/category/unknown')).status, 404);

  const sitemap = await f.page('/blog/sitemap.xml');
  assert.match(sitemap.headers.get('content-type'), /application\/xml/);
  assert.ok(
    sitemap.html.includes('<loc>https://www.mantrilo.com/blog/daily-panchang-widget</loc>'),
  );
  assert.ok(
    sitemap.html.includes('<loc>https://www.mantrilo.com/blog/category/vedic-astrology</loc>'),
  );
  assert.ok(!sitemap.html.includes('draft-post'));
  assert.ok((await f.page('/blog/feed.xml')).html.includes('<rss'));

  const slash = await f.page('/blog/daily-panchang-widget/');
  assert.equal(slash.status, 301);
  assert.equal(slash.headers.get('location'), '/blog/daily-panchang-widget');
});

test('the blog is only served outside the console path, and only when configured', async (t) => {
  const f = await fixture(t);
  // The console's own route keeps working under its base path.
  assert.notEqual((await f.page('/console/blog')).headers.get('x-robots-tag'), null);
  // Without a base path (the standalone console) /blog belongs to the console app.
  const html = renderMarkdown('[x](javascript:alert(1)) ![y](data:image/png;base64,AA)');
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('data:image'));
  assert.throws(() => prepareShell('<html><body>no slot</body></html>'));
});
