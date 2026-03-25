import { deterministicId } from "@/gnr8/runtime/deterministic";

import { MIGRATION_STAGES, type MigrationJob, type MigrationStage, type MigrationStageResult } from "@/gnr8/migration-factory/migration-job-types";

export type MigrationStageExecutorContext = {
  now: () => string;
};

export type MigrationStageExecutor = (
  job: MigrationJob,
  stage: MigrationStage,
  context: MigrationStageExecutorContext,
) => Promise<MigrationStageResult> | MigrationStageResult;

export interface MigrationStageRunner {
  runStage(job: MigrationJob, stage: MigrationStage, context: MigrationStageExecutorContext): Promise<MigrationStageResult>;
}

const VALID_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

function buildDeterministicRef(jobId: string, stage: MigrationStage, key: string): string {
  return deterministicId(key, `${jobId}:${stage}`);
}

function createSucceededResult(
  stage: MigrationStage,
  startedAt: string,
  endedAt: string,
  outputRefs: Record<string, string>,
): MigrationStageResult {
  return {
    stage,
    status: "SUCCEEDED",
    startedAt,
    endedAt,
    diagnostics: [{ code: "STAGE_EXECUTED", message: `${stage} completed`, level: "INFO" }],
    outputRefs,
  };
}

export function createFailedStageResult(input: {
  stage: MigrationStage;
  startedAt: string;
  endedAt: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}): MigrationStageResult {
  return {
    stage: input.stage,
    status: "FAILED",
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    diagnostics: [{ code: input.code, message: input.message, level: "ERROR", details: input.details }],
    outputRefs: {},
    error: {
      code: input.code,
      message: input.message,
      details: input.details,
    },
  };
}

function createDefaultStageExecutors(): Record<MigrationStage, MigrationStageExecutor> {
  return {
    INTAKE: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      try {
        const parsed = new URL(job.sourceUrl);
        if (!VALID_SOURCE_PROTOCOLS.has(parsed.protocol)) {
          return createFailedStageResult({
            stage,
            startedAt,
            endedAt,
            code: "INTAKE_INVALID_SOURCE_URL_PROTOCOL",
            message: "sourceUrl must use http or https protocol",
            details: { sourceUrl: job.sourceUrl, protocol: parsed.protocol },
          });
        }
      } catch {
        return createFailedStageResult({
          stage,
          startedAt,
          endedAt,
          code: "INTAKE_INVALID_SOURCE_URL",
          message: "sourceUrl is not a valid absolute URL",
          details: { sourceUrl: job.sourceUrl },
        });
      }

      return createSucceededResult(stage, startedAt, endedAt, {
        intakeRef: buildDeterministicRef(job.jobId, stage, "intake"),
      });
    },
    SNAPSHOT: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        snapshotRef: buildDeterministicRef(job.jobId, stage, "snapshot"),
      });
    },
    LAYOUT_GRAPH: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        layoutGraphRef: buildDeterministicRef(job.jobId, stage, "layout_graph"),
      });
    },
    CANONICAL: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        canonicalRef: buildDeterministicRef(job.jobId, stage, "canonical"),
      });
    },
    QUALITY_GATE: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        gateState: "SHADOW_READY",
        qualityGateRef: buildDeterministicRef(job.jobId, stage, "quality_gate"),
      });
    },
    ARTIFACT_BUILD: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        artifactRef: buildDeterministicRef(job.jobId, stage, "artifact"),
      });
    },
    SHADOW_BIND_READY: async (job, stage, context) => {
      const startedAt = context.now();
      const endedAt = context.now();
      return createSucceededResult(stage, startedAt, endedAt, {
        shadowReadyRef: buildDeterministicRef(job.jobId, stage, "shadow_bind"),
      });
    },
  };
}

export class DefaultMigrationStageRunner implements MigrationStageRunner {
  private readonly executors: Record<MigrationStage, MigrationStageExecutor>;

  constructor(options?: { executors?: Partial<Record<MigrationStage, MigrationStageExecutor>> }) {
    const defaults = createDefaultStageExecutors();
    this.executors = {
      ...defaults,
      ...(options?.executors ?? {}),
    };
  }

  async runStage(job: MigrationJob, stage: MigrationStage, context: MigrationStageExecutorContext): Promise<MigrationStageResult> {
    const executor = this.executors[stage];
    if (!executor) {
      const startedAt = context.now();
      const endedAt = context.now();
      return createFailedStageResult({
        stage,
        startedAt,
        endedAt,
        code: "STAGE_EXECUTOR_MISSING",
        message: `No executor defined for stage ${stage}`,
      });
    }

    const result = await executor(job, stage, context);
    if (!MIGRATION_STAGES.includes(result.stage)) {
      throw new Error(`Stage executor returned invalid stage result: ${String(result.stage)}`);
    }
    if (result.stage !== stage) {
      throw new Error(`Stage executor mismatch: expected ${stage}, got ${result.stage}`);
    }
    return result;
  }
}

