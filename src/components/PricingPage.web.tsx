import { Link } from 'expo-router';
import { Arrow, Callout, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';
import { PlanAction, PlanCards, comparisonRows } from './site/Plans.web';
import { plans } from '../data/plans';

export default function PricingPage() {
  return (
    <SiteFrame path="/pricing">
      <PageHero
        crumb="Pricing"
        eyebrow="Pricing"
        title="Start free. Pay as your product grows."
        lede="Every account starts with a sandbox key. Subscribe for a live key, the full catalog and higher limits. Monthly billing in USD; allowances reset monthly in UTC."
      />
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <PlanCards />
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <div className="mh-heading mh-heading-left">
            <h2>Compare plans</h2>
            <p>Each row matches the limits the API and billing enforce.</p>
          </div>
          <div
            className="mh-table mh-compare"
            tabIndex={0}
            role="region"
            aria-label="Plan comparison"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="mh-sr">Feature</span>
                  </th>
                  {plans.map((p) => (
                    <th
                      scope="col"
                      key={p.name}
                      className={p.name === 'Growth' ? 'is-featured' : undefined}
                    >
                      {p.name}
                      <span>{p.price ? `$${p.price}/mo` : 'Free'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([label, ...values]) => (
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
                    <span className="mh-sr">Next step</span>
                  </th>
                  {plans.map((p) => (
                    <td key={p.name} className={p.name === 'Growth' ? 'is-featured' : undefined}>
                      <PlanAction plan={p} featured={p.name === 'Growth'} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <Callout>
            A customer product is an app or website covered by your plan. Audio allowances measure
            data delivered, not storage. Each successful astrology calculation counts as one
            request; failed requests are never counted. Commercial use is subject to the{' '}
            <Link href="/license">content license</Link>.
          </Callout>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-cards-3">
          <Link href="/library" className="mh-card mh-card-pad mh-card-link">
            <h3>What each plan reads</h3>
            <p>Browse mantras, recordings, book collections and astrology in the Library.</p>
            <span>
              Open the Library <Arrow />
            </span>
          </Link>
          <Link href="/docs#limits" className="mh-card mh-card-pad mh-card-link">
            <h3>How usage is counted</h3>
            <p>Rate limits, quota headers and what happens when an allowance runs out.</p>
            <span>
              Usage limits <Arrow />
            </span>
          </Link>
          <Link href="/implementation" className="mh-card mh-card-pad mh-card-link">
            <h3>Scope the integration</h3>
            <p>Guides by goal, each with a working request and its quota behavior.</p>
            <span>
              Implementation guides <Arrow />
            </span>
          </Link>
        </div>
      </section>
      <CtaBand
        title="Start with the sandbox."
        copy="No card needed. Upgrade when you are ready for the full catalog."
      />
    </SiteFrame>
  );
}
