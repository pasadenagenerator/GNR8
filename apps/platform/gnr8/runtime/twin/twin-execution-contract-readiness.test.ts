import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionContractPreview } from "@/gnr8/runtime/twin/twin-execution-contract-preview";
import {
  generateTwinExecutionContractReadinessRecords,
  TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-contract-readiness";

function contractPreview(proposalId: string, proposalTitle: string): TwinExecutionContractPreview {
  return {
    contractPreviewId: `execution_contract_preview_${proposalId}`,
    packageId: `execution_package_preview_${proposalId}`,
    proposalId,
    proposalTitle,
    contractPreviewState: "contract_preview_ready",
    readinessState: "ready",
    readinessScore: 100,
    contractType: "future_execution_contract",
    contractScope: ["future_scope"],
    requiredInputs: [],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_preview_only",
    summary: "Contract preview only.",
  };
}

const contractPreviews = [
  contractPreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow"),
  contractPreview("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging"),
  contractPreview("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode"),
  contractPreview("proposal_candidate_unknown", "Unknown Proposal"),
];

test("twin execution contract readiness: deterministic generation", () => {
  const first = generateTwinExecutionContractReadinessRecords(contractPreviews);
  const second = generateTwinExecutionContractReadinessRecords(contractPreviews);

  assert.deepEqual(first, second);
});

test("twin execution contract readiness: all title rules and fallback are deterministic", () => {
  const records = generateTwinExecutionContractReadinessRecords(contractPreviews);
  const byTitle = new Map(records.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "not_ready",
    readinessScore: 70,
    requirementsMet: [
      "contract_preview_present",
      "contract_scope_defined",
      "execution_package_available",
    ],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_readiness_preview_only",
    summary:
      "Execution contract readiness remains blocked until conversion baseline and design evidence are available.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 90,
    requirementsMet: [
      "contract_preview_present",
      "contract_scope_defined",
      "content_plan_available",
      "execution_package_available",
    ],
    requirementsMissing: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_readiness_preview_only",
    summary: "Execution contract readiness is nearly complete but requires design evidence.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
    requirementsMet: [
      "contract_preview_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_readiness_preview_only",
    summary: "Execution contract readiness is complete within current governance boundaries.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "not_ready",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: ["contract_requirements_unknown"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_readiness_preview_only",
    summary: "Execution contract readiness cannot be evaluated because contract requirements are unknown.",
  });
});

test("twin execution contract readiness: readiness scores are stable", () => {
  const records = generateTwinExecutionContractReadinessRecords(contractPreviews);

  assert.deepEqual(
    records.map((entry) => entry.readinessScore),
    [70, 90, 100, 0],
  );
  assert.deepEqual(
    records.map((entry) => entry.readinessState),
    ["not_ready", "nearly_ready", "ready", "not_ready"],
  );
});

test("twin execution contract readiness: requirements arrays are cloned per record", () => {
  const first = generateTwinExecutionContractReadinessRecords(contractPreviews);
  const second = generateTwinExecutionContractReadinessRecords(contractPreviews);

  first[0]?.requirementsMet.push("local_test_mutation");
  first[0]?.requirementsMissing.push("local_missing_mutation");

  assert.equal(second[0]?.requirementsMet.includes("local_test_mutation"), false);
  assert.equal(second[0]?.requirementsMissing.includes("local_missing_mutation"), false);
});

test("twin execution contract readiness: governance flags are always false", () => {
  const records = generateTwinExecutionContractReadinessRecords(contractPreviews);

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    records.every((entry) => entry.governanceState === "execution_contract_readiness_preview_only"),
    true,
  );
});

test("twin execution contract readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_CONTRACT_READINESS_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_CONTRACT_READINESS_COMPLETED",
  );
});
