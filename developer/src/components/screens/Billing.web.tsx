import { useConsole } from '../Session.web';
import { Badge, Empty, ErrorNotice, Loading, PageTitle, useLoad } from '../ui.web';
import type { Addon, Plan } from '../../lib/types';

export default function Billing() {
  const { session } = useConsole();
  const config = useLoad<{ plans: Plan[]; astrology: Addon[] }>('/api/config'),
    billing = useLoad<{ monthlyTotal: number; notice: string }>('/api/billing');
  if (!session) return null;
  return (
    <>
      <PageTitle
        eyebrow="SUBSCRIPTION"
        title="Billing & plans"
        copy="Content, audio delivery, and proposed astrology are separate allowances."
      />
      <ErrorNotice message={config.error || billing.error} />
      <div className="billing-summary panel">
        <div>
          <span className="eyebrow">CURRENT WORKSPACE PLAN</span>
          <h2>{session.plan.name}</h2>
          <p>
            {session.mode === 'demo'
              ? 'Local demo plan · No subscription or payment'
              : 'Server-assigned plan · Billing provider not connected'}
          </p>
        </div>
        <dl>
          <div>
            <dt>Content plan</dt>
            <dd>${session.plan.price}/month</dd>
          </div>
          <div>
            <dt>Astrology add-on</dt>
            <dd>Not active · $0</dd>
          </div>
          <div className="total">
            <dt>Displayed monthly total</dt>
            <dd>${billing.data?.monthlyTotal ?? session.plan.price}/month</dd>
          </div>
        </dl>
      </div>
      <div className="notice">
        {billing.data?.notice ||
          'Billing configuration is required. No payments or entitlement upgrades are enabled.'}{' '}
        Billing dates, renewal details, and invoices are unavailable without real provider records.
      </div>
      <div className="section-title">
        <h2>Monthly content plans</h2>
        <span>All allowances reset monthly</span>
      </div>
      {config.loading ? (
        <Loading />
      ) : (
        <div className="plan-grid">
          {config.data?.plans.map((plan) => (
            <article
              className={`plan-card ${plan.name === session.plan.name ? 'current' : ''}`}
              key={plan.name}
            >
              <h3>{plan.name}</h3>
              <div className="plan-price">
                {plan.price ? `$${plan.price}` : 'Free'}
                <small>{plan.price ? '/ month' : 'Sandbox'}</small>
              </div>
              <ul>
                <li>{plan.requests} content requests</li>
                <li>
                  {plan.audio}
                  {plan.price ? ' audio delivery' : ''}
                </li>
                <li>{plan.catalog}</li>
                <li>
                  {plan.products} {plan.price ? 'customer products' : ''}
                </li>
                <li>{plan.support}</li>
              </ul>
              <button className="button outline" disabled>
                {plan.name === session.plan.name
                  ? 'Current workspace plan'
                  : 'Billing setup required'}
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="footnote">
        Paid content plans include the full available catalog of mantras, shlokas, sacred audio,
        shastras/books, and discovery, subject to the documented content license. A customer product
        is an app or website. Audio allowances measure data delivery, not storage.
      </p>
      <div className="section-title">
        <h2>Astrology add-ons</h2>
        <Badge tone="saffron">PURCHASES DISABLED</Badge>
      </div>
      <div className="addon-grid">
        {config.data?.astrology.map((addon) => (
          <article className="panel addon-card" key={addon.id}>
            <Badge>PROPOSED</Badge>
            <h3>{addon.name}</h3>
            <strong>
              ${addon.price}
              <small>/month</small>
            </strong>
            <p>{addon.credits.toLocaleString()} provisional monthly credits</p>
            <p>
              With {addon.plan}: <b>${addon.combined}/month</b>
            </p>
            <button className="button outline" disabled>
              Not available for purchase
            </button>
          </article>
        ))}
      </div>
      <div className="notice">
        Credit allowances are provisional. Purchases cannot activate until endpoint credit costs,
        accounting policy, and billing configuration are confirmed.
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Invoices</h2>
        </div>
        <Empty title="No billing records are connected.">
          No paid status, renewal date, or invoice is inferred from a browser redirect.
        </Empty>
      </section>
    </>
  );
}
