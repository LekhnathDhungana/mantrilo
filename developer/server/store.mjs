import {
  ApiError,
  newWorkspace,
  apiKeyRecord,
  changedKeys,
  removedKeys,
  mergeUsage,
} from './domain.mjs';
import { FirestoreUsageSink } from '../api/usage.mjs';
export class MemoryStore {
  constructor() {
    this.workspaces = new Map();
    this.users = new Map();
    this.apiKeys = new Map();
    this.activity = new Map();
    this.apiEvents = [];
    this.authCodes = new Map();
    this.locks = new Map();
  }
  async updateAuthCode(id, change) {
    const { next, result } = change(structuredClone(this.authCodes.get(id) || null));
    if (next === null) this.authCodes.delete(id);
    else if (next) this.authCodes.set(id, structuredClone(next));
    return result;
  }
  async deleteWorkspace(id) {
    const workspace = this.workspaces.get(id);
    for (const key of workspace?.keys || []) this.apiKeys.delete(key.hash);
    this.activity.delete(id);
    if (workspace) this.users.delete(workspace.ownerUid);
    this.workspaces.delete(id);
  }
  async getUser(uid) {
    return structuredClone(this.users.get(uid) || null);
  }
  async putUser(uid, data) {
    this.users.set(uid, structuredClone(data));
  }
  async ensureWorkspace(id, uid, name) {
    if (!this.workspaces.has(id)) this.workspaces.set(id, newWorkspace(id, uid, name));
    return this.getWorkspace(id);
  }
  async getWorkspace(id) {
    return structuredClone(this.workspaces.get(id) || null);
  }
  async listWorkspaces() {
    return structuredClone([...this.workspaces.values()]);
  }
  async transact(id, mutate) {
    const previous = this.locks.get(id) || Promise.resolve();
    let release;
    const next = new Promise((resolve) => {
      release = resolve;
    });
    this.locks.set(id, next);
    await previous;
    try {
      const w = await this.getWorkspace(id);
      if (!w) throw new ApiError(404, 'workspace_missing', 'Workspace not found.');
      const previousKeys = structuredClone(w.keys),
        result = await mutate(w);
      this.workspaces.set(id, w);
      for (const key of changedKeys(previousKeys, w.keys))
        this.apiKeys.set(key.hash, apiKeyRecord(id, key));
      for (const key of removedKeys(previousKeys, w.keys)) this.apiKeys.delete(key.hash);
      return result;
    } finally {
      release();
      if (this.locks.get(id) === next) this.locks.delete(id);
    }
  }
  async findKey(hash) {
    const record = this.apiKeys.get(hash);
    return record ? { ...structuredClone(record), id: record.keyId } : null;
  }
  async keyActivity(workspaceId) {
    return { ...this.activity.get(workspaceId) };
  }
  async recordApiUsage(event) {
    this.apiEvents.push(event);
  }
  async apiUsage(workspaceId, period) {
    const meters = this.apiEvents
      .filter((e) => e.workspaceId === workspaceId && e.period === period)
      .map((e) => {
        const counts = {
          contentRequests: e.requests,
          audioBytes: e.audioBytes,
          endpoints: { [e.endpoint]: e.requests },
        };
        return { ...counts, daily: { [e.at.toISOString().slice(0, 10)]: counts } };
      });
    return mergeUsage(...meters);
  }
  async touchKey(workspaceId, keyId, at) {
    this.activity.set(workspaceId, { ...this.activity.get(workspaceId), [keyId]: at });
  }
}
export class FirestoreStore {
  constructor(db) {
    this.db = db;
  }
  async updateAuthCode(id, change) {
    const ref = this.db.doc(`authCodes/${id}`);
    return this.db.runTransaction(async (transaction) => {
      const { next, result } = change((await transaction.get(ref)).data() || null);
      if (next === null) transaction.delete(ref);
      else if (next) transaction.set(ref, next);
      return result;
    });
  }
  // Keys go with the workspace, so the public API stops accepting them.
  async deleteWorkspace(id) {
    const workspace = await this.getWorkspace(id);
    if (!workspace) return;
    const usage = await this.db.collection('apiUsage').where('workspaceId', '==', id).get(),
      refs = [
        ...workspace.keys.map((key) => this.db.doc(`apiKeys/${key.hash}`)),
        ...usage.docs.map((doc) => doc.ref),
        this.db.doc(`apiKeyActivity/${id}`),
        this.db.doc(`consoleUsers/${workspace.ownerUid}`),
        this.db.doc(`workspaces/${id}`),
      ];
    for (let i = 0; i < refs.length; i += 400) {
      const batch = this.db.batch();
      refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }
  async getUser(uid) {
    return (await this.db.doc(`consoleUsers/${uid}`).get()).data() || null;
  }
  async putUser(uid, data) {
    await this.db.doc(`consoleUsers/${uid}`).set(data, { merge: true });
  }
  async ensureWorkspace(id, uid, name) {
    await this.db.runTransaction(async (t) => {
      const ref = this.db.doc(`workspaces/${id}`);
      if (!(await t.get(ref)).exists) t.create(ref, newWorkspace(id, uid, name));
    });
    return this.getWorkspace(id);
  }
  async getWorkspace(id) {
    return (await this.db.doc(`workspaces/${id}`).get()).data() || null;
  }
  async listWorkspaces() {
    return (await this.db.collection('workspaces').limit(100).get()).docs.map((d) => d.data());
  }
  async transact(id, mutate) {
    return this.db.runTransaction(async (transaction) => {
      const ref = this.db.doc(`workspaces/${id}`),
        snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new ApiError(404, 'workspace_missing', 'Workspace not found.');
      const workspace = snapshot.data(),
        previousKeys = structuredClone(workspace.keys),
        result = await mutate(workspace);
      transaction.set(ref, workspace);
      for (const key of changedKeys(previousKeys, workspace.keys))
        transaction.set(this.db.doc(`apiKeys/${key.hash}`), apiKeyRecord(id, key));
      for (const key of removedKeys(previousKeys, workspace.keys))
        transaction.delete(this.db.doc(`apiKeys/${key.hash}`));
      return result;
    });
  }
  async findKey(hash) {
    const record = (await this.db.doc(`apiKeys/${hash}`).get()).data();
    return record ? { ...record, id: record.keyId } : null;
  }
  recordApiUsage(event) {
    return new FirestoreUsageSink(this.db).add(event);
  }
  async apiUsage(workspaceId, period) {
    const snapshot = await this.db
      .collection('apiUsage')
      .where('workspaceId', '==', workspaceId)
      .where('period', '==', period)
      .get();
    return mergeUsage(...snapshot.docs.map((doc) => doc.data()));
  }
  // One small document per workspace, so the console reads every key's last use in one read.
  async keyActivity(workspaceId) {
    return (await this.db.doc(`apiKeyActivity/${workspaceId}`).get()).data() || {};
  }
  async touchKey(workspaceId, keyId, at) {
    await this.db.doc(`apiKeyActivity/${workspaceId}`).set({ [keyId]: at }, { merge: true });
  }
}
