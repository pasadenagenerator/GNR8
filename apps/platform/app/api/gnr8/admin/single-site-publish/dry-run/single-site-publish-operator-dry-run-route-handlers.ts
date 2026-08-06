import {
  runSingleSitePublishOperatorDryRun,
  validateSingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunCallerDependencies,
} from "@/gnr8/single-site/single-site-publish-operator-dry-run-caller";
import {
  buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest,
  buildSingleSitePublishOperatorActionAuditInputFromPreflightFailure,
  createSingleSitePublishOperatorActionAuditService,
  type SingleSitePublishOperatorActionAuditActor,
  type SingleSitePublishOperatorActionAuditService,
} from "@/gnr8/single-site/single-site-publish-operator-action-audit";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type SingleSitePublishOperatorDryRunRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  runSingleSitePublishOperatorDryRun: typeof runSingleSitePublishOperatorDryRun;
  auditService: Pick<
    SingleSitePublishOperatorActionAuditService,
    "createOrReuseAction" | "markDryRunStarted" | "markPreflightFailed" | "markDryRunCompleted"
  >;
  wrapperDependencies?: SingleSitePublishOperatorDryRunCallerDependencies;
};

const DRY_RUN_ROUTE_ACTION_SOURCE = "api/gnr8/admin/single-site-publish/dry-run";

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

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      dryRun: true,
      publishes: false,
      runtimeMutation: false,
      blockingEnforcementApplied: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function actor(actorId: string): SingleSitePublishOperatorActionAuditActor {
  return {
    actorType: "human",
    actorId,
    actorRole: "platform_superadmin",
  };
}

export function createSingleSitePublishOperatorDryRunRouteHandlers(
  deps: Partial<SingleSitePublishOperatorDryRunRouteDeps> = {},
) {
  const resolvedDeps: SingleSitePublishOperatorDryRunRouteDeps = {
    requireSuperadminUserId,
    runSingleSitePublishOperatorDryRun,
    auditService: deps.auditService ?? createSingleSitePublishOperatorActionAuditService(),
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      const body = await parseRequestBody(request);

      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", [
          "single_site_publish_operator_superadmin_required",
        ]);
      }

      const auditActor = actor(actorId);
      const validation = validateSingleSitePublishOperatorDryRunRequest(body);
      if (!validation.valid) {
        try {
          const audit = await resolvedDeps.auditService.createOrReuseAction(
            buildSingleSitePublishOperatorActionAuditInputFromPreflightFailure({
              mode: "dry_run",
              body,
              actor: auditActor,
              routeActionSource: DRY_RUN_ROUTE_ACTION_SOURCE,
              diagnostics: validation.errors,
            }),
          );
          await resolvedDeps.auditService.markPreflightFailed({
            actionId: audit.action.id,
            actor: auditActor,
            correlationId: audit.action.correlation_id,
            idempotencyKey: audit.action.idempotency_key,
            errorCode: "INVALID_SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_REQUEST",
            diagnostics: validation.errors,
          });
        } catch {
          return failure(500, "SINGLE_SITE_PUBLISH_OPERATOR_AUDIT_FAILED", [
            "single_site_publish_operator_audit_failed",
          ]);
        }
        return failure(400, "INVALID_SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_REQUEST", validation.errors);
      }

      let auditActionId: string;
      try {
        const audit = await resolvedDeps.auditService.createOrReuseAction(
          buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest({
            request: validation.request,
            actor: auditActor,
            routeActionSource: DRY_RUN_ROUTE_ACTION_SOURCE,
          }),
        );
        auditActionId = audit.action.id;
        await resolvedDeps.auditService.markDryRunStarted({
          actionId: auditActionId,
          actor: auditActor,
          correlationId: validation.request.correlationId,
          idempotencyKey: validation.request.idempotencyKey,
        });
      } catch {
        return failure(500, "SINGLE_SITE_PUBLISH_OPERATOR_AUDIT_FAILED", [
          "single_site_publish_operator_audit_failed",
        ]);
      }

      try {
        const result = await resolvedDeps.runSingleSitePublishOperatorDryRun({
          request: validation.request,
          actor: auditActor,
          dependencies: resolvedDeps.wrapperDependencies,
        });
        try {
          await resolvedDeps.auditService.markDryRunCompleted({
            actionId: auditActionId,
            actor: auditActor,
            correlationId: validation.request.correlationId,
            idempotencyKey: validation.request.idempotencyKey,
            result,
          });
        } catch {
          return failure(500, "SINGLE_SITE_PUBLISH_OPERATOR_AUDIT_FAILED", [
            "single_site_publish_operator_audit_failed",
          ]);
        }
        return Response.json(result, { headers: { "cache-control": "no-store" } });
      } catch {
        try {
          await resolvedDeps.auditService.markPreflightFailed({
            actionId: auditActionId,
            actor: auditActor,
            correlationId: validation.request.correlationId,
            idempotencyKey: validation.request.idempotencyKey,
            errorCode: "SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_FAILED",
            diagnostics: ["single_site_publish_operator_dry_run_failed"],
          });
        } catch {
          return failure(500, "SINGLE_SITE_PUBLISH_OPERATOR_AUDIT_FAILED", [
            "single_site_publish_operator_audit_failed",
          ]);
        }
        return failure(500, "SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_FAILED", [
          "single_site_publish_operator_dry_run_failed",
        ]);
      }
    },
  };
}
