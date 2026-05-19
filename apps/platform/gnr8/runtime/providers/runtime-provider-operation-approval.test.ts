import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";
import { createRuntimeProviderOperationApprovalRequirement } from "@/gnr8/runtime/providers/runtime-provider-operation-approval";

function baseBundle(overrides: Partial<RuntimeProviderOperationBundle> = {}): RuntimeProviderOperationBundle {
  return {
    siteId: "site_1",
    siteVersionId: "version_1",
    providerId: "manual",
    environment: "sandbox",
    capability: "dns",
    operationKind: "manual_instruction",
    providerSelection: {
      selectedProviderId: "manual",
      environment: "sandbox",
      selectionReason: "test",
      warnings: [],
      blockers: [],
      correlationKey: "selection",
    },
    communicatorResult: {
      providerId: "manual",
      environment: "sandbox",
      capability: "dns",
      operationKind: "manual_instruction",
      adapterAvailable: true,
      routeStatus: "manual",
      warnings: [],
      blockers: [],
      correlationKey: "comm",
    },
    executionIntent: {
      siteId: "site_1",
      providerId: "manual",
      executionMode: "manual",
      executableActions: [],
      blockedActions: [],
      manualActions: [],
      warnings: [],
      blockers: [],
      correlationKey: "intent",
    },
    executionDryRun: {
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
      correlationKey: "dry",
    },
    executionGate: {
      providerId: "manual",
      requestedEnvironment: "sandbox",
      gateStatus: "open_for_sandbox_dry_run",
      allowedActionKinds: [],
      blockedActionKinds: [],
      warnings: [],
      blockers: [],
      correlationKey: "gate",
    },
    plannedJobs: [
      {
        id: "job_1",
        siteId: "site_1",
        siteVersionId: "version_1",
        providerId: "manual",
        environment: "sandbox",
        operationKind: "manual_instruction",
        status: "queued",
        intentPayload: { x: 1 },
        correlationKey: "job_1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    bundleStatus: "ready_for_manual",
    warnings: [],
    blockers: [],
    correlationKey: "bundle_key",
    ...overrides,
  };
}

test("runtime provider approval: blocked bundle => blocked", () => {
  const bundle = baseBundle({ bundleStatus: "blocked" });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "blocked");
});

test("runtime provider approval: manual bundle requires manual_provider_action", () => {
  const bundle = baseBundle({ providerId: "manual" });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "required");
  assert.deepEqual(approval.requiredApprovals, ["manual_provider_action"]);
});

test("runtime provider approval: mock bundle requires sandbox_provider_action", () => {
  const bundle = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    communicatorResult: {
      ...baseBundle().communicatorResult,
      providerId: "mock_provider",
      routeStatus: "resolved",
    },
    executionIntent: {
      ...baseBundle().executionIntent,
      providerId: "mock_provider",
      executionMode: "provider_api_future",
    },
  });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "required");
  assert.deepEqual(approval.requiredApprovals, ["sandbox_provider_action"]);
});

test("runtime provider approval: purchase_domain requires domain_purchase", () => {
  const bundle = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    operationKind: "purchase_domain",
  });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "required");
  assert.equal(approval.requiredApprovals.includes("domain_purchase"), true);
});

test("runtime provider approval: activate_domain_binding requires domain_activation", () => {
  const bundle = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    operationKind: "activate_domain_binding",
  });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "required");
  assert.equal(approval.requiredApprovals.includes("domain_activation"), true);
});

test("runtime provider approval: delete_dns_record requires dns_delete", () => {
  const bundle = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    plannedJobs: [
      {
        ...baseBundle().plannedJobs[0],
        operationKind: "delete_dns_record" as never,
      },
    ],
  });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "required");
  assert.equal(approval.requiredApprovals.includes("dns_delete"), true);
});

test("runtime provider approval: live bundle blocked", () => {
  const bundle = baseBundle({
    environment: "live",
    bundleStatus: "ready_for_mock",
    providerId: "mock_provider",
  });
  const approval = createRuntimeProviderOperationApprovalRequirement(bundle);

  assert.equal(approval.approvalStatus, "blocked");
  assert.equal(approval.blockers.includes("live_environment_provider_execution_blocked"), true);
});

test("runtime provider approval: stable ordering and key", () => {
  const first = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    operationKind: "purchase_domain",
    plannedJobs: [
      {
        ...baseBundle().plannedJobs[0],
        id: "2",
        operationKind: "activate_domain_binding",
        correlationKey: "k2",
      },
      {
        ...baseBundle().plannedJobs[0],
        id: "1",
        operationKind: "purchase_domain",
        correlationKey: "k1",
      },
    ],
    warnings: ["z_warn", "a_warn", "a_warn"],
    blockers: ["b_block", "a_block", "a_block"],
  });

  const second = baseBundle({
    ...first,
    plannedJobs: [...first.plannedJobs].reverse(),
    warnings: [...first.warnings].reverse(),
    blockers: [...first.blockers].reverse(),
  });

  const left = createRuntimeProviderOperationApprovalRequirement(first);
  const right = createRuntimeProviderOperationApprovalRequirement(second);

  assert.deepEqual(left.requiredApprovals, ["domain_activation", "domain_purchase", "sandbox_provider_action"]);
  assert.deepEqual(left.warnings, ["a_warn", "z_warn"]);
  assert.deepEqual(left.blockers, ["a_block", "b_block"]);
  assert.equal(left.correlationKey, right.correlationKey);
});

test("runtime provider approval: no execution side effects", () => {
  const bundle = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    operationKind: "purchase_domain",
  });

  const before = JSON.stringify(bundle);
  createRuntimeProviderOperationApprovalRequirement(bundle);
  const after = JSON.stringify(bundle);

  assert.equal(after, before);
});
