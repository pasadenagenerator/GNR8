import assert from "node:assert/strict";
import test from "node:test";

import {
  AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import { AafIdempotencyConflictError, type AafRecord } from "../aaf/aaf-writer-repository";
import {
  SingleSiteClientApprovalAafBridge,
  type PrepareClientApprovalRequestInput,
  type ValidateClientApprovalDecisionRefInput,
} from "./client-approval-aaf-bridge";

const TENANT_ID = "tenant-mvp33";
const CLIENT_ID = "client-mvp33";
const SITE_ID = "site-mvp33";
const MIGRATION_ID = "migration-mvp33";
const CLIENT_APPROVAL_ID = "client-approval-mvp33";
const CONTENT_APPROVAL_ID = "content-approval-mvp33";
const POLICY_VERSION = "MVP-33";

function actor() {
  return { actorType: "human" as const, actorId: "client-rep-mvp33", actorRole: "client_representative" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return { sourceTable, sourceRecordId, sourceWatermark, contentHash: `${sourceRecordId}-hash-0123456789abcdef` };
}

function baseInput(overrides: Partial<PrepareClientApprovalRequestInput> = {}): PrepareClientApprovalRequestInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    clientApprovalId: CLIENT_APPROVAL_ID,
    contentApprovalRef: {
      ...source("gnr8_single_site_content_approvals", CONTENT_APPROVAL_ID),
      approvalStatus: "approved_with_limitations",
      limitations: [{ content: "copy approved with manual caveat" }],
    },
    aafContentApprovalDecisionRef: {
      approvalRequestId: "content-request-1",
      approvalDecisionId: "content-decision-1",
      evidencePackageId: "content-evidence-1",
      sourceWatermark: "content-approval:watermark",
      limitations: [{ contentDecision: "content limitation carried" }],
    },
    improvedVersionReviewRef: { ...source("gnr8_single_site_improved_version_reviews", "improved-review-1"), reviewStatus: "accepted", limitations: [] },
    improvedCandidateSiteVersionRef: source("gnr8_runtime_site_versions", "improved-version-1"),
    improvedRuntimeArtifactRef: source("gnr8_runtime_artifacts", "improved-artifact-1"),
    proposalPlanRef: { ...source("gnr8_single_site_improvement_proposal_plans", "proposal-plan-1"), planVersion: 2 },
    proposalApprovalRef: {
      approvalRequestId: "proposal-request-1",
      approvalDecisionId: "proposal-decision-1",
      evidencePackageId: "proposal-evidence-1",
      sourceWatermark: "proposal-approval:watermark",
      limitations: [{ proposal: "approved selected work only" }],
    },
    implementationAuthorizationRef: {
      approvalRequestId: "implementation-request-1",
      approvalDecisionId: "implementation-decision-1",
      evidencePackageId: "implementation-evidence-1",
      sourceWatermark: "implementation-authorization:watermark",
      limitations: [{ implementation: "no publish" }],
    },
    improvementExecutionAttemptRef: source("gnr8_single_site_improvement_execution_attempts", "execution-attempt-1"),
    selectedRecommendationRefs: [
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", "recommendation-1"),
        recommendationId: "recommendation-1",
        recommendationKey: "hero-copy",
        applicationStatus: "applied",
      },
    ],
    improvedCandidateRenderedSnapshotRef: source("gnr8_single_site_rendered_snapshots", "rendered-snapshot-1"),
    clientFacingSummaryRef: source("gnr8_single_site_client_approval_refs", "client-summary-1"),
    limitationsSummaryRef: source("gnr8_single_site_client_approval_refs", "limitations-summary-1"),
    deferredOrNotAppliedRecommendationSummaryRef: source("gnr8_single_site_client_approval_refs", "deferred-summary-1"),
    operatorAccountNotesRef: source("gnr8_single_site_client_approval_refs", "operator-account-notes-1"),
    reviewerIdentityRef: source("gnr8_identity_subjects", "client-rep-mvp33"),
    reviewerRepresentativeRoleRef: source("gnr8_account_roles", "client-representative-role-mvp33"),
    limitations: [{ client: "client accepts scope caveat" }],
    deferredOrNotAppliedRecommendationRefs: [source("gnr8_single_site_improvement_proposal_recommendations", "recommendation-deferred-1")],
    auditTimelineRefs: [source("gnr8_aaf_audit_events", "audit-event-1")],
    operatorAccountNotes: [{ note: "Client approval only. No launch or publish." }],
    actor: actor(),
    correlationId: "corr-mvp33",
    idempotencyKey: "idem-mvp33",
    policyVersion: POLICY_VERSION,
    ...overrides,
  };
}

function validationInput(input: PrepareClientApprovalRequestInput, decisionId: string, requestId?: string, evidencePackageId?: string): ValidateClientApprovalDecisionRefInput {
  return {
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
    limitations: input.limitations,
    deferredOrNotAppliedRecommendationRefs: input.deferredOrNotAppliedRecommendationRefs,
    auditTimelineRefs: input.auditTimelineRefs,
    operatorAccountNotes: input.operatorAccountNotes,
    clientApprovalDecisionId: decisionId,
    approvalRequestId: requestId,
    evidencePackageId,
    policyVersion: input.policyVersion,
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${key}:${stable(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

class FakeAafWriter {
  rows: Record<string, AafRecord[]> = {
    evidencePackages: [],
    evidencePackageSourceRefs: [],
    evidencePackageItems: [],
    evidencePackageFreshnessChecks: [],
    approvalRequests: [],
    approvalSubjectRefs: [],
    approvalEvidenceLinks: [],
    approvalPolicyEvaluations: [],
    auditEvents: [],
    approvalDecisions: [],
    approvalRevocations: [],
    approvalSupersessionLinks: [],
    evidencePackageSupersession: [],
  };
  runtimeMutations: unknown[] = [];
  generatedProposalBundles: unknown[] = [];
  publishDomainBillingProviderCalls: unknown[] = [];
  publicRuntimeRefs: unknown[] = [];

  async createEvidencePackageTransaction(input: Record<string, unknown>) {
    const evidencePackage = this.insertIdempotent("evidencePackages", input.evidencePackage as AafRecord, [
      "tenantId",
      "clientId",
      "siteId",
      "packageType",
      "subjectType",
      "subjectId",
      "sourceWatermark",
      "contentHash",
      "limitationsJson",
    ]);
    const sourceRefs = (input.sourceRefs as AafRecord[]).map((ref) => this.insertNatural("evidencePackageSourceRefs", { ...ref, evidence_package_id: evidencePackage.id }, ["evidence_package_id", "source_system", "source_table", "source_record_id", "source_watermark"]));
    const items = (input.items as AafRecord[]).map((item) => this.insertNatural("evidencePackageItems", { ...item, evidence_package_id: evidencePackage.id }, ["evidence_package_id", "item_ref", "item_hash"]));
    const freshnessCheck = this.insertIdempotent("evidencePackageFreshnessChecks", { ...(input.freshnessCheck as AafRecord), evidence_package_id: evidencePackage.id, correlation_id: (input.evidencePackage as AafRecord).correlationId }, ["evidence_package_id", "policyVersion", "result", "currentSourceWatermark"]);
    return { evidencePackage, sourceRefs, items, freshnessCheck, auditLink: null };
  }

  async createApprovalRequestTransaction(input: Record<string, unknown>) {
    const approvalRequest = this.insertIdempotent("approvalRequests", input.approvalRequest as AafRecord, [
      "tenantId",
      "clientId",
      "siteId",
      "scope",
      "subjectType",
      "subjectId",
      "status",
      "policyVersion",
      "reason",
    ]);
    const subjectRefs = (input.subjectRefs as AafRecord[]).map((ref) => this.insert("approvalSubjectRefs", { ...ref, approval_request_id: approvalRequest.id }));
    const evidenceLink = this.insertIdempotent("approvalEvidenceLinks", { ...(input.evidenceLink as AafRecord), approval_request_id: approvalRequest.id }, [
      "approval_request_id",
      "evidencePackageId",
      "linkRole",
    ]);
    const policyEvaluation = this.insertIdempotent("approvalPolicyEvaluations", { ...(input.policyEvaluation as AafRecord), approval_request_id: approvalRequest.id }, [
      "approval_request_id",
      "scope",
      "actionKey",
      "result",
      "evidencePackageId",
    ]);
    const auditEvent = this.insertIdempotent("auditEvents", { ...(input.requestedAuditEvent as AafRecord), approval_request_id: approvalRequest.id }, [
      "approval_request_id",
      "eventName",
      "payloadJson",
    ]);
    return { approvalRequest, subjectRefs, evidenceLink, policyEvaluation, auditEvent };
  }

  async withTransaction<T>(fn: (tx: { client: { query: (sql: string, values?: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }> } }) => Promise<T>): Promise<T> {
    return fn({ client: { query: async (sql, values = []) => this.query(sql, values) } });
  }

  grant(requestId: string, evidencePackageId: string, status = "granted", overrides: Partial<AafRecord> = {}) {
    return this.insert("approvalDecisions", {
      approval_request_id: requestId,
      evidence_package_id: evidencePackageId,
      status,
      policy_version: POLICY_VERSION,
      ...overrides,
    });
  }

  private insert(table: string, input: Record<string, unknown>): AafRecord {
    const row = this.toRow({ ...input, id: String(input.id ?? `${table}-${this.rows[table]!.length + 1}`) });
    this.rows[table]!.push(row);
    return row;
  }

  private insertNatural(table: string, input: Record<string, unknown>, keys: string[]): AafRecord {
    const row = this.toRow({ ...input, id: String(input.id ?? `${table}-${this.rows[table]!.length + 1}`) });
    const existing = this.rows[table]!.find((candidate) => keys.every((key) => stable(candidate[key]) === stable(row[key])));
    if (existing) return existing;
    this.rows[table]!.push(row);
    return row;
  }

  private insertIdempotent(table: string, input: AafRecord, semanticFields: string[]): AafRecord {
    const key = String(input.idempotencyKey ?? input.idempotency_key);
    const existing = this.rows[table]!.find((row) => row.idempotency_key === key);
    const row = this.toRow({ ...input, id: input.id ?? `${table}-${this.rows[table]!.length + 1}` });
    if (!existing) {
      this.rows[table]!.push(row);
      return row;
    }
    const drift = semanticFields.filter((field) => stable(this.toRowValue(input[field])) !== stable(existing[this.column(field)]));
    if (drift.length > 0) throw new AafIdempotencyConflictError(table, key, drift);
    return existing;
  }

  private toRow(input: AafRecord): AafRecord {
    const row: AafRecord = { id: String(input.id) };
    for (const [key, value] of Object.entries(input)) row[this.column(key)] = this.toRowValue(value);
    return row;
  }

  private toRowValue(value: unknown): unknown {
    return value;
  }

  private column(key: string): string {
    return key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
  }

  private async query(sql: string, values: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    if (sql.includes("gnr8_aaf_approval_decisions where id")) return this.select("approvalDecisions", "id", values[0]);
    if (sql.includes("gnr8_aaf_approval_requests where id")) return this.select("approvalRequests", "id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_packages where id")) return this.select("evidencePackages", "id", values[0]);
    if (sql.includes("gnr8_aaf_approval_subject_refs where approval_request_id")) return this.select("approvalSubjectRefs", "approval_request_id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_source_refs where evidence_package_id")) return this.select("evidencePackageSourceRefs", "evidence_package_id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_freshness_checks")) return this.select("evidencePackageFreshnessChecks", "evidence_package_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_revocations")) return this.exists("approvalRevocations", "approval_decision_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_supersession_links")) return this.exists("approvalSupersessionLinks", "superseded_decision_id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_supersession")) return this.exists("evidencePackageSupersession", "superseded_package_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_evidence_links")) {
      const rows = this.rows.approvalEvidenceLinks.filter((row) => row.approval_request_id === values[0] && row.evidence_package_id === values[1]);
      return { rows: [{ exists: rows.length > 0 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  private select(table: string, field: string, value: unknown) {
    const rows = this.rows[table]!.filter((row) => row[field] === value);
    return { rows, rowCount: rows.length };
  }

  private exists(table: string, field: string, value: unknown) {
    return { rows: [{ exists: this.rows[table]!.some((row) => row[field] === value) }], rowCount: 1 };
  }
}

async function preparedWithGrant(status = "granted") {
  const writer = new FakeAafWriter();
  const bridge = new SingleSiteClientApprovalAafBridge(writer as never);
  const input = baseInput();
  const prepared = await bridge.prepareClientApprovalRequest(input);
  const decision = writer.grant(prepared.approvalRequest.id, prepared.evidencePackage.id, status);
  return { writer, bridge, input, prepared, decision };
}

test("client approval bridge blocks missing required refs", async () => {
  const bridge = new SingleSiteClientApprovalAafBridge(new FakeAafWriter() as never);
  await assert.rejects(() => bridge.prepareClientApprovalRequest(baseInput({ clientApprovalId: "" })), /clientApprovalId/);
  await assert.rejects(() => bridge.prepareClientApprovalRequest(baseInput({ contentApprovalRef: { ...baseInput().contentApprovalRef, approvalStatus: "draft" } })), /approved/);
  await assert.rejects(() => bridge.prepareClientApprovalRequest(baseInput({ selectedRecommendationRefs: [] })), /selectedRecommendationRefs/);
  await assert.rejects(() => bridge.prepareClientApprovalRequest(baseInput({ clientFacingSummaryRef: { ...baseInput().clientFacingSummaryRef, sourceRecordId: "" } })), /clientFacingSummaryRef\.sourceRecordId/);
  await assert.rejects(() => bridge.prepareClientApprovalRequest(baseInput({ reviewerIdentityRef: { ...baseInput().reviewerIdentityRef, sourceWatermark: "" } })), /reviewerIdentityRef\.sourceWatermark/);
});

test("client approval bridge builds exact-scope subject/evidence refs and no decision", async () => {
  const writer = new FakeAafWriter();
  const prepared = await new SingleSiteClientApprovalAafBridge(writer as never).prepareClientApprovalRequest(baseInput());
  assert.equal(prepared.scope, AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE);
  assert.equal(prepared.subjectType, AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE);
  assert.equal(prepared.subjectId, CLIENT_APPROVAL_ID);
  assert.equal(prepared.evidencePackage.package_type, AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE);
  assert.equal(prepared.approvalRequest.scope, AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE);
  assert.equal(prepared.approvalRequest.status, "requested");
  assert.ok(prepared.subjectRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeSubjectRole === "content_approval"));
  assert.ok(prepared.subjectRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeSubjectRole === "client_or_account_reviewer_identity"));
  assert.ok(prepared.evidenceSourceRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeEvidenceRole === "content_approval_decision"));
  assert.ok(prepared.evidenceSourceRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeEvidenceRole === "client_facing_summary"));
  assert.equal(writer.rows.approvalDecisions.length, 0);
});

test("client approval bridge reuses evidence/request idempotently and rejects drift", async () => {
  const writer = new FakeAafWriter();
  const bridge = new SingleSiteClientApprovalAafBridge(writer as never);
  const first = await bridge.prepareClientApprovalRequest(baseInput());
  const replay = await bridge.prepareClientApprovalRequest(baseInput());
  assert.equal(replay.evidencePackage.id, first.evidencePackage.id);
  assert.equal(replay.approvalRequest.id, first.approvalRequest.id);
  assert.equal(writer.rows.evidencePackageSourceRefs.length, first.evidenceSourceRefs.length);
  await assert.rejects(
    () =>
      bridge.prepareClientApprovalRequest(
        baseInput({ clientFacingSummaryRef: { ...baseInput().clientFacingSummaryRef, sourceWatermark: "client-summary-1:drifted" } }),
      ),
    AafIdempotencyConflictError,
  );
});

test("client approval bridge validates granted and granted_with_limitations decisions", async () => {
  const granted = await preparedWithGrant();
  const valid = await granted.bridge.validateClientApprovalDecisionRef(validationInput(granted.input, granted.decision.id, granted.prepared.approvalRequest.id, granted.prepared.evidencePackage.id));
  assert.equal(valid.valid, true, JSON.stringify(valid));
  assert.equal(valid.status, "granted");
  assert.deepEqual(valid.limitations, [
    { client: "client accepts scope caveat" },
    { content: "copy approved with manual caveat" },
    { contentDecision: "content limitation carried" },
    { proposal: "approved selected work only" },
    { implementation: "no publish" },
  ]);

  const limited = await preparedWithGrant("granted_with_limitations");
  const limitedValid = await limited.bridge.validateClientApprovalDecisionRef(validationInput(limited.input, limited.decision.id, limited.prepared.approvalRequest.id, limited.prepared.evidencePackage.id));
  assert.equal(limitedValid.valid, true, JSON.stringify(limitedValid));
  assert.equal(limitedValid.status, "granted_with_limitations");
  assert.ok(limitedValid.limitations.length > 0);
});

test("client approval bridge rejects wrong scopes and prohibited approval substitutions", async () => {
  for (const scope of ["single_site_content_approval", "client_review", "launch_signoff", "single_site_launch_approval", "publish_activation", "ai_advisory_plan_acceptance"]) {
    const writer = new FakeAafWriter();
    const bridge = new SingleSiteClientApprovalAafBridge(writer as never);
    writer.rows.approvalRequests.push({
      id: `request-${scope}`,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      site_id: SITE_ID,
      scope,
      status: "requested",
      subject_type: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
      subject_id: CLIENT_APPROVAL_ID,
      policy_version: POLICY_VERSION,
    });
    const decision = writer.grant(`request-${scope}`, "missing-evidence", "granted");
    const result = await bridge.validateClientApprovalDecisionRef(validationInput(baseInput(), decision.id));
    assert.equal(result.valid, false);
    assert.deepEqual(result.blockerCodes, ["approval_scope_mismatch"]);
  }
});

test("client approval bridge rejects preview/public runtime substitutions and stale decisions", async () => {
  for (const status of ["rejected", "revoked", "expired", "superseded", "cancelled"]) {
    const scenario = await preparedWithGrant(status);
    const result = await scenario.bridge.validateClientApprovalDecisionRef(validationInput(scenario.input, scenario.decision.id));
    assert.equal(result.valid, false);
    assert.equal(result.status, status);
  }

  const revoked = await preparedWithGrant();
  revoked.writer.rows.approvalRevocations.push({ id: "revocation-1", approval_decision_id: revoked.decision.id });
  assert.equal((await revoked.bridge.validateClientApprovalDecisionRef(validationInput(revoked.input, revoked.decision.id))).status, "revoked");

  const superseded = await preparedWithGrant();
  superseded.writer.rows.approvalSupersessionLinks.push({ id: "supersession-1", superseded_decision_id: superseded.decision.id });
  assert.equal((await superseded.bridge.validateClientApprovalDecisionRef(validationInput(superseded.input, superseded.decision.id))).status, "superseded");

  const stale = await preparedWithGrant();
  stale.writer.rows.evidencePackages[0]!.source_watermark = "preview-rendering-is-not-approval-truth";
  assert.equal((await stale.bridge.validateClientApprovalDecisionRef(validationInput(stale.input, stale.decision.id))).status, "stale");
});

test("client approval bridge preparation has no runtime, publish, provider, or public-route side effects", async () => {
  const writer = new FakeAafWriter();
  await new SingleSiteClientApprovalAafBridge(writer as never).prepareClientApprovalRequest(baseInput());
  assert.deepEqual(writer.runtimeMutations, []);
  assert.deepEqual(writer.generatedProposalBundles, []);
  assert.deepEqual(writer.publishDomainBillingProviderCalls, []);
  assert.deepEqual(writer.publicRuntimeRefs, []);
  assert.deepEqual(writer.rows.approvalDecisions, []);
});
