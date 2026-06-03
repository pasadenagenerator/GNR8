import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionCandidateRecord } from "@/gnr8/runtime/twin/twin-execution-candidate";
import type { ExecutionCandidateAuthorizationRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-authorization";
import type { ExecutionCandidateAuthorizationReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-authorization-readiness";
import type { ExecutionCandidatePackageRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-package";
import type { ExecutionCandidateReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-candidate-readiness";
import {
  buildExecutionCandidateAuthorizationPackageRecords,
  getExecutionCandidateAuthorizationPackageDiagnostics,
  TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-candidate-authorization-package";

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

function candidateReadinessRecord(input: {
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

function candidatePackageRecord(input: {
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

function authorizationReadinessRecord(input: {
  proposalId: string;
  readinessState: ExecutionCandidateAuthorizationReadinessRecord["readinessState"];
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  blockedReasons: string[];
}): ExecutionCandidateAuthorizationReadinessRecord {
  return {
    proposalId: input.proposalId,
    readinessState: input.readinessState,
    readinessScore: input.readinessScore,
    authorizationPresent: true,
    authorizationRequirementsPresent: true,
    requirementsMet: [...input.requirementsMet],
    requirementsMissing: [...input.requirementsMissing],
    blockedReasons: [...input.blockedReasons],
    governanceState: "execution_candidate_authorization_readiness_preview_only",
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    summary: "Execution candidate authorization readiness preview.",
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

const candidateReadinessRecords = [
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
    blockedReasons: ["governance_execution_blocked"],
  }),
];

const candidatePackageRecords = [
  candidatePackageRecord({
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
  candidatePackageRecord({
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
  candidatePackageRecord({
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

const authorizationReadinessRecords = [
  authorizationReadinessRecord({
    proposalId: "proposal_candidate_conversion_flow",
    readinessState: "incomplete",
    readinessScore: 85,
    requirementsMet: [
      "candidate_authorization_present",
      "candidate_authorization_scope_defined",
    ],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
  }),
  authorizationReadinessRecord({
    proposalId: "proposal_candidate_quality_messaging",
    readinessState: "nearly_ready",
    readinessScore: 95,
    requirementsMet: [
      "candidate_authorization_present",
      "candidate_authorization_scope_defined",
      "candidate_authorization_package_available",
    ],
    requirementsMissing: ["design_evidence"],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
  }),
  authorizationReadinessRecord({
    proposalId: "proposal_candidate_validation_mode",
    readinessState: "ready",
    readinessScore: 100,
    requirementsMet: [
      "candidate_authorization_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    blockedReasons: ["governance_execution_blocked"],
  }),
];

function buildRecords() {
  return buildExecutionCandidateAuthorizationPackageRecords(
    authorizationRecords,
    authorizationReadinessRecords,
    candidateRecords,
    candidateReadinessRecords,
    candidatePackageRecords,
  );
}

test("twin execution candidate authorization package: deterministic generation", () => {
  assert.deepEqual(buildRecords(), buildRecords());
});

test("twin execution candidate authorization package: conversion package is incomplete", () => {
  const conversionRecord = buildRecords().find(
    (record) => record.proposalId === "proposal_candidate_conversion_flow",
  );

  assert.equal(conversionRecord?.packageState, "package_incomplete");
  assert.equal(conversionRecord?.readinessState, "incomplete");
  assert.equal(conversionRecord?.readinessScore, 85);
  assert.equal(conversionRecord?.authorizationType, "conversion_candidate_authorization");
  assert.deepEqual(conversionRecord?.includedComponents, [
    "candidate_authorization",
    "candidate_authorization_readiness",
    "authorization_scope",
    "authorization_requirements",
  ]);
  assert.deepEqual(conversionRecord?.missingComponents, [
    "conversion_baseline",
    "design_evidence",
  ]);
  assert.deepEqual(conversionRecord?.blockedReasons, [
    "missing_conversion_baseline",
    "missing_design_evidence",
    "governance_execution_blocked",
  ]);
});

test("twin execution candidate authorization package: messaging package is assembled", () => {
  const messagingRecord = buildRecords().find(
    (record) => record.proposalId === "proposal_candidate_quality_messaging",
  );

  assert.equal(messagingRecord?.packageState, "package_ready");
  assert.equal(messagingRecord?.readinessState, "nearly_ready");
  assert.equal(messagingRecord?.readinessScore, 95);
  assert.equal(messagingRecord?.authorizationType, "content_candidate_authorization");
  assert.deepEqual(messagingRecord?.includedComponents, [
    "candidate_authorization",
    "candidate_authorization_readiness",
    "authorization_scope",
    "authorization_requirements",
    "authorization_package",
  ]);
  assert.deepEqual(messagingRecord?.missingComponents, ["design_evidence"]);
  assert.deepEqual(messagingRecord?.blockedReasons, [
    "missing_design_evidence",
    "governance_execution_blocked",
  ]);
});

test("twin execution candidate authorization package: validation package follows governance path", () => {
  const validationRecord = buildRecords().find(
    (record) => record.proposalId === "proposal_candidate_validation_mode",
  );

  assert.equal(validationRecord?.packageState, "package_ready");
  assert.equal(validationRecord?.readinessState, "ready");
  assert.equal(validationRecord?.readinessScore, 100);
  assert.equal(validationRecord?.authorizationType, "governance_candidate_authorization");
  assert.deepEqual(validationRecord?.includedComponents, [
    "candidate_authorization",
    "candidate_authorization_readiness",
    "authorization_scope",
    "authorization_requirements",
    "authorization_package",
  ]);
  assert.deepEqual(validationRecord?.missingComponents, []);
  assert.deepEqual(validationRecord?.blockedReasons, ["governance_execution_blocked"]);
});

test("twin execution candidate authorization package: governance lock is always enforced", () => {
  const records = buildRecords();

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    records.every(
      (entry) => entry.governanceState === "execution_candidate_authorization_package_preview_only",
    ),
    true,
  );
});

test("twin execution candidate authorization package: arrays are cloned per record", () => {
  const first = buildRecords();
  const second = buildRecords();

  first[1]?.includedComponents.push("local_included_component_mutation");
  first[1]?.missingComponents.push("local_missing_component_mutation");
  first[1]?.blockedReasons.push("local_blocked_reason_mutation");

  assert.equal(second[1]?.includedComponents.includes("local_included_component_mutation"), false);
  assert.equal(second[1]?.missingComponents.includes("local_missing_component_mutation"), false);
  assert.equal(second[1]?.blockedReasons.includes("local_blocked_reason_mutation"), false);
});

test("twin execution candidate authorization package: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS.CREATED,
    "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_CREATED",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS.INCOMPLETE,
    "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_INCOMPLETE",
  );
  assert.equal(
    TWIN_EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_DIAGNOSTICS.READY,
    "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_READY",
  );
  assert.deepEqual(getExecutionCandidateAuthorizationPackageDiagnostics(buildRecords()), [
    "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_CREATED",
    "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_INCOMPLETE",
    "EXECUTION_CANDIDATE_AUTHORIZATION_PACKAGE_READY",
  ]);
});
