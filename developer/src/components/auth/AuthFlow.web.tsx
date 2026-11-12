import { useEffect, useRef, useState } from 'react';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { authErrorMessage } from '../../lib/auth-errors';

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
  const codesEnabled = Boolean(config?.emailCodes || config?.phoneCodes);
  const [step, setStep] = useState<Step>(codesEnabled ? 'options' : 'password'),
    [creating, setCreating] = useState(false),
    [password, setPassword] = useState(''),
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
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const firebase = await import('../../lib/firebase');
      const idToken = await (
        creating ? firebase.createPasswordAccount : firebase.signInWithPassword
      )(firebaseConfig, address, password);
      setPassword('');
      await mutate('/api/auth/session', 'POST', { idToken });
      await refresh();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
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
          {creating && <p className="small muted">Use at least {MIN_PASSWORD} characters.</p>}
          <button
            className="button"
            disabled={
              busy ||
              !firebaseConfig ||
              !EMAIL.test(address) ||
              password.length < (creating ? MIN_PASSWORD : 1)
            }
          >
            {busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'} <span>↗</span>
          </button>
        </form>
        <div className="auth-links">
          {codesEnabled ? (
            back('options')
          ) : (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setError('');
                setInfo('');
                setCreating(!creating);
              }}
              disabled={busy}
            >
              {creating ? 'Have an account? Sign in' : 'New here? Create an account'}
            </button>
          )}
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
        <button
          className="button"
          onClick={() => go('email')}
          disabled={!firebaseConfig || !config?.emailCodes}
        >
          Continue with email <span>↗</span>
        </button>
        <button
          className="button outline"
          onClick={() => go('password')}
          disabled={!firebaseConfig}
        >
          Continue with password <span>→</span>
        </button>
        {config?.phoneCodes && (
          <button className="button outline" onClick={() => go('phone')} disabled={!firebaseConfig}>
            Continue with phone <span>→</span>
          </button>
        )}
      </div>
      {firebaseConfig && !config?.emailCodes && (
        <p className="setup-note">Email sign-in needs a mail provider on this server.</p>
      )}
      {!firebaseConfig && (
        <p className="setup-note">Sign-in requires Firebase configuration on this server.</p>
      )}
      <p className="small muted">By continuing, you agree to Mantrilo&apos;s Terms of Use.</p>
    </>
  );
}
