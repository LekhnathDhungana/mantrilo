import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Link } from '../i18n/Link.web';
import { Arrow, Callout, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';
import { PlanAction, PlanCards, comparisonRows, planName, planPrice } from './site/Plans.web';
import { plans } from '../data/plans';
import { useHydrated } from './site/useHydrated';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';

export default function PricingPage() {
  const [marketChoice, setIndia] = useState<boolean | null>(null);
  const [periodChoice, setAnnual] = useState<boolean | null>(null);
  const { market, interval } = useLocalSearchParams<{ market?: string; interval?: string }>();
  const hydrated = useHydrated();
  const india = marketChoice ?? (hydrated && market === 'IN');
  // Monthly by default; ?interval=year opens on annual. Annual prices are still shown per month.
  const annual = periodChoice ?? (hydrated && interval === 'year');
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <SiteFrame path="/pricing">
      <PageHero
        crumb={t('pricing.crumb')}
        eyebrow={t('pricing.crumb')}
        title={t('pricing.title')}
        lede={t('pricing.lede')}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <h2 className="mh-sr">{t('pricing.plans')}</h2>
          <div className="mh-pricing-controls">
            <div role="group" aria-label={t('pricing.period')} className="mh-period">
              <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>
                {t('pricing.monthly')}
              </button>
              <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>
                {t('pricing.annual')}
                <span className="mh-save">{t('pricing.save')}</span>
              </button>
            </div>
            <div role="group" aria-label={t('pricing.market')} className="mh-actions">
              <button
                type="button"
                className={india ? 'mh-btn mh-btn-outline' : 'mh-btn mh-btn-primary'}
                aria-pressed={!india}
                onClick={() => setIndia(false)}
              >
                {t('pricing.global')}
              </button>
              <button
                type="button"
                className={india ? 'mh-btn mh-btn-primary' : 'mh-btn mh-btn-outline'}
                aria-pressed={india}
                onClick={() => setIndia(true)}
              >
                {t('pricing.india')}
              </button>
            </div>
          </div>
          <p className="mh-muted" aria-live="polite">
            {india
              ? annual
                ? `${t('pricing.indiaNote')} ${t('pricing.annualNote')}`
                : t('pricing.indiaNote')
              : annual
                ? t('pricing.globalNoteAnnual')
                : t('pricing.globalNote')}
          </p>
          <PlanCards india={india} annual={annual} />
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <div className="mh-heading mh-heading-left">
            <h2>{t('pricing.compare')}</h2>
            <p>{t('pricing.compareCopy')}</p>
          </div>
          <div
            className="mh-table mh-compare"
            tabIndex={0}
            role="region"
            aria-label={t('pricing.comparison')}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="mh-sr">{t('pricing.feature')}</span>
                  </th>
                  {plans.map((p) => (
                    <th
                      scope="col"
                      key={p.name}
                      className={p.name === 'Growth' ? 'is-featured' : undefined}
                    >
                      {planName(i18n, p.name)}
                      <span>
                        {india && p.name === 'Business'
                          ? planPrice(i18n, p, india)
                          : p.price
                            ? t('pricing.perMonth', { price: planPrice(i18n, p, india, annual) })
                            : t('pricing.free')}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows(i18n).map(([label, ...values]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {values.map((v, i) => (
                      <td
                        key={i}
                        className={plans[i].name === 'Growth' ? 'is-featured' : undefined}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">
                    <span className="mh-sr">{t('pricing.nextStep')}</span>
                  </th>
                  {plans.map((p) => (
                    <td key={p.name} className={p.name === 'Growth' ? 'is-featured' : undefined}>
                      <PlanAction
                        plan={p}
                        featured={p.name === 'Growth'}
                        india={india}
                        annual={annual}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <Callout>
            <Rich text={t('pricing.callout')} tags={{ link: <Link href="/license" /> }} />
          </Callout>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-cards-3">
          <Link href="/library" className="mh-card mh-card-pad mh-card-link">
            <h3>{t('pricing.cards.reads.title')}</h3>
            <p>{t('pricing.cards.reads.copy')}</p>
            <span>
              {t('pricing.cards.reads.link')} <Arrow />
            </span>
          </Link>
          <Link href="/docs#limits" className="mh-card mh-card-pad mh-card-link">
            <h3>{t('pricing.cards.usage.title')}</h3>
            <p>{t('pricing.cards.usage.copy')}</p>
            <span>
              {t('pricing.cards.usage.link')} <Arrow />
            </span>
          </Link>
          <Link href="/docs#guides" className="mh-card mh-card-pad mh-card-link">
            <h3>{t('pricing.cards.scope.title')}</h3>
            <p>{t('pricing.cards.scope.copy')}</p>
            <span>
              {t('footer.guides')} <Arrow />
            </span>
          </Link>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          <h2>{t('pricing.free.title')}</h2>
          <p>
            {t('pricing.free.copy', {
              requests: i18n.number(Number(plans[0].requests.replace(/\D/g, ''))),
            })}
          </p>
          <ul>
            <li>{t('pricing.free.mantras')}</li>
            <li>
              <Rich
                text={t('pricing.free.books')}
                tags={{
                  gita: <Link href="/library/books/bhagavad-gita" />,
                  isha: <Link href="/library/books/isha-upanishad" />,
                }}
              />
            </li>
            <li>
              <Rich
                text={t('pricing.free.astrology')}
                tags={{ link: <Link href="/astrology-api" /> }}
              />
            </li>
          </ul>
          <p>
            <Link href="/docs#environments">{t('pricing.free.compare')}</Link>
          </p>
        </div>
      </section>
      <CtaBand title={t('pricing.cta.title')} copy={t('pricing.cta.copy')} />
    </SiteFrame>
  );
}
