import { consoleUrl, signUpUrl } from '../../data/site';

const CHANNEL_KEY = 'mantrilo-landing-channel';

function searchChannel() {
  const referrer = document.referrer ? new URL(document.referrer) : null;
  const isInternal =
    !referrer ||
    referrer.hostname === window.location.hostname ||
    referrer.hostname === 'mantrilo.com' ||
    referrer.hostname === 'www.mantrilo.com';

  try {
    if (isInternal) return sessionStorage.getItem(CHANNEL_KEY) === 'search';
    const search =
      /^(?:www\.)?(?:google\.(?:com|[a-z]{2}|(?:co|com)\.[a-z]{2})|bing\.com|duckduckgo\.com|search\.yahoo\.com|search\.brave\.com)$/.test(
        referrer.hostname,
      );
    sessionStorage.setItem(CHANNEL_KEY, search ? 'search' : 'other');
    return search;
  } catch {
    return false;
  }
}

export function tagConsoleEntry(target: EventTarget, route: string) {
  if (!(target instanceof Element)) return;
  const link = target.closest('a');
  if (!link) return;
  const url = new URL(link.href);
  const signup = new URL(signUpUrl);
  if (url.origin !== signup.origin) return;
  const tryPath = new URL(`${consoleUrl}/docs`).pathname;
  const tab = url.searchParams.get('tab');
  const isSignup = url.pathname === signup.pathname && url.searchParams.get('mode') === 'signup';
  const isTry =
    url.pathname === tryPath &&
    ((tab === 'try' && url.searchParams.has('preset')) ||
      (tab === 'astrology' && url.searchParams.has('operation')));
  if (!isSignup && !isTry) return;

  url.searchParams.set('entry', route);
  url.searchParams.set('channel', searchChannel() ? 'search' : 'other');
  link.href = url.href;
}

export function rememberConsoleChannel() {
  searchChannel();
}
