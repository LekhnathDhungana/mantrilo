import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/astrology-api/[capability]';
import NotFound from './NotFound';
import { Callout, KeyButton, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { itemText } from './site/Catalog.web';
import { Checks, CodeTabs, EndpointPill, Ribbon } from './site/Shlokam.web';
import { astrologyItems } from '../data/library';
import { astrologySnippets, bodyOf } from '../data/astrology-snippets';
import { hindiField } from '../data/astrology-hindi';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';

// /astrology-api/{slug}: one astrology capability, laid out like a mantra page (shlokam.css).
// The hero card shows the request body and the first fields of the sample response; the page
// then gives the request in three languages, the response, and what to build with it.

const byId = new Map(astrologyItems.map((item) => [item.id, item]));

// The sample's first few values under data, as "path: value" for the hero card.
function leaves(value: unknown, path = '', out: [string, string][] = []): [string, string][] {
  if (out.length >= 5 || value === undefined) return out;
  if (value === null || typeof value !== 'object') {
    if (/(^|\.)(operation|engineVersion|calculated)$/.test(path)) return out;
    const text =
      typeof value === 'number'
        ? String(+value.toFixed(4))
        : typeof value === 'string'
          ? `"${value.length > 26 ? `${value.slice(0, 25)}…` : value}"`
          : String(value);
    out.push([path, text]);
    return out;
  }
  if (Array.isArray(value)) return value.length ? leaves(value[0], `${path}[0]`, out) : out;
  for (const [key, child] of Object.entries(value))
    leaves(child, path ? `${path}.${key}` : key, out);
  return out;
}

export default function AstrologyCapability() {
  const data = useLoaderData<typeof loader>();
  const { t, number } = useI18n();
  if (!data) return <NotFound />;
  const { page, item, related } = data;
  const text = itemText(t, item);
  const label = (path: string, name: string) =>
    t(`meta.${path}.label`) || t('meta.astrologyCapability.label', { name });
  const heading = label(page.path, page.name);
  const daily = page.operation === 'daily-panchang';
  const instant = page.operation === 'panchang';
  const response = item.response as { data?: unknown } | undefined;
  const fields = leaves(response?.data ?? response).map(([path, value]) => [
    path.replace(/^data\./, ''),
    value,
  ]);
  const body = JSON.stringify(bodyOf(item.request), null, 2).split('\n');
  const hindi = hindiField(page.operation);

  return (
    <SiteFrame path={page.path}>
      <section className="mx-hero">
        <Ribbon />
        <div className="mh-wrap mx-hero-grid">
          <div>
            <nav className="mh-crumbs mx-rise" aria-label={t('chrome.breadcrumb')}>
              <Link href="/">{t('chrome.crumbHome')}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/astrology-api">{t('meta./astrology-api.label')}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{heading}</span>
            </nav>
            <div className="mx-chips mx-rise mx-d1">
              <Link href={`/astrology-api?facet=${item.facet}#all`} className="mx-chip">
                {text.facet}
              </Link>
              {item.sandbox && (
                <span className="mx-chip">
                  <span className="mx-pulse" aria-hidden="true" />
                  {t('astroPage.all.sandboxCol')}
                </span>
              )}
            </div>
            <h1 className="mx-rise mx-d2">{heading}</h1>
            <p className="mx-meta mx-astro-op mx-rise mx-d3">
              <code>&quot;operation&quot;: &quot;{page.operation}&quot;</code>
            </p>
            <p className="mx-lede mx-rise mx-d3">{text.summary}</p>
            <div className="mx-rise mx-d4">
              <EndpointPill method={item.method} path={item.path} />
            </div>
            <div className="mx-actions mx-rise mx-d5">
              {item.sandbox ? (
                <KeyButton href={item.sandbox}>{t('astroCap.try')}</KeyButton>
              ) : (
                <KeyButton />
              )}
              <Link href={item.docs} className="mh-btn mh-btn-ghost">
                {t('common.readDocs')}
              </Link>
            </div>
            <Checks
              className="mx-rise mx-d6"
              items={[
                t('mantraPage.checkFree'),
                t('mantraPage.checkCard'),
                t('astroCap.checkFailed'),
              ]}
            />
          </div>
          <div className="mx-art mx-rise mx-d3" aria-hidden="true">
            <div className="mx-stack">
              <div className="mx-sheet">
                <span>{text.responseLabel}</span>
              </div>
              <div className="mx-spec mx-dots">
                <div className="mx-scan" />
                <div className="mx-spec-head">
                  <span className="mx-ok">{item.method}</span>
                  <span>{item.path}</span>
                  <span className="mx-ok">200</span>
                </div>
                <div className="mx-spec-body">
                  <span className="mx-field">body</span>
                  <pre className="mx-astro-body">
                    {body.slice(0, 8).join('\n')}
                    {body.length > 8 ? '\n  …' : ''}
                  </pre>
                  {fields.length > 0 && (
                    <>
                      <span className="mx-field">data</span>
                      <ol className="mx-astro-leaves">
                        {fields.map(([path, value], i) => (
                          <li key={path} style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
                            <code>{path}</code>
                            <b>{value}</b>
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-body">
        <div className="mh-wrap mx-layout">
          <div>
            {item.limited && <Callout tone="warn">{t('astroCap.limited')}</Callout>}

            <div className="mx-panel" data-reveal>
              <div className="mx-panel-head">
                <p className="mx-kicker">{t('code.request')}</p>
                <h2 className="mx-h2">{t('astroCap.make')}</h2>
                <p className="mx-sub">
                  <Rich
                    text={t('astroCap.send')}
                    tags={{
                      operation: <code>{`"operation": "${page.operation}"`}</code>,
                      endpoint: (
                        <code>
                          {item.method} {item.path}
                        </code>
                      ),
                    }}
                  />
                </p>
                <p className="mx-sub">{text.inputs}</p>
              </div>
              {hindi && (
                <Callout tone="info">
                  <strong>{t('astroHindi.title')}.</strong>{' '}
                  <Rich
                    text={t('astroHindi.body', {
                      field: hindi,
                      localized: t(`astroHindi.ops.${page.operation}`),
                    })}
                    tags={{ code: <code /> }}
                  />
                </Callout>
              )}
              <CodeTabs
                snippets={astrologySnippets(item.request, item.path)}
                label={t('mantraPage.requestLanguage')}
              />
            </div>

            <div className="mx-panel" data-reveal>
              <div className="mx-panel-head">
                <p className="mx-kicker">{t('code.response')}</p>
                <h2 className="mx-h2">{t('astroCap.response')}</h2>
                <p className="mx-sub">{text.responseLabel}</p>
              </div>
              <div className="mx-astro-response">
                <CodePanel title={item.path} status="200 OK" json={item.response} />
              </div>
            </div>

            <div className="mx-panel mx-astro-build" data-reveal>
              <div className="mx-panel-head">
                <p className="mx-kicker">{text.facet}</p>
                <h2 className="mx-h2">{t('astroCap.build')}</h2>
                <p className="mx-sub">{text.render}</p>
                <p className="mx-sub">{text.usage}</p>
              </div>
              {instant && (
                <Callout tone="info">
                  <Rich
                    text={t('astroCap.instant')}
                    tags={{ link: <Link href="/astrology-api/daily-panchang" /> }}
                  />
                </Callout>
              )}
              {daily && (
                <div className="mx-astro-daily">
                  <h3>{t('astroCap.dailyTitle')}</h3>
                  <p>{t('astroCap.daily1')}</p>
                  <p>
                    <Rich
                      text={t('astroCap.daily2')}
                      tags={{ link: <Link href="/astrology-api/instant-panchang" /> }}
                    />
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="mx-aside" aria-label={heading}>
            <div className="mx-card" data-reveal>
              <p className="mx-label">{t('mantraPage.glance')}</p>
              <dl className="mx-facts">
                <div>
                  <dt>{t('astroCap.operation')}</dt>
                  <dd>
                    <code>{page.operation}</code>
                  </dd>
                </div>
                <div>
                  <dt>{t('mantraPage.category')}</dt>
                  <dd>{text.facet}</dd>
                </div>
                <div className="mx-fact-wide">
                  <dt>{t('astroPage.stats.endpoint')}</dt>
                  <dd>
                    <code>
                      {item.method} {item.path}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt>{t('astroHindi.fact')}</dt>
                  <dd>{hindi ? t('astroHindi.both') : t('astroHindi.english')}</dd>
                </div>
                <div>
                  <dt>{t('astroPage.all.sandboxCol')}</dt>
                  <dd>{item.sandbox ? t('mantraPage.yes') : t('mantraPage.no')}</dd>
                </div>
              </dl>
            </div>

            <div className="mx-card" data-reveal>
              <p className="mx-label">{t('astroCap.reference')}</p>
              <ul className="mx-astro-links">
                <li>
                  <Link href={item.docs}>{t('astroCap.readReference')}</Link>
                </li>
                <li>
                  <Link href={item.guide}>{t('upanishads.guide')}</Link>
                </li>
                {item.sandbox && (
                  <li>
                    <a href={item.sandbox}>{t('astroCap.trySandbox')}</a>
                  </li>
                )}
                <li>
                  <Link href="/astrology-api">{t('astroCap.browseAll')}</Link>
                </li>
              </ul>
            </div>

            <div className="mx-promo mx-dots" data-reveal>
              <span className="mx-field">MANTRILO_API_KEY</span>
              <h2>{t('mantraPage.promo.title', { title: heading })}</h2>
              <p>
                {t('mantraPage.promo.copy', {
                  price: number(49.99, { style: 'currency', currency: 'USD' }),
                })}
              </p>
              <KeyButton />
              <Link href="/pricing" className="mh-btn mh-btn-ghost">
                {t('mantraPage.promo.pricing')}
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-section" style={{ paddingBottom: 96 }}>
          <div className="mh-wrap">
            <div className="mx-head" data-reveal>
              <div>
                <p className="mx-kicker">{t('astroCap.related', { category: text.facet })}</p>
                <h2 className="mx-h2">{t('astroCap.relatedTitle')}</h2>
              </div>
              <Link href="/astrology-api#all" className="mh-btn mh-btn-ghost">
                {t('astroCap.browseAll')}
              </Link>
            </div>
            <div className="mx-grid mx-grid-astro">
              {related.map((entry) => {
                const other = byId.get(entry.id);
                return (
                  <Link key={entry.path} href={entry.path} className="mx-mcard mx-dots" data-reveal>
                    <span className="mx-field">
                      &quot;operation&quot;: &quot;{entry.id.replace(/^astrology-/, '')}&quot;
                    </span>
                    <h3>{label(entry.path, entry.label.replace(/ API$/, ''))}</h3>
                    {other && <p className="mx-mcard-copy">{itemText(t, other).summary}</p>}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </SiteFrame>
  );
}
