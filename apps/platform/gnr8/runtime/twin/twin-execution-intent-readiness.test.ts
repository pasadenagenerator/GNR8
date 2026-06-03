import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionIntentRecord } from "@/gnr8/runtime/twin/twin-execution-intent";
import {
  generateTwinExecutionIntentReadinessRecords,
  TWIN_EXECUTION_INTENT_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-intent-readiness";

function executionIntent(
  proposalId: string,
  proposalTitle: string,
  intentType: string,
): TwinExecutionIntentRecord {
  return {
    proposalId,
    proposalTitle,
    intentState: "intent_ready_preview",
    readinessState: "ready",
    readinessScore: 100,
    intentType,
    intendedActions: [],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_preview_only",
    summary: "Execution intent preview only.",
  };
}

const executionIntentRecords = [
  executionIntent(
    "proposal_candidate_conversion_flow",
    "Improve Homepage Conversion Flow",
    "conversion_improvement_intent",
  ),
  executionIntent(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "content_improvement_intent",
  ),
  executionIntent(
    "proposal_candidate_validation_mode",
    "Maintain Read-Only Validation Mode",
    "governance_validation_intent",
  ),
  executionIntent(
    "proposal_candidate_unknown",
    "Unknown Proposal",
    "unknown_intent",
  ),
];

test("twin execution intent readiness: deterministic generation", () => {
  const first = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);
  const second = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  assert.deepEqual(first, second);
});

test("twin execution intent readiness: conversion mapping", () => {
  const readinessRecords = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  assert.deepEqual(readinessRecords[0], {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "intent_not_ready",
    readinessScore: 80,
    requirementsMet: [
      "execution_intent_present",
      "conversion_intent_defined",
    ],
    requirementsMissing: [
      "conversion_baseline",
      "design_evidence",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_readiness_preview_only",
    summary:
      "Execution intent readiness remains blocked until conversion baseline and design evidence become available.",
  });
});

test("twin execution intent readiness: content mapping", () => {
  const readinessRecords = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  assert.deepEqual(readinessRecords[1], {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "intent_nearly_ready",
    readinessScore: 95,
    requirementsMet: [
      "execution_intent_present",
      "content_intent_defined",
      "homepage_messaging_scope_defined",
    ],
    requirementsMissing: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_readiness_preview_only",
    summary:
      "Execution intent readiness is nearly complete but still requires design evidence.",
  });
});

test("twin execution intent readiness: governance mapping", () => {
  const readinessRecords = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  assert.deepEqual(readinessRecords[2], {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "intent_ready_preview",
    readinessScore: 100,
    requirementsMet: [
      "execution_intent_present",
      "governance_intent_defined",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_readiness_preview_only",
    summary:
      "Execution intent readiness is complete within current governance boundaries.",
  });
});

test("twin execution intent readiness: fallback mapping", () => {
  const readinessRecords = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  assert.deepEqual(readinessRecords[3], {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "intent_not_ready",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: [
      "unknown_intent_type",
      "governance_execution_blocked",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_intent_readiness_preview_only",
    summary: "Execution intent readiness could not be determined.",
  });
});

test("twin execution intent readiness: requirements are cloned per record", () => {
  const first = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);
  const second = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  first[1]?.requirementsMet.push("local_met_mutation");
  first[1]?.requirementsMissing.push("local_missing_mutation");

  assert.equal(second[1]?.requirementsMet.includes("local_met_mutation"), false);
  assert.equal(second[1]?.requirementsMissing.includes("local_missing_mutation"), false);
});

test("twin execution intent readiness: governance flags are always false", () => {
  const readinessRecords = generateTwinExecutionIntentReadinessRecords(executionIntentRecords);

  assert.equal(readinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    readinessRecords.every((entry) => entry.governanceState === "execution_intent_readiness_preview_only"),
    true,
  );
});

test("twin execution intent readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_INTENT_READINESS_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_INTENT_READINESS_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_INTENT_READINESS_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_INTENT_READINESS_COMPLETED",
  );
});
