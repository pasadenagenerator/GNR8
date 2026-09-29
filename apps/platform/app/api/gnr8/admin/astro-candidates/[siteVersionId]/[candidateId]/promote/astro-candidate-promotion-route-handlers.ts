import {
  AstroCandidatePromotionError,
  type AstroCandidatePromotionResult,
} from "@/gnr8/output-adapters/astro-candidate-promotion-service";
import {
  AstroCandidateOwnershipResolutionError,
} from "@/gnr8/output-adapters/astro-production-candidate-ownership-resolver";
import {
  AstroProductionCandidateRepositoryError,
} from "@/gnr8/output-adapters/astro-production-candidate-repository";
import {
  isAstroProductionCandidateId,
  isCanonicalUuid,
} from "@/gnr8/output-adapters/astro-production-candidate-record";
import {
  AstroProductionCandidatePreviewConfigurationError,
  isAstroProductionCandidatePreviewFeatureEnabled,
} from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";

const MAX_BODY_BYTES = 4_096;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const BODY_KEYS = new Set(["contentSha256", "storageSha256", "idempotencyKey"]);

type RouteContext = {
  params: Promise<{ siteVersionId: string; candidateId: string }>;
};

type PromotionOperation = (input: {
  actorUserId: string;
  siteVersionId: string;
  candidateId: string;
  expectedContentSha256: string;
  expectedStorageSha256: string;
  idempotencyKey: string;
}) => Promise<AstroCandidatePromotionResult>;

export type AstroCandidatePromotionRouteDependencies = {
  requireSuperadminUserId: () => Promise<string>;
  isFeatureEnabled: () => boolean;
  loadPromotionOperation: () => Promise<PromotionOperation>;
};

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

async function defaultLoadPromotionOperation(): Promise<PromotionOperation> {
  const mod = await import("@/gnr8/output-adapters/astro-candidate-promotion-composition");
  return mod.createAstroCandidatePromotionOperation();
}

export function createAstroCandidatePromotionRouteHandlers(
  dependencies: Partial<AstroCandidatePromotionRouteDependencies> = {},
) {
  const resolved: AstroCandidatePromotionRouteDependencies = {
    requireSuperadminUserId: dependencies.requireSuperadminUserId ?? defaultRequireSuperadminUserId,
    isFeatureEnabled: dependencies.isFeatureEnabled ?? isAstroProductionCandidatePreviewFeatureEnabled,
    loadPromotionOperation: dependencies.loadPromotionOperation ?? defaultLoadPromotionOperation,
  };

  return {
    async POST(request: Request, context: RouteContext): Promise<Response> {
      let actorUserId: string;
      try {
        actorUserId = await resolved.requireSuperadminUserId();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        return failure(message.startsWith("Unauthorized") ? 401 : 403, "SUPERADMIN_REQUIRED", ["superadmin_required"]);
      }
      if (!boundedText(actorUserId)) return failure(500, "PROMOTION_UNAVAILABLE", ["actor_identity_invalid"]);
      if (!hasValidOrigin(request)) return failure(403, "INVALID_REQUEST_ORIGIN", ["invalid_request_origin"]);
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return failure(415, "APPLICATION_JSON_REQUIRED", ["application_json_required"]);
      }

      let enabled: boolean;
      try {
        enabled = resolved.isFeatureEnabled();
      } catch {
        return failure(503, "PROMOTION_UNAVAILABLE", ["astro_candidate_gate_unavailable"]);
      }
      if (!enabled) return failure(503, "PROMOTION_DISABLED", ["astro_candidate_gate_disabled"]);

      const selectors = await resolveSelectors(context);
      if (!selectors) return failure(404, "PROMOTION_NOT_FOUND", ["candidate_selection_invalid"]);
      const body = await readBody(request);
      if (!body) return failure(422, "INVALID_PROMOTION_REQUEST", ["promotion_body_invalid"]);

      let operation: PromotionOperation;
      try {
        operation = await resolved.loadPromotionOperation();
      } catch (error) {
        return failure(
          error instanceof AstroProductionCandidatePreviewConfigurationError ? 503 : 500,
          "PROMOTION_UNAVAILABLE",
          ["promotion_dependencies_unavailable"],
        );
      }
      try {
        const result = await operation({
          actorUserId,
          siteVersionId: selectors.siteVersionId,
          candidateId: selectors.candidateId,
          expectedContentSha256: body.contentSha256,
          expectedStorageSha256: body.storageSha256,
          idempotencyKey: body.idempotencyKey,
        });
        return Response.json(
          {
            ok: true,
            ...result,
            label: "Astro candidate materialized; not published",
          },
          { status: 200, headers: { "cache-control": "no-store" } },
        );
      } catch (error) {
        return promotionFailure(error);
      }
    },
  };
}

async function resolveSelectors(context: RouteContext): Promise<{
  siteVersionId: string;
  candidateId: string;
} | null> {
  try {
    const params = await context.params;
    if (!isCanonicalUuid(params.siteVersionId) || !isAstroProductionCandidateId(params.candidateId)) return null;
    return params;
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<{
  contentSha256: string;
  storageSha256: string;
  idempotencyKey: string;
} | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !BODY_KEYS.has(key))) return null;
  if (!SHA256_PATTERN.test(String(record.contentSha256 ?? ""))) return null;
  if (!SHA256_PATTERN.test(String(record.storageSha256 ?? ""))) return null;
  if (!boundedText(record.idempotencyKey)) return null;
  return {
    contentSha256: String(record.contentSha256),
    storageSha256: String(record.storageSha256),
    idempotencyKey: record.idempotencyKey,
  };
}

function requestOrigin(request: Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || new URL(request.url).protocol.replace(":", "");
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === requestOrigin(request);
  } catch {
    return false;
  }
}

function promotionFailure(error: unknown): Response {
  if (error instanceof AstroCandidatePromotionError) {
    const status = ["invalid_request", "candidate_hash_mismatch"].includes(error.code)
      ? 422
      : ["ownership_mismatch", "runtime_context_missing"].includes(error.code)
        ? 404
        : error.code === "unavailable" || error.code === "persistence_ambiguous"
          ? 503
          : 409;
    return failure(status, error.code.toUpperCase(), error.blockerCodes);
  }
  if (error instanceof AstroCandidateOwnershipResolutionError) {
    const notFound = ["identity_invalid", "not_found", "ownership_incomplete", "ownership_mismatch"].includes(error.code);
    return failure(notFound ? 404 : 503, notFound ? "PROMOTION_NOT_FOUND" : "PROMOTION_UNAVAILABLE", [error.code]);
  }
  if (error instanceof AstroProductionCandidateRepositoryError) {
    const notFound = ["identity_invalid", "missing", "disabled", "ownership_mismatch"].includes(error.code);
    return failure(notFound ? 404 : 409, notFound ? "PROMOTION_NOT_FOUND" : "CANDIDATE_INVALID", [error.code]);
  }
  return failure(500, "PROMOTION_FAILED", ["promotion_failed"]);
}

function failure(status: number, error: string, blockerCodes: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      blockerCodes,
      materialized: false,
      published: false,
      activePointerChanged: false,
      previewBindingsChanged: false,
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function boundedText(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    value === value.trim() &&
    !value.includes("\0");
}
