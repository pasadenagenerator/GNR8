import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

import type { Candidate, CandidateDiscoveryResult } from "./candidate-discovery-contract";
import type { CandidateDiscoveryResultArtifactRecord } from "./candidate-discovery-persistence";
import {
  deriveLatestCandidateReviewDecisions,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";
import type { CandidateReviewPackageArtifactRecord } from "./candidate-review-persistence";
import {
  loadLatestCandidateReviewSurfaceProjection,
  projectCandidateReviewSurface,
} from "./candidate-review-surface-projection";

const SITE_VERSION_ID = "site-version-review-surface";
const DRY_RUN_ID = "dry-run-review-surface";
const DISCOVERY_ARTIFACT_ID = "candidate_discovery_result_review_surface";

function candidate(candidateId: string, candidateType: Candidate["candidateType"], routePath?: string): Candidate {
  return {
    candidateId,
    candidateType,
    candidateStatus: "valid",
    confidence: { level: "HIGH", reasons: ["persisted evidence"] },
    sourceEvidenceRefs: [{ refId: `evidence:${candidateId}`, sourceKind: "evidence_capture_baseline", routePath }],
    sourceDryRunRefs: [{ refId: `dry-run:${candidateId}`, sourceKind: "limited_dry_run_output", routePath }],
    limitations: [],
    diagnostics: [`CONTEXT:${candidateId}`],
    ...(routePath ? { routePath } : {}),
  };
}

function discoveryArtifact(artifactId = DISCOVERY_ARTIFACT_ID): CandidateDiscoveryResultArtifactRecord {
  const candidates = [
    candidate("route:/about", "route", "/about"),
    candidate("route:/", "route", "/"),
    candidate("navigation:primary", "navigation", "/"),
    candidate("section:/about:1", "section", "/about"),
    candidate("section:/:1", "section", "/"),
  ];
  const result: CandidateDiscoveryResult = {
    discoveryId: "candidate-discovery:review-surface",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-18T08:00:00.000Z",
    candidateCount: candidates.length,
    candidateTypesPresent: ["route", "navigation", "section"],
    candidates,
    limitations: [],
    diagnostics: ["CANDIDATE_DISCOVERY_COMPLETE"],
  };
  return {
    kind: "candidate_discovery_result",
    artifactKind: "candidate_discovery_result",
    artifactVersion: 1,
    artifactId,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    discoveryId: result.discoveryId,
    candidateCount: candidates.length,
    candidateTypesPresent: ["route", "navigation", "section"],
    validationStatus: "valid",
    limitationCount: 0,
    blockerCount: 0,
    contractVersion: "8C-1",
    builderVersion: "8C-5",
    createdAt: result.createdAt,
    persistedAt: "2026-06-18T08:05:00.000Z",
    result,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["CANDIDATE_DISCOVERY_RESULT_VALIDATION_PASSED"],
  };
}

function reviewEvent(input: {
  reviewEventId: string;
  candidateId: string;
  decision: CandidateReviewEvent["decision"];
  decidedAt: string;
  supersedesReviewEventId?: string;
}): CandidateReviewEvent {
  return {
    ...input,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewerRef: "human:surface-reviewer",
    supersedesReviewEventId: input.supersedesReviewEventId ?? null,
    rationale: `Rationale for ${input.reviewEventId}`,
    diagnostics: [`EVENT:${input.reviewEventId}`],
  };
}

function reviewArtifact(events: CandidateReviewEvent[] = []): CandidateReviewPackageArtifactRecord {
  const latestDecisions = deriveLatestCandidateReviewDecisions(events);
  const reviewPackage: CandidateReviewPackage = {
    reviewPackageId: `candidate-review:${DISCOVERY_ARTIFACT_ID}`,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewEvents: events,
    latestDecisions,
    reviewedCandidateCount: latestDecisions.length,
    approvedCount: latestDecisions.filter((event) => event.decision === "approved").length,
    rejectedCount: latestDecisions.filter((event) => event.decision === "rejected").length,
    deferredCount: latestDecisions.filter((event) => event.decision === "deferred").length,
    diagnostics: ["CANDIDATE_REVIEW_PACKAGE_VALID"],
    createdAt: "2026-06-18T10:30:00.000Z",
  };
  return {
    kind: "candidate_review_package",
    artifactKind: "candidate_review_package",
    artifactVersion: 1,
    artifactId: "candidate_review_package_surface",
    reviewPackageId: reviewPackage.reviewPackageId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewedCandidateCount: reviewPackage.reviewedCandidateCount,
    approvedCount: reviewPackage.approvedCount,
    rejectedCount: reviewPackage.rejectedCount,
    deferredCount: reviewPackage.deferredCount,
    contractVersion: "8D-1",
    createdAt: reviewPackage.createdAt,
    persistedAt: "2026-06-18T10:35:00.000Z",
    validationStatus: "valid",
    package: reviewPackage,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["CANDIDATE_REVIEW_PACKAGE_VALIDATION_PASSED"],
  };
}

function reviewedEvents(): CandidateReviewEvent[] {
  return [
    reviewEvent({ reviewEventId: "event-route-old", candidateId: "route:/about", decision: "approved", decidedAt: "2026-06-18T09:00:00.000Z" }),
    reviewEvent({ reviewEventId: "event-navigation", candidateId: "navigation:primary", decision: "approved", decidedAt: "2026-06-18T09:05:00.000Z" }),
    reviewEvent({ reviewEventId: "event-section", candidateId: "section:/about:1", decision: "deferred", decidedAt: "2026-06-18T09:10:00.000Z" }),
    reviewEvent({
      reviewEventId: "event-route-new",
      candidateId: "route:/about",
      decision: "rejected",
      decidedAt: "2026-06-18T09:15:00.000Z",
      supersedesReviewEventId: "event-route-old",
    }),
  ];
}

test("Candidate Review projection safely parses persisted package and linked context", () => {
  const projection = projectCandidateReviewSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: reviewArtifact(reviewedEvents()),
    linkedCandidateDiscoveryArtifact: discoveryArtifact(),
    latestReviewArtifactId: "candidate_review_package_surface",
    latestCandidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
  });

  assert.equal(projection.state, "ready");
  assert.equal(projection.validation.status, "valid");
  assert.equal(projection.artifact?.reviewPackageId, `candidate-review:${DISCOVERY_ARTIFACT_ID}`);
  assert.equal(projection.linkedCandidateDiscovery?.candidateCount, 5);
  assert.deepEqual(projection.counts, {
    candidates: 5,
    reviewed: 3,
    unreviewed: 2,
    approved: 1,
    rejected: 1,
    deferred: 1,
    reviewEvents: 4,
    supersededEvents: 1,
  });
  assert.equal(projection.reviewEventHistory[0]?.superseded, true);
  assert.equal(projection.reviewEventHistory[0]?.chainHeadReviewEventId, "event-route-new");
});

test("Candidate Review grouped decisions preserve Discovery type, route, and candidate order", () => {
  const projection = projectCandidateReviewSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: reviewArtifact(reviewedEvents()),
    linkedCandidateDiscoveryArtifact: discoveryArtifact(),
    latestCandidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
  });

  assert.deepEqual(projection.groupedLatestDecisions.rejected.routes.map((item) => item.candidateId), ["route:/about"]);
  assert.deepEqual(projection.groupedLatestDecisions.approved.navigation.map((item) => item.candidateId), ["navigation:primary"]);
  assert.deepEqual(projection.groupedLatestDecisions.deferred.sectionsByRoute.map((group) => group.routePath), ["/about"]);
  assert.deepEqual(projection.unreviewedCandidates.routes.map((item) => item.candidateId), ["route:/"]);
  assert.deepEqual(projection.unreviewedCandidates.sectionsByRoute.map((group) => group.routePath), ["/"]);
  assert.deepEqual(projection.attentionStates, ["has_superseded_events"]);
});

test("Candidate Review empty package renders all linked candidates as unreviewed", () => {
  const projection = projectCandidateReviewSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: reviewArtifact(),
    linkedCandidateDiscoveryArtifact: discoveryArtifact(),
    latestCandidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
  });

  assert.equal(projection.counts.unreviewed, 5);
  assert.equal(projection.reviewEventHistory.length, 0);
  assert.deepEqual(projection.attentionStates, ["empty_review_package", "all_candidates_unreviewed"]);
});

test("Candidate Review projection reports invalid package without throwing or presenting decisions", () => {
  const invalid = reviewArtifact(reviewedEvents()) as unknown as Record<string, unknown>;
  invalid.package = { reviewPackageId: "invalid" };
  const projection = projectCandidateReviewSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: invalid,
    linkedCandidateDiscoveryArtifact: discoveryArtifact(),
  });

  assert.equal(projection.state, "invalid");
  assert.equal(projection.validation.status, "invalid");
  assert.equal(projection.validation.errors.length > 0, true);
  assert.equal(projection.counts.reviewed, 0);
  assert.deepEqual(projection.groupedLatestDecisions, {
    approved: { routes: [], navigation: [], sectionsByRoute: [], unscopedSections: [] },
    rejected: { routes: [], navigation: [], sectionsByRoute: [], unscopedSections: [] },
    deferred: { routes: [], navigation: [], sectionsByRoute: [], unscopedSections: [] },
  });
});

test("latest Candidate Review loader handles missing and stale persisted artifacts", async () => {
  const missing = await loadLatestCandidateReviewSurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: { getSiteVersion: async () => ({ importProvenanceSummary: { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary }) },
  });
  assert.equal(missing.state, "missing");

  const review = reviewArtifact();
  const linked = discoveryArtifact();
  const newer = discoveryArtifact("candidate_discovery_result_newer");
  const summary = {
    kind: "runtime_import_provenance_summary_v1",
    candidateReviewPackageArtifacts: [review],
    latestCandidateReviewPackageArtifact: review,
    candidateDiscoveryResultArtifacts: [linked, newer],
    latestCandidateDiscoveryResultArtifact: newer,
  } as unknown as RuntimeImportProvenanceSummary;
  const stale = await loadLatestCandidateReviewSurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: { getSiteVersion: async () => ({ importProvenanceSummary: summary }) },
  });

  assert.equal(stale.state, "ready");
  assert.equal(stale.linkedCandidateDiscovery?.latestArtifactId, "candidate_discovery_result_newer");
  assert.deepEqual(stale.attentionStates, ["empty_review_package", "all_candidates_unreviewed", "stale"]);
});
