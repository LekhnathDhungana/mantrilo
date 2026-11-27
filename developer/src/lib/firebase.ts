import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  connectAuthEmulator,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type Auth,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import type { AuthConfig } from './types';

type Config = NonNullable<AuthConfig['firebase']>;
let emulatorConnected = false;
let verifier: RecaptchaVerifier | undefined;
let confirmation: ConfirmationResult | undefined;

function clientAuth(config: Config) {
  const app = getApps()[0] || initializeApp(config);
  let auth;
  try {
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    auth = getAuth(app);
  }
  if (config.authEmulatorHost && !emulatorConnected) {
    connectAuthEmulator(auth, `http://${config.authEmulatorHost}`, { disableWarnings: true });
    auth.settings.appVerificationDisabledForTesting = true;
    emulatorConnected = true;
  }
  return auth;
}

// The browser only holds Firebase auth long enough to hand an ID token to the backend session.
async function idToken(auth: Auth, signIn: Promise<UserCredential>) {
  try {
    return await (await signIn).user.getIdToken();
  } finally {
    await signOut(auth);
  }
}

export function signInWithPassword(config: Config, email: string, password: string) {
  const auth = clientAuth(config);
  return idToken(auth, signInWithEmailAndPassword(auth, email, password));
}

export function createPasswordAccount(config: Config, email: string, password: string) {
  const auth = clientAuth(config);
  return idToken(
    auth,
    createUserWithEmailAndPassword(auth, email, password).then(async (credential) => {
      // Sign-up still succeeds if this fails; the API keys screen can send it again.
      await sendEmailVerification(credential.user).catch(() => undefined);
      return credential;
    }),
  );
}

export async function sendVerificationEmail(config: Config, token: string) {
  const auth = clientAuth(config);
  try {
    await sendEmailVerification((await signInWithCustomToken(auth, token)).user);
  } finally {
    await signOut(auth);
  }
}

export function resetPassword(config: Config, email: string) {
  return sendPasswordResetEmail(clientAuth(config), email);
}

export function exchangeEmailToken(config: Config, token: string) {
  const auth = clientAuth(config);
  return idToken(auth, signInWithCustomToken(auth, token));
}

// Browsers prove they aren't bots with an invisible reCAPTCHA before Firebase sends the text.
export async function sendPhoneCode(config: Config, phone: string) {
  const auth = clientAuth(config);
  if (!verifier) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    verifier = new RecaptchaVerifier(auth, host, { size: 'invisible' });
  }
  try {
    confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  } catch (error) {
    verifier.clear();
    verifier = undefined;
    throw error;
  }
}

export function confirmPhoneCode(config: Config, code: string) {
  if (!confirmation)
    throw Object.assign(new Error('No code was requested'), { code: 'auth/code-expired' });
  return idToken(clientAuth(config), confirmation.confirm(code));
}

export type SocialProvider = 'google' | 'apple';

// Google and Apple open in a popup; a new account is created on first sign-in.
export function signInWithSocial(config: Config, provider: SocialProvider) {
  const auth = clientAuth(config);
  let authProvider;
  if (provider === 'google') {
    authProvider = new GoogleAuthProvider();
    authProvider.setCustomParameters({ prompt: 'select_account' });
  } else {
    authProvider = new OAuthProvider('apple.com');
    authProvider.addScope('email');
    authProvider.addScope('name');
  }
  return idToken(auth, signInWithPopup(auth, authProvider));
}
