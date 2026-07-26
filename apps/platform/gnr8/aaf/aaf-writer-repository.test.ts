import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AafWriterError,
  AafWriterRepository,
  AafWriterTx,
  writeApprovalDecisionTransaction,
  writeApprovalRequestTransaction,
  writeEvidencePackageTransaction,
  writeGateAttemptTransaction,
  type AafRecord,
  type AafWriterOperations,
  type AafPgClient,
} from "./aaf-writer-repository";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "aaf-writer-repository.ts");

function recordingClient() {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  const rows: AafRecord[] = [];
  const client: AafPgClient = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      const insertMatch = sql.match(/insert into public\.(gnr8_aaf_[a-z_]+) \(([^)]+)\)/);
      if (insertMatch) {
        const columns = insertMatch[2]!.split(",").map((column) => column.trim());
        const row: AafRecord = { id: `${insertMatch[1]}-${rows.length + 1}` };
        columns.forEach((column, index) => {
          row[column] = values[index];
        });
        rows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: rows.slice(-1), rowCount: rows.length > 0 ? 1 : 0 };
    },
  };
  return { client, calls, rows };
}

function txForClient(client: AafPgClient): AafWriterTx {
  return new AafWriterTx(client);
}

function fakeWriter() {
  const calls: string[] = [];
  const record = (name: string): AafRecord => {
    calls.push(name);
    return { id: `${name}-${calls.length}` };
  };
  const writer: AafWriterOperations = {
    createApprovalPolicy: async () => record("createApprovalPolicy"),
    createApprovalScopeDefinition: async () => record("createApprovalScopeDefinition"),
    createApprovalRequest: async () => record("createApprovalRequest"),
    createApprovalSubjectRef: async () => record("createApprovalSubjectRef"),
    createApprovalEvidenceLink: async () => record("createApprovalEvidenceLink"),
    createApprovalPolicyEvaluation: async () => record("createApprovalPolicyEvaluation"),
    createApprovalDecision: async () => record("createApprovalDecision"),
    createApprovalRevocation: async () => record("createApprovalRevocation"),
    createApprovalSupersessionLink: async () => record("createApprovalSupersessionLink"),
    createAuditEvent: async () => record("createAuditEvent"),
    createAuditEventRef: async () => record("createAuditEventRef"),
    createAuditPartialTimelineMarker: async () => record("createAuditPartialTimelineMarker"),
    createEvidencePackage: async () => record("createEvidencePackage"),
    createEvidencePackageItem: async () => record("createEvidencePackageItem"),
    createEvidencePackageSourceRef: async () => record("createEvidencePackageSourceRef"),
    createEvidencePackageFreshnessCheck: async () => record("createEvidencePackageFreshnessCheck"),
    createEvidencePackageAuditLink: async () => record("createEvidencePackageAuditLink"),
    createEvidencePackageSupersessionLink: async () => record("createEvidencePackageSupersessionLink"),
    createActionGateAttempt: async () => record("createActionGateAttempt"),
  };
  return { writer, calls };
}

const tenantScope = {
  tenantId: "tenant-aaf-unit",
  clientId: "client-aaf-unit",
  siteId: "site-aaf-unit",
};

const correlation = {
  correlationId: "corr-aaf-unit",
  idempotencyKey: "idem-aaf-unit",
  requestId: "request-aaf-unit",
};

test("AAF writer is server-only and does not expose update or delete helpers", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /update public\.gnr8_aaf_/);
  assert.doesNotMatch(source, /delete from public\.gnr8_aaf_/);
});

test("AAF writer validates required fields and canonical enum inputs at the TypeScript boundary", async () => {
  const { client } = recordingClient();
  const repository = new AafWriterRepository({ connect: async () => ({}) } as never);
  const tx = txForClient(client);

  assert.throws(
    () =>
      repository.createAuditEvent(tx, {
        ...tenantScope,
        ...correlation,
        eventName: " ",
        eventFamily: "approval",
        severity: "notice",
        replayClass: "not_replayable",
        actorType: "human",
        actorId: "operator-1",
        actorRole: "agency_admin",
        subjectType: "site_version",
        subjectId: "site-version-1",
      }),
    (error) => error instanceof AafWriterError && error.message === "eventName is required",
  );

  assert.throws(
    () =>
      repository.createActionGateAttempt(tx, {
        ...tenantScope,
        ...correlation,
        idempotencyKey: "idem-invalid-scope",
        actionKey: "publish.activation",
        scope: "not_a_scope" as never,
        subjectType: "site_version",
        subjectId: "site-version-1",
        actorType: "human",
        actorId: "operator-1",
        actorRole: "agency_admin",
        gateResult: "blocked",
      }),
    (error) => error instanceof AafWriterError && error.message.includes("scope must be one of"),
  );
});

test("AAF writer preserves idempotency, correlation, actor, subject, scope, and evidence hashes", async () => {
  const { client } = recordingClient();
  const repository = new AafWriterRepository({ connect: async () => ({}) } as never);
  const tx = txForClient(client);

  const audit = await repository.createAuditEvent(tx, {
    ...tenantScope,
    ...correlation,
    eventName: "approval.requested",
    eventFamily: "approval",
    severity: "notice",
    replayClass: "not_replayable",
    actorType: "human",
    actorId: "operator-1",
    actorRole: "agency_admin",
    subjectType: "site_version",
    subjectId: "site-version-1",
    payloadJson: { scope: "publish_activation" },
  });
  assert.equal(audit.correlation_id, "corr-aaf-unit");
  assert.equal(audit.idempotency_key, "idem-aaf-unit");
  assert.equal(audit.actor_type, "human");
  assert.equal(audit.subject_type, "site_version");

  const evidence = await repository.createEvidencePackage(tx, {
    ...tenantScope,
    ...correlation,
    idempotencyKey: "idem-evidence-unit",
    packageType: "publish_activation_evidence",
    subjectType: "site_version",
    subjectId: "site-version-1",
    createdByActorType: "system",
    createdByActorId: "aaf-writer-test",
    sourceWatermark: "site-version-1:updated-at:2026-07-26",
    freshnessLabel: "fresh",
    contentHash: "0123456789abcdef",
  });
  assert.equal(evidence.content_hash, "0123456789abcdef");
  assert.equal(evidence.package_type, "publish_activation_evidence");
});

test("AAF writer enforces local fail-closed and not-required reference guards", async () => {
  const { client } = recordingClient();
  const repository = new AafWriterRepository({ connect: async () => ({}) } as never);
  const tx = txForClient(client);

  assert.throws(
    () =>
      repository.createApprovalDecision(tx, {
        ...correlation,
        approvalRequestId: "approval-request-1",
        status: "not_required_by_policy",
        decisionActorType: "system",
        decisionActorId: "policy-evaluator",
        decisionActorRole: "system",
        policyVersion: "AAF-UNIT",
      }),
    (error) =>
      error instanceof AafWriterError &&
      error.message === "policyEvaluationId is required for not_required_by_policy decisions",
  );

  assert.throws(
    () =>
      repository.createActionGateAttempt(tx, {
        ...tenantScope,
        ...correlation,
        actionKey: "publish.activation",
        scope: "publish_activation",
        subjectType: "site_version",
        subjectId: "site-version-1",
        actorType: "human",
        actorId: "operator-1",
        actorRole: "agency_admin",
        gateResult: "fail_closed",
      }),
    (error) => error instanceof AafWriterError && error.message === "failClosedReason is required for fail_closed gate attempts",
  );
});

test("approval request transaction writes request, subject refs, evidence link, policy evaluation, then audit", async () => {
  const { writer, calls } = fakeWriter();
  await writeApprovalRequestTransaction(writer, txForClient(recordingClient().client), {
    approvalRequest: {
      ...tenantScope,
      ...correlation,
      scope: "publish_activation",
      subjectType: "site_version",
      subjectId: "site-version-1",
      requesterActorType: "human",
      requesterActorId: "operator-1",
      requesterRole: "agency_admin",
      policyVersion: "AAF-UNIT",
    },
    subjectRefs: [
      {
        subjectType: "site_version",
        subjectId: "site-version-1",
        sourceTable: "gnr8_runtime_site_versions",
        sourceRecordId: "site-version-1",
        sourceWatermark: "site-version-1:1",
      },
    ],
    evidenceLink: {
      evidencePackageId: "evidence-package-1",
      linkRole: "request_basis",
      idempotencyKey: "idem-evidence-link-unit",
    },
    policyEvaluation: {
      policyVersion: "AAF-UNIT",
      result: "approval_required",
      scope: "publish_activation",
      actionKey: "publish.activation",
      subjectType: "site_version",
      subjectId: "site-version-1",
      actorType: "human",
      actorId: "operator-1",
      actorRole: "agency_admin",
      idempotencyKey: "idem-policy-eval-unit",
    },
    requestedAuditEvent: {
      eventName: "approval.requested",
      eventFamily: "approval",
      severity: "notice",
      replayClass: "not_replayable",
      actorType: "human",
      actorId: "operator-1",
      actorRole: "agency_admin",
      subjectType: "site_version",
      subjectId: "site-version-1",
      idempotencyKey: "idem-audit-unit",
    },
  });
  assert.deepEqual(calls, [
    "createApprovalRequest",
    "createApprovalSubjectRef",
    "createApprovalEvidenceLink",
    "createApprovalPolicyEvaluation",
    "createAuditEvent",
  ]);
});

test("approval decision transaction creates the decision before its audit event and links refs insert-only", async () => {
  const { writer, calls } = fakeWriter();
  await writeApprovalDecisionTransaction(writer, txForClient(recordingClient().client), {
    approvalDecision: {
      ...correlation,
      approvalRequestId: "approval-request-1",
      status: "granted",
      decisionActorType: "human",
      decisionActorId: "approver-1",
      decisionActorRole: "superadmin",
      policyVersion: "AAF-UNIT",
      evidencePackageId: "evidence-package-1",
      policyEvaluationId: "policy-evaluation-1",
    },
    evidenceLink: {
      evidencePackageId: "evidence-package-1",
      policyEvaluationId: "policy-evaluation-1",
      linkRole: "decision_basis",
      idempotencyKey: "idem-decision-link-unit",
    },
    decisionAuditEvent: {
      ...tenantScope,
      eventName: "approval.granted",
      eventFamily: "approval",
      severity: "notice",
      replayClass: "not_replayable",
      actorType: "human",
      actorId: "approver-1",
      actorRole: "superadmin",
      subjectType: "site_version",
      subjectId: "site-version-1",
      idempotencyKey: "idem-decision-audit-unit",
    },
    auditRefs: [{ refRole: "decision", refType: "approval_decision", refId: "decision-source-1" }],
  });
  assert.deepEqual(calls, ["createApprovalDecision", "createAuditEvent", "createApprovalEvidenceLink", "createAuditEventRef"]);
});

test("evidence package transaction writes header before refs, items, freshness, and audit link", async () => {
  const { writer, calls } = fakeWriter();
  await writeEvidencePackageTransaction(writer, txForClient(recordingClient().client), {
    evidencePackage: {
      ...tenantScope,
      ...correlation,
      packageType: "publish_activation_evidence",
      subjectType: "site_version",
      subjectId: "site-version-1",
      createdByActorType: "system",
      createdByActorId: "evidence-builder",
      sourceWatermark: "site-version-1:1",
      freshnessLabel: "fresh",
      contentHash: "0123456789abcdef",
    },
    sourceRefs: [
      {
        sourceTable: "gnr8_runtime_site_versions",
        sourceRecordId: "site-version-1",
        sourceWatermark: "site-version-1:1",
        hash: "fedcba9876543210",
      },
    ],
    items: [{ itemType: "runtime_artifact_ref", itemRef: "artifact-1", itemHash: "1111222233334444", mediaType: "application/json" }],
    freshnessCheck: {
      policyVersion: "AAF-UNIT",
      result: "fresh",
      checkedByActorType: "system",
      checkedByActorId: "evidence-builder",
      idempotencyKey: "idem-freshness-unit",
    },
    auditLink: { auditEventId: "audit-event-1", linkRole: "package_created" },
  });
  assert.deepEqual(calls, [
    "createEvidencePackage",
    "createEvidencePackageSourceRef",
    "createEvidencePackageItem",
    "createEvidencePackageFreshnessCheck",
    "createEvidencePackageAuditLink",
  ]);
});

test("gate attempt transaction records supplied policy evaluation and pre-action audit before inert attempt", async () => {
  const { writer, calls } = fakeWriter();
  await writeGateAttemptTransaction(writer, txForClient(recordingClient().client), {
    policyEvaluation: {
      ...tenantScope,
      ...correlation,
      idempotencyKey: "idem-gate-policy-unit",
      policyVersion: "AAF-UNIT",
      result: "approval_required",
      scope: "publish_activation",
      actionKey: "publish.activation",
      subjectType: "site_version",
      subjectId: "site-version-1",
      actorType: "human",
      actorId: "operator-1",
      actorRole: "agency_admin",
    },
    preActionAuditEvent: {
      ...tenantScope,
      ...correlation,
      idempotencyKey: "idem-gate-audit-unit",
      eventName: "publish.activation.gate_blocked",
      eventFamily: "publish",
      severity: "warning",
      replayClass: "forbidden_replay",
      actorType: "human",
      actorId: "operator-1",
      actorRole: "agency_admin",
      subjectType: "site_version",
      subjectId: "site-version-1",
    },
    gateAttempt: {
      ...tenantScope,
      ...correlation,
      idempotencyKey: "idem-gate-attempt-unit",
      actionKey: "publish.activation",
      scope: "publish_activation",
      subjectType: "site_version",
      subjectId: "site-version-1",
      actorType: "human",
      actorId: "operator-1",
      actorRole: "agency_admin",
      gateResult: "approval_required",
    },
  });
  assert.deepEqual(calls, ["createApprovalPolicyEvaluation", "createAuditEvent", "createActionGateAttempt"]);
});
