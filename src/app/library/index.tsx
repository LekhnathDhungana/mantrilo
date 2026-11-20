import { createStaticLoader } from 'expo-router/server';
import { pageMetadata } from '../../data/metadata';
export { default } from '../../components/LibraryPage';

// Every book page, listed from the book texts at export time.
export const loader = createStaticLoader(async () => ({
  books: (await import('../../data/book-pages')).bookList(),
}));

export function generateMetadata() {
  return pageMetadata('/library');
}
