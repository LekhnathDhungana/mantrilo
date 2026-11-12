import { pageMetadata } from '../data/metadata';
import ProductPage from '../components/ProductPage';
export default function Page() {
  return <ProductPage slug="mantra-api" />;
}

export function generateMetadata() {
  return pageMetadata('/mantra-api');
}
