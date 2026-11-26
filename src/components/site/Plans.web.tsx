import { plans } from '../../data/plans';
import { rateLimits } from '../../data/api-reference';
import { consoleUrl, signUpUrl } from '../../data/site';
import indiaPrices from '../../../shared/india-prices.json';
import indiaAnnualPrices from '../../../shared/india-annual-prices.json';
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

const money = ({ lang }: I18n, amount: number, currency: 'USD' | 'INR') =>
  new Intl.NumberFormat(intlLocale(lang), {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

// The per-month amount for a plan. Annual plans are 20% off and also shown per month; twelve of
// them are billed at once (planYearlyTotal). null means India's Business plan, priced by quote.
function perMonth(plan: Plan, india: boolean, annual: boolean): number | null {
  if (!india) return annual ? plan.annualPrice : plan.price;
  const table = annual ? indiaAnnualPrices : indiaPrices;
  return table[plan.name as keyof typeof table];
}

export function planPrice(i18n: I18n, plan: Plan, india: boolean, annual = false) {
  const amount = perMonth(plan, india, annual);
  return amount === null ? i18n.t('plans.customQuote') : money(i18n, amount, india ? 'INR' : 'USD');
}

// What an annual plan charges once a year, computed in cents so 12 × $39.99 is $479.88.
function planYearlyTotal(i18n: I18n, plan: Plan, india: boolean) {
  const amount = perMonth(plan, india, true);
  return amount === null
    ? null
    : money(i18n, (Math.round(amount * 100) * 12) / 100, india ? 'INR' : 'USD');
}

// The line under a plan's price that says how it is billed.
function billedLine(i18n: I18n, plan: Plan, india: boolean, annual: boolean) {
  if (!plan.price) return i18n.t('plans.noCard');
  if (perMonth(plan, india, annual) === null) return '\u00a0';
  if (!annual) return i18n.t('plans.billedMonthly');
  return i18n.t('plans.billedAnnually', { total: planYearlyTotal(i18n, plan, india) });
}

export function PlanAction({
  plan,
  featured,
  india = false,
  annual = false,
}: {
  plan: Plan;
  featured?: boolean;
  india?: boolean;
  annual?: boolean;
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
          ? `${consoleUrl}/billing?plan=${encodeURIComponent(plan.name)}${india ? '&market=IN' : ''}${annual ? '&interval=year' : ''}`
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
  annual = false,
}: {
  reveal?: boolean;
  india?: boolean;
  annual?: boolean;
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
                planPrice(i18n, p, india, annual)
              ) : p.price ? (
                <>
                  {planPrice(i18n, p, india, annual)}
                  <span>{t('plans.perMonth')}</span>
                </>
              ) : (
                <>
                  {planPrice(i18n, p, india)}
                  <span>{t('plans.forever')}</span>
                </>
              )}
            </p>
            <p className="mh-plan-billed">{billedLine(i18n, p, india, annual)}</p>
            <p className="mh-plan-sub">
              {p.price ? t('plans.fullCatalog') : t('plans.sandboxForTesting')}
            </p>
            <PlanAction plan={p} featured={featured} india={india} annual={annual} />
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
