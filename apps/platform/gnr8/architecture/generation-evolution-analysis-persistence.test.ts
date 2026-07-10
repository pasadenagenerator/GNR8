import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import type { GenerationContractComplianceArtifact } from "./generation-contract-compliance-contract";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import { buildGenerationEvolutionAnalysis } from "./generation-evolution-analysis-builder";
import type { GenerationEvolutionAnalysisArtifact } from "./generation-evolution-analysis-contract";
import {
  GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND,
  GenerationEvolutionAnalysisPersistenceValidationError,
  loadGenerationEvolutionAnalysisById,
  loadLatestGenerationEvolutionAnalysis,
  persistGenerationEvolutionAnalysis,
  type GenerationEvolutionAnalysisProvenanceSummary,
} from "./generation-evolution-analysis-persistence";
import {
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

function compliance(input: Parameters<typeof observedWebsiteModelFixture>[1] = {}) {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  return buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, input),
    createdAt: GCC_TEST_CREATED_AT,
  });
}

function analysis(input: {
  createdAt?: string;
  previous?: GenerationContractComplianceArtifact;
  current?: GenerationContractComplianceArtifact;
  status?: GenerationEvolutionAnalysisArtifact["status"];
} = {}): GenerationEvolutionAnalysisArtifact {
  const value = buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance: input.previous ?? compliance({ omitNavigation: true }),
    currentCompliance: input.current ?? compliance(),
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
    get summary() { return summary as GenerationEvolutionAnalysisProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-10T10:00:00.000Z",
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
  value = analysis(),
  persistedAt?: string,
) {
  return persistGenerationEvolutionAnalysis({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("evolution analysis persists with complete metadata", async () => {
  const store = memoryStore();
  const value = analysis();
  const ref = await persist(store, value);

  assert.equal(ref.kind, GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, GENERATION_EVOLUTION_ANALYSIS_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.generationEvolutionAnalysisId, value.generationEvolutionAnalysisId);
  assert.equal(ref.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(ref.previousComplianceArtifactId, value.previousComplianceArtifactId);
  assert.equal(ref.currentComplianceArtifactId, value.currentComplianceArtifactId);
  assert.equal(ref.status, "improved");
  assert.equal(ref.overallAssessment, "limited_improvement");
  assert.equal(ref.recommendedNextAction, "create_compliance_report_v2");
  assert.equal(ref.runtimeVersion, "MVP-2.0-M");
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(store.summary.generationEvolutionAnalysisArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full evolution records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestGenerationEvolutionAnalysis({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadGenerationEvolutionAnalysisById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestGenerationEvolutionAnalysis({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadGenerationEvolutionAnalysisById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest evolution analysis reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = analysis({ createdAt: "2026-07-10T10:10:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-10T10:15:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.generationEvolutionAnalysisArtifacts?.length, 1);
  assert.equal(store.summary.latestGenerationEvolutionAnalysisArtifact?.artifactId, first.artifactId);
});

test("changed evolution analysis appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = analysis({
    previous: compliance(),
    current: compliance({ omitAssets: true }),
  });
  const second = await persist(store, changed, "2026-07-10T10:20:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.generationEvolutionAnalysisArtifacts?.length, 2);
  assert.equal(store.summary.latestGenerationEvolutionAnalysisArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestGenerationEvolutionAnalysis({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadGenerationEvolutionAnalysisById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid and stale reject while blocked and valid outcomes persist", async () => {
  const store = memoryStore();
  for (const status of ["invalid", "stale"] as const) {
    await assert.rejects(() => persist(store, analysis({ status })), (error: unknown) => {
      assert.ok(error instanceof GenerationEvolutionAnalysisPersistenceValidationError);
      assert.ok(error.validation.errors.includes(
        "Generation Evolution Analysis artifact status must not be invalid or stale for persistence",
      ));
      return true;
    });
  }

  const blocked = await persist(store, analysis({ status: "blocked" }), "2026-07-10T10:30:00.000Z");
  const unchanged = await persist(store, analysis({
    previous: compliance(),
    current: compliance(),
  }), "2026-07-10T10:31:00.000Z");
  const regressed = await persist(store, analysis({
    previous: compliance(),
    current: compliance({ omitAssets: true }),
  }), "2026-07-10T10:32:00.000Z");
  const mixed = await persist(store, analysis({
    previous: compliance({ omitNavigation: true }),
    current: compliance({ omitMessages: true }),
  }), "2026-07-10T10:33:00.000Z");

  assert.equal(blocked.status, "blocked");
  assert.equal(unchanged.status, "unchanged");
  assert.equal(regressed.status, "regressed");
  assert.equal(mixed.status, "mixed");
});
