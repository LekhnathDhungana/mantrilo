import { Link, useLoaderData } from 'expo-router';
import type { loader } from '../app/library/index';
import { Arrow, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { CatalogBrowser } from './site/Catalog.web';
import { collectionRequest } from '../data/examples';
import { libraryItems } from '../data/library';
import { epicBooks } from '../../developer/src/data/epic-books';

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
        <Link push className="mh-btn mh-btn-ghost" href="/library/books/upanishads">
          Open the collection <Arrow />
        </Link>
      </div>
      <CodePanel title="/v1/books" method="GET" code={collectionRequest('upanishads')} />
    </div>
  );
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function LibraryPage() {
  const { books, mantras } = useLoaderData<typeof loader>();
  return (
    <SiteFrame path="/library">
      <PageHero
        crumb="Library"
        eyebrow="Content library"
        title="Explore Mantrilo’s Content Library"
        lede={`${mantras.total} mantras and stotras, ${books.length} Sanskrit books verse by verse, and the English epics. Every page shows the API request behind it.`}
      />
      <section className="mh-section-sm" id="mantras" aria-labelledby="mantras-heading">
        <div className="mh-wrap">
          <h2 id="mantras-heading">Mantras & stotras</h2>
          <p>
            {mantras.total} hymns in Devanagari and transliteration, {mantras.audio} with
            recordings. Each page has the text, the request and the exact JSON response.
          </p>
          <div className="mh-cards-3">
            {mantras.featured.map((mantra) => (
              <Link
                key={mantra.slug}
                href={mantra.path}
                className="mh-card mh-card-pad mh-card-link"
              >
                <h3>{mantra.title}</h3>
                <p>
                  {mantra.deity} · {plural(mantra.verseCount, 'verse')}
                  {mantra.hasAudio ? ' · Recording' : ''}
                </p>
              </Link>
            ))}
          </div>
          <h3>By deity</h3>
          <nav className="mh-chips" aria-label="Mantras by deity">
            {mantras.deities.map((deity) => (
              <Link key={deity.id} href={deity.path} className="mh-chip">
                {deity.name} · {deity.count}
              </Link>
            ))}
          </nav>
          <p>
            <Link className="mh-btn mh-btn-ghost" href="/library/mantras">
              All {mantras.total} mantras <Arrow />
            </Link>
          </p>
          <p>
            <Link href="/mantra-api">Mantra API</Link> ·{' '}
            <Link href="/sacred-audio-api">Sacred Audio API</Link> ·{' '}
            <Link href="/docs/guides/search-mantras">Build a searchable library</Link>
          </p>
        </div>
      </section>
      <section className="mh-section-sm" id="books" aria-labelledby="books-heading">
        <div className="mh-wrap">
          <h2 id="books-heading">Books</h2>
          <div className="mh-cards-2">
            {epicBooks.map(({ id, title, chapters }) => (
              <Link key={id} href={`/docs#epic-${id}`} className="mh-card mh-card-pad mh-card-link">
                <h3>{title}</h3>
                <p>{chapters} chapters · English prose retelling</p>
                <span>
                  Read with a live API key <Arrow />
                </span>
              </Link>
            ))}
            {books.map((book) => (
              <Link key={book.slug} href={book.path} className="mh-card mh-card-pad mh-card-link">
                <h3>{book.title}</h3>
                <p>
                  {book.chapters > 1
                    ? `${plural(book.chapters, book.chapterTerm.toLowerCase())} · `
                    : ''}
                  {book.verseCount} verses · Sanskrit and English ·{' '}
                  {book.sandbox ? 'Sandbox sample' : 'Live catalog'}
                </p>
              </Link>
            ))}
          </div>
          <p>
            <Link href="/library/books/upanishads">Browse the Upanishads</Link> ·{' '}
            <Link href="/books-api">Books API</Link> ·{' '}
            <Link href="/docs/guides/book-reader">Build a book reader</Link>
          </p>
        </div>
      </section>
      <section className="mh-section-sm" aria-labelledby="catalog-heading">
        <div className="mh-wrap">
          <h2 id="catalog-heading">Browse the API catalog</h2>
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
