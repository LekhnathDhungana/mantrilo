import GuidePage from '../../../components/GuidePage';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/docs/guides/vedic-birth-chart', undefined, params);
}

export default function Page() {
  return <GuidePage slug="vedic-birth-chart" />;
}
