import { createStaticLoader } from 'expo-router/server';
import BookPage from '../../../../components/BookPage';
import { pageMetadata } from '../../../../data/metadata';

// /library/books/{book}: a chapter index for multi-chapter books, or the text itself (first part)
// for a book that is a single chapter. The book texts are read from books/ at export time; the
// module is imported inside these build-time functions so it stays out of the client bundle.

const books = () => import('../../../../data/book-pages');

export async function generateStaticParams() {
  return (await books()).bookParams().roots;
}

async function data(book: string) {
  const { bookOverview, textPage } = await books();
  const overview = bookOverview(book);
  if (overview) return { kind: 'overview' as const, overview };
  const page = textPage(book);
  return page ? { kind: 'text' as const, page } : null;
}

// The exporter also renders the bare [book] template; finalize-web removes that file.
export const loader = createStaticLoader((params) => data(String(params.book)));

export async function generateMetadata(
  _request: unknown,
  params: Record<string, string | string[]>,
) {
  const result = await data(String(params.book));
  const meta = result?.kind === 'overview' ? result.overview.meta : result?.page.meta;
  return pageMetadata(`/library/books/${String(params.book)}`, meta, params);
}

export default function Page() {
  return <BookPage />;
}
