/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import catalog from './book-catalog.json';
import type { PageMeta } from './metadata';

// Build-time only: loaders, generateStaticParams and generateMetadata read the book texts in
// books/ from disk. Client components import types from here, never values.

type CatalogEntry = {
  apiId: string;
  title: string;
  aliases: string;
  author: string;
  collection: string;
  files: string;
  chapterTerm: string;
  chapterNames?: Record<string, string>;
  sandbox?: boolean;
  guide: string;
  intro: string;
};

type RawVerse = {
  key?: string | number;
  chapter?: number | null;
  verse?: number | null;
  sanskrit?: string;
  roman?: string;
  translation_reworded?: string;
};

export type Verse = {
  key: string;
  heading: string | null;
  sanskrit: string;
  transliteration: string;
  english: string | null;
};

export type { PageMeta };
export type NavLink = { path: string; label: string };

export type ChapterSummary = {
  number: number;
  name: string;
  verseCount: number;
  path: string;
};

export type BookSummary = {
  slug: string;
  path: string;
  apiId: string;
  title: string;
  aliases: string;
  author: string;
  collection: string;
  guide: string;
  sandbox: boolean;
  intro: string;
  chapterTerm: string;
  verseCount: number;
  chapters: ChapterSummary[];
  reference: string | null;
};

// One page of text: a whole chapter, or one part of a long chapter (or long single-chapter book).
export type TextPage = {
  meta: PageMeta;
  path: string;
  book: BookSummary;
  chapter: ChapterSummary;
  verses: Verse[];
  part: { index: number; of: number; first: string; last: string } | null;
  parts: NavLink[];
  previous: NavLink | null;
  next: NavLink | null;
};

export type BookOverview = { meta: PageMeta; path: string; book: BookSummary };

// Long texts are split so no page carries more than PART_SIZE verses.
const PART_SIZE = 100;
const SPLIT_ABOVE = 120;

const booksDir = () => path.join(process.cwd(), 'books');

function readFiles(pattern: string) {
  const [dir, name] = pattern.split('/');
  const names = name.includes('*')
    ? fs
        .readdirSync(path.join(booksDir(), dir))
        .filter((file) => new RegExp('^' + name.replace('*', '.*') + '$').test(file))
        .sort()
    : [name];
  return names.map((file) => JSON.parse(fs.readFileSync(path.join(booksDir(), dir, file), 'utf8')));
}

// <vt>Title</vt> at the start of a verse is a heading for the passage that follows.
const heading = (text = '') => text.match(/<vt>(.*?)<\/vt>/)?.[1]?.trim() || null;
const clean = (text = '') =>
  text
    .replace(/<vt>.*?<\/vt>\s*/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

type Index = { overviews: Map<string, BookOverview>; pages: Map<string, TextPage> };
let index: Index | null = null;

function build(): Index {
  if (index) return index;
  const overviews = new Map<string, BookOverview>();
  const pages = new Map<string, TextPage>();
  for (const [slug, entry] of Object.entries(catalog as Record<string, CatalogEntry>)) {
    const docs = readFiles(entry.files);
    const text = new Map<number, Verse[]>();
    const names = new Map<number, string>();
    for (const doc of docs) {
      // Gita chapter files carry their own name ("Chapter 2 – Sāṅkhya Yoga (The Yoga of Knowledge)").
      if (typeof doc.chapter === 'number' && typeof doc.title === 'string')
        names.set(doc.chapter, doc.title.replace(/^Chapter \d+\s*[–-]\s*/, ''));
      for (const raw of doc.verses as RawVerse[]) {
        const chapter = raw.chapter ?? 1;
        const list = text.get(chapter) ?? [];
        list.push({
          key: String(raw.key ?? `${chapter}.${raw.verse ?? list.length}`),
          heading: heading(raw.sanskrit) ?? heading(raw.roman),
          sanskrit: clean(raw.sanskrit),
          transliteration: clean(raw.roman),
          english: clean(raw.translation_reworded).replace(/^Invocation:\s*/, '') || null,
        });
        text.set(chapter, list);
      }
    }
    const bookPath = `/library/books/${slug}`;
    const numbers = [...text.keys()].sort((a, b) => a - b);
    const single = numbers.length === 1;
    const chapters: ChapterSummary[] = numbers.map((number) => ({
      number,
      name:
        entry.chapterNames?.[number] ??
        names.get(number) ??
        (single ? entry.title : `${entry.chapterTerm} ${number}`),
      verseCount: text.get(number)!.length,
      path: single ? bookPath : `${bookPath}/chapter-${number}`,
    }));
    const book: BookSummary = {
      slug,
      path: bookPath,
      apiId: entry.apiId,
      title: entry.title,
      aliases: entry.aliases,
      author: entry.author,
      collection: entry.collection,
      guide: entry.guide,
      sandbox: Boolean(entry.sandbox),
      intro: entry.intro,
      chapterTerm: entry.chapterTerm,
      verseCount: chapters.reduce((sum, chapter) => sum + chapter.verseCount, 0),
      chapters,
      reference: typeof docs[0]?.source_url === 'string' ? docs[0].source_url : null,
    };
    const loadHint = (chapter: number) =>
      `Load it with GET /v1/books/${entry.apiId}${single ? '' : `/chapters/${chapter}`}.`;
    if (!single)
      overviews.set(slug, {
        path: bookPath,
        book,
        meta: {
          title: `${book.title} API: Sanskrit Verses & English | Mantrilo`,
          description: `${book.title} in ${chapters.length} ${entry.chapterTerm.toLowerCase()}s and ${book.verseCount} verses, in Sanskrit with transliteration and English. Load it with GET /v1/books/${entry.apiId} and read each chapter from your app.`,
          label: book.title,
          indexable: true,
        },
      });

    // Every text page of the book in reading order, then linked to its neighbours.
    const sequence: TextPage[] = [];
    for (const chapter of chapters) {
      const all = text.get(chapter.number)!;
      const count = all.length > SPLIT_ABOVE ? Math.ceil(all.length / PART_SIZE) : 1;
      const partPath = (n: number) =>
        n === 1 ? chapter.path : single ? `${bookPath}/part-${n}` : `${chapter.path}-part-${n}`;
      for (let n = 1; n <= count; n++) {
        const verses = count === 1 ? all : all.slice((n - 1) * PART_SIZE, n * PART_SIZE);
        const part =
          count === 1
            ? null
            : { index: n, of: count, first: verses[0].key, last: verses[verses.length - 1].key };
        const range = part ? ` (verses ${part.first}–${part.last})` : '';
        const where = single ? book.title : `${book.title} ${entry.chapterTerm} ${chapter.number}`;
        // Titles drop a chapter name's bracketed English ("Sāṅkhya Yoga (The Yoga of Knowledge)");
        // the page heading keeps it.
        const named =
          single || chapter.name.startsWith(entry.chapterTerm)
            ? where
            : `${where}: ${chapter.name.replace(/\s*\(.*\)$/, '')}`;
        const english = verses.filter((verse) => verse.english).length;
        const meta: PageMeta =
          single && n === 1
            ? {
                title: `${book.title} API: Sanskrit Verses & English | Mantrilo`,
                description: `${book.title}: ${plural(all.length, 'verse')} in Sanskrit with transliteration and English. ${loadHint(chapter.number)} Follow nextOffset to read the rest from your app.`,
                label: book.title,
                indexable: true,
              }
            : {
                // Keep titles near 60 characters: long chapter names drop the suffix.
                title: `${named}${part ? `, Part ${n}` : ''}${named.length + (part ? 8 : 0) <= 42 ? ' in Sanskrit & English' : ''} | Mantrilo`,
                description: `Read ${where}${range}: ${plural(verses.length, 'verse')} in Devanagari with transliteration and English. ${loadHint(chapter.number)}`,
                label: single
                  ? `Part ${n}`
                  : `${entry.chapterTerm} ${chapter.number}${part ? `, part ${n}` : ''}`,
                // Pages missing English on more than a tenth of their verses wait until it is written.
                indexable: english >= Math.ceil(verses.length * 0.9),
              };
        if (partPath(n) !== bookPath) meta.parent = { path: bookPath, label: book.title };
        sequence.push({
          meta,
          path: partPath(n),
          book,
          chapter,
          verses,
          part,
          parts:
            count === 1
              ? []
              : Array.from({ length: count }, (_, i) => ({
                  path: partPath(i + 1),
                  label: `Part ${i + 1}`,
                })),
          previous: null,
          next: null,
        });
      }
    }
    const link = (page: TextPage): NavLink => ({
      path: page.path,
      label: page.meta.label === book.title ? book.title : page.meta.label,
    });
    sequence.forEach((page, i) => {
      page.previous = i > 0 ? link(sequence[i - 1]) : null;
      page.next = i < sequence.length - 1 ? link(sequence[i + 1]) : null;
      pages.set(page.path, page);
    });
  }
  index = { overviews, pages };
  return index;
}

export const allBooks = (): BookSummary[] => {
  const seen = new Map<string, BookSummary>();
  for (const page of build().pages.values()) seen.set(page.book.slug, page.book);
  return [...seen.values()];
};

// Routes: /library/books/{book} and /library/books/{book}/{section}.
export function bookParams() {
  const { overviews, pages } = build();
  const roots = new Set([...overviews.keys()]);
  const sections: { book: string; section: string }[] = [];
  for (const page of pages.values()) {
    const [, , , book, section] = page.path.split('/');
    if (section) sections.push({ book, section });
    else roots.add(book);
  }
  return { roots: [...roots].map((book) => ({ book })), sections };
}

export const bookOverview = (book: string) => build().overviews.get(book) ?? null;

export const textPage = (book: string, section?: string) =>
  build().pages.get(`/library/books/${book}${section ? `/${section}` : ''}`) ?? null;

// The compact listing the Library and Upanishads pages link from.
export type BookListing = {
  slug: string;
  path: string;
  title: string;
  collection: string;
  chapterTerm: string;
  chapters: number;
  verseCount: number;
  sandbox: boolean;
};

export const bookList = (): BookListing[] =>
  allBooks().map((book) => ({
    slug: book.slug,
    path: book.path,
    title: book.title,
    collection: book.collection,
    chapterTerm: book.chapterTerm,
    chapters: book.chapters.length,
    verseCount: book.verseCount,
    sandbox: book.sandbox,
  }));
