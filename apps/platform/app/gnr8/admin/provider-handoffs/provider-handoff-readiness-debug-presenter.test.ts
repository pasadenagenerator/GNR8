import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProviderHandoffReadinessDebugDisplay,
  redactSecretLikeText,
} from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-presenter";
import type { ProviderHandoffReadinessDebugModel } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-view";

function buildModel(): ProviderHandoffReadinessDebugModel {
  return {
    handoffId: "handoff_123",
    readinessStatus: "pickup_ready",
    executionBlocked: true,
    blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
    nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
    correlationKey: "corr_123",
    diagnostics: ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED", "apiToken=secret_api_token"],
    handoffArtifact: {
      providerId: "openprovider_sandbox",
      environment: "sandbox",
      capability: "domain_dns",
      operationKind: "upsert_dns_records",
      approvalStatus: "approved",
      riskLevel: "low",
      handoffStatus: "ready",
      plannedJobIds: ["job_2", "job_1"],
      warnings: ["warn_1", "providerPayloadCredentials=secret_token_value"],
      blockers: [],
    },
    workerPickupEvidence: {
      providerRef: "openprovider_sandbox",
      approvalStatus: "approved",
      readinessStatus: "pickup_ready",
      executionBlocked: true,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      jobRefs: ["job_2", "job_1"],
      blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
      diagnostics: ["WORKER_PICKUP_EVIDENCE_AVAILABLE", "token=secret_token_value"],
    },
    governanceSnapshot: {
      snapshotId: "snapshot_1",
      handoffId: "handoff_123",
      correlationKey: "snapshot_corr_1",
      readinessStatus: "pickup_ready",
      executionBlocked: true,
      diagnostics: ["GOVERNANCE_SNAPSHOT_CREATED"],
      createdAt: "2026-05-22T00:00:00.000Z",
      reviewSummary: {
        reviewSummaryStatus: "approved_for_future_execution",
        reviewCount: 2,
        latestReviewer: "reviewer_b",
        latestCreatedAt: "2026-05-22T00:00:01.000Z",
        latestReason: "checked dry run",
        intentOnly: true,
        executionBlocked: true,
      },
    },
    operatorReviews: [
      {
        reviewId: "review_2",
        reviewerRef: "reviewer_b",
        reviewStatus: "approved_for_future_execution",
        reviewReason: "checked dry run",
        createdAt: "2026-05-22T00:00:01.000Z",
      },
      {
        reviewId: "review_1",
        reviewerRef: "reviewer_a",
        reviewStatus: "pending_review",
        reviewReason: "initial review",
        createdAt: "2026-05-22T00:00:00.000Z",
      },
    ],
    operatorReviewSummary: {
      reviewSummaryStatus: "approved_for_future_execution",
      reviewCount: 2,
      latestReviewer: "reviewer_b",
      latestCreatedAt: "2026-05-22T00:00:01.000Z",
      latestReason: "checked dry run",
      intentOnly: true,
      executionBlocked: true,
    },
    operatorReviewIntentOnly: true,
  };
}

test("provider handoff readiness presenter: renders mocked readiness evidence", () => {
  const display = buildProviderHandoffReadinessDebugDisplay(buildModel());

  assert.equal(display.handoffId, "handoff_123");
  assert.equal(display.executionBlockedLabel, "Execution blocked");
  assert.equal(display.reviewOnlyLabel, "Control-plane review / dry-run artifact inspection only");
  assert.equal(display.executionBlocked, "true");
  assert.equal(display.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
  assert.equal(display.diagnostics.includes("PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"), true);
  assert.equal(display.operatorReviewIntentOnly, true);
  assert.deepEqual(
    display.operatorReviews.map((review) => review.reviewId),
    ["review_1", "review_2"],
  );
  assert.equal(display.operatorReviewSummary.reviewSummaryStatus, "approved_for_future_execution");
  assert.equal(display.operatorReviewSummary.reviewCount, 2);
  assert.equal(display.operatorReviewSummary.intentOnly, true);
  assert.equal(display.operatorReviewSummary.executionBlocked, true);
  assert.equal(display.governanceSnapshot.snapshotId, "snapshot_1");
  assert.equal(display.governanceSnapshot.reviewSummaryStatus, "approved_for_future_execution");
  assert.equal(display.governanceSnapshot.executionBlocked, true);
  assert.equal(display.hasMutationControls, false);
});

test("provider handoff readiness presenter: secret-like values are redacted", () => {
  const display = buildProviderHandoffReadinessDebugDisplay(buildModel());
  const flat = JSON.stringify(display);

  assert.equal(redactSecretLikeText("apiToken=secret_123"), "[redacted]");
  assert.equal(flat.includes("secret_api_token"), false);
  assert.equal(flat.includes("secret_token_value"), false);
  assert.equal(flat.includes("providerPayloadCredentials"), false);
  assert.equal(flat.includes("apiToken"), false);
  assert.equal(flat.includes("[redacted]"), true);
});
