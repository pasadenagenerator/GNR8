import {
  generationPreviewSecurityHeaders,
  resolveGenerationPreviewFile,
} from "@/gnr8/architecture/generation-evolution-preview-boundary";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

export type GenerationEvolutionPreviewRouteDependencies = {
  requireSuperadminUserId: () => Promise<string>;
  resolvePreviewFile: typeof resolveGenerationPreviewFile;
};

function previewAssetBasePath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const marker = "/preview";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return `${pathname.replace(/\/$/, "")}/source/`;
  return `${pathname.slice(0, markerIndex + marker.length).replace(/\/$/, "")}/source/`;
}

function rewriteHtmlRelativeAssetReferences(html: string, assetBasePath: string): string {
  return html.replace(
    /\b(href|src)=(["'])\.\/([^"'#?:][^"']*)\2/g,
    (_match, attribute: string, quote: string, relativePath: string) => (
      `${attribute}=${quote}${assetBasePath}${relativePath}${quote}`
    ),
  );
}

function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

export function createGenerationEvolutionPreviewRouteHandlers(
  deps: Partial<GenerationEvolutionPreviewRouteDependencies> = {},
) {
  const resolved: GenerationEvolutionPreviewRouteDependencies = {
    requireSuperadminUserId,
    resolvePreviewFile: resolveGenerationPreviewFile,
    ...deps,
  };

  return {
    async GET(
      request: Request,
      context: { params: Promise<{ siteVersionId: string; iteration: string; assetPath?: string[] }> },
    ): Promise<Response> {
      try {
        await resolved.requireSuperadminUserId();
        const params = await context.params;
        const result = await resolved.resolvePreviewFile({
          siteVersionId: params.siteVersionId,
          iteration: params.iteration,
          assetPathSegments: params.assetPath,
        });

        if (!result.ok) {
          return Response.json(
            { ok: false, code: result.code, message: result.message },
            {
              status: result.status,
              headers: generationPreviewSecurityHeaders("application/json; charset=utf-8"),
            },
          );
        }

        if (result.contentType.startsWith("text/html")) {
          const html = new TextDecoder().decode(result.body);
          const rewritten = rewriteHtmlRelativeAssetReferences(html, previewAssetBasePath(request));
          return new Response(new TextEncoder().encode(rewritten), {
            status: 200,
            headers: generationPreviewSecurityHeaders(result.contentType),
          });
        }

        return new Response(result.body, {
          status: 200,
          headers: generationPreviewSecurityHeaders(result.contentType),
        });
      } catch (error) {
        const status = statusForError(error);
        return Response.json(
          {
            ok: false,
            code: status === 401 ? "UNAUTHORIZED" : status === 403 ? "SUPERADMIN_REQUIRED" : "PREVIEW_ROUTE_ERROR",
            message: error instanceof Error ? error.message : "Preview route failed.",
          },
          {
            status,
            headers: generationPreviewSecurityHeaders("application/json; charset=utf-8"),
          },
        );
      }
    },
  };
}
