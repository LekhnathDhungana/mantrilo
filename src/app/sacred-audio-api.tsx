import { pageMetadata } from '../data/metadata';
import ProductPage from '../components/ProductPage';
export default function Page() {
  return <ProductPage slug="sacred-audio-api" />;
}

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/sacred-audio-api', undefined, params);
}
