import { createStaticLoader } from 'expo-router/server';
import MantraPage from '../../../components/MantraPage';
import { pageMetadata } from '../../../data/metadata';

// /library/mantras/{slug}: one page per mantra, documenting GET /v1/mantras/{id} with this
// mantra's own response. Read from the snapshot (scripts/snapshot-mantras.mjs) at export time.

const mantras = () => import('../../../data/mantra-pages');

export async function generateStaticParams() {
  return (await mantras()).mantraSlugs();
}

async function data(slug: string) {
  const page = (await mantras()).mantraPage(slug);
  return page ? { kind: 'mantra' as const, page } : null;
}

// The exporter also renders the bare [slug] template; finalize-web removes that file.
export const loader = createStaticLoader((params) => data(String(params.slug)));

export async function generateMetadata(
  _request: unknown,
  params: Record<string, string | string[]>,
) {
  const slug = String(params.slug);
  return pageMetadata(`/library/mantras/${slug}`, (await data(slug))?.page.meta);
}

export default function Page() {
  return <MantraPage />;
}
