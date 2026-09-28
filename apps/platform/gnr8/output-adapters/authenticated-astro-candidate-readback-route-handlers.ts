import { renderSiteVersionPreview } from "../runtime/unified-render-preview";
import { requireSuperadminUserId } from "../../src/auth/require-superadmin-user-id";
import {
  AuthenticatedAstroCandidateReadbackError,
  createAuthenticatedAstroCandidateReadbackService,
  type AuthenticatedAstroCandidateReadbackPreview,
  type AuthenticatedAstroCandidateReadbackServiceDependencies,
} from "./authenticated-astro-candidate-readback-service";

export const AUTHENTICATED_ASTRO_READBACK_HTML_CSP = [
  "sandbox",
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "media-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export type AuthenticatedAstroCandidateReadbackRouteDependencies = Partial<
  AuthenticatedAstroCandidateReadbackServiceDependencies
>;

const commonHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
} as const;

export function createAuthenticatedAstroCandidateReadbackRouteHandlers(
  dependencies: AuthenticatedAstroCandidateReadbackRouteDependencies = {},
) {
  const readback = createAuthenticatedAstroCandidateReadbackService({
    authenticateSuperadmin: dependencies.authenticateSuperadmin ?? requireSuperadminUserId,
    resolveTrustedScope: dependencies.resolveTrustedScope,
    repository: dependencies.repository,
    renderPreview: dependencies.renderPreview ?? renderWithUnifiedPreview,
  });

  return {
    async GET(request: Request): Promise<Response> {
      try {
        const url = new URL(request.url);
        const result = await readback({
          candidateId: url.searchParams.get("candidateId") ?? "",
          siteId: url.searchParams.get("siteId") ?? "",
          siteVersionId: url.searchParams.get("siteVersionId") ?? "",
          path: url.searchParams.get("path") ?? "/",
        });
        return new Response(result.preview.html, {
          status: 200,
          headers: {
            ...commonHeaders,
            "content-type": "text/html; charset=utf-8",
            "content-security-policy": AUTHENTICATED_ASTRO_READBACK_HTML_CSP,
          },
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}

async function renderWithUnifiedPreview(input: Parameters<
  AuthenticatedAstroCandidateReadbackServiceDependencies["renderPreview"]
>[0]): Promise<AuthenticatedAstroCandidateReadbackPreview> {
  const preview = await renderSiteVersionPreview({
    siteVersionId: input.selectors.siteVersionId,
    path: input.selectors.path,
    mode: "transformed",
    astroCandidateSelection: {
      candidateId: input.selectors.candidateId,
      siteId: input.selectors.siteId,
    },
    astroCandidateLoader: async (candidateId) =>
      candidateId === input.selectors.candidateId ? input.candidate : null,
    previewPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
  });
  if (
    preview.source !== "astro_internal_preview_candidate" ||
    preview.fallbackUsed !== false ||
    preview.artifactId !== input.selectors.candidateId ||
    preview.siteId !== input.selectors.siteId ||
    preview.siteVersionId !== input.selectors.siteVersionId
  ) {
    throw new AuthenticatedAstroCandidateReadbackError(
      "unavailable",
      "Unified preview did not select the validated Astro candidate.",
    );
  }
  return {
    html: preview.html,
    source: "astro_internal_preview_candidate",
    candidateId: preview.artifactId,
    siteId: preview.siteId,
    siteVersionId: preview.siteVersionId,
    path: preview.path,
    fallbackUsed: false,
  };
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Unauthorized")) {
    return jsonError(401, "Authentication required.");
  }
  if (message.startsWith("Forbidden")) {
    return jsonError(403, "Superadmin access required.");
  }
  if (error instanceof AuthenticatedAstroCandidateReadbackError) {
    if (error.code === "not_found") return jsonError(404, "Preview not found.");
    if (error.code === "unconfigured") return jsonError(503, "Candidate readback is not configured.");
  }
  return jsonError(500, "Candidate readback unavailable.");
}

function jsonError(status: number, error: string): Response {
  return Response.json(
    { ok: false, error },
    {
      status,
      headers: {
        ...commonHeaders,
        "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      },
    },
  );
}
