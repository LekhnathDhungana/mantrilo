import { createInstance, type TFunction } from 'i18next';
import { useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'expo-router';
import en from './locales/en.json';
import {
  DEFAULT_LOCALE,
  LOCALE_KEY,
  fontHref,
  hasLocalizedUrl,
  intlLocale,
  isLocale,
  localeInfo,
  localizePath,
  matchLanguages,
  splitLocale,
  type Locale,
} from './locales';

export * from './locales';

// One i18next instance. English is bundled as the fallback. Every other language is served as
// /locales/<code>.js (generated from src/i18n/locales/<code>.json by scripts/i18n-build.mjs): a
// page under /<lang>/ loads its language's file in <head>, before the app hydrates, and other
// languages load when the visitor switches.
export const i18n = createInstance();
i18n.init({
  resources: { en: { translation: en } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  initAsync: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
  // A key missing everywhere renders nothing rather than the raw key.
  parseMissingKeyHandler: () => '',
  showSupportNotice: false,
} as Parameters<typeof i18n.init>[0]);

type Loaded = Record<string, Record<string, unknown>>;
declare global {
  var __MH_I18N__: Loaded | undefined;
}
export const localeScript = (code: Locale) => `/locales/${code}.js`;

function adopt() {
  const loaded = globalThis.__MH_I18N__;
  if (!loaded) return;
  for (const [code, strings] of Object.entries(loaded))
    if (isLocale(code) && !i18n.hasResourceBundle(code, 'translation'))
      i18n.addResourceBundle(code, 'translation', strings, true, true);
}
if (typeof window !== 'undefined') adopt();
// Static export renders every language in Node, so the server registers them all.
// eslint-disable-next-line @typescript-eslint/no-require-imports
else require('./server');

const loading = new Map<Locale, Promise<void>>();
export function loadLocale(code: Locale): Promise<void> {
  adopt();
  if (i18n.hasResourceBundle(code, 'translation')) return Promise.resolve();
  let pending = loading.get(code);
  if (!pending) {
    pending = new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = localeScript(code);
      script.onload = script.onerror = () => {
        adopt();
        loading.delete(code);
        resolve();
      };
      document.head.appendChild(script);
    });
    loading.set(code, pending);
  }
  return pending;
}

// The language of a page without its own localized URL (a catalog page): the visitor's saved or
// browser language, applied after hydration. Pages with a /<lang>/ URL always follow the URL.
let preferred: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();
const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => preferred,
  server: () => DEFAULT_LOCALE as Locale,
};
export function setPreferredLocale(code: Locale) {
  if (code === preferred && i18n.hasResourceBundle(code, 'translation')) return;
  loadLocale(code).then(() => {
    preferred = code;
    listeners.forEach((listener) => listener());
  });
}

export function savedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    return isLocale(saved) ? saved : null;
  } catch {
    return null;
  }
}
export function saveLocale(code: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, code);
  } catch {}
}
/** Saved choice, then the browser's languages, then English. */
export function detectLocale(): Locale {
  return (
    savedLocale() ??
    (typeof navigator === 'undefined'
      ? null
      : matchLanguages(navigator.languages?.length ? navigator.languages : [navigator.language])) ??
    DEFAULT_LOCALE
  );
}

export type I18n = {
  lang: Locale;
  dir: 'ltr' | 'rtl';
  t: TFunction;
  /** English path → this language's address for it. */
  href: (path: string) => string;
  /** The current page's English path. */
  path: string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
};

export function useI18n(): I18n {
  const pathname = usePathname();
  const [urlLang, path] = splitLocale(pathname);
  const fallback = useSyncExternalStore(store.subscribe, store.get, store.server);
  const lang: Locale = urlLang ?? (hasLocalizedUrl(path) ? DEFAULT_LOCALE : fallback);
  return useMemo(() => makeI18n(lang, path), [lang, path]);
}

export function makeI18n(lang: Locale, path = '/'): I18n {
  const t = i18n.getFixedT(lang);
  // Intl tags: Odia and Assamese have CLDR data; fall back quietly where a runtime lacks it.
  const number = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(intlLocale(lang), options).format(value);
  const date = (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale(lang), options ?? { dateStyle: 'medium' }).format(
      typeof value === 'string' ? new Date(value) : value,
    );
  return {
    lang,
    dir: localeInfo(lang).dir,
    t,
    href: (target: string) => (target.startsWith('/') ? localizePath(target, lang) : target),
    path,
    number,
    date,
  };
}

/** Apply a language to the live document: lang, dir and the script's font. */
export function applyDocumentLocale(code: Locale) {
  const root = document.documentElement;
  root.lang = code;
  root.dir = localeInfo(code).dir;
  const href = fontHref(code);
  if (href && !document.querySelector(`link[data-locale-font="${code}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.localeFont = code;
    document.head.appendChild(link);
  }
}
