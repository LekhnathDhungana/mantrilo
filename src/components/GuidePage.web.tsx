import { GuideDocument } from './DocsPage.web';
import { findGuide } from './site/Guides.web';
import { publicGuide } from '../data/public-guides';
import NotFound from './NotFound.web';

export default function GuidePage({ slug }: { slug: string }) {
  const entry = publicGuide(slug);
  const guide = entry && findGuide(entry.id);
  return guide ? <GuideDocument guide={guide} path={`/docs/guides/${slug}`} /> : <NotFound />;
}
