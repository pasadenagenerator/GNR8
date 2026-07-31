import "server-only";

import { createHash } from "node:crypto";

import type {
  ImplementationAuthorizationProposalApprovalRef,
  ImplementationAuthorizationSelectedRecommendationRef,
  ImplementationAuthorizationSourceRef,
} from "./implementation-authorization-bridge";
import type {
  ImprovementExecutionAafValidationResult,
  ImprovementExecutionAuthorizationRef,
} from "./improvement-execution-aaf-validator";
import {
  IMPROVEMENT_EXECUTION_NO_RUNTIME_MUTATION_BOUNDARY,
  IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY,
} from "./improvement-execution-contracts";
import {
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  isSingleSiteTerminalState,
  type SingleSiteImprovementExecutionEventAction,
  type SingleSiteImprovementExecutionMode,
  type SingleSiteImprovementExecutionRefRole,
  type SingleSiteImprovementExecutionStatus,
  type SingleSiteJsonObject,
  type SingleSiteMigrationState,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type InsertImprovementExecutionEventInput,
  type SingleSiteActorInput,
  type SingleSiteImprovementExecutionAttemptRow,
  type SingleSiteImprovementExecutionEventRow,
  type SingleSiteImprovementExecutionRefRow,
  type SingleSiteImprovementProposalPlanRow,
  type SingleSiteImprovementProposalRecommendationRow,
  type SingleSiteMigrationRow,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

type ExecutionEventWithoutIndex = Omit<InsertImprovementExecutionEventInput, "eventIndex">;

export type ImprovementExecutionEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type CreateOrReuseImprovementExecutionAttemptInput = ImprovementExecutionEnvelope & {
  migrationId: string;
  clientId: string;
  siteId: string;
  proposalPlanId: string;
  implementationAuthorizationRef: ImprovementExecutionAuthorizationRef;
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  implementationScopeSummary: string;
  implementationScopeWatermark: string;
  executionMode?: SingleSiteImprovementExecutionMode | null;
  executorId?: string | null;
  executorName?: string | null;
  executorVersion?: string | null;
  semanticInputWatermark?: string | null;
  payloadHash?: string | null;
  supersedesAttemptId?: string | null;
};

export type RecordImprovementExecutionRefInput = ImprovementExecutionEnvelope & {
  attemptId: string;
  migrationId: string;
  refRole: SingleSiteImprovementExecutionRefRole;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  semanticWatermark?: string | null;
  contentHash?: string | null;
  mediaType?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
  evidenceOnly?: boolean | null;
};

export type AttachExecutionValidationInput = ImprovementExecutionEnvelope & {
  attemptId: string;
  validation: ImprovementExecutionAafValidationResult;
  validationResultRef?: string | null;
  validationEvidenceRef?: string | null;
};

export type ImprovementExecutionTransitionInput = ImprovementExecutionEnvelope & {
  attemptId: string;
  reason?: string | null;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
};

export type CompleteImprovementExecutionInput = ImprovementExecutionTransitionInput & {
  semanticOutputWatermark?: string | null;
  improvedCandidateSiteVersionRef?: string | null;
  improvedRuntimeArtifactRef?: string | null;
  outputRefsJson?: SingleSiteJsonObject;
  futureBoundaryFixture?: boolean | null;
};

export type ImprovementExecutionOperationResult = {
  attempt: SingleSiteImprovementExecutionAttemptRow;
  eventId?: string;
  stateEventId?: string;
  reusedExisting: boolean;
};

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredText(field: string, value: unknown): string {
  const text = optionalText(value);
  if (!text) throw new SingleSiteTransitionError(`${field} is required`);
  return text;
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jsonObject(value: unknown): SingleSiteJsonObject {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as SingleSiteJsonObject;
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

function semanticValue(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(stableJsonValue(JSON.parse(value)));
    } catch {
      return JSON.stringify(stableJsonValue(value));
    }
  }
  return JSON.stringify(stableJsonValue(value));
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

export function computeImprovementExecutionSemanticInputWatermark(input: {
  migrationId: string;
  proposalPlanId: string;
  proposalPlanVersion: string | number;
  proposalPlanSemanticWatermark: string;
  implementationAuthorizationDecisionId: string;
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  implementationScopeSummary: string;
  implementationScopeWatermark: string;
  executionMode?: SingleSiteImprovementExecutionMode | null;
}): string {
  return `single-site-improvement-execution:${digest(input)}`;
}

function proposalApprovalRef(plan: SingleSiteImprovementProposalPlanRow): ImplementationAuthorizationProposalApprovalRef {
  const refs = jsonObject(plan.approval_refs_json);
  return {
    approvalRequestId: requiredText("proposal approval request ref", refs.approvalRequestId ?? refs.proposalApprovalRequestId),
    approvalDecisionId: requiredText("proposal approval decision ref", refs.approvalDecisionId ?? refs.proposalApprovalDecisionId),
    evidencePackageId: requiredText("proposal approval evidence ref", refs.evidencePackageId ?? refs.proposalEvidencePackageId),
    sourceWatermark: requiredText("proposal approval source watermark", refs.sourceWatermark ?? refs.proposalApprovalWatermark ?? plan.semantic_watermark),
    limitations: jsonArray(refs.limitations),
  };
}

function implementationAuthorizationRefs(plan: SingleSiteImprovementProposalPlanRow, input: ImprovementExecutionAuthorizationRef): {
  requestId: string;
  decisionId: string;
  evidencePackageId: string | null;
  limitations: unknown[];
  validationStatus: string | null;
} {
  const refs = jsonObject(plan.implementation_authorization_refs_json);
  const requestId = input.approvalRequestId ?? optionalText(refs.implementationAuthorizationRequestId);
  const decisionId = input.approvalDecisionId ?? input.sourceRecordId ?? optionalText(refs.implementationAuthorizationDecisionId);
  const evidencePackageId = input.evidencePackageId ?? optionalText(refs.implementationAuthorizationEvidencePackageId);
  return {
    requestId: requiredText("implementation authorization request ref", requestId),
    decisionId: requiredText("implementation authorization decision ref", decisionId),
    evidencePackageId,
    limitations: jsonArray(refs.implementationAuthorizationLimitations),
    validationStatus: optionalText(refs.implementationAuthorizationValidationStatus),
  };
}

function validationSummary(validation: ImprovementExecutionAafValidationResult): SingleSiteJsonObject {
  return {
    allowed: validation.allowed,
    mode: validation.mode,
    reasonCode: validation.reasonCode,
    blockerCodes: validation.blockerCodes,
    matchedAafRequestDecisionRefs: validation.matchedAafRequestDecisionRefs,
    freshnessResult: validation.freshnessResult,
    driftResult: validation.driftResult,
    missingRefs: validation.missingRefs,
    staleRefs: validation.staleRefs,
    prohibitedSubstitutionFlags: validation.prohibitedSubstitutionFlags,
    mutatesSourceTruth: validation.mutatesSourceTruth,
    nonExecuting: validation.nonExecuting,
  };
}

function assertEventSemanticMatch(event: SingleSiteImprovementExecutionEventRow, input: ExecutionEventWithoutIndex): void {
  const attempted: Record<string, unknown> = {
    attempt_id: input.attemptId,
    migration_id: input.migrationId,
    event_action: input.eventAction,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    actor_type: input.actor.actorType,
    actor_id: input.actor.actorId,
    actor_role: input.actor.actorRole,
    details_json: input.detailsJson ?? {},
    limitations_json: input.limitationsJson ?? [],
    warnings_json: input.warningsJson ?? [],
    validation_summary_json: input.validationSummaryJson ?? {},
    output_refs_json: input.outputRefsJson ?? {},
    failure_json: input.failureJson ?? {},
    source_watermark: input.sourceWatermark ?? null,
    semantic_watermark: input.semanticWatermark ?? null,
    payload_hash: input.payloadHash ?? null,
    privacy_label: input.privacyLabel ?? "client_confidential",
    retention_class: input.retentionClass ?? "compliance_long",
    metadata_json: input.metadataJson ?? {},
  };
  const existing = event as unknown as Record<string, unknown>;
  const drifted = Object.keys(attempted).filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError("gnr8_single_site_improvement_execution_events", input.idempotencyKey, drifted);
}

const TERMINAL_ATTEMPT_STATUSES: readonly SingleSiteImprovementExecutionStatus[] = ["completed", "completed_with_limitations", "superseded", "cancelled"];

function eventActionForStatus(status: SingleSiteImprovementExecutionStatus): SingleSiteImprovementExecutionEventAction {
  if (status === "completed_with_limitations") return "completed_with_limitations";
  return status === "draft" ? "created" : status;
}

function validationAllowsStart(validation: SingleSiteJsonObject): boolean {
  return validation.allowed === true && ["allowed", "allowed_with_limitations"].includes(String(validation.mode));
}

function completionHasOutput(input: CompleteImprovementExecutionInput): boolean {
  return Object.keys(jsonObject(input.outputRefsJson)).length > 0 || Boolean(input.semanticOutputWatermark) || Boolean(input.improvedCandidateSiteVersionRef) || Boolean(input.improvedRuntimeArtifactRef);
}

export class ImprovementExecutionService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createOrReuseExecutionAttempt(input: CreateOrReuseImprovementExecutionAttemptInput): Promise<ImprovementExecutionOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const migration = await this.requiredNonTerminalMigration(tx, input.migrationId);
      this.assertMigrationIdentity(migration, input.clientId, input.siteId);
      const plan = await this.requiredApprovedProposal(tx, input.proposalPlanId, migration.id);
      const selected = await this.requiredSelectedRecommendations(tx, plan, input.selectedRecommendationRefs);
      const auth = implementationAuthorizationRefs(plan, input.implementationAuthorizationRef);
      if (!["granted", "granted_with_limitations"].includes(auth.validationStatus ?? "granted")) {
        throw new SingleSiteTransitionError(`implementation authorization validation status ${auth.validationStatus} cannot create execution attempt`);
      }
      const proposalApproval = proposalApprovalRef(plan);
      const semanticInputWatermark =
        optionalText(input.semanticInputWatermark) ??
        computeImprovementExecutionSemanticInputWatermark({
          migrationId: migration.id,
          proposalPlanId: plan.id,
          proposalPlanVersion: plan.plan_version,
          proposalPlanSemanticWatermark: requiredText("proposal semantic watermark", plan.semantic_watermark),
          implementationAuthorizationDecisionId: auth.decisionId,
          selectedRecommendationRefs: input.selectedRecommendationRefs,
          implementationScopeSummary: input.implementationScopeSummary,
          implementationScopeWatermark: input.implementationScopeWatermark,
          executionMode: input.executionMode ?? "dry_run",
        });

      const existing = await this.repository.getImprovementExecutionAttemptBySemanticRefs(tx, {
        migrationId: migration.id,
        proposalPlanId: plan.id,
        implementationAuthorizationDecisionId: auth.decisionId,
        semanticInputWatermark,
      });
      const created = existing
        ? { row: existing, reusedExisting: true }
        : await this.repository.createImprovementExecutionAttempt(tx, {
            tenantId: migration.tenant_id,
            clientId: migration.client_id,
            siteId: migration.site_id ?? input.siteId,
            migrationId: migration.id,
            proposalPlanId: plan.id,
            proposalPlanVersion: plan.plan_version,
            proposalPlanSemanticWatermark: requiredText("proposal semantic watermark", plan.semantic_watermark),
            proposalApprovalRequestId: proposalApproval.approvalRequestId,
            proposalApprovalDecisionId: proposalApproval.approvalDecisionId,
            proposalEvidencePackageId: proposalApproval.evidencePackageId,
            implementationAuthorizationRequestId: auth.requestId,
            implementationAuthorizationDecisionId: auth.decisionId,
            implementationAuthorizationEvidencePackageId: auth.evidencePackageId,
            cloneReviewId: plan.clone_review_id,
            cloneSiteVersionRef: plan.clone_site_version_ref,
            cloneRuntimeArtifactRef: plan.runtime_artifact_ref,
            sourceEvidenceReviewId: plan.source_evidence_review_id,
            selectedRecommendationRefsJson: input.selectedRecommendationRefs,
            limitationsJson: [...jsonArray(plan.limitations_json), ...jsonArray(proposalApproval.limitations), ...auth.limitations],
            executionMode: input.executionMode ?? "dry_run",
            executorId: input.executorId,
            executorName: input.executorName,
            executorVersion: input.executorVersion,
            status: "draft",
            readinessJson: {
              proposalApproved: true,
              implementationAuthorizationAttached: true,
              selectedRecommendationCount: selected.length,
              executionTimeValidationRequired: true,
              runtimeMutationAllowed: false,
            },
            semanticInputWatermark,
            actor: input.actor,
            correlationId: input.correlationId,
            causationId: input.causationId,
            idempotencyKey: input.idempotencyKey,
            requestId: input.requestId,
            privacyLabel: input.privacyLabel,
            retentionClass: input.retentionClass,
            payloadHash: input.payloadHash,
            metadataJson: {
              ...input.metadataJson,
              nonApprovalBoundary: IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY,
              mutationBoundary: IMPROVEMENT_EXECUTION_NO_RUNTIME_MUTATION_BOUNDARY,
            },
            supersedesAttemptId: input.supersedesAttemptId,
          });

      const event = await this.insertEventIfNeeded(tx, {
        attemptId: created.row.id,
        migrationId: migration.id,
        eventAction: "created",
        fromStatus: null,
        toStatus: created.row.status,
        actor: input.actor,
        detailsJson: {
          proposalPlanId: plan.id,
          implementationAuthorizationDecisionId: auth.decisionId,
          selectedRecommendationCount: selected.length,
          executionTimeValidationRequired: true,
          noRuntimeMutation: true,
        },
        limitationsJson: jsonArray(created.row.limitations_json),
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:created`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      await this.recordBootstrapRefs(tx, created.row, plan, proposalApproval, auth, input);
      await this.attachSelectedRecommendationsInTx(tx, created.row, input.selectedRecommendationRefs, input);
      return { attempt: created.row, eventId: event.id, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async attachProposalRefs(input: Omit<RecordImprovementExecutionRefInput, "refRole"> & { refRole?: Extract<SingleSiteImprovementExecutionRefRole, "proposal_plan" | "proposal_approval_request" | "proposal_approval_decision" | "proposal_evidence_package"> }) {
    return this.recordRef({ ...input, refRole: input.refRole ?? "proposal_plan" });
  }

  async attachImplementationAuthorizationRefs(input: Omit<RecordImprovementExecutionRefInput, "refRole"> & { refRole?: Extract<SingleSiteImprovementExecutionRefRole, "implementation_authorization_request" | "implementation_authorization_decision" | "implementation_authorization_evidence_package"> }) {
    return this.recordRef({ ...input, refRole: input.refRole ?? "implementation_authorization_decision" });
  }

  async attachAafExecutionValidationResult(input: AttachExecutionValidationInput): Promise<ImprovementExecutionOperationResult & { refId?: string }> {
    return this.repository.withTransaction(async (tx) => {
      const attempt = await this.requiredMutableAttempt(tx, input.attemptId);
      const summary = validationSummary(input.validation);
      const updated = await this.repository.updateImprovementExecutionAttemptStatus(tx, {
        attemptId: attempt.id,
        status: attempt.status,
        validationSummaryJson: summary,
        aafValidationResultRef: input.validationResultRef ?? input.validation.matchedAafRequestDecisionRefs.approvalDecisionId,
        aafValidationEvidenceRef: input.validationEvidenceRef ?? input.validation.matchedAafRequestDecisionRefs.evidencePackageId,
        limitationsJson: [...jsonArray(attempt.limitations_json), ...jsonArray(input.validation.limitations)],
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:attempt:validation`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const ref = input.validationResultRef
        ? await this.repository.insertImprovementExecutionRef(tx, {
            attemptId: attempt.id,
            migrationId: attempt.migration_id,
            refRole: "aaf_execution_validation_result",
            refType: "mvp20_execution_time_aaf_validation",
            sourceRecordId: input.validationResultRef,
            sourceWatermark: input.validation.freshnessResult.expectedSemanticWatermark,
            semanticWatermark: input.validation.freshnessResult.expectedSemanticWatermark,
            correlationId: input.correlationId,
            causationId: input.causationId,
            idempotencyKey: `${input.idempotencyKey}:ref:validation`,
            requestId: input.requestId,
            privacyLabel: input.privacyLabel,
            retentionClass: input.retentionClass,
            metadataJson: { ...input.metadataJson, nonExecuting: true },
          })
        : null;
      const event = await this.insertEventIfNeeded(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        eventAction: "aaf_execution_validation_attached",
        fromStatus: attempt.status,
        toStatus: attempt.status,
        actor: input.actor,
        detailsJson: { validationAllowed: input.validation.allowed, reasonCode: input.validation.reasonCode },
        limitationsJson: input.validation.limitations,
        validationSummaryJson: summary,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:validation`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { attempt: updated, refId: ref?.row.id, eventId: event.id, reusedExisting: event.reusedExisting || Boolean(ref?.reusedExisting) };
    });
  }

  async attachCloneSourceRefs(input: Omit<RecordImprovementExecutionRefInput, "refRole"> & { refRole?: Extract<SingleSiteImprovementExecutionRefRole, "clone_review" | "clone_site_version" | "clone_runtime_artifact" | "source_evidence_review"> }) {
    return this.recordRef({ ...input, refRole: input.refRole ?? "clone_review" });
  }

  async attachSelectedRecommendationRefs(input: ImprovementExecutionEnvelope & { attemptId: string; refs: ImplementationAuthorizationSelectedRecommendationRef[] }): Promise<ImprovementExecutionOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const attempt = await this.requiredMutableAttempt(tx, input.attemptId);
      await this.attachSelectedRecommendationsInTx(tx, attempt, input.refs, input);
      const updated = await this.repository.updateImprovementExecutionAttemptStatus(tx, {
        attemptId: attempt.id,
        status: attempt.status,
        selectedRecommendationRefsJson: input.refs,
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:attempt:selected-recommendations`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      const event = await this.insertEventIfNeeded(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        eventAction: "selected_recommendation_attached",
        fromStatus: attempt.status,
        toStatus: attempt.status,
        actor: input.actor,
        detailsJson: { selectedRecommendationCount: input.refs.length },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:selected-recommendations`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      return { attempt: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  async attachLimitations(input: ImprovementExecutionEnvelope & { attemptId: string; limitationsJson: unknown[] }): Promise<ImprovementExecutionOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const attempt = await this.requiredMutableAttempt(tx, input.attemptId);
      if (jsonArray(input.limitationsJson).length === 0) throw new SingleSiteTransitionError("limitations are required");
      const limitations = [...jsonArray(attempt.limitations_json), ...jsonArray(input.limitationsJson)];
      const updated = await this.repository.updateImprovementExecutionAttemptStatus(tx, {
        attemptId: attempt.id,
        status: attempt.status,
        limitationsJson: limitations,
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:attempt:limitations`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      for (const [index, limitation] of jsonArray(input.limitationsJson).entries()) {
        await this.repository.upsertImprovementExecutionItem(tx, {
          attemptId: attempt.id,
          migrationId: attempt.migration_id,
          itemType: "limitation",
          itemKey: `limitation-${jsonArray(attempt.limitations_json).length + index + 1}`,
          limitationJson: jsonObject(limitation),
          actor: input.actor,
          correlationId: input.correlationId,
          idempotencyKey: `${input.idempotencyKey}:item:limitation:${index + 1}`,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
        });
      }
      const event = await this.insertEventIfNeeded(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        eventAction: "limitation_attached",
        fromStatus: attempt.status,
        toStatus: attempt.status,
        actor: input.actor,
        detailsJson: { limitationCount: jsonArray(input.limitationsJson).length },
        limitationsJson: input.limitationsJson,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:limitations`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      return { attempt: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  async markBlocked(input: ImprovementExecutionTransitionInput): Promise<ImprovementExecutionOperationResult> {
    return this.moveStatus(input, "blocked", { failureJson: input.detailsJson });
  }

  async markReady(input: AttachExecutionValidationInput): Promise<ImprovementExecutionOperationResult> {
    if (!input.validation.allowed) throw new SingleSiteTransitionError(`execution-time AAF validation blocked: ${input.validation.reasonCode}`);
    const attached = await this.attachAafExecutionValidationResult(input);
    return this.moveStatus(
      {
        ...input,
        detailsJson: { validationAllowed: true, validationMode: input.validation.mode },
        idempotencyKey: `${input.idempotencyKey}:ready`,
      },
      "ready",
      {
        readinessJson: {
          proposalApproved: true,
          implementationAuthorizationAttached: true,
          executionTimeValidationAllowed: true,
          runtimeMutationAllowed: false,
        },
        validationSummaryJson: validationSummary(input.validation),
      },
      attached.attempt,
    );
  }

  async markStarted(input: ImprovementExecutionTransitionInput): Promise<ImprovementExecutionOperationResult> {
    return this.moveStatus(input, "started", { startedAt: new Date().toISOString() });
  }

  async markCompleted(input: CompleteImprovementExecutionInput): Promise<ImprovementExecutionOperationResult> {
    this.assertCompletionBoundary(input);
    return this.moveStatus(input, "completed", {
      semanticOutputWatermark: input.semanticOutputWatermark,
      improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef,
      improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef,
      outputRefsJson: input.outputRefsJson ?? (input.futureBoundaryFixture ? { futureBoundaryFixture: true } : undefined),
      completedAt: new Date().toISOString(),
      terminalAt: new Date().toISOString(),
      metadataJson: { ...input.metadataJson, futureBoundaryFixture: Boolean(input.futureBoundaryFixture), runtimeMutationPerformed: false },
    });
  }

  async markCompletedWithLimitations(input: CompleteImprovementExecutionInput): Promise<ImprovementExecutionOperationResult> {
    this.assertCompletionBoundary(input);
    if (jsonArray(input.limitationsJson).length === 0) throw new SingleSiteTransitionError("completed_with_limitations requires limitations");
    return this.moveStatus(input, "completed_with_limitations", {
      semanticOutputWatermark: input.semanticOutputWatermark,
      improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef,
      improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef,
      outputRefsJson: input.outputRefsJson ?? (input.futureBoundaryFixture ? { futureBoundaryFixture: true } : undefined),
      completedAt: new Date().toISOString(),
      terminalAt: new Date().toISOString(),
      metadataJson: { ...input.metadataJson, futureBoundaryFixture: Boolean(input.futureBoundaryFixture), runtimeMutationPerformed: false },
    });
  }

  async markFailed(input: ImprovementExecutionTransitionInput): Promise<ImprovementExecutionOperationResult> {
    return this.moveStatus(input, "failed", { failureJson: input.detailsJson, terminalAt: new Date().toISOString() });
  }

  async markRetryRequired(input: ImprovementExecutionTransitionInput): Promise<ImprovementExecutionOperationResult> {
    return this.moveStatus(input, "retry_required", { failureJson: input.detailsJson });
  }

  async cancel(input: ImprovementExecutionTransitionInput): Promise<ImprovementExecutionOperationResult> {
    requiredText("reason", input.reason);
    return this.moveStatus(input, "cancelled", { terminalAt: new Date().toISOString() });
  }

  async supersede(input: ImprovementExecutionTransitionInput & { replacementAttemptId?: string | null }): Promise<ImprovementExecutionOperationResult> {
    if (!input.replacementAttemptId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement attempt ref or reason");
    return this.moveStatus(input, "superseded", { supersededByAttemptId: input.replacementAttemptId, terminalAt: new Date().toISOString() });
  }

  async readLatestExecutionAttemptForMigration(migrationId: string): Promise<SingleSiteImprovementExecutionAttemptRow | null> {
    return this.repository.withTransaction((tx) => this.repository.getLatestImprovementExecutionAttemptForMigration(tx, requiredText("migrationId", migrationId)));
  }

  async recordRef(input: RecordImprovementExecutionRefInput): Promise<{ ref: SingleSiteImprovementExecutionRefRow; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const attempt = await this.requiredMutableAttempt(tx, input.attemptId);
      if (attempt.migration_id !== requiredText("migrationId", input.migrationId)) throw new SingleSiteTransitionError("execution ref migrationId mismatch");
      const ref = await this.repository.insertImprovementExecutionRef(tx, input);
      return { ref: ref.row, reusedExisting: ref.reusedExisting };
    });
  }

  private async moveStatus(
    input: ImprovementExecutionTransitionInput,
    status: SingleSiteImprovementExecutionStatus,
    patch: Partial<Parameters<SingleSiteStateWriterRepository["updateImprovementExecutionAttemptStatus"]>[1]> = {},
    knownAttempt?: SingleSiteImprovementExecutionAttemptRow,
  ): Promise<ImprovementExecutionOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const attempt = knownAttempt ?? (await this.requiredMutableAttempt(tx, input.attemptId));
      const eventKey = `${input.idempotencyKey}:event:${eventActionForStatus(status)}`;
      const existingEvent = await this.repository.getImprovementExecutionEventByIdempotencyKey(tx, eventKey);
      if (existingEvent) {
        if (existingEvent.attempt_id !== attempt.id || existingEvent.to_status !== status) {
          throw new SingleSiteTransitionError(`execution transition idempotency key ${eventKey} belongs to a different transition`);
        }
        assertEventSemanticMatch(existingEvent, {
          attemptId: attempt.id,
          migrationId: attempt.migration_id,
          eventAction: eventActionForStatus(status),
          fromStatus: existingEvent.from_status,
          toStatus: status,
          actor: input.actor,
          detailsJson: input.detailsJson ?? { reason: input.reason ?? null },
          limitationsJson: input.limitationsJson,
          warningsJson: input.warningsJson,
          validationSummaryJson: patch.validationSummaryJson,
          outputRefsJson: patch.outputRefsJson,
          failureJson: patch.failureJson,
          correlationId: input.correlationId,
          causationId: input.causationId,
          idempotencyKey: eventKey,
          requestId: input.requestId,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
          metadataJson: patch.metadataJson ?? input.metadataJson,
        });
        const current = await this.repository.getImprovementExecutionAttemptById(tx, attempt.id);
        return { attempt: current ?? attempt, eventId: existingEvent.id, reusedExisting: true };
      }
      await this.assertTransitionAllowed(tx, attempt, status);
      const updated = await this.repository.updateImprovementExecutionAttemptStatus(tx, {
        attemptId: attempt.id,
        status,
        readinessJson: patch.readinessJson,
        validationSummaryJson: patch.validationSummaryJson,
        limitationsJson: input.limitationsJson,
        semanticOutputWatermark: patch.semanticOutputWatermark,
        improvedCandidateSiteVersionRef: patch.improvedCandidateSiteVersionRef,
        improvedRuntimeArtifactRef: patch.improvedRuntimeArtifactRef,
        outputRefsJson: patch.outputRefsJson,
        failureJson: patch.failureJson,
        auditRefsJson: patch.auditRefsJson,
        supersededByAttemptId: patch.supersededByAttemptId,
        actor: input.actor,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt,
        terminalAt: patch.terminalAt,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: patch.metadataJson ?? input.metadataJson,
      });
      const event = await this.insertEventIfNeeded(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        eventAction: eventActionForStatus(status),
        fromStatus: attempt.status,
        toStatus: status,
        actor: input.actor,
        detailsJson: input.detailsJson ?? { reason: input.reason ?? null },
        limitationsJson: input.limitationsJson,
        warningsJson: input.warningsJson,
        validationSummaryJson: patch.validationSummaryJson,
        outputRefsJson: patch.outputRefsJson,
        failureJson: patch.failureJson,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: eventKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: patch.metadataJson ?? input.metadataJson,
      });
      const stateEventId = await this.recordCoarseStateIfNeeded(tx, updated, status, input);
      return { attempt: updated, eventId: event.id, stateEventId, reusedExisting: event.reusedExisting };
    });
  }

  private async requiredNonTerminalMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot change improvement execution`);
    return migration;
  }

  private assertMigrationIdentity(migration: SingleSiteMigrationRow, clientId: string, siteId: string): void {
    if (migration.client_id !== requiredText("clientId", clientId)) throw new SingleSiteTransitionError("clientId does not match migration");
    if ((migration.site_id ?? "") !== requiredText("siteId", siteId)) throw new SingleSiteTransitionError("siteId does not match migration");
  }

  private async requiredApprovedProposal(tx: SingleSiteStateWriterTx, planId: string, migrationId: string): Promise<SingleSiteImprovementProposalPlanRow> {
    const plan = await this.repository.getImprovementProposalPlanById(tx, requiredText("proposalPlanId", planId));
    if (!plan || plan.migration_id !== migrationId) throw new SingleSiteTransitionError("approved proposal plan for this migration is required");
    if (!["approved", "approved_with_limitations"].includes(plan.plan_status)) throw new SingleSiteTransitionError("improvement execution requires an approved proposal plan");
    if (!plan.implementation_authorization_attached) throw new SingleSiteTransitionError("improvement execution requires implementation authorization ref");
    if (!plan.semantic_watermark) throw new SingleSiteTransitionError("proposal semantic watermark is required");
    return plan;
  }

  private async requiredSelectedRecommendations(
    tx: SingleSiteStateWriterTx,
    plan: SingleSiteImprovementProposalPlanRow,
    refs: ImplementationAuthorizationSelectedRecommendationRef[],
  ): Promise<SingleSiteImprovementProposalRecommendationRow[]> {
    if (!Array.isArray(refs) || refs.length === 0) throw new SingleSiteTransitionError("selected recommendations are required");
    const recommendations = await this.repository.listImprovementProposalRecommendations(tx, plan.id);
    const ids = new Set(recommendations.map((recommendation) => recommendation.id));
    for (const ref of refs) {
      if (!ids.has(ref.recommendationId)) throw new SingleSiteTransitionError(`selected recommendation ${ref.recommendationId} does not belong to proposal plan`);
      requiredText("selected recommendation source watermark", ref.sourceWatermark);
    }
    return recommendations.filter((recommendation) => refs.some((ref) => ref.recommendationId === recommendation.id));
  }

  private async requiredMutableAttempt(tx: SingleSiteStateWriterTx, attemptId: string): Promise<SingleSiteImprovementExecutionAttemptRow> {
    const attempt = await this.repository.getImprovementExecutionAttemptById(tx, requiredText("attemptId", attemptId));
    if (!attempt) throw new SingleSiteTransitionError(`execution attempt ${attemptId} was not found`);
    await this.requiredNonTerminalMigration(tx, attempt.migration_id);
    if (TERMINAL_ATTEMPT_STATUSES.includes(attempt.status)) throw new SingleSiteTransitionError(`terminal execution attempt status ${attempt.status} cannot change`);
    return attempt;
  }

  private async assertTransitionAllowed(tx: SingleSiteStateWriterTx, attempt: SingleSiteImprovementExecutionAttemptRow, status: SingleSiteImprovementExecutionStatus): Promise<void> {
    if (attempt.status === status) throw new SingleSiteTransitionError(`execution attempt is already ${status}`);
    if (status === "ready") {
      const validation = jsonObject(attempt.validation_summary_json);
      if (!validationAllowsStart(validation)) throw new SingleSiteTransitionError("ready execution requires successful execution-time AAF validation");
    }
    if (status === "started") {
      if (attempt.status !== "ready") throw new SingleSiteTransitionError("execution start requires ready attempt");
      const validation = jsonObject(attempt.validation_summary_json);
      if (!validationAllowsStart(validation)) throw new SingleSiteTransitionError("execution start requires successful execution-time AAF validation");
      if (jsonArray(attempt.selected_recommendation_refs_json).length === 0) throw new SingleSiteTransitionError("execution start requires selected recommendations");
      if (!attempt.semantic_input_watermark) throw new SingleSiteTransitionError("execution start requires implementation scope watermark");
    }
    if (["completed", "completed_with_limitations", "failed"].includes(status) && attempt.status !== "started") {
      throw new SingleSiteTransitionError(`${status} requires started attempt`);
    }
    if (status === "retry_required" && !["failed", "blocked", "started"].includes(attempt.status)) {
      throw new SingleSiteTransitionError("retry_required requires failed, blocked, or started attempt");
    }
    if (status === "blocked" && attempt.status === "started") {
      throw new SingleSiteTransitionError("started attempt should fail or require retry instead of returning to blocked");
    }
    if (status === "ready") {
      const items = await this.repository.listImprovementExecutionItems(tx, attempt.id);
      if (!items.some((item) => item.item_type === "selected_recommendation")) throw new SingleSiteTransitionError("ready execution requires selected recommendation items");
    }
  }

  private assertCompletionBoundary(input: CompleteImprovementExecutionInput): void {
    if (!completionHasOutput(input) && !input.futureBoundaryFixture) {
      throw new SingleSiteTransitionError("completion requires output refs or an explicit future-boundary fixture");
    }
  }

  private async recordBootstrapRefs(
    tx: SingleSiteStateWriterTx,
    attempt: SingleSiteImprovementExecutionAttemptRow,
    plan: SingleSiteImprovementProposalPlanRow,
    proposalApproval: ImplementationAuthorizationProposalApprovalRef,
    auth: { requestId: string; decisionId: string; evidencePackageId: string | null },
    input: CreateOrReuseImprovementExecutionAttemptInput,
  ): Promise<void> {
    const refs: Array<[SingleSiteImprovementExecutionRefRole, string, string, string | null]> = [
      ["proposal_plan", "proposal_plan", plan.id, plan.semantic_watermark],
      ["proposal_approval_request", "aaf_approval_request", proposalApproval.approvalRequestId, proposalApproval.sourceWatermark],
      ["proposal_approval_decision", "aaf_approval_decision", proposalApproval.approvalDecisionId, proposalApproval.sourceWatermark],
      ["proposal_evidence_package", "aaf_evidence_package", proposalApproval.evidencePackageId, proposalApproval.sourceWatermark],
      ["implementation_authorization_request", "aaf_approval_request", auth.requestId, attempt.semantic_input_watermark],
      ["implementation_authorization_decision", "aaf_approval_decision", auth.decisionId, attempt.semantic_input_watermark],
      ["clone_review", "clone_review", plan.clone_review_id, plan.semantic_watermark],
      ["clone_site_version", "runtime_site_version_clone", plan.clone_site_version_ref, plan.semantic_watermark],
      ["clone_runtime_artifact", "runtime_artifact_clone", plan.runtime_artifact_ref, plan.semantic_watermark],
      ["source_evidence_review", "source_evidence_review", plan.source_evidence_review_id, plan.semantic_watermark],
    ];
    if (auth.evidencePackageId) refs.push(["implementation_authorization_evidence_package", "aaf_evidence_package", auth.evidencePackageId, attempt.semantic_input_watermark]);
    for (const [index, [refRole, refType, sourceRecordId, sourceWatermark]] of refs.entries()) {
      await this.repository.insertImprovementExecutionRef(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        refRole,
        refType,
        sourceRecordId,
        sourceWatermark,
        semanticWatermark: attempt.semantic_input_watermark,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:ref:bootstrap:${index + 1}`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: { ...input.metadataJson, evidenceOnly: true },
      });
    }
  }

  private async attachSelectedRecommendationsInTx(
    tx: SingleSiteStateWriterTx,
    attempt: SingleSiteImprovementExecutionAttemptRow,
    refs: ImplementationAuthorizationSelectedRecommendationRef[],
    input: Pick<ImprovementExecutionEnvelope, "actor" | "correlationId" | "causationId" | "idempotencyKey" | "requestId" | "privacyLabel" | "retentionClass" | "metadataJson">,
  ): Promise<void> {
    if (refs.length === 0) throw new SingleSiteTransitionError("selected recommendations are required");
    for (const [index, ref] of refs.entries()) {
      const itemKey = ref.recommendationKey ?? ref.recommendationId;
      await this.repository.insertImprovementExecutionRef(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        refRole: "selected_recommendation",
        refType: "proposal_recommendation",
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        sourceVersion: ref.sourceVersion,
        sourceWatermark: ref.sourceWatermark,
        semanticWatermark: attempt.semantic_input_watermark,
        contentHash: ref.contentHash,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:ref:selected-recommendation:${index + 1}`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: { ...input.metadataJson, recommendationId: ref.recommendationId, recommendationKey: ref.recommendationKey ?? null },
      });
      await this.repository.upsertImprovementExecutionItem(tx, {
        attemptId: attempt.id,
        migrationId: attempt.migration_id,
        itemType: "selected_recommendation",
        itemKey,
        recommendationId: ref.recommendationId,
        detailsJson: { recommendationKey: ref.recommendationKey ?? null, sourceRecordId: ref.sourceRecordId },
        refsJson: [ref],
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:item:selected-recommendation:${index + 1}`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        semanticWatermark: attempt.semantic_input_watermark,
        metadataJson: input.metadataJson,
      });
    }
  }

  private async insertEventIfNeeded(tx: SingleSiteStateWriterTx, input: ExecutionEventWithoutIndex): Promise<SingleSiteImprovementExecutionEventRow & { reusedExisting: boolean }> {
    const existing = await this.repository.getImprovementExecutionEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      assertEventSemanticMatch(existing, input);
      return { ...existing, reusedExisting: true };
    }
    const eventIndex = await this.repository.nextImprovementExecutionEventIndex(tx, input.attemptId);
    const event = await this.repository.insertImprovementExecutionEvent(tx, { ...input, eventIndex });
    return { ...event.row, reusedExisting: event.reusedExisting };
  }

  private async recordCoarseStateIfNeeded(
    tx: SingleSiteStateWriterTx,
    attempt: SingleSiteImprovementExecutionAttemptRow,
    status: SingleSiteImprovementExecutionStatus,
    input: ImprovementExecutionTransitionInput,
  ): Promise<string | undefined> {
    const migration = await this.repository.getMigrationById(tx, attempt.migration_id);
    if (!migration) return undefined;
    const toState = this.coarseStateForExecutionStatus(status, migration.current_state);
    if (!toState || migration.current_state === toState) return undefined;
    const event = await this.repository.insertStateEvent(tx, {
      migrationId: attempt.migration_id,
      eventIndex: await this.repository.nextStateEventIndex(tx, attempt.migration_id),
      fromState: migration.current_state,
      toState,
      transitionKey: `improvement_execution.${status}`,
      transitionReason: input.reason ?? `Improvement execution attempt ${status}`,
      requiredRefsJson: {
        executionAttemptId: attempt.id,
        executionTimeAafValidationRequired: true,
        runtimeMutationPerformed: false,
      },
      beforeRefJson: { executionStatus: attempt.status },
      afterRefJson: { executionStatus: status, nonApprovalBoundary: IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY },
      actor: input.actor,
      aafApprovalRequestId: attempt.implementation_authorization_request_id,
      aafApprovalDecisionId: attempt.implementation_authorization_decision_id,
      sourceWatermark: attempt.semantic_input_watermark,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state:${toState}`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: { noRuntimeMutation: true, noApprovalGranted: true },
    });
    await this.repository.insertMigrationRef(tx, {
      migrationId: attempt.migration_id,
      stateEventId: event.row.id,
      refRole: "implementation_execution_attempt",
      refType: "single_site_improvement_execution_attempt",
      sourceTable: "gnr8_single_site_improvement_execution_attempts",
      sourceRecordId: attempt.id,
      sourceWatermark: attempt.semantic_input_watermark,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state-ref:execution-attempt`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: { runtimeMutationPerformed: false },
    });
    await this.repository.updateMigrationCurrentState(tx, {
      migrationId: attempt.migration_id,
      toState,
      latestStateEventId: event.row.id,
    });
    return event.row.id;
  }

  private coarseStateForExecutionStatus(status: SingleSiteImprovementExecutionStatus, currentState: SingleSiteMigrationState): SingleSiteMigrationState | null {
    if (status === "started" && currentState === "improvement_proposal_approved") return "improvement_implementation_started";
    if ((status === "completed" || status === "completed_with_limitations") && currentState === "improvement_implementation_started") return "improvement_implementation_completed";
    return null;
  }
}
