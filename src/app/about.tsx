import InfoPage from '../components/InfoPage';
import { pageMetadata } from '../data/metadata';

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/about', undefined, params);
}

export default function Page() {
  return <InfoPage page="about" />;
}
