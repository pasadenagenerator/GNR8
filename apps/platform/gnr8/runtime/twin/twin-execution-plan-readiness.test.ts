import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";
import {
  generateExecutionPlanReadinessRecords,
  hasExecutionPlanReadinessFallbackApplied,
  TWIN_EXECUTION_PLAN_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-plan-readiness";

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

test("twin execution plan readiness: deterministic generation", () => {
  const first = generateExecutionPlanReadinessRecords(executionPlanPreviews);
  const second = generateExecutionPlanReadinessRecords(executionPlanPreviews);

  assert.deepEqual(first, second);
});

test("twin execution plan readiness: readiness mapping is deterministic", () => {
  const records = generateExecutionPlanReadinessRecords(executionPlanPreviews);
  const byTitle = new Map(records.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "incomplete",
    readinessScore: 80,
    requirementsMet: [
      "execution_plan_present",
      "planning_artifacts_present",
      "conversion_plan_defined",
    ],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    executionPlanPresent: true,
    planningArtifactsPresent: true,
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_plan_readiness_preview_only",
    summary:
      "Execution plan readiness is incomplete because conversion baseline and design evidence are still missing.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 90,
    requirementsMet: [
      "execution_plan_present",
      "planning_artifacts_present",
      "content_plan_defined",
      "homepage_messaging_scope_defined",
    ],
    requirementsMissing: ["design_evidence"],
    executionPlanPresent: true,
    planningArtifactsPresent: true,
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_plan_readiness_preview_only",
    summary: "Execution plan readiness is nearly complete but still requires design evidence.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
    requirementsMet: [
      "execution_plan_present",
      "planning_artifacts_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    executionPlanPresent: true,
    planningArtifactsPresent: true,
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_plan_readiness_preview_only",
    summary: "Execution plan readiness is complete within current read-only governance boundaries.",
  });
});

test("twin execution plan readiness: fallback behavior is deterministic", () => {
  const records = generateExecutionPlanReadinessRecords(executionPlanPreviews);
  const fallbackRecord = records.find((entry) => entry.proposalTitle === "Unknown Proposal");

  assert.deepEqual(fallbackRecord, {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "not_ready",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: ["execution_plan_readiness_requirements_unknown"],
    executionPlanPresent: true,
    planningArtifactsPresent: false,
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_plan_readiness_preview_only",
    summary: "Execution plan readiness requirements could not be determined.",
  });
  assert.equal(hasExecutionPlanReadinessFallbackApplied(records), true);
});

test("twin execution plan readiness: governance flags are always false", () => {
  const records = generateExecutionPlanReadinessRecords(executionPlanPreviews);

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(records.every((entry) => entry.governanceState === "execution_plan_readiness_preview_only"), true);
});

test("twin execution plan readiness: diagnostics constants are stable", () => {
  assert.equal(TWIN_EXECUTION_PLAN_READINESS_DIAGNOSTICS.CREATED, "TWIN_EXECUTION_PLAN_READINESS_CREATED");
  assert.equal(
    TWIN_EXECUTION_PLAN_READINESS_DIAGNOSTICS.FALLBACK_APPLIED,
    "TWIN_EXECUTION_PLAN_READINESS_FALLBACK_APPLIED",
  );
});
