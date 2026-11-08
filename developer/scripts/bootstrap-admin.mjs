import { firebaseServices } from '../server/firebase.mjs';
import { FirestoreStore } from '../server/store.mjs';
import { bootstrapAdmin } from '../server/bootstrap.mjs';
try {
  const { auth, db } = firebaseServices();
  const result = await bootstrapAdmin({
    auth,
    store: new FirestoreStore(db),
    password: process.env.MANTRILO_INITIAL_ADMIN_PASSWORD,
  });
  delete process.env.MANTRILO_INITIAL_ADMIN_PASSWORD;
  console.log(
    result.created ? 'Administrator created.' : 'Administrator already exists; password unchanged.',
  );
  process.exitCode = 0;
} catch (error) {
  console.error(
    error.message?.startsWith('Supply MANTRILO_')
      ? error.message
      : 'Administrator bootstrap failed. Check the project, IAM, Auth provider, and secret configuration.',
  );
  process.exitCode = 1;
}
