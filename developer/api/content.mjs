import { Buffer } from 'node:buffer';
import { FieldPath } from 'firebase-admin/firestore';

// Sandbox keys see this many items per resource (the first by id), including their audio.
export const SANDBOX_SAMPLE_SIZE = 5;

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// Public response shapes. Internal Firestore field names and storage paths never leave the API.
function mantraSummary(doc) {
  return {
    id: doc.id,
    title: text(doc.title),
    deity: text(doc.deityKey) ? { id: doc.deityKey, name: text(doc.deity) } : null,
    category: text(doc.category),
    source: text(doc.source),
    // The public description is the reviewed SEO paragraph. The longer general `description`
    // stays internal, and a record without an SEO paragraph returns null like any missing field.
    description: text(doc.seoDescription),
    verseCount: Array.isArray(doc.shlokas) ? doc.shlokas.length : Number(doc.verseCount) || 0,
    audio:
      doc.hasAudio && text(doc.audioPath)
        ? { href: `/v1/mantras/${encodeURIComponent(doc.id)}/audio` }
        : null,
  };
}
function mantraDetail(doc) {
  return {
    ...mantraSummary(doc),
    verses: (doc.shlokas || []).map((verse) => ({
      number: Number.isFinite(verse.shlokaNumber) ? verse.shlokaNumber : null,
      title: text(verse.title),
      sanskrit: text(verse.sanskrit),
      transliteration: text(verse.transliteration),
      // Preserve the contract without distributing stored translations or their glosses.
      translation: null,
      wordMeanings: [],
    })),
  };
}
// Mantras are stored in the `shlokam` collection (its verses in a `shlokas` field); those names
// are internal and never appear in responses.
export const RESOURCES = {
  mantras: {
    collection: 'shlokam',
    summary: mantraSummary,
    detail: mantraDetail,
    matchesDeity: (doc, deity) => doc.deityKey === deity,
    deityQuery: (query, deity) => query.where('deityKey', '==', deity),
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
