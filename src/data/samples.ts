// Deliberately illustrative schema fixtures, separate from any production catalog.
export const samples = {
  mantra: { id: 'sample_mantra', type: 'mantra', original_text: '[Original text]', transliteration: '[Transliteration]', translation: '[Translation, where available]', meaning: '[Meaning, where available]', source_reference: null, audio_id: 'sample_audio' },
  audio: { id: 'sample_audio', content_id: 'sample_mantra', type: 'audio', recording_url: null, note: 'No sample recording is connected.' },
  book: { id: 'sample_book', type: 'shastra', title: '[Book title]', chapters: [{ number: 1, verses: [{ number: 1, original_text: '[Verse text]', translation: null, source_reference: null }] }] },
};
export type SampleType = keyof typeof samples;
export const exampleRequest = 'curl "$MANTRILO_API_BASE_URL/v1/catalog?type=shastra" \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"';
