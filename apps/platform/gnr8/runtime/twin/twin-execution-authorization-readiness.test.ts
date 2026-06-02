import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionAuthorizationPreviewRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-preview";
import {
  generateTwinExecutionAuthorizationReadinessRecords,
  TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-authorization-readiness";

function authorizationPreview(
  proposalId: string,
  proposalTitle: string,
  authorizationPreviewState: TwinExecutionAuthorizationPreviewRecord["authorizationPreviewState"],
  readinessState: string,
  readinessScore: number,
): TwinExecutionAuthorizationPreviewRecord {
  return {
    proposalId,
    proposalTitle,
    authorizationPreviewState,
    readinessState,
    readinessScore,
    authorizationType: "test_authorization",
    requiredAuthorizations: [],
    blockedReasons: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_preview_only",
    summary: "Execution authorization preview only.",
  };
}

const authorizationPreviews = [
  authorizationPreview(
    "proposal_candidate_conversion_flow",
    "Improve Homepage Conversion Flow",
    "authorization_preview_incomplete",
    "incomplete",
    80,
  ),
  authorizationPreview(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "authorization_preview_ready",
    "nearly_ready",
    95,
  ),
  authorizationPreview(
    "proposal_candidate_validation_mode",
    "Maintain Read-Only Validation Mode",
    "authorization_preview_ready",
    "ready",
    100,
  ),
  authorizationPreview(
    "proposal_candidate_unknown",
    "Unknown Proposal",
    "authorization_preview_ready",
    "incomplete",
    50,
  ),
];

test("twin execution authorization readiness: deterministic generation", () => {
  const first = generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);
  const second = generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);

  assert.deepEqual(first, second);
});

test("twin execution authorization readiness: rules and fallback are deterministic", () => {
  const readinessRecords =
    generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);
  const byTitle = new Map(readinessRecords.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "not_ready",
    readinessScore: 85,
    requirementsMet: ["authorization_preview_present", "authorization_scope_defined"],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_readiness_preview_only",
    summary:
      "Execution authorization readiness remains blocked until conversion baseline and design evidence become available.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 95,
    requirementsMet: [
      "authorization_preview_present",
      "authorization_scope_defined",
      "authorization_package_available",
    ],
    requirementsMissing: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_readiness_preview_only",
    summary:
      "Execution authorization readiness is nearly complete but still requires design evidence.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
    requirementsMet: [
      "authorization_preview_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_readiness_preview_only",
    summary: "Execution authorization readiness is complete within current governance boundaries.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "not_ready",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: ["authorization_preview_missing"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_readiness_preview_only",
    summary: "Execution authorization readiness could not be determined.",
  });
});

test("twin execution authorization readiness: requirement arrays are cloned per record", () => {
  const first = generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);
  const second = generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);

  first[0]?.requirementsMet.push("local_met_mutation");
  first[0]?.requirementsMissing.push("local_missing_mutation");

  assert.equal(second[0]?.requirementsMet.includes("local_met_mutation"), false);
  assert.equal(second[0]?.requirementsMissing.includes("local_missing_mutation"), false);
});

test("twin execution authorization readiness: readiness scores are rule-owned", () => {
  const readinessRecords =
    generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);

  assert.deepEqual(
    readinessRecords.map((entry) => entry.readinessScore),
    [85, 95, 100, 0],
  );
});

test("twin execution authorization readiness: governance flags are always false", () => {
  const readinessRecords =
    generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews);

  assert.equal(readinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    readinessRecords.every(
      (entry) => entry.governanceState === "execution_authorization_readiness_preview_only",
    ),
    true,
  );
});

test("twin execution authorization readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED",
  );
});
