import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutionCandidateRecords,
  hasExecutionCandidateFallbackApplied,
  TWIN_EXECUTION_CANDIDATE_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionPlanReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-plan-readiness";

function readinessRecord(input: {
  proposalId: string;
  proposalTitle: string;
  readinessState: ExecutionPlanReadinessRecord["readinessState"];
  readinessScore: number;
  requirementsMet?: string[];
  requirementsMissing?: string[];
}): ExecutionPlanReadinessRecord {
  return {
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    requirementsMet: input.requirementsMet ?? ["execution_plan_present"],
    requirementsMissing: input.requirementsMissing ?? [],
    executionPlanPresent: true,
    planningArtifactsPresent: true,
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_plan_readiness_preview_only",
    summary: "Plan readiness preview.",
  };
}

const readinessRecords = [
  readinessRecord({
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "incomplete",
    readinessScore: 80,
    requirementsMissing: ["conversion_baseline", "design_evidence"],
  }),
  readinessRecord({
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 90,
    requirementsMissing: ["design_evidence"],
  }),
  readinessRecord({
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
  }),
  readinessRecord({
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "not_ready",
    readinessScore: 0,
    requirementsMissing: ["execution_plan_readiness_requirements_unknown"],
  }),
];

test("twin execution candidate: deterministic generation", () => {
  const first = buildExecutionCandidateRecords(readinessRecords);
  const second = buildExecutionCandidateRecords(readinessRecords);

  assert.deepEqual(first, second);
});

test("twin execution candidate: known readiness mappings are deterministic", () => {
  const records = buildExecutionCandidateRecords(readinessRecords);
  const byTitle = new Map(records.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    candidateId: "execution_candidate_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    candidateState: "blocked_candidate",
    readinessState: "incomplete",
    readinessScore: 80,
    candidateType: "conversion_flow_execution_candidate",
    candidateScope: ["homepage", "primary_conversion_path"],
    candidateArtifacts: ["conversion_review_document", "conversion_improvement_plan"],
    candidateRequirements: [
      "execution_plan_present",
      "planning_artifacts_present",
      "conversion_plan_defined",
      "conversion_baseline",
      "design_evidence",
    ],
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_preview_only",
    summary:
      "Execution candidate is blocked because conversion baseline and design evidence remain missing; governance remains preview-only.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    candidateId: "execution_candidate_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    candidateState: "candidate_ready_preview",
    readinessState: "nearly_ready",
    readinessScore: 90,
    candidateType: "homepage_messaging_execution_candidate",
    candidateScope: ["homepage_hero", "homepage_messaging"],
    candidateArtifacts: ["messaging_review_document", "content_improvement_plan"],
    candidateRequirements: [
      "execution_plan_present",
      "planning_artifacts_present",
      "content_plan_defined",
      "homepage_messaging_scope_defined",
      "design_evidence",
    ],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_preview_only",
    summary:
      "Execution candidate is ready for preview planning, while design evidence and governance still block execution.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    candidateId: "execution_candidate_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    candidateState: "candidate_ready_preview",
    readinessState: "ready",
    readinessScore: 100,
    candidateType: "validation_runtime_execution_candidate",
    candidateScope: ["runtime_governance"],
    candidateArtifacts: ["validation_status_report"],
    candidateRequirements: [
      "execution_plan_present",
      "planning_artifacts_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_preview_only",
    summary:
      "Execution candidate is ready for preview planning inside read-only validation governance.",
  });
});

test("twin execution candidate: fallback behavior is deterministic", () => {
  const records = buildExecutionCandidateRecords(readinessRecords);
  const fallbackRecord = records.find((entry) => entry.proposalTitle === "Unknown Proposal");

  assert.deepEqual(fallbackRecord, {
    candidateId: "execution_candidate_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    candidateState: "candidate_unknown",
    readinessState: "not_ready",
    readinessScore: 0,
    candidateType: "unknown_execution_candidate",
    candidateScope: ["unknown"],
    candidateArtifacts: ["future_execution_candidate_definition"],
    candidateRequirements: ["execution_candidate_requirements_unknown"],
    blockedReasons: ["execution_candidate_requirements_unknown", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_preview_only",
    summary: "Execution candidate cannot be evaluated because plan readiness requirements are unknown.",
  });
  assert.equal(hasExecutionCandidateFallbackApplied(records), true);
});

test("twin execution candidate: governance lock is always enforced", () => {
  const records = buildExecutionCandidateRecords(readinessRecords);

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(records.every((entry) => entry.governanceState === "execution_candidate_preview_only"), true);
  assert.equal(records.every((entry) => entry.blockedReasons.includes("governance_execution_blocked")), true);
});

test("twin execution candidate: diagnostics constants are stable", () => {
  assert.equal(TWIN_EXECUTION_CANDIDATE_DIAGNOSTICS.STARTED, "TWIN_EXECUTION_CANDIDATE_STARTED");
  assert.equal(TWIN_EXECUTION_CANDIDATE_DIAGNOSTICS.COMPLETED, "TWIN_EXECUTION_CANDIDATE_COMPLETED");
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_DIAGNOSTICS.FALLBACK_APPLIED,
    "TWIN_EXECUTION_CANDIDATE_FALLBACK_APPLIED",
  );
});
