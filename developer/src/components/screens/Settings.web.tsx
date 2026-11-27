import { useState } from 'react';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { ErrorNotice, PageTitle } from '../ui.web';

export default function Settings() {
  const { session, config, refresh } = useConsole();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [confirm, setConfirm] = useState('');
  if (!session) return null;
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const r = await mutate<{ notice: string }>('/api/settings', 'PATCH', {
        name: f.get('name'),
        emailNotifications: f.get('notifications') === 'on',
        usageAlertThreshold: Number(f.get('threshold')),
      });
      await refresh();
      setNotice(r.notice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settings could not be saved.');
    } finally {
      setPending(false);
    }
  }
  async function reset() {
    if (!config?.firebase || !session) return;
    setPending(true);
    setError('');
    try {
      const firebase = await import('../../lib/firebase');
      await firebase.resetPassword(config.firebase, session.user.email);
      setNotice('Check your email for a password-reset link.');
    } catch {
      setError('The reset email could not be sent. Try again.');
    } finally {
      setPending(false);
    }
  }
  async function remove(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await mutate('/api/account/delete', 'POST', { confirm });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your account could not be deleted.');
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE & ACCOUNT"
        title="Settings"
        copy="Keep workspace details and preferences in one place."
      />
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="settings-grid">
        <section className="panel form-panel">
          <h2>Workspace details</h2>
          <form onSubmit={save}>
            <label>
              Workspace name
              <input name="name" defaultValue={session.workspace.name} maxLength={80} required />
            </label>
            <label>
              Usage alert threshold (%)
              <input
                name="threshold"
                type="number"
                min="10"
                max="100"
                step="1"
                defaultValue={session.workspace.preferences.usageAlertThreshold}
                required
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="notifications"
                defaultChecked={session.workspace.preferences.emailNotifications}
              />
              Email usage notifications
            </label>
            <p className="small muted">
              Preferences are stored server-side. Notification delivery is not connected yet.
            </p>
            <button className="button" disabled={pending}>
              {pending ? 'Saving…' : 'Save preferences'}
            </button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Account</h2>
          <dl className="account-details">
            <dt>Signed in as</dt>
            <dd>{session.user.email}</dd>
            <dt>Access</dt>
            <dd>{session.user.admin ? 'Administrator' : 'Workspace owner'}</dd>
            <dt>Session</dt>
            <dd>
              {session.mode === 'demo'
                ? 'Local demo session · 8 hours'
                : 'Firebase session cookie · up to 5 days'}
            </dd>
          </dl>
          {session.mode === 'firebase' && session.user.email.includes('@') && (
            <button className="button outline" onClick={reset} disabled={pending}>
              Send password-reset email
            </button>
          )}
          <p className="small muted">
            API credentials and session cookies are never stored in browser local storage.
          </p>
          {session.mode === 'firebase' && !session.user.admin && (
            <form className="danger-zone" onSubmit={remove}>
              <h3>Delete account</h3>
              <p className="small muted">
                Permanently deletes your account, workspace, API keys and usage. Live integrations
                using your keys will stop working. This can&apos;t be undone.
              </p>
              <label>
                Type DELETE to confirm
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                  disabled={pending}
                />
              </label>
              <button className="button outline" disabled={pending || confirm !== 'DELETE'}>
                Delete my account
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
