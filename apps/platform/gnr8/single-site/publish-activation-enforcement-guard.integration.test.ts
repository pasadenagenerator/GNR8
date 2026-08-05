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
import {
  PublishActivationEnforcementGuardReadRepository,
  readAndEvaluatePublishActivationEnforcementGuard,
  type EvaluatePublishActivationEnforcementGuardInput,
} from "./publish-activation-enforcement-guard";
import { SingleSitePublishActivationGateEvaluator, type PublishActivationGateEvaluationResult } from "./publish-activation-gate-evaluator";
import { buildPublishActivationGateHandoff, type PublishActivationGateHandoffPackage } from "./publish-activation-gate-handoff";
import { SingleSitePublishActivationRequestBridge } from "./publish-activation-request-bridge";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260731100000_aaf_granted_with_limitations_status.sql",
  "20260804143000_aaf_single_site_launch_readiness_evidence_type.sql",
  "20260727130000_publish_target_source_truth_persistence_core.sql",
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
  const containerName = `gnr8-mvp46-publish-activation-guard-${process.pid}-${suffix}`;
  const database = `gnr8_mvp46_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp46_${suffix.replace(/-/g, "")}`;
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
      improved_candidate_site_version: [ref("gnr8_runtime_site_versions", input.siteVersionId)],
      improved_runtime_artifact: [ref("gnr8_runtime_artifacts", input.artifactId)],
      publish_target: [ref("gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production")],
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
    values ($1, $2, $3, $4, $5, $6, 'single_site_launch_readiness_evidence', 'single_site_launch_readiness_package', $7, 'created', 'system', 'mvp46-test', $8, 'fresh', $9, $10::jsonb, 'client_confidential', 'compliance_long')
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
  for (const [role, sourceTable, sourceRecordId, sourceWatermark] of [
    ["improved_candidate_site_version", "gnr8_runtime_site_versions", input.siteVersionId, `wm:${input.siteVersionId}`],
    ["improved_runtime_artifact", "gnr8_runtime_artifacts", input.artifactId, `wm:${input.artifactId}`],
    ["publish_target", "gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production"],
  ] as const) {
    await pool.query(
      `
      insert into public.gnr8_aaf_evidence_package_source_refs (
        evidence_package_id, source_system, source_table, source_record_id, source_version,
        source_watermark, hash, metadata_json
      )
      values ($1::uuid, 'gnr8', $2, $3, 'v1', $4, $5, $6::jsonb)
      `,
      [evidenceId, sourceTable, sourceRecordId, sourceWatermark, `hash-${role}-${input.suffix}`, JSON.stringify({ refRole: role })],
    );
  }
  await pool.query(
    `
    insert into public.gnr8_aaf_evidence_package_freshness_checks (
      evidence_package_id, policy_version, result, checked_by_actor_type, checked_by_actor_id,
      current_source_watermark, correlation_id, idempotency_key
    )
    values ($1::uuid, 'MVP-40', 'fresh', 'system', 'mvp46-test', $2, $3, $4)
    `,
    [evidenceId, watermark, `corr-fresh-${input.suffix}`, `idem-fresh-${input.suffix}`],
  );
  return { evidenceId, watermark };
}

async function createRequestFixture(pool: Pool, suffix: string) {
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
  });
  const bridgeInput = {
    tenantId,
    clientId,
    siteId,
    migrationId,
    launchReadinessRecordId: readinessId,
    launchReadinessEvidencePackageId: evidence.evidenceId,
    improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", siteVersionId),
    improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", artifactId),
    publishTargetRef: ref("gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production"),
    expectedLaunchReadinessEvidenceWatermark: evidence.watermark,
    actor: { actorType: "human" as const, actorId: "mvp46-requester", actorRole: "release_operator" },
    correlationId: `corr-request-${suffix}`,
    idempotencyKey: `idem-request-${suffix}`,
    policyVersion: `MVP-46-${suffix}`,
  };
  const request = await new SingleSitePublishActivationRequestBridge(new AafWriterRepository(pool)).preparePublishActivationRequestFromLaunchReadiness(bridgeInput);
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
    decisionActor: { actorType: "human", actorId: "mvp46-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "No publish execution in MVP-46.",
    correlationId: `corr-decision-${suffix}`,
    idempotencyKey: `idem-decision-${suffix}`,
    policyVersion: fixture.policyVersion,
    expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
    ...overrides,
  };
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

async function evaluateGate(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, handoff: PublishActivationGateHandoffPackage, suffix: string) {
  const writer = new AafWriterRepository(pool);
  const evaluator = new SingleSitePublishActivationGateEvaluator(new AafActionGateValidatorFacade(writer, new AafPolicyEvaluatorFacade(writer)));
  return evaluator.evaluatePublishActivationGateFromHandoff({
    tenantId: fixture.tenantId,
    clientId: fixture.clientId,
    siteId: fixture.siteId,
    migrationId: fixture.migrationId,
    handoff,
    actor: { actorType: "human", actorId: "mvp46-operator", actorRole: "release_operator" },
    correlationId: `corr-gate-${suffix}`,
    idempotencyKey: `idem-gate-${suffix}`,
    expectedHandoffWatermark: handoff.semanticHandoffWatermark,
    expectedDecisionRef: handoff.decision.ref,
    expectedEvidencePackageRef: handoff.launchReadinessEvidence.packageRef,
    expectedPublishTargetRef: "production",
    policyVersion: fixture.policyVersion,
  });
}

function guardInput(
  fixture: Awaited<ReturnType<typeof createRequestFixture>>,
  handoff: PublishActivationGateHandoffPackage,
  gate: PublishActivationGateEvaluationResult,
  overrides: Partial<EvaluatePublishActivationEnforcementGuardInput> = {},
): EvaluatePublishActivationEnforcementGuardInput {
  return {
    tenantId: fixture.tenantId,
    clientId: fixture.clientId,
    siteId: fixture.siteId,
    migrationId: fixture.migrationId,
    candidateSiteVersionRef: handoff.candidateSiteVersionRef,
    runtimeArtifactRef: handoff.runtimeArtifactRef,
    publishTargetRef: handoff.publishTargetRef,
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationDecisionRef: { id: gate.approvalDecisionId, ref: handoff.decision.ref, status: handoff.decision.status },
    gateAttemptResultRef: {
      ...gate,
      scope: "publish_activation",
      action: "publish.activation",
      subjectType: "site_version",
      subjectId: fixture.improvedCandidateSiteVersionRef.sourceRecordId,
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      siteId: fixture.siteId,
      migrationId: fixture.migrationId,
      candidateSiteVersionRef: handoff.candidateSiteVersionRef,
      runtimeArtifactRef: handoff.runtimeArtifactRef,
      publishTargetRef: handoff.publishTargetRef,
      publishStage: "production",
      publishEnvironment: "production",
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    handoffWatermark: handoff.semanticHandoffWatermark,
    gateInputWatermark: gate.semanticGateInputWatermark!,
    actor: { actorType: "human", actorId: "release-operator", actorRole: "release_operator" },
    correlationId: `corr-guard-${fixture.idempotencyKey}`,
    idempotencyKey: `idem-guard-${fixture.idempotencyKey}`,
    policy: { maxGateAgeMs: 24 * 60 * 60 * 1000, rereadAaf: true, rereadPublishTarget: true, detectConflictingNewerGate: true },
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

async function assertReadOnly<T>(pool: Pool, fn: () => Promise<T>): Promise<T> {
  const before = await counts(pool);
  const activePointerBefore = await pool.query(`select * from public.gnr8_runtime_active_pointers order by site_id`);
  const result = await fn();
  const after = await counts(pool);
  const activePointerAfter = await pool.query(`select * from public.gnr8_runtime_active_pointers order by site_id`);
  assert.deepEqual(after, before);
  assert.deepEqual(activePointerAfter.rows, activePointerBefore.rows);
  return result;
}

async function insertBlockedGate(pool: Pool, gate: PublishActivationGateEvaluationResult, result: "blocked" | "allowed" = "blocked"): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `
    insert into public.gnr8_aaf_action_gate_attempts (
      id, tenant_id, client_id, site_id, site_version_id, action_key, scope, subject_type, subject_id,
      actor_type, actor_id, actor_role, policy_evaluation_id, evidence_package_id, approval_request_id,
      approval_decision_id, pre_action_audit_event_id, gate_result, correlation_id, causation_id,
      idempotency_key, started_at, completed_at, created_at
    )
    select $1::uuid, tenant_id, client_id, site_id, site_version_id, action_key, scope, subject_type, subject_id,
      actor_type, actor_id, actor_role, policy_evaluation_id, evidence_package_id, approval_request_id,
      approval_decision_id, pre_action_audit_event_id, $2, $3, causation_id,
      $4, now(), now(), now()
    from public.gnr8_aaf_action_gate_attempts
    where id = $5::uuid
    `,
    [id, result, `corr-${result}-${id}`, `idem-${result}-${id}`, gate.gateAttemptId],
  );
  return id;
}

async function insertGateForFixture(pool: Pool, input: {
  templateGateId: string;
  tenantId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  approvalRequestId: string;
  approvalDecisionId: string;
  evidencePackageId: string;
  gateResult?: "allowed" | "blocked";
}): Promise<string> {
  const id = randomUUID();
  const gateResult = input.gateResult ?? "allowed";
  await pool.query(
    `
    insert into public.gnr8_aaf_action_gate_attempts (
      id, tenant_id, client_id, site_id, site_version_id, action_key, scope, subject_type, subject_id,
      actor_type, actor_id, actor_role, policy_evaluation_id, evidence_package_id, approval_request_id,
      approval_decision_id, pre_action_audit_event_id, gate_result, correlation_id, causation_id,
      idempotency_key, started_at, completed_at, created_at
    )
    select $1::uuid, $2, $3, $4, $5, action_key, scope, subject_type, $5,
      actor_type, actor_id, actor_role, policy_evaluation_id, $6::uuid, $7::uuid,
      $8::uuid, pre_action_audit_event_id, $9, $10, causation_id,
      $11, now(), now(), now()
    from public.gnr8_aaf_action_gate_attempts
    where id = $12::uuid
    `,
    [
      id,
      input.tenantId,
      input.clientId,
      input.siteId,
      input.siteVersionId,
      input.evidencePackageId,
      input.approvalRequestId,
      input.approvalDecisionId,
      gateResult,
      `corr-${gateResult}-${id}`,
      `idem-${gateResult}-${id}`,
      input.templateGateId,
    ],
  );
  return id;
}

async function createRuntimePointerFixture(pool: Pool) {
  await pool.query(`
    create table public.gnr8_runtime_active_pointers (
      site_id text primary key,
      active_site_version_id uuid not null,
      active_artifact_id uuid not null,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(
    `insert into public.gnr8_runtime_active_pointers (site_id, active_site_version_id, active_artifact_id) values ($1, $2::uuid, $3::uuid)`,
    ["runtime-site", randomUUID(), randomUUID()],
  );
}

test("publish activation enforcement guard rereads persisted MVP-44 gate data without mutating disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  try {
    const repository = new PublishActivationEnforcementGuardReadRepository(pool);
    await createRuntimePointerFixture(pool);
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const fixture = await createRequestFixture(pool, suffix);
    const decisionService = new SingleSitePublishActivationDecisionService(new AafWriterRepository(pool));
    const decision = await decisionService.recordPublishActivationDecision(decisionInput(fixture, suffix));
    const handoff = await readHandoff(pool, fixture, decision.decisionId);
    const gate = await evaluateGate(pool, fixture, handoff, suffix);
    assert.equal(gate.gateResult, "allowed");
    assert.ok(gate.gateAttemptId);

    const valid = await assertReadOnly(pool, () => readAndEvaluatePublishActivationEnforcementGuard({ ...guardInput(fixture, handoff, gate), repository }));
    assert.equal(valid.allowed, true, JSON.stringify({ blockers: valid.blockerCodes, warnings: valid.warnings, matchedRefs: valid.matchedRefs }));
    assert.equal(valid.mode, "pass");
    assert.equal(valid.flags.createsAafRecords, false);
    assert.equal(valid.flags.createsGateAttempt, false);
    assert.equal(valid.flags.pasrInvoked, false);
    assert.equal(valid.flags.publishes, false);

    const missingGate = await assertReadOnly(pool, () =>
      readAndEvaluatePublishActivationEnforcementGuard({
        ...guardInput(fixture, handoff, gate),
        repository,
        gateAttemptResultRef: { ...(guardInput(fixture, handoff, gate).gateAttemptResultRef as Record<string, unknown>), gateAttemptId: randomUUID() } as EvaluatePublishActivationEnforcementGuardInput["gateAttemptResultRef"],
      }),
    );
    assert.equal(missingGate.allowed, false);
    assert.ok(missingGate.blockerCodes.includes("publish_activation_gate_missing"));

    const stale = await assertReadOnly(pool, () => readAndEvaluatePublishActivationEnforcementGuard({ ...guardInput(fixture, handoff, gate), repository, policy: { maxGateAgeMs: 1 } }));
    assert.equal(stale.allowed, false);
    assert.ok(stale.blockerCodes.includes("publish_activation_gate_stale"));

    for (const [overrides, code] of [
      [{ candidateSiteVersionRef: ref("gnr8_runtime_site_versions", randomUUID()) }, "publish_activation_candidate_mismatch"],
      [{ runtimeArtifactRef: ref("gnr8_runtime_artifacts", randomUUID()) }, "publish_activation_artifact_mismatch"],
      [{ publishTargetRef: ref("gnr8_publish_targets", "staging") }, "publish_activation_target_mismatch"],
    ] as Array<[Partial<EvaluatePublishActivationEnforcementGuardInput>, string]>) {
      const guarded = await assertReadOnly(pool, () => readAndEvaluatePublishActivationEnforcementGuard({ ...guardInput(fixture, handoff, gate), repository, ...overrides }));
      assert.equal(guarded.allowed, false);
      assert.ok(guarded.blockerCodes.includes(code), `${code} missing from ${guarded.blockerCodes.join(",")}`);
    }

    const expiredFixture = await createRequestFixture(pool, `${suffix}exp`);
    const expiredDecision = await decisionService.recordPublishActivationDecision(decisionInput(expiredFixture, `${suffix}exp`, { expiresAt: "2026-01-01T00:00:00.000Z" }));
    const expiredHandoff = await readHandoff(pool, expiredFixture, expiredDecision.decisionId);
    const expiredGateId = await insertGateForFixture(pool, {
      templateGateId: gate.gateAttemptId!,
      tenantId: expiredFixture.tenantId,
      clientId: expiredFixture.clientId,
      siteId: expiredFixture.siteId,
      siteVersionId: expiredFixture.improvedCandidateSiteVersionRef.sourceRecordId,
      approvalRequestId: expiredFixture.requestId,
      approvalDecisionId: expiredDecision.decisionId,
      evidencePackageId: expiredFixture.launchReadinessEvidencePackageId,
    });
    const expiredGate = {
      ...gate,
      gateAttemptId: expiredGateId,
      approvalRequestId: expiredFixture.requestId,
      approvalDecisionId: expiredDecision.decisionId,
      evidencePackageId: expiredFixture.launchReadinessEvidencePackageId,
      semanticHandoffWatermark: expiredHandoff.semanticHandoffWatermark,
      semanticGateInputWatermark: gate.semanticGateInputWatermark,
    };
    const expired = await assertReadOnly(pool, () =>
      readAndEvaluatePublishActivationEnforcementGuard({
        ...guardInput(expiredFixture, expiredHandoff, expiredGate as PublishActivationGateEvaluationResult),
        repository,
        gateInputWatermark: gate.semanticGateInputWatermark!,
      }),
    );
    assert.equal(expired.allowed, false);
    assert.ok(expired.blockerCodes.includes("publish_activation_approval_expired"));

    await pool.query(`update public.gnr8_publish_targets set status = 'disabled', updated_at = now() where id = 'production'`);
    const disabledTarget = await assertReadOnly(pool, () => readAndEvaluatePublishActivationEnforcementGuard({ ...guardInput(fixture, handoff, gate), repository }));
    assert.equal(disabledTarget.allowed, false);
    assert.ok(disabledTarget.blockerCodes.includes("publish_activation_target_inactive"));

    const blockedGateId = await insertBlockedGate(pool, gate, "blocked");
    const blocked = await assertReadOnly(pool, () =>
      readAndEvaluatePublishActivationEnforcementGuard({
        ...guardInput(fixture, handoff, gate),
        repository,
        gateAttemptResultRef: { ...(guardInput(fixture, handoff, gate).gateAttemptResultRef as Record<string, unknown>), gateAttemptId: blockedGateId, gateResult: "blocked" } as EvaluatePublishActivationEnforcementGuardInput["gateAttemptResultRef"],
      }),
    );
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.blockerCodes.includes("publish_activation_gate_blocked"));

    const conflict = await assertReadOnly(pool, () => readAndEvaluatePublishActivationEnforcementGuard({ ...guardInput(fixture, handoff, gate), repository }));
    assert.equal(conflict.allowed, false);
    assert.ok(conflict.blockerCodes.includes("publish_activation_gate_conflict"));

    const finalCounts = await counts(pool);
    assert.equal(finalCounts.gnr8_pasr_observations, null);
    assert.equal(finalCounts.gnr8_pasr_shadow_results, null);
    assert.equal(finalCounts.gnr8_ddom_readiness_snapshots, null);
    assert.equal(finalCounts.gnr8_ddom_readiness_snapshot_refs, null);
    assert.equal(finalCounts.gnr8_publish_events, null);
    assert.equal(finalCounts.gnr8_rollback_events, null);
    assert.equal(finalCounts.gnr8_billing_subscriptions, null);
    assert.equal(finalCounts.gnr8_domain_bindings, null);
    assert.equal(finalCounts.gnr8_runtime_active_pointers, 1);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
