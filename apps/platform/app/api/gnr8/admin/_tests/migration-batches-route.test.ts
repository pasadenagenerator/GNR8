import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import { createMigrationBatchesRouteHandlers } from "@/app/api/gnr8/admin/migration-batches/migration-batches-route-handlers";
import { createMigrationBatchSmokeTestSeedRouteHandlers } from "@/app/api/gnr8/admin/migration-batches/seed-smoke-test/seed-smoke-test-route-handlers";
import { normalizeMigrationBatchDetailPayload } from "@/app/gnr8/command-center/_lib/migration-batches-view-model";
import {
  MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID,
  MIGRATION_BATCH_SMOKE_TEST_SEED_JOB_IDS,
} from "@/gnr8/migration-factory/migration-batch-smoke-test-seed";
import { createMigrationBatchStoreRuntime } from "@/gnr8/migration-factory/migration-batch-store-runtime";
import { MigrationFactory } from "@/gnr8/migration-factory/migration-factory";
import { MigrationFactoryRuntimeConfigurationError } from "@/gnr8/migration-factory/migration-factory-runtime";
import { InMemoryMigrationJobStore, type MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import type {
  AddMigrationJobToBatchInput,
  AppendMigrationBatchEventInput,
  CreateMigrationBatchInput,
  MigrationBatch,
  MigrationBatchEvent,
  MigrationBatchJob,
  MigrationBatchJobSummary,
  MigrationBatchSummary,
  MigrationBatchWithSummary,
  UpdateMigrationBatchStatusInput,
} from "@/gnr8/migration-factory/migration-batch-types";
import type { MigrationExecutionReport } from "@/gnr8/migration-factory/migration-job-types";
import { PostgresMigrationJobStore } from "@/gnr8/migration-factory/postgres-migration-job-store";

const TEST_AGENCY_ID = "00000000-0000-4000-8000-000000000001";
const MISSING_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_jobs" does not exist`;
const MISSING_BATCHES_TABLE_MESSAGE = `relation "public.gnr8_migration_batches" does not exist`;
const MISSING_BATCH_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_batch_jobs" does not exist`;
const MISSING_BATCH_EVENTS_TABLE_MESSAGE = `relation "public.gnr8_migration_batch_events" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

type FakeJob = {
  jobId: string;
  siteId: string;
  siteVersionId: string | null;
  sourceUrl: string;
  status: MigrationBatchJobSummary["jobStatus"];
  createdAt: string;
  updatedAt: string;
  latestEventAt: string | null;
};

function createClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-06-03T12:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("https://admin.test/api/gnr8/admin/migration-batches", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function batchContext(batchId: string): { params: Promise<{ batchId: string }> } {
  return { params: Promise.resolve({ batchId }) };
}

function batchJobContext(batchId: string, jobId: string): { params: Promise<{ batchId: string; jobId: string }> } {
  return { params: Promise.resolve({ batchId, jobId }) };
}

function progressPercent(totalJobs: number, completedJobs: number): number {
  if (totalJobs <= 0) return 0;
  return Math.round((completedJobs / totalJobs) * 100);
}

class FakeMigrationBatchStore implements MigrationBatchStore {
  private readonly batches = new Map<string, MigrationBatch>();
  private readonly memberships = new Map<string, MigrationBatchJob>();
  private readonly jobs = new Map<string, FakeJob>();
  private readonly events: MigrationBatchEvent[] = [];
  private readonly now: () => string;
  private readonly externalJobStore: MigrationJobStore | null;

  constructor(now: () => string, externalJobStore?: MigrationJobStore) {
    this.now = now;
    this.externalJobStore = externalJobStore ?? null;
  }

  seedJob(job: Omit<FakeJob, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): void {
    const timestamp = this.now();
    this.jobs.set(job.jobId, {
      ...job,
      createdAt: job.createdAt ?? timestamp,
      updatedAt: job.updatedAt ?? timestamp,
    });
  }

  async createBatch(input: CreateMigrationBatchInput): Promise<MigrationBatch> {
    const timestamp = this.now();
    const batch: MigrationBatch = {
      batchId: input.batchId ?? `batch_${this.batches.size + 1}`,
      organizationId: input.organizationId ?? null,
      agencyId: input.agencyId ?? null,
      clientId: input.clientId ?? null,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "draft",
      createdBy: input.createdBy ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      metadata: input.metadata ?? {},
      diagnostics: input.diagnostics ?? {},
    };
    this.batches.set(batch.batchId, batch);
    return batch;
  }

  async getBatch(batchId: string): Promise<MigrationBatch | null> {
    return this.batches.get(batchId) ?? null;
  }

  async listBatches(): Promise<MigrationBatchWithSummary[]> {
    const batches = Array.from(this.batches.values()).sort((a, b) => {
      if (a.createdAt === b.createdAt) return a.batchId.localeCompare(b.batchId);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return Promise.all(
      batches.map(async (batch) => ({
        ...batch,
        summary: (await this.getBatchSummary(batch.batchId)) ?? this.emptySummary(batch.batchId),
      })),
    );
  }

  async addJobToBatch(input: AddMigrationJobToBatchInput): Promise<MigrationBatchJob> {
    if (!this.batches.has(input.batchId)) throw new Error(`Migration batch not found: ${input.batchId}`);
    const job = await this.getMembershipJob(input.jobId);
    if (!job) throw new Error(`Migration job not found: ${input.jobId}`);

    const key = `${input.batchId}:${input.jobId}`;
    const existing = this.memberships.get(key);
    const membership: MigrationBatchJob = {
      batchId: input.batchId,
      jobId: input.jobId,
      siteId: input.siteId ?? job.siteId,
      siteVersionId: input.siteVersionId ?? job.siteVersionId,
      sourceUrl: input.sourceUrl ?? job.sourceUrl,
      position: input.position ?? existing?.position ?? this.countBatchJobs(input.batchId),
      addedAt: existing?.addedAt ?? this.now(),
      metadata: input.metadata ?? {},
    };
    this.memberships.set(key, membership);
    return membership;
  }

  async removeJobFromBatch(batchId: string, jobId: string): Promise<boolean> {
    return this.memberships.delete(`${batchId}:${jobId}`);
  }

  async listBatchJobs(batchId: string): Promise<MigrationBatchJobSummary[]> {
    const summaries = await Promise.all(Array.from(this.memberships.values())
      .filter((membership) => membership.batchId === batchId)
      .sort((a, b) => a.position - b.position || a.addedAt.localeCompare(b.addedAt) || a.jobId.localeCompare(b.jobId))
      .map(async (membership) => {
        const job = await this.getMembershipJob(membership.jobId);
        assert.ok(job);
        return {
          ...membership,
          jobStatus: job.status,
          jobCreatedAt: job.createdAt,
          jobUpdatedAt: job.updatedAt,
          latestEventAt: job.latestEventAt,
        };
      }));
    return summaries;
  }

  async getBatchSummary(batchId: string): Promise<MigrationBatchSummary | null> {
    if (!this.batches.has(batchId)) return null;
    const jobs = await this.listBatchJobs(batchId);
    const completedJobs = jobs.filter((job) => job.jobStatus === "COMPLETED").length;
    return {
      batchId,
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((job) => job.jobStatus === "PENDING").length,
      runningJobs: jobs.filter((job) => job.jobStatus === "RUNNING").length,
      completedJobs,
      failedJobs: jobs.filter((job) => job.jobStatus === "FAILED").length,
      pausedJobs: jobs.filter((job) => job.jobStatus === "PAUSED").length,
      progressPercent: progressPercent(jobs.length, completedJobs),
      latestEventAt: jobs.map((job) => job.latestEventAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null,
    };
  }

  async updateBatchStatus(input: UpdateMigrationBatchStatusInput): Promise<MigrationBatch> {
    const current = this.batches.get(input.batchId);
    if (!current) throw new Error(`Migration batch not found: ${input.batchId}`);
    const timestamp = this.now();
    const next: MigrationBatch = {
      ...current,
      status: input.status,
      updatedAt: timestamp,
      startedAt: input.status === "running" ? current.startedAt ?? timestamp : current.startedAt,
      completedAt: input.status === "completed" ? timestamp : input.status === "running" || input.status === "paused" || input.status === "failed" || input.status === "partially_failed" ? null : current.completedAt,
      failedAt: input.status === "failed" || input.status === "partially_failed" ? timestamp : input.status === "running" || input.status === "paused" || input.status === "completed" ? null : current.failedAt,
      diagnostics: input.diagnostics ?? current.diagnostics,
    };
    this.batches.set(input.batchId, next);
    return next;
  }

  async appendBatchEvent(input: AppendMigrationBatchEventInput): Promise<MigrationBatchEvent> {
    if (!this.batches.has(input.batchId)) throw new Error(`Migration batch not found: ${input.batchId}`);
    const event: MigrationBatchEvent = {
      id: `event_${this.events.length + 1}`,
      batchId: input.batchId,
      eventType: input.eventType,
      message: input.message,
      jobId: input.jobId ?? null,
      details: input.details ?? {},
      createdAt: this.now(),
    };
    this.events.push(event);
    return event;
  }

  async listBatchEvents(batchId: string): Promise<MigrationBatchEvent[]> {
    return this.events.filter((event) => event.batchId === batchId);
  }

  setJobStatus(jobId: string, status: FakeJob["status"]): void {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Migration job not found: ${jobId}`);
    this.jobs.set(jobId, {
      ...job,
      status,
      updatedAt: this.now(),
      latestEventAt: this.now(),
    });
  }

  private countBatchJobs(batchId: string): number {
    return Array.from(this.memberships.values()).filter((membership) => membership.batchId === batchId).length;
  }

  private async getMembershipJob(jobId: string): Promise<FakeJob | null> {
    const fake = this.jobs.get(jobId);
    if (fake) return fake;
    const external = await this.externalJobStore?.getJob(jobId);
    if (!external) return null;
    const latestEventAt = external.executionEvents
      .map((event) => event.timestamp)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
    return {
      jobId: external.jobId,
      siteId: external.siteId,
      siteVersionId: null,
      sourceUrl: external.sourceUrl,
      status: external.overallState,
      createdAt: external.createdAt,
      updatedAt: external.updatedAt,
      latestEventAt,
    };
  }

  private emptySummary(batchId: string): MigrationBatchSummary {
    return {
      batchId,
      totalJobs: 0,
      pendingJobs: 0,
      runningJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      pausedJobs: 0,
      progressPercent: 0,
      latestEventAt: null,
    };
  }
}

function completedReport(jobId: string): MigrationExecutionReport {
  const timestamp = "2026-06-03T12:00:00.000Z";
  return {
    jobId,
    finalState: "COMPLETED",
    completedStages: [],
    stageDiagnostics: [],
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0,
    outputs: {},
  };
}

async function getRouteDbSkipReason(): Promise<string | null> {
  try {
    const { getSuperadminPool } = await import("@/src/superadmin/db");
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_jobs limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batches limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batch_jobs limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batch_events limit 1`);
    return null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
      return "Skipping DB-backed migration batch route test: DATABASE_URL is not configured for local integration runs.";
    }
    if (
      error.message.includes(MISSING_JOBS_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCHES_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCH_JOBS_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCH_EVENTS_TABLE_MESSAGE)
    ) {
      return "Skipping DB-backed migration batch route test: migration batch/job tables are not available.";
    }
    throw error;
  }
}

async function cleanupDb(input: { batchId: string; jobId: string }): Promise<void> {
  const { getSuperadminPool } = await import("@/src/superadmin/db");
  await getSuperadminPool().query(`delete from public.gnr8_migration_batches where id = $1::text`, [input.batchId]);
  await getSuperadminPool().query(`delete from public.gnr8_migration_jobs where id = $1::text`, [input.jobId]);
}

test("durable migration batches admin routes create/read/list batches and attach jobs", async () => {
  const now = createClock();
  const store = new FakeMigrationBatchStore(now);
  store.seedJob({
    jobId: "job-route-pending",
    siteId: "site-route-pending",
    siteVersionId: null,
    sourceUrl: "https://pending.example.com",
    status: "PENDING",
    latestEventAt: null,
  });
  store.seedJob({
    jobId: "job-route-completed",
    siteId: "site-route-completed",
    siteVersionId: null,
    sourceUrl: "https://completed.example.com",
    status: "COMPLETED",
    latestEventAt: "2026-06-03T12:30:00.000Z",
  });

  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    requireAgencyActionContext: async () => ({
      userId: "superadmin-1",
      agencyId: TEST_AGENCY_ID,
      role: "superadmin",
      actorMode: "admin_view",
    }),
    createMigrationBatchStoreRuntime: async () => ({
      store,
      durable: true,
      storeKind: "postgres",
    }),
  });

  const createResponse = await handlers.POST(jsonRequest({
    batchId: "batch-route-create-read",
    agencyId: TEST_AGENCY_ID,
    name: "Route test batch",
    description: "Batch route coverage",
    metadata: { origin: "route-test" },
  }));
  assert.equal(createResponse.status, 201);
  const createPayload = await createResponse.json() as { batch: { batchId: string; summary: { totalJobs: number }; store: { durable: boolean; kind: string } } };
  assert.equal(createPayload.batch.batchId, "batch-route-create-read");
  assert.deepEqual(createPayload.batch.store, { durable: true, kind: "postgres" });
  assert.equal(createPayload.batch.summary.totalJobs, 0);

  const attachPending = await handlers.ADD_JOB(jsonRequest({ jobId: "job-route-pending" }), batchContext("batch-route-create-read"));
  assert.equal(attachPending.status, 201);
  const attachCompleted = await handlers.ADD_JOB(jsonRequest({ jobId: "job-route-completed" }), batchContext("batch-route-create-read"));
  assert.equal(attachCompleted.status, 201);
  const duplicate = await handlers.ADD_JOB(jsonRequest({ jobId: "job-route-completed" }), batchContext("batch-route-create-read"));
  assert.equal(duplicate.status, 201);

  const readResponse = await handlers.GET(new Request("https://admin.test/read"), batchContext("batch-route-create-read"));
  assert.equal(readResponse.status, 200);
  const readPayload = await readResponse.json() as {
    batch: {
      batchId: string;
      jobCounts: {
        totalJobs: number;
        pendingJobs: number;
        completedJobs: number;
        progressPercent: number;
        latestEventAt: string | null;
      };
      jobSummaries: Array<{ jobId: string; jobStatus: string }>;
    };
  };
  assert.equal(readPayload.batch.batchId, "batch-route-create-read");
  assert.deepEqual(readPayload.batch.jobSummaries.map((job) => [job.jobId, job.jobStatus]), [
    ["job-route-pending", "PENDING"],
    ["job-route-completed", "COMPLETED"],
  ]);
  assert.equal(readPayload.batch.jobCounts.totalJobs, 2);
  assert.equal(readPayload.batch.jobCounts.pendingJobs, 1);
  assert.equal(readPayload.batch.jobCounts.completedJobs, 1);
  assert.equal(readPayload.batch.jobCounts.progressPercent, 50);
  assert.equal(readPayload.batch.jobCounts.latestEventAt, "2026-06-03T12:30:00.000Z");

  const listResponse = await handlers.LIST(new Request("https://admin.test/list"));
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json() as { batches: Array<{ batchId: string; summary: { totalJobs: number; progressPercent: number } }> };
  assert.deepEqual(listPayload.batches.map((batch) => [batch.batchId, batch.summary.totalJobs, batch.summary.progressPercent]), [
    ["batch-route-create-read", 2, 50],
  ]);

  const deleteResponse = await handlers.DELETE_JOB(new Request("https://admin.test/delete"), batchJobContext("batch-route-create-read", "job-route-pending"));
  assert.equal(deleteResponse.status, 200);
  const deletePayload = await deleteResponse.json() as { removed: boolean };
  assert.equal(deletePayload.removed, true);
});

test("durable migration batches admin route refuses non-durable fallback", async () => {
  const now = createClock();
  const store = new FakeMigrationBatchStore(now);
  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime: async () => ({
      store,
      durable: false,
      storeKind: "memory",
    }),
  });

  const response = await handlers.POST(jsonRequest({
    batchId: "batch-route-memory-rejected",
    name: "Memory rejected",
  }));
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.match(payload.error, /requires durable storage/);
});

test("durable migration batches admin run route executes through durable migration runtime", async () => {
  const now = createClock();
  const store = new FakeMigrationBatchStore(now);
  store.seedJob({
    jobId: "job-run-route-1",
    siteId: "site-run-route-1",
    siteVersionId: null,
    sourceUrl: "https://run-route-1.example.com",
    status: "PENDING",
    latestEventAt: null,
  });
  await store.createBatch({ batchId: "batch-run-route", name: "Run route batch" });
  await store.addJobToBatch({ batchId: "batch-run-route", jobId: "job-run-route-1" });

  const resumed: string[] = [];
  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime: async () => ({
      store,
      durable: true,
      storeKind: "postgres",
    }),
    createMigrationFactoryRuntime: async () => ({
      factory: {
        resumeMigrationJob: async (jobId: string) => {
          resumed.push(jobId);
          store.setJobStatus(jobId, "COMPLETED");
          return completedReport(jobId);
        },
      },
      store: {},
      durable: true,
      storeKind: "postgres",
    }) as never,
  });

  const response = await handlers.RUN(jsonRequest({ policy: "stop_on_failure", maxJobs: 1 }), batchContext("batch-run-route"));
  assert.equal(response.status, 200);
  const payload = await response.json() as {
    batchId: string;
    nextStatus: string;
    attemptedJobs: number;
    completedJobs: number;
    store: { batch: { durable: boolean; storeKind: string }; jobs: { durable: boolean; storeKind: string } };
  };
  assert.equal(payload.batchId, "batch-run-route");
  assert.equal(payload.nextStatus, "completed");
  assert.equal(payload.attemptedJobs, 1);
  assert.equal(payload.completedJobs, 1);
  assert.deepEqual(resumed, ["job-run-route-1"]);
  assert.deepEqual(payload.store.batch, { durable: true, storeKind: "postgres" });
  assert.deepEqual(payload.store.jobs, { durable: true, storeKind: "postgres" });

  const events = await store.listBatchEvents("batch-run-route");
  assert.deepEqual(events.map((event) => event.eventType), [
    "BATCH_EXECUTION_STARTED",
    "BATCH_JOB_STARTED",
    "BATCH_JOB_COMPLETED",
    "BATCH_EXECUTION_COMPLETED",
  ]);
});

test("durable migration batches admin run route fails closed when durable migration runtime is missing", async () => {
  const now = createClock();
  const store = new FakeMigrationBatchStore(now);
  await store.createBatch({ batchId: "batch-run-route-missing-db", name: "Missing DB batch" });

  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime: async () => ({
      store,
      durable: true,
      storeKind: "postgres",
    }),
    createMigrationFactoryRuntime: async () => {
      throw new MigrationFactoryRuntimeConfigurationError(
        "Durable migration runtime requires DATABASE_URL; refusing to fall back to in-memory migration job storage.",
      );
    },
  });

  const response = await handlers.RUN(jsonRequest({}), batchContext("batch-run-route-missing-db"));
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.match(payload.error, /requires DATABASE_URL/);
});

test("durable migration batches admin observability route returns stable durable read model", async () => {
  const now = createClock();
  const batchStore = new FakeMigrationBatchStore(now);
  const jobStore = new InMemoryMigrationJobStore({ now });
  await batchStore.createBatch({
    batchId: "batch-observability-route",
    name: "Observability route batch",
    status: "failed",
    diagnostics: { skippedJobs: 1 },
  });
  batchStore.seedJob({
    jobId: "job-observability-complete",
    siteId: "site-observability-complete",
    siteVersionId: null,
    sourceUrl: "https://observability-complete.example.com",
    status: "COMPLETED",
    latestEventAt: "2026-06-03T12:10:00.000Z",
  });
  batchStore.seedJob({
    jobId: "job-observability-failed",
    siteId: "site-observability-failed",
    siteVersionId: null,
    sourceUrl: "https://observability-failed.example.com",
    status: "FAILED",
    latestEventAt: "2026-06-03T12:11:00.000Z",
  });
  await batchStore.addJobToBatch({ batchId: "batch-observability-route", jobId: "job-observability-complete" });
  await batchStore.addJobToBatch({ batchId: "batch-observability-route", jobId: "job-observability-failed" });

  await jobStore.createJob({
    jobId: "job-observability-complete",
    siteId: "site-observability-complete",
    sourceUrl: "https://observability-complete.example.com",
  });
  await jobStore.updateJob("job-observability-complete", {
    overallState: "COMPLETED",
    currentStage: null,
  });
  await jobStore.createJob({
    jobId: "job-observability-failed",
    siteId: "site-observability-failed",
    sourceUrl: "https://observability-failed.example.com",
  });
  await jobStore.updateStageState("job-observability-failed", "INTAKE", {
    state: "FAILED",
    startedAt: "2026-06-03T12:11:00.000Z",
    endedAt: "2026-06-03T12:11:01.000Z",
    attempts: 1,
    diagnostics: [{
      code: "INTAKE_FAILED",
      message: "Could not read source URL",
      level: "ERROR",
    }],
    error: {
      code: "INTAKE_FAILED",
      message: "Source URL returned 500",
    },
  });
  await jobStore.updateJob("job-observability-failed", {
    overallState: "FAILED",
    currentStage: "INTAKE",
    lastError: {
      code: "INTAKE_FAILED",
      message: "Source URL returned 500",
    },
  });
  await jobStore.appendExecutionEvent("job-observability-failed", {
    type: "JOB_FAILED",
    timestamp: "2026-06-03T12:11:01.000Z",
    stage: "INTAKE",
    message: "Migration job failed at stage INTAKE",
  });

  await batchStore.appendBatchEvent({
    batchId: "batch-observability-route",
    eventType: "BATCH_EXECUTION_STARTED",
    message: "Migration batch execution started",
  });
  await batchStore.appendBatchEvent({
    batchId: "batch-observability-route",
    eventType: "BATCH_JOB_STARTED",
    message: "Migration batch job execution started",
    jobId: "job-observability-complete",
  });
  await batchStore.appendBatchEvent({
    batchId: "batch-observability-route",
    eventType: "BATCH_JOB_COMPLETED",
    message: "Migration batch job completed",
    jobId: "job-observability-complete",
  });
  await batchStore.appendBatchEvent({
    batchId: "batch-observability-route",
    eventType: "BATCH_JOB_STARTED",
    message: "Migration batch job execution started",
    jobId: "job-observability-failed",
  });
  await batchStore.appendBatchEvent({
    batchId: "batch-observability-route",
    eventType: "BATCH_JOB_FAILED",
    message: "Source URL returned 500",
    jobId: "job-observability-failed",
  });
  await batchStore.appendBatchEvent({
    batchId: "batch-observability-route",
    eventType: "BATCH_EXECUTION_FAILED",
    message: "Migration batch execution failed",
  });

  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime: async () => ({
      store: batchStore,
      durable: true,
      storeKind: "postgres",
    }),
    createMigrationFactoryRuntime: async () => ({
      factory: {},
      store: jobStore,
      durable: true,
      storeKind: "postgres",
    }) as never,
  });

  const response = await handlers.OBSERVABILITY(
    new Request("https://admin.test/observability"),
    batchContext("batch-observability-route"),
  );
  assert.equal(response.status, 200);
  const payload = await response.json() as {
    observability: {
      summary: {
        totalJobs: number;
        completedJobs: number;
        failedJobs: number;
        skippedJobs: number;
        firstFailureJobId: string | null;
      };
      timeline: Array<{ eventType: string; jobId: string | null }>;
      diagnostics: { executionCount: number; lastExecutionDurationMs: number | null };
      failures: { failedJobIds: string[]; latestFailure: { jobId: string; latestReason: string | null } | null };
    };
    store: { batch: { durable: boolean; storeKind: string }; jobs: { durable: boolean; storeKind: string } };
  };
  assert.equal(payload.observability.summary.totalJobs, 2);
  assert.equal(payload.observability.summary.completedJobs, 1);
  assert.equal(payload.observability.summary.failedJobs, 1);
  assert.equal(payload.observability.summary.skippedJobs, 1);
  assert.equal(payload.observability.summary.firstFailureJobId, "job-observability-failed");
  assert.deepEqual(payload.observability.timeline.map((entry) => [entry.eventType, entry.jobId]), [
    ["execution_started", null],
    ["job_started", "job-observability-complete"],
    ["job_completed", "job-observability-complete"],
    ["job_started", "job-observability-failed"],
    ["job_failed", "job-observability-failed"],
    ["execution_failed", null],
  ]);
  assert.equal(payload.observability.diagnostics.executionCount, 1);
  assert.ok(payload.observability.diagnostics.lastExecutionDurationMs !== null);
  assert.deepEqual(payload.observability.failures.failedJobIds, ["job-observability-failed"]);
  assert.equal(payload.observability.failures.latestFailure?.latestReason, "Source URL returned 500");
  assert.deepEqual(payload.store.batch, { durable: true, storeKind: "postgres" });
  assert.deepEqual(payload.store.jobs, { durable: true, storeKind: "postgres" });

  const timelineResponse = await handlers.TIMELINE(
    new Request("https://admin.test/timeline"),
    batchContext("batch-observability-route"),
  );
  assert.equal(timelineResponse.status, 200);
  const timelinePayload = await timelineResponse.json() as { batchId: string; timeline: Array<{ eventType: string }> };
  assert.equal(timelinePayload.batchId, "batch-observability-route");
  assert.deepEqual(timelinePayload.timeline.map((entry) => entry.eventType), [
    "execution_started",
    "job_started",
    "job_completed",
    "job_started",
    "job_failed",
    "execution_failed",
  ]);
});

test("durable migration batches admin observability route fails closed when durable migration runtime is missing", async () => {
  const now = createClock();
  const store = new FakeMigrationBatchStore(now);
  await store.createBatch({ batchId: "batch-observability-missing-db", name: "Missing DB observability batch" });

  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime: async () => ({
      store,
      durable: true,
      storeKind: "postgres",
    }),
    createMigrationFactoryRuntime: async () => {
      throw new MigrationFactoryRuntimeConfigurationError(
        "Durable migration runtime requires DATABASE_URL; refusing to fall back to in-memory migration job storage.",
      );
    },
  });

  const response = await handlers.OBSERVABILITY(
    new Request("https://admin.test/observability"),
    batchContext("batch-observability-missing-db"),
  );
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.match(payload.error, /requires DATABASE_URL/);
});

test("migration batch smoke-test seed route rejects anonymous requests", async () => {
  const handlers = createMigrationBatchSmokeTestSeedRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
  });

  const response = await handlers.POST(new Request("https://admin.test/api/gnr8/admin/migration-batches/seed-smoke-test", { method: "POST" }));
  assert.equal(response.status, 401);
  const payload = await response.json() as { ok: boolean; adminOnly: boolean; externalExecutionBlocked: boolean };
  assert.equal(payload.ok, false);
  assert.equal(payload.adminOnly, true);
  assert.equal(payload.externalExecutionBlocked, true);
});

test("migration batch smoke-test seed route fails closed outside development or staging without explicit flag", async () => {
  let seedCalled = false;
  const now = createClock();
  const jobStore = new InMemoryMigrationJobStore({ now });
  const batchStore = new FakeMigrationBatchStore(now, jobStore);
  const handlers = createMigrationBatchSmokeTestSeedRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    getNodeEnv: () => "production",
    getDeploymentEnv: () => "production",
    isExplicitlyEnabled: () => false,
    createMigrationBatchStoreRuntime: async () => ({
      store: batchStore,
      durable: true,
      storeKind: "postgres",
    }),
    createMigrationFactoryRuntime: async () => ({
      factory: new MigrationFactory({ store: jobStore, now }),
      store: jobStore,
      durable: true,
      storeKind: "postgres",
    }),
    createMigrationBatchSmokeTestSeed: async (input) => {
      seedCalled = true;
      return {
        batchId: input.createdBy ?? "unexpected",
        batchUrl: "/unexpected",
        jobIds: [],
        status: "created",
        created: { batch: false, jobs: [], memberships: [], batchEvents: 0 },
        reused: { batch: false, jobs: [], memberships: [] },
        executionBlocked: true,
      };
    },
  });

  const response = await handlers.POST(new Request("https://admin.test/api/gnr8/admin/migration-batches/seed-smoke-test", { method: "POST" }));
  assert.equal(response.status, 403);
  assert.equal(seedCalled, false);
  const payload = await response.json() as { ok: boolean; requiredEnvFlag: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.requiredEnvFlag, "GNR8_ADMIN_MIGRATION_BATCH_SMOKE_SEED_ENABLED=1");
});

test("migration batch smoke-test seed route creates bounded demo data for Command Center read surfaces", async () => {
  const now = createClock();
  const jobStore = new InMemoryMigrationJobStore({ now });
  const batchStore = new FakeMigrationBatchStore(now, jobStore);
  const runtimeDeps = {
    createMigrationBatchStoreRuntime: async () => ({
      store: batchStore,
      durable: true,
      storeKind: "postgres" as const,
    }),
    createMigrationFactoryRuntime: async () => ({
      factory: new MigrationFactory({ store: jobStore, now }),
      store: jobStore,
      durable: true,
      storeKind: "postgres" as const,
    }),
  };

  const seedHandlers = createMigrationBatchSmokeTestSeedRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    getNodeEnv: () => "production",
    getDeploymentEnv: () => "staging",
    isExplicitlyEnabled: () => false,
    ...runtimeDeps,
  });

  const firstSeedResponse = await seedHandlers.POST(
    new Request("https://admin.test/api/gnr8/admin/migration-batches/seed-smoke-test", { method: "POST" }),
  );
  assert.equal(firstSeedResponse.status, 200);
  const firstSeed = await firstSeedResponse.json() as {
    batchId: string;
    batchUrl: string;
    jobIds: string[];
    status: string;
    created: { batch: boolean; jobs: string[]; memberships: string[]; batchEvents: number };
    executionBlocked: boolean;
    externalExecutionBlocked: boolean;
  };
  assert.equal(firstSeed.batchId, MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID);
  assert.equal(firstSeed.batchUrl, `/gnr8/command-center/migration-batches/${MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID}`);
  assert.deepEqual(firstSeed.jobIds, [...MIGRATION_BATCH_SMOKE_TEST_SEED_JOB_IDS]);
  assert.equal(firstSeed.status, "created");
  assert.equal(firstSeed.created.batch, true);
  assert.equal(firstSeed.created.jobs.length, 3);
  assert.equal(firstSeed.created.memberships.length, 3);
  assert.equal(firstSeed.created.batchEvents, 6);
  assert.equal(firstSeed.executionBlocked, true);
  assert.equal(firstSeed.externalExecutionBlocked, true);

  const secondSeedResponse = await seedHandlers.POST(
    new Request("https://admin.test/api/gnr8/admin/migration-batches/seed-smoke-test", { method: "POST" }),
  );
  assert.equal(secondSeedResponse.status, 200);
  const secondSeed = await secondSeedResponse.json() as {
    batchId: string;
    status: string;
    created: { batch: boolean; jobs: string[]; memberships: string[]; batchEvents: number };
    reused: { batch: boolean; jobs: string[]; memberships: string[] };
  };
  assert.equal(secondSeed.batchId, MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID);
  assert.equal(secondSeed.status, "reused");
  assert.equal(secondSeed.created.batch, false);
  assert.deepEqual(secondSeed.created.jobs, []);
  assert.deepEqual(secondSeed.created.memberships, []);
  assert.equal(secondSeed.created.batchEvents, 0);
  assert.equal(secondSeed.reused.batch, true);
  assert.deepEqual(secondSeed.reused.jobs, [...MIGRATION_BATCH_SMOKE_TEST_SEED_JOB_IDS]);

  const batchHandlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    requireAgencyActionContext: async () => ({
      userId: "superadmin-1",
      agencyId: TEST_AGENCY_ID,
      role: "superadmin",
      actorMode: "admin_view",
    }),
    ...runtimeDeps,
  });

  const listResponse = await batchHandlers.LIST(new Request("https://admin.test/api/gnr8/admin/migration-batches"));
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json() as {
    batches: Array<{ batchId: string; summary: { totalJobs: number; completedJobs: number; failedJobs: number; pendingJobs: number } }>;
  };
  const seededListBatch = listPayload.batches.find((batch) => batch.batchId === MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID);
  assert.ok(seededListBatch);
  assert.equal(seededListBatch.summary.totalJobs, 3);
  assert.equal(seededListBatch.summary.completedJobs, 1);
  assert.equal(seededListBatch.summary.pendingJobs, 1);
  assert.equal(seededListBatch.summary.failedJobs, 1);

  const detailResponse = await batchHandlers.GET(
    new Request("https://admin.test/api/gnr8/admin/migration-batches/demo"),
    batchContext(MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID),
  );
  assert.equal(detailResponse.status, 200);
  const detailPayload = await detailResponse.json();

  const observabilityResponse = await batchHandlers.OBSERVABILITY(
    new Request("https://admin.test/api/gnr8/admin/migration-batches/demo/observability"),
    batchContext(MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID),
  );
  assert.equal(observabilityResponse.status, 200);
  const observabilityPayload = await observabilityResponse.json() as {
    observability: {
      summary: { totalJobs: number; firstFailureJobId: string | null; firstFailureReason: string | null };
      diagnostics: { currentlyRunnableJobs: string[]; completedJobs: string[]; lastExecutionDurationMs: number | null };
      failures: { failedJobIds: string[]; latestFailure: { jobId: string; latestReason: string | null } | null };
      timeline: Array<{ eventType: string; jobId: string | null }>;
    };
  };
  assert.equal(observabilityPayload.observability.summary.totalJobs, 3);
  assert.equal(observabilityPayload.observability.summary.firstFailureJobId, "migration_job_smoke_failed_v1");
  assert.match(observabilityPayload.observability.summary.firstFailureReason ?? "", /snapshot intentionally blocked/);
  assert.deepEqual(observabilityPayload.observability.diagnostics.currentlyRunnableJobs.sort(), [
    "migration_job_smoke_failed_v1",
    "migration_job_smoke_pending_v1",
  ]);
  assert.deepEqual(observabilityPayload.observability.diagnostics.completedJobs, ["migration_job_smoke_completed_v1"]);
  assert.ok(observabilityPayload.observability.diagnostics.lastExecutionDurationMs !== null);
  assert.deepEqual(observabilityPayload.observability.failures.failedJobIds, ["migration_job_smoke_failed_v1"]);
  assert.equal(observabilityPayload.observability.failures.latestFailure?.jobId, "migration_job_smoke_failed_v1");

  const timelineResponse = await batchHandlers.TIMELINE(
    new Request("https://admin.test/api/gnr8/admin/migration-batches/demo/timeline"),
    batchContext(MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID),
  );
  assert.equal(timelineResponse.status, 200);
  const timelinePayload = await timelineResponse.json() as { timeline: Array<{ eventType: string; jobId: string | null }> };
  assert.deepEqual(timelinePayload.timeline.map((entry) => [entry.eventType, entry.jobId]), [
    ["execution_started", null],
    ["job_started", "migration_job_smoke_completed_v1"],
    ["job_completed", "migration_job_smoke_completed_v1"],
    ["job_started", "migration_job_smoke_failed_v1"],
    ["job_failed", "migration_job_smoke_failed_v1"],
    ["execution_partially_failed", null],
  ]);

  const viewModel = normalizeMigrationBatchDetailPayload({
    batchPayload: detailPayload,
    observabilityPayload,
    timelinePayload,
  });
  assert.equal(viewModel.fetchError, null);
  assert.equal(viewModel.batch?.batchId, MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID);
  assert.equal(viewModel.batch?.summary.totalJobs, 3);
  assert.equal(viewModel.batch?.summary.firstFailureJobId, "migration_job_smoke_failed_v1");
  assert.equal(viewModel.batch?.diagnostics.currentlyRunnableJobs.includes("migration_job_smoke_pending_v1"), true);
  assert.equal(viewModel.batch?.failures.failedJobIds.includes("migration_job_smoke_failed_v1"), true);
  assert.equal(viewModel.batch?.timeline.some((entry) => entry.eventType === "job_failed"), true);
});

test("durable migration batches admin route creates and attaches through real Postgres store when DB is available", async (t: TestContext) => {
  const skipReason = await getRouteDbSkipReason();
  if (skipReason) {
    t.skip(skipReason);
    return;
  }

  const batchId = `migration_batch_route_db_${randomUUID()}`;
  const jobId = `migration_batch_route_job_db_${randomUUID()}`;
  const now = createClock();
  const jobStore = new PostgresMigrationJobStore({ now });
  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime,
  });

  try {
    await jobStore.createJob({
      jobId,
      siteId: `site_route_batch_db_${randomUUID()}`,
      sourceUrl: `https://route-batch-db-${randomUUID()}.example.com`,
    });

    const createResponse = await handlers.POST(jsonRequest({
      batchId,
      name: "Route DB batch",
    }));
    assert.equal(createResponse.status, 201);

    const attachResponse = await handlers.ADD_JOB(jsonRequest({ jobId }), batchContext(batchId));
    assert.equal(attachResponse.status, 201);

    const readResponse = await handlers.GET(new Request("https://admin.test/read"), batchContext(batchId));
    assert.equal(readResponse.status, 200);
    const readPayload = await readResponse.json() as {
      batch: {
        batchId: string;
        store: { durable: boolean; kind: string };
        jobCounts: { totalJobs: number; pendingJobs: number; progressPercent: number };
        jobSummaries: Array<{ jobId: string; jobStatus: string }>;
      };
    };
    assert.equal(readPayload.batch.batchId, batchId);
    assert.deepEqual(readPayload.batch.store, { durable: true, kind: "postgres" });
    assert.equal(readPayload.batch.jobCounts.totalJobs, 1);
    assert.equal(readPayload.batch.jobCounts.pendingJobs, 1);
    assert.equal(readPayload.batch.jobCounts.progressPercent, 0);
    assert.deepEqual(readPayload.batch.jobSummaries.map((job) => [job.jobId, job.jobStatus]), [[jobId, "PENDING"]]);
  } finally {
    await cleanupDb({ batchId, jobId });
  }
});

test("durable migration batches admin run route executes with real Postgres stores when DB is available", async (t: TestContext) => {
  const skipReason = await getRouteDbSkipReason();
  if (skipReason) {
    t.skip(skipReason);
    return;
  }

  const batchId = `migration_batch_route_run_db_${randomUUID()}`;
  const jobId = `migration_batch_route_run_job_db_${randomUUID()}`;
  const now = createClock();
  const jobStore = new PostgresMigrationJobStore({ now });
  const factory = new MigrationFactory({
    store: jobStore,
    now,
    stageRunner: {
      runStage: async (_job, stage, context) => {
        const startedAt = context.now();
        const endedAt = context.now();
        return {
          stage,
          status: "SUCCEEDED",
          startedAt,
          endedAt,
          diagnostics: [],
          outputRefs: { ref: `${jobId}:${stage}` },
        };
      },
    },
  });
  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime,
    createMigrationFactoryRuntime: async () => ({
      factory,
      store: jobStore,
      durable: true,
      storeKind: "postgres",
    }),
  });

  try {
    await factory.startMigrationJob({
      jobId,
      siteId: `site_route_batch_run_db_${randomUUID()}`,
      sourceUrl: `https://route-batch-run-db-${randomUUID()}.example.com`,
    });

    const createResponse = await handlers.POST(jsonRequest({
      batchId,
      name: "Route DB run batch",
    }));
    assert.equal(createResponse.status, 201);

    const attachResponse = await handlers.ADD_JOB(jsonRequest({ jobId }), batchContext(batchId));
    assert.equal(attachResponse.status, 201);

    const runResponse = await handlers.RUN(jsonRequest({ policy: "stop_on_failure" }), batchContext(batchId));
    assert.equal(runResponse.status, 200);
    const runPayload = await runResponse.json() as {
      nextStatus: string;
      attemptedJobs: number;
      completedJobs: number;
      failedJobs: number;
      jobResults: Array<{ jobId: string; finalState: string }>;
    };
    assert.equal(runPayload.nextStatus, "completed");
    assert.equal(runPayload.attemptedJobs, 1);
    assert.equal(runPayload.completedJobs, 1);
    assert.equal(runPayload.failedJobs, 0);
    assert.deepEqual(runPayload.jobResults.map((result) => [result.jobId, result.finalState]), [[jobId, "COMPLETED"]]);
  } finally {
    await cleanupDb({ batchId, jobId });
  }
});

test("durable migration batches admin observability route reads real Postgres execution state when DB is available", async (t: TestContext) => {
  const skipReason = await getRouteDbSkipReason();
  if (skipReason) {
    t.skip(skipReason);
    return;
  }

  const batchId = `migration_batch_route_observability_db_${randomUUID()}`;
  const jobId = `migration_batch_route_observability_job_db_${randomUUID()}`;
  const now = createClock();
  const jobStore = new PostgresMigrationJobStore({ now });
  const factory = new MigrationFactory({
    store: jobStore,
    now,
    stageRunner: {
      runStage: async (_job, stage, context) => {
        const startedAt = context.now();
        const endedAt = context.now();
        return {
          stage,
          status: "SUCCEEDED",
          startedAt,
          endedAt,
          diagnostics: [],
          outputRefs: { ref: `${jobId}:${stage}` },
        };
      },
    },
  });
  const handlers = createMigrationBatchesRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    createMigrationBatchStoreRuntime,
    createMigrationFactoryRuntime: async () => ({
      factory,
      store: jobStore,
      durable: true,
      storeKind: "postgres",
    }),
  });

  try {
    await factory.startMigrationJob({
      jobId,
      siteId: `site_route_batch_observability_db_${randomUUID()}`,
      sourceUrl: `https://route-batch-observability-db-${randomUUID()}.example.com`,
    });

    const createResponse = await handlers.POST(jsonRequest({
      batchId,
      name: "Route DB observability batch",
    }));
    assert.equal(createResponse.status, 201);

    const attachResponse = await handlers.ADD_JOB(jsonRequest({ jobId }), batchContext(batchId));
    assert.equal(attachResponse.status, 201);

    const runResponse = await handlers.RUN(jsonRequest({ policy: "stop_on_failure" }), batchContext(batchId));
    assert.equal(runResponse.status, 200);

    const observabilityResponse = await handlers.OBSERVABILITY(
      new Request("https://admin.test/observability"),
      batchContext(batchId),
    );
    assert.equal(observabilityResponse.status, 200);
    const payload = await observabilityResponse.json() as {
      observability: {
        summary: {
          totalJobs: number;
          completedJobs: number;
          failedJobs: number;
          lastExecutedJobId: string | null;
          lastCompletedJobId: string | null;
        };
        timeline: Array<{ eventType: string; jobId: string | null }>;
        diagnostics: { executionCount: number; completedJobs: string[]; lastExecutionDurationMs: number | null };
        failures: { failedJobIds: string[] };
      };
      store: { batch: { durable: boolean; storeKind: string }; jobs: { durable: boolean; storeKind: string } };
    };
    assert.equal(payload.observability.summary.totalJobs, 1);
    assert.equal(payload.observability.summary.completedJobs, 1);
    assert.equal(payload.observability.summary.failedJobs, 0);
    assert.equal(payload.observability.summary.lastExecutedJobId, jobId);
    assert.equal(payload.observability.summary.lastCompletedJobId, jobId);
    assert.deepEqual(payload.observability.timeline.map((entry) => [entry.eventType, entry.jobId]), [
      ["execution_started", null],
      ["job_started", jobId],
      ["job_completed", jobId],
      ["execution_completed", null],
    ]);
    assert.equal(payload.observability.diagnostics.executionCount, 1);
    assert.deepEqual(payload.observability.diagnostics.completedJobs, [jobId]);
    assert.ok(payload.observability.diagnostics.lastExecutionDurationMs !== null);
    assert.deepEqual(payload.observability.failures.failedJobIds, []);
    assert.deepEqual(payload.store.batch, { durable: true, storeKind: "postgres" });
    assert.deepEqual(payload.store.jobs, { durable: true, storeKind: "postgres" });
  } finally {
    await cleanupDb({ batchId, jobId });
  }
});
