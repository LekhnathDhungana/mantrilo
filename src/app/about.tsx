import InfoPage from '../components/InfoPage';
import { pageMetadata } from '../data/metadata';

export function generateMetadata() {
  return pageMetadata('/about');
}

export default function Page() {
  return <InfoPage page="about" />;
}
