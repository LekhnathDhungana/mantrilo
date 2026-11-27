import { INITIAL_ADMIN_EMAIL } from './domain.mjs';
export async function bootstrapAdmin({ auth, store, password }) {
  let user,
    created = false;
  try {
    user = await auth.getUserByEmail(INITIAL_ADMIN_EMAIL);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    if (typeof password !== 'string' || password.length < 12)
      throw new Error('Supply MANTRILO_INITIAL_ADMIN_PASSWORD securely (at least 12 characters).');
    try {
      user = await auth.createUser({ email: INITIAL_ADMIN_EMAIL, password, emailVerified: false });
      created = true;
    } catch (createError) {
      if (createError.code !== 'auth/email-already-exists') throw createError;
      user = await auth.getUserByEmail(INITIAL_ADMIN_EMAIL);
    }
  }
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
  const profile = await store.getUser(user.uid),
    workspaceId = profile?.workspaceId || `workspace_${user.uid}`;
  await store.ensureWorkspace(workspaceId, user.uid, 'Mantrilo');
  if (!profile) await store.putUser(user.uid, { workspaceId, role: 'owner' });
  return { created };
}
