import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import { createMigrationJobsRouteHandlers } from "@/app/api/gnr8/admin/migration-jobs/migration-jobs-route-handlers";
import { createMigrationFactoryRuntime } from "@/gnr8/migration-factory/migration-factory-runtime";
import { MigrationFactory } from "@/gnr8/migration-factory/migration-factory";
import { InMemoryMigrationJobStore, type MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type {
  MigrationJob,
  MigrationStage,
  MigrationStageResult,
} from "@/gnr8/migration-factory/migration-job-types";
import type {
  MigrationStageExecutorContext,
  MigrationStageRunner,
} from "@/gnr8/migration-factory/migration-stage-runner";

const MISSING_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_jobs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function createClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-06-03T12:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("https://admin.test/api/gnr8/admin/migration-jobs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function context(jobId: string): { params: Promise<{ jobId: string }> } {
  return { params: Promise.resolve({ jobId }) };
}

async function getRouteDbSkipReason(): Promise<string | null> {
  try {
    const { getSuperadminPool } = await import("@/src/superadmin/db");
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_jobs limit 1`);
    return null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
      return "Skipping DB-backed migration job route test: DATABASE_URL is not configured for local integration runs.";
    }
    if (error.message.includes(MISSING_JOBS_TABLE_MESSAGE)) {
      return `Skipping DB-backed migration job route test: missing migration table public.gnr8_migration_jobs (${MISSING_JOBS_TABLE_MESSAGE}).`;
    }
    throw error;
  }
}

async function cleanupDbJob(jobId: string): Promise<void> {
  const { getSuperadminPool } = await import("@/src/superadmin/db");
  await getSuperadminPool().query(`delete from public.gnr8_migration_jobs where id = $1::text`, [jobId]);
}

function createSucceededStageResult(stage: MigrationStage, context: MigrationStageExecutorContext): MigrationStageResult {
  const startedAt = context.now();
  const endedAt = context.now();
  return {
    stage,
    status: "SUCCEEDED",
    startedAt,
    endedAt,
    diagnostics: [{ code: `${stage}_OK`, message: `${stage} completed`, level: "INFO" }],
    outputRefs: { ref: `artifact://${stage.toLowerCase()}` },
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
        diagnostics: [{ code: `${stage}_FORCED_FAILURE`, message: `${stage} forced failure`, level: "ERROR" }],
        outputRefs: {},
        error: {
          code: `${stage}_FORCED_FAILURE`,
          message: `${stage} forced failure`,
        },
      };
    }

    return createSucceededStageResult(stage, context);
  }
}

function createRuntime(input: {
  store: MigrationJobStore;
  now: () => string;
  durable?: boolean;
  stageRunner?: MigrationStageRunner;
}) {
  return {
    store: input.store,
    storeKind: input.durable === false ? "memory" as const : "postgres" as const,
    durable: input.durable ?? true,
    factory: new MigrationFactory({
      store: input.store,
      now: input.now,
      stageRunner: input.stageRunner,
    }),
  };
}

test("durable migration jobs admin route creates and reads a persisted job", async () => {
  const now = createClock();
  const store = new InMemoryMigrationJobStore({ now });
  const runtime = createRuntime({ store, now });
  const handlers = createMigrationJobsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    requireAgencyActionContext: async () => ({
      userId: "superadmin-1",
      agencyId: "agency-1",
      agencyName: null,
      role: "superadmin",
      actorMode: "admin_view",
    }),
    createMigrationFactoryRuntime: async () => runtime,
  });

  const createResponse = await handlers.POST(jsonRequest({
    jobId: "job-route-create-read",
    siteId: "site-route-1",
    sourceUrl: "https://example.com",
    agencyId: "agency-1",
  }));
  assert.equal(createResponse.status, 201);
  const createPayload = await createResponse.json() as { job: { jobId: string; status: string; store: { durable: boolean }; stageSummary: { total: number } } };
  assert.equal(createPayload.job.jobId, "job-route-create-read");
  assert.equal(createPayload.job.status, "PENDING");
  assert.equal(createPayload.job.store.durable, true);
  assert.equal(createPayload.job.stageSummary.total, 7);

  const readResponse = await handlers.GET(new Request("https://admin.test/read"), context("job-route-create-read"));
  assert.equal(readResponse.status, 200);
  const readPayload = await readResponse.json() as {
    job: {
      jobId: string;
      status: string;
      executionEvents: Array<{ type: string }>;
      activationHistory: unknown[];
    };
  };
  assert.equal(readPayload.job.jobId, "job-route-create-read");
  assert.equal(readPayload.job.status, "PENDING");
  assert.deepEqual(readPayload.job.executionEvents.map((event) => event.type), ["JOB_CREATED"]);
  assert.deepEqual(readPayload.job.activationHistory, []);
});

test("durable migration jobs admin route creates and reads through real Postgres runtime when DB is available", async (t: TestContext) => {
  const skipReason = await getRouteDbSkipReason();
  if (skipReason) {
    t.skip(skipReason);
    return;
  }

  const jobId = `migration_job_route_db_${randomUUID()}`;
  const handlers = createMigrationJobsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationFactoryRuntime,
  });

  try {
    const createResponse = await handlers.POST(jsonRequest({
      jobId,
      siteId: `site_route_db_${randomUUID()}`,
      sourceUrl: `https://route-db-${randomUUID()}.example.com`,
    }));
    assert.equal(createResponse.status, 201);
    const createPayload = await createResponse.json() as { job: { jobId: string; store: { durable: boolean; kind: string } } };
    assert.equal(createPayload.job.jobId, jobId);
    assert.deepEqual(createPayload.job.store, { durable: true, kind: "postgres" });

    const readResponse = await handlers.GET(new Request("https://admin.test/read"), context(jobId));
    assert.equal(readResponse.status, 200);
    const readPayload = await readResponse.json() as {
      job: {
        jobId: string;
        store: { durable: boolean; kind: string };
        executionEvents: Array<{ type: string }>;
      };
    };
    assert.equal(readPayload.job.jobId, jobId);
    assert.deepEqual(readPayload.job.store, { durable: true, kind: "postgres" });
    assert.equal(readPayload.job.executionEvents.some((event) => event.type === "JOB_CREATED"), true);
  } finally {
    await cleanupDbJob(jobId);
  }
});

test("durable migration jobs admin route resumes and persists updated state", async () => {
  const now = createClock();
  const store = new InMemoryMigrationJobStore({ now });
  const failingRuntime = createRuntime({ store, now, stageRunner: new StubStageRunner({ failStage: "LAYOUT_GRAPH" }) });
  const job = await failingRuntime.factory.startMigrationJob({
    jobId: "job-route-resume",
    siteId: "site-route-2",
    sourceUrl: "https://resume.example.com",
  });
  const failed = await failingRuntime.factory.runMigrationJob(job.jobId);
  assert.equal(failed.finalState, "FAILED");

  const resumeRuntime = createRuntime({ store, now, stageRunner: new StubStageRunner() });
  const handlers = createMigrationJobsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    requireAgencyActionContext: async () => ({
      userId: "superadmin-1",
      agencyId: "agency-1",
      agencyName: null,
      role: "superadmin",
      actorMode: "admin_view",
    }),
    createMigrationFactoryRuntime: async () => resumeRuntime,
  });

  const response = await handlers.RESUME(jsonRequest({ agencyId: "agency-1" }), context("job-route-resume"));
  assert.equal(response.status, 200);
  const payload = await response.json() as {
    job: {
      status: string;
      currentStage: string | null;
      executionEvents: Array<{ type: string }>;
    };
    executionReport: { finalState: string };
  };
  assert.equal(payload.executionReport.finalState, "COMPLETED");
  assert.equal(payload.job.status, "COMPLETED");
  assert.equal(payload.job.currentStage, null);
  assert.equal(payload.job.executionEvents.some((event) => event.type === "JOB_RESUMED"), true);

  const loaded = await store.getJob("job-route-resume");
  assert.equal(loaded?.overallState, "COMPLETED");
  assert.equal(loaded?.stageStates.LAYOUT_GRAPH.attempts, 2);
});

test("durable migration jobs admin route refuses non-durable runtime fallback", async () => {
  const now = createClock();
  const runtime = createRuntime({
    store: new InMemoryMigrationJobStore({ now }),
    now,
    durable: false,
  });
  const handlers = createMigrationJobsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationFactoryRuntime: async () => runtime,
  });

  const response = await handlers.POST(jsonRequest({
    jobId: "job-route-memory-rejected",
    siteId: "site-route-3",
    sourceUrl: "https://memory.example.com",
  }));
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.match(payload.error, /requires durable storage/);
});
