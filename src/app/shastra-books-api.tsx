import { pageMetadata } from '../data/metadata';
import ProductPage from '../components/ProductPage';
export default function Page() { return <ProductPage slug="shastra-books-api" />; }

export function generateMetadata() { return pageMetadata('/shastra-books-api'); }
