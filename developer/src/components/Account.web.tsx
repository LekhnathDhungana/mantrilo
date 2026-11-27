import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from './Session.web';
import { mutate } from '../lib/api';
import { Badge, CopyButton, formatDate, formatResetDate } from './ui.web';
import type { KeyRecord, Session } from '../lib/types';

export type Environment = 'sandbox' | 'production';

// Matches keyEnvironment in server/domain.mjs: older keys are told apart by prefix.
export const keyEnvironment = (key: KeyRecord): Environment =>
  key.environment ?? (key.prefix.startsWith('mtr_sbx_') ? 'sandbox' : 'production');

export const primaryKey = (session: Session, environment: Environment) =>
  session.workspace.keys.find(
    (key) => key.status === 'active' && key.secret && keyEnvironment(key) === environment,
  ) ?? null;

const mask = (secret: string) => `${secret.slice(0, 12)}${'•'.repeat(20)}${secret.slice(-4)}`;

// One label for each environment everywhere in the console: Sandbox (mtr_sbx_) and Live (mtr_live_).
export function EnvTag({ environment }: { environment: Environment | 'live' }) {
  const live = environment !== 'sandbox';
  return <span className={live ? 'env-tag live' : 'env-tag'}>{live ? 'Live' : 'Sandbox'}</span>;
}

function KeyRow({ label, note, keyRecord }: { label: string; note: string; keyRecord: KeyRecord }) {
  const [shown, setShown] = useState(false),
    secret = keyRecord.secret ?? '';
  return (
    <div className="key-row">
      <div className="key-row-heading">
        <EnvTag environment={keyEnvironment(keyRecord)} />
        <strong>{label}</strong>
        <span className="small muted">{note}</span>
      </div>
      <code className="secret-value key-value" aria-label={label}>
        {shown ? secret : mask(secret)}
      </code>
      <div className="action-row">
        <CopyButton text={secret} label="Copy" />
        <button className="button subtle small-button" onClick={() => setShown(!shown)}>
          {shown ? 'Hide' : 'Show'}
        </button>
        <span className="small muted">Last used {formatDate(keyRecord.lastUsedAt)}</span>
      </div>
    </div>
  );
}

// The workspace's keys: sandbox for everyone, live when entitled.
export function ApiKeyCard({ manage = false }: { manage?: boolean }) {
  const { session } = useConsole();
  if (!session) return null;
  const sandbox = primaryKey(session, 'sandbox'),
    live = primaryKey(session, 'production'),
    liveAccess = session.liveAccess;
  return (
    <article className="panel account-card">
      <div className="panel-heading">
        <h2>Your API keys</h2>
        {manage ? null : (
          <Link href="/keys" className="text-link">
            Manage →
          </Link>
        )}
      </div>
      <div className="account-card-body">
        {sandbox ? (
          <KeyRow
            label="Sandbox key"
            note="Sample catalog, for building and testing"
            keyRecord={sandbox}
          />
        ) : (
          <p>Your sandbox key is being prepared. Refresh in a moment.</p>
        )}
        {liveAccess && live ? (
          <KeyRow label="Live key" note="Full catalog, for production" keyRecord={live} />
        ) : (
          <div className="key-row locked">
            <div className="key-row-heading">
              <EnvTag environment="live" />
              <strong>Live key</strong>
              <Badge>{liveAccess ? 'Being prepared' : 'Paid plans'}</Badge>
            </div>
            <p className="small muted">
              {liveAccess
                ? 'Your live key is being prepared. Refresh in a moment.'
                : 'Subscribe to get a live key for the full catalog. Your sandbox key keeps working.'}
            </p>
            {!liveAccess && (
              <Link href="/billing" className="button small-button">
                See plans
              </Link>
            )}
          </div>
        )}
        <p className="small muted">Keep keys on your server, never in an app or browser.</p>
      </div>
    </article>
  );
}

// Calls used against the plan's monthly quota, with a way up.
export function UsageCard() {
  const { session } = useConsole();
  if (!session) return null;
  const used = session.usage.contentRequests,
    quota = session.allowance.requests,
    percent = quota ? Math.min(100, (used / quota) * 100) : 0,
    liveAccess = session.liveAccess;
  return (
    <article className="panel account-card">
      <div className="panel-heading">
        <h2>Usage this month</h2>
        <Badge tone={liveAccess || quota === null ? 'green' : 'neutral'}>
          {quota === null ? 'Unlimited requests' : `${session.plan.name} plan`}
        </Badge>
      </div>
      <div className="account-card-body">
        <div className="metric-value">
          {used.toLocaleString()}
          <span> / {quota?.toLocaleString() ?? 'Unlimited'} calls</span>
        </div>
        {quota !== null && (
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
        )}
        <p className="small muted">
          {liveAccess ? 'Live · ' : 'Sandbox · '}
          {quota === null
            ? 'No monthly request limit'
            : `${Math.max(0, quota - used).toLocaleString()} left · Resets ${formatResetDate(session.resetsAt)}`}
        </p>
        {liveAccess && (
          <p className="small muted">
            Sandbox: {(session.usageByLane?.sandbox.contentRequests ?? 0).toLocaleString()} used,
            counted separately
          </p>
        )}
        <div className="action-row">
          <Link
            href="/billing"
            className={liveAccess ? 'button subtle small-button' : 'button small-button'}
          >
            {liveAccess || quota === null || session.promo?.canRedeem
              ? 'View usage & billing'
              : 'Upgrade'}
          </Link>
        </div>
      </div>
    </article>
  );
}

// Checkout needs a verified email. Shown wherever that is the next step.
export function VerifyEmail({ reason }: { reason: string }) {
  const { session, config, refresh } = useConsole();
  const [pending, setPending] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState('');
  if (!session || session.user.verified) return null;
  async function sendVerification() {
    if (!config?.firebase) return;
    setPending(true);
    setError('');
    try {
      const { token } = await mutate<{ token: string }>('/api/auth/verification-token', 'POST');
      const { sendVerificationEmail } = await import('../lib/firebase');
      await sendVerificationEmail(config.firebase, token);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the verification email.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="notice" role="status">
      <p>
        {sent
          ? `We sent a link to ${session.user.email}. Open it, then come back here.`
          : `Verify ${session.user.email} ${reason}.`}
      </p>
      {error && <p className="error-text">{error}</p>}
      <div className="action-row">
        <button className="button small-button" disabled={pending} onClick={sendVerification}>
          Send verification email
        </button>
        <button className="button subtle small-button" disabled={pending} onClick={refresh}>
          I’ve verified it
        </button>
      </div>
    </section>
  );
}
