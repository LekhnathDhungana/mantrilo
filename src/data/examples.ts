import catalog from './catalog-samples.json';

// Shared request/response examples for the public pages. The mantra is a production snapshot
// (developer/scripts/export-site-sample.mjs); book examples use the real collection ids.
export const mantra = catalog.mantra.data;
export const verse = mantra.verses[0];
export const MANTRA_ID = mantra.id;

export const auth = '-H "Authorization: Bearer $MANTRILO_API_KEY"';
export const curlGet = (path: string) => `curl "$MANTRILO_API_URL${path}" \\\n  ${auth}`;
export const curlPost = (path: string, body: object) =>
  `curl -X POST "$MANTRILO_API_URL${path}" \\\n  ${auth} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;

export const mantraResponse = { data: mantra, requestId: 'request-id' };

export const mantraListResponse = {
  data: [
    {
      id: mantra.id,
      title: mantra.title,
      deity: mantra.deity,
      category: mantra.category,
      source: mantra.source,
      description: mantra.description,
      verseCount: mantra.verseCount,
      audio: mantra.audio,
    },
  ],
  nextCursor: 'YW5uYXB1cm5hLWFoYW0tdmFpc2h2YW5hcm8tYmh1dGh2YQ',
  requestId: 'request-id',
};

export const audioResponse = {
  data: {
    url: 'https://storage.googleapis.com/mantrilo-media/…?X-Goog-Signature=…',
    expiresAt: '2026-11-10T06:45:00.000Z',
    bytes: catalog.recording.bytes,
    contentType: 'audio/mp4',
  },
  requestId: 'request-id',
};

// Book collections are the catalog's subcategories. Ids are what ?collection= takes.
export const collections = [
  {
    id: 'upanishads',
    name: 'Upanishads',
    tradition: 'Shruti',
    note: 'Principal Upanishads, including Isha, Kena, Katha, Mundaka and Mandukya.',
  },
  {
    id: 'bhagavad-gita',
    name: 'Bhagavad Gita',
    tradition: 'Smriti',
    note: 'The Gita, chapter by chapter.',
  },
  {
    id: 'advaita-vedanta-prakarana-granthas',
    name: 'Advaita Vedanta & Prakarana Granthas',
    tradition: 'Smriti',
    note: 'Introductory and explanatory works such as Atmabodha and Tattvabodha.',
  },
  { id: 'vedanta', name: 'Vedanta', tradition: 'Darshana', note: 'The Brahma Sutras.' },
  { id: 'yoga', name: 'Yoga', tradition: 'Darshana', note: 'The Yoga Sutras.' },
];

export const collectionRequest = (id: string, extra = '') =>
  curlGet(`/v1/books?collection=${id}&limit=3${extra}`);

export { collectionSample as collectionResponse } from '../../developer/src/data/integrations';

export const bookResponse = {
  data: {
    id: 'ishaUpanishad',
    title: '…',
    collection: { id: 'upanishads', name: 'Upanishads' },
    description: '…',
    chapters: [{ number: 1, title: '…', description: null, verseCount: 18 }],
    preview: false,
  },
  requestId: 'request-id',
};

export const chapterResponse = {
  data: {
    number: 1,
    title: '…',
    verseCount: 18,
    verses: [
      {
        number: 1,
        sanskrit: '…',
        transliteration: '…',
        translation: '…',
        translator: '…',
        wordMeaning: null,
        commentary: null,
      },
    ],
    nextOffset: null,
  },
  requestId: 'request-id',
};
