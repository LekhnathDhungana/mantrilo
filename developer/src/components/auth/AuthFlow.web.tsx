import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { authCancelled, authErrorMessage } from '../../lib/auth-errors';
import type { SocialProvider } from '../../lib/firebase';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" aria-hidden="true">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </svg>
  );
}

const LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const toPhone = (value: string) => `+${value.replace(/\D/g, '')}`;
const PHONE = /^\+[1-9]\d{6,14}$/;
const MIN_PASSWORD = 8;
type Step = 'options' | 'password' | 'email' | 'phone' | 'code';

// Sign-in and sign-up are one path: a correct code opens the account or creates it.
export default function AuthFlow() {
  const { config, refresh } = useConsole();
  // The public site's "Get API key" links here with ?mode=signup to open on account creation.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const socialEnabled = Boolean(config?.googleSignIn || config?.appleSignIn);
  const hasOptions = Boolean(config?.emailCodes || config?.phoneCodes || socialEnabled);
  const [step, setStep] = useState<Step>(hasOptions ? 'options' : 'password'),
    [creating, setCreating] = useState(mode === 'signup'),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [channel, setChannel] = useState<'email' | 'phone'>('email'),
    [email, setEmail] = useState(''),
    [phone, setPhone] = useState('+'),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [info, setInfo] = useState(''),
    [busy, setBusy] = useState(false),
    [wait, setWait] = useState(0);
  const submitting = useRef(false);
  const firebaseConfig = config?.firebase;
  const address = email.trim().toLowerCase(),
    number = toPhone(phone);
  // New passwords are typed twice so a typo can't lock someone out of a fresh account.
  const mismatch = creating && confirm.length > 0 && confirm !== password;
  const passwordReady = creating
    ? password.length >= MIN_PASSWORD && confirm === password
    : password.length > 0;

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  function go(next: Step) {
    setError('');
    setInfo('');
    setCode('');
    setStep(next);
  }
  async function submitPassword(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseConfig) return;
    if (creating && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const firebase = await import('../../lib/firebase');
      const idToken = await (
        creating ? firebase.createPasswordAccount : firebase.signInWithPassword
      )(firebaseConfig, address, password);
      setPassword('');
      setConfirm('');
      await mutate('/api/auth/session', 'POST', { idToken });
      await refresh();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: SocialProvider) {
    if (!firebaseConfig) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const firebase = await import('../../lib/firebase');
      const idToken = await firebase.signInWithSocial(firebaseConfig, provider);
      await mutate('/api/auth/session', 'POST', { idToken });
      await refresh();
    } catch (e) {
      if (!authCancelled(e)) setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function toggleCreating() {
    setError('');
    setInfo('');
    setConfirm('');
    setCreating(!creating);
  }
  async function forgotPassword() {
    if (!firebaseConfig) return;
    if (!EMAIL.test(address)) {
      setError('Enter your email address, then choose Forgot your password.');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await (await import('../../lib/firebase')).resetPassword(firebaseConfig, address);
    } catch (e) {
      // Unknown addresses get the same reply, so this can't reveal who has an account.
      if ((e as { code?: string } | null)?.code !== 'auth/user-not-found') {
        setError(authErrorMessage(e));
        setBusy(false);
        return;
      }
    }
    setInfo('If an account exists for that email, a password-reset link is on its way.');
    setBusy(false);
  }
  async function send(target: 'email' | 'phone') {
    if (!firebaseConfig) return;
    if (target === 'email') await mutate('/api/auth/email/request', 'POST', { email: address });
    else await (await import('../../lib/firebase')).sendPhoneCode(firebaseConfig, number);
    setChannel(target);
    setWait(RESEND_SECONDS);
  }
  async function start(event: React.SubmitEvent<HTMLFormElement>, target: 'email' | 'phone') {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await send(target);
      go('code');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError('');
    setCode('');
    try {
      await send(channel);
      setInfo('We sent a new code.');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(value: string) {
    if (!firebaseConfig || submitting.current || value.length !== LENGTH) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const firebase = await import('../../lib/firebase');
      let idToken;
      if (channel === 'phone') idToken = await firebase.confirmPhoneCode(firebaseConfig, value);
      else {
        const { token } = await mutate<{ token: string }>('/api/auth/email/verify', 'POST', {
          email: address,
          code: value,
        });
        idToken = await firebase.exchangeEmailToken(firebaseConfig, token);
      }
      await mutate('/api/auth/session', 'POST', { idToken });
      await refresh();
    } catch (e) {
      setError(authErrorMessage(e));
      setCode('');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function enter(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    if (digits.length === LENGTH) void submit(digits);
  }

  const notices = (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {info && (
        <div className="notice" role="status">
          {info}
        </div>
      )}
    </>
  );
  const back = (to: Step) => (
    <button type="button" className="text-button" onClick={() => go(to)} disabled={busy}>
      ← Back
    </button>
  );

  if (step === 'password')
    return (
      <>
        <div className="eyebrow">WELCOME TO MANTRILO</div>
        <h2>{creating ? 'Create your account.' : 'Sign in to your console.'}</h2>
        <p>
          {creating
            ? 'New accounts start free with 500 API calls a month and a ready-to-use key.'
            : 'Welcome back. Enter your email and password.'}
        </p>
        {notices}
        <form onSubmit={submitPassword}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || !firebaseConfig}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              minLength={creating ? MIN_PASSWORD : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || !firebaseConfig}
              required
            />
          </label>
          {creating && (
            <>
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy || !firebaseConfig}
                  aria-invalid={mismatch}
                  aria-describedby="password-hint"
                  required
                />
              </label>
              <p id="password-hint" className={mismatch ? 'small field-error' : 'small muted'}>
                {mismatch ? 'Passwords do not match.' : `Use at least ${MIN_PASSWORD} characters.`}
              </p>
            </>
          )}
          <button
            className="button"
            disabled={busy || !firebaseConfig || !EMAIL.test(address) || !passwordReady}
          >
            {busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'} <span>↗</span>
          </button>
        </form>
        <div className="auth-links">
          {hasOptions && back('options')}
          <button type="button" className="text-button" onClick={toggleCreating} disabled={busy}>
            {creating ? 'Have an account? Sign in' : 'New here? Create an account'}
          </button>
          {!creating && (
            <button
              type="button"
              className="text-button"
              onClick={forgotPassword}
              disabled={busy || !firebaseConfig}
            >
              Forgot your password?
            </button>
          )}
        </div>
        {!firebaseConfig && (
          <p className="setup-note">Sign-in requires Firebase configuration on this server.</p>
        )}
        <p className="small muted">By continuing, you agree to Mantrilo&apos;s Terms of Use.</p>
      </>
    );
  if (step === 'email')
    return (
      <>
        <div className="eyebrow">EMAIL</div>
        <h2>Continue with email.</h2>
        <p>We&apos;ll email you a code to sign in or create your Mantrilo account.</p>
        {notices}
        <form onSubmit={(event) => start(event, 'email')}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <button className="button" disabled={busy || !EMAIL.test(address)}>
            {busy ? 'Sending code…' : 'Send code'} <span>↗</span>
          </button>
        </form>
        {back('options')}
      </>
    );
  if (step === 'phone')
    return (
      <>
        <div className="eyebrow">PHONE</div>
        <h2>Continue with phone.</h2>
        <p>We&apos;ll text you a code to sign in or create your Mantrilo account.</p>
        {notices}
        <form onSubmit={(event) => start(event, 'phone')}>
          <label>
            Phone number with country code
            <input
              type="tel"
              autoComplete="tel"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <button className="button" disabled={busy || !PHONE.test(number)}>
            {busy ? 'Sending code…' : 'Send code'} <span>↗</span>
          </button>
        </form>
        <p className="small muted">Message and data rates may apply.</p>
        {back('options')}
      </>
    );
  if (step === 'code')
    return (
      <>
        <div className="eyebrow">VERIFY</div>
        <h2>{channel === 'phone' ? 'Check your messages.' : 'Check your email.'}</h2>
        <p>
          Enter the 6-digit code we sent to {channel === 'phone' ? number : address}. It expires in
          10 minutes.
        </p>
        {notices}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(code);
          }}
        >
          <div className="code-entry">
            <div className="code-boxes" aria-hidden="true">
              {Array.from({ length: LENGTH }, (_, i) => (
                <span
                  key={i}
                  className={i === Math.min(code.length, LENGTH - 1) && !busy ? 'active' : ''}
                >
                  {code[i] ?? ''}
                </span>
              ))}
            </div>
            {/* One real input under the boxes keeps paste and code autofill working. */}
            <input
              aria-label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => enter(e.target.value)}
              readOnly={busy}
            />
          </div>
          <button className="button" disabled={busy || code.length !== LENGTH}>
            {busy ? 'Checking…' : 'Continue'} <span>↗</span>
          </button>
        </form>
        <div className="auth-links">
          {back(channel)}
          <button
            type="button"
            className="text-button"
            onClick={resend}
            disabled={busy || wait > 0}
          >
            {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          </button>
        </div>
      </>
    );
  return (
    <>
      <div className="eyebrow">WELCOME TO MANTRILO</div>
      <h2>Get started.</h2>
      <p>Sign in or create your account. New accounts start free with 500 API calls a month.</p>
      {notices}
      <div className="auth-options">
        {config?.googleSignIn && (
          <button
            className="button social google"
            onClick={() => social('google')}
            disabled={busy || !firebaseConfig}
          >
            <GoogleMark /> Continue with Google
          </button>
        )}
        {config?.appleSignIn && (
          <button
            className="button social apple"
            onClick={() => social('apple')}
            disabled={busy || !firebaseConfig}
          >
            <AppleMark /> Continue with Apple
          </button>
        )}
        {socialEnabled && (
          <div className="auth-divider" role="separator">
            <span>or</span>
          </div>
        )}
        {config?.emailCodes && (
          <button className="button" onClick={() => go('email')} disabled={busy || !firebaseConfig}>
            Continue with email <span>↗</span>
          </button>
        )}
        <button
          className="button outline"
          onClick={() => go('password')}
          disabled={busy || !firebaseConfig}
        >
          Continue with password <span>→</span>
        </button>
        {config?.phoneCodes && (
          <button
            className="button outline"
            onClick={() => go('phone')}
            disabled={busy || !firebaseConfig}
          >
            Continue with phone <span>→</span>
          </button>
        )}
      </div>
      {!firebaseConfig && (
        <p className="setup-note">Sign-in requires Firebase configuration on this server.</p>
      )}
      <p className="small muted">By continuing, you agree to Mantrilo&apos;s Terms of Use.</p>
    </>
  );
}
