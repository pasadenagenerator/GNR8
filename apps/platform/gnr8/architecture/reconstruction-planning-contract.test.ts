import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_CANDIDATE_TYPES,
  RECONSTRUCTION_PLANNING_CONFIDENCE_LEVELS,
  RECONSTRUCTION_PLANNING_REVIEW_STATUSES,
  createReconstructionPlanningPackage,
  evaluateReconstructionPlanningEligibility,
  type ExistingReconstructionReadinessProjection,
  type ReconstructionCandidate,
} from "./reconstruction-planning-contract";

const minimumReadyProjection: ExistingReconstructionReadinessProjection = {
  readinessLevel: "MINIMUM_READY",
  blockers: [],
  requiredFieldsPresent: [
    "evidenceArtifactStatus",
    "sourceUrl",
    "routeIdentity",
    "renderedDomRef",
    "renderedHtmlHash",
    "renderStatus",
    "routeCaptureStatus",
    "noBlockerFidelityLimitations",
  ],
  requiredFieldsMissing: [],
  optionalEvidencePresent: ["rawHtmlRef", "screenshots"],
  optionalEvidenceMissing: ["layout", "network"],
  readinessExplanation:
    "MINIMUM_READY reached because minimum required evidence is present and no blocking fidelity limitation remains.",
};

test("reconstruction planning package creation preserves metadata-only shape", () => {
  const candidate: ReconstructionCandidate = {
    candidateId: "candidate-home-page",
    candidateType: "page",
    sourceRoute: "/",
    sourceEvidenceRefs: ["rendered-dom-ref"],
    confidence: "MEDIUM",
    limitations: ["Layout evidence is not complete."],
    notes: ["Planning candidate only; no reconstruction output exists."],
  };
  const planningPackage = createReconstructionPlanningPackage({
    packageId: "planning-package-1",
    siteVersionId: "site-version-1",
    routeScope: {
      scopeType: "single_route",
      routes: ["/"],
    },
    readinessProjection: minimumReadyProjection,
    limitations: ["Network inventory is incomplete."],
    evidenceSummary: {
      sourceEvidenceRefs: ["rendered-dom-ref", "screenshot-ref"],
      notes: ["Evidence summary is metadata only."],
    },
    reconstructionCandidates: [candidate],
    confidenceLevel: "MEDIUM",
  });

  assert.equal(planningPackage.kind, "reconstruction_planning_package_v1");
  assert.equal(planningPackage.contractVersion, "7F-11");
  assert.equal(planningPackage.packageId, "planning-package-1");
  assert.equal(planningPackage.siteVersionId, "site-version-1");
  assert.equal(planningPackage.readinessLevel, "MINIMUM_READY");
  assert.equal(planningPackage.reviewStatus, "pending");
  assert.deepEqual(planningPackage.reconstructionCandidates, [candidate]);
  assert.deepEqual(planningPackage.evidenceSummary.requiredFieldsPresent, minimumReadyProjection.requiredFieldsPresent);
  assert.deepEqual(planningPackage.evidenceSummary.optionalEvidencePresent, minimumReadyProjection.optionalEvidencePresent);
});

test("reconstruction planning eligibility follows existing readiness levels only", () => {
  const notReady = evaluateReconstructionPlanningEligibility({
    readinessLevel: "NOT_READY",
    blockers: [
      {
        id: "missing_rendered_dom",
        title: "Rendered DOM missing",
        description: "Rendered DOM evidence is required.",
        severity: "blocker",
        remediationHint: "Persist rendered DOM evidence before planning.",
      },
    ],
  });
  const minimumReady = evaluateReconstructionPlanningEligibility({ readinessLevel: "MINIMUM_READY", blockers: [] });
  const recommended = evaluateReconstructionPlanningEligibility({ readinessLevel: "RECOMMENDED", blockers: [] });
  const highConfidence = evaluateReconstructionPlanningEligibility({ readinessLevel: "HIGH_CONFIDENCE", blockers: [] });

  assert.equal(notReady.eligible, false);
  assert.equal(notReady.status, "not_eligible");
  assert.equal(notReady.readinessLevel, "NOT_READY");
  assert.equal(minimumReady.eligible, true);
  assert.equal(recommended.eligible, true);
  assert.equal(highConfidence.eligible, true);
});

test("reconstruction planning review states are stable", () => {
  assert.deepEqual(RECONSTRUCTION_PLANNING_REVIEW_STATUSES, [
    "pending",
    "approved",
    "rejected",
    "needs_more_evidence",
  ]);
});

test("reconstruction planning confidence states are stable", () => {
  assert.deepEqual(RECONSTRUCTION_PLANNING_CONFIDENCE_LEVELS, ["LOW", "MEDIUM", "HIGH"]);
});

test("reconstruction candidate types are stable", () => {
  assert.deepEqual(RECONSTRUCTION_CANDIDATE_TYPES, [
    "page",
    "navigation",
    "hero",
    "section",
    "content_collection",
    "article_listing",
    "article_detail",
    "card_group",
    "gallery",
    "form",
    "map",
    "widget",
    "footer",
    "layout_region",
    "design_token_group",
    "unknown",
  ]);
});
