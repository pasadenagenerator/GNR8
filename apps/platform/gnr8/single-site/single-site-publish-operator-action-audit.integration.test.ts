import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import {
  buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest,
  SingleSitePublishOperatorActionAuditRepository,
  SingleSitePublishOperatorActionAuditService,
  type SingleSitePublishOperatorActionAuditActor,
} from "./single-site-publish-operator-action-audit";
import type { SingleSitePublishOperatorDryRunRequest, SingleSitePublishOperatorDryRunSafeResult } from "./single-site-publish-operator-dry-run-caller";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATION_NAME = "20260806120000_single_site_publish_operator_action_audit.sql";
const EXPECTED_TABLES = [
  "gnr8_single_site_publish_operator_action_events",
  "gnr8_single_site_publish_operator_action_refs",
  "gnr8_single_site_publish_operator_actions",
] as const;
const APPEND_ONLY_TABLES = [
  "gnr8_single_site_publish_operator_action_events",
  "gnr8_single_site_publish_operator_action_refs",
] as const;

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

const actor: SingleSitePublishOperatorActionAuditActor = {
  actorType: "human",
  actorId: "audit-integration-operator",
  actorRole: "platform_superadmin",
};

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

async function startDisposablePostgres(): Promise<DisposablePostgres> {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-publish-audit-${process.pid}-${suffix}`;
  const database = `gnr8_publish_audit_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_publish_audit_${suffix.replace(/-/g, "")}`;
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

    const migrationPath = path.resolve(PLATFORM_ROOT, "supabase/migrations", MIGRATION_NAME);
    docker(["cp", migrationPath, `${containerName}:/tmp/${MIGRATION_NAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${MIGRATION_NAME}`]);

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

async function assertDbRejects(fn: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  await assert.rejects(fn, pattern);
}

function request(suffix: string): SingleSitePublishOperatorDryRunRequest {
  return {
    mode: "dry_run",
    tenantId: `tenant-${suffix}`,
    clientId: `client-${suffix}`,
    siteId: `site-${suffix}`,
    migrationId: `migration-${suffix}`,
    candidateSiteVersionRef: `gnr8:gnr8_runtime_site_versions:site-version-${suffix}`,
    runtimeArtifactRef: `gnr8:gnr8_runtime_artifacts:artifact-${suffix}`,
    expectedPublishTargetRef: "gnr8:gnr8_publish_targets:production",
    publishStage: "production",
    publishEnvironment: "production",
    expectedLaunchReadinessEvidenceRef: `aaf:evidence_package:evidence-${suffix}`,
    expectedPublishActivationRequestRef: `request-${suffix}`,
    expectedPublishActivationDecisionRef: `decision-${suffix}`,
    expectedGateAttemptResultRef: `gate-${suffix}`,
    expectedHandoffWatermark: `handoff-${suffix}`,
    expectedGateInputWatermark: `gate-input-${suffix}`,
    operatorConfirmation: {
      mode: "dry_run",
      dryRunOnly: true,
      publishes: false,
      runtimeMutation: false,
      migrationId: `migration-${suffix}`,
      candidateSiteVersionRef: `site-version-${suffix}`,
    },
    idempotencyKey: `idem-${suffix}`,
    correlationId: `corr-${suffix}`,
  };
}

function dryRunResult(req: SingleSitePublishOperatorDryRunRequest): SingleSitePublishOperatorDryRunSafeResult {
  return {
    ok: true,
    callerVersion: "mvp-54-single-site-publish-operator-dry-run-caller:v1",
    wrapperVersion: "mvp-52-single-site-publish-wrapper-orchestrator:v1",
    mode: "dry_run",
    preflightStatus: "caller_validated",
    resolverStatus: "complete",
    wrapperDryRunStatus: "dry_run_ready",
    metadataCompleteness: { status: "complete", complete: true, missingCodes: [], mismatchCodes: [], warningCodes: [] },
    blockerCodes: [],
    warnings: [],
    limitationCodes: ["dns_waiting"],
    safeRefs: { tenantId: req.tenantId, clientId: req.clientId, siteId: req.siteId, migrationId: req.migrationId, siteVersionId: `site-version-${req.migrationId}`, runtimeArtifactId: `artifact-${req.migrationId}`, publishTargetId: "production", publishStage: "production", publishEnvironment: "production", publishActivationRequestId: req.expectedPublishActivationRequestRef, publishActivationDecisionId: req.expectedPublishActivationDecisionRef, gateAttemptId: req.expectedGateAttemptResultRef, launchReadinessEvidenceId: req.expectedLaunchReadinessEvidenceRef, metadataWatermark: "metadata-watermark", handoffWatermark: req.expectedHandoffWatermark, gateInputWatermark: req.expectedGateInputWatermark, contextWatermark: "context-watermark" },
    correlationId: req.correlationId,
    idempotencyKey: req.idempotencyKey,
    dryRun: true,
    publishes: false,
    runtimeMutation: false,
    blockingEnforcementApplied: false,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    redactions: ["rawSqlErrors", "stackTraces", "providerSecrets", "billingData"],
    flags: {} as never,
  };
}

test("publish operator action audit migration applies and enforces lifecycle in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });

  try {
    const tables = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name
      `,
      [[...EXPECTED_TABLES]],
    );
    assert.deepEqual(tables.rows.map((row) => row.table_name), [...EXPECTED_TABLES]);

    const rls = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      `
      select relname, relrowsecurity
      from pg_class
      where oid in (${EXPECTED_TABLES.map((tableName) => `'public.${tableName}'::regclass`).join(", ")})
      order by relname
      `,
    );
    assert.deepEqual(
      new Map(rls.rows.map((row) => [row.relname, row.relrowsecurity])),
      new Map(EXPECTED_TABLES.map((tableName) => [tableName, true])),
    );

    const policies = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from pg_policy
      where polrelid in (${EXPECTED_TABLES.map((tableName) => `'public.${tableName}'::regclass`).join(", ")})
      `,
    );
    assert.equal(policies.rows[0]?.count, "0");

    const broadGrants = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = any($1::text[])
        and grantee in ('PUBLIC', 'anon', 'authenticated')
      `,
      [[...EXPECTED_TABLES]],
    );
    assert.equal(broadGrants.rows[0]?.count, "0");

    const triggers = await pool.query<{ tgname: string }>(
      `
      select tgname
      from pg_trigger
      where tgrelid in (${APPEND_ONLY_TABLES.map((tableName) => `'public.${tableName}'::regclass`).join(", ")})
        and not tgisinternal
      order by tgname
      `,
    );
    assert.deepEqual(
      triggers.rows.map((row) => row.tgname),
      [
        "trg_gnr8_single_site_publish_operator_action_events_append_only",
        "trg_gnr8_single_site_publish_operator_action_refs_append_only",
      ],
    );

    const service = new SingleSitePublishOperatorActionAuditService(new SingleSitePublishOperatorActionAuditRepository({
      async connect() {
        return await pool.connect();
      },
    }));
    const req = request(randomUUID().slice(0, 8));
    const input = buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest({ request: req, actor });
    const created = await service.createOrReuseAction(input);
    await service.markDryRunStarted({ actionId: created.action.id, actor, correlationId: req.correlationId, idempotencyKey: req.idempotencyKey });
    await service.markDryRunCompleted({ actionId: created.action.id, actor, correlationId: req.correlationId, idempotencyKey: req.idempotencyKey, result: dryRunResult(req) });

    const replay = await service.createOrReuseAction(input);
    assert.equal(replay.action.id, created.action.id);
    assert.equal(replay.reusedExisting, true);
    await assert.rejects(
      () => service.createOrReuseAction({ ...input, siteId: "site-drift" }),
      SingleSiteIdempotencyConflictError,
    );

    const persisted = await pool.query<{ status: string; completed_at: string | null }>(
      "select status, completed_at::text from public.gnr8_single_site_publish_operator_actions where id = $1::uuid",
      [created.action.id],
    );
    assert.equal(persisted.rows[0]?.status, "dry_run_completed");
    assert.ok(persisted.rows[0]?.completed_at);

    const ref = await pool.query<{ id: string }>("select id from public.gnr8_single_site_publish_operator_action_refs where action_id = $1::uuid limit 1", [created.action.id]);
    const event = await pool.query<{ id: string }>("select id from public.gnr8_single_site_publish_operator_action_events where action_id = $1::uuid limit 1", [created.action.id]);
    assert.ok(ref.rows[0]?.id);
    assert.ok(event.rows[0]?.id);

    await pool.query(
      "update public.gnr8_single_site_publish_operator_actions set status = 'superseded', updated_at = now() where id = $1::uuid",
      [created.action.id],
    );
    await assertDbRejects(() => pool.query("update public.gnr8_single_site_publish_operator_actions set status = 'almost_done' where id = $1::uuid", [created.action.id]), /status_ck/i);
    await assertDbRejects(() => pool.query("update public.gnr8_single_site_publish_operator_action_refs set source_ref = source_ref where id = $1::uuid", [ref.rows[0]!.id]), /append-only/i);
    await assertDbRejects(() => pool.query("delete from public.gnr8_single_site_publish_operator_action_refs where id = $1::uuid", [ref.rows[0]!.id]), /append-only/i);
    await assertDbRejects(() => pool.query("update public.gnr8_single_site_publish_operator_action_events set event_action = event_action where id = $1::uuid", [event.rows[0]!.id]), /append-only/i);
    await assertDbRejects(() => pool.query("delete from public.gnr8_single_site_publish_operator_action_events where id = $1::uuid", [event.rows[0]!.id]), /append-only/i);

    await assertDbRejects(
      () => pool.query(
        `
        insert into public.gnr8_single_site_publish_operator_actions (
          tenant_id, client_id, site_id, migration_id, mode, route_action_source,
          actor_id, actor_type, actor_role, confirmation_marker,
          candidate_site_version_ref, runtime_artifact_ref, publish_target_ref,
          publish_stage, publish_environment, launch_readiness_evidence_ref,
          publish_activation_request_ref, publish_activation_decision_ref,
          gate_attempt_result_ref, handoff_watermark, gate_input_watermark,
          idempotency_key, correlation_id, semantic_fingerprint
        )
        values (
          'tenant', 'client', 'site', 'migration', 'execute_now', 'test',
          'actor', 'human', 'platform_superadmin', 'confirm',
          'candidate', 'artifact', 'target', 'production', 'production', 'evidence',
          'request', 'decision', 'gate', 'handoff', 'gate-input',
          'idem-invalid-mode', 'corr-invalid-mode', 'fingerprint'
        )
        `,
      ),
      /mode_ck/i,
    );
    await assertDbRejects(
      () => pool.query(
        `
        insert into public.gnr8_single_site_publish_operator_action_refs (
          action_id, ref_role, source_type, source_record_id, source_ref, correlation_id, idempotency_key
        )
        values ($1::uuid, 'provider_mutation_result', 'provider_result', 'provider', 'provider', 'corr', 'idem-invalid-ref-role')
        `,
        [created.action.id],
      ),
      /role_ck/i,
    );
    await assertDbRejects(
      () => pool.query(
        `
        insert into public.gnr8_single_site_publish_operator_action_events (
          action_id, event_index, event_action, status, actor_id, actor_type, actor_role,
          correlation_id, idempotency_key
        )
        values ($1::uuid, 999, 'provider_called', 'requested', 'actor', 'human', 'platform_superadmin', 'corr', 'idem-invalid-event-action')
        `,
        [created.action.id],
      ),
      /action_ck/i,
    );
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
