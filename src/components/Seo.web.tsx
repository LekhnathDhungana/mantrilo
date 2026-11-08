import { useEffect } from 'react';
import { indexingEnabled, seoPages, siteOrigin } from '../data/site';

export default function Seo({ path, notFound = false }: { path: string; notFound?: boolean }) {
  const page = seoPages[path] || { title: 'Page Not Found | Mantrilo', description: 'This Mantrilo page could not be found. Explore the content API overview, product pages, or integration guide.', label: 'Page not found', indexable: false };
  const canonical = siteOrigin && !notFound && seoPages[path] ? `${siteOrigin}${path}` : null;
  const robots = indexingEnabled && page.indexable && !notFound ? 'index,follow' : 'noindex,follow';
  // generateMetadata supplies the initial HTML. Synchronize that same metadata
  // on client navigation without appending a second set of Head tags.
  useEffect(() => {
    document.title = page.title;
    function meta(attribute: 'name' | 'property', key: string, value: string | null) {
      const existing = Array.from(document.head.querySelectorAll<HTMLMetaElement>(`meta[${attribute}="${key}"]`));
      if (value === null) { existing.forEach(element => element.remove()); return; }
      const element = existing.shift() || document.createElement('meta');
      element.setAttribute(attribute, key);
      element.content = value;
      if (!element.parentNode) document.head.appendChild(element);
      existing.forEach(duplicate => duplicate.remove());
    }
    meta('name','description',page.description);
    meta('name','robots',robots);
    meta('name','theme-color','#faf8f2');
    meta('property','og:title',page.title);
    meta('property','og:description',page.description);
    meta('property','og:type','website');
    meta('property','og:site_name','Mantrilo');
    meta('property','og:locale','en_US');
    meta('property','og:url',canonical);
    meta('name','twitter:card','summary');
    meta('name','twitter:title',page.title);
    meta('name','twitter:description',page.description);
    const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    if (canonical) {
      const link = links.shift() || document.createElement('link');
      link.rel = 'canonical'; link.href = canonical;
      if (!link.parentNode) document.head.appendChild(link);
    }
    links.forEach(link => link.remove());
  }, [canonical, page.title, page.description, robots]);

  if (!siteOrigin || !canonical) return null;
  const graph = path === '/' ? [{ '@type': 'Organization', '@id': `${siteOrigin}/#organization`, name: 'Mantrilo', url: `${siteOrigin}/`, description: 'A B2B Hindu content API for developers building apps and websites. Astrology is a separate product integration.' }] : [{
    '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
      { '@type': 'ListItem', position: 2, name: page.label, item: canonical },
    ],
  }];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') }} />;
}
