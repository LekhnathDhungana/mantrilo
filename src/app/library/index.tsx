import { createStaticLoader } from 'expo-router/server';
import { pageMetadata } from '../../data/metadata';
export { default } from '../../components/LibraryPage';

// Every book page and the mantra library's headline numbers, read at export time.
export const loader = createStaticLoader(async () => ({
  mantras: (await import('../../data/mantra-pages')).mantraFeature(),
  books: (await import('../../data/book-pages')).bookList(),
}));

export function generateMetadata() {
  return pageMetadata('/library');
}
