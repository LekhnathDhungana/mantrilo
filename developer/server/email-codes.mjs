import { Buffer } from 'node:buffer';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { ApiError, hash, insist } from './domain.mjs';

// Six-digit email sign-in codes. Only a hash is stored, in authCodes/{hash(email)}, which the
// deny-all Firestore rules keep away from every browser.
export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 30 * 1000;
export const SENDS_PER_HOUR = 5;
export const MAX_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readEmail(value) {
  const email = String(value ?? '')
    .trim()
    .toLowerCase();
  insist(
    EMAIL.test(email) && email.length <= 254,
    400,
    'invalid_email',
    'Enter a valid email address.',
  );
  return email;
}
const codeHash = (email, code) => hash(`${email}:${code}`);

export class EmailCodes {
  constructor(store, mailer, { now = () => Date.now() } = {}) {
    this.store = store;
    this.mailer = mailer;
    this.now = now;
  }
  async request(email) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0'),
      id = hash(email),
      now = this.now();
    await this.store.updateAuthCode(id, (old) => {
      insist(
        !old || now - old.lastSentAt >= RESEND_COOLDOWN_MS,
        429,
        'code_cooldown',
        'Please wait a moment before requesting another code.',
      );
      const fresh = !old || now - old.windowStart > HOUR_MS,
        sends = fresh ? 1 : old.sends + 1;
      insist(
        sends <= SENDS_PER_HOUR,
        429,
        'too_many_codes',
        'Too many codes requested. Try again later.',
      );
      return {
        next: {
          hash: codeHash(email, code),
          expiresAt: now + CODE_TTL_MS,
          attempts: 0,
          lastSentAt: now,
          windowStart: fresh ? now : old.windowStart,
          sends,
        },
      };
    });
    try {
      await this.mailer.send(email, code);
    } catch (error) {
      console.error(`Sign-in email failed: ${error.message}`);
      await this.store.updateAuthCode(id, () => ({ next: null }));
      throw new ApiError(503, 'email_failed', 'Could not send the code. Try again.');
    }
  }
  async verify(email, code) {
    insist(/^\d{6}$/.test(String(code)), 400, 'invalid_code', 'Enter the 6-digit code.');
    const result = await this.store.updateAuthCode(hash(email), (doc) => {
      if (!doc || doc.expiresAt < this.now()) return { result: 'expired' };
      if (doc.attempts >= MAX_ATTEMPTS) return { result: 'locked' };
      const matches = timingSafeEqual(
        Buffer.from(doc.hash, 'hex'),
        Buffer.from(codeHash(email, String(code)), 'hex'),
      );
      if (matches) return { next: null, result: 'ok' };
      const attempts = doc.attempts + 1;
      // Returned rather than thrown so the attempt count still commits.
      return { next: { ...doc, attempts }, result: attempts >= MAX_ATTEMPTS ? 'locked' : 'wrong' };
    });
    if (result === 'expired')
      throw new ApiError(400, 'code_expired', 'This code has expired. Request a new one.');
    if (result === 'locked')
      throw new ApiError(429, 'code_locked', 'Too many incorrect codes. Request a new one.');
    if (result === 'wrong') throw new ApiError(400, 'code_wrong', 'That code is incorrect.');
  }
}

// Caps how many codes one address can trigger, so the endpoint can't be used to spam inboxes.
export class Throttle {
  constructor({ limit, windowMs, now = () => Date.now() }) {
    Object.assign(this, { limit, windowMs, now, hits: new Map() });
  }
  take(id) {
    const now = this.now(),
      entry = this.hits.get(id);
    if (!entry || now - entry.start > this.windowMs) {
      this.hits.set(id, { start: now, count: 1 });
      if (this.hits.size > 50_000) this.hits.delete(this.hits.keys().next().value);
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

export class ResendMailer {
  constructor({ apiKey, from }) {
    Object.assign(this, { apiKey, from });
  }
  async send(to, code) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to,
        subject: `${code} is your Mantrilo code`,
        text: `Your Mantrilo sign-in code is ${code}. It expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
        html: `<div style="font-family:Georgia,serif;max-width:420px;margin:auto;padding:24px;color:#28322b"><p style="font-size:16px">Your Mantrilo sign-in code:</p><p style="font-size:36px;letter-spacing:8px;margin:16px 0;color:#a74d2b">${code}</p><p style="font-size:14px;color:#6d756b">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p></div>`,
      }),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
  }
  async sendKeyCreated(to, { prefix }) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to,
        subject: 'Your Mantrilo API key was regenerated',
        text: `The API key on your Mantrilo account was just regenerated, so the previous key no longer works.\n\nNew key starts with: ${prefix}\n\nIf this wasn't you, sign in to the Developer Console, regenerate the key again and change your password.`,
      }),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
  }
}

// Only reachable with the local Auth emulator, which production startup rejects.
export class EmulatorMailer {
  async send(to, code) {
    console.log(`[auth emulator] sign-in code for ${to}: ${code}`);
  }
  async sendKeyCreated(to, { prefix }) {
    console.log(`[auth emulator] API key regenerated (${prefix}), notifying ${to}`);
  }
}

export function createMailer(env = process.env) {
  if (env.RESEND_API_KEY)
    return new ResendMailer({
      apiKey: env.RESEND_API_KEY,
      from: env.MANTRILO_EMAIL_FROM || 'Mantrilo <onboarding@resend.dev>',
    });
  return env.FIREBASE_AUTH_EMULATOR_HOST ? new EmulatorMailer() : null;
}
