import { ConsoleError } from './api';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with that email already exists. Sign in instead.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/invalid-phone-number': 'Enter your phone number with its country code, like +1 415…',
  'auth/missing-phone-number': 'Enter your phone number with its country code, like +1 415…',
  'auth/invalid-verification-code': 'That code is incorrect.',
  'auth/missing-verification-code': 'That code is incorrect.',
  'auth/code-expired': 'This code has expired. Request a new one.',
  'auth/session-expired': 'This code has expired. Request a new one.',
  'auth/invalid-verification-id': 'This code has expired. Request a new one.',
  'auth/quota-exceeded': 'Too many codes were sent. Try again later.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/captcha-check-failed': "This browser couldn't be verified. Try again, or use email.",
  'auth/invalid-app-credential': "This browser couldn't be verified. Try again, or use email.",
  'auth/operation-not-allowed': "Phone sign-in isn't available for this number. Try email instead.",
  'auth/user-disabled': 'This account is disabled.',
  'auth/invalid-custom-token': 'Sign-in is misconfigured. Contact support.',
  'auth/custom-token-mismatch': 'Sign-in is misconfigured. Contact support.',
  'auth/network-request-failed': 'Could not connect. Check your internet connection and try again.',
};

export function authErrorMessage(error: unknown) {
  if (error instanceof ConsoleError) return error.message;
  return (
    MESSAGES[(error as { code?: string } | null)?.code ?? ''] ||
    'Something went wrong. Please try again.'
  );
}
