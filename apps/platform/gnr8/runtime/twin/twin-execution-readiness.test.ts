import assert from "node:assert/strict";
import test from "node:test";

import type { TwinApprovalQueueItem } from "@/gnr8/runtime/twin/twin-approval-queue-preview";
import type { TwinExecutionArtifactPreview } from "@/gnr8/runtime/twin/twin-execution-artifact-preview";
import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";
import {
  generateTwinExecutionReadinessRecords,
  TWIN_EXECUTION_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-readiness";

function queueItem(proposalId: string, proposalTitle: string, optimizationScore: number): TwinApprovalQueueItem {
  return {
    queueId: `approval_queue_${proposalId}`,
    proposalId,
    proposalTitle,
    approvalState: "pending_review",
    queueRank: 1,
    queuePriority: "high",
    optimizationScore,
    governanceState: "approval_queue_preview_only",
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    summary: "Queued for future review.",
  };
}

function planPreview(proposalId: string, proposalTitle: string): TwinExecutionPlanPreview {
  return {
    planId: `execution_plan_preview_${proposalId}`,
    proposalId,
    proposalTitle,
    executionState: "preview_only",
    plannedActions: ["future_execution_plan_required"],
    executionBlocked: true,
    providerExecutionAllowed: false,
    publishingAllowed: false,
    mutationAllowed: false,
    governanceState: "preview_non_executable",
    summary: "Preview only.",
  };
}

function artifactPreview(proposalId: string, proposalTitle: string): TwinExecutionArtifactPreview {
  return {
    artifactId: `execution_artifact_preview_${proposalId}`,
    proposalTitle,
    artifactType: "future_execution_artifact",
    affectedAreas: ["unknown"],
    plannedOutputs: ["future_artifact_definition"],
    executionState: "preview_only",
    mutationBlocked: true,
    governanceState: "preview_non_executable",
    summary: `Preview only for ${proposalId}.`,
  };
}

const approvalQueueItems = [
  queueItem("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", 360),
  queueItem("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging", 340),
  queueItem("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode", 320),
  queueItem("proposal_candidate_unknown", "Unknown Proposal", 100),
];

const executionPlanPreviews = approvalQueueItems.map((entry) => planPreview(entry.proposalId, entry.proposalTitle));
const executionArtifactPreviews = approvalQueueItems.map((entry) => artifactPreview(entry.proposalId, entry.proposalTitle));

test("twin execution readiness: deterministic generation", () => {
  const first = generateTwinExecutionReadinessRecords({
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
  });
  const second = generateTwinExecutionReadinessRecords({
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
  });

  assert.deepEqual(first, second);
});

test("twin execution readiness: all title rules and fallback are deterministic", () => {
  const records = generateTwinExecutionReadinessRecords({
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
  });
  const byTitle = new Map(records.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    readinessId: "execution_readiness_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "partially_ready",
    readinessScore: 60,
    requirementsMet: ["homepage_detected", "approval_queue_ranked", "execution_plan_available"],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_readiness_preview_only",
    summary:
      "Execution planning evidence exists but additional conversion evidence is required before future execution readiness.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    readinessId: "execution_readiness_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "ready_for_future_planning",
    readinessScore: 80,
    requirementsMet: [
      "homepage_detected",
      "messaging_surface_identified",
      "execution_plan_available",
      "artifact_preview_available",
    ],
    requirementsMissing: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_readiness_preview_only",
    summary: "Proposal has sufficient planning evidence for future planning readiness but remains governance blocked.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    readinessId: "execution_readiness_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready_for_future_planning",
    readinessScore: 100,
    requirementsMet: [
      "governance_boundary_present",
      "validation_runtime_active",
      "execution_plan_available",
      "artifact_preview_available",
    ],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_readiness_preview_only",
    summary: "Validation governance proposal is fully prepared within current read-only boundaries.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    readinessId: "execution_readiness_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "not_ready",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: ["unknown_requirements"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_readiness_preview_only",
    summary: "Insufficient runtime evidence exists to determine future execution readiness.",
  });
});

test("twin execution readiness: score values and requirements mapping are stable", () => {
  const records = generateTwinExecutionReadinessRecords({
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
  });

  assert.deepEqual(
    records.map((entry) => [entry.proposalTitle, entry.readinessScore]),
    [
      ["Improve Homepage Conversion Flow", 60],
      ["Improve Homepage Quality and Messaging", 80],
      ["Maintain Read-Only Validation Mode", 100],
      ["Unknown Proposal", 0],
    ],
  );
  assert.equal(
    records.every((entry) => Array.isArray(entry.requirementsMet) && Array.isArray(entry.requirementsMissing)),
    true,
  );
});

test("twin execution readiness: governance flags are always false", () => {
  const records = generateTwinExecutionReadinessRecords({
    approvalQueueItems,
    executionPlanPreviews,
    executionArtifactPreviews,
  });

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(records.every((entry) => entry.governanceState === "execution_readiness_preview_only"), true);
});

test("twin execution readiness: diagnostics constants are stable", () => {
  assert.equal(TWIN_EXECUTION_READINESS_DIAGNOSTICS.STARTED, "TWIN_EXECUTION_READINESS_STARTED");
  assert.equal(TWIN_EXECUTION_READINESS_DIAGNOSTICS.COMPLETED, "TWIN_EXECUTION_READINESS_COMPLETED");
});
