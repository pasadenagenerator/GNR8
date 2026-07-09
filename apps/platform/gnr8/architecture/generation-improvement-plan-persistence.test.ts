import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import { buildGenerationContractComplianceReport } from "./generation-contract-compliance-report-builder";
import type { GenerationImprovementPlanArtifact } from "./generation-improvement-plan-contract";
import { buildGenerationImprovementPlan } from "./generation-improvement-plan-builder";
import {
  GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND,
  GenerationImprovementPlanPersistenceValidationError,
  loadGenerationImprovementPlanById,
  loadLatestGenerationImprovementPlan,
  persistGenerationImprovementPlan,
  type GenerationImprovementPlanProvenanceSummary,
} from "./generation-improvement-plan-persistence";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import {
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

function plan(input: {
  createdAt?: string;
  changed?: boolean;
  status?: GenerationImprovementPlanArtifact["status"];
} = {}): GenerationImprovementPlanArtifact {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const compliance = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, {
      omitNavigation: true,
      omitMessages: input.changed,
    }),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const report = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const value = buildGenerationImprovementPlan({
    generationContractComplianceReport: report,
    createdAt: input.createdAt ?? GCC_TEST_CREATED_AT,
  });
  return {
    ...value,
    ...(input.status ? { status: input.status } : {}),
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as GenerationImprovementPlanProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-09T08:00:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === WDB_TEST_SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, WDB_TEST_SITE_VERSION_ID);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

async function persist(
  store: ReturnType<typeof memoryStore>,
  value = plan(),
  persistedAt?: string,
) {
  return persistGenerationImprovementPlan({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("improvement plan persists with complete metadata", async () => {
  const store = memoryStore();
  const value = plan();
  const ref = await persist(store, value);

  assert.equal(ref.kind, GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, GENERATION_IMPROVEMENT_PLAN_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.generationImprovementPlanId, value.generationImprovementPlanId);
  assert.equal(ref.sourceGenerationContractComplianceReportId, value.sourceGenerationContractComplianceReportId);
  assert.equal(ref.sourceGenerationContractComplianceId, value.sourceGenerationContractComplianceId);
  assert.equal(ref.status, "ready");
  assert.equal(ref.recommendedNextAction, "regenerate");
  assert.equal(ref.estimatedRegenerationReadiness, "ready");
  assert.equal(ref.improvementCount, value.summary.improvementCount);
  assert.equal(ref.runtimeVersion, "MVP-2.0-F");
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(store.summary.generationImprovementPlanArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full improvement plan records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestGenerationImprovementPlan({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadGenerationImprovementPlanById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestGenerationImprovementPlan({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadGenerationImprovementPlanById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest improvement plan reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = plan({ createdAt: "2026-07-09T08:30:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-09T09:00:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.generationImprovementPlanArtifacts?.length, 1);
  assert.equal(store.summary.latestGenerationImprovementPlanArtifact?.artifactId, first.artifactId);
});

test("changed improvement plan appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = plan({ changed: true });
  const second = await persist(store, changed, "2026-07-09T08:10:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.generationImprovementPlanArtifacts?.length, 2);
  assert.equal(store.summary.latestGenerationImprovementPlanArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestGenerationImprovementPlan({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
});

test("invalid and stale improvement plans are rejected before persistence", async () => {
  const store = memoryStore();

  for (const status of ["invalid", "stale"] as const) {
    await assert.rejects(() => persist(store, plan({ status })), (error: unknown) => {
      assert.ok(error instanceof GenerationImprovementPlanPersistenceValidationError);
      assert.ok(error.validation.errors.includes("Generation Improvement Plan artifact status must not be invalid or stale for persistence"));
      return true;
    });
  }
});
