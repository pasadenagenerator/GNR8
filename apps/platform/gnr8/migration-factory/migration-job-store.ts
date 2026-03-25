import { deterministicId } from "@/gnr8/runtime/deterministic";

import type {
  MigrationExecutionEvent,
  MigrationJob,
  MigrationStage,
  MigrationStageStatusRecord,
  StartMigrationJobInput,
} from "@/gnr8/migration-factory/migration-job-types";
import { createInitialStageStates } from "@/gnr8/migration-factory/migration-stage-machine";

export type UpdateMigrationJobPatch = Partial<
  Omit<MigrationJob, "jobId" | "siteId" | "sourceUrl" | "createdAt" | "executionEvents">
>;

export type UpdateStageStatePatch = Partial<Omit<MigrationStageStatusRecord, "stage">>;

export interface MigrationJobStore {
  createJob(input: StartMigrationJobInput): Promise<MigrationJob>;
  getJob(jobId: string): Promise<MigrationJob | null>;
  updateJob(jobId: string, patch: UpdateMigrationJobPatch): Promise<MigrationJob>;
  updateStageState(jobId: string, stage: MigrationStage, patch: UpdateStageStatePatch): Promise<MigrationJob>;
  appendExecutionEvent(jobId: string, event: MigrationExecutionEvent): Promise<void>;
  listJobs(): Promise<MigrationJob[]>;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryMigrationJobStore implements MigrationJobStore {
  private readonly jobs = new Map<string, MigrationJob>();

  private jobSequence = 0;

  private now: () => string;

  constructor(options?: { now?: () => string }) {
    this.now = options?.now ?? (() => new Date().toISOString());
  }

  async createJob(input: StartMigrationJobInput): Promise<MigrationJob> {
    this.jobSequence += 1;
    const now = this.now();
    const jobId = input.jobId ?? deterministicId("migration_job", `${input.siteId}:${input.sourceUrl}:${this.jobSequence}`);

    const job: MigrationJob = {
      jobId,
      siteId: input.siteId,
      sourceUrl: input.sourceUrl,
      overallState: "PENDING",
      currentStage: null,
      stageStates: createInitialStageStates(),
      createdAt: now,
      updatedAt: now,
      lastError: null,
      lastExecutionReport: null,
      lastActivationExecutionResult: null,
      activationExecutionHistory: [],
      executionEvents: [],
    };

    this.jobs.set(jobId, deepCopy(job));
    return deepCopy(job);
  }

  async getJob(jobId: string): Promise<MigrationJob | null> {
    const job = this.jobs.get(jobId);
    return job ? deepCopy(job) : null;
  }

  async updateJob(jobId: string, patch: UpdateMigrationJobPatch): Promise<MigrationJob> {
    const current = this.jobs.get(jobId);
    if (!current) throw new Error(`Migration job not found: ${jobId}`);

    const next: MigrationJob = {
      ...current,
      ...patch,
      updatedAt: this.now(),
    };

    this.jobs.set(jobId, deepCopy(next));
    return deepCopy(next);
  }

  async updateStageState(jobId: string, stage: MigrationStage, patch: UpdateStageStatePatch): Promise<MigrationJob> {
    const current = this.jobs.get(jobId);
    if (!current) throw new Error(`Migration job not found: ${jobId}`);

    const stageState = current.stageStates[stage];
    if (!stageState) throw new Error(`Unknown migration stage: ${stage}`);

    const nextStageState: MigrationStageStatusRecord = {
      ...stageState,
      ...patch,
      stage,
    };

    const next: MigrationJob = {
      ...current,
      stageStates: {
        ...current.stageStates,
        [stage]: nextStageState,
      },
      updatedAt: this.now(),
    };

    this.jobs.set(jobId, deepCopy(next));
    return deepCopy(next);
  }

  async appendExecutionEvent(jobId: string, event: MigrationExecutionEvent): Promise<void> {
    const current = this.jobs.get(jobId);
    if (!current) throw new Error(`Migration job not found: ${jobId}`);

    const next: MigrationJob = {
      ...current,
      executionEvents: [...current.executionEvents, event],
      updatedAt: this.now(),
    };

    this.jobs.set(jobId, deepCopy(next));
  }

  async listJobs(): Promise<MigrationJob[]> {
    return Array.from(this.jobs.values()).map((job) => deepCopy(job));
  }
}
