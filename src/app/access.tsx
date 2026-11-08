import { pageMetadata } from '../data/metadata';
import InfoPage from '../components/InfoPage';
export default function Page() {
  return <InfoPage page="access" />;
}

export function generateMetadata() {
  return pageMetadata('/access');
}
