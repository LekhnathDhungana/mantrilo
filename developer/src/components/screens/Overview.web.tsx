import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { Badge, CopyButton, ErrorNotice, formatBytes, Meter, PageTitle } from '../ui.web';

const FIRST_REQUEST = '/v1/shlokas?limit=5';

export default function Overview() {
  const { session, config, refresh } = useConsole();
  const [secret, setSecret] = useState(''),
    [status, setStatus] = useState<number | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  if (!session) return null;
  const s = session,
    hasKey = s.workspace.keys.some((key) => key.status === 'active'),
    worked =
      status === 200 ||
      s.usage.contentRequests > 0 ||
      s.workspace.keys.some((key) => key.lastUsedAt),
    setupDone = worked && !secret,
    base = config?.apiUrl ?? 'https://api.mantrilo.com',
    request = `curl '${base}${FIRST_REQUEST}' \\\n  -H "Authorization: Bearer ${secret || '$MANTRILO_API_KEY'}"`;
  async function act(work: () => Promise<void>, failure: string) {
    setPending(true);
    setError('');
    try {
      await work();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : failure);
    } finally {
      setPending(false);
    }
  }
  const createKey = () =>
    act(async () => {
      const created = await mutate<{ secret: string }>('/api/keys', 'POST', {
        name: 'My first key',
        environment: 'sandbox',
      });
      setSecret(created.secret);
    }, 'The key could not be created.');
  const runRequest = () =>
    act(async () => {
      const { response } = await mutate<{ response: { status: number } }>(
        '/api/playground',
        'POST',
        { path: FIRST_REQUEST, key: secret },
      );
      setStatus(response.status);
    }, 'The request could not be completed.');
  return (
    <>
      <PageTitle
        eyebrow={s.workspace.name.toUpperCase()}
        title={setupDone ? 'You’re connected.' : 'Connect in three steps.'}
        copy={
          setupDone
            ? 'Your integration at a glance.'
            : 'Mantras, shlokas, sacred audio and astrology through one API key.'
        }
      />
      <ErrorNotice message={error} />
      {!setupDone && (
        <ol className="panel setup-steps">
          <li className={hasKey || secret ? 'done' : ''}>
            <span aria-hidden="true">{hasKey || secret ? '✓' : '1'}</span>
            <div>
              <h2>Create your key</h2>
              {secret ? (
                <>
                  <p>Copy it now. It’s only shown once, so keep it somewhere safe.</p>
                  <pre>
                    <code>{secret}</code>
                  </pre>
                  <CopyButton text={secret} />
                </>
              ) : hasKey ? (
                <p>
                  You have a key. <Link href="/keys">Manage keys →</Link>
                </p>
              ) : !s.user.verified ? (
                <p>
                  Verify your email first. <Link href="/keys">Verify email →</Link>
                </p>
              ) : (
                <>
                  <p>A free sandbox key is enough to start.</p>
                  <button className="button" disabled={pending} onClick={createKey}>
                    {pending ? 'Creating…' : 'Create key'}
                  </button>
                </>
              )}
            </div>
          </li>
          <li className={worked ? 'done' : ''}>
            <span aria-hidden="true">{worked ? '✓' : '2'}</span>
            <div>
              <h2>Make a request</h2>
              <p>Run this from your server or terminal.</p>
              <pre>
                <code>{request}</code>
              </pre>
              <div className="action-row">
                <CopyButton text={request} />
                {secret && config?.apiUrl && (
                  <button className="button subtle" disabled={pending} onClick={runRequest}>
                    {pending ? 'Running…' : 'Run it here'}
                  </button>
                )}
              </div>
              {!config?.apiUrl && (
                <p className="small muted">The API isn’t connected to this console yet.</p>
              )}
              {status !== null && status !== 200 && (
                <p className="error-text" role="alert">
                  The request returned HTTP {status}.
                </p>
              )}
            </div>
          </li>
          <li className={worked ? 'done' : ''}>
            <span aria-hidden="true">{worked ? '✓' : '3'}</span>
            <div>
              <h2>You’re live</h2>
              {worked ? (
                <p>
                  Your first request worked. See what else you can do in the{' '}
                  <Link href="/docs">docs</Link> or browse the <Link href="/library">library</Link>.
                </p>
              ) : (
                <p>Your first successful request completes this step.</p>
              )}
            </div>
          </li>
        </ol>
      )}
      <div className="plan-strip">
        <div>
          <span className="strip-label">YOUR PLAN</span>
          <strong>
            {s.plan.name} <Badge>{s.plan.price ? `$${s.plan.price}/month` : 'Free'}</Badge>
          </strong>
        </div>
        <Link href="/billing?view=plans" className="text-link">
          Change plan ↗
        </Link>
      </div>
      <div className="metrics two">
        <Meter
          label="Content requests"
          value={s.usage.contentRequests}
          limit={s.allowance.requests}
          note="Resets on the 1st of each month"
        />
        <Meter
          label="Audio delivered"
          value={s.usage.audioBytes}
          limit={s.allowance.audioBytes}
          displayLimit={
            s.allowance.audioBytes ? formatBytes(s.allowance.audioBytes) : 'Samples only'
          }
          note="Data delivered, not storage"
        />
      </div>
    </>
  );
}
