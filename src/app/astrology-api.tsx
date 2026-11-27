import { pageMetadata } from '../data/metadata';
export { default } from '../components/AstrologyPage';

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/astrology-api', undefined, params);
}
