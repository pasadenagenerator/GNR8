import "server-only";

import {
  runSingleSiteShadowPublishOperatorAction,
  validateSingleSiteShadowPublishOperatorRequest,
  type SingleSiteShadowPublishOperatorCallerDependencies,
  type SingleSiteShadowPublishOperatorSafeResult,
} from "@/gnr8/single-site/single-site-shadow-publish-operator-caller";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type SingleSiteShadowPublishRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  runSingleSiteShadowPublishOperatorAction: typeof runSingleSiteShadowPublishOperatorAction;
  isFeatureEnabled: () => boolean;
  log: (event: string, details: Record<string, unknown>) => void;
  wrapperDependencies?: SingleSiteShadowPublishOperatorCallerDependencies;
};

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function textFromBody(body: unknown, key: string): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function isShadowPublishFeatureEnabled(): boolean {
  return ["1", "true", "enabled", "on", "shadow_publish"].includes(
    String(process.env.GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION ?? "").trim().toLowerCase(),
  );
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function responseStatusForResult(result: SingleSiteShadowPublishOperatorSafeResult): number {
  if (result.ok) return 200;
  if (result.routeStatus === "publish_orchestrator_failed") return 502;
  return 409;
}

function logSafeResult(
  log: SingleSiteShadowPublishRouteDeps["log"],
  event: string,
  result: SingleSiteShadowPublishOperatorSafeResult,
  actorId: string,
): void {
  log(event, {
    actor: {
      actorType: "human",
      actorId,
      actorRole: "platform_superadmin",
    },
    correlationId: result.correlationId,
    idempotencyKey: result.idempotencyKey,
    routeStatus: result.routeStatus,
    wrapperStatus: result.wrapperStatus,
    resolverStatus: result.resolverStatus,
    publishOrchestratorStatus: result.publishOrchestratorStatus,
    shadowGuardMode: result.shadowGuardDiagnostics?.guardMode ?? null,
    shadowGuardReason: result.shadowGuardDiagnostics?.guardReason ?? null,
    activePointerBefore: result.publishOrchestrator.previousActivePointer,
    activePointerAfter: result.publishOrchestrator.newActivePointer,
    blockingEnforcementApplied: false,
  });
}

function failure(
  status: number,
  error: string,
  diagnostics: string[],
  body: unknown,
): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      mode: "shadow_publish",
      routeStatus: "denied_preflight",
      correlationId: textFromBody(body, "correlationId"),
      idempotencyKey: textFromBody(body, "idempotencyKey"),
      shadowPublish: true,
      dryRun: false,
      blockingEnforcementApplied: false,
      publishMayHaveExecuted: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      redactions: [
        "requestActorOverrides",
        "resolverResult",
        "publishActivationMetadataHandoff",
        "publishOrchestratorInput",
        "rawPublishOrchestratorResult",
        "providerSecrets",
        "billingData",
        "rawSqlErrors",
        "stackTraces",
      ],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function createSingleSiteShadowPublishRouteHandlers(
  deps: Partial<SingleSiteShadowPublishRouteDeps> = {},
) {
  const resolvedDeps: SingleSiteShadowPublishRouteDeps = {
    requireSuperadminUserId,
    runSingleSiteShadowPublishOperatorAction,
    isFeatureEnabled: isShadowPublishFeatureEnabled,
    log: (event, details) => console.info(`[gnr8.single-site.mvp56] ${event}`, details),
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      const body = await parseRequestBody(request);

      if (!resolvedDeps.isFeatureEnabled()) {
        resolvedDeps.log("shadow_publish_denied", {
          routeStatus: "feature_flag_disabled",
          correlationId: textFromBody(body, "correlationId"),
          idempotencyKey: textFromBody(body, "idempotencyKey"),
          blockingEnforcementApplied: false,
        });
        return failure(403, "SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION_DISABLED", [
          "single_site_shadow_publish_operator_flag_disabled",
        ], body);
      }

      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        resolvedDeps.log("shadow_publish_denied", {
          routeStatus: "superadmin_required",
          correlationId: textFromBody(body, "correlationId"),
          idempotencyKey: textFromBody(body, "idempotencyKey"),
          blockingEnforcementApplied: false,
        });
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", [
          "single_site_shadow_publish_operator_superadmin_required",
        ], body);
      }

      const validation = validateSingleSiteShadowPublishOperatorRequest(body);
      if (!validation.valid) {
        resolvedDeps.log("shadow_publish_denied", {
          actor: {
            actorType: "human",
            actorId,
            actorRole: "platform_superadmin",
          },
          routeStatus: "invalid_request",
          correlationId: textFromBody(body, "correlationId"),
          idempotencyKey: textFromBody(body, "idempotencyKey"),
          diagnostics: validation.errors,
          blockingEnforcementApplied: false,
        });
        return failure(400, "INVALID_SINGLE_SITE_SHADOW_PUBLISH_REQUEST", validation.errors, body);
      }

      try {
        const result = await resolvedDeps.runSingleSiteShadowPublishOperatorAction({
          request: validation.request,
          actor: {
            actorType: "human",
            actorId,
            actorRole: "platform_superadmin",
          },
          dependencies: resolvedDeps.wrapperDependencies,
        });
        logSafeResult(
          resolvedDeps.log,
          result.ok ? "shadow_publish_completed" : "shadow_publish_failed",
          result,
          actorId,
        );
        return Response.json(result, {
          status: responseStatusForResult(result),
          headers: { "cache-control": "no-store" },
        });
      } catch {
        resolvedDeps.log("shadow_publish_failed", {
          actor: {
            actorType: "human",
            actorId,
            actorRole: "platform_superadmin",
          },
          routeStatus: "route_handler_failed",
          correlationId: validation.request.correlationId,
          idempotencyKey: validation.request.idempotencyKey,
          blockingEnforcementApplied: false,
        });
        return failure(500, "SINGLE_SITE_SHADOW_PUBLISH_ROUTE_FAILED", [
          "single_site_shadow_publish_operator_route_failed",
        ], validation.request);
      }
    },
  };
}
