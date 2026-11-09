import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import UsageDetails from './Usage.web';
import {
  Empty,
  ErrorNotice,
  formatBytes,
  formatDate,
  Loading,
  Meter,
  PageTitle,
  useLoad,
} from '../ui.web';
import type { Plan } from '../../lib/types';

export default function Billing() {
  const { session, refresh } = useConsole();
  const { checkout, view: requestedView } = useLocalSearchParams<{
    checkout?: string;
    view?: string;
  }>();
  const [view, setView] = useState(requestedView === 'plans' || checkout ? 'plans' : 'usage');
  const config = useLoad<{ plans: Plan[] }>('/api/config'),
    billing = useLoad<{ monthlyTotal: number; notice: string; purchasable: string[] }>(
      '/api/billing',
    );
  const [pending, setPending] = useState(false),
    [actionError, setActionError] = useState('');
  const record = session?.workspace.billing,
    status = record?.status,
    subscribed = status === 'active' || status === 'trialing' || status === 'past_due',
    awaitingWebhook = checkout === 'success' && !subscribed;
  const purchasable = billing.data?.purchasable ?? [],
    connected = purchasable.length > 0,
    customerId = record?.customerId;
  const syncWithStripe = useCallback(async () => {
    await mutate('/api/billing/sync', 'POST');
    await refresh();
  }, [refresh]);
  // Picks up payments and cancellations made in Stripe. On failure the last known plan stays.
  useEffect(() => {
    if (connected && customerId) syncWithStripe().catch(() => undefined);
  }, [connected, customerId, syncWithStripe]);
  // A payment can take a moment to show as complete after the customer returns.
  useEffect(() => {
    if (!awaitingWebhook || !connected) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries >= 15) clearInterval(timer);
      syncWithStripe().catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [awaitingWebhook, connected, syncWithStripe]);
  if (!session) return null;
  async function goToStripe(path: string, data?: unknown) {
    setPending(true);
    setActionError('');
    try {
      const { url } = await mutate<{ url: string }>(path, 'POST', data);
      window.location.assign(url);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not open Stripe.');
      setPending(false);
    }
  }
  const openPortal = () => goToStripe('/api/billing/portal');
  const subscriptionSummary = record?.cancelsAt
    ? `Ends ${formatDate(record.cancelsAt)}`
    : record?.currentPeriodEnd
      ? `Renews ${formatDate(record.currentPeriodEnd)}`
      : 'Subscription active';
  return (
    <>
      <PageTitle
        eyebrow="YOUR PLAN"
        title="Usage & billing"
        copy="See what you’ve used and manage your plan."
      />
      <ErrorNotice message={config.error || billing.error || actionError} />
      {awaitingWebhook && (
        <div className="notice" role="status">
          Thanks for subscribing. Your plan will update here as soon as Stripe confirms the payment.
        </div>
      )}
      {status === 'past_due' && (
        <div className="notice error" role="alert">
          Your last payment failed. Update your card to keep this plan.{' '}
          <button className="text-button" disabled={pending} onClick={openPortal}>
            Update card
          </button>
        </div>
      )}
      <div className="billing-summary panel">
        <div>
          <span className="eyebrow">CURRENT WORKSPACE PLAN</span>
          <h2>{session.plan.name}</h2>
          <p>
            {session.mode === 'demo'
              ? 'Local demo plan · No subscription or payment'
              : subscribed
                ? subscriptionSummary
                : connected
                  ? 'Free plan · Upgrade whenever you’re ready'
                  : 'Server-assigned plan · Billing provider not connected'}
          </p>
          {connected && record?.customerId && (
            <button className="button subtle" disabled={pending} onClick={openPortal}>
              Manage subscription
            </button>
          )}
        </div>
        <dl>
          <div>
            <dt>Content plan</dt>
            <dd>${session.plan.price}/month</dd>
          </div>
          <div className="total">
            <dt>Monthly total</dt>
            <dd>${billing.data?.monthlyTotal ?? session.plan.price}/month</dd>
          </div>
        </dl>
      </div>
      <div className="metrics two">
        <Meter
          label="Content requests"
          value={session.usage.contentRequests}
          limit={session.allowance.requests}
          note="API requests and astrology calculations"
        />
        <Meter
          label="Audio delivered"
          value={session.usage.audioBytes}
          limit={session.allowance.audioBytes}
          displayLimit={
            session.allowance.audioBytes
              ? formatBytes(session.allowance.audioBytes)
              : 'Samples only'
          }
          note="Data delivered, not storage"
        />
      </div>
      <div className="segmented tab-row" role="group" aria-label="Usage or plans">
        <button aria-pressed={view === 'usage'} onClick={() => setView('usage')}>
          Usage
        </button>
        <button aria-pressed={view === 'plans'} onClick={() => setView('plans')}>
          Plans & invoices
        </button>
      </div>
      {view === 'usage' ? (
        <UsageDetails />
      ) : (
        <>
          <div className="notice">
            {billing.data?.notice ||
              'Billing configuration is required. No payments or entitlement upgrades are enabled.'}
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
                    <li>{plan.astrology}</li>
                    <li>
                      {plan.products} {plan.price ? 'customer products' : ''}
                    </li>
                    <li>{plan.support}</li>
                  </ul>
                  {plan.name === session.plan.name ? (
                    <button className="button outline" disabled>
                      Current workspace plan
                    </button>
                  ) : !connected ? (
                    <button className="button outline" disabled>
                      Billing setup required
                    </button>
                  ) : subscribed ? (
                    <button className="button outline" disabled={pending} onClick={openPortal}>
                      Change plan
                    </button>
                  ) : (
                    <button
                      className="button"
                      disabled={pending || !purchasable.includes(plan.name)}
                      onClick={() => goToStripe('/api/billing/checkout', { plan: plan.name })}
                    >
                      Subscribe
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
          <p className="footnote">
            Paid content plans include the full available catalog of mantras, shlokas, sacred audio,
            shastras/books, and discovery, subject to the documented content license. A customer
            product is an app or website. Audio allowances measure data delivery, not storage.
          </p>
          <section className="panel">
            <div className="panel-heading">
              <h2>Invoices</h2>
            </div>
            {connected && record?.customerId ? (
              <p>
                View and download invoices in Stripe.{' '}
                <button className="text-button" disabled={pending} onClick={openPortal}>
                  Open invoices
                </button>
              </p>
            ) : (
              <Empty title="No invoices yet.">
                Invoices will be available here after your first payment.
              </Empty>
            )}
          </section>
        </>
      )}
    </>
  );
}
