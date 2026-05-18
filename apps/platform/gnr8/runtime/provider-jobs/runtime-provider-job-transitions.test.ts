import assert from "node:assert/strict";
import test from "node:test";

import {
  applyRuntimeProviderJobStatusTransition,
  canTransitionRuntimeProviderJobStatus,
  createRuntimeProviderJobTransitionReport,
} from "@/gnr8/runtime/provider-jobs/runtime-provider-job-transitions";
import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";

function buildJob(input?: Partial<RuntimeProviderJob>): RuntimeProviderJob {
  return {
    id: "provider_job_transitions_1",
    siteId: "site_transitions_1",
    siteVersionId: "site_version_transitions_1",
    providerId: "mock_provider",
    environment: "sandbox",
    operationKind: "upsert_dns_record",
    status: "queued",
    intentPayload: { action: "upsert_dns_record", host: "www", value: "target.example.com" },
    dryRunPayload: { mode: "provider_api_future", status: "ready_with_warnings" },
    resultPayload: undefined,
    errorPayload: undefined,
    correlationKey: "corr_transition_seed_1",
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...input,
  };
}

test("provider job transitions: all valid transitions are allowed and applied", () => {
  assert.equal(canTransitionRuntimeProviderJobStatus("queued", "running"), true);
  assert.equal(canTransitionRuntimeProviderJobStatus("running", "completed"), true);
  assert.equal(canTransitionRuntimeProviderJobStatus("running", "failed"), true);
  assert.equal(canTransitionRuntimeProviderJobStatus("queued", "blocked"), true);

  const queued = buildJob({ status: "queued" });
  const running = applyRuntimeProviderJobStatusTransition({
    job: queued,
    requestedStatus: "running",
    updatedAt: "2026-05-18T12:01:00.000Z",
  });
  assert.equal(running.report.status, "applied");
  assert.equal(running.job.status, "running");

  const completed = applyRuntimeProviderJobStatusTransition({
    job: buildJob({ status: "running" }),
    requestedStatus: "completed",
    updatedAt: "2026-05-18T12:02:00.000Z",
  });
  assert.equal(completed.report.status, "applied");
  assert.equal(completed.job.status, "completed");

  const failed = applyRuntimeProviderJobStatusTransition({
    job: buildJob({ status: "running" }),
    requestedStatus: "failed",
    updatedAt: "2026-05-18T12:02:00.000Z",
  });
  assert.equal(failed.report.status, "applied");
  assert.equal(failed.job.status, "failed");

  const blocked = applyRuntimeProviderJobStatusTransition({
    job: queued,
    requestedStatus: "blocked",
    updatedAt: "2026-05-18T12:03:00.000Z",
  });
  assert.equal(blocked.report.status, "applied");
  assert.equal(blocked.job.status, "blocked");
});

test("provider job transitions: invalid transitions are rejected", () => {
  assert.equal(canTransitionRuntimeProviderJobStatus("queued", "completed"), false);
  assert.equal(canTransitionRuntimeProviderJobStatus("queued", "failed"), false);
  assert.equal(canTransitionRuntimeProviderJobStatus("running", "blocked"), false);
  assert.equal(canTransitionRuntimeProviderJobStatus("blocked", "running"), false);
  assert.equal(canTransitionRuntimeProviderJobStatus("completed", "failed"), false);
});

test("provider job transitions: deterministic correlation key in report", () => {
  const job = buildJob({ correlationKey: "corr_deterministic_1", status: "queued" });
  const a = createRuntimeProviderJobTransitionReport({
    job,
    requestedStatus: "running",
    status: "applied",
  });
  const b = createRuntimeProviderJobTransitionReport({
    job,
    requestedStatus: "running",
    status: "applied",
  });

  assert.equal(a.correlationKey, "corr_deterministic_1");
  assert.equal(b.correlationKey, "corr_deterministic_1");
  assert.deepEqual(a, b);
});

test("provider job transitions: rejected transition returns unchanged job object", () => {
  const job = buildJob({ status: "queued" });
  const result = applyRuntimeProviderJobStatusTransition({
    job,
    requestedStatus: "completed",
    updatedAt: "2026-05-18T12:05:00.000Z",
  });

  assert.equal(result.report.status, "rejected");
  assert.equal(result.job, job);
  assert.equal(result.job.status, "queued");
  assert.equal(result.job.updatedAt, "2026-05-18T12:00:00.000Z");
});
