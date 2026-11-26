import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Link } from '../../i18n/Link.web';
import { Arrow, KeyButton } from './Chrome.web';
import { CodePanel } from './Code.web';
import { useHydrated } from './useHydrated';
import { AREAS, type Area, type Item } from '../../data/library';
import { astrologySlug } from '../../data/astrology-pages';
import { useI18n } from '../../i18n';
import { guideText } from '../../i18n/guides';
import { allGuides } from './Guides.web';
import type { TFunction } from 'i18next';

// An item's wording in the page's language. Titles that come from the API (a mantra's title and
// description, collection and operation names) are shown as returned.
export function itemText(t: TFunction, item: Item) {
  const guide = allGuides.find((g) => g.id === item.guideId);
  const text = guide && guideText(t, guide);
  const key = `library.items.${item.id}`;
  const collection = item.id.startsWith('collection-') ? item.id.slice(11) : null;
  return {
    type: t(`library.types.${item.type}`) || item.type,
    facet: t(`library.facets.${item.facet}`) || item.facet,
    title:
      item.id === 'recording'
        ? t('library.items.recording.title', { title: item.title.replace(/^Recording · /, '') })
        : t(`${key}.title`) || item.title,
    summary:
      item.area === 'astrology' && text
        ? text.summary
        : collection
          ? t(`library.collections.${collection}`) || item.summary
          : t(`${key}.summary`) || item.summary,
    inputs: text?.inputs ?? item.inputs,
    render: text?.render ?? item.render,
    usage: text?.usage ?? item.usage,
    responseLabel:
      item.area === 'astrology' && text
        ? text.sampleLabel
        : t(`library.responseLabels.${item.responseLabel}`) || item.responseLabel,
  };
}

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
  const { t } = useI18n();
  return item.area === 'astrology' && item.limited ? (
    <span className="mh-chip mh-chip-limited">{t('docs.limited')}</span>
  ) : (
    <span className="mh-chip mh-chip-ok">{t('library.available')}</span>
  );
}

export function CatalogBrowser({
  pathname,
  items,
  fixedArea,
  placeholder,
  intro,
}: {
  pathname: string;
  items: Item[];
  fixedArea?: Area;
  placeholder?: string;
  intro?: (area: Area | undefined) => React.ReactNode;
}) {
  const i18n = useI18n();
  const { t } = i18n;
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
  // Search matches the English and the translated wording.
  const haystack = (item: Item) => {
    const shownText = itemText(t, item);
    return [
      item.title,
      item.summary,
      item.id,
      item.type,
      item.facet,
      shownText.title,
      shownText.summary,
      shownText.type,
      shownText.facet,
    ]
      .join(' ')
      .toLowerCase();
  };
  const shown = inArea.filter(
    (item) => (!facet || item.facet === facet) && (!q || haystack(item).includes(q)),
  );
  const open = items.find((item) => item.id === params.item);
  const listParams = clean({
    q: text.trim() || undefined,
    area: fixedArea ? undefined : area,
    facet,
  });

  if (open) return <ItemDetail item={open} back={{ pathname, params: listParams }} />;

  const count = (id: Area) =>
    items.filter((item) => item.area === id && (!q || haystack(item).includes(q))).length;

  return (
    <div className="mh-catalog">
      <div className="mh-catalog-bar">
        <label className="mh-search mh-search-lg">
          <SearchIcon />
          <span className="mh-sr">{t('library.searchLabel')}</span>
          <input
            className="mh-input"
            type="search"
            placeholder={placeholder ?? t('library.searchPlaceholder')}
            value={text}
            onChange={(event) => setDraft({ value: event.target.value, initialQuery: urlQuery })}
          />
        </label>
        {!fixedArea && (
          <div className="mh-segment" role="group" aria-label={t('library.area')}>
            <button
              type="button"
              aria-pressed={!area}
              onClick={() => router.setParams({ area: undefined, facet: undefined })}
            >
              {t('library.all')}{' '}
              <span className="mh-count">
                {i18n.number(AREAS.reduce((n, a) => n + count(a.id), 0))}
              </span>
            </button>
            {AREAS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={area === a.id}
                onClick={() => router.setParams({ area: a.id, facet: undefined })}
              >
                {t(`library.areas.${a.id}`)}{' '}
                <span className="mh-count">{i18n.number(count(a.id))}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {area && facets.length > 1 && (
        <div className="mh-chips" role="group" aria-label={t('library.filter')}>
          <button
            type="button"
            className="mh-chip"
            aria-pressed={!facet}
            onClick={() => router.setParams({ facet: undefined })}
          >
            {t('library.all')}
          </button>
          {facets.map((f) => (
            <button
              key={f}
              type="button"
              className="mh-chip"
              aria-pressed={facet === f}
              onClick={() => router.setParams({ facet: f })}
            >
              {t(`library.facets.${f}`) || f}
            </button>
          ))}
        </div>
      )}

      {intro?.(area)}

      <p className="mh-catalog-count" aria-live="polite">
        {q
          ? t('library.resultsFor', {
              count: shown.length,
              n: i18n.number(shown.length),
              query: text.trim(),
            })
          : t('library.results', { count: shown.length, n: i18n.number(shown.length) })}
      </p>

      {shown.length ? (
        <ul className="mh-results">
          {shown.map((item) => {
            const shownText = itemText(t, item);
            return (
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
                  <span className={`mh-type mh-type-${item.area}`}>{shownText.type}</span>
                  <span className="mh-result-main">
                    <b>{shownText.title}</b>
                    <span>{shownText.summary}</span>
                  </span>
                  <span className="mh-result-meta">
                    <code>
                      {item.method} {item.path.replace(/\?.*$/, '')}
                    </code>
                    {item.limited && (
                      <span className="mh-chip mh-chip-limited">{t('docs.limited')}</span>
                    )}
                  </span>
                  <Arrow />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mh-empty">
          <p>
            <b>{q ? t('library.noMatchQuery', { query: text.trim() }) : t('library.noMatch')}</b>
          </p>
          <p>{t('library.noMatchHint')}</p>
          <button
            type="button"
            className="mh-btn mh-btn-ghost"
            onClick={() => {
              router.setParams({ q: undefined, facet: undefined });
            }}
          >
            {t('library.clear')}
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
  const { t } = useI18n();
  const text = itemText(t, item);
  // Opening an item swaps the list for its detail, so bring the detail's top into view.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (node && node.getBoundingClientRect().top < 0) node.scrollIntoView({ block: 'start' });
  }, [item.id]);
  return (
    <article className="mh-detail" ref={ref}>
      <Link href={back} className="mh-back">
        <span aria-hidden="true" className="mh-flip">
          ←
        </span>{' '}
        {t('library.back')}
      </Link>
      <div className="mh-detail-grid">
        <div className="mh-detail-copy">
          <p className="mh-detail-type">
            <span className={`mh-type mh-type-${item.area}`}>{text.type}</span>
            <Availability item={item} />
            {item.facet && <span className="mh-chip">{text.facet}</span>}
          </p>
          <h2>{text.title}</h2>
          <p className="mh-page-lede">{text.summary}</p>
          <h3>{t('library.inputs')}</h3>
          <p>{text.inputs}</p>
          {text.render && (
            <>
              <h3>{t('library.using')}</h3>
              <p>{text.render}</p>
            </>
          )}
          {text.usage && (
            <>
              <h3>{t('guide.step4')}</h3>
              <p>{text.usage}</p>
            </>
          )}
          {item.limited && <p className="mh-callout mh-callout-warn">{t('library.limited')}</p>}
          <div className="mh-actions">
            {item.sandbox ? (
              <a className="mh-btn mh-btn-primary" href={item.sandbox}>
                {t('library.trySandbox')} <Arrow />
              </a>
            ) : (
              !item.limited && <KeyButton>{t('library.getSandboxKey')}</KeyButton>
            )}
            <Link className="mh-btn mh-btn-ghost" href={item.guide}>
              {t('library.guide')} <Arrow />
            </Link>
            <Link className="mh-btn mh-btn-ghost" href={item.docs}>
              {t('guide.reference')} <Arrow />
            </Link>
          </div>
        </div>
        <div className="mh-detail-code">
          <CodePanel title={item.path} method={item.method} code={item.request} />
          <CodePanel title={text.responseLabel} status="200 OK" json={item.response} />
        </div>
      </div>
      {item.steps && (
        <section className="mh-detail-steps" aria-label={t('library.steps.label')}>
          <h3>{t('library.steps.title')}</h3>
          <ol className="mh-flow">
            {item.steps.map((step, i) => (
              <li key={step.label}>
                <p>
                  <span className="mh-flow-n">{i + 1}</span> {t(`library.steps.${i}`) || step.label}
                </p>
                <CodePanel
                  title={t(`library.steps.${i}`) || step.label}
                  method="GET"
                  code={step.request}
                />
                {step.response !== undefined && (
                  <details>
                    <summary>{t('library.showResponse')}</summary>
                    <CodePanel title={t('code.response')} status="200 OK" json={step.response} />
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
