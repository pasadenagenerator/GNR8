import assert from "node:assert/strict";
import test from "node:test";

import {
  composeMigrationBatchDetailPayload,
} from "../_lib/migration-batches-service";
import { normalizeMigrationBatchDetailPayload } from "../_lib/migration-batches-view-model";
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
import type { MigrationExecutionEvent, MigrationJob } from "@/gnr8/migration-factory/migration-job-types";
import { createInitialStageStates } from "@/gnr8/migration-factory/migration-stage-machine";

const batch: MigrationBatch = {
  batchId: "batch-composed-read",
  organizationId: null,
  agencyId: null,
  clientId: null,
  name: "Composed read batch",
  description: "Detail page DB pressure regression coverage",
  status: "failed",
  createdBy: null,
  createdAt: "2026-06-03T12:00:00.000Z",
  updatedAt: "2026-06-03T12:10:00.000Z",
  startedAt: "2026-06-03T12:01:00.000Z",
  completedAt: null,
  failedAt: "2026-06-03T12:10:00.000Z",
  metadata: {},
  diagnostics: {},
};

function migrationJob(input: {
  jobId: string;
  state: MigrationJob["overallState"];
  events?: MigrationExecutionEvent[];
  failed?: boolean;
}): MigrationJob {
  const stageStates = createInitialStageStates();
  if (input.failed) {
    stageStates.INTAKE = {
      ...stageStates.INTAKE,
      state: "FAILED",
      startedAt: "2026-06-03T12:06:00.000Z",
      endedAt: "2026-06-03T12:06:30.000Z",
      attempts: 1,
      diagnostics: [{
        code: "SOURCE_500",
        message: "Source URL returned 500",
        level: "ERROR",
      }],
      error: {
        code: "SOURCE_500",
        message: "Source URL returned 500",
      },
    };
  }

  return {
    jobId: input.jobId,
    siteId: `site-${input.jobId}`,
    sourceUrl: `https://${input.jobId}.example.com`,
    overallState: input.state,
    currentStage: input.failed ? "INTAKE" : null,
    stageStates,
    createdAt: "2026-06-03T12:00:00.000Z",
    updatedAt: input.failed ? "2026-06-03T12:06:30.000Z" : "2026-06-03T12:03:00.000Z",
    lastError: input.failed ? {
      code: "SOURCE_500",
      message: "Source URL returned 500",
    } : null,
    lastExecutionReport: null,
    lastActivationExecutionResult: null,
    activationExecutionHistory: [],
    executionEvents: input.events ?? [],
  };
}

class CountingBatchStore implements MigrationBatchStore {
  getBatchCalls = 0;
  listBatchJobsCalls = 0;
  listBatchEventsCalls = 0;

  private readonly jobs: MigrationBatchJobSummary[] = [
    {
      batchId: batch.batchId,
      jobId: "job-complete",
      siteId: "site-complete",
      siteVersionId: null,
      sourceUrl: "https://complete.example.com",
      position: 0,
      addedAt: "2026-06-03T12:00:30.000Z",
      metadata: {},
      jobStatus: "COMPLETED",
      jobCreatedAt: "2026-06-03T12:00:30.000Z",
      jobUpdatedAt: "2026-06-03T12:03:00.000Z",
      latestEventAt: "2026-06-03T12:03:00.000Z",
    },
    {
      batchId: batch.batchId,
      jobId: "job-failed",
      siteId: "site-failed",
      siteVersionId: null,
      sourceUrl: "https://failed.example.com",
      position: 1,
      addedAt: "2026-06-03T12:00:40.000Z",
      metadata: {},
      jobStatus: "FAILED",
      jobCreatedAt: "2026-06-03T12:00:40.000Z",
      jobUpdatedAt: "2026-06-03T12:06:30.000Z",
      latestEventAt: "2026-06-03T12:06:30.000Z",
    },
  ];

  private readonly events: MigrationBatchEvent[] = [
    {
      id: "event-started",
      batchId: batch.batchId,
      eventType: "BATCH_EXECUTION_STARTED",
      message: "Migration batch execution started",
      jobId: null,
      details: {},
      createdAt: "2026-06-03T12:01:00.000Z",
    },
    {
      id: "event-completed",
      batchId: batch.batchId,
      eventType: "BATCH_JOB_COMPLETED",
      message: "Migration batch job completed",
      jobId: "job-complete",
      details: {},
      createdAt: "2026-06-03T12:03:00.000Z",
    },
    {
      id: "event-failed",
      batchId: batch.batchId,
      eventType: "BATCH_JOB_FAILED",
      message: "Source URL returned 500",
      jobId: "job-failed",
      details: {},
      createdAt: "2026-06-03T12:06:30.000Z",
    },
  ];

  async getBatch(batchId: string): Promise<MigrationBatch | null> {
    this.getBatchCalls += 1;
    return batchId === batch.batchId ? batch : null;
  }

  async listBatchJobs(batchId: string): Promise<MigrationBatchJobSummary[]> {
    this.listBatchJobsCalls += 1;
    return this.jobs.filter((job) => job.batchId === batchId);
  }

  async listBatchEvents(batchId: string): Promise<MigrationBatchEvent[]> {
    this.listBatchEventsCalls += 1;
    return this.events.filter((event) => event.batchId === batchId);
  }

  async createBatch(_input: CreateMigrationBatchInput): Promise<MigrationBatch> {
    throw new Error("Not implemented");
  }

  async listBatches(): Promise<MigrationBatchWithSummary[]> {
    throw new Error("Not implemented");
  }

  async addJobToBatch(_input: AddMigrationJobToBatchInput): Promise<MigrationBatchJob> {
    throw new Error("Not implemented");
  }

  async removeJobFromBatch(_batchId: string, _jobId: string): Promise<boolean> {
    throw new Error("Not implemented");
  }

  async getBatchSummary(_batchId: string): Promise<MigrationBatchSummary | null> {
    throw new Error("Not implemented");
  }

  async updateBatchStatus(_input: UpdateMigrationBatchStatusInput): Promise<MigrationBatch> {
    throw new Error("Not implemented");
  }

  async appendBatchEvent(_input: AppendMigrationBatchEventInput): Promise<MigrationBatchEvent> {
    throw new Error("Not implemented");
  }
}

class CountingJobStore implements MigrationJobStore {
  readonly getJobIds: string[] = [];

  private readonly jobs = new Map([
    ["job-complete", migrationJob({
      jobId: "job-complete",
      state: "COMPLETED",
      events: [{
        type: "JOB_COMPLETED",
        timestamp: "2026-06-03T12:03:00.000Z",
        message: "Migration job completed",
      }],
    })],
    ["job-failed", migrationJob({
      jobId: "job-failed",
      state: "FAILED",
      failed: true,
      events: [{
        type: "JOB_FAILED",
        timestamp: "2026-06-03T12:06:30.000Z",
        stage: "INTAKE",
        message: "Source URL returned 500",
      }],
    })],
  ]);

  async getJob(jobId: string): Promise<MigrationJob | null> {
    this.getJobIds.push(jobId);
    return this.jobs.get(jobId) ?? null;
  }

  async createJob(): Promise<MigrationJob> {
    throw new Error("Not implemented");
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

test("migration batch detail payload composes observability through one server read path", async () => {
  const batchStore = new CountingBatchStore();
  const jobStore = new CountingJobStore();

  const payload = await composeMigrationBatchDetailPayload({
    batchId: batch.batchId,
    batchStore,
    jobStore,
    now: () => "2026-06-03T12:11:00.000Z",
  });

  assert.ok(payload);
  assert.equal(batchStore.getBatchCalls, 1);
  assert.equal(batchStore.listBatchJobsCalls, 1);
  assert.equal(batchStore.listBatchEventsCalls, 1);
  assert.deepEqual(jobStore.getJobIds, ["job-complete", "job-failed"]);

  const model = normalizeMigrationBatchDetailPayload(payload);
  assert.equal(model.batch?.summary.totalJobs, 2);
  assert.equal(model.batch?.summary.completedJobs, 1);
  assert.equal(model.batch?.summary.failedJobs, 1);
  assert.equal(model.batch?.diagnostics.executionCount, 1);
  assert.deepEqual(model.batch?.failures.failedJobIds, ["job-failed"]);
  assert.equal(model.batch?.failures.latestFailure?.latestReason, "Source URL returned 500");
  assert.deepEqual(model.batch?.timeline.map((entry) => entry.eventType), [
    "execution_started",
    "job_completed",
    "job_failed",
    "execution_failed",
  ]);
});
