import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeProviderJobInsertRows,
  mapRuntimeProviderJobRow,
  mapRuntimeProviderJobToRow,
  type RuntimeProviderJobRow,
} from "@/gnr8/runtime/provider-jobs/runtime-provider-job-store";
import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";

function buildJob(input?: Partial<RuntimeProviderJob>): RuntimeProviderJob {
  return {
    id: "provider_job_1",
    siteId: "site_1",
    siteVersionId: "sv_1",
    providerId: "mock_provider",
    environment: "sandbox",
    operationKind: "upsert_dns_record",
    status: "queued",
    intentPayload: { kind: "upsert_dns_record", host: "www", type: "CNAME", value: "target.example.com" },
    dryRunPayload: { actionMode: "provider_api_future", dryRunStatus: "ready" },
    resultPayload: { accepted: true },
    errorPayload: { code: "none" },
    correlationKey: "corr_b",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...input,
  };
}

test("provider job store mapper: job row roundtrip", () => {
  const job = buildJob();
  const row = mapRuntimeProviderJobToRow(job);
  const roundtrip = mapRuntimeProviderJobRow(row);

  assert.deepEqual(roundtrip, job);
});

test("provider job store mapper: optional siteVersionId maps to nullable row", () => {
  const job = buildJob({ siteVersionId: undefined });
  const row = mapRuntimeProviderJobToRow(job);

  assert.equal(row.site_version_id, null);
  assert.equal(mapRuntimeProviderJobRow(row).siteVersionId, undefined);
});

test("provider job store mapper: preserves payload and timestamp strings", () => {
  const job = buildJob({
    intentPayload: { nested: { x: 1, y: ["a", "b"] } },
    dryRunPayload: { ready: true, steps: ["one"] },
    resultPayload: { output: { status: "ok" } },
    errorPayload: { message: "warn" },
    createdAt: "2026-03-05T12:34:56.789Z",
    updatedAt: "2026-03-06T01:02:03.456Z",
  });

  const row = mapRuntimeProviderJobToRow(job);

  assert.deepEqual(row.intent_payload, job.intentPayload);
  assert.deepEqual(row.dry_run_payload, job.dryRunPayload);
  assert.deepEqual(row.result_payload, job.resultPayload);
  assert.deepEqual(row.error_payload, job.errorPayload);
  assert.equal(row.created_at, job.createdAt);
  assert.equal(row.updated_at, job.updatedAt);
});

test("provider job store mapper: deterministic insert row ordering", () => {
  const jobs = [
    buildJob({ id: "provider_job_c", correlationKey: "corr_c" }),
    buildJob({ id: "provider_job_a", correlationKey: "corr_a" }),
    buildJob({ id: "provider_job_b", correlationKey: "corr_b" }),
    buildJob({ id: "provider_job_a2", correlationKey: "corr_a" }),
  ];

  const rows = createRuntimeProviderJobInsertRows(jobs);

  assert.deepEqual(
    rows.map((row) => [row.correlation_key, row.id]),
    [
      ["corr_a", "provider_job_a"],
      ["corr_a", "provider_job_a2"],
      ["corr_b", "provider_job_b"],
      ["corr_c", "provider_job_c"],
    ],
  );
});

test("provider job store mapper: blocked job row shape", () => {
  const job = buildJob({
    status: "blocked",
    operationKind: "activate_domain_binding",
    dryRunPayload: { actionMode: "blocked", reason: "gate_closed" },
    resultPayload: undefined,
    errorPayload: undefined,
  });

  const row = mapRuntimeProviderJobToRow(job);
  const expected: RuntimeProviderJobRow = {
    id: "provider_job_1",
    site_id: "site_1",
    site_version_id: "sv_1",
    provider_id: "mock_provider",
    environment: "sandbox",
    operation_kind: "activate_domain_binding",
    status: "blocked",
    intent_payload: { kind: "upsert_dns_record", host: "www", type: "CNAME", value: "target.example.com" },
    dry_run_payload: { actionMode: "blocked", reason: "gate_closed" },
    result_payload: null,
    error_payload: null,
    correlation_key: "corr_b",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  assert.deepEqual(row, expected);
});

test("provider job store mapper: pure in-memory mapping with no DB dependency", () => {
  const row = mapRuntimeProviderJobToRow(buildJob());

  assert.equal(typeof row.id, "string");
  assert.equal(Object.prototype.hasOwnProperty.call(row, "site_id"), true);
});
