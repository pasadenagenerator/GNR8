import "server-only";

import { createHash } from "node:crypto";

import {
  SINGLE_SITE_LAUNCH_APPROVAL_CATEGORIES,
  SINGLE_SITE_LAUNCH_APPROVAL_SEVERITIES,
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  isSingleSiteTerminalState,
  type SingleSiteLaunchApprovalCategory,
  type SingleSiteLaunchApprovalDecision,
  type SingleSiteLaunchApprovalEventAction,
  type SingleSiteLaunchApprovalRefRole,
  type SingleSiteLaunchApprovalSeverity,
  type SingleSiteLaunchApprovalStatus,
  type SingleSiteJsonObject,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteActorInput,
  type SingleSiteMigrationRow,
  type SingleSitePgClient,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";
import type { SingleSiteContentApprovalRow } from "./content-approval-service";
import type { SingleSiteClientApprovalRow } from "./client-approval-service";

export const LAUNCH_APPROVAL_SERVICE_VERSION = "mvp-34-launch-approval-service:v1" as const;
export const LAUNCH_APPROVAL_AAF_SCOPE = "single_site_launch_approval" as const;
export const LAUNCH_APPROVAL_AAF_ACTION = "approve_single_site_launch_readiness" as const;
export const LAUNCH_APPROVAL_AAF_SUBJECT_TYPE = "single_site_launch_readiness_review" as const;

export type LaunchApprovalAafValidationResult = {
  valid: boolean;
  status: "granted" | "granted_with_limitations" | "denied" | string;
  scope: string;
  subjectType: string;
  subjectId: string;
  approvalRequestId?: string | null;
  approvalDecisionId: string;
  evidencePackageId?: string | null;
  limitations?: unknown[];
  blockerCodes?: unknown[];
  semanticWatermark?: string | null;
};

export type LaunchApprovalEnvelope = {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type LaunchApprovalRequiredRefs = {
  contentApprovalId: string;
  contentApprovalStatus: "approved" | "approved_with_limitations";
  aafContentApprovalDecisionId: string;
  requireClientApproval: boolean;
  clientApprovalId: string | null;
  clientApprovalStatus: "approved" | "approved_with_limitations" | null;
  aafClientApprovalDecisionId: string | null;
  improvedVersionReviewId: string;
  improvedVersionReviewStatus: "accepted" | "accepted_with_limitations";
  improvedCandidateSiteVersionRef: string;
  improvedRuntimeArtifactRef: string;
  proposalPlanId: string;
  proposalApprovalDecisionId: string;
  implementationAuthorizationDecisionId: string;
  executionAttemptId: string;
  selectedRecommendationRefs: unknown[];
  domainReadinessRef: string | null;
  billingHostingEntitlementRef: string | null;
  rollbackReadinessRef: string | null;
  publishTargetRef: string | null;
};

export type CreateOrReuseLaunchApprovalInput = LaunchApprovalEnvelope & {
  migrationId: string;
  clientId: string;
  siteId: string;
  contentApprovalId?: string | null;
  requireClientApproval?: boolean | null;
  clientApprovalId?: string | null;
  requiredRefs?: Partial<LaunchApprovalRequiredRefs>;
  aafLaunchApprovalRequestId?: string | null;
  aafLaunchApprovalDecisionId?: string | null;
  aafScope?: string | null;
  aafAction?: string | null;
  aafSubjectType?: string | null;
  evidencePackageRefsJson?: unknown[];
  launchChecklistRefsJson?: unknown[];
  blockerRefsJson?: unknown[];
  smokeQaRefsJson?: unknown[];
  reviewerIdentityRefsJson?: unknown[];
  reviewerRepresentativeRefsJson?: unknown[];
  requireReviewerIdentity?: boolean | null;
  limitationsJson?: unknown[];
  operatorNotesJson?: unknown[];
  findingsSummaryJson?: SingleSiteJsonObject;
  supersedesLaunchApprovalId?: string | null;
  revisionRef?: string | null;
};

export type RecordLaunchApprovalRefInput = LaunchApprovalEnvelope & {
  launchApprovalId: string;
  migrationId: string;
  refRole: SingleSiteLaunchApprovalRefRole;
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

export type AddLaunchApprovalFindingInput = LaunchApprovalEnvelope & {
  launchApprovalId: string;
  migrationId: string;
  itemKey: string;
  category: SingleSiteLaunchApprovalCategory;
  severity: SingleSiteLaunchApprovalSeverity;
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

export type LaunchApprovalDecisionInput = LaunchApprovalEnvelope & {
  launchApprovalId: string;
  aafLaunchApprovalDecisionId?: string | null;
  launchApprovalValidation?: LaunchApprovalAafValidationResult | null;
  aafScope?: string | null;
  aafAction?: string | null;
  aafSubjectType?: string | null;
  limitationsJson?: unknown[];
  blockerRefsJson?: unknown[];
  operatorNotesJson?: unknown[];
  findingsSummaryJson?: SingleSiteJsonObject;
  decisionSummaryJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  replacementLaunchApprovalId?: string | null;
  reason?: string | null;
};

export type SingleSiteLaunchApprovalRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string;
  content_approval_id: string;
  content_approval_status: "approved" | "approved_with_limitations";
  aaf_content_approval_decision_id: string;
  require_client_approval: boolean;
  client_approval_id: string | null;
  client_approval_status: "approved" | "approved_with_limitations" | null;
  aaf_client_approval_decision_id: string | null;
  improved_version_review_id: string;
  improved_version_review_status: "accepted" | "accepted_with_limitations";
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  proposal_plan_id: string;
  proposal_approval_decision_id: string;
  implementation_authorization_decision_id: string;
  execution_attempt_id: string;
  selected_recommendation_refs_json: unknown;
  domain_readiness_ref: string | null;
  billing_hosting_entitlement_ref: string | null;
  rollback_readiness_ref: string | null;
  publish_target_ref: string | null;
  status: SingleSiteLaunchApprovalStatus;
  decision: SingleSiteLaunchApprovalDecision | null;
  readiness_work_ready: boolean;
  approved_with_limitations: boolean;
  launch_revision_required: boolean;
  aaf_launch_approval_request_id: string | null;
  aaf_launch_approval_decision_id: string | null;
  aaf_launch_approval_scope: string | null;
  aaf_launch_approval_action: string | null;
  aaf_launch_approval_subject_type: string | null;
  evidence_package_refs_json: unknown;
  launch_checklist_refs_json: unknown;
  blocker_refs_json: unknown;
  smoke_qa_refs_json: unknown;
  reviewer_identity_refs_json: unknown;
  reviewer_representative_refs_json: unknown;
  limitations_json: unknown;
  operator_notes_json: unknown;
  findings_summary_json: unknown;
  decision_summary_json: unknown;
  non_approval_boundary_json: unknown;
  launch_approval_granted: boolean;
  publish_activation_approval_granted: boolean;
  publish_readiness_not_granted: boolean;
  active_pointer_changed: boolean;
  runtime_artifacts_mutated: boolean;
  site_versions_mutated: boolean;
  reviewer_actor_type: string | null;
  reviewer_actor_id: string | null;
  reviewer_actor_role: string | null;
  reviewer_actor_display_label: string | null;
  review_started_at: string | null;
  decided_at: string | null;
  supersedes_launch_approval_id: string | null;
  superseded_by_launch_approval_id: string | null;
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

export type SingleSiteLaunchApprovalRefRow = {
  id: string;
  launch_approval_id: string;
  migration_id: string;
  ref_role: SingleSiteLaunchApprovalRefRole;
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

export type SingleSiteLaunchApprovalItemRow = {
  id: string;
  launch_approval_id: string;
  migration_id: string;
  item_key: string;
  category: SingleSiteLaunchApprovalCategory;
  severity: SingleSiteLaunchApprovalSeverity;
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

export type SingleSiteLaunchApprovalEventRow = {
  id: string;
  launch_approval_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteLaunchApprovalEventAction;
  from_status: SingleSiteLaunchApprovalStatus | null;
  to_status: SingleSiteLaunchApprovalStatus | null;
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

export type LaunchApprovalOperationResult = {
  launchApproval: SingleSiteLaunchApprovalRow;
  eventId?: string;
  reusedExisting: boolean;
};

export type LaunchApprovalReadiness = {
  migrationId: string;
  ready: boolean;
  launchApprovalId: string | null;
  status: SingleSiteLaunchApprovalStatus | "missing";
  missingRequirements: string[];
  limitations: unknown[];
};

type InsertableRow = Record<string, unknown>;
type ClientEventWithoutIndex = Omit<InsertLaunchApprovalEventInput, "eventIndex">;

type InsertLaunchApprovalEventInput = LaunchApprovalEnvelope & {
  launchApprovalId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteLaunchApprovalEventAction;
  fromStatus?: SingleSiteLaunchApprovalStatus | null;
  toStatus?: SingleSiteLaunchApprovalStatus | null;
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

function defaultReviewerIdentityRefs(input: CreateOrReuseLaunchApprovalInput): unknown[] {
  const supplied = jsonArray(input.reviewerIdentityRefsJson);
  if (supplied.length > 0) return supplied;
  return [{ sourceRecordId: input.actor.actorId, refType: "launch_reviewer_identity", sourceSystem: "gnr8_actor" }];
}

function defaultReviewerRepresentativeRefs(input: CreateOrReuseLaunchApprovalInput): unknown[] {
  const supplied = jsonArray(input.reviewerRepresentativeRefsJson);
  if (supplied.length > 0) return supplied;
  return [{ sourceRecordId: input.actor.actorRole ?? "migration_operator", refType: "launch_reviewer_role", sourceSystem: "gnr8_actor" }];
}

function launchApprovalWatermark(input: LaunchApprovalRequiredRefs): string {
  return `single-site-launch-approval:${digest(input)}`;
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
  const scope = optionalText(input.aafScope) ?? LAUNCH_APPROVAL_AAF_SCOPE;
  const action = optionalText(input.aafAction) ?? LAUNCH_APPROVAL_AAF_ACTION;
  const subjectType = optionalText(input.aafSubjectType) ?? LAUNCH_APPROVAL_AAF_SUBJECT_TYPE;
  if (scope !== LAUNCH_APPROVAL_AAF_SCOPE) throw new SingleSiteTransitionError("launch approval AAF ref must use single_site_launch_approval scope");
  if (action !== LAUNCH_APPROVAL_AAF_ACTION) throw new SingleSiteTransitionError("launch approval AAF ref must use approve_single_site_launch_readiness action");
  if (subjectType !== LAUNCH_APPROVAL_AAF_SUBJECT_TYPE) throw new SingleSiteTransitionError("launch approval AAF ref must use single_site_launch_readiness_review subject type");
  return { scope, action, subjectType };
}

function assertLaunchApprovalDecisionRefShape(
  decisionId: string,
  validation: LaunchApprovalAafValidationResult | null | undefined,
  allowedStatuses: readonly ("granted" | "granted_with_limitations")[],
): LaunchApprovalAafValidationResult | null {
  if (!validation) return null;
  if (!validation.valid) throw new SingleSiteTransitionError("launch approval AAF decision validation was not successful");
  if (validation.scope !== LAUNCH_APPROVAL_AAF_SCOPE) throw new SingleSiteTransitionError("validated launch approval AAF decision has wrong scope");
  if (validation.subjectType !== LAUNCH_APPROVAL_AAF_SUBJECT_TYPE) throw new SingleSiteTransitionError("validated launch approval AAF decision has wrong subject type");
  if (validation.approvalDecisionId !== decisionId) throw new SingleSiteTransitionError("validated launch approval AAF decision id does not match supplied ref");
  if (!allowedStatuses.includes(validation.status as "granted" | "granted_with_limitations")) {
    throw new SingleSiteTransitionError(`validated launch approval AAF decision status ${validation.status} is not allowed for this operation`);
  }
  return validation;
}

function withCarriedValidationLimitations(
  input: LaunchApprovalDecisionInput,
  status: SingleSiteLaunchApprovalStatus,
): LaunchApprovalDecisionInput {
  if (status !== "approved" && status !== "approved_with_limitations") return input;
  const decisionId = optionalText(input.aafLaunchApprovalDecisionId);
  if (!decisionId) return input;
  const validation = assertLaunchApprovalDecisionRefShape(
    decisionId,
    input.launchApprovalValidation,
    status === "approved" ? ["granted"] : ["granted_with_limitations"],
  );
  if (status !== "approved_with_limitations") return input;
  const carried = jsonArray(validation?.limitations);
  const supplied = jsonArray(input.limitationsJson);
  return { ...input, limitationsJson: [...carried, ...supplied] };
}

function decisionFor(status: SingleSiteLaunchApprovalStatus): SingleSiteLaunchApprovalDecision | null {
  if (status === "approved") return "approve";
  if (status === "approved_with_limitations") return "approve_with_limitations";
  if (status === "blocked") return "block";
  if (status === "rejected") return "reject";
  if (status === "superseded") return "supersede";
  if (status === "cancelled") return "cancel";
  return null;
}

function eventAction(status: SingleSiteLaunchApprovalStatus): SingleSiteLaunchApprovalEventAction {
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "in_review") return "review_started";
  if (status === "blocked") return "blocked";
  if (status === "approved_with_limitations") return "approved_with_limitations";
  if (status === "approved" || status === "rejected" || status === "superseded" || status === "cancelled") return status;
  return "ref_attached";
}

function terminalStatus(status: SingleSiteLaunchApprovalStatus): boolean {
  return ["approved", "approved_with_limitations", "rejected", "superseded", "cancelled"].includes(status);
}

function hasRequiredLaunchApprovalRefs(refs: readonly SingleSiteLaunchApprovalRefRow[]): boolean {
  const roles = new Set(refs.map((ref) => ref.ref_role));
  return [
    "migration",
    "client",
    "site",
    "content_approval",
    "aaf_content_approval_decision",
    "improved_version_review",
    "improved_candidate_site_version",
    "improved_runtime_artifact",
    "proposal_plan",
    "proposal_approval",
    "implementation_authorization",
    "execution_attempt",
    "selected_recommendation",
  ].every((role) => roles.has(role as SingleSiteLaunchApprovalRefRole));
}

function assertEventSemanticMatch(event: SingleSiteLaunchApprovalEventRow, input: ClientEventWithoutIndex): void {
  const attempted: Record<string, unknown> = {
    launch_approval_id: input.launchApprovalId,
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
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError("gnr8_single_site_launch_approval_events", input.idempotencyKey, drifted);
}

export class LaunchApprovalService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async createOrReuseLaunchApproval(input: CreateOrReuseLaunchApprovalInput): Promise<LaunchApprovalOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      if (optionalText(input.aafLaunchApprovalDecisionId)) {
        throw new SingleSiteTransitionError("launch approval decision refs must be attached after MVP-35 bridge validation");
      }
      const migration = await this.requiredNonTerminalMigration(tx, input.migrationId);
      if (migration.client_id !== requiredText("clientId", input.clientId)) throw new SingleSiteTransitionError("launch approval clientId does not match migration");
      if ((migration.site_id ?? "") !== requiredText("siteId", input.siteId)) throw new SingleSiteTransitionError("launch approval siteId does not match migration");
      const contentApproval = await this.requiredApprovedContentApproval(tx, migration.id, input.contentApprovalId ?? undefined);
      const requireClientApproval = input.requireClientApproval ?? input.requiredRefs?.requireClientApproval ?? false;
      const clientApproval = requireClientApproval ? await this.requiredApprovedClientApproval(tx, migration.id, input.clientApprovalId ?? input.requiredRefs?.clientApprovalId ?? undefined) : null;
      const refs = this.requiredRefsFromApprovals(contentApproval, clientApproval, requireClientApproval, input);
      if (refs.selectedRecommendationRefs.length === 0) throw new SingleSiteTransitionError("selected recommendation refs are required");
      if (input.requireReviewerIdentity !== false && (defaultReviewerIdentityRefs(input).length === 0 || defaultReviewerRepresentativeRefs(input).length === 0)) {
        throw new SingleSiteTransitionError("launch approval requires reviewer identity and representative role refs");
      }

      const existing = await this.findLaunchApprovalBySemanticRefs(tx, migration.id, refs);
      const created = existing ? { row: existing, reusedExisting: true } : await this.insertLaunchApproval(tx, { migration, contentApproval, refs, input });
      const event = await this.insertEventIfNeeded(tx, {
        launchApprovalId: created.row.id,
        migrationId: migration.id,
        eventAction: "created",
        fromStatus: null,
        toStatus: created.row.status,
        actor: input.actor,
        detailsJson: {
          contentApprovalId: refs.contentApprovalId,
          aafContentApprovalDecisionId: refs.aafContentApprovalDecisionId,
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
      await this.ensureLaunchApprovalRequiredState(tx, migration, created.row, input);
      return { launchApproval: created.row, eventId: event.id, reusedExisting: created.reusedExisting || event.reusedExisting };
    });
  }

  async attachAafRequestRef(input: RecordLaunchApprovalRefInput & { aafScope?: string | null; aafAction?: string | null; aafSubjectType?: string | null }): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    normalizeAafShape(input);
    const result = await this.recordRef({ ...input, refRole: "aaf_launch_approval_request", refType: input.refType || "aaf_approval_request" });
    await this.patchAafRef(input.launchApprovalId, { requestId: input.sourceRecordId, input });
    return result;
  }

  async attachAafDecisionRef(
    input: RecordLaunchApprovalRefInput & {
      launchApprovalValidation?: LaunchApprovalAafValidationResult | null;
      aafScope?: string | null;
      aafAction?: string | null;
      aafSubjectType?: string | null;
    },
  ): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    normalizeAafShape(input);
    const validation = assertLaunchApprovalDecisionRefShape(input.sourceRecordId, input.launchApprovalValidation, ["granted", "granted_with_limitations"]);
    if (validation && validation.subjectId !== input.launchApprovalId) throw new SingleSiteTransitionError("validated launch approval AAF decision has wrong subject id");
    const result = await this.recordRef({ ...input, refRole: "aaf_launch_approval_decision", refType: input.refType || "aaf_approval_decision" });
    await this.patchAafRef(input.launchApprovalId, { decisionId: input.sourceRecordId, input });
    return result;
  }

  async recordRef(input: RecordLaunchApprovalRefInput): Promise<{ refId: string; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenLaunchApproval(tx, input.launchApprovalId);
      const ref = await this.insertLaunchApprovalRef(tx, input);
      const event = await this.insertEventIfNeeded(tx, {
        launchApprovalId: approval.id,
        migrationId: approval.migration_id,
        eventAction:
          input.refRole === "aaf_launch_approval_request"
            ? "aaf_request_attached"
            : input.refRole === "aaf_launch_approval_decision"
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

  async addFinding(input: AddLaunchApprovalFindingInput): Promise<{ item: SingleSiteLaunchApprovalItemRow; eventId: string; reusedExisting: boolean }> {
    return this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenLaunchApproval(tx, input.launchApprovalId);
      const item = await this.upsertLaunchApprovalItem(tx, approval, input);
      const event = await this.insertEventIfNeeded(tx, {
        launchApprovalId: approval.id,
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

  async markReadyForReview(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    return this.moveStatus(input, "ready_for_review");
  }

  async startReview(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    return this.moveStatus(input, "in_review", { reviewStartedAt: new Date().toISOString() });
  }

  async markBlocked(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "blocked");
  }

  async approve(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    return this.recordDecision(input, "approved");
  }

  async approveWithLimitations(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    return this.recordDecision(input, "approved_with_limitations");
  }

  async reject(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "rejected");
  }

  async cancel(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    requiredText("reason", input.reason);
    return this.recordDecision(input, "cancelled");
  }

  async supersede(input: LaunchApprovalDecisionInput): Promise<LaunchApprovalOperationResult> {
    if (!input.replacementLaunchApprovalId && !input.reason) throw new SingleSiteTransitionError("supersede requires a replacement launch approval ref or reason");
    return this.recordDecision(input, "superseded");
  }

  async readLatestLaunchApprovalForMigration(migrationId: string): Promise<SingleSiteLaunchApprovalRow | null> {
    return this.repository.withTransaction((tx) => this.getLatestLaunchApprovalForMigration(tx, requiredText("migrationId", migrationId)));
  }

  async getLaunchApprovalReadiness(migrationId: string): Promise<LaunchApprovalReadiness> {
    return this.repository.withTransaction(async (tx) => {
      const latest = await this.getLatestLaunchApprovalForMigration(tx, requiredText("migrationId", migrationId));
      if (!latest) return { migrationId, ready: false, launchApprovalId: null, status: "missing", missingRequirements: ["approved_launch_approval"], limitations: [] };
      const refs = await this.listLaunchApprovalRefs(tx, latest.id);
      const ready = latest.readiness_work_ready && ["approved", "approved_with_limitations"].includes(latest.status) && hasRequiredLaunchApprovalRefs(refs);
      return {
        migrationId,
        ready,
        launchApprovalId: latest.id,
        status: latest.status,
        missingRequirements: ready
          ? []
          : [
              latest.readiness_work_ready ? null : "approved_launch_approval",
              latest.aaf_launch_approval_decision_id ? null : "aaf_launch_approval_decision_ref",
              hasRequiredLaunchApprovalRefs(refs) ? null : "required_launch_approval_refs",
            ].filter((value): value is string => Boolean(value)),
        limitations: jsonArray(latest.limitations_json),
      };
    });
  }

  private requiredRefsFromApprovals(
    contentApproval: SingleSiteContentApprovalRow,
    clientApproval: SingleSiteClientApprovalRow | null,
    requireClientApproval: boolean,
    input: CreateOrReuseLaunchApprovalInput,
  ): LaunchApprovalRequiredRefs {
    if (requireClientApproval && !clientApproval) throw new SingleSiteTransitionError("client approval is required before launch approval");
    return {
      contentApprovalId: requiredText("content approval ref", input.requiredRefs?.contentApprovalId ?? contentApproval.id),
      contentApprovalStatus: (input.requiredRefs?.contentApprovalStatus ?? contentApproval.status) as "approved" | "approved_with_limitations",
      aafContentApprovalDecisionId: requiredText(
        "AAF content approval decision ref",
        input.requiredRefs?.aafContentApprovalDecisionId ?? contentApproval.aaf_content_approval_decision_id,
      ),
      requireClientApproval,
      clientApprovalId: requireClientApproval ? requiredText("client approval ref", input.requiredRefs?.clientApprovalId ?? clientApproval?.id) : null,
      clientApprovalStatus: requireClientApproval
        ? ((input.requiredRefs?.clientApprovalStatus ?? clientApproval?.status) as "approved" | "approved_with_limitations")
        : null,
      aafClientApprovalDecisionId: requireClientApproval
        ? requiredText("AAF client approval decision ref", input.requiredRefs?.aafClientApprovalDecisionId ?? clientApproval?.aaf_client_approval_decision_id)
        : null,
      improvedVersionReviewId: requiredText("improved version review ref", input.requiredRefs?.improvedVersionReviewId ?? contentApproval.improved_version_review_id),
      improvedVersionReviewStatus: (input.requiredRefs?.improvedVersionReviewStatus ?? contentApproval.improved_version_review_status) as "accepted" | "accepted_with_limitations",
      improvedCandidateSiteVersionRef: requiredText(
        "improved candidate site version ref",
        input.requiredRefs?.improvedCandidateSiteVersionRef ?? contentApproval.improved_candidate_site_version_ref,
      ),
      improvedRuntimeArtifactRef: requiredText("improved runtime artifact ref", input.requiredRefs?.improvedRuntimeArtifactRef ?? contentApproval.improved_runtime_artifact_ref),
      proposalPlanId: requiredText("proposal plan ref", input.requiredRefs?.proposalPlanId ?? contentApproval.proposal_plan_id),
      proposalApprovalDecisionId: requiredText("proposal approval decision ref", input.requiredRefs?.proposalApprovalDecisionId ?? contentApproval.proposal_approval_decision_id),
      implementationAuthorizationDecisionId: requiredText(
        "implementation authorization decision ref",
        input.requiredRefs?.implementationAuthorizationDecisionId ?? contentApproval.implementation_authorization_decision_id,
      ),
      executionAttemptId: requiredText("execution attempt ref", input.requiredRefs?.executionAttemptId ?? contentApproval.execution_attempt_id),
      selectedRecommendationRefs: jsonArray(input.requiredRefs?.selectedRecommendationRefs ?? contentApproval.selected_recommendation_refs_json),
      domainReadinessRef: optionalText(input.requiredRefs?.domainReadinessRef),
      billingHostingEntitlementRef: optionalText(input.requiredRefs?.billingHostingEntitlementRef),
      rollbackReadinessRef: optionalText(input.requiredRefs?.rollbackReadinessRef),
      publishTargetRef: optionalText(input.requiredRefs?.publishTargetRef),
    };
  }

  private async insertLaunchApproval(
    tx: SingleSiteStateWriterTx,
    context: { migration: SingleSiteMigrationRow; contentApproval: SingleSiteContentApprovalRow; refs: LaunchApprovalRequiredRefs; input: CreateOrReuseLaunchApprovalInput },
  ): Promise<{ row: SingleSiteLaunchApprovalRow; reusedExisting: boolean }> {
    const { migration, refs, input } = context;
    const aaf = normalizeAafShape(input);
    const limitations = input.limitationsJson ?? jsonArray(context.contentApproval.limitations_json);
    return insertReturning<SingleSiteLaunchApprovalRow>(
      tx,
      "gnr8_single_site_launch_approvals",
      {
        migration_id: migration.id,
        client_id: input.clientId,
        site_id: input.siteId,
        content_approval_id: refs.contentApprovalId,
        content_approval_status: refs.contentApprovalStatus,
        aaf_content_approval_decision_id: refs.aafContentApprovalDecisionId,
        require_client_approval: refs.requireClientApproval,
        client_approval_id: refs.clientApprovalId,
        client_approval_status: refs.clientApprovalStatus,
        aaf_client_approval_decision_id: refs.aafClientApprovalDecisionId,
        improved_version_review_id: refs.improvedVersionReviewId,
        improved_version_review_status: refs.improvedVersionReviewStatus,
        improved_candidate_site_version_ref: refs.improvedCandidateSiteVersionRef,
        improved_runtime_artifact_ref: refs.improvedRuntimeArtifactRef,
        proposal_plan_id: refs.proposalPlanId,
        proposal_approval_decision_id: refs.proposalApprovalDecisionId,
        implementation_authorization_decision_id: refs.implementationAuthorizationDecisionId,
        execution_attempt_id: refs.executionAttemptId,
        selected_recommendation_refs_json: refs.selectedRecommendationRefs,
        domain_readiness_ref: refs.domainReadinessRef,
        billing_hosting_entitlement_ref: refs.billingHostingEntitlementRef,
        rollback_readiness_ref: refs.rollbackReadinessRef,
        publish_target_ref: refs.publishTargetRef,
        status: "draft",
        aaf_launch_approval_request_id: optionalText(input.aafLaunchApprovalRequestId),
        aaf_launch_approval_decision_id: optionalText(input.aafLaunchApprovalDecisionId),
        aaf_launch_approval_scope: aaf.scope,
        aaf_launch_approval_action: aaf.action,
        aaf_launch_approval_subject_type: aaf.subjectType,
        evidence_package_refs_json: input.evidencePackageRefsJson ?? [],
        launch_checklist_refs_json: input.launchChecklistRefsJson ?? [],
        blocker_refs_json: input.blockerRefsJson ?? [],
        smoke_qa_refs_json: input.smokeQaRefsJson ?? [],
        reviewer_identity_refs_json: defaultReviewerIdentityRefs(input),
        reviewer_representative_refs_json: defaultReviewerRepresentativeRefs(input),
        limitations_json: limitations,
        operator_notes_json: input.operatorNotesJson ?? [],
        findings_summary_json: input.findingsSummaryJson ?? {},
        supersedes_launch_approval_id: optionalText(input.supersedesLaunchApprovalId),
        revision_ref: optionalText(input.revisionRef),
        correlation_id: input.correlationId,
        causation_id: optionalText(input.causationId),
        idempotency_key: input.idempotencyKey,
        request_id: optionalText(input.requestId),
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        semantic_watermark: launchApprovalWatermark(refs),
        metadata_json: {
          ...input.metadataJson,
          serviceVersion: LAUNCH_APPROVAL_SERVICE_VERSION,
          launchApprovalGranted: false,
          publishActivationApprovalGranted: false,
          publishReadinessNotGranted: true,
          activePointerChanged: false,
          runtimeMutationPerformedByLaunchApproval: false,
          aafBridgeValidationDeferredTo: "mvp-35",
        },
      },
      [
        "migration_id",
        "client_id",
        "site_id",
        "content_approval_id",
        "content_approval_status",
        "aaf_content_approval_decision_id",
        "require_client_approval",
        "client_approval_id",
        "client_approval_status",
        "aaf_client_approval_decision_id",
        "improved_version_review_id",
        "improved_version_review_status",
        "improved_candidate_site_version_ref",
        "improved_runtime_artifact_ref",
        "proposal_plan_id",
        "proposal_approval_decision_id",
        "implementation_authorization_decision_id",
        "execution_attempt_id",
        "selected_recommendation_refs_json",
        "domain_readiness_ref",
        "billing_hosting_entitlement_ref",
        "rollback_readiness_ref",
        "publish_target_ref",
        "status",
        "aaf_launch_approval_request_id",
        "aaf_launch_approval_decision_id",
        "aaf_launch_approval_scope",
        "aaf_launch_approval_action",
        "aaf_launch_approval_subject_type",
        "evidence_package_refs_json",
        "launch_checklist_refs_json",
        "blocker_refs_json",
        "smoke_qa_refs_json",
        "reviewer_identity_refs_json",
        "reviewer_representative_refs_json",
        "limitations_json",
        "operator_notes_json",
        "findings_summary_json",
        "supersedes_launch_approval_id",
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
    approval: SingleSiteLaunchApprovalRow,
    refs: LaunchApprovalRequiredRefs,
    input: CreateOrReuseLaunchApprovalInput,
  ): Promise<void> {
    const base = {
      launchApprovalId: approval.id,
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
    const refRows: Array<[SingleSiteLaunchApprovalRefRole, string, string, string | null, string]> = [
      ["migration", "single_site_migration", approval.migration_id, "gnr8_single_site_migrations", "migration"],
      ["client", "client", approval.client_id, null, "client"],
      ["site", "site", approval.site_id, null, "site"],
      ["content_approval", "single_site_content_approval", refs.contentApprovalId, "gnr8_single_site_content_approvals", "content_approval"],
      ["aaf_content_approval_decision", "aaf_approval_decision", refs.aafContentApprovalDecisionId, "gnr8_aaf_approval_decisions", "aaf_content_approval_decision"],
      ...(refs.requireClientApproval && refs.clientApprovalId && refs.aafClientApprovalDecisionId
        ? ([
            ["client_approval", "single_site_client_approval", refs.clientApprovalId, "gnr8_single_site_client_approvals", "client_approval"],
            ["aaf_client_approval_decision", "aaf_approval_decision", refs.aafClientApprovalDecisionId, "gnr8_aaf_approval_decisions", "aaf_client_approval_decision"],
          ] as Array<[SingleSiteLaunchApprovalRefRole, string, string, string | null, string]>)
        : []),
      ["improved_version_review", "improved_version_review", refs.improvedVersionReviewId, "gnr8_single_site_improved_version_reviews", "improved_version_review"],
      ["improved_candidate_site_version", "runtime_site_version_improved_candidate", refs.improvedCandidateSiteVersionRef, "gnr8_runtime_site_versions", "improved_candidate_site_version"],
      ["improved_runtime_artifact", "runtime_artifact_improved_candidate", refs.improvedRuntimeArtifactRef, "gnr8_runtime_artifacts", "improved_runtime_artifact"],
      ["proposal_plan", "improvement_proposal_plan", refs.proposalPlanId, "gnr8_single_site_improvement_proposal_plans", "proposal_plan"],
      ["proposal_approval", "aaf_approval_decision", refs.proposalApprovalDecisionId, "gnr8_aaf_approval_decisions", "proposal_approval"],
      ["implementation_authorization", "aaf_approval_decision", refs.implementationAuthorizationDecisionId, "gnr8_aaf_approval_decisions", "implementation_authorization"],
      ["execution_attempt", "improvement_execution_attempt", refs.executionAttemptId, "gnr8_single_site_improvement_execution_attempts", "execution_attempt"],
      ...(refs.domainReadinessRef
        ? ([["domain_readiness_placeholder", "domain_readiness_placeholder", refs.domainReadinessRef, null, "domain_readiness_placeholder"]] as Array<[SingleSiteLaunchApprovalRefRole, string, string, string | null, string]>)
        : []),
      ...(refs.billingHostingEntitlementRef
        ? ([["billing_hosting_entitlement_placeholder", "billing_hosting_entitlement_placeholder", refs.billingHostingEntitlementRef, null, "billing_hosting_entitlement_placeholder"]] as Array<[SingleSiteLaunchApprovalRefRole, string, string, string | null, string]>)
        : []),
      ...(refs.rollbackReadinessRef
        ? ([["rollback_readiness_placeholder", "rollback_readiness_placeholder", refs.rollbackReadinessRef, null, "rollback_readiness_placeholder"]] as Array<[SingleSiteLaunchApprovalRefRole, string, string, string | null, string]>)
        : []),
      ...(refs.publishTargetRef
        ? ([["publish_target_placeholder", "publish_target_placeholder", refs.publishTargetRef, null, "publish_target_placeholder"]] as Array<[SingleSiteLaunchApprovalRefRole, string, string, string | null, string]>)
        : []),
    ];
    if (approval.aaf_launch_approval_request_id) {
      refRows.push(["aaf_launch_approval_request", "aaf_approval_request", approval.aaf_launch_approval_request_id, "gnr8_aaf_approval_requests", "aaf_launch_approval_request"]);
    }
    if (approval.aaf_launch_approval_decision_id) {
      refRows.push(["aaf_launch_approval_decision", "aaf_approval_decision", approval.aaf_launch_approval_decision_id, "gnr8_aaf_approval_decisions", "aaf_launch_approval_decision"]);
    }
    for (const [role, refType, sourceRecordId, sourceTable, key] of refRows) {
      await this.insertLaunchApprovalRef(tx, {
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
      await this.insertLaunchApprovalRef(tx, {
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
      ["launch_checklist", jsonArray(approval.launch_checklist_refs_json)],
      ["blocker", jsonArray(approval.blocker_refs_json)],
      ["smoke_qa", jsonArray(approval.smoke_qa_refs_json)],
      ["reviewer_identity", jsonArray(approval.reviewer_identity_refs_json)],
      ["reviewer_representative_role", jsonArray(approval.reviewer_representative_refs_json)],
      ["limitation", jsonArray(approval.limitations_json)],
      ["operator_note", jsonArray(approval.operator_notes_json)],
    ] as Array<[SingleSiteLaunchApprovalRefRole, unknown[]]>) {
      for (const [index, value] of values.entries()) {
        const record = jsonObject(value);
        const sourceRecordId = optionalText(record.sourceRecordId ?? record.id ?? record.ref);
        if (!sourceRecordId) continue;
        await this.insertLaunchApprovalRef(tx, {
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
      refRole: "launch_approval",
      refType: "single_site_launch_approval",
      sourceTable: "gnr8_single_site_launch_approvals",
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
        readinessWorkReady: false,
        publishActivationApprovalGranted: false,
        publishReadinessNotGranted: true,
      },
      idempotencyKey: `${input.idempotencyKey}:migration_ref:launch_approval`,
    });
  }

  private async ensureLaunchApprovalRequiredState(
    tx: SingleSiteStateWriterTx,
    migration: SingleSiteMigrationRow,
    approval: SingleSiteLaunchApprovalRow,
    input: CreateOrReuseLaunchApprovalInput,
  ): Promise<void> {
    if (migration.current_state === "launch_approval_required") {
      await this.repository.upsertStageSummary(tx, {
        migrationId: migration.id,
        stage: "launch_publish_recovery",
        status: "ready_for_review",
        summaryJson: { latestLaunchApprovalId: approval.id, launchApprovalStatus: approval.status },
        limitationsJson: jsonArray(approval.limitations_json),
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:stage:launch_approval_required`,
      });
      return;
    }
    if (!["content_approved", "client_approval_required"].includes(migration.current_state)) return;
    const stateEvent = await this.repository.insertStateEvent(tx, {
      migrationId: migration.id,
      eventIndex: await this.repository.nextStateEventIndex(tx, migration.id),
      fromState: migration.current_state,
      toState: "launch_approval_required",
      transitionKey: "launch_approval_service.launch_approval_required",
      transitionReason: approval.content_approval_status,
      requiredRefsJson: {
        launchApprovalId: approval.id,
        contentApprovalId: approval.content_approval_id,
        aafContentApprovalDecisionId: approval.aaf_content_approval_decision_id,
        improvedVersionReviewId: approval.improved_version_review_id,
        improvedCandidateSiteVersionRef: approval.improved_candidate_site_version_ref,
        improvedRuntimeArtifactRef: approval.improved_runtime_artifact_ref,
      },
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:state:launch_approval_required`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: { ...input.metadataJson, launchApprovalGranted: false, publishActivationApprovalGranted: false },
    });
    await this.repository.updateMigrationCurrentState(tx, {
      migrationId: migration.id,
      toState: "launch_approval_required",
      latestStateEventId: stateEvent.row.id,
    });
    await this.repository.upsertStageSummary(tx, {
      migrationId: migration.id,
      stage: "launch_publish_recovery",
      status: "ready_for_review",
      latestStateEventId: stateEvent.row.id,
      summaryJson: { latestLaunchApprovalId: approval.id, launchApprovalStatus: approval.status },
      limitationsJson: jsonArray(approval.limitations_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:launch_approval_required`,
    });
  }

  private async moveStatus(
    input: LaunchApprovalDecisionInput,
    status: SingleSiteLaunchApprovalStatus,
    patch: { reviewStartedAt?: string | null } = {},
  ): Promise<LaunchApprovalOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenLaunchApproval(tx, input.launchApprovalId);
      await this.requiredNonTerminalMigration(tx, approval.migration_id);
      const updated = await this.updateLaunchApprovalStatus(tx, approval, input, status, patch);
      const event = await this.insertEventIfNeeded(tx, {
        launchApprovalId: approval.id,
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
      return { launchApproval: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private async recordDecision(
    input: LaunchApprovalDecisionInput,
    status: "blocked" | "approved" | "approved_with_limitations" | "rejected" | "superseded" | "cancelled",
  ): Promise<LaunchApprovalOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const effectiveInput = withCarriedValidationLimitations(input, status);
      const approvalMaybe = await this.getLaunchApprovalById(tx, requiredText("launchApprovalId", input.launchApprovalId));
      if (!approvalMaybe) throw new SingleSiteTransitionError(`launch approval ${input.launchApprovalId} was not found`);
      const eventKey = `${input.idempotencyKey}:event:${status}`;
      const existingEvent = await this.getLaunchApprovalEventByIdempotencyKey(tx, eventKey);
      if (existingEvent) {
        assertEventSemanticMatch(existingEvent, {
          launchApprovalId: approvalMaybe.id,
          migrationId: approvalMaybe.migration_id,
          eventAction: eventAction(status),
          fromStatus: existingEvent.from_status,
          toStatus: existingEvent.to_status,
          actor: effectiveInput.actor,
          detailsJson: effectiveInput.detailsJson ?? { reason: effectiveInput.reason ?? null, replacementLaunchApprovalId: effectiveInput.replacementLaunchApprovalId ?? null },
          limitationsJson: effectiveInput.limitationsJson,
          correlationId: effectiveInput.correlationId,
          causationId: effectiveInput.causationId,
          idempotencyKey: eventKey,
          requestId: effectiveInput.requestId,
          privacyLabel: effectiveInput.privacyLabel,
          retentionClass: effectiveInput.retentionClass,
          metadataJson: effectiveInput.metadataJson,
        });
        return { launchApproval: approvalMaybe, eventId: existingEvent.id, reusedExisting: true };
      }
      const approval = await this.requiredOpenLaunchApproval(tx, input.launchApprovalId);
      const migration = await this.requiredNonTerminalMigration(tx, approval.migration_id);
      const items = await this.listLaunchApprovalItems(tx, approval.id);
      const refs = await this.listLaunchApprovalRefs(tx, approval.id);
      this.assertDecisionAllowed(status, approval, effectiveInput, items, refs);
      const updated = await this.updateLaunchApprovalStatus(tx, approval, effectiveInput, status, {
        decidedAt: new Date().toISOString(),
        supersededByLaunchApprovalId: status === "superseded" ? effectiveInput.replacementLaunchApprovalId : undefined,
      });
      const event = await this.insertEventIfNeeded(tx, {
        launchApprovalId: approval.id,
        migrationId: approval.migration_id,
        eventAction: eventAction(status),
        fromStatus: approval.status,
        toStatus: status,
        actor: effectiveInput.actor,
        detailsJson: effectiveInput.detailsJson ?? { reason: effectiveInput.reason ?? null, replacementLaunchApprovalId: effectiveInput.replacementLaunchApprovalId ?? null },
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
      return { launchApproval: updated, eventId: event.id, reusedExisting: event.reusedExisting };
    });
  }

  private assertDecisionAllowed(
    status: SingleSiteLaunchApprovalStatus,
    approval: SingleSiteLaunchApprovalRow,
    input: LaunchApprovalDecisionInput,
    items: readonly SingleSiteLaunchApprovalItemRow[],
    refs: readonly SingleSiteLaunchApprovalRefRow[],
  ): void {
    if (!hasRequiredLaunchApprovalRefs(refs)) throw new SingleSiteTransitionError("launch approval requires all canonical refs before decision");
    if (status === "approved" || status === "approved_with_limitations") {
      const aafShape = normalizeAafShape(input);
      const decisionRef = optionalText(input.aafLaunchApprovalDecisionId) ?? approval.aaf_launch_approval_decision_id;
      if (!decisionRef) throw new SingleSiteTransitionError("launch approval requires exact-scope AAF launch approval decision ref before approval");
      const validation = assertLaunchApprovalDecisionRefShape(decisionRef, input.launchApprovalValidation, status === "approved" ? ["granted"] : ["granted_with_limitations"]);
      if (validation && validation.subjectId !== approval.id) throw new SingleSiteTransitionError("validated launch approval AAF decision has wrong subject id");
      const missingReadiness = [
        approval.domain_readiness_ref ? null : "domain_readiness_placeholder",
        approval.billing_hosting_entitlement_ref ? null : "billing_hosting_entitlement_placeholder",
        approval.rollback_readiness_ref ? null : "rollback_readiness_placeholder",
        approval.publish_target_ref ? null : "publish_target_placeholder",
      ].filter((value): value is string => Boolean(value));
      if (missingReadiness.length > 0) throw new SingleSiteTransitionError("cannot approve launch approval with missing readiness placeholders", missingReadiness);
      const unresolvedP0 = items.filter((item) => item.status === "open" && item.severity === "p0_blocker" && !item.accepted_limitation);
      if (unresolvedP0.length > 0) throw new SingleSiteTransitionError("cannot approve launch approval with unresolved p0 blockers");
      const explicitBlockers = jsonArray(input.blockerRefsJson ?? approval.blocker_refs_json);
      const unresolvedWithoutLimitation = explicitBlockers.filter((value) => {
        const record = jsonObject(value);
        return record.status !== "resolved" && !record.limitationRef && !record.exceptionRef && !record.acceptedLimitation;
      });
      if (unresolvedWithoutLimitation.length > 0) {
        throw new SingleSiteTransitionError("cannot approve launch approval with unresolved blocker refs");
      }
      if (aafShape.scope !== LAUNCH_APPROVAL_AAF_SCOPE) throw new SingleSiteTransitionError("invalid AAF launch approval scope");
    }
    if (status === "approved_with_limitations" && jsonArray(input.limitationsJson ?? approval.limitations_json).length === 0) {
      throw new SingleSiteTransitionError("approved_with_limitations requires limitations");
    }
  }

  private async requiredNonTerminalMigration(tx: SingleSiteStateWriterTx, migrationId: string): Promise<SingleSiteMigrationRow> {
    const migration = await this.repository.getMigrationById(tx, requiredText("migrationId", migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (isSingleSiteTerminalState(migration.current_state)) throw new SingleSiteTransitionError(`terminal migration state ${migration.current_state} cannot change launch approval`);
    return migration;
  }

  private async requiredApprovedContentApproval(tx: SingleSitePgClient, migrationId: string, contentApprovalId: string | undefined): Promise<SingleSiteContentApprovalRow> {
    const approval = contentApprovalId
      ? await this.getContentApprovalById(tx, requiredText("contentApprovalId", contentApprovalId))
      : await this.getLatestContentApprovalForMigration(tx, migrationId);
    if (!approval || approval.migration_id !== migrationId) throw new SingleSiteTransitionError("approved content approval ref is required");
    if (!["approved", "approved_with_limitations"].includes(approval.status) || !approval.client_or_launch_approval_ready) {
      throw new SingleSiteTransitionError("launch approval requires approved or approved_with_limitations content approval");
    }
    if (!optionalText(approval.aaf_content_approval_decision_id)) {
      throw new SingleSiteTransitionError("launch approval requires exact-scope AAF content approval decision ref");
    }
    if (!optionalText(approval.improved_candidate_site_version_ref) || !optionalText(approval.improved_runtime_artifact_ref)) {
      throw new SingleSiteTransitionError("launch approval requires improved candidate refs");
    }
    if (approval.status === "approved_with_limitations" && jsonArray(approval.limitations_json).length === 0) {
      throw new SingleSiteTransitionError("approved_with_limitations content approval requires limitations");
    }
    return approval;
  }

  private async requiredApprovedClientApproval(tx: SingleSitePgClient, migrationId: string, clientApprovalId: string | undefined): Promise<SingleSiteClientApprovalRow> {
    const approval = clientApprovalId
      ? await this.getClientApprovalById(tx, requiredText("clientApprovalId", clientApprovalId))
      : await this.getLatestClientApprovalForMigration(tx, migrationId);
    if (!approval || approval.migration_id !== migrationId) throw new SingleSiteTransitionError("approved client approval ref is required");
    if (!["approved", "approved_with_limitations"].includes(approval.status) || !approval.launch_approval_ready) {
      throw new SingleSiteTransitionError("launch approval requires approved or approved_with_limitations client approval when policy requires client approval");
    }
    if (!optionalText(approval.aaf_client_approval_decision_id)) {
      throw new SingleSiteTransitionError("launch approval requires exact-scope AAF client approval decision ref when client approval is required");
    }
    if (approval.status === "approved_with_limitations" && jsonArray(approval.limitations_json).length === 0) {
      throw new SingleSiteTransitionError("approved_with_limitations client approval requires limitations");
    }
    return approval;
  }

  private async requiredOpenLaunchApproval(tx: SingleSiteStateWriterTx, launchApprovalId: string): Promise<SingleSiteLaunchApprovalRow> {
    const approval = await this.getLaunchApprovalById(tx, requiredText("launchApprovalId", launchApprovalId));
    if (!approval) throw new SingleSiteTransitionError(`launch approval ${launchApprovalId} was not found`);
    if (terminalStatus(approval.status)) throw new SingleSiteTransitionError(`launch approval ${launchApprovalId} is terminal`);
    return approval;
  }

  private async findLaunchApprovalBySemanticRefs(tx: SingleSitePgClient, migrationId: string, refs: LaunchApprovalRequiredRefs): Promise<SingleSiteLaunchApprovalRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_launch_approvals
      where migration_id = $1::uuid
        and content_approval_id = $2::uuid
        and improved_version_review_id = $3::uuid
        and improved_candidate_site_version_ref = $4
        and improved_runtime_artifact_ref = $5
      order by created_at asc
      limit 1
      `,
      [migrationId, refs.contentApprovalId, refs.improvedVersionReviewId, refs.improvedCandidateSiteVersionRef, refs.improvedRuntimeArtifactRef],
    );
    return (result.rows[0] as SingleSiteLaunchApprovalRow | undefined) ?? null;
  }

  private async getLaunchApprovalById(tx: SingleSitePgClient, launchApprovalId: string): Promise<SingleSiteLaunchApprovalRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_launch_approvals where id = $1::uuid limit 1", [launchApprovalId]);
    return (result.rows[0] as SingleSiteLaunchApprovalRow | undefined) ?? null;
  }

  private async getLatestLaunchApprovalForMigration(tx: SingleSitePgClient, migrationId: string): Promise<SingleSiteLaunchApprovalRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_launch_approvals
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [migrationId],
    );
    return (result.rows[0] as SingleSiteLaunchApprovalRow | undefined) ?? null;
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

  private async getClientApprovalById(tx: SingleSitePgClient, clientApprovalId: string): Promise<SingleSiteClientApprovalRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_client_approvals where id = $1::uuid limit 1", [clientApprovalId]);
    return (result.rows[0] as SingleSiteClientApprovalRow | undefined) ?? null;
  }

  private async getLatestClientApprovalForMigration(tx: SingleSitePgClient, migrationId: string): Promise<SingleSiteClientApprovalRow | null> {
    const result = await tx.query(
      `
      select *
      from public.gnr8_single_site_client_approvals
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [migrationId],
    );
    return (result.rows[0] as SingleSiteClientApprovalRow | undefined) ?? null;
  }

  private async insertLaunchApprovalRef(tx: SingleSitePgClient, input: RecordLaunchApprovalRefInput): Promise<{ row: SingleSiteLaunchApprovalRefRow; reusedExisting: boolean }> {
    return insertReturning<SingleSiteLaunchApprovalRefRow>(
      tx,
      "gnr8_single_site_launch_approval_refs",
      {
        launch_approval_id: requiredText("launchApprovalId", input.launchApprovalId),
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
        "launch_approval_id",
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

  private async upsertLaunchApprovalItem(
    tx: SingleSitePgClient,
    approval: SingleSiteLaunchApprovalRow,
    input: AddLaunchApprovalFindingInput,
  ): Promise<SingleSiteLaunchApprovalItemRow> {
    if (!SINGLE_SITE_LAUNCH_APPROVAL_CATEGORIES.includes(input.category)) throw new SingleSiteTransitionError(`unsupported launch approval category ${input.category}`);
    if (!SINGLE_SITE_LAUNCH_APPROVAL_SEVERITIES.includes(input.severity)) throw new SingleSiteTransitionError(`unsupported launch approval severity ${input.severity}`);
    const attempted = {
      launch_approval_id: approval.id,
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
    const existing = await tx.query("select * from public.gnr8_single_site_launch_approval_items where idempotency_key = $1 limit 1", [attempted.idempotency_key]);
    if (existing.rows[0]) {
      assertSemanticMatch("gnr8_single_site_launch_approval_items", attempted.idempotency_key, attempted, existing.rows[0], [
        "launch_approval_id",
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
      return existing.rows[0] as SingleSiteLaunchApprovalItemRow;
    }
    const result = await tx.query(
      `
      insert into public.gnr8_single_site_launch_approval_items (
        launch_approval_id, migration_id, item_key, category, severity, status, blocks_approval, accepted_limitation,
        required_recommendation_applied, recommendation_id, finding_summary, ref_ids_json, limitation_json, evidence_json,
        details_json, reviewer_actor_type, reviewer_actor_id, reviewer_actor_display_label, correlation_id, idempotency_key,
        privacy_label, retention_class, semantic_watermark, metadata_json
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::uuid, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb)
      on conflict (launch_approval_id, item_key) do update set
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
        attempted.launch_approval_id,
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
    return result.rows[0] as SingleSiteLaunchApprovalItemRow;
  }

  private async listLaunchApprovalItems(tx: SingleSitePgClient, launchApprovalId: string): Promise<SingleSiteLaunchApprovalItemRow[]> {
    const result = await tx.query("select * from public.gnr8_single_site_launch_approval_items where launch_approval_id = $1::uuid order by item_key asc", [launchApprovalId]);
    return result.rows as SingleSiteLaunchApprovalItemRow[];
  }

  private async listLaunchApprovalRefs(tx: SingleSitePgClient, launchApprovalId: string): Promise<SingleSiteLaunchApprovalRefRow[]> {
    const result = await tx.query("select * from public.gnr8_single_site_launch_approval_refs where launch_approval_id = $1::uuid order by created_at asc, ref_role asc", [launchApprovalId]);
    return result.rows as SingleSiteLaunchApprovalRefRow[];
  }

  private async updateLaunchApprovalStatus(
    tx: SingleSitePgClient,
    approval: SingleSiteLaunchApprovalRow,
    input: LaunchApprovalDecisionInput,
    status: SingleSiteLaunchApprovalStatus,
    patch: { reviewStartedAt?: string | null; decidedAt?: string | null; supersededByLaunchApprovalId?: string | null } = {},
  ): Promise<SingleSiteLaunchApprovalRow> {
    const aaf = normalizeAafShape(input);
    const result = await tx.query(
      `
      update public.gnr8_single_site_launch_approvals
      set
        status = $2,
        decision = $3,
        readiness_work_ready = $4,
        approved_with_limitations = $5,
        launch_revision_required = $6,
        launch_approval_granted = $7,
        aaf_launch_approval_decision_id = coalesce($8, aaf_launch_approval_decision_id),
        aaf_launch_approval_scope = coalesce($9, aaf_launch_approval_scope),
        aaf_launch_approval_action = coalesce($10, aaf_launch_approval_action),
        aaf_launch_approval_subject_type = coalesce($11, aaf_launch_approval_subject_type),
        limitations_json = coalesce($12::jsonb, limitations_json),
        blocker_refs_json = coalesce($13::jsonb, blocker_refs_json),
        operator_notes_json = coalesce($14::jsonb, operator_notes_json),
        findings_summary_json = coalesce($15::jsonb, findings_summary_json),
        decision_summary_json = coalesce($16::jsonb, decision_summary_json),
        reviewer_actor_type = coalesce($17, reviewer_actor_type),
        reviewer_actor_id = coalesce($18, reviewer_actor_id),
        reviewer_actor_role = coalesce($19, reviewer_actor_role),
        reviewer_actor_display_label = coalesce($20, reviewer_actor_display_label),
        review_started_at = coalesce($21::timestamptz, review_started_at),
        decided_at = coalesce($22::timestamptz, decided_at),
        superseded_by_launch_approval_id = coalesce($23::uuid, superseded_by_launch_approval_id),
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
        status === "blocked" || status === "rejected" || status === "superseded",
        status === "approved" || status === "approved_with_limitations",
        optionalText(input.aafLaunchApprovalDecisionId),
        aaf.scope,
        aaf.action,
        aaf.subjectType,
        input.limitationsJson === undefined ? null : toPg(input.limitationsJson),
        input.blockerRefsJson === undefined ? null : toPg(input.blockerRefsJson),
        input.operatorNotesJson === undefined ? null : toPg(input.operatorNotesJson),
        input.findingsSummaryJson === undefined ? null : toPg(input.findingsSummaryJson),
        input.decisionSummaryJson === undefined ? null : toPg(input.decisionSummaryJson),
        input.actor.actorType,
        input.actor.actorId,
        input.actor.actorRole,
        input.actor.actorDisplayLabel ?? null,
        patch.reviewStartedAt ?? null,
        patch.decidedAt ?? null,
        patch.supersededByLaunchApprovalId ?? null,
      ],
    );
    const row = result.rows[0] as SingleSiteLaunchApprovalRow | undefined;
    if (!row) throw new SingleSiteTransitionError("launch approval status update did not return a row");
    return row;
  }

  private async patchAafRef(
    launchApprovalId: string,
    patch: { requestId?: string | null; decisionId?: string | null; input: RecordLaunchApprovalRefInput & { aafScope?: string | null; aafAction?: string | null; aafSubjectType?: string | null } },
  ): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      const approval = await this.requiredOpenLaunchApproval(tx, launchApprovalId);
      const aaf = normalizeAafShape(patch.input);
      await tx.query(
        `
        update public.gnr8_single_site_launch_approvals
        set
          aaf_launch_approval_request_id = coalesce($2, aaf_launch_approval_request_id),
          aaf_launch_approval_decision_id = coalesce($3, aaf_launch_approval_decision_id),
          aaf_launch_approval_scope = $4,
          aaf_launch_approval_action = $5,
          aaf_launch_approval_subject_type = $6,
          updated_at = now()
        where id = $1::uuid
        `,
        [approval.id, optionalText(patch.requestId), optionalText(patch.decisionId), aaf.scope, aaf.action, aaf.subjectType],
      );
    });
  }

  private async insertEventIfNeeded(tx: SingleSitePgClient, input: Omit<InsertLaunchApprovalEventInput, "eventIndex">): Promise<SingleSiteLaunchApprovalEventRow & { reusedExisting: boolean }> {
    const existing = await this.getLaunchApprovalEventByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      assertEventSemanticMatch(existing, input);
      return { ...existing, reusedExisting: true };
    }
    const eventIndex = await this.nextLaunchApprovalEventIndex(tx, input.launchApprovalId);
    const inserted = await insertReturning<SingleSiteLaunchApprovalEventRow>(
      tx,
      "gnr8_single_site_launch_approval_events",
      {
        launch_approval_id: input.launchApprovalId,
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
        "launch_approval_id",
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

  private async getLaunchApprovalEventByIdempotencyKey(tx: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteLaunchApprovalEventRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_launch_approval_events where idempotency_key = $1 limit 1", [idempotencyKey]);
    return (result.rows[0] as SingleSiteLaunchApprovalEventRow | undefined) ?? null;
  }

  private async nextLaunchApprovalEventIndex(tx: SingleSitePgClient, launchApprovalId: string): Promise<number> {
    const result = await tx.query("select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_launch_approval_events where launch_approval_id = $1::uuid", [launchApprovalId]);
    return Number(result.rows[0]?.event_index ?? 1);
  }

  private async insertSupersession(tx: SingleSitePgClient, approval: SingleSiteLaunchApprovalRow, input: LaunchApprovalDecisionInput): Promise<void> {
    await insertReturning(
      tx,
      "gnr8_single_site_launch_approval_supersessions",
      {
        migration_id: approval.migration_id,
        superseded_launch_approval_id: approval.id,
        replacement_launch_approval_id: optionalText(input.replacementLaunchApprovalId),
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
        "superseded_launch_approval_id",
        "replacement_launch_approval_id",
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
    approval: SingleSiteLaunchApprovalRow,
    input: LaunchApprovalDecisionInput,
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
      stage: "launch_publish_recovery",
      status,
      summaryJson: {
        latestLaunchApprovalId: approval.id,
        launchApprovalStatus: approval.status,
        readinessWorkReady: approval.readiness_work_ready,
        launchApprovalGranted: approval.launch_approval_granted,
        publishActivationApprovalGranted: false,
        publishReadinessNotGranted: true,
      },
      limitationsJson: jsonArray(approval.limitations_json),
      blockersJson: jsonArray(approval.blocker_refs_json),
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:stage:launch_approval:${approval.status}`,
    });
  }
}
