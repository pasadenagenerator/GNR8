import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
  createBlockedReconstructionPackage,
  type ReconstructionPackage,
  type ReconstructionPackageCandidateRef,
} from "./reconstruction-package-contract";
import { buildStructurePlan } from "./structure-plan-builder";
import {
  STRUCTURE_PLAN_CONTRACT_VERSION,
  type StructurePlan,
} from "./structure-plan-contract";
import {
  STRUCTURE_PLAN_ARTIFACT_KIND,
  StructurePlanPersistenceValidationError,
  loadLatestStructurePlan,
  loadStructurePlanById,
  persistStructurePlan,
  type StructurePlanProvenanceSummary,
} from "./structure-plan-persistence";

const SITE_VERSION_ID = "site-version-structure-plan";
const DRY_RUN_ID = "dry-run-structure-plan";
const DISCOVERY_ARTIFACT_ID = "candidate_discovery_result_structure_plan_1";
const REVIEW_ARTIFACT_ID = "candidate_review_package_structure_plan_1";
const REVIEW_ARTIFACT_ID_2 = "candidate_review_package_structure_plan_2";
const RECONSTRUCTION_PACKAGE_ARTIFACT_ID = "reconstruction_package_structure_plan_1";
const RECONSTRUCTION_PACKAGE_ARTIFACT_ID_2 = "reconstruction_package_structure_plan_2";

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
    confidence: { level: "HIGH", reasons: [`SOURCE_CONFIDENCE:${candidateId}`] },
    sourceCandidateRefs: [`candidate-discovery:${DISCOVERY_ARTIFACT_ID}:${candidateId}`],
    evidenceRefs: [`evidence:${candidateId}`],
  };
}

function validPackage(input: {
  candidateReviewPackageArtifactId?: string;
  approvedCandidateRefs?: readonly ReconstructionPackageCandidateRef[];
  createdAt?: string;
  diagnostic?: string;
} = {}): ReconstructionPackage {
  const candidateReviewPackageArtifactId = input.candidateReviewPackageArtifactId ?? REVIEW_ARTIFACT_ID;
  const approvedCandidateRefs = input.approvedCandidateRefs ?? [
    candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
  ];
  return {
    reconstructionPackageId: `reconstruction-package:${candidateReviewPackageArtifactId}:${RECONSTRUCTION_PACKAGE_CONTRACT_VERSION}`,
    reconstructionPackageStatus: "valid",
    candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    contractVersion: RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
    createdAt: input.createdAt ?? "2026-06-25T08:00:00.000Z",
    lineage: {
      candidateReviewPackageArtifactId,
      candidateReviewPackageId: `candidate-review:${candidateReviewPackageArtifactId}`,
      candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
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
    limitations: [],
    diagnostics: [input.diagnostic ?? "RECONSTRUCTION_PACKAGE_VALID"],
  };
}

function blockedPackage(): ReconstructionPackage {
  return createBlockedReconstructionPackage({
    candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID,
    candidateReviewPackageId: `candidate-review:${REVIEW_ARTIFACT_ID}`,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-25T08:00:00.000Z",
    rejectedCount: 1,
    diagnostics: ["RECONSTRUCTION_PACKAGE_BLOCKED"],
  });
}

function reconstructionPackageArtifact(
  artifactId: string,
  packageValue: ReconstructionPackage,
  persistedAt: string,
) {
  return {
    kind: "reconstruction_package",
    artifactKind: "reconstruction_package",
    artifactVersion: 1,
    artifactId,
    reconstructionPackageId: packageValue.reconstructionPackageId,
    candidateReviewPackageArtifactId: packageValue.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: packageValue.candidateDiscoveryArtifactId,
    siteVersionId: packageValue.siteVersionId,
    dryRunId: packageValue.dryRunId,
    status: packageValue.reconstructionPackageStatus,
    includedCount: packageValue.eligibilitySummary.includedCount,
    excludedCount: packageValue.eligibilitySummary.excludedCount,
    approvedCount: packageValue.eligibilitySummary.approvedCount,
    contractVersion: packageValue.contractVersion,
    createdAt: packageValue.createdAt,
    persistedAt,
    package: packageValue,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: ["RECONSTRUCTION_PACKAGE_VALIDATION_PASSED"],
  };
}

function buildPlan(
  packageValue: ReconstructionPackage,
  reconstructionPackageArtifactId = RECONSTRUCTION_PACKAGE_ARTIFACT_ID,
  latestReconstructionPackageArtifactId = reconstructionPackageArtifactId,
): StructurePlan {
  return buildStructurePlan({
    reconstructionPackage: packageValue,
    reconstructionPackageArtifactId,
    latestReconstructionPackageArtifactId,
  });
}

function memoryStore(packageValue = validPackage()) {
  const reconstructionArtifact = reconstructionPackageArtifact(
    RECONSTRUCTION_PACKAGE_ARTIFACT_ID,
    packageValue,
    "2026-06-25T08:05:00.000Z",
  );
  let summary = {
    kind: "runtime_import_provenance_summary_v1",
    reconstructionPackageArtifacts: [reconstructionArtifact],
    latestReconstructionPackageArtifact: reconstructionArtifact,
  } as unknown as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as StructurePlanProvenanceSummary; },
    get writes() { return writes; },
    advanceLatestReconstructionPackage(nextPackage = validPackage({
      candidateReviewPackageArtifactId: REVIEW_ARTIFACT_ID_2,
      approvedCandidateRefs: [
        candidateRef("candidate:route:/about", "route", "/about", "review-route-about-approved"),
      ],
      diagnostic: "RECONSTRUCTION_PACKAGE_VALID_CHANGED",
    })) {
      const nextArtifact = reconstructionPackageArtifact(
        RECONSTRUCTION_PACKAGE_ARTIFACT_ID_2,
        nextPackage,
        "2026-06-25T08:10:00.000Z",
      );
      summary = {
        ...(summary as Record<string, unknown>),
        reconstructionPackageArtifacts: [
          ...((summary as Record<string, unknown>).reconstructionPackageArtifacts as unknown[]),
          nextArtifact,
        ],
        latestReconstructionPackageArtifact: nextArtifact,
      } as unknown as RuntimeImportProvenanceSummary;
      return { packageValue: nextPackage, artifact: nextArtifact };
    },
    options: {
      persistedAt: "2026-06-25T09:00:00.000Z",
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
  plan: StructurePlan,
  persistedAt = store.options.persistedAt,
) {
  return persistStructurePlan({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reconstructionPackageArtifactId: plan.reconstructionPackageArtifactId,
    candidateReviewPackageArtifactId: plan.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: plan.candidateDiscoveryArtifactId,
    plan,
    contractVersion: STRUCTURE_PLAN_CONTRACT_VERSION,
    options: { ...store.options, persistedAt },
  });
}

test("valid Structure Plan persists with complete metadata", async () => {
  const packageValue = validPackage({
    approvedCandidateRefs: [
      candidateRef("candidate:route:/", "route", "/", "review-route-approved"),
      candidateRef("candidate:navigation:primary", "navigation", "/", "review-navigation-approved"),
      candidateRef("candidate:section:hero", "section", "/", "review-section-approved"),
    ],
  });
  const store = memoryStore(packageValue);
  const plan = buildPlan(packageValue);
  const ref = await persist(store, plan);

  assert.equal(ref.kind, STRUCTURE_PLAN_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, STRUCTURE_PLAN_ARTIFACT_KIND);
  assert.equal(ref.structurePlanId, plan.structurePlanId);
  assert.equal(ref.reconstructionPackageArtifactId, RECONSTRUCTION_PACKAGE_ARTIFACT_ID);
  assert.equal(ref.candidateReviewPackageArtifactId, REVIEW_ARTIFACT_ID);
  assert.equal(ref.candidateDiscoveryArtifactId, DISCOVERY_ARTIFACT_ID);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.status, "valid");
  assert.equal(ref.plannedRouteCount, 1);
  assert.equal(ref.plannedNavigationCount, 1);
  assert.equal(ref.plannedSectionCount, 1);
  assert.equal(ref.assignmentCount, 3);
  assert.equal(ref.blockedCandidateCount, 0);
  assert.equal(ref.contractVersion, STRUCTURE_PLAN_CONTRACT_VERSION);
  assert.equal(ref.createdAt, plan.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["STRUCTURE_PLAN_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.structurePlanArtifacts?.[0]?.plan, plan);
});

test("blocked Structure Plan persists as a non-generation audit artifact", async () => {
  const packageValue = blockedPackage();
  const store = memoryStore(packageValue);
  const plan = buildPlan(packageValue);
  const ref = await persist(store, plan);

  assert.equal(ref.status, "blocked");
  assert.equal(ref.plannedRouteCount, 0);
  assert.equal(ref.plannedNavigationCount, 0);
  assert.equal(ref.plannedSectionCount, 0);
  assert.equal(ref.assignmentCount, 0);
  assert.equal(ref.blockedCandidateCount, 0);
  assert.equal(store.summary.latestStructurePlanArtifact?.status, "blocked");
});

test("latest and by-id loads return cloned full artifact records", async () => {
  const store = memoryStore();
  const plan = buildPlan(validPackage());
  const ref = await persist(store, plan);
  const latest = await loadLatestStructurePlan({ siteVersionId: SITE_VERSION_ID, options: store.options });
  const byId = await loadStructurePlanById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  (latest!.plan.diagnostics as string[])[0] = "MUTATED";
  assert.notEqual((await loadLatestStructurePlan({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    options: store.options,
  }))?.plan.diagnostics[0], "MUTATED");
  assert.equal(await loadStructurePlanById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent Structure Plan reuses latest artifact despite retry-only createdAt change", async () => {
  const store = memoryStore();
  const firstPackage = validPackage();
  const first = await persist(store, buildPlan(firstPackage));
  const retryPackage = validPackage({ createdAt: "2026-06-25T09:30:00.000Z" });
  const second = await persist(
    store,
    buildPlan(retryPackage),
    "2026-06-25T09:35:00.000Z",
  );

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.structurePlanArtifacts?.length, 1);
  assert.equal(store.summary.latestStructurePlanArtifact?.artifactId, first.artifactId);
  assert.equal(store.summary.latestStructurePlanArtifact?.createdAt, "2026-06-25T08:00:00.000Z");
});

test("changed current Structure Plan appends history and advances latest pointer", async () => {
  const store = memoryStore();
  const first = await persist(store, buildPlan(validPackage()));
  const next = store.advanceLatestReconstructionPackage();
  const second = await persist(
    store,
    buildPlan(next.packageValue, RECONSTRUCTION_PACKAGE_ARTIFACT_ID_2),
    "2026-06-25T09:05:00.000Z",
  );

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.structurePlanArtifacts?.length, 2);
  assert.equal(store.summary.latestStructurePlanArtifact?.artifactId, second.artifactId);
  assert.equal((await loadStructurePlanById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("stale, invalid, and invalid-lineage Structure Plans are rejected before write", async () => {
  const staleStore = memoryStore();
  const stalePlan = buildPlan(validPackage());
  staleStore.advanceLatestReconstructionPackage();
  await assert.rejects(() => persist(staleStore, stalePlan), (error: unknown) => {
    assert.ok(error instanceof StructurePlanPersistenceValidationError);
    assert.ok(error.validation.errors.includes("reconstructionPackageArtifactId must match the latest Reconstruction Package artifact for this lineage"));
    return true;
  });

  const invalidStore = memoryStore();
  const invalidPlan = {
    ...buildPlan(validPackage()),
    assignments: [],
  } as unknown as StructurePlan;
  await assert.rejects(() => persist(invalidStore, invalidPlan), (error: unknown) => {
    assert.ok(error instanceof StructurePlanPersistenceValidationError);
    assert.ok(error.validation.errors.includes("assignments must cover every included approved candidate exactly once"));
    return true;
  });

  const lineageStore = memoryStore();
  const wrongLineage = {
    ...buildPlan(validPackage()),
    lineage: { ...buildPlan(validPackage()).lineage, reconstructionPackageId: "reconstruction-package:other" },
  } as StructurePlan;
  await assert.rejects(() => persist(lineageStore, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof StructurePlanPersistenceValidationError);
    assert.ok(error.validation.errors.includes("plan.lineage.reconstructionPackageId must match the Reconstruction Package"));
    return true;
  });

  assert.equal(staleStore.writes, 0);
  assert.equal(invalidStore.writes, 0);
  assert.equal(lineageStore.writes, 0);
});

test("stale and invalid statuses are rejected before write", async () => {
  const store = memoryStore();
  const stale = {
    ...buildPlan(validPackage()),
    structurePlanStatus: "stale" as const,
  };
  const invalid = {
    ...buildPlan(validPackage()),
    structurePlanStatus: "invalid" as const,
  };

  for (const plan of [stale, invalid]) {
    await assert.rejects(() => persist(store, plan), (error: unknown) => {
      assert.ok(error instanceof StructurePlanPersistenceValidationError);
      assert.ok(error.validation.errors.includes("structurePlanStatus must be valid or blocked for persistence"));
      return true;
    });
  }
  assert.equal(store.writes, 0);
});

test("forbidden generated fields are rejected recursively", async () => {
  const store = memoryStore();
  const forbidden = {
    ...buildPlan(validPackage()),
    diagnostics: [{ generatedBlocks: [{ kind: "forbidden" }] }],
  } as unknown as StructurePlan;

  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof StructurePlanPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("generatedBlocks is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});
