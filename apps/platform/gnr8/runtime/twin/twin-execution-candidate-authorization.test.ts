import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidatePackageRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-package";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";
import {
  buildExecutionCandidateAuthorizationRecords,
  getExecutionCandidateAuthorizationDiagnostics,
  TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-candidate-authorization";

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
  blockedReasons?: string[];
}): ExecutionCandidateReadinessRecord {
  return {
    candidateId: input.candidateId,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    requirementsMet: ["execution_plan_present"],
    requirementsMissing: [],
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
    includedComponents: ["execution_candidate", "execution_candidate_readiness"],
    missingComponents: [],
    blockedReasons: input.blockedReasons ?? ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_candidate_package_preview_only",
    summary: "Execution candidate package preview.",
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
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
  }),
  readinessRecord({
    candidateId: "execution_candidate_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
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
  }),
];

test("twin execution candidate authorization: deterministic generation", () => {
  const first = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );
  const second = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );

  assert.deepEqual(first, second);
});

test("twin execution candidate authorization: conversion candidate is blocked", () => {
  const records = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );
  const conversionRecord = records.find((record) => record.proposalId === "proposal_candidate_conversion_flow");

  assert.equal(conversionRecord?.authorizationState, "authorization_blocked");
  assert.equal(conversionRecord?.readinessState, "incomplete");
  assert.equal(conversionRecord?.readinessScore, 85);
  assert.equal(conversionRecord?.authorizationType, "conversion_candidate_authorization");
  assert.deepEqual(conversionRecord?.requiredAuthorizations, [
    "operator_review",
    "conversion_baseline_review",
    "design_review",
  ]);
  assert.deepEqual(conversionRecord?.blockedReasons, [
    "missing_conversion_baseline",
    "missing_design_evidence",
    "governance_execution_blocked",
  ]);
});

test("twin execution candidate authorization: messaging candidate is ready for preview", () => {
  const records = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );
  const messagingRecord = records.find((record) => record.proposalId === "proposal_candidate_quality_messaging");

  assert.equal(messagingRecord?.authorizationState, "authorization_ready_preview");
  assert.equal(messagingRecord?.readinessState, "nearly_ready");
  assert.equal(messagingRecord?.readinessScore, 95);
  assert.equal(messagingRecord?.authorizationType, "content_candidate_authorization");
  assert.deepEqual(messagingRecord?.requiredAuthorizations, ["operator_review", "design_review"]);
  assert.deepEqual(messagingRecord?.blockedReasons, [
    "missing_design_evidence",
    "governance_execution_blocked",
  ]);
});

test("twin execution candidate authorization: validation candidate follows governance authorization path", () => {
  const records = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );
  const validationRecord = records.find((record) => record.proposalId === "proposal_candidate_validation_mode");

  assert.equal(validationRecord?.authorizationState, "authorization_ready_preview");
  assert.equal(validationRecord?.readinessState, "ready");
  assert.equal(validationRecord?.readinessScore, 100);
  assert.equal(validationRecord?.authorizationType, "governance_candidate_authorization");
  assert.deepEqual(validationRecord?.requiredAuthorizations, ["operator_review"]);
  assert.deepEqual(validationRecord?.blockedReasons, ["governance_execution_blocked"]);
});

test("twin execution candidate authorization: governance lock is always enforced", () => {
  const records = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    records.every(
      (entry) => entry.governanceState === "execution_candidate_authorization_preview_only",
    ),
    true,
  );
});

test("twin execution candidate authorization: authorization arrays are cloned per record", () => {
  const first = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );
  const second = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );

  first[1]?.requiredAuthorizations.push("local_authorization_mutation");
  first[1]?.blockedReasons.push("local_blocked_reason_mutation");

  assert.equal(second[1]?.requiredAuthorizations.includes("local_authorization_mutation"), false);
  assert.equal(second[1]?.blockedReasons.includes("local_blocked_reason_mutation"), false);
});

test("twin execution candidate authorization: diagnostics constants are stable", () => {
  const records = buildExecutionCandidateAuthorizationRecords(
    candidateRecords,
    readinessRecords,
    packageRecords,
  );

  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS.CREATED,
    "EXECUTION_CANDIDATE_AUTHORIZATION_CREATED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS.BLOCKED,
    "EXECUTION_CANDIDATE_AUTHORIZATION_BLOCKED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_DIAGNOSTICS.READY,
    "EXECUTION_CANDIDATE_AUTHORIZATION_READY",
  );
  assert.deepEqual(getExecutionCandidateAuthorizationDiagnostics(records), [
    "EXECUTION_CANDIDATE_AUTHORIZATION_CREATED",
    "EXECUTION_CANDIDATE_AUTHORIZATION_BLOCKED",
    "EXECUTION_CANDIDATE_AUTHORIZATION_READY",
  ]);
});
