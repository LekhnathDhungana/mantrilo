import {
  astrologyGuides,
  contentGuides,
  productionApi,
  type Guide,
} from '../../developer/src/data/integrations';
import { consoleSandboxUrl } from './site';
import { guideHref } from './public-guides';
import {
  audioResponse,
  bookResponse,
  chapterResponse,
  collectionRequest,
  collectionResponse,
  collections,
  curlGet,
  curlPost,
  mantra,
  MANTRA_ID,
  mantraListResponse,
  mantraResponse,
} from './examples';

export { guideHref } from './public-guides';

// The public catalog behind /library and /astrology-api. Everything here is static: requests and
// responses come from the shared guide data the console uses, so the two stay in step.

export type Area = 'mantras' | 'audio' | 'books' | 'astrology';
export const AREAS: { id: Area; label: string; type: string }[] = [
  { id: 'mantras', label: 'Mantras', type: 'Mantra' },
  { id: 'audio', label: 'Audio', type: 'Recording' },
  { id: 'books', label: 'Books', type: 'Book collection' },
  { id: 'astrology', label: 'Astrology', type: 'Astrology capability' },
];

export type Item = {
  id: string;
  area: Area;
  type: string;
  title: string;
  summary: string;
  facet: string;
  method: 'GET' | 'POST';
  path: string;
  request: string;
  response: unknown;
  responseLabel: string;
  inputs: string;
  render?: string;
  usage?: string;
  docs: string;
  guide: string;
  sandbox: string | null;
  limited?: boolean;
  steps?: { label: string; request: string; response?: unknown }[];
  /** The guide whose inputs, render and usage text this item shows (see src/i18n/guides.ts). */
  guideId: string;
};

const content = (id: string) => contentGuides.find((guide) => guide.id === id)!;

function astrologyItem(guide: Guide): Item {
  const op = guide.library.item!;
  return {
    id: guide.id,
    area: 'astrology',
    type: 'Astrology capability',
    title: guide.name,
    summary: guide.summary,
    facet: guide.category === 'Core astrology' ? 'Core' : (guide.category ?? 'Core'),
    method: 'POST',
    path: guide.path,
    request: curlPost(guide.path, guide.body ?? { operation: op }),
    response: guide.sample,
    responseLabel: guide.sampleLabel ?? 'Illustrative response excerpt',
    inputs: guide.inputs,
    render: guide.render,
    usage: guide.usage,
    docs: '/docs#astrology-calculate',
    guide: guideHref(guide.id),
    guideId: guide.id,
    sandbox: guide.limited ? null : consoleSandboxUrl({ operation: op }),
    limited: guide.limited,
  };
}

export const astrologyItems = astrologyGuides().map(astrologyItem);
export const astrologyCategories = ['Core', 'Vedic', 'Western', 'Numerology', 'Utilities'].filter(
  (c) => astrologyItems.some((item) => item.facet === c),
);

const search = content('search-mantras');
const featured = content('featured-mantra');
const audio = content('sacred-audio');
const upanishads = content('upanishads');
const reader = content('book-reader');

export const contentItems: Item[] = [
  {
    id: 'mantra-list',
    area: 'mantras',
    type: 'Mantra list',
    title: 'All mantras and shlokas',
    summary: 'Page through the catalog in a stable order, optionally filtered by deity.',
    facet: 'List',
    method: 'GET',
    path: '/v1/mantras',
    request: curlGet('/v1/mantras?limit=1'),
    response: mantraListResponse,
    responseLabel: 'Real record, one item',
    inputs: search.inputs,
    render: search.render,
    usage: search.usage,
    docs: '/docs#list-mantras',
    guide: guideHref(search.id),
    guideId: search.id,
    sandbox: consoleSandboxUrl({ preset: 'search-mantras' }),
  },
  {
    id: `mantra-${MANTRA_ID}`,
    area: 'mantras',
    type: 'Mantra',
    title: mantra.title ?? MANTRA_ID,
    summary: mantra.description ?? 'One mantra with its verses.',
    facet: 'Record',
    method: 'GET',
    path: '/v1/mantras/{id}',
    request: curlGet(`/v1/mantras/${MANTRA_ID}`),
    response: mantraResponse,
    responseLabel: 'Real record',
    inputs: featured.inputs,
    render: featured.render,
    usage: featured.usage,
    docs: '/docs#get-mantra',
    guide: guideHref(featured.id),
    guideId: featured.id,
    sandbox: consoleSandboxUrl({ preset: 'featured-mantra' }),
  },
  {
    id: 'recording',
    area: 'audio',
    type: 'Recording',
    title: `Recording · ${mantra.title ?? MANTRA_ID}`,
    summary: 'A 15-minute signed link to the recording of a mantra.',
    facet: 'Signed link',
    method: 'GET',
    path: '/v1/mantras/{id}/audio',
    request: curlGet(`/v1/mantras/${MANTRA_ID}/audio?format=json`),
    response: audioResponse,
    responseLabel: 'Real size and type, placeholder link',
    inputs: audio.inputs,
    render: audio.render,
    usage: audio.usage,
    docs: '/docs#mantra-audio',
    guide: guideHref(audio.id),
    guideId: audio.id,
    sandbox: consoleSandboxUrl({ preset: 'sacred-audio' }),
  },
  ...collections.map((collection): Item => ({
    id: `collection-${collection.id}`,
    area: 'books',
    type: 'Book collection',
    title: collection.name,
    summary: collection.note,
    facet: collection.tradition,
    method: 'GET',
    path: '/v1/books?collection=' + collection.id,
    request: collectionRequest(collection.id),
    response:
      collection.id === 'upanishads'
        ? collectionResponse
        : { data: [{ '…': '…', collection: { id: collection.id, name: collection.name } }] },
    responseLabel:
      collection.id === 'upanishads'
        ? 'Sandbox collection response'
        : 'Illustrative collection response',
    inputs: upanishads.inputs,
    render: upanishads.render,
    usage: upanishads.usage,
    docs: '/docs#list-books',
    guide: guideHref(collection.id === 'upanishads' ? upanishads.id : reader.id),
    guideId: upanishads.id,
    sandbox: collection.id === 'upanishads' ? consoleSandboxUrl({ preset: 'upanishads' }) : null,
    steps: [
      {
        label: 'Next page',
        request: collectionRequest(collection.id, '&cursor={nextCursor}'),
      },
      {
        label: 'Open a book and its chapter index',
        request: curlGet('/v1/books/{id}'),
        response: bookResponse,
      },
      {
        label: 'Open a chapter; each verse is in verses[]',
        request: curlGet('/v1/books/{id}/chapters/{chapter}'),
        response: chapterResponse,
      },
      {
        label: 'Read further into a long chapter',
        request: curlGet('/v1/books/{id}/chapters/{chapter}?offset={nextOffset}'),
      },
    ],
  })),
];

export const libraryItems: Item[] = [...contentItems, ...astrologyItems];
export const apiBase = productionApi;
