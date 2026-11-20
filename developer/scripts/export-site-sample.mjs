// Copies a public mantra snapshot and reads its recording size for the API example.
// The site is static and has no API key, so it ships this snapshot. Reads the backend only.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Storage } from '@google-cloud/storage';
import { RESOURCES } from '../api/content.mjs';

const MANTRA_ID = 'annapurna-aham-vaishvanaro-bhuthva';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.');
initializeApp({ projectId, credential: applicationDefault() });
const db = getFirestore();
const bucket = new Storage({ projectId }).bucket(
  process.env.MANTRILO_MEDIA_BUCKET || 'mantrilo-media',
);

const snapshot = await db.collection(RESOURCES.mantras.collection).doc(MANTRA_ID).get();
if (!snapshot.exists) throw new Error(`${MANTRA_ID} was not found.`);
const mantra = { ...snapshot.data(), id: snapshot.id };
if (!mantra.hasAudio || !mantra.audioPath) throw new Error(`${MANTRA_ID} has no recording.`);

const file = bucket.file(mantra.audioPath);
const [metadata] = await file.getMetadata();
await writeFile(
  path.join(site, 'developer/src/data/catalog-samples.json'),
  `${JSON.stringify(
    {
      mantra: { data: RESOURCES.mantras.detail(mantra) },
      recording: {
        src: `/samples/${MANTRA_ID}.m4a`,
        bytes: Number(metadata.size),
      },
    },
    null,
    2,
  )}\n`,
);
console.log(`Saved ${MANTRA_ID} (${metadata.size} audio bytes in metadata).`);
process.exit(0);
