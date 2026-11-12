import { useState, type ReactNode } from 'react';
import { Link } from 'expo-router';
import { Rosette } from './Brand.web';
import { Arrow, Divider, KeyButton, LineIcon, SiteFrame } from './site/Chrome.web';
import { PlanCards } from './site/Plans.web';
import { plans } from '../data/plans';
import catalog from '../data/catalog-samples.json';
import { astrologyPanchangExample, astrologyPositionsExample } from '../data/api-reference';
import { CopyButton, JsonCode, MANTRA_ID, SourceCode, snippets, type Lang } from './site/Code.web';

// Real records: the mantra is a production snapshot (developer/scripts/export-site-sample.mjs)
// and the astrology responses are engine output for 2026-11-10T12:00:00+05:30.
const mantra = catalog.mantra.data;
const verse = mantra.verses[0];
const words = verse.wordMeanings.map(({ word, meaning }) => {
  const match = word.match(/^(.*?)\s*\((.*)\)$/);
  return { deva: match ? match[1] : word, iast: match ? match[2] : '', meaning };
});

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
  { label: string; method: 'GET' | 'POST'; path: string; body?: object; response: object }
> = {
  mantra: {
    label: 'Mantra with verses',
    method: 'GET',
    path: `/v1/mantras/${MANTRA_ID}`,
    response: { data: mantra, requestId: 'request-id' },
  },
  audio: {
    label: 'Recording link',
    method: 'GET',
    path: `/v1/mantras/${MANTRA_ID}/audio?format=json`,
    response: {
      data: {
        url: 'https://storage.googleapis.com/mantrilo-media/…?X-Goog-Signature=…',
        expiresAt: '2026-11-10T06:45:00.000Z',
        bytes: catalog.recording.bytes,
        contentType: 'audio/mp4',
      },
      requestId: 'request-id',
    },
  },
  positions: {
    label: 'Planetary positions',
    method: 'POST',
    path: '/v1/astrology/calculate',
    body: { operation: 'positions', datetime: DATETIME },
    response: astrologyPositionsExample,
  },
  panchang: {
    label: 'Instant Panchang',
    method: 'POST',
    path: '/v1/astrology/calculate',
    body: { operation: 'panchang', datetime: DATETIME },
    response: astrologyPanchangExample,
  },
};

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
  {
    icon: Icon.script,
    title: 'Devanagari, as sourced',
    copy: 'Sanskrit in Unicode Devanagari with its line breaks intact, ready for any font stack.',
  },
  {
    icon: Icon.translit,
    title: 'IAST transliteration',
    copy: 'Every verse carries full diacritics, so ahaṃ stays ahaṃ for readers who don’t read the script.',
  },
  {
    icon: Icon.words,
    title: 'Word-by-word meaning',
    copy: 'Each word paired with its transliteration and gloss, with compounds split where it helps.',
  },
  {
    icon: Icon.audio,
    title: 'Linked recordings',
    copy: 'Request a 15-minute signed link to the recording for any mantra that has one.',
  },
  {
    icon: Icon.astro,
    title: 'Vedic astrology engine',
    copy: 'D1 and D9 charts, Vimshottari Dasha, Panchang, Guna Milan and planetary positions. On every plan.',
  },
  {
    icon: Icon.key,
    title: 'Sandbox to production',
    copy: 'A free sandbox key with 500 calls a month on sample records. Live keys unlock the full catalog.',
  },
];

const faqs: [string, ReactNode][] = [
  [
    'What content is available today?',
    'Mantras with Sanskrit, transliteration, translation and word meanings; recordings linked to those mantras; scripture books by collection, chapter and verse; and astrology calculations.',
  ],
  [
    'How does the free sandbox work?',
    'Every account gets a sandbox key with 500 calls a month that reads the first five items of each resource. Paid plans add a live key for the full available catalog.',
  ],
  [
    'Is astrology included?',
    <>
      Yes, on every plan. Each calculation counts as one normal request. The default sidereal offset
      is approximate, with a custom ayanamsa option.{' '}
      <Link href="/astrology-api">Read about the astrology API</Link>.
    </>,
  ],
  [
    'Can I use the content commercially?',
    <>
      Paid plans include the available mantras and sacred audio for commercial integration, subject
      to the <Link href="/license">documented content license</Link>. The Free plan is for testing
      only.
    </>,
  ],
  [
    'How is audio metered?',
    `Audio allowances measure data delivered each month, not storage. ${plans
      .filter((p) => p.price)
      .map((p) => `${p.name} includes ${p.audio}`)
      .join(', ')}.`,
  ],
];

export default function Marketing() {
  const [demo, setDemo] = useState<DemoKey>('mantra');
  const [script, setScript] = useState<'both' | 'deva' | 'iast'>('both');
  const [word, setWord] = useState(0);
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
              <span className="mh-pill-tag">Included</span>
              Vedic astrology on every plan
              <Arrow />
            </Link>
            <h1>
              Sacred texts,
              <br />
              <span className="mh-h1-accent">programmable.</span>
            </h1>
            <p className="mh-lede">
              One REST API for Sanskrit mantras with transliteration and word-by-word meaning,
              linked recordings, and Vedic astrology calculations.
            </p>
            <div className="mh-actions">
              <KeyButton className="mh-btn mh-btn-primary" />
              <Link href="/docs" className="mh-btn mh-btn-ghost">
                Read the docs <Arrow />
              </Link>
            </div>
            <ul className="mh-hero-meta">
              <li>500 free calls a month</li>
              <li>No card needed</li>
              <li>Live keys from ${plans.find((p) => p.price)?.price}/mo</li>
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
              <figcaption>Rendered in your app</figcaption>
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
            <p className="mh-eyebrow">Try it</p>
            <h2>Pick an endpoint. See exactly what comes back.</h2>
            <p>
              These are real responses: a mantra from the production catalog and output from the
              astrology engine. Your app gets the same JSON.
            </p>
          </div>

          <div className="mh-demo" data-reveal>
            <div className="mh-demo-controls">
              <label className="mh-field">
                <span>Endpoint</span>
                <select value={demo} onChange={(e) => setDemo(e.target.value as DemoKey)}>
                  {(Object.keys(demos) as DemoKey[]).map((k) => (
                    <option key={k} value={k}>
                      {demos[k].label}
                    </option>
                  ))}
                </select>
              </label>
              {demo === 'mantra' ? (
                <label className="mh-field">
                  <span>Script</span>
                  <select
                    value={script}
                    onChange={(e) => setScript(e.target.value as typeof script)}
                  >
                    <option value="both">Devanagari + IAST</option>
                    <option value="deva">Devanagari only</option>
                    <option value="iast">IAST only</option>
                  </select>
                </label>
              ) : demo === 'audio' ? null : (
                <div className="mh-field">
                  <span>Moment</span>
                  <output>10 Nov 2026, 12:00 IST</output>
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
                <DemoRender demo={demo} script={script} word={word} setWord={setWord} />
              </div>
              <div className="mh-window mh-demo-json">
                <div className="mh-window-bar">
                  <span className="mh-window-title">response.json</span>
                  <span className="mh-status">200 OK</span>
                  <CopyButton text={curlFor(demo)} label="Copy cURL" />
                </div>
                <pre className="mh-pre mh-pre-wrap" tabIndex={0}>
                  <JsonCode value={active.response} />
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* Features */}
      <section id="features" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p className="mh-eyebrow">What’s in the response</p>
            <h2>Built for reading, listening and reckoning time.</h2>
            <p>
              Content shaped the way people actually use it, with the care the source material
              deserves.
            </p>
          </div>
          <div className="mh-features">
            {features.map((f, i) => (
              <article
                key={f.title}
                className="mh-card mh-feature"
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 70}ms` }}
              >
                <LineIcon>{f.icon}</LineIcon>
                <h3>{f.title}</h3>
                <p>{f.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Code */}
      <section id="code" className="mh-section mh-section-tint">
        <div className="mh-wrap mh-code-grid">
          <div className="mh-heading mh-heading-left" data-reveal>
            <p className="mh-eyebrow">Integrate in minutes</p>
            <h2>A familiar interface, in the language you already use.</h2>
            <p>
              Plain HTTPS and JSON. Keep your key on the server, call the API, and render the verse
              however your design calls for.
            </p>
            <ul className="mh-checks">
              <li>Bearer-token auth with sandbox and live keys</li>
              <li>Cursor pagination and deity filters</li>
              <li>Stable error codes and a requestId on every response</li>
            </ul>
            <Link href="/docs" className="mh-textlink">
              Read the API reference <Arrow />
            </Link>
          </div>
          <div className="mh-window mh-code" data-reveal>
            <div className="mh-tabs" role="tablist" aria-label="Code example language">
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
      <section id="build" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p className="mh-eyebrow">What you can build</p>
            <h2>For the apps people open every morning.</h2>
            <p>The patterns the API was designed around.</p>
          </div>
          <div className="mh-uses">
            <article className="mh-card mh-use" data-reveal>
              <div className="mh-use-art mh-use-verse" lang="sa" aria-hidden="true">
                <span className="mh-deva">{verse.sanskrit.split('\n')[1]}</span>
                <small>{verse.transliteration.split('\n')[1]}</small>
              </div>
              <h3>Verse of the day</h3>
              <p>Home-screen widgets and reading views with script, transliteration and meaning.</p>
            </article>
            <article className="mh-card mh-use" data-reveal style={{ transitionDelay: '70ms' }}>
              <div className="mh-use-art mh-use-wave" aria-hidden="true">
                {Array.from({ length: 28 }, (_, i) => (
                  <i key={i} style={{ height: `${22 + Math.abs(Math.sin(i * 0.7)) * 60}%` }} />
                ))}
              </div>
              <h3>Chanting & listening</h3>
              <p>Play the recording beside the text it belongs to, verse by verse.</p>
            </article>
            <article className="mh-card mh-use" data-reveal style={{ transitionDelay: '140ms' }}>
              <div className="mh-use-art mh-use-panchang" aria-hidden="true">
                <span>
                  <small>Tithi</small>Shukla 1
                </span>
                <span>
                  <small>Nakshatra</small>Anuradha
                </span>
                <span>
                  <small>Karana</small>Bava
                </span>
              </div>
              <h3>Panchang calendars</h3>
              <p>Tithi, nakshatra, yoga and karana for any moment, for festival and puja apps.</p>
            </article>
            <article className="mh-card mh-use" data-reveal style={{ transitionDelay: '210ms' }}>
              <div className="mh-use-art mh-use-chart" aria-hidden="true">
                <svg viewBox="0 0 120 120">
                  <rect x="6" y="6" width="108" height="108" />
                  <path d="M6 6l108 108M114 6L6 114M60 6L6 60l54 54 54-54z" />
                </svg>
              </div>
              <h3>Kundli & matchmaking</h3>
              <p>Birth charts, dashas and Guna Milan for astrology and matrimony products.</p>
            </article>
          </div>
        </div>
      </section>

      <Divider />

      {/* Pricing */}
      <section id="pricing" className="mh-section">
        <div className="mh-wrap">
          <div className="mh-heading" data-reveal>
            <p className="mh-eyebrow">Pricing</p>
            <h2>Start free. Pay as your product grows.</h2>
            <p>
              Monthly billing. Every allowance resets monthly. Astrology included on every plan.
            </p>
          </div>
          <PlanCards reveal />
          <p className="mh-plans-note">
            A customer product is an app or website covered by your plan.{' '}
            <Link href="/pricing" className="mh-textlink">
              Compare plans in detail <Arrow />
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mh-section mh-section-tint">
        <div className="mh-wrap mh-faq">
          <div className="mh-heading mh-heading-left" data-reveal>
            <p className="mh-eyebrow">Questions</p>
            <h2>Good to know.</h2>
            <p>
              Something else? <Link href="/access">Get in touch</Link>.
            </p>
          </div>
          <div className="mh-faq-list" data-reveal>
            {faqs.map(([q, a]) => (
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
            <h2>Begin with a free sandbox key.</h2>
            <p>500 calls a month on sample records. Upgrade when you’re ready to go live.</p>
            <div className="mh-actions">
              <KeyButton className="mh-btn mh-btn-ink" />
              <Link href="/docs" className="mh-btn mh-btn-glass">
                Read the docs <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}

function DemoRender({
  demo,
  script,
  word,
  setWord,
}: {
  demo: DemoKey;
  script: 'both' | 'deva' | 'iast';
  word: number;
  setWord: (i: number) => void;
}) {
  if (demo === 'mantra') {
    const w = words[word];
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
        <p className="mh-render-translation">{verse.translation}</p>
        <div className="mh-words" role="group" aria-label="Word-by-word meanings">
          {words.map((x, i) => (
            <button
              key={x.deva}
              type="button"
              className={i === word ? 'is-active' : ''}
              aria-pressed={i === word}
              onClick={() => setWord(i)}
              lang="sa"
            >
              {script === 'iast' ? x.iast : x.deva}
            </button>
          ))}
        </div>
        <p className="mh-word-meaning">
          <span lang="sa" className="mh-deva">
            {w.deva}
          </span>
          <em>{w.iast}</em>
          <span>{w.meaning}</span>
        </p>
      </div>
    );
  }
  if (demo === 'audio') {
    return (
      <div className="mh-render-audio">
        <div className="mh-render-meta">
          <span>Signed link</span>
          <span>Expires in 15 min</span>
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
            <dt>Size</dt>
            <dd>{Math.round(catalog.recording.bytes / 1024)} KB</dd>
          </div>
          <div>
            <dt>Format</dt>
            <dd>audio/mp4</dd>
          </div>
          <div>
            <dt>Metered</dt>
            <dd>Bytes delivered</dd>
          </div>
        </dl>
        <p className="mh-render-note">
          Omit <code>?format=json</code> to get a 302 redirect straight to the file. The signed URL
          is shortened here.
        </p>
      </div>
    );
  }
  if (demo === 'positions') {
    const moon = astrologyPositionsExample.data.planets[0];
    return (
      <div className="mh-render-astro">
        <div className="mh-render-meta">
          <span>Sidereal · Lahiri (approx.)</span>
          <span>10 Nov 2026, 12:00 IST</span>
        </div>
        <h3>{moon.body}</h3>
        <p className="mh-big-num">
          {moon.siderealLongitudeDegrees.toFixed(2)}
          <span>°</span>
        </p>
        <dl className="mh-facts">
          <div>
            <dt>Rashi</dt>
            <dd>
              {moon.rashi.name} {moon.rashi.degreesWithin.toFixed(2)}°
            </dd>
          </div>
          <div>
            <dt>Nakshatra</dt>
            <dd>
              {moon.nakshatra.name}, pada {moon.nakshatra.pada}
            </dd>
          </div>
          <div>
            <dt>Motion</dt>
            <dd>
              {moon.motion.degreesPerDay.toFixed(2)}°/day{moon.motion.retrograde ? ' · R' : ''}
            </dd>
          </div>
        </dl>
        <p className="mh-render-note">
          The full response covers the Sun through Saturn. The Moon is shown here.
        </p>
      </div>
    );
  }
  const p = astrologyPanchangExample.data.panchang;
  return (
    <div className="mh-render-astro">
      <div className="mh-render-meta">
        <span>At the requested instant</span>
        <span>10 Nov 2026, 12:00 IST</span>
      </div>
      <h3>Panchang</h3>
      <div className="mh-panchang">
        {[
          ['Tithi', `${p.tithi.paksha} ${p.tithi.numberWithinPaksha}`],
          ['Nakshatra', `${p.nakshatra.name} · ${p.nakshatra.pada}`],
          ['Yoga', `No. ${p.yoga.number}`],
          ['Karana', p.karana.name],
          ['Sun', p.sunRashi.name],
          ['Moon', p.moonRashi.name],
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
