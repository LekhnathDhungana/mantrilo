import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { Badge, CopyButton, Empty, ErrorNotice, PageTitle } from '../ui.web';

export default function Playground() {
  const { session, refresh } = useConsole();
  const [type, setType] = useState('text'),
    [key, setKey] = useState(''),
    [pending, setPending] = useState(false),
    [result, setResult] = useState<{
      status: number;
      ms: number;
      id: string;
      body: unknown;
    } | null>(null),
    [error, setError] = useState(''),
    [language, setLanguage] = useState('curl');
  const origin = typeof window === 'undefined' ? 'CONSOLE_ORIGIN' : window.location.origin,
    endpoint = `/api/demo/catalog?type=${type}`;
  const curl = `curl '${origin}${endpoint}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  const js = `const response = await fetch('${endpoint}', {\n  headers: { Authorization: 'Bearer YOUR_SANDBOX_KEY' }\n});\nconst data = await response.json();`;
  async function run(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const start = performance.now();
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${key}` },
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const body = await response.json();
      setResult({
        status: response.status,
        ms: Math.round(performance.now() - start),
        id: response.headers.get('X-Request-Id') || body.requestId,
        body,
      });
      await refresh();
    } catch {
      setError(
        'The request could not reach the console server. No calculation or successful response is simulated.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="DEVELOP & INSPECT"
        title="API playground"
        copy="Run an actual request against a supported endpoint and inspect its response."
      />
      {session?.mode !== 'demo' ? (
        <Empty title="Production endpoints are not connected.">
          Configure the real catalog contract and authentication before enabling a live playground.
          No endpoint is invented here.
        </Empty>
      ) : (
        <>
          <div className="notice">
            Local sandbox only. This implemented endpoint returns explicitly labeled fixtures and
            records demo usage server-side. It is not the production Mantrilo content API.
          </div>
          <div className="playground-grid">
            <section className="panel form-panel">
              <h2>Build a request</h2>
              <form onSubmit={run}>
                <label>
                  Supported demo endpoint
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="text">GET · Text fixtures</option>
                    <option value="audio">GET · Audio metadata fixtures</option>
                    <option value="books">GET · Book fixtures</option>
                  </select>
                </label>
                <label>
                  Sandbox API key
                  <input
                    type="password"
                    autoComplete="off"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="mtr_sbx_…"
                    required
                  />
                </label>
                <p className="small muted">
                  Paste a sandbox secret you created. It stays in this page’s memory.{' '}
                  <Link href="/keys">Create a key →</Link>
                </p>
                <div className="cost-box">
                  <span>SUCCESSFUL DEMO REQUEST COST</span>
                  <strong>1 content request</strong>
                  <small>0 audio bytes · 0 astrology credits · Not billed</small>
                </div>
                <button className="button" disabled={pending}>
                  {pending ? 'Running request…' : 'Run sandbox request'} <span>↗</span>
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
          <div className="notice">
            Need astronomical calculations?{' '}
            <Link href="/astrology">Run the astrology engine →</Link>
          </div>
          <section className="panel response-panel">
            <div className="panel-heading">
              <h2>Response</h2>
              {result && (
                <div className="action-row">
                  <Badge tone={result.status < 400 ? 'green' : 'red'}>HTTP {result.status}</Badge>
                  <Badge>{result.ms} ms</Badge>
                </div>
              )}
            </div>
            {result ? (
              <>
                <p className="response-id">
                  Request ID: <code>{result.id}</code>
                </p>
                <pre>
                  <code>{JSON.stringify(result.body, null, 2)}</code>
                </pre>
              </>
            ) : (
              <Empty title="Ready when you are." icon="›_">
                Choose a fixture endpoint, provide an active sandbox key, and run a request.
              </Empty>
            )}
          </section>
        </>
      )}
    </>
  );
}
