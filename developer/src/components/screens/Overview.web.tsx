import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { ApiKeyCard, primaryKey, UsageCard } from '../Account.web';
import { CopyButton, ErrorNotice, formatResetDate, PageTitle } from '../ui.web';
import { Plans, useBillingActions } from '../Plans.web';
import { environmentLabel } from '../Shell.web';
import type { Session } from '../../lib/types';

const FIRST_REQUEST = '/v1/mantras?limit=5';

// Environment, plan, usage and the one next step, at a glance.
function StatusStrip({ s, worked }: { s: Session; worked: boolean }) {
  const used = s.usage.contentRequests,
    total = s.allowance.requests,
    remaining = total === null ? null : Math.max(0, total - used),
    share = total ? Math.min(100, (used / total) * 100) : 0;
  const next = !worked
    ? { label: 'Run your first request', href: '#first-request' }
    : total === null
      ? { label: 'Browse the API docs', href: '/docs' }
      : !s.liveAccess
        ? { label: 'Upgrade for a live key', href: '#plans' }
        : remaining !== null && total !== null && remaining < total * 0.1
          ? { label: 'Raise your allowance', href: '#plans' }
          : { label: 'Browse the guides', href: '/docs' };
  return (
    <section className="status-strip" aria-label="Workspace status">
      <div>
        <span>API access</span>
        <strong>
          <i className={s.usageLane === 'sandbox' ? 'dot sandbox' : 'dot live'} />
          {s.usageLane === 'sandbox' ? 'Sandbox key' : environmentLabel(s.usageLane)}
        </strong>
        <small>{s.liveAccess ? 'Sandbox and live keys' : 'Sample catalog for building and testing'}</small>
      </div>
      <div>
        <span>{total === null ? 'Request access' : 'Plan'}</span>
        <strong>{total === null ? 'Unlimited' : s.plan.name}</strong>
        <small>
          {total === null ? 'Promo applied' : s.plan.price ? `$${s.plan.price} a month` : 'Free'}
        </small>
      </div>
      <div>
        <span>Requests this month</span>
        <strong>
          {used.toLocaleString()} <em>/ {total?.toLocaleString() ?? 'Unlimited'}</em>
        </strong>
        {total !== null && (
          <span className="strip-meter" aria-hidden="true">
            <i style={{ width: `${share}%` }} />
          </span>
        )}
        <small>
          {remaining === null
            ? 'No monthly request limit'
            : `${remaining.toLocaleString()} left · resets ${formatResetDate(s.resetsAt)}`}
        </small>
      </div>
      <div className="strip-next">
        <span>Next step</span>
        {next.href.startsWith('#') ? (
          <a className="button small-button" href={next.href}>
            {next.label} →
          </a>
        ) : (
          <Link className="button small-button" href={next.href}>
            {next.label} →
          </Link>
        )}
      </div>
    </section>
  );
}

export default function Overview() {
  const { session, config, refresh } = useConsole();
  const billing = useBillingActions();
  const [status, setStatus] = useState<number | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  if (!session) return null;
  const s = session,
    // Try the request with the live key once there is one, otherwise the sandbox key.
    key = primaryKey(s, 'production') ?? primaryKey(s, 'sandbox'),
    worked =
      status === 200 || s.usage.contentRequests > 0 || s.workspace.keys.some((k) => k.lastUsedAt),
    base = config?.apiUrl ?? 'https://api.mantrilo.com',
    request = `curl '${base}${FIRST_REQUEST}' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  async function runRequest() {
    if (!key?.secret) return;
    setPending(true);
    setError('');
    try {
      const { response } = await mutate<{ response: { status: number } }>(
        '/api/playground',
        'POST',
        { path: FIRST_REQUEST, key: key.secret },
      );
      setStatus(response.status);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request could not be completed.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={s.workspace.name.toUpperCase()}
        title={worked ? 'You’re connected.' : 'Your sandbox key is ready.'}
        copy={
          s.liveAccess
            ? s.allowance.requests === null
              ? 'Your live key has unlimited requests on the full catalog.'
              : 'Build with your sandbox key and ship with your live key.'
            : s.allowance.requests === null
              ? 'Your sandbox key has unlimited requests on the sample catalog.'
              : `Every account starts with a sandbox key and ${s.allowance.requests.toLocaleString()} free calls a month on sample content. Subscribe for a live key and the full catalog.`
        }
      />
      <StatusStrip s={s} worked={worked} />
      <ErrorNotice message={error} />
      <div className="overview-grid">
        <ApiKeyCard />
        <UsageCard />
      </div>
      <section className="panel" id="first-request">
        <div className="panel-heading">
          <h2>{worked ? 'Make another request' : 'Make your first request'}</h2>
          <Link href="/docs?tab=try" className="text-link">
            Try it in Docs →
          </Link>
        </div>
        <div className="account-card-body">
          <p>Set MANTRILO_API_KEY to your key, then run this from your server or terminal.</p>
          <pre>
            <code>{request}</code>
          </pre>
          <div className="action-row">
            <CopyButton text={request} />
            {key?.secret && config?.apiUrl && (
              <button
                className="button subtle small-button"
                disabled={pending}
                onClick={runRequest}
              >
                {pending ? 'Running…' : 'Run it here'}
              </button>
            )}
          </div>
          {!config?.apiUrl && (
            <p className="small muted">The API isn’t connected to this console yet.</p>
          )}
          {status !== null &&
            (status === 200 ? (
              <p className="small" role="status">
                It worked. Browse what you can fetch in the <Link href="/library">library</Link>.
              </p>
            ) : (
              <p className="error-text" role="alert">
                The request returned HTTP {status}.
              </p>
            ))}
        </div>
      </section>
      <section aria-labelledby="home-plans">
        <div className="section-title" id="plans">
          <h2 id="home-plans">Plans</h2>
          <Link className="text-link" href="/billing">Usage & billing →</Link>
        </div>
        <Plans session={s} actions={billing} />
      </section>
    </>
  );
}
