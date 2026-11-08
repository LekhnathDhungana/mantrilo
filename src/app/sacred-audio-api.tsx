import { pageMetadata } from '../data/metadata';
import ProductPage from '../components/ProductPage';
export default function Page() {
  return <ProductPage slug="sacred-audio-api" />;
}

export function generateMetadata() {
  return pageMetadata('/sacred-audio-api');
}
