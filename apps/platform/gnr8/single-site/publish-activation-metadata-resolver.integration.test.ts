import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { buildPublishActivationDecisionReadModel } from "./publish-activation-decision-read-model";
import { PublishActivationDecisionReadRepository } from "./publish-activation-decision-read-repository";
import { SingleSitePublishActivationDecisionService, type PublishActivationDecisionInput } from "./publish-activation-decision-service";
import { evaluatePublishActivationEnforcementGuard } from "./publish-activation-enforcement-guard";
import { buildPublishActivationGateHandoff } from "./publish-activation-gate-handoff";
import { normalizePublishActivationMetadataHandoff } from "./publish-activation-metadata-handoff";
import {
  PublishActivationMetadataResolverReadRepository,
  readAndResolveSingleSitePublishActivationMetadataHandoff,
} from "./publish-activation-metadata-resolver";
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
  const containerName = `gnr8-mvp49-publish-activation-metadata-${process.pid}-${suffix}`;
  const database = `gnr8_mvp49_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp49_${suffix.replace(/-/g, "")}`;
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
  readinessStatus?: "ready" | "ready_with_limitations";
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
  readinessStatus?: "ready" | "ready_with_limitations";
  limitations?: unknown[];
}) {
  const watermark = `wm:evidence:${input.suffix}`;
  const evidence = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_evidence_packages (
      tenant_id, client_id, site_id, site_version_id, correlation_id, idempotency_key,
      package_type, subject_type, subject_id, status, created_by_actor_type, created_by_actor_id,
      source_watermark, freshness_label, content_hash, limitations_json, privacy_label, retention_class
    )
    values ($1, $2, $3, $4, $5, $6, 'single_site_launch_readiness_evidence', 'single_site_launch_readiness_package', $7, 'created', 'system', 'mvp49-test', $8, 'fresh', $9, $10::jsonb, 'client_confidential', 'compliance_long')
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
      JSON.stringify(readinessPayload(input)),
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
    values ($1::uuid, 'MVP-40', 'fresh', 'system', 'mvp49-test', $2, $3, $4)
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
    readinessStatus: options.readinessStatus,
    limitations: options.limitations,
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
    actor: { actorType: "human" as const, actorId: "mvp49-requester", actorRole: "release_operator" },
    correlationId: `corr-request-${suffix}`,
    idempotencyKey: `idem-request-${suffix}`,
    policyVersion: `MVP-49-${suffix}`,
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
    decisionActor: { actorType: "human", actorId: "mvp49-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "No publish execution in MVP-49.",
    correlationId: `corr-decision-${suffix}`,
    idempotencyKey: `idem-decision-${suffix}`,
    policyVersion: fixture.policyVersion,
    expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
    ...overrides,
  };
}

async function readHandoff(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, decisionId: string) {
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

async function insertPersistedGate(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, decisionId: string, suffix: string, gateInputWatermark: string, gateResult: "allowed" | "blocked" = "allowed") {
  const policy = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_policy_evaluations (
      tenant_id, client_id, site_id, site_version_id, policy_version, result, scope, action_key,
      subject_type, subject_id, actor_type, actor_id, actor_role, approval_request_id,
      approval_decision_id, evidence_package_id, blocker_codes, correlation_id, idempotency_key
    )
    values ($1, $2, $3, $4, $5, 'approval_required', 'publish_activation', 'publish.activation',
      'site_version', $4, 'human', 'mvp49-gate-fixture', 'release_operator', $6::uuid,
      $7::uuid, $8::uuid, '[]'::jsonb, $9, $10)
    returning id::text
    `,
    [
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.improvedCandidateSiteVersionRef.sourceRecordId,
      fixture.policyVersion,
      fixture.requestId,
      decisionId,
      fixture.launchReadinessEvidencePackageId,
      `corr-gate-policy-${suffix}`,
      `idem-gate-policy-${suffix}`,
    ],
  );
  const audit = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_audit_events (
      tenant_id, client_id, site_id, site_version_id, event_name, event_family, severity,
      replay_class, actor_type, actor_id, actor_role, subject_type, subject_id,
      correlation_id, idempotency_key, approval_request_id, approval_decision_id,
      policy_evaluation_id, evidence_package_id, payload_json
    )
    values ($1, $2, $3, $4, $5, 'publish', 'notice', 'deterministic_replay',
      'human', 'mvp49-gate-fixture', 'release_operator', 'site_version', $4,
      $6, $7, $8::uuid, $9::uuid, $10::uuid, $11::uuid, $12::jsonb)
    returning id::text
    `,
    [
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.improvedCandidateSiteVersionRef.sourceRecordId,
      `aaf.gate.${gateResult}`,
      `corr-gate-audit-${suffix}`,
      `idem-gate-audit-${suffix}`,
      fixture.requestId,
      decisionId,
      policy.rows[0]!.id,
      fixture.launchReadinessEvidencePackageId,
      JSON.stringify({ nonExecuting: true, gateResult, blockerCodes: [] }),
    ],
  );
  const gate = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_action_gate_attempts (
      tenant_id, client_id, site_id, site_version_id, action_key, scope, subject_type,
      subject_id, actor_type, actor_id, actor_role, policy_evaluation_id, evidence_package_id,
      approval_request_id, approval_decision_id, pre_action_audit_event_id, gate_result,
      correlation_id, causation_id, idempotency_key, started_at, completed_at, created_at
    )
    values ($1, $2, $3, $4, 'publish.activation', 'publish_activation', 'site_version',
      $4, 'human', 'mvp49-gate-fixture', 'release_operator', $5::uuid, $6::uuid,
      $7::uuid, $8::uuid, $9::uuid, $10, $11, $12, $13, now(), now(), now())
    returning id::text
    `,
    [
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.improvedCandidateSiteVersionRef.sourceRecordId,
      policy.rows[0]!.id,
      fixture.launchReadinessEvidencePackageId,
      fixture.requestId,
      decisionId,
      audit.rows[0]!.id,
      gateResult,
      `corr-gate-${suffix}`,
      `mvp49-fixture:${gateInputWatermark}`,
      `idem-gate-${suffix}`,
    ],
  );
  return { gateId: gate.rows[0]!.id, policyId: policy.rows[0]!.id, auditId: audit.rows[0]!.id };
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
  const result = await fn();
  const after = await counts(pool);
  assert.deepEqual(after, before);
  return result;
}

function resolverInput(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, gateId?: string, gateInputWatermark?: string) {
  return {
    tenantId: fixture.tenantId,
    clientId: fixture.clientId,
    siteId: fixture.siteId,
    migrationId: fixture.migrationId,
    candidateSiteVersionRef: fixture.improvedCandidateSiteVersionRef,
    runtimeArtifactRef: fixture.improvedRuntimeArtifactRef,
    publishStage: "production",
    publishEnvironment: "production",
    actor: { actorType: "human" as const, actorId: "mvp49-resolver", actorRole: "release_operator" },
    correlationId: `corr-resolver-${fixture.idempotencyKey}`,
    idempotencyKey: `idem-resolver-${fixture.idempotencyKey}`,
    expectedPublishTargetRef: fixture.publishTargetRef,
    expectedPublishActivationRequestRef: fixture.requestId,
    expectedGateAttemptResultRef: gateId,
    expectedGateInputWatermark: gateInputWatermark,
    maxGateAgeMs: 24 * 60 * 60 * 1000,
    allowWarningsWithLimitations: true,
    repository: new PublishActivationMetadataResolverReadRepository(pool),
  };
}

test("metadata resolver reconstructs MVP-48 metadata from persisted AAF/PTT rows without mutating disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  try {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const fixture = await createRequestFixture(pool, suffix);
    const decisionService = new SingleSitePublishActivationDecisionService(new AafWriterRepository(pool));
    const decision = await decisionService.recordPublishActivationDecision(decisionInput(fixture, suffix));
    const handoff = await readHandoff(pool, fixture, decision.decisionId);
    const gateInputWatermark = `single-site-publish-activation-gate-input:${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
    const gate = await insertPersistedGate(pool, fixture, decision.decisionId, suffix, gateInputWatermark);

    const valid = await assertReadOnly(pool, () =>
      readAndResolveSingleSitePublishActivationMetadataHandoff({
        ...resolverInput(pool, fixture, gate.gateId, gateInputWatermark),
        expectedPublishActivationDecisionRef: decision.decisionId,
        expectedHandoffWatermark: handoff.semanticHandoffWatermark,
      }),
    );
    assert.equal(valid.diagnostics.complete, true, JSON.stringify(valid.diagnostics));
    assert.ok(valid.publishActivationMetadataHandoff);
    assert.equal(valid.publishActivationMetadataHandoff.gateAttemptResultRef?.gateAttemptId, gate.gateId);
    assert.equal(valid.publishActivationMetadataHandoff.handoffWatermark, handoff.semanticHandoffWatermark);
    assert.equal(valid.publishActivationMetadataHandoff.gateInputWatermark, gateInputWatermark);
    assert.equal(normalizePublishActivationMetadataHandoff(valid.publishActivationMetadataHandoff).diagnostics.complete, true);

    const guard = evaluatePublishActivationEnforcementGuard({
      tenantId: valid.publishActivationMetadataHandoff.tenantId!,
      clientId: valid.publishActivationMetadataHandoff.clientId!,
      siteId: valid.publishActivationMetadataHandoff.siteId!,
      migrationId: valid.publishActivationMetadataHandoff.migrationId!,
      candidateSiteVersionRef: valid.publishActivationMetadataHandoff.candidateSiteVersionRef,
      runtimeArtifactRef: valid.publishActivationMetadataHandoff.runtimeArtifactRef,
      publishTargetRef: valid.publishActivationMetadataHandoff.publishTargetRef,
      publishStage: valid.publishActivationMetadataHandoff.publishStage!,
      publishEnvironment: valid.publishActivationMetadataHandoff.publishEnvironment!,
      publishActivationDecisionRef: valid.publishActivationMetadataHandoff.publishActivationDecisionRef,
      gateAttemptResultRef: valid.publishActivationMetadataHandoff.gateAttemptResultRef,
      handoffWatermark: valid.publishActivationMetadataHandoff.handoffWatermark!,
      gateInputWatermark: valid.publishActivationMetadataHandoff.gateInputWatermark!,
      actor: { actorType: "human", actorId: "mvp49-guard", actorRole: "release_operator" },
      correlationId: "corr-guard-mvp49",
      idempotencyKey: "idem-guard-mvp49",
      policy: { maxGateAgeMs: 24 * 60 * 60 * 1000, allowWarningsWithLimitations: true, rereadAaf: false, rereadPublishTarget: false, detectConflictingNewerGate: false },
    });
    assert.equal(guard.allowed, true);

    const missingDecisionFixture = await createRequestFixture(pool, `${suffix}md`);
    const missingDecision = await assertReadOnly(pool, () => readAndResolveSingleSitePublishActivationMetadataHandoff(resolverInput(pool, missingDecisionFixture)));
    assert.equal(missingDecision.diagnostics.complete, false);
    assert.ok(missingDecision.diagnostics.missingCodes.includes("publish_activation_decision_missing"));

    const rejectedFixture = await createRequestFixture(pool, `${suffix}rej`);
    const rejectedDecision = await decisionService.recordPublishActivationDecision(decisionInput(rejectedFixture, `${suffix}rej`, { decisionStatus: "rejected" }));
    const rejected = await assertReadOnly(pool, () =>
      readAndResolveSingleSitePublishActivationMetadataHandoff({
        ...resolverInput(pool, rejectedFixture),
        expectedPublishActivationDecisionRef: rejectedDecision.decisionId,
      }),
    );
    assert.equal(rejected.diagnostics.complete, false);
    assert.ok(rejected.diagnostics.blockerCodes.includes("publish_activation_approval_rejected"));

    for (const [overrides, expected] of [
      [{ candidateSiteVersionRef: ref("gnr8_runtime_site_versions", randomUUID()) }, "publish_activation_candidate_mismatch"],
      [{ runtimeArtifactRef: ref("gnr8_runtime_artifacts", randomUUID()) }, "publish_activation_artifact_mismatch"],
      [{ expectedPublishTargetRef: ref("gnr8_publish_targets", "staging") }, "publish_activation_target_mismatch"],
    ] as const) {
      const wrong = await assertReadOnly(pool, () =>
        readAndResolveSingleSitePublishActivationMetadataHandoff({
          ...resolverInput(pool, fixture, gate.gateId, gateInputWatermark),
          expectedPublishActivationDecisionRef: decision.decisionId,
          ...overrides,
        }),
      );
      assert.equal(wrong.diagnostics.complete, false);
      assert.ok([...wrong.diagnostics.mismatchCodes, ...wrong.diagnostics.blockerCodes, ...wrong.diagnostics.missingCodes].includes(expected), `${expected} missing from ${JSON.stringify(wrong.diagnostics)}`);
    }

    await pool.query(`update public.gnr8_publish_targets set status = 'disabled', updated_at = now() where id = 'production'`);
    const disabled = await assertReadOnly(pool, () =>
      readAndResolveSingleSitePublishActivationMetadataHandoff({
        ...resolverInput(pool, fixture, gate.gateId, gateInputWatermark),
        expectedPublishActivationDecisionRef: decision.decisionId,
      }),
    );
    assert.equal(disabled.diagnostics.complete, false);
    assert.ok(disabled.diagnostics.blockerCodes.includes("publish_activation_target_inactive"));
    await pool.query(`update public.gnr8_publish_targets set status = 'active', updated_at = now() where id = 'production'`);

    await insertPersistedGate(pool, fixture, decision.decisionId, `${suffix}newer`, gateInputWatermark, "blocked");
    const conflict = await assertReadOnly(pool, () =>
      readAndResolveSingleSitePublishActivationMetadataHandoff({
        ...resolverInput(pool, fixture, gate.gateId, gateInputWatermark),
        expectedPublishActivationDecisionRef: decision.decisionId,
      }),
    );
    assert.equal(conflict.diagnostics.complete, false);
    assert.ok(conflict.diagnostics.blockerCodes.includes("publish_activation_gate_conflict"));

    const finalCounts = await counts(pool);
    assert.equal(finalCounts.gnr8_pasr_observations, null);
    assert.equal(finalCounts.gnr8_pasr_shadow_results, null);
    assert.equal(finalCounts.gnr8_ddom_readiness_snapshots, null);
    assert.equal(finalCounts.gnr8_ddom_readiness_snapshot_refs, null);
    assert.equal(finalCounts.gnr8_publish_events, null);
    assert.equal(finalCounts.gnr8_rollback_events, null);
    assert.equal(finalCounts.gnr8_billing_subscriptions, null);
    assert.equal(finalCounts.gnr8_domain_bindings, null);
    assert.equal(finalCounts.gnr8_runtime_active_pointers, null);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
