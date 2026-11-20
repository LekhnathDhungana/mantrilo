import { plans } from '../../data/plans';
import { rateLimits } from '../../data/api-reference';
import { consoleUrl, signUpUrl } from '../../data/site';
import indiaPrices from '../../../shared/india-prices.json';

// Plan cards shared by the homepage and /pricing. Values come from shared/content-plans.json,
// the same file billing checks Stripe prices against.

export type Plan = (typeof plans)[number];
const product = (p: Plan) =>
  `${p.products} customer ${p.products === '1' ? 'product' : 'products'}`;

export function planPrice(plan: Plan, india: boolean) {
  if (!india) return `$${plan.price}`;
  const amount = indiaPrices[plan.name as keyof typeof indiaPrices];
  return amount === null ? 'Custom quote' : `₹${amount.toLocaleString('en-IN')}`;
}

export function PlanAction({ plan, featured, india = false }: { plan: Plan; featured?: boolean; india?: boolean }) {
  const className = featured ? 'mh-btn mh-btn-primary' : 'mh-btn mh-btn-outline';
  if (india && plan.name === 'Business')
    return (
      <a className={className} href="mailto:hello@mantrilo.com?subject=Mantrilo%20Business%20India%20quote">
        Request a quote
      </a>
    );
  const label = plan.price ? `Choose ${plan.name}` : 'Start free';
  // Free starts at sign-up; a paid plan opens billing, which asks the visitor to sign in first.
  return (
    <a
      className={className}
      href={plan.price ? `${consoleUrl}/billing?plan=${encodeURIComponent(plan.name)}${india ? '&market=IN' : ''}` : signUpUrl}
    >
      {label}
    </a>
  );
}

export function PlanCards({ reveal = false, india = false }: { reveal?: boolean; india?: boolean }) {
  return (
    <div className="mh-plans">
      {plans.map((p, i) => {
        const featured = p.name === 'Growth';
        return (
          <article
            key={p.name}
            className={featured ? 'mh-card mh-plan is-featured' : 'mh-card mh-plan'}
            data-reveal={reveal || undefined}
            style={reveal ? { transitionDelay: `${i * 60}ms` } : undefined}
          >
            <div className="mh-plan-head">
              <h3>{p.name}</h3>
              {featured && <span className="mh-badge">Recommended</span>}
            </div>
            <p className="mh-price">
              {india && p.name === 'Business' ? (
                planPrice(p, india)
              ) : p.price ? (
                <>
                  {planPrice(p, india)}
                  <span>/month</span>
                </>
              ) : (
                <>
                  {planPrice(p, india)}<span>forever</span>
                </>
              )}
            </p>
            <p className="mh-plan-sub">{p.price ? p.catalog : 'Sandbox key for testing'}</p>
            <PlanAction plan={p} featured={featured} india={india} />
            <ul>
              <li>
                <strong>{p.requests}</strong> requests / month
              </li>
              <li>{p.price ? `${p.audio} audio delivery` : 'Sample text & audio'}</li>
              <li>{p.price ? product(p) : 'First 5 items of each resource'}</li>
              <li>Astrology calculations</li>
              <li>{p.support}</li>
            </ul>
          </article>
        );
      })}
    </div>
  );
}

export const comparisonRows: [string, ...string[]][] = [
  ['API requests / month', ...plans.map((p) => p.requests)],
  ['Audio delivery / month', ...plans.map((p) => (p.price ? p.audio : '50 MB sample'))],
  ['Mantras', ...plans.map((p) => (p.price ? 'Full available catalog' : 'First 5'))],
  [
    'Books & collections',
    ...plans.map((p) => (p.price ? 'Full available catalog' : 'Sample books, opening verses')),
  ],
  ['Astrology calculations', ...plans.map(() => 'Included, 1 request each')],
  [
    'Rate limit',
    ...plans.map((p) => {
      const row = rateLimits.find(([name]) => name === p.name);
      return row ? `${row[1]}, burst ${row[2]}` : '—';
    }),
  ],
  ['Keys', ...plans.map((p) => (p.price ? 'Sandbox + live' : 'Sandbox'))],
  ['Customer products', ...plans.map((p) => (p.price ? p.products : 'Testing only'))],
  ['Support', ...plans.map((p) => p.support)],
];
