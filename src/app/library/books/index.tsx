import { createStaticLoader } from 'expo-router/server';
import BooksPage from '../../../components/BooksPage';
import { pageMetadata } from '../../../data/metadata';

// /library/books: every book on its shelf, with a verse from the Gita and the Isha Upanishad as
// the page's samples. The book texts are read at export time.

export const loader = createStaticLoader(async () => {
  const { bookList, textPage } = await import('../../../data/book-pages');
  const sample = (book: string, section: string | undefined, find: (key: string) => boolean) => {
    const verses = textPage(book, section)?.verses ?? [];
    const verse = verses.find((entry) => find(entry.key) && entry.sanskrit) ?? verses[0];
    return verse
      ? { key: verse.key, sanskrit: verse.sanskrit, transliteration: verse.transliteration }
      : null;
  };
  return {
    books: bookList(),
    gita: sample('bhagavad-gita', 'chapter-2', (key) => key === '2.20'),
    isha: sample('isha-upanishad', undefined, (key) => /(^|\.)1$/.test(key)),
  };
});

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/library/books', undefined, params);
}

export default function Page() {
  return <BooksPage />;
}
