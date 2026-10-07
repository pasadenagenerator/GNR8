import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { defaultTreeAdapter, html, parse, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import postcss from "postcss";

import { stableStringify } from "../runtime/deterministic";
import {
  ASTRO_STATIC_EXPORT_MANIFEST_VERSION,
  inspectAstroStaticExport,
  type AstroStaticExportFile,
  type AstroStaticExportManifest,
  type InspectedAstroStaticExport,
} from "./astro-static-site-build-export-proof";
import { encodeGeneratedOutputRoutePath, isGeneratedOutputRoutePath } from "./generated-output-route-path";

export const ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION =
  "gnr8-astro-internal-preview-conversion:v1" as const;
export const ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND =
  "astro_static_export_internal_preview_candidate" as const;
export const ASTRO_INTERNAL_PREVIEW_ASSET_MODE = "inline_stylesheets" as const;

export type AstroInternalPreviewCandidateLifecycle =
  | {
      storage: "caller_owned_in_memory";
      lifetime: "proof_invocation_only";
      durableRegistration: false;
    }
  | {
      storage: "isolated_local_filesystem";
      lifetime: "proof_retained_until_explicit_cleanup";
      durableRegistration: false;
    };

export type AstroInternalPreviewBridgeErrorCode =
  | "candidate_identity_invalid"
  | "export_manifest_mismatch"
  | "export_bytes_mismatch"
  | "unsupported_route"
  | "unsupported_file_kind"
  | "unsupported_html"
  | "unsupported_asset_reference"
  | "stylesheet_invalid"
  | "stylesheet_missing";

export class AstroInternalPreviewBridgeError extends Error {
  readonly code: AstroInternalPreviewBridgeErrorCode;

  constructor(code: AstroInternalPreviewBridgeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroInternalPreviewBridgeError";
    this.code = code;
  }
}

export type AstroInternalPreviewCandidateManifest = {
  sourceKind: typeof ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND;
  conversionVersion: typeof ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION;
  adapterId: "astro-static-site";
  ownership: {
    siteId: string;
    siteVersionId: string;
  };
  provenance: {
    sourceSnapshotSha256: string;
    exportManifestVersion: typeof ASTRO_STATIC_EXPORT_MANIFEST_VERSION;
    exportSha256: string;
    convertedArtifactSha256: string;
  };
  assetHandling: {
    mode: typeof ASTRO_INTERNAL_PREVIEW_ASSET_MODE;
    inlinedStylesheetPaths: string[];
    externalAssetStorageRequired: false;
  };
  lifecycle: AstroInternalPreviewCandidateLifecycle;
};

/**
 * Proof-only compatibility shape. It intentionally omits RuntimeArtifact publish,
 * shadow, and governance fields because this bridge does not run those gates and
 * must not fabricate a persistable artifact.
 */
export type AstroInternalPreviewCandidate = {
  kind: typeof ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND;
  id: string;
  siteId: string;
  siteVersionId: string;
  rendererCompatibilityVersion: string;
  htmlByPath: Record<string, string> & { "/": string };
  compiledTokenStyles: string;
  assetFingerprintMap: Record<string, string>;
  manifest: AstroInternalPreviewCandidateManifest;
  contentSha256: string;
  createdAt: string;
};

export type ConvertAstroExportToInternalPreviewCandidateInput = {
  inspectedExport: InspectedAstroStaticExport;
  candidateId: string;
  siteId: string;
  siteVersionId: string;
  rendererCompatibilityVersion: string;
  sourceSnapshotSha256: string;
  /** Existing owned raw-capture assets referenced by generated HTML/CSS. */
  ownedAssetFingerprints?: Record<string, string>;
  createdAt?: string;
};

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type HtmlParentNode = DefaultTreeAdapterMap["parentNode"];
type HtmlDocument = DefaultTreeAdapterMap["document"];

export async function convertAstroExportToInternalPreviewCandidate(
  input: ConvertAstroExportToInternalPreviewCandidateInput,
): Promise<AstroInternalPreviewCandidate> {
  const identity = validateIdentity(input);
  const revalidated = await revalidateInspectedExport(input.inspectedExport);
  const bytesByPath = await readAndRevalidateExportBytes(revalidated);
  assertSupportedFiles(revalidated.manifest.files);

  const htmlByPath: Record<string, string> = {};
  const allStylesheetPaths = new Set<string>();
  const compiledStyles: string[] = [];
  for (const file of revalidated.manifest.files.filter((item) => /(?:^|\/)index\.html$/i.test(item.path))) {
    const bytes = bytesByPath.get(file.path);
    if (!bytes) throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", `Exported route bytes are missing: ${file.path}.`);
    const routePath = routePathForExportFile(file.path);
    const conversion = inlineExportedStylesheets({
      htmlBody: bytes.toString("utf8"),
      htmlPath: file.path,
      bytesByPath,
    });
    htmlByPath[routePath] = conversion.html;
    conversion.inlinedStylesheetPaths.forEach((path) => allStylesheetPaths.add(path));
    compiledStyles.push(...conversion.compiledStyles);
  }
  if (!htmlByPath["/"]) {
    throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", "Revalidated export lost index.html bytes.");
  }
  for (const file of revalidated.manifest.files) {
    if (/(?:^|\/)index\.html$/i.test(file.path) || allStylesheetPaths.has(file.path)) continue;
    throw new AstroInternalPreviewBridgeError(
      "unsupported_file_kind",
      `Unreferenced exported file cannot be represented by the runtime bridge: ${file.path}.`,
    );
  }
  const assetFingerprintMap = {
    ...structuredClone(input.ownedAssetFingerprints ?? {}),
    ...Object.fromEntries([...allStylesheetPaths].sort().map((path) => [path, fileByPath(revalidated.manifest, path).sha256])),
  };
  const contentEnvelope = {
    conversionVersion: ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
    adapterId: "astro-static-site",
    ownership: { siteId: identity.siteId, siteVersionId: identity.siteVersionId },
    rendererCompatibilityVersion: identity.rendererCompatibilityVersion,
    htmlByPath,
    compiledTokenStyles: [...new Set(compiledStyles)].join("\n"),
    assetFingerprintMap,
    sourceSnapshotSha256: identity.sourceSnapshotSha256,
    exportSha256: revalidated.manifest.aggregateSha256,
  };
  const convertedArtifactSha256 = sha256(Buffer.from(stableStringify(contentEnvelope), "utf8"));
  const manifest: AstroInternalPreviewCandidateManifest = {
    sourceKind: ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
    conversionVersion: ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
    adapterId: "astro-static-site",
    ownership: { siteId: identity.siteId, siteVersionId: identity.siteVersionId },
    provenance: {
      sourceSnapshotSha256: identity.sourceSnapshotSha256,
      exportManifestVersion: ASTRO_STATIC_EXPORT_MANIFEST_VERSION,
      exportSha256: revalidated.manifest.aggregateSha256,
      convertedArtifactSha256,
    },
    assetHandling: {
      mode: ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
      inlinedStylesheetPaths: [...allStylesheetPaths].sort(),
      externalAssetStorageRequired: false,
    },
    lifecycle: {
      storage: "caller_owned_in_memory",
      lifetime: "proof_invocation_only",
      durableRegistration: false,
    },
  };

  return {
    kind: ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
    id: identity.candidateId,
    siteId: identity.siteId,
    siteVersionId: identity.siteVersionId,
    rendererCompatibilityVersion: identity.rendererCompatibilityVersion,
    htmlByPath: htmlByPath as Record<string, string> & { "/": string },
    compiledTokenStyles: [...new Set(compiledStyles)].join("\n"),
    assetFingerprintMap,
    manifest,
    contentSha256: convertedArtifactSha256,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function isAstroInternalPreviewCandidate(value: unknown): value is AstroInternalPreviewCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<AstroInternalPreviewCandidate>;
  const structurallyValid = (
    hasExactKeys(candidate, [
      "kind",
      "id",
      "siteId",
      "siteVersionId",
      "rendererCompatibilityVersion",
      "htmlByPath",
      "compiledTokenStyles",
      "assetFingerprintMap",
      "manifest",
      "contentSha256",
      "createdAt",
    ]) &&
    candidate.kind === ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND &&
    hasExactKeys(candidate.manifest, [
      "sourceKind",
      "conversionVersion",
      "adapterId",
      "ownership",
      "provenance",
      "assetHandling",
      "lifecycle",
    ]) &&
    candidate.manifest?.sourceKind === ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND &&
    candidate.manifest?.conversionVersion === ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION &&
    candidate.manifest?.adapterId === "astro-static-site" &&
    hasExactKeys(candidate.manifest?.ownership, ["siteId", "siteVersionId"]) &&
    candidate.manifest?.ownership?.siteId === candidate.siteId &&
    candidate.manifest?.ownership?.siteVersionId === candidate.siteVersionId &&
    hasExactKeys(candidate.manifest?.provenance, [
      "sourceSnapshotSha256",
      "exportManifestVersion",
      "exportSha256",
      "convertedArtifactSha256",
    ]) &&
    candidate.manifest?.provenance?.exportManifestVersion === ASTRO_STATIC_EXPORT_MANIFEST_VERSION &&
    candidate.manifest?.provenance?.convertedArtifactSha256 === candidate.contentSha256 &&
    isNonEmptyTrimmedString(candidate.id) &&
    isNonEmptyTrimmedString(candidate.siteId) &&
    isNonEmptyTrimmedString(candidate.siteVersionId) &&
    isNonEmptyTrimmedString(candidate.rendererCompatibilityVersion) &&
    isHtmlByPath(candidate.htmlByPath) &&
    typeof candidate.compiledTokenStyles === "string" &&
    isSha256Record(candidate.assetFingerprintMap) &&
    isSha256(candidate.manifest?.provenance?.sourceSnapshotSha256) &&
    isSha256(candidate.manifest?.provenance?.exportSha256) &&
    isSha256(candidate.contentSha256) &&
    hasExactKeys(candidate.manifest?.assetHandling, [
      "mode",
      "inlinedStylesheetPaths",
      "externalAssetStorageRequired",
    ]) &&
    candidate.manifest?.assetHandling?.mode === ASTRO_INTERNAL_PREVIEW_ASSET_MODE &&
    Array.isArray(candidate.manifest?.assetHandling?.inlinedStylesheetPaths) &&
    candidate.manifest.assetHandling.inlinedStylesheetPaths.every(isNonEmptyTrimmedString) &&
    candidate.manifest.assetHandling.externalAssetStorageRequired === false &&
    isSupportedLifecycle(candidate.manifest?.lifecycle) &&
    isIsoTimestamp(candidate.createdAt)
  );
  if (!structurallyValid) return false;
  const complete = candidate as AstroInternalPreviewCandidate;
  return computeAstroInternalPreviewCandidateContentSha256(complete) === complete.contentSha256;
}

export type AstroInternalPreviewCandidateContentEnvelopeInput = Pick<
  AstroInternalPreviewCandidate,
  | "siteId"
  | "siteVersionId"
  | "rendererCompatibilityVersion"
  | "htmlByPath"
  | "compiledTokenStyles"
  | "assetFingerprintMap"
> & {
  manifest: Pick<AstroInternalPreviewCandidateManifest, "provenance">;
};

export function computeAstroInternalPreviewCandidateContentSha256(
  candidate: AstroInternalPreviewCandidateContentEnvelopeInput,
): string {
  return sha256(Buffer.from(serializeAstroInternalPreviewCandidateContentEnvelope(candidate), "utf8"));
}

export function serializeAstroInternalPreviewCandidateContentEnvelope(
  candidate: AstroInternalPreviewCandidateContentEnvelopeInput,
): string {
  return stableStringify({
    conversionVersion: ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
    adapterId: "astro-static-site",
    ownership: { siteId: candidate.siteId, siteVersionId: candidate.siteVersionId },
    rendererCompatibilityVersion: candidate.rendererCompatibilityVersion,
    htmlByPath: candidate.htmlByPath,
    compiledTokenStyles: candidate.compiledTokenStyles,
    assetFingerprintMap: candidate.assetFingerprintMap,
    sourceSnapshotSha256: candidate.manifest.provenance.sourceSnapshotSha256,
    exportSha256: candidate.manifest.provenance.exportSha256,
  });
}

function isSupportedLifecycle(value: unknown): value is AstroInternalPreviewCandidateLifecycle {
  if (!hasExactKeys(value, ["storage", "lifetime", "durableRegistration"])) return false;
  if (value.durableRegistration !== false) return false;
  return (
    (value.storage === "caller_owned_in_memory" && value.lifetime === "proof_invocation_only") ||
    (value.storage === "isolated_local_filesystem" &&
      value.lifetime === "proof_retained_until_explicit_cleanup")
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isSha256Record(value: unknown): value is Record<string, string> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(([key, fingerprint]) => isNonEmptyTrimmedString(key) && isSha256(fingerprint)),
  );
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

async function revalidateInspectedExport(inspected: InspectedAstroStaticExport): Promise<InspectedAstroStaticExport> {
  const workspacePath = dirname(inspected.distPath);
  const revalidated = await inspectAstroStaticExport(workspacePath, {
    expectedContent: inspected.verifiedContent,
    expectedThemeToken: inspected.verifiedThemeToken,
  });
  if (
    revalidated.distPath !== inspected.distPath ||
    stableStringify(revalidated.manifest) !== stableStringify(inspected.manifest)
  ) {
    throw new AstroInternalPreviewBridgeError(
      "export_manifest_mismatch",
      "Astro export no longer matches the validated manifest supplied to the bridge.",
    );
  }
  return revalidated;
}

async function readAndRevalidateExportBytes(inspected: InspectedAstroStaticExport): Promise<Map<string, Buffer>> {
  const bytesByPath = new Map<string, Buffer>();
  const canonicalDist = await realpath(inspected.distPath);
  if (canonicalDist !== resolve(inspected.distPath)) {
    throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", "Astro dist changed to a symlink before conversion.");
  }

  for (const file of inspected.manifest.files) {
    const fullPath = join(canonicalDist, ...file.path.split("/"));
    const stat = await lstat(fullPath).catch((error: unknown) => {
      throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", `Exported file disappeared: ${file.path}.`, {
        cause: error,
      });
    });
    const canonicalFile = await realpath(fullPath).catch((error: unknown) => {
      throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", `Exported file cannot be resolved: ${file.path}.`, {
        cause: error,
      });
    });
    if (stat.isSymbolicLink() || !stat.isFile() || !isInside(canonicalDist, canonicalFile)) {
      throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", `Exported file boundary changed: ${file.path}.`);
    }
    const bytes = await readFile(fullPath);
    if (bytes.byteLength !== file.bytes || sha256(bytes) !== file.sha256) {
      throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", `Exported file bytes changed: ${file.path}.`);
    }
    bytesByPath.set(file.path, bytes);
  }
  return bytesByPath;
}

function assertSupportedFiles(files: AstroStaticExportFile[]): void {
  for (const file of files) {
    if (/\.html?$/i.test(file.path) && !/(?:^|\/)index\.html$/i.test(file.path)) {
      throw new AstroInternalPreviewBridgeError(
        "unsupported_route",
        `Only Astro directory-index routes can be converted: ${file.path}.`,
      );
    }
    if (!/(?:^|\/)index\.html$/i.test(file.path) && !/\.css$/i.test(file.path)) {
      throw new AstroInternalPreviewBridgeError(
        "unsupported_file_kind",
        `Only route index.html and referenced CSS files are supported: ${file.path}.`,
      );
    }
  }
}

function inlineExportedStylesheets(input: {
  htmlBody: string;
  htmlPath: string;
  bytesByPath: Map<string, Buffer>;
}): { html: string; compiledStyles: string[]; inlinedStylesheetPaths: string[] } {
  const parseErrors: string[] = [];
  const document = parse(input.htmlBody, {
    onParseError: (error) => parseErrors.push(error.code),
  }) as HtmlDocument;
  if (parseErrors.length > 0) {
    throw new AstroInternalPreviewBridgeError(
      "unsupported_html",
      `Astro index.html requires parser recovery and is unsupported: ${[...new Set(parseErrors)].sort().join(",")}.`,
    );
  }

  const elements = allElements(document);
  if (elements.some((element) => element.tagName === "script")) {
    throw new AstroInternalPreviewBridgeError("unsupported_html", "Script elements are not supported by the v1 bridge.");
  }
  for (const element of elements) assertNoUnsupportedResourceElement(element);

  const stylesheetLinks = elements.filter(
    (element) => element.tagName === "link" && attributeTokens(element, "rel").includes("stylesheet"),
  );
  if (stylesheetLinks.length === 0) {
    throw new AstroInternalPreviewBridgeError("stylesheet_missing", "Astro index.html has no local stylesheet to inline.");
  }

  const inlinedStylesheetPaths: string[] = [];
  const compiledStyles: string[] = [];
  for (const link of stylesheetLinks) {
    const href = attribute(link, "href");
    if (!href) {
      throw new AstroInternalPreviewBridgeError("stylesheet_missing", "Astro stylesheet link has no href.");
    }
    const stylesheetPath = resolveLocalExportReference(href, input.htmlPath);
    if (!stylesheetPath) {
      throw new AstroInternalPreviewBridgeError(
        "unsupported_asset_reference",
        `External or non-file stylesheet references are unsupported: ${href}.`,
      );
    }
    const stylesheetBytes = input.bytesByPath.get(stylesheetPath);
    if (!stylesheetBytes) {
      throw new AstroInternalPreviewBridgeError(
        "stylesheet_missing",
        `Stylesheet bytes are missing after export revalidation: ${href} -> ${stylesheetPath}.`,
      );
    }
    const css = stylesheetBytes.toString("utf8");
    assertSelfContainedCss(css, stylesheetPath);
    replaceStylesheetLinkWithStyle(link, href, css);
    inlinedStylesheetPaths.push(stylesheetPath);
    compiledStyles.push(css);
  }

  for (const style of allElements(document).filter((element) => element.tagName === "style")) {
    assertSelfContainedCss(textContent(style), attribute(style, "data-gnr8-astro-source-path") ?? "inline-style");
  }

  return {
    html: serialize(document),
    compiledStyles,
    inlinedStylesheetPaths,
  };
}

function routePathForExportFile(path: string): string {
  if (path === "index.html") return "/";
  const suffix = "/index.html";
  if (!path.endsWith(suffix)) throw new AstroInternalPreviewBridgeError("unsupported_route", `Unsupported route output: ${path}.`);
  try {
    return encodeGeneratedOutputRoutePath(`/${path.slice(0, -suffix.length)}`);
  } catch (error) {
    throw new AstroInternalPreviewBridgeError("unsupported_route", `Unsupported route output: ${path}.`, { cause: error });
  }
}

function replaceStylesheetLinkWithStyle(link: HtmlElement, href: string, css: string): void {
  const parent = link.parentNode as HtmlParentNode | null;
  if (!parent) {
    throw new AstroInternalPreviewBridgeError("unsupported_html", "Stylesheet link has no document parent.");
  }
  const supportedAttributes = new Set(["media", "nonce", "title"]);
  const attrs = link.attrs
    .filter((item) => supportedAttributes.has(item.name))
    .map((item) => ({ name: item.name, value: item.value }));
  attrs.push({ name: "data-gnr8-astro-source-href", value: href });
  const style = defaultTreeAdapter.createElement("style", html.NS.HTML, attrs);
  defaultTreeAdapter.insertText(style, css);
  defaultTreeAdapter.insertBefore(parent, style, link);
  defaultTreeAdapter.detachNode(link);
}

function assertSelfContainedCss(css: string, sourcePath: string): void {
  let root: postcss.Root;
  try {
    root = postcss.parse(css, { from: sourcePath });
  } catch (error) {
    throw new AstroInternalPreviewBridgeError("stylesheet_invalid", `Stylesheet cannot be parsed: ${sourcePath}.`, {
      cause: error,
    });
  }
  root.walkAtRules((rule) => {
    if (rule.name.toLowerCase() === "import") {
      throw new AstroInternalPreviewBridgeError(
        "unsupported_asset_reference",
        `CSS @import is unsupported by the self-contained bridge: ${sourcePath}.`,
      );
    }
    assertNoCssUrlDependency(rule.params, sourcePath);
  });
  root.walkDecls((declaration) => assertNoCssUrlDependency(declaration.value, sourcePath));
}

function assertNoCssUrlDependency(value: string, sourcePath: string): void {
  for (const match of value.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const reference = match[2]?.trim() ?? "";
    if (!reference || reference.startsWith("#") || /^data:/i.test(reference) || isOwnedRuntimeAssetReference(reference)) continue;
    throw new AstroInternalPreviewBridgeError(
      "unsupported_asset_reference",
      `CSS asset dependencies are unsupported by the inline-stylesheet bridge: ${sourcePath} -> ${reference}.`,
    );
  }
}

function assertNoUnsupportedResourceElement(element: HtmlElement): void {
  if (element.tagName === "link") {
    const rel = attributeTokens(element, "rel");
    if (!rel.includes("stylesheet") && attribute(element, "href")) {
      throw new AstroInternalPreviewBridgeError(
        "unsupported_asset_reference",
        `Non-stylesheet link resources are unsupported: ${attribute(element, "href")}.`,
      );
    }
    return;
  }
  const resourceAttributes: Record<string, string[]> = {
    img: ["src", "srcset"],
    source: ["src", "srcset"],
    video: ["src", "poster"],
    audio: ["src"],
    object: ["data"],
    embed: ["src"],
    input: ["src"],
  };
  for (const name of resourceAttributes[element.tagName] ?? []) {
    const value = attribute(element, name);
    if (value && !resourceAttributeIsOwnedOrExternal(value)) {
      throw new AstroInternalPreviewBridgeError(
        "unsupported_asset_reference",
        `HTML asset references are unsupported by the v1 self-contained bridge: ${element.tagName}[${name}]=${value}.`,
      );
    }
  }
}

function resourceAttributeIsOwnedOrExternal(value: string): boolean {
  const references = value.split(",").map((item) => item.trim().split(/\s+/, 1)[0] ?? "").filter(Boolean);
  return references.length > 0 && references.every((reference) =>
    /^data:/i.test(reference) || /^https?:\/\//i.test(reference) || isOwnedRuntimeAssetReference(reference),
  );
}

function isOwnedRuntimeAssetReference(value: string): boolean {
  return /^\/api\/gnr8\/runtime\/preview-assets\/[^/?#]+\/[^/?#]+\/.+/i.test(value.trim());
}

function isHtmlByPath(value: unknown): value is Record<string, string> & { "/": string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length > 0 && typeof (value as Record<string, unknown>)["/"] === "string" && entries.every(([path, html]) =>
    isGeneratedOutputRoutePath(path) && typeof html === "string" && html.length > 0,
  );
}

function resolveLocalExportReference(reference: string, sourcePath: string): string | null {
  if (reference.startsWith("#") || /^(?:data|mailto|tel|javascript):/i.test(reference)) return null;
  let url: URL;
  try {
    url = new URL(reference, `https://gnr8.invalid/${sourcePath}`);
  } catch (error) {
    throw new AstroInternalPreviewBridgeError("unsupported_asset_reference", `Invalid exported reference: ${reference}.`, {
      cause: error,
    });
  }
  if (url.origin !== "https://gnr8.invalid") return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    throw new AstroInternalPreviewBridgeError("unsupported_asset_reference", `Invalid encoded reference: ${reference}.`, {
      cause: error,
    });
  }
  const path = pathname.replace(/^\/+/, "");
  if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new AstroInternalPreviewBridgeError("unsupported_asset_reference", `Unsafe exported reference: ${reference}.`);
  }
  return path;
}

function validateIdentity(input: ConvertAstroExportToInternalPreviewCandidateInput): {
  candidateId: string;
  siteId: string;
  siteVersionId: string;
  rendererCompatibilityVersion: string;
  sourceSnapshotSha256: string;
} {
  const candidateId = input.candidateId.trim();
  const siteId = input.siteId.trim();
  const siteVersionId = input.siteVersionId.trim();
  const rendererCompatibilityVersion = input.rendererCompatibilityVersion.trim();
  const sourceSnapshotSha256 = input.sourceSnapshotSha256.trim().toLowerCase();
  if (!candidateId || !siteId || !siteVersionId || !rendererCompatibilityVersion || !/^[0-9a-f]{64}$/.test(sourceSnapshotSha256)) {
    throw new AstroInternalPreviewBridgeError(
      "candidate_identity_invalid",
      "Candidate ID, site ID, site-version ID, renderer version, and a SHA-256 source snapshot are required.",
    );
  }
  return { candidateId, siteId, siteVersionId, rendererCompatibilityVersion, sourceSnapshotSha256 };
}

function fileByPath(manifest: AstroStaticExportManifest, path: string): AstroStaticExportFile {
  const file = manifest.files.find((item) => item.path === path);
  if (!file) {
    throw new AstroInternalPreviewBridgeError("export_bytes_mismatch", `Manifest file is missing: ${path}.`);
  }
  return file;
}

function allElements(root: HtmlNode): HtmlElement[] {
  const out: HtmlElement[] = [];
  walk(root, (element) => out.push(element));
  return out;
}

function walk(node: HtmlNode, visit: (element: HtmlElement) => void): void {
  if (isElement(node)) visit(node);
  const children = "childNodes" in node ? node.childNodes ?? [] : [];
  for (const child of children) walk(child, visit);
}

function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && Array.isArray((node as HtmlElement).attrs);
}

function attribute(element: HtmlElement, name: string): string | null {
  return element.attrs.find((item) => item.name === name)?.value ?? null;
}

function attributeTokens(element: HtmlElement, name: string): string[] {
  return (attribute(element, name) ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function textContent(element: HtmlElement): string {
  return (element.childNodes ?? [])
    .map((child) => ("value" in child ? child.value : ""))
    .join("");
}

function isInside(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
