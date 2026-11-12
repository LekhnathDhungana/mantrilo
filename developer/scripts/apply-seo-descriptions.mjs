// Copies reviewed mantra paragraphs into each document's `seoDescription` in Mantrilo's Firestore
// (mantras live in the `shlokam` collection).
//
//   npm run seo:apply -- <drafts.jsonl>            report only, writes nothing
//   npm run seo:apply -- <drafts.jsonl> --apply    write the field
//
// Only `seoDescription` is written. A document whose `description` has changed since its
// paragraph was drafted is skipped, and re-running is safe.
import { readFile } from 'node:fs/promises';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = 'mantrilo';
const BATCH_SIZE = 400;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const source = args.find((arg) => !arg.startsWith('--'));
if (!source) throw new Error('Pass the path to drafts.jsonl.');

const clean = (value) => String(value ?? '').trim();
const drafts = (await readFile(source, 'utf8'))
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));

initializeApp({ projectId: PROJECT, credential: applicationDefault() });
const db = getFirestore();
const snapshot = await db.collection('shlokam').select('description', 'seoDescription').get();
const live = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));

const writes = [];
const skipped = [];
let current = 0;
for (const draft of drafts) {
  const doc = live.get(draft.recordId);
  const text = clean(draft.proposedParagraph);
  if (draft.status !== 'completed' || !text) skipped.push(`${draft.recordId} (not ready)`);
  else if (!doc) skipped.push(`${draft.recordId} (not in Firestore)`);
  else if (clean(doc.description) !== clean(draft.originalDescription))
    skipped.push(`${draft.recordId} (description changed)`);
  else if (clean(doc.seoDescription) === text) current += 1;
  else writes.push({ id: draft.recordId, text });
}

const covered = new Set(drafts.map((draft) => draft.recordId));
const uncovered = [...live.keys()].filter((id) => !covered.has(id));
console.log(`Project ${PROJECT}: ${drafts.length} drafts, ${live.size} documents`);
console.log(`To write ${writes.length}, already current ${current}, skipped ${skipped.length}`);
console.log(`Documents with no draft: ${uncovered.length}`);
for (const line of skipped) console.log(`  skip ${line}`);
for (const id of uncovered) console.log(`  no draft ${id}`);

if (!apply) {
  console.log('Nothing written. Add --apply to write seoDescription.');
} else {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { id, text } of writes.slice(i, i + BATCH_SIZE))
      batch.update(db.collection('shlokam').doc(id), { seoDescription: text });
    await batch.commit();
    console.log(`Wrote ${Math.min(i + BATCH_SIZE, writes.length)} of ${writes.length}`);
  }
}
process.exit(0);
