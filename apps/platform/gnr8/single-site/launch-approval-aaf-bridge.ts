import "server-only";

import { createHash } from "node:crypto";

import {
  AAF_SCOPE_REPLAY_CLASS,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import {
  AafWriterRepository,
  type AafActorType,
  type AafJsonObject,
  type AafPgClient,
  type AafRecord,
  type AafTenantScopeInput,
} from "../aaf/aaf-writer-repository";

export type SingleSiteLaunchApprovalActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type LaunchApprovalBridgeSourceRef = {
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | number | null;
  sourceWatermark: string;
  contentHash?: string | null;
  metadataJson?: AafJsonObject;
};

export type LaunchApprovalBridgeReviewRef = LaunchApprovalBridgeSourceRef & {
  reviewStatus: "accepted" | "accepted_with_limitations" | string;
  limitations?: unknown[];
};

export type LaunchApprovalBridgeContentApprovalRef = LaunchApprovalBridgeSourceRef & {
  approvalStatus: "approved" | "approved_with_limitations" | string;
  limitations?: unknown[];
};

export type LaunchApprovalBridgeClientApprovalRef = LaunchApprovalBridgeSourceRef & {
  approvalStatus: "approved" | "approved_with_limitations" | string;
  limitations?: unknown[];
};

export type LaunchApprovalBridgeAafApprovalRef = {
  approvalRequestId?: string | null;
  approvalDecisionId: string;
  evidencePackageId?: string | null;
  sourceWatermark: string;
  limitations?: unknown[];
};

export type LaunchApprovalSelectedRecommendationRef = LaunchApprovalBridgeSourceRef & {
  recommendationId: string;
  recommendationKey?: string | null;
  applicationStatus?: string | null;
};

export type PrepareLaunchApprovalRequestInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  launchApprovalId: string;
  contentApprovalRef: LaunchApprovalBridgeContentApprovalRef;
  aafContentApprovalDecisionRef: LaunchApprovalBridgeAafApprovalRef;
  requireClientApproval: boolean;
  clientApprovalRequirementPolicyRef: LaunchApprovalBridgeSourceRef;
  clientApprovalRef?: LaunchApprovalBridgeClientApprovalRef | null;
  aafClientApprovalDecisionRef?: LaunchApprovalBridgeAafApprovalRef | null;
  improvedVersionReviewRef: LaunchApprovalBridgeReviewRef;
  improvedCandidateSiteVersionRef: LaunchApprovalBridgeSourceRef;
  improvedRuntimeArtifactRef: LaunchApprovalBridgeSourceRef;
  proposalPlanRef: LaunchApprovalBridgeSourceRef & { planVersion?: string | number | null };
  proposalApprovalRef: LaunchApprovalBridgeAafApprovalRef;
  implementationAuthorizationRef: LaunchApprovalBridgeAafApprovalRef;
  improvementExecutionAttemptRef: LaunchApprovalBridgeSourceRef;
  selectedRecommendationRefs: LaunchApprovalSelectedRecommendationRef[];
  preLaunchChecklistSnapshotRef: LaunchApprovalBridgeSourceRef;
  blockerLimitationSummaryRef: LaunchApprovalBridgeSourceRef;
  domainReadinessPlaceholderOrRef: LaunchApprovalBridgeSourceRef;
  billingHostingEntitlementPlaceholderOrRef: LaunchApprovalBridgeSourceRef;
  rollbackReadinessPlaceholderOrRef: LaunchApprovalBridgeSourceRef;
  publishTargetPlaceholderOrRef: LaunchApprovalBridgeSourceRef;
  operatorLaunchNotesRef: LaunchApprovalBridgeSourceRef;
  limitations?: unknown[];
  launchChecklistRefs?: LaunchApprovalBridgeSourceRef[];
  domainReadinessEvidenceRefs?: LaunchApprovalBridgeSourceRef[];
  billingHostingReadinessEvidenceRefs?: LaunchApprovalBridgeSourceRef[];
  rollbackReadinessEvidenceRefs?: LaunchApprovalBridgeSourceRef[];
  smokeQaSummaryRefs?: LaunchApprovalBridgeSourceRef[];
  auditTimelineRefs?: LaunchApprovalBridgeSourceRef[];
  operatorLaunchNotes?: unknown[];
  blockerRefs?: unknown[];
  actor: SingleSiteLaunchApprovalActor;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  policyVersion: string;
  requestedExpiresAt?: string | null;
};

export type PreparedLaunchApprovalRequest = {
  scope: typeof AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE;
  subjectType: typeof AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE;
  subjectId: string;
  semanticWatermark: string;
  evidencePackage: AafRecord;
  approvalRequest: AafRecord;
  subjectRefs: AafRecord[];
  evidenceSourceRefs: AafRecord[];
  evidenceItems: AafRecord[];
  evidenceLink: AafRecord | null;
  policyEvaluation: AafRecord;
  requestedAuditEvent: AafRecord;
  reusedExisting: boolean;
};

export type ValidateLaunchApprovalDecisionRefInput = Omit<
  PrepareLaunchApprovalRequestInput,
  "actor" | "correlationId" | "causationId" | "requestId" | "idempotencyKey" | "requestedExpiresAt"
> & {
  launchApprovalDecisionId: string;
  approvalRequestId?: string | null;
  evidencePackageId?: string | null;
};

export type LaunchApprovalAafValidationStatus =
  | "granted"
  | "granted_with_limitations"
  | "invalid"
  | "stale"
  | "rejected"
  | "revoked"
  | "expired"
  | "superseded"
  | "cancelled"
  | "missing";

export type LaunchApprovalAafValidationResult = {
  valid: boolean;
  status: LaunchApprovalAafValidationStatus;
  scope: typeof AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE | string | null;
  subjectType: typeof AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE | string | null;
  subjectId: string | null;
  approvalRequestId: string | null;
  approvalDecisionId: string | null;
  evidencePackageId: string | null;
  limitations: unknown[];
  blockerCodes: string[];
  semanticWatermark: string;
};

type BridgeWriter = Pick<AafWriterRepository, "createEvidencePackageTransaction" | "createApprovalRequestTransaction" | "withTransaction">;

export type LaunchApprovalExpectedRefs = {
  subjectRefs: Array<LaunchApprovalBridgeSourceRef & { role: string }>;
  evidenceRefs: Array<LaunchApprovalBridgeSourceRef & { role: string; itemType: string; displayName: string }>;
};

export type LaunchApprovalSemanticInput = Omit<ValidateLaunchApprovalDecisionRefInput, "launchApprovalDecisionId" | "approvalRequestId" | "evidencePackageId">;

function text(field: string, value: unknown): string {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return String(value).trim();
}

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
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

function jsonObject(value: unknown): AafJsonObject {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as AafJsonObject;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function hashRef(value: unknown): string {
  return digest(value);
}

function roleRef(
  role: string,
  sourceTable: string,
  sourceRecordId: string,
  sourceWatermark: string,
  sourceVersion?: string | number | null,
): LaunchApprovalBridgeSourceRef & { role: string } {
  return {
    role,
    sourceTable,
    sourceRecordId,
    sourceVersion: sourceVersion === undefined || sourceVersion === null ? null : String(sourceVersion),
    sourceWatermark,
  };
}

function evidenceRoleRef(
  role: string,
  itemType: string,
  displayName: string,
  ref: LaunchApprovalBridgeSourceRef & { role: string },
): LaunchApprovalBridgeSourceRef & { role: string; itemType: string; displayName: string } {
  return {
    ...ref,
    role,
    itemType,
    displayName,
    sourceWatermark: `${ref.sourceWatermark}:${role}`,
    metadataJson: { ...(ref.metadataJson ?? {}), originalSourceWatermark: ref.sourceWatermark },
  };
}

function assertAcceptedReview(field: string, status: string): void {
  if (!["accepted", "accepted_with_limitations"].includes(status)) {
    throw new Error(`${field} must be accepted or accepted_with_limitations`);
  }
}

function assertApprovedContent(field: string, status: string): void {
  if (!["approved", "approved_with_limitations"].includes(status)) {
    throw new Error(`${field} must be approved or approved_with_limitations`);
  }
}

export function computeLaunchApprovalSemanticWatermark(input: LaunchApprovalSemanticInput): string {
  return `single-site-launch-approval:${digest({
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    launchApprovalId: input.launchApprovalId,
    contentApprovalRef: input.contentApprovalRef,
    aafContentApprovalDecisionRef: input.aafContentApprovalDecisionRef,
    requireClientApproval: input.requireClientApproval,
    clientApprovalRequirementPolicyRef: input.clientApprovalRequirementPolicyRef,
    clientApprovalRef: input.clientApprovalRef ?? null,
    aafClientApprovalDecisionRef: input.aafClientApprovalDecisionRef ?? null,
    improvedVersionReviewRef: input.improvedVersionReviewRef,
    improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef,
    improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef,
    proposalPlanRef: input.proposalPlanRef,
    proposalApprovalRef: input.proposalApprovalRef,
    implementationAuthorizationRef: input.implementationAuthorizationRef,
    improvementExecutionAttemptRef: input.improvementExecutionAttemptRef,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    preLaunchChecklistSnapshotRef: input.preLaunchChecklistSnapshotRef,
    blockerLimitationSummaryRef: input.blockerLimitationSummaryRef,
    domainReadinessPlaceholderOrRef: input.domainReadinessPlaceholderOrRef,
    billingHostingEntitlementPlaceholderOrRef: input.billingHostingEntitlementPlaceholderOrRef,
    rollbackReadinessPlaceholderOrRef: input.rollbackReadinessPlaceholderOrRef,
    publishTargetPlaceholderOrRef: input.publishTargetPlaceholderOrRef,
    operatorLaunchNotesRef: input.operatorLaunchNotesRef,
    limitations: input.limitations ?? [],
    launchChecklistRefs: input.launchChecklistRefs ?? [],
    domainReadinessEvidenceRefs: input.domainReadinessEvidenceRefs ?? [],
    billingHostingReadinessEvidenceRefs: input.billingHostingReadinessEvidenceRefs ?? [],
    rollbackReadinessEvidenceRefs: input.rollbackReadinessEvidenceRefs ?? [],
    smokeQaSummaryRefs: input.smokeQaSummaryRefs ?? [],
    auditTimelineRefs: input.auditTimelineRefs ?? [],
    operatorLaunchNotes: input.operatorLaunchNotes ?? [],
    blockerRefs: input.blockerRefs ?? [],
    policyVersion: input.policyVersion,
  })}`;
}

function assertSourceRef(field: string, ref: LaunchApprovalBridgeSourceRef | null | undefined): void {
  text(`${field}.sourceTable`, ref?.sourceTable);
  text(`${field}.sourceRecordId`, ref?.sourceRecordId);
  text(`${field}.sourceWatermark`, ref?.sourceWatermark);
}

function assertPrepareInput(input: PrepareLaunchApprovalRequestInput): void {
  text("tenantId", input.tenantId);
  text("clientId", input.clientId);
  text("siteId", input.siteId);
  text("migrationId", input.migrationId);
  text("launchApprovalId", input.launchApprovalId);
  assertSourceRef("contentApprovalRef", input.contentApprovalRef);
  assertApprovedContent("contentApprovalRef.approvalStatus", String(input.contentApprovalRef?.approvalStatus));
  text("aafContentApprovalDecisionRef.approvalDecisionId", input.aafContentApprovalDecisionRef?.approvalDecisionId);
  text("aafContentApprovalDecisionRef.sourceWatermark", input.aafContentApprovalDecisionRef?.sourceWatermark);
  assertSourceRef("clientApprovalRequirementPolicyRef", input.clientApprovalRequirementPolicyRef);
  if (input.requireClientApproval) {
    assertSourceRef("clientApprovalRef", input.clientApprovalRef);
    assertApprovedContent("clientApprovalRef.approvalStatus", String(input.clientApprovalRef?.approvalStatus));
    text("aafClientApprovalDecisionRef.approvalDecisionId", input.aafClientApprovalDecisionRef?.approvalDecisionId);
    text("aafClientApprovalDecisionRef.sourceWatermark", input.aafClientApprovalDecisionRef?.sourceWatermark);
  }
  assertSourceRef("improvedVersionReviewRef", input.improvedVersionReviewRef);
  assertAcceptedReview("improvedVersionReviewRef.reviewStatus", String(input.improvedVersionReviewRef?.reviewStatus));
  assertSourceRef("improvedCandidateSiteVersionRef", input.improvedCandidateSiteVersionRef);
  assertSourceRef("improvedRuntimeArtifactRef", input.improvedRuntimeArtifactRef);
  assertSourceRef("proposalPlanRef", input.proposalPlanRef);
  text("proposalApprovalRef.approvalDecisionId", input.proposalApprovalRef?.approvalDecisionId);
  text("proposalApprovalRef.sourceWatermark", input.proposalApprovalRef?.sourceWatermark);
  text("implementationAuthorizationRef.approvalDecisionId", input.implementationAuthorizationRef?.approvalDecisionId);
  text("implementationAuthorizationRef.sourceWatermark", input.implementationAuthorizationRef?.sourceWatermark);
  assertSourceRef("improvementExecutionAttemptRef", input.improvementExecutionAttemptRef);
  if (!Array.isArray(input.selectedRecommendationRefs) || input.selectedRecommendationRefs.length === 0) {
    throw new Error("selectedRecommendationRefs are required");
  }
  for (const [index, ref] of input.selectedRecommendationRefs.entries()) {
    text(`selectedRecommendationRefs[${index}].recommendationId`, ref.recommendationId);
    assertSourceRef(`selectedRecommendationRefs[${index}]`, ref);
  }
  assertSourceRef("preLaunchChecklistSnapshotRef", input.preLaunchChecklistSnapshotRef);
  assertSourceRef("blockerLimitationSummaryRef", input.blockerLimitationSummaryRef);
  assertSourceRef("domainReadinessPlaceholderOrRef", input.domainReadinessPlaceholderOrRef);
  assertSourceRef("billingHostingEntitlementPlaceholderOrRef", input.billingHostingEntitlementPlaceholderOrRef);
  assertSourceRef("rollbackReadinessPlaceholderOrRef", input.rollbackReadinessPlaceholderOrRef);
  assertSourceRef("publishTargetPlaceholderOrRef", input.publishTargetPlaceholderOrRef);
  assertSourceRef("operatorLaunchNotesRef", input.operatorLaunchNotesRef);
  text("actor.actorType", input.actor?.actorType);
  text("actor.actorId", input.actor?.actorId);
  text("actor.actorRole", input.actor?.actorRole);
  text("correlationId", input.correlationId);
  text("idempotencyKey", input.idempotencyKey);
  text("policyVersion", input.policyVersion);
}

export function buildExpectedLaunchApprovalRefs(input: PrepareLaunchApprovalRequestInput | ValidateLaunchApprovalDecisionRefInput): LaunchApprovalExpectedRefs {
  const semanticWatermark = computeLaunchApprovalSemanticWatermark(input);
  const selectedRecommendationWatermark = digest(
    input.selectedRecommendationRefs.map((ref) => ({
      recommendationId: ref.recommendationId,
      sourceRecordId: ref.sourceRecordId,
      sourceWatermark: ref.sourceWatermark,
      applicationStatus: ref.applicationStatus ?? null,
    })),
  );
  const limitationsWatermark = digest({
    limitations: input.limitations ?? [],
    contentApprovalLimitations: input.contentApprovalRef.limitations ?? [],
    aafContentApprovalLimitations: input.aafContentApprovalDecisionRef.limitations ?? [],
    clientApprovalLimitations: input.clientApprovalRef?.limitations ?? [],
    aafClientApprovalLimitations: input.aafClientApprovalDecisionRef?.limitations ?? [],
    proposalLimitations: input.proposalApprovalRef.limitations ?? [],
    implementationAuthorizationLimitations: input.implementationAuthorizationRef.limitations ?? [],
    improvedVersionReviewLimitations: input.improvedVersionReviewRef.limitations ?? [],
    blockerRefs: input.blockerRefs ?? [],
  });
  const launchChecklistWatermark = digest({
    preLaunchChecklistSnapshotRef: input.preLaunchChecklistSnapshotRef,
    launchChecklistRefs: input.launchChecklistRefs ?? [],
  });
  const subjectRefs = [
    roleRef("tenant", "tenants", text("tenantId", input.tenantId), text("tenantId", input.tenantId)),
    roleRef("client", "clients", text("clientId", input.clientId), text("clientId", input.clientId)),
    roleRef("site", "sites", text("siteId", input.siteId), text("siteId", input.siteId)),
    roleRef("single_site_migration", "gnr8_single_site_migrations", text("migrationId", input.migrationId), semanticWatermark),
    roleRef("launch_approval", "gnr8_single_site_launch_approvals", text("launchApprovalId", input.launchApprovalId), semanticWatermark),
    roleRef("content_approval", input.contentApprovalRef.sourceTable, input.contentApprovalRef.sourceRecordId, input.contentApprovalRef.sourceWatermark, input.contentApprovalRef.sourceVersion),
    ...(input.requireClientApproval && input.clientApprovalRef
      ? [
          roleRef(
            "client_approval_if_required",
            input.clientApprovalRef.sourceTable,
            input.clientApprovalRef.sourceRecordId,
            input.clientApprovalRef.sourceWatermark,
            input.clientApprovalRef.sourceVersion,
          ),
        ]
      : []),
    roleRef(
      "client_approval_requirement_policy",
      input.clientApprovalRequirementPolicyRef.sourceTable,
      input.clientApprovalRequirementPolicyRef.sourceRecordId,
      input.clientApprovalRequirementPolicyRef.sourceWatermark,
      input.clientApprovalRequirementPolicyRef.sourceVersion,
    ),
    roleRef("improved_candidate_site_version", input.improvedCandidateSiteVersionRef.sourceTable, input.improvedCandidateSiteVersionRef.sourceRecordId, input.improvedCandidateSiteVersionRef.sourceWatermark, input.improvedCandidateSiteVersionRef.sourceVersion),
    roleRef("improved_runtime_artifact", input.improvedRuntimeArtifactRef.sourceTable, input.improvedRuntimeArtifactRef.sourceRecordId, input.improvedRuntimeArtifactRef.sourceWatermark, input.improvedRuntimeArtifactRef.sourceVersion),
    roleRef("improved_version_review", input.improvedVersionReviewRef.sourceTable, input.improvedVersionReviewRef.sourceRecordId, input.improvedVersionReviewRef.sourceWatermark, input.improvedVersionReviewRef.sourceVersion),
    roleRef("proposal_plan", input.proposalPlanRef.sourceTable, input.proposalPlanRef.sourceRecordId, input.proposalPlanRef.sourceWatermark, input.proposalPlanRef.planVersion ?? input.proposalPlanRef.sourceVersion),
    roleRef("proposal_approval", "gnr8_aaf_approval_decisions", input.proposalApprovalRef.approvalDecisionId, input.proposalApprovalRef.sourceWatermark),
    roleRef("implementation_authorization", "gnr8_aaf_approval_decisions", input.implementationAuthorizationRef.approvalDecisionId, input.implementationAuthorizationRef.sourceWatermark),
    roleRef("improvement_execution_attempt", input.improvementExecutionAttemptRef.sourceTable, input.improvementExecutionAttemptRef.sourceRecordId, input.improvementExecutionAttemptRef.sourceWatermark, input.improvementExecutionAttemptRef.sourceVersion),
    roleRef("selected_recommendations", "gnr8_single_site_improvement_proposal_recommendations", input.proposalPlanRef.sourceRecordId, selectedRecommendationWatermark),
    roleRef("domain_readiness_placeholder_or_ref", input.domainReadinessPlaceholderOrRef.sourceTable, input.domainReadinessPlaceholderOrRef.sourceRecordId, input.domainReadinessPlaceholderOrRef.sourceWatermark, input.domainReadinessPlaceholderOrRef.sourceVersion),
    roleRef("billing_hosting_entitlement_placeholder_or_ref", input.billingHostingEntitlementPlaceholderOrRef.sourceTable, input.billingHostingEntitlementPlaceholderOrRef.sourceRecordId, input.billingHostingEntitlementPlaceholderOrRef.sourceWatermark, input.billingHostingEntitlementPlaceholderOrRef.sourceVersion),
    roleRef("rollback_readiness_placeholder_or_ref", input.rollbackReadinessPlaceholderOrRef.sourceTable, input.rollbackReadinessPlaceholderOrRef.sourceRecordId, input.rollbackReadinessPlaceholderOrRef.sourceWatermark, input.rollbackReadinessPlaceholderOrRef.sourceVersion),
    roleRef("publish_target_placeholder_or_ref", input.publishTargetPlaceholderOrRef.sourceTable, input.publishTargetPlaceholderOrRef.sourceRecordId, input.publishTargetPlaceholderOrRef.sourceWatermark, input.publishTargetPlaceholderOrRef.sourceVersion),
    roleRef("launch_checklist_refs", input.preLaunchChecklistSnapshotRef.sourceTable, input.preLaunchChecklistSnapshotRef.sourceRecordId, launchChecklistWatermark, input.preLaunchChecklistSnapshotRef.sourceVersion),
    roleRef("limitations", "gnr8_single_site_launch_approval_inputs", input.launchApprovalId, limitationsWatermark),
  ];

  const evidenceRefs = [
    evidenceRoleRef("content_approval_decision", "content_approval_decision", "Content approval decision", roleRef("content_approval_decision", "gnr8_aaf_approval_decisions", input.aafContentApprovalDecisionRef.approvalDecisionId, input.aafContentApprovalDecisionRef.sourceWatermark)),
    ...(input.requireClientApproval && input.aafClientApprovalDecisionRef
      ? [
          evidenceRoleRef(
            "client_approval_decision_if_required",
            "client_approval_decision",
            "Client approval decision",
            roleRef("client_approval_decision_if_required", "gnr8_aaf_approval_decisions", input.aafClientApprovalDecisionRef.approvalDecisionId, input.aafClientApprovalDecisionRef.sourceWatermark),
          ),
        ]
      : []),
    evidenceRoleRef("pre_launch_checklist_snapshot", "pre_launch_checklist_snapshot", "Pre-launch checklist snapshot", roleRef("pre_launch_checklist_snapshot", input.preLaunchChecklistSnapshotRef.sourceTable, input.preLaunchChecklistSnapshotRef.sourceRecordId, input.preLaunchChecklistSnapshotRef.sourceWatermark, input.preLaunchChecklistSnapshotRef.sourceVersion)),
    evidenceRoleRef("blocker_limitation_summary", "blocker_limitation_summary", "Blocker and limitation summary", roleRef("blocker_limitation_summary", input.blockerLimitationSummaryRef.sourceTable, input.blockerLimitationSummaryRef.sourceRecordId, input.blockerLimitationSummaryRef.sourceWatermark, input.blockerLimitationSummaryRef.sourceVersion)),
    evidenceRoleRef("domain_readiness_evidence_refs_if_available", "domain_readiness_placeholder_or_ref", "Domain readiness placeholder or refs", roleRef("domain_readiness_evidence_refs_if_available", input.domainReadinessPlaceholderOrRef.sourceTable, input.domainReadinessPlaceholderOrRef.sourceRecordId, input.domainReadinessPlaceholderOrRef.sourceWatermark, input.domainReadinessPlaceholderOrRef.sourceVersion)),
    evidenceRoleRef("billing_hosting_readiness_evidence_refs_if_available", "billing_hosting_entitlement_placeholder_or_ref", "Billing/hosting entitlement placeholder or refs", roleRef("billing_hosting_readiness_evidence_refs_if_available", input.billingHostingEntitlementPlaceholderOrRef.sourceTable, input.billingHostingEntitlementPlaceholderOrRef.sourceRecordId, input.billingHostingEntitlementPlaceholderOrRef.sourceWatermark, input.billingHostingEntitlementPlaceholderOrRef.sourceVersion)),
    evidenceRoleRef("rollback_readiness_evidence_refs_if_available", "rollback_readiness_placeholder_or_ref", "Rollback readiness placeholder or refs", roleRef("rollback_readiness_evidence_refs_if_available", input.rollbackReadinessPlaceholderOrRef.sourceTable, input.rollbackReadinessPlaceholderOrRef.sourceRecordId, input.rollbackReadinessPlaceholderOrRef.sourceWatermark, input.rollbackReadinessPlaceholderOrRef.sourceVersion)),
    evidenceRoleRef("publish_target_placeholder_or_ref", "publish_target_placeholder_or_ref", "Publish target placeholder or ref", roleRef("publish_target_placeholder_or_ref", input.publishTargetPlaceholderOrRef.sourceTable, input.publishTargetPlaceholderOrRef.sourceRecordId, input.publishTargetPlaceholderOrRef.sourceWatermark, input.publishTargetPlaceholderOrRef.sourceVersion)),
    evidenceRoleRef("operator_launch_notes", "operator_launch_notes", "Operator launch notes", roleRef("operator_launch_notes", input.operatorLaunchNotesRef.sourceTable, input.operatorLaunchNotesRef.sourceRecordId, input.operatorLaunchNotesRef.sourceWatermark, input.operatorLaunchNotesRef.sourceVersion)),
    ...(input.launchChecklistRefs ?? []).map((ref, index) =>
      evidenceRoleRef("launch_checklist_ref", "launch_checklist_ref", `Launch checklist ref ${index + 1}`, roleRef("launch_checklist_ref", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    ),
    ...(input.domainReadinessEvidenceRefs ?? []).map((ref, index) =>
      evidenceRoleRef("domain_readiness_evidence_ref", "domain_readiness_evidence_ref", `Domain readiness evidence ${index + 1}`, roleRef("domain_readiness_evidence_ref", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    ),
    ...(input.billingHostingReadinessEvidenceRefs ?? []).map((ref, index) =>
      evidenceRoleRef("billing_hosting_readiness_evidence_ref", "billing_hosting_readiness_evidence_ref", `Billing/hosting readiness evidence ${index + 1}`, roleRef("billing_hosting_readiness_evidence_ref", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    ),
    ...(input.rollbackReadinessEvidenceRefs ?? []).map((ref, index) =>
      evidenceRoleRef("rollback_readiness_evidence_ref", "rollback_readiness_evidence_ref", `Rollback readiness evidence ${index + 1}`, roleRef("rollback_readiness_evidence_ref", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    ),
    ...(input.smokeQaSummaryRefs ?? []).map((ref, index) =>
      evidenceRoleRef("smoke_qa_summary_refs_if_available", "smoke_qa_summary_ref", `Smoke QA summary ${index + 1}`, roleRef("smoke_qa_summary_refs_if_available", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    ),
    ...(input.auditTimelineRefs ?? []).map((ref, index) =>
      evidenceRoleRef("audit_timeline_refs", "audit_timeline_ref", `Audit timeline ref ${index + 1}`, roleRef("audit_timeline_refs", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    ),
  ];

  return { subjectRefs, evidenceRefs };
}

function tenantScope(input: { tenantId: string; clientId: string; siteId: string }): AafTenantScopeInput {
  return {
    tenantId: text("tenantId", input.tenantId),
    clientId: text("clientId", input.clientId),
    siteId: text("siteId", input.siteId),
    batchId: null,
    jobId: null,
    siteVersionId: null,
    domainId: null,
    costCenterId: null,
  };
}

function validationFailure(
  input: ValidateLaunchApprovalDecisionRefInput,
  status: LaunchApprovalAafValidationStatus,
  blockerCodes: string[],
  scope: string | null = null,
  subjectType: string | null = null,
  subjectId: string | null = null,
): LaunchApprovalAafValidationResult {
  return {
    valid: false,
    status,
    scope,
    subjectType,
    subjectId,
    approvalRequestId: input.approvalRequestId ?? null,
    approvalDecisionId: input.launchApprovalDecisionId ?? null,
    evidencePackageId: input.evidencePackageId ?? null,
    limitations: [],
    blockerCodes,
    semanticWatermark: computeLaunchApprovalSemanticWatermark(input),
  };
}

function rowText(row: Record<string, unknown> | null, field: string): string | null {
  return optionalText(row?.[field]);
}

function sameScope(input: { tenantId: string; clientId: string; siteId: string }, row: Record<string, unknown>): boolean {
  return (
    rowText(row, "tenant_id") === text("tenantId", input.tenantId) &&
    rowText(row, "client_id") === text("clientId", input.clientId) &&
    rowText(row, "site_id") === text("siteId", input.siteId) &&
    rowText(row, "batch_id") === null &&
    rowText(row, "job_id") === null &&
    rowText(row, "site_version_id") === null &&
    rowText(row, "domain_id") === null &&
    rowText(row, "cost_center_id") === null
  );
}

async function readOne(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<Record<string, unknown> | null> {
  const result = await client.query(sql, values);
  return result.rows[0] ?? null;
}

async function exists(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<boolean> {
  const result = await client.query(sql, values);
  return result.rows[0]?.exists === true;
}

function metadataRole(row: Record<string, unknown>, field: string): string | null {
  return optionalText(jsonObject(row.metadata_json)[field]) ?? optionalText(jsonObject(row.limitations_json)[field]);
}

function refMatches(row: Record<string, unknown>, expected: LaunchApprovalBridgeSourceRef & { role: string }, roleField: string): boolean {
  return (
    metadataRole(row, roleField) === expected.role &&
    rowText(row, "source_table") === expected.sourceTable &&
    rowText(row, "source_record_id") === expected.sourceRecordId &&
    rowText(row, "source_watermark") === expected.sourceWatermark
  );
}

async function hasAllRequestSubjectRefs(client: AafPgClient, approvalRequestId: string, refs: LaunchApprovalExpectedRefs["subjectRefs"]): Promise<boolean> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_subject_refs where approval_request_id = $1::uuid`, [approvalRequestId]);
  return refs.every((expected) => result.rows.some((row) => refMatches(row, expected, "bridgeSubjectRole")));
}

async function hasAllEvidenceRefs(client: AafPgClient, evidencePackageId: string, refs: LaunchApprovalExpectedRefs["evidenceRefs"]): Promise<boolean> {
  const sourceRefs = await client.query(`select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`, [evidencePackageId]);
  return refs.every((expected) => sourceRefs.rows.some((row) => refMatches(row, expected, "bridgeEvidenceRole")));
}

async function hasLaunchApprovalPolicyEvaluation(client: AafPgClient, input: {
  approvalRequestId: string | null;
  evidencePackageId: string;
  policyVersion: string;
  subjectType: string;
  subjectId: string;
}): Promise<boolean> {
  const result = await client.query(
    `
    select exists(
      select 1
      from public.gnr8_aaf_approval_policy_evaluations
      where approval_request_id = $1::uuid
        and evidence_package_id = $2::uuid
        and policy_version = $3
        and scope = $4
        and action_key = $5
        and subject_type = $6
        and subject_id = $7
        and result = 'approval_required'
    )
    `,
    [
      input.approvalRequestId,
      input.evidencePackageId,
      input.policyVersion,
      AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
      AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
      input.subjectType,
      input.subjectId,
    ],
  );
  return result.rows[0]?.exists === true;
}

export class SingleSiteLaunchApprovalAafBridge {
  constructor(private readonly writer: BridgeWriter = new AafWriterRepository()) {}

  async prepareLaunchApprovalRequest(input: PrepareLaunchApprovalRequestInput): Promise<PreparedLaunchApprovalRequest> {
    assertPrepareInput(input);
    const scope = tenantScope(input);
    const subject = {
      subjectType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
      subjectId: text("launchApprovalId", input.launchApprovalId),
    };
    const sourceWatermark = computeLaunchApprovalSemanticWatermark(input);
    const contentHash = digest({ scope, subject, sourceWatermark });
    const limitations = [
      ...jsonArray(input.limitations),
      ...jsonArray(input.contentApprovalRef.limitations),
      ...jsonArray(input.aafContentApprovalDecisionRef.limitations),
      ...jsonArray(input.clientApprovalRef?.limitations),
      ...jsonArray(input.aafClientApprovalDecisionRef?.limitations),
      ...jsonArray(input.proposalApprovalRef.limitations),
      ...jsonArray(input.implementationAuthorizationRef.limitations),
      ...jsonArray(input.improvedVersionReviewRef.limitations),
    ];
    const refs = buildExpectedLaunchApprovalRefs(input);

    const evidenceTx = await this.writer.createEvidencePackageTransaction({
      evidencePackage: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:launch-approval-evidence`,
        packageType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE,
        status: "created",
        createdByActorType: input.actor.actorType,
        createdByActorId: input.actor.actorId,
        sourceWatermark,
        freshnessLabel: "fresh",
        contentHash,
        limitationsJson: {
          limitations,
          blockerRefs: input.blockerRefs ?? [],
          operatorLaunchNotes: input.operatorLaunchNotes ?? [],
          contentApprovalId: input.contentApprovalRef.sourceRecordId,
          clientApprovalRequired: input.requireClientApproval,
          clientApprovalId: input.clientApprovalRef?.sourceRecordId ?? null,
          launchApprovalId: input.launchApprovalId,
          readinessRefsAreEvidenceOnly: true,
          nonExecuting: true,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
      },
      sourceRefs: refs.evidenceRefs.map((ref) => ({
        sourceSystem: "gnr8",
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        sourceVersion: optionalText(ref.sourceVersion),
        sourceWatermark: ref.sourceWatermark,
        hash: ref.contentHash ?? hashRef(ref),
        metadataJson: { ...(ref.metadataJson ?? {}), bridgeEvidenceRole: ref.role, nonExecuting: true },
      })),
      items: refs.evidenceRefs.map((ref) => ({
        itemType: ref.itemType,
        itemRef: `${ref.role}:${ref.sourceRecordId}`,
        itemHash: ref.contentHash ?? hashRef({ role: ref.role, sourceRecordId: ref.sourceRecordId, sourceWatermark: ref.sourceWatermark }),
        mediaType: "application/vnd.gnr8.ref+json",
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        displayName: ref.displayName,
        limitationsJson: { bridgeEvidenceRole: ref.role },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
      })),
      freshnessCheck: {
        policyVersion: input.policyVersion,
        result: "fresh",
        checkedByActorType: "system",
        checkedByActorId: "single-site-launch-approval-aaf-bridge",
        currentSourceWatermark: sourceWatermark,
        idempotencyKey: `${input.idempotencyKey}:launch-approval-evidence:freshness`,
      },
    });

    const requestTx = await this.writer.createApprovalRequestTransaction({
      approvalRequest: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:launch-approval-request`,
        scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
        requesterActorType: input.actor.actorType,
        requesterActorId: input.actor.actorId,
        requesterRole: input.actor.actorRole,
        status: "requested",
        policyVersion: input.policyVersion,
        requestedExpiresAt: input.requestedExpiresAt,
        reason: `Request non-executing single-site launch approval for launch approval ${input.launchApprovalId}.`,
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
      },
      subjectRefs: refs.subjectRefs.map((ref) => ({
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceSystem: "gnr8",
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        sourceVersion: optionalText(ref.sourceVersion),
        sourceWatermark: ref.sourceWatermark,
        metadataJson: { ...(ref.metadataJson ?? {}), bridgeSubjectRole: ref.role, nonExecuting: true },
      })),
      evidenceLink: {
        evidencePackageId: evidenceTx.evidencePackage.id,
        linkRole: "launch_approval_request_evidence",
        sourceNote: "Non-executing bridge evidence package.",
        idempotencyKey: `${input.idempotencyKey}:launch-approval-request:evidence-link`,
      },
      policyEvaluation: {
        ...scope,
        policyVersion: input.policyVersion,
        result: "approval_required",
        scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
        actionKey: AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        evidencePackageId: evidenceTx.evidencePackage.id,
        blockerCodes: [],
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:launch-approval-request:policy`,
      },
      requestedAuditEvent: {
        ...scope,
        eventName: "single_site.launch_approval.requested",
        eventFamily: "approval",
        severity: "notice",
        replayClass: AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE],
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceRefJson: { migrationId: input.migrationId, launchApprovalId: input.launchApprovalId, nonExecuting: true },
        payloadJson: {
          scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
          action: AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
          contentApprovalRef: input.contentApprovalRef.sourceRecordId,
          aafContentApprovalDecisionRef: input.aafContentApprovalDecisionRef.approvalDecisionId,
          clientApprovalRequired: input.requireClientApproval,
          clientApprovalRef: input.clientApprovalRef?.sourceRecordId ?? null,
          aafClientApprovalDecisionRef: input.aafClientApprovalDecisionRef?.approvalDecisionId ?? null,
          improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef.sourceRecordId,
          improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef.sourceRecordId,
          domainReadinessPlaceholderOrRef: input.domainReadinessPlaceholderOrRef.sourceRecordId,
          billingHostingEntitlementPlaceholderOrRef: input.billingHostingEntitlementPlaceholderOrRef.sourceRecordId,
          rollbackReadinessPlaceholderOrRef: input.rollbackReadinessPlaceholderOrRef.sourceRecordId,
          publishTargetPlaceholderOrRef: input.publishTargetPlaceholderOrRef.sourceRecordId,
          nonExecuting: true,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:launch-approval-request:audit`,
      },
    });

    return {
      scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      semanticWatermark: sourceWatermark,
      evidencePackage: evidenceTx.evidencePackage,
      approvalRequest: requestTx.approvalRequest,
      subjectRefs: requestTx.subjectRefs,
      evidenceSourceRefs: evidenceTx.sourceRefs,
      evidenceItems: evidenceTx.items,
      evidenceLink: requestTx.evidenceLink,
      policyEvaluation: requestTx.policyEvaluation,
      requestedAuditEvent: requestTx.auditEvent,
      reusedExisting:
        Boolean(evidenceTx.evidencePackage.created_at) &&
        Boolean(requestTx.approvalRequest.created_at) &&
        requestTx.approvalRequest.idempotency_key === `${input.idempotencyKey}:launch-approval-request`,
    };
  }

  async validateLaunchApprovalDecisionRef(input: ValidateLaunchApprovalDecisionRefInput): Promise<LaunchApprovalAafValidationResult> {
    const decisionId = text("launchApprovalDecisionId", input.launchApprovalDecisionId);
    assertSourceRef("contentApprovalRef", input.contentApprovalRef);
    text("aafContentApprovalDecisionRef.approvalDecisionId", input.aafContentApprovalDecisionRef?.approvalDecisionId);
    text("aafContentApprovalDecisionRef.sourceWatermark", input.aafContentApprovalDecisionRef?.sourceWatermark);
    assertSourceRef("clientApprovalRequirementPolicyRef", input.clientApprovalRequirementPolicyRef);
    if (input.requireClientApproval) {
      assertSourceRef("clientApprovalRef", input.clientApprovalRef);
      assertApprovedContent("clientApprovalRef.approvalStatus", String(input.clientApprovalRef?.approvalStatus));
      text("aafClientApprovalDecisionRef.approvalDecisionId", input.aafClientApprovalDecisionRef?.approvalDecisionId);
      text("aafClientApprovalDecisionRef.sourceWatermark", input.aafClientApprovalDecisionRef?.sourceWatermark);
    } else if (input.clientApprovalRef || input.aafClientApprovalDecisionRef) {
      return validationFailure(input, "invalid", ["client_approval_supplied_but_not_required"]);
    }
    assertSourceRef("improvedVersionReviewRef", input.improvedVersionReviewRef);
    assertSourceRef("improvedCandidateSiteVersionRef", input.improvedCandidateSiteVersionRef);
    assertSourceRef("improvedRuntimeArtifactRef", input.improvedRuntimeArtifactRef);
    assertSourceRef("preLaunchChecklistSnapshotRef", input.preLaunchChecklistSnapshotRef);
    assertSourceRef("blockerLimitationSummaryRef", input.blockerLimitationSummaryRef);
    assertSourceRef("domainReadinessPlaceholderOrRef", input.domainReadinessPlaceholderOrRef);
    assertSourceRef("billingHostingEntitlementPlaceholderOrRef", input.billingHostingEntitlementPlaceholderOrRef);
    assertSourceRef("rollbackReadinessPlaceholderOrRef", input.rollbackReadinessPlaceholderOrRef);
    assertSourceRef("publishTargetPlaceholderOrRef", input.publishTargetPlaceholderOrRef);
    assertSourceRef("operatorLaunchNotesRef", input.operatorLaunchNotesRef);
    const expectedWatermark = computeLaunchApprovalSemanticWatermark(input);
    const subjectType = AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE;
    const subjectId = text("launchApprovalId", input.launchApprovalId);
    const refs = buildExpectedLaunchApprovalRefs(input);

    return this.writer.withTransaction(async (tx) => {
      const decision = await readOne(tx.client, `select * from public.gnr8_aaf_approval_decisions where id = $1::uuid`, [decisionId]);
      if (!decision) return validationFailure(input, "missing", ["approval_decision_missing"]);

      const request = await readOne(tx.client, `select * from public.gnr8_aaf_approval_requests where id = $1::uuid`, [rowText(decision, "approval_request_id")]);
      if (!request) return validationFailure(input, "missing", ["approval_request_missing"]);

      const requestScope = rowText(request, "scope");
      const requestSubjectType = rowText(request, "subject_type");
      const requestSubjectId = rowText(request, "subject_id");
      const requestId = rowText(request, "id");
      const evidencePackageId = rowText(decision, "evidence_package_id");
      const decisionStatus = rowText(decision, "status");
      const baseResult = {
        scope: requestScope,
        subjectType: requestSubjectType,
        subjectId: requestSubjectId,
        approvalRequestId: requestId,
        approvalDecisionId: decisionId,
        evidencePackageId,
        semanticWatermark: expectedWatermark,
      };

      if (requestScope !== AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_scope_mismatch"] };
      }
      if (!sameScope(input, request) || requestSubjectType !== subjectType || requestSubjectId !== subjectId) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_subject_mismatch"] };
      }
      if (input.approvalRequestId && requestId !== input.approvalRequestId) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_request_mismatch"] };
      }
      if (rowText(request, "status") !== "requested") {
        return { ...baseResult, valid: false, status: rowText(request, "status") === "cancelled" ? ("cancelled" as const) : ("invalid" as const), limitations: [], blockerCodes: [`approval_request_${rowText(request, "status") ?? "invalid"}`] };
      }
      if (rowText(request, "policy_version") !== text("policyVersion", input.policyVersion) || rowText(decision, "policy_version") !== text("policyVersion", input.policyVersion)) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["policy_version_mismatch"] };
      }
      if (!["granted", "granted_with_limitations"].includes(String(decisionStatus))) {
        const status = ["rejected", "revoked", "expired", "superseded", "cancelled"].includes(String(decisionStatus))
          ? (decisionStatus as LaunchApprovalAafValidationStatus)
          : "invalid";
        return { ...baseResult, valid: false, status, limitations: [], blockerCodes: [`approval_${decisionStatus ?? "invalid"}`] };
      }
      if (!evidencePackageId) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_evidence_missing"] };
      }
      if (input.evidencePackageId && evidencePackageId !== input.evidencePackageId) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["approval_evidence_mismatch"] };
      }
      if (
        !(await hasLaunchApprovalPolicyEvaluation(tx.client, {
          approvalRequestId: requestId,
          evidencePackageId,
          policyVersion: text("policyVersion", input.policyVersion),
          subjectType,
          subjectId,
        }))
      ) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_action_policy_evaluation_missing_or_mismatched"] };
      }

      const evidence = await readOne(tx.client, `select * from public.gnr8_aaf_evidence_packages where id = $1::uuid`, [evidencePackageId]);
      if (!evidence) return { ...baseResult, valid: false, status: "missing" as const, limitations: [], blockerCodes: ["evidence_package_missing"] };
      if (
        rowText(evidence, "package_type") !== AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE ||
        !sameScope(input, evidence) ||
        rowText(evidence, "subject_type") !== subjectType ||
        rowText(evidence, "subject_id") !== subjectId
      ) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["evidence_scope_or_subject_mismatch"] };
      }
      if (["invalid", "superseded"].includes(String(rowText(evidence, "status")))) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: [`evidence_${rowText(evidence, "status")}`] };
      }
      if (rowText(evidence, "source_watermark") !== expectedWatermark) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["evidence_watermark_mismatch"] };
      }
      const now = Date.now();
      const evidenceExpiresAt = optionalText(evidence.expires_at);
      const decisionExpiresAt = optionalText(decision.expires_at);
      if ((evidenceExpiresAt && new Date(evidenceExpiresAt).getTime() <= now) || (decisionExpiresAt && new Date(decisionExpiresAt).getTime() <= now)) {
        return { ...baseResult, valid: false, status: "expired" as const, limitations: [], blockerCodes: ["approval_or_evidence_expired"] };
      }
      if (await exists(tx.client, `select exists(select 1 from public.gnr8_aaf_approval_revocations where approval_decision_id = $1::uuid)`, [decisionId])) {
        return { ...baseResult, valid: false, status: "revoked" as const, limitations: [], blockerCodes: ["approval_revocation_linked"] };
      }
      if (await exists(tx.client, `select exists(select 1 from public.gnr8_aaf_approval_supersession_links where superseded_decision_id = $1::uuid)`, [decisionId])) {
        return { ...baseResult, valid: false, status: "superseded" as const, limitations: [], blockerCodes: ["approval_supersession_linked"] };
      }
      if (await exists(tx.client, `select exists(select 1 from public.gnr8_aaf_evidence_package_supersession where superseded_package_id = $1::uuid)`, [evidencePackageId])) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["evidence_supersession_linked"] };
      }
      const freshness = await readOne(
        tx.client,
        `
        select *
        from public.gnr8_aaf_evidence_package_freshness_checks
        where evidence_package_id = $1::uuid
        order by checked_at desc, created_at desc
        limit 1
        `,
        [evidencePackageId],
      );
      if (!freshness) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["freshness_missing"] };
      }
      if (rowText(freshness, "result") !== "fresh") {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: [`freshness_${rowText(freshness, "result")}`] };
      }
      const freshnessExpiresAt = optionalText(freshness.expires_at);
      if (freshnessExpiresAt && new Date(freshnessExpiresAt).getTime() <= now) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["freshness_expired"] };
      }
      if (rowText(freshness, "current_source_watermark") !== expectedWatermark) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["freshness_watermark_mismatch"] };
      }
      if (!(await hasAllRequestSubjectRefs(tx.client, requestId ?? "", refs.subjectRefs))) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["required_subject_refs_missing_or_mismatched"] };
      }
      if (!(await hasAllEvidenceRefs(tx.client, evidencePackageId, refs.evidenceRefs))) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["required_evidence_refs_missing_or_mismatched"] };
      }
      const evidenceLink = await exists(
        tx.client,
        `select exists(select 1 from public.gnr8_aaf_approval_evidence_links where approval_request_id = $1::uuid and evidence_package_id = $2::uuid)`,
        [requestId, evidencePackageId],
      );
      if (!evidenceLink) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_evidence_link_missing"] };
      }

      const limitationsJson = jsonObject(evidence.limitations_json);
      const limitations = jsonArray(limitationsJson.limitations);
      if (decisionStatus === "granted_with_limitations" && limitations.length === 0) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["limited_grant_limitations_missing"] };
      }
      return {
        ...baseResult,
        valid: true,
        status: decisionStatus as "granted" | "granted_with_limitations",
        limitations,
        blockerCodes: [],
      };
    });
  }
}

export function prepareLaunchApprovalRequest(input: PrepareLaunchApprovalRequestInput): Promise<PreparedLaunchApprovalRequest> {
  return new SingleSiteLaunchApprovalAafBridge().prepareLaunchApprovalRequest(input);
}

export function validateLaunchApprovalDecisionRef(input: ValidateLaunchApprovalDecisionRefInput): Promise<LaunchApprovalAafValidationResult> {
  return new SingleSiteLaunchApprovalAafBridge().validateLaunchApprovalDecisionRef(input);
}
