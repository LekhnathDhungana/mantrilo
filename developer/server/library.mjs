import { insist } from './domain.mjs';
import { RESOURCES, decodeCursor, encodeCursor } from '../api/content.mjs';

const PAGE_SIZE = 24;

function resourceSpec(resource) {
  insist(Object.hasOwn(RESOURCES, resource), 400, 'invalid_type', 'Choose shlokas or mantras.');
  return RESOURCES[resource];
}

// Browsing in the console is free. Free plans see the same sample as sandbox keys.
export async function libraryPage(content, resource, { cursor, sampleOnly }) {
  const { summary } = resourceSpec(resource),
    after = decodeCursor(cursor);
  insist(after !== undefined, 400, 'invalid_cursor', 'That page is not valid.');
  if (sampleOnly) return { data: (await content.sample(resource)).map(summary), nextCursor: null };
  const { docs, hasMore } = await content.page(resource, { limit: PAGE_SIZE, after });
  return {
    data: docs.map(summary),
    nextCursor: hasMore ? encodeCursor(docs.at(-1).id) : null,
  };
}

export async function libraryItem(content, resource, id, { sampleOnly }) {
  const { detail } = resourceSpec(resource);
  const doc = sampleOnly
    ? (await content.sample(resource)).find((item) => item.id === id)
    : await content.get(resource, id);
  insist(doc, 404, 'not_found', 'That item is not in your library.');
  return { data: detail(doc) };
}
