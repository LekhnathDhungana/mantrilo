import { createStaticLoader } from 'expo-router/server';
import MantraPage from '../../../../components/MantraPage';
import { pageMetadata } from '../../../../data/metadata';

// /library/mantras/deity/{deity}: every mantra filed under one deity, and the filtered list request.

const mantras = () => import('../../../../data/mantra-pages');

export async function generateStaticParams() {
  return (await mantras()).deityIds();
}

async function data(deity: string) {
  const page = (await mantras()).deityPage(deity);
  return page ? { kind: 'deity' as const, page } : null;
}

export const loader = createStaticLoader((params) => data(String(params.deity)));

export async function generateMetadata(
  _request: unknown,
  params: Record<string, string | string[]>,
) {
  const deity = String(params.deity);
  return pageMetadata(`/library/mantras/deity/${deity}`, (await data(deity))?.page.meta);
}

export default function Page() {
  return <MantraPage />;
}
