import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeProviderOperationApprovalRequirement } from "@/gnr8/runtime/providers/runtime-provider-operation-approval";
import type { RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";
import {
  createRuntimeProviderExecutionHandoffArtifact,
  type RuntimeProviderExecutionHandoffArtifact,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";

type ApprovalArtifactLike = Pick<
  RuntimeProviderExecutionHandoffArtifact,
  | "artifactId"
  | "siteId"
  | "siteVersionId"
  | "providerId"
  | "environment"
  | "capability"
  | "operationKind"
  | "approvalStatus"
  | "riskLevel"
  | "warnings"
  | "blockers"
  | "correlationKey"
>;

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
        id: "job_2",
        siteId: "site_1",
        siteVersionId: "version_1",
        providerId: "manual",
        environment: "sandbox",
        operationKind: "manual_instruction",
        status: "queued",
        intentPayload: { x: 1 },
        correlationKey: "job_2",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "job_1",
        siteId: "site_1",
        siteVersionId: "version_1",
        providerId: "manual",
        environment: "sandbox",
        operationKind: "manual_instruction",
        status: "queued",
        intentPayload: { x: 2 },
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

function baseApprovalRequirement(
  overrides: Partial<RuntimeProviderOperationApprovalRequirement> = {},
): RuntimeProviderOperationApprovalRequirement {
  return {
    approvalStatus: "required",
    requiredApprovals: ["manual_provider_action"],
    warnings: [],
    blockers: [],
    correlationKey: "approval_requirement_key",
    ...overrides,
  };
}

function baseApprovalArtifact(overrides: Partial<ApprovalArtifactLike> = {}): ApprovalArtifactLike {
  return {
    artifactId: "approval_artifact_1",
    siteId: "site_1",
    siteVersionId: "version_1",
    providerId: "manual",
    environment: "sandbox",
    capability: "dns",
    operationKind: "manual_instruction",
    approvalStatus: "approved",
    riskLevel: "low",
    warnings: [],
    blockers: [],
    correlationKey: "approval_artifact_key",
    ...overrides,
  };
}

test("runtime provider execution handoff: approved manual path -> ready", () => {
  const artifact = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ providerId: "manual", approvalStatus: "approved" }),
    baseApprovalRequirement({ approvalStatus: "required" }),
    baseBundle({ providerId: "manual", bundleStatus: "ready_for_manual" }),
  );

  assert.equal(artifact.handoffStatus, "ready");
});

test("runtime provider execution handoff: approved mock path -> ready", () => {
  const artifact = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ providerId: "mock_provider", approvalStatus: "approved" }),
    baseApprovalRequirement({ approvalStatus: "required" }),
    baseBundle({ providerId: "mock_provider", bundleStatus: "ready_for_mock" }),
  );

  assert.equal(artifact.handoffStatus, "ready");
});

test("runtime provider execution handoff: blocked approval -> blocked", () => {
  const artifact = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ approvalStatus: "pending" }),
    baseApprovalRequirement(),
    baseBundle(),
  );

  assert.equal(artifact.handoffStatus, "blocked");
});

test("runtime provider execution handoff: blocked bundle -> blocked", () => {
  const artifact = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ approvalStatus: "approved" }),
    baseApprovalRequirement(),
    baseBundle({ bundleStatus: "blocked" }),
  );

  assert.equal(artifact.handoffStatus, "blocked");
});

test("runtime provider execution handoff: live env -> blocked", () => {
  const artifact = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ approvalStatus: "approved", environment: "live" }),
    baseApprovalRequirement(),
    baseBundle({ environment: "live" }),
  );

  assert.equal(artifact.handoffStatus, "blocked");
});

test("runtime provider execution handoff: deterministic ordering", () => {
  const first = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ warnings: ["z_warn", "a_warn", "a_warn"], blockers: ["z_block", "a_block", "a_block"] }),
    baseApprovalRequirement({ warnings: ["y_warn", "b_warn", "b_warn"], blockers: ["y_block", "b_block", "b_block"] }),
    baseBundle({ warnings: ["m_warn", "a_warn"], blockers: ["m_block", "a_block"] }),
  );

  const second = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ warnings: ["a_warn", "z_warn", "a_warn"], blockers: ["a_block", "z_block", "a_block"] }),
    baseApprovalRequirement({ warnings: ["b_warn", "y_warn", "b_warn"], blockers: ["b_block", "y_block", "b_block"] }),
    baseBundle({ warnings: ["a_warn", "m_warn"], blockers: ["a_block", "m_block"] }),
  );

  assert.deepEqual(first.plannedJobIds, ["job_1", "job_2"]);
  assert.deepEqual(first.warnings, ["a_warn", "b_warn", "m_warn", "y_warn", "z_warn"]);
  assert.deepEqual(first.blockers, ["a_block", "b_block", "m_block", "y_block", "z_block"]);
  assert.deepEqual(first.plannedJobIds, second.plannedJobIds);
  assert.deepEqual(first.warnings, second.warnings);
  assert.deepEqual(first.blockers, second.blockers);
});

test("runtime provider execution handoff: stable key", () => {
  const left = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ warnings: ["z", "a"], blockers: ["z", "a"] }),
    baseApprovalRequirement({ warnings: ["b", "y"], blockers: ["b", "y"] }),
    baseBundle({ warnings: ["m", "a"], blockers: ["m", "a"] }),
  );

  const right = createRuntimeProviderExecutionHandoffArtifact(
    baseApprovalArtifact({ warnings: ["a", "z"], blockers: ["a", "z"] }),
    baseApprovalRequirement({ warnings: ["y", "b"], blockers: ["y", "b"] }),
    baseBundle({ warnings: ["a", "m"], blockers: ["a", "m"] }),
  );

  assert.equal(left.correlationKey, right.correlationKey);
  assert.equal(left.handoffId, right.handoffId);
});

test("runtime provider execution handoff: no side effects", () => {
  const approvalArtifact = baseApprovalArtifact({ warnings: ["approval_warn"], blockers: ["approval_block"] });
  const approvalRequirement = baseApprovalRequirement({ warnings: ["requirement_warn"], blockers: ["requirement_block"] });
  const bundle = baseBundle({ warnings: ["bundle_warn"], blockers: ["bundle_block"] });

  const beforeApprovalArtifact = JSON.stringify(approvalArtifact);
  const beforeApprovalRequirement = JSON.stringify(approvalRequirement);
  const beforeBundle = JSON.stringify(bundle);

  createRuntimeProviderExecutionHandoffArtifact(approvalArtifact, approvalRequirement, bundle);

  assert.equal(JSON.stringify(approvalArtifact), beforeApprovalArtifact);
  assert.equal(JSON.stringify(approvalRequirement), beforeApprovalRequirement);
  assert.equal(JSON.stringify(bundle), beforeBundle);
});
