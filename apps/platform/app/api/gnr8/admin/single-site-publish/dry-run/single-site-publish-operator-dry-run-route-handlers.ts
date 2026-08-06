import {
  runSingleSitePublishOperatorDryRun,
  validateSingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunCallerDependencies,
} from "@/gnr8/single-site/single-site-publish-operator-dry-run-caller";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type SingleSitePublishOperatorDryRunRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  runSingleSitePublishOperatorDryRun: typeof runSingleSitePublishOperatorDryRun;
  wrapperDependencies?: SingleSitePublishOperatorDryRunCallerDependencies;
};

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

export function createSingleSitePublishOperatorDryRunRouteHandlers(
  deps: Partial<SingleSitePublishOperatorDryRunRouteDeps> = {},
) {
  const resolvedDeps: SingleSitePublishOperatorDryRunRouteDeps = {
    requireSuperadminUserId,
    runSingleSitePublishOperatorDryRun,
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

      const validation = validateSingleSitePublishOperatorDryRunRequest(body);
      if (!validation.valid) {
        return failure(400, "INVALID_SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_REQUEST", validation.errors);
      }

      try {
        const result = await resolvedDeps.runSingleSitePublishOperatorDryRun({
          request: validation.request,
          actor: {
            actorType: "human",
            actorId,
            actorRole: "platform_superadmin",
          },
          dependencies: resolvedDeps.wrapperDependencies,
        });
        return Response.json(result, { headers: { "cache-control": "no-store" } });
      } catch {
        return failure(500, "SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_FAILED", [
          "single_site_publish_operator_dry_run_failed",
        ]);
      }
    },
  };
}
