// The site's languages. To add one: put its translations in public/locales/<code>.json (same keys
// as en.json; `npm run i18n:check` verifies) and add an entry here. Nothing else changes.

export type LocaleInfo = {
  /** BCP 47 language code, also the URL prefix (/hi/docs). */
  code: string;
  /** The language's name in its own script, as the switcher lists it. */
  name: string;
  dir: 'ltr' | 'rtl';
  /** Google Fonts family that covers the script, loaded only on this language's pages. */
  font: string | null;
  /** Open Graph locale. */
  og: string;
};

export const locales = [
  { code: 'en', name: 'English', dir: 'ltr', font: null, og: 'en_US' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr', font: 'Noto Sans Devanagari', og: 'hi_IN' },
  { code: 'ne', name: 'नेपाली', dir: 'ltr', font: 'Noto Sans Devanagari', og: 'ne_NP' },
  { code: 'gu', name: 'ગુજરાતી', dir: 'ltr', font: 'Noto Sans Gujarati', og: 'gu_IN' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr', font: 'Noto Sans Bengali', og: 'bn_IN' },
  { code: 'mr', name: 'मराठी', dir: 'ltr', font: 'Noto Sans Devanagari', og: 'mr_IN' },
  { code: 'ta', name: 'தமிழ்', dir: 'ltr', font: 'Noto Sans Tamil', og: 'ta_IN' },
  { code: 'te', name: 'తెలుగు', dir: 'ltr', font: 'Noto Sans Telugu', og: 'te_IN' },
  { code: 'kn', name: 'ಕನ್ನಡ', dir: 'ltr', font: 'Noto Sans Kannada', og: 'kn_IN' },
  { code: 'ml', name: 'മലയാളം', dir: 'ltr', font: 'Noto Sans Malayalam', og: 'ml_IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', dir: 'ltr', font: 'Noto Sans Gurmukhi', og: 'pa_IN' },
  { code: 'or', name: 'ଓଡ଼ିଆ', dir: 'ltr', font: 'Noto Sans Oriya', og: 'or_IN' },
  { code: 'as', name: 'অসমীয়া', dir: 'ltr', font: 'Noto Sans Bengali', og: 'as_IN' },
  { code: 'ur', name: 'اردو', dir: 'rtl', font: 'Noto Nastaliq Urdu', og: 'ur_PK' },
] as const satisfies readonly LocaleInfo[];

export type Locale = (typeof locales)[number]['code'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_KEY = 'mantrilo-lang';

const codes = new Set<string>(locales.map((l) => l.code));
export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && codes.has(value);
export const localeInfo = (code: Locale): LocaleInfo => locales.find((l) => l.code === code)!;
/** Every language that lives under its own URL prefix. */
export const prefixedLocales = locales.filter((l) => l.code !== DEFAULT_LOCALE).map((l) => l.code);

export function fontHref(code: Locale) {
  const font = localeInfo(code).font;
  if (!font) return null;
  return `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400..700&display=swap`;
}

/** The first browser language we support; a regional tag (hi-IN) matches its language (hi). */
export function matchLanguages(preferred: readonly string[]): Locale | null {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    if (isLocale(code)) return code;
  }
  return null;
}

// Catalog pages (one per mantra, deity, book and section) keep a single English URL; their
// interface still renders in the visitor's language. Every other page has a /<lang>/ address.
export function hasLocalizedUrl(path: string) {
  if (/^\/library\/mantras\/.+/.test(path)) return false;
  if (/^\/library\/books\/.+/.test(path) && path !== '/library/books/upanishads') return false;
  if (path === '/blog' || path.startsWith('/blog/') || path === '/blog-shell') return false;
  return true;
}

/** Split /hi/docs into ['hi', '/docs']; an unprefixed path is English. */
export function splitLocale(pathname: string): [Locale | null, string] {
  const match = pathname.match(/^\/([a-z]{2,3})(?=\/|$)(.*)$/);
  if (match && isLocale(match[1]) && match[1] !== DEFAULT_LOCALE)
    return [match[1], match[2] || '/'];
  return [null, pathname];
}

/** The address of an English path in a language, or the path itself when it has no localized URL. */
/** The Intl locale for a language. Numbers use Latin digits in every language, matching the digits
 * in code samples and API values beside them; grouping, currency and month names stay local. */
export const intlLocale = (code: Locale) => `${code}-u-nu-latn`;

export function localizePath(path: string, code: Locale) {
  const [, bare] = splitLocale(path);
  if (code === DEFAULT_LOCALE || !bare.startsWith('/') || !hasLocalizedUrl(bare.split(/[?#]/)[0]))
    return bare;
  return `/${code}${bare === '/' ? '' : bare.startsWith('/?') || bare.startsWith('/#') ? bare.slice(1) : bare}`;
}
