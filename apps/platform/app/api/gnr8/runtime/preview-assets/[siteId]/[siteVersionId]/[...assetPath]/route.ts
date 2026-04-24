import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getRawTemplateSiteArtifact, getRawTemplateSiteAsset } from "@/gnr8/runtime/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ siteId: string; siteVersionId: string; assetPath?: string[] }> },
) {
  try {
    const { siteId, siteVersionId, assetPath } = await ctx.params;
    const agencyId = await resolveAgencyIdForSiteVersion(siteVersionId);
    if (!agencyId) {
      return new Response("forbidden", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    await requireAgencyActionContext({
      action: "view_dashboard",
      requestedAgencyId: agencyId,
    });

    const artifact = await getRawTemplateSiteArtifact(siteVersionId);
    if (!artifact || artifact.siteId !== siteId) {
      console.warn("[preview-runtime] RAW_TEMPLATE_ASSET_MISSING", {
        siteId,
        siteVersionId,
        path: normalizeAssetPath(assetPath),
        reason: "artifact_missing_or_site_mismatch",
      });
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    const normalizedPath = normalizeAssetPath(assetPath);
    if (!normalizedPath) {
      console.warn("[preview-runtime] RAW_TEMPLATE_ASSET_MISSING", {
        siteId,
        siteVersionId,
        path: null,
        reason: "invalid_asset_path",
      });
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    const asset = await getRawTemplateSiteAsset({
      siteVersionId,
      filePath: normalizedPath,
    });
    if (!asset) {
      console.warn("[preview-runtime] RAW_TEMPLATE_ASSET_MISSING", {
        siteId,
        siteVersionId,
        path: normalizedPath,
        reason: "asset_not_found",
      });
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    console.info("[preview-runtime] RAW_TEMPLATE_ASSET_RESOLVED", {
      siteId,
      siteVersionId,
      path: normalizedPath,
      bytes: asset.sizeBytes,
      mediaType: asset.mediaType,
    });
    return new Response(new Uint8Array(asset.bytes), {
      status: 200,
      headers: {
        "content-type": asset.mediaType || "application/octet-stream",
        "cache-control": "no-store",
        "x-gnr8-preview-asset-path": normalizedPath,
      },
    });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
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
}
