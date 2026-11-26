import { Link } from '../i18n/Link.web';
import { Arrow, CtaBand, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { productPages, type ProductSlug } from '../data/products';
import { contentItems, guideHref } from '../data/library';
import { seoPages } from '../data/site';
import { useI18n } from '../i18n';

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

const RELATED = ['/mantra-api', '/sacred-audio-api', '/books-api', '/astrology-api'];

export default function ProductPage({ slug }: { slug: ProductSlug }) {
  const page = productPages[slug];
  const link = ITEM[slug];
  const item = contentItems.find((i) => i.id === link.item)!;
  const { t } = useI18n();
  // src/data/products.ts is the English source, mirrored under products.<slug>.
  const key = `products.${slug}`;
  const text = {
    title: t(`${key}.title`) || page.title,
    intro: t(`${key}.intro`) || page.intro,
    status: t(`${key}.status`) || page.status,
    exampleTitle: t(`${key}.exampleTitle`) || page.exampleTitle,
    sections: page.sections.map((s, i) => ({
      title: t(`${key}.sections.s${i}.title`) || s.title,
      copy: t(`${key}.sections.s${i}.copy`) || s.copy,
    })),
    workflow: page.workflow.map((w, i) => t(`${key}.workflow.w${i}`) || w),
  };
  const label = t(`meta./${slug}.label`) || seoPages[`/${slug}`]?.label;
  return (
    <SiteFrame path={`/${slug}`}>
      <PageHero
        crumb={label}
        eyebrow={label ?? 'API'}
        title={text.title}
        lede={text.intro}
        actions={
          <>
            <KeyButton href={item.sandbox ?? undefined}>{t('product.try')}</KeyButton>
            <Link href={guideHref(link.guide)} className="mh-btn mh-btn-ghost">
              {t('product.guide')} <Arrow />
            </Link>
          </>
        }
        aside={
          <div className="mh-stack">
            <CodePanel title={item.path} method={item.method} code={item.request} />
            <CodePanel title={text.exampleTitle} status="200 OK" json={item.response} />
          </div>
        }
      >
        <p className="mh-hero-note">{text.status}</p>
      </PageHero>
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <h2 className="mh-sr">{t('product.build')}</h2>
          <div className="mh-cards-2">
            {text.sections.map((s) => (
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
            <h2>{t('shelf.flow.kicker')}</h2>
            <ol className="mh-steps">
              {text.workflow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="mh-stack">
            <Link href={link.library} className="mh-card mh-card-pad mh-card-link">
              <h3>{t('product.browse')}</h3>
              <p>{t('product.browseCopy')}</p>
              <span>
                {t('product.openLibrary')} <Arrow />
              </span>
            </Link>
            {slug === 'books-api' && (
              <nav aria-label={t('product.booksNav')} className="mh-chips">
                <Link href="/docs#epic-ramayana">{t('product.ramayana')}</Link>
                <Link href="/docs#epic-mahabharata">{t('product.mahabharata')}</Link>
                <Link href="/library/books/bhagavad-gita">Bhagavad Gita</Link>
                <Link href="/library/books/isha-upanishad">Isha Upanishad</Link>
                <Link href="/library/books/upanishads">{t('shelf.flow.upanishads')}</Link>
                <Link href="/docs/guides/book-reader">{t('shelf.closing.guide')}</Link>
              </nav>
            )}
            <Link href={item.docs} className="mh-card mh-card-pad mh-card-link">
              <h3>{t('astroPage.reference')}</h3>
              <p>{t('product.referenceCopy', { path: item.path.replace(/\?.*$/, '') })}</p>
              <span>
                {t('product.readDocs')} <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <nav className="mh-chips" aria-label={t('product.otherApis')}>
            {RELATED.filter((href) => href !== `/${slug}`).map((href) => (
              <Link key={href} href={href} className="mh-chip">
                {t(`meta.${href}.label`)}
              </Link>
            ))}
            <Link href="/pricing" className="mh-chip">
              {t('nav.pricing')}
            </Link>
            <Link href="/license" className="mh-chip">
              {t('product.license')}
            </Link>
          </nav>
        </div>
      </section>
      <CtaBand title={t('product.ctaTitle')} copy={t('product.ctaCopy')} />
    </SiteFrame>
  );
}
