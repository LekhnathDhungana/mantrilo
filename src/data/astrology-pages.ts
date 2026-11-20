import { astrologyGuides } from '../../developer/src/data/integrations';

// One reference page per astrology capability, at /astrology-api/{slug}. Slugs are permanent
// URLs: the operation id unless an older or clearer address already exists.
const slugOverrides: Record<string, string> = {
  positions: 'planetary-positions',
  panchang: 'instant-panchang',
  chart: 'vedic-birth-chart',
  match: 'guna-milan',
  'chart-image': 'vedic-chart-image',
  places: 'place-search',
};

export const astrologySlug = (operation: string) => slugOverrides[operation] ?? operation;

const minorWords = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const titleCase = (text: string) =>
  text
    .split(' ')
    .map((word, i) =>
      i > 0 && minorWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');

// "Natal chart" alone is ambiguous next to the Vedic chart, so name the tradition when the
// capability's own name doesn't.
function displayName(name: string, category: string | undefined) {
  const tradition = category === 'Western' || category === 'Vedic' ? category : null;
  return titleCase(
    tradition && !name.toLowerCase().includes(tradition.toLowerCase())
      ? `${tradition} ${name}`
      : name,
  );
}

export type AstrologyPage = {
  slug: string;
  path: string;
  operation: string;
  name: string;
  category: string;
  title: string;
  label: string;
  description: string;
  indexable: boolean;
};

export const astrologyPages: AstrologyPage[] = astrologyGuides().map((guide) => {
  const operation = guide.id.replace(/^astrology-/, '');
  const slug = astrologySlug(operation);
  const name = displayName(guide.name, guide.category);
  return {
    slug,
    path: `/astrology-api/${slug}`,
    operation,
    name,
    category: guide.category ?? 'Core astrology',
    title: `${name} API for Developers | Mantrilo`,
    label: `${name} API`,
    description: `${guide.summary} See the inputs, a copyable POST ${guide.path} request and a sample JSON response for the ${name} API.`,
    // A page whose sample is only the empty response envelope has nothing to document yet.
    indexable: !guide.sampleLabel?.startsWith('Response envelope'),
  };
});

export const astrologySeoPages = Object.fromEntries(
  astrologyPages.map((page) => [
    page.path,
    {
      title: page.title,
      description: page.description,
      label: page.label,
      indexable: page.indexable,
    },
  ]),
);
