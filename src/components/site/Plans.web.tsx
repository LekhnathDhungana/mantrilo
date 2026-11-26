import { plans } from '../../data/plans';
import { rateLimits } from '../../data/api-reference';
import { consoleUrl, signUpUrl } from '../../data/site';
import indiaPrices from '../../../shared/india-prices.json';
import { intlLocale, useI18n, type I18n } from '../../i18n';

// Plan cards shared by the homepage and /pricing. Values come from shared/content-plans.json,
// the same file billing checks Stripe prices against; their wording lives under plans.* in the
// locale files, keyed by plan name.

export type Plan = (typeof plans)[number];
const FEATURED = 'Growth';

const count = (value: string) => Number(value.replace(/[^\d]/g, ''));
export const planName = ({ t }: I18n, name: string) => t(`plans.names.${name}`) || name;
const requests = ({ number }: I18n, plan: Plan) => number(count(plan.requests));
const products = ({ t, number }: I18n, plan: Plan) =>
  t('plans.customerProducts', { count: count(plan.products), n: number(count(plan.products)) });

export function planPrice({ t, lang }: I18n, plan: Plan, india: boolean) {
  if (!india)
    return new Intl.NumberFormat(intlLocale(lang), {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: Number.isInteger(plan.price) ? 0 : 2,
    }).format(plan.price);
  const amount = indiaPrices[plan.name as keyof typeof indiaPrices];
  return amount === null
    ? t('plans.customQuote')
    : new Intl.NumberFormat(intlLocale(lang), {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);
}

export function PlanAction({
  plan,
  featured,
  india = false,
}: {
  plan: Plan;
  featured?: boolean;
  india?: boolean;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const className = featured ? 'mh-btn mh-btn-primary' : 'mh-btn mh-btn-outline';
  if (india && plan.name === 'Business')
    return (
      <a
        className={className}
        href="mailto:hello@mantrilo.com?subject=Mantrilo%20Business%20India%20quote"
      >
        {t('plans.requestQuote')}
      </a>
    );
  const label = plan.price
    ? t('plans.choose', { plan: planName(i18n, plan.name) })
    : t('plans.startFree');
  // Free starts at sign-up; a paid plan opens billing, which asks the visitor to sign in first.
  return (
    <a
      className={className}
      href={
        plan.price
          ? `${consoleUrl}/billing?plan=${encodeURIComponent(plan.name)}${india ? '&market=IN' : ''}`
          : signUpUrl
      }
    >
      {label}
    </a>
  );
}

export function PlanCards({
  reveal = false,
  india = false,
}: {
  reveal?: boolean;
  india?: boolean;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <div className="mh-plans">
      {plans.map((p, i) => {
        const featured = p.name === FEATURED;
        return (
          <article
            key={p.name}
            className={featured ? 'mh-card mh-plan is-featured' : 'mh-card mh-plan'}
            data-reveal={reveal || undefined}
            style={reveal ? { transitionDelay: `${i * 60}ms` } : undefined}
          >
            <div className="mh-plan-head">
              <h3>{planName(i18n, p.name)}</h3>
              {featured && <span className="mh-badge">{t('plans.recommended')}</span>}
            </div>
            <p className="mh-price">
              {india && p.name === 'Business' ? (
                planPrice(i18n, p, india)
              ) : p.price ? (
                <>
                  {planPrice(i18n, p, india)}
                  <span>{t('plans.perMonth')}</span>
                </>
              ) : (
                <>
                  {planPrice(i18n, p, india)}
                  <span>{t('plans.forever')}</span>
                </>
              )}
            </p>
            <p className="mh-plan-sub">
              {p.price ? t('plans.fullCatalog') : t('plans.sandboxForTesting')}
            </p>
            <PlanAction plan={p} featured={featured} india={india} />
            <ul>
              <li>
                {t('plans.requestsPerMonthPrefix')}
                <strong>{requests(i18n, p)}</strong> {t('plans.requestsPerMonth')}
              </li>
              <li>
                {p.price
                  ? t('plans.audioDelivery', { audio: p.audio })
                  : t('plans.sampleTextAudio')}
              </li>
              <li>{p.price ? products(i18n, p) : t('plans.firstFive')}</li>
              <li>{t('plans.astrology')}</li>
              <li>{t(`plans.support.${p.name}`)}</li>
            </ul>
          </article>
        );
      })}
    </div>
  );
}

export function comparisonRows(i18n: I18n): [string, ...string[]][] {
  const { t, number } = i18n;
  const full = t('plans.fullCatalog');
  return [
    [t('plans.rows.requests'), ...plans.map((p) => requests(i18n, p))],
    [
      t('plans.rows.audio'),
      ...plans.map((p) => (p.price ? p.audio : t('plans.sampleAudio', { size: '50 MB' }))),
    ],
    [t('plans.rows.mantras'), ...plans.map((p) => (p.price ? full : t('plans.firstFiveShort')))],
    [t('plans.rows.books'), ...plans.map((p) => (p.price ? full : t('plans.sampleBooks')))],
    [t('plans.rows.astrology'), ...plans.map(() => t('plans.astrologyIncluded'))],
    [
      t('plans.rows.rateLimit'),
      ...plans.map((p) => {
        const row = rateLimits.find(([name]) => name === p.name);
        return row
          ? t('plans.rateLimit', {
              rate: number(count(row[1])),
              burst: number(count(row[2])),
            })
          : '—';
      }),
    ],
    [
      t('plans.rows.keys'),
      ...plans.map((p) => (p.price ? t('plans.sandboxLive') : t('plans.sandbox'))),
    ],
    [
      t('plans.rows.products'),
      ...plans.map((p) => (p.price ? number(count(p.products)) : t('plans.testingOnly'))),
    ],
    [t('plans.rows.support'), ...plans.map((p) => t(`plans.support.${p.name}`))],
  ];
}
