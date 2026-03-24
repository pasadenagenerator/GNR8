import {
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  resolveRuntimeSiteForHost,
  type PublicRuntimeArtifactMissReasonCode,
} from "@/gnr8/runtime/runtime-store";

export type Gnr8PublicRuntimeMode = "artifact-only" | "artifact-with-builder-fallback";

const VALID_RUNTIME_MODES = new Set<Gnr8PublicRuntimeMode>([
  "artifact-only",
  "artifact-with-builder-fallback",
]);

type HeaderReader = {
  get(name: string): string | null;
};

type PublicRuntimeResolutionOutcome = "artifact_hit" | "artifact_miss" | "fallback_hit" | "fallback_miss" | "artifact_only_404";

type BuilderFallbackResult =
  | {
      hit: true;
      html: string;
      reasonCode:
        | "builder_data_fallback"
        | "builder_default_org_missing";
    }
  | {
      hit: false;
      reasonCode: "builder_page_not_found";
    };

function logPublicRuntimeResolution(input: {
  outcome: PublicRuntimeResolutionOutcome;
  mode: Gnr8PublicRuntimeMode;
  host: string;
  path: string;
  siteId?: string | null;
  siteVersionId?: string | null;
  artifactId?: string | null;
  hostBindingId?: string | null;
  hostBindingKind?: string | null;
  hostBindingStatus?: string | null;
  reasonCode?: string | null;
  resolvedPath?: string | null;
}): void {
  const payload = {
    outcome: input.outcome,
    mode: input.mode,
    host: input.host,
    path: input.path,
    siteId: input.siteId ?? null,
    siteVersionId: input.siteVersionId ?? null,
    artifactId: input.artifactId ?? null,
    hostBindingId: input.hostBindingId ?? null,
    hostBindingKind: input.hostBindingKind ?? null,
    hostBindingStatus: input.hostBindingStatus ?? null,
    reasonCode: input.reasonCode ?? null,
    resolvedPath: input.resolvedPath ?? null,
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

  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  if (vercelEnv === "production") return "artifact-with-builder-fallback";
  return "artifact-only";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asHtmlDocument(body: string, title: string): string {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${escapeHtml(title)}</title>\n</head>\n<body>\n${body}\n</body>\n</html>`;
}

function renderBuilderDataFallbackHtml(input: { slug: string; title: string | null; data: unknown }): string {
  const title = input.title ?? "Untitled";
  const serialized = escapeHtml(JSON.stringify(input.data ?? {}, null, 2));
  return asHtmlDocument(
    `<main style="padding:24px"><h1>${escapeHtml(title)}</h1><p>slug: <code>${escapeHtml(input.slug)}</code></p><pre style="white-space:pre-wrap">${serialized}</pre></main>`,
    title,
  );
}

async function renderBuilderFallback(input: { path: string; host: string }): Promise<BuilderFallbackResult> {
  const orgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID?.trim();
  if (!orgId) {
    return {
      hit: true,
      reasonCode: "builder_default_org_missing",
      html: asHtmlDocument(
        "<main style=\"padding:24px\"><h1>Missing env</h1><p>Set <code>NEXT_PUBLIC_DEFAULT_ORG_ID</code> in Vercel.</p></main>",
        "Missing env",
      ),
    };
  }

  const { getPublicPageByOrgAndSlug } = await import("@/src/public-site/public-pages");
  const page = await getPublicPageByOrgAndSlug({
    orgId,
    slug: input.path,
    host: input.host,
  });

  if (!page) return { hit: false, reasonCode: "builder_page_not_found" };

  return {
    hit: true,
    reasonCode: "builder_data_fallback",
    html: renderBuilderDataFallbackHtml({
      slug: page.slug,
      title: page.title ?? null,
      data: page.data ?? {},
    }),
  };
}

function logPublicRuntimeFailure(input: {
  mode: Gnr8PublicRuntimeMode;
  host: string;
  path: string;
  reasonCode: "fallback_miss" | "builder_page_not_found" | PublicRuntimeArtifactMissReasonCode;
}): void {
  if (input.mode === "artifact-only") {
    logPublicRuntimeResolution({
      outcome: "artifact_only_404",
      mode: input.mode,
      host: input.host,
      path: input.path,
      reasonCode: input.reasonCode,
    });
  } else {
    logPublicRuntimeResolution({
      outcome: "fallback_miss",
      mode: input.mode,
      host: input.host,
      path: input.path,
      reasonCode: input.reasonCode,
    });
  }
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

  const artifactResolution = await resolveActiveArtifactForHostAndPathWithDiagnostics({
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

  const site = await resolveRuntimeSiteForHost({ host: input.host });
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
  if (isShadowAssetPath(input.path)) {
    const assetResponse = await renderShadowAssetResponse(input);
    if (assetResponse) return assetResponse;
  }

  const mode = resolvePublicRuntimeMode();

  const artifactResolution = await resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: input.host,
    path: input.path,
  });

  if (artifactResolution.outcome === "artifact_hit") {
    logPublicRuntimeResolution({
      outcome: "artifact_hit",
      mode,
      host: input.host,
      path: input.path,
      siteId: artifactResolution.siteId,
      siteVersionId: artifactResolution.activeSiteVersionId,
      artifactId: artifactResolution.artifactId,
      hostBindingId: artifactResolution.hostBindingId,
      hostBindingKind: artifactResolution.hostBindingKind,
      hostBindingStatus: artifactResolution.hostBindingStatus,
      resolvedPath: artifactResolution.resolvedPath,
      reasonCode:
        artifactResolution.siteResolution === "fallback_latest_site" ? artifactResolution.siteResolution : null,
    });
    return htmlResponse({ html: artifactResolution.html });
  }

  logPublicRuntimeResolution({
    outcome: "artifact_miss",
    mode,
    host: input.host,
    path: input.path,
    siteId: artifactResolution.siteId,
    siteVersionId: artifactResolution.activeSiteVersionId,
    artifactId: artifactResolution.artifactId,
    hostBindingId: artifactResolution.hostBindingId,
    hostBindingKind: artifactResolution.hostBindingKind,
    hostBindingStatus: artifactResolution.hostBindingStatus,
    reasonCode: artifactResolution.reasonCode,
  });

  if (mode === "artifact-with-builder-fallback") {
    const fallback = await renderBuilderFallback(input);
    if (fallback.hit) {
      logPublicRuntimeResolution({
        outcome: "fallback_hit",
        mode,
        host: input.host,
        path: input.path,
        siteId: artifactResolution.siteId,
        siteVersionId: artifactResolution.activeSiteVersionId,
        artifactId: artifactResolution.artifactId,
        hostBindingId: artifactResolution.hostBindingId,
        hostBindingKind: artifactResolution.hostBindingKind,
        hostBindingStatus: artifactResolution.hostBindingStatus,
        reasonCode: fallback.reasonCode,
      });
      return htmlResponse({
        html: fallback.html,
      });
    }
    logPublicRuntimeFailure({
      mode,
      host: input.host,
      path: input.path,
      reasonCode: fallback.reasonCode,
    });
    return notFoundHtmlResponse();
  }

  logPublicRuntimeFailure({
    mode,
    host: input.host,
    path: input.path,
    reasonCode: artifactResolution.reasonCode,
  });
  return notFoundHtmlResponse();
}
