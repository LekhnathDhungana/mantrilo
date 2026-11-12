import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { VerifyEmail } from '../Account.web';
import UsageDetails from './Usage.web';
import {
  Badge,
  ErrorNotice,
  formatBytes,
  formatDate,
  formatResetDate,
  Loading,
  PageTitle,
  useLoad,
} from '../ui.web';
import type { Plan } from '../../lib/types';

export default function Billing() {
  const { session, refresh } = useConsole();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const config = useLoad<{ plans: Plan[] }>('/api/config'),
    billing = useLoad<{ notice: string; purchasable: string[] }>('/api/billing');
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
  const current = session.plan,
    used = session.usage.contentRequests,
    quota = session.allowance.requests,
    percent = quota ? Math.min(100, (used / quota) * 100) : 0,
    paid = current.price > 0,
    sandboxUsed = session.usageByLane?.sandbox.contentRequests ?? 0;
  const subscriptionSummary =
    session.mode === 'demo'
      ? 'Local demo · no payments'
      : record?.cancelsAt
        ? `Ends ${formatDate(record.cancelsAt)}`
        : subscribed && record?.currentPeriodEnd
          ? `Renews ${formatDate(record.currentPeriodEnd)}`
          : current.price
            ? 'Subscription active'
            : 'Free plan · no card needed';
  function planAction(plan: Plan) {
    if (plan.name === current.name)
      return (
        <button className="button outline" disabled>
          Current plan
        </button>
      );
    if (!plan.price)
      return subscribed ? (
        <button className="button subtle" disabled={pending} onClick={openPortal}>
          Cancel in Stripe
        </button>
      ) : null;
    if (!connected)
      return (
        <button className="button outline" disabled>
          Billing not set up
        </button>
      );
    if (subscribed)
      return (
        <button className="button outline" disabled={pending} onClick={openPortal}>
          {plan.price > current.price ? 'Upgrade' : 'Switch'}
        </button>
      );
    return (
      <button
        className="button"
        disabled={pending || !session?.user.verified || !purchasable.includes(plan.name)}
        onClick={() => goToStripe('/api/billing/checkout', { plan: plan.name })}
      >
        Upgrade to {plan.name}
      </button>
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="PLANS & USAGE"
        title="Usage & billing"
        copy="Start free with a sandbox key. Subscribe for a live key, the full catalog and more calls."
      />
      <ErrorNotice message={config.error || billing.error || actionError} />
      {session.billingMode === 'test' && (
        <div className="notice" role="status">
          Test mode: checkout uses the Stripe sandbox and test cards. Plans bought here unlock this
          console only, never production.
        </div>
      )}
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
      {connected && !subscribed && <VerifyEmail reason="before you upgrade" />}
      <div className="section-title usage-title">
        <h2>Usage</h2>
        <span>Resets {formatResetDate(session.resetsAt)}</span>
      </div>
      <section className="panel usage-summary">
        <div>
          <span className="metric-label">
            {paid ? 'Live requests this month' : 'Sandbox requests this month'}
          </span>
          <div className="metric-value">
            {used.toLocaleString()}
            <span> / {quota.toLocaleString()} calls</span>
          </div>
          <div
            className={`meter-track ${percent >= 90 ? 'high' : ''}`}
            role="progressbar"
            aria-label="API calls used this month"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, quota, used)}
          >
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="small muted">
            <strong>{Math.max(0, quota - used).toLocaleString()} left</strong> of{' '}
            {quota.toLocaleString()} included on {current.name}. Resets{' '}
            {formatResetDate(session.resetsAt)}.
          </p>
          {paid && (
            <p className="small muted">
              Sandbox: {sandboxUsed.toLocaleString()} / {quota.toLocaleString()} calls, counted
              separately.
            </p>
          )}
        </div>
        <div>
          <span className="metric-label">Audio delivered</span>
          <div className="metric-value small-value">
            {formatBytes(session.usage.audioBytes)}
            <span>
              {' '}
              / {current.price ? formatBytes(session.allowance.audioBytes) : 'sample audio only'}
            </span>
          </div>
        </div>
      </section>
      <UsageDetails />
      <div className="section-title">
        <h2>Plans</h2>
        <span>
          {current.name} · {subscriptionSummary}
          {connected && customerId && (
            <>
              {' · '}
              <button className="text-button" disabled={pending} onClick={openPortal}>
                Manage subscription & invoices
              </button>
            </>
          )}
        </span>
      </div>
      {config.loading ? (
        <Loading />
      ) : (
        <div className="plan-grid">
          {config.data?.plans.map((plan) => (
            <article
              className={`plan-card ${plan.name === current.name ? 'current' : ''}`}
              key={plan.name}
            >
              <h3>
                {plan.name} {plan.name === current.name && <Badge tone="saffron">Your plan</Badge>}
              </h3>
              <div className="plan-price">
                ${plan.price}
                <small>{plan.price ? '/ month' : 'Forever, no card needed'}</small>
              </div>
              <ul>
                <li>
                  <strong>{plan.requests} calls</strong> a month
                </li>
                <li>
                  {plan.audio}
                  {plan.price ? ' audio delivery' : ''}
                </li>
                <li>{plan.catalog}</li>
                <li>{plan.support}</li>
              </ul>
              {planAction(plan)}
            </article>
          ))}
        </div>
      )}
      {!connected && billing.data?.notice && <p className="footnote">{billing.data.notice}</p>}
    </>
  );
}
