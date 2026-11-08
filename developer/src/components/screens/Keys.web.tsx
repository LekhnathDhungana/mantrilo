import { useState } from 'react';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { Badge, CopyButton, Empty, ErrorNotice, formatDate, PageTitle } from '../ui.web';
import type { KeyRecord } from '../../lib/types';

export default function Keys() {
  const { session, refresh } = useConsole();
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [newSecret, setNewSecret] = useState(''),
    [revokeId, setRevokeId] = useState('');
  if (!session) return null;
  async function create(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const result = await mutate<{ secret: string; key: KeyRecord }>('/api/keys', 'POST', {
        name: f.get('name'),
        environment: f.get('environment'),
      });
      setNewSecret(result.secret);
      setOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Key creation failed.');
    } finally {
      setPending(false);
    }
  }
  async function revoke(id: string) {
    setPending(true);
    setError('');
    try {
      await mutate(`/api/keys/${id}`, 'DELETE');
      setRevokeId('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke the key.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CREDENTIALS"
        title="API keys"
        copy="Give each integration a named credential. Keep the secret on your server."
        action={
          <button
            className="button"
            onClick={() => setOpen(!open)}
            disabled={pending || !!newSecret}
          >
            Create API key <span>＋</span>
          </button>
        }
      />
      <ErrorNotice message={error} />
      {newSecret && (
        <section className="secret-card" role="status">
          <Badge tone="saffron">SHOWN ONCE</Badge>
          <h2>Save your API key.</h2>
          <p>The server stores a secure hash. This secret cannot be retrieved again.</p>
          <code className="secret-value">{newSecret}</code>
          <div className="action-row">
            <CopyButton text={newSecret} label="Copy secret" />
            <button className="button subtle" onClick={() => setNewSecret('')}>
              I saved it · Hide secret
            </button>
          </div>
        </section>
      )}
      {open && (
        <section className="panel form-panel">
          <h2>Create a named key</h2>
          <form className="inline-form" onSubmit={create}>
            <label>
              Key name
              <input
                name="name"
                maxLength={80}
                placeholder="e.g. Reading app development"
                required
              />
            </label>
            <label>
              Environment
              <select name="environment" defaultValue="sandbox">
                <option value="sandbox">Sandbox</option>
                <option value="production" disabled={!session.plan.price}>
                  Production · paid plan required
                </option>
              </select>
            </label>
            <button className="button" disabled={pending}>
              {pending ? 'Creating…' : 'Create key'}
            </button>
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Workspace keys</h2>
          <span className="small muted">{session.workspace.keys.length} records</span>
        </div>
        {session.workspace.keys.length ? (
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Name & prefix</th>
                  <th>Environment</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {session.workspace.keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <strong>{key.name}</strong>
                      <code className="table-code">{key.prefix}••••••••</code>
                    </td>
                    <td>
                      <Badge>{key.environment}</Badge>
                    </td>
                    <td>{formatDate(key.createdAt)}</td>
                    <td>{formatDate(key.lastUsedAt)}</td>
                    <td>
                      <Badge tone={key.status === 'active' ? 'green' : 'neutral'}>
                        {key.status}
                      </Badge>
                    </td>
                    <td>
                      {key.status === 'active' &&
                        (revokeId === key.id ? (
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
                          <button
                            className="text-button danger"
                            onClick={() => setRevokeId(key.id)}
                          >
                            Revoke
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="⌘" title="Your first key starts here.">
            Create a sandbox key to run the local fixture endpoints. Production access requires an
            active paid content plan.
          </Empty>
        )}
      </section>
      <div className="notice">
        Never place secrets in mobile apps, browser bundles, Git, or request logs. Newly generated
        secrets remain in this page’s memory until hidden or you navigate away.
      </div>
    </>
  );
}
