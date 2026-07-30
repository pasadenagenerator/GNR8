import "server-only";

import {
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  isSingleSiteTerminalState,
  type SingleSiteImprovementCategory,
  type SingleSiteImprovementEffortLevel,
  type SingleSiteImprovementImpactLevel,
  type SingleSiteImprovementProposalEventAction,
  type SingleSiteImprovementProposalPlanStatus,
  type SingleSiteImprovementProposalRefRole,
  type SingleSiteImprovementRiskLevel,
  type SingleSiteJsonObject,
  type SingleSiteMigrationState,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type InsertImprovementProposalEventInput,
  type SingleSiteActorInput,
  type SingleSiteCloneReviewRefRow,
  type SingleSiteCloneReviewRow,
  type SingleSiteImprovementProposalEventRow,
  type SingleSiteImprovementProposalFindingRow,
  type SingleSiteImprovementProposalPlanRow,
  type SingleSiteImprovementProposalRecommendationRow,
  type SingleSiteMigrationRow,
  type SingleSiteStateEventRow,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

type ProposalEventWithoutIndex = Omit<InsertImprovementProposalEventInput, "eventIndex">;

export type ImprovementProposalPlanningEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type CreateOrReuseImprovementProposalPlanInput = ImprovementProposalPlanningEnvelope & {
  migrationId: string;
  clientId: string;
  siteId: string;
  cloneReviewId?: string | null;
  cloneSiteVersionRef: string;
  runtimeArtifactRef: string;
  sourceEvidenceReviewId?: string | null;
  title?: string | null;
  summary?: string | null;
  proposalScopeJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  operatorNotesJson?: unknown[];
  semanticWatermark?: string | null;
  payloadHash?: string | null;
  supersedesPlanId?: string | null;
};

export type RecordImprovementProposalRefInput = ImprovementProposalPlanningEnvelope & {
  planId: string;
  migrationId: string;
  refRole: SingleSiteImprovementProposalRefRole;
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

export type AddImprovementProposalRecommendationInput = ImprovementProposalPlanningEnvelope & {
  planId: string;
  migrationId: string;
  recommendationKey: string;
  title: string;
  targetScope?: string | null;
  targetRefsJson?: unknown[];
  category: SingleSiteImprovementCategory;
  risk?: SingleSiteImprovementRiskLevel | null;
  impact?: SingleSiteImprovementImpactLevel | null;
  effort?: SingleSiteImprovementEffortLevel | null;
  confidence?: "low" | "medium" | "high" | null;
  priority?: "p0" | "p1" | "p2" | "p3" | null;
  rationale: string;
  expectedOutcome?: string | null;
  implementationNotes?: string | null;
  exclusionsJson?: unknown[];
  limitationsJson?: unknown[];
  linkedFindingIdsJson?: unknown[];
  sourceRefIdsJson?: unknown[];
  advisoryRefIdsJson?: unknown[];
  blocksProposalApproval?: boolean | null;
  limitationAccepted?: boolean | null;
  decisionJson?: SingleSiteJsonObject;
  semanticWatermark?: string | null;
};

export type AddImprovementProposalFindingInput = ImprovementProposalPlanningEnvelope & {
  planId: string;
  migrationId: string;
  findingKey: string;
  category: SingleSiteImprovementCategory;
  risk?: SingleSiteImprovementRiskLevel | null;
  impact?: SingleSiteImprovementImpactLevel | null;
  summary: string;
  evidenceConfidence?: "low" | "medium" | "high" | null;
  findingStatus?: "open" | "resolved_by_recommendation" | "accepted_limitation" | "deferred" | "superseded" | null;
  blocksProposalApproval?: boolean | null;
  acceptedLimitation?: boolean | null;
  sourceRefIdsJson?: unknown[];
  cloneFidelityRefIdsJson?: unknown[];
  recommendationIdsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  decisionJson?: SingleSiteJsonObject;
  semanticWatermark?: string | null;
};

export type ImprovementProposalDecisionInput = ImprovementProposalPlanningEnvelope & {
  planId: string;
  summary?: string | null;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  decisionSummaryJson?: SingleSiteJsonObject;
  approvalRefsJson?: SingleSiteJsonObject;
  reason?: string | null;
  replacementPlanId?: string | null;
};

export type AttachImplementationAuthorizationRefInput = ImprovementProposalPlanningEnvelope & {
  planId: string;
  refRole?: Extract<SingleSiteImprovementProposalRefRole, "implementation_authorization_request" | "implementation_authorization_decision"> | null;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  semanticWatermark?: string | null;
  contentHash?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
  authorizationRefsJson?: SingleSiteJsonObject;
};

export type ImprovementProposalPlanningOperationResult = {
  plan: SingleSiteImprovementProposalPlanRow;
  eventId?: string;
  stateEventId?: string;
  reusedExisting: boolean;
};

function requiredText(field: string, value: unknown): string {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    throw new SingleSiteTransitionError(`${field} is required`);
  }
  return String(value).trim();
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

function assertEventSemanticMatch(event: SingleSiteImprovementProposalEventRow, input: ProposalEventWithoutIndex): void {
  const attempted: Record<string, unknown> = {
    plan_id: input.planId,
    migration_id: input.migrationId,
    event_action: input.eventAction,
    to_status: input.toStatus ?? null,
    actor_type: input.actor.actorType,
    actor_id: input.actor.actorId,
    actor_role: input.actor.actorRole,
    details_json: input.detailsJson ?? {},
    limitations_json: input.limitationsJson ?? [],
    warnings_json: input.warningsJson ?? [],
    approval_refs_json: input.approvalRefsJson ?? {},
    implementation_authorization_refs_json: input.implementationAuthorizationRefsJson ?? {},
    source_watermark: input.sourceWatermark ?? null,
    semantic_watermark: input.semanticWatermark ?? null,
    payload_hash: input.payloadHash ?? null,
    privacy_label: input.privacyLabel ?? "client_confidential",
    retention_class: input.retentionClass ?? "compliance_long",
    metadata_json: input.metadataJson ?? {},
  };
  const existing = event as unknown as Record<string, unknown>;
  const drifted = Object.keys(attempted).filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError("gnr8_single_site_improvement_proposal_events", input.idempotencyKey, drifted);
}

function terminalPlanStatus(status: SingleSiteImprovementProposalPlanStatus): boolean {
  return ["approved", "approved_with_limitations", "rejected", "superseded", "cancelled"].includes(status);
}

function proposalStateForStatus(status: SingleSiteImprovementProposalPlanStatus): SingleSiteMigrationState | null {
  if (status === "draft" || status === "changes_requested" || status === "planning_required") return "improvement_proposal_started";
  if (status === "ready_for_review" || status === "in_review") return "improvement_proposal_ready";
  if (status === "approved" || status === "approved_with_limitations") return "improvement_proposal_approved";
  if (status === "rejected") return "improvement_proposal_rejected";
  return null;
}

function eventActionForStatus(status: SingleSiteImprovementProposalPlanStatus): SingleSiteImprovementProposalEventAction {
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "in_review") return "review_started";
  if (status === "changes_requested") return "changes_requested";
  if (status === "approved") return "approved";
  if (status === "approved_with_limitations") return "approved_with_limitations";
  if (status === "rejected") return "rejected";
  if (status === "superseded") return "superseded";
  if (status === "cancelled") return "cancelled";
  return "created";
}

function hasRequiredCloneRefs(refs: readonly SingleSiteCloneReviewRefRow[]): boolean {
  const roles = new Set(refs.map((ref) => ref.ref_role));
  return roles.has("runtime_site_version_clone") && roles.has("runtime_artifact_clone") && roles.has("source_evidence_review");
}

function hasDecisionOrLimitations(input: ImprovementProposalDecisionInput): boolean {
  return jsonArray(input.limitationsJson).length > 0 || Object.keys(jsonObject(input.decisionSummaryJson)).length > 0 || Object.keys(jsonObject(input.detailsJson)).length > 0;
}

export class ImprovementProposalPlanningService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createOrReuseProposalPlan(input: CreateOrReuseImprovementProposalPlanInput): Promise<ImprovementProposalPlanningOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const migration = await this.requiredNonTerminalMigration(tx, input.migrationId);
      this.assertMigrationIdentity(migration, input.clientId, input.siteId);
      const cloneReview = await this.requiredAcceptedCloneReview(tx, migration.id, input.cloneReviewId);
      if (cloneReview.clone_site_version_ref !== requiredText("cloneSiteVersionRef", input.cloneSiteVersionRef)) {
        throw new SingleSiteTransitionError("cloneSiteVersionRef does not match latest accepted clone review");
      }
      if (cloneReview.runtime_artifact_ref !== requiredText("runtimeArtifactRef", input.runtimeArtifactRef)) {
        throw new SingleSiteTransitionError("runtimeArtifactRef does not match latest accepted clone review");
      }
      if (input.sourceEvidenceReviewId && cloneReview.source_evidence_review_id !== input.sourceEvidenceReviewId) {
        throw new SingleSiteTransitionError("sourceEvidenceReviewId does not match latest accepted clone review");
      }

      const carriedLimitations = [...jsonArray(cloneReview.limitations_json), ...jsonArray(input.limitationsJson)];
      const existing = await this.repository.getImprovementProposalPlanBySemanticRefs(tx, {
        migrationId: migration.id,
        cloneReviewId: cloneReview.id,
        cloneSiteVersionRef: cloneReview.clone_site_version_ref,
        runtimeArtifactRef: cloneReview.runtime_artifact_ref,
      });
      const created = existing
        ? { row: existing, reusedExisting: true }
        : await this.repository.createImprovementProposalPlan(tx, {
            tenantId: migration.tenant_id,
            clientId: migration.client_id,
            siteId: migration.site_id ?? input.siteId,
            migrationId: migration.id,
            cloneReviewId: cloneReview.id,
            sourceEvidenceReviewId: cloneReview.source_evidence_review_id,
            cloneSiteVersionRef: cloneReview.clone_site_version_ref,
            runtimeArtifactRef: cloneReview.runtime_artifact_ref,
            planStatus: "draft",
            title: input.title,
            summary: input.summary,
            proposalScopeJson: input.proposalScopeJson,
            limitationsJson: carriedLimitations,
            warningsJson: input.warningsJson,
            operatorNotesJson: input.operatorNotesJson,
            supersedesPlanId: input.supersedesPlanId,
            actor: input.actor,
            correlationId: input.correlationId,
            causationId: input.causationId,
            idempotencyKey: input.idempotencyKey,
            requestId: input.requestId,
            privacyLabel: input.privacyLabel,
            retentionClass: input.retentionClass,
            semanticWatermark: input.semanticWatermark,
            payloadHash: input.payloadHash,
            metadataJson: input.metadataJson,
          });

      const event = await this.insertEventIfNeeded(tx, {
        planId: created.row.id,
        migrationId: migration.id,
        eventAction: "created",
        fromStatus: null,
        toStatus: created.row.plan_status,
        actor: input.actor,
        detailsJson: {
          cloneReviewId: cloneReview.id,
          cloneSiteVersionRef: cloneReview.clone_site_version_ref,
          runtimeArtifactRef: cloneReview.runtime_artifact_ref,
          sourceEvidenceReviewId: cloneReview.source_evidence_review_id,
          source: "operator_authored_planning_truth",
        },
        limitationsJson: carriedLimitations,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:created`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      await this.recordRequiredRefs(tx, created.row, input, cloneReview);
      const stateEventId = await this.recordCoarseProposalStateIfNeeded(tx, migration, created.row, "draft", input, {
        planId: created.row.id,
        cloneReviewId: cloneReview.id,
      });
      return { plan: created.row, eventId: event.id, stateEventId, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async attachCloneReviewRef(input: Omit<RecordImprovementProposalRefInput, "refRole" | "refType" | "sourceTable" | "sourceRecordId"> & { cloneReviewId: string }) {
    return this.recordRef({
      ...input,
      refRole: "clone_review",
      refType: "clone_review",
      sourceTable: "gnr8_single_site_clone_reviews",
      sourceRecordId: input.cloneReviewId,
    });
  }

  async attachSourceEvidenceRef(input: Omit<RecordImprovementProposalRefInput, "refRole">) {
    return this.recordRef({ ...input, refRole: "source_evidence_ref" });
  }

  async attachFidelityFindingRef(input: Omit<RecordImprovementProposalRefInput, "refRole">) {
    return this.recordRef({ ...input, refRole: "clone_review_fidelity_finding" });
  }

  async recordRef(input: RecordImprovementProposalRefInput): Promise<{ refId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const plan = await this.requiredMutablePlan(tx, input.planId);
      if (plan.migration_id !== requiredText("migrationId", input.migrationId)) throw new SingleSiteTransitionError("proposal ref migrationId mismatch");
      const ref = await this.repository.insertImprovementProposalRef(tx, input);
      return { refId: ref.row.id, reusedExisting: ref.reusedExisting };
    });
  }

  async addRecommendation(input: AddImprovementProposalRecommendationInput): Promise<{ recommendation: SingleSiteImprovementProposalRecommendationRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const plan = await this.requiredMutablePlan(tx, input.planId);
      if (plan.migration_id !== requiredText("migrationId", input.migrationId)) throw new SingleSiteTransitionError("recommendation migrationId mismatch");
      const recommendation = await this.repository.upsertImprovementProposalRecommendation(tx, { ...input, recommendationStatus: "draft", actor: input.actor });
      const event = await this.insertEventIfNeeded(tx, {
        planId: plan.id,
        migrationId: plan.migration_id,
        eventAction: "recommendation_added",
        fromStatus: plan.plan_status,
        toStatus: plan.plan_status,
        actor: input.actor,
        detailsJson: {
          recommendationId: recommendation.id,
          recommendationKey: recommendation.recommendation_key,
          category: recommendation.category,
          risk: recommendation.risk,
          impact: recommendation.impact,
          effort: recommendation.effort,
        },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:recommendation_added`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { recommendation, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  async addFinding(input: AddImprovementProposalFindingInput): Promise<{ finding: SingleSiteImprovementProposalFindingRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const plan = await this.requiredMutablePlan(tx, input.planId);
      if (plan.migration_id !== requiredText("migrationId", input.migrationId)) throw new SingleSiteTransitionError("finding migrationId mismatch");
      const finding = await this.repository.upsertImprovementProposalFinding(tx, { ...input, actor: input.actor });
      const event = await this.insertEventIfNeeded(tx, {
        planId: plan.id,
        migrationId: plan.migration_id,
        eventAction: "finding_added",
        fromStatus: plan.plan_status,
        toStatus: plan.plan_status,
        actor: input.actor,
        detailsJson: {
          findingId: finding.id,
          findingKey: finding.finding_key,
          category: finding.category,
          risk: finding.risk,
          impact: finding.impact,
        },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:finding_added`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { finding, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  async markReadyForReview(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    return this.moveStatus(input, "ready_for_review");
  }

  async startReview(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    return this.moveStatus(input, "in_review", { reviewedAt: new Date().toISOString() });
  }

  async requestChanges(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    requiredText("reason", input.reason);
    return this.moveStatus(input, "changes_requested");
  }

  async approve(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    return this.recordDecision(input, "approved");
  }

  async approveWithLimitations(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    if (jsonArray(input.limitationsJson).length === 0) throw new SingleSiteTransitionError("approveWithLimitations requires limitations");
    return this.recordDecision(input, "approved_with_limitations");
  }

  async reject(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "rejected");
  }

  async supersede(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    if (!input.replacementPlanId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement plan ref or reason");
    return this.recordDecision(input, "superseded");
  }

  async cancel(input: ImprovementProposalDecisionInput): Promise<ImprovementProposalPlanningOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "cancelled");
  }

  async attachImplementationAuthorizationRef(input: AttachImplementationAuthorizationRefInput): Promise<ImprovementProposalPlanningOperationResult & { refId: string }> {
    return this.repository.withTransaction(async (tx) => {
      const plan = await this.requiredPlan(tx, input.planId);
      await this.requiredNonTerminalMigration(tx, plan.migration_id);
      if (!["approved", "approved_with_limitations"].includes(plan.plan_status)) {
        throw new SingleSiteTransitionError("implementation authorization requires proposal approval");
      }
      const ref = await this.repository.insertImprovementProposalRef(tx, {
        planId: plan.id,
        migrationId: plan.migration_id,
        refRole: input.refRole ?? "implementation_authorization_decision",
        refType: input.refType,
        sourceSystem: input.sourceSystem,
        sourceTable: input.sourceTable,
        sourceRecordId: input.sourceRecordId,
        sourceVersion: input.sourceVersion,
        sourceWatermark: input.sourceWatermark,
        semanticWatermark: input.semanticWatermark,
        contentHash: input.contentHash,
        capturedAt: input.capturedAt,
        freshUntil: input.freshUntil,
        evidenceOnly: false,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const authorizationRefs = {
        ...jsonObject(plan.implementation_authorization_refs_json),
        latestImplementationAuthorizationRefId: ref.row.id,
        sourceRecordId: input.sourceRecordId,
        ...(input.authorizationRefsJson ?? {}),
      };
      const updated = await this.repository.updateImprovementProposalPlanStatus(tx, {
        planId: plan.id,
        planStatus: plan.plan_status,
        implementationAuthorizationRefsJson: authorizationRefs,
        implementationAuthorizationAttached: true,
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:plan:implementation_authorization_attached`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const event = await this.insertEventIfNeeded(tx, {
        planId: plan.id,
        migrationId: plan.migration_id,
        eventAction: "implementation_authorization_attached",
        fromStatus: plan.plan_status,
        toStatus: plan.plan_status,
        actor: input.actor,
        detailsJson: { refId: ref.row.id, sourceRecordId: input.sourceRecordId },
        implementationAuthorizationRefsJson: authorizationRefs,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:implementation_authorization_attached`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { plan: updated, refId: ref.row.id, eventId: event.id, reusedExisting: ref.reusedExisting || event.reusedExisting };
    });
  }

  async readLatestProposalPlanForMigration(migrationId: string): Promise<SingleSiteImprovementProposalPlanRow | null> {
    return this.repository.withTransaction((tx) => this.repository.getLatestImprovementProposalPlanForMigration(tx, requiredText("migrationId", migrationId)));
  }

  private async moveStatus(
    input: ImprovementProposalDecisionInput,
    status: SingleSiteImprovementProposalPlanStatus,
    patch: { reviewedAt?: string | null } = {},
  ): Promise<ImprovementProposalPlanningOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const plan = await this.requiredMutablePlan(tx, input.planId);
      await this.assertLatestCloneReviewStillAccepted(tx, plan);
      if (status === "ready_for_review") await this.assertReadyForReview(tx, plan);
      const updated = await this.repository.updateImprovementProposalPlanStatus(tx, {
        planId: plan.id,
        planStatus: status,
        summary: input.summary,
        limitationsJson: input.limitationsJson,
        warningsJson: input.warningsJson,
        decisionSummaryJson: input.decisionSummaryJson,
        actor: input.actor,
        reviewedAt: patch.reviewedAt,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const event = await this.insertEventIfNeeded(tx, {
        planId: plan.id,
        migrationId: plan.migration_id,
        eventAction: eventActionForStatus(status),
        fromStatus: plan.plan_status,
        toStatus: status,
        actor: input.actor,
        detailsJson: input.detailsJson ?? { reason: input.reason ?? null },
        limitationsJson: input.limitationsJson,
        warningsJson: input.warningsJson,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:${status}`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const migration = await this.requiredNonTerminalMigration(tx, plan.migration_id);
      const stateEventId = await this.recordCoarseProposalStateIfNeeded(tx, migration, updated, status, input, input.detailsJson);
      return { plan: updated, eventId: event.id, stateEventId, reusedExisting: event.reusedExisting };
    });
  }

  private async recordDecision(
    input: ImprovementProposalDecisionInput,
    status: "approved" | "approved_with_limitations" | "rejected" | "superseded" | "cancelled",
  ): Promise<ImprovementProposalPlanningOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const planMaybe = await this.repository.getImprovementProposalPlanById(tx, requiredText("planId", input.planId));
      if (!planMaybe) throw new SingleSiteTransitionError(`proposal plan ${input.planId} was not found`);
      const existingEvent = await this.repository.getImprovementProposalEventByIdempotencyKey(tx, `${input.idempotencyKey}:event:${status}`);
      if (existingEvent) {
        assertEventSemanticMatch(existingEvent, {
          planId: planMaybe.id,
          migrationId: planMaybe.migration_id,
          eventAction: eventActionForStatus(status),
          fromStatus: planMaybe.plan_status,
          toStatus: status,
          actor: input.actor,
          detailsJson: input.detailsJson ?? { reason: input.reason ?? null, replacementPlanId: input.replacementPlanId ?? null },
          limitationsJson: input.limitationsJson,
          warningsJson: input.warningsJson,
          approvalRefsJson: input.approvalRefsJson,
          correlationId: input.correlationId,
          causationId: input.causationId,
          idempotencyKey: `${input.idempotencyKey}:event:${status}`,
          requestId: input.requestId,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
          metadataJson: input.metadataJson,
        });
        return { plan: planMaybe, eventId: existingEvent.id, reusedExisting: true };
      }

      const plan = await this.requiredMutablePlan(tx, input.planId);
      await this.assertLatestCloneReviewStillAccepted(tx, plan);
      if (status === "approved" || status === "approved_with_limitations") await this.assertApprovalAllowed(tx, plan, input);
      const decisionSummaryJson = input.decisionSummaryJson ?? { decision: status, reason: input.reason ?? null };
      const updated = await this.repository.updateImprovementProposalPlanStatus(tx, {
        planId: plan.id,
        planStatus: status,
        summary: input.summary,
        limitationsJson: input.limitationsJson,
        warningsJson: input.warningsJson,
        decisionSummaryJson,
        approvalRefsJson: input.approvalRefsJson,
        supersededByPlanId: status === "superseded" ? input.replacementPlanId : null,
        actor: input.actor,
        decidedAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      if (status === "superseded") {
        await this.repository.insertImprovementProposalSupersession(tx, {
          migrationId: plan.migration_id,
          supersededPlanId: plan.id,
          replacementPlanId: input.replacementPlanId,
          supersessionReason: input.reason ?? "proposal plan superseded",
          sourceRefJson: input.detailsJson,
          actor: input.actor,
          correlationId: input.correlationId,
          causationId: input.causationId,
          idempotencyKey: `${input.idempotencyKey}:supersession`,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
          metadataJson: input.metadataJson,
        });
      }
      const event = await this.insertEventIfNeeded(tx, {
        planId: plan.id,
        migrationId: plan.migration_id,
        eventAction: eventActionForStatus(status),
        fromStatus: plan.plan_status,
        toStatus: status,
        actor: input.actor,
        detailsJson: input.detailsJson ?? { reason: input.reason ?? null, replacementPlanId: input.replacementPlanId ?? null },
        limitationsJson: input.limitationsJson,
        warningsJson: input.warningsJson,
        approvalRefsJson: input.approvalRefsJson,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:${status}`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const migration = await this.requiredNonTerminalMigration(tx, plan.migration_id);
      const stateEventId = await this.recordCoarseProposalStateIfNeeded(tx, migration, updated, status, input, decisionSummaryJson);
      return { plan: updated, eventId: event.id, stateEventId, reusedExisting: event.reusedExisting };
    });
  }

  private async requiredPlan(tx: SingleSiteStateWriterTx, planId: string): Promise<SingleSiteImprovementProposalPlanRow> {
    const plan = await this.repository.getImprovementProposalPlanById(tx, requiredText("planId", planId));
    if (!plan) throw new SingleSiteTransitionError(`proposal plan ${planId} was not found`);
    return plan;
  }

  private async requiredMutablePlan(tx: SingleSiteStateWriterTx, planId: string): Promise<SingleSiteImprovementProposalPlanRow> {
    const plan = await this.requiredPlan(tx, planId);
    const migration = await this.requiredNonTerminalMigration(tx, plan.migration_id);
    if (terminalPlanStatus(plan.plan_status)) throw new SingleSiteTransitionError(`terminal proposal status ${plan.plan_status} cannot change`);
    if (migration.current_state === "migration_cancelled") throw new SingleSiteTransitionError("cancelled migration cannot change proposal planning");
    return plan;
  }

  private async requiredNonTerminalMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot change proposal planning`);
    return migration;
  }

  private assertMigrationIdentity(migration: SingleSiteMigrationRow, clientId: string, siteId: string): void {
    if (migration.client_id !== requiredText("clientId", clientId)) throw new SingleSiteTransitionError("clientId does not match migration");
    if ((migration.site_id ?? "") !== requiredText("siteId", siteId)) throw new SingleSiteTransitionError("siteId does not match migration");
  }

  private async requiredAcceptedCloneReview(
    tx: SingleSiteStateWriterTx,
    migrationId: string,
    cloneReviewId?: string | null,
  ): Promise<SingleSiteCloneReviewRow> {
    const latest = await this.repository.getLatestCloneReviewForMigration(tx, migrationId);
    if (!latest) throw new SingleSiteTransitionError("proposal planning requires accepted clone review", ["accepted_clone_review"]);
    if (cloneReviewId && latest.id !== cloneReviewId) throw new SingleSiteTransitionError("proposal planning requires latest clone review");
    const refs = await this.repository.listCloneReviewRefs(tx, latest.id);
    const accepted = ["accepted", "accepted_with_limitations"].includes(latest.review_status);
    const missing: string[] = [];
    if (!accepted) missing.push(`latest clone review status is ${latest.review_status}`);
    if (!latest.proposal_planning_allowed) missing.push("clone review proposal planning allowed");
    if (!hasRequiredCloneRefs(refs)) missing.push("clone review required refs");
    if (latest.review_status === "accepted_with_limitations" && jsonArray(latest.limitations_json).length === 0) missing.push("accepted clone limitations");
    if (missing.length > 0) throw new SingleSiteTransitionError(`proposal planning is blocked: ${missing.join(", ")}`, missing);
    return latest;
  }

  private async assertLatestCloneReviewStillAccepted(tx: SingleSiteStateWriterTx, plan: SingleSiteImprovementProposalPlanRow): Promise<void> {
    const latest = await this.requiredAcceptedCloneReview(tx, plan.migration_id, plan.clone_review_id);
    if (latest.clone_site_version_ref !== plan.clone_site_version_ref || latest.runtime_artifact_ref !== plan.runtime_artifact_ref) {
      throw new SingleSiteTransitionError("proposal plan clone refs are stale");
    }
  }

  private async assertReadyForReview(tx: SingleSiteStateWriterTx, plan: SingleSiteImprovementProposalPlanRow): Promise<void> {
    const recommendations = await this.repository.listImprovementProposalRecommendations(tx, plan.id);
    const findings = await this.repository.listImprovementProposalFindings(tx, plan.id);
    if (recommendations.length === 0) throw new SingleSiteTransitionError("proposal ready for review requires recommendations");
    if (findings.length === 0) throw new SingleSiteTransitionError("proposal ready for review requires findings");
  }

  private async assertApprovalAllowed(tx: SingleSiteStateWriterTx, plan: SingleSiteImprovementProposalPlanRow, input: ImprovementProposalDecisionInput): Promise<void> {
    const recommendations = await this.repository.listImprovementProposalRecommendations(tx, plan.id);
    const findings = await this.repository.listImprovementProposalFindings(tx, plan.id);
    if (recommendations.length === 0) throw new SingleSiteTransitionError("proposal approval requires recommendations");
    const highRiskRecommendationBlocker = recommendations.some((recommendation) => {
      return recommendation.risk === "high" && recommendation.blocks_proposal_approval && !recommendation.limitation_accepted && Object.keys(jsonObject(recommendation.decision_json)).length === 0;
    });
    const highRiskFindingBlocker = findings.some((finding) => {
      return finding.risk === "high" && finding.blocks_proposal_approval && !finding.accepted_limitation && Object.keys(jsonObject(finding.decision_json)).length === 0;
    });
    if ((highRiskRecommendationBlocker || highRiskFindingBlocker) && !hasDecisionOrLimitations(input)) {
      throw new SingleSiteTransitionError("proposal approval requires limitation or decision for unresolved high-risk blocker");
    }
  }

  private async recordRequiredRefs(
    tx: SingleSiteStateWriterTx,
    plan: SingleSiteImprovementProposalPlanRow,
    input: CreateOrReuseImprovementProposalPlanInput,
    cloneReview: SingleSiteCloneReviewRow,
  ): Promise<void> {
    const base = {
      planId: plan.id,
      migrationId: plan.migration_id,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    };
    await this.repository.insertImprovementProposalRef(tx, {
      ...base,
      refRole: "clone_review",
      refType: "clone_review",
      sourceTable: "gnr8_single_site_clone_reviews",
      sourceRecordId: cloneReview.id,
      idempotencyKey: `${input.idempotencyKey}:ref:clone_review`,
    });
    await this.repository.insertImprovementProposalRef(tx, {
      ...base,
      refRole: "runtime_site_version_clone",
      refType: "runtime_site_version",
      sourceTable: "runtime_site_versions",
      sourceRecordId: cloneReview.clone_site_version_ref,
      idempotencyKey: `${input.idempotencyKey}:ref:runtime_site_version_clone`,
    });
    await this.repository.insertImprovementProposalRef(tx, {
      ...base,
      refRole: "runtime_artifact_clone",
      refType: "runtime_artifact",
      sourceTable: "runtime_artifacts",
      sourceRecordId: cloneReview.runtime_artifact_ref,
      idempotencyKey: `${input.idempotencyKey}:ref:runtime_artifact_clone`,
    });
    await this.repository.insertImprovementProposalRef(tx, {
      ...base,
      refRole: "source_evidence_review",
      refType: "source_evidence_review",
      sourceTable: "gnr8_single_site_source_evidence_reviews",
      sourceRecordId: cloneReview.source_evidence_review_id,
      idempotencyKey: `${input.idempotencyKey}:ref:source_evidence_review`,
    });
  }

  private async insertEventIfNeeded(tx: SingleSiteStateWriterTx, input: ProposalEventWithoutIndex): Promise<SingleSiteImprovementProposalEventRow & { reusedExisting: boolean }> {
    const existing = await this.repository.getImprovementProposalEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      assertEventSemanticMatch(existing, input);
      return { ...existing, reusedExisting: true };
    }
    const eventIndex = await this.repository.nextImprovementProposalEventIndex(tx, input.planId);
    const inserted = await this.repository.insertImprovementProposalEvent(tx, { ...input, eventIndex });
    return { ...inserted.row, reusedExisting: inserted.reusedExisting };
  }

  private async recordCoarseProposalStateIfNeeded(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    plan: SingleSiteImprovementProposalPlanRow,
    status: SingleSiteImprovementProposalPlanStatus,
    input: ImprovementProposalPlanningEnvelope,
    detailsJson?: SingleSiteJsonObject,
  ): Promise<string | undefined> {
    const toState = proposalStateForStatus(status);
    if (!toState || migration.current_state === toState) {
      await this.repository.upsertStageSummary(tx, {
        migrationId: migration.id,
        stage: "proposal",
        status: status === "approved" || status === "approved_with_limitations" ? "accepted" : status === "rejected" ? "blocked" : status === "cancelled" ? "cancelled" : "in_progress",
        summaryJson: { latestProposalPlanId: plan.id, proposalStatus: plan.plan_status },
        limitationsJson: jsonArray(plan.limitations_json),
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:stage:proposal:${status}`,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      return undefined;
    }
    const eventIndex = await this.repository.nextStateEventIndex(tx, migration.id);
    const event = await this.repository.insertStateEvent(tx, {
      migrationId: migration.id,
      eventIndex,
      fromState: migration.current_state,
      toState,
      transitionKey: `improvement_proposal_planning.${status}`,
      transitionReason: `proposal planning status ${status}`,
      requiredRefsJson: {
        proposalPlanId: plan.id,
        cloneReviewId: plan.clone_review_id,
        cloneSiteVersionRef: plan.clone_site_version_ref,
        runtimeArtifactRef: plan.runtime_artifact_ref,
      },
      afterRefJson: detailsJson ?? { proposalPlanId: plan.id, proposalStatus: status },
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state:${toState}`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    });
    await this.repository.updateMigrationCurrentState(tx, {
      migrationId: migration.id,
      toState,
      latestStateEventId: event.row.id,
      refs: {
        proposal_refs_json: {
          latestImprovementProposalPlanId: plan.id,
          proposalStatus: status,
          implementationAuthorizationAttached: plan.implementation_authorization_attached,
        },
      },
    });
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "proposal",
      status: status === "approved" || status === "approved_with_limitations" ? "accepted" : status === "rejected" ? "blocked" : "in_progress",
      latestStateEventId: event.row.id,
      summaryJson: { latestProposalPlanId: plan.id, proposalStatus: status },
      limitationsJson: jsonArray(plan.limitations_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:proposal:${status}`,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
    });
    return (event.row as SingleSiteStateEventRow).id;
  }
}
