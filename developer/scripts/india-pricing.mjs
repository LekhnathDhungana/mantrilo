// Set eligibility after verifying the workspace’s India billing address.
// node scripts/india-pricing.mjs <workspace-id> enable|disable
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [workspaceId, action, ...extra] = process.argv.slice(2);
if (!/^[\w-]{1,160}$/.test(workspaceId ?? '') || !['enable', 'disable'].includes(action) || extra.length) {
  throw new Error('Usage: node scripts/india-pricing.mjs <workspace-id> enable|disable');
}
if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Unset FIRESTORE_EMULATOR_HOST first.');
const app = initializeApp({ projectId: 'mantrilo', credential: applicationDefault() });
try {
  await getFirestore(app).doc(`workspaces/${workspaceId}`).update({
    indiaPricing: action === 'enable',
  });
  console.log(`India pricing ${action}d for ${workspaceId}.`);
} finally {
  await deleteApp(app);
}
