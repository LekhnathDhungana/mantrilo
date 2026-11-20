import GuidePage from '../../../components/GuidePage';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata() {
  return pageMetadata('/docs/guides/featured-mantra');
}

export default function Page() {
  return <GuidePage slug="featured-mantra" />;
}
