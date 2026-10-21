import { createHash } from "node:crypto";
import {
  STACKI_CHECKPOINT_MAX_BYTES, STACKI_DRAFT_MAX_REVISIONS, StackiDraftError,
  createStackiRecord, parseStackiRecord, parseStackiScope, createStackiManifest, parseStackiManifest,
  type StackiDraftManifest, type StackiDraftRecord, type StackiDraftSave, type StackiDraftScope,
} from "./stacki-draft-contract";

type StorageEntry = { name: string; metadata?: { size?: number; eTag?: string } | null };
export type StackiStorageClient = {
  storage: {
    getBucket(name: string): PromiseLike<{ data: { public: boolean } | null; error: unknown }>;
    from(name: string): {
      list(path: string, options: { limit: number; offset?: number; sortBy: { column: string; order: string } }):
        PromiseLike<{ data: StorageEntry[] | null; error: unknown }>;
      upload(key: string, body: Uint8Array, options: { contentType: string; cacheControl: string; upsert: false }):
        PromiseLike<{ data: unknown; error: unknown }>;
      download(key: string): PromiseLike<{ data: Blob | null; error: unknown }>;
    };
  };
};
type Bucket = ReturnType<StackiStorageClient["storage"]["from"]>;
type Stored = StackiDraftManifest | StackiDraftRecord;
const options = { contentType: "application/json", cacheControl: "0", upsert: false as const };

/**
 * SAME append-only sequential keys for legacy checkpoints and v2 manifests.
 * upsert:false is the sole revision CAS, including racing old deployments.
 * Old readers reject v2, so rollback must retain this dual reader or disable
 * editing. Never create a parallel revision namespace or delete a manifest.
 * Authorization runs before each public method through the existing routes.
 */
export class SupabaseStackiDraftStore {
  constructor(private readonly client: StackiStorageClient, private readonly bucket: string) {}

  private async storage() {
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(this.bucket)) unavailable();
    const result = await this.client.storage.getBucket(this.bucket);
    if (result.error || !result.data || result.data.public !== false) unavailable();
    return this.client.storage.from(this.bucket);
  }

  private async head(bucket: Bucket, scope: StackiDraftScope): Promise<Stored | null> {
    const result = await bucket.list(scopePrefix(scope), { limit: 1, sortBy: { column: "name", order: "desc" } });
    if (result.error || !Array.isArray(result.data)) unavailable();
    if (!result.data.length) return null;
    const name = result.data[0].name;
    if (!/^[0-9]{4}\.json$/.test(name)) unavailable();
    return this.readStored(bucket, scope, Number(name.slice(0, 4)));
  }

  async latest(scope: StackiDraftScope): Promise<StackiDraftRecord | null> {
    const bucket = await this.storage(), head = await this.head(bucket, scope);
    return head ? this.restore(bucket, head) : null;
  }

  /** Internal historical recovery; callers must authorize the same complete scope. */
  async revision(scope: StackiDraftScope, revision: number): Promise<StackiDraftRecord> {
    const bucket = await this.storage();
    return this.restore(bucket, await this.readStored(bucket, scope, revision));
  }

  async save(scope: StackiDraftScope, actorUserId: string, save: StackiDraftSave,
    confirmAccess?: () => Promise<void>): Promise<StackiDraftRecord> {
    const record = createStackiRecord(scope, actorUserId, save), manifest = createStackiManifest(record);
    const bucket = await this.storage(), current = await this.head(bucket, scope);
    if ((current?.revision ?? 0) !== save.expectedRevision) {
      if (current && current.revision >= record.revision) {
        const prior = current.revision === record.revision ? current : await this.readStored(bucket, scope, record.revision);
        if (checkpointHash(prior) === record.sha256) {
          if (prior.format === "gnr8-stacki-checkpoint:v1") { await confirmAccess?.(); return prior; }
          if (prior.sha256 !== manifest.sha256) integrity();
          await this.ensureObjects(bucket, manifest, record, prior, false);
          await confirmAccess?.();
          return record;
        }
      }
      throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
    }
    await this.ensureObjects(bucket, manifest, record, current, true);
    // Object transfer can outlive a membership change. Reauthorize immediately
    // before the authoritative write, and again before acknowledging durability.
    await confirmAccess?.();
    let uploadError: unknown;
    try {
      const result = await bucket.upload(recordKey(scope, record.revision), Buffer.from(JSON.stringify(manifest)), options);
      uploadError = result.error;
    } catch (error) { uploadError = error; }
    // Commit readback reconciles lost responses and the old/new writer race.
    let persisted: Stored;
    try { persisted = await this.readStored(bucket, scope, record.revision); }
    catch { throw new StackiDraftError(503, "STACKI_DRAFT_SAVE_UNCONFIRMED"); }
    if (checkpointHash(persisted) !== record.sha256) {
      if (uploadError) throw new StackiDraftError(409, "STACKI_DRAFT_CONFLICT");
      integrity();
    }
    if (persisted.format === "gnr8-stacki-manifest:v2" && persisted.sha256 !== manifest.sha256) integrity();
    await confirmAccess?.();
    return record;
  }

  private async ensureObjects(bucket: Bucket, manifest: StackiDraftManifest, record: StackiDraftRecord,
    current: Stored | null, allowUpload: boolean) {
    const inventory = await this.inventory(bucket, record.scope);
    const trusted = new Set(current?.format === "gnr8-stacki-manifest:v2" ? current.files.map(f => f.sha256) : []);
    const unique = new Map(manifest.files.map((file, i) => [file.sha256, { file, payload: record.files[i] }]));
    let verifiedNewObjects = false;
    await bounded([...unique.values()], async ({ file, payload }) => {
      const bytes = Buffer.from(payload.base64, "base64"), existing = inventory.get(file.sha256);
      if (existing && trusted.has(file.sha256)) {
        // A scoped, verified immutable reference + provider checksum/size. ETag
        // is only a change detector, never the content address or recovery hash.
        // Unsupported/missing metadata fails closed; no full-asset fallback.
        verifyMetadata(existing, bytes);
        return;
      }
      if (!existing && trusted.has(file.sha256)) integrity();
      if (!allowUpload) integrity();
      verifiedNewObjects = true;
      const key = objectKey(record.scope, file.sha256);
      if (!existing) {
        try { await bucket.upload(key, bytes, { ...options, contentType: "application/octet-stream" }); }
        catch { /* reconcile a lost response using exact SHA-256 readback */ }
      }
      // Also verifies interrupted-save orphans and objects from older revisions
      // before reuse. Never trust mere existence or an in-memory cache.
      try { await this.readObject(bucket, record.scope, file); }
      catch { throw new StackiDraftError(503, "STACKI_DRAFT_SAVE_UNCONFIRMED"); }
    });
    if (verifiedNewObjects) {
      // Establish the provider's reuse contract BEFORE the first v2 commit.
      // An incompatible/missing ETag leaves only orphans, never a manifest that
      // a subsequent save cannot safely reuse (and never disables legacy reads).
      const durable = await this.inventory(bucket, record.scope);
      for (const { file, payload } of unique.values())
        verifyMetadata(durable.get(file.sha256), Buffer.from(payload.base64, "base64"));
    }
  }

  private async inventory(bucket: Bucket, scope: StackiDraftScope) {
    const found = new Map<string, StorageEntry>();
    // Bound metadata work even if interrupted operations leave many orphans.
    // Concurrent insertion may cause a skipped entry; upload CAS + SHA readback
    // reconciles that miss without overwriting or acknowledging incomplete data.
    for (let offset = 0; offset < 17_000; offset += 1000) {
      const result = await bucket.list(objectPrefix(scope), { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (result.error || !Array.isArray(result.data)) unavailable();
      for (const item of result.data) {
        if (!/^[a-f0-9]{64}$/.test(item.name)) integrity();
        found.set(item.name, item);
      }
      if (result.data.length < 1000) return found;
    }
    unavailable();
  }

  private async readObject(bucket: Bucket, scope: StackiDraftScope, file: StackiDraftManifest["files"][number]) {
    const result = await bucket.download(objectKey(scope, file.sha256));
    if (result.error || !result.data || result.data.size !== file.bytes) integrity();
    const bytes = Buffer.from(await result.data.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) integrity();
    return bytes;
  }

  private async restore(bucket: Bucket, stored: Stored): Promise<StackiDraftRecord> {
    if (stored.format === "gnr8-stacki-checkpoint:v1") return stored;
    const objects = new Map<string, Buffer>();
    await bounded([...new Map(stored.files.map(f => [f.sha256, f])).values()], async file => {
      objects.set(file.sha256, await this.readObject(bucket, stored.scope, file));
    });
    const record = createStackiRecord(stored.scope, stored.actorUserId, { expectedRevision: stored.revision - 1,
      files: stored.files.map(file => ({ path: file.path, base64: objects.get(file.sha256)!.toString("base64") })) });
    if (record.sha256 !== stored.checkpointSha256) integrity();
    return record;
  }

  private async readStored(bucket: Bucket, scope: StackiDraftScope, revision: number): Promise<Stored> {
    if (!Number.isInteger(revision) || revision < 1 || revision > STACKI_DRAFT_MAX_REVISIONS) unavailable();
    const result = await bucket.download(recordKey(scope, revision));
    if (result.error || !result.data || result.data.size > STACKI_CHECKPOINT_MAX_BYTES) unavailable();
    let input: unknown;
    try { input = JSON.parse(await result.data.text()); } catch { integrity(); }
    return (input as { format?: string })?.format === "gnr8-stacki-manifest:v2" ?
      parseStackiManifest(input, scope, revision) : parseStackiRecord(input, scope, revision);
  }
}

async function bounded<T>(items: T[], run: (item: T) => Promise<void>) {
  let next = 0;
  // Await every worker even on failure: no background writes after method exit.
  const results = await Promise.allSettled(Array.from({ length: Math.min(6, items.length) }, async () => {
    while (next < items.length) await run(items[next++]);
  }));
  for (const result of results) if (result.status === "rejected") throw result.reason;
}
function checkpointHash(record: Stored) {
  return record.format === "gnr8-stacki-manifest:v2" ? record.checkpointSha256 : record.sha256;
}
function scopeIdentity(scope: StackiDraftScope) {
  const s = parseStackiScope(scope);
  return `${s.agencyId}/${s.clientId}/${s.siteId}/${s.siteVersionId}`;
}
function scopePrefix(scope: StackiDraftScope) { return `stacki-checkpoints/v1/${scopeIdentity(scope)}`; }
function recordKey(scope: StackiDraftScope, revision: number) { return `${scopePrefix(scope)}/${String(revision).padStart(4, "0")}.json`; }
function objectPrefix(scope: StackiDraftScope) { return `stacki-file-objects/v1/${scopeIdentity(scope)}`; }
function objectKey(scope: StackiDraftScope, hash: string) { return `${objectPrefix(scope)}/${hash}`; }
function verifyMetadata(entry: StorageEntry | undefined, bytes: Buffer) {
  const etag = entry?.metadata?.eTag;
  if (entry?.metadata?.size !== bytes.length || typeof etag !== "string" ||
    etag.replace(/^"|"$/g, "") !== createHash("md5").update(bytes).digest("hex")) integrity();
}
function unavailable(): never { throw new StackiDraftError(503, "STACKI_DRAFT_STORAGE_UNAVAILABLE"); }
function integrity(): never { throw new StackiDraftError(503, "STACKI_CHECKPOINT_INTEGRITY_FAILED"); }
