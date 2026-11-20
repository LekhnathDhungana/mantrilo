import MantraPreview from '../../../components/MantraPreview';
import { pageMetadata } from '../../../data/metadata';

export function generateMetadata() {
  return pageMetadata('/library/mantras/aham-vaishvanaro-bhutva');
}

export default function Page() {
  return <MantraPreview />;
}
