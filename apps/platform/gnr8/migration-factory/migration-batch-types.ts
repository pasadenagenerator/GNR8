import type { MigrationJobState } from "@/gnr8/migration-factory/migration-job-types";

export const MIGRATION_BATCH_STATUSES = [
  "draft",
  "ready",
  "running",
  "paused",
  "completed",
  "failed",
  "partially_failed",
  "cancelled",
] as const;

export type MigrationBatchStatus = (typeof MIGRATION_BATCH_STATUSES)[number];

export type MigrationBatchJsonObject = Record<string, unknown>;

export type MigrationBatch = {
  batchId: string;
  organizationId: string | null;
  agencyId: string | null;
  clientId: string | null;
  name: string;
  description: string | null;
  status: MigrationBatchStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  metadata: MigrationBatchJsonObject;
  diagnostics: MigrationBatchJsonObject;
};

export type MigrationBatchJob = {
  batchId: string;
  jobId: string;
  siteId: string | null;
  siteVersionId: string | null;
  sourceUrl: string | null;
  position: number;
  addedAt: string;
  metadata: MigrationBatchJsonObject;
};

export type MigrationBatchJobSummary = MigrationBatchJob & {
  jobStatus: MigrationJobState;
  jobCreatedAt: string;
  jobUpdatedAt: string;
  latestEventAt: string | null;
};

export type MigrationBatchSummary = {
  batchId: string;
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  pausedJobs: number;
  progressPercent: number;
  latestEventAt: string | null;
};

export type MigrationBatchWithSummary = MigrationBatch & {
  summary: MigrationBatchSummary;
};

export type CreateMigrationBatchInput = {
  batchId?: string;
  organizationId?: string | null;
  agencyId?: string | null;
  clientId?: string | null;
  name: string;
  description?: string | null;
  status?: MigrationBatchStatus;
  createdBy?: string | null;
  metadata?: MigrationBatchJsonObject;
  diagnostics?: MigrationBatchJsonObject;
};

export type AddMigrationJobToBatchInput = {
  batchId: string;
  jobId: string;
  siteId?: string | null;
  siteVersionId?: string | null;
  sourceUrl?: string | null;
  position?: number | null;
  metadata?: MigrationBatchJsonObject;
};
