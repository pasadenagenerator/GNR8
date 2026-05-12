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
  const joined = (parts ?? [])
    .map((segment) => {
      const raw = normalizeText(segment);
      if (!raw) return "";
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })
    .filter(Boolean)
    .join("/");
  if (!joined) return null;
  const normalized = joined.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) return null;
  return segments.join("/");
}

function buildCorrelationKey(input: { siteId: string; siteVersionId: string; normalizedRequestedPath: string | null }): string {
  return `${input.siteId}:${input.siteVersionId}:${input.normalizedRequestedPath ?? "invalid_path"}`;
}

function resolveLookupCandidates(normalizedPath: string): string[] {
  const candidates = new Set<string>([normalizedPath]);
  if (!normalizedPath.startsWith("uploads/")) candidates.add(`uploads/${normalizedPath}`);
  if (!normalizedPath.startsWith("assets/")) candidates.add(`assets/${normalizedPath}`);
  return [...candidates];
}

function isUploadVariantSegment(segment: string): boolean {
  return /^\d+x\d+(?:_\d+x\d+)*$/i.test(segment);
}

function resolveUploadVariantFallbackPath(path: string): string | null {
  if (!path.startsWith("uploads/")) return null;
  const parts = path.split("/");
  const variantIndex = parts.findIndex((part, index) => index > 1 && isUploadVariantSegment(part));
  if (variantIndex < 0) return null;
  const withoutVariant = parts.filter((_, index) => index !== variantIndex).join("/");
  if (!withoutVariant.startsWith("uploads/")) return null;
  return withoutVariant;
}

function resolveRequestHost(headers: Headers): string {
  return (
    (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? ""
  );
}

function classifyDynamicAssetMissReason(input: {
  url: string;
  normalizedPath: string | null;
  routeDiagnostic: "PREVIEW_ASSET_ROUTE_FILE_NOT_FOUND" | "PREVIEW_ASSET_ROUTE_PATH_MISMATCH";
}): "FILE_NOT_FOUND" | "PATH_MISMATCH" | "QUERYSTRING_VARIANT" | "NON_IMPORTED_DYNAMIC_ASSET" | "UNSUPPORTED_RUNTIME_GENERATED_ASSET" {
  const url = new URL(input.url);
  if (url.searchParams.size > 0) return "QUERYSTRING_VARIANT";
  const path = (input.normalizedPath ?? "").toLowerCase();
  if (
    path.includes("sw-cleanup.js") ||
    path.includes("service-worker") ||
    path.includes("workbox") ||
    path.includes("manifest.json") ||
    /runtime\.[a-f0-9]{6,}\.(js|css)$/i.test(path)
  ) {
    return "UNSUPPORTED_RUNTIME_GENERATED_ASSET";
  }
  if (path.startsWith("uploads/") || path.startsWith("assets/")) {
    return input.routeDiagnostic === "PREVIEW_ASSET_ROUTE_PATH_MISMATCH" ? "PATH_MISMATCH" : "FILE_NOT_FOUND";
  }
  return "NON_IMPORTED_DYNAMIC_ASSET";
}

export function createPreviewAssetsRouteHandlers(overrides: Partial<PreviewAssetRouteDependencies> = {}) {
  const deps = { ...defaultDependencies, ...overrides };

  return {
    GET: async (req: Request, ctx: PreviewAssetGetContext) => {
      let requestedUrl = req.url;
      let siteId = "unknown_site";
      let siteVersionId = "unknown_version";
      let requestedPathRaw = "";
      let normalizedPath: string | null = null;
      let correlationKey = "unknown_site:unknown_version:invalid_path";
      const emitFallbackInternalDiagnostic = (code: string, reasonCode: string, error: unknown) => {
        console.error(`[preview-runtime] ${code}`, {
          code,
          requestedUrl,
          siteId,
          siteVersionId,
          requestedPath: requestedPathRaw,
          normalizedRequestedPath: normalizedPath,
          reasonCode,
          correlationKey,
          errorName: (error as { name?: string })?.name ?? "Error",
          errorMessage: String((error as { message?: string })?.message ?? "unknown"),
        });
      };
      try {
        const params = await ctx.params;
        siteId = params.siteId;
        siteVersionId = params.siteVersionId;
        const assetPath = params.assetPath;
        requestedUrl = req.url;
        requestedPathRaw = (assetPath ?? []).join("/");
        normalizedPath = normalizeAssetPath(assetPath);
        correlationKey = buildCorrelationKey({ siteId, siteVersionId, normalizedRequestedPath: normalizedPath });
        const emitRouteDiagnostic = (code: string, details: { reasonCode: string; artifactId?: string | null; lookupResult?: string | null }) => {
          console.info(`[preview-runtime] ${code}`, {
            code,
            requestedUrl,
            siteId,
            siteVersionId,
            snapshotId: siteVersionId,
            requestedPath: requestedPathRaw,
            normalizedRequestedPath: normalizedPath,
            artifactId: details.artifactId ?? null,
            lookupResult: details.lookupResult ?? null,
            reasonCode: details.reasonCode,
            correlationKey,
          });
        };
        emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_REQUEST_RECEIVED", {
          artifactId: null,
          lookupResult: null,
          reasonCode: "request_received",
        });
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

        let artifact: Awaited<ReturnType<typeof deps.getRawImportedSiteArtifact>> | Awaited<ReturnType<typeof deps.getRawTemplateSiteArtifact>> | null =
          null;
        try {
          artifact = (await deps.getRawImportedSiteArtifact(siteVersionId)) ?? (await deps.getRawTemplateSiteArtifact(siteVersionId));
        } catch (error) {
          emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR", {
            artifactId: null,
            lookupResult: "artifact_lookup_failed",
            reasonCode: "artifact_lookup_failed",
          });
          emitFallbackInternalDiagnostic("PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR", "artifact_lookup_failed", error);
          return new Response("Internal server error", {
            status: 500,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR",
            },
          });
        }
        if (!artifact) {
          emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_ARTIFACT_MISMATCH", {
            artifactId: null,
            lookupResult: "artifact_not_found",
            reasonCode: "artifact_not_found",
          });
          return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
        }
        if (artifact.siteId !== siteId) {
          emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_ARTIFACT_MISMATCH", {
            artifactId: artifact.id,
            lookupResult: "artifact_site_mismatch",
            reasonCode: "artifact_site_mismatch",
          });
          return new Response("not found", {
            status: 404,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_ARTIFACT_MISMATCH",
            },
          });
        }
        emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_ARTIFACT_RESOLVED", {
          artifactId: artifact.id,
          lookupResult: artifact.artifactType,
          reasonCode: "artifact_resolved",
        });
        if (!normalizedPath) {
          emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_PATH_MISMATCH", {
            artifactId: artifact.id,
            lookupResult: "invalid_asset_path",
            reasonCode: "invalid_asset_path",
          });
          return new Response("not found", {
            status: 404,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_PATH_MISMATCH",
              "x-gnr8-preview-asset-miss-reason": classifyDynamicAssetMissReason({
                url: req.url,
                normalizedPath,
                routeDiagnostic: "PREVIEW_ASSET_ROUTE_PATH_MISMATCH",
              }),
            },
          });
        }
        const lookupCandidates = resolveLookupCandidates(normalizedPath);
        emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_LOOKUP_STARTED", {
          artifactId: artifact.id,
          lookupResult: JSON.stringify(lookupCandidates),
          reasonCode: "lookup_started",
        });
        let resolvedPath: string | null = null;
        let asset: Awaited<ReturnType<typeof deps.getRawTemplateSiteAsset>> | null = null;
        for (const candidate of lookupCandidates) {
          let maybeAsset: Awaited<ReturnType<typeof deps.getRawTemplateSiteAsset>> | null = null;
          try {
            maybeAsset = await deps.getRawTemplateSiteAsset({
              siteVersionId,
              artifactId: artifact.id,
              filePath: candidate,
            });
          } catch (error) {
            emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR", {
              artifactId: artifact.id,
              lookupResult: candidate,
              reasonCode: "asset_lookup_failed",
            });
            emitFallbackInternalDiagnostic("PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR", "asset_lookup_failed", error);
            return new Response("Internal server error", {
              status: 500,
              headers: {
                "content-type": "text/plain; charset=utf-8",
                "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR",
              },
            });
          }
          if (!maybeAsset) continue;
          resolvedPath = candidate;
          asset = maybeAsset;
          break;
        }
        if (!asset) {
          const fallbackPath = resolveUploadVariantFallbackPath(normalizedPath);
          if (fallbackPath) {
            let fallbackAsset: Awaited<ReturnType<typeof deps.getRawTemplateSiteAsset>> | null = null;
            try {
              fallbackAsset = await deps.getRawTemplateSiteAsset({
                siteVersionId,
                artifactId: artifact.id,
                filePath: fallbackPath,
              });
            } catch (error) {
              emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR", {
                artifactId: artifact.id,
                lookupResult: fallbackPath,
                reasonCode: "asset_lookup_failed",
              });
              emitFallbackInternalDiagnostic("PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR", "asset_lookup_failed", error);
              return new Response("Internal server error", {
                status: 500,
                headers: {
                  "content-type": "text/plain; charset=utf-8",
                  "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_DB_LOOKUP_ERROR",
                },
              });
            }
            if (fallbackAsset) {
              console.info("[preview-runtime] CONTENT_ASSET_VARIANT_FALLBACK_USED", {
                siteId,
                siteVersionId,
                requestedPath: normalizedPath,
                fallbackPath,
                artifactType: artifact.artifactType,
              });
              resolvedPath = fallbackPath;
              asset = fallbackAsset;
            } else {
              console.warn("[preview-runtime] CONTENT_ASSET_VARIANT_NOT_FOUND", {
                siteId,
                siteVersionId,
                requestedPath: normalizedPath,
                fallbackPath,
                artifactType: artifact.artifactType,
              });
            }
          }
        }
        if (!asset) {
          const fileMapCandidates = new Set<string>(lookupCandidates);
          const fallbackPath = resolveUploadVariantFallbackPath(normalizedPath);
          if (fallbackPath) fileMapCandidates.add(fallbackPath);
          const missingPersistedPath = [...fileMapCandidates].find((candidate) => Boolean(artifact.fileMap[candidate]));
          if (missingPersistedPath) {
            emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_PATH_MISMATCH", {
              artifactId: artifact.id,
              lookupResult: missingPersistedPath,
              reasonCode: "file_map_entry_found_without_file_row",
            });
            console.warn("[preview-runtime] RAW_IMPORT_FILE_MAP_ENTRY_FOUND_WITHOUT_FILE_ROW", {
              siteId,
              siteVersionId,
              requestedPath: normalizedPath,
              matchedFileMapPath: missingPersistedPath,
              candidates: [...fileMapCandidates],
              artifactType: artifact.artifactType,
            });
          return new Response("not found", {
            status: 404,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_PATH_MISMATCH",
              "x-gnr8-preview-asset-miss-reason": classifyDynamicAssetMissReason({
                url: req.url,
                normalizedPath,
                routeDiagnostic: "PREVIEW_ASSET_ROUTE_PATH_MISMATCH",
              }),
            },
          });
        }
          emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_FILE_NOT_FOUND", {
            artifactId: artifact.id,
            lookupResult: "asset_not_found",
            reasonCode: "asset_not_found",
          });
          console.warn("[preview-runtime] RAW_IMPORT_ASSET_LOOKUP_MISSING", {
            siteId,
            siteVersionId,
            path: normalizedPath,
            candidates: lookupCandidates,
            reason: "asset_not_found",
          });
          return new Response("not found", {
            status: 404,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_FILE_NOT_FOUND",
              "x-gnr8-preview-asset-miss-reason": classifyDynamicAssetMissReason({
                url: req.url,
                normalizedPath,
                routeDiagnostic: "PREVIEW_ASSET_ROUTE_FILE_NOT_FOUND",
              }),
            },
          });
        }

        emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_FILE_FOUND", {
          artifactId: artifact.id,
          lookupResult: resolvedPath ?? normalizedPath,
          reasonCode: "asset_found",
        });
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
        let responseBody: BodyInit;
        try {
          const binaryBytes = new Uint8Array(asset.bytes);
          const binaryBody = binaryBytes.buffer.slice(
            binaryBytes.byteOffset,
            binaryBytes.byteOffset + binaryBytes.byteLength,
          ) as ArrayBuffer;
          responseBody = isCssAsset
            ? rewriteRawTemplateCssForRuntime({
                css: asset.bytes.toString("utf8"),
                siteId,
                siteVersionId,
                assetFilePath: effectivePath,
              })
            : binaryBody;
        } catch (error) {
          emitRouteDiagnostic("PREVIEW_ASSET_ROUTE_FILE_READ_ERROR", {
            artifactId: artifact.id,
            lookupResult: effectivePath,
            reasonCode: "asset_bytes_read_failed",
          });
          emitFallbackInternalDiagnostic("PREVIEW_ASSET_ROUTE_FILE_READ_ERROR", "asset_bytes_read_failed", error);
          return new Response("Internal server error", {
            status: 500,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_FILE_READ_ERROR",
            },
          });
        }
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
        emitFallbackInternalDiagnostic("PREVIEW_ASSET_ROUTE_INTERNAL_ERROR", "unhandled_exception", error);
        return new Response("Internal server error", {
          status: 500,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-gnr8-preview-asset-diagnostic": "PREVIEW_ASSET_ROUTE_INTERNAL_ERROR",
          },
        });
      }
    },
  };
}
