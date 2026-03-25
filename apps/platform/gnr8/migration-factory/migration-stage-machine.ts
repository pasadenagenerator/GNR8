import {
  MIGRATION_STAGES,
  type MigrationJobState,
  type MigrationStage,
  type MigrationStageState,
  type MigrationStageStatusRecord,
} from "@/gnr8/migration-factory/migration-job-types";

export const MIGRATION_STAGE_ORDER: MigrationStage[] = [...MIGRATION_STAGES];

export function createInitialStageStates(): Record<MigrationStage, MigrationStageStatusRecord> {
  return Object.fromEntries(
    MIGRATION_STAGE_ORDER.map((stage) => [
      stage,
      {
        stage,
        state: "NOT_STARTED",
        startedAt: null,
        endedAt: null,
        attempts: 0,
        diagnostics: [],
        outputRefs: {},
        error: null,
      },
    ]),
  ) as Record<MigrationStage, MigrationStageStatusRecord>;
}

export function getStageIndex(stage: MigrationStage): number {
  return MIGRATION_STAGE_ORDER.indexOf(stage);
}

export function getNextStage(stage: MigrationStage): MigrationStage | null {
  const index = getStageIndex(stage);
  if (index === -1 || index === MIGRATION_STAGE_ORDER.length - 1) return null;
  return MIGRATION_STAGE_ORDER[index + 1] ?? null;
}

export function canRunStage(stage: MigrationStage, stageStates: Record<MigrationStage, MigrationStageStatusRecord>): boolean {
  const index = getStageIndex(stage);
  if (index < 0) return false;

  for (let i = 0; i < index; i += 1) {
    const prior = MIGRATION_STAGE_ORDER[i];
    if (!prior || stageStates[prior].state !== "SUCCEEDED") return false;
  }

  const current = stageStates[stage].state;
  return current !== "SUCCEEDED" && current !== "RUNNING";
}

export function getFirstNonSucceededStage(
  stageStates: Record<MigrationStage, MigrationStageStatusRecord>,
): MigrationStage | null {
  for (const stage of MIGRATION_STAGE_ORDER) {
    if (stageStates[stage].state !== "SUCCEEDED") return stage;
  }
  return null;
}

export function computeJobStateFromStages(
  stageStates: Record<MigrationStage, MigrationStageStatusRecord>,
): MigrationJobState {
  let hasRunning = false;
  let hasFailed = false;
  let allSucceeded = true;

  for (const stage of MIGRATION_STAGE_ORDER) {
    const state = stageStates[stage].state;
    if (state === "RUNNING") hasRunning = true;
    if (state === "FAILED") hasFailed = true;
    if (state !== "SUCCEEDED") allSucceeded = false;
  }

  if (hasFailed) return "FAILED";
  if (allSucceeded) return "COMPLETED";
  if (hasRunning) return "RUNNING";
  return "PENDING";
}

export function isTerminalJobState(state: MigrationJobState): boolean {
  return state === "FAILED" || state === "COMPLETED";
}

export function isTerminalStageState(state: MigrationStageState): boolean {
  return state === "SUCCEEDED" || state === "FAILED" || state === "SKIPPED";
}
