import { createStaticLoader } from 'expo-router/server';
import AstrologyCapability from '../../components/AstrologyCapability';
import { astrologyPages } from '../../data/astrology-pages';
import { astrologyItems } from '../../data/library';
import { pageMetadata } from '../../data/metadata';
import { seoPages } from '../../data/site';

// One static page per astrology capability. Each page's data is delivered by the loader, so it
// lands in that page's HTML rather than in the shared client bundle.

export async function generateStaticParams() {
  return astrologyPages.map((page) => ({ capability: page.slug }));
}

export const loader = createStaticLoader((params) => {
  // The exporter also renders the bare [capability] template; finalize-web removes that file.
  const page = astrologyPages.find((entry) => entry.slug === params.capability);
  if (!page) return null;
  const item = astrologyItems.find((entry) => entry.id === `astrology-${page.operation}`)!;
  const related = astrologyPages
    .filter((entry) => entry.category === page.category && entry.slug !== page.slug)
    .slice(0, 6)
    .map(({ path, label, operation }) => ({ path, label, id: `astrology-${operation}` }));
  // A hand-written seo-pages.json label (the three original pages) wins over the generated one.
  const heading = seoPages[page.path]?.label ?? page.label;
  return { page, heading, item, related };
});

export function generateMetadata(_request: unknown, params: Record<string, string | string[]>) {
  return pageMetadata(`/astrology-api/${String(params.capability)}`, undefined, params);
}

export default function Page() {
  return <AstrologyCapability />;
}
