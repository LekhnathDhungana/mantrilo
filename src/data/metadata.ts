import type { Metadata } from 'expo-router/server';
import {
  indexingEnabled,
  seoPages,
  siteOrigin,
  socialImage,
  socialImageAlt,
  themeColor,
} from './site';
export type PageMeta = {
  title: string;
  description: string;
  label: string;
  indexable: boolean;
  /** The page one level up in the breadcrumb, when it is not a section hub. */
  parent?: { path: string; label: string };
};

// `meta` is for generated pages (catalog items) whose metadata comes from their loader data
// rather than seo-pages.json.
export function pageMetadata(path: string, meta?: PageMeta | null): Metadata {
  const known = meta ?? seoPages[path];
  const page = known || {
    title: 'Page Not Found | Mantrilo',
    description:
      'This Mantrilo page could not be found. Explore the content API overview, product pages, or integration guide.',
    indexable: false,
  };
  const canonical = siteOrigin && known ? siteOrigin + path : undefined;
  return {
    title: page.title,
    description: page.description,
    robots: indexingEnabled && page.indexable ? 'index,follow' : 'noindex,follow',
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: page.title,
      description: page.description,
      type: 'website',
      siteName: 'Mantrilo',
      locale: 'en_US',
      url: canonical,
      images: socialImage
        ? [{ url: socialImage, alt: socialImageAlt, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: socialImage ? 'summary_large_image' : 'summary',
      title: page.title,
      description: page.description,
      images: socialImage ? [{ url: socialImage, alt: socialImageAlt }] : undefined,
    },
    other: { 'theme-color': themeColor },
  };
}
