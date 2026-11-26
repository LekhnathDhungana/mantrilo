import { Link } from '../i18n/Link.web';
import { calculatorHub, calculatorPages } from '../data/calculator-pages';
import { Arrow, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';
import { useI18n } from '../i18n';
import { calculatorText } from '../i18n/calculators';

export default function CalculatorHub() {
  const { t } = useI18n();
  return (
    <SiteFrame path={calculatorHub.path}>
      <PageHero
        eyebrow={t('calculators.hub.eyebrow')}
        crumb={t('meta./calculators.label') || calculatorHub.label}
        title={t('calculators.hub.title')}
        lede={t('calculators.hub.lede')}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-calc-cards">
          {calculatorPages.map((page) => {
            const text = calculatorText(t, page);
            return (
              <Link key={page.slug} href={page.path} className="mh-card mh-card-pad">
                <h3>{text.label}</h3>
                <p>{text.lede}</p>
                <span className="mh-card-link">
                  {t('calculators.hub.open')} <Arrow />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <CtaBand title={t('calculators.hub.ctaTitle')} copy={t('calculators.hub.ctaCopy')} />
    </SiteFrame>
  );
}
