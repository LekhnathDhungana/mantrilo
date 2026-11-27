import { equal, hash } from './domain.mjs';
import { readEmail } from './email-codes.mjs';

const codePattern = /^[A-Za-z0-9_-]{15,128}$/;

export function configurePromo(value) {
  if (!value?.trim()) return null;
  try {
    const { email, workspaceId, code } = JSON.parse(value);
    if (typeof code !== 'string' || !codePattern.test(code)) throw new Error();
    const byWorkspace = typeof workspaceId === 'string' && /^[\w-]{1,200}$/.test(workspaceId);
    if (workspaceId !== undefined && (!byWorkspace || email !== undefined)) throw new Error();
    if (!byWorkspace && typeof email !== 'string') throw new Error();
    const recipient = byWorkspace ? null : readEmail(email);
    const digest = hash(code);
    return {
      eligible: ({ workspaceId: id, email, emailVerified }) =>
        byWorkspace
          ? id === workspaceId
          : emailVerified && typeof email === 'string' && email.trim().toLowerCase() === recipient,
      matches: (code) =>
        typeof code === 'string' &&
        codePattern.test(code.trim()) &&
        equal(hash(code.trim()), digest),
    };
  } catch {
    throw new Error(
      'MANTRILO_UNLIMITED_PROMO needs a workspace ID or email and a 15–128 character code.',
    );
  }
}
