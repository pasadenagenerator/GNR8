import "server-only";

import { createHash } from "node:crypto";

import {
  AAF_SCOPE_REPLAY_CLASS,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import {
  AafWriterRepository,
  type AafActorType,
  type AafJsonObject,
  type AafPgClient,
  type AafRecord,
  type AafTenantScopeInput,
} from "../aaf/aaf-writer-repository";

export type SingleSiteClientApprovalActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type ClientApprovalBridgeSourceRef = {
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | number | null;
  sourceWatermark: string;
  contentHash?: string | null;
  metadataJson?: AafJsonObject;
};

export type ClientApprovalBridgeReviewRef = ClientApprovalBridgeSourceRef & {
  reviewStatus: "accepted" | "accepted_with_limitations" | string;
  limitations?: unknown[];
};

export type ClientApprovalBridgeContentApprovalRef = ClientApprovalBridgeSourceRef & {
  approvalStatus: "approved" | "approved_with_limitations" | string;
  limitations?: unknown[];
};

export type ClientApprovalBridgeAafApprovalRef = {
  approvalRequestId?: string | null;
  approvalDecisionId: string;
  evidencePackageId?: string | null;
  sourceWatermark: string;
  limitations?: unknown[];
};

export type ClientApprovalSelectedRecommendationRef = ClientApprovalBridgeSourceRef & {
  recommendationId: string;
  recommendationKey?: string | null;
  applicationStatus?: string | null;
};

export type PrepareClientApprovalRequestInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  clientApprovalId: string;
  contentApprovalRef: ClientApprovalBridgeContentApprovalRef;
  aafContentApprovalDecisionRef: ClientApprovalBridgeAafApprovalRef;
  improvedVersionReviewRef: ClientApprovalBridgeReviewRef;
  improvedCandidateSiteVersionRef: ClientApprovalBridgeSourceRef;
  improvedRuntimeArtifactRef: ClientApprovalBridgeSourceRef;
  proposalPlanRef: ClientApprovalBridgeSourceRef & { planVersion?: string | number | null };
  proposalApprovalRef: ClientApprovalBridgeAafApprovalRef;
  implementationAuthorizationRef: ClientApprovalBridgeAafApprovalRef;
  improvementExecutionAttemptRef: ClientApprovalBridgeSourceRef;
  selectedRecommendationRefs: ClientApprovalSelectedRecommendationRef[];
  improvedCandidateRenderedSnapshotRef: ClientApprovalBridgeSourceRef;
  clientFacingSummaryRef: ClientApprovalBridgeSourceRef;
  limitationsSummaryRef: ClientApprovalBridgeSourceRef;
  deferredOrNotAppliedRecommendationSummaryRef: ClientApprovalBridgeSourceRef;
  operatorAccountNotesRef: ClientApprovalBridgeSourceRef;
  reviewerIdentityRef: ClientApprovalBridgeSourceRef;
  reviewerRepresentativeRoleRef: ClientApprovalBridgeSourceRef;
  limitations?: unknown[];
  deferredOrNotAppliedRecommendationRefs?: ClientApprovalBridgeSourceRef[];
  auditTimelineRefs?: ClientApprovalBridgeSourceRef[];
  operatorAccountNotes?: unknown[];
  actor: SingleSiteClientApprovalActor;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  policyVersion: string;
  requestedExpiresAt?: string | null;
};

export type PreparedClientApprovalRequest = {
  scope: typeof AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE;
  subjectType: typeof AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE;
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

export type ValidateClientApprovalDecisionRefInput = Omit<
  PrepareClientApprovalRequestInput,
  "actor" | "correlationId" | "causationId" | "requestId" | "idempotencyKey" | "requestedExpiresAt"
> & {
  clientApprovalDecisionId: string;
  approvalRequestId?: string | null;
  evidencePackageId?: string | null;
};

export type ClientApprovalAafValidationStatus =
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

export type ClientApprovalAafValidationResult = {
  valid: boolean;
  status: ClientApprovalAafValidationStatus;
  scope: typeof AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE | string | null;
  subjectType: typeof AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE | string | null;
  subjectId: string | null;
  approvalRequestId: string | null;
  approvalDecisionId: string | null;
  evidencePackageId: string | null;
  limitations: unknown[];
  blockerCodes: string[];
  semanticWatermark: string;
};

type BridgeWriter = Pick<AafWriterRepository, "createEvidencePackageTransaction" | "createApprovalRequestTransaction" | "withTransaction">;

export type ClientApprovalExpectedRefs = {
  subjectRefs: Array<ClientApprovalBridgeSourceRef & { role: string }>;
  evidenceRefs: Array<ClientApprovalBridgeSourceRef & { role: string; itemType: string; displayName: string }>;
};

export type ClientApprovalSemanticInput = Omit<ValidateClientApprovalDecisionRefInput, "clientApprovalDecisionId" | "approvalRequestId" | "evidencePackageId">;

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
): ClientApprovalBridgeSourceRef & { role: string } {
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
  ref: ClientApprovalBridgeSourceRef & { role: string },
): ClientApprovalBridgeSourceRef & { role: string; itemType: string; displayName: string } {
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

export function computeClientApprovalSemanticWatermark(input: ClientApprovalSemanticInput): string {
  return `single-site-client-approval:${digest({
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    clientApprovalId: input.clientApprovalId,
    contentApprovalRef: input.contentApprovalRef,
    aafContentApprovalDecisionRef: input.aafContentApprovalDecisionRef,
    improvedVersionReviewRef: input.improvedVersionReviewRef,
    improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef,
    improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef,
    proposalPlanRef: input.proposalPlanRef,
    proposalApprovalRef: input.proposalApprovalRef,
    implementationAuthorizationRef: input.implementationAuthorizationRef,
    improvementExecutionAttemptRef: input.improvementExecutionAttemptRef,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    improvedCandidateRenderedSnapshotRef: input.improvedCandidateRenderedSnapshotRef,
    clientFacingSummaryRef: input.clientFacingSummaryRef,
    limitationsSummaryRef: input.limitationsSummaryRef,
    deferredOrNotAppliedRecommendationSummaryRef: input.deferredOrNotAppliedRecommendationSummaryRef,
    operatorAccountNotesRef: input.operatorAccountNotesRef,
    reviewerIdentityRef: input.reviewerIdentityRef,
    reviewerRepresentativeRoleRef: input.reviewerRepresentativeRoleRef,
    limitations: input.limitations ?? [],
    deferredOrNotAppliedRecommendationRefs: input.deferredOrNotAppliedRecommendationRefs ?? [],
    auditTimelineRefs: input.auditTimelineRefs ?? [],
    operatorAccountNotes: input.operatorAccountNotes ?? [],
    policyVersion: input.policyVersion,
  })}`;
}

function assertSourceRef(field: string, ref: ClientApprovalBridgeSourceRef | null | undefined): void {
  text(`${field}.sourceTable`, ref?.sourceTable);
  text(`${field}.sourceRecordId`, ref?.sourceRecordId);
  text(`${field}.sourceWatermark`, ref?.sourceWatermark);
}

function assertPrepareInput(input: PrepareClientApprovalRequestInput): void {
  text("tenantId", input.tenantId);
  text("clientId", input.clientId);
  text("siteId", input.siteId);
  text("migrationId", input.migrationId);
  text("clientApprovalId", input.clientApprovalId);
  assertSourceRef("contentApprovalRef", input.contentApprovalRef);
  assertApprovedContent("contentApprovalRef.approvalStatus", String(input.contentApprovalRef?.approvalStatus));
  text("aafContentApprovalDecisionRef.approvalDecisionId", input.aafContentApprovalDecisionRef?.approvalDecisionId);
  text("aafContentApprovalDecisionRef.sourceWatermark", input.aafContentApprovalDecisionRef?.sourceWatermark);
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
  assertSourceRef("improvedCandidateRenderedSnapshotRef", input.improvedCandidateRenderedSnapshotRef);
  assertSourceRef("clientFacingSummaryRef", input.clientFacingSummaryRef);
  assertSourceRef("limitationsSummaryRef", input.limitationsSummaryRef);
  assertSourceRef("deferredOrNotAppliedRecommendationSummaryRef", input.deferredOrNotAppliedRecommendationSummaryRef);
  assertSourceRef("operatorAccountNotesRef", input.operatorAccountNotesRef);
  assertSourceRef("reviewerIdentityRef", input.reviewerIdentityRef);
  assertSourceRef("reviewerRepresentativeRoleRef", input.reviewerRepresentativeRoleRef);
  text("actor.actorType", input.actor?.actorType);
  text("actor.actorId", input.actor?.actorId);
  text("actor.actorRole", input.actor?.actorRole);
  text("correlationId", input.correlationId);
  text("idempotencyKey", input.idempotencyKey);
  text("policyVersion", input.policyVersion);
}

export function buildExpectedClientApprovalRefs(input: PrepareClientApprovalRequestInput | ValidateClientApprovalDecisionRefInput): ClientApprovalExpectedRefs {
  const semanticWatermark = computeClientApprovalSemanticWatermark(input);
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
    proposalLimitations: input.proposalApprovalRef.limitations ?? [],
    implementationAuthorizationLimitations: input.implementationAuthorizationRef.limitations ?? [],
    improvedVersionReviewLimitations: input.improvedVersionReviewRef.limitations ?? [],
  });
  const subjectRefs = [
    roleRef("tenant", "tenants", text("tenantId", input.tenantId), text("tenantId", input.tenantId)),
    roleRef("client", "clients", text("clientId", input.clientId), text("clientId", input.clientId)),
    roleRef("site", "sites", text("siteId", input.siteId), text("siteId", input.siteId)),
    roleRef("single_site_migration", "gnr8_single_site_migrations", text("migrationId", input.migrationId), semanticWatermark),
    roleRef("client_approval", "gnr8_single_site_client_approvals", text("clientApprovalId", input.clientApprovalId), semanticWatermark),
    roleRef("content_approval", input.contentApprovalRef.sourceTable, input.contentApprovalRef.sourceRecordId, input.contentApprovalRef.sourceWatermark, input.contentApprovalRef.sourceVersion),
    roleRef("improved_candidate_site_version", input.improvedCandidateSiteVersionRef.sourceTable, input.improvedCandidateSiteVersionRef.sourceRecordId, input.improvedCandidateSiteVersionRef.sourceWatermark, input.improvedCandidateSiteVersionRef.sourceVersion),
    roleRef("improved_runtime_artifact", input.improvedRuntimeArtifactRef.sourceTable, input.improvedRuntimeArtifactRef.sourceRecordId, input.improvedRuntimeArtifactRef.sourceWatermark, input.improvedRuntimeArtifactRef.sourceVersion),
    roleRef("improved_version_review", input.improvedVersionReviewRef.sourceTable, input.improvedVersionReviewRef.sourceRecordId, input.improvedVersionReviewRef.sourceWatermark, input.improvedVersionReviewRef.sourceVersion),
    roleRef("proposal_plan", input.proposalPlanRef.sourceTable, input.proposalPlanRef.sourceRecordId, input.proposalPlanRef.sourceWatermark, input.proposalPlanRef.planVersion ?? input.proposalPlanRef.sourceVersion),
    roleRef("proposal_approval", "gnr8_aaf_approval_decisions", input.proposalApprovalRef.approvalDecisionId, input.proposalApprovalRef.sourceWatermark),
    roleRef("implementation_authorization", "gnr8_aaf_approval_decisions", input.implementationAuthorizationRef.approvalDecisionId, input.implementationAuthorizationRef.sourceWatermark),
    roleRef("improvement_execution_attempt", input.improvementExecutionAttemptRef.sourceTable, input.improvementExecutionAttemptRef.sourceRecordId, input.improvementExecutionAttemptRef.sourceWatermark, input.improvementExecutionAttemptRef.sourceVersion),
    roleRef("selected_recommendations", "gnr8_single_site_improvement_proposal_recommendations", input.proposalPlanRef.sourceRecordId, selectedRecommendationWatermark),
    roleRef("limitations", "gnr8_single_site_client_approval_inputs", input.clientApprovalId, limitationsWatermark),
    roleRef("client_or_account_reviewer_identity", input.reviewerIdentityRef.sourceTable, input.reviewerIdentityRef.sourceRecordId, input.reviewerIdentityRef.sourceWatermark, input.reviewerIdentityRef.sourceVersion),
    roleRef("client_or_account_reviewer_representative_role", input.reviewerRepresentativeRoleRef.sourceTable, input.reviewerRepresentativeRoleRef.sourceRecordId, input.reviewerRepresentativeRoleRef.sourceWatermark, input.reviewerRepresentativeRoleRef.sourceVersion),
  ];

  const evidenceRefs = [
    evidenceRoleRef("content_approval_decision", "content_approval_decision", "Content approval decision", roleRef("content_approval_decision", "gnr8_aaf_approval_decisions", input.aafContentApprovalDecisionRef.approvalDecisionId, input.aafContentApprovalDecisionRef.sourceWatermark)),
    evidenceRoleRef("improved_candidate_rendered_snapshot", "improved_candidate_rendered_snapshot", "Improved candidate rendered snapshot", roleRef("improved_candidate_rendered_snapshot", input.improvedCandidateRenderedSnapshotRef.sourceTable, input.improvedCandidateRenderedSnapshotRef.sourceRecordId, input.improvedCandidateRenderedSnapshotRef.sourceWatermark, input.improvedCandidateRenderedSnapshotRef.sourceVersion)),
    evidenceRoleRef("client_facing_summary", "client_facing_summary", "Client-facing summary", roleRef("client_facing_summary", input.clientFacingSummaryRef.sourceTable, input.clientFacingSummaryRef.sourceRecordId, input.clientFacingSummaryRef.sourceWatermark, input.clientFacingSummaryRef.sourceVersion)),
    evidenceRoleRef("limitations_summary", "limitations_summary", "Limitations summary", roleRef("limitations_summary", input.limitationsSummaryRef.sourceTable, input.limitationsSummaryRef.sourceRecordId, input.limitationsSummaryRef.sourceWatermark, input.limitationsSummaryRef.sourceVersion)),
    evidenceRoleRef("deferred_or_not_applied_recommendation_summary", "deferred_or_not_applied_recommendation_summary", "Deferred or not-applied recommendation summary", roleRef("deferred_or_not_applied_recommendation_summary", input.deferredOrNotAppliedRecommendationSummaryRef.sourceTable, input.deferredOrNotAppliedRecommendationSummaryRef.sourceRecordId, input.deferredOrNotAppliedRecommendationSummaryRef.sourceWatermark, input.deferredOrNotAppliedRecommendationSummaryRef.sourceVersion)),
    evidenceRoleRef("operator_account_notes", "operator_account_notes", "Operator/account notes", roleRef("operator_account_notes", input.operatorAccountNotesRef.sourceTable, input.operatorAccountNotesRef.sourceRecordId, input.operatorAccountNotesRef.sourceWatermark, input.operatorAccountNotesRef.sourceVersion)),
    ...(input.deferredOrNotAppliedRecommendationRefs ?? []).map((ref, index) =>
      evidenceRoleRef("deferred_or_not_applied_recommendation_ref", "deferred_or_not_applied_recommendation_ref", `Deferred or not-applied recommendation ${index + 1}`, roleRef("deferred_or_not_applied_recommendation_ref", ref.sourceTable, ref.sourceRecordId, ref.sourceWatermark, ref.sourceVersion)),
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
  input: ValidateClientApprovalDecisionRefInput,
  status: ClientApprovalAafValidationStatus,
  blockerCodes: string[],
  scope: string | null = null,
  subjectType: string | null = null,
  subjectId: string | null = null,
): ClientApprovalAafValidationResult {
  return {
    valid: false,
    status,
    scope,
    subjectType,
    subjectId,
    approvalRequestId: input.approvalRequestId ?? null,
    approvalDecisionId: input.clientApprovalDecisionId ?? null,
    evidencePackageId: input.evidencePackageId ?? null,
    limitations: [],
    blockerCodes,
    semanticWatermark: computeClientApprovalSemanticWatermark(input),
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

function refMatches(row: Record<string, unknown>, expected: ClientApprovalBridgeSourceRef & { role: string }, roleField: string): boolean {
  return (
    metadataRole(row, roleField) === expected.role &&
    rowText(row, "source_table") === expected.sourceTable &&
    rowText(row, "source_record_id") === expected.sourceRecordId &&
    rowText(row, "source_watermark") === expected.sourceWatermark
  );
}

async function hasAllRequestSubjectRefs(client: AafPgClient, approvalRequestId: string, refs: ClientApprovalExpectedRefs["subjectRefs"]): Promise<boolean> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_subject_refs where approval_request_id = $1::uuid`, [approvalRequestId]);
  return refs.every((expected) => result.rows.some((row) => refMatches(row, expected, "bridgeSubjectRole")));
}

async function hasAllEvidenceRefs(client: AafPgClient, evidencePackageId: string, refs: ClientApprovalExpectedRefs["evidenceRefs"]): Promise<boolean> {
  const sourceRefs = await client.query(`select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`, [evidencePackageId]);
  return refs.every((expected) => sourceRefs.rows.some((row) => refMatches(row, expected, "bridgeEvidenceRole")));
}

export class SingleSiteClientApprovalAafBridge {
  constructor(private readonly writer: BridgeWriter = new AafWriterRepository()) {}

  async prepareClientApprovalRequest(input: PrepareClientApprovalRequestInput): Promise<PreparedClientApprovalRequest> {
    assertPrepareInput(input);
    const scope = tenantScope(input);
    const subject = {
      subjectType: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
      subjectId: text("clientApprovalId", input.clientApprovalId),
    };
    const sourceWatermark = computeClientApprovalSemanticWatermark(input);
    const contentHash = digest({ scope, subject, sourceWatermark });
    const limitations = [
      ...jsonArray(input.limitations),
      ...jsonArray(input.contentApprovalRef.limitations),
      ...jsonArray(input.aafContentApprovalDecisionRef.limitations),
      ...jsonArray(input.proposalApprovalRef.limitations),
      ...jsonArray(input.implementationAuthorizationRef.limitations),
      ...jsonArray(input.improvedVersionReviewRef.limitations),
    ];
    const refs = buildExpectedClientApprovalRefs(input);

    const evidenceTx = await this.writer.createEvidencePackageTransaction({
      evidencePackage: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:client-approval-evidence`,
        packageType: AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE,
        status: "created",
        createdByActorType: input.actor.actorType,
        createdByActorId: input.actor.actorId,
        sourceWatermark,
        freshnessLabel: "fresh",
        contentHash,
        limitationsJson: {
          limitations,
          deferredOrNotAppliedRecommendations: input.deferredOrNotAppliedRecommendationRefs ?? [],
          operatorAccountNotes: input.operatorAccountNotes ?? [],
          contentApprovalId: input.contentApprovalRef.sourceRecordId,
          clientApprovalId: input.clientApprovalId,
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
        checkedByActorId: "single-site-client-approval-aaf-bridge",
        currentSourceWatermark: sourceWatermark,
        idempotencyKey: `${input.idempotencyKey}:client-approval-evidence:freshness`,
      },
    });

    const requestTx = await this.writer.createApprovalRequestTransaction({
      approvalRequest: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId,
        requestId: input.requestId,
        idempotencyKey: `${input.idempotencyKey}:client-approval-request`,
        scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
        requesterActorType: input.actor.actorType,
        requesterActorId: input.actor.actorId,
        requesterRole: input.actor.actorRole,
        status: "requested",
        policyVersion: input.policyVersion,
        requestedExpiresAt: input.requestedExpiresAt,
        reason: `Request non-executing single-site client approval for client approval ${input.clientApprovalId}.`,
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
        linkRole: "client_approval_request_evidence",
        sourceNote: "Non-executing bridge evidence package.",
        idempotencyKey: `${input.idempotencyKey}:client-approval-request:evidence-link`,
      },
      policyEvaluation: {
        ...scope,
        policyVersion: input.policyVersion,
        result: "approval_required",
        scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
        actionKey: AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        evidencePackageId: evidenceTx.evidencePackage.id,
        blockerCodes: [],
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:client-approval-request:policy`,
      },
      requestedAuditEvent: {
        ...scope,
        eventName: "single_site.client_approval.requested",
        eventFamily: "approval",
        severity: "notice",
        replayClass: AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE],
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceRefJson: { migrationId: input.migrationId, clientApprovalId: input.clientApprovalId, nonExecuting: true },
        payloadJson: {
          scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
          action: AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION,
          contentApprovalRef: input.contentApprovalRef.sourceRecordId,
          aafContentApprovalDecisionRef: input.aafContentApprovalDecisionRef.approvalDecisionId,
          improvedCandidateSiteVersionRef: input.improvedCandidateSiteVersionRef.sourceRecordId,
          improvedRuntimeArtifactRef: input.improvedRuntimeArtifactRef.sourceRecordId,
          nonExecuting: true,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        idempotencyKey: `${input.idempotencyKey}:client-approval-request:audit`,
      },
    });

    return {
      scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
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
        requestTx.approvalRequest.idempotency_key === `${input.idempotencyKey}:client-approval-request`,
    };
  }

  async validateClientApprovalDecisionRef(input: ValidateClientApprovalDecisionRefInput): Promise<ClientApprovalAafValidationResult> {
    const decisionId = text("clientApprovalDecisionId", input.clientApprovalDecisionId);
    assertSourceRef("contentApprovalRef", input.contentApprovalRef);
    assertSourceRef("improvedCandidateSiteVersionRef", input.improvedCandidateSiteVersionRef);
    const expectedWatermark = computeClientApprovalSemanticWatermark(input);
    const subjectType = AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE;
    const subjectId = text("clientApprovalId", input.clientApprovalId);
    const refs = buildExpectedClientApprovalRefs(input);

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

      if (requestScope !== AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE) {
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
          ? (decisionStatus as ClientApprovalAafValidationStatus)
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
        rowText(evidence, "package_type") !== AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE ||
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

export function prepareClientApprovalRequest(input: PrepareClientApprovalRequestInput): Promise<PreparedClientApprovalRequest> {
  return new SingleSiteClientApprovalAafBridge().prepareClientApprovalRequest(input);
}

export function validateClientApprovalDecisionRef(input: ValidateClientApprovalDecisionRefInput): Promise<ClientApprovalAafValidationResult> {
  return new SingleSiteClientApprovalAafBridge().validateClientApprovalDecisionRef(input);
}
