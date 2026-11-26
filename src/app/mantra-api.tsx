import { pageMetadata } from '../data/metadata';
import ProductPage from '../components/ProductPage';
export default function Page() {
  return <ProductPage slug="mantra-api" />;
}

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/mantra-api', undefined, params);
}
