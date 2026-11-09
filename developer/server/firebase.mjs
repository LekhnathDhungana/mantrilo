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
      // Local user credentials can't sign sign-in tokens; this account signs them through IAM.
      ...(process.env.MANTRILO_API_SIGNER
        ? { serviceAccountId: process.env.MANTRILO_API_SIGNER }
        : {}),
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
        email: user.email || user.phoneNumber || '',
        admin: user.customClaims?.admin === true,
        // A confirmed phone number proves ownership as well as a confirmed email does.
        verified: user.emailVerified || Boolean(user.phoneNumber),
        authTime: decoded.auth_time,
      };
    } catch {
      return null;
    }
  }
  async delete(value) {
    if (value) await this.db.doc(`consoleSessions/${hash(value)}`).delete();
  }
  // A correct email code signs in, or creates the account on first use.
  async signInToken(email) {
    const user = await this.auth.getUserByEmail(email).catch((error) => {
      if (error?.code === 'auth/user-not-found')
        return this.auth.createUser({ email, emailVerified: true });
      throw error;
    });
    insist(!user.disabled, 403, 'account_disabled', 'This account is disabled.');
    if (!user.emailVerified) await this.auth.updateUser(user.uid, { emailVerified: true });
    return this.auth.createCustomToken(user.uid);
  }
  // Lets the signed-in browser ask Firebase to send its verification email.
  verificationToken(uid) {
    return this.auth.createCustomToken(uid);
  }
  async deleteAccount(uid) {
    const open = await this.db.collection('consoleSessions').where('uid', '==', uid).get();
    await Promise.all(open.docs.map((doc) => doc.ref.delete()));
    await this.auth.deleteUser(uid);
  }
  async customerByEmail(email) {
    try {
      return await this.auth.getUserByEmail(email);
    } catch {
      throw new ApiError(
        404,
        'user_missing',
        'No account uses that email yet. Ask the customer to sign in once first.',
      );
    }
  }
}
