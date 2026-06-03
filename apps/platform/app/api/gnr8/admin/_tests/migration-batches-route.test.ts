import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import { createMigrationBatchesRouteHandlers } from "@/app/api/gnr8/admin/migration-batches/migration-batches-route-handlers";
import { createMigrationBatchStoreRuntime } from "@/gnr8/migration-factory/migration-batch-store-runtime";
import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import type {
  AddMigrationJobToBatchInput,
  CreateMigrationBatchInput,
  MigrationBatch,
  MigrationBatchJob,
  MigrationBatchJobSummary,
  MigrationBatchSummary,
  MigrationBatchWithSummary,
} from "@/gnr8/migration-factory/migration-batch-types";
import { PostgresMigrationJobStore } from "@/gnr8/migration-factory/postgres-migration-job-store";

const TEST_AGENCY_ID = "00000000-0000-4000-8000-000000000001";
const MISSING_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_jobs" does not exist`;
const MISSING_BATCHES_TABLE_MESSAGE = `relation "public.gnr8_migration_batches" does not exist`;
const MISSING_BATCH_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_batch_jobs" does not exist`;
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
  private readonly now: () => string;

  constructor(now: () => string) {
    this.now = now;
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
    const job = this.jobs.get(input.jobId);
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
    return Array.from(this.memberships.values())
      .filter((membership) => membership.batchId === batchId)
      .sort((a, b) => a.position - b.position || a.addedAt.localeCompare(b.addedAt) || a.jobId.localeCompare(b.jobId))
      .map((membership) => {
        const job = this.jobs.get(membership.jobId);
        assert.ok(job);
        return {
          ...membership,
          jobStatus: job.status,
          jobCreatedAt: job.createdAt,
          jobUpdatedAt: job.updatedAt,
          latestEventAt: job.latestEventAt,
        };
      });
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

  private countBatchJobs(batchId: string): number {
    return Array.from(this.memberships.values()).filter((membership) => membership.batchId === batchId).length;
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

async function getRouteDbSkipReason(): Promise<string | null> {
  try {
    const { getSuperadminPool } = await import("@/src/superadmin/db");
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_jobs limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batches limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batch_jobs limit 1`);
    return null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
      return "Skipping DB-backed migration batch route test: DATABASE_URL is not configured for local integration runs.";
    }
    if (
      error.message.includes(MISSING_JOBS_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCHES_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCH_JOBS_TABLE_MESSAGE)
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
