import type { PageMeta } from '../data/metadata';
import { SiteFrame } from './site/Chrome.web';

// The blog server replaces the slot with the article (see src/app/blog-shell.tsx).
export default function BlogShell({ meta }: { meta: PageMeta }) {
  return (
    <SiteFrame path="/blog-shell" meta={meta}>
      <div data-blog-slot="" />
    </SiteFrame>
  );
}
