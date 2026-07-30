import "server-only";

import {
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  isSingleSiteTerminalState,
  type SingleSiteActorType,
  type SingleSiteCloneFidelityCategory,
  type SingleSiteCloneFidelitySeverity,
  type SingleSiteCloneReviewDecision,
  type SingleSiteCloneReviewEventAction,
  type SingleSiteCloneReviewRefRole,
  type SingleSiteCloneReviewStatus,
  type SingleSiteJsonObject,
  type SingleSiteMigrationState,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type CreateCloneReviewInput,
  type InsertCloneReviewEventInput,
  type InsertCloneReviewRefInput,
  type SingleSiteActorInput,
  type SingleSiteCloneReviewEventRow,
  type SingleSiteCloneReviewItemRow,
  type SingleSiteCloneReviewRefRow,
  type SingleSiteCloneReviewRow,
  type SingleSiteMigrationRow,
  type SingleSiteStateWriterTx,
  type UpdateCloneReviewStatusInput,
  type UpsertCloneReviewItemInput,
} from "./single-site-state-writer-repository";

type CloneReviewEventWithoutIndex = Omit<InsertCloneReviewEventInput, "eventIndex">;

export type CloneReviewServiceEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type CreateOrReuseCloneReviewInput = CloneReviewServiceEnvelope & {
  migrationId: string;
  clientId: string;
  siteId?: string | null;
  cloneSiteVersionRef: string;
  runtimeArtifactRef: string;
  sourceEvidenceReviewRef: string;
  cloneGenerationRef?: string | null;
  cloneGenerationEventId?: string | null;
  fidelitySummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  supersedesReviewId?: string | null;
  eventIdempotencyKey?: string | null;
};

export type RecordCloneReviewRefInput = CloneReviewServiceEnvelope & {
  reviewId: string;
  migrationId: string;
  refRole: SingleSiteCloneReviewRefRole;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  contentHash?: string | null;
  mediaType?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
};

export type AddCloneFidelityFindingInput = CloneReviewServiceEnvelope & {
  reviewId: string;
  migrationId: string;
  itemKey: string;
  fidelityCategory: SingleSiteCloneFidelityCategory;
  severity: SingleSiteCloneFidelitySeverity;
  status?: "open" | "resolved" | "accepted_limitation" | "superseded" | null;
  blocksAcceptance?: boolean | null;
  acceptedLimitation?: boolean | null;
  findingSummary: string;
  refIdsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
};

export type CloneReviewDecisionInput = CloneReviewServiceEnvelope & {
  reviewId: string;
  fidelitySummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  replacementReviewId?: string | null;
  reason?: string | null;
};

export type CloneReviewOperationResult = {
  review: SingleSiteCloneReviewRow;
  eventId?: string;
  reusedExisting: boolean;
};

export type CloneProposalReadiness = {
  migrationId: string;
  ready: boolean;
  reviewId: string | null;
  reviewStatus: SingleSiteCloneReviewStatus | "missing";
  missingRequirements: string[];
  limitations: unknown[];
};

function requiredText(field: string, value: unknown): string {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    throw new SingleSiteTransitionError(`${field} is required`);
  }
  return String(value).trim();
}

function arrayValue(value: unknown): unknown[] {
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

function assertEventSemanticMatch(
  event: SingleSiteCloneReviewEventRow,
  input: CloneReviewEventWithoutIndex,
): void {
  const attempted: Record<string, unknown> = {
    review_id: input.reviewId,
    migration_id: input.migrationId,
    event_action: input.eventAction,
    to_status: input.toStatus ?? null,
    actor_type: input.actor.actorType,
    actor_id: input.actor.actorId,
    actor_role: input.actor.actorRole,
    details_json: input.detailsJson ?? {},
    limitations_json: input.limitationsJson ?? [],
    warnings_json: input.warningsJson ?? [],
    blockers_json: input.blockersJson ?? [],
    source_watermark: input.sourceWatermark ?? null,
    payload_hash: input.payloadHash ?? null,
    privacy_label: input.privacyLabel ?? "client_confidential",
    retention_class: input.retentionClass ?? "compliance_long",
    metadata_json: input.metadataJson ?? {},
  };
  const existing = event as unknown as Record<string, unknown>;
  const fields = Object.keys(attempted);
  const drifted = fields.filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError("gnr8_single_site_clone_review_events", input.idempotencyKey, drifted);
}

function terminalCloneReviewStatus(status: SingleSiteCloneReviewStatus): boolean {
  return ["accepted", "accepted_with_limitations", "retry_required", "rejected", "superseded"].includes(status);
}

function eventAction(status: SingleSiteCloneReviewStatus): SingleSiteCloneReviewEventAction {
  if (status === "accepted") return "accepted";
  if (status === "accepted_with_limitations") return "accepted_with_limitations";
  if (status === "retry_required") return "retry_required";
  if (status === "rejected") return "rejected";
  if (status === "superseded") return "superseded";
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "in_review") return "review_started";
  return "comment_added";
}

function decisionFor(status: SingleSiteCloneReviewStatus): SingleSiteCloneReviewDecision | null {
  if (status === "accepted") return "accept";
  if (status === "accepted_with_limitations") return "accept_with_limitations";
  if (status === "retry_required") return "retry_clone";
  if (status === "rejected") return "reject_clone";
  if (status === "superseded") return "supersede";
  return null;
}

function hasRequiredReviewRefs(refs: readonly SingleSiteCloneReviewRefRow[]): boolean {
  const roles = new Set(refs.map((ref) => ref.ref_role));
  return roles.has("runtime_site_version_clone") && roles.has("runtime_artifact_clone") && roles.has("source_evidence_review");
}

export class CloneReviewService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createOrReuseReview(input: CreateOrReuseCloneReviewInput): Promise<CloneReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const migration = await this.requiredReviewableMigration(tx, input.migrationId);
      this.assertMigrationIdentity(migration, input.clientId, input.siteId);

      const existing = await this.repository.getCloneReviewBySemanticRefs(tx, {
        migrationId: migration.id,
        cloneSiteVersionRef: input.cloneSiteVersionRef,
        runtimeArtifactRef: input.runtimeArtifactRef,
        sourceEvidenceReviewId: input.sourceEvidenceReviewRef,
      });
      const created = existing
        ? { row: existing, reusedExisting: true }
        : await this.repository.createCloneReview(tx, this.createInput(input, migration));

      const event = await this.insertEventIfNeeded(tx, {
        reviewId: created.row.id,
        migrationId: migration.id,
        eventAction: "created",
        fromStatus: null,
        toStatus: created.row.review_status,
        actor: input.actor,
        detailsJson: {
          cloneSiteVersionRef: input.cloneSiteVersionRef,
          runtimeArtifactRef: input.runtimeArtifactRef,
          sourceEvidenceReviewRef: input.sourceEvidenceReviewRef,
          cloneGenerationRef: input.cloneGenerationRef ?? null,
          cloneGenerationEventId: input.cloneGenerationEventId ?? null,
        },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.eventIdempotencyKey ?? `${input.idempotencyKey}:event:created`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });

      await this.recordRequiredRefs(tx, created.row, input);
      await this.ensureCloneReviewRequiredState(tx, migration, created.row, input);
      return { review: created.row, eventId: event.id, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async recordRef(input: RecordCloneReviewRefInput): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const refInput: InsertCloneReviewRefInput = { ...input };
      const ref = await this.repository.insertCloneReviewRef(tx, refInput);
      const event = await this.insertEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: "ref_added",
        fromStatus: review.review_status,
        toStatus: review.review_status,
        actor: input.actor,
        detailsJson: { refRole: input.refRole, refType: input.refType, sourceRecordId: input.sourceRecordId },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:ref_added`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { refId: ref.row.id, eventId: event.id, reusedExisting: ref.reusedExisting || event.reusedExisting };
    });
  }

  async addFinding(input: AddCloneFidelityFindingInput): Promise<{ item: SingleSiteCloneReviewItemRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const itemInput: UpsertCloneReviewItemInput = { ...input, actor: input.actor };
      const item = await this.repository.upsertCloneReviewItem(tx, itemInput);
      const event = await this.insertEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: "finding_added",
        fromStatus: review.review_status,
        toStatus: review.review_status,
        actor: input.actor,
        detailsJson: {
          itemKey: input.itemKey,
          fidelityCategory: input.fidelityCategory,
          severity: input.severity,
          status: input.status ?? "open",
        },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:finding_added`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { item, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  async markReadyForReview(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    return this.moveStatus(input, "ready_for_review", { reviewDecision: null });
  }

  async startReview(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    return this.moveStatus(input, "in_review", { reviewDecision: null, reviewStartedAt: new Date().toISOString() });
  }

  async accept(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    return this.recordDecision(input, "accepted");
  }

  async acceptWithLimitations(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    return this.recordDecision(input, "accepted_with_limitations");
  }

  async requireRetry(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "retry_required");
  }

  async reject(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "rejected");
  }

  async supersede(input: CloneReviewDecisionInput): Promise<CloneReviewOperationResult> {
    if (!input.replacementReviewId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement review ref or reason");
    return this.recordDecision(input, "superseded");
  }

  async readLatestCloneReviewForMigration(migrationId: string): Promise<SingleSiteCloneReviewRow | null> {
    return this.repository.withTransaction((tx) => this.repository.getLatestCloneReviewForMigration(tx, requiredText("migrationId", migrationId)));
  }

  async getProposalReadiness(migrationId: string): Promise<CloneProposalReadiness> {
    return this.repository.withTransaction(async (tx) => {
      const latest = await this.repository.getLatestCloneReviewForMigration(tx, requiredText("migrationId", migrationId));
      if (!latest) {
        return {
          migrationId,
          ready: false,
          reviewId: null,
          reviewStatus: "missing",
          missingRequirements: ["accepted_clone_review"],
          limitations: [],
        };
      }
      const refs = await this.repository.listCloneReviewRefs(tx, latest.id);
      const ready = latest.proposal_planning_allowed && ["accepted", "accepted_with_limitations"].includes(latest.review_status) && hasRequiredReviewRefs(refs);
      return {
        migrationId,
        ready,
        reviewId: latest.id,
        reviewStatus: latest.review_status,
        missingRequirements: ready ? [] : ["accepted_clone_review", "required_clone_review_refs"].filter((requirement) => {
          if (requirement === "accepted_clone_review") return !latest.proposal_planning_allowed;
          return !hasRequiredReviewRefs(refs);
        }),
        limitations: arrayValue(latest.limitations_json),
      };
    });
  }

  private createInput(input: CreateOrReuseCloneReviewInput, migration: SingleSiteMigrationRow): CreateCloneReviewInput {
    return {
      migrationId: migration.id,
      clientId: input.clientId,
      siteId: input.siteId ?? migration.site_id,
      cloneSiteVersionRef: input.cloneSiteVersionRef,
      runtimeArtifactRef: input.runtimeArtifactRef,
      sourceEvidenceReviewId: input.sourceEvidenceReviewRef,
      cloneGenerationRef: input.cloneGenerationRef,
      cloneGenerationEventId: input.cloneGenerationEventId,
      reviewStatus: "draft",
      fidelitySummaryJson: input.fidelitySummaryJson,
      limitationsJson: input.limitationsJson,
      warningsJson: input.warningsJson,
      blockersJson: input.blockersJson,
      diagnosticsJson: input.diagnosticsJson,
      supersedesReviewId: input.supersedesReviewId,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    };
  }

  private async recordRequiredRefs(
    tx: SingleSiteStateWriterTx,
    review: SingleSiteCloneReviewRow,
    input: CreateOrReuseCloneReviewInput,
  ): Promise<void> {
    const base = {
      reviewId: review.id,
      migrationId: review.migration_id,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    };
    await this.repository.insertCloneReviewRef(tx, {
      ...base,
      refRole: "runtime_site_version_clone",
      refType: "runtime_site_version",
      sourceTable: "runtime_site_versions",
      sourceRecordId: review.clone_site_version_ref,
      idempotencyKey: `${input.idempotencyKey}:ref:runtime_site_version_clone`,
    });
    await this.repository.insertCloneReviewRef(tx, {
      ...base,
      refRole: "runtime_artifact_clone",
      refType: "runtime_artifact",
      sourceTable: "runtime_artifacts",
      sourceRecordId: review.runtime_artifact_ref,
      idempotencyKey: `${input.idempotencyKey}:ref:runtime_artifact_clone`,
    });
    await this.repository.insertCloneReviewRef(tx, {
      ...base,
      refRole: "source_evidence_review",
      refType: "source_evidence_review",
      sourceTable: "gnr8_single_site_source_evidence_reviews",
      sourceRecordId: review.source_evidence_review_id,
      idempotencyKey: `${input.idempotencyKey}:ref:source_evidence_review`,
    });
    if (review.clone_generation_event_id) {
      await this.repository.insertCloneReviewRef(tx, {
        ...base,
        refRole: "clone_generation_event",
        refType: "single_site_state_event",
        sourceTable: "gnr8_single_site_migration_state_events",
        sourceRecordId: review.clone_generation_event_id,
        idempotencyKey: `${input.idempotencyKey}:ref:clone_generation_event`,
      });
    }
    await this.repository.insertMigrationRef(tx, {
      migrationId: review.migration_id,
      refRole: "clone_review",
      refType: "clone_review",
      sourceTable: "gnr8_single_site_clone_reviews",
      sourceRecordId: review.id,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: { cloneSiteVersionRef: review.clone_site_version_ref, runtimeArtifactRef: review.runtime_artifact_ref },
      idempotencyKey: `${input.idempotencyKey}:migration_ref:clone_review`,
    });
  }

  private async ensureCloneReviewRequiredState(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    review: SingleSiteCloneReviewRow,
    input: CreateOrReuseCloneReviewInput,
  ): Promise<void> {
    if (migration.current_state === "clone_review_required") {
      await this.repository.upsertStageSummary(tx, {
        migrationId: migration.id,
        stage: "clone",
        status: "ready_for_review",
        summaryJson: { latestCloneReviewId: review.id, cloneSiteVersionRef: review.clone_site_version_ref },
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:stage:clone_review_required`,
      });
      return;
    }
    if (migration.current_state !== "clone_generation_completed") return;
    const eventIndex = await this.repository.nextStateEventIndex(tx, migration.id);
    const event = await this.repository.insertStateEvent(tx, {
      migrationId: migration.id,
      eventIndex,
      fromState: migration.current_state,
      toState: "clone_review_required",
      transitionKey: "clone_review_service.clone_review_required",
      transitionReason: "clone_review_created_after_clone_generation_completed",
      requiredRefsJson: {
        cloneReviewId: review.id,
        cloneSiteVersionRef: review.clone_site_version_ref,
        runtimeArtifactRef: review.runtime_artifact_ref,
        sourceEvidenceReviewId: review.source_evidence_review_id,
      },
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state:clone_review_required`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    });
    await this.repository.updateMigrationCurrentState(tx, {
      migrationId: migration.id,
      toState: "clone_review_required",
      latestStateEventId: event.row.id,
    });
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "clone",
      status: "ready_for_review",
      latestStateEventId: event.row.id,
      summaryJson: { latestCloneReviewId: review.id, cloneSiteVersionRef: review.clone_site_version_ref },
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:clone_review_required`,
    });
  }

  private async moveStatus(
    input: CloneReviewDecisionInput,
    status: SingleSiteCloneReviewStatus,
    patch: Partial<UpdateCloneReviewStatusInput>,
  ): Promise<CloneReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      await this.requiredNonTerminalMigration(tx, review.migration_id);
      const updated = await this.repository.updateCloneReviewStatus(tx, {
        reviewId: review.id,
        reviewStatus: status,
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
        ...patch,
      });
      const event = await this.insertEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: eventAction(status),
        fromStatus: review.review_status,
        toStatus: status,
        actor: input.actor,
        detailsJson: input.detailsJson,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:${status}`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { review: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private async recordDecision(
    input: CloneReviewDecisionInput,
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
  ): Promise<CloneReviewOperationResult> {
    const eventInput = (review: SingleSiteCloneReviewRow): CloneReviewEventWithoutIndex => ({
      reviewId: review.id,
      migrationId: review.migration_id,
      eventAction: eventAction(status),
      fromStatus: review.review_status,
      toStatus: status,
      actor: input.actor,
      detailsJson: input.detailsJson ?? { reason: input.reason ?? null, replacementReviewId: input.replacementReviewId ?? null },
      limitationsJson: input.limitationsJson,
      warningsJson: input.warningsJson,
      blockersJson: input.blockersJson,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:event:${status}`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    });

    return this.repository.withTransaction(async (tx) => {
      const reviewMaybe = await this.repository.getCloneReviewById(tx, requiredText("reviewId", input.reviewId));
      if (!reviewMaybe) throw new SingleSiteTransitionError(`clone review ${input.reviewId} was not found`);
      const existingEvent = await this.repository.getCloneReviewEventByIdempotencyKey(tx, `${input.idempotencyKey}:event:${status}`);
      if (existingEvent) {
        assertEventSemanticMatch(existingEvent, eventInput(reviewMaybe));
        return { review: reviewMaybe, eventId: existingEvent.id, reusedExisting: true };
      }

      const review = await this.requiredOpenReview(tx, input.reviewId);
      const migration = await this.requiredNonTerminalMigration(tx, review.migration_id);
      const items = await this.repository.listCloneReviewItems(tx, review.id);
      const refs = await this.repository.listCloneReviewRefs(tx, review.id);
      this.assertDecisionAllowed(status, input, items, refs);

      const now = new Date().toISOString();
      const updated = await this.repository.updateCloneReviewStatus(tx, {
        ...this.decisionPatch(status, input, now),
        actor: input.actor,
        causationId: input.causationId,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const event = await this.insertEventIfNeeded(tx, eventInput(review));
      await this.updateCloneStageAfterDecision(tx, migration, updated, input, status, event.id);
      return { review: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private decisionPatch(
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
    input: CloneReviewDecisionInput,
    reviewedAt: string,
  ): UpdateCloneReviewStatusInput {
    return {
      reviewId: input.reviewId,
      reviewStatus: status,
      reviewDecision: decisionFor(status),
      proposalPlanningAllowed: status === "accepted" || status === "accepted_with_limitations",
      retryRequired: status === "retry_required",
      acceptedWithLimitations: status === "accepted_with_limitations",
      fidelitySummaryJson: input.fidelitySummaryJson,
      limitationsJson: input.limitationsJson ?? [],
      warningsJson: input.warningsJson,
      blockersJson: input.blockersJson,
      diagnosticsJson: input.diagnosticsJson,
      reviewedAt,
      supersededByReviewId: input.replacementReviewId,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private assertDecisionAllowed(
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
    input: CloneReviewDecisionInput,
    items: readonly SingleSiteCloneReviewItemRow[],
    refs: readonly SingleSiteCloneReviewRefRow[],
  ): void {
    if ((status === "accepted" || status === "accepted_with_limitations") && !hasRequiredReviewRefs(refs)) {
      throw new SingleSiteTransitionError("clone review acceptance requires clone site version, runtime artifact, and source evidence review refs");
    }
    const openP0 = items.filter((item) => item.status === "open" && item.severity === "p0_blocker" && !item.accepted_limitation);
    const openP1 = items.filter((item) => item.status === "open" && item.severity === "p1_major" && !item.accepted_limitation);
    if (status === "accepted" && (openP0.length > 0 || openP1.length > 0)) {
      throw new SingleSiteTransitionError("cannot accept clone review with open p0/p1 fidelity blockers", [...openP0, ...openP1].map((item) => item.item_key));
    }
    if (status === "accepted_with_limitations") {
      const limitations = arrayValue(input.limitationsJson);
      if (limitations.length === 0) throw new SingleSiteTransitionError("accepted_with_limitations requires limitations");
      if (openP0.length > 0) throw new SingleSiteTransitionError("cannot accept clone review with limitations while p0 blockers remain open", openP0.map((item) => item.item_key));
    }
    if ((status === "retry_required" || status === "rejected") && !input.reason) {
      throw new SingleSiteTransitionError(`${status} requires a reason`);
    }
  }

  private async updateCloneStageAfterDecision(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    review: SingleSiteCloneReviewRow,
    input: CloneReviewDecisionInput,
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
    reviewEventId: string,
  ): Promise<void> {
    const stageStatus = status === "accepted_with_limitations" ? "accepted_with_limitations" : status === "accepted" ? "accepted" : status === "superseded" ? "superseded" : "blocked";
    await this.repository.upsertStageSummary(tx, {
      migrationId: review.migration_id,
      stage: "clone",
      status: stageStatus,
      completedAt: ["accepted", "accepted_with_limitations", "retry_required", "rejected", "superseded"].includes(status) ? new Date().toISOString() : null,
      summaryJson: {
        latestCloneReviewId: review.id,
        cloneReviewStatus: review.review_status,
        cloneReviewDecision: review.review_decision,
        proposalPlanningAllowed: review.proposal_planning_allowed,
        reviewEventId,
      },
      limitationsJson: arrayValue(review.limitations_json),
      warningsJson: arrayValue(review.warnings_json),
      blockersJson: arrayValue(review.blockers_json),
      blockerCount: arrayValue(review.blockers_json).length,
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:clone:${status}`,
    });
    void migration;
  }

  private async requiredReviewableMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot create clone review`);
    if (!["clone_generation_completed", "clone_review_required"].includes(migration.current_state)) {
      throw new SingleSiteTransitionError(`clone review requires clone generation completed or clone review required state, not ${migration.current_state}`);
    }
    return migration;
  }

  private async requiredNonTerminalMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot accept clone review`);
    return migration;
  }

  private assertMigrationIdentity(migration: SingleSiteMigrationRow, clientId: string, siteId?: string | null): void {
    if (migration.client_id !== requiredText("clientId", clientId)) throw new SingleSiteTransitionError("clientId does not match migration");
    const normalizedSiteId = siteId ? requiredText("siteId", siteId) : null;
    if (normalizedSiteId && migration.site_id && migration.site_id !== normalizedSiteId) throw new SingleSiteTransitionError("siteId does not match migration");
  }

  private async requiredOpenReview(tx: SingleSiteStateWriterTx, reviewId: string): Promise<SingleSiteCloneReviewRow> {
    const review = await this.repository.getCloneReviewById(tx, requiredText("reviewId", reviewId));
    if (!review) throw new SingleSiteTransitionError(`clone review ${reviewId} was not found`);
    if (terminalCloneReviewStatus(review.review_status)) throw new SingleSiteTransitionError(`clone review ${reviewId} is terminal`);
    return review;
  }

  private async insertEventIfNeeded(tx: SingleSiteStateWriterTx, input: CloneReviewEventWithoutIndex): Promise<{ id: string; reusedExisting: boolean }> {
    const existing = await this.repository.getCloneReviewEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      assertEventSemanticMatch(existing, input);
      return { id: existing.id, reusedExisting: true };
    }
    const eventIndex = await this.repository.nextCloneReviewEventIndex(tx, input.reviewId);
    const inserted = await this.repository.insertCloneReviewEvent(tx, { ...input, eventIndex });
    return { id: inserted.row.id, reusedExisting: inserted.reusedExisting };
  }
}

export function buildCloneReviewer(actorType: SingleSiteActorType, actorId: string, actorRole: string): SingleSiteActorInput {
  return { actorType, actorId, actorRole };
}
