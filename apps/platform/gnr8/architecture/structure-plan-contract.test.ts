import assert from "node:assert/strict";
import test from "node:test";

import {
  STRUCTURE_PLAN_FORBIDDEN_FIELDS,
  STRUCTURE_PLAN_STATUSES,
  createBlockedStructurePlan,
  validateStructurePlan,
  type StructurePlan,
} from "./structure-plan-contract";

function validPlan(): StructurePlan {
  return {
    structurePlanId: "structure-plan:reconstruction-artifact-1:8F-1",
    structurePlanStatus: "valid",
    reconstructionPackageArtifactId: "reconstruction-artifact-1",
    candidateReviewPackageArtifactId: "review-artifact-1",
    candidateDiscoveryArtifactId: "discovery-artifact-1",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    contractVersion: "8F-1",
    createdAt: "2026-06-24T10:00:00.000Z",
    lineage: {
      reconstructionPackageArtifactId: "reconstruction-artifact-1",
      reconstructionPackageId: "reconstruction-package:review-artifact-1:8E-1",
      reconstructionPackageStatus: "valid",
      reconstructionPackageContractVersion: "8E-1",
      candidateReviewPackageArtifactId: "review-artifact-1",
      candidateDiscoveryArtifactId: "discovery-artifact-1",
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
      includedCandidateRefs: [
        {
          candidateId: "candidate:route:%2F",
          candidateType: "route",
          routePath: "/",
          decisionReviewEventId: "review-event-route-1",
          sourceCandidateRefs: ["discovery-artifact-1:candidate:route:%2F"],
          evidenceRefs: ["limited-dry-run-route-model:/"],
        },
        {
          candidateId: "candidate:navigation:primary",
          candidateType: "navigation",
          routePath: "/",
          decisionReviewEventId: "review-event-nav-1",
          sourceCandidateRefs: ["discovery-artifact-1:candidate:navigation:primary"],
          evidenceRefs: ["limited-dry-run-navigation-model:/"],
        },
        {
          candidateId: "candidate:section:hero",
          candidateType: "section",
          routePath: "/",
          decisionReviewEventId: "review-event-section-1",
          sourceCandidateRefs: ["discovery-artifact-1:candidate:section:hero"],
          evidenceRefs: ["limited-dry-run-section-model:/hero"],
        },
      ],
    },
    plannedRoutes: [
      {
        plannedRouteId: "planned-route:/",
        routePath: "/",
        sourceCandidateIds: ["candidate:route:%2F"],
        assignmentIds: ["assignment:route:%2F"],
        diagnostics: [],
      },
    ],
    plannedNavigation: [
      {
        plannedNavigationId: "planned-navigation:primary",
        sourceCandidateIds: ["candidate:navigation:primary"],
        plannedRouteIds: ["planned-route:/"],
        assignmentIds: ["assignment:navigation:primary"],
        diagnostics: [],
      },
    ],
    plannedSections: [
      {
        plannedSectionId: "planned-section:/hero",
        plannedRouteId: "planned-route:/",
        sectionOrder: 0,
        sourceCandidateIds: ["candidate:section:hero"],
        assignmentIds: ["assignment:section:hero"],
        diagnostics: [],
      },
    ],
    assignments: [
      {
        assignmentId: "assignment:route:%2F",
        candidateId: "candidate:route:%2F",
        candidateType: "route",
        targetKind: "route",
        plannedRouteId: "planned-route:/",
        sourceCandidateRefs: ["discovery-artifact-1:candidate:route:%2F"],
        evidenceRefs: ["limited-dry-run-route-model:/"],
        diagnostics: [],
      },
      {
        assignmentId: "assignment:navigation:primary",
        candidateId: "candidate:navigation:primary",
        candidateType: "navigation",
        targetKind: "navigation",
        plannedNavigationId: "planned-navigation:primary",
        sourceCandidateRefs: ["discovery-artifact-1:candidate:navigation:primary"],
        evidenceRefs: ["limited-dry-run-navigation-model:/"],
        diagnostics: [],
      },
      {
        assignmentId: "assignment:section:hero",
        candidateId: "candidate:section:hero",
        candidateType: "section",
        targetKind: "section",
        plannedSectionId: "planned-section:/hero",
        sourceCandidateRefs: ["discovery-artifact-1:candidate:section:hero"],
        evidenceRefs: ["limited-dry-run-section-model:/hero"],
        diagnostics: [],
      },
    ],
    limitations: [],
    diagnostics: ["assignmentCoverage=3/3"],
  };
}

test("valid structure plan organizes approved candidates without generated output", () => {
  const value = validPlan();
  assert.deepEqual(validateStructurePlan(value), { valid: true, errors: [], warnings: [] });
  assert.equal(value.plannedRoutes.length, 1);
  assert.equal(value.plannedNavigation.length, 1);
  assert.equal(value.plannedSections.length, 1);
  assert.equal(value.assignments.length, value.lineage.includedCandidateRefs.length);
});

test("blocked structure plan represents no eligible candidates", () => {
  const value = createBlockedStructurePlan({
    reconstructionPackageArtifactId: "reconstruction-artifact-empty",
    reconstructionPackageId: "reconstruction-package:review-artifact-empty:8E-1",
    reconstructionPackageContractVersion: "8E-1",
    candidateReviewPackageArtifactId: "review-artifact-empty",
    candidateDiscoveryArtifactId: "discovery-artifact-empty",
    siteVersionId: "site-version-empty",
    dryRunId: "dry-run-empty",
    createdAt: "2026-06-24T10:00:00.000Z",
    reason: "no_eligible_candidates",
  });
  assert.equal(value.structurePlanStatus, "blocked");
  assert.deepEqual(value.plannedRoutes, []);
  assert.deepEqual(value.plannedNavigation, []);
  assert.deepEqual(value.plannedSections, []);
  assert.deepEqual(value.assignments, []);
  assert.equal(validateStructurePlan(value).valid, true);
});

test("plan identities, planned entries, assignments, and eligible candidates must be unique", () => {
  const duplicateAssignment = structuredClone(validPlan()) as unknown as StructurePlan;
  duplicateAssignment.assignments[1] = {
    ...duplicateAssignment.assignments[1],
    candidateId: "candidate:route:%2F",
  };
  const assignmentResult = validateStructurePlan(duplicateAssignment);
  assert.equal(assignmentResult.valid, false);
  assert.match(assignmentResult.errors.join("\n"), /assignments.candidateId/);

  const duplicateRoute = structuredClone(validPlan()) as unknown as StructurePlan;
  duplicateRoute.plannedRoutes = [
    ...duplicateRoute.plannedRoutes,
    { ...duplicateRoute.plannedRoutes[0], plannedRouteId: "planned-route:/duplicate" },
  ];
  const routeResult = validateStructurePlan(duplicateRoute);
  assert.equal(routeResult.valid, false);
  assert.match(routeResult.errors.join("\n"), /plannedRoutes.routePath/);

  const duplicateEligibleCandidate = structuredClone(validPlan()) as unknown as StructurePlan;
  duplicateEligibleCandidate.lineage.includedCandidateRefs = [
    ...duplicateEligibleCandidate.lineage.includedCandidateRefs,
    {
      ...duplicateEligibleCandidate.lineage.includedCandidateRefs[0],
      decisionReviewEventId: "review-event-route-duplicate",
    },
  ];
  const lineageResult = validateStructurePlan(duplicateEligibleCandidate);
  assert.equal(lineageResult.valid, false);
  assert.match(lineageResult.errors.join("\n"), /lineage.includedCandidateRefs\[3\]\.candidateId must be unique/);
});

test("forbidden generated, AI, publishing, deployment, and execution fields are rejected recursively", () => {
  assert.deepEqual(STRUCTURE_PLAN_FORBIDDEN_FIELDS, [
    "reactOutput",
    "generatedBlocks",
    "generatedContent",
    "generatedComponents",
    "aiOutputs",
    "structureInstructions",
    "publishingArtifacts",
    "deploymentArtifacts",
    "executionArtifacts",
  ]);

  for (const field of STRUCTURE_PLAN_FORBIDDEN_FIELDS) {
    const value = structuredClone(validPlan()) as unknown as Record<string, unknown>;
    value.diagnostics = [{ nested: { [field]: {} } }];
    const result = validateStructurePlan(value);
    assert.equal(result.valid, false, field);
    assert.match(result.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});

test("stale status is allowed as historical metadata with warnings", () => {
  const value = {
    ...validPlan(),
    structurePlanStatus: "stale",
    lineage: {
      ...validPlan().lineage,
      reconstructionPackageStatus: "stale",
    },
  };
  const result = validateStructurePlan(value);
  assert.equal(result.valid, true);
  assert.match(result.warnings.join("\n"), /Stale Structure Plans/);
  assert.match(result.warnings.join("\n"), /Source Reconstruction Package is stale/);
});

test("invalid and forbidden statuses are rejected", () => {
  assert.deepEqual(STRUCTURE_PLAN_STATUSES, ["planned", "valid", "invalid", "blocked", "stale"]);
  for (const status of ["generated", "executed", "published", "deployed", "reconstructed"]) {
    const value = { ...validPlan(), structurePlanStatus: status };
    const result = validateStructurePlan(value);
    assert.equal(result.valid, false, status);
    assert.match(result.errors.join("\n"), /structurePlanStatus must be/);
  }
});

test("lineage must match the exact source Reconstruction Package artifact chain", () => {
  const value = {
    ...validPlan(),
    candidateReviewPackageArtifactId: "review-artifact-other",
  };
  const result = validateStructurePlan(value);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /lineage.candidateReviewPackageArtifactId must match/);
});

test("assignments may only reference included approved candidates and matching planned targets", () => {
  const foreignCandidate = structuredClone(validPlan()) as unknown as StructurePlan;
  foreignCandidate.assignments[0] = {
    ...foreignCandidate.assignments[0],
    candidateId: "candidate:route:foreign",
  };
  const foreignResult = validateStructurePlan(foreignCandidate);
  assert.equal(foreignResult.valid, false);
  assert.match(foreignResult.errors.join("\n"), /must reference an included approved candidate/);

  const wrongTarget = structuredClone(validPlan()) as unknown as StructurePlan;
  wrongTarget.assignments[1] = {
    ...wrongTarget.assignments[1],
    plannedNavigationId: "planned-navigation:missing",
  };
  const targetResult = validateStructurePlan(wrongTarget);
  assert.equal(targetResult.valid, false);
  assert.match(targetResult.errors.join("\n"), /plannedNavigationId must reference planned navigation/);
});
