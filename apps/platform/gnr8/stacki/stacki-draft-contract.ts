import { createHash } from "node:crypto";
import { isCanonicalUuid } from "../output-adapters/astro-production-candidate-record";

// Runtime capture goes directly to private storage; browser requests stay small.
export const STACKI_REQUEST_MAX_BYTES = 3 * 1024 * 1024;
export const STACKI_CHECKPOINT_MAX_BYTES = 12 * 1024 * 1024;
export const STACKI_PROJECT_MAX_BYTES = 8 * 1024 * 1024;
export const STACKI_FILE_MAX_BYTES = 1024 * 1024;
export const STACKI_DRAFT_MAX_REVISIONS = 64;
const MAX_FILE_BYTES = STACKI_FILE_MAX_BYTES;
const MAX_TOTAL_BYTES = STACKI_PROJECT_MAX_BYTES;

export type StackiDraftScope = { agencyId: string; clientId: string; siteId: string; siteVersionId: string };
export type StackiDraftFile = { path: string; base64: string };
export type StackiDraftSave = { expectedRevision: number; files: StackiDraftFile[] };
export type StackiDraftRecord = {
  format: "gnr8-stacki-checkpoint:v1";
  scope: StackiDraftScope;
  revision: number;
  actorUserId: string;
  files: StackiDraftFile[];
  sha256: string;
};

/** Storage-only format. Public callers still receive the complete v1 record. */
export type StackiDraftManifest = {
  format: "gnr8-stacki-manifest:v2";
  scope: StackiDraftScope;
  revision: number;
  actorUserId: string;
  files: { path: string; sha256: string; bytes: number }[];
  checkpointSha256: string;
  sha256: string;
};

export function createStackiManifest(record: StackiDraftRecord): StackiDraftManifest {
  const body = { format: "gnr8-stacki-manifest:v2" as const, scope: record.scope,
    revision: record.revision, actorUserId: record.actorUserId,
    files: record.files.map(file => {
      const bytes = Buffer.from(file.base64, "base64");
      return { path: file.path, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
    }), checkpointSha256: record.sha256 };
  return { ...body, sha256: hash(body) };
}

export function parseStackiManifest(input: unknown, scope: StackiDraftScope, revision: number): StackiDraftManifest {
  try {
    const row = object(input, ["format", "scope", "revision", "actorUserId", "files", "checkpointSha256", "sha256"]);
    if (row.format !== "gnr8-stacki-manifest:v2" || row.revision !== revision ||
      JSON.stringify(parseStackiScope(row.scope)) !== JSON.stringify(parseStackiScope(scope)) ||
      !isCanonicalUuid(row.actorUserId) || !Array.isArray(row.files) ||
      typeof row.checkpointSha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.checkpointSha256)) invalid();
    let total = 0;
    const files = row.files.map(value => {
      const file = object(value, ["path", "sha256", "bytes"]);
      if (typeof file.path !== "string" || typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256) ||
        !Number.isSafeInteger(file.bytes) || Number(file.bytes) < 0 || Number(file.bytes) > MAX_FILE_BYTES) invalid();
      total += Number(file.bytes);
      return { path: file.path, sha256: file.sha256, bytes: Number(file.bytes) };
    });
    // Reuse the exact public path/required-file/revision rules without allocating payloads.
    const paths = parseStackiSave({ expectedRevision: revision - 1, files: files.map(f => ({ path: f.path, base64: "" })) }).files;
    if (total > MAX_TOTAL_BYTES || paths.some((f, i) => f.path !== files[i].path)) invalid();
    const body = { format: "gnr8-stacki-manifest:v2" as const, scope: parseStackiScope(scope), revision,
      actorUserId: String(row.actorUserId), files, checkpointSha256: row.checkpointSha256 };
    if (hash(body) !== row.sha256) invalid();
    return { ...body, sha256: String(row.sha256) };
  } catch { throw new StackiDraftError(503, "STACKI_CHECKPOINT_INTEGRITY_FAILED"); }
}

export class StackiDraftError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

export function parseStackiScope(input: unknown): StackiDraftScope {
  const row = object(input, ["agencyId", "clientId", "siteId", "siteVersionId"]);
  for (const value of Object.values(row)) if (!isCanonicalUuid(value)) invalid();
  return { agencyId: String(row.agencyId), clientId: String(row.clientId),
    siteId: String(row.siteId), siteVersionId: String(row.siteVersionId) };
}

export function parseStackiSave(input: unknown): StackiDraftSave {
  const row = object(input, ["expectedRevision", "files"]);
  if (!Number.isSafeInteger(row.expectedRevision) || Number(row.expectedRevision) < 0 ||
    Number(row.expectedRevision) >= STACKI_DRAFT_MAX_REVISIONS) invalid();
  return { expectedRevision: Number(row.expectedRevision), files: parseFiles(row.files) };
}

function parseFiles(input: unknown): StackiDraftFile[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 256) invalid();
  const paths = new Set<string>();
  let total = 0;
  const files = input.map(value => {
    const file = object(value, ["path", "base64"]);
    if (typeof file.path !== "string" || !validPath(file.path) ||
      typeof file.base64 !== "string" || file.base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4) invalid();
    const bytes = Buffer.from(file.base64, "base64");
    if (bytes.toString("base64") !== file.base64 || bytes.length > MAX_FILE_BYTES) invalid();
    total += bytes.length;
    if (total > MAX_TOTAL_BYTES) throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
    const key = file.path.normalize("NFC").toLowerCase();
    if (paths.has(key)) invalid();
    paths.add(key);
    return { path: file.path, base64: file.base64 };
  });
  for (const path of paths) {
    const parts = path.split("/");
    for (let n = 1; n < parts.length; n++) if (paths.has(parts.slice(0, n).join("/"))) invalid();
  }
  if (!paths.has("package.json") || !paths.has("astro.config.mjs") || !paths.has("src/pages/index.astro")) invalid();
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function validPath(path: string) {
  if (path.length > 240 || !/^[a-zA-Z0-9_./@+-]+$/.test(path)) return false;
  const parts = path.split("/");
  if (parts.some(part => !part || part === "." || part === ".." ||
    ["node_modules", ".git"].includes(part.toLowerCase()) ||
    (part.startsWith(".") && part !== ".studio-state"))) return false;
  if (path.startsWith("src/") || path.startsWith("public/")) return !parts.includes(".studio-state");
  if (["package.json", "package-lock.json", "astro.config.mjs"].includes(path)) return true;
  return /^\.studio-state\/(?:[A-Za-z0-9_-]+\.bin|(?:project|github-base|asset-state|cms-deleted)\.json|component-preview\.astro|uploads\/[A-Za-z0-9_-]+\.bin)$/.test(path);
}

export function createStackiRecord(scope: StackiDraftScope, actorUserId: string, save: StackiDraftSave): StackiDraftRecord {
  if (!isCanonicalUuid(actorUserId)) throw new StackiDraftError(403, "STACKI_ACTOR_INVALID");
  const checked = parseStackiSave(save);
  const body = { format: "gnr8-stacki-checkpoint:v1" as const, scope: parseStackiScope(scope),
    revision: checked.expectedRevision + 1, actorUserId, files: checked.files };
  const record = { ...body, sha256: hash(body) };
  if (Buffer.byteLength(JSON.stringify(record)) > STACKI_CHECKPOINT_MAX_BYTES)
    throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
  return record;
}

export function parseStackiRecord(input: unknown, scope: StackiDraftScope, revision: number): StackiDraftRecord {
  try {
    const row = object(input, ["format", "scope", "revision", "actorUserId", "files", "sha256"]);
    if (row.format !== "gnr8-stacki-checkpoint:v1" || row.revision !== revision ||
      JSON.stringify(parseStackiScope(row.scope)) !== JSON.stringify(parseStackiScope(scope)) ||
      typeof row.actorUserId !== "string") invalid();
    const record = createStackiRecord(scope, row.actorUserId, { expectedRevision: revision - 1, files: parseFiles(row.files) });
    if (record.sha256 !== row.sha256) invalid();
    return record;
  } catch {
    throw new StackiDraftError(503, "STACKI_CHECKPOINT_INTEGRITY_FAILED");
  }
}

function hash(input: unknown) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
function invalid(): never { throw new StackiDraftError(422, "STACKI_CHECKPOINT_INVALID"); }
function object(input: unknown, keys: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const row = input as Record<string, unknown>;
  if (Object.keys(row).length !== keys.length || keys.some(key => !Object.hasOwn(row, key))) invalid();
  return row;
}
