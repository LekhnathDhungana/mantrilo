import { useEffect, useId, useRef, useState } from 'react';
import { mutate } from '../lib/api';
import type { Plan, Session } from '../lib/types';
import { VerifyEmail } from './Account.web';
import { Badge, ErrorNotice, Loading, useLoad } from './ui.web';

export const billingSupport = 'mailto:hello@mantrilo.com?subject=Mantrilo%20billing';

type Interval = 'month' | 'year';
type StripeRequest = { plan?: string; promotionCode?: string; market?: 'IN'; interval?: Interval };

// Shows cents only when there are any: $1,429.99, ₹14,399.
function money(amount: number, currency: 'USD' | 'INR') {
  return amount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function useBillingActions() {
  const billing = useLoad<{
    notice: string;
    purchasable: string[];
    indiaPurchasable?: string[];
    annualPurchasable?: string[];
    indiaAnnualPurchasable?: string[];
    portalAvailable: boolean;
    promotionPlans?: string[];
  }>('/api/billing');
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const purchasable = billing.data?.purchasable ?? [];
  function stripeUrl(route: 'checkout' | 'portal', { plan, promotionCode, market, interval }: StripeRequest) {
    return mutate<{ url: string }>(
      '/api/billing/' + route,
      'POST',
      plan
        ? {
            plan,
            ...(promotionCode ? { promotionCode } : {}),
            ...(market ? { market } : {}),
            ...(interval === 'year' ? { interval } : {}),
          }
        : undefined,
    ).then((result) => result.url);
  }

  async function openStripe(route: 'checkout' | 'portal', request: StripeRequest = {}) {
    setPending(request.plan ?? route);
    setActionError('');
    try {
      const url = await stripeUrl(route, request);
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
  preferredAnnual = false,
}: {
  session: Session;
  selectedPlan?: string;
  preferredAnnual?: boolean;
  actions: ReturnType<typeof useBillingActions>;
}) {
  const config = useLoad<{
    plans: Plan[];
    indiaPrices: Record<string, number | null>;
    indiaAnnualPrices?: Record<string, number | null>;
    indiaAnnualTotals?: Record<string, number | null>;
  }>('/api/config');
  const dialog = useRef<HTMLDialogElement>(null);
  const checkoutTitle = useId();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [selectedAnnual, setSelectedAnnual] = useState<boolean | null>(null);
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
  // New customers in India pay the global USD prices; only an existing INR subscription shows INR.
  const india = inrSubscription;
  // A subscriber's plan changes keep their billing interval, so the choice only shows before one.
  const annual = subscribed
    ? session.workspace.billing?.interval === 'year'
    : (selectedAnnual ?? preferredAnnual);
  const interval: Interval = annual ? 'year' : 'month';
  const globalPurchasable = annual ? (billing.data?.annualPurchasable ?? []) : purchasable;
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
    if (subscribed) {
      void openStripe('portal', { plan: plan.name });
    } else if (!annual && billing.data?.promotionPlans?.includes(plan.name)) {
      // The first-month promo code applies to monthly billing only.
      clearError();
      setCheckoutPlan(plan);
    } else {
      void openStripe('checkout', { plan: plan.name, interval });
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
    if (india && plan.price)
      return (
        <a href={contactIndia(plan.name)} className="button subtle">
          Contact billing to switch
        </a>
      );
    if (subscribed && !portalAvailable)
      return (
        <a href={billingSupport} className="button subtle">
          Contact billing support
        </a>
      );
    if (!connected || (plan.price > 0 && !globalPurchasable.includes(plan.name)))
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
          onClick={() => openStripe('portal', { plan: plan.name })}
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
        <div className="segmented compact" role="group" aria-label="Billing period">
          <button type="button" aria-pressed={!annual} onClick={() => setSelectedAnnual(false)}>
            Monthly
          </button>
          <button type="button" aria-pressed={annual} onClick={() => setSelectedAnnual(true)}>
            Annual · save 20%
          </button>
        </div>
      )}
      {annual && (
        <p className="small muted">
          Annual plans are billed once a year. Prices are shown per month; request allowances still
          reset monthly.
        </p>
      )}
      {config.loading ? (
        <Loading />
      ) : (
        <div className="plan-grid">
          {config.data?.plans.map((plan) => {
            const unlimited = plan.name === current.name && session.allowance.requests === null;
            const regionalPrice =
              (annual ? config.data?.indiaAnnualPrices : config.data?.indiaPrices)?.[plan.name] ??
              null;
            const quote = india && regionalPrice === null;
            const perMonth = india ? (regionalPrice ?? 0) : annual ? plan.annualPrice : plan.price;
            const currency = india ? 'INR' : 'USD';
            const yearlyTotal = india
              ? (config.data?.indiaAnnualTotals?.[plan.name] ?? null)
              : plan.annualTotal;
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
                  {quote ? 'Custom quote' : money(perMonth, currency)}
                  {!quote && <small>{plan.price ? '/ month' : 'Forever, no card needed'}</small>}
                </div>
                {annual && plan.price > 0 && !quote && yearlyTotal !== null && (
                  <p className="small muted">Billed {money(yearlyTotal, currency)} a year</p>
                )}
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
              void openStripe('checkout', {
                plan: checkoutPlan.name,
                promotionCode: typeof code === 'string' ? code.trim() || undefined : undefined,
              });
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
