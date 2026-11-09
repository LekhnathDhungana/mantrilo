import { KeyResolver } from './keys.mjs';
import { MemoryContent } from './content.mjs';
import { MemoryMedia } from './media.mjs';
import { MemoryUsageSink, UsageMeter } from './usage.mjs';
import { createApiServer } from './server.mjs';

const verse = (n) => ({
  shlokaNumber: n,
  title: `Demo verse ${n}`,
  sanskrit: 'ॐ',
  transliteration: 'om',
  translation: 'Placeholder text for local testing.',
  wordMeaning: [{ word: 'ॐ (om)', meaning: 'the sacred syllable' }],
});
const shloka = (n, deityKey, deity) => ({
  id: `demo-shloka-${n}`,
  title: `Demo shloka ${n}`,
  deityKey,
  deity,
  category: 'Demo',
  source: 'Local demo data',
  description: 'Placeholder record. Real content comes from the deployed API.',
  hasAudio: true,
  audioPath: `demo/${n}.m4a`,
  shlokas: [verse(1), verse(2)],
});
const mantra = (n, deity) => ({
  id: `demo-mantra-${n}`,
  title: `Demo mantra ${n}`,
  deity: [deity],
  tags: ['demo'],
  description: 'Placeholder record. Real content comes from the deployed API.',
  language: 'Sanskrit',
  originalLanguage: 'ॐ',
  transliteration_en: 'om',
  translation_en: 'Placeholder text for local testing.',
});

const shlokas = [
  shloka(1, 'shiva', 'Lord Shiva'),
  shloka(2, 'devi', 'Devi'),
  shloka(3, 'shiva', 'Lord Shiva'),
];
export const demoContent = () =>
  new MemoryContent({ shlokas, mantras: [mantra(1, 'Agni'), mantra(2, 'Ganesha')] });

// Local demo mode only: the real /v1 server over placeholder data and the console's own keys.
export async function startDemoApi(store, port) {
  const server = createApiServer({
    keys: new KeyResolver(store, { ttlMs: 0 }),
    content: demoContent(),
    media: new MemoryMedia(
      Object.fromEntries(
        shlokas.map((s) => [s.audioPath, { bytes: 1024, contentType: 'audio/mp4' }]),
      ),
    ),
    meter: new UsageMeter(new MemoryUsageSink(store.apiEvents), { ttlMs: 0, keyActivity: store }),
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${port}`;
}
