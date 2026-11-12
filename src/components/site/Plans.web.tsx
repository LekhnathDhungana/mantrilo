import { Link } from 'expo-router';
import { plans } from '../../data/plans';
import { rateLimits } from '../../data/api-reference';
import { consoleUrl } from '../../data/site';

// Plan cards shared by the homepage and /pricing. Values come from shared/content-plans.json,
// the same file billing checks Stripe prices against.

export type Plan = (typeof plans)[number];
const product = (p: Plan) =>
  `${p.products} customer ${p.products === '1' ? 'product' : 'products'}`;

export function PlanAction({ plan, featured }: { plan: Plan; featured?: boolean }) {
  const className = featured ? 'mh-btn mh-btn-primary' : 'mh-btn mh-btn-outline';
  const label = plan.price ? `Choose ${plan.name}` : 'Start free';
  if (consoleUrl)
    return (
      <a className={className} href={`${consoleUrl}${plan.price ? '/billing' : '/login'}`}>
        {label}
      </a>
    );
  return (
    <Link className={className} href={`/access?plan=${plan.name}`}>
      {label}
    </Link>
  );
}

export function PlanCards({ reveal = false }: { reveal?: boolean }) {
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
              {p.price ? (
                <>
                  ${p.price}
                  <span>/month</span>
                </>
              ) : (
                <>
                  $0<span>forever</span>
                </>
              )}
            </p>
            <p className="mh-plan-sub">{p.price ? p.catalog : 'Sandbox key for testing'}</p>
            <PlanAction plan={p} featured={featured} />
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
