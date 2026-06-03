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

export interface MigrationBatchStore {
  createBatch(input: CreateMigrationBatchInput): Promise<MigrationBatch>;
  getBatch(batchId: string): Promise<MigrationBatch | null>;
  listBatches(): Promise<MigrationBatchWithSummary[]>;
  addJobToBatch(input: AddMigrationJobToBatchInput): Promise<MigrationBatchJob>;
  removeJobFromBatch(batchId: string, jobId: string): Promise<boolean>;
  listBatchJobs(batchId: string): Promise<MigrationBatchJobSummary[]>;
  getBatchSummary(batchId: string): Promise<MigrationBatchSummary | null>;
  updateBatchStatus(input: UpdateMigrationBatchStatusInput): Promise<MigrationBatch>;
  appendBatchEvent(input: AppendMigrationBatchEventInput): Promise<MigrationBatchEvent>;
  listBatchEvents(batchId: string): Promise<MigrationBatchEvent[]>;
}
