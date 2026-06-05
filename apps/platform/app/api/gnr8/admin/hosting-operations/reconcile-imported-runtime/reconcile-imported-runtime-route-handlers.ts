import {
  applyImportedRuntimeReconciliation,
  createImportedRuntimeReconciliationDbDependencies,
  createImportedRuntimeReconciliationPlan,
  IMPORTED_RUNTIME_RECONCILIATION_CONFIRM,
  type ImportedRuntimeReconciliationDependencies,
  type ImportedRuntimeReconciliationInput,
} from "@/gnr8/runtime/imported-runtime-reconciliation";
import { withSuperadminClient } from "@/src/superadmin/db";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";
import type { RuntimeStoreDbClient } from "@/gnr8/runtime/runtime-store";

export type ReconcileImportedRuntimeRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  createImportedRuntimeReconciliationPlan: typeof createImportedRuntimeReconciliationPlan;
  applyImportedRuntimeReconciliation: typeof applyImportedRuntimeReconciliation;
  withSuperadminClient: typeof withSuperadminClient;
  createImportedRuntimeReconciliationDbDependencies: (dbClient: RuntimeStoreDbClient) => Partial<ImportedRuntimeReconciliationDependencies>;
  reconciliationDeps?: Partial<ImportedRuntimeReconciliationDependencies>;
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function mapAdminError(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof Error) {
    if (error.message === "Unauthorized") return { status: 401, body: { error: error.message } };
    if (error.message.startsWith("Forbidden")) return { status: 403, body: { error: "Forbidden: superadmin only" } };
    if (error.message === "APPLY_FLAG_REQUIRED") {
      return { status: 400, body: { ok: false, error: "APPLY_FLAG_REQUIRED", message: "Apply mode requires apply: true." } };
    }
    if (error.message === "CONFIRMATION_REQUIRED") {
      return {
        status: 400,
        body: {
          ok: false,
          error: "CONFIRMATION_REQUIRED",
          message: `Apply mode requires confirm: ${IMPORTED_RUNTIME_RECONCILIATION_CONFIRM}.`,
        },
      };
    }
    if (error.message.startsWith("RECONCILIATION_BLOCKED:")) {
      const payload = error.message.slice("RECONCILIATION_BLOCKED:".length);
      const parsed = payload.trim().startsWith("{") ? (JSON.parse(payload) as Record<string, unknown>) : { message: payload };
      return { status: 409, body: { ok: false, error: "RECONCILIATION_BLOCKED", ...parsed } };
    }
    if (error.message.startsWith("RECONCILIATION_VERIFICATION_FAILED:")) {
      const payload = error.message.slice("RECONCILIATION_VERIFICATION_FAILED:".length);
      return {
        status: 409,
        body: { ok: false, error: "RECONCILIATION_VERIFICATION_FAILED", ...(JSON.parse(payload) as Record<string, unknown>) },
      };
    }
    return { status: 400, body: { ok: false, error: error.message } };
  }
  return { status: 500, body: { ok: false, error: "Internal server error" } };
}

export function createReconcileImportedRuntimeRouteHandlers(deps: Partial<ReconcileImportedRuntimeRouteDependencies> = {}) {
  const resolvedDeps: ReconcileImportedRuntimeRouteDependencies = {
    requireSuperadminUserId,
    createImportedRuntimeReconciliationPlan,
    applyImportedRuntimeReconciliation,
    withSuperadminClient,
    createImportedRuntimeReconciliationDbDependencies,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      try {
        const superadminUserId = await resolvedDeps.requireSuperadminUserId();
        const body = (await request.json().catch(() => ({}))) as ImportedRuntimeReconciliationInput;
        const mode = body.mode === "apply" ? "apply" : "dry_run";
        const input: ImportedRuntimeReconciliationInput = {
          mode,
          ownershipSiteId: token(body.ownershipSiteId),
          importedSiteVersionId: token(body.importedSiteVersionId),
          targetHost: token(body.targetHost),
          confirm: body.confirm,
          apply: body.apply,
          actor: token(body.actor) || `superadmin:${superadminUserId}`,
        };

        return await resolvedDeps.withSuperadminClient(async (dbClient) => {
          const reconciliationDeps = {
            ...resolvedDeps.createImportedRuntimeReconciliationDbDependencies(dbClient),
            ...(resolvedDeps.reconciliationDeps ?? {}),
          };

          if (mode === "apply") {
            const result = await resolvedDeps.applyImportedRuntimeReconciliation(input, reconciliationDeps);
            return Response.json(result);
          }

          const plan = await resolvedDeps.createImportedRuntimeReconciliationPlan(input, reconciliationDeps);
          return Response.json({ ok: true, mode: "dry_run", plan });
        });
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json(mapped.body, { status: mapped.status });
      }
    },
  };
}
