import { useEffect, useId, useRef, useState } from 'react';
import { mutate } from '../lib/api';
import type { Plan, Session } from '../lib/types';
import { VerifyEmail } from './Account.web';
import { Badge, ErrorNotice, Loading, useLoad } from './ui.web';

export const billingSupport = 'mailto:hello@mantrilo.com?subject=Mantrilo%20billing';

export function useBillingActions() {
  const billing = useLoad<{
    notice: string;
    purchasable: string[];
    indiaPurchasable?: string[];
    portalAvailable: boolean;
    promotionPlans?: string[];
  }>('/api/billing');
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const purchasable = billing.data?.purchasable ?? [];
  function stripeUrl(route: 'checkout' | 'portal', plan?: string, promotionCode?: string, market?: 'IN') {
    return mutate<{ url: string }>(
      '/api/billing/' + route,
      'POST',
      plan ? { plan, ...(promotionCode ? { promotionCode } : {}), ...(market ? { market } : {}) } : undefined,
    ).then((result) => result.url);
  }

  async function openStripe(route: 'checkout' | 'portal', plan?: string, promotionCode?: string, market?: 'IN') {
    setPending(plan ?? route);
    setActionError('');
    try {
      const url = await stripeUrl(route, plan, promotionCode, market);
      window.location.assign(url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not open Stripe.');
      setPending(null);
    }
  }

  return {
    billing,
    purchasable,
    connected: purchasable.length > 0,
    portalAvailable: billing.data?.portalAvailable === true,
    pending: pending !== null,
    pendingFor: pending,
    actionError,
    openStripe,
    clearError: () => setActionError(''),
  };
}

export function Plans({
  session,
  actions,
  selectedPlan,
  preferredIndia = false,
}: {
  session: Session;
  selectedPlan?: string;
  preferredIndia?: boolean;
  actions: ReturnType<typeof useBillingActions>;
}) {
  const config = useLoad<{ plans: Plan[]; indiaPrices: Record<string, number | null> }>('/api/config');
  const dialog = useRef<HTMLDialogElement>(null);
  const checkoutTitle = useId();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [selectedIndia, setSelectedIndia] = useState<boolean | null>(null);
  useEffect(() => {
    if (checkoutPlan && !dialog.current?.open) dialog.current?.showModal();
  }, [checkoutPlan]);
  const {
    billing,
    purchasable,
    connected,
    portalAvailable,
    pending,
    pendingFor,
    actionError,
    openStripe,
    clearError,
  } = actions;
  const current = session.plan;
  const status = session.workspace.billing?.status;
  const subscribed = status === 'active' || status === 'trialing' || status === 'past_due';
  const inrSubscription = subscribed && session.workspace.billing?.currency === 'inr';
  const india = subscribed ? inrSubscription : (selectedIndia ?? preferredIndia);
  const regionalPurchasable = billing.data?.indiaPurchasable ?? [];
  const contactIndia = (plan: string) => {
    const subject = encodeURIComponent(`Mantrilo ${plan} pricing in India`);
    const body = encodeURIComponent(`Workspace ID: ${session.workspace.id}\nPlan: ${plan}\nBilling country: India`);
    return `mailto:hello@mantrilo.com?subject=${subject}&body=${body}`;
  };

  function closeCheckout() {
    dialog.current?.querySelector('form')?.reset();
    dialog.current?.close();
    setCheckoutPlan(null);
  }

  function choosePlan(plan: Plan) {
    if (!subscribed && india) {
      void openStripe('checkout', plan.name, undefined, 'IN');
    } else if (subscribed) {
      void openStripe('portal', plan.name);
    } else if (billing.data?.promotionPlans?.includes(plan.name)) {
      clearError();
      setCheckoutPlan(plan);
    } else {
      void openStripe('checkout', plan.name);
    }
  }

  function planAction(plan: Plan) {
    if (plan.name === current.name)
      return (
        <button className="button outline" disabled>
          Current plan
        </button>
      );
    if (!plan.price && !subscribed) return null;
    if (billing.loading)
      return (
        <button className="button outline" disabled>
          Checking billing…
        </button>
      );
    if (india && plan.price && (subscribed || !regionalPurchasable.includes(plan.name)))
      return (
        <a href={contactIndia(plan.name)} className="button subtle">
          {plan.name === 'Business' ? 'Request a quote' : subscribed ? 'Contact billing to switch' : 'Request India checkout'}
        </a>
      );
    if (subscribed && !portalAvailable)
      return (
        <a href={billingSupport} className="button subtle">
          Contact billing support
        </a>
      );
    if (!connected || (plan.price > 0 && !(india ? regionalPurchasable : purchasable).includes(plan.name)))
      return (
        <button className="button outline" disabled>
          Billing unavailable
        </button>
      );
    if (!plan.price)
      return (
        <button
          className="button subtle"
          disabled={pending}
          onClick={() => openStripe('portal', plan.name)}
        >
          Cancel in Stripe
        </button>
      );
    const canBuy = !pending && session.user.verified;
    return (
      <button
        className={subscribed ? 'button outline' : 'button'}
        disabled={!canBuy}
        aria-busy={pendingFor === plan.name}
        onClick={() => choosePlan(plan)}
      >
        {pendingFor === plan.name
          ? 'Opening Stripe…'
          : `${plan.price > current.price ? 'Upgrade to' : 'Switch to'} ${plan.name}`}
      </button>
    );
  }

  return (
    <>
      <ErrorNotice message={config.error || billing.error || (checkoutPlan ? '' : actionError)} />
      {connected && <VerifyEmail reason="before you change plans" />}
      {session.billingMode === 'test' && connected && (
        <p className="notice" role="status">
          Stripe test mode. Use a test card to try a plan.
        </p>
      )}
      {!subscribed && (
        <div className="segmented compact" role="group" aria-label="Billing market">
          <button type="button" aria-pressed={!india} onClick={() => setSelectedIndia(false)}>
            Global · USD
          </button>
          <button type="button" aria-pressed={india} onClick={() => setSelectedIndia(true)}>
            India · INR
          </button>
        </div>
      )}
      {india && !subscribed && (
        <p className="small muted">India pricing requires a verified India billing address.</p>
      )}
      {config.loading ? (
        <Loading />
      ) : (
        <div className="plan-grid">
          {config.data?.plans.map((plan) => {
            const unlimited = plan.name === current.name && session.allowance.requests === null;
            const regionalPrice = config.data?.indiaPrices?.[plan.name] ?? null;
            const quote = india && regionalPrice === null;
            return (
              <article
                className={`plan-card ${plan.name === current.name ? 'current' : ''}`}
                key={plan.name}
              >
                <h3>
                  {unlimited && !plan.price ? 'Unlimited requests' : plan.name}{' '}
                  {plan.name === current.name ? (
                    <Badge tone="saffron">Your plan</Badge>
                  ) : plan.name === selectedPlan ? (
                    <Badge tone="saffron">Selected plan</Badge>
                  ) : null}
                </h3>
                <div className="plan-price">
                  {quote ? 'Custom quote' : india ? `₹${regionalPrice?.toLocaleString('en-IN')}` : `$${plan.price}`}
                  {!quote && <small>{plan.price ? '/ month' : 'Forever, no card needed'}</small>}
                </div>
                <ul>
                  <li>
                    {unlimited ? (
                      <strong>Unlimited requests</strong>
                    ) : (
                      <>
                        <strong>{plan.requests} calls</strong> a month
                      </>
                    )}
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
            );
          })}
        </div>
      )}
      <dialog
        ref={dialog}
        className="plan-checkout"
        aria-labelledby={checkoutTitle}
        onCancel={(event) => {
          event.preventDefault();
          if (!pending) closeCheckout();
        }}
      >
        {checkoutPlan && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              const code = new FormData(event.currentTarget).get('promotionCode');
              void openStripe(
                'checkout',
                checkoutPlan.name,
                typeof code === 'string' ? code.trim() || undefined : undefined,
              );
            }}
          >
            <h2 id={checkoutTitle}>Checkout for {checkoutPlan.name}</h2>
            <ErrorNotice message={actionError} />
            <label>
              Promo code (optional)
              <input
                name="promotionCode"
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
                disabled={pending}
              />
            </label>
            <div className="action-row">
              <button className="button" disabled={pending} aria-busy={pending}>
                {pending ? 'Opening Stripe…' : 'Continue to checkout'}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={pending}
                onClick={closeCheckout}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
      {!connected && billing.data?.notice && <p className="footnote">{billing.data.notice}</p>}
    </>
  );
}
