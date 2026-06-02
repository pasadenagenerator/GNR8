import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionContractReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-contract-readiness";
import {
  generateTwinExecutionBundlePreviews,
  TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-bundle-preview";

function contractReadinessRecord(
  proposalId: string,
  proposalTitle: string,
  readinessState: string,
  readinessScore: number,
): TwinExecutionContractReadinessRecord {
  return {
    contractPreviewId: `execution_contract_preview_${proposalId}`,
    proposalId,
    proposalTitle,
    readinessState: readinessState as TwinExecutionContractReadinessRecord["readinessState"],
    readinessScore,
    requirementsMet: [],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_readiness_preview_only",
    summary: "Contract readiness preview only.",
  };
}

const contractReadinessRecords = [
  contractReadinessRecord("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow", "not_ready", 70),
  contractReadinessRecord(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "nearly_ready",
    90,
  ),
  contractReadinessRecord("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode", "ready", 100),
  contractReadinessRecord("proposal_candidate_unknown", "Unknown Proposal", "not_ready", 50),
];

test("twin execution bundle preview: deterministic generation", () => {
  const first = generateTwinExecutionBundlePreviews(contractReadinessRecords);
  const second = generateTwinExecutionBundlePreviews(contractReadinessRecords);

  assert.deepEqual(first, second);
});

test("twin execution bundle preview: all title rules and fallback are deterministic", () => {
  const previews = generateTwinExecutionBundlePreviews(contractReadinessRecords);
  const byTitle = new Map(previews.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    bundleId: "execution_bundle_preview_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    bundleState: "bundle_incomplete",
    readinessState: "not_ready",
    readinessScore: 70,
    includedComponents: [
      "proposal",
      "approval",
      "queue",
      "execution_package",
      "execution_contract",
    ],
    missingComponents: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_preview_only",
    summary:
      "Execution bundle is incomplete because required conversion evidence is unavailable.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    bundleId: "execution_bundle_preview_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    bundleState: "bundle_ready",
    readinessState: "nearly_ready",
    readinessScore: 90,
    includedComponents: [
      "proposal",
      "approval",
      "queue",
      "execution_package",
      "execution_contract",
    ],
    missingComponents: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_preview_only",
    summary:
      "Execution bundle structure is ready for future planning but remains governance blocked.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    bundleId: "execution_bundle_preview_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    bundleState: "bundle_ready",
    readinessState: "ready",
    readinessScore: 100,
    includedComponents: [
      "proposal",
      "approval",
      "queue",
      "execution_package",
      "execution_contract",
    ],
    missingComponents: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_preview_only",
    summary: "Execution bundle is complete within current governance validation boundaries.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    bundleId: "execution_bundle_preview_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    bundleState: "bundle_incomplete",
    readinessState: "not_ready",
    readinessScore: 0,
    includedComponents: [],
    missingComponents: ["bundle_requirements_unknown"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_bundle_preview_only",
    summary:
      "Execution bundle cannot be assembled because required bundle components are unknown.",
  });
});

test("twin execution bundle preview: bundle states and readiness propagate from contract readiness", () => {
  const previews = generateTwinExecutionBundlePreviews(contractReadinessRecords);

  assert.deepEqual(
    previews.map((entry) => entry.bundleState),
    ["bundle_incomplete", "bundle_ready", "bundle_ready", "bundle_incomplete"],
  );
  assert.deepEqual(
    previews.map((entry) => entry.readinessState),
    ["not_ready", "nearly_ready", "ready", "not_ready"],
  );
  assert.deepEqual(
    previews.map((entry) => entry.readinessScore),
    [70, 90, 100, 0],
  );
});

test("twin execution bundle preview: component arrays are cloned per record", () => {
  const first = generateTwinExecutionBundlePreviews(contractReadinessRecords);
  const second = generateTwinExecutionBundlePreviews(contractReadinessRecords);

  first[0]?.includedComponents.push("local_component_mutation");
  first[0]?.missingComponents.push("local_missing_mutation");

  assert.equal(second[0]?.includedComponents.includes("local_component_mutation"), false);
  assert.equal(second[0]?.missingComponents.includes("local_missing_mutation"), false);
});

test("twin execution bundle preview: governance flags are always false", () => {
  const previews = generateTwinExecutionBundlePreviews(contractReadinessRecords);

  assert.equal(previews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(previews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(previews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(previews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    previews.every((entry) => entry.governanceState === "execution_bundle_preview_only"),
    true,
  );
});

test("twin execution bundle preview: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_BUNDLE_PREVIEW_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_BUNDLE_PREVIEW_COMPLETED",
  );
});
