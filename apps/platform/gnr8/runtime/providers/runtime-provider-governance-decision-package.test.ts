import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderGovernanceDecisionPackage } from "@/gnr8/runtime/providers/runtime-provider-governance-decision-package";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import type { RuntimeProviderGovernanceSnapshotRecord } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot-store";
import type { RuntimeProviderWorkerPickupEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

function baseHandoffArtifact(overrides: Partial<RuntimeProviderExecutionHandoffArtifactRecord> = {}): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "mock_provider",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "ready",
    plannedJobIds: ["job_1"],
    warnings: [],
    blockers: [],
    correlationKey: "corr_1",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

function baseEvidence(overrides: Partial<RuntimeProviderWorkerPickupEvidence> = {}): RuntimeProviderWorkerPickupEvidence {
  return {
    handoffRef: "handoff_1",
    providerRef: "mock_provider",
    jobRefs: ["job_1"],
    approvalRef: "artifact_1",
    approvalStatus: "approved",
    readinessStatus: "pickup_ready",
    executionBlocked: true,
    blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
    diagnostics: ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"],
    nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
    correlationKey: "corr_1",
    ...overrides,
  };
}

function baseSnapshots(): RuntimeProviderGovernanceSnapshotRecord[] {
  return [
    {
      snapshotId: "snapshot_1",
      handoffId: "handoff_1",
      correlationKey: "snap_corr_1",
      readinessStatus: "pickup_ready",
      executionBlocked: true,
      reviewSummary: {
        reviewSummaryStatus: "approved_for_future_execution",
        reviewCount: 1,
        latestReviewer: "reviewer",
        latestCreatedAt: "2026-05-25T00:00:00.000Z",
        latestReason: "ok",
        intentOnly: true,
        executionBlocked: true,
      },
      workerPickupEvidence: baseEvidence(),
      diagnostics: ["GOVERNANCE_SNAPSHOT_CREATED"],
      createdAt: "2026-05-25T00:00:00.000Z",
    },
  ];
}

test("governance decision package: deterministic generation and stable id", () => {
  const input = {
    handoffArtifact: baseHandoffArtifact({ plannedJobIds: ["job_2", "job_1"] }),
    workerPickupEvidence: baseEvidence({ jobRefs: ["job_1", "job_2"] }),
    reviewSummary: {
      reviewSummaryStatus: "pending_review",
      reviewCount: 1,
      latestReviewer: "reviewer_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "pending",
      intentOnly: true,
      executionBlocked: true,
    } as const,
    authorizationSummary: {
      authorizationStatus: "pending_authorization",
      authorizationReason: "waiting",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    } as const,
    governanceSnapshots: baseSnapshots(),
    createdAt: "2026-05-25T00:00:00.000Z",
  };
  const left = createRuntimeProviderGovernanceDecisionPackage(input);
  const right = createRuntimeProviderGovernanceDecisionPackage(input);
  assert.equal(left.packageId, right.packageId);
  assert.equal(left.executionBlocked, true);
});

test("governance decision package: missing evidence fails closed", () => {
  const result = createRuntimeProviderGovernanceDecisionPackage({
    handoffArtifact: null,
    workerPickupEvidence: null,
    createdAt: "2026-05-25T00:00:00.000Z",
  });
  assert.equal(result.readinessStatus, "failed_closed");
  assert.equal(result.decisionSignals.recommendedAction, "failed_closed");
  assert.equal(result.diagnostics.includes("GOVERNANCE_DECISION_PACKAGE_FAILED_CLOSED"), true);
});

test("governance decision package: authorization approved remains blocked", () => {
  const result = createRuntimeProviderGovernanceDecisionPackage({
    handoffArtifact: baseHandoffArtifact(),
    workerPickupEvidence: baseEvidence(),
    reviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 1,
      latestReviewer: "reviewer",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "ok",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "authorized_for_future_execution",
      authorizationReason: "intent",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    },
    createdAt: "2026-05-25T00:00:00.000Z",
  });
  assert.equal(result.executionBlocked, true);
  assert.equal(result.decisionSignals.recommendedAction, "governance_ready_execution_disabled");
});

test("governance decision package: review approved remains blocked", () => {
  const result = createRuntimeProviderGovernanceDecisionPackage({
    handoffArtifact: baseHandoffArtifact(),
    workerPickupEvidence: baseEvidence(),
    reviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 1,
      latestReviewer: "reviewer",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "ok",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "pending_authorization",
      authorizationReason: "waiting",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 1,
      latestAuthorizationId: "auth_1",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
    },
    createdAt: "2026-05-25T00:00:00.000Z",
  });
  assert.equal(result.executionBlocked, true);
  assert.equal(result.decisionSignals.recommendedAction, "await_authorization");
});

test("governance decision package: recommendedAction rules include remain_blocked and continue_review", () => {
  const blocked = createRuntimeProviderGovernanceDecisionPackage({
    handoffArtifact: baseHandoffArtifact({ handoffStatus: "blocked" }),
    workerPickupEvidence: baseEvidence({ readinessStatus: "pickup_not_ready" }),
    createdAt: "2026-05-25T00:00:00.000Z",
  });
  assert.equal(blocked.decisionSignals.recommendedAction, "remain_blocked");

  const continueReview = createRuntimeProviderGovernanceDecisionPackage({
    handoffArtifact: baseHandoffArtifact(),
    workerPickupEvidence: baseEvidence(),
    reviewSummary: {
      reviewSummaryStatus: "pending_review",
      reviewCount: 1,
      latestReviewer: "reviewer",
      latestCreatedAt: "2026-05-25T00:00:00.000Z",
      latestReason: "pending",
      intentOnly: true,
      executionBlocked: true,
    },
    authorizationSummary: {
      authorizationStatus: "not_requested",
      authorizationReason: "",
      intentOnly: true,
      executionBlocked: true,
      authorizationCount: 0,
      latestAuthorizationId: "",
      latestCreatedAt: "",
    },
    createdAt: "2026-05-25T00:00:00.000Z",
  });
  assert.equal(continueReview.decisionSignals.recommendedAction, "continue_review");
  assert.equal(continueReview.executionBlocked, true);
});
