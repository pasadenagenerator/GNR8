import {
  AstroSuccessorPublicationError,
  type AstroSuccessorPublicationResult,
} from "@/gnr8/output-adapters/astro-successor-publication-service";
import {
  isAstroProductionCandidateId,
  isCanonicalUuid,
} from "@/gnr8/output-adapters/astro-production-candidate-record";
import {
  AstroProductionCandidatePreviewConfigurationError,
  isAstroProductionCandidatePreviewFeatureEnabled,
} from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";

const MAX_BODY_BYTES = 8_192;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CONFIRMATION = "publish-generated-astro-successor-to-shadow";
const BODY_KEYS = new Set([
  "mode",
  "confirmation",
  "runtimeSiteId",
  "sourceArtifactId",
  "sourceContentSha256",
  "sourceStorageSha256",
  "expectedActiveSiteVersionId",
  "expectedActiveArtifactId",
  "expectedInternalHost",
]);

type RouteContext = {
  params: Promise<{ siteVersionId: string; candidateId: string }>;
};

type PublicationOperation = (input: {
  actorUserId: string;
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceCandidateId: string;
  sourceArtifactId: string;
  expectedSourceContentSha256: string;
  expectedSourceStorageSha256: string;
  expectedActivePointer: { siteVersionId: string; artifactId: string };
  expectedInternalHost: string;
  stage: "shadow";
}) => Promise<AstroSuccessorPublicationResult>;

export type AstroSuccessorPublicationRouteDependencies = {
  requireSuperadminUserId(): Promise<string>;
  isFeatureEnabled(): boolean;
  loadPublicationOperation(): Promise<PublicationOperation>;
};

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

async function defaultLoadPublicationOperation(): Promise<PublicationOperation> {
  const mod = await import("@/gnr8/output-adapters/astro-successor-publication-composition");
  return mod.createAstroSuccessorPublicationOperation();
}

export function createAstroSuccessorPublicationRouteHandlers(
  dependencies: Partial<AstroSuccessorPublicationRouteDependencies> = {},
) {
  const resolved: AstroSuccessorPublicationRouteDependencies = {
    requireSuperadminUserId: dependencies.requireSuperadminUserId ?? defaultRequireSuperadminUserId,
    isFeatureEnabled: dependencies.isFeatureEnabled ?? isAstroProductionCandidatePreviewFeatureEnabled,
    loadPublicationOperation: dependencies.loadPublicationOperation ?? defaultLoadPublicationOperation,
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
      if (!boundedText(actorUserId)) return failure(500, "PUBLICATION_UNAVAILABLE", ["actor_identity_invalid"]);
      if (!hasValidOrigin(request)) return failure(403, "INVALID_REQUEST_ORIGIN", ["invalid_request_origin"]);
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return failure(415, "APPLICATION_JSON_REQUIRED", ["application_json_required"]);
      }
      if (!resolved.isFeatureEnabled()) {
        return failure(503, "PUBLICATION_DISABLED", ["astro_candidate_gate_disabled"]);
      }

      const selectors = await resolveSelectors(context);
      if (!selectors) return failure(404, "PUBLICATION_NOT_FOUND", ["candidate_selection_invalid"]);
      const body = await readBody(request);
      if (!body) return failure(422, "INVALID_PUBLICATION_REQUEST", ["publication_body_invalid"]);

      let operation: PublicationOperation;
      try {
        operation = await resolved.loadPublicationOperation();
      } catch (error) {
        return failure(
          error instanceof AstroProductionCandidatePreviewConfigurationError ? 503 : 500,
          "PUBLICATION_UNAVAILABLE",
          ["publication_dependencies_unavailable"],
        );
      }

      try {
        const result = await operation({
          actorUserId,
          runtimeSiteId: body.runtimeSiteId,
          sourceSiteVersionId: selectors.siteVersionId,
          sourceCandidateId: selectors.candidateId,
          sourceArtifactId: body.sourceArtifactId,
          expectedSourceContentSha256: body.sourceContentSha256,
          expectedSourceStorageSha256: body.sourceStorageSha256,
          expectedActivePointer: {
            siteVersionId: body.expectedActiveSiteVersionId,
            artifactId: body.expectedActiveArtifactId,
          },
          expectedInternalHost: body.expectedInternalHost,
          stage: "shadow",
        });
        return Response.json(
          {
            ok: true,
            ...result,
            internalPublicationOnly: true,
            externalDomainPublished: false,
            providerExecutionPerformed: false,
          },
          { status: 200, headers: { "cache-control": "no-store" } },
        );
      } catch (error) {
        if (error instanceof AstroSuccessorPublicationError) {
          const conflict = [
            "active_pointer_conflict",
            "successor_lineage_conflict",
            "successor_candidate_conflict",
          ].includes(error.code);
          const invalid = ["invalid_request", "source_candidate_hash_mismatch"].includes(error.code);
          return failure(invalid ? 422 : conflict ? 409 : 500, error.code.toUpperCase(), error.blockerCodes);
        }
        return failure(500, "PUBLICATION_FAILED", ["publication_failed"]);
      }
    },
  };
}

async function resolveSelectors(context: RouteContext): Promise<{ siteVersionId: string; candidateId: string } | null> {
  try {
    const params = await context.params;
    if (!isCanonicalUuid(params.siteVersionId) || !isAstroProductionCandidateId(params.candidateId)) return null;
    return params;
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<{
  runtimeSiteId: string;
  sourceArtifactId: string;
  sourceContentSha256: string;
  sourceStorageSha256: string;
  expectedActiveSiteVersionId: string;
  expectedActiveArtifactId: string;
  expectedInternalHost: string;
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
  if (record.mode !== "shadow_publish" || record.confirmation !== CONFIRMATION) return null;
  if (!boundedText(record.runtimeSiteId)) return null;
  if (!isCanonicalUuid(record.sourceArtifactId)) return null;
  if (!SHA256_PATTERN.test(String(record.sourceContentSha256 ?? ""))) return null;
  if (!SHA256_PATTERN.test(String(record.sourceStorageSha256 ?? ""))) return null;
  if (!isCanonicalUuid(record.expectedActiveSiteVersionId)) return null;
  if (!isCanonicalUuid(record.expectedActiveArtifactId)) return null;
  if (!normalizedHost(record.expectedInternalHost)) return null;
  return {
    runtimeSiteId: record.runtimeSiteId,
    sourceArtifactId: record.sourceArtifactId,
    sourceContentSha256: String(record.sourceContentSha256),
    sourceStorageSha256: String(record.sourceStorageSha256),
    expectedActiveSiteVersionId: record.expectedActiveSiteVersionId,
    expectedActiveArtifactId: record.expectedActiveArtifactId,
    expectedInternalHost: record.expectedInternalHost,
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

function failure(status: number, error: string, blockerCodes: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      blockerCodes,
      published: false,
      activePointerChanged: false,
      providerExecutionPerformed: false,
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function boundedText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 512 && value === value.trim() && !value.includes("\0");
}

function normalizedHost(value: unknown): value is string {
  return boundedText(value) && value === value.toLowerCase() && !value.includes(":") && !value.includes("/");
}
