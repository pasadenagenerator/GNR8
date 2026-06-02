import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionPackagePreview } from "@/gnr8/runtime/twin/twin-execution-package-preview";
import {
  generateTwinExecutionPackageReadinessRecords,
  TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-package-readiness";

function packagePreview(proposalId: string, proposalTitle: string): TwinExecutionPackagePreview {
  return {
    packageId: `execution_package_preview_${proposalId}`,
    proposalId,
    proposalTitle,
    packageState: "preview_ready",
    readinessState: "ready_for_future_planning",
    readinessScore: 100,
    includedArtifacts: ["planning_artifact"],
    includedPlans: ["planning_step"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_preview_only",
    summary: "Preview only.",
  };
}

const packagePreviews = [
  packagePreview("proposal_candidate_conversion_flow", "Improve Homepage Conversion Flow"),
  packagePreview("proposal_candidate_quality_messaging", "Improve Homepage Quality and Messaging"),
  packagePreview("proposal_candidate_validation_mode", "Maintain Read-Only Validation Mode"),
  packagePreview("proposal_candidate_unknown", "Unknown Proposal"),
];

test("twin execution package readiness: deterministic generation", () => {
  const first = generateTwinExecutionPackageReadinessRecords(packagePreviews);
  const second = generateTwinExecutionPackageReadinessRecords(packagePreviews);

  assert.deepEqual(first, second);
});

test("twin execution package readiness: all title rules and fallback are deterministic", () => {
  const records = generateTwinExecutionPackageReadinessRecords(packagePreviews);
  const byTitle = new Map(records.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow"), {
    packageId: "execution_package_preview_proposal_candidate_conversion_flow",
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    readinessState: "incomplete",
    readinessScore: 70,
    requirementsMet: ["execution_package_present", "planning_artifacts_present", "homepage_detected"],
    requirementsMissing: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_readiness_preview_only",
    summary:
      "Execution package is incomplete because additional conversion evidence and design evidence are required.",
  });

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging"), {
    packageId: "execution_package_preview_proposal_candidate_quality_messaging",
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    readinessState: "nearly_ready",
    readinessScore: 90,
    requirementsMet: [
      "execution_package_present",
      "planning_artifacts_present",
      "messaging_surface_identified",
      "homepage_detected",
    ],
    requirementsMissing: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_readiness_preview_only",
    summary: "Execution package is nearly ready but requires additional design evidence.",
  });

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode"), {
    packageId: "execution_package_preview_proposal_candidate_validation_mode",
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    readinessState: "ready",
    readinessScore: 100,
    requirementsMet: [
      "execution_package_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_readiness_preview_only",
    summary: "Execution package is fully prepared within current governance boundaries.",
  });

  assert.deepEqual(byTitle.get("Unknown Proposal"), {
    packageId: "execution_package_preview_proposal_candidate_unknown",
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    readinessState: "incomplete",
    readinessScore: 0,
    requirementsMet: [],
    requirementsMissing: ["package_requirements_unknown"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_package_readiness_preview_only",
    summary: "Execution package readiness requirements could not be determined.",
  });
});

test("twin execution package readiness: requirements arrays are cloned per record", () => {
  const first = generateTwinExecutionPackageReadinessRecords(packagePreviews);
  const second = generateTwinExecutionPackageReadinessRecords(packagePreviews);

  first[0]?.requirementsMet.push("local_test_mutation");

  assert.equal(second[0]?.requirementsMet.includes("local_test_mutation"), false);
});

test("twin execution package readiness: governance flags are always false", () => {
  const records = generateTwinExecutionPackageReadinessRecords(packagePreviews);

  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(records.every((entry) => entry.governanceState === "execution_package_readiness_preview_only"), true);
});

test("twin execution package readiness: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_PACKAGE_READINESS_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_PACKAGE_READINESS_COMPLETED",
  );
});
