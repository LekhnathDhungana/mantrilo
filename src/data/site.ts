import pages from './seo-pages.json';
export const seoPages: Record<string, { title: string; description: string; label: string; indexable: boolean }> = pages;
const configuredUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim();
function productionOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
export const siteOrigin = productionOrigin(configuredUrl);
export const indexingEnabled = process.env.EXPO_PUBLIC_INDEXING_ENABLED === 'true' && !!siteOrigin;
