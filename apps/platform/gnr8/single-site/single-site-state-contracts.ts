import "server-only";

export const SINGLE_SITE_MIGRATION_STATES = [
  "site_candidate_created",
  "source_capture_started",
  "source_capture_completed",
  "source_capture_failed",
  "source_evidence_review_required",
  "clone_generation_started",
  "clone_generation_completed",
  "clone_review_required",
  "clone_revision_required",
  "improvement_proposal_started",
  "improvement_proposal_ready",
  "improvement_proposal_approved",
  "improvement_proposal_rejected",
  "improvement_implementation_started",
  "improvement_implementation_completed",
  "improved_version_review_required",
  "improved_preview_ready",
  "content_review_required",
  "content_approved",
  "domain_readiness_required",
  "domain_readiness_ready",
  "subscription_required",
  "subscription_created",
  "hosting_entitlement_ready",
  "launch_approval_required",
  "publish_ready",
  "published",
  "rollback_available",
  "migration_closed_out",
  "migration_failed",
  "migration_cancelled",
] as const;

export const SINGLE_SITE_MIGRATION_STAGES = [
  "intake",
  "source_capture",
  "source_evidence_review",
  "clone",
  "proposal",
  "improvement_content",
  "domain_commercial_readiness",
  "launch_publish_recovery",
  "terminal",
] as const;

export const SINGLE_SITE_TERMINAL_STATES = ["migration_closed_out", "migration_failed", "migration_cancelled"] as const;

export const SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES = [
  "not_started",
  "ready_for_review",
  "review_in_progress",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
] as const;

export const SINGLE_SITE_CLONE_REVIEW_STATUSES = [
  "draft",
  "ready_for_review",
  "in_review",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
] as const;

export const SINGLE_SITE_CLONE_REVIEW_DECISIONS = [
  "accept",
  "accept_with_limitations",
  "retry_clone",
  "reject_clone",
  "supersede",
] as const;

export const SINGLE_SITE_CLONE_FIDELITY_SEVERITIES = ["p0_blocker", "p1_major", "p2_minor", "p3_note"] as const;

export const SINGLE_SITE_CLONE_FIDELITY_CATEGORIES = [
  "layout",
  "content",
  "image",
  "asset",
  "font",
  "color",
  "spacing",
  "responsive",
  "interaction",
  "seo_metadata",
  "accessibility",
  "performance",
  "unknown_or_manual",
] as const;

export const SINGLE_SITE_CLONE_REVIEW_REF_ROLES = [
  "runtime_site_version_clone",
  "runtime_artifact_clone",
  "source_evidence_review",
  "clone_generation_event",
  "clone_generation_ref",
  "source_evidence_ref",
  "screenshot",
  "dom",
  "asset",
  "fidelity_finding",
  "limitation",
  "external_reference",
] as const;

export const SINGLE_SITE_CLONE_REVIEW_EVENT_ACTIONS = [
  "created",
  "ref_added",
  "finding_added",
  "ready_for_review",
  "review_started",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
  "comment_added",
] as const;

export const SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES = [
  "not_started",
  "planning_required",
  "draft",
  "ready_for_review",
  "in_review",
  "changes_requested",
  "approved",
  "approved_with_limitations",
  "rejected",
  "superseded",
  "cancelled",
] as const;

export const SINGLE_SITE_IMPROVEMENT_CATEGORIES = [
  "content_clarity",
  "visual_design",
  "brand_consistency",
  "conversion",
  "seo",
  "aeo",
  "accessibility",
  "performance",
  "mobile_responsive",
  "information_architecture",
  "trust_credibility",
  "forms_and_leads",
  "analytics_measurement",
  "technical_cleanup",
  "legal_or_compliance",
  "unknown_or_manual",
] as const;

export const SINGLE_SITE_IMPROVEMENT_RISK_LEVELS = ["low", "medium", "high", "unknown"] as const;
export const SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS = ["low", "medium", "high", "unknown"] as const;
export const SINGLE_SITE_IMPROVEMENT_EFFORT_LEVELS = ["small", "medium", "large", "unknown"] as const;

export const SINGLE_SITE_IMPROVEMENT_PROPOSAL_REF_ROLES = [
  "clone_review",
  "clone_review_fidelity_finding",
  "runtime_site_version_clone",
  "runtime_artifact_clone",
  "source_evidence_review",
  "source_evidence_ref",
  "source_capture_ref",
  "business_context_ref",
  "website_understanding_ref",
  "visual_continuity_ref",
  "generated_proposal_artifact_ref",
  "generated_proposal_bundle_ref",
  "ai_provider_input_ref",
  "ai_provider_output_ref",
  "operator_note_ref",
  "proposal_approval_request",
  "proposal_approval_decision",
  "proposal_evidence_package",
  "implementation_authorization_request",
  "implementation_authorization_decision",
  "content_approval_ref",
  "launch_approval_ref",
  "external_reference",
] as const;

export const SINGLE_SITE_IMPROVEMENT_PROPOSAL_EVENT_ACTIONS = [
  "created",
  "recommendation_added",
  "finding_added",
  "ready_for_review",
  "review_started",
  "changes_requested",
  "approved",
  "approved_with_limitations",
  "rejected",
  "superseded",
  "cancelled",
  "implementation_authorization_attached",
] as const;

export const SINGLE_SITE_IMPROVEMENT_PROPOSAL_FINDING_STATUSES = [
  "open",
  "resolved_by_recommendation",
  "accepted_limitation",
  "deferred",
  "superseded",
] as const;

export const SINGLE_SITE_IMPROVEMENT_PROPOSAL_RECOMMENDATION_STATUSES = [
  "draft",
  "ready_for_review",
  "changes_requested",
  "approved",
  "approved_with_limitations",
  "rejected",
  "deferred",
  "superseded",
] as const;

export const SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES = [
  "draft",
  "blocked",
  "ready",
  "started",
  "completed",
  "completed_with_limitations",
  "failed",
  "retry_required",
  "superseded",
  "cancelled",
] as const;

export const SINGLE_SITE_IMPROVEMENT_EXECUTION_MODES = ["dry_run", "execute", "replay", "repair"] as const;

export const SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_TYPES = [
  "selected_recommendation",
  "limitation",
  "input_ref",
  "output_ref",
  "validation_ref",
  "warning",
  "error",
  "manual_note",
] as const;

export const SINGLE_SITE_IMPROVEMENT_EXECUTION_REF_ROLES = [
  "proposal_plan",
  "proposal_approval_request",
  "proposal_approval_decision",
  "proposal_evidence_package",
  "implementation_authorization_request",
  "implementation_authorization_decision",
  "implementation_authorization_evidence_package",
  "aaf_execution_validation_result",
  "aaf_execution_validation_evidence",
  "clone_review",
  "clone_site_version",
  "clone_runtime_artifact",
  "source_evidence_review",
  "selected_recommendation",
  "limitation",
  "input_ref",
  "output_ref",
  "validation_ref",
  "audit_event",
  "supersession",
  "external_reference",
] as const;

export const SINGLE_SITE_IMPROVEMENT_EXECUTION_EVENT_ACTIONS = [
  "created",
  "proposal_refs_attached",
  "implementation_authorization_refs_attached",
  "aaf_execution_validation_attached",
  "clone_source_refs_attached",
  "selected_recommendation_attached",
  "limitation_attached",
  "blocked",
  "ready",
  "started",
  "completed",
  "completed_with_limitations",
  "failed",
  "retry_required",
  "cancelled",
  "superseded",
] as const;

export const SINGLE_SITE_IMPROVED_VERSION_REVIEW_STATUSES = [
  "draft",
  "ready_for_review",
  "in_review",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
  "cancelled",
] as const;

export const SINGLE_SITE_IMPROVED_VERSION_REVIEW_DECISIONS = [
  "accept",
  "accept_with_limitations",
  "retry_improvement",
  "reject_improved_version",
  "supersede",
  "cancel",
] as const;

export const SINGLE_SITE_IMPROVED_VERSION_REVIEW_SEVERITIES = ["p0_blocker", "p1_major", "p2_minor", "p3_note"] as const;

export const SINGLE_SITE_IMPROVED_VERSION_REVIEW_CATEGORIES = [
  "proposal_alignment",
  "content_accuracy",
  "visual_quality",
  "brand_consistency",
  "seo",
  "aeo",
  "accessibility",
  "performance",
  "responsive",
  "interaction",
  "technical_integrity",
  "limitation",
  "manual_note",
  "unknown_or_manual",
] as const;

export const SINGLE_SITE_IMPROVED_VERSION_REVIEW_REF_ROLES = [
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
  "dry_run_planned_change_set",
  "source_evidence_review",
  "limitation",
  "evidence",
  "external_reference",
] as const;

export const SINGLE_SITE_IMPROVED_VERSION_REVIEW_EVENT_ACTIONS = [
  "created",
  "ref_added",
  "finding_added",
  "ready_for_review",
  "review_started",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "cancelled",
  "superseded",
] as const;

export const SINGLE_SITE_SOURCE_EVIDENCE_COMPLETENESS_STATUSES = [
  "unknown",
  "complete",
  "complete_with_warnings",
  "degraded",
  "missing_required_evidence",
  "unusable",
] as const;

export const SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_DECISIONS = [
  "accept",
  "accept_with_limitations",
  "retry_capture",
  "reject_source",
  "supersede",
] as const;

export const SINGLE_SITE_EVIDENCE_ITEM_CATEGORIES = [
  "source_url",
  "page",
  "screenshot",
  "dom",
  "text",
  "image",
  "asset",
  "font",
  "visual_identity",
  "metadata",
  "structured_data",
  "external_ref",
  "limitation",
  "missing_evidence",
] as const;

export const SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES = [
  "source_url",
  "page",
  "screenshot",
  "dom",
  "text",
  "image",
  "asset",
  "font",
  "visual_identity",
  "metadata",
] as const;

export const SINGLE_SITE_EVIDENCE_ITEM_STATUSES = [
  "present",
  "present_with_warnings",
  "missing",
  "degraded",
  "not_applicable",
  "unverified",
] as const;

export const SINGLE_SITE_REVIEW_EVENT_ACTIONS = [
  "created",
  "item_added",
  "ready_for_review",
  "review_started",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
  "comment_added",
] as const;

export const SINGLE_SITE_ACTOR_TYPES = ["human", "system", "provider", "external_reference", "ai_advisory"] as const;

export const SINGLE_SITE_PRIVACY_LABELS = [
  "public_operational",
  "internal_operational",
  "client_confidential",
  "credential_sensitive",
  "billing_sensitive",
  "provider_sensitive",
  "legal_sensitive",
] as const;

export const SINGLE_SITE_RETENTION_CLASSES = [
  "short_operational",
  "mvp_operational",
  "security",
  "compliance_long",
  "legal_hold",
] as const;

export const SINGLE_SITE_SEVERITY_LEVELS = ["p0", "p1", "p2", "p3", "info"] as const;

export const SINGLE_SITE_BLOCKER_STATUSES = ["open", "resolved", "superseded", "accepted_risk", "cancelled"] as const;

export const SINGLE_SITE_BLOCKER_TYPES = [
  "intake_missing_client",
  "source_capture_failed",
  "source_evidence_missing",
  "source_evidence_degraded",
  "clone_fidelity_gap",
  "clone_revision_required",
  "proposal_approval_needed",
  "content_approval_needed",
  "domain_readiness_missing",
  "domain_readiness_stale",
  "subscription_missing",
  "hosting_entitlement_missing",
  "launch_approval_missing",
  "publish_activation_approval_missing",
  "rollback_evidence_missing",
  "audit_evidence_gap",
  "closeout_required",
] as const;

export const SINGLE_SITE_MIGRATION_REF_ROLES = [
  "ownership_site",
  "runtime_site",
  "runtime_site_version_clone",
  "runtime_site_version_improved",
  "runtime_artifact_clone",
  "runtime_artifact_improved",
  "raw_template_artifact",
  "content_slot",
  "content_override",
  "capture_run",
  "render_job",
  "source_evidence_package",
  "source_evidence_review",
  "clone_review",
  "clone_revision",
  "proposal_artifact",
  "proposal_approval",
  "implementation_execution_attempt",
  "improved_version_review",
  "content_approval",
  "domain_binding",
  "ddom_readiness_snapshot",
  "publish_target",
  "pasr_shadow_result",
  "subscription",
  "hosting_entitlement",
  "billing_account",
  "cost_center",
  "stripe_customer",
  "stripe_subscription",
  "publish_event",
  "active_pointer",
  "rollback_target",
  "closeout",
  "aaf_evidence_package",
  "aaf_approval_request",
  "aaf_approval_decision",
  "aaf_policy_evaluation",
  "aaf_audit_event",
  "external_reference",
] as const;

export const SINGLE_SITE_SOURCE_EVIDENCE_REF_ROLES = [
  "capture_run",
  "render_job",
  "source_url",
  "canonical_source_url",
  "page",
  "route_map",
  "screenshot",
  "dom",
  "rendered_dom",
  "raw_html",
  "source_snapshot",
  "text",
  "text_extract",
  "image",
  "image_asset",
  "asset",
  "asset_manifest",
  "font",
  "font_ref",
  "stylesheet_ref",
  "layout_geometry",
  "navigation_tree",
  "section_boundary",
  "visual_identity",
  "cgp_signal",
  "metadata",
  "seo_metadata",
  "structured_data",
  "diagnostic",
  "limitation",
  "missing_evidence",
  "source_evidence_package",
  "aaf_evidence_package",
  "aaf_audit_event",
  "external_ref",
  "external_reference",
] as const;

export const SINGLE_SITE_STAGE_SUMMARY_STATUSES = [
  "not_started",
  "in_progress",
  "ready_for_review",
  "accepted",
  "accepted_with_limitations",
  "blocked",
  "failed",
  "cancelled",
  "completed",
  "superseded",
] as const;

export const SINGLE_SITE_CLOSEOUT_STATUSES = ["draft", "completed", "superseded", "invalid"] as const;

export const SINGLE_SITE_CLOSEOUT_OUTCOMES = [
  "published_success",
  "published_with_limitations",
  "no_go",
  "cancelled",
  "failed",
  "internal_rehearsal_only",
] as const;

export type SingleSiteMigrationState = (typeof SINGLE_SITE_MIGRATION_STATES)[number];
export type SingleSiteMigrationStage = (typeof SINGLE_SITE_MIGRATION_STAGES)[number];
export type SingleSiteTerminalState = (typeof SINGLE_SITE_TERMINAL_STATES)[number];
export type SingleSiteSourceEvidenceReviewStatus = (typeof SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES)[number];
export type SingleSiteCloneReviewStatus = (typeof SINGLE_SITE_CLONE_REVIEW_STATUSES)[number];
export type SingleSiteCloneReviewDecision = (typeof SINGLE_SITE_CLONE_REVIEW_DECISIONS)[number];
export type SingleSiteCloneFidelitySeverity = (typeof SINGLE_SITE_CLONE_FIDELITY_SEVERITIES)[number];
export type SingleSiteCloneFidelityCategory = (typeof SINGLE_SITE_CLONE_FIDELITY_CATEGORIES)[number];
export type SingleSiteCloneReviewRefRole = (typeof SINGLE_SITE_CLONE_REVIEW_REF_ROLES)[number];
export type SingleSiteCloneReviewEventAction = (typeof SINGLE_SITE_CLONE_REVIEW_EVENT_ACTIONS)[number];
export type SingleSiteImprovementProposalPlanStatus = (typeof SINGLE_SITE_IMPROVEMENT_PROPOSAL_PLAN_STATUSES)[number];
export type SingleSiteImprovementCategory = (typeof SINGLE_SITE_IMPROVEMENT_CATEGORIES)[number];
export type SingleSiteImprovementRiskLevel = (typeof SINGLE_SITE_IMPROVEMENT_RISK_LEVELS)[number];
export type SingleSiteImprovementImpactLevel = (typeof SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS)[number];
export type SingleSiteImprovementEffortLevel = (typeof SINGLE_SITE_IMPROVEMENT_EFFORT_LEVELS)[number];
export type SingleSiteImprovementProposalRefRole = (typeof SINGLE_SITE_IMPROVEMENT_PROPOSAL_REF_ROLES)[number];
export type SingleSiteImprovementProposalEventAction = (typeof SINGLE_SITE_IMPROVEMENT_PROPOSAL_EVENT_ACTIONS)[number];
export type SingleSiteImprovementProposalFindingStatus = (typeof SINGLE_SITE_IMPROVEMENT_PROPOSAL_FINDING_STATUSES)[number];
export type SingleSiteImprovementProposalRecommendationStatus = (typeof SINGLE_SITE_IMPROVEMENT_PROPOSAL_RECOMMENDATION_STATUSES)[number];
export type SingleSiteImprovementExecutionStatus = (typeof SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES)[number];
export type SingleSiteImprovementExecutionMode = (typeof SINGLE_SITE_IMPROVEMENT_EXECUTION_MODES)[number];
export type SingleSiteImprovementExecutionItemType = (typeof SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_TYPES)[number];
export type SingleSiteImprovementExecutionRefRole = (typeof SINGLE_SITE_IMPROVEMENT_EXECUTION_REF_ROLES)[number];
export type SingleSiteImprovementExecutionEventAction = (typeof SINGLE_SITE_IMPROVEMENT_EXECUTION_EVENT_ACTIONS)[number];
export type SingleSiteImprovedVersionReviewStatus = (typeof SINGLE_SITE_IMPROVED_VERSION_REVIEW_STATUSES)[number];
export type SingleSiteImprovedVersionReviewDecision = (typeof SINGLE_SITE_IMPROVED_VERSION_REVIEW_DECISIONS)[number];
export type SingleSiteImprovedVersionReviewSeverity = (typeof SINGLE_SITE_IMPROVED_VERSION_REVIEW_SEVERITIES)[number];
export type SingleSiteImprovedVersionReviewCategory = (typeof SINGLE_SITE_IMPROVED_VERSION_REVIEW_CATEGORIES)[number];
export type SingleSiteImprovedVersionReviewRefRole = (typeof SINGLE_SITE_IMPROVED_VERSION_REVIEW_REF_ROLES)[number];
export type SingleSiteImprovedVersionReviewEventAction = (typeof SINGLE_SITE_IMPROVED_VERSION_REVIEW_EVENT_ACTIONS)[number];
export type SingleSiteSourceEvidenceCompletenessStatus = (typeof SINGLE_SITE_SOURCE_EVIDENCE_COMPLETENESS_STATUSES)[number];
export type SingleSiteSourceEvidenceReviewDecision = (typeof SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_DECISIONS)[number];
export type SingleSiteEvidenceItemCategory = (typeof SINGLE_SITE_EVIDENCE_ITEM_CATEGORIES)[number];
export type SingleSiteEvidenceItemStatus = (typeof SINGLE_SITE_EVIDENCE_ITEM_STATUSES)[number];
export type SingleSiteReviewEventAction = (typeof SINGLE_SITE_REVIEW_EVENT_ACTIONS)[number];
export type SingleSiteActorType = (typeof SINGLE_SITE_ACTOR_TYPES)[number];
export type SingleSitePrivacyLabel = (typeof SINGLE_SITE_PRIVACY_LABELS)[number];
export type SingleSiteRetentionClass = (typeof SINGLE_SITE_RETENTION_CLASSES)[number];
export type SingleSiteSeverityLevel = (typeof SINGLE_SITE_SEVERITY_LEVELS)[number];
export type SingleSiteBlockerStatus = (typeof SINGLE_SITE_BLOCKER_STATUSES)[number];
export type SingleSiteBlockerType = (typeof SINGLE_SITE_BLOCKER_TYPES)[number];
export type SingleSiteMigrationRefRole = (typeof SINGLE_SITE_MIGRATION_REF_ROLES)[number];
export type SingleSiteSourceEvidenceRefRole = (typeof SINGLE_SITE_SOURCE_EVIDENCE_REF_ROLES)[number];
export type SingleSiteStageSummaryStatus = (typeof SINGLE_SITE_STAGE_SUMMARY_STATUSES)[number];
export type SingleSiteCloseoutStatus = (typeof SINGLE_SITE_CLOSEOUT_STATUSES)[number];
export type SingleSiteCloseoutOutcome = (typeof SINGLE_SITE_CLOSEOUT_OUTCOMES)[number];
export type SingleSiteJsonObject = Record<string, unknown>;

export const SINGLE_SITE_STATE_STAGE: Record<SingleSiteMigrationState, SingleSiteMigrationStage> = {
  site_candidate_created: "intake",
  source_capture_started: "source_capture",
  source_capture_completed: "source_capture",
  source_capture_failed: "source_capture",
  source_evidence_review_required: "source_evidence_review",
  clone_generation_started: "clone",
  clone_generation_completed: "clone",
  clone_review_required: "clone",
  clone_revision_required: "clone",
  improvement_proposal_started: "proposal",
  improvement_proposal_ready: "proposal",
  improvement_proposal_approved: "proposal",
  improvement_proposal_rejected: "proposal",
  improvement_implementation_started: "improvement_content",
  improvement_implementation_completed: "improvement_content",
  improved_version_review_required: "improvement_content",
  improved_preview_ready: "improvement_content",
  content_review_required: "improvement_content",
  content_approved: "improvement_content",
  domain_readiness_required: "domain_commercial_readiness",
  domain_readiness_ready: "domain_commercial_readiness",
  subscription_required: "domain_commercial_readiness",
  subscription_created: "domain_commercial_readiness",
  hosting_entitlement_ready: "domain_commercial_readiness",
  launch_approval_required: "launch_publish_recovery",
  publish_ready: "launch_publish_recovery",
  published: "launch_publish_recovery",
  rollback_available: "launch_publish_recovery",
  migration_closed_out: "terminal",
  migration_failed: "terminal",
  migration_cancelled: "terminal",
};

export type SingleSiteTransitionResult = {
  migrationId: string;
  stateEventId: string;
  fromState: SingleSiteMigrationState;
  toState: SingleSiteMigrationState;
  fromStage: SingleSiteMigrationStage;
  toStage: SingleSiteMigrationStage;
  stateVersion: number;
  reusedExisting: boolean;
};

export class SingleSiteStateWriterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SingleSiteStateWriterError";
  }
}

export class SingleSiteStateValidationError extends SingleSiteStateWriterError {
  constructor(message: string) {
    super(message);
    this.name = "SingleSiteStateValidationError";
  }
}

export class SingleSiteTransitionError extends SingleSiteStateWriterError {
  constructor(
    message: string,
    readonly missingRequirements: readonly string[] = [],
  ) {
    super(message);
    this.name = "SingleSiteTransitionError";
  }
}

export class SingleSiteIdempotencyConflictError extends SingleSiteStateWriterError {
  constructor(
    readonly tableName: string,
    readonly idempotencyKey: string,
    readonly driftedFields: readonly string[],
  ) {
    super(`Single-site idempotency conflict in ${tableName} for key ${idempotencyKey}: semantic payload drift in ${driftedFields.join(", ")}`);
    this.name = "SingleSiteIdempotencyConflictError";
  }
}

export function isSingleSiteTerminalState(state: SingleSiteMigrationState): state is SingleSiteTerminalState {
  return (SINGLE_SITE_TERMINAL_STATES as readonly string[]).includes(state);
}
