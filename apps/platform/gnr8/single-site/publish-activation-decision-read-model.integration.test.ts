import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { buildPublishActivationGateHandoff } from "./publish-activation-gate-handoff";
import { buildPublishActivationDecisionReadModel } from "./publish-activation-decision-read-model";
import { PublishActivationDecisionReadRepository } from "./publish-activation-decision-read-repository";
import { SingleSitePublishActivationDecisionService, type PublishActivationDecisionInput } from "./publish-activation-decision-service";
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
  "gnr8_aaf_approval_evidence_links",
  "gnr8_aaf_approval_policy_evaluations",
  "gnr8_aaf_audit_events",
  "gnr8_aaf_audit_event_refs",
  "gnr8_aaf_evidence_packages",
  "gnr8_aaf_evidence_package_source_refs",
  "gnr8_aaf_evidence_package_freshness_checks",
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
  const containerName = `gnr8-mvp43-publish-activation-read-${process.pid}-${suffix}`;
  const database = `gnr8_mvp43_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp43_${suffix.replace(/-/g, "")}`;
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
    explicitNonApprovalNonPublishFlags: {
      createsApprovalRequest: false,
      createsApprovalDecision: false,
      createsGateAttempt: false,
      publishes: false,
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
  packageType?: string;
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
    values ($1, $2, $3, $4, $5, $6, $7, 'single_site_launch_readiness_package', $8, 'created', 'system', 'mvp43-test', $9, 'fresh', $10, $11::jsonb, 'client_confidential', 'compliance_long')
    returning id::text
    `,
    [
      input.tenantId,
      input.clientId,
      input.siteId,
      input.siteVersionId,
      `corr-evidence-${input.suffix}`,
      `idem-evidence-${input.suffix}`,
      input.packageType ?? "single_site_launch_readiness_evidence",
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
    values ($1::uuid, 'MVP-40', 'fresh', 'system', 'mvp43-test', $2, $3, $4)
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
    actor: { actorType: "human" as const, actorId: "mvp43-requester", actorRole: "release_operator" },
    correlationId: `corr-request-${suffix}`,
    idempotencyKey: `idem-request-${suffix}`,
    policyVersion: `MVP-41-${suffix}`,
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
    decisionActor: { actorType: "human", actorId: "mvp43-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "No publish execution in MVP-43.",
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

async function createWrongEvidenceTypeFixture(pool: Pool, suffix: string) {
  const tenantId = `tenant-wrong-${suffix}`;
  const clientId = `client-wrong-${suffix}`;
  const siteId = `site-wrong-${suffix}`;
  const migrationId = `migration-wrong-${suffix}`;
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
    suffix: `wrong-${suffix}`,
    packageType: "publish_activation_evidence",
  });
  const request = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_requests (
      tenant_id, client_id, site_id, site_version_id, scope, subject_type, subject_id,
      requester_actor_type, requester_actor_id, requester_role, status, policy_version,
      reason, privacy_label, retention_class, correlation_id, idempotency_key
    )
    values ($1, $2, $3, $4, 'publish_activation', 'site_version', $4, 'human', 'mvp43-requester', 'release_operator', 'requested', $5, 'fixture wrong evidence type', 'client_confidential', 'compliance_long', $6, $7)
    returning id::text
    `,
    [tenantId, clientId, siteId, siteVersionId, `MVP-41-wrong-${suffix}`, `corr-wrong-request-${suffix}`, `idem-wrong-request-${suffix}`],
  );
  const requestId = request.rows[0]!.id;
  const policy = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_policy_evaluations (
      tenant_id, client_id, site_id, site_version_id, policy_version, result, scope, action_key,
      subject_type, subject_id, actor_type, actor_id, actor_role, approval_request_id,
      evidence_package_id, blocker_codes, privacy_label, retention_class, correlation_id, idempotency_key
    )
    values ($1, $2, $3, $4, $5, 'approval_required', 'publish_activation', 'publish.activation', 'site_version', $4, 'human', 'mvp43-requester', 'release_operator', $6::uuid, $7::uuid, '[]'::jsonb, 'client_confidential', 'compliance_long', $8, $9)
    returning id::text
    `,
    [tenantId, clientId, siteId, siteVersionId, `MVP-41-wrong-${suffix}`, requestId, evidence.evidenceId, `corr-wrong-policy-${suffix}`, `idem-wrong-policy-${suffix}`],
  );
  await pool.query(
    `
    insert into public.gnr8_aaf_approval_evidence_links (
      approval_request_id, evidence_package_id, link_role, source_note, correlation_id, idempotency_key
    )
    values ($1::uuid, $2::uuid, 'publish_activation_request_launch_readiness_evidence', 'wrong type fixture', $3, $4)
    `,
    [requestId, evidence.evidenceId, `corr-wrong-request-link-${suffix}`, `idem-wrong-request-link-${suffix}`],
  );
  const decision = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_decisions (
      approval_request_id, status, decision_actor_type, decision_actor_id, decision_actor_role,
      policy_version, evidence_package_id, policy_evaluation_id, reason, freshness_label,
      privacy_label, redaction_label, retention_class, correlation_id, idempotency_key
    )
    values ($1::uuid, 'granted', 'human', 'mvp43-approver', 'superadmin', $2, $3::uuid, $4::uuid, 'wrong type fixture', 'fresh', 'client_confidential', 'none', 'compliance_long', $5, $6)
    returning id::text
    `,
    [requestId, `MVP-41-wrong-${suffix}`, evidence.evidenceId, policy.rows[0]!.id, `corr-wrong-decision-${suffix}`, `idem-wrong-decision-${suffix}`],
  );
  const decisionId = decision.rows[0]!.id;
  await pool.query(
    `
    insert into public.gnr8_aaf_approval_evidence_links (
      approval_request_id, approval_decision_id, policy_evaluation_id, evidence_package_id, link_role,
      source_note, correlation_id, idempotency_key
    )
    values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'publish_activation_decision_launch_readiness_evidence', 'wrong type decision fixture', $5, $6)
    `,
    [requestId, decisionId, policy.rows[0]!.id, evidence.evidenceId, `corr-wrong-decision-link-${suffix}`, `idem-wrong-decision-link-${suffix}`],
  );
  return {
    tenantId,
    clientId,
    siteId,
    migrationId,
    requestId,
    decisionId,
    evidenceId: evidence.evidenceId,
    evidenceWatermark: evidence.watermark,
    siteVersionId,
    artifactId,
  };
}

test("publish activation decision read model reconstructs handoff readiness without mutating disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const repository = new PublishActivationDecisionReadRepository(pool);
  const decisionService = new SingleSitePublishActivationDecisionService(new AafWriterRepository(pool));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  try {
    const fixture = await createRequestFixture(pool, suffix, { readinessStatus: "ready_with_limitations", limitations: ["launch limitation"] });
    const decision = await decisionService.recordPublishActivationDecision(decisionInput(fixture, suffix, { decisionStatus: "granted_with_limitations", limitations: ["approval limited to production target"] }));
    const rejectedFixture = await createRequestFixture(pool, `${suffix}rej`);
    const rejected = await decisionService.recordPublishActivationDecision(decisionInput(rejectedFixture, `${suffix}rej`, { decisionStatus: "rejected", decisionReason: "Human rejected publish activation." }));
    const pendingFixture = await createRequestFixture(pool, `${suffix}pending`);
    const wrongType = await createWrongEvidenceTypeFixture(pool, suffix);

    const before = await counts(pool);

    const readyModel = await buildPublishActivationDecisionReadModel(
      {
        tenantId: fixture.tenantId,
        clientId: fixture.clientId,
        siteId: fixture.siteId,
        migrationId: fixture.migrationId,
        publishActivationRequestId: fixture.requestId,
        publishActivationDecisionId: decision.decisionId,
        launchReadinessEvidencePackageId: fixture.launchReadinessEvidencePackageId,
        expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
        improvedCandidateSiteVersionRef: fixture.improvedCandidateSiteVersionRef,
        improvedRuntimeArtifactRef: fixture.improvedRuntimeArtifactRef,
        publishTargetRef: fixture.publishTargetRef,
      },
      repository,
    );
    const handoff = buildPublishActivationGateHandoff(readyModel);
    assert.equal(readyModel.validationSummary.status, "decision_granted_with_limitations");
    assert.equal(handoff.status, "handoff_ready");
    assert.deepEqual(readyModel.decisionLimitations, ["launch limitation", "approval limited to production target"]);

    const rejectedModel = await buildPublishActivationDecisionReadModel(
      {
        tenantId: rejectedFixture.tenantId,
        clientId: rejectedFixture.clientId,
        siteId: rejectedFixture.siteId,
        migrationId: rejectedFixture.migrationId,
        publishActivationRequestId: rejectedFixture.requestId,
        publishActivationDecisionId: rejected.decisionId,
        launchReadinessEvidencePackageId: rejectedFixture.launchReadinessEvidencePackageId,
        expectedLaunchReadinessEvidenceWatermark: rejectedFixture.evidence.watermark,
        improvedCandidateSiteVersionRef: rejectedFixture.improvedCandidateSiteVersionRef,
        improvedRuntimeArtifactRef: rejectedFixture.improvedRuntimeArtifactRef,
        publishTargetRef: rejectedFixture.publishTargetRef,
      },
      repository,
    );
    assert.equal(rejectedModel.validationSummary.status, "decision_rejected");
    assert.equal(buildPublishActivationGateHandoff(rejectedModel).status, "handoff_blocked");

    const wrongModel = await buildPublishActivationDecisionReadModel(
      {
        tenantId: wrongType.tenantId,
        clientId: wrongType.clientId,
        siteId: wrongType.siteId,
        migrationId: wrongType.migrationId,
        publishActivationRequestId: wrongType.requestId,
        publishActivationDecisionId: wrongType.decisionId,
        launchReadinessEvidencePackageId: wrongType.evidenceId,
        expectedLaunchReadinessEvidenceWatermark: wrongType.evidenceWatermark,
        improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", wrongType.siteVersionId),
        improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", wrongType.artifactId),
        publishTargetRef: ref("gnr8_publish_targets", "production"),
      },
      repository,
    );
    assert.equal(wrongModel.validationSummary.status, "handoff_blocked");
    assert.ok(wrongModel.validationSummary.blockerCodes.includes("evidence_type_mismatch"));

    const pendingModel = await buildPublishActivationDecisionReadModel(
      {
        tenantId: pendingFixture.tenantId,
        clientId: pendingFixture.clientId,
        siteId: pendingFixture.siteId,
        migrationId: pendingFixture.migrationId,
        publishActivationRequestId: pendingFixture.requestId,
        launchReadinessEvidencePackageId: pendingFixture.launchReadinessEvidencePackageId,
        expectedLaunchReadinessEvidenceWatermark: pendingFixture.evidence.watermark,
        improvedCandidateSiteVersionRef: pendingFixture.improvedCandidateSiteVersionRef,
        improvedRuntimeArtifactRef: pendingFixture.improvedRuntimeArtifactRef,
        publishTargetRef: pendingFixture.publishTargetRef,
      },
      repository,
    );
    assert.equal(pendingModel.validationSummary.status, "decision_missing");
    assert.equal(pendingModel.nextAction, "await_publish_activation_decision");
    assert.equal(buildPublishActivationGateHandoff(pendingModel).status, "handoff_blocked");

    const after = await counts(pool);
    assert.deepEqual(after, before);
    assert.equal(await countRows(pool, "gnr8_aaf_action_gate_attempts"), 0);
    assert.equal(await countRows(pool, "gnr8_pasr_observations"), null);
    assert.equal(await countRows(pool, "gnr8_pasr_shadow_results"), null);
    assert.equal(await countRows(pool, "gnr8_ddom_readiness_snapshots"), null);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
