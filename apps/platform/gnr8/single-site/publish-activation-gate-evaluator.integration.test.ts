import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafActionGateValidatorFacade, AafPolicyEvaluatorFacade } from "../aaf/aaf-policy-gate-facade";
import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { buildPublishActivationDecisionReadModel } from "./publish-activation-decision-read-model";
import { PublishActivationDecisionReadRepository } from "./publish-activation-decision-read-repository";
import { SingleSitePublishActivationDecisionService, type PublishActivationDecisionInput } from "./publish-activation-decision-service";
import { buildPublishActivationGateHandoff, type PublishActivationGateHandoffPackage } from "./publish-activation-gate-handoff";
import { SingleSitePublishActivationGateEvaluator } from "./publish-activation-gate-evaluator";
import { SingleSitePublishActivationRequestBridge } from "./publish-activation-request-bridge";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260731100000_aaf_granted_with_limitations_status.sql",
  "20260804143000_aaf_single_site_launch_readiness_evidence_type.sql",
] as const;

const COUNTED_TABLES = [
  "gnr8_aaf_approval_requests",
  "gnr8_aaf_approval_decisions",
  "gnr8_aaf_approval_policy_evaluations",
  "gnr8_aaf_audit_events",
  "gnr8_aaf_action_gate_attempts",
  "gnr8_pasr_observations",
  "gnr8_pasr_shadow_results",
  "gnr8_ddom_readiness_snapshots",
  "gnr8_ddom_readiness_snapshot_refs",
  "gnr8_runtime_site_versions",
  "gnr8_runtime_artifacts",
  "gnr8_runtime_active_pointers",
  "gnr8_runtime_active_site_versions",
  "gnr8_publish_events",
  "gnr8_rollback_events",
  "gnr8_billing_subscriptions",
  "gnr8_domain_bindings",
] as const;

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePublishedPort(output: string): string {
  const port = output.match(/127\.0\.0\.1:(\d+)/)?.[1];
  if (!port) throw new Error(`Could not resolve disposable Postgres port from: ${output}`);
  return port;
}

async function startDisposablePostgres() {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-mvp44-publish-activation-gate-${process.pid}-${suffix}`;
  const database = `gnr8_mvp44_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp44_${suffix.replace(/-/g, "")}`;
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

    for (const migrationName of MIGRATIONS) {
      const migrationPath = path.resolve(PLATFORM_ROOT, "supabase/migrations", migrationName);
      docker(["cp", migrationPath, `${containerName}:/tmp/${migrationName}`]);
      docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${migrationName}`]);
    }

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return { containerName, connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}` };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best-effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

function ref(sourceTable: string, sourceRecordId: string, sourceWatermark = `wm:${sourceRecordId}`) {
  return { sourceSystem: "gnr8", sourceTable, sourceRecordId, sourceVersion: "v1", sourceWatermark, sourceRef: `gnr8:${sourceTable}:${sourceRecordId}` };
}

function readinessPayload(input: {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  readinessId: string;
  siteVersionId: string;
  artifactId: string;
  readinessStatus?: "ready" | "ready_with_limitations" | "blocked";
  limitations?: unknown[];
}) {
  const requiredDimensions = ["launch_approval", "content_approval", "improved_candidate", "publish_target", "domain_readiness"];
  return {
    identity: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
      launchReadinessRecordId: input.readinessId,
    },
    readinessStatus: input.readinessStatus ?? "ready",
    dimensionStatuses: Object.fromEntries(requiredDimensions.map((dimension) => [dimension, { status: "ready", required: true, freshnessStatus: "fresh", sourceWatermark: `wm:${dimension}` }])),
    requiredDimensions,
    freshness: [
      { key: "launch_readiness_record", required: true, status: "ready", freshnessStatus: "fresh", sourceWatermark: "wm:readiness", acceptedLimitation: false },
      ...requiredDimensions.map((dimension) => ({ key: dimension, required: true, status: "ready", freshnessStatus: "fresh", sourceWatermark: `wm:${dimension}`, acceptedLimitation: false })),
    ],
    acceptedLimitations: input.limitations ?? [],
    unresolvedNonP0Blockers: [],
    blockedDimensions: [],
    sourceRefs: {
      improved_candidate_site_version: [ref("gnr8_runtime_site_versions", input.siteVersionId)],
      improved_runtime_artifact: [ref("gnr8_runtime_artifacts", input.artifactId)],
      publish_target: [ref("gnr8_publish_targets", "production")],
    },
  };
}

async function insertLaunchReadinessEvidence(pool: Pool, input: {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  readinessId: string;
  siteVersionId: string;
  artifactId: string;
  suffix: string;
  readinessStatus?: "ready" | "ready_with_limitations" | "blocked";
  limitations?: unknown[];
}) {
  const payload = readinessPayload(input);
  const watermark = `wm:evidence:${input.suffix}`;
  const evidence = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_evidence_packages (
      tenant_id, client_id, site_id, site_version_id, correlation_id, idempotency_key,
      package_type, subject_type, subject_id, status, created_by_actor_type, created_by_actor_id,
      source_watermark, freshness_label, content_hash, limitations_json, privacy_label, retention_class
    )
    values ($1, $2, $3, $4, $5, $6, 'single_site_launch_readiness_evidence', 'single_site_launch_readiness_package', $7, 'created', 'system', 'mvp44-test', $8, 'fresh', $9, $10::jsonb, 'client_confidential', 'compliance_long')
    returning id::text
    `,
    [
      input.tenantId,
      input.clientId,
      input.siteId,
      input.siteVersionId,
      `corr-evidence-${input.suffix}`,
      `idem-evidence-${input.suffix}`,
      input.readinessId,
      watermark,
      `hash-evidence-${input.suffix}`,
      JSON.stringify(payload),
    ],
  );
  const evidenceId = evidence.rows[0]!.id;
  const refs = [
    ["improved_candidate_site_version", "gnr8_runtime_site_versions", input.siteVersionId],
    ["improved_runtime_artifact", "gnr8_runtime_artifacts", input.artifactId],
    ["publish_target", "gnr8_publish_targets", "production"],
  ] as const;
  for (const [role, sourceTable, sourceRecordId] of refs) {
    await pool.query(
      `
      insert into public.gnr8_aaf_evidence_package_source_refs (
        evidence_package_id, source_system, source_table, source_record_id, source_version,
        source_watermark, hash, metadata_json
      )
      values ($1::uuid, 'gnr8', $2, $3, 'v1', $4, $5, $6::jsonb)
      `,
      [evidenceId, sourceTable, sourceRecordId, `wm:${sourceRecordId}`, `hash-${role}-${input.suffix}`, JSON.stringify({ refRole: role })],
    );
  }
  await pool.query(
    `
    insert into public.gnr8_aaf_evidence_package_freshness_checks (
      evidence_package_id, policy_version, result, checked_by_actor_type, checked_by_actor_id,
      current_source_watermark, correlation_id, idempotency_key
    )
    values ($1::uuid, 'MVP-40', 'fresh', 'system', 'mvp44-test', $2, $3, $4)
    `,
    [evidenceId, watermark, `corr-fresh-${input.suffix}`, `idem-fresh-${input.suffix}`],
  );
  return { evidenceId, watermark };
}

async function createRequestFixture(pool: Pool, suffix: string, options: { readinessStatus?: "ready" | "ready_with_limitations"; limitations?: unknown[] } = {}) {
  const tenantId = `tenant-${suffix}`;
  const clientId = `client-${suffix}`;
  const siteId = `site-${suffix}`;
  const migrationId = `migration-${suffix}`;
  const readinessId = randomUUID();
  const siteVersionId = randomUUID();
  const artifactId = randomUUID();
  const evidence = await insertLaunchReadinessEvidence(pool, {
    tenantId,
    clientId,
    siteId,
    migrationId,
    readinessId,
    siteVersionId,
    artifactId,
    suffix,
    readinessStatus: options.readinessStatus ?? "ready",
    limitations: options.limitations,
  });
  const bridge = new SingleSitePublishActivationRequestBridge(new AafWriterRepository(pool));
  const bridgeInput = {
    tenantId,
    clientId,
    siteId,
    migrationId,
    launchReadinessRecordId: readinessId,
    launchReadinessEvidencePackageId: evidence.evidenceId,
    improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", siteVersionId),
    improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", artifactId),
    publishTargetRef: ref("gnr8_publish_targets", "production"),
    expectedLaunchReadinessEvidenceWatermark: evidence.watermark,
    actor: { actorType: "human" as const, actorId: "mvp44-requester", actorRole: "release_operator" },
    correlationId: `corr-request-${suffix}`,
    idempotencyKey: `idem-request-${suffix}`,
    policyVersion: `MVP-44-${suffix}`,
  };
  const request = await bridge.preparePublishActivationRequestFromLaunchReadiness(bridgeInput);
  return { ...bridgeInput, requestId: request.requestId, evidence };
}

function decisionInput(fixture: Awaited<ReturnType<typeof createRequestFixture>>, suffix: string, overrides: Partial<PublishActivationDecisionInput> = {}): PublishActivationDecisionInput {
  return {
    tenantId: fixture.tenantId,
    clientId: fixture.clientId,
    siteId: fixture.siteId,
    migrationId: fixture.migrationId,
    publishActivationRequestId: fixture.requestId,
    launchReadinessRecordId: fixture.launchReadinessRecordId,
    launchReadinessEvidencePackageId: fixture.launchReadinessEvidencePackageId,
    improvedCandidateSiteVersionRef: fixture.improvedCandidateSiteVersionRef,
    improvedRuntimeArtifactRef: fixture.improvedRuntimeArtifactRef,
    publishTargetRef: fixture.publishTargetRef,
    decisionStatus: "granted",
    decisionActor: { actorType: "human", actorId: "mvp44-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "No publish execution in MVP-44.",
    correlationId: `corr-decision-${suffix}`,
    idempotencyKey: `idem-decision-${suffix}`,
    policyVersion: fixture.policyVersion,
    expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
    ...overrides,
  };
}

async function countRows(pool: Pool, tableName: string): Promise<number | null> {
  const exists = await pool.query(`select to_regclass($1) as table_name`, [`public.${tableName}`]);
  if (!exists.rows[0]?.table_name) return null;
  const count = await pool.query(`select count(*)::int as count from public.${tableName}`);
  return Number(count.rows[0]?.count ?? 0);
}

async function counts(pool: Pool): Promise<Record<string, number | null>> {
  return Object.fromEntries(await Promise.all(COUNTED_TABLES.map(async (table) => [table, await countRows(pool, table)])));
}

async function readHandoff(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, decisionId: string): Promise<PublishActivationGateHandoffPackage> {
  const model = await buildPublishActivationDecisionReadModel(
    {
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      siteId: fixture.siteId,
      migrationId: fixture.migrationId,
      publishActivationRequestId: fixture.requestId,
      publishActivationDecisionId: decisionId,
      launchReadinessEvidencePackageId: fixture.launchReadinessEvidencePackageId,
      expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
      improvedCandidateSiteVersionRef: fixture.improvedCandidateSiteVersionRef,
      improvedRuntimeArtifactRef: fixture.improvedRuntimeArtifactRef,
      publishTargetRef: fixture.publishTargetRef,
    },
    new PublishActivationDecisionReadRepository(pool),
  );
  return buildPublishActivationGateHandoff(model);
}

test("publish activation gate evaluator persists only canonical AAF gate records from MVP-43 handoff", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const writer = new AafWriterRepository(pool);
  const evaluator = new SingleSitePublishActivationGateEvaluator(new AafActionGateValidatorFacade(writer, new AafPolicyEvaluatorFacade(writer)));
  const decisionService = new SingleSitePublishActivationDecisionService(writer);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  try {
    const fixture = await createRequestFixture(pool, suffix);
    const decision = await decisionService.recordPublishActivationDecision(decisionInput(fixture, suffix));
    const handoff = await readHandoff(pool, fixture, decision.decisionId);
    assert.equal(handoff.status, "handoff_ready");
    const before = await counts(pool);

    const result = await evaluator.evaluatePublishActivationGateFromHandoff({
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      siteId: fixture.siteId,
      migrationId: fixture.migrationId,
      handoff,
      actor: { actorType: "human", actorId: "mvp44-operator", actorRole: "release_operator" },
      correlationId: `corr-gate-${suffix}`,
      idempotencyKey: `idem-gate-${suffix}`,
      expectedHandoffWatermark: handoff.semanticHandoffWatermark,
      expectedDecisionRef: handoff.decision.ref,
      expectedEvidencePackageRef: handoff.launchReadinessEvidence.packageRef,
      expectedPublishTargetRef: "production",
      policyVersion: fixture.policyVersion,
    });

    assert.equal(result.gateEvaluated, true);
    assert.equal(result.gateResult, "allowed");
    assert.equal(result.evaluationStatus, "allowed");
    assert.ok(result.gateAttemptId);
    assert.ok(result.policyEvaluationId);
    assert.ok(result.auditEventId);
    assert.equal(result.flags.publishes, false);
    assert.equal(result.flags.enforcementApplied, false);
    assert.equal(result.flags.pasrInvoked, false);

    const gateRows = await pool.query(`select * from public.gnr8_aaf_action_gate_attempts where id = $1::uuid`, [result.gateAttemptId]);
    assert.equal(gateRows.rowCount, 1);
    assert.equal(gateRows.rows[0]?.scope, "publish_activation");
    assert.equal(gateRows.rows[0]?.action_key, "publish.activation");
    assert.equal(gateRows.rows[0]?.subject_type, "site_version");
    assert.equal(gateRows.rows[0]?.subject_id, fixture.improvedCandidateSiteVersionRef.sourceRecordId);
    assert.equal(gateRows.rows[0]?.gate_result, "allowed");
    assert.equal(gateRows.rows[0]?.approval_request_id, fixture.requestId);
    assert.equal(gateRows.rows[0]?.approval_decision_id, decision.decisionId);
    assert.equal(gateRows.rows[0]?.evidence_package_id, fixture.launchReadinessEvidencePackageId);

    const auditRows = await pool.query(`select event_family, payload_json from public.gnr8_aaf_audit_events where id = $1::uuid`, [result.auditEventId]);
    assert.equal(auditRows.rows[0]?.event_family, "publish");
    assert.equal(auditRows.rows[0]?.payload_json?.nonExecuting, true);

    const replay = await evaluator.evaluatePublishActivationGateFromHandoff({
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      siteId: fixture.siteId,
      migrationId: fixture.migrationId,
      handoff,
      actor: { actorType: "human", actorId: "mvp44-operator", actorRole: "release_operator" },
      correlationId: `corr-gate-${suffix}`,
      idempotencyKey: `idem-gate-${suffix}`,
      policyVersion: fixture.policyVersion,
    });
    assert.equal(replay.gateAttemptId, result.gateAttemptId);
    assert.equal(await countRows(pool, "gnr8_aaf_action_gate_attempts"), (before.gnr8_aaf_action_gate_attempts ?? 0) + 1);

    const drifted = { ...handoff, semanticHandoffWatermark: `${handoff.semanticHandoffWatermark}:drift` };
    await assert.rejects(
      () =>
        evaluator.evaluatePublishActivationGateFromHandoff({
          tenantId: fixture.tenantId,
          clientId: fixture.clientId,
          siteId: fixture.siteId,
          migrationId: fixture.migrationId,
          handoff: drifted,
          actor: { actorType: "human", actorId: "mvp44-operator", actorRole: "release_operator" },
          correlationId: `corr-gate-${suffix}`,
          idempotencyKey: `idem-gate-${suffix}`,
          policyVersion: fixture.policyVersion,
        }),
      /idempotency conflict|semantic payload drift/i,
    );

    const limitedFixture = await createRequestFixture(pool, `${suffix}lim`, { readinessStatus: "ready_with_limitations", limitations: ["readiness limitation"] });
    const limitedDecision = await decisionService.recordPublishActivationDecision(decisionInput(limitedFixture, `${suffix}lim`, { decisionStatus: "granted_with_limitations", limitations: ["approval limited to production target"] }));
    const limitedHandoff = await readHandoff(pool, limitedFixture, limitedDecision.decisionId);
    const limitedResult = await evaluator.evaluatePublishActivationGateFromHandoff({
      tenantId: limitedFixture.tenantId,
      clientId: limitedFixture.clientId,
      siteId: limitedFixture.siteId,
      migrationId: limitedFixture.migrationId,
      handoff: limitedHandoff,
      actor: { actorType: "human", actorId: "mvp44-operator", actorRole: "release_operator" },
      correlationId: `corr-gate-${suffix}lim`,
      idempotencyKey: `idem-gate-${suffix}lim`,
      policyVersion: limitedFixture.policyVersion,
    });
    assert.equal(limitedResult.gateResult, "allowed");
    assert.equal(limitedResult.evaluationStatus, "warning");
    assert.ok(limitedResult.warnings.includes("limitations_carried_forward"));

    const rejectedFixture = await createRequestFixture(pool, `${suffix}rej`);
    const rejected = await decisionService.recordPublishActivationDecision(decisionInput(rejectedFixture, `${suffix}rej`, { decisionStatus: "rejected", decisionReason: "Rejected." }));
    const rejectedHandoff = await readHandoff(pool, rejectedFixture, rejected.decisionId);
    const rejectedResult = await evaluator.evaluatePublishActivationGateFromHandoff({
      tenantId: rejectedFixture.tenantId,
      clientId: rejectedFixture.clientId,
      siteId: rejectedFixture.siteId,
      migrationId: rejectedFixture.migrationId,
      handoff: rejectedHandoff,
      actor: { actorType: "human", actorId: "mvp44-operator", actorRole: "release_operator" },
      correlationId: `corr-gate-${suffix}rej`,
      idempotencyKey: `idem-gate-${suffix}rej`,
      policyVersion: rejectedFixture.policyVersion,
    });
    assert.equal(rejectedResult.gateEvaluated, false);
    assert.ok(rejectedResult.blockerCodes.includes("approval_rejected"));

    const missingEvidenceResult = await evaluator.evaluatePublishActivationGateFromHandoff({
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      siteId: fixture.siteId,
      migrationId: fixture.migrationId,
      handoff: { ...handoff, launchReadinessEvidence: { ...handoff.launchReadinessEvidence, packageId: null, packageRef: null } },
      actor: { actorType: "human", actorId: "mvp44-operator", actorRole: "release_operator" },
      correlationId: `corr-gate-${suffix}missing`,
      idempotencyKey: `idem-gate-${suffix}missing`,
      policyVersion: fixture.policyVersion,
    });
    assert.equal(missingEvidenceResult.gateEvaluated, false);
    assert.ok(missingEvidenceResult.blockerCodes.includes("launch_readiness_evidence_package_missing"));

    const after = await counts(pool);
    assert.equal(after.gnr8_aaf_approval_requests, (before.gnr8_aaf_approval_requests ?? 0) + 2);
    assert.equal(after.gnr8_aaf_approval_decisions, (before.gnr8_aaf_approval_decisions ?? 0) + 2);
    assert.equal(after.gnr8_pasr_observations, null);
    assert.equal(after.gnr8_pasr_shadow_results, null);
    assert.equal(after.gnr8_ddom_readiness_snapshots, null);
    assert.equal(after.gnr8_ddom_readiness_snapshot_refs, null);
    assert.equal(after.gnr8_runtime_site_versions, null);
    assert.equal(after.gnr8_runtime_artifacts, null);
    assert.equal(after.gnr8_runtime_active_pointers, null);
    assert.equal(after.gnr8_runtime_active_site_versions, null);
    assert.equal(after.gnr8_publish_events, null);
    assert.equal(after.gnr8_rollback_events, null);
    assert.equal(after.gnr8_billing_subscriptions, null);
    assert.equal(after.gnr8_domain_bindings, null);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
