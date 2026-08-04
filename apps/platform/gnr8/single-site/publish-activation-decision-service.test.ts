import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { AafIdempotencyConflictError, type AafRecord } from "../aaf/aaf-writer-repository";
import {
  PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS,
  PublishActivationDecisionServiceError,
  SingleSitePublishActivationDecisionService,
  computePublishActivationDecisionSemanticWatermark,
  stablePublishActivationDecisionJson,
  type PublishActivationDecisionInput,
} from "./publish-activation-decision-service";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "publish-activation-decision-service.ts");

const TENANT_ID = "tenant-mvp42";
const CLIENT_ID = "client-mvp42";
const SITE_ID = "site-mvp42";
const MIGRATION_ID = "migration-mvp42";
const REQUEST_ID = "request-mvp42";
const READINESS_ID = "readiness-mvp42";
const EVIDENCE_ID = "evidence-mvp42";
const SITE_VERSION_ID = "site-version-mvp42";
const ARTIFACT_ID = "artifact-mvp42";
const PUBLISH_TARGET_ID = "production";

function ref(sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return { sourceTable, sourceRecordId, sourceWatermark, sourceSystem: "gnr8" };
}

function readinessPayload(overrides: Record<string, unknown> = {}) {
  const requiredDimensions = ["launch_approval", "content_approval", "improved_candidate", "publish_target", "domain_readiness"];
  return {
    identity: {
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      siteId: SITE_ID,
      migrationId: MIGRATION_ID,
      launchReadinessRecordId: READINESS_ID,
    },
    readinessStatus: "ready",
    dimensionStatuses: Object.fromEntries(requiredDimensions.map((dimension) => [dimension, { status: "ready", required: true, freshnessStatus: "fresh", sourceWatermark: `wm:${dimension}` }])),
    requiredDimensions,
    freshness: [
      { key: "launch_readiness_record", required: true, status: "ready", freshnessStatus: "fresh", sourceWatermark: "wm:readiness", acceptedLimitation: false },
      ...requiredDimensions.map((dimension) => ({ key: dimension, required: true, status: "ready", freshnessStatus: "fresh", sourceWatermark: `wm:${dimension}`, acceptedLimitation: false })),
    ],
    acceptedLimitations: [],
    unresolvedNonP0Blockers: [],
    blockedDimensions: [],
    sourceRefs: {
      improved_candidate_site_version: [{ ...ref("gnr8_runtime_site_versions", SITE_VERSION_ID), sourceRef: `gnr8:site_version:${SITE_VERSION_ID}` }],
      improved_runtime_artifact: [{ ...ref("gnr8_runtime_artifacts", ARTIFACT_ID), sourceRef: `gnr8:artifact:${ARTIFACT_ID}` }],
      publish_target: [{ ...ref("gnr8_publish_targets", PUBLISH_TARGET_ID), sourceRef: `gnr8:publish_target:${PUBLISH_TARGET_ID}` }],
    },
    ...overrides,
  };
}

function baseInput(overrides: Partial<PublishActivationDecisionInput> = {}): PublishActivationDecisionInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    publishActivationRequestId: REQUEST_ID,
    launchReadinessRecordId: READINESS_ID,
    launchReadinessEvidencePackageId: EVIDENCE_ID,
    improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", SITE_VERSION_ID),
    improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
    publishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
    decisionStatus: "granted",
    decisionActor: { actorType: "human", actorId: "release-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "Decision only; no publish execution.",
    correlationId: "corr-mvp42",
    idempotencyKey: "idem-mvp42",
    policyVersion: "MVP-41",
    expectedLaunchReadinessEvidenceWatermark: "wm:evidence-mvp42",
    ...overrides,
  };
}

class FakeAafWriter {
  rows: Record<string, AafRecord[]> = {
    approvalRequests: [
      {
        id: REQUEST_ID,
        tenant_id: TENANT_ID,
        client_id: CLIENT_ID,
        site_id: SITE_ID,
        site_version_id: SITE_VERSION_ID,
        scope: "publish_activation",
        subject_type: "site_version",
        subject_id: SITE_VERSION_ID,
        status: "requested",
        policy_version: "MVP-41",
        reason: "MVP-41 request",
      },
    ],
    approvalPolicyEvaluations: [
      {
        id: "policy-eval-mvp42",
        approval_request_id: REQUEST_ID,
        scope: "publish_activation",
        action_key: "publish.activation",
        result: "approval_required",
        subject_type: "site_version",
        subject_id: SITE_VERSION_ID,
        evidence_package_id: EVIDENCE_ID,
      },
    ],
    approvalEvidenceLinks: [
      {
        id: "request-evidence-link",
        approval_request_id: REQUEST_ID,
        approval_decision_id: null,
        evidence_package_id: EVIDENCE_ID,
        link_role: "publish_activation_request_launch_readiness_evidence",
        idempotency_key: "idem-request-link",
      },
    ],
    approvalSubjectRefs: [
      { id: "request-subject-ref", approval_request_id: REQUEST_ID, source_watermark: "request-watermark", metadata_json: { semanticWatermark: "request-watermark" } },
    ],
    evidencePackages: [
      {
        id: EVIDENCE_ID,
        tenant_id: TENANT_ID,
        client_id: CLIENT_ID,
        site_id: SITE_ID,
        site_version_id: SITE_VERSION_ID,
        package_type: "single_site_launch_readiness_evidence",
        subject_type: "single_site_launch_readiness_package",
        subject_id: READINESS_ID,
        status: "created",
        source_watermark: "wm:evidence-mvp42",
        freshness_label: "fresh",
        limitations_json: readinessPayload(),
      },
    ],
    evidencePackageSourceRefs: [
      { id: "source-site-version", evidence_package_id: EVIDENCE_ID, source_table: "gnr8_runtime_site_versions", source_record_id: SITE_VERSION_ID, source_watermark: `wm:${SITE_VERSION_ID}`, metadata_json: { refRole: "improved_candidate_site_version" } },
      { id: "source-artifact", evidence_package_id: EVIDENCE_ID, source_table: "gnr8_runtime_artifacts", source_record_id: ARTIFACT_ID, source_watermark: `wm:${ARTIFACT_ID}`, metadata_json: { refRole: "improved_runtime_artifact" } },
      { id: "source-publish-target", evidence_package_id: EVIDENCE_ID, source_table: "gnr8_publish_targets", source_record_id: PUBLISH_TARGET_ID, source_watermark: `wm:${PUBLISH_TARGET_ID}`, metadata_json: { refRole: "publish_target" } },
    ],
    evidencePackageFreshnessChecks: [
      { id: "freshness-mvp42", evidence_package_id: EVIDENCE_ID, result: "fresh", current_source_watermark: "wm:evidence-mvp42", created_at: "2026-08-04T12:00:00.000Z" },
    ],
    approvalDecisions: [],
    approvalRevocations: [],
    approvalSupersessionLinks: [],
    auditEvents: [],
    auditEventRefs: [],
    actionGateAttempts: [],
    pasrObserverRecords: [],
    ddomSnapshots: [],
    runtimeMutations: [],
    providerCalls: [],
  };

  async withTransaction<T>(fn: (tx: { _tag: "aaf_writer_tx"; client: { query: (sql: string, values?: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }> } }) => Promise<T>): Promise<T> {
    return fn({ _tag: "aaf_writer_tx", client: { query: async (sql, values = []) => this.query(sql, values) } });
  }

  async createApprovalDecisionTransaction(input: Record<string, unknown>) {
    const approvalDecision = this.insertIdempotent("approvalDecisions", input.approvalDecision as AafRecord, [
      "approvalRequestId",
      "status",
      "decisionActorType",
      "decisionActorId",
      "decisionActorRole",
      "policyVersion",
      "evidencePackageId",
      "policyEvaluationId",
      "auditEventId",
      "reason",
      "expiresAt",
      "freshnessLabel",
    ]);
    const auditEvent = this.insertIdempotent("auditEvents", { ...(input.decisionAuditEvent as AafRecord), approval_request_id: approvalDecision.approval_request_id, approval_decision_id: approvalDecision.id, evidence_package_id: approvalDecision.evidence_package_id, id: String(approvalDecision.audit_event_id) }, [
      "eventName",
      "eventFamily",
      "subjectType",
      "subjectId",
      "payloadJson",
      "approval_decision_id",
    ]);
    const evidenceLink = this.insertIdempotent("approvalEvidenceLinks", { ...(input.evidenceLink as AafRecord), approval_request_id: approvalDecision.approval_request_id, approval_decision_id: approvalDecision.id }, [
      "approval_request_id",
      "approval_decision_id",
      "evidencePackageId",
      "policyEvaluationId",
      "linkRole",
    ]);
    const auditRefs = ((input.auditRefs as AafRecord[]) ?? []).map((auditRef) => this.insert("auditEventRefs", { ...auditRef, audit_event_id: auditEvent.id }));
    return { approvalDecision, auditEvent, evidenceLink, auditRefs };
  }

  private insert(table: string, input: AafRecord): AafRecord {
    const row = this.toRow({ ...input, id: input.id ?? `${table}-${this.rows[table]!.length + 1}` });
    this.rows[table]!.push(row);
    return row;
  }

  private insertIdempotent(table: string, input: AafRecord, semanticFields: string[]): AafRecord {
    const row = this.toRow({ ...input, id: input.id ?? `${table}-${this.rows[table]!.length + 1}` });
    const key = String(row.idempotency_key);
    const existing = this.rows[table]!.find((candidate) => candidate.idempotency_key === key);
    if (!existing) {
      this.rows[table]!.push(row);
      return row;
    }
    const drift = semanticFields.filter((field) => stablePublishActivationDecisionJson(row[this.column(field)]) !== stablePublishActivationDecisionJson(existing[this.column(field)]));
    if (drift.length > 0) throw new AafIdempotencyConflictError(table, key, drift);
    return existing;
  }

  private toRow(input: AafRecord): AafRecord {
    const row: AafRecord = { id: String(input.id) };
    for (const [key, value] of Object.entries(input)) row[this.column(key)] = value;
    return row;
  }

  private column(key: string): string {
    return key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
  }

  private async query(sql: string, values: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    if (sql.includes("gnr8_aaf_approval_requests where id")) return this.select("approvalRequests", "id", values[0]);
    if (sql.includes("gnr8_aaf_approval_policy_evaluations")) return this.select("approvalPolicyEvaluations", "approval_request_id", values[0]).then((result) => ({ rows: result.rows.filter((row) => row.scope === values[1] && row.action_key === values[2]), rowCount: result.rows.length }));
    if (sql.includes("gnr8_aaf_approval_evidence_links") && sql.includes("approval_decision_id is null")) {
      const rows = this.rows.approvalEvidenceLinks.filter((row) => row.approval_request_id === values[0] && row.link_role === values[1] && row.evidence_package_id === values[2] && !row.approval_decision_id);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("gnr8_aaf_evidence_packages where id")) return this.select("evidencePackages", "id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_source_refs")) return this.select("evidencePackageSourceRefs", "evidence_package_id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_freshness_checks")) return this.select("evidencePackageFreshnessChecks", "evidence_package_id", values[0]);
    if (sql.includes("from public.gnr8_aaf_approval_decisions d")) return this.select("approvalDecisions", "approval_request_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_decisions where idempotency_key")) return this.select("approvalDecisions", "idempotency_key", values[0]);
    if (sql.includes("gnr8_aaf_approval_decisions where id")) return this.select("approvalDecisions", "id", values[0]);
    if (sql.includes("gnr8_aaf_approval_revocations")) return this.select("approvalRevocations", "approval_decision_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_supersession_links")) return this.select("approvalSupersessionLinks", "superseded_decision_id", values[0]);
    if (sql.includes("gnr8_aaf_audit_events")) return this.select("auditEvents", "approval_decision_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_subject_refs")) return this.select("approvalSubjectRefs", "approval_request_id", values[0]);
    return { rows: [], rowCount: 0 };
  }

  private async select(table: string, field: string, value: unknown) {
    const rows = this.rows[table]!.filter((row) => row[field] === value);
    return { rows, rowCount: rows.length };
  }
}

test("valid request and launch readiness evidence records granted publish activation decision", async () => {
  const writer = new FakeAafWriter();
  const service = new SingleSitePublishActivationDecisionService(writer);
  const input = baseInput();
  const result = await service.recordPublishActivationDecision(input);

  assert.equal(result.decisionStatus, "granted");
  assert.equal(result.scope, "publish_activation");
  assert.equal(result.action, "publish.activation");
  assert.equal(result.flags, PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS);
  assert.equal(writer.rows.approvalDecisions.length, 1);
  assert.equal(writer.rows.actionGateAttempts.length, 0);
  assert.equal(writer.rows.runtimeMutations.length, 0);
  assert.equal(writer.rows.providerCalls.length, 0);

  const validation = await service.validatePublishActivationDecision({ ...input, publishActivationDecisionId: result.decisionId });
  assert.equal(validation.valid, true, JSON.stringify(validation));
});

test("granted_with_limitations carries launch readiness and decision limitations", async () => {
  const writer = new FakeAafWriter();
  writer.rows.evidencePackages[0]!.limitations_json = readinessPayload({
    readinessStatus: "ready_with_limitations",
    acceptedLimitations: ["launch limitation"],
  });
  const service = new SingleSitePublishActivationDecisionService(writer);
  const input = baseInput({ decisionStatus: "granted_with_limitations", limitations: ["approval window only"] });
  const result = await service.recordPublishActivationDecision(input);
  assert.deepEqual(result.limitationsCarriedForward, ["launch limitation", "approval window only"]);
  const validation = await service.validatePublishActivationDecision({ ...input, publishActivationDecisionId: result.decisionId });
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.limitationsCarriedForward, ["launch limitation", "approval window only"]);
});

test("rejected decision records but does not validate as publish-approved", async () => {
  const writer = new FakeAafWriter();
  const service = new SingleSitePublishActivationDecisionService(writer);
  const input = baseInput({ decisionStatus: "rejected", decisionReason: "Do not activate publish." });
  const result = await service.recordPublishActivationDecision(input);
  assert.equal(result.decisionStatus, "rejected");
  const validation = await service.validatePublishActivationDecision({ ...input, publishActivationDecisionId: result.decisionId });
  assert.equal(validation.valid, false);
  assert.equal(validation.status, "rejected");
  assert.ok(validation.blockerCodes.includes("approval_rejected"));
});

test("revoked, expired, superseded, cancelled, requested, and invalid states fail closed", async () => {
  const cases: Array<[string, (writer: FakeAafWriter, decision: AafRecord) => void, string]> = [
    ["revoked row", (_writer, decision) => { decision.status = "revoked"; }, "revoked"],
    ["expired status", (_writer, decision) => { decision.status = "expired"; }, "expired"],
    ["superseded status", (_writer, decision) => { decision.status = "superseded"; }, "superseded"],
    ["cancelled status", (_writer, decision) => { decision.status = "cancelled"; }, "cancelled"],
    ["requested status", (_writer, decision) => { decision.status = "requested"; }, "requested"],
    ["invalid status", (_writer, decision) => { decision.status = "mystery"; }, "invalid"],
    ["revocation row", (writer, decision) => { writer.rows.approvalRevocations.push({ id: "revocation", approval_decision_id: decision.id }); }, "revoked"],
    ["supersession row", (writer, decision) => { writer.rows.approvalSupersessionLinks.push({ id: "supersession", superseded_decision_id: decision.id }); }, "superseded"],
    ["past expiry", (_writer, decision) => { decision.expires_at = "2020-01-01T00:00:00.000Z"; }, "expired"],
  ];

  for (const [, mutate, expectedStatus] of cases) {
    const writer = new FakeAafWriter();
    const service = new SingleSitePublishActivationDecisionService(writer);
    const input = baseInput();
    const result = await service.recordPublishActivationDecision(input);
    const decision = writer.rows.approvalDecisions.find((row) => row.id === result.decisionId);
    assert.ok(decision);
    mutate(writer, decision);
    const validation = await service.validatePublishActivationDecision({ ...input, publishActivationDecisionId: result.decisionId });
    assert.equal(validation.valid, false);
    assert.equal(validation.status, expectedStatus);
  }
});

test("idempotent replay reuses and semantic drift conflicts", async () => {
  const writer = new FakeAafWriter();
  const service = new SingleSitePublishActivationDecisionService(writer);
  const input = baseInput();
  const first = await service.recordPublishActivationDecision(input);
  const replay = await service.recordPublishActivationDecision(input);
  assert.equal(replay.decisionId, first.decisionId);
  assert.equal(replay.idempotency.result, "reused");
  await assert.rejects(() => service.recordPublishActivationDecision({ ...input, decisionReason: "Drifted reason." }), AafIdempotencyConflictError);
});

test("missing request, wrong scope/action, wrong evidence, and blocked evidence fail closed", async () => {
  const cases: Array<[string, (writer: FakeAafWriter) => void, RegExp]> = [
    ["missing request", (writer) => writer.rows.approvalRequests.splice(0), /publish_activation_request_missing/],
    ["wrong scope", (writer) => { writer.rows.approvalRequests[0]!.scope = "launch_signoff"; }, /request_scope_mismatch/],
    ["wrong action", (writer) => { writer.rows.approvalPolicyEvaluations[0]!.action_key = "publish"; }, /request_policy_evaluation_missing/],
    ["wrong evidence package", (writer) => { writer.rows.evidencePackages[0]!.package_type = "single_site_launch_approval_evidence"; }, /evidence_type_mismatch/],
    ["blocked launch readiness", (writer) => { writer.rows.evidencePackages[0]!.limitations_json = readinessPayload({ readinessStatus: "blocked" }); }, /readiness_status_blocked/],
    ["open p0 blocker", (writer) => { writer.rows.evidencePackages[0]!.limitations_json = readinessPayload({ unresolvedNonP0Blockers: [{ severity: "p0_blocker", status: "open" }] }); }, /open_p0_blocker_present/],
  ];

  for (const [, mutate, pattern] of cases) {
    const writer = new FakeAafWriter();
    mutate(writer);
    const service = new SingleSitePublishActivationDecisionService(writer);
    await assert.rejects(() => service.recordPublishActivationDecision(baseInput()), pattern);
  }
});

test("conflicting active decision fails unless idempotent replay owns the active decision", async () => {
  const writer = new FakeAafWriter();
  writer.rows.approvalDecisions.push({
    id: "other-decision",
    approval_request_id: REQUEST_ID,
    status: "granted",
    evidence_package_id: EVIDENCE_ID,
    policy_version: "MVP-41",
    idempotency_key: "different-key",
  });
  const service = new SingleSitePublishActivationDecisionService(writer);
  await assert.rejects(() => service.recordPublishActivationDecision(baseInput()), /conflicting_active_publish_activation_decision/);
});

test("prohibited substitutions fail closed as approval substitutes", async () => {
  const substitutions: Array<[string, (writer: FakeAafWriter) => void, RegExp]> = [
    ["launch readiness evidence without request", (writer) => writer.rows.approvalRequests.splice(0), /publish_activation_request_missing/],
    ["request-side policy row treated as approval", (writer) => writer.rows.approvalPolicyEvaluations[0]!.result = "allowed", /request_policy_row_not_approval_required/],
    ["launch approval decision", (writer) => { writer.rows.approvalRequests[0]!.scope = "single_site_launch_approval"; }, /request_scope_mismatch/],
    ["content approval decision", (writer) => { writer.rows.approvalRequests[0]!.scope = "single_site_content_approval"; }, /request_scope_mismatch/],
    ["client approval decision", (writer) => { writer.rows.approvalRequests[0]!.scope = "single_site_client_approval"; }, /request_scope_mismatch/],
    ["launch readiness ready without AAF decision", (writer) => { writer.rows.approvalRequests.splice(0); }, /publish_activation_request_missing/],
    ["PASR shadow ready status", (writer) => { writer.rows.evidencePackages[0]!.package_type = "publish_activation_evidence"; }, /evidence_type_mismatch/],
    ["DDOM readiness snapshot", (writer) => { writer.rows.evidencePackages[0]!.package_type = "domain_action_evidence"; }, /evidence_type_mismatch/],
    ["PTT publish target", (writer) => { writer.rows.evidencePackages[0]!.package_type = "content_publish_evidence"; }, /evidence_type_mismatch/],
    ["billing hosting readiness", (writer) => { writer.rows.evidencePackages[0]!.package_type = "cost_exception_evidence"; }, /evidence_type_mismatch/],
    ["Command Center/Ops Inbox status", (writer) => { writer.rows.approvalRequests[0]!.status = "not_required_by_policy"; }, /request_status_not_required_by_policy/],
    ["AI/provider output", (writer) => { writer.rows.evidencePackages[0]!.package_type = "ai_advisory_review_evidence"; }, /evidence_type_mismatch/],
    ["operator notes/chat transcript alone", (writer) => writer.rows.evidencePackages.splice(0), /launch_readiness_evidence_package_missing/],
  ];

  for (const [, mutate, pattern] of substitutions) {
    const writer = new FakeAafWriter();
    mutate(writer);
    const service = new SingleSitePublishActivationDecisionService(writer);
    await assert.rejects(() => service.recordPublishActivationDecision(baseInput()), pattern);
  }
});

test("source guardrails avoid gates, PASR, DDOM, provider, publish, rollback, and runtime mutation calls", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.doesNotMatch(source, /createGateAttemptTransaction|createActionGateAttempt|evaluatePublishActivationGateDryRun|AafActionGateValidatorFacade/);
  assert.doesNotMatch(source, /PublishActivationSourceReader|shadowObserver|pasr.*observer|pasr_observer/i);
  assert.doesNotMatch(source, /createDdomReadinessSnapshot|manualSnapshot|ddom-readiness-snapshot-writer|ddom-readiness-manual/i);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|publish-enforcement|publish-safety|publish-activation-guard/);
  assert.doesNotMatch(source, /checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution|provider.*execute/i);
});

test("semantic watermark is deterministic", () => {
  const input = baseInput();
  assert.equal(computePublishActivationDecisionSemanticWatermark(input), computePublishActivationDecisionSemanticWatermark(input));
});

test("manual substitution object alone is not a validation input", async () => {
  const writer = new FakeAafWriter();
  const service = new SingleSitePublishActivationDecisionService(writer);
  await assert.rejects(
    () => service.recordPublishActivationDecision({ ...(baseInput() as PublishActivationDecisionInput), publishActivationRequestId: "" }),
    PublishActivationDecisionServiceError,
  );
});
