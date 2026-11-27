import BlogShell from '../components/BlogShell';
import { pageMetadata, type PageMeta } from '../data/metadata';

// /blog-shell: the site's header, footer and styles around an empty slot. The console service
// that renders www.mantrilo.com/blog (developer/server/blog.mjs) fetches this page and fills
// the slot, so blog pages match the rest of the site. It is never indexed.

const meta: PageMeta = {
  title: 'Blog Layout | Mantrilo',
  description:
    'The page layout Mantrilo blog articles are rendered into. Read the articles at mantrilo.com/blog.',
  label: 'Blog',
  indexable: false,
};

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/blog-shell', meta, params);
}

export default function Page() {
  return <BlogShell meta={meta} />;
}
