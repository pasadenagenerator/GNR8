import {
  approveAirshipCandidateLifecycle,
  type AirshipCandidateLifecycleApprovalOutput,
} from "@/gnr8/single-site/airship-candidate-lifecycle-approval-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  approveAirshipCandidateLifecycle: typeof approveAirshipCandidateLifecycle;
};

type ActionBody = Record<string, unknown> & {
  migrationId?: unknown;
  readinessPackageId?: unknown;
  candidateSiteVersionId?: unknown;
  artifactId?: unknown;
  idempotencyKey?: unknown;
  reason?: unknown;
};

const POST_BODY_KEYS = new Set([
  "migrationId",
  "readinessPackageId",
  "candidateSiteVersionId",
  "artifactId",
  "idempotencyKey",
  "reason",
]);
const FORBIDDEN_KEYS = new Set([
  "actor",
  "actorId",
  "actorRole",
  "actorType",
  "role",
  "userId",
  "principal",
  "superadminUserId",
  "apiKey",
  "secret",
  "token",
  "authorization",
  "credential",
  "provider",
  "providerPayload",
  "providerConfig",
  "publish",
  "publishMode",
  "publishChain",
  "activationChain",
  "dryRun",
  "shadowPublish",
  "rollback",
  "sourceCapture",
  "activePointer",
]);
const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bodyRecord(body: unknown): ActionBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as ActionBody;
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function validateBody(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_candidate_lifecycle_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_candidate_lifecycle_unknown_field:${key}`);
  }
  for (const field of ["migrationId", "readinessPackageId", "candidateSiteVersionId", "artifactId"] as const) {
    const value = text(record[field]);
    if (!value) errors.push(`airship_candidate_lifecycle_${field}_required`);
    else if (!UUIDISH.test(value)) errors.push(`airship_candidate_lifecycle_${field}_invalid`);
  }
  if (!text(record.idempotencyKey)) errors.push("airship_candidate_lifecycle_idempotencyKey_required");
  if (record.reason !== undefined && typeof record.reason !== "string" && record.reason !== null) {
    errors.push("airship_candidate_lifecycle_reason_invalid");
  }
  return Array.from(new Set(errors)).sort();
}

function baseMutationFlags() {
  return {
    lifecycleStateMayChange: true,
    activePointerMayChange: false,
    activePointerChanged: false,
    artifactStageChanged: false,
    promotesLivePointer: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    sourceCapture: false,
    providerCall: false,
    dnsMutation: false,
    domainMutation: false,
    billingMutation: false,
  };
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: ["Airship candidate lifecycle approval", "Superadmin only", "No active pointer mutation", "No provider side paths"],
      mutationFlags: {
        ...baseMutationFlags(),
        lifecycleStateMayChange: false,
      },
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: AirshipCandidateLifecycleApprovalOutput): Response {
  return Response.json(
    {
      ok: output.ok,
      outcome: output.outcome,
      changed: output.changed,
      serviceVersion: output.serviceVersion,
      previousState: output.previousState,
      newState: output.newState,
      activePointer: output.activePointer,
      auditRefs: output.auditRefs,
      refs: output.refs,
      labels: ["Airship candidate lifecycle approved", "Superadmin only", "No active pointer mutation", "No provider side paths"],
      idempotency: {
        scope: "airship_candidate_lifecycle_approval",
        idempotencyKey: output.refs.idempotencyKey,
        noOp: !output.changed,
      },
      mutationFlags: {
        ...baseMutationFlags(),
        lifecycleStateChanged: output.changed,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

export function createAirshipCandidateLifecycleApprovalRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    approveAirshipCandidateLifecycle,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_candidate_lifecycle_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_CANDIDATE_LIFECYCLE_BODY", ["airship_candidate_lifecycle_body_must_be_object"]);

      const bodyErrors = validateBody(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_CANDIDATE_LIFECYCLE_BODY", bodyErrors);

      try {
        const output = await resolvedDeps.approveAirshipCandidateLifecycle({
          migrationId: text(body.migrationId),
          readinessPackageId: text(body.readinessPackageId),
          candidateSiteVersionId: text(body.candidateSiteVersionId),
          artifactId: text(body.artifactId),
          idempotencyKey: text(body.idempotencyKey),
          reason: text(body.reason) || null,
          actorId,
        });
        return success(output);
      } catch (error) {
        const diagnostic = error instanceof Error ? error.message : "airship_candidate_lifecycle_failed";
        return failure(409, "AIRSHIP_CANDIDATE_LIFECYCLE_REFUSED", [diagnostic]);
      }
    },
  };
}
