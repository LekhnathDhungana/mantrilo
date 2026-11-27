import { useState } from 'react';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { ApiKeyCard, EnvTag, keyEnvironment, primaryKey, type Environment } from '../Account.web';
import { ErrorNotice, formatDate, PageTitle } from '../ui.web';

export default function Keys() {
  const { session, refresh } = useConsole();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [confirmRotate, setConfirmRotate] = useState<Environment | null>(null),
    [revokeId, setRevokeId] = useState('');
  if (!session) return null;
  const current = [primaryKey(session, 'sandbox'), primaryKey(session, 'production')],
    liveAccess = session.liveAccess,
    older = session.workspace.keys.filter(
      (key) => key.status === 'active' && !current.includes(key),
    );
  async function act(work: () => Promise<unknown>, failure: string) {
    setPending(true);
    setError('');
    try {
      await work();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : failure);
    } finally {
      setPending(false);
      setConfirmRotate(null);
      setRevokeId('');
    }
  }
  const rotate = (environment: Environment) =>
    act(
      () => mutate('/api/keys/rotate', 'POST', { environment }),
      'The key could not be regenerated.',
    );
  const revoke = (id: string) =>
    act(() => mutate(`/api/keys/${id}`, 'DELETE'), 'Could not revoke the key.');
  const environments: [Environment, string][] = liveAccess
    ? [
        ['sandbox', 'sandbox key'],
        ['production', 'live key'],
      ]
    : [['sandbox', 'sandbox key']];
  return (
    <>
      <PageTitle
        eyebrow="CREDENTIALS"
        title="API keys"
        copy="Sandbox keys read sample content. Live keys read the full catalog when your workspace has live access."
      />
      <ErrorNotice message={error} />
      <ApiKeyCard manage />
      <section className="panel">
        <div className="panel-heading">
          <h2>Regenerate a key</h2>
        </div>
        <div className="account-card-body">
          <p>
            If a key leaked, replace it. The current key stops working within a minute, so update
            your servers straight away.
          </p>
          {confirmRotate ? (
            <div className="action-row">
              <button
                className="button danger-button"
                disabled={pending}
                onClick={() => rotate(confirmRotate)}
              >
                {pending
                  ? 'Regenerating…'
                  : `Yes, regenerate the ${confirmRotate === 'sandbox' ? 'sandbox' : 'live'} key`}
              </button>
              <button className="text-button" onClick={() => setConfirmRotate(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="action-row">
              {environments.map(([environment, label]) => (
                <button
                  key={environment}
                  className="button subtle"
                  onClick={() => setConfirmRotate(environment)}
                >
                  Regenerate {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      {older.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Older keys</h2>
            <span className="small muted">Still active · revoke once you’ve switched</span>
          </div>
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Environment</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {older.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <strong>{key.name}</strong>
                      <code className="table-code">{key.prefix}••••••••</code>
                    </td>
                    <td>
                      <EnvTag environment={keyEnvironment(key)} />
                    </td>
                    <td>{formatDate(key.createdAt)}</td>
                    <td>{formatDate(key.lastUsedAt)}</td>
                    <td>
                      {revokeId === key.id ? (
                        <div className="action-row">
                          <button
                            className="text-button danger"
                            disabled={pending}
                            onClick={() => revoke(key.id)}
                          >
                            Confirm revoke
                          </button>
                          <button className="text-button" onClick={() => setRevokeId('')}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button className="text-button danger" onClick={() => setRevokeId(key.id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="notice">
        Never place your key in mobile apps, browser bundles, Git, or request logs. Call the API
        from your own server.
      </div>
    </>
  );
}
