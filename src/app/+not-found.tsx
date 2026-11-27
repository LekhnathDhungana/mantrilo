import { pageMetadata } from '../data/metadata';
export { default } from '../components/NotFound';

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/404', undefined, params);
}
