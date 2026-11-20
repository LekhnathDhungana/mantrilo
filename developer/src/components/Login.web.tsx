import { useEffect, useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Brand from './Brand.web';
import { useConsole } from './Session.web';
import { mutate } from '../lib/api';
import { consoleReturn } from '../lib/console-return';
import AuthFlow from './auth/AuthFlow.web';
import Onboarding from './auth/Onboarding.web';
export default function Login() {
  useEffect(() => {
    document.title = 'Sign in | Mantrilo Developer Console';
  }, []);
  const { next } = useLocalSearchParams<{ next?: string }>();
  const destination = consoleReturn(next);
  const { session, config, loading, error: serviceError, refresh } = useConsole();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  if (loading)
    return (
      <div className="full-loading" role="status">
        Connecting to your console…
      </div>
    );
  if (session?.user.onboarded) return <Redirect href={destination} />;
  async function demo(role: string) {
    setPending(true);
    setError('');
    try {
      await mutate('/api/auth/demo', 'POST', { role });
      await refresh();
      router.replace(destination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the demo.');
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
              ॐ <b>Mantras</b>
            </span>
            <span>
              ≋ <b>Sacred audio</b>
            </span>
            <span>
              ▤ <b>Books</b>
            </span>
            <span>
              ✧ <b>Astrology</b>
            </span>
          </div>
          <p className="small">Built for developers creating apps and websites.</p>
        </section>
        <section className="login-card">
          {(serviceError || error) && (
            <div className="notice error" role="alert">
              {serviceError || error}
            </div>
          )}
          {session ? <Onboarding destination={destination} /> : <AuthFlow />}
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
        </section>
      </main>
      <footer>Mantrilo Developer Console · Private workspace</footer>
    </div>
  );
}
