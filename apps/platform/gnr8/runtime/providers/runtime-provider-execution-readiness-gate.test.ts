import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderExecutionReadinessGate } from "@/gnr8/runtime/providers/runtime-provider-execution-readiness-gate";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import type { RuntimeProviderGovernanceAuthorizationSummary } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import type { RuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import type { RuntimeProviderWorkerPickupEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

function handoff(overrides: Partial<RuntimeProviderExecutionHandoffArtifactRecord> = {}): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "mock_provider",
    environment: "sandbox",
    capability: "domain_dns",
    operationKind: "upsert_dns_records",
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

function evidence(overrides: Partial<RuntimeProviderWorkerPickupEvidence> = {}): RuntimeProviderWorkerPickupEvidence {
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

function reviewSummary(status: RuntimeProviderOperatorReviewSummary["reviewSummaryStatus"]): RuntimeProviderOperatorReviewSummary {
  return {
    reviewSummaryStatus: status,
    reviewCount: 1,
    latestReviewer: "reviewer_1",
    latestCreatedAt: "2026-05-25T00:00:00.000Z",
    latestReason: "reason",
    intentOnly: true,
    executionBlocked: true,
  };
}

function authorizationSummary(
  status: RuntimeProviderGovernanceAuthorizationSummary["authorizationStatus"],
): RuntimeProviderGovernanceAuthorizationSummary {
  return {
    authorizationStatus: status,
    authorizationReason: "intent",
    intentOnly: true,
    executionBlocked: true,
    authorizationCount: 1,
    latestAuthorizationId: "auth_1",
    latestCreatedAt: "2026-05-25T00:00:00.000Z",
  };
}

test("execution readiness gate: blocked handoff -> blocked", () => {
  const gate = createRuntimeProviderExecutionReadinessGate({
    handoffArtifact: handoff({ handoffStatus: "blocked" }),
    workerPickupEvidence: evidence(),
    reviewSummary: reviewSummary("approved_for_future_execution"),
    authorizationSummary: authorizationSummary("authorized_for_future_execution"),
    decisionPackage: null,
    createdAt: "2026-05-25T00:00:00.000Z",
  });

  assert.equal(gate.gateStatus, "blocked");
  assert.equal(gate.blockingReasons.includes("handoff_status_blocked"), true);
});

test("execution readiness gate: missing jobs -> missing_requirements", () => {
  const gate = createRuntimeProviderExecutionReadinessGate({
    handoffArtifact: handoff({ plannedJobIds: [] }),
    workerPickupEvidence: evidence(),
    reviewSummary: reviewSummary("approved_for_future_execution"),
    authorizationSummary: authorizationSummary("authorized_for_future_execution"),
    decisionPackage: null,
  });

  assert.equal(gate.gateStatus, "missing_requirements");
  assert.equal(gate.blockingReasons.includes("no_planned_jobs"), true);
});

test("execution readiness gate: review/auth missing -> missing_requirements", () => {
  const gate = createRuntimeProviderExecutionReadinessGate({
    handoffArtifact: handoff(),
    workerPickupEvidence: evidence(),
    reviewSummary: reviewSummary("pending_review"),
    authorizationSummary: authorizationSummary("pending_authorization"),
    decisionPackage: null,
  });

  assert.equal(gate.gateStatus, "missing_requirements");
  assert.equal(gate.blockingReasons.includes("review_not_approved"), true);
  assert.equal(gate.blockingReasons.includes("authorization_not_authorized"), true);
});

test("execution readiness gate: review/auth approved + handoff ready -> theoretically_ready_but_disabled", () => {
  const gate = createRuntimeProviderExecutionReadinessGate({
    handoffArtifact: handoff(),
    workerPickupEvidence: evidence(),
    reviewSummary: reviewSummary("approved_for_future_execution"),
    authorizationSummary: authorizationSummary("authorized_for_future_execution"),
    decisionPackage: null,
  });

  assert.equal(gate.gateStatus, "theoretically_ready_but_disabled");
  assert.equal(gate.diagnostics.includes("EXECUTION_READINESS_GATE_THEORETICALLY_READY_DISABLED"), true);
});

test("execution readiness gate: executionAllowed always false", () => {
  const gate = createRuntimeProviderExecutionReadinessGate({
    handoffArtifact: handoff(),
    workerPickupEvidence: evidence(),
    reviewSummary: reviewSummary("approved_for_future_execution"),
    authorizationSummary: authorizationSummary("authorized_for_future_execution"),
    decisionPackage: null,
  });

  assert.equal(gate.executionAllowed, false);
  assert.equal(gate.executionBlocked, true);
  assert.equal(gate.blockingReasons.includes("global_execution_boundary_active"), true);
});
