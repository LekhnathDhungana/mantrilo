import { ApiError, newWorkspace, apiKeyRecord, changedKeys } from './domain.mjs';
export class MemoryStore {
  constructor() {
    this.workspaces = new Map();
    this.users = new Map();
    this.apiKeys = new Map();
    this.locks = new Map();
    this.config = {
      credits: { starter: 2000, growth: 10000, business: 40000 },
      costsConfirmed: false,
      billingConfigured: false,
    };
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
  async getConfig() {
    return structuredClone(this.config);
  }
  async updateConfig(config) {
    this.config = structuredClone(config);
  }
}
export class FirestoreStore {
  constructor(db) {
    this.db = db;
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
      return result;
    });
  }
  async findKey(hash) {
    const record = (await this.db.doc(`apiKeys/${hash}`).get()).data();
    return record ? { ...record, id: record.keyId } : null;
  }
  async getConfig() {
    return (
      (await this.db.doc('consoleConfig/astrology').get()).data() || {
        credits: { starter: 2000, growth: 10000, business: 40000 },
        costsConfirmed: false,
        billingConfigured: false,
      }
    );
  }
  async updateConfig(config) {
    await this.db.doc('consoleConfig/astrology').set(config);
  }
}
