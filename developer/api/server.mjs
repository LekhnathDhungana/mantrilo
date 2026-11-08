import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../server/domain.mjs';
import { readKey } from './keys.mjs';
import { RESOURCES, encodeCursor, decodeCursor } from './content.mjs';
import { RATE_LIMITS, RateLimiter, limitsFor } from './usage.mjs';

export const API_VERSION = '2026-11-08';
const ROUTE = /^\/v1\/(shlokas|mantras)(?:\/([^/]+)(?:\/(audio))?)?$/;
const ID = /^[\w-]{1,200}$/;
const FAILED_AUTH_LIMIT = { rate: 0.2, burst: 10 }; // per client IP: 10 bad keys, then 1 per 5 s

export function createApiServer({
  keys,
  content,
  media,
  meter,
  limiter = new RateLimiter(),
  authLimiter = new RateLimiter(),
  trustProxy = false,
  logger = console,
}) {
  return createServer(async (request, response) => {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const send = (status, body) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.writeHead(status);
      response.end(JSON.stringify({ ...body, requestId }));
    };
    const clientIp = () =>
      (trustProxy &&
        String(request.headers['x-forwarded-for'] || '')
          .split(',')[0]
          .trim()) ||
      request.socket.remoteAddress ||
      'unknown';
    try {
      const url = new URL(request.url, 'http://localhost');
      const route = url.pathname.replace(/\/+$/, '') || '/';
      if (route === '/healthz') return send(200, { ok: true });
      if (request.method !== 'GET')
        throw new ApiError(405, 'method_not_allowed', 'The Mantrilo API is read-only; use GET.');
      if (route === '/v1')
        return send(200, {
          name: 'Mantrilo API',
          version: API_VERSION,
          authentication: 'Authorization: Bearer <your Mantrilo API key>',
          resources: [
            '/v1/shlokas',
            '/v1/shlokas/{id}',
            '/v1/shlokas/{id}/audio',
            '/v1/mantras',
            '/v1/mantras/{id}',
          ],
        });
      const match = route.match(ROUTE);
      if (!match) throw new ApiError(404, 'not_found', 'No such endpoint.');
      const [, resource, rawId, sub] = match;
      if (sub && resource !== 'shlokas') throw new ApiError(404, 'not_found', 'No such endpoint.');

      // 1. Authenticate the key (bad keys are throttled per client IP).
      let principal;
      try {
        principal = await keys.resolve(readKey(request));
      } catch (error) {
        if (error.status === 401 && !authLimiter.take(clientIp(), FAILED_AUTH_LIMIT).ok)
          throw new ApiError(
            429,
            'too_many_failed_attempts',
            'Too many invalid API keys. Try again later.',
          );
        throw error;
      }

      // 2. Per-key rate limit (sandbox keys always get the Sandbox rate, whatever the plan).
      const rate =
          (principal.environment !== 'sandbox' && RATE_LIMITS[principal.plan.name]) ||
          RATE_LIMITS.Sandbox,
        taken = limiter.take(principal.keyHash, rate);
      response.setHeader('X-RateLimit-Limit', String(rate.rate));
      response.setHeader('X-RateLimit-Remaining', String(taken.remaining));
      if (!taken.ok) {
        response.setHeader('Retry-After', String(taken.retryAfter));
        throw new ApiError(
          429,
          'rate_limited',
          `This key allows ${rate.rate} requests per second.`,
        );
      }

      // 3. Monthly allowance.
      const limits = limitsFor(principal.plan),
        totals = await meter.totals(principal.workspaceId);
      if (totals.contentRequests >= limits.requests)
        throw new ApiError(
          429,
          'quota_exceeded',
          'The monthly request allowance for this plan has been reached.',
        );
      response.setHeader(
        'X-Quota-Requests-Remaining',
        String(limits.requests - totals.contentRequests - 1),
      );

      // 4. Serve. Sandbox keys only see the sample items.
      const spec = RESOURCES[resource],
        sandbox = principal.environment === 'sandbox',
        charge = (endpoint, audioBytes = 0) =>
          meter
            .record({
              workspaceId: principal.workspaceId,
              keyId: principal.keyId,
              endpoint,
              audioBytes,
            })
            .catch((error) => logger.error(`usage write failed ${requestId}: ${error.message}`));

      if (!rawId) {
        const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 20;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100)
          throw new ApiError(400, 'invalid_limit', 'limit must be an integer from 1 to 100.');
        const after = decodeCursor(url.searchParams.get('cursor'));
        if (after === undefined)
          throw new ApiError(400, 'invalid_cursor', 'The cursor is not valid.');
        const deity = url.searchParams.get('deity');
        if (deity !== null && !/^[\w .-]{1,60}$/.test(deity))
          throw new ApiError(
            400,
            'invalid_deity',
            'deity must be 1-60 letters, digits, spaces, dots or dashes.',
          );
        let docs, hasMore;
        if (sandbox) {
          docs = (await content.sample(resource))
            .filter((doc) => !deity || spec.matchesDeity(doc, deity))
            .filter((doc) => !after || doc.id > after)
            .slice(0, limit);
          hasMore = false;
        } else ({ docs, hasMore } = await content.page(resource, { limit, after, deity }));
        charge(`${resource}.list`);
        return send(200, {
          data: docs.map(spec.summary),
          nextCursor: hasMore ? encodeCursor(docs.at(-1).id) : null,
          ...(sandbox ? { sandbox: true } : {}),
        });
      }

      const id = decodeURIComponent(rawId);
      if (!ID.test(id))
        throw new ApiError(404, 'not_found', `No ${resource.slice(0, -1)} with that id.`);
      const doc = sandbox
        ? (await content.sample(resource)).find((d) => d.id === id)
        : await content.get(resource, id);
      if (!doc) {
        if (sandbox && (await content.get(resource, id)))
          throw new ApiError(
            403,
            'sandbox_sample_only',
            'Sandbox keys can only read the sample catalog. Use a production key.',
          );
        throw new ApiError(404, 'not_found', `No ${resource.slice(0, -1)} with that id.`);
      }
      if (!sub) {
        charge(`${resource}.get`);
        return send(200, { data: spec.detail(doc), ...(sandbox ? { sandbox: true } : {}) });
      }

      // Audio: count the file size against the allowance, then hand out a short-lived link.
      const info = doc.hasAudio && doc.audioPath ? await media.describe(doc.audioPath) : null;
      if (!info) throw new ApiError(404, 'audio_unavailable', 'This shloka has no recording.');
      if (totals.audioBytes + info.bytes > limits.audioBytes)
        throw new ApiError(
          429,
          'audio_quota_exceeded',
          'The monthly audio allowance for this plan has been reached.',
        );
      const signed = await media.sign(doc.audioPath);
      charge('shlokas.audio', info.bytes);
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
