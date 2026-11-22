/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import type { PageMeta } from './metadata';

// Build-time only: loaders, generateStaticParams and generateMetadata read the mantra snapshot
// (scripts/snapshot-mantras.mjs) from disk. It is read, not imported, so the 5 MB file never
// becomes a JavaScript chunk. Client components import types from here, never values.

type DeityRef = { id: string; name: string | null };

type Record = {
  id: string;
  slug: string;
  title: string;
  deity: DeityRef | null;
  deities: DeityRef[];
  category: string | null;
  source: string | null;
  citedSource: string | null;
  description: string | null;
  hasAudio: boolean;
  sandbox: boolean;
  alternateIds: string[];
  verses: {
    number: number | null;
    title: string | null;
    sanskrit: string | null;
    transliteration: string | null;
  }[];
};

export type Deity = { id: string; name: string; path: string; count: number };

export type MantraListing = {
  slug: string;
  path: string;
  title: string;
  deities: string[];
  verseCount: number;
  hasAudio: boolean;
};

export type MantraPage = {
  meta: PageMeta;
  path: string;
  /** `verses` holds only the first TEXT_VERSES; `verseCount` is the full count. */
  mantra: Omit<Record, 'deities'> & { deities: Deity[]; verseCount: number };
  /** Mantrilo's own summary for developers, written from the record's fields. */
  lede: string;
  /** Exactly what GET /v1/mantras/{id} returns for this mantra, verses trimmed for display. */
  response: unknown;
  shownVerses: number;
  related: MantraListing[];
};

export type DeityPage = {
  meta: PageMeta;
  path: string;
  deity: Deity;
  mantras: MantraListing[];
  /** What GET /v1/mantras?deity={id}&limit=2 returns: the first two records by id. */
  response: unknown;
};

export type MantraHub = {
  deities: Deity[];
  mantras: MantraListing[];
  total: number;
  audio: number;
};

const SHOWN_VERSES = 2;
// The page shows the opening verses; the API returns them all.
const TEXT_VERSES = 5;
export const mantraPath = (slug: string) => `/library/mantras/${slug}`;
const deityPath = (id: string) => `/library/mantras/deity/${id.replace(/_/g, '-')}`;

// The catalog's deity names all read "Lord …" ("Lord Devi"); pages use the plain name. API
// responses keep the stored value.
const deityName = (id: string) =>
  id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

type Index = {
  records: Record[];
  bySlug: Map<string, Record>;
  deities: Map<string, Deity>;
  byDeity: Map<string, Record[]>;
  fetchedAt: string;
};
let index: Index | null = null;

function build(): Index {
  if (index) return index;
  const file = path.join(process.cwd(), 'src/data/mantra-catalog.json');
  const { mantras, fetchedAt } = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    mantras: Record[];
    fetchedAt: string;
  };
  const byDeity = new Map<string, Record[]>();
  for (const record of mantras)
    for (const deity of record.deities) {
      const list = byDeity.get(deity.id) ?? [];
      list.push(record);
      byDeity.set(deity.id, list);
    }
  const deities = new Map(
    [...byDeity]
      .sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))
      .map(([id, list]) => [
        id,
        { id, name: deityName(id), path: deityPath(id), count: list.length } satisfies Deity,
      ]),
  );
  index = {
    records: mantras,
    bySlug: new Map(mantras.map((record) => [record.slug, record])),
    deities,
    byDeity,
    fetchedAt,
  };
  return index;
}

const listing = (record: Record): MantraListing => ({
  slug: record.slug,
  path: mantraPath(record.slug),
  title: record.title,
  deities: record.deities.map((deity) => deity.id),
  verseCount: record.verses.length,
  hasAudio: record.hasAudio,
});

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const clip = (text: string, max: number) =>
  text.length <= max
    ? text
    : text.slice(0, text.lastIndexOf(' ', max - 1)).replace(/[,;:]$/, '') + '…';

// The list item mantraSummary (developer/api/content.mjs) builds for this record.
const summary = (record: Record) => ({
  id: record.id,
  title: record.title,
  deity: record.deity,
  category: record.category,
  source: record.source,
  description: record.description,
  verseCount: record.verses.length,
  audio: record.hasAudio ? { href: `/v1/mantras/${record.id}/audio` } : null,
});

// The response mantraDetail (developer/api/content.mjs) builds for this record.
function response(record: Record, shown: number) {
  return {
    data: {
      ...summary(record),
      verses: record.verses.slice(0, shown).map((verse) => ({
        number: verse.number,
        title: verse.title,
        sanskrit: verse.sanskrit,
        transliteration: verse.transliteration,
        translation: null,
        wordMeanings: [],
      })),
    },
    requestId: 'request-id',
  };
}

export const mantraSlugs = () => build().records.map((record) => ({ slug: record.slug }));
export const deityIds = () =>
  [...build().deities.values()].map((deity) => ({ deity: deity.path.split('/').pop()! }));

export function mantraPage(slug: string): MantraPage | null {
  const { bySlug, deities, byDeity } = build();
  const record = bySlug.get(slug);
  if (!record) return null;
  const primary = record.deities[0]?.id;
  const related = (primary ? byDeity.get(primary)! : [])
    .filter((other) => other.slug !== slug)
    .slice(0, 12)
    .map(listing);
  const names = record.deities.map((deity) => deityName(deity.id));
  const deityLabel =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');
  const verses = plural(record.verses.length, 'verse');
  const recording = record.hasAudio ? ', plus a link to stream its recording' : '';
  return {
    path: mantraPath(slug),
    mantra: {
      ...record,
      deities: record.deities.map((deity) => deities.get(deity.id)!),
      verses: record.verses.slice(0, TEXT_VERSES),
      verseCount: record.verses.length,
    },
    lede: `${record.title} is in the ${deityLabel} collection${names.length > 1 ? 's' : ''}${record.alternateIds.length ? `, filed under ${plural(record.alternateIds.length + 1, 'id')}` : ''}. GET /v1/mantras/${record.id} returns its ${verses} in Devanagari and Roman transliteration as JSON${recording}.`,
    response: response(record, SHOWN_VERSES),
    shownVerses: Math.min(SHOWN_VERSES, record.verses.length),
    related,
    meta: {
      // Titles are unique: the snapshot keeps one page per title.
      title:
        record.title.length <= 35
          ? `${record.title}: Sanskrit Text & Mantra API | Mantrilo`
          : `${record.title} Mantra API | Mantrilo`,
      description: clip(
        `${record.title} for developers: ${verses} of ${deityLabel} Sanskrit text in Devanagari and transliteration${record.hasAudio ? ', with a streamable recording' : ''}. Fetch it as JSON with GET /v1/mantras/${record.id}.`,
        300,
      ),
      label: record.title,
      indexable: Boolean(record.description) && record.verses.some((verse) => verse.sanskrit),
      parent: primary
        ? { path: deities.get(primary)!.path, label: `${deityName(primary)} mantras` }
        : undefined,
    },
  };
}

export function deityPage(param: string): DeityPage | null {
  const { deities, byDeity } = build();
  const deity = [...deities.values()].find((entry) => entry.path.endsWith(`/${param}`));
  if (!deity) return null;
  const records = byDeity.get(deity.id)!;
  // The API filters on each record's own deityKey and pages in id order.
  const own = build()
    .records.filter((record) => record.deity?.id === deity.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  const audio = records.filter((record) => record.hasAudio).length;
  return {
    path: deity.path,
    deity,
    mantras: records.map(listing),
    response: {
      data: own.slice(0, 2).map(summary),
      nextCursor: own.length > 2 ? '…' : null,
      requestId: 'request-id',
    },
    meta: {
      title: `${deity.name} Mantras & Stotras API | Mantrilo`,
      description: `${plural(records.length, `${deity.name} mantra`)} and stotras in Sanskrit with transliteration${audio ? `, ${audio} with recordings` : ''}. List them with GET /v1/mantras?deity=${deity.id} and load each one by id.`,
      label: `${deity.name} mantras`,
      indexable: records.length > 1,
    },
  };
}

export function mantraHub(): MantraHub {
  const { records, deities } = build();
  return {
    deities: [...deities.values()],
    mantras: records.map(listing),
    total: records.length,
    audio: records.filter((record) => record.hasAudio).length,
  };
}

// Well-known hymns the Library page leads with, in this order.
const FEATURED = [
  'hanuman-chalisa',
  'om-tryambakam-yajamahe',
  'shiva-tandava-stotram',
  'lalitha-sahasranamam',
  'mahishasura-mardini-stotram-ayigiri-nandini',
  'sri-rama-raksha-stotram',
  'ganapathi-atharvashirsha',
  'mahalakshmi-ashtakam',
  'kalabhairava-ashtakam',
  'bhaja-govindam-all-verses',
  'aham-vaishvanaro-bhuthva',
  'purnamadhah-purnamidham',
];

export type MantraFeature = {
  total: number;
  audio: number;
  deities: Deity[];
  featured: (MantraListing & { deity: string })[];
};

// What the Library page shows: totals, every deity and a dozen well-known hymns.
export function mantraFeature(): MantraFeature {
  const { records, bySlug, deities } = build();
  return {
    total: records.length,
    audio: records.filter((record) => record.hasAudio).length,
    deities: [...deities.values()],
    featured: FEATURED.flatMap((slug) => {
      const record = bySlug.get(slug);
      return record
        ? [{ ...listing(record), deity: deities.get(record.deities[0]?.id)?.name ?? '' }]
        : [];
    }),
  };
}
