import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useConsole } from '../Session.web';
import { api } from '../../lib/api';
import { Badge, CopyButton, Empty, ErrorNotice, Loading, PageTitle, useLoad } from '../ui.web';
import AstrologyLibrary from './AstrologyLibrary.web';
import { astrologyGuides } from '../../data/integrations';

type Kind = 'mantras' | 'books';
type LibraryTab = 'all' | 'mantras' | 'audio' | 'books' | 'astrology';
type Summary = {
  id: string;
  title: string | null;
  description: string | null;
  source?: string | null;
  category?: string | null;
  deity?: { id: string; name: string | null } | null;
  verseCount?: number | null;
  audio?: { href: string } | null;
  author?: string | null;
  subcategory?: string | null;
};
type Verse = {
  number: number | null;
  title?: string | null;
  sanskrit: string | null;
  transliteration: string | null;
  translation: string | null;
  translator?: string | null;
  wordMeanings?: { word: string | null; meaning: string | null }[];
  wordMeaning?: string | null;
  commentary?: string | null;
};
type Detail = Summary & {
  verses?: Verse[];
};
type Page = { data: Summary[]; nextCursor: string | null };
type Chapter = {
  number: number;
  title: string | null;
  description: string | null;
  verseCount: number | null;
};
type Book = Summary & { chapters: Chapter[]; preview: boolean };
type ChapterPage = Chapter & { verses: Verse[]; nextOffset: number | null };

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mantras', label: 'Mantras' },
  { id: 'audio', label: 'Audio' },
  { id: 'books', label: 'Books' },
  { id: 'astrology', label: 'Astrology' },
];
// Book collections are catalog subcategories; the id is what ?collection= takes.
const COLLECTIONS = [
  ['', 'All collections'],
  ['upanishads', 'Upanishads'],
  ['bhagavad-gita', 'Bhagavad Gita'],
  ['advaita-vedanta-prakarana-granthas', 'Advaita Vedanta & Prakarana Granthas'],
  ['vedanta', 'Vedanta'],
  ['yoga', 'Yoga'],
];
const kindOf = (tab: LibraryTab): Kind => (tab === 'books' ? 'books' : 'mantras');
const matches = (record: Summary, q: string) =>
  !q ||
  [record.title, record.id, record.description, record.deity?.name, record.subcategory]
    .join(' ')
    .toLowerCase()
    .includes(q.toLowerCase());
const astrologyRows = astrologyGuides();
const VALID_ID = /^[\w-]{1,200}$/;
const VALID_DEITY = /^[\w .-]{1,60}$/;
const isTab = (value: unknown): value is LibraryTab => TABS.some((tab) => tab.id === value);
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function Library() {
  const { session } = useConsole();
  const params = useLocalSearchParams<{
    type?: string;
    deity?: string;
    item?: string;
    q?: string;
    collection?: string;
    from?: string;
  }>();
  const requestedTab = one(params.type);
  const type = isTab(requestedTab) ? requestedTab : 'all',
    kind = kindOf(type),
    deity = type === 'mantras' || type === 'audio' ? (one(params.deity) ?? '').trim() : '',
    collection = type === 'books' ? (one(params.collection) ?? '') : '',
    q = one(params.q) ?? '',
    from = one(params.from) === 'all' ? 'all' : '',
    item = one(params.item) ?? '';
  const [search, setSearch] = useState(q);
  // Results stay mounted while an item is open, so returning keeps loaded pages and position.
  const scroll = useRef(0);
  useEffect(() => {
    if (!item) window.scrollTo(0, scroll.current);
    else window.scrollTo(0, 0);
  }, [item]);
  if (!session) return null;
  const update = (next: {
    type?: LibraryTab;
    deity?: string;
    item?: string;
    collection?: string;
    from?: string;
  }) =>
    router.setParams({
      type: next.type ?? type,
      deity: (next.deity ?? deity) || undefined,
      collection: (next.collection ?? collection) || undefined,
      item: next.item || undefined,
      from: next.from || undefined,
      q: search.trim() || undefined,
    });
  const open = (id: string) => {
    scroll.current = window.scrollY;
    update({ item: id });
  };
  const openFromAll = (tab: LibraryTab, id: string) => {
    scroll.current = window.scrollY;
    update({ type: tab, item: id, from: 'all' });
  };
  const back = () => update({ type: from === 'all' ? 'all' : type, item: '' });
  const setQuery = (value: string) => {
    setSearch(value);
    router.setParams({ q: value.trim() || undefined });
  };
  return (
    <>
      <PageTitle
        eyebrow="CONTENT"
        title="Library"
        copy="Search mantras, recordings, book collections and astrology capabilities, then open any item to see exactly what the API returns."
      />
      {type !== 'astrology' && !item && !session.plan.price && (
        <div className="notice">
          You’re seeing the free sample, the same items your sandbox key returns.{' '}
          <Link href="/billing">Upgrade</Link> for the full catalog.
        </div>
      )}
      {type !== 'astrology' && type !== 'all' && item ? (
        <ItemView
          type={kind}
          id={item}
          deity={deity}
          backLabel={from === 'all' ? 'all results' : undefined}
          onBack={back}
        />
      ) : null}
      <div hidden={Boolean(item)}>
        <div className="library-searchbar">
          <label className="library-search">
            <span className="visually-hidden">Search the library</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                type === 'astrology'
                  ? 'Search astrology capabilities'
                  : 'Search loaded titles, ids, deities and collections'
              }
              autoComplete="off"
            />
          </label>
          <div className="segmented tab-row" role="group" aria-label="Product area">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                aria-pressed={type === tab.id}
                onClick={() => update({ type: tab.id, deity: '', collection: '' })}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {type === 'all' ? (
        <AllResults q={search.trim()} onOpen={openFromAll} />
      ) : type === 'astrology' ? (
        <AstrologyLibrary item={item} onOpen={open} onBack={back} />
      ) : (
        <div hidden={Boolean(item)}>
          <p className="small muted library-guide-link">
            <Link
              href={{
                pathname: '/implementation',
                params: {
                  guide:
                    type === 'books'
                      ? collection
                        ? 'upanishads'
                        : 'book-reader'
                      : type === 'audio'
                        ? 'sacred-audio'
                        : 'search-mantras',
                },
              }}
            >
              See the implementation guide →
            </Link>
          </p>
          <FilterBar
            type={kind}
            deity={deity}
            collection={collection}
            onDeity={(next) => update({ deity: next })}
            onCollection={(next) => update({ collection: next })}
            onOpen={open}
          />
          <Results
            key={`${type}:${deity}:${collection}`}
            type={kind}
            deity={deity}
            collection={collection}
            audioOnly={type === 'audio'}
            q={search.trim()}
            onOpen={open}
          />
        </div>
      )}
    </>
  );
}

function FilterBar({
  type,
  deity,
  collection,
  onDeity,
  onCollection,
  onOpen,
}: {
  type: Kind;
  deity: string;
  collection: string;
  onDeity: (deity: string) => void;
  onCollection: (collection: string) => void;
  onOpen: (id: string) => void;
}) {
  const { config } = useConsole();
  const request = `curl '${config?.apiUrl ?? 'https://api.mantrilo.com'}/v1/books?${collection ? `collection=${collection}&` : ''}limit=24' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  // The draft follows the applied filter whenever that changes (type switch, chip removed).
  const [draft, setDraft] = useState({ base: `${type}:${deity}`, value: deity }),
    deityDraft = draft.base === `${type}:${deity}` ? draft.value : deity,
    setDeityDraft = (value: string) => setDraft({ base: `${type}:${deity}`, value }),
    [idDraft, setIdDraft] = useState(''),
    [error, setError] = useState('');
  function applyDeity(event: FormEvent) {
    event.preventDefault();
    const value = deityDraft.trim();
    if (value && !VALID_DEITY.test(value))
      return setError('Use 1–60 letters, digits, spaces, dots or dashes.');
    setError('');
    onDeity(value);
  }
  function openId(event: FormEvent) {
    event.preventDefault();
    const value = idDraft.trim();
    if (!VALID_ID.test(value)) return setError('IDs use letters, digits, dashes and underscores.');
    setError('');
    setIdDraft('');
    onOpen(value);
  }
  return (
    <section className="library-filters" aria-label="Find content">
      {type === 'books' && (
        <div className="library-field">
          <label htmlFor="library-collection">Collection</label>
          <select
            id="library-collection"
            value={collection}
            onChange={(e) => onCollection(e.target.value)}
          >
            {COLLECTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      {type === 'books' && (
        <div className="library-request">
          <pre>
            <code>{request}</code>
          </pre>
          <CopyButton text={request} label="Copy request" />
          <p className="small muted">
            Pages of 24 by default. Pass <code>nextCursor</code> as <code>cursor</code> for the next
            page. Open a book for its chapters, then a chapter for its verses.
          </p>
        </div>
      )}
      {type !== 'books' && (
        <form className="library-field" onSubmit={applyDeity} role="search">
          <label htmlFor="library-deity">Deity</label>
          <input
            id="library-deity"
            value={deityDraft}
            onChange={(e) => setDeityDraft(e.target.value)}
            placeholder="Deity id, e.g. shiva"
            list="library-deities"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="button subtle small-button">Filter</button>
        </form>
      )}
      <form className="library-field" onSubmit={openId}>
        <label htmlFor="library-id">Open by ID</label>
        <input
          id="library-id"
          value={idDraft}
          onChange={(e) => setIdDraft(e.target.value)}
          placeholder={type === 'books' ? 'book id' : 'mantra id'}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="button subtle small-button">Open</button>
      </form>
      {error && (
        <p className="error-text library-filter-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Results({
  type,
  deity,
  collection = '',
  audioOnly = false,
  q = '',
  onOpen,
}: {
  type: Kind;
  deity: string;
  collection?: string;
  audioOnly?: boolean;
  q?: string;
  onOpen: (id: string) => void;
}) {
  const base = `/api/library/${type}`,
    query = (cursor?: string) => {
      const params = new URLSearchParams();
      if (deity) params.set('deity', deity);
      if (collection) params.set('collection', collection);
      if (cursor) params.set('cursor', cursor);
      const text = params.toString();
      return text ? `${base}?${text}` : base;
    };
  const first = useLoad<Page>(query());
  const [more, setMore] = useState<Page[]>([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const loaded = [...(first.data?.data ?? []), ...more.flatMap((page) => page.data)],
    records = loaded.filter((r) => (!audioOnly || r.audio) && matches(r, q)),
    nextCursor = more.length ? more[more.length - 1].nextCursor : first.data?.nextCursor;
  const deityOptions = [
    ...new Map(
      records.flatMap((r) => (r.deity ? [[r.deity.id, r.deity.name ?? r.deity.id] as const] : [])),
    ),
  ];
  async function loadMore() {
    if (!nextCursor) return;
    setPending(true);
    setError('');
    try {
      setMore([...more, await api<Page>(query(nextCursor))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more.');
    } finally {
      setPending(false);
    }
  }
  const clear = () =>
    router.setParams({ deity: undefined, collection: undefined, q: undefined, item: undefined });
  const label = audioOnly ? 'recordings' : type;
  return (
    <>
      <datalist id="library-deities">
        {deityOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </datalist>
      <div className="library-status" aria-live="polite">
        <span>
          {first.loading
            ? 'Loading…'
            : `${records.length.toLocaleString()} ${records.length === 1 ? label.replace(/s$/, '') : label}${q ? ` matching “${q}”` : ''}${nextCursor ? ' · more available' : ''}`}
        </span>
        {deity && (
          <span className="filter-chip">
            Deity: {deity}
            <button aria-label={`Remove deity filter ${deity}`} onClick={clear}>
              ×
            </button>
          </span>
        )}
        {deity && (
          <button className="text-button" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      {first.loading ? (
        <Loading />
      ) : first.error ? (
        <div className="library-error">
          <ErrorNotice message={first.error} />
          <button className="button subtle small-button" onClick={first.reload}>
            Try again
          </button>
        </div>
      ) : !records.length ? (
        <Empty
          title={
            q
              ? `No loaded ${label} match “${q}”`
              : deity
                ? `No ${label} for “${deity}”`
                : `No ${label} yet`
          }
        >
          {q || deity || collection ? (
            <>
              {nextCursor ? 'Load more to search further, or ' : ''}
              <button className="text-button" onClick={clear}>
                Clear the filter
              </button>
            </>
          ) : (
            'There is nothing in this part of the catalog yet.'
          )}
        </Empty>
      ) : (
        <section className={`panel library-results ${type}`} aria-label={`${type} results`}>
          <div className="library-row library-head" aria-hidden="true">
            <span>Title</span>
            <span>ID</span>
            {type === 'mantras' && (
              <>
                <span>Deity</span>
                <span>Category</span>
                <span>Verses</span>
                <span>Audio</span>
              </>
            )}
            {type === 'books' && (
              <>
                <span>Author</span>
                <span>Collection</span>
                <span>Verses</span>
              </>
            )}
          </div>
          <ul>
            {records.map((record) => (
              <li key={record.id}>
                <button className="library-row" onClick={() => onOpen(record.id)}>
                  <span className="library-title">
                    <strong>{record.title || record.id}</strong>
                    {record.description && <small>{record.description}</small>}
                  </span>
                  <code>{record.id}</code>
                  {type === 'mantras' && (
                    <>
                      <span data-label="Deity">{record.deity?.name ?? '—'}</span>
                      <span data-label="Category">{record.category ?? '—'}</span>
                      <span data-label="Verses">{record.verseCount ?? '—'}</span>
                      <span data-label="Audio">
                        {record.audio ? <Badge tone="green">AUDIO</Badge> : '—'}
                      </span>
                    </>
                  )}
                  {type === 'books' && (
                    <>
                      <span data-label="Author">{record.author ?? '—'}</span>
                      <span data-label="Collection">
                        {[record.category, record.subcategory].filter(Boolean).join(' / ') || '—'}
                      </span>
                      <span data-label="Verses">{record.verseCount ?? '—'}</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <ErrorNotice message={error} />
          {nextCursor && (
            <div className="library-more">
              <button className="button subtle" disabled={pending} onClick={loadMore}>
                {pending ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function ItemView({
  type,
  id,
  deity,
  backLabel,
  onBack,
}: {
  type: Kind;
  id: string;
  deity: string;
  backLabel?: string;
  onBack: () => void;
}) {
  const label = backLabel ?? TABS.find((tab) => tab.id === type)?.label.toLowerCase() ?? type;
  return (
    <div className="library-item">
      <nav className="library-crumbs" aria-label="Breadcrumb">
        <button className="text-button" onClick={onBack}>
          ← Back to {label}
          {deity ? ` · ${deity}` : ''}
        </button>
      </nav>
      {type === 'books' ? <BookDetail id={id} /> : <RecordDetail id={id} />}
    </div>
  );
}

function LoadState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  if (loading) return <Loading />;
  return (
    <div className="library-error">
      <ErrorNotice message={error || 'This item could not be loaded.'} />
      <button className="button subtle small-button" onClick={reload}>
        Try again
      </button>
    </div>
  );
}

function RecordDetail({ id }: { id: string }) {
  const { config } = useConsole();
  const [audioError, setAudioError] = useState(false),
    [meanings, setMeanings] = useState(false);
  const { data, error, loading, reload } = useLoad<{ data: Detail }>(
    `/api/library/mantras/${encodeURIComponent(id)}`,
  );
  const record = data?.data;
  if (loading || error || !record)
    return <LoadState loading={loading} error={error} reload={reload} />;
  const base = config?.apiUrl ?? 'https://api.mantrilo.com',
    deityFilter = record.deity?.id,
    summary = record.description,
    hasMeanings = record.verses?.some((verse) => verse.wordMeanings?.length);
  return (
    <div className="library-detail">
      <article className="panel library-reading">
        <header className="library-detail-head">
          <p className="metric-label">MANTRA</p>
          <h2>{record.title || record.id}</h2>
          {summary && <p className="library-description">{summary}</p>}
        </header>
        {record.audio && (
          <audio
            aria-label={`Play recording for ${record.title || record.id}`}
            controls
            preload="none"
            src={`/api/library/mantras/${encodeURIComponent(id)}/audio`}
            onError={() => setAudioError(true)}
          />
        )}
        {audioError && (
          <div className="notice" role="status">
            This recording couldn’t be played.
          </div>
        )}
        {record.verses && record.verses.length > 0 && (
          <div className="library-verses-head">
            <h3>
              {record.verses.length} {record.verses.length === 1 ? 'verse' : 'verses'}
            </h3>
            {hasMeanings && (
              <button className="text-button" onClick={() => setMeanings(!meanings)}>
                {meanings ? 'Hide word meanings' : 'Show word meanings'}
              </button>
            )}
          </div>
        )}
        {record.verses?.map((verse, index) => (
          <Passage
            key={verse.number ?? index}
            label={`Verse ${verse.number ?? index + 1}${verse.title ? ` · ${verse.title}` : ''}`}
            sanskrit={verse.sanskrit}
            transliteration={verse.transliteration}
            translation={verse.translation}
            meanings={meanings ? verse.wordMeanings : undefined}
          />
        ))}
      </article>
      <aside className="library-side">
        <section className="panel">
          <div className="panel-heading">
            <h2>Details</h2>
          </div>
          <dl className="library-fields">
            <Field label="ID">
              <code>{record.id}</code> <CopyButton text={record.id} label="Copy ID" />
            </Field>
            {record.deity && (
              <Field label="Deity">
                {record.deity.name} <code>{record.deity.id}</code>
              </Field>
            )}
            {record.category && <Field label="Category">{record.category}</Field>}
            {record.source && <Field label="Source">{record.source}</Field>}
            <Field label="Verses">{record.verseCount ?? 0}</Field>
            <Field label="Audio">{record.audio ? 'Yes' : 'No'}</Field>
          </dl>
          <p>
            <Link href={{ pathname: '/implementation', params: { guide: 'featured-mantra' } }}>
              Featured mantra guide →
            </Link>
          </p>
          {record.audio && (
            <p>
              <Link href={{ pathname: '/implementation', params: { guide: 'sacred-audio' } }}>
                Audio playback guide →
              </Link>
            </p>
          )}
        </section>
        <RequestExamples
          base={base}
          type="mantras"
          id={record.id}
          deity={deityFilter}
          audio={!!record.audio}
        />
      </aside>
    </div>
  );
}

function RequestExamples({
  base,
  type,
  id,
  deity,
  audio,
}: {
  base: string;
  type: string;
  id: string;
  deity?: string | null;
  audio: boolean;
}) {
  const [tab, setTab] = useState<'curl' | 'node'>('curl');
  const path = `/v1/${type}/${encodeURIComponent(id)}`,
    list = deity ? `/v1/${type}?deity=${encodeURIComponent(deity)}&limit=50` : null;
  const examples =
    tab === 'curl'
      ? [
          ['This item', `curl '${base}${path}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`],
          ...(list
            ? [
                [
                  `More for this deity`,
                  `curl '${base}${list}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`,
                ],
              ]
            : []),
          ...(audio
            ? [
                [
                  'Audio link',
                  `curl '${base}${path}/audio?format=json' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`,
                ],
              ]
            : []),
        ]
      : [
          [
            'Node.js, on your server',
            `const res = await fetch('${base}${path}', {\n  headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` },\n});\nif (!res.ok) throw new Error((await res.json()).error.code);\nconst { data } = await res.json();`,
          ],
        ];
  return (
    <section className="panel library-requests">
      <div className="panel-heading">
        <h2>Request</h2>
        <div className="segmented compact" role="group" aria-label="Example language">
          <button aria-pressed={tab === 'curl'} onClick={() => setTab('curl')}>
            curl
          </button>
          <button aria-pressed={tab === 'node'} onClick={() => setTab('node')}>
            Node.js
          </button>
        </div>
      </div>
      {examples.map(([label, code]) => (
        <div key={label} className="library-example">
          <div className="code-heading">
            <h3>{label}</h3>
            <CopyButton text={code} />
          </div>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      ))}
      <p className="small muted library-note">
        Each successful call counts once. Keep your key on your server.
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function BookDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useLoad<{ data: Book }>(
    `/api/library/books/${encodeURIComponent(id)}`,
  );
  const [chapterNumber, setChapterNumber] = useState<number>();
  const book = data?.data;
  if (loading || error || !book)
    return <LoadState loading={loading} error={error} reload={reload} />;
  const chapter = book.chapters.find((item) => item.number === chapterNumber) ?? book.chapters[0];
  return (
    <div className="library-detail">
      <article className="panel library-reading">
        <header className="library-detail-head">
          <p className="metric-label">BOOK {book.preview && <Badge>SAMPLE</Badge>}</p>
          <h2>{book.title}</h2>
          {book.description && <p className="library-description">{book.description}</p>}
        </header>
        {chapter ? (
          <>
            <div className="pustak-controls">
              <label>
                Chapter
                <select
                  value={chapter.number}
                  onChange={(event) => setChapterNumber(Number(event.target.value))}
                >
                  {book.chapters.map((item) => (
                    <option key={item.number} value={item.number}>
                      {item.number}
                      {item.title ? ` · ${item.title}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {book.preview && <p className="small muted">Preview of the opening verses.</p>}
            </div>
            <BookChapter
              key={chapter.number}
              id={id}
              chapter={chapter.number}
              preview={book.preview}
            />
          </>
        ) : (
          <div className="notice">There are no readable chapters for this book yet.</div>
        )}
      </article>
      <aside className="library-side">
        <section className="panel">
          <div className="panel-heading">
            <h2>Details</h2>
          </div>
          <dl className="library-fields">
            <Field label="ID">
              <code>{book.id}</code> <CopyButton text={book.id} label="Copy ID" />
            </Field>
            {book.author && <Field label="Author">{book.author}</Field>}
            {book.category && (
              <Field label="Collection">
                {[book.category, book.subcategory].filter(Boolean).join(' / ')}
              </Field>
            )}
            <Field label="Chapters">{book.chapters.length}</Field>
            {book.verseCount != null && <Field label="Verses">{book.verseCount}</Field>}
          </dl>
          <p>
            <Link href={{ pathname: '/implementation', params: { guide: 'book-reader' } }}>
              Book reader guide →
            </Link>
          </p>
        </section>
      </aside>
    </div>
  );
}

function BookChapter({ id, chapter, preview }: { id: string; chapter: number; preview: boolean }) {
  const [offsets, setOffsets] = useState([0]);
  const offset = offsets[offsets.length - 1];
  const { data, error, loading, reload } = useLoad<{ data: ChapterPage }>(
    `/api/library/books/${encodeURIComponent(id)}/chapters/${chapter}?offset=${offset}`,
  );
  const page = data?.data;
  if (loading || error || !page)
    return <LoadState loading={loading} error={error} reload={reload} />;
  return (
    <>
      {page.description && <p className="library-description">{page.description}</p>}
      {page.verses.map((verse, index) => (
        <Passage
          key={offset + index}
          label={verse.number === null ? 'Passage' : `Verse ${verse.number}`}
          {...verse}
        />
      ))}
      {!page.verses.length && (
        <div className="notice">No passages are available in this chapter.</div>
      )}
      {!preview && (offset > 0 || page.nextOffset !== null) && (
        <div className="pagination">
          <button
            className="button subtle"
            disabled={offset === 0}
            onClick={() => setOffsets(offsets.slice(0, -1))}
          >
            Previous verses
          </button>
          <button
            className="button subtle"
            disabled={page.nextOffset === null}
            onClick={() => {
              if (page.nextOffset !== null) setOffsets([...offsets, page.nextOffset]);
            }}
          >
            Next verses
          </button>
        </div>
      )}
    </>
  );
}

function Passage({
  label,
  sanskrit,
  transliteration,
  translation,
  translator,
  wordMeaning,
  commentary,
  meanings,
}: {
  label?: string;
  sanskrit?: string | null;
  transliteration?: string | null;
  translation?: string | null;
  translator?: string | null;
  wordMeaning?: string | null;
  commentary?: string | null;
  meanings?: Verse['wordMeanings'];
}) {
  return (
    <div className="book-reader">
      {label && <p className="small muted">{label}</p>}
      {sanskrit && (
        <p className="verse-text" lang="sa">
          {sanskrit}
        </p>
      )}
      {transliteration && <p className="small">{transliteration}</p>}
      {translation && <p className="small muted">{translation}</p>}
      {translation && translator && <p className="small muted">{translator}</p>}
      {meanings && meanings.length > 0 && (
        <dl className="word-meanings">
          {meanings.map((m, index) => (
            <div key={index}>
              <dt>{m.word}</dt>
              <dd>{m.meaning}</dd>
            </div>
          ))}
        </dl>
      )}
      {wordMeaning && (
        <details className="small">
          <summary>Word meanings</summary>
          <p>{wordMeaning}</p>
        </details>
      )}
      {commentary && (
        <details className="small">
          <summary>Commentary</summary>
          <p>{commentary}</p>
        </details>
      )}
    </div>
  );
}

// Every area at once: the first page of mantras and books plus the astrology catalog, filtered
// by the search box. Each row says what it is and opens in its own tab.
function AllResults({ q, onOpen }: { q: string; onOpen: (tab: LibraryTab, id: string) => void }) {
  const mantras = useLoad<Page>('/api/library/mantras'),
    books = useLoad<Page>('/api/library/books');
  const rows = [
    ...(mantras.data?.data ?? []).map((r) => ({
      tab: (r.audio ? 'audio' : 'mantras') as LibraryTab,
      kind: r.audio ? 'Mantra · audio' : 'Mantra',
      id: r.id,
      title: r.title || r.id,
      summary: r.description,
      record: r,
    })),
    ...(books.data?.data ?? []).map((r) => ({
      tab: 'books' as LibraryTab,
      kind: r.subcategory ? `Book · ${r.subcategory}` : 'Book',
      id: r.id,
      title: r.title || r.id,
      summary: r.description,
      record: r,
    })),
    ...astrologyRows.map((g) => ({
      tab: 'astrology' as LibraryTab,
      kind: `Astrology · ${(g.category ?? 'Core').replace(' astrology', '')}`,
      id: g.library.item!,
      title: g.name,
      summary: g.summary,
      record: { id: g.library.item!, title: g.name, description: g.summary } as Summary,
    })),
  ].filter((row) => matches(row.record, q) || row.kind.toLowerCase().includes(q.toLowerCase()));
  const loading = mantras.loading || books.loading,
    error = mantras.error || books.error;
  return (
    <>
      <div className="library-status" aria-live="polite">
        <span>
          {loading
            ? 'Loading…'
            : `${rows.length.toLocaleString()} results${q ? ` for “${q}”` : ''} · first page of each area`}
        </span>
      </div>
      {error && (
        <div className="library-error">
          <ErrorNotice message={error} />
          <button
            className="button subtle small-button"
            onClick={() => {
              mantras.reload();
              books.reload();
            }}
          >
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty title={`Nothing matches “${q}”`}>
          Try another word, or pick an area to load and search more of it.
        </Empty>
      ) : (
        <section className="panel library-results all" aria-label="All results">
          <ul>
            {rows.map((row) => (
              <li key={`${row.tab}:${row.id}`}>
                <button className="library-row" onClick={() => onOpen(row.tab, row.id)}>
                  <span className={`type-tag type-${row.tab}`}>{row.kind}</span>
                  <span className="library-title">
                    <strong>{row.title}</strong>
                    {row.summary && <small>{row.summary}</small>}
                  </span>
                  <code>{row.id}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
