export type MigrationBatchStatus =
  | "draft"
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "partially_failed";

export type MigrationBatchCounts = {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  pausedJobs: number;
  skippedJobs: number;
  progressPercent: number;
  latestEventAt: string | null;
};

export type MigrationBatchListItemViewModel = {
  batchId: string;
  name: string;
  status: MigrationBatchStatus;
  progressPercent: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  latestEventAt: string | null;
  createdAt: string | null;
  href: string;
};

export type MigrationBatchTimelineEntryViewModel = {
  timestamp: string | null;
  eventType: string;
  jobId: string | null;
  message: string;
};

export type MigrationBatchFailureItemViewModel = {
  jobId: string;
  count: number;
  latestAt: string | null;
  latestReason: string | null;
  latestStage: string | null;
};

export type MigrationBatchDetailViewModel = {
  batchId: string;
  name: string;
  description: string | null;
  status: MigrationBatchStatus;
  createdAt: string | null;
  updatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  summary: MigrationBatchCounts & {
    successRate: number;
    firstFailureJobId: string | null;
    firstFailureReason: string | null;
    lastExecutedJobId: string | null;
    lastCompletedJobId: string | null;
  };
  diagnostics: {
    executionCount: number;
    runAttempts: number;
    lastRunStartedAt: string | null;
    lastRunFinishedAt: string | null;
    lastExecutionDurationMs: number | null;
    currentlyRunnableJobs: string[];
    blockedJobs: string[];
    completedJobs: string[];
  };
  failures: {
    failedJobIds: string[];
    failureCounts: Record<string, number>;
    latestFailure: MigrationBatchFailureItemViewModel | null;
    failureReasons: Record<string, string[]>;
    failures: MigrationBatchFailureItemViewModel[];
  };
  timeline: MigrationBatchTimelineEntryViewModel[];
  generatedAt: string | null;
  runEndpoint: string;
  resumeEndpoint: string;
};

export type MigrationBatchListPageViewModel = {
  batches: MigrationBatchListItemViewModel[];
  fetchError: string | null;
};

export type MigrationBatchDetailPageViewModel = {
  batch: MigrationBatchDetailViewModel | null;
  fetchError: string | null;
};

type JsonObject = Record<string, unknown>;

const STATUS_SET = new Set<MigrationBatchStatus>([
  "draft",
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
  "partially_failed",
]);

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function nullableToken(value: unknown): string | null {
  const normalized = token(value);
  return normalized || null;
}

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function stringList(value: unknown): string[] {
  return list(value).map(token).filter(Boolean);
}

function normalizeStatus(value: unknown): MigrationBatchStatus {
  const normalized = token(value);
  return STATUS_SET.has(normalized as MigrationBatchStatus) ? (normalized as MigrationBatchStatus) : "draft";
}

function normalizeCounts(value: unknown): MigrationBatchCounts {
  const counts = object(value);
  return {
    totalJobs: numberValue(counts.totalJobs),
    pendingJobs: numberValue(counts.pendingJobs),
    runningJobs: numberValue(counts.runningJobs),
    completedJobs: numberValue(counts.completedJobs),
    failedJobs: numberValue(counts.failedJobs),
    pausedJobs: numberValue(counts.pausedJobs),
    skippedJobs: numberValue(counts.skippedJobs),
    progressPercent: numberValue(counts.progressPercent),
    latestEventAt: nullableToken(counts.latestEventAt),
  };
}

function normalizeFailureItem(value: unknown): MigrationBatchFailureItemViewModel {
  const failure = object(value);
  return {
    jobId: token(failure.jobId),
    count: numberValue(failure.count),
    latestAt: nullableToken(failure.latestAt),
    latestReason: nullableToken(failure.latestReason),
    latestStage: nullableToken(failure.latestStage),
  };
}

function normalizeFailureReasons(value: unknown): Record<string, string[]> {
  const reasons = object(value);
  return Object.fromEntries(
    Object.entries(reasons).map(([jobId, values]) => [jobId, stringList(values)]),
  );
}

function normalizeFailureCounts(value: unknown): Record<string, number> {
  const counts = object(value);
  return Object.fromEntries(
    Object.entries(counts).map(([jobId, count]) => [jobId, numberValue(count)]),
  );
}

export function formatMigrationBatchTimestamp(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatMigrationBatchDuration(durationMs: number | null | undefined): string {
  if (!Number.isFinite(durationMs)) return "Not recorded";
  const value = Number(durationMs);
  if (value < 1000) return `${value} ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} sec`;
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)} min`;
}

export function normalizeMigrationBatchListItem(value: unknown): MigrationBatchListItemViewModel {
  const batch = object(value);
  const summary = normalizeCounts(batch.summary ?? batch.jobCounts);
  const batchId = token(batch.batchId);
  return {
    batchId,
    name: token(batch.name) || batchId || "Untitled batch",
    status: normalizeStatus(batch.status),
    progressPercent: summary.progressPercent,
    totalJobs: summary.totalJobs,
    completedJobs: summary.completedJobs,
    failedJobs: summary.failedJobs,
    latestEventAt: summary.latestEventAt,
    createdAt: nullableToken(batch.createdAt),
    href: `/gnr8/command-center/migration-batches/${encodeURIComponent(batchId)}`,
  };
}

export function normalizeMigrationBatchListPayload(payload: unknown): MigrationBatchListPageViewModel {
  const input = object(payload);
  const batches = list(input.batches)
    .map(normalizeMigrationBatchListItem)
    .filter((batch) => batch.batchId)
    .sort((a, b) => (b.latestEventAt ?? b.createdAt ?? "").localeCompare(a.latestEventAt ?? a.createdAt ?? "") || a.name.localeCompare(b.name));
  return { batches, fetchError: null };
}

export function normalizeMigrationBatchDetailPayload(input: {
  batchPayload: unknown;
  observabilityPayload?: unknown;
  timelinePayload?: unknown;
}): MigrationBatchDetailPageViewModel {
  const batchPayload = object(input.batchPayload);
  const rawBatch = object(batchPayload.batch);
  const observabilityPayload = object(input.observabilityPayload);
  const observability = object(observabilityPayload.observability);
  const batchObservability = object(observability.batch);
  const summaryObservability = object(observability.summary);
  const timelinePayload = object(input.timelinePayload);

  const batchId = token(rawBatch.batchId || batchObservability.batchId);
  if (!batchId) return { batch: null, fetchError: "Migration batch not found" };

  const counts = normalizeCounts(rawBatch.summary ?? rawBatch.jobCounts);
  const summary = {
    ...counts,
    ...normalizeCounts(summaryObservability),
    successRate: numberValue(summaryObservability.successRate),
    firstFailureJobId: nullableToken(summaryObservability.firstFailureJobId),
    firstFailureReason: nullableToken(summaryObservability.firstFailureReason),
    lastExecutedJobId: nullableToken(summaryObservability.lastExecutedJobId),
    lastCompletedJobId: nullableToken(summaryObservability.lastCompletedJobId),
  };
  const diagnosticsInput = object(observability.diagnostics);
  const failuresInput = object(observability.failures);
  const rawTimeline = list(timelinePayload.timeline).length > 0 ? list(timelinePayload.timeline) : list(observability.timeline);

  return {
    fetchError: null,
    batch: {
      batchId,
      name: token(rawBatch.name || batchObservability.name) || batchId,
      description: nullableToken(rawBatch.description),
      status: normalizeStatus(rawBatch.status || batchObservability.status),
      createdAt: nullableToken(rawBatch.createdAt),
      updatedAt: nullableToken(rawBatch.updatedAt || batchObservability.updatedAt),
      startedAt: nullableToken(rawBatch.startedAt || batchObservability.startedAt),
      completedAt: nullableToken(rawBatch.completedAt || batchObservability.completedAt),
      failedAt: nullableToken(rawBatch.failedAt || batchObservability.failedAt),
      summary,
      diagnostics: {
        executionCount: numberValue(diagnosticsInput.executionCount),
        runAttempts: numberValue(diagnosticsInput.runAttempts),
        lastRunStartedAt: nullableToken(diagnosticsInput.lastRunStartedAt),
        lastRunFinishedAt: nullableToken(diagnosticsInput.lastRunFinishedAt),
        lastExecutionDurationMs: Number.isFinite(Number(diagnosticsInput.lastExecutionDurationMs))
          ? Number(diagnosticsInput.lastExecutionDurationMs)
          : null,
        currentlyRunnableJobs: stringList(diagnosticsInput.currentlyRunnableJobs),
        blockedJobs: stringList(diagnosticsInput.blockedJobs),
        completedJobs: stringList(diagnosticsInput.completedJobs),
      },
      failures: {
        failedJobIds: stringList(failuresInput.failedJobIds),
        failureCounts: normalizeFailureCounts(failuresInput.failureCounts),
        latestFailure: failuresInput.latestFailure ? normalizeFailureItem(failuresInput.latestFailure) : null,
        failureReasons: normalizeFailureReasons(failuresInput.failureReasons),
        failures: list(failuresInput.failures)
          .map(normalizeFailureItem)
          .filter((failure) => failure.jobId),
      },
      timeline: rawTimeline
        .map((entry) => {
          const item = object(entry);
          return {
            timestamp: nullableToken(item.timestamp),
            eventType: token(item.eventType),
            jobId: nullableToken(item.jobId),
            message: token(item.message),
          };
        })
        .filter((entry) => entry.eventType || entry.message),
      generatedAt: nullableToken(observability.generatedAt),
      runEndpoint: `/api/gnr8/admin/migration-batches/${encodeURIComponent(batchId)}/run`,
      resumeEndpoint: `/api/gnr8/admin/migration-batches/${encodeURIComponent(batchId)}/resume`,
    },
  };
}
