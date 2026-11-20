import pages from './seo-pages.json';
import { astrologySeoPages } from './astrology-pages';
import { publicGuides } from './public-guides';
export const seoPages: Record<
  string,
  {
    title: string;
    description: string;
    label: string;
    indexable: boolean;
  }
> = {
  // Generated capability pages first, so a hand-written entry in seo-pages.json wins.
  ...astrologySeoPages,
  ...pages,
  ...Object.fromEntries(
    Object.entries(publicGuides).map(([slug, guide]) => [
      `/docs/guides/${slug}`,
      {
        title: `${guide.title} | Mantrilo`,
        description: guide.description,
        label: guide.label,
        indexable: true,
      },
    ]),
  ),
};
const configuredUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim();
function productionOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export const siteOrigin = productionOrigin(configuredUrl);
export const themeColor = '#FFFBF5';
export const socialImage = siteOrigin ? `${siteOrigin}/mantrilo-social.png` : undefined;
export const socialImageAlt = 'Mantrilo Hindu Content API for developers';
export const indexingEnabled = process.env.EXPO_PUBLIC_INDEXING_ENABLED === 'true' && !!siteOrigin;

// Developer console origin. "Get API key", "Sign in", plan buttons and "Try in Sandbox" all go
// there. Local development falls back to the console's default local port; a production build
// must set EXPO_PUBLIC_CONSOLE_URL, or the export fails rather than shipping dead buttons.
function consoleOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const path = url.pathname.replace(/\/$/, '');
    if (url.username || url.password || url.search || url.hash || (path && path !== '/console'))
      return null;
    if (process.env.EXPO_PUBLIC_INDEXING_ENABLED === 'true') {
      const origin = productionOrigin(url.origin);
      return origin ? origin + path : null;
    }
    return ['https:', 'http:'].includes(url.protocol) ? url.origin + path : null;
  } catch {
    return null;
  }
}
const LOCAL_CONSOLE = 'http://localhost:4190';
function resolveConsoleUrl() {
  const configured = consoleOrigin(process.env.EXPO_PUBLIC_CONSOLE_URL);
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return LOCAL_CONSOLE;
  throw new Error(
    'EXPO_PUBLIC_CONSOLE_URL is not set. Set it to the developer console origin, for example https://console.mantrilo.com, before exporting the site.',
  );
}
export const consoleUrl = resolveConsoleUrl();
export const signUpUrl = `${consoleUrl}/login?mode=signup`;
export const signInUrl = `${consoleUrl}/login`;

export function consoleSandboxUrl(params: { preset: string } | { operation: string }) {
  const request = new URLSearchParams(
    'operation' in params ? { tab: 'astrology', ...params } : { tab: 'try', ...params },
  );
  return `${consoleUrl}/docs?${request}`;
}
