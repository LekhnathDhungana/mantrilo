import GuidePage from '../../../components/GuidePage';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata() {
  return pageMetadata('/docs/guides/book-reader');
}

export default function Page() {
  return <GuidePage slug="book-reader" />;
}
