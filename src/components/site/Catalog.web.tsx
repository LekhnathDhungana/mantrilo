import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Arrow, KeyButton } from './Chrome.web';
import { CodePanel } from './Code.web';
import { useHydrated } from './useHydrated';
import { AREAS, type Area, type Item } from '../../data/library';
import { astrologySlug } from '../../data/astrology-pages';

// The catalog used by /library and /astrology-api. Search, area, facet and the open item all live
// in the URL, so links are shareable and browser back returns to the same filtered list.

// Every astrology capability has its own reference page; other items open in place.
const itemPage = (item: Item) =>
  item.area === 'astrology'
    ? `/astrology-api/${astrologySlug(item.id.replace(/^astrology-/, ''))}`
    : null;

type Params = { q?: string; area?: string; facet?: string; item?: string };

const clean = (params: Params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value)) as Record<string, string>;

export function useCatalogParams() {
  return useLocalSearchParams<Params>();
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

export function Availability({ item }: { item: Item }) {
  if (item.area !== 'astrology') return <span className="mh-chip mh-chip-ok">Available</span>;
  return item.limited ? (
    <span className="mh-chip mh-chip-limited">Limited</span>
  ) : (
    <span className="mh-chip mh-chip-ok">Available</span>
  );
}

export function CatalogBrowser({
  pathname,
  items,
  fixedArea,
  placeholder = 'Search mantras, books, audio and astrology',
  intro,
}: {
  pathname: string;
  items: Item[];
  fixedArea?: Area;
  placeholder?: string;
  intro?: (area: Area | undefined) => React.ReactNode;
}) {
  const routeParams = useCatalogParams();
  const hydrated = useHydrated();
  const params = hydrated ? routeParams : {};

  const area = (fixedArea ?? AREAS.find((a) => a.id === params.area)?.id) as Area | undefined;
  const urlQuery = params.q ?? '';
  const [draft, setDraft] = useState<{ value: string; initialQuery: string }>();
  const draftValue = draft?.initialQuery === urlQuery ? draft.value : undefined;
  const text = draftValue ?? urlQuery;
  useEffect(() => {
    if (draftValue === undefined || draftValue === urlQuery) return;
    const timer = setTimeout(() => router.setParams({ q: draftValue || undefined }), 200);
    return () => clearTimeout(timer);
  }, [draftValue, urlQuery]);
  const q = useDeferredValue(text.trim().toLowerCase());
  const inArea = useMemo(() => items.filter((item) => !area || item.area === area), [items, area]);
  const facets = useMemo(() => [...new Set(inArea.map((item) => item.facet))], [inArea]);
  const facet = area && facets.includes(params.facet ?? '') ? params.facet : undefined;
  const shown = inArea.filter(
    (item) =>
      (!facet || item.facet === facet) &&
      (!q ||
        [item.title, item.summary, item.id, item.type, item.facet]
          .join(' ')
          .toLowerCase()
          .includes(q)),
  );
  const open = items.find((item) => item.id === params.item);
  const listParams = clean({
    q: text.trim() || undefined,
    area: fixedArea ? undefined : area,
    facet,
  });

  if (open) return <ItemDetail item={open} back={{ pathname, params: listParams }} />;

  const count = (id: Area) =>
    items.filter(
      (item) =>
        item.area === id &&
        (!q || [item.title, item.summary, item.id].join(' ').toLowerCase().includes(q)),
    ).length;

  return (
    <div className="mh-catalog">
      <div className="mh-catalog-bar">
        <label className="mh-search mh-search-lg">
          <SearchIcon />
          <span className="mh-sr">Search the catalog</span>
          <input
            className="mh-input"
            type="search"
            placeholder={placeholder}
            value={text}
            onChange={(event) => setDraft({ value: event.target.value, initialQuery: urlQuery })}
          />
        </label>
        {!fixedArea && (
          <div className="mh-segment" role="group" aria-label="Product area">
            <button
              type="button"
              aria-pressed={!area}
              onClick={() => router.setParams({ area: undefined, facet: undefined })}
            >
              All <span className="mh-count">{AREAS.reduce((n, a) => n + count(a.id), 0)}</span>
            </button>
            {AREAS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={area === a.id}
                onClick={() => router.setParams({ area: a.id, facet: undefined })}
              >
                {a.label} <span className="mh-count">{count(a.id)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {area && facets.length > 1 && (
        <div className="mh-chips" role="group" aria-label="Filter">
          <button
            type="button"
            className="mh-chip"
            aria-pressed={!facet}
            onClick={() => router.setParams({ facet: undefined })}
          >
            All
          </button>
          {facets.map((f) => (
            <button
              key={f}
              type="button"
              className="mh-chip"
              aria-pressed={facet === f}
              onClick={() => router.setParams({ facet: f })}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {intro?.(area)}

      <p className="mh-catalog-count" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'result' : 'results'}
        {q && <> for “{text.trim()}”</>}
      </p>

      {shown.length ? (
        <ul className="mh-results">
          {shown.map((item) => (
            <li key={item.id}>
              <Link
                push
                href={
                  itemPage(item) ?? {
                    pathname,
                    params: { ...listParams, item: item.id },
                  }
                }
                className="mh-result"
              >
                <span className={`mh-type mh-type-${item.area}`}>{item.type}</span>
                <span className="mh-result-main">
                  <b>{item.title}</b>
                  <span>{item.summary}</span>
                </span>
                <span className="mh-result-meta">
                  <code>
                    {item.method} {item.path.replace(/\?.*$/, '')}
                  </code>
                  {item.limited && <span className="mh-chip mh-chip-limited">Limited</span>}
                </span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mh-empty">
          <p>
            <b>Nothing matches{q ? ` “${text.trim()}”` : ' this filter'}.</b>
          </p>
          <p>Try a broader word, another area, or clear the filters.</p>
          <button
            type="button"
            className="mh-btn mh-btn-ghost"
            onClick={() => {
              router.setParams({ q: undefined, facet: undefined });
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

export function ItemDetail({
  item,
  back,
}: {
  item: Item;
  back: { pathname: string; params: Record<string, string> };
}) {
  // Opening an item swaps the list for its detail, so bring the detail's top into view.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (node && node.getBoundingClientRect().top < 0) node.scrollIntoView({ block: 'start' });
  }, [item.id]);
  return (
    <article className="mh-detail" ref={ref}>
      <Link href={back} className="mh-back">
        <span aria-hidden="true">←</span> Back to results
      </Link>
      <div className="mh-detail-grid">
        <div className="mh-detail-copy">
          <p className="mh-detail-type">
            <span className={`mh-type mh-type-${item.area}`}>{item.type}</span>
            <Availability item={item} />
            {item.facet && <span className="mh-chip">{item.facet}</span>}
          </p>
          <h2>{item.title}</h2>
          <p className="mh-page-lede">{item.summary}</p>
          <h3>Inputs</h3>
          <p>{item.inputs}</p>
          {item.render && (
            <>
              <h3>Using the response</h3>
              <p>{item.render}</p>
            </>
          )}
          {item.usage && (
            <>
              <h3>Quota</h3>
              <p>{item.usage}</p>
            </>
          )}
          {item.limited && (
            <p className="mh-callout mh-callout-warn">
              Limited: this Mantrilo operation may be unavailable. It returns 503
              astrology_operation_unavailable when it is, and is not charged.
            </p>
          )}
          <div className="mh-actions">
            {item.sandbox ? (
              <a className="mh-btn mh-btn-primary" href={item.sandbox}>
                Try in Sandbox <Arrow />
              </a>
            ) : (
              !item.limited && <KeyButton>Get a sandbox key</KeyButton>
            )}
            <Link className="mh-btn mh-btn-ghost" href={item.guide}>
              Implementation guide <Arrow />
            </Link>
            <Link className="mh-btn mh-btn-ghost" href={item.docs}>
              Endpoint reference <Arrow />
            </Link>
          </div>
        </div>
        <div className="mh-detail-code">
          <CodePanel title={item.path} method={item.method} code={item.request} />
          <CodePanel title={item.responseLabel} status="200 OK" json={item.response} />
        </div>
      </div>
      {item.steps && (
        <section className="mh-detail-steps" aria-label="Paginate and open a book">
          <h3>Paginate, then open a book, chapter or verse</h3>
          <ol className="mh-flow">
            {item.steps.map((step, i) => (
              <li key={step.label}>
                <p>
                  <span className="mh-flow-n">{i + 1}</span> {step.label}
                </p>
                <CodePanel title={step.label} method="GET" code={step.request} />
                {step.response !== undefined && (
                  <details>
                    <summary>Show response</summary>
                    <CodePanel title="Response" status="200 OK" json={step.response} />
                  </details>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
