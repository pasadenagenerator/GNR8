import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { buildPublishActivationDecisionReadModel } from "./publish-activation-decision-read-model";
import { PublishActivationDecisionReadRepository } from "./publish-activation-decision-read-repository";
import { SingleSitePublishActivationDecisionService, type PublishActivationDecisionInput } from "./publish-activation-decision-service";
import { buildPublishActivationGateHandoff } from "./publish-activation-gate-handoff";
import { PublishActivationMetadataResolverReadRepository } from "./publish-activation-metadata-resolver";
import { SingleSitePublishActivationRequestBridge } from "./publish-activation-request-bridge";
import {
  publishSingleSiteApprovedCandidateShadow,
  type SingleSitePublishWrapperPublishApprovedSiteVersion,
} from "./single-site-publish-wrapper-orchestrator";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const ROUTE_PATH = path.resolve(PLATFORM_ROOT, "app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts");
const RECONCILIATION_PATH = path.resolve(PLATFORM_ROOT, "gnr8/runtime/imported-runtime-reconciliation.ts");
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
  const containerName = `gnr8-mvp52-publish-wrapper-${process.pid}-${suffix}`;
  const database = `gnr8_mvp52_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp52_${suffix.replace(/-/g, "")}`;
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
  const watermark = `wm:evidence:${input.suffix}`;
  const evidence = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_evidence_packages (
      tenant_id, client_id, site_id, site_version_id, correlation_id, idempotency_key,
      package_type, subject_type, subject_id, status, created_by_actor_type, created_by_actor_id,
      source_watermark, freshness_label, content_hash, limitations_json, privacy_label, retention_class
    )
    values ($1, $2, $3, $4, $5, $6, 'single_site_launch_readiness_evidence', 'single_site_launch_readiness_package', $7, 'created', 'system', 'mvp52-test', $8, 'fresh', $9, $10::jsonb, 'client_confidential', 'compliance_long')
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
    values ($1::uuid, 'MVP-52', 'fresh', 'system', 'mvp52-test', $2, $3, $4)
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
    actor: { actorType: "human" as const, actorId: "mvp52-requester", actorRole: "release_operator" },
    correlationId: `corr-request-${suffix}`,
    idempotencyKey: `idem-request-${suffix}`,
    policyVersion: `MVP-52-${suffix}`,
  };
  const request = await new SingleSitePublishActivationRequestBridge(new AafWriterRepository(pool)).preparePublishActivationRequestFromLaunchReadiness(bridgeInput);
  return { ...bridgeInput, requestId: request.requestId, evidence };
}

function decisionInput(fixture: Awaited<ReturnType<typeof createRequestFixture>>, suffix: string): PublishActivationDecisionInput {
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
    decisionActor: { actorType: "human", actorId: "mvp52-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "No publish execution by fixture.",
    correlationId: `corr-decision-${suffix}`,
    idempotencyKey: `idem-decision-${suffix}`,
    policyVersion: fixture.policyVersion,
    expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
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

async function insertPersistedGate(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, decisionId: string, suffix: string, gateInputWatermark: string) {
  const policy = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_policy_evaluations (
      tenant_id, client_id, site_id, site_version_id, policy_version, result, scope, action_key,
      subject_type, subject_id, actor_type, actor_id, actor_role, approval_request_id,
      approval_decision_id, evidence_package_id, blocker_codes, correlation_id, idempotency_key
    )
    values ($1, $2, $3, $4, $5, 'approval_required', 'publish_activation', 'publish.activation',
      'site_version', $4, 'human', 'mvp52-gate-fixture', 'release_operator', $6::uuid,
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
    values ($1, $2, $3, $4, 'aaf.gate.allowed', 'publish', 'notice', 'deterministic_replay',
      'human', 'mvp52-gate-fixture', 'release_operator', 'site_version', $4,
      $5, $6, $7::uuid, $8::uuid, $9::uuid, $10::uuid, $11::jsonb)
    returning id::text
    `,
    [
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.improvedCandidateSiteVersionRef.sourceRecordId,
      `corr-gate-audit-${suffix}`,
      `idem-gate-audit-${suffix}`,
      fixture.requestId,
      decisionId,
      policy.rows[0]!.id,
      fixture.launchReadinessEvidencePackageId,
      JSON.stringify({ nonExecuting: true, gateResult: "allowed", blockerCodes: [] }),
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
      $4, 'human', 'mvp52-gate-fixture', 'release_operator', $5::uuid, $6::uuid,
      $7::uuid, $8::uuid, $9::uuid, 'allowed', $10, $11, $12, now(), now(), now())
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
      `corr-gate-${suffix}`,
      `mvp52-fixture:${gateInputWatermark}`,
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

function wrapperInput(pool: Pool, fixture: Awaited<ReturnType<typeof createRequestFixture>>, gateId?: string, gateInputWatermark?: string, decisionId?: string, handoffWatermark?: string) {
  return {
    mode: "shadow_publish" as const,
    tenantId: fixture.tenantId,
    clientId: fixture.clientId,
    siteId: fixture.siteId,
    migrationId: fixture.migrationId,
    candidateSiteVersionRef: fixture.improvedCandidateSiteVersionRef,
    runtimeArtifactRef: fixture.improvedRuntimeArtifactRef,
    publishStage: "production",
    publishEnvironment: "production",
    actor: { actorType: "human" as const, actorId: "mvp52-wrapper", actorRole: "release_operator" },
    correlationId: `corr-wrapper-${fixture.idempotencyKey}`,
    idempotencyKey: `idem-wrapper-${fixture.idempotencyKey}`,
    expectedPublishTargetRef: fixture.publishTargetRef,
    expectedLaunchReadinessEvidenceRef: `aaf:evidence_package:${fixture.launchReadinessEvidencePackageId}`,
    expectedPublishActivationRequestRef: fixture.requestId,
    expectedPublishActivationDecisionRef: decisionId,
    expectedGateAttemptResultRef: gateId,
    expectedHandoffWatermark: handoffWatermark,
    expectedGateInputWatermark: gateInputWatermark,
    maxGateAgeMs: 24 * 60 * 60 * 1000,
    allowWarningsWithLimitations: true,
    repository: new PublishActivationMetadataResolverReadRepository(pool),
  };
}

test("single-site publish wrapper resolves persisted context and only fake-publishes through existing orchestrator seam", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  try {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const fixture = await createRequestFixture(pool, suffix);
    const decision = await new SingleSitePublishActivationDecisionService(new AafWriterRepository(pool)).recordPublishActivationDecision(decisionInput(fixture, suffix));
    const handoff = await readHandoff(pool, fixture, decision.decisionId);
    const gateInputWatermark = `single-site-publish-activation-gate-input:${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
    const gate = await insertPersistedGate(pool, fixture, decision.decisionId, suffix, gateInputWatermark);
    const publishInputs: Parameters<SingleSitePublishWrapperPublishApprovedSiteVersion>[0][] = [];
    const fakePublish = (async (publishInput) => {
      publishInputs.push(publishInput);
      return {
        siteId: fixture.siteId,
        siteVersionId: fixture.improvedCandidateSiteVersionRef.sourceRecordId,
        artifactId: fixture.improvedRuntimeArtifactRef.sourceRecordId,
        publishStage: "production",
        pointerSwitch: "fake_orchestrator_no_runtime_mutation",
        previousActivePointer: null,
        activationOutcome: "FAKE_ONLY",
      } as Awaited<ReturnType<SingleSitePublishWrapperPublishApprovedSiteVersion>>;
    }) as SingleSitePublishWrapperPublishApprovedSiteVersion;

    const completeInput = wrapperInput(pool, fixture, gate.gateId, gateInputWatermark, decision.decisionId, handoff.semanticHandoffWatermark);
    const dryRun = await assertReadOnly(pool, () =>
      publishSingleSiteApprovedCandidateShadow({ ...completeInput, dryRun: true }, { publishApprovedSiteVersion: fakePublish }),
    );
    assert.equal(dryRun.status, "dry_run_ready", JSON.stringify(dryRun.resolverDiagnostics));
    assert.equal(dryRun.publishes, false);
    assert.equal(dryRun.runtimeMutation, false);
    assert.equal(publishInputs.length, 0);
    assert.equal(dryRun.publishOrchestratorInput?.publishActivationMetadataHandoff?.gateAttemptResultRef?.gateAttemptId, gate.gateId);

    const executed = await assertReadOnly(pool, () =>
      publishSingleSiteApprovedCandidateShadow(completeInput, { publishApprovedSiteVersion: fakePublish }),
    );
    assert.equal(executed.status, "published_via_existing_orchestrator", JSON.stringify(executed.resolverDiagnostics));
    assert.equal(publishInputs.length, 1);
    assert.equal(publishInputs[0]!.siteVersionId, fixture.improvedCandidateSiteVersionRef.sourceRecordId);
    const publishedHandoff = publishInputs[0]!.publishActivationMetadataHandoff;
    assert.ok(publishedHandoff);
    assert.equal(publishedHandoff.publishActivationDecisionRef?.id, decision.decisionId);
    assert.equal(publishedHandoff.handoffWatermark, handoff.semanticHandoffWatermark);
    assert.equal(publishInputs[0]!.publishActivationShadowGateEnabled, false);
    assert.equal(publishInputs[0]!.publishActivationEnforcementShadowEnabled, true);

    const incompleteFixture = await createRequestFixture(pool, `${suffix}inc`);
    const incomplete = await assertReadOnly(pool, () =>
      publishSingleSiteApprovedCandidateShadow(wrapperInput(pool, incompleteFixture), { publishApprovedSiteVersion: fakePublish }),
    );
    assert.equal(incomplete.status, "preflight_blocked");
    assert.ok(incomplete.blockerCodes.includes("publish_activation_decision_missing"));
    assert.equal(publishInputs.length, 1);

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

    assert.doesNotMatch(readFileSync(ROUTE_PATH, "utf8"), /single-site-publish-wrapper-orchestrator|publishSingleSiteApprovedCandidateShadow/);
    assert.doesNotMatch(readFileSync(RECONCILIATION_PATH, "utf8"), /single-site-publish-wrapper-orchestrator|publishSingleSiteApprovedCandidateShadow/);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
