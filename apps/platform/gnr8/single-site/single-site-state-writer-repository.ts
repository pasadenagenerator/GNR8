import "server-only";

import { getSuperadminPool } from "../../src/superadmin/db";
import {
  SINGLE_SITE_ACTOR_TYPES,
  SINGLE_SITE_BLOCKER_STATUSES,
  SINGLE_SITE_BLOCKER_TYPES,
  SINGLE_SITE_CLONE_FIDELITY_CATEGORIES,
  SINGLE_SITE_CLONE_FIDELITY_SEVERITIES,
  SINGLE_SITE_CLONE_REVIEW_DECISIONS,
  SINGLE_SITE_CLONE_REVIEW_EVENT_ACTIONS,
  SINGLE_SITE_CLONE_REVIEW_REF_ROLES,
  SINGLE_SITE_CLONE_REVIEW_STATUSES,
  SINGLE_SITE_IMPROVEMENT_CATEGORIES,
  SINGLE_SITE_IMPROVEMENT_EFFORT_LEVELS,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_EVENT_ACTIONS,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_TYPES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_MODES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_REF_ROLES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES,
  SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS,
  SINGLE_SITE_IMPROVEMENT_PROPOSAL_EVENT_ACTIONS,
  SINGLE_SITE_IMPROVEMENT_PROPOSAL_FINDING_STATUSES,
  SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES,
  SINGLE_SITE_IMPROVEMENT_PROPOSAL_RECOMMENDATION_STATUSES,
  SINGLE_SITE_IMPROVEMENT_PROPOSAL_REF_ROLES,
  SINGLE_SITE_IMPROVEMENT_RISK_LEVELS,
  SINGLE_SITE_CLOSEOUT_OUTCOMES,
  SINGLE_SITE_CLOSEOUT_STATUSES,
  SINGLE_SITE_EVIDENCE_ITEM_CATEGORIES,
  SINGLE_SITE_EVIDENCE_ITEM_STATUSES,
  SINGLE_SITE_MIGRATION_REF_ROLES,
  SINGLE_SITE_MIGRATION_STATES,
  SINGLE_SITE_PRIVACY_LABELS,
  SINGLE_SITE_RETENTION_CLASSES,
  SINGLE_SITE_REVIEW_EVENT_ACTIONS,
  SINGLE_SITE_SEVERITY_LEVELS,
  SINGLE_SITE_SOURCE_EVIDENCE_COMPLETENESS_STATUSES,
  SINGLE_SITE_SOURCE_EVIDENCE_REF_ROLES,
  SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_DECISIONS,
  SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES,
  SINGLE_SITE_STAGE_SUMMARY_STATUSES,
  SINGLE_SITE_STATE_STAGE,
  type SingleSiteActorType,
  type SingleSiteBlockerStatus,
  type SingleSiteBlockerType,
  type SingleSiteCloneFidelityCategory,
  type SingleSiteCloneFidelitySeverity,
  type SingleSiteCloneReviewDecision,
  type SingleSiteCloneReviewEventAction,
  type SingleSiteCloneReviewRefRole,
  type SingleSiteCloneReviewStatus,
  type SingleSiteCloseoutOutcome,
  type SingleSiteCloseoutStatus,
  type SingleSiteEvidenceItemCategory,
  type SingleSiteEvidenceItemStatus,
  type SingleSiteImprovementCategory,
  type SingleSiteImprovementEffortLevel,
  type SingleSiteImprovementExecutionEventAction,
  type SingleSiteImprovementExecutionItemType,
  type SingleSiteImprovementExecutionMode,
  type SingleSiteImprovementExecutionRefRole,
  type SingleSiteImprovementExecutionStatus,
  type SingleSiteImprovementImpactLevel,
  type SingleSiteImprovementProposalEventAction,
  type SingleSiteImprovementProposalFindingStatus,
  type SingleSiteImprovementProposalPlanStatus,
  type SingleSiteImprovementProposalRecommendationStatus,
  type SingleSiteImprovementProposalRefRole,
  type SingleSiteImprovementRiskLevel,
  SingleSiteIdempotencyConflictError,
  type SingleSiteJsonObject,
  type SingleSiteMigrationRefRole,
  type SingleSiteMigrationStage,
  type SingleSiteMigrationState,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
  type SingleSiteReviewEventAction,
  type SingleSiteSeverityLevel,
  type SingleSiteSourceEvidenceCompletenessStatus,
  type SingleSiteSourceEvidenceRefRole,
  type SingleSiteSourceEvidenceReviewDecision,
  type SingleSiteSourceEvidenceReviewStatus,
  type SingleSiteStageSummaryStatus,
  SingleSiteStateValidationError,
  SingleSiteStateWriterError,
} from "./single-site-state-contracts";

export type SingleSiteQueryResult = { rows: Record<string, unknown>[]; rowCount: number | null };

export type SingleSitePgClient = {
  query(sql: string, values?: readonly unknown[]): Promise<SingleSiteQueryResult>;
};

export type SingleSiteStateWriterTx = SingleSitePgClient & {
  release?: () => void;
};

export type SingleSiteStateWriterPool = {
  connect(): Promise<SingleSiteStateWriterTx>;
};

export type SingleSiteActorInput = {
  actorType: SingleSiteActorType;
  actorId: string;
  actorRole?: string | null;
  actorDisplayLabel?: string | null;
};

export type SingleSiteWriteEnvelope = {
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
};

export type SingleSiteMigrationRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  site_id: string | null;
  ownership_site_id: string | null;
  runtime_site_id: string | null;
  site_version_id: string | null;
  runtime_site_version_id: string | null;
  source_url: string;
  canonical_source_url: string | null;
  intended_launch_domain: string | null;
  current_state: SingleSiteMigrationState;
  current_stage: SingleSiteMigrationStage;
  state_version: number;
  operator_owner_actor_id: string | null;
  current_blocker_count: number;
  latest_source_evidence_review_id: string | null;
  latest_state_event_id: string | null;
  latest_aaf_evidence_package_id: string | null;
  latest_aaf_audit_event_id: string | null;
  source_capture_refs_json: unknown;
  runtime_refs_json: unknown;
  proposal_refs_json: unknown;
  aaf_approval_refs_json: unknown;
  aaf_evidence_refs_json: unknown;
  aaf_audit_refs_json: unknown;
  ddom_snapshot_refs_json: unknown;
  ptt_publish_target_refs_json: unknown;
  billing_subscription_refs_json: unknown;
  hosting_entitlement_refs_json: unknown;
  rollback_refs_json: unknown;
  closeout_refs_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  source_watermark: string | null;
  payload_hash: string | null;
  validation_site_number: number | null;
  created_by_actor_type: SingleSiteActorType;
  created_by_actor_id: string;
  created_by_actor_display_label: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  metadata_json: unknown;
  terminal_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SingleSiteStateEventRow = {
  id: string;
  migration_id: string;
  event_index: number;
  from_state: SingleSiteMigrationState | null;
  to_state: SingleSiteMigrationState;
  from_stage: SingleSiteMigrationStage | null;
  to_stage: SingleSiteMigrationStage;
  transition_key: string;
  transition_reason: string | null;
  required_refs_json: unknown;
  missing_requirements_json: unknown;
  before_ref_json: unknown;
  after_ref_json: unknown;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  aaf_audit_event_id: string | null;
  aaf_evidence_package_id: string | null;
  aaf_approval_request_id: string | null;
  aaf_approval_decision_id: string | null;
  source_watermark: string | null;
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

export type SingleSiteMigrationRefRow = {
  id: string;
  migration_id: string;
  state_event_id: string | null;
  ref_role: SingleSiteMigrationRefRole;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  payload_hash: string | null;
  captured_at: string | null;
  fresh_until: string | null;
  superseded_by_ref_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  correlation_id: string;
  idempotency_key: string;
  metadata_json: unknown;
  created_at: string;
};

export type SingleSiteSourceEvidenceReviewRow = {
  id: string;
  migration_id: string;
  tenant_id: string;
  client_id: string;
  site_id: string | null;
  ownership_site_id: string | null;
  runtime_site_id: string | null;
  site_version_id: string | null;
  source_url: string;
  canonical_source_url: string | null;
  capture_run_id: string | null;
  render_job_id: string | null;
  source_evidence_package_key: string;
  source_watermark: string;
  source_hash: string | null;
  capture_started_at: string | null;
  capture_completed_at: string | null;
  evidence_captured_at: string;
  fresh_until: string | null;
  completeness_status: SingleSiteSourceEvidenceCompletenessStatus;
  review_status: SingleSiteSourceEvidenceReviewStatus;
  review_decision: SingleSiteSourceEvidenceReviewDecision | null;
  accepted_degraded_capture: boolean;
  retry_required: boolean;
  clone_generation_allowed: boolean;
  review_limitations_json: unknown;
  missing_evidence_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  diagnostics_json: unknown;
  reviewer_actor_type: SingleSiteActorType | null;
  reviewer_actor_id: string | null;
  reviewer_actor_role: string | null;
  reviewer_actor_display_label: string | null;
  review_started_at: string | null;
  reviewed_at: string | null;
  supersedes_review_id: string | null;
  superseded_by_review_id: string | null;
  aaf_evidence_package_id: string | null;
  aaf_approval_request_id: string | null;
  aaf_approval_decision_id: string | null;
  aaf_audit_event_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteEvidenceItemRow = {
  id: string;
  review_id: string;
  migration_id: string;
  evidence_category: SingleSiteEvidenceItemCategory;
  status: SingleSiteEvidenceItemStatus;
  required_for_clone: boolean;
  blocks_clone_generation: boolean;
  accepted_limitation: boolean;
  finding_summary: string | null;
  ref_ids_json: unknown;
  limitation_json: unknown;
  warnings_json: unknown;
  blocker_json: unknown;
  reviewer_actor_type: SingleSiteActorType | null;
  reviewer_actor_id: string | null;
  reviewer_actor_display_label: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteReviewEventRow = {
  id: string;
  review_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteReviewEventAction;
  from_status: SingleSiteSourceEvidenceReviewStatus | null;
  to_status: SingleSiteSourceEvidenceReviewStatus | null;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  aaf_audit_event_id: string | null;
  aaf_approval_decision_id: string | null;
  source_watermark: string | null;
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

export type SingleSiteCloneReviewRow = {
  id: string;
  migration_id: string;
  client_id: string;
  site_id: string | null;
  clone_site_version_ref: string;
  runtime_artifact_ref: string;
  source_evidence_review_id: string;
  clone_generation_ref: string | null;
  clone_generation_event_id: string | null;
  review_status: SingleSiteCloneReviewStatus;
  review_decision: SingleSiteCloneReviewDecision | null;
  proposal_planning_allowed: boolean;
  retry_required: boolean;
  accepted_with_limitations: boolean;
  fidelity_summary_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  diagnostics_json: unknown;
  reviewer_actor_type: SingleSiteActorType | null;
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
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteCloneReviewRefRow = {
  id: string;
  review_id: string;
  migration_id: string;
  ref_role: SingleSiteCloneReviewRefRole;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  content_hash: string | null;
  media_type: string | null;
  captured_at: string | null;
  fresh_until: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  correlation_id: string;
  idempotency_key: string;
  metadata_json: unknown;
  created_at: string;
};

export type SingleSiteCloneReviewItemStatus = "open" | "resolved" | "accepted_limitation" | "superseded";

export type SingleSiteCloneReviewItemRow = {
  id: string;
  review_id: string;
  migration_id: string;
  item_key: string;
  fidelity_category: SingleSiteCloneFidelityCategory;
  severity: SingleSiteCloneFidelitySeverity;
  status: SingleSiteCloneReviewItemStatus;
  blocks_acceptance: boolean;
  accepted_limitation: boolean;
  finding_summary: string;
  ref_ids_json: unknown;
  limitation_json: unknown;
  details_json: unknown;
  reviewer_actor_type: SingleSiteActorType | null;
  reviewer_actor_id: string | null;
  reviewer_actor_display_label: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteCloneReviewEventRow = {
  id: string;
  review_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteCloneReviewEventAction;
  from_status: SingleSiteCloneReviewStatus | null;
  to_status: SingleSiteCloneReviewStatus | null;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  source_watermark: string | null;
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

export type SingleSiteImprovementProposalPlanRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  site_id: string;
  migration_id: string;
  clone_review_id: string;
  source_evidence_review_id: string;
  clone_site_version_ref: string;
  runtime_artifact_ref: string;
  plan_status: SingleSiteImprovementProposalPlanStatus;
  plan_version: number;
  proposal_scope_json: unknown;
  title: string | null;
  summary: string | null;
  limitations_json: unknown;
  warnings_json: unknown;
  operator_notes_json: unknown;
  decision_summary_json: unknown;
  approval_refs_json: unknown;
  implementation_authorization_refs_json: unknown;
  implementation_authorization_attached: boolean;
  supersedes_plan_id: string | null;
  superseded_by_plan_id: string | null;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  payload_hash: string | null;
  metadata_json: unknown;
  reviewed_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovementProposalRefRow = {
  id: string;
  plan_id: string;
  migration_id: string;
  ref_role: SingleSiteImprovementProposalRefRole;
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

export type SingleSiteImprovementProposalRecommendationRow = {
  id: string;
  plan_id: string;
  migration_id: string;
  recommendation_key: string;
  title: string;
  target_scope: string;
  target_refs_json: unknown;
  category: SingleSiteImprovementCategory;
  risk: SingleSiteImprovementRiskLevel;
  impact: SingleSiteImprovementImpactLevel;
  effort: SingleSiteImprovementEffortLevel;
  confidence: "low" | "medium" | "high";
  priority: "p0" | "p1" | "p2" | "p3";
  rationale: string;
  expected_outcome: string | null;
  implementation_notes: string | null;
  exclusions_json: unknown;
  limitations_json: unknown;
  linked_finding_ids_json: unknown;
  source_ref_ids_json: unknown;
  advisory_ref_ids_json: unknown;
  recommendation_status: SingleSiteImprovementProposalRecommendationStatus;
  implementation_authorization_status: string;
  blocks_proposal_approval: boolean;
  limitation_accepted: boolean;
  decision_json: unknown;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovementProposalFindingRow = {
  id: string;
  plan_id: string;
  migration_id: string;
  finding_key: string;
  category: SingleSiteImprovementCategory;
  risk: SingleSiteImprovementRiskLevel;
  impact: SingleSiteImprovementImpactLevel;
  summary: string;
  evidence_confidence: "low" | "medium" | "high";
  finding_status: SingleSiteImprovementProposalFindingStatus;
  blocks_proposal_approval: boolean;
  accepted_limitation: boolean;
  source_ref_ids_json: unknown;
  clone_fidelity_ref_ids_json: unknown;
  recommendation_ids_json: unknown;
  limitation_json: unknown;
  decision_json: unknown;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovementProposalEventRow = {
  id: string;
  plan_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteImprovementProposalEventAction;
  from_status: SingleSiteImprovementProposalPlanStatus | null;
  to_status: SingleSiteImprovementProposalPlanStatus | null;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  approval_refs_json: unknown;
  implementation_authorization_refs_json: unknown;
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

export type SingleSiteImprovementProposalSupersessionRow = {
  id: string;
  migration_id: string;
  superseded_plan_id: string;
  replacement_plan_id: string | null;
  supersession_reason: string;
  source_ref_json: unknown;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  metadata_json: unknown;
  created_at: string;
};

export type SingleSiteImprovementExecutionAttemptRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  site_id: string;
  migration_id: string;
  proposal_plan_id: string;
  proposal_plan_version: number;
  proposal_plan_semantic_watermark: string;
  proposal_approval_request_id: string | null;
  proposal_approval_decision_id: string | null;
  proposal_evidence_package_id: string | null;
  implementation_authorization_request_id: string;
  implementation_authorization_decision_id: string;
  implementation_authorization_evidence_package_id: string | null;
  aaf_validation_result_ref: string | null;
  aaf_validation_evidence_ref: string | null;
  clone_review_id: string;
  clone_site_version_ref: string;
  clone_runtime_artifact_ref: string;
  source_evidence_review_id: string;
  selected_recommendation_refs_json: unknown;
  limitations_json: unknown;
  execution_mode: SingleSiteImprovementExecutionMode;
  executor_id: string | null;
  executor_name: string | null;
  executor_version: string | null;
  status: SingleSiteImprovementExecutionStatus;
  readiness_json: unknown;
  validation_summary_json: unknown;
  semantic_input_watermark: string;
  semantic_output_watermark: string | null;
  improved_candidate_site_version_ref: string | null;
  improved_runtime_artifact_ref: string | null;
  output_refs_json: unknown;
  failure_json: unknown;
  audit_refs_json: unknown;
  supersedes_attempt_id: string | null;
  superseded_by_attempt_id: string | null;
  non_approval_boundary_json: unknown;
  content_approval_granted: boolean;
  client_approval_granted: boolean;
  launch_approval_granted: boolean;
  publish_activation_approval_granted: boolean;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  payload_hash: string | null;
  metadata_json: unknown;
  started_at: string | null;
  completed_at: string | null;
  terminal_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovementExecutionRefRow = {
  id: string;
  attempt_id: string;
  migration_id: string;
  ref_role: SingleSiteImprovementExecutionRefRole;
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

export type SingleSiteImprovementExecutionItemRow = {
  id: string;
  attempt_id: string;
  migration_id: string;
  item_type: SingleSiteImprovementExecutionItemType;
  item_key: string;
  recommendation_id: string | null;
  status: "open" | "resolved" | "accepted_limitation" | "blocked" | "failed" | "superseded";
  details_json: unknown;
  refs_json: unknown;
  limitation_json: unknown;
  warnings_json: unknown;
  error_json: unknown;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: SingleSitePrivacyLabel;
  retention_class: SingleSiteRetentionClass;
  semantic_watermark: string | null;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type SingleSiteImprovementExecutionEventRow = {
  id: string;
  attempt_id: string;
  migration_id: string;
  event_index: number;
  event_action: SingleSiteImprovementExecutionEventAction;
  from_status: SingleSiteImprovementExecutionStatus | null;
  to_status: SingleSiteImprovementExecutionStatus | null;
  actor_type: SingleSiteActorType;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  validation_summary_json: unknown;
  output_refs_json: unknown;
  failure_json: unknown;
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

type InsertableRow = Record<string, unknown>;

export type CreateSingleSiteMigrationInput = SingleSiteWriteEnvelope & {
  tenantId: string;
  clientId: string;
  siteId?: string | null;
  ownershipSiteId?: string | null;
  runtimeSiteId?: string | null;
  siteVersionId?: string | null;
  runtimeSiteVersionId?: string | null;
  sourceUrl: string;
  canonicalSourceUrl?: string | null;
  intendedLaunchDomain?: string | null;
  currentState?: SingleSiteMigrationState | null;
  operatorOwnerActorId?: string | null;
  sourceCaptureRefsJson?: SingleSiteJsonObject;
  runtimeRefsJson?: SingleSiteJsonObject;
  proposalRefsJson?: SingleSiteJsonObject;
  aafApprovalRefsJson?: SingleSiteJsonObject;
  aafEvidenceRefsJson?: SingleSiteJsonObject;
  aafAuditRefsJson?: SingleSiteJsonObject;
  ddomSnapshotRefsJson?: SingleSiteJsonObject;
  pttPublishTargetRefsJson?: SingleSiteJsonObject;
  billingSubscriptionRefsJson?: SingleSiteJsonObject;
  hostingEntitlementRefsJson?: SingleSiteJsonObject;
  rollbackRefsJson?: SingleSiteJsonObject;
  closeoutRefsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  validationSiteNumber?: number | null;
  actor: Pick<SingleSiteActorInput, "actorType" | "actorId" | "actorDisplayLabel">;
};

export type UpdateSingleSiteMigrationStateInput = {
  migrationId: string;
  toState: SingleSiteMigrationState;
  latestStateEventId: string;
  latestSourceEvidenceReviewId?: string | null;
  terminalAt?: string | null;
  refs?: Partial<Pick<
    SingleSiteMigrationRow,
    | "source_capture_refs_json"
    | "runtime_refs_json"
    | "proposal_refs_json"
    | "aaf_approval_refs_json"
    | "aaf_evidence_refs_json"
    | "aaf_audit_refs_json"
    | "ddom_snapshot_refs_json"
    | "ptt_publish_target_refs_json"
    | "billing_subscription_refs_json"
    | "hosting_entitlement_refs_json"
    | "rollback_refs_json"
    | "closeout_refs_json"
  >>;
};

export type InsertSingleSiteStateEventInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  eventIndex: number;
  fromState: SingleSiteMigrationState | null;
  toState: SingleSiteMigrationState;
  transitionKey: string;
  transitionReason?: string | null;
  requiredRefsJson?: SingleSiteJsonObject;
  missingRequirementsJson?: unknown[];
  beforeRefJson?: SingleSiteJsonObject;
  afterRefJson?: SingleSiteJsonObject;
  actor: SingleSiteActorInput;
  aafAuditEventId?: string | null;
  aafEvidencePackageId?: string | null;
  aafApprovalRequestId?: string | null;
  aafApprovalDecisionId?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  occurredAt?: string | null;
};

export type InsertSingleSiteMigrationRefInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  stateEventId?: string | null;
  refRole: SingleSiteMigrationRefRole;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
  supersededByRefId?: string | null;
};

export type UpsertSingleSiteStageSummaryInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  stage: SingleSiteMigrationStage;
  status: SingleSiteStageSummaryStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  latestStateEventId?: string | null;
  latestEvidenceRefId?: string | null;
  latestApprovalRefId?: string | null;
  summaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  blockerCount?: number | null;
};

export type UpsertSingleSiteBlockerInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  stateEventId?: string | null;
  blockerKey: string;
  blockerType: SingleSiteBlockerType;
  severity: SingleSiteSeverityLevel;
  status?: SingleSiteBlockerStatus | null;
  ownerRole?: string | null;
  openedAt?: string | null;
  resolvedAt?: string | null;
  resolutionStateEventId?: string | null;
  resolutionAafAuditEventId?: string | null;
  resolutionAafApprovalDecisionId?: string | null;
  sourceRefJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  opsInboxProjectionKey?: string | null;
};

export type InsertSingleSiteCloseoutInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  status?: SingleSiteCloseoutStatus | null;
  finalUrl?: string | null;
  outcome: SingleSiteCloseoutOutcome;
  validationSiteNumber?: number | null;
  metricsJson?: SingleSiteJsonObject;
  issueTaxonomyJson?: unknown[];
  evidenceSummaryJson?: SingleSiteJsonObject;
  exceptionsJson?: unknown[];
  lessonsJson?: SingleSiteJsonObject;
  closeoutRefsJson?: SingleSiteJsonObject;
  supersedesCloseoutId?: string | null;
  supersededByCloseoutId?: string | null;
  aafEvidencePackageId?: string | null;
  aafApprovalDecisionId?: string | null;
  aafAuditEventId?: string | null;
  actor: Pick<SingleSiteActorInput, "actorType" | "actorId" | "actorDisplayLabel">;
  closedAt?: string | null;
};

export type CreateSourceEvidenceReviewInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  tenantId: string;
  clientId: string;
  siteId?: string | null;
  ownershipSiteId?: string | null;
  runtimeSiteId?: string | null;
  siteVersionId?: string | null;
  sourceUrl: string;
  canonicalSourceUrl?: string | null;
  captureRunId?: string | null;
  renderJobId?: string | null;
  sourceEvidencePackageKey: string;
  sourceWatermark: string;
  sourceHash?: string | null;
  captureStartedAt?: string | null;
  captureCompletedAt?: string | null;
  evidenceCapturedAt: string;
  freshUntil?: string | null;
  completenessStatus: SingleSiteSourceEvidenceCompletenessStatus;
  reviewStatus?: SingleSiteSourceEvidenceReviewStatus | null;
  reviewLimitationsJson?: unknown[];
  missingEvidenceJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  supersedesReviewId?: string | null;
  aafEvidencePackageId?: string | null;
};

export type UpdateSourceEvidenceReviewStatusInput = SingleSiteWriteEnvelope & {
  reviewId: string;
  reviewStatus: SingleSiteSourceEvidenceReviewStatus;
  reviewDecision?: SingleSiteSourceEvidenceReviewDecision | null;
  acceptedDegradedCapture?: boolean | null;
  retryRequired?: boolean | null;
  cloneGenerationAllowed?: boolean | null;
  reviewLimitationsJson?: unknown[];
  missingEvidenceJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  actor?: SingleSiteActorInput | null;
  reviewStartedAt?: string | null;
  reviewedAt?: string | null;
  supersededByReviewId?: string | null;
  aafApprovalRequestId?: string | null;
  aafApprovalDecisionId?: string | null;
  aafAuditEventId?: string | null;
};

export type InsertSourceEvidenceReviewRefInput = SingleSiteWriteEnvelope & {
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

export type UpsertSourceEvidenceReviewItemInput = SingleSiteWriteEnvelope & {
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
  actor?: Pick<SingleSiteActorInput, "actorType" | "actorId" | "actorDisplayLabel"> | null;
};

export type InsertSourceEvidenceReviewEventInput = SingleSiteWriteEnvelope & {
  reviewId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteReviewEventAction;
  fromStatus?: SingleSiteSourceEvidenceReviewStatus | null;
  toStatus?: SingleSiteSourceEvidenceReviewStatus | null;
  actor: SingleSiteActorInput;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  aafAuditEventId?: string | null;
  aafApprovalDecisionId?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  occurredAt?: string | null;
};

export type CreateCloneReviewInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  clientId: string;
  siteId?: string | null;
  cloneSiteVersionRef: string;
  runtimeArtifactRef: string;
  sourceEvidenceReviewId: string;
  cloneGenerationRef?: string | null;
  cloneGenerationEventId?: string | null;
  reviewStatus?: SingleSiteCloneReviewStatus | null;
  fidelitySummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  supersedesReviewId?: string | null;
};

export type UpdateCloneReviewStatusInput = SingleSiteWriteEnvelope & {
  reviewId: string;
  reviewStatus: SingleSiteCloneReviewStatus;
  reviewDecision?: SingleSiteCloneReviewDecision | null;
  proposalPlanningAllowed?: boolean | null;
  retryRequired?: boolean | null;
  acceptedWithLimitations?: boolean | null;
  fidelitySummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  actor?: SingleSiteActorInput | null;
  reviewStartedAt?: string | null;
  reviewedAt?: string | null;
  supersededByReviewId?: string | null;
};

export type InsertCloneReviewRefInput = SingleSiteWriteEnvelope & {
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

export type UpsertCloneReviewItemInput = SingleSiteWriteEnvelope & {
  reviewId: string;
  migrationId: string;
  itemKey: string;
  fidelityCategory: SingleSiteCloneFidelityCategory;
  severity: SingleSiteCloneFidelitySeverity;
  status?: SingleSiteCloneReviewItemStatus | null;
  blocksAcceptance?: boolean | null;
  acceptedLimitation?: boolean | null;
  findingSummary: string;
  refIdsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  detailsJson?: SingleSiteJsonObject;
  actor?: Pick<SingleSiteActorInput, "actorType" | "actorId" | "actorDisplayLabel"> | null;
};

export type InsertCloneReviewEventInput = SingleSiteWriteEnvelope & {
  reviewId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteCloneReviewEventAction;
  fromStatus?: SingleSiteCloneReviewStatus | null;
  toStatus?: SingleSiteCloneReviewStatus | null;
  actor: SingleSiteActorInput;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  blockersJson?: unknown[];
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  occurredAt?: string | null;
};

export type CreateImprovementProposalPlanInput = SingleSiteWriteEnvelope & {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  cloneReviewId: string;
  sourceEvidenceReviewId: string;
  cloneSiteVersionRef: string;
  runtimeArtifactRef: string;
  planStatus?: SingleSiteImprovementProposalPlanStatus | null;
  planVersion?: number | null;
  proposalScopeJson?: SingleSiteJsonObject;
  title?: string | null;
  summary?: string | null;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  operatorNotesJson?: unknown[];
  decisionSummaryJson?: SingleSiteJsonObject;
  approvalRefsJson?: SingleSiteJsonObject;
  implementationAuthorizationRefsJson?: SingleSiteJsonObject;
  implementationAuthorizationAttached?: boolean | null;
  supersedesPlanId?: string | null;
  actor: SingleSiteActorInput;
  semanticWatermark?: string | null;
  payloadHash?: string | null;
};

export type UpdateImprovementProposalPlanStatusInput = SingleSiteWriteEnvelope & {
  planId: string;
  planStatus: SingleSiteImprovementProposalPlanStatus;
  summary?: string | null;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  decisionSummaryJson?: SingleSiteJsonObject;
  approvalRefsJson?: SingleSiteJsonObject;
  implementationAuthorizationRefsJson?: SingleSiteJsonObject;
  implementationAuthorizationAttached?: boolean | null;
  supersededByPlanId?: string | null;
  actor?: SingleSiteActorInput | null;
  reviewedAt?: string | null;
  decidedAt?: string | null;
};

export type InsertImprovementProposalRefInput = SingleSiteWriteEnvelope & {
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

export type UpsertImprovementProposalRecommendationInput = SingleSiteWriteEnvelope & {
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
  recommendationStatus?: SingleSiteImprovementProposalRecommendationStatus | null;
  implementationAuthorizationStatus?: string | null;
  blocksProposalApproval?: boolean | null;
  limitationAccepted?: boolean | null;
  decisionJson?: SingleSiteJsonObject;
  actor: SingleSiteActorInput;
  semanticWatermark?: string | null;
};

export type UpsertImprovementProposalFindingInput = SingleSiteWriteEnvelope & {
  planId: string;
  migrationId: string;
  findingKey: string;
  category: SingleSiteImprovementCategory;
  risk?: SingleSiteImprovementRiskLevel | null;
  impact?: SingleSiteImprovementImpactLevel | null;
  summary: string;
  evidenceConfidence?: "low" | "medium" | "high" | null;
  findingStatus?: SingleSiteImprovementProposalFindingStatus | null;
  blocksProposalApproval?: boolean | null;
  acceptedLimitation?: boolean | null;
  sourceRefIdsJson?: unknown[];
  cloneFidelityRefIdsJson?: unknown[];
  recommendationIdsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  decisionJson?: SingleSiteJsonObject;
  actor: SingleSiteActorInput;
  semanticWatermark?: string | null;
};

export type InsertImprovementProposalEventInput = SingleSiteWriteEnvelope & {
  planId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteImprovementProposalEventAction;
  fromStatus?: SingleSiteImprovementProposalPlanStatus | null;
  toStatus?: SingleSiteImprovementProposalPlanStatus | null;
  actor: SingleSiteActorInput;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  approvalRefsJson?: SingleSiteJsonObject;
  implementationAuthorizationRefsJson?: SingleSiteJsonObject;
  sourceWatermark?: string | null;
  semanticWatermark?: string | null;
  payloadHash?: string | null;
  occurredAt?: string | null;
};

export type InsertImprovementProposalSupersessionInput = SingleSiteWriteEnvelope & {
  migrationId: string;
  supersededPlanId: string;
  replacementPlanId?: string | null;
  supersessionReason: string;
  sourceRefJson?: SingleSiteJsonObject;
  actor: SingleSiteActorInput;
  semanticWatermark?: string | null;
};

export type CreateImprovementExecutionAttemptInput = SingleSiteWriteEnvelope & {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  proposalPlanId: string;
  proposalPlanVersion: number;
  proposalPlanSemanticWatermark: string;
  proposalApprovalRequestId?: string | null;
  proposalApprovalDecisionId?: string | null;
  proposalEvidencePackageId?: string | null;
  implementationAuthorizationRequestId: string;
  implementationAuthorizationDecisionId: string;
  implementationAuthorizationEvidencePackageId?: string | null;
  aafValidationResultRef?: string | null;
  aafValidationEvidenceRef?: string | null;
  cloneReviewId: string;
  cloneSiteVersionRef: string;
  cloneRuntimeArtifactRef: string;
  sourceEvidenceReviewId: string;
  selectedRecommendationRefsJson?: unknown[];
  limitationsJson?: unknown[];
  executionMode?: SingleSiteImprovementExecutionMode | null;
  executorId?: string | null;
  executorName?: string | null;
  executorVersion?: string | null;
  status?: SingleSiteImprovementExecutionStatus | null;
  readinessJson?: SingleSiteJsonObject;
  validationSummaryJson?: SingleSiteJsonObject;
  semanticInputWatermark: string;
  semanticOutputWatermark?: string | null;
  improvedCandidateSiteVersionRef?: string | null;
  improvedRuntimeArtifactRef?: string | null;
  outputRefsJson?: SingleSiteJsonObject;
  failureJson?: SingleSiteJsonObject;
  auditRefsJson?: SingleSiteJsonObject;
  supersedesAttemptId?: string | null;
  actor: SingleSiteActorInput;
  payloadHash?: string | null;
};

export type UpdateImprovementExecutionAttemptStatusInput = SingleSiteWriteEnvelope & {
  attemptId: string;
  status: SingleSiteImprovementExecutionStatus;
  readinessJson?: SingleSiteJsonObject;
  validationSummaryJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  selectedRecommendationRefsJson?: unknown[];
  aafValidationResultRef?: string | null;
  aafValidationEvidenceRef?: string | null;
  semanticOutputWatermark?: string | null;
  improvedCandidateSiteVersionRef?: string | null;
  improvedRuntimeArtifactRef?: string | null;
  outputRefsJson?: SingleSiteJsonObject;
  failureJson?: SingleSiteJsonObject;
  auditRefsJson?: SingleSiteJsonObject;
  supersededByAttemptId?: string | null;
  actor?: SingleSiteActorInput | null;
  startedAt?: string | null;
  completedAt?: string | null;
  terminalAt?: string | null;
};

export type InsertImprovementExecutionRefInput = SingleSiteWriteEnvelope & {
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

export type UpsertImprovementExecutionItemInput = SingleSiteWriteEnvelope & {
  attemptId: string;
  migrationId: string;
  itemType: SingleSiteImprovementExecutionItemType;
  itemKey: string;
  recommendationId?: string | null;
  status?: "open" | "resolved" | "accepted_limitation" | "blocked" | "failed" | "superseded" | null;
  detailsJson?: SingleSiteJsonObject;
  refsJson?: unknown[];
  limitationJson?: SingleSiteJsonObject;
  warningsJson?: unknown[];
  errorJson?: SingleSiteJsonObject;
  actor: SingleSiteActorInput;
  semanticWatermark?: string | null;
};

export type InsertImprovementExecutionEventInput = SingleSiteWriteEnvelope & {
  attemptId: string;
  migrationId: string;
  eventIndex: number;
  eventAction: SingleSiteImprovementExecutionEventAction;
  fromStatus?: SingleSiteImprovementExecutionStatus | null;
  toStatus?: SingleSiteImprovementExecutionStatus | null;
  actor: SingleSiteActorInput;
  detailsJson?: SingleSiteJsonObject;
  limitationsJson?: unknown[];
  warningsJson?: unknown[];
  validationSummaryJson?: SingleSiteJsonObject;
  outputRefsJson?: SingleSiteJsonObject;
  failureJson?: SingleSiteJsonObject;
  sourceWatermark?: string | null;
  semanticWatermark?: string | null;
  payloadHash?: string | null;
  occurredAt?: string | null;
};

function trimText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = trimText(value);
  if (!normalized) throw new SingleSiteStateValidationError(`${field} is required`);
  return normalized;
}

function optionalText(value: unknown): string | null {
  return trimText(value);
}

function enumValue<T extends string>(field: string, value: unknown, allowed: readonly T[]): T {
  const normalized = requiredText(field, value);
  if (!allowed.includes(normalized as T)) throw new SingleSiteStateValidationError(`${field} must be one of ${allowed.join(", ")}`);
  return normalized as T;
}

function optionalEnumValue<T extends string>(field: string, value: unknown, allowed: readonly T[]): T | null {
  if (value === undefined || value === null) return null;
  return enumValue(field, value, allowed);
}

function jsonObject(field: string, value: unknown, fallback: SingleSiteJsonObject = {}): SingleSiteJsonObject {
  const candidate = value === undefined || value === null ? fallback : value;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) || candidate instanceof Date) {
    throw new SingleSiteStateValidationError(`${field} must be an object`);
  }
  return stableJsonValue(candidate) as SingleSiteJsonObject;
}

function jsonArray(field: string, value: unknown, fallback: unknown[] = []): unknown[] {
  const candidate = value === undefined || value === null ? fallback : value;
  if (!Array.isArray(candidate)) throw new SingleSiteStateValidationError(`${field} must be an array`);
  return stableJsonValue(candidate) as unknown[];
}

function optionalPositiveInteger(field: string, value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) throw new SingleSiteStateValidationError(`${field} must be a positive integer`);
  return numberValue;
}

function timestampText(field: string, value: unknown): string | null {
  const normalized = optionalText(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new SingleSiteStateValidationError(`${field} must be a valid timestamp`);
  return parsed.toISOString();
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

function toPostgresValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value && typeof value === "object" && !(value instanceof Date)) return JSON.stringify(stableJsonValue(value));
  return value;
}

function fromPgJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function semanticValue(value: unknown): string {
  return JSON.stringify(stableJsonValue(fromPgJson(value)));
}

function compactRow(row: InsertableRow): InsertableRow {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function assertSemanticMatch(tableName: string, idempotencyKey: string, attempted: InsertableRow, existing: InsertableRow, fields: readonly string[]): void {
  const driftedFields = fields.filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (driftedFields.length > 0) throw new SingleSiteIdempotencyConflictError(tableName, idempotencyKey, driftedFields);
}

function buildWhereClause(where: InsertableRow, startAt = 1): { sql: string; values: unknown[] } {
  const payload = compactRow(where);
  const values: unknown[] = [];
  const parts = Object.entries(payload).map(([column, value], index) => {
    values.push(toPostgresValue(value));
    return `${column} is not distinct from $${startAt + index}`;
  });
  if (parts.length === 0) throw new SingleSiteStateWriterError("cannot build empty lookup");
  return { sql: parts.join(" and "), values };
}

async function insertReturning<T extends Record<string, unknown>>(
  client: SingleSitePgClient,
  tableName: string,
  row: InsertableRow,
  options: { lookup: InsertableRow; semanticFields: readonly string[]; idempotencyKey: string },
): Promise<{ row: T; reusedExisting: boolean }> {
  const payload = compactRow(row);
  const columns = Object.keys(payload);
  const values = columns.map((column) => toPostgresValue(payload[column]));
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const result = await client.query(
    `insert into public.${tableName} (${columns.join(", ")})
     values (${placeholders.join(", ")})
     on conflict (idempotency_key) do nothing
     returning *`,
    values,
  );
  const inserted = result.rows[0] as T | undefined;
  if (inserted) return { row: inserted, reusedExisting: false };

  const lookup = buildWhereClause(options.lookup);
  const existing = await client.query(
    `select *
     from public.${tableName}
     where ${lookup.sql}
     order by created_at asc
     limit 1`,
    lookup.values,
  );
  const existingRow = existing.rows[0] as T | undefined;
  if (!existingRow) throw new SingleSiteStateWriterError(`idempotent insert into ${tableName} did not find an existing row`);
  assertSemanticMatch(tableName, options.idempotencyKey, payload, existingRow, options.semanticFields);
  return { row: existingRow, reusedExisting: true };
}

async function withTransaction<T>(pool: SingleSiteStateWriterPool, fn: (client: SingleSiteStateWriterTx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let started = false;
  try {
    await client.query("begin");
    started = true;
    const result = await fn(client);
    await client.query("commit");
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("rollback");
      } catch {
        // Best-effort rollback after a failed single-site writer transaction.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}

export class SingleSiteStateWriterRepository {
  constructor(private readonly pool: SingleSiteStateWriterPool = getSuperadminPool()) {}

  withTransaction<T>(fn: (tx: SingleSiteStateWriterTx) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, fn);
  }

  async createMigration(client: SingleSitePgClient, input: CreateSingleSiteMigrationInput): Promise<{ row: SingleSiteMigrationRow; reusedExisting: boolean }> {
    const currentState = optionalEnumValue("currentState", input.currentState, SINGLE_SITE_MIGRATION_STATES) ?? "site_candidate_created";
    const row: InsertableRow = {
      tenant_id: requiredText("tenantId", input.tenantId),
      client_id: requiredText("clientId", input.clientId),
      site_id: optionalText(input.siteId),
      ownership_site_id: optionalText(input.ownershipSiteId),
      runtime_site_id: optionalText(input.runtimeSiteId),
      site_version_id: optionalText(input.siteVersionId),
      runtime_site_version_id: optionalText(input.runtimeSiteVersionId),
      source_url: requiredText("sourceUrl", input.sourceUrl),
      canonical_source_url: optionalText(input.canonicalSourceUrl),
      intended_launch_domain: optionalText(input.intendedLaunchDomain),
      current_state: currentState,
      current_stage: SINGLE_SITE_STATE_STAGE[currentState],
      operator_owner_actor_id: optionalText(input.operatorOwnerActorId),
      source_capture_refs_json: jsonObject("sourceCaptureRefsJson", input.sourceCaptureRefsJson),
      runtime_refs_json: jsonObject("runtimeRefsJson", input.runtimeRefsJson),
      proposal_refs_json: jsonObject("proposalRefsJson", input.proposalRefsJson),
      aaf_approval_refs_json: jsonObject("aafApprovalRefsJson", input.aafApprovalRefsJson),
      aaf_evidence_refs_json: jsonObject("aafEvidenceRefsJson", input.aafEvidenceRefsJson),
      aaf_audit_refs_json: jsonObject("aafAuditRefsJson", input.aafAuditRefsJson),
      ddom_snapshot_refs_json: jsonObject("ddomSnapshotRefsJson", input.ddomSnapshotRefsJson),
      ptt_publish_target_refs_json: jsonObject("pttPublishTargetRefsJson", input.pttPublishTargetRefsJson),
      billing_subscription_refs_json: jsonObject("billingSubscriptionRefsJson", input.billingSubscriptionRefsJson),
      hosting_entitlement_refs_json: jsonObject("hostingEntitlementRefsJson", input.hostingEntitlementRefsJson),
      rollback_refs_json: jsonObject("rollbackRefsJson", input.rollbackRefsJson),
      closeout_refs_json: jsonObject("closeoutRefsJson", input.closeoutRefsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      blockers_json: jsonArray("blockersJson", input.blockersJson),
      source_watermark: optionalText(input.sourceWatermark),
      payload_hash: optionalText(input.payloadHash),
      validation_site_number: optionalPositiveInteger("validationSiteNumber", input.validationSiteNumber),
      created_by_actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      created_by_actor_id: requiredText("actor.actorId", input.actor.actorId),
      created_by_actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteMigrationRow>(client, "gnr8_single_site_migrations", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "tenant_id",
        "client_id",
        "site_id",
        "ownership_site_id",
        "runtime_site_id",
        "site_version_id",
        "runtime_site_version_id",
        "source_url",
        "canonical_source_url",
        "intended_launch_domain",
        "current_state",
        "current_stage",
        "operator_owner_actor_id",
        "source_capture_refs_json",
        "runtime_refs_json",
        "proposal_refs_json",
        "aaf_approval_refs_json",
        "aaf_evidence_refs_json",
        "aaf_audit_refs_json",
        "ddom_snapshot_refs_json",
        "ptt_publish_target_refs_json",
        "billing_subscription_refs_json",
        "hosting_entitlement_refs_json",
        "rollback_refs_json",
        "closeout_refs_json",
        "limitations_json",
        "warnings_json",
        "blockers_json",
        "source_watermark",
        "payload_hash",
        "validation_site_number",
        "created_by_actor_type",
        "created_by_actor_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async getMigrationById(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteMigrationRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_migrations where id = $1::uuid limit 1", [requiredText("migrationId", migrationId)]);
    return (result.rows[0] as SingleSiteMigrationRow | undefined) ?? null;
  }

  async getMigrationByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteMigrationRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_migrations where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteMigrationRow | undefined) ?? null;
  }

  async updateMigrationCurrentState(client: SingleSitePgClient, input: UpdateSingleSiteMigrationStateInput): Promise<SingleSiteMigrationRow> {
    const toState = enumValue("toState", input.toState, SINGLE_SITE_MIGRATION_STATES);
    const refs = input.refs ?? {};
    const result = await client.query(
      `
      update public.gnr8_single_site_migrations
      set
        current_state = $2,
        current_stage = $3,
        state_version = state_version + 1,
        latest_state_event_id = $4::uuid,
        latest_source_evidence_review_id = coalesce($5::uuid, latest_source_evidence_review_id),
        source_capture_refs_json = coalesce($6::jsonb, source_capture_refs_json),
        runtime_refs_json = coalesce($7::jsonb, runtime_refs_json),
        proposal_refs_json = coalesce($8::jsonb, proposal_refs_json),
        aaf_approval_refs_json = coalesce($9::jsonb, aaf_approval_refs_json),
        aaf_evidence_refs_json = coalesce($10::jsonb, aaf_evidence_refs_json),
        aaf_audit_refs_json = coalesce($11::jsonb, aaf_audit_refs_json),
        ddom_snapshot_refs_json = coalesce($12::jsonb, ddom_snapshot_refs_json),
        ptt_publish_target_refs_json = coalesce($13::jsonb, ptt_publish_target_refs_json),
        billing_subscription_refs_json = coalesce($14::jsonb, billing_subscription_refs_json),
        hosting_entitlement_refs_json = coalesce($15::jsonb, hosting_entitlement_refs_json),
        rollback_refs_json = coalesce($16::jsonb, rollback_refs_json),
        closeout_refs_json = coalesce($17::jsonb, closeout_refs_json),
        terminal_at = $18::timestamptz,
        updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        requiredText("migrationId", input.migrationId),
        toState,
        SINGLE_SITE_STATE_STAGE[toState],
        requiredText("latestStateEventId", input.latestStateEventId),
        optionalText(input.latestSourceEvidenceReviewId),
        refs.source_capture_refs_json === undefined ? null : toPostgresValue(jsonObject("source_capture_refs_json", refs.source_capture_refs_json)),
        refs.runtime_refs_json === undefined ? null : toPostgresValue(jsonObject("runtime_refs_json", refs.runtime_refs_json)),
        refs.proposal_refs_json === undefined ? null : toPostgresValue(jsonObject("proposal_refs_json", refs.proposal_refs_json)),
        refs.aaf_approval_refs_json === undefined ? null : toPostgresValue(jsonObject("aaf_approval_refs_json", refs.aaf_approval_refs_json)),
        refs.aaf_evidence_refs_json === undefined ? null : toPostgresValue(jsonObject("aaf_evidence_refs_json", refs.aaf_evidence_refs_json)),
        refs.aaf_audit_refs_json === undefined ? null : toPostgresValue(jsonObject("aaf_audit_refs_json", refs.aaf_audit_refs_json)),
        refs.ddom_snapshot_refs_json === undefined ? null : toPostgresValue(jsonObject("ddom_snapshot_refs_json", refs.ddom_snapshot_refs_json)),
        refs.ptt_publish_target_refs_json === undefined ? null : toPostgresValue(jsonObject("ptt_publish_target_refs_json", refs.ptt_publish_target_refs_json)),
        refs.billing_subscription_refs_json === undefined ? null : toPostgresValue(jsonObject("billing_subscription_refs_json", refs.billing_subscription_refs_json)),
        refs.hosting_entitlement_refs_json === undefined ? null : toPostgresValue(jsonObject("hosting_entitlement_refs_json", refs.hosting_entitlement_refs_json)),
        refs.rollback_refs_json === undefined ? null : toPostgresValue(jsonObject("rollback_refs_json", refs.rollback_refs_json)),
        refs.closeout_refs_json === undefined ? null : toPostgresValue(jsonObject("closeout_refs_json", refs.closeout_refs_json)),
        timestampText("terminalAt", input.terminalAt),
      ],
    );
    const row = result.rows[0] as SingleSiteMigrationRow | undefined;
    if (!row) throw new SingleSiteStateWriterError("migration current state update did not return a row");
    return row;
  }

  async insertStateEvent(client: SingleSitePgClient, input: InsertSingleSiteStateEventInput): Promise<{ row: SingleSiteStateEventRow; reusedExisting: boolean }> {
    const toState = enumValue("toState", input.toState, SINGLE_SITE_MIGRATION_STATES);
    const fromState = optionalEnumValue("fromState", input.fromState, SINGLE_SITE_MIGRATION_STATES);
    const row: InsertableRow = {
      migration_id: requiredText("migrationId", input.migrationId),
      event_index: optionalPositiveInteger("eventIndex", input.eventIndex),
      from_state: fromState,
      to_state: toState,
      from_stage: fromState ? SINGLE_SITE_STATE_STAGE[fromState] : null,
      to_stage: SINGLE_SITE_STATE_STAGE[toState],
      transition_key: requiredText("transitionKey", input.transitionKey),
      transition_reason: optionalText(input.transitionReason),
      required_refs_json: jsonObject("requiredRefsJson", input.requiredRefsJson),
      missing_requirements_json: jsonArray("missingRequirementsJson", input.missingRequirementsJson),
      before_ref_json: jsonObject("beforeRefJson", input.beforeRefJson),
      after_ref_json: jsonObject("afterRefJson", input.afterRefJson),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      aaf_audit_event_id: optionalText(input.aafAuditEventId),
      aaf_evidence_package_id: optionalText(input.aafEvidencePackageId),
      aaf_approval_request_id: optionalText(input.aafApprovalRequestId),
      aaf_approval_decision_id: optionalText(input.aafApprovalDecisionId),
      source_watermark: optionalText(input.sourceWatermark),
      payload_hash: optionalText(input.payloadHash),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
      occurred_at: timestampText("occurredAt", input.occurredAt) ?? undefined,
    };
    return insertReturning<SingleSiteStateEventRow>(client, "gnr8_single_site_migration_state_events", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "migration_id",
        "from_state",
        "to_state",
        "from_stage",
        "to_stage",
        "transition_key",
        "transition_reason",
        "required_refs_json",
        "missing_requirements_json",
        "before_ref_json",
        "after_ref_json",
        "actor_type",
        "actor_id",
        "actor_role",
        "aaf_audit_event_id",
        "aaf_evidence_package_id",
        "aaf_approval_request_id",
        "aaf_approval_decision_id",
        "source_watermark",
        "payload_hash",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async getStateEventByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteStateEventRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_migration_state_events where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteStateEventRow | undefined) ?? null;
  }

  async nextStateEventIndex(client: SingleSitePgClient, migrationId: string): Promise<number> {
    const result = await client.query("select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_migration_state_events where migration_id = $1::uuid", [requiredText("migrationId", migrationId)]);
    return Number(result.rows[0]?.event_index ?? 1);
  }

  async insertMigrationRef(client: SingleSitePgClient, input: InsertSingleSiteMigrationRefInput): Promise<{ row: SingleSiteMigrationRefRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      migration_id: requiredText("migrationId", input.migrationId),
      state_event_id: optionalText(input.stateEventId),
      ref_role: enumValue("refRole", input.refRole, SINGLE_SITE_MIGRATION_REF_ROLES),
      ref_type: requiredText("refType", input.refType),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      payload_hash: optionalText(input.payloadHash),
      captured_at: timestampText("capturedAt", input.capturedAt),
      fresh_until: timestampText("freshUntil", input.freshUntil),
      superseded_by_ref_id: optionalText(input.supersededByRefId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteMigrationRefRow>(client, "gnr8_single_site_migration_refs", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "migration_id",
        "state_event_id",
        "ref_role",
        "ref_type",
        "source_system",
        "source_table",
        "source_record_id",
        "source_version",
        "source_watermark",
        "payload_hash",
        "captured_at",
        "fresh_until",
        "superseded_by_ref_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async upsertStageSummary(client: SingleSitePgClient, input: UpsertSingleSiteStageSummaryInput): Promise<Record<string, unknown>> {
    const result = await client.query(
      `
      insert into public.gnr8_single_site_migration_stage_summaries (
        migration_id, stage, status, started_at, completed_at, latest_state_event_id, latest_evidence_ref_id,
        latest_approval_ref_id, summary_json, limitations_json, warnings_json, blockers_json, blocker_count,
        correlation_id, idempotency_key, privacy_label, retention_class
      )
      values ($1::uuid, $2, $3, $4::timestamptz, $5::timestamptz, $6::uuid, $7::uuid, $8::uuid, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17)
      on conflict (migration_id, stage) do update set
        status = excluded.status,
        completed_at = excluded.completed_at,
        latest_state_event_id = excluded.latest_state_event_id,
        latest_evidence_ref_id = excluded.latest_evidence_ref_id,
        latest_approval_ref_id = excluded.latest_approval_ref_id,
        summary_json = excluded.summary_json,
        limitations_json = excluded.limitations_json,
        warnings_json = excluded.warnings_json,
        blockers_json = excluded.blockers_json,
        blocker_count = excluded.blocker_count,
        updated_at = now()
      returning *
      `,
      [
        requiredText("migrationId", input.migrationId),
        enumValue("stage", input.stage, SINGLE_SITE_STATE_STAGE_VALUES),
        enumValue("status", input.status, SINGLE_SITE_STAGE_SUMMARY_STATUSES),
        timestampText("startedAt", input.startedAt),
        timestampText("completedAt", input.completedAt),
        optionalText(input.latestStateEventId),
        optionalText(input.latestEvidenceRefId),
        optionalText(input.latestApprovalRefId),
        toPostgresValue(jsonObject("summaryJson", input.summaryJson)),
        toPostgresValue(jsonArray("limitationsJson", input.limitationsJson)),
        toPostgresValue(jsonArray("warningsJson", input.warningsJson)),
        toPostgresValue(jsonArray("blockersJson", input.blockersJson)),
        Number(input.blockerCount ?? 0),
        requiredText("correlationId", input.correlationId),
        requiredText("idempotencyKey", input.idempotencyKey),
        optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
        optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      ],
    );
    return result.rows[0] ?? {};
  }

  async upsertBlocker(client: SingleSitePgClient, input: UpsertSingleSiteBlockerInput): Promise<Record<string, unknown>> {
    const status = optionalEnumValue("status", input.status, SINGLE_SITE_BLOCKER_STATUSES) ?? "open";
    const result = await client.query(
      `
      insert into public.gnr8_single_site_migration_blockers (
        migration_id, state_event_id, blocker_key, blocker_type, severity, status, owner_role, opened_at, resolved_at,
        resolution_state_event_id, resolution_aaf_audit_event_id, resolution_aaf_approval_decision_id, source_ref_json,
        details_json, ops_inbox_projection_key, correlation_id, idempotency_key, privacy_label, retention_class
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, coalesce($8::timestamptz, now()), $9::timestamptz, $10::uuid, $11::uuid, $12::uuid, $13::jsonb, $14::jsonb, $15, $16, $17, $18, $19)
      on conflict (migration_id, blocker_key) do update set
        state_event_id = excluded.state_event_id,
        severity = excluded.severity,
        status = excluded.status,
        owner_role = excluded.owner_role,
        resolved_at = excluded.resolved_at,
        resolution_state_event_id = excluded.resolution_state_event_id,
        resolution_aaf_audit_event_id = excluded.resolution_aaf_audit_event_id,
        resolution_aaf_approval_decision_id = excluded.resolution_aaf_approval_decision_id,
        source_ref_json = excluded.source_ref_json,
        details_json = excluded.details_json,
        ops_inbox_projection_key = excluded.ops_inbox_projection_key,
        updated_at = now()
      returning *
      `,
      [
        requiredText("migrationId", input.migrationId),
        optionalText(input.stateEventId),
        requiredText("blockerKey", input.blockerKey),
        enumValue("blockerType", input.blockerType, SINGLE_SITE_BLOCKER_TYPES),
        enumValue("severity", input.severity, SINGLE_SITE_SEVERITY_LEVELS),
        status,
        optionalText(input.ownerRole),
        timestampText("openedAt", input.openedAt),
        status === "open" ? null : timestampText("resolvedAt", input.resolvedAt) ?? new Date().toISOString(),
        optionalText(input.resolutionStateEventId),
        optionalText(input.resolutionAafAuditEventId),
        optionalText(input.resolutionAafApprovalDecisionId),
        toPostgresValue(jsonObject("sourceRefJson", input.sourceRefJson)),
        toPostgresValue(jsonObject("detailsJson", input.detailsJson)),
        optionalText(input.opsInboxProjectionKey),
        requiredText("correlationId", input.correlationId),
        requiredText("idempotencyKey", input.idempotencyKey),
        optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
        optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      ],
    );
    return result.rows[0] ?? {};
  }

  async insertCloseout(client: SingleSitePgClient, input: InsertSingleSiteCloseoutInput): Promise<{ row: Record<string, unknown>; reusedExisting: boolean }> {
    const row: InsertableRow = {
      migration_id: requiredText("migrationId", input.migrationId),
      status: optionalEnumValue("status", input.status, SINGLE_SITE_CLOSEOUT_STATUSES) ?? "completed",
      final_url: optionalText(input.finalUrl),
      outcome: enumValue("outcome", input.outcome, SINGLE_SITE_CLOSEOUT_OUTCOMES),
      validation_site_number: optionalPositiveInteger("validationSiteNumber", input.validationSiteNumber),
      metrics_json: jsonObject("metricsJson", input.metricsJson),
      issue_taxonomy_json: jsonArray("issueTaxonomyJson", input.issueTaxonomyJson),
      evidence_summary_json: jsonObject("evidenceSummaryJson", input.evidenceSummaryJson),
      exceptions_json: jsonArray("exceptionsJson", input.exceptionsJson),
      lessons_json: jsonObject("lessonsJson", input.lessonsJson),
      closeout_refs_json: jsonObject("closeoutRefsJson", input.closeoutRefsJson),
      supersedes_closeout_id: optionalText(input.supersedesCloseoutId),
      superseded_by_closeout_id: optionalText(input.supersededByCloseoutId),
      aaf_evidence_package_id: optionalText(input.aafEvidencePackageId),
      aaf_approval_decision_id: optionalText(input.aafApprovalDecisionId),
      aaf_audit_event_id: optionalText(input.aafAuditEventId),
      closed_by_actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      closed_by_actor_id: requiredText("actor.actorId", input.actor.actorId),
      closed_by_actor_display_label: optionalText(input.actor.actorDisplayLabel),
      closed_at: timestampText("closedAt", input.closedAt) ?? undefined,
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning(client, "gnr8_single_site_migration_closeouts", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "migration_id",
        "status",
        "final_url",
        "outcome",
        "validation_site_number",
        "metrics_json",
        "issue_taxonomy_json",
        "evidence_summary_json",
        "exceptions_json",
        "lessons_json",
        "closeout_refs_json",
        "supersedes_closeout_id",
        "superseded_by_closeout_id",
        "aaf_evidence_package_id",
        "aaf_approval_decision_id",
        "aaf_audit_event_id",
        "closed_by_actor_type",
        "closed_by_actor_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async createSourceEvidenceReview(client: SingleSitePgClient, input: CreateSourceEvidenceReviewInput): Promise<{ row: SingleSiteSourceEvidenceReviewRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      migration_id: requiredText("migrationId", input.migrationId),
      tenant_id: requiredText("tenantId", input.tenantId),
      client_id: requiredText("clientId", input.clientId),
      site_id: optionalText(input.siteId),
      ownership_site_id: optionalText(input.ownershipSiteId),
      runtime_site_id: optionalText(input.runtimeSiteId),
      site_version_id: optionalText(input.siteVersionId),
      source_url: requiredText("sourceUrl", input.sourceUrl),
      canonical_source_url: optionalText(input.canonicalSourceUrl),
      capture_run_id: optionalText(input.captureRunId),
      render_job_id: optionalText(input.renderJobId),
      source_evidence_package_key: requiredText("sourceEvidencePackageKey", input.sourceEvidencePackageKey),
      source_watermark: requiredText("sourceWatermark", input.sourceWatermark),
      source_hash: optionalText(input.sourceHash),
      capture_started_at: timestampText("captureStartedAt", input.captureStartedAt),
      capture_completed_at: timestampText("captureCompletedAt", input.captureCompletedAt),
      evidence_captured_at: timestampText("evidenceCapturedAt", input.evidenceCapturedAt) ?? requiredText("evidenceCapturedAt", input.evidenceCapturedAt),
      fresh_until: timestampText("freshUntil", input.freshUntil),
      completeness_status: enumValue("completenessStatus", input.completenessStatus, SINGLE_SITE_SOURCE_EVIDENCE_COMPLETENESS_STATUSES),
      review_status: optionalEnumValue("reviewStatus", input.reviewStatus, SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES) ?? "not_started",
      review_limitations_json: jsonArray("reviewLimitationsJson", input.reviewLimitationsJson),
      missing_evidence_json: jsonArray("missingEvidenceJson", input.missingEvidenceJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      blockers_json: jsonArray("blockersJson", input.blockersJson),
      diagnostics_json: jsonObject("diagnosticsJson", input.diagnosticsJson),
      supersedes_review_id: optionalText(input.supersedesReviewId),
      aaf_evidence_package_id: optionalText(input.aafEvidencePackageId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteSourceEvidenceReviewRow>(client, "gnr8_single_site_source_evidence_reviews", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "migration_id",
        "tenant_id",
        "client_id",
        "site_id",
        "ownership_site_id",
        "runtime_site_id",
        "site_version_id",
        "source_url",
        "canonical_source_url",
        "capture_run_id",
        "render_job_id",
        "source_evidence_package_key",
        "source_watermark",
        "source_hash",
        "capture_started_at",
        "capture_completed_at",
        "evidence_captured_at",
        "fresh_until",
        "completeness_status",
        "review_status",
        "review_limitations_json",
        "missing_evidence_json",
        "warnings_json",
        "blockers_json",
        "diagnostics_json",
        "supersedes_review_id",
        "aaf_evidence_package_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async getSourceEvidenceReviewById(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteSourceEvidenceReviewRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_source_evidence_reviews where id = $1::uuid limit 1", [requiredText("reviewId", reviewId)]);
    return (result.rows[0] as SingleSiteSourceEvidenceReviewRow | undefined) ?? null;
  }

  async getSourceEvidenceReviewByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteSourceEvidenceReviewRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_source_evidence_reviews where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteSourceEvidenceReviewRow | undefined) ?? null;
  }

  async updateSourceEvidenceReviewStatus(client: SingleSitePgClient, input: UpdateSourceEvidenceReviewStatusInput): Promise<SingleSiteSourceEvidenceReviewRow> {
    const actor = input.actor ?? null;
    const result = await client.query(
      `
      update public.gnr8_single_site_source_evidence_reviews
      set
        review_status = $2,
        review_decision = $3,
        accepted_degraded_capture = $4,
        retry_required = $5,
        clone_generation_allowed = $6,
        review_limitations_json = coalesce($7::jsonb, review_limitations_json),
        missing_evidence_json = coalesce($8::jsonb, missing_evidence_json),
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
        aaf_approval_request_id = coalesce($19::uuid, aaf_approval_request_id),
        aaf_approval_decision_id = coalesce($20::uuid, aaf_approval_decision_id),
        aaf_audit_event_id = coalesce($21::uuid, aaf_audit_event_id),
        updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        requiredText("reviewId", input.reviewId),
        enumValue("reviewStatus", input.reviewStatus, SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES),
        optionalEnumValue("reviewDecision", input.reviewDecision, SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_DECISIONS),
        Boolean(input.acceptedDegradedCapture ?? false),
        Boolean(input.retryRequired ?? false),
        Boolean(input.cloneGenerationAllowed ?? false),
        input.reviewLimitationsJson === undefined ? null : toPostgresValue(jsonArray("reviewLimitationsJson", input.reviewLimitationsJson)),
        input.missingEvidenceJson === undefined ? null : toPostgresValue(jsonArray("missingEvidenceJson", input.missingEvidenceJson)),
        input.warningsJson === undefined ? null : toPostgresValue(jsonArray("warningsJson", input.warningsJson)),
        input.blockersJson === undefined ? null : toPostgresValue(jsonArray("blockersJson", input.blockersJson)),
        input.diagnosticsJson === undefined ? null : toPostgresValue(jsonObject("diagnosticsJson", input.diagnosticsJson)),
        actor ? enumValue("actor.actorType", actor.actorType, SINGLE_SITE_ACTOR_TYPES) : null,
        actor ? requiredText("actor.actorId", actor.actorId) : null,
        actor ? requiredText("actor.actorRole", actor.actorRole) : null,
        actor ? optionalText(actor.actorDisplayLabel) : null,
        timestampText("reviewStartedAt", input.reviewStartedAt),
        timestampText("reviewedAt", input.reviewedAt),
        optionalText(input.supersededByReviewId),
        optionalText(input.aafApprovalRequestId),
        optionalText(input.aafApprovalDecisionId),
        optionalText(input.aafAuditEventId),
      ],
    );
    const row = result.rows[0] as SingleSiteSourceEvidenceReviewRow | undefined;
    if (!row) throw new SingleSiteStateWriterError("source evidence review status update did not return a row");
    return row;
  }

  async insertSourceEvidenceReviewRef(client: SingleSitePgClient, input: InsertSourceEvidenceReviewRefInput): Promise<{ row: Record<string, unknown>; reusedExisting: boolean }> {
    const row: InsertableRow = {
      review_id: requiredText("reviewId", input.reviewId),
      migration_id: requiredText("migrationId", input.migrationId),
      ref_role: enumValue("refRole", input.refRole, SINGLE_SITE_SOURCE_EVIDENCE_REF_ROLES),
      ref_type: requiredText("refType", input.refType),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      content_hash: optionalText(input.contentHash),
      media_type: optionalText(input.mediaType),
      captured_at: timestampText("capturedAt", input.capturedAt),
      fresh_until: timestampText("freshUntil", input.freshUntil),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning(client, "gnr8_single_site_source_evidence_review_refs", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "review_id",
        "migration_id",
        "ref_role",
        "ref_type",
        "source_system",
        "source_table",
        "source_record_id",
        "source_version",
        "source_watermark",
        "content_hash",
        "media_type",
        "captured_at",
        "fresh_until",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async upsertSourceEvidenceReviewItem(client: SingleSitePgClient, input: UpsertSourceEvidenceReviewItemInput): Promise<SingleSiteEvidenceItemRow> {
    const attempted: InsertableRow = {
      review_id: requiredText("reviewId", input.reviewId),
      migration_id: requiredText("migrationId", input.migrationId),
      evidence_category: enumValue("evidenceCategory", input.evidenceCategory, SINGLE_SITE_EVIDENCE_ITEM_CATEGORIES),
      status: enumValue("status", input.status, SINGLE_SITE_EVIDENCE_ITEM_STATUSES),
      required_for_clone: input.requiredForClone ?? true,
      blocks_clone_generation: input.blocksCloneGeneration ?? false,
      accepted_limitation: input.acceptedLimitation ?? false,
      finding_summary: optionalText(input.findingSummary),
      ref_ids_json: jsonArray("refIdsJson", input.refIdsJson),
      limitation_json: jsonObject("limitationJson", input.limitationJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      blocker_json: jsonObject("blockerJson", input.blockerJson),
      reviewer_actor_type: input.actor ? enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES) : null,
      reviewer_actor_id: input.actor ? requiredText("actor.actorId", input.actor.actorId) : null,
      reviewer_actor_display_label: input.actor ? optionalText(input.actor.actorDisplayLabel) : null,
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };

    const existing = await client.query(
      "select * from public.gnr8_single_site_source_evidence_review_items where idempotency_key = $1 limit 1",
      [attempted.idempotency_key],
    );
    const existingRow = existing.rows[0] as SingleSiteEvidenceItemRow | undefined;
    if (existingRow) {
      assertSemanticMatch("gnr8_single_site_source_evidence_review_items", String(attempted.idempotency_key), attempted, existingRow, [
        "review_id",
        "migration_id",
        "evidence_category",
        "status",
        "required_for_clone",
        "blocks_clone_generation",
        "accepted_limitation",
        "finding_summary",
        "ref_ids_json",
        "limitation_json",
        "warnings_json",
        "blocker_json",
        "reviewer_actor_type",
        "reviewer_actor_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ]);
      return existingRow;
    }

    const result = await client.query(
      `
      insert into public.gnr8_single_site_source_evidence_review_items (
        review_id, migration_id, evidence_category, status, required_for_clone, blocks_clone_generation,
        accepted_limitation, finding_summary, ref_ids_json, limitation_json, warnings_json, blocker_json,
        reviewer_actor_type, reviewer_actor_id, reviewer_actor_display_label, correlation_id, idempotency_key,
        privacy_label, retention_class, metadata_json
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20::jsonb)
      on conflict (review_id, evidence_category) do update set
        status = excluded.status,
        required_for_clone = excluded.required_for_clone,
        blocks_clone_generation = excluded.blocks_clone_generation,
        accepted_limitation = excluded.accepted_limitation,
        finding_summary = excluded.finding_summary,
        ref_ids_json = excluded.ref_ids_json,
        limitation_json = excluded.limitation_json,
        warnings_json = excluded.warnings_json,
        blocker_json = excluded.blocker_json,
        reviewer_actor_type = excluded.reviewer_actor_type,
        reviewer_actor_id = excluded.reviewer_actor_id,
        reviewer_actor_display_label = excluded.reviewer_actor_display_label,
        updated_at = now()
      returning *
      `,
      [
        attempted.review_id,
        attempted.migration_id,
        attempted.evidence_category,
        attempted.status,
        attempted.required_for_clone,
        attempted.blocks_clone_generation,
        attempted.accepted_limitation,
        attempted.finding_summary,
        toPostgresValue(attempted.ref_ids_json),
        toPostgresValue(attempted.limitation_json),
        toPostgresValue(attempted.warnings_json),
        toPostgresValue(attempted.blocker_json),
        attempted.reviewer_actor_type,
        attempted.reviewer_actor_id,
        attempted.reviewer_actor_display_label,
        attempted.correlation_id,
        attempted.idempotency_key,
        attempted.privacy_label,
        attempted.retention_class,
        toPostgresValue(attempted.metadata_json),
      ],
    );
    return result.rows[0] as SingleSiteEvidenceItemRow;
  }

  async listSourceEvidenceReviewItems(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteEvidenceItemRow[]> {
    const result = await client.query("select * from public.gnr8_single_site_source_evidence_review_items where review_id = $1::uuid order by evidence_category asc", [requiredText("reviewId", reviewId)]);
    return result.rows as SingleSiteEvidenceItemRow[];
  }

  async insertSourceEvidenceReviewEvent(client: SingleSitePgClient, input: InsertSourceEvidenceReviewEventInput): Promise<{ row: SingleSiteReviewEventRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      review_id: requiredText("reviewId", input.reviewId),
      migration_id: requiredText("migrationId", input.migrationId),
      event_index: optionalPositiveInteger("eventIndex", input.eventIndex),
      event_action: enumValue("eventAction", input.eventAction, SINGLE_SITE_REVIEW_EVENT_ACTIONS),
      from_status: optionalEnumValue("fromStatus", input.fromStatus, SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES),
      to_status: optionalEnumValue("toStatus", input.toStatus, SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      details_json: jsonObject("detailsJson", input.detailsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      blockers_json: jsonArray("blockersJson", input.blockersJson),
      aaf_audit_event_id: optionalText(input.aafAuditEventId),
      aaf_approval_decision_id: optionalText(input.aafApprovalDecisionId),
      source_watermark: optionalText(input.sourceWatermark),
      payload_hash: optionalText(input.payloadHash),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
      occurred_at: timestampText("occurredAt", input.occurredAt) ?? undefined,
    };
    return insertReturning<SingleSiteReviewEventRow>(client, "gnr8_single_site_source_evidence_review_events", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
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
        "aaf_audit_event_id",
        "aaf_approval_decision_id",
        "source_watermark",
        "payload_hash",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async getSourceEvidenceReviewEventByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteReviewEventRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_source_evidence_review_events where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteReviewEventRow | undefined) ?? null;
  }

  async nextReviewEventIndex(client: SingleSitePgClient, reviewId: string): Promise<number> {
    const result = await client.query("select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_source_evidence_review_events where review_id = $1::uuid", [requiredText("reviewId", reviewId)]);
    return Number(result.rows[0]?.event_index ?? 1);
  }

  async createCloneReview(client: SingleSitePgClient, input: CreateCloneReviewInput): Promise<{ row: SingleSiteCloneReviewRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      migration_id: requiredText("migrationId", input.migrationId),
      client_id: requiredText("clientId", input.clientId),
      site_id: optionalText(input.siteId),
      clone_site_version_ref: requiredText("cloneSiteVersionRef", input.cloneSiteVersionRef),
      runtime_artifact_ref: requiredText("runtimeArtifactRef", input.runtimeArtifactRef),
      source_evidence_review_id: requiredText("sourceEvidenceReviewId", input.sourceEvidenceReviewId),
      clone_generation_ref: optionalText(input.cloneGenerationRef),
      clone_generation_event_id: optionalText(input.cloneGenerationEventId),
      review_status: optionalEnumValue("reviewStatus", input.reviewStatus, SINGLE_SITE_CLONE_REVIEW_STATUSES) ?? "draft",
      fidelity_summary_json: jsonObject("fidelitySummaryJson", input.fidelitySummaryJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      blockers_json: jsonArray("blockersJson", input.blockersJson),
      diagnostics_json: jsonObject("diagnosticsJson", input.diagnosticsJson),
      supersedes_review_id: optionalText(input.supersedesReviewId),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteCloneReviewRow>(client, "gnr8_single_site_clone_reviews", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "migration_id",
        "client_id",
        "site_id",
        "clone_site_version_ref",
        "runtime_artifact_ref",
        "source_evidence_review_id",
        "clone_generation_ref",
        "clone_generation_event_id",
        "review_status",
        "fidelity_summary_json",
        "limitations_json",
        "warnings_json",
        "blockers_json",
        "diagnostics_json",
        "supersedes_review_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async getCloneReviewById(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteCloneReviewRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_clone_reviews where id = $1::uuid limit 1", [requiredText("reviewId", reviewId)]);
    return (result.rows[0] as SingleSiteCloneReviewRow | undefined) ?? null;
  }

  async getLatestCloneReviewForMigration(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteCloneReviewRow | null> {
    const result = await client.query(
      `
      select *
      from public.gnr8_single_site_clone_reviews
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [requiredText("migrationId", migrationId)],
    );
    return (result.rows[0] as SingleSiteCloneReviewRow | undefined) ?? null;
  }

  async getCloneReviewBySemanticRefs(
    client: SingleSitePgClient,
    input: Pick<CreateCloneReviewInput, "migrationId" | "cloneSiteVersionRef" | "runtimeArtifactRef" | "sourceEvidenceReviewId">,
  ): Promise<SingleSiteCloneReviewRow | null> {
    const result = await client.query(
      `
      select *
      from public.gnr8_single_site_clone_reviews
      where migration_id = $1::uuid
        and clone_site_version_ref = $2
        and runtime_artifact_ref = $3
        and source_evidence_review_id = $4::uuid
      order by created_at asc
      limit 1
      `,
      [
        requiredText("migrationId", input.migrationId),
        requiredText("cloneSiteVersionRef", input.cloneSiteVersionRef),
        requiredText("runtimeArtifactRef", input.runtimeArtifactRef),
        requiredText("sourceEvidenceReviewId", input.sourceEvidenceReviewId),
      ],
    );
    return (result.rows[0] as SingleSiteCloneReviewRow | undefined) ?? null;
  }

  async getCloneReviewEventByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteCloneReviewEventRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_clone_review_events where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteCloneReviewEventRow | undefined) ?? null;
  }

  async updateCloneReviewStatus(client: SingleSitePgClient, input: UpdateCloneReviewStatusInput): Promise<SingleSiteCloneReviewRow> {
    const actor = input.actor ?? null;
    const result = await client.query(
      `
      update public.gnr8_single_site_clone_reviews
      set
        review_status = $2,
        review_decision = $3,
        proposal_planning_allowed = $4,
        retry_required = $5,
        accepted_with_limitations = $6,
        fidelity_summary_json = coalesce($7::jsonb, fidelity_summary_json),
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
        requiredText("reviewId", input.reviewId),
        enumValue("reviewStatus", input.reviewStatus, SINGLE_SITE_CLONE_REVIEW_STATUSES),
        optionalEnumValue("reviewDecision", input.reviewDecision, SINGLE_SITE_CLONE_REVIEW_DECISIONS),
        Boolean(input.proposalPlanningAllowed ?? false),
        Boolean(input.retryRequired ?? false),
        Boolean(input.acceptedWithLimitations ?? false),
        input.fidelitySummaryJson === undefined ? null : toPostgresValue(jsonObject("fidelitySummaryJson", input.fidelitySummaryJson)),
        input.limitationsJson === undefined ? null : toPostgresValue(jsonArray("limitationsJson", input.limitationsJson)),
        input.warningsJson === undefined ? null : toPostgresValue(jsonArray("warningsJson", input.warningsJson)),
        input.blockersJson === undefined ? null : toPostgresValue(jsonArray("blockersJson", input.blockersJson)),
        input.diagnosticsJson === undefined ? null : toPostgresValue(jsonObject("diagnosticsJson", input.diagnosticsJson)),
        actor ? enumValue("actor.actorType", actor.actorType, SINGLE_SITE_ACTOR_TYPES) : null,
        actor ? requiredText("actor.actorId", actor.actorId) : null,
        actor ? requiredText("actor.actorRole", actor.actorRole) : null,
        actor ? optionalText(actor.actorDisplayLabel) : null,
        timestampText("reviewStartedAt", input.reviewStartedAt),
        timestampText("reviewedAt", input.reviewedAt),
        optionalText(input.supersededByReviewId),
      ],
    );
    const row = result.rows[0] as SingleSiteCloneReviewRow | undefined;
    if (!row) throw new SingleSiteStateWriterError("clone review status update did not return a row");
    return row;
  }

  async insertCloneReviewRef(client: SingleSitePgClient, input: InsertCloneReviewRefInput): Promise<{ row: SingleSiteCloneReviewRefRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      review_id: requiredText("reviewId", input.reviewId),
      migration_id: requiredText("migrationId", input.migrationId),
      ref_role: enumValue("refRole", input.refRole, SINGLE_SITE_CLONE_REVIEW_REF_ROLES),
      ref_type: requiredText("refType", input.refType),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      content_hash: optionalText(input.contentHash),
      media_type: optionalText(input.mediaType),
      captured_at: timestampText("capturedAt", input.capturedAt),
      fresh_until: timestampText("freshUntil", input.freshUntil),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteCloneReviewRefRow>(client, "gnr8_single_site_clone_review_refs", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "review_id",
        "migration_id",
        "ref_role",
        "ref_type",
        "source_system",
        "source_table",
        "source_record_id",
        "source_version",
        "source_watermark",
        "content_hash",
        "media_type",
        "captured_at",
        "fresh_until",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async upsertCloneReviewItem(client: SingleSitePgClient, input: UpsertCloneReviewItemInput): Promise<SingleSiteCloneReviewItemRow> {
    const attempted: InsertableRow = {
      review_id: requiredText("reviewId", input.reviewId),
      migration_id: requiredText("migrationId", input.migrationId),
      item_key: requiredText("itemKey", input.itemKey),
      fidelity_category: enumValue("fidelityCategory", input.fidelityCategory, SINGLE_SITE_CLONE_FIDELITY_CATEGORIES),
      severity: enumValue("severity", input.severity, SINGLE_SITE_CLONE_FIDELITY_SEVERITIES),
      status: optionalEnumValue("status", input.status, SINGLE_SITE_CLONE_REVIEW_ITEM_STATUSES) ?? "open",
      blocks_acceptance: input.blocksAcceptance ?? (input.severity === "p0_blocker" || input.severity === "p1_major"),
      accepted_limitation: input.acceptedLimitation ?? false,
      finding_summary: requiredText("findingSummary", input.findingSummary),
      ref_ids_json: jsonArray("refIdsJson", input.refIdsJson),
      limitation_json: jsonObject("limitationJson", input.limitationJson),
      details_json: jsonObject("detailsJson", input.detailsJson),
      reviewer_actor_type: input.actor ? enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES) : null,
      reviewer_actor_id: input.actor ? requiredText("actor.actorId", input.actor.actorId) : null,
      reviewer_actor_display_label: input.actor ? optionalText(input.actor.actorDisplayLabel) : null,
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };

    const existing = await client.query(
      "select * from public.gnr8_single_site_clone_review_items where idempotency_key = $1 limit 1",
      [attempted.idempotency_key],
    );
    const existingRow = existing.rows[0] as SingleSiteCloneReviewItemRow | undefined;
    if (existingRow) {
      assertSemanticMatch("gnr8_single_site_clone_review_items", String(attempted.idempotency_key), attempted, existingRow, [
        "review_id",
        "migration_id",
        "item_key",
        "fidelity_category",
        "severity",
        "status",
        "blocks_acceptance",
        "accepted_limitation",
        "finding_summary",
        "ref_ids_json",
        "limitation_json",
        "details_json",
        "reviewer_actor_type",
        "reviewer_actor_id",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ]);
      return existingRow;
    }

    const result = await client.query(
      `
      insert into public.gnr8_single_site_clone_review_items (
        review_id, migration_id, item_key, fidelity_category, severity, status, blocks_acceptance,
        accepted_limitation, finding_summary, ref_ids_json, limitation_json, details_json,
        reviewer_actor_type, reviewer_actor_id, reviewer_actor_display_label, correlation_id, idempotency_key,
        privacy_label, retention_class, metadata_json
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20::jsonb)
      on conflict (review_id, item_key) do update set
        fidelity_category = excluded.fidelity_category,
        severity = excluded.severity,
        status = excluded.status,
        blocks_acceptance = excluded.blocks_acceptance,
        accepted_limitation = excluded.accepted_limitation,
        finding_summary = excluded.finding_summary,
        ref_ids_json = excluded.ref_ids_json,
        limitation_json = excluded.limitation_json,
        details_json = excluded.details_json,
        reviewer_actor_type = excluded.reviewer_actor_type,
        reviewer_actor_id = excluded.reviewer_actor_id,
        reviewer_actor_display_label = excluded.reviewer_actor_display_label,
        updated_at = now()
      returning *
      `,
      [
        attempted.review_id,
        attempted.migration_id,
        attempted.item_key,
        attempted.fidelity_category,
        attempted.severity,
        attempted.status,
        attempted.blocks_acceptance,
        attempted.accepted_limitation,
        attempted.finding_summary,
        toPostgresValue(attempted.ref_ids_json),
        toPostgresValue(attempted.limitation_json),
        toPostgresValue(attempted.details_json),
        attempted.reviewer_actor_type,
        attempted.reviewer_actor_id,
        attempted.reviewer_actor_display_label,
        attempted.correlation_id,
        attempted.idempotency_key,
        attempted.privacy_label,
        attempted.retention_class,
        toPostgresValue(attempted.metadata_json),
      ],
    );
    return result.rows[0] as SingleSiteCloneReviewItemRow;
  }

  async listCloneReviewItems(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteCloneReviewItemRow[]> {
    const result = await client.query("select * from public.gnr8_single_site_clone_review_items where review_id = $1::uuid order by item_key asc", [requiredText("reviewId", reviewId)]);
    return result.rows as SingleSiteCloneReviewItemRow[];
  }

  async listCloneReviewRefs(client: SingleSitePgClient, reviewId: string): Promise<SingleSiteCloneReviewRefRow[]> {
    const result = await client.query("select * from public.gnr8_single_site_clone_review_refs where review_id = $1::uuid order by created_at asc, ref_role asc", [requiredText("reviewId", reviewId)]);
    return result.rows as SingleSiteCloneReviewRefRow[];
  }

  async insertCloneReviewEvent(client: SingleSitePgClient, input: InsertCloneReviewEventInput): Promise<{ row: SingleSiteCloneReviewEventRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      review_id: requiredText("reviewId", input.reviewId),
      migration_id: requiredText("migrationId", input.migrationId),
      event_index: optionalPositiveInteger("eventIndex", input.eventIndex),
      event_action: enumValue("eventAction", input.eventAction, SINGLE_SITE_CLONE_REVIEW_EVENT_ACTIONS),
      from_status: optionalEnumValue("fromStatus", input.fromStatus, SINGLE_SITE_CLONE_REVIEW_STATUSES),
      to_status: optionalEnumValue("toStatus", input.toStatus, SINGLE_SITE_CLONE_REVIEW_STATUSES),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      details_json: jsonObject("detailsJson", input.detailsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      blockers_json: jsonArray("blockersJson", input.blockersJson),
      source_watermark: optionalText(input.sourceWatermark),
      payload_hash: optionalText(input.payloadHash),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
      occurred_at: timestampText("occurredAt", input.occurredAt) ?? undefined,
    };
    return insertReturning<SingleSiteCloneReviewEventRow>(client, "gnr8_single_site_clone_review_events", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
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
        "payload_hash",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async nextCloneReviewEventIndex(client: SingleSitePgClient, reviewId: string): Promise<number> {
    const result = await client.query("select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_clone_review_events where review_id = $1::uuid", [requiredText("reviewId", reviewId)]);
    return Number(result.rows[0]?.event_index ?? 1);
  }

  async createImprovementProposalPlan(
    client: SingleSitePgClient,
    input: CreateImprovementProposalPlanInput,
  ): Promise<{ row: SingleSiteImprovementProposalPlanRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      tenant_id: requiredText("tenantId", input.tenantId),
      client_id: requiredText("clientId", input.clientId),
      site_id: requiredText("siteId", input.siteId),
      migration_id: requiredText("migrationId", input.migrationId),
      clone_review_id: requiredText("cloneReviewId", input.cloneReviewId),
      source_evidence_review_id: requiredText("sourceEvidenceReviewId", input.sourceEvidenceReviewId),
      clone_site_version_ref: requiredText("cloneSiteVersionRef", input.cloneSiteVersionRef),
      runtime_artifact_ref: requiredText("runtimeArtifactRef", input.runtimeArtifactRef),
      plan_status: optionalEnumValue("planStatus", input.planStatus, SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES) ?? "draft",
      plan_version: optionalPositiveInteger("planVersion", input.planVersion) ?? 1,
      proposal_scope_json: jsonObject("proposalScopeJson", input.proposalScopeJson),
      title: optionalText(input.title),
      summary: optionalText(input.summary),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      operator_notes_json: jsonArray("operatorNotesJson", input.operatorNotesJson),
      decision_summary_json: jsonObject("decisionSummaryJson", input.decisionSummaryJson),
      approval_refs_json: jsonObject("approvalRefsJson", input.approvalRefsJson),
      implementation_authorization_refs_json: jsonObject("implementationAuthorizationRefsJson", input.implementationAuthorizationRefsJson),
      implementation_authorization_attached: Boolean(input.implementationAuthorizationAttached ?? false),
      supersedes_plan_id: optionalText(input.supersedesPlanId),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      semantic_watermark: optionalText(input.semanticWatermark),
      payload_hash: optionalText(input.payloadHash),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteImprovementProposalPlanRow>(client, "gnr8_single_site_improvement_proposal_plans", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "tenant_id",
        "client_id",
        "site_id",
        "migration_id",
        "clone_review_id",
        "source_evidence_review_id",
        "clone_site_version_ref",
        "runtime_artifact_ref",
        "plan_status",
        "proposal_scope_json",
        "title",
        "summary",
        "limitations_json",
        "warnings_json",
        "operator_notes_json",
        "decision_summary_json",
        "approval_refs_json",
        "implementation_authorization_refs_json",
        "implementation_authorization_attached",
        "supersedes_plan_id",
        "actor_type",
        "actor_id",
        "actor_role",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "payload_hash",
        "metadata_json",
      ],
    });
  }

  async getImprovementProposalPlanById(client: SingleSitePgClient, planId: string): Promise<SingleSiteImprovementProposalPlanRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_improvement_proposal_plans where id = $1::uuid limit 1", [requiredText("planId", planId)]);
    return (result.rows[0] as SingleSiteImprovementProposalPlanRow | undefined) ?? null;
  }

  async getImprovementProposalPlanByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteImprovementProposalPlanRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_improvement_proposal_plans where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteImprovementProposalPlanRow | undefined) ?? null;
  }

  async getLatestImprovementProposalPlanForMigration(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteImprovementProposalPlanRow | null> {
    const result = await client.query(
      `
      select *
      from public.gnr8_single_site_improvement_proposal_plans
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [requiredText("migrationId", migrationId)],
    );
    return (result.rows[0] as SingleSiteImprovementProposalPlanRow | undefined) ?? null;
  }

  async getImprovementProposalPlanBySemanticRefs(
    client: SingleSitePgClient,
    input: Pick<CreateImprovementProposalPlanInput, "migrationId" | "cloneReviewId" | "cloneSiteVersionRef" | "runtimeArtifactRef">,
  ): Promise<SingleSiteImprovementProposalPlanRow | null> {
    const result = await client.query(
      `
      select *
      from public.gnr8_single_site_improvement_proposal_plans
      where migration_id = $1::uuid
        and clone_review_id = $2::uuid
        and clone_site_version_ref = $3
        and runtime_artifact_ref = $4
      order by created_at asc
      limit 1
      `,
      [
        requiredText("migrationId", input.migrationId),
        requiredText("cloneReviewId", input.cloneReviewId),
        requiredText("cloneSiteVersionRef", input.cloneSiteVersionRef),
        requiredText("runtimeArtifactRef", input.runtimeArtifactRef),
      ],
    );
    return (result.rows[0] as SingleSiteImprovementProposalPlanRow | undefined) ?? null;
  }

  async updateImprovementProposalPlanStatus(
    client: SingleSitePgClient,
    input: UpdateImprovementProposalPlanStatusInput,
  ): Promise<SingleSiteImprovementProposalPlanRow> {
    const actor = input.actor ?? null;
    const result = await client.query(
      `
      update public.gnr8_single_site_improvement_proposal_plans
      set
        plan_status = $2,
        plan_version = plan_version + 1,
        summary = coalesce($3, summary),
        limitations_json = coalesce($4::jsonb, limitations_json),
        warnings_json = coalesce($5::jsonb, warnings_json),
        decision_summary_json = coalesce($6::jsonb, decision_summary_json),
        approval_refs_json = coalesce($7::jsonb, approval_refs_json),
        implementation_authorization_refs_json = coalesce($8::jsonb, implementation_authorization_refs_json),
        implementation_authorization_attached = coalesce($9, implementation_authorization_attached),
        superseded_by_plan_id = coalesce($10::uuid, superseded_by_plan_id),
        actor_type = coalesce($11, actor_type),
        actor_id = coalesce($12, actor_id),
        actor_role = coalesce($13, actor_role),
        actor_display_label = coalesce($14, actor_display_label),
        reviewed_at = coalesce($15::timestamptz, reviewed_at),
        decided_at = coalesce($16::timestamptz, decided_at),
        updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        requiredText("planId", input.planId),
        enumValue("planStatus", input.planStatus, SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES),
        optionalText(input.summary),
        input.limitationsJson === undefined ? null : toPostgresValue(jsonArray("limitationsJson", input.limitationsJson)),
        input.warningsJson === undefined ? null : toPostgresValue(jsonArray("warningsJson", input.warningsJson)),
        input.decisionSummaryJson === undefined ? null : toPostgresValue(jsonObject("decisionSummaryJson", input.decisionSummaryJson)),
        input.approvalRefsJson === undefined ? null : toPostgresValue(jsonObject("approvalRefsJson", input.approvalRefsJson)),
        input.implementationAuthorizationRefsJson === undefined ? null : toPostgresValue(jsonObject("implementationAuthorizationRefsJson", input.implementationAuthorizationRefsJson)),
        input.implementationAuthorizationAttached ?? null,
        optionalText(input.supersededByPlanId),
        actor ? enumValue("actor.actorType", actor.actorType, SINGLE_SITE_ACTOR_TYPES) : null,
        actor ? requiredText("actor.actorId", actor.actorId) : null,
        actor ? requiredText("actor.actorRole", actor.actorRole) : null,
        actor ? optionalText(actor.actorDisplayLabel) : null,
        timestampText("reviewedAt", input.reviewedAt),
        timestampText("decidedAt", input.decidedAt),
      ],
    );
    const row = result.rows[0] as SingleSiteImprovementProposalPlanRow | undefined;
    if (!row) throw new SingleSiteStateWriterError("improvement proposal plan status update did not return a row");
    return row;
  }

  async insertImprovementProposalRef(
    client: SingleSitePgClient,
    input: InsertImprovementProposalRefInput,
  ): Promise<{ row: SingleSiteImprovementProposalRefRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      plan_id: requiredText("planId", input.planId),
      migration_id: requiredText("migrationId", input.migrationId),
      ref_role: enumValue("refRole", input.refRole, SINGLE_SITE_IMPROVEMENT_PROPOSAL_REF_ROLES),
      ref_type: requiredText("refType", input.refType),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      semantic_watermark: optionalText(input.semanticWatermark),
      content_hash: optionalText(input.contentHash),
      media_type: optionalText(input.mediaType),
      captured_at: timestampText("capturedAt", input.capturedAt),
      fresh_until: timestampText("freshUntil", input.freshUntil),
      evidence_only: input.evidenceOnly ?? true,
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteImprovementProposalRefRow>(client, "gnr8_single_site_improvement_proposal_refs", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "plan_id",
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
    });
  }

  async upsertImprovementProposalRecommendation(
    client: SingleSitePgClient,
    input: UpsertImprovementProposalRecommendationInput,
  ): Promise<SingleSiteImprovementProposalRecommendationRow> {
    const attempted: InsertableRow = {
      plan_id: requiredText("planId", input.planId),
      migration_id: requiredText("migrationId", input.migrationId),
      recommendation_key: requiredText("recommendationKey", input.recommendationKey),
      title: requiredText("title", input.title),
      target_scope: optionalEnumValue("targetScope", input.targetScope, SINGLE_SITE_IMPROVEMENT_PROPOSAL_TARGET_SCOPES) ?? "site",
      target_refs_json: jsonArray("targetRefsJson", input.targetRefsJson),
      category: enumValue("category", input.category, SINGLE_SITE_IMPROVEMENT_CATEGORIES),
      risk: optionalEnumValue("risk", input.risk, SINGLE_SITE_IMPROVEMENT_RISK_LEVELS) ?? "unknown",
      impact: optionalEnumValue("impact", input.impact, SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS) ?? "unknown",
      effort: optionalEnumValue("effort", input.effort, SINGLE_SITE_IMPROVEMENT_EFFORT_LEVELS) ?? "unknown",
      confidence: optionalEnumValue("confidence", input.confidence, SINGLE_SITE_IMPROVEMENT_CONFIDENCE_LEVELS) ?? "medium",
      priority: optionalEnumValue("priority", input.priority, SINGLE_SITE_IMPROVEMENT_PRIORITIES) ?? "p2",
      rationale: requiredText("rationale", input.rationale),
      expected_outcome: optionalText(input.expectedOutcome),
      implementation_notes: optionalText(input.implementationNotes),
      exclusions_json: jsonArray("exclusionsJson", input.exclusionsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      linked_finding_ids_json: jsonArray("linkedFindingIdsJson", input.linkedFindingIdsJson),
      source_ref_ids_json: jsonArray("sourceRefIdsJson", input.sourceRefIdsJson),
      advisory_ref_ids_json: jsonArray("advisoryRefIdsJson", input.advisoryRefIdsJson),
      recommendation_status: optionalEnumValue("recommendationStatus", input.recommendationStatus, SINGLE_SITE_IMPROVEMENT_PROPOSAL_RECOMMENDATION_STATUSES) ?? "draft",
      implementation_authorization_status: optionalEnumValue("implementationAuthorizationStatus", input.implementationAuthorizationStatus, SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_STATUSES) ?? "not_requested",
      blocks_proposal_approval: input.blocksProposalApproval ?? false,
      limitation_accepted: input.limitationAccepted ?? false,
      decision_json: jsonObject("decisionJson", input.decisionJson),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      semantic_watermark: optionalText(input.semanticWatermark),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };

    const existing = await client.query(
      "select * from public.gnr8_single_site_improvement_proposal_recommendations where idempotency_key = $1 limit 1",
      [attempted.idempotency_key],
    );
    const existingRow = existing.rows[0] as SingleSiteImprovementProposalRecommendationRow | undefined;
    if (existingRow) {
      assertSemanticMatch("gnr8_single_site_improvement_proposal_recommendations", String(attempted.idempotency_key), attempted, existingRow, [
        "plan_id",
        "migration_id",
        "recommendation_key",
        "title",
        "target_scope",
        "target_refs_json",
        "category",
        "risk",
        "impact",
        "effort",
        "confidence",
        "priority",
        "rationale",
        "expected_outcome",
        "implementation_notes",
        "exclusions_json",
        "limitations_json",
        "linked_finding_ids_json",
        "source_ref_ids_json",
        "advisory_ref_ids_json",
        "recommendation_status",
        "implementation_authorization_status",
        "blocks_proposal_approval",
        "limitation_accepted",
        "decision_json",
        "actor_type",
        "actor_id",
        "actor_role",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ]);
      return existingRow;
    }

    const result = await client.query(
      `
      insert into public.gnr8_single_site_improvement_proposal_recommendations (
        plan_id, migration_id, recommendation_key, title, target_scope, target_refs_json, category, risk, impact,
        effort, confidence, priority, rationale, expected_outcome, implementation_notes, exclusions_json,
        limitations_json, linked_finding_ids_json, source_ref_ids_json, advisory_ref_ids_json, recommendation_status,
        implementation_authorization_status, blocks_proposal_approval, limitation_accepted, decision_json,
        actor_type, actor_id, actor_role, actor_display_label, correlation_id, idempotency_key, privacy_label,
        retention_class, semantic_watermark, metadata_json
      )
      values (
        $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16::jsonb, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb, $21, $22, $23, $24, $25::jsonb,
        $26, $27, $28, $29, $30, $31, $32, $33, $34, $35::jsonb
      )
      on conflict (plan_id, recommendation_key) do update set
        title = excluded.title,
        target_scope = excluded.target_scope,
        target_refs_json = excluded.target_refs_json,
        category = excluded.category,
        risk = excluded.risk,
        impact = excluded.impact,
        effort = excluded.effort,
        confidence = excluded.confidence,
        priority = excluded.priority,
        rationale = excluded.rationale,
        expected_outcome = excluded.expected_outcome,
        implementation_notes = excluded.implementation_notes,
        exclusions_json = excluded.exclusions_json,
        limitations_json = excluded.limitations_json,
        linked_finding_ids_json = excluded.linked_finding_ids_json,
        source_ref_ids_json = excluded.source_ref_ids_json,
        advisory_ref_ids_json = excluded.advisory_ref_ids_json,
        recommendation_status = excluded.recommendation_status,
        implementation_authorization_status = excluded.implementation_authorization_status,
        blocks_proposal_approval = excluded.blocks_proposal_approval,
        limitation_accepted = excluded.limitation_accepted,
        decision_json = excluded.decision_json,
        actor_type = excluded.actor_type,
        actor_id = excluded.actor_id,
        actor_role = excluded.actor_role,
        actor_display_label = excluded.actor_display_label,
        semantic_watermark = excluded.semantic_watermark,
        metadata_json = excluded.metadata_json,
        updated_at = now()
      returning *
      `,
      [
        attempted.plan_id,
        attempted.migration_id,
        attempted.recommendation_key,
        attempted.title,
        attempted.target_scope,
        toPostgresValue(attempted.target_refs_json),
        attempted.category,
        attempted.risk,
        attempted.impact,
        attempted.effort,
        attempted.confidence,
        attempted.priority,
        attempted.rationale,
        attempted.expected_outcome,
        attempted.implementation_notes,
        toPostgresValue(attempted.exclusions_json),
        toPostgresValue(attempted.limitations_json),
        toPostgresValue(attempted.linked_finding_ids_json),
        toPostgresValue(attempted.source_ref_ids_json),
        toPostgresValue(attempted.advisory_ref_ids_json),
        attempted.recommendation_status,
        attempted.implementation_authorization_status,
        attempted.blocks_proposal_approval,
        attempted.limitation_accepted,
        toPostgresValue(attempted.decision_json),
        attempted.actor_type,
        attempted.actor_id,
        attempted.actor_role,
        attempted.actor_display_label,
        attempted.correlation_id,
        attempted.idempotency_key,
        attempted.privacy_label,
        attempted.retention_class,
        attempted.semantic_watermark,
        toPostgresValue(attempted.metadata_json),
      ],
    );
    return result.rows[0] as SingleSiteImprovementProposalRecommendationRow;
  }

  async upsertImprovementProposalFinding(
    client: SingleSitePgClient,
    input: UpsertImprovementProposalFindingInput,
  ): Promise<SingleSiteImprovementProposalFindingRow> {
    const attempted: InsertableRow = {
      plan_id: requiredText("planId", input.planId),
      migration_id: requiredText("migrationId", input.migrationId),
      finding_key: requiredText("findingKey", input.findingKey),
      category: enumValue("category", input.category, SINGLE_SITE_IMPROVEMENT_CATEGORIES),
      risk: optionalEnumValue("risk", input.risk, SINGLE_SITE_IMPROVEMENT_RISK_LEVELS) ?? "unknown",
      impact: optionalEnumValue("impact", input.impact, SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS) ?? "unknown",
      summary: requiredText("summary", input.summary),
      evidence_confidence: optionalEnumValue("evidenceConfidence", input.evidenceConfidence, SINGLE_SITE_IMPROVEMENT_CONFIDENCE_LEVELS) ?? "medium",
      finding_status: optionalEnumValue("findingStatus", input.findingStatus, SINGLE_SITE_IMPROVEMENT_PROPOSAL_FINDING_STATUSES) ?? "open",
      blocks_proposal_approval: input.blocksProposalApproval ?? false,
      accepted_limitation: input.acceptedLimitation ?? false,
      source_ref_ids_json: jsonArray("sourceRefIdsJson", input.sourceRefIdsJson),
      clone_fidelity_ref_ids_json: jsonArray("cloneFidelityRefIdsJson", input.cloneFidelityRefIdsJson),
      recommendation_ids_json: jsonArray("recommendationIdsJson", input.recommendationIdsJson),
      limitation_json: jsonObject("limitationJson", input.limitationJson),
      decision_json: jsonObject("decisionJson", input.decisionJson),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      semantic_watermark: optionalText(input.semanticWatermark),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };

    const existing = await client.query(
      "select * from public.gnr8_single_site_improvement_proposal_findings where idempotency_key = $1 limit 1",
      [attempted.idempotency_key],
    );
    const existingRow = existing.rows[0] as SingleSiteImprovementProposalFindingRow | undefined;
    if (existingRow) {
      assertSemanticMatch("gnr8_single_site_improvement_proposal_findings", String(attempted.idempotency_key), attempted, existingRow, [
        "plan_id",
        "migration_id",
        "finding_key",
        "category",
        "risk",
        "impact",
        "summary",
        "evidence_confidence",
        "finding_status",
        "blocks_proposal_approval",
        "accepted_limitation",
        "source_ref_ids_json",
        "clone_fidelity_ref_ids_json",
        "recommendation_ids_json",
        "limitation_json",
        "decision_json",
        "actor_type",
        "actor_id",
        "actor_role",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ]);
      return existingRow;
    }

    const result = await client.query(
      `
      insert into public.gnr8_single_site_improvement_proposal_findings (
        plan_id, migration_id, finding_key, category, risk, impact, summary, evidence_confidence, finding_status,
        blocks_proposal_approval, accepted_limitation, source_ref_ids_json, clone_fidelity_ref_ids_json,
        recommendation_ids_json, limitation_json, decision_json, actor_type, actor_id, actor_role,
        actor_display_label, correlation_id, idempotency_key, privacy_label, retention_class, semantic_watermark, metadata_json
      )
      values (
        $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb,
        $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26::jsonb
      )
      on conflict (plan_id, finding_key) do update set
        category = excluded.category,
        risk = excluded.risk,
        impact = excluded.impact,
        summary = excluded.summary,
        evidence_confidence = excluded.evidence_confidence,
        finding_status = excluded.finding_status,
        blocks_proposal_approval = excluded.blocks_proposal_approval,
        accepted_limitation = excluded.accepted_limitation,
        source_ref_ids_json = excluded.source_ref_ids_json,
        clone_fidelity_ref_ids_json = excluded.clone_fidelity_ref_ids_json,
        recommendation_ids_json = excluded.recommendation_ids_json,
        limitation_json = excluded.limitation_json,
        decision_json = excluded.decision_json,
        actor_type = excluded.actor_type,
        actor_id = excluded.actor_id,
        actor_role = excluded.actor_role,
        actor_display_label = excluded.actor_display_label,
        semantic_watermark = excluded.semantic_watermark,
        metadata_json = excluded.metadata_json,
        updated_at = now()
      returning *
      `,
      [
        attempted.plan_id,
        attempted.migration_id,
        attempted.finding_key,
        attempted.category,
        attempted.risk,
        attempted.impact,
        attempted.summary,
        attempted.evidence_confidence,
        attempted.finding_status,
        attempted.blocks_proposal_approval,
        attempted.accepted_limitation,
        toPostgresValue(attempted.source_ref_ids_json),
        toPostgresValue(attempted.clone_fidelity_ref_ids_json),
        toPostgresValue(attempted.recommendation_ids_json),
        toPostgresValue(attempted.limitation_json),
        toPostgresValue(attempted.decision_json),
        attempted.actor_type,
        attempted.actor_id,
        attempted.actor_role,
        attempted.actor_display_label,
        attempted.correlation_id,
        attempted.idempotency_key,
        attempted.privacy_label,
        attempted.retention_class,
        attempted.semantic_watermark,
        toPostgresValue(attempted.metadata_json),
      ],
    );
    return result.rows[0] as SingleSiteImprovementProposalFindingRow;
  }

  async listImprovementProposalRecommendations(client: SingleSitePgClient, planId: string): Promise<SingleSiteImprovementProposalRecommendationRow[]> {
    const result = await client.query(
      "select * from public.gnr8_single_site_improvement_proposal_recommendations where plan_id = $1::uuid order by recommendation_key asc",
      [requiredText("planId", planId)],
    );
    return result.rows as SingleSiteImprovementProposalRecommendationRow[];
  }

  async listImprovementProposalFindings(client: SingleSitePgClient, planId: string): Promise<SingleSiteImprovementProposalFindingRow[]> {
    const result = await client.query(
      "select * from public.gnr8_single_site_improvement_proposal_findings where plan_id = $1::uuid order by finding_key asc",
      [requiredText("planId", planId)],
    );
    return result.rows as SingleSiteImprovementProposalFindingRow[];
  }

  async listImprovementProposalRefs(client: SingleSitePgClient, planId: string): Promise<SingleSiteImprovementProposalRefRow[]> {
    const result = await client.query(
      "select * from public.gnr8_single_site_improvement_proposal_refs where plan_id = $1::uuid order by created_at asc, ref_role asc",
      [requiredText("planId", planId)],
    );
    return result.rows as SingleSiteImprovementProposalRefRow[];
  }

  async getImprovementProposalEventByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteImprovementProposalEventRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_improvement_proposal_events where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteImprovementProposalEventRow | undefined) ?? null;
  }

  async insertImprovementProposalEvent(
    client: SingleSitePgClient,
    input: InsertImprovementProposalEventInput,
  ): Promise<{ row: SingleSiteImprovementProposalEventRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      plan_id: requiredText("planId", input.planId),
      migration_id: requiredText("migrationId", input.migrationId),
      event_index: optionalPositiveInteger("eventIndex", input.eventIndex),
      event_action: enumValue("eventAction", input.eventAction, SINGLE_SITE_IMPROVEMENT_PROPOSAL_EVENT_ACTIONS),
      from_status: optionalEnumValue("fromStatus", input.fromStatus, SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES),
      to_status: optionalEnumValue("toStatus", input.toStatus, SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      details_json: jsonObject("detailsJson", input.detailsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      approval_refs_json: jsonObject("approvalRefsJson", input.approvalRefsJson),
      implementation_authorization_refs_json: jsonObject("implementationAuthorizationRefsJson", input.implementationAuthorizationRefsJson),
      source_watermark: optionalText(input.sourceWatermark),
      semantic_watermark: optionalText(input.semanticWatermark),
      payload_hash: optionalText(input.payloadHash),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
      occurred_at: timestampText("occurredAt", input.occurredAt) ?? undefined,
    };
    return insertReturning<SingleSiteImprovementProposalEventRow>(client, "gnr8_single_site_improvement_proposal_events", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "plan_id",
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
        "approval_refs_json",
        "implementation_authorization_refs_json",
        "source_watermark",
        "semantic_watermark",
        "payload_hash",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async nextImprovementProposalEventIndex(client: SingleSitePgClient, planId: string): Promise<number> {
    const result = await client.query(
      "select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_improvement_proposal_events where plan_id = $1::uuid",
      [requiredText("planId", planId)],
    );
    return Number(result.rows[0]?.event_index ?? 1);
  }

  async insertImprovementProposalSupersession(
    client: SingleSitePgClient,
    input: InsertImprovementProposalSupersessionInput,
  ): Promise<{ row: SingleSiteImprovementProposalSupersessionRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      migration_id: requiredText("migrationId", input.migrationId),
      superseded_plan_id: requiredText("supersededPlanId", input.supersededPlanId),
      replacement_plan_id: optionalText(input.replacementPlanId),
      supersession_reason: requiredText("supersessionReason", input.supersessionReason),
      source_ref_json: jsonObject("sourceRefJson", input.sourceRefJson),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      semantic_watermark: optionalText(input.semanticWatermark),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteImprovementProposalSupersessionRow>(client, "gnr8_single_site_improvement_proposal_supersessions", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "migration_id",
        "superseded_plan_id",
        "replacement_plan_id",
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
    });
  }

  async createImprovementExecutionAttempt(
    client: SingleSitePgClient,
    input: CreateImprovementExecutionAttemptInput,
  ): Promise<{ row: SingleSiteImprovementExecutionAttemptRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      tenant_id: requiredText("tenantId", input.tenantId),
      client_id: requiredText("clientId", input.clientId),
      site_id: requiredText("siteId", input.siteId),
      migration_id: requiredText("migrationId", input.migrationId),
      proposal_plan_id: requiredText("proposalPlanId", input.proposalPlanId),
      proposal_plan_version: optionalPositiveInteger("proposalPlanVersion", input.proposalPlanVersion),
      proposal_plan_semantic_watermark: requiredText("proposalPlanSemanticWatermark", input.proposalPlanSemanticWatermark),
      proposal_approval_request_id: optionalText(input.proposalApprovalRequestId),
      proposal_approval_decision_id: optionalText(input.proposalApprovalDecisionId),
      proposal_evidence_package_id: optionalText(input.proposalEvidencePackageId),
      implementation_authorization_request_id: requiredText("implementationAuthorizationRequestId", input.implementationAuthorizationRequestId),
      implementation_authorization_decision_id: requiredText("implementationAuthorizationDecisionId", input.implementationAuthorizationDecisionId),
      implementation_authorization_evidence_package_id: optionalText(input.implementationAuthorizationEvidencePackageId),
      aaf_validation_result_ref: optionalText(input.aafValidationResultRef),
      aaf_validation_evidence_ref: optionalText(input.aafValidationEvidenceRef),
      clone_review_id: requiredText("cloneReviewId", input.cloneReviewId),
      clone_site_version_ref: requiredText("cloneSiteVersionRef", input.cloneSiteVersionRef),
      clone_runtime_artifact_ref: requiredText("cloneRuntimeArtifactRef", input.cloneRuntimeArtifactRef),
      source_evidence_review_id: requiredText("sourceEvidenceReviewId", input.sourceEvidenceReviewId),
      selected_recommendation_refs_json: jsonArray("selectedRecommendationRefsJson", input.selectedRecommendationRefsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      execution_mode: optionalEnumValue("executionMode", input.executionMode, SINGLE_SITE_IMPROVEMENT_EXECUTION_MODES) ?? "dry_run",
      executor_id: optionalText(input.executorId),
      executor_name: optionalText(input.executorName),
      executor_version: optionalText(input.executorVersion),
      status: optionalEnumValue("status", input.status, SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES) ?? "draft",
      readiness_json: jsonObject("readinessJson", input.readinessJson),
      validation_summary_json: jsonObject("validationSummaryJson", input.validationSummaryJson),
      semantic_input_watermark: requiredText("semanticInputWatermark", input.semanticInputWatermark),
      semantic_output_watermark: optionalText(input.semanticOutputWatermark),
      improved_candidate_site_version_ref: optionalText(input.improvedCandidateSiteVersionRef),
      improved_runtime_artifact_ref: optionalText(input.improvedRuntimeArtifactRef),
      output_refs_json: jsonObject("outputRefsJson", input.outputRefsJson),
      failure_json: jsonObject("failureJson", input.failureJson),
      audit_refs_json: jsonObject("auditRefsJson", input.auditRefsJson),
      supersedes_attempt_id: optionalText(input.supersedesAttemptId),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      payload_hash: optionalText(input.payloadHash),
      metadata_json: jsonObject("metadataJson", {
        futureBoundaryFixture: false,
        runtimeMutationPerformed: false,
        ...(input.metadataJson ?? {}),
      }),
    };
    return insertReturning<SingleSiteImprovementExecutionAttemptRow>(client, "gnr8_single_site_improvement_execution_attempts", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "tenant_id",
        "client_id",
        "site_id",
        "migration_id",
        "proposal_plan_id",
        "proposal_plan_version",
        "proposal_plan_semantic_watermark",
        "proposal_approval_request_id",
        "proposal_approval_decision_id",
        "proposal_evidence_package_id",
        "implementation_authorization_request_id",
        "implementation_authorization_decision_id",
        "implementation_authorization_evidence_package_id",
        "clone_review_id",
        "clone_site_version_ref",
        "clone_runtime_artifact_ref",
        "source_evidence_review_id",
        "selected_recommendation_refs_json",
        "limitations_json",
        "execution_mode",
        "executor_id",
        "executor_name",
        "executor_version",
        "status",
        "readiness_json",
        "validation_summary_json",
        "semantic_input_watermark",
        "semantic_output_watermark",
        "improved_candidate_site_version_ref",
        "improved_runtime_artifact_ref",
        "output_refs_json",
        "failure_json",
        "audit_refs_json",
        "supersedes_attempt_id",
        "actor_type",
        "actor_id",
        "actor_role",
        "privacy_label",
        "retention_class",
        "payload_hash",
        "metadata_json",
      ],
    });
  }

  async getImprovementExecutionAttemptById(client: SingleSitePgClient, attemptId: string): Promise<SingleSiteImprovementExecutionAttemptRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_improvement_execution_attempts where id = $1::uuid limit 1", [requiredText("attemptId", attemptId)]);
    return (result.rows[0] as SingleSiteImprovementExecutionAttemptRow | undefined) ?? null;
  }

  async getLatestImprovementExecutionAttemptForMigration(client: SingleSitePgClient, migrationId: string): Promise<SingleSiteImprovementExecutionAttemptRow | null> {
    const result = await client.query(
      `
      select *
      from public.gnr8_single_site_improvement_execution_attempts
      where migration_id = $1::uuid
      order by updated_at desc, created_at desc
      limit 1
      `,
      [requiredText("migrationId", migrationId)],
    );
    return (result.rows[0] as SingleSiteImprovementExecutionAttemptRow | undefined) ?? null;
  }

  async getImprovementExecutionAttemptBySemanticRefs(
    client: SingleSitePgClient,
    input: Pick<CreateImprovementExecutionAttemptInput, "migrationId" | "proposalPlanId" | "implementationAuthorizationDecisionId" | "semanticInputWatermark">,
  ): Promise<SingleSiteImprovementExecutionAttemptRow | null> {
    const result = await client.query(
      `
      select *
      from public.gnr8_single_site_improvement_execution_attempts
      where migration_id = $1::uuid
        and proposal_plan_id = $2::uuid
        and implementation_authorization_decision_id = $3
        and semantic_input_watermark = $4
      order by created_at asc
      limit 1
      `,
      [
        requiredText("migrationId", input.migrationId),
        requiredText("proposalPlanId", input.proposalPlanId),
        requiredText("implementationAuthorizationDecisionId", input.implementationAuthorizationDecisionId),
        requiredText("semanticInputWatermark", input.semanticInputWatermark),
      ],
    );
    return (result.rows[0] as SingleSiteImprovementExecutionAttemptRow | undefined) ?? null;
  }

  async updateImprovementExecutionAttemptStatus(
    client: SingleSitePgClient,
    input: UpdateImprovementExecutionAttemptStatusInput,
  ): Promise<SingleSiteImprovementExecutionAttemptRow> {
    const actor = input.actor ?? null;
    const result = await client.query(
      `
      update public.gnr8_single_site_improvement_execution_attempts
      set
        status = $2,
        readiness_json = coalesce($3::jsonb, readiness_json),
        validation_summary_json = coalesce($4::jsonb, validation_summary_json),
        limitations_json = coalesce($5::jsonb, limitations_json),
        selected_recommendation_refs_json = coalesce($6::jsonb, selected_recommendation_refs_json),
        aaf_validation_result_ref = coalesce($7, aaf_validation_result_ref),
        aaf_validation_evidence_ref = coalesce($8, aaf_validation_evidence_ref),
        semantic_output_watermark = coalesce($9, semantic_output_watermark),
        improved_candidate_site_version_ref = coalesce($10, improved_candidate_site_version_ref),
        improved_runtime_artifact_ref = coalesce($11, improved_runtime_artifact_ref),
        output_refs_json = coalesce($12::jsonb, output_refs_json),
        failure_json = coalesce($13::jsonb, failure_json),
        audit_refs_json = coalesce($14::jsonb, audit_refs_json),
        superseded_by_attempt_id = coalesce($15::uuid, superseded_by_attempt_id),
        actor_type = coalesce($16, actor_type),
        actor_id = coalesce($17, actor_id),
        actor_role = coalesce($18, actor_role),
        actor_display_label = coalesce($19, actor_display_label),
        started_at = coalesce($20::timestamptz, started_at),
        completed_at = coalesce($21::timestamptz, completed_at),
        terminal_at = coalesce($22::timestamptz, terminal_at),
        updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        requiredText("attemptId", input.attemptId),
        enumValue("status", input.status, SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES),
        input.readinessJson === undefined ? null : toPostgresValue(jsonObject("readinessJson", input.readinessJson)),
        input.validationSummaryJson === undefined ? null : toPostgresValue(jsonObject("validationSummaryJson", input.validationSummaryJson)),
        input.limitationsJson === undefined ? null : toPostgresValue(jsonArray("limitationsJson", input.limitationsJson)),
        input.selectedRecommendationRefsJson === undefined ? null : toPostgresValue(jsonArray("selectedRecommendationRefsJson", input.selectedRecommendationRefsJson)),
        optionalText(input.aafValidationResultRef),
        optionalText(input.aafValidationEvidenceRef),
        optionalText(input.semanticOutputWatermark),
        optionalText(input.improvedCandidateSiteVersionRef),
        optionalText(input.improvedRuntimeArtifactRef),
        input.outputRefsJson === undefined ? null : toPostgresValue(jsonObject("outputRefsJson", input.outputRefsJson)),
        input.failureJson === undefined ? null : toPostgresValue(jsonObject("failureJson", input.failureJson)),
        input.auditRefsJson === undefined ? null : toPostgresValue(jsonObject("auditRefsJson", input.auditRefsJson)),
        optionalText(input.supersededByAttemptId),
        actor ? enumValue("actor.actorType", actor.actorType, SINGLE_SITE_ACTOR_TYPES) : null,
        actor ? requiredText("actor.actorId", actor.actorId) : null,
        actor ? requiredText("actor.actorRole", actor.actorRole) : null,
        actor ? optionalText(actor.actorDisplayLabel) : null,
        timestampText("startedAt", input.startedAt),
        timestampText("completedAt", input.completedAt),
        timestampText("terminalAt", input.terminalAt),
      ],
    );
    const row = result.rows[0] as SingleSiteImprovementExecutionAttemptRow | undefined;
    if (!row) throw new SingleSiteStateWriterError("improvement execution attempt status update did not return a row");
    return row;
  }

  async insertImprovementExecutionRef(
    client: SingleSitePgClient,
    input: InsertImprovementExecutionRefInput,
  ): Promise<{ row: SingleSiteImprovementExecutionRefRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      attempt_id: requiredText("attemptId", input.attemptId),
      migration_id: requiredText("migrationId", input.migrationId),
      ref_role: enumValue("refRole", input.refRole, SINGLE_SITE_IMPROVEMENT_EXECUTION_REF_ROLES),
      ref_type: requiredText("refType", input.refType),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      semantic_watermark: optionalText(input.semanticWatermark),
      content_hash: optionalText(input.contentHash),
      media_type: optionalText(input.mediaType),
      captured_at: timestampText("capturedAt", input.capturedAt),
      fresh_until: timestampText("freshUntil", input.freshUntil),
      evidence_only: input.evidenceOnly ?? true,
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning<SingleSiteImprovementExecutionRefRow>(client, "gnr8_single_site_improvement_execution_refs", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "attempt_id",
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
    });
  }

  async upsertImprovementExecutionItem(client: SingleSitePgClient, input: UpsertImprovementExecutionItemInput): Promise<SingleSiteImprovementExecutionItemRow> {
    const attempted: InsertableRow = {
      attempt_id: requiredText("attemptId", input.attemptId),
      migration_id: requiredText("migrationId", input.migrationId),
      item_type: enumValue("itemType", input.itemType, SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_TYPES),
      item_key: requiredText("itemKey", input.itemKey),
      recommendation_id: optionalText(input.recommendationId),
      status: optionalEnumValue("status", input.status, SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_STATUSES) ?? "open",
      details_json: jsonObject("detailsJson", input.detailsJson),
      refs_json: jsonArray("refsJson", input.refsJson),
      limitation_json: jsonObject("limitationJson", input.limitationJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      error_json: jsonObject("errorJson", input.errorJson),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      semantic_watermark: optionalText(input.semanticWatermark),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    const existing = await client.query(
      "select * from public.gnr8_single_site_improvement_execution_items where idempotency_key = $1 limit 1",
      [attempted.idempotency_key],
    );
    const existingRow = existing.rows[0] as SingleSiteImprovementExecutionItemRow | undefined;
    if (existingRow) {
      assertSemanticMatch("gnr8_single_site_improvement_execution_items", String(attempted.idempotency_key), attempted, existingRow, [
        "attempt_id",
        "migration_id",
        "item_type",
        "item_key",
        "recommendation_id",
        "status",
        "details_json",
        "refs_json",
        "limitation_json",
        "warnings_json",
        "error_json",
        "actor_type",
        "actor_id",
        "actor_role",
        "privacy_label",
        "retention_class",
        "semantic_watermark",
        "metadata_json",
      ]);
      return existingRow;
    }
    const result = await client.query(
      `
      insert into public.gnr8_single_site_improvement_execution_items (
        attempt_id, migration_id, item_type, item_key, recommendation_id, status, details_json, refs_json,
        limitation_json, warnings_json, error_json, actor_type, actor_id, actor_role, actor_display_label,
        correlation_id, idempotency_key, privacy_label, retention_class, semantic_watermark, metadata_json
      )
      values ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb)
      on conflict (attempt_id, item_type, item_key) do update set
        recommendation_id = excluded.recommendation_id,
        status = excluded.status,
        details_json = excluded.details_json,
        refs_json = excluded.refs_json,
        limitation_json = excluded.limitation_json,
        warnings_json = excluded.warnings_json,
        error_json = excluded.error_json,
        actor_type = excluded.actor_type,
        actor_id = excluded.actor_id,
        actor_role = excluded.actor_role,
        actor_display_label = excluded.actor_display_label,
        semantic_watermark = excluded.semantic_watermark,
        metadata_json = excluded.metadata_json,
        updated_at = now()
      returning *
      `,
      [
        attempted.attempt_id,
        attempted.migration_id,
        attempted.item_type,
        attempted.item_key,
        attempted.recommendation_id,
        attempted.status,
        toPostgresValue(attempted.details_json),
        toPostgresValue(attempted.refs_json),
        toPostgresValue(attempted.limitation_json),
        toPostgresValue(attempted.warnings_json),
        toPostgresValue(attempted.error_json),
        attempted.actor_type,
        attempted.actor_id,
        attempted.actor_role,
        attempted.actor_display_label,
        attempted.correlation_id,
        attempted.idempotency_key,
        attempted.privacy_label,
        attempted.retention_class,
        attempted.semantic_watermark,
        toPostgresValue(attempted.metadata_json),
      ],
    );
    return result.rows[0] as SingleSiteImprovementExecutionItemRow;
  }

  async listImprovementExecutionItems(client: SingleSitePgClient, attemptId: string): Promise<SingleSiteImprovementExecutionItemRow[]> {
    const result = await client.query(
      "select * from public.gnr8_single_site_improvement_execution_items where attempt_id = $1::uuid order by item_type asc, item_key asc",
      [requiredText("attemptId", attemptId)],
    );
    return result.rows as SingleSiteImprovementExecutionItemRow[];
  }

  async listImprovementExecutionRefs(client: SingleSitePgClient, attemptId: string): Promise<SingleSiteImprovementExecutionRefRow[]> {
    const result = await client.query(
      "select * from public.gnr8_single_site_improvement_execution_refs where attempt_id = $1::uuid order by created_at asc, ref_role asc",
      [requiredText("attemptId", attemptId)],
    );
    return result.rows as SingleSiteImprovementExecutionRefRow[];
  }

  async getImprovementExecutionEventByIdempotencyKey(client: SingleSitePgClient, idempotencyKey: string): Promise<SingleSiteImprovementExecutionEventRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_improvement_execution_events where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSiteImprovementExecutionEventRow | undefined) ?? null;
  }

  async insertImprovementExecutionEvent(
    client: SingleSitePgClient,
    input: InsertImprovementExecutionEventInput,
  ): Promise<{ row: SingleSiteImprovementExecutionEventRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      attempt_id: requiredText("attemptId", input.attemptId),
      migration_id: requiredText("migrationId", input.migrationId),
      event_index: optionalPositiveInteger("eventIndex", input.eventIndex),
      event_action: enumValue("eventAction", input.eventAction, SINGLE_SITE_IMPROVEMENT_EXECUTION_EVENT_ACTIONS),
      from_status: optionalEnumValue("fromStatus", input.fromStatus, SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES),
      to_status: optionalEnumValue("toStatus", input.toStatus, SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES),
      actor_type: enumValue("actor.actorType", input.actor.actorType, SINGLE_SITE_ACTOR_TYPES),
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      details_json: jsonObject("detailsJson", input.detailsJson),
      limitations_json: jsonArray("limitationsJson", input.limitationsJson),
      warnings_json: jsonArray("warningsJson", input.warningsJson),
      validation_summary_json: jsonObject("validationSummaryJson", input.validationSummaryJson),
      output_refs_json: jsonObject("outputRefsJson", input.outputRefsJson),
      failure_json: jsonObject("failureJson", input.failureJson),
      source_watermark: optionalText(input.sourceWatermark),
      semantic_watermark: optionalText(input.semanticWatermark),
      payload_hash: optionalText(input.payloadHash),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: optionalEnumValue("privacyLabel", input.privacyLabel, SINGLE_SITE_PRIVACY_LABELS) ?? "client_confidential",
      retention_class: optionalEnumValue("retentionClass", input.retentionClass, SINGLE_SITE_RETENTION_CLASSES) ?? "compliance_long",
      metadata_json: jsonObject("metadataJson", input.metadataJson),
      occurred_at: timestampText("occurredAt", input.occurredAt) ?? undefined,
    };
    return insertReturning<SingleSiteImprovementExecutionEventRow>(client, "gnr8_single_site_improvement_execution_events", row, {
      lookup: { idempotency_key: row.idempotency_key },
      idempotencyKey: String(row.idempotency_key),
      semanticFields: [
        "attempt_id",
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
        "validation_summary_json",
        "output_refs_json",
        "failure_json",
        "source_watermark",
        "semantic_watermark",
        "payload_hash",
        "privacy_label",
        "retention_class",
        "metadata_json",
      ],
    });
  }

  async nextImprovementExecutionEventIndex(client: SingleSitePgClient, attemptId: string): Promise<number> {
    const result = await client.query(
      "select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_improvement_execution_events where attempt_id = $1::uuid",
      [requiredText("attemptId", attemptId)],
    );
    return Number(result.rows[0]?.event_index ?? 1);
  }
}

const SINGLE_SITE_STATE_STAGE_VALUES = Object.values(SINGLE_SITE_STATE_STAGE) as SingleSiteMigrationStage[];
const SINGLE_SITE_CLONE_REVIEW_ITEM_STATUSES = ["open", "resolved", "accepted_limitation", "superseded"] as const;
const SINGLE_SITE_IMPROVEMENT_PROPOSAL_TARGET_SCOPES = ["site", "page", "section", "component", "content_slot", "metadata", "asset", "form", "analytics", "unknown"] as const;
const SINGLE_SITE_IMPROVEMENT_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
const SINGLE_SITE_IMPROVEMENT_PRIORITIES = ["p0", "p1", "p2", "p3"] as const;
const SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_STATUSES = ["not_requested", "requested", "authorized", "authorized_with_limitations", "rejected", "expired", "superseded"] as const;
const SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_STATUSES = ["open", "resolved", "accepted_limitation", "blocked", "failed", "superseded"] as const;
