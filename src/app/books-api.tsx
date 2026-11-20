import { pageMetadata } from '../data/metadata';
import ProductPage from '../components/ProductPage';
export default function Page() {
  return <ProductPage slug="books-api" />;
}

export function generateMetadata() {
  return pageMetadata('/books-api');
}
