import "server-only";

import { createHash } from "node:crypto";

import {
  evaluateCloneGenerationGate,
  type SingleSiteCloneGenerationGateReadRepository,
  type SingleSiteCloneGenerationGateResult,
} from "./single-site-clone-generation-gate";
import {
  type SingleSiteActorInput,
} from "./single-site-state-writer-repository";
import {
  type SingleSiteJsonObject,
  type SingleSiteMigrationRefRole,
  type SingleSiteTransitionResult,
} from "./single-site-state-contracts";
import { SingleSiteStateReadRepository } from "./single-site-state-read-repository";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";
import {
  SingleSiteStateTransitionService,
  type TransitionSingleSiteMigrationInput,
} from "./single-site-state-transition-service";

export const SINGLE_SITE_CLONE_START_ORCHESTRATOR_VERSION = "mvp-11-single-site-clone-start-orchestrator:v1" as const;

export type StartSingleSiteCloneGenerationMode = "dry_run" | "execute";
export type StartSingleSiteCloneGenerationStatus =
  | "failed_closed"
  | "dry_run_allowed"
  | "dry_run_blocked"
  | "blocked"
  | "completed"
  | "failed"
  | "idempotent_replay";
export type StartSingleSiteCloneGenerationRecommendedNextAction =
  | SingleSiteCloneGenerationGateResult["recommendedNextAction"]
  | "review_clone_fidelity"
  | "retry_with_same_idempotency_key"
  | "inspect_clone_generation_failure";

export type SingleSiteCloneStartRef = {
  sourceRecordId: string;
  refType?: string | null;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  metadataJson?: SingleSiteJsonObject;
};

export type SingleSiteCloneTargetRefs = {
  runtimeSiteId?: string | null;
  siteVersionId?: string | null;
  runtimeArtifactId?: string | null;
  rawTemplateArtifactId?: string | null;
  previewId?: string | null;
};

export type SingleSiteCloneExecutorInput = {
  migrationId: string;
  clientId: string;
  siteId: string;
  sourceEvidenceReviewId: string;
  acceptedWithLimitations: boolean;
  limitations: unknown[];
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  idempotencyKeys: SingleSiteCloneStartChildIdempotencyKeys;
  targetRefs: SingleSiteCloneTargetRefs;
  sourceEvidencePackageRef?: SingleSiteCloneStartRef | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  metadataJson: SingleSiteJsonObject;
};

export type SingleSiteCloneExecutorResult = {
  status: "completed" | "completed_with_warnings" | "failed";
  siteVersionRef?: SingleSiteCloneStartRef | null;
  runtimeArtifactRef?: SingleSiteCloneStartRef | null;
  rawTemplateArtifactRef?: SingleSiteCloneStartRef | null;
  previewRef?: SingleSiteCloneStartRef | null;
  targetRefs?: SingleSiteCloneTargetRefs;
  evidenceRefs?: SingleSiteCloneStartRef[];
  sourceRefs?: SingleSiteCloneStartRef[];
  limitations?: unknown[];
  warnings?: string[];
  watermarks?: SingleSiteJsonObject;
  idempotencyKey?: string | null;
  operationKey?: string | null;
  semanticOutputWatermark?: string | null;
  reusedExisting?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type SingleSiteCloneExecutor = {
  execute(input: SingleSiteCloneExecutorInput): Promise<SingleSiteCloneExecutorResult>;
};

export type SingleSiteCloneStartTransitionService = {
  transition(input: TransitionSingleSiteMigrationInput): Promise<SingleSiteTransitionResult>;
};

export type SingleSiteCloneStartChildIdempotencyKeys = {
  gateEvaluation: string;
  cloneGenerationStarted: string;
  executor: string;
  cloneGenerationCompleted: string;
  cloneReviewRequired: string;
  failure: string;
};

export type StartSingleSiteCloneGenerationInput = {
  migrationId?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  mode: StartSingleSiteCloneGenerationMode;
  actor?: SingleSiteActorInput | null;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  sourceEvidenceReviewId?: string | null;
  sourceEvidencePackageRef?: SingleSiteCloneStartRef | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  aafApprovalDecisionId?: string | null;
  targetRefs?: SingleSiteCloneTargetRefs;
  metadataJson?: SingleSiteJsonObject;
};

export type StartSingleSiteCloneGenerationResult = {
  status: StartSingleSiteCloneGenerationStatus;
  mode: StartSingleSiteCloneGenerationMode;
  allowed: boolean;
  gate: SingleSiteCloneGenerationGateResult;
  startedStateRecorded: boolean;
  executorCalled: boolean;
  completedStateRecorded: boolean;
  reviewRequiredStateRecorded: boolean;
  failureRecorded: boolean;
  acceptedWithLimitations: boolean;
  limitations: unknown[];
  siteVersionRef: SingleSiteCloneStartRef | null;
  runtimeArtifactRef: SingleSiteCloneStartRef | null;
  previewRef: SingleSiteCloneStartRef | null;
  warnings: string[];
  errors: string[];
  recommendedNextAction: StartSingleSiteCloneGenerationRecommendedNextAction;
  mutatesSourceTruth: boolean;
  usesExternalProviders: false;
  publishActionPerformed: false;
};

export type StartSingleSiteCloneGenerationDependencies = {
  readRepository?: SingleSiteCloneGenerationGateReadRepository;
  transitionService?: SingleSiteCloneStartTransitionService;
  executor?: SingleSiteCloneExecutor;
  evaluateGate?: (input: {
    migrationId?: string | null;
    readModel?: SingleSiteMigrationReadModel | null;
    repository?: SingleSiteCloneGenerationGateReadRepository | null;
  }) => Promise<SingleSiteCloneGenerationGateResult>;
};

const EMPTY_BLOCKED_GATE: SingleSiteCloneGenerationGateResult = {
  allowed: false,
  mode: "blocked",
  reason: "unsafe_missing_identity",
  migrationId: null,
  siteId: null,
  currentState: "unavailable",
  sourceEvidenceReviewStatus: "unavailable",
  sourceEvidenceReviewId: null,
  acceptedWithLimitations: false,
  limitations: [],
  missingRequirements: ["migration_id"],
  recommendedNextAction: "resolve_migration_identity",
  derivedOnly: true,
  mutatesSourceTruth: false,
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue(record[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function hashStable(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

export function deriveSingleSiteCloneStartChildIdempotencyKeys(
  idempotencyKey: string,
): SingleSiteCloneStartChildIdempotencyKeys {
  return {
    gateEvaluation: `${idempotencyKey}:gate:evaluate`,
    cloneGenerationStarted: `${idempotencyKey}:state:clone_generation_started`,
    executor: `${idempotencyKey}:executor:clone_generation`,
    cloneGenerationCompleted: `${idempotencyKey}:state:clone_generation_completed`,
    cloneReviewRequired: `${idempotencyKey}:state:clone_review_required`,
    failure: `${idempotencyKey}:state:migration_failed`,
  };
}

function result(input: {
  status: StartSingleSiteCloneGenerationStatus;
  mode: StartSingleSiteCloneGenerationMode;
  allowed: boolean;
  gate: SingleSiteCloneGenerationGateResult;
  startedStateRecorded?: boolean;
  executorCalled?: boolean;
  completedStateRecorded?: boolean;
  reviewRequiredStateRecorded?: boolean;
  failureRecorded?: boolean;
  acceptedWithLimitations?: boolean;
  limitations?: unknown[];
  siteVersionRef?: SingleSiteCloneStartRef | null;
  runtimeArtifactRef?: SingleSiteCloneStartRef | null;
  previewRef?: SingleSiteCloneStartRef | null;
  warnings?: string[];
  errors?: string[];
  recommendedNextAction: StartSingleSiteCloneGenerationRecommendedNextAction;
  mutatesSourceTruth?: boolean;
}): StartSingleSiteCloneGenerationResult {
  return {
    status: input.status,
    mode: input.mode,
    allowed: input.allowed,
    gate: input.gate,
    startedStateRecorded: Boolean(input.startedStateRecorded),
    executorCalled: Boolean(input.executorCalled),
    completedStateRecorded: Boolean(input.completedStateRecorded),
    reviewRequiredStateRecorded: Boolean(input.reviewRequiredStateRecorded),
    failureRecorded: Boolean(input.failureRecorded),
    acceptedWithLimitations: Boolean(input.acceptedWithLimitations ?? input.gate.acceptedWithLimitations),
    limitations: input.limitations ?? input.gate.limitations,
    siteVersionRef: input.siteVersionRef ?? null,
    runtimeArtifactRef: input.runtimeArtifactRef ?? null,
    previewRef: input.previewRef ?? null,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    recommendedNextAction: input.recommendedNextAction,
    mutatesSourceTruth: Boolean(input.mutatesSourceTruth),
    usesExternalProviders: false,
    publishActionPerformed: false,
  };
}

function validationResult(
  mode: StartSingleSiteCloneGenerationMode,
  gate: SingleSiteCloneGenerationGateResult,
  errors: string[],
): StartSingleSiteCloneGenerationResult {
  return result({
    status: "failed_closed",
    mode,
    allowed: false,
    gate,
    errors,
    recommendedNextAction: gate.recommendedNextAction,
    mutatesSourceTruth: false,
  });
}

function warningForGate(gate: SingleSiteCloneGenerationGateResult): string[] {
  return gate.acceptedWithLimitations ? ["source evidence accepted with limitations; clone generation must preserve limitation context"] : [];
}

function refForTransition(
  migrationId: string,
  refRole: SingleSiteMigrationRefRole,
  ref: SingleSiteCloneStartRef,
  idempotencyKey: string,
) {
  return {
    migrationId,
    refRole,
    refType: text(ref.refType) ?? refRole,
    sourceSystem: ref.sourceSystem,
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceVersion: ref.sourceVersion,
    sourceWatermark: ref.sourceWatermark,
    payloadHash: ref.payloadHash,
    metadataJson: ref.metadataJson,
    idempotencyKey,
  };
}

function refFromTarget(sourceRecordId?: string | null, refType?: string): SingleSiteCloneStartRef | null {
  const id = text(sourceRecordId);
  return id ? { sourceRecordId: id, refType } : null;
}

function sanitizeError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      code: text(record.code) ?? text(record.name) ?? "clone_generation_failed",
      message: text(record.message) ?? "Clone generation failed",
    };
  }
  return { code: "clone_generation_failed", message: "Clone generation failed" };
}

function identityErrors(input: {
  clientId: string;
  siteId: string;
  sourceEvidenceReviewId?: string | null;
  readModel: SingleSiteMigrationReadModel | null;
  gate: SingleSiteCloneGenerationGateResult;
}): string[] {
  const errors: string[] = [];
  const model = input.readModel;
  if (!model) return errors;
  if (model.migration.clientId !== input.clientId) errors.push("client_id_mismatch");
  if (model.migration.siteId && model.migration.siteId !== input.siteId) errors.push("site_id_mismatch");
  const requestedReviewId = text(input.sourceEvidenceReviewId);
  if (requestedReviewId && requestedReviewId !== input.gate.sourceEvidenceReviewId) {
    errors.push("source_evidence_review_id_mismatch");
  }
  return errors;
}

function baseTransitionInput(input: {
  request: StartSingleSiteCloneGenerationInput;
  migrationId: string;
  actor: SingleSiteActorInput;
  correlationId: string;
  idempotencyKey: string;
  metadataJson: SingleSiteJsonObject;
  gate: SingleSiteCloneGenerationGateResult;
}): Omit<TransitionSingleSiteMigrationInput, "toState" | "idempotencyKey"> {
  return {
    migrationId: input.migrationId,
    actor: input.actor,
    correlationId: input.correlationId,
    causationId: input.request.causationId,
    requestId: input.request.requestId,
    privacyLabel: "client_confidential",
    retentionClass: "compliance_long",
    sourceEvidenceReviewId: input.gate.sourceEvidenceReviewId,
    sourceWatermark: input.request.sourceWatermark,
    payloadHash: input.request.payloadHash,
    metadataJson: input.metadataJson,
  };
}

async function readModelAndGate(input: {
  migrationId: string;
  readRepository: SingleSiteCloneGenerationGateReadRepository;
  evaluateGate: NonNullable<StartSingleSiteCloneGenerationDependencies["evaluateGate"]>;
}): Promise<{ readModel: SingleSiteMigrationReadModel | null; gate: SingleSiteCloneGenerationGateResult }> {
  try {
    const readModel = await input.readRepository.readByMigrationId(input.migrationId);
    const gate = await input.evaluateGate({ migrationId: input.migrationId, readModel });
    return { readModel, gate };
  } catch {
    const gate = await input.evaluateGate({
      migrationId: input.migrationId,
      repository: {
        async readByMigrationId() {
          throw new Error("read_model_unavailable");
        },
      },
    });
    return { readModel: null, gate };
  }
}

function isPostCompletionReplay(readModel: SingleSiteMigrationReadModel | null): boolean {
  return readModel?.currentState.state === "clone_review_required";
}

function isCompletionPendingReplay(readModel: SingleSiteMigrationReadModel | null): boolean {
  return readModel?.currentState.state === "clone_generation_completed";
}

function isExecutorRetryState(readModel: SingleSiteMigrationReadModel | null): boolean {
  return readModel?.currentState.state === "clone_generation_started";
}

export async function startSingleSiteCloneGeneration(
  input: StartSingleSiteCloneGenerationInput,
  dependencies: StartSingleSiteCloneGenerationDependencies = {},
): Promise<StartSingleSiteCloneGenerationResult> {
  const mode = input.mode;
  const migrationId = text(input.migrationId);
  const clientId = text(input.clientId);
  const siteId = text(input.siteId);
  const correlationId = text(input.correlationId);
  const idempotencyKey = text(input.idempotencyKey);
  const actor = input.actor ?? null;

  if (mode !== "dry_run" && mode !== "execute") {
    return validationResult("dry_run", EMPTY_BLOCKED_GATE, ["mode is required"]);
  }

  if (!migrationId) {
    const gate = await (dependencies.evaluateGate ?? evaluateCloneGenerationGate)({ migrationId: input.migrationId });
    return validationResult(mode, gate, ["migration_id is required"]);
  }

  if (!idempotencyKey) {
    return validationResult(mode, EMPTY_BLOCKED_GATE, ["idempotency_key is required"]);
  }
  if (!clientId) {
    return validationResult(mode, EMPTY_BLOCKED_GATE, ["client_id is required"]);
  }
  if (!siteId) {
    return validationResult(mode, EMPTY_BLOCKED_GATE, ["site_id is required"]);
  }
  if (!actor || !text(actor.actorType) || !text(actor.actorId) || !text(actor.actorRole)) {
    return validationResult(mode, EMPTY_BLOCKED_GATE, ["actor type, id, and role are required"]);
  }
  if (!correlationId) {
    return validationResult(mode, EMPTY_BLOCKED_GATE, ["correlation_id is required"]);
  }

  const readRepository = dependencies.readRepository ?? new SingleSiteStateReadRepository();
  const transitionService = dependencies.transitionService ?? new SingleSiteStateTransitionService();
  const evaluateGate = dependencies.evaluateGate ?? evaluateCloneGenerationGate;
  const keys = deriveSingleSiteCloneStartChildIdempotencyKeys(idempotencyKey);
  const { readModel, gate } = await readModelAndGate({ migrationId, readRepository, evaluateGate });
  const identityValidationErrors = identityErrors({ clientId, siteId, sourceEvidenceReviewId: input.sourceEvidenceReviewId, readModel, gate });

  if (identityValidationErrors.length > 0) {
    return result({
      status: "blocked",
      mode,
      allowed: false,
      gate,
      errors: identityValidationErrors,
      recommendedNextAction: "resolve_migration_identity",
      mutatesSourceTruth: false,
    });
  }

  if (mode === "dry_run") {
    return result({
      status: gate.allowed ? "dry_run_allowed" : "dry_run_blocked",
      mode,
      allowed: gate.allowed,
      gate,
      warnings: warningForGate(gate),
      recommendedNextAction: gate.recommendedNextAction,
      mutatesSourceTruth: false,
    });
  }

  if (!gate.allowed || !gate.sourceEvidenceReviewId) {
    return result({
      status: "blocked",
      mode,
      allowed: false,
      gate,
      errors: gate.missingRequirements,
      recommendedNextAction: gate.recommendedNextAction,
      mutatesSourceTruth: false,
    });
  }

  if (isPostCompletionReplay(readModel)) {
    return result({
      status: "idempotent_replay",
      mode,
      allowed: true,
      gate,
      warnings: warningForGate(gate),
      recommendedNextAction: "review_clone_fidelity",
      mutatesSourceTruth: false,
    });
  }
  const executorDependency = dependencies.executor;
  if (!executorDependency && !isCompletionPendingReplay(readModel)) {
    return validationResult(mode, gate, ["clone_executor dependency is required for execute mode"]);
  }

  const metadataJson = {
    ...(input.metadataJson ?? {}),
    orchestratorVersion: SINGLE_SITE_CLONE_START_ORCHESTRATOR_VERSION,
    gate: {
      childIdempotencyKey: keys.gateEvaluation,
      mode: gate.mode,
      reason: gate.reason,
      acceptedWithLimitations: gate.acceptedWithLimitations,
      limitations: gate.limitations,
    },
    cloneStartInputHash: hashStable({
      migrationId,
      clientId,
      siteId,
      mode,
      sourceEvidenceReviewId: input.sourceEvidenceReviewId ?? null,
      targetRefs: input.targetRefs ?? {},
      sourceEvidencePackageRef: input.sourceEvidencePackageRef ?? null,
    }),
  };
  const transitionBase = baseTransitionInput({
    request: input,
    migrationId,
    actor,
    correlationId,
    idempotencyKey,
    metadataJson,
    gate,
  });

  let startedStateRecorded = false;
  let completedStateRecorded = false;
  let reviewRequiredStateRecorded = false;
  let executorCalled = false;

  try {
    if (!isExecutorRetryState(readModel) && !isCompletionPendingReplay(readModel)) {
      const startRefs = [
        refForTransition(
          migrationId,
          "source_evidence_review",
          { sourceRecordId: gate.sourceEvidenceReviewId, refType: "source_evidence_review", sourceTable: "gnr8_single_site_source_evidence_reviews" },
          `${keys.cloneGenerationStarted}:ref:source_evidence_review`,
        ),
      ];
      if (input.sourceEvidencePackageRef) {
        startRefs.push(
          refForTransition(
            migrationId,
            "source_evidence_package",
            input.sourceEvidencePackageRef,
            `${keys.cloneGenerationStarted}:ref:source_evidence_package`,
          ),
        );
      }
      const aafApprovalDecisionId = text(input.aafApprovalDecisionId) ?? readModel?.sourceEvidenceReview.aafApprovalDecisionId ?? null;
      if (aafApprovalDecisionId) {
        startRefs.push(
          refForTransition(
            migrationId,
            "aaf_approval_decision",
            { sourceRecordId: aafApprovalDecisionId, refType: "aaf_approval_decision" },
            `${keys.cloneGenerationStarted}:ref:aaf_approval_decision`,
          ),
        );
      }
      const started = await transitionService.transition({
        ...transitionBase,
        toState: "clone_generation_started",
        transitionKey: "single_site_clone_start.clone_generation_started",
        transitionReason: gate.acceptedWithLimitations ? "accepted_source_evidence_with_limitations" : "accepted_source_evidence",
        requiredRefsJson: { sourceEvidenceReviewId: gate.sourceEvidenceReviewId },
        refs: startRefs,
        aafApprovalDecisionId,
        idempotencyKey: keys.cloneGenerationStarted,
      });
      startedStateRecorded = !started.reusedExisting;
    }

    let executorResult: SingleSiteCloneExecutorResult | null = null;
    if (!isCompletionPendingReplay(readModel)) {
      if (!executorDependency) throw new Error("clone executor dependency unexpectedly missing after validation");
      executorCalled = true;
      executorResult = await executorDependency.execute({
        migrationId,
        clientId,
        siteId,
        sourceEvidenceReviewId: gate.sourceEvidenceReviewId,
        acceptedWithLimitations: gate.acceptedWithLimitations,
        limitations: gate.limitations,
        actor,
        correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: keys.executor,
        idempotencyKeys: keys,
        targetRefs: input.targetRefs ?? {},
        sourceEvidencePackageRef: input.sourceEvidencePackageRef,
        sourceWatermark: input.sourceWatermark,
        payloadHash: input.payloadHash,
        metadataJson,
      });
      if (executorResult.status === "failed") {
        throw Object.assign(new Error(executorResult.errorMessage ?? "Clone executor returned failed status"), {
          code: executorResult.errorCode ?? "clone_executor_failed",
        });
      }
    }

    const siteVersionRef = executorResult?.siteVersionRef ?? refFromTarget(input.targetRefs?.siteVersionId, "runtime_site_version_clone");
    const runtimeArtifactRef = executorResult?.runtimeArtifactRef ?? refFromTarget(input.targetRefs?.runtimeArtifactId, "runtime_artifact_clone");
    const previewRef = executorResult?.previewRef ?? refFromTarget(input.targetRefs?.previewId, "preview");
    const rawTemplateArtifactRef = executorResult?.rawTemplateArtifactRef ?? refFromTarget(input.targetRefs?.rawTemplateArtifactId, "raw_template_artifact");
    const completedRefs = [
      siteVersionRef
        ? refForTransition(migrationId, "runtime_site_version_clone", siteVersionRef, `${keys.cloneGenerationCompleted}:ref:runtime_site_version_clone`)
        : null,
      runtimeArtifactRef
        ? refForTransition(migrationId, "runtime_artifact_clone", runtimeArtifactRef, `${keys.cloneGenerationCompleted}:ref:runtime_artifact_clone`)
        : null,
      rawTemplateArtifactRef
        ? refForTransition(migrationId, "raw_template_artifact", rawTemplateArtifactRef, `${keys.cloneGenerationCompleted}:ref:raw_template_artifact`)
        : null,
    ].filter((ref): ref is NonNullable<typeof ref> => Boolean(ref));

    if (!isCompletionPendingReplay(readModel)) {
      const completed = await transitionService.transition({
        ...transitionBase,
        toState: "clone_generation_completed",
        transitionKey: "single_site_clone_start.clone_generation_completed",
        transitionReason: "clone_executor_completed",
        afterRefJson: {
          siteVersionRef,
          runtimeArtifactRef,
          previewRef,
          watermarks: executorResult?.watermarks ?? {},
          executorWarnings: executorResult?.warnings ?? [],
        },
        refs: completedRefs,
        idempotencyKey: keys.cloneGenerationCompleted,
      });
      completedStateRecorded = !completed.reusedExisting;
    }

    const reviewRequired = await transitionService.transition({
      ...transitionBase,
      toState: "clone_review_required",
      transitionKey: "single_site_clone_start.clone_review_required",
      transitionReason: "clone_generation_ready_for_review",
      afterRefJson: {
        siteVersionRef,
        runtimeArtifactRef,
        previewRef,
      },
      idempotencyKey: keys.cloneReviewRequired,
    });
    reviewRequiredStateRecorded = !reviewRequired.reusedExisting;

    return result({
      status: "completed",
      mode,
      allowed: true,
      gate,
      startedStateRecorded,
      executorCalled,
      completedStateRecorded,
      reviewRequiredStateRecorded,
      acceptedWithLimitations: gate.acceptedWithLimitations,
      limitations: [...gate.limitations, ...(executorResult?.limitations ?? [])],
      siteVersionRef,
      runtimeArtifactRef,
      previewRef,
      warnings: [...warningForGate(gate), ...(executorResult?.warnings ?? [])],
      recommendedNextAction: "review_clone_fidelity",
      mutatesSourceTruth: true,
    });
  } catch (error) {
    const sanitized = sanitizeError(error);
    let failureRecorded = false;
    if (startedStateRecorded || isExecutorRetryState(readModel)) {
      try {
        const failed = await transitionService.transition({
          ...transitionBase,
          toState: "migration_failed",
          transitionKey: "single_site_clone_start.migration_failed",
          transitionReason: "clone_executor_failed",
          metadataJson: {
            ...metadataJson,
            failure: {
              code: sanitized.code,
              message: sanitized.message,
              failedPhase: executorCalled ? "clone_executor" : "clone_start_transition_or_executor_setup",
              retryClassification: "manual_restart_required_under_current_mvp_6_state_machine",
              correlationId,
            },
          },
          idempotencyKey: keys.failure,
        });
        failureRecorded = !failed.reusedExisting;
      } catch {
        failureRecorded = false;
      }
    }
    return result({
      status: "failed",
      mode,
      allowed: false,
      gate,
      startedStateRecorded,
      executorCalled,
      completedStateRecorded,
      reviewRequiredStateRecorded,
      failureRecorded,
      acceptedWithLimitations: gate.acceptedWithLimitations,
      warnings: warningForGate(gate),
      errors: [sanitized.code, sanitized.message],
      recommendedNextAction: "inspect_clone_generation_failure",
      mutatesSourceTruth: startedStateRecorded || failureRecorded || completedStateRecorded || reviewRequiredStateRecorded,
    });
  }
}
