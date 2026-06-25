import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  STRUCTURE_PLAN_CONTRACT_VERSION,
  createBlockedStructurePlan,
  type StructurePlan,
} from "./structure-plan-contract";
import {
  STRUCTURE_PLAN_ARTIFACT_KIND,
  type StructurePlanArtifactRecord,
} from "./structure-plan-persistence";
import {
  loadLatestStructurePlanSurfaceProjection,
  projectStructurePlanSurface,
} from "./structure-plan-surface-projection";

const SITE_VERSION_ID = "site-version-structure-plan-surface";
const DRY_RUN_ID = "dry-run-structure-plan-surface";
const RECONSTRUCTION_ARTIFACT_ID = "reconstruction_package_structure_plan_surface";
const REVIEW_ARTIFACT_ID = "candidate_review_package_structure_plan_surface";
const DISCOVERY_ARTIFACT_ID = "candidate_discovery_result_structure_plan_surface";

function validPlan(): StructurePlan {
  return {
    structurePlanId: `structure-plan:${RECONSTRUCTION_ARTIFACT_ID}:${STRUCTURE_PLAN_CONTRACT_VERSION}`,
    structurePlanStatus: "valid",
    reconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
    candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    contractVersion: STRUCTURE_PLAN_CONTRACT_VERSION,
    createdAt: "2026-06-25T09:00:00.000Z",
    lineage: {
      reconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
      reconstructionPackageId: "reconstruction-package:surface",
      reconstructionPackageStatus: "valid",
      reconstructionPackageContractVersion: "8E-1",
      candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID,
      candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      includedCandidateRefs: [
        {
          candidateId: "candidate:route:/",
          candidateType: "route",
          routePath: "/",
          decisionReviewEventId: "review-route",
          sourceCandidateRefs: ["source:route"],
          evidenceRefs: ["evidence:route"],
        },
        {
          candidateId: "candidate:navigation:primary",
          candidateType: "navigation",
          routePath: "/",
          decisionReviewEventId: "review-navigation",
          sourceCandidateRefs: ["source:navigation"],
          evidenceRefs: ["evidence:navigation"],
        },
        {
          candidateId: "candidate:section:hero",
          candidateType: "section",
          routePath: "/",
          decisionReviewEventId: "review-section",
          sourceCandidateRefs: ["source:section"],
          evidenceRefs: ["evidence:section"],
        },
      ],
    },
    plannedRoutes: [{
      plannedRouteId: "planned-route:/",
      routePath: "/",
      sourceCandidateIds: ["candidate:route:/"],
      assignmentIds: ["assignment:route:/"],
      diagnostics: ["ROUTE_PLANNED"],
    }],
    plannedNavigation: [{
      plannedNavigationId: "planned-navigation:primary",
      sourceCandidateIds: ["candidate:navigation:primary"],
      plannedRouteIds: ["planned-route:/"],
      assignmentIds: ["assignment:navigation:primary"],
      diagnostics: ["NAVIGATION_PLANNED"],
    }],
    plannedSections: [{
      plannedSectionId: "planned-section:hero",
      plannedRouteId: "planned-route:/",
      sectionOrder: 0,
      sourceCandidateIds: ["candidate:section:hero"],
      assignmentIds: ["assignment:section:hero"],
      diagnostics: ["SECTION_PLANNED"],
    }],
    assignments: [
      {
        assignmentId: "assignment:route:/",
        candidateId: "candidate:route:/",
        candidateType: "route",
        targetKind: "route",
        plannedRouteId: "planned-route:/",
        sourceCandidateRefs: ["source:route"],
        evidenceRefs: ["evidence:route"],
        diagnostics: ["ASSIGNED_ROUTE"],
      },
      {
        assignmentId: "assignment:navigation:primary",
        candidateId: "candidate:navigation:primary",
        candidateType: "navigation",
        targetKind: "navigation",
        plannedNavigationId: "planned-navigation:primary",
        sourceCandidateRefs: ["source:navigation"],
        evidenceRefs: ["evidence:navigation"],
        diagnostics: ["ASSIGNED_NAVIGATION"],
      },
      {
        assignmentId: "assignment:section:hero",
        candidateId: "candidate:section:hero",
        candidateType: "section",
        targetKind: "section",
        plannedSectionId: "planned-section:hero",
        sourceCandidateRefs: ["source:section"],
        evidenceRefs: ["evidence:section"],
        diagnostics: ["ASSIGNED_SECTION"],
      },
    ],
    limitations: [],
    diagnostics: ["STRUCTURE_PLAN_VALID"],
  };
}

function artifact(plan: StructurePlan = validPlan(), persistedAt = "2026-06-25T09:05:00.000Z"): StructurePlanArtifactRecord {
  return {
    kind: STRUCTURE_PLAN_ARTIFACT_KIND,
    artifactKind: STRUCTURE_PLAN_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: "structure_plan_surface",
    structurePlanId: plan.structurePlanId,
    reconstructionPackageArtifactId: plan.reconstructionPackageArtifactId,
    candidateReviewPackageArtifactId: plan.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: plan.candidateDiscoveryArtifactId,
    siteVersionId: plan.siteVersionId,
    dryRunId: plan.dryRunId,
    status: plan.structurePlanStatus === "blocked" ? "blocked" : "valid",
    plannedRouteCount: plan.plannedRoutes.length,
    plannedNavigationCount: plan.plannedNavigation.length,
    plannedSectionCount: plan.plannedSections.length,
    assignmentCount: plan.assignments.length,
    blockedCandidateCount: plan.structurePlanStatus === "blocked" ? plan.lineage.includedCandidateRefs.length : 0,
    contractVersion: plan.contractVersion,
    createdAt: plan.createdAt,
    persistedAt,
    plan,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["STRUCTURE_PLAN_VALIDATION_PASSED"],
  };
}

test("Structure Plan projection exposes artifact metadata, lineage, counts, and grouped plan rows", () => {
  const projection = projectStructurePlanSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(),
    latestReconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
  });

  assert.equal(projection.state, "valid");
  assert.deepEqual(projection.attentionStates, []);
  assert.equal(projection.artifact?.artifactRef, "structure_plan_surface");
  assert.equal(projection.artifact?.structurePlanId, `structure-plan:${RECONSTRUCTION_ARTIFACT_ID}:${STRUCTURE_PLAN_CONTRACT_VERSION}`);
  assert.equal(projection.lineage.reconstructionPackageArtifactId, RECONSTRUCTION_ARTIFACT_ID);
  assert.deepEqual(projection.summary, {
    plannedRoutes: 1,
    plannedNavigation: 1,
    plannedSections: 1,
    assignments: 3,
    blockedCandidates: 0,
  });
  assert.deepEqual(projection.plannedRoutes.map((route) => [route.routePath, route.sourceCandidateIds[0], route.assignmentIds[0]]), [
    ["/", "candidate:route:/", "assignment:route:/"],
  ]);
  assert.deepEqual(projection.plannedNavigation.map((navigation) => navigation.routeAssociations), [["/"]]);
  assert.deepEqual(projection.plannedSections.map((section) => [section.routeAssociation, section.sectionOrder]), [["/", 0]]);
  assert.deepEqual(projection.assignments.map((assignment) => [assignment.assignmentId, assignment.targetKind, assignment.targetId]), [
    ["assignment:route:/", "route", "planned-route:/"],
    ["assignment:navigation:primary", "navigation", "planned-navigation:primary"],
    ["assignment:section:hero", "section", "planned-section:hero"],
  ]);
});

test("Structure Plan projection reports missing, blocked, stale, and attention states", () => {
  assert.equal(projectStructurePlanSurface({ siteVersionId: SITE_VERSION_ID, artifact: null }).state, "missing");

  const blockedPlan = createBlockedStructurePlan({
    reconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
    reconstructionPackageId: "reconstruction-package:surface",
    reconstructionPackageContractVersion: "8E-1",
    candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-25T09:00:00.000Z",
    reason: "no_eligible_candidates",
  });
  const blocked = projectStructurePlanSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(blockedPlan),
    latestReconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
  });
  assert.equal(blocked.state, "blocked");
  assert.deepEqual(blocked.attentionStates, ["limitations_present", "no_navigation", "no_sections"]);

  const stale = projectStructurePlanSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(),
    latestReconstructionPackageArtifactId: "reconstruction_package_newer",
  });
  assert.equal(stale.state, "stale");
  assert.equal(stale.lineage.reconstructionPackageStale, true);

  const noNavigation = {
    ...validPlan(),
    plannedNavigation: [],
    assignments: validPlan().assignments.filter((assignment) => assignment.targetKind !== "navigation"),
    lineage: {
      ...validPlan().lineage,
      includedCandidateRefs: validPlan().lineage.includedCandidateRefs.filter((candidate) => candidate.candidateType !== "navigation"),
    },
    limitations: ["Navigation candidates were not available."],
  } satisfies StructurePlan;
  const attention = projectStructurePlanSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(noNavigation),
    latestReconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
  });
  assert.equal(attention.state, "valid");
  assert.deepEqual(attention.attentionStates, ["limitations_present", "no_navigation"]);

  const noSections = {
    ...validPlan(),
    plannedSections: [],
    assignments: validPlan().assignments.filter((assignment) => assignment.targetKind !== "section"),
    lineage: {
      ...validPlan().lineage,
      includedCandidateRefs: validPlan().lineage.includedCandidateRefs.filter((candidate) => candidate.candidateType !== "section"),
    },
  } satisfies StructurePlan;
  assert.deepEqual(projectStructurePlanSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(noSections),
    latestReconstructionPackageArtifactId: RECONSTRUCTION_ARTIFACT_ID,
  }).attentionStates, ["no_sections"]);
});

test("latest Structure Plan surface loader reads the latest persisted artifact without mutation", async () => {
  const latest = artifact(validPlan(), "2026-06-25T09:10:00.000Z");
  const summary = {
    kind: "runtime_import_provenance_summary_v1",
    structurePlanArtifacts: [artifact(validPlan(), "2026-06-25T09:05:00.000Z"), latest],
    latestStructurePlanArtifact: latest,
    latestReconstructionPackageArtifact: {
      kind: "reconstruction_package",
      artifactId: RECONSTRUCTION_ARTIFACT_ID,
    },
  } as unknown as RuntimeImportProvenanceSummary;
  const projection = await loadLatestStructurePlanSurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => ({ importProvenanceSummary: summary }),
    },
  });

  assert.equal(projection.artifact?.persistedAt, "2026-06-25T09:10:00.000Z");
  assert.equal(projection.lineage.latestReconstructionPackageArtifactId, RECONSTRUCTION_ARTIFACT_ID);
  assert.equal(projection.state, "valid");
});
