const OPTIONS: Record<string, readonly string[]> = {
  '/docs': ['tab', 'operation', 'guide', 'preset'],
  '/library': ['type', 'item', 'q', 'collection', 'deity'],
  '/billing': ['plan', 'market'],
  '/keys': [],
  '/settings': [],
  '/implementation': ['guide'],
};

export function consoleReturn(value: string | undefined) {
  if (!value || !/^\/[a-z]+(?:\?|$)/.test(value)) return { pathname: '/' };
  try {
    const url = new URL(value, 'https://console.invalid');
    const keys = OPTIONS[url.pathname];
    if (!keys || url.origin !== 'https://console.invalid') return { pathname: '/' };
    const params: Record<string, string> = {};
    for (const key of keys) {
      const entry = url.searchParams.get(key);
      if (entry && entry.length <= 200) params[key] = entry;
    }
    return { pathname: url.pathname, params };
  } catch {
    return { pathname: '/' };
  }
}

export function requestedConsolePage() {
  if (typeof window === 'undefined') return '/';
  const base = process.env.EXPO_PUBLIC_CONSOLE_BASE_PATH || '';
  return window.location.pathname.slice(base.length) + window.location.search;
}
