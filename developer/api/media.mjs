// Short-lived signed links to private objects in the media bucket. The bucket itself stays
// private (public access prevention on); a leaked link stops working after `ttlSeconds`.
export class StorageMedia {
  constructor(bucket, { ttlSeconds = 900 } = {}) {
    this.bucket = bucket;
    this.ttlSeconds = ttlSeconds;
    this.metadata = new Map();
  }
  async describe(path) {
    if (!this.metadata.has(path)) {
      const lookup = this.bucket
        .file(path)
        .getMetadata()
        .then(([m]) => ({ bytes: Number(m.size), contentType: m.contentType || null }))
        .catch((error) => {
          this.metadata.delete(path);
          if (error.code === 404) return null;
          throw error;
        });
      this.metadata.set(path, lookup);
    }
    return this.metadata.get(path);
  }
  async sign(path) {
    const expires = Date.now() + this.ttlSeconds * 1000;
    const [url] = await this.bucket
      .file(path)
      .getSignedUrl({ version: 'v4', action: 'read', expires });
    return { url, expiresAt: new Date(expires).toISOString() };
  }
}

export class MemoryMedia {
  constructor(files, { ttlSeconds = 900 } = {}) {
    this.files = files;
    this.ttlSeconds = ttlSeconds;
  }
  async describe(path) {
    return this.files[path] || null;
  }
  async sign(path) {
    const expires = Date.now() + this.ttlSeconds * 1000;
    return {
      url: `https://media.test/${encodeURIComponent(path)}?expires=${expires}`,
      expiresAt: new Date(expires).toISOString(),
    };
  }
}
