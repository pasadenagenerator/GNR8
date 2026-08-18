import assert from "node:assert/strict";
import test from "node:test";

import {
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import { AafIdempotencyConflictError, type AafRecord } from "../aaf/aaf-writer-repository";
import {
  SingleSiteImplementationAuthorizationBridge,
  type PrepareImplementationAuthorizationRequestInput,
  type ValidateImplementationAuthorizationRefInput,
} from "./implementation-authorization-bridge";

const TENANT_ID = "tenant-mvp18";
const CLIENT_ID = "client-mvp18";
const SITE_ID = "site-mvp18";
const MIGRATION_ID = "migration-mvp18";
const PLAN_ID = "proposal-plan-mvp18";
const POLICY_VERSION = "MVP-18";

function actor() {
  return { actorType: "human" as const, actorId: "operator-mvp18", actorRole: "migration_operator" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return { sourceTable, sourceRecordId, sourceWatermark, contentHash: `${sourceRecordId}-hash-0123456789abcdef` };
}

function baseInput(overrides: Partial<PrepareImplementationAuthorizationRequestInput> = {}): PrepareImplementationAuthorizationRequestInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    proposalPlanId: PLAN_ID,
    proposalPlanVersion: 3,
    proposalPlanSemanticWatermark: "proposal-plan:v3:watermark",
    proposalStatus: "approved",
    proposalApprovalRef: {
      approvalSource: "aaf",
      approvalRequestId: "proposal-approval-request",
      approvalDecisionId: "proposal-approval-decision",
      evidencePackageId: "proposal-approval-evidence",
      sourceWatermark: "proposal-approval:watermark",
      limitations: [{ proposal: "approved copy recommendations only" }],
    },
    cloneReviewRef: { ...source("gnr8_single_site_clone_reviews", "clone-review-1"), reviewStatus: "accepted", limitations: [] },
    cloneSiteVersionRef: source("runtime_site_versions", "clone-site-version-1"),
    runtimeArtifactRef: source("runtime_artifacts", "runtime-artifact-1"),
    sourceEvidenceReviewRef: { ...source("gnr8_single_site_source_evidence_reviews", "source-review-1"), reviewStatus: "accepted", limitations: [] },
    selectedRecommendationRefs: [
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", "recommendation-1"),
        recommendationId: "recommendation-1",
        recommendationKey: "hero-copy",
      },
    ],
    implementationScopeSummary: "Implement only the selected hero copy recommendation.",
    implementationNonGoals: ["No publish", "No billing", "No DNS"],
    riskImpactEffortSummary: { risk: "low", impact: "high", effort: "small" },
    limitations: [{ carryForward: "source font unavailable" }],
    operatorNotes: [{ note: "Request only, no implementation." }],
    actor: actor(),
    correlationId: "corr-mvp18",
    idempotencyKey: "idem-mvp18",
    policyVersion: POLICY_VERSION,
    ...overrides,
  };
}

function validationInput(input: PrepareImplementationAuthorizationRequestInput, decisionId: string, requestId?: string, evidencePackageId?: string): ValidateImplementationAuthorizationRefInput {
  return {
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
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
    limitations: input.limitations,
    operatorNotes: input.operatorNotes,
    advisoryAiProviderRefs: input.advisoryAiProviderRefs,
    auditTimelineRefs: input.auditTimelineRefs,
    implementationTargetRef: input.implementationTargetRef,
    implementationAttemptPlaceholderRef: input.implementationAttemptPlaceholderRef,
    implementationAuthorizationDecisionId: decisionId,
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
    aafGateAttempts: [],
    improvementExecutionAttempts: [],
    approvalRevocations: [],
    approvalSupersessionLinks: [],
    evidencePackageSupersession: [],
  };
  runtimeMutations: unknown[] = [];
  generatedProposalBundles: unknown[] = [];
  publishDomainBillingProviderCalls: unknown[] = [];

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
    const sourceRefs = (input.sourceRefs as AafRecord[]).map((ref) => this.insert("evidencePackageSourceRefs", { ...ref, evidence_package_id: evidencePackage.id }));
    const items = (input.items as AafRecord[]).map((item) => this.insert("evidencePackageItems", { ...item, evidence_package_id: evidencePackage.id }));
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
    if (sql.includes("gnr8_aaf_evidence_package_items where evidence_package_id")) return this.select("evidencePackageItems", "evidence_package_id", values[0]);
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
  const bridge = new SingleSiteImplementationAuthorizationBridge(writer as never);
  const input = baseInput();
  const prepared = await bridge.prepareImplementationAuthorizationRequest(input);
  const decision = writer.grant(prepared.approvalRequest.id, prepared.evidencePackage.id, status);
  return { writer, bridge, input, prepared, decision };
}

test("bridge blocks unapproved proposals and missing required refs", async () => {
  const bridge = new SingleSiteImplementationAuthorizationBridge(new FakeAafWriter() as never);
  await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest(baseInput({ proposalStatus: "draft" })), /approved proposal/);
  await assert.rejects(
    () =>
      bridge.prepareImplementationAuthorizationRequest(
        baseInput({
          proposalApprovalRef: {
            approvalSource: "aaf",
            approvalRequestId: "proposal-approval-request",
            approvalDecisionId: "",
            evidencePackageId: "proposal-approval-evidence",
            sourceWatermark: "proposal-approval:watermark",
          },
        }),
      ),
    /proposalApprovalRef\.approvalDecisionId/,
  );
  await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest(baseInput({ cloneReviewRef: { ...baseInput().cloneReviewRef, sourceRecordId: "" } })), /cloneReviewRef\.sourceRecordId/);
  await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest(baseInput({ sourceEvidenceReviewRef: { ...baseInput().sourceEvidenceReviewRef, sourceWatermark: "" } })), /sourceEvidenceReviewRef\.sourceWatermark/);
  await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest(baseInput({ selectedRecommendationRefs: [] })), /selectedRecommendationRefs/);
  await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest(baseInput({ implementationScopeSummary: "" })), /implementationScopeSummary/);
});

test("bridge builds exact-scope evidence and request records without approval decisions", async () => {
  const writer = new FakeAafWriter();
  const prepared = await new SingleSiteImplementationAuthorizationBridge(writer as never).prepareImplementationAuthorizationRequest(baseInput());
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE, "single_site_improvement_implementation_authorization");
  assert.equal(prepared.scope, AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE);
  assert.equal(prepared.subjectType, AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE);
  assert.equal(prepared.evidencePackage.package_type, AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE);
  assert.equal(prepared.approvalRequest.scope, AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE);
  assert.equal(prepared.approvalRequest.status, "requested");
  assert.ok(prepared.subjectRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeSubjectRole === "proposal_plan"));
  assert.ok(prepared.subjectRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeSubjectRole === "clone_site_version"));
  assert.ok(prepared.evidenceSourceRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeEvidenceRole === "implementation_scope_summary"));
  assert.equal(writer.rows.approvalDecisions.length, 0);
  assert.equal(writer.rows.aafGateAttempts.length, 0);
  assert.equal(writer.rows.improvementExecutionAttempts.length, 0);
});

test("bridge accepts proposal-event approval refs as evidence-only preparation inputs", async () => {
  const writer = new FakeAafWriter();
  const input = baseInput({
    proposalPlanId: "f541075c-4641-4f70-b5ff-64a8af071571",
    proposalPlanSemanticWatermark: "sha256:22fd5d1cfbb488a3153cd6ddba186ea7f2b8676a6c96521ae8f4d98771f8a42a",
    proposalApprovalRef: {
      approvalSource: "proposal_event",
      proposalEventId: "f7320eae-2426-4c8e-ab91-0cfdac135d82",
      stateEventId: "54ace8d6-401c-4ade-9ad2-ec4539dc3642",
      proposalStatus: "approved",
      eventAction: "approved",
      sourceWatermark: "proposal-approved:f541075c-4641-4f70-b5ff-64a8af071571:v3",
      limitations: [],
    },
    selectedRecommendationRefs: [
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", "73de9484-1461-4476-b677-f41d7a839df7"),
        recommendationId: "73de9484-1461-4476-b677-f41d7a839df7",
      },
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", "86342f67-7cce-43de-823f-ea0f4adc1a41"),
        recommendationId: "86342f67-7cce-43de-823f-ea0f4adc1a41",
      },
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", "0be61bde-6568-4f33-8499-4d5eade70837"),
        recommendationId: "0be61bde-6568-4f33-8499-4d5eade70837",
      },
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", "a61e857e-89c1-4ab1-bdc1-581a24e824c1"),
        recommendationId: "a61e857e-89c1-4ab1-bdc1-581a24e824c1",
      },
    ],
  });

  const prepared = await new SingleSiteImplementationAuthorizationBridge(writer as never).prepareImplementationAuthorizationRequest(input);
  assert.equal(prepared.approvalRequest.scope, "single_site_improvement_implementation_authorization");
  assert.equal(prepared.evidencePackage.package_type, "single_site_improvement_implementation_authorization_evidence");
  assert.equal(prepared.approvalRequest.status, "requested");
  assert.ok(prepared.subjectRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeSubjectRole === "proposal_approval_event"));
  assert.ok(prepared.subjectRefs.some((ref) => (ref.metadata_json as Record<string, unknown>).bridgeSubjectRole === "proposal_approval_state_event"));
  const proposalApprovalEvidence = prepared.evidenceSourceRefs.find((ref) => (ref.metadata_json as Record<string, unknown>).bridgeEvidenceRole === "proposal_approval");
  assert.equal(proposalApprovalEvidence?.source_table, "gnr8_single_site_improvement_proposal_events");
  assert.equal(proposalApprovalEvidence?.source_record_id, "f7320eae-2426-4c8e-ab91-0cfdac135d82");
  assert.equal((proposalApprovalEvidence?.metadata_json as Record<string, unknown>).implementationAuthorizationDecisionSubstitution, false);
  assert.equal(writer.rows.approvalDecisions.length, 0);
  assert.equal(writer.rows.aafGateAttempts.length, 0);
  assert.equal(writer.rows.improvementExecutionAttempts.length, 0);
});

test("bridge reuses evidence and request rows idempotently and rejects drift", async () => {
  const writer = new FakeAafWriter();
  const bridge = new SingleSiteImplementationAuthorizationBridge(writer as never);
  const first = await bridge.prepareImplementationAuthorizationRequest(baseInput());
  const replay = await bridge.prepareImplementationAuthorizationRequest(baseInput());
  assert.equal(replay.evidencePackage.id, first.evidencePackage.id);
  assert.equal(replay.approvalRequest.id, first.approvalRequest.id);
  await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest(baseInput({ implementationScopeSummary: "Changed scope." })), AafIdempotencyConflictError);
});

test("bridge validates exact-scope granted decisions and preserves limited grant evidence", async () => {
  const granted = await preparedWithGrant();
  const valid = await granted.bridge.validateImplementationAuthorizationRef(validationInput(granted.input, granted.decision.id, granted.prepared.approvalRequest.id, granted.prepared.evidencePackage.id));
  assert.equal(valid.valid, true);
  assert.equal(valid.status, "granted");
  assert.deepEqual(valid.limitations, [{ carryForward: "source font unavailable" }, { proposal: "approved copy recommendations only" }]);

  const limited = await preparedWithGrant("granted_with_limitations");
  const limitedValid = await limited.bridge.validateImplementationAuthorizationRef(validationInput(limited.input, limited.decision.id, limited.prepared.approvalRequest.id, limited.prepared.evidencePackage.id));
  assert.equal(limitedValid.valid, true);
  assert.equal(limitedValid.status, "granted_with_limitations");
  assert.ok(limitedValid.limitations.length > 0);
});

test("bridge rejects wrong scopes and prohibited approval substitutions", async () => {
  for (const scope of ["single_site_implementation_authorization", "content_publish", "client_review", "launch_signoff", "publish_activation", "ai_advisory_plan_acceptance"]) {
    const writer = new FakeAafWriter();
    const bridge = new SingleSiteImplementationAuthorizationBridge(writer as never);
    const request = writer.rows.approvalRequests.push({
      id: `request-${scope}`,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      site_id: SITE_ID,
      scope,
      subject_type: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
      subject_id: PLAN_ID,
      policy_version: POLICY_VERSION,
    });
    const decision = writer.grant(`request-${scope}`, "missing-evidence", "granted");
    assert.equal(request, 1);
    const result = await bridge.validateImplementationAuthorizationRef(validationInput(baseInput(), decision.id));
    assert.equal(result.valid, false);
    assert.deepEqual(result.blockerCodes, ["approval_scope_mismatch"]);
  }
});

test("bridge rejects rejected, revoked, expired, superseded, stale, and mismatched decisions", async () => {
  for (const status of ["rejected", "revoked", "expired", "superseded", "cancelled"]) {
    const scenario = await preparedWithGrant(status);
    const result = await scenario.bridge.validateImplementationAuthorizationRef(validationInput(scenario.input, scenario.decision.id));
    assert.equal(result.valid, false);
    assert.equal(result.status, status);
  }
  const revoked = await preparedWithGrant();
  revoked.writer.rows.approvalRevocations.push({ id: "revocation-1", approval_decision_id: revoked.decision.id });
  assert.equal((await revoked.bridge.validateImplementationAuthorizationRef(validationInput(revoked.input, revoked.decision.id))).status, "revoked");

  const superseded = await preparedWithGrant();
  superseded.writer.rows.approvalSupersessionLinks.push({ id: "supersession-1", superseded_decision_id: superseded.decision.id });
  assert.equal((await superseded.bridge.validateImplementationAuthorizationRef(validationInput(superseded.input, superseded.decision.id))).status, "superseded");

  const stale = await preparedWithGrant();
  stale.writer.rows.evidencePackages[0]!.source_watermark = "stale-watermark";
  assert.equal((await stale.bridge.validateImplementationAuthorizationRef(validationInput(stale.input, stale.decision.id))).status, "stale");
});

test("bridge has no runtime, proposal bundle, publish, domain, billing, provider, or decision side effects during preparation", async () => {
  const writer = new FakeAafWriter();
  await new SingleSiteImplementationAuthorizationBridge(writer as never).prepareImplementationAuthorizationRequest(baseInput());
  assert.deepEqual(writer.runtimeMutations, []);
  assert.deepEqual(writer.generatedProposalBundles, []);
  assert.deepEqual(writer.publishDomainBillingProviderCalls, []);
  assert.deepEqual(writer.rows.approvalDecisions, []);
  assert.deepEqual(writer.rows.aafGateAttempts, []);
  assert.deepEqual(writer.rows.improvementExecutionAttempts, []);
});

test("bridge rejects missing proposal-event approval evidence", async () => {
  const bridge = new SingleSiteImplementationAuthorizationBridge(new FakeAafWriter() as never);
  await assert.rejects(
    () =>
      bridge.prepareImplementationAuthorizationRequest(
        baseInput({
          proposalApprovalRef: {
            approvalSource: "proposal_event",
            proposalEventId: "",
            stateEventId: "54ace8d6-401c-4ade-9ad2-ec4539dc3642",
            sourceWatermark: "proposal-approved:watermark",
          },
        }),
      ),
    /proposalApprovalRef\.proposalEventId/,
  );
  await assert.rejects(
    () =>
      bridge.prepareImplementationAuthorizationRequest(
        baseInput({
          proposalApprovalRef: {
            approvalSource: "proposal_event",
            proposalEventId: "f7320eae-2426-4c8e-ab91-0cfdac135d82",
            stateEventId: "",
            sourceWatermark: "proposal-approved:watermark",
          },
        }),
      ),
    /proposalApprovalRef\.stateEventId/,
  );
});
