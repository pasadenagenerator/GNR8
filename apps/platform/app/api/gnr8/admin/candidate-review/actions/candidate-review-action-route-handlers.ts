import { createHash } from "node:crypto";

import {
  applyCandidateReviewAction,
  type CandidateReviewActionApplicationInput,
  type CandidateReviewActionApplicationResult,
} from "@/gnr8/architecture/candidate-review-action-application";
import {
  CANDIDATE_REVIEW_ACTION_TYPES,
  type CandidateReviewActionRequest,
  type CandidateReviewActionType,
} from "@/gnr8/architecture/candidate-review-action-contract";
import {
  loadCandidateDiscoveryResultById,
  type CandidateDiscoveryResultArtifactRecord,
} from "@/gnr8/architecture/candidate-discovery-persistence";
import {
  CandidateReviewPersistenceConflictError,
  CandidateReviewPersistenceValidationError,
  loadLatestCandidateReviewPackage,
  type CandidateReviewPackageArtifactRecord,
} from "@/gnr8/architecture/candidate-review-persistence";

const MAX_REQUEST_BYTES = 16_384;
const MAX_ID_LENGTH = 512;
const MAX_RATIONALE_LENGTH = 2_000;
const DEFAULT_RATIONALE = "No rationale provided by reviewer.";
const ACTION_ID_VERSION = "candidate-review-action:v1";

export type CandidateReviewActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_ACTION_TYPE"
  | "MISSING_CANDIDATE"
  | "STALE_REVIEW_PACKAGE"
  | "INVALID_LINEAGE"
  | "VALIDATION_FAILED"
  | "IDEMPOTENCY_CONFLICT"
  | "PERSISTENCE_FAILED"
  | "UNKNOWN_ERROR";

type ClientPayload = {
  siteVersionId: string;
  candidateId: string;
  actionType: CandidateReviewActionType;
  rationale: string;
  candidateDiscoveryArtifactId: string;
  candidateReviewPackageArtifactId: string;
};

type RouteDependencies = {
  requireSuperadminUserId: () => Promise<string>;
  now: () => string;
  loadCandidateDiscoveryResultById: (input: {
    siteVersionId: string;
    artifactId: string;
  }) => Promise<CandidateDiscoveryResultArtifactRecord | null>;
  loadLatestCandidateReviewPackage: (input: {
    siteVersionId: string;
    candidateDiscoveryArtifactId?: string;
  }) => Promise<CandidateReviewPackageArtifactRecord | null>;
  applyCandidateReviewAction: (
    input: CandidateReviewActionApplicationInput,
  ) => Promise<CandidateReviewActionApplicationResult>;
};

type PayloadResult =
  | { valid: true; payload: ClientPayload }
  | { valid: false; code: CandidateReviewActionErrorCode; diagnostics: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(
  status: number,
  errorCode: CandidateReviewActionErrorCode,
  message: string,
  diagnostics: string[] = [errorCode],
): Response {
  return Response.json(
    { ok: false, errorCode, message, diagnostics },
    { status, headers: { "cache-control": "no-store" } },
  );
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

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }
  return JSON.parse(text) as unknown;
}

function normalizedId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(body: unknown): PayloadResult {
  if (!isRecord(body)) {
    return { valid: false, code: "VALIDATION_FAILED", diagnostics: ["REQUEST_BODY_MUST_BE_OBJECT"] };
  }

  const allowed = new Set([
    "siteVersionId",
    "candidateId",
    "actionType",
    "rationale",
    "candidateDiscoveryArtifactId",
    "candidateReviewPackageArtifactId",
  ]);
  const unknownFields = Object.keys(body).filter((key) => !allowed.has(key)).sort();
  if (unknownFields.length > 0) {
    return {
      valid: false,
      code: "VALIDATION_FAILED",
      diagnostics: unknownFields.map((key) => `FORBIDDEN_REQUEST_FIELD:${key}`),
    };
  }

  if (!CANDIDATE_REVIEW_ACTION_TYPES.includes(body.actionType as CandidateReviewActionType)) {
    return { valid: false, code: "INVALID_ACTION_TYPE", diagnostics: ["INVALID_ACTION_TYPE"] };
  }

  const fields = {
    siteVersionId: normalizedId(body.siteVersionId),
    candidateId: normalizedId(body.candidateId),
    candidateDiscoveryArtifactId: normalizedId(body.candidateDiscoveryArtifactId),
    candidateReviewPackageArtifactId: normalizedId(body.candidateReviewPackageArtifactId),
  };
  const diagnostics: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!value) diagnostics.push(`${key.toUpperCase()}_REQUIRED`);
    if (value.length > MAX_ID_LENGTH) diagnostics.push(`${key.toUpperCase()}_TOO_LONG`);
  }
  if (body.rationale !== undefined && typeof body.rationale !== "string") {
    diagnostics.push("RATIONALE_MUST_BE_STRING");
  }
  const rationale = typeof body.rationale === "string" && body.rationale.trim()
    ? body.rationale.trim()
    : DEFAULT_RATIONALE;
  if (rationale.length > MAX_RATIONALE_LENGTH) diagnostics.push("RATIONALE_TOO_LONG");
  if (diagnostics.length > 0) return { valid: false, code: "VALIDATION_FAILED", diagnostics };

  return {
    valid: true,
    payload: {
      ...fields,
      actionType: body.actionType as CandidateReviewActionType,
      rationale,
    },
  };
}

function encodeFingerprint(parts: readonly string[]): string {
  return parts.map((part) => `${Buffer.byteLength(part, "utf8")}:${part}`).join("");
}

function createActionId(input: {
  contractVersion: string;
  actorRef: string;
  payload: ClientPayload;
}): string {
  const digest = createHash("sha256").update(encodeFingerprint([
    input.contractVersion,
    input.actorRef,
    input.payload.siteVersionId,
    input.payload.candidateDiscoveryArtifactId,
    input.payload.candidateReviewPackageArtifactId,
    input.payload.candidateId,
    input.payload.actionType,
    input.payload.rationale,
  ])).digest("hex");
  return `${ACTION_ID_VERSION}:${digest}`;
}

function classifyDiagnostics(diagnostics: readonly string[]): CandidateReviewActionErrorCode {
  const joined = diagnostics.join("\n").toLowerCase();
  if (joined.includes("idempotency") && joined.includes("conflict")) return "IDEMPOTENCY_CONFLICT";
  if (joined.includes("stale")) return "STALE_REVIEW_PACKAGE";
  if (joined.includes("candidateid") && joined.includes("exist")) return "MISSING_CANDIDATE";
  if (joined.includes("lineage") || joined.includes("must match")) return "INVALID_LINEAGE";
  return "VALIDATION_FAILED";
}

function statusFor(code: CandidateReviewActionErrorCode): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "MISSING_CANDIDATE") return 404;
  if (code === "INVALID_ACTION_TYPE") return 400;
  if (code === "VALIDATION_FAILED") return 422;
  if (code === "STALE_REVIEW_PACKAGE" || code === "INVALID_LINEAGE" || code === "IDEMPOTENCY_CONFLICT") return 409;
  return 500;
}

function safeMessage(code: CandidateReviewActionErrorCode): string {
  const messages: Record<CandidateReviewActionErrorCode, string> = {
    UNAUTHORIZED: "Authentication is required.",
    FORBIDDEN: "Superadmin access is required.",
    INVALID_ACTION_TYPE: "The review action type is invalid.",
    MISSING_CANDIDATE: "The candidate does not exist in the linked discovery result.",
    STALE_REVIEW_PACKAGE: "The Candidate Review package is stale.",
    INVALID_LINEAGE: "Candidate Review artifact lineage is invalid.",
    VALIDATION_FAILED: "The Candidate Review action request failed validation.",
    IDEMPOTENCY_CONFLICT: "The Candidate Review action conflicts with an existing action.",
    PERSISTENCE_FAILED: "The Candidate Review action could not be persisted.",
    UNKNOWN_ERROR: "The Candidate Review action failed.",
  };
  return messages[code];
}

async function defaultRequireSuperadminUserId(): Promise<string> {
  const { requireSuperadminUserId } = await import("@/src/superadmin/require-superadmin-user-id");
  return requireSuperadminUserId();
}

export function createCandidateReviewActionRouteHandlers(
  deps: Partial<RouteDependencies> = {},
) {
  const resolved: RouteDependencies = {
    requireSuperadminUserId: defaultRequireSuperadminUserId,
    now: () => new Date().toISOString(),
    loadCandidateDiscoveryResultById,
    loadLatestCandidateReviewPackage,
    applyCandidateReviewAction,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorRef: string;
      try {
        actorRef = await resolved.requireSuperadminUserId();
      } catch (error) {
        const unauthorized = error instanceof Error && error.message.startsWith("Unauthorized");
        const code = unauthorized ? "UNAUTHORIZED" : "FORBIDDEN";
        return errorResponse(statusFor(code), code, safeMessage(code));
      }

      if (!hasValidOrigin(request)) {
        return errorResponse(403, "FORBIDDEN", safeMessage("FORBIDDEN"), ["INVALID_REQUEST_ORIGIN"]);
      }
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return errorResponse(422, "VALIDATION_FAILED", safeMessage("VALIDATION_FAILED"), ["APPLICATION_JSON_REQUIRED"]);
      }

      let body: unknown;
      try {
        body = await readJsonBody(request);
      } catch (error) {
        const diagnostic = error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE"
          ? error.message
          : "INVALID_JSON";
        return errorResponse(422, "VALIDATION_FAILED", safeMessage("VALIDATION_FAILED"), [diagnostic]);
      }
      const validation = validatePayload(body);
      if (!validation.valid) {
        return errorResponse(statusFor(validation.code), validation.code, safeMessage(validation.code), validation.diagnostics);
      }
      const payload = validation.payload;

      try {
        const discoveryArtifact = await resolved.loadCandidateDiscoveryResultById({
          siteVersionId: payload.siteVersionId,
          artifactId: payload.candidateDiscoveryArtifactId,
        });
        if (!discoveryArtifact) {
          return errorResponse(409, "INVALID_LINEAGE", safeMessage("INVALID_LINEAGE"), ["CANDIDATE_DISCOVERY_ARTIFACT_NOT_FOUND"]);
        }
        if (!discoveryArtifact.result.candidates.some(({ candidateId }) => candidateId === payload.candidateId)) {
          return errorResponse(404, "MISSING_CANDIDATE", safeMessage("MISSING_CANDIDATE"), ["CANDIDATE_NOT_FOUND"]);
        }

        const latest = await resolved.loadLatestCandidateReviewPackage({
          siteVersionId: payload.siteVersionId,
          candidateDiscoveryArtifactId: payload.candidateDiscoveryArtifactId,
        });
        if (!latest) {
          return errorResponse(409, "INVALID_LINEAGE", safeMessage("INVALID_LINEAGE"), ["CANDIDATE_REVIEW_PACKAGE_NOT_FOUND"]);
        }
        if (
          latest.package.siteVersionId !== discoveryArtifact.result.siteVersionId ||
          latest.package.dryRunId !== discoveryArtifact.result.dryRunId ||
          latest.package.candidateDiscoveryArtifactId !== discoveryArtifact.artifactId
        ) {
          return errorResponse(409, "INVALID_LINEAGE", safeMessage("INVALID_LINEAGE"), ["CANDIDATE_REVIEW_DISCOVERY_LINEAGE_MISMATCH"]);
        }

        const actionId = createActionId({ contractVersion: latest.contractVersion, actorRef, payload });
        const reviewEventId = `candidate-review-event:${actionId}`;
        const existingEvent = latest.package.reviewEvents.find((event) => event.reviewEventId === reviewEventId);
        if (!existingEvent && payload.candidateReviewPackageArtifactId !== latest.artifactId) {
          return errorResponse(409, "STALE_REVIEW_PACKAGE", safeMessage("STALE_REVIEW_PACKAGE"), ["CANDIDATE_REVIEW_PACKAGE_STALE"]);
        }

        const request: CandidateReviewActionRequest = {
          actionId,
          actionType: payload.actionType,
          actor: { actorRef, actorRole: "superadmin" },
          target: {
            siteVersionId: payload.siteVersionId,
            dryRunId: latest.package.dryRunId,
            candidateDiscoveryArtifactId: payload.candidateDiscoveryArtifactId,
            candidateId: payload.candidateId,
            candidateReviewPackageArtifactId: payload.candidateReviewPackageArtifactId,
          },
          rationale: payload.rationale,
          requestedAt: existingEvent?.decidedAt ?? resolved.now(),
        };
        let application: CandidateReviewActionApplicationResult;
        try {
          application = await resolved.applyCandidateReviewAction({
            request,
            latestCandidateReviewPackage: latest,
            candidateDiscoveryResult: discoveryArtifact.result,
            contractVersion: latest.contractVersion,
          });
        } catch (error) {
          if (error instanceof CandidateReviewPersistenceConflictError) {
            return errorResponse(409, "STALE_REVIEW_PACKAGE", safeMessage("STALE_REVIEW_PACKAGE"), error.diagnostics);
          }
          if (error instanceof CandidateReviewPersistenceValidationError) {
            return errorResponse(422, "VALIDATION_FAILED", safeMessage("VALIDATION_FAILED"), ["CANDIDATE_REVIEW_PACKAGE_VALIDATION_FAILED"]);
          }
          return errorResponse(500, "PERSISTENCE_FAILED", safeMessage("PERSISTENCE_FAILED"), ["CANDIDATE_REVIEW_PERSISTENCE_FAILED"]);
        }
        if (!application.actionResult.accepted || !application.actionResult.candidateReviewEvent || !application.resultingCandidateReviewPackageArtifact) {
          const code = classifyDiagnostics(application.actionResult.diagnostics);
          return errorResponse(statusFor(code), code, safeMessage(code), [...application.actionResult.diagnostics]);
        }

        const canonical = await resolved.loadLatestCandidateReviewPackage({
          siteVersionId: payload.siteVersionId,
          candidateDiscoveryArtifactId: payload.candidateDiscoveryArtifactId,
        });
        const event = application.actionResult.candidateReviewEvent;
        const replayPackage = application.replayed ? application.candidateReviewPackage : null;
        const canonicalContainsEvent = canonical?.package.reviewEvents.some(
          (candidateEvent) => candidateEvent.reviewEventId === event.reviewEventId,
        ) ?? false;
        if (
          !canonical ||
          (application.replayed
            ? !replayPackage || !canonicalContainsEvent
            : canonical.artifactId !== application.resultingCandidateReviewPackageArtifact.artifactId)
        ) {
          return errorResponse(500, "PERSISTENCE_FAILED", safeMessage("PERSISTENCE_FAILED"), ["CANONICAL_LATEST_PACKAGE_RELOAD_FAILED"]);
        }

        const resultPackage = replayPackage ?? canonical.package;
        return Response.json({
          ok: true,
          actionId,
          reviewEventId: event.reviewEventId,
          decision: event.decision,
          candidateId: payload.candidateId,
          candidateReviewPackageArtifactId: application.resultingCandidateReviewPackageArtifact.artifactId,
          counts: {
            reviewedCandidateCount: resultPackage.reviewedCandidateCount,
            approvedCount: resultPackage.approvedCount,
            rejectedCount: resultPackage.rejectedCount,
            deferredCount: resultPackage.deferredCount,
          },
          diagnostics: application.replayed
            ? ["CANDIDATE_REVIEW_ACTION_REPLAYED"]
            : ["CANDIDATE_REVIEW_ACTION_APPLIED"],
        }, { headers: { "cache-control": "no-store" } });
      } catch {
        return errorResponse(500, "UNKNOWN_ERROR", safeMessage("UNKNOWN_ERROR"), ["CANDIDATE_REVIEW_ACTION_UNKNOWN_ERROR"]);
      }
    },
  };
}
