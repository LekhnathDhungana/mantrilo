import { createStaticLoader } from 'expo-router/server';
import MantraPage from '../../../components/MantraPage';
import { pageMetadata, type PageMeta } from '../../../data/metadata';

// /library/mantras: every mantra page, grouped by deity. Read from the snapshot at export time.

const mantras = () => import('../../../data/mantra-pages');

async function data() {
  const hub = (await mantras()).mantraHub();
  const meta: PageMeta = {
    title: 'Mantra & Stotra Library with API Access | Mantrilo',
    description: `Browse nearly ${hub.catalog.roughly.records} Sanskrit mantras and stotras by deity, about ${hub.catalog.roughly.recordings} with recordings. Each page shows the text, the API request and the exact JSON response.`,
    label: 'Mantras',
    indexable: true,
    // Fills the {{records}} and {{recordings}} in meta./library/mantras for other languages.
    vars: { records: hub.catalog.roughly.records, recordings: hub.catalog.roughly.recordings },
  };
  return { kind: 'hub' as const, hub, meta, path: '/library/mantras' };
}

export const loader = createStaticLoader(() => data());

export async function generateMetadata(
  _request?: unknown,
  params?: Record<string, string | string[]>,
) {
  return pageMetadata('/library/mantras', (await data()).meta, params);
}

export default function Page() {
  return <MantraPage />;
}
