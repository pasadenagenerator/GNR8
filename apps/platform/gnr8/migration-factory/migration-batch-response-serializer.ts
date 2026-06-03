import type {
  MigrationBatch,
  MigrationBatchJobSummary,
  MigrationBatchSummary,
  MigrationBatchWithSummary,
} from "@/gnr8/migration-factory/migration-batch-types";

type SerializeMigrationBatchOptions = {
  durable: boolean;
  storeKind: string;
  summary: MigrationBatchSummary;
  jobs?: MigrationBatchJobSummary[];
};

function serializeSummary(summary: MigrationBatchSummary) {
  return {
    totalJobs: summary.totalJobs,
    pendingJobs: summary.pendingJobs,
    runningJobs: summary.runningJobs,
    completedJobs: summary.completedJobs,
    failedJobs: summary.failedJobs,
    pausedJobs: summary.pausedJobs,
    progressPercent: summary.progressPercent,
    latestEventAt: summary.latestEventAt,
  };
}

function serializeBatchJobSummary(job: MigrationBatchJobSummary) {
  return {
    batchId: job.batchId,
    jobId: job.jobId,
    siteId: job.siteId,
    siteVersionId: job.siteVersionId,
    sourceUrl: job.sourceUrl,
    position: job.position,
    addedAt: job.addedAt,
    metadata: job.metadata,
    jobStatus: job.jobStatus,
    jobCreatedAt: job.jobCreatedAt,
    jobUpdatedAt: job.jobUpdatedAt,
    latestEventAt: job.latestEventAt,
  };
}

export function serializeMigrationBatch(batch: MigrationBatch, options: SerializeMigrationBatchOptions) {
  const jobSummaries = options.jobs?.map(serializeBatchJobSummary);

  return {
    batchId: batch.batchId,
    organizationId: batch.organizationId,
    agencyId: batch.agencyId,
    clientId: batch.clientId,
    name: batch.name,
    description: batch.description,
    status: batch.status,
    createdBy: batch.createdBy,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    startedAt: batch.startedAt,
    completedAt: batch.completedAt,
    failedAt: batch.failedAt,
    metadata: batch.metadata,
    diagnostics: batch.diagnostics,
    store: {
      durable: options.durable,
      kind: options.storeKind,
    },
    summary: serializeSummary(options.summary),
    jobCounts: serializeSummary(options.summary),
    jobSummaries,
  };
}

export function serializeMigrationBatchListItem(
  batch: MigrationBatchWithSummary,
  options: { durable: boolean; storeKind: string },
) {
  return serializeMigrationBatch(batch, {
    ...options,
    summary: batch.summary,
  });
}

export function serializeMigrationBatchJob(job: MigrationBatchJobSummary) {
  return serializeBatchJobSummary(job);
}
