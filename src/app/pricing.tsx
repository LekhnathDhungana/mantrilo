import { pageMetadata } from '../data/metadata';
export { default } from '../components/PricingPage';

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/pricing', undefined, params);
}
