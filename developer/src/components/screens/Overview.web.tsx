import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { ApiKeyCard, primaryKey, UsageCard } from '../Account.web';
import { CopyButton, ErrorNotice, formatResetDate, PageTitle } from '../ui.web';
import { environmentLabel } from '../Shell.web';
import type { Session } from '../../lib/types';

const FIRST_REQUEST = '/v1/mantras?limit=5';

// Environment, plan, usage and the one next step, at a glance.
function StatusStrip({ s, worked }: { s: Session; worked: boolean }) {
  const used = s.usage.contentRequests,
    total = s.allowance.requests,
    remaining = Math.max(0, total - used),
    share = total ? Math.min(100, (used / total) * 100) : 0;
  const next = !worked
    ? { label: 'Run your first request', href: '#first-request' }
    : !s.plan.price
      ? { label: 'Upgrade for a live key', href: '/billing' }
      : remaining < total * 0.1
        ? { label: 'Raise your allowance', href: '/billing' }
        : { label: 'Open the API Explorer', href: '/docs?tab=try' };
  return (
    <section className="status-strip" aria-label="Workspace status">
      <div>
        <span>Environment</span>
        <strong>
          <i className={s.usageLane === 'sandbox' ? 'dot sandbox' : 'dot live'} />
          {environmentLabel(s.usageLane)}
        </strong>
        <small>{s.plan.price ? 'Sandbox and live keys' : 'Sample content only'}</small>
      </div>
      <div>
        <span>Plan</span>
        <strong>{s.plan.name}</strong>
        <small>{s.plan.price ? `$${s.plan.price} a month` : 'Free'}</small>
      </div>
      <div>
        <span>Requests this month</span>
        <strong>
          {used.toLocaleString()} <em>/ {total.toLocaleString()}</em>
        </strong>
        <span className="strip-meter" aria-hidden="true">
          <i style={{ width: `${share}%` }} />
        </span>
        <small>
          {remaining.toLocaleString()} left · resets {formatResetDate(s.resetsAt)}
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
          s.plan.price
            ? 'Build with your sandbox key and ship with your live key.'
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
            API Explorer →
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
    </>
  );
}
