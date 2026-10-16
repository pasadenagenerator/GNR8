import {
  type AstroCandidateObjectUpload,
  type AstroCandidateRouteObjectRef,
  type AstroCandidateStoredObjectRef,
  type AstroCandidateStylesObjectRef,
} from "./astro-production-candidate-object-record";
import { sha256Hex } from "../runtime/deterministic";
import { validateSelfContainedAstroProductionPayload } from "./astro-production-candidate-record";

export const ASTRO_CANDIDATE_OBJECT_BUCKET_ENV = "GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET" as const;

export type AstroCandidateObjectStoreErrorCode =
  | "configuration_invalid"
  | "unavailable"
  | "missing"
  | "integrity_mismatch";

export class AstroCandidateObjectStoreError extends Error {
  readonly code: AstroCandidateObjectStoreErrorCode;

  constructor(code: AstroCandidateObjectStoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroCandidateObjectStoreError";
    this.code = code;
  }
}

export interface AstroCandidateObjectStore {
  readonly bucket: string;
  putVerified(upload: AstroCandidateObjectUpload): Promise<void>;
  readVerified(ref: AstroCandidateStoredObjectRef): Promise<Uint8Array>;
}

export async function readVerifiedAstroCandidateSharedStyles(input: {
  objectStore: AstroCandidateObjectStore;
  ref: AstroCandidateStylesObjectRef;
}): Promise<string> {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await input.objectStore.readVerified(input.ref),
  );
}

export async function readVerifiedAstroCandidateRouteHtml(input: {
  objectStore: AstroCandidateObjectStore;
  ref: AstroCandidateRouteObjectRef;
  compiledTokenStyles: string;
}): Promise<string> {
  const html = new TextDecoder("utf-8", { fatal: true }).decode(
    await input.objectStore.readVerified(input.ref),
  );
  validateSelfContainedAstroProductionPayload({
    html,
    compiledTokenStyles: input.compiledTokenStyles,
  });
  return html;
}

type StorageDownloadResult = { data: Blob | null; error: unknown };
type StorageUploadResult = { data: unknown; error: unknown };
type StorageInfoResult = {
  data: { contentType?: string; metadata?: { mimetype?: string } } | null;
  error: unknown;
};
type StorageBucketClient = {
  upload(
    key: string,
    body: Uint8Array,
    options: { cacheControl: string; contentType: string; upsert: false },
  ): PromiseLike<StorageUploadResult>;
  download(key: string): PromiseLike<StorageDownloadResult>;
  info(key: string): PromiseLike<StorageInfoResult>;
};
type StorageClient = { storage: { from(bucket: string): StorageBucketClient } };

/**
 * Uses an already-provisioned private bucket. It never creates buckets, changes
 * policies, overwrites immutable objects, or deletes them. A retry after an
 * ambiguous upload verifies and reuses the existing content-addressed object.
 */
export class SupabaseAstroCandidateObjectStore implements AstroCandidateObjectStore {
  readonly bucket: string;

  constructor(input: {
    bucket?: string;
    getClient?: () => StorageClient | null;
  } = {}) {
    const configuredBucket = input.bucket ?? process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV];
    this.bucket = typeof configuredBucket === "string" ? configuredBucket : "";
    this.getClient = input.getClient ?? (() => null);
  }

  private readonly getClient: () => StorageClient | null;

  async putVerified(upload: AstroCandidateObjectUpload): Promise<void> {
    assertRefScope(upload.ref, validateBucket(this.bucket));
    verifyBytes(upload.bytes, upload.ref);
    const client = this.getClient();
    if (!client) throw storeError("unavailable", "Candidate object storage client is unavailable.");
    const bucket = client.storage.from(this.bucket);
    try {
      const result = await bucket.upload(upload.ref.key, upload.bytes, {
        cacheControl: "31536000, immutable",
        contentType: upload.ref.mediaType,
        upsert: false,
      });
      if (result.error != null) {
        await this.verifyExisting(bucket, upload.ref, result.error);
        return;
      }
      await this.verifyExisting(bucket, upload.ref);
    } catch (error) {
      if (error instanceof AstroCandidateObjectStoreError) throw error;
      await this.verifyExisting(bucket, upload.ref, error);
    }
  }

  async readVerified(ref: AstroCandidateStoredObjectRef): Promise<Uint8Array> {
    assertRefScope(ref, validateBucket(this.bucket));
    const client = this.getClient();
    if (!client) throw storeError("unavailable", "Candidate object storage client is unavailable.");
    return this.downloadAndVerify(client.storage.from(this.bucket), ref);
  }

  private async verifyExisting(
    bucket: StorageBucketClient,
    ref: AstroCandidateStoredObjectRef,
    cause?: unknown,
  ): Promise<void> {
    try {
      await this.downloadAndVerify(bucket, ref);
    } catch (error) {
      if (error instanceof AstroCandidateObjectStoreError && error.code === "integrity_mismatch") throw error;
      throw storeError("unavailable", "Candidate object upload could not be durably verified.", cause ?? error);
    }
  }

  private async downloadAndVerify(
    bucket: StorageBucketClient,
    ref: AstroCandidateStoredObjectRef,
  ): Promise<Uint8Array> {
    let result: StorageDownloadResult;
    try {
      result = await bucket.download(ref.key);
    } catch (error) {
      throw storeError("unavailable", "Candidate object download failed.", error);
    }
    if (result.error != null || !result.data) {
      throw storeError("missing", "Required immutable candidate object is missing.", result.error);
    }
    let info: StorageInfoResult;
    try {
      info = await bucket.info(ref.key);
    } catch (error) {
      throw storeError("unavailable", "Immutable candidate object metadata lookup failed.", error);
    }
    if (info.error != null || !info.data) {
      throw storeError("unavailable", "Immutable candidate object metadata is unavailable.", info.error);
    }
    const storedMediaType = info.data.contentType ?? info.data.metadata?.mimetype;
    if (
      storedMediaType?.split(";", 1)[0]?.trim().toLowerCase() !==
      ref.mediaType.split(";", 1)[0]?.trim().toLowerCase()
    ) {
      throw storeError("integrity_mismatch", "Immutable candidate object has an unexpected media type.");
    }
    const bytes = new Uint8Array(await result.data.arrayBuffer());
    verifyBytes(bytes, ref);
    return bytes;
  }
}

export class InMemoryAstroCandidateObjectStore implements AstroCandidateObjectStore {
  readonly bucket: string;
  private readonly objects = new Map<string, Uint8Array>();

  constructor(bucket = "astro-candidates-private") {
    this.bucket = validateBucket(bucket);
  }

  async putVerified(upload: AstroCandidateObjectUpload): Promise<void> {
    assertRefScope(upload.ref, this.bucket);
    verifyBytes(upload.bytes, upload.ref);
    const existing = this.objects.get(upload.ref.key);
    if (existing) {
      verifyBytes(existing, upload.ref);
      return;
    }
    this.objects.set(upload.ref.key, new Uint8Array(upload.bytes));
  }

  async readVerified(ref: AstroCandidateStoredObjectRef): Promise<Uint8Array> {
    assertRefScope(ref, this.bucket);
    const bytes = this.objects.get(ref.key);
    if (!bytes) throw storeError("missing", "Required immutable candidate object is missing.");
    verifyBytes(bytes, ref);
    return new Uint8Array(bytes);
  }

  removeForTest(key: string): void { this.objects.delete(key); }
  tamperForTest(key: string, bytes: Uint8Array): void { this.objects.set(key, new Uint8Array(bytes)); }
}

function verifyBytes(bytes: Uint8Array, ref: AstroCandidateStoredObjectRef): void {
  if (bytes.byteLength !== ref.sizeBytes || sha256Hex(bytes) !== ref.sha256) {
    throw storeError("integrity_mismatch", "Immutable candidate object failed size or hash verification.");
  }
}

function assertRefScope(ref: AstroCandidateStoredObjectRef, bucket: string): void {
  if (ref.bucket !== bucket) {
    throw storeError("configuration_invalid", "Candidate object reference targets an unexpected bucket.");
  }
}

function validateBucket(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 128 || value.trim() !== value || value.includes("/")) {
    throw storeError("configuration_invalid", `A private candidate object bucket must be configured with ${ASTRO_CANDIDATE_OBJECT_BUCKET_ENV}.`);
  }
  return value;
}

function storeError(code: AstroCandidateObjectStoreErrorCode, message: string, cause?: unknown) {
  return new AstroCandidateObjectStoreError(code, message, cause === undefined ? undefined : { cause });
}
