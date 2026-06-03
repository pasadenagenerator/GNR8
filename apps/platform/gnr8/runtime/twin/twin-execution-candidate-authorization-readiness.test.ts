import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidateAuthorizationRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-authorization";
import type { ExecutionCandidatePackageRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-package";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";
import {
  buildExecutionCandidateAuthorizationReadinessRecords,
  getExecutionCandidateAuthorizationReadinessDiagnostics,
  TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-candidate-authorization-readiness";

function candidateRecord(input: {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  candidateState: ExecutionCandidateRecord["candidateState"];
  readinessState: ExecutionCandidateRecord["readinessState"];
  readinessScore: number;
  candidateType: string;
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
    candidateScope: ["homepage"],
    candidateArtifacts: ["candidate_artifact"],
    candidateRequirements: ["execution_plan_present"],
    blockedReasons: input.blockedReasons ?? ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_preview_only",
    summary: "Execution candidate preview.",
  };
}

function readinessRecord(input: {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  readinessState: ExecutionCandidateReadinessRecord["readinessState"];
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  blockedReasons?: string[];
}): ExecutionCandidateReadinessRecord {
  return {
    candidateId: input.candidateId,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    requirementsMet: [...input.requirementsMet],
    requirementsMissing: [...input.requirementsMissing],
    candidatePresent: true,
    candidateArtifactsPresent: true,
    blockedReasons: input.blockedReasons ?? ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_readiness_preview_only",
    summary: "Execution candidate readiness preview.",
  };
}

function packageRecord(input: {
  candidateId: string;
  proposalId: string;
  proposalTitle: string;
  packageState: ExecutionCandidatePackageRecord["packageState"];
  readinessState: ExecutionCandidatePackageRecord["readinessState"];
  readinessScore: number;
  candidateType: string;
  includedComponents: string[];
  missingComponents: string[];
  blockedReasons?: string[];
}): ExecutionCandidatePackageRecord {
  return {
    candidateId: input.candidateId,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    packageState: input.packageState,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    candidateType: input.candidateType,
    includedComponents: [...input.includedComponents],
    missingComponents: [...input.missingComponents],
    blockedReasons: input.blockedReasons ?? ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_package_preview_only",
    summary: "Execution candidate package preview.",
  };
}

function authorizationRecord(input: {
  proposalId: string;
  proposalTitle: string;
  authorizationState: ExecutionCandidateAuthorizationRecord["authorizationState"];
  readinessState: ExecutionCandidateAuthorizationRecord["readinessState"];
  readinessScore: number;
  authorizationType: string;
  requiredAuthorizations: string[];
  blockedReasons: string[];
}): ExecutionCandidateAuthorizationRecord {
  return {
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    authorizationState: input.authorizationState,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    authorizationType: input.authorizationType,
    requiredAuthorizations: [...input.requiredAuthorizations],
    blockedReasons: [...input.blockedReasons],
    governanceState: "execution_candidate_authorization_preview_only",
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    summary: "Execution candidate authorization preview.",
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
  }),
];

const readinessRecords = [
  readinessRecord({
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
  readinessRecord({
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
  readinessRecord({
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
];

const packageRecords = [
  packageRecord({
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
  }),
  packageRecord({
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
  }),
  packageRecord({
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
  }),
];

const authorizationRecords = [
  authorizationRecord({
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    authorizationState: "authorization_blocked",
    readinessState: "incomplete",
    readinessScore: 85,
    authorizationType: "conversion_candidate_authorization",
    requiredAuthorizations: [
      "operator_review",
      "conversion_baseline_review",
      "design_review",
    ],
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
  }),
  authorizationRecord({
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    authorizationState: "authorization_ready_preview",
    readinessState: "nearly_ready",
    readinessScore: 95,
    authorizationType: "content_candidate_authorization",
    requiredAuthorizations: ["operator_review", "design_review"],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
  }),
  authorizationRecord({
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    authorizationState: "authorization_ready_preview",
    readinessState: "ready",
    readinessScore: 100,
    authorizationType: "governance_candidate_authorization",
    requiredAuthorizations: ["operator_review"],
    blockedReasons: ["governance_execution_blocked"],
  }),
];

function buildRecords() {
  return buildExecutionCandidateAuthorizationReadinessRecords(
    authorizationRecords,
    candidateRecords,
    readinessRecords,
    packageRecords,
  );
}

test("twin execution candidate authorization readiness: deterministic generation", () => {
  assert.deepEqual(buildRecords(), buildRecords());
});

test("twin execution candidate authorization readiness: conversion candidate authorization is incomplete", () => {
  const conversionRecord = buildRecords().find(
    (record) => record.proposalId === "proposal_candidate_conversion_flow",
  );

  assert.equal(conversionRecord?.readinessState, "incomplete");
  assert.equal(conversionRecord?.readinessScore, 85);
  assert.equal(conversionRecord?.authorizationPresent, true);
  assert.equal(conversionRecord?.authorizationRequirementsPresent, true);
  assert.deepEqual(conversionRecord?.requirementsMet, [
    "candidate_authorization_present",
    "candidate_authorization_scope_defined",
  ]);
  assert.deepEqual(conversionRecord?.requirementsMissing, [
    "conversion_baseline",
    "design_evidence",
  ]);
  assert.deepEqual(conversionRecord?.blockedReasons, [
    "missing_conversion_baseline",
    "missing_design_evidence",
    "governance_execution_blocked",
  ]);
});

test("twin execution candidate authorization readiness: messaging candidate authorization is nearly ready", () => {
  const messagingRecord = buildRecords().find(
    (record) => record.proposalId === "proposal_candidate_quality_messaging",
  );

  assert.equal(messagingRecord?.readinessState, "nearly_ready");
  assert.equal(messagingRecord?.readinessScore, 95);
  assert.equal(messagingRecord?.authorizationPresent, true);
  assert.equal(messagingRecord?.authorizationRequirementsPresent, true);
  assert.deepEqual(messagingRecord?.requirementsMet, [
    "candidate_authorization_present",
    "candidate_authorization_scope_defined",
    "candidate_authorization_package_available",
  ]);
  assert.deepEqual(messagingRecord?.requirementsMissing, ["design_evidence"]);
  assert.deepEqual(messagingRecord?.blockedReasons, [
    "missing_design_evidence",
    "governance_execution_blocked",
  ]);
});

test("twin execution candidate authorization readiness: validation candidate follows governance readiness path", () => {
  const validationRecord = buildRecords().find(
    (record) => record.proposalId === "proposal_candidate_validation_mode",
  );

  assert.equal(validationRecord?.readinessState, "ready");
  assert.equal(validationRecord?.readinessScore, 100);
  assert.equal(validationRecord?.authorizationPresent, true);
  assert.equal(validationRecord?.authorizationRequirementsPresent, true);
  assert.deepEqual(validationRecord?.requirementsMet, [
    "candidate_authorization_present",
    "governance_boundary_present",
    "validation_runtime_active",
  ]);
  assert.deepEqual(validationRecord?.requirementsMissing, []);
  assert.deepEqual(validationRecord?.blockedReasons, ["governance_execution_blocked"]);
});

test("twin execution candidate authorization readiness: governance lock is always enforced", () => {
  const records = buildRecords();

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    records.every(
      (entry) =>
        entry.governanceState === "execution_candidate_authorization_readiness_preview_only",
    ),
    true,
  );
});

test("twin execution candidate authorization readiness: arrays are cloned per record", () => {
  const first = buildRecords();
  const second = buildRecords();

  first[1]?.requirementsMet.push("local_requirement_mutation");
  first[1]?.requirementsMissing.push("local_missing_requirement_mutation");
  first[1]?.blockedReasons.push("local_blocked_reason_mutation");

  assert.equal(second[1]?.requirementsMet.includes("local_requirement_mutation"), false);
  assert.equal(second[1]?.requirementsMissing.includes("local_missing_requirement_mutation"), false);
  assert.equal(second[1]?.blockedReasons.includes("local_blocked_reason_mutation"), false);
});

test("twin execution candidate authorization readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.CREATED,
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_CREATED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.INCOMPLETE,
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_INCOMPLETE",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.NEARLY_READY,
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_NEARLY_READY",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_DIAGNOSTICS.READY,
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_READY",
  );
  assert.deepEqual(getExecutionCandidateAuthorizationReadinessDiagnostics(buildRecords()), [
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_CREATED",
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_INCOMPLETE",
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_NEARLY_READY",
    "EXECUTION_CANDIDATE_AUTHORIZATION_READINESS_READY",
  ]);
});
