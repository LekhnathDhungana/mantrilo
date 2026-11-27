import { plans } from '../../data/plans';
import { rateLimits } from '../../data/api-reference';
import { consoleUrl, signUpUrl } from '../../data/site';
import { intlLocale, useI18n, type I18n } from '../../i18n';

// Plan cards shared by the homepage and /pricing. Values come from shared/content-plans.json,
// the same file billing checks Stripe prices against; their wording lives under plans.* in the
// locale files, keyed by plan name. Every customer, India included, sees and pays these prices.

export type Plan = (typeof plans)[number];
const FEATURED = 'Growth';

const count = (value: string) => Number(value.replace(/[^\d]/g, ''));
export const planName = ({ t }: I18n, name: string) => t(`plans.names.${name}`) || name;
const requests = ({ number }: I18n, plan: Plan) => number(count(plan.requests));
const products = ({ t, number }: I18n, plan: Plan) =>
  t('plans.customerProducts', { count: count(plan.products), n: number(count(plan.products)) });

const money = ({ lang }: I18n, amount: number) =>
  new Intl.NumberFormat(intlLocale(lang), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

// The per-month price. Annual plans are 20% off and also shown per month; they are billed their
// yearly total at once: a round figure such as $479.99, the amount billing checks Stripe against.
export function planPrice(i18n: I18n, plan: Plan, annual = false) {
  return money(i18n, annual ? plan.annualPrice : plan.price);
}

// The line under a plan's price that says how it is billed.
function billedLine(i18n: I18n, plan: Plan, annual: boolean) {
  if (!plan.price) return i18n.t('plans.noCard');
  if (!annual) return i18n.t('plans.billedMonthly');
  return i18n.t('plans.billedAnnually', { total: money(i18n, plan.annualTotal) });
}

export function PlanAction({
  plan,
  featured,
  annual = false,
}: {
  plan: Plan;
  featured?: boolean;
  annual?: boolean;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const className = featured ? 'mh-btn mh-btn-primary' : 'mh-btn mh-btn-outline';
  const label = plan.price
    ? t('plans.choose', { plan: planName(i18n, plan.name) })
    : t('plans.startFree');
  // Free starts at sign-up; a paid plan opens billing, which asks the visitor to sign in first.
  return (
    <a
      className={className}
      href={
        plan.price
          ? `${consoleUrl}/billing?plan=${encodeURIComponent(plan.name)}${annual ? '&interval=year' : ''}`
          : signUpUrl
      }
    >
      {label}
    </a>
  );
}

export function PlanCards({
  reveal = false,
  annual = false,
}: {
  reveal?: boolean;
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
              {planPrice(i18n, p, annual)}
              <span>{p.price ? t('plans.perMonth') : t('plans.forever')}</span>
            </p>
            <p className="mh-plan-billed">{billedLine(i18n, p, annual)}</p>
            <p className="mh-plan-sub">
              {p.price ? t('plans.fullCatalog') : t('plans.sandboxForTesting')}
            </p>
            <PlanAction plan={p} featured={featured} annual={annual} />
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
