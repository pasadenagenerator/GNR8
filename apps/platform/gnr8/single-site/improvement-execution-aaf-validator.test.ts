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
} from "./implementation-authorization-bridge";
import {
  ImprovementExecutionAafValidator,
  type ImprovementExecutionAafValidatorInput,
} from "./improvement-execution-aaf-validator";

const TENANT_ID = "tenant-mvp20";
const CLIENT_ID = "client-mvp20";
const SITE_ID = "site-mvp20";
const MIGRATION_ID = "migration-mvp20";
const PLAN_ID = "proposal-plan-mvp20";
const POLICY_VERSION = "MVP-20";

function actor() {
  return { actorType: "human" as const, actorId: "operator-mvp20", actorRole: "migration_operator" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return { sourceTable, sourceRecordId, sourceWatermark, contentHash: `${sourceRecordId}-hash-0123456789abcdef` };
}

function basePrepareInput(overrides: Partial<PrepareImplementationAuthorizationRequestInput> = {}): PrepareImplementationAuthorizationRequestInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    proposalPlanId: PLAN_ID,
    proposalPlanVersion: 4,
    proposalPlanSemanticWatermark: "proposal-plan:v4:watermark",
    proposalStatus: "approved",
    proposalApprovalRef: {
      approvalRequestId: "proposal-approval-request",
      approvalDecisionId: "proposal-approval-decision",
      evidencePackageId: "proposal-approval-evidence",
      sourceWatermark: "proposal-approval:watermark",
      limitations: [],
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
    limitations: [],
    operatorNotes: [{ note: "Execution-time validation only." }],
    actor: actor(),
    correlationId: "corr-mvp20",
    idempotencyKey: "idem-mvp20",
    policyVersion: POLICY_VERSION,
    ...overrides,
  };
}

function executionInput(
  preparedInput: PrepareImplementationAuthorizationRequestInput,
  decision: AafRecord,
  prepared: Awaited<ReturnType<SingleSiteImplementationAuthorizationBridge["prepareImplementationAuthorizationRequest"]>>,
  overrides: Partial<ImprovementExecutionAafValidatorInput> = {},
): ImprovementExecutionAafValidatorInput {
  return {
    tenantId: preparedInput.tenantId,
    clientId: preparedInput.clientId,
    siteId: preparedInput.siteId,
    migrationId: preparedInput.migrationId,
    proposalPlanId: preparedInput.proposalPlanId,
    proposalPlanVersion: preparedInput.proposalPlanVersion,
    proposalStatus: preparedInput.proposalStatus,
    proposalPlanSemanticWatermark: preparedInput.proposalPlanSemanticWatermark,
    proposalApprovalRef: preparedInput.proposalApprovalRef,
    implementationAuthorizationRef: {
      approvalRequestId: prepared.approvalRequest.id,
      approvalDecisionId: decision.id,
      evidencePackageId: prepared.evidencePackage.id,
      sourceTable: "gnr8_aaf_approval_decisions",
      sourceRecordId: decision.id,
      scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
    },
    cloneReviewRef: preparedInput.cloneReviewRef,
    cloneSiteVersionRef: preparedInput.cloneSiteVersionRef,
    cloneRuntimeArtifactRef: preparedInput.runtimeArtifactRef,
    sourceEvidenceReviewRef: preparedInput.sourceEvidenceReviewRef,
    selectedRecommendationRefs: preparedInput.selectedRecommendationRefs,
    expectedRecommendationWatermarks: Object.fromEntries(preparedInput.selectedRecommendationRefs.map((ref) => [ref.recommendationId, ref.sourceWatermark])),
    implementationScopeSummary: preparedInput.implementationScopeSummary,
    implementationScopeWatermark: prepared.semanticWatermark,
    implementationNonGoals: preparedInput.implementationNonGoals,
    riskImpactEffortSummary: preparedInput.riskImpactEffortSummary,
    limitations: preparedInput.limitations,
    operatorNotes: preparedInput.operatorNotes,
    actor: actor(),
    correlationId: "corr-execution-mvp20",
    idempotencyKey: "idem-execution-mvp20",
    executionAttemptKey: "attempt-mvp20",
    policyVersion: preparedInput.policyVersion,
    ...overrides,
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

class FakeAafStore {
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
    improvementExecutionAttempts: [],
  };
  runtimeMutations: unknown[] = [];
  generatedProposalBundles: unknown[] = [];
  providerCalls: unknown[] = [];

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
    if (sql.includes("approval_request_id = $1::uuid") && sql.includes("id <> $2::uuid")) {
      const rows = this.rows.approvalDecisions.filter((row) => row.approval_request_id === values[0] && row.id !== values[1] && ["granted", "granted_with_limitations"].includes(String(row.status)));
      return { rows, rowCount: rows.length };
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

async function preparedScenario(status = "granted", prepareOverrides: Partial<PrepareImplementationAuthorizationRequestInput> = {}, decisionOverrides: Partial<AafRecord> = {}) {
  const store = new FakeAafStore();
  const bridge = new SingleSiteImplementationAuthorizationBridge(store as never);
  const validator = new ImprovementExecutionAafValidator(store as never);
  const prepareInput = basePrepareInput(prepareOverrides);
  const prepared = await bridge.prepareImplementationAuthorizationRequest(prepareInput);
  const decision = store.grant(prepared.approvalRequest.id, prepared.evidencePackage.id, status, decisionOverrides);
  return { store, bridge, validator, prepareInput, prepared, decision };
}

function storedReplay(scenario: Awaited<ReturnType<typeof preparedScenario>>): Record<string, unknown> {
  return (scenario.store.rows.evidencePackages[0]!.limitations_json as Record<string, unknown>).implementationAuthorizationSemanticReplay as Record<string, unknown>;
}

test("execution-time validator allows granted exact-scope authorization and mutates nothing", async () => {
  const scenario = await preparedScenario();
  const beforeCounts = Object.fromEntries(Object.entries(scenario.store.rows).map(([table, rows]) => [table, rows.length]));
  const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "allowed");
  assert.equal(result.reasonCode, "authorization_valid");
  assert.equal(result.matchedAafRequestDecisionRefs.approvalDecisionId, scenario.decision.id);
  assert.equal(result.matchedSubjectRefs.some((ref) => ref.role === "proposal_plan"), true);
  assert.equal(result.matchedEvidenceRefs.some((ref) => ref.role === "implementation_scope_summary"), true);
  assert.equal(result.mutatesSourceTruth, false);
  assert.equal(result.nonExecuting, true);
  assert.deepEqual(Object.fromEntries(Object.entries(scenario.store.rows).map(([table, rows]) => [table, rows.length])), beforeCounts);
  assert.equal(scenario.store.rows.improvementExecutionAttempts.length, 0);
  assert.deepEqual(scenario.store.runtimeMutations, []);
  assert.deepEqual(scenario.store.generatedProposalBundles, []);
  assert.deepEqual(scenario.store.providerCalls, []);
});

test("execution-time validator replays the original authorization semantic input exactly", async () => {
  const scenario = await preparedScenario(
    "granted",
    {
      policyVersion: "MVP-18",
      operatorNotes: [{ note: "Original operator note stored at authorization time." }],
      implementationAttemptPlaceholderRef: "authorization-placeholder-1",
    },
    { policy_version: "MVP-18" },
  );
  const result = await scenario.validator.validateImprovementExecutionAuthorization(
    executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, {
      operatorNotes: [],
      policyVersion: "MVP-20-validator",
    }),
  );
  assert.equal(result.allowed, true);
  assert.equal(result.freshnessResult.expectedSemanticWatermark, scenario.prepared.semanticWatermark);
  assert.equal(result.freshnessResult.actualEvidenceWatermark, scenario.prepared.semanticWatermark);
  assert.equal(result.freshnessResult.actualFreshnessWatermark, scenario.prepared.semanticWatermark);
  assert.equal(scenario.store.rows.improvementExecutionAttempts.length, 0);
});

test("execution-time validator accepts proposal-event approval evidence only with stored replay", async () => {
  const scenario = await preparedScenario("granted", {
    proposalApprovalRef: {
      approvalSource: "proposal_event",
      proposalEventId: "proposal-event-approved-1",
      stateEventId: "proposal-state-event-approved-1",
      proposalStatus: "approved",
      eventAction: "approved",
      sourceWatermark: "proposal-event-approved:v4",
      limitations: [],
    },
  });
  const proposalEvidence = scenario.prepared.evidenceSourceRefs.find((ref) => (ref.metadata_json as Record<string, unknown>).bridgeEvidenceRole === "proposal_approval");
  assert.equal((proposalEvidence?.metadata_json as Record<string, unknown>).evidenceOnlyForImplementationAuthorization, true);
  assert.equal((proposalEvidence?.metadata_json as Record<string, unknown>).implementationAuthorizationDecisionSubstitution, false);
  const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
  assert.equal(result.allowed, true);
  assert.equal(result.prohibitedSubstitutionFlags.proposalApproval, false);
  assert.equal(scenario.store.rows.improvementExecutionAttempts.length, 0);
});

test("execution-time validator carries granted_with_limitations when represented by the backing store", async () => {
  const scenario = await preparedScenario("granted_with_limitations", {
    limitations: [{ source: "font unavailable" }],
    proposalApprovalRef: { ...basePrepareInput().proposalApprovalRef, limitations: [{ proposal: "hero copy only" }] },
  });
  const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "allowed_with_limitations");
  assert.equal(result.reasonCode, "authorization_valid_with_limitations");
  assert.deepEqual(result.limitations, [{ source: "font unavailable" }, { proposal: "hero copy only" }]);
});

test("execution-time validator blocks missing refs, non-decision refs, and prohibited approval substitutions", async () => {
  const scenario = await preparedScenario();
  assert.equal(
    (await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, { implementationAuthorizationRef: {} }))).reasonCode,
    "authorization_ref_missing",
  );
  const generatedBundle = await scenario.validator.validateImprovementExecutionAuthorization(
    executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, {
      implementationAuthorizationRef: {
        sourceTable: "gnr8_generated_proposal_bundles",
        sourceRecordId: "bundle-1",
        approvalDecisionId: scenario.decision.id,
        refKind: "generated_proposal_bundle",
      },
    }),
  );
  assert.equal(generatedBundle.allowed, false);
  assert.equal(generatedBundle.reasonCode, "authorization_ref_not_aaf_decision");
  assert.equal(generatedBundle.prohibitedSubstitutionFlags.generatedProposalBundle, true);

  for (const [scope, flag] of [
    ["content_publish", "contentApproval"],
    ["client_review", "clientApproval"],
    ["launch_signoff", "launchApproval"],
    ["publish_activation", "publishActivation"],
    ["ai_advisory_plan_acceptance", "aiProviderAdvisory"],
  ] as const) {
    const store = new FakeAafStore();
    const validator = new ImprovementExecutionAafValidator(store as never);
    const request = store.rows.approvalRequests.push({
      id: `request-${scope}`,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      site_id: SITE_ID,
      scope,
      subject_type: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
      subject_id: PLAN_ID,
      policy_version: POLICY_VERSION,
    });
    assert.equal(request, 1);
    const decision = store.grant(`request-${scope}`, scenario.prepared.evidencePackage.id, "granted");
    const result = await validator.validateImprovementExecutionAuthorization(
      executionInput(scenario.prepareInput, decision, scenario.prepared, {
        implementationAuthorizationRef: {
          approvalDecisionId: decision.id,
          sourceTable: "gnr8_aaf_approval_decisions",
          sourceRecordId: decision.id,
          scope,
        },
      }),
    );
    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, "wrong_scope");
    assert.equal(result.prohibitedSubstitutionFlags[flag], true);
  }
});

test("execution-time validator blocks requested, rejected, revoked, expired, superseded, and conflicting decisions", async () => {
  const requestedOnly = await preparedScenario();
  const requested = await requestedOnly.validator.validateImprovementExecutionAuthorization(
    executionInput(requestedOnly.prepareInput, requestedOnly.decision, requestedOnly.prepared, {
      implementationAuthorizationRef: {
        approvalRequestId: requestedOnly.prepared.approvalRequest.id,
        approvalDecisionId: "missing-decision",
        evidencePackageId: requestedOnly.prepared.evidencePackage.id,
        sourceTable: "gnr8_aaf_approval_decisions",
        sourceRecordId: "missing-decision",
      },
    }),
  );
  assert.equal(requested.allowed, false);
  assert.equal(requested.reasonCode, "approval_required");

  for (const [status, reasonCode] of [
    ["rejected", "approval_rejected"],
    ["revoked", "approval_revoked"],
    ["expired", "approval_expired"],
    ["superseded", "approval_superseded"],
    ["cancelled", "approval_cancelled"],
  ] as const) {
    const scenario = await preparedScenario(status);
    const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
    assert.equal(result.allowed, false);
    assert.equal(result.reasonCode, reasonCode);
  }

  const revoked = await preparedScenario();
  revoked.store.rows.approvalRevocations.push({ id: "revocation-1", approval_decision_id: revoked.decision.id });
  assert.equal((await revoked.validator.validateImprovementExecutionAuthorization(executionInput(revoked.prepareInput, revoked.decision, revoked.prepared))).reasonCode, "approval_revoked");

  const superseded = await preparedScenario();
  superseded.store.rows.approvalSupersessionLinks.push({ id: "supersession-1", superseded_decision_id: superseded.decision.id });
  assert.equal((await superseded.validator.validateImprovementExecutionAuthorization(executionInput(superseded.prepareInput, superseded.decision, superseded.prepared))).reasonCode, "approval_superseded");

  const conflict = await preparedScenario();
  conflict.store.grant(conflict.prepared.approvalRequest.id, conflict.prepared.evidencePackage.id, "granted", { id: "conflicting-grant" });
  assert.equal((await conflict.validator.validateImprovementExecutionAuthorization(executionInput(conflict.prepareInput, conflict.decision, conflict.prepared))).reasonCode, "approval_conflict");
});

test("execution-time validator blocks missing subject/evidence refs and subject mismatches", async () => {
  const missingSubject = await preparedScenario();
  missingSubject.store.rows.approvalSubjectRefs = missingSubject.store.rows.approvalSubjectRefs.filter((row) => (row.metadata_json as Record<string, unknown>).bridgeSubjectRole !== "proposal_plan");
  const missingSubjectResult = await missingSubject.validator.validateImprovementExecutionAuthorization(executionInput(missingSubject.prepareInput, missingSubject.decision, missingSubject.prepared));
  assert.equal(missingSubjectResult.allowed, false);
  assert.equal(missingSubjectResult.reasonCode, "wrong_subject");
  assert.equal(missingSubjectResult.missingRefs.subject.includes("proposal_plan"), true);

  const mismatchedSubject = await preparedScenario();
  const subject = mismatchedSubject.store.rows.approvalSubjectRefs.find((row) => (row.metadata_json as Record<string, unknown>).bridgeSubjectRole === "site");
  assert.ok(subject);
  subject.source_record_id = "different-site";
  const mismatchedSubjectResult = await mismatchedSubject.validator.validateImprovementExecutionAuthorization(executionInput(mismatchedSubject.prepareInput, mismatchedSubject.decision, mismatchedSubject.prepared));
  assert.equal(mismatchedSubjectResult.allowed, false);
  assert.equal(mismatchedSubjectResult.reasonCode, "wrong_subject");
  assert.equal(mismatchedSubjectResult.staleRefs.subject.includes("site"), true);

  const missingEvidence = await preparedScenario();
  missingEvidence.store.rows.evidencePackageSourceRefs = missingEvidence.store.rows.evidencePackageSourceRefs.filter((row) => (row.metadata_json as Record<string, unknown>).bridgeEvidenceRole !== "proposal_approval");
  const missingEvidenceResult = await missingEvidence.validator.validateImprovementExecutionAuthorization(executionInput(missingEvidence.prepareInput, missingEvidence.decision, missingEvidence.prepared));
  assert.equal(missingEvidenceResult.allowed, false);
  assert.equal(missingEvidenceResult.reasonCode, "evidence_missing");
  assert.equal(missingEvidenceResult.missingRefs.evidence.includes("proposal_approval"), true);
});

test("execution-time validator blocks missing stored replay data", async () => {
  const scenario = await preparedScenario();
  delete (scenario.store.rows.evidencePackages[0]!.limitations_json as Record<string, unknown>).implementationAuthorizationSemanticReplay;
  const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, "evidence_stale");
  assert.deepEqual(result.blockerCodes, ["semantic_replay_missing"]);
  assert.equal(scenario.store.rows.improvementExecutionAttempts.length, 0);
});

test("execution-time validator blocks missing operator notes, scope, and non-goal replay fields", async () => {
  for (const [field, mutate, blocker] of [
    [
      "operator_notes",
      (replay: Record<string, unknown>) => {
        delete (replay.semanticInput as Record<string, unknown>).operatorNotes;
      },
      "semanticInput.operatorNotes_missing",
    ],
    [
      "implementation_scope_summary",
      (replay: Record<string, unknown>) => {
        delete (replay.semanticInput as Record<string, unknown>).implementationScopeSummary;
      },
      "semanticInput.implementationScopeSummary_missing",
    ],
    [
      "implementation_non_goals",
      (replay: Record<string, unknown>) => {
        (replay.semanticInput as Record<string, unknown>).implementationNonGoals = [];
      },
      "semanticInput.implementationNonGoals_missing",
    ],
  ] as const) {
    const scenario = await preparedScenario();
    mutate(storedReplay(scenario));
    const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
    assert.equal(result.allowed, false, field);
    assert.equal(result.reasonCode, "evidence_stale", field);
    assert.equal(result.blockerCodes.includes(blocker), true, field);
    assert.equal(scenario.store.rows.improvementExecutionAttempts.length, 0, field);
  }
});

test("execution-time validator blocks mismatched stored replay data", async () => {
  const scenario = await preparedScenario();
  (storedReplay(scenario).semanticInput as Record<string, unknown>).implementationScopeSummary = "Changed after authorization.";
  const result = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, "evidence_stale");
  assert.deepEqual(result.blockerCodes, ["semantic_replay_watermark_mismatch"]);
  assert.equal(scenario.store.rows.improvementExecutionAttempts.length, 0);

  const roleScenario = await preparedScenario();
  (((storedReplay(roleScenario).replayRoles as Record<string, unknown>).implementationTargetRef as Record<string, unknown>)).sourceWatermark = "changed-target-watermark";
  const roleResult = await roleScenario.validator.validateImprovementExecutionAuthorization(executionInput(roleScenario.prepareInput, roleScenario.decision, roleScenario.prepared));
  assert.equal(roleResult.allowed, false);
  assert.equal(roleResult.reasonCode, "evidence_stale");
  assert.deepEqual(roleResult.blockerCodes, ["semantic_replay_implementation_target_mismatch"]);
  assert.equal(roleScenario.store.rows.improvementExecutionAttempts.length, 0);
});

test("execution-time validator rechecks proposal, recommendation, and implementation scope watermarks", async () => {
  const proposal = await preparedScenario();
  const proposalResult = await proposal.validator.validateImprovementExecutionAuthorization(
    executionInput(proposal.prepareInput, proposal.decision, proposal.prepared, { proposalPlanSemanticWatermark: "changed-proposal-watermark" }),
  );
  assert.equal(proposalResult.allowed, false);
  assert.equal(proposalResult.reasonCode, "evidence_stale");
  assert.equal(proposalResult.driftResult.proposalWatermarkMatched, false);

  const recommendation = await preparedScenario();
  const recommendationResult = await recommendation.validator.validateImprovementExecutionAuthorization(
    executionInput(recommendation.prepareInput, recommendation.decision, recommendation.prepared, {
      expectedRecommendationWatermarks: { "recommendation-1": "new-recommendation-watermark" },
    }),
  );
  assert.equal(recommendationResult.allowed, false);
  assert.equal(recommendationResult.reasonCode, "selected_recommendation_drift");
  assert.equal(recommendationResult.driftResult.selectedRecommendationWatermarkMatched, false);

  const scope = await preparedScenario();
  const scopeResult = await scope.validator.validateImprovementExecutionAuthorization(
    executionInput(scope.prepareInput, scope.decision, scope.prepared, { implementationScopeWatermark: "changed-scope-watermark" }),
  );
  assert.equal(scopeResult.allowed, false);
  assert.equal(scopeResult.reasonCode, "proposal_scope_drift");
  assert.equal(scopeResult.driftResult.implementationScopeWatermarkMatched, false);
});

test("execution-time validator fails closed before AAF when proposal or review state is not execution-ready", async () => {
  const scenario = await preparedScenario();
  assert.equal((await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, { proposalStatus: "draft" }))).reasonCode, "proposal_not_approved");
  assert.equal(
    (await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, { cloneReviewRef: { ...scenario.prepareInput.cloneReviewRef, reviewStatus: "pending" } }))).reasonCode,
    "clone_review_not_accepted",
  );
  assert.equal(
    (await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, { sourceEvidenceReviewRef: { ...scenario.prepareInput.sourceEvidenceReviewRef, reviewStatus: "pending" } }))).reasonCode,
    "source_evidence_review_not_accepted",
  );
  assert.equal((await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, { correlationId: "" }))).reasonCode, "correlation_missing");
  assert.equal(
    (await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared, { idempotencyKey: "", executionAttemptKey: "" }))).reasonCode,
    "idempotency_missing",
  );
});

test("execution-time validation is distinct from attach-time validation", async () => {
  const scenario = await preparedScenario();
  const attachTime = await scenario.bridge.validateImplementationAuthorizationRef({
    tenantId: scenario.prepareInput.tenantId,
    clientId: scenario.prepareInput.clientId,
    siteId: scenario.prepareInput.siteId,
    migrationId: scenario.prepareInput.migrationId,
    proposalPlanId: scenario.prepareInput.proposalPlanId,
    proposalPlanVersion: scenario.prepareInput.proposalPlanVersion,
    proposalPlanSemanticWatermark: scenario.prepareInput.proposalPlanSemanticWatermark,
    proposalApprovalRef: scenario.prepareInput.proposalApprovalRef,
    cloneReviewRef: scenario.prepareInput.cloneReviewRef,
    cloneSiteVersionRef: scenario.prepareInput.cloneSiteVersionRef,
    runtimeArtifactRef: scenario.prepareInput.runtimeArtifactRef,
    sourceEvidenceReviewRef: scenario.prepareInput.sourceEvidenceReviewRef,
    selectedRecommendationRefs: scenario.prepareInput.selectedRecommendationRefs,
    implementationScopeSummary: scenario.prepareInput.implementationScopeSummary,
    implementationNonGoals: scenario.prepareInput.implementationNonGoals,
    riskImpactEffortSummary: scenario.prepareInput.riskImpactEffortSummary,
    limitations: scenario.prepareInput.limitations,
    operatorNotes: scenario.prepareInput.operatorNotes,
    implementationAuthorizationDecisionId: scenario.decision.id,
    approvalRequestId: scenario.prepared.approvalRequest.id,
    evidencePackageId: scenario.prepared.evidencePackage.id,
    policyVersion: scenario.prepareInput.policyVersion,
  });
  assert.equal(attachTime.valid, true);
  scenario.store.rows.approvalRevocations.push({ id: "revocation-after-attach", approval_decision_id: scenario.decision.id });
  const executionTime = await scenario.validator.validateImprovementExecutionAuthorization(executionInput(scenario.prepareInput, scenario.decision, scenario.prepared));
  assert.equal(executionTime.allowed, false);
  assert.equal(executionTime.reasonCode, "approval_revoked");
});
