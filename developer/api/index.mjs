// Mantrilo public API (api.mantrilo.com). Read-only content behind per-account API keys.
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Storage } from '@google-cloud/storage';
import { GoogleAuth, Impersonated } from 'google-auth-library';
import { FirestoreStore } from '../server/store.mjs';
import { billingModeFrom } from '../server/domain.mjs';
import { KeyResolver } from './keys.mjs';
import { FirestoreContent } from './content.mjs';
import { StorageMedia } from './media.mjs';
import { FirestoreUsageSink, UsageMeter } from './usage.mjs';
import { createApiServer } from './server.mjs';
import { FirestorePustak } from '../server/pustak.mjs';
import { createAstrologyService } from '../server/astrology/service.mjs';

const projectId = process.env.FIREBASE_PROJECT_ID;
const bucketName = process.env.MANTRILO_MEDIA_BUCKET || 'mantrilo-media';
const port = Number(process.env.PORT || 4191);
const onCloudRun = Boolean(process.env.K_SERVICE);

try {
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.');
  if (!getApps().length) initializeApp({ projectId, credential: applicationDefault() });
  const db = getFirestore();

  // On Cloud Run the runtime service account signs media links through IAM (it needs
  // roles/iam.serviceAccountTokenCreator on itself). Locally, user credentials cannot sign,
  // so MANTRILO_API_SIGNER impersonates that service account instead.
  let authClient;
  if (!onCloudRun && process.env.MANTRILO_API_SIGNER) {
    authClient = new Impersonated({
      sourceClient: await new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      }).getClient(),
      targetPrincipal: process.env.MANTRILO_API_SIGNER,
      targetScopes: ['https://www.googleapis.com/auth/cloud-platform'],
      lifetime: 3600,
    });
  }
  const bucket = new Storage({ projectId, ...(authClient ? { authClient } : {}) }).bucket(
    bucketName,
  );

  const store = new FirestoreStore(db),
    billingMode = billingModeFrom(process.env);
  const server = createApiServer({
    keys: new KeyResolver(store, { billingMode }),
    billingMode,
    content: new FirestoreContent(db),
    books: new FirestorePustak(db),
    astrologyService: createAstrologyService({
      key: process.env.MANTRILO_ASTROLOGY_API_KEY,
      limited: (process.env.MANTRILO_ASTROLOGY_LIMITED || '').split(',').filter(Boolean),
    }),
    media: new StorageMedia(bucket),
    meter: new UsageMeter(new FirestoreUsageSink(db), { keyActivity: store }),
    trustProxy: onCloudRun,
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(port, onCloudRun ? '0.0.0.0' : '127.0.0.1', () =>
    console.log(`Mantrilo API listening on ${onCloudRun ? port : `http://127.0.0.1:${port}/v1`}`),
  );
} catch (error) {
  console.error(`Mantrilo API startup failed: ${error.message}`);
  process.exitCode = 1;
}
