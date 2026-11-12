import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ApiError, readJson, usageLane } from '../server/domain.mjs';
import { createAstrologyService } from '../server/astrology/service.mjs';
import { readBookListQuery, readPustakLibrary } from '../server/pustak.mjs';
import { readKey } from './keys.mjs';
import { RESOURCES, encodeCursor, decodeCursor } from './content.mjs';
import { RATE_LIMITS, RateLimiter, exactMargin, limitsFor } from './usage.mjs';

export const API_VERSION = '2026-11-08';
const ASTROLOGY_ROUTE = '/v1/astrology/calculate';
// /v1/shlokas is the former name of /v1/mantras, kept so existing integrations keep working.
const ROUTE = /^\/v1\/(mantras|shlokas)(?:\/([^/]+)(?:\/(audio))?)?$/;
const BOOK_ROUTE = /^\/v1\/books(?:\/([\w-]{1,200})(?:\/chapters\/([1-9]\d{0,8}))?)?$/;
const ID = /^[\w-]{1,200}$/;
const FAILED_AUTH_LIMIT = { rate: 0.2, burst: 10 }; // per client IP: 10 bad keys, then 1 per 5 s

function readListQuery(url) {
  const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new ApiError(400, 'invalid_limit', 'limit must be an integer from 1 to 100.');
  const after = decodeCursor(url.searchParams.get('cursor'));
  if (after === undefined) throw new ApiError(400, 'invalid_cursor', 'The cursor is not valid.');
  const deity = url.searchParams.get('deity');
  if (deity !== null && !/^[\w .-]{1,60}$/.test(deity))
    throw new ApiError(
      400,
      'invalid_deity',
      'deity must be 1-60 letters, digits, spaces, dots or dashes.',
    );
  return { limit, after, deity };
}

export function createApiServer({
  keys,
  content,
  books,
  astrologyService = createAstrologyService(),
  media,
  meter,
  limiter = new RateLimiter(),
  authLimiter = new RateLimiter(),
  trustProxy = false,
  logger = console,
  // Which Stripe mode's entitlements and usage lane apply (see planFor in server/domain.mjs).
  billingMode = 'live',
  // Cloud Run's max instances: how many caches may lag behind near the allowance.
  instances = 10,
}) {
  return createServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Robots-Tag', 'noindex');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const send = (status, body) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.writeHead(status);
      response.end(JSON.stringify({ ...body, requestId }));
    };
    // Cloud Run appends the real client address last; anything before it is caller-supplied.
    // Put a load balancer in front and this must skip that hop too.
    const clientIp = () =>
      (trustProxy &&
        String(request.headers['x-forwarded-for'] || '')
          .split(',')
          .at(-1)
          .trim()) ||
      request.socket.remoteAddress ||
      'unknown';
    try {
      const url = new URL(request.url, 'http://localhost');
      const route = url.pathname.replace(/\/+$/, '') || '/';
      if (route === '/healthz') return send(200, { ok: true });
      const astrology = route === ASTROLOGY_ROUTE,
        allowedMethod = astrology ? 'POST' : 'GET';
      if (request.method !== allowedMethod)
        throw new ApiError(405, 'method_not_allowed', `Use ${allowedMethod} for this endpoint.`);
      if (route === '/v1')
        return send(200, {
          name: 'Mantrilo API',
          version: API_VERSION,
          authentication: 'Authorization: Bearer <your Mantrilo API key>',
          resources: [
            '/v1/mantras',
            '/v1/mantras/{id}',
            '/v1/mantras/{id}/audio',
            '/v1/books',
            '/v1/books?collection={collection}',
            '/v1/books/{id}',
            '/v1/books/{id}/chapters/{chapter}',
            '/v1/astrology',
            'POST /v1/astrology/calculate',
          ],
        });
      if (route === '/v1/astrology') return send(200, { data: astrologyService.operations });
      const match = route.match(ROUTE);
      const bookRoute = route.match(BOOK_ROUTE);
      if (!match && !bookRoute && !astrology)
        throw new ApiError(404, 'not_found', 'No such endpoint.');
      const [, routeName, rawId, sub] = match || [];
      const resource = routeName && 'mantras';

      // 1. Authenticate the key. Bad keys are throttled per client IP, and a throttled client
      // can't cause database reads.
      const tooManyFailures = () =>
        new ApiError(
          429,
          'too_many_failed_attempts',
          'Too many invalid API keys. Try again later.',
        );
      let principal;
      try {
        principal = await keys.resolve(readKey(request), {
          beforeLookup() {
            if (!authLimiter.available(clientIp(), FAILED_AUTH_LIMIT)) throw tooManyFailures();
          },
        });
      } catch (error) {
        if (error.status === 401 && !authLimiter.take(clientIp(), FAILED_AUTH_LIMIT).ok)
          throw tooManyFailures();
        throw error;
      }

      // 2. Rate limit per workspace and environment, so extra keys don't add capacity and test
      // traffic can't starve live traffic. Sandbox keys always get the Free rate.
      const sandbox = principal.environment === 'sandbox',
        rate = (!sandbox && RATE_LIMITS[principal.plan.name]) || RATE_LIMITS.Free,
        taken = limiter.take(`${principal.workspaceId}:${principal.environment}`, rate);
      response.setHeader('X-RateLimit-Limit', String(rate.rate));
      response.setHeader('X-RateLimit-Remaining', String(taken.remaining));
      if (!taken.ok) {
        response.setHeader('Retry-After', String(taken.retryAfter));
        throw new ApiError(
          429,
          'rate_limited',
          `This workspace allows ${rate.rate} requests per second for ${sandbox ? 'sandbox' : 'live'} keys.`,
        );
      }

      // 3. Validate the request. Invalid input is refused before anything is counted.
      const spec = RESOURCES[resource],
        sampleOnly = sandbox;
      let endpoint, calculation, listQuery, id;
      if (astrology) {
        calculation = astrologyService.prepare(await readJson(request));
        endpoint = `astrology.${calculation.operation}`;
      } else if (bookRoute) {
        const [, bookId, chapter] = bookRoute;
        endpoint = chapter ? 'books.chapter' : bookId ? 'books.get' : 'books.list';
        if (!bookId) listQuery = readBookListQuery(url.searchParams);
      } else if (!rawId) {
        listQuery = readListQuery(url);
        endpoint = `${resource}.list`;
      } else {
        id = decodeURIComponent(rawId);
        if (!ID.test(id))
          throw new ApiError(404, 'not_found', `No ${resource.slice(0, -1)} with that id.`);
        endpoint = sub ? 'mantras.audio' : `${resource}.get`;
      }

      // 4. Reserve one request against this lane's monthly allowance, at the account level across
      // all of its keys. Near the limit this is exact even under concurrent calls.
      const lane = usageLane(principal.environment, billingMode),
        limits = limitsFor(principal.plan, principal.environment),
        reservation = await meter.reserve({
          workspaceId: principal.workspaceId,
          keyId: principal.keyId,
          lane,
          endpoint,
          limit: limits.requests,
          margin: exactMargin(rate, { ttlMs: meter.ttlMs, instances }),
        });
      if (!reservation.ok)
        throw new ApiError(
          429,
          'quota_exceeded',
          'The monthly request allowance for this plan has been reached.',
        );
      response.setHeader('X-Quota-Requests-Remaining', String(limits.requests - reservation.used));

      // 5. Serve. Anything that fails from here on is refunded, so only successes count.
      try {
        if (astrology) return send(200, { data: await calculation.run(), calculated: true });
        if (bookRoute) {
          if (!books) throw new ApiError(503, 'books_unavailable', 'Books are unavailable here.');
          const [, bookId, chapter] = bookRoute;
          const result = await readPustakLibrary(books, {
            id: bookId,
            chapter,
            cursor: url.searchParams.get('cursor'),
            offset: url.searchParams.get('offset'),
            sampleOnly,
            ...listQuery,
          });
          return send(200, { ...result, ...(sampleOnly ? { sandbox: true } : {}) });
        }

        if (listQuery) {
          const { limit, after, deity } = listQuery;
          let docs, hasMore;
          if (sampleOnly) {
            docs = (await content.sample(resource))
              .filter((doc) => !deity || spec.matchesDeity(doc, deity))
              .filter((doc) => !after || doc.id > after)
              .slice(0, limit);
            hasMore = false;
          } else ({ docs, hasMore } = await content.page(resource, { limit, after, deity }));
          return send(200, {
            data: docs.map(spec.summary),
            nextCursor: hasMore ? encodeCursor(docs.at(-1).id) : null,
            ...(sampleOnly ? { sandbox: true } : {}),
          });
        }

        const doc = sampleOnly
          ? (await content.sample(resource)).find((d) => d.id === id)
          : await content.get(resource, id);
        if (!doc) {
          if (sampleOnly && (await content.get(resource, id)))
            throw new ApiError(
              403,
              'sandbox_sample_only',
              'Sandbox keys read the sample catalog only. Use your live key, which comes with a paid plan.',
            );
          throw new ApiError(404, 'not_found', `No ${resource.slice(0, -1)} with that id.`);
        }
        if (!sub)
          return send(200, { data: spec.detail(doc), ...(sampleOnly ? { sandbox: true } : {}) });

        // Audio: count the file size against the allowance, then hand out a short-lived link.
        const info = doc.hasAudio && doc.audioPath ? await media.describe(doc.audioPath) : null;
        if (!info) throw new ApiError(404, 'audio_unavailable', 'This mantra has no recording.');
        const totals = await meter.totals(principal.workspaceId, lane);
        if (totals.audioBytes + info.bytes > limits.audioBytes)
          throw new ApiError(
            429,
            'audio_quota_exceeded',
            'The monthly audio allowance for this plan has been reached.',
          );
        const signed = await media.sign(doc.audioPath);
        meter
          .record({
            workspaceId: principal.workspaceId,
            keyId: principal.keyId,
            lane,
            endpoint,
            requests: 0,
            audioBytes: info.bytes,
          })
          .catch((error) => logger.error(`usage write failed ${requestId}: ${error.message}`));
        if (url.searchParams.get('format') === 'json')
          return send(200, {
            data: {
              url: signed.url,
              expiresAt: signed.expiresAt,
              bytes: info.bytes,
              contentType: info.contentType,
            },
          });
        response.setHeader('Location', signed.url);
        return send(302, { data: { url: signed.url, expiresAt: signed.expiresAt } });
      } catch (error) {
        reservation
          .refund()
          .catch((failure) => logger.error(`usage refund failed ${requestId}: ${failure.message}`));
        response.setHeader(
          'X-Quota-Requests-Remaining',
          String(limits.requests - reservation.used + 1),
        );
        throw error;
      }
    } catch (error) {
      if (error instanceof ApiError)
        return send(error.status, { error: { code: error.code, message: error.message } });
      logger.error(`request ${requestId} failed: ${error.stack || error.message}`);
      return send(500, {
        error: {
          code: 'internal_error',
          message: 'Something went wrong. Quote the requestId if you contact support.',
        },
      });
    }
  });
}
