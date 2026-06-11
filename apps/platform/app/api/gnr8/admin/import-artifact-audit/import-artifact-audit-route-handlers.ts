import {
  buildImportArtifactRealityAuditReport,
  type ImportArtifactRealityAuditReport,
} from "@/gnr8/runtime/import-artifact-reality-audit";
import {
  normalizeRawTemplateRouteMapPath,
  resolveRawTemplateRouteMapFile,
} from "@/gnr8/runtime/raw-template-route-map-resolver";
import {
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  getSiteVersion,
  type RuntimeStoreDbClient,
} from "@/gnr8/runtime/runtime-store";
import { withSuperadminClient } from "@/src/superadmin/db";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type ImportArtifactAuditRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  withSuperadminClient: typeof withSuperadminClient;
  getSiteVersion: typeof getSiteVersion;
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact;
  getRawTemplateSiteAsset: typeof getRawTemplateSiteAsset;
  fetch: FetchLike;
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function deriveRouteSourceUrl(input: { baseSourceUrl: string; routePath: string }): string {
  const routePath = normalizeRawTemplateRouteMapPath(input.routePath);
  try {
    if (routePath === "/") return new URL(input.baseSourceUrl).toString();
    return new URL(routePath.replace(/^\//, ""), new URL(input.baseSourceUrl)).toString();
  } catch {
    return input.baseSourceUrl;
  }
}

async function loadAuditReportForRoute(input: {
  siteVersionId: string;
  routePath: string;
  dbClient: RuntimeStoreDbClient;
  deps: ImportArtifactAuditRouteDependencies;
}): Promise<ImportArtifactRealityAuditReport> {
  const [siteVersion, artifact] = await Promise.all([
    input.deps.getSiteVersion(input.siteVersionId, { dbClient: input.dbClient }),
    input.deps.getRawImportedSiteArtifact(input.siteVersionId, { dbClient: input.dbClient }),
  ]);
  if (!siteVersion) throw new Error("SITE_VERSION_NOT_FOUND");
  if (!artifact) throw new Error("RAW_IMPORTED_ARTIFACT_NOT_FOUND");

  const routeMapResolution = resolveRawTemplateRouteMapFile({
    siteVersionId: input.siteVersionId,
    requestedPath: input.routePath,
    entryHtmlPath: artifact.entryHtmlPath,
    fileMap: artifact.fileMap,
    importProvenanceSummary: siteVersion.importProvenanceSummary,
    routeMapServingEnabled: true,
  });
  if (routeMapResolution.outcome === "miss") throw new Error(`RAW_ARTIFACT_ROUTE_NOT_FOUND:${routeMapResolution.routePath}`);
  if (routeMapResolution.outcome === "file_missing") throw new Error(`RAW_ARTIFACT_ROUTE_FILE_MISSING:${routeMapResolution.rawFilePath}`);

  const rawFilePath = routeMapResolution.outcome === "selected" ? routeMapResolution.rawFilePath : artifact.entryHtmlPath;
  const rawHtmlAsset = await input.deps.getRawTemplateSiteAsset({
    siteVersionId: input.siteVersionId,
    artifactId: artifact.id,
    filePath: rawFilePath,
    dbClient: input.dbClient,
  });
  if (!rawHtmlAsset) throw new Error(`RAW_ARTIFACT_HTML_FILE_MISSING:${rawFilePath}`);

  const sourceUrl =
    routeMapResolution.outcome === "selected"
      ? routeMapResolution.finalUrl ?? routeMapResolution.sourceUrl ?? deriveRouteSourceUrl({ baseSourceUrl: artifact.metadata.sourceUrl, routePath: input.routePath })
      : deriveRouteSourceUrl({ baseSourceUrl: artifact.metadata.sourceUrl, routePath: input.routePath });
  if (!sourceUrl) throw new Error("SOURCE_URL_NOT_FOUND");

  const sourceResponse = await input.deps.fetch(sourceUrl, {
    headers: {
      "user-agent": "GNR8 import artifact reality audit/1.0",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  if (!sourceResponse.ok) throw new Error(`SOURCE_FETCH_FAILED:${sourceResponse.status}`);
  const sourceHtml = await sourceResponse.text();

  return buildImportArtifactRealityAuditReport({
    routePath: normalizeRawTemplateRouteMapPath(input.routePath),
    sourceUrl,
    rawFilePath,
    sourceHtml,
    rawArtifactHtml: rawHtmlAsset.bytes.toString("utf8"),
  });
}

function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  if (
    message === "SITE_VERSION_NOT_FOUND" ||
    message === "RAW_IMPORTED_ARTIFACT_NOT_FOUND" ||
    message.startsWith("RAW_ARTIFACT_ROUTE_NOT_FOUND") ||
    message.startsWith("RAW_ARTIFACT_ROUTE_FILE_MISSING") ||
    message.startsWith("RAW_ARTIFACT_HTML_FILE_MISSING")
  ) {
    return 404;
  }
  if (message.startsWith("SOURCE_FETCH_FAILED")) return 502;
  return 500;
}

export function createImportArtifactAuditRouteHandlers(deps: Partial<ImportArtifactAuditRouteDependencies> = {}) {
  const resolvedDeps: ImportArtifactAuditRouteDependencies = {
    requireSuperadminUserId,
    withSuperadminClient,
    getSiteVersion,
    getRawImportedSiteArtifact,
    getRawTemplateSiteAsset,
    fetch: globalThis.fetch.bind(globalThis),
    ...deps,
  };

  return {
    async GET(request: Request): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const url = new URL(request.url);
        const siteVersionId = normalizeToken(url.searchParams.get("siteVersionId"));
        const routePath = normalizeToken(url.searchParams.get("path")) || "/";
        if (!siteVersionId) return Response.json({ ok: false, error: "siteVersionId is required" }, { status: 400 });

        const report = await resolvedDeps.withSuperadminClient((dbClient) =>
          loadAuditReportForRoute({
            siteVersionId,
            routePath,
            dbClient,
            deps: resolvedDeps,
          }),
        );

        return Response.json(
          {
            ok: true,
            siteVersionId,
            report,
          },
          { headers: { "cache-control": "no-store" } },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import artifact audit failed";
        return Response.json({ ok: false, error: message }, { status: statusForError(error) });
      }
    },
  };
}
