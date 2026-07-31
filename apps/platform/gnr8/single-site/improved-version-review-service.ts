import "server-only";

import { createHash } from "node:crypto";

import {
  SINGLE_SITE_IMPROVED_VERSION_REVIEW_CATEGORIES,
  SINGLE_SITE_IMPROVED_VERSION_REVIEW_SEVERITIES,
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  isSingleSiteTerminalState,
  type SingleSiteImprovedVersionReviewCategory,
  type SingleSiteImprovedVersionReviewDecision,
  type SingleSiteImprovedVersionReviewEventAction,
  type SingleSiteImprovedVersionReviewRefRole,
  type SingleSiteImprovedVersionReviewSeverity,
  type SingleSiteImprovedVersionReviewStatus,
  type SingleSiteJsonObject,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteActorInput,
  type SingleSiteImprovementExecutionAttemptRow,
  type SingleSiteImprovementExecutionItemRow,
  type SingleSiteImprovementExecutionRefRow,
  type SingleSiteMigrationRow,
  type SingleSitePgClient,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

export const IMPROVED_VERSION_REVIEW_SERVICE_VERSION = "mvp-25-improved-version-review-service:v1" as const;

export type ImprovedVersionReviewEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type ImprovedVersionRequiredRefs = {
  proposalPlanId: string;
  proposalApprovalDecisionId: string;
  implementationAuthorizationDecisionId: string;
  executionAttemptId: string;
  improvedCandidateSiteVersionRef: string;
  improvedRuntimeArtifactRef: string;
  cloneSiteVersionRef: string;
  cloneRuntimeArtifactRef: string;
  sourceEvidenceReviewId: string;
  selectedRecommendationRefs: unknown[];
  dryRunPlannedChangeSetRef?: string | null;
};

export type CreateOrReuseImprovedVersionReviewInput = ImprovedVersionReviewEnvelope & {
  migrationId: string;
  clientId: string;
  siteId: string;
  executionAttemptId?: string | null;
  requiredRefs?: Partial<ImprovedVersionRequiredRefs>;
  proposalAlignmentSummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  supersedesReviewId?: string | null;
};

export type RecordImprovedVersionReviewRefInput = ImprovedVersionReviewEnvelope & {
  reviewId: string;
  migrationId: string;
  refRole: SingleSiteImprovedVersionReviewRefRole;
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

export type AddImprovedVersionReviewFindingInput = ImprovedVersionReviewEnvelope & {
  reviewId: string;
  migrationId: string;
  itemKey: string;
  category: SingleSiteImprovedVersionReviewCategory;
  severity: SingleSiteImprovedVersionReviewSeverity;
  status?: "open" | "resolved" | "accepted_limitation" | "superseded" | null;
  blocksAcceptance?: boolean | null;
  acceptedLimitation?: boolean | null;
  requiredRecommendationApplied?: boolean | null;
  recommendationId?: string | null;
  findingSummary: string;
  refIdsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  evidenceJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  semanticWatermark?: string | null;
};

export type ImprovedVersionReviewDecisionInput = ImprovedVersionReviewEnvelope & {
  reviewId: string;
  proposalAlignmentSummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  replacementReviewId?: string | null;
  reason?: string | null;
};

export type SingleSiteImprovedVersionReviewRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  proposal_plan_id: string;
  proposal_approval_decision_id: string;
  implementation_authorization_decision_id: string;
  execution_attempt_id: string;
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  clone_site_version_ref: string;
  clone_runtime_artifact_ref: string;
  source_evidence_review_id: string;
  review_status: SingleSiteImprovedVersionReviewStatus;
  review_decision: SingleSiteImprovedVersionReviewDecision | null;
  content_approval_ready: boolean;
  accepted_with_limitations: boolean;
  retry_required: boolean;
  proposal_alignment_summary_json: unknown;
  selected_recommendation_refs_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  diagnostics_json: unknown;
  non_approval_boundary_json: unknown;
  content_approval_granted: boolean;
  client_approval_granted: boolean;
  launch_approval_granted: boolean;
  publish_activation_approval_granted: boolean;
  active_pointer_changed: boolean;
  runtime_artifacts_mutated: boolean;
  site_versions_mutated: boolean;
  reviewer_actor_type: string | null;
  reviewer_actor_id: string | null;
  reviewer_actor_role: string | null;
  reviewer_actor_display_label: string | null;
  review_started_at: string | null;
  reviewed_at: string | null;
  supersedes_review_id: string | null;
  superseded_by_review_id: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  payload_hash: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovedVersionReviewRefRow = {
  id: string;
  review_id: string;
  migration_id: string;
  ref_role: SingleSiteImprovedVersionReviewRefRole;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  semantic_watermark: string | null;
  content_hash: string | null;
  media_type: string | null;
  captured_at: string | null;
  fresh_until: string | null;
  evidence_only: boolean;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  correlation_id: string;
  idempotency_key: string;
  metadata_json: unknown;
  created_at: string;
};

export type SingleSiteImprovedVersionReviewItemRow = {
  id: string;
  review_id: string;
  migration_id: string;
  item_key: string;
  category: SingleSiteImprovedVersionReviewCategory;
  severity: SingleSiteImprovedVersionReviewSeverity;
  status: "open" | "resolved" | "accepted_limitation" | "superseded";
  blocks_acceptance: boolean;
  accepted_limitation: boolean;
  required_recommendation_applied: boolean | null;
  recommendation_id: string | null;
  finding_summary: string;
  ref_ids_json: unknown;
  limitation_json: unknown;
  evidence_json: unknown;
  details_json: unknown;
  reviewer_actor_type: string | null;
  reviewer_actor_id: string | null;
  reviewer_actor_display_label: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovedVersionReviewEventRow = {
  id: string;
  review_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteImprovedVersionReviewEventAction;
  from_status: SingleSiteImprovedVersionReviewStatus | null;
  to_status: SingleSiteImprovedVersionReviewStatus | null;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  source_watermark: string | null;
  semantic_watermark: string | null;
  payload_hash: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  metadata_json: unknown;
  occurred_at: string;
  created_at: string;
};

export type ImprovedVersionReviewOperationResult = {
  review: SingleSiteImprovedVersionReviewRow;
  eventId?: string;
  reusedExisting: boolean;
};

export type ImprovedVersionContentApprovalReadiness = {
  migrationId: string;
  ready: boolean;
  reviewId: string | null;
  reviewStatus: SingleSiteImprovedVersionReviewStatus | "missing";
  missingRequirements: string[];
  limitations: unknown[];
};

type ReviewEventWithoutIndex = Omit<InsertReviewEventInput, "eventIndex">;
type InsertableRow = Record<string, unknown>;

type InsertReviewEventInput = ImprovedVersionReviewEnvelope & {
  reviewId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteImprovedVersionReviewEventAction;
  fromStatus?: SingleSiteImprovedVersionReviewStatus | null;
  toStatus?: SingleSiteImprovedVersionReviewStatus | null;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  sourceWatermark?: string | null;
  semanticWatermark?: string | null;
  payloadHash?: string | null;
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
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue((value as Record<string, unknown>)[key]);
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

function toPg(value: unknown): unknown {
  if (value === undefined) return null;
  if (value && typeof value === "object" && !(value instanceof Date)) return JSON.stringify(stableJsonValue(value));
  return value;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function reviewWatermark(input: ImprovedVersionRequiredRefs): string {
  return `single-site-improved-version-review:${digest(input)}`;
}

function assertSemanticMatch(tableName: string, idempotencyKey: string, attempted: InsertableRow, existing: InsertableRow, fields: readonly string[]): void {
  const drifted = fields.filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError(tableName, idempotencyKey, drifted);
}

async function insertReturning<T extends Record<string, unknown>>(
  client: SingleSitePgClient,
  tableName: string,
  row: InsertableRow,
  semanticFields: readonly string[],
): Promise<{ row: T; reusedExisting: boolean }> {
  const payload = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
  const columns = Object.keys(payload);
  const values = columns.map((column) => toPg(payload[column]));
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const inserted = await client.query(
    `insert into public.${tableName} (${columns.join(", ")})
     values (${placeholders.join(", ")})
     on conflict (idempotency_key) do nothing
     returning *`,
    values,
  );
  if (inserted.rows[0]) return { row: inserted.rows[0] as T, reusedExisting: false };
  const existing = await client.query(`select * from public.${tableName} where idempotency_key = $1 limit 1`, [requiredText("idempotency_key", row.idempotency_key)]);
  const existingRow = existing.rows[0] as T | undefined;
  if (!existingRow) throw new SingleSiteTransitionError(`idempotent insert into ${tableName} did not find existing row`);
  assertSemanticMatch(tableName, String(row.idempotency_key), payload, existingRow, semanticFields);
  return { row: existingRow, reusedExisting: true };
}

function decisionFor(status: SingleSiteImprovedVersionReviewStatus): SingleSiteImprovedVersionReviewDecision | null {
  if (status === "accepted") return "accept";
  if (status === "accepted_with_limitations") return "accept_with_limitations";
  if (status === "retry_required") return "retry_improvement";
  if (status === "rejected") return "reject_improved_version";
  if (status === "superseded") return "supersede";
  if (status === "cancelled") return "cancel";
  return null;
}

function eventAction(status: SingleSiteImprovedVersionReviewStatus): SingleSiteImprovedVersionReviewEventAction {
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "in_review") return "review_started";
  if (status === "cancelled") return "cancelled";
  if (status === "accepted_with_limitations") return "accepted_with_limitations";
  if (status === "retry_required") return "retry_required";
  if (status === "accepted" || status === "rejected" || status === "superseded") return status;
  return "ref_added";
}

function terminalStatus(status: SingleSiteImprovedVersionReviewStatus): boolean {
  return ["accepted", "accepted_with_limitations", "retry_required", "rejected", "superseded", "cancelled"].includes(status);
}

function requiredRefsFromAttempt(attempt: SingleSiteImprovementExecutionAttemptRow, input: CreateOrReuseImprovedVersionReviewInput): ImprovedVersionRequiredRefs {
  const output = jsonObject(attempt.output_refs_json);
  return {
    proposalPlanId: requiredText("proposal plan ref", input.requiredRefs?.proposalPlanId ?? attempt.proposal_plan_id),
    proposalApprovalDecisionId: requiredText("proposal approval decision ref", input.requiredRefs?.proposalApprovalDecisionId ?? attempt.proposal_approval_decision_id),
    implementationAuthorizationDecisionId: requiredText(
      "implementation authorization decision ref",
      input.requiredRefs?.implementationAuthorizationDecisionId ?? attempt.implementation_authorization_decision_id,
    ),
    executionAttemptId: requiredText("execution attempt ref", input.requiredRefs?.executionAttemptId ?? attempt.id),
    improvedCandidateSiteVersionRef: requiredText(
      "improved candidate site version ref",
      input.requiredRefs?.improvedCandidateSiteVersionRef ?? attempt.improved_candidate_site_version_ref,
    ),
    improvedRuntimeArtifactRef: requiredText("improved runtime artifact ref", input.requiredRefs?.improvedRuntimeArtifactRef ?? attempt.improved_runtime_artifact_ref),
    cloneSiteVersionRef: requiredText("clone site version ref", input.requiredRefs?.cloneSiteVersionRef ?? attempt.clone_site_version_ref),
    cloneRuntimeArtifactRef: requiredText("clone runtime artifact ref", input.requiredRefs?.cloneRuntimeArtifactRef ?? attempt.clone_runtime_artifact_ref),
    sourceEvidenceReviewId: requiredText("source evidence review ref", input.requiredRefs?.sourceEvidenceReviewId ?? attempt.source_evidence_review_id),
    selectedRecommendationRefs: jsonArray(input.requiredRefs?.selectedRecommendationRefs ?? attempt.selected_recommendation_refs_json),
    dryRunPlannedChangeSetRef: optionalText(input.requiredRefs?.dryRunPlannedChangeSetRef ?? output.plannedChangeSetRef ?? output.expectedPlannedChangeSetRef),
  };
}

function hasRequiredReviewRefs(refs: readonly SingleSiteImprovedVersionReviewRefRow[]): boolean {
  const roles = new Set(refs.map((ref) => ref.ref_role));
  return [
    "migration",
    "client",
    "site",
    "proposal_plan",
    "proposal_approval",
    "implementation_authorization",
    "execution_attempt",
    "improved_candidate_site_version",
    "improved_runtime_artifact",
    "clone_site_version",
    "clone_runtime_artifact",
    "selected_recommendation",
    "source_evidence_review",
  ].every((role) => roles.has(role as SingleSiteImprovedVersionReviewRefRole));
}

function assertEventSemanticMatch(event: SingleSiteImprovedVersionReviewEventRow, input: ReviewEventWithoutIndex): void {
  const attempted: Record<string, unknown> = {
    review_id: input.reviewId,
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
    blockers_json: input.blockersJson ?? [],
    source_watermark: input.sourceWatermark ?? null,
    semantic_watermark: input.semanticWatermark ?? null,
    payload_hash: input.payloadHash ?? null,
    privacy_label: input.privacyLabel ?? "client_confidential",
    retention_class: input.retentionClass ?? "compliance_long",
    metadata_json: input.metadataJson ?? {},
  };
  const existing = event as unknown as Record<string, unknown>;
  const drifted = Object.keys(attempted).filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError("gnr8_single_site_improved_version_review_events", input.idempotencyKey, drifted);
}

export class ImprovedVersionReviewService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createOrReuseReview(input: CreateOrReuseImprovedVersionReviewInput): Promise<ImprovedVersionReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const migration = await this.requiredNonTerminalMigration(tx, input.migrationId);
      if (migration.client_id !== requiredText("clientId", input.clientId)) throw new SingleSiteTransitionError("review clientId does not match migration");
      if ((migration.site_id ?? "") !== requiredText("siteId", input.siteId)) throw new SingleSiteTransitionError("review siteId does not match migration");
      const attempt = await this.requiredCompletedAttempt(tx, input.executionAttemptId ?? undefined, migration.id);
      const refs = requiredRefsFromAttempt(attempt, input);
      if (refs.selectedRecommendationRefs.length === 0) throw new SingleSiteTransitionError("selected recommendation refs are required");

      const existing = await this.findReviewBySemanticRefs(tx, migration.id, refs);
      const created = existing
        ? { row: existing, reusedExisting: true }
        : await this.insertReview(tx, {
            migration,
            refs,
            input,
            attempt,
          });
      const event = await this.insertEventIfNeeded(tx, {
        reviewId: created.row.id,
        migrationId: migration.id,
        eventAction: "created",
        fromStatus: null,
        toStatus: created.row.review_status,
        actor: input.actor,
        detailsJson: {
          executionAttemptId: refs.executionAttemptId,
          improvedCandidateSiteVersionRef: refs.improvedCandidateSiteVersionRef,
          improvedRuntimeArtifactRef: refs.improvedRuntimeArtifactRef,
        },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:created`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      await this.recordRequiredRefs(tx, created.row, refs, input);
      await this.ensureReviewRequiredState(tx, migration, created.row, attempt, input);
      return { review: created.row, eventId: event.id, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async recordRef(input: RecordImprovedVersionReviewRefInput): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const ref = await this.insertReviewRef(tx, input);
      const event = await this.insertEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: "ref_added",
        fromStatus: review.review_status,
        toStatus: review.review_status,
        actor: input.actor,
        detailsJson: { refRole: input.refRole, sourceRecordId: input.sourceRecordId },
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

  async addFinding(input: AddImprovedVersionReviewFindingInput): Promise<{ item: SingleSiteImprovedVersionReviewItemRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const item = await this.upsertReviewItem(tx, review, input);
      const event = await this.insertEventIfNeeded(tx, {
        reviewId: review.id,
        migrationId: review.migration_id,
        eventAction: "finding_added",
        fromStatus: review.review_status,
        toStatus: review.review_status,
        actor: input.actor,
        detailsJson: { itemKey: input.itemKey, category: input.category, severity: input.severity, status: input.status ?? "open" },
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

  async markReadyForReview(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    return this.moveStatus(input, "ready_for_review");
  }

  async startReview(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    return this.moveStatus(input, "in_review", { reviewStartedAt: new Date().toISOString() });
  }

  async accept(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    return this.recordDecision(input, "accepted");
  }

  async acceptWithLimitations(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    return this.recordDecision(input, "accepted_with_limitations");
  }

  async requireRetry(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "retry_required");
  }

  async reject(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "rejected");
  }

  async cancel(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "cancelled");
  }

  async supersede(input: ImprovedVersionReviewDecisionInput): Promise<ImprovedVersionReviewOperationResult> {
    if (!input.replacementReviewId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement review ref or reason");
    return this.recordDecision(input, "superseded");
  }

  async readLatestImprovedVersionReviewForMigration(migrationId: string): Promise<SingleSiteImprovedVersionReviewRow | null> {
    return this.repository.withTransaction((tx) => this.getLatestReviewForMigration(tx, requiredText("migrationId", migrationId)));
  }

  async getContentApprovalReadiness(migrationId: string): Promise<ImprovedVersionContentApprovalReadiness> {
    return this.repository.withTransaction(async (tx) => {
      const latest = await this.getLatestReviewForMigration(tx, requiredText("migrationId", migrationId));
      if (!latest) {
        return { migrationId, ready: false, reviewId: null, reviewStatus: "missing", missingRequirements: ["accepted_improved_version_review"], limitations: [] };
      }
      const refs = await this.listReviewRefs(tx, latest.id);
      const ready = latest.content_approval_ready && ["accepted", "accepted_with_limitations"].includes(latest.review_status) && hasRequiredReviewRefs(refs);
      return {
        migrationId,
        ready,
        reviewId: latest.id,
        reviewStatus: latest.review_status,
        missingRequirements: ready
          ? []
          : [
              latest.content_approval_ready ? null : "accepted_improved_version_review",
              hasRequiredReviewRefs(refs) ? null : "required_improved_version_review_refs",
            ].filter((value): value is string => Boolean(value)),
        limitations: jsonArray(latest.limitations_json),
      };
    });
  }

  private async insertReview(
    tx: SingleSiteStateWriterTx,
    context: {
      migration: SingleSiteMigrationRow;
      attempt: SingleSiteImprovementExecutionAttemptRow;
      refs: ImprovedVersionRequiredRefs;
      input: CreateOrReuseImprovedVersionReviewInput;
    },
  ): Promise<{ row: SingleSiteImprovedVersionReviewRow; reusedExisting: boolean }> {
    const { migration, input, refs } = context;
    return insertReturning<SingleSiteImprovedVersionReviewRow>(
      tx,
      "gnr8_single_site_improved_version_reviews",
      {
        migration_id: migration.id,
        client_id: input.clientId,
        site_id: input.siteId,
        proposal_plan_id: refs.proposalPlanId,
        proposal_approval_decision_id: refs.proposalApprovalDecisionId,
        implementation_authorization_decision_id: refs.implementationAuthorizationDecisionId,
        execution_attempt_id: refs.executionAttemptId,
        improved_candidate_site_version_ref: refs.improvedCandidateSiteVersionRef,
        improved_runtime_artifact_ref: refs.improvedRuntimeArtifactRef,
        clone_site_version_ref: refs.cloneSiteVersionRef,
        clone_runtime_artifact_ref: refs.cloneRuntimeArtifactRef,
        source_evidence_review_id: refs.sourceEvidenceReviewId,
        review_status: "draft",
        proposal_alignment_summary_json: input.proposalAlignmentSummaryJson ?? {},
        selected_recommendation_refs_json: refs.selectedRecommendationRefs,
        limitations_json: input.limitationsJson ?? jsonArray(context.attempt.limitations_json),
        warnings_json: input.warningsJson ?? [],
        blockers_json: input.blockersJson ?? [],
        diagnostics_json: input.diagnosticsJson ?? {},
        supersedes_review_id: optionalText(input.supersedesReviewId),
        correlation_id: input.correlationId,
        causation_id: optionalText(input.causationId),
        idempotency_key: input.idempotencyKey,
        request_id: optionalText(input.requestId),
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        semantic_watermark: reviewWatermark(refs),
        metadata_json: {
          ...input.metadataJson,
          serviceVersion: IMPROVED_VERSION_REVIEW_SERVICE_VERSION,
          contentApprovalGranted: false,
          clientApprovalGranted: false,
          launchApprovalGranted: false,
          publishApprovalGranted: false,
          activePointerChanged: false,
          runtimeMutationPerformedByReview: false,
        },
      },
      [
        "migration_id",
        "client_id",
        "site_id",
        "proposal_plan_id",
        "proposal_approval_decision_id",
        "implementation_authorization_decision_id",
        "execution_attempt_id",
        "improved_candidate_site_version_ref",
        "improved_runtime_artifact_ref",
        "clone_site_version_ref",
        "clone_runtime_artifact_ref",
        "source_evidence_review_id",
        "review_status",
        "proposal_alignment_summary_json",
        "selected_recommendation_refs_json",
        "limitations_json",
        "warnings_json",
        "blockers_json",
        "diagnostics_json",
        "supersedes_review_id",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ],
    );
  }

  private async recordRequiredRefs(
    tx: SingleSiteStateWriterTx,
    review: SingleSiteImprovedVersionReviewRow,
    refs: ImprovedVersionRequiredRefs,
    input: CreateOrReuseImprovedVersionReviewInput,
  ): Promise<void> {
    const base = {
      reviewId: review.id,
      migrationId: review.migration_id,
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
      semanticWatermark: review.semantic_watermark,
    };
    const refRows: Array<[SingleSiteImprovedVersionReviewRefRole, string, string, string | null, string]> = [
      ["migration", "single_site_migration", review.migration_id, "gnr8_single_site_migrations", "migration"],
      ["client", "client", review.client_id, null, "client"],
      ["site", "site", review.site_id, null, "site"],
      ["proposal_plan", "improvement_proposal_plan", refs.proposalPlanId, "gnr8_single_site_improvement_proposal_plans", "proposal_plan"],
      ["proposal_approval", "aaf_approval_decision", refs.proposalApprovalDecisionId, "gnr8_aaf_approval_decisions", "proposal_approval"],
      ["implementation_authorization", "aaf_approval_decision", refs.implementationAuthorizationDecisionId, "gnr8_aaf_approval_decisions", "implementation_authorization"],
      ["execution_attempt", "improvement_execution_attempt", refs.executionAttemptId, "gnr8_single_site_improvement_execution_attempts", "execution_attempt"],
      ["improved_candidate_site_version", "runtime_site_version_improved_candidate", refs.improvedCandidateSiteVersionRef, "gnr8_runtime_site_versions", "improved_candidate_site_version"],
      ["improved_runtime_artifact", "runtime_artifact_improved_candidate", refs.improvedRuntimeArtifactRef, "gnr8_runtime_artifacts", "improved_runtime_artifact"],
      ["clone_site_version", "runtime_site_version_clone", refs.cloneSiteVersionRef, "gnr8_runtime_site_versions", "clone_site_version"],
      ["clone_runtime_artifact", "runtime_artifact_clone", refs.cloneRuntimeArtifactRef, "gnr8_runtime_artifacts", "clone_runtime_artifact"],
      ["source_evidence_review", "source_evidence_review", refs.sourceEvidenceReviewId, "gnr8_single_site_source_evidence_reviews", "source_evidence_review"],
    ];
    if (refs.dryRunPlannedChangeSetRef) {
      refRows.push(["dry_run_planned_change_set", "improved_candidate_dry_run_planned_change_set", refs.dryRunPlannedChangeSetRef, null, "dry_run_planned_change_set"]);
    }
    for (const [role, refType, sourceRecordId, sourceTable, key] of refRows) {
      await this.insertReviewRef(tx, {
        ...base,
        refRole: role,
        refType,
        sourceTable,
        sourceRecordId,
        idempotencyKey: `${input.idempotencyKey}:ref:${key}`,
      });
    }
    for (const [index, recommendation] of refs.selectedRecommendationRefs.entries()) {
      const record = jsonObject(recommendation);
      await this.insertReviewRef(tx, {
        ...base,
        refRole: "selected_recommendation",
        refType: "improvement_proposal_recommendation",
        sourceTable: optionalText(record.sourceTable) ?? "gnr8_single_site_improvement_proposal_recommendations",
        sourceRecordId: requiredText("selected recommendation sourceRecordId", record.sourceRecordId ?? record.recommendationId),
        sourceWatermark: optionalText(record.sourceWatermark),
        contentHash: optionalText(record.contentHash),
        idempotencyKey: `${input.idempotencyKey}:ref:selected_recommendation:${index + 1}`,
        metadataJson: { ...input.metadataJson, recommendationKey: record.recommendationKey ?? null },
      });
    }
    await this.repository.insertMigrationRef(tx, {
      migrationId: review.migration_id,
      refRole: "improved_version_review",
      refType: "improved_version_review",
      sourceTable: "gnr8_single_site_improved_version_reviews",
      sourceRecordId: review.id,
      sourceWatermark: review.semantic_watermark,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: {
        improvedCandidateSiteVersionRef: review.improved_candidate_site_version_ref,
        improvedRuntimeArtifactRef: review.improved_runtime_artifact_ref,
        contentApprovalGranted: false,
      },
      idempotencyKey: `${input.idempotencyKey}:migration_ref:improved_version_review`,
    });
  }

  private async ensureReviewRequiredState(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    review: SingleSiteImprovedVersionReviewRow,
    attempt: SingleSiteImprovementExecutionAttemptRow,
    input: CreateOrReuseImprovedVersionReviewInput,
  ): Promise<void> {
    if (migration.current_state === "improved_version_review_required") {
      await this.repository.upsertStageSummary(tx, {
        migrationId: migration.id,
        stage: "improvement_content",
        status: attempt.status === "completed_with_limitations" ? "accepted_with_limitations" : "ready_for_review",
        summaryJson: { latestImprovedVersionReviewId: review.id, improvedCandidateSiteVersionRef: review.improved_candidate_site_version_ref },
        limitationsJson: jsonArray(review.limitations_json),
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:stage:improved_version_review_required`,
      });
      return;
    }
    if (migration.current_state !== "improvement_implementation_completed") return;
    const stateEvent = await this.repository.insertStateEvent(tx, {
      migrationId: migration.id,
      eventIndex: await this.repository.nextStateEventIndex(tx, migration.id),
      fromState: migration.current_state,
      toState: "improved_version_review_required",
      transitionKey: "improved_version_review_service.review_required",
      transitionReason: "improved_candidate_creation_completed_review_required",
      requiredRefsJson: {
        reviewId: review.id,
        executionAttemptId: attempt.id,
        improvedCandidateSiteVersionRef: review.improved_candidate_site_version_ref,
        improvedRuntimeArtifactRef: review.improved_runtime_artifact_ref,
      },
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state:improved_version_review_required`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: { ...input.metadataJson, contentApprovalGranted: false },
    });
    await this.repository.updateMigrationCurrentState(tx, {
      migrationId: migration.id,
      toState: "improved_version_review_required",
      latestStateEventId: stateEvent.row.id,
    });
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "improvement_content",
      status: "ready_for_review",
      latestStateEventId: stateEvent.row.id,
      summaryJson: { latestImprovedVersionReviewId: review.id, improvedCandidateSiteVersionRef: review.improved_candidate_site_version_ref },
      limitationsJson: jsonArray(review.limitations_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:improved_version_review_required`,
    });
  }

  private async moveStatus(
    input: ImprovedVersionReviewDecisionInput,
    status: SingleSiteImprovedVersionReviewStatus,
    patch: { reviewStartedAt?: string | null } = {},
  ): Promise<ImprovedVersionReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const review = await this.requiredOpenReview(tx, input.reviewId);
      await this.requiredNonTerminalMigration(tx, review.migration_id);
      const updated = await this.updateReviewStatus(tx, review, input, status, patch);
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
    input: ImprovedVersionReviewDecisionInput,
    status: "accepted" | "accepted_with_limitations" | "retry_required" | "rejected" | "superseded" | "cancelled",
  ): Promise<ImprovedVersionReviewOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const reviewMaybe = await this.getReviewById(tx, requiredText("reviewId", input.reviewId));
      if (!reviewMaybe) throw new SingleSiteTransitionError(`improved version review ${input.reviewId} was not found`);
      const eventKey = `${input.idempotencyKey}:event:${status}`;
      const existingEvent = await this.getReviewEventByIdempotencyKey(tx, eventKey);
      if (existingEvent) {
        assertEventSemanticMatch(existingEvent, {
          reviewId: reviewMaybe.id,
          migrationId: reviewMaybe.migration_id,
          eventAction: eventAction(status),
          fromStatus: reviewMaybe.review_status,
          toStatus: status,
          actor: input.actor,
          detailsJson: input.detailsJson ?? { reason: input.reason ?? null, replacementReviewId: input.replacementReviewId ?? null },
          limitationsJson: input.limitationsJson,
          warningsJson: input.warningsJson,
          blockersJson: input.blockersJson,
          correlationId: input.correlationId,
          causationId: input.causationId,
          idempotencyKey: eventKey,
          requestId: input.requestId,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
          metadataJson: input.metadataJson,
        });
        return { review: reviewMaybe, eventId: existingEvent.id, reusedExisting: true };
      }
      const review = await this.requiredOpenReview(tx, input.reviewId);
      const migration = await this.requiredNonTerminalMigration(tx, review.migration_id);
      const items = await this.listReviewItems(tx, review.id);
      const refs = await this.listReviewRefs(tx, review.id);
      this.assertDecisionAllowed(status, input, items, refs);
      const updated = await this.updateReviewStatus(tx, review, input, status, {
        reviewedAt: new Date().toISOString(),
        supersededByReviewId: status === "superseded" ? input.replacementReviewId : undefined,
      });
      const event = await this.insertEventIfNeeded(tx, {
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
        idempotencyKey: eventKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      if (status === "superseded") {
        await this.insertSupersession(tx, review, input);
      }
      await this.upsertDecisionStageSummary(tx, migration, updated, input);
      return { review: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private assertDecisionAllowed(
    status: SingleSiteImprovedVersionReviewStatus,
    input: ImprovedVersionReviewDecisionInput,
    items: readonly SingleSiteImprovedVersionReviewItemRow[],
    refs: readonly SingleSiteImprovedVersionReviewRefRow[],
  ): void {
    if (!hasRequiredReviewRefs(refs)) throw new SingleSiteTransitionError("improved version review requires all canonical refs before decision");
    if (status === "accepted" || status === "accepted_with_limitations") {
      const unresolvedP0 = items.filter((item) => item.status === "open" && item.severity === "p0_blocker" && !item.accepted_limitation);
      if (unresolvedP0.length > 0) throw new SingleSiteTransitionError("cannot accept improved version review with unresolved p0 blockers");
      const missingRequiredRecommendations = items.filter(
        (item) =>
          item.category === "proposal_alignment" &&
          item.required_recommendation_applied === false &&
          item.status === "open" &&
          !item.accepted_limitation &&
          Object.keys(jsonObject(item.limitation_json)).length === 0,
      );
      if (missingRequiredRecommendations.length > 0) {
        throw new SingleSiteTransitionError("cannot accept when required recommendations are not applied without limitation or exception");
      }
    }
    if (status === "accepted_with_limitations" && jsonArray(input.limitationsJson).length === 0) {
      throw new SingleSiteTransitionError("accepted_with_limitations requires limitations");
    }
  }

  private async requiredNonTerminalMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot change improved version review`);
    return migration;
  }

  private async requiredCompletedAttempt(tx: SingleSiteStateWriterTx, attemptId: string | undefined, migrationId: string): Promise<SingleSiteImprovementExecutionAttemptRow> {
    const attempt = attemptId
      ? await this.repository.getImprovementExecutionAttemptById(tx, requiredText("executionAttemptId", attemptId))
      : await this.repository.getLatestImprovementExecutionAttemptForMigration(tx, migrationId);
    if (!attempt || attempt.migration_id !== migrationId) throw new SingleSiteTransitionError("completed execution attempt ref is required");
    if (!["completed", "completed_with_limitations"].includes(attempt.status)) {
      throw new SingleSiteTransitionError("review requires completed or completed_with_limitations execution attempt");
    }
    if (!optionalText(attempt.improved_candidate_site_version_ref) || !optionalText(attempt.improved_runtime_artifact_ref)) {
      throw new SingleSiteTransitionError("review requires improved candidate refs");
    }
    return attempt;
  }

  private async requiredOpenReview(tx: SingleSiteStateWriterTx, reviewId: string): Promise<SingleSiteImprovedVersionReviewRow> {
    const review = await this.getReviewById(tx, requiredText("reviewId", reviewId));
    if (!review) throw new SingleSiteTransitionError(`improved version review ${reviewId} was not found`);
    if (terminalStatus(review.review_status)) throw new SingleSiteTransitionError(`improved version review ${reviewId} is terminal`);
    return review;
  }

  private async findReviewBySemanticRefs(tx: SingleSitePgClient, migrationId: string, refs: ImprovedVersionRequiredRefs): Promise<SingleSiteImprovedVersionReviewRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_improved_version_reviews
      where migration_id = $1::uuid
        and execution_attempt_id = $2::uuid
        and improved_candidate_site_version_ref = $3
        and improved_runtime_artifact_ref = $4
      order by created_at asc
      limit 1
      `,
      [migrationId, refs.executionAttemptId, refs.improvedCandidateSiteVersionRef, refs.improvedRuntimeArtifactRef],
    );
    return (result.rows[0] as SingleSiteImprovedVersionReviewRow | undefined) ?? null;
  }

  private async getReviewById(tx: SingleSitePgClient, reviewId: string): Promise<SingleSiteImprovedVersionReviewRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_improved_version_reviews where id = $1::uuid limit 1", [reviewId]);
    return (result.rows[0] as SingleSiteImprovedVersionReviewRow | undefined) ?? null;
  }

  private async getLatestReviewForMigration(tx: SingleSitePgClient, migrationId: string): Promise<SingleSiteImprovedVersionReviewRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_improved_version_reviews
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [migrationId],
    );
    return (result.rows[0] as SingleSiteImprovedVersionReviewRow | undefined) ?? null;
  }

  private async insertReviewRef(tx: SingleSitePgClient, input: RecordImprovedVersionReviewRefInput): Promise<{ row: SingleSiteImprovedVersionReviewRefRow; reusedExisting: boolean }> {
    return insertReturning<SingleSiteImprovedVersionReviewRefRow>(
      tx,
      "gnr8_single_site_improved_version_review_refs",
      {
        review_id: requiredText("reviewId", input.reviewId),
        migration_id: requiredText("migrationId", input.migrationId),
        ref_role: requiredText("refRole", input.refRole),
        ref_type: requiredText("refType", input.refType),
        source_system: optionalText(input.sourceSystem) ?? "gnr8",
        source_table: optionalText(input.sourceTable),
        source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
        source_version: optionalText(input.sourceVersion),
        source_watermark: optionalText(input.sourceWatermark),
        semantic_watermark: optionalText(input.semanticWatermark),
        content_hash: optionalText(input.contentHash),
        media_type: optionalText(input.mediaType),
        captured_at: optionalText(input.capturedAt),
        fresh_until: optionalText(input.freshUntil),
        evidence_only: input.evidenceOnly ?? true,
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        correlation_id: input.correlationId,
        idempotency_key: input.idempotencyKey,
        metadata_json: input.metadataJson ?? {},
      },
      [
        "review_id",
        "migration_id",
        "ref_role",
        "ref_type",
        "source_system",
        "source_table",
        "source_record_id",
        "source_version",
        "source_watermark",
        "semantic_watermark",
        "content_hash",
        "media_type",
        "captured_at",
        "fresh_until",
        "evidence_only",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    );
  }

  private async upsertReviewItem(
    tx: SingleSitePgClient,
    review: SingleSiteImprovedVersionReviewRow,
    input: AddImprovedVersionReviewFindingInput,
  ): Promise<SingleSiteImprovedVersionReviewItemRow> {
    if (!SINGLE_SITE_IMPROVED_VERSION_REVIEW_CATEGORIES.includes(input.category)) throw new SingleSiteTransitionError(`unsupported review category ${input.category}`);
    if (!SINGLE_SITE_IMPROVED_VERSION_REVIEW_SEVERITIES.includes(input.severity)) throw new SingleSiteTransitionError(`unsupported review severity ${input.severity}`);
    const attempted = {
      review_id: review.id,
      migration_id: review.migration_id,
      item_key: requiredText("itemKey", input.itemKey),
      category: input.category,
      severity: input.severity,
      status: input.status ?? "open",
      blocks_acceptance: input.blocksAcceptance ?? input.severity === "p0_blocker",
      accepted_limitation: input.acceptedLimitation ?? false,
      required_recommendation_applied: input.requiredRecommendationApplied ?? null,
      recommendation_id: optionalText(input.recommendationId),
      finding_summary: requiredText("findingSummary", input.findingSummary),
      ref_ids_json: input.refIdsJson ?? [],
      limitation_json: input.limitationJson ?? {},
      evidence_json: input.evidenceJson ?? {},
      details_json: input.detailsJson ?? {},
      reviewer_actor_type: input.actor.actorType,
      reviewer_actor_id: input.actor.actorId,
      reviewer_actor_display_label: input.actor.actorDisplayLabel ?? null,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      privacy_label: input.privacyLabel ?? "client_confidential",
      retention_class: input.retentionClass ?? "compliance_long",
      semantic_watermark: optionalText(input.semanticWatermark),
      metadata_json: input.metadataJson ?? {},
    };
    const existing = await tx.query("select * from public.gnr8_single_site_improved_version_review_items where idempotency_key = $1 limit 1", [attempted.idempotency_key]);
    if (existing.rows[0]) {
      assertSemanticMatch("gnr8_single_site_improved_version_review_items", attempted.idempotency_key, attempted, existing.rows[0], [
        "review_id",
        "migration_id",
        "item_key",
        "category",
        "severity",
        "status",
        "blocks_acceptance",
        "accepted_limitation",
        "required_recommendation_applied",
        "recommendation_id",
        "finding_summary",
        "ref_ids_json",
        "limitation_json",
        "evidence_json",
        "details_json",
        "reviewer_actor_type",
        "reviewer_actor_id",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ]);
      return existing.rows[0] as SingleSiteImprovedVersionReviewItemRow;
    }
    const result = await tx.query(
      `
      insert into public.gnr8_single_site_improved_version_review_items (
        review_id, migration_id, item_key, category, severity, status, blocks_acceptance, accepted_limitation,
        required_recommendation_applied, recommendation_id, finding_summary, ref_ids_json, limitation_json, evidence_json,
        details_json, reviewer_actor_type, reviewer_actor_id, reviewer_actor_display_label, correlation_id, idempotency_key,
        privacy_label, retention_class, semantic_watermark, metadata_json
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::uuid, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb)
      on conflict (review_id, item_key) do update set
        category = excluded.category,
        severity = excluded.severity,
        status = excluded.status,
        blocks_acceptance = excluded.blocks_acceptance,
        accepted_limitation = excluded.accepted_limitation,
        required_recommendation_applied = excluded.required_recommendation_applied,
        recommendation_id = excluded.recommendation_id,
        finding_summary = excluded.finding_summary,
        ref_ids_json = excluded.ref_ids_json,
        limitation_json = excluded.limitation_json,
        evidence_json = excluded.evidence_json,
        details_json = excluded.details_json,
        reviewer_actor_type = excluded.reviewer_actor_type,
        reviewer_actor_id = excluded.reviewer_actor_id,
        reviewer_actor_display_label = excluded.reviewer_actor_display_label,
        semantic_watermark = excluded.semantic_watermark,
        metadata_json = excluded.metadata_json,
        updated_at = now()
      returning *
      `,
      [
        attempted.review_id,
        attempted.migration_id,
        attempted.item_key,
        attempted.category,
        attempted.severity,
        attempted.status,
        attempted.blocks_acceptance,
        attempted.accepted_limitation,
        attempted.required_recommendation_applied,
        attempted.recommendation_id,
        attempted.finding_summary,
        toPg(attempted.ref_ids_json),
        toPg(attempted.limitation_json),
        toPg(attempted.evidence_json),
        toPg(attempted.details_json),
        attempted.reviewer_actor_type,
        attempted.reviewer_actor_id,
        attempted.reviewer_actor_display_label,
        attempted.correlation_id,
        attempted.idempotency_key,
        attempted.privacy_label,
        attempted.retention_class,
        attempted.semantic_watermark,
        toPg(attempted.metadata_json),
      ],
    );
    return result.rows[0] as SingleSiteImprovedVersionReviewItemRow;
  }

  private async listReviewItems(tx: SingleSitePgClient, reviewId: string): Promise<SingleSiteImprovedVersionReviewItemRow[]> {
    const result = await tx.query("select * from public.gnr8_single_site_improved_version_review_items where review_id = $1::uuid order by item_key asc", [reviewId]);
    return result.rows as SingleSiteImprovedVersionReviewItemRow[];
  }

  private async listReviewRefs(tx: SingleSitePgClient, reviewId: string): Promise<SingleSiteImprovedVersionReviewRefRow[]> {
    const result = await tx.query("select * from public.gnr8_single_site_improved_version_review_refs where review_id = $1::uuid order by created_at asc, ref_role asc", [reviewId]);
    return result.rows as SingleSiteImprovedVersionReviewRefRow[];
  }

  private async updateReviewStatus(
    tx: SingleSitePgClient,
    review: SingleSiteImprovedVersionReviewRow,
    input: ImprovedVersionReviewDecisionInput,
    status: SingleSiteImprovedVersionReviewStatus,
    patch: { reviewStartedAt?: string | null; reviewedAt?: string | null; supersededByReviewId?: string | null } = {},
  ): Promise<SingleSiteImprovedVersionReviewRow> {
    const result = await tx.query(
      `
      update public.gnr8_single_site_improved_version_reviews
      set
        review_status = $2,
        review_decision = $3,
        content_approval_ready = $4,
        accepted_with_limitations = $5,
        retry_required = $6,
        proposal_alignment_summary_json = coalesce($7::jsonb, proposal_alignment_summary_json),
        limitations_json = coalesce($8::jsonb, limitations_json),
        warnings_json = coalesce($9::jsonb, warnings_json),
        blockers_json = coalesce($10::jsonb, blockers_json),
        diagnostics_json = coalesce($11::jsonb, diagnostics_json),
        reviewer_actor_type = coalesce($12, reviewer_actor_type),
        reviewer_actor_id = coalesce($13, reviewer_actor_id),
        reviewer_actor_role = coalesce($14, reviewer_actor_role),
        reviewer_actor_display_label = coalesce($15, reviewer_actor_display_label),
        review_started_at = coalesce($16::timestamptz, review_started_at),
        reviewed_at = coalesce($17::timestamptz, reviewed_at),
        superseded_by_review_id = coalesce($18::uuid, superseded_by_review_id),
        updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        review.id,
        status,
        decisionFor(status),
        status === "accepted" || status === "accepted_with_limitations",
        status === "accepted_with_limitations",
        status === "retry_required",
        input.proposalAlignmentSummaryJson === undefined ? null : toPg(input.proposalAlignmentSummaryJson),
        input.limitationsJson === undefined ? null : toPg(input.limitationsJson),
        input.warningsJson === undefined ? null : toPg(input.warningsJson),
        input.blockersJson === undefined ? null : toPg(input.blockersJson),
        input.diagnosticsJson === undefined ? null : toPg(input.diagnosticsJson),
        input.actor.actorType,
        input.actor.actorId,
        input.actor.actorRole,
        input.actor.actorDisplayLabel ?? null,
        patch.reviewStartedAt ?? null,
        patch.reviewedAt ?? null,
        patch.supersededByReviewId ?? null,
      ],
    );
    const row = result.rows[0] as SingleSiteImprovedVersionReviewRow | undefined;
    if (!row) throw new SingleSiteTransitionError("improved version review status update did not return a row");
    return row;
  }

  private async insertEventIfNeeded(tx: SingleSitePgClient, input: Omit<InsertReviewEventInput, "eventIndex">): Promise<SingleSiteImprovedVersionReviewEventRow & { reusedExisting: boolean }> {
    const existing = await this.getReviewEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      assertEventSemanticMatch(existing, input);
      return { ...existing, reusedExisting: true };
    }
    const eventIndex = await this.nextReviewEventIndex(tx, input.reviewId);
    const inserted = await insertReturning<SingleSiteImprovedVersionReviewEventRow>(
      tx,
      "gnr8_single_site_improved_version_review_events",
      {
        review_id: input.reviewId,
        migration_id: input.migrationId,
        event_index: eventIndex,
        event_action: input.eventAction,
        from_status: input.fromStatus ?? null,
        to_status: input.toStatus ?? null,
        actor_type: input.actor.actorType,
        actor_id: input.actor.actorId,
        actor_role: input.actor.actorRole,
        actor_display_label: input.actor.actorDisplayLabel ?? null,
        details_json: input.detailsJson ?? {},
        limitations_json: input.limitationsJson ?? [],
        warnings_json: input.warningsJson ?? [],
        blockers_json: input.blockersJson ?? [],
        source_watermark: input.sourceWatermark ?? null,
        semantic_watermark: input.semanticWatermark ?? null,
        payload_hash: input.payloadHash ?? null,
        correlation_id: input.correlationId,
        causation_id: input.causationId ?? null,
        idempotency_key: input.idempotencyKey,
        request_id: input.requestId ?? null,
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        metadata_json: input.metadataJson ?? {},
      },
      [
        "review_id",
        "migration_id",
        "event_action",
        "from_status",
        "to_status",
        "actor_type",
        "actor_id",
        "actor_role",
        "details_json",
        "limitations_json",
        "warnings_json",
        "blockers_json",
        "source_watermark",
        "semantic_watermark",
        "payload_hash",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    );
    return { ...inserted.row, reusedExisting: inserted.reusedExisting };
  }

  private async getReviewEventByIdempotencyKey(tx: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteImprovedVersionReviewEventRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_improved_version_review_events where idempotency_key = $1 limit 1", [idempotencyKey]);
    return (result.rows[0] as SingleSiteImprovedVersionReviewEventRow | undefined) ?? null;
  }

  private async nextReviewEventIndex(tx: SingleSitePgClient, reviewId: string): Promise<number> {
    const result = await tx.query("select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_improved_version_review_events where review_id = $1::uuid", [reviewId]);
    return Number(result.rows[0]?.event_index ?? 1);
  }

  private async insertSupersession(tx: SingleSitePgClient, review: SingleSiteImprovedVersionReviewRow, input: ImprovedVersionReviewDecisionInput): Promise<void> {
    await insertReturning(
      tx,
      "gnr8_single_site_improved_version_review_supersessions",
      {
        migration_id: review.migration_id,
        superseded_review_id: review.id,
        replacement_review_id: optionalText(input.replacementReviewId),
        supersession_reason: requiredText("reason", input.reason),
        source_ref_json: input.detailsJson ?? {},
        actor_type: input.actor.actorType,
        actor_id: input.actor.actorId,
        actor_role: input.actor.actorRole,
        actor_display_label: input.actor.actorDisplayLabel ?? null,
        correlation_id: input.correlationId,
        causation_id: input.causationId ?? null,
        idempotency_key: `${input.idempotencyKey}:supersession`,
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        semantic_watermark: review.semantic_watermark,
        metadata_json: input.metadataJson ?? {},
      },
      [
        "migration_id",
        "superseded_review_id",
        "replacement_review_id",
        "supersession_reason",
        "source_ref_json",
        "actor_type",
        "actor_id",
        "actor_role",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ],
    );
  }

  private async upsertDecisionStageSummary(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    review: SingleSiteImprovedVersionReviewRow,
    input: ImprovedVersionReviewDecisionInput,
  ): Promise<void> {
    const status = review.review_status === "accepted_with_limitations" ? "accepted_with_limitations" : review.content_approval_ready ? "accepted" : "blocked";
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "improvement_content",
      status,
      summaryJson: {
        latestImprovedVersionReviewId: review.id,
        reviewStatus: review.review_status,
        contentApprovalReady: review.content_approval_ready,
        contentApprovalGranted: false,
      },
      limitationsJson: jsonArray(review.limitations_json),
      warningsJson: jsonArray(review.warnings_json),
      blockersJson: jsonArray(review.blockers_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:improved_version_review:${review.review_status}`,
    });
  }
}
