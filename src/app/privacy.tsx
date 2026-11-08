import { pageMetadata } from '../data/metadata';
import InfoPage from '../components/InfoPage';
export default function Page() {
  return <InfoPage page="privacy" />;
}

export function generateMetadata() {
  return pageMetadata('/privacy');
}
