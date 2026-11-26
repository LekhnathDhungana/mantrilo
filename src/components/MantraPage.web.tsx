import { Link, useLoaderData } from 'expo-router';
import type {
  DeityPage,
  MantraHub,
  MantraListing,
  MantraPage as Mantra,
} from '../data/mantra-pages';
import type { PageMeta } from '../data/metadata';
import { useState } from 'react';
import { audioResponse, curlGet } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import MantraAudio from './MantraAudio.web';
import NotFound from './NotFound';
import { Arrow, Callout, DataTable, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel, JsonCode } from './site/Code.web';
import {
  Checks,
  CodeTabs,
  EndpointPill,
  Ribbon,
  Ring,
  Specimen,
  Stats,
  toDeva,
  type Snippet,
} from './site/Shlokam.web';

// The mantra library: one page per mantra (/library/mantras/{slug}), one per deity
// (/library/mantras/deity/{deity}) and the hub (/library/mantras). Pages are API documentation
// first: the request, this mantra's exact response and its fields, then the text itself.

type Data =
  | { kind: 'hub'; hub: MantraHub; meta: PageMeta; path: string }
  | { kind: 'mantra'; page: Mantra }
  | { kind: 'deity'; page: DeityPage }
  | null;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const jsRequest = (id: string) => `const res = await fetch(
  \`\${process.env.MANTRILO_API_URL}/v1/mantras/${id}\`,
  { headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` } },
);
const { data } = await res.json();
for (const verse of data.verses) console.log(verse.sanskrit, verse.transliteration);`;

function MantraList({ mantras }: { mantras: MantraListing[] }) {
  return (
    <ul className="mh-mantra-list">
      {mantras.map((mantra) => (
        <li key={mantra.slug}>
          <Link href={mantra.path}>{mantra.title}</Link>{' '}
          <span className="mh-muted">
            {plural(mantra.verseCount, 'verse')}
            {mantra.hasAudio ? ' · recording' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

type VerseView = 'both' | 'sa' | 'tr';

const lines = (text: string | null | undefined, count: number) =>
  (text ?? '').split('\n').slice(0, count).join('\n');

const snippetsFor = (id: string): Snippet[] => [
  { lang: 'curl', label: 'cURL', file: 'request.sh', code: curlGet(`/v1/mantras/${id}`) },
  { lang: 'js', label: 'JavaScript', file: 'server.mjs', code: jsRequest(id) },
  {
    lang: 'python',
    label: 'Python',
    file: 'fetch.py',
    code: `import os
import requests

res = requests.get(
    f"{os.environ['MANTRILO_API_URL']}/v1/mantras/${id}",
    headers={"Authorization": f"Bearer {os.environ['MANTRILO_API_KEY']}"},
    timeout=10,
)
res.raise_for_status()
for verse in res.json()["data"]["verses"]:
    print(verse["sanskrit"], verse["transliteration"])`,
  },
  {
    lang: 'go',
    label: 'Go',
    file: 'main.go',
    code: `req, _ := http.NewRequest("GET",
	os.Getenv("MANTRILO_API_URL")+"/v1/mantras/${id}", nil)
req.Header.Set("Authorization", "Bearer "+os.Getenv("MANTRILO_API_KEY"))

res, err := http.DefaultClient.Do(req)
if err != nil {
	log.Fatal(err)
}
defer res.Body.Close()`,
  },
];

function MantraDetail({ page }: { page: Mantra }) {
  const { mantra } = page;
  const [view, setView] = useState<VerseView>('both');
  const [open, setOpen] = useState<number | null>(null);
  const path = `/v1/mantras/${mantra.id}`;
  const audioPath = `${path}/audio?format=json`;
  const verseCount = mantra.verseCount;
  const shown = mantra.verses.length;
  const deity = mantra.deities[0];
  const opening = mantra.verses.find((verse) => verse.sanskrit);
  const fields: [string, string, string][] = [
    ['id', 'string', mantra.id],
    ['title', 'string', mantra.title],
    ['deity', 'object | null', mantra.deity ? `${mantra.deity.id} · ${mantra.deity.name}` : 'null'],
    ['category', 'string | null', mantra.category ?? 'null'],
    ['source', 'string | null', mantra.source ?? 'null'],
    [
      'description',
      'string | null',
      mantra.description ? 'Short summary (see the response)' : 'null',
    ],
    ['verseCount', 'number', String(verseCount)],
    ['audio', 'object | null', mantra.hasAudio ? `{ href: "${path}/audio" }` : 'null'],
    ['verses[].number', 'number | null', 'Position in the hymn'],
    ['verses[].sanskrit', 'string | null', 'Devanagari text'],
    ['verses[].transliteration', 'string | null', 'Roman transliteration'],
    ['verses[].translation', 'null', 'Translations are not distributed'],
  ];
  const views: [VerseView, string][] = [
    ['both', 'Devanagari + IAST'],
    ['sa', 'Devanagari'],
    ['tr', 'IAST'],
  ];
  return (
    <SiteFrame path={page.path} meta={page.meta}>
      <section className="mx-hero">
        <Ribbon />
        <div className="mh-wrap mx-hero-grid">
          <div>
            <nav className="mh-crumbs mx-rise" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/library">Library</Link>
              {deity && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={deity.path}>{deity.name} mantras</Link>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span aria-current="page">{mantra.title}</span>
            </nav>
            <div className="mx-chips mx-rise mx-d1">
              {mantra.deities.map((entry) => (
                <Link key={entry.id} href={entry.path} className="mx-chip">
                  {entry.name} <small>{entry.count}</small>
                </Link>
              ))}
              {mantra.category && <span className="mx-chip">{mantra.category}</span>}
              {mantra.hasAudio && (
                <span className="mx-chip">
                  <span className="mx-pulse" aria-hidden="true" />
                  Recording
                </span>
              )}
            </div>
            <h1 className="mx-rise mx-d2">{mantra.title}</h1>
            {opening?.sanskrit && (
              <p className="mx-opening mx-rise mx-d3" lang="sa-Deva">
                {opening.sanskrit.split('\n')[0]}
              </p>
            )}
            <p className="mx-meta mx-rise mx-d3">
              {deity ? `${deity.name} · ` : ''}
              {plural(verseCount, 'verse')}
              {mantra.hasAudio ? ' · Streamable recording' : ''}
            </p>
            <p className="mx-lede mx-rise mx-d3">{page.lede}</p>
            <div className="mx-rise mx-d4">
              <EndpointPill path={path} />
            </div>
            <div className="mx-actions mx-rise mx-d5">
              {mantra.sandbox ? (
                <KeyButton href={consoleSandboxUrl({ preset: 'featured-mantra' })}>
                  Try this mantra in the sandbox
                </KeyButton>
              ) : (
                <KeyButton />
              )}
              <Link href="/docs#get-mantra" className="mh-btn mh-btn-ghost">
                Read the docs
              </Link>
            </div>
            <Checks
              className="mx-rise mx-d6"
              items={[
                '500 free calls a month',
                'No card needed',
                'Devanagari with transliteration',
              ]}
            />
          </div>
          <div className="mx-art mx-rise mx-d3" aria-hidden="true">
            <div className="mx-stack">
              {verseCount > 1 && (
                <div className="mx-sheet">
                  <span>verses[1] · next</span>
                </div>
              )}
              <div className="mx-spec mx-dots">
                <div className="mx-scan" />
                <div className="mx-spec-head">
                  <span className="mx-ok">GET</span>
                  <span>{path}</span>
                  <span className="mx-ok">200</span>
                </div>
                <div className="mx-spec-body">
                  <span className="mx-field">data.title</span>
                  <p className="mx-spec-title">{mantra.title}</p>
                  {opening && (
                    <Specimen>
                      {opening.sanskrit && (
                        <>
                          <span className="mx-field">verses[0].sanskrit</span>
                          <p className="mx-specimen-sa" lang="sa-Deva">
                            {lines(opening.sanskrit, 2)}
                          </p>
                        </>
                      )}
                      {opening.transliteration && (
                        <>
                          <span className="mx-field">verses[0].transliteration</span>
                          <p className="mx-specimen-tr" lang="sa-Latn">
                            {lines(opening.transliteration, 2)}
                          </p>
                        </>
                      )}
                    </Specimen>
                  )}
                  <div className="mx-cells">
                    <div className="mx-cell">
                      <span>verseCount</span>
                      <b>{verseCount}</b>
                    </div>
                    <div className="mx-cell">
                      <span>audio.href</span>
                      <b>{mantra.hasAudio ? '"…/audio"' : 'null'}</b>
                    </div>
                    <div className="mx-cell">
                      <span>deity.id</span>
                      <b>{mantra.deity ? `"${mantra.deity.id}"` : 'null'}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-body">
        <div className="mh-wrap mx-layout">
          <div>
            {mantra.description && (
              <details className="mx-about" data-reveal>
                <summary>
                  <span>
                    <b>About {mantra.title}</b>
                    <small>From the description field</small>
                  </span>
                  <span className="mx-plus" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <p>{mantra.description}</p>
              </details>
            )}

            <div className="mx-panel" data-reveal>
              <div className="mx-panel-head">
                <p className="mx-kicker">Request this mantra</p>
                <h2 className="mx-h2">One call returns every verse.</h2>
                <p className="mx-sub">
                  Call the API from your server with your key. The id is stable, so you can store it
                  and link to it.
                </p>
              </div>
              <CodeTabs snippets={snippetsFor(mantra.id)} label="Request language" />
            </div>

            {mantra.alternateIds.length > 0 && (
              <Callout tone="info">
                The same hymn is also filed under {plural(mantra.alternateIds.length, 'other id')}:{' '}
                {mantra.alternateIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <code>{id}</code>
                  </span>
                ))}
                . Each returns the same text under its own deity.
              </Callout>
            )}

            <div className="mx-reader-head" data-reveal>
              <div>
                <h2 className="mx-h2">{mantra.title}, verse by verse</h2>
                <p className="mx-sub">
                  {shown < verseCount
                    ? `The first ${shown} of ${verseCount} verses`
                    : shown === 1
                      ? 'The verse'
                      : `All ${shown} verses`}
                  , exactly as <code>verses[]</code> returns {shown === 1 ? 'it' : 'them'}.
                </p>
              </div>
              <div className="mx-seg" role="group" aria-label="Script">
                {views.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mx-verses">
              {mantra.verses.map((verse, i) => {
                const json = {
                  number: verse.number,
                  title: verse.title,
                  sanskrit: verse.sanskrit,
                  transliteration: verse.transliteration,
                  translation: null,
                  wordMeanings: [],
                };
                const showSa = view !== 'tr' && verse.sanskrit;
                const showTr = view !== 'sa' && verse.transliteration;
                return (
                  <article className="mx-verse" key={i} data-reveal>
                    <div className="mx-verse-top">
                      <span className="mx-verse-no" lang="sa-Deva">
                        ॥ {toDeva(verse.number ?? i + 1)} ॥
                      </span>
                      <span className="mx-verse-rule" aria-hidden="true" />
                      <code className="mx-idx">verses[{i}]</code>
                      <button
                        type="button"
                        className="mx-json-btn"
                        aria-expanded={open === i}
                        onClick={() => setOpen(open === i ? null : i)}
                      >
                        {open === i ? 'Hide JSON' : '{ } JSON'}
                      </button>
                    </div>
                    {verse.title && !verse.title.startsWith(mantra.title) && <h3>{verse.title}</h3>}
                    {showSa && (
                      <p className="mx-verse-sa" lang="sa-Deva">
                        {verse.sanskrit}
                      </p>
                    )}
                    {showTr && (
                      <p className="mx-verse-tr" lang="sa-Latn">
                        {verse.transliteration}
                      </p>
                    )}
                    {open === i && (
                      <div className="mx-verse-json">
                        <pre className="mh-pre" tabIndex={0}>
                          <JsonCode value={json} />
                        </pre>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {shown < verseCount && (
              <div className="mx-note" data-reveal>
                <div>
                  <b>{plural(verseCount - shown, 'more verse')} with a key</b>
                  <p>
                    Your app gets all {verseCount} verses from <code>GET {path}</code>.
                  </p>
                </div>
                <KeyButton />
              </div>
            )}
            <p className="mx-links">
              <Link href="/docs#get-mantra">Mantra endpoint reference</Link> ·{' '}
              <Link href="/docs/guides/search-mantras">Build a searchable library</Link> ·{' '}
              <Link href="/docs/guides/sacred-audio">Audio playback guide</Link>
            </p>
          </div>

          <aside className="mx-aside" aria-label="Mantra details">
            <div className="mx-card" data-reveal>
              <p className="mx-label">At a glance</p>
              <dl className="mx-facts">
                <div>
                  <dt>Mantra id</dt>
                  <dd>
                    <code>{mantra.id}</code>
                  </dd>
                </div>
                {mantra.deity && (
                  <div>
                    <dt>Deity</dt>
                    <dd>{deity?.name ?? mantra.deity.id}</dd>
                  </div>
                )}
                {mantra.category && (
                  <div>
                    <dt>Category</dt>
                    <dd>{mantra.category}</dd>
                  </div>
                )}
                {mantra.citedSource && (
                  <div>
                    <dt>Source</dt>
                    <dd>{mantra.citedSource}</dd>
                  </div>
                )}
                <div>
                  <dt>Verses</dt>
                  <dd>{verseCount}</dd>
                </div>
                <div>
                  <dt>Recording</dt>
                  <dd>{mantra.hasAudio ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>

            <div className="mx-card" data-reveal>
              <p className="mx-label">Recording</p>
              {mantra.hasAudio ? (
                <>
                  <div className="mx-wave" aria-hidden="true">
                    {WAVE.map((bar, i) => (
                      <span key={i} style={bar} />
                    ))}
                  </div>
                  <MantraAudio id={mantra.id} title={mantra.title} />
                  <div className="mx-mono">
                    <b>GET</b> {audioPath}
                  </div>
                  <p className="mx-small">
                    Your server asks for a signed link and passes it to your player. Links expire
                    after 15 minutes and count toward your plan’s monthly audio allowance.
                  </p>
                </>
              ) : (
                <p className="mx-small">
                  This mantra has no recording, so <code>audio</code> is <code>null</code>. Hide the
                  player when it is.
                </p>
              )}
            </div>

            <div className="mx-promo mx-dots" data-reveal>
              <span className="mx-field">MANTRILO_API_KEY</span>
              <h2>Put {mantra.title} in your app</h2>
              <p>
                500 free calls a month with no card. Live keys from $49.99 a month include the full
                catalog and astrology.
              </p>
              <KeyButton />
              <Link href="/pricing" className="mh-btn mh-btn-ghost">
                See pricing
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-section">
        <div className="mh-wrap">
          <div data-reveal>
            <p className="mx-kicker">Response</p>
            <h2 className="mx-h2">The exact JSON your app receives.</h2>
            <p className="mx-sub">
              {verseCount > page.shownVerses
                ? `The first ${plural(page.shownVerses, 'verse')} of ${verseCount} are shown. `
                : ''}
              Every field is listed beside it.
            </p>
          </div>
          <div className="mx-response">
            <div data-reveal>
              <CodePanel title={path} status="200 OK" json={page.response} />
              {mantra.hasAudio && (
                <>
                  <CodePanel title={audioPath} method="GET" code={curlGet(audioPath)} />
                  <CodePanel
                    title="Recording link · placeholder"
                    status="200 OK"
                    json={audioResponse}
                  />
                </>
              )}
            </div>
            <div data-reveal>
              <DataTable
                label={`Fields returned for ${mantra.title}`}
                head={['Field', 'Type', 'Value for this mantra']}
                rows={fields}
              />
            </div>
          </div>
        </div>
      </section>

      {page.related.length > 0 && deity && (
        <section className="mx-section">
          <div className="mh-wrap">
            <div className="mx-head" data-reveal>
              <div>
                <p className="mx-kicker">More from the {deity.name} collection</p>
                <h2 className="mx-h2">
                  {plural(deity.count, `${deity.name} mantra`)}, same shape.
                </h2>
              </div>
              <Link href={deity.path} className="mh-textlink">
                All {deity.name} mantras <Arrow />
              </Link>
            </div>
            <div className="mx-grid">
              {page.related.map((other) => (
                <Link key={other.slug} href={other.path} className="mx-mcard mx-dots" data-reveal>
                  <span className="mx-field">deity: &quot;{deity.id}&quot;</span>
                  {other.opening && (
                    <p className="mx-mcard-sa" lang="sa-Deva">
                      {other.opening}
                    </p>
                  )}
                  <h3>{other.title}</h3>
                  <div className="mx-tags">
                    <span>{plural(other.verseCount, 'verse')}</span>
                    {other.hasAudio && <span className="mx-tag-ok">audio ✓</span>}
                  </div>
                </Link>
              ))}
            </div>
            <p className="mx-links">
              {mantra.deities.map((entry, i) => (
                <span key={entry.id}>
                  {i > 0 && ' · '}
                  <Link href={entry.path}>All {entry.name} mantras</Link>
                </span>
              ))}{' '}
              · <Link href="/library/mantras">Mantra library</Link> ·{' '}
              <Link href="/library/books">Books</Link>
            </p>
          </div>
        </section>
      )}

      <section className="mx-section" style={{ paddingBottom: 96 }}>
        <div className="mh-wrap">
          <div className="mx-closing" data-reveal>
            <div>
              <p className="mx-kicker">Start free</p>
              <h2 className="mx-h2">Begin with a free sandbox key.</h2>
              <p>
                Every account starts with sample content, so you can build before you subscribe.
              </p>
              <div className="mx-actions">
                <KeyButton />
                <Link href="/docs" className="mh-btn mh-btn-ghost">
                  Read the docs
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

const WAVE = Array.from({ length: 30 }, (_, i) => ({
  height: `${8 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 30)}px`,
  animationDelay: `${((i % 9) * 0.12).toFixed(2)}s`,
}));

function Deity({ page }: { page: DeityPage }) {
  const { deity } = page;
  const listPath = `/v1/mantras?deity=${deity.id}&limit=2`;
  return (
    <SiteFrame path={page.path} meta={page.meta}>
      <PageHero
        eyebrow="Mantra API · Library"
        title={`${deity.name} mantras`}
        lede={`${plural(page.mantras.length, 'mantra')} and stotras for ${deity.name}, each with its Sanskrit text, transliteration and API response.`}
        actions={<KeyButton />}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <h2>All {deity.name} mantras</h2>
            <MantraList mantras={page.mantras} />
            <p>
              <Link href="/library/mantras">Mantras for every deity</Link>
            </p>
          </div>
          <div className="mh-prose mh-stack">
            <h2>List them with the API</h2>
            <p>
              Filter the list by deity id <code>{deity.id}</code>. Pages are ordered by id; pass{' '}
              <code>nextCursor</code> back as <code>cursor</code> for the next page.
            </p>
            <CodePanel title={listPath} method="GET" code={curlGet(listPath)} />
            <CodePanel title="Illustrative response excerpt" status="200 OK" json={page.response} />
            <p>
              <Link href="/docs#list-mantras">List endpoint reference</Link> ·{' '}
              <Link href="/docs/guides/search-mantras">Build a searchable library</Link>
            </p>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}

// Devanagari names for the deity tiles. A deity without one shows its English name alone.
const DEITY_SANSKRIT: Record<string, string> = {
  devi: 'देवी',
  shiva: 'शिव',
  shankara: 'शङ्कर',
  vishnu: 'विष्णु',
  govinda: 'गोविन्द',
  krishna: 'कृष्ण',
  navagraha: 'नवग्रह',
  rama: 'राम',
  hanuman: 'हनुमान्',
  lakshmi: 'लक्ष्मी',
  om: 'ॐ',
  durga: 'दुर्गा',
  saraswati: 'सरस्वती',
  surya: 'सूर्य',
  ganesha: 'गणेश',
};

const LIST_PATH = '/v1/mantras?deity=shiva&limit=20';

const listSnippets: Snippet[] = [
  { lang: 'curl', label: 'cURL', file: 'request.sh', code: curlGet(LIST_PATH) },
  {
    lang: 'js',
    label: 'JavaScript',
    file: 'list.mjs',
    code: `let cursor = null;
do {
  const url = new URL('/v1/mantras', process.env.MANTRILO_API_URL);
  url.searchParams.set('deity', 'shiva');
  url.searchParams.set('limit', '20');
  if (cursor) url.searchParams.set('cursor', cursor);
  const res = await fetch(url, {
    headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` },
  });
  const { data, nextCursor } = await res.json();
  for (const mantra of data) console.log(mantra.id, mantra.verseCount);
  cursor = nextCursor;
} while (cursor);`,
  },
  {
    lang: 'python',
    label: 'Python',
    file: 'list.py',
    code: `import os
import requests

cursor = None
while True:
    params = {"deity": "shiva", "limit": 20}
    if cursor:
        params["cursor"] = cursor
    res = requests.get(
        f"{os.environ['MANTRILO_API_URL']}/v1/mantras",
        params=params,
        headers={"Authorization": f"Bearer {os.environ['MANTRILO_API_KEY']}"},
        timeout=10,
    )
    res.raise_for_status()
    body = res.json()
    for mantra in body["data"]:
        print(mantra["id"], mantra["verseCount"])
    cursor = body["nextCursor"]
    if not cursor:
        break`,
  },
];

function Hub({ hub, meta, path }: { hub: MantraHub; meta: PageMeta; path: string }) {
  const [deity, setDeity] = useState('');
  const [query, setQuery] = useState('');
  const [onlyAudio, setOnlyAudio] = useState(false);

  const names = new Map(hub.deities.map((entry) => [entry.id, entry.name]));
  const tiles = hub.deities.slice(0, 12);
  const more = hub.deities.slice(12);
  const most = hub.deities[0]?.count ?? 1;
  const active = hub.deities.find((entry) => entry.id === deity);
  const needle = query.trim().toLowerCase();
  // Every row stays in the exported HTML; filters only hide the ones that don't match.
  const matches = (mantra: MantraListing) =>
    (!deity || mantra.deities.includes(deity)) &&
    (!onlyAudio || mantra.hasAudio) &&
    (!needle || mantra.title.toLowerCase().includes(needle));
  const shown = hub.mantras.filter(matches).length;

  const pick = (id: string) => {
    const next = deity === id ? '' : id;
    setDeity(next);
    if (!next) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('all')?.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
  };

  return (
    <SiteFrame path={path} meta={meta}>
      <section className="mx-hero">
        <Ribbon />
        <div className="mh-wrap mx-hero-grid">
          <div>
            <nav className="mh-crumbs mx-rise" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/library">Library</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Mantras</span>
            </nav>
            <div className="mx-chips mx-rise mx-d1">
              <Link href="/mantra-api" className="mx-chip">
                <span lang="sa-Deva" className="mh-deva">
                  मन्त्र
                </span>
                Mantra API
              </Link>
            </div>
            <h1 className="mx-rise mx-d2">Every mantra, one request away.</h1>
            <p className="mx-lede mx-rise mx-d3">
              {hub.total} mantras and stotras in Devanagari with transliteration, {hub.audio} with
              recordings. Filter by deity, then fetch any hymn by its stable id.
            </p>
            <div className="mx-rise mx-d4">
              <EndpointPill path={LIST_PATH} />
            </div>
            <div className="mx-actions mx-rise mx-d5">
              <KeyButton />
              <a href="#all" className="mh-btn mh-btn-ghost">
                Browse all {hub.total}
              </a>
            </div>
            <Stats
              items={[
                [hub.total, 'mantras and stotras'],
                [hub.audio, 'with recordings'],
                [hub.deities.length, 'deities'],
              ]}
            />
          </div>
          <div className="mx-art mx-rise mx-d3" aria-hidden="true">
            <div className="mx-stack">
              <div className="mx-sheet">
                <span>nextCursor · page 2</span>
              </div>
              <div className="mx-spec mx-dots">
                <div className="mx-scan" />
                <div className="mx-spec-head">
                  <span className="mx-ok">GET</span>
                  <span>/v1/mantras?deity=shiva</span>
                  <span className="mx-ok">200</span>
                </div>
                <div className="mx-spec-body">
                  <span className="mx-field">data[]</span>
                  <ol className="mx-lrows">
                    {hub.sample.map((mantra, i) => (
                      <li key={mantra.slug} style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
                        <span className="mx-lrow-i">{i}</span>
                        <span className="mx-lrow-text">
                          <span lang="sa-Deva">{mantra.opening}</span>
                          <b>{mantra.title}</b>
                        </span>
                        <span className="mx-lrow-v">{mantra.verseCount}</span>
                        {mantra.hasAudio && <span className="mx-lrow-audio">audio</span>}
                      </li>
                    ))}
                  </ol>
                  <p className="mx-lrow-cursor">
                    <span>&quot;nextCursor&quot;</span>: &quot;…&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-section" aria-labelledby="by-deity">
        <div className="mh-wrap">
          <div data-reveal>
            <p className="mx-kicker">By deity</p>
            <h2 className="mx-h2" id="by-deity">
              {hub.deities.length} deities. One filter.
            </h2>
            <p className="mx-sub">
              Pick a deity to filter the list below, or pass the same id as <code>?deity=</code> in
              your request.
            </p>
          </div>
          <div className="mx-tiles">
            {tiles.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="mx-tile mx-dots"
                aria-pressed={deity === entry.id}
                onClick={() => pick(entry.id)}
                data-reveal
              >
                <span className="mx-tile-top">
                  <code>?deity={entry.id}</code>
                  <b>{entry.count}</b>
                </span>
                {DEITY_SANSKRIT[entry.id] && (
                  <span className="mx-tile-sa" lang="sa-Deva">
                    {DEITY_SANSKRIT[entry.id]}
                  </span>
                )}
                <span className="mx-tile-name">{entry.name}</span>
                <span className="mx-vol-bar" aria-hidden="true">
                  <span
                    style={{ width: `${Math.max(4, Math.round((entry.count / most) * 100))}%` }}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="mx-more" data-reveal>
            <span>More</span>
            {more.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="mx-chip"
                aria-pressed={deity === entry.id}
                onClick={() => pick(entry.id)}
              >
                {entry.name} <small>{entry.count}</small>
              </button>
            ))}
          </div>
          <nav className="mx-deity-links" aria-label="Mantra pages by deity" data-reveal>
            <span>Open a deity’s page</span>
            {hub.deities.map((entry) => (
              <Link key={entry.id} href={entry.path}>
                {entry.name} mantras
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-section">
        <div className="mh-wrap">
          <div className="mx-head" data-reveal>
            <div>
              <p className="mx-kicker">Most requested</p>
              <h2 className="mx-h2">Start with the ones people chant most.</h2>
            </div>
          </div>
          <div className="mx-grid mx-grid-wide">
            {hub.featured.map((mantra) => (
              <Link key={mantra.slug} href={mantra.path} className="mx-mcard mx-dots" data-reveal>
                <span className="mx-field">deity: &quot;{mantra.deities[0]}&quot;</span>
                {mantra.opening && (
                  <p className="mx-mcard-sa" lang="sa-Deva">
                    {mantra.opening}
                  </p>
                )}
                <h3>{mantra.title}</h3>
                <div className="mx-tags">
                  <span>{plural(mantra.verseCount, 'verse')}</span>
                  {mantra.hasAudio && <span className="mx-tag-ok">audio ✓</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-section" id="all" style={{ scrollMarginTop: 84 }}>
        <div className="mh-wrap">
          <div className="mx-head" data-reveal>
            <div>
              <p className="mx-kicker">All mantras</p>
              <h2 className="mx-h2">
                {active ? `${active.name} mantras` : 'Find a mantra by name.'}
              </h2>
            </div>
            <div className="mx-filters">
              <label className="mx-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="mh-sr">Search mantras by name</span>
                <input
                  type="search"
                  value={query}
                  placeholder="Search by name"
                  autoComplete="off"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={onlyAudio}
                className="mx-switch"
                onClick={() => setOnlyAudio(!onlyAudio)}
              >
                <i aria-hidden="true" />
                With recording
              </button>
              {active && (
                <button
                  type="button"
                  className="mx-chip mx-chip-clear"
                  aria-label={`Clear the ${active.name} filter`}
                  onClick={() => setDeity('')}
                >
                  {active.name} <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          </div>
          <div className="mx-table" data-reveal>
            <div className="mx-table-head" aria-hidden="true">
              <span>Mantra</span>
              <span>Deity</span>
              <span>Verses</span>
              <span>Audio</span>
              <span />
            </div>
            <div className="mx-table-scroll" tabIndex={0} role="region" aria-label="Mantras">
              <ul>
                {hub.mantras.map((mantra) => (
                  <li key={mantra.slug} hidden={!matches(mantra)}>
                    <Link href={mantra.path} className="mx-row">
                      <span className="mx-row-title">
                        <b>{mantra.title}</b>
                        <code>GET /v1/mantras/{mantra.id}</code>
                      </span>
                      <span className="mx-row-deity">
                        {mantra.deities.map((id) => names.get(id) ?? id).join(', ')}
                      </span>
                      <span className="mx-row-verses">{plural(mantra.verseCount, 'verse')}</span>
                      <span className="mx-row-audio">
                        {mantra.hasAudio && <span>audio</span>}
                      </span>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
              {shown === 0 && (
                <p className="mx-empty">No mantras match. Try another name or clear the filters.</p>
              )}
            </div>
            <div className="mx-table-foot">
              <span aria-live="polite">
                Showing {shown} of {hub.total} mantras
                {active ? ` · ${active.name}` : ''}
                {onlyAudio ? ' · with a recording' : ''}
              </span>
              <span>Sorted A to Z</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-section">
        <div className="mh-wrap mx-response mx-list-demo">
          <div data-reveal>
            <p className="mx-kicker">List and filter</p>
            <h2 className="mx-h2">Page through a deity’s mantras.</h2>
            <p className="mx-sub">
              Each page holds up to 20 mantras with their ids, verse counts and whether a recording
              exists. Pass <code>nextCursor</code> back as <code>cursor</code> until it comes back
              null.
            </p>
            <CodePanel
              title={`${LIST_PATH} · first 2 of 20`}
              status="200 OK"
              json={hub.response}
            />
          </div>
          <div data-reveal>
            <CodeTabs snippets={listSnippets} label="Request language" />
            <p className="mx-links">
              <Link href="/docs#list-mantras">List endpoint reference</Link> ·{' '}
              <Link href="/docs/guides/search-mantras">Build a searchable library</Link> ·{' '}
              <Link href="/mantra-api">Mantra API</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="mx-section" style={{ paddingBottom: 96 }}>
        <div className="mh-wrap">
          <div className="mx-closing" data-reveal>
            <div>
              <p className="mx-kicker">Start free</p>
              <h2 className="mx-h2">Fetch your first mantra in a minute.</h2>
              <p>
                Every account starts with a sandbox key and sample mantras, so you can build before
                you subscribe.
              </p>
              <div className="mx-actions">
                <KeyButton />
                <Link href="/docs" className="mh-btn mh-btn-ghost">
                  Read the docs
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

export default function MantraPage() {
  const data = useLoaderData() as Data;
  if (!data) return <NotFound />;
  if (data.kind === 'hub') return <Hub {...data} />;
  if (data.kind === 'deity') return <Deity page={data.page} />;
  return <MantraDetail page={data.page} />;
}
