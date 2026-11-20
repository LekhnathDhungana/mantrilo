import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Arrow, Callout, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';
import { PlanAction, PlanCards, comparisonRows, planPrice } from './site/Plans.web';
import { plans } from '../data/plans';
import { useHydrated } from './site/useHydrated';

export default function PricingPage() {
  const [marketChoice, setIndia] = useState<boolean | null>(null);
  const { market } = useLocalSearchParams<{ market?: string }>();
  const hydrated = useHydrated();
  const india = marketChoice ?? (hydrated && market === 'IN');
  return (
    <SiteFrame path="/pricing">
      <PageHero
        crumb="Pricing"
        eyebrow="Pricing"
        title="Mantrilo API plans and limits"
        lede="Every account starts with a sandbox key. Subscribe for a live key, the full catalog and higher limits. Allowances reset monthly in UTC."
      />
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <h2 className="mh-sr">Plans</h2>
          <div role="group" aria-label="Pricing market" className="mh-actions">
            <button type="button" className={india ? 'mh-btn mh-btn-outline' : 'mh-btn mh-btn-primary'} aria-pressed={!india} onClick={() => setIndia(false)}>
              Global · USD
            </button>
            <button type="button" className={india ? 'mh-btn mh-btn-primary' : 'mh-btn mh-btn-outline'} aria-pressed={india} onClick={() => setIndia(true)}>
              India · INR
            </button>
          </div>
          <p className="mh-muted" aria-live="polite">
            {india ? 'India pricing is available for workspaces with a verified India billing address.' : 'Global prices are billed monthly in USD.'}
          </p>
          <PlanCards india={india} />
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
                      <span>{india && p.name === 'Business' ? planPrice(p, india) : p.price ? `${planPrice(p, india)}/mo` : 'Free'}</span>
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
                      <PlanAction plan={p} featured={p.name === 'Growth'} india={india} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <Callout>
            A customer product is an app or website covered by your plan. Each issued audio link
            counts the recording’s file size toward the audio allowance. Each successful astrology
            calculation counts as one request. Commercial use is subject to the{' '}
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
          <Link href="/docs#guides" className="mh-card mh-card-pad mh-card-link">
            <h3>Scope the integration</h3>
            <p>Guides by goal, each with a working request and its quota behavior.</p>
            <span>
              Guides by goal <Arrow />
            </span>
          </Link>
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          <h2>What can I try on the Free plan?</h2>
          <p>
            The Free plan includes a sandbox key, sample catalog access, and {plans[0].requests}{' '}
            requests per month. You do not need a payment card to start.
          </p>
          <ul>
            <li>Five sample mantras and the recordings available for those samples.</li>
            <li>
              The opening chapter and first three stored rows of the{' '}
              <Link href="/library/books/bhagavad-gita">Bhagavad Gita</Link> and{' '}
              <Link href="/library/books/isha-upanishad">Isha Upanishad</Link>.
            </li>
            <li>
              Astrology calculations marked available in the{' '}
              <Link href="/astrology-api">operation catalog</Link>.
            </li>
          </ul>
          <p>
            <Link href="/docs#environments">Compare sandbox and live access</Link>
          </p>
        </div>
      </section>
      <CtaBand
        title="Start with the sandbox."
        copy="No card needed. Upgrade when you are ready for the full catalog."
      />
    </SiteFrame>
  );
}
