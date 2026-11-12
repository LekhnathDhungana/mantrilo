import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { contentGuides, curl, productionApi, type Guide } from '../../data/integrations';
import {
  CodeExample,
  GuideLinks,
  Reference,
  ServerIntegration,
  useAstrologyCatalog,
} from '../IntegrationExamples.web';
import { useConsole } from '../Session.web';
import { Badge, Empty, PageTitle } from '../ui.web';

const AREAS = ['All', 'Mantras', 'Audio', 'Books', 'Astrology'] as const;

export default function Implementation() {
  const { guide: id } = useLocalSearchParams<{ guide?: string }>();
  const { guides, runnable } = useAstrologyCatalog();
  const { config } = useConsole();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<(typeof AREAS)[number]>('All');
  const [limit, setLimit] = useState(16);
  const all = [...contentGuides, ...guides];
  const selected = all.find((guide) => guide.id === id);
  const visible = all.filter(
    (guide) =>
      (area === 'All' || guide.area === area) &&
      [guide.name, guide.summary, guide.area, guide.category, guide.library.item]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  if (selected)
    return (
      <GuideDetail
        guide={selected}
        sandbox={selected.area === 'Astrology' && runnable.has(selected.library.item!)}
      />
    );
  if (id)
    return (
      <Empty title="Guide unavailable">
        <Link href="/implementation">Browse implementation guides</Link>
      </Empty>
    );
  return (
    <>
      <PageTitle
        eyebrow="BUILD WITH MANTRILO"
        title="Implementation"
        copy="Pick what you want to build. Get a working request, a backend example, and the fields to show in your app."
      />
      <section className="panel integration-panel integration-quickstart">
        <h2>Quickstart</h2>
        <ol>
          <li>
            Copy your sandbox key from <Link href="/keys">API keys</Link>. Paid workspaces also have
            a live key.
          </li>
          <li>
            Use <code>{config?.apiUrl ?? productionApi}</code>.{' '}
            {config?.mode === 'demo'
              ? 'The local demo uses sandbox keys and placeholder data.'
              : 'Hosted sandbox and live keys use the same URL.'}{' '}
            Send <code>Authorization: Bearer $MANTRILO_API_KEY</code> from your backend.
          </li>
          <li>
            Set <code>MANTRILO_API_KEY</code> in your terminal, then make your first request.
          </li>
        </ol>
        {!config?.apiUrl && (
          <p className="small muted">
            This preview has no public API configured. The examples target the hosted API and
            require a key issued there.
          </p>
        )}
        <details className="integration-steps">
          <summary>Show first request</summary>
          <CodeExample
            title="List five mantras"
            code={curl(contentGuides[0], config?.apiUrl ?? productionApi)}
            label="Copy quickstart"
          />
        </details>
      </section>
      <section className="integration-index" aria-labelledby="guide-index">
        <h2 id="guide-index">What are you building?</h2>
        <div className="library-filters integration-filters">
          <div className="library-field">
            <label htmlFor="guide-search">Search guides</label>
            <input
              id="guide-search"
              type="search"
              placeholder="e.g. book reader or birth chart"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(16);
              }}
            />
          </div>
          <div className="library-field">
            <label htmlFor="guide-area">Product area</label>
            <select
              id="guide-area"
              value={area}
              onChange={(e) => {
                setArea(e.target.value as typeof area);
                setLimit(16);
              }}
            >
              {AREAS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="library-status" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'guide' : 'guides'}
        </p>
        {visible.length ? (
          <div className="panel library-results integration-results">
            {visible.slice(0, limit).map((guide) => (
              <Link
                key={guide.id}
                className="library-row integration-row"
                href={{ pathname: '/implementation', params: { guide: guide.id } }}
              >
                <span className="library-title">
                  <strong>{guide.name}</strong>
                  <small>{guide.summary}</small>
                </span>
                <span className="integration-row-meta">
                  <Badge>{guide.category ?? guide.area}</Badge>
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
            {visible.length > limit && (
              <div className="library-more">
                <button className="button subtle" onClick={() => setLimit((n) => n + 16)}>
                  Show more guides
                </button>
              </div>
            )}
          </div>
        ) : (
          <Empty title="No matching guides">Try a different search or product area.</Empty>
        )}
      </section>
    </>
  );
}

function GuideDetail({ guide, sandbox }: { guide: Guide; sandbox: boolean }) {
  const { session } = useConsole();
  return (
    <div className="library-item integration-detail">
      <nav className="library-crumbs" aria-label="Breadcrumb">
        <Link href="/implementation">← All implementation guides</Link>
      </nav>
      <PageTitle eyebrow={guide.category ?? guide.area} title={guide.name} copy={guide.summary} />
      <GuideLinks guide={guide} sandbox={sandbox} />
      <section className="panel integration-panel">
        <h2>Plans and usage</h2>
        <p>
          {guide.limited
            ? 'Currently unavailable for sandbox and live keys.'
            : guide.area === 'Astrology'
              ? 'Sandbox and paid live keys can call this operation when enabled. Live keys require an active paid plan.'
              : 'Sandbox keys return the sample catalog. A paid live key unlocks the full catalog. Sandbox lists can end after the first page because the sample is limited.'}
        </p>
        {guide.area === 'Astrology' && !guide.limited && !sandbox && (
          <p>This operation cannot be run from the sandbox in this workspace.</p>
        )}
        {!guide.limited && <p>{guide.usage}</p>}
        {session && (
          <p className="small muted">
            Your {session.plan.name} plan: {session.allowance.requests.toLocaleString()} requests
            per month. <Link href="/billing">View usage and plan details</Link>
          </p>
        )}
        <p className="small muted">
          Use the <Link href="/keys">API key</Link> from your workspace and keep it in your
          backend’s environment.
        </p>
      </section>
      <Reference guide={guide} />
      <ServerIntegration guide={guide} />
    </div>
  );
}
