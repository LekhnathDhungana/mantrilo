import { decodeCursor, encodeCursor } from '../api/content.mjs';
import { insist } from './domain.mjs';

const BOOK_ID = /^[\w-]{1,200}$/;
const PAGE_SIZE = 24;
const VERSE_PAGE_SIZE = 30;
const PREVIEW_SIZE = 3;
// These two titles are marked live in both of Mantrilo's catalog layouts.
const SAMPLE_BOOKS = new Set(['bhagavadGita', 'ishaUpanishad', 'demo-pustak']);

const COLLECTION_ID = /^[a-z0-9-]{1,80}$/;

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const number = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : null);
// A book's collection is its catalog subcategory (or category), e.g. "Upanishads" → upanishads.
export const collectionId = (name) =>
  name
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || null;
function collectionOf(book) {
  const name = text(book.subcategory) ?? text(book.category);
  const id = collectionId(name);
  return id ? { id, name } : null;
}

function bookSummary(book) {
  return {
    id: book.id,
    title: text(book.title) ?? book.id,
    author: text(book.author),
    category: text(book.category),
    subcategory: text(book.subcategory),
    collection: collectionOf(book),
    // Books have no reviewed SEO paragraph; the short catalog blurb is the public description.
    // The long description stays internal.
    description: text(book.seoDescription) ?? text(book.shortDescription),
    verseCount: number(book.totalVerses),
  };
}

function chapterHeader(chapter) {
  return {
    number: number(chapter.chapter ?? chapter.chapter_number),
    title: text(chapter.name_translation) ?? text(chapter.name),
    description: text(chapter.description ?? chapter.chapter_summary),
    verseCount: number(chapter.verseCount ?? chapter.verses_count ?? chapter.verses?.length),
  };
}

function passage(verse) {
  return {
    number: number(verse.verse ?? verse.verse_number),
    sanskrit: text(verse.sanskrit ?? verse.text),
    transliteration: text(verse.transliteration),
    translation: text(verse.translation),
    translator: text(verse.translator),
    wordMeaning: text(verse.wordMeaning ?? verse.word_meanings),
    commentary: text(verse.commentary),
  };
}

function chapterPage(chapter, verses, { offset, limit }) {
  const end = offset + limit;
  return {
    ...chapterHeader(chapter),
    verseCount: verses.length,
    verses: verses.slice(offset, end).map(passage),
    nextOffset: end < verses.length ? end : null,
  };
}

function chapterIndex(chapters) {
  return chapters
    .map(chapterHeader)
    .filter((chapter) => chapter.number > 0)
    .sort((a, b) => a.number - b.number);
}

export class FirestorePustak {
  constructor(db) {
    this.db = db;
  }

  async catalogue() {
    // This is the reader catalog used by Satyam, copied into Mantrilo's project.
    const catalogue = await this.db.doc('pustak_metadata/catalogue').get();
    if (catalogue.exists) return catalogue.get('books') ?? [];
    const legacy = await this.db.collection('pustakCatalogue').where('isLive', '==', true).get();
    return legacy.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  }

  legacy(bookId, type) {
    return this.db
      .collection('pustakContent')
      .where('pustakId', '==', bookId)
      .where('docType', '==', type);
  }

  async index(bookId) {
    const book = this.db.doc(`pustak/${bookId}`);
    const meta = (await book.get()).data();
    if (meta?.isLive === false) return [];
    if (meta?.chapterIndex?.length) return chapterIndex(meta.chapterIndex);

    const prepared = await book
      .collection('chapters')
      .select('chapter', 'name', 'description', 'verseCount')
      .get();
    if (!prepared.empty) {
      return chapterIndex(prepared.docs.map((doc) => ({ chapter: Number(doc.id), ...doc.data() })));
    }
    const legacy = await this.legacy(bookId, 'chapter').get();
    if (!legacy.empty) return chapterIndex(legacy.docs.map((doc) => doc.data()));
    const unified = await this.db.doc(`pustakContent/${bookId}`).get();
    return chapterIndex(unified.data()?.chapters ?? []);
  }

  async chapter(bookId, chapter, page) {
    const ref = this.db.doc(`pustak/${bookId}/chapters/${chapter}`);
    const prepared = (await ref.get()).data();
    if (Array.isArray(prepared?.verses)) {
      let verses = prepared.verses;
      if (prepared.partCount > 1 && page.offset + page.limit > verses.length) {
        const parts = await ref.collection('parts').orderBy('index').get();
        verses = verses.concat(parts.docs.flatMap((doc) => doc.get('verses') ?? []));
      }
      const result = chapterPage(prepared, verses, page);
      if (prepared.verseCount > result.verseCount) {
        result.verseCount = prepared.verseCount;
        const end = page.offset + page.limit;
        result.nextOffset = end < result.verseCount ? end : null;
      }
      return result;
    }

    const [header, rows] = await Promise.all([
      this.legacy(bookId, 'chapter').where('chapter_number', '==', chapter).limit(1).get(),
      this.legacy(bookId, 'verse').where('chapter_number', '==', chapter).get(),
    ]);
    if (header.empty && rows.empty) {
      const unified = await this.db.doc(`pustakContent/${bookId}`).get();
      const stored = unified.data()?.chapters?.find((item) => item.chapter === chapter);
      return stored ? chapterPage(stored, stored.verses ?? [], page) : null;
    }

    const verses = rows.docs
      .map((doc) => doc.data())
      .sort((a, b) => (a.verse_order ?? a.verse_number) - (b.verse_order ?? b.verse_number));
    const result = chapterPage(header.docs[0]?.data() ?? { chapter }, verses, page);
    const ids = verses
      .slice(page.offset, page.offset + page.limit)
      .map((verse) => verse.externalId)
      .filter((id) => id != null);
    if (ids.length) {
      // A verse page stays within Firestore's 30-value limit for an 'in' query.
      const translations = await this.legacy(bookId, 'translation')
        .where('verse_id', 'in', ids)
        .where('lang', '==', 'english')
        .select('verse_id', 'author_id', 'authorName', 'description')
        .get();
      const byVerse = new Map();
      for (const doc of translations.docs) {
        const translation = doc.data();
        if (!byVerse.has(translation.verse_id) || translation.author_id === 19)
          byVerse.set(translation.verse_id, translation);
      }
      for (const [index, verse] of result.verses.entries()) {
        const translation = byVerse.get(verses[page.offset + index].externalId);
        if (translation) {
          verse.translation = text(translation.description);
          verse.translator = text(translation.authorName);
        }
      }
    }
    return result;
  }
}

// Reads the list query of /v1/books: an optional collection id and page size.
export function readBookListQuery(params) {
  const collection = params.get('collection');
  insist(
    collection === null || COLLECTION_ID.test(collection),
    400,
    'invalid_collection',
    'collection must be a collection id such as upanishads.',
  );
  const limit = params.has('limit') ? Number(params.get('limit')) : PAGE_SIZE;
  insist(
    Number.isInteger(limit) && limit >= 1 && limit <= 100,
    400,
    'invalid_limit',
    'limit must be an integer from 1 to 100.',
  );
  return { collection, limit };
}

export async function readPustakLibrary(
  books,
  { id, chapter, cursor, offset, sampleOnly, collection = null, limit: pageSize = PAGE_SIZE },
) {
  const available = (await books.catalogue()).filter(
    (book) =>
      book?.isLive === true &&
      typeof book.id === 'string' &&
      BOOK_ID.test(book.id) &&
      (!sampleOnly || SAMPLE_BOOKS.has(book.id)),
  );
  if (!id) {
    const listed = collection
      ? available.filter((book) => collectionOf(book)?.id === collection)
      : available;
    const after = decodeCursor(cursor);
    const start = after ? listed.findIndex((book) => book.id === after) + 1 : 0;
    insist(
      after !== undefined && (!after || start > 0),
      400,
      'invalid_cursor',
      'That page is not valid.',
    );
    const page = listed.slice(start, start + pageSize);
    return {
      data: page.map(bookSummary),
      nextCursor: start + pageSize < listed.length ? encodeCursor(page.at(-1).id) : null,
    };
  }

  const book = available.find((item) => item.id === id);
  insist(book, 404, 'not_found', 'That book is not in your library.');
  const chapters = await books.index(id);
  if (chapter === undefined) {
    return {
      data: {
        ...bookSummary(book),
        chapters: sampleOnly ? chapters.slice(0, 1) : chapters,
        preview: sampleOnly,
      },
    };
  }
  const chapterNumber = Number(chapter);
  const start = offset === null ? 0 : Number(offset);
  const limit = sampleOnly ? PREVIEW_SIZE : VERSE_PAGE_SIZE;
  insist(
    Number.isSafeInteger(start) && start >= 0 && start % limit === 0,
    400,
    'invalid_offset',
    'That verse page is not valid.',
  );
  const visibleChapters = sampleOnly ? chapters.slice(0, 1) : chapters;
  insist(
    visibleChapters.some((entry) => entry.number === chapterNumber) && (!sampleOnly || start === 0),
    404,
    'not_found',
    'That chapter page is not in your library.',
  );
  const page = await books.chapter(id, chapterNumber, { offset: start, limit });
  insist(page, 404, 'not_found', 'That chapter is not available.');
  return { data: { ...page, nextOffset: sampleOnly ? null : page.nextOffset } };
}

// Placeholder data is confined to the local console's demo mode.
const demoBook = {
  id: 'demo-pustak',
  title: 'Sample pustak',
  author: 'Mantrilo demo',
  category: 'Demo',
  subcategory: 'Upanishads',
  shortDescription: 'Placeholder passages for testing the book reader.',
  isLive: true,
  totalVerses: 8,
};
const demoChapters = [1, 2].map((chapter) => ({
  chapter,
  name: `Sample chapter ${chapter}`,
  verses: [0, 1, 2, 3].map((verse) => ({
    verse,
    sanskrit: 'ॐ',
    transliteration: 'om',
    translation: 'Placeholder text for local testing.',
  })),
}));
export const demoPustak = {
  async catalogue() {
    return [demoBook];
  },
  async index() {
    return chapterIndex(demoChapters);
  },
  async chapter(_id, chapter, page) {
    const data = demoChapters.find((item) => item.chapter === chapter);
    return data ? chapterPage(data, data.verses, page) : null;
  },
};
