import { pageMetadata } from '../data/metadata';
export { default } from '../components/AstrologyPage';

export function generateMetadata() {
  return pageMetadata('/astrology-api');
}
