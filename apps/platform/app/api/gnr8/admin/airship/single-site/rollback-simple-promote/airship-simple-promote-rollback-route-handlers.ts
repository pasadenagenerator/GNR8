import {
  rollbackAirshipSimplePromoteToPreviousPointer,
  type AirshipSimplePromoteRollbackOutput,
} from "@/gnr8/single-site/airship-simple-promote-rollback-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  rollbackAirshipSimplePromoteToPreviousPointer: typeof rollbackAirshipSimplePromoteToPreviousPointer;
};

type ActionBody = Record<string, unknown> & {
  migrationId?: unknown;
  currentSiteVersionId?: unknown;
  currentArtifactId?: unknown;
  rollbackSiteVersionId?: unknown;
  rollbackArtifactId?: unknown;
  promoteAuditRef?: unknown;
  promoteAuditRowId?: unknown;
  idempotencyKey?: unknown;
  reason?: unknown;
};

const POST_BODY_KEYS = new Set([
  "migrationId",
  "currentSiteVersionId",
  "currentArtifactId",
  "rollbackSiteVersionId",
  "rollbackArtifactId",
  "promoteAuditRef",
  "promoteAuditRowId",
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
  "runtimeSiteId",
  "siteId",
  "dns",
  "domain",
  "billing",
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
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_simple_promote_rollback_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_simple_promote_rollback_unknown_field:${key}`);
  }
  for (const field of ["migrationId", "currentSiteVersionId", "currentArtifactId", "rollbackSiteVersionId", "rollbackArtifactId"] as const) {
    const value = text(record[field]);
    if (!value) errors.push(`airship_simple_promote_rollback_${field}_required`);
    else if (!UUIDISH.test(value)) errors.push(`airship_simple_promote_rollback_${field}_invalid`);
  }
  const promoteAuditRowId = text(record.promoteAuditRowId);
  const promoteAuditRef = text(record.promoteAuditRef);
  if (!promoteAuditRowId && !promoteAuditRef) errors.push("airship_simple_promote_rollback_promoteAuditRef_required");
  if (promoteAuditRowId && !UUIDISH.test(promoteAuditRowId)) errors.push("airship_simple_promote_rollback_promoteAuditRowId_invalid");
  if (!text(record.idempotencyKey)) errors.push("airship_simple_promote_rollback_idempotencyKey_required");
  if (record.reason !== undefined && typeof record.reason !== "string" && record.reason !== null) {
    errors.push("airship_simple_promote_rollback_reason_invalid");
  }
  return Array.from(new Set(errors)).sort();
}

function baseMutationFlags() {
  return {
    rollback: true,
    activePointerMayChange: true,
    publishes: false,
    promotesLivePointer: false,
    dryRun: false,
    shadowPublish: false,
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
      labels: ["Airship simple promote rollback", "Superadmin only", "Destructive active-pointer restore", "No provider side paths"],
      mutationFlags: {
        ...baseMutationFlags(),
        activePointerMayChange: false,
      },
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: AirshipSimplePromoteRollbackOutput): Response {
  return Response.json(
    {
      ok: output.ok,
      outcome: output.outcome,
      rolledBack: output.rolledBack,
      noOp: output.noOp,
      serviceVersion: output.serviceVersion,
      previousPointer: output.previousPointer,
      currentPointer: output.currentPointer,
      restoredPointer: output.restoredPointer,
      rollbackTarget: output.rollbackTarget,
      auditRefs: output.auditRefs,
      refs: output.refs,
      labels: ["Airship simple promote rollback ready", "Superadmin only", "Destructive active-pointer restore", "No provider side paths"],
      idempotency: {
        scope: "airship_simple_promote_rollback",
        idempotencyKey: output.refs.idempotencyKey,
        noOp: output.noOp,
      },
      mutationFlags: {
        ...baseMutationFlags(),
        activePointerChanged: output.rolledBack,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

export function createAirshipSimplePromoteRollbackRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    rollbackAirshipSimplePromoteToPreviousPointer,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_simple_promote_rollback_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_BODY", ["airship_simple_promote_rollback_body_must_be_object"]);

      const bodyErrors = validateBody(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_BODY", bodyErrors);

      try {
        const output = await resolvedDeps.rollbackAirshipSimplePromoteToPreviousPointer({
          migrationId: text(body.migrationId),
          currentSiteVersionId: text(body.currentSiteVersionId),
          currentArtifactId: text(body.currentArtifactId),
          rollbackSiteVersionId: text(body.rollbackSiteVersionId),
          rollbackArtifactId: text(body.rollbackArtifactId),
          promoteAuditRef: text(body.promoteAuditRef) || null,
          promoteAuditRowId: text(body.promoteAuditRowId) || null,
          idempotencyKey: text(body.idempotencyKey),
          reason: text(body.reason) || null,
          actorId,
        });
        return success(output);
      } catch (error) {
        const diagnostic = error instanceof Error ? error.message : "airship_simple_promote_rollback_failed";
        return failure(409, "AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_REFUSED", [diagnostic]);
      }
    },
  };
}
