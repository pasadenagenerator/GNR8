import path from "node:path";

import type { AssetReference, ImportDiagnosticIssue } from "../import-contract";
import { createDiagnosticIssue, sha256Hex, stableStringify } from "./diagnostics";

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, "/");
}

function normalizeRelPosix(rel: string): string {
  return path.posix.normalize(toPosixPath(rel));
}

function isAbsoluteUrlRef(rawRef: string): boolean {
  const trimmed = rawRef.trim();
  if (trimmed.startsWith("//")) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return true;
  return false;
}

function referenceKindFromRawRef(rawRef: string): AssetReference["referenceKind"] {
  const trimmed = rawRef.trim();
  if (rawRef.includes("\0") || trimmed === "" || trimmed.startsWith("#")) return "empty_invalid";
  if (trimmed.toLowerCase().startsWith("data:")) return "data_url";
  if (isAbsoluteUrlRef(trimmed)) return "absolute_url";
  if (trimmed.startsWith("/")) return "root_relative";
  return "relative_local";
}

function assetKindFromTag(input: { tag: string; relAttr: string | null }): AssetReference["assetKind"] {
  switch (input.tag) {
    case "img":
    case "a":
      return "image";
    case "script":
      return "script";
    case "link": {
      const rel = (input.relAttr ?? "").toLowerCase();
      const tokens = rel.split(/\s+/).filter(Boolean);
      return tokens.includes("stylesheet") ? "stylesheet" : "unknown";
    }
    default:
      return "unknown";
  }
}

const IMAGE_FILE_EXTENSION_SET = new Set<string>([
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);

function isLikelyImageHref(rawRef: string): boolean {
  const trimmed = rawRef.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().startsWith("data:image/")) return true;
  try {
    const resolved = new URL(trimmed, "https://example.invalid");
    const ext = path.posix.extname(resolved.pathname.toLowerCase());
    return IMAGE_FILE_EXTENSION_SET.has(ext);
  } catch {
    return false;
  }
}

function resolveRefToRootRelativePosix(input: {
  rootDirAbs: string;
  entryHtmlAbsPath: string | null;
  fromDocumentPath: string;
  rawRef: string;
  tag: string;
  attribute: string;
}): {
  resolvedPath: string | null;
  referenceKind: AssetReference["referenceKind"];
  validationStatus: AssetReference["validationStatus"];
  issues: ImportDiagnosticIssue[];
} {
  const issues: ImportDiagnosticIssue[] = [];
  const rawRef = input.rawRef;

  const referenceKind = referenceKindFromRawRef(rawRef);

  if (referenceKind === "empty_invalid") {
    issues.push(
      createDiagnosticIssue({
        severity: "error",
        code: "invalid_asset_reference",
        message: "Invalid asset reference",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef, tag: input.tag, attribute: input.attribute },
      }),
    );
    return { resolvedPath: null, referenceKind, validationStatus: "invalid_asset_reference", issues };
  }

  if (referenceKind === "absolute_url") {
    issues.push(
      createDiagnosticIssue({
        severity: "warning",
        code: "unsupported_remote_asset",
        message: "Unsupported remote asset reference",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef, tag: input.tag, attribute: input.attribute },
      }),
    );
    return { resolvedPath: null, referenceKind, validationStatus: "unsupported_remote_asset", issues };
  }

  if (referenceKind === "data_url") {
    issues.push(
      createDiagnosticIssue({
        severity: "warning",
        code: "unsupported_data_url_asset",
        message: "Unsupported data: URL asset reference",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef, tag: input.tag, attribute: input.attribute },
      }),
    );
    return { resolvedPath: null, referenceKind, validationStatus: "unsupported_data_url_asset", issues };
  }

  const trimmed = rawRef.trim();
  if (trimmed.includes("?") || trimmed.includes("#")) {
    issues.push(
      createDiagnosticIssue({
        severity: "error",
        code: "invalid_asset_reference",
        message: "Invalid asset reference",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef, tag: input.tag, attribute: input.attribute },
      }),
    );
    return { resolvedPath: null, referenceKind, validationStatus: "invalid_asset_reference", issues };
  }

  const entryAbs =
    input.entryHtmlAbsPath === null ? path.resolve(input.rootDirAbs, input.fromDocumentPath) : input.entryHtmlAbsPath;
  const baseDirAbs = path.dirname(entryAbs);

  const localPath = trimmed.replaceAll("\\", "/");
  const targetAbs =
    referenceKind === "root_relative"
      ? path.resolve(input.rootDirAbs, localPath.replace(/^\/+/, ""))
      : path.resolve(baseDirAbs, localPath);

  const rel = path.relative(input.rootDirAbs, targetAbs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    issues.push(
      createDiagnosticIssue({
        severity: "error",
        code: "path_traversal_blocked",
        message: "Asset reference path traversal blocked",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef, tag: input.tag, attribute: input.attribute },
      }),
    );
    return { resolvedPath: null, referenceKind, validationStatus: "path_traversal_blocked", issues };
  }

  return { resolvedPath: normalizeRelPosix(rel), referenceKind, validationStatus: "ok", issues };
}

function getAttr(node: unknown, attrName: string): string | null {
  if (!node || typeof node !== "object") return null;
  const attrs = (node as { attrs?: { name?: string; value?: string }[] }).attrs;
  if (!Array.isArray(attrs)) return null;
  const lower = attrName.toLowerCase();
  for (const a of attrs) {
    if (String(a.name ?? "").toLowerCase() === lower) return String(a.value ?? "");
  }
  return null;
}

function isElement(node: unknown): node is { tagName: string } {
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

export function extractAssetReferencesFromDom(input: {
  rootDirAbs: string;
  entryHtmlAbsPath: string | null;
  fromDocumentPath: string;
  document: unknown;
}): { references: AssetReference[]; issues: ImportDiagnosticIssue[] } {
  const references: AssetReference[] = [];
  const issues: ImportDiagnosticIssue[] = [];
  const occurrenceByKey = new Map<string, number>();

  function nextOccurrence(tag: string, attribute: string): number {
    const k = `${tag}:${attribute}`;
    const current = occurrenceByKey.get(k) ?? 0;
    occurrenceByKey.set(k, current + 1);
    return current;
  }

  walkDom(input.document, (node) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "img") {
      const rawRef = getAttr(node, "src");
      if (rawRef === null) return;
      const resolved = resolveRefToRootRelativePosix({
        rootDirAbs: input.rootDirAbs,
        entryHtmlAbsPath: input.entryHtmlAbsPath,
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        tag,
        attribute: "src",
      });
      const occurrence = nextOccurrence(tag, "src");
      const assetKind = assetKindFromTag({ tag, relAttr: null });
      const id = sha256Hex(
        stableStringify({
          fromDocumentPath: input.fromDocumentPath,
          tag,
          attribute: "src",
          occurrence,
          rawRef,
        }),
      );
      references.push({
        id,
        fromDocumentPath: input.fromDocumentPath,
        tag,
        occurrence,
        rawRef,
        assetKind,
        referenceKind: resolved.referenceKind,
        resolvedPath: resolved.resolvedPath,
        existence: "unknown",
        validationStatus: resolved.validationStatus,
        attribute: "src",
      });
      issues.push(...resolved.issues);
      return;
    }
    if (tag === "link") {
      const rawRef = getAttr(node, "href");
      if (rawRef === null) return;
      const relAttr = getAttr(node, "rel");
      const resolved = resolveRefToRootRelativePosix({
        rootDirAbs: input.rootDirAbs,
        entryHtmlAbsPath: input.entryHtmlAbsPath,
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        tag,
        attribute: "href",
      });
      const occurrence = nextOccurrence(tag, "href");
      const assetKind = assetKindFromTag({ tag, relAttr });
      const id = sha256Hex(
        stableStringify({
          fromDocumentPath: input.fromDocumentPath,
          tag,
          attribute: "href",
          occurrence,
          rawRef,
        }),
      );
      references.push({
        id,
        fromDocumentPath: input.fromDocumentPath,
        tag,
        occurrence,
        rawRef,
        assetKind,
        referenceKind: resolved.referenceKind,
        resolvedPath: resolved.resolvedPath,
        existence: "unknown",
        validationStatus: resolved.validationStatus,
        attribute: "href",
      });
      issues.push(...resolved.issues);
      return;
    }
    if (tag === "script") {
      const rawRef = getAttr(node, "src");
      if (rawRef === null) return;
      const resolved = resolveRefToRootRelativePosix({
        rootDirAbs: input.rootDirAbs,
        entryHtmlAbsPath: input.entryHtmlAbsPath,
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        tag,
        attribute: "src",
      });
      const occurrence = nextOccurrence(tag, "src");
      const assetKind = assetKindFromTag({ tag, relAttr: null });
      const id = sha256Hex(
        stableStringify({
          fromDocumentPath: input.fromDocumentPath,
          tag,
          attribute: "src",
          occurrence,
          rawRef,
        }),
      );
      references.push({
        id,
        fromDocumentPath: input.fromDocumentPath,
        tag,
        occurrence,
        rawRef,
        assetKind,
        referenceKind: resolved.referenceKind,
        resolvedPath: resolved.resolvedPath,
        existence: "unknown",
        validationStatus: resolved.validationStatus,
        attribute: "src",
      });
      issues.push(...resolved.issues);
      return;
    }
    if (tag === "a") {
      const rawRef = getAttr(node, "href");
      if (rawRef === null) return;
      if (!isLikelyImageHref(rawRef)) return;
      const resolved = resolveRefToRootRelativePosix({
        rootDirAbs: input.rootDirAbs,
        entryHtmlAbsPath: input.entryHtmlAbsPath,
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        tag,
        attribute: "href",
      });
      const occurrence = nextOccurrence(tag, "href");
      const assetKind = assetKindFromTag({ tag, relAttr: null });
      const id = sha256Hex(
        stableStringify({
          fromDocumentPath: input.fromDocumentPath,
          tag,
          attribute: "href",
          occurrence,
          rawRef,
        }),
      );
      references.push({
        id,
        fromDocumentPath: input.fromDocumentPath,
        tag,
        occurrence,
        rawRef,
        assetKind,
        referenceKind: resolved.referenceKind,
        resolvedPath: resolved.resolvedPath,
        existence: "unknown",
        validationStatus: resolved.validationStatus,
        attribute: "href",
      });
      issues.push(...resolved.issues);
      return;
    }
  });

  const sortedReferences = [...references].sort((a, b) => {
    if (a.fromDocumentPath !== b.fromDocumentPath)
      return a.fromDocumentPath < b.fromDocumentPath ? -1 : 1;
    if (a.tag !== b.tag) return a.tag < b.tag ? -1 : 1;
    if (a.attribute !== b.attribute) return a.attribute < b.attribute ? -1 : 1;
    if (a.occurrence !== b.occurrence) return a.occurrence - b.occurrence;
    if (a.rawRef !== b.rawRef) return a.rawRef < b.rawRef ? -1 : 1;
    const aResolved = a.resolvedPath ?? "";
    const bResolved = b.resolvedPath ?? "";
    if (aResolved !== bResolved) return aResolved < bResolved ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { references: sortedReferences, issues };
}
