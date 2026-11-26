import { useEffect } from 'react';
import {
  indexingEnabled,
  seoPages,
  siteOrigin,
  socialImage,
  socialImageAlt,
  themeColor,
} from '../data/site';
import { plans } from '../data/plans';
import { localizedMeta, type PageMeta } from '../data/metadata';
import { localeInfo, localizePath, locales, hasLocalizedUrl, useI18n } from '../i18n';

export default function Seo({
  path,
  meta,
  notFound = false,
}: {
  path: string;
  meta?: PageMeta;
  notFound?: boolean;
}) {
  const { lang, t } = useI18n();
  const known = meta ?? seoPages[path];
  const page = known
    ? { ...known, ...localizedMeta(path, known, lang) }
    : {
        title: t('meta.notFound.title'),
        description: t('meta.notFound.description'),
        label: t('meta.notFound.label'),
        indexable: false,
      };
  const canonical =
    siteOrigin && !notFound && known ? `${siteOrigin}${localizePath(path, lang)}` : null;
  const alternates = canonical && hasLocalizedUrl(path);
  const imageAlt = t('meta.socialImageAlt') || socialImageAlt;
  const robots = indexingEnabled && page.indexable && !notFound ? 'index,follow' : 'noindex,follow';
  // generateMetadata supplies the initial HTML. Synchronize that same metadata
  // on client navigation without appending a second set of Head tags.
  useEffect(() => {
    document.title = page.title;
    function meta(attribute: 'name' | 'property', key: string, value: string | null) {
      const existing = Array.from(
        document.head.querySelectorAll<HTMLMetaElement>(`meta[${attribute}="${key}"]`),
      );
      if (value === null) {
        existing.forEach((element) => element.remove());
        return;
      }
      const element = existing.shift() || document.createElement('meta');
      element.setAttribute(attribute, key);
      element.content = value;
      if (!element.parentNode) document.head.appendChild(element);
      existing.forEach((duplicate) => duplicate.remove());
    }
    meta('name', 'description', page.description);
    meta('name', 'robots', robots);
    meta('name', 'theme-color', themeColor);
    meta('property', 'og:title', page.title);
    meta('property', 'og:description', page.description);
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', 'Mantrilo');
    meta('property', 'og:locale', localeInfo(lang).og);
    meta('property', 'og:url', canonical);
    meta('property', 'og:image', socialImage ?? null);
    meta('property', 'og:image:alt', socialImage ? imageAlt : null);
    meta('property', 'og:image:width', socialImage ? '1200' : null);
    meta('property', 'og:image:height', socialImage ? '630' : null);
    meta('name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    meta('name', 'twitter:image', socialImage ?? null);
    meta('name', 'twitter:image:alt', socialImage ? imageAlt : null);
    meta('name', 'twitter:title', page.title);
    meta('name', 'twitter:description', page.description);
    const links = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
    );
    if (canonical) {
      const link = links.shift() || document.createElement('link');
      link.rel = 'canonical';
      link.href = canonical;
      if (!link.parentNode) document.head.appendChild(link);
    }
    links.forEach((link) => link.remove());
    // hreflang alternates: every language's address for a page with localized URLs.
    document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((link) => link.remove());
    if (alternates && siteOrigin) {
      const targets: [string, string][] = [
        ...locales.map((l): [string, string] => [l.code, siteOrigin + localizePath(path, l.code)]),
        ['x-default', siteOrigin + path],
      ];
      for (const [hreflang, href] of targets) {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = href;
        document.head.appendChild(link);
      }
    }
  }, [canonical, alternates, path, lang, imageAlt, page.title, page.description, robots]);

  if (!siteOrigin || !canonical) return null;
  const organization = { '@id': `${siteOrigin}/#organization` };
  const api = { '@id': `${siteOrigin}/docs#api` };
  const isGuide = path.startsWith('/docs/guides/');
  const isCapability = path.startsWith('/astrology-api/');
  const graph: Record<string, unknown>[] = [];
  if (path === '/') {
    graph.push(
      { '@type': 'Organization', ...organization, name: 'Mantrilo', url: canonical },
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        name: 'Mantrilo',
        url: canonical,
        publisher: organization,
        inLanguage: lang,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteOrigin}/#platform`,
        name: 'Mantrilo Hindu Content API',
        url: canonical,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        description: page.description,
        publisher: organization,
        offers: {
          '@type': 'Offer',
          name: 'Free sandbox',
          price: '0',
          priceCurrency: 'USD',
          url: `${siteOrigin}/pricing`,
        },
      },
    );
  } else {
    const at = (target: string) => `${siteOrigin}${localizePath(target, lang)}`;
    const trail = [{ name: t('chrome.crumbHome'), item: at('/') }];
    if (isGuide) trail.push({ name: t('notFound.docs'), item: at('/docs') });
    if (path.startsWith('/library/'))
      trail.push({ name: t('meta./library.label'), item: at('/library') });
    if (isCapability)
      trail.push({ name: t('meta./astrology-api.label'), item: at('/astrology-api') });
    if (meta?.parent) trail.push({ name: meta.parent.label, item: at(meta.parent.path) });
    trail.push({ name: page.label, item: canonical });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...item,
      })),
    });
  }
  if (path === '/docs' || isGuide || isCapability) {
    graph.push({
      '@type': 'TechArticle',
      '@id': `${canonical}#article`,
      headline:
        path === '/docs' ? 'Mantrilo API documentation' : page.title.replace(/ \| Mantrilo$/, ''),
      url: canonical,
      mainEntityOfPage: canonical,
      inLanguage: lang,
      publisher: organization,
      about: api,
    });
  }
  if (path === '/docs') {
    graph.push({
      '@type': 'WebAPI',
      ...api,
      name: 'Mantrilo REST API',
      url: 'https://api.mantrilo.com/v1',
      documentation: canonical,
      provider: organization,
    });
  }
  const service = {
    '/mantra-api': 'Mantra API',
    '/astrology-api': 'Astrology API',
    '/books-api': 'Books API',
  }[path];
  if (path === '/pricing') {
    graph.push({
      '@type': 'OfferCatalog',
      name: 'Mantrilo API plans',
      url: canonical,
      itemListElement: plans.map((plan) => ({
        '@type': 'Offer',
        name: plan.name,
        price: plan.price,
        priceCurrency: 'USD',
        url: canonical,
        itemOffered: { '@id': `${siteOrigin}/#platform` },
      })),
    });
  }
  if (service) {
    graph.push({
      '@type': 'Service',
      '@id': `${canonical}#service`,
      name: `Mantrilo ${service}`,
      serviceType: service,
      description: page.description,
      url: canonical,
      provider: organization,
    });
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
          /</g,
          '\\u003c',
        ),
      }}
    />
  );
}
