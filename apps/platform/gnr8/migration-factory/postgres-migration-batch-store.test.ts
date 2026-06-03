import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import { PostgresMigrationBatchStore } from "@/gnr8/migration-factory/postgres-migration-batch-store";
import { PostgresMigrationJobStore } from "@/gnr8/migration-factory/postgres-migration-job-store";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_jobs" does not exist`;
const MISSING_BATCHES_TABLE_MESSAGE = `relation "public.gnr8_migration_batches" does not exist`;
const MISSING_BATCH_JOBS_TABLE_MESSAGE = `relation "public.gnr8_migration_batch_jobs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function createClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-06-03T12:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

async function getBatchStoreDbSkipReason(): Promise<string | null> {
  try {
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_jobs limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batches limit 1`);
    await getSuperadminPool().query(`select 1 from public.gnr8_migration_batch_jobs limit 1`);
    return null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
      return "Skipping DB-backed migration batch store tests: DATABASE_URL is not configured for local integration runs.";
    }
    if (
      error.message.includes(MISSING_JOBS_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCHES_TABLE_MESSAGE) ||
      error.message.includes(MISSING_BATCH_JOBS_TABLE_MESSAGE)
    ) {
      return "Skipping DB-backed migration batch store tests: migration batch/job tables are not available.";
    }
    throw error;
  }
}

async function cleanup(input: { batchIds: string[]; jobIds: string[] }): Promise<void> {
  if (input.batchIds.length > 0) {
    await getSuperadminPool().query(`delete from public.gnr8_migration_batches where id = any($1::text[])`, [
      input.batchIds,
    ]);
  }
  if (input.jobIds.length > 0) {
    await getSuperadminPool().query(`delete from public.gnr8_migration_jobs where id = any($1::text[])`, [
      input.jobIds,
    ]);
  }
}

test("postgres migration batch store: durable batch membership and summary derive from job states", async (t: TestContext) => {
  const skipReason = await getBatchStoreDbSkipReason();
  if (skipReason) {
    t.skip(skipReason);
    return;
  }

  const now = createClock();
  const batchStore = new PostgresMigrationBatchStore({ now });
  const jobStore = new PostgresMigrationJobStore({ now });
  const nonce = randomUUID();
  const batchId = `migration_batch_test_${nonce}`;
  const jobIds = [
    `migration_batch_job_pending_${nonce}`,
    `migration_batch_job_completed_${nonce}`,
    `migration_batch_job_failed_${nonce}`,
  ];
  const eventTimestamp = now();

  try {
    const batch = await batchStore.createBatch({
      batchId,
      name: "Phase 3 test batch",
      description: "DB-gated durable batch test",
      createdBy: "postgres-test",
      metadata: { source: "postgres-migration-batch-store.test" },
    });
    assert.equal(batch.batchId, batchId);
    assert.equal(batch.status, "draft");

    await jobStore.createJob({
      jobId: jobIds[0],
      siteId: `site_pending_${nonce}`,
      sourceUrl: `https://pending-${nonce}.example.com`,
    });
    const completedJob = await jobStore.createJob({
      jobId: jobIds[1],
      siteId: `site_completed_${nonce}`,
      sourceUrl: `https://completed-${nonce}.example.com`,
    });
    await jobStore.updateJob(completedJob.jobId, { overallState: "COMPLETED" });
    await jobStore.appendExecutionEvent(completedJob.jobId, {
      type: "JOB_COMPLETED",
      timestamp: eventTimestamp,
      message: "Job completed for batch summary",
    });

    const failedJob = await jobStore.createJob({
      jobId: jobIds[2],
      siteId: `site_failed_${nonce}`,
      sourceUrl: `https://failed-${nonce}.example.com`,
    });
    await jobStore.updateJob(failedJob.jobId, {
      overallState: "FAILED",
      lastError: {
        code: "BATCH_TEST_FAILURE",
        message: "Forced failure for summary counts",
      },
    });

    await batchStore.addJobToBatch({ batchId, jobId: jobIds[0], metadata: { lane: "pending" } });
    await batchStore.addJobToBatch({ batchId, jobId: jobIds[1], metadata: { lane: "completed" } });
    await batchStore.addJobToBatch({ batchId, jobId: jobIds[2], metadata: { lane: "failed" } });

    const duplicate = await batchStore.addJobToBatch({ batchId, jobId: jobIds[1], metadata: { lane: "completed" } });
    assert.equal(duplicate.jobId, jobIds[1]);

    const jobs = await batchStore.listBatchJobs(batchId);
    assert.equal(jobs.length, 3);
    assert.deepEqual(jobs.map((job) => job.jobStatus), ["PENDING", "COMPLETED", "FAILED"]);

    const summary = await batchStore.getBatchSummary(batchId);
    assert.deepEqual(summary, {
      batchId,
      totalJobs: 3,
      pendingJobs: 1,
      runningJobs: 0,
      completedJobs: 1,
      failedJobs: 1,
      pausedJobs: 0,
      progressPercent: 33,
      latestEventAt: eventTimestamp,
    });

    const listed = await batchStore.listBatches();
    const listedBatch = listed.find((item) => item.batchId === batchId);
    assert.ok(listedBatch);
    assert.equal(listedBatch?.summary.totalJobs, 3);
    assert.equal(listedBatch?.summary.progressPercent, 33);

    const removed = await batchStore.removeJobFromBatch(batchId, jobIds[2]);
    assert.equal(removed, true);
    const afterRemove = await batchStore.getBatchSummary(batchId);
    assert.equal(afterRemove?.totalJobs, 2);
    assert.equal(afterRemove?.progressPercent, 50);
  } finally {
    await cleanup({ batchIds: [batchId], jobIds });
  }
});
