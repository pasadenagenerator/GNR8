import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import type {
  MigrationBatchEventType,
  MigrationBatchJsonObject,
  MigrationBatchStatus,
} from "@/gnr8/migration-factory/migration-batch-types";
import type { MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type {
  MigrationExecutionEvent,
  MigrationExecutionReport,
  MigrationJobState,
  MigrationStage,
  MigrationStageDiagnostic,
  MigrationStageError,
} from "@/gnr8/migration-factory/migration-job-types";
import { MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";

export const MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID = "migration_batch_smoke_test_demo_v1";
export const MIGRATION_BATCH_SMOKE_TEST_SEED_JOB_IDS = [
  "migration_job_smoke_completed_v1",
  "migration_job_smoke_pending_v1",
  "migration_job_smoke_failed_v1",
] as const;

type SeedJobDefinition = {
  jobId: (typeof MIGRATION_BATCH_SMOKE_TEST_SEED_JOB_IDS)[number];
  siteId: string;
  sourceUrl: string;
  state: MigrationJobState;
  position: number;
};

export type CreateMigrationBatchSmokeTestSeedInput = {
  batchStore: MigrationBatchStore;
  jobStore: MigrationJobStore;
  createdBy: string | null;
  now?: () => string;
};

export type MigrationBatchSmokeTestSeedResult = {
  batchId: string;
  batchUrl: string;
  jobIds: string[];
  status: "created" | "reused" | "repaired";
  created: {
    batch: boolean;
    jobs: string[];
    memberships: string[];
    batchEvents: number;
  };
  reused: {
    batch: boolean;
    jobs: string[];
    memberships: string[];
  };
  executionBlocked: true;
};

const BATCH_URL = `/gnr8/command-center/migration-batches/${MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID}`;

const JOB_DEFINITIONS: SeedJobDefinition[] = [
  {
    jobId: "migration_job_smoke_completed_v1",
    siteId: "smoke-test-demo-site-completed",
    sourceUrl: "https://migration-smoke-test.invalid/completed",
    state: "COMPLETED",
    position: 0,
  },
  {
    jobId: "migration_job_smoke_pending_v1",
    siteId: "smoke-test-demo-site-pending",
    sourceUrl: "https://migration-smoke-test.invalid/pending",
    state: "PENDING",
    position: 1,
  },
  {
    jobId: "migration_job_smoke_failed_v1",
    siteId: "smoke-test-demo-site-failed",
    sourceUrl: "https://migration-smoke-test.invalid/failed",
    state: "FAILED",
    position: 2,
  },
];

function timestampAt(index: number): string {
  return new Date(Date.parse("2026-06-03T12:00:00.000Z") + index * 60_000).toISOString();
}

function completedReport(jobId: string): MigrationExecutionReport {
  return {
    jobId,
    finalState: "COMPLETED",
    completedStages: [...MIGRATION_STAGE_ORDER],
    stageDiagnostics: MIGRATION_STAGE_ORDER.map((stage) => ({
      stage,
      status: "SUCCEEDED",
      diagnostics: [{
        code: "SMOKE_TEST_STAGE_SUCCEEDED",
        message: `Smoke test stage ${stage} completed without external execution.`,
        level: "INFO",
      }],
      error: null,
    })),
    startedAt: timestampAt(1),
    endedAt: timestampAt(3),
    durationMs: 120_000,
    outputs: {
      artifact: "smoke-test://completed/artifact",
      preview: "smoke-test://completed/preview",
    },
  };
}

function failedReport(jobId: string, error: MigrationStageError): MigrationExecutionReport {
  return {
    jobId,
    finalState: "FAILED",
    completedStages: ["INTAKE"],
    failedStage: "SNAPSHOT",
    stageDiagnostics: [
      {
        stage: "INTAKE",
        status: "SUCCEEDED",
        diagnostics: [{
          code: "SMOKE_TEST_INTAKE_OK",
          message: "Smoke test intake metadata was accepted.",
          level: "INFO",
        }],
        error: null,
      },
      {
        stage: "SNAPSHOT",
        status: "FAILED",
        diagnostics: [{
          code: "SMOKE_TEST_SNAPSHOT_BLOCKED",
          message: "Demo failure: source snapshot intentionally blocked for UI inspection.",
          level: "ERROR",
        }],
        error,
      },
    ],
    startedAt: timestampAt(4),
    endedAt: timestampAt(5),
    durationMs: 60_000,
    outputs: {},
  };
}

async function appendJobEventOnce(
  jobStore: MigrationJobStore,
  jobId: string,
  event: MigrationExecutionEvent,
): Promise<void> {
  const current = await jobStore.getJob(jobId);
  if (current?.executionEvents.some((existing) => existing.type === event.type && existing.stage === event.stage)) {
    return;
  }
  await jobStore.appendExecutionEvent(jobId, event);
}

async function ensureCompletedJob(jobStore: MigrationJobStore, jobId: string): Promise<void> {
  const stageDiagnostic: MigrationStageDiagnostic = {
    code: "SMOKE_TEST_STAGE_SUCCEEDED",
    message: "Demo job stage completed without external execution.",
    level: "INFO",
  };

  for (const [index, stage] of MIGRATION_STAGE_ORDER.entries()) {
    await jobStore.updateStageState(jobId, stage, {
      state: "SUCCEEDED",
      startedAt: timestampAt(1 + index),
      endedAt: timestampAt(2 + index),
      attempts: 1,
      diagnostics: [stageDiagnostic],
      outputRefs: { smokeTestRef: `smoke-test://${jobId}/${stage.toLowerCase()}` },
      error: null,
    });
  }

  await jobStore.updateJob(jobId, {
    overallState: "COMPLETED",
    currentStage: null,
    lastError: null,
    lastExecutionReport: completedReport(jobId),
  });

  await appendJobEventOnce(jobStore, jobId, {
    type: "JOB_STARTED",
    timestamp: timestampAt(1),
    message: "Smoke test demo job started",
    details: { seed: "migration_batch_smoke_test" },
  });
  await appendJobEventOnce(jobStore, jobId, {
    type: "JOB_COMPLETED",
    timestamp: timestampAt(3),
    message: "Smoke test demo job completed",
    details: { seed: "migration_batch_smoke_test" },
  });
}

async function ensurePendingJob(jobStore: MigrationJobStore, jobId: string): Promise<void> {
  await jobStore.updateJob(jobId, {
    overallState: "PENDING",
    currentStage: null,
    lastError: null,
    lastExecutionReport: null,
  });

  await appendJobEventOnce(jobStore, jobId, {
    type: "JOB_CREATED",
    timestamp: timestampAt(6),
    message: "Smoke test demo job is pending and safe to inspect",
    details: { seed: "migration_batch_smoke_test", executionBlocked: true },
  });
}

async function ensureFailedJob(jobStore: MigrationJobStore, jobId: string): Promise<void> {
  const error: MigrationStageError = {
    code: "SMOKE_TEST_SNAPSHOT_BLOCKED",
    message: "Demo failure: source snapshot intentionally blocked for UI inspection.",
    details: {
      safeDemoFailure: true,
      externalFetchAttempted: false,
    },
  };

  await jobStore.updateStageState(jobId, "INTAKE", {
    state: "SUCCEEDED",
    startedAt: timestampAt(4),
    endedAt: timestampAt(5),
    attempts: 1,
    diagnostics: [{
      code: "SMOKE_TEST_INTAKE_OK",
      message: "Smoke test intake metadata was accepted.",
      level: "INFO",
    }],
    outputRefs: { manifest: "smoke-test://failed/intake-manifest" },
    error: null,
  });
  await jobStore.updateStageState(jobId, "SNAPSHOT", {
    state: "FAILED",
    startedAt: timestampAt(5),
    endedAt: timestampAt(6),
    attempts: 1,
    diagnostics: [{
      code: "SMOKE_TEST_SNAPSHOT_BLOCKED",
      message: "Demo failure: source snapshot intentionally blocked for UI inspection.",
      level: "ERROR",
      details: { safeDemoFailure: true },
    }],
    outputRefs: {},
    error,
  });

  await jobStore.updateJob(jobId, {
    overallState: "FAILED",
    currentStage: "SNAPSHOT",
    lastError: error,
    lastExecutionReport: failedReport(jobId, error),
  });

  await appendJobEventOnce(jobStore, jobId, {
    type: "JOB_STARTED",
    timestamp: timestampAt(4),
    message: "Smoke test failed demo job started",
    details: { seed: "migration_batch_smoke_test" },
  });
  await appendJobEventOnce(jobStore, jobId, {
    type: "STAGE_FAILED",
    timestamp: timestampAt(6),
    stage: "SNAPSHOT",
    message: error.message,
    details: { seed: "migration_batch_smoke_test", safeDemoFailure: true },
  });
  await appendJobEventOnce(jobStore, jobId, {
    type: "JOB_FAILED",
    timestamp: timestampAt(6),
    stage: "SNAPSHOT",
    message: error.message,
    details: { seed: "migration_batch_smoke_test", safeDemoFailure: true },
  });
}

async function ensureSeedJob(jobStore: MigrationJobStore, definition: SeedJobDefinition): Promise<boolean> {
  const existing = await jobStore.getJob(definition.jobId);
  if (!existing) {
    await jobStore.createJob({
      jobId: definition.jobId,
      siteId: definition.siteId,
      sourceUrl: definition.sourceUrl,
    });
  }

  if (definition.state === "COMPLETED") {
    await ensureCompletedJob(jobStore, definition.jobId);
  } else if (definition.state === "FAILED") {
    await ensureFailedJob(jobStore, definition.jobId);
  } else {
    await ensurePendingJob(jobStore, definition.jobId);
  }

  return !existing;
}

async function appendBatchEventOnce(
  batchStore: MigrationBatchStore,
  input: {
    eventType: MigrationBatchEventType;
    message: string;
    jobId?: string | null;
    details?: MigrationBatchJsonObject;
  },
): Promise<boolean> {
  const existing = await batchStore.listBatchEvents(MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID);
  if (existing.some((event) => event.eventType === input.eventType && event.jobId === (input.jobId ?? null))) {
    return false;
  }
  await batchStore.appendBatchEvent({
    batchId: MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID,
    ...input,
  });
  return true;
}

async function ensureBatchEvents(batchStore: MigrationBatchStore): Promise<number> {
  const events: Array<Parameters<typeof appendBatchEventOnce>[1]> = [
    {
      eventType: "BATCH_EXECUTION_STARTED",
      message: "Smoke test demo batch inspection timeline started",
      details: { seed: "migration_batch_smoke_test", externalExecutionAttempted: false },
    },
    {
      eventType: "BATCH_JOB_STARTED",
      message: "Smoke test completed demo job started",
      jobId: "migration_job_smoke_completed_v1",
      details: { position: 0, seed: "migration_batch_smoke_test" },
    },
    {
      eventType: "BATCH_JOB_COMPLETED",
      message: "Smoke test completed demo job succeeded",
      jobId: "migration_job_smoke_completed_v1",
      details: { position: 0, seed: "migration_batch_smoke_test" },
    },
    {
      eventType: "BATCH_JOB_STARTED",
      message: "Smoke test failed demo job started",
      jobId: "migration_job_smoke_failed_v1",
      details: { position: 2, seed: "migration_batch_smoke_test" },
    },
    {
      eventType: "BATCH_JOB_FAILED",
      message: "Demo failure: source snapshot intentionally blocked for UI inspection.",
      jobId: "migration_job_smoke_failed_v1",
      details: { position: 2, seed: "migration_batch_smoke_test", safeDemoFailure: true },
    },
    {
      eventType: "BATCH_EXECUTION_PARTIALLY_FAILED",
      message: "Smoke test demo batch is partially failed for UI inspection",
      details: { seed: "migration_batch_smoke_test", externalExecutionAttempted: false },
    },
  ];

  let created = 0;
  for (const event of events) {
    if (await appendBatchEventOnce(batchStore, event)) created += 1;
  }
  return created;
}

export async function createMigrationBatchSmokeTestSeed(
  input: CreateMigrationBatchSmokeTestSeedInput,
): Promise<MigrationBatchSmokeTestSeedResult> {
  const existingBatch = await input.batchStore.getBatch(MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID);
  const createdJobs: string[] = [];
  const reusedJobs: string[] = [];

  const batch = existingBatch ?? await input.batchStore.createBatch({
    batchId: MIGRATION_BATCH_SMOKE_TEST_SEED_BATCH_ID,
    name: "Smoke Test Demo Migration Batch",
    description: "Admin/dev-only deterministic demo batch for Command Center UI inspection.",
    status: "partially_failed",
    createdBy: input.createdBy,
    metadata: {
      seed: "migration_batch_smoke_test",
      deterministic: true,
      safeDemoDataOnly: true,
      externalExecutionAttempted: false,
      providerDnsBillingTouched: false,
      sourceUrlsAreInvalid: true,
    },
    diagnostics: {
      skippedJobs: 0,
      safeSeed: true,
      executionBlocked: true,
      note: "Created for manual Command Center migration batch UI smoke testing only.",
    },
  });

  for (const definition of JOB_DEFINITIONS) {
    if (await ensureSeedJob(input.jobStore, definition)) {
      createdJobs.push(definition.jobId);
    } else {
      reusedJobs.push(definition.jobId);
    }
  }

  const existingMemberships = await input.batchStore.listBatchJobs(batch.batchId);
  const existingMembershipIds = new Set(existingMemberships.map((job) => job.jobId));
  const createdMemberships: string[] = [];
  const reusedMemberships: string[] = [];

  for (const definition of JOB_DEFINITIONS) {
    await input.batchStore.addJobToBatch({
      batchId: batch.batchId,
      jobId: definition.jobId,
      siteId: definition.siteId,
      siteVersionId: null,
      sourceUrl: definition.sourceUrl,
      position: definition.position,
      metadata: {
        seed: "migration_batch_smoke_test",
        expectedState: definition.state,
        externalFetchAttempted: false,
      },
    });
    if (existingMembershipIds.has(definition.jobId)) {
      reusedMemberships.push(definition.jobId);
    } else {
      createdMemberships.push(definition.jobId);
    }
  }

  await input.batchStore.updateBatchStatus({
    batchId: batch.batchId,
    status: "partially_failed" satisfies MigrationBatchStatus,
    diagnostics: {
      skippedJobs: 0,
      safeSeed: true,
      executionBlocked: true,
      completedDemoJobId: "migration_job_smoke_completed_v1",
      pendingDemoJobId: "migration_job_smoke_pending_v1",
      failedDemoJobId: "migration_job_smoke_failed_v1",
    },
  });
  const batchEventsCreated = await ensureBatchEvents(input.batchStore);

  const anyCreated = !existingBatch || createdJobs.length > 0 || createdMemberships.length > 0 || batchEventsCreated > 0;
  const repaired = Boolean(existingBatch) && anyCreated;

  return {
    batchId: batch.batchId,
    batchUrl: BATCH_URL,
    jobIds: [...MIGRATION_BATCH_SMOKE_TEST_SEED_JOB_IDS],
    status: !existingBatch ? "created" : repaired ? "repaired" : "reused",
    created: {
      batch: !existingBatch,
      jobs: createdJobs,
      memberships: createdMemberships,
      batchEvents: batchEventsCreated,
    },
    reused: {
      batch: Boolean(existingBatch),
      jobs: reusedJobs,
      memberships: reusedMemberships,
    },
    executionBlocked: true,
  };
}
