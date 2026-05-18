import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import {
  createRuntimeProviderJobs,
  getRuntimeProviderJobById,
  getRuntimeProviderJobsByCorrelationKey,
  getRuntimeProviderJobsBySite,
  updateRuntimeProviderJobStatus,
} from "@/gnr8/runtime/provider-jobs/runtime-provider-job-repository";
import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_jobs" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function buildJob(input?: Partial<RuntimeProviderJob>): RuntimeProviderJob {
  const nonce = randomUUID();
  return {
    id: `provider_job_${nonce}`,
    siteId: `site_${nonce}`,
    siteVersionId: `site_version_${nonce}`,
    providerId: "mock_provider",
    environment: "sandbox",
    operationKind: "upsert_dns_record",
    status: "queued",
    intentPayload: { action: "upsert_dns_record", host: "www", value: "target.example.com" },
    dryRunPayload: { mode: "provider_api_future", status: "ready_with_warnings" },
    resultPayload: undefined,
    errorPayload: undefined,
    correlationKey: `corr_${nonce}`,
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...input,
  };
}

async function cleanup(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getSuperadminPool().query(`delete from public.gnr8_runtime_provider_jobs where id = any($1::text[])`, [ids]);
}

function getMissingTableSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed runtime provider job repository tests: DATABASE_URL is not configured for local integration runs.";
  }
  if (!error.message.includes(MISSING_TABLE_MESSAGE)) return null;
  return `Skipping DB-backed runtime provider job repository tests: missing migration table public.gnr8_runtime_provider_jobs (${MISSING_TABLE_MESSAGE}).`;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getRepositoryDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        await getSuperadminPool().query(`select 1 from public.gnr8_runtime_provider_jobs limit 1`);
        return null;
      } catch (error) {
        const skipReason = getMissingTableSkipReason(error);
        if (skipReason) return skipReason;
        throw error;
      }
    })();
  }
  return dbSkipReasonPromise;
}

async function skipIfRepositoryTableMissing(t: TestContext): Promise<boolean> {
  const skipReason = await getRepositoryDbSkipReason();
  if (!skipReason) return false;
  t.skip(skipReason);
  return true;
}

test("runtime provider job repository: create/read roundtrip by id and correlation key", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const job = buildJob();
  try {
    const inserted = await createRuntimeProviderJobs([job]);
    assert.equal(inserted.length, 1);
    assert.deepEqual(inserted[0], job);

    const byId = await getRuntimeProviderJobById(job.id);
    assert.deepEqual(byId, job);

    const byCorrelation = await getRuntimeProviderJobsByCorrelationKey(job.correlationKey);
    assert.deepEqual(byCorrelation, [job]);
  } finally {
    await cleanup([job.id]);
  }
});

test("runtime provider job repository: duplicate correlation insert is ignored", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const sharedCorrelation = `corr_duplicate_${randomUUID()}`;
  const first = buildJob({ id: `provider_job_first_${randomUUID()}`, correlationKey: sharedCorrelation });
  const second = buildJob({ id: `provider_job_second_${randomUUID()}`, correlationKey: sharedCorrelation });
  try {
    const inserted = await createRuntimeProviderJobs([second, first]);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.id, first.id);
    assert.equal(inserted[0]?.correlationKey, sharedCorrelation);

    const stored = await getRuntimeProviderJobsByCorrelationKey(sharedCorrelation);
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.id, first.id);
  } finally {
    await cleanup([first.id, second.id]);
  }
});

test("runtime provider job repository: deterministic insert ordering", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const siteId = `site_order_${randomUUID()}`;
  const a = buildJob({
    id: `provider_job_a_${randomUUID()}`,
    siteId,
    correlationKey: "corr_a",
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  });
  const b = buildJob({
    id: `provider_job_b_${randomUUID()}`,
    siteId,
    correlationKey: "corr_b",
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  });
  const c = buildJob({
    id: `provider_job_c_${randomUUID()}`,
    siteId,
    correlationKey: "corr_a",
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  });

  try {
    const inserted = await createRuntimeProviderJobs([b, c, a]);
    assert.deepEqual(
      inserted.map((job) => [job.correlationKey, job.id]),
      [
        [a.correlationKey, a.id],
        [c.correlationKey, c.id],
        [b.correlationKey, b.id],
      ],
    );
  } finally {
    await cleanup([a.id, b.id, c.id]);
  }
});

test("runtime provider job repository: valid status transitions are applied", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const job = buildJob();
  try {
    await createRuntimeProviderJobs([job]);

    const running = await updateRuntimeProviderJobStatus({
      id: job.id,
      status: "running",
      updatedAt: "2026-05-18T12:05:00.000Z",
    });
    assert.equal(running?.report.status, "applied");
    assert.equal(running?.report.previousStatus, "queued");
    assert.equal(running?.report.requestedStatus, "running");
    assert.deepEqual(running?.report.warnings, []);
    assert.deepEqual(running?.report.blockers, []);
    assert.equal(running?.job.status, "running");

    const completed = await updateRuntimeProviderJobStatus({
      id: job.id,
      status: "completed",
      updatedAt: "2026-05-18T12:06:00.000Z",
    });
    assert.equal(completed?.report.status, "applied");
    assert.equal(completed?.report.previousStatus, "running");
    assert.equal(completed?.report.requestedStatus, "completed");
    assert.equal(completed?.job.status, "completed");
  } finally {
    await cleanup([job.id]);
  }
});

test("runtime provider job repository: invalid status transitions are rejected with unchanged object", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const job = buildJob();
  try {
    await createRuntimeProviderJobs([job]);
    const rejected = await updateRuntimeProviderJobStatus({
      id: job.id,
      status: "completed",
      updatedAt: "2026-05-18T12:05:00.000Z",
    });

    assert.equal(rejected?.report.status, "rejected");
    assert.equal(rejected?.report.previousStatus, "queued");
    assert.equal(rejected?.report.requestedStatus, "completed");
    assert.equal(rejected?.report.correlationKey, job.correlationKey);
    assert.equal(rejected?.report.warnings.length, 1);
    assert.equal(rejected?.report.blockers.length, 1);
    assert.equal(rejected?.job.status, "queued");

    const stored = await getRuntimeProviderJobById(job.id);
    assert.equal(stored?.status, "queued");
  } finally {
    await cleanup([job.id]);
  }
});

test("runtime provider job repository: get by site applies stable ordering (created_at asc, id asc)", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const siteId = `site_sort_${randomUUID()}`;
  const secondCreated = "2026-05-18T12:01:00.000Z";
  const firstCreated = "2026-05-18T12:00:00.000Z";

  const job1 = buildJob({
    id: "provider_job_sort_01",
    siteId,
    correlationKey: `corr_sort_1_${randomUUID()}`,
    createdAt: secondCreated,
    updatedAt: secondCreated,
  });
  const job2 = buildJob({
    id: "provider_job_sort_00",
    siteId,
    correlationKey: `corr_sort_2_${randomUUID()}`,
    createdAt: firstCreated,
    updatedAt: firstCreated,
  });
  const job3 = buildJob({
    id: "provider_job_sort_02",
    siteId,
    correlationKey: `corr_sort_3_${randomUUID()}`,
    createdAt: secondCreated,
    updatedAt: secondCreated,
  });

  try {
    await createRuntimeProviderJobs([job1, job2, job3]);
    const jobs = await getRuntimeProviderJobsBySite(siteId);
    assert.deepEqual(
      jobs.map((job) => job.id),
      [job2.id, job1.id, job3.id],
    );
  } finally {
    await cleanup([job1.id, job2.id, job3.id]);
  }
});

test("runtime provider job repository: no execution side effects, persistence-only updates", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const job = buildJob({
    intentPayload: { operation: "manual_instruction", note: "no-op side effect check" },
    dryRunPayload: { readiness: "blocked", warnings: ["manual_execution_required"] },
    status: "queued",
  });
  try {
    await createRuntimeProviderJobs([job]);

    const blocked = await updateRuntimeProviderJobStatus({
      id: job.id,
      status: "blocked",
      updatedAt: "2026-05-18T12:10:00.000Z",
    });
    assert.equal(blocked?.report.status, "applied");
    assert.equal(blocked?.job.status, "blocked");
    assert.deepEqual(blocked?.job.intentPayload, job.intentPayload);
    assert.deepEqual(blocked?.job.dryRunPayload, job.dryRunPayload);
    assert.equal(blocked?.job.resultPayload, undefined);
    assert.equal(blocked?.job.errorPayload, undefined);
  } finally {
    await cleanup([job.id]);
  }
});
