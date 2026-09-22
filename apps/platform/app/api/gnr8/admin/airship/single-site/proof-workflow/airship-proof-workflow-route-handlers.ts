import { AirshipSingleSiteDraftService } from "@/gnr8/single-site/airship-single-site-draft-service";
import {
  createAirshipSingleSiteDraftCandidate,
  type AirshipDraftCandidateCreationOutput,
} from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import { getArtifactById } from "@/gnr8/runtime/runtime-store";
import { analyzeAirshipArtifactHtmlValidity, analyzeAirshipPolishedArtifactHtmlCompleteness } from "@/gnr8/single-site/airship-valid-artifact-html";
import {
  buildAirshipSingleSiteDraftSeed,
  getAirshipSingleSiteEditorReadonlyProjection,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import {
  applyAirshipProofWorkflowMappings,
  captureAirshipProofWorkflowChanges,
  mapAirshipProofWorkflowChanges,
  prepareAirshipProofWorkflow,
  type AirshipProofWorkflowApplyReadback,
  type AirshipProofWorkflowCapturedReadback,
  type AirshipProofWorkflowMappedReadback,
  type AirshipProofWorkflowPreparedReadback,
} from "@/gnr8/airship/proof-session/airship-proof-workflow-orchestrator";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "prepare" | "capture" | "map" | "capture_map" | "apply_confirmed" | "generate_internal_preview_from_applied_draft";

const APPLIED_HEADLINE = "The XXX team helps your IT change with every technology wave.";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  getAirshipSingleSiteEditorReadonlyProjection: typeof getAirshipSingleSiteEditorReadonlyProjection;
  service: Pick<AirshipSingleSiteDraftService, "readCurrentDraft" | "updateDraftEditText">;
  prepareAirshipProofWorkflow: typeof prepareAirshipProofWorkflow;
  captureAirshipProofWorkflowChanges: typeof captureAirshipProofWorkflowChanges;
  mapAirshipProofWorkflowChanges: typeof mapAirshipProofWorkflowChanges;
  applyAirshipProofWorkflowMappings: typeof applyAirshipProofWorkflowMappings;
  createAirshipSingleSiteDraftCandidate: typeof createAirshipSingleSiteDraftCandidate;
  getArtifactById: typeof getArtifactById;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  preparedWorkflow?: unknown;
  capturedWorkflow?: unknown;
  mappedWorkflow?: unknown;
  appliedWorkflow?: unknown;
  freshDraftProof?: unknown;
  confirmed?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const POST_BODY_KEYS = new Set([
  "actionMode",
  "migrationId",
  "preparedWorkflow",
  "capturedWorkflow",
  "mappedWorkflow",
  "appliedWorkflow",
  "freshDraftProof",
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

function mutationFlags(
  draftDataMutation: boolean,
  generation: { runtimeVersionMutation?: boolean; artifactRegeneration?: boolean; previewRegeneration?: boolean } = {},
) {
  return {
    draftDataMutation,
    liveSiteMutation: false,
    runtimeVersionMutation: generation.runtimeVersionMutation === true,
    activePointerMutation: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    artifactRegeneration: generation.artifactRegeneration === true,
    previewRegeneration: generation.previewRegeneration === true,
    previewArtifactMutation: generation.artifactRegeneration === true,
    previewHostBindingMutation: false,
    demoPreviewHostBindingMutation: false,
    sourceCaptureImport: false,
    dnsMutation: false,
    providerMutation: false,
    customerDomainMutation: false,
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

function capturedWorkflow(value: unknown): AirshipProofWorkflowCapturedReadback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AirshipProofWorkflowCapturedReadback>;
  if (record.proofOnly !== true || record.localManualOnly !== true || record.status !== "captured") return null;
  if (!record.preparedSession || !record.capture) return null;
  return record as AirshipProofWorkflowCapturedReadback;
}

function appliedWorkflow(value: unknown): AirshipProofWorkflowApplyReadback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AirshipProofWorkflowApplyReadback>;
  if (record.proofOnly !== true || record.localManualOnly !== true || record.status !== "applied_to_draft") return null;
  if (!record.preparedSession || !record.applyReadback || !record.draft) return null;
  if (!record.appliedFieldNames?.includes("headline")) return null;
  return record as AirshipProofWorkflowApplyReadback;
}

function freshDraftProof(value: unknown): { draftId: string; draftVersion: number; appliedHeadline: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const draftId = text(record.draftId);
  const appliedHeadline = text(record.appliedHeadline);
  const draftVersion = typeof record.draftVersion === "number" && Number.isFinite(record.draftVersion)
    ? Math.floor(record.draftVersion)
    : null;
  if (!draftId || !draftVersion || appliedHeadline !== APPLIED_HEADLINE) return null;
  return { draftId, draftVersion, appliedHeadline };
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

function draftContainsAppliedHeadline(draft: Awaited<ReturnType<RouteDeps["service"]["readCurrentDraft"]>>): boolean {
  return Boolean(draft?.draftEdits.some((edit) => edit.fieldKey === "headline" && edit.proposedTextContent === APPLIED_HEADLINE));
}

function hasValidApplyOrFreshDraftProof(input: {
  body: ActionBody;
  migrationId: string;
  currentDraft: Awaited<ReturnType<RouteDeps["service"]["readCurrentDraft"]>>;
}): { ok: true; proofKind: "applied_readback" | "fresh_draft_version"; draftVersionUsed: number } | { ok: false; diagnostics: string[] } {
  if (!input.currentDraft) return { ok: false, diagnostics: ["airship_proof_workflow_current_draft_missing"] };
  if (!draftContainsAppliedHeadline(input.currentDraft)) {
    return { ok: false, diagnostics: ["airship_proof_workflow_applied_headline_missing_from_saved_draft"] };
  }

  const applied = appliedWorkflow(input.body.appliedWorkflow);
  if (applied) {
    if (applied.preparedSession.selectedArtifact.migrationId !== input.migrationId) {
      return { ok: false, diagnostics: ["airship_proof_workflow_applied_migration_mismatch"] };
    }
    if (applied.draft.idAfter !== input.currentDraft.id || applied.draft.versionAfter !== input.currentDraft.version) {
      return { ok: false, diagnostics: ["airship_proof_workflow_applied_draft_readback_stale"] };
    }
    return { ok: true, proofKind: "applied_readback", draftVersionUsed: input.currentDraft.version };
  }

  const proof = freshDraftProof(input.body.freshDraftProof);
  if (proof) {
    if (proof.draftId !== input.currentDraft.id || proof.draftVersion !== input.currentDraft.version) {
      return { ok: false, diagnostics: ["airship_proof_workflow_fresh_draft_proof_stale"] };
    }
    return { ok: true, proofKind: "fresh_draft_version", draftVersionUsed: input.currentDraft.version };
  }

  return { ok: false, diagnostics: ["airship_proof_workflow_successful_apply_or_fresh_draft_proof_required"] };
}

async function generatedPreviewReadback(input: {
  output: AirshipDraftCandidateCreationOutput;
  deps: RouteDeps;
}) {
  const artifact = await input.deps.getArtifactById(input.output.candidateRuntimeArtifactId);
  const html = artifact?.htmlByPath?.["/"] ?? "";
  const artifactValidity = analyzeAirshipArtifactHtmlValidity({
    html,
    migrationId: input.output.migrationId,
  });
  const polishedCompleteness = analyzeAirshipPolishedArtifactHtmlCompleteness({
    html,
    migrationId: input.output.migrationId,
  });
  const generatedArtifactContainsAppliedHeadline = html.includes(APPLIED_HEADLINE);
  const generated = input.output.status === "created";
  return {
    status: input.output.status,
    migrationId: input.output.migrationId,
    draftId: input.output.draftId,
    draftVersionUsed: input.output.draftVersion,
    generatedSiteVersionId: input.output.candidateSiteVersionId,
    generatedRuntimeArtifactId: input.output.candidateRuntimeArtifactId,
    internalPreviewUrl: input.output.previewRoute,
    artifactValidityResult: {
      ...artifactValidity,
      polishedComplete: polishedCompleteness.complete,
      polishedCompletenessReasons: polishedCompleteness.reasons,
    },
    generatedArtifactContainsAppliedHeadline,
    readback: "Draft was updated first. Internal preview was generated second from the saved applied draft. Live site unchanged.",
    mutationFlags: mutationFlags(false, {
      runtimeVersionMutation: generated,
      artifactRegeneration: generated,
      previewRegeneration: generated,
    }),
    diagnostics: [
      "airship_proof_workflow_internal_preview_generated_from_applied_draft",
      generatedArtifactContainsAppliedHeadline
        ? "applied_headline_found_in_generated_artifact"
        : "applied_headline_missing_from_generated_artifact",
      artifactValidity.valid ? "airship_artifact_validity_passed" : "airship_artifact_validity_failed",
    ],
  };
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
    createAirshipSingleSiteDraftCandidate,
    getArtifactById,
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
      if (
        actionMode !== "prepare" &&
        actionMode !== "capture" &&
        actionMode !== "map" &&
        actionMode !== "capture_map" &&
        actionMode !== "apply_confirmed" &&
        actionMode !== "generate_internal_preview_from_applied_draft"
      ) {
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

        if (actionMode === "capture") {
          const prepared = preparedWorkflow(body.preparedWorkflow);
          if (!prepared) {
            return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_prepared_readback_required"]);
          }
          if (prepared.preparedSession.selectedArtifact.migrationId !== migrationId) {
            return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_prepared_migration_mismatch"]);
          }
          const captured = await resolvedDeps.captureAirshipProofWorkflowChanges({ preparedWorkflow: prepared });
          return success(captured);
        }

        if (actionMode === "map") {
          const captured = capturedWorkflow(body.capturedWorkflow);
          if (!captured) {
            return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_captured_readback_required"]);
          }
          if (captured.preparedSession.selectedArtifact.migrationId !== migrationId) {
            return failure(400, "INVALID_AIRSHIP_PROOF_WORKFLOW_BODY", ["airship_proof_workflow_captured_migration_mismatch"]);
          }
          const currentDraft = await resolvedDeps.service.readCurrentDraft(migrationId);
          const expectedDraft = draftRefFromCurrentDraft(currentDraft);
          if (!expectedDraft) {
            return failure(409, "AIRSHIP_PROOF_WORKFLOW_DRAFT_MISSING", ["airship_proof_workflow_current_draft_missing"]);
          }
          const mapped = await resolvedDeps.mapAirshipProofWorkflowChanges({
            preparedWorkflow: captured,
            expectedDraft,
          });
          return success(mapped);
        }

        if (actionMode === "generate_internal_preview_from_applied_draft") {
          const currentDraft = await resolvedDeps.service.readCurrentDraft(migrationId);
          const proof = hasValidApplyOrFreshDraftProof({ body, migrationId, currentDraft });
          if (!proof.ok) {
            return failure(409, "AIRSHIP_PROOF_WORKFLOW_APPLIED_DRAFT_PROOF_REQUIRED", proof.diagnostics);
          }
          if (!currentDraft) {
            return failure(409, "AIRSHIP_PROOF_WORKFLOW_DRAFT_MISSING", ["airship_proof_workflow_current_draft_missing"]);
          }
          const output = await resolvedDeps.createAirshipSingleSiteDraftCandidate({
            draft: currentDraft,
            actor: actorId,
          });
          const readback = await generatedPreviewReadback({ output, deps: resolvedDeps });
          return success({
            ...readback,
            proofKind: proof.proofKind,
            draftVersionUsed: proof.draftVersionUsed,
          }, output.status === "created" ? 201 : 200);
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
