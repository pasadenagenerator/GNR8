import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createMigrationBatchActionEndpoint,
  submitMigrationBatchAction,
} from "../_lib/migration-batch-actions";
import {
  normalizeMigrationBatchDetailPayload,
  normalizeMigrationBatchListPayload,
} from "../_lib/migration-batches-view-model";

const LAYOUT_FILE = new URL("../CommandCenterLayout.tsx", import.meta.url);
const OVERVIEW_FILE = new URL("../page.tsx", import.meta.url);
const SITES_FILE = new URL("../sites/page.tsx", import.meta.url);
const LIST_PAGE_FILE = new URL("./page.tsx", import.meta.url);
const DETAIL_PAGE_FILE = new URL("./[batchId]/page.tsx", import.meta.url);
const VIEW_FILE = new URL("./_components/migration-batches-views.tsx", import.meta.url);

function batchListPayload() {
  return {
    batches: [
      {
        batchId: "batch-alpha",
        name: "Alpha rollout",
        status: "running",
        createdAt: "2026-06-03T10:00:00.000Z",
        summary: {
          totalJobs: 4,
          pendingJobs: 1,
          runningJobs: 1,
          completedJobs: 2,
          failedJobs: 0,
          pausedJobs: 0,
          progressPercent: 50,
          latestEventAt: "2026-06-03T10:30:00.000Z",
        },
      },
    ],
  };
}

function batchDetailPayload() {
  return {
    batchPayload: {
      batch: {
        batchId: "batch-alpha",
        name: "Alpha rollout",
        description: "Operator-visible migration batch",
        status: "partially_failed",
        createdAt: "2026-06-03T10:00:00.000Z",
        updatedAt: "2026-06-03T10:35:00.000Z",
        summary: {
          totalJobs: 4,
          pendingJobs: 1,
          runningJobs: 0,
          completedJobs: 2,
          failedJobs: 1,
          pausedJobs: 1,
          progressPercent: 50,
          latestEventAt: "2026-06-03T10:34:00.000Z",
        },
      },
    },
    observabilityPayload: {
      observability: {
        batch: {
          batchId: "batch-alpha",
          name: "Alpha rollout",
          status: "partially_failed",
          updatedAt: "2026-06-03T10:35:00.000Z",
        },
        summary: {
          totalJobs: 4,
          completedJobs: 2,
          failedJobs: 1,
          pendingJobs: 1,
          runningJobs: 0,
          skippedJobs: 0,
          pausedJobs: 1,
          successRate: 50,
          progressPercent: 50,
          firstFailureJobId: "job-failed",
          firstFailureReason: "Source URL returned 500",
          lastExecutedJobId: "job-failed",
          lastCompletedJobId: "job-complete",
          latestEventAt: "2026-06-03T10:34:00.000Z",
        },
        diagnostics: {
          executionCount: 1,
          runAttempts: 1,
          lastRunStartedAt: "2026-06-03T10:20:00.000Z",
          lastRunFinishedAt: "2026-06-03T10:35:00.000Z",
          lastExecutionDurationMs: 900000,
          currentlyRunnableJobs: ["job-pending", "job-paused"],
          blockedJobs: ["job-running"],
          completedJobs: ["job-complete"],
        },
        failures: {
          failedJobIds: ["job-failed"],
          failureCounts: { "job-failed": 2 },
          latestFailure: {
            jobId: "job-failed",
            count: 2,
            latestAt: "2026-06-03T10:34:00.000Z",
            latestReason: "Source URL returned 500",
            latestStage: "INTAKE",
          },
          failureReasons: { "job-failed": ["Source URL returned 500", "Could not read source URL"] },
          failures: [
            {
              jobId: "job-failed",
              count: 2,
              latestAt: "2026-06-03T10:34:00.000Z",
              latestReason: "Source URL returned 500",
              latestStage: "INTAKE",
            },
          ],
        },
        timeline: [
          {
            timestamp: "2026-06-03T10:20:00.000Z",
            eventType: "execution_started",
            jobId: null,
            message: "Migration batch execution started",
          },
          {
            timestamp: "2026-06-03T10:34:00.000Z",
            eventType: "job_failed",
            jobId: "job-failed",
            message: "Source URL returned 500",
          },
        ],
        generatedAt: "2026-06-03T10:36:00.000Z",
      },
    },
    timelinePayload: {
      batchId: "batch-alpha",
      timeline: [
        {
          timestamp: "2026-06-03T10:20:00.000Z",
          eventType: "execution_started",
          jobId: null,
          message: "Migration batch execution started",
        },
        {
          timestamp: "2026-06-03T10:34:00.000Z",
          eventType: "job_failed",
          jobId: "job-failed",
          message: "Source URL returned 500",
        },
      ],
    },
  };
}

test("migration batch list page renders stable batch data", async () => {
  const model = normalizeMigrationBatchListPayload(batchListPayload());
  const [pageSource, viewSource] = await Promise.all([readFile(LIST_PAGE_FILE, "utf8"), readFile(VIEW_FILE, "utf8")]);

  assert.equal(pageSource.includes("getMigrationBatchListViewModel"), true);
  assert.equal(pageSource.includes("<MigrationBatchListView"), true);
  assert.equal(viewSource.includes("Migration Batches"), true);
  assert.equal(viewSource.includes("Total Jobs"), true);
  assert.equal(viewSource.includes("Completed"), true);
  assert.equal(viewSource.includes("Failed"), true);
  assert.equal(model.batches[0]?.name, "Alpha rollout");
  assert.equal(model.batches[0]?.status, "running");
  assert.equal(model.batches[0]?.progressPercent, 50);
  assert.equal(model.batches[0]?.batchId, "batch-alpha");
});

test("migration batch detail page renders summary", async () => {
  const model = normalizeMigrationBatchDetailPayload(batchDetailPayload());
  const [pageSource, viewSource] = await Promise.all([readFile(DETAIL_PAGE_FILE, "utf8"), readFile(VIEW_FILE, "utf8")]);

  assert.equal(pageSource.includes("getMigrationBatchDetailViewModel"), true);
  assert.equal(pageSource.includes("<MigrationBatchDetailView"), true);
  assert.equal(viewSource.includes("Summary"), true);
  assert.equal(viewSource.includes("Total Jobs"), true);
  assert.equal(viewSource.includes("Completed Jobs"), true);
  assert.equal(viewSource.includes("First failure:"), true);
  assert.equal(model.batch?.name, "Alpha rollout");
  assert.equal(model.batch?.summary.firstFailureReason, "Source URL returned 500");
});

test("migration batch detail page renders diagnostics", async () => {
  const model = normalizeMigrationBatchDetailPayload(batchDetailPayload());
  const viewSource = await readFile(VIEW_FILE, "utf8");

  assert.equal(viewSource.includes("Diagnostics"), true);
  assert.equal(viewSource.includes("Execution Count"), true);
  assert.equal(viewSource.includes("Runnable Jobs"), true);
  assert.deepEqual(model.batch?.diagnostics.currentlyRunnableJobs, ["job-pending", "job-paused"]);
  assert.deepEqual(model.batch?.diagnostics.blockedJobs, ["job-running"]);
});

test("migration batch detail page renders failure surface", async () => {
  const model = normalizeMigrationBatchDetailPayload(batchDetailPayload());
  const viewSource = await readFile(VIEW_FILE, "utf8");

  assert.equal(viewSource.includes("Failures"), true);
  assert.equal(viewSource.includes("Latest failure:"), true);
  assert.equal(model.batch?.failures.latestFailure?.jobId, "job-failed");
  assert.deepEqual(model.batch?.failures.failureReasons["job-failed"], ["Source URL returned 500", "Could not read source URL"]);
});

test("migration batch detail page renders timeline", async () => {
  const model = normalizeMigrationBatchDetailPayload(batchDetailPayload());
  const viewSource = await readFile(VIEW_FILE, "utf8");

  assert.equal(viewSource.includes("Timeline"), true);
  assert.equal(viewSource.includes("batch.timeline.map"), true);
  assert.deepEqual(model.batch?.timeline.map((entry) => entry.eventType), ["execution_started", "job_failed"]);
  assert.equal(model.batch?.timeline[0]?.message, "Migration batch execution started");
});

test("migration batch run action calls correct API", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const result = await submitMigrationBatchAction({
    endpoint: createMigrationBatchActionEndpoint("batch-alpha", "run"),
    fetchImpl: (async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch,
  });

  assert.deepEqual(result, { ok: true, message: "Migration batch action completed." });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "/api/gnr8/admin/migration-batches/batch-alpha/run");
  assert.equal(calls[0]?.init?.method, "POST");
});

test("migration batch resume action calls correct API", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const result = await submitMigrationBatchAction({
    endpoint: createMigrationBatchActionEndpoint("batch-alpha", "resume"),
    fetchImpl: (async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch,
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "/api/gnr8/admin/migration-batches/batch-alpha/resume");
  assert.equal(calls[0]?.init?.method, "POST");
});

test("migration batch view model normalizes API data", () => {
  const listModel = normalizeMigrationBatchListPayload(batchListPayload());
  const detailModel = normalizeMigrationBatchDetailPayload(batchDetailPayload());

  assert.equal(listModel.batches[0]?.href, "/gnr8/command-center/migration-batches/batch-alpha");
  assert.equal(listModel.batches[0]?.totalJobs, 4);
  assert.equal(listModel.batches[0]?.completedJobs, 2);
  assert.equal(detailModel.batch?.summary.failedJobs, 1);
  assert.equal(detailModel.batch?.diagnostics.lastExecutionDurationMs, 900000);
  assert.deepEqual(detailModel.batch?.failures.failureCounts, { "job-failed": 2 });
  assert.equal(detailModel.batch?.timeline.length, 2);
  assert.equal(detailModel.batch?.runEndpoint, "/api/gnr8/admin/migration-batches/batch-alpha/run");
  assert.equal(detailModel.batch?.resumeEndpoint, "/api/gnr8/admin/migration-batches/batch-alpha/resume");
});

test("existing Command Center pages remain wired", async () => {
  const [layoutSource, overviewSource, sitesSource] = await Promise.all([
    readFile(LAYOUT_FILE, "utf8"),
    readFile(OVERVIEW_FILE, "utf8"),
    readFile(SITES_FILE, "utf8"),
  ]);

  assert.equal(layoutSource.includes('href: "/gnr8/command-center"'), true);
  assert.equal(layoutSource.includes('href: "/gnr8/command-center/sites"'), true);
  assert.equal(layoutSource.includes('href: "/gnr8/command-center/agencies"'), true);
  assert.equal(layoutSource.includes('href: "/gnr8/command-center/migration-batches"'), true);
  assert.equal(overviewSource.includes("Open Sites Surface"), true);
  assert.equal(overviewSource.includes("Open Agencies Surface"), true);
  assert.equal(sitesSource.includes("<CommandCenterOpsTable"), true);
});
