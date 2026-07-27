import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { AafActionGateValidatorFacade, AafPolicyEvaluatorFacade } from "./aaf-policy-gate-facade";
import {
  AafPublishActivationGateAdapter,
  buildPublishActivationSubjectWatermark,
  type PublishActivationGateDryRunInput,
} from "./aaf-publish-activation-gate-adapter";
import { AafWriterRepository } from "./aaf-writer-repository";

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
  const containerName = `gnr8-aaf-publish-gate-${process.pid}-${suffix}`;
  const database = `gnr8_aaf_publish_gate_${suffix.replace(/-/g, "")}`;
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

function sourceRef(sourceTable: string, sourceRecordId: string, watermark: string) {
  return {
    sourceSystem: "synthetic_test_data",
    sourceTable,
    sourceRecordId,
    sourceRef: `${sourceTable}:${sourceRecordId}`,
    sourceVersion: "1",
    currentWatermark: watermark,
    evidenceWatermark: watermark,
  };
}

function buildInput(suffix: string): PublishActivationGateDryRunInput {
  const siteId = `synthetic-site-${suffix}`;
  const siteVersionId = randomUUID();
  const runtimeArtifactId = randomUUID();
  return {
    tenantId: `synthetic-tenant-${suffix}`,
    clientId: `synthetic-client-${suffix}`,
    siteId,
    siteVersionId,
    runtimeArtifactId,
    currentActivePointer: { siteVersionId: null, artifactId: null },
    intendedPublishTarget: "production",
    domainReadiness: { status: "ready", snapshotRef: `synthetic-domain-readiness-${suffix}` },
    contentOverridePublishedState: { status: "not_applicable" },
    launchSignoffApproval: { requiredByPolicy: false },
    publishActivationApproval: null,
    evidencePackageId: null,
    policyVersion: `AAF-PUBLISH-GATE-${suffix}`,
    actorType: "human",
    actorId: "operator-aaf-publish-gate",
    actorRole: "agency_admin",
    correlationId: `corr-publish-gate-${suffix}`,
    idempotencyKey: `idem-publish-gate-${suffix}`,
    sourceRefs: {
      siteVersion: sourceRef("gnr8_runtime_site_versions", siteVersionId, `synthetic_test_site_version_wm_${suffix}`),
      runtimeArtifact: sourceRef("gnr8_runtime_artifacts", runtimeArtifactId, `synthetic_test_runtime_artifact_wm_${suffix}`),
      activePointer: sourceRef("gnr8_runtime_active_pointers", siteId, `synthetic_test_active_pointer_wm_${suffix}`),
      publishTarget: sourceRef("gnr8_publish_targets", "production", `synthetic_test_publish_target_wm_${suffix}`),
      domainReadiness: sourceRef("gnr8_domain_readiness_snapshots", `domain-${suffix}`, `synthetic_test_domain_wm_${suffix}`),
    },
  };
}

test("publish activation gate adapter persists inert AAF dry-run records without runtime/domain tables", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const writer = new AafWriterRepository(pool);
  const evaluator = new AafPolicyEvaluatorFacade(writer);
  const gate = new AafActionGateValidatorFacade(writer, evaluator);
  const adapter = new AafPublishActivationGateAdapter(gate);
  const suffix = randomUUID().slice(0, 10);
  const inputWithoutRefs = buildInput(suffix);
  const subjectWatermark = buildPublishActivationSubjectWatermark(inputWithoutRefs);
  assert.ok(subjectWatermark);

  try {
    const policy = await writer.withTransaction((tx) =>
      writer.createApprovalPolicy(tx, {
        policyKey: `aaf-publish-activation-${suffix}`,
        version: inputWithoutRefs.policyVersion,
        status: "active",
        definitionJson: { dryRunOnly: true, adapter: "publish_activation" },
        createdBy: "aaf-publish-gate-integration-test",
      }),
    );
    await writer.withTransaction((tx) =>
      writer.createApprovalScopeDefinition(tx, {
        scope: "publish_activation",
        policyKey: String(policy.policy_key),
        policyVersion: String(policy.version),
        subjectType: "site_version",
        allowedAction: "publish.activation",
        prohibitedActions: ["rollback", "dns_mutation", "domain_action", "ai_execution"],
        requiredEvidenceType: "publish_activation_evidence",
        requesterRoles: ["agency_admin", "superadmin"],
        approverRoles: ["superadmin"],
        freshnessRule: { maxAgeMinutes: 120 },
      }),
    );

    const evidenceTx = await writer.createEvidencePackageTransaction({
      evidencePackage: {
        tenantId: inputWithoutRefs.tenantId,
        clientId: inputWithoutRefs.clientId,
        siteId: inputWithoutRefs.siteId,
        siteVersionId: inputWithoutRefs.siteVersionId,
        correlationId: `corr-evidence-${suffix}`,
        idempotencyKey: `idem-evidence-${suffix}`,
        packageType: "publish_activation_evidence",
        subjectType: "site_version",
        subjectId: inputWithoutRefs.siteVersionId,
        createdByActorType: "system",
        createdByActorId: "aaf-publish-gate-integration-test",
        sourceWatermark: subjectWatermark,
        freshnessLabel: "fresh",
        contentHash: `synthetic-publish-evidence-${suffix}-0123456789abcdef`,
      },
      sourceRefs: Object.values(inputWithoutRefs.sourceRefs)
        .filter((ref): ref is NonNullable<typeof ref> => Boolean(ref))
        .map((ref) => ({
          sourceSystem: ref.sourceSystem ?? "synthetic_test_data",
          sourceTable: ref.sourceTable,
          sourceRecordId: ref.sourceRecordId,
          sourceVersion: ref.sourceVersion ?? null,
          sourceWatermark: ref.currentWatermark ?? "",
          hash: `synthetic-${ref.sourceTable}-${suffix}-0123456789abcdef`,
          snapshotRef: ref.sourceRef ?? null,
        })),
      freshnessCheck: {
        policyVersion: inputWithoutRefs.policyVersion,
        result: "fresh",
        checkedByActorType: "system",
        checkedByActorId: "aaf-publish-gate-integration-test",
        currentSourceWatermark: subjectWatermark,
        idempotencyKey: `idem-freshness-${suffix}`,
      },
    });
    const request = await writer.withTransaction((tx) =>
      writer.createApprovalRequest(tx, {
        tenantId: inputWithoutRefs.tenantId,
        clientId: inputWithoutRefs.clientId,
        siteId: inputWithoutRefs.siteId,
        siteVersionId: inputWithoutRefs.siteVersionId,
        correlationId: `corr-approval-${suffix}`,
        idempotencyKey: `idem-request-${suffix}`,
        scope: "publish_activation",
        subjectType: "site_version",
        subjectId: inputWithoutRefs.siteVersionId,
        requesterActorType: "human",
        requesterActorId: "operator-aaf-publish-gate",
        requesterRole: "agency_admin",
        policyId: policy.id,
        policyVersion: inputWithoutRefs.policyVersion,
        reason: "Synthetic publish activation approval request.",
      }),
    );
    const decision = await writer.withTransaction((tx) =>
      writer.createApprovalDecision(tx, {
        correlationId: `corr-approval-${suffix}`,
        idempotencyKey: `idem-decision-${suffix}`,
        approvalRequestId: request.id,
        status: "granted",
        decisionActorType: "human",
        decisionActorId: "superadmin-aaf",
        decisionActorRole: "superadmin",
        policyVersion: inputWithoutRefs.policyVersion,
        evidencePackageId: evidenceTx.evidencePackage.id,
        reason: "Synthetic publish activation decision.",
      }),
    );

    const input: PublishActivationGateDryRunInput = {
      ...inputWithoutRefs,
      policyId: policy.id,
      evidencePackageId: evidenceTx.evidencePackage.id,
      publishActivationApproval: {
        approvalRequestId: request.id,
        approvalDecisionId: decision.id,
        scope: "publish_activation",
      },
    };
    const result = await adapter.evaluatePublishActivationGateDryRun(input);
    assert.equal(result.dryRunOnly, true);
    assert.equal(result.gateResult, "allowed");
    assert.equal(result.policyResult, "approval_required");
    assert.ok(result.gateAttemptId);
    assert.ok(result.auditEventId);
    assert.equal(result.blockedReasons.length, 0);

    const gateRows = await pool.query(`select * from public.gnr8_aaf_action_gate_attempts where id = $1::uuid`, [
      result.gateAttemptId,
    ]);
    assert.equal(gateRows.rowCount, 1);
    assert.equal(gateRows.rows[0]?.scope, "publish_activation");
    assert.equal(gateRows.rows[0]?.action_key, "publish.activation");
    assert.equal(gateRows.rows[0]?.gate_result, "allowed");
    assert.equal(gateRows.rows[0]?.outcome_audit_event_id, null);

    const auditRows = await pool.query(`select event_family, payload_json from public.gnr8_aaf_audit_events where id = $1::uuid`, [
      result.auditEventId,
    ]);
    assert.equal(auditRows.rows[0]?.event_family, "publish");
    assert.equal(auditRows.rows[0]?.payload_json?.nonExecuting, true);

    const runtimeTables = await pool.query(
      `
      select
        to_regclass('public.gnr8_runtime_active_pointers') as active_pointers,
        to_regclass('public.gnr8_runtime_site_versions') as site_versions,
        to_regclass('public.gnr8_runtime_artifacts') as runtime_artifacts,
        to_regclass('public.gnr8_runtime_domain_host_bindings') as domain_bindings,
        to_regclass('public.gnr8_content_overrides') as content_overrides
      `,
    );
    assert.equal(runtimeTables.rows[0]?.active_pointers, null);
    assert.equal(runtimeTables.rows[0]?.site_versions, null);
    assert.equal(runtimeTables.rows[0]?.runtime_artifacts, null);
    assert.equal(runtimeTables.rows[0]?.domain_bindings, null);
    assert.equal(runtimeTables.rows[0]?.content_overrides, null);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
