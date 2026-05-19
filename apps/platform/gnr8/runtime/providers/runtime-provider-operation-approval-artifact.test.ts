import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeProviderOperationApprovalRequirement } from "@/gnr8/runtime/providers/runtime-provider-operation-approval";
import { createRuntimeProviderOperationApprovalArtifact } from "@/gnr8/runtime/providers/runtime-provider-operation-approval-artifact";
import type { RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";

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

function baseApproval(
  overrides: Partial<RuntimeProviderOperationApprovalRequirement> = {},
): RuntimeProviderOperationApprovalRequirement {
  return {
    approvalStatus: "required",
    requiredApprovals: ["manual_provider_action"],
    warnings: [],
    blockers: [],
    correlationKey: "approval_key",
    ...overrides,
  };
}

test("runtime provider approval artifact: manual low risk", () => {
  const artifact = createRuntimeProviderOperationApprovalArtifact(baseBundle(), baseApproval());

  assert.equal(artifact.riskLevel, "low");
  assert.equal(artifact.approvalStatus, "required");
});

test("runtime provider approval artifact: mock sandbox low risk", () => {
  const artifact = createRuntimeProviderOperationApprovalArtifact(
    baseBundle({
      providerId: "mock_provider",
      bundleStatus: "ready_for_mock",
      communicatorResult: {
        ...baseBundle().communicatorResult,
        providerId: "mock_provider",
        routeStatus: "resolved",
      },
    }),
    baseApproval({ requiredApprovals: ["sandbox_provider_action"] }),
  );

  assert.equal(artifact.riskLevel, "low");
});

test("runtime provider approval artifact: purchase high risk", () => {
  const artifact = createRuntimeProviderOperationApprovalArtifact(
    baseBundle({
      providerId: "mock_provider",
      bundleStatus: "ready_for_mock",
      operationKind: "purchase_domain",
    }),
    baseApproval({ requiredApprovals: ["domain_purchase", "sandbox_provider_action"] }),
  );

  assert.equal(artifact.riskLevel, "high");
});

test("runtime provider approval artifact: activation medium risk", () => {
  const artifact = createRuntimeProviderOperationApprovalArtifact(
    baseBundle({
      providerId: "mock_provider",
      bundleStatus: "ready_for_mock",
      operationKind: "activate_domain_binding",
    }),
    baseApproval({ requiredApprovals: ["domain_activation", "sandbox_provider_action"] }),
  );

  assert.equal(artifact.riskLevel, "medium");
});

test("runtime provider approval artifact: live blocked", () => {
  const artifact = createRuntimeProviderOperationApprovalArtifact(
    baseBundle({
      providerId: "mock_provider",
      environment: "live",
      bundleStatus: "ready_for_mock",
    }),
    baseApproval(),
  );

  assert.equal(artifact.riskLevel, "blocked");
});

test("runtime provider approval artifact: blocked approval blocked", () => {
  const artifact = createRuntimeProviderOperationApprovalArtifact(
    baseBundle({
      providerId: "mock_provider",
      bundleStatus: "ready_for_mock",
    }),
    baseApproval({ approvalStatus: "blocked", blockers: ["approval_blocked"] }),
  );

  assert.equal(artifact.riskLevel, "blocked");
});

test("runtime provider approval artifact: deterministic checklist order key", () => {
  const firstBundle = baseBundle({
    warnings: ["z_warn", "a_warn", "a_warn"],
    blockers: ["z_block", "a_block", "a_block"],
  });
  const secondBundle = baseBundle({
    ...firstBundle,
    warnings: [...firstBundle.warnings].reverse(),
    blockers: [...firstBundle.blockers].reverse(),
  });

  const firstApproval = baseApproval({
    requiredApprovals: ["z_approval", "a_approval", "a_approval"],
    warnings: ["y_warn", "b_warn", "b_warn"],
    blockers: ["y_block", "b_block", "b_block"],
  });

  const secondApproval = baseApproval({
    ...firstApproval,
    requiredApprovals: [...firstApproval.requiredApprovals].reverse(),
    warnings: [...firstApproval.warnings].reverse(),
    blockers: [...firstApproval.blockers].reverse(),
  });

  const left = createRuntimeProviderOperationApprovalArtifact(firstBundle, firstApproval);
  const right = createRuntimeProviderOperationApprovalArtifact(secondBundle, secondApproval);

  assert.deepEqual(left.reviewerChecklist, [
    "verify_provider",
    "verify_environment",
    "verify_operation_kind",
    "verify_required_approvals",
    "verify_no_live_execution",
  ]);
  assert.deepEqual(left.requiredApprovals, ["a_approval", "z_approval"]);
  assert.deepEqual(left.warnings, ["a_warn", "b_warn", "y_warn", "z_warn"]);
  assert.deepEqual(left.blockers, ["a_block", "b_block", "y_block", "z_block"]);
  assert.equal(left.correlationKey, right.correlationKey);
  assert.equal(left.artifactId, right.artifactId);
});

test("runtime provider approval artifact: no execution side effects", () => {
  const bundle = baseBundle({
    providerId: "mock_provider",
    bundleStatus: "ready_for_mock",
    operationKind: "purchase_domain",
    warnings: ["bundle_warn"],
    blockers: ["bundle_block"],
  });

  const approval = baseApproval({
    requiredApprovals: ["domain_purchase", "sandbox_provider_action"],
    warnings: ["approval_warn"],
    blockers: ["approval_block"],
  });

  const beforeBundle = JSON.stringify(bundle);
  const beforeApproval = JSON.stringify(approval);
  createRuntimeProviderOperationApprovalArtifact(bundle, approval);
  const afterBundle = JSON.stringify(bundle);
  const afterApproval = JSON.stringify(approval);

  assert.equal(afterBundle, beforeBundle);
  assert.equal(afterApproval, beforeApproval);
});
