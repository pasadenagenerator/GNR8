import assert from "node:assert/strict";
import test from "node:test";

import { buildMigrationBatchObservability } from "@/gnr8/migration-factory/migration-batch-observability";
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
import type { MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type { MigrationExecutionEvent, MigrationJob, MigrationJobState, MigrationStage } from "@/gnr8/migration-factory/migration-job-types";
import { createInitialStageStates } from "@/gnr8/migration-factory/migration-stage-machine";

function progressPercent(totalJobs: number, completedJobs: number): number {
  if (totalJobs <= 0) return 0;
  return Math.round((completedJobs / totalJobs) * 100);
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

function migrationJob(input: {
  jobId: string;
  state: MigrationJobState;
  updatedAt: string;
  currentStage?: MigrationStage | null;
  failedStage?: MigrationStage;
  errorMessage?: string;
  events?: MigrationExecutionEvent[];
}): MigrationJob {
  const stageStates = createInitialStageStates();
  if (input.failedStage) {
    stageStates[input.failedStage] = {
      ...stageStates[input.failedStage],
      state: "FAILED",
      startedAt: "2026-06-03T12:00:04.000Z",
      endedAt: "2026-06-03T12:00:05.000Z",
      attempts: 1,
      diagnostics: [{
        code: "HTML_PARSE_WARNING",
        message: "Unable to normalize imported markup",
        level: "ERROR",
        details: { selector: "main" },
      }],
      error: {
        code: "STAGE_FAILED",
        message: input.errorMessage ?? `Stage ${input.failedStage} failed`,
        details: { stage: input.failedStage },
      },
    };
  }

  return {
    jobId: input.jobId,
    siteId: `site-${input.jobId}`,
    sourceUrl: `https://${input.jobId}.example.com`,
    overallState: input.state,
    currentStage: input.currentStage ?? input.failedStage ?? null,
    stageStates,
    createdAt: "2026-06-03T12:00:00.000Z",
    updatedAt: input.updatedAt,
    lastError: input.failedStage ? {
      code: "STAGE_FAILED",
      message: input.errorMessage ?? `Stage ${input.failedStage} failed`,
      details: { stage: input.failedStage },
    } : null,
    lastExecutionReport: input.failedStage ? {
      jobId: input.jobId,
      finalState: input.state,
      completedStages: [],
      failedStage: input.failedStage,
      stageDiagnostics: Object.values(stageStates).map((stage) => ({
        stage: stage.stage,
        status: stage.state,
        diagnostics: stage.diagnostics,
        error: stage.error,
      })),
      startedAt: "2026-06-03T12:00:03.000Z",
      endedAt: "2026-06-03T12:00:05.000Z",
      durationMs: 2000,
      outputs: {},
    } : null,
    lastActivationExecutionResult: null,
    activationExecutionHistory: [],
    executionEvents: input.events ?? [],
  };
}

class FakeMigrationJobStore implements MigrationJobStore {
  private readonly jobs = new Map<string, MigrationJob>();

  seed(job: MigrationJob): void {
    this.jobs.set(job.jobId, job);
  }

  async createJob(): Promise<MigrationJob> {
    throw new Error("Not implemented");
  }

  async getJob(jobId: string): Promise<MigrationJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async updateJob(): Promise<MigrationJob> {
    throw new Error("Not implemented");
  }

  async updateStageState(): Promise<MigrationJob> {
    throw new Error("Not implemented");
  }

  async appendExecutionEvent(): Promise<void> {
    throw new Error("Not implemented");
  }

  async listJobs(): Promise<MigrationJob[]> {
    return Array.from(this.jobs.values());
  }
}

class FakeMigrationBatchStore implements MigrationBatchStore {
  private readonly batches = new Map<string, MigrationBatch>();
  private readonly jobs = new Map<string, MigrationBatchJobSummary>();
  private readonly events: MigrationBatchEvent[] = [];
  private eventSequence = 0;

  seedBatch(batch: MigrationBatch): void {
    this.batches.set(batch.batchId, batch);
  }

  seedJob(job: MigrationBatchJobSummary): void {
    this.jobs.set(`${job.batchId}:${job.jobId}`, job);
  }

  seedEvent(event: Omit<MigrationBatchEvent, "id"> & { id?: string }): void {
    this.eventSequence += 1;
    this.events.push({
      id: event.id ?? `event-${this.eventSequence}`,
      ...event,
    });
  }

  async createBatch(input: CreateMigrationBatchInput): Promise<MigrationBatch> {
    const batch: MigrationBatch = {
      batchId: input.batchId ?? "batch",
      organizationId: input.organizationId ?? null,
      agencyId: input.agencyId ?? null,
      clientId: input.clientId ?? null,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "draft",
      createdBy: input.createdBy ?? null,
      createdAt: "2026-06-03T12:00:00.000Z",
      updatedAt: "2026-06-03T12:00:00.000Z",
      startedAt: null,
      completedAt: null,
      failedAt: null,
      metadata: input.metadata ?? {},
      diagnostics: input.diagnostics ?? {},
    };
    this.seedBatch(batch);
    return batch;
  }

  async getBatch(batchId: string): Promise<MigrationBatch | null> {
    return this.batches.get(batchId) ?? null;
  }

  async listBatches(): Promise<MigrationBatchWithSummary[]> {
    return Promise.all(Array.from(this.batches.values()).map(async (batch) => ({
      ...batch,
      summary: (await this.getBatchSummary(batch.batchId)) ?? emptySummary(batch.batchId),
    })));
  }

  async addJobToBatch(input: AddMigrationJobToBatchInput): Promise<MigrationBatchJob> {
    const job: MigrationBatchJobSummary = {
      batchId: input.batchId,
      jobId: input.jobId,
      siteId: input.siteId ?? `site-${input.jobId}`,
      siteVersionId: input.siteVersionId ?? null,
      sourceUrl: input.sourceUrl ?? `https://${input.jobId}.example.com`,
      position: input.position ?? this.jobs.size,
      addedAt: "2026-06-03T12:00:00.000Z",
      metadata: input.metadata ?? {},
      jobStatus: "PENDING",
      jobCreatedAt: "2026-06-03T12:00:00.000Z",
      jobUpdatedAt: "2026-06-03T12:00:00.000Z",
      latestEventAt: null,
    };
    this.seedJob(job);
    return job;
  }

  async removeJobFromBatch(batchId: string, jobId: string): Promise<boolean> {
    return this.jobs.delete(`${batchId}:${jobId}`);
  }

  async listBatchJobs(batchId: string): Promise<MigrationBatchJobSummary[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.batchId === batchId)
      .sort((a, b) => a.position - b.position || a.jobId.localeCompare(b.jobId));
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
    const next = { ...current, status: input.status, diagnostics: input.diagnostics ?? current.diagnostics };
    this.batches.set(input.batchId, next);
    return next;
  }

  async appendBatchEvent(input: AppendMigrationBatchEventInput): Promise<MigrationBatchEvent> {
    const event: MigrationBatchEvent = {
      id: `event-${this.events.length + 1}`,
      batchId: input.batchId,
      eventType: input.eventType,
      message: input.message,
      jobId: input.jobId ?? null,
      details: input.details ?? {},
      createdAt: "2026-06-03T12:00:00.000Z",
    };
    this.events.push(event);
    return event;
  }

  async listBatchEvents(batchId: string): Promise<MigrationBatchEvent[]> {
    return this.events.filter((event) => event.batchId === batchId);
  }
}

function seedObservableBatch(): { batchStore: FakeMigrationBatchStore; jobStore: FakeMigrationJobStore } {
  const batchStore = new FakeMigrationBatchStore();
  const jobStore = new FakeMigrationJobStore();
  batchStore.seedBatch({
    batchId: "batch-observe",
    organizationId: null,
    agencyId: null,
    clientId: null,
    name: "Observable batch",
    description: null,
    status: "failed",
    createdBy: null,
    createdAt: "2026-06-03T11:59:00.000Z",
    updatedAt: "2026-06-03T12:00:08.000Z",
    startedAt: "2026-06-03T12:00:01.000Z",
    completedAt: null,
    failedAt: "2026-06-03T12:00:08.000Z",
    metadata: {},
    diagnostics: { skippedJobs: 1, stoppedReason: "failed" },
  });
  batchStore.seedJob({
    batchId: "batch-observe",
    jobId: "job-complete",
    siteId: "site-complete",
    siteVersionId: null,
    sourceUrl: "https://complete.example.com",
    position: 0,
    addedAt: "2026-06-03T11:59:01.000Z",
    metadata: {},
    jobStatus: "COMPLETED",
    jobCreatedAt: "2026-06-03T11:59:01.000Z",
    jobUpdatedAt: "2026-06-03T12:00:03.000Z",
    latestEventAt: "2026-06-03T12:00:03.000Z",
  });
  batchStore.seedJob({
    batchId: "batch-observe",
    jobId: "job-failed",
    siteId: "site-failed",
    siteVersionId: null,
    sourceUrl: "https://failed.example.com",
    position: 1,
    addedAt: "2026-06-03T11:59:02.000Z",
    metadata: {},
    jobStatus: "FAILED",
    jobCreatedAt: "2026-06-03T11:59:02.000Z",
    jobUpdatedAt: "2026-06-03T12:00:07.000Z",
    latestEventAt: "2026-06-03T12:00:07.000Z",
  });
  batchStore.seedJob({
    batchId: "batch-observe",
    jobId: "job-pending",
    siteId: "site-pending",
    siteVersionId: null,
    sourceUrl: "https://pending.example.com",
    position: 2,
    addedAt: "2026-06-03T11:59:03.000Z",
    metadata: {},
    jobStatus: "PENDING",
    jobCreatedAt: "2026-06-03T11:59:03.000Z",
    jobUpdatedAt: "2026-06-03T11:59:03.000Z",
    latestEventAt: null,
  });
  batchStore.seedEvent({
    batchId: "batch-observe",
    eventType: "BATCH_EXECUTION_STARTED",
    message: "Execution started",
    jobId: null,
    details: { policy: "stop_on_failure" },
    createdAt: "2026-06-03T12:00:01.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-observe",
    eventType: "BATCH_JOB_STARTED",
    message: "Job complete started",
    jobId: "job-complete",
    details: { position: 0 },
    createdAt: "2026-06-03T12:00:02.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-observe",
    eventType: "BATCH_JOB_COMPLETED",
    message: "Job complete completed",
    jobId: "job-complete",
    details: { position: 0 },
    createdAt: "2026-06-03T12:00:03.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-observe",
    eventType: "BATCH_JOB_STARTED",
    message: "Job failed started",
    jobId: "job-failed",
    details: { position: 1 },
    createdAt: "2026-06-03T12:00:04.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-observe",
    eventType: "BATCH_JOB_FAILED",
    message: "Import stage rejected malformed HTML",
    jobId: "job-failed",
    details: { position: 1, finalState: "FAILED" },
    createdAt: "2026-06-03T12:00:07.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-observe",
    eventType: "BATCH_EXECUTION_FAILED",
    message: "Execution failed",
    jobId: null,
    details: { stoppedReason: "failed" },
    createdAt: "2026-06-03T12:00:08.000Z",
  });

  jobStore.seed(migrationJob({
    jobId: "job-complete",
    state: "COMPLETED",
    updatedAt: "2026-06-03T12:00:03.000Z",
    events: [{
      type: "JOB_COMPLETED",
      timestamp: "2026-06-03T12:00:03.000Z",
      message: "Migration job completed",
    }],
  }));
  jobStore.seed(migrationJob({
    jobId: "job-failed",
    state: "FAILED",
    updatedAt: "2026-06-03T12:00:07.000Z",
    failedStage: "INTAKE",
    errorMessage: "Malformed HTML blocked intake",
    events: [{
      type: "STAGE_FAILED",
      timestamp: "2026-06-03T12:00:06.000Z",
      stage: "INTAKE",
      message: "Malformed HTML blocked intake",
      details: { code: "STAGE_FAILED" },
    }, {
      type: "JOB_FAILED",
      timestamp: "2026-06-03T12:00:07.000Z",
      stage: "INTAKE",
      message: "Migration job failed at stage INTAKE",
      details: { code: "STAGE_FAILED" },
    }],
  }));
  jobStore.seed(migrationJob({
    jobId: "job-pending",
    state: "PENDING",
    updatedAt: "2026-06-03T11:59:03.000Z",
  }));

  return { batchStore, jobStore };
}

test("migration batch observability derives summary, failures, diagnostics, and latest event", async () => {
  const { batchStore, jobStore } = seedObservableBatch();

  const observability = await buildMigrationBatchObservability({
    batchStore,
    jobStore,
    batchId: "batch-observe",
    now: () => "2026-06-03T12:01:00.000Z",
  });

  assert.ok(observability);
  assert.deepEqual(observability.summary, {
    batchId: "batch-observe",
    totalJobs: 3,
    completedJobs: 1,
    failedJobs: 1,
    pendingJobs: 1,
    runningJobs: 0,
    skippedJobs: 1,
    pausedJobs: 0,
    successRate: 33,
    progressPercent: 33,
    firstFailureJobId: "job-failed",
    firstFailureReason: "Malformed HTML blocked intake",
    lastExecutedJobId: "job-failed",
    lastCompletedJobId: "job-complete",
    latestEventAt: "2026-06-03T12:00:08.000Z",
  });
  assert.equal(observability.diagnostics.executionCount, 1);
  assert.equal(observability.diagnostics.runAttempts, 1);
  assert.equal(observability.diagnostics.lastRunStartedAt, "2026-06-03T12:00:01.000Z");
  assert.equal(observability.diagnostics.lastRunFinishedAt, "2026-06-03T12:00:08.000Z");
  assert.equal(observability.diagnostics.lastExecutionDurationMs, 7000);
  assert.deepEqual(observability.diagnostics.currentlyRunnableJobs, ["job-failed", "job-pending"]);
  assert.deepEqual(observability.diagnostics.completedJobs, ["job-complete"]);
  assert.deepEqual(observability.failures.failedJobIds, ["job-failed"]);
  assert.deepEqual(observability.failures.failureCounts, { "job-failed": 3 });
  assert.equal(observability.failures.latestFailure?.jobId, "job-failed");
  assert.equal(observability.failures.latestFailure?.latestReason, "Malformed HTML blocked intake");
  assert.equal(observability.failures.latestFailure?.latestStage, "INTAKE");
  assert.equal(observability.failures.latestFailure?.failedStages[0]?.error?.message, "Malformed HTML blocked intake");
  assert.deepEqual(observability.failures.failureReasons["job-failed"], [
    "Malformed HTML blocked intake",
    "Unable to normalize imported markup",
  ]);
});

test("migration batch observability timeline ordering is deterministic", async () => {
  const batchStore = new FakeMigrationBatchStore();
  const jobStore = new FakeMigrationJobStore();
  batchStore.seedBatch({
    batchId: "batch-order",
    organizationId: null,
    agencyId: null,
    clientId: null,
    name: "Ordering batch",
    description: null,
    status: "completed",
    createdBy: null,
    createdAt: "2026-06-03T12:00:00.000Z",
    updatedAt: "2026-06-03T12:00:00.000Z",
    startedAt: "2026-06-03T12:00:00.000Z",
    completedAt: "2026-06-03T12:00:00.000Z",
    failedAt: null,
    metadata: {},
    diagnostics: {},
  });
  batchStore.seedJob({
    batchId: "batch-order",
    jobId: "job-order",
    siteId: "site-order",
    siteVersionId: null,
    sourceUrl: "https://order.example.com",
    position: 0,
    addedAt: "2026-06-03T12:00:00.000Z",
    metadata: {},
    jobStatus: "COMPLETED",
    jobCreatedAt: "2026-06-03T12:00:00.000Z",
    jobUpdatedAt: "2026-06-03T12:00:00.000Z",
    latestEventAt: "2026-06-03T12:00:00.000Z",
  });
  jobStore.seed(migrationJob({
    jobId: "job-order",
    state: "COMPLETED",
    updatedAt: "2026-06-03T12:00:00.000Z",
  }));
  batchStore.seedEvent({
    batchId: "batch-order",
    eventType: "BATCH_EXECUTION_COMPLETED",
    message: "Completed",
    jobId: null,
    details: {},
    createdAt: "2026-06-03T12:00:00.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-order",
    eventType: "BATCH_JOB_COMPLETED",
    message: "Job completed",
    jobId: "job-order",
    details: {},
    createdAt: "2026-06-03T12:00:00.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-order",
    eventType: "BATCH_EXECUTION_STARTED",
    message: "Started",
    jobId: null,
    details: {},
    createdAt: "2026-06-03T12:00:00.000Z",
  });
  batchStore.seedEvent({
    batchId: "batch-order",
    eventType: "BATCH_JOB_STARTED",
    message: "Job started",
    jobId: "job-order",
    details: {},
    createdAt: "2026-06-03T12:00:00.000Z",
  });

  const observability = await buildMigrationBatchObservability({
    batchStore,
    jobStore,
    batchId: "batch-order",
  });

  assert.ok(observability);
  assert.deepEqual(observability.timeline.map((entry) => entry.eventType), [
    "execution_started",
    "job_started",
    "job_completed",
    "execution_completed",
  ]);
});
