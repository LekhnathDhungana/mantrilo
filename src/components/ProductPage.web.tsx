import { Link } from 'expo-router';
import { Arrow, CtaBand, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { productPages, type ProductSlug } from '../data/products';
import { contentItems, guideHref } from '../data/library';
import { seoPages } from '../data/site';

// Mantra, audio and books overviews. The example on each page is the Library item it links to.
const ITEM: Record<ProductSlug, { item: string; guide: string; library: string }> = {
  'mantra-api': {
    item: contentItems.find((i) => i.type === 'Mantra')!.id,
    guide: 'search-mantras',
    library: '/library/mantras/aham-vaishvanaro-bhuthva',
  },
  'sacred-audio-api': {
    item: 'recording',
    guide: 'sacred-audio',
    library: '/library/mantras/aham-vaishvanaro-bhuthva',
  },
  'books-api': {
    item: 'collection-upanishads',
    guide: 'upanishads',
    library: '/library#books',
  },
};

const RELATED: [string, string][] = [
  ['/mantra-api', 'Mantra API'],
  ['/sacred-audio-api', 'Sacred audio API'],
  ['/books-api', 'Books API'],
  ['/astrology-api', 'Astrology API'],
];

export default function ProductPage({ slug }: { slug: ProductSlug }) {
  const page = productPages[slug];
  const link = ITEM[slug];
  const item = contentItems.find((i) => i.id === link.item)!;
  return (
    <SiteFrame path={`/${slug}`}>
      <PageHero
        crumb={seoPages[`/${slug}`]?.label}
        eyebrow={seoPages[`/${slug}`]?.label ?? 'API'}
        title={page.title}
        lede={page.intro}
        actions={
          <>
            <KeyButton href={item.sandbox ?? undefined}>Try it in the sandbox</KeyButton>
            <Link href={guideHref(link.guide)} className="mh-btn mh-btn-ghost">
              Implementation guide <Arrow />
            </Link>
          </>
        }
        aside={
          <div className="mh-stack">
            <CodePanel title={item.path} method={item.method} code={item.request} />
            <CodePanel title={page.exampleTitle} status="200 OK" json={item.response} />
          </div>
        }
      >
        <p className="mh-hero-note">{page.status}</p>
      </PageHero>
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <h2 className="mh-sr">What you can build</h2>
          <div className="mh-cards-2">
            {page.sections.map((s) => (
              <article key={s.title} className="mh-card mh-card-pad">
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div>
            <h2>How an integration flows</h2>
            <ol className="mh-steps">
              {page.workflow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="mh-stack">
            <Link href={link.library} className="mh-card mh-card-pad mh-card-link">
              <h3>Browse it in the Library</h3>
              <p>See the public preview and find the related request.</p>
              <span>
                Open the Library <Arrow />
              </span>
            </Link>
            {slug === 'books-api' && (
              <nav aria-label="Books and guides" className="mh-chips">
                <Link href="/docs#epic-ramayana">Ramayana API</Link>
                <Link href="/docs#epic-mahabharata">Mahabharata API</Link>
                <Link href="/library/books/bhagavad-gita">Bhagavad Gita</Link>
                <Link href="/library/books/isha-upanishad">Isha Upanishad</Link>
                <Link href="/library/books/upanishads">Upanishads collection</Link>
                <Link href="/docs/guides/book-reader">Book reader guide</Link>
              </nav>
            )}
            <Link href={item.docs} className="mh-card mh-card-pad mh-card-link">
              <h3>Endpoint reference</h3>
              <p>Parameters, request and response for {item.path.replace(/\?.*$/, '')}.</p>
              <span>
                Read the docs <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <nav className="mh-chips" aria-label="Other APIs">
            {RELATED.filter(([href]) => href !== `/${slug}`).map(([href, label]) => (
              <Link key={href} href={href} className="mh-chip">
                {label}
              </Link>
            ))}
            <Link href="/pricing" className="mh-chip">
              Pricing
            </Link>
            <Link href="/license" className="mh-chip">
              Content license
            </Link>
          </nav>
        </div>
      </section>
      <CtaBand
        title="Try it with a sandbox key."
        copy="Every account starts with sample content, so you can build before you subscribe."
      />
    </SiteFrame>
  );
}
