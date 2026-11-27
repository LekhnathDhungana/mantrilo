import { KeyResolver } from './keys.mjs';
import { MemoryContent } from './content.mjs';
import { MemoryMedia } from './media.mjs';
import { MemoryUsageSink, UsageMeter } from './usage.mjs';
import { createApiServer } from './server.mjs';
import { demoPustak } from '../server/pustak.mjs';

const verse = (n) => ({
  shlokaNumber: n,
  title: `Demo verse ${n}`,
  sanskrit: 'ॐ',
  transliteration: 'om',
  translation: 'Placeholder text for local testing.',
  wordMeaning: [{ word: 'ॐ (om)', meaning: 'the sacred syllable' }],
});
const mantra = (n, deityKey, deity) => ({
  id: `demo-mantra-${n}`,
  title: `Demo mantra ${n}`,
  deityKey,
  deity,
  category: 'Demo',
  source: 'Local demo data',
  seoDescription: 'Placeholder record. Real content comes from the deployed API.',
  description: 'Internal long description. Never returned by the API.',
  hasAudio: true,
  audioPath: `demo/${n}.m4a`,
  shlokas: [verse(1), verse(2)],
});
const mantras = [
  mantra(1, 'shiva', 'Lord Shiva'),
  mantra(2, 'devi', 'Devi'),
  mantra(3, 'shiva', 'Lord Shiva'),
];
export const demoContent = () => new MemoryContent({ mantras });

// Local demo mode only: the real /v1 server over placeholder data and the console's own keys.
export async function startDemoApi(store, port, astrologyService) {
  const server = createApiServer({
    keys: new KeyResolver(store, { ttlMs: 0 }),
    content: demoContent(),
    books: demoPustak,
    astrologyService,
    media: new MemoryMedia(
      Object.fromEntries(
        mantras.map((m) => [m.audioPath, { bytes: 1024, contentType: 'audio/mp4' }]),
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
