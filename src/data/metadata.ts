import type { Metadata } from 'expo-router/server';
import { indexingEnabled, seoPages, siteOrigin } from './site';
export function pageMetadata(path: string): Metadata {
  const page = seoPages[path] || { title: 'Page Not Found | Mantrilo', description: 'This Mantrilo page could not be found. Explore the content API overview, product pages, or integration guide.', indexable: false };
  const canonical = siteOrigin && seoPages[path] ? siteOrigin + path : undefined;
  return {
    title: page.title,
    description: page.description,
    robots: indexingEnabled && page.indexable ? 'index,follow' : 'noindex,follow',
    alternates: canonical ? { canonical } : undefined,
    openGraph: { title: page.title, description: page.description, type: 'website', siteName: 'Mantrilo', locale: 'en_US', url: canonical },
    twitter: { card: 'summary', title: page.title, description: page.description },
    other: { 'theme-color': '#faf8f2' },
  };
}
