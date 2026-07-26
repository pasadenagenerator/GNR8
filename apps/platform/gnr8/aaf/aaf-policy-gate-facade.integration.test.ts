import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { AafActionGateValidatorFacade, AafGateFailClosedError, AafPolicyEvaluatorFacade } from "./aaf-policy-gate-facade";
import { AafWriterRepository, type AafTenantScopeInput } from "./aaf-writer-repository";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../../../..");
const MIGRATION_PATH = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql");

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
  const containerName = `gnr8-aaf-gate-${process.pid}-${suffix}`;
  const database = `gnr8_aaf_gate_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/20260722120000_aaf_persistence_core.sql`]);
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
      "/tmp/20260722120000_aaf_persistence_core.sql",
    ]);

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

function suffixId(prefix: string, suffix: string): string {
  return `${prefix}-${suffix}`;
}

async function createScopeDefinition(writer: AafWriterRepository, suffix: string, scope: "publish_activation" | "launch_signoff" = "publish_activation") {
  return writer.withTransaction(async (tx) => {
    const policy = await writer.createApprovalPolicy(tx, {
      policyKey: `aaf-gate-policy-${scope}-${suffix}`,
      version: `AAF-GATE-${scope}-${suffix}`,
      status: "active",
      definitionJson: { nonExecuting: true },
      createdBy: "aaf-gate-integration-test",
    });
    const scopeDefinition = await writer.createApprovalScopeDefinition(tx, {
      scope,
      policyKey: String(policy.policy_key),
      policyVersion: String(policy.version),
      subjectType: "site_version",
      allowedAction: scope === "publish_activation" ? "publish.activation" : "launch.signoff",
      prohibitedActions: scope === "publish_activation" ? ["rollback", "dns_mutation"] : ["publish_activation"],
      requiredEvidenceType: scope === "publish_activation" ? "publish_activation_evidence" : "launch_signoff_evidence",
      requesterRoles: ["agency_admin", "superadmin"],
      approverRoles: ["superadmin"],
      freshnessRule: { maxAgeMinutes: 240 },
    });
    return { policy, scopeDefinition };
  });
}

async function createEvidence(
  writer: AafWriterRepository,
  scope: AafTenantScopeInput,
  suffix: string,
  options: {
    id: string;
    type?: "publish_activation_evidence" | "launch_signoff_evidence";
    sourceWatermark?: string;
    freshness?: "fresh" | "stale" | "failed";
    expiresAt?: string | null;
    sourceRefs?: boolean;
  },
) {
  const subject = { subjectType: "site_version", subjectId: scope.siteVersionId ?? suffixId("site-version", suffix) };
  const evidenceTx = await writer.createEvidencePackageTransaction({
    evidencePackage: {
      ...scope,
      ...subject,
      correlationId: `corr-evidence-${options.id}-${suffix}`,
      idempotencyKey: `idem-evidence-${options.id}-${suffix}`,
      packageType: options.type ?? "publish_activation_evidence",
      createdByActorType: "system",
      createdByActorId: "aaf-gate-integration-test",
      sourceWatermark: options.sourceWatermark ?? `watermark-${suffix}:1`,
      freshnessLabel: options.freshness ?? "fresh",
      expiresAt: options.expiresAt ?? null,
      contentHash: `hash-${options.id}-${suffix}-0123456789abcdef`,
    },
    sourceRefs:
      options.sourceRefs === false
        ? []
        : [
            {
              sourceTable: "synthetic_aaf_source",
              sourceRecordId: subject.subjectId,
              sourceVersion: "1",
              sourceWatermark: options.sourceWatermark ?? `watermark-${suffix}:1`,
              hash: `source-${options.id}-${suffix}-0123456789abcdef`,
            },
          ],
    freshnessCheck: {
      policyVersion: `AAF-GATE-publish_activation-${suffix}`,
      result: options.freshness ?? "fresh",
      checkedByActorType: "system",
      checkedByActorId: "aaf-gate-integration-test",
      currentSourceWatermark: options.sourceWatermark ?? `watermark-${suffix}:1`,
      idempotencyKey: `idem-freshness-${options.id}-${suffix}`,
    },
  });
  return evidenceTx.evidencePackage;
}

async function createApproval(
  writer: AafWriterRepository,
  scope: AafTenantScopeInput,
  suffix: string,
  input: {
    id: string;
    policyVersion: string;
    approvalScope?: "publish_activation" | "launch_signoff";
    actionKey?: string;
    evidencePackageId?: string | null;
    status?: "granted" | "rejected" | "revoked" | "expired" | "superseded" | "cancelled" | "not_required_by_policy";
    policyEvaluationId?: string | null;
    expiresAt?: string | null;
  },
) {
  const subject = { subjectType: "site_version", subjectId: scope.siteVersionId ?? suffixId("site-version", suffix) };
  const request = await writer.withTransaction((tx) =>
    writer.createApprovalRequest(tx, {
      ...scope,
      ...subject,
      correlationId: `corr-approval-${input.id}-${suffix}`,
      idempotencyKey: `idem-request-${input.id}-${suffix}`,
      scope: input.approvalScope ?? "publish_activation",
      requesterActorType: "human",
      requesterActorId: "operator-aaf",
      requesterRole: "agency_admin",
      policyVersion: input.policyVersion,
      reason: "Synthetic AAF gate approval.",
    }),
  );
  const decision = await writer.withTransaction((tx) =>
    writer.createApprovalDecision(tx, {
      correlationId: `corr-approval-${input.id}-${suffix}`,
      idempotencyKey: `idem-decision-${input.id}-${suffix}`,
      approvalRequestId: request.id,
      status: input.status ?? "granted",
      decisionActorType: input.status === "not_required_by_policy" ? "system" : "human",
      decisionActorId: input.status === "not_required_by_policy" ? "policy-evaluator" : "superadmin-aaf",
      decisionActorRole: input.status === "not_required_by_policy" ? "system" : "superadmin",
      policyVersion: input.policyVersion,
      evidencePackageId: input.evidencePackageId ?? null,
      policyEvaluationId: input.policyEvaluationId ?? null,
      expiresAt: input.expiresAt ?? null,
      reason: "Synthetic AAF gate decision.",
    }),
  );
  return { request, decision };
}

test("AAF policy/gate facade persists non-executing policy evaluations and inert gate attempts in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const writer = new AafWriterRepository(pool);
  const evaluator = new AafPolicyEvaluatorFacade(writer);
  const gate = new AafActionGateValidatorFacade(writer, evaluator);
  const suffix = randomUUID().slice(0, 10);
  const scope = {
    tenantId: suffixId("tenant", suffix),
    clientId: suffixId("client", suffix),
    siteId: suffixId("site", suffix),
    siteVersionId: suffixId("site-version", suffix),
  };
  const subject = { subjectType: "site_version", subjectId: scope.siteVersionId };

  try {
    const bootstrap = await createScopeDefinition(writer, suffix);

    const policyEvaluation = await evaluator.evaluatePolicy({
      ...scope,
      ...subject,
      correlationId: `corr-eval-${suffix}`,
      idempotencyKey: `idem-eval-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
    });
    assert.equal(policyEvaluation.result, "approval_required");
    assert.equal(policyEvaluation.policyEvaluation.action_key, "publish.activation");

    const missingEvidence = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-missing-evidence-${suffix}`,
      idempotencyKey: `idem-gate-missing-evidence-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      sourceRefsRequired: true,
    });
    assert.equal(missingEvidence.gateResult, "evidence_missing");
    assert.equal(missingEvidence.gateAttempt?.gate_result, "evidence_missing");

    const staleEvidence = await createEvidence(writer, scope, suffix, { id: "stale", freshness: "stale" });
    const staleGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-stale-evidence-${suffix}`,
      idempotencyKey: `idem-gate-stale-evidence-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: staleEvidence.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
    });
    assert.equal(staleGate.gateResult, "evidence_stale");

    const wrongEvidence = await createEvidence(writer, scope, suffix, { id: "wrong-type", type: "launch_signoff_evidence" });
    const wrongTypeGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-wrong-evidence-${suffix}`,
      idempotencyKey: `idem-gate-wrong-evidence-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: wrongEvidence.id,
      sourceRefsRequired: true,
    });
    assert.equal(wrongTypeGate.gateResult, "blocked");

    const freshEvidence = await createEvidence(writer, scope, suffix, { id: "fresh" });
    const missingApprovalGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-missing-approval-${suffix}`,
      idempotencyKey: `idem-gate-missing-approval-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
    });
    assert.equal(missingApprovalGate.gateResult, "approval_required");

    const granted = await createApproval(writer, scope, suffix, {
      id: "granted",
      policyVersion: String(bootstrap.policy.version),
      evidencePackageId: freshEvidence.id,
    });
    const allowedGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-allowed-${suffix}`,
      idempotencyKey: `idem-gate-allowed-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      approvalRequestId: granted.request.id,
      approvalDecisionId: granted.decision.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
      auditRequired: true,
    });
    assert.equal(allowedGate.gateResult, "allowed");
    const allowedAuditPayload = allowedGate.preActionAuditEvent?.payload_json as Record<string, unknown> | undefined;
    assert.equal(allowedAuditPayload?.nonExecuting, true);

    const launchBootstrap = await createScopeDefinition(writer, `${suffix}-launch`, "launch_signoff");
    const wrongScope = await createApproval(writer, scope, suffix, {
      id: "wrong-scope",
      approvalScope: "launch_signoff",
      policyVersion: String(launchBootstrap.policy.version),
      evidencePackageId: freshEvidence.id,
    });
    const wrongScopeGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-wrong-scope-${suffix}`,
      idempotencyKey: `idem-gate-wrong-scope-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      approvalDecisionId: wrongScope.decision.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
    });
    assert.equal(wrongScopeGate.gateResult, "approval_required");

    const revoked = await createApproval(writer, scope, suffix, {
      id: "revoked",
      policyVersion: String(bootstrap.policy.version),
      evidencePackageId: freshEvidence.id,
    });
    const revocationAudit = await writer.withTransaction((tx) =>
      writer.createAuditEvent(tx, {
        ...scope,
        ...subject,
        correlationId: `corr-revoked-${suffix}`,
        idempotencyKey: `idem-audit-revoked-${suffix}`,
        eventName: "approval.revoked",
        eventFamily: "approval",
        severity: "warning",
        replayClass: "not_replayable",
        actorType: "human",
        actorId: "superadmin-aaf",
        actorRole: "superadmin",
      }),
    );
    await writer.withTransaction((tx) =>
      writer.createApprovalRevocation(tx, {
        approvalDecisionId: revoked.decision.id,
        revokedByActorType: "human",
        revokedByActorId: "superadmin-aaf",
        revokedByRole: "superadmin",
        reason: "Synthetic revocation.",
        auditEventId: revocationAudit.id,
        correlationId: `corr-revoked-${suffix}`,
        idempotencyKey: `idem-revocation-${suffix}`,
      }),
    );
    const revokedGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-revoked-gate-${suffix}`,
      idempotencyKey: `idem-gate-revoked-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      approvalDecisionId: revoked.decision.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
    });
    assert.equal(revokedGate.gateResult, "approval_revoked");

    const superseded = await createApproval(writer, scope, suffix, {
      id: "superseded",
      policyVersion: String(bootstrap.policy.version),
      evidencePackageId: freshEvidence.id,
    });
    const superseding = await createApproval(writer, scope, suffix, {
      id: "superseding",
      policyVersion: String(bootstrap.policy.version),
      evidencePackageId: freshEvidence.id,
    });
    await writer.withTransaction((tx) =>
      writer.createApprovalSupersessionLink(tx, {
        supersededApprovalRequestId: superseded.request.id,
        supersedingApprovalRequestId: superseding.request.id,
        supersededDecisionId: superseded.decision.id,
        supersedingDecisionId: superseding.decision.id,
        reason: "Synthetic supersession.",
        createdByActorType: "system",
        createdByActorId: "aaf-gate-integration-test",
        correlationId: `corr-superseded-${suffix}`,
        idempotencyKey: `idem-supersession-${suffix}`,
      }),
    );
    const supersededGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-superseded-gate-${suffix}`,
      idempotencyKey: `idem-gate-superseded-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      approvalDecisionId: superseded.decision.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
    });
    assert.equal(supersededGate.gateResult, "approval_superseded");

    const notRequiredPolicy = await evaluator.evaluatePolicy({
      ...scope,
      ...subject,
      correlationId: `corr-not-required-eval-${suffix}`,
      idempotencyKey: `idem-not-required-eval-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      policyRules: { allowedAction: "publish.activation", approvalRequired: false, notRequiredReason: "synthetic_policy_rule" },
    });
    const notRequired = await createApproval(writer, scope, suffix, {
      id: "not-required",
      policyVersion: String(bootstrap.policy.version),
      evidencePackageId: freshEvidence.id,
      status: "not_required_by_policy",
      policyEvaluationId: notRequiredPolicy.policyEvaluation.id,
    });
    const notRequiredGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-not-required-gate-${suffix}`,
      idempotencyKey: `idem-gate-not-required-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      approvalDecisionId: notRequired.decision.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
      policyRules: { allowedAction: "publish.activation", approvalRequired: false, notRequiredReason: "synthetic_policy_rule" },
    });
    assert.equal(notRequiredGate.gateResult, "not_required_by_policy");

    const failedAuditGate = await gate.validateGate({
      ...scope,
      ...subject,
      correlationId: `corr-audit-conflict-${suffix}`,
      idempotencyKey: `idem-gate-audit-conflict-${suffix}`,
      auditIdempotencyKey: `idem-audit-revoked-${suffix}`,
      actionKey: "publish.activation",
      scope: "publish_activation",
      actorType: "human",
      actorId: "operator-aaf",
      actorRole: "agency_admin",
      policyVersion: String(bootstrap.policy.version),
      policyId: bootstrap.policy.id,
      requiredEvidenceType: "publish_activation_evidence",
      evidencePackageId: freshEvidence.id,
      approvalDecisionId: granted.decision.id,
      sourceRefsRequired: true,
      currentSubjectWatermark: `watermark-${suffix}:1`,
      auditRequired: true,
    });
    assert.equal(failedAuditGate.gateResult, "audit_unavailable");

    await assert.rejects(
      () =>
        gate.validateGate({
          ...scope,
          ...subject,
          correlationId: `corr-gate-conflict-${suffix}`,
          idempotencyKey: `idem-gate-allowed-${suffix}`,
          actionKey: "publish.activation",
          scope: "publish_activation",
          actorType: "human",
          actorId: "operator-aaf",
          actorRole: "agency_admin",
          policyVersion: String(bootstrap.policy.version),
          policyId: bootstrap.policy.id,
          requiredEvidenceType: "publish_activation_evidence",
          evidencePackageId: freshEvidence.id,
          approvalDecisionId: granted.decision.id,
          sourceRefsRequired: true,
          currentSubjectWatermark: `watermark-${suffix}:1`,
        }),
      (error) => error instanceof AafGateFailClosedError,
    );

    const gateAttemptCount = await pool.query<{ count: string }>(
      `select count(*)::text as count from public.gnr8_aaf_action_gate_attempts where tenant_id = $1`,
      [scope.tenantId],
    );
    assert.ok(Number(gateAttemptCount.rows[0]?.count ?? "0") >= 10);

    const nonAafTables = await pool.query<{ count: string }>(
      `select count(*)::text as count from information_schema.tables where table_schema = 'public' and table_name not like 'gnr8_aaf_%'`,
    );
    assert.equal(nonAafTables.rows[0]?.count, "0");
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
