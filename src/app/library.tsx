import { pageMetadata } from '../data/metadata';
export { default } from '../components/LibraryPage';

export function generateMetadata() {
  return pageMetadata('/library');
}
