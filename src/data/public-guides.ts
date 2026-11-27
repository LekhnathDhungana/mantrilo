import registry from './public-guides.json';

type PublicGuide = { id: string; label: string; title: string; description: string };
export const publicGuides: Record<string, PublicGuide> = registry;
export const publicGuide = (slug: string) =>
  Object.hasOwn(publicGuides, slug) ? publicGuides[slug] : undefined;

const slugById = new Map(Object.entries(publicGuides).map(([slug, guide]) => [guide.id, slug]));

export function guideHref(id: string) {
  const slug = slugById.get(id);
  return slug ? `/docs/guides/${slug}` : `/docs?guide=${encodeURIComponent(id)}`;
}
