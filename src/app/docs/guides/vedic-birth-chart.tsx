import GuidePage from '../../../components/GuidePage';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata() {
  return pageMetadata('/docs/guides/vedic-birth-chart');
}

export default function Page() {
  return <GuidePage slug="vedic-birth-chart" />;
}
