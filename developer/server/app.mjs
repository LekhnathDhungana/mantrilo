import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import indiaPrices from '../../shared/india-prices.json' with { type: 'json' };
import indiaAnnualPrices from '../../shared/india-annual-prices.json' with { type: 'json' };
import { brotliCompress, gzip, constants as zlib } from 'node:zlib';
import {
  ApiError,
  insist,
  secret,
  equal,
  hash,
  cleanText,
  plans,
  FREE_PLAN,
  allowance,
  hasLiveAccess,
  hasUnlimitedRequests,
  requestsRemaining,
  publicWorkspace,
  usage,
  mergeUsage,
  currentPeriod,
  log,
  chargeRequest,
  migrateWorkspace,
  needsMigration,
  primaryKey,
  keyEnvironment,
  rotateKey,
  resetDate,
  accountingPolicy,
  planFor,
  billingFor,
  setEntitlement,
  usageLane,
  readJson as body,
} from './domain.mjs';
import { catalog } from './fixtures.mjs';
import { readEmail, Throttle } from './email-codes.mjs';
import { libraryItem, libraryPage, streamLibraryAudio } from './library.mjs';
import { readBookListQuery, readPustakLibrary } from './pustak.mjs';
import { createAstrologyService } from './astrology/service.mjs';
import { handleArticleAdmin } from './blog.mjs';
import { RATE_LIMITS, RateLimiter, UsageMeter, limitsFor } from '../api/usage.mjs';
import {
  BILLING_INTERVALS,
  ENTITLED_STATUSES,
  PAID_PLANS,
  syncFromEvent,
  syncWorkspace,
} from './billing.mjs';

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

function assetEncoding(header = '') {
  const accepted = new Map(
    header.split(',').map((value) => {
      const [name, ...parameters] = value.trim().toLowerCase().split(';');
      const weight = parameters.find((part) => part.trim().startsWith('q='));
      return [name, weight === undefined ? 1 : Number(weight.trim().slice(2))];
    }),
  );
  const brotli = accepted.get('br') ?? accepted.get('*') ?? 0;
  const gzip = accepted.get('gzip') ?? accepted.get('*') ?? 0;
  if (brotli > 0 && brotli >= gzip) return 'br';
  return gzip > 0 ? 'gzip' : null;
}

function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter((pair) => pair.length === 2),
  );
}
async function rawBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    insist(size <= 1024 * 1024, 413, 'request_too_large', 'Request is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export class DemoSessions {
  constructor() {
    this.sessions = new Map();
  }
  async createDemo(role = 'customer') {
    const token = secret();
    this.sessions.set(hash(token), {
      uid: role === 'admin' ? 'demo_admin' : 'demo_owner',
      email: role === 'admin' ? 'admin@demo.invalid' : 'developer@demo.invalid',
      admin: role === 'admin',
      expiresAt: Date.now() + 8 * 3600e3,
    });
    return token;
  }
  async get(token) {
    const session = this.sessions.get(hash(token || ''));
    return session && session.expiresAt > Date.now() ? session : null;
  }
  async delete(token) {
    this.sessions.delete(hash(token || ''));
  }
  async customerByEmail() {
    throw new ApiError(409, 'demo_only', 'Customer provisioning requires Firebase mode.');
  }
}
export async function seedDemo(store) {
  for (const [uid, name] of [
    ['demo_owner', 'My first workspace'],
    ['demo_admin', 'Mantrilo demo administration'],
  ]) {
    await store.ensureWorkspace(`workspace_${uid}`, uid, name);
    await store.putUser(uid, { workspaceId: `workspace_${uid}`, role: 'owner' });
  }
}
// Only public API routes can be relayed, so the playground can't reach anything else.
const PLAYGROUND_PATH =
  /^\/v1(?:\/(?:mantras(?:\/[\w-]{1,200}(?:\/audio)?)?|books(?:\/[\w-]{1,200}(?:\/chapters\/[1-9]\d{0,8})?)?))?(?:\?[\w%=&.~+-]*)?$/;
export function createConsoleServer({
  store,
  sessions,
  mode = 'demo',
  appOrigin = 'http://localhost:4190',
  secureCookies = false,
  firebaseConfig = null,
  emailCodes = null,
  mailer = null,
  apiUrl = null,
  billing = null,
  promo = null,
  // Which Stripe mode's entitlements this deployment reads and writes (see planFor).
  billingMode = 'live',
  content = null,
  media = null,
  books = null,
  astrologyService = createAstrologyService(),
  phoneCodes = false,
  // Google and Apple sign-in run entirely in Firebase; these only decide whether the buttons show.
  googleSignIn = false,
  appleSignIn = false,
  trustProxy = false,
  redirectFromHost = null,
  basePath = '',
  hostingSession = false,
  codeThrottle = new Throttle({ limit: 20, windowMs: 60 * 60 * 1000 }),
  staticRoot = path.resolve('dist'),
  // Blog articles (FirestoreArticles / MemoryArticles) for the admin screen.
  articles = null,
  // The public blog (createBlog). Served for /blog URLs outside basePath, which reach this
  // service through the Firebase Hosting rewrite.
  blog = null,
}) {
  const compressedAssets = new Map();
  const astrologyMeter = new UsageMeter(store.usageSink, { ttlMs: 0 });
  const astrologyLimiter = new RateLimiter();
  const promoThrottle = new Throttle({ limit: 8, windowMs: 15 * 60_000 });
  const cookie = (name, value, maxAge) =>
    `${name}=${value}; HttpOnly; Path=${hostingSession ? basePath || '/' : '/'}; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`;
  const sessionName = secureCookies ? '__Host-mantrilo_session' : 'mantrilo_session';
  const csrfName = secureCookies ? '__Host-mantrilo_csrf' : 'mantrilo_csrf';
  return createServer(async (request, response) => {
    const requestId = randomUUID(),
      started = performance.now();
    let actor = null,
      workspaceId = null,
      operation = '/api/console';
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    // Keep the console's origin available to browser POSTs while withholding referrers off-site.
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    function send(status, data) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.writeHead(status);
      response.end(
        JSON.stringify({
          ...data,
          requestId,
          responseTimeMs: Math.round((performance.now() - started) * 10) / 10,
        }),
      );
    }
    try {
      const url = new URL(request.url, 'http://localhost');
      const method = request.method;
      if (url.pathname === '/healthz') return send(200, { ok: true });
      if (
        blog &&
        basePath &&
        blog.matches(url.pathname) &&
        !url.pathname.startsWith(`${basePath}/`)
      )
        return await blog.serve(request, response, url);
      if (basePath && url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
        return send(404, { error: { code: 'not_found', message: 'Not found.' } });
      }
      const route = url.pathname.slice(basePath.length) || '/';
      if (route.startsWith('/api/')) {
        const jar = cookies(request);
        // Firebase Hosting forwards only __session. Keep both values in that cookie when proxied.
        const [csrf, session] = hostingSession
          ? (jar.__session || '').split(':', 2)
          : [jar[csrfName], jar[sessionName]];
        function writeSession(value, maxAge) {
          response.setHeader(
            'Set-Cookie',
            hostingSession
              ? cookie('__session', `${csrf}:${value}`, value ? maxAge : 8 * 3600)
              : cookie(sessionName, value, maxAge),
          );
        }
        // Stripe proves itself with a signature instead.
        const browserOnly = route !== '/api/billing/webhook';
        if (!['GET', 'HEAD'].includes(method) && browserOnly) {
          insist(
            request.headers.origin === appOrigin,
            403,
            'origin_denied',
            'The request origin is not allowed.',
          );
          insist(
            equal(csrf, request.headers['x-csrf-token']),
            403,
            'csrf_failed',
            'Refresh the page and try again.',
          );
        }
        if (route === '/api/billing/webhook' && method === 'POST') {
          insist(
            billing?.webhookSecret,
            503,
            'billing_unconfigured',
            'Webhooks are not configured.',
          );
          const event = billing.parseEvent(
            await rawBody(request),
            request.headers['stripe-signature'],
          );
          try {
            await syncFromEvent(event, { store, billing });
          } catch (error) {
            console.error(`Stripe event ${event.id} failed: ${error.message}`);
            throw error; // A failed response makes Stripe retry.
          }
          return send(200, { received: true });
        }
        if (route === '/api/auth/config' && method === 'GET')
          return send(200, {
            mode,
            firebase: firebaseConfig,
            apiUrl,
            registration: mode === 'firebase',
            emailCodes: mode === 'firebase' && Boolean(emailCodes),
            phoneCodes: mode === 'firebase' && phoneCodes,
            googleSignIn: mode === 'firebase' && googleSignIn,
            appleSignIn: mode === 'firebase' && appleSignIn,
          });
        if (route === '/api/auth/csrf' && method === 'GET') {
          if (hostingSession && csrf) return send(200, { csrfToken: csrf });
          const token = secret();
          response.setHeader(
            'Set-Cookie',
            hostingSession
              ? cookie('__session', `${token}:`, 8 * 3600)
              : cookie(csrfName, token, 8 * 3600),
          );
          return send(200, { csrfToken: token });
        }
        if (route === '/api/auth/demo' && method === 'POST') {
          insist(
            mode === 'demo' &&
              ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress),
            404,
            'not_found',
            'Not found.',
          );
          const input = await body(request);
          insist(
            ['admin', 'customer'].includes(input.role),
            400,
            'invalid_role',
            'Choose a demo role.',
          );
          const token = await sessions.createDemo(input.role);
          writeSession(token, 8 * 3600);
          return send(200, { ok: true, demo: true });
        }
        if (route === '/api/auth/session' && method === 'POST') {
          insist(
            mode === 'firebase',
            409,
            'firebase_required',
            'Firebase login is not configured in local demo mode.',
          );
          const input = await body(request);
          insist(
            typeof input.idToken === 'string' && input.idToken.length < 10000,
            400,
            'token_required',
            'A Firebase sign-in token is required.',
          );
          let token;
          try {
            token = await sessions.create(input.idToken);
          } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(401, 'invalid_login', 'Sign in again to create a session.');
          }
          writeSession(token, 5 * 24 * 3600);
          return send(200, { ok: true });
        }
        if (route === '/api/auth/email/request' && method === 'POST') {
          insist(
            mode === 'firebase' && emailCodes,
            503,
            'email_unavailable',
            'Email sign-in is not configured yet.',
          );
          const client =
            (trustProxy &&
              String(request.headers['x-forwarded-for'] || '')
                .split(',')[0]
                .trim()) ||
            request.socket.remoteAddress ||
            'unknown';
          insist(
            codeThrottle.take(client),
            429,
            'too_many_requests',
            'Too many codes requested. Try again later.',
          );
          await emailCodes.request(readEmail((await body(request)).email));
          return send(200, { sent: true });
        }
        if (route === '/api/auth/email/verify' && method === 'POST') {
          insist(
            mode === 'firebase' && emailCodes,
            503,
            'email_unavailable',
            'Email sign-in is not configured yet.',
          );
          const input = await body(request),
            email = readEmail(input.email);
          await emailCodes.verify(email, input.code);
          return send(200, { token: await sessions.signInToken(email) });
        }
        // The only executable catalog endpoints are explicitly local demo fixtures.
        if (route === '/api/demo/catalog' && method === 'GET') {
          insist(
            mode === 'demo',
            503,
            'catalog_unconfigured',
            'No production catalog service is configured.',
          );
          const rawKey = (request.headers.authorization || '').replace(/^Bearer /, '');
          insist(
            rawKey.startsWith('mtr_sbx_'),
            401,
            'invalid_api_key',
            'Provide your sandbox API key.',
          );
          const keyHash = hash(rawKey),
            index = await store.findKey(keyHash);
          insist(index, 401, 'invalid_api_key', 'The API key is invalid or revoked.');
          workspaceId = index.workspaceId;
          operation = '/api/demo/catalog';
          const type = url.searchParams.get('type') || 'text';
          insist(
            Object.hasOwn(catalog, type),
            400,
            'invalid_type',
            'Choose text, audio, or books.',
          );
          const result = await store.transact(workspaceId, (w) =>
            chargeRequest(w, keyHash, `demo/catalog/${type}`, requestId, billingMode),
          );
          return send(200, {
            data: catalog[type],
            demo: true,
            usage: {
              contentRequests: 1,
              audioBytes: 0,
              billable: false,
              remaining: result.remaining,
            },
          });
        }
        actor = await sessions.get(session);
        insist(actor, 401, 'session_required', 'Sign in to continue.');
        if (route === '/api/auth/logout' && method === 'POST') {
          await sessions.delete(session);
          writeSession('', 0);
          return send(200, { ok: true });
        }
        let profile = await store.getUser(actor.uid);
        // Signing in is signing up: a new account starts on its own Free workspace.
        if (!profile?.workspaceId && mode === 'firebase') {
          const id = `workspace_${actor.uid}`;
          await store.ensureWorkspace(id, actor.uid, 'My workspace');
          await store.putUser(actor.uid, { workspaceId: id, role: 'owner' });
          profile = await store.getUser(actor.uid);
        }
        insist(
          profile?.workspaceId,
          403,
          'workspace_not_assigned',
          'An administrator must assign your account to a workspace.',
        );
        workspaceId = profile.workspaceId;
        let workspace = await store.getWorkspace(workspaceId);
        insist(
          workspace && workspace.ownerUid === actor.uid,
          403,
          'workspace_denied',
          'Workspace access is not allowed.',
        );
        // Every workspace has a working key from the start, and older ones move to the free tier.
        if (needsMigration(workspace, billingMode)) {
          await store.transact(workspaceId, (w) => migrateWorkspace(w, billingMode));
          workspace = await store.getWorkspace(workspaceId);
        }
        const verified = mode === 'demo' || actor.verified === true;
        const plan = planFor(workspace, billingMode),
          liveAccess = hasLiveAccess(workspace, billingMode),
          liveLane = usageLane('production', billingMode);
        const unlimitedRequests = hasUnlimitedRequests(workspace);
        const promoEligible =
          promo?.eligible({
            workspaceId,
            email: actor.email,
            emailVerified: mode === 'demo' || actor.emailVerified === true,
          }) === true;
        // Usage per lane. Sandbox includes the console's own demo and astrology calls.
        const laneUsage = async (lane, w = workspace, period = currentPeriod()) =>
          lane === 'sandbox'
            ? mergeUsage(usage(w, period), await store.apiUsage(w.id, period, lane))
            : store.apiUsage(w.id, period, lane);
        // Use the live lane as the primary view when the workspace has live access.
        const primaryLane = (w = workspace) =>
          hasLiveAccess(w, billingMode) ? liveLane : 'sandbox';
        const liveUsage = async (w = workspace) => laneUsage(primaryLane(w), w);
        if (route === '/api/me' && method === 'GET') {
          const [activity, sandboxUsage, productionUsage] = await Promise.all([
            store.keyActivity(workspaceId),
            laneUsage('sandbox'),
            liveAccess ? laneUsage(liveLane) : undefined,
          ]);
          return send(200, {
            user: {
              uid: actor.uid,
              email: actor.email,
              admin: actor.admin === true,
              verified,
              name: profile.name || '',
              onboarded: mode === 'demo' || Boolean(profile.onboardedAt),
            },
            workspace: publicWorkspace(workspace, activity, billingMode),
            mode,
            billingMode,
            period: currentPeriod(),
            usage: productionUsage ?? sandboxUsage,
            usageLane: primaryLane(),
            usageByLane: {
              sandbox: sandboxUsage,
              ...(productionUsage ? { live: productionUsage } : {}),
            },
            plan,
            liveAccess,
            allowance: {
              ...allowance(plan),
              ...limitsFor(plan, liveAccess ? 'production' : 'sandbox', unlimitedRequests),
            },
            promo: { canRedeem: promoEligible && !unlimitedRequests },
            resetsAt: resetDate(),
            accountingPolicy,
            integrations: {
              catalog: false,
              astrology: true,
              billing: Boolean(billing),
              audio: false,
            },
            billingPeriod: null,
          });
        }
        if (route === '/api/promo/redeem' && method === 'POST') {
          operation = '/api/promo/redeem';
          insist(promoEligible, 403, 'promo_unavailable', 'This promotion is unavailable.');
          insist(
            promoThrottle.take(workspaceId),
            429,
            'promo_rate_limited',
            'Too many attempts. Try again in 15 minutes.',
          );
          const input = await body(request);
          insist(
            promo.matches(input?.code),
            400,
            'invalid_promo_code',
            'This promo code is invalid.',
          );
          await store.transact(workspaceId, (w) => {
            if (hasUnlimitedRequests(w)) return;
            w.unlimitedRequestsSince = new Date().toISOString();
            log(w, {
              type: 'promo_redeemed',
              message: 'Activated unlimited monthly API requests.',
              status: 200,
            });
          });
          return send(200, { ok: true });
        }
        if (route === '/api/config' && method === 'GET') {
          return send(200, {
            plans,
            rateLimits: RATE_LIMITS,
            indiaPrices,
            indiaAnnualPrices,
            accountingPolicy,
          });
        }
        if (route === '/api/keys' && method === 'GET')
          return send(200, {
            keys: publicWorkspace(workspace, await store.keyActivity(workspaceId), billingMode)
              .keys,
          });
        // The API deliberately has no CORS, so the browser playground goes through this session.
        if (route === '/api/playground' && method === 'POST') {
          insist(apiUrl, 503, 'api_unconfigured', 'The content API is not connected here.');
          const input = await body(request);
          insist(
            typeof input.path === 'string' && PLAYGROUND_PATH.test(input.path),
            400,
            'invalid_path',
            'Choose a /v1 endpoint.',
          );
          insist(
            typeof input.key === 'string' && workspace.keys.some((k) => k.hash === hash(input.key)),
            403,
            'key_not_in_workspace',
            'Paste a key created in this workspace.',
          );
          const sent = performance.now();
          let upstream, data;
          try {
            upstream = await fetch(apiUrl + input.path, {
              redirect: 'manual',
              headers: { Authorization: `Bearer ${input.key}` },
              signal: AbortSignal.timeout(10_000),
            });
            data = await upstream.json();
          } catch {
            throw new ApiError(502, 'api_unreachable', 'The content API could not be reached.');
          }
          return send(200, {
            response: {
              status: upstream.status,
              ms: Math.round(performance.now() - sent),
              requestId: upstream.headers.get('x-request-id'),
              body: data,
            },
          });
        }
        if (route === '/api/auth/verification-token' && method === 'POST') {
          insist(mode === 'firebase', 409, 'firebase_required', 'Demo accounts are verified.');
          insist(!verified, 409, 'already_verified', 'This account is already verified.');
          return send(200, { token: await sessions.verificationToken(actor.uid) });
        }
        // Replaces the sandbox or live key. The old one stops working within the API's key cache TTL.
        if (route === '/api/keys/rotate' && method === 'POST') {
          const { environment } = await body(request),
            key = await store.transact(workspaceId, (w) => rotateKey(w, environment, billingMode));
          if (mailer && actor.email.includes('@'))
            await mailer
              .sendKeyCreated(actor.email, { prefix: key.prefix })
              .catch((error) => console.error(`Key notice failed: ${error.message}`));
          return send(201, { key: { id: key.id, prefix: key.prefix } });
        }
        if (/^\/api\/keys\/[^/]+$/.test(route) && method === 'DELETE') {
          const id = route.split('/').at(-1);
          await store.transact(workspaceId, (w) => {
            const key = w.keys.find((k) => k.id === id);
            insist(key, 404, 'key_missing', 'API key not found.');
            insist(
              key !== primaryKey(w, keyEnvironment(key)),
              409,
              'primary_key',
              'This is your workspace key. Regenerate it instead of revoking it.',
            );
            key.status = 'revoked';
            log(w, { type: 'key_revoked', message: `Revoked key: ${key.name}`, status: 200 });
          });
          return send(200, { ok: true });
        }
        const booksRoute = route.match(
          /^\/api\/library\/books(?:\/([\w-]{1,200})(?:\/chapters\/([1-9]\d{0,8}))?)?$/,
        );
        if (booksRoute && method === 'GET') {
          insist(books, 503, 'library_unavailable', 'The books library is not connected here.');
          const [, id, chapter] = booksRoute;
          return send(
            200,
            await readPustakLibrary(books, {
              id,
              chapter,
              cursor: url.searchParams.get('cursor'),
              offset: url.searchParams.get('offset'),
              sampleOnly: !liveAccess,
              ...(id ? {} : readBookListQuery(url.searchParams)),
            }),
          );
        }
        const libraryAudio = route.match(/^\/api\/library\/mantras\/([\w-]{1,200})\/audio$/);
        if (libraryAudio && ['GET', 'HEAD'].includes(method)) {
          insist(
            content && media,
            503,
            'audio_unavailable',
            'Library playback is unavailable here.',
          );
          return await streamLibraryAudio({
            content,
            media,
            id: libraryAudio[1],
            sampleOnly: !liveAccess,
            request,
            response,
          });
        }
        const libraryRoute = route.match(/^\/api\/library\/(\w+)(?:\/([\w-]{1,200}))?$/);
        if (libraryRoute && method === 'GET') {
          insist(content, 503, 'library_unavailable', 'The library is not connected here.');
          const [, resource, id] = libraryRoute,
            sampleOnly = !liveAccess;
          return send(
            200,
            id
              ? await libraryItem(content, resource, id, { sampleOnly })
              : await libraryPage(content, resource, {
                  cursor: url.searchParams.get('cursor'),
                  deity: url.searchParams.get('deity') || null,
                  sampleOnly,
                }),
          );
        }
        // The console calculator is a test bench: it counts in the sandbox lane.
        if (route === '/api/astrology' && method === 'GET') {
          const limit = limitsFor(plan, 'sandbox', unlimitedRequests).requests,
            used = (await laneUsage('sandbox')).contentRequests;
          return send(200, {
            status: 'available',
            engineVersion: astrologyService.engineVersion,
            availableOperations: astrologyService.operations,
            allowance: limit,
            used,
            balance: requestsRemaining(limit, used),
            requestCost: 1,
          });
        }
        if (route === '/api/astrology/calculate' && method === 'POST') {
          operation = '/api/astrology/calculate';
          const calculation = astrologyService.prepare(await body(request));
          const rate = astrologyLimiter.take(workspaceId, RATE_LIMITS.Free);
          if (!rate.ok) {
            response.setHeader('Retry-After', String(rate.retryAfter));
            throw new ApiError(429, 'rate_limited', 'Too many calculations. Try again shortly.');
          }
          const limit = limitsFor(plan, 'sandbox', unlimitedRequests).requests;
          const endpoint = `astrology.${calculation.operation}`;
          const reservation = await astrologyMeter.reserve({
            workspaceId,
            keyId: 'console',
            lane: 'sandbox',
            endpoint,
            limit,
            margin: limit ?? 0,
          });
          insist(
            reservation.ok,
            429,
            'quota_exceeded',
            'The monthly request allowance for this plan has been reached.',
          );
          let data;
          try {
            data = await calculation.run();
          } catch (error) {
            await reservation
              .refund()
              .catch(() => console.error(`Astrology usage refund failed ${requestId}`));
            throw error;
          }
          // Never include calculation inputs or results in general request logs.
          await store.transact(workspaceId, (w) =>
            log(w, {
              type: 'request',
              endpoint,
              status: 200,
              requestId,
              cost: { contentRequests: 1, audioBytes: 0 },
            }),
          );
          return send(200, {
            data,
            usage: { contentRequests: 1, remaining: requestsRemaining(limit, reservation.used) },
            calculated: true,
          });
        }
        if (route === '/api/usage' && method === 'GET') {
          const from = url.searchParams.get('from') || `${currentPeriod()}-01`,
            to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
          const valid = (value) =>
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value;
          insist(
            valid(from) &&
              valid(to) &&
              from <= to &&
              Date.parse(to) - Date.parse(from) <= 93 * 864e5,
            400,
            'invalid_date_range',
            'Choose a valid range of up to 94 days.',
          );
          const periods = [];
          for (let month = new Date(`${from.slice(0, 7)}-01`); month <= new Date(to);) {
            periods.push(month.toISOString().slice(0, 7));
            month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
          }
          const lane = url.searchParams.get('lane') || primaryLane();
          insist(
            ['sandbox', liveLane].includes(lane),
            400,
            'invalid_lane',
            `lane must be sandbox or ${liveLane}.`,
          );
          const merged = mergeUsage(
            ...(await Promise.all(periods.map((period) => laneUsage(lane, workspace, period)))),
          );
          const daily = Object.entries(merged.daily)
            .filter(([day]) => day >= from && day <= to)
            .map(([day, value]) => ({ day, ...value }))
            .sort((a, b) => a.day.localeCompare(b.day));
          return send(200, {
            daily,
            logs: workspace.logs.filter(
              (l) => l.at.slice(0, 10) >= from && l.at.slice(0, 10) <= to,
            ),
            endpoints: daily.reduce((totals, day) => {
              for (const [endpoint, count] of Object.entries(day.endpoints || {}))
                totals[endpoint] = (totals[endpoint] || 0) + count;
              return totals;
            }, {}),
            policy: accountingPolicy,
            from,
            to,
            lane,
            logLimit: 200,
          });
        }
        if (route === '/api/products' && method === 'POST') {
          const input = await body(request),
            name = cleanText(input.name, 'Product name', 80),
            environment = input.environment,
            type = input.type;
          insist(
            ['sandbox', 'production'].includes(environment) && ['app', 'website'].includes(type),
            400,
            'invalid_product',
            'Choose a product type and environment.',
          );
          const product = {
            id: randomUUID(),
            name,
            type,
            environment,
            createdAt: new Date().toISOString(),
          };
          await store.transact(workspaceId, (w) => {
            const p = planFor(w, billingMode),
              limit = allowance(p).products;
            insist(
              environment !== 'production' || p.price > 0,
              403,
              'testing_only',
              'The Free plan is for testing only.',
            );
            insist(
              w.products.length < 100,
              409,
              'record_capacity',
              'Product-record capacity reached.',
            );
            insist(
              limit === null || w.products.length < limit,
              409,
              'product_limit',
              'Your plan’s customer-product limit has been reached.',
            );
            w.products.push(product);
            log(w, {
              type: 'product_created',
              message: `Registered product: ${name}`,
              status: 201,
            });
          });
          return send(201, { product });
        }
        if (/^\/api\/products\/[^/]+$/.test(route) && method === 'DELETE') {
          const id = route.split('/').at(-1);
          await store.transact(workspaceId, (w) => {
            insist(
              w.products.some((p) => p.id === id),
              404,
              'product_missing',
              'Product not found.',
            );
            w.products = w.products.filter((p) => p.id !== id);
            log(w, {
              type: 'product_deleted',
              message: 'Removed a registered product.',
              status: 200,
            });
          });
          return send(200, { ok: true });
        }
        if (route === '/api/settings' && method === 'PATCH') {
          const input = await body(request),
            name = cleanText(input.name, 'Workspace name', 80);
          insist(
            typeof input.emailNotifications === 'boolean' &&
              Number.isInteger(input.usageAlertThreshold) &&
              input.usageAlertThreshold >= 10 &&
              input.usageAlertThreshold <= 100,
            400,
            'invalid_preferences',
            'Choose a whole-number usage alert threshold from 10 to 100.',
          );
          await store.transact(workspaceId, (w) => {
            w.name = name;
            w.preferences = {
              emailNotifications: input.emailNotifications,
              usageAlertThreshold: input.usageAlertThreshold,
            };
            log(w, {
              type: 'settings_updated',
              message: 'Updated workspace preferences.',
              status: 200,
            });
          });
          return send(200, {
            ok: true,
            notice: 'Preferences saved. Email notification delivery is not configured.',
          });
        }
        if (route === '/api/onboarding' && method === 'POST') {
          const input = await body(request),
            name = cleanText(input.name, 'Your name', 80),
            workspaceName = cleanText(input.workspaceName, 'Workspace name', 80);
          insist(
            typeof input.emailNotifications === 'boolean',
            400,
            'invalid_preferences',
            'Choose whether to receive usage alerts.',
          );
          await store.transact(workspaceId, (w) => {
            w.name = workspaceName;
            w.preferences = { ...w.preferences, emailNotifications: input.emailNotifications };
          });
          await store.putUser(actor.uid, {
            ...profile,
            name,
            onboardedAt: new Date().toISOString(),
          });
          return send(200, { ok: true });
        }
        if (route === '/api/account/delete' && method === 'POST') {
          insist(mode === 'firebase', 409, 'demo_only', 'Demo accounts reset on restart.');
          insist(
            actor.admin !== true,
            403,
            'admin_protected',
            'Administrator accounts cannot be deleted here.',
          );
          insist(
            (await body(request)).confirm === 'DELETE',
            400,
            'confirmation_required',
            'Type DELETE to confirm.',
          );
          // Stop charging first, so a failure here leaves the account intact and retryable.
          const record = billingFor(workspace, billingMode);
          if (ENTITLED_STATUSES.has(record?.status)) {
            insist(billing, 503, 'billing_unconfigured', 'Billing is not configured.');
            await billing.cancelSubscription(record.subscriptionId);
          }
          await store.deleteWorkspace(workspaceId);
          await sessions.deleteAccount(actor.uid);
          writeSession('', 0);
          return send(200, { ok: true });
        }
        if (route === '/api/billing' && method === 'GET') {
          const record = billingFor(workspace, billingMode);
          const annual = record?.interval === 'year';
          const inr = record?.currency === 'inr';
          return send(200, {
            plan,
            // Per month; an annual subscription is billed twelve of these at once.
            monthlyTotal: inr
              ? (annual ? indiaAnnualPrices : indiaPrices)[plan.name]
              : annual
                ? plan.annualPrice
                : plan.price,
            interval: record?.interval ?? 'month',
            currency: record?.currency ?? 'usd',
            period: null,
            invoices: [],
            renewalAt: billingFor(workspace, billingMode)?.currentPeriodEnd ?? null,
            billingMode,
            setupRequired: !billing,
            provider: billing ? 'stripe' : null,
            portalAvailable: (await billing?.portalAvailable()) ?? false,
            promotionPlans: billing?.promotionPlans ?? [],
            purchasable: billing ? await billing.availablePlans() : [],
            annualPurchasable: billing ? await billing.availablePlans(undefined, 'year') : [],
            indiaPurchasable:
              billing && workspace.indiaPricing === true ? await billing.availablePlans('IN') : [],
            indiaAnnualPurchasable:
              billing && workspace.indiaPricing === true
                ? await billing.availablePlans('IN', 'year')
                : [],
            notice: billing
              ? 'Payments are handled securely by Stripe.'
              : 'Subscription management is not configured. No checkout or entitlement upgrades are active.',
          });
        }
        if (route === '/api/billing/checkout' && method === 'POST') {
          insist(billing, 503, 'billing_unconfigured', 'Billing is not configured.');
          insist(verified, 403, 'email_unverified', 'Verify your email before subscribing.');
          const { plan, promotionCode, market, interval = 'month' } = (await body(request)) ?? {};
          insist(PAID_PLANS.includes(plan), 400, 'invalid_plan', 'Choose a paid plan.');
          insist(
            BILLING_INTERVALS.includes(interval),
            400,
            'invalid_interval',
            'Choose monthly or annual billing.',
          );
          insist(
            interval === 'month' || promotionCode === undefined,
            400,
            'invalid_promotion_code',
            'Promo codes apply to monthly billing only.',
          );
          insist(
            market === undefined || market === 'IN',
            400,
            'invalid_market',
            'Unknown billing market.',
          );
          if (market === 'IN') {
            insist(
              workspace.indiaPricing === true,
              403,
              'regional_pricing_unavailable',
              'Contact billing to verify your India billing address.',
            );
            insist(
              plan !== 'Business',
              400,
              'contact_billing',
              'Contact billing for an India Business quote.',
            );
            insist(
              promotionCode === undefined,
              400,
              'invalid_promotion_code',
              'Promo codes are unavailable on India pricing.',
            );
          }
          billing.outreachPromotion(plan, promotionCode);
          // Checked alongside the subscription lookup below; usually answered from cache.
          const priceReady = billing.requirePlanPrice(plan, market, interval);
          priceReady.catch(() => {});
          let customerId = billingFor(workspace, billingMode)?.customerId;
          if (customerId)
            insist(
              !(await billing.hasLiveSubscription(customerId)),
              409,
              'already_subscribed',
              'This workspace already has a subscription. Manage it from Billing or contact hello@mantrilo.com.',
            );
          else {
            customerId = await billing.createCustomer(workspaceId, actor.email);
            await store.transact(workspaceId, (w) => {
              setEntitlement(w, billingMode, {
                billing: {
                  ...billingFor(w, billingMode),
                  customerId,
                  livemode: billingMode === 'live',
                },
              });
            });
          }
          await priceReady;
          return send(200, {
            url: await billing.checkoutUrl({
              workspaceId,
              customerId,
              plan,
              promotionCode,
              market,
              interval,
            }),
          });
        }
        if (route === '/api/billing/sync' && method === 'POST') {
          insist(billing, 503, 'billing_unconfigured', 'Billing is not configured.');
          await syncWorkspace(workspace, { store, billing });
          return send(200, { ok: true });
        }
        if (route === '/api/billing/portal' && method === 'POST') {
          insist(billing, 503, 'billing_unconfigured', 'Billing is not configured.');
          const { plan: targetPlan } = (await body(request)) ?? {};
          const customerId = billingFor(workspace, billingMode)?.customerId;
          insist(customerId, 409, 'no_subscription', 'This workspace has no billing account yet.');
          if (targetPlan !== undefined) {
            insist(
              targetPlan === FREE_PLAN || PAID_PLANS.includes(targetPlan),
              400,
              'invalid_plan',
              'Choose an available plan.',
            );
            if (targetPlan !== FREE_PLAN)
              insist(verified, 403, 'email_unverified', 'Verify your email before changing plans.');
            return send(200, {
              url: await billing.planPortalUrl({ workspaceId, customerId, plan: targetPlan }),
            });
          }
          return send(200, { url: await billing.portalUrl(customerId) });
        }
        if (route.startsWith('/api/admin/')) {
          insist(
            actor.admin === true,
            403,
            'admin_required',
            'Administrator permission is required.',
          );
          if (route === '/api/admin/articles' || route.startsWith('/api/admin/articles/')) {
            insist(articles, 503, 'blog_unavailable', 'The blog store is not configured.');
            const [status, data] = await handleArticleAdmin({
              route,
              method,
              readBody: () => body(request, 600_000),
              articles,
            });
            return send(status, data);
          }
          if (route === '/api/admin/workspaces' && method === 'GET')
            return send(200, {
              workspaces: await Promise.all(
                (await store.listWorkspaces()).map(async (w) => ({
                  id: w.id,
                  name: w.name,
                  plan: planFor(w, billingMode).name,
                  createdAt: w.createdAt,
                  products: w.products.length,
                  usage: await liveUsage(w),
                })),
              ),
              limit: 100,
            });
          if (route === '/api/admin/workspaces' && method === 'POST') {
            const input = await body(request),
              name = cleanText(input.name, 'Workspace name', 80),
              email = cleanText(input.email, 'Customer email', 200),
              user = await sessions.customerByEmail(email);
            insist(
              !(await store.getUser(user.uid)),
              409,
              'workspace_exists',
              'This user already has a workspace.',
            );
            const id = `workspace_${user.uid}`;
            await store.ensureWorkspace(id, user.uid, name);
            await store.putUser(user.uid, { workspaceId: id, role: 'owner' });
            return send(201, { ok: true });
          }
          throw new ApiError(404, 'not_found', 'Administrator operation not found.');
        }
        throw new ApiError(404, 'not_found', 'API operation not found.');
      }
      insist(['GET', 'HEAD'].includes(method), 405, 'method_not_allowed', 'Method not allowed.');
      if (redirectFromHost && request.headers.host === redirectFromHost) {
        const canonical = new URL(appOrigin);
        canonical.pathname = route;
        canonical.search = url.search;
        response.writeHead(307, { Location: canonical.href });
        response.end();
        return;
      }
      if (route === '/robots.txt') {
        response.setHeader('Content-Type', 'text/plain');
        response.end('User-agent: *\nDisallow: /\n');
        return;
      }
      let file = path.resolve(staticRoot, '.' + decodeURIComponent(route));
      insist(
        file === staticRoot || file.startsWith(staticRoot + path.sep),
        404,
        'not_found',
        'Not found.',
      );
      if (route === '/') file = path.join(staticRoot, 'index.html');
      else if (!path.extname(file)) file += '.html';
      let data;
      try {
        await stat(file);
        data = await readFile(file);
      } catch {
        response.statusCode = 404;
        file = path.join(staticRoot, '404.html');
        try {
          data = await readFile(file);
        } catch {
          data = Buffer.from('Not found');
        }
      }
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      };
      response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      // Only content-hashed build assets are shared across users and safe to cache.
      if (
        response.statusCode === 200 &&
        /^\/_expo\/static\/.+-[a-f0-9]{16,}\.(?:js|css)$/.test(route)
      ) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        response.setHeader('Vary', 'Accept-Encoding');
        const encoding = assetEncoding(request.headers['accept-encoding']);
        if (encoding) {
          const key = file + ':' + encoding;
          if (!compressedAssets.has(key)) {
            const buffer =
              encoding === 'br'
                ? compressBrotli(data, { params: { [zlib.BROTLI_PARAM_QUALITY]: 4 } })
                : compressGzip(data);
            compressedAssets.set(
              key,
              buffer.catch((error) => {
                compressedAssets.delete(key);
                throw error;
              }),
            );
          }
          data = await compressedAssets.get(key);
          response.setHeader('Content-Encoding', encoding);
        }
      }
      response.setHeader('Content-Length', data.length);
      response.end(method === 'HEAD' ? undefined : data);
    } catch (error) {
      if (workspaceId && error instanceof ApiError && error.status >= 400) {
        try {
          await store.transact(workspaceId, (w) =>
            log(w, {
              type: 'error',
              endpoint: operation,
              status: error.status,
              code: error.code,
              requestId,
              cost: { contentRequests: 0, audioBytes: 0 },
              billable: false,
            }),
          );
        } catch {
          /* Never log request bodies, keys, tokens or personal inputs. */
        }
      }
      send(error instanceof ApiError ? error.status : 500, {
        error: {
          code: error instanceof ApiError ? error.code : 'internal_error',
          message:
            error instanceof ApiError
              ? error.message
              : 'The service could not complete this request. Check backend configuration and try again.',
        },
      });
    }
  });
}
