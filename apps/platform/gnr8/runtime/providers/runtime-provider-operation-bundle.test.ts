import assert from "node:assert/strict";
import test from "node:test";

import type { ProviderExecutionGateReport } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { RuntimeDomainExecutionDryRun } from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type { RuntimeDomainExecutionIntent } from "@/gnr8/runtime/domains/runtime-domain-execution-intent";
import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";
import type { AgencyProviderSelection } from "@/gnr8/runtime/providers/agency-provider-selection";
import type { RuntimeProviderCommunicatorResult } from "@/gnr8/runtime/providers/runtime-provider-communicator";
import {
  createRuntimeProviderOperationBundle,
  type CreateRuntimeProviderOperationBundleInput,
} from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";

function baseProviderSelection(overrides: Partial<AgencyProviderSelection> = {}): AgencyProviderSelection {
  return {
    selectedProviderId: "manual",
    environment: "sandbox",
    selectionReason: "test_selection",
    warnings: [],
    blockers: [],
    correlationKey: "selection_key",
    ...overrides,
  };
}

function baseCommunicatorResult(overrides: Partial<RuntimeProviderCommunicatorResult> = {}): RuntimeProviderCommunicatorResult {
  return {
    providerId: "manual",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    adapterAvailable: true,
    routeStatus: "manual",
    warnings: [],
    blockers: [],
    correlationKey: "communicator_key",
    ...overrides,
  };
}

function baseExecutionIntent(overrides: Partial<RuntimeDomainExecutionIntent> = {}): RuntimeDomainExecutionIntent {
  return {
    siteId: "site_1",
    providerId: "manual",
    executionMode: "manual",
    executableActions: [],
    blockedActions: [],
    manualActions: [],
    warnings: [],
    blockers: [],
    correlationKey: "intent_key",
    ...overrides,
  };
}

function baseExecutionDryRun(overrides: Partial<RuntimeDomainExecutionDryRun> = {}): RuntimeDomainExecutionDryRun {
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
    ...overrides,
  };
}

function baseExecutionGate(overrides: Partial<ProviderExecutionGateReport> = {}): ProviderExecutionGateReport {
  return {
    providerId: "manual",
    requestedEnvironment: "sandbox",
    gateStatus: "open_for_sandbox_dry_run",
    allowedActionKinds: [],
    blockedActionKinds: [],
    warnings: [],
    blockers: [],
    correlationKey: "gate_key",
    ...overrides,
  };
}

function baseJob(overrides: Partial<RuntimeProviderJob> = {}): RuntimeProviderJob {
  return {
    id: "job_a",
    siteId: "site_1",
    siteVersionId: "version_1",
    providerId: "manual",
    environment: "sandbox",
    operationKind: "manual_instruction",
    status: "queued",
    intentPayload: { k: 1 },
    dryRunPayload: { k: 2 },
    correlationKey: "job_corr_a",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseInput(overrides: Partial<CreateRuntimeProviderOperationBundleInput> = {}): CreateRuntimeProviderOperationBundleInput {
  return {
    siteId: "site_1",
    siteVersionId: "version_1",
    providerId: "manual",
    environment: "sandbox",
    capability: "dns",
    operationKind: "manual_instruction",
    providerSelection: baseProviderSelection(),
    communicatorResult: baseCommunicatorResult(),
    executionIntent: baseExecutionIntent(),
    executionDryRun: baseExecutionDryRun(),
    executionGate: baseExecutionGate(),
    plannedJobs: [baseJob()],
    ...overrides,
  };
}

test("runtime provider operation bundle: manual bundle ready_for_manual", () => {
  const bundle = createRuntimeProviderOperationBundle(baseInput());

  assert.equal(bundle.bundleStatus, "ready_for_manual");
});

test("runtime provider operation bundle: mock bundle ready_for_mock", () => {
  const bundle = createRuntimeProviderOperationBundle(
    baseInput({
      providerId: "mock_provider",
      communicatorResult: baseCommunicatorResult({ providerId: "mock_provider", routeStatus: "resolved" }),
      executionIntent: baseExecutionIntent({ providerId: "mock_provider", executionMode: "provider_api_future" }),
      executionDryRun: baseExecutionDryRun({ providerId: "mock_provider", executionMode: "provider_api_future", dryRunStatus: "ready" }),
      executionGate: baseExecutionGate({ providerId: "mock_provider", requestedEnvironment: "sandbox", gateStatus: "open_for_sandbox_dry_run" }),
      plannedJobs: [baseJob({ providerId: "mock_provider", environment: "sandbox", operationKind: "upsert_dns_record" })],
    }),
  );

  assert.equal(bundle.bundleStatus, "ready_for_mock");
});

test("runtime provider operation bundle: unavailable communicator blocks", () => {
  const bundle = createRuntimeProviderOperationBundle(
    baseInput({
      communicatorResult: baseCommunicatorResult({
        routeStatus: "unavailable",
        blockers: ["provider_adapter_missing"],
      }),
    }),
  );

  assert.equal(bundle.bundleStatus, "blocked");
  assert.deepEqual(bundle.blockers, ["provider_adapter_missing"]);
});

test("runtime provider operation bundle: blocked gate blocks", () => {
  const bundle = createRuntimeProviderOperationBundle(
    baseInput({
      communicatorResult: baseCommunicatorResult({ routeStatus: "manual" }),
      executionGate: baseExecutionGate({ gateStatus: "blocked", blockers: ["sandbox_execution_gate_not_ready"] }),
    }),
  );

  assert.equal(bundle.bundleStatus, "blocked");
  assert.deepEqual(bundle.blockers, ["sandbox_execution_gate_not_ready"]);
});

test("runtime provider operation bundle: deterministic warning and blocker merge", () => {
  const bundle = createRuntimeProviderOperationBundle(
    baseInput({
      providerSelection: baseProviderSelection({ warnings: ["z_warn", "a_warn", "a_warn"], blockers: ["y_block"] }),
      communicatorResult: baseCommunicatorResult({ warnings: ["a_warn", "m_warn"], blockers: ["x_block"] }),
      executionIntent: baseExecutionIntent({ warnings: ["c_warn"], blockers: ["x_block", "b_block"] }),
      executionDryRun: baseExecutionDryRun({ warnings: ["b_warn"], blockers: ["z_block"] }),
      executionGate: baseExecutionGate({ warnings: ["a_warn"], blockers: ["a_block"] }),
    }),
  );

  assert.deepEqual(bundle.warnings, ["a_warn", "b_warn", "c_warn", "m_warn", "z_warn"]);
  assert.deepEqual(bundle.blockers, ["a_block", "b_block", "x_block", "y_block", "z_block"]);
});

test("runtime provider operation bundle: stable correlation key and deterministic job sorting", () => {
  const jobA = baseJob({ id: "job_b", correlationKey: "corr_b", operationKind: "verify_dns_record", status: "queued" });
  const jobB = baseJob({ id: "job_a", correlationKey: "corr_a", operationKind: "upsert_dns_record", status: "queued" });

  const left = createRuntimeProviderOperationBundle(baseInput({ plannedJobs: [jobA, jobB] }));
  const right = createRuntimeProviderOperationBundle(baseInput({ plannedJobs: [jobB, jobA] }));

  assert.equal(left.correlationKey, right.correlationKey);
  assert.deepEqual(
    left.plannedJobs.map((job) => job.id),
    right.plannedJobs.map((job) => job.id),
  );
});

test("runtime provider operation bundle: pure composition without DB or external execution", () => {
  const input = baseInput({
    plannedJobs: [baseJob({ id: "job_z" }), baseJob({ id: "job_a", correlationKey: "a" })],
  });

  const before = JSON.stringify(input);
  createRuntimeProviderOperationBundle(input);
  const after = JSON.stringify(input);

  assert.equal(after, before);
});
