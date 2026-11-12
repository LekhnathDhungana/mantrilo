// Placeholder values only. Publish a real catalog item here once the rights to its text,
// translation, and recording are confirmed. Book examples live in src/data/examples.ts.
export const samples = {
  mantra: {
    data: {
      id: 'sample_mantra',
      title: '[Mantra title]',
      deity: { id: 'sample_deity', name: '[Deity name]' },
      category: '[Category]',
      source: '[Source name]',
      description: '[Short description]',
      verseCount: 1,
      audio: { href: '/v1/mantras/sample_mantra/audio' },
      verses: [
        {
          number: 1,
          title: '[Verse title]',
          sanskrit: '[Sanskrit verse]',
          transliteration: '[Transliteration]',
          translation: '[Translation]',
          wordMeanings: [{ word: '[Word]', meaning: '[Meaning]' }],
        },
      ],
    },
    requestId: 'sample_request',
  },
  book: {
    id: 'sample_book',
    type: 'shastra',
    title: '[Book title]',
    chapters: [
      {
        number: 1,
        verses: [
          { number: 1, original_text: '[Verse text]', translation: null, source_reference: null },
        ],
      },
    ],
  },
};
export type SampleType = keyof typeof samples;
export { exampleRequest } from './api-reference';
