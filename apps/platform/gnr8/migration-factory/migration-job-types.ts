export const MIGRATION_JOB_STATES = ["PENDING", "RUNNING", "PAUSED", "FAILED", "COMPLETED"] as const;
export type MigrationJobState = (typeof MIGRATION_JOB_STATES)[number];

export const MIGRATION_STAGES = [
  "INTAKE",
  "SNAPSHOT",
  "LAYOUT_GRAPH",
  "CANONICAL",
  "QUALITY_GATE",
  "ARTIFACT_BUILD",
  "SHADOW_BIND_READY",
] as const;
export type MigrationStage = (typeof MIGRATION_STAGES)[number];

export const MIGRATION_STAGE_STATES = ["NOT_STARTED", "RUNNING", "SUCCEEDED", "FAILED", "SKIPPED"] as const;
export type MigrationStageState = (typeof MIGRATION_STAGE_STATES)[number];

export type MigrationStageTerminalStatus = Extract<MigrationStageState, "SUCCEEDED" | "FAILED" | "SKIPPED">;

export type MigrationStageError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type MigrationStageDiagnostic = {
  code: string;
  message: string;
  level: "INFO" | "WARNING" | "ERROR";
  details?: Record<string, unknown>;
};

export type MigrationStageResult = {
  stage: MigrationStage;
  status: MigrationStageTerminalStatus;
  startedAt: string;
  endedAt: string;
  diagnostics: MigrationStageDiagnostic[];
  outputRefs: Record<string, string>;
  error?: MigrationStageError;
};

export type MigrationStageStatusRecord = {
  stage: MigrationStage;
  state: MigrationStageState;
  startedAt: string | null;
  endedAt: string | null;
  attempts: number;
  diagnostics: MigrationStageDiagnostic[];
  outputRefs: Record<string, string>;
  error: MigrationStageError | null;
};

export type MigrationExecutionEvent = {
  type:
    | "JOB_CREATED"
    | "JOB_STARTED"
    | "STAGE_STARTED"
    | "STAGE_SUCCEEDED"
    | "STAGE_FAILED"
    | "JOB_COMPLETED"
    | "JOB_FAILED"
    | "JOB_RESUMED"
    | "STAGE_REPLAY_REQUESTED"
    | "ACTIVATION_EXECUTION_STARTED"
    | "ACTIVATION_EXECUTION_SUCCEEDED"
    | "ACTIVATION_EXECUTION_FAILED"
    | "ACTIVATION_EXECUTION_NOOP";
  timestamp: string;
  stage?: MigrationStage;
  message: string;
  details?: Record<string, unknown>;
};

export type MigrationActivationExecutionResult = {
  executionId: string;
  candidateRef: string;
  artifactId: string;
  siteVersionId: string;
  activationOutcome: "ACTIVATED" | "SAFE_NOOP" | "FAILED";
  switched: boolean;
  previousActivePointer: { siteVersionId: string; artifactId: string } | null;
  newActivePointer: { siteVersionId: string; artifactId: string } | null;
  enforcementState: string;
  publishStage: string;
  failureCode?: string;
  reasons: string[];
};

export type MigrationExecutionReport = {
  jobId: string;
  finalState: MigrationJobState;
  completedStages: MigrationStage[];
  failedStage?: MigrationStage;
  stageDiagnostics: Array<{
    stage: MigrationStage;
    status: MigrationStageState;
    diagnostics: MigrationStageDiagnostic[];
    error: MigrationStageError | null;
  }>;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  outputs: Record<string, string>;
};

export type MigrationJob = {
  jobId: string;
  siteId: string;
  sourceUrl: string;
  overallState: MigrationJobState;
  currentStage: MigrationStage | null;
  stageStates: Record<MigrationStage, MigrationStageStatusRecord>;
  createdAt: string;
  updatedAt: string;
  lastError: MigrationStageError | null;
  lastExecutionReport: MigrationExecutionReport | null;
  lastActivationExecutionResult: MigrationActivationExecutionResult | null;
  activationExecutionHistory: MigrationActivationExecutionResult[];
  executionEvents: MigrationExecutionEvent[];
};

export type StartMigrationJobInput = {
  jobId?: string;
  siteId: string;
  sourceUrl: string;
};
