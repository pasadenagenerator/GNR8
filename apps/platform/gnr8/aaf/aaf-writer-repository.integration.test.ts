import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import {
  AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import { AafIdempotencyConflictError, AafWriterRepository } from "./aaf-writer-repository";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../../../..");
const MIGRATION_PATH = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql");
const GRANTED_WITH_LIMITATIONS_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql",
);
const CONTENT_APPROVAL_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql",
);
const CLIENT_LAUNCH_APPROVAL_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql",
);

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

function docker(args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePublishedPort(output: string): string {
  const port = output.match(/127\.0\.0\.1:(\d+)/)?.[1];
  if (!port) throw new Error(`Could not resolve disposable Postgres port from: ${output}`);
  return port;
}

async function startDisposablePostgres(): Promise<DisposablePostgres> {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-aaf-writer-${process.pid}-${suffix}`;
  const database = `gnr8_aaf_writer_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_aaf_local_${suffix.replace(/-/g, "")}`;
  const password = randomUUID();

  docker(["image", "inspect", "postgres:15"]);
  docker([
    "run",
    "--pull=never",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-e",
    `POSTGRES_DB=${database}`,
    "-e",
    `POSTGRES_USER=${user}`,
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-p",
    "127.0.0.1::5432",
    "postgres:15",
  ]);

  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        docker(["exec", containerName, "pg_isready", "-h", "127.0.0.1", "-U", user, "-d", database]);
        break;
      } catch {
        if (attempt === 59) throw new Error("Disposable Postgres did not become ready");
        await delay(500);
      }
    }

    for (const [name, migrationPath] of [
      ["20260722120000_aaf_persistence_core.sql", MIGRATION_PATH],
      ["20260731100000_aaf_granted_with_limitations_status.sql", GRANTED_WITH_LIMITATIONS_MIGRATION_PATH],
      ["20260803120000_aaf_single_site_content_approval_scope.sql", CONTENT_APPROVAL_MIGRATION_PATH],
      ["20260803170000_aaf_single_site_client_launch_approval_scopes.sql", CLIENT_LAUNCH_APPROVAL_MIGRATION_PATH],
    ] as const) {
      docker(["cp", migrationPath, `${containerName}:/tmp/${name}`]);
      docker([
        "exec",
        containerName,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        "127.0.0.1",
        "-U",
        user,
        "-d",
        database,
        "-f",
        `/tmp/${name}`,
      ]);
    }

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup for disposable local DB setup failure.
    }
    throw error;
  }
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

test("AAF writer applies migration and writes canonical records transactionally in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 3 });
  const writer = new AafWriterRepository(pool);
  const suffix = randomUUID().slice(0, 12);
  const scope = {
    tenantId: `tenant-${suffix}`,
    clientId: `client-${suffix}`,
    siteId: `site-${suffix}`,
    siteVersionId: `site-version-${suffix}`,
  };
  const subject = {
    subjectType: "site_version",
    subjectId: `site-version-${suffix}`,
  };
  const correlationId = `corr-${suffix}`;

  try {
    const migrationCheck = await pool.query<{ table_count: string; policy_count: string }>(
      `
      select
        (select count(*)::text from information_schema.tables where table_schema = 'public' and table_name like 'gnr8_aaf_%') as table_count,
        (select count(*)::text from pg_policy where polrelid::regclass::text like 'gnr8_aaf_%') as policy_count
      `,
    );
    assert.equal(migrationCheck.rows[0]?.table_count, "20");
    assert.equal(migrationCheck.rows[0]?.policy_count, "0");

    const bootstrap = await writer.withTransaction(async (tx) => {
      const policy = await writer.createApprovalPolicy(tx, {
        policyKey: `aaf-writer-policy-${suffix}`,
        version: `AAF-WRITER-${suffix}`,
        status: "active",
        definitionJson: { testOnly: true },
        createdBy: "aaf-writer-integration-test",
      });
      const scopeDefinition = await writer.createApprovalScopeDefinition(tx, {
        scope: "publish_activation",
        policyKey: String(policy.policy_key),
        policyVersion: String(policy.version),
        subjectType: "site_version",
        allowedAction: "publish.activation",
        prohibitedActions: ["rollback", "dns_mutation"],
        requiredEvidenceType: "publish_activation_evidence",
        requesterRoles: ["agency_admin"],
        approverRoles: ["superadmin"],
        freshnessRule: { maxAgeMinutes: 240 },
      });
      return { policy, scopeDefinition };
    });
    assert.equal(bootstrap.scopeDefinition.scope, "publish_activation");

    const contentScopeDefinition = await writer.withTransaction((tx) =>
      writer.createApprovalScopeDefinition(tx, {
        scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
        policyKey: String(bootstrap.policy.policy_key),
        policyVersion: String(bootstrap.policy.version),
        subjectType: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
        allowedAction: AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
        prohibitedActions: ["client_approval", "launch_approval", "publish_activation", "domain_readiness", "billing_readiness"],
        requiredEvidenceType: AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
        requesterRoles: ["agency_admin"],
        approverRoles: ["content_operator", "agency_admin", "superadmin"],
        freshnessRule: { maxAgeHours: 24, exactCandidateRefsRequired: true },
      }),
    );
    assert.equal(contentScopeDefinition.scope, AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE);
    assert.equal(contentScopeDefinition.required_evidence_type, AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE);

    const clientScopeDefinition = await writer.withTransaction((tx) =>
      writer.createApprovalScopeDefinition(tx, {
        scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
        policyKey: String(bootstrap.policy.policy_key),
        policyVersion: String(bootstrap.policy.version),
        subjectType: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
        allowedAction: AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION,
        prohibitedActions: ["content_approval", "launch_approval", "publish_activation", "domain_readiness", "billing_readiness"],
        requiredEvidenceType: AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE,
        requesterRoles: ["agency_admin", "account_owner"],
        approverRoles: ["account_owner", "agency_admin", "superadmin"],
        freshnessRule: { exactCandidateRefsRequired: true, limitationsCarryForwardRequired: true },
      }),
    );
    assert.equal(clientScopeDefinition.scope, AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE);
    assert.equal(clientScopeDefinition.required_evidence_type, AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE);

    const launchScopeDefinition = await writer.withTransaction((tx) =>
      writer.createApprovalScopeDefinition(tx, {
        scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
        policyKey: String(bootstrap.policy.policy_key),
        policyVersion: String(bootstrap.policy.version),
        subjectType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
        allowedAction: AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
        prohibitedActions: ["publish_activation", "domain_readiness", "billing_readiness", "ddom_readiness"],
        requiredEvidenceType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE,
        requesterRoles: ["launch_operator", "agency_admin"],
        approverRoles: ["launch_operator", "agency_admin", "superadmin"],
        freshnessRule: { exactCandidateRefsRequired: true, readinessRefsAreEvidenceOnly: true },
      }),
    );
    assert.equal(launchScopeDefinition.scope, AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE);
    assert.equal(launchScopeDefinition.required_evidence_type, AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE);

    const evidenceAudit = await writer.withTransaction((tx) =>
      writer.createAuditEvent(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-audit-evidence-${suffix}`,
        eventName: "evidence.package_created",
        eventFamily: "asset/storage evidence",
        severity: "info",
        replayClass: "deterministic_replay",
        actorType: "system",
        actorId: "aaf-writer-integration-test",
        actorRole: "system",
        payloadJson: { noRuntimeActionExecuted: true },
      }),
    );

    const evidenceTx = await writer.createEvidencePackageTransaction({
      evidencePackage: {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-evidence-package-${suffix}`,
        packageType: "publish_activation_evidence",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        sourceWatermark: `site-version:${suffix}:1`,
        freshnessLabel: "fresh",
        contentHash: `hash-${suffix}-0123456789abcdef`,
      },
      sourceRefs: [
        {
          sourceTable: "gnr8_runtime_site_versions",
          sourceRecordId: scope.siteVersionId,
          sourceVersion: "1",
          sourceWatermark: `site-version:${suffix}:1`,
          hash: `source-${suffix}-0123456789abcdef`,
          metadataJson: { objectRefOnly: true },
        },
      ],
      items: [
        {
          itemType: "runtime_artifact_ref",
          itemRef: `runtime-artifact:${suffix}`,
          itemHash: `item-${suffix}-0123456789abcdef`,
          mediaType: "application/json",
          sizeBytes: 512,
          storageBucket: "aaf-local-test-bucket",
          storageKey: `evidence/${suffix}/artifact.json`,
        },
      ],
      freshnessCheck: {
        policyVersion: String(bootstrap.policy.version),
        result: "fresh",
        checkedByActorType: "system",
        checkedByActorId: "aaf-writer-integration-test",
        currentSourceWatermark: `site-version:${suffix}:1`,
        idempotencyKey: `idem-freshness-${suffix}`,
      },
      auditLink: {
        auditEventId: evidenceAudit.id,
        linkRole: "package_created",
      },
    });
    assert.equal(evidenceTx.sourceRefs.length, 1);
    assert.equal(evidenceTx.items.length, 1);
    assert.equal(evidenceTx.freshnessCheck?.result, "fresh");
    assert.equal(evidenceTx.auditLink?.audit_event_id, evidenceAudit.id);

    const approvalRequestTx = await writer.createApprovalRequestTransaction({
      approvalRequest: {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-approval-request-${suffix}`,
        scope: "publish_activation",
        requesterActorType: "human",
        requesterActorId: "operator-aaf",
        requesterRole: "agency_admin",
        policyId: bootstrap.policy.id,
        policyVersion: String(bootstrap.policy.version),
        reason: "Synthetic approval request for AAF writer integration.",
      },
      subjectRefs: [
        {
          ...subject,
          sourceTable: "gnr8_runtime_site_versions",
          sourceRecordId: scope.siteVersionId,
          sourceVersion: "1",
          sourceWatermark: `site-version:${suffix}:1`,
          metadataJson: { source: "synthetic" },
        },
      ],
      evidenceLink: {
        evidencePackageId: evidenceTx.evidencePackage.id,
        linkRole: "request_basis",
        idempotencyKey: `idem-approval-request-evidence-link-${suffix}`,
      },
      policyEvaluation: {
        policyId: bootstrap.policy.id,
        policyVersion: String(bootstrap.policy.version),
        result: "approval_required",
        scope: "publish_activation",
        actionKey: "publish.activation",
        ...subject,
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        evidencePackageId: evidenceTx.evidencePackage.id,
        idempotencyKey: `idem-policy-evaluation-request-${suffix}`,
      },
      requestedAuditEvent: {
        eventName: "approval.requested",
        eventFamily: "approval",
        severity: "notice",
        replayClass: "not_replayable",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        ...subject,
        idempotencyKey: `idem-audit-approval-requested-${suffix}`,
        payloadJson: { scope: "publish_activation" },
      },
    });
    assert.equal(approvalRequestTx.subjectRefs.length, 1);
    assert.equal(approvalRequestTx.policyEvaluation.approval_request_id, approvalRequestTx.approvalRequest.id);
    assert.equal(approvalRequestTx.auditEvent.approval_request_id, approvalRequestTx.approvalRequest.id);

    const approvalDecisionTx = await writer.createApprovalDecisionTransaction({
      approvalDecision: {
        correlationId,
        idempotencyKey: `idem-approval-decision-${suffix}`,
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        status: "granted",
        decisionActorType: "human",
        decisionActorId: "approver-aaf",
        decisionActorRole: "superadmin",
        policyVersion: String(bootstrap.policy.version),
        evidencePackageId: evidenceTx.evidencePackage.id,
        policyEvaluationId: approvalRequestTx.policyEvaluation.id,
        reason: "Synthetic approval grant.",
      },
      evidenceLink: {
        evidencePackageId: evidenceTx.evidencePackage.id,
        policyEvaluationId: approvalRequestTx.policyEvaluation.id,
        linkRole: "decision_basis",
        idempotencyKey: `idem-approval-decision-evidence-link-${suffix}`,
      },
      decisionAuditEvent: {
        ...scope,
        ...subject,
        eventName: "approval.granted",
        eventFamily: "approval",
        severity: "notice",
        replayClass: "not_replayable",
        actorType: "human",
        actorId: "approver-aaf",
        actorRole: "superadmin",
        idempotencyKey: `idem-audit-approval-granted-${suffix}`,
      },
      auditRefs: [
        {
          refRole: "decision_basis",
          refType: "evidence_package",
          refId: evidenceTx.evidencePackage.id,
          sourceTable: "gnr8_aaf_evidence_packages",
          sourceWatermark: `site-version:${suffix}:1`,
        },
      ],
    });
    assert.equal(approvalDecisionTx.approvalDecision.audit_event_id, approvalDecisionTx.auditEvent.id);
    assert.equal(approvalDecisionTx.auditEvent.approval_decision_id, approvalDecisionTx.approvalDecision.id);
    assert.equal(approvalDecisionTx.auditRefs.length, 1);

    const limitedDecision = await writer.withTransaction((tx) =>
      writer.createApprovalDecision(tx, {
        correlationId,
        idempotencyKey: `idem-approval-decision-limited-${suffix}`,
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        status: "granted_with_limitations",
        decisionActorType: "human",
        decisionActorId: "approver-aaf-limited",
        decisionActorRole: "superadmin",
        policyVersion: String(bootstrap.policy.version),
        evidencePackageId: evidenceTx.evidencePackage.id,
        policyEvaluationId: approvalRequestTx.policyEvaluation.id,
        reason: "Synthetic limited approval grant.",
      }),
    );
    assert.equal(limitedDecision.status, "granted_with_limitations");

    const contentEvidence = await writer.withTransaction((tx) =>
      writer.createEvidencePackage(tx, {
        tenantId: scope.tenantId,
        clientId: scope.clientId,
        siteId: scope.siteId,
        siteVersionId: "improved-candidate-version-1",
        correlationId,
        idempotencyKey: `idem-content-approval-evidence-${suffix}`,
        packageType: AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
        subjectType: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
        subjectId: "improved-review-1",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        sourceWatermark: `improved-review:${suffix}:1`,
        freshnessLabel: "fresh",
        contentHash: `content-approval-${suffix}-0123456789abcdef`,
        limitationsJson: { carriedForward: ["limitation-1"] },
      }),
    );
    assert.equal(contentEvidence.package_type, AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE);
    assert.deepEqual(contentEvidence.limitations_json, { carriedForward: ["limitation-1"] });

    const clientEvidence = await writer.withTransaction((tx) =>
      writer.createEvidencePackage(tx, {
        tenantId: scope.tenantId,
        clientId: scope.clientId,
        siteId: scope.siteId,
        siteVersionId: "improved-candidate-version-1",
        correlationId,
        idempotencyKey: `idem-client-approval-evidence-${suffix}`,
        packageType: AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE,
        subjectType: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
        subjectId: "client-acceptance-1",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        sourceWatermark: `client-acceptance:${suffix}:1`,
        freshnessLabel: "fresh",
        contentHash: `client-approval-${suffix}-0123456789abcdef`,
        limitationsJson: { carriedForward: ["limitation-1"] },
      }),
    );
    assert.equal(clientEvidence.package_type, AAF_SINGLE_SITE_CLIENT_APPROVAL_EVIDENCE_TYPE);
    assert.equal(clientEvidence.subject_type, AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE);

    const launchEvidence = await writer.withTransaction((tx) =>
      writer.createEvidencePackage(tx, {
        tenantId: scope.tenantId,
        clientId: scope.clientId,
        siteId: scope.siteId,
        siteVersionId: "improved-candidate-version-1",
        correlationId,
        idempotencyKey: `idem-launch-approval-evidence-${suffix}`,
        packageType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE,
        subjectType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
        subjectId: "launch-readiness-review-1",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        sourceWatermark: `launch-readiness:${suffix}:1`,
        freshnessLabel: "fresh",
        contentHash: `launch-approval-${suffix}-0123456789abcdef`,
        limitationsJson: { carriedForward: ["client-limitation-1"] },
      }),
    );
    assert.equal(launchEvidence.package_type, AAF_SINGLE_SITE_LAUNCH_APPROVAL_EVIDENCE_TYPE);
    assert.equal(launchEvidence.subject_type, AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE);

    const revocationAudit = await writer.withTransaction((tx) =>
      writer.createAuditEvent(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-audit-approval-revoked-${suffix}`,
        eventName: "approval.revoked",
        eventFamily: "approval",
        severity: "warning",
        replayClass: "not_replayable",
        actorType: "human",
        actorId: "approver-aaf",
        actorRole: "superadmin",
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        approvalDecisionId: approvalDecisionTx.approvalDecision.id,
      }),
    );
    const revocation = await writer.withTransaction((tx) =>
      writer.createApprovalRevocation(tx, {
        approvalDecisionId: approvalDecisionTx.approvalDecision.id,
        revokedByActorType: "human",
        revokedByActorId: "approver-aaf",
        revokedByRole: "superadmin",
        reason: "Synthetic insert-only revocation.",
        auditEventId: revocationAudit.id,
        correlationId,
        idempotencyKey: `idem-approval-revocation-${suffix}`,
      }),
    );
    assert.equal(revocation.approval_decision_id, approvalDecisionTx.approvalDecision.id);

    const secondRequest = await writer.withTransaction((tx) =>
      writer.createApprovalRequest(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-approval-request-superseding-${suffix}`,
        scope: "publish_activation",
        requesterActorType: "human",
        requesterActorId: "operator-aaf",
        requesterRole: "agency_admin",
        policyVersion: String(bootstrap.policy.version),
      }),
    );
    const approvalSupersession = await writer.withTransaction((tx) =>
      writer.createApprovalSupersessionLink(tx, {
        supersededApprovalRequestId: approvalRequestTx.approvalRequest.id,
        supersedingApprovalRequestId: secondRequest.id,
        supersededDecisionId: approvalDecisionTx.approvalDecision.id,
        reason: "Synthetic newer evidence superseded prior request.",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        auditEventId: revocationAudit.id,
        correlationId,
        idempotencyKey: `idem-approval-supersession-${suffix}`,
      }),
    );
    assert.equal(approvalSupersession.superseding_approval_request_id, secondRequest.id);

    const secondEvidence = await writer.withTransaction((tx) =>
      writer.createEvidencePackage(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-evidence-package-superseding-${suffix}`,
        packageType: "publish_activation_evidence",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        sourceWatermark: `site-version:${suffix}:2`,
        freshnessLabel: "fresh",
        contentHash: `hash-${suffix}-superseding-0123456789abcdef`,
      }),
    );
    const evidenceSupersession = await writer.withTransaction((tx) =>
      writer.createEvidencePackageSupersessionLink(tx, {
        supersededPackageId: evidenceTx.evidencePackage.id,
        supersedingPackageId: secondEvidence.id,
        reason: "Synthetic package supersession.",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        auditEventId: revocationAudit.id,
        correlationId,
        idempotencyKey: `idem-evidence-supersession-${suffix}`,
      }),
    );
    assert.equal(evidenceSupersession.superseding_package_id, secondEvidence.id);

    const partialMarker = await writer.withTransaction((tx) =>
      writer.createAuditPartialTimelineMarker(tx, {
        ...scope,
        ...subject,
        correlationId,
        firstObservedAuditEventId: approvalRequestTx.auditEvent.id,
        missingEventName: "publish.activation.outcome",
        failureReason: "Synthetic partial timeline marker; no runtime action executed.",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
      }),
    );
    assert.equal(partialMarker.status, "open");

    const gateTx = await writer.createGateAttemptTransaction({
      policyEvaluation: {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-policy-evaluation-gate-${suffix}`,
        policyId: bootstrap.policy.id,
        policyVersion: String(bootstrap.policy.version),
        result: "approval_required",
        scope: "publish_activation",
        actionKey: "publish.activation",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        evidencePackageId: evidenceTx.evidencePackage.id,
      },
      preActionAuditEvent: {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-audit-gate-pre-action-${suffix}`,
        eventName: "publish.activation.gate_blocked",
        eventFamily: "publish",
        severity: "warning",
        replayClass: "forbidden_replay",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        evidencePackageId: evidenceTx.evidencePackage.id,
      },
      gateAttempt: {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-gate-attempt-${suffix}`,
        actionKey: "publish.activation",
        scope: "publish_activation",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        evidencePackageId: evidenceTx.evidencePackage.id,
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        gateResult: "approval_required",
      },
    });
    assert.equal(gateTx.gateAttempt.policy_evaluation_id, gateTx.policyEvaluation?.id);
    assert.equal(gateTx.gateAttempt.pre_action_audit_event_id, gateTx.preActionAuditEvent?.id);

    await writer.withTransaction(async (tx) => {
      const retriedRequest = await writer.createApprovalRequest(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-approval-request-${suffix}`,
        scope: "publish_activation",
        requesterActorType: "human",
        requesterActorId: "operator-aaf",
        requesterRole: "agency_admin",
        policyId: bootstrap.policy.id,
        policyVersion: String(bootstrap.policy.version),
        reason: "Synthetic approval request for AAF writer integration.",
      });
      const retriedEvaluation = await writer.createApprovalPolicyEvaluation(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-policy-evaluation-gate-${suffix}`,
        policyId: bootstrap.policy.id,
        policyVersion: String(bootstrap.policy.version),
        result: "approval_required",
        scope: "publish_activation",
        actionKey: "publish.activation",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        evidencePackageId: evidenceTx.evidencePackage.id,
      });
      const retriedAudit = await writer.createAuditEvent(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-audit-gate-pre-action-${suffix}`,
        eventName: "publish.activation.gate_blocked",
        eventFamily: "publish",
        severity: "warning",
        replayClass: "forbidden_replay",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        evidencePackageId: evidenceTx.evidencePackage.id,
      });
      const retriedEvidence = await writer.createEvidencePackage(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-evidence-package-${suffix}`,
        packageType: "publish_activation_evidence",
        createdByActorType: "system",
        createdByActorId: "aaf-writer-integration-test",
        sourceWatermark: `site-version:${suffix}:1`,
        freshnessLabel: "fresh",
        contentHash: `hash-${suffix}-0123456789abcdef`,
      });
      const retriedGate = await writer.createActionGateAttempt(tx, {
        ...scope,
        ...subject,
        correlationId,
        idempotencyKey: `idem-gate-attempt-${suffix}`,
        actionKey: "publish.activation",
        scope: "publish_activation",
        actorType: "human",
        actorId: "operator-aaf",
        actorRole: "agency_admin",
        policyEvaluationId: gateTx.policyEvaluation?.id,
        preActionAuditEventId: gateTx.preActionAuditEvent?.id,
        evidencePackageId: evidenceTx.evidencePackage.id,
        approvalRequestId: approvalRequestTx.approvalRequest.id,
        gateResult: "approval_required",
      });

      assert.equal(retriedRequest.id, approvalRequestTx.approvalRequest.id);
      assert.equal(retriedEvaluation.id, gateTx.policyEvaluation?.id);
      assert.equal(retriedAudit.id, gateTx.preActionAuditEvent?.id);
      assert.equal(retriedEvidence.id, evidenceTx.evidencePackage.id);
      assert.equal(retriedGate.id, gateTx.gateAttempt.id);
    });

    await assert.rejects(
      () =>
        writer.withTransaction((tx) =>
          writer.createApprovalRequest(tx, {
            ...scope,
            ...subject,
            correlationId,
            idempotencyKey: `idem-approval-request-${suffix}`,
            scope: "publish_activation",
            requesterActorType: "human",
            requesterActorId: "operator-aaf",
            requesterRole: "agency_admin",
            policyId: bootstrap.policy.id,
            policyVersion: String(bootstrap.policy.version),
            reason: "Drifted approval request reason.",
          }),
        ),
      (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("reason"),
    );
    await assert.rejects(
      () =>
        writer.withTransaction((tx) =>
          writer.createApprovalPolicyEvaluation(tx, {
            ...scope,
            ...subject,
            correlationId,
            idempotencyKey: `idem-policy-evaluation-gate-${suffix}`,
            policyId: bootstrap.policy.id,
            policyVersion: String(bootstrap.policy.version),
            result: "approval_blocked",
            scope: "publish_activation",
            actionKey: "publish.activation",
            actorType: "human",
            actorId: "operator-aaf",
            actorRole: "agency_admin",
            evidencePackageId: evidenceTx.evidencePackage.id,
          }),
        ),
      (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("result"),
    );
    await assert.rejects(
      () =>
        writer.withTransaction((tx) =>
          writer.createAuditEvent(tx, {
            ...scope,
            ...subject,
            correlationId,
            idempotencyKey: `idem-audit-gate-pre-action-${suffix}`,
            eventName: "publish.activation.gate_blocked",
            eventFamily: "publish",
            severity: "error",
            replayClass: "forbidden_replay",
            actorType: "human",
            actorId: "operator-aaf",
            actorRole: "agency_admin",
            approvalRequestId: approvalRequestTx.approvalRequest.id,
            evidencePackageId: evidenceTx.evidencePackage.id,
          }),
        ),
      (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("severity"),
    );
    await assert.rejects(
      () =>
        writer.withTransaction((tx) =>
          writer.createEvidencePackage(tx, {
            ...scope,
            ...subject,
            correlationId,
            idempotencyKey: `idem-evidence-package-${suffix}`,
            packageType: "publish_activation_evidence",
            createdByActorType: "system",
            createdByActorId: "aaf-writer-integration-test",
            sourceWatermark: `site-version:${suffix}:1`,
            freshnessLabel: "stale",
            contentHash: `hash-${suffix}-0123456789abcdef`,
          }),
        ),
      (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("freshness_label"),
    );
    await assert.rejects(
      () =>
        writer.withTransaction((tx) =>
          writer.createActionGateAttempt(tx, {
            ...scope,
            ...subject,
            correlationId,
            idempotencyKey: `idem-gate-attempt-${suffix}`,
            actionKey: "publish.activation",
            scope: "publish_activation",
            actorType: "human",
            actorId: "operator-aaf",
            actorRole: "agency_admin",
            policyEvaluationId: gateTx.policyEvaluation?.id,
            preActionAuditEventId: gateTx.preActionAuditEvent?.id,
            evidencePackageId: evidenceTx.evidencePackage.id,
            approvalRequestId: approvalRequestTx.approvalRequest.id,
            gateResult: "blocked",
          }),
        ),
      (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("gate_result"),
    );

    await assertDbRejects(
      () =>
        pool.query(`update public.gnr8_aaf_approval_requests set reason = 'mutated' where id = $1::uuid`, [
          approvalRequestTx.approvalRequest.id,
        ]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_aaf_audit_events where id = $1::uuid`, [approvalRequestTx.auditEvent.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`update public.gnr8_aaf_evidence_packages set status = 'verified' where id = $1::uuid`, [evidenceTx.evidencePackage.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_aaf_action_gate_attempts where id = $1::uuid`, [gateTx.gateAttempt.id]),
      /append-only/i,
    );

    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_audit_events (
            tenant_id, event_name, event_family, severity, replay_class, actor_type, actor_id, actor_role,
            subject_type, subject_id, correlation_id, idempotency_key
          )
          values ($1, 'audit.invalid', 'approval', 'loud', 'not_replayable', 'system', 'aaf-test', 'system',
            'site_version', $2, $3, $4)
          `,
          [scope.tenantId, subject.subjectId, correlationId, `idem-invalid-audit-${suffix}`],
        ),
      /check constraint "gnr8_aaf_audit_events_severity_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_decisions (
            approval_request_id, status, decision_actor_type, decision_actor_id, decision_actor_role,
            policy_version, correlation_id, idempotency_key
          )
          values ($1::uuid, 'not_required_by_policy', 'system', 'policy-evaluator', 'system', $2, $3, $4)
          `,
          [approvalRequestTx.approvalRequest.id, String(bootstrap.policy.version), correlationId, `idem-invalid-not-required-${suffix}`],
        ),
      /check constraint "gnr8_aaf_approval_decisions_not_required_policy_ref_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_decisions (
            approval_request_id, status, decision_actor_type, decision_actor_id, decision_actor_role,
            policy_version, correlation_id, idempotency_key
          )
          values ($1::uuid, 'invalid_status', 'human', 'approver-aaf', 'superadmin', $2, $3, $4)
          `,
          [approvalRequestTx.approvalRequest.id, String(bootstrap.policy.version), correlationId, `idem-invalid-status-${suffix}`],
        ),
      /check constraint "gnr8_aaf_approval_decisions_status_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_action_gate_attempts (
            tenant_id, action_key, scope, subject_type, subject_id, actor_type, actor_id, actor_role,
            gate_result, correlation_id, idempotency_key
          )
          values ($1, 'publish.activation', 'publish_activation', 'site_version', $2, 'human', 'operator-aaf', 'agency_admin',
            'fail_closed', $3, $4)
          `,
          [scope.tenantId, subject.subjectId, correlationId, `idem-invalid-fail-closed-${suffix}`],
        ),
      /check constraint "gnr8_aaf_action_gate_attempts_fail_closed_reason_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_requests (
            tenant_id, scope, subject_type, subject_id, requester_actor_type, requester_actor_id, requester_role,
            policy_version, correlation_id, idempotency_key
          )
          values ($1, 'invalid_scope', 'site_version', $2, 'human', 'operator-aaf', 'agency_admin', $3, $4, $5)
          `,
          [scope.tenantId, subject.subjectId, String(bootstrap.policy.version), correlationId, `idem-invalid-scope-${suffix}`],
        ),
      /check constraint "gnr8_aaf_approval_requests_scope_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_evidence_packages (
            tenant_id, package_type, subject_type, subject_id, created_by_actor_type, created_by_actor_id,
            source_watermark, freshness_label, content_hash, correlation_id, idempotency_key
          )
          values ($1, 'invalid_evidence_type', 'site_version', $2, 'system', 'aaf-test',
            'site-version:1', 'fresh', 'invalid-evidence-hash-0123456789abcdef', $3, $4)
          `,
          [scope.tenantId, subject.subjectId, correlationId, `idem-invalid-evidence-type-${suffix}`],
        ),
      /check constraint "gnr8_aaf_evidence_packages_type_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_evidence_packages (
            tenant_id, package_type, subject_type, subject_id, created_by_actor_type, created_by_actor_id,
            source_watermark, freshness_label, content_hash, correlation_id, idempotency_key
          )
          values ($1, 'publish_activation_evidence', 'site_version', $2, 'system', 'aaf-test',
            'short-watermark', 'fresh', 'short', $3, $4)
          `,
          [scope.tenantId, subject.subjectId, correlationId, `idem-invalid-evidence-hash-${suffix}`],
        ),
      /check constraint "gnr8_aaf_evidence_packages_content_hash_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_scope_definitions (
            scope, policy_key, policy_version, subject_type, allowed_action, required_evidence_type
          )
          values (
            'single_site_client_approval', $1, $2, 'single_site_launch_readiness_review',
            'approve_single_site_client_acceptance', 'single_site_client_approval_evidence'
          )
          `,
          [String(bootstrap.policy.policy_key), `AAF-WRITER-${suffix}-bad-client-subject`],
        ),
      /check constraint "gnr8_aaf_scope_defs_client_launch_approval_contract_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_scope_definitions (
            scope, policy_key, policy_version, subject_type, allowed_action, required_evidence_type
          )
          values (
            'single_site_launch_approval', $1, $2, 'single_site_launch_readiness_review',
            'approve_single_site_client_acceptance', 'single_site_launch_approval_evidence'
          )
          `,
          [String(bootstrap.policy.policy_key), `AAF-WRITER-${suffix}-bad-launch-action`],
        ),
      /check constraint "gnr8_aaf_scope_defs_client_launch_approval_contract_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_requests (
            tenant_id, scope, subject_type, subject_id, requester_actor_type, requester_actor_id, requester_role,
            policy_version, correlation_id, idempotency_key
          )
          values ($1, 'single_site_client_approval', 'single_site_launch_readiness_review', $2, 'human', 'operator-aaf',
            'agency_admin', $3, $4, $5)
          `,
          [scope.tenantId, subject.subjectId, String(bootstrap.policy.version), correlationId, `idem-invalid-client-subject-${suffix}`],
        ),
      /check constraint "gnr8_aaf_requests_client_launch_approval_subject_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_approval_policy_evaluations (
            tenant_id, policy_version, result, scope, action_key, subject_type, subject_id,
            actor_type, actor_id, actor_role, correlation_id, idempotency_key
          )
          values ($1, $2, 'approval_required', 'single_site_launch_approval', 'publish_activation',
            'single_site_launch_readiness_review', $3, 'human', 'operator-aaf', 'agency_admin', $4, $5)
          `,
          [scope.tenantId, String(bootstrap.policy.version), subject.subjectId, correlationId, `idem-invalid-launch-action-${suffix}`],
        ),
      /check constraint "gnr8_aaf_policy_evals_client_launch_approval_contract_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_action_gate_attempts (
            tenant_id, action_key, scope, subject_type, subject_id, actor_type, actor_id, actor_role,
            gate_result, correlation_id, idempotency_key
          )
          values ($1, 'approve_single_site_launch_readiness', 'single_site_client_approval',
            'single_site_improved_candidate_client_acceptance', $2, 'human', 'operator-aaf', 'agency_admin',
            'approval_required', $3, $4)
          `,
          [scope.tenantId, subject.subjectId, correlationId, `idem-invalid-gate-client-launch-action-${suffix}`],
        ),
      /check constraint "gnr8_aaf_gate_attempts_client_launch_approval_contract_ck"/,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_aaf_evidence_packages (
            tenant_id, package_type, subject_type, subject_id, created_by_actor_type, created_by_actor_id,
            source_watermark, freshness_label, content_hash, correlation_id, idempotency_key
          )
          values ($1, 'single_site_client_approval_evidence', 'single_site_launch_readiness_review', $2, 'system',
            'aaf-test', 'client-launch-mismatch:1', 'fresh', 'client-launch-mismatch-0123456789abcdef', $3, $4)
          `,
          [scope.tenantId, subject.subjectId, correlationId, `idem-invalid-client-evidence-subject-${suffix}`],
        ),
      /check constraint "gnr8_aaf_evidence_client_launch_approval_subject_ck"/,
    );

    await writer
      .withTransaction(async (tx) => {
        await writer.createApprovalRequest(tx, {
          ...scope,
          ...subject,
          correlationId,
          idempotencyKey: `idem-rollback-proof-${suffix}`,
          scope: "publish_activation",
          requesterActorType: "human",
          requesterActorId: "operator-aaf",
          requesterRole: "agency_admin",
          policyVersion: String(bootstrap.policy.version),
        });
        throw new Error("synthetic rollback");
      })
      .catch((error) => {
        assert.equal(error instanceof Error && error.message, "synthetic rollback");
      });
    const rolledBack = await pool.query<{ count: string }>(
      `select count(*)::text as count from public.gnr8_aaf_approval_requests where idempotency_key = $1`,
      [`idem-rollback-proof-${suffix}`],
    );
    assert.equal(rolledBack.rows[0]?.count, "0");

    const clientRole = `gnr8_aaf_client_${suffix.replace(/-/g, "_")}`;
    await pool.query(`create role ${quoteIdent(clientRole)}`);
    await pool.query("begin");
    try {
      await pool.query(`set local role ${quoteIdent(clientRole)}`);
      await assertDbRejects(
        () =>
          pool.query(
            `
            insert into public.gnr8_aaf_audit_events (
              tenant_id, event_name, event_family, severity, replay_class, actor_type, actor_id, actor_role,
              subject_type, subject_id, correlation_id, idempotency_key
            )
            values ($1, 'audit.client_attempt', 'approval', 'notice', 'not_replayable', 'human', 'client-user', 'client',
              'site_version', $2, $3, $4)
            `,
            [scope.tenantId, subject.subjectId, correlationId, `idem-client-denied-${suffix}`],
          ),
        /permission denied|violates row-level security/i,
      );
    } finally {
      await pool.query("rollback");
    }

    const nonAafTables = await pool.query<{ count: string }>(
      `select count(*)::text as count from information_schema.tables where table_schema = 'public' and table_name not like 'gnr8_aaf_%'`,
    );
    assert.equal(nonAafTables.rows[0]?.count, "0");
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
