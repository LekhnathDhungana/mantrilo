#!/usr/bin/env node
// Writes src/data/mantra-catalog.json: the public fields of every mantra in Mantrilo's Firestore
// `shlokam` collection, for the /library/mantras pages. The site build reads this file and never
// needs database credentials.
//
//   node scripts/snapshot-mantras.mjs
//
// Uses the developer console's Firebase project (FIREBASE_PROJECT_ID in developer/.env.local or
// the environment) and Application Default Credentials. Read-only.
//
// Only fields the API itself returns are kept (see mantraDetail in developer/api/content.mjs):
// stored translations, word meanings, long descriptions and audio paths stay out.
//
// Records with the same title are one hymn filed under several deities. As on satyam.app, each
// title gets one page (and the same slug as its satyam.app/shlokam page); the record with a
// recording and the most verses represents it, and the others are listed as alternate ids.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const developer = path.join(root, 'developer');
const require = createRequire(path.join(developer, 'package.json'));

function projectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try {
    const env = readFileSync(path.join(developer, '.env.local'), 'utf8');
    return env
      .match(/^FIREBASE_PROJECT_ID=(.+)$/m)?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

// Same rules as Satyam's slugify (app/prasar/code/scripts/shlokam-pages.mjs), so a hymn has the
// same slug on both sites.
export function slugify(input) {
  return (input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
    .replace(/-+$/, '');
}

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const GENERIC_SOURCES = /^(sanatana|sanātana)\s+shastras?$/i;

const id = projectId();
if (!id) throw new Error('Set FIREBASE_PROJECT_ID or add it to developer/.env.local.');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');
initializeApp({ projectId: id, credential: applicationDefault() });
const snapshot = await getFirestore().collection('shlokam').orderBy(FieldPath.documentId()).get();
const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
if (!records.length) throw new Error('The shlokam collection came back empty.');
// Sandbox keys see the first five records by id (SANDBOX_SAMPLE_SIZE in developer/api/content.mjs).
const sandboxIds = new Set(records.slice(0, 5).map((record) => record.id));

const groups = new Map();
for (const record of records) {
  if (!text(record.title) || !Array.isArray(record.shlokas) || !record.shlokas.length) continue;
  const key = record.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(record);
}

const used = new Set(['deity']);
const mantras = [];
for (const group of groups.values()) {
  const score = (r) => (r.hasAudio && text(r.audioPath) ? 1e6 : 0) + r.shlokas.length;
  const [best, ...others] = [...group].sort(
    (a, b) => score(b) - score(a) || String(a.id).localeCompare(String(b.id)),
  );
  let slug = slugify(best.title) || slugify(best.id);
  for (let i = 2; used.has(slug); i++) slug = `${slugify(best.title)}-${i}`;
  used.add(slug);
  const deities = new Map();
  for (const record of [best, ...others])
    if (text(record.deityKey) && !deities.has(record.deityKey))
      deities.set(record.deityKey, text(record.deity) ?? record.deityKey);
  const source = text(best.source);
  mantras.push({
    id: best.id,
    slug,
    title: best.title.trim(),
    // `deity` is the API's own value for this record; `deities` lists every deity it is filed under.
    deity: text(best.deityKey) ? { id: best.deityKey, name: text(best.deity) } : null,
    deities: [...deities].map(([key, name]) => ({ id: key, name })),
    category: text(best.category),
    source,
    // A generic source ("Sanatana Shastras") is not worth showing as a citation.
    citedSource: source && !GENERIC_SOURCES.test(source) ? source : null,
    description: text(best.seoDescription),
    hasAudio: Boolean(best.hasAudio && text(best.audioPath)),
    sandbox: sandboxIds.has(best.id),
    alternateIds: others.map((r) => r.id),
    verses: [...best.shlokas]
      .sort((a, b) => (a.shlokaNumber ?? 0) - (b.shlokaNumber ?? 0))
      .map((verse) => ({
        number: Number.isFinite(verse.shlokaNumber) ? verse.shlokaNumber : null,
        title: text(verse.title),
        sanskrit: text(verse.sanskrit),
        transliteration: text(verse.transliteration),
      })),
  });
}
mantras.sort((a, b) => a.title.localeCompare(b.title));

const out = path.join(root, 'src/data/mantra-catalog.json');
// One mantra per line keeps refreshes reviewable in a diff.
writeFileSync(
  out,
  `{"fetchedAt":${JSON.stringify(new Date().toISOString())},"mantras":[\n${mantras.map((m) => JSON.stringify(m)).join(',\n')}\n]}\n`,
);
console.log(
  `Wrote ${mantras.length} mantras (${records.length} records, ${mantras.filter((m) => m.hasAudio).length} with audio) to ${path.relative(root, out)}.`,
);
process.exit(0);
