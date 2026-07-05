import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import { buildGenerationContractComplianceReport } from "./generation-contract-compliance-report-builder";
import type { GenerationContractComplianceReportArtifact } from "./generation-contract-compliance-report-contract";
import {
  GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND,
  GenerationContractComplianceReportPersistenceValidationError,
  loadGenerationContractComplianceReportById,
  loadLatestGenerationContractComplianceReport,
  persistGenerationContractComplianceReport,
  type GenerationContractComplianceReportProvenanceSummary,
} from "./generation-contract-compliance-report-persistence";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import {
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

function report(input: {
  createdAt?: string;
  changed?: boolean;
  status?: GenerationContractComplianceReportArtifact["status"];
} = {}): GenerationContractComplianceReportArtifact {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const compliance = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, {
      omitNavigation: input.changed,
    }),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const value = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
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
    get summary() { return summary as GenerationContractComplianceReportProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-05T17:30:00.000Z",
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
  value = report(),
  persistedAt?: string,
) {
  return persistGenerationContractComplianceReport({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("compliance report persists with complete metadata", async () => {
  const store = memoryStore();
  const value = report();
  const ref = await persist(store, value);

  assert.equal(ref.kind, GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, GENERATION_CONTRACT_COMPLIANCE_REPORT_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.generationContractComplianceReportId, value.generationContractComplianceReportId);
  assert.equal(ref.sourceGenerationContractComplianceId, value.sourceGenerationContractComplianceId);
  assert.equal(ref.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(ref.sourceObservedWebsiteModelId, value.sourceObservedWebsiteModelId);
  assert.equal(ref.status, "ready");
  assert.equal(ref.recommendation, "proceed_to_approval");
  assert.equal(ref.readiness, "ready");
  assert.equal(ref.runtimeVersion, "MVP-1K-5");
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(store.summary.generationContractComplianceReportArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full compliance report records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestGenerationContractComplianceReport({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadGenerationContractComplianceReportById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestGenerationContractComplianceReport({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadGenerationContractComplianceReportById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest compliance report reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = report({ createdAt: "2026-07-05T18:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-05T18:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.generationContractComplianceReportArtifacts?.length, 1);
  assert.equal(store.summary.latestGenerationContractComplianceReportArtifact?.artifactId, first.artifactId);
});

test("changed compliance report appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = report({ changed: true });
  const second = await persist(store, changed, "2026-07-05T17:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.generationContractComplianceReportArtifacts?.length, 2);
  assert.equal(store.summary.latestGenerationContractComplianceReportArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestGenerationContractComplianceReport({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
});

test("invalid report shape is rejected before persistence", async () => {
  const store = memoryStore();
  const value = {
    ...report(),
    siteVersionId: "other-site-version",
  };

  await assert.rejects(() => persist(store, value), (error: unknown) => {
    assert.ok(error instanceof GenerationContractComplianceReportPersistenceValidationError);
    assert.ok(error.validation.errors.includes("artifact.siteVersionId must match persisted siteVersionId"));
    return true;
  });
});
