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
  RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
  createBlockedReconstructionPackage,
  type ReconstructionPackage,
} from "./reconstruction-package-contract";
import {
  RECONSTRUCTION_PACKAGE_ARTIFACT_KIND,
  ReconstructionPackagePersistenceValidationError,
  loadLatestReconstructionPackage,
  loadReconstructionPackageById,
  persistReconstructionPackage,
  type ReconstructionPackageProvenanceSummary,
} from "./reconstruction-package-persistence";

const SITE_VERSION_ID = "site-version-reconstruction-package";
const DRY_RUN_ID = "dry-run-reconstruction-package";
const DISCOVERY_ARTIFACT_ID = "candidate_discovery_result_reconstruction_1";
const REVIEW_ARTIFACT_ID = "candidate_review_package_reconstruction_1";
const REVIEW_ARTIFACT_ID_2 = "candidate_review_package_reconstruction_2";
const REVIEW_PACKAGE_ID = `candidate-review:${DISCOVERY_ARTIFACT_ID}`;

function discoveryResult(): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:reconstruction-source",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-22T08:00:00.000Z",
    candidateCount: 2,
    candidateTypesPresent: ["route", "section"],
    candidates: [
      {
        candidateId: "candidate:route:/",
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
        candidateId: "candidate:section:/hero",
        candidateType: "section",
        candidateStatus: "discovered",
        confidence: { level: "MEDIUM", reasons: ["SOURCE_CONFIDENCE:MEDIUM"] },
        sourceEvidenceRefs: [{ refId: "evidence:section:/hero", sourceKind: "evidence_capture_baseline", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run:section:/hero", sourceKind: "limited_dry_run_section_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
        routePath: "/",
        sectionIndex: 0,
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
): CandidateReviewEvent {
  return {
    reviewEventId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    candidateId,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewerRef: "human:operator-1",
    decision,
    decidedAt: "2026-06-22T09:00:00.000Z",
    supersedesReviewEventId: null,
    diagnostics: ["HUMAN_REVIEW_RECORDED"],
  };
}

function reviewPackage(
  events: CandidateReviewEvent[] = [
    reviewEvent("review-route-approved", "candidate:route:/", "approved"),
    reviewEvent("review-section-rejected", "candidate:section:/hero", "rejected"),
  ],
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
    createdAt: "2026-06-22T09:05:00.000Z",
  };
}

function reviewArtifact(artifactId: string, persistedAt: string) {
  const packageValue = reviewPackage();
  return {
    kind: "candidate_review_package",
    artifactKind: "candidate_review_package",
    artifactVersion: 1,
    artifactId,
    reviewPackageId: packageValue.reviewPackageId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewedCandidateCount: packageValue.reviewedCandidateCount,
    approvedCount: packageValue.approvedCount,
    rejectedCount: packageValue.rejectedCount,
    deferredCount: packageValue.deferredCount,
    contractVersion: "8D-1",
    createdAt: packageValue.createdAt,
    persistedAt,
    validationStatus: "valid",
    package: packageValue,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["CANDIDATE_REVIEW_PACKAGE_VALIDATION_PASSED"],
  };
}

function validPackage(
  input: {
    candidateReviewPackageArtifactId?: string;
    createdAt?: string;
    diagnostic?: string;
    approvedCandidateId?: string;
  } = {},
): ReconstructionPackage {
  const candidateReviewPackageArtifactId = input.candidateReviewPackageArtifactId ?? REVIEW_ARTIFACT_ID;
  const approvedCandidateId = input.approvedCandidateId ?? "candidate:route:/";
  return {
    reconstructionPackageId: `reconstruction-package:${candidateReviewPackageArtifactId}:${RECONSTRUCTION_PACKAGE_CONTRACT_VERSION}`,
    reconstructionPackageStatus: "valid",
    candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    contractVersion: RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
    createdAt: input.createdAt ?? "2026-06-22T10:00:00.000Z",
    lineage: {
      candidateReviewPackageArtifactId,
      candidateReviewPackageId: REVIEW_PACKAGE_ID,
      candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
    },
    approvedCandidateRefs: [{
      candidateId: approvedCandidateId,
      candidateType: approvedCandidateId.includes("section") ? "section" : "route",
      routePath: "/",
      decisionReviewEventId: "review-route-approved",
      decision: "approved",
      confidence: { level: "HIGH", reasons: ["SOURCE_CONFIDENCE:HIGH"] },
      sourceCandidateRefs: [`candidate-discovery:${DISCOVERY_ARTIFACT_ID}:${approvedCandidateId}`],
      evidenceRefs: [`evidence:${approvedCandidateId}`],
    }],
    eligibilitySummary: {
      approvedCount: 1,
      rejectedCount: 1,
      deferredCount: 0,
      unreviewedCount: 0,
      includedCount: 1,
      excludedCount: 1,
    },
    limitations: [],
    diagnostics: [input.diagnostic ?? "RECONSTRUCTION_PACKAGE_VALID"],
  };
}

function blockedPackage(): ReconstructionPackage {
  return createBlockedReconstructionPackage({
    candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID,
    candidateReviewPackageId: REVIEW_PACKAGE_ID,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-22T10:00:00.000Z",
    rejectedCount: 1,
    deferredCount: 1,
    diagnostics: ["RECONSTRUCTION_PACKAGE_BLOCKED"],
  });
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
    candidateCount: result.candidateCount,
    candidateTypesPresent: result.candidateTypesPresent,
    validationStatus: "valid",
    limitationCount: result.limitations.length,
    blockerCount: 0,
    contractVersion: "8C-1",
    builderVersion: "8C-3",
    createdAt: result.createdAt,
    persistedAt: "2026-06-22T08:05:00.000Z",
    result,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["CANDIDATE_DISCOVERY_RESULT_VALIDATION_PASSED"],
  };
  const firstReviewArtifact = reviewArtifact(REVIEW_ARTIFACT_ID, "2026-06-22T09:10:00.000Z");
  let summary = {
    kind: "runtime_import_provenance_summary_v1",
    candidateDiscoveryResultArtifacts: [discoveryArtifact],
    latestCandidateDiscoveryResultArtifact: discoveryArtifact,
    candidateReviewPackageArtifacts: [firstReviewArtifact],
    latestCandidateReviewPackageArtifact: firstReviewArtifact,
  } as unknown as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as ReconstructionPackageProvenanceSummary; },
    get writes() { return writes; },
    advanceLatestReviewArtifact(artifactId: string) {
      const nextArtifact = reviewArtifact(artifactId, "2026-06-22T09:15:00.000Z");
      summary = {
        ...(summary as Record<string, unknown>),
        candidateReviewPackageArtifacts: [
          ...((summary as Record<string, unknown>).candidateReviewPackageArtifacts as unknown[]),
          nextArtifact,
        ],
        latestCandidateReviewPackageArtifact: nextArtifact,
      } as unknown as RuntimeImportProvenanceSummary;
    },
    options: {
      persistedAt: "2026-06-22T11:00:00.000Z",
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
  packageValue: ReconstructionPackage,
  persistedAt = store.options.persistedAt,
) {
  return persistReconstructionPackage({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    candidateReviewPackageArtifactId: packageValue.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    package: packageValue,
    contractVersion: RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
    options: { ...store.options, persistedAt },
  });
}

test("valid Reconstruction Package persists with complete metadata", async () => {
  const store = memoryStore();
  const packageValue = validPackage();
  const ref = await persist(store, packageValue);

  assert.equal(ref.kind, RECONSTRUCTION_PACKAGE_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, RECONSTRUCTION_PACKAGE_ARTIFACT_KIND);
  assert.equal(ref.reconstructionPackageId, packageValue.reconstructionPackageId);
  assert.equal(ref.candidateReviewPackageArtifactId, REVIEW_ARTIFACT_ID);
  assert.equal(ref.candidateDiscoveryArtifactId, DISCOVERY_ARTIFACT_ID);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.status, "valid");
  assert.equal(ref.includedCount, 1);
  assert.equal(ref.excludedCount, 1);
  assert.equal(ref.approvedCount, 1);
  assert.equal(ref.contractVersion, RECONSTRUCTION_PACKAGE_CONTRACT_VERSION);
  assert.equal(ref.createdAt, packageValue.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["RECONSTRUCTION_PACKAGE_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.reconstructionPackageArtifacts?.[0]?.package, packageValue);
});

test("blocked Reconstruction Package persists as a non-planning audit artifact", async () => {
  const store = memoryStore();
  const ref = await persist(store, blockedPackage());

  assert.equal(ref.status, "blocked");
  assert.equal(ref.includedCount, 0);
  assert.equal(ref.excludedCount, 2);
  assert.equal(ref.approvedCount, 0);
  assert.equal(store.summary.latestReconstructionPackageArtifact?.status, "blocked");
});

test("latest and by-id loads return cloned full artifact records", async () => {
  const store = memoryStore();
  const ref = await persist(store, validPackage());
  const latest = await loadLatestReconstructionPackage({ siteVersionId: SITE_VERSION_ID, options: store.options });
  const byId = await loadReconstructionPackageById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.package.diagnostics[0] = "MUTATED";
  assert.equal((await loadLatestReconstructionPackage({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    options: store.options,
  }))?.package.diagnostics[0], "RECONSTRUCTION_PACKAGE_VALID");
  assert.equal(await loadReconstructionPackageById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent package reuses latest artifact despite retry-only createdAt change", async () => {
  const store = memoryStore();
  const first = await persist(store, validPackage());
  const second = await persist(
    store,
    validPackage({ createdAt: "2026-06-22T12:00:00.000Z" }),
    "2026-06-22T12:05:00.000Z",
  );

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.reconstructionPackageArtifacts?.length, 1);
  assert.equal(store.summary.latestReconstructionPackageArtifact?.artifactId, first.artifactId);
  assert.equal(store.summary.latestReconstructionPackageArtifact?.createdAt, "2026-06-22T10:00:00.000Z");
});

test("changed current package appends history and advances latest pointer", async () => {
  const store = memoryStore();
  const first = await persist(store, validPackage());
  store.advanceLatestReviewArtifact(REVIEW_ARTIFACT_ID_2);
  const second = await persist(
    store,
    validPackage({
      candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID_2,
      diagnostic: "RECONSTRUCTION_PACKAGE_VALID_CHANGED",
    }),
    "2026-06-22T11:05:00.000Z",
  );

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.reconstructionPackageArtifacts?.length, 2);
  assert.equal(store.summary.latestReconstructionPackageArtifact?.artifactId, second.artifactId);
  assert.equal((await loadReconstructionPackageById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("stale, invalid, and invalid-lineage packages are rejected before write", async () => {
  const staleStore = memoryStore();
  staleStore.advanceLatestReviewArtifact(REVIEW_ARTIFACT_ID_2);
  await assert.rejects(() => persist(staleStore, validPackage()), (error: unknown) => {
    assert.ok(error instanceof ReconstructionPackagePersistenceValidationError);
    assert.ok(error.validation.errors.includes("candidateReviewPackageArtifactId must match the latest Candidate Review artifact for this lineage"));
    return true;
  });

  const invalidStore = memoryStore();
  const invalid = { ...validPackage(), eligibilitySummary: { ...validPackage().eligibilitySummary, approvedCount: 2 } };
  await assert.rejects(() => persist(invalidStore, invalid), (error: unknown) => {
    assert.ok(error instanceof ReconstructionPackagePersistenceValidationError);
    assert.ok(error.validation.errors.includes("eligibilitySummary.approvedCount must equal 1"));
    return true;
  });

  const lineageStore = memoryStore();
  const wrongLineage = {
    ...validPackage(),
    lineage: { ...validPackage().lineage, candidateReviewPackageId: "candidate-review:other" },
  };
  await assert.rejects(() => persist(lineageStore, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof ReconstructionPackagePersistenceValidationError);
    assert.ok(error.validation.errors.includes("package.lineage.candidateReviewPackageId must match the Candidate Review package"));
    return true;
  });

  assert.equal(staleStore.writes, 0);
  assert.equal(invalidStore.writes, 0);
  assert.equal(lineageStore.writes, 0);
});

test("builder stale and invalid statuses are rejected before write", async () => {
  const store = memoryStore();
  const stale = { ...validPackage(), reconstructionPackageStatus: "stale" as const };
  const invalid = { ...validPackage(), reconstructionPackageStatus: "invalid" as const };

  for (const packageValue of [stale, invalid]) {
    await assert.rejects(() => persist(store, packageValue), (error: unknown) => {
      assert.ok(error instanceof ReconstructionPackagePersistenceValidationError);
      assert.ok(error.validation.errors.includes("reconstructionPackageStatus must be valid or blocked for persistence"));
      return true;
    });
  }
  assert.equal(store.writes, 0);
});

test("forbidden generated fields are rejected recursively", async () => {
  const store = memoryStore();
  const forbidden = {
    ...validPackage(),
    diagnostics: [{ generatedBlocks: [{ kind: "forbidden" }] }],
  } as unknown as ReconstructionPackage;

  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof ReconstructionPackagePersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("generatedBlocks is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});
