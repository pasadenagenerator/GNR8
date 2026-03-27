import {
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  resolveRuntimeSiteForHost,
  type PublicRuntimeArtifactMissReasonCode,
} from "@/gnr8/runtime/runtime-store";
import { persistRuntimeUsageEvent } from "@/gnr8/runtime/runtime-usage-event-logger";

export type Gnr8PublicRuntimeMode = "artifact-only";

const VALID_RUNTIME_MODES = new Set<Gnr8PublicRuntimeMode>(["artifact-only"]);

type HeaderReader = {
  get(name: string): string | null;
};

type PublicRuntimeResolutionOutcome = "artifact_hit" | "artifact_only_404";

function logPublicRuntimeResolution(input: {
  outcome: PublicRuntimeResolutionOutcome;
  mode: Gnr8PublicRuntimeMode;
  host: string;
  path: string;
  siteId?: string | null;
  ownershipSiteId?: string | null;
  siteVersionId?: string | null;
  artifactId?: string | null;
  hostBindingId?: string | null;
  hostBindingKind?: string | null;
  hostBindingStatus?: string | null;
  reasonCode?: string | null;
  resolvedPath?: string | null;
  statusCode?: number;
}): void {
  const artifactHit = input.outcome === "artifact_hit";
  const artifactMiss = !artifactHit;
  const governanceDenied = input.reasonCode === "artifact_stage_denied";
  const governanceAllowed = artifactHit;
  const pathResolved = artifactHit ? true : input.reasonCode === "artifact_path_missing" ? false : null;
  const pathUnresolved = pathResolved === null ? null : !pathResolved;
  const payload = {
    outcome: input.outcome,
    mode: input.mode,
    runtimeResolutionMode: "artifact_only",
    host: input.host,
    path: input.path,
    siteId: input.siteId ?? null,
    ownershipSiteId: input.ownershipSiteId ?? null,
    siteVersionId: input.siteVersionId ?? null,
    artifactId: input.artifactId ?? null,
    hostBindingId: input.hostBindingId ?? null,
    hostBindingKind: input.hostBindingKind ?? null,
    hostBindingStatus: input.hostBindingStatus ?? null,
    reasonCode: input.reasonCode ?? null,
    resolvedPath: input.resolvedPath ?? null,
    statusCode: input.statusCode ?? null,
    artifactHit,
    artifactMiss,
    pathResolved,
    pathUnresolved,
    governanceAllowed,
    governanceDenied,
    builderFallbackUsed: false,
    ts: new Date().toISOString(),
  };
  console.info(`[gnr8.public-runtime.resolution] ${JSON.stringify(payload)}`);
}

export function resolveRequestHost(headers: HeaderReader): string {
  return (
    (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? ""
  );
}

export function resolvePublicRuntimeMode(): Gnr8PublicRuntimeMode {
  const raw = String(process.env.GNR8_PUBLIC_RUNTIME_MODE ?? "").trim();
  if (VALID_RUNTIME_MODES.has(raw as Gnr8PublicRuntimeMode)) {
    return raw as Gnr8PublicRuntimeMode;
  }

  if (raw) {
    console.warn(
      `[gnr8.public-runtime.mode.invalid] Unsupported GNR8_PUBLIC_RUNTIME_MODE="${raw}". Falling back to env default.`,
    );
  }

  return "artifact-only";
}

function htmlResponse(input: { html: string; status?: number }): Response {
  return new Response(input.html, {
    status: input.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}

function notFoundHtmlResponse(): Response {
  return htmlResponse({
    status: 404,
    html: "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>404: This page could not be found.</title></head><body><main><h1>404</h1><p>This page could not be found.</p></main></body></html>",
  });
}

function governanceDeniedHtmlResponse(): Response {
  return htmlResponse({
    status: 403,
    html: "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>403: Access denied.</title></head><body><main><h1>403</h1><p>This request is denied by runtime governance.</p></main></body></html>",
  });
}

type RuntimeStoreDependencies = {
  resolveActiveArtifactForHostAndPathWithDiagnostics: typeof resolveActiveArtifactForHostAndPathWithDiagnostics;
  resolveRuntimeSiteForHost: typeof resolveRuntimeSiteForHost;
};

const runtimeStoreDependencies: RuntimeStoreDependencies = {
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  resolveRuntimeSiteForHost,
};

type RuntimeUsageDependencies = {
  persistRuntimeUsageEvent: typeof persistRuntimeUsageEvent;
};

const runtimeUsageDependencies: RuntimeUsageDependencies = {
  persistRuntimeUsageEvent,
};

export function __setPublicRuntimeRenderDependenciesForTest(overrides: Partial<RuntimeStoreDependencies>): () => void {
  const previous = { ...runtimeStoreDependencies };
  Object.assign(runtimeStoreDependencies, overrides);
  return () => {
    Object.assign(runtimeStoreDependencies, previous);
  };
}

export function __setPublicRuntimeUsageDependenciesForTest(overrides: Partial<RuntimeUsageDependencies>): () => void {
  const previous = { ...runtimeUsageDependencies };
  Object.assign(runtimeUsageDependencies, overrides);
  return () => {
    Object.assign(runtimeUsageDependencies, previous);
  };
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

async function recordRuntimeUsage(input: {
  siteId?: string | null;
  artifactId?: string | null;
  requestCount: number;
  bandwidthBytes: number;
  computeMs: number;
  periodStart: Date;
  periodEnd: Date;
}): Promise<void> {
  const siteId = String(input.siteId ?? "").trim();
  if (!siteId) return;
  try {
    await runtimeUsageDependencies.persistRuntimeUsageEvent({
      siteId,
      artifactId: input.artifactId ?? null,
      requestCount: input.requestCount,
      bandwidthBytes: input.bandwidthBytes,
      computeMs: input.computeMs,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
  } catch (error) {
    console.warn("[gnr8.public-runtime.usage] failed to record runtime usage", {
      siteId,
      artifactId: input.artifactId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function isShadowAssetPath(path: string): boolean {
  return path.startsWith("/assets/") || path.startsWith("/uploads/");
}

function sanitizeShadowAssetPath(path: string): string | null {
  if (!isShadowAssetPath(path)) return null;
  if (!path.startsWith("/")) return null;
  if (path.includes("\\") || path.includes("\0")) return null;
  const normalized = path.replace(/\/+/g, "/");
  if (normalized.includes("..")) return null;
  return normalized;
}

function copyHeaderIfPresent(headers: Headers, source: Headers, name: string): void {
  const value = source.get(name);
  if (value) headers.set(name, value);
}

function imageSemanticKey(path: string): string {
  const withoutQuery = path.split("?")[0]?.split("#")[0] ?? path;
  const basename = withoutQuery.split("/").pop() ?? withoutQuery;
  const withoutExt = basename.replace(/\.[a-z0-9]+$/i, "");
  return withoutExt
    .toLowerCase()
    .replace(/^[a-f0-9]{8,16}-/, "")
    .replace(/^img-/, "")
    .replace(/[_-]v\d+$/, "")
    .replace(/[_-]\d+x\d+$/, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
}

function extractUploadCandidatesFromArtifactHtml(html: string): string[] {
  const matches = html.match(/\/uploads\/[A-Za-z0-9/_\-.]+/g) ?? [];
  const deduped = new Set<string>();
  for (const raw of matches) {
    const normalized = raw.replace(/&quot;|&amp;|&#39;|&lt;|&gt;/g, "").trim();
    if (!normalized.startsWith("/uploads/")) continue;
    deduped.add(normalized);
    if (deduped.size >= 200) break;
  }
  return [...deduped];
}

async function fetchShadowAssetFromSource(input: { sourceUrl: string; sourcePath: string }): Promise<Response | null> {
  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(input.sourcePath, input.sourceUrl);
  } catch {
    return null;
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      accept: "*/*",
      "user-agent": "gnr8-shadow-asset-proxy/1.0",
    },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) return null;

  const headers = new Headers();
  copyHeaderIfPresent(headers, upstream.headers, "content-type");
  copyHeaderIfPresent(headers, upstream.headers, "content-length");
  copyHeaderIfPresent(headers, upstream.headers, "etag");
  copyHeaderIfPresent(headers, upstream.headers, "last-modified");
  headers.set("cache-control", "public, max-age=300, s-maxage=3600");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}

async function tryMappedAssetFallback(input: {
  host: string;
  requestedPath: string;
  sourceUrl: string;
}): Promise<Response | null> {
  if (!input.requestedPath.startsWith("/assets/image/")) return null;
  const requestedKey = imageSemanticKey(input.requestedPath);
  if (!requestedKey) return null;

  const artifactResolution = await runtimeStoreDependencies.resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: input.host,
    path: "/",
  });
  if (artifactResolution.outcome !== "artifact_hit") return null;

  const uploadPaths = extractUploadCandidatesFromArtifactHtml(artifactResolution.html);
  if (uploadPaths.length === 0) return null;

  const matchedPath = uploadPaths.find((candidate) => imageSemanticKey(candidate) === requestedKey) ?? null;
  if (!matchedPath) return null;

  return fetchShadowAssetFromSource({ sourceUrl: input.sourceUrl, sourcePath: matchedPath });
}

async function renderShadowAssetResponse(input: { host: string; path: string }): Promise<Response | null> {
  const normalizedPath = sanitizeShadowAssetPath(input.path);
  if (!normalizedPath) return null;

  const site = await runtimeStoreDependencies.resolveRuntimeSiteForHost({ host: input.host });
  if (site.outcome !== "site_hit") return null;

  const direct = await fetchShadowAssetFromSource({ sourceUrl: site.sourceUrl, sourcePath: normalizedPath });
  if (direct) return direct;

  const mapped = await tryMappedAssetFallback({
    host: input.host,
    requestedPath: normalizedPath,
    sourceUrl: site.sourceUrl,
  });
  if (mapped) return mapped;

  return new Response(null, {
    status: 404,
    headers: {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}

export async function renderPublicPathResponse(input: { path: string; host: string }): Promise<Response> {
  const requestStartedAt = Date.now();

  if (isShadowAssetPath(input.path)) {
    const assetResponse = await renderShadowAssetResponse(input);
    if (assetResponse) return assetResponse;
  }

  const mode = resolvePublicRuntimeMode();

  const artifactResolution = await runtimeStoreDependencies.resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: input.host,
    path: input.path,
  });

  if (artifactResolution.outcome === "artifact_hit") {
    const requestEndedAt = Date.now();
    const computeMs = Math.max(0, requestEndedAt - requestStartedAt);
    const bandwidthBytes = utf8ByteLength(artifactResolution.html);
    await recordRuntimeUsage({
      siteId: artifactResolution.ownershipSiteId ?? artifactResolution.siteId,
      artifactId: artifactResolution.artifactId,
      requestCount: 1,
      bandwidthBytes,
      computeMs,
      periodStart: new Date(requestStartedAt),
      periodEnd: new Date(requestEndedAt),
    });

    logPublicRuntimeResolution({
      outcome: "artifact_hit",
      mode,
      host: input.host,
      path: input.path,
      siteId: artifactResolution.siteId,
      ownershipSiteId: artifactResolution.ownershipSiteId,
      siteVersionId: artifactResolution.activeSiteVersionId,
      artifactId: artifactResolution.artifactId,
      hostBindingId: artifactResolution.hostBindingId,
      hostBindingKind: artifactResolution.hostBindingKind,
      hostBindingStatus: artifactResolution.hostBindingStatus,
      resolvedPath: artifactResolution.resolvedPath,
      reasonCode:
        artifactResolution.siteResolution === "fallback_latest_site" ? artifactResolution.siteResolution : null,
      statusCode: 200,
    });
    return htmlResponse({ html: artifactResolution.html });
  }

  const statusCode = artifactResolution.reasonCode === "artifact_stage_denied" ? 403 : 404;
  const errorHtml =
    artifactResolution.reasonCode === "artifact_stage_denied"
      ? "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>403: Access denied.</title></head><body><main><h1>403</h1><p>This request is denied by runtime governance.</p></main></body></html>"
      : "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>404: This page could not be found.</title></head><body><main><h1>404</h1><p>This page could not be found.</p></main></body></html>";
  const requestEndedAt = Date.now();
  const computeMs = Math.max(0, requestEndedAt - requestStartedAt);
  await recordRuntimeUsage({
    siteId: artifactResolution.ownershipSiteId ?? artifactResolution.siteId,
    artifactId: artifactResolution.artifactId,
    requestCount: 1,
    bandwidthBytes: utf8ByteLength(errorHtml),
    computeMs,
    periodStart: new Date(requestStartedAt),
    periodEnd: new Date(requestEndedAt),
  });

  logPublicRuntimeResolution({
    outcome: "artifact_only_404",
    mode,
    host: input.host,
    path: input.path,
    siteId: artifactResolution.siteId,
    ownershipSiteId: artifactResolution.ownershipSiteId,
    siteVersionId: artifactResolution.activeSiteVersionId,
    artifactId: artifactResolution.artifactId,
    hostBindingId: artifactResolution.hostBindingId,
    hostBindingKind: artifactResolution.hostBindingKind,
    hostBindingStatus: artifactResolution.hostBindingStatus,
    reasonCode: artifactResolution.reasonCode as PublicRuntimeArtifactMissReasonCode,
    statusCode,
  });
  return artifactResolution.reasonCode === "artifact_stage_denied"
    ? governanceDeniedHtmlResponse()
    : notFoundHtmlResponse();
}
