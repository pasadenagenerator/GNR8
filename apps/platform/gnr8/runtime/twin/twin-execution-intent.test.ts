import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionAuthorizationPackageRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-package";
import {
  generateTwinExecutionIntentRecords,
  TWIN_EXECUTION_INTENT_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-intent";

function authorizationPackage(
  proposalId: string,
  proposalTitle: string,
  readinessState: string,
  readinessScore: number,
  authorizationType: string,
): TwinExecutionAuthorizationPackageRecord {
  return {
    proposalId,
    proposalTitle,
    packageState: "package_ready",
    readinessState,
    readinessScore,
    authorizationType,
    includedComponents: [],
    missingComponents: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_package_preview_only",
    summary: "Execution authorization package preview only.",
  };
}

const authorizationPackageRecords = [
  authorizationPackage(
    "proposal_candidate_conversion_flow",
    "Improve Homepage Conversion Flow",
    "not_ready",
    85,
    "conversion_authorization",
  ),
  authorizationPackage(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "nearly_ready",
    95,
    "content_authorization",
  ),
  authorizationPackage(
    "proposal_candidate_validation_mode",
    "Maintain Read-Only Validation Mode",
    "ready",
    100,
    "governance_validation_authorization",
  ),
  authorizationPackage(
    "proposal_candidate_unknown",
    "Unknown Proposal",
    "unknown",
    0,
    "generic_authorization",
  ),
];

test("twin execution intent: deterministic generation", () => {
  const first = generateTwinExecutionIntentRecords(authorizationPackageRecords);
  const second = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  assert.deepEqual(first, second);
});

test("twin execution intent: conversion mapping", () => {
  const intentRecords = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  assert.deepEqual(intentRecords[0], {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    intentState: "intent_blocked",
    readinessState: "not_ready",
    readinessScore: 85,
    intentType: "conversion_improvement_intent",
    intendedActions: [
      "review_conversion_path",
      "prepare_homepage_conversion_changes",
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
    governanceState: "execution_intent_preview_only",
    summary:
      "Execution intent preview is blocked until conversion baseline and design evidence are available.",
  });
});

test("twin execution intent: content mapping", () => {
  const intentRecords = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  assert.deepEqual(intentRecords[1], {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    intentState: "intent_ready_preview",
    readinessState: "nearly_ready",
    readinessScore: 95,
    intentType: "content_improvement_intent",
    intendedActions: [
      "review_homepage_messaging",
      "prepare_homepage_copy_improvements",
    ],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_preview_only",
    summary:
      "Execution intent preview is structurally ready for future content improvement review while execution remains blocked.",
  });
});

test("twin execution intent: governance mapping", () => {
  const intentRecords = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  assert.deepEqual(intentRecords[2], {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    intentState: "intent_ready_preview",
    readinessState: "ready",
    readinessScore: 100,
    intentType: "governance_validation_intent",
    intendedActions: [
      "maintain_read_only_runtime",
      "continue_governance_validation",
    ],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_preview_only",
    summary:
      "Execution intent preview maintains read-only governance validation with execution disabled.",
  });
});

test("twin execution intent: fallback mapping", () => {
  const intentRecords = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  assert.deepEqual(intentRecords[3], {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    intentState: "intent_blocked",
    readinessState: "unknown",
    readinessScore: 0,
    intentType: "unknown_intent",
    intendedActions: [],
    blockedReasons: ["unknown_authorization_type", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_preview_only",
    summary:
      "Execution intent preview is blocked because the authorization type is unknown.",
  });
});

test("twin execution intent: intended actions and blocked reasons are cloned per record", () => {
  const first = generateTwinExecutionIntentRecords(authorizationPackageRecords);
  const second = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  first[1]?.intendedActions.push("local_action_mutation");
  first[1]?.blockedReasons.push("local_reason_mutation");

  assert.equal(second[1]?.intendedActions.includes("local_action_mutation"), false);
  assert.equal(second[1]?.blockedReasons.includes("local_reason_mutation"), false);
});

test("twin execution intent: governance flags are always false", () => {
  const intentRecords = generateTwinExecutionIntentRecords(authorizationPackageRecords);

  assert.equal(intentRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(intentRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(intentRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(intentRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    intentRecords.every((entry) => entry.governanceState === "execution_intent_preview_only"),
    true,
  );
});

test("twin execution intent: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_INTENT_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_INTENT_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_INTENT_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_INTENT_COMPLETED",
  );
});
