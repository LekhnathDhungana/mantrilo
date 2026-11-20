import { useState } from 'react';
import { Link } from 'expo-router';
import { contentGuides } from '../../data/integrations';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { Badge, CopyButton, Empty, ErrorNotice } from '../ui.web';
import { EnvTag, primaryKey, type Environment } from '../Account.web';

type Endpoint = {
  label: string;
  path: string;
  list?: 'mantras' | 'books';
  collection?: boolean;
  guide: string;
  reference: string;
};
type Result = {
  status: number;
  ms: number;
  requestId: string | null;
  body: { nextCursor?: string | null; data?: { nextOffset?: number | null } };
};

// Each endpoint links to its reference row and the guide that uses it.
const ENDPOINTS: Endpoint[] = [
  {
    label: 'List mantras',
    path: '/v1/mantras',
    list: 'mantras',
    guide: 'search-mantras',
    reference: 'endpoints',
  },
  {
    label: 'Get one mantra',
    path: '/v1/mantras/{id}',
    guide: 'featured-mantra',
    reference: 'endpoints',
  },
  {
    label: 'Get a mantra’s recording link',
    path: '/v1/mantras/{id}/audio?format=json',
    guide: 'sacred-audio',
    reference: 'endpoints',
  },
  {
    label: 'List a book collection',
    path: '/v1/books',
    list: 'books',
    collection: true,
    guide: 'upanishads',
    reference: 'reading-books',
  },
  {
    label: 'List all books',
    path: '/v1/books',
    list: 'books',
    guide: 'book-reader',
    reference: 'reading-books',
  },
  {
    label: 'Get a book’s chapter index',
    path: '/v1/books/{id}',
    guide: 'book-reader',
    reference: 'reading-books',
  },
  {
    label: 'Read a chapter',
    path: '/v1/books/{id}/chapters/{chapter}',
    guide: 'book-reader',
    reference: 'reading-books',
  },
];

const COLLECTIONS = [
  ['upanishads', 'Upanishads'],
  ['bhagavad-gita', 'Bhagavad Gita'],
  ['advaita-vedanta-prakarana-granthas', 'Advaita Vedanta & Prakarana Granthas'],
  ['vedanta', 'Vedanta'],
  ['yoga', 'Yoga'],
];

function buildPath(
  endpoint: Endpoint,
  {
    id,
    chapter,
    limit,
    deity,
    collection,
  }: { id: string; chapter: string; limit: string; deity: string; collection: string },
  page?: { cursor?: string; offset?: number },
) {
  const query = new URLSearchParams();
  if (endpoint.collection && collection) query.set('collection', collection);
  if (endpoint.list && limit) query.set('limit', limit);
  if (endpoint.list === 'mantras' && deity) query.set('deity', deity);
  if (endpoint.list && page?.cursor) query.set('cursor', page.cursor);
  if (page?.offset !== undefined) query.set('offset', String(page.offset));
  const path = endpoint.path
    .replace('{id}', encodeURIComponent(id) || 'YOUR_ID')
    .replace('{chapter}', encodeURIComponent(chapter) || '1');
  return query.size ? `${path}?${query}` : path;
}

export default function Playground({ preset }: { preset?: string }) {
  const { config, refresh, session } = useConsole();
  const sandboxKey = session ? primaryKey(session, 'sandbox') : undefined,
    liveKey = session ? primaryKey(session, 'production') : undefined;
  const guide = contentGuides.find((entry) => entry.id === preset);
  const sampleId = config?.mode === 'demo' ? guide?.demoItem : guide?.library.item;
  const initialEndpoint = ENDPOINTS.findIndex((entry) => entry.guide === preset);
  const sampleQuery = new URL(guide?.path ?? '/', 'https://example.invalid').searchParams;
  const initialLimit =
    preset === 'quickstart' ? '1' : (sampleQuery.get('limit') ?? (guide ? '' : '5'));
  const [environment, setEnvironment] = useState<Environment | 'other'>('sandbox'),
    [collection, setCollection] = useState('upanishads');
  const [index, setIndex] = useState(Math.max(0, initialEndpoint)),
    [id, setId] = useState(guide?.area === 'Books' ? '' : (sampleId ?? '')),
    [chapter, setChapter] = useState('1'),
    [limit, setLimit] = useState(initialLimit),
    [deity, setDeity] = useState(''),
    [key, setKey] = useState(''),
    [pending, setPending] = useState(false),
    [completed, setCompleted] = useState<{ result: Result; basePath: string } | null>(null),
    [error, setError] = useState(''),
    [language, setLanguage] = useState('curl');
  const endpoint = ENDPOINTS[index],
    needsId = endpoint.path.includes('{id}'),
    needsChapter = endpoint.path.includes('{chapter}'),
    fields = { id: id.trim(), chapter, limit, deity: deity.trim(), collection },
    keyToSend =
      environment === 'sandbox'
        ? (sandboxKey?.secret ?? '')
        : environment === 'production'
          ? (liveKey?.secret ?? '')
          : key.trim(),
    path = buildPath(endpoint, fields),
    base = config?.apiUrl ?? '',
    result = completed?.basePath === path ? completed.result : null;
  const curl = `curl '${base}${path}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  const js = `// Run this on your server. Never ship the key in an app or browser.\nconst response = await fetch('${base}${path}', {\n  headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` },\n});\nconst body = await response.json();`;
  async function send(requestPath: string) {
    setPending(true);
    setError('');
    try {
      const { response } = await mutate<{ response: Result }>('/api/playground', 'POST', {
        path: requestPath,
        key: keyToSend,
      });
      setCompleted({ result: response, basePath: path });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request could not be completed.');
    } finally {
      setPending(false);
    }
  }
  const nextCursor = endpoint.list ? result?.body.nextCursor : null;
  const nextOffset = needsChapter ? result?.body.data?.nextOffset : null;
  return (
    <>
      {!config?.apiUrl ? (
        <Empty title="The API isn’t connected to this console.">
          Set MANTRILO_API_URL on the console server to run requests from here.
        </Empty>
      ) : (
        <>
          <div className="playground-grid">
            <section className="panel form-panel">
              <h2>Build a request</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(path);
                }}
              >
                <label>
                  Endpoint
                  <select
                    value={index}
                    onChange={(e) => {
                      setIndex(Number(e.target.value));
                      setCompleted(null);
                    }}
                  >
                    {ENDPOINTS.map((item, i) => (
                      <option key={item.label} value={i}>
                        {item.label} · GET {item.path}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="env-picker">
                  <legend>Environment</legend>
                  <div className="segmented compact" role="group" aria-label="Environment">
                    <button
                      type="button"
                      aria-pressed={environment === 'sandbox'}
                      onClick={() => setEnvironment('sandbox')}
                      disabled={!sandboxKey?.secret}
                    >
                      Sandbox
                    </button>
                    <button
                      type="button"
                      aria-pressed={environment === 'production'}
                      onClick={() => setEnvironment('production')}
                      disabled={!liveKey?.secret}
                      title={liveKey?.secret ? undefined : 'Live keys come with a paid plan'}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      aria-pressed={environment === 'other'}
                      onClick={() => setEnvironment('other')}
                    >
                      Paste a key
                    </button>
                  </div>
                  {environment !== 'other' && (
                    <p className="small muted">
                      <EnvTag environment={environment} /> Uses this workspace’s{' '}
                      {environment === 'sandbox' ? 'sandbox' : 'live'} key.{' '}
                      {environment === 'sandbox' && 'Sandbox reads the sample catalog.'}
                    </p>
                  )}
                </fieldset>
                {endpoint.collection && (
                  <label>
                    Collection
                    <select value={collection} onChange={(e) => setCollection(e.target.value)}>
                      {COLLECTIONS.map(([value, name]) => (
                        <option key={value} value={value}>
                          {name} · {value}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {needsId && (
                  <label>
                    ID
                    <input
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder="Copy an id from a list response"
                      maxLength={200}
                      required
                    />
                  </label>
                )}
                {needsChapter && (
                  <label>
                    Chapter number
                    <input
                      type="number"
                      min={1}
                      max={999999999}
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      required
                    />
                  </label>
                )}
                {endpoint.list && (
                  <label>
                    Limit (1–100)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                    />
                  </label>
                )}
                {endpoint.list === 'mantras' && (
                  <>
                    <label>
                      Deity (optional, exact match)
                      <input
                        value={deity}
                        onChange={(e) => setDeity(e.target.value)}
                        maxLength={60}
                      />
                    </label>
                  </>
                )}
                {environment === 'other' && (
                  <>
                    <label>
                      API key
                      <input
                        type="password"
                        autoComplete="off"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="mtr_sbx_… or mtr_live_…"
                        required
                      />
                    </label>
                    <p className="small muted">
                      Paste a key from this workspace. It is sent through the console for this
                      request only and is never stored. <Link href="/keys">Your keys →</Link>
                    </p>
                  </>
                )}
                <div className="cost-box">
                  <span>SUCCESSFUL REQUEST COST</span>
                  <strong>1 content request</strong>
                </div>
                <button className="button" disabled={pending}>
                  {pending ? 'Running request…' : 'Run request'} <span>↗</span>
                </button>
              </form>
            </section>
            <section className="panel request-example">
              <div className="panel-heading">
                <h2>
                  <span className="method-tag">GET</span> {path}
                </h2>
                <div className="segmented compact">
                  {['curl', 'javascript'].map((l) => (
                    <button key={l} aria-pressed={language === l} onClick={() => setLanguage(l)}>
                      {l === 'curl' ? 'cURL' : 'JavaScript'}
                    </button>
                  ))}
                </div>
              </div>
              <pre>
                <code>{language === 'curl' ? curl : js}</code>
              </pre>
              <div className="action-row">
                <CopyButton text={language === 'curl' ? curl : js} />
                <Link className="text-link" href={`/docs?tab=reference#${endpoint.reference}`}>
                  Endpoint reference →
                </Link>
                <Link
                  className="text-link"
                  href={{ pathname: '/docs', params: { guide: endpoint.guide } }}
                >
                  Guide →
                </Link>
              </div>
            </section>
          </div>
          <ErrorNotice message={error} />
          <section className="panel response-panel">
            <div className="panel-heading">
              <h2>Response</h2>
              {result && (
                <div className="action-row">
                  <Badge tone={result.status < 400 ? 'green' : 'red'}>HTTP {result.status}</Badge>
                  <Badge>{result.ms} ms</Badge>
                  {nextCursor && (
                    <button
                      className="button subtle"
                      disabled={pending}
                      onClick={() => send(buildPath(endpoint, fields, { cursor: nextCursor }))}
                    >
                      Next page
                    </button>
                  )}
                  {typeof nextOffset === 'number' && (
                    <button
                      className="button subtle"
                      disabled={pending}
                      onClick={() => send(buildPath(endpoint, fields, { offset: nextOffset }))}
                    >
                      Next verses
                    </button>
                  )}
                </div>
              )}
            </div>
            {result ? (
              <>
                <p className="response-id">
                  Request ID: <code>{result.requestId}</code>
                </p>
                <pre>
                  <code>{JSON.stringify(result.body, null, 2)}</code>
                </pre>
              </>
            ) : (
              <Empty title="Ready when you are." icon="›_">
                Choose an endpoint, paste a key, and run a request.
              </Empty>
            )}
          </section>
        </>
      )}
    </>
  );
}
