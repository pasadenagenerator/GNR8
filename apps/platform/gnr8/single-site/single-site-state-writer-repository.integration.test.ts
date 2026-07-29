import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool, type PoolClient } from "pg";

import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql",
);
const MIGRATION_BASENAME = "20260729120000_single_site_state_evidence_spine.sql";
const REQUIRED_CATEGORIES = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;
const APPEND_ONLY_TABLES = [
  "gnr8_single_site_migration_state_events",
  "gnr8_single_site_migration_refs",
  "gnr8_single_site_migration_closeouts",
  "gnr8_single_site_source_evidence_review_refs",
  "gnr8_single_site_source_evidence_review_events",
] as const;

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
  const containerName = `gnr8-single-site-writer-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_writer_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_writer_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/${MIGRATION_BASENAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${MIGRATION_BASENAME}`]);

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

function loggingPool(pool: Pool, queries: string[]): SingleSiteStateWriterPool {
  return {
    async connect() {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            return async (sql: string, values?: readonly unknown[]) => {
              queries.push(sql);
              return (target as PoolClient).query(sql, values as never);
            };
          }
          return Reflect.get(target, property, receiver);
        },
      }) as SingleSiteStateWriterTx;
    },
  };
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

function actor() {
  return { actorType: "human" as const, actorId: "integration-operator", actorRole: "migration_operator" };
}

test("single-site writer repository and services work against disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const queries: string[] = [];
  const repository = new SingleSiteStateWriterRepository(loggingPool(pool, queries));
  const transitionService = new SingleSiteStateTransitionService(repository);
  const reviewService = new SourceEvidenceReviewService(repository);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);

  try {
    const created = await repository.withTransaction((tx) =>
      repository.createMigration(tx, {
        tenantId: `tenant-${suffix}`,
        clientId: randomUUID(),
        siteId: randomUUID(),
        sourceUrl: `https://example-${suffix}.test`,
        actor: { actorType: "human", actorId: "integration-operator" },
        correlationId: `corr-create-${suffix}`,
        idempotencyKey: `idem-create-${suffix}`,
      }),
    );
    assert.equal(created.reusedExisting, false);

    const retry = await repository.withTransaction((tx) =>
      repository.createMigration(tx, {
        tenantId: `tenant-${suffix}`,
        clientId: created.row.client_id,
        siteId: created.row.site_id,
        sourceUrl: `https://example-${suffix}.test`,
        actor: { actorType: "human", actorId: "integration-operator", actorDisplayLabel: "Changed Label" },
        correlationId: `corr-create-retry-${suffix}`,
        idempotencyKey: `idem-create-${suffix}`,
      }),
    );
    assert.equal(retry.row.id, created.row.id);
    assert.equal(retry.reusedExisting, true);
    await assert.rejects(
      () =>
        repository.withTransaction((tx) =>
          repository.createMigration(tx, {
            tenantId: `tenant-${suffix}`,
            clientId: created.row.client_id,
            siteId: created.row.site_id,
            sourceUrl: `https://drift-${suffix}.test`,
            actor: { actorType: "human", actorId: "integration-operator" },
            correlationId: `corr-create-drift-${suffix}`,
            idempotencyKey: `idem-create-${suffix}`,
          }),
        ),
      SingleSiteIdempotencyConflictError,
    );

    await transitionService.transition({
      migrationId: created.row.id,
      toState: "source_capture_started",
      actor: actor(),
      correlationId: `corr-capture-start-${suffix}`,
      idempotencyKey: `idem-capture-start-${suffix}`,
    });
    await transitionService.transition({
      migrationId: created.row.id,
      toState: "source_capture_completed",
      actor: actor(),
      correlationId: `corr-capture-complete-${suffix}`,
      idempotencyKey: `idem-capture-complete-${suffix}`,
    });
    await transitionService.transition({
      migrationId: created.row.id,
      toState: "source_evidence_review_required",
      actor: actor(),
      correlationId: `corr-review-required-${suffix}`,
      idempotencyKey: `idem-review-required-${suffix}`,
    });

    const review = await reviewService.createReview({
      migrationId: created.row.id,
      tenantId: created.row.tenant_id,
      clientId: created.row.client_id,
      siteId: created.row.site_id,
      sourceUrl: created.row.source_url,
      sourceEvidencePackageKey: `package-${suffix}`,
      sourceWatermark: `watermark-${suffix}`,
      evidenceCapturedAt: "2026-07-29T12:00:00.000Z",
      completenessStatus: "complete",
      actor: actor(),
      correlationId: `corr-review-create-${suffix}`,
      idempotencyKey: `idem-review-create-${suffix}`,
    });
    await reviewService.recordRef({
      reviewId: review.review.id,
      migrationId: created.row.id,
      refRole: "source_url",
      refType: "url",
      sourceRecordId: created.row.source_url,
      actor: actor(),
      correlationId: `corr-review-ref-${suffix}`,
      idempotencyKey: `idem-review-ref-${suffix}`,
    });
    for (const category of REQUIRED_CATEGORIES) {
      await reviewService.addEvidenceItem({
        reviewId: review.review.id,
        migrationId: created.row.id,
        evidenceCategory: category,
        status: "present",
        actor: actor(),
        correlationId: `corr-item-${category}-${suffix}`,
        idempotencyKey: `idem-item-${category}-${suffix}`,
      });
    }
    const accepted = await reviewService.accept({
      reviewId: review.review.id,
      actor: actor(),
      correlationId: `corr-review-accept-${suffix}`,
      idempotencyKey: `idem-review-accept-${suffix}`,
    });
    assert.equal(accepted.review.clone_generation_allowed, true);

    const cloneStarted = await transitionService.transition({
      migrationId: created.row.id,
      toState: "clone_generation_started",
      actor: actor(),
      sourceEvidenceReviewId: review.review.id,
      correlationId: `corr-clone-start-${suffix}`,
      idempotencyKey: `idem-clone-start-${suffix}`,
      refs: [
        {
          refRole: "source_evidence_review",
          refType: "source_evidence_review",
          sourceRecordId: review.review.id,
          sourceWatermark: `watermark-${suffix}`,
          idempotencyKey: `idem-clone-ref-review-${suffix}`,
        },
        {
          refRole: "source_evidence_package",
          refType: "capture_package",
          sourceRecordId: `package-${suffix}`,
          sourceWatermark: `watermark-${suffix}`,
          idempotencyKey: `idem-clone-ref-package-${suffix}`,
        },
      ],
    });
    assert.equal(cloneStarted.toState, "clone_generation_started");

    const cloneRetry = await transitionService.transition({
      migrationId: created.row.id,
      toState: "clone_generation_started",
      actor: actor(),
      sourceEvidenceReviewId: review.review.id,
      correlationId: `corr-clone-start-retry-${suffix}`,
      idempotencyKey: `idem-clone-start-${suffix}`,
    });
    assert.equal(cloneRetry.reusedExisting, true);

    const beforeInvalid = await repository.withTransaction((tx) => repository.getMigrationById(tx, created.row.id));
    await assert.rejects(
      () =>
        transitionService.transition({
          migrationId: created.row.id,
          toState: "publish_ready",
          actor: actor(),
          correlationId: `corr-invalid-${suffix}`,
          idempotencyKey: `idem-invalid-${suffix}`,
          refs: [],
        }),
      SingleSiteTransitionError,
    );
    const afterInvalid = await repository.withTransaction((tx) => repository.getMigrationById(tx, created.row.id));
    assert.equal(afterInvalid?.current_state, beforeInvalid?.current_state);

    for (const tableName of APPEND_ONLY_TABLES) {
      const idResult = await pool.query<{ id: string }>(`select id::text from public.${tableName} limit 1`);
      if (!idResult.rows[0]) continue;
      await assertDbRejects(() => pool.query(`update public.${tableName} set id = id where id = $1::uuid`, [idResult.rows[0].id]), /append-only/i);
      await assertDbRejects(() => pool.query(`delete from public.${tableName} where id = $1::uuid`, [idResult.rows[0].id]), /append-only/i);
    }

    const policies = await pool.query<{ count: string }>("select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'gnr8_single_site_%'");
    assert.equal(policies.rows[0]?.count, "0");

    const mutatedTables = queries
      .flatMap((sql) => [...sql.matchAll(/\b(?:insert\s+into|update)\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]))
      .filter(Boolean);
    assert.ok(mutatedTables.length > 0);
    assert.deepEqual(mutatedTables.filter((tableName) => !tableName?.startsWith("gnr8_single_site_")), []);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
