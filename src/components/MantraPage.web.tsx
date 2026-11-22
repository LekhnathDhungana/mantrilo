import { Link, useLoaderData } from 'expo-router';
import type {
  DeityPage,
  MantraHub,
  MantraListing,
  MantraPage as Mantra,
} from '../data/mantra-pages';
import type { PageMeta } from '../data/metadata';
import { audioResponse, auth, curlGet } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import MantraAudio from './MantraAudio.web';
import NotFound from './NotFound';
import { Callout, DataTable, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';

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

function MantraDetail({ page }: { page: Mantra }) {
  const { mantra } = page;
  const path = `/v1/mantras/${mantra.id}`;
  const audioPath = `${path}/audio?format=json`;
  const verseCount = mantra.verseCount;
  const shown = mantra.verses.length;
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
  return (
    <SiteFrame path={page.path} meta={page.meta}>
      <PageHero
        eyebrow={`Mantra API · ${mantra.deities.map((deity) => deity.name).join(' · ')}`}
        title={mantra.title}
        lede={page.lede}
        actions={
          mantra.sandbox ? (
            <KeyButton href={consoleSandboxUrl({ preset: 'featured-mantra' })}>
              Try this mantra in the sandbox
            </KeyButton>
          ) : (
            <KeyButton />
          )
        }
        aside={
          <dl className="mh-stat-grid">
            <div>
              <dt>Verses</dt>
              <dd>{verseCount}</dd>
            </div>
            <div>
              <dt>Recording</dt>
              <dd>{mantra.hasAudio ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Mantra id</dt>
              <dd>
                <code>{mantra.id}</code>
              </dd>
            </div>
            {mantra.citedSource && (
              <div>
                <dt>Source</dt>
                <dd>{mantra.citedSource}</dd>
              </div>
            )}
          </dl>
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose mh-stack">
            <h2>Request this mantra</h2>
            <p>
              Call the API from your server with your key. The id is stable, so you can store it and
              link to it.
            </p>
            <CodePanel title={path} method="GET" code={curlGet(path)} />
            <CodePanel title="server.mjs" code={jsRequest(mantra.id)} lang="js" />
            <h2>Response</h2>
            <p>
              This is the response for this mantra
              {verseCount > page.shownVerses
                ? `, with the first ${plural(page.shownVerses, 'verse')} of ${verseCount} shown`
                : ''}
              . Every field is listed below.
            </p>
            <CodePanel title={path} status="200 OK" json={page.response} />
            <h2>Fields</h2>
            <DataTable
              label={`Fields returned for ${mantra.title}`}
              head={['Field', 'Type', 'Value for this mantra']}
              rows={fields}
            />
            {mantra.hasAudio ? (
              <>
                <h2>Recording</h2>
                <MantraAudio id={mantra.id} title={mantra.title} />
                <p>
                  In your app, ask your server for a signed link and pass it to your player. Links
                  expire after 15 minutes and count toward your plan’s monthly audio allowance.
                </p>
                <CodePanel title={audioPath} method="GET" code={curlGet(audioPath)} />
                <CodePanel
                  title="Response · placeholder link"
                  status="200 OK"
                  json={audioResponse}
                />
              </>
            ) : (
              <p>
                This mantra has no recording, so <code>audio</code> is <code>null</code>. Hide the
                player when it is.
              </p>
            )}
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
            <p>
              <Link href="/docs#get-mantra">Mantra endpoint reference</Link> ·{' '}
              <Link href="/docs/guides/search-mantras">Build a searchable library</Link> ·{' '}
              <Link href="/docs/guides/sacred-audio">Audio playback guide</Link>
            </p>
          </div>
          <div className="mh-prose">
            <h2>Text</h2>
            <p className="mh-muted">
              {shown < verseCount
                ? `The first ${shown} of ${verseCount} verses`
                : `${shown === 1 ? 'The verse' : `All ${shown} verses`}`}{' '}
              as the API returns them, in Devanagari and transliteration.
            </p>
            <div className="mh-verses">
              {mantra.verses.map((verse, i) => (
                <article className="mh-verse" key={i}>
                  {verse.title && verse.title !== mantra.title && <h3>{verse.title}</h3>}
                  <p className="mh-verse-key">{verse.number ?? i + 1}</p>
                  {verse.sanskrit && (
                    <p className="mh-preview-verse mh-verse-deva" lang="sa-Deva">
                      {verse.sanskrit}
                    </p>
                  )}
                  {verse.transliteration && (
                    <p className="mh-preview-verse mh-verse-roman" lang="sa-Latn">
                      {verse.transliteration}
                    </p>
                  )}
                </article>
              ))}
            </div>
            {shown < verseCount && (
              <p>
                Your app gets all {verseCount} verses from <code>GET /v1/mantras/{mantra.id}</code>.
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          <h2>More {mantra.deities[0]?.name ?? ''} mantras</h2>
          <MantraList mantras={page.related} />
          <p>
            {mantra.deities.map((deity, i) => (
              <span key={deity.id}>
                {i > 0 && ' · '}
                <Link href={deity.path}>All {deity.name} mantras</Link>
              </span>
            ))}{' '}
            · <Link href="/library/mantras">Mantra library</Link>
          </p>
        </div>
      </section>
    </SiteFrame>
  );
}

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

function Hub({ hub, meta, path }: { hub: MantraHub; meta: PageMeta; path: string }) {
  return (
    <SiteFrame path={path} meta={meta}>
      <PageHero
        eyebrow="Mantra API · Library"
        title="Mantra & stotra library"
        lede={`${hub.total} Sanskrit mantras and stotras, ${hub.audio} with recordings. Each page shows the text, the request and the exact JSON response.`}
        actions={<KeyButton />}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          <h2>By deity</h2>
          <nav className="mh-chips" aria-label="Mantras by deity">
            {hub.deities.map((deity) => (
              <Link key={deity.id} href={deity.path} className="mh-chip">
                {deity.name} · {deity.count}
              </Link>
            ))}
          </nav>
          <h2>All mantras</h2>
          <MantraList mantras={hub.mantras} />
          <CodePanel
            title="/v1/mantras?limit=20"
            method="GET"
            code={curlGet('/v1/mantras?limit=20')}
          />
          <p className="mh-muted">
            Requests need an API key in the header: <code>{auth}</code>.{' '}
            <Link href="/docs#list-mantras">List endpoint reference</Link>
          </p>
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
