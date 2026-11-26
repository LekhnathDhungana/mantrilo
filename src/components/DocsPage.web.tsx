import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Link } from '../i18n/Link.web';
import { guideHref } from '../data/public-guides';
import { useHydrated } from './site/useHydrated';
import type { Guide } from '../../developer/src/data/integrations';
import { Arrow, Callout, DataTable, KeyButton, SiteFrame } from './site/Chrome.web';
import { GOALS, GuideView, findGuide, guideSandboxHref } from './site/Guides.web';
import { CodePanel } from './site/Code.web';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';
import { guideText } from '../i18n/guides';
import { plans } from '../data/plans';
import { planName } from './site/Plans.web';
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

type Param = [name: string, where: string];
type Endpoint = {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  params: Param[];
  request: string;
  response: unknown;
  status?: string;
  key?: boolean;
  /** Whether docs.endpoints.<id>.notes exists. */
  notes?: boolean;
};

// Each endpoint's summary, parameter rules and notes are under docs.endpoints.<id> in the locale
// files; the inline markup (<code>, <link>) is rendered by DocText.
const ENDPOINTS: Endpoint[] = [
  {
    id: 'api-info',
    method: 'GET',
    path: '/v1',
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
    params: [
      ['limit', 'query'],
      ['cursor', 'query'],
      ['deity', 'query'],
    ],
    request: curlGet('/v1/mantras?limit=1'),
    response: mantraListResponse,
  },
  {
    id: 'get-mantra',
    method: 'GET',
    path: '/v1/mantras/{id}',
    params: [['id', 'path']],
    request: curlGet(`/v1/mantras/${MANTRA_ID}`),
    response: mantraResponse,
    notes: true,
  },
  {
    id: 'mantra-audio',
    method: 'GET',
    path: '/v1/mantras/{id}/audio',
    params: [
      ['id', 'path'],
      ['format', 'query'],
    ],
    request: curlGet(`/v1/mantras/${MANTRA_ID}/audio?format=json`),
    response: audioResponse,
    notes: true,
  },
  {
    id: 'list-books',
    method: 'GET',
    path: '/v1/books',
    params: [
      ['collection', 'query'],
      ['limit', 'query'],
      ['cursor', 'query'],
    ],
    request: collectionRequest('upanishads'),
    response: collectionResponse,
    notes: true,
  },
  {
    id: 'get-book',
    method: 'GET',
    path: '/v1/books/{id}',
    params: [['id', 'path']],
    request: curlGet('/v1/books/ishaUpanishad'),
    response: bookResponse,
    notes: true,
  },
  {
    id: 'get-chapter',
    method: 'GET',
    path: '/v1/books/{id}/chapters/{chapter}',
    params: [
      ['id', 'path'],
      ['chapter', 'path'],
      ['offset', 'query'],
    ],
    request: curlGet('/v1/books/ishaUpanishad/chapters/1'),
    response: chapterResponse,
    notes: true,
  },
  {
    id: 'astrology-catalog',
    method: 'GET',
    path: '/v1/astrology',
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
    params: [
      ['operation', 'body'],
      ['datetime', 'body'],
      ['…', 'body'],
    ],
    request: curlPost('/v1/astrology/calculate', {
      operation: 'positions',
      datetime: '2026-11-10T12:00:00+05:30',
    }),
    response: astrologyPositionsExample,
    notes: true,
  },
];

// A docs sentence with inline markup: <code>…</code>, <link>…</link> (the Astrology page),
// <epic>…</epic> (the epic retellings section) and other in-page anchors.
function DocText({ text }: { text: string }) {
  return (
    <Rich
      text={text}
      tags={{
        code: <code />,
        link: <Link href="/astrology-api" />,
        epic: <a href="#epic-retellings" />,
        library: <Link href="/library" />,
        pricing: <Link href="/pricing" />,
        endpoints: <a href="#list-mantras" />,
        goals: <a href="#guides" />,
      }}
    />
  );
}

const paramKey = (name: string) => (name === '…' ? 'other' : name);

const GROUPS: { title: string; links: [string, string][] }[] = [
  {
    title: 'docs.nav.getStarted',
    links: [
      ['quickstart', 'docs.nav.quickstart'],
      ['guides', 'footer.guides'],
      ['authentication', 'docs.nav.authentication'],
      ['environments', 'docs.nav.environments'],
    ],
  },
  {
    title: 'docs.nav.concepts',
    links: [
      ['pagination', 'docs.nav.pagination'],
      ['epic-retellings', 'docs.nav.epics'],
      ['errors', 'docs.nav.errors'],
      ['limits', 'docs.nav.limits'],
    ],
  },
  {
    title: 'docs.nav.endpoints',
    // Endpoint links are "GET /v1/mantras": HTTP verbs and paths are not translated.
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
  const { t } = useI18n();
  const label = (key: string) =>
    key.startsWith('docs.') || key.startsWith('footer.') ? t(key) : key;
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
    links: g.links.filter(([, key]) => !q || label(key).toLowerCase().includes(q)),
  })).filter((g) => g.links.length);
  const goals = GOALS.filter((g) => !q || t(g.goalKey).toLowerCase().includes(q));
  return (
    <nav className="mh-docs-nav" aria-label={t('docs.nav.label')}>
      <label className="mh-search">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <span className="mh-sr">{t('docs.nav.searchLabel')}</span>
        <input
          ref={input}
          className="mh-input"
          type="search"
          placeholder={t('docs.nav.search')}
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
          <p>{t('docs.nav.guides')}</p>
          <ul>
            {goals.map((g) => (
              <li key={g.id}>
                <Link
                  push
                  href={guideHref(g.id)}
                  aria-current={guide === g.id ? 'page' : undefined}
                >
                  {t(g.goalKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {groups.map((group) => (
        <div key={group.title} className="mh-docs-group">
          <p>{t(group.title)}</p>
          <ul>
            {group.links.map(([id, key]) =>
              guide ? (
                <li key={id}>
                  <Link href={`/docs#${id}`}>{label(key)}</Link>
                </li>
              ) : (
                <li key={id}>
                  <a href={`#${id}`} aria-current={active === id ? 'location' : undefined}>
                    {label(key)}
                  </a>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
      {!groups.length && !goals.length && (
        <p className="mh-docs-none">{t('docs.nav.none', { query })}</p>
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
  const { t } = useI18n();
  const key = `docs.endpoints.${endpoint.id}`;
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
        <p>
          <DocText text={t(`${key}.summary`)} />
        </p>
        {endpoint.key === false && <span className="mh-chip mh-chip-ok">{t('docs.noKey')}</span>}
        {endpoint.params.length > 0 ? (
          <dl className="mh-params">
            {endpoint.params.map(([name, where]) => (
              <div key={name}>
                <dt>
                  {/* Parameter names and locations (query, path, body) are API terms. */}
                  <code>{name}</code> <span>{where}</span>
                </dt>
                <dd>
                  <DocText
                    text={t(`${key}.params.${paramKey(name)}`, {
                      collections: collections.map((c) => c.id).join(', '),
                    })}
                  />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mh-muted">{t('docs.noParams')}</p>
        )}
        {endpoint.notes && (
          <p className="mh-muted">
            <DocText text={t(`${key}.notes`)} />
          </p>
        )}
      </div>
      <div className="mh-endpoint-code">
        <CodePanel title={t('code.request')} method={endpoint.method} code={endpoint.request} />
        {endpoint.method === 'GET' && (
          <a className="mh-back" href={`${consoleUrl}/docs?tab=try`}>
            {t('docs.tester')} <Arrow />
          </a>
        )}
        {endpoint.method === 'POST' && endpoint.id === 'astrology-calculate' && (
          <a className="mh-back" href={`${consoleUrl}/docs?tab=astrology&operation=positions`}>
            {t('docs.tryPositions')} <Arrow />
          </a>
        )}
        <CodePanel
          title={t('code.response')}
          status={endpoint.status ?? '200 OK'}
          json={endpoint.response}
        />
      </div>
    </section>
  );
}

export function GuideDocument({ guide, path }: { guide: Guide; path: string }) {
  const { t } = useI18n();
  const text = guideText(t, guide);
  const sandbox = guideSandboxHref(guide);
  return (
    <SiteFrame path={path}>
      <div className="mh-wrap mh-docs">
        <DocsNav guide={guide.id} />
        <article className="mh-docs-main" key={guide.id}>
          <header className="mh-docs-head">
            <p className="mh-eyebrow">
              <Link href="/docs#guides">{t('docs.nav.guides')}</Link> ·{' '}
              {t(`docs.areas.${guide.area}`)}
              {guide.limited && ` · ${t('docs.limited')}`}
            </p>
            <h1>{text.name}</h1>
            <p className="mh-page-lede">{text.summary}</p>
            {sandbox && <KeyButton href={sandbox}>{t('guide.trySandbox')}</KeyButton>}
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
  const i18n = useI18n();
  const { t, number } = i18n;
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
        <p className="mh-eyebrow">{t('nav.docs')}</p>
        <h1>{t('docs.title')}</h1>
        <p className="mh-page-lede">{t('docs.lede')}</p>
      </header>

      <Section id="quickstart" title={t('docs.nav.quickstart')}>
        <div className="mh-docs-split">
          <ol className="mh-steps">
            <li>
              <Rich text={t('docs.quick.key')} tags={{ b: <b /> }} />{' '}
              <KeyButton
                href={consoleSandboxUrl({ preset: 'quickstart' })}
                className="mh-inline-link"
              >
                {t('docs.quick.open')}
              </KeyButton>
            </li>
            <li>
              <Rich
                text={t('docs.quick.server')}
                tags={{
                  b: <b />,
                  key: <code>MANTRILO_API_KEY</code>,
                  url: <code>MANTRILO_API_URL</code>,
                }}
              />
            </li>
            <li>
              <Rich
                text={t('docs.quick.request')}
                tags={{
                  b: <b />,
                  endpoints: <a href="#list-mantras" />,
                  goals: <a href="#guides" />,
                }}
              />
            </li>
          </ol>
          <CodePanel
            title={t('docs.quick.first')}
            method="GET"
            code={quickstart.replace('$MANTRILO_API_URL', 'https://api.mantrilo.com')}
          />
        </div>
      </Section>

      <Section id="guides" title={t('docs.goals.title')}>
        <p>{t('docs.goals.copy')}</p>
        <div className="mh-docs-goals">
          {GOALS.map((g) => (
            <Link
              key={g.id}
              push
              href={guideHref(g.id)}
              className="mh-card mh-card-pad mh-card-link"
            >
              <h3>{t(g.goalKey)}</h3>
              <p>
                {(() => {
                  const found = findGuide(g.id);
                  return found ? guideText(t, found).summary : null;
                })()}
              </p>
              <span>
                {t('docs.goals.open')} <Arrow />
              </span>
            </Link>
          ))}
        </div>
        <p className="mh-muted">
          {t('docs.goals.astrology')}{' '}
          <Link href="/astrology-api">{t('docs.goals.browseAstrology')}</Link>
        </p>
      </Section>

      <Section id="authentication" title={t('docs.nav.authentication')}>
        <p>
          <Rich
            text={t('docs.auth')}
            tags={{ header: <code>Authorization: Bearer YOUR_KEY</code> }}
          />
        </p>
      </Section>

      <Section id="environments" title={t('docs.nav.environments')}>
        <DataTable
          label={t('docs.env.label')}
          head={[t('docs.env.environment'), t('docs.env.prefix'), t('docs.env.reads')]}
          codeFirst={false}
          rows={[
            [
              <span key="s" className="mh-chip mh-chip-accent">
                {t('plans.sandbox')}
              </span>,
              <code key="p">mtr_sbx_</code>,
              t('docs.env.sandbox'),
            ],
            [
              <span key="l" className="mh-chip mh-chip-ok">
                {t('docs.env.live')}
              </span>,
              <code key="p">mtr_live_</code>,
              t('docs.env.liveReads'),
            ],
          ]}
        />
        <p className="mh-muted">
          <DocText text={t('docs.env.note')} />
        </p>
      </Section>

      <Section id="pagination" title={t('docs.nav.pagination')}>
        <div className="mh-docs-split">
          <div>
            <p>
              <DocText text={t('docs.pagination.cursor')} />
            </p>
            <p>
              <DocText text={t('docs.pagination.offset')} />
            </p>
          </div>
          <CodePanel
            title={t('docs.pagination.example')}
            method="GET"
            code={collectionRequest('upanishads', '&cursor={nextCursor}')}
          />
        </div>
      </Section>

      <Section id="errors" title={t('docs.nav.errors')}>
        <div className="mh-docs-split">
          <p>
            <DocText text={t('docs.errors.copy')} />
          </p>
          <CodePanel
            title={t('docs.errors.example')}
            status="401"
            json={{
              error: { code: 'invalid_api_key', message: 'Send a valid API key.' },
              requestId: 'request-id',
            }}
          />
        </div>
        <DataTable
          label={t('docs.errors.label')}
          head={[t('docs.errors.status'), t('docs.errors.code'), t('docs.errors.fix')]}
          rows={errors.map(([status, codes]) => [
            status,
            codes,
            t(`docs.errors.rows.${codes.split(',')[0]}`),
          ])}
        />
      </Section>

      <Section id="limits" title={t('docs.nav.limits')}>
        <p>{t('docs.limits.copy')}</p>
        <DataTable
          label={t('docs.limits.label')}
          head={[
            t('docs.limits.plan'),
            t('docs.limits.requests'),
            t('docs.limits.audio'),
            t('docs.limits.rate'),
            t('docs.limits.burst'),
          ]}
          codeFirst={false}
          rows={plans.map((plan) => {
            const rate = rateLimits.find(([name]) => name === plan.name);
            const n = (value: string) => number(Number(value.replace(/\D/g, '')));
            return [
              planName(i18n, plan.name),
              n(plan.requests),
              plan.price ? plan.audio : t('plans.sampleAudioOnly'),
              rate ? t('plans.perSecond', { rate: n(rate[1]) }) : '—',
              rate ? n(rate[2]) : '—',
            ];
          })}
        />
        <p className="mh-muted">
          <DocText text={t('docs.limits.headers')} />{' '}
          <Link href="/pricing">{t('pricing.compare')}</Link>
        </p>
      </Section>

      <Section id="epic-retellings" title={t('docs.nav.epics')}>
        <p>{t('docs.epics.copy')}</p>
        {epicBooks.map(({ id, title, chapters }) => (
          <div key={id} id={`epic-${id}`}>
            <h3>{title}</h3>
            <p>{t('docs.epics.chapters', { count: chapters, n: number(chapters) })}</p>
            <CodePanel
              title={t('docs.epics.example', { title })}
              code={[curlGet('/v1/books/' + id), curlGet('/v1/books/' + id + '/chapters/1')].join(
                '\n\n',
              )}
            />
          </div>
        ))}
        <p>
          <DocText text={t('docs.epics.format')} />
        </p>
        <Link href="/docs/guides/book-reader">{t('docs.epics.guide')}</Link>
      </Section>

      <section className="mh-docs-ref" aria-labelledby="endpoint-reference">
        <h2 id="endpoint-reference">{t('guide.reference')}</h2>
        {ENDPOINTS.map((endpoint) => (
          <EndpointSection key={endpoint.id} endpoint={endpoint} />
        ))}
      </section>

      <Callout>
        <DocText text={t('docs.libraryCallout')} />
      </Callout>
    </article>
  );
}
