import path from "node:path";

import type { AssetReference, ImportDiagnosticIssue } from "../import-contract.ts";
import { createDiagnosticIssue } from "./diagnostics.ts";

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, "/");
}

function normalizeRelPosix(rel: string): string {
  return path.posix.normalize(toPosixPath(rel));
}

function isExternalOrNonFileRef(rawRef: string): boolean {
  const v = rawRef.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("//") ||
    v.startsWith("data:") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("javascript:") ||
    v.startsWith("#")
  );
}

function resolveRefToRootRelativePosix(input: {
  rootDirAbs: string;
  fromDocumentPath: string;
  rawRef: string;
}): { resolvedPath: string | null; issues: ImportDiagnosticIssue[] } {
  const issues: ImportDiagnosticIssue[] = [];
  const rawRef = input.rawRef;

  if (rawRef.includes("\0") || rawRef.trim() === "") {
    issues.push(
      createDiagnosticIssue({
        severity: "warning",
        code: "INVALID_ASSET_REFERENCE",
        message: "Invalid asset reference (empty or contains NUL)",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef },
      }),
    );
    return { resolvedPath: null, issues };
  }

  if (isExternalOrNonFileRef(rawRef)) return { resolvedPath: null, issues };

  const trimmed = rawRef.trim();
  if (trimmed.includes("?") || trimmed.includes("#")) {
    issues.push(
      createDiagnosticIssue({
        severity: "warning",
        code: "ASSET_REFERENCE_UNRESOLVED",
        message: "Asset reference contains query/hash; not resolved in this phase",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef },
      }),
    );
    return { resolvedPath: null, issues };
  }

  const fromAbs = path.resolve(input.rootDirAbs, input.fromDocumentPath);
  const baseDirAbs = path.dirname(fromAbs);

  const targetAbs = trimmed.startsWith("/")
    ? path.resolve(input.rootDirAbs, trimmed.replace(/^\/+/, ""))
    : path.resolve(baseDirAbs, trimmed);

  const rel = path.relative(input.rootDirAbs, targetAbs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    issues.push(
      createDiagnosticIssue({
        severity: "warning",
        code: "INVALID_ASSET_REFERENCE",
        message: "Asset reference resolves outside rootDir",
        location: { path: input.fromDocumentPath, position: null, selector: null },
        details: { rawRef },
      }),
    );
    return { resolvedPath: null, issues };
  }

  return { resolvedPath: normalizeRelPosix(rel), issues };
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
  fromDocumentPath: string;
  document: unknown;
}): { references: AssetReference[]; issues: ImportDiagnosticIssue[] } {
  const references: AssetReference[] = [];
  const issues: ImportDiagnosticIssue[] = [];

  walkDom(input.document, (node) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "img") {
      const rawRef = getAttr(node, "src");
      if (rawRef === null) return;
      const resolved = resolveRefToRootRelativePosix({
        rootDirAbs: input.rootDirAbs,
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
      });
      references.push({
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        resolvedPath: resolved.resolvedPath,
        attribute: "src",
      });
      issues.push(...resolved.issues);
      return;
    }
    if (tag === "link") {
      const rawRef = getAttr(node, "href");
      if (rawRef === null) return;
      const resolved = resolveRefToRootRelativePosix({
        rootDirAbs: input.rootDirAbs,
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
      });
      references.push({
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        resolvedPath: resolved.resolvedPath,
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
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
      });
      references.push({
        fromDocumentPath: input.fromDocumentPath,
        rawRef,
        resolvedPath: resolved.resolvedPath,
        attribute: "src",
      });
      issues.push(...resolved.issues);
      return;
    }
  });

  const sortedReferences = [...references].sort((a, b) => {
    if (a.fromDocumentPath !== b.fromDocumentPath)
      return a.fromDocumentPath < b.fromDocumentPath ? -1 : 1;
    if (a.attribute !== b.attribute) return a.attribute < b.attribute ? -1 : 1;
    if (a.rawRef !== b.rawRef) return a.rawRef < b.rawRef ? -1 : 1;
    const aResolved = a.resolvedPath ?? "";
    const bResolved = b.resolvedPath ?? "";
    if (aResolved !== bResolved) return aResolved < bResolved ? -1 : 1;
    return 0;
  });

  return { references: sortedReferences, issues };
}
