import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import type {
  MigrationBatch,
  MigrationBatchEvent,
  MigrationBatchJsonObject,
  MigrationBatchJobSummary,
} from "@/gnr8/migration-factory/migration-batch-types";
import type { MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type {
  MigrationExecutionEvent,
  MigrationJob,
  MigrationStage,
  MigrationStageDiagnostic,
  MigrationStageError,
  MigrationStageStatusRecord,
} from "@/gnr8/migration-factory/migration-job-types";
import { MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";

export type MigrationBatchTimelineEntryType =
  | "execution_started"
  | "job_started"
  | "job_completed"
  | "job_failed"
  | "execution_paused"
  | "execution_completed"
  | "execution_partially_failed"
  | "execution_failed";

export type MigrationBatchTimelineEntry = {
  timestamp: string;
  eventType: MigrationBatchTimelineEntryType;
  batchId: string;
  jobId: string | null;
  message: string;
  details: MigrationBatchJsonObject;
};

export type MigrationBatchExecutionSummaryReadModel = {
  batchId: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  runningJobs: number;
  skippedJobs: number;
  pausedJobs: number;
  successRate: number;
  progressPercent: number;
  firstFailureJobId: string | null;
  firstFailureReason: string | null;
  lastExecutedJobId: string | null;
  lastCompletedJobId: string | null;
  latestEventAt: string | null;
};

export type MigrationBatchFailureStage = {
  stage: MigrationStage;
  state: MigrationStageStatusRecord["state"];
  attempts: number;
  startedAt: string | null;
  endedAt: string | null;
  error: MigrationStageError | null;
  diagnostics: MigrationStageDiagnostic[];
};

export type MigrationBatchFailureItem = {
  jobId: string;
  count: number;
  latestAt: string | null;
  latestReason: string | null;
  latestStage: MigrationStage | null;
  currentStage: MigrationStage | null;
  lastError: MigrationStageError | null;
  failedStages: MigrationBatchFailureStage[];
  stageDiagnostics: MigrationBatchFailureStage[];
  latestFailureEvent: {
    type: string;
    timestamp: string;
    message: string;
    stage: MigrationStage | null;
    details: MigrationBatchJsonObject;
  } | null;
};

export type MigrationBatchFailureSurface = {
  failedJobIds: string[];
  failureCounts: Record<string, number>;
  latestFailure: MigrationBatchFailureItem | null;
  failureReasons: Record<string, string[]>;
  failures: MigrationBatchFailureItem[];
};

export type MigrationBatchDiagnosticsReadModel = {
  executionCount: number;
  runAttempts: number;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;
  lastExecutionDurationMs: number | null;
  currentlyRunnableJobs: string[];
  blockedJobs: string[];
  completedJobs: string[];
};

export type MigrationBatchObservability = {
  batch: {
    batchId: string;
    name: string;
    status: MigrationBatch["status"];
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    updatedAt: string;
  };
  summary: MigrationBatchExecutionSummaryReadModel;
  timeline: MigrationBatchTimelineEntry[];
  diagnostics: MigrationBatchDiagnosticsReadModel;
  failures: MigrationBatchFailureSurface;
  generatedAt: string;
};

type BuildMigrationBatchObservabilityInput = {
  batchStore: MigrationBatchStore;
  jobStore: MigrationJobStore;
  batchId: string;
  now?: () => string;
  batch?: MigrationBatch;
  jobSummaries?: MigrationBatchJobSummary[];
  batchEvents?: MigrationBatchEvent[];
  jobs?: Array<MigrationJob | null>;
};

type InternalTimelineEntry = MigrationBatchTimelineEntry & {
  sortKey: string;
  sortOrder: number;
};

const BATCH_EVENT_TYPE_MAP: Partial<Record<MigrationBatchEvent["eventType"], MigrationBatchTimelineEntryType>> = {
  BATCH_EXECUTION_STARTED: "execution_started",
  BATCH_JOB_STARTED: "job_started",
  BATCH_JOB_COMPLETED: "job_completed",
  BATCH_JOB_FAILED: "job_failed",
  BATCH_EXECUTION_COMPLETED: "execution_completed",
  BATCH_EXECUTION_PARTIALLY_FAILED: "execution_partially_failed",
  BATCH_EXECUTION_FAILED: "execution_failed",
  BATCH_EXECUTION_PAUSED_BY_LIMIT: "execution_paused",
};

const JOB_EVENT_TYPE_MAP: Partial<Record<MigrationExecutionEvent["type"], MigrationBatchTimelineEntryType>> = {
  JOB_STARTED: "job_started",
  JOB_RESUMED: "job_started",
  JOB_COMPLETED: "job_completed",
  JOB_FAILED: "job_failed",
};

const RUNNABLE_JOB_STATES = new Set(["PENDING", "PAUSED", "FAILED"]);

function jsonObject(value: unknown): MigrationBatchJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as MigrationBatchJsonObject;
}

function numericDetail(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function timestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? null : millis;
}

function latestIso(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => (timestampMs(a) ?? 0) - (timestampMs(b) ?? 0) || a.localeCompare(b));
  return sorted.at(-1) ?? null;
}

function sortOrderFor(eventType: MigrationBatchTimelineEntryType): number {
  switch (eventType) {
    case "execution_started":
      return 10;
    case "job_started":
      return 20;
    case "job_completed":
      return 30;
    case "job_failed":
      return 31;
    case "execution_paused":
      return 40;
    case "execution_completed":
      return 41;
    case "execution_partially_failed":
      return 42;
    case "execution_failed":
      return 43;
  }
}

function timelineEntry(input: MigrationBatchTimelineEntry): InternalTimelineEntry {
  return {
    ...input,
    details: jsonObject(input.details),
    sortKey: `${input.timestamp}:${sortOrderFor(input.eventType)}:${input.jobId ?? ""}:${input.message}`,
    sortOrder: sortOrderFor(input.eventType),
  };
}

function visibleTimeline(entries: InternalTimelineEntry[]): MigrationBatchTimelineEntry[] {
  return entries
    .sort((a, b) => {
      const timeDiff = (timestampMs(a.timestamp) ?? 0) - (timestampMs(b.timestamp) ?? 0);
      if (timeDiff !== 0) return timeDiff;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.sortKey.localeCompare(b.sortKey);
    })
    .map(({ sortKey: _sortKey, sortOrder: _sortOrder, ...entry }) => entry);
}

function buildBatchTimelineEntries(batchEvents: MigrationBatchEvent[]): InternalTimelineEntry[] {
  return batchEvents.flatMap((event) => {
    const eventType = BATCH_EVENT_TYPE_MAP[event.eventType];
    if (!eventType) return [];
    return [
      timelineEntry({
        timestamp: event.createdAt,
        eventType,
        batchId: event.batchId,
        jobId: event.jobId,
        message: event.message,
        details: {
          ...jsonObject(event.details),
          source: "batch_event",
          sourceEventType: event.eventType,
        },
      }),
    ];
  });
}

function buildJobFallbackTimelineEntries(input: {
  batchId: string;
  jobs: Array<MigrationJob | null>;
  existingTimeline: InternalTimelineEntry[];
}): InternalTimelineEntry[] {
  const existingKeys = new Set(
    input.existingTimeline
      .filter((entry) => entry.jobId)
      .map((entry) => `${entry.jobId}:${entry.eventType}`),
  );

  const entries: InternalTimelineEntry[] = [];
  for (const job of input.jobs) {
    if (!job) continue;
    for (const event of job.executionEvents) {
      const eventType = JOB_EVENT_TYPE_MAP[event.type];
      if (!eventType) continue;
      const existingKey = `${job.jobId}:${eventType}`;
      if (existingKeys.has(existingKey)) continue;
      entries.push(timelineEntry({
        timestamp: event.timestamp,
        eventType,
        batchId: input.batchId,
        jobId: job.jobId,
        message: event.message,
        details: {
          ...jsonObject(event.details),
          source: "migration_job_event",
          sourceEventType: event.type,
          stage: event.stage,
        },
      }));
      existingKeys.add(existingKey);
    }
  }
  return entries;
}

function buildSyntheticTimelineEntries(input: {
  batch: MigrationBatch;
  jobs: MigrationBatchJobSummary[];
  existingTimeline: InternalTimelineEntry[];
}): InternalTimelineEntry[] {
  const entries: InternalTimelineEntry[] = [];
  const hasExecutionStart = input.existingTimeline.some((entry) => entry.eventType === "execution_started");
  if (!hasExecutionStart && input.batch.startedAt) {
    entries.push(timelineEntry({
      timestamp: input.batch.startedAt,
      eventType: "execution_started",
      batchId: input.batch.batchId,
      jobId: null,
      message: "Migration batch execution started",
      details: { source: "batch_status" },
    }));
  }

  const finalType =
    input.batch.status === "completed"
      ? "execution_completed"
      : input.batch.status === "partially_failed"
        ? "execution_partially_failed"
        : input.batch.status === "failed"
          ? "execution_failed"
          : input.batch.status === "paused"
            ? "execution_paused"
            : null;
  if (finalType && !input.existingTimeline.some((entry) => entry.eventType === finalType)) {
    const timestamp = input.batch.completedAt ?? input.batch.failedAt ?? input.batch.updatedAt;
    entries.push(timelineEntry({
      timestamp,
      eventType: finalType,
      batchId: input.batch.batchId,
      jobId: null,
      message: `Migration batch execution ${input.batch.status}`,
      details: { source: "batch_status" },
    }));
  }

  const existingJobKeys = new Set(
    input.existingTimeline
      .filter((entry) => entry.jobId)
      .map((entry) => `${entry.jobId}:${entry.eventType}`),
  );
  for (const job of input.jobs) {
    if (job.jobStatus === "COMPLETED" && !existingJobKeys.has(`${job.jobId}:job_completed`)) {
      entries.push(timelineEntry({
        timestamp: job.latestEventAt ?? job.jobUpdatedAt,
        eventType: "job_completed",
        batchId: input.batch.batchId,
        jobId: job.jobId,
        message: "Migration batch job completed",
        details: { source: "migration_job_status", position: job.position, finalState: job.jobStatus },
      }));
    }
    if (job.jobStatus === "FAILED" && !existingJobKeys.has(`${job.jobId}:job_failed`)) {
      entries.push(timelineEntry({
        timestamp: job.latestEventAt ?? job.jobUpdatedAt,
        eventType: "job_failed",
        batchId: input.batch.batchId,
        jobId: job.jobId,
        message: "Migration batch job failed",
        details: { source: "migration_job_status", position: job.position, finalState: job.jobStatus },
      }));
    }
  }

  return entries;
}

function failedStageRecords(job: MigrationJob): MigrationBatchFailureStage[] {
  return MIGRATION_STAGE_ORDER.flatMap((stage) => {
    const record = job.stageStates[stage];
    if (record.state !== "FAILED" && !record.error) return [];
    return [{
      stage,
      state: record.state,
      attempts: record.attempts,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      error: record.error,
      diagnostics: record.diagnostics,
    }];
  });
}

function diagnosticStageRecords(job: MigrationJob): MigrationBatchFailureStage[] {
  return MIGRATION_STAGE_ORDER.flatMap((stage) => {
    const record = job.stageStates[stage];
    if (record.diagnostics.length === 0 && !record.error) return [];
    return [{
      stage,
      state: record.state,
      attempts: record.attempts,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      error: record.error,
      diagnostics: record.diagnostics,
    }];
  });
}

function jobFailureEvents(job: MigrationJob): Array<{
  type: string;
  timestamp: string;
  message: string;
  stage: MigrationStage | null;
  details: MigrationBatchJsonObject;
}> {
  return job.executionEvents
    .filter((event) => event.type === "JOB_FAILED" || event.type === "STAGE_FAILED" || event.type === "ACTIVATION_EXECUTION_FAILED")
    .map((event) => ({
      type: event.type,
      timestamp: event.timestamp,
      message: event.message,
      stage: event.stage ?? null,
      details: jsonObject(event.details),
    }));
}

function batchFailureEventsForJob(batchEvents: MigrationBatchEvent[], jobId: string) {
  return batchEvents
    .filter((event) => event.jobId === jobId && event.eventType === "BATCH_JOB_FAILED")
    .map((event) => ({
      type: event.eventType,
      timestamp: event.createdAt,
      message: event.message,
      stage: null,
      details: jsonObject(event.details),
    }));
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildFailures(input: {
  batchEvents: MigrationBatchEvent[];
  jobSummaries: MigrationBatchJobSummary[];
  jobs: Array<MigrationJob | null>;
}): MigrationBatchFailureSurface {
  const jobsById = new Map(input.jobs.filter((job): job is MigrationJob => job !== null).map((job) => [job.jobId, job]));
  const failedJobIds = uniqueStrings([
    ...input.jobSummaries.filter((job) => job.jobStatus === "FAILED").map((job) => job.jobId),
    ...input.batchEvents.filter((event) => event.eventType === "BATCH_JOB_FAILED").map((event) => event.jobId),
    ...input.jobs.flatMap((job) => (job ? jobFailureEvents(job).map(() => job.jobId) : [])),
  ]).sort((a, b) => {
    const aPosition = input.jobSummaries.find((job) => job.jobId === a)?.position ?? Number.MAX_SAFE_INTEGER;
    const bPosition = input.jobSummaries.find((job) => job.jobId === b)?.position ?? Number.MAX_SAFE_INTEGER;
    return aPosition - bPosition || a.localeCompare(b);
  });

  const failures = failedJobIds.map((jobId) => {
    const job = jobsById.get(jobId) ?? null;
    const batchFailureEvents = batchFailureEventsForJob(input.batchEvents, jobId);
    const persistedFailureEvents = job ? jobFailureEvents(job) : [];
    const failureEvents = [...batchFailureEvents, ...persistedFailureEvents].sort((a, b) => {
      const timeDiff = (timestampMs(a.timestamp) ?? 0) - (timestampMs(b.timestamp) ?? 0);
      if (timeDiff !== 0) return timeDiff;
      return a.type.localeCompare(b.type);
    });
    const failedStages = job ? failedStageRecords(job) : [];
    const stageDiagnostics = job ? diagnosticStageRecords(job) : [];
    const latestFailureEvent = failureEvents.at(-1) ?? null;
    const latestFailedStage = failedStages
      .filter((stage) => stage.endedAt)
      .sort((a, b) => (timestampMs(a.endedAt) ?? 0) - (timestampMs(b.endedAt) ?? 0))
      .at(-1) ?? failedStages[0] ?? null;
    const latestReason =
      job?.lastError?.message ??
      latestFailureEvent?.message ??
      latestFailedStage?.error?.message ??
      job?.lastExecutionReport?.stageDiagnostics.find((stage) => stage.error)?.error?.message ??
      null;
    const latestAt = latestIso([
      latestFailureEvent?.timestamp,
      latestFailedStage?.endedAt,
      job?.updatedAt,
    ]);
    return {
      jobId,
      count: Math.max(failureEvents.length, job?.overallState === "FAILED" ? 1 : 0),
      latestAt,
      latestReason,
      latestStage: latestFailureEvent?.stage ?? latestFailedStage?.stage ?? job?.lastExecutionReport?.failedStage ?? null,
      currentStage: job?.currentStage ?? null,
      lastError: job?.lastError ?? null,
      failedStages,
      stageDiagnostics,
      latestFailureEvent,
    };
  });

  const sortedFailures = failures.sort((a, b) => {
    const aTime = timestampMs(a.latestAt) ?? 0;
    const bTime = timestampMs(b.latestAt) ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.jobId.localeCompare(b.jobId);
  });
  const failureCounts = Object.fromEntries(sortedFailures.map((failure) => [failure.jobId, failure.count]));
  const failureReasons = Object.fromEntries(
    sortedFailures.map((failure) => [
      failure.jobId,
      uniqueStrings([
        failure.latestReason,
        failure.lastError?.message,
        ...failure.failedStages.map((stage) => stage.error?.message),
        ...failure.stageDiagnostics.flatMap((stage) => stage.diagnostics.map((diagnostic) => diagnostic.message)),
      ]),
    ]),
  );

  return {
    failedJobIds,
    failureCounts,
    latestFailure: sortedFailures.at(-1) ?? null,
    failureReasons,
    failures: sortedFailures,
  };
}

function lastTimelineJobId(timeline: MigrationBatchTimelineEntry[], eventType: MigrationBatchTimelineEntryType): string | null {
  return timeline.filter((entry) => entry.eventType === eventType && entry.jobId).at(-1)?.jobId ?? null;
}

function firstFailure(timeline: MigrationBatchTimelineEntry[], failures: MigrationBatchFailureSurface) {
  const timelineFailure = timeline.find((entry) => entry.eventType === "job_failed" && entry.jobId);
  if (timelineFailure?.jobId) {
    return {
      jobId: timelineFailure.jobId,
      reason: failures.failures.find((failure) => failure.jobId === timelineFailure.jobId)?.latestReason ?? timelineFailure.message,
    };
  }
  const failure = failures.failures[0];
  return failure ? { jobId: failure.jobId, reason: failure.latestReason } : { jobId: null, reason: null };
}

function buildDiagnostics(input: {
  batch: MigrationBatch;
  jobs: MigrationBatchJobSummary[];
  timeline: MigrationBatchTimelineEntry[];
}): MigrationBatchDiagnosticsReadModel {
  const executionStarts = input.timeline.filter((entry) => entry.eventType === "execution_started");
  const finalEvents = input.timeline.filter((entry) =>
    entry.eventType === "execution_completed" ||
    entry.eventType === "execution_partially_failed" ||
    entry.eventType === "execution_failed" ||
    entry.eventType === "execution_paused"
  );
  const lastRunStartedAt = executionStarts.at(-1)?.timestamp ?? input.batch.startedAt;
  const lastRunFinishedAt = finalEvents.at(-1)?.timestamp ?? input.batch.completedAt ?? input.batch.failedAt;
  const startedMs = timestampMs(lastRunStartedAt);
  const finishedMs = timestampMs(lastRunFinishedAt);

  return {
    executionCount: executionStarts.length,
    runAttempts: executionStarts.length,
    lastRunStartedAt,
    lastRunFinishedAt,
    lastExecutionDurationMs: startedMs !== null && finishedMs !== null && finishedMs >= startedMs ? finishedMs - startedMs : null,
    currentlyRunnableJobs: input.jobs
      .filter((job) => RUNNABLE_JOB_STATES.has(job.jobStatus))
      .map((job) => job.jobId),
    blockedJobs: input.jobs
      .filter((job) => job.jobStatus === "RUNNING")
      .map((job) => job.jobId),
    completedJobs: input.jobs
      .filter((job) => job.jobStatus === "COMPLETED")
      .map((job) => job.jobId),
  };
}

export async function buildMigrationBatchObservability(
  input: BuildMigrationBatchObservabilityInput,
): Promise<MigrationBatchObservability | null> {
  const batchId = String(input.batchId ?? "").trim();
  if (!batchId) throw new Error("400|batchId is required");

  const batch = input.batch ?? await input.batchStore.getBatch(batchId);
  if (!batch) return null;

  const [jobSummaries, batchEvents] = input.jobSummaries && input.batchEvents
    ? [input.jobSummaries, input.batchEvents]
    : await Promise.all([
      input.batchStore.listBatchJobs(batchId),
      input.batchStore.listBatchEvents(batchId),
    ]);
  const jobs = input.jobs ?? await Promise.all(jobSummaries.map((job) => input.jobStore.getJob(job.jobId)));

  const batchTimeline = buildBatchTimelineEntries(batchEvents);
  const timeline = visibleTimeline([
    ...batchTimeline,
    ...buildJobFallbackTimelineEntries({ batchId, jobs, existingTimeline: batchTimeline }),
    ...buildSyntheticTimelineEntries({ batch, jobs: jobSummaries, existingTimeline: batchTimeline }),
  ]);
  const failures = buildFailures({ batchEvents, jobSummaries, jobs });
  const firstFailureInfo = firstFailure(timeline, failures);
  const completedJobs = jobSummaries.filter((job) => job.jobStatus === "COMPLETED").length;
  const totalJobs = jobSummaries.length;
  const latestEventAt = latestIso([
    ...timeline.map((entry) => entry.timestamp),
    ...jobSummaries.map((job) => job.latestEventAt),
    batch.startedAt,
    batch.completedAt,
    batch.failedAt,
    batch.updatedAt,
  ]);
  const skippedJobs = numericDetail(batch.diagnostics.skippedJobs) ?? 0;

  const summary: MigrationBatchExecutionSummaryReadModel = {
    batchId,
    totalJobs,
    completedJobs,
    failedJobs: jobSummaries.filter((job) => job.jobStatus === "FAILED").length,
    pendingJobs: jobSummaries.filter((job) => job.jobStatus === "PENDING").length,
    runningJobs: jobSummaries.filter((job) => job.jobStatus === "RUNNING").length,
    skippedJobs,
    pausedJobs: jobSummaries.filter((job) => job.jobStatus === "PAUSED").length,
    successRate: percentage(completedJobs, totalJobs),
    progressPercent: percentage(completedJobs, totalJobs),
    firstFailureJobId: firstFailureInfo.jobId,
    firstFailureReason: firstFailureInfo.reason,
    lastExecutedJobId: lastTimelineJobId(timeline, "job_started"),
    lastCompletedJobId: lastTimelineJobId(timeline, "job_completed") ??
      jobSummaries.filter((job) => job.jobStatus === "COMPLETED").at(-1)?.jobId ??
      null,
    latestEventAt,
  };

  return {
    batch: {
      batchId: batch.batchId,
      name: batch.name,
      status: batch.status,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      failedAt: batch.failedAt,
      updatedAt: batch.updatedAt,
    },
    summary,
    timeline,
    diagnostics: buildDiagnostics({ batch, jobs: jobSummaries, timeline }),
    failures,
    generatedAt: input.now?.() ?? new Date().toISOString(),
  };
}
