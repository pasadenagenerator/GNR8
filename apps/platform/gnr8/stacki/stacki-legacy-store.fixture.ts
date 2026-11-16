/** Frozen pre-deduplication store, LOCAL TEST/MEASUREMENT ONLY. Never application-wired. */
import {
  STACKI_CHECKPOINT_MAX_BYTES, STACKI_DRAFT_MAX_REVISIONS, StackiDraftError,
  createStackiRecord, parseStackiRecord, parseStackiScope,
  type StackiDraftRecord, type StackiDraftSave, type StackiDraftScope,
} from "./stacki-draft-contract";

export type StackiStorageClient = {
  storage: {
    getBucket(name: string): PromiseLike<{ data: { public: boolean } | null; error: unknown }>;
    from(name: string): {
      list(path: string, options: { limit: number; sortBy: { column: string; order: string } }):
        PromiseLike<{ data: { name: string }[] | null; error: unknown }>;
      upload(key: string, body: Uint8Array, options: { contentType: string; cacheControl: string; upsert: false }):
        PromiseLike<{ data: unknown; error: unknown }>;
      download(key: string): PromiseLike<{ data: Blob | null; error: unknown }>;
    };
  };
};

/**
 * Append-only checkpoints in an already-provisioned private bucket. The next
 * sequential key is a storage-level compare-and-set: upsert is always false.
 * No mutable "latest" pointer, new table, bucket creation, or delete operation.
 * Authorization must run before each method through the GNR8 route service.
 */
export class LegacyStackiDraftStore {
  constructor(private readonly client: StackiStorageClient, private readonly bucket: string) {}

  private async storage() {
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucket)) unavailable();
    const result = await this.client.storage.getBucket(this.bucket);
    if (result.error || !result.data || result.data.public !== false) unavailable();
    return this.client.storage.from(this.bucket);
  }

  async latest(scope: StackiDraftScope): Promise<StackiDraftRecord | null> {
    const bucket = await this.storage();
    const prefix = scopePrefix(scope);
    const result = await bucket.list(prefix, { limit: 1, sortBy: { column: "name", order: "desc" } });
    if (result.error || !Array.isArray(result.data)) unavailable();
    if (!result.data.length) return null;
    const name = result.data[0].name;
    if (!/^[0-9]{4}\.json$/.test(name)) unavailable();
    const revision = Number(name.slice(0, 4));
    if (revision < 1 || revision > STACKI_DRAFT_MAX_REVISIONS) unavailable();
    return this.read(bucket, scope, revision);
  }

  async save(scope: StackiDraftScope, actorUserId: string, save: StackiDraftSave): Promise<StackiDraftRecord> {
    const record = createStackiRecord(scope, actorUserId, save);
    const bucket = await this.storage();
    const current = await this.latest(scope);
    if ((current?.revision ?? 0) !== save.expectedRevision) {
      // An exact retry may acknowledge its previously committed checkpoint;
      // a different actor or payload can never overwrite that revision.
      if (current && current.revision >= record.revision) {
        const prior = await this.read(bucket, scope, record.revision);
        if (prior.sha256 === record.sha256) return prior;
      }
      throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
    }
    let uploadError: unknown;
    try {
      const result = await bucket.upload(recordKey(scope, record.revision),
        Buffer.from(JSON.stringify(record)), { contentType: "application/json", cacheControl: "0", upsert: false });
      uploadError = result.error;
    } catch (error) { uploadError = error; }
    // Readback is required even after success, and reconciles a lost response.
    let persisted: StackiDraftRecord;
    try { persisted = await this.read(bucket, scope, record.revision); }
    catch { throw new StackiDraftError(503, "STACKI_DRAFT_SAVE_UNCONFIRMED"); }
    if (persisted.sha256 !== record.sha256) {
      if (uploadError) throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
      throw new StackiDraftError(503, "STACKI_CHECKPOINT_INTEGRITY_FAILED");
    }
    return persisted;
  }

  private async read(bucket: ReturnType<StackiStorageClient["storage"]["from"]>, scope: StackiDraftScope, revision: number) {
    const result = await bucket.download(recordKey(scope, revision));
    if (result.error || !result.data || result.data.size > STACKI_CHECKPOINT_MAX_BYTES) unavailable();
    let input: unknown;
    try { input = JSON.parse(await result.data.text()); }
    catch { throw new StackiDraftError(503, "STACKI_CHECKPOINT_INTEGRITY_FAILED"); }
    return parseStackiRecord(input, scope, revision);
  }
}

function scopePrefix(scope: StackiDraftScope) {
  const s = parseStackiScope(scope);
  return `stacki-checkpoints/v1/${s.agencyId}/${s.clientId}/${s.siteId}/${s.siteVersionId}`;
}
function recordKey(scope: StackiDraftScope, revision: number) {
  return `${scopePrefix(scope)}/${String(revision).padStart(4, "0")}.json`;
}
function unavailable(): never { throw new StackiDraftError(503, "STACKI_DRAFT_STORAGE_UNAVAILABLE"); }
