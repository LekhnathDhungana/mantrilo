import GuidePage from '../../../components/GuidePage';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata() {
  return pageMetadata('/docs/guides/sacred-audio');
}

export default function Page() {
  return <GuidePage slug="sacred-audio" />;
}
