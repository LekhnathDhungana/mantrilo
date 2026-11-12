import { Link, useLocalSearchParams } from 'expo-router';
import { Arrow, Callout, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import {
  astrologyGuides,
  backendExample,
  contentGuides,
  productionApi,
  type Guide,
} from '../../developer/src/data/integrations';
import { curlGet, curlPost } from '../data/examples';

// Guides by goal. Each leads with a working request, then the server-side integration, then
// pagination and quota. The data is shared with the console's Implementation screen.

const astrology = astrologyGuides();
const all: Guide[] = [...contentGuides, ...astrology];

const GOALS: { id: string; goal: string }[] = [
  { id: 'upanishads', goal: 'Load the Upanishads' },
  { id: 'search-mantras', goal: 'Build a searchable shloka library' },
  { id: 'sacred-audio', goal: 'Play sacred audio' },
  { id: 'book-reader', goal: 'Build a book reader' },
  { id: 'astrology-chart', goal: 'Add birth charts' },
  { id: 'astrology-daily-panchang', goal: 'Add a daily Panchang' },
  { id: 'featured-mantra', goal: 'Feature a daily mantra' },
];

const DOCS: Record<string, string> = {
  'search-mantras': '/docs#list-mantras',
  'featured-mantra': '/docs#get-mantra',
  'sacred-audio': '/docs#mantra-audio',
  upanishads: '/docs#list-books',
  'book-reader': '/docs#get-chapter',
};

const request = (guide: Guide, path = guide.path) =>
  guide.body && path === guide.path ? curlPost(path, guide.body) : curlGet(path);

function libraryHref(guide: Guide) {
  if (guide.area === 'Astrology') return `/astrology-api?item=${guide.id}`;
  if (guide.id === 'upanishads') return '/library?area=books&item=collection-upanishads';
  return `/library?area=${guide.area.toLowerCase()}`;
}

function GuideView({ guide }: { guide: Guide }) {
  return (
    <article className="mh-guide" aria-labelledby="guide-title">
      <p className="mh-detail-type">
        <span className={`mh-type mh-type-${guide.area.toLowerCase()}`}>{guide.area}</span>
        {guide.limited && <span className="mh-chip mh-chip-limited">Limited</span>}
      </p>
      <h2 id="guide-title">{guide.name}</h2>
      <p className="mh-page-lede">{guide.summary}</p>

      <section>
        <h3>
          <span className="mh-flow-n">1</span> Make a working request
        </h3>
        <div className="mh-guide-pair">
          <CodePanel title={guide.path} method={guide.method} code={request(guide)} />
          <CodePanel title={guide.sampleLabel ?? 'Response'} status="200 OK" json={guide.sample} />
        </div>
        {guide.followupPaths && (
          <ul className="mh-followups">
            {guide.followupPaths.map(([label, path]) => (
              <li key={path}>
                <span>{label}</span>
                <code>GET {path}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>
          <span className="mh-flow-n">2</span> Call it from your server
        </h3>
        <p>
          Keep the key in your backend and return only the content to your app. This Node.js server
          exposes one route your app can call.
        </p>
        <CodePanel title="server.mjs" code={backendExample(guide, productionApi)} lang="js" />
        {guide.viewCode && <CodePanel title="In your view" code={guide.viewCode} lang="js" />}
      </section>

      <section>
        <h3>
          <span className="mh-flow-n">3</span> Inputs and pagination
        </h3>
        <p>{guide.inputs}</p>
        <p>{guide.render}</p>
      </section>

      <section>
        <h3>
          <span className="mh-flow-n">4</span> Quota
        </h3>
        <p>{guide.usage}</p>
      </section>

      <div className="mh-actions">
        <Link className="mh-btn mh-btn-ghost" href={libraryHref(guide)}>
          See it in the Library <Arrow />
        </Link>
        <Link className="mh-btn mh-btn-ghost" href={DOCS[guide.id] ?? '/docs#astrology-calculate'}>
          Endpoint reference <Arrow />
        </Link>
        <KeyButton>Get a sandbox key</KeyButton>
      </div>
    </article>
  );
}

export default function ImplementationPage() {
  const { guide: requested } = useLocalSearchParams<{ guide?: string }>();
  const guide = all.find((g) => g.id === requested) ?? all.find((g) => g.id === GOALS[0].id)!;
  const isGoal = GOALS.some((g) => g.id === guide.id);
  return (
    <SiteFrame path="/implementation">
      <PageHero
        crumb="Implementation"
        eyebrow="Implementation guides"
        title="Start from the goal, not the endpoint."
        lede="Each guide starts with a request you can run, then shows the server-side integration, pagination and quota behavior."
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-guides">
          <nav className="mh-guide-nav" aria-label="Guides">
            <p>Goals</p>
            <ul>
              {GOALS.map((g) => (
                <li key={g.id}>
                  <Link
                    push
                    href={{ pathname: '/implementation', params: { guide: g.id } }}
                    aria-current={guide.id === g.id ? 'page' : undefined}
                  >
                    {g.goal}
                  </Link>
                </li>
              ))}
              {!isGoal && (
                <li>
                  <Link
                    href={{ pathname: '/implementation', params: { guide: guide.id } }}
                    aria-current="page"
                  >
                    {guide.name}
                  </Link>
                </li>
              )}
            </ul>
            <p>More</p>
            <ul>
              <li>
                <Link href="/astrology-api">All {astrology.length} astrology capabilities</Link>
              </li>
              <li>
                <Link href="/docs">API reference</Link>
              </li>
            </ul>
          </nav>
          <div>
            <GuideView key={guide.id} guide={guide} />
            <Callout>
              Requests read the base URL from <code>MANTRILO_API_URL</code>. The server example
              falls back to <code>{productionApi}</code>.
            </Callout>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
