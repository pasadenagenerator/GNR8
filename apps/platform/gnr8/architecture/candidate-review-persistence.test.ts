import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  deriveLatestCandidateReviewDecisions,
  type CandidateReviewDecision,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";
import {
  CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND,
  CandidateReviewPersistenceConflictError,
  CandidateReviewPersistenceValidationError,
  loadCandidateReviewPackageById,
  loadLatestCandidateReviewPackage,
  persistCandidateReviewPackage,
  type CandidateReviewPackageProvenanceSummary,
} from "./candidate-review-persistence";

const SITE_VERSION_ID = "site-version-candidate-review";
const DRY_RUN_ID = "dry-run-candidate-review";
const DISCOVERY_ARTIFACT_ID = "candidate-discovery-result-artifact-1";
const REVIEW_PACKAGE_ID = `candidate-review:${DISCOVERY_ARTIFACT_ID}`;
const CONTRACT_VERSION = "8D-1";
const CANDIDATE_IDS = ["candidate:route:/", "candidate:navigation:/", "candidate:section:/:1"];

function discoveryResult(): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:review-source",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-18T08:00:00.000Z",
    candidateCount: 3,
    candidateTypesPresent: ["route", "navigation", "section"],
    candidates: [
      {
        candidateId: CANDIDATE_IDS[0],
        candidateType: "route",
        candidateStatus: "discovered",
        confidence: { level: "HIGH", reasons: ["SOURCE_CONFIDENCE:HIGH"] },
        sourceEvidenceRefs: [{ refId: "evidence:route:/", sourceKind: "evidence_capture_baseline", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run:route:/", sourceKind: "limited_dry_run_route_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
        routePath: "/",
      },
      {
        candidateId: CANDIDATE_IDS[1],
        candidateType: "navigation",
        candidateStatus: "discovered",
        confidence: { level: "MEDIUM", reasons: ["SOURCE_CONFIDENCE:MEDIUM"] },
        sourceEvidenceRefs: [{ refId: "evidence:navigation:/", sourceKind: "evidence_capture_baseline", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run:navigation:/", sourceKind: "limited_dry_run_navigation_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
        navigationId: "navigation:/",
      },
      {
        candidateId: CANDIDATE_IDS[2],
        candidateType: "section",
        candidateStatus: "discovered",
        confidence: { level: "LOW", reasons: ["SOURCE_CONFIDENCE:LOW"] },
        sourceEvidenceRefs: [{ refId: "evidence:section:/:1", sourceKind: "evidence_capture_baseline", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run:section:/:1", sourceKind: "limited_dry_run_section_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
        routePath: "/",
        sectionIndex: 1,
      },
    ],
    limitations: [],
    diagnostics: ["CANDIDATE_DISCOVERY_RESULT_VALID"],
  };
}

function reviewEvent(
  reviewEventId: string,
  candidateId: string,
  decision: CandidateReviewDecision,
  overrides: Partial<CandidateReviewEvent> = {},
): CandidateReviewEvent {
  return {
    reviewEventId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    candidateId,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewerRef: "human:operator-1",
    decision,
    decidedAt: "2026-06-18T10:00:00.000Z",
    supersedesReviewEventId: null,
    diagnostics: ["HUMAN_REVIEW_RECORDED"],
    ...overrides,
  };
}

function reviewPackage(
  events: CandidateReviewEvent[] = [],
  overrides: Partial<CandidateReviewPackage> = {},
): CandidateReviewPackage {
  const latestDecisions = deriveLatestCandidateReviewDecisions(events);
  return {
    reviewPackageId: REVIEW_PACKAGE_ID,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewEvents: events,
    latestDecisions,
    reviewedCandidateCount: latestDecisions.length,
    approvedCount: latestDecisions.filter(({ decision }) => decision === "approved").length,
    rejectedCount: latestDecisions.filter(({ decision }) => decision === "rejected").length,
    deferredCount: latestDecisions.filter(({ decision }) => decision === "deferred").length,
    diagnostics: ["CANDIDATE_REVIEW_PACKAGE_VALID"],
    createdAt: "2026-06-18T10:05:00.000Z",
    ...overrides,
  };
}

function memoryStore() {
  const result = discoveryResult();
  const discoveryArtifact = {
    kind: "candidate_discovery_result",
    artifactKind: "candidate_discovery_result",
    artifactVersion: 1,
    artifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    discoveryId: result.discoveryId,
    validationStatus: "valid",
    result,
    validation: { valid: true, errors: [], warnings: [] },
  };
  let summary = {
    kind: "runtime_import_provenance_summary_v1",
    candidateDiscoveryResultArtifacts: [discoveryArtifact],
    latestCandidateDiscoveryResultArtifact: discoveryArtifact,
  } as unknown as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as CandidateReviewPackageProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-06-18T11:00:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, SITE_VERSION_ID);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

async function persist(
  store: ReturnType<typeof memoryStore>,
  packageValue: CandidateReviewPackage,
  persistedAt = store.options.persistedAt,
  contractVersion = CONTRACT_VERSION,
) {
  return persistCandidateReviewPackage({
    siteVersionId: SITE_VERSION_ID,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    reviewPackage: packageValue,
    contractVersion,
    options: { ...store.options, persistedAt },
  });
}

test("valid empty package persists with complete metadata", async () => {
  const store = memoryStore();
  const packageValue = reviewPackage();
  const ref = await persist(store, packageValue);

  assert.equal(ref.kind, CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, CANDIDATE_REVIEW_PACKAGE_ARTIFACT_KIND);
  assert.equal(ref.reviewPackageId, REVIEW_PACKAGE_ID);
  assert.equal(ref.candidateDiscoveryArtifactId, DISCOVERY_ARTIFACT_ID);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.reviewedCandidateCount, 0);
  assert.equal(ref.approvedCount, 0);
  assert.equal(ref.rejectedCount, 0);
  assert.equal(ref.deferredCount, 0);
  assert.equal(ref.contractVersion, CONTRACT_VERSION);
  assert.equal(ref.createdAt, packageValue.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["CANDIDATE_REVIEW_PACKAGE_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.candidateReviewPackageArtifacts?.[0]?.package, packageValue);
});

test("approved, rejected, and deferred events persist with preserved metadata", async () => {
  const store = memoryStore();
  const events = [
    reviewEvent("review-approved", CANDIDATE_IDS[0], "approved"),
    reviewEvent("review-rejected", CANDIDATE_IDS[1], "rejected"),
    reviewEvent("review-deferred", CANDIDATE_IDS[2], "deferred"),
  ];
  const packageValue = reviewPackage(events);
  const ref = await persist(store, packageValue);

  assert.equal(ref.reviewedCandidateCount, 3);
  assert.equal(ref.approvedCount, 1);
  assert.equal(ref.rejectedCount, 1);
  assert.equal(ref.deferredCount, 1);
  assert.deepEqual(store.summary.latestCandidateReviewPackageArtifact?.package.reviewEvents, events);
  assert.deepEqual(store.summary.latestCandidateReviewPackageArtifact?.package.diagnostics, packageValue.diagnostics);
});

test("latest and by-id loads return cloned full artifact records", async () => {
  const store = memoryStore();
  const ref = await persist(store, reviewPackage());
  const latest = await loadLatestCandidateReviewPackage({
    siteVersionId: SITE_VERSION_ID,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    options: store.options,
  });
  const byId = await loadCandidateReviewPackageById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.package.diagnostics[0] = "MUTATED";
  assert.equal((await loadLatestCandidateReviewPackage({
    siteVersionId: SITE_VERSION_ID,
    options: store.options,
  }))?.package.diagnostics[0], "CANDIDATE_REVIEW_PACKAGE_VALID");
  assert.equal(await loadCandidateReviewPackageById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("invalid package, lineage, and unknown candidates are rejected before write", async () => {
  const store = memoryStore();
  const invalidCount = { ...reviewPackage(), approvedCount: 1 };
  await assert.rejects(() => persist(store, invalidCount), CandidateReviewPersistenceValidationError);

  const wrongLineage = reviewPackage([], { dryRunId: "other-dry-run" });
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof CandidateReviewPersistenceValidationError);
    assert.ok(error.validation.errors.includes("Candidate Discovery artifact dryRunId must match reviewPackage.dryRunId"));
    return true;
  });

  const unknownCandidate = reviewPackage([
    reviewEvent("review-unknown", "candidate:unknown", "approved"),
  ]);
  await assert.rejects(() => persist(store, unknownCandidate), (error: unknown) => {
    assert.ok(error instanceof CandidateReviewPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("candidateId must exist")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("forbidden generated fields are rejected recursively", async () => {
  const store = memoryStore();
  const forbidden = {
    ...reviewPackage(),
    diagnostics: [{ generatedBlocks: [{ kind: "forbidden" }] }],
  } as unknown as CandidateReviewPackage;
  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof CandidateReviewPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("generatedBlocks is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("equivalent package reuses latest artifact despite retry-only createdAt change", async () => {
  const store = memoryStore();
  const first = await persist(store, reviewPackage());
  const second = await persist(
    store,
    reviewPackage([], { createdAt: "2026-06-18T12:00:00.000Z" }),
    "2026-06-18T12:05:00.000Z",
  );

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.candidateReviewPackageArtifacts?.length, 1);
  assert.equal(store.summary.latestCandidateReviewPackageArtifact?.artifactId, first.artifactId);
  assert.equal(store.summary.latestCandidateReviewPackageArtifact?.createdAt, "2026-06-18T10:05:00.000Z");
});

test("changed review history appends and advances the latest pointer", async () => {
  const store = memoryStore();
  const firstEvent = reviewEvent("review-approved", CANDIDATE_IDS[0], "approved");
  const first = await persist(store, reviewPackage([firstEvent]));
  const secondEvent = reviewEvent("review-rejected", CANDIDATE_IDS[1], "rejected", {
    decidedAt: "2026-06-18T10:10:00.000Z",
  });
  const second = await persist(
    store,
    reviewPackage([firstEvent, secondEvent]),
    "2026-06-18T11:05:00.000Z",
  );

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.candidateReviewPackageArtifacts?.length, 2);
  assert.equal(store.summary.latestCandidateReviewPackageArtifact?.artifactId, second.artifactId);
  assert.equal((await loadCandidateReviewPackageById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("rewritten, reordered, and stale branching history is rejected", async () => {
  const first = reviewEvent("review-first", CANDIDATE_IDS[0], "approved");

  const rewriteStore = memoryStore();
  await persist(rewriteStore, reviewPackage([first]));
  const rewritten = reviewEvent("review-first", CANDIDATE_IDS[0], "rejected");
  await assert.rejects(() => persist(rewriteStore, reviewPackage([rewritten])), (error: unknown) => {
    assert.ok(error instanceof CandidateReviewPersistenceConflictError);
    assert.ok(error.diagnostics.includes("CANDIDATE_REVIEW_HISTORY_REWRITTEN_OR_REORDERED"));
    return true;
  });

  const reorderedStore = memoryStore();
  const secondCandidate = reviewEvent("review-second", CANDIDATE_IDS[1], "deferred");
  await persist(reorderedStore, reviewPackage([first, secondCandidate]));
  await assert.rejects(
    () => persist(reorderedStore, reviewPackage([secondCandidate, first])),
    CandidateReviewPersistenceConflictError,
  );

  const staleStore = memoryStore();
  const second = reviewEvent("review-second", CANDIDATE_IDS[0], "rejected", {
    supersedesReviewEventId: first.reviewEventId,
    decidedAt: "2026-06-18T10:10:00.000Z",
  });
  await persist(staleStore, reviewPackage([first, second]));
  const stale = reviewEvent("review-stale", CANDIDATE_IDS[0], "deferred", {
    supersedesReviewEventId: first.reviewEventId,
    decidedAt: "2026-06-18T10:20:00.000Z",
  });
  await assert.rejects(() => persist(staleStore, reviewPackage([first, second, stale])), (error: unknown) => {
    assert.ok(error instanceof CandidateReviewPersistenceConflictError);
    assert.ok(error.diagnostics.includes("CANDIDATE_REVIEW_STALE_OR_BRANCHING_SUPERSESSION"));
    return true;
  });
  assert.equal(rewriteStore.writes, 1);
  assert.equal(reorderedStore.writes, 1);
  assert.equal(staleStore.writes, 1);
});
