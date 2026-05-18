import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderJobCorrelationKey, createRuntimeProviderJobPlan } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-planner";
import type { ProviderExecutionGateReport } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { RuntimeDomainExecutionDryRun, RuntimeDomainExecutionDryRunAction } from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type { RuntimeDomainExecutionAction } from "@/gnr8/runtime/domains/runtime-domain-execution-intent";

function buildDryRunAction(input?: Partial<RuntimeDomainExecutionDryRunAction>): RuntimeDomainExecutionDryRunAction {
  return {
    kind: "manual_instruction",
    reason: "dns_manual_step",
    actionMode: "manual_instruction",
    ...input,
  };
}

function buildBlockedAction(input?: Partial<RuntimeDomainExecutionAction>): RuntimeDomainExecutionAction {
  return {
    kind: "manual_instruction",
    reason: "dns_manual_step",
    ...input,
  };
}

function buildDryRun(input?: Partial<RuntimeDomainExecutionDryRun>): RuntimeDomainExecutionDryRun {
  return {
    siteId: "site_1",
    providerId: "manual",
    executionMode: "manual",
    dryRunActions: [],
    skippedActions: [],
    blockedActions: [],
    warnings: [],
    blockers: [],
    providerAdapterStatus: {
      providerId: "manual",
      adapterAvailable: true,
      contractStatus: "pass",
      warnings: [],
      blockers: [],
    },
    dryRunStatus: "ready_with_warnings",
    correlationKey: "dry_run_key",
    ...input,
  };
}

function buildGate(input?: Partial<ProviderExecutionGateReport>): ProviderExecutionGateReport {
  return {
    providerId: "manual",
    requestedEnvironment: "contract",
    gateStatus: "open_for_mock",
    allowedActionKinds: [],
    blockedActionKinds: [],
    warnings: [],
    blockers: [],
    correlationKey: "gate_key",
    ...input,
  };
}

test("provider job planner: manual dry-run actions create queued manual jobs", () => {
  const jobs = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      dryRunActions: [
        buildDryRunAction({ kind: "manual_instruction", manualStep: "add CNAME" }),
        buildDryRunAction({ kind: "upsert_dns_record", name: "www", type: "CNAME", value: "target.example.com" }),
      ],
    }),
    executionGate: buildGate(),
    environment: "contract",
    nowIso: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(jobs.length, 2);
  assert.equal(jobs.every((job) => job.status === "queued"), true);
  assert.equal(jobs[0]?.operationKind, "manual_instruction");
});

test("provider job planner: mock_provider provider_api_future actions create queued sandbox jobs when gate is open_for_sandbox_dry_run", () => {
  const jobs = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      providerId: "mock_provider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" }),
        buildDryRunAction({ kind: "check_domain_availability", actionMode: "provider_api_future" }),
      ],
    }),
    executionGate: buildGate({
      providerId: "mock_provider",
      requestedEnvironment: "sandbox",
      gateStatus: "open_for_sandbox_dry_run",
    }),
    environment: "sandbox",
    nowIso: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(jobs.length, 2);
  assert.equal(jobs.every((job) => job.status === "queued"), true);
  assert.deepEqual(
    jobs.map((job) => job.operationKind),
    ["check_domain_availability", "upsert_dns_record"],
  );
});

test("provider job planner: live actions are blocked", () => {
  const jobs = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      providerId: "mock_provider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "purchase_domain", actionMode: "provider_api_future" }),
        buildDryRunAction({ kind: "create_dns_zone", actionMode: "provider_api_future" }),
      ],
    }),
    executionGate: buildGate({
      providerId: "mock_provider",
      requestedEnvironment: "live",
      gateStatus: "blocked",
    }),
    environment: "live",
  });

  assert.equal(jobs.length, 2);
  assert.equal(jobs.every((job) => job.status === "blocked"), true);
});

test("provider job planner: blocked dry-run actions create blocked jobs", () => {
  const jobs = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      providerId: "mock_provider",
      executionMode: "provider_api_future",
      blockedActions: [
        buildBlockedAction({ kind: "activate_domain_binding", domain: "maver.example.com" }),
        buildBlockedAction({ kind: "verify_dns_record", domain: "maver.example.com" }),
      ],
    }),
    executionGate: buildGate({
      providerId: "mock_provider",
      requestedEnvironment: "sandbox",
      gateStatus: "blocked",
    }),
    environment: "sandbox",
  });

  assert.equal(jobs.length, 2);
  assert.equal(jobs.every((job) => job.status === "blocked"), true);
  assert.deepEqual(
    jobs.map((job) => job.operationKind),
    ["activate_domain_binding", "verify_dns_record"],
  );
});

test("provider job planner: deterministic ordering", () => {
  const a = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      providerId: "mock_provider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future", name: "www", type: "CNAME", value: "a.example.com" }),
        buildDryRunAction({ kind: "manual_instruction", actionMode: "manual_instruction", manualStep: "set TXT" }),
      ],
      blockedActions: [buildBlockedAction({ kind: "activate_domain_binding", domain: "maver.example.com" })],
    }),
    executionGate: buildGate({
      providerId: "mock_provider",
      requestedEnvironment: "sandbox",
      gateStatus: "open_for_sandbox_dry_run",
    }),
    environment: "sandbox",
  });

  const b = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      providerId: "mock_provider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "manual_instruction", actionMode: "manual_instruction", manualStep: "set TXT" }),
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future", name: "www", type: "CNAME", value: "a.example.com" }),
      ],
      blockedActions: [buildBlockedAction({ kind: "activate_domain_binding", domain: "maver.example.com" })],
    }),
    executionGate: buildGate({
      providerId: "mock_provider",
      requestedEnvironment: "sandbox",
      gateStatus: "open_for_sandbox_dry_run",
    }),
    environment: "sandbox",
  });

  assert.deepEqual(
    a.map((job) => [job.status, job.operationKind, job.intentPayload]),
    b.map((job) => [job.status, job.operationKind, job.intentPayload]),
  );
});

test("provider job planner: stable correlation key", () => {
  const a = createRuntimeProviderJobCorrelationKey({
    siteId: "site_1",
    siteVersionId: "v_1",
    providerId: "mock_provider",
    environment: "sandbox",
    operationKind: "upsert_dns_record",
    status: "queued",
    actionMode: "provider_api_future",
    correlationSeed: "seed_1",
    orderIndex: 2,
  });

  const b = createRuntimeProviderJobCorrelationKey({
    siteId: "site_1",
    siteVersionId: "v_1",
    providerId: "mock_provider",
    environment: "sandbox",
    operationKind: "upsert_dns_record",
    status: "queued",
    actionMode: "provider_api_future",
    correlationSeed: "seed_1",
    orderIndex: 2,
  });

  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test("provider job planner: no external provider calls", () => {
  const jobs = createRuntimeProviderJobPlan({
    dryRun: buildDryRun({
      providerId: "mock_provider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [buildDryRunAction({ kind: "check_domain_availability", actionMode: "provider_api_future" })],
    }),
    executionGate: buildGate({
      providerId: "mock_provider",
      requestedEnvironment: "sandbox",
      gateStatus: "open_for_sandbox_dry_run",
    }),
    environment: "sandbox",
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.operationKind, "check_domain_availability");
});
