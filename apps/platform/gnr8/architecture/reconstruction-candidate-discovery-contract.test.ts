import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_CANDIDATE_CONFIDENCE_LEVELS,
  RECONSTRUCTION_CANDIDATE_DISCOVERY_STATUSES,
  RECONSTRUCTION_CANDIDATE_TYPES,
  createReconstructionCandidateDiscoveryPackage,
  evaluateCandidateDiscoveryEligibility,
  type ReconstructionDiscoveredCandidate,
} from "./reconstruction-candidate-discovery-contract";

const routeScope = {
  scopeType: "single_route" as const,
  routes: ["/"],
};

test("candidate discovery package creation preserves contract-only shape", () => {
  const candidate: ReconstructionDiscoveredCandidate = {
    candidateId: "candidate-home-hero",
    candidateType: "hero",
    sourceRoutes: ["/"],
    evidence: {
      evidenceRefs: ["rendered-dom-ref"],
      routeRefs: ["route-root"],
      widgetRefs: [],
      mediaRefs: ["screenshot-ref"],
      fontRefs: [],
      limitationRefs: ["layout-evidence-incomplete"],
    },
    confidence: {
      confidenceLevel: "MEDIUM",
      confidenceReasoning: ["Rendered DOM and screenshot refs exist, but layout evidence is incomplete."],
      evidenceCoverageStatus: "partial",
    },
    limitations: ["Layout evidence is incomplete."],
    notes: ["Contract fixture only; no candidate discovery has run."],
  };

  const discoveryPackage = createReconstructionCandidateDiscoveryPackage({
    packageId: "candidate-discovery-package-1",
    siteVersionId: "site-version-1",
    planningPackageId: "planning-package-1",
    readinessLevel: "MINIMUM_READY",
    routeScope,
    candidates: [candidate],
    limitations: ["Browser network inventory is incomplete."],
    notes: ["Future discovery output shape only."],
  });

  assert.equal(discoveryPackage.kind, "reconstruction_candidate_discovery_package_v1");
  assert.equal(discoveryPackage.contractVersion, "7F-12");
  assert.equal(discoveryPackage.packageId, "candidate-discovery-package-1");
  assert.equal(discoveryPackage.siteVersionId, "site-version-1");
  assert.equal(discoveryPackage.planningPackageId, "planning-package-1");
  assert.equal(discoveryPackage.readinessLevel, "MINIMUM_READY");
  assert.equal(discoveryPackage.discoveryStatus, "contract_only");
  assert.equal(discoveryPackage.candidateCount, 1);
  assert.deepEqual(discoveryPackage.candidates, [candidate]);
});

test("candidate discovery status values are stable", () => {
  assert.deepEqual(RECONSTRUCTION_CANDIDATE_DISCOVERY_STATUSES, [
    "not_started",
    "contract_only",
    "discovery_ready",
    "discovery_complete",
  ]);
});

test("candidate discovery type taxonomy is stable", () => {
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

test("candidate confidence values are stable", () => {
  assert.deepEqual(RECONSTRUCTION_CANDIDATE_CONFIDENCE_LEVELS, ["LOW", "MEDIUM", "HIGH"]);
});

test("candidate discovery eligibility follows planning gate readiness levels only", () => {
  const notReady = evaluateCandidateDiscoveryEligibility({
    packageId: "planning-package-not-ready",
    readinessLevel: "NOT_READY",
    blockers: [
      {
        id: "missing_rendered_dom",
        title: "Rendered DOM missing",
        description: "Rendered DOM evidence is required.",
        severity: "blocker",
        remediationHint: "Persist rendered DOM evidence before candidate discovery.",
      },
    ],
  });
  const minimumReady = evaluateCandidateDiscoveryEligibility({
    packageId: "planning-package-minimum",
    readinessLevel: "MINIMUM_READY",
  });
  const recommended = evaluateCandidateDiscoveryEligibility({
    packageId: "planning-package-recommended",
    readinessLevel: "RECOMMENDED",
  });
  const highConfidence = evaluateCandidateDiscoveryEligibility({
    packageId: "planning-package-high-confidence",
    readinessLevel: "HIGH_CONFIDENCE",
  });

  assert.equal(notReady.eligible, false);
  assert.equal(notReady.status, "not_eligible");
  assert.equal(notReady.readinessLevel, "NOT_READY");
  assert.equal(minimumReady.eligible, true);
  assert.equal(recommended.eligible, true);
  assert.equal(highConfidence.eligible, true);
});
