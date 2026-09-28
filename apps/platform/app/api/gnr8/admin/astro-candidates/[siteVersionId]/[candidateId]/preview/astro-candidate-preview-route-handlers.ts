import "server-only";

import {
  AstroCandidateOwnershipResolutionError,
} from "@/gnr8/output-adapters/astro-production-candidate-ownership-resolver";
import {
  AstroProductionCandidateRepositoryError,
} from "@/gnr8/output-adapters/astro-production-candidate-repository";
import {
  isAstroProductionCandidateId,
  isCanonicalUuid,
  type AstroProductionCandidateOwnership,
} from "@/gnr8/output-adapters/astro-production-candidate-record";
import {
  AstroProductionCandidatePreviewConfigurationError,
  isAstroProductionCandidatePreviewFeatureEnabled,
} from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import type {
  AstroProductionCandidatePreviewDependencies,
  AstroProductionCandidatePreviewRenderResult,
} from "@/gnr8/output-adapters/astro-production-candidate-preview-composition";

export const ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP = [
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

export const ASTRO_PRODUCTION_CANDIDATE_PREVIEW_PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
].join(", ");

type RouteContext = {
  params: Promise<{ siteVersionId: string; candidateId: string }>;
};

export type AstroProductionCandidatePreviewRouteDependencies = {
  requireSuperadminUserId: () => Promise<string>;
  isFeatureEnabled: () => boolean;
  loadPreviewDependencies: () => Promise<AstroProductionCandidatePreviewDependencies>;
};

const COMMON_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": ASTRO_PRODUCTION_CANDIDATE_PREVIEW_PERMISSIONS_POLICY,
  "cross-origin-resource-policy": "same-origin",
} as const;

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

async function defaultLoadPreviewDependencies(): Promise<AstroProductionCandidatePreviewDependencies> {
  const mod = await import("@/gnr8/output-adapters/astro-production-candidate-preview-composition");
  return mod.createAstroProductionCandidatePreviewDependencies();
}

export function createAstroProductionCandidatePreviewRouteHandlers(
  dependencies: Partial<AstroProductionCandidatePreviewRouteDependencies> = {},
) {
  const resolved: AstroProductionCandidatePreviewRouteDependencies = {
    requireSuperadminUserId: dependencies.requireSuperadminUserId ?? defaultRequireSuperadminUserId,
    isFeatureEnabled: dependencies.isFeatureEnabled ?? isAstroProductionCandidatePreviewFeatureEnabled,
    loadPreviewDependencies: dependencies.loadPreviewDependencies ?? defaultLoadPreviewDependencies,
  };

  return {
    async GET(request: Request, context: RouteContext): Promise<Response> {
      let actorUserId: string;
      try {
        actorUserId = await resolved.requireSuperadminUserId();
      } catch (error) {
        return authErrorResponse(error);
      }
      if (!isBoundedIdentity(actorUserId)) return jsonError(500, "Candidate preview unavailable.");

      let enabled: boolean;
      try {
        enabled = resolved.isFeatureEnabled();
      } catch {
        return jsonError(503, "Candidate preview unavailable.");
      }
      if (!enabled) return jsonError(503, "Candidate preview unavailable.");

      const selectors = await resolveSelectors(request, context);
      if (!selectors) return jsonError(404, "Preview not found.");

      let previewDependencies: AstroProductionCandidatePreviewDependencies;
      try {
        previewDependencies = await resolved.loadPreviewDependencies();
      } catch (error) {
        return error instanceof AstroProductionCandidatePreviewConfigurationError
          ? jsonError(503, "Candidate preview unavailable.")
          : jsonError(500, "Candidate preview unavailable.");
      }

      let trustedScope: AstroProductionCandidateOwnership;
      try {
        trustedScope = await previewDependencies.resolveOwnership({
          siteVersionId: selectors.siteVersionId,
        });
      } catch (error) {
        return ownershipErrorResponse(error);
      }
      if (trustedScope.siteVersionId !== selectors.siteVersionId) {
        return jsonError(404, "Preview not found.");
      }

      let record;
      try {
        record = await previewDependencies.readCandidate({
          candidateId: selectors.candidateId,
          trustedScope,
        });
      } catch (error) {
        return repositoryErrorResponse(error);
      }

      let preview: AstroProductionCandidatePreviewRenderResult;
      try {
        preview = await previewDependencies.renderCandidate({ record, path: selectors.path });
      } catch {
        return jsonError(500, "Candidate preview unavailable.");
      }
      if (!matchesSelection(preview, selectors, trustedScope)) {
        return jsonError(500, "Candidate preview unavailable.");
      }

      return new Response(preview.html, {
        status: 200,
        headers: {
          ...COMMON_HEADERS,
          "content-type": "text/html; charset=utf-8",
          "content-security-policy": ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP,
        },
      });
    },
  };
}

async function resolveSelectors(request: Request, context: RouteContext): Promise<{
  siteVersionId: string;
  candidateId: string;
  path: "/";
} | null> {
  let params: { siteVersionId: string; candidateId: string };
  let url: URL;
  try {
    params = await context.params;
    url = new URL(request.url);
  } catch {
    return null;
  }
  if (!isCanonicalUuid(params.siteVersionId) || !isAstroProductionCandidateId(params.candidateId)) {
    return null;
  }
  if ([...url.searchParams.keys()].some((key) => key !== "path")) return null;
  const paths = url.searchParams.getAll("path");
  if (paths.length > 1 || (paths.length === 1 && paths[0] !== "/")) return null;
  return {
    siteVersionId: params.siteVersionId,
    candidateId: params.candidateId,
    path: "/",
  };
}

function matchesSelection(
  preview: AstroProductionCandidatePreviewRenderResult,
  selectors: { siteVersionId: string; candidateId: string; path: "/" },
  trustedScope: AstroProductionCandidateOwnership,
): boolean {
  return preview.source === "astro_internal_preview_candidate" &&
    preview.fallbackUsed === false &&
    preview.candidateId === selectors.candidateId &&
    preview.runtimeSiteId === trustedScope.runtimeSiteId &&
    preview.siteVersionId === selectors.siteVersionId &&
    preview.path === selectors.path;
}

function authErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Unauthorized")) return jsonError(401, "Authentication required.");
  if (message.startsWith("Forbidden")) return jsonError(403, "Superadmin access required.");
  return jsonError(500, "Candidate preview unavailable.");
}

function ownershipErrorResponse(error: unknown): Response {
  if (error instanceof AstroCandidateOwnershipResolutionError) {
    if (["identity_invalid", "not_found", "ownership_incomplete", "ownership_mismatch"].includes(error.code)) {
      return jsonError(404, "Preview not found.");
    }
  }
  return jsonError(500, "Candidate preview unavailable.");
}

function repositoryErrorResponse(error: unknown): Response {
  if (error instanceof AstroProductionCandidateRepositoryError) {
    if (["identity_invalid", "missing", "disabled", "ownership_mismatch"].includes(error.code)) {
      return jsonError(404, "Preview not found.");
    }
  }
  return jsonError(500, "Candidate preview unavailable.");
}

function jsonError(status: number, message: string): Response {
  return Response.json(
    { ok: false, error: message },
    {
      status,
      headers: {
        ...COMMON_HEADERS,
        "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      },
    },
  );
}

function isBoundedIdentity(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    value === value.trim() &&
    !value.includes("\0");
}
