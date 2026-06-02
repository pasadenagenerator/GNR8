import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionArtifactPreview } from "@/gnr8/runtime/twin/twin-execution-artifact-preview";
import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";
import type { TwinExecutionReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-readiness";
import {
  generateTwinExecutionPackagePreviews,
  TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-package-preview";

function readinessRecord(
  proposalId: string,
  proposalTitle: string,
  readinessState: TwinExecutionReadinessRecord["readinessState"],
  readinessScore: number,
): TwinExecutionReadinessRecord {
  return {
    readinessId: `execution_readiness_${proposalId}`,
    proposalId,
    proposalTitle,
    readinessState,
    readinessScore,
    requirementsMet: [],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_readiness_preview_only",
    summary: "Preview only.",
  };
}

function planPreview(proposalId: string, proposalTitle: string, plannedActions: string[]): TwinExecutionPlanPreview {
  return {
    planId: `execution_plan_preview_${proposalId}`,
    proposalId,
    proposalTitle,
    executionState: "preview_only",
    plannedActions,
    executionBlocked: true,
    providerExecutionAllowed: false,
    publishingAllowed: false,
    mutationAllowed: false,
    governanceState: "preview_non_executable",
    summary: "Preview only.",
  };
}

function artifactPreview(proposalId: string, proposalTitle: string, plannedOutputs: string[]): TwinExecutionArtifactPreview {
  return {
    artifactId: `execution_artifact_preview_${proposalId}`,
    proposalTitle,
    artifactType: "future_execution_artifact",
    affectedAreas: ["unknown"],
    plannedOutputs,
    executionState: "preview_only",
    mutationBlocked: true,
    governanceState: "preview_non_executable",
    summary: "Preview only.",
  };
}

const readinessRecords = [
  readinessRecord("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", "partially_ready", 60),
  readinessRecord("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging", "ready_for_future_planning", 80),
  readinessRecord("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode", "ready_for_future_planning", 100),
  readinessRecord("proposal_candidate_unknown", "Unknown Proposal", "ready_for_future_planning", 90),
];

const executionPlanPreviews = [
  planPreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", [
    "analyze_homepage_conversion_flow",
    "identify_primary_conversion_path",
    "prepare_conversion_improvement_plan",
  ]),
  planPreview("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging", [
    "analyze_homepage_content",
    "identify_messaging_improvements",
    "prepare_content_improvement_plan",
  ]),
  planPreview("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode", [
    "maintain_read_only_runtime",
    "continue_validation_observation",
  ]),
  planPreview("proposal_candidate_unknown", "Unknown Proposal", ["future_execution_plan_required"]),
];

const executionArtifactPreviews = [
  artifactPreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", [
    "conversion_review_document",
    "conversion_improvement_plan",
  ]),
  artifactPreview("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging", [
    "messaging_review_document",
    "content_improvement_plan",
  ]),
  artifactPreview("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode", ["validation_status_report"]),
  artifactPreview("proposal_candidate_unknown", "Unknown Proposal", ["future_artifact_definition"]),
];

test("twin execution package preview: deterministic generation", () => {
  const first = generateTwinExecutionPackagePreviews({
    readinessRecords,
    executionPlanPreviews,
    executionArtifactPreviews,
  });
  const second = generateTwinExecutionPackagePreviews({
    readinessRecords,
    executionPlanPreviews,
    executionArtifactPreviews,
  });

  assert.deepEqual(first, second);
});

test("twin execution package preview: all title rules and fallback are deterministic", () => {
  const previews = generateTwinExecutionPackagePreviews({
    readinessRecords,
    executionPlanPreviews,
    executionArtifactPreviews,
  });
  const byTitle = new Map(previews.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    packageId: "execution_package_preview_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    packageState: "preview_ready",
    readinessState: "partially_ready",
    readinessScore: 60,
    includedArtifacts: ["conversion_review_document", "conversion_improvement_plan"],
    includedPlans: [
      "analyze_homepage_conversion_flow",
      "identify_primary_conversion_path",
      "prepare_conversion_improvement_plan",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_preview_only",
    summary: "Execution package preview contains conversion planning evidence and supporting planning artifacts.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    packageId: "execution_package_preview_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    packageState: "preview_ready",
    readinessState: "ready_for_future_planning",
    readinessScore: 80,
    includedArtifacts: ["messaging_review_document", "content_improvement_plan"],
    includedPlans: [
      "analyze_homepage_content",
      "identify_messaging_improvements",
      "prepare_content_improvement_plan",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_preview_only",
    summary: "Execution package preview contains content planning evidence and supporting planning artifacts.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    packageId: "execution_package_preview_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    packageState: "preview_ready",
    readinessState: "ready_for_future_planning",
    readinessScore: 100,
    includedArtifacts: ["validation_status_report"],
    includedPlans: ["maintain_read_only_runtime", "continue_validation_observation"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_preview_only",
    summary: "Execution package preview contains governance validation planning evidence and reporting artifacts.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    packageId: "execution_package_preview_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    packageState: "preview_incomplete",
    readinessState: "not_ready",
    readinessScore: 0,
    includedArtifacts: [],
    includedPlans: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_preview_only",
    summary: "Insufficient planning evidence exists to assemble an execution package preview.",
  });
});

test("twin execution package preview: readiness plans and artifacts propagate from runtime layers", () => {
  const previews = generateTwinExecutionPackagePreviews({
    readinessRecords: [
      readinessRecord("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", "partially_ready", 61),
    ],
    executionPlanPreviews: [
      planPreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", ["custom_planning_step"]),
    ],
    executionArtifactPreviews: [
      artifactPreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", ["custom_planning_artifact"]),
    ],
  });

  assert.equal(previews[0]?.readinessState, "partially_ready");
  assert.equal(previews[0]?.readinessScore, 61);
  assert.deepEqual(previews[0]?.includedPlans, ["custom_planning_step"]);
  assert.deepEqual(previews[0]?.includedArtifacts, ["custom_planning_artifact"]);
});

test("twin execution package preview: missing planning evidence remains incomplete", () => {
  const previews = generateTwinExecutionPackagePreviews({
    readinessRecords: [
      readinessRecord("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", "partially_ready", 60),
    ],
    executionPlanPreviews: [],
    executionArtifactPreviews: [],
  });

  assert.equal(previews[0]?.packageState, "preview_incomplete");
  assert.equal(previews[0]?.readinessState, "not_ready");
  assert.equal(previews[0]?.readinessScore, 0);
  assert.deepEqual(previews[0]?.includedPlans, []);
  assert.deepEqual(previews[0]?.includedArtifacts, []);
});

test("twin execution package preview: governance flags are always false", () => {
  const previews = generateTwinExecutionPackagePreviews({
    readinessRecords,
    executionPlanPreviews,
    executionArtifactPreviews,
  });

  assert.equal(previews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(previews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(previews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(previews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(previews.every((entry) => entry.governanceState === "execution_package_preview_only"), true);
});

test("twin execution package preview: diagnostics constants are stable", () => {
  assert.equal(TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.STARTED, "TWIN_EXECUTION_PACKAGE_PREVIEW_STARTED");
  assert.equal(TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS.COMPLETED, "TWIN_EXECUTION_PACKAGE_PREVIEW_COMPLETED");
});
