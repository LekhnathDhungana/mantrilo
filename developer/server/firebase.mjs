import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { hash, ApiError, insist } from './domain.mjs';
export function firebaseServices() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required for Firebase mode.');
  if (!getApps().length)
    initializeApp({
      projectId,
      ...(process.env.FIREBASE_AUTH_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
    });
  return { auth: getAuth(), db: getFirestore() };
}
export class FirebaseSessions {
  constructor(auth, db) {
    this.auth = auth;
    this.db = db;
  }
  async create(idToken) {
    const token = await this.auth.verifyIdToken(idToken, true);
    insist(
      Date.now() / 1000 - token.auth_time < 300,
      401,
      'recent_login_required',
      'Sign in again to create a session.',
    );
    const value = await this.auth.createSessionCookie(idToken, {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });
    await this.db
      .doc(`consoleSessions/${hash(value)}`)
      .set({ uid: token.uid, expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000 });
    return value;
  }
  async get(value) {
    if (!value) return null;
    try {
      const decoded = await this.auth.verifySessionCookie(value, true);
      const record = (await this.db.doc(`consoleSessions/${hash(value)}`).get()).data();
      if (!record || record.expiresAt < Date.now()) return null;
      const user = await this.auth.getUser(decoded.uid);
      if (user.disabled) return null;
      return {
        uid: decoded.uid,
        email: user.email || '',
        admin: user.customClaims?.admin === true,
      };
    } catch {
      return null;
    }
  }
  async delete(value) {
    if (value) await this.db.doc(`consoleSessions/${hash(value)}`).delete();
  }
  async customerByEmail(email) {
    try {
      return await this.auth.getUserByEmail(email);
    } catch {
      throw new ApiError(
        404,
        'user_missing',
        'Create the customer in Firebase Authentication first; public registration is disabled.',
      );
    }
  }
}
