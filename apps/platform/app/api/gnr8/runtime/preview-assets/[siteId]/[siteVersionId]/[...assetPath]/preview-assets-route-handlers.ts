import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import {
  getRawTemplateSiteArtifact,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  resolveDomainSiteVersionForHost,
} from "@/gnr8/runtime/runtime-store";
import { resolveAssetMediaType, rewriteRawTemplateCssForRuntime } from "@/src/public-site/raw-template-runtime";

type PreviewAssetGetContext = { params: Promise<{ siteId: string; siteVersionId: string; assetPath?: string[] }> };

type PreviewAssetRouteDependencies = {
  resolveDomainSiteVersionForHost: typeof resolveDomainSiteVersionForHost;
  resolveAgencyIdForSiteVersion: typeof resolveAgencyIdForSiteVersion;
  requireAgencyActionContext: typeof requireAgencyActionContext;
  getRawTemplateSiteArtifact: typeof getRawTemplateSiteArtifact;
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact;
  getRawTemplateSiteAsset: typeof getRawTemplateSiteAsset;
  parseAgencyActionContextError: typeof parseAgencyActionContextError;
};

const defaultDependencies: PreviewAssetRouteDependencies = {
  resolveDomainSiteVersionForHost,
  resolveAgencyIdForSiteVersion,
  requireAgencyActionContext,
  getRawTemplateSiteArtifact,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  parseAgencyActionContextError,
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeAssetPath(parts: string[] | undefined): string | null {
  const joined = (parts ?? []).map((segment) => normalizeText(segment)).filter(Boolean).join("/");
  if (!joined) return null;
  const normalized = joined.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) return null;
  return segments.join("/");
}

function resolveLookupCandidates(normalizedPath: string): string[] {
  const candidates = new Set<string>([normalizedPath]);
  if (!normalizedPath.startsWith("uploads/")) candidates.add(`uploads/${normalizedPath}`);
  if (!normalizedPath.startsWith("assets/")) candidates.add(`assets/${normalizedPath}`);
  return [...candidates];
}

function resolveRequestHost(headers: Headers): string {
  return (
    (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? ""
  );
}

export function createPreviewAssetsRouteHandlers(overrides: Partial<PreviewAssetRouteDependencies> = {}) {
  const deps = { ...defaultDependencies, ...overrides };

  return {
    GET: async (req: Request, ctx: PreviewAssetGetContext) => {
      try {
        const { siteId, siteVersionId, assetPath } = await ctx.params;
        const requestHost = resolveRequestHost(req.headers);
        const debugMode = new URL(req.url).searchParams.get("__debug") === "1";
        const publicDomainResolution = await deps.resolveDomainSiteVersionForHost({ host: requestHost });
        const isPublicDomainAssetRequest =
          publicDomainResolution.outcome === "domain_hit" &&
          publicDomainResolution.siteId === siteId &&
          publicDomainResolution.siteVersionId === siteVersionId;
        const mismatchedPublicDomainAssetRequest =
          publicDomainResolution.outcome === "domain_hit" && !isPublicDomainAssetRequest;

        if (mismatchedPublicDomainAssetRequest) {
          return new Response("forbidden", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
        }

        if (!isPublicDomainAssetRequest) {
          const agencyId = await deps.resolveAgencyIdForSiteVersion(siteVersionId);
          if (!agencyId) {
            return new Response("forbidden", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
          }
          await deps.requireAgencyActionContext({
            action: "view_dashboard",
            requestedAgencyId: agencyId,
          });
        }

        const artifact = (await deps.getRawImportedSiteArtifact(siteVersionId)) ?? (await deps.getRawTemplateSiteArtifact(siteVersionId));
        if (!artifact || artifact.siteId !== siteId) {
          console.warn("[preview-runtime] RAW_IMPORT_ASSET_LOOKUP_MISSING", {
            siteId,
            siteVersionId,
            path: normalizeAssetPath(assetPath),
            reason: "artifact_missing_or_site_mismatch",
          });
          return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
        }

        const normalizedPath = normalizeAssetPath(assetPath);
        if (!normalizedPath) {
          console.warn("[preview-runtime] RAW_IMPORT_ASSET_LOOKUP_MISSING", {
            siteId,
            siteVersionId,
            path: null,
            reason: "invalid_asset_path",
          });
          return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
        }
        const lookupCandidates = resolveLookupCandidates(normalizedPath);
        console.info("[preview-runtime] RAW_IMPORT_ASSET_LOOKUP_STARTED", {
          siteId,
          siteVersionId,
          artifactType: artifact.artifactType,
          path: normalizedPath,
          candidates: lookupCandidates,
        });
        let resolvedPath: string | null = null;
        let asset: Awaited<ReturnType<typeof deps.getRawTemplateSiteAsset>> | null = null;
        for (const candidate of lookupCandidates) {
          const maybeAsset = await deps.getRawTemplateSiteAsset({
            siteVersionId,
            artifactId: artifact.id,
            filePath: candidate,
          });
          if (!maybeAsset) continue;
          resolvedPath = candidate;
          asset = maybeAsset;
          break;
        }
        if (!asset) {
          console.warn("[preview-runtime] RAW_IMPORT_ASSET_LOOKUP_MISSING", {
            siteId,
            siteVersionId,
            path: normalizedPath,
            candidates: lookupCandidates,
            reason: "asset_not_found",
          });
          return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
        }

        console.info("[preview-runtime] RAW_IMPORT_ASSET_LOOKUP_FOUND", {
          siteId,
          siteVersionId,
          requestedPath: normalizedPath,
          resolvedPath,
          artifactType: artifact.artifactType,
          bytes: asset.sizeBytes,
          mediaType: asset.mediaType,
        });

        const effectivePath = resolvedPath ?? normalizedPath;
        const isCssAsset = effectivePath.toLowerCase().endsWith(".css");
        const responseBody =
          isCssAsset
            ? new TextEncoder().encode(
                rewriteRawTemplateCssForRuntime({
                  css: asset.bytes.toString("utf8"),
                  siteId,
                  siteVersionId,
                  assetFilePath: effectivePath,
                }),
              )
            : new Uint8Array(asset.bytes);
        const contentType = resolveAssetMediaType({ filePath: effectivePath, mediaType: asset.mediaType });

        const headers: Record<string, string> = {
          "content-type": contentType,
          "cache-control": "public, max-age=31536000, immutable",
          "x-gnr8-preview-asset-path": effectivePath,
        };
        if (debugMode) {
          headers["x-gnr8-debug-site-id"] = siteId;
          headers["x-gnr8-debug-version-id"] = siteVersionId;
          headers["x-gnr8-debug-binding"] =
            publicDomainResolution.outcome === "domain_hit" ? publicDomainResolution.status : "dashboard_auth";
        }

        return new Response(responseBody, {
          status: 200,
          headers,
        });
      } catch (error) {
        const mapped = deps.parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return new Response(mapped.message, {
            status: mapped.status,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        return new Response("Internal server error", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    },
  };
}
