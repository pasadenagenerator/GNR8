import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionBundleReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-bundle-readiness";
import {
  generateTwinExecutionAuthorizationPreviewRecords,
  TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-authorization-preview";

function bundleReadinessRecord(
  proposalId: string,
  proposalTitle: string,
  readinessState: string,
  readinessScore: number,
): TwinExecutionBundleReadinessRecord {
  return {
    proposalId,
    proposalTitle,
    readinessState: readinessState as TwinExecutionBundleReadinessRecord["readinessState"],
    readinessScore,
    requirementsMet: [],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_readiness_preview_only",
    summary: "Execution bundle readiness preview only.",
  };
}

const bundleReadinessRecords = [
  bundleReadinessRecord(
    "proposal_candidate_conversion_flow",
    "Improve Homepage Conversion Flow",
    "incomplete",
    80,
  ),
  bundleReadinessRecord(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "nearly_ready",
    95,
  ),
  bundleReadinessRecord(
    "proposal_candidate_validation_mode",
    "Maintain Read-Only Validation Mode",
    "ready",
    100,
  ),
  bundleReadinessRecord("proposal_candidate_unknown", "Unknown Proposal", "incomplete", 50),
];

test("twin execution authorization preview: deterministic generation", () => {
  const first = generateTwinExecutionAuthorizationPreviewRecords(bundleReadinessRecords);
  const second = generateTwinExecutionAuthorizationPreviewRecords(bundleReadinessRecords);

  assert.deepEqual(first, second);
});

test("twin execution authorization preview: all title fragment rules and fallback are deterministic", () => {
  const authorizationPreviews =
    generateTwinExecutionAuthorizationPreviewRecords(bundleReadinessRecords);
  const byTitle = new Map(authorizationPreviews.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    authorizationPreviewState: "authorization_preview_incomplete",
    readinessState: "incomplete",
    readinessScore: 80,
    authorizationType: "conversion_authorization",
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
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_preview_only",
    summary:
      "Authorization preview requires conversion baseline review and design review before future execution authorization.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    authorizationPreviewState: "authorization_preview_ready",
    readinessState: "nearly_ready",
    readinessScore: 95,
    authorizationType: "content_authorization",
    requiredAuthorizations: ["operator_review", "design_review"],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_preview_only",
    summary:
      "Authorization preview is structurally ready but remains blocked by design evidence and governance restrictions.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    authorizationPreviewState: "authorization_preview_ready",
    readinessState: "ready",
    readinessScore: 100,
    authorizationType: "governance_validation_authorization",
    requiredAuthorizations: ["operator_review"],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_preview_only",
    summary:
      "Authorization preview is prepared for future governance validation review while remaining non-executable.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    authorizationPreviewState: "authorization_preview_incomplete",
    readinessState: "incomplete",
    readinessScore: 50,
    authorizationType: "generic_authorization",
    requiredAuthorizations: ["operator_review"],
    blockedReasons: ["additional_authorization_evidence_required"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_preview_only",
    summary: "Authorization preview requires additional authorization evidence.",
  });
});

test("twin execution authorization preview: authorization arrays are cloned per record", () => {
  const first = generateTwinExecutionAuthorizationPreviewRecords(bundleReadinessRecords);
  const second = generateTwinExecutionAuthorizationPreviewRecords(bundleReadinessRecords);

  first[0]?.requiredAuthorizations.push("local_authorization_mutation");
  first[0]?.blockedReasons.push("local_blocked_reason_mutation");

  assert.equal(second[0]?.requiredAuthorizations.includes("local_authorization_mutation"), false);
  assert.equal(second[0]?.blockedReasons.includes("local_blocked_reason_mutation"), false);
});

test("twin execution authorization preview: governance flags are always false", () => {
  const authorizationPreviews =
    generateTwinExecutionAuthorizationPreviewRecords(bundleReadinessRecords);

  assert.equal(authorizationPreviews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(authorizationPreviews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(authorizationPreviews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(authorizationPreviews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    authorizationPreviews.every(
      (entry) => entry.governanceState === "execution_authorization_preview_only",
    ),
    true,
  );
});

test("twin execution authorization preview: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_AUTHORIZATION_PREVIEW_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_AUTHORIZATION_PREVIEW_COMPLETED",
  );
});
