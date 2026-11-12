import { Link } from 'expo-router';
import { Arrow, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { CatalogBrowser } from './site/Catalog.web';
import { collectionRequest } from '../data/examples';
import { astrologyItems, libraryItems } from '../data/library';

function UpanishadsFeature() {
  return (
    <div className="mh-feature-card">
      <div>
        <p className="mh-eyebrow">Collections</p>
        <h3>The Upanishads, callable directly</h3>
        <p>
          Filter the book catalog by collection and page through it with <code>limit</code> and{' '}
          <code>cursor</code>. Every book links to its chapters and verses.
        </p>
        <Link
          push
          className="mh-btn mh-btn-ghost"
          href={{ pathname: '/library', params: { area: 'books', item: 'collection-upanishads' } }}
        >
          Open the collection <Arrow />
        </Link>
      </div>
      <CodePanel title="/v1/books" method="GET" code={collectionRequest('upanishads')} />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <SiteFrame path="/library">
      <PageHero
        crumb="Library"
        eyebrow="Content library"
        title="Everything the API returns, in one place."
        lede={`Search mantras, recordings, scripture collections and ${astrologyItems.length} astrology capabilities. Open any item for its request, a representative response and the guide that uses it.`}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <CatalogBrowser
            pathname="/library"
            items={libraryItems}
            intro={(area) => (area === 'books' ? <UpanishadsFeature /> : null)}
          />
        </div>
      </section>
    </SiteFrame>
  );
}
