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
  const { books } = useLoaderData<typeof loader>();
  return (
    <SiteFrame path="/library">
      <PageHero
        crumb="Library"
        eyebrow="Content library"
        title="Explore Mantrilo’s Content Library"
        lede="Read Sanskrit books verse by verse with English, explore the English epic retellings and mantras, and see the API request behind each one."
      />
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
      <section className="mh-section-sm" aria-labelledby="feature-heading">
        <div className="mh-wrap">
          <h2 id="feature-heading">Mantra preview</h2>
          <p>
            <Link href="/library/mantras/aham-vaishvanaro-bhutva">
              Aham Vaishvanaro Bhutva · Bhagavad Gita 15.14
            </Link>
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
