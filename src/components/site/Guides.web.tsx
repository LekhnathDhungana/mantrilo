import { Link } from '../../i18n/Link.web';
import { Arrow, KeyButton } from './Chrome.web';
import { Rich } from '../../i18n/Rich';
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
import { useI18n } from '../../i18n';
import { guideText } from '../../i18n/guides';

// Guides by goal, shown inside /docs. Each leads with a working request, then the server-side
// integration, then pagination and quota. The data is shared with the console's Docs guides.

export const astrology = astrologyGuides();
export const allGuides: Guide[] = [...contentGuides, ...astrology];
export const findGuide = (id: string | undefined) => allGuides.find((g) => g.id === id);

// Each goal's label is its guide page's breadcrumb label (meta./docs/guides/<slug>.label).
export const GOALS = Object.entries(publicGuides).map(([slug, { id }]) => ({
  id,
  goalKey: `meta./docs/guides/${slug}.label`,
}));

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
  const { t } = useI18n();
  const text = guideText(t, guide);
  const sandbox = guideSandboxHref(guide);
  return (
    <div className="mh-guide">
      <section>
        <h2>
          <span className="mh-flow-n">1</span> {t('guide.step1')}
        </h2>
        <div className="mh-guide-pair">
          <CodePanel title={guide.path} method={guide.method} code={request(guide)} />
          <CodePanel title={text.sampleLabel} status="200 OK" json={guide.sample} />
        </div>
        {guide.followupPaths && (
          <ul className="mh-followups">
            {guide.followupPaths.map(([label, path], index) => (
              <li key={path}>
                <span>{text.followup(index, label)}</span>
                <code>GET {path}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>
          <span className="mh-flow-n">2</span> {t('guide.step2')}
        </h2>
        <p>{t('guide.step2Copy')}</p>
        <CodePanel title="server.mjs" code={backendExample(guide, productionApi)} lang="js" />
        {guide.viewCode && <CodePanel title={t('guide.inView')} code={guide.viewCode} lang="js" />}
      </section>

      <section>
        <h2>
          <span className="mh-flow-n">3</span> {t('guide.step3')}
        </h2>
        <p>{text.inputs}</p>
        <p>{text.render}</p>
      </section>

      <section>
        <h2>
          <span className="mh-flow-n">4</span> {t('guide.step4')}
        </h2>
        <p>{text.usage}</p>
      </section>

      <div className="mh-actions">
        <Link className="mh-btn mh-btn-ghost" href={libraryHref(guide)}>
          {t('guide.library')} <Arrow />
        </Link>
        <Link className="mh-btn mh-btn-ghost" href={DOCS[guide.id] ?? '/docs#astrology-calculate'}>
          {t('guide.reference')} <Arrow />
        </Link>
        {sandbox && <KeyButton href={sandbox}>{t('guide.trySandbox')}</KeyButton>}
      </div>
      <p className="mh-muted">
        <Rich
          text={t('guide.baseUrl', { api: productionApi })}
          tags={{ env: <code>MANTRILO_API_URL</code>, api: <code>{productionApi}</code> }}
        />
      </p>
    </div>
  );
}
