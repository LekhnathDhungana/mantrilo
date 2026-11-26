import { Link } from '../i18n/Link.web';
import { Arrow, CtaBand, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CatalogBrowser } from './site/Catalog.web';
import { consoleSandboxUrl } from '../data/site';
import { astrologyCategories, astrologyItems } from '../data/library';
import { useI18n } from '../i18n';

const available = astrologyItems.filter((item) => !item.limited).length;

export default function AstrologyPage() {
  const { t, number } = useI18n();
  return (
    <SiteFrame path="/astrology-api">
      <PageHero
        crumb={t('nav.astrology')}
        eyebrow={t('meta./astrology-api.label')}
        title={t('astroPage.title')}
        lede={t('astroPage.lede')}
        actions={
          <>
            <KeyButton href={consoleSandboxUrl({ operation: 'positions' })}>
              {t('astroPage.tryPositions')}
            </KeyButton>
            <Link href="/docs#astrology-calculate" className="mh-btn mh-btn-ghost">
              {t('astroPage.reference')} <Arrow />
            </Link>
          </>
        }
        aside={
          <dl className="mh-stat-grid">
            <div>
              <dt>{t('astroPage.stats.capabilities')}</dt>
              <dd>{number(astrologyItems.length)}</dd>
            </div>
            <div>
              <dt>{t('astroPage.stats.available')}</dt>
              <dd>{number(available)}</dd>
            </div>
            <div>
              <dt>{t('astroPage.stats.categories')}</dt>
              <dd>{number(astrologyCategories.length)}</dd>
            </div>
            <div>
              <dt>{t('astroPage.stats.endpoint')}</dt>
              <dd>
                <code>POST /v1/astrology/calculate</code>
              </dd>
            </div>
          </dl>
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <nav className="mh-chips" aria-label={t('astroPage.featured')}>
            {[
              '/astrology-api/planetary-positions',
              '/astrology-api/instant-panchang',
              '/astrology-api/daily-panchang',
            ].map((path) => (
              <Link key={path} href={path} className="mh-chip">
                {t(`meta.${path}.label`)}
              </Link>
            ))}
            <Link href="/docs/guides/vedic-birth-chart" className="mh-chip">
              {t('astroPage.chartGuide')}
            </Link>
          </nav>
          <CatalogBrowser
            pathname="/astrology-api"
            items={astrologyItems}
            fixedArea="astrology"
            placeholder={t('astroPage.search', { n: number(astrologyItems.length) })}
          />
          <p className="mh-muted mh-catalog-note">{t('astroPage.note')}</p>
        </div>
      </section>
      <CtaBand title={t('astroPage.ctaTitle')} copy={t('astroPage.ctaCopy')} />
    </SiteFrame>
  );
}
