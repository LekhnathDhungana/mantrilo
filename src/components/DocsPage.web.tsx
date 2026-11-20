import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { guideHref } from '../data/public-guides';
import { useHydrated } from './site/useHydrated';
import type { Guide } from '../../developer/src/data/integrations';
import { Arrow, Callout, DataTable, KeyButton, SiteFrame } from './site/Chrome.web';
import { GOALS, GuideView, findGuide, guideSandboxHref } from './site/Guides.web';
import { CodePanel } from './site/Code.web';
import { plans } from '../data/plans';
import { consoleUrl, consoleSandboxUrl } from '../data/site';
import { astrologyPositionsExample, errors, rateLimits } from '../data/api-reference';
import { epicBooks } from '../../developer/src/data/epic-books';
import {
  audioResponse,
  bookResponse,
  chapterResponse,
  collectionRequest,
  collectionResponse,
  collections,
  curlGet,
  curlPost,
  MANTRA_ID,
  mantraListResponse,
  mantraResponse,
} from '../data/examples';

// Public docs: guides by goal (/docs?guide=…) and the API reference, under one sidebar. Each
// endpoint keeps its parameters, request and response together.
// Contracts mirror developer/api/server.mjs, developer/api/content.mjs and developer/server/pustak.mjs.

type Param = [name: string, where: string, rule: string];
type Endpoint = {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  summary: ReactNode;
  params: Param[];
  request: string;
  response: unknown;
  status?: string;
  key?: boolean;
  notes?: ReactNode;
};

const ENDPOINTS: Endpoint[] = [
  {
    id: 'api-info',
    method: 'GET',
    path: '/v1',
    summary: 'The API name, version and resource list. Useful as a health check.',
    params: [],
    key: false,
    request: 'curl "$MANTRILO_API_URL/v1"',
    response: {
      name: 'Mantrilo API',
      version: '1',
      authentication: 'Authorization: Bearer <your Mantrilo API key>',
      resources: ['/v1/mantras', '/v1/books?collection={collection}', '…'],
    },
  },
  {
    id: 'list-mantras',
    method: 'GET',
    path: '/v1/mantras',
    summary: 'Mantras and shlokas, in a stable order. Each item is a summary without verses.',
    params: [
      ['limit', 'query', 'Integer, 1–100. Default 20.'],
      ['cursor', 'query', 'The nextCursor from the previous page.'],
      ['deity', 'query', 'A deity id, such as shiva or annapurna. Exact match.'],
    ],
    request: curlGet('/v1/mantras?limit=1'),
    response: mantraListResponse,
  },
  {
    id: 'get-mantra',
    method: 'GET',
    path: '/v1/mantras/{id}',
    summary:
      'One mantra with its verses. Any text field can be null, so render only what is present.',
    params: [['id', 'path', 'The mantra id from a list response.']],
    request: curlGet(`/v1/mantras/${MANTRA_ID}`),
    response: mantraResponse,
    notes: (
      <>
        <code>description</code> is the mantra’s short public summary. It is <code>null</code> when
        a record has none.
      </>
    ),
  },
  {
    id: 'mantra-audio',
    method: 'GET',
    path: '/v1/mantras/{id}/audio',
    summary:
      'The recording for a mantra whose audio field is not null. Without format=json the response is a 302 redirect to the file.',
    params: [
      ['id', 'path', 'The mantra id.'],
      ['format', 'query', 'json returns the signed link as JSON instead of redirecting.'],
    ],
    request: curlGet(`/v1/mantras/${MANTRA_ID}/audio?format=json`),
    response: audioResponse,
    notes: 'Links last 15 minutes. Each link counts its file size toward your audio allowance.',
  },
  {
    id: 'list-books',
    method: 'GET',
    path: '/v1/books',
    summary:
      'Live books in catalog order. Filter by collection to call a set such as the Upanishads directly.',
    params: [
      ['collection', 'query', `A collection id: ${collections.map((c) => c.id).join(', ')}.`],
      ['limit', 'query', 'Integer, 1–100. Default 24.'],
      ['cursor', 'query', 'The nextCursor from the previous page.'],
    ],
    request: collectionRequest('upanishads'),
    response: collectionResponse,
    notes:
      'Sandbox keys list Isha Upanishad and the Bhagavad Gita. Other collections may return no sandbox titles.',
  },
  {
    id: 'get-book',
    method: 'GET',
    path: '/v1/books/{id}',
    summary: 'A book summary with its chapter index. Use the chapter numbers to request text.',
    params: [['id', 'path', 'The book id from a list response.']],
    request: curlGet('/v1/books/ishaUpanishad'),
    response: bookResponse,
    notes: (
      <>
        <code>preview</code> is <code>true</code> for sandbox keys, which see the opening chapter
        only.
      </>
    ),
  },
  {
    id: 'get-chapter',
    method: 'GET',
    path: '/v1/books/{id}/chapters/{chapter}',
    summary: 'A page of up to 30 verses or a complete chapter of a prose retelling.',
    params: [
      ['id', 'path', 'The book id.'],
      ['chapter', 'path', 'A chapter number from the book’s chapter index.'],
      ['offset', 'query', 'For verses, pass nextOffset from the previous page. Omit for prose.'],
    ],
    request: curlGet('/v1/books/ishaUpanishad/chapters/1'),
    response: chapterResponse,
    notes: (
      <>
        Sandbox keys read the first three verses of the opening chapter of sample books.{' '}
        <a href="#epic-retellings">Ramayana and Mahabharata</a> require a live key.
      </>
    ),
  },
  {
    id: 'astrology-catalog',
    method: 'GET',
    path: '/v1/astrology',
    summary:
      'The current operation catalog, with IDs, categories, and sample inputs where available.',
    params: [],
    key: false,
    request: 'curl "$MANTRILO_API_URL/v1/astrology"',
    response: {
      data: [
        { id: 'positions', name: 'Planetary positions', description: '…' },
        {
          id: 'vedic-panchang',
          name: 'Panchang',
          category: 'Vedic',
          availability: 'available',
          example: { '…': '…' },
        },
      ],
    },
  },
  {
    id: 'astrology-calculate',
    method: 'POST',
    path: '/v1/astrology/calculate',
    summary: (
      <>
        Run one operation. Send <code>operation</code> and that operation’s inputs as JSON. Each
        operation’s inputs are on the <Link href="/astrology-api">Astrology page</Link>.
      </>
    ),
    params: [
      ['operation', 'body', 'An operation id from GET /v1/astrology.'],
      ['datetime', 'body', 'For positions and panchang: ISO 8601 with seconds and a UTC offset.'],
      ['…', 'body', 'Other inputs depend on the operation.'],
    ],
    request: curlPost('/v1/astrology/calculate', {
      operation: 'positions',
      datetime: '2026-11-10T12:00:00+05:30',
    }),
    response: astrologyPositionsExample,
    notes: 'Failed calculations are not charged.',
  },
];

const GROUPS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Get started',
    links: [
      ['quickstart', 'Quickstart'],
      ['guides', 'Guides by goal'],
      ['authentication', 'Authentication'],
      ['environments', 'Sandbox and live'],
    ],
  },
  {
    title: 'Concepts',
    links: [
      ['pagination', 'Pagination'],
      ['epic-retellings', 'Ramayana and Mahabharata'],
      ['errors', 'Errors'],
      ['limits', 'Usage limits'],
    ],
  },
  {
    title: 'Endpoints',
    links: ENDPOINTS.map((e) => [e.id, `${e.method} ${e.path}`]),
  },
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
        const first = ids.find((id) => seen.get(id));
        if (first) setActive(first);
      },
      { rootMargin: '-80px 0px -65% 0px' },
    );
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function DocsNav({ guide }: { guide?: string }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const ids = useMemo(() => GROUPS.flatMap((g) => g.links.map(([id]) => id)), []);
  const active = useActiveSection(guide ? [] : ids);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const q = query.trim().toLowerCase();
  const groups = GROUPS.map((g) => ({
    ...g,
    links: g.links.filter(([, label]) => !q || label.toLowerCase().includes(q)),
  })).filter((g) => g.links.length);
  const goals = GOALS.filter((g) => !q || g.goal.toLowerCase().includes(q));
  return (
    <nav className="mh-docs-nav" aria-label="Documentation">
      <label className="mh-search">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <span className="mh-sr">Search the docs</span>
        <input
          ref={input}
          className="mh-input"
          type="search"
          placeholder="Search docs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const first = groups[0]?.links[0]?.[0];
              if (first) window.location.hash = first;
            }
          }}
        />
        <kbd aria-hidden="true">⌘K</kbd>
      </label>
      {goals.length > 0 && (
        <div className="mh-docs-group">
          <p>Guides</p>
          <ul>
            {goals.map((g) => (
              <li key={g.id}>
                <Link
                  push
                  href={guideHref(g.id)}
                  aria-current={guide === g.id ? 'page' : undefined}
                >
                  {g.goal}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {groups.map((group) => (
        <div key={group.title} className="mh-docs-group">
          <p>{group.title}</p>
          <ul>
            {group.links.map(([id, label]) =>
              guide ? (
                <li key={id}>
                  <Link href={`/docs#${id}`}>{label}</Link>
                </li>
              ) : (
                <li key={id}>
                  <a href={`#${id}`} aria-current={active === id ? 'location' : undefined}>
                    {label}
                  </a>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
      {!groups.length && !goals.length && (
        <p className="mh-docs-none">No sections match “{query}”.</p>
      )}
    </nav>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mh-docs-section">
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  );
}

function EndpointSection({ endpoint }: { endpoint: Endpoint }) {
  return (
    <section id={endpoint.id} className="mh-docs-section mh-endpoint">
      <div className="mh-endpoint-copy">
        <h3>
          <a href={`#${endpoint.id}`}>
            <span className={`mh-verb mh-verb-${endpoint.method.toLowerCase()}`}>
              {endpoint.method}
            </span>{' '}
            <code>{endpoint.path}</code>
          </a>
        </h3>
        <p>{endpoint.summary}</p>
        {endpoint.key === false && <span className="mh-chip mh-chip-ok">No key needed</span>}
        {endpoint.params.length > 0 ? (
          <dl className="mh-params">
            {endpoint.params.map(([name, where, rule]) => (
              <div key={name}>
                <dt>
                  <code>{name}</code> <span>{where}</span>
                </dt>
                <dd>{rule}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mh-muted">No parameters.</p>
        )}
        {endpoint.notes && <p className="mh-muted">{endpoint.notes}</p>}
      </div>
      <div className="mh-endpoint-code">
        <CodePanel title="Request" method={endpoint.method} code={endpoint.request} />
        {endpoint.method === 'GET' && (
          <a className="mh-back" href={`${consoleUrl}/docs?tab=try`}>
            Open the sandbox request tester <Arrow />
          </a>
        )}
        {endpoint.method === 'POST' && endpoint.id === 'astrology-calculate' && (
          <a className="mh-back" href={`${consoleUrl}/docs?tab=astrology&operation=positions`}>
            Try planetary positions in the sandbox <Arrow />
          </a>
        )}
        <CodePanel title="Response" status={endpoint.status ?? '200 OK'} json={endpoint.response} />
      </div>
    </section>
  );
}

export function GuideDocument({ guide, path }: { guide: Guide; path: string }) {
  const sandbox = guideSandboxHref(guide);
  return (
    <SiteFrame path={path}>
      <div className="mh-wrap mh-docs">
        <DocsNav guide={guide.id} />
        <article className="mh-docs-main" key={guide.id}>
          <header className="mh-docs-head">
            <p className="mh-eyebrow">
              <Link href="/docs#guides">Guides</Link> · {guide.area}
              {guide.limited && ' · Limited'}
            </p>
            <h1>{guide.name}</h1>
            <p className="mh-page-lede">{guide.summary}</p>
            {sandbox && <KeyButton href={sandbox}>Try this request in the sandbox</KeyButton>}
          </header>
          <GuideView guide={guide} />
        </article>
      </div>
    </SiteFrame>
  );
}

export default function DocsPage() {
  const { guide: requested } = useLocalSearchParams<{ guide?: string }>();
  const hydrated = useHydrated();
  const guide = hydrated ? findGuide(requested) : undefined;
  if (guide) {
    const destination = guideHref(guide.id);
    if (destination.startsWith('/docs/guides/')) return <Redirect href={destination} />;
    return <GuideDocument guide={guide} path="/docs" />;
  }
  return (
    <SiteFrame path="/docs">
      <div className="mh-wrap mh-docs">
        <DocsNav />
        <Reference />
      </div>
    </SiteFrame>
  );
}

function Reference() {
  const quickstart = curlGet('/v1/mantras?limit=1');
  // Arriving from a guide via a sidebar link (/docs#errors), jump to that section once the
  // navigation has settled; the router otherwise keeps the guide's scroll position.
  useEffect(() => {
    const timer = setTimeout(() => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView();
    }, 60);
    return () => clearTimeout(timer);
  }, []);
  return (
    <article className="mh-docs-main">
      <header className="mh-docs-head">
        <p className="mh-eyebrow">Docs</p>
        <h1>Make your first Mantrilo API request</h1>
        <p className="mh-page-lede">
          One REST API for mantras, sacred audio, scripture books and astrology. Start from a guide
          for what you’re building, or look up any endpoint. Examples show the response format. Some
          use excerpts or placeholders.
        </p>
      </header>

      <Section id="quickstart" title="Quickstart">
        <div className="mh-docs-split">
          <ol className="mh-steps">
            <li>
              <b>Get a key.</b> Every account starts with a sandbox key.{' '}
              <KeyButton
                href={consoleSandboxUrl({ preset: 'quickstart' })}
                className="mh-inline-link"
              >
                Open the sandbox quickstart
              </KeyButton>
            </li>
            <li>
              <b>Keep it on your server.</b> Set <code>MANTRILO_API_KEY</code> and{' '}
              <code>MANTRILO_API_URL</code> in your backend’s environment.
            </li>
            <li>
              <b>Make a request.</b> List one mantra, then follow{' '}
              <a href="#list-mantras">the endpoint reference</a> or a{' '}
              <a href="#guides">guide for your goal</a>.
            </li>
          </ol>
          <CodePanel
            title="Your first request"
            method="GET"
            code={quickstart.replace('$MANTRILO_API_URL', 'https://api.mantrilo.com')}
          />
        </div>
      </Section>

      <Section id="guides" title="Start from your goal">
        <p>
          Each guide starts with a request you can run, then shows the server code, pagination and
          quota.
        </p>
        <div className="mh-docs-goals">
          {GOALS.map((g) => (
            <Link
              key={g.id}
              push
              href={guideHref(g.id)}
              className="mh-card mh-card-pad mh-card-link"
            >
              <h3>{g.goal}</h3>
              <p>{findGuide(g.id)?.summary}</p>
              <span>
                Open guide <Arrow />
              </span>
            </Link>
          ))}
        </div>
        <p className="mh-muted">
          Astrology has a guide for every capability.{' '}
          <Link href="/astrology-api">Browse astrology capabilities</Link>
        </p>
      </Section>

      <Section id="authentication" title="Authentication">
        <p>
          Send your key on every request as <code>Authorization: Bearer YOUR_KEY</code>. The API
          blocks browser cross-origin calls, so call it from your server and pass only the content
          to your app. Never put a key in a web bundle, mobile app or repository. If a key leaks,
          regenerate it in the console; the old key stops working within a minute.
        </p>
      </Section>

      <Section id="environments" title="Sandbox and live">
        <DataTable
          label="Key environments"
          head={['Environment', 'Key prefix', 'What it reads']}
          codeFirst={false}
          rows={[
            [
              <span key="s" className="mh-chip mh-chip-accent">
                Sandbox
              </span>,
              <code key="p">mtr_sbx_</code>,
              'Sample mantras, the sample books’ opening verses, and available astrology operations. Every account has one.',
            ],
            [
              <span key="l" className="mh-chip mh-chip-ok">
                Live
              </span>,
              <code key="p">mtr_live_</code>,
              'The full available catalog. Issued with a paid plan.',
            ],
          ]}
        />
        <p className="mh-muted">
          Sandbox and live keep separate usage totals. A sandbox request for an item outside the
          sample returns <code>403 sandbox_sample_only</code>.
        </p>
      </Section>

      <Section id="pagination" title="Pagination">
        <div className="mh-docs-split">
          <div>
            <p>
              List endpoints return <code>nextCursor</code>. Pass it back as <code>cursor</code> to
              read the next page. It is <code>null</code> on the last page. Set the page size with{' '}
              <code>limit</code> (1–100).
            </p>
            <p>
              Chapter pages return <code>nextOffset</code>. Pass it back as <code>offset</code> to
              read more verses of the same chapter.
            </p>
          </div>
          <CodePanel
            title="Continue when nextCursor is present"
            method="GET"
            code={collectionRequest('upanishads', '&cursor={nextCursor}')}
          />
        </div>
      </Section>

      <Section id="errors" title="Errors">
        <div className="mh-docs-split">
          <p>
            Every error has the same shape. The <code>code</code> is stable; the{' '}
            <code>message</code> explains what to fix. Only successful responses count toward your
            plan.
          </p>
          <CodePanel
            title="Error"
            status="401"
            json={{
              error: { code: 'invalid_api_key', message: 'Send a valid API key.' },
              requestId: 'request-id',
            }}
          />
        </div>
        <DataTable label="API errors" head={['Status', 'Code', 'What to do']} rows={errors} />
      </Section>

      <Section id="limits" title="Usage limits">
        <p>
          Allowances apply to your whole workspace, not to each key, and reset monthly in UTC. Each
          successful content response or astrology calculation is one request. Each audio link also
          counts the file’s size.
        </p>
        <DataTable
          label="Plan limits"
          head={['Plan', 'Requests a month', 'Audio', 'Rate', 'Burst']}
          codeFirst={false}
          rows={plans.map((plan) => {
            const rate = rateLimits.find(([name]) => name === plan.name);
            return [plan.name, plan.requests, plan.audio, rate?.[1] ?? '—', rate?.[2] ?? '—'];
          })}
        />
        <p className="mh-muted">
          Responses include <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,{' '}
          <code>X-Quota-Requests-Remaining</code> and <code>X-Request-Id</code>. A{' '}
          <code>rate_limited</code> response adds <code>Retry-After</code>. Sandbox keys always use
          the Free rate. If your workspace has no monthly request cap,{' '}
          <code>X-Quota-Requests-Remaining</code> is <code>unlimited</code>.{' '}
          <Link href="/pricing">Compare plans</Link>
        </p>
      </Section>

      <Section id="epic-retellings" title="Ramayana and Mahabharata">
        <p>
          Use a live key to read these English prose retellings. Open a book for its chapter
          index, then use a chapter number to load the full chapter in one request.
        </p>
        {epicBooks.map(({ id, title, chapters }) => (
          <div key={id} id={`epic-${id}`}>
            <h3>{title}</h3>
            <p>{chapters} chapters</p>
            <CodePanel
              title={title + ' book and first chapter'}
              code={[curlGet('/v1/books/' + id), curlGet('/v1/books/' + id + '/chapters/1')].join('\n\n')}
            />
          </div>
        ))}
        <p>
          Books return <code>{'format: "prose"'}</code> and <code>{'language: "en"'}</code>. For a chapter,
          display <code>data.source</code> and iterate over <code>data.sections</code>. Render each
          section’s <code>title</code> and <code>paragraphs</code> in order. Prose chapters return
          an empty <code>verses</code> array and <code>nextOffset: null</code>.
        </p>
        <Link href="/docs/guides/book-reader">Book reader integration guide</Link>
      </Section>

      <section className="mh-docs-ref" aria-labelledby="endpoint-reference">
        <h2 id="endpoint-reference">Endpoint reference</h2>
        {ENDPOINTS.map((endpoint) => (
          <EndpointSection key={endpoint.id} endpoint={endpoint} />
        ))}
      </section>

      <Callout>
        Want to see what each content type returns first? Browse the{' '}
        <Link href="/library">Library</Link>.
      </Callout>
    </article>
  );
}
