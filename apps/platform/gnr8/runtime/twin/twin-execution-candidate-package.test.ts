import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";
import {
  buildExecutionCandidatePackageRecords,
  hasExecutionCandidatePackageFallbackApplied,
  TWIN_EXECUTION_CANDIDATE_PACKAGE_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-candidate-package";

function candidateRecord(input: {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  candidateState: ExecutionCandidateRecord["candidateState"];
  readinessState: ExecutionCandidateRecord["readinessState"];
  readinessScore: number;
  candidateType: string;
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
    candidateType: input.candidateType,
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

function candidateReadinessRecord(input: {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  readinessState: ExecutionCandidateReadinessRecord["readinessState"];
  readinessScore: number;
  requirementsMet?: string[];
  requirementsMissing?: string[];
  candidatePresent?: boolean;
  candidateArtifactsPresent?: boolean;
  blockedReasons?: string[];
}): ExecutionCandidateReadinessRecord {
  return {
    candidateId: input.candidateId,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    requirementsMet: input.requirementsMet ?? ["execution_plan_present"],
    requirementsMissing: input.requirementsMissing ?? [],
    candidatePresent: input.candidatePresent ?? true,
    candidateArtifactsPresent: input.candidateArtifactsPresent ?? true,
    blockedReasons: input.blockedReasons ?? ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_readiness_preview_only",
    summary: "Execution candidate readiness preview.",
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

const readinessRecords = [
  candidateReadinessRecord({
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
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
  }),
  candidateReadinessRecord({
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
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
  }),
  candidateReadinessRecord({
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
  }),
  candidateReadinessRecord({
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
  }),
];

test("twin execution candidate package: deterministic generation", () => {
  const first = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);
  const second = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);

  assert.deepEqual(first, second);
});

test("twin execution candidate package: mappings and package composition are deterministic", () => {
  const packageRecords = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);
  const byTitle = new Map(packageRecords.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    candidateId: "execution_candidate_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    packageState: "package_incomplete",
    readinessState: "incomplete",
    readinessScore: 85,
    candidateType: "conversion_flow_execution_candidate",
    includedComponents: [
      "execution_candidate",
      "execution_candidate_readiness",
      "candidate_scope",
      "candidate_artifacts",
    ],
    missingComponents: ["conversion_baseline", "design_evidence"],
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_package_preview_only",
    summary:
      "Execution candidate package is incomplete because conversion baseline and design evidence remain missing.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    candidateId: "execution_candidate_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    packageState: "package_ready",
    readinessState: "nearly_ready",
    readinessScore: 95,
    candidateType: "homepage_messaging_execution_candidate",
    includedComponents: [
      "execution_candidate",
      "execution_candidate_readiness",
      "candidate_scope",
      "candidate_artifacts",
      "candidate_requirements",
    ],
    missingComponents: ["design_evidence"],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_package_preview_only",
    summary:
      "Execution candidate package is assembled for preview, while design evidence and governance still block execution.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    candidateId: "execution_candidate_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    packageState: "package_ready",
    readinessState: "ready",
    readinessScore: 100,
    candidateType: "validation_runtime_execution_candidate",
    includedComponents: [
      "execution_candidate",
      "execution_candidate_readiness",
      "candidate_scope",
      "candidate_artifacts",
      "candidate_requirements",
    ],
    missingComponents: [],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_package_preview_only",
    summary:
      "Execution candidate package is assembled within read-only validation governance.",
  });
});

test("twin execution candidate package: fallback behavior is deterministic", () => {
  const packageRecords = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);

  assert.deepEqual(packageRecords[3], {
    candidateId: "execution_candidate_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    packageState: "unknown",
    readinessState: "unknown",
    readinessScore: 0,
    candidateType: "unknown_execution_candidate",
    includedComponents: [],
    missingComponents: ["execution_candidate_package_requirements_unknown"],
    blockedReasons: ["execution_candidate_requirements_unknown", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_package_preview_only",
    summary:
      "Execution candidate package cannot be assembled because candidate readiness evidence is unknown.",
  });
  assert.equal(hasExecutionCandidatePackageFallbackApplied(packageRecords), true);
});

test("twin execution candidate package: missing readiness record falls back to unknown", () => {
  const packageRecords = buildExecutionCandidatePackageRecords(
    [candidateRecords[0] as ExecutionCandidateRecord],
    [],
  );

  assert.equal(packageRecords[0]?.packageState, "unknown");
  assert.equal(packageRecords[0]?.readinessState, "unknown");
  assert.equal(packageRecords[0]?.readinessScore, 0);
  assert.deepEqual(packageRecords[0]?.missingComponents, [
    "execution_candidate_package_requirements_unknown",
  ]);
});

test("twin execution candidate package: readiness propagation is deterministic", () => {
  const packageRecords = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);

  assert.deepEqual(
    packageRecords.map((entry) => entry.readinessState),
    ["incomplete", "nearly_ready", "ready", "unknown"],
  );
  assert.deepEqual(
    packageRecords.map((entry) => entry.readinessScore),
    [85, 95, 100, 0],
  );
  assert.deepEqual(
    packageRecords.map((entry) => entry.candidateType),
    [
      "conversion_flow_execution_candidate",
      "homepage_messaging_execution_candidate",
      "validation_runtime_execution_candidate",
      "unknown_execution_candidate",
    ],
  );
});

test("twin execution candidate package: component arrays are cloned per record", () => {
  const first = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);
  const second = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);

  first[1]?.includedComponents.push("local_included_mutation");
  first[1]?.missingComponents.push("local_missing_mutation");

  assert.equal(second[1]?.includedComponents.includes("local_included_mutation"), false);
  assert.equal(second[1]?.missingComponents.includes("local_missing_mutation"), false);
});

test("twin execution candidate package: governance lock is always enforced", () => {
  const packageRecords = buildExecutionCandidatePackageRecords(candidateRecords, readinessRecords);

  assert.equal(packageRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(packageRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(packageRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(packageRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    packageRecords.every(
      (entry) => entry.governanceState === "execution_candidate_package_preview_only",
    ),
    true,
  );
  assert.equal(packageRecords.every((entry) => entry.blockedReasons.includes("governance_execution_blocked")), true);
});

test("twin execution candidate package: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_PACKAGE_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_CANDIDATE_PACKAGE_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_PACKAGE_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_CANDIDATE_PACKAGE_COMPLETED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_PACKAGE_DIAGNOSTICS.FALLBACK_APPLIED,
    "TWIN_EXECUTION_CANDIDATE_PACKAGE_FALLBACK_APPLIED",
  );
});
