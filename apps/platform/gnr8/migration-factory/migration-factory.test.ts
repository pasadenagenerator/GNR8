import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
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

function fixtureLandingHtml(): string {
  return [
    "<!doctype html>",
    "<html>",
    "  <head><title>Factory Snapshot</title></head>",
    "  <body>",
    "    <header><nav><a href='/'>Home</a><a href='/work'>Work</a></nav></header>",
    "    <main>",
    "      <section class='hero'><h1>Deterministic Migration Factory</h1><p>Snapshot source fixture body text.</p></section>",
    "      <section class='gallery'><img src='/hero.jpg' alt='Hero'></section>",
    "    </main>",
    "    <footer><p>Footer legal copy</p></footer>",
    "  </body>",
    "</html>",
  ].join("\n");
}

function fixtureWeakLandingHtml(): string {
  return [
    "<!doctype html>",
    "<html>",
    "  <head><title>Weak Factory Snapshot</title></head>",
    "  <body>",
    "    <main>",
    "      <section><h1>Only one section</h1><p>Weak structural fixture without header/nav/footer.</p></section>",
    "    </main>",
    "  </body>",
    "</html>",
  ].join("\n");
}

function createFetchFixture(options?: {
  failAll?: boolean;
  fixtureKind?: "strong" | "weak";
}): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  const html = options?.fixtureKind === "weak" ? fixtureWeakLandingHtml() : fixtureLandingHtml();
  const imageBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return async (input): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (options?.failAll) throw new Error(`mock fetch forced failure for ${url}`);
    if (url === "https://example.com/" || url === "https://example.com") {
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url === "https://example.com/hero.jpg") {
      return new Response(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
  };
}

function createSnapshotStageRunner(input: { snapshotRootDirAbs: string; failFetch?: boolean }): DefaultMigrationStageRunner {
  return new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs: input.snapshotRootDirAbs,
      fetchImpl: createFetchFixture({ failAll: input.failFetch }),
    },
  });
}

test("migration factory happy path completes all stages", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "happy");
  const factory = new MigrationFactory({
    store,
    now,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });

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
  const snapshotRefs = persisted?.stageStates.SNAPSHOT.outputRefs ?? {};
  assert.ok(snapshotRefs.snapshotId);
  assert.ok(snapshotRefs.snapshotRef);
  assert.ok(snapshotRefs.primaryDocumentRef);
  assert.ok(snapshotRefs.snapshotRootDirAbs);
  assert.ok(Number(snapshotRefs.snapshotUrlCount) >= 1);

  const layoutRefs = persisted?.stageStates.LAYOUT_GRAPH.outputRefs ?? {};
  assert.ok(layoutRefs.layoutGraphId);
  assert.ok(layoutRefs.layoutGraphRef);
  assert.ok(layoutRefs.rootNodeId);
  assert.ok(Number(layoutRefs.nodeCount) >= 1);
  assert.ok(Number(layoutRefs.regionCount) >= 1);
  assert.ok(Number(layoutRefs.anomalyCount) >= 0);

  const layoutDiagnostics = persisted?.stageStates.LAYOUT_GRAPH.diagnostics ?? [];
  assert.equal(layoutDiagnostics[0]?.code, "LAYOUT_GRAPH_BUILT");
  assert.ok(typeof layoutDiagnostics[0]?.details?.rootNodeId === "string");

  const canonicalRefs = persisted?.stageStates.CANONICAL.outputRefs ?? {};
  assert.ok(canonicalRefs.canonicalRef);
  assert.ok(canonicalRefs.canonicalPageRef);
  assert.ok(canonicalRefs.canonicalPageId);
  assert.ok(canonicalRefs.primaryPath);
  assert.ok(Number(canonicalRefs.sectionCount) > 0);
  assert.ok(Number(canonicalRefs.pageStructuralConfidence) >= 0);
  assert.ok(canonicalRefs.migrationDiagnosticsRef);

  const canonicalDiagnostics = persisted?.stageStates.CANONICAL.diagnostics ?? [];
  assert.equal(canonicalDiagnostics[0]?.code, "CANONICAL_BUILT");
  assert.ok(typeof canonicalDiagnostics[0]?.details?.sectionCount === "number");
  assert.ok(typeof canonicalDiagnostics[0]?.details?.canonicalIntentSummary === "object");

  const qualityGateRefs = persisted?.stageStates.QUALITY_GATE.outputRefs ?? {};
  assert.ok(qualityGateRefs.qualityGateRef);
  assert.ok(qualityGateRefs.governanceSummaryRef);
  assert.ok(qualityGateRefs.pageMigrationGateState);
  assert.ok(qualityGateRefs.siteMigrationGateState);
  assert.ok(qualityGateRefs.pageRolloutPolicyState);
  assert.ok(qualityGateRefs.pageEnforcementShadowDecision);
  assert.notEqual(qualityGateRefs.pageMigrationGateState, "");

  const qualityDiagnostics = persisted?.stageStates.QUALITY_GATE.diagnostics ?? [];
  assert.equal(qualityDiagnostics[0]?.code, "QUALITY_GATE_EVALUATED");
  assert.ok(typeof qualityDiagnostics[0]?.details?.pageStructuralConfidence === "number");
  assert.ok(typeof qualityDiagnostics[0]?.details?.recommendedNextStep === "string");
});

test("migration factory failure path stops on failed stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "canonical-fail");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
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
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "resume");
  const failingRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
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
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
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
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "determinism");
  const factory1 = new MigrationFactory({
    store: store1,
    now: now1,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });
  const job1 = await factory1.startMigrationJob({
    jobId: "job-order-1",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report1 = await factory1.runMigrationJob(job1.jobId);

  const now2 = createDeterministicClock();
  const store2 = new InMemoryMigrationJobStore({ now: now2 });
  const factory2 = new MigrationFactory({
    store: store2,
    now: now2,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });
  const job2 = await factory2.startMigrationJob({
    jobId: "job-order-2",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report2 = await factory2.runMigrationJob(job2.jobId);

  assert.deepEqual(report1.completedStages, MIGRATION_STAGE_ORDER);
  assert.deepEqual(report2.completedStages, MIGRATION_STAGE_ORDER);
  assert.deepEqual(report1.completedStages, report2.completedStages);
  assert.deepEqual(
    Object.keys(report1.outputs).sort((a, b) => a.localeCompare(b)),
    Object.keys(report2.outputs).sort((a, b) => a.localeCompare(b)),
  );
  assert.ok(Object.keys(report1.outputs).includes("CANONICAL.canonicalPageRef"));
  assert.ok(Object.keys(report1.outputs).includes("QUALITY_GATE.pageMigrationGateState"));
  assert.ok(Object.keys(report1.outputs).includes("QUALITY_GATE.pageEnforcementShadowDecision"));
});

test("quality gate reflects degraded input instead of fake strong success", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "quality-weak");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture({ fixtureKind: "weak" }),
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-quality-weak",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);

  assert.equal(report.finalState, "COMPLETED");
  assert.ok(persisted);
  assert.equal(persisted?.stageStates.QUALITY_GATE.state, "SUCCEEDED");
  assert.notEqual(persisted?.stageStates.QUALITY_GATE.outputRefs.pageMigrationGateState, "SHADOW_READY");
  assert.equal(persisted?.stageStates.QUALITY_GATE.outputRefs.pageMigrationGateState, "BROKEN");

  const details = persisted?.stageStates.QUALITY_GATE.diagnostics[0]?.details ?? {};
  assert.ok(typeof details.pageStructuralConfidence === "number");
  assert.ok(typeof details.weakSectionCount === "number");
  assert.ok(typeof details.anomalyCount === "number");
});

test("snapshot stage failure marks job failed and blocks later stages", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "snapshot-fail");
  const factory = new MigrationFactory({
    store,
    now,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs, failFetch: true }),
  });

  const job = await factory.startMigrationJob({
    jobId: "job-snapshot-fail",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SNAPSHOT");
  assert.equal(persisted?.stageStates.INTAKE.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.SNAPSHOT.state, "FAILED");
  assert.equal(persisted?.stageStates.LAYOUT_GRAPH.state, "NOT_STARTED");
  assert.equal(persisted?.overallState, "FAILED");
});

test("resume from layout-graph failure does not rerun snapshot stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "layout-resume");

  const realRunner = createSnapshotStageRunner({ snapshotRootDirAbs });
  let failOnce = true;
  const failingLayoutRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      LAYOUT_GRAPH: async (job, stage, context) => {
        if (failOnce) {
          failOnce = false;
          return createFailedStageResult({
            stage,
            startedAt: context.now(),
            endedAt: context.now(),
            code: "FORCED_LAYOUT_GRAPH_FAILURE",
            message: "forced layout graph failure once",
          });
        }
        return realRunner.runStage(job, stage, context);
      },
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner: failingLayoutRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-layout-resume",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const failed = await factory.runMigrationJob(job.jobId);
  assert.equal(failed.finalState, "FAILED");
  assert.equal(failed.failedStage, "LAYOUT_GRAPH");

  const afterFail = await store.getJob(job.jobId);
  assert.ok(afterFail);
  assert.equal(afterFail?.stageStates.SNAPSHOT.state, "SUCCEEDED");
  assert.equal(afterFail?.stageStates.SNAPSHOT.attempts, 1);
  assert.equal(afterFail?.stageStates.LAYOUT_GRAPH.attempts, 1);

  const resumeFactory = new MigrationFactory({ store, now, stageRunner: realRunner });
  const resumed = await resumeFactory.resumeMigrationJob(job.jobId);
  assert.equal(resumed.finalState, "COMPLETED");

  const afterResume = await store.getJob(job.jobId);
  assert.ok(afterResume);
  assert.equal(afterResume?.stageStates.SNAPSHOT.attempts, 1);
  assert.equal(afterResume?.stageStates.LAYOUT_GRAPH.attempts, 2);
});
