import "server-only";

import { createHash } from "node:crypto";

import {
  SINGLE_SITE_CONTENT_APPROVAL_CATEGORIES,
  SINGLE_SITE_CONTENT_APPROVAL_SEVERITIES,
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  isSingleSiteTerminalState,
  type SingleSiteContentApprovalCategory,
  type SingleSiteContentApprovalDecision,
  type SingleSiteContentApprovalEventAction,
  type SingleSiteContentApprovalRefRole,
  type SingleSiteContentApprovalSeverity,
  type SingleSiteContentApprovalStatus,
  type SingleSiteJsonObject,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteActorInput,
  type SingleSiteImprovementExecutionAttemptRow,
  type SingleSiteMigrationRow,
  type SingleSitePgClient,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";
import type {
  SingleSiteImprovedVersionReviewRow,
} from "./improved-version-review-service";
import type { ContentApprovalAafValidationResult } from "./content-approval-aaf-bridge";

export const CONTENT_APPROVAL_SERVICE_VERSION = "mvp-28-content-approval-service:v1" as const;
export const CONTENT_APPROVAL_AAF_SCOPE = "single_site_content_approval" as const;
export const CONTENT_APPROVAL_AAF_ACTION = "approve_single_site_content" as const;
export const CONTENT_APPROVAL_AAF_SUBJECT_TYPE = "single_site_improved_version_review" as const;

export type ContentApprovalEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type ContentApprovalRequiredRefs = {
  improvedVersionReviewId: string;
  improvedVersionReviewStatus: "accepted" | "accepted_with_limitations";
  improvedCandidateSiteVersionRef: string;
  improvedRuntimeArtifactRef: string;
  proposalPlanId: string;
  proposalApprovalDecisionId: string;
  implementationAuthorizationDecisionId: string;
  executionAttemptId: string;
  selectedRecommendationRefs: unknown[];
  sourceEvidenceReviewId: string;
  cloneReviewId: string;
  cloneSiteVersionRef: string;
  cloneRuntimeArtifactRef: string;
};

export type CreateOrReuseContentApprovalInput = ContentApprovalEnvelope & {
  migrationId: string;
  clientId: string;
  siteId: string;
  improvedVersionReviewId?: string | null;
  requiredRefs?: Partial<ContentApprovalRequiredRefs>;
  aafContentApprovalRequestId?: string | null;
  aafContentApprovalDecisionId?: string | null;
  aafScope?: string | null;
  aafAction?: string | null;
  aafSubjectType?: string | null;
  evidencePackageRefsJson?: unknown[];
  renderedSnapshotRefsJson?: unknown[];
  contentSnapshotRefsJson?: unknown[];
  metadataSnapshotRefsJson?: unknown[];
  recommendationCoverageRefsJson?: unknown[];
  caveatRefsJson?: unknown[];
  limitationsJson?: unknown[];
  unresolvedNotAppliedRecommendationsJson?: unknown[];
  operatorNotesJson?: unknown[];
  findingsSummaryJson?: SingleSiteJsonObject;
  supersedesContentApprovalId?: string | null;
  revisionRef?: string | null;
};

export type RecordContentApprovalRefInput = ContentApprovalEnvelope & {
  contentApprovalId: string;
  migrationId: string;
  refRole: SingleSiteContentApprovalRefRole;
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

export type AddContentApprovalFindingInput = ContentApprovalEnvelope & {
  contentApprovalId: string;
  migrationId: string;
  itemKey: string;
  category: SingleSiteContentApprovalCategory;
  severity: SingleSiteContentApprovalSeverity;
  status?: "open" | "resolved" | "accepted_limitation" | "superseded" | null;
  blocksApproval?: boolean | null;
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

export type ContentApprovalDecisionInput = ContentApprovalEnvelope & {
  contentApprovalId: string;
  aafContentApprovalDecisionId?: string | null;
  contentApprovalValidation?: ContentApprovalAafValidationResult | null;
  aafScope?: string | null;
  aafAction?: string | null;
  aafSubjectType?: string | null;
  limitationsJson?: unknown[];
  unresolvedNotAppliedRecommendationsJson?: unknown[];
  operatorNotesJson?: unknown[];
  findingsSummaryJson?: SingleSiteJsonObject;
  decisionSummaryJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  replacementContentApprovalId?: string | null;
  reason?: string | null;
};

export type SingleSiteContentApprovalRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  improved_version_review_id: string;
  improved_version_review_status: "accepted" | "accepted_with_limitations";
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  proposal_plan_id: string;
  proposal_approval_decision_id: string;
  implementation_authorization_decision_id: string;
  execution_attempt_id: string;
  source_evidence_review_id: string;
  clone_review_id: string | null;
  clone_site_version_ref: string;
  clone_runtime_artifact_ref: string;
  selected_recommendation_refs_json: unknown;
  status: SingleSiteContentApprovalStatus;
  decision: SingleSiteContentApprovalDecision | null;
  content_approval_ready: boolean;
  approved_with_limitations: boolean;
  client_or_launch_approval_ready: boolean;
  content_revision_required: boolean;
  aaf_content_approval_request_id: string | null;
  aaf_content_approval_decision_id: string | null;
  aaf_content_approval_scope: string | null;
  aaf_content_approval_action: string | null;
  aaf_content_approval_subject_type: string | null;
  evidence_package_refs_json: unknown;
  rendered_snapshot_refs_json: unknown;
  content_snapshot_refs_json: unknown;
  metadata_snapshot_refs_json: unknown;
  recommendation_coverage_refs_json: unknown;
  caveat_refs_json: unknown;
  limitations_json: unknown;
  unresolved_not_applied_recommendations_json: unknown;
  operator_notes_json: unknown;
  findings_summary_json: unknown;
  decision_summary_json: unknown;
  non_approval_boundary_json: unknown;
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
  decided_at: string | null;
  supersedes_content_approval_id: string | null;
  superseded_by_content_approval_id: string | null;
  revision_ref: string | null;
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

export type SingleSiteContentApprovalRefRow = {
  id: string;
  content_approval_id: string;
  migration_id: string;
  ref_role: SingleSiteContentApprovalRefRole;
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

export type SingleSiteContentApprovalItemRow = {
  id: string;
  content_approval_id: string;
  migration_id: string;
  item_key: string;
  category: SingleSiteContentApprovalCategory;
  severity: SingleSiteContentApprovalSeverity;
  status: "open" | "resolved" | "accepted_limitation" | "superseded";
  blocks_approval: boolean;
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

export type SingleSiteContentApprovalEventRow = {
  id: string;
  content_approval_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteContentApprovalEventAction;
  from_status: SingleSiteContentApprovalStatus | null;
  to_status: SingleSiteContentApprovalStatus | null;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  limitations_json: unknown;
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

export type ContentApprovalOperationResult = {
  contentApproval: SingleSiteContentApprovalRow;
  eventId?: string;
  reusedExisting: boolean;
};

export type ContentApprovalReadiness = {
  migrationId: string;
  ready: boolean;
  contentApprovalId: string | null;
  status: SingleSiteContentApprovalStatus | "missing";
  missingRequirements: string[];
  limitations: unknown[];
};

type InsertableRow = Record<string, unknown>;
type ContentEventWithoutIndex = Omit<InsertContentApprovalEventInput, "eventIndex">;

type InsertContentApprovalEventInput = ContentApprovalEnvelope & {
  contentApprovalId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteContentApprovalEventAction;
  fromStatus?: SingleSiteContentApprovalStatus | null;
  toStatus?: SingleSiteContentApprovalStatus | null;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
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

function contentApprovalWatermark(input: ContentApprovalRequiredRefs): string {
  return `single-site-content-approval:${digest(input)}`;
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

function normalizeAafShape(input: {
  aafScope?: string | null;
  aafAction?: string | null;
  aafSubjectType?: string | null;
}): { scope: string; action: string; subjectType: string } {
  const scope = optionalText(input.aafScope) ?? CONTENT_APPROVAL_AAF_SCOPE;
  const action = optionalText(input.aafAction) ?? CONTENT_APPROVAL_AAF_ACTION;
  const subjectType = optionalText(input.aafSubjectType) ?? CONTENT_APPROVAL_AAF_SUBJECT_TYPE;
  if (scope !== CONTENT_APPROVAL_AAF_SCOPE) throw new SingleSiteTransitionError("content approval AAF ref must use single_site_content_approval scope");
  if (action !== CONTENT_APPROVAL_AAF_ACTION) throw new SingleSiteTransitionError("content approval AAF ref must use approve_single_site_content action");
  if (subjectType !== CONTENT_APPROVAL_AAF_SUBJECT_TYPE) throw new SingleSiteTransitionError("content approval AAF ref must use single_site_improved_version_review subject type");
  return { scope, action, subjectType };
}

function assertValidatedContentApprovalDecision(
  decisionId: string,
  validation: ContentApprovalAafValidationResult | null | undefined,
  allowedStatuses: readonly ("granted" | "granted_with_limitations")[],
): ContentApprovalAafValidationResult {
  if (!validation?.valid) throw new SingleSiteTransitionError("content approval AAF decision ref requires successful MVP-29 bridge validation");
  if (validation.scope !== CONTENT_APPROVAL_AAF_SCOPE) throw new SingleSiteTransitionError("validated content approval AAF decision has wrong scope");
  if (validation.subjectType !== CONTENT_APPROVAL_AAF_SUBJECT_TYPE) throw new SingleSiteTransitionError("validated content approval AAF decision has wrong subject type");
  if (validation.approvalDecisionId !== decisionId) throw new SingleSiteTransitionError("validated content approval AAF decision id does not match supplied ref");
  if (!allowedStatuses.includes(validation.status as "granted" | "granted_with_limitations")) {
    throw new SingleSiteTransitionError(`validated content approval AAF decision status ${validation.status} is not allowed for this operation`);
  }
  return validation;
}

function withCarriedValidationLimitations(
  input: ContentApprovalDecisionInput,
  status: SingleSiteContentApprovalStatus,
): ContentApprovalDecisionInput {
  if (status !== "approved" && status !== "approved_with_limitations") return input;
  const decisionId = optionalText(input.aafContentApprovalDecisionId);
  if (!decisionId) return input;
  const validation = assertValidatedContentApprovalDecision(
    decisionId,
    input.contentApprovalValidation,
    status === "approved" ? ["granted"] : ["granted_with_limitations"],
  );
  if (status !== "approved_with_limitations") return input;
  const carried = jsonArray(validation.limitations);
  const supplied = jsonArray(input.limitationsJson);
  return { ...input, limitationsJson: [...carried, ...supplied] };
}

function decisionFor(status: SingleSiteContentApprovalStatus): SingleSiteContentApprovalDecision | null {
  if (status === "approved") return "approve";
  if (status === "approved_with_limitations") return "approve_with_limitations";
  if (status === "changes_requested") return "request_changes";
  if (status === "rejected") return "reject";
  if (status === "superseded") return "supersede";
  if (status === "cancelled") return "cancel";
  return null;
}

function eventAction(status: SingleSiteContentApprovalStatus): SingleSiteContentApprovalEventAction {
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "in_review") return "review_started";
  if (status === "changes_requested") return "changes_requested";
  if (status === "approved_with_limitations") return "approved_with_limitations";
  if (status === "approved" || status === "rejected" || status === "superseded" || status === "cancelled") return status;
  return "ref_attached";
}

function terminalStatus(status: SingleSiteContentApprovalStatus): boolean {
  return ["approved", "approved_with_limitations", "rejected", "superseded", "cancelled"].includes(status);
}

function hasRequiredContentApprovalRefs(refs: readonly SingleSiteContentApprovalRefRow[]): boolean {
  const roles = new Set(refs.map((ref) => ref.ref_role));
  return [
    "migration",
    "client",
    "site",
    "improved_version_review",
    "improved_candidate_site_version",
    "improved_runtime_artifact",
    "proposal_plan",
    "proposal_approval",
    "implementation_authorization",
    "execution_attempt",
    "selected_recommendation",
    "source_evidence_review",
    "clone_review",
    "clone_site_version",
    "clone_runtime_artifact",
  ].every((role) => roles.has(role as SingleSiteContentApprovalRefRole));
}

function assertEventSemanticMatch(event: SingleSiteContentApprovalEventRow, input: ContentEventWithoutIndex): void {
  const attempted: Record<string, unknown> = {
    content_approval_id: input.contentApprovalId,
    migration_id: input.migrationId,
    event_action: input.eventAction,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    actor_type: input.actor.actorType,
    actor_id: input.actor.actorId,
    actor_role: input.actor.actorRole,
    details_json: input.detailsJson ?? {},
    limitations_json: input.limitationsJson ?? [],
    source_watermark: input.sourceWatermark ?? null,
    semantic_watermark: input.semanticWatermark ?? null,
    payload_hash: input.payloadHash ?? null,
    privacy_label: input.privacyLabel ?? "client_confidential",
    retention_class: input.retentionClass ?? "compliance_long",
    metadata_json: input.metadataJson ?? {},
  };
  const existing = event as unknown as Record<string, unknown>;
  const drifted = Object.keys(attempted).filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError("gnr8_single_site_content_approval_events", input.idempotencyKey, drifted);
}

export class ContentApprovalService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createOrReuseContentApproval(input: CreateOrReuseContentApprovalInput): Promise<ContentApprovalOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      if (optionalText(input.aafContentApprovalDecisionId)) {
        throw new SingleSiteTransitionError("content approval decision refs must be attached after MVP-29 bridge validation");
      }
      const migration = await this.requiredNonTerminalMigration(tx, input.migrationId);
      if (migration.client_id !== requiredText("clientId", input.clientId)) throw new SingleSiteTransitionError("content approval clientId does not match migration");
      if ((migration.site_id ?? "") !== requiredText("siteId", input.siteId)) throw new SingleSiteTransitionError("content approval siteId does not match migration");
      const review = await this.requiredAcceptedImprovedVersionReview(tx, migration.id, input.improvedVersionReviewId ?? undefined);
      const attempt = await this.requiredExecutionAttempt(tx, review.execution_attempt_id, migration.id);
      const refs = this.requiredRefsFromReviewAndAttempt(review, attempt, input);
      if (refs.selectedRecommendationRefs.length === 0) throw new SingleSiteTransitionError("selected recommendation refs are required");

      const existing = await this.findContentApprovalBySemanticRefs(tx, migration.id, refs);
      const created = existing ? { row: existing, reusedExisting: true } : await this.insertContentApproval(tx, { migration, review, refs, input });
      const event = await this.insertEventIfNeeded(tx, {
        contentApprovalId: created.row.id,
        migrationId: migration.id,
        eventAction: "created",
        fromStatus: null,
        toStatus: created.row.status,
        actor: input.actor,
        detailsJson: {
          improvedVersionReviewId: refs.improvedVersionReviewId,
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
      await this.ensureContentReviewRequiredState(tx, migration, created.row, input);
      return { contentApproval: created.row, eventId: event.id, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async attachAafRequestRef(input: RecordContentApprovalRefInput & { aafScope?: string | null; aafAction?: string | null; aafSubjectType?: string | null }): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    normalizeAafShape(input);
    const result = await this.recordRef({ ...input, refRole: "aaf_content_approval_request", refType: input.refType || "aaf_approval_request" });
    await this.patchAafRef(input.contentApprovalId, { requestId: input.sourceRecordId, input });
    return result;
  }

  async attachAafDecisionRef(
    input: RecordContentApprovalRefInput & {
      contentApprovalValidation?: ContentApprovalAafValidationResult | null;
      aafScope?: string | null;
      aafAction?: string | null;
      aafSubjectType?: string | null;
    },
  ): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    normalizeAafShape(input);
    assertValidatedContentApprovalDecision(input.sourceRecordId, input.contentApprovalValidation, ["granted", "granted_with_limitations"]);
    const result = await this.recordRef({ ...input, refRole: "aaf_content_approval_decision", refType: input.refType || "aaf_approval_decision" });
    await this.patchAafRef(input.contentApprovalId, { decisionId: input.sourceRecordId, input });
    return result;
  }

  async recordRef(input: RecordContentApprovalRefInput): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenContentApproval(tx, input.contentApprovalId);
      const ref = await this.insertContentApprovalRef(tx, input);
      const event = await this.insertEventIfNeeded(tx, {
        contentApprovalId: approval.id,
        migrationId: approval.migration_id,
        eventAction:
          input.refRole === "aaf_content_approval_request"
            ? "aaf_request_attached"
            : input.refRole === "aaf_content_approval_decision"
              ? "aaf_decision_attached"
              : "ref_attached",
        fromStatus: approval.status,
        toStatus: approval.status,
        actor: input.actor,
        detailsJson: { refRole: input.refRole, sourceRecordId: input.sourceRecordId },
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:ref_attached`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      });
      return { refId: ref.row.id, eventId: event.id, reusedExisting: ref.reusedExisting || event.reusedExisting };
    });
  }

  async addFinding(input: AddContentApprovalFindingInput): Promise<{ item: SingleSiteContentApprovalItemRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenContentApproval(tx, input.contentApprovalId);
      const item = await this.upsertContentApprovalItem(tx, approval, input);
      const event = await this.insertEventIfNeeded(tx, {
        contentApprovalId: approval.id,
        migrationId: approval.migration_id,
        eventAction: "item_added",
        fromStatus: approval.status,
        toStatus: approval.status,
        actor: input.actor,
        detailsJson: { itemKey: input.itemKey, category: input.category, severity: input.severity, status: input.status ?? "open" },
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

  async markReadyForReview(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    return this.moveStatus(input, "ready_for_review");
  }

  async startReview(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    return this.moveStatus(input, "in_review", { reviewStartedAt: new Date().toISOString() });
  }

  async requestChanges(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "changes_requested");
  }

  async approve(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    return this.recordDecision(input, "approved");
  }

  async approveWithLimitations(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    return this.recordDecision(input, "approved_with_limitations");
  }

  async reject(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "rejected");
  }

  async cancel(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "cancelled");
  }

  async supersede(input: ContentApprovalDecisionInput): Promise<ContentApprovalOperationResult> {
    if (!input.replacementContentApprovalId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement content approval ref or reason");
    return this.recordDecision(input, "superseded");
  }

  async readLatestContentApprovalForMigration(migrationId: string): Promise<SingleSiteContentApprovalRow | null> {
    return this.repository.withTransaction((tx) => this.getLatestContentApprovalForMigration(tx, requiredText("migrationId", migrationId)));
  }

  async getClientOrLaunchApprovalReadiness(migrationId: string): Promise<ContentApprovalReadiness> {
    return this.repository.withTransaction(async (tx) => {
      const latest = await this.getLatestContentApprovalForMigration(tx, requiredText("migrationId", migrationId));
      if (!latest) return { migrationId, ready: false, contentApprovalId: null, status: "missing", missingRequirements: ["approved_content_approval"], limitations: [] };
      const refs = await this.listContentApprovalRefs(tx, latest.id);
      const ready = latest.client_or_launch_approval_ready && ["approved", "approved_with_limitations"].includes(latest.status) && hasRequiredContentApprovalRefs(refs);
      return {
        migrationId,
        ready,
        contentApprovalId: latest.id,
        status: latest.status,
        missingRequirements: ready
          ? []
          : [
              latest.client_or_launch_approval_ready ? null : "approved_content_approval",
              latest.aaf_content_approval_decision_id ? null : "aaf_content_approval_decision_ref",
              hasRequiredContentApprovalRefs(refs) ? null : "required_content_approval_refs",
            ].filter((value): value is string => Boolean(value)),
        limitations: jsonArray(latest.limitations_json),
      };
    });
  }

  private requiredRefsFromReviewAndAttempt(
    review: SingleSiteImprovedVersionReviewRow,
    attempt: SingleSiteImprovementExecutionAttemptRow,
    input: CreateOrReuseContentApprovalInput,
  ): ContentApprovalRequiredRefs {
    return {
      improvedVersionReviewId: requiredText("improved version review ref", input.requiredRefs?.improvedVersionReviewId ?? review.id),
      improvedVersionReviewStatus: (input.requiredRefs?.improvedVersionReviewStatus ?? review.review_status) as "accepted" | "accepted_with_limitations",
      improvedCandidateSiteVersionRef: requiredText("improved candidate site version ref", input.requiredRefs?.improvedCandidateSiteVersionRef ?? review.improved_candidate_site_version_ref),
      improvedRuntimeArtifactRef: requiredText("improved runtime artifact ref", input.requiredRefs?.improvedRuntimeArtifactRef ?? review.improved_runtime_artifact_ref),
      proposalPlanId: requiredText("proposal plan ref", input.requiredRefs?.proposalPlanId ?? review.proposal_plan_id),
      proposalApprovalDecisionId: requiredText("proposal approval decision ref", input.requiredRefs?.proposalApprovalDecisionId ?? review.proposal_approval_decision_id),
      implementationAuthorizationDecisionId: requiredText(
        "implementation authorization decision ref",
        input.requiredRefs?.implementationAuthorizationDecisionId ?? review.implementation_authorization_decision_id,
      ),
      executionAttemptId: requiredText("execution attempt ref", input.requiredRefs?.executionAttemptId ?? review.execution_attempt_id),
      selectedRecommendationRefs: jsonArray(input.requiredRefs?.selectedRecommendationRefs ?? review.selected_recommendation_refs_json),
      sourceEvidenceReviewId: requiredText("source evidence review ref", input.requiredRefs?.sourceEvidenceReviewId ?? review.source_evidence_review_id),
      cloneReviewId: requiredText("clone review ref", input.requiredRefs?.cloneReviewId ?? attempt.clone_review_id),
      cloneSiteVersionRef: requiredText("clone site version ref", input.requiredRefs?.cloneSiteVersionRef ?? review.clone_site_version_ref),
      cloneRuntimeArtifactRef: requiredText("clone runtime artifact ref", input.requiredRefs?.cloneRuntimeArtifactRef ?? review.clone_runtime_artifact_ref),
    };
  }

  private async insertContentApproval(
    tx: SingleSiteStateWriterTx,
    context: { migration: SingleSiteMigrationRow; review: SingleSiteImprovedVersionReviewRow; refs: ContentApprovalRequiredRefs; input: CreateOrReuseContentApprovalInput },
  ): Promise<{ row: SingleSiteContentApprovalRow; reusedExisting: boolean }> {
    const { migration, refs, input } = context;
    const aaf = normalizeAafShape(input);
    const limitations = input.limitationsJson ?? jsonArray(context.review.limitations_json);
    return insertReturning<SingleSiteContentApprovalRow>(
      tx,
      "gnr8_single_site_content_approvals",
      {
        migration_id: migration.id,
        client_id: input.clientId,
        site_id: input.siteId,
        improved_version_review_id: refs.improvedVersionReviewId,
        improved_version_review_status: refs.improvedVersionReviewStatus,
        improved_candidate_site_version_ref: refs.improvedCandidateSiteVersionRef,
        improved_runtime_artifact_ref: refs.improvedRuntimeArtifactRef,
        proposal_plan_id: refs.proposalPlanId,
        proposal_approval_decision_id: refs.proposalApprovalDecisionId,
        implementation_authorization_decision_id: refs.implementationAuthorizationDecisionId,
        execution_attempt_id: refs.executionAttemptId,
        source_evidence_review_id: refs.sourceEvidenceReviewId,
        clone_review_id: refs.cloneReviewId,
        clone_site_version_ref: refs.cloneSiteVersionRef,
        clone_runtime_artifact_ref: refs.cloneRuntimeArtifactRef,
        selected_recommendation_refs_json: refs.selectedRecommendationRefs,
        status: "draft",
        aaf_content_approval_request_id: optionalText(input.aafContentApprovalRequestId),
        aaf_content_approval_decision_id: optionalText(input.aafContentApprovalDecisionId),
        aaf_content_approval_scope: aaf.scope,
        aaf_content_approval_action: aaf.action,
        aaf_content_approval_subject_type: aaf.subjectType,
        evidence_package_refs_json: input.evidencePackageRefsJson ?? [],
        rendered_snapshot_refs_json: input.renderedSnapshotRefsJson ?? [],
        content_snapshot_refs_json: input.contentSnapshotRefsJson ?? [],
        metadata_snapshot_refs_json: input.metadataSnapshotRefsJson ?? [],
        recommendation_coverage_refs_json: input.recommendationCoverageRefsJson ?? [],
        caveat_refs_json: input.caveatRefsJson ?? [],
        limitations_json: limitations,
        unresolved_not_applied_recommendations_json: input.unresolvedNotAppliedRecommendationsJson ?? [],
        operator_notes_json: input.operatorNotesJson ?? [],
        findings_summary_json: input.findingsSummaryJson ?? {},
        supersedes_content_approval_id: optionalText(input.supersedesContentApprovalId),
        revision_ref: optionalText(input.revisionRef),
        correlation_id: input.correlationId,
        causation_id: optionalText(input.causationId),
        idempotency_key: input.idempotencyKey,
        request_id: optionalText(input.requestId),
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        semantic_watermark: contentApprovalWatermark(refs),
        metadata_json: {
          ...input.metadataJson,
          serviceVersion: CONTENT_APPROVAL_SERVICE_VERSION,
          clientApprovalGranted: false,
          launchApprovalGranted: false,
          publishActivationApprovalGranted: false,
          activePointerChanged: false,
          runtimeMutationPerformedByContentApproval: false,
          aafBridgeValidationDeferredTo: "mvp-29",
        },
      },
      [
        "migration_id",
        "client_id",
        "site_id",
        "improved_version_review_id",
        "improved_version_review_status",
        "improved_candidate_site_version_ref",
        "improved_runtime_artifact_ref",
        "proposal_plan_id",
        "proposal_approval_decision_id",
        "implementation_authorization_decision_id",
        "execution_attempt_id",
        "source_evidence_review_id",
        "clone_review_id",
        "clone_site_version_ref",
        "clone_runtime_artifact_ref",
        "selected_recommendation_refs_json",
        "status",
        "aaf_content_approval_request_id",
        "aaf_content_approval_decision_id",
        "aaf_content_approval_scope",
        "aaf_content_approval_action",
        "aaf_content_approval_subject_type",
        "evidence_package_refs_json",
        "rendered_snapshot_refs_json",
        "content_snapshot_refs_json",
        "metadata_snapshot_refs_json",
        "recommendation_coverage_refs_json",
        "caveat_refs_json",
        "limitations_json",
        "unresolved_not_applied_recommendations_json",
        "operator_notes_json",
        "findings_summary_json",
        "supersedes_content_approval_id",
        "revision_ref",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ],
    );
  }

  private async recordRequiredRefs(
    tx: SingleSiteStateWriterTx,
    approval: SingleSiteContentApprovalRow,
    refs: ContentApprovalRequiredRefs,
    input: CreateOrReuseContentApprovalInput,
  ): Promise<void> {
    const base = {
      contentApprovalId: approval.id,
      migrationId: approval.migration_id,
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
      semanticWatermark: approval.semantic_watermark,
    };
    const refRows: Array<[SingleSiteContentApprovalRefRole, string, string, string | null, string]> = [
      ["migration", "single_site_migration", approval.migration_id, "gnr8_single_site_migrations", "migration"],
      ["client", "client", approval.client_id, null, "client"],
      ["site", "site", approval.site_id, null, "site"],
      ["improved_version_review", "improved_version_review", refs.improvedVersionReviewId, "gnr8_single_site_improved_version_reviews", "improved_version_review"],
      ["improved_candidate_site_version", "runtime_site_version_improved_candidate", refs.improvedCandidateSiteVersionRef, "gnr8_runtime_site_versions", "improved_candidate_site_version"],
      ["improved_runtime_artifact", "runtime_artifact_improved_candidate", refs.improvedRuntimeArtifactRef, "gnr8_runtime_artifacts", "improved_runtime_artifact"],
      ["proposal_plan", "improvement_proposal_plan", refs.proposalPlanId, "gnr8_single_site_improvement_proposal_plans", "proposal_plan"],
      ["proposal_approval", "aaf_approval_decision", refs.proposalApprovalDecisionId, "gnr8_aaf_approval_decisions", "proposal_approval"],
      ["implementation_authorization", "aaf_approval_decision", refs.implementationAuthorizationDecisionId, "gnr8_aaf_approval_decisions", "implementation_authorization"],
      ["execution_attempt", "improvement_execution_attempt", refs.executionAttemptId, "gnr8_single_site_improvement_execution_attempts", "execution_attempt"],
      ["source_evidence_review", "source_evidence_review", refs.sourceEvidenceReviewId, "gnr8_single_site_source_evidence_reviews", "source_evidence_review"],
      ["clone_review", "clone_review", refs.cloneReviewId, "gnr8_single_site_clone_reviews", "clone_review"],
      ["clone_site_version", "runtime_site_version_clone", refs.cloneSiteVersionRef, "gnr8_runtime_site_versions", "clone_site_version"],
      ["clone_runtime_artifact", "runtime_artifact_clone", refs.cloneRuntimeArtifactRef, "gnr8_runtime_artifacts", "clone_runtime_artifact"],
    ];
    if (approval.aaf_content_approval_request_id) {
      refRows.push(["aaf_content_approval_request", "aaf_approval_request", approval.aaf_content_approval_request_id, "gnr8_aaf_approval_requests", "aaf_content_approval_request"]);
    }
    if (approval.aaf_content_approval_decision_id) {
      refRows.push(["aaf_content_approval_decision", "aaf_approval_decision", approval.aaf_content_approval_decision_id, "gnr8_aaf_approval_decisions", "aaf_content_approval_decision"]);
    }
    for (const [role, refType, sourceRecordId, sourceTable, key] of refRows) {
      await this.insertContentApprovalRef(tx, {
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
      await this.insertContentApprovalRef(tx, {
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
    for (const [role, values] of [
      ["evidence_package", jsonArray(approval.evidence_package_refs_json)],
      ["rendered_snapshot", jsonArray(approval.rendered_snapshot_refs_json)],
      ["content_snapshot", jsonArray(approval.content_snapshot_refs_json)],
      ["metadata_snapshot", jsonArray(approval.metadata_snapshot_refs_json)],
      ["recommendation_coverage", jsonArray(approval.recommendation_coverage_refs_json)],
      ["seo_aeo_accessibility_legal_caveat", jsonArray(approval.caveat_refs_json)],
      ["limitation", jsonArray(approval.limitations_json)],
      ["unresolved_not_applied_recommendation", jsonArray(approval.unresolved_not_applied_recommendations_json)],
    ] as Array<[SingleSiteContentApprovalRefRole, unknown[]]>) {
      for (const [index, value] of values.entries()) {
        const record = jsonObject(value);
        const sourceRecordId = optionalText(record.sourceRecordId ?? record.id ?? record.ref);
        if (!sourceRecordId) continue;
        await this.insertContentApprovalRef(tx, {
          ...base,
          refRole: role,
          refType: optionalText(record.refType) ?? role,
          sourceSystem: optionalText(record.sourceSystem) ?? "gnr8",
          sourceTable: optionalText(record.sourceTable),
          sourceRecordId,
          sourceWatermark: optionalText(record.sourceWatermark),
          idempotencyKey: `${input.idempotencyKey}:ref:${role}:${index + 1}`,
          metadataJson: { ...input.metadataJson, value: record },
        });
      }
    }
    await this.repository.insertMigrationRef(tx, {
      migrationId: approval.migration_id,
      refRole: "content_approval",
      refType: "single_site_content_approval",
      sourceTable: "gnr8_single_site_content_approvals",
      sourceRecordId: approval.id,
      sourceWatermark: approval.semantic_watermark,
      correlationId: input.correlationId,
      causationId: input.causationId,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: {
        improvedVersionReviewId: approval.improved_version_review_id,
        improvedCandidateSiteVersionRef: approval.improved_candidate_site_version_ref,
        improvedRuntimeArtifactRef: approval.improved_runtime_artifact_ref,
        clientApprovalGranted: false,
        launchApprovalGranted: false,
        publishActivationApprovalGranted: false,
      },
      idempotencyKey: `${input.idempotencyKey}:migration_ref:content_approval`,
    });
  }

  private async ensureContentReviewRequiredState(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    approval: SingleSiteContentApprovalRow,
    input: CreateOrReuseContentApprovalInput,
  ): Promise<void> {
    if (migration.current_state === "content_review_required") {
      await this.repository.upsertStageSummary(tx, {
        migrationId: migration.id,
        stage: "improvement_content",
        status: "ready_for_review",
        summaryJson: { latestContentApprovalId: approval.id, contentApprovalStatus: approval.status },
        limitationsJson: jsonArray(approval.limitations_json),
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:stage:content_review_required`,
      });
      return;
    }
    if (!["improved_version_review_required", "improved_preview_ready", "improvement_implementation_completed"].includes(migration.current_state)) return;
    const stateEvent = await this.repository.insertStateEvent(tx, {
      migrationId: migration.id,
      eventIndex: await this.repository.nextStateEventIndex(tx, migration.id),
      fromState: migration.current_state,
      toState: "content_review_required",
      transitionKey: "content_approval_service.content_review_required",
      transitionReason: "accepted_improved_version_review_content_approval_required",
      requiredRefsJson: {
        contentApprovalId: approval.id,
        improvedVersionReviewId: approval.improved_version_review_id,
        improvedCandidateSiteVersionRef: approval.improved_candidate_site_version_ref,
        improvedRuntimeArtifactRef: approval.improved_runtime_artifact_ref,
      },
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state:content_review_required`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: { ...input.metadataJson, clientApprovalGranted: false, publishActivationApprovalGranted: false },
    });
    await this.repository.updateMigrationCurrentState(tx, {
      migrationId: migration.id,
      toState: "content_review_required",
      latestStateEventId: stateEvent.row.id,
    });
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "improvement_content",
      status: "ready_for_review",
      latestStateEventId: stateEvent.row.id,
      summaryJson: { latestContentApprovalId: approval.id, contentApprovalStatus: approval.status },
      limitationsJson: jsonArray(approval.limitations_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:content_review_required`,
    });
  }

  private async moveStatus(
    input: ContentApprovalDecisionInput,
    status: SingleSiteContentApprovalStatus,
    patch: { reviewStartedAt?: string | null } = {},
  ): Promise<ContentApprovalOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenContentApproval(tx, input.contentApprovalId);
      await this.requiredNonTerminalMigration(tx, approval.migration_id);
      const updated = await this.updateContentApprovalStatus(tx, approval, input, status, patch);
      const event = await this.insertEventIfNeeded(tx, {
        contentApprovalId: approval.id,
        migrationId: approval.migration_id,
        eventAction: eventAction(status),
        fromStatus: approval.status,
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
      return { contentApproval: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private async recordDecision(
    input: ContentApprovalDecisionInput,
    status: "changes_requested" | "approved" | "approved_with_limitations" | "rejected" | "superseded" | "cancelled",
  ): Promise<ContentApprovalOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const effectiveInput = withCarriedValidationLimitations(input, status);
      const approvalMaybe = await this.getContentApprovalById(tx, requiredText("contentApprovalId", input.contentApprovalId));
      if (!approvalMaybe) throw new SingleSiteTransitionError(`content approval ${input.contentApprovalId} was not found`);
      const eventKey = `${input.idempotencyKey}:event:${status}`;
      const existingEvent = await this.getContentApprovalEventByIdempotencyKey(tx, eventKey);
      if (existingEvent) {
        assertEventSemanticMatch(existingEvent, {
          contentApprovalId: approvalMaybe.id,
          migrationId: approvalMaybe.migration_id,
          eventAction: eventAction(status),
          fromStatus: existingEvent.from_status,
          toStatus: existingEvent.to_status,
          actor: effectiveInput.actor,
          detailsJson: effectiveInput.detailsJson ?? { reason: effectiveInput.reason ?? null, replacementContentApprovalId: effectiveInput.replacementContentApprovalId ?? null },
          limitationsJson: effectiveInput.limitationsJson,
          correlationId: effectiveInput.correlationId,
          causationId: effectiveInput.causationId,
          idempotencyKey: eventKey,
          requestId: effectiveInput.requestId,
          privacyLabel: effectiveInput.privacyLabel,
          retentionClass: effectiveInput.retentionClass,
          metadataJson: effectiveInput.metadataJson,
        });
        return { contentApproval: approvalMaybe, eventId: existingEvent.id, reusedExisting: true };
      }
      const approval = await this.requiredOpenContentApproval(tx, input.contentApprovalId);
      const migration = await this.requiredNonTerminalMigration(tx, approval.migration_id);
      const items = await this.listContentApprovalItems(tx, approval.id);
      const refs = await this.listContentApprovalRefs(tx, approval.id);
      this.assertDecisionAllowed(status, approval, effectiveInput, items, refs);
      const updated = await this.updateContentApprovalStatus(tx, approval, effectiveInput, status, {
        decidedAt: new Date().toISOString(),
        supersededByContentApprovalId: status === "superseded" ? effectiveInput.replacementContentApprovalId : undefined,
      });
      const event = await this.insertEventIfNeeded(tx, {
        contentApprovalId: approval.id,
        migrationId: approval.migration_id,
        eventAction: eventAction(status),
        fromStatus: approval.status,
        toStatus: status,
        actor: effectiveInput.actor,
        detailsJson: effectiveInput.detailsJson ?? { reason: effectiveInput.reason ?? null, replacementContentApprovalId: effectiveInput.replacementContentApprovalId ?? null },
        limitationsJson: effectiveInput.limitationsJson,
        correlationId: effectiveInput.correlationId,
        causationId: effectiveInput.causationId,
        idempotencyKey: eventKey,
        requestId: effectiveInput.requestId,
        privacyLabel: effectiveInput.privacyLabel,
        retentionClass: effectiveInput.retentionClass,
        metadataJson: effectiveInput.metadataJson,
      });
      if (status === "superseded") await this.insertSupersession(tx, approval, effectiveInput);
      await this.upsertDecisionStageSummary(tx, migration, updated, effectiveInput);
      return { contentApproval: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private assertDecisionAllowed(
    status: SingleSiteContentApprovalStatus,
    approval: SingleSiteContentApprovalRow,
    input: ContentApprovalDecisionInput,
    items: readonly SingleSiteContentApprovalItemRow[],
    refs: readonly SingleSiteContentApprovalRefRow[],
  ): void {
    if (!hasRequiredContentApprovalRefs(refs)) throw new SingleSiteTransitionError("content approval requires all canonical refs before decision");
    if (status === "approved" || status === "approved_with_limitations") {
      const aafShape = normalizeAafShape(input);
      const decisionRef = optionalText(input.aafContentApprovalDecisionId) ?? approval.aaf_content_approval_decision_id;
      if (!decisionRef) throw new SingleSiteTransitionError("content approval requires exact-scope AAF content approval decision ref before approval");
      assertValidatedContentApprovalDecision(decisionRef, input.contentApprovalValidation, status === "approved" ? ["granted"] : ["granted_with_limitations"]);
      const unresolvedP0 = items.filter((item) => item.status === "open" && item.severity === "p0_blocker" && !item.accepted_limitation);
      if (unresolvedP0.length > 0) throw new SingleSiteTransitionError("cannot approve content with unresolved p0 blockers");
      const missingRequiredRecommendations = items.filter(
        (item) =>
          item.required_recommendation_applied === false &&
          item.status === "open" &&
          !item.accepted_limitation &&
          Object.keys(jsonObject(item.limitation_json)).length === 0,
      );
      const unresolved = jsonArray(input.unresolvedNotAppliedRecommendationsJson ?? approval.unresolved_not_applied_recommendations_json);
      const unresolvedWithoutLimitation = unresolved.filter((value) => {
        const record = jsonObject(value);
        return record.required === true && !record.limitationRef && !record.exceptionRef && !record.acceptedLimitation;
      });
      if (missingRequiredRecommendations.length > 0 || unresolvedWithoutLimitation.length > 0) {
        throw new SingleSiteTransitionError("cannot approve content when required not-applied recommendations have no limitation or exception");
      }
      if (aafShape.scope !== CONTENT_APPROVAL_AAF_SCOPE) throw new SingleSiteTransitionError("invalid AAF content approval scope");
    }
    if (status === "approved_with_limitations" && jsonArray(input.limitationsJson ?? approval.limitations_json).length === 0) {
      throw new SingleSiteTransitionError("approved_with_limitations requires limitations");
    }
  }

  private async requiredNonTerminalMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot change content approval`);
    return migration;
  }

  private async requiredAcceptedImprovedVersionReview(tx: SingleSitePgClient, migrationId: string, reviewId: string | undefined): Promise<SingleSiteImprovedVersionReviewRow> {
    const review = reviewId ? await this.getImprovedVersionReviewById(tx, requiredText("improvedVersionReviewId", reviewId)) : await this.getLatestImprovedVersionReviewForMigration(tx, migrationId);
    if (!review || review.migration_id !== migrationId) throw new SingleSiteTransitionError("accepted improved version review ref is required");
    if (!["accepted", "accepted_with_limitations"].includes(review.review_status)) {
      throw new SingleSiteTransitionError("content approval requires accepted or accepted_with_limitations improved version review");
    }
    if (!review.content_approval_ready) throw new SingleSiteTransitionError("improved version review is not ready for content approval");
    if (!optionalText(review.improved_candidate_site_version_ref) || !optionalText(review.improved_runtime_artifact_ref)) {
      throw new SingleSiteTransitionError("content approval requires improved candidate refs");
    }
    if (review.review_status === "accepted_with_limitations" && jsonArray(review.limitations_json).length === 0) {
      throw new SingleSiteTransitionError("accepted_with_limitations improved version review requires limitations");
    }
    return review;
  }

  private async requiredExecutionAttempt(tx: SingleSiteStateWriterTx, attemptId: string, migrationId: string): Promise<SingleSiteImprovementExecutionAttemptRow> {
    const attempt = await this.repository.getImprovementExecutionAttemptById(tx, requiredText("executionAttemptId", attemptId));
    if (!attempt || attempt.migration_id !== migrationId) throw new SingleSiteTransitionError("improvement execution attempt ref is required");
    return attempt;
  }

  private async requiredOpenContentApproval(tx: SingleSiteStateWriterTx, contentApprovalId: string): Promise<SingleSiteContentApprovalRow> {
    const approval = await this.getContentApprovalById(tx, requiredText("contentApprovalId", contentApprovalId));
    if (!approval) throw new SingleSiteTransitionError(`content approval ${contentApprovalId} was not found`);
    if (terminalStatus(approval.status)) throw new SingleSiteTransitionError(`content approval ${contentApprovalId} is terminal`);
    return approval;
  }

  private async findContentApprovalBySemanticRefs(tx: SingleSitePgClient, migrationId: string, refs: ContentApprovalRequiredRefs): Promise<SingleSiteContentApprovalRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_content_approvals
      where migration_id = $1::uuid
        and improved_version_review_id = $2::uuid
        and improved_candidate_site_version_ref = $3
        and improved_runtime_artifact_ref = $4
      order by created_at asc
      limit 1
      `,
      [migrationId, refs.improvedVersionReviewId, refs.improvedCandidateSiteVersionRef, refs.improvedRuntimeArtifactRef],
    );
    return (result.rows[0] as SingleSiteContentApprovalRow | undefined) ?? null;
  }

  private async getContentApprovalById(tx: SingleSitePgClient, contentApprovalId: string): Promise<SingleSiteContentApprovalRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_content_approvals where id = $1::uuid limit 1", [contentApprovalId]);
    return (result.rows[0] as SingleSiteContentApprovalRow | undefined) ?? null;
  }

  private async getLatestContentApprovalForMigration(tx: SingleSitePgClient, migrationId: string): Promise<SingleSiteContentApprovalRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_content_approvals
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [migrationId],
    );
    return (result.rows[0] as SingleSiteContentApprovalRow | undefined) ?? null;
  }

  private async getImprovedVersionReviewById(tx: SingleSitePgClient, reviewId: string): Promise<SingleSiteImprovedVersionReviewRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_improved_version_reviews where id = $1::uuid limit 1", [reviewId]);
    return (result.rows[0] as SingleSiteImprovedVersionReviewRow | undefined) ?? null;
  }

  private async getLatestImprovedVersionReviewForMigration(tx: SingleSitePgClient, migrationId: string): Promise<SingleSiteImprovedVersionReviewRow | null> {
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

  private async insertContentApprovalRef(tx: SingleSitePgClient, input: RecordContentApprovalRefInput): Promise<{ row: SingleSiteContentApprovalRefRow; reusedExisting: boolean }> {
    return insertReturning<SingleSiteContentApprovalRefRow>(
      tx,
      "gnr8_single_site_content_approval_refs",
      {
        content_approval_id: requiredText("contentApprovalId", input.contentApprovalId),
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
        "content_approval_id",
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

  private async upsertContentApprovalItem(
    tx: SingleSitePgClient,
    approval: SingleSiteContentApprovalRow,
    input: AddContentApprovalFindingInput,
  ): Promise<SingleSiteContentApprovalItemRow> {
    if (!SINGLE_SITE_CONTENT_APPROVAL_CATEGORIES.includes(input.category)) throw new SingleSiteTransitionError(`unsupported content approval category ${input.category}`);
    if (!SINGLE_SITE_CONTENT_APPROVAL_SEVERITIES.includes(input.severity)) throw new SingleSiteTransitionError(`unsupported content approval severity ${input.severity}`);
    const attempted = {
      content_approval_id: approval.id,
      migration_id: approval.migration_id,
      item_key: requiredText("itemKey", input.itemKey),
      category: input.category,
      severity: input.severity,
      status: input.status ?? "open",
      blocks_approval: input.blocksApproval ?? input.severity === "p0_blocker",
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
    const existing = await tx.query("select * from public.gnr8_single_site_content_approval_items where idempotency_key = $1 limit 1", [attempted.idempotency_key]);
    if (existing.rows[0]) {
      assertSemanticMatch("gnr8_single_site_content_approval_items", attempted.idempotency_key, attempted, existing.rows[0], [
        "content_approval_id",
        "migration_id",
        "item_key",
        "category",
        "severity",
        "status",
        "blocks_approval",
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
      return existing.rows[0] as SingleSiteContentApprovalItemRow;
    }
    const result = await tx.query(
      `
      insert into public.gnr8_single_site_content_approval_items (
        content_approval_id, migration_id, item_key, category, severity, status, blocks_approval, accepted_limitation,
        required_recommendation_applied, recommendation_id, finding_summary, ref_ids_json, limitation_json, evidence_json,
        details_json, reviewer_actor_type, reviewer_actor_id, reviewer_actor_display_label, correlation_id, idempotency_key,
        privacy_label, retention_class, semantic_watermark, metadata_json
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::uuid, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb)
      on conflict (content_approval_id, item_key) do update set
        category = excluded.category,
        severity = excluded.severity,
        status = excluded.status,
        blocks_approval = excluded.blocks_approval,
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
        attempted.content_approval_id,
        attempted.migration_id,
        attempted.item_key,
        attempted.category,
        attempted.severity,
        attempted.status,
        attempted.blocks_approval,
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
    return result.rows[0] as SingleSiteContentApprovalItemRow;
  }

  private async listContentApprovalItems(tx: SingleSitePgClient, contentApprovalId: string): Promise<SingleSiteContentApprovalItemRow[]> {
    const result = await tx.query("select * from public.gnr8_single_site_content_approval_items where content_approval_id = $1::uuid order by item_key asc", [contentApprovalId]);
    return result.rows as SingleSiteContentApprovalItemRow[];
  }

  private async listContentApprovalRefs(tx: SingleSitePgClient, contentApprovalId: string): Promise<SingleSiteContentApprovalRefRow[]> {
    const result = await tx.query("select * from public.gnr8_single_site_content_approval_refs where content_approval_id = $1::uuid order by created_at asc, ref_role asc", [contentApprovalId]);
    return result.rows as SingleSiteContentApprovalRefRow[];
  }

  private async updateContentApprovalStatus(
    tx: SingleSitePgClient,
    approval: SingleSiteContentApprovalRow,
    input: ContentApprovalDecisionInput,
    status: SingleSiteContentApprovalStatus,
    patch: { reviewStartedAt?: string | null; decidedAt?: string | null; supersededByContentApprovalId?: string | null } = {},
  ): Promise<SingleSiteContentApprovalRow> {
    const aaf = normalizeAafShape(input);
    const result = await tx.query(
      `
      update public.gnr8_single_site_content_approvals
      set
        status = $2,
        decision = $3,
        content_approval_ready = $4,
        approved_with_limitations = $5,
        client_or_launch_approval_ready = $6,
        content_revision_required = $7,
        aaf_content_approval_decision_id = coalesce($8, aaf_content_approval_decision_id),
        aaf_content_approval_scope = coalesce($9, aaf_content_approval_scope),
        aaf_content_approval_action = coalesce($10, aaf_content_approval_action),
        aaf_content_approval_subject_type = coalesce($11, aaf_content_approval_subject_type),
        limitations_json = coalesce($12::jsonb, limitations_json),
        unresolved_not_applied_recommendations_json = coalesce($13::jsonb, unresolved_not_applied_recommendations_json),
        operator_notes_json = coalesce($14::jsonb, operator_notes_json),
        findings_summary_json = coalesce($15::jsonb, findings_summary_json),
        decision_summary_json = coalesce($16::jsonb, decision_summary_json),
        reviewer_actor_type = coalesce($17, reviewer_actor_type),
        reviewer_actor_id = coalesce($18, reviewer_actor_id),
        reviewer_actor_role = coalesce($19, reviewer_actor_role),
        reviewer_actor_display_label = coalesce($20, reviewer_actor_display_label),
        review_started_at = coalesce($21::timestamptz, review_started_at),
        decided_at = coalesce($22::timestamptz, decided_at),
        superseded_by_content_approval_id = coalesce($23::uuid, superseded_by_content_approval_id),
        updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        approval.id,
        status,
        decisionFor(status),
        status === "approved" || status === "approved_with_limitations",
        status === "approved_with_limitations",
        status === "approved" || status === "approved_with_limitations",
        status === "changes_requested" || status === "rejected" || status === "superseded",
        optionalText(input.aafContentApprovalDecisionId),
        aaf.scope,
        aaf.action,
        aaf.subjectType,
        input.limitationsJson === undefined ? null : toPg(input.limitationsJson),
        input.unresolvedNotAppliedRecommendationsJson === undefined ? null : toPg(input.unresolvedNotAppliedRecommendationsJson),
        input.operatorNotesJson === undefined ? null : toPg(input.operatorNotesJson),
        input.findingsSummaryJson === undefined ? null : toPg(input.findingsSummaryJson),
        input.decisionSummaryJson === undefined ? null : toPg(input.decisionSummaryJson),
        input.actor.actorType,
        input.actor.actorId,
        input.actor.actorRole,
        input.actor.actorDisplayLabel ?? null,
        patch.reviewStartedAt ?? null,
        patch.decidedAt ?? null,
        patch.supersededByContentApprovalId ?? null,
      ],
    );
    const row = result.rows[0] as SingleSiteContentApprovalRow | undefined;
    if (!row) throw new SingleSiteTransitionError("content approval status update did not return a row");
    return row;
  }

  private async patchAafRef(
    contentApprovalId: string,
    patch: { requestId?: string | null; decisionId?: string | null; input: RecordContentApprovalRefInput & { aafScope?: string | null; aafAction?: string | null; aafSubjectType?: string | null } },
  ): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenContentApproval(tx, contentApprovalId);
      const aaf = normalizeAafShape(patch.input);
      await tx.query(
        `
        update public.gnr8_single_site_content_approvals
        set
          aaf_content_approval_request_id = coalesce($2, aaf_content_approval_request_id),
          aaf_content_approval_decision_id = coalesce($3, aaf_content_approval_decision_id),
          aaf_content_approval_scope = $4,
          aaf_content_approval_action = $5,
          aaf_content_approval_subject_type = $6,
          updated_at = now()
        where id = $1::uuid
        `,
        [approval.id, optionalText(patch.requestId), optionalText(patch.decisionId), aaf.scope, aaf.action, aaf.subjectType],
      );
    });
  }

  private async insertEventIfNeeded(tx: SingleSitePgClient, input: Omit<InsertContentApprovalEventInput, "eventIndex">): Promise<SingleSiteContentApprovalEventRow & { reusedExisting: boolean }> {
    const existing = await this.getContentApprovalEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      assertEventSemanticMatch(existing, input);
      return { ...existing, reusedExisting: true };
    }
    const eventIndex = await this.nextContentApprovalEventIndex(tx, input.contentApprovalId);
    const inserted = await insertReturning<SingleSiteContentApprovalEventRow>(
      tx,
      "gnr8_single_site_content_approval_events",
      {
        content_approval_id: input.contentApprovalId,
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
        "content_approval_id",
        "migration_id",
        "event_action",
        "from_status",
        "to_status",
        "actor_type",
        "actor_id",
        "actor_role",
        "details_json",
        "limitations_json",
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

  private async getContentApprovalEventByIdempotencyKey(tx: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteContentApprovalEventRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_content_approval_events where idempotency_key = $1 limit 1", [idempotencyKey]);
    return (result.rows[0] as SingleSiteContentApprovalEventRow | undefined) ?? null;
  }

  private async nextContentApprovalEventIndex(tx: SingleSitePgClient, contentApprovalId: string): Promise<number> {
    const result = await tx.query("select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_content_approval_events where content_approval_id = $1::uuid", [contentApprovalId]);
    return Number(result.rows[0]?.event_index ?? 1);
  }

  private async insertSupersession(tx: SingleSitePgClient, approval: SingleSiteContentApprovalRow, input: ContentApprovalDecisionInput): Promise<void> {
    await insertReturning(
      tx,
      "gnr8_single_site_content_approval_supersessions",
      {
        migration_id: approval.migration_id,
        superseded_content_approval_id: approval.id,
        replacement_content_approval_id: optionalText(input.replacementContentApprovalId),
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
        semantic_watermark: approval.semantic_watermark,
        metadata_json: input.metadataJson ?? {},
      },
      [
        "migration_id",
        "superseded_content_approval_id",
        "replacement_content_approval_id",
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
    approval: SingleSiteContentApprovalRow,
    input: ContentApprovalDecisionInput,
  ): Promise<void> {
    const status =
      approval.status === "approved_with_limitations"
        ? "accepted_with_limitations"
        : approval.status === "approved"
          ? "accepted"
          : approval.status === "cancelled"
            ? "cancelled"
            : approval.status === "superseded"
              ? "superseded"
              : "blocked";
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "improvement_content",
      status,
      summaryJson: {
        latestContentApprovalId: approval.id,
        contentApprovalStatus: approval.status,
        contentApprovalReady: approval.content_approval_ready,
        clientOrLaunchApprovalReady: approval.client_or_launch_approval_ready,
        clientApprovalGranted: false,
        launchApprovalGranted: false,
        publishActivationApprovalGranted: false,
      },
      limitationsJson: jsonArray(approval.limitations_json),
      blockersJson: jsonArray(approval.unresolved_not_applied_recommendations_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:content_approval:${approval.status}`,
    });
    if (approval.status === "approved" || approval.status === "approved_with_limitations") {
      const stateEvent = await this.repository.insertStateEvent(tx, {
        migrationId: migration.id,
        eventIndex: await this.repository.nextStateEventIndex(tx, migration.id),
        fromState: migration.current_state,
        toState: "content_approved",
        transitionKey: "content_approval_service.content_approved",
        transitionReason: approval.status,
        requiredRefsJson: {
          contentApprovalId: approval.id,
          aafContentApprovalDecisionId: approval.aaf_content_approval_decision_id,
        },
        actor: input.actor,
        aafApprovalDecisionId: approval.aaf_content_approval_decision_id,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:state:content_approved`,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: { ...input.metadataJson, publishActivationApprovalGranted: false, activePointerChanged: false },
      });
      await this.repository.updateMigrationCurrentState(tx, {
        migrationId: migration.id,
        toState: "content_approved",
        latestStateEventId: stateEvent.row.id,
      });
    }
  }
}
