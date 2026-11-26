import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useLoaderData } from 'expo-router';
import type { loader } from '../app/library/books/index';
import type { BookListing } from '../data/book-pages';
import { collections } from '../data/examples';
import { epicBooks } from '../../developer/src/data/epic-books';
import { Arrow, KeyButton, SiteFrame } from './site/Chrome.web';
import { CodePanel, JsonCode } from './site/Code.web';
import { Checks, EndpointPill, Ribbon, Ring, plural } from './site/Shlokam.web';

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

const parts = (book: BookListing) =>
  book.chapters > 1 ? plural(book.chapters, book.chapterTerm.toLowerCase()) : 'One text';

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

function Stats({ items }: { items: [number, string][] }) {
  const [progress, setProgress] = useState(1);
  const [counting, setCounting] = useState(false);
  // The exported HTML holds the final numbers; once the page runs they count up from zero.
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let start = 0;
    const step = (now: number) => {
      setCounting(true);
      if (still) return;
      start ||= now;
      const t = Math.min(1, (now - start) / 1600);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className={counting ? 'mx-stats mx-rise mx-d6 is-counting' : 'mx-stats mx-rise mx-d6'}>
      {items.map(([value, label]) => (
        <p key={label}>
          <b>{Math.round(value * progress).toLocaleString('en-US')}</b>
          <span>{label}</span>
        </p>
      ))}
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

  const longest = Math.max(...books.map((book) => book.verseCount));
  const size = (n: number, max: number) =>
    Math.max(6, Math.round((Math.log(n + 1) / Math.log(max + 1)) * 100));
  const volume = (book: BookListing): Volume => ({
    key: book.slug,
    href: book.path,
    title: book.title,
    sanskrit: bookSanskrit(book.slug),
    sub: parts(book),
    count: plural(book.verseCount, 'verse'),
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
    sub: 'English prose retelling',
    count: plural(epic.chapters, 'chapter'),
    meta: 'Chapters with a source reference',
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
      name: id === 'epics' ? 'Itihasa (epics)' : (entry?.name ?? id),
      note:
        id === 'epics'
          ? 'English retellings of the Ramayana and Mahabharata, chapter by chapter.'
          : (entry?.note ?? ''),
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
            <nav className="mh-crumbs mx-rise" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/library">Library</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Books</span>
            </nav>
            <div className="mx-chips mx-rise mx-d1">
              <Link href="/books-api" className="mx-chip">
                <span lang="sa-Deva" className="mh-deva">
                  ग्रन्थ
                </span>
                Books API
              </Link>
            </div>
            <h1 className="mx-rise mx-d2">Scripture, served verse by verse.</h1>
            <p className="mx-lede mx-rise mx-d3">
              The Bhagavad Gita, the Upanishads, the Advaita classics, the sutras and the epics, as
              JSON your reader lays out. Every book has a stable id and comes back chapter by
              chapter in Devanagari with transliteration.
            </p>
            <div className="mx-actions mx-rise mx-d4">
              <Link href="/library/books/bhagavad-gita" className="mh-btn mh-btn-primary">
                Start with the Gita <Arrow />
              </Link>
              <a href="#shelves" className="mh-btn mh-btn-ghost">
                Browse all {total} books
              </a>
            </div>
            <Checks
              className="mx-rise mx-d5"
              items={[
                'Gita and Isha Upanishad on every sandbox key',
                'Devanagari with transliteration',
              ]}
            />
            <Stats
              items={[
                [total, 'books'],
                [verses, 'Sanskrit verses'],
                [epicChapters, 'epic chapters'],
                [shelves.length, 'collections'],
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
            <p className="mx-kicker">The library</p>
            <h2 className="mx-h2">From the Upanishads to the epics.</h2>
            <p className="mx-sub">
              Grouped by collection. List any shelf with one request and open a book by its id.
            </p>
            <EndpointPill path="/v1/books?collection=upanishads&limit=3" />
          </div>
          <nav className="mx-chips" aria-label="Collections" style={{ marginTop: 22 }}>
            {shelves.map((shelf) => (
              <a key={shelf.id} href={`#shelf-${shelf.id}`} className="mx-chip">
                {shelf.name} <small>{shelf.volumes.length}</small>
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
                      <span className="mx-badge">Live key</span>
                    )}
                  </div>
                  <div className="mx-books">
                    {shelf.volumes.map((entry, i) => (
                      <Link key={entry.key} href={entry.href} className="mx-book" data-reveal>
                        <Cover
                          volume={entry}
                          spine={SPINES[shelf.id]}
                          index={`vol ${String(i + 1).padStart(2, '0')} / ${String(shelf.volumes.length).padStart(2, '0')}`}
                        />
                        <h4>{entry.title}</h4>
                        <p>{entry.meta}</p>
                        <div className="mx-book-tags">
                          {entry.id && <code>{entry.id}</code>}
                          <span className={entry.sandbox ? 'mx-badge mx-badge-ok' : 'mx-badge'}>
                            {entry.sandbox ? 'Sandbox' : 'Live key'}
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
              <p className="mx-kicker">Inside the response</p>
              <h2 className="mx-h2">Read the source, not a summary of it.</h2>
              <p className="mx-sub">
                Every book comes back as structured verses, so your reader decides the layout. Try
                the switches on this verse.
              </p>
              <ul className="mx-points">
                <li>
                  <span aria-hidden="true">अ</span>
                  <div>
                    <b>Devanagari as sourced</b>
                    <p>
                      <code>sanskrit</code> keeps the original text and its line breaks.
                    </p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">ā</span>
                  <div>
                    <b>Transliteration on every verse</b>
                    <p>
                      <code>transliteration</code> gives readers a way to chant along.
                    </p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">30</span>
                  <div>
                    <b>Chapters that page</b>
                    <p>
                      Up to 30 verses per call. Pass <code>nextOffset</code> back as{' '}
                      <code>offset</code> for the rest.
                    </p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">null</span>
                  <div>
                    <b>Nulls you can design for</b>
                    <p>
                      Any verse field can be null, and <code>translation</code> is not distributed,
                      so leave out what is missing.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="mx-demo" data-reveal>
              <div className="mx-demo-bar">
                <div>
                  <b>Isha Upanishad</b>
                  <small>ishaUpanishad · verse {isha.key}</small>
                </div>
                <div>
                  <div className="mx-seg" role="group" aria-label="View">
                    <button
                      type="button"
                      aria-pressed={view === 'reader'}
                      onClick={() => setView('reader')}
                    >
                      Rendered
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
                      <code>translation: null</code> · your app shows its own translation, or none.
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
            <p className="mx-kicker">How an integration flows</p>
            <h2 className="mx-h2">Collection, book, chapter. Three calls.</h2>
          </div>
          <div className="mx-flow">
            {[
              {
                title: 'List a collection',
                copy: 'Titles, authors and verse counts, with a cursor for the next page.',
                path: '/v1/books?collection=upanishads',
              },
              {
                title: 'Open a book',
                copy: 'The book record lists every chapter with its number and verse count.',
                path: '/v1/books/bhagavadGita',
              },
              {
                title: 'Read a chapter',
                copy: 'Up to 30 verses per call, in order, ready for your reader.',
                path: '/v1/books/bhagavadGita/chapters/2',
              },
            ].map((step, i, all) => (
              <div key={step.title}>
                <div className="mx-step" data-reveal>
                  <div className="mx-step-head">
                    <i>{i + 1}</i>
                    <b>{step.title}</b>
                  </div>
                  <p>{step.copy}</p>
                  <div className="mx-mono">
                    <b>GET</b> {step.path}
                  </div>
                </div>
                {i < all.length - 1 && <span className="mx-link" aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }} data-reveal>
            <CodePanel title="reader.mjs · page through a chapter" code={readerCode} lang="js" />
          </div>
          <p className="mx-links">
            <Link href="/docs/guides/book-reader">Build a book reader</Link> ·{' '}
            <Link href="/docs#get-chapter">Chapter reference</Link> ·{' '}
            <Link href="/books-api">Books API</Link> ·{' '}
            <Link href="/library/books/upanishads">Upanishads collection</Link>
          </p>
        </div>
      </section>

      <section className="mx-section" style={{ paddingBottom: 96 }}>
        <div className="mh-wrap">
          <div className="mx-closing" data-reveal>
            <div>
              <p className="mx-kicker">Start free</p>
              <h2 className="mx-h2">Start with the Gita in the sandbox.</h2>
              <p>
                The Bhagavad Gita and the Isha Upanishad are open on every sandbox key. A live key
                reads the full catalog.
              </p>
              <div className="mx-actions">
                <KeyButton />
                <Link href="/docs/guides/book-reader" className="mh-btn mh-btn-ghost">
                  Book reader guide
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
