import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS,
  RECONSTRUCTION_PACKAGE_STATUSES,
  createBlockedReconstructionPackage,
  validateReconstructionPackage,
  type ReconstructionPackage,
} from "./reconstruction-package-contract";

function validPackage(): ReconstructionPackage {
  return {
    reconstructionPackageId: "reconstruction-package:review-artifact-1:8E-1",
    reconstructionPackageStatus: "valid",
    candidateReviewPackageArtifactId: "review-artifact-1",
    candidateDiscoveryArtifactId: "discovery-artifact-1",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    contractVersion: "8E-1",
    createdAt: "2026-06-22T10:00:00.000Z",
    lineage: {
      candidateReviewPackageArtifactId: "review-artifact-1",
      candidateReviewPackageId: "review-package-1",
      candidateDiscoveryArtifactId: "discovery-artifact-1",
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
    },
    approvedCandidateRefs: [
      {
        candidateId: "candidate:route:%2F",
        candidateType: "route",
        routePath: "/",
        decisionReviewEventId: "review-event-approved-1",
        decision: "approved",
        confidence: { level: "HIGH", reasons: ["Exact route evidence is available."] },
        sourceCandidateRefs: ["discovery-artifact-1:candidate:route:%2F"],
        evidenceRefs: ["limited-dry-run-route-model:/"],
      },
    ],
    eligibilitySummary: {
      approvedCount: 1,
      rejectedCount: 1,
      deferredCount: 1,
      unreviewedCount: 1,
      includedCount: 1,
      excludedCount: 3,
    },
    limitations: [],
    diagnostics: [],
  };
}

test("valid package includes only approved candidate refs with exact lineage", () => {
  const value = validPackage();
  assert.deepEqual(validateReconstructionPackage(value), { valid: true, errors: [], warnings: [] });
  assert.equal(value.approvedCandidateRefs[0].decision, "approved");
  assert.equal(value.approvedCandidateRefs[0].decisionReviewEventId, "review-event-approved-1");
});

test("blocked package represents no approved candidates", () => {
  const value = createBlockedReconstructionPackage({
    candidateReviewPackageArtifactId: "review-artifact-empty",
    candidateReviewPackageId: "review-package-empty",
    candidateDiscoveryArtifactId: "discovery-artifact-empty",
    siteVersionId: "site-version-empty",
    dryRunId: "dry-run-empty",
    createdAt: "2026-06-22T10:00:00.000Z",
    rejectedCount: 2,
    deferredCount: 1,
    unreviewedCount: 3,
  });
  assert.equal(value.reconstructionPackageStatus, "blocked");
  assert.deepEqual(value.approvedCandidateRefs, []);
  assert.deepEqual(value.eligibilitySummary, {
    approvedCount: 0,
    rejectedCount: 2,
    deferredCount: 1,
    unreviewedCount: 3,
    includedCount: 0,
    excludedCount: 6,
  });
  assert.equal(validateReconstructionPackage(value).valid, true);
});

test("rejected, deferred, and unreviewed candidates remain excluded counts only", () => {
  const value = validPackage();
  assert.equal(value.approvedCandidateRefs.length, 1);
  assert.equal(value.eligibilitySummary.excludedCount, 3);
  assert.equal("rejectedCandidateRefs" in value, false);
  assert.equal("deferredCandidateRefs" in value, false);
  assert.equal("unreviewedCandidateRefs" in value, false);
});

test("invalid status values are rejected", () => {
  assert.deepEqual(RECONSTRUCTION_PACKAGE_STATUSES, ["planned", "valid", "invalid", "blocked", "stale"]);
  for (const status of ["generated", "executed", "reconstructed", "published", "deployed"]) {
    const value = { ...validPackage(), reconstructionPackageStatus: status };
    const result = validateReconstructionPackage(value);
    assert.equal(result.valid, false, status);
    assert.match(result.errors.join("\n"), /reconstructionPackageStatus must be/);
  }
});

test("only approved decisions can be included", () => {
  for (const decision of ["rejected", "deferred", "unreviewed"]) {
    const value = structuredClone(validPackage()) as unknown as Record<string, any>;
    value.approvedCandidateRefs[0].decision = decision;
    const result = validateReconstructionPackage(value);
    assert.equal(result.valid, false, decision);
    assert.match(result.errors.join("\n"), /decision must be approved/);
  }
});

test("forbidden generation, planning, execution, and publishing fields are rejected recursively", () => {
  assert.deepEqual(RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS, [
    "reactOutput",
    "generatedOutputs",
    "generatedBlocks",
    "generatedContent",
    "designTokens",
    "aiOutputs",
    "structurePlan",
    "reconstructionPlan",
    "publishingArtifacts",
    "deploymentArtifacts",
    "executionArtifacts",
  ]);
  for (const field of RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS) {
    const value = structuredClone(validPackage()) as unknown as Record<string, unknown>;
    value.diagnostics = [{ nested: { [field]: {} } }];
    const result = validateReconstructionPackage(value);
    assert.equal(result.valid, false, field);
    assert.match(result.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});

test("eligibility counts must match approved refs and exclusions", () => {
  for (const eligibilitySummary of [
    { ...validPackage().eligibilitySummary, approvedCount: 2 },
    { ...validPackage().eligibilitySummary, includedCount: 2 },
    { ...validPackage().eligibilitySummary, excludedCount: 4 },
  ]) {
    const result = validateReconstructionPackage({ ...validPackage(), eligibilitySummary });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /eligibilitySummary/);
  }
});

test("package identity is tied to the exact Review artifact and contract version", () => {
  const result = validateReconstructionPackage({
    ...validPackage(),
    reconstructionPackageId: "caller-selected-id",
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must be derived from the exact Review Package artifact/);
});

test("stale status is allowed but explicitly not eligible for new work", () => {
  const result = validateReconstructionPackage({
    ...validPackage(),
    reconstructionPackageStatus: "stale",
  });
  assert.equal(result.valid, true);
  assert.match(result.warnings.join("\n"), /not eligible for new work/);
});
