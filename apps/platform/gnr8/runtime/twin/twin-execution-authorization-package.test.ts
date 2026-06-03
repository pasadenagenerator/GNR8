import assert from "node:assert/strict";
import test from "node:test";

import type { TwinExecutionAuthorizationPreviewRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-preview";
import type { TwinExecutionAuthorizationReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-readiness";
import {
  generateTwinExecutionAuthorizationPackageRecords,
  TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-authorization-package";

function authorizationPreview(
  proposalId: string,
  proposalTitle: string,
  authorizationPreviewState: TwinExecutionAuthorizationPreviewRecord["authorizationPreviewState"],
  readinessState: string,
  readinessScore: number,
  authorizationType: string,
): TwinExecutionAuthorizationPreviewRecord {
  return {
    proposalId,
    proposalTitle,
    authorizationPreviewState,
    readinessState,
    readinessScore,
    authorizationType,
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

function authorizationReadiness(
  proposalId: string,
  proposalTitle: string,
  readinessState: TwinExecutionAuthorizationReadinessRecord["readinessState"],
  readinessScore: number,
): TwinExecutionAuthorizationReadinessRecord {
  return {
    proposalId,
    proposalTitle,
    readinessState,
    readinessScore,
    requirementsMet: [],
    requirementsMissing: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_readiness_preview_only",
    summary: "Execution authorization readiness preview only.",
  };
}

const authorizationPreviews = [
  authorizationPreview(
    "proposal_candidate_conversion_flow",
    "Improve Homepage Conversion Flow",
    "authorization_preview_incomplete",
    "incomplete",
    80,
    "conversion_authorization",
  ),
  authorizationPreview(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "authorization_preview_ready",
    "nearly_ready",
    95,
    "content_authorization",
  ),
  authorizationPreview(
    "proposal_candidate_validation_mode",
    "Maintain Read-Only Validation Mode",
    "authorization_preview_ready",
    "ready",
    100,
    "governance_validation_authorization",
  ),
  authorizationPreview(
    "proposal_candidate_unknown",
    "Unknown Proposal",
    "authorization_preview_ready",
    "not_ready",
    85,
    "generic_authorization",
  ),
];

const authorizationReadinessRecords = [
  authorizationReadiness(
    "proposal_candidate_conversion_flow",
    "Improve Homepage Conversion Flow",
    "not_ready",
    85,
  ),
  authorizationReadiness(
    "proposal_candidate_quality_messaging",
    "Improve Homepage Quality and Messaging",
    "nearly_ready",
    95,
  ),
  authorizationReadiness(
    "proposal_candidate_validation_mode",
    "Maintain Read-Only Validation Mode",
    "ready",
    100,
  ),
  authorizationReadiness("proposal_candidate_unknown", "Unknown Proposal", "not_ready", 85),
];

test("twin execution authorization package: deterministic generation", () => {
  const first = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );
  const second = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.deepEqual(first, second);
});

test("twin execution authorization package: Rule A maps incomplete previews", () => {
  const packageRecords = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.deepEqual(packageRecords[0], {
    proposalId: "proposal_candidate_conversion_flow",
    proposalTitle: "Improve Homepage Conversion Flow",
    packageState: "package_incomplete",
    readinessState: "not_ready",
    readinessScore: 85,
    authorizationType: "conversion_authorization",
    includedComponents: ["authorization_preview", "authorization_readiness"],
    missingComponents: ["conversion_baseline", "design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_package_preview_only",
    summary:
      "Execution authorization package is incomplete because required authorization evidence is unavailable.",
  });
});

test("twin execution authorization package: Rule B maps nearly ready readiness", () => {
  const packageRecords = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.deepEqual(packageRecords[1], {
    proposalId: "proposal_candidate_quality_messaging",
    proposalTitle: "Improve Homepage Quality and Messaging",
    packageState: "package_ready",
    readinessState: "nearly_ready",
    readinessScore: 95,
    authorizationType: "content_authorization",
    includedComponents: [
      "authorization_preview",
      "authorization_readiness",
      "authorization_requirements",
    ],
    missingComponents: ["design_evidence"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_package_preview_only",
    summary:
      "Execution authorization package is structurally ready for future authorization planning but remains governance blocked.",
  });
});

test("twin execution authorization package: Rule C maps ready readiness", () => {
  const packageRecords = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.deepEqual(packageRecords[2], {
    proposalId: "proposal_candidate_validation_mode",
    proposalTitle: "Maintain Read-Only Validation Mode",
    packageState: "package_ready",
    readinessState: "ready",
    readinessScore: 100,
    authorizationType: "governance_validation_authorization",
    includedComponents: [
      "authorization_preview",
      "authorization_readiness",
      "authorization_requirements",
    ],
    missingComponents: [],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_package_preview_only",
    summary:
      "Execution authorization package is complete within current governance validation boundaries.",
  });
});

test("twin execution authorization package: fallback maps unmatched readiness", () => {
  const packageRecords = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.deepEqual(packageRecords[3], {
    proposalId: "proposal_candidate_unknown",
    proposalTitle: "Unknown Proposal",
    packageState: "package_incomplete",
    readinessState: "unknown",
    readinessScore: 0,
    authorizationType: "generic_authorization",
    includedComponents: [],
    missingComponents: ["authorization_package_unavailable"],
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "execution_authorization_package_preview_only",
    summary: "Execution authorization package could not be generated.",
  });
});

test("twin execution authorization package: readiness and authorization type propagate", () => {
  const packageRecords = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.deepEqual(
    packageRecords.map((entry) => entry.readinessState),
    ["not_ready", "nearly_ready", "ready", "unknown"],
  );
  assert.deepEqual(
    packageRecords.map((entry) => entry.readinessScore),
    [85, 95, 100, 0],
  );
  assert.deepEqual(
    packageRecords.map((entry) => entry.authorizationType),
    [
      "conversion_authorization",
      "content_authorization",
      "governance_validation_authorization",
      "generic_authorization",
    ],
  );
});

test("twin execution authorization package: component arrays are cloned per record", () => {
  const first = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );
  const second = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  first[1]?.includedComponents.push("local_included_mutation");
  first[1]?.missingComponents.push("local_missing_mutation");

  assert.equal(second[1]?.includedComponents.includes("local_included_mutation"), false);
  assert.equal(second[1]?.missingComponents.includes("local_missing_mutation"), false);
});

test("twin execution authorization package: governance flags are always false", () => {
  const packageRecords = generateTwinExecutionAuthorizationPackageRecords(
    authorizationPreviews,
    authorizationReadinessRecords,
  );

  assert.equal(packageRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(packageRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(packageRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(packageRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    packageRecords.every(
      (entry) => entry.governanceState === "execution_authorization_package_preview_only",
    ),
    true,
  );
});

test("twin execution authorization package: diagnostics constants are stable", () => {
  assert.equal(
    TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.STARTED,
    "TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED",
  );
  assert.equal(
    TWIN_EXECUTION_AUTHORIZATION_PACKAGE_DIAGNOSTICS.COMPLETED,
    "TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED",
  );
});
