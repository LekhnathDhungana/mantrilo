import { useState, type ReactNode } from 'react';
import { Link } from '../i18n/Link.web';
import { Rosette } from './Brand.web';
import { Arrow, Divider, KeyButton, LineIcon, SiteFrame } from './site/Chrome.web';
import { PlanCards, planName } from './site/Plans.web';
import { plans } from '../data/plans';
import { consoleSandboxUrl } from '../data/site';
import catalog from '../../developer/src/data/catalog-samples.json';
import { astrologyPanchangExample, astrologyPositionsExample } from '../data/api-reference';
import { CopyButton, JsonCode, MANTRA_ID, SourceCode, snippets, type Lang } from './site/Code.web';
import { intlLocale, useI18n, type I18n } from '../i18n';
import { Rich } from '../i18n/Rich';

// Real records: the mantra is a production snapshot (developer/scripts/export-site-sample.mjs)
// and the astrology responses are engine output for 2026-11-10T12:00:00+05:30.
const mantra = catalog.mantra.data;
const verse = mantra.verses[0];
const heroResponse = {
  data: {
    id: mantra.id,
    title: mantra.title,
    deity: mantra.deity,
    verses: [
      {
        number: verse.number,
        sanskrit: verse.sanskrit,
        transliteration: verse.transliteration,
        translation: verse.translation,
        wordMeanings: verse.wordMeanings.slice(0, 2),
      },
    ],
  },
  requestId: 'request-id',
};

type DemoKey = 'mantra' | 'audio' | 'positions' | 'panchang';
const DATETIME = '2026-11-10T12:00:00+05:30';
const demos: Record<
  DemoKey,
  { method: 'GET' | 'POST'; path: string; body?: object; response: object }
> = {
  mantra: {
    method: 'GET',
    path: `/v1/mantras/${MANTRA_ID}`,
    response: { data: mantra, requestId: 'request-id' },
  },
  audio: {
    method: 'GET',
    path: `/v1/mantras/${MANTRA_ID}/audio?format=json`,
    response: {
      data: {
        url: 'https://storage.googleapis.com/mantrilo-media/…?X-Goog-Signature=…',
        expiresAt: '2026-11-10T06:45:00.000Z',
        bytes: catalog.recording.bytes,
        contentType: 'audio/x-m4a',
      },
      requestId: 'request-id',
    },
  },
  positions: {
    method: 'POST',
    path: '/v1/astrology/calculate',
    body: { operation: 'positions', datetime: DATETIME },
    response: astrologyPositionsExample,
  },
  panchang: {
    method: 'POST',
    path: '/v1/astrology/calculate',
    body: { operation: 'panchang', datetime: DATETIME },
    response: astrologyPanchangExample,
  },
};

/** A price in US dollars, in the visitor's number format. */
export function usd({ lang }: I18n, amount: number) {
  return new Intl.NumberFormat(intlLocale(lang), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function curlFor(key: DemoKey) {
  const d = demos[key];
  const head = `curl${d.method === 'POST' ? ' -X POST' : ''} "$MANTRILO_API_URL${d.path}" \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  return d.body
    ? `${head} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(d.body)}'`
    : head;
}

const Icon = {
  script: <path d="M4 7h16M8 7c0 6-2 10-4 12M8 7c3 0 6 2 6 6s-3 6-6 6M17 7v12M14 12h6" />,
  translit: <path d="M4 6h7M7.5 6v12M4 18h7M14 9l3 9 3-9M14.8 14h4.4M17 4.5l1 1.5" />,
  words: (
    <path d="M3 6h8v12H3zM13 6h8v5h-8zM13 13h8v5h-8M5.5 10h3M5.5 13h3M15.5 8.5h3M15.5 15.5h3" />
  ),
  audio: <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />,
  astro: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l2.5 2.5M18.5 4.5L21 7" />
    </>
  ),
};

const features = [
  { icon: Icon.script, key: 'devanagari' },
  { icon: Icon.translit, key: 'iast' },
  { icon: Icon.words, key: 'verses' },
  { icon: Icon.audio, key: 'recordings' },
  { icon: Icon.astro, key: 'astrology' },
  { icon: Icon.key, key: 'sandbox' },
];

// The sample moment every astrology demo uses, in the visitor's date format.
const moment = ({ date }: I18n) =>
  `${date(DATETIME, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST`;

function faqs(i18n: I18n): [string, ReactNode][] {
  const { t, lang } = i18n;
  const audio = new Intl.ListFormat(lang, { type: 'conjunction' }).format(
    plans
      .filter((p) => p.price)
      .map((p) => t('home.faq.audioPlan', { plan: planName(i18n, p.name), audio: p.audio })),
  );
  return [
    [t('home.faq.contentQ'), t('home.faq.contentA')],
    [t('home.faq.sandboxQ'), t('home.faq.sandboxA', { count: 500, calls: i18n.number(500) })],
    [
      t('home.faq.astrologyQ'),
      <Rich
        key="a"
        text={t('home.faq.astrologyA')}
        tags={{ link: <Link href="/astrology-api" /> }}
      />,
    ],
    [
      t('home.faq.commercialQ'),
      <Rich key="c" text={t('home.faq.commercialA')} tags={{ link: <Link href="/license" /> }} />,
    ],
    [t('home.faq.audioQ'), t('home.faq.audioA', { plans: audio })],
  ];
}

export default function Marketing() {
  const i18n = useI18n();
  const { t } = i18n;
  const [demo, setDemo] = useState<DemoKey>('mantra');
  const [script, setScript] = useState<'both' | 'deva' | 'iast'>('both');
  const [lang, setLang] = useState<Lang>('curl');

  const active = demos[demo];
  const snippet = snippets.find((s) => s.lang === lang)!;

  return (
    <SiteFrame path="/">
      {/* Hero */}
      <section className="mh-hero">
        <div className="mh-mesh" aria-hidden="true">
          <span className="mh-blob mh-blob-1" />
          <span className="mh-blob mh-blob-2" />
          <span className="mh-blob mh-blob-3" />
          <span className="mh-blob mh-blob-4" />
        </div>
        <div className="mh-wrap mh-hero-grid">
          <div className="mh-hero-copy">
            <Link href="/astrology-api" className="mh-pill">
              <span className="mh-pill-tag">{t('home.hero.pillTag')}</span>
              {t('home.hero.pill')}
              <Arrow />
            </Link>
            <h1>
              <Rich
                text={t('home.hero.heading')}
                tags={{ br: <br />, accent: <span className="mh-h1-accent" /> }}
              />
            </h1>
            <p className="mh-lede">{t('home.hero.lede')}</p>
            <div className="mh-actions">
              <KeyButton href={consoleSandboxUrl({ preset: 'quickstart' })}>
                {t('home.hero.trySandbox')}
              </KeyButton>
              <Link href="/docs#quickstart" className="mh-btn mh-btn-ghost">
                {t('common.readDocs')} <Arrow />
              </Link>
            </div>
            <ul className="mh-hero-meta">
              <li>{t('home.hero.freeCalls', { count: 500, calls: i18n.number(500) })}</li>
              <li>{t('home.hero.noCard')}</li>
              <li>
                {t('home.hero.liveFrom', {
                  price: usd(i18n, plans.find((p) => p.price)?.price ?? 0),
                })}
              </li>
            </ul>
          </div>

          <div className="mh-hero-visual">
            <Rosette className="mh-hero-ring" />
            <div className="mh-window mh-hero-window">
              <div className="mh-window-bar">
                <span className="mh-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="mh-window-title">
                  <b className="mh-method">GET</b> /v1/mantras/{'{id}'}
                </span>
                <span className="mh-status">200 OK</span>
              </div>
              <pre className="mh-pre mh-pre-request">
                <SourceCode lang="curl" code={snippets[0].code} />
              </pre>
              <pre className="mh-pre mh-pre-wrap mh-hero-json" tabIndex={0}>
                <JsonCode value={heroResponse} />
              </pre>
            </div>
            <figure className="mh-verse-float" lang="sa">
              <figcaption>{t('home.hero.rendered')}</figcaption>
              <p className="mh-deva">{verse.sanskrit.split('\n')[0]}</p>
              <p className="mh-iast">{verse.transliteration.split('\n')[0]}</p>
            </figure>
          </div>
        </div>
      </section>

      <div className="mh-strip">
        <div className="mh-wrap mh-strip-inner">
          {[
            ['GET', '/v1/mantras'],
            ['GET', '/v1/mantras/{id}'],
            ['GET', '/v1/mantras/{id}/audio'],
            ['POST', '/v1/astrology/calculate'],
          ].map(([m, p]) => (
            <code key={p}>
              <b className={m === 'GET' ? 'mh-method' : 'mh-method mh-method-post'}>{m}</b> {p}
            </code>
          ))}
        </div>
      </div>

      {/* Live demo */}
      <section id="demo" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p className="mh-eyebrow">{t('home.demo.eyebrow')}</p>
            <h2>{t('home.demo.title')}</h2>
            <p>{t('home.demo.copy')}</p>
          </div>

          <div className="mh-demo" data-reveal>
            <div className="mh-demo-controls">
              <label className="mh-field">
                <span>{t('home.demo.endpoint')}</span>
                <select value={demo} onChange={(e) => setDemo(e.target.value as DemoKey)}>
                  {(Object.keys(demos) as DemoKey[]).map((k) => (
                    <option key={k} value={k}>
                      {t(`home.demo.options.${k}`)}
                    </option>
                  ))}
                </select>
              </label>
              {demo === 'mantra' ? (
                <label className="mh-field">
                  <span>{t('home.demo.script')}</span>
                  <select
                    value={script}
                    onChange={(e) => setScript(e.target.value as typeof script)}
                  >
                    <option value="both">{t('home.demo.scriptBoth')}</option>
                    <option value="deva">{t('home.demo.scriptDeva')}</option>
                    <option value="iast">{t('home.demo.scriptIast')}</option>
                  </select>
                </label>
              ) : demo === 'audio' ? null : (
                <div className="mh-field">
                  <span>{t('home.demo.moment')}</span>
                  <output>{moment(i18n)}</output>
                </div>
              )}
              <code className="mh-demo-path">
                <b className={active.method === 'GET' ? 'mh-method' : 'mh-method mh-method-post'}>
                  {active.method}
                </b>{' '}
                {active.path}
              </code>
            </div>

            <div className="mh-demo-grid">
              <div className="mh-demo-render" aria-live="polite">
                <DemoRender demo={demo} script={script} />
              </div>
              <div className="mh-window mh-demo-json">
                <div className="mh-window-bar">
                  <span className="mh-window-title">response.json</span>
                  <span className="mh-status">200 OK</span>
                  <CopyButton text={curlFor(demo)} label={t('code.copyCurl')} />
                </div>
                <pre className="mh-pre mh-pre-wrap" tabIndex={0}>
                  <JsonCode value={active.response} />
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer story */}
      <section id="customers" className="mh-section mh-story-section">
        <div className="mh-wrap">
          <figure className="mh-story" data-reveal>
            <Rosette className="mh-story-ring" />
            <div className="mh-story-main">
              <p className="mh-eyebrow">{t('home.story.eyebrow')}</p>
              <svg className="mh-story-mark" viewBox="0 0 48 36" aria-hidden="true">
                <path d="M0 36V22C0 9.6 6.4 2.2 19 0l2 5.2C14 7 10.6 11 10.2 17H20v19H0zm28 0V22C28 9.6 34.4 2.2 47 0l1 5.2C42 7 38.6 11 38.2 17H48v19H28z" />
              </svg>
              <blockquote>
                <p>
                  <Rich text={t('home.story.quote')} tags={{ em: <em /> }} />
                </p>
              </blockquote>
              <figcaption>
                <img src="/customers/satyam.png" alt="" width={52} height={52} />
                <span className="mh-story-who">
                  <b>Shrivas</b>
                  <small>{t('home.story.role')}</small>
                </span>
                <a
                  href="https://satyam.app"
                  target="_blank"
                  rel="noopener"
                  className="mh-textlink mh-story-visit"
                >
                  {t('home.story.visit')} <Arrow />
                </a>
              </figcaption>
            </div>
            <aside className="mh-story-side" aria-label={t('home.story.sideLabel')}>
              <p className="mh-story-label">{t('home.story.inside')}</p>
              <ul>
                {[
                  ['ॐ', 'mantras', '/v1/mantras/{id}/audio'],
                  ['गी', 'gita', '/v1/books/{id}/chapters'],
                  ['☾', 'panchang', '/v1/astrology/calculate'],
                  ['✦', 'chart', '/v1/astrology/calculate'],
                ].map(([glyph, key, path]) => (
                  <li key={key}>
                    <span className="mh-story-glyph" aria-hidden="true">
                      {glyph}
                    </span>
                    <span>
                      <b>{t(`home.story.uses.${key}`)}</b>
                      <code>{path}</code>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </figure>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p className="mh-eyebrow">{t('home.features.eyebrow')}</p>
            <h2>{t('home.features.title')}</h2>
            <p>{t('home.features.copy')}</p>
          </div>
          <div className="mh-features">
            {features.map((f, i) => (
              <article
                key={f.key}
                className="mh-card mh-feature"
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 70}ms` }}
              >
                <LineIcon>{f.icon}</LineIcon>
                <h3>{t(`home.features.items.${f.key}.title`)}</h3>
                <p>{t(`home.features.items.${f.key}.copy`, { calls: i18n.number(500) })}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Code */}
      <section id="code" className="mh-section mh-section-tint">
        <div className="mh-wrap mh-code-grid">
          <div className="mh-heading mh-heading-left" data-reveal>
            <p className="mh-eyebrow">{t('home.code.eyebrow')}</p>
            <h2>{t('home.code.title')}</h2>
            <p>{t('home.code.copy')}</p>
            <ul className="mh-checks">
              <li>{t('home.code.auth')}</li>
              <li>{t('home.code.pagination')}</li>
              <li>{t('home.code.errors')}</li>
            </ul>
            <Link href="/docs" className="mh-textlink">
              {t('home.code.reference')} <Arrow />
            </Link>
          </div>
          <div className="mh-window mh-code" data-reveal>
            <div className="mh-tabs" role="tablist" aria-label={t('code.tabsLabel')}>
              {snippets.map((s) => (
                <button
                  key={s.lang}
                  id={`mh-tab-${s.lang}`}
                  role="tab"
                  type="button"
                  aria-selected={lang === s.lang}
                  aria-controls="mh-code-panel"
                  tabIndex={lang === s.lang ? 0 : -1}
                  onClick={() => setLang(s.lang)}
                  onKeyDown={(e) => {
                    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                    e.preventDefault();
                    const i = snippets.findIndex((x) => x.lang === lang);
                    const n =
                      snippets[(i + (e.key === 'ArrowRight' ? 1 : -1) + snippets.length) % 4];
                    setLang(n.lang);
                    document.getElementById(`mh-tab-${n.lang}`)?.focus();
                  }}
                >
                  {s.label}
                </button>
              ))}
              <CopyButton text={snippet.code} />
            </div>
            <div
              id="mh-code-panel"
              role="tabpanel"
              aria-labelledby={`mh-tab-${lang}`}
              className="mh-code-body"
            >
              <div className="mh-code-file">{snippet.file}</div>
              <pre className="mh-pre" tabIndex={0}>
                <SourceCode lang={lang} code={snippet.code} />
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="library" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p id="build" className="mh-eyebrow">
              {t('home.uses.eyebrow')}
            </p>
            <h2>{t('home.uses.title')}</h2>
            <Link href="/library" className="mh-back">
              {t('home.uses.browse')} <Arrow />
            </Link>
          </div>
          <div className="mh-uses">
            <article className="mh-card mh-use" data-reveal>
              <div className="mh-use-art mh-use-verse" lang="sa" aria-hidden="true">
                <span className="mh-deva">{verse.sanskrit.split('\n')[1]}</span>
                <small>{verse.transliteration.split('\n')[1]}</small>
              </div>
              <h3>{t('home.uses.verse.title')}</h3>
              <p>{t('home.uses.verse.copy')}</p>
              <Link href="/docs/guides/search-mantras" className="mh-back">
                {t('home.uses.verse.link')} <Arrow />
              </Link>
            </article>
            <article className="mh-card mh-use" data-reveal style={{ transitionDelay: '70ms' }}>
              <div className="mh-use-art mh-use-wave" aria-hidden="true">
                {Array.from({ length: 28 }, (_, i) => (
                  <i key={i} style={{ height: `${22 + Math.abs(Math.sin(i * 0.7)) * 60}%` }} />
                ))}
              </div>
              <h3>{t('home.uses.audio.title')}</h3>
              <p>{t('home.uses.audio.copy')}</p>
              <Link href="/docs/guides/sacred-audio" className="mh-back">
                {t('home.uses.audio.link')} <Arrow />
              </Link>
            </article>
            <article className="mh-card mh-use" data-reveal style={{ transitionDelay: '140ms' }}>
              <div className="mh-use-art mh-use-panchang" aria-hidden="true">
                <span>
                  <small>{t('astro.tithi')}</small>Shukla 1
                </span>
                <span>
                  <small>{t('astro.nakshatra')}</small>Anuradha
                </span>
                <span>
                  <small>{t('astro.karana')}</small>Bava
                </span>
              </div>
              <h3>{t('home.uses.panchang.title')}</h3>
              <p>{t('home.uses.panchang.copy')}</p>
              <Link href="/astrology-api/daily-panchang" className="mh-back">
                {t('home.uses.panchang.link')} <Arrow />
              </Link>
            </article>
            <article className="mh-card mh-use" data-reveal style={{ transitionDelay: '210ms' }}>
              <div className="mh-use-art mh-use-chart" aria-hidden="true">
                <svg viewBox="0 0 120 120">
                  <rect x="6" y="6" width="108" height="108" />
                  <path d="M6 6l108 108M114 6L6 114M60 6L6 60l54 54 54-54z" />
                </svg>
              </div>
              <h3>{t('home.uses.books.title')}</h3>
              <p>{t('home.uses.books.copy')}</p>
              <Link href="/docs#epic-retellings" className="mh-back">
                {t('home.uses.books.link')} <Arrow />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <Divider />

      {/* Pricing */}
      <section id="pricing" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p className="mh-eyebrow">{t('home.pricing.eyebrow')}</p>
            <h2>{t('home.pricing.title')}</h2>
            <p>{t('home.pricing.copy')}</p>
          </div>
          <PlanCards reveal />
          <p className="mh-plans-note">
            {t('plans.customerProduct')}{' '}
            <Link href="/pricing" className="mh-textlink">
              {t('home.pricing.compare')} <Arrow />
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mh-section mh-section-tint">
        <div className="mh-wrap mh-faq">
          <div className="mh-heading mh-heading-left" data-reveal>
            <p className="mh-eyebrow">{t('home.faq.eyebrow')}</p>
            <h2>{t('home.faq.title')}</h2>
            <p>
              <Rich text={t('home.faq.contact')} tags={{ link: <Link href="/contact" /> }} />
            </p>
          </div>
          <div className="mh-faq-list" data-reveal>
            {faqs(i18n).map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mh-section">
        <div className="mh-wrap">
          <div className="mh-cta" data-reveal>
            <div className="mh-mesh mh-mesh-cta" aria-hidden="true">
              <span className="mh-blob mh-blob-1" />
              <span className="mh-blob mh-blob-2" />
              <span className="mh-blob mh-blob-3" />
              <span className="mh-blob mh-blob-4" />
            </div>
            <Rosette className="mh-cta-ring" />
            <p className="mh-cta-deva" lang="sa" aria-hidden="true">
              शुभारम्भः
            </p>
            <h2>{t('home.cta.title')}</h2>
            <p>{t('home.cta.copy', { calls: i18n.number(500) })}</p>
            <div className="mh-actions">
              <KeyButton className="mh-btn mh-btn-ink" />
              <Link href="/docs" className="mh-btn mh-btn-glass">
                {t('common.readDocs')} <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}

function DemoRender({ demo, script }: { demo: DemoKey; script: 'both' | 'deva' | 'iast' }) {
  const i18n = useI18n();
  const { t, number } = i18n;
  if (demo === 'mantra') {
    return (
      <div className="mh-render-mantra">
        <div className="mh-render-meta">
          <span>{mantra.deity.name}</span>
          <span>{mantra.category}</span>
        </div>
        <h3>{mantra.title}</h3>
        <div className="mh-render-verse" lang="sa">
          {script !== 'iast' &&
            verse.sanskrit.split('\n').map((l) => (
              <p key={l} className="mh-deva">
                {l}
              </p>
            ))}
          {script !== 'deva' &&
            verse.transliteration.split('\n').map((l) => (
              <p key={l} className="mh-iast">
                {l}
              </p>
            ))}
        </div>
      </div>
    );
  }
  if (demo === 'audio') {
    return (
      <div className="mh-render-audio">
        <div className="mh-render-meta">
          <span>{t('home.render.signedLink')}</span>
          <span>{t('home.render.expires', { minutes: number(15) })}</span>
        </div>
        <h3>{mantra.title}</h3>
        <div className="mh-use-wave mh-render-wave" aria-hidden="true">
          {Array.from({ length: 48 }, (_, i) => (
            <i
              key={i}
              style={{ height: `${18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) * 78}%` }}
            />
          ))}
        </div>
        <dl className="mh-facts">
          <div>
            <dt>{t('home.render.size')}</dt>
            <dd>{number(Math.round(catalog.recording.bytes / 1024))} KB</dd>
          </div>
          <div>
            <dt>{t('home.render.format')}</dt>
            <dd>audio/x-m4a</dd>
          </div>
          <div>
            <dt>{t('home.render.metered')}</dt>
            <dd>{t('home.render.meteredValue')}</dd>
          </div>
        </dl>
        <p className="mh-render-note">
          <Rich text={t('home.render.audioNote')} tags={{ code: <code /> }} />
        </p>
      </div>
    );
  }
  if (demo === 'positions') {
    const moon = astrologyPositionsExample.data.planets[0];
    return (
      <div className="mh-render-astro">
        <div className="mh-render-meta">
          <span>{t('home.render.sidereal')}</span>
          <span>{moment(i18n)}</span>
        </div>
        <h3>{moon.body}</h3>
        <p className="mh-big-num">
          {number(moon.siderealLongitudeDegrees, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <span>°</span>
        </p>
        <dl className="mh-facts">
          <div>
            <dt>{t('astro.rashi')}</dt>
            <dd>
              {moon.rashi.name}{' '}
              {number(moon.rashi.degreesWithin, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              °
            </dd>
          </div>
          <div>
            <dt>{t('astro.nakshatra')}</dt>
            <dd>
              {t('home.render.pada', {
                name: moon.nakshatra.name,
                pada: number(moon.nakshatra.pada),
              })}
            </dd>
          </div>
          <div>
            <dt>{t('home.render.motion')}</dt>
            <dd>
              {t('home.render.perDay', {
                degrees: number(moon.motion.degreesPerDay, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
              })}
              {moon.motion.retrograde ? ' · R' : ''}
            </dd>
          </div>
        </dl>
        <p className="mh-render-note">{t('home.render.planetsNote')}</p>
      </div>
    );
  }
  const p = astrologyPanchangExample.data.panchang;
  return (
    <div className="mh-render-astro">
      <div className="mh-render-meta">
        <span>{t('home.render.instant')}</span>
        <span>{moment(i18n)}</span>
      </div>
      <h3>{t('astro.panchang')}</h3>
      <div className="mh-panchang">
        {[
          [t('astro.tithi'), `${p.tithi.paksha} ${p.tithi.numberWithinPaksha}`],
          [t('astro.nakshatra'), `${p.nakshatra.name} · ${p.nakshatra.pada}`],
          [t('astro.yoga'), t('home.render.number', { number: number(p.yoga.number) })],
          [t('astro.karana'), p.karana.name],
          [t('astro.sun'), p.sunRashi.name],
          [t('astro.moon'), p.moonRashi.name],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
