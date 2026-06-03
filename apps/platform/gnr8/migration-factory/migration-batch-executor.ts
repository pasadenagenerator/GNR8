import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import type {
  MigrationBatch,
  MigrationBatchJsonObject,
  MigrationBatchStatus,
} from "@/gnr8/migration-factory/migration-batch-types";
import type { MigrationExecutionReport, MigrationJobState } from "@/gnr8/migration-factory/migration-job-types";

export const MIGRATION_BATCH_EXECUTION_POLICIES = ["stop_on_failure", "continue_on_failure"] as const;
export type MigrationBatchExecutionPolicy = (typeof MIGRATION_BATCH_EXECUTION_POLICIES)[number];

export type MigrationBatchJobExecutionResult = {
  jobId: string;
  position: number;
  outcome: "skipped_completed" | "completed" | "failed";
  finalState: MigrationJobState | null;
  executionReport: MigrationExecutionReport | null;
  error: string | null;
};

export type MigrationBatchExecutionStoppedReason =
  | "batch_completed"
  | "completed"
  | "failed"
  | "partially_failed"
  | "max_jobs"
  | "no_eligible_jobs";

export type MigrationBatchExecutionSummary = {
  batchId: string;
  previousStatus: MigrationBatchStatus;
  nextStatus: MigrationBatchStatus;
  totalJobs: number;
  attemptedJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  stoppedReason: MigrationBatchExecutionStoppedReason;
  jobResults: MigrationBatchJobExecutionResult[];
  diagnostics: MigrationBatchJsonObject;
};

export type ExecuteMigrationBatchInput = {
  batchId: string;
  policy?: MigrationBatchExecutionPolicy;
  maxJobs?: number | null;
};

type MigrationBatchExecutorDeps = {
  batchStore: MigrationBatchStore;
  migrationFactory: {
    resumeMigrationJob(jobId: string): Promise<MigrationExecutionReport>;
  };
};

const RUNNABLE_BATCH_STATUSES = new Set<MigrationBatchStatus>([
  "draft",
  "ready",
  "paused",
  "partially_failed",
  "failed",
]);

function normalizePolicy(policy: MigrationBatchExecutionPolicy | undefined): MigrationBatchExecutionPolicy {
  if (!policy) return "stop_on_failure";
  if (!MIGRATION_BATCH_EXECUTION_POLICIES.includes(policy)) {
    throw new Error("400|policy must be stop_on_failure or continue_on_failure");
  }
  return policy;
}

function normalizeMaxJobs(maxJobs: number | null | undefined): number | null {
  if (maxJobs === null || maxJobs === undefined) return null;
  if (!Number.isInteger(maxJobs) || maxJobs <= 0) {
    throw new Error("400|maxJobs must be a positive integer");
  }
  return maxJobs;
}

function finalDiagnostics(input: {
  policy: MigrationBatchExecutionPolicy;
  maxJobs: number | null;
  attemptedJobs: number;
  completedJobs: number;
  failedJobs: number;
  skippedJobs: number;
  stoppedReason: MigrationBatchExecutionStoppedReason;
}): MigrationBatchJsonObject {
  return {
    phase: "4A",
    executionMode: "operator_driven_sequential",
    policy: input.policy,
    maxJobs: input.maxJobs,
    attemptedJobs: input.attemptedJobs,
    completedJobs: input.completedJobs,
    failedJobs: input.failedJobs,
    skippedJobs: input.skippedJobs,
    stoppedReason: input.stoppedReason,
  };
}

function assertRunnableBatch(batch: MigrationBatch): void {
  if (batch.status === "running") {
    throw new Error("409|Migration batch is already running");
  }
  if (batch.status === "cancelled") {
    throw new Error("409|Cancelled migration batch cannot be run");
  }
  if (batch.status !== "completed" && !RUNNABLE_BATCH_STATUSES.has(batch.status)) {
    throw new Error(`409|Migration batch cannot be run from status ${batch.status}`);
  }
}

export class MigrationBatchExecutor {
  private readonly batchStore: MigrationBatchStore;
  private readonly migrationFactory: MigrationBatchExecutorDeps["migrationFactory"];

  constructor(deps: MigrationBatchExecutorDeps) {
    this.batchStore = deps.batchStore;
    this.migrationFactory = deps.migrationFactory;
  }

  async execute(input: ExecuteMigrationBatchInput): Promise<MigrationBatchExecutionSummary> {
    const batchId = String(input.batchId ?? "").trim();
    if (!batchId) throw new Error("400|batchId is required");
    const policy = normalizePolicy(input.policy);
    const maxJobs = normalizeMaxJobs(input.maxJobs);

    const batch = await this.batchStore.getBatch(batchId);
    if (!batch) throw new Error(`404|Migration batch not found: ${batchId}`);
    assertRunnableBatch(batch);

    const jobs = await this.batchStore.listBatchJobs(batchId);
    const skippedCompleted = jobs.filter((job) => job.jobStatus === "COMPLETED");
    const skippedResults: MigrationBatchJobExecutionResult[] = skippedCompleted.map((job) => ({
      jobId: job.jobId,
      position: job.position,
      outcome: "skipped_completed",
      finalState: job.jobStatus,
      executionReport: null,
      error: null,
    }));

    if (batch.status === "completed") {
      return {
        batchId,
        previousStatus: batch.status,
        nextStatus: batch.status,
        totalJobs: jobs.length,
        attemptedJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        skippedJobs: skippedResults.length,
        stoppedReason: "batch_completed",
        jobResults: skippedResults,
        diagnostics: finalDiagnostics({
          policy,
          maxJobs,
          attemptedJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          skippedJobs: skippedResults.length,
          stoppedReason: "batch_completed",
        }),
      };
    }

    await this.batchStore.updateBatchStatus({
      batchId,
      status: "running",
      diagnostics: {
        phase: "4A",
        executionMode: "operator_driven_sequential",
        policy,
        maxJobs,
      },
    });
    await this.batchStore.appendBatchEvent({
      batchId,
      eventType: "BATCH_EXECUTION_STARTED",
      message: "Migration batch execution started",
      details: { policy, maxJobs, totalJobs: jobs.length, skippedCompletedJobs: skippedResults.length },
    });

    const jobResults: MigrationBatchJobExecutionResult[] = [...skippedResults];
    let attemptedJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;
    let stoppedByLimit = false;
    let stoppedByFailure = false;

    for (const job of jobs) {
      if (job.jobStatus === "COMPLETED") continue;
      if (maxJobs !== null && attemptedJobs >= maxJobs) {
        stoppedByLimit = true;
        break;
      }

      await this.batchStore.appendBatchEvent({
        batchId,
        eventType: "BATCH_JOB_STARTED",
        message: "Migration batch job execution started",
        jobId: job.jobId,
        details: { position: job.position },
      });

      attemptedJobs += 1;
      try {
        const executionReport = await this.migrationFactory.resumeMigrationJob(job.jobId);
        if (executionReport.finalState === "COMPLETED") {
          completedJobs += 1;
          jobResults.push({
            jobId: job.jobId,
            position: job.position,
            outcome: "completed",
            finalState: executionReport.finalState,
            executionReport,
            error: null,
          });
          await this.batchStore.appendBatchEvent({
            batchId,
            eventType: "BATCH_JOB_COMPLETED",
            message: "Migration batch job completed",
            jobId: job.jobId,
            details: { position: job.position, finalState: executionReport.finalState },
          });
          continue;
        }

        failedJobs += 1;
        jobResults.push({
          jobId: job.jobId,
          position: job.position,
          outcome: "failed",
          finalState: executionReport.finalState,
          executionReport,
          error: null,
        });
        await this.batchStore.appendBatchEvent({
          batchId,
          eventType: "BATCH_JOB_FAILED",
          message: "Migration batch job did not complete",
          jobId: job.jobId,
          details: { position: job.position, finalState: executionReport.finalState },
        });
      } catch (error) {
        failedJobs += 1;
        const message = error instanceof Error ? error.message : "Migration batch job execution failed";
        jobResults.push({
          jobId: job.jobId,
          position: job.position,
          outcome: "failed",
          finalState: null,
          executionReport: null,
          error: message,
        });
        await this.batchStore.appendBatchEvent({
          batchId,
          eventType: "BATCH_JOB_FAILED",
          message,
          jobId: job.jobId,
          details: { position: job.position },
        });
      }

      if (policy === "stop_on_failure") {
        stoppedByFailure = true;
        break;
      }
    }

    const latestJobs = await this.batchStore.listBatchJobs(batchId);
    const allJobsCompleted = latestJobs.every((job) => job.jobStatus === "COMPLETED");
    const hasAnyFailure = failedJobs > 0 || latestJobs.some((job) => job.jobStatus === "FAILED");

    const stoppedReason: MigrationBatchExecutionStoppedReason =
      stoppedByFailure
        ? "failed"
        : stoppedByLimit && !allJobsCompleted
          ? "max_jobs"
          : allJobsCompleted
            ? completedJobs === 0 && failedJobs === 0
              ? "no_eligible_jobs"
              : "completed"
            : hasAnyFailure
              ? "partially_failed"
              : "completed";

    const nextStatus: MigrationBatchStatus =
      stoppedReason === "failed"
        ? "failed"
        : stoppedReason === "max_jobs"
          ? "paused"
          : stoppedReason === "partially_failed"
            ? "partially_failed"
            : "completed";

    const diagnostics = finalDiagnostics({
      policy,
      maxJobs,
      attemptedJobs,
      completedJobs,
      failedJobs,
      skippedJobs: skippedResults.length,
      stoppedReason,
    });

    const finalEventType =
      nextStatus === "failed"
        ? "BATCH_EXECUTION_FAILED"
        : nextStatus === "partially_failed"
          ? "BATCH_EXECUTION_PARTIALLY_FAILED"
          : nextStatus === "paused"
            ? "BATCH_EXECUTION_PAUSED_BY_LIMIT"
            : "BATCH_EXECUTION_COMPLETED";

    await this.batchStore.appendBatchEvent({
      batchId,
      eventType: finalEventType,
      message:
        nextStatus === "paused"
          ? "Migration batch execution paused by maxJobs limit"
          : `Migration batch execution ${nextStatus}`,
      details: diagnostics,
    });
    await this.batchStore.updateBatchStatus({ batchId, status: nextStatus, diagnostics });

    return {
      batchId,
      previousStatus: batch.status,
      nextStatus,
      totalJobs: jobs.length,
      attemptedJobs,
      completedJobs,
      failedJobs,
      skippedJobs: skippedResults.length,
      stoppedReason,
      jobResults: jobResults.sort((a, b) => a.position - b.position || a.jobId.localeCompare(b.jobId)),
      diagnostics,
    };
  }
}
