import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/library/index';
import { Arrow, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { CatalogBrowser } from './site/Catalog.web';
import { collectionRequest } from '../data/examples';
import { libraryItems } from '../data/library';
import { epicBooks } from '../../developer/src/data/epic-books';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';

function UpanishadsFeature() {
  const { t } = useI18n();
  return (
    <div className="mh-feature-card">
      <div>
        <p className="mh-eyebrow">{t('libraryPage.upanishads.eyebrow')}</p>
        <h3>{t('libraryPage.upanishads.title')}</h3>
        <p>
          <Rich text={t('libraryPage.upanishads.copy')} tags={{ code: <code /> }} />
        </p>
        <Link push className="mh-btn mh-btn-ghost" href="/library/books/upanishads">
          {t('libraryPage.upanishads.open')} <Arrow />
        </Link>
      </div>
      <CodePanel title="/v1/books" method="GET" code={collectionRequest('upanishads')} />
    </div>
  );
}

export default function LibraryPage() {
  const { books, mantras } = useLoaderData<typeof loader>();
  const { t, number } = useI18n();
  const records = number(mantras.catalog.roughly.records);
  const recordings = number(mantras.catalog.roughly.recordings);
  return (
    <SiteFrame path="/library">
      <PageHero
        crumb={t('meta./library.label')}
        eyebrow={t('footer.library')}
        title={t('libraryPage.title')}
        lede={t('libraryPage.lede', { records, books: number(books.length) })}
      />
      <section className="mh-section-sm" id="mantras" aria-labelledby="mantras-heading">
        <div className="mh-wrap">
          <h2 id="mantras-heading">{t('libraryPage.mantras.title')}</h2>
          <p>{t('libraryPage.mantras.copy', { records, recordings })}</p>
          <div className="mh-cards-3">
            {mantras.featured.map((mantra) => (
              <Link
                key={mantra.slug}
                href={mantra.path}
                className="mh-card mh-card-pad mh-card-link"
              >
                <h3>{mantra.title}</h3>
                <p>
                  {mantra.deity} ·{' '}
                  {t('common.verses', { count: mantra.verseCount, n: number(mantra.verseCount) })}
                  {mantra.hasAudio ? ` · ${t('library.types.Recording')}` : ''}
                </p>
              </Link>
            ))}
          </div>
          <h3>{t('libraryPage.mantras.byDeity')}</h3>
          <nav className="mh-chips" aria-label={t('libraryPage.mantras.byDeityLabel')}>
            {mantras.deities.map((deity) => (
              <Link key={deity.id} href={deity.path} className="mh-chip">
                {deity.name} · {number(deity.count)}
              </Link>
            ))}
          </nav>
          <p>
            <Link className="mh-btn mh-btn-ghost" href="/library/mantras">
              {t('libraryPage.mantras.all')} <Arrow />
            </Link>
          </p>
          <p>
            <Link href="/mantra-api">{t('meta./mantra-api.label')}</Link> ·{' '}
            <Link href="/sacred-audio-api">{t('meta./sacred-audio-api.label')}</Link> ·{' '}
            <Link href="/docs/guides/search-mantras">{t('libraryPage.mantras.build')}</Link>
          </p>
        </div>
      </section>
      <section className="mh-section-sm" id="books" aria-labelledby="books-heading">
        <div className="mh-wrap">
          <h2 id="books-heading">{t('nav.books')}</h2>
          <div className="mh-cards-2">
            {epicBooks.map(({ id, title, chapters }) => (
              <Link key={id} href={`/docs#epic-${id}`} className="mh-card mh-card-pad mh-card-link">
                <h3>{title}</h3>
                <p>
                  {t('docs.epics.chapters', { count: chapters, n: number(chapters) })} ·{' '}
                  {t('libraryPage.books.retelling')}
                </p>
                <span>
                  {t('libraryPage.books.liveKey')} <Arrow />
                </span>
              </Link>
            ))}
            {books.map((book) => (
              <Link key={book.slug} href={book.path} className="mh-card mh-card-pad mh-card-link">
                <h3>{book.title}</h3>
                <p>
                  {book.chapters > 1
                    ? `${t(`books.terms.${book.chapterTerm}`, { count: book.chapters, n: number(book.chapters) })} · `
                    : ''}
                  {t('common.verses', { count: book.verseCount, n: number(book.verseCount) })} ·{' '}
                  {t('libraryPage.books.languages')} ·{' '}
                  {book.sandbox ? t('libraryPage.books.sandbox') : t('libraryPage.books.live')}
                </p>
              </Link>
            ))}
          </div>
          <p>
            <Link href="/library/books/upanishads">{t('libraryPage.books.upanishads')}</Link> ·{' '}
            <Link href="/books-api">{t('meta./books-api.label')}</Link> ·{' '}
            <Link href="/docs/guides/book-reader">{t('meta./docs/guides/book-reader.label')}</Link>
          </p>
        </div>
      </section>
      <section className="mh-section-sm" aria-labelledby="catalog-heading">
        <div className="mh-wrap">
          <h2 id="catalog-heading">{t('libraryPage.catalog')}</h2>
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
