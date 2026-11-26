import { createStaticLoader } from 'expo-router/server';
import UpanishadsCollection from '../../../components/UpanishadsCollection';
import { pageMetadata } from '../../../data/metadata';

export const loader = createStaticLoader(async () => ({
  books: (await import('../../../data/book-pages'))
    .bookList()
    .filter((book) => book.collection === 'upanishads'),
}));

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/library/books/upanishads', undefined, params);
}

export default function Page() {
  return <UpanishadsCollection />;
}
