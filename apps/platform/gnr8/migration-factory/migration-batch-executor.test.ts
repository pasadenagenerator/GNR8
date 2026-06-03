import assert from "node:assert/strict";
import test from "node:test";

import { MigrationBatchExecutor } from "@/gnr8/migration-factory/migration-batch-executor";
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
import type { MigrationExecutionReport, MigrationJobState } from "@/gnr8/migration-factory/migration-job-types";

type FakeJob = {
  jobId: string;
  siteId: string;
  sourceUrl: string;
  status: MigrationJobState;
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

function executionReport(jobId: string, finalState: MigrationJobState): MigrationExecutionReport {
  const timestamp = "2026-06-03T12:00:00.000Z";
  return {
    jobId,
    finalState,
    completedStages: [],
    stageDiagnostics: [],
    startedAt: timestamp,
    endedAt: timestamp,
    durationMs: 0,
    outputs: {},
  };
}

function emptySummary(batchId: string): MigrationBatchSummary {
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

class FakeMigrationBatchStore implements MigrationBatchStore {
  readonly events: MigrationBatchEvent[] = [];
  private readonly batches = new Map<string, MigrationBatch>();
  private readonly memberships = new Map<string, MigrationBatchJob>();
  private readonly jobs = new Map<string, FakeJob>();
  private readonly now: () => string;

  constructor(now: () => string) {
    this.now = now;
  }

  seedJob(jobId: string, status: MigrationJobState = "PENDING"): void {
    const timestamp = this.now();
    this.jobs.set(jobId, {
      jobId,
      siteId: `site-${jobId}`,
      sourceUrl: `https://${jobId}.example.com`,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
      latestEventAt: null,
    });
  }

  setJobStatus(jobId: string, status: MigrationJobState): void {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Migration job not found: ${jobId}`);
    const timestamp = this.now();
    this.jobs.set(jobId, { ...job, status, updatedAt: timestamp, latestEventAt: timestamp });
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
    return Promise.all(
      Array.from(this.batches.values()).map(async (batch) => ({
        ...batch,
        summary: (await this.getBatchSummary(batch.batchId)) ?? emptySummary(batch.batchId),
      })),
    );
  }

  async addJobToBatch(input: AddMigrationJobToBatchInput): Promise<MigrationBatchJob> {
    const job = this.jobs.get(input.jobId);
    if (!job) throw new Error(`Migration job not found: ${input.jobId}`);
    const membership: MigrationBatchJob = {
      batchId: input.batchId,
      jobId: input.jobId,
      siteId: input.siteId ?? job.siteId,
      siteVersionId: input.siteVersionId ?? null,
      sourceUrl: input.sourceUrl ?? job.sourceUrl,
      position: input.position ?? this.countBatchJobs(input.batchId),
      addedAt: this.now(),
      metadata: input.metadata ?? {},
    };
    this.memberships.set(`${input.batchId}:${input.jobId}`, membership);
    return membership;
  }

  async removeJobFromBatch(batchId: string, jobId: string): Promise<boolean> {
    return this.memberships.delete(`${batchId}:${jobId}`);
  }

  async listBatchJobs(batchId: string): Promise<MigrationBatchJobSummary[]> {
    return Array.from(this.memberships.values())
      .filter((membership) => membership.batchId === batchId)
      .sort((a, b) => a.position - b.position || a.jobId.localeCompare(b.jobId))
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
      progressPercent: jobs.length === 0 ? 0 : Math.round((completedJobs / jobs.length) * 100),
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

  private countBatchJobs(batchId: string): number {
    return Array.from(this.memberships.values()).filter((membership) => membership.batchId === batchId).length;
  }
}

async function seedBatch(input: {
  status?: MigrationBatch["status"];
  jobs: Array<{ jobId: string; status?: MigrationJobState }>;
}): Promise<{ store: FakeMigrationBatchStore; resumed: string[]; executor: MigrationBatchExecutor }> {
  const store = new FakeMigrationBatchStore(createClock());
  await store.createBatch({ batchId: "batch-1", name: "Batch 1", status: input.status ?? "ready" });
  for (const job of input.jobs) {
    store.seedJob(job.jobId, job.status ?? "PENDING");
    await store.addJobToBatch({ batchId: "batch-1", jobId: job.jobId });
  }
  const resumed: string[] = [];
  const executor = new MigrationBatchExecutor({
    batchStore: store,
    migrationFactory: {
      resumeMigrationJob: async (jobId) => {
        resumed.push(jobId);
        store.setJobStatus(jobId, "COMPLETED");
        return executionReport(jobId, "COMPLETED");
      },
    },
  });
  return { store, resumed, executor };
}

test("migration batch executor runs jobs sequentially", async () => {
  const { store, resumed } = await seedBatch({
    jobs: [{ jobId: "job-a" }, { jobId: "job-b" }, { jobId: "job-c" }],
  });
  let active = 0;
  let maxActive = 0;
  const executor = new MigrationBatchExecutor({
    batchStore: store,
    migrationFactory: {
      resumeMigrationJob: async (jobId) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        resumed.push(jobId);
        store.setJobStatus(jobId, "COMPLETED");
        active -= 1;
        return executionReport(jobId, "COMPLETED");
      },
    },
  });

  const summary = await executor.execute({ batchId: "batch-1" });
  assert.deepEqual(resumed, ["job-a", "job-b", "job-c"]);
  assert.equal(maxActive, 1);
  assert.equal(summary.nextStatus, "completed");
  assert.equal(summary.attemptedJobs, 3);
});

test("migration batch executor skips completed jobs", async () => {
  const { executor, resumed } = await seedBatch({
    jobs: [{ jobId: "job-done", status: "COMPLETED" }, { jobId: "job-next" }],
  });

  const summary = await executor.execute({ batchId: "batch-1" });
  assert.deepEqual(resumed, ["job-next"]);
  assert.equal(summary.skippedJobs, 1);
  assert.deepEqual(summary.jobResults.map((result) => [result.jobId, result.outcome]), [
    ["job-done", "skipped_completed"],
    ["job-next", "completed"],
  ]);
});

test("migration batch executor stop_on_failure stops after first failed job", async () => {
  const { store, resumed } = await seedBatch({
    jobs: [{ jobId: "job-fail" }, { jobId: "job-later" }],
  });
  const executor = new MigrationBatchExecutor({
    batchStore: store,
    migrationFactory: {
      resumeMigrationJob: async (jobId) => {
        resumed.push(jobId);
        store.setJobStatus(jobId, "FAILED");
        return executionReport(jobId, "FAILED");
      },
    },
  });

  const summary = await executor.execute({ batchId: "batch-1", policy: "stop_on_failure" });
  assert.deepEqual(resumed, ["job-fail"]);
  assert.equal(summary.nextStatus, "failed");
  assert.equal(summary.failedJobs, 1);
  assert.equal(summary.stoppedReason, "failed");
});

test("migration batch executor continue_on_failure attempts remaining jobs and marks partially_failed", async () => {
  const { store, resumed } = await seedBatch({
    jobs: [{ jobId: "job-fail" }, { jobId: "job-ok" }],
  });
  const executor = new MigrationBatchExecutor({
    batchStore: store,
    migrationFactory: {
      resumeMigrationJob: async (jobId) => {
        resumed.push(jobId);
        if (jobId === "job-fail") {
          store.setJobStatus(jobId, "FAILED");
          return executionReport(jobId, "FAILED");
        }
        store.setJobStatus(jobId, "COMPLETED");
        return executionReport(jobId, "COMPLETED");
      },
    },
  });

  const summary = await executor.execute({ batchId: "batch-1", policy: "continue_on_failure" });
  assert.deepEqual(resumed, ["job-fail", "job-ok"]);
  assert.equal(summary.nextStatus, "partially_failed");
  assert.equal(summary.completedJobs, 1);
  assert.equal(summary.failedJobs, 1);
});

test("migration batch executor maxJobs limits execution and pauses batch", async () => {
  const { executor, resumed, store } = await seedBatch({
    jobs: [{ jobId: "job-one" }, { jobId: "job-two" }, { jobId: "job-three" }],
  });

  const summary = await executor.execute({ batchId: "batch-1", maxJobs: 2 });
  assert.deepEqual(resumed, ["job-one", "job-two"]);
  assert.equal(summary.nextStatus, "paused");
  assert.equal(summary.stoppedReason, "max_jobs");
  assert.equal((await store.getBatch("batch-1"))?.status, "paused");
  assert.equal(store.events.at(-1)?.eventType, "BATCH_EXECUTION_PAUSED_BY_LIMIT");
});

test("migration batch executor completed batch does not rerun jobs", async () => {
  const { executor, resumed } = await seedBatch({
    status: "completed",
    jobs: [{ jobId: "job-already" }],
  });

  const summary = await executor.execute({ batchId: "batch-1" });
  assert.deepEqual(resumed, []);
  assert.equal(summary.nextStatus, "completed");
  assert.equal(summary.stoppedReason, "batch_completed");
  assert.equal(summary.attemptedJobs, 0);
});

test("migration batch executor rejects running batch", async () => {
  const { executor, resumed } = await seedBatch({
    status: "running",
    jobs: [{ jobId: "job-busy" }],
  });

  await assert.rejects(() => executor.execute({ batchId: "batch-1" }), /already running/);
  assert.deepEqual(resumed, []);
});

test("migration batch executor persists execution events", async () => {
  const { executor, store } = await seedBatch({
    jobs: [{ jobId: "job-events" }],
  });

  await executor.execute({ batchId: "batch-1" });
  assert.deepEqual((await store.listBatchEvents("batch-1")).map((event) => [event.eventType, event.jobId]), [
    ["BATCH_EXECUTION_STARTED", null],
    ["BATCH_JOB_STARTED", "job-events"],
    ["BATCH_JOB_COMPLETED", "job-events"],
    ["BATCH_EXECUTION_COMPLETED", null],
  ]);
});
