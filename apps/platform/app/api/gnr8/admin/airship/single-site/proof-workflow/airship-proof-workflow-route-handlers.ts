import { AirshipSingleSiteDraftService } from "@/gnr8/single-site/airship-single-site-draft-service";
import {
  buildAirshipSingleSiteDraftSeed,
  getAirshipSingleSiteEditorReadonlyProjection,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import {
  applyAirshipProofWorkflowMappings,
  captureAirshipProofWorkflowChanges,
  mapAirshipProofWorkflowChanges,
  prepareAirshipProofWorkflow,
  type AirshipProofWorkflowMappedReadback,
  type AirshipProofWorkflowPreparedReadback,
} from "@/gnr8/airship/proof-session/airship-proof-workflow-orchestrator";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "prepare" | "capture_map" | "apply_confirmed";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  getAirshipSingleSiteEditorReadonlyProjection: typeof getAirshipSingleSiteEditorReadonlyProjection;
  service: Pick<AirshipSingleSiteDraftService, "readCurrentDraft" | "updateDraftEditText">;
  prepareAirshipProofWorkflow: typeof prepareAirshipProofWorkflow;
  captureAirshipProofWorkflowChanges: typeof captureAirshipProofWorkflowChanges;
  mapAirshipProofWorkflowChanges: typeof mapAirshipProofWorkflowChanges;
  applyAirshipProofWorkflowMappings: typeof applyAirshipProofWorkflowMappings;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  preparedWorkflow?: unknown;
  mappedWorkflow?: unknown;
  confirmed?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const POST_BODY_KEYS = new Set([
  "actionMode",
  "migrationId",
  "preparedWorkflow",
  "mappedWorkflow",
  "confirmed",
  "correlationId",
  "idempotencyKey",
]);
const FORBIDDEN_ACTOR_KEYS = new Set(["actor", "actorId", "actorRole", "actorType", "role", "userId", "principal", "superadminUserId"]);

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
      labels: ["Real Airship sidecar proof", "Proof-only", "Local/manual", "Does not publish", "Preview not regenerated yet", "Live site unchanged"],
      mutationFlags: mutationFlags(false),
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(readback: unknown, status = 200): Response {
  return Response.json(
    {
      ok: true,
      readback,
      labels: ["Real Airship sidecar proof", "Proof-only", "Local/manual", "Does not publish", "Preview not regenerated yet", "Live site unchanged"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function mutationFlags(draftDataMutation: boolean) {
  return {
    draftDataMutation,
    liveSiteMutation: false,
    runtimeVersionMutation: false,
    activePointerMutation: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    artifactRegeneration: false,
    previewRegeneration: false,
    sourceCaptureImport: false,
    dnsMutation: false,
    providerMutation: false,
  };
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function bodyRecord(body: unknown): ActionBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as ActionBody;
}

function validateUnknownKeys(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_ACTOR_KEYS.has(key)) errors.push(`airship_proof_workflow_actor_override_forbidden:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_proof_workflow_forbidden_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function preparedWorkflow(value: unknown): AirshipProofWorkflowPreparedReadback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AirshipProofWorkflowPreparedReadback>;
  if (record.proofOnly !== true || record.localManualOnly !== true || record.status !== "prepared") return null;
  if (!record.preparedSession || typeof record.preparedSession !== "object") return null;
  return record as AirshipProofWorkflowPreparedReadback;
}

function mappedWorkflow(value: unknown): AirshipProofWorkflowMappedReadback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AirshipProofWorkflowMappedReadback>;
  if (record.proofOnly !== true || record.localManualOnly !== true || record.status !== "mapped") return null;
  if (!record.preparedSession || !record.mapping || !record.mappingReadback) return null;
  return record as AirshipProofWorkflowMappedReadback;
}

function draftRefFromCurrentDraft(draft: Awaited<ReturnType<RouteDeps["service"]["readCurrentDraft"]>>) {
  if (!draft) return null;
  return {
    id: draft.id,
    version: draft.version,
  };
}

async function seedForMigration(deps: RouteDeps, migrationId: string) {
  const model = await deps.getAirshipSingleSiteEditorReadonlyProjection({ migrationId });
  const seed = buildAirshipSingleSiteDraftSeed({ model });
  if (!seed.migrationId) throw new Error("airship_proof_workflow_seed_migration_missing");
  if (seed.draftEdits.length === 0) throw new Error("airship_proof_workflow_no_editable_drafts");
  return seed;
}

export function createAirshipProofWorkflowRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const service = deps.service ?? new AirshipSingleSiteDraftService();
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    getAirshipSingleSiteEditorReadonlyProjection,
    service,
    prepareAirshipProofWorkflow,
    captureAirshipProofWorkflowChanges,
    mapAirshipProofWorkflowChanges,
    applyAirshipProofWorkflowMappings,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_proof_workflow_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) {
        return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_request_body_must_be_object"]);
      }
      const bodyErrors = validateUnknownKeys(body);
      if (bodyErrors.length > 0) {
        return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", bodyErrors);
      }

      const actionMode = text(body.actionMode) as ActionMode;
      const migrationId = text(body.migrationId);
      if (actionMode !== "prepare" && actionMode !== "capture_map" && actionMode !== "apply_confirmed") {
        return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_action_mode_invalid"]);
      }
      if (!migrationId) {
        return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_migration_id_required"]);
      }

      try {
        if (actionMode === "prepare") {
          const readback = await resolvedDeps.prepareAirshipProofWorkflow({ migrationId });
          return success(readback);
        }

        if (actionMode === "capture_map") {
          const prepared = preparedWorkflow(body.preparedWorkflow);
          if (!prepared) {
            return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_prepared_readback_required"]);
          }
          if (prepared.preparedSession.selectedArtifact.migrationId !== migrationId) {
            return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_prepared_migration_mismatch"]);
          }
          const currentDraft = await resolvedDeps.service.readCurrentDraft(migrationId);
          const expectedDraft = draftRefFromCurrentDraft(currentDraft);
          if (!expectedDraft) {
            return failure(409, "AIRSHIP_PROOF_WORKFLOW_DRAFT_MISSING", ["airship_proof_workflow_current_draft_missing"]);
          }
          const captured = await resolvedDeps.captureAirshipProofWorkflowChanges({ preparedWorkflow: prepared });
          const mapped = await resolvedDeps.mapAirshipProofWorkflowChanges({
            preparedWorkflow: captured,
            expectedDraft,
          });
          return success({
            captured,
            mapped,
            status: mapped.status,
            mappingSummary: mapped.mappingSummary,
            nextRecommendedAction: mapped.nextRecommendedAction,
          });
        }

        const mapped = mappedWorkflow(body.mappedWorkflow);
        if (!mapped) {
          return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_mapped_readback_required"]);
        }
        if (mapped.preparedSession.selectedArtifact.migrationId !== migrationId) {
          return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_mapped_migration_mismatch"]);
        }
        if (body.confirmed !== true) {
          return failure(400, "AIRSHIP_PROOF_WORKFLOW_CONFIRMATION_REQUIRED", ["airship_proof_workflow_apply_confirmation_required"]);
        }

        const currentDraft = await resolvedDeps.service.readCurrentDraft(migrationId);
        const expectedDraft = draftRefFromCurrentDraft(currentDraft);
        if (!expectedDraft) {
          return failure(409, "AIRSHIP_PROOF_WORKFLOW_DRAFT_MISSING", ["airship_proof_workflow_current_draft_missing"]);
        }
        const seed = await seedForMigration(resolvedDeps, migrationId);
        const applied = await resolvedDeps.applyAirshipProofWorkflowMappings({
          mappedWorkflow: mapped,
          migrationId,
          draftSeed: seed,
          expectedDraft,
          confirmed: true,
          actor: {
            actorId,
            actorType: "human",
            actorRole: "platform_superadmin",
          },
          correlationId: text(body.correlationId) || null,
          idempotencyKey: text(body.idempotencyKey) || null,
          service: resolvedDeps.service,
        });
        return success(applied, applied.status === "blocked" ? 409 : 200);
      } catch {
        return failure(500, "AIRSHIP_PROOF_WORKFLOW_ACTION_FAILED", ["airship_proof_workflow_action_failed"]);
      }
    },
  };
}
