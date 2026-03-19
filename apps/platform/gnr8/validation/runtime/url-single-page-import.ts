import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { parse, serialize } from "parse5";

import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import { resolveUrlImportSnapshotRootDirAbs } from "./url-import-snapshot-root";

export const URL_SINGLE_PAGE_IMPORT_VERSION = "1.1.0" as const;

export type UrlImportExecutionScope = {
  includes: readonly [
    "entry_html",
    "direct_stylesheets",
    "direct_images",
    "direct_scripts",
    "image_srcset_candidates",
    "lazy_image_fallback_attrs",
    "stylesheet_linked_local_assets",
  ];
  excludes: readonly ["multi_page_crawl", "browser_js_execution", "auth_fetch", "form_submission", "robots_bypass"];
};

export type UrlImportDiagnosticSeverity = "info" | "warning" | "error" | "fatal";

export type UrlImportDiagnosticCode =
  | "INVALID_INPUT_URL"
  | "ENTRY_FETCH_FAILED"
  | "ENTRY_FETCH_NON_OK"
  | "ENTRY_NON_HTML_RESPONSE"
  | "ENTRY_EMPTY_RESPONSE"
  | "ASSET_REFERENCE_UNSUPPORTED"
  | "ASSET_URL_PARSE_FAILED"
  | "ASSET_FETCH_FAILED"
  | "ASSET_FETCH_NON_OK"
  | "ASSET_FETCH_UNSUPPORTED_SCHEME"
  | "ASSET_COLLISION_RESOLVED";

export type UrlImportDiagnostic = {
  id: string;
  severity: UrlImportDiagnosticSeverity;
  code: UrlImportDiagnosticCode;
  message: string;
  targetUrl: string | null;
  details: JsonValue | null;
};

export type UrlImportAssetKind = "stylesheet" | "image" | "script" | "style_asset";

export type UrlImportAssetTag = "link" | "img" | "script" | "source";

export type UrlImportAssetAttribute =
  | "href"
  | "src"
  | "srcset"
  | "data-src"
  | "data-srcset"
  | "data-original"
  | "data-lazy-src";

export type UrlImportFetchManifestEntry = {
  tag: UrlImportAssetTag;
  attribute: UrlImportAssetAttribute;
  occurrence: number;
  rawRef: string;
  resolvedUrl: string | null;
  localPath: string | null;
  assetKind: UrlImportAssetKind;
  fetchStatus: "fetched" | "fetch_failed" | "unsupported";
  httpStatus: number | null;
  contentType: string | null;
  byteLength: number | null;
};

export type UrlSnapshotFixtureSpec = {
  fixtureId: string;
  kind: "static_marketing_site_v1";
  entryHtmlPath: "index.html";
  assetsDirPath: "assets";
  sourceUrl: string;
  normalizedUrl: string;
  snapshotVersion: typeof URL_SINGLE_PAGE_IMPORT_VERSION;
  urlKeyRule: "sha256(normalized_url_without_fragment)_prefix16";
  entryRule: "index.html";
  assetPathRule: "assets/<kind>/<urlHash12>-<basename>; collisions append -N";
  fetchScope: UrlImportExecutionScope;
};

export type UrlSinglePageImportSnapshot = {
  kind: "url_single_page_import_snapshot_v1";
  snapshotVersion: typeof URL_SINGLE_PAGE_IMPORT_VERSION;
  sourceUrl: string;
  normalizedUrl: string;
  snapshotId: string;
  snapshotRootDirAbs: string;
  fixtureSpec: UrlSnapshotFixtureSpec;
  entryHtmlPathAbs: string;
  assetsDirAbs: string;
  importDiagnostics: {
    summary: {
      infoCount: number;
      warningCount: number;
      errorCount: number;
      fatalCount: number;
    };
    issues: UrlImportDiagnostic[];
  };
  fetchManifest: UrlImportFetchManifestEntry[];
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type ParsedAssetRef = {
  key: string;
  tag: UrlImportAssetTag;
  attribute: UrlImportAssetAttribute;
  occurrence: number;
  rawRef: string;
  resolvedUrl: string | null;
  assetKind: UrlImportAssetKind;
};

const FETCH_SCOPE: UrlImportExecutionScope = {
  includes: [
    "entry_html",
    "direct_stylesheets",
    "direct_images",
    "direct_scripts",
    "image_srcset_candidates",
    "lazy_image_fallback_attrs",
    "stylesheet_linked_local_assets",
  ],
  excludes: ["multi_page_crawl", "browser_js_execution", "auth_fetch", "form_submission", "robots_bypass"],
};

const DIAGNOSTIC_SEVERITY_RANK: Record<UrlImportDiagnosticSeverity, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
};

function sha256Hex(input: string | Uint8Array): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, "/");
}

function normalizeBasename(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "asset";
}

function assetKindFromNode(input: { tag: string; rel: string | null }): UrlImportAssetKind | null {
  if (input.tag === "img") return "image";
  if (input.tag === "script") return "script";
  if (input.tag === "link") {
    const relTokens = (input.rel ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return relTokens.includes("stylesheet") ? "stylesheet" : null;
  }
  return null;
}

function normalizeInputPublicUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  parsed.hash = "";
  if (!parsed.pathname) parsed.pathname = "/";

  if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
    parsed.port = "";
  }

  return parsed;
}

function snapshotIdForNormalizedUrl(normalizedUrl: string): string {
  return `imported-url-site-${sha256Hex(normalizedUrl).slice(0, 16)}`;
}

function createDiagnostic(input: {
  severity: UrlImportDiagnosticSeverity;
  code: UrlImportDiagnosticCode;
  message: string;
  targetUrl: string | null;
  details: JsonValue | null;
}): UrlImportDiagnostic {
  const id = sha256Hex(
    stableStringify({
      severity: input.severity,
      code: input.code,
      message: input.message,
      targetUrl: input.targetUrl,
      details: input.details,
    }),
  );

  return {
    id,
    severity: input.severity,
    code: input.code,
    message: input.message,
    targetUrl: input.targetUrl,
    details: input.details,
  };
}

function sortDiagnostics(issues: UrlImportDiagnostic[]): UrlImportDiagnostic[] {
  return [...issues].sort((a, b) => {
    const sev = DIAGNOSTIC_SEVERITY_RANK[a.severity] - DIAGNOSTIC_SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const aTarget = a.targetUrl ?? "";
    const bTarget = b.targetUrl ?? "";
    if (aTarget !== bTarget) return aTarget < bTarget ? -1 : 1;
    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

function summarizeDiagnostics(issues: UrlImportDiagnostic[]) {
  let infoCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let fatalCount = 0;

  for (const issue of issues) {
    if (issue.severity === "info") infoCount++;
    else if (issue.severity === "warning") warningCount++;
    else if (issue.severity === "error") errorCount++;
    else fatalCount++;
  }

  return { infoCount, warningCount, errorCount, fatalCount };
}

function hasFatal(issues: UrlImportDiagnostic[]): boolean {
  return issues.some((issue) => issue.severity === "fatal");
}

function safeContentType(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function isHtmlResponse(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.includes("text/html") || contentType.includes("application/xhtml+xml");
}

function defaultExtensionForAssetKind(assetKind: UrlImportAssetKind): string {
  if (assetKind === "stylesheet") return ".css";
  if (assetKind === "script") return ".js";
  if (assetKind === "style_asset") return ".bin";
  return ".bin";
}

function computeLocalPathCandidate(input: { resolvedUrl: string; assetKind: UrlImportAssetKind }): string {
  const u = new URL(input.resolvedUrl);
  const urlHash12 = sha256Hex(input.resolvedUrl).slice(0, 12);
  const rawBase = path.posix.basename(u.pathname || "") || "asset";
  const normalizedBase = normalizeBasename(rawBase);
  const hasExt = path.posix.extname(normalizedBase).length > 0;
  const suffix = hasExt ? "" : defaultExtensionForAssetKind(input.assetKind);
  return `assets/${input.assetKind}/${urlHash12}-${normalizedBase}${suffix}`;
}

function resolvePathCollisions(
  refs: ParsedAssetRef[],
  diagnostics: UrlImportDiagnostic[],
): Map<string, string> {
  const resolvedUrls = [...new Set(refs.map((ref) => ref.resolvedUrl).filter((v): v is string => typeof v === "string"))].sort((a, b) =>
    a.localeCompare(b),
  );

  const assigned = new Map<string, string>();
  const usedPaths = new Map<string, string>();

  for (const resolvedUrl of resolvedUrls) {
    const exemplar = refs.find((ref) => ref.resolvedUrl === resolvedUrl);
    if (!exemplar) continue;

    const baseCandidate = computeLocalPathCandidate({ resolvedUrl, assetKind: exemplar.assetKind });
    let candidate = baseCandidate;
    let suffix = 1;

    while (usedPaths.has(candidate) && usedPaths.get(candidate) !== resolvedUrl) {
      suffix++;
      const ext = path.posix.extname(baseCandidate);
      const stem = ext.length > 0 ? baseCandidate.slice(0, -ext.length) : baseCandidate;
      candidate = `${stem}-${suffix}${ext}`;
    }

    if (candidate !== baseCandidate) {
      diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "ASSET_COLLISION_RESOLVED",
          message: "Deterministic asset path collision resolved with numeric suffix",
          targetUrl: resolvedUrl,
          details: {
            baseCandidate,
            assignedPath: candidate,
          },
        }),
      );
    }

    assigned.set(resolvedUrl, candidate);
    usedPaths.set(candidate, resolvedUrl);
  }

  return assigned;
}

const LAZY_IMAGE_ATTR_PRIORITY: readonly UrlImportAssetAttribute[] = ["data-src", "data-original", "data-lazy-src"] as const;
const SRCSET_ATTRS: readonly UrlImportAssetAttribute[] = ["srcset", "data-srcset"] as const;

function isStylesheetKind(assetKind: UrlImportAssetKind): boolean {
  return assetKind === "stylesheet";
}

function resolveAssetUrl(input: {
  rawRef: string;
  baseUrl: URL;
  diagnostics: UrlImportDiagnostic[];
  diagnosticContext: { tag: UrlImportAssetTag; attribute: UrlImportAssetAttribute; surface: string };
}): string | null {
  try {
    const resolved = new URL(input.rawRef, input.baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      input.diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "ASSET_FETCH_UNSUPPORTED_SCHEME",
          message: "Asset reference uses unsupported URL scheme",
          targetUrl: resolved.toString(),
          details: {
            tag: input.diagnosticContext.tag,
            attribute: input.diagnosticContext.attribute,
            rawRef: input.rawRef,
            scheme: resolved.protocol,
            surface: input.diagnosticContext.surface,
          },
        }),
      );
      return null;
    }
    resolved.hash = "";
    return resolved.toString();
  } catch {
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "ASSET_URL_PARSE_FAILED",
        message: "Unable to resolve asset reference URL",
        targetUrl: null,
        details: {
          tag: input.diagnosticContext.tag,
          attribute: input.diagnosticContext.attribute,
          rawRef: input.rawRef,
          surface: input.diagnosticContext.surface,
        },
      }),
    );
    return null;
  }
}

function parseSrcsetTokens(rawValue: string): Array<{ url: string; descriptor: string }> {
  const parts = rawValue
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.map((part) => {
    const firstWs = part.search(/\s/);
    if (firstWs === -1) return { url: part, descriptor: "" };
    return { url: part.slice(0, firstWs).trim(), descriptor: part.slice(firstWs).trim() };
  });
}

function buildSrcsetValue(tokens: Array<{ url: string; descriptor: string }>): string {
  return tokens
    .map((token) => (token.descriptor.length > 0 ? `${token.url} ${token.descriptor}` : token.url))
    .join(", ");
}

function rewriteCssUrlFunctions(input: {
  cssText: string;
  stylesheetLocalPath: string;
  baseUrl: URL;
  localPathByUrl: Map<string, string>;
  diagnostics: UrlImportDiagnostic[];
}): string {
  const regex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(input.cssText)) !== null) {
    const full = match[0];
    const quote = match[1] ?? "";
    const rawUrl = (match[2] ?? "").trim();
    if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("#")) continue;

    const resolvedUrl = resolveAssetUrl({
      rawRef: rawUrl,
      baseUrl: input.baseUrl,
      diagnostics: input.diagnostics,
      diagnosticContext: { tag: "link", attribute: "href", surface: "stylesheet_url" },
    });
    if (!resolvedUrl) continue;
    const targetLocalPath = input.localPathByUrl.get(resolvedUrl);
    if (!targetLocalPath) continue;

    const rel = path.posix.relative(path.posix.dirname(input.stylesheetLocalPath), targetLocalPath);
    const rewrittenUrl = rel.length > 0 ? rel : path.posix.basename(targetLocalPath);
    replacements.push({
      start: match.index,
      end: match.index + full.length,
      replacement: `url(${quote}${rewrittenUrl}${quote})`,
    });
  }

  if (replacements.length === 0) return input.cssText;
  let out = input.cssText;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i]!;
    out = `${out.slice(0, r.start)}${r.replacement}${out.slice(r.end)}`;
  }
  return out;
}

function getAttr(node: unknown, name: string): string | null {
  if (!node || typeof node !== "object") return null;
  const attrs = (node as { attrs?: { name?: string; value?: string }[] }).attrs;
  if (!Array.isArray(attrs)) return null;
  const lower = name.toLowerCase();
  for (const attr of attrs) {
    if (String(attr.name ?? "").toLowerCase() === lower) return String(attr.value ?? "");
  }
  return null;
}

function setAttr(node: unknown, name: string, value: string): void {
  if (!node || typeof node !== "object") return;
  const target = node as { attrs?: { name: string; value: string }[] };
  if (!Array.isArray(target.attrs)) return;
  const lower = name.toLowerCase();
  for (const attr of target.attrs) {
    if (String(attr.name ?? "").toLowerCase() === lower) {
      attr.value = value;
      return;
    }
  }
}

function isElement(node: unknown): node is { tagName: string } {
  return Boolean(node && typeof node === "object" && typeof (node as { tagName?: unknown }).tagName === "string");
}

function walkDom(node: unknown, visit: (node: unknown) => void): void {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    visit(current);
    const content = (current as { content?: unknown }).content;
    if (content && typeof content === "object") stack.push(content);
    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    }
  }
}

function collectAssetRefs(input: {
  document: unknown;
  entryUrl: URL;
  diagnostics: UrlImportDiagnostic[];
}): ParsedAssetRef[] {
  const refs: ParsedAssetRef[] = [];
  const occurrenceCounter = new Map<string, number>();

  function nextOccurrence(tag: UrlImportAssetTag, attribute: UrlImportAssetAttribute): number {
    const occurrenceKey = `${tag}:${attribute}`;
    const occurrence = occurrenceCounter.get(occurrenceKey) ?? 0;
    occurrenceCounter.set(occurrenceKey, occurrence + 1);
    return occurrence;
  }

  function pushRef(args: {
    tag: UrlImportAssetTag;
    attribute: UrlImportAssetAttribute;
    rawRef: string;
    assetKind: UrlImportAssetKind;
    surface: string;
  }): void {
    const trimmed = args.rawRef.trim();
    if (!trimmed) return;
    const occurrence = nextOccurrence(args.tag, args.attribute);
    const resolvedUrl = resolveAssetUrl({
      rawRef: trimmed,
      baseUrl: input.entryUrl,
      diagnostics: input.diagnostics,
      diagnosticContext: { tag: args.tag, attribute: args.attribute, surface: args.surface },
    });
    refs.push({
      key: `${args.tag}:${args.attribute}:${occurrence}`,
      tag: args.tag,
      attribute: args.attribute,
      occurrence,
      rawRef: trimmed,
      resolvedUrl,
      assetKind: args.assetKind,
    });
  }

  walkDom(input.document, (node) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase() as UrlImportAssetTag | string;
    const rel = getAttr(node, "rel");
    const assetKind = assetKindFromNode({ tag, rel });
    if (!assetKind && tag !== "source") {
      if (tag === "link") {
        const href = getAttr(node, "href");
        if (href && href.trim()) {
          input.diagnostics.push(
            createDiagnostic({
              severity: "info",
              code: "ASSET_REFERENCE_UNSUPPORTED",
              message: "Skipped non-stylesheet <link> reference",
              targetUrl: null,
              details: { tag, href, rel: rel ?? "" },
            }),
          );
        }
      }
      return;
    }

    if (tag === "link") {
      const href = getAttr(node, "href");
      if (!href || !href.trim()) return;
      pushRef({ tag: "link", attribute: "href", rawRef: href, assetKind, surface: "direct" });
      return;
    }

    if (tag === "script") {
      const src = getAttr(node, "src");
      if (!src || !src.trim()) return;
      pushRef({ tag: "script", attribute: "src", rawRef: src, assetKind, surface: "direct" });
      return;
    }

    if (tag !== "img" && tag !== "source") return;
    const primarySrc = getAttr(node, "src");
    if (primarySrc && primarySrc.trim()) {
      pushRef({ tag: tag as UrlImportAssetTag, attribute: "src", rawRef: primarySrc, assetKind: "image", surface: "direct" });
    } else if (tag === "img") {
      for (const lazyAttr of LAZY_IMAGE_ATTR_PRIORITY) {
        const lazyRef = getAttr(node, lazyAttr);
        if (!lazyRef || !lazyRef.trim()) continue;
        pushRef({
          tag: "img",
          attribute: lazyAttr,
          rawRef: lazyRef,
          assetKind: "image",
          surface: "lazy_fallback",
        });
        break;
      }
    }

    for (const srcsetAttr of SRCSET_ATTRS) {
      const rawSrcset = getAttr(node, srcsetAttr);
      if (!rawSrcset || !rawSrcset.trim()) continue;
      const tokens = parseSrcsetTokens(rawSrcset);
      for (const token of tokens) {
        if (!token.url) continue;
        pushRef({
          tag: tag as UrlImportAssetTag,
          attribute: srcsetAttr,
          rawRef: token.url,
          assetKind: "image",
          surface: "srcset_candidate",
        });
      }
    }
  });

  return refs;
}

function writeJsonStable(absPath: string, value: JsonValue): void {
  fs.writeFileSync(absPath, `${stableStringify(value)}\n`, "utf8");
}

export async function importPublicSinglePageUrlToSnapshot(input: {
  sourceUrl: string;
  snapshotRootDirAbs?: string;
  requestId?: string;
  fetchImpl?: FetchLike;
}): Promise<UrlSinglePageImportSnapshot> {
  const diagnostics: UrlImportDiagnostic[] = [];
  const fetchManifest: UrlImportFetchManifestEntry[] = [];
  const snapshotBase = resolveUrlImportSnapshotRootDirAbs(input.snapshotRootDirAbs);

  const normalizedUrl = normalizeInputPublicUrl(input.sourceUrl);
  if (!normalizedUrl) {
    diagnostics.push(
      createDiagnostic({
        severity: "fatal",
        code: "INVALID_INPUT_URL",
        message: "sourceUrl must be a valid public http(s) URL",
        targetUrl: input.sourceUrl,
        details: null,
      }),
    );

    const emptyIssues = sortDiagnostics(diagnostics);
    return {
      kind: "url_single_page_import_snapshot_v1",
      snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
      sourceUrl: input.sourceUrl,
      normalizedUrl: "",
      snapshotId: "imported-url-site-invalid",
      snapshotRootDirAbs: path.resolve(snapshotBase, "imported-url-site-invalid"),
      fixtureSpec: {
        fixtureId: "imported-url-site-invalid",
        kind: "static_marketing_site_v1",
        entryHtmlPath: "index.html",
        assetsDirPath: "assets",
        sourceUrl: input.sourceUrl,
        normalizedUrl: "",
        snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
        urlKeyRule: "sha256(normalized_url_without_fragment)_prefix16",
        entryRule: "index.html",
        assetPathRule: "assets/<kind>/<urlHash12>-<basename>; collisions append -N",
        fetchScope: FETCH_SCOPE,
      },
      entryHtmlPathAbs: "",
      assetsDirAbs: "",
      importDiagnostics: {
        summary: summarizeDiagnostics(emptyIssues),
        issues: emptyIssues,
      },
      fetchManifest: [],
    };
  }

  const normalizedHref = normalizedUrl.toString();
  const snapshotId = snapshotIdForNormalizedUrl(normalizedHref);
  const snapshotRootDirAbs = path.resolve(snapshotBase, snapshotId);
  const entryHtmlPathAbs = path.resolve(snapshotRootDirAbs, "index.html");
  const assetsDirAbs = path.resolve(snapshotRootDirAbs, "assets");

  const fixtureSpec: UrlSnapshotFixtureSpec = {
    fixtureId: snapshotId,
    kind: "static_marketing_site_v1",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
    sourceUrl: input.sourceUrl,
    normalizedUrl: normalizedHref,
    snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
    urlKeyRule: "sha256(normalized_url_without_fragment)_prefix16",
    entryRule: "index.html",
    assetPathRule: "assets/<kind>/<urlHash12>-<basename>; collisions append -N",
    fetchScope: FETCH_SCOPE,
  };

  fs.mkdirSync(snapshotRootDirAbs, { recursive: true });
  fs.mkdirSync(assetsDirAbs, { recursive: true });

  const fetcher = input.fetchImpl ?? fetch;

  let entryResponse: Response | null = null;
  try {
    entryResponse = await fetcher(normalizedHref, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "user-agent": "GNR8-Operator-URL-Import/1.0 (+single-page)",
      },
    });
  } catch (error) {
    diagnostics.push(
      createDiagnostic({
        severity: "fatal",
        code: "ENTRY_FETCH_FAILED",
        message: "Failed to fetch entry URL",
        targetUrl: normalizedHref,
        details: { error: String((error as Error)?.message ?? error) },
      }),
    );
  }

  let entryHtml = "";
  if (entryResponse) {
    if (!entryResponse.ok) {
      diagnostics.push(
        createDiagnostic({
          severity: "fatal",
          code: "ENTRY_FETCH_NON_OK",
          message: "Entry URL returned non-success status",
          targetUrl: normalizedHref,
          details: { status: entryResponse.status, statusText: entryResponse.statusText },
        }),
      );
    } else {
      const contentType = safeContentType(entryResponse.headers.get("content-type"));
      if (!isHtmlResponse(contentType)) {
        diagnostics.push(
          createDiagnostic({
            severity: "fatal",
            code: "ENTRY_NON_HTML_RESPONSE",
            message: "Entry URL did not return an HTML response",
            targetUrl: normalizedHref,
            details: { contentType },
          }),
        );
      }

      entryHtml = await entryResponse.text();
      if (!entryHtml.trim()) {
        diagnostics.push(
          createDiagnostic({
            severity: "fatal",
            code: "ENTRY_EMPTY_RESPONSE",
            message: "Entry HTML response body is empty",
            targetUrl: normalizedHref,
            details: null,
          }),
        );
      }
    }
  }

  let rewrittenHtml = entryHtml;

  if (!hasFatal(diagnostics) && entryHtml) {
    const document = parse(entryHtml);
    const refs = collectAssetRefs({
      document,
      entryUrl: normalizedUrl,
      diagnostics,
    });
    const localPathByUrl = resolvePathCollisions(refs, diagnostics);

    type FetchOutcome = {
      fetchStatus: "fetched" | "fetch_failed" | "unsupported";
      httpStatus: number | null;
      contentType: string | null;
      byteLength: number | null;
    };

    const fetchOutcomeByUrl = new Map<string, FetchOutcome>();
    const uniqueUrls = [...localPathByUrl.keys()].sort((a, b) => a.localeCompare(b));

    async function fetchAndStoreAsset(
      resolvedUrl: string,
      localPath: string,
      messageLabel: "Direct asset fetch" | "Stylesheet-linked asset fetch",
    ): Promise<FetchOutcome> {
      try {
        const response = await fetcher(resolvedUrl, {
          method: "GET",
          cache: "no-store",
          headers: {
            accept: "text/css,text/javascript,application/javascript,image/*,*/*;q=0.8",
            "user-agent": "GNR8-Operator-URL-Import/1.0 (+single-page)",
          },
        });

        const contentType = safeContentType(response.headers.get("content-type"));
        if (!response.ok) {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ASSET_FETCH_NON_OK",
              message: `${messageLabel} returned non-success status`,
              targetUrl: resolvedUrl,
              details: { status: response.status, statusText: response.statusText, localPath },
            }),
          );
          return {
            fetchStatus: "fetch_failed",
            httpStatus: response.status,
            contentType,
            byteLength: null,
          };
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const absPath = path.resolve(snapshotRootDirAbs, localPath);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, bytes);

        return {
          fetchStatus: "fetched",
          httpStatus: response.status,
          contentType,
          byteLength: bytes.byteLength,
        };
      } catch (error) {
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "ASSET_FETCH_FAILED",
            message: `${messageLabel} failed`,
            targetUrl: resolvedUrl,
            details: {
              error: String((error as Error)?.message ?? error),
              localPath,
            },
          }),
        );
        return {
          fetchStatus: "fetch_failed",
          httpStatus: null,
          contentType: null,
          byteLength: null,
        };
      }
    }

    for (const resolvedUrl of uniqueUrls) {
      const localPath = localPathByUrl.get(resolvedUrl);
      if (!localPath) continue;
      const outcome = await fetchAndStoreAsset(resolvedUrl, localPath, "Direct asset fetch");
      fetchOutcomeByUrl.set(resolvedUrl, outcome);
    }

    const stylesheetRefs = refs.filter((ref) => isStylesheetKind(ref.assetKind) && ref.resolvedUrl !== null);
    const stylesheetLinkedRefs: ParsedAssetRef[] = [];

    for (const stylesheetRef of stylesheetRefs.sort((a, b) => (a.resolvedUrl ?? "").localeCompare(b.resolvedUrl ?? ""))) {
      const stylesheetUrl = stylesheetRef.resolvedUrl;
      if (!stylesheetUrl) continue;
      const stylesheetLocalPath = localPathByUrl.get(stylesheetUrl);
      const stylesheetOutcome = fetchOutcomeByUrl.get(stylesheetUrl);
      if (!stylesheetLocalPath || !stylesheetOutcome || stylesheetOutcome.fetchStatus !== "fetched") continue;

      const stylesheetAbsPath = path.resolve(snapshotRootDirAbs, stylesheetLocalPath);
      let cssText = "";
      try {
        cssText = fs.readFileSync(stylesheetAbsPath, "utf8");
      } catch {
        continue;
      }

      const regex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
      let match: RegExpExecArray | null = null;
      let cssRefOccurrence = 0;
      while ((match = regex.exec(cssText)) !== null) {
        const rawCssRef = String(match[2] ?? "").trim();
        if (!rawCssRef || rawCssRef.startsWith("data:") || rawCssRef.startsWith("#")) continue;
        const resolvedCssUrl = resolveAssetUrl({
          rawRef: rawCssRef,
          baseUrl: new URL(stylesheetUrl),
          diagnostics,
          diagnosticContext: { tag: "link", attribute: "href", surface: "stylesheet_url" },
        });
        if (!resolvedCssUrl) continue;
        if (new URL(resolvedCssUrl).origin !== normalizedUrl.origin) {
          diagnostics.push(
            createDiagnostic({
              severity: "info",
              code: "ASSET_REFERENCE_UNSUPPORTED",
              message: "Skipped stylesheet-linked non-local asset reference",
              targetUrl: resolvedCssUrl,
              details: { stylesheetUrl, rawRef: rawCssRef },
            }),
          );
          continue;
        }
        stylesheetLinkedRefs.push({
          key: `link:href:${stylesheetRef.occurrence}:css-url:${cssRefOccurrence}`,
          tag: "link",
          attribute: "href",
          occurrence: cssRefOccurrence,
          rawRef: rawCssRef,
          resolvedUrl: resolvedCssUrl,
          assetKind: "style_asset",
        });
        cssRefOccurrence += 1;
      }
    }

    const allRefs = [...refs, ...stylesheetLinkedRefs];
    const usedPaths = new Map<string, string>();
    for (const [url, localPath] of [...localPathByUrl.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      usedPaths.set(localPath, url);
    }

    const stylesheetLinkedUrls = [...new Set(stylesheetLinkedRefs.map((r) => r.resolvedUrl).filter((v): v is string => !!v))].sort((a, b) =>
      a.localeCompare(b),
    );
    for (const resolvedUrl of stylesheetLinkedUrls) {
      if (localPathByUrl.has(resolvedUrl)) continue;
      const exemplar = stylesheetLinkedRefs.find((r) => r.resolvedUrl === resolvedUrl);
      const assetKind = exemplar?.assetKind ?? "style_asset";
      const baseCandidate = computeLocalPathCandidate({ resolvedUrl, assetKind });
      let candidate = baseCandidate;
      let suffix = 1;
      while (usedPaths.has(candidate) && usedPaths.get(candidate) !== resolvedUrl) {
        suffix += 1;
        const ext = path.posix.extname(baseCandidate);
        const stem = ext.length > 0 ? baseCandidate.slice(0, -ext.length) : baseCandidate;
        candidate = `${stem}-${suffix}${ext}`;
      }
      if (candidate !== baseCandidate) {
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "ASSET_COLLISION_RESOLVED",
            message: "Deterministic asset path collision resolved with numeric suffix",
            targetUrl: resolvedUrl,
            details: {
              baseCandidate,
              assignedPath: candidate,
            },
          }),
        );
      }
      localPathByUrl.set(resolvedUrl, candidate);
      usedPaths.set(candidate, resolvedUrl);
    }

    for (const ref of stylesheetLinkedRefs) {
      if (!ref.resolvedUrl) continue;
      if (fetchOutcomeByUrl.has(ref.resolvedUrl)) continue;
      const localPath = localPathByUrl.get(ref.resolvedUrl);
      if (!localPath) continue;
      const outcome = await fetchAndStoreAsset(ref.resolvedUrl, localPath, "Stylesheet-linked asset fetch");
      fetchOutcomeByUrl.set(ref.resolvedUrl, outcome);
    }

    for (const stylesheetRef of stylesheetRefs.sort((a, b) => (a.resolvedUrl ?? "").localeCompare(b.resolvedUrl ?? ""))) {
      const stylesheetUrl = stylesheetRef.resolvedUrl;
      if (!stylesheetUrl) continue;
      const stylesheetLocalPath = localPathByUrl.get(stylesheetUrl);
      const stylesheetOutcome = fetchOutcomeByUrl.get(stylesheetUrl);
      if (!stylesheetLocalPath || !stylesheetOutcome || stylesheetOutcome.fetchStatus !== "fetched") continue;

      const stylesheetAbsPath = path.resolve(snapshotRootDirAbs, stylesheetLocalPath);
      let cssText = "";
      try {
        cssText = fs.readFileSync(stylesheetAbsPath, "utf8");
      } catch {
        continue;
      }
      const rewrittenCss = rewriteCssUrlFunctions({
        cssText,
        stylesheetLocalPath,
        baseUrl: new URL(stylesheetUrl),
        localPathByUrl,
        diagnostics,
      });
      if (rewrittenCss !== cssText) fs.writeFileSync(stylesheetAbsPath, rewrittenCss, "utf8");
    }

    const refsByKey = new Map<string, ParsedAssetRef>();
    for (const ref of allRefs) refsByKey.set(ref.key, ref);

    const occurrenceCounter = new Map<string, number>();
    walkDom(document, (node) => {
      if (!isElement(node)) return;
      const tag = node.tagName.toLowerCase();
      if (tag !== "link" && tag !== "img" && tag !== "script" && tag !== "source") return;

      const rel = getAttr(node, "rel");
      const kind = tag === "source" ? "image" : assetKindFromNode({ tag, rel });
      if (!kind && tag !== "img" && tag !== "source") return;

      const attrsToHandle: UrlImportAssetAttribute[] = [];
      if (tag === "link") attrsToHandle.push("href");
      else if (tag === "script") attrsToHandle.push("src");
      else {
        attrsToHandle.push("src");
        for (const srcsetAttr of SRCSET_ATTRS) attrsToHandle.push(srcsetAttr);
        for (const lazyAttr of LAZY_IMAGE_ATTR_PRIORITY) attrsToHandle.push(lazyAttr);
      }

      for (const attribute of attrsToHandle) {
        const rawRef = getAttr(node, attribute);
        if (!rawRef || !rawRef.trim()) continue;

        if (attribute === "srcset" || attribute === "data-srcset") {
          const tokens = parseSrcsetTokens(rawRef);
          const rewrittenTokens = tokens.map((token) => {
            const resolvedUrl = resolveAssetUrl({
              rawRef: token.url,
              baseUrl: normalizedUrl,
              diagnostics: [],
              diagnosticContext: { tag: tag as UrlImportAssetTag, attribute, surface: "srcset_rewrite" },
            });
            const localPath = resolvedUrl ? localPathByUrl.get(resolvedUrl) : null;
            if (localPath) return { url: `/${toPosixPath(localPath)}`, descriptor: token.descriptor };
            return token;
          });
          const rewritten = buildSrcsetValue(rewrittenTokens);
          if (rewritten.length > 0) setAttr(node, attribute, rewritten);

          for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;
            const keyRoot = `${tag}:${attribute}`;
            const occurrence = occurrenceCounter.get(keyRoot) ?? 0;
            occurrenceCounter.set(keyRoot, occurrence + 1);
            const parsedRef = refsByKey.get(`${tag}:${attribute}:${occurrence}`);
            const resolvedUrl = parsedRef?.resolvedUrl ?? null;
            const localPath = resolvedUrl ? localPathByUrl.get(resolvedUrl) ?? null : null;
            const outcome = resolvedUrl ? fetchOutcomeByUrl.get(resolvedUrl) : null;
            fetchManifest.push({
              tag: tag as UrlImportAssetTag,
              attribute,
              occurrence,
              rawRef: token.url,
              resolvedUrl,
              localPath,
              assetKind: "image",
              fetchStatus: outcome?.fetchStatus ?? (resolvedUrl ? "fetch_failed" : "unsupported"),
              httpStatus: outcome?.httpStatus ?? null,
              contentType: outcome?.contentType ?? null,
              byteLength: outcome?.byteLength ?? null,
            });
          }
          continue;
        }

        const keyRoot = `${tag}:${attribute}`;
        const occurrence = occurrenceCounter.get(keyRoot) ?? 0;
        occurrenceCounter.set(keyRoot, occurrence + 1);
        const parsedRef = refsByKey.get(`${tag}:${attribute}:${occurrence}`);

        const resolvedUrl = parsedRef?.resolvedUrl ?? null;
        const localPath = resolvedUrl ? localPathByUrl.get(resolvedUrl) ?? null : null;
        if (localPath) setAttr(node, attribute, `/${toPosixPath(localPath)}`);
        if (tag === "img" && attribute !== "src" && localPath) {
          const imgSrc = getAttr(node, "src");
          if (!imgSrc || !imgSrc.trim()) setAttr(node, "src", `/${toPosixPath(localPath)}`);
        }

        const outcome = resolvedUrl ? fetchOutcomeByUrl.get(resolvedUrl) : null;
        fetchManifest.push({
          tag: tag as UrlImportAssetTag,
          attribute,
          occurrence,
          rawRef,
          resolvedUrl,
          localPath,
          assetKind: parsedRef?.assetKind ?? (tag === "script" ? "script" : tag === "link" ? "stylesheet" : "image"),
          fetchStatus: outcome?.fetchStatus ?? (resolvedUrl ? "fetch_failed" : "unsupported"),
          httpStatus: outcome?.httpStatus ?? null,
          contentType: outcome?.contentType ?? null,
          byteLength: outcome?.byteLength ?? null,
        });
      }
    });

    rewrittenHtml = serialize(document);
  }

  fs.writeFileSync(entryHtmlPathAbs, rewrittenHtml, "utf8");
  writeJsonStable(path.resolve(snapshotRootDirAbs, "fixture.json"), fixtureSpec as unknown as JsonValue);

  const sortedDiagnostics = sortDiagnostics(diagnostics);
  const sortedManifest = [...fetchManifest].sort((a, b) => {
    if (a.tag !== b.tag) return a.tag < b.tag ? -1 : 1;
    if (a.attribute !== b.attribute) return a.attribute < b.attribute ? -1 : 1;
    if (a.occurrence !== b.occurrence) return a.occurrence - b.occurrence;
    if (a.rawRef !== b.rawRef) return a.rawRef < b.rawRef ? -1 : 1;
    const aResolved = a.resolvedUrl ?? "";
    const bResolved = b.resolvedUrl ?? "";
    if (aResolved !== bResolved) return aResolved < bResolved ? -1 : 1;
    return (a.localPath ?? "").localeCompare(b.localPath ?? "");
  });

  writeJsonStable(path.resolve(snapshotRootDirAbs, "url-import-diagnostics.json"), {
    summary: summarizeDiagnostics(sortedDiagnostics),
    issues: sortedDiagnostics,
  } as unknown as JsonValue);

  writeJsonStable(path.resolve(snapshotRootDirAbs, "url-fetch-manifest.json"), sortedManifest as unknown as JsonValue);

  return {
    kind: "url_single_page_import_snapshot_v1",
    snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
    sourceUrl: input.sourceUrl,
    normalizedUrl: normalizedHref,
    snapshotId,
    snapshotRootDirAbs,
    fixtureSpec,
    entryHtmlPathAbs,
    assetsDirAbs,
    importDiagnostics: {
      summary: summarizeDiagnostics(sortedDiagnostics),
      issues: sortedDiagnostics,
    },
    fetchManifest: sortedManifest,
  };
}
