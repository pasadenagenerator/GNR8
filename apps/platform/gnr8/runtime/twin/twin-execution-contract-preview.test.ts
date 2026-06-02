import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionPackageReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-package-readiness";
import {
  generateTwinExecutionContractPreviews,
  TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-contract-preview";

function packageReadinessRecord(input: {
  proposalId: string;
  proposalTitle: string;
  readinessState: string;
  readinessScore: number;
}): TwinExecutionPackageReadinessRecord {
  return {
    packageId: `execution_package_preview_${input.proposalId}`,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    readinessState: input.readinessState as TwinExecutionPackageReadinessRecord["readinessState"],
    readinessScore: input.readinessScore,
    requirementsMet: ["execution_package_present"],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_readiness_preview_only",
    summary: "Package readiness preview only.",
  };
}

const packageReadinessRecords = [
  packageReadinessRecord({
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "incomplete",
    readinessScore: 70,
  }),
  packageReadinessRecord({
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 90,
  }),
  packageReadinessRecord({
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
  }),
  packageReadinessRecord({
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "incomplete",
    readinessScore: 25,
  }),
];

test("twin execution contract preview: deterministic generation", () => {
  const first = generateTwinExecutionContractPreviews(packageReadinessRecords);
  const second = generateTwinExecutionContractPreviews(packageReadinessRecords);

  assert.deepEqual(first, second);
});

test("twin execution contract preview: all title rules and fallback are deterministic", () => {
  const previews = generateTwinExecutionContractPreviews(packageReadinessRecords);
  const byTitle = new Map(previews.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_conversion_flow",
    packageId: "execution_package_preview_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    contractPreviewState: "contract_preview_incomplete",
    readinessState: "incomplete",
    readinessScore: 70,
    contractType: "conversion_execution_contract",
    contractScope: ["homepage", "primary_conversion_path"],
    requiredInputs: ["conversion_baseline", "design_evidence"],
    blockedReasons: [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_preview_only",
    summary:
      "Execution contract preview is incomplete because conversion baseline and design evidence are missing.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_quality_messaging",
    packageId: "execution_package_preview_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    contractPreviewState: "contract_preview_ready",
    readinessState: "nearly_ready",
    readinessScore: 90,
    contractType: "content_execution_contract",
    contractScope: ["homepage_hero", "homepage_messaging"],
    requiredInputs: ["design_evidence"],
    blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_preview_only",
    summary:
      "Execution contract preview is structurally ready for future content planning, but remains governance blocked.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_validation_mode",
    packageId: "execution_package_preview_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    contractPreviewState: "contract_preview_ready",
    readinessState: "ready",
    readinessScore: 100,
    contractType: "governance_validation_contract",
    contractScope: ["runtime_governance"],
    requiredInputs: [],
    blockedReasons: ["governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_preview_only",
    summary:
      "Execution contract preview is ready for future governance validation planning while remaining non-executable.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    contractPreviewId: "execution_contract_preview_proposal_candidate_unknown",
    packageId: "execution_package_preview_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    contractPreviewState: "contract_preview_blocked",
    readinessState: "not_ready",
    readinessScore: 0,
    contractType: "future_execution_contract",
    contractScope: [],
    requiredInputs: ["execution_package_requirements"],
    blockedReasons: ["unknown_contract_requirements", "governance_execution_blocked"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_contract_preview_only",
    summary: "Execution contract preview cannot be assembled because contract requirements are unknown.",
  });
});

test("twin execution contract preview: known proposal readiness is propagated from package readiness", () => {
  const records = [
    packageReadinessRecord({
      proposalId: "proposal_candidate_quality_messaging",
      proposalTitle: "Improve Homepage Quality and Messaging",
      readinessState: "incomplete",
      readinessScore: 45,
    }),
  ];
  const [preview] = generateTwinExecutionContractPreviews(records);

  assert.equal(preview?.readinessState, "incomplete");
  assert.equal(preview?.readinessScore, 45);
});

test("twin execution contract preview: contract arrays are cloned per record", () => {
  const first = generateTwinExecutionContractPreviews(packageReadinessRecords);
  const second = generateTwinExecutionContractPreviews(packageReadinessRecords);

  first[0]?.contractScope.push("local_scope_mutation");
  first[0]?.requiredInputs.push("local_required_input_mutation");
  first[0]?.blockedReasons.push("local_blocked_reason_mutation");

  assert.equal(second[0]?.contractScope.includes("local_scope_mutation"), false);
  assert.equal(second[0]?.requiredInputs.includes("local_required_input_mutation"), false);
  assert.equal(second[0]?.blockedReasons.includes("local_blocked_reason_mutation"), false);
});

test("twin execution contract preview: contract states and types are stable", () => {
  const previews = generateTwinExecutionContractPreviews(packageReadinessRecords);

  assert.deepEqual(
    previews.map((entry) => entry.contractPreviewState),
    [
      "contract_preview_incomplete",
      "contract_preview_ready",
      "contract_preview_ready",
      "contract_preview_blocked",
    ],
  );
  assert.deepEqual(
    previews.map((entry) => entry.contractType),
    [
      "conversion_execution_contract",
      "content_execution_contract",
      "governance_validation_contract",
      "future_execution_contract",
    ],
  );
});

test("twin execution contract preview: governance flags are always false", () => {
  const previews = generateTwinExecutionContractPreviews(packageReadinessRecords);

  assert.equal(previews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(previews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(previews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(previews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(previews.every((entry) => entry.governanceState === "execution_contract_preview_only"), true);
});

test("twin execution contract preview: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_CONTRACT_PREVIEW_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_CONTRACT_PREVIEW_COMPLETED",
  );
});
