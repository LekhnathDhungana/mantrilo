import { createConsoleServer, DemoSessions, seedDemo } from './app.mjs';
import { MemoryStore, FirestoreStore } from './store.mjs';
import { firebaseServices, FirebaseSessions } from './firebase.mjs';
import { createMailer, EmailCodes } from './email-codes.mjs';
import { demoContent, startDemoApi } from '../api/demo.mjs';
import { FirestoreContent } from '../api/content.mjs';
import { Storage } from '@google-cloud/storage';
import { StorageMedia } from '../api/media.mjs';
import { createBilling } from './billing.mjs';
import { billingModeFrom } from './domain.mjs';
import { demoPustak, FirestorePustak } from './pustak.mjs';
import { createAstrologyService } from './astrology/service.mjs';
import { configurePromo } from './promo.mjs';
const mode =
  process.env.MANTRILO_MODE || (process.env.NODE_ENV === 'production' ? 'firebase' : 'demo');
const port = Number(process.env.PORT || 4190);
try {
  let promo = null;
  try {
    promo = configurePromo(process.env.MANTRILO_UNLIMITED_PROMO);
  } catch (error) {
    console.error(`Promo redemption is off: ${error.message}`);
  }
  if (!['demo', 'firebase'].includes(mode)) throw new Error('Invalid mode');
  if (
    mode === 'firebase' &&
    (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) &&
    (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)
  )
    throw new Error('Emulators are local only.');
  if (mode === 'demo' && (process.env.NODE_ENV === 'production' || process.env.K_SERVICE))
    throw new Error('Demo mode is local only.');
  const appOrigin = process.env.MANTRILO_APP_ORIGIN || `http://localhost:${port}`;
  const basePath = process.env.MANTRILO_CONSOLE_BASE_PATH || '';
  if (
    mode === 'firebase' &&
    process.env.NODE_ENV === 'production' &&
    !appOrigin.startsWith('https://')
  )
    throw new Error('Production requires a confirmed HTTPS origin.');
  let store,
    sessions,
    content,
    media,
    books,
    apiUrl = process.env.MANTRILO_API_URL?.replace(/\/+$/, '') || null;
  // Running locally against Firebase, the API usually runs beside the console (`npm run api`,
  // port 4191). Default to it so Docs can run requests without extra setup.
  if (
    !apiUrl &&
    mode === 'firebase' &&
    !process.env.K_SERVICE &&
    process.env.NODE_ENV !== 'production'
  )
    apiUrl = 'http://127.0.0.1:4191';
  const astrologyService = createAstrologyService({
    key: process.env.MANTRILO_ASTROLOGY_API_KEY,
    limited: (process.env.MANTRILO_ASTROLOGY_LIMITED || '').split(',').filter(Boolean),
  });
  if (mode === 'demo') {
    store = new MemoryStore();
    sessions = new DemoSessions();
    await seedDemo(store);
    content = demoContent();
    books = demoPustak;
    apiUrl = await startDemoApi(store, port + 100, astrologyService);
  } else {
    const { auth, db } = firebaseServices();
    store = new FirestoreStore(db);
    content = new FirestoreContent(db);
    media = new StorageMedia(
      new Storage({ projectId: process.env.FIREBASE_PROJECT_ID }).bucket(
        process.env.MANTRILO_MEDIA_BUCKET || 'mantrilo-media',
      ),
    );
    books = new FirestorePustak(db);
    sessions = new FirebaseSessions(auth, db);
  }
  const firebaseConfig =
    mode === 'firebase' && process.env.FIREBASE_WEB_API_KEY
      ? {
          apiKey: process.env.FIREBASE_WEB_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          appId: process.env.FIREBASE_WEB_APP_ID,
          authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST || null,
        }
      : null;
  // Which Stripe mode's plans this console reads and sells. The secret key must match it.
  const billingMode = billingModeFrom(process.env);
  let billing = mode === 'firebase' ? createBilling(process.env, appOrigin + basePath) : null;
  if (billing && billing.mode !== billingMode) {
    console.error(
      `Billing is off: MANTRILO_BILLING_MODE is ${billingMode} but STRIPE_SECRET_KEY is a ${billing.mode}-mode key.`,
    );
    billing = null;
  }
  billing?.warm();
  const server = createConsoleServer({
    store,
    sessions,
    mode,
    appOrigin,
    secureCookies: appOrigin.startsWith('https://'),
    firebaseConfig,
    emailCodes:
      mode === 'firebase' && createMailer() ? new EmailCodes(store, createMailer()) : null,
    mailer: mode === 'firebase' ? createMailer() : null,
    apiUrl,
    content,
    media,
    books,
    astrologyService,
    billing,
    promo,
    billingMode,
    phoneCodes: process.env.MANTRILO_PHONE_AUTH === 'true',
    trustProxy: Boolean(process.env.K_SERVICE),
    redirectFromHost: process.env.MANTRILO_CONSOLE_ALIAS_HOST,
    basePath,
    hostingSession: process.env.MANTRILO_HOSTING_SESSION === 'true',
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(port, mode === 'demo' ? '127.0.0.1' : '0.0.0.0', () =>
    console.log(
      `Mantrilo Developer Console: ${mode === 'demo' ? appOrigin : 'server ready'} (${mode} mode)`,
    ),
  );
} catch {
  console.error(
    'Console startup failed. Check mode, origin, Firebase project and application credentials. Demo mode is only allowed locally.',
  );
  process.exitCode = 1;
}
