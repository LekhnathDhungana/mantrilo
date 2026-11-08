import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import Brand from './Brand.web';
import { useConsole } from './Session.web';
import { mutate } from '../lib/api';
export default function Login() {
  useEffect(() => {
    document.title = 'Sign in | Mantrilo Developer Console';
  }, []);
  const { session, config, loading, error: serviceError, refresh } = useConsole();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  if (loading)
    return (
      <div className="full-loading" role="status">
        Connecting to your console…
      </div>
    );
  if (session) return <Redirect href="/" />;
  async function demo(role: string) {
    setPending(true);
    setError('');
    try {
      await mutate('/api/auth/demo', 'POST', { role });
      await refresh();
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the demo.');
    } finally {
      setPending(false);
    }
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config?.firebase) return;
    setPending(true);
    setError('');
    try {
      const firebase = await import('../lib/firebase');
      const idToken = await firebase.login(config.firebase, email, password);
      setPassword('');
      await mutate('/api/auth/session', 'POST', { idToken });
      await refresh();
      router.replace('/');
    } catch {
      setError(
        'Could not sign in. Check your credentials, Firebase configuration, and workspace assignment.',
      );
    } finally {
      setPending(false);
    }
  }
  async function reset() {
    if (!config?.firebase || !email) {
      setError('Enter your account email, then request a password reset.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const firebase = await import('../lib/firebase');
      await firebase.resetPassword(config.firebase, email);
      setNotice('If an account exists, check its email for a password-reset message.');
    } catch {
      setError(
        'Password reset could not be requested. Check Firebase email/password configuration.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-page">
      <header>
        <Brand />
        <span className="badge">DEVELOPER CONSOLE</span>
      </header>
      <main className="login-grid">
        <section className="login-story">
          <div className="eyebrow">YOUR NEXT CREATION STARTS HERE</div>
          <h1>
            Timeless content.
            <br />
            <em>Your workspace.</em>
          </h1>
          <p>
            Manage your API keys, explore content structures, and keep your integration in view.
          </p>
          <div className="login-categories">
            <span>
              ॐ <b>Mantras & shlokas</b>
            </span>
            <span>
              ≋ <b>Sacred audio</b>
            </span>
            <span>
              ▤ <b>Shastras & books</b>
            </span>
            <span>
              ✧ <b>Astrology</b>
            </span>
          </div>
          <p className="small">Built for developers creating apps and websites.</p>
        </section>
        <section className="login-card">
          <div className="eyebrow">WELCOME TO MANTRILO</div>
          <h2>Sign in to your console.</h2>
          <p>Access is provisioned by your administrator.</p>
          {(serviceError || error) && (
            <div className="notice error" role="alert">
              {serviceError || error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!config?.firebase || pending}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!config?.firebase || pending}
              />
            </label>
            <button className="button" disabled={!config?.firebase || pending}>
              {pending ? 'Please wait…' : 'Sign in'} <span>↗</span>
            </button>
          </form>
          <button className="text-button" onClick={reset} disabled={!config?.firebase || pending}>
            Forgot your password?
          </button>
          {!config?.firebase && (
            <p className="setup-note">
              Firebase sign-in requires project configuration. No live account has been created by
              this preview.
            </p>
          )}
          {config?.mode === 'demo' && (
            <div className="demo-login">
              <span className="badge">LOCAL DEMO · NO CREDENTIALS REQUIRED</span>
              <p>
                Try real console interactions with isolated sample data. Changes reset when the
                local server restarts.
              </p>
              <button
                className="button outline"
                disabled={pending}
                onClick={() => demo('customer')}
              >
                Explore demo workspace <span>→</span>
              </button>
              <button className="text-button" disabled={pending} onClick={() => demo('admin')}>
                Open demo administrator →
              </button>
            </div>
          )}
          <p className="small muted">No public registration</p>
        </section>
      </main>
      <footer>Mantrilo Developer Console · Private workspace</footer>
    </div>
  );
}
