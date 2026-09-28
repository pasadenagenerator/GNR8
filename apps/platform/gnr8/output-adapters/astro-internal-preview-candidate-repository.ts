import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { stableStringify } from "../runtime/deterministic";
import {
  isAstroInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";

export const ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION =
  "gnr8-astro-persisted-preview-candidate:v1" as const;
export const ASTRO_PERSISTED_CANDIDATE_RECORD_KIND =
  "astro_internal_preview_candidate_proof_record" as const;
export const ASTRO_PERSISTED_CANDIDATE_MAX_BYTES = 2 * 1024 * 1024;

const STORAGE_DIRECTORY = "astro-candidates-v1";
const IDENTITY_MAX_CHARACTERS = 512;

export type AstroCandidateRepositoryIdentity = {
  candidateId: string;
  siteId: string;
  siteVersionId: string;
};

export type PersistedAstroCandidateRecord = {
  schemaVersion: typeof ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION;
  recordKind: typeof ASTRO_PERSISTED_CANDIDATE_RECORD_KIND;
  identity: AstroCandidateRepositoryIdentity;
  storedAt: string;
  candidate: AstroInternalPreviewCandidate;
  storageSha256: string;
};

export type AstroCandidateCreateResult = {
  status: "created" | "idempotent";
  record: PersistedAstroCandidateRecord;
};

export interface AstroInternalPreviewCandidateRepository {
  create(candidate: AstroInternalPreviewCandidate): Promise<AstroCandidateCreateResult>;
  read(expected: AstroCandidateRepositoryIdentity): Promise<PersistedAstroCandidateRecord>;
}

export type AstroCandidateRepositoryErrorCode =
  | "identity_invalid"
  | "missing"
  | "conflicting_write"
  | "unsupported_version"
  | "corrupt"
  | "ownership_mismatch"
  | "record_too_large"
  | "storage_boundary_invalid";

export class AstroCandidateRepositoryError extends Error {
  readonly code: AstroCandidateRepositoryErrorCode;

  constructor(code: AstroCandidateRepositoryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroCandidateRepositoryError";
    this.code = code;
  }
}

export function astroCandidateStorageKey(candidateId: string): string {
  const normalized = validateIdentityPart(candidateId, "candidate ID");
  return createHash("sha256")
    .update(`${ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION}\0${normalized}`, "utf8")
    .digest("hex");
}

export function computePersistedAstroCandidateStorageSha256(
  record: Omit<PersistedAstroCandidateRecord, "storageSha256">,
): string {
  return createHash("sha256").update(stableStringify(record), "utf8").digest("hex");
}

export class LocalFilesystemAstroInternalPreviewCandidateRepository
  implements AstroInternalPreviewCandidateRepository
{
  readonly storageRoot: string;
  readonly maxRecordBytes: number;
  private readonly now: () => Date;
  private canonicalRoot: string | null = null;
  private rootIdentity: { dev: number; ino: number } | null = null;

  constructor(input: { storageRoot: string; maxRecordBytes?: number; now?: () => Date }) {
    if (!input.storageRoot) {
      throw new AstroCandidateRepositoryError("storage_boundary_invalid", "A local storage root is required.");
    }
    this.storageRoot = resolve(input.storageRoot);
    this.maxRecordBytes = Math.floor(input.maxRecordBytes ?? ASTRO_PERSISTED_CANDIDATE_MAX_BYTES);
    if (!Number.isSafeInteger(this.maxRecordBytes) || this.maxRecordBytes < 1_024) {
      throw new AstroCandidateRepositoryError("record_too_large", "The configured record-size bound is invalid.");
    }
    this.now = input.now ?? (() => new Date());
  }

  async create(candidate: AstroInternalPreviewCandidate): Promise<AstroCandidateCreateResult> {
    if (!isAstroInternalPreviewCandidate(candidate)) {
      throw new AstroCandidateRepositoryError("corrupt", "Candidate failed structural or content-integrity validation.");
    }
    const identity = validateIdentity({
      candidateId: candidate.id,
      siteId: candidate.siteId,
      siteVersionId: candidate.siteVersionId,
    });
    const directory = await this.ensureCandidateDirectory(identity.candidateId);
    const storedCandidate = asStoredCandidate(candidate);
    const unsignedRecord: Omit<PersistedAstroCandidateRecord, "storageSha256"> = {
      schemaVersion: ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION,
      recordKind: ASTRO_PERSISTED_CANDIDATE_RECORD_KIND,
      identity,
      storedAt: toIsoTimestamp(this.now(), "Repository clock returned an invalid timestamp."),
      candidate: storedCandidate,
    };
    const record: PersistedAstroCandidateRecord = {
      ...unsignedRecord,
      storageSha256: computePersistedAstroCandidateStorageSha256(unsignedRecord),
    };
    const bytes = Buffer.from(`${stableStringify(record)}\n`, "utf8");
    this.assertRecordSize(bytes.byteLength);

    const key = astroCandidateStorageKey(identity.candidateId);
    const recordPath = join(directory, `${key}.json`);
    const temporaryPath = join(directory, `.${key}.${process.pid}.${randomUUID()}.tmp`);
    let temporaryCreated = false;
    try {
      const handle = await open(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      temporaryCreated = true;
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await link(temporaryPath, recordPath);
        await syncDirectory(directory);
        return { status: "created", record: structuredClone(record) };
      } catch (error) {
        if (!isNodeError(error, "EEXIST")) throw error;
        let existing: PersistedAstroCandidateRecord;
        try {
          existing = await this.read(identity);
        } catch (readError) {
          if (readError instanceof AstroCandidateRepositoryError && readError.code === "ownership_mismatch") {
            throw new AstroCandidateRepositoryError(
              "conflicting_write",
              "An immutable record already exists for this candidate identity.",
            );
          }
          throw readError;
        }
        if (stableStringify(existing.candidate) === stableStringify(storedCandidate)) {
          return { status: "idempotent", record: existing };
        }
        throw new AstroCandidateRepositoryError(
          "conflicting_write",
          "An immutable record already exists for this candidate identity.",
        );
      }
    } finally {
      if (temporaryCreated) await unlink(temporaryPath).catch(() => undefined);
    }
  }

  async read(expectedInput: AstroCandidateRepositoryIdentity): Promise<PersistedAstroCandidateRecord> {
    const expected = validateIdentity(expectedInput);
    const directory = await this.ensureCandidateDirectory(expected.candidateId);
    const key = astroCandidateStorageKey(expected.candidateId);
    const recordPath = join(directory, `${key}.json`);
    const stat = await lstat(recordPath).catch((error: unknown) => {
      if (isNodeError(error, "ENOENT")) {
        throw new AstroCandidateRepositoryError("missing", "The requested candidate record does not exist.");
      }
      throw error;
    });
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new AstroCandidateRepositoryError(
        "storage_boundary_invalid",
        "The candidate record is not a regular file inside the storage boundary.",
      );
    }
    this.assertRecordSize(stat.size);
    const canonicalRoot = await this.assertRootBoundary();
    const canonicalRecord = await realpath(recordPath);
    if (canonicalRecord !== recordPath || !isInside(canonicalRoot, canonicalRecord)) {
      throw new AstroCandidateRepositoryError("storage_boundary_invalid", "The candidate record escapes storage.");
    }
    const bytes = await readFile(recordPath);
    this.assertRecordSize(bytes.byteLength);
    const record = parseRecord(bytes);
    if (
      record.identity.candidateId !== expected.candidateId ||
      record.identity.siteId !== expected.siteId ||
      record.identity.siteVersionId !== expected.siteVersionId
    ) {
      throw new AstroCandidateRepositoryError(
        "ownership_mismatch",
        "The candidate record ownership does not match the expected selection.",
      );
    }
    return record;
  }

  private async ensureCandidateDirectory(candidateId: string): Promise<string> {
    const canonicalRoot = await this.assertRootBoundary();
    const storageDirectory = join(canonicalRoot, STORAGE_DIRECTORY);
    await ensureRegularDirectory(canonicalRoot, storageDirectory);
    const key = astroCandidateStorageKey(candidateId);
    const prefixDirectory = join(storageDirectory, key.slice(0, 2));
    await ensureRegularDirectory(canonicalRoot, prefixDirectory);
    return prefixDirectory;
  }

  private async assertRootBoundary(): Promise<string> {
    await mkdir(this.storageRoot, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.storageRoot);
    const canonical = await realpath(this.storageRoot);
    if (stat.isSymbolicLink() || !stat.isDirectory() || canonical !== this.storageRoot) {
      throw new AstroCandidateRepositoryError(
        "storage_boundary_invalid",
        "The local storage root must be a canonical, non-symlink directory.",
      );
    }
    if (this.canonicalRoot === null) {
      this.canonicalRoot = canonical;
      this.rootIdentity = { dev: stat.dev, ino: stat.ino };
    } else if (
      canonical !== this.canonicalRoot ||
      !this.rootIdentity ||
      stat.dev !== this.rootIdentity.dev ||
      stat.ino !== this.rootIdentity.ino
    ) {
      throw new AstroCandidateRepositoryError("storage_boundary_invalid", "The local storage root changed during use.");
    }
    return canonical;
  }

  private assertRecordSize(bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > this.maxRecordBytes) {
      throw new AstroCandidateRepositoryError(
        "record_too_large",
        `Candidate record must be between 1 and ${this.maxRecordBytes} bytes.`,
      );
    }
  }
}

function asStoredCandidate(candidate: AstroInternalPreviewCandidate): AstroInternalPreviewCandidate {
  return {
    ...structuredClone(candidate),
    manifest: {
      ...structuredClone(candidate.manifest),
      lifecycle: {
        storage: "isolated_local_filesystem",
        lifetime: "proof_retained_until_explicit_cleanup",
        durableRegistration: false,
      },
    },
  };
}

function parseRecord(bytes: Buffer): PersistedAstroCandidateRecord {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new AstroCandidateRepositoryError("corrupt", "Candidate record is not valid JSON.", { cause: error });
  }
  if (isRecord(value) && typeof value.schemaVersion === "string" && value.schemaVersion !== ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION) {
    throw new AstroCandidateRepositoryError("unsupported_version", "Candidate record schema version is unsupported.");
  }
  if (!hasExactKeys(value, ["schemaVersion", "recordKind", "identity", "storedAt", "candidate", "storageSha256"])) {
    throw new AstroCandidateRepositoryError("corrupt", "Candidate record shape is invalid.");
  }
  if (
    value.schemaVersion !== ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION ||
    value.recordKind !== ASTRO_PERSISTED_CANDIDATE_RECORD_KIND ||
    !hasExactKeys(value.identity, ["candidateId", "siteId", "siteVersionId"]) ||
    !isIsoTimestamp(value.storedAt) ||
    !isSha256(value.storageSha256) ||
    !isAstroInternalPreviewCandidate(value.candidate)
  ) {
    throw new AstroCandidateRepositoryError("corrupt", "Candidate record failed structural validation.");
  }
  const identity = validateIdentity(value.identity as AstroCandidateRepositoryIdentity, "corrupt");
  const candidate = value.candidate;
  if (
    candidate.id !== identity.candidateId ||
    candidate.siteId !== identity.siteId ||
    candidate.siteVersionId !== identity.siteVersionId ||
    candidate.manifest.lifecycle.storage !== "isolated_local_filesystem" ||
    candidate.manifest.lifecycle.lifetime !== "proof_retained_until_explicit_cleanup"
  ) {
    throw new AstroCandidateRepositoryError("corrupt", "Candidate record identity or lifecycle is inconsistent.");
  }
  const unsignedRecord = {
    schemaVersion: value.schemaVersion,
    recordKind: value.recordKind,
    identity,
    storedAt: value.storedAt,
    candidate,
  };
  const expectedHash = computePersistedAstroCandidateStorageSha256(unsignedRecord);
  if (expectedHash !== value.storageSha256) {
    throw new AstroCandidateRepositoryError("corrupt", "Candidate record storage-integrity hash does not match.");
  }
  return structuredClone({ ...unsignedRecord, storageSha256: value.storageSha256 });
}

async function ensureRegularDirectory(root: string, path: string): Promise<void> {
  if (!isInside(root, path)) {
    throw new AstroCandidateRepositoryError("storage_boundary_invalid", "Storage directory escapes its root.");
  }
  await mkdir(path, { recursive: false, mode: 0o700 }).catch((error: unknown) => {
    if (!isNodeError(error, "EEXIST")) throw error;
  });
  const stat = await lstat(path);
  const canonical = await realpath(path);
  if (stat.isSymbolicLink() || !stat.isDirectory() || canonical !== path || !isInside(root, canonical)) {
    throw new AstroCandidateRepositoryError("storage_boundary_invalid", "Storage directory is not a canonical directory.");
  }
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function validateIdentity(
  identity: AstroCandidateRepositoryIdentity,
  errorCode: "identity_invalid" | "corrupt" = "identity_invalid",
): AstroCandidateRepositoryIdentity {
  if (!hasExactKeys(identity, ["candidateId", "siteId", "siteVersionId"])) {
    throw new AstroCandidateRepositoryError(errorCode, "Candidate repository identity is invalid.");
  }
  return {
    candidateId: validateIdentityPart(identity.candidateId, "candidate ID", errorCode),
    siteId: validateIdentityPart(identity.siteId, "site ID", errorCode),
    siteVersionId: validateIdentityPart(identity.siteVersionId, "site-version ID", errorCode),
  };
}

function validateIdentityPart(
  value: unknown,
  label: string,
  errorCode: "identity_invalid" | "corrupt" = "identity_invalid",
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    value.includes("\0") ||
    value.length > IDENTITY_MAX_CHARACTERS
  ) {
    throw new AstroCandidateRepositoryError(errorCode, `Candidate repository ${label} is invalid.`);
  }
  return value;
}

function toIsoTimestamp(value: Date, message: string): string {
  try {
    const timestamp = value.toISOString();
    if (!isIsoTimestamp(timestamp)) throw new Error("invalid_iso_timestamp");
    return timestamp;
  } catch (error) {
    throw new AstroCandidateRepositoryError("corrupt", message, { cause: error });
  }
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isInside(root: string, candidate: string): boolean {
  const relativePath = relative(resolve(root), resolve(candidate));
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
