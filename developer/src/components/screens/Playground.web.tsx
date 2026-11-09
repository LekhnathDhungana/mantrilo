import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { Badge, CopyButton, Empty, ErrorNotice } from '../ui.web';

type Endpoint = { label: string; path: string; list?: boolean; audio?: boolean };
type Result = {
  status: number;
  ms: number;
  requestId: string | null;
  body: { nextCursor?: string | null };
};

const ENDPOINTS: Endpoint[] = [
  { label: 'List shlokas', path: '/v1/shlokas', list: true },
  { label: 'Get one shloka', path: '/v1/shlokas/{id}' },
  { label: 'Get a shloka audio link', path: '/v1/shlokas/{id}/audio', audio: true },
  { label: 'List mantras', path: '/v1/mantras', list: true },
  { label: 'Get one mantra', path: '/v1/mantras/{id}' },
];

function buildPath(
  endpoint: Endpoint,
  { id, limit, deity, cursor }: { id: string; limit: string; deity: string; cursor?: string },
) {
  const query = new URLSearchParams();
  if (endpoint.list) {
    if (limit) query.set('limit', limit);
    if (deity) query.set('deity', deity);
    if (cursor) query.set('cursor', cursor);
  }
  if (endpoint.audio) query.set('format', 'json');
  const path = endpoint.path.replace('{id}', encodeURIComponent(id) || 'YOUR_ID');
  return query.size ? `${path}?${query}` : path;
}

export default function Playground() {
  const { config, refresh } = useConsole();
  const [index, setIndex] = useState(0),
    [id, setId] = useState(''),
    [limit, setLimit] = useState('5'),
    [deity, setDeity] = useState(''),
    [key, setKey] = useState(''),
    [pending, setPending] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(''),
    [language, setLanguage] = useState('curl');
  const endpoint = ENDPOINTS[index],
    needsId = endpoint.path.includes('{id}'),
    path = buildPath(endpoint, { id: id.trim(), limit, deity: deity.trim() }),
    base = config?.apiUrl ?? '';
  const curl = `curl '${base}${path}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  const js = `// Run this on your server. Never ship the key in an app or browser.\nconst response = await fetch('${base}${path}', {\n  headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` },\n});\nconst body = await response.json();`;
  async function send(requestPath: string) {
    setPending(true);
    setError('');
    try {
      const { response } = await mutate<{ response: Result }>('/api/playground', 'POST', {
        path: requestPath,
        key: key.trim(),
      });
      setResult(response);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request could not be completed.');
    } finally {
      setPending(false);
    }
  }
  const nextCursor = endpoint.list ? result?.body.nextCursor : null;
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
                      setResult(null);
                    }}
                  >
                    {ENDPOINTS.map((item, i) => (
                      <option key={item.path} value={i}>
                        {item.label} · GET {item.path}
                      </option>
                    ))}
                  </select>
                </label>
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
                {endpoint.list && (
                  <>
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
                  Paste a key from this workspace. It is sent through the console for this request
                  only and is never stored. <Link href="/keys">Create a key →</Link>
                </p>
                <div className="cost-box">
                  <span>SUCCESSFUL REQUEST COST</span>
                  <strong>1 content request</strong>
                  <small>Audio links also count the file size toward your audio allowance</small>
                </div>
                <button className="button" disabled={pending}>
                  {pending ? 'Running request…' : 'Run request'} <span>↗</span>
                </button>
              </form>
            </section>
            <section className="panel request-example">
              <div className="panel-heading">
                <h2>Request example</h2>
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
              <CopyButton text={language === 'curl' ? curl : js} />
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
                      onClick={() =>
                        send(
                          buildPath(endpoint, {
                            id: id.trim(),
                            limit,
                            deity: deity.trim(),
                            cursor: nextCursor,
                          }),
                        )
                      }
                    >
                      Next page
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
