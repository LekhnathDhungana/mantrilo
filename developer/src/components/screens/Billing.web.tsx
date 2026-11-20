import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { billingSupport, Plans, useBillingActions } from '../Plans.web';
import UsageDetails from './Usage.web';
import { ErrorNotice, formatBytes, formatDate, formatResetDate, PageTitle } from '../ui.web';

function PromoForm() {
  const { refresh } = useConsole();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function redeem(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const code = new FormData(form).get('code');
    setPending(true);
    setError('');
    try {
      await mutate('/api/promo/redeem', 'POST', { code });
      form.reset();
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not redeem the promo code.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel form-panel" id="promo-code">
      <h2>Redeem a promo code</h2>
      <p className="small muted">Apply your code to remove this workspace’s monthly request cap.</p>
      <ErrorNotice message={error} />
      <form onSubmit={redeem}>
        <label>
          Promo code
          <input
            name="code"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            minLength={15}
            maxLength={128}
            required
          />
        </label>
        <button className="button" disabled={pending}>
          {pending ? 'Applying…' : 'Apply code'}
        </button>
      </form>
    </section>
  );
}

export default function Billing() {
  const { session, refresh } = useConsole();
  const { checkout, stripe, plan, market } = useLocalSearchParams<{
    checkout?: string;
    stripe?: string;
    plan?: string;
    market?: string;
  }>();
  const actions = useBillingActions();
  const { connected, portalAvailable, pending, openStripe } = actions;
  const record = session?.workspace.billing,
    status = record?.status,
    subscribed = status === 'active' || status === 'trialing' || status === 'past_due',
    awaitingWebhook = checkout === 'success' && !subscribed;
  const customerId = record?.customerId;
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
  const openPortal = () => openStripe('portal');
  const current = session.plan,
    used = session.usage.contentRequests,
    quota = session.allowance.requests,
    percent = quota ? Math.min(100, (used / quota) * 100) : 0,
    liveAccess = session.liveAccess,
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
            : 'No subscription · no card needed';
  return (
    <>
      <PageTitle
        eyebrow="PLANS & USAGE"
        title="Usage & billing"
        copy={
          quota === null
            ? 'Your promo gives this workspace unlimited requests. Review usage and manage billing here.'
            : 'Start free with a sandbox key. Subscribe for a live key, the full catalog and more calls.'
        }
      />
      {awaitingWebhook && (
        <div className="notice" role="status">
          Thanks for subscribing. Your plan will update here as soon as Stripe confirms the payment.
        </div>
      )}
      {stripe === 'confirmed' && (
        <p className="notice" role="status">
          Stripe received your change. The plan and renewal date below reflect the latest
          subscription details.
        </p>
      )}
      {status === 'past_due' && (
        <div className="notice error" role="alert">
          Your last payment failed. Update your card to keep this plan.{' '}
          {portalAvailable ? (
            <button className="text-button" disabled={pending} onClick={openPortal}>
              Update card
            </button>
          ) : (
            <a href={billingSupport}>Contact billing support</a>
          )}
        </div>
      )}
      {session.promo?.canRedeem && <PromoForm />}
      {quota === null && (
        <p className="notice" role="status">
          Promo applied: this workspace has unlimited monthly API requests.
        </p>
      )}
      <div className="section-title usage-title">
        <h2>Usage</h2>
        <span>Resets {formatResetDate(session.resetsAt)}</span>
      </div>
      <section className="panel usage-summary">
        <div>
          <span className="metric-label">
            {liveAccess ? 'Live requests this month' : 'Sandbox requests this month'}
          </span>
          <div className="metric-value">
            {used.toLocaleString()}
            <span> / {quota?.toLocaleString() ?? 'Unlimited'} calls</span>
          </div>
          {quota !== null ? (
            <>
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
            </>
          ) : (
            <p className="small muted">Per-second rate and audio delivery limits still apply.</p>
          )}
          {liveAccess && (
            <p className="small muted">
              Sandbox: {sandboxUsed.toLocaleString()} / {quota?.toLocaleString() ?? 'Unlimited'}{' '}
              calls, counted separately.
            </p>
          )}
        </div>
        <div>
          <span className="metric-label">Audio delivered</span>
          <div className="metric-value small-value">
            {formatBytes(session.usage.audioBytes)}
            <span>
              {' '}
              / {liveAccess ? formatBytes(session.allowance.audioBytes) : 'sample audio only'}
            </span>
          </div>
        </div>
      </section>
      <UsageDetails />
      <div className="section-title" id="plans">
        <h2>Plans</h2>
        <span>
          {session.promo?.canRedeem && (
            <>
              <a href="#promo-code" className="text-link">
                Redeem promo code
              </a>
              {' · '}
            </>
          )}
          {quota === null ? 'Unlimited requests' : current.name} · {subscriptionSummary}
          {portalAvailable && customerId && record?.status && (
            <>
              {' · '}
              <button className="text-button" disabled={pending} onClick={openPortal}>
                Manage subscription & invoices
              </button>
            </>
          )}
          {!portalAvailable && customerId && record?.status && (
            <>
              {' · '}
              <a href={billingSupport}>Contact billing support</a>
            </>
          )}
        </span>
      </div>
      <Plans session={session} actions={actions} selectedPlan={plan} preferredIndia={market === 'IN'} />
    </>
  );
}
