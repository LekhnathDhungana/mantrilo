import { createStaticLoader } from 'expo-router/server';
import BookPage from '../../../../components/BookPage';
import { pageMetadata } from '../../../../data/metadata';

// /library/books/{book}/chapter-{n}, plus /…/chapter-{n}-part-{p} or /…/part-{p} for long texts.
// The book module is imported inside these build-time functions so it stays out of the client.

const books = () => import('../../../../data/book-pages');

export async function generateStaticParams() {
  return (await books()).bookParams().sections;
}

async function data(book: string, section: string) {
  const page = (await books()).textPage(book, section);
  return page ? { kind: 'text' as const, page } : null;
}

export const loader = createStaticLoader((params) =>
  data(String(params.book), String(params.section)),
);

export async function generateMetadata(
  _request: unknown,
  params: Record<string, string | string[]>,
) {
  const path = `/library/books/${String(params.book)}/${String(params.section)}`;
  return pageMetadata(path, (await data(String(params.book), String(params.section)))?.page.meta);
}

export default function Page() {
  return <BookPage />;
}
