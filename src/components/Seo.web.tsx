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
import type { PageMeta } from '../data/metadata';

export default function Seo({
  path,
  meta,
  notFound = false,
}: {
  path: string;
  meta?: PageMeta;
  notFound?: boolean;
}) {
  const known = meta ?? seoPages[path];
  const page = known || {
    title: 'Page Not Found | Mantrilo',
    description:
      'This Mantrilo page could not be found. Explore the content API overview, product pages, or API documentation.',
    label: 'Page not found',
    indexable: false,
  };
  const canonical = siteOrigin && !notFound && known ? `${siteOrigin}${path}` : null;
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
    meta('property', 'og:locale', 'en_US');
    meta('property', 'og:url', canonical);
    meta('property', 'og:image', socialImage ?? null);
    meta('property', 'og:image:alt', socialImage ? socialImageAlt : null);
    meta('property', 'og:image:width', socialImage ? '1200' : null);
    meta('property', 'og:image:height', socialImage ? '630' : null);
    meta('name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    meta('name', 'twitter:image', socialImage ?? null);
    meta('name', 'twitter:image:alt', socialImage ? socialImageAlt : null);
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
  }, [canonical, page.title, page.description, robots]);

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
        inLanguage: 'en',
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
    const trail = [{ name: 'Home', item: `${siteOrigin}/` }];
    if (isGuide) trail.push({ name: 'API documentation', item: `${siteOrigin}/docs` });
    if (path.startsWith('/library/'))
      trail.push({ name: 'Library', item: `${siteOrigin}/library` });
    if (isCapability) trail.push({ name: 'Astrology API', item: `${siteOrigin}/astrology-api` });
    if (meta?.parent)
      trail.push({ name: meta.parent.label, item: `${siteOrigin}${meta.parent.path}` });
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
      inLanguage: 'en',
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
