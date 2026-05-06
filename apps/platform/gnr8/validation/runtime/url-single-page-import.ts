import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { parse, serialize } from "parse5";

import type { RenderedCaptureExecutor, RenderedCaptureResult } from "../../import-rendered-capture";
import type { SemanticImportCaptureMode, SemanticImportResult } from "../../import-semantic/semantic-import-engine";
import {
  FileBackedRenderedCaptureJobOrchestrator,
  createRenderedCaptureWorkerClientFromEnv,
  createRenderedCaptureWorkerRequest,
  mapWorkerResponseToRenderedCaptureResult,
  resolveRenderedCaptureWorkerClientConfigFromEnv,
  type RenderedCaptureJobRecord,
  type RenderedCaptureWorkerClient,
  type RenderedCaptureWorkerHealthTruth,
} from "../../import-rendered-capture-worker";
import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import { resolveUrlImportSnapshotRootDirAbs } from "./url-import-snapshot-root";
import { URL_SINGLE_PAGE_IMPORT_VERSION, type RenderedDomQuality } from "./url-single-page-import-contract";

export type UrlImportExecutionScope = {
  includes: readonly [
    "entry_html",
    "rendered_dom_capture",
    "screenshot_capture",
    "computed_style_sampling",
    "direct_stylesheets",
    "direct_images",
    "direct_scripts",
    "image_srcset_candidates",
    "lazy_image_fallback_attrs",
    "gallery_image_anchor_hrefs",
    "stylesheet_linked_local_assets",
  ];
  excludes: readonly ["multi_page_crawl", "auth_fetch", "form_submission", "robots_bypass"];
};

export type UrlImportDiagnosticSeverity = "info" | "warning" | "error" | "fatal";

export type UrlImportDiagnosticCode =
  | "SITE_IMPORT_INTAKE_STARTED"
  | "SITE_IMPORT_URL_FETCH_STARTED"
  | "SITE_IMPORT_URL_FETCH_FAILED"
  | "SITE_IMPORT_HTML_EMPTY"
  | "SITE_IMPORT_HTML_RECEIVED"
  | "SITE_IMPORT_ASSET_DISCOVERY_STARTED"
  | "SITE_IMPORT_INTAKE_COMPLETED"
  | "SITE_IMPORT_INTAKE_FAILED"
  | "IMPORT_RUN_ID_CREATED"
  | "EVIDENCE_RUN_ISOLATED"
  | "STALE_EVIDENCE_SUPERSEDED"
  | "CAPTURE_JOB_QUEUED"
  | "CAPTURE_JOB_STARTED"
  | "CAPTURE_JOB_RETRIED"
  | "CAPTURE_JOB_TIMED_OUT"
  | "CAPTURE_JOB_FAILED_TRANSIENT"
  | "CAPTURE_JOB_FAILED_TERMINAL"
  | "CAPTURE_JOB_COMPLETED_PARTIAL"
  | "CAPTURE_JOB_COMPLETED"
  | "CAPTURE_WORKER_HEALTH_UNAVAILABLE"
  | "CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED"
  | "CAPTURE_WORKER_URL_RESOLVED"
  | "CAPTURE_WORKER_REQUEST_BUILT"
  | "CAPTURE_WORKER_HTTP_REQUEST_SENT"
  | "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED"
  | "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED"
  | "CAPTURE_WORKER_RESPONSE_PARSED"
  | "CAPTURE_WORKER_RESPONSE_SHAPE_INVALID"
  | "CAPTURE_WORKER_REQUEST_STARTED"
  | "CAPTURE_WORKER_REQUEST_FAILED"
  | "CAPTURE_WORKER_DISABLED"
  | "CAPTURE_WORKER_NOT_CONFIGURED"
  | "CAPTURE_WORKER_HTTP_ERROR"
  | "CAPTURE_WORKER_TIMEOUT"
  | "CAPTURE_WORKER_UNAUTHORIZED"
  | "CAPTURE_WORKER_EXECUTION_FAILED"
  | "CAPTURE_WORKER_UNAVAILABLE"
  | "CAPTURE_WORKER_RESPONSE_INVALID"
  | "CAPTURE_WORKER_EMPTY_RENDER_RESULT"
  | "CAPTURE_WORKER_RENDERED_DOM_USED"
  | "CAPTURE_WORKER_RESULT_ACCEPTED"
  | "CAPTURE_WORKER_RESULT_PARTIAL_ACCEPTED"
  | "CAPTURE_WORKER_RESULT_OVERRIDDEN_BY_FALLBACK"
  | "WORKER_SUCCESS_RESPONSE_ACCEPTED"
  | "WORKER_SUCCESS_PARTIAL_RENDER_ACCEPTED"
  | "WORKER_SUCCESS_RESPONSE_REJECTED"
  | "WORKER_RENDERED_PAYLOAD_HYDRATED"
  | "RENDERED_CAPTURE_ACCEPTED"
  | "RENDERED_CAPTURE_PERSISTED"
  | "RENDERED_ARTIFACT_PERSISTED"
  | "RENDERED_SUMMARY_HYDRATED_FROM_WORKER_SUCCESS"
  | "RENDERED_PRIMARY_SELECTED_AFTER_SUCCESS"
  | "RAW_FALLBACK_REJECTED_RENDERED_SUCCESS_EXISTS"
  | "RENDERED_SUCCESS_DEGRADED_BUT_USABLE"
  | "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML"
  | "INVALID_INPUT_URL"
  | "ENTRY_FETCH_FAILED"
  | "ENTRY_FETCH_TIMEOUT"
  | "ENTRY_FETCH_REDIRECT_LOOP"
  | "ENTRY_FETCH_NON_OK"
  | "ENTRY_FETCH_UNSUPPORTED_CONTENT_TYPE"
  | "ENTRY_NON_HTML_RESPONSE"
  | "ENTRY_EMPTY_RESPONSE"
  | "ASSET_REFERENCE_UNSUPPORTED"
  | "ASSET_URL_PARSE_FAILED"
  | "ASSET_FETCH_FAILED"
  | "ASSET_FETCH_NON_OK"
  | "ASSET_FETCH_UNSUPPORTED_SCHEME"
  | "ASSET_COLLISION_RESOLVED"
  | "PRIMARY_STYLESHEET_DETECTED"
  | "PRIMARY_STYLESHEET_SELECTED"
  | "PRIMARY_STYLESHEET_CAPTURED"
  | "PRIMARY_STYLESHEET_FETCH_FAILED"
  | "PRIMARY_STYLESHEET_NOT_REWRITE_ELIGIBLE"
  | "PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML"
  | "RENDERED_CAPTURE_RUNTIME_ENVIRONMENT"
  | "PLAYWRIGHT_PACKAGE_CHECK"
  | "PLAYWRIGHT_BINARY_CHECK"
  | "PLAYWRIGHT_EXECUTABLE_RESOLUTION"
  | "PLAYWRIGHT_EXECUTABLE_EXISTS_CHECK"
  | "PLAYWRIGHT_IMPORT_FAILED"
  | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED"
  | "PLAYWRIGHT_BROWSER_CONTEXT_FAILED"
  | "PLAYWRIGHT_LAUNCH_TIMEOUT"
  | "PLAYWRIGHT_EXECUTABLE_MISSING"
  | "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED"
  | "BROWSER_LAUNCH_CONFIGURATION"
  | "BROWSER_LAUNCH_ERROR_CLASSIFIED"
  | "RENDERED_CAPTURE_SUPPORT_DECISION"
  | "ENVIRONMENT_UNSUPPORTED"
  | "BROWSER_LAUNCH_STARTED"
  | "BROWSER_LAUNCH_SUCCEEDED"
  | "BROWSER_LAUNCH_FAILED"
  | "PAGE_CREATION_STARTED"
  | "PAGE_CREATION_SUCCEEDED"
  | "NAVIGATION_STARTED"
  | "NAVIGATION_SUCCEEDED"
  | "NAVIGATION_FAILED"
  | "READINESS_WAIT_STARTED"
  | "READINESS_WAIT_COMPLETED"
  | "SCREENSHOT_CAPTURE_STARTED"
  | "SCREENSHOT_CAPTURE_SUCCEEDED"
  | "SCREENSHOT_FAILED"
  | "DOM_SERIALIZATION_STARTED"
  | "DOM_SERIALIZATION_SUCCEEDED"
  | "DOM_EMPTY_AFTER_RENDER"
  | "STYLE_SAMPLING_STARTED"
  | "STYLE_SAMPLING_SUCCEEDED"
  | "STYLE_SAMPLING_FAILED"
  | "CLEANUP_STARTED"
  | "CLEANUP_COMPLETED"
  | "RENDERED_CAPTURE_UNAVAILABLE"
  | "RENDERED_CAPTURE_BROWSER_START_FAILED"
  | "BROWSER_NAVIGATION_FAILED"
  | "RENDERED_CAPTURE_TIMEOUT"
  | "RENDERED_CAPTURE_PARTIAL"
  | "RENDERED_CAPTURE_SCREENSHOT_ONLY"
  | "RENDERED_CAPTURE_DOM_SERIALIZATION_FAILED"
  | "RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION"
  | "RENDERED_CAPTURE_STYLE_SAMPLING_FAILED"
  | "RENDERED_CAPTURE_DOM_STILL_SHELL"
  | "RENDERED_CAPTURE_RECOVERED_ON_RETRY"
  | "RENDERED_CAPTURE_FAILED"
  | "SCREENSHOT_CAPTURE_FAILED"
  | "COMPUTED_STYLE_SAMPLE_WEAK"
  | "CAPTURE_PHASE_STABILIZATION_STARTED"
  | "CAPTURE_PHASE_STABILIZATION_COMPLETED"
  | "CAPTURE_PHASE_STABILIZATION_TIMED_OUT"
  | "CAPTURE_PHASE_STABILIZATION_FAILED"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_STARTED"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_COMPLETED"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_TIMED_OUT"
  | "CAPTURE_PHASE_DOM_SERIALIZATION_FAILED"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_STARTED"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_COMPLETED"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_TIMED_OUT"
  | "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_FAILED"
  | "CAPTURE_PHASE_STYLE_SAMPLING_STARTED"
  | "CAPTURE_PHASE_STYLE_SAMPLING_COMPLETED"
  | "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT"
  | "CAPTURE_PHASE_STYLE_SAMPLING_FAILED"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_STARTED"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_COMPLETED"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_TIMED_OUT"
  | "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_FAILED"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_STARTED"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_COMPLETED"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_TIMED_OUT"
  | "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_FAILED"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_STARTED"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_TIMED_OUT"
  | "CAPTURE_PHASE_RESPONSE_ASSEMBLY_FAILED"
  | "RENDERED_DOM_REQUIRED_BUT_UNAVAILABLE"
  | "RAW_HTML_FALLBACK_USED"
  | "RAW_HTML_WEAK_BUT_USABLE"
  | "IMPORT_FIDELITY_DEGRADED"
  | "RENDERED_DOM_EMPTY_OR_WEAK"
  | "NO_USABLE_IMPORT_SOURCE";

export type UrlImportSourceMode = "rendered_dom" | "raw_html_fallback";

export type UrlImportFidelityStatus = "high_fidelity_import" | "degraded_import" | "capture_failed";

type RenderedCaptureVisibilityStatus = "available" | "partial" | "failed";

export type SiteImportIntakeReasonCode =
  | "ok"
  | "fetch_failed"
  | "empty_html"
  | "invalid_url"
  | "blocked_by_cors_or_network"
  | "unsupported_response_content_type";

export type SiteImportIntakeEvidence = {
  requestedUrl: string;
  finalUrl: string | null;
  httpStatus: number | null;
  contentType: string | null;
  htmlByteLength: number;
  assetCount: number;
};

export type SiteImportIntakeResult = {
  ok: boolean;
  reasonCode: SiteImportIntakeReasonCode;
  diagnostics: UrlImportDiagnosticCode[];
  rawHtmlAvailable: boolean;
  htmlByteLength: number;
  evidence: SiteImportIntakeEvidence;
};

export type UrlImportDiagnostic = {
  id: string;
  severity: UrlImportDiagnosticSeverity;
  code: UrlImportDiagnosticCode;
  message: string;
  targetUrl: string | null;
  details: JsonValue | null;
};

export type UrlImportAssetKind = "stylesheet" | "image" | "script" | "style_asset";

export type UrlImportAssetTag = "link" | "img" | "script" | "source" | "a" | "object" | "embed";

export type UrlImportAssetAttribute =
  | "href"
  | "src"
  | "data"
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
  snapshotRunId: string;
  requestId: string | null;
  snapshotStableRootDirAbs: string;
  snapshotRootDirAbs: string;
  fixtureSpec: UrlSnapshotFixtureSpec;
  captureMode?: SemanticImportCaptureMode;
  sourceMode: UrlImportSourceMode;
  sourceSelection: {
    sourceMode: UrlImportSourceMode;
    fidelityStatus: UrlImportFidelityStatus;
    selectedSourceHtmlPathAbs: string;
    renderedDomQuality: RenderedDomQuality;
    rawHtmlQuality: RenderedDomQuality;
    degraded: boolean;
  };
  responseHtmlPathAbs: string;
  entryHtmlPathAbs: string;
  assetsDirAbs: string;
  renderedCapture: RenderedCaptureResult;
  renderedCaptureReliability: {
    job: Pick<
      RenderedCaptureJobRecord,
      | "jobId"
      | "status"
      | "attemptCount"
      | "maxAttempts"
      | "failureClass"
      | "failureCode"
      | "createdAt"
      | "startedAt"
      | "completedAt"
      | "timeoutBudgetMs"
      | "resultSummary"
    > | null;
    workerHealth: RenderedCaptureWorkerHealthTruth | null;
  };
  semanticImport?: SemanticImportResult | null;
  importDiagnostics: {
    summary: {
      infoCount: number;
      warningCount: number;
      errorCount: number;
      fatalCount: number;
    };
    issues: UrlImportDiagnostic[];
  };
  importIntake?: SiteImportIntakeResult;
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
  sourceScope: "head_stylesheet" | "other";
};

const FETCH_SCOPE: UrlImportExecutionScope = {
  includes: [
    "entry_html",
    "rendered_dom_capture",
    "screenshot_capture",
    "computed_style_sampling",
    "direct_stylesheets",
    "direct_images",
    "direct_scripts",
    "image_srcset_candidates",
    "lazy_image_fallback_attrs",
    "gallery_image_anchor_hrefs",
    "stylesheet_linked_local_assets",
  ],
  excludes: ["multi_page_crawl", "auth_fetch", "form_submission", "robots_bypass"],
};

const DIAGNOSTIC_SEVERITY_RANK: Record<UrlImportDiagnosticSeverity, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
};

const DEFAULT_RENDERED_CAPTURE_VIEWPORT = {
  width: 1366,
  height: 768,
} as const;

const DEFAULT_RENDERED_CAPTURE_READINESS_POLICY = {
  navigationTimeoutMs: 20_000,
  networkQuietTimeoutMs: 4_000,
  domStabilizationWindowMs: 2_500,
  domStabilizationPollMs: 250,
  maxTotalCaptureMs: 30_000,
  shellContentMinLength: 120,
  shellDetectionRetryCount: 1,
  shellDetectionRetryDelayMs: 1_500,
} as const;

// Keep browser runtime loading request-bounded: Vercel packaging rejects pnpm symlinked browser trees
// when capture modules are imported at route/module top-level.
async function runRenderedCaptureViaRuntimeModule(input: {
  sourceUrl: string;
  snapshotRootDirAbs: string;
  executor: RenderedCaptureExecutor;
}): Promise<RenderedCaptureResult> {
  const runtimeImport = Function("specifier", "return import(specifier);") as (
    specifier: string,
  ) => Promise<{ runRenderedCapture: (args: unknown) => Promise<RenderedCaptureResult> }>;
  const module = await runtimeImport("../../import-rendered-capture/rendered-capture-service");
  return module.runRenderedCapture(input);
}

function sha256Hex(input: string | Uint8Array): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, "/");
}

function normalizeSnapshotLocalTargetPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  const normalized = path.posix
    .normalize(trimmed.replaceAll("\\", "/").replace(/^https?:\/\/[^/]+/i, ""))
    .replace(/^(?:\.\/)+/, "")
    .replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) return null;
  return normalized;
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
  if (input.tag === "source") return "image";
  if (input.tag === "object" || input.tag === "embed") return "image";
  if (input.tag === "script") return "script";
  if (input.tag === "link") {
    const relTokens = (input.rel ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (relTokens.includes("stylesheet")) return "stylesheet";
    if (
      relTokens.includes("icon") ||
      relTokens.includes("apple-touch-icon") ||
      relTokens.includes("apple-touch-icon-precomposed") ||
      relTokens.includes("shortcut")
    ) {
      return "image";
    }
    return null;
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

function createSnapshotRunId(input: { requestId?: string }): string {
  const base = input.requestId ? normalizeBasename(input.requestId) : `run-${Date.now()}`;
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base}-${suffix}`;
}

const ENTRY_FETCH_MAX_ATTEMPTS = 2;
const ENTRY_FETCH_TIMEOUT_MS = 12_000;
const ENTRY_FETCH_USER_AGENT = "GNR8-Operator-URL-Import/1.1 (+single-page-reliability)";
const CAPTURE_JOB_MAX_ATTEMPTS = 2;
const CAPTURE_JOB_WAIT_BUDGET_MS = 40_000;

function summarizeCaptureJob(job: RenderedCaptureJobRecord | null): UrlSinglePageImportSnapshot["renderedCaptureReliability"]["job"] {
  if (!job) return null;
  return {
    jobId: job.jobId,
    status: job.status,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    failureClass: job.failureClass,
    failureCode: job.failureCode,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    timeoutBudgetMs: job.timeoutBudgetMs,
    resultSummary: job.resultSummary,
  };
}

function createEntryFetchCandidateUrls(normalizedUrl: URL): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (url: URL) => {
    const value = url.toString();
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };

  push(new URL(normalizedUrl.toString()));

  const host = normalizedUrl.hostname.toLowerCase();
  if (host.startsWith("www.")) {
    const noWww = new URL(normalizedUrl.toString());
    noWww.hostname = host.slice(4);
    push(noWww);
  } else {
    const withWww = new URL(normalizedUrl.toString());
    withWww.hostname = `www.${host}`;
    push(withWww);
  }

  const trailingSlashVariant = new URL(normalizedUrl.toString());
  if (trailingSlashVariant.pathname.endsWith("/") && trailingSlashVariant.pathname !== "/") {
    trailingSlashVariant.pathname = trailingSlashVariant.pathname.replace(/\/+$/, "");
  } else if (!trailingSlashVariant.pathname.endsWith("/")) {
    trailingSlashVariant.pathname = `${trailingSlashVariant.pathname}/`;
  }
  push(trailingSlashVariant);

  return out;
}

function classifyEntryFetchError(error: unknown): "timeout" | "redirect_loop" | "network" {
  const message = String((error as Error)?.message ?? error).toLowerCase();
  if (message.includes("abort") || message.includes("timeout")) return "timeout";
  if (message.includes("redirect")) return "redirect_loop";
  return "network";
}

function toContentSnippet(value: string, maxChars = 500): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function looksLikeHtmlPayload(html: string): boolean {
  const snippet = toContentSnippet(html, 600).toLowerCase();
  return snippet.includes("<html") || snippet.includes("<body") || snippet.includes("<!doctype html") || snippet.includes("<head");
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

function appendRenderedCaptureDiagnostics(input: {
  diagnostics: UrlImportDiagnostic[];
  renderedCapture: RenderedCaptureResult;
}): void {
  for (const item of input.renderedCapture.diagnostics) {
    input.diagnostics.push(
      createDiagnostic({
        severity: item.severity === "error" ? "error" : item.severity,
        code: item.code,
        message: item.message,
        targetUrl: null,
        details: (item.details ?? null) as JsonValue | null,
      }),
    );
  }
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
  const normalizedPathname = normalizeSnapshotLocalTargetPath(decodeURIComponent(u.pathname ?? ""));
  if (input.assetKind === "image" && normalizedPathname) {
    return normalizedPathname;
  }
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

function isSameOriginUrl(resolvedUrl: string, origin: string): boolean {
  try {
    return new URL(resolvedUrl).origin === origin;
  } catch {
    return false;
  }
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

const IMAGE_FILE_EXTENSION_SET = new Set<string>([
  ".apng",
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
]);

const PLACEHOLDER_TOKEN_SET = ["placeholder", "spacer", "blank", "transparent", "loader", "loading"] as const;

const NEAREST_PROMOTION_ANCHOR_MAX_DEPTH = 6;
const HEADER_LOGO_CONTEXT_TOKEN_SET = new Set<string>([
  "brand",
  "header",
  "logo",
  "logotype",
  "masthead",
  "navbar",
  "site-logo",
]);
const IMAGE_WRAPPER_CONTEXT_TOKEN_SET = new Set<string>([
  "figure",
  "gallery",
  "hero",
  "image",
  "lightbox",
  "logo",
  "media",
  "photo",
  "picture",
  "thumbnail",
  "thumb",
]);
const PRIMARY_STYLESHEET_ROLE_TOKEN_SET = new Set<string>(["app", "brand", "global", "main", "site", "style", "styles", "theme"]);

function isImageLikeHrefRef(rawRef: string): boolean {
  const trimmed = rawRef.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase().startsWith("data:image/")) return true;
  try {
    const normalizedPath = new URL(trimmed, "https://example.invalid").pathname;
    const ext = path.posix.extname(normalizedPath.toLowerCase());
    return IMAGE_FILE_EXTENSION_SET.has(ext);
  } catch {
    return false;
  }
}

function isLikelyPlaceholderImageRef(rawRef: string): boolean {
  const trimmed = rawRef.trim().toLowerCase();
  if (!trimmed) return true;
  if (trimmed.startsWith("data:")) return true;
  if (trimmed === "about:blank") return true;
  for (const token of PLACEHOLDER_TOKEN_SET) {
    if (trimmed.includes(token)) return true;
  }
  return false;
}

function stylesheetRoleScore(ref: ParsedAssetRef): number {
  const resolvedUrl = ref.resolvedUrl;
  if (!resolvedUrl) return 0;
  let score = 0;
  try {
    const parsed = new URL(resolvedUrl);
    const pathTokens = tokenizeLower(parsed.pathname);
    for (const token of pathTokens) {
      if (PRIMARY_STYLESHEET_ROLE_TOKEN_SET.has(token)) score += 3;
    }
    if (pathTokens.includes("css") || pathTokens.includes("styles")) score += 2;
    const baseName = path.posix.basename(parsed.pathname || "");
    if (baseName.toLowerCase() === "style.css" || baseName.toLowerCase() === "styles.css") score += 1;
  } catch {
    // Ignore URL parse failures; caller only uses this for resolvable URLs.
  }
  return score;
}

function selectPrimarySiteStylesheetRef(headStylesheetRefs: ParsedAssetRef[]): ParsedAssetRef | null {
  if (headStylesheetRefs.length === 0) return null;
  const ranked = [...headStylesheetRefs].sort((a, b) => {
    const scoreDelta = stylesheetRoleScore(b) - stylesheetRoleScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    if (a.occurrence !== b.occurrence) return a.occurrence - b.occurrence;
    return (a.resolvedUrl ?? "").localeCompare(b.resolvedUrl ?? "");
  });
  return ranked[0] ?? null;
}

function srcsetDescriptorRank(descriptor: string): { rank: number; value: number } {
  const normalized = descriptor.trim().toLowerCase();
  if (!normalized) return { rank: 0, value: 0 };
  const xMatch = normalized.match(/^([0-9]*\.?[0-9]+)x$/);
  if (xMatch) return { rank: 2, value: Number(xMatch[1] ?? "0") };
  const wMatch = normalized.match(/^([0-9]+)w$/);
  if (wMatch) return { rank: 1, value: Number(wMatch[1] ?? "0") };
  return { rank: 0, value: 0 };
}

function selectBestSrcsetToken(tokens: Array<{ url: string; descriptor: string }>): string | null {
  let best: { url: string; descriptor: string } | null = null;
  for (const token of tokens) {
    if (!token.url.trim()) continue;
    if (best === null) {
      best = token;
      continue;
    }
    const a = srcsetDescriptorRank(token.descriptor);
    const b = srcsetDescriptorRank(best.descriptor);
    if (a.rank !== b.rank) {
      if (a.rank > b.rank) best = token;
      continue;
    }
    if (a.value !== b.value) {
      if (a.value > b.value) best = token;
      continue;
    }
    if (token.url.localeCompare(best.url) > 0) best = token;
  }
  return best?.url ?? null;
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
  target.attrs.push({ name, value });
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

function walkDomWithAncestors(
  node: unknown,
  visit: (node: unknown, ancestors: unknown[]) => void,
): void {
  const stack: Array<{ node: unknown; ancestors: unknown[] }> = [{ node, ancestors: [] }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !current.node || typeof current.node !== "object") continue;
    visit(current.node, current.ancestors);
    const nextAncestors = [...current.ancestors, current.node];
    const content = (current.node as { content?: unknown }).content;
    if (content && typeof content === "object") stack.push({ node: content, ancestors: nextAncestors });
    const childNodes = (current.node as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) {
        stack.push({ node: childNodes[i], ancestors: nextAncestors });
      }
    }
  }
}

function findFirstNodeByTag(root: unknown, tagName: string): unknown | null {
  let found: unknown | null = null;
  walkDom(root, (node) => {
    if (found !== null || !isElement(node)) return;
    if (node.tagName.toLowerCase() === tagName) found = node;
  });
  return found;
}

function evaluateRenderedDomQuality(html: string): RenderedDomQuality {
  const trimmed = html.trim();
  if (!trimmed) {
    return {
      quality: "unusable",
      bodyTextLength: 0,
      meaningfulNodeCount: 0,
      sectionCandidateCount: 0,
      hasHeading: false,
      reason: "empty_html",
    };
  }

  let document: unknown;
  try {
    document = parse(trimmed);
  } catch {
    return {
      quality: "unusable",
      bodyTextLength: 0,
      meaningfulNodeCount: 0,
      sectionCandidateCount: 0,
      hasHeading: false,
      reason: "parse_failed",
    };
  }

  const bodyNode = findFirstNodeByTag(document, "body");
  if (!bodyNode) {
    return {
      quality: "unusable",
      bodyTextLength: 0,
      meaningfulNodeCount: 0,
      sectionCandidateCount: 0,
      hasHeading: false,
      reason: "missing_body",
    };
  }

  const NON_MEANINGFUL_TAGS = new Set(["script", "style", "meta", "link", "noscript", "template"]);
  const SECTION_CANDIDATE_TAGS = new Set(["section", "main", "header", "footer", "article", "nav", "aside"]);
  const HEADING_TAGS = new Set(["h1", "h2", "h3"]);

  let meaningfulNodeCount = 0;
  let sectionCandidateCount = 0;
  let hasHeading = false;
  const textParts: string[] = [];

  walkDom(bodyNode, (node) => {
    if (isElement(node)) {
      const tag = node.tagName.toLowerCase();
      if (!NON_MEANINGFUL_TAGS.has(tag)) meaningfulNodeCount += 1;
      if (SECTION_CANDIDATE_TAGS.has(tag)) sectionCandidateCount += 1;
      if (HEADING_TAGS.has(tag)) hasHeading = true;
      return;
    }

    if (
      node &&
      typeof node === "object" &&
      String((node as { nodeName?: string }).nodeName ?? "").toLowerCase() === "#text" &&
      typeof (node as { value?: unknown }).value === "string"
    ) {
      const text = String((node as { value?: string }).value ?? "").replace(/\s+/g, " ").trim();
      if (text) textParts.push(text);
    }
  });

  const bodyTextLength = textParts.join(" ").trim().length;
  const strong = bodyTextLength >= 140 || meaningfulNodeCount >= 18 || sectionCandidateCount >= 2 || hasHeading;
  const weak = bodyTextLength >= 40 || meaningfulNodeCount >= 8 || sectionCandidateCount >= 1;

  if (strong) {
    return {
      quality: "strong",
      bodyTextLength,
      meaningfulNodeCount,
      sectionCandidateCount,
      hasHeading,
      reason: "rendered_dom_has_meaningful_content",
    };
  }

  if (weak) {
    return {
      quality: "weak",
      bodyTextLength,
      meaningfulNodeCount,
      sectionCandidateCount,
      hasHeading,
      reason: "rendered_dom_is_shell_like",
    };
  }

  return {
    quality: "unusable",
    bodyTextLength,
    meaningfulNodeCount,
    sectionCandidateCount,
    hasHeading,
    reason: "rendered_dom_has_insufficient_content",
  };
}

function computeRenderedCaptureVisibilityStatus(input: {
  renderedCapture: RenderedCaptureResult;
  renderedDomQuality: RenderedDomQuality;
}): RenderedCaptureVisibilityStatus {
  if ((input.renderedCapture.status === "failed" || input.renderedCapture.status === "unavailable") && !hasUsableRenderedEvidence(input.renderedCapture)) {
    return "failed";
  }
  if (input.renderedCapture.status === "partial") return "partial";
  const hasDoc = input.renderedCapture.documents.length > 0;
  const hasViewport = input.renderedCapture.screenshots.some((shot) => shot.captureType === "desktop_viewport");
  const hasFullPage = input.renderedCapture.screenshots.some((shot) => shot.captureType === "desktop_fullpage");
  const styleCoverage = input.renderedCapture.computedStyleSamples.length / 10;
  if (hasDoc && hasViewport && hasFullPage && input.renderedDomQuality.quality === "strong" && styleCoverage >= 0.2) return "available";
  return "partial";
}

function buildRenderedCaptureExecutionTruth(input: {
  renderedCapture: RenderedCaptureResult;
  renderedDomQuality: RenderedDomQuality;
}): {
  runtimeKind: "nodejs" | "edge" | "unknown";
  environmentSupported: boolean;
  browserPackageAvailable: boolean;
  browserBinaryAvailable: boolean;
  environmentStatus: "supported" | "unsupported" | "unknown";
  failureCategory: "environment" | "page" | "none";
  failureCode: string | null;
  browserLaunch: "not_attempted" | "succeeded" | "failed";
  navigation: "not_attempted" | "succeeded" | "failed";
  dom: "not_attempted" | "captured" | "empty_or_failed";
  screenshot: "none" | "captured";
  styleSampling: "not_attempted" | "captured" | "failed_or_empty";
} {
  const diagnostics = Array.isArray(input.renderedCapture.diagnostics) ? input.renderedCapture.diagnostics : [];
  const codes = new Set(diagnostics.map((entry) => String(entry.code ?? "").trim()).filter(Boolean));
  const hasCode = (code: string): boolean => codes.has(code);
  const firstCode = (candidates: string[]): string | null => candidates.find((code) => hasCode(code)) ?? null;
  const firstDetails = (code: string): Record<string, unknown> | null => {
    for (const entry of diagnostics) {
      if (entry.code === code && entry.details && typeof entry.details === "object" && !Array.isArray(entry.details)) {
        return entry.details as Record<string, unknown>;
      }
    }
    return null;
  };
  const runtimeProbeDetails = firstDetails("RENDERED_CAPTURE_RUNTIME_ENVIRONMENT");
  const supportDecisionDetails = firstDetails("RENDERED_CAPTURE_SUPPORT_DECISION");
  const packageCheckDetails = firstDetails("PLAYWRIGHT_PACKAGE_CHECK");
  const binaryCheckDetails = firstDetails("PLAYWRIGHT_BINARY_CHECK");
  const runtimeKindRaw =
    normalizeText(supportDecisionDetails?.runtimeKind) || normalizeText(runtimeProbeDetails?.runtimeKind) || normalizeText(runtimeProbeDetails?.runtime);
  const runtimeKind: "nodejs" | "edge" | "unknown" = runtimeKindRaw === "nodejs" || runtimeKindRaw === "edge" ? runtimeKindRaw : "unknown";
  const boolOrNull = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);
  const browserPackageAvailable =
    boolOrNull(packageCheckDetails?.available) ??
    boolOrNull(supportDecisionDetails?.browserPackageAvailable) ??
    !hasCode("ENVIRONMENT_UNSUPPORTED");
  const browserBinaryAvailable =
    boolOrNull(binaryCheckDetails?.available) ??
    boolOrNull(supportDecisionDetails?.browserBinaryAvailable) ??
    false;
  const launchProbeFailureCode = firstCode([
    "PLAYWRIGHT_IMPORT_FAILED",
    "PLAYWRIGHT_BROWSER_LAUNCH_FAILED",
    "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
    "PLAYWRIGHT_LAUNCH_TIMEOUT",
    "PLAYWRIGHT_EXECUTABLE_MISSING",
    "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED",
  ]);

  const environmentStatus: "supported" | "unsupported" | "unknown" =
    Boolean(launchProbeFailureCode) || hasCode("ENVIRONMENT_UNSUPPORTED") || hasCode("RENDERED_CAPTURE_UNAVAILABLE")
      ? "unsupported"
      : hasCode("BROWSER_LAUNCH_SUCCEEDED") || hasCode("NAVIGATION_SUCCEEDED")
        ? "supported"
        : "unknown";
  const environmentSupported =
    boolOrNull(supportDecisionDetails?.supported) ??
    (environmentStatus === "supported" ? true : environmentStatus === "unsupported" ? false : false);
  const browserLaunch: "not_attempted" | "succeeded" | "failed" = hasCode("BROWSER_LAUNCH_FAILED")
    ? "failed"
    : hasCode("BROWSER_LAUNCH_SUCCEEDED")
      ? "succeeded"
      : "not_attempted";
  const navigation: "not_attempted" | "succeeded" | "failed" = hasCode("NAVIGATION_FAILED")
    ? "failed"
    : hasCode("NAVIGATION_SUCCEEDED")
      ? "succeeded"
      : "not_attempted";
  const screenshot: "none" | "captured" = input.renderedCapture.screenshots.length > 0 ? "captured" : "none";
  const dom: "not_attempted" | "captured" | "empty_or_failed" =
    input.renderedCapture.documents.length > 0
      ? "captured"
      : hasCode("DOM_EMPTY_AFTER_RENDER") || hasCode("RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION") || hasCode("NAVIGATION_SUCCEEDED")
        ? "empty_or_failed"
        : "not_attempted";
  const styleSampling: "not_attempted" | "captured" | "failed_or_empty" =
    input.renderedCapture.computedStyleSamples.length > 0
      ? "captured"
      : hasCode("STYLE_SAMPLING_FAILED") || hasCode("RENDERED_CAPTURE_STYLE_SAMPLING_FAILED") || hasCode("STYLE_SAMPLING_STARTED")
        ? "failed_or_empty"
        : "not_attempted";

  if (environmentStatus === "unsupported") {
    return {
      runtimeKind,
      environmentSupported,
      browserPackageAvailable,
      browserBinaryAvailable,
      environmentStatus,
      failureCategory: "environment",
      failureCode:
        launchProbeFailureCode ??
        firstCode([
          "ENVIRONMENT_UNSUPPORTED",
          "RENDERED_CAPTURE_UNAVAILABLE",
        ]),
      browserLaunch,
      navigation,
      dom,
      screenshot,
      styleSampling,
    };
  }

  const pageFailureCode = firstCode([
    "CAPTURE_JOB_TIMED_OUT",
    "RENDERED_CAPTURE_TIMEOUT",
    "BROWSER_LAUNCH_FAILED",
    "RENDERED_CAPTURE_BROWSER_START_FAILED",
    "NAVIGATION_FAILED",
    "BROWSER_NAVIGATION_FAILED",
    "DOM_EMPTY_AFTER_RENDER",
    "RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION",
    "STYLE_SAMPLING_FAILED",
    "RENDERED_CAPTURE_STYLE_SAMPLING_FAILED",
    "SCREENSHOT_FAILED",
    "SCREENSHOT_CAPTURE_FAILED",
  ]);
  const statusIsFailure = input.renderedCapture.status === "failed";
  const failureCategory: "environment" | "page" | "none" = pageFailureCode || statusIsFailure ? "page" : "none";

  return {
    runtimeKind,
    environmentSupported,
    browserPackageAvailable,
    browserBinaryAvailable,
    environmentStatus,
    failureCategory,
    failureCode: failureCategory === "none" ? null : pageFailureCode,
    browserLaunch,
    navigation,
    dom,
    screenshot,
    styleSampling,
  };
}

function buildRenderedQualityBreakdown(html: string): {
  domLength: number;
  textDensity: number;
  nodeCount: number;
  meaningfulNodeRatio: number;
  shellDetected: boolean;
} {
  const trimmed = html.trim();
  if (!trimmed) {
    return {
      domLength: 0,
      textDensity: 0,
      nodeCount: 0,
      meaningfulNodeRatio: 0,
      shellDetected: true,
    };
  }

  let document: unknown;
  try {
    document = parse(trimmed);
  } catch {
    return {
      domLength: trimmed.length,
      textDensity: 0,
      nodeCount: 0,
      meaningfulNodeRatio: 0,
      shellDetected: true,
    };
  }

  const bodyNode = findFirstNodeByTag(document, "body");
  if (!bodyNode) {
    return {
      domLength: trimmed.length,
      textDensity: 0,
      nodeCount: 0,
      meaningfulNodeRatio: 0,
      shellDetected: true,
    };
  }

  const NON_MEANINGFUL_TAGS = new Set(["script", "style", "meta", "link", "noscript", "template"]);
  let nodeCount = 0;
  let meaningfulNodeCount = 0;
  const textParts: string[] = [];
  walkDom(bodyNode, (node) => {
    if (isElement(node)) {
      nodeCount += 1;
      if (!NON_MEANINGFUL_TAGS.has(node.tagName.toLowerCase())) meaningfulNodeCount += 1;
      return;
    }
    if (
      node &&
      typeof node === "object" &&
      String((node as { nodeName?: string }).nodeName ?? "").toLowerCase() === "#text" &&
      typeof (node as { value?: unknown }).value === "string"
    ) {
      const text = String((node as { value?: string }).value ?? "").replace(/\s+/g, " ").trim();
      if (text) textParts.push(text);
    }
  });
  const textLength = textParts.join(" ").length;
  const textDensity = Number((textLength / Math.max(1, trimmed.length)).toFixed(3));
  const meaningfulNodeRatio = Number((meaningfulNodeCount / Math.max(1, nodeCount)).toFixed(3));

  return {
    domLength: trimmed.length,
    textDensity,
    nodeCount,
    meaningfulNodeRatio,
    shellDetected: textLength < 120 && meaningfulNodeCount < 8,
  };
}

function ensureRenderedCaptureArtifacts(input: {
  snapshotRootDirAbs: string;
  renderedCapture: RenderedCaptureResult;
  diagnostics: UrlImportDiagnostic[];
}): {
  renderedDomPathAbs: string;
  computedStylesPathAbs: string;
  viewportScreenshotPathAbs: string | null;
  fullpageScreenshotPathAbs: string | null;
  renderedDomCanonicalPathAbs: string;
  renderedScreenshotCanonicalPathAbs: string | null;
  renderedMetadataPathAbs: string;
} {
  const renderedDirAbs = path.resolve(input.snapshotRootDirAbs, "rendered");
  const screenshotDirAbs = path.resolve(renderedDirAbs, "screenshots");
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  const renderedDomPathAbs = path.resolve(renderedDirAbs, "rendered-dom.html");
  const renderedDomCanonicalPathAbs = path.resolve(renderedDirAbs, "dom.html");
  const computedStylesPathAbs = path.resolve(renderedDirAbs, "computed-styles.json");
  const renderedScreenshotCanonicalPathAbs = path.resolve(renderedDirAbs, "screenshot.png");
  const renderedMetadataPathAbs = path.resolve(renderedDirAbs, "metadata.json");
  const viewportScreenshotPathAbs = path.resolve(screenshotDirAbs, "viewport.png");
  const fullpageScreenshotPathAbs = path.resolve(screenshotDirAbs, "fullpage.png");

  const renderedHtml = input.renderedCapture.documents[0]?.htmlPathAbs
    ? (() => {
        try {
          return fs.readFileSync(input.renderedCapture.documents[0].htmlPathAbs, "utf8");
        } catch {
          return "";
        }
      })()
    : "";
  fs.writeFileSync(renderedDomPathAbs, renderedHtml, "utf8");
  fs.writeFileSync(renderedDomCanonicalPathAbs, renderedHtml, "utf8");

  writeJsonStable(computedStylesPathAbs, {
    kind: "computed_style_sample_collection_v1",
    sampleCount: input.renderedCapture.computedStyleSamples.length,
    coverage: Number((input.renderedCapture.computedStyleSamples.length / 10).toFixed(3)),
    samples: input.renderedCapture.computedStyleSamples,
    diagnostics: input.renderedCapture.diagnostics.map((diag) => diag.code),
  } as unknown as JsonValue);

  const viewportShot = input.renderedCapture.screenshots.find((shot) => shot.captureType === "desktop_viewport");
  const fullpageShot = input.renderedCapture.screenshots.find((shot) => shot.captureType === "desktop_fullpage");
  const viewportCaptured = Boolean(viewportShot?.filePathAbs && fs.existsSync(viewportShot.filePathAbs) && fs.statSync(viewportShot.filePathAbs).size > 0);
  const fullPageCaptured = Boolean(fullpageShot?.filePathAbs && fs.existsSync(fullpageShot.filePathAbs) && fs.statSync(fullpageShot.filePathAbs).size > 0);
  const screenshotCount = Number(viewportCaptured) + Number(fullPageCaptured);
  const renderedEvidenceUsable = renderedHtml.trim().length > 0 || screenshotCount > 0 || input.renderedCapture.computedStyleSamples.length > 0;

  if (viewportCaptured && viewportShot?.filePathAbs) {
    fs.copyFileSync(viewportShot.filePathAbs, viewportScreenshotPathAbs);
  } else if (fs.existsSync(viewportScreenshotPathAbs)) {
    fs.unlinkSync(viewportScreenshotPathAbs);
  }
  if (fullPageCaptured && fullpageShot?.filePathAbs) {
    fs.copyFileSync(fullpageShot.filePathAbs, fullpageScreenshotPathAbs);
  } else if (fs.existsSync(fullpageScreenshotPathAbs)) {
    fs.unlinkSync(fullpageScreenshotPathAbs);
  }

  const canonicalScreenshotSource = viewportCaptured
    ? viewportShot?.filePathAbs ?? null
    : fullPageCaptured
      ? fullpageShot?.filePathAbs ?? null
      : null;
  if (canonicalScreenshotSource) {
    fs.copyFileSync(canonicalScreenshotSource, renderedScreenshotCanonicalPathAbs);
  } else if (fs.existsSync(renderedScreenshotCanonicalPathAbs)) {
    fs.unlinkSync(renderedScreenshotCanonicalPathAbs);
  }

  writeJsonStable(renderedMetadataPathAbs, {
    kind: "rendered_capture_persistence_v1",
    status: input.renderedCapture.status === "available" && renderedEvidenceUsable ? "success" : renderedEvidenceUsable ? "degraded_usable" : input.renderedCapture.status,
    domSize: renderedHtml.trim().length,
    screenshotCount,
    source: "worker",
  } as unknown as JsonValue);

  if (renderedEvidenceUsable) {
    input.diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "RENDERED_ARTIFACT_PERSISTED",
        message: "Rendered artifacts were persisted to canonical run-scoped evidence paths.",
        targetUrl: null,
        details: {
          renderedDomPathAbs: renderedDomCanonicalPathAbs,
          renderedScreenshotPathAbs: canonicalScreenshotSource ? renderedScreenshotCanonicalPathAbs : null,
          renderedMetadataPathAbs,
          domSize: renderedHtml.trim().length,
          screenshotCount,
          computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
        },
      }),
    );
  }

  if ((input.renderedCapture.status === "available" || input.renderedCapture.status === "partial") && renderedEvidenceUsable) {
    input.diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "RENDERED_CAPTURE_PERSISTED",
        message: "Rendered capture artifacts persisted to run-scoped rendered evidence paths.",
        targetUrl: null,
        details: {
          renderedDomPathAbs: renderedDomCanonicalPathAbs,
          renderedScreenshotPathAbs: canonicalScreenshotSource ? renderedScreenshotCanonicalPathAbs : null,
          renderedMetadataPathAbs,
          domSize: renderedHtml.trim().length,
          screenshotCount,
        },
      }),
    );
  }

  if (!renderedEvidenceUsable) {
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "RENDERED_CAPTURE_FAILED",
        message: "Rendered capture artifacts were materialized with diagnostic-only payloads.",
        targetUrl: null,
        details: {
          renderedDomPathAbs,
          computedStylesPathAbs,
          viewportScreenshotPathAbs,
          fullpageScreenshotPathAbs,
        },
      }),
    );
  }

  return {
    renderedDomPathAbs,
    computedStylesPathAbs,
    viewportScreenshotPathAbs: viewportCaptured ? viewportScreenshotPathAbs : null,
    fullpageScreenshotPathAbs: fullPageCaptured ? fullpageScreenshotPathAbs : null,
    renderedDomCanonicalPathAbs,
    renderedScreenshotCanonicalPathAbs: canonicalScreenshotSource ? renderedScreenshotCanonicalPathAbs : null,
    renderedMetadataPathAbs,
  };
}

function buildRenderedCaptureManifest(input: {
  renderedCapture: RenderedCaptureResult;
  renderedDomQuality: RenderedDomQuality;
  renderedDomHtml: string;
  viewportCaptured: boolean;
  fullPageCaptured: boolean;
  screenshotCount: number;
  screenshotPaths: string[];
}): JsonValue {
  const qualityBreakdown = buildRenderedQualityBreakdown(input.renderedDomHtml);
  const status = computeRenderedCaptureVisibilityStatus({
    renderedCapture: input.renderedCapture,
    renderedDomQuality: input.renderedDomQuality,
  });
  const executionTruth = buildRenderedCaptureExecutionTruth({
    renderedCapture: input.renderedCapture,
    renderedDomQuality: input.renderedDomQuality,
  });

  return {
    ...input.renderedCapture,
    legacyStatus: input.renderedCapture.status,
    status,
    quality: input.renderedDomQuality.quality,
    qualityBreakdown,
    styleSampleSummary: {
      totalSamples: 10,
      validSamples: input.renderedCapture.computedStyleSamples.length,
      coverage: Number((input.renderedCapture.computedStyleSamples.length / 10).toFixed(3)),
    },
    screenshotSummary: {
      viewportCaptured: input.viewportCaptured,
      fullPageCaptured: input.fullPageCaptured,
      count: input.screenshotCount,
      paths: input.screenshotPaths,
    },
    executionTruth,
  } as unknown as JsonValue;
}

function hasDescendantTag(root: unknown, tagName: string): boolean {
  let found = false;
  walkDom(root, (node) => {
    if (found || !isElement(node)) return;
    if (node.tagName.toLowerCase() === tagName) found = true;
  });
  return found;
}

function tokenizeLower(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function attrContainsAnyToken(node: unknown, attrNames: readonly string[], tokenSet: Set<string>): boolean {
  for (const attrName of attrNames) {
    const value = getAttr(node, attrName);
    if (!value || !value.trim()) continue;
    const tokens = tokenizeLower(value);
    for (const token of tokens) {
      if (tokenSet.has(token)) return true;
    }
  }
  return false;
}

function hasHeaderOrLogoContext(input: { imgNode: unknown; ancestors: unknown[] }): boolean {
  if (attrContainsAnyToken(input.imgNode, ["alt", "class", "id"], HEADER_LOGO_CONTEXT_TOKEN_SET)) return true;

  for (let i = input.ancestors.length - 1; i >= 0; i--) {
    const ancestor = input.ancestors[i];
    if (!isElement(ancestor)) continue;
    const tag = ancestor.tagName.toLowerCase();
    if (tag === "header" || tag === "nav") return true;
    if (attrContainsAnyToken(ancestor, ["class", "id"], HEADER_LOGO_CONTEXT_TOKEN_SET)) return true;
  }
  return false;
}

function nearestAncestorAnchor(
  ancestors: unknown[],
  maxDepth: number,
): { node: unknown; href: string } | null {
  let depth = 0;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    depth += 1;
    if (depth > maxDepth) break;
    const node = ancestors[i];
    if (!isElement(node) || node.tagName.toLowerCase() !== "a") continue;
    const href = (getAttr(node, "href") ?? "").trim();
    if (!href) continue;
    return { node, href };
  }
  return null;
}

function hasImageWrapperContextTokens(input: { anchorNode: unknown; ancestors: unknown[] }): boolean {
  if (attrContainsAnyToken(input.anchorNode, ["class", "id", "rel"], IMAGE_WRAPPER_CONTEXT_TOKEN_SET)) return true;
  for (let i = input.ancestors.length - 1; i >= 0; i--) {
    const ancestor = input.ancestors[i];
    if (!isElement(ancestor)) continue;
    if (attrContainsAnyToken(ancestor, ["class", "id", "rel"], IMAGE_WRAPPER_CONTEXT_TOKEN_SET)) return true;
  }
  return false;
}

function isDeterministicImageWrapperContext(input: {
  imgNode: unknown;
  ancestors: unknown[];
  anchorNode: unknown;
}): boolean {
  if (hasHeaderOrLogoContext({ imgNode: input.imgNode, ancestors: input.ancestors })) return true;
  return hasImageWrapperContextTokens({ anchorNode: input.anchorNode, ancestors: input.ancestors });
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
    sourceScope?: "head_stylesheet" | "other";
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
      sourceScope: args.sourceScope ?? "other",
    });
  }

  walkDomWithAncestors(input.document, (node, ancestors) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase() as UrlImportAssetTag | string;
    const rel = getAttr(node, "rel");
    const assetKind = assetKindFromNode({ tag, rel });
    if (!assetKind && tag !== "a") {
      if (tag === "link" || tag === "object" || tag === "embed") {
        const href = getAttr(node, "href");
        const data = getAttr(node, "data");
        const src = getAttr(node, "src");
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
        if (data && data.trim()) {
          input.diagnostics.push(
            createDiagnostic({
              severity: "info",
              code: "ASSET_REFERENCE_UNSUPPORTED",
              message: "Skipped unsupported element reference",
              targetUrl: null,
              details: { tag, data, rel: rel ?? "" },
            }),
          );
        }
        if (src && src.trim()) {
          input.diagnostics.push(
            createDiagnostic({
              severity: "info",
              code: "ASSET_REFERENCE_UNSUPPORTED",
              message: "Skipped unsupported element reference",
              targetUrl: null,
              details: { tag, src, rel: rel ?? "" },
            }),
          );
        }
      }
      return;
    }

    if (tag === "a") {
      const href = getAttr(node, "href");
      if (!href || !href.trim()) return;
      const wrapsImage = hasDescendantTag(node, "img") || hasDescendantTag(node, "picture");
      if (!wrapsImage) return;
      if (!isImageLikeHrefRef(href)) return;
      pushRef({
        tag: "a",
        attribute: "href",
        rawRef: href,
        assetKind: "image",
        surface: "gallery_anchor",
      });
      return;
    }

    if (tag === "link") {
      const href = getAttr(node, "href");
      if (!href || !href.trim()) return;
      if (!assetKind) return;
      const inHead = ancestors.some((ancestor) => isElement(ancestor) && ancestor.tagName.toLowerCase() === "head");
      pushRef({
        tag: "link",
        attribute: "href",
        rawRef: href,
        assetKind,
        surface: "direct",
        sourceScope: inHead ? "head_stylesheet" : "other",
      });
      return;
    }

    if (tag === "object") {
      const data = getAttr(node, "data");
      if (!data || !data.trim()) return;
      pushRef({ tag: "object", attribute: "data", rawRef: data, assetKind: "image", surface: "html_object_data" });
      return;
    }

    if (tag === "embed") {
      const src = getAttr(node, "src");
      if (!src || !src.trim()) return;
      pushRef({ tag: "embed", attribute: "src", rawRef: src, assetKind: "image", surface: "html_embed_src" });
      return;
    }

    if (tag === "script") {
      const src = getAttr(node, "src");
      if (!src || !src.trim()) return;
      if (!assetKind) return;
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
        console.info("[raw-import] RAW_IMPORT_SRCSET_ASSET_DISCOVERED", {
          tag,
          attribute: srcsetAttr,
          rawRef: token.url,
        });
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

function resolveFetchedLocalPathForRawRef(input: {
  rawRef: string | null;
  baseUrl: URL;
  localPathByUrl: Map<string, string>;
  fetchOutcomeByUrl: Map<
    string,
    { fetchStatus: "fetched" | "fetch_failed" | "unsupported"; httpStatus: number | null; contentType: string | null; byteLength: number | null }
  >;
}): string | null {
  const rawRef = (input.rawRef ?? "").trim();
  if (!rawRef) return null;

  const [pathPart] = rawRef.split(/[?#]/, 1);
  const normalizedRawLocalPath = normalizeSnapshotLocalTargetPath(pathPart ?? "");
  if (normalizedRawLocalPath) {
    for (const [resolvedUrl, localPath] of [...input.localPathByUrl.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (normalizeSnapshotLocalTargetPath(localPath) !== normalizedRawLocalPath) continue;
      const outcome = input.fetchOutcomeByUrl.get(resolvedUrl);
      if (outcome?.fetchStatus === "fetched") return localPath;
    }
  }

  let resolvedUrl: string | null = null;
  try {
    const resolved = new URL(rawRef, input.baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    resolved.hash = "";
    resolvedUrl = resolved.toString();
  } catch {
    return null;
  }
  const outcome = resolvedUrl ? input.fetchOutcomeByUrl.get(resolvedUrl) : null;
  if (!outcome || outcome.fetchStatus !== "fetched") return null;
  return input.localPathByUrl.get(resolvedUrl) ?? null;
}

function choosePromotedImageLocalPath(input: {
  imgNode: unknown;
  ancestors: unknown[];
  baseUrl: URL;
  localPathByUrl: Map<string, string>;
  fetchOutcomeByUrl: Map<
    string,
    { fetchStatus: "fetched" | "fetch_failed" | "unsupported"; httpStatus: number | null; contentType: string | null; byteLength: number | null }
  >;
}): string | null {
  const primarySrc = (getAttr(input.imgNode, "src") ?? "").trim();
  const srcsetFromPictureSources: string[] = [];
  const parent = input.ancestors[input.ancestors.length - 1];
  if (isElement(parent) && parent.tagName.toLowerCase() === "picture") {
    const childNodes = (parent as { childNodes?: unknown[] }).childNodes ?? [];
    for (const child of childNodes) {
      if (!isElement(child) || child.tagName.toLowerCase() !== "source") continue;
      for (const srcsetAttr of SRCSET_ATTRS) {
        const rawSrcset = getAttr(child, srcsetAttr);
        if (!rawSrcset || !rawSrcset.trim()) continue;
        const best = selectBestSrcsetToken(parseSrcsetTokens(rawSrcset));
        if (best) srcsetFromPictureSources.push(best);
      }
    }
  }

  const imgSrcsetCandidates: string[] = [];
  for (const srcsetAttr of SRCSET_ATTRS) {
    const rawSrcset = getAttr(input.imgNode, srcsetAttr);
    if (!rawSrcset || !rawSrcset.trim()) continue;
    const best = selectBestSrcsetToken(parseSrcsetTokens(rawSrcset));
    if (best) imgSrcsetCandidates.push(best);
  }

  const lazyCandidates: string[] = [];
  for (const lazyAttr of LAZY_IMAGE_ATTR_PRIORITY) {
    const raw = getAttr(input.imgNode, lazyAttr);
    if (!raw || !raw.trim()) continue;
    lazyCandidates.push(raw);
  }

  const nearestAnchor = nearestAncestorAnchor(input.ancestors, NEAREST_PROMOTION_ANCHOR_MAX_DEPTH);
  const primaryIsPlaceholder = isLikelyPlaceholderImageRef(primarySrc);
  const wrapperAnchorHref =
    nearestAnchor && isDeterministicImageWrapperContext({ imgNode: input.imgNode, ancestors: input.ancestors, anchorNode: nearestAnchor.node })
      ? nearestAnchor.href
      : null;

  const pickFirstFetched = (candidates: Array<string | null>): string | null => {
    for (const rawRef of candidates) {
      const localPath = resolveFetchedLocalPathForRawRef({
        rawRef,
        baseUrl: input.baseUrl,
        localPathByUrl: input.localPathByUrl,
        fetchOutcomeByUrl: input.fetchOutcomeByUrl,
      });
      if (localPath) return localPath;
    }
    return null;
  };

  if (!primaryIsPlaceholder) {
    const localPrimary = pickFirstFetched([primarySrc]);
    if (localPrimary) return localPrimary;
  }

  const promoted = pickFirstFetched([
    ...srcsetFromPictureSources,
    ...imgSrcsetCandidates,
    ...lazyCandidates,
    primaryIsPlaceholder ? wrapperAnchorHref : null,
    primaryIsPlaceholder ? primarySrc : null,
  ]);
  if (promoted) return promoted;

  return pickFirstFetched([primarySrc]);
}

type FetchOutcome = {
  fetchStatus: "fetched" | "fetch_failed" | "unsupported";
  httpStatus: number | null;
  contentType: string | null;
  byteLength: number | null;
};

function resolveWorkerFallbackReason(input: {
  job: RenderedCaptureJobRecord | null;
  workerHealth: RenderedCaptureWorkerHealthTruth | null;
}): string {
  const jobFailureCode = String(input.job?.failureCode ?? "").toUpperCase();
  const executionTimedOut =
    jobFailureCode === "RENDERED_CAPTURE_TIMEOUT" ||
    (input.job?.status === "timed_out" && input.workerHealth?.status === "timed_out" && input.workerHealth.reachable);
  const transportTimedOut =
    jobFailureCode === "CAPTURE_JOB_TIMED_OUT" ||
    (input.job?.status === "timed_out" && input.workerHealth?.status === "timed_out" && !input.workerHealth.reachable);
  if (
    executionTimedOut ||
    (input.job?.failureClass === "timeout" && input.workerHealth?.reachable === true)
  ) {
    return "capture_timed_out";
  }
  if (transportTimedOut) return "worker_timeout";
  if (input.job?.status === "failed_terminal") return "capture_failed_terminal";
  if (input.job?.status === "failed_transient") return "capture_failed_transient";
  if (input.job?.status === "queued" || input.job?.status === "running" || input.job?.status === "cancelled") {
    return "capture_pending_or_not_completed";
  }

  if (input.workerHealth && input.workerHealth.enabled === false) return "worker_disabled";
  if (input.workerHealth?.status === "misconfigured") return "worker_not_configured";
  if (input.workerHealth?.status === "unauthorized") return "worker_unauthorized";
  if (input.workerHealth?.status === "timed_out") return "worker_timeout";
  if (input.workerHealth?.status === "unreachable") return "worker_unreachable";
  if (input.workerHealth?.status === "execution_failed") return "worker_execution_failed";
  if (input.workerHealth && (!input.workerHealth.reachable || !input.workerHealth.queueHealthy || !input.workerHealth.browserAvailable)) {
    return "worker_unhealthy";
  }
  return "rendered_capture_unusable";
}

function hasWorkerPhaseCompletion(response: {
  diagnostics?: Array<{ code?: string; details?: unknown }>;
}): boolean {
  const diagnostics = Array.isArray(response.diagnostics) ? response.diagnostics : [];
  return diagnostics.some((entry) => {
    const code = String(entry?.code ?? "").trim();
    if (code === "CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED") return true;
    if (code === "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_COMPLETED") return true;
    if (!entry?.details || typeof entry.details !== "object" || Array.isArray(entry.details)) return false;
    return (entry.details as { phasesCompleted?: unknown }).phasesCompleted === true;
  });
}

function hasWorkerNavigationSuccess(response: {
  diagnostics?: Array<{ code?: string; details?: unknown }>;
}): boolean {
  const diagnostics = Array.isArray(response.diagnostics) ? response.diagnostics : [];
  return diagnostics.some((entry) => {
    const code = String(entry?.code ?? "").trim();
    if (code === "NAVIGATION_SUCCEEDED") return true;
    if (!entry?.details || typeof entry.details !== "object" || Array.isArray(entry.details)) return false;
    return String((entry.details as { navigationStatus?: unknown }).navigationStatus ?? "").trim().toLowerCase() === "navigation_succeeded";
  });
}

function hasRenderedCaptureSuccessSignal(input: {
  status: RenderedCaptureResult["status"];
  diagnostics: RenderedCaptureResult["diagnostics"];
}): boolean {
  if (input.status === "available" || input.status === "partial") return true;
  const successCodes = new Set([
    "NAVIGATION_SUCCEEDED",
    "CAPTURE_JOB_COMPLETED",
    "CAPTURE_JOB_COMPLETED_PARTIAL",
    "CAPTURE_PHASE_STABILIZATION_COMPLETED",
    "CAPTURE_PHASE_DOM_SERIALIZATION_COMPLETED",
    "CAPTURE_PHASE_SCREENSHOT_VIEWPORT_COMPLETED",
    "CAPTURE_PHASE_STYLE_SAMPLING_COMPLETED",
    "CAPTURE_PHASE_SCREENSHOT_FULLPAGE_COMPLETED",
    "CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_COMPLETED",
    "CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED",
    "WORKER_SUCCESS_RESPONSE_ACCEPTED",
    "WORKER_SUCCESS_PARTIAL_RENDER_ACCEPTED",
  ]);
  return (Array.isArray(input.diagnostics) ? input.diagnostics : []).some((entry) => successCodes.has(String(entry.code ?? "").trim()));
}

function hasUsableRenderedEvidence(renderedCapture: RenderedCaptureResult): boolean {
  return renderedCapture.documents.length > 0 || renderedCapture.screenshots.length > 0 || renderedCapture.computedStyleSamples.length > 0;
}

function isStylesheetLinkElement(node: unknown): boolean {
  if (!isElement(node) || node.tagName.toLowerCase() !== "link") return false;
  const rel = getAttr(node, "rel");
  if (!rel) return false;
  const relTokens = rel
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return relTokens.includes("stylesheet");
}

function normalizeStylesheetHrefToLocalPath(rawHref: string | null): string | null {
  const href = (rawHref ?? "").trim();
  if (!href) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  const [pathPart] = href.split(/[?#]/, 1);
  return normalizeSnapshotLocalTargetPath(pathPart ?? "");
}

function preferPrimaryStylesheetInHead(input: { document: unknown; primaryStylesheetLocalPath: string }): boolean {
  let headNode: unknown = null;
  walkDom(input.document, (node) => {
    if (headNode || !isElement(node)) return;
    if (node.tagName.toLowerCase() === "head") headNode = node;
  });
  if (!headNode || typeof headNode !== "object") return false;

  const headChildren = (headNode as { childNodes?: unknown[] }).childNodes;
  if (!Array.isArray(headChildren) || headChildren.length === 0) return false;

  const stylesheetEntries: Array<{ childIndex: number; localPath: string | null }> = [];
  for (let i = 0; i < headChildren.length; i++) {
    const child = headChildren[i];
    if (!isStylesheetLinkElement(child)) continue;
    stylesheetEntries.push({
      childIndex: i,
      localPath: normalizeStylesheetHrefToLocalPath(getAttr(child, "href")),
    });
  }
  if (stylesheetEntries.length === 0) return false;

  const primaryLocalPath = normalizeSnapshotLocalTargetPath(input.primaryStylesheetLocalPath);
  if (!primaryLocalPath) return false;

  const firstStylesheet = stylesheetEntries[0]!;
  const primaryEntry = stylesheetEntries.find((entry) => entry.localPath === primaryLocalPath);
  if (!primaryEntry) return false;

  // Narrowed regression-safe preference rule:
  // - never reorder when first stylesheet is already local/exportable
  // - only promote selected primary when first stylesheet is remote/data/non-local
  if (firstStylesheet.localPath !== null) {
    return firstStylesheet.localPath === primaryLocalPath;
  }

  if (primaryEntry.childIndex !== firstStylesheet.childIndex) {
    const [primaryNode] = headChildren.splice(primaryEntry.childIndex, 1);
    if (typeof primaryNode !== "undefined") headChildren.splice(firstStylesheet.childIndex, 0, primaryNode);
  }

  const updatedChildren = (headNode as { childNodes?: unknown[] }).childNodes;
  if (!Array.isArray(updatedChildren)) return false;
  for (const child of updatedChildren) {
    if (!isStylesheetLinkElement(child)) continue;
    return normalizeStylesheetHrefToLocalPath(getAttr(child, "href")) === primaryLocalPath;
  }
  return false;
}

function writeJsonStable(absPath: string, value: JsonValue): void {
  fs.writeFileSync(absPath, `${stableStringify(value)}\n`, "utf8");
}

function resolveSourceSelection(input: {
  diagnostics: UrlImportDiagnostic[];
  entryHtml: string;
  responseHtmlPathAbs: string;
  renderedCapture: RenderedCaptureResult;
}): {
  sourceMode: UrlImportSourceMode;
  fidelityStatus: UrlImportFidelityStatus;
  selectedSourceHtmlPathAbs: string;
  selectedHtml: string;
  renderedDomQuality: RenderedDomQuality;
  rawHtmlQuality: RenderedDomQuality;
  degraded: boolean;
} {
  const rawHtml = input.entryHtml;
  const rawHtmlQuality = evaluateRenderedDomQuality(rawHtml);
  const renderedDomPathAbs = input.renderedCapture.documents[0]?.htmlPathAbs ?? "";

  const renderedHtml = (() => {
    if (!renderedDomPathAbs) return "";
    try {
      return fs.readFileSync(renderedDomPathAbs, "utf8");
    } catch {
      return "";
    }
  })();
  const renderedDomQuality = evaluateRenderedDomQuality(renderedHtml);
  const workerStatusSuccessful = hasRenderedCaptureSuccessSignal({
    status: input.renderedCapture.status,
    diagnostics: input.renderedCapture.diagnostics,
  });
  const workerSuccessWithEvidence = workerStatusSuccessful && hasUsableRenderedEvidence(input.renderedCapture);
  const hasRenderedDomArtifact = renderedDomPathAbs.length > 0 && renderedHtml.trim().length > 0;
  const hasScreenshotEvidence = input.renderedCapture.screenshots.length > 0;
  const hasStyleEvidence = input.renderedCapture.computedStyleSamples.length > 0;
  const renderedDomUsableForSource =
    hasRenderedDomArtifact && (renderedDomQuality.quality !== "unusable" || hasScreenshotEvidence || hasStyleEvidence);

  if (workerSuccessWithEvidence && renderedDomUsableForSource) {
    const highFidelity = renderedDomQuality.quality === "strong" && input.renderedCapture.status === "available";
    input.diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "RENDERED_PRIMARY_SELECTED_AFTER_SUCCESS",
        message: "Rendered capture selected as primary source after worker success hydration.",
        targetUrl: null,
        details: {
          renderedCaptureStatus: input.renderedCapture.status,
          renderedDocumentCount: input.renderedCapture.documents.length,
          screenshotCount: input.renderedCapture.screenshots.length,
          computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
        },
      }),
    );
    if (!highFidelity) {
      input.diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "RENDERED_SUCCESS_DEGRADED_BUT_USABLE",
          message: "Rendered capture success remained usable but required degraded fidelity mode.",
          targetUrl: null,
          details: {
            renderedCaptureStatus: input.renderedCapture.status,
            renderedDomQuality: renderedDomQuality.quality,
            screenshotCount: input.renderedCapture.screenshots.length,
            computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
          },
        }),
      );
      input.diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "IMPORT_FIDELITY_DEGRADED",
          message: "Rendered capture was accepted as source, but import fidelity remains degraded.",
          targetUrl: null,
          details: {
            sourceMode: "rendered_dom",
            renderedCaptureStatus: input.renderedCapture.status,
            renderedDomQuality: renderedDomQuality.quality,
            screenshotCount: input.renderedCapture.screenshots.length,
            computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
          },
        }),
      );
      if (renderedDomQuality.quality !== "strong") {
        input.diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "RENDERED_DOM_EMPTY_OR_WEAK",
            message: "Rendered DOM was accepted in degraded mode because stronger fidelity signals were not available.",
            targetUrl: null,
            details: {
              renderedDomQuality,
              screenshotCount: input.renderedCapture.screenshots.length,
              computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
            },
          }),
        );
      }
    }
    return {
      sourceMode: "rendered_dom",
      fidelityStatus: highFidelity ? "high_fidelity_import" : "degraded_import",
      selectedSourceHtmlPathAbs: renderedDomPathAbs,
      selectedHtml: renderedHtml,
      renderedDomQuality,
      rawHtmlQuality,
      degraded: !highFidelity,
    };
  }

  if (workerSuccessWithEvidence) {
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "RAW_FALLBACK_REJECTED_RENDERED_SUCCESS_EXISTS",
        message: "Raw fallback remained selected even though worker success contained rendered evidence.",
        targetUrl: null,
        details: {
          renderedCaptureStatus: input.renderedCapture.status,
          renderedDocumentCount: input.renderedCapture.documents.length,
          screenshotCount: input.renderedCapture.screenshots.length,
          computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
          renderedDomUsableForSource,
        },
      }),
    );
  }
  if (workerStatusSuccessful && !hasUsableRenderedEvidence(input.renderedCapture)) {
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "WORKER_SUCCESS_RESPONSE_REJECTED",
        message: "Worker success signal rejected because no usable rendered evidence could be hydrated.",
        targetUrl: null,
        details: {
          renderedCaptureStatus: input.renderedCapture.status,
          renderedDocumentCount: input.renderedCapture.documents.length,
          screenshotCount: input.renderedCapture.screenshots.length,
          computedStyleSampleCount: input.renderedCapture.computedStyleSamples.length,
          reason: "no_usable_rendered_evidence",
        },
      }),
    );
  }

  input.diagnostics.push(
    createDiagnostic({
      severity: "warning",
      code: "RENDERED_DOM_REQUIRED_BUT_UNAVAILABLE",
      message: "Rendered DOM could not be used as authoritative source; raw HTML fallback policy engaged.",
      targetUrl: null,
      details: {
        renderedCaptureStatus: input.renderedCapture.status,
        renderedDocumentCount: input.renderedCapture.documents.length,
        renderedDomQuality: renderedDomQuality.quality,
      },
    }),
  );

  if (renderedHtml.trim().length > 0 && renderedDomQuality.quality !== "strong") {
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "RENDERED_DOM_EMPTY_OR_WEAK",
        message: "Rendered DOM artifact exists but appears shell-like or weak; not used as primary import source.",
        targetUrl: null,
        details: {
          renderedDomQuality,
        },
      }),
    );
  }

  if (rawHtml.trim().length > 0 && rawHtmlQuality.quality !== "unusable") {
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "RAW_HTML_FALLBACK_USED",
        message: "Import continued in degraded mode using raw HTML fallback.",
        targetUrl: null,
        details: {
          renderedCaptureStatus: input.renderedCapture.status,
          renderedDomQuality: renderedDomQuality.quality,
          rawHtmlQuality: rawHtmlQuality.quality,
        },
      }),
    );
    input.diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "IMPORT_FIDELITY_DEGRADED",
        message: "Import fidelity degraded because rendered DOM authority was unavailable or weak.",
        targetUrl: null,
        details: {
          sourceMode: "raw_html_fallback",
          renderedCaptureStatus: input.renderedCapture.status,
          renderedDomQuality: renderedDomQuality.quality,
          rawHtmlQuality: rawHtmlQuality.quality,
        },
      }),
    );
    if (rawHtmlQuality.quality === "weak") {
      input.diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "RAW_HTML_WEAK_BUT_USABLE",
          message: "Raw HTML appears shell-like but remains minimally usable as degraded fallback source.",
          targetUrl: null,
          details: {
            rawHtmlQuality,
          },
        }),
      );
    }

    return {
      sourceMode: "raw_html_fallback",
      fidelityStatus: input.renderedCapture.status === "failed" ? "capture_failed" : "degraded_import",
      selectedSourceHtmlPathAbs: input.responseHtmlPathAbs,
      selectedHtml: rawHtml,
      renderedDomQuality,
      rawHtmlQuality,
      degraded: true,
    };
  }

  input.diagnostics.push(
    createDiagnostic({
      severity: "fatal",
      code: "NO_USABLE_IMPORT_SOURCE",
      message: "Import failed because neither rendered DOM nor raw HTML provided usable page content.",
      targetUrl: null,
      details: {
        renderedCaptureStatus: input.renderedCapture.status,
        renderedDomQuality: renderedDomQuality.quality,
        rawHtmlQuality: rawHtmlQuality.quality,
      },
    }),
  );

  return {
    sourceMode: "raw_html_fallback",
    fidelityStatus: "capture_failed",
    selectedSourceHtmlPathAbs: input.responseHtmlPathAbs,
    selectedHtml: "",
    renderedDomQuality,
    rawHtmlQuality,
    degraded: true,
  };
}

export async function importPublicSinglePageUrlToSnapshot(input: {
  sourceUrl: string;
  snapshotRootDirAbs?: string;
  snapshotRunId?: string;
  requestId?: string;
  fetchImpl?: FetchLike;
  renderedCaptureExecutor?: RenderedCaptureExecutor;
  renderedCaptureWorkerClient?: RenderedCaptureWorkerClient;
}): Promise<UrlSinglePageImportSnapshot> {
  const diagnostics: UrlImportDiagnostic[] = [];
  const fetchManifest: UrlImportFetchManifestEntry[] = [];
  const snapshotBase = resolveUrlImportSnapshotRootDirAbs(input.snapshotRootDirAbs);

  const normalizedUrl = normalizeInputPublicUrl(input.sourceUrl);
  if (!normalizedUrl) {
    diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "SITE_IMPORT_INTAKE_STARTED",
        message: "Site import intake started.",
        targetUrl: input.sourceUrl,
        details: null,
      }),
    );
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
    const renderedCapture: RenderedCaptureResult = {
      kind: "rendered_capture_result_v1",
      version: "1.0.0",
      status: "unavailable",
      sourceMode: "raw_html",
      documents: [],
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics: [],
    };
    return {
      kind: "url_single_page_import_snapshot_v1",
      snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
      sourceUrl: input.sourceUrl,
      normalizedUrl: "",
      snapshotId: "imported-url-site-invalid",
      snapshotRunId: "invalid-run",
      requestId: null,
      snapshotStableRootDirAbs: path.resolve(snapshotBase, "imported-url-site-invalid"),
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
      captureMode: "raw_html_only",
      sourceMode: "raw_html_fallback",
      sourceSelection: {
        sourceMode: "raw_html_fallback",
        fidelityStatus: "capture_failed",
        selectedSourceHtmlPathAbs: "",
        renderedDomQuality: {
          quality: "unusable",
          bodyTextLength: 0,
          meaningfulNodeCount: 0,
          sectionCandidateCount: 0,
          hasHeading: false,
          reason: "invalid_input_url",
        },
        rawHtmlQuality: {
          quality: "unusable",
          bodyTextLength: 0,
          meaningfulNodeCount: 0,
          sectionCandidateCount: 0,
          hasHeading: false,
          reason: "invalid_input_url",
        },
        degraded: true,
      },
      responseHtmlPathAbs: "",
      entryHtmlPathAbs: "",
      assetsDirAbs: "",
      renderedCapture,
      renderedCaptureReliability: {
        job: null,
        workerHealth: null,
      },
      importDiagnostics: {
        summary: summarizeDiagnostics(emptyIssues),
        issues: emptyIssues,
      },
      importIntake: {
        ok: false,
        reasonCode: "invalid_url",
        diagnostics: [...new Set(emptyIssues.map((issue) => issue.code))],
        rawHtmlAvailable: false,
        htmlByteLength: 0,
        evidence: {
          requestedUrl: input.sourceUrl,
          finalUrl: null,
          httpStatus: null,
          contentType: null,
          htmlByteLength: 0,
          assetCount: 0,
        },
      },
      fetchManifest: [],
    };
  }

  const normalizedHref = normalizedUrl.toString();
  const snapshotId = snapshotIdForNormalizedUrl(normalizedHref);
  const snapshotRunId = normalizeText(input.snapshotRunId) || createSnapshotRunId({ requestId: input.requestId });
  const snapshotStableRootDirAbs = path.resolve(snapshotBase, snapshotId);
  const snapshotRootDirAbs = path.resolve(snapshotStableRootDirAbs, "runs", snapshotRunId);
  const responseHtmlPathAbs = path.resolve(snapshotRootDirAbs, "response-html.raw.html");
  const entryHtmlPathAbs = path.resolve(snapshotRootDirAbs, "index.html");
  const assetsDirAbs = path.resolve(snapshotRootDirAbs, "assets");
  const renderedCaptureManifestPathAbs = path.resolve(snapshotRootDirAbs, "rendered-capture.json");
  const entryResponseSnippetPathAbs = path.resolve(snapshotRootDirAbs, "entry-response-snippet.txt");
  const acquisitionEvidencePathAbs = path.resolve(snapshotRootDirAbs, "acquisition-evidence.json");

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

  const snapshotRunsDirAbs = path.resolve(snapshotStableRootDirAbs, "runs");
  const previousRuns = fs.existsSync(snapshotRunsDirAbs)
    ? fs
        .readdirSync(snapshotRunsDirAbs, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((value) => value !== snapshotRunId)
        .sort((a, b) => a.localeCompare(b))
    : [];

  fs.mkdirSync(snapshotRootDirAbs, { recursive: true });
  fs.rmSync(snapshotRootDirAbs, { recursive: true, force: true });
  fs.mkdirSync(snapshotRootDirAbs, { recursive: true });
  fs.mkdirSync(assetsDirAbs, { recursive: true });

  diagnostics.push(
    createDiagnostic({
      severity: "info",
      code: "IMPORT_RUN_ID_CREATED",
      message: "Import execution run identity created for this URL snapshot execution.",
      targetUrl: null,
      details: {
        snapshotId,
        snapshotRunId,
        requestId: input.requestId ?? null,
      },
    }),
  );
  diagnostics.push(
    createDiagnostic({
      severity: "info",
      code: "SITE_IMPORT_INTAKE_STARTED",
      message: "Site import intake started.",
      targetUrl: normalizedHref,
      details: { snapshotId, snapshotRunId },
    }),
  );
  diagnostics.push(
    createDiagnostic({
      severity: "info",
      code: "EVIDENCE_RUN_ISOLATED",
      message: "Import evidence path is isolated to a run-specific directory.",
      targetUrl: null,
      details: {
        snapshotStableRootDirAbs,
        snapshotRunRootDirAbs: snapshotRootDirAbs,
      },
    }),
  );
  if (previousRuns.length > 0) {
    diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "STALE_EVIDENCE_SUPERSEDED",
        message: "Previous run evidence exists and is superseded by the current run-scoped evidence.",
        targetUrl: null,
        details: {
          snapshotId,
          snapshotRunId,
          previousRunCount: previousRuns.length,
          latestPreviousRunId: previousRuns[previousRuns.length - 1] ?? null,
        },
      }),
    );
  }

  const fetcher = input.fetchImpl ?? fetch;
  let renderedCapture: RenderedCaptureResult = {
    kind: "rendered_capture_result_v1",
    version: "1.0.0",
    status: "unavailable",
    sourceMode: "raw_html",
    documents: [],
    screenshots: [],
    computedStyleSamples: [],
    renderedObservedAssetUrls: [],
    diagnostics: [],
  };
  let renderedCaptureDurationMs = 0;
  let renderedCaptureAttempted = false;
  let renderedCaptureViaWorker = false;
  let renderedCaptureJob: RenderedCaptureJobRecord | null = null;
  let renderedCaptureWorkerHealth: RenderedCaptureWorkerHealthTruth | null = null;
  let workerEnabled = true;
  let renderedDomPathAbs: string | null = null;
  let computedStylesPathAbs: string | null = null;
  let viewportScreenshotPathAbs: string | null = null;
  let fullpageScreenshotPathAbs: string | null = null;

  const entryFetchCandidates = createEntryFetchCandidateUrls(normalizedUrl);
  const entryFetchAttemptDetails: Array<{
    url: string;
    attempt: number;
    status: number | null;
    contentType: string | null;
    outcome: "success" | "non_ok" | "timeout" | "redirect_loop" | "network_error" | "empty_body" | "unsupported_content_type";
    durationMs: number;
    error: string | null;
  }> = [];

  let entryHtml = "";
  let entryFetchUrlUsed: string | null = null;
  let lastSuccessfulResponseContentType: string | null = null;
  let lastSuccessfulStatus: number | null = null;
  let finalResponseUrl: string | null = null;

  outer: for (const candidateUrl of entryFetchCandidates) {
    for (let attempt = 1; attempt <= ENTRY_FETCH_MAX_ATTEMPTS; attempt++) {
      diagnostics.push(
        createDiagnostic({
          severity: "info",
          code: "SITE_IMPORT_URL_FETCH_STARTED",
          message: "Site import URL fetch attempt started.",
          targetUrl: candidateUrl,
          details: { attempt },
        }),
      );
      const startedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ENTRY_FETCH_TIMEOUT_MS);

      try {
        const response = await fetcher(candidateUrl, {
          method: "GET",
          cache: "no-store",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "user-agent": ENTRY_FETCH_USER_AGENT,
          },
        });
        clearTimeout(timer);

        const contentType = safeContentType(response.headers.get("content-type"));
        if (!response.ok) {
          entryFetchAttemptDetails.push({
            url: candidateUrl,
            attempt,
            status: response.status,
            contentType,
            outcome: "non_ok",
            durationMs: Date.now() - startedAt,
            error: null,
          });
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_FETCH_NON_OK",
              message: "Entry URL attempt returned non-success status",
              targetUrl: candidateUrl,
              details: { attempt, status: response.status, statusText: response.statusText },
            }),
          );
          continue;
        }

        const body = await response.text();
        const htmlLikeByType = isHtmlResponse(contentType);
        const htmlLikeByBody = looksLikeHtmlPayload(body);
        if (!htmlLikeByType && !htmlLikeByBody) {
          entryFetchAttemptDetails.push({
            url: candidateUrl,
            attempt,
            status: response.status,
            contentType,
            outcome: "unsupported_content_type",
            durationMs: Date.now() - startedAt,
            error: null,
          });
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_FETCH_UNSUPPORTED_CONTENT_TYPE",
              message: "Entry fetch returned unsupported content-type and non-HTML body",
              targetUrl: candidateUrl,
              details: { attempt, contentType, snippet: toContentSnippet(body) },
            }),
          );
          continue;
        }

        if (!htmlLikeByType && htmlLikeByBody) {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_FETCH_UNSUPPORTED_CONTENT_TYPE",
              message: "Entry fetch content-type is non-HTML but body appears HTML-like; accepting with degraded confidence.",
              targetUrl: candidateUrl,
              details: { attempt, contentType },
            }),
          );
        }

        if (!body.trim()) {
          entryFetchAttemptDetails.push({
            url: candidateUrl,
            attempt,
            status: response.status,
            contentType,
            outcome: "empty_body",
            durationMs: Date.now() - startedAt,
            error: null,
          });
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_EMPTY_RESPONSE",
              message: "Entry HTML response body is empty",
              targetUrl: candidateUrl,
              details: { attempt },
            }),
          );
          continue;
        }

        entryFetchAttemptDetails.push({
          url: candidateUrl,
          attempt,
          status: response.status,
          contentType,
          outcome: "success",
          durationMs: Date.now() - startedAt,
          error: null,
        });
        entryHtml = body;
        entryFetchUrlUsed = candidateUrl;
        lastSuccessfulResponseContentType = contentType;
        lastSuccessfulStatus = response.status;
        finalResponseUrl = response.url || candidateUrl;
        diagnostics.push(
          createDiagnostic({
            severity: "info",
            code: "SITE_IMPORT_HTML_RECEIVED",
            message: "Site import received HTML payload.",
            targetUrl: candidateUrl,
            details: {
              attempt,
              finalUrl: finalResponseUrl,
              httpStatus: response.status,
              contentType,
              htmlByteLength: Buffer.byteLength(body, "utf8"),
            },
          }),
        );
        break outer;
      } catch (error) {
        clearTimeout(timer);
        const classification = classifyEntryFetchError(error);
        entryFetchAttemptDetails.push({
          url: candidateUrl,
          attempt,
          status: null,
          contentType: null,
          outcome: classification === "timeout" ? "timeout" : classification === "redirect_loop" ? "redirect_loop" : "network_error",
          durationMs: Date.now() - startedAt,
          error: String((error as Error)?.message ?? error),
        });
        if (classification === "timeout") {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "SITE_IMPORT_URL_FETCH_FAILED",
              message: "Site import URL fetch attempt failed.",
              targetUrl: candidateUrl,
              details: { attempt, classification, error: String((error as Error)?.message ?? error) },
            }),
          );
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_FETCH_TIMEOUT",
              message: "Entry fetch attempt timed out",
              targetUrl: candidateUrl,
              details: { attempt, timeoutMs: ENTRY_FETCH_TIMEOUT_MS, error: String((error as Error)?.message ?? error) },
            }),
          );
        } else if (classification === "redirect_loop") {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "SITE_IMPORT_URL_FETCH_FAILED",
              message: "Site import URL fetch attempt failed.",
              targetUrl: candidateUrl,
              details: { attempt, classification, error: String((error as Error)?.message ?? error) },
            }),
          );
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_FETCH_REDIRECT_LOOP",
              message: "Entry fetch encountered redirect loop or redirect failure",
              targetUrl: candidateUrl,
              details: { attempt, error: String((error as Error)?.message ?? error) },
            }),
          );
        } else {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "SITE_IMPORT_URL_FETCH_FAILED",
              message: "Site import URL fetch attempt failed.",
              targetUrl: candidateUrl,
              details: { attempt, classification, error: String((error as Error)?.message ?? error) },
            }),
          );
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "ENTRY_FETCH_FAILED",
              message: "Entry fetch attempt failed due to network/TLS/runtime error",
              targetUrl: candidateUrl,
              details: { attempt, error: String((error as Error)?.message ?? error) },
            }),
          );
        }
      }
    }
  }

  if (!entryHtml.trim()) {
    diagnostics.push(
      createDiagnostic({
        severity: "fatal",
        code: "SITE_IMPORT_HTML_EMPTY",
        message: "Site import HTML payload is empty.",
        targetUrl: normalizedHref,
        details: {
          candidatesTried: entryFetchCandidates,
          attempts: entryFetchAttemptDetails,
        },
      }),
    );
    diagnostics.push(
      createDiagnostic({
        severity: "fatal",
        code: "SITE_IMPORT_INTAKE_FAILED",
        message: "Site import intake failed.",
        targetUrl: normalizedHref,
        details: { reasonCode: "fetch_failed" },
      }),
    );
    diagnostics.push(
      createDiagnostic({
        severity: "fatal",
        code: "ENTRY_FETCH_FAILED",
        message: "Failed to fetch usable entry HTML after bounded retries and URL normalization candidates.",
        targetUrl: normalizedHref,
        details: {
          candidatesTried: entryFetchCandidates,
          attempts: entryFetchAttemptDetails,
        },
      }),
    );
  }

  fs.writeFileSync(responseHtmlPathAbs, entryHtml, "utf8");
  fs.writeFileSync(entryResponseSnippetPathAbs, `${toContentSnippet(entryHtml, 2000)}\n`, "utf8");

  if (!hasFatal(diagnostics) && entryHtml) {
    renderedCaptureAttempted = true;
    const captureStartedAt = Date.now();
    if (input.renderedCaptureExecutor) {
      renderedCapture = await runRenderedCaptureViaRuntimeModule({
        sourceUrl: entryFetchUrlUsed ?? normalizedHref,
        snapshotRootDirAbs,
        executor: input.renderedCaptureExecutor,
      });
    } else {
      renderedCaptureViaWorker = true;
      const workerClient =
        input.renderedCaptureWorkerClient ??
        (() => {
          const config = resolveRenderedCaptureWorkerClientConfigFromEnv();
          workerEnabled = config.enabled;
          return createRenderedCaptureWorkerClientFromEnv();
        })();
      const workerRequest = createRenderedCaptureWorkerRequest({
        requestId: input.requestId ?? `capture-worker-${snapshotId}`,
        importId: `${snapshotId}:${snapshotRunId}`,
        sourceUrl: entryFetchUrlUsed ?? normalizedHref,
        viewport: DEFAULT_RENDERED_CAPTURE_VIEWPORT,
        readinessPolicy: DEFAULT_RENDERED_CAPTURE_READINESS_POLICY,
        timeoutBudgetMs: DEFAULT_RENDERED_CAPTURE_READINESS_POLICY.maxTotalCaptureMs,
      });
      diagnostics.push(
        createDiagnostic({
          severity: "info",
          code: "CAPTURE_WORKER_REQUEST_BUILT",
          message: "Rendered capture worker request built for scoped import execution.",
          targetUrl: null,
          details: {
            snapshotId,
            snapshotRunId,
            requestId: workerRequest.requestId,
            importId: workerRequest.importId,
            sourceUrl: workerRequest.sourceUrl,
          },
        }),
      );
      const orchestrator = new FileBackedRenderedCaptureJobOrchestrator({
        rootDirAbs: path.resolve(snapshotRootDirAbs, "rendered-capture-jobs"),
      });
      const submittedJob = orchestrator.submitJob({
        jobId: `${workerRequest.requestId}-job`,
        request: workerRequest,
        timeoutBudgetMs: workerRequest.capture.timeoutBudgetMs,
        maxAttempts: CAPTURE_JOB_MAX_ATTEMPTS,
        correlation: {
          importId: workerRequest.importId,
          siteId: null,
          snapshotId,
          sourceUrl: workerRequest.sourceUrl,
        },
      });
      renderedCaptureJob = submittedJob;

      const runResult = await orchestrator.runJob({
        jobId: submittedJob.jobId,
        workerClient,
        waitBudgetMs: CAPTURE_JOB_WAIT_BUDGET_MS,
        workerEnabled,
      });
      renderedCaptureJob = runResult.job;
      renderedCaptureWorkerHealth = runResult.health;
      if (runResult.health.status !== "healthy") {
        const healthCode: UrlImportDiagnosticCode =
          runResult.health.status === "disabled"
            ? "CAPTURE_WORKER_DISABLED"
            : runResult.health.status === "misconfigured"
              ? "CAPTURE_WORKER_NOT_CONFIGURED"
              : runResult.health.status === "unauthorized"
                ? "CAPTURE_WORKER_UNAUTHORIZED"
                : runResult.health.status === "timed_out"
                  ? "CAPTURE_WORKER_TIMEOUT"
                  : "CAPTURE_WORKER_HEALTH_UNAVAILABLE";
        const healthMessage =
          runResult.health.status === "disabled"
            ? "Rendered capture worker is disabled for this runtime."
            : runResult.health.status === "misconfigured"
              ? "Rendered capture worker is misconfigured for this runtime."
              : runResult.health.status === "unauthorized"
                ? "Rendered capture worker authorization failed."
                : runResult.health.status === "timed_out"
                  ? "Rendered capture worker request timed out."
                  : "Rendered capture worker health indicates degraded availability.";
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: healthCode,
            message: healthMessage,
            targetUrl: null,
            details: {
              status: runResult.health.status,
              reason: runResult.health.reason,
              enabled: runResult.health.enabled,
              reachable: runResult.health.reachable,
              browserAvailable: runResult.health.browserAvailable,
              queueHealthy: runResult.health.queueHealthy,
              lastFailureClass: runResult.health.lastFailureClass,
              lastFailureCode: runResult.health.lastFailureCode,
            },
          }),
        );
      }
      const workerResponse = runResult.workerResponse;
      renderedCapture = mapWorkerResponseToRenderedCaptureResult({
        response: workerResponse,
        snapshotRootDirAbs,
        sourceUrl: entryFetchUrlUsed ?? normalizedHref,
      });
      const workerStatus = String(workerResponse.status ?? "").trim().toLowerCase();
      const hasSuccessSignal =
        workerStatus === "available" || workerStatus === "partial" || hasWorkerNavigationSuccess(workerResponse) || hasWorkerPhaseCompletion(workerResponse);
      const hasUsableEvidence = hasUsableRenderedEvidence(renderedCapture);
      const acceptedHydratedStatus: RenderedCaptureResult["status"] | null =
        !hasSuccessSignal || !hasUsableEvidence
          ? null
          : workerStatus === "available" && renderedCapture.documents.length > 0
            ? "available"
            : "partial";

      if (hasSuccessSignal && hasUsableEvidence) {
        diagnostics.push(
          createDiagnostic({
            severity: "info",
            code: "WORKER_SUCCESS_RESPONSE_ACCEPTED",
            message: "Worker success response accepted after rendered payload evidence checks.",
            targetUrl: null,
            details: {
              workerStatus,
              renderedDocumentCount: renderedCapture.documents.length,
              screenshotCount: renderedCapture.screenshots.length,
              computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
              navigationSucceeded: hasWorkerNavigationSuccess(workerResponse),
              phasesCompleted: hasWorkerPhaseCompletion(workerResponse),
            },
          }),
        );
        diagnostics.push(
          createDiagnostic({
            severity: "info",
            code: "WORKER_RENDERED_PAYLOAD_HYDRATED",
            message: "Worker rendered payload hydrated into import snapshot evidence.",
            targetUrl: null,
            details: {
              workerStatus,
              renderedCaptureStatus: acceptedHydratedStatus,
              renderedDocumentCount: renderedCapture.documents.length,
              screenshotCount: renderedCapture.screenshots.length,
              computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
            },
          }),
        );
        if (acceptedHydratedStatus === "partial") {
          diagnostics.push(
            createDiagnostic({
              severity: "warning",
              code: "WORKER_SUCCESS_PARTIAL_RENDER_ACCEPTED",
              message: "Worker success payload hydrated as degraded usable rendered evidence.",
              targetUrl: null,
              details: {
                workerStatus,
                renderedCaptureStatus: acceptedHydratedStatus,
                renderedDocumentCount: renderedCapture.documents.length,
                screenshotCount: renderedCapture.screenshots.length,
                computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
              },
            }),
          );
        }
        renderedCapture = {
          ...renderedCapture,
          status: acceptedHydratedStatus ?? renderedCapture.status,
        };
        diagnostics.push(
          createDiagnostic({
            severity: acceptedHydratedStatus === "partial" ? "warning" : "info",
            code: "RENDERED_CAPTURE_ACCEPTED",
            message: "Rendered capture worker response accepted as success from worker execution truth.",
            targetUrl: null,
            details: {
              workerStatus,
              navigationSucceeded: hasWorkerNavigationSuccess(workerResponse),
              phasesCompleted: hasWorkerPhaseCompletion(workerResponse),
              renderedCaptureStatus: acceptedHydratedStatus,
              renderedDocumentCount: renderedCapture.documents.length,
              screenshotCount: renderedCapture.screenshots.length,
            },
          }),
        );
      } else if (hasSuccessSignal) {
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "WORKER_SUCCESS_RESPONSE_REJECTED",
            message: "Worker response signaled success but rendered evidence could not be hydrated.",
            targetUrl: null,
            details: {
              workerStatus,
              renderedDocumentCount: renderedCapture.documents.length,
              screenshotCount: renderedCapture.screenshots.length,
              computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
              reason: "missing_usable_rendered_evidence",
            },
          }),
        );
      }
    }
    renderedCaptureDurationMs = Date.now() - captureStartedAt;
    appendRenderedCaptureDiagnostics({
      diagnostics,
      renderedCapture,
    });
  }

  if (renderedCaptureAttempted) {
    const ensured = ensureRenderedCaptureArtifacts({
      snapshotRootDirAbs,
      renderedCapture,
      diagnostics,
    });
    renderedDomPathAbs = ensured.renderedDomPathAbs;
    computedStylesPathAbs = ensured.computedStylesPathAbs;
    viewportScreenshotPathAbs = ensured.viewportScreenshotPathAbs;
    fullpageScreenshotPathAbs = ensured.fullpageScreenshotPathAbs;
  }

  const sourceSelection = resolveSourceSelection({
    diagnostics,
    entryHtml,
    responseHtmlPathAbs,
    renderedCapture,
  });
  if (renderedCaptureViaWorker && sourceSelection.sourceMode === "rendered_dom") {
    diagnostics.push(
      createDiagnostic({
        severity: renderedCapture.status === "partial" ? "warning" : "info",
        code: "RENDERED_SUMMARY_HYDRATED_FROM_WORKER_SUCCESS",
        message: "Rendered summary hydrated from accepted worker success payload.",
        targetUrl: null,
        details: {
          sourceMode: sourceSelection.sourceMode,
          fidelityStatus: sourceSelection.fidelityStatus,
          renderedCaptureStatus: renderedCapture.status,
          renderedDocumentCount: renderedCapture.documents.length,
          screenshotCount: renderedCapture.screenshots.length,
          computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
        },
      }),
    );
    diagnostics.push(
      createDiagnostic({
        severity: renderedCapture.status === "partial" ? "warning" : "info",
        code: renderedCapture.status === "partial" ? "CAPTURE_WORKER_RESULT_PARTIAL_ACCEPTED" : "CAPTURE_WORKER_RESULT_ACCEPTED",
        message:
          renderedCapture.status === "partial"
            ? "Rendered capture worker partial result accepted as best available source."
            : "Rendered capture worker result accepted as source of truth.",
        targetUrl: null,
        details: {
          snapshotId,
          snapshotRunId,
          renderedCaptureStatus: renderedCapture.status,
          renderedDocumentCount: renderedCapture.documents.length,
          screenshotCount: renderedCapture.screenshots.length,
          computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
          captureJobId: renderedCaptureJob?.jobId ?? null,
          captureJobStatus: renderedCaptureJob?.status ?? null,
        },
      }),
    );
    diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "CAPTURE_WORKER_RENDERED_DOM_USED",
        message: "Rendered capture worker artifacts selected as import source.",
        targetUrl: null,
        details: {
          snapshotId,
          snapshotRunId,
          renderedCaptureStatus: renderedCapture.status,
          captureJobId: renderedCaptureJob?.jobId ?? null,
          captureJobStatus: renderedCaptureJob?.status ?? null,
          captureJobAttemptCount: renderedCaptureJob?.attemptCount ?? null,
        },
      }),
    );
  }
  if (renderedCaptureViaWorker && sourceSelection.sourceMode === "raw_html_fallback") {
    const fallbackReason = resolveWorkerFallbackReason({
      job: renderedCaptureJob,
      workerHealth: renderedCaptureWorkerHealth,
    });
    const workerProducedMeaningfulEvidence =
      renderedCapture.documents.length > 0 ||
      renderedCapture.screenshots.length > 0 ||
      renderedCapture.computedStyleSamples.length > 0;
    if (workerProducedMeaningfulEvidence) {
      diagnostics.push(
        createDiagnostic({
          severity: "warning",
          code: "CAPTURE_WORKER_RESULT_OVERRIDDEN_BY_FALLBACK",
          message: "Worker produced capture evidence but fallback source was selected.",
          targetUrl: null,
          details: {
            snapshotId,
            snapshotRunId,
            renderedCaptureStatus: renderedCapture.status,
            renderedDocumentCount: renderedCapture.documents.length,
            screenshotCount: renderedCapture.screenshots.length,
            computedStyleSampleCount: renderedCapture.computedStyleSamples.length,
            fallbackReason,
          },
        }),
      );
    }
    diagnostics.push(
      createDiagnostic({
        severity: "warning",
        code: "CAPTURE_WORKER_FALLBACK_TO_RAW_HTML",
        message: "Rendered capture worker output was unusable; import degraded to raw HTML fallback.",
        targetUrl: null,
        details: {
          snapshotId,
          snapshotRunId,
          renderedCaptureStatus: renderedCapture.status,
          renderedDocumentCount: renderedCapture.documents.length,
          captureJobId: renderedCaptureJob?.jobId ?? null,
          captureJobStatus: renderedCaptureJob?.status ?? null,
          captureJobFailureClass: renderedCaptureJob?.failureClass ?? null,
          captureJobFailureCode: renderedCaptureJob?.failureCode ?? null,
          fallbackReason,
          workerEnabled: renderedCaptureWorkerHealth?.enabled ?? workerEnabled,
        },
      }),
    );
  }
  const renderedDomHtml = renderedDomPathAbs
    ? (() => {
        try {
          return fs.readFileSync(renderedDomPathAbs, "utf8");
        } catch {
          return "";
        }
      })()
    : "";
  const viewportCaptured = Boolean(viewportScreenshotPathAbs);
  const fullPageCaptured = Boolean(fullpageScreenshotPathAbs);
  const screenshotPaths = [viewportScreenshotPathAbs, fullpageScreenshotPathAbs].filter((entry): entry is string => typeof entry === "string");
  const screenshotCount = screenshotPaths.length;
  writeJsonStable(
    renderedCaptureManifestPathAbs,
    buildRenderedCaptureManifest({
      renderedCapture,
      renderedDomQuality: sourceSelection.renderedDomQuality,
      renderedDomHtml,
      viewportCaptured,
      fullPageCaptured,
      screenshotCount,
      screenshotPaths,
    }),
  );

  let rewrittenHtml = sourceSelection.selectedHtml;

  if (!hasFatal(diagnostics) && rewrittenHtml.trim().length > 0) {
    diagnostics.push(
      createDiagnostic({
        severity: "info",
        code: "SITE_IMPORT_ASSET_DISCOVERY_STARTED",
        message: "Site import asset discovery started.",
        targetUrl: entryFetchUrlUsed ?? normalizedHref,
        details: null,
      }),
    );
    const document = parse(rewrittenHtml);
    const refs = collectAssetRefs({
      document,
      entryUrl: normalizedUrl,
      diagnostics,
    });
    for (const ref of refs) {
      if (ref.tag !== "link" || ref.assetKind !== "stylesheet" || !ref.resolvedUrl) continue;
      if (isSameOriginUrl(ref.resolvedUrl, normalizedUrl.origin)) continue;
      diagnostics.push(
        createDiagnostic({
          severity: "info",
          code: "ASSET_REFERENCE_UNSUPPORTED",
          message: "Skipped non-local stylesheet reference",
          targetUrl: ref.resolvedUrl,
          details: { tag: ref.tag, attribute: ref.attribute, rawRef: ref.rawRef, occurrence: ref.occurrence, surface: "head_stylesheet" },
        }),
      );
      ref.resolvedUrl = null;
    }
    const headStylesheetRefs = refs
      .filter(
        (ref) =>
          ref.tag === "link" &&
          ref.attribute === "href" &&
          ref.assetKind === "stylesheet" &&
          ref.sourceScope === "head_stylesheet" &&
          typeof ref.resolvedUrl === "string" &&
          isSameOriginUrl(ref.resolvedUrl, normalizedUrl.origin),
      )
      .sort((a, b) => a.occurrence - b.occurrence || (a.resolvedUrl ?? "").localeCompare(b.resolvedUrl ?? ""));
    const selectedPrimaryHeadStylesheetRef = selectPrimarySiteStylesheetRef(headStylesheetRefs);
    if (selectedPrimaryHeadStylesheetRef?.resolvedUrl) {
      diagnostics.push(
        createDiagnostic({
          severity: "info",
          code: "PRIMARY_STYLESHEET_DETECTED",
          message: "Detected deterministic same-origin primary/site stylesheet candidate from head links",
          targetUrl: selectedPrimaryHeadStylesheetRef.resolvedUrl,
          details: {
            occurrence: selectedPrimaryHeadStylesheetRef.occurrence,
            roleScore: stylesheetRoleScore(selectedPrimaryHeadStylesheetRef),
            rule: "same_origin_head_stylesheet_highest_role_score_then_earliest_occurrence_v1",
          },
        }),
      );
    }
    const localPathByUrl = resolvePathCollisions(refs, diagnostics);
    const htmlImageRefByUrl = new Map<string, ParsedAssetRef[]>();
    for (const ref of refs) {
      if (ref.assetKind !== "image" || !ref.resolvedUrl) continue;
      const list = htmlImageRefByUrl.get(ref.resolvedUrl) ?? [];
      list.push(ref);
      htmlImageRefByUrl.set(ref.resolvedUrl, list);
      console.info("[raw-import] RAW_IMPORT_HTML_IMAGE_ASSET_DISCOVERED", {
        resolvedUrl: ref.resolvedUrl,
        rawRef: ref.rawRef,
        tag: ref.tag,
        attribute: ref.attribute,
        surface: ref.sourceScope ?? "other",
      });
    }

    const fetchOutcomeByUrl = new Map<string, FetchOutcome>();
    const uniqueUrls = [...localPathByUrl.keys()].sort((a, b) => a.localeCompare(b));

    async function fetchAndStoreAsset(
      resolvedUrl: string,
      localPath: string,
      messageLabel: "Direct asset fetch" | "Stylesheet-linked asset fetch",
    ): Promise<FetchOutcome> {
      const htmlImageRefs = htmlImageRefByUrl.get(resolvedUrl) ?? [];
      if (htmlImageRefs.length > 0) {
        console.info("[raw-import] RAW_IMPORT_HTML_IMAGE_ASSET_FETCH_STARTED", {
          resolvedUrl,
          localPath,
          refs: htmlImageRefs.map((ref) => ({ tag: ref.tag, attribute: ref.attribute, rawRef: ref.rawRef })),
        });
      }
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
        if (htmlImageRefs.length > 0) {
          console.info("[raw-import] RAW_IMPORT_HTML_IMAGE_ASSET_PERSISTED", {
            resolvedUrl,
            localPath,
            byteLength: bytes.byteLength,
          });
        }

        return {
          fetchStatus: "fetched",
          httpStatus: response.status,
          contentType,
          byteLength: bytes.byteLength,
        };
      } catch (error) {
        if (htmlImageRefs.length > 0) {
          console.warn("[raw-import] RAW_IMPORT_HTML_IMAGE_ASSET_FETCH_FAILED", {
            resolvedUrl,
            localPath,
            error: String((error as Error)?.message ?? error),
          });
        }
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

    const selectedPrimaryStylesheetUrl = selectedPrimaryHeadStylesheetRef?.resolvedUrl ?? null;
    let selectedPrimaryStylesheetLocalPath: string | null = null;
    if (selectedPrimaryStylesheetUrl) {
      const localPath = localPathByUrl.get(selectedPrimaryStylesheetUrl) ?? null;
      const outcome = fetchOutcomeByUrl.get(selectedPrimaryStylesheetUrl) ?? null;
      if (localPath && outcome?.fetchStatus === "fetched") {
        selectedPrimaryStylesheetLocalPath = localPath;
        diagnostics.push(
          createDiagnostic({
            severity: "info",
            code: "PRIMARY_STYLESHEET_SELECTED",
            message: "Primary/site stylesheet candidate selected and rewrite-eligible for final preview emission",
            targetUrl: selectedPrimaryStylesheetUrl,
            details: {
              localPath,
              occurrence: selectedPrimaryHeadStylesheetRef?.occurrence ?? null,
              fetchStatus: outcome.fetchStatus,
              rule: "same_origin_head_stylesheet_highest_role_score_then_earliest_occurrence_v1",
            },
          }),
        );
        diagnostics.push(
          createDiagnostic({
            severity: "info",
            code: "PRIMARY_STYLESHEET_CAPTURED",
            message: "Captured fetchable head stylesheet as copied local asset",
            targetUrl: selectedPrimaryStylesheetUrl,
            details: {
              localPath,
              occurrence: selectedPrimaryHeadStylesheetRef?.occurrence ?? null,
              tag: selectedPrimaryHeadStylesheetRef?.tag ?? null,
              attribute: selectedPrimaryHeadStylesheetRef?.attribute ?? null,
              rewriteEligible: true,
            },
          }),
        );
      } else if (outcome?.fetchStatus === "fetch_failed") {
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "PRIMARY_STYLESHEET_FETCH_FAILED",
            message: "Head stylesheet candidate fetch failed and remains non-local",
            targetUrl: selectedPrimaryStylesheetUrl,
            details: {
              localPath,
              occurrence: selectedPrimaryHeadStylesheetRef?.occurrence ?? null,
              tag: selectedPrimaryHeadStylesheetRef?.tag ?? null,
              attribute: selectedPrimaryHeadStylesheetRef?.attribute ?? null,
            },
          }),
        );
      } else {
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "PRIMARY_STYLESHEET_NOT_REWRITE_ELIGIBLE",
            message: "Head stylesheet candidate is present but not rewrite-eligible",
            targetUrl: selectedPrimaryStylesheetUrl,
            details: { localPath, outcome: outcome?.fetchStatus ?? "unsupported", occurrence: selectedPrimaryHeadStylesheetRef?.occurrence ?? null },
          }),
        );
      }
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
          sourceScope: "other",
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
    walkDomWithAncestors(document, (node, ancestors) => {
      if (!isElement(node)) return;
      const tag = node.tagName.toLowerCase();
      if (tag !== "link" && tag !== "img" && tag !== "script" && tag !== "source" && tag !== "a") return;

      const rel = getAttr(node, "rel");
      const kind = tag === "source" ? "image" : assetKindFromNode({ tag, rel });
      if (!kind && tag !== "img" && tag !== "source" && tag !== "a") return;

      const attrsToHandle: UrlImportAssetAttribute[] = [];
      if (tag === "link") attrsToHandle.push("href");
      else if (tag === "script") attrsToHandle.push("src");
      else if (tag === "a") attrsToHandle.push("href");
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
            const outcome = resolvedUrl ? fetchOutcomeByUrl.get(resolvedUrl) : null;
            if (localPath && outcome?.fetchStatus === "fetched") return { url: `/${toPosixPath(localPath)}`, descriptor: token.descriptor };
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
        const outcome = resolvedUrl ? fetchOutcomeByUrl.get(resolvedUrl) : null;
        const rewriteEligibleLocalPath = localPath && outcome?.fetchStatus === "fetched" ? localPath : null;
        if (rewriteEligibleLocalPath) setAttr(node, attribute, `/${toPosixPath(rewriteEligibleLocalPath)}`);
        if (tag === "img" && attribute !== "src" && rewriteEligibleLocalPath) {
          const imgSrc = getAttr(node, "src");
          if (!imgSrc || !imgSrc.trim()) setAttr(node, "src", `/${toPosixPath(rewriteEligibleLocalPath)}`);
        }

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

      if (tag === "img") {
        const promotedLocalPath = choosePromotedImageLocalPath({
          imgNode: node,
          ancestors,
          baseUrl: normalizedUrl,
          localPathByUrl,
          fetchOutcomeByUrl,
        });
        if (promotedLocalPath) setAttr(node, "src", `/${toPosixPath(promotedLocalPath)}`);
      }
    });

    if (selectedPrimaryStylesheetLocalPath) {
      const wasPreferred = preferPrimaryStylesheetInHead({
        document,
        primaryStylesheetLocalPath: selectedPrimaryStylesheetLocalPath,
      });
      if (!wasPreferred) {
        diagnostics.push(
          createDiagnostic({
            severity: "warning",
            code: "PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML",
            message: "Selected primary/site stylesheet was copied but not emitted as preferred head stylesheet in final HTML",
            targetUrl: selectedPrimaryStylesheetUrl,
            details: {
              localPath: selectedPrimaryStylesheetLocalPath,
              rule: "preferred_primary_site_stylesheet_first_in_head_when_rewrite_eligible_v1",
            },
          }),
        );
      }
    }

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
  writeJsonStable(path.resolve(snapshotStableRootDirAbs, "latest-run.json"), {
    kind: "url_import_latest_run_v1",
    snapshotId,
    snapshotRunId,
    snapshotStableRootDirAbs,
    snapshotRunRootDirAbs: snapshotRootDirAbs,
    requestId: input.requestId ?? null,
    sourceMode: sourceSelection.sourceMode,
    renderedCaptureStatus: renderedCapture.status,
    createdAt: new Date().toISOString(),
  } as unknown as JsonValue);
  writeJsonStable(acquisitionEvidencePathAbs, {
    kind: "import_acquisition_evidence_v1",
    executionIdentity: {
      snapshotId,
      snapshotRunId,
      snapshotStableRootDirAbs,
      snapshotRunRootDirAbs: snapshotRootDirAbs,
      requestId: input.requestId ?? null,
    },
    entryFetch: {
      chosenUrl: entryFetchUrlUsed ?? null,
      finalContentType: lastSuccessfulResponseContentType,
      attempts: entryFetchAttemptDetails,
      responseSnippetPathAbs: entryResponseSnippetPathAbs,
    },
    renderedCapture: {
      attempted: renderedCaptureAttempted,
      workerPathUsed: renderedCaptureViaWorker,
      job: summarizeCaptureJob(renderedCaptureJob),
      workerHealth: renderedCaptureWorkerHealth,
      fallbackReason:
        renderedCaptureViaWorker && sourceSelection.sourceMode === "raw_html_fallback"
          ? resolveWorkerFallbackReason({
              job: renderedCaptureJob,
              workerHealth: renderedCaptureWorkerHealth,
            })
          : null,
      status: renderedCapture.status,
      visibilityStatus: computeRenderedCaptureVisibilityStatus({
        renderedCapture,
        renderedDomQuality: sourceSelection.renderedDomQuality,
      }),
      executionTruth: buildRenderedCaptureExecutionTruth({
        renderedCapture,
        renderedDomQuality: sourceSelection.renderedDomQuality,
      }),
      durationMs: renderedCaptureDurationMs,
      documentCount: renderedCapture.documents.length,
      screenshotCount,
      screenshotPaths: {
        viewport: viewportScreenshotPathAbs,
        fullPage: fullpageScreenshotPathAbs,
      },
      renderedArtifacts: {
        renderedDomPathAbs,
        computedStylesPathAbs,
      },
      styleSampleCoverage: Number((renderedCapture.computedStyleSamples.length / 10).toFixed(3)),
      readinessStates: renderedCapture.documents.map((doc) => doc.readinessState),
      diagnostics: renderedCapture.diagnostics.map((entry) => entry.code),
    },
    selectedSource: {
      mode: sourceSelection.sourceMode,
      fidelityStatus: sourceSelection.fidelityStatus,
      renderedDomQuality: sourceSelection.renderedDomQuality,
      rawHtmlQuality: sourceSelection.rawHtmlQuality,
      degraded: sourceSelection.degraded,
    },
  } as unknown as JsonValue);

  const htmlByteLength = Buffer.byteLength(entryHtml || "", "utf8");
  const hasUnsupportedContentType = sortedDiagnostics.some((issue) => issue.code === "ENTRY_FETCH_UNSUPPORTED_CONTENT_TYPE");
  const hasEmptyHtml = sortedDiagnostics.some((issue) => issue.code === "SITE_IMPORT_HTML_EMPTY" || issue.code === "ENTRY_EMPTY_RESPONSE");
  const hasNetworkBlocked = entryFetchAttemptDetails.some((attempt) => attempt.outcome === "network_error" || attempt.outcome === "timeout");
  const rawHtmlAvailable = htmlByteLength > 0;
  const intakeReasonCode: SiteImportIntakeReasonCode = normalizedUrl
    ? hasFatal(sortedDiagnostics)
      ? hasUnsupportedContentType && !rawHtmlAvailable
        ? "unsupported_response_content_type"
        : hasEmptyHtml
          ? "empty_html"
        : hasNetworkBlocked && !rawHtmlAvailable
          ? "blocked_by_cors_or_network"
          : rawHtmlAvailable
            ? "empty_html"
            : "fetch_failed"
      : rawHtmlAvailable
        ? "ok"
        : "empty_html"
    : "invalid_url";
  const intakeOk = intakeReasonCode === "ok";
  sortedDiagnostics.push(
    createDiagnostic({
      severity: intakeOk ? "info" : "fatal",
      code: intakeOk ? "SITE_IMPORT_INTAKE_COMPLETED" : "SITE_IMPORT_INTAKE_FAILED",
      message: intakeOk ? "Site import intake completed." : "Site import intake failed.",
      targetUrl: finalResponseUrl ?? entryFetchUrlUsed ?? normalizedHref,
      details: {
        reasonCode: intakeReasonCode,
        htmlByteLength,
        rawHtmlAvailable,
        assetCount: sortedManifest.length,
      },
    }),
  );

  return {
    kind: "url_single_page_import_snapshot_v1",
    snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
    sourceUrl: input.sourceUrl,
    normalizedUrl: normalizedHref,
    snapshotId,
    snapshotRunId,
    requestId: input.requestId ?? null,
    snapshotStableRootDirAbs,
    snapshotRootDirAbs,
    fixtureSpec,
    captureMode: "raw_html_only",
    sourceMode: sourceSelection.sourceMode,
    sourceSelection: {
      sourceMode: sourceSelection.sourceMode,
      fidelityStatus: sourceSelection.fidelityStatus,
      selectedSourceHtmlPathAbs: sourceSelection.selectedSourceHtmlPathAbs,
      renderedDomQuality: sourceSelection.renderedDomQuality,
      rawHtmlQuality: sourceSelection.rawHtmlQuality,
      degraded: sourceSelection.degraded,
    },
    responseHtmlPathAbs,
    entryHtmlPathAbs,
    assetsDirAbs,
    renderedCapture,
    renderedCaptureReliability: {
      job: summarizeCaptureJob(renderedCaptureJob),
      workerHealth: renderedCaptureWorkerHealth,
    },
    importDiagnostics: {
      summary: summarizeDiagnostics(sortedDiagnostics),
      issues: sortedDiagnostics,
    },
    importIntake: {
      ok: intakeOk,
      reasonCode: intakeReasonCode,
      diagnostics: [...new Set(sortedDiagnostics.map((issue) => issue.code))],
      rawHtmlAvailable,
      htmlByteLength,
      evidence: {
        requestedUrl: input.sourceUrl,
        finalUrl: finalResponseUrl ?? entryFetchUrlUsed,
        httpStatus: lastSuccessfulStatus,
        contentType: lastSuccessfulResponseContentType,
        htmlByteLength,
        assetCount: sortedManifest.length,
      },
    },
    fetchManifest: sortedManifest,
  };
}
