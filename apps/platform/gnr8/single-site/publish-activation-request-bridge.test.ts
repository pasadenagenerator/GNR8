import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { AafIdempotencyConflictError, type AafRecord } from "../aaf/aaf-writer-repository";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_BOUNDARY_FLAGS,
  PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
  PublishActivationRequestBridgeError,
  SingleSitePublishActivationRequestBridge,
  computePublishActivationRequestSemanticWatermark,
  stablePublishActivationRequestJson,
  type PreparePublishActivationRequestInput,
} from "./publish-activation-request-bridge";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "publish-activation-request-bridge.ts");

const TENANT_ID = "tenant-mvp41";
const CLIENT_ID = "client-mvp41";
const SITE_ID = "site-mvp41";
const MIGRATION_ID = "migration-mvp41";
const READINESS_ID = "readiness-mvp41";
const EVIDENCE_ID = "evidence-mvp41";
const SITE_VERSION_ID = "site-version-mvp41";
const ARTIFACT_ID = "artifact-mvp41";
const PUBLISH_TARGET_ID = "production";

function ref(sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return { sourceTable, sourceRecordId, sourceWatermark, sourceSystem: "gnr8" };
}

function baseInput(overrides: Partial<PreparePublishActivationRequestInput> = {}): PreparePublishActivationRequestInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    launchReadinessRecordId: READINESS_ID,
    launchReadinessEvidencePackageId: EVIDENCE_ID,
    improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", SITE_VERSION_ID),
    improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
    publishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
    actor: { actorType: "human", actorId: "release-operator", actorRole: "release_approver" },
    correlationId: "corr-mvp41",
    idempotencyKey: "idem-mvp41",
    policyVersion: "MVP-41",
    expectedLaunchReadinessEvidenceWatermark: "single-site-launch-readiness:wm-mvp41",
    ...overrides,
  };
}

function readinessPayload(overrides: Record<string, unknown> = {}) {
  const requiredDimensions = ["launch_approval", "content_approval", "improved_candidate", "publish_target", "domain_readiness"];
  return {
    packageHeader: {
      packageType: "single_site_launch_readiness_evidence",
      subjectType: "single_site_launch_readiness_package",
      subjectId: READINESS_ID,
      actionContext: "prepare_publish_activation_review",
    },
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
    sourceWatermarks: {
      launch_readiness_record: "wm:readiness",
      improved_candidate: `wm:${SITE_VERSION_ID}`,
      publish_target: `wm:${PUBLISH_TARGET_ID}`,
    },
    explicitNonApprovalNonPublishFlags: {
      createsApprovalRequest: false,
      createsApprovalDecision: false,
      createsGateAttempt: false,
      publishes: false,
    },
    ...overrides,
  };
}

function evidencePackage(overrides: Partial<AafRecord> = {}): AafRecord {
  const base = {
    id: EVIDENCE_ID,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    batch_id: null,
    job_id: null,
    site_version_id: SITE_VERSION_ID,
    domain_id: null,
    cost_center_id: null,
    package_type: "single_site_launch_readiness_evidence",
    subject_type: "single_site_launch_readiness_package",
    subject_id: READINESS_ID,
    status: "created",
    source_watermark: "single-site-launch-readiness:wm-mvp41",
    freshness_label: "fresh",
    content_hash: "hash-mvp41",
    limitations_json: readinessPayload(),
    created_at: "2026-08-04T12:00:00.000Z",
  };
  return { ...base, ...overrides };
}

function evidenceSourceRefs(): AafRecord[] {
  return [
    { id: "source-site-version", evidence_package_id: EVIDENCE_ID, ...ref("gnr8_runtime_site_versions", SITE_VERSION_ID), metadata_json: { refRole: "improved_candidate_site_version" } },
    { id: "source-artifact", evidence_package_id: EVIDENCE_ID, ...ref("gnr8_runtime_artifacts", ARTIFACT_ID), metadata_json: { refRole: "improved_runtime_artifact" } },
    { id: "source-publish-target", evidence_package_id: EVIDENCE_ID, ...ref("gnr8_publish_targets", PUBLISH_TARGET_ID), metadata_json: { refRole: "publish_target" } },
  ].map((row) => ({
    ...row,
    source_system: row.sourceSystem,
    source_table: row.sourceTable,
    source_record_id: row.sourceRecordId,
    source_watermark: row.sourceWatermark,
  }));
}

function stable(value: unknown): string {
  return stablePublishActivationRequestJson(value);
}

class FakeAafWriter {
  rows: Record<string, AafRecord[]> = {
    evidencePackages: [evidencePackage()],
    evidencePackageSourceRefs: evidenceSourceRefs(),
    evidencePackageFreshnessChecks: [
      {
        id: "freshness-mvp41",
        evidence_package_id: EVIDENCE_ID,
        policy_version: "MVP-40",
        result: "fresh",
        current_source_watermark: "single-site-launch-readiness:wm-mvp41",
        created_at: "2026-08-04T12:00:00.000Z",
      },
    ],
    approvalRequests: [],
    approvalSubjectRefs: [],
    approvalEvidenceLinks: [],
    approvalPolicyEvaluations: [],
    auditEvents: [],
    approvalDecisions: [],
    actionGateAttempts: [],
    pasrObserverRecords: [],
    ddomSnapshots: [],
    runtimeMutations: [],
    providerCalls: [],
  };

  async withTransaction<T>(fn: (tx: { client: { query: (sql: string, values?: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }> } }) => Promise<T>): Promise<T> {
    return fn({ client: { query: async (sql, values = []) => this.query(sql, values) } });
  }

  async createApprovalRequestTransaction(input: Record<string, unknown>) {
    const approvalRequest = this.insertIdempotent("approvalRequests", input.approvalRequest as AafRecord, [
      "tenantId",
      "clientId",
      "siteId",
      "siteVersionId",
      "scope",
      "subjectType",
      "subjectId",
      "status",
      "policyVersion",
      "requestedExpiresAt",
      "reason",
    ]);
    const subjectRefs = (input.subjectRefs as AafRecord[]).map((subjectRef) => this.insert("approvalSubjectRefs", { ...subjectRef, approval_request_id: approvalRequest.id }));
    const evidenceLink = this.insertIdempotent("approvalEvidenceLinks", { ...(input.evidenceLink as AafRecord), approval_request_id: approvalRequest.id }, [
      "approval_request_id",
      "evidencePackageId",
      "linkRole",
      "sourceNote",
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
    const drift = semanticFields.filter((field) => stable(row[this.column(field)]) !== stable(existing[this.column(field)]));
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
    if (sql.includes("gnr8_aaf_evidence_packages where id")) return this.select("evidencePackages", "id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_source_refs")) return this.select("evidencePackageSourceRefs", "evidence_package_id", values[0]);
    if (sql.includes("gnr8_aaf_evidence_package_freshness_checks")) return this.select("evidencePackageFreshnessChecks", "evidence_package_id", values[0]);
    if (sql.includes("gnr8_aaf_approval_requests") && sql.includes("idempotency_key")) {
      const rows = this.rows.approvalRequests.filter(
        (row) =>
          row.tenant_id === values[0] &&
          row.scope === values[1] &&
          row.subject_type === values[2] &&
          row.subject_id === values[3] &&
          row.policy_version === values[4] &&
          row.idempotency_key === values[5],
      );
      return { rows, rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  }

  private select(table: string, field: string, value: unknown) {
    const rows = this.rows[table]!.filter((row) => row[field] === value);
    return { rows, rowCount: rows.length };
  }
}

test("publish activation request bridge is server-only and avoids prohibited execution imports", () => {
  const sourceText = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(sourceText, /^import "server-only";/);
  assert.doesNotMatch(
    sourceText,
    /createApprovalDecisionTransaction|createGateAttemptTransaction|evaluatePublishActivationGateDryRun|AafActionGateValidatorFacade|PASR|pasr.*observer|createDdomReadinessSnapshot|manualSnapshot|publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution/i,
  );
});

test("valid launch readiness evidence creates exact-scope publish activation approval request", async () => {
  const writer = new FakeAafWriter();
  const prepared = await new SingleSitePublishActivationRequestBridge(writer as never).preparePublishActivationRequestFromLaunchReadiness(baseInput());

  assert.equal(prepared.scope, PUBLISH_ACTIVATION_REQUEST_SCOPE);
  assert.equal(prepared.action, PUBLISH_ACTIVATION_REQUEST_ACTION);
  assert.equal(prepared.subjectType, PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE);
  assert.equal(prepared.subjectId, SITE_VERSION_ID);
  assert.equal(prepared.status, "requested");
  assert.equal(prepared.evidenceLink?.evidence_package_id, EVIDENCE_ID);
  assert.equal(prepared.evidenceLink?.link_role, PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE);
  assert.equal(prepared.policyEvaluation.action_key, "publish.activation");
  assert.equal(prepared.policyEvaluation.result, "approval_required");
  assert.deepEqual(prepared.flags, PUBLISH_ACTIVATION_REQUEST_BOUNDARY_FLAGS);
  assert.equal(writer.rows.approvalRequests.length, 1);
  assert.equal(writer.rows.approvalDecisions.length, 0);
  assert.equal(writer.rows.actionGateAttempts.length, 0);
  assert.equal(writer.rows.pasrObserverRecords.length, 0);
  assert.equal(writer.rows.ddomSnapshots.length, 0);
  assert.equal(writer.rows.runtimeMutations.length, 0);
  assert.equal(writer.rows.providerCalls.length, 0);
});

test("idempotent replay reuses request and semantic drift conflicts", async () => {
  const writer = new FakeAafWriter();
  const bridge = new SingleSitePublishActivationRequestBridge(writer as never);
  const first = await bridge.preparePublishActivationRequestFromLaunchReadiness(baseInput());
  const replay = await bridge.preparePublishActivationRequestFromLaunchReadiness(baseInput());

  assert.equal(replay.requestId, first.requestId);
  assert.equal(replay.idempotency.result, "reused");
  assert.equal(writer.rows.approvalRequests.length, 1);
  await assert.rejects(
    () =>
      bridge.preparePublishActivationRequestFromLaunchReadiness(
        baseInput({ requestedExpiresAt: "2026-08-05T12:00:00.000Z" }),
      ),
    AafIdempotencyConflictError,
  );
});

test("validate helper returns launch readiness limitations without creating a request", async () => {
  const writer = new FakeAafWriter();
  writer.rows.evidencePackages[0]!.limitations_json = readinessPayload({
    readinessStatus: "ready_with_limitations",
    acceptedLimitations: [{ limitation: "manual SSL check accepted before approval request" }],
  });
  const bridge = new SingleSitePublishActivationRequestBridge(writer as never);
  const result = await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest({
    ...baseInput(),
    expectedLaunchReadinessStatus: "ready_with_limitations",
  });

  assert.equal(result.valid, true, JSON.stringify(result));
  assert.deepEqual(result.limitations, [{ limitation: "manual SSL check accepted before approval request" }]);
  assert.equal(writer.rows.approvalRequests.length, 0);
});

test("wrong evidence type and wrong tenant/client/site/migration fail closed", async () => {
  const writer = new FakeAafWriter();
  const bridge = new SingleSitePublishActivationRequestBridge(writer as never);
  writer.rows.evidencePackages[0]!.package_type = "single_site_launch_approval_evidence";
  assert.deepEqual((await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput())).blockerCodes, ["evidence_type_mismatch"]);

  writer.rows.evidencePackages[0] = evidencePackage({ tenant_id: "other-tenant", limitations_json: readinessPayload({ identity: { ...readinessPayload().identity, migrationId: "other-migration" } }) });
  const mismatch = await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput());
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.blockerCodes.includes("tenant_client_site_mismatch"));
  assert.ok(mismatch.blockerCodes.includes("payload_migration_id_mismatch"));
});

test("wrong candidate refs and wrong publish target fail closed", async () => {
  const bridge = new SingleSitePublishActivationRequestBridge(new FakeAafWriter() as never);
  assert.ok(
    (
      await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest({
        ...baseInput(),
        improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", "wrong-version"),
      })
    ).blockerCodes.includes("evidence_site_version_mismatch"),
  );
  assert.ok(
    (
      await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest({
        ...baseInput(),
        improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", "wrong-artifact"),
      })
    ).blockerCodes.includes("improved_runtime_artifact_ref_mismatch"),
  );
  assert.ok(
    (
      await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest({
        ...baseInput(),
        publishTargetRef: ref("gnr8_publish_targets", "staging"),
      })
    ).blockerCodes.includes("publish_target_ref_mismatch"),
  );
});

test("blocked stale incomplete readiness and open P0 evidence fail closed", async () => {
  const writer = new FakeAafWriter();
  const bridge = new SingleSitePublishActivationRequestBridge(writer as never);
  writer.rows.evidencePackages[0]!.limitations_json = readinessPayload({ readinessStatus: "blocked" });
  assert.ok((await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput())).blockerCodes.includes("readiness_status_blocked"));

  writer.rows.evidencePackages[0] = evidencePackage({ freshness_label: "stale" });
  assert.ok((await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput())).blockerCodes.includes("evidence_freshness_stale"));

  writer.rows.evidencePackages[0] = evidencePackage({ limitations_json: readinessPayload({ requiredDimensions: [] }) });
  assert.ok((await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput())).blockerCodes.includes("required_dimensions_missing"));

  writer.rows.evidencePackages[0] = evidencePackage({ limitations_json: readinessPayload({ blockerSummary: [{ severity: "p0_blocker", status: "open" }] }) });
  assert.ok((await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput())).blockerCodes.includes("open_p0_blocker_present"));
});

test("prohibited substitutions fail as request evidence", async () => {
  for (const substitution of [
    "single_site_launch_approval_evidence",
    "single_site_content_approval_evidence",
    "single_site_client_approval_evidence",
    "single_site_improvement_implementation_authorization_evidence",
    "improved_version_review_acceptance",
    "ddom_readiness_snapshot",
    "billing_hosting_readiness_ref",
    "pasr_shadow_result",
    "preview_public_render_ref",
    "command_center_status",
    "ops_inbox_status",
    "ai_provider_output",
    "generated_proposal_bundle",
    "chat_transcript_operator_notes",
  ]) {
    const writer = new FakeAafWriter();
    writer.rows.evidencePackages[0]!.package_type = substitution;
    const result = await new SingleSitePublishActivationRequestBridge(writer as never).validateLaunchReadinessEvidenceForPublishActivationRequest(baseInput());
    assert.equal(result.valid, false, substitution);
    assert.ok(result.blockerCodes.includes("evidence_type_mismatch"), substitution);
  }
});

test("semantic watermark is deterministic and includes exact launch readiness evidence input", () => {
  const first = computePublishActivationRequestSemanticWatermark(baseInput());
  const second = computePublishActivationRequestSemanticWatermark(baseInput());
  const drift = computePublishActivationRequestSemanticWatermark({
    ...baseInput(),
    expectedLaunchReadinessEvidenceWatermark: "single-site-launch-readiness:drifted",
  });

  assert.equal(first, second);
  assert.notEqual(first, drift);
});
