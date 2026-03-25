import assert from "node:assert/strict";
import test from "node:test";

import { MigrationFactory } from "@/gnr8/migration-factory/migration-factory";
import { InMemoryMigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import { canRunStage, createInitialStageStates, MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";
import { createFailedStageResult, DefaultMigrationStageRunner } from "@/gnr8/migration-factory/migration-stage-runner";

function createDeterministicClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-01-01T00:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

test("migration factory happy path completes all stages", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const factory = new MigrationFactory({ store, now });

  const job = await factory.startMigrationJob({
    jobId: "job-happy",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "COMPLETED");
  assert.deepEqual(report.completedStages, MIGRATION_STAGE_ORDER);
  assert.equal(report.failedStage, undefined);
  assert.equal(persisted?.overallState, "COMPLETED");
  for (const stage of MIGRATION_STAGE_ORDER) {
    assert.equal(persisted?.stageStates[stage].state, "SUCCEEDED");
  }
});

test("migration factory failure path stops on failed stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const stageRunner = new DefaultMigrationStageRunner({
    executors: {
      CANONICAL: async (job, stage, context) =>
        createFailedStageResult({
          stage,
          startedAt: context.now(),
          endedAt: context.now(),
          code: "CANONICAL_STAGE_FAILURE",
          message: "forced canonical failure",
          details: { jobId: job.jobId },
        }),
    },
  });
  const factory = new MigrationFactory({ store, stageRunner, now });

  const job = await factory.startMigrationJob({
    jobId: "job-fail",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "CANONICAL");
  assert.equal(persisted?.overallState, "FAILED");
  assert.equal(persisted?.stageStates.INTAKE.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.SNAPSHOT.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.LAYOUT_GRAPH.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.CANONICAL.state, "FAILED");
  assert.equal(persisted?.stageStates.QUALITY_GATE.state, "NOT_STARTED");
  assert.equal(persisted?.stageStates.ARTIFACT_BUILD.state, "NOT_STARTED");
  assert.equal(persisted?.stageStates.SHADOW_BIND_READY.state, "NOT_STARTED");
});

test("migration factory resume continues from first non-succeeded stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const failingRunner = new DefaultMigrationStageRunner({
    executors: {
      QUALITY_GATE: async (_job, stage, context) =>
        createFailedStageResult({
          stage,
          startedAt: context.now(),
          endedAt: context.now(),
          code: "QUALITY_GATE_FAILURE",
          message: "forced quality gate failure",
        }),
    },
  });

  const factoryWithFailure = new MigrationFactory({ store, stageRunner: failingRunner, now });
  const job = await factoryWithFailure.startMigrationJob({
    jobId: "job-resume",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  await factoryWithFailure.runMigrationJob(job.jobId);

  const afterFail = await store.getJob(job.jobId);
  assert.ok(afterFail);
  assert.equal(afterFail?.stageStates.CANONICAL.attempts, 1);
  assert.equal(afterFail?.stageStates.QUALITY_GATE.attempts, 1);
  assert.equal(afterFail?.stageStates.ARTIFACT_BUILD.attempts, 0);

  const factoryResume = new MigrationFactory({
    store,
    stageRunner: new DefaultMigrationStageRunner(),
    now,
  });
  const report = await factoryResume.resumeMigrationJob(job.jobId);
  const afterResume = await store.getJob(job.jobId);
  assert.ok(afterResume);

  assert.equal(report.finalState, "COMPLETED");
  assert.deepEqual(report.completedStages, MIGRATION_STAGE_ORDER);
  assert.equal(afterResume?.stageStates.CANONICAL.attempts, 1);
  assert.equal(afterResume?.stageStates.QUALITY_GATE.attempts, 2);
  assert.equal(afterResume?.stageStates.ARTIFACT_BUILD.attempts, 1);
  assert.equal(afterResume?.stageStates.SHADOW_BIND_READY.attempts, 1);
});

test("stage transition guard blocks CANONICAL before LAYOUT_GRAPH succeeds", () => {
  const stageStates = createInitialStageStates();
  stageStates.INTAKE.state = "SUCCEEDED";
  stageStates.SNAPSHOT.state = "SUCCEEDED";
  stageStates.LAYOUT_GRAPH.state = "NOT_STARTED";

  assert.equal(canRunStage("CANONICAL", stageStates), false);
});

test("deterministic execution order is fixed across runs", async () => {
  const now1 = createDeterministicClock();
  const store1 = new InMemoryMigrationJobStore({ now: now1 });
  const factory1 = new MigrationFactory({ store: store1, now: now1 });
  const job1 = await factory1.startMigrationJob({
    jobId: "job-order-1",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report1 = await factory1.runMigrationJob(job1.jobId);

  const now2 = createDeterministicClock();
  const store2 = new InMemoryMigrationJobStore({ now: now2 });
  const factory2 = new MigrationFactory({ store: store2, now: now2 });
  const job2 = await factory2.startMigrationJob({
    jobId: "job-order-2",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report2 = await factory2.runMigrationJob(job2.jobId);

  assert.deepEqual(report1.completedStages, MIGRATION_STAGE_ORDER);
  assert.deepEqual(report2.completedStages, MIGRATION_STAGE_ORDER);
  assert.deepEqual(report1.completedStages, report2.completedStages);
});

