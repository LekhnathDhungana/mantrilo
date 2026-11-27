import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Link } from '../i18n/Link.web';
import { KeyButton, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { itemText } from './site/Catalog.web';
import { CodeTabs, EndpointPill, Ribbon, Ring, Stats } from './site/Shlokam.web';
import { SkyWheel, skyFrom } from './site/SkyWheel.web';
import { useHydrated } from './site/useHydrated';
import { consoleSandboxUrl } from '../data/site';
import { astrologyCategories, astrologyItems, type Item } from '../data/library';
import { astrologyPages } from '../data/astrology-pages';
import { astrologySnippets } from '../data/astrology-snippets';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';

// /astrology-api: every astrology capability, in the mantra library's design (shlokam.css).
// The hero draws the Sun and Moon from the positions and panchang samples; the list below keeps
// every capability in the exported HTML and only hides the ones a filter excludes.

const ENDPOINT = '/v1/astrology/calculate';
const byId = new Map(astrologyItems.map((item) => [item.id, item]));
const pathOf = new Map(astrologyPages.map((page) => [`astrology-${page.operation}`, page.path]));
const operationOf = (item: Item) => item.id.replace(/^astrology-/, '');
const available = astrologyItems.filter((item) => !item.limited).length;
const positions = byId.get('astrology-positions');
const sky = skyFrom(positions?.response, byId.get('astrology-panchang')?.response);

// Sanskrit names: each category's part of Jyotisha, and the featured calculations.
const CATEGORY_SANSKRIT: Record<string, string> = {
  Core: 'गणित',
  Vedic: 'वैदिक',
  Western: 'पाश्चात्य',
  Numerology: 'अङ्कविद्या',
  Utilities: 'साधन',
};
const FEATURED: [string, string][] = [
  ['astrology-positions', 'ग्रहस्थिति'],
  ['astrology-panchang', 'पञ्चाङ्ग'],
  ['astrology-daily-panchang', 'दैनिक पञ्चाङ्ग'],
  ['astrology-chart', 'जन्मकुण्डली'],
  ['astrology-match', 'गुणमिलान'],
  ['astrology-chart-image', 'कुण्डली चित्र'],
];
const code = { code: <code /> };
const sorted = [...astrologyItems].sort((a, b) => a.title.localeCompare(b.title, 'en'));

export default function AstrologyPage() {
  const { t, number } = useI18n();
  // Links from capability pages and the old catalog carry ?facet= and ?q=. The static HTML can't
  // know them, so they apply once the page has hydrated; the visitor's own choices then win.
  const routeParams = useLocalSearchParams<{ facet?: string; q?: string }>();
  const fromUrl = useHydrated() ? routeParams : {};
  const [picked, setFacet] = useState<string>();
  const [typed, setQuery] = useState<string>();
  const [onlySandbox, setOnlySandbox] = useState(false);
  const urlFacet = astrologyCategories.includes(fromUrl.facet ?? '') ? fromUrl.facet! : '';
  const facet = picked ?? urlFacet;
  const query = typed ?? fromUrl.q ?? '';

  const facetName = (id: string) => t(`library.facets.${id}`) || id;
  const counts = new Map(
    astrologyCategories.map((id) => [id, astrologyItems.filter((i) => i.facet === id).length]),
  );
  const most = Math.max(...counts.values(), 1);
  const needle = query.trim().toLowerCase();
  const matches = (item: Item) =>
    (!facet || item.facet === facet) &&
    (!onlySandbox || !!item.sandbox) &&
    (!needle ||
      [item.title, itemText(t, item).title, operationOf(item)].some((value) =>
        value.toLowerCase().includes(needle),
      ));
  const shown = astrologyItems.filter(matches).length;

  const pick = (id: string) => {
    const next = facet === id ? '' : id;
    setFacet(next);
    if (!next) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('all')?.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
  };

  return (
    <SiteFrame path="/astrology-api">
      <section className="mx-hero">
        <Ribbon />
        <div className="mh-wrap mx-hero-grid">
          <div>
            <nav className="mh-crumbs mx-rise" aria-label={t('chrome.breadcrumb')}>
              <Link href="/">{t('chrome.crumbHome')}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{t('nav.astrology')}</span>
            </nav>
            <div className="mx-chips mx-rise mx-d1">
              <span className="mx-chip">
                <span lang="sa-Deva" className="mh-deva">
                  ज्योतिष
                </span>
                {t('meta./astrology-api.label')}
              </span>
            </div>
            <h1 className="mx-rise mx-d2">{t('astroPage.title')}</h1>
            <p className="mx-lede mx-rise mx-d3">{t('astroPage.lede')}</p>
            <div className="mx-rise mx-d4">
              <EndpointPill method="POST" path={ENDPOINT} />
            </div>
            <div className="mx-actions mx-rise mx-d5">
              <KeyButton href={consoleSandboxUrl({ operation: 'positions' })}>
                {t('astroPage.tryPositions')}
              </KeyButton>
              <a href="#all" className="mh-btn mh-btn-ghost">
                {t('astroPage.browse')}
              </a>
            </div>
            <Stats
              items={[
                [astrologyItems.length, t('astroPage.stats.capabilities')],
                [available, t('astroPage.stats.available')],
                [astrologyCategories.length, t('astroPage.stats.categories')],
              ]}
            />
          </div>
          {sky && (
            <div className="mx-art mx-sky-art mx-rise mx-d3" aria-hidden="true">
              <SkyWheel sky={sky} />
              <div className="mx-spec mx-dots mx-sky-card">
                <div className="mx-scan" />
                <div className="mx-spec-head">
                  <span className="mx-ok">POST</span>
                  <span>&quot;operation&quot;: &quot;panchang&quot;</span>
                  <span className="mx-ok">200</span>
                </div>
                <div className="mx-cells">
                  <div className="mx-cell">
                    <span>tithi</span>
                    <b>
                      {sky.tithi} · {sky.paksha}
                    </b>
                  </div>
                  <div className="mx-cell">
                    <span>nakshatra</span>
                    <b>
                      {sky.nakshatra.name} · {sky.nakshatra.pada}
                    </b>
                  </div>
                  <div className="mx-cell">
                    <span>moonRashi</span>
                    <b>{sky.moonRashi}</b>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-section" aria-labelledby="by-category">
        <div className="mh-wrap">
          <div data-reveal>
            <p className="mx-kicker">{t('astroPage.byCategory.kicker')}</p>
            <h2 className="mx-h2" id="by-category">
              {t('astroPage.byCategory.title', { n: number(astrologyCategories.length) })}
            </h2>
            <p className="mx-sub">
              <Rich text={t('astroPage.byCategory.copy')} tags={code} />
            </p>
          </div>
          <div className="mx-tiles mx-tiles-astro">
            {astrologyCategories.map((id) => {
              const first = sorted.find((item) => item.facet === id);
              const count = counts.get(id) ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  className="mx-tile mx-dots"
                  aria-pressed={facet === id}
                  onClick={() => pick(id)}
                  data-reveal
                >
                  <span className="mx-tile-top">
                    <code>{first ? `"${operationOf(first)}"` : ''}</code>
                    <b>{number(count)}</b>
                  </span>
                  <span className="mx-tile-sa" lang="sa-Deva">
                    {CATEGORY_SANSKRIT[id] ?? ''}
                  </span>
                  <span className="mx-tile-name">{facetName(id)}</span>
                  <span className="mx-vol-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(4, Math.round((count / most) * 100))}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-section">
        <div className="mh-wrap">
          <div className="mx-head" data-reveal>
            <div>
              <p className="mx-kicker">{t('astroPage.featuredSection.kicker')}</p>
              <h2 className="mx-h2">{t('astroPage.featuredSection.title')}</h2>
            </div>
          </div>
          <div className="mx-grid mx-grid-astro">
            {FEATURED.map(([id, sanskrit]) => {
              const item = byId.get(id);
              const path = pathOf.get(id);
              if (!item || !path) return null;
              const text = itemText(t, item);
              return (
                <Link key={id} href={path} className="mx-mcard mx-dots" data-reveal>
                  <span className="mx-field">&quot;operation&quot;: &quot;{operationOf(item)}&quot;</span>
                  <p className="mx-mcard-sa" lang="sa-Deva">
                    {sanskrit}
                  </p>
                  <h3>{text.title}</h3>
                  <p className="mx-mcard-copy">{text.summary}</p>
                  <div className="mx-tags">
                    <span>{text.facet}</span>
                    {item.sandbox && (
                      <span className="mx-tag-ok">{t('astroPage.all.sandboxCol')} ✓</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-section" id="all" style={{ scrollMarginTop: 84 }}>
        <div className="mh-wrap">
          <div className="mx-head" data-reveal>
            <div>
              <p className="mx-kicker">{t('astroPage.all.kicker')}</p>
              <h2 className="mx-h2">{t('astroPage.all.title')}</h2>
            </div>
            <div className="mx-filters">
              <label className="mx-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="mh-sr">{t('astroPage.all.searchLabel')}</span>
                <input
                  type="search"
                  value={query}
                  placeholder={t('astroPage.search', { n: number(astrologyItems.length) })}
                  autoComplete="off"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={onlySandbox}
                className="mx-switch"
                onClick={() => setOnlySandbox(!onlySandbox)}
              >
                <i aria-hidden="true" />
                {t('astroPage.all.sandbox')}
              </button>
              {facet && (
                <button
                  type="button"
                  className="mx-chip mx-chip-clear"
                  aria-label={t('mantraHub.all.clear', { name: facetName(facet) })}
                  onClick={() => setFacet('')}
                >
                  {facetName(facet)} <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          </div>
          <div className="mx-table mx-table-astro" data-reveal>
            <div className="mx-table-head" aria-hidden="true">
              <span>{t('astroPage.all.capability')}</span>
              <span>{t('mantraPage.category')}</span>
              <span>{t('astroPage.all.sandboxCol')}</span>
              <span />
            </div>
            <div
              className="mx-table-scroll"
              tabIndex={0}
              role="region"
              aria-label={t('meta./astrology-api.label')}
            >
              <ul>
                {sorted.map((item) => {
                  const text = itemText(t, item);
                  const path = pathOf.get(item.id);
                  return (
                    <li key={item.id} hidden={!matches(item)}>
                      <Link href={path ?? '/astrology-api'} className="mx-row">
                        <span className="mx-row-title">
                          <b>{text.title}</b>
                          <code>&quot;operation&quot;: &quot;{operationOf(item)}&quot;</code>
                        </span>
                        <span className="mx-row-deity">{text.facet}</span>
                        <span className="mx-row-audio">
                          {item.sandbox && <span>{t('astroPage.all.sandboxCol')}</span>}
                        </span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {shown === 0 && <p className="mx-empty">{t('astroPage.all.empty')}</p>}
            </div>
            <div className="mx-table-foot">
              <span aria-live="polite">
                {t('astroPage.all.showing', {
                  n: number(shown),
                  total: number(astrologyItems.length),
                })}
                {facet ? ` · ${facetName(facet)}` : ''}
              </span>
              <span>{t('mantraHub.all.sorted')}</span>
            </div>
          </div>
          <p className="mh-muted mx-astro-note">{t('astroPage.note')}</p>
        </div>
      </section>

      {positions && (
        <section className="mx-section">
          <div className="mh-wrap mx-response mx-list-demo">
            <div data-reveal>
              <p className="mx-kicker">{t('astroPage.request.kicker')}</p>
              <h2 className="mx-h2">{t('astroPage.request.title')}</h2>
              <p className="mx-sub">
                <Rich text={t('astroPage.request.copy')} tags={code} />
              </p>
              <CodePanel
                title={`"operation": "positions" · ${itemText(t, positions).responseLabel}`}
                status="200 OK"
                json={positions.response}
              />
            </div>
            <div data-reveal>
              <CodeTabs
                snippets={astrologySnippets(positions.request, positions.path)}
                label={t('mantraPage.requestLanguage')}
              />
              <p className="mx-links">
                <Link href="/docs#astrology-calculate">{t('astroPage.reference')}</Link> ·{' '}
                <Link href="/docs/guides/vedic-birth-chart">{t('astroPage.chartGuide')}</Link> ·{' '}
                <Link href="/calculators">{t('meta./calculators.label')}</Link>
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mx-section" style={{ paddingBottom: 96 }}>
        <div className="mh-wrap">
          <div className="mx-closing" data-reveal>
            <div>
              <p className="mx-kicker">{t('plans.startFree')}</p>
              <h2 className="mx-h2">{t('astroPage.ctaTitle')}</h2>
              <p>{t('astroPage.ctaCopy')}</p>
              <div className="mx-actions">
                <KeyButton />
                <Link href="/docs#astrology-calculate" className="mh-btn mh-btn-ghost">
                  {t('common.readDocs')}
                </Link>
              </div>
            </div>
            <Ring />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
