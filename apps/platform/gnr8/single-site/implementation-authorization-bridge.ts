import "server-only";

import { createHash } from "node:crypto";

import {
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
  AAF_SCOPE_REPLAY_CLASS,
} from "@gnr8/runtime-contracts";

import {
  AafWriterRepository,
  type AafActorType,
  type AafJsonObject,
  type AafPgClient,
  type AafRecord,
  type AafTenantScopeInput,
} from "../aaf/aaf-writer-repository";

export type SingleSiteImplementationAuthorizationActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type ImplementationAuthorizationSourceRef = {
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark: string;
  contentHash?: string | null;
  metadataJson?: AafJsonObject;
};

export type ImplementationAuthorizationAafProposalApprovalRef = {
  approvalSource?: "aaf";
  approvalRequestId: string;
  approvalDecisionId: string;
  evidencePackageId: string;
  sourceWatermark: string;
  limitations?: unknown[];
  proposalEventId?: never;
  stateEventId?: never;
};

export type ImplementationAuthorizationProposalEventApprovalRef = {
  approvalSource: "proposal_event";
  proposalEventId: string;
  stateEventId: string;
  sourceWatermark: string;
  sourceTable?: string | null;
  stateEventSourceTable?: string | null;
  proposalStatus?: "approved" | "approved_with_limitations" | string;
  eventAction?: "approved" | "approved_with_limitations" | string;
  limitations?: unknown[];
  metadataJson?: AafJsonObject;
  approvalRequestId?: never;
  approvalDecisionId?: never;
  evidencePackageId?: never;
};

export type ImplementationAuthorizationProposalApprovalRef =
  | ImplementationAuthorizationAafProposalApprovalRef
  | ImplementationAuthorizationProposalEventApprovalRef;

export type ImplementationAuthorizationSelectedRecommendationRef = ImplementationAuthorizationSourceRef & {
  recommendationId: string;
  recommendationKey?: string | null;
};

export type PrepareImplementationAuthorizationRequestInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  proposalPlanId: string;
  proposalPlanVersion: string | number;
  proposalPlanSemanticWatermark: string;
  proposalStatus: "approved" | "approved_with_limitations" | string;
  proposalApprovalRef: ImplementationAuthorizationProposalApprovalRef;
  cloneReviewRef: ImplementationAuthorizationSourceRef & { reviewStatus: "accepted" | "accepted_with_limitations" | string; limitations?: unknown[] };
  cloneSiteVersionRef: ImplementationAuthorizationSourceRef;
  runtimeArtifactRef: ImplementationAuthorizationSourceRef;
  sourceEvidenceReviewRef: ImplementationAuthorizationSourceRef & { reviewStatus: "accepted" | "accepted_with_limitations" | string; limitations?: unknown[] };
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  implementationScopeSummary: string;
  implementationNonGoals: string[];
  riskImpactEffortSummary: AafJsonObject;
  limitations?: unknown[];
  operatorNotes?: unknown[];
  advisoryAiProviderRefs?: ImplementationAuthorizationSourceRef[];
  auditTimelineRefs?: ImplementationAuthorizationSourceRef[];
  implementationTargetRef?: ImplementationAuthorizationSourceRef | null;
  implementationAttemptPlaceholderRef?: string | null;
  actor: SingleSiteImplementationAuthorizationActor;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  policyVersion: string;
  requestedExpiresAt?: string | null;
};

export type PreparedImplementationAuthorizationRequest = {
  scope: typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE;
  subjectType: typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE;
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

export type ValidateImplementationAuthorizationRefInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  proposalPlanId: string;
  proposalPlanVersion: string | number;
  proposalPlanSemanticWatermark: string;
  proposalApprovalRef: ImplementationAuthorizationProposalApprovalRef;
  cloneReviewRef: ImplementationAuthorizationSourceRef;
  cloneSiteVersionRef: ImplementationAuthorizationSourceRef;
  runtimeArtifactRef: ImplementationAuthorizationSourceRef;
  sourceEvidenceReviewRef: ImplementationAuthorizationSourceRef;
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  implementationScopeSummary: string;
  implementationNonGoals: string[];
  riskImpactEffortSummary: AafJsonObject;
  limitations?: unknown[];
  operatorNotes?: unknown[];
  advisoryAiProviderRefs?: ImplementationAuthorizationSourceRef[];
  auditTimelineRefs?: ImplementationAuthorizationSourceRef[];
  implementationTargetRef?: ImplementationAuthorizationSourceRef | null;
  implementationAttemptPlaceholderRef?: string | null;
  implementationAuthorizationDecisionId: string;
  approvalRequestId?: string | null;
  evidencePackageId?: string | null;
  policyVersion: string;
};

export type ImplementationAuthorizationValidationStatus =
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

export type ImplementationAuthorizationValidationResult = {
  valid: boolean;
  status: ImplementationAuthorizationValidationStatus;
  scope: typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE | string | null;
  subjectType: typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE | string | null;
  subjectId: string | null;
  approvalRequestId: string | null;
  approvalDecisionId: string | null;
  evidencePackageId: string | null;
  limitations: unknown[];
  blockerCodes: string[];
  semanticWatermark: string;
};

type BridgeWriter = Pick<AafWriterRepository, "createEvidencePackageTransaction" | "createApprovalRequestTransaction" | "withTransaction">;

export type ImplementationAuthorizationExpectedRefs = {
  subjectRefs: Array<ImplementationAuthorizationSourceRef & { role: string }>;
  evidenceRefs: Array<ImplementationAuthorizationSourceRef & { role: string; itemType: string; displayName: string }>;
};

export type ImplementationAuthorizationSemanticInput = {
  migrationId: string;
  clientId: string;
  siteId: string;
  proposalPlanId: string;
  proposalPlanVersion: string | number;
  proposalPlanSemanticWatermark: string;
  proposalApprovalRef: ImplementationAuthorizationProposalApprovalRef;
  cloneReviewRef: ImplementationAuthorizationSourceRef;
  cloneSiteVersionRef: ImplementationAuthorizationSourceRef;
  runtimeArtifactRef: ImplementationAuthorizationSourceRef;
  sourceEvidenceReviewRef: ImplementationAuthorizationSourceRef;
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  implementationScopeSummary: string;
  implementationNonGoals: string[];
  riskImpactEffortSummary: AafJsonObject;
  limitations?: unknown[];
  operatorNotes?: unknown[];
  advisoryAiProviderRefs?: ImplementationAuthorizationSourceRef[];
  auditTimelineRefs?: ImplementationAuthorizationSourceRef[];
  implementationTargetRef?: ImplementationAuthorizationSourceRef | null;
  implementationAttemptPlaceholderRef?: string | null;
  policyVersion: string;
};

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

function roleRef(role: string, sourceTable: string, sourceRecordId: string, sourceWatermark: string, sourceVersion?: string | number | null): ImplementationAuthorizationSourceRef & { role: string } {
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
  ref: ImplementationAuthorizationSourceRef & { role: string },
): ImplementationAuthorizationSourceRef & { role: string; itemType: string; displayName: string } {
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

function proposalApprovalSource(input: ImplementationAuthorizationProposalApprovalRef | undefined): "aaf" | "proposal_event" {
  if (input?.approvalSource === "proposal_event") return "proposal_event";
  return "aaf";
}

function proposalApprovalLimitations(input: ImplementationAuthorizationProposalApprovalRef | undefined): unknown[] {
  return jsonArray(input?.limitations);
}

function proposalApprovalSubjectRefs(
  input: PrepareImplementationAuthorizationRequestInput | ValidateImplementationAuthorizationRefInput,
): Array<ImplementationAuthorizationSourceRef & { role: string }> {
  const proposalApproval = input.proposalApprovalRef;
  const approvalSource = proposalApprovalSource(proposalApproval);
  if (approvalSource === "proposal_event") {
    const eventRef = proposalApproval as ImplementationAuthorizationProposalEventApprovalRef;
    return [
      roleRef(
        "proposal_approval_event",
        optionalText(eventRef.sourceTable) ?? "gnr8_single_site_improvement_proposal_events",
        eventRef.proposalEventId,
        eventRef.sourceWatermark,
      ),
      roleRef(
        "proposal_approval_state_event",
        optionalText(eventRef.stateEventSourceTable) ?? "gnr8_single_site_migration_state_events",
        eventRef.stateEventId,
        eventRef.sourceWatermark,
      ),
    ];
  }

  const aafRef = proposalApproval as ImplementationAuthorizationAafProposalApprovalRef;
  return [
    roleRef("proposal_approval_request", "gnr8_aaf_approval_requests", aafRef.approvalRequestId, aafRef.sourceWatermark),
    roleRef("proposal_approval_decision", "gnr8_aaf_approval_decisions", aafRef.approvalDecisionId, aafRef.sourceWatermark),
    roleRef("proposal_evidence_package", "gnr8_aaf_evidence_packages", aafRef.evidencePackageId, aafRef.sourceWatermark),
  ];
}

function proposalApprovalEvidenceRefs(
  input: PrepareImplementationAuthorizationRequestInput | ValidateImplementationAuthorizationRefInput,
): Array<ImplementationAuthorizationSourceRef & { role: string; itemType: string; displayName: string }> {
  const proposalApproval = input.proposalApprovalRef;
  const approvalSource = proposalApprovalSource(proposalApproval);
  if (approvalSource === "proposal_event") {
    const eventRef = proposalApproval as ImplementationAuthorizationProposalEventApprovalRef;
    const eventSourceTable = optionalText(eventRef.sourceTable) ?? "gnr8_single_site_improvement_proposal_events";
    const stateEventSourceTable = optionalText(eventRef.stateEventSourceTable) ?? "gnr8_single_site_migration_state_events";
    const metadataJson = {
      ...(eventRef.metadataJson ?? {}),
      proposalApprovalEvidenceSource: "proposal_event",
      evidenceOnlyForImplementationAuthorization: true,
      implementationAuthorizationDecisionSubstitution: false,
    };
    return [
      evidenceRoleRef(
        "proposal_approval",
        "proposal_approval_ref",
        "Proposal approval",
        {
          ...roleRef("proposal_approval", eventSourceTable, eventRef.proposalEventId, eventRef.sourceWatermark),
          metadataJson,
        },
      ),
      evidenceRoleRef(
        "proposal_approval_state_event",
        "proposal_approval_state_event_ref",
        "Proposal approval state event",
        {
          ...roleRef("proposal_approval_state_event", stateEventSourceTable, eventRef.stateEventId, eventRef.sourceWatermark),
          metadataJson,
        },
      ),
    ];
  }

  const aafRef = proposalApproval as ImplementationAuthorizationAafProposalApprovalRef;
  return [
    evidenceRoleRef(
      "proposal_approval",
      "proposal_approval_ref",
      "Proposal approval",
      {
        ...roleRef("proposal_approval", "gnr8_aaf_approval_decisions", aafRef.approvalDecisionId, aafRef.sourceWatermark),
        metadataJson: {
          proposalApprovalEvidenceSource: "aaf",
          evidenceOnlyForImplementationAuthorization: true,
          implementationAuthorizationDecisionSubstitution: false,
        },
      },
    ),
  ];
}

export function computeImplementationAuthorizationSemanticWatermark(input: ImplementationAuthorizationSemanticInput): string {
  return `single-site-implementation-authorization:${digest({
    migrationId: input.migrationId,
    clientId: input.clientId,
    siteId: input.siteId,
    proposalPlanId: input.proposalPlanId,
    proposalPlanVersion: input.proposalPlanVersion,
    proposalPlanSemanticWatermark: input.proposalPlanSemanticWatermark,
    proposalApprovalRef: input.proposalApprovalRef,
    cloneReviewRef: input.cloneReviewRef,
    cloneSiteVersionRef: input.cloneSiteVersionRef,
    runtimeArtifactRef: input.runtimeArtifactRef,
    sourceEvidenceReviewRef: input.sourceEvidenceReviewRef,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    implementationScopeSummary: input.implementationScopeSummary,
    implementationNonGoals: input.implementationNonGoals,
    riskImpactEffortSummary: input.riskImpactEffortSummary,
    limitations: input.limitations ?? [],
    operatorNotes: input.operatorNotes ?? [],
    advisoryAiProviderRefs: input.advisoryAiProviderRefs ?? [],
    auditTimelineRefs: input.auditTimelineRefs ?? [],
    implementationTargetRef: input.implementationTargetRef ?? null,
    implementationAttemptPlaceholderRef: input.implementationAttemptPlaceholderRef ?? null,
    policyVersion: input.policyVersion,
  })}`;
}

function assertPrepareInput(input: PrepareImplementationAuthorizationRequestInput): void {
  text("tenantId", input.tenantId);
  text("clientId", input.clientId);
  text("siteId", input.siteId);
  text("migrationId", input.migrationId);
  text("proposalPlanId", input.proposalPlanId);
  text("proposalPlanVersion", input.proposalPlanVersion);
  text("proposalPlanSemanticWatermark", input.proposalPlanSemanticWatermark);
  if (!["approved", "approved_with_limitations"].includes(input.proposalStatus)) {
    throw new Error("implementation authorization requires an approved proposal plan");
  }
  text("proposalApprovalRef.sourceWatermark", input.proposalApprovalRef?.sourceWatermark);
  if (proposalApprovalSource(input.proposalApprovalRef) === "proposal_event") {
    const eventRef = input.proposalApprovalRef as ImplementationAuthorizationProposalEventApprovalRef;
    text("proposalApprovalRef.proposalEventId", eventRef.proposalEventId);
    text("proposalApprovalRef.stateEventId", eventRef.stateEventId);
    if (eventRef.proposalStatus && !["approved", "approved_with_limitations"].includes(eventRef.proposalStatus)) {
      throw new Error("proposalApprovalRef.proposalStatus must be approved or approved_with_limitations");
    }
    if (eventRef.eventAction && !["approved", "approved_with_limitations"].includes(eventRef.eventAction)) {
      throw new Error("proposalApprovalRef.eventAction must be approved or approved_with_limitations");
    }
  } else {
    const aafRef = input.proposalApprovalRef as ImplementationAuthorizationAafProposalApprovalRef;
    text("proposalApprovalRef.approvalRequestId", aafRef?.approvalRequestId);
    text("proposalApprovalRef.approvalDecisionId", aafRef?.approvalDecisionId);
    text("proposalApprovalRef.evidencePackageId", aafRef?.evidencePackageId);
  }
  text("cloneReviewRef.sourceRecordId", input.cloneReviewRef?.sourceRecordId);
  text("cloneReviewRef.sourceWatermark", input.cloneReviewRef?.sourceWatermark);
  assertAcceptedReview("cloneReviewRef.reviewStatus", String(input.cloneReviewRef?.reviewStatus));
  text("cloneSiteVersionRef.sourceRecordId", input.cloneSiteVersionRef?.sourceRecordId);
  text("cloneSiteVersionRef.sourceWatermark", input.cloneSiteVersionRef?.sourceWatermark);
  text("runtimeArtifactRef.sourceRecordId", input.runtimeArtifactRef?.sourceRecordId);
  text("runtimeArtifactRef.sourceWatermark", input.runtimeArtifactRef?.sourceWatermark);
  text("sourceEvidenceReviewRef.sourceRecordId", input.sourceEvidenceReviewRef?.sourceRecordId);
  text("sourceEvidenceReviewRef.sourceWatermark", input.sourceEvidenceReviewRef?.sourceWatermark);
  assertAcceptedReview("sourceEvidenceReviewRef.reviewStatus", String(input.sourceEvidenceReviewRef?.reviewStatus));
  if (!Array.isArray(input.selectedRecommendationRefs) || input.selectedRecommendationRefs.length === 0) {
    throw new Error("selectedRecommendationRefs are required");
  }
  for (const [index, ref] of input.selectedRecommendationRefs.entries()) {
    text(`selectedRecommendationRefs[${index}].recommendationId`, ref.recommendationId);
    text(`selectedRecommendationRefs[${index}].sourceRecordId`, ref.sourceRecordId);
    text(`selectedRecommendationRefs[${index}].sourceWatermark`, ref.sourceWatermark);
  }
  text("implementationScopeSummary", input.implementationScopeSummary);
  if (!Array.isArray(input.implementationNonGoals) || input.implementationNonGoals.length === 0) {
    throw new Error("implementationNonGoals are required");
  }
  if (Object.keys(jsonObject(input.riskImpactEffortSummary)).length === 0) {
    throw new Error("riskImpactEffortSummary is required");
  }
  text("actor.actorType", input.actor?.actorType);
  text("actor.actorId", input.actor?.actorId);
  text("actor.actorRole", input.actor?.actorRole);
  text("correlationId", input.correlationId);
  text("idempotencyKey", input.idempotencyKey);
  text("policyVersion", input.policyVersion);
}

export function buildExpectedImplementationAuthorizationRefs(input: PrepareImplementationAuthorizationRequestInput | ValidateImplementationAuthorizationRefInput): ImplementationAuthorizationExpectedRefs {
  const proposalPlanId = text("proposalPlanId", input.proposalPlanId);
  const proposalWatermark = text("proposalPlanSemanticWatermark", input.proposalPlanSemanticWatermark);
  const selectedRecommendationWatermark = digest(
    input.selectedRecommendationRefs.map((ref) => ({
      recommendationId: ref.recommendationId,
      sourceRecordId: ref.sourceRecordId,
      sourceWatermark: ref.sourceWatermark,
    })),
  );
  const implementationTarget = input.implementationTargetRef ?? roleRef(
    "implementation_target",
    "gnr8_single_site_improvement_proposal_plans",
    proposalPlanId,
    computeImplementationAuthorizationSemanticWatermark(input),
  );
  const attemptPlaceholder = roleRef(
    "implementation_attempt_placeholder",
    "gnr8_single_site_improvement_authorization_attempts",
    optionalText(input.implementationAttemptPlaceholderRef) ?? proposalPlanId,
    implementationTarget.sourceWatermark,
  );
  const subjectRefs = [
    roleRef("tenant", "tenants", text("tenantId", input.tenantId), text("tenantId", input.tenantId)),
    roleRef("client", "clients", text("clientId", input.clientId), text("clientId", input.clientId)),
    roleRef("site", "sites", text("siteId", input.siteId), text("siteId", input.siteId)),
    roleRef("single_site_migration", "gnr8_single_site_migrations", text("migrationId", input.migrationId), proposalWatermark),
    roleRef("proposal_plan", "gnr8_single_site_improvement_proposal_plans", proposalPlanId, proposalWatermark),
    roleRef("proposal_plan_version", "gnr8_single_site_improvement_proposal_plans", proposalPlanId, proposalWatermark, input.proposalPlanVersion),
    roleRef("proposal_plan_semantic_watermark", "gnr8_single_site_improvement_proposal_plans", proposalPlanId, proposalWatermark),
    ...proposalApprovalSubjectRefs(input),
    roleRef("clone_review", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark, input.cloneReviewRef.sourceVersion),
    roleRef("clone_review_status", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark),
    roleRef("clone_review_watermark", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark),
    roleRef("clone_site_version", input.cloneSiteVersionRef.sourceTable, input.cloneSiteVersionRef.sourceRecordId, input.cloneSiteVersionRef.sourceWatermark, input.cloneSiteVersionRef.sourceVersion),
    roleRef("runtime_artifact", input.runtimeArtifactRef.sourceTable, input.runtimeArtifactRef.sourceRecordId, input.runtimeArtifactRef.sourceWatermark, input.runtimeArtifactRef.sourceVersion),
    roleRef("runtime_artifact_watermark", input.runtimeArtifactRef.sourceTable, input.runtimeArtifactRef.sourceRecordId, input.runtimeArtifactRef.sourceWatermark),
    roleRef("source_evidence_review", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark, input.sourceEvidenceReviewRef.sourceVersion),
    roleRef("source_evidence_review_status", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark),
    roleRef("source_evidence_review_watermark", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark),
    roleRef("selected_recommendations", "gnr8_single_site_improvement_proposal_recommendations", proposalPlanId, selectedRecommendationWatermark),
    roleRef("selected_recommendation_watermarks", "gnr8_single_site_improvement_proposal_recommendations", proposalPlanId, selectedRecommendationWatermark),
    { role: "implementation_target", ...implementationTarget },
    attemptPlaceholder,
  ];

  const evidenceRefs = [
    evidenceRoleRef("proposal_plan_snapshot", "proposal_plan_snapshot", "Proposal plan snapshot", roleRef("proposal_plan_snapshot", "gnr8_single_site_improvement_proposal_plans", proposalPlanId, proposalWatermark, input.proposalPlanVersion)),
    ...proposalApprovalEvidenceRefs(input),
    evidenceRoleRef("clone_review_acceptance", "clone_review_acceptance_ref", "Clone review acceptance", roleRef("clone_review_acceptance", input.cloneReviewRef.sourceTable, input.cloneReviewRef.sourceRecordId, input.cloneReviewRef.sourceWatermark)),
    evidenceRoleRef("source_evidence_acceptance", "source_evidence_acceptance_ref", "Source evidence acceptance", roleRef("source_evidence_acceptance", input.sourceEvidenceReviewRef.sourceTable, input.sourceEvidenceReviewRef.sourceRecordId, input.sourceEvidenceReviewRef.sourceWatermark)),
    evidenceRoleRef("selected_recommendations", "selected_recommendations", "Selected recommendations", roleRef("selected_recommendations", "gnr8_single_site_improvement_proposal_recommendations", proposalPlanId, selectedRecommendationWatermark)),
    evidenceRoleRef("risk_impact_effort_summary", "risk_impact_effort_summary", "Risk impact effort summary", roleRef("risk_impact_effort_summary", "gnr8_single_site_improvement_authorization_inputs", proposalPlanId, proposalWatermark)),
    evidenceRoleRef("implementation_scope_summary", "implementation_scope_summary", "Implementation scope summary", roleRef("implementation_scope_summary", "gnr8_single_site_improvement_authorization_inputs", proposalPlanId, implementationTarget.sourceWatermark)),
    evidenceRoleRef("implementation_non_goals", "implementation_non_goals", "Implementation non-goals", roleRef("implementation_non_goals", "gnr8_single_site_improvement_authorization_inputs", proposalPlanId, implementationTarget.sourceWatermark)),
    evidenceRoleRef("limitations", "limitations", "Carried limitations", roleRef("limitations", "gnr8_single_site_improvement_authorization_inputs", proposalPlanId, proposalWatermark)),
    evidenceRoleRef("operator_notes", "operator_notes", "Operator notes", roleRef("operator_notes", "gnr8_single_site_improvement_authorization_inputs", proposalPlanId, implementationTarget.sourceWatermark)),
    ...(input.advisoryAiProviderRefs ?? []).map((ref, index) => ({
      ...evidenceRoleRef("advisory_ai_provider_refs", "advisory_ai_provider_ref", `Advisory AI/provider ref ${index + 1}`, roleRef("advisory_ai_provider_refs", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    })),
    ...(input.auditTimelineRefs ?? []).map((ref, index) => ({
      ...evidenceRoleRef("audit_timeline_refs", "audit_timeline_ref", `Audit timeline ref ${index + 1}`, roleRef("audit_timeline_refs", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
    })),
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

function validationFailure(input: ValidateImplementationAuthorizationRefInput, status: ImplementationAuthorizationValidationStatus, blockerCodes: string[], scope: string | null = null, subjectType: string | null = null, subjectId: string | null = null): ImplementationAuthorizationValidationResult {
  return {
    valid: false,
    status,
    scope,
    subjectType,
    subjectId,
    approvalRequestId: input.approvalRequestId ?? null,
    approvalDecisionId: input.implementationAuthorizationDecisionId ?? null,
    evidencePackageId: input.evidencePackageId ?? null,
    limitations: [],
    blockerCodes,
    semanticWatermark: computeImplementationAuthorizationSemanticWatermark(input),
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

function refMatches(row: Record<string, unknown>, expected: ImplementationAuthorizationSourceRef & { role: string }, roleField: string): boolean {
  return (
    metadataRole(row, roleField) === expected.role &&
    rowText(row, "source_table") === expected.sourceTable &&
    rowText(row, "source_record_id") === expected.sourceRecordId &&
    rowText(row, "source_watermark") === expected.sourceWatermark
  );
}

async function hasAllRequestSubjectRefs(client: AafPgClient, approvalRequestId: string, refs: ImplementationAuthorizationExpectedRefs["subjectRefs"]): Promise<boolean> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_subject_refs where approval_request_id = $1::uuid`, [approvalRequestId]);
  return refs.every((expected) => result.rows.some((row) => refMatches(row, expected, "bridgeSubjectRole")));
}

async function hasAllEvidenceRefs(client: AafPgClient, evidencePackageId: string, refs: ImplementationAuthorizationExpectedRefs["evidenceRefs"]): Promise<boolean> {
  const sourceRefs = await client.query(`select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`, [evidencePackageId]);
  return refs.every((expected) => sourceRefs.rows.some((row) => refMatches(row, expected, "bridgeEvidenceRole")));
}

export class SingleSiteImplementationAuthorizationBridge {
  constructor(private readonly writer: BridgeWriter = new AafWriterRepository()) {}

  async prepareImplementationAuthorizationRequest(input: PrepareImplementationAuthorizationRequestInput): Promise<PreparedImplementationAuthorizationRequest> {
    assertPrepareInput(input);
    const scope = tenantScope(input);
    const subject = {
      subjectType: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
      subjectId: text("proposalPlanId", input.proposalPlanId),
    };
    const sourceWatermark = computeImplementationAuthorizationSemanticWatermark(input);
    const contentHash = digest({ scope, subject, sourceWatermark });
    const limitations = [
      ...jsonArray(input.limitations),
      ...proposalApprovalLimitations(input.proposalApprovalRef),
      ...jsonArray(input.cloneReviewRef.limitations),
      ...jsonArray(input.sourceEvidenceReviewRef.limitations),
    ];
    const refs = buildExpectedImplementationAuthorizationRefs(input);

    const evidenceTx = await this.writer.createEvidencePackageTransaction({
      evidencePackage: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:implementation-authorization-evidence`,
        packageType: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
        status: "created",
        createdByActorType: input.actor.actorType,
        createdByActorId: input.actor.actorId,
        sourceWatermark,
        freshnessLabel: "fresh",
        contentHash,
        limitationsJson: {
          limitations,
          proposalApprovalLimitations: proposalApprovalLimitations(input.proposalApprovalRef),
          cloneLimitations: jsonArray(input.cloneReviewRef.limitations),
          sourceEvidenceLimitations: jsonArray(input.sourceEvidenceReviewRef.limitations),
          implementationScopeSummary: input.implementationScopeSummary,
          implementationNonGoals: input.implementationNonGoals,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
      },
      sourceRefs: refs.evidenceRefs.map((ref) => ({
        sourceSystem: "gnr8",
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        sourceVersion: ref.sourceVersion,
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
        checkedByActorId: "single-site-implementation-authorization-bridge",
        currentSourceWatermark: sourceWatermark,
        idempotencyKey: `${input.idempotencyKey}:implementation-authorization-evidence:freshness`,
      },
    });

    const requestTx = await this.writer.createApprovalRequestTransaction({
      approvalRequest: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:implementation-authorization-request`,
        scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
        requesterActorType: input.actor.actorType,
        requesterActorId: input.actor.actorId,
        requesterRole: input.actor.actorRole,
        status: "requested",
        policyVersion: input.policyVersion,
        requestedExpiresAt: input.requestedExpiresAt,
        reason: `Request non-executing single-site improvement implementation authorization for proposal ${input.proposalPlanId}.`,
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
      },
      subjectRefs: refs.subjectRefs.map((ref) => ({
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceSystem: "gnr8",
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        sourceVersion: ref.sourceVersion,
        sourceWatermark: ref.sourceWatermark,
        metadataJson: { ...(ref.metadataJson ?? {}), bridgeSubjectRole: ref.role, nonExecuting: true },
      })),
      evidenceLink: {
        evidencePackageId: evidenceTx.evidencePackage.id,
        linkRole: "implementation_authorization_request_evidence",
        sourceNote: "Non-executing bridge evidence package.",
        idempotencyKey: `${input.idempotencyKey}:implementation-authorization-request:evidence-link`,
      },
      policyEvaluation: {
        ...scope,
        policyVersion: input.policyVersion,
        result: "approval_required",
        scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
        actionKey: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        evidencePackageId: evidenceTx.evidencePackage.id,
        blockerCodes: [],
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:implementation-authorization-request:policy`,
      },
      requestedAuditEvent: {
        ...scope,
        eventName: "single_site.implementation_authorization.requested",
        eventFamily: "approval",
        severity: "notice",
        replayClass: AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE],
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceRefJson: { migrationId: input.migrationId, proposalPlanId: input.proposalPlanId, nonExecuting: true },
        payloadJson: {
          scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
          action: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION,
          implementationScopeSummary: input.implementationScopeSummary,
          implementationNonGoals: input.implementationNonGoals,
          riskImpactEffortSummary: input.riskImpactEffortSummary,
          nonExecuting: true,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:implementation-authorization-request:audit`,
      },
    });

    return {
      scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
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
        requestTx.approvalRequest.idempotency_key === `${input.idempotencyKey}:implementation-authorization-request`,
    };
  }

  async validateImplementationAuthorizationRef(input: ValidateImplementationAuthorizationRefInput): Promise<ImplementationAuthorizationValidationResult> {
    const decisionId = text("implementationAuthorizationDecisionId", input.implementationAuthorizationDecisionId);
    const expectedWatermark = computeImplementationAuthorizationSemanticWatermark(input);
    const subjectType = AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE;
    const subjectId = text("proposalPlanId", input.proposalPlanId);
    const refs = buildExpectedImplementationAuthorizationRefs(input);

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

      if (requestScope !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_scope_mismatch"] };
      }
      if (!sameScope(input, request) || requestSubjectType !== subjectType || requestSubjectId !== subjectId) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_subject_mismatch"] };
      }
      if (input.approvalRequestId && requestId !== input.approvalRequestId) {
        return { ...baseResult, valid: false, status: "invalid" as const, limitations: [], blockerCodes: ["approval_request_mismatch"] };
      }
      if (rowText(request, "policy_version") !== text("policyVersion", input.policyVersion) || rowText(decision, "policy_version") !== text("policyVersion", input.policyVersion)) {
        return { ...baseResult, valid: false, status: "stale" as const, limitations: [], blockerCodes: ["policy_version_mismatch"] };
      }
      if (!["granted", "granted_with_limitations"].includes(String(decisionStatus))) {
        const status = ["rejected", "revoked", "expired", "superseded", "cancelled"].includes(String(decisionStatus))
          ? (decisionStatus as ImplementationAuthorizationValidationStatus)
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
        rowText(evidence, "package_type") !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE ||
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
        return { ...baseResult, valid: false, status: "expired" as const, limitations: [], blockerCodes: ["authorization_expired"] };
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
      return {
        ...baseResult,
        valid: true,
        status: decisionStatus as "granted" | "granted_with_limitations",
        limitations: jsonArray(limitationsJson.limitations),
        blockerCodes: [],
      };
    });
  }
}

export function prepareImplementationAuthorizationRequest(input: PrepareImplementationAuthorizationRequestInput): Promise<PreparedImplementationAuthorizationRequest> {
  return new SingleSiteImplementationAuthorizationBridge().prepareImplementationAuthorizationRequest(input);
}

export function validateImplementationAuthorizationRef(input: ValidateImplementationAuthorizationRefInput): Promise<ImplementationAuthorizationValidationResult> {
  return new SingleSiteImplementationAuthorizationBridge().validateImplementationAuthorizationRef(input);
}
