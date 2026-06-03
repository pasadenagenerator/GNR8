import type {
  MigrationExecutionEvent,
  MigrationJob,
  MigrationStageState,
} from "@/gnr8/migration-factory/migration-job-types";
import { MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";

type SerializeMigrationJobOptions = {
  durable: boolean;
  storeKind: string;
  includeEvents?: boolean;
  includeActivationHistory?: boolean;
};

function countStages(job: MigrationJob): Record<MigrationStageState, number> {
  const counts: Record<MigrationStageState, number> = {
    NOT_STARTED: 0,
    RUNNING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    SKIPPED: 0,
  };

  for (const stage of MIGRATION_STAGE_ORDER) {
    const state = job.stageStates[stage].state;
    counts[state] += 1;
  }

  return counts;
}

function serializeEvent(event: MigrationExecutionEvent) {
  return {
    type: event.type,
    timestamp: event.timestamp,
    stage: event.stage ?? null,
    message: event.message,
    details: event.details ?? null,
  };
}

export function serializeMigrationJob(job: MigrationJob, options: SerializeMigrationJobOptions) {
  const stages = MIGRATION_STAGE_ORDER.map((stage) => {
    const state = job.stageStates[stage];
    return {
      stage,
      state: state.state,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      attempts: state.attempts,
      diagnostics: state.diagnostics,
      outputRefs: state.outputRefs,
      error: state.error,
    };
  });
  const stageCounts = countStages(job);

  return {
    jobId: job.jobId,
    siteId: job.siteId,
    sourceUrl: job.sourceUrl,
    status: job.overallState,
    currentStage: job.currentStage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    store: {
      durable: options.durable,
      kind: options.storeKind,
    },
    stageSummary: {
      total: stages.length,
      notStarted: stageCounts.NOT_STARTED,
      running: stageCounts.RUNNING,
      succeeded: stageCounts.SUCCEEDED,
      failed: stageCounts.FAILED,
      skipped: stageCounts.SKIPPED,
    },
    stages,
    diagnostics: {
      lastError: job.lastError,
      lastExecutionReport: job.lastExecutionReport,
      lastActivationExecutionResult: job.lastActivationExecutionResult,
      stageDiagnostics: stages.map((stage) => ({
        stage: stage.stage,
        state: stage.state,
        diagnostics: stage.diagnostics,
        error: stage.error,
      })),
    },
    executionEventCount: job.executionEvents.length,
    executionEvents: options.includeEvents ? job.executionEvents.map(serializeEvent) : undefined,
    activationHistoryCount: job.activationExecutionHistory.length,
    activationHistory: options.includeActivationHistory ? job.activationExecutionHistory : undefined,
  };
}
