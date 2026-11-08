import { useState, type ReactNode } from 'react';
import { Link } from 'expo-router';
import AstrologyCalculator from './AstrologyCalculator.web';
import { useConsole } from './Session.web';
import { mutate } from '../lib/api';
import {
  Badge,
  CopyButton,
  Empty,
  ErrorNotice,
  formatBytes,
  formatDate,
  Loading,
  Meter,
  PageTitle,
  useLoad,
} from './ui.web';
import type { Activity, Addon, CatalogRecord, KeyRecord, Plan } from '../lib/types';

function Overview() {
  const { session } = useConsole();
  if (!session) return null;
  const s = session;
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE OVERVIEW"
        title="A clear view of your integration."
        copy="Your content, credentials, and usage. All in one place."
        action={
          <Link href="/keys" className="button">
            Create an API key <span>↗</span>
          </Link>
        }
      />
      <div className="plan-strip">
        <div>
          <span className="strip-label">CONTENT PLAN</span>
          <strong>
            {s.plan.name} <Badge>{s.plan.price ? `$${s.plan.price}/month` : 'Free'}</Badge>
          </strong>
        </div>
        <div>
          <span className="strip-label">ASTROLOGY</span>
          <strong>
            Calculation sandbox <Badge tone="green">Available</Badge>
          </strong>
        </div>
        <div>
          <span className="strip-label">METERING WINDOW · UTC</span>
          <strong>{s.period}</strong>
          <small>Billing period not available</small>
        </div>
        <Link href="/billing" className="text-link">
          View plans ↗
        </Link>
      </div>
      <div className="metrics">
        <Meter
          label="Content requests"
          value={s.usage.contentRequests}
          limit={s.allowance.requests}
          note="Separate monthly content allowance"
        />
        <Meter
          label="Audio delivered"
          value={s.usage.audioBytes}
          limit={s.allowance.audioBytes}
          displayLimit={
            s.allowance.audioBytes ? formatBytes(s.allowance.audioBytes) : 'Samples only'
          }
          note="Data delivered, not storage"
        />
        <Meter
          label="Astrology credits"
          value={s.usage.astrologyCredits}
          limit={s.allowance.astrologyCredits}
          note="Nonbillable sandbox calculations"
        />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Your next steps</h2>
            <Badge>GET STARTED</Badge>
          </div>
          <div className="step-list">
            {[
              [
                '01',
                'Create your first API key',
                'Keep sandbox and production credentials separate.',
                '/keys',
              ],
              [
                '02',
                'Explore the content model',
                'Text, recordings, and book structures in context.',
                '/explorer',
              ],
              [
                '03',
                'Run a sandbox request',
                'Inspect the response and its demo usage cost.',
                '/playground',
              ],
            ].map(([n, t, c, url]) => (
              <Link className="step-row" href={url} key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{c}</p>
                </div>
                <b>↗</b>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <Link href="/usage" className="text-link">
              View logs →
            </Link>
          </div>
          {s.workspace.logs.length ? (
            <ActivityList logs={s.workspace.logs.slice(0, 5)} />
          ) : (
            <Empty title="A fresh start." icon="↗">
              Create a key or run a sandbox request. Your real console activity will appear here.
            </Empty>
          )}
        </section>
      </div>
      <section className="library-banner">
        <div>
          <div className="eyebrow">THE CONTENT LIBRARY</div>
          <h2>Build with context intact.</h2>
          <p>
            Mantras and shlokas, sacred audio, and shastra books. Astrology calculations use a
            separate credit allowance.
          </p>
        </div>
        <div className="library-glyph" lang="sa" aria-hidden="true">
          ज्ञानम्
        </div>
        <Link href="/explorer" className="button outline">
          Explore content <span>↗</span>
        </Link>
      </section>
      <p className="footnote">
        {s.mode === 'demo'
          ? 'Usage starts at zero. Only successful demo catalog requests move the content meter. No demo activity is billed.'
          : 'Usage comes from server-side workspace records. Production catalog and billing connections are not configured.'}
      </p>
    </>
  );
}
function ActivityList({ logs }: { logs: Activity[] }) {
  return (
    <ul className="activity-list">
      {logs.map((log) => (
        <li key={log.id}>
          <span className={`activity-dot ${log.type === 'error' ? 'bad' : ''}`} />
          <div>
            <strong>{log.message || log.endpoint || log.type.replaceAll('_', ' ')}</strong>
            <small>
              {formatDate(log.at)} · {new Date(log.at).toLocaleTimeString()}{' '}
              {log.status ? `· ${log.status}` : ''}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Keys() {
  const { session, refresh } = useConsole();
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [newSecret, setNewSecret] = useState(''),
    [revokeId, setRevokeId] = useState('');
  if (!session) return null;
  async function create(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const result = await mutate<{ secret: string; key: KeyRecord }>('/api/keys', 'POST', {
        name: f.get('name'),
        environment: f.get('environment'),
      });
      setNewSecret(result.secret);
      setOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Key creation failed.');
    } finally {
      setPending(false);
    }
  }
  async function revoke(id: string) {
    setPending(true);
    setError('');
    try {
      await mutate(`/api/keys/${id}`, 'DELETE');
      setRevokeId('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke the key.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CREDENTIALS"
        title="API keys"
        copy="Give each integration a named credential. Keep the secret on your server."
        action={
          <button
            className="button"
            onClick={() => setOpen(!open)}
            disabled={pending || !!newSecret}
          >
            Create API key <span>＋</span>
          </button>
        }
      />
      <ErrorNotice message={error} />
      {newSecret && (
        <section className="secret-card" role="status">
          <Badge tone="saffron">SHOWN ONCE</Badge>
          <h2>Save your API key.</h2>
          <p>The server stores a secure hash. This secret cannot be retrieved again.</p>
          <code className="secret-value">{newSecret}</code>
          <div className="action-row">
            <CopyButton text={newSecret} label="Copy secret" />
            <button className="button subtle" onClick={() => setNewSecret('')}>
              I saved it · Hide secret
            </button>
          </div>
        </section>
      )}
      {open && (
        <section className="panel form-panel">
          <h2>Create a named key</h2>
          <form className="inline-form" onSubmit={create}>
            <label>
              Key name
              <input
                name="name"
                maxLength={80}
                placeholder="e.g. Reading app development"
                required
              />
            </label>
            <label>
              Environment
              <select name="environment" defaultValue="sandbox">
                <option value="sandbox">Sandbox</option>
                <option value="production" disabled={!session.plan.price}>
                  Production · paid plan required
                </option>
              </select>
            </label>
            <button className="button" disabled={pending}>
              {pending ? 'Creating…' : 'Create key'}
            </button>
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Workspace keys</h2>
          <span className="small muted">{session.workspace.keys.length} records</span>
        </div>
        {session.workspace.keys.length ? (
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Name & prefix</th>
                  <th>Environment</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {session.workspace.keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <strong>{key.name}</strong>
                      <code className="table-code">{key.prefix}••••••••</code>
                    </td>
                    <td>
                      <Badge>{key.environment}</Badge>
                    </td>
                    <td>{formatDate(key.createdAt)}</td>
                    <td>{formatDate(key.lastUsedAt)}</td>
                    <td>
                      <Badge tone={key.status === 'active' ? 'green' : 'neutral'}>
                        {key.status}
                      </Badge>
                    </td>
                    <td>
                      {key.status === 'active' &&
                        (revokeId === key.id ? (
                          <div className="action-row">
                            <button
                              className="text-button danger"
                              disabled={pending}
                              onClick={() => revoke(key.id)}
                            >
                              Confirm revoke
                            </button>
                            <button className="text-button" onClick={() => setRevokeId('')}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-button danger"
                            onClick={() => setRevokeId(key.id)}
                          >
                            Revoke
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="⌘" title="Your first key starts here.">
            Create a sandbox key to run the local fixture endpoints. Production access requires an
            active paid content plan.
          </Empty>
        )}
      </section>
      <div className="notice">
        Never place secrets in mobile apps, browser bundles, Git, or request logs. Newly generated
        secrets remain in this page’s memory until hidden or you navigate away.
      </div>
    </>
  );
}

function Explorer() {
  const [tab, setTab] = useState('text'),
    [query, setQuery] = useState(''),
    [draft, setDraft] = useState(''),
    [selected, setSelected] = useState('');
  const { data, error, loading } = useLoad<{ data: CatalogRecord[]; demo: boolean }>(
    `/api/catalog?type=${tab}&q=${encodeURIComponent(query)}`,
  );
  const record = data?.data.find((r) => r.id === selected) || data?.data[0];
  return (
    <>
      <PageTitle
        eyebrow="CONTENT LIBRARY"
        title="Explore the content structure."
        copy="Inspect fields, source references, and relationships before integrating."
      />
      <div className="notice">
        Demo fixtures are structural examples. Titles, translations, source editions, languages, and
        recording rights are not verified catalog data.
      </div>
      <div className="explorer-toolbar">
        <div className="segmented" role="group" aria-label="Content category">
          {[
            ['text', 'Mantras & shlokas'],
            ['audio', 'Sacred audio'],
            ['books', 'Shastras & books'],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setSelected('');
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draft);
          }}
        >
          <label className="sr-only" htmlFor="catalog-search">
            Search catalog fixtures
          </label>
          <input
            id="catalog-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            placeholder="Search IDs or fields…"
          />
          <button className="button subtle small-button">Search</button>
        </form>
      </div>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : !data?.data.length ? (
        <Empty title="No matching content.">
          Try another search. In Firebase mode, connect a real catalog service before exploring
          production content.
        </Empty>
      ) : (
        <div className="explorer-grid">
          <aside className="panel catalog-list">
            <div className="panel-heading">
              <h2>Records</h2>
              <Badge>DEMO</Badge>
            </div>
            {data.data.map((r) => (
              <button
                className={record?.id === r.id ? 'catalog-record selected' : 'catalog-record'}
                onClick={() => setSelected(r.id)}
                key={r.id}
              >
                <span className="catalog-glyph" aria-hidden="true">
                  {r.type === 'audio' ? '≋' : r.type === 'shastra' ? '▤' : 'ॐ'}
                </span>
                <strong>{r.label}</strong>
                <code>{r.id}</code>
              </button>
            ))}
          </aside>
          {record && <RecordDetail key={record.id} record={record} />}
        </div>
      )}
    </>
  );
}
function RecordDetail({ record }: { record: CatalogRecord }) {
  const [chapter, setChapter] = useState(0),
    [verse, setVerse] = useState(0);
  const current = record.chapters?.[chapter]?.verses[verse];
  return (
    <section className="panel record-detail">
      <div className="panel-heading">
        <h2>{record.label}</h2>
        <Badge>ILLUSTRATIVE</Badge>
      </div>
      <dl className="field-grid">
        <div>
          <dt>Identifier</dt>
          <dd>
            <code>{record.id}</code>
          </dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{record.language || 'Not supplied'}</dd>
        </div>
        <div>
          <dt>Source reference</dt>
          <dd>{record.source_reference || 'Not supplied'}</dd>
        </div>
        <div>
          <dt>Linked content</dt>
          <dd>{record.audio_id || record.content_id || 'No linked recording'}</dd>
        </div>
      </dl>
      {record.chapters && (
        <div className="book-reader">
          <div className="action-row">
            <label>
              Chapter
              <select
                value={chapter}
                onChange={(e) => {
                  setChapter(Number(e.target.value));
                  setVerse(0);
                }}
              >
                {record.chapters.map((c, i) => (
                  <option value={i} key={c.number}>
                    Chapter {c.number}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Verse
              <select value={verse} onChange={(e) => setVerse(Number(e.target.value))}>
                {record.chapters[chapter].verses.map((v, i) => (
                  <option key={v.number} value={i}>
                    Verse {v.number}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="verse-text">{current?.original_text}</p>
          <p className="small muted">Translation: {current?.translation || 'Not supplied'}</p>
        </div>
      )}
      {record.type === 'audio' &&
        (record.recording_url ? (
          <audio controls preload="none" src={record.recording_url}>
            Your browser does not support audio playback.
          </audio>
        ) : (
          <div className="notice">
            No audio file is connected. Playback is unavailable; no recording is downloaded.
          </div>
        ))}
      <div className="code-heading">
        <h3>Record JSON</h3>
        <CopyButton text={JSON.stringify(record, null, 2)} />
      </div>
      <pre>
        <code>{JSON.stringify(record, null, 2)}</code>
      </pre>
    </section>
  );
}

function Playground() {
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

function Astrology() {
  return <AstrologyCalculator />;
}

function Usage() {
  const { session } = useConsole();
  const [from, setFrom] = useState(`${session?.period || new Date().toISOString().slice(0, 7)}-01`),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10)),
    [range, setRange] = useState({ from, to }),
    [metric, setMetric] = useState<'contentRequests' | 'audioBytes' | 'astrologyCredits'>(
      'contentRequests',
    ),
    [page, setPage] = useState(0);
  const { data, error, loading } = useLoad<{
    daily: { day: string; contentRequests: number; audioBytes: number; astrologyCredits: number }[];
    logs: Activity[];
    endpoints: Record<string, number>;
    policy: string;
    logLimit: number;
  }>(`/api/usage?from=${range.from}&to=${range.to}`);
  const labels = {
    contentRequests: 'Content requests',
    audioBytes: 'Audio bytes delivered',
    astrologyCredits: 'Astrology credits',
  };
  const maximum = Math.max(1, ...(data?.daily.map((day) => day[metric]) || []));
  return (
    <>
      <PageTitle
        eyebrow="OBSERVABILITY"
        title="Usage & request logs"
        copy="Separate server-side meters. Inspect activity without exposing credentials or personal inputs."
      />
      <form
        className="date-filter panel"
        onSubmit={(event) => {
          event.preventDefault();
          setRange({ from, to });
          setPage(0);
        }}
      >
        <label>
          From · UTC
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          To · UTC
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button className="button subtle">Apply date range</button>
        <span className="small muted">Up to 94 days</span>
      </form>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h2>Daily usage</h2>
                <div className="segmented compact">
                  {Object.entries(labels).map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={metric === id}
                      onClick={() => setMetric(id as typeof metric)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {data.daily.length ? (
                <>
                  <svg
                    className="usage-chart"
                    viewBox="0 0 800 200"
                    role="img"
                    aria-label={`${labels[metric]} by day. Values are in the accompanying table.`}
                  >
                    <line x1="20" y1="170" x2="780" y2="170" stroke="#deded3" />
                    {data.daily.map((day, index) => {
                      const width = 730 / data.daily.length;
                      const h = (day[metric] / maximum) * 140;
                      return (
                        <g key={day.day}>
                          <rect
                            x={25 + index * width}
                            y={170 - h}
                            width={Math.min(40, width - 3)}
                            height={Math.max(day[metric] ? 2 : 0, h)}
                            rx="3"
                            fill="#ad4f2d"
                          />
                          <title>
                            {day.day}: {day[metric]}
                          </title>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Date · UTC</th>
                          <th>Content requests</th>
                          <th>Audio delivered</th>
                          <th>Astrology credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily.map((day) => (
                          <tr key={day.day}>
                            <td>{day.day}</td>
                            <td>{day.contentRequests.toLocaleString()}</td>
                            <td>{formatBytes(day.audioBytes)}</td>
                            <td>{day.astrologyCredits.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <Empty title="No metered activity in this period.">
                  Successful demo catalog requests appear here. Keys, settings, and failed requests
                  do not consume demo credits.
                </Empty>
              )}
            </section>
            <div className="notice">{data.policy}</div>
            <section className="panel">
              <div className="panel-heading">
                <h2>Endpoint usage</h2>
                <Badge>SUCCESSFUL REQUESTS</Badge>
              </div>
              {Object.keys(data.endpoints).length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Endpoint</th>
                        <th>Successful requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.endpoints).map(([endpoint, count]) => (
                        <tr key={endpoint}>
                          <td>
                            <code>{endpoint}</code>
                          </td>
                          <td>{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No endpoint usage yet.">
                  Run a supported request to populate endpoint-level totals.
                </Empty>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Recent activity & errors</h2>
                <span className="small muted">Most recent {data.logLimit} retained records</span>
              </div>
              {data.logs.length ? (
                <>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Operation</th>
                          <th>Status</th>
                          <th>Request ID</th>
                          <th>Accounting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.logs.slice(page * 15, page * 15 + 15).map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.at).toLocaleString()}</td>
                            <td>{log.message || log.endpoint || log.type}</td>
                            <td>
                              <Badge tone={log.status >= 400 ? 'red' : 'neutral'}>
                                {log.status}
                              </Badge>
                            </td>
                            <td>
                              <code>{log.requestId || '—'}</code>
                            </td>
                            <td>
                              {log.cost
                                ? `${log.cost.contentRequests} content · ${log.cost.audioBytes} bytes · ${log.cost.astrologyCredits} astrology`
                                : 'No usage charge'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button
                      className="button subtle small-button"
                      disabled={!page}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {page + 1}</span>
                    <button
                      className="button subtle small-button"
                      disabled={(page + 1) * 15 >= data.logs.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <Empty title="No activity recorded.">
                  Events will show status and request identifiers. Secrets and exact birth details
                  are never placed in these general logs.
                </Empty>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}

function Billing() {
  const { session } = useConsole();
  const config = useLoad<{ plans: Plan[]; astrology: Addon[] }>('/api/config'),
    billing = useLoad<{ monthlyTotal: number; notice: string }>('/api/billing');
  if (!session) return null;
  return (
    <>
      <PageTitle
        eyebrow="SUBSCRIPTION"
        title="Billing & plans"
        copy="Content, audio delivery, and proposed astrology are separate allowances."
      />
      <ErrorNotice message={config.error || billing.error} />
      <div className="billing-summary panel">
        <div>
          <span className="eyebrow">CURRENT WORKSPACE PLAN</span>
          <h2>{session.plan.name}</h2>
          <p>
            {session.mode === 'demo'
              ? 'Local demo plan · No subscription or payment'
              : 'Server-assigned plan · Billing provider not connected'}
          </p>
        </div>
        <dl>
          <div>
            <dt>Content plan</dt>
            <dd>${session.plan.price}/month</dd>
          </div>
          <div>
            <dt>Astrology add-on</dt>
            <dd>Not active · $0</dd>
          </div>
          <div className="total">
            <dt>Displayed monthly total</dt>
            <dd>${billing.data?.monthlyTotal ?? session.plan.price}/month</dd>
          </div>
        </dl>
      </div>
      <div className="notice">
        {billing.data?.notice ||
          'Billing configuration is required. No payments or entitlement upgrades are enabled.'}{' '}
        Billing dates, renewal details, and invoices are unavailable without real provider records.
      </div>
      <div className="section-title">
        <h2>Monthly content plans</h2>
        <span>All allowances reset monthly</span>
      </div>
      {config.loading ? (
        <Loading />
      ) : (
        <div className="plan-grid">
          {config.data?.plans.map((plan) => (
            <article
              className={`plan-card ${plan.name === session.plan.name ? 'current' : ''}`}
              key={plan.name}
            >
              <h3>{plan.name}</h3>
              <div className="plan-price">
                {plan.price ? `$${plan.price}` : 'Free'}
                <small>{plan.price ? '/ month' : 'Sandbox'}</small>
              </div>
              <ul>
                <li>{plan.requests} content requests</li>
                <li>
                  {plan.audio}
                  {plan.price ? ' audio delivery' : ''}
                </li>
                <li>{plan.catalog}</li>
                <li>
                  {plan.products} {plan.price ? 'customer products' : ''}
                </li>
                <li>{plan.support}</li>
              </ul>
              <button className="button outline" disabled>
                {plan.name === session.plan.name
                  ? 'Current workspace plan'
                  : 'Billing setup required'}
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="footnote">
        Paid content plans include the full available catalog of mantras, shlokas, sacred audio,
        shastras/books, and discovery, subject to the documented content license. A customer product
        is an app or website. Audio allowances measure data delivery, not storage.
      </p>
      <div className="section-title">
        <h2>Astrology add-ons</h2>
        <Badge tone="saffron">PURCHASES DISABLED</Badge>
      </div>
      <div className="addon-grid">
        {config.data?.astrology.map((addon) => (
          <article className="panel addon-card" key={addon.id}>
            <Badge>PROPOSED</Badge>
            <h3>{addon.name}</h3>
            <strong>
              ${addon.price}
              <small>/month</small>
            </strong>
            <p>{addon.credits.toLocaleString()} provisional monthly credits</p>
            <p>
              With {addon.plan}: <b>${addon.combined}/month</b>
            </p>
            <button className="button outline" disabled>
              Not available for purchase
            </button>
          </article>
        ))}
      </div>
      <div className="notice">
        Credit allowances are provisional. Purchases cannot activate until endpoint credit costs,
        accounting policy, and billing configuration are confirmed.
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Invoices</h2>
        </div>
        <Empty title="No billing records are connected.">
          No paid status, renewal date, or invoice is inferred from a browser redirect.
        </Empty>
      </section>
    </>
  );
}

function Products() {
  const { session, refresh } = useConsole();
  const [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState('');
  if (!session) return null;
  async function register(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      f = new FormData(form);
    setPending(true);
    setError('');
    try {
      await mutate('/api/products', 'POST', {
        name: f.get('name'),
        type: f.get('type'),
        environment: f.get('environment'),
      });
      form.reset();
      await refresh();
      setNotice('Product registered in this workspace.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Product registration failed.');
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    setPending(true);
    try {
      await mutate(`/api/products/${id}`, 'DELETE');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove product.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CUSTOMER PRODUCTS"
        title="Apps & websites"
        copy="Register the products covered by your workspace. Limits are enforced by the server."
      />
      <div className="plan-strip">
        <div>
          <span className="strip-label">CURRENT PLAN</span>
          <strong>{session.plan.name}</strong>
        </div>
        <div>
          <span className="strip-label">REGISTERED PRODUCTS</span>
          <strong>
            {session.workspace.products.length}{' '}
            {session.allowance.products !== null
              ? `/ ${session.allowance.products}`
              : '· Testing only'}
          </strong>
        </div>
      </div>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel form-panel">
        <h2>Register a product</h2>
        <form className="inline-form" onSubmit={register}>
          <label>
            Product name
            <input name="name" maxLength={80} placeholder="Your app or website" required />
          </label>
          <label>
            Type
            <select name="type">
              <option value="app">App</option>
              <option value="website">Website</option>
            </select>
          </label>
          <label>
            Environment
            <select name="environment">
              <option value="sandbox">Sandbox / testing</option>
              <option value="production" disabled={!session.plan.price}>
                Production
              </option>
            </select>
          </label>
          <button className="button" disabled={pending}>
            {pending ? 'Saving…' : 'Register product'}
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Registered products</h2>
        </div>
        {session.workspace.products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Environment</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {session.workspace.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.type}</td>
                    <td>
                      <Badge>{p.environment}</Badge>
                    </td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <button
                        className="text-button danger"
                        disabled={pending}
                        onClick={() => remove(p.id)}
                      >
                        Remove registration
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No products registered yet.">
            Sandbox is for testing only. Paid plans cover the stated number of apps or websites.
          </Empty>
        )}
      </section>
    </>
  );
}
function Settings() {
  const { session, config, refresh } = useConsole();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  if (!session) return null;
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const r = await mutate<{ notice: string }>('/api/settings', 'PATCH', {
        name: f.get('name'),
        emailNotifications: f.get('notifications') === 'on',
        usageAlertThreshold: Number(f.get('threshold')),
      });
      await refresh();
      setNotice(r.notice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settings could not be saved.');
    } finally {
      setPending(false);
    }
  }
  async function reset() {
    if (!config?.firebase || !session) return;
    setPending(true);
    try {
      const firebase = await import('../lib/firebase');
      await firebase.resetPassword(config.firebase, session.user.email);
      setNotice('If your account exists, check your email for password-reset instructions.');
    } catch {
      setError('Reset could not be requested. Check Firebase configuration.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE & ACCOUNT"
        title="Settings"
        copy="Keep workspace details and preferences in one place."
      />
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="settings-grid">
        <section className="panel form-panel">
          <h2>Workspace details</h2>
          <form onSubmit={save}>
            <label>
              Workspace name
              <input name="name" defaultValue={session.workspace.name} maxLength={80} required />
            </label>
            <label>
              Usage alert threshold (%)
              <input
                name="threshold"
                type="number"
                min="10"
                max="100"
                step="1"
                defaultValue={session.workspace.preferences.usageAlertThreshold}
                required
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="notifications"
                defaultChecked={session.workspace.preferences.emailNotifications}
              />
              Email usage notifications
            </label>
            <p className="small muted">
              Preferences are stored server-side. Notification delivery is not connected yet.
            </p>
            <button className="button" disabled={pending}>
              {pending ? 'Saving…' : 'Save preferences'}
            </button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Account</h2>
          <dl className="account-details">
            <dt>Email</dt>
            <dd>{session.user.email}</dd>
            <dt>Access</dt>
            <dd>{session.user.admin ? 'Administrator' : 'Workspace owner'}</dd>
            <dt>Session</dt>
            <dd>
              {session.mode === 'demo'
                ? 'Local demo session · 8 hours'
                : 'Firebase session cookie · up to 5 days'}
            </dd>
          </dl>
          <button
            className="button outline"
            onClick={reset}
            disabled={pending || !config?.firebase}
          >
            Send password-reset email
          </button>
          {!config?.firebase && (
            <p className="small muted">
              Real account actions require Firebase configuration. Demo login has no password.
            </p>
          )}
          <p className="small muted">
            API credentials and session cookies are never stored in browser local storage.
          </p>
        </section>
      </div>
    </>
  );
}
function Administrator() {
  const { session } = useConsole();
  return session?.user.admin ? (
    <AdminControls />
  ) : (
    <>
      <PageTitle
        eyebrow="ACCESS CONTROL"
        title="Administrator access required"
        copy="This account does not have administrator permissions."
      />
      <div className="notice error" role="alert">
        Administrator operations are enforced by the backend. Contact your administrator for access.
      </div>
    </>
  );
}
function AdminControls() {
  const { session } = useConsole();
  const workspaces = useLoad<{
    workspaces: {
      id: string;
      name: string;
      plan: string;
      products: number;
      usage: { contentRequests: number; audioBytes: number; astrologyCredits: number };
    }[];
  }>('/api/admin/workspaces');
  const settings = useLoad<{
    config: {
      credits: Record<string, number>;
      costsConfirmed: boolean;
      billingConfigured: boolean;
    };
  }>('/api/admin/astrology');
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const r = await mutate<{ notice: string }>('/api/admin/astrology', 'PATCH', {
        credits: {
          starter: Number(f.get('starter')),
          growth: Number(f.get('growth')),
          business: Number(f.get('business')),
        },
      });
      setNotice(r.notice);
      await settings.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save proposed credits.');
    } finally {
      setPending(false);
    }
  }
  async function provision(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setPending(true);
    try {
      await mutate('/api/admin/workspaces', 'POST', { name: f.get('name'), email: f.get('email') });
      await workspaces.reload();
      setNotice('Workspace assigned to the existing Firebase account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not provision workspace.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION · PRIVILEGED"
        title="Administrator workspace"
        copy="Customer workspaces, proposed configuration, and connection status. Every action is authorized server-side."
      />
      <ErrorNotice message={error || workspaces.error || settings.error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Customer workspaces</h2>
          <Badge>FIRST 100 RECORDS</Badge>
        </div>
        {workspaces.loading ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Content plan</th>
                  <th>Products</th>
                  <th>Content requests</th>
                  <th>Audio delivery</th>
                  <th>Astrology credits</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.data?.workspaces.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <strong>{w.name}</strong>
                      <code className="table-code">{w.id}</code>
                    </td>
                    <td>{w.plan}</td>
                    <td>{w.products}</td>
                    <td>{w.usage.contentRequests}</td>
                    <td>{formatBytes(w.usage.audioBytes)}</td>
                    <td>{w.usage.astrologyCredits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="settings-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <h2>Astrology configuration</h2>
            <Badge tone="saffron">PROPOSED ONLY</Badge>
          </div>
          {settings.loading ? (
            <Loading />
          ) : (
            <form onSubmit={save}>
              {['starter', 'growth', 'business'].map((id) => (
                <label key={id}>
                  {id.charAt(0).toUpperCase() + id.slice(1)} provisional monthly credits
                  <input
                    type="number"
                    name={id}
                    min="1"
                    max="10000000"
                    step="1"
                    defaultValue={settings.data?.config.credits[id]}
                    required
                  />
                </label>
              ))}
              <p className="small muted">
                These settings do not activate an add-on, set endpoint costs, or grant purchased
                credits. Paid purchases remain disabled.
              </p>
              <button className="button" disabled={pending}>
                Save proposed allowances
              </button>
            </form>
          )}
        </section>
        <section className="panel prose">
          <div className="panel-heading">
            <h2>Integration status</h2>
          </div>
          <ul className="integration-status">
            <li>
              <span>Authentication & metadata</span>
              <Badge tone="green">
                {session?.mode === 'demo' ? 'Local demo' : 'Firebase / Firestore'}
              </Badge>
            </li>
            <li>
              <span>Production catalog</span>
              <Badge>Not connected</Badge>
            </li>
            <li>
              <span>Cloud Storage audio delivery</span>
              <Badge>Not connected</Badge>
            </li>
            <li>
              <span>Billing provider</span>
              <Badge>Setup required</Badge>
            </li>
            <li>
              <span>Astrology engine</span>
              <Badge tone="green">Sandbox available</Badge>
            </li>
          </ul>
          <Link href="/billing" className="text-link">
            Review plan definitions →
          </Link>
        </section>
      </div>
      <section className="panel form-panel">
        <h2>Provision a customer workspace</h2>
        <p className="small muted">
          Use an existing Firebase Authentication account. This does not create a paid subscription
          or change entitlements.
        </p>
        <form className="inline-form" onSubmit={provision}>
          <label>
            Customer email
            <input name="email" type="email" required disabled={session?.mode === 'demo'} />
          </label>
          <label>
            Workspace name
            <input name="name" maxLength={80} required disabled={session?.mode === 'demo'} />
          </label>
          <button className="button" disabled={pending || session?.mode === 'demo'}>
            Assign Sandbox workspace
          </button>
        </form>
        {session?.mode === 'demo' && (
          <p className="small muted">Customer provisioning is unavailable in local demo mode.</p>
        )}
      </section>
    </>
  );
}
function Docs() {
  return (
    <>
      <PageTitle
        eyebrow="INTEGRATION GUIDE"
        title="Start with a clear contract."
        copy="What works in this console, and what needs a production connection."
      />
      <div className="overview-grid">
        <section className="panel prose">
          <h2>1. Keep your API key on your server</h2>
          <p>
            Create a named sandbox key, save the one-time secret, and keep it in your server
            environment or Secret Manager. Only the secure hash is retained by this console.
          </p>
          <h2>2. Try the local fixture endpoint</h2>
          <p>
            In local demo mode, the playground calls the implemented GET /api/demo/catalog endpoint
            using a sandbox key. It returns clearly labeled text, audio-metadata, or book fixtures.
            Successful requests consume one nonbillable demo content request.
          </p>
          <Link href="/playground" className="text-link">
            Open playground →
          </Link>
          <h2>3. Confirm the production API</h2>
          <p>
            Production catalog endpoints, licensing, audio delivery, and real API metering are not
            connected. Confirm the actual schema, source rights, authentication contract, and
            accounting policy before integrating a customer product.
          </p>
        </section>
        <section className="panel prose">
          <h2>Distinct usage meters</h2>
          <p>
            Content requests, audio data delivery, and astrology credits are recorded separately.
            Usage reservations and API key status checks are atomic on the backend. Failed demo
            requests consume no allowance.
          </p>
          <h2>Astrology integration</h2>
          <p>
            The server implements POST /api/v1/astrology/calculate with sandbox API-key
            authentication, and the console uses POST /api/astrology/calculate with its protected
            session. Choose positions or panchang, supply an ISO date-time with an explicit offset,
            and optionally supply ayanamsaDegrees. A successful calculation consumes one nonbillable
            sandbox astrology credit. Inputs and results are not stored in general logs. Paid add-on
            purchases remain disabled.
          </p>
          <h2>Account access</h2>
          <p>
            Public registration is disabled. In Firebase mode, administrators assign existing users
            to workspaces. Login exchanges a recently authenticated Firebase ID token for an
            HTTP-only server session. Logout invalidates the stored session.
          </p>
          <Link href="/settings" className="text-link">
            Account settings →
          </Link>
        </section>
      </div>
    </>
  );
}
const screens: Record<string, () => ReactNode> = {
  overview: Overview,
  keys: Keys,
  explorer: Explorer,
  playground: Playground,
  astrology: Astrology,
  usage: Usage,
  billing: Billing,
  products: Products,
  settings: Settings,
  admin: Administrator,
  docs: Docs,
};
export default function Screen({ page }: { page: string }) {
  const Component = screens[page];
  return Component ? (
    <Component />
  ) : (
    <Empty title="Page unavailable.">Return to the workspace overview.</Empty>
  );
}
