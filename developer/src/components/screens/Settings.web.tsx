import { useState } from 'react';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { ErrorNotice, PageTitle } from '../ui.web';

export default function Settings() {
  const { session, config, refresh } = useConsole();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
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
    try {
      const firebase = await import('../../lib/firebase');
      await firebase.resetPassword(config.firebase, session.user.email);
      setNotice('If your account exists, check your email for password-reset instructions.');
    } catch {
      setError('Reset could not be requested. Check Firebase configuration.');
    } finally {
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
            <dt>Email</dt>
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
          <button
            className="button outline"
            onClick={reset}
            disabled={pending || !config?.firebase}
          >
            Send password-reset email
          </button>
          {!config?.firebase && (
            <p className="small muted">
              Real account actions require Firebase configuration. Demo login has no password.
            </p>
          )}
          <p className="small muted">
            API credentials and session cookies are never stored in browser local storage.
          </p>
        </section>
      </div>
    </>
  );
}
