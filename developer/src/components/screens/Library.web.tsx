import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { api } from '../../lib/api';
import { Badge, CopyButton, Empty, ErrorNotice, Loading, PageTitle, useLoad } from '../ui.web';

type Summary = {
  id: string;
  title: string | null;
  description: string | null;
  source?: string | null;
  category?: string | null;
  deity?: { id: string; name: string | null } | null;
  deities?: string[];
  verseCount?: number;
  audio?: { href: string } | null;
};
type Verse = {
  number: number | null;
  sanskrit: string | null;
  transliteration: string | null;
  translation: string | null;
};
type Detail = Summary & {
  verses?: Verse[];
  text?: string | null;
  transliterations?: Record<string, string>;
  translations?: Record<string, string>;
};
type Page = { data: Summary[]; nextCursor: string | null };

const TYPES = [
  ['shlokas', 'Shlokas'],
  ['mantras', 'Mantras'],
];

export default function Library() {
  const { session } = useConsole();
  const [type, setType] = useState('shlokas');
  if (!session) return null;
  return (
    <>
      <PageTitle
        eyebrow="CONTENT"
        title="Library"
        copy="Browse what your app can use. Browsing here doesn’t count toward your plan."
      />
      {!session.plan.price && (
        <div className="notice">
          You’re seeing the free sample. <Link href="/billing?view=plans">Upgrade</Link> to browse
          and use the full catalog.
        </div>
      )}
      <div className="explorer-toolbar">
        <div className="segmented" role="group" aria-label="Content type">
          {TYPES.map(([id, label]) => (
            <button key={id} aria-pressed={type === id} onClick={() => setType(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Records key={type} type={type} />
    </>
  );
}

function Records({ type }: { type: string }) {
  const first = useLoad<Page>(`/api/library/${type}`);
  const [more, setMore] = useState<Page[]>([]),
    [selected, setSelected] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const records = [...(first.data?.data ?? []), ...more.flatMap((page) => page.data)],
    nextCursor = more.length ? more[more.length - 1].nextCursor : first.data?.nextCursor,
    current = selected || records[0]?.id;
  async function loadMore() {
    setPending(true);
    setError('');
    try {
      const page = await api<Page>(`/api/library/${type}?cursor=${nextCursor}`);
      setMore([...more, page]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more.');
    } finally {
      setPending(false);
    }
  }
  if (first.loading) return <Loading />;
  if (first.error) return <ErrorNotice message={first.error} />;
  if (!records.length) return <Empty title="Nothing here yet.">No items are available.</Empty>;
  return (
    <div className="explorer-grid">
      <aside className="panel catalog-list">
        {records.map((record) => (
          <button
            className={current === record.id ? 'catalog-record selected' : 'catalog-record'}
            onClick={() => setSelected(record.id)}
            key={record.id}
          >
            <strong>{record.title || record.id}</strong>
            <code>{record.id}</code>
          </button>
        ))}
        <ErrorNotice message={error} />
        {nextCursor && (
          <button className="button subtle library-more" disabled={pending} onClick={loadMore}>
            {pending ? 'Loading…' : 'Load more'}
          </button>
        )}
      </aside>
      {current && <RecordDetail key={current} type={type} id={current} />}
    </div>
  );
}

function RecordDetail({ type, id }: { type: string; id: string }) {
  const { config } = useConsole();
  const { data, error, loading } = useLoad<{ data: Detail }>(`/api/library/${type}/${id}`);
  const base = config?.apiUrl ?? 'https://api.mantrilo.com',
    request = `curl '${base}/v1/${type}/${id}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`,
    record = data?.data;
  if (loading) return <Loading />;
  if (error || !record) return <ErrorNotice message={error || 'This item could not be loaded.'} />;
  const deity = record.deity?.name || record.deities?.join(', ');
  return (
    <section className="panel record-detail">
      <div className="panel-heading">
        <h2>{record.title || record.id}</h2>
        {record.audio && <Badge tone="green">HAS AUDIO</Badge>}
      </div>
      {record.description && <p className="library-description">{record.description}</p>}
      <dl className="field-grid">
        <div>
          <dt>ID</dt>
          <dd>
            <code>{record.id}</code>
          </dd>
        </div>
        {deity && (
          <div>
            <dt>Deity</dt>
            <dd>{deity}</dd>
          </div>
        )}
        {record.category && (
          <div>
            <dt>Category</dt>
            <dd>{record.category}</dd>
          </div>
        )}
        {record.source && (
          <div>
            <dt>Source</dt>
            <dd>{record.source}</dd>
          </div>
        )}
      </dl>
      {record.text && (
        <Passage
          sanskrit={record.text}
          transliteration={record.transliterations?.en}
          translation={record.translations?.en}
        />
      )}
      {record.verses?.map((verse, index) => (
        <Passage
          key={verse.number ?? index}
          label={`Verse ${verse.number ?? index + 1}`}
          sanskrit={verse.sanskrit}
          transliteration={verse.transliteration}
          translation={verse.translation}
        />
      ))}
      <div className="code-heading">
        <h3>Use it in your app</h3>
        <CopyButton text={request} />
      </div>
      <pre>
        <code>{request}</code>
      </pre>
    </section>
  );
}

function Passage({
  label,
  sanskrit,
  transliteration,
  translation,
}: {
  label?: string;
  sanskrit?: string | null;
  transliteration?: string | null;
  translation?: string | null;
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
    </div>
  );
}
