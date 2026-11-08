import { readFile, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
process.env.NODE_ENV ||= 'production';
createRequire(import.meta.url)('@expo/env').load(process.cwd());
const root = path.resolve(process.argv[2] || 'dist');
const pages = JSON.parse(await readFile('src/data/seo-pages.json', 'utf8'));
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
      .map(([route]) => `  <url><loc>${escape(origin + route)}</loc></url>`)
  : [];
await writeFile(
  path.join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);
await writeFile(
  path.join(root, 'robots.txt'),
  enabled
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
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
