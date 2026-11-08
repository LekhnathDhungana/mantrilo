import { pageMetadata } from '../data/metadata';
import InfoPage from '../components/InfoPage';
export default function Page() { return <InfoPage page="docs" />; }

export function generateMetadata() { return pageMetadata('/docs'); }
