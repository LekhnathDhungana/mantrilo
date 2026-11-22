import { createStaticLoader } from 'expo-router/server';
import MantraPage from '../../../components/MantraPage';
import { pageMetadata, type PageMeta } from '../../../data/metadata';

// /library/mantras: every mantra page, grouped by deity. Read from the snapshot at export time.

const mantras = () => import('../../../data/mantra-pages');

async function data() {
  const hub = (await mantras()).mantraHub();
  const meta: PageMeta = {
    title: 'Mantra & Stotra Library with API Access | Mantrilo',
    description: `Browse ${hub.total} Sanskrit mantras and stotras by deity, ${hub.audio} with recordings. Each page shows the text, the API request and the exact JSON response.`,
    label: 'Mantras',
    indexable: true,
  };
  return { kind: 'hub' as const, hub, meta, path: '/library/mantras' };
}

export const loader = createStaticLoader(() => data());

export async function generateMetadata() {
  return pageMetadata('/library/mantras', (await data()).meta);
}

export default function Page() {
  return <MantraPage />;
}
