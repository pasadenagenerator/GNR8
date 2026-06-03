import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import {
  buildExecutionCandidateReadinessRecords,
  hasExecutionCandidateReadinessFallbackApplied,
  TWIN_EXECUTION_CANDIDATE_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";

function candidateRecord(input: {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  candidateState: ExecutionCandidateRecord["candidateState"];
  readinessState: ExecutionCandidateRecord["readinessState"];
  readinessScore: number;
  candidateType?: string;
  candidateScope?: string[];
  candidateArtifacts?: string[];
  candidateRequirements?: string[];
  blockedReasons?: string[];
}): ExecutionCandidateRecord {
  return {
    candidateId: input.candidateId,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    candidateState: input.candidateState,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    candidateType: input.candidateType ?? "test_execution_candidate",
    candidateScope: input.candidateScope ?? ["homepage"],
    candidateArtifacts: input.candidateArtifacts ?? ["candidate_artifact"],
    candidateRequirements: input.candidateRequirements ?? ["execution_plan_present"],
    blockedReasons: input.blockedReasons ?? ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_preview_only",
    summary: "Execution candidate preview.",
  };
}

const candidateRecords = [
  candidateRecord({
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
  }),
  candidateRecord({
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
  }),
  candidateRecord({
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
  }),
  candidateRecord({
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
  }),
];

test("twin execution candidate readiness: deterministic generation", () => {
  const first = buildExecutionCandidateReadinessRecords(candidateRecords);
  const second = buildExecutionCandidateReadinessRecords(candidateRecords);

  assert.deepEqual(first, second);
});

test("twin execution candidate readiness: known mappings are deterministic", () => {
  const records = buildExecutionCandidateReadinessRecords(candidateRecords);
  const byTitle = new Map(records.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    candidateId: "execution_candidate_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "incomplete",
    readinessScore: 85,
    requirementsMet: [
      "execution_plan_present",
      "planning_artifacts_present",
      "conversion_plan_defined",
    ],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    candidatePresent: true,
    candidateArtifactsPresent: true,
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_readiness_preview_only",
    summary:
      "Execution candidate readiness is incomplete because conversion baseline and design evidence remain missing.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    candidateId: "execution_candidate_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 95,
    requirementsMet: [
      "execution_plan_present",
      "planning_artifacts_present",
      "content_plan_defined",
      "homepage_messaging_scope_defined",
    ],
    requirementsMissing: ["design_evidence"],
    candidatePresent: true,
    candidateArtifactsPresent: true,
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_readiness_preview_only",
    summary: "Execution candidate readiness is nearly qualified but still requires design evidence.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    candidateId: "execution_candidate_proposal_candidate_validation_mode",
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
    candidatePresent: true,
    candidateArtifactsPresent: true,
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_readiness_preview_only",
    summary: "Execution candidate readiness is qualified for preview only; governance still blocks execution.",
  });
});

test("twin execution candidate readiness: fallback behavior is deterministic", () => {
  const records = buildExecutionCandidateReadinessRecords(candidateRecords);
  const fallbackRecord = records.find((entry) => entry.proposalTitle === "Unknown Proposal");

  assert.deepEqual(fallbackRecord, {
    candidateId: "execution_candidate_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "unknown",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: ["execution_candidate_readiness_requirements_unknown"],
    candidatePresent: false,
    candidateArtifactsPresent: false,
    blockedReasons: ["execution_candidate_requirements_unknown", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_readiness_preview_only",
    summary: "Execution candidate readiness cannot be evaluated because candidate evidence is unknown.",
  });
  assert.equal(hasExecutionCandidateReadinessFallbackApplied(records), true);
});

test("twin execution candidate readiness: score propagation is deterministic", () => {
  const records = buildExecutionCandidateReadinessRecords(candidateRecords);
  const scores = new Map(records.map((entry) => [entry.proposalTitle, entry.readinessScore]));

  assert.equal(scores.get("Improve Homepage Conversion Flow"), 85);
  assert.equal(scores.get("Improve Homepage Quality and Messaging"), 95);
  assert.equal(scores.get("Maintain Read-Only Validation Mode"), 100);
  assert.equal(scores.get("Unknown Proposal"), 0);
});

test("twin execution candidate readiness: governance lock is always enforced", () => {
  const records = buildExecutionCandidateReadinessRecords(candidateRecords);

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    records.every((entry) => entry.governanceState === "execution_candidate_readiness_preview_only"),
    true,
  );
  assert.equal(records.every((entry) => entry.blockedReasons.includes("governance_execution_blocked")), true);
});

test("twin execution candidate readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_READINESS_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_CANDIDATE_READINESS_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_READINESS_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_CANDIDATE_READINESS_COMPLETED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_READINESS_DIAGNOSTICS.FALLBACK_APPLIED,
    "TWIN_EXECUTION_CANDIDATE_READINESS_FALLBACK_APPLIED",
  );
});
