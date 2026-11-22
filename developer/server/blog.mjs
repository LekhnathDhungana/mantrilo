// The Mantrilo blog: articles in Firestore, written from the console's admin screen and served
// as HTML pages at www.mantrilo.com/blog through the Firebase Hosting rewrite.
//
// Publishing needs no cron. A scheduled article is stored with its publishAt time, and every
// public page and the blog sitemap only ever read articles whose publishAt has passed.
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import {
  CATEGORIES,
  CATEGORY_NAMES,
  DEFAULT_AUTHOR,
  SLUG_PATTERN,
  STATUSES,
  readingTimeMinutes,
  suggestSlot,
  describeSlot,
} from './blog-core.mjs';
import { ApiError, insist } from './domain.mjs';

const LIVE = ['scheduled', 'published'];
const SUMMARY_FIELDS = [
  'slug',
  'title',
  'description',
  'keyword',
  'category',
  'author',
  'readingTimeMinutes',
  'status',
  'publishAt',
  'createdAt',
  'updatedAt',
];

const toDate = (value) =>
  value == null ? null : typeof value.toDate === 'function' ? value.toDate() : new Date(value);

function fromDoc(data) {
  return {
    ...data,
    publishAt: toDate(data.publishAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

const isLive = (article, now) =>
  LIVE.includes(article.status) && article.publishAt && article.publishAt <= now;

// ── Storage ─────────────────────────────────────────────────────────────────────────────────

/** Articles in the `articles` collection, one document per slug. */
export class FirestoreArticles {
  constructor(db) {
    this.collection = db.collection('articles');
  }
  async live(now = new Date()) {
    // Needs the (status, publishAt desc) index in deployment/firestore.indexes.json.
    const snapshot = await this.collection
      .where('status', 'in', LIVE)
      .where('publishAt', '<=', now)
      .orderBy('publishAt', 'desc')
      .select(...SUMMARY_FIELDS)
      .limit(1000)
      .get();
    return snapshot.docs.map((doc) => fromDoc(doc.data()));
  }
  async all() {
    const snapshot = await this.collection
      .orderBy('publishAt', 'desc')
      .select(...SUMMARY_FIELDS)
      .limit(1000)
      .get();
    return snapshot.docs.map((doc) => fromDoc(doc.data()));
  }
  async get(slug) {
    const doc = await this.collection.doc(slug).get();
    return doc.exists ? fromDoc(doc.data()) : null;
  }
  /** Writes `article` under its slug. Fails with 409 if that slug belongs to another article. */
  async save(article, previousSlug = null) {
    const db = this.collection.firestore;
    await db.runTransaction(async (tx) => {
      const target = this.collection.doc(article.slug);
      const existing = await tx.get(target);
      if (article.slug !== previousSlug)
        insist(!existing.exists, 409, 'slug_taken', 'Another article already uses this slug.');
      const createdAt = existing.exists ? existing.data().createdAt : null;
      if (previousSlug && previousSlug !== article.slug) {
        const old = await tx.get(this.collection.doc(previousSlug));
        tx.delete(this.collection.doc(previousSlug));
        tx.set(target, { ...article, createdAt: old.exists ? old.data().createdAt : new Date() });
      } else tx.set(target, { ...article, createdAt: createdAt ?? article.createdAt });
    });
  }
  async remove(slug) {
    await this.collection.doc(slug).delete();
  }
}

/** The same behaviour in memory, for demo mode and tests. */
export class MemoryArticles {
  constructor(seed = []) {
    this.items = new Map(seed.map((article) => [article.slug, structuredClone(article)]));
  }
  async live(now = new Date()) {
    return (await this.all()).filter((article) => isLive(article, now));
  }
  async all() {
    return [...this.items.values()]
      .map(({ markdown: _markdown, ...rest }) => structuredClone(rest))
      .sort((a, b) => (b.publishAt?.getTime() ?? 0) - (a.publishAt?.getTime() ?? 0));
  }
  async get(slug) {
    const article = this.items.get(slug);
    return article ? structuredClone(article) : null;
  }
  async save(article, previousSlug = null) {
    if (article.slug !== previousSlug)
      insist(
        !this.items.has(article.slug),
        409,
        'slug_taken',
        'Another article already uses this slug.',
      );
    const createdAt = this.items.get(previousSlug ?? article.slug)?.createdAt ?? article.createdAt;
    if (previousSlug) this.items.delete(previousSlug);
    this.items.set(article.slug, structuredClone({ ...article, createdAt }));
  }
  async remove(slug) {
    this.items.delete(slug);
  }
}

// ── Markdown ────────────────────────────────────────────────────────────────────────────────

export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const LANGUAGE_ALIASES = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  js: 'javascript',
  ts: 'typescript',
};

/** Highlighted HTML for a code sample, and the language name it was highlighted as. */
function highlight(text, lang) {
  const name = LANGUAGE_ALIASES[lang?.toLowerCase()] ?? lang?.toLowerCase() ?? '';
  const known = name && hljs.getLanguage(name);
  return {
    name: known ? name : '',
    html: known
      ? hljs.highlight(text, { language: name, ignoreIllegals: true }).value
      : escapeHtml(text),
  };
}

function createMarkdown() {
  const markdown = new Marked({ gfm: true });
  const used = new Map();
  markdown.use({
    hooks: {
      preprocess(text) {
        used.clear();
        return text;
      },
    },
    renderer: {
      // Articles are written by administrators, but raw HTML is still shown as text so a pasted
      // snippet can never run script on www.mantrilo.com.
      html({ text }) {
        return escapeHtml(text);
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const base =
          inner
            .replace(/<[^>]+>/g, '')
            .toLowerCase()
            .replace(/&[a-z0-9#]+;/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'section';
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        const id = count ? `${base}-${count}` : base;
        // The page title is the only h1; article headings start at h2.
        const level = Math.min(6, Math.max(2, depth));
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
      code({ text, lang }) {
        const { name, html: highlighted } = highlight(text, lang);
        const label = name ? `<span class="mh-code-lang">${escapeHtml(name)}</span>` : '';
        return `<div class="mh-blog-code">${label}<button type="button" class="mh-copy-code" aria-label="Copy code">Copy</button><pre><code class="hljs${name ? ` language-${escapeHtml(name)}` : ''}">${highlighted}</code></pre></div>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const safe = /^(https?:|mailto:|\/|#)/i.test(href) ? href : '#';
        const external = /^https?:/i.test(safe) && !/^https:\/\/(www\.)?mantrilo\.com/i.test(safe);
        return `<a href="${escapeHtml(safe)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' rel="noopener"' : ''}>${inner}</a>`;
      },
      image({ href, title, text }) {
        if (!/^(https?:|\/)/i.test(href)) return escapeHtml(text);
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async">`;
      },
    },
  });
  return markdown;
}
const markdown = createMarkdown();
export const renderMarkdown = (text) => markdown.parse(String(text || ''));

// ── Admin input ─────────────────────────────────────────────────────────────────────────────

function text(value, label, max, { required = true } = {}) {
  const clean = typeof value === 'string' ? value.trim() : '';
  insist(!required || clean, 400, 'invalid_article', `${label} is required.`);
  insist(
    clean.length <= max,
    400,
    'invalid_article',
    `${label} must be ${max} characters or fewer.`,
  );
  return clean;
}

/** Validates an article from the admin screen and works out its status and publish time. */
export function readArticle(input, now = new Date()) {
  const slug = text(input.slug, 'Slug', 80);
  insist(
    SLUG_PATTERN.test(slug),
    400,
    'invalid_article',
    'Use lowercase letters, numbers and single hyphens in the slug.',
  );
  const category = text(input.category, 'Category', 60);
  insist(CATEGORY_NAMES.includes(category), 400, 'invalid_article', 'Choose a listed category.');
  const body = typeof input.markdown === 'string' ? input.markdown.trim() : '';
  insist(body, 400, 'invalid_article', 'The article body is empty.');
  insist(body.length <= 400_000, 400, 'invalid_article', 'The article body is too long.');
  insist(STATUSES.includes(input.status), 400, 'invalid_article', 'Choose a status.');
  let status = input.status,
    publishAt = input.publishAt ? new Date(input.publishAt) : null;
  insist(
    !publishAt || !Number.isNaN(publishAt.getTime()),
    400,
    'invalid_article',
    'The publish date is not a valid date.',
  );
  if (input.publishNow || (status === 'published' && !publishAt)) {
    status = 'published';
    publishAt = now;
  }
  if (status === 'scheduled')
    insist(publishAt, 400, 'invalid_article', 'Choose when the article should go live.');
  // A scheduled time already in the past means the article is live now.
  if (status === 'scheduled' && publishAt <= now) status = 'published';
  return {
    slug,
    title: text(input.title, 'Title', 200),
    description: text(input.description, 'Description', 320),
    keyword: text(input.keyword, 'Keyword', 120, { required: false }),
    category,
    author: DEFAULT_AUTHOR,
    markdown: body,
    readingTimeMinutes: readingTimeMinutes(body),
    status,
    publishAt: publishAt ?? now,
    createdAt: now,
    updatedAt: now,
  };
}

const summary = (article) => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  keyword: article.keyword,
  category: article.category,
  author: article.author,
  readingTimeMinutes: article.readingTimeMinutes,
  status: article.status,
  publishAt: article.publishAt?.toISOString() ?? null,
  updatedAt: article.updatedAt?.toISOString() ?? null,
});

export function slotFor(articles, now = new Date()) {
  const taken = articles
    .filter((article) => LIVE.includes(article.status) && article.publishAt)
    .map((article) => article.publishAt);
  const at = suggestSlot(taken, now);
  return { at: at.toISOString(), label: describeSlot(at) };
}

/**
 * The console's /api/admin/articles operations. The caller has already checked that the
 * signed-in user is an administrator. Returns [status, body].
 */
export async function handleArticleAdmin({ route, method, readBody, articles, now = new Date() }) {
  if (route === '/api/admin/articles' && method === 'GET') {
    const all = await articles.all();
    return [200, { articles: all.map(summary), suggestedSlot: slotFor(all, now) }];
  }
  if (route === '/api/admin/articles/preview' && method === 'POST') {
    const input = await readBody();
    insist(typeof input.markdown === 'string', 400, 'invalid_article', 'Send the Markdown.');
    insist(input.markdown.length <= 400_000, 400, 'invalid_article', 'The article is too long.');
    return [200, { html: renderMarkdown(input.markdown) }];
  }
  const match = route.match(/^\/api\/admin\/articles\/([a-z0-9-]{1,80})$/);
  if (!match) throw new ApiError(404, 'not_found', 'Article operation not found.');
  const slug = match[1];
  if (method === 'GET') {
    const article = await articles.get(slug);
    insist(article, 404, 'not_found', 'No article with that slug.');
    return [200, { article: { ...summary(article), markdown: article.markdown } }];
  }
  if (method === 'DELETE') {
    await articles.remove(slug);
    return [200, { ok: true }];
  }
  if (method === 'PUT') {
    // PUT /api/admin/articles/{slug}: `slug` is the article's current slug (or the new one when
    // creating); the body's slug may rename it. `create: true` refuses to overwrite.
    const input = await readBody();
    const article = readArticle(input, now);
    const existing = input.create ? null : await articles.get(slug);
    insist(input.create || existing, 404, 'not_found', 'No article with that slug.');
    if (existing) article.createdAt = existing.createdAt ?? now;
    await articles.save(article, existing ? slug : null);
    return [input.create ? 201 : 200, { article: summary(article) }];
  }
  throw new ApiError(405, 'method_not_allowed', 'Method not allowed.');
}

// ── Public pages ────────────────────────────────────────────────────────────────────────────

const categoryBySlug = new Map(CATEGORIES.map((category) => [category.slug, category]));
const categorySlug = (name) => CATEGORIES.find((category) => category.name === name)?.slug ?? '';

const longDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(date);

const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// The browser script for pages rendered here: the site's theme toggle and mobile menu (the
// React versions don't run on these pages) and the copy buttons on code blocks.
const PAGE_SCRIPT = `(()=>{const r=document.querySelector('.mh');if(!r)return;try{const t=localStorage.getItem('mantrilo-theme');if(t==='light'||t==='dark')r.dataset.theme=t}catch{}
const h=r.querySelector('.mh-header'),s=()=>h&&h.classList.toggle('is-scrolled',scrollY>8);s();addEventListener('scroll',s,{passive:true});
r.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
if(b.matches('[aria-label="Toggle dark mode"]')){const c=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),n=c==='dark'?'light':'dark';r.dataset.theme=n;try{localStorage.setItem('mantrilo-theme',n)}catch{}}
else if(b.hasAttribute('aria-controls')){const n=document.getElementById(b.getAttribute('aria-controls'));if(n){const o=!n.classList.contains('is-open');n.classList.toggle('is-open',o);b.setAttribute('aria-expanded',String(o))}}
else if(b.classList.contains('mh-copy-code')){const c=b.parentElement.querySelector('code');navigator.clipboard&&navigator.clipboard.writeText(c.innerText).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1600)})}})})();`;

// Blog HTML embeds the site's stylesheet URL, which changes on every site deploy, so pages stay
// at the CDN only briefly.
const PAGE_CACHE = 'public, max-age=60, s-maxage=120';

// The site's drifting saffron gradient, behind the top of every blog page.
const MESH = `<div class="mh-mesh mh-blog-mesh" aria-hidden="true"><span class="mh-blob mh-blob-1"></span><span class="mh-blob mh-blob-2"></span><span class="mh-blob mh-blob-3"></span><span class="mh-blob mh-blob-4"></span></div>`;

const FALLBACK_SHELL = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div class="mh"><main id="main"><div data-blog-slot=""></div></main></div></body></html>`;

/**
 * Prepares the site's exported /blog-shell page (header, footer, fonts and stylesheet) to hold
 * a blog page: its own title, meta tags, structured data and the React scripts come out.
 */
export function prepareShell(html) {
  const shell = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(
      /<meta\s+(?:name|property)="(?:description|robots|googlebot|og:[^"]*|twitter:[^"]*)"[^>]*>/gi,
      '',
    )
    .replace(/<link\s+rel="(?:canonical|alternate)"[^>]*>/gi, '')
    .replace(/<link\s+rel="(?:preload|modulepreload)"[^>]*as="script"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*>\s*<\/script>/gi, '')
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*id="_R_"[^>]*>[\s\S]*?<\/script>/gi, '')
    // The shell page marks no nav link as current; blog pages belong under Blog.
    .replace(/<a href="\/blog"(?![^>]*aria-current)/g, '<a aria-current="page" href="/blog"');
  insist(shell.includes('data-blog-slot'), 500, 'shell_invalid', 'The blog shell has no slot.');
  const signup = html.match(/href="([^"]*\/login\?[^"]*mode=signup[^"]*)"/)?.[1] ?? null;
  return { html: shell, signup: signup?.replace(/&amp;/g, '&') ?? null };
}

/** Renders the blog. `articles` is a FirestoreArticles or MemoryArticles. */
export function createBlog({
  articles,
  siteOrigin = 'https://www.mantrilo.com',
  fetchShell = (url) =>
    fetch(url, { headers: { 'User-Agent': 'MantriloBlog/1.0' } }).then((r) => {
      if (!r.ok) throw new Error(`shell ${r.status}`);
      return r.text();
    }),
  // Short, so a site deploy's new stylesheet reaches blog pages within a minute.
  shellTtlMs = 60_000,
  clock = () => new Date(),
}) {
  const origin = siteOrigin.replace(/\/+$/, '');
  let cached = null,
    loading = null;

  async function shell() {
    if (cached && clock().getTime() - cached.at < shellTtlMs) return cached.value;
    loading ??= fetchShell(`${origin}/blog-shell`)
      .then((html) => {
        cached = { at: clock().getTime(), value: prepareShell(html) };
        return cached.value;
      })
      .catch(() => cached?.value ?? { html: FALLBACK_SHELL, signup: null })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  async function page({
    title,
    description,
    path,
    robots = 'index,follow',
    type = 'website',
    jsonLd,
    body,
    extraHead = '',
  }) {
    const { html, signup } = await shell();
    const url = origin + path;
    const head = [
      `<title>${escapeHtml(title)}</title>`,
      `<meta name="description" content="${escapeHtml(description)}">`,
      `<meta name="robots" content="${robots}">`,
      `<link rel="canonical" href="${escapeHtml(url)}">`,
      `<link rel="alternate" type="application/rss+xml" title="Mantrilo Blog" href="${origin}/blog/feed.xml">`,
      `<meta property="og:type" content="${type}">`,
      `<meta property="og:site_name" content="Mantrilo">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:url" content="${escapeHtml(url)}">`,
      `<meta property="og:image" content="${origin}/mantrilo-social.png">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escapeHtml(title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(description)}">`,
      extraHead,
      jsonLd ? `<script type="application/ld+json">${json(jsonLd)}</script>` : '',
    ].join('');
    const filled = body(signup ?? `${origin}/pricing`);
    return html
      .replace('</head>', `${head}</head>`)
      .replace(/<div data-blog-slot=""><\/div>/, filled)
      .replace('</body>', `<script>${PAGE_SCRIPT}</script></body>`);
  }

  const breadcrumb = (items) => ({
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: origin + path,
    })),
  });

  const date = (at) => `<time datetime="${at.toISOString()}">${longDate(at)}</time>`;
  const categoryLink = (name) =>
    `<a class="mh-blog-kicker" href="/blog/category/${categorySlug(name)}">${escapeHtml(name)}</a>`;
  const more = (slug) =>
    `<a class="mh-blog-more" href="/blog/${slug}">Read more<span aria-hidden="true">›</span></a>`;

  /** The byline: every article is written by Sri Kumar. */
  function byline(detail = '') {
    const initials = DEFAULT_AUTHOR.split(/\s+/)
      .map((word) => word[0])
      .join('')
      .slice(0, 2);
    return `<div class="mh-blog-author"><span class="mh-blog-avatar" aria-hidden="true">${escapeHtml(initials)}</span><span><strong>${escapeHtml(DEFAULT_AUTHOR)}</strong><span>${detail || 'Mantrilo'}</span></span></div>`;
  }

  /** The first lines of an article's first code sample, drawn as an editor window. */
  function codeWindow(article) {
    const sample = article.markdown?.match(/```([\w+-]*)[^\n]*\n([\s\S]*?)```/);
    if (!sample)
      return `<div class="mh-blog-window is-empty"><span class="mh-blog-window-mark">${escapeHtml(article.category)}</span><span>${article.readingTimeMinutes} min read</span></div>`;
    const lines = sample[2].replace(/\n$/, '').split('\n');
    const { name, html } = highlight(lines.slice(0, 14).join('\n'), sample[1]);
    return `<div class="mh-blog-window"><div class="mh-blog-window-bar"><i></i><i></i><i></i>${name ? `<span>${escapeHtml(name)}</span>` : ''}</div><pre><code class="hljs">${html}</code></pre></div>`;
  }

  function feature(article) {
    const href = `/blog/${article.slug}`;
    return `<article class="mh-blog-feature">
<div class="mh-blog-feature-copy">${categoryLink(article.category)}
<h2><a href="${href}">${escapeHtml(article.title)}</a></h2>
${byline(`${longDate(article.publishAt)} · ${article.readingTimeMinutes} min read`)}
<p>${escapeHtml(article.description)}</p>
${more(article.slug)}</div>
<a class="mh-blog-feature-art" href="${href}" tabindex="-1" aria-hidden="true">${codeWindow(article)}</a>
</article>`;
  }

  function row(article) {
    return `<li class="mh-blog-row">
<div class="mh-blog-row-main">${categoryLink(article.category)}
<h2><a href="/blog/${article.slug}">${escapeHtml(article.title)}</a></h2>
<p>${escapeHtml(article.description)}</p>
${more(article.slug)}</div>
<div class="mh-blog-row-side"><p class="mh-blog-date">${date(article.publishAt)}</p>
${byline(`${article.readingTimeMinutes} min read`)}</div>
</li>`;
  }

  function card(article) {
    return `<li class="mh-blog-card"><a href="/blog/${article.slug}">
<span class="mh-blog-kicker">${escapeHtml(article.category)}</span>
<h3>${escapeHtml(article.title)}</h3>
<span class="mh-blog-meta">${date(article.publishAt)} · ${article.readingTimeMinutes} min read</span>
</a></li>`;
  }

  function tabs(active) {
    const items = [
      ['All', '/blog', !active],
      ...CATEGORIES.map((c) => [c.name, `/blog/category/${c.slug}`, active === c.slug]),
    ];
    return `<nav class="mh-blog-tabs" aria-label="Blog categories">${items
      .map(
        ([label, href, on]) =>
          `<a href="${href}"${on ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`,
      )
      .join('')}</nav>`;
  }

  async function listing(category) {
    const now = clock();
    const all = await articles.live(now);
    const shown = category ? all.filter((a) => a.category === category.name) : all;
    // The newest article leads the page, with the opening of its first code sample.
    const lead = shown[0] ? ((await articles.get(shown[0].slug)) ?? shown[0]) : null;
    const path = category ? `/blog/category/${category.slug}` : '/blog';
    const title = category
      ? `${category.name} Articles | Mantrilo Blog`
      : 'Mantrilo Blog: Vedic Astrology, Mantra & Scripture APIs';
    const description = category
      ? `Mantrilo articles on ${category.name.toLowerCase()}: guides and examples for developers building with Hindu content and astrology APIs.`
      : 'Guides from the Mantrilo team on Vedic astrology APIs, mantras and shlokas, sacred audio, scripture books, and the engineering behind them.';
    const html = await page({
      title,
      description,
      path,
      // Empty category pages stay out of search until they have articles.
      robots: shown.length ? 'index,follow' : 'noindex,follow',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          breadcrumb([
            ['Home', '/'],
            ['Blog', '/blog'],
            ...(category ? [[category.name, path]] : []),
          ]),
          {
            '@type': 'Blog',
            name: 'Mantrilo Blog',
            url: origin + '/blog',
            blogPost: shown.slice(0, 20).map((a) => ({
              '@type': 'BlogPosting',
              headline: a.title,
              url: `${origin}/blog/${a.slug}`,
              datePublished: a.publishAt.toISOString(),
            })),
          },
        ],
      },
      body: () => `<section class="mh-blog-top">${MESH}<div class="mh-wrap">
<div class="mh-blog-head"><div>
<h1>${category ? `<a href="/blog">Blog</a><span aria-hidden="true">/</span>${escapeHtml(category.name)}` : 'Blog'}</h1>
<p>${escapeHtml(description)}</p></div>
<a class="mh-blog-more" href="/blog/feed.xml">RSS feed<span aria-hidden="true">›</span></a></div>
${lead ? feature(lead) : ''}
</div></section>
<section class="mh-blog-index"><div class="mh-wrap">${tabs(category?.slug)}
${shown.length > 1 ? `<ul class="mh-blog-rows">${shown.slice(1).map(row).join('')}</ul>` : ''}
${shown.length ? '' : '<p class="mh-blog-empty">No articles here yet. New posts go out on Mondays, Wednesdays and Fridays.</p>'}
</div></section>`,
    });
    return [200, html, PAGE_CACHE];
  }

  async function article(slug) {
    const now = clock();
    const found = SLUG_PATTERN.test(slug) ? await articles.get(slug) : null;
    if (!found || !isLive(found, now)) return notFound();
    const body = renderMarkdown(found.markdown);
    const contents = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(
      ([, id, label]) => `<li><a href="#${id}">${label.replace(/<[^>]+>/g, '')}</a></li>`,
    );
    const related = (await articles.live(now))
      .filter((a) => a.slug !== found.slug)
      .sort((x, y) => (y.category === found.category) - (x.category === found.category))
      .slice(0, 3);
    const path = `/blog/${found.slug}`;
    const category = categorySlug(found.category);
    const organization = { '@type': 'Organization', name: 'Mantrilo', url: origin + '/' };
    const author = { '@type': 'Person', name: DEFAULT_AUTHOR, worksFor: organization };
    const modified =
      found.updatedAt && found.updatedAt > found.publishAt ? found.updatedAt : found.publishAt;
    const html = await page({
      title: `${found.title} | Mantrilo`,
      description: found.description,
      path,
      type: 'article',
      extraHead: [
        `<meta property="article:published_time" content="${found.publishAt.toISOString()}">`,
        `<meta property="article:modified_time" content="${modified.toISOString()}">`,
        `<meta property="article:section" content="${escapeHtml(found.category)}">`,
        found.keyword ? `<meta property="article:tag" content="${escapeHtml(found.keyword)}">` : '',
      ].join(''),
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          breadcrumb([
            ['Home', '/'],
            ['Blog', '/blog'],
            [found.category, `/blog/category/${category}`],
            [found.title, path],
          ]),
          {
            '@type': 'TechArticle',
            headline: found.title,
            description: found.description,
            url: origin + path,
            mainEntityOfPage: { '@type': 'WebPage', '@id': origin + path },
            datePublished: found.publishAt.toISOString(),
            dateModified: modified.toISOString(),
            author,
            publisher: {
              ...organization,
              logo: { '@type': 'ImageObject', url: `${origin}/mantrilo-social.png` },
            },
            image: `${origin}/mantrilo-social.png`,
            articleSection: found.category,
            ...(found.keyword ? { keywords: found.keyword } : {}),
            inLanguage: 'en',
            proficiencyLevel: 'Beginner',
            timeRequired: `PT${found.readingTimeMinutes}M`,
          },
        ],
      },
      body: (signup) => `<article class="mh-blog-article">
<header class="mh-blog-article-top">${MESH}<div class="mh-wrap mh-blog-grid">
<div class="mh-blog-title">
<nav class="mh-blog-crumbs" aria-label="Breadcrumb"><a href="/blog">Blog</a><span aria-hidden="true">/</span><a href="/blog/category/${category}">${escapeHtml(found.category)}</a></nav>
<h1>${escapeHtml(found.title)}</h1>
<p class="mh-blog-date">${date(found.publishAt)}<span>${found.readingTimeMinutes} min read</span></p>
</div></div></header>
<div class="mh-wrap mh-blog-grid mh-blog-layout">
<aside class="mh-blog-side">${byline()}
${contents.length > 1 ? `<nav class="mh-blog-toc" aria-label="On this page"><p>On this page</p><ol>${contents.join('')}</ol></nav>` : ''}</aside>
<div class="mh-blog-main">
<p class="mh-blog-lede">${escapeHtml(found.description)}</p>
<div class="mh-prose mh-blog-body">${body}</div>
<aside class="mh-blog-cta"><h2>Try it with a free sandbox key</h2>
<p>The free plan includes 500 API requests a month on the sample catalog, with astrology calculations included. Upgrade when your app is ready for the full library.</p>
<p><a class="mh-btn mh-btn-primary" href="${escapeHtml(signup)}">Get a free API key</a> <a class="mh-btn mh-btn-ghost" href="/docs">Read the docs</a></p></aside>
</div></div>
${related.length ? `<section class="mh-blog-related"><div class="mh-wrap"><div class="mh-blog-related-head"><h2>More from the blog</h2><a class="mh-blog-more" href="/blog">All articles<span aria-hidden="true">›</span></a></div><ul class="mh-blog-cards">${related.map(card).join('')}</ul></div></section>` : ''}
</article>`,
    });
    return [200, html, PAGE_CACHE];
  }

  async function notFound() {
    const html = await page({
      title: 'Article not found | Mantrilo',
      description:
        'This Mantrilo blog article could not be found. Browse the latest articles on the blog.',
      path: '/blog',
      robots: 'noindex,follow',
      body: () => `<section class="mh-page-hero mh-blog-hero"><div class="mh-wrap"><h1>Article not found</h1>
<p class="mh-lede">This article doesn’t exist or isn’t published yet.</p><p><a class="mh-btn mh-btn-ghost" href="/blog">See all articles</a></p></div></section>`,
    });
    return [404, html, 'public, max-age=60, s-maxage=60'];
  }

  async function sitemap() {
    const live = await articles.live(clock());
    const used = new Set(live.map((a) => a.category));
    const latest = (list) =>
      list.reduce(
        (max, a) =>
          Math.max(max, (a.updatedAt > a.publishAt ? a.updatedAt : a.publishAt).getTime()),
        0,
      );
    const entry = (path, time) =>
      `  <url><loc>${escapeHtml(origin + path)}</loc>${time ? `<lastmod>${new Date(time).toISOString()}</lastmod>` : ''}</url>`;
    const urls = [
      entry('/blog', latest(live)),
      ...CATEGORIES.filter((c) => used.has(c.name)).map((c) =>
        entry(`/blog/category/${c.slug}`, latest(live.filter((a) => a.category === c.name))),
      ),
      ...live.map((a) => entry(`/blog/${a.slug}`, latest([a]))),
    ];
    return [
      200,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      'public, max-age=300, s-maxage=300',
      'application/xml; charset=utf-8',
    ];
  }

  async function feed() {
    const live = (await articles.live(clock())).slice(0, 30);
    const items = live
      .map(
        (a) =>
          `<item><title>${escapeHtml(a.title)}</title><link>${origin}/blog/${a.slug}</link><guid>${origin}/blog/${a.slug}</guid><pubDate>${a.publishAt.toUTCString()}</pubDate><category>${escapeHtml(a.category)}</category><description>${escapeHtml(a.description)}</description></item>`,
      )
      .join('');
    return [
      200,
      `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Mantrilo Blog</title><link>${origin}/blog</link><description>Guides for developers building with Hindu content and astrology APIs.</description>${items}</channel></rss>\n`,
      'public, max-age=300, s-maxage=300',
      'application/rss+xml; charset=utf-8',
    ];
  }

  async function resolve(pathname) {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/blog') return listing(null);
    if (path === '/blog/sitemap.xml') return sitemap();
    if (path === '/blog/feed.xml') return feed();
    const category = path.match(/^\/blog\/category\/([a-z-]+)$/);
    if (category)
      return categoryBySlug.has(category[1])
        ? listing(categoryBySlug.get(category[1]))
        : notFound();
    const slug = path.match(/^\/blog\/([^/]+)$/);
    return slug ? article(decodeURIComponent(slug[1])) : notFound();
  }

  return {
    matches: (pathname) => pathname === '/blog' || pathname.startsWith('/blog/'),
    resolve,
    /** Answers a GET or HEAD for a /blog URL. */
    async serve(request, response, url) {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        return response.end();
      }
      // /blog/ → /blog, so every page has one address.
      if (url.pathname !== '/blog' && url.pathname.endsWith('/')) {
        response.writeHead(301, { Location: url.pathname.replace(/\/+$/, '') || '/blog' });
        return response.end();
      }
      const [status, body, cache, type = 'text/html; charset=utf-8'] = await resolve(url.pathname);
      const data = Buffer.from(body);
      response.removeHeader('X-Robots-Tag');
      response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.setHeader('Cache-Control', cache);
      response.setHeader('Content-Type', type);
      response.setHeader('Content-Length', data.length);
      response.writeHead(status);
      response.end(request.method === 'HEAD' ? undefined : data);
    },
  };
}
