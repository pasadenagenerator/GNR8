import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

import type { Candidate, CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
  type CandidateDiscoveryResultArtifactRecord,
  type CandidateDiscoveryResultProvenanceSummary,
} from "./candidate-discovery-persistence";
import {
  loadLatestCandidateDiscoverySurfaceProjection,
  projectCandidateDiscoverySurface,
} from "./candidate-discovery-surface-projection";

const SITE_VERSION_ID = "site-version-candidate-surface";
const DRY_RUN_ID = "dry-run-candidate-surface";

function candidate(input: Pick<Candidate, "candidateId" | "candidateType"> & Partial<Candidate>): Candidate {
  return {
    candidateId: input.candidateId,
    candidateType: input.candidateType,
    candidateStatus: "valid",
    confidence: { level: "HIGH", reasons: ["persisted evidence"] },
    sourceEvidenceRefs: [
      { refId: `evidence:${input.candidateId}`, sourceKind: "evidence_capture_baseline" },
    ],
    sourceDryRunRefs: [
      { refId: `dry-run:${input.candidateId}`, sourceKind: "limited_dry_run_output" },
    ],
    limitations: [],
    diagnostics: [],
    ...input,
  };
}

function validResult(input: Partial<CandidateDiscoveryResult> = {}): CandidateDiscoveryResult {
  const candidates = input.candidates ?? [
    candidate({ candidateId: "route-2", candidateType: "route", routePath: "/about" }),
    candidate({ candidateId: "section-about-1", candidateType: "section", routePath: "/about" }),
    candidate({ candidateId: "route-1", candidateType: "route", routePath: "/" }),
    candidate({ candidateId: "navigation-2", candidateType: "navigation", routePath: "/about" }),
    candidate({ candidateId: "section-home-1", candidateType: "section", routePath: "/" }),
    candidate({ candidateId: "section-about-2", candidateType: "section", routePath: "/about" }),
    candidate({ candidateId: "navigation-1", candidateType: "navigation", routePath: "/" }),
  ];
  return {
    discoveryId: "discovery-surface",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-18T08:00:00.000Z",
    candidateCount: candidates.length,
    candidateTypesPresent: ["route", "navigation", "section"],
    candidates,
    limitations: [],
    diagnostics: ["CANDIDATE_DISCOVERY_COMPLETE"],
    ...input,
  };
}

function artifact(input: {
  result?: CandidateDiscoveryResult;
  artifactId?: string;
  persistedAt?: string;
} = {}): CandidateDiscoveryResultArtifactRecord {
  const result = input.result ?? validResult();
  return {
    kind: CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
    artifactKind: CANDIDATE_DISCOVERY_RESULT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: input.artifactId ?? "candidate_discovery_result_surface",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    discoveryId: result.discoveryId,
    candidateCount: result.candidateCount,
    candidateTypesPresent: [...result.candidateTypesPresent],
    validationStatus: "valid",
    limitationCount: result.limitations.length,
    blockerCount: result.limitations.filter((item) => item.severity === "blocker").length,
    contractVersion: "candidate-discovery-contract-v1",
    builderVersion: "candidate-discovery-builder-v1",
    createdAt: result.createdAt,
    persistedAt: input.persistedAt ?? "2026-06-18T08:05:00.000Z",
    result,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["CANDIDATE_DISCOVERY_RESULT_VALIDATION_PASSED"],
  };
}

test("Candidate Discovery surface projection safely parses persisted result", () => {
  const projection = projectCandidateDiscoverySurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(),
  });

  assert.equal(projection.artifact?.artifactId, "candidate_discovery_result_surface");
  assert.equal(projection.artifact?.discoveryId, "discovery-surface");
  assert.equal(projection.siteVersionId, SITE_VERSION_ID);
  assert.equal(projection.validation.status, "valid");
  assert.deepEqual(projection.counts.byType, { route: 2, navigation: 2, section: 3 });
  assert.deepEqual(projection.counts.byConfidence, { LOW: 0, MEDIUM: 0, HIGH: 7 });
  assert.equal(projection.emptyState, "ready");
});

test("Candidate Discovery grouped candidates preserve builder-relative order", () => {
  const groups = projectCandidateDiscoverySurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(),
  }).groups;

  assert.deepEqual(groups.routes.map((item) => item.candidateId), ["route-2", "route-1"]);
  assert.deepEqual(groups.navigation.map((item) => item.candidateId), ["navigation-2", "navigation-1"]);
  assert.deepEqual(groups.sectionsByRoute.map((group) => group.routePath), ["/about", "/"]);
  assert.deepEqual(groups.sectionsByRoute[0]?.candidates.map((item) => item.candidateId), [
    "section-about-1",
    "section-about-2",
  ]);
  assert.deepEqual(groups.sectionsByRoute[1]?.candidates.map((item) => item.candidateId), ["section-home-1"]);
});

test("Candidate Discovery projection represents invalid stored result without throwing", () => {
  const stored = artifact() as unknown as Record<string, unknown>;
  stored.result = { discoveryId: "invalid" };

  const projection = projectCandidateDiscoverySurface({ siteVersionId: SITE_VERSION_ID, artifact: stored });

  assert.equal(projection.emptyState, "invalid");
  assert.equal(projection.validation.status, "invalid");
  assert.equal(projection.counts.total, 0);
  assert.equal(projection.validation.errors.length > 0, true);
});

test("Candidate Discovery projection classifies no candidates, blockers, and limitations", () => {
  const empty = validResult({ candidates: [], candidateCount: 0, candidateTypesPresent: [] });
  assert.equal(projectCandidateDiscoverySurface({ siteVersionId: SITE_VERSION_ID, artifact: artifact({ result: empty }) }).emptyState, "no_candidates");

  const blocker = {
    limitationId: "blocked-source",
    severity: "blocker" as const,
    code: "SOURCE_BLOCKED",
    message: "Required source evidence was unavailable.",
  };
  const blocked = validResult({
    candidates: [],
    candidateCount: 0,
    candidateTypesPresent: [],
    limitations: [blocker],
  });
  assert.equal(projectCandidateDiscoverySurface({ siteVersionId: SITE_VERSION_ID, artifact: artifact({ result: blocked }) }).emptyState, "blocked");

  const limitedCandidate = candidate({
    candidateId: "route-limited",
    candidateType: "route",
    routePath: "/",
    limitations: [{ ...blocker, severity: "warning" }],
  });
  const limited = validResult({
    candidates: [limitedCandidate],
    candidateCount: 1,
    candidateTypesPresent: ["route"],
  });
  assert.equal(projectCandidateDiscoverySurface({ siteVersionId: SITE_VERSION_ID, artifact: artifact({ result: limited }) }).emptyState, "candidates_with_limitations");
});

test("latest Candidate Discovery projection returns missing state when no artifact exists", async () => {
  const projection = await loadLatestCandidateDiscoverySurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => ({
        importProvenanceSummary: { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary,
      }),
    },
  });

  assert.equal(projection.emptyState, "missing");
  assert.equal(projection.siteVersionId, SITE_VERSION_ID);
  assert.equal(projection.validation.status, "unavailable");
});

test("latest Candidate Discovery projection selects the latest stored artifact", async () => {
  const older = artifact({ artifactId: "candidate_discovery_result_older", persistedAt: "2026-06-18T08:00:00.000Z" });
  const newer = artifact({ artifactId: "candidate_discovery_result_newer", persistedAt: "2026-06-18T08:10:00.000Z" });
  const summary: CandidateDiscoveryResultProvenanceSummary = {
    kind: "runtime_import_provenance_summary_v1",
    candidateDiscoveryResultArtifacts: [older, newer],
    latestCandidateDiscoveryResultArtifact: older,
  } as CandidateDiscoveryResultProvenanceSummary;

  const projection = await loadLatestCandidateDiscoverySurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: { getSiteVersion: async () => ({ importProvenanceSummary: summary }) },
  });

  assert.equal(projection.artifact?.artifactId, "candidate_discovery_result_newer");
});
