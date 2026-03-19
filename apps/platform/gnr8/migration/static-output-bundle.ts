import fs from "node:fs/promises";
import path from "node:path";

import { parse, serialize } from "parse5";

import type { ImportOutput, AssetReference, JsonValue } from "../import/import-contract";
import type { StaticHtmlPageArtifact, StaticHtmlRenderArtifact } from "./static-html-render-artifact";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

export const STATIC_OUTPUT_BUNDLE_VERSION = "1.2.0" as const;

export type StaticOutputBundleStatus = "ready" | "ready_with_warnings" | "failed";

export type StaticOutputPageWriteStatus = "written" | "skipped_not_renderable" | "write_failed";

export type StaticOutputAssetWriteStatus = "copied" | "missing" | "skipped" | "copy_failed";

export type StaticOutputAssetReasonCode =
  | "LOCAL_ASSET_COPIED"
  | "MISSING_LOCAL_ASSET"
  | "UNSUPPORTED_REMOTE_ASSET"
  | "UNSUPPORTED_DATA_URL_ASSET"
  | "INVALID_ASSET_REFERENCE"
  | "PATH_TRAVERSAL_BLOCKED"
  | "UNRESOLVED_LOCAL_ASSET"
  | "UNSUPPORTED_REFERENCE_KIND"
  | "COPY_ERROR";

export type StaticOutputPageFileRecord = {
  staticHtmlPageId: string;
  sourcePath: string;
  outputPath: string;
  absoluteOutputPath: string;
  renderability: StaticHtmlPageArtifact["renderability"]["status"];
  writeStatus: StaticOutputPageWriteStatus;
  byteLength: number;
};

export type StaticOutputAssetFileRecord = {
  assetRecordId: string;
  sourceReferenceIds: string[];
  sourceResolvedPath: string | null;
  outputPath: string | null;
  absoluteOutputPath: string | null;
  writeStatus: StaticOutputAssetWriteStatus;
  reasonCode: StaticOutputAssetReasonCode;
};

export type StaticOutputAssetReferenceRewriteRecord = {
  referenceId: string;
  sourcePath: string;
  pageOutputPath: string;
  fromRawRef: string;
  toOutputRef: string;
};

export type StaticOutputBundle = {
  kind: "static_output_bundle_v1";
  bundleVersion: typeof STATIC_OUTPUT_BUNDLE_VERSION;

  rules: {
    outputStructureRule: "phase_1_5_bundle_flat_pages_and_assets_root_v1";
    pageOutputPathRule: StaticHtmlRenderArtifact["mapping"]["outputPathRule"];
    assetCopyRule: "preserve_resolved_path_without_extra_prefix_v2";
    assetRewriteRule: "rewrite_supported_local_refs_only_when_needed_v1";
    stylesheetRewriteRule: "rewrite_preserved_stylesheet_links_for_copied_local_assets_as_explicit_page_relative_v2";
    remoteAssetRule: "unsupported_remote_assets_preserved_when_present_and_reported_v1";
    dataUrlAssetRule: "unsupported_data_url_assets_preserved_when_present_and_reported_v1";
    missingAssetRule: "missing_local_assets_reported_not_thrown_v1";
  };

  source: {
    staticHtmlArtifactKind: StaticHtmlRenderArtifact["kind"];
    staticHtmlArtifactVersion: StaticHtmlRenderArtifact["artifactVersion"];
    importContractVersion: ImportOutput["contractVersion"];
    importManifestVersion: StaticHtmlRenderArtifact["source"]["importManifestVersion"];
    fingerprints: StaticHtmlRenderArtifact["source"]["fingerprints"];
  };

  outputRootPath: string;
  status: StaticOutputBundleStatus;

  summary: {
    pageFileCount: number;
    writtenPageCount: number;
    nonRenderablePageCount: number;
    failedPageCount: number;

    assetFileCount: number;
    copiedAssetCount: number;
    missingAssetCount: number;
    skippedAssetCount: number;
    failedAssetCount: number;

    warningCount: number;
    errorCount: number;
  };

  pageFiles: StaticOutputPageFileRecord[];
  assetFiles: StaticOutputAssetFileRecord[];
  rewrites: StaticOutputAssetReferenceRewriteRecord[];

  diagnostics: {
    warnings: {
      codes: string[];
    };
    errors: {
      codes: string[];
    };
  };
};

export type MaterializeStaticOutputBundleInput = {
  staticHtmlArtifact: StaticHtmlRenderArtifact;
  importOutput: ImportOutput;
  importRootDir: string;
  outputRootDir?: string;
  cleanOutputRoot?: boolean;
};

type HtmlElementNode = {
  tagName: string;
  attrs?: { name?: string; value?: string }[];
  childNodes?: unknown[];
  content?: unknown;
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function resolveToOutputRoot(input: { importRootDir: string; outputRootDir: string | undefined; inputContentSha256: string }): string {
  if (input.outputRootDir) return path.resolve(input.outputRootDir);
  const stableBundleDirName = input.inputContentSha256.slice(0, 16);
  return path.resolve(input.importRootDir, ".gnr8-static-output", stableBundleDirName);
}

function toOutputAssetPathFromResolvedPath(resolvedPath: string): string {
  const normalized = path.posix.normalize(resolvedPath.replaceAll("\\", "/")).replace(/^\/+/, "");
  return normalized;
}

function isLocalReferenceKind(kind: AssetReference["referenceKind"]): boolean {
  return kind === "relative_local" || kind === "root_relative";
}

function canonicalReferences(references: AssetReference[]): AssetReference[] {
  return [...references].sort((a, b) => {
    if (a.fromDocumentPath !== b.fromDocumentPath) return stringCmp(a.fromDocumentPath, b.fromDocumentPath);
    if (a.tag !== b.tag) return stringCmp(a.tag, b.tag);
    if (a.attribute !== b.attribute) return stringCmp(a.attribute, b.attribute);
    if (a.occurrence !== b.occurrence) return a.occurrence - b.occurrence;
    if (a.rawRef !== b.rawRef) return stringCmp(a.rawRef, b.rawRef);
    return stringCmp(a.id, b.id);
  });
}

function toSafeAbsoluteFromRoot(input: { rootDirAbs: string; relPosixPath: string }): string | null {
  const candidate = path.resolve(input.rootDirAbs, input.relPosixPath);
  const rel = path.relative(input.rootDirAbs, candidate);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return candidate;
}

function reasonCodeForSkippedReference(ref: AssetReference): StaticOutputAssetReasonCode {
  switch (ref.validationStatus) {
    case "unsupported_remote_asset":
      return "UNSUPPORTED_REMOTE_ASSET";
    case "unsupported_data_url_asset":
      return "UNSUPPORTED_DATA_URL_ASSET";
    case "invalid_asset_reference":
      return "INVALID_ASSET_REFERENCE";
    case "path_traversal_blocked":
      return "PATH_TRAVERSAL_BLOCKED";
    default:
      return isLocalReferenceKind(ref.referenceKind) ? "UNRESOLVED_LOCAL_ASSET" : "UNSUPPORTED_REFERENCE_KIND";
  }
}

function buildAssetRecordId(sourceReferenceIds: string[], sourceResolvedPath: string | null): string {
  const payload: JsonValue = {
    kind: "static_output_asset_record_v1",
    sourceReferenceIds: [...sourceReferenceIds].sort(stringCmp),
    sourceResolvedPath,
  };
  return sha256Hex(stableStringify(payload));
}

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

function hasDescendantTag(root: unknown, tagName: string): boolean {
  let found = false;
  walkDom(root, (node) => {
    if (found || !isElement(node)) return;
    if (node.tagName.toLowerCase() === tagName) found = true;
  });
  return found;
}

function hasSelfOrAncestorTag(root: unknown, tagName: string): boolean {
  const lowerTagName = tagName.toLowerCase();
  let current: unknown = root;
  while (current && typeof current === "object") {
    if (isElement(current) && current.tagName.toLowerCase() === lowerTagName) return true;
    current = (current as { parentNode?: unknown }).parentNode;
  }
  return false;
}

function getAttrValue(node: HtmlElementNode, attrName: string): string | null {
  const lower = attrName.toLowerCase();
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  for (const attr of attrs) {
    if (String(attr.name ?? "").toLowerCase() === lower) return String(attr.value ?? "");
  }
  return null;
}

const GALLERY_CONTEXT_TOKEN_SET = new Set<string>([
  "fancybox",
  "gallery",
  "glightbox",
  "lightbox",
  "photoswipe",
  "portfolio",
  "thumb",
  "thumbnail",
  "zoom",
]);

function tokenizeLower(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function hasGalleryContextTokens(node: HtmlElementNode): boolean {
  let current: unknown = node;
  while (current && typeof current === "object") {
    if (isElement(current)) {
      const classAttr = getAttrValue(current, "class");
      const idAttr = getAttrValue(current, "id");
      const relAttr = getAttrValue(current, "rel");
      const value = [classAttr, idAttr, relAttr].filter((v) => typeof v === "string" && v.trim().length > 0).join(" ");
      if (value) {
        const tokens = tokenizeLower(value);
        for (const token of tokens) {
          if (GALLERY_CONTEXT_TOKEN_SET.has(token)) return true;
        }
      }
    }
    current = (current as { parentNode?: unknown }).parentNode;
  }
  return false;
}

function hasGalleryLikeHrefPath(rawRef: string): boolean {
  try {
    const resolved = new URL(rawRef.trim(), "https://example.invalid");
    const pathTokens = tokenizeLower(resolved.pathname);
    return pathTokens.some((token) => token === "gallery" || token === "lightbox" || token === "portfolio");
  } catch {
    return false;
  }
}

function toExplicitPageRelativeRef(rawRef: string): string {
  const trimmed = rawRef.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("/")) return trimmed;
  return `./${trimmed}`;
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

function isImageLikeHrefRef(rawRef: string): boolean {
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

function isExplicitlyPreservedHrefClass(rawRef: string): boolean {
  const trimmed = rawRef.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("#")) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith("tel:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("javascript:")
  );
}

function isSafeAnchorReferenceRewriteTarget(input: {
  node: HtmlElementNode;
  ref: AssetReference;
  rawHref: string;
}): boolean {
  if (input.ref.tag !== "a" || input.ref.attribute !== "href") return false;
  if (input.ref.assetKind !== "image") return false;
  if (!isLocalReferenceKind(input.ref.referenceKind)) return false;
  if (input.ref.validationStatus !== "ok" || input.ref.resolvedPath === null) return false;
  if (isExplicitlyPreservedHrefClass(input.rawHref)) return false;
  if (!isImageLikeHrefRef(input.rawHref)) return false;
  if (!hasDescendantTag(input.node, "img") && !hasDescendantTag(input.node, "picture")) return false;
  if (hasSelfOrAncestorTag(input.node, "header") || hasSelfOrAncestorTag(input.node, "nav")) return false;
  if (hasGalleryContextTokens(input.node)) return true;
  if (hasGalleryLikeHrefPath(input.rawHref)) return true;
  return false;
}

function rewriteHtmlAssetReferences(input: {
  html: string;
  sourcePath: string;
  pageOutputPath: string;
  refsForPage: AssetReference[];
  rewrittenRefValueByReferenceId: Map<string, string>;
}): { html: string; rewrites: StaticOutputAssetReferenceRewriteRecord[]; warningCodes: string[] } {
  if (input.rewrittenRefValueByReferenceId.size === 0) return { html: input.html, rewrites: [], warningCodes: [] };

  const refsByOccurrenceKey = new Map<string, AssetReference>();
  const refsByRawKey = new Map<string, AssetReference[]>();
  for (const ref of input.refsForPage) {
    refsByOccurrenceKey.set(`${ref.tag}|${ref.attribute}|${String(ref.occurrence)}`, ref);
    const rawKey = `${ref.tag}|${ref.attribute}|${ref.rawRef}`;
    const existing = refsByRawKey.get(rawKey);
    if (existing) existing.push(ref);
    else refsByRawKey.set(rawKey, [ref]);
  }
  for (const [key, refs] of refsByRawKey) {
    refsByRawKey.set(
      key,
      [...refs].sort((a, b) => {
        if (a.occurrence !== b.occurrence) return a.occurrence - b.occurrence;
        return stringCmp(a.id, b.id);
      }),
    );
  }

  const doc = parse(input.html);
  const occurrenceByKey = new Map<string, number>();
  const rewrites: StaticOutputAssetReferenceRewriteRecord[] = [];
  const warningCodes = new Set<string>();
  const consumedReferenceIds = new Set<string>();

  walkDom(doc, (node) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase();
    const attrName = tag === "link" || tag === "a" ? "href" : tag === "img" || tag === "script" ? "src" : null;
    if (attrName === null) return;

    const attrs = node.attrs ?? [];
    const attr = attrs.find((a) => String(a.name ?? "").toLowerCase() === attrName);
    if (!attr) return;

    const key = `${tag}|${attrName}`;
    const occurrence = occurrenceByKey.get(key) ?? 0;
    occurrenceByKey.set(key, occurrence + 1);

    let ref = refsByOccurrenceKey.get(`${key}|${String(occurrence)}`) ?? null;
    if (ref && consumedReferenceIds.has(ref.id)) ref = null;

    if (ref === null) {
      const refsForRaw = refsByRawKey.get(`${key}|${attr.value ?? ""}`) ?? [];
      for (const candidate of refsForRaw) {
        if (consumedReferenceIds.has(candidate.id)) continue;
        ref = candidate;
        break;
      }
    }
    if (!ref) return;

    let nextRefValue = input.rewrittenRefValueByReferenceId.get(ref.id);
    if (!nextRefValue || attr.value === nextRefValue) return;

    if (attr.value !== ref.rawRef) {
      warningCodes.add("ASSET_REFERENCE_REWRITE_SKIPPED_RAW_MISMATCH");
      return;
    }

    if (ref.tag === "link" && ref.attribute === "href" && ref.assetKind === "stylesheet") {
      nextRefValue = toExplicitPageRelativeRef(nextRefValue);
      if (attr.value === nextRefValue) return;
    }

    if (ref.tag === "a" && ref.attribute === "href") {
      if (
        !isSafeAnchorReferenceRewriteTarget({
          node,
          ref,
          rawHref: attr.value ?? "",
        })
      ) {
        warningCodes.add("ASSET_REFERENCE_REWRITE_SKIPPED_UNSAFE_ANCHOR");
        return;
      }
    }

    const fromRawRef = attr.value ?? "";
    attr.value = nextRefValue;
    consumedReferenceIds.add(ref.id);
    rewrites.push({
      referenceId: ref.id,
      sourcePath: input.sourcePath,
      pageOutputPath: input.pageOutputPath,
      fromRawRef,
      toOutputRef: nextRefValue,
    });
  });

  if (rewrites.length === 0) {
    return {
      html: input.html,
      rewrites,
      warningCodes: [...warningCodes].sort(stringCmp),
    };
  }

  return {
    html: serialize(doc),
    rewrites,
    warningCodes: [...warningCodes].sort(stringCmp),
  };
}

function toFsPathFromPosix(rootAbs: string, posixPath: string): string {
  const parts = posixPath.split("/").filter(Boolean);
  return path.resolve(rootAbs, ...parts);
}

function computeBundleStatus(input: {
  warningCodes: Set<string>;
  errorCodes: Set<string>;
  sourceStatus: StaticHtmlRenderArtifact["status"];
}): StaticOutputBundleStatus {
  if (input.errorCodes.size > 0) return "failed";
  if (input.sourceStatus !== "ready" || input.warningCodes.size > 0) return "ready_with_warnings";
  return "ready";
}

/**
 * Materializes deterministic static export files to disk.
 *
 * Phase-1.5 output structure:
 * - `<outputRoot>/<page.outputPath>` for each renderable page
 * - `<outputRoot>/<resolvedPath>` for copied local assets
 */
export async function materializeStaticOutputBundle(input: MaterializeStaticOutputBundleInput): Promise<StaticOutputBundle> {
  const importRootDirAbs = path.resolve(input.importRootDir);
  const outputRootPath = resolveToOutputRoot({
    importRootDir: importRootDirAbs,
    outputRootDir: input.outputRootDir,
    inputContentSha256: input.staticHtmlArtifact.source.fingerprints.inputContentSha256,
  });

  const warningCodes = new Set<string>();
  const errorCodes = new Set<string>();
  for (const code of input.staticHtmlArtifact.diagnostics.staticHtml.warnings.codes) warningCodes.add(code);

  const pageFiles: StaticOutputPageFileRecord[] = [];
  const assetFiles: StaticOutputAssetFileRecord[] = [];
  const rewrites: StaticOutputAssetReferenceRewriteRecord[] = [];

  const cleanOutputRoot = input.cleanOutputRoot ?? true;
  const parsedOutputRoot = path.parse(outputRootPath);
  if (outputRootPath === parsedOutputRoot.root) {
    errorCodes.add("OUTPUT_ROOT_INVALID");
  }

  if (errorCodes.size === 0) {
    try {
      if (cleanOutputRoot) await fs.rm(outputRootPath, { recursive: true, force: true });
      await fs.mkdir(outputRootPath, { recursive: true });
    } catch {
      errorCodes.add("OUTPUT_ROOT_WRITE_FAILED");
    }
  }

  const canonicalRefs = canonicalReferences(input.importOutput.assetRegistry.references);
  const refsBySourcePath = new Map<string, AssetReference[]>();
  for (const ref of canonicalRefs) {
    const list = refsBySourcePath.get(ref.fromDocumentPath);
    if (list) list.push(ref);
    else refsBySourcePath.set(ref.fromDocumentPath, [ref]);
  }

  const copiedAssetOutputPathByReferenceId = new Map<string, string>();
  const copiedAssetOutputAbsPathByReferenceId = new Map<string, string>();

  const localRefsByResolvedPath = new Map<string, AssetReference[]>();
  const skippedRefs: AssetReference[] = [];

  for (const ref of canonicalRefs) {
    if (ref.validationStatus === "ok" && isLocalReferenceKind(ref.referenceKind) && ref.resolvedPath !== null) {
      const list = localRefsByResolvedPath.get(ref.resolvedPath);
      if (list) list.push(ref);
      else localRefsByResolvedPath.set(ref.resolvedPath, [ref]);
      continue;
    }
    skippedRefs.push(ref);
  }

  for (const [resolvedPath, refsForPath] of [...localRefsByResolvedPath.entries()].sort((a, b) => stringCmp(a[0], b[0]))) {
    const outputPath = toOutputAssetPathFromResolvedPath(resolvedPath);
    const outputAbsPath = toFsPathFromPosix(outputRootPath, outputPath);
    const sourceAbsPath = toSafeAbsoluteFromRoot({ rootDirAbs: importRootDirAbs, relPosixPath: resolvedPath });

    if (sourceAbsPath === null) {
      warningCodes.add("PATH_TRAVERSAL_BLOCKED");
      assetFiles.push({
        assetRecordId: buildAssetRecordId(
          refsForPath.map((r) => r.id),
          resolvedPath,
        ),
        sourceReferenceIds: refsForPath.map((r) => r.id).sort(stringCmp),
        sourceResolvedPath: resolvedPath,
        outputPath: null,
        absoluteOutputPath: null,
        writeStatus: "skipped",
        reasonCode: "PATH_TRAVERSAL_BLOCKED",
      });
      continue;
    }

    let sourceStat: Awaited<ReturnType<typeof fs.stat>> | null = null;
    try {
      sourceStat = await fs.stat(sourceAbsPath);
    } catch {
      sourceStat = null;
    }

    if (!sourceStat || !sourceStat.isFile()) {
      warningCodes.add("MISSING_LOCAL_ASSET");
      assetFiles.push({
        assetRecordId: buildAssetRecordId(
          refsForPath.map((r) => r.id),
          resolvedPath,
        ),
        sourceReferenceIds: refsForPath.map((r) => r.id).sort(stringCmp),
        sourceResolvedPath: resolvedPath,
        outputPath,
        absoluteOutputPath: outputAbsPath,
        writeStatus: "missing",
        reasonCode: "MISSING_LOCAL_ASSET",
      });
      continue;
    }

    try {
      await fs.mkdir(path.dirname(outputAbsPath), { recursive: true });
      await fs.copyFile(sourceAbsPath, outputAbsPath);
    } catch {
      errorCodes.add("ASSET_COPY_FAILED");
      assetFiles.push({
        assetRecordId: buildAssetRecordId(
          refsForPath.map((r) => r.id),
          resolvedPath,
        ),
        sourceReferenceIds: refsForPath.map((r) => r.id).sort(stringCmp),
        sourceResolvedPath: resolvedPath,
        outputPath,
        absoluteOutputPath: outputAbsPath,
        writeStatus: "copy_failed",
        reasonCode: "COPY_ERROR",
      });
      continue;
    }

    assetFiles.push({
      assetRecordId: buildAssetRecordId(
        refsForPath.map((r) => r.id),
        resolvedPath,
      ),
      sourceReferenceIds: refsForPath.map((r) => r.id).sort(stringCmp),
      sourceResolvedPath: resolvedPath,
      outputPath,
      absoluteOutputPath: outputAbsPath,
      writeStatus: "copied",
      reasonCode: "LOCAL_ASSET_COPIED",
    });

    for (const ref of refsForPath) {
      copiedAssetOutputPathByReferenceId.set(ref.id, outputPath);
      copiedAssetOutputAbsPathByReferenceId.set(ref.id, outputAbsPath);
    }
  }

  for (const ref of skippedRefs) {
    const reasonCode =
      ref.validationStatus === "missing_local_asset" ? "MISSING_LOCAL_ASSET" : reasonCodeForSkippedReference(ref);

    if (reasonCode === "MISSING_LOCAL_ASSET") warningCodes.add("MISSING_LOCAL_ASSET");
    else warningCodes.add(reasonCode);

    assetFiles.push({
      assetRecordId: buildAssetRecordId([ref.id], ref.resolvedPath),
      sourceReferenceIds: [ref.id],
      sourceResolvedPath: ref.resolvedPath,
      outputPath: ref.resolvedPath ? toOutputAssetPathFromResolvedPath(ref.resolvedPath) : null,
      absoluteOutputPath:
        ref.resolvedPath !== null
          ? copiedAssetOutputAbsPathByReferenceId.get(ref.id) ?? toFsPathFromPosix(outputRootPath, toOutputAssetPathFromResolvedPath(ref.resolvedPath))
          : null,
      writeStatus: reasonCode === "MISSING_LOCAL_ASSET" ? "missing" : "skipped",
      reasonCode,
    });
  }

  for (const page of input.staticHtmlArtifact.pages) {
    const absoluteOutputPath = toFsPathFromPosix(outputRootPath, page.outputPath);

    if (page.renderability.status !== "renderable" || page.htmlDocument === null) {
      pageFiles.push({
        staticHtmlPageId: page.staticHtmlPageId,
        sourcePath: page.sourcePath,
        outputPath: page.outputPath,
        absoluteOutputPath,
        renderability: page.renderability.status,
        writeStatus: "skipped_not_renderable",
        byteLength: 0,
      });
      continue;
    }

    let htmlToWrite = page.htmlDocument.html;
    const refsForPage = refsBySourcePath.get(page.sourcePath) ?? [];
    if (refsForPage.length > 0) {
      const rewrittenRefValueByReferenceId = new Map<string, string>();
      for (const ref of refsForPage) {
        const copiedOutputPath = copiedAssetOutputPathByReferenceId.get(ref.id);
        if (!copiedOutputPath) continue;
        const fromDir = path.posix.dirname(page.outputPath);
        const relative = path.posix.relative(fromDir === "." ? "" : fromDir, copiedOutputPath);
        const rewrittenRef = relative.length > 0 ? relative : path.posix.basename(copiedOutputPath);
        rewrittenRefValueByReferenceId.set(ref.id, rewrittenRef);
      }

      const rewritten = rewriteHtmlAssetReferences({
        html: htmlToWrite,
        sourcePath: page.sourcePath,
        pageOutputPath: page.outputPath,
        refsForPage,
        rewrittenRefValueByReferenceId,
      });
      htmlToWrite = rewritten.html;
      for (const rewrite of rewritten.rewrites) rewrites.push(rewrite);
      for (const code of rewritten.warningCodes) warningCodes.add(code);
    }

    try {
      await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
      await fs.writeFile(absoluteOutputPath, htmlToWrite, "utf-8");
    } catch {
      errorCodes.add("PAGE_WRITE_FAILED");
      pageFiles.push({
        staticHtmlPageId: page.staticHtmlPageId,
        sourcePath: page.sourcePath,
        outputPath: page.outputPath,
        absoluteOutputPath,
        renderability: page.renderability.status,
        writeStatus: "write_failed",
        byteLength: 0,
      });
      continue;
    }

    pageFiles.push({
      staticHtmlPageId: page.staticHtmlPageId,
      sourcePath: page.sourcePath,
      outputPath: page.outputPath,
      absoluteOutputPath,
      renderability: page.renderability.status,
      writeStatus: "written",
      byteLength: Buffer.byteLength(htmlToWrite, "utf-8"),
    });
  }

  const warningCodeList = [...warningCodes].sort(stringCmp);
  const errorCodeList = [...errorCodes].sort(stringCmp);
  const status = computeBundleStatus({
    warningCodes,
    errorCodes,
    sourceStatus: input.staticHtmlArtifact.status,
  });

  const writtenPageCount = pageFiles.filter((p) => p.writeStatus === "written").length;
  const nonRenderablePageCount = pageFiles.filter((p) => p.writeStatus === "skipped_not_renderable").length;
  const failedPageCount = pageFiles.filter((p) => p.writeStatus === "write_failed").length;

  const copiedAssetCount = assetFiles.filter((a) => a.writeStatus === "copied").length;
  const missingAssetCount = assetFiles.filter((a) => a.writeStatus === "missing").length;
  const skippedAssetCount = assetFiles.filter((a) => a.writeStatus === "skipped").length;
  const failedAssetCount = assetFiles.filter((a) => a.writeStatus === "copy_failed").length;

  return {
    kind: "static_output_bundle_v1",
    bundleVersion: STATIC_OUTPUT_BUNDLE_VERSION,
    rules: {
      outputStructureRule: "phase_1_5_bundle_flat_pages_and_assets_root_v1",
      pageOutputPathRule: input.staticHtmlArtifact.mapping.outputPathRule,
      assetCopyRule: "preserve_resolved_path_without_extra_prefix_v2",
      assetRewriteRule: "rewrite_supported_local_refs_only_when_needed_v1",
      stylesheetRewriteRule: "rewrite_preserved_stylesheet_links_for_copied_local_assets_as_explicit_page_relative_v2",
      remoteAssetRule: "unsupported_remote_assets_preserved_when_present_and_reported_v1",
      dataUrlAssetRule: "unsupported_data_url_assets_preserved_when_present_and_reported_v1",
      missingAssetRule: "missing_local_assets_reported_not_thrown_v1",
    },
    source: {
      staticHtmlArtifactKind: input.staticHtmlArtifact.kind,
      staticHtmlArtifactVersion: input.staticHtmlArtifact.artifactVersion,
      importContractVersion: input.importOutput.contractVersion,
      importManifestVersion: input.staticHtmlArtifact.source.importManifestVersion,
      fingerprints: input.staticHtmlArtifact.source.fingerprints,
    },
    outputRootPath,
    status,
    summary: {
      pageFileCount: pageFiles.length,
      writtenPageCount,
      nonRenderablePageCount,
      failedPageCount,
      assetFileCount: assetFiles.length,
      copiedAssetCount,
      missingAssetCount,
      skippedAssetCount,
      failedAssetCount,
      warningCount: warningCodeList.length,
      errorCount: errorCodeList.length,
    },
    pageFiles,
    assetFiles,
    rewrites,
    diagnostics: {
      warnings: {
        codes: warningCodeList,
      },
      errors: {
        codes: errorCodeList,
      },
    },
  };
}
