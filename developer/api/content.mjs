import { Buffer } from 'node:buffer';
import { FieldPath } from 'firebase-admin/firestore';

// Sandbox keys see this many items per resource (the first by id), including their audio.
export const SANDBOX_SAMPLE_SIZE = 5;

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const list = (value) => (Array.isArray(value) ? value.filter((v) => text(v)).map(text) : []);

// Public response shapes. Internal Firestore field names and storage paths never leave the API.
function shlokaSummary(doc) {
  return {
    id: doc.id,
    title: text(doc.title),
    deity: text(doc.deityKey) ? { id: doc.deityKey, name: text(doc.deity) } : null,
    category: text(doc.category),
    source: text(doc.source),
    description: text(doc.description),
    verseCount: Array.isArray(doc.shlokas) ? doc.shlokas.length : Number(doc.verseCount) || 0,
    audio:
      doc.hasAudio && text(doc.audioPath)
        ? { href: `/v1/shlokas/${encodeURIComponent(doc.id)}/audio` }
        : null,
  };
}
function shlokaDetail(doc) {
  return {
    ...shlokaSummary(doc),
    verses: (doc.shlokas || []).map((verse) => ({
      number: Number.isFinite(verse.shlokaNumber) ? verse.shlokaNumber : null,
      title: text(verse.title),
      sanskrit: text(verse.sanskrit),
      transliteration: text(verse.transliteration),
      translation: text(verse.translation),
      wordMeanings: (verse.wordMeaning || []).map((w) => ({
        word: text(w.word),
        meaning: text(w.meaning),
      })),
    })),
  };
}
function mantraSummary(doc) {
  return {
    id: doc.id,
    title: text(doc.title),
    deities: list(doc.deity),
    tags: list(doc.tags),
    description: text(doc.description),
    language: text(doc.language),
  };
}
function byLanguage(doc, prefix) {
  const out = {};
  for (const [field, value] of Object.entries(doc)) {
    const match = field.match(new RegExp(`^${prefix}_([a-z]{2,3})$`));
    if (match && text(value)) out[match[1]] = text(value);
  }
  return out;
}
function mantraDetail(doc) {
  return {
    ...mantraSummary(doc),
    text: text(doc.originalLanguage),
    transliterations: byLanguage(doc, 'transliteration'),
    translations: byLanguage(doc, 'translation'),
    source: text(doc.source),
    citation: text(doc.citation),
  };
}

export const RESOURCES = {
  shlokas: {
    collection: 'shlokam',
    summary: shlokaSummary,
    detail: shlokaDetail,
    matchesDeity: (doc, deity) => doc.deityKey === deity,
    deityQuery: (query, deity) => query.where('deityKey', '==', deity),
  },
  mantras: {
    collection: 'mantra',
    summary: mantraSummary,
    detail: mantraDetail,
    matchesDeity: (doc, deity) => list(doc.deity).includes(deity),
    deityQuery: (query, deity) => query.where('deity', 'array-contains', deity),
  },
};

export const encodeCursor = (id) => Buffer.from(id).toString('base64url');
export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  const id = Buffer.from(cursor, 'base64url').toString();
  return /^[\w-]{1,200}$/.test(id) ? id : undefined;
};

// Reads content with server credentials; Firestore rules stay deny-all for clients.
export class FirestoreContent {
  constructor(db) {
    this.db = db;
    this.samples = new Map();
  }
  async page(resource, { limit, after, deity }) {
    const spec = RESOURCES[resource];
    let query = this.db.collection(spec.collection);
    if (deity) query = spec.deityQuery(query, deity);
    query = query.orderBy(FieldPath.documentId());
    if (after) query = query.startAfter(after);
    const snapshot = await query.limit(limit + 1).get();
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { docs: docs.slice(0, limit), hasMore: docs.length > limit };
  }
  async get(resource, id) {
    const snap = await this.db.doc(`${RESOURCES[resource].collection}/${id}`).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  async sample(resource) {
    if (!this.samples.has(resource))
      this.samples.set(
        resource,
        this.page(resource, { limit: SANDBOX_SAMPLE_SIZE }).then((r) => r.docs),
      );
    return this.samples.get(resource);
  }
}

// In-memory content for tests and local demos.
export class MemoryContent {
  constructor(data) {
    this.data = data;
  }
  async page(resource, { limit, after, deity }) {
    const spec = RESOURCES[resource];
    const docs = [...(this.data[resource] || [])]
      .filter((doc) => !deity || spec.matchesDeity(doc, deity))
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .filter((doc) => !after || doc.id > after);
    return { docs: docs.slice(0, limit), hasMore: docs.length > limit };
  }
  async get(resource, id) {
    return (this.data[resource] || []).find((doc) => doc.id === id) || null;
  }
  async sample(resource) {
    return (await this.page(resource, { limit: SANDBOX_SAMPLE_SIZE })).docs;
  }
}
