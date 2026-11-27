import { insist } from './domain.mjs';
import { RESOURCES, decodeCursor, encodeCursor } from '../api/content.mjs';

const PAGE_SIZE = 24;

function resourceSpec(resource) {
  insist(Object.hasOwn(RESOURCES, resource), 400, 'invalid_type', 'Choose mantras.');
  return RESOURCES[resource];
}

// Browsing in the console is free. Free plans see the same sample as the API gives them.
// `deity` is the same filter the public API takes: a deity id such as shiva.
export async function libraryPage(content, resource, { cursor, sampleOnly, deity = null }) {
  const { summary, matchesDeity } = resourceSpec(resource),
    after = decodeCursor(cursor);
  insist(after !== undefined, 400, 'invalid_cursor', 'That page is not valid.');
  insist(
    deity === null || /^[\w .-]{1,60}$/.test(deity),
    400,
    'invalid_deity',
    'deity must be 1-60 letters, digits, spaces, dots or dashes.',
  );
  if (sampleOnly)
    return {
      data: (await content.sample(resource))
        .filter((doc) => !deity || matchesDeity(doc, deity))
        .map(summary),
      nextCursor: null,
    };
  const { docs, hasMore } = await content.page(resource, { limit: PAGE_SIZE, after, deity });
  return {
    data: docs.map(summary),
    nextCursor: hasMore ? encodeCursor(docs.at(-1).id) : null,
  };
}

export async function libraryItem(content, resource, id, { sampleOnly }) {
  const { detail } = resourceSpec(resource);
  return { data: detail(await libraryRecord(content, resource, id, sampleOnly)) };
}

async function libraryRecord(content, resource, id, sampleOnly) {
  const doc = sampleOnly
    ? (await content.sample(resource)).find((item) => item.id === id)
    : await content.get(resource, id);
  insist(doc, 404, 'not_found', 'That item is not in your library.');
  return doc;
}

export async function streamLibraryAudio({ content, media, id, sampleOnly, request, response }) {
  const doc = await libraryRecord(content, 'mantras', id, sampleOnly);
  insist(
    RESOURCES.mantras.summary(doc).audio,
    404,
    'audio_unavailable',
    'This text has no recording.',
  );
  const info = await media.describe(doc.audioPath);
  insist(
    Number.isSafeInteger(info?.bytes) && info.bytes > 0,
    404,
    'audio_unavailable',
    'This recording is unavailable.',
  );
  const { bytes } = info;
  const range = request.headers.range;
  let start = 0;
  let end = bytes - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, bytes - Number(match[2]));
      if (match[1] && match[2]) end = Math.min(end, Number(match[2]));
    }
    if (!match || (!match[1] && !match[2]) || start >= bytes || end < start) {
      response.writeHead(416, { 'Content-Range': `bytes */${bytes}` }).end();
      return;
    }
  }
  const type = info.contentType === 'audio/x-m4a' ? 'audio/mp4' : info.contentType;
  const stream =
    request.method === 'HEAD'
      ? null
      : media.open(doc.audioPath, range ? { start, end } : undefined);
  response.writeHead(range ? 206 : 200, {
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': /^audio\/[a-z0-9.+-]+$/i.test(type ?? '') ? type : 'audio/mp4',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${bytes}` } : {}),
  });
  if (!stream) return response.end();
  // A closed player or failed stream ends this response. Its headers are already sent.
  stream.once('error', () => response.destroy());
  response.once('close', () => stream.destroy());
  stream.pipe(response);
}
