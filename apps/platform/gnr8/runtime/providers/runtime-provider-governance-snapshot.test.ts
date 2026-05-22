import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderGovernanceSnapshot } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot";
import type { RuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import type { RuntimeProviderWorkerPickupEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

function buildEvidence(): RuntimeProviderWorkerPickupEvidence {
  return {
    handoffRef: "handoff_1",
    providerRef: "openprovider_sandbox",
    jobRefs: ["job_1"],
    approvalRef: "approval_1",
    approvalStatus: "approved",
    readinessStatus: "pickup_ready",
    executionBlocked: true,
    blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
    diagnostics: ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"],
    nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
    correlationKey: "pickup_corr_1",
  };
}

function buildReviewSummary(): RuntimeProviderOperatorReviewSummary {
  return {
    reviewSummaryStatus: "mixed_review_state",
    reviewCount: 2,
    latestReviewer: "reviewer_b",
    latestCreatedAt: "2026-05-22T00:00:01.000Z",
    latestReason: "needs changes",
    intentOnly: true,
    executionBlocked: true,
  };
}

test("governance snapshot: deterministic snapshot generation and diagnostics preserved", () => {
  const first = createRuntimeProviderGovernanceSnapshot({
    handoffId: "handoff_1",
    correlationKey: "handoff_corr_1",
    workerPickupEvidence: buildEvidence(),
    reviewSummary: buildReviewSummary(),
    diagnostics: ["OPERATOR_REVIEW_SUMMARY_MIXED_STATE", "OPERATOR_REVIEW_SUMMARY_CREATED"],
    createdAt: "2026-05-22T00:00:00.000Z",
  });
  const second = createRuntimeProviderGovernanceSnapshot({
    handoffId: "handoff_1",
    correlationKey: "handoff_corr_1",
    workerPickupEvidence: buildEvidence(),
    reviewSummary: buildReviewSummary(),
    diagnostics: ["OPERATOR_REVIEW_SUMMARY_CREATED", "OPERATOR_REVIEW_SUMMARY_MIXED_STATE"],
    createdAt: "2026-05-22T00:00:00.000Z",
  });

  assert.equal(first.snapshotId, second.snapshotId);
  assert.equal(first.correlationKey, second.correlationKey);
  assert.equal(first.executionBlocked, true);
  assert.equal(first.readinessStatus, "pickup_ready");
  assert.equal(first.reviewSummary.reviewSummaryStatus, "mixed_review_state");
  assert.equal(first.diagnostics.includes("GOVERNANCE_SNAPSHOT_CREATED"), true);
  assert.equal(first.diagnostics.includes("OPERATOR_REVIEW_SUMMARY_MIXED_STATE"), true);
});

test("governance snapshot: failed closed when required fields are missing", () => {
  const evidence = buildEvidence();
  evidence.correlationKey = "";
  const snapshot = createRuntimeProviderGovernanceSnapshot({
    handoffId: "",
    correlationKey: "",
    workerPickupEvidence: evidence,
    reviewSummary: buildReviewSummary(),
  });

  assert.equal(snapshot.executionBlocked, true);
  assert.equal(snapshot.readinessStatus, "failed_closed");
  assert.equal(snapshot.diagnostics.includes("GOVERNANCE_SNAPSHOT_FAILED_CLOSED"), true);
});
