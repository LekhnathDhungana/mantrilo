import type { Metadata } from 'expo-router/server';
import {
  indexingEnabled,
  seoPages,
  siteOrigin,
  socialImage,
  socialImageAlt,
  themeColor,
} from './site';
import { astrologyPages } from './astrology-pages';
import {
  DEFAULT_LOCALE,
  hasLocalizedUrl,
  i18n,
  intlLocale,
  isLocale,
  localeInfo,
  localizePath,
  locales,
  type Locale,
} from '../i18n';
export type PageMeta = {
  title: string;
  description: string;
  label: string;
  indexable: boolean;
  /** The page one level up in the breadcrumb, when it is not a section hub. */
  parent?: { path: string; label: string };
  /** Values for the placeholders in this page's meta.<path> strings. */
  vars?: Record<string, string | number>;
};

type Params = Record<string, string | string[]> | undefined;
const langOf = (params: Params): Locale => {
  const lang = params?.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
};

/** A page's title, description and breadcrumb label in a language. English is the source: a page
 * listed in seo-pages.json has its text under meta.<path>; generated pages build theirs from a
 * template (astrology capabilities, guides) or keep their English catalog metadata. */
export function localizedMeta(
  path: string,
  page: { title: string; description: string; label: string; vars?: PageMeta['vars'] },
  lang: Locale,
) {
  const t = i18n.getFixedT(lang);
  const key = `meta.${path}`;
  const vars = Object.fromEntries(
    Object.entries(page.vars ?? {}).map(([name, value]) => [
      name,
      typeof value === 'number' ? new Intl.NumberFormat(intlLocale(lang)).format(value) : value,
    ]),
  );
  if (i18n.exists(`${key}.title`, { lng: DEFAULT_LOCALE }))
    return {
      title: t(`${key}.title`, vars),
      description: t(`${key}.description`, vars),
      label: t(`${key}.label`, vars),
    };
  // Astrology capability pages: the capability name is the API's own and stays as published.
  const astrology = lang === DEFAULT_LOCALE ? null : astrologyPages.find((p) => p.path === path);
  if (astrology) {
    const guide = `guides.astrology-${astrology.operation}`;
    const name = astrology.name;
    return {
      title: t('meta.astrologyCapability.title', { name }),
      description:
        `${t(`${guide}.summary`)} ${t('meta.astrologyCapability.description', { name, path: '/v1/astrology/calculate' })}`.trim(),
      label: t('meta.astrologyCapability.label', { name }),
    };
  }
  return page;
}

/** <link rel="alternate" hreflang> targets: every language's address for a localized page. */
export function languageAlternates(path: string) {
  if (!siteOrigin || !hasLocalizedUrl(path)) return undefined;
  return {
    ...Object.fromEntries(locales.map((l) => [l.code, siteOrigin + localizePath(path, l.code)])),
    'x-default': siteOrigin + path,
  };
}

// `meta` is for generated pages (catalog items) whose metadata comes from their loader data
// rather than seo-pages.json. `params.lang` is set on the /<lang>/ copy of a page.
export function pageMetadata(path: string, meta?: PageMeta | null, params?: Params): Metadata {
  const lang = langOf(params);
  const known = meta ?? seoPages[path];
  const t = i18n.getFixedT(lang);
  const page = known
    ? { ...known, ...localizedMeta(path, known, lang) }
    : {
        title: t('meta.notFound.title'),
        description: t('meta.notFound.description'),
        indexable: false,
      };
  const canonical = siteOrigin && known ? siteOrigin + localizePath(path, lang) : undefined;
  const languages = known ? languageAlternates(path) : undefined;
  return {
    title: page.title,
    description: page.description,
    robots: indexingEnabled && page.indexable ? 'index,follow' : 'noindex,follow',
    alternates: canonical ? { canonical, languages } : undefined,
    openGraph: {
      title: page.title,
      description: page.description,
      type: 'website',
      siteName: 'Mantrilo',
      locale: localeInfo(lang).og,
      url: canonical,
      images: socialImage
        ? [
            {
              url: socialImage,
              alt: t('meta.socialImageAlt') || socialImageAlt,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
    twitter: {
      card: socialImage ? 'summary_large_image' : 'summary',
      title: page.title,
      description: page.description,
      images: socialImage
        ? [{ url: socialImage, alt: t('meta.socialImageAlt') || socialImageAlt }]
        : undefined,
    },
    other: { 'theme-color': themeColor },
  };
}
