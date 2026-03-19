import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { parse, serialize } from "parse5";

import type { ExecutionMode } from "./execution-plan-model";
import type { ExecutionMaterialization, ExecutionMaterializationStatus } from "./execution-result-model";

export const TEMP_PREVIEW_ROUTE_RULE = "validation_previews_by_output_key_v1" as const;
export const PREVIEW_PERSISTENT_STORAGE_ROOT_PREFIX = "phase1-materialized-previews/v1" as const;

const PREVIEW_KEY_PREFIX_PERSISTENT_SUPABASE = "ps1";
const PREVIEW_KEY_PREFIX_PERSISTENT_FILESYSTEM = "pf1";
const PREVIEW_KEY_PREFIX_LOCAL_FILESYSTEM = "lf1";

export type ExecutionPreviewHostingStatus =
  | "available"
  | "available_local_fallback"
  | "not_available_simulation_mode"
  | "not_available_materialization_not_ready"
  | "not_available_missing_output_root"
  | "not_available_unsupported_output_root"
  | "not_available_persistent_storage_unavailable";

export type ExecutionPreviewStorageKind = "none" | "local_filesystem_bundle" | "filesystem_object_storage" | "supabase_storage";

export type ExecutionPreviewHosting = {
  status: ExecutionPreviewHostingStatus;
  available: boolean;
  routeRule: typeof TEMP_PREVIEW_ROUTE_RULE;
  previewRootUrl: string | null;
  previewEntryUrl: string | null;
  previewKey: string | null;
  previewStorageKind: ExecutionPreviewStorageKind;
  previewStorageKey: string | null;
  reasonCode: string | null;
};

export type PreviewBundleResolveFailureCode =
  | "INVALID_PREVIEW_KEY"
  | "UNSUPPORTED_OUTPUT_ROOT"
  | "INVALID_PREVIEW_PATH"
  | "MISSING_BUNDLE_ROOT";

export type PreviewBundleResolveResult =
  | {
      ok: true;
      relativePath: string;
      source:
        | {
            kind: "persistent";
            storageKind: Extract<ExecutionPreviewStorageKind, "filesystem_object_storage" | "supabase_storage">;
            storageRootKey: string;
          }
        | {
            kind: "filesystem_bundle";
            outputRootPath: string;
            absolutePath: string;
          };
    }
  | {
      ok: false;
      code: PreviewBundleResolveFailureCode;
      message: string;
    };

export type PreviewBundleReadResult =
  | {
      ok: true;
      bytes: Buffer;
      contentType: string;
    }
  | {
      ok: false;
      code: "MISSING_BUNDLE_ROOT" | "MISSING_EXPORTED_FILE" | "PREVIEW_READ_FAILED";
      message: string;
    };

type PersistentPublishResult =
  | {
      ok: true;
      storageKind: Extract<ExecutionPreviewStorageKind, "filesystem_object_storage" | "supabase_storage">;
      storageRootKey: string;
      previewKey: string;
    }
  | {
      ok: false;
      reasonCode: "PERSISTENT_STORAGE_NOT_CONFIGURED" | "PERSISTENT_STORAGE_UPLOAD_FAILED";
    };

type SupabasePreviewStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

function isMaterializationReady(status: ExecutionMaterializationStatus): boolean {
  return status === "materialized" || status === "materialized_with_warnings";
}

function normalizeOutputRootPath(outputRootPath: string): string {
  return path.resolve(outputRootPath);
}

export function isSupportedPreviewOutputRoot(outputRootPath: string): boolean {
  const normalized = normalizeOutputRootPath(outputRootPath);
  const marker = `${path.sep}.gnr8-static-output${path.sep}`;
  return normalized.includes(marker);
}

function encodePreviewOutputRootKey(outputRootPath: string): string {
  return `${PREVIEW_KEY_PREFIX_LOCAL_FILESYSTEM}.${Buffer.from(normalizeOutputRootPath(outputRootPath), "utf8").toString("base64url")}`;
}

function decodePreviewOutputRootKey(previewKey: string): string | null {
  try {
    const token = previewKey.startsWith(`${PREVIEW_KEY_PREFIX_LOCAL_FILESYSTEM}.`) ? previewKey.slice(4) : previewKey;
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    if (!decoded.trim()) return null;
    return normalizeOutputRootPath(decoded);
  } catch {
    return null;
  }
}

function encodePersistentPreviewKey(input: {
  storageKind: Extract<ExecutionPreviewStorageKind, "filesystem_object_storage" | "supabase_storage">;
  storageRootKey: string;
}): string {
  const prefix = input.storageKind === "supabase_storage" ? PREVIEW_KEY_PREFIX_PERSISTENT_SUPABASE : PREVIEW_KEY_PREFIX_PERSISTENT_FILESYSTEM;
  const token = Buffer.from(input.storageRootKey, "utf8").toString("base64url");
  return `${prefix}.${token}`;
}

function decodePersistentPreviewKey(previewKey: string): {
  storageKind: Extract<ExecutionPreviewStorageKind, "filesystem_object_storage" | "supabase_storage">;
  storageRootKey: string;
} | null {
  const idx = previewKey.indexOf(".");
  if (idx <= 0) return null;

  const prefix = previewKey.slice(0, idx);
  const token = previewKey.slice(idx + 1);
  const storageKind =
    prefix === PREVIEW_KEY_PREFIX_PERSISTENT_SUPABASE
      ? ("supabase_storage" as const)
      : prefix === PREVIEW_KEY_PREFIX_PERSISTENT_FILESYSTEM
        ? ("filesystem_object_storage" as const)
        : null;
  if (!storageKind) return null;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8").trim();
    if (!decoded) return null;
    const normalized = path.posix.normalize(decoded).replace(/^\/+/, "");
    if (normalized !== decoded || normalized === "." || normalized.startsWith("..")) return null;
    return { storageKind, storageRootKey: normalized };
  } catch {
    return null;
  }
}

function normalizePreviewPath(previewPath: string[] | undefined): { ok: true; relativePath: string } | { ok: false } {
  const rawPath = (previewPath ?? []).join("/");
  const normalizedRelativePath = path.posix.normalize(rawPath).replace(/^\/+/, "");
  const relativePath = normalizedRelativePath === "" || normalizedRelativePath === "." ? "index.html" : normalizedRelativePath;
  if (relativePath === ".." || relativePath.startsWith("../")) return { ok: false };
  return { ok: true, relativePath };
}

function isHostedRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function isLocalFallbackAllowed(): boolean {
  const explicit = (process.env.GNR8_PREVIEW_ALLOW_LOCAL_FALLBACK ?? "").trim().toLowerCase();
  if (explicit === "1" || explicit === "true") return true;
  if (explicit === "0" || explicit === "false") return false;
  return !isHostedRuntime();
}

function previewRootKeyForExecutionPlan(executionPlanId: string): string {
  return `${PREVIEW_PERSISTENT_STORAGE_ROOT_PREFIX}/${executionPlanId}`;
}

function contentTypeForExt(ext: string): string {
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export function contentTypeForPreviewPath(relativePath: string): string {
  return contentTypeForExt(path.extname(relativePath).toLowerCase());
}

type HtmlElementNode = {
  tagName: string;
  attrs?: { name?: string; value?: string }[];
  childNodes?: unknown[];
  content?: unknown;
};

function isElement(node: unknown): node is HtmlElementNode {
  return !!node && typeof node === "object" && typeof (node as { tagName?: unknown }).tagName === "string";
}

function walkDom(node: unknown, visit: (n: unknown) => void): void {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    visit(current);
    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    }
    const content = (current as { content?: unknown }).content;
    if (content && typeof content === "object") stack.push(content);
  }
}

function getAttrValue(node: HtmlElementNode, attrName: string): string | null {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const lower = attrName.toLowerCase();
  for (const attr of attrs) {
    if (String(attr.name ?? "").toLowerCase() === lower) return String(attr.value ?? "");
  }
  return null;
}

function setAttrValue(node: HtmlElementNode, attrName: string, value: string): void {
  const lower = attrName.toLowerCase();
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  for (const attr of attrs) {
    if (String(attr.name ?? "").toLowerCase() === lower) {
      attr.value = value;
      return;
    }
  }
  attrs.push({ name: attrName, value });
  node.attrs = attrs;
}

function isStylesheetRel(relAttr: string | null): boolean {
  if (!relAttr) return false;
  const tokens = relAttr
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.includes("stylesheet");
}

function toExplicitPageRelativeRef(ref: string): string {
  if (ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("/")) return ref;
  return `./${ref}`;
}

function maybeNormalizePersistedHtml(input: { relativePath: string; bytes: Buffer; bundleRelativePaths: Set<string> }): Buffer {
  const lowerExt = path.posix.extname(input.relativePath.toLowerCase());
  if (lowerExt !== ".html" && lowerExt !== ".htm") return input.bytes;

  let html = "";
  try {
    html = input.bytes.toString("utf8");
  } catch {
    return input.bytes;
  }
  if (!html.includes('href="/')) return input.bytes;

  const doc = parse(html);
  const pageDir = path.posix.dirname(input.relativePath);
  let changed = false;

  walkDom(doc, (node) => {
    if (!isElement(node)) return;
    if (node.tagName.toLowerCase() !== "link") return;
    if (!isStylesheetRel(getAttrValue(node, "rel"))) return;

    const href = getAttrValue(node, "href");
    if (!href) return;
    const trimmedHref = href.trim();
    if (!trimmedHref.startsWith("/")) return;
    if (trimmedHref.startsWith("//")) return;

    const [pathPart, suffix = ""] = trimmedHref.split(/([?#].*)/, 2);
    const targetRel = pathPart.replace(/^\/+/, "");
    if (!targetRel) return;
    if (!input.bundleRelativePaths.has(targetRel)) return;

    const relative = path.posix.relative(pageDir === "." ? "" : pageDir, targetRel);
    const rewritten = toExplicitPageRelativeRef(relative.length > 0 ? relative : path.posix.basename(targetRel));
    if (rewritten === trimmedHref) return;
    setAttrValue(node, "href", `${rewritten}${suffix}`);
    changed = true;
  });

  if (!changed) return input.bytes;
  return Buffer.from(serialize(doc), "utf8");
}

async function listBundleFilesRecursively(outputRootPath: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [outputRootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const abs = path.resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        out.push(abs);
      }
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function getSupabasePreviewStorageConfig(): SupabasePreviewStorageConfig | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const bucket = (process.env.GNR8_PREVIEW_SUPABASE_BUCKET ?? "gnr8-preview-bundles").trim();
  if (!url || !serviceRoleKey || !bucket) return null;
  return { url, serviceRoleKey, bucket };
}

function getFilesystemPersistentRoot(): string | null {
  const root = (process.env.GNR8_PREVIEW_PERSISTENT_FS_ROOT ?? "").trim();
  if (!root) return null;
  return path.resolve(root);
}

async function publishBundleToPersistentStorage(input: { outputRootPath: string; executionPlanId: string }): Promise<PersistentPublishResult> {
  const bundleFiles = await listBundleFilesRecursively(input.outputRootPath);
  if (bundleFiles.length === 0) {
    return { ok: false, reasonCode: "PERSISTENT_STORAGE_UPLOAD_FAILED" };
  }
  const bundleRelativePaths = new Set(bundleFiles.map((absPath) => path.relative(input.outputRootPath, absPath).replaceAll(path.sep, "/")));

  const storageRootKey = previewRootKeyForExecutionPlan(input.executionPlanId);
  const supabaseConfig = getSupabasePreviewStorageConfig();
  if (supabaseConfig) {
    try {
      const client = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const bucket = client.storage.from(supabaseConfig.bucket);

      for (const absPath of bundleFiles) {
        const rel = path.relative(input.outputRootPath, absPath).replaceAll(path.sep, "/");
        const objectKey = `${storageRootKey}/${rel}`;
        const bytes = maybeNormalizePersistedHtml({
          relativePath: rel,
          bytes: await fs.readFile(absPath),
          bundleRelativePaths,
        });
        const { error } = await bucket.upload(objectKey, bytes, {
          upsert: true,
          contentType: contentTypeForPreviewPath(rel),
        });
        if (error) throw new Error(error.message || "supabase_upload_failed");
      }

      return {
        ok: true,
        storageKind: "supabase_storage",
        storageRootKey,
        previewKey: encodePersistentPreviewKey({ storageKind: "supabase_storage", storageRootKey }),
      };
    } catch {
      return { ok: false, reasonCode: "PERSISTENT_STORAGE_UPLOAD_FAILED" };
    }
  }

  const filesystemPersistentRoot = getFilesystemPersistentRoot();
  if (filesystemPersistentRoot) {
    try {
      for (const absPath of bundleFiles) {
        const rel = path.relative(input.outputRootPath, absPath);
        const destinationAbs = path.resolve(filesystemPersistentRoot, storageRootKey, rel);
        await fs.mkdir(path.dirname(destinationAbs), { recursive: true });
        const relPosix = rel.replaceAll(path.sep, "/");
        const bytes = maybeNormalizePersistedHtml({
          relativePath: relPosix,
          bytes: await fs.readFile(absPath),
          bundleRelativePaths,
        });
        await fs.writeFile(destinationAbs, bytes);
      }
      return {
        ok: true,
        storageKind: "filesystem_object_storage",
        storageRootKey,
        previewKey: encodePersistentPreviewKey({ storageKind: "filesystem_object_storage", storageRootKey }),
      };
    } catch {
      return { ok: false, reasonCode: "PERSISTENT_STORAGE_UPLOAD_FAILED" };
    }
  }

  return { ok: false, reasonCode: "PERSISTENT_STORAGE_NOT_CONFIGURED" };
}

export function buildExecutionPreviewHosting(input: {
  executionMode: ExecutionMode;
  materialization: ExecutionMaterialization;
}): ExecutionPreviewHosting {
  if (input.executionMode !== "materialize") {
    return {
      status: "not_available_simulation_mode",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      previewStorageKind: "none",
      previewStorageKey: null,
      reasonCode: "SIMULATION_MODE",
    };
  }

  if (!isMaterializationReady(input.materialization.status)) {
    return {
      status: "not_available_materialization_not_ready",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      previewStorageKind: "none",
      previewStorageKey: null,
      reasonCode: input.materialization.status.toUpperCase(),
    };
  }

  if (!input.materialization.outputRootPath) {
    return {
      status: "not_available_missing_output_root",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      previewStorageKind: "none",
      previewStorageKey: null,
      reasonCode: "MISSING_OUTPUT_ROOT",
    };
  }

  const outputRootPath = input.materialization.outputRootPath;
  if (!isSupportedPreviewOutputRoot(outputRootPath)) {
    return {
      status: "not_available_unsupported_output_root",
      available: false,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl: null,
      previewEntryUrl: null,
      previewKey: null,
      previewStorageKind: "none",
      previewStorageKey: null,
      reasonCode: "UNSUPPORTED_OUTPUT_ROOT",
    };
  }

  const previewKey = encodePreviewOutputRootKey(outputRootPath);
  const previewRootUrl = `/validation/previews/by-output/${previewKey}/`;
  return {
    status: "available",
    available: true,
    routeRule: TEMP_PREVIEW_ROUTE_RULE,
    previewRootUrl,
    previewEntryUrl: `${previewRootUrl}index.html`,
    previewKey,
    previewStorageKind: "local_filesystem_bundle",
    previewStorageKey: outputRootPath,
    reasonCode: null,
  };
}

export async function buildExecutionPreviewHostingWithPersistence(input: {
  executionMode: ExecutionMode;
  materialization: ExecutionMaterialization;
  executionPlanId: string;
}): Promise<ExecutionPreviewHosting> {
  const base = buildExecutionPreviewHosting({
    executionMode: input.executionMode,
    materialization: input.materialization,
  });
  if (!base.available) return base;
  if (!input.materialization.outputRootPath) return base;

  const publish = await publishBundleToPersistentStorage({
    outputRootPath: input.materialization.outputRootPath,
    executionPlanId: input.executionPlanId,
  });

  if (publish.ok) {
    const previewRootUrl = `/validation/previews/by-output/${publish.previewKey}/`;
    return {
      status: "available",
      available: true,
      routeRule: TEMP_PREVIEW_ROUTE_RULE,
      previewRootUrl,
      previewEntryUrl: `${previewRootUrl}index.html`,
      previewKey: publish.previewKey,
      previewStorageKind: publish.storageKind,
      previewStorageKey: publish.storageRootKey,
      reasonCode: null,
    };
  }

  if (isLocalFallbackAllowed()) {
    return {
      ...base,
      status: "available_local_fallback",
    };
  }

  return {
    status: "not_available_persistent_storage_unavailable",
    available: false,
    routeRule: TEMP_PREVIEW_ROUTE_RULE,
    previewRootUrl: null,
    previewEntryUrl: null,
    previewKey: null,
    previewStorageKind: "none",
    previewStorageKey: null,
    reasonCode: publish.reasonCode,
  };
}

function decodePreviewKey(
  previewKey: string,
):
  | { kind: "persistent"; storageKind: Extract<ExecutionPreviewStorageKind, "filesystem_object_storage" | "supabase_storage">; storageRootKey: string }
  | { kind: "filesystem_bundle"; outputRootPath: string }
  | null {
  const persistent = decodePersistentPreviewKey(previewKey);
  if (persistent) {
    return {
      kind: "persistent",
      storageKind: persistent.storageKind,
      storageRootKey: persistent.storageRootKey,
    };
  }

  const outputRootPath = decodePreviewOutputRootKey(previewKey);
  if (!outputRootPath) return null;
  return { kind: "filesystem_bundle", outputRootPath };
}

export function resolvePreviewBundleRequest(input: { previewKey: string; previewPath?: string[] | undefined }): PreviewBundleResolveResult {
  const key = decodePreviewKey(input.previewKey);
  if (!key) {
    return { ok: false, code: "INVALID_PREVIEW_KEY", message: "Preview key could not be decoded." };
  }

  const normalizedPath = normalizePreviewPath(input.previewPath);
  if (!normalizedPath.ok) {
    return { ok: false, code: "INVALID_PREVIEW_PATH", message: "Preview path traversal is not allowed." };
  }

  if (key.kind === "persistent") {
    return {
      ok: true,
      relativePath: normalizedPath.relativePath,
      source: {
        kind: "persistent",
        storageKind: key.storageKind,
        storageRootKey: key.storageRootKey,
      },
    };
  }

  if (!isSupportedPreviewOutputRoot(key.outputRootPath)) {
    return { ok: false, code: "UNSUPPORTED_OUTPUT_ROOT", message: "Preview output root is not in the controlled bundle area." };
  }

  const absolutePath = path.resolve(key.outputRootPath, ...normalizedPath.relativePath.split("/"));
  const relCheck = path.relative(key.outputRootPath, absolutePath);
  if (relCheck === "" || relCheck === ".." || relCheck.startsWith(`..${path.sep}`) || path.isAbsolute(relCheck)) {
    return { ok: false, code: "INVALID_PREVIEW_PATH", message: "Resolved preview path is outside bundle root." };
  }

  return {
    ok: true,
    relativePath: normalizedPath.relativePath,
    source: {
      kind: "filesystem_bundle",
      outputRootPath: key.outputRootPath,
      absolutePath,
    },
  };
}

async function readFromFilesystemBundle(input: { outputRootPath: string; absolutePath: string; relativePath: string }): Promise<PreviewBundleReadResult> {
  const bundleExists = await fs
    .stat(input.outputRootPath)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!bundleExists) {
    return {
      ok: false,
      code: "MISSING_BUNDLE_ROOT",
      message: "Preview bundle root is missing or no longer available.",
    };
  }

  const file:
    | {
        ok: true;
        bytes: Buffer;
      }
    | Extract<PreviewBundleReadResult, { ok: false }> = await fs
    .readFile(input.absolutePath)
    .then((bytes) => ({ ok: true as const, bytes }))
    .catch((err: unknown) => {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        return { ok: false as const, code: "MISSING_EXPORTED_FILE", message: "Requested exported file was not found in preview bundle." };
      }
      return { ok: false as const, code: "PREVIEW_READ_FAILED", message: "Failed to read requested preview file." };
    });

  if (!file.ok) return file;
  return { ok: true, bytes: file.bytes, contentType: contentTypeForPreviewPath(input.relativePath) };
}

async function readFromFilesystemObjectStorage(input: { storageRootKey: string; relativePath: string }): Promise<PreviewBundleReadResult> {
  const persistentRoot = getFilesystemPersistentRoot();
  if (!persistentRoot) {
    return { ok: false, code: "MISSING_BUNDLE_ROOT", message: "Persistent preview storage is not configured in this runtime." };
  }

  const bundleRootAbs = path.resolve(persistentRoot, input.storageRootKey);
  const bundleExists = await fs
    .stat(bundleRootAbs)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!bundleExists) {
    return {
      ok: false,
      code: "MISSING_BUNDLE_ROOT",
      message: "Persistent preview bundle root is missing.",
    };
  }

  const fileAbs = path.resolve(bundleRootAbs, ...input.relativePath.split("/"));
  const relCheck = path.relative(bundleRootAbs, fileAbs);
  if (relCheck === "" || relCheck === ".." || relCheck.startsWith(`..${path.sep}`) || path.isAbsolute(relCheck)) {
    return { ok: false, code: "PREVIEW_READ_FAILED", message: "Resolved persistent preview path is outside bundle root." };
  }

  const file:
    | {
        ok: true;
        bytes: Buffer;
      }
    | Extract<PreviewBundleReadResult, { ok: false }> = await fs
    .readFile(fileAbs)
    .then((bytes) => ({ ok: true as const, bytes }))
    .catch((err: unknown) => {
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT") {
        return { ok: false as const, code: "MISSING_EXPORTED_FILE", message: "Requested exported file was not found in persistent preview bundle." };
      }
      return { ok: false as const, code: "PREVIEW_READ_FAILED", message: "Failed to read requested persistent preview file." };
    });

  if (!file.ok) return file;
  return { ok: true, bytes: file.bytes, contentType: contentTypeForPreviewPath(input.relativePath) };
}

async function readFromSupabaseStorage(input: { storageRootKey: string; relativePath: string }): Promise<PreviewBundleReadResult> {
  const config = getSupabasePreviewStorageConfig();
  if (!config) {
    return { ok: false, code: "MISSING_BUNDLE_ROOT", message: "Supabase preview storage is not configured in this runtime." };
  }

  try {
    const client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const bucket = client.storage.from(config.bucket);
    const objectKey = `${input.storageRootKey}/${input.relativePath}`;
    const { data, error } = await bucket.download(objectKey);
    if (error || !data) {
      const rootCheck = await bucket.list(input.storageRootKey, { limit: 1, offset: 0 });
      const rootMissing = !!rootCheck.error || (Array.isArray(rootCheck.data) && rootCheck.data.length === 0);
      return rootMissing
        ? { ok: false, code: "MISSING_BUNDLE_ROOT", message: "Persistent preview bundle root is missing." }
        : { ok: false, code: "MISSING_EXPORTED_FILE", message: "Requested exported file was not found in persistent preview bundle." };
    }

    const bytes = Buffer.from(await data.arrayBuffer());
    return { ok: true, bytes, contentType: contentTypeForPreviewPath(input.relativePath) };
  } catch {
    return { ok: false, code: "PREVIEW_READ_FAILED", message: "Failed to read requested persistent preview file." };
  }
}

export async function readPreviewBundleFile(input: { resolved: Extract<PreviewBundleResolveResult, { ok: true }> }): Promise<PreviewBundleReadResult> {
  if (input.resolved.source.kind === "filesystem_bundle") {
    return readFromFilesystemBundle({
      outputRootPath: input.resolved.source.outputRootPath,
      absolutePath: input.resolved.source.absolutePath,
      relativePath: input.resolved.relativePath,
    });
  }

  if (input.resolved.source.storageKind === "filesystem_object_storage") {
    return readFromFilesystemObjectStorage({
      storageRootKey: input.resolved.source.storageRootKey,
      relativePath: input.resolved.relativePath,
    });
  }

  return readFromSupabaseStorage({
    storageRootKey: input.resolved.source.storageRootKey,
    relativePath: input.resolved.relativePath,
  });
}
