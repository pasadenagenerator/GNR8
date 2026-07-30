import "server-only";

import {
  SINGLE_SITE_CLONE_FIDELITY_CATEGORIES,
  SINGLE_SITE_CLONE_FIDELITY_SEVERITIES,
  SINGLE_SITE_IMPROVEMENT_CATEGORIES,
  SINGLE_SITE_IMPROVEMENT_EFFORT_LEVELS,
  SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS,
  SINGLE_SITE_IMPROVEMENT_RISK_LEVELS,
  SINGLE_SITE_MIGRATION_STAGES,
  SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES,
  SINGLE_SITE_STATE_STAGE,
  isSingleSiteTerminalState,
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
  type SingleSiteImprovementImpactLevel,
  type SingleSiteImprovementProposalPlanStatus,
  type SingleSiteImprovementRiskLevel,
  type SingleSiteJsonObject,
  type SingleSiteMigrationRefRole,
  type SingleSiteMigrationStage,
  type SingleSiteMigrationState,
  type SingleSiteReviewEventAction,
  type SingleSiteSeverityLevel,
  type SingleSiteSourceEvidenceCompletenessStatus,
  type SingleSiteSourceEvidenceRefRole,
  type SingleSiteSourceEvidenceReviewDecision,
  type SingleSiteSourceEvidenceReviewStatus,
  type SingleSiteStageSummaryStatus,
} from "./single-site-state-contracts";
import type {
  SingleSiteCloneReviewEventRow,
  SingleSiteCloneReviewItemRow,
  SingleSiteCloneReviewRefRow,
  SingleSiteCloneReviewRow,
  SingleSiteEvidenceItemRow,
  SingleSiteImprovementProposalFindingRow,
  SingleSiteImprovementProposalPlanRow,
  SingleSiteImprovementProposalRecommendationRow,
  SingleSiteImprovementProposalRefRow,
  SingleSiteMigrationRefRow,
  SingleSiteMigrationRow,
  SingleSiteReviewEventRow,
  SingleSiteSourceEvidenceReviewRow,
  SingleSiteStateEventRow,
} from "./single-site-state-writer-repository";

export const SINGLE_SITE_STATE_READ_MODEL_VERSION = "mvp-7-single-site-state-read-model:v1" as const;

export const SINGLE_SITE_RECOMMENDED_NEXT_ACTIONS = [
  "start_capture",
  "review_source_evidence",
  "retry_capture",
  "accept_source_evidence",
  "start_clone_generation",
  "review_clone",
  "complete_clone_review",
  "review_clone_fidelity",
  "retry_clone_generation",
  "resolve_clone_blockers",
  "review_latest_clone",
  "start_improvement_proposal_planning",
  "complete_proposal_draft",
  "review_improvement_proposal",
  "complete_proposal_review",
  "revise_improvement_proposal",
  "request_implementation_authorization",
  "request_implementation_authorization_with_limitations",
  "resolve_or_cancel_proposal",
  "review_latest_proposal",
  "prepare_improvement_proposal_with_limitations",
  "request_clone_revision",
  "prepare_improvement_proposal",
  "approve_or_reject_proposal",
  "implement_improvements",
  "review_improved_preview",
  "prepare_domain_readiness",
  "prepare_subscription_hosting",
  "request_launch_approval",
  "prepare_publish",
  "verify_published_site",
  "confirm_rollback_readiness",
  "close_out_migration",
  "investigate_blocker",
  "no_action_required",
] as const;

export type SingleSiteRecommendedNextActionKey = (typeof SINGLE_SITE_RECOMMENDED_NEXT_ACTIONS)[number];
export type SingleSiteProjectionFreshness = "fresh" | "stale" | "partially_stale" | "unknown";
export type SingleSiteMigrationLifecycle = "active" | "closed_out" | "failed" | "cancelled";
export type SingleSiteBlockerSeverity = SingleSiteSeverityLevel | "none";

export type SingleSiteReadModelBoundaryFlags = {
  derivedOnly: true;
  sourceTruth: "gnr8_single_site_state_spine";
  mutatesSourceTruth: false;
  nonEnforcing: true;
};

export type SingleSiteRawStageSummaryRow = {
  id: string;
  migration_id: string;
  stage: SingleSiteMigrationStage;
  status: SingleSiteStageSummaryStatus;
  projection_kind: "state_writer_cache";
  started_at: string | null;
  completed_at: string | null;
  latest_state_event_id: string | null;
  latest_evidence_ref_id: string | null;
  latest_approval_ref_id: string | null;
  summary_json: unknown;
  limitations_json: unknown;
  warnings_json: unknown;
  blockers_json: unknown;
  blocker_count: number;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: string;
  retention_class: string;
  created_at: string;
  updated_at: string;
};

export type SingleSiteRawBlockerRow = {
  id: string;
  migration_id: string;
  state_event_id: string | null;
  blocker_key: string;
  blocker_type: SingleSiteBlockerType;
  severity: SingleSiteSeverityLevel;
  status: SingleSiteBlockerStatus;
  owner_role: string | null;
  opened_at: string;
  resolved_at: string | null;
  resolution_state_event_id: string | null;
  resolution_aaf_audit_event_id: string | null;
  resolution_aaf_approval_decision_id: string | null;
  source_ref_json: unknown;
  details_json: unknown;
  ops_inbox_projection_key: string | null;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: string;
  retention_class: string;
  created_at: string;
  updated_at: string;
};

export type SingleSiteRawCloseoutRow = {
  id: string;
  migration_id: string;
  status: SingleSiteCloseoutStatus;
  final_url: string | null;
  outcome: SingleSiteCloseoutOutcome;
  validation_site_number: number | null;
  metrics_json: unknown;
  issue_taxonomy_json: unknown;
  evidence_summary_json: unknown;
  exceptions_json: unknown;
  lessons_json: unknown;
  closeout_refs_json: unknown;
  supersedes_closeout_id: string | null;
  superseded_by_closeout_id: string | null;
  aaf_evidence_package_id: string | null;
  aaf_approval_decision_id: string | null;
  aaf_audit_event_id: string | null;
  closed_by_actor_type: string;
  closed_by_actor_id: string;
  closed_by_actor_display_label: string | null;
  closed_at: string;
  correlation_id: string;
  idempotency_key: string;
  privacy_label: string;
  retention_class: string;
  metadata_json: unknown;
  created_at: string;
};

export type SingleSiteRawSourceEvidenceRefRow = {
  id: string;
  review_id: string;
  migration_id: string;
  ref_role: SingleSiteSourceEvidenceRefRole;
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
  privacy_label: string;
  retention_class: string;
  correlation_id: string;
  idempotency_key: string;
  metadata_json: unknown;
  created_at: string;
};

export type SingleSiteMigrationReadRepositorySnapshot = {
  capturedAt: string;
  migration: SingleSiteMigrationRow;
  stateEvents: SingleSiteStateEventRow[];
  refs: SingleSiteMigrationRefRow[];
  stageSummaries: SingleSiteRawStageSummaryRow[];
  blockers: SingleSiteRawBlockerRow[];
  closeout: SingleSiteRawCloseoutRow | null;
  sourceEvidenceReviews: SingleSiteSourceEvidenceReviewRow[];
  latestSourceEvidenceReview: SingleSiteSourceEvidenceReviewRow | null;
  sourceEvidenceItems: SingleSiteEvidenceItemRow[];
  sourceEvidenceRefs: SingleSiteRawSourceEvidenceRefRow[];
  sourceEvidenceEvents: SingleSiteReviewEventRow[];
  cloneReviews: SingleSiteCloneReviewRow[];
  latestCloneReview: SingleSiteCloneReviewRow | null;
  cloneReviewItems: SingleSiteCloneReviewItemRow[];
  cloneReviewRefs: SingleSiteCloneReviewRefRow[];
  cloneReviewEvents: SingleSiteCloneReviewEventRow[];
  improvementProposalPlans?: SingleSiteImprovementProposalPlanRow[];
  latestImprovementProposalPlan?: SingleSiteImprovementProposalPlanRow | null;
  improvementProposalRecommendations?: SingleSiteImprovementProposalRecommendationRow[];
  improvementProposalFindings?: SingleSiteImprovementProposalFindingRow[];
  improvementProposalRefs?: SingleSiteImprovementProposalRefRow[];
};

export type SingleSiteMigrationSummary = {
  migrationId: string;
  tenantId: string;
  clientId: string;
  siteId: string | null;
  ownershipSiteId: string | null;
  runtimeSiteId: string | null;
  sourceUrl: string;
  canonicalSourceUrl: string | null;
  intendedLaunchDomain: string | null;
  validationSiteNumber: number | null;
  operatorOwnerActorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SingleSiteCurrentStateSummary = {
  state: SingleSiteMigrationState;
  stage: SingleSiteMigrationStage;
  stateVersion: number;
  lifecycle: SingleSiteMigrationLifecycle;
  active: boolean;
  terminal: boolean;
  failed: boolean;
  cancelled: boolean;
  closedOut: boolean;
  terminalAt: string | null;
};

export type SingleSiteStageSummary = {
  stage: SingleSiteMigrationStage;
  status: SingleSiteStageSummaryStatus | "missing";
  current: boolean;
  startedAt: string | null;
  completedAt: string | null;
  latestStateEventId: string | null;
  blockerCount: number;
  stale: boolean;
  limitations: unknown[];
  warnings: unknown[];
  blockers: unknown[];
  summary: SingleSiteJsonObject;
};

export type SingleSiteStateHistoryItem = {
  id: string;
  eventIndex: number;
  fromState: SingleSiteMigrationState | null;
  toState: SingleSiteMigrationState;
  fromStage: SingleSiteMigrationStage | null;
  toStage: SingleSiteMigrationStage;
  transitionKey: string;
  transitionReason: string | null;
  missingRequirements: unknown[];
  actorType: string;
  actorId: string;
  actorRole: string;
  occurredAt: string;
  sourceWatermark: string | null;
  payloadHash: string | null;
};

export type SingleSiteSourceEvidenceReviewSummary = {
  reviewId: string | null;
  reviewCount: number;
  reviewStatus: SingleSiteSourceEvidenceReviewStatus | "missing";
  reviewDecision: SingleSiteSourceEvidenceReviewDecision | null;
  completenessStatus: SingleSiteSourceEvidenceCompletenessStatus | "missing";
  readyForReview: boolean;
  accepted: boolean;
  acceptedWithLimitations: boolean;
  acceptedDegradedCapture: boolean;
  retryRequired: boolean;
  rejected: boolean;
  cloneGenerationAllowed: boolean;
  cloneBlockedByMissingAcceptance: boolean;
  limitations: unknown[];
  missingEvidence: unknown[];
  warnings: unknown[];
  blockers: unknown[];
  diagnostics: SingleSiteJsonObject;
  capturedAt: string | null;
  freshUntil: string | null;
  reviewedAt: string | null;
  reviewerActorId: string | null;
  aafApprovalDecisionId: string | null;
  itemCount: number;
  requiredItemCount: number;
  requiredMissingCategories: SingleSiteEvidenceItemCategory[];
  cloneBlockingItemCount: number;
  refs: SingleSiteSourceEvidenceRefSummary[];
  events: SingleSiteSourceEvidenceReviewEventSummary[];
};

export type SingleSiteEvidenceCompletenessSummary = {
  status: SingleSiteSourceEvidenceCompletenessStatus | "missing";
  requiredCategories: SingleSiteEvidenceItemCategory[];
  presentRequiredCategories: SingleSiteEvidenceItemCategory[];
  missingRequiredCategories: SingleSiteEvidenceItemCategory[];
  degradedRequiredCategories: SingleSiteEvidenceItemCategory[];
  warningItemCount: number;
  unverifiedRequiredCategories: SingleSiteEvidenceItemCategory[];
  cloneBlockingItemCount: number;
};

export type SingleSiteBlockerSummary = {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  highestSeverity: SingleSiteBlockerSeverity;
  hasBlockingOpenIssue: boolean;
  bySeverity: Record<SingleSiteSeverityLevel, number>;
  items: Array<{
    id: string;
    key: string;
    type: SingleSiteBlockerType;
    severity: SingleSiteSeverityLevel;
    status: SingleSiteBlockerStatus;
    ownerRole: string | null;
    openedAt: string;
    resolvedAt: string | null;
    details: SingleSiteJsonObject;
    sourceRef: SingleSiteJsonObject;
  }>;
};

export type SingleSiteRefSummary = {
  totalCount: number;
  activeCount: number;
  staleCount: number;
  missingRequiredRolesForNextAction: SingleSiteMigrationRefRole[];
  byRole: Partial<Record<SingleSiteMigrationRefRole, number>>;
  items: Array<{
    id: string;
    role: SingleSiteMigrationRefRole;
    refType: string;
    sourceSystem: string;
    sourceTable: string | null;
    sourceRecordId: string;
    sourceWatermark: string | null;
    capturedAt: string | null;
    freshUntil: string | null;
    stale: boolean;
    superseded: boolean;
  }>;
};

export type SingleSiteSourceEvidenceRefSummary = {
  id: string;
  role: SingleSiteSourceEvidenceRefRole;
  refType: string;
  sourceSystem: string;
  sourceTable: string | null;
  sourceRecordId: string;
  sourceWatermark: string | null;
  contentHash: string | null;
  mediaType: string | null;
  capturedAt: string | null;
  freshUntil: string | null;
  stale: boolean;
};

export type SingleSiteSourceEvidenceReviewEventSummary = {
  id: string;
  eventIndex: number;
  action: SingleSiteReviewEventAction;
  fromStatus: SingleSiteSourceEvidenceReviewStatus | null;
  toStatus: SingleSiteSourceEvidenceReviewStatus | null;
  actorType: string;
  actorId: string;
  actorRole: string;
  occurredAt: string;
};

export type SingleSiteCloneReviewRefSummary = {
  id: string;
  role: SingleSiteCloneReviewRefRole;
  refType: string;
  sourceSystem: string;
  sourceTable: string | null;
  sourceRecordId: string;
  sourceWatermark: string | null;
  contentHash: string | null;
  mediaType: string | null;
  capturedAt: string | null;
  freshUntil: string | null;
  stale: boolean;
};

export type SingleSiteCloneReviewEventSummary = {
  id: string;
  eventIndex: number;
  action: SingleSiteCloneReviewEventAction;
  fromStatus: SingleSiteCloneReviewStatus | null;
  toStatus: SingleSiteCloneReviewStatus | null;
  actorType: string;
  actorId: string;
  actorRole: string;
  occurredAt: string;
};

export type SingleSiteCloneReviewSummary = {
  reviewId: string | null;
  reviewCount: number;
  reviewStatus: SingleSiteCloneReviewStatus | "missing";
  reviewDecision: SingleSiteCloneReviewDecision | null;
  latestCloneReviewRef: string | null;
  cloneSiteVersionRef: string | null;
  runtimeArtifactRef: string | null;
  sourceEvidenceReviewRef: string | null;
  cloneGenerationRef: string | null;
  readyForReview: boolean;
  inReview: boolean;
  accepted: boolean;
  acceptedWithLimitations: boolean;
  retryRequired: boolean;
  rejected: boolean;
  superseded: boolean;
  proposalPlanningAllowed: boolean;
  cloneAcceptanceReady: boolean;
  limitations: unknown[];
  warnings: unknown[];
  blockers: unknown[];
  fidelitySummary: SingleSiteJsonObject;
  findingCount: number;
  findingCountsBySeverity: Record<SingleSiteCloneFidelitySeverity, number>;
  findingCountsByCategory: Record<SingleSiteCloneFidelityCategory, number>;
  openP0P1FindingCount: number;
  reviewedAt: string | null;
  reviewerActorId: string | null;
  refs: SingleSiteCloneReviewRefSummary[];
  events: SingleSiteCloneReviewEventSummary[];
};

export type SingleSiteCloseoutSummary = {
  present: boolean;
  closeoutId: string | null;
  status: SingleSiteCloseoutStatus | null;
  outcome: SingleSiteCloseoutOutcome | null;
  finalUrl: string | null;
  closedAt: string | null;
  closedByActorId: string | null;
  validationSiteNumber: number | null;
  metrics: SingleSiteJsonObject;
  evidenceSummary: SingleSiteJsonObject;
  exceptions: unknown[];
  refs: SingleSiteJsonObject;
};

export type SingleSiteImprovementProposalPlanningSummary = {
  latestProposalPlanId: string | null;
  proposalStatus: SingleSiteImprovementProposalPlanStatus | "not_started";
  proposalDecision: string | null;
  recommendationCount: number;
  findingsCount: number;
  recommendationsByCategory: Record<SingleSiteImprovementCategory, number>;
  riskSummary: Record<SingleSiteImprovementRiskLevel, number>;
  impactSummary: Record<SingleSiteImprovementImpactLevel, number>;
  effortSummary: Record<SingleSiteImprovementEffortLevel, number>;
  limitations: unknown[];
  approvalRefs: SingleSiteJsonObject;
  implementationAuthorizationRefs: SingleSiteJsonObject;
  implementationAuthorizationReady: boolean;
  proposalReadiness: {
    cloneAccepted: boolean;
    readyToStart: boolean;
    readyForReview: boolean;
    readyForApproval: boolean;
    approved: boolean;
  };
  nextAction: SingleSiteRecommendedNextActionKey;
};

export type SingleSiteRecommendedNextAction = {
  actionKey: SingleSiteRecommendedNextActionKey;
  ownerRole: "migration_operator" | "source_evidence_reviewer" | "clone_reviewer" | "proposal_approver" | "domain_operator" | "billing_operator" | "launch_approver" | "release_operator" | "none";
  reason: string;
  safeNow: boolean;
  blocksWorkflowProgress: boolean;
  requiredRefs: SingleSiteMigrationRefRole[];
  missingRefs: SingleSiteMigrationRefRole[];
};

export type SingleSiteFreshnessSummary = {
  projectionFreshness: SingleSiteProjectionFreshness;
  capturedAt: string;
  generatedAt: string;
  staleRefCount: number;
  staleSourceEvidenceRefCount: number;
  staleStageCount: number;
  staleReview: boolean;
  staleReasons: string[];
  sourceWatermark: string | null;
  latestReviewWatermark: string | null;
};

export type SingleSiteMvpWorkflowReadinessFlags = {
  captureCanStart: boolean;
  sourceEvidenceReviewReady: boolean;
  sourceEvidenceAccepted: boolean;
  sourceEvidenceAcceptedWithLimitations: boolean;
  cloneGenerationAllowed: boolean;
  cloneBlockedByEvidence: boolean;
  cloneReviewReady: boolean;
  cloneAccepted: boolean;
  cloneAcceptedWithLimitations: boolean;
  cloneProposalPlanningAllowed: boolean;
  proposalApprovalReady: boolean;
  improvementReviewReady: boolean;
  domainReadinessIncomplete: boolean;
  subscriptionOrHostingIncomplete: boolean;
  launchApprovalRequired: boolean;
  publishReady: boolean;
  publishReadinessIncomplete: boolean;
  publishedVerificationRequired: boolean;
  rollbackReadinessAvailable: boolean;
  closeoutReady: boolean;
};

export type SingleSiteMigrationReadModel = SingleSiteReadModelBoundaryFlags & {
  readModelVersion: typeof SINGLE_SITE_STATE_READ_MODEL_VERSION;
  generatedAt: string;
  capturedAt: string;
  migration: SingleSiteMigrationSummary;
  currentState: SingleSiteCurrentStateSummary;
  stages: SingleSiteStageSummary[];
  stateHistory: SingleSiteStateHistoryItem[];
  sourceEvidenceReview: SingleSiteSourceEvidenceReviewSummary;
  cloneReview: SingleSiteCloneReviewSummary;
  improvementProposalPlanning: SingleSiteImprovementProposalPlanningSummary;
  evidenceCompleteness: SingleSiteEvidenceCompletenessSummary;
  blockers: SingleSiteBlockerSummary;
  refs: SingleSiteRefSummary;
  closeout: SingleSiteCloseoutSummary;
  recommendedNextAction: SingleSiteRecommendedNextAction;
  freshness: SingleSiteFreshnessSummary;
  workflowReadiness: SingleSiteMvpWorkflowReadinessFlags;
  diagnostics: string[];
};

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

function timestamp(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function isPast(value: string | null, now: string): boolean {
  if (!value) return false;
  const left = new Date(value);
  const right = new Date(now);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return left.getTime() <= right.getTime();
}

function severityRank(severity: SingleSiteBlockerSeverity): number {
  return { none: 0, info: 1, p3: 2, p2: 3, p1: 4, p0: 5 }[severity];
}

function highestSeverity(values: readonly SingleSiteSeverityLevel[]): SingleSiteBlockerSeverity {
  return values.reduce<SingleSiteBlockerSeverity>((highest, value) => (severityRank(value) > severityRank(highest) ? value : highest), "none");
}

function hasRef(refs: readonly SingleSiteMigrationRefRow[], roles: readonly SingleSiteMigrationRefRole[]): boolean {
  return refs.some((ref) => roles.includes(ref.ref_role) && !ref.superseded_by_ref_id);
}

function missingRoles(refs: readonly SingleSiteMigrationRefRow[], roles: readonly SingleSiteMigrationRefRole[]): SingleSiteMigrationRefRole[] {
  return roles.filter((role) => !hasRef(refs, [role]));
}

function requiredRefsForAction(actionKey: SingleSiteRecommendedNextActionKey): SingleSiteMigrationRefRole[] {
  if (actionKey === "start_clone_generation") return ["source_evidence_review", "source_evidence_package"];
  if (
    actionKey === "prepare_improvement_proposal" ||
    actionKey === "prepare_improvement_proposal_with_limitations" ||
    actionKey === "start_improvement_proposal_planning"
  ) {
    return ["clone_review"];
  }
  if (actionKey === "prepare_domain_readiness") return ["ddom_readiness_snapshot"];
  if (actionKey === "prepare_subscription_hosting") return ["subscription", "hosting_entitlement"];
  if (actionKey === "request_launch_approval") return ["content_approval", "ddom_readiness_snapshot", "hosting_entitlement"];
  if (actionKey === "prepare_publish") return ["publish_target", "rollback_target", "aaf_approval_decision"];
  if (actionKey === "confirm_rollback_readiness") return ["rollback_target"];
  if (actionKey === "close_out_migration") return ["closeout"];
  return [];
}

function nextActionForState(input: {
  state: SingleSiteMigrationState;
  sourceEvidence: SingleSiteSourceEvidenceReviewSummary;
  cloneReview: SingleSiteCloneReviewSummary;
  proposal: SingleSiteImprovementProposalPlanningSummary;
  blockers: SingleSiteBlockerSummary;
  closeout: SingleSiteCloseoutSummary;
  refs: readonly SingleSiteMigrationRefRow[];
}): SingleSiteRecommendedNextActionKey {
  if (input.blockers.hasBlockingOpenIssue && input.state !== "migration_closed_out") return "investigate_blocker";
  if (input.state === "site_candidate_created") return "start_capture";
  if (input.state === "source_capture_failed") return "retry_capture";
  if (input.state === "source_capture_completed" || input.state === "source_evidence_review_required") {
    if (input.sourceEvidence.retryRequired || input.sourceEvidence.rejected) return "retry_capture";
    if (input.sourceEvidence.accepted && input.sourceEvidence.cloneGenerationAllowed) return "start_clone_generation";
    if (input.sourceEvidence.readyForReview || input.sourceEvidence.reviewStatus !== "missing") return "review_source_evidence";
    return "review_source_evidence";
  }
  if (input.state === "clone_generation_completed" || input.state === "clone_review_required") {
    if (input.cloneReview.reviewStatus === "missing") return "review_clone";
    if (input.cloneReview.readyForReview || input.cloneReview.inReview || input.cloneReview.reviewStatus === "draft") return "complete_clone_review";
    if (input.cloneReview.accepted && !input.proposal.latestProposalPlanId) return "start_improvement_proposal_planning";
    if (input.cloneReview.acceptedWithLimitations && !input.proposal.latestProposalPlanId) return "start_improvement_proposal_planning";
    if (input.proposal.latestProposalPlanId) return input.proposal.nextAction;
    if (input.cloneReview.retryRequired) return "retry_clone_generation";
    if (input.cloneReview.rejected) return "resolve_clone_blockers";
    if (input.cloneReview.superseded) return "review_latest_clone";
    return "review_clone";
  }
  if (input.state === "clone_revision_required") return "request_clone_revision";
  if (
    input.state === "improvement_proposal_started" ||
    input.state === "improvement_proposal_rejected" ||
    input.state === "improvement_proposal_ready" ||
    input.state === "improvement_proposal_approved"
  ) {
    if (!input.proposal.latestProposalPlanId) {
      if (input.state === "improvement_proposal_started") return "complete_proposal_draft";
      if (input.state === "improvement_proposal_ready") return "review_improvement_proposal";
      if (input.state === "improvement_proposal_rejected") return "resolve_or_cancel_proposal";
      if (input.state === "improvement_proposal_approved") return "request_implementation_authorization";
    }
    return input.proposal.nextAction;
  }
  if (input.state === "improvement_implementation_started") return "implement_improvements";
  if (
    input.state === "improvement_implementation_completed" ||
    input.state === "improved_preview_ready" ||
    input.state === "content_review_required"
  ) {
    return "review_improved_preview";
  }
  if (input.state === "content_approved" || input.state === "domain_readiness_required") return "prepare_domain_readiness";
  if (input.state === "domain_readiness_ready" || input.state === "subscription_required" || input.state === "subscription_created") return "prepare_subscription_hosting";
  if (input.state === "hosting_entitlement_ready" || input.state === "launch_approval_required") return "request_launch_approval";
  if (input.state === "publish_ready") return "prepare_publish";
  if (input.state === "published") {
    if (!hasRef(input.refs, ["rollback_target"])) return "confirm_rollback_readiness";
    return "confirm_rollback_readiness";
  }
  if (input.state === "rollback_available") return input.closeout.present ? "no_action_required" : "close_out_migration";
  return "no_action_required";
}

function actionReason(actionKey: SingleSiteRecommendedNextActionKey, state: SingleSiteMigrationState): string {
  const reasons: Record<SingleSiteRecommendedNextActionKey, string> = {
    start_capture: "Migration is in intake and has no completed capture evidence yet.",
    review_source_evidence: "Captured source evidence needs an operator review before clone generation.",
    retry_capture: "Capture or source evidence review indicates retry is required.",
    accept_source_evidence: "Source evidence can be accepted by a reviewer.",
    start_clone_generation: "Source evidence has been accepted and clone generation is the next projected stage.",
    review_clone: "Clone output is available and needs a canonical clone review.",
    complete_clone_review: "Clone review has started or is ready and needs a fidelity decision.",
    review_clone_fidelity: "Clone output is available or review is required.",
    retry_clone_generation: "Clone review requires retry before proposal planning.",
    resolve_clone_blockers: "Clone review rejected the clone and blockers must be resolved.",
    review_latest_clone: "Latest clone review was superseded and the replacement review should be checked.",
    start_improvement_proposal_planning: "Clone review is accepted and no canonical improvement proposal plan exists yet.",
    complete_proposal_draft: "Improvement proposal plan draft needs findings, recommendations, and summary before review.",
    review_improvement_proposal: "Improvement proposal plan is ready for operator review.",
    complete_proposal_review: "Improvement proposal review is in progress and needs a decision.",
    revise_improvement_proposal: "Reviewer requested proposal changes before approval.",
    request_implementation_authorization: "Proposal plan is approved but implementation authorization remains separate.",
    request_implementation_authorization_with_limitations: "Proposal plan is approved with limitations and still needs separate implementation authorization.",
    resolve_or_cancel_proposal: "Proposal plan was rejected and must be resolved, superseded, or cancelled.",
    review_latest_proposal: "Proposal plan was superseded and the replacement/latest plan should be reviewed.",
    request_clone_revision: "Clone review requires a revision before proposal work proceeds.",
    prepare_improvement_proposal: "Proposal artifacts are not ready for approval yet.",
    prepare_improvement_proposal_with_limitations: "Clone was accepted with limitations that must carry into proposal planning.",
    approve_or_reject_proposal: "Improvement proposal is ready for an operator decision.",
    implement_improvements: "Approved proposal can move into implementation.",
    review_improved_preview: "Improved preview/content needs operator review.",
    prepare_domain_readiness: "Content is approved and domain readiness evidence is incomplete or required.",
    prepare_subscription_hosting: "Domain readiness has progressed and subscription/hosting evidence is required.",
    request_launch_approval: "Launch approval is the next projected operator checkpoint.",
    prepare_publish: "Migration is publish ready and can be prepared for publish activation.",
    verify_published_site: "Published output should be verified.",
    confirm_rollback_readiness: "Published migration needs rollback readiness confirmation.",
    close_out_migration: "Rollback is available and closeout is the next projected action.",
    investigate_blocker: "Open blockers are present and should be investigated before normal workflow progress.",
    no_action_required: `State ${state} is terminal or has no MVP-7 projected action.`,
  };
  return reasons[actionKey];
}

function ownerRole(actionKey: SingleSiteRecommendedNextActionKey): SingleSiteRecommendedNextAction["ownerRole"] {
  if (["review_source_evidence", "accept_source_evidence"].includes(actionKey)) return "source_evidence_reviewer";
  if (["review_clone", "complete_clone_review", "review_clone_fidelity", "retry_clone_generation", "resolve_clone_blockers", "review_latest_clone", "request_clone_revision"].includes(actionKey)) return "clone_reviewer";
  if (["review_improvement_proposal", "complete_proposal_review", "approve_or_reject_proposal"].includes(actionKey)) return "proposal_approver";
  if (
    [
      "start_improvement_proposal_planning",
      "complete_proposal_draft",
      "revise_improvement_proposal",
      "request_implementation_authorization",
      "request_implementation_authorization_with_limitations",
      "resolve_or_cancel_proposal",
      "review_latest_proposal",
    ].includes(actionKey)
  ) {
    return "migration_operator";
  }
  if (actionKey === "prepare_domain_readiness") return "domain_operator";
  if (actionKey === "prepare_subscription_hosting") return "billing_operator";
  if (actionKey === "request_launch_approval") return "launch_approver";
  if (["prepare_publish", "verify_published_site", "confirm_rollback_readiness", "close_out_migration"].includes(actionKey)) return "release_operator";
  if (actionKey === "no_action_required") return "none";
  return "migration_operator";
}

function buildBlockers(rows: readonly SingleSiteRawBlockerRow[]): SingleSiteBlockerSummary {
  const open = rows.filter((row) => row.status === "open");
  const bySeverity: Record<SingleSiteSeverityLevel, number> = { p0: 0, p1: 0, p2: 0, p3: 0, info: 0 };
  for (const row of open) bySeverity[row.severity] += 1;
  const highest = highestSeverity(open.map((row) => row.severity));
  return {
    totalCount: rows.length,
    openCount: open.length,
    resolvedCount: rows.filter((row) => row.status !== "open").length,
    highestSeverity: highest,
    hasBlockingOpenIssue: open.length > 0 && severityRank(highest) >= severityRank("p2"),
    bySeverity,
    items: rows.map((row) => ({
      id: row.id,
      key: row.blocker_key,
      type: row.blocker_type,
      severity: row.severity,
      status: row.status,
      ownerRole: row.owner_role,
      openedAt: timestamp(row.opened_at) ?? "",
      resolvedAt: timestamp(row.resolved_at),
      details: jsonObject(row.details_json),
      sourceRef: jsonObject(row.source_ref_json),
    })),
  };
}

function buildStateHistory(events: readonly SingleSiteStateEventRow[]): SingleSiteStateHistoryItem[] {
  return [...events]
    .sort((left, right) => Number(left.event_index) - Number(right.event_index))
    .map((event) => ({
      id: event.id,
      eventIndex: Number(event.event_index),
      fromState: event.from_state,
      toState: event.to_state,
      fromStage: event.from_stage,
      toStage: event.to_stage,
      transitionKey: event.transition_key,
      transitionReason: event.transition_reason,
      missingRequirements: jsonArray(event.missing_requirements_json),
      actorType: event.actor_type,
      actorId: event.actor_id,
      actorRole: event.actor_role,
      occurredAt: timestamp(event.occurred_at) ?? timestamp(event.created_at) ?? "",
      sourceWatermark: event.source_watermark,
      payloadHash: event.payload_hash,
    }));
}

function buildStageSummaries(snapshot: SingleSiteMigrationReadRepositorySnapshot, generatedAt: string): SingleSiteStageSummary[] {
  const byStage = new Map(snapshot.stageSummaries.map((stage) => [stage.stage, stage]));
  const latestEventIndexByStage = new Map<SingleSiteMigrationStage, number>();
  for (const event of snapshot.stateEvents) {
    latestEventIndexByStage.set(event.to_stage, Math.max(latestEventIndexByStage.get(event.to_stage) ?? 0, Number(event.event_index)));
  }
  const eventIndexById = new Map(snapshot.stateEvents.map((event) => [event.id, Number(event.event_index)]));

  return SINGLE_SITE_MIGRATION_STAGES.map((stage) => {
    const row = byStage.get(stage);
    if (!row) {
      return {
        stage,
        status: "missing" as const,
        current: snapshot.migration.current_stage === stage,
        startedAt: null,
        completedAt: null,
        latestStateEventId: null,
        blockerCount: 0,
        stale: false,
        limitations: [],
        warnings: [],
        blockers: [],
        summary: {},
      };
    }
    const rowEventIndex = row.latest_state_event_id ? eventIndexById.get(row.latest_state_event_id) ?? 0 : 0;
    const latestStageEventIndex = latestEventIndexByStage.get(stage) ?? 0;
    return {
      stage,
      status: row.status,
      current: snapshot.migration.current_stage === stage,
      startedAt: timestamp(row.started_at),
      completedAt: timestamp(row.completed_at),
      latestStateEventId: row.latest_state_event_id,
      blockerCount: Number(row.blocker_count),
      stale: rowEventIndex > 0 && latestStageEventIndex > rowEventIndex,
      limitations: jsonArray(row.limitations_json),
      warnings: jsonArray(row.warnings_json),
      blockers: jsonArray(row.blockers_json),
      summary: jsonObject(row.summary_json),
    };
  }).map((stage) => ({
    ...stage,
    stale: stage.stale || stage.warnings.some((warning) => typeof warning === "string" && /stale/i.test(warning)),
  }));
}

function buildSourceEvidence(snapshot: SingleSiteMigrationReadRepositorySnapshot, generatedAt: string): {
  review: SingleSiteSourceEvidenceReviewSummary;
  completeness: SingleSiteEvidenceCompletenessSummary;
} {
  const latest = snapshot.latestSourceEvidenceReview;
  const requiredCategories = [...SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES];
  const presentRequiredCategories = requiredCategories.filter((category) => {
    const item = snapshot.sourceEvidenceItems.find((candidate) => candidate.evidence_category === category);
    return item?.status === "present" || item?.status === "present_with_warnings" || Boolean(item?.accepted_limitation);
  });
  const missingRequiredCategories = requiredCategories.filter((category) => {
    const item = snapshot.sourceEvidenceItems.find((candidate) => candidate.evidence_category === category);
    return !item || (item.required_for_clone !== false && item.status === "missing" && !item.accepted_limitation);
  });
  const degradedRequiredCategories = requiredCategories.filter((category) => {
    const item = snapshot.sourceEvidenceItems.find((candidate) => candidate.evidence_category === category);
    return item?.required_for_clone !== false && item?.status === "degraded" && !item.accepted_limitation;
  });
  const unverifiedRequiredCategories = requiredCategories.filter((category) => {
    const item = snapshot.sourceEvidenceItems.find((candidate) => candidate.evidence_category === category);
    return item?.required_for_clone !== false && item?.status === "unverified" && !item.accepted_limitation;
  });
  const cloneBlockingItemCount = snapshot.sourceEvidenceItems.filter((item) => item.blocks_clone_generation).length;
  const sourceRefs = snapshot.sourceEvidenceRefs.map((ref) => ({
    id: ref.id,
    role: ref.ref_role,
    refType: ref.ref_type,
    sourceSystem: ref.source_system,
    sourceTable: ref.source_table,
    sourceRecordId: ref.source_record_id,
    sourceWatermark: ref.source_watermark,
    contentHash: ref.content_hash,
    mediaType: ref.media_type,
    capturedAt: timestamp(ref.captured_at),
    freshUntil: timestamp(ref.fresh_until),
    stale: isPast(timestamp(ref.fresh_until), generatedAt),
  }));
  const reviewEvents = [...snapshot.sourceEvidenceEvents]
    .sort((left, right) => Number(left.event_index) - Number(right.event_index))
    .map((event) => ({
      id: event.id,
      eventIndex: Number(event.event_index),
      action: event.event_action,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      actorType: event.actor_type,
      actorId: event.actor_id,
      actorRole: event.actor_role,
      occurredAt: timestamp(event.occurred_at) ?? timestamp(event.created_at) ?? "",
    }));

  const reviewStatus = latest?.review_status ?? "missing";
  const accepted = reviewStatus === "accepted" || reviewStatus === "accepted_with_limitations";
  const review = {
    reviewId: latest?.id ?? null,
    reviewCount: snapshot.sourceEvidenceReviews.length,
    reviewStatus,
    reviewDecision: latest?.review_decision ?? null,
    completenessStatus: latest?.completeness_status ?? "missing",
    readyForReview: reviewStatus === "ready_for_review" || reviewStatus === "review_in_progress",
    accepted,
    acceptedWithLimitations: reviewStatus === "accepted_with_limitations",
    acceptedDegradedCapture: Boolean(latest?.accepted_degraded_capture),
    retryRequired: Boolean(latest?.retry_required) || reviewStatus === "retry_required",
    rejected: reviewStatus === "rejected",
    cloneGenerationAllowed: Boolean(latest?.clone_generation_allowed) && accepted && cloneBlockingItemCount === 0,
    cloneBlockedByMissingAcceptance: !accepted,
    limitations: jsonArray(latest?.review_limitations_json),
    missingEvidence: jsonArray(latest?.missing_evidence_json),
    warnings: jsonArray(latest?.warnings_json),
    blockers: jsonArray(latest?.blockers_json),
    diagnostics: jsonObject(latest?.diagnostics_json),
    capturedAt: timestamp(latest?.evidence_captured_at),
    freshUntil: timestamp(latest?.fresh_until),
    reviewedAt: timestamp(latest?.reviewed_at),
    reviewerActorId: latest?.reviewer_actor_id ?? null,
    aafApprovalDecisionId: latest?.aaf_approval_decision_id ?? null,
    itemCount: snapshot.sourceEvidenceItems.length,
    requiredItemCount: requiredCategories.length,
    requiredMissingCategories: [...new Set([...missingRequiredCategories, ...degradedRequiredCategories, ...unverifiedRequiredCategories])],
    cloneBlockingItemCount,
    refs: sourceRefs,
    events: reviewEvents,
  } satisfies SingleSiteSourceEvidenceReviewSummary;

  return {
    review,
    completeness: {
      status: latest?.completeness_status ?? "missing",
      requiredCategories,
      presentRequiredCategories,
      missingRequiredCategories,
      degradedRequiredCategories,
      warningItemCount: snapshot.sourceEvidenceItems.filter((item) => item.status === "present_with_warnings" || jsonArray(item.warnings_json).length > 0).length,
      unverifiedRequiredCategories,
      cloneBlockingItemCount,
    },
  };
}

function buildCloneReview(snapshot: SingleSiteMigrationReadRepositorySnapshot, generatedAt: string): SingleSiteCloneReviewSummary {
  const latest = snapshot.latestCloneReview;
  const severityCounts = Object.fromEntries(SINGLE_SITE_CLONE_FIDELITY_SEVERITIES.map((severity) => [severity, 0])) as Record<SingleSiteCloneFidelitySeverity, number>;
  const categoryCounts = Object.fromEntries(SINGLE_SITE_CLONE_FIDELITY_CATEGORIES.map((category) => [category, 0])) as Record<SingleSiteCloneFidelityCategory, number>;
  for (const item of snapshot.cloneReviewItems) {
    severityCounts[item.severity] += 1;
    categoryCounts[item.fidelity_category] += 1;
  }
  const refs = snapshot.cloneReviewRefs.map((ref) => ({
    id: ref.id,
    role: ref.ref_role,
    refType: ref.ref_type,
    sourceSystem: ref.source_system,
    sourceTable: ref.source_table,
    sourceRecordId: ref.source_record_id,
    sourceWatermark: ref.source_watermark,
    contentHash: ref.content_hash,
    mediaType: ref.media_type,
    capturedAt: timestamp(ref.captured_at),
    freshUntil: timestamp(ref.fresh_until),
    stale: isPast(timestamp(ref.fresh_until), generatedAt),
  }));
  const events = [...snapshot.cloneReviewEvents]
    .sort((left, right) => Number(left.event_index) - Number(right.event_index))
    .map((event) => ({
      id: event.id,
      eventIndex: Number(event.event_index),
      action: event.event_action,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      actorType: event.actor_type,
      actorId: event.actor_id,
      actorRole: event.actor_role,
      occurredAt: timestamp(event.occurred_at) ?? timestamp(event.created_at) ?? "",
    }));
  const reviewStatus = latest?.review_status ?? "missing";
  const accepted = reviewStatus === "accepted" || reviewStatus === "accepted_with_limitations";
  const openP0P1FindingCount = snapshot.cloneReviewItems.filter(
    (item) => item.status === "open" && (item.severity === "p0_blocker" || item.severity === "p1_major") && !item.accepted_limitation,
  ).length;
  return {
    reviewId: latest?.id ?? null,
    reviewCount: snapshot.cloneReviews.length,
    reviewStatus,
    reviewDecision: latest?.review_decision ?? null,
    latestCloneReviewRef: latest?.id ?? null,
    cloneSiteVersionRef: latest?.clone_site_version_ref ?? null,
    runtimeArtifactRef: latest?.runtime_artifact_ref ?? null,
    sourceEvidenceReviewRef: latest?.source_evidence_review_id ?? null,
    cloneGenerationRef: latest?.clone_generation_ref ?? null,
    readyForReview: reviewStatus === "ready_for_review",
    inReview: reviewStatus === "in_review",
    accepted,
    acceptedWithLimitations: reviewStatus === "accepted_with_limitations",
    retryRequired: Boolean(latest?.retry_required) || reviewStatus === "retry_required",
    rejected: reviewStatus === "rejected",
    superseded: reviewStatus === "superseded",
    proposalPlanningAllowed: Boolean(latest?.proposal_planning_allowed) && accepted,
    cloneAcceptanceReady: Boolean(latest?.proposal_planning_allowed) && accepted && openP0P1FindingCount === 0,
    limitations: jsonArray(latest?.limitations_json),
    warnings: jsonArray(latest?.warnings_json),
    blockers: jsonArray(latest?.blockers_json),
    fidelitySummary: jsonObject(latest?.fidelity_summary_json),
    findingCount: snapshot.cloneReviewItems.length,
    findingCountsBySeverity: severityCounts,
    findingCountsByCategory: categoryCounts,
    openP0P1FindingCount,
    reviewedAt: timestamp(latest?.reviewed_at),
    reviewerActorId: latest?.reviewer_actor_id ?? null,
    refs,
    events,
  };
}

function proposalNextAction(
  latest: SingleSiteImprovementProposalPlanRow | null,
  cloneReview: SingleSiteCloneReviewSummary,
): SingleSiteRecommendedNextActionKey {
  if (!latest) return cloneReview.accepted ? "start_improvement_proposal_planning" : "review_clone";
  if (latest.plan_status === "draft" || latest.plan_status === "planning_required" || latest.plan_status === "not_started") return "complete_proposal_draft";
  if (latest.plan_status === "ready_for_review") return "review_improvement_proposal";
  if (latest.plan_status === "in_review") return "complete_proposal_review";
  if (latest.plan_status === "changes_requested") return "revise_improvement_proposal";
  if (latest.plan_status === "approved") return latest.implementation_authorization_attached ? "implement_improvements" : "request_implementation_authorization";
  if (latest.plan_status === "approved_with_limitations") {
    return latest.implementation_authorization_attached ? "implement_improvements" : "request_implementation_authorization_with_limitations";
  }
  if (latest.plan_status === "rejected") return "resolve_or_cancel_proposal";
  if (latest.plan_status === "superseded") return "review_latest_proposal";
  return "no_action_required";
}

function buildImprovementProposalPlanning(
  snapshot: SingleSiteMigrationReadRepositorySnapshot,
  cloneReview: SingleSiteCloneReviewSummary,
): SingleSiteImprovementProposalPlanningSummary {
  const latest = snapshot.latestImprovementProposalPlan ?? null;
  const recommendations = snapshot.improvementProposalRecommendations ?? [];
  const findings = snapshot.improvementProposalFindings ?? [];
  const recommendationsByCategory = Object.fromEntries(SINGLE_SITE_IMPROVEMENT_CATEGORIES.map((category) => [category, 0])) as Record<SingleSiteImprovementCategory, number>;
  const riskSummary = Object.fromEntries(SINGLE_SITE_IMPROVEMENT_RISK_LEVELS.map((level) => [level, 0])) as Record<SingleSiteImprovementRiskLevel, number>;
  const impactSummary = Object.fromEntries(SINGLE_SITE_IMPROVEMENT_IMPACT_LEVELS.map((level) => [level, 0])) as Record<SingleSiteImprovementImpactLevel, number>;
  const effortSummary = Object.fromEntries(SINGLE_SITE_IMPROVEMENT_EFFORT_LEVELS.map((level) => [level, 0])) as Record<SingleSiteImprovementEffortLevel, number>;
  for (const recommendation of recommendations) {
    recommendationsByCategory[recommendation.category] += 1;
    riskSummary[recommendation.risk] += 1;
    impactSummary[recommendation.impact] += 1;
    effortSummary[recommendation.effort] += 1;
  }
  const proposalDecision = latest ? String(jsonObject(latest.decision_summary_json).decision ?? latest.plan_status) : null;
  const readyForReview = latest?.plan_status === "ready_for_review" || latest?.plan_status === "in_review";
  const approved = latest?.plan_status === "approved" || latest?.plan_status === "approved_with_limitations";
  return {
    latestProposalPlanId: latest?.id ?? null,
    proposalStatus: latest?.plan_status ?? "not_started",
    proposalDecision,
    recommendationCount: recommendations.length,
    findingsCount: findings.length,
    recommendationsByCategory,
    riskSummary,
    impactSummary,
    effortSummary,
    limitations: jsonArray(latest?.limitations_json),
    approvalRefs: jsonObject(latest?.approval_refs_json),
    implementationAuthorizationRefs: jsonObject(latest?.implementation_authorization_refs_json),
    implementationAuthorizationReady: Boolean(latest?.implementation_authorization_attached) && approved,
    proposalReadiness: {
      cloneAccepted: cloneReview.accepted,
      readyToStart: cloneReview.accepted && !latest,
      readyForReview,
      readyForApproval: readyForReview && recommendations.length > 0,
      approved,
    },
    nextAction: proposalNextAction(latest, cloneReview),
  };
}

function buildRefs(
  refs: readonly SingleSiteMigrationRefRow[],
  generatedAt: string,
  requiredRoles: readonly SingleSiteMigrationRefRole[],
): SingleSiteRefSummary {
  const byRole: Partial<Record<SingleSiteMigrationRefRole, number>> = {};
  const items = refs.map((ref) => {
    byRole[ref.ref_role] = (byRole[ref.ref_role] ?? 0) + 1;
    return {
      id: ref.id,
      role: ref.ref_role,
      refType: ref.ref_type,
      sourceSystem: ref.source_system,
      sourceTable: ref.source_table,
      sourceRecordId: ref.source_record_id,
      sourceWatermark: ref.source_watermark,
      capturedAt: timestamp(ref.captured_at),
      freshUntil: timestamp(ref.fresh_until),
      stale: isPast(timestamp(ref.fresh_until), generatedAt),
      superseded: Boolean(ref.superseded_by_ref_id),
    };
  });
  return {
    totalCount: refs.length,
    activeCount: items.filter((item) => !item.superseded).length,
    staleCount: items.filter((item) => item.stale).length,
    missingRequiredRolesForNextAction: missingRoles(refs, requiredRoles),
    byRole,
    items,
  };
}

function buildCloseout(row: SingleSiteRawCloseoutRow | null): SingleSiteCloseoutSummary {
  return {
    present: Boolean(row),
    closeoutId: row?.id ?? null,
    status: row?.status ?? null,
    outcome: row?.outcome ?? null,
    finalUrl: row?.final_url ?? null,
    closedAt: timestamp(row?.closed_at),
    closedByActorId: row?.closed_by_actor_id ?? null,
    validationSiteNumber: row?.validation_site_number ?? null,
    metrics: jsonObject(row?.metrics_json),
    evidenceSummary: jsonObject(row?.evidence_summary_json),
    exceptions: jsonArray(row?.exceptions_json),
    refs: jsonObject(row?.closeout_refs_json),
  };
}

function buildReadiness(input: {
  state: SingleSiteMigrationState;
  sourceEvidence: SingleSiteSourceEvidenceReviewSummary;
  cloneReview: SingleSiteCloneReviewSummary;
  proposal: SingleSiteImprovementProposalPlanningSummary;
  refs: SingleSiteRefSummary;
  closeout: SingleSiteCloseoutSummary;
}): SingleSiteMvpWorkflowReadinessFlags {
  return {
    captureCanStart: input.state === "site_candidate_created" || input.state === "source_capture_failed",
    sourceEvidenceReviewReady: input.sourceEvidence.readyForReview || input.state === "source_capture_completed" || input.state === "source_evidence_review_required",
    sourceEvidenceAccepted: input.sourceEvidence.accepted,
    sourceEvidenceAcceptedWithLimitations: input.sourceEvidence.acceptedWithLimitations,
    cloneGenerationAllowed: input.sourceEvidence.cloneGenerationAllowed,
    cloneBlockedByEvidence: input.sourceEvidence.cloneBlockedByMissingAcceptance || input.sourceEvidence.cloneBlockingItemCount > 0,
    cloneReviewReady: input.state === "clone_generation_completed" || input.state === "clone_review_required",
    cloneAccepted: input.cloneReview.accepted,
    cloneAcceptedWithLimitations: input.cloneReview.acceptedWithLimitations,
    cloneProposalPlanningAllowed: input.cloneReview.proposalPlanningAllowed,
    proposalApprovalReady: input.proposal.proposalReadiness.readyForApproval,
    improvementReviewReady: input.state === "improvement_implementation_completed" || input.state === "improved_preview_ready" || input.state === "content_review_required",
    domainReadinessIncomplete: input.state === "content_approved" || input.state === "domain_readiness_required" || !input.refs.byRole.ddom_readiness_snapshot,
    subscriptionOrHostingIncomplete: input.state === "subscription_required" || !input.refs.byRole.hosting_entitlement,
    launchApprovalRequired: input.state === "launch_approval_required" || !input.refs.byRole.aaf_approval_decision,
    publishReady: input.state === "publish_ready",
    publishReadinessIncomplete: !input.refs.byRole.publish_target || !input.refs.byRole.rollback_target,
    publishedVerificationRequired: input.state === "published",
    rollbackReadinessAvailable: input.state === "rollback_available" || Boolean(input.refs.byRole.rollback_target),
    closeoutReady: input.state === "rollback_available" && !input.closeout.present,
  };
}

function lifecycle(state: SingleSiteMigrationState): SingleSiteMigrationLifecycle {
  if (state === "migration_closed_out") return "closed_out";
  if (state === "migration_failed") return "failed";
  if (state === "migration_cancelled") return "cancelled";
  return "active";
}

export function buildSingleSiteMigrationReadModel(snapshot: SingleSiteMigrationReadRepositorySnapshot): SingleSiteMigrationReadModel {
  const generatedAt = new Date().toISOString();
  const history = buildStateHistory(snapshot.stateEvents);
  const blockers = buildBlockers(snapshot.blockers);
  const closeout = buildCloseout(snapshot.closeout);
  const sourceEvidence = buildSourceEvidence(snapshot, generatedAt);
  const cloneReview = buildCloneReview(snapshot, generatedAt);
  const improvementProposalPlanning = buildImprovementProposalPlanning(snapshot, cloneReview);
  const actionKey = nextActionForState({
    state: snapshot.migration.current_state,
    sourceEvidence: sourceEvidence.review,
    cloneReview,
    proposal: improvementProposalPlanning,
    blockers,
    closeout,
    refs: snapshot.refs,
  });
  const requiredRefs = requiredRefsForAction(actionKey);
  const refs = buildRefs(snapshot.refs, generatedAt, requiredRefs);
  const stages = buildStageSummaries(snapshot, generatedAt);
  const staleReview = isPast(sourceEvidence.review.freshUntil, generatedAt);
  const staleSourceEvidenceRefCount = sourceEvidence.review.refs.filter((ref) => ref.stale).length;
  const staleCloneReviewRefCount = cloneReview.refs.filter((ref) => ref.stale).length;
  const staleStageCount = stages.filter((stage) => stage.stale).length;
  const staleReasons = [
    refs.staleCount > 0 ? "migration_refs_stale" : null,
    staleSourceEvidenceRefCount > 0 ? "source_evidence_refs_stale" : null,
    staleCloneReviewRefCount > 0 ? "clone_review_refs_stale" : null,
    staleStageCount > 0 ? "stage_summaries_stale" : null,
    staleReview ? "source_evidence_review_stale" : null,
  ].filter((value): value is string => Boolean(value));
  const projectionFreshness: SingleSiteProjectionFreshness =
    staleReasons.length === 0 ? "fresh" : staleReasons.length > 1 ? "partially_stale" : "stale";
  const currentLifecycle = lifecycle(snapshot.migration.current_state);

  return {
    readModelVersion: SINGLE_SITE_STATE_READ_MODEL_VERSION,
    derivedOnly: true,
    sourceTruth: "gnr8_single_site_state_spine",
    mutatesSourceTruth: false,
    nonEnforcing: true,
    generatedAt,
    capturedAt: timestamp(snapshot.capturedAt) ?? generatedAt,
    migration: {
      migrationId: snapshot.migration.id,
      tenantId: snapshot.migration.tenant_id,
      clientId: snapshot.migration.client_id,
      siteId: snapshot.migration.site_id,
      ownershipSiteId: snapshot.migration.ownership_site_id,
      runtimeSiteId: snapshot.migration.runtime_site_id,
      sourceUrl: snapshot.migration.source_url,
      canonicalSourceUrl: snapshot.migration.canonical_source_url,
      intendedLaunchDomain: snapshot.migration.intended_launch_domain,
      validationSiteNumber: snapshot.migration.validation_site_number,
      operatorOwnerActorId: snapshot.migration.operator_owner_actor_id,
      createdAt: timestamp(snapshot.migration.created_at) ?? "",
      updatedAt: timestamp(snapshot.migration.updated_at) ?? "",
    },
    currentState: {
      state: snapshot.migration.current_state,
      stage: snapshot.migration.current_stage ?? SINGLE_SITE_STATE_STAGE[snapshot.migration.current_state],
      stateVersion: Number(snapshot.migration.state_version),
      lifecycle: currentLifecycle,
      active: !isSingleSiteTerminalState(snapshot.migration.current_state),
      terminal: isSingleSiteTerminalState(snapshot.migration.current_state),
      failed: snapshot.migration.current_state === "migration_failed",
      cancelled: snapshot.migration.current_state === "migration_cancelled",
      closedOut: snapshot.migration.current_state === "migration_closed_out",
      terminalAt: timestamp(snapshot.migration.terminal_at),
    },
    stages,
    stateHistory: history,
    sourceEvidenceReview: sourceEvidence.review,
    cloneReview,
    improvementProposalPlanning,
    evidenceCompleteness: sourceEvidence.completeness,
    blockers,
    refs,
    closeout,
    recommendedNextAction: {
      actionKey,
      ownerRole: ownerRole(actionKey),
      reason: actionReason(actionKey, snapshot.migration.current_state),
      safeNow: actionKey !== "investigate_blocker" && actionKey !== "no_action_required" && refs.missingRequiredRolesForNextAction.length === 0,
      blocksWorkflowProgress: actionKey === "investigate_blocker" || refs.missingRequiredRolesForNextAction.length > 0,
      requiredRefs,
      missingRefs: refs.missingRequiredRolesForNextAction,
    },
    freshness: {
      projectionFreshness,
      capturedAt: timestamp(snapshot.capturedAt) ?? generatedAt,
      generatedAt,
      staleRefCount: refs.staleCount,
      staleSourceEvidenceRefCount,
      staleStageCount,
      staleReview,
      staleReasons,
      sourceWatermark: snapshot.migration.source_watermark,
      latestReviewWatermark: snapshot.latestSourceEvidenceReview?.source_watermark ?? null,
    },
    workflowReadiness: buildReadiness({ state: snapshot.migration.current_state, sourceEvidence: sourceEvidence.review, cloneReview, proposal: improvementProposalPlanning, refs, closeout }),
    diagnostics: [
      snapshot.migration.current_stage !== SINGLE_SITE_STATE_STAGE[snapshot.migration.current_state] ? "current_stage_does_not_match_contract_state_stage" : null,
      snapshot.sourceEvidenceReviews.length > 1 ? "multiple_source_evidence_reviews_present_latest_review_selected" : null,
      snapshot.cloneReviews.length > 1 ? "multiple_clone_reviews_present_latest_review_selected" : null,
      snapshot.migration.site_id ? null : "site_id_missing_lookup_by_site_id_requires_ownership_or_runtime_site_id_fallback",
    ].filter((value): value is string => Boolean(value)),
  };
}
