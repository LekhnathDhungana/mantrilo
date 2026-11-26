import { useState, type CSSProperties } from 'react';
import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/library/books/index';
import type { BookListing } from '../data/book-pages';
import { collections } from '../data/examples';
import { epicBooks } from '../../developer/src/data/epic-books';
import { Arrow, KeyButton, SiteFrame } from './site/Chrome.web';
import { CodePanel, JsonCode } from './site/Code.web';
import { Checks, EndpointPill, Ribbon, Ring, Stats } from './site/Shlokam.web';
import { useI18n, type I18n } from '../i18n';
import { Rich } from '../i18n/Rich';

// /library/books: the bookshelf. Every book in the catalog on its collection's shelf, each with
// its API id, then what a chapter response looks like and how a reader pages through it.

const SPINES: Record<string, string> = {
  upanishads: '#7b8cff',
  'bhagavad-gita': '#e8b04b',
  epics: '#f08a6b',
  'advaita-vedanta-prakarana-granthas': '#3fbfa8',
  yoga: '#8bcf6a',
  vedanta: '#c08af0',
};

const SANSKRIT: Record<string, string> = {
  upanishads: 'उपनिषद्',
  'bhagavad-gita': 'भगवद्गीता',
  epics: 'इतिहास',
  'advaita-vedanta-prakarana-granthas': 'अद्वैत वेदान्त',
  yoga: 'योग',
  vedanta: 'वेदान्त',
  'isha-upanishad': 'ईशावास्योपनिषद्',
  'kena-upanishad': 'केनोपनिषद्',
  'katha-upanishad': 'कठोपनिषद्',
  'prashna-upanishad': 'प्रश्नोपनिषद्',
  'mundaka-upanishad': 'मुण्डकोपनिषद्',
  'mandukya-upanishad': 'माण्डूक्योपनिषद्',
  'taittiriya-upanishad': 'तैत्तिरीयोपनिषद्',
  'chandogya-upanishad': 'छान्दोग्योपनिषद्',
  'kaivalya-upanishad': 'कैवल्योपनिषद्',
  'bhagavad-gita-book': 'श्रीमद्भगवद्गीता',
  'yoga-sutras': 'पातञ्जलयोगसूत्राणि',
  'brahma-sutras': 'ब्रह्मसूत्राणि',
  'ashtavakra-gita': 'अष्टावक्रगीता',
  'avadhuta-gita': 'अवधूतगीता',
  vivekachudamani: 'विवेकचूडामणिः',
  atmabodha: 'आत्मबोधः',
  tattvabodha: 'तत्त्वबोधः',
  aparokshanubhuti: 'अपरोक्षानुभूतिः',
  'upadesa-saaram': 'उपदेशसारम्',
  ramayana: 'रामायणम्',
  mahabharata: 'महाभारतम्',
};
const bookSanskrit = (slug: string) =>
  SANSKRIT[slug === 'bhagavad-gita' ? 'bhagavad-gita-book' : slug] ?? '';

const ORDER = [
  'upanishads',
  'bhagavad-gita',
  'epics',
  'yoga',
  'vedanta',
  'advaita-vedanta-prakarana-granthas',
];

type Volume = {
  key: string;
  href: string;
  title: string;
  sanskrit: string;
  sub: string;
  count: string;
  meta: string;
  id: string | null;
  sandbox: boolean;
  /** Share of the longest text on the shelf page, for the bar under each cover. */
  size: number;
};

const author = (text: string) => {
  const name = text.replace(/^(attributed in the catalog to|traditionally attributed to)\s+/i, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const parts = ({ t, number }: I18n, book: BookListing) =>
  book.chapters > 1
    ? t(`books.terms.${book.chapterTerm}`, { count: book.chapters, n: number(book.chapters) })
    : t('shelf.oneText');

function Cover({ volume, spine, index }: { volume: Volume; spine: string; index?: string }) {
  return (
    <div className="mx-vol mx-dots" style={{ '--spine': spine } as CSSProperties}>
      <span className="mx-vol-id">{index ?? volume.id ?? volume.key}</span>
      <span
        className="mx-vol-sa"
        lang="sa-Deva"
        style={volume.sanskrit.length > 15 ? { fontSize: 16 } : undefined}
      >
        {volume.sanskrit}
      </span>
      <span className="mx-vol-sub">{volume.sub}</span>
      <span className="mx-vol-bar" aria-hidden="true">
        <span style={{ width: `${volume.size}%` }} />
      </span>
      <span className="mx-vol-count">{volume.count}</span>
    </div>
  );
}

const readerCode = `let offset = 0;
do {
  const res = await fetch(
    \`\${process.env.MANTRILO_API_URL}/v1/books/bhagavadGita/chapters/2?offset=\${offset}\`,
    { headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` } },
  );
  const { data } = await res.json();
  render(data.verses);
  offset = data.nextOffset;
} while (offset != null);`;

export default function BooksPage() {
  const { books, gita, isha } = useLoaderData<typeof loader>();
  const [view, setView] = useState<'reader' | 'json'>('reader');
  const [roman, setRoman] = useState(true);
  const i18n = useI18n();
  const { t, number } = i18n;

  const longest = Math.max(...books.map((book) => book.verseCount));
  const size = (n: number, max: number) =>
    Math.max(6, Math.round((Math.log(n + 1) / Math.log(max + 1)) * 100));
  const volume = (book: BookListing): Volume => ({
    key: book.slug,
    href: book.path,
    title: book.title,
    sanskrit: bookSanskrit(book.slug),
    sub: parts(i18n, book),
    count: t('common.verses', { count: book.verseCount, n: number(book.verseCount) }),
    meta: author(book.author),
    id: book.apiId,
    sandbox: book.sandbox,
    size: size(book.verseCount, longest),
  });
  const longestEpic = Math.max(...epicBooks.map((epic) => epic.chapters));
  const epics: Volume[] = epicBooks.map((epic) => ({
    key: epic.id,
    href: `/docs#epic-${epic.id}`,
    title: epic.title,
    sanskrit: SANSKRIT[epic.id] ?? '',
    sub: t('libraryPage.books.retelling'),
    count: t('docs.epics.chapters', { count: epic.chapters, n: number(epic.chapters) }),
    meta: t('shelf.sourceChapters'),
    id: null,
    sandbox: false,
    size: size(epic.chapters, longestEpic),
  }));
  const named = new Map(collections.map((entry) => [entry.id, entry]));
  const shelves = ORDER.map((id) => {
    const entry = named.get(id);
    const volumes =
      id === 'epics'
        ? epics
        : books.filter((book) => book.collection === id).map((book) => volume(book));
    return {
      id,
      name: id === 'epics' ? t('shelf.epics') : (entry?.name ?? id),
      note:
        id === 'epics'
          ? t('shelf.epicsNote')
          : t(`library.collections.${id}`) || (entry?.note ?? ''),
      collection: id === 'epics' ? null : id,
      volumes,
    };
  }).filter((shelf) => shelf.volumes.length > 0);
  type Shelf = (typeof shelves)[number];
  // Shelves with one or two books share a row, so a single volume doesn't sit alone.
  const rows: Shelf[][] = [];
  for (const shelf of shelves) {
    const last = rows.at(-1);
    if (shelf.volumes.length <= 2 && last && last[0].volumes.length <= 2) last.push(shelf);
    else rows.push([shelf]);
  }

  const bySlug = new Map(books.map((book) => [book.slug, book]));
  const hero = ['katha-upanishad', 'yoga-sutras', 'bhagavad-gita']
    .map((slug) => bySlug.get(slug))
    .filter((book): book is BookListing => Boolean(book))
    .map((book) => volume(book));
  const verses = books.reduce((sum, book) => sum + book.verseCount, 0);
  const epicChapters = epicBooks.reduce((sum, epic) => sum + epic.chapters, 0);
  const total = books.length + epicBooks.length;
  const ishaJson = isha && {
    number: Number(isha.key) || isha.key,
    sanskrit: isha.sanskrit,
    transliteration: isha.transliteration,
    translation: null,
  };

  return (
    <SiteFrame path="/library/books">
      <section className="mx-hero">
        <Ribbon />
        <div className="mh-wrap mx-hero-grid">
          <div>
            <nav className="mh-crumbs mx-rise" aria-label={t('chrome.breadcrumb')}>
              <Link href="/">{t('chrome.crumbHome')}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/library">{t('meta./library.label')}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{t('nav.books')}</span>
            </nav>
            <div className="mx-chips mx-rise mx-d1">
              <Link href="/books-api" className="mx-chip">
                <span lang="sa-Deva" className="mh-deva">
                  ग्रन्थ
                </span>
                {t('meta./books-api.label')}
              </Link>
            </div>
            <h1 className="mx-rise mx-d2">{t('shelf.title')}</h1>
            <p className="mx-lede mx-rise mx-d3">{t('shelf.lede')}</p>
            <div className="mx-actions mx-rise mx-d4">
              <Link href="/library/books/bhagavad-gita" className="mh-btn mh-btn-primary">
                {t('shelf.startGita')} <Arrow />
              </Link>
              <a href="#shelves" className="mh-btn mh-btn-ghost">
                {t('shelf.browseAll', { count: total, n: number(total) })}
              </a>
            </div>
            <Checks
              className="mx-rise mx-d5"
              items={[t('shelf.checkSandbox'), t('shelf.checkDeva')]}
            />
            <Stats
              items={[
                [total, t('shelf.stats.books')],
                [verses, t('shelf.stats.verses')],
                [epicChapters, t('shelf.stats.epicChapters')],
                [shelves.length, t('shelf.stats.collections')],
              ]}
            />
          </div>
          <div className="mx-vols mx-rise mx-d3" aria-hidden="true">
            {hero.map((entry) => (
              <div key={entry.key}>
                <Cover
                  volume={entry}
                  spine={SPINES[bySlug.get(entry.key)?.collection ?? ''] ?? SPINES.upanishads}
                />
              </div>
            ))}
            {gita && (
              <div className="mx-verse-chip">
                <div>
                  <span>GET …/bhagavadGita/chapters/2</span>
                  <span>{gita.key}</span>
                </div>
                <p lang="sa-Deva">{gita.sanskrit.split('\n')[0]}</p>
                <p lang="sa-Latn">{gita.transliteration.split('\n')[0]}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-section" id="shelves" style={{ scrollMarginTop: 84 }}>
        <div className="mh-wrap">
          <div data-reveal>
            <p className="mx-kicker">{t('shelf.shelves.kicker')}</p>
            <h2 className="mx-h2">{t('shelf.shelves.title')}</h2>
            <p className="mx-sub">{t('shelf.shelves.copy')}</p>
            <EndpointPill path="/v1/books?collection=upanishads&limit=3" />
          </div>
          <nav
            className="mx-chips"
            aria-label={t('libraryPage.upanishads.eyebrow')}
            style={{ marginTop: 22 }}
          >
            {shelves.map((shelf) => (
              <a key={shelf.id} href={`#shelf-${shelf.id}`} className="mx-chip">
                {shelf.name} <small>{number(shelf.volumes.length)}</small>
              </a>
            ))}
          </nav>

          {rows.map((row) => (
            <div key={row[0].id} className={row.length > 1 ? 'mx-shelf-row' : undefined}>
              {row.map((shelf) => (
                <section
                  key={shelf.id}
                  id={`shelf-${shelf.id}`}
                  className="mx-shelf"
                  style={{ '--count': shelf.volumes.length } as CSSProperties}
                  aria-labelledby={`shelf-${shelf.id}-title`}
                >
                  <div className="mx-head" data-reveal>
                    <div>
                      <h3 id={`shelf-${shelf.id}-title`}>
                        <span lang="sa-Deva">{SANSKRIT[shelf.id]}</span>
                        {shelf.name}
                      </h3>
                      <p className="mx-shelf-note">{shelf.note}</p>
                    </div>
                    {shelf.collection ? (
                      <code className="mx-vol-id">?collection={shelf.collection}</code>
                    ) : (
                      <span className="mx-badge">{t('shelf.liveKey')}</span>
                    )}
                  </div>
                  <div className="mx-books">
                    {shelf.volumes.map((entry, i) => (
                      <Link key={entry.key} href={entry.href} className="mx-book" data-reveal>
                        <Cover
                          volume={entry}
                          spine={SPINES[shelf.id]}
                          index={t('shelf.volume', {
                            n: String(i + 1).padStart(2, '0'),
                            total: String(shelf.volumes.length).padStart(2, '0'),
                          })}
                        />
                        <h4>{entry.title}</h4>
                        <p>{entry.meta}</p>
                        <div className="mx-book-tags">
                          {entry.id && <code>{entry.id}</code>}
                          <span className={entry.sandbox ? 'mx-badge mx-badge-ok' : 'mx-badge'}>
                            {entry.sandbox ? t('plans.sandbox') : t('shelf.liveKey')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))}
        </div>
      </section>

      {isha && ishaJson && (
        <section className="mx-section">
          <div className="mh-wrap mx-demo-grid">
            <div data-reveal>
              <p className="mx-kicker">{t('shelf.inside.kicker')}</p>
              <h2 className="mx-h2">{t('shelf.inside.title')}</h2>
              <p className="mx-sub">{t('shelf.inside.copy')}</p>
              <ul className="mx-points">
                {(
                  [
                    ['अ', 'deva'],
                    ['ā', 'translit'],
                    ['30', 'paging'],
                    ['null', 'nulls'],
                  ] as const
                ).map(([glyph, key]) => (
                  <li key={key}>
                    <span aria-hidden="true">{glyph}</span>
                    <div>
                      <b>{t(`shelf.inside.${key}.title`)}</b>
                      <p>
                        <Rich text={t(`shelf.inside.${key}.copy`)} tags={{ code: <code /> }} />
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mx-demo" data-reveal>
              <div className="mx-demo-bar">
                <div>
                  <b>Isha Upanishad</b>
                  <small>ishaUpanishad · {t('shelf.verse', { key: isha.key })}</small>
                </div>
                <div>
                  <div className="mx-seg" role="group" aria-label={t('shelf.view')}>
                    <button
                      type="button"
                      aria-pressed={view === 'reader'}
                      onClick={() => setView('reader')}
                    >
                      {t('shelf.rendered')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={view === 'json'}
                      onClick={() => setView('json')}
                    >
                      response.json
                    </button>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={roman}
                    className="mx-switch"
                    onClick={() => setRoman(!roman)}
                  >
                    <i aria-hidden="true" />
                    IAST
                  </button>
                </div>
              </div>
              <div className="mx-demo-body">
                {view === 'reader' ? (
                  <div key="reader">
                    <p className="mx-verse-sa" lang="sa-Deva">
                      {isha.sanskrit}
                    </p>
                    {roman && (
                      <p className="mx-verse-tr" lang="sa-Latn" style={{ marginTop: 14 }}>
                        {isha.transliteration}
                      </p>
                    )}
                    <p className="mx-null">
                      <code>translation: null</code> · {t('shelf.nullNote')}
                    </p>
                  </div>
                ) : (
                  <div key="json" className="mx-demo-json">
                    <pre className="mh-pre" tabIndex={0}>
                      <JsonCode
                        value={roman ? ishaJson : { ...ishaJson, transliteration: undefined }}
                      />
                    </pre>
                  </div>
                )}
              </div>
              <div className="mx-demo-foot">
                <b>GET</b> /v1/books/ishaUpanishad/chapters/1
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-section">
        <div className="mh-wrap">
          <div data-reveal>
            <p className="mx-kicker">{t('shelf.flow.kicker')}</p>
            <h2 className="mx-h2">{t('shelf.flow.title')}</h2>
          </div>
          <div className="mx-flow">
            {[
              { key: 'list', path: '/v1/books?collection=upanishads' },
              { key: 'book', path: '/v1/books/bhagavadGita' },
              { key: 'chapter', path: '/v1/books/bhagavadGita/chapters/2' },
            ].map((step, i, all) => (
              <div key={step.key}>
                <div className="mx-step" data-reveal>
                  <div className="mx-step-head">
                    <i>{number(i + 1)}</i>
                    <b>{t(`shelf.flow.${step.key}.title`)}</b>
                  </div>
                  <p>{t(`shelf.flow.${step.key}.copy`)}</p>
                  <div className="mx-mono">
                    <b>GET</b> {step.path}
                  </div>
                </div>
                {i < all.length - 1 && <span className="mx-link" aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }} data-reveal>
            <CodePanel title={`reader.mjs · ${t('shelf.flow.code')}`} code={readerCode} lang="js" />
          </div>
          <p className="mx-links">
            <Link href="/docs/guides/book-reader">{t('meta./docs/guides/book-reader.label')}</Link>{' '}
            · <Link href="/docs#get-chapter">{t('shelf.flow.reference')}</Link> ·{' '}
            <Link href="/books-api">{t('meta./books-api.label')}</Link> ·{' '}
            <Link href="/library/books/upanishads">{t('shelf.flow.upanishads')}</Link>
          </p>
        </div>
      </section>

      <section className="mx-section" style={{ paddingBottom: 96 }}>
        <div className="mh-wrap">
          <div className="mx-closing" data-reveal>
            <div>
              <p className="mx-kicker">{t('plans.startFree')}</p>
              <h2 className="mx-h2">{t('shelf.closing.title')}</h2>
              <p>{t('shelf.closing.copy')}</p>
              <div className="mx-actions">
                <KeyButton />
                <Link href="/docs/guides/book-reader" className="mh-btn mh-btn-ghost">
                  {t('shelf.closing.guide')}
                </Link>
              </div>
            </div>
            <Ring />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
