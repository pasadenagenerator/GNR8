import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";
import {
  loadGeneratedWebsiteVersionThumbnail,
  loadOriginalWebsiteVersionThumbnail,
  thumbnailBody,
} from "@/gnr8/architecture/website-version-thumbnail-persistence";

type ThumbnailRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  loadOriginal: typeof loadOriginalWebsiteVersionThumbnail;
  loadGenerated: typeof loadGeneratedWebsiteVersionThumbnail;
};

function securityHeaders(input: { contentType?: string; byteLength?: number; contentHash?: string }): HeadersInit {
  return {
    ...(input.contentType ? { "content-type": input.contentType } : { "content-type": "application/json; charset=utf-8" }),
    ...(typeof input.byteLength === "number" ? { "content-length": String(input.byteLength) } : {}),
    ...(input.contentHash ? { etag: `"sha256-${input.contentHash}"` } : {}),
    "cache-control": input.contentHash ? "private, immutable, max-age=31536000" : "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}

function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function parseIteration(value: unknown): number | null {
  const normalized = String(value ?? "").trim();
  if (normalized === "1") return 1;
  if (normalized === "2") return 2;
  return null;
}

export function createWebsiteVersionThumbnailRouteHandlers(deps: Partial<ThumbnailRouteDeps> = {}) {
  const resolved: ThumbnailRouteDeps = {
    requireSuperadminUserId,
    loadOriginal: loadOriginalWebsiteVersionThumbnail,
    loadGenerated: loadGeneratedWebsiteVersionThumbnail,
    ...deps,
  };

  async function serve(input: { siteVersionId: string; iteration?: string | null }): Promise<Response> {
    const siteVersionId = String(input.siteVersionId ?? "").trim();
    if (!siteVersionId) {
      return Response.json({ ok: false, code: "INVALID_SITE_VERSION" }, { status: 404, headers: securityHeaders({}) });
    }
    const thumbnail = input.iteration == null
      ? await resolved.loadOriginal({ siteVersionId })
      : await (async () => {
          const iteration = parseIteration(input.iteration);
          if (!iteration) return null;
          return resolved.loadGenerated({ siteVersionId, iteration });
        })();
    if (!thumbnail || thumbnail.availability.status !== "ready" || thumbnail.artifactKind !== "website_version_thumbnail") {
      return Response.json({ ok: false, code: "THUMBNAIL_UNAVAILABLE" }, { status: 404, headers: securityHeaders({}) });
    }
    const body = thumbnailBody(thumbnail);
    if (body.byteLength !== thumbnail.byteLength) {
      return Response.json({ ok: false, code: "THUMBNAIL_INTEGRITY_MISMATCH" }, { status: 404, headers: securityHeaders({}) });
    }
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: securityHeaders({
        contentType: thumbnail.mediaType,
        byteLength: thumbnail.byteLength,
        contentHash: thumbnail.contentHash,
      }),
    });
  }

  return {
    async GET(
      _request: Request,
      context: { params: Promise<{ siteVersionId: string; iteration?: string }> },
    ): Promise<Response> {
      try {
        await resolved.requireSuperadminUserId();
        const params = await context.params;
        return serve(params);
      } catch (error) {
        const status = statusForError(error);
        return Response.json(
          {
            ok: false,
            code: status === 401 ? "UNAUTHORIZED" : status === 403 ? "SUPERADMIN_REQUIRED" : "THUMBNAIL_ROUTE_ERROR",
            message: error instanceof Error ? error.message : "Thumbnail route failed.",
          },
          { status, headers: securityHeaders({}) },
        );
      }
    },
  };
}
