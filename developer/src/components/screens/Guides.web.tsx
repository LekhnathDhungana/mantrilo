import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { contentGuides, curl, productionApi, type Guide } from '../../data/integrations';
import {
  epicPromptFeatures,
  implementationPrompt,
  type PromptFeature,
} from '../../data/implementation-prompts';
import {
  CodeExample,
  GuideLinks,
  Reference,
  ServerIntegration,
  useAstrologyCatalog,
} from '../IntegrationExamples.web';
import { useConsole } from '../Session.web';
import { primaryKey, type Environment } from '../Account.web';
import { Badge, CopyButton, Empty, PageTitle } from '../ui.web';

// The Guides tab of Docs: a quickstart, then one guide per thing a developer might build.

const AREAS = ['All', 'Mantras', 'Audio', 'Books', 'Astrology'] as const;
export const guideHref = (guide: string) => ({ pathname: '/docs', params: { guide } }) as const;

export function GuideIndex({ onTry }: { onTry: () => void }) {
  const { guides } = useAstrologyCatalog();
  const { config } = useConsole();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<(typeof AREAS)[number]>('All');
  const [limit, setLimit] = useState(16);
  const base = config?.apiUrl ?? productionApi;
  const visible = [...contentGuides, ...guides].filter(
    (guide) =>
      (area === 'All' || guide.area === area) &&
      [guide.name, guide.summary, guide.area, guide.category, guide.library.item]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <section className="panel integration-panel integration-quickstart">
        <h2>Quickstart</h2>
        <ol>
          <li>
            Copy your sandbox key from <Link href="/keys">API keys</Link>. Paid workspaces also have
            a live key.
          </li>
          <li>
            Keep it in your backend’s environment as <code>MANTRILO_API_KEY</code>. Never ship it in
            an app or website.
          </li>
          <li>
            Call <code>{base}</code> with <code>Authorization: Bearer $MANTRILO_API_KEY</code>.
          </li>
        </ol>
        <CodeExample
          title="List five mantras"
          code={curl(contentGuides[0], base)}
          label="Copy quickstart"
        />
        <p>
          <button className="text-button" onClick={onTry}>
            Or run it here with your key →
          </button>
        </p>
      </section>
      <section className="integration-index" aria-labelledby="guide-index">
        <h2 id="guide-index">What are you building?</h2>
        <p>Open a guide to copy an AI implementation prompt for that feature.</p>
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
                href={guideHref(guide.id)}
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

export function GuidePage({ id }: { id: string }) {
  const { guides, runnable, loaded } = useAstrologyCatalog();
  const selected = [...contentGuides, ...guides].find((guide) => guide.id === id);
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
  if (!loaded)
    return (
      <p className="small muted" role="status">
        Loading guide…
      </p>
    );
  return (
    <Empty title="Guide unavailable">
      <Link href="/docs">Browse all guides</Link>
    </Empty>
  );
}

function GuideDetail({ guide, sandbox }: { guide: Guide; sandbox: boolean }) {
  const { session } = useConsole();
  return (
    <div className="library-item integration-detail">
      <nav className="library-crumbs" aria-label="Breadcrumb">
        <Link href="/docs">← All guides</Link>
      </nav>
      <PageTitle eyebrow={guide.category ?? guide.area} title={guide.name} copy={guide.summary} />
      <GuideLinks guide={guide} sandbox={sandbox} />
      <section className="panel integration-panel">
        <h2>Build with an AI coding assistant</h2>
        <p>Paste a prompt into your coding assistant and fill in your project details.</p>
        <PromptCopy feature={guide} />
        {guide.id === 'book-reader' &&
          epicPromptFeatures.map((feature) => (
            <PromptCopy key={feature.id} feature={feature} title={feature.name} />
          ))}
      </section>
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
            {session.allowance.requests === null
              ? 'This workspace has unlimited monthly requests.'
              : `Your ${session.plan.name} plan: ${session.allowance.requests.toLocaleString()} requests per month.`}{' '}
            <Link href="/billing">View usage and plan details</Link>
          </p>
        )}
      </section>
      <Reference guide={guide} />
      <ServerIntegration guide={guide} />
    </div>
  );
}

function PromptCopy({ feature, title }: { feature: PromptFeature; title?: string }) {
  const { config, session } = useConsole();
  const prompt = implementationPrompt(feature);
  const environments: Environment[] = feature.liveOnly ? ['production'] : ['sandbox', 'production'];
  const choices =
    config?.mode === 'firebase' && session && !feature.limited
      ? environments.flatMap((environment) => {
          if (environment === 'production' && !session.liveAccess) return [];
          const secret = primaryKey(session, environment)?.secret;
          return secret ? [{ environment, secret }] : [];
        })
      : [];
  return (
    <div className="integration-example integration-prompt">
      {title && <h3>{title}</h3>}
      <div className="integration-actions">
        <CopyButton key={prompt} text={prompt} label="Copy AI prompt" />
        {choices.map((choice) => (
          <CopyButton
            key={choice.environment}
            text={() => implementationPrompt(feature, choice)}
            label={choice.environment === 'production' ? 'Copy with live key' : 'Copy with sandbox key'}
          />
        ))}
      </div>
      {choices.length > 0 && (
        <p className="small muted">Only include your key if you trust the tool receiving the prompt.</p>
      )}
      <details>
        <summary>Preview prompt</summary>
        <pre tabIndex={0}>
          <code>{prompt}</code>
        </pre>
      </details>
    </div>
  );
}
