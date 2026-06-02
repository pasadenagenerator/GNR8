import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionBundlePreview } from "@/gnr8/runtime/twin/twin-execution-bundle-preview";
import {
  generateTwinExecutionBundleReadinessRecords,
  TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-bundle-readiness";

function bundlePreview(proposalId: string, proposalTitle: string): TwinExecutionBundlePreview {
  return {
    bundleId: `execution_bundle_preview_${proposalId}`,
    proposalId,
    proposalTitle,
    bundleState: "bundle_ready",
    readinessState: "ready",
    readinessScore: 100,
    includedComponents: [],
    missingComponents: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_preview_only",
    summary: "Execution bundle preview only.",
  };
}

const bundlePreviews = [
  bundlePreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow"),
  bundlePreview("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging"),
  bundlePreview("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode"),
  bundlePreview("proposal_candidate_unknown", "Unknown Proposal"),
];

test("twin execution bundle readiness: deterministic generation", () => {
  const first = generateTwinExecutionBundleReadinessRecords(bundlePreviews);
  const second = generateTwinExecutionBundleReadinessRecords(bundlePreviews);

  assert.deepEqual(first, second);
});

test("twin execution bundle readiness: all title fragment rules and fallback are deterministic", () => {
  const readinessRecords = generateTwinExecutionBundleReadinessRecords(bundlePreviews);
  const byTitle = new Map(readinessRecords.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "incomplete",
    readinessScore: 80,
    requirementsMet: [
      "execution_bundle_present",
      "contract_bundle_present",
      "artifact_bundle_present",
    ],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_readiness_preview_only",
    summary:
      "Execution bundle requires additional conversion evidence and design evidence before future authorization readiness.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 95,
    requirementsMet: [
      "execution_bundle_present",
      "contract_bundle_present",
      "artifact_bundle_present",
      "messaging_surface_identified",
    ],
    requirementsMissing: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_readiness_preview_only",
    summary:
      "Execution bundle is nearly ready but requires design evidence before future authorization readiness.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
    requirementsMet: [
      "execution_bundle_present",
      "governance_bundle_present",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_readiness_preview_only",
    summary: "Execution bundle is fully prepared within current governance boundaries.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "incomplete",
    readinessScore: 50,
    requirementsMet: ["execution_bundle_present"],
    requirementsMissing: ["additional_bundle_evidence_required"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_readiness_preview_only",
    summary: "Execution bundle requires additional readiness evidence.",
  });
});

test("twin execution bundle readiness: requirement arrays are cloned per record", () => {
  const first = generateTwinExecutionBundleReadinessRecords(bundlePreviews);
  const second = generateTwinExecutionBundleReadinessRecords(bundlePreviews);

  first[0]?.requirementsMet.push("local_met_mutation");
  first[0]?.requirementsMissing.push("local_missing_mutation");

  assert.equal(second[0]?.requirementsMet.includes("local_met_mutation"), false);
  assert.equal(second[0]?.requirementsMissing.includes("local_missing_mutation"), false);
});

test("twin execution bundle readiness: governance flags are always false", () => {
  const readinessRecords = generateTwinExecutionBundleReadinessRecords(bundlePreviews);

  assert.equal(readinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(readinessRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    readinessRecords.every((entry) => entry.governanceState === "execution_bundle_readiness_preview_only"),
    true,
  );
});

test("twin execution bundle readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_BUNDLE_READINESS_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_BUNDLE_READINESS_COMPLETED",
  );
});
