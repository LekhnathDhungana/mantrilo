import { readdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
process.env.NODE_ENV ||= 'production';
createRequire(import.meta.url)('@expo/env').load(process.cwd());
const root = path.resolve(process.argv[2] || 'dist');
// The exported HTML is the list of pages: every route, including the generated catalog pages,
// with the robots and canonical tags its own metadata produced.
const reserved = new Set(['404.html', '+not-found.html', '_sitemap.html']);
// A dynamic index route (library/books/[book]/index.tsx) exports as books/gita/index.html. Serve
// it as books/gita.html, the address every other page uses; its loader data stays where it is.
for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || entry.name !== 'index.html' || entry.parentPath === root) continue;
  if (path.relative(root, entry.parentPath).startsWith('_expo')) continue;
  await rename(path.join(entry.parentPath, entry.name), `${entry.parentPath}.html`);
}
const pages = {};
for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = path.relative(root, path.join(entry.parentPath, entry.name));
  // Expo also exports each dynamic route's bare template ([capability].html); it is not a page.
  if (/\[[^\]]+\]/.test(file)) {
    await rm(path.join(root, file));
    // …along with the folder it may leave behind (library/books/[book]/).
    const folder = path.dirname(path.join(root, file));
    if (/\[[^\]]+\]$/.test(folder) && (await readdir(folder)).length === 0)
      await rm(folder, { recursive: true });
    continue;
  }
  if (reserved.has(file) || file.startsWith('_expo' + path.sep)) continue;
  const html = await readFile(path.join(root, file), 'utf8');
  const route = file === 'index.html' ? '/' : '/' + file.slice(0, -5).split(path.sep).join('/');
  pages[route] = {
    indexable: /<meta[^>]+name="robots"[^>]+content="index,follow"/.test(html),
    canonical: html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ?? null,
  };
}
// The bare templates' loader data goes with them.
for (const entry of await readdir(path.join(root, '_expo', 'loaders'), {
  recursive: true,
  withFileTypes: true,
}).catch(() => []))
  if (/^\[[^\]]+\]/.test(entry.name))
    await rm(path.join(entry.parentPath, entry.name), { recursive: true, force: true });
const configured = process.env.EXPO_PUBLIC_SITE_URL?.trim();
let origin = null;
if (configured) {
  const url = new URL(configured);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    throw new Error(
      'EXPO_PUBLIC_SITE_URL must be a public HTTPS origin without a path, credentials, query, or fragment.',
    );
  origin = url.origin;
}
const enabled = process.env.EXPO_PUBLIC_INDEXING_ENABLED === 'true';
if (enabled && !origin) throw new Error('Production indexing requires EXPO_PUBLIC_SITE_URL.');
const escape = (value) =>
  value.replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char],
  );
const urls = enabled
  ? Object.entries(pages)
      .filter(([, page]) => page.indexable)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([route, page]) => {
        if (page.canonical !== origin + route)
          throw new Error(`${route}: canonical ${page.canonical} does not match its address.`);
        return `  <url><loc>${escape(origin + route)}</loc></url>`;
      })
  : [];
await writeFile(
  path.join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);
await writeFile(
  path.join(root, 'robots.txt'),
  enabled
    ? // The blog's sitemap is served live by the blog renderer (developer/server/blog.mjs).
      `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/blog/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n',
);
let missingPage = await readFile(path.join(root, '+not-found.html'), 'utf8').catch(() =>
  readFile(path.join(root, '404.html'), 'utf8'),
);
// Expo does not currently resolve generateMetadata for its reserved not-found export.
if (!/<meta[^>]+name=["']robots["']/.test(missingPage)) {
  missingPage = missingPage.replace(
    '</head>',
    '<title>Page Not Found | Mantrilo</title><meta name="description" content="This Mantrilo page could not be found. Return to the content API overview or integration guide."/><meta name="robots" content="noindex,follow"/></head>',
  );
}
await writeFile(path.join(root, '404.html'), missingPage);
await rm(path.join(root, '_sitemap.html'), { force: true });
await rm(path.join(root, '+not-found.html'), { force: true });
const redirects = Object.keys(pages)
  .map(
    (route) =>
      `location = ${route === '/' ? '/index' : route}.html { return 308 ${route}$is_args$args; }`,
  )
  .join('\n');
await writeFile(
  path.join(root, 'nginx-seo.conf'),
  `${enabled ? '' : 'add_header X-Robots-Tag "noindex, nofollow" always;\n'}${redirects}\n`,
);
// Hosting configuration must never be served as a public asset.
console.log(
  `Finalized ${Object.keys(pages).length} routes; indexing ${enabled ? 'enabled for configured production origin' : 'disabled (preview)'}; sitemap contains ${urls.length} URLs.`,
);
