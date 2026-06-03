import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import { InMemoryMigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import { PostgresMigrationJobStore } from "@/gnr8/migration-factory/postgres-migration-job-store";
import { MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";
import type {
  MigrationActivationExecutionResult,
  MigrationJob,
  MigrationStage,
  MigrationStageResult,
} from "@/gnr8/migration-factory/migration-job-types";
import type {
  MigrationStageExecutorContext,
  MigrationStageRunner,
} from "@/gnr8/migration-factory/migration-stage-runner";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_jobs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function createDeterministicClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-06-03T12:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

function createJobIds(): { jobId: string; siteId: string; sourceUrl: string } {
  const nonce = randomUUID();
  return {
    jobId: `migration_job_test_${nonce}`,
    siteId: `site_${nonce}`,
    sourceUrl: `https://example-${nonce}.test`,
  };
}

async function cleanup(jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) return;
  await getSuperadminPool().query(`delete from public.gnr8_migration_jobs where id = any($1::text[])`, [jobIds]);
}

function getMissingTableSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed migration job store tests: DATABASE_URL is not configured for local integration runs.";
  }
  if (!error.message.includes(MISSING_JOBS_TABLE_MESSAGE)) return null;
  return `Skipping DB-backed migration job store tests: missing migration table public.gnr8_migration_jobs (${MISSING_JOBS_TABLE_MESSAGE}).`;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getStoreDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        await getSuperadminPool().query(`select 1 from public.gnr8_migration_jobs limit 1`);
        return null;
      } catch (error) {
        const skipReason = getMissingTableSkipReason(error);
        if (skipReason) return skipReason;
        throw error;
      }
    })();
  }
  return dbSkipReasonPromise;
}

async function skipIfStoreTableMissing(t: TestContext): Promise<boolean> {
  const skipReason = await getStoreDbSkipReason();
  if (!skipReason) return false;
  t.skip(skipReason);
  return true;
}

function succeededStageResult(
  stage: MigrationStage,
  context: MigrationStageExecutorContext,
): MigrationStageResult {
  const startedAt = context.now();
  const endedAt = context.now();
  return {
    stage,
    status: "SUCCEEDED",
    startedAt,
    endedAt,
    diagnostics: [
      {
        code: `${stage}_OK`,
        message: `${stage} completed`,
        level: "INFO",
        details: { persistedBy: "postgres-store-test", stage },
      },
    ],
    outputRefs: {
      ref: `artifact://${stage.toLowerCase()}`,
      stage,
    },
  };
}

class StubStageRunner implements MigrationStageRunner {
  private readonly failStage: MigrationStage | null;

  constructor(options?: { failStage?: MigrationStage }) {
    this.failStage = options?.failStage ?? null;
  }

  async runStage(_job: MigrationJob, stage: MigrationStage, context: MigrationStageExecutorContext): Promise<MigrationStageResult> {
    if (stage === this.failStage) {
      const startedAt = context.now();
      const endedAt = context.now();
      return {
        stage,
        status: "FAILED",
        startedAt,
        endedAt,
        diagnostics: [
          {
            code: `${stage}_FORCED_FAILURE`,
            message: `${stage} forced failure`,
            level: "ERROR",
            details: { retryable: true },
          },
        ],
        outputRefs: {
          failedRef: `artifact://${stage.toLowerCase()}/failed`,
        },
        error: {
          code: `${stage}_FORCED_FAILURE`,
          message: `${stage} forced failure`,
          details: { retryable: true },
        },
      };
    }
    return succeededStageResult(stage, context);
  }
}

function activationResult(executionId: string): MigrationActivationExecutionResult {
  return {
    executionId,
    candidateRef: "candidate://shadow",
    artifactId: "artifact-1",
    siteVersionId: "site-version-1",
    activationOutcome: "ACTIVATED",
    switched: true,
    previousActivePointer: null,
    newActivePointer: { siteVersionId: "site-version-1", artifactId: "artifact-1" },
    enforcementState: "ALLOWED",
    publishStage: "shadow",
    reasons: ["test activation persisted"],
  };
}

test("postgres migration job store: create/load and stage/event payload roundtrip", async (t) => {
  if (await skipIfStoreTableMissing(t)) return;
  const ids = createJobIds();
  const now = createDeterministicClock();
  const store = new PostgresMigrationJobStore({ now });

  try {
    const created = await store.createJob(ids);
    assert.equal(created.jobId, ids.jobId);
    assert.equal(created.siteId, ids.siteId);
    assert.equal(created.sourceUrl, ids.sourceUrl);
    assert.equal(created.overallState, "PENDING");

    await store.updateStageState(ids.jobId, "SNAPSHOT", {
      state: "SUCCEEDED",
      startedAt: now(),
      endedAt: now(),
      attempts: 1,
      diagnostics: [
        {
          code: "SNAPSHOT_RENDERED",
          message: "snapshot captured",
          level: "INFO",
          details: { sourceMode: "rendered_dom", nested: { ok: true } },
        },
      ],
      outputRefs: {
        snapshotRef: "snapshot://one",
        primaryDocumentRef: "file:///snapshot/index.html",
      },
    });
    const eventTimestamp = now();
    await store.appendExecutionEvent(ids.jobId, {
      type: "STAGE_SUCCEEDED",
      timestamp: eventTimestamp,
      stage: "SNAPSHOT",
      message: "Stage SNAPSHOT succeeded",
      details: { snapshotRef: "snapshot://one" },
    });

    const reloadedStore = new PostgresMigrationJobStore({ now });
    const loaded = await reloadedStore.getJob(ids.jobId);
    assert.ok(loaded);
    assert.equal(loaded?.stageStates.SNAPSHOT.state, "SUCCEEDED");
    assert.equal(loaded?.stageStates.SNAPSHOT.attempts, 1);
    assert.deepEqual(loaded?.stageStates.SNAPSHOT.diagnostics[0]?.details, {
      sourceMode: "rendered_dom",
      nested: { ok: true },
    });
    assert.deepEqual(loaded?.stageStates.SNAPSHOT.outputRefs, {
      snapshotRef: "snapshot://one",
      primaryDocumentRef: "file:///snapshot/index.html",
    });
    assert.deepEqual(loaded?.executionEvents, [
      {
        type: "STAGE_SUCCEEDED",
        timestamp: eventTimestamp,
        stage: "SNAPSHOT",
        message: "Stage SNAPSHOT succeeded",
        details: { snapshotRef: "snapshot://one" },
      },
    ]);

    await store.updateJob(ids.jobId, { stageStates: loaded!.stageStates });
    const stageCount = await getSuperadminPool().query<{ count: string }>(
      `select count(*)::text as count from public.gnr8_migration_job_stages where job_id = $1::text`,
      [ids.jobId],
    );
    assert.equal(Number(stageCount.rows[0]?.count ?? 0), MIGRATION_STAGE_ORDER.length);
  } finally {
    await cleanup([ids.jobId]);
  }
});

test("postgres migration job store: activation history is durable and idempotent by execution id", async (t) => {
  if (await skipIfStoreTableMissing(t)) return;
  const ids = createJobIds();
  const now = createDeterministicClock();
  const store = new PostgresMigrationJobStore({ now });
  const firstResult = activationResult(`activation_${randomUUID()}`);

  try {
    await store.createJob(ids);
    await store.updateJob(ids.jobId, {
      lastActivationExecutionResult: firstResult,
      activationExecutionHistory: [firstResult],
    });
    await store.updateJob(ids.jobId, {
      lastActivationExecutionResult: firstResult,
      activationExecutionHistory: [firstResult],
    });

    const loaded = await new PostgresMigrationJobStore({ now }).getJob(ids.jobId);
    assert.deepEqual(loaded?.lastActivationExecutionResult, firstResult);
    assert.deepEqual(loaded?.activationExecutionHistory, [firstResult]);

    const historyCount = await getSuperadminPool().query<{ count: string }>(
      `select count(*)::text as count from public.gnr8_migration_job_activation_history where job_id = $1::text`,
      [ids.jobId],
    );
    assert.equal(Number(historyCount.rows[0]?.count ?? 0), 1);
  } finally {
    await cleanup([ids.jobId]);
  }
});

test("postgres migration job store: failed job resumes in a new migration factory instance", async (t) => {
  if (await skipIfStoreTableMissing(t)) return;
  const { MigrationFactory } = await import("@/gnr8/migration-factory/migration-factory");
  const ids = createJobIds();
  const now = createDeterministicClock();
  const firstStore = new PostgresMigrationJobStore({ now });

  try {
    const failingFactory = new MigrationFactory({
      store: firstStore,
      now,
      stageRunner: new StubStageRunner({ failStage: "LAYOUT_GRAPH" }),
    });
    const job = await failingFactory.startMigrationJob(ids);
    const failed = await failingFactory.runMigrationJob(job.jobId);
    assert.equal(failed.finalState, "FAILED");
    assert.equal(failed.failedStage, "LAYOUT_GRAPH");

    const failedLoadedFromNewStore = await new PostgresMigrationJobStore({ now }).getJob(ids.jobId);
    assert.equal(failedLoadedFromNewStore?.overallState, "FAILED");
    assert.equal(failedLoadedFromNewStore?.stageStates.INTAKE.attempts, 1);
    assert.equal(failedLoadedFromNewStore?.stageStates.SNAPSHOT.attempts, 1);
    assert.equal(failedLoadedFromNewStore?.stageStates.LAYOUT_GRAPH.attempts, 1);
    assert.equal(failedLoadedFromNewStore?.stageStates.CANONICAL.attempts, 0);

    const resumeFactory = new MigrationFactory({
      store: new PostgresMigrationJobStore({ now }),
      now,
      stageRunner: new StubStageRunner(),
    });
    const resumed = await resumeFactory.resumeMigrationJob(ids.jobId);
    assert.equal(resumed.finalState, "COMPLETED");
    assert.deepEqual(resumed.completedStages, MIGRATION_STAGE_ORDER);

    const afterResume = await new PostgresMigrationJobStore({ now }).getJob(ids.jobId);
    assert.equal(afterResume?.overallState, "COMPLETED");
    assert.equal(afterResume?.stageStates.SNAPSHOT.attempts, 1);
    assert.equal(afterResume?.stageStates.LAYOUT_GRAPH.attempts, 2);
    assert.equal(afterResume?.stageStates.CANONICAL.attempts, 1);
    assert.equal(afterResume?.executionEvents.some((event) => event.type === "JOB_RESUMED"), true);
  } finally {
    await cleanup([ids.jobId]);
  }
});

test("in-memory migration job store still creates reloadable jobs", async () => {
  const ids = createJobIds();
  const store = new InMemoryMigrationJobStore({ now: createDeterministicClock() });
  const created = await store.createJob(ids);
  const loaded = await store.getJob(created.jobId);
  assert.deepEqual(loaded, created);
});
