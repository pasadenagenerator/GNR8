import {
  listContentOverrides,
  listContentSlots,
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  resolveRawTemplateSiteForDomainAndPath,
  resolveRuntimeSiteForHost,
  type PublicRuntimeArtifactMissReasonCode,
} from "@/gnr8/runtime/runtime-store";
import { persistRuntimeUsageEvent } from "@/gnr8/runtime/runtime-usage-event-logger";
import { applyContentOverridesToRawHtml } from "@/src/public-site/content-override-runtime";
import { injectRuntimeDebugPanel, rewriteRawTemplateHtmlForRuntime } from "@/src/public-site/raw-template-runtime";

export type Gnr8PublicRuntimeMode = "artifact-only";

const VALID_RUNTIME_MODES = new Set<Gnr8PublicRuntimeMode>(["artifact-only"]);

type HeaderReader = {
  get(name: string): string | null;
};

type PublicRuntimeResolutionOutcome = "artifact_hit" | "artifact_only_404";
type PublicDomainFallbackReason =
  | "domain_not_found"
  | "domain_unbound_fallback_site_blocked"
  | "domain_binding_incomplete";

const DEFAULT_PLATFORM_APP_HOSTS = ["app.pasadenagenerator.com", "pasadenagenerator.com", "localhost", "127.0.0.1"];

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

export function normalizePublicDomainHost(host: string): string {
  const raw = String(host ?? "").trim().toLowerCase();
  if (!raw) return "";
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const authority = withoutProtocol.split("/")[0] ?? "";
  const hostOnly = authority.split(":")[0] ?? "";
  return hostOnly.replace(/\.+$/, "").trim();
}

function resolvePlatformAppHosts(): Set<string> {
  const fromEnv = String(process.env.GNR8_PLATFORM_APP_HOSTS ?? "")
    .split(",")
    .map((host) => normalizePublicDomainHost(host))
    .filter(Boolean);
  return new Set(fromEnv.length > 0 ? fromEnv : DEFAULT_PLATFORM_APP_HOSTS.map((host) => normalizePublicDomainHost(host)));
}

function isPlatformAppHost(host: string): boolean {
  const normalizedHost = normalizePublicDomainHost(host);
  if (!normalizedHost) return false;
  return resolvePlatformAppHosts().has(normalizedHost);
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

function appShellHtmlResponse(): Response {
  return htmlResponse({
    status: 200,
    html: "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /><title>GNR8 Platform</title></head><body><main style=\"min-height:100vh;margin:0;display:grid;place-items:center;background:radial-gradient(circle at 15% 20%, rgba(160, 174, 192, 0.12) 0%, rgba(160, 174, 192, 0) 44%), #f8fafc;font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;color:#0f172a;padding:24px;\"><section style=\"width:100%;max-width:520px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;padding:28px 24px;text-align:center;box-shadow:0 20px 40px rgba(15, 23, 42, 0.06);display:grid;gap:14px;\"><h1 style=\"margin:0;font-size:34px;letter-spacing:0.2px;\">GNR8</h1><p style=\"margin:0;font-size:12px;letter-spacing:2.4px;color:#334155;\">WEB AGENCY OS</p><div style=\"margin-top:8px;display:grid;gap:10px;\"><a href=\"/login\" style=\"padding:10px 14px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;\">Login</a><a href=\"/signup\" style=\"padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;text-decoration:none;font-weight:600;\">Signup</a></div></section></main></body></html>",
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
  resolveRawTemplateSiteForDomainAndPath: typeof resolveRawTemplateSiteForDomainAndPath;
  resolveRuntimeSiteForHost: typeof resolveRuntimeSiteForHost;
  listContentSlots: typeof listContentSlots;
  listContentOverrides: typeof listContentOverrides;
};

const runtimeStoreDependencies: RuntimeStoreDependencies = {
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  resolveRawTemplateSiteForDomainAndPath,
  resolveRuntimeSiteForHost,
  listContentSlots,
  listContentOverrides,
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

function isUploadVariantSegment(segment: string): boolean {
  return /^\d+x\d+(?:_\d+x\d+)*$/i.test(segment);
}

function resolveUploadVariantFallbackPath(path: string): string | null {
  if (!path.startsWith("/uploads/")) return null;
  const parts = path.split("/");
  const variantIndex = parts.findIndex((part, index) => index > 2 && isUploadVariantSegment(part));
  if (variantIndex < 0) return null;
  const withoutVariant = parts.filter((_, index) => index !== variantIndex).join("/");
  if (!withoutVariant.startsWith("/uploads/")) return null;
  return withoutVariant;
}

function logPublicDomainDiagnostic(event: string, payload: Record<string, unknown>): void {
  console.info(`[gnr8.public-runtime.domain] ${event}`, payload);
}

function logPublicDomainAppShellFallback(input: {
  host: string;
  rawHost: string;
  path: string;
  reason: PublicDomainFallbackReason;
}): void {
  logPublicDomainDiagnostic("PUBLIC_DOMAIN_APP_SHELL_FALLBACK", {
    host: input.host,
    rawHost: input.rawHost,
    path: input.path,
    reason: input.reason,
  });
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

  const fallbackPath = resolveUploadVariantFallbackPath(normalizedPath);
  if (fallbackPath) {
    const fallback = await fetchShadowAssetFromSource({ sourceUrl: site.sourceUrl, sourcePath: fallbackPath });
    if (fallback) {
      logPublicDomainDiagnostic("CONTENT_ASSET_VARIANT_FALLBACK_USED", {
        host: input.host,
        requestedPath: normalizedPath,
        fallbackPath,
      });
      return fallback;
    }
    logPublicDomainDiagnostic("CONTENT_ASSET_VARIANT_NOT_FOUND", {
      host: input.host,
      requestedPath: normalizedPath,
      fallbackPath,
    });
  }

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

export async function renderPublicPathResponse(input: {
  path: string;
  host: string;
  rawHost?: string | null;
  debugMode?: boolean;
  contentDebugMode?: boolean;
}): Promise<Response> {
  const rawHost = String(input.rawHost ?? input.host ?? "").trim();
  const normalizedHost = normalizePublicDomainHost(rawHost);
  const requestStartedAt = Date.now();
  logPublicDomainDiagnostic("PUBLIC_DOMAIN_REQUEST_RECEIVED", {
    rawHost,
    path: input.path,
  });
  logPublicDomainDiagnostic("PUBLIC_DOMAIN_HOST_NORMALIZED", {
    rawHost,
    host: normalizedHost,
    path: input.path,
  });
  logPublicDomainDiagnostic("PUBLIC_DOMAIN_BINDING_LOOKUP_STARTED", {
    host: normalizedHost,
    path: input.path,
  });

  if (isShadowAssetPath(input.path)) {
    const assetResponse = await renderShadowAssetResponse({ host: normalizedHost, path: input.path });
    if (assetResponse) return assetResponse;
  }

  const mode = resolvePublicRuntimeMode();
  const rawTemplateResolution = await runtimeStoreDependencies.resolveRawTemplateSiteForDomainAndPath({
    host: normalizedHost,
    path: input.path,
  });

  if (rawTemplateResolution.outcome === "raw_template_hit") {
    logPublicDomainDiagnostic("PUBLIC_DOMAIN_BINDING_FOUND", {
      host: normalizedHost,
      rawHost,
      domain: rawTemplateResolution.domain,
      siteId: rawTemplateResolution.siteId,
      siteVersionId: rawTemplateResolution.siteVersionId,
      bindingId: rawTemplateResolution.bindingId,
      status: rawTemplateResolution.status,
      normalizedPath: rawTemplateResolution.normalizedPath,
      resolvedFilePath: rawTemplateResolution.resolvedFilePath,
    });
    logPublicDomainDiagnostic("PUBLIC_DOMAIN_RAW_TEMPLATE_SELECTED", {
      host: normalizedHost,
      rawHost,
      domain: rawTemplateResolution.domain,
      siteId: rawTemplateResolution.siteId,
      siteVersionId: rawTemplateResolution.siteVersionId,
      resolvedFilePath: rawTemplateResolution.resolvedFilePath,
    });
    console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDES_LOAD_STARTED", {
      host: normalizedHost,
      domain: rawTemplateResolution.domain,
      siteVersionId: rawTemplateResolution.siteVersionId,
    });
    const slots = await runtimeStoreDependencies.listContentSlots(rawTemplateResolution.siteVersionId);
    const publishedOverrides = await runtimeStoreDependencies.listContentOverrides({
      siteVersionId: rawTemplateResolution.siteVersionId,
      status: "published",
    });
    console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDES_LOADED", {
      host: normalizedHost,
      domain: rawTemplateResolution.domain,
      siteVersionId: rawTemplateResolution.siteVersionId,
      publishedCount: publishedOverrides.length,
      slotKeys: publishedOverrides.map((override) => override.slotKey),
    });
    const sameVersionOverrides = publishedOverrides.filter(
      (override) => override.siteVersionId === rawTemplateResolution.siteVersionId,
    );
    console.info("[gnr8.content-runtime] CONTENT_RUNTIME_VERSION_RESOLVED", {
      siteId: rawTemplateResolution.siteId,
      siteVersionId: rawTemplateResolution.siteVersionId,
      mode: "production",
    });
    if (sameVersionOverrides.length !== publishedOverrides.length) {
      console.info("[gnr8.content-runtime] CONTENT_RUNTIME_VERSION_MISMATCH_BLOCKED", {
        siteId: rawTemplateResolution.siteId,
        expectedSiteVersionId: rawTemplateResolution.siteVersionId,
        blockedCount: publishedOverrides.length - sameVersionOverrides.length,
      });
    }
    console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDES_APPLY_STARTED", {
      host: normalizedHost,
      domain: rawTemplateResolution.domain,
      siteVersionId: rawTemplateResolution.siteVersionId,
      publishedCount: sameVersionOverrides.length,
      slotKeys: sameVersionOverrides.map((override) => override.slotKey),
    });
    const patched = applyContentOverridesToRawHtml({
      html: rawTemplateResolution.html,
      slots,
      overrides: sameVersionOverrides,
    });
    if (sameVersionOverrides.length === 0) {
      console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDES_EMPTY", {
        host: normalizedHost,
        domain: rawTemplateResolution.domain,
        siteVersionId: rawTemplateResolution.siteVersionId,
        publishedCount: 0,
        slotKeys: [],
      });
    }
    console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDES_APPLIED", {
      host: normalizedHost,
      domain: rawTemplateResolution.domain,
      siteVersionId: rawTemplateResolution.siteVersionId,
      publishedCount: sameVersionOverrides.length,
      appliedCount: patched.appliedCount,
      skippedCount: patched.skippedCount,
      slotKeys: sameVersionOverrides.map((override) => override.slotKey),
    });
    if (sameVersionOverrides.length > 0 && patched.appliedCount === 0) {
      const selectorBySlot = new Map(slots.map((slot) => [slot.slotKey, slot.sourceSelector]));
      console.error("[gnr8.content-runtime] CONTENT_OVERRIDE_APPLY_FAILED", {
        host: normalizedHost,
        domain: rawTemplateResolution.domain,
        siteVersionId: rawTemplateResolution.siteVersionId,
        slotKeys: sameVersionOverrides.map((override) => override.slotKey),
        selectors: sameVersionOverrides.map((override) => selectorBySlot.get(override.slotKey) ?? null),
        htmlLength: rawTemplateResolution.html.length,
        mergedOverrideCount: sameVersionOverrides.length,
        appliedCount: patched.appliedCount,
      });
    }
    for (const skipped of patched.skippedDiagnostics) {
      if (skipped.reason === "selector_missing") {
        console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDE_SELECTOR_MISSING", {
          host: normalizedHost,
          domain: rawTemplateResolution.domain,
          siteVersionId: rawTemplateResolution.siteVersionId,
          slotKeys: [skipped.slotKey],
        });
      }
      if (skipped.reason === "value_empty") {
        console.info("[gnr8.content-runtime] CONTENT_RUNTIME_OVERRIDE_VALUE_EMPTY", {
          host: normalizedHost,
          domain: rawTemplateResolution.domain,
          siteVersionId: rawTemplateResolution.siteVersionId,
          slotKeys: [skipped.slotKey],
        });
      }
    }
    let html = rewriteRawTemplateHtmlForRuntime({
      html: patched.html,
      siteId: rawTemplateResolution.siteId,
      siteVersionId: rawTemplateResolution.siteVersionId,
      resolvedFilePath: rawTemplateResolution.resolvedFilePath,
    });
    if (input.debugMode) {
      html = injectRuntimeDebugPanel({
        html,
        debug: {
          siteId: rawTemplateResolution.siteId,
          siteVersionId: rawTemplateResolution.siteVersionId,
          bindingStatus: rawTemplateResolution.status,
          details: input.contentDebugMode
            ? {
                host: normalizedHost,
                domain: rawTemplateResolution.domain,
                siteVersionId: rawTemplateResolution.siteVersionId,
                rawTemplateArtifactFound: true,
                draftOverrideCount: 0,
                publishedOverrideCount: sameVersionOverrides.length,
                mergedOverrideCount: sameVersionOverrides.length,
                appliedCount: patched.appliedCount,
                skippedCount: patched.skippedCount,
                skippedDiagnostics: patched.skippedDiagnostics,
                slotKeys: sameVersionOverrides.map((override) => override.slotKey).slice(0, 10),
              }
            : undefined,
        },
      });
    }
    return htmlResponse({ html });
  }

  if (rawTemplateResolution.reasonCode === "domain_not_found") {
    logPublicDomainDiagnostic("PUBLIC_DOMAIN_BINDING_NOT_FOUND", {
      host: normalizedHost,
      rawHost,
      path: input.path,
    });
  } else {
    logPublicDomainDiagnostic("PUBLIC_DOMAIN_BINDING_FOUND", {
      host: normalizedHost,
      rawHost,
      domain: rawTemplateResolution.domain,
      siteId: rawTemplateResolution.siteId,
      siteVersionId: rawTemplateResolution.siteVersionId,
      bindingId: rawTemplateResolution.bindingId,
      status: rawTemplateResolution.status,
      normalizedPath: rawTemplateResolution.normalizedPath,
    });
    logPublicDomainAppShellFallback({
      host: normalizedHost,
      rawHost,
      path: input.path,
      reason: "domain_binding_incomplete",
    });
  }

  const artifactResolution = await runtimeStoreDependencies.resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: normalizedHost,
    path: input.path,
  });

  if (
    rawTemplateResolution.reasonCode === "domain_not_found" &&
    artifactResolution.outcome === "artifact_hit" &&
    artifactResolution.siteResolution === "fallback_latest_site"
  ) {
    if (input.path === "/") {
      logPublicDomainAppShellFallback({
        host: normalizedHost,
        rawHost,
        path: input.path,
        reason: "domain_unbound_fallback_site_blocked",
      });
      return appShellHtmlResponse();
    }
    return notFoundHtmlResponse();
  }

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
      host: normalizedHost,
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
    host: normalizedHost,
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
  if (rawTemplateResolution.reasonCode === "domain_not_found" && input.path === "/") {
    logPublicDomainAppShellFallback({
      host: normalizedHost,
      rawHost,
      path: input.path,
      reason: "domain_not_found",
    });
    if (isPlatformAppHost(normalizedHost) || !normalizedHost) {
      return appShellHtmlResponse();
    }
  }
  return artifactResolution.reasonCode === "artifact_stage_denied"
    ? governanceDeniedHtmlResponse()
    : notFoundHtmlResponse();
}
