import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafIdempotencyConflictError, AafWriterRepository } from "../aaf/aaf-writer-repository";
import { SingleSitePublishActivationRequestBridge } from "./publish-activation-request-bridge";
import { SingleSitePublishActivationDecisionService, type PublishActivationDecisionInput } from "./publish-activation-decision-service";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260731100000_aaf_granted_with_limitations_status.sql",
  "20260804143000_aaf_single_site_launch_readiness_evidence_type.sql",
] as const;

const BOUNDARY_TABLES = [
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
  const containerName = `gnr8-mvp42-publish-activation-decision-${process.pid}-${suffix}`;
  const database = `gnr8_mvp42_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp42_${suffix.replace(/-/g, "")}`;
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
    values ($1, $2, $3, $4, $5, $6, $7, 'single_site_launch_readiness_package', $8, 'created', 'system', 'mvp42-test', $9, 'fresh', $10, $11::jsonb, 'client_confidential', 'compliance_long')
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
    values ($1::uuid, 'MVP-40', 'fresh', 'system', 'mvp42-test', $2, $3, $4)
    `,
    [evidenceId, watermark, `corr-fresh-${input.suffix}`, `idem-fresh-${input.suffix}`],
  );
  return { evidenceId, watermark, payload };
}

async function countRows(pool: Pool, tableName: string): Promise<number | null> {
  const exists = await pool.query(`select to_regclass($1) as table_name`, [`public.${tableName}`]);
  if (!exists.rows[0]?.table_name) return null;
  const count = await pool.query(`select count(*)::int as count from public.${tableName}`);
  return Number(count.rows[0]?.count ?? 0);
}

async function counts(pool: Pool): Promise<Record<string, number | null>> {
  return Object.fromEntries(await Promise.all(BOUNDARY_TABLES.map(async (table) => [table, await countRows(pool, table)])));
}

async function createRequestFixture(pool: Pool, suffix: string, options: { readinessStatus?: "ready" | "ready_with_limitations"; limitations?: unknown[] } = {}) {
  const tenantId = `tenant-${suffix}`;
  const clientId = `client-${suffix}`;
  const siteId = `site-${suffix}`;
  const migrationId = `migration-${suffix}`;
  const readinessId = `readiness-${suffix}`;
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
    actor: { actorType: "human" as const, actorId: "mvp42-requester", actorRole: "release_operator" },
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
    decisionActor: { actorType: "human", actorId: "mvp42-approver", actorRole: "superadmin" },
    decisionReason: "Human approved publish activation.",
    decisionNotes: "No publish execution in MVP-42.",
    correlationId: `corr-decision-${suffix}`,
    idempotencyKey: `idem-decision-${suffix}`,
    policyVersion: fixture.policyVersion,
    expectedLaunchReadinessEvidenceWatermark: fixture.evidence.watermark,
    ...overrides,
  };
}

test("publish activation decision service records and validates decisions in disposable PostgreSQL without gates or runtime mutations", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const service = new SingleSitePublishActivationDecisionService(new AafWriterRepository(pool));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  try {
    const before = await counts(pool);
    const fixture = await createRequestFixture(pool, suffix, { readinessStatus: "ready_with_limitations", limitations: ["launch limitation"] });
    const input = decisionInput(fixture, suffix, { decisionStatus: "granted_with_limitations", limitations: ["approval limited to production target"] });

    const first = await service.recordPublishActivationDecision(input);
    const replay = await service.recordPublishActivationDecision(input);
    assert.equal(replay.decisionId, first.decisionId);
    assert.equal(replay.idempotency.result, "reused");
    assert.equal(first.scope, "publish_activation");
    assert.equal(first.action, "publish.activation");
    assert.deepEqual(first.limitationsCarriedForward, ["launch limitation", "approval limited to production target"]);

    const decisionRows = await pool.query(
      `select approval_request_id::text, status, evidence_package_id::text, policy_version from public.gnr8_aaf_approval_decisions where id = $1::uuid`,
      [first.decisionId],
    );
    assert.equal(decisionRows.rowCount, 1);
    assert.equal(decisionRows.rows[0]?.approval_request_id, fixture.requestId);
    assert.equal(decisionRows.rows[0]?.status, "granted_with_limitations");
    assert.equal(decisionRows.rows[0]?.evidence_package_id, fixture.launchReadinessEvidencePackageId);

    const linkRows = await pool.query(
      `select evidence_package_id::text, link_role from public.gnr8_aaf_approval_evidence_links where approval_decision_id = $1::uuid`,
      [first.decisionId],
    );
    assert.equal(linkRows.rowCount, 1);
    assert.equal(linkRows.rows[0]?.evidence_package_id, fixture.launchReadinessEvidencePackageId);
    assert.equal(linkRows.rows[0]?.link_role, "publish_activation_decision_launch_readiness_evidence");

    const valid = await service.validatePublishActivationDecision({ ...input, publishActivationDecisionId: first.decisionId });
    assert.equal(valid.valid, true, JSON.stringify(valid));
    assert.deepEqual(valid.limitationsCarriedForward, ["launch limitation", "approval limited to production target"]);

    await assert.rejects(() => service.recordPublishActivationDecision({ ...input, decisionReason: "Drifted reason." }), AafIdempotencyConflictError);

    const rejectedFixture = await createRequestFixture(pool, `${suffix}rej`);
    const rejectedInput = decisionInput(rejectedFixture, `${suffix}rej`, { decisionStatus: "rejected", decisionReason: "Human rejected publish activation." });
    const rejected = await service.recordPublishActivationDecision(rejectedInput);
    const rejectedValidation = await service.validatePublishActivationDecision({ ...rejectedInput, publishActivationDecisionId: rejected.decisionId });
    assert.equal(rejectedValidation.valid, false);
    assert.equal(rejectedValidation.status, "rejected");

    const missingFixture = await createRequestFixture(pool, `${suffix}missing`);
    await assert.rejects(
      () => service.recordPublishActivationDecision({ ...decisionInput(missingFixture, `${suffix}missing`), publishActivationRequestId: randomUUID() }),
      /publish_activation_request_missing/,
    );
    const wrongFixture = await createRequestFixture(pool, `${suffix}wrong`);
    await assert.rejects(
      () => service.recordPublishActivationDecision({ ...decisionInput(wrongFixture, `${suffix}wrong`), launchReadinessEvidencePackageId: rejectedFixture.launchReadinessEvidencePackageId }),
      /request_launch_readiness_evidence_link_missing|request_policy_evidence_mismatch|evidence_site_version_mismatch/,
    );
    await assert.rejects(
      () => service.recordPublishActivationDecision({ ...input, idempotencyKey: `idem-conflicting-${suffix}`, correlationId: `corr-conflicting-${suffix}` }),
      /conflicting_active_publish_activation_decision/,
    );

    assert.equal(await countRows(pool, "gnr8_aaf_action_gate_attempts"), 0);
    const after = await counts(pool);
    for (const table of BOUNDARY_TABLES) {
      assert.equal(after[table], before[table], table);
    }
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
