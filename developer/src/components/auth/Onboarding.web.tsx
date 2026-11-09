import { useState } from 'react';
import { router } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { authErrorMessage } from '../../lib/auth-errors';

// First sign-in only: who you are, what the workspace is called, then usage alerts.
export default function Onboarding() {
  const { session, refresh } = useConsole();
  const defaultWorkspace =
    session?.workspace.name === 'My workspace' ? '' : session?.workspace.name;
  const [step, setStep] = useState<'profile' | 'alerts'>('profile'),
    [name, setName] = useState(session?.user.name || ''),
    [workspaceName, setWorkspaceName] = useState(defaultWorkspace || ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function finish(emailNotifications: boolean) {
    setBusy(true);
    setError('');
    try {
      await mutate('/api/onboarding', 'POST', { name, workspaceName, emailNotifications });
      await refresh();
      router.replace('/');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const failure = error && (
    <div className="notice error" role="alert">
      {error}
    </div>
  );
  if (step === 'alerts')
    return (
      <>
        <div className="eyebrow">STEP 2 OF 2</div>
        <h2>Usage alerts.</h2>
        <p>
          Want an email when your workspace nears its monthly allowance? Alerts aren&apos;t being
          sent yet. We&apos;ll use this choice once they are, and you can change it in Settings.
        </p>
        {failure}
        <div className="auth-options">
          <button className="button" onClick={() => finish(true)} disabled={busy}>
            {busy ? 'Saving…' : 'Yes, alert me'} <span>↗</span>
          </button>
          <button className="button outline" onClick={() => finish(false)} disabled={busy}>
            Not now
          </button>
        </div>
        <button className="text-button" onClick={() => setStep('profile')} disabled={busy}>
          ← Back
        </button>
      </>
    );
  return (
    <>
      <div className="eyebrow">STEP 1 OF 2</div>
      <h2>Complete your profile.</h2>
      <p>A little about you and what you&apos;re building.</p>
      {failure}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setStep('alerts');
        }}
      >
        <label>
          Your name
          <input
            autoComplete="name"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Workspace or company
          <input
            autoComplete="organization"
            maxLength={80}
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            required
          />
        </label>
        <button className="button" disabled={!name.trim() || !workspaceName.trim()}>
          Next <span>→</span>
        </button>
      </form>
    </>
  );
}
