import { pageMetadata } from '../data/metadata';
export { default } from '../components/NotFound';

export function generateMetadata() {
  return pageMetadata('/404');
}
