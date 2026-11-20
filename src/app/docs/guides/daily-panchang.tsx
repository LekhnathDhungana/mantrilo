import GuidePage from '../../../components/GuidePage';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata() {
  return pageMetadata('/docs/guides/daily-panchang');
}

export default function Page() {
  return <GuidePage slug="daily-panchang" />;
}
