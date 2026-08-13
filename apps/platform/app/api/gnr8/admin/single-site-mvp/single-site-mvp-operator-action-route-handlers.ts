import {
  executeSingleSiteMvpOperatorAction,
  preflightSingleSiteMvpOperatorAction,
  readSingleSiteMvpOperatorStatus,
  type SingleSiteMvpOperatorActionInput,
  type SingleSiteMvpOperatorActionOutput,
} from "@/gnr8/single-site/single-site-mvp-operator-action-facade";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type SingleSiteMvpOperatorActionRouteBody = Record<string, unknown> & {
  actionMode?: unknown;
};

type SingleSiteMvpOperatorActionRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  readSingleSiteMvpOperatorStatus: typeof readSingleSiteMvpOperatorStatus;
  preflightSingleSiteMvpOperatorAction: typeof preflightSingleSiteMvpOperatorAction;
  executeSingleSiteMvpOperatorAction: typeof executeSingleSiteMvpOperatorAction;
};

const STATUS_QUERY_KEYS = new Set([
  "tenantId",
  "clientId",
  "siteId",
  "migrationId",
  "candidateVersionRef",
  "runtimeArtifactRef",
  "publishTargetRef",
  "correlationId",
]);

const ACTION_BODY_KEYS = new Set([
  "actionMode",
  "tenantId",
  "clientId",
  "siteId",
  "migrationId",
  "candidateVersionRef",
  "runtimeArtifactRef",
  "publishTargetRef",
  "requestedOperationKey",
  "correlationId",
  "idempotencyKey",
  "explicitConfirmation",
  "publishStage",
  "publishEnvironment",
  "expectedLaunchReadinessEvidenceRef",
  "expectedPublishActivationRequestRef",
  "expectedPublishActivationDecisionRef",
  "expectedGateAttemptResultRef",
  "expectedHandoffWatermark",
  "expectedGateInputWatermark",
  "allowWarningsWithLimitations",
  "maxGateAgeMs",
  "evaluatedAt",
  "requestId",
]);

const FORBIDDEN_ACTOR_KEYS = new Set([
  "actor",
  "actorId",
  "actorRole",
  "actorType",
  "role",
  "userId",
  "principal",
  "superadminUserId",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      redactions: [
        "serverActor",
        "requestActorOverrides",
        "rawSqlErrors",
        "stackTraces",
        "providerSecrets",
        "billingData",
        "paymentData",
      ],
      mutationFlags: {
        dryRun: false,
        shadowPublish: false,
        publishes: false,
        runtimeMutation: false,
        publishMayHaveExecuted: false,
        createsAafRecords: false,
        createsGateAttempt: false,
        evaluatesGate: false,
      },
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateUnknownKeys(record: Record<string, unknown>, allowedKeys: Set<string>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_ACTOR_KEYS.has(key)) errors.push(`single_site_mvp_operator_actor_override_forbidden:${key}`);
    if (!allowedKeys.has(key)) errors.push(`single_site_mvp_operator_forbidden_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function validateRequiredIdentity(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!text(record.tenantId)) errors.push("single_site_mvp_operator_tenant_id_missing");
  if (!text(record.clientId)) errors.push("single_site_mvp_operator_client_id_missing");
  if (!text(record.siteId)) errors.push("single_site_mvp_operator_site_id_missing");
  return errors;
}

function validateActionFields(record: Record<string, unknown>): string[] {
  const errors = validateRequiredIdentity(record);
  if (!text(record.requestedOperationKey)) errors.push("single_site_mvp_operator_requested_operation_missing");
  if (record.allowWarningsWithLimitations !== undefined && typeof record.allowWarningsWithLimitations !== "boolean") {
    errors.push("single_site_mvp_operator_allowWarningsWithLimitations_invalid");
  }
  if (
    record.maxGateAgeMs !== undefined &&
    record.maxGateAgeMs !== null &&
    (typeof record.maxGateAgeMs !== "number" || !Number.isFinite(record.maxGateAgeMs))
  ) {
    errors.push("single_site_mvp_operator_maxGateAgeMs_invalid");
  }
  if (record.evaluatedAt !== undefined && record.evaluatedAt !== null && typeof record.evaluatedAt !== "string") {
    errors.push("single_site_mvp_operator_evaluatedAt_invalid");
  }
  if (record.requestId !== undefined && record.requestId !== null && typeof record.requestId !== "string") {
    errors.push("single_site_mvp_operator_requestId_invalid");
  }
  return errors;
}

function bodyRecord(body: unknown): SingleSiteMvpOperatorActionRouteBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as SingleSiteMvpOperatorActionRouteBody;
}

function inputFromRecord(record: Record<string, unknown>, actorId: string): SingleSiteMvpOperatorActionInput {
  return {
    tenantId: text(record.tenantId),
    clientId: text(record.clientId),
    siteId: text(record.siteId),
    migrationId: text(record.migrationId) || null,
    candidateVersionRef: text(record.candidateVersionRef) || null,
    runtimeArtifactRef: text(record.runtimeArtifactRef) || null,
    publishTargetRef: text(record.publishTargetRef) || null,
    requestedOperationKey: text(record.requestedOperationKey) || null,
    actor: {
      actorType: "human",
      actorId,
      actorRole: "platform_superadmin",
    },
    correlationId: text(record.correlationId) || null,
    idempotencyKey: text(record.idempotencyKey) || null,
    explicitConfirmation: record.explicitConfirmation,
    publishStage: text(record.publishStage) || null,
    publishEnvironment: text(record.publishEnvironment) || null,
    expectedLaunchReadinessEvidenceRef: text(record.expectedLaunchReadinessEvidenceRef) || null,
    expectedPublishActivationRequestRef: text(record.expectedPublishActivationRequestRef) || null,
    expectedPublishActivationDecisionRef: text(record.expectedPublishActivationDecisionRef) || null,
    expectedGateAttemptResultRef: text(record.expectedGateAttemptResultRef) || null,
    expectedHandoffWatermark: text(record.expectedHandoffWatermark) || null,
    expectedGateInputWatermark: text(record.expectedGateInputWatermark) || null,
    ...(typeof record.allowWarningsWithLimitations === "boolean"
      ? { allowWarningsWithLimitations: record.allowWarningsWithLimitations }
      : {}),
    ...(typeof record.maxGateAgeMs === "number" || record.maxGateAgeMs === null
      ? { maxGateAgeMs: record.maxGateAgeMs }
      : {}),
    ...(record.evaluatedAt === null || typeof record.evaluatedAt === "string"
      ? { evaluatedAt: record.evaluatedAt }
      : {}),
    ...(record.requestId === null || typeof record.requestId === "string" ? { requestId: record.requestId } : {}),
  };
}

function responseForFacadeResult(result: SingleSiteMvpOperatorActionOutput): Response {
  const status = result.allowed ? 200 : result.reasonCode === "invalid_identity" || result.reasonCode === "invalid_requested_operation" || result.reasonCode === "invalid_operation_request" || result.reasonCode === "confirmation_required" ? 400 : result.reasonCode === "shadow_publish_feature_flag_disabled" ? 403 : 409;
  return Response.json(result, { status, headers: { "cache-control": "no-store" } });
}

export function createSingleSiteMvpOperatorActionRouteHandlers(
  deps: Partial<SingleSiteMvpOperatorActionRouteDeps> = {},
) {
  const resolvedDeps: SingleSiteMvpOperatorActionRouteDeps = {
    requireSuperadminUserId,
    readSingleSiteMvpOperatorStatus,
    preflightSingleSiteMvpOperatorAction,
    executeSingleSiteMvpOperatorAction,
    ...deps,
  };

  return {
    async GET(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", [
          "single_site_mvp_operator_superadmin_required",
        ]);
      }

      const url = new URL(request.url);
      const queryRecord = Object.fromEntries(url.searchParams.entries());
      const queryErrors = validateUnknownKeys(queryRecord, STATUS_QUERY_KEYS);
      if (queryErrors.length > 0) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_OPERATOR_STATUS_QUERY", queryErrors);
      }
      const identityErrors = validateRequiredIdentity(queryRecord);
      if (identityErrors.length > 0) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_OPERATOR_STATUS_QUERY", identityErrors);
      }

      try {
        const result = await resolvedDeps.readSingleSiteMvpOperatorStatus(inputFromRecord(queryRecord, actorId));
        return responseForFacadeResult(result);
      } catch {
        return failure(500, "SINGLE_SITE_MVP_OPERATOR_STATUS_FAILED", [
          "single_site_mvp_operator_status_failed",
        ]);
      }
    },

    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", [
          "single_site_mvp_operator_superadmin_required",
        ]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_OPERATOR_ACTION_BODY", [
          "single_site_mvp_operator_request_body_must_be_object",
        ]);
      }
      const bodyErrors = validateUnknownKeys(body, ACTION_BODY_KEYS);
      if (bodyErrors.length > 0) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_OPERATOR_ACTION_BODY", bodyErrors);
      }
      const fieldErrors = validateActionFields(body);
      if (fieldErrors.length > 0) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_OPERATOR_ACTION_BODY", fieldErrors);
      }

      const actionMode = text(body.actionMode);
      if (actionMode !== "preflight" && actionMode !== "execute") {
        return failure(400, "INVALID_SINGLE_SITE_MVP_OPERATOR_ACTION_BODY", [
          "single_site_mvp_operator_action_mode_invalid",
        ]);
      }

      try {
        const input = inputFromRecord(body, actorId);
        const result =
          actionMode === "preflight"
            ? await resolvedDeps.preflightSingleSiteMvpOperatorAction(input)
            : await resolvedDeps.executeSingleSiteMvpOperatorAction(input);
        return responseForFacadeResult(result);
      } catch {
        return failure(500, "SINGLE_SITE_MVP_OPERATOR_ACTION_FAILED", [
          "single_site_mvp_operator_action_failed",
        ]);
      }
    },
  };
}
