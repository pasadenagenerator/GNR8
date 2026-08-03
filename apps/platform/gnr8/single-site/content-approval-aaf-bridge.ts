import "server-only";

import { createHash } from "node:crypto";

import {
  AAF_SCOPE_REPLAY_CLASS,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import {
  AafWriterRepository,
  type AafActorType,
  type AafJsonObject,
  type AafPgClient,
  type AafRecord,
  type AafTenantScopeInput,
} from "../aaf/aaf-writer-repository";

export type SingleSiteContentApprovalActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type ContentApprovalBridgeSourceRef = {
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | number | null;
  sourceWatermark: string;
  contentHash?: string | null;
  metadataJson?: AafJsonObject;
};

export type ContentApprovalBridgeReviewRef = ContentApprovalBridgeSourceRef & {
  reviewStatus: "accepted" | "accepted_with_limitations" | string;
  limitations?: unknown[];
};

export type ContentApprovalBridgeAafApprovalRef = {
  approvalRequestId?: string | null;
  approvalDecisionId: string;
  evidencePackageId?: string | null;
  sourceWatermark: string;
  limitations?: unknown[];
};

export type ContentApprovalSelectedRecommendationRef = ContentApprovalBridgeSourceRef & {
  recommendationId: string;
  recommendationKey?: string | null;
  applicationStatus?: string | null;
};

export type PrepareContentApprovalRequestInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  contentApprovalId: string;
  improvedVersionReviewRef: ContentApprovalBridgeReviewRef;
  improvedCandidateSiteVersionRef: ContentApprovalBridgeSourceRef;
  improvedRuntimeArtifactRef: ContentApprovalBridgeSourceRef;
  proposalPlanRef: ContentApprovalBridgeSourceRef & { planVersion?: string | number | null };
  proposalApprovalRef: ContentApprovalBridgeAafApprovalRef;
  implementationAuthorizationRef: ContentApprovalBridgeAafApprovalRef;
  improvementExecutionAttemptRef: ContentApprovalBridgeSourceRef;
  selectedRecommendationRefs: ContentApprovalSelectedRecommendationRef[];
  sourceEvidenceReviewRef: ContentApprovalBridgeReviewRef;
  cloneReviewRef: ContentApprovalBridgeReviewRef;
  cloneSiteVersionRef: ContentApprovalBridgeSourceRef;
  cloneRuntimeArtifactRef: ContentApprovalBridgeSourceRef;
  improvedCandidateRenderedSnapshotRef: ContentApprovalBridgeSourceRef;
  improvedCandidateContentSnapshotRef: ContentApprovalBridgeSourceRef;
  improvedCandidateMetadataSnapshotRef: ContentApprovalBridgeSourceRef;
  recommendationCoverageSummaryRef: ContentApprovalBridgeSourceRef;
  seoAeoMetadataSummaryRef: ContentApprovalBridgeSourceRef;
  headingsBodyCopyCtaInternalLinkReviewSummaryRef: ContentApprovalBridgeSourceRef;
  accessibilityContentCaveatsRef: ContentApprovalBridgeSourceRef;
  structuredDataSummaryRef: ContentApprovalBridgeSourceRef;
  legalComplianceNotesRef: ContentApprovalBridgeSourceRef;
  knownLimitationsRef: ContentApprovalBridgeSourceRef;
  unresolvedNotAppliedRecommendationsRef: ContentApprovalBridgeSourceRef;
  operatorReviewNotesRef: ContentApprovalBridgeSourceRef;
  limitations?: unknown[];
  unresolvedNotAppliedRecommendationRefs?: ContentApprovalBridgeSourceRef[];
  auditTimelineRefs?: ContentApprovalBridgeSourceRef[];
  operatorNotes?: unknown[];
  actor: SingleSiteContentApprovalActor;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  policyVersion: string;
  requestedExpiresAt?: string | null;
};

export type PreparedContentApprovalRequest = {
  scope: typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE;
  subjectType: typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE;
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

export type ValidateContentApprovalDecisionRefInput = Omit<
  PrepareContentApprovalRequestInput,
  "actor" | "correlationId" | "causationId" | "requestId" | "idempotencyKey" | "requestedExpiresAt"
> & {
  contentApprovalDecisionId: string;
  approvalRequestId?: string | null;
  evidencePackageId?: string | null;
};

export type ContentApprovalAafValidationStatus =
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

export type ContentApprovalAafValidationResult = {
  valid: boolean;
  status: ContentApprovalAafValidationStatus;
  scope: typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE | string | null;
  subjectType: typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE | string | null;
  subjectId: string | null;
  approvalRequestId: string | null;
  approvalDecisionId: string | null;
  evidencePackageId: string | null;
  limitations: unknown[];
  blockerCodes: string[];
  semanticWatermark: string;
};

type BridgeWriter = Pick<AafWriterRepository, "createEvidencePackageTransaction" | "createApprovalRequestTransaction" | "withTransaction">;

export type ContentApprovalExpectedRefs = {
  subjectRefs: Array<ContentApprovalBridgeSourceRef & { role: string }>;
  evidenceRefs: Array<ContentApprovalBridgeSourceRef & { role: string; itemType: string; displayName: string }>;
};

export type ContentApprovalSemanticInput = Omit<ValidateContentApprovalDecisionRefInput, "contentApprovalDecisionId" | "approvalRequestId" | "evidencePackageId">;

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
): ContentApprovalBridgeSourceRef & { role: string } {
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
  ref: ContentApprovalBridgeSourceRef & { role: string },
): ContentApprovalBridgeSourceRef & { role: string; itemType: string; displayName: string } {
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

export function computeContentApprovalSemanticWatermark(input: ContentApprovalSemanticInput): string {
  return `single-site-content-approval:${digest({
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    contentApprovalId: input.contentApprovalId,
    improvedVersionReviewRef: input.improvedVersionReviewRef,
    improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef,
    improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef,
    proposalPlanRef: input.proposalPlanRef,
    proposalApprovalRef: input.proposalApprovalRef,
    implementationAuthorizationRef: input.implementationAuthorizationRef,
    improvementExecutionAttemptRef: input.improvementExecutionAttemptRef,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    sourceEvidenceReviewRef: input.sourceEvidenceReviewRef,
    cloneReviewRef: input.cloneReviewRef,
    cloneSiteVersionRef: input.cloneSiteVersionRef,
    cloneRuntimeArtifactRef: input.cloneRuntimeArtifactRef,
    improvedCandidateRenderedSnapshotRef: input.improvedCandidateRenderedSnapshotRef,
    improvedCandidateContentSnapshotRef: input.improvedCandidateContentSnapshotRef,
    improvedCandidateMetadataSnapshotRef: input.improvedCandidateMetadataSnapshotRef,
    recommendationCoverageSummaryRef: input.recommendationCoverageSummaryRef,
    seoAeoMetadataSummaryRef: input.seoAeoMetadataSummaryRef,
    headingsBodyCopyCtaInternalLinkReviewSummaryRef: input.headingsBodyCopyCtaInternalLinkReviewSummaryRef,
    accessibilityContentCaveatsRef: input.accessibilityContentCaveatsRef,
    structuredDataSummaryRef: input.structuredDataSummaryRef,
    legalComplianceNotesRef: input.legalComplianceNotesRef,
    knownLimitationsRef: input.knownLimitationsRef,
    unresolvedNotAppliedRecommendationsRef: input.unresolvedNotAppliedRecommendationsRef,
    unresolvedNotAppliedRecommendationRefs: input.unresolvedNotAppliedRecommendationRefs ?? [],
    operatorReviewNotesRef: input.operatorReviewNotesRef,
    limitations: input.limitations ?? [],
    auditTimelineRefs: input.auditTimelineRefs ?? [],
    operatorNotes: input.operatorNotes ?? [],
    policyVersion: input.policyVersion,
  })}`;
}

function assertSourceRef(field: string, ref: ContentApprovalBridgeSourceRef | null | undefined): void {
  text(`${field}.sourceTable`, ref?.sourceTable);
  text(`${field}.sourceRecordId`, ref?.sourceRecordId);
  text(`${field}.sourceWatermark`, ref?.sourceWatermark);
}

function assertPrepareInput(input: PrepareContentApprovalRequestInput): void {
  text("tenantId", input.tenantId);
  text("clientId", input.clientId);
  text("siteId", input.siteId);
  text("migrationId", input.migrationId);
  text("contentApprovalId", input.contentApprovalId);
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
  assertSourceRef("sourceEvidenceReviewRef", input.sourceEvidenceReviewRef);
  assertAcceptedReview("sourceEvidenceReviewRef.reviewStatus", String(input.sourceEvidenceReviewRef?.reviewStatus));
  assertSourceRef("cloneReviewRef", input.cloneReviewRef);
  assertAcceptedReview("cloneReviewRef.reviewStatus", String(input.cloneReviewRef?.reviewStatus));
  assertSourceRef("cloneSiteVersionRef", input.cloneSiteVersionRef);
  assertSourceRef("cloneRuntimeArtifactRef", input.cloneRuntimeArtifactRef);
  assertSourceRef("improvedCandidateRenderedSnapshotRef", input.improvedCandidateRenderedSnapshotRef);
  assertSourceRef("improvedCandidateContentSnapshotRef", input.improvedCandidateContentSnapshotRef);
  assertSourceRef("improvedCandidateMetadataSnapshotRef", input.improvedCandidateMetadataSnapshotRef);
  assertSourceRef("recommendationCoverageSummaryRef", input.recommendationCoverageSummaryRef);
  assertSourceRef("seoAeoMetadataSummaryRef", input.seoAeoMetadataSummaryRef);
  assertSourceRef("headingsBodyCopyCtaInternalLinkReviewSummaryRef", input.headingsBodyCopyCtaInternalLinkReviewSummaryRef);
  assertSourceRef("accessibilityContentCaveatsRef", input.accessibilityContentCaveatsRef);
  assertSourceRef("structuredDataSummaryRef", input.structuredDataSummaryRef);
  assertSourceRef("legalComplianceNotesRef", input.legalComplianceNotesRef);
  assertSourceRef("knownLimitationsRef", input.knownLimitationsRef);
  assertSourceRef("unresolvedNotAppliedRecommendationsRef", input.unresolvedNotAppliedRecommendationsRef);
  assertSourceRef("operatorReviewNotesRef", input.operatorReviewNotesRef);
  text("actor.actorType", input.actor?.actorType);
  text("actor.actorId", input.actor?.actorId);
  text("actor.actorRole", input.actor?.actorRole);
  text("correlationId", input.correlationId);
  text("idempotencyKey", input.idempotencyKey);
  text("policyVersion", input.policyVersion);
}

export function buildExpectedContentApprovalRefs(input: PrepareContentApprovalRequestInput | ValidateContentApprovalDecisionRefInput): ContentApprovalExpectedRefs {
  const semanticWatermark = computeContentApprovalSemanticWatermark(input);
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
    proposalLimitations: input.proposalApprovalRef.limitations ?? [],
    implementationAuthorizationLimitations: input.implementationAuthorizationRef.limitations ?? [],
    improvedVersionReviewLimitations: input.improvedVersionReviewRef.limitations ?? [],
    sourceEvidenceLimitations: input.sourceEvidenceReviewRef.limitations ?? [],
    cloneLimitations: input.cloneReviewRef.limitations ?? [],
  });
  const subjectRefs = [
    roleRef("tenant", "tenants", text("tenantId", input.tenantId), text("tenantId", input.tenantId)),
    roleRef("client", "clients", text("clientId", input.clientId), text("clientId", input.clientId)),
    roleRef("site", "sites", text("siteId", input.siteId), text("siteId", input.siteId)),
    roleRef("single_site_migration", "gnr8_single_site_migrations", text("migrationId", input.migrationId), semanticWatermark),
    roleRef("content_approval", "gnr8_single_site_content_approvals", text("contentApprovalId", input.contentApprovalId), semanticWatermark),
    roleRef(
      "improved_version_review",
      input.improvedVersionReviewRef.sourceTable,
      input.improvedVersionReviewRef.sourceRecordId,
      input.improvedVersionReviewRef.sourceWatermark,
      input.improvedVersionReviewRef.sourceVersion,
    ),
    roleRef("improved_version_review_status", input.improvedVersionReviewRef.sourceTable, input.improvedVersionReviewRef.sourceRecordId, input.improvedVersionReviewRef.sourceWatermark),
    roleRef("improved_version_review_watermark", input.improvedVersionReviewRef.sourceTable, input.improvedVersionReviewRef.sourceRecordId, input.improvedVersionReviewRef.sourceWatermark),
    roleRef(
      "improved_candidate_site_version",
      input.improvedCandidateSiteVersionRef.sourceTable,
      input.improvedCandidateSiteVersionRef.sourceRecordId,
      input.improvedCandidateSiteVersionRef.sourceWatermark,
      input.improvedCandidateSiteVersionRef.sourceVersion,
    ),
    roleRef("improved_candidate_site_version_watermark", input.improvedCandidateSiteVersionRef.sourceTable, input.improvedCandidateSiteVersionRef.sourceRecordId, input.improvedCandidateSiteVersionRef.sourceWatermark),
    roleRef(
      "improved_runtime_artifact",
      input.improvedRuntimeArtifactRef.sourceTable,
      input.improvedRuntimeArtifactRef.sourceRecordId,
      input.improvedRuntimeArtifactRef.sourceWatermark,
      input.improvedRuntimeArtifactRef.sourceVersion,
    ),
    roleRef("improved_runtime_artifact_watermark", input.improvedRuntimeArtifactRef.sourceTable, input.improvedRuntimeArtifactRef.sourceRecordId, input.improvedRuntimeArtifactRef.sourceWatermark),
    roleRef("proposal_plan", input.proposalPlanRef.sourceTable, input.proposalPlanRef.sourceRecordId, input.proposalPlanRef.sourceWatermark, input.proposalPlanRef.planVersion ?? input.proposalPlanRef.sourceVersion),
    roleRef("proposal_approval", "gnr8_aaf_approval_decisions", input.proposalApprovalRef.approvalDecisionId, input.proposalApprovalRef.sourceWatermark),
    roleRef("implementation_authorization", "gnr8_aaf_approval_decisions", input.implementationAuthorizationRef.approvalDecisionId, input.implementationAuthorizationRef.sourceWatermark),
    roleRef("improvement_execution_attempt", input.improvementExecutionAttemptRef.sourceTable, input.improvementExecutionAttemptRef.sourceRecordId, input.improvementExecutionAttemptRef.sourceWatermark, input.improvementExecutionAttemptRef.sourceVersion),
    roleRef("selected_recommendations", "gnr8_single_site_improvement_proposal_recommendations", input.proposalPlanRef.sourceRecordId, selectedRecommendationWatermark),
    roleRef("selected_recommendation_watermarks", "gnr8_single_site_improvement_proposal_recommendations", input.proposalPlanRef.sourceRecordId, selectedRecommendationWatermark),
    roleRef("source_evidence_review", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark, input.sourceEvidenceReviewRef.sourceVersion),
    roleRef("source_evidence_review_status", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark),
    roleRef("source_evidence_review_watermark", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark),
    roleRef("clone_review", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark, input.cloneReviewRef.sourceVersion),
    roleRef("clone_review_status", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark),
    roleRef("clone_review_watermark", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark),
    roleRef("clone_site_version", input.cloneSiteVersionRef.sourceTable, input.cloneSiteVersionRef.sourceRecordId, input.cloneSiteVersionRef.sourceWatermark, input.cloneSiteVersionRef.sourceVersion),
    roleRef("clone_runtime_artifact", input.cloneRuntimeArtifactRef.sourceTable, input.cloneRuntimeArtifactRef.sourceRecordId, input.cloneRuntimeArtifactRef.sourceWatermark, input.cloneRuntimeArtifactRef.sourceVersion),
    roleRef("limitations", "gnr8_single_site_content_approval_inputs", input.contentApprovalId, limitationsWatermark),
  ];

  const evidenceRefs = [
    evidenceRoleRef("improved_candidate_rendered_snapshot", "improved_candidate_rendered_snapshot", "Improved candidate rendered snapshot", roleRef("improved_candidate_rendered_snapshot", input.improvedCandidateRenderedSnapshotRef.sourceTable, input.improvedCandidateRenderedSnapshotRef.sourceRecordId, input.improvedCandidateRenderedSnapshotRef.sourceWatermark, input.improvedCandidateRenderedSnapshotRef.sourceVersion)),
    evidenceRoleRef("improved_candidate_content_snapshot", "improved_candidate_content_snapshot", "Improved candidate content snapshot", roleRef("improved_candidate_content_snapshot", input.improvedCandidateContentSnapshotRef.sourceTable, input.improvedCandidateContentSnapshotRef.sourceRecordId, input.improvedCandidateContentSnapshotRef.sourceWatermark, input.improvedCandidateContentSnapshotRef.sourceVersion)),
    evidenceRoleRef("improved_candidate_metadata_snapshot", "improved_candidate_metadata_snapshot", "Improved candidate metadata snapshot", roleRef("improved_candidate_metadata_snapshot", input.improvedCandidateMetadataSnapshotRef.sourceTable, input.improvedCandidateMetadataSnapshotRef.sourceRecordId, input.improvedCandidateMetadataSnapshotRef.sourceWatermark, input.improvedCandidateMetadataSnapshotRef.sourceVersion)),
    evidenceRoleRef("recommendation_coverage_summary", "recommendation_coverage_summary", "Recommendation coverage summary", roleRef("recommendation_coverage_summary", input.recommendationCoverageSummaryRef.sourceTable, input.recommendationCoverageSummaryRef.sourceRecordId, input.recommendationCoverageSummaryRef.sourceWatermark, input.recommendationCoverageSummaryRef.sourceVersion)),
    evidenceRoleRef("selected_recommendation_application_status", "selected_recommendation_application_status", "Selected recommendation application status", roleRef("selected_recommendation_application_status", "gnr8_single_site_improvement_proposal_recommendations", input.proposalPlanRef.sourceRecordId, selectedRecommendationWatermark)),
    evidenceRoleRef("seo_aeo_metadata_summary", "seo_aeo_metadata_summary", "SEO and AEO metadata summary", roleRef("seo_aeo_metadata_summary", input.seoAeoMetadataSummaryRef.sourceTable, input.seoAeoMetadataSummaryRef.sourceRecordId, input.seoAeoMetadataSummaryRef.sourceWatermark, input.seoAeoMetadataSummaryRef.sourceVersion)),
    evidenceRoleRef("headings_body_copy_cta_internal_link_review_summary", "headings_body_copy_cta_internal_link_review_summary", "Headings body copy CTA internal link review summary", roleRef("headings_body_copy_cta_internal_link_review_summary", input.headingsBodyCopyCtaInternalLinkReviewSummaryRef.sourceTable, input.headingsBodyCopyCtaInternalLinkReviewSummaryRef.sourceRecordId, input.headingsBodyCopyCtaInternalLinkReviewSummaryRef.sourceWatermark, input.headingsBodyCopyCtaInternalLinkReviewSummaryRef.sourceVersion)),
    evidenceRoleRef("alt_text_accessibility_content_caveats", "alt_text_accessibility_content_caveats", "Alt text accessibility and content caveats", roleRef("alt_text_accessibility_content_caveats", input.accessibilityContentCaveatsRef.sourceTable, input.accessibilityContentCaveatsRef.sourceRecordId, input.accessibilityContentCaveatsRef.sourceWatermark, input.accessibilityContentCaveatsRef.sourceVersion)),
    evidenceRoleRef("structured_data_summary", "structured_data_summary", "Structured data summary", roleRef("structured_data_summary", input.structuredDataSummaryRef.sourceTable, input.structuredDataSummaryRef.sourceRecordId, input.structuredDataSummaryRef.sourceWatermark, input.structuredDataSummaryRef.sourceVersion)),
    evidenceRoleRef("legal_compliance_notes", "legal_compliance_notes", "Legal compliance notes", roleRef("legal_compliance_notes", input.legalComplianceNotesRef.sourceTable, input.legalComplianceNotesRef.sourceRecordId, input.legalComplianceNotesRef.sourceWatermark, input.legalComplianceNotesRef.sourceVersion)),
    evidenceRoleRef("known_limitations", "known_limitations", "Known limitations", roleRef("known_limitations", input.knownLimitationsRef.sourceTable, input.knownLimitationsRef.sourceRecordId, input.knownLimitationsRef.sourceWatermark, input.knownLimitationsRef.sourceVersion)),
    evidenceRoleRef("unresolved_not_applied_recommendations", "unresolved_not_applied_recommendations", "Unresolved not-applied recommendations", roleRef("unresolved_not_applied_recommendations", input.unresolvedNotAppliedRecommendationsRef.sourceTable, input.unresolvedNotAppliedRecommendationsRef.sourceRecordId, input.unresolvedNotAppliedRecommendationsRef.sourceWatermark, input.unresolvedNotAppliedRecommendationsRef.sourceVersion)),
    evidenceRoleRef("operator_review_notes", "operator_review_notes", "Operator review notes", roleRef("operator_review_notes", input.operatorReviewNotesRef.sourceTable, input.operatorReviewNotesRef.sourceRecordId, input.operatorReviewNotesRef.sourceWatermark, input.operatorReviewNotesRef.sourceVersion)),
    ...(input.unresolvedNotAppliedRecommendationRefs ?? []).map((ref, index) =>
      evidenceRoleRef("unresolved_not_applied_recommendation_ref", "unresolved_not_applied_recommendation_ref", `Unresolved not-applied recommendation ${index + 1}`, roleRef("unresolved_not_applied_recommendation_ref", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
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
  input: ValidateContentApprovalDecisionRefInput,
  status: ContentApprovalAafValidationStatus,
  blockerCodes: string[],
  scope: string | null = null,
  subjectType: string | null = null,
  subjectId: string | null = null,
): ContentApprovalAafValidationResult {
  return {
    valid: false,
    status,
    scope,
    subjectType,
    subjectId,
    approvalRequestId: input.approvalRequestId ?? null,
    approvalDecisionId: input.contentApprovalDecisionId ?? null,
    evidencePackageId: input.evidencePackageId ?? null,
    limitations: [],
    blockerCodes,
    semanticWatermark: computeContentApprovalSemanticWatermark(input),
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

function refMatches(row: Record<string, unknown>, expected: ContentApprovalBridgeSourceRef & { role: string }, roleField: string): boolean {
  return (
    metadataRole(row, roleField) === expected.role &&
    rowText(row, "source_table") === expected.sourceTable &&
    rowText(row, "source_record_id") === expected.sourceRecordId &&
    rowText(row, "source_watermark") === expected.sourceWatermark
  );
}

async function hasAllRequestSubjectRefs(client: AafPgClient, approvalRequestId: string, refs: ContentApprovalExpectedRefs["subjectRefs"]): Promise<boolean> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_subject_refs where approval_request_id = $1::uuid`, [approvalRequestId]);
  return refs.every((expected) => result.rows.some((row) => refMatches(row, expected, "bridgeSubjectRole")));
}

async function hasAllEvidenceRefs(client: AafPgClient, evidencePackageId: string, refs: ContentApprovalExpectedRefs["evidenceRefs"]): Promise<boolean> {
  const sourceRefs = await client.query(`select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`, [evidencePackageId]);
  return refs.every((expected) => sourceRefs.rows.some((row) => refMatches(row, expected, "bridgeEvidenceRole")));
}

export class SingleSiteContentApprovalAafBridge {
  constructor(private readonly writer: BridgeWriter = new AafWriterRepository()) {}

  async prepareContentApprovalRequest(input: PrepareContentApprovalRequestInput): Promise<PreparedContentApprovalRequest> {
    assertPrepareInput(input);
    const scope = tenantScope(input);
    const subject = {
      subjectType: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
      subjectId: text("improvedVersionReviewRef.sourceRecordId", input.improvedVersionReviewRef.sourceRecordId),
    };
    const sourceWatermark = computeContentApprovalSemanticWatermark(input);
    const contentHash = digest({ scope, subject, sourceWatermark });
    const limitations = [
      ...jsonArray(input.limitations),
      ...jsonArray(input.proposalApprovalRef.limitations),
      ...jsonArray(input.implementationAuthorizationRef.limitations),
      ...jsonArray(input.improvedVersionReviewRef.limitations),
      ...jsonArray(input.sourceEvidenceReviewRef.limitations),
      ...jsonArray(input.cloneReviewRef.limitations),
    ];
    const refs = buildExpectedContentApprovalRefs(input);

    const evidenceTx = await this.writer.createEvidencePackageTransaction({
      evidencePackage: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:content-approval-evidence`,
        packageType: AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
        status: "created",
        createdByActorType: input.actor.actorType,
        createdByActorId: input.actor.actorId,
        sourceWatermark,
        freshnessLabel: "fresh",
        contentHash,
        limitationsJson: {
          limitations,
          unresolvedNotAppliedRecommendations: input.unresolvedNotAppliedRecommendationRefs ?? [],
          operatorNotes: input.operatorNotes ?? [],
          contentApprovalId: input.contentApprovalId,
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
        checkedByActorId: "single-site-content-approval-aaf-bridge",
        currentSourceWatermark: sourceWatermark,
        idempotencyKey: `${input.idempotencyKey}:content-approval-evidence:freshness`,
      },
    });

    const requestTx = await this.writer.createApprovalRequestTransaction({
      approvalRequest: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:content-approval-request`,
        scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
        requesterActorType: input.actor.actorType,
        requesterActorId: input.actor.actorId,
        requesterRole: input.actor.actorRole,
        status: "requested",
        policyVersion: input.policyVersion,
        requestedExpiresAt: input.requestedExpiresAt,
        reason: `Request non-executing single-site content approval for content approval ${input.contentApprovalId}.`,
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
        linkRole: "content_approval_request_evidence",
        sourceNote: "Non-executing bridge evidence package.",
        idempotencyKey: `${input.idempotencyKey}:content-approval-request:evidence-link`,
      },
      policyEvaluation: {
        ...scope,
        policyVersion: input.policyVersion,
        result: "approval_required",
        scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
        actionKey: AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        evidencePackageId: evidenceTx.evidencePackage.id,
        blockerCodes: [],
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:content-approval-request:policy`,
      },
      requestedAuditEvent: {
        ...scope,
        eventName: "single_site.content_approval.requested",
        eventFamily: "approval",
        severity: "notice",
        replayClass: AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE],
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceRefJson: { migrationId: input.migrationId, contentApprovalId: input.contentApprovalId, nonExecuting: true },
        payloadJson: {
          scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
          action: AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
          improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef.sourceRecordId,
          improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef.sourceRecordId,
          nonExecuting: true,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:content-approval-request:audit`,
      },
    });

    return {
      scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
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
        requestTx.approvalRequest.idempotency_key === `${input.idempotencyKey}:content-approval-request`,
    };
  }

  async validateContentApprovalDecisionRef(input: ValidateContentApprovalDecisionRefInput): Promise<ContentApprovalAafValidationResult> {
    const decisionId = text("contentApprovalDecisionId", input.contentApprovalDecisionId);
    assertSourceRef("improvedVersionReviewRef", input.improvedVersionReviewRef);
    const expectedWatermark = computeContentApprovalSemanticWatermark(input);
    const subjectType = AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE;
    const subjectId = text("improvedVersionReviewRef.sourceRecordId", input.improvedVersionReviewRef.sourceRecordId);
    const refs = buildExpectedContentApprovalRefs(input);

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

      if (requestScope !== AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE) {
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
          ? (decisionStatus as ContentApprovalAafValidationStatus)
          : "invalid";
        return { ...baseResult, valid: false, status, limitations: [], blockerCodes: [`approval_${decisionStatus ?? "invalid"}`] };
      }
      if (!evidencePackageId) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_evidence_missing"] };
      }
      if (input.evidencePackageId && evidencePackageId !== input.evidencePackageId) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["approval_evidence_mismatch"] };
      }

      const evidence = await readOne(tx.client, `select * from public.gnr8_aaf_evidence_packages where id = $1::uuid`, [evidencePackageId]);
      if (!evidence) return { ...baseResult, valid: false, status: "missing" as const, limitations: [], blockerCodes: ["evidence_package_missing"] };
      if (
        rowText(evidence, "package_type") !== AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE ||
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
      if (freshness) {
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

export function prepareContentApprovalRequest(input: PrepareContentApprovalRequestInput): Promise<PreparedContentApprovalRequest> {
  return new SingleSiteContentApprovalAafBridge().prepareContentApprovalRequest(input);
}

export function validateContentApprovalDecisionRef(input: ValidateContentApprovalDecisionRefInput): Promise<ContentApprovalAafValidationResult> {
  return new SingleSiteContentApprovalAafBridge().validateContentApprovalDecisionRef(input);
}
