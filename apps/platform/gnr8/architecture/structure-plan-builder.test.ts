import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
  type ReconstructionPackage,
  type ReconstructionPackageCandidateRef,
} from "./reconstruction-package-contract";
import { buildStructurePlan } from "./structure-plan-builder";
import {
  STRUCTURE_PLAN_FORBIDDEN_FIELDS,
  validateStructurePlan,
} from "./structure-plan-contract";

const RECONSTRUCTION_PACKAGE_ARTIFACT_ID = "reconstruction_package_fixture_1";

function candidateRef(
  candidateId: string,
  candidateType: ReconstructionPackageCandidateRef["candidateType"],
  routePath: string | undefined,
  decisionReviewEventId: string,
): ReconstructionPackageCandidateRef {
  return {
    candidateId,
    candidateType,
    ...(routePath ? { routePath } : {}),
    decisionReviewEventId,
    decision: "approved",
    confidence: { level: "HIGH", reasons: [`source_confidence:${candidateId}`] },
    sourceCandidateRefs: [`candidate-discovery:candidate_discovery_fixture:${candidateId}`],
    evidenceRefs: [`evidence:${candidateId}`],
  };
}

function reconstructionPackage(
  approvedCandidateRefs: readonly ReconstructionPackageCandidateRef[] = [
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
  ],
  overrides: Partial<ReconstructionPackage> = {},
): ReconstructionPackage {
  const reconstructionPackageStatus = approvedCandidateRefs.length === 0 ? "blocked" : "valid";
  return {
    reconstructionPackageId: `reconstruction-package:candidate_review_package_fixture:${RECONSTRUCTION_PACKAGE_CONTRACT_VERSION}`,
    reconstructionPackageStatus,
    candidateReviewPackageArtifactId: "candidate_review_package_fixture",
    candidateDiscoveryArtifactId: "candidate_discovery_fixture",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    contractVersion: RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
    createdAt: "2026-06-24T10:00:00.000Z",
    lineage: {
      candidateReviewPackageArtifactId: "candidate_review_package_fixture",
      candidateReviewPackageId: "candidate-review-package-fixture",
      candidateDiscoveryArtifactId: "candidate_discovery_fixture",
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
    },
    approvedCandidateRefs,
    eligibilitySummary: {
      approvedCount: approvedCandidateRefs.length,
      rejectedCount: 0,
      deferredCount: 0,
      unreviewedCount: 0,
      includedCount: approvedCandidateRefs.length,
      excludedCount: 0,
    },
    limitations: ["source limitation"],
    diagnostics: [],
    ...overrides,
  };
}

function build(
  approvedCandidateRefs?: readonly ReconstructionPackageCandidateRef[],
  latestReconstructionPackageArtifactId = RECONSTRUCTION_PACKAGE_ARTIFACT_ID,
  overrides: Partial<ReconstructionPackage> = {},
) {
  return buildStructurePlan({
    reconstructionPackage: reconstructionPackage(approvedCandidateRefs, overrides),
    reconstructionPackageArtifactId: RECONSTRUCTION_PACKAGE_ARTIFACT_ID,
    latestReconstructionPackageArtifactId,
  });
}

test("builds route plan from approved route candidate", () => {
  const result = build();

  assert.equal(result.structurePlanStatus, "valid");
  assert.equal(result.structurePlanId, "structure-plan:reconstruction_package_fixture_1:8F-1");
  assert.deepEqual(result.plannedRoutes.map((route) => route.routePath), ["/"]);
  assert.deepEqual(result.plannedRoutes[0].sourceCandidateIds, ["candidate:route:/"]);
  assert.match(result.plannedRoutes[0].plannedRouteId, /^planned-route:structure-plan:reconstruction_package_fixture_1:8F-1:/);
});

test("builds navigation plan with explicit route", () => {
  const result = build([
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
    candidateRef("candidate:navigation:primary", "navigation", "/", "review-navigation-approved"),
  ]);

  assert.equal(result.structurePlanStatus, "valid");
  assert.equal(result.plannedNavigation.length, 1);
  assert.deepEqual(result.plannedNavigation[0].sourceCandidateIds, ["candidate:navigation:primary"]);
  assert.deepEqual(result.plannedNavigation[0].plannedRouteIds, [result.plannedRoutes[0].plannedRouteId]);
  assert.match(result.plannedNavigation[0].diagnostics.join("\n"), /ROUTE_ASSOCIATION:explicit:\//);
});

test("builds section plan with explicit route", () => {
  const result = build([
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
    candidateRef("candidate:section:hero", "section", "/", "review-section-approved"),
  ]);

  assert.equal(result.structurePlanStatus, "valid");
  assert.equal(result.plannedSections.length, 1);
  assert.equal(result.plannedSections[0].plannedRouteId, result.plannedRoutes[0].plannedRouteId);
  assert.equal(result.plannedSections[0].sectionOrder, 0);
  assert.deepEqual(result.plannedSections[0].sourceCandidateIds, ["candidate:section:hero"]);
});

test("creates assignments for every successfully planned included approved candidate", () => {
  const result = build([
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
    candidateRef("candidate:navigation:primary", "navigation", "/", "review-navigation-approved"),
    candidateRef("candidate:section:hero", "section", "/", "review-section-approved"),
  ]);

  assert.equal(result.structurePlanStatus, "valid");
  assert.deepEqual(result.assignments.map((assignment) => assignment.targetKind), ["route", "navigation", "section"]);
  assert.deepEqual(result.assignments.map((assignment) => assignment.candidateId), [
    "candidate:route:/",
    "candidate:navigation:primary",
    "candidate:section:hero",
  ]);
  assert.deepEqual(result.plannedRoutes[0].assignmentIds, [result.assignments[0].assignmentId]);
  assert.deepEqual(result.plannedNavigation[0].assignmentIds, [result.assignments[1].assignmentId]);
  assert.deepEqual(result.plannedSections[0].assignmentIds, [result.assignments[2].assignmentId]);
});

test("blocked when no included candidates", () => {
  const result = build([]);

  assert.equal(result.structurePlanStatus, "blocked");
  assert.deepEqual(result.lineage.includedCandidateRefs, []);
  assert.deepEqual(result.plannedRoutes, []);
  assert.deepEqual(result.plannedNavigation, []);
  assert.deepEqual(result.plannedSections, []);
  assert.deepEqual(result.assignments, []);
  assert.match(result.limitations.join("\n"), /NO_INCLUDED_CANDIDATES/);
  assert.equal(validateStructurePlan(result).valid, true);
});

test("stale when reconstruction artifact is not latest", () => {
  const result = build(undefined, "reconstruction_package_newer");

  assert.equal(result.structurePlanStatus, "stale");
  assert.match(result.diagnostics.join("\n"), /STALE_RECONSTRUCTION_PACKAGE_CHECK:stale/);
  assert.equal(validateStructurePlan(result).valid, true);
});

test("blocks ambiguous or missing route association deterministically", () => {
  const ambiguous = build([
    candidateRef("candidate:route:/a", "route", "/a", "review-route-a-approved"),
    candidateRef("candidate:route:/b", "route", "/b", "review-route-b-approved"),
    candidateRef("candidate:navigation:primary", "navigation", undefined, "review-navigation-approved"),
  ]);
  assert.equal(ambiguous.structurePlanStatus, "blocked");
  assert.deepEqual(ambiguous.plannedNavigation, []);
  assert.deepEqual(ambiguous.assignments, []);
  assert.match(ambiguous.diagnostics.join("\n"), /candidate:navigation:primary=AMBIGUOUS_ROUTE_ASSOCIATION/);
  assert.match(ambiguous.diagnostics.join("\n"), /normal_assignments_suppressed/);
  assert.equal(validateStructurePlan(ambiguous).valid, true);

  const missing = build([
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
    candidateRef("candidate:section:missing", "section", "/missing", "review-section-approved"),
  ]);
  assert.equal(missing.structurePlanStatus, "blocked");
  assert.deepEqual(missing.plannedSections, []);
  assert.match(missing.diagnostics.join("\n"), /candidate:section:missing=MISSING_ROUTE_ASSOCIATION:\/missing/);
  assert.equal(validateStructurePlan(missing).valid, true);
});

test("uses deterministic identity and ordering", () => {
  const result = build([
    candidateRef("candidate:section:b", "section", "/b", "review-section-b-approved"),
    candidateRef("candidate:route:/b", "route", "/b", "review-route-b-approved"),
    candidateRef("candidate:navigation:b", "navigation", "/b", "review-navigation-b-approved"),
    candidateRef("candidate:route:/a", "route", "/a", "review-route-a-approved"),
    candidateRef("candidate:navigation:a", "navigation", "/a", "review-navigation-a-approved"),
    candidateRef("candidate:section:a", "section", "/a", "review-section-a-approved"),
  ]);
  const repeat = build([
    candidateRef("candidate:section:b", "section", "/b", "review-section-b-approved"),
    candidateRef("candidate:route:/b", "route", "/b", "review-route-b-approved"),
    candidateRef("candidate:navigation:b", "navigation", "/b", "review-navigation-b-approved"),
    candidateRef("candidate:route:/a", "route", "/a", "review-route-a-approved"),
    candidateRef("candidate:navigation:a", "navigation", "/a", "review-navigation-a-approved"),
    candidateRef("candidate:section:a", "section", "/a", "review-section-a-approved"),
  ]);

  assert.deepEqual(repeat, result);
  assert.deepEqual(result.plannedRoutes.map((route) => route.routePath), ["/a", "/b"]);
  assert.deepEqual(result.plannedNavigation.map((navigation) => navigation.sourceCandidateIds[0]), [
    "candidate:navigation:a",
    "candidate:navigation:b",
  ]);
  assert.deepEqual(result.plannedSections.map((section) => section.sourceCandidateIds[0]), [
    "candidate:section:a",
    "candidate:section:b",
  ]);
  assert.deepEqual(result.assignments.map((assignment) => assignment.candidateId), [
    "candidate:route:/a",
    "candidate:route:/b",
    "candidate:navigation:a",
    "candidate:navigation:b",
    "candidate:section:a",
    "candidate:section:b",
  ]);
});

test("forbidden fields remain absent from builder output", () => {
  const serialized = JSON.stringify(build([
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
    candidateRef("candidate:navigation:primary", "navigation", "/", "review-navigation-approved"),
    candidateRef("candidate:section:hero", "section", "/", "review-section-approved"),
  ]));

  for (const field of STRUCTURE_PLAN_FORBIDDEN_FIELDS) {
    assert.equal(serialized.includes(`"${field}"`), false, field);
  }
});

test("validation passes for valid output and diagnostics include counts", () => {
  const result = build([
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
    candidateRef("candidate:navigation:primary", "navigation", "/", "review-navigation-approved"),
    candidateRef("candidate:section:hero", "section", "/", "review-section-approved"),
  ]);

  assert.deepEqual(validateStructurePlan(result), { valid: true, errors: [], warnings: [] });
  assert.deepEqual(result.limitations, ["reconstruction-package:source limitation"]);
  assert.deepEqual(result.diagnostics.filter((diagnostic) => diagnostic.includes("COUNT")), [
    "INCLUDED_APPROVED_CANDIDATE_COUNT:3",
    "PLANNED_ROUTE_COUNT:1",
    "PLANNED_NAVIGATION_COUNT:1",
    "PLANNED_SECTION_COUNT:1",
    "ASSIGNMENT_COUNT:3",
    "BLOCKED_CANDIDATE_COUNT:0",
  ]);
  assert.match(result.diagnostics.join("\n"), /STRUCTURE_PLAN_VALIDATION:valid:errors=0:warnings=0/);
});
