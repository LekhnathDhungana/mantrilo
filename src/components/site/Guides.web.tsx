import { Link } from 'expo-router';
import { Arrow, KeyButton } from './Chrome.web';
import { CodePanel } from './Code.web';
import {
  astrologyGuides,
  backendExample,
  contentGuides,
  productionApi,
  type Guide,
} from '../../../developer/src/data/integrations';
import { curlGet, curlPost } from '../../data/examples';
import { consoleSandboxUrl } from '../../data/site';
import { publicGuides } from '../../data/public-guides';

// Guides by goal, shown inside /docs. Each leads with a working request, then the server-side
// integration, then pagination and quota. The data is shared with the console's Docs guides.

export const astrology = astrologyGuides();
export const allGuides: Guide[] = [...contentGuides, ...astrology];
export const findGuide = (id: string | undefined) => allGuides.find((g) => g.id === id);

export const GOALS = Object.values(publicGuides).map(({ id, label }) => ({ id, goal: label }));

const DOCS: Record<string, string> = {
  'search-mantras': '/docs#list-mantras',
  'featured-mantra': '/docs#get-mantra',
  'sacred-audio': '/docs#mantra-audio',
  upanishads: '/docs#list-books',
  'book-reader': '/docs#get-chapter',
};

export function guideSandboxHref(guide: Guide) {
  if (guide.limited) return null;
  const operation = guide.area === 'Astrology' ? guide.library.item : undefined;
  return consoleSandboxUrl(operation ? { operation } : { preset: guide.id });
}

const request = (guide: Guide, path = guide.path) =>
  guide.body && path === guide.path ? curlPost(path, guide.body) : curlGet(path);

function libraryHref(guide: Guide) {
  if (guide.id === 'astrology-positions') return '/astrology-api/planetary-positions';
  if (guide.id === 'astrology-panchang') return '/astrology-api/instant-panchang';
  if (guide.area === 'Astrology') return `/astrology-api?item=${guide.id}`;
  if (guide.id === 'upanishads') return '/library/books/upanishads';
  return `/library?area=${guide.area.toLowerCase()}`;
}

// The page heading (name, area and summary) is rendered by the docs header above this.
export function GuideView({ guide }: { guide: Guide }) {
  const sandbox = guideSandboxHref(guide);
  return (
    <div className="mh-guide">
      <section>
        <h2>
          <span className="mh-flow-n">1</span> Make a working request
        </h2>
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
        <h2>
          <span className="mh-flow-n">2</span> Call it from your server
        </h2>
        <p>
          Keep the key in your backend and return only the content to your app. This Node.js server
          exposes one route your app can call.
        </p>
        <CodePanel title="server.mjs" code={backendExample(guide, productionApi)} lang="js" />
        {guide.viewCode && <CodePanel title="In your view" code={guide.viewCode} lang="js" />}
      </section>

      <section>
        <h2>
          <span className="mh-flow-n">3</span> Inputs and pagination
        </h2>
        <p>{guide.inputs}</p>
        <p>{guide.render}</p>
      </section>

      <section>
        <h2>
          <span className="mh-flow-n">4</span> Quota
        </h2>
        <p>{guide.usage}</p>
      </section>

      <div className="mh-actions">
        <Link className="mh-btn mh-btn-ghost" href={libraryHref(guide)}>
          See it in the Library <Arrow />
        </Link>
        <Link className="mh-btn mh-btn-ghost" href={DOCS[guide.id] ?? '/docs#astrology-calculate'}>
          Endpoint reference <Arrow />
        </Link>
        {sandbox && <KeyButton href={sandbox}>Try this request in the sandbox</KeyButton>}
      </div>
      <p className="mh-muted">
        Requests read the base URL from <code>MANTRILO_API_URL</code>. The server example falls back
        to <code>{productionApi}</code>.
      </p>
    </div>
  );
}
