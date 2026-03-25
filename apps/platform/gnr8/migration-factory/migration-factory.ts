import type {
  MigrationExecutionReport,
  MigrationJob,
  MigrationStage,
  StartMigrationJobInput,
} from "@/gnr8/migration-factory/migration-job-types";
import type { MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import { canRunStage, computeJobStateFromStages, createInitialStageStates, getFirstNonSucceededStage, getStageIndex, MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";
import { DefaultMigrationStageRunner, type MigrationStageRunner } from "@/gnr8/migration-factory/migration-stage-runner";

type MigrationFactoryOptions = {
  store?: MigrationJobStore;
  stageRunner?: MigrationStageRunner;
  now?: () => string;
};

export class MigrationFactory {
  private readonly store: MigrationJobStore;

  private readonly stageRunner: MigrationStageRunner;

  private readonly now: () => string;

  constructor(options: MigrationFactoryOptions) {
    if (!options.store) throw new Error("MigrationFactory requires a store");
    this.store = options.store;
    this.stageRunner = options.stageRunner ?? new DefaultMigrationStageRunner();
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async startMigrationJob(input: StartMigrationJobInput): Promise<MigrationJob> {
    const created = await this.store.createJob(input);
    const initialized = await this.store.updateJob(created.jobId, {
      currentStage: MIGRATION_STAGE_ORDER[0] ?? null,
      overallState: "PENDING",
      stageStates: createInitialStageStates(),
      lastError: null,
      lastExecutionReport: null,
    });
    await this.store.appendExecutionEvent(initialized.jobId, {
      type: "JOB_CREATED",
      timestamp: this.now(),
      message: "Migration job created",
      details: { siteId: input.siteId, sourceUrl: input.sourceUrl },
    });
    return initialized;
  }

  async runMigrationJob(jobId: string): Promise<MigrationExecutionReport> {
    const existing = await this.requireJob(jobId);
    const firstStage = getFirstNonSucceededStage(existing.stageStates);
    if (!firstStage) {
      const alreadyComplete = await this.store.updateJob(jobId, {
        overallState: "COMPLETED",
      });
      const report = this.buildExecutionReport(alreadyComplete, this.now(), this.now());
      await this.store.updateJob(jobId, { lastExecutionReport: report });
      return report;
    }
    return this.runFromStage(existing.jobId, firstStage, "JOB_STARTED");
  }

  async resumeMigrationJob(jobId: string): Promise<MigrationExecutionReport> {
    const existing = await this.requireJob(jobId);
    const resumeStage = getFirstNonSucceededStage(existing.stageStates);
    if (!resumeStage) {
      const report = this.buildExecutionReport(existing, this.now(), this.now());
      await this.store.updateJob(jobId, { overallState: "COMPLETED", lastExecutionReport: report });
      return report;
    }

    await this.store.appendExecutionEvent(existing.jobId, {
      type: "JOB_RESUMED",
      timestamp: this.now(),
      stage: resumeStage,
      message: "Migration job resume requested",
      details: { resumeStage },
    });
    return this.runFromStage(existing.jobId, resumeStage, "JOB_RESUMED");
  }

  async replayMigrationStage(input: {
    jobId: string;
    stage: MigrationStage;
    runAfterReplay?: boolean;
  }): Promise<MigrationJob | MigrationExecutionReport> {
    const existing = await this.requireJob(input.jobId);
    const replayFromIndex = getStageIndex(input.stage);
    if (replayFromIndex < 0) throw new Error(`Unknown stage for replay: ${input.stage}`);

    const nextStageStates = { ...existing.stageStates };
    for (let i = replayFromIndex; i < MIGRATION_STAGE_ORDER.length; i += 1) {
      const stage = MIGRATION_STAGE_ORDER[i];
      if (!stage) continue;
      nextStageStates[stage] = {
        ...nextStageStates[stage],
        state: "NOT_STARTED",
        startedAt: null,
        endedAt: null,
        attempts: 0,
        diagnostics: [],
        outputRefs: {},
        error: null,
      };
    }

    const replayPrepared = await this.store.updateJob(existing.jobId, {
      overallState: "PENDING",
      currentStage: input.stage,
      stageStates: nextStageStates,
      lastError: null,
    });

    await this.store.appendExecutionEvent(existing.jobId, {
      type: "STAGE_REPLAY_REQUESTED",
      timestamp: this.now(),
      stage: input.stage,
      message: "Stage replay requested",
      details: { stage: input.stage },
    });

    if (input.runAfterReplay ?? true) {
      return this.runMigrationJob(existing.jobId);
    }
    return replayPrepared;
  }

  private async runFromStage(
    jobId: string,
    startStage: MigrationStage,
    startEventType: "JOB_STARTED" | "JOB_RESUMED",
  ): Promise<MigrationExecutionReport> {
    const startedAt = this.now();
    let job = await this.store.updateJob(jobId, {
      overallState: "RUNNING",
      currentStage: startStage,
      lastError: null,
    });

    await this.store.appendExecutionEvent(jobId, {
      type: startEventType,
      timestamp: startedAt,
      stage: startStage,
      message: startEventType === "JOB_STARTED" ? "Migration job started" : "Migration job resumed",
      details: { startStage },
    });

    const startIndex = getStageIndex(startStage);
    if (startIndex < 0) throw new Error(`Unknown start stage: ${startStage}`);

    for (let i = startIndex; i < MIGRATION_STAGE_ORDER.length; i += 1) {
      const stage = MIGRATION_STAGE_ORDER[i];
      if (!stage) continue;

      job = await this.requireJob(jobId);
      if (!canRunStage(stage, job.stageStates)) {
        const error = {
          code: "INVALID_STAGE_TRANSITION",
          message: `Cannot run stage ${stage} because prior required stages are not all succeeded`,
          details: { stage },
        };
        job = await this.store.updateJob(jobId, {
          overallState: "FAILED",
          currentStage: stage,
          lastError: error,
        });
        await this.store.appendExecutionEvent(jobId, {
          type: "JOB_FAILED",
          timestamp: this.now(),
          stage,
          message: error.message,
          details: error.details,
        });
        const failedReport = this.buildExecutionReport(job, startedAt, this.now());
        await this.store.updateJob(jobId, { lastExecutionReport: failedReport });
        return failedReport;
      }

      const stageStartedAt = this.now();
      await this.store.updateStageState(jobId, stage, {
        state: "RUNNING",
        startedAt: stageStartedAt,
        attempts: job.stageStates[stage].attempts + 1,
        endedAt: null,
        error: null,
      });
      await this.store.appendExecutionEvent(jobId, {
        type: "STAGE_STARTED",
        timestamp: stageStartedAt,
        stage,
        message: `Stage ${stage} started`,
      });

      const runResult = await this.stageRunner.runStage(await this.requireJob(jobId), stage, { now: this.now });

      if (runResult.status === "SUCCEEDED") {
        await this.store.updateStageState(jobId, stage, {
          state: "SUCCEEDED",
          startedAt: runResult.startedAt,
          endedAt: runResult.endedAt,
          diagnostics: runResult.diagnostics,
          outputRefs: runResult.outputRefs,
          error: null,
        });
        await this.store.appendExecutionEvent(jobId, {
          type: "STAGE_SUCCEEDED",
          timestamp: runResult.endedAt,
          stage,
          message: `Stage ${stage} succeeded`,
        });

        const nextStage = MIGRATION_STAGE_ORDER[i + 1] ?? null;
        job = await this.store.updateJob(jobId, {
          currentStage: nextStage,
          overallState: computeJobStateFromStages((await this.requireJob(jobId)).stageStates),
        });
        continue;
      }

      if (runResult.status === "FAILED") {
        const stageError = runResult.error ?? {
          code: "STAGE_FAILED",
          message: `Stage ${stage} failed`,
        };
        await this.store.updateStageState(jobId, stage, {
          state: "FAILED",
          startedAt: runResult.startedAt,
          endedAt: runResult.endedAt,
          diagnostics: runResult.diagnostics,
          outputRefs: runResult.outputRefs,
          error: stageError,
        });
        job = await this.store.updateJob(jobId, {
          overallState: "FAILED",
          currentStage: stage,
          lastError: stageError,
        });
        await this.store.appendExecutionEvent(jobId, {
          type: "STAGE_FAILED",
          timestamp: runResult.endedAt,
          stage,
          message: stageError.message,
          details: stageError.details,
        });
        await this.store.appendExecutionEvent(jobId, {
          type: "JOB_FAILED",
          timestamp: runResult.endedAt,
          stage,
          message: `Migration job failed at stage ${stage}`,
          details: stageError.details,
        });

        const failedReport = this.buildExecutionReport(job, startedAt, this.now());
        await this.store.updateJob(jobId, { lastExecutionReport: failedReport });
        return failedReport;
      }

      const invalidError = {
        code: "INVALID_STAGE_STATUS",
        message: `Unsupported stage result status: ${runResult.status}`,
        details: { stage, status: runResult.status },
      };
      await this.store.updateStageState(jobId, stage, {
        state: "FAILED",
        startedAt: runResult.startedAt,
        endedAt: runResult.endedAt,
        diagnostics: runResult.diagnostics,
        outputRefs: runResult.outputRefs,
        error: invalidError,
      });
      job = await this.store.updateJob(jobId, {
        overallState: "FAILED",
        currentStage: stage,
        lastError: invalidError,
      });
      await this.store.appendExecutionEvent(jobId, {
        type: "JOB_FAILED",
        timestamp: runResult.endedAt,
        stage,
        message: invalidError.message,
        details: invalidError.details,
      });
      const failedReport = this.buildExecutionReport(job, startedAt, this.now());
      await this.store.updateJob(jobId, { lastExecutionReport: failedReport });
      return failedReport;
    }

    job = await this.store.updateJob(jobId, {
      overallState: "COMPLETED",
      currentStage: null,
      lastError: null,
    });
    const endedAt = this.now();
    await this.store.appendExecutionEvent(jobId, {
      type: "JOB_COMPLETED",
      timestamp: endedAt,
      message: "Migration job completed",
    });

    const completedReport = this.buildExecutionReport(job, startedAt, endedAt);
    await this.store.updateJob(jobId, { lastExecutionReport: completedReport });
    return completedReport;
  }

  private buildExecutionReport(job: MigrationJob, startedAt: string, endedAt: string): MigrationExecutionReport {
    const completedStages: MigrationStage[] = [];
    let failedStage: MigrationStage | undefined;
    const stageDiagnostics: MigrationExecutionReport["stageDiagnostics"] = [];
    const outputs: Record<string, string> = {};

    for (const stage of MIGRATION_STAGE_ORDER) {
      const record = job.stageStates[stage];
      if (record.state === "SUCCEEDED") completedStages.push(stage);
      if (!failedStage && record.state === "FAILED") failedStage = stage;
      stageDiagnostics.push({
        stage,
        status: record.state,
        diagnostics: record.diagnostics,
        error: record.error,
      });
      for (const [key, value] of Object.entries(record.outputRefs)) {
        outputs[`${stage}.${key}`] = value;
      }
    }

    return {
      jobId: job.jobId,
      finalState: job.overallState,
      completedStages,
      failedStage,
      stageDiagnostics,
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
      outputs,
    };
  }

  private async requireJob(jobId: string): Promise<MigrationJob> {
    const job = await this.store.getJob(jobId);
    if (!job) throw new Error(`Migration job not found: ${jobId}`);
    return job;
  }
}

