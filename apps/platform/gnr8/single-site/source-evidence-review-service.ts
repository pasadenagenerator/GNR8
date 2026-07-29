import "server-only";

import {
  SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES,
  type SingleSiteActorType,
  type SingleSiteEvidenceItemCategory,
  type SingleSiteEvidenceItemStatus,
  type SingleSiteJsonObject,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
  type SingleSiteReviewEventAction,
  type SingleSiteSourceEvidenceRefRole,
  type SingleSiteSourceEvidenceReviewStatus,
  SingleSiteTransitionError,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type CreateSourceEvidenceReviewInput,
  type InsertSourceEvidenceReviewEventInput,
  type InsertSourceEvidenceReviewRefInput,
  type SingleSiteActorInput,
  type SingleSiteEvidenceItemRow,
  type SingleSiteSourceEvidenceReviewRow,
  type UpdateSourceEvidenceReviewStatusInput,
  type UpsertSourceEvidenceReviewItemInput,
} from "./single-site-state-writer-repository";

type ReviewEventWithoutIndex = Omit<InsertSourceEvidenceReviewEventInput, "eventIndex">;

export type SourceEvidenceReviewServiceEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type CreateSourceEvidenceReviewServiceInput = Omit<
  CreateSourceEvidenceReviewInput,
  "actor" | "reviewStatus"
> & {
  actor: SingleSiteActorInput;
  eventIdempotencyKey?: string | null;
};

export type AddSourceEvidenceItemInput = SourceEvidenceReviewServiceEnvelope & {
  reviewId: string;
  migrationId: string;
  evidenceCategory: SingleSiteEvidenceItemCategory;
  status: SingleSiteEvidenceItemStatus;
  requiredForClone?: boolean | null;
  blocksCloneGeneration?: boolean | null;
  acceptedLimitation?: boolean | null;
  findingSummary?: string | null;
  refIdsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  warningsJson?: unknown[];
  blockerJson?: SingleSiteJsonObject;
};

export type RecordSourceEvidenceRefInput = SourceEvidenceReviewServiceEnvelope & {
  reviewId: string;
  migrationId: string;
  refRole: SingleSiteSourceEvidenceRefRole;
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

export type ReviewDecisionInput = SourceEvidenceReviewServiceEnvelope & {
  reviewId: string;
  limitationsJson?: unknown[];
  missingEvidenceJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  aafAuditEventId?: string | null;
  aafApprovalDecisionId?: string | null;
  aafApprovalRequestId?: string | null;
  replacementReviewId?: string | null;
  reason?: string | null;
};

export type SourceEvidenceReviewOperationResult = {
  review: SingleSiteSourceEvidenceReviewRow;
  eventId?: string;
  reusedExisting: boolean;
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

function isTerminalReviewStatus(status: SingleSiteSourceEvidenceReviewStatus): boolean {
  return ["accepted", "accepted_with_limitations", "retry_required", "rejected", "superseded"].includes(status);
}

function decisionAction(status: SingleSiteSourceEvidenceReviewStatus): SingleSiteReviewEventAction {
  if (status === "accepted") return "accepted";
  if (status === "accepted_with_limitations") return "accepted_with_limitations";
  if (status === "retry_required") return "retry_required";
  if (status === "rejected") return "rejected";
  if (status === "superseded") return "superseded";
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "review_in_progress") return "review_started";
  return "comment_added";
}

export class SourceEvidenceReviewService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createReview(input: CreateSourceEvidenceReviewServiceInput): Promise<SourceEvidenceReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const created = await this.repository.createSourceEvidenceReview(tx, {
        ...input,
        reviewStatus: "not_started",
      });
      const event = await this.insertReviewEventIfNeeded(tx, {
        reviewId: created.row.id,
        migrationId: created.row.migration_id,
        eventAction: "created",
        fromStatus: null,
        toStatus: "not_started",
        actor: input.actor,
        detailsJson: { sourceEvidencePackageKey: created.row.source_evidence_package_key },
        sourceWatermark: created.row.source_watermark,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.eventIdempotencyKey ?? `${input.idempotencyKey}:event:created`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { review: created.row, eventId: event.id, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async recordRef(input: RecordSourceEvidenceRefInput): Promise<{ refId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const refInput: InsertSourceEvidenceReviewRefInput = {
        ...input,
        actor: undefined,
      } as InsertSourceEvidenceReviewRefInput;
      const ref = await this.repository.insertSourceEvidenceReviewRef(tx, refInput);
      return { refId: String(ref.row.id), reusedExisting: ref.reusedExisting };
    });
  }

  async addEvidenceItem(input: AddSourceEvidenceItemInput): Promise<{ item: SingleSiteEvidenceItemRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const itemInput: UpsertSourceEvidenceReviewItemInput = {
        ...input,
        actor: input.actor,
      };
      const item = await this.repository.upsertSourceEvidenceReviewItem(tx, itemInput);
      const event = await this.insertReviewEventIfNeeded(tx, {
        reviewId: input.reviewId,
        migrationId: input.migrationId,
        eventAction: "item_added",
        fromStatus: review.review_status,
        toStatus: review.review_status,
        actor: input.actor,
        detailsJson: { evidenceCategory: input.evidenceCategory, status: input.status },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:item_added`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { item, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  async markReadyForReview(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    return this.moveReviewStatus(input, "ready_for_review", { reviewDecision: null });
  }

  async startReview(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    return this.moveReviewStatus(input, "review_in_progress", { reviewDecision: null, reviewStartedAt: new Date().toISOString() });
  }

  async accept(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    return this.recordDecision(input, "accepted");
  }

  async acceptWithLimitations(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    return this.recordDecision(input, "accepted_with_limitations");
  }

  async requireRetry(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "retry_required");
  }

  async reject(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "rejected");
  }

  async supersede(input: ReviewDecisionInput): Promise<SourceEvidenceReviewOperationResult> {
    if (!input.replacementReviewId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement review ref or reason");
    return this.recordDecision(input, "superseded");
  }

  private async moveReviewStatus(
    input: ReviewDecisionInput,
    status: SingleSiteSourceEvidenceReviewStatus,
    patch: Partial<UpdateSourceEvidenceReviewStatusInput>,
  ): Promise<SourceEvidenceReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const updated = await this.repository.updateSourceEvidenceReviewStatus(tx, {
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
      const event = await this.insertReviewEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: decisionAction(status),
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
    input: ReviewDecisionInput,
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
  ): Promise<SourceEvidenceReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const items = await this.repository.listSourceEvidenceReviewItems(tx, review.id);
      this.assertDecisionAllowed(status, input, items);

      const now = new Date().toISOString();
      const reviewPatch = this.reviewDecisionPatch(status, input, now);
      const updated = await this.repository.updateSourceEvidenceReviewStatus(tx, {
        ...reviewPatch,
        actor: input.actor,
        causationId: input.causationId,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      const event = await this.insertReviewEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: decisionAction(status),
        fromStatus: review.review_status,
        toStatus: status,
        actor: input.actor,
        detailsJson: input.detailsJson ?? { reason: input.reason ?? null },
        limitationsJson: input.limitationsJson,
        warningsJson: input.warningsJson,
        blockersJson: input.blockersJson,
        aafAuditEventId: input.aafAuditEventId,
        aafApprovalDecisionId: input.aafApprovalDecisionId,
        sourceWatermark: review.source_watermark,
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

  private reviewDecisionPatch(
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
    input: ReviewDecisionInput,
    reviewedAt: string,
  ): UpdateSourceEvidenceReviewStatusInput {
    if (status === "accepted") {
      return {
        reviewId: input.reviewId,
        reviewStatus: "accepted",
        reviewDecision: "accept",
        acceptedDegradedCapture: false,
        retryRequired: false,
        cloneGenerationAllowed: true,
        reviewLimitationsJson: input.limitationsJson ?? [],
        missingEvidenceJson: input.missingEvidenceJson ?? [],
        warningsJson: input.warningsJson,
        blockersJson: input.blockersJson,
        diagnosticsJson: input.diagnosticsJson,
        reviewedAt,
        aafAuditEventId: input.aafAuditEventId,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      };
    }
    if (status === "accepted_with_limitations") {
      return {
        reviewId: input.reviewId,
        reviewStatus: "accepted_with_limitations",
        reviewDecision: "accept_with_limitations",
        acceptedDegradedCapture: true,
        retryRequired: false,
        cloneGenerationAllowed: true,
        reviewLimitationsJson: input.limitationsJson ?? [],
        missingEvidenceJson: input.missingEvidenceJson ?? [],
        warningsJson: input.warningsJson,
        blockersJson: input.blockersJson,
        diagnosticsJson: input.diagnosticsJson,
        reviewedAt,
        aafAuditEventId: input.aafAuditEventId,
        aafApprovalRequestId: input.aafApprovalRequestId,
        aafApprovalDecisionId: input.aafApprovalDecisionId,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      };
    }
    if (status === "retry_required") {
      return {
        reviewId: input.reviewId,
        reviewStatus: "retry_required",
        reviewDecision: "retry_capture",
        acceptedDegradedCapture: false,
        retryRequired: true,
        cloneGenerationAllowed: false,
        missingEvidenceJson: input.missingEvidenceJson ?? [{ reason: input.reason }],
        warningsJson: input.warningsJson,
        blockersJson: input.blockersJson,
        diagnosticsJson: input.diagnosticsJson,
        reviewedAt,
        aafAuditEventId: input.aafAuditEventId,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      };
    }
    if (status === "rejected") {
      return {
        reviewId: input.reviewId,
        reviewStatus: "rejected",
        reviewDecision: "reject_source",
        acceptedDegradedCapture: false,
        retryRequired: false,
        cloneGenerationAllowed: false,
        missingEvidenceJson: input.missingEvidenceJson ?? [{ reason: input.reason }],
        warningsJson: input.warningsJson,
        blockersJson: input.blockersJson,
        diagnosticsJson: input.diagnosticsJson,
        reviewedAt,
        aafAuditEventId: input.aafAuditEventId,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      };
    }
    return {
      reviewId: input.reviewId,
      reviewStatus: "superseded",
      reviewDecision: "supersede",
      acceptedDegradedCapture: false,
      retryRequired: false,
      cloneGenerationAllowed: false,
      supersededByReviewId: input.replacementReviewId,
      reviewedAt,
      aafAuditEventId: input.aafAuditEventId,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private assertDecisionAllowed(
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded",
    input: ReviewDecisionInput,
    items: readonly SingleSiteEvidenceItemRow[],
  ): void {
    if ((status === "accepted" || status === "accepted_with_limitations") && items.length === 0) {
      throw new SingleSiteTransitionError("cannot accept source evidence review with no evidence items");
    }

    const missingRequired = SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES.filter((category) => {
      const item = items.find((candidate) => candidate.evidence_category === category);
      if (!item) return true;
      if (item.required_for_clone === false) return false;
      return ["missing", "degraded", "unverified"].includes(item.status) && !item.accepted_limitation;
    });

    if (status === "accepted" && missingRequired.length > 0) {
      throw new SingleSiteTransitionError(`cannot accept source evidence review with missing evidence: ${missingRequired.join(", ")}`, missingRequired);
    }

    if (status === "accepted_with_limitations") {
      const limitations = arrayValue(input.limitationsJson);
      if (limitations.length === 0) throw new SingleSiteTransitionError("accepted_with_limitations requires limitations");
      if (!input.aafApprovalDecisionId) throw new SingleSiteTransitionError("accepted_with_limitations requires an AAF approval decision ref");
    }
  }

  private async requiredOpenReview(
    tx: Parameters<SingleSiteStateWriterRepository["getSourceEvidenceReviewById"]>[0],
    reviewId: string,
  ): Promise<SingleSiteSourceEvidenceReviewRow> {
    const review = await this.repository.getSourceEvidenceReviewById(tx, requiredText("reviewId", reviewId));
    if (!review) throw new SingleSiteTransitionError(`source evidence review ${reviewId} was not found`);
    if (isTerminalReviewStatus(review.review_status)) throw new SingleSiteTransitionError(`source evidence review ${reviewId} is terminal`);
    return review;
  }

  private async insertReviewEventIfNeeded(
    tx: Parameters<SingleSiteStateWriterRepository["getSourceEvidenceReviewById"]>[0],
    input: ReviewEventWithoutIndex,
  ): Promise<{ id: string; reusedExisting: boolean }> {
    const existing = await this.repository.getSourceEvidenceReviewEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) return { id: existing.id, reusedExisting: true };
    const eventIndex = await this.repository.nextReviewEventIndex(tx, input.reviewId);
    const inserted = await this.repository.insertSourceEvidenceReviewEvent(tx, { ...input, eventIndex });
    return { id: inserted.row.id, reusedExisting: inserted.reusedExisting };
  }
}

export function buildSourceEvidenceReviewer(actorType: SingleSiteActorType, actorId: string, actorRole: string): SingleSiteActorInput {
  return { actorType, actorId, actorRole };
}
