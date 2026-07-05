import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import type { GenerationContractComplianceArtifact } from "./generation-contract-compliance-contract";
import {
  GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND,
  GenerationContractCompliancePersistenceValidationError,
  loadGenerationContractComplianceById,
  loadLatestGenerationContractCompliance,
  persistGenerationContractCompliance,
  type GenerationContractComplianceProvenanceSummary,
} from "./generation-contract-compliance-persistence";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import {
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

function artifact(input: {
  createdAt?: string;
  extraDiagnostic?: string;
  status?: GenerationContractComplianceArtifact["status"];
  changed?: boolean;
} = {}): GenerationContractComplianceArtifact {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const observedWebsiteModel = observedWebsiteModelFixture(websiteGenerationPackage, {
    omitNavigation: input.changed,
  });
  const value = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: input.createdAt ?? GCC_TEST_CREATED_AT,
  });
  return {
    ...value,
    ...(input.status ? { status: input.status } : {}),
    diagnostics: input.extraDiagnostic
      ? [...value.diagnostics, input.extraDiagnostic]
      : value.diagnostics,
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as GenerationContractComplianceProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-05T15:30:00.000Z",
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
  value = artifact(),
  persistedAt?: string,
) {
  return persistGenerationContractCompliance({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("compliance artifact persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, GENERATION_CONTRACT_COMPLIANCE_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.generationContractComplianceId, value.generationContractComplianceId);
  assert.equal(ref.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(ref.sourceObservedWebsiteModelId, value.sourceObservedWebsiteModelId);
  assert.equal(ref.status, "compliant");
  assert.equal(ref.categoryCount, value.categoryResults.length);
  assert.equal(ref.findingCount, value.findings.length);
  assert.equal(ref.evidenceCount, value.evidence.length);
  assert.equal(ref.runtimeVersion, "MVP-1K-4");
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(store.summary.generationContractComplianceArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full compliance records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestGenerationContractCompliance({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadGenerationContractComplianceById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestGenerationContractCompliance({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadGenerationContractComplianceById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest compliance artifact reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-05T16:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-05T16:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.generationContractComplianceArtifacts?.length, 1);
  assert.equal(store.summary.latestGenerationContractComplianceArtifact?.artifactId, first.artifactId);
});

test("changed compliance artifact appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({ changed: true });
  const second = await persist(store, changed, "2026-07-05T15:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.generationContractComplianceArtifacts?.length, 2);
  assert.equal(store.summary.latestGenerationContractComplianceArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestGenerationContractCompliance({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadGenerationContractComplianceById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid and stale reject while blocked, partial, compliant, and non-compliant persist", async () => {
  const store = memoryStore();
  for (const status of ["invalid", "stale"] as const) {
    await assert.rejects(() => persist(store, artifact({ status })), (error: unknown) => {
      assert.ok(error instanceof GenerationContractCompliancePersistenceValidationError);
      assert.ok(error.validation.errors.includes(
        "Generation Contract Compliance artifact status must not be invalid or stale for persistence",
      ));
      return true;
    });
  }

  const blocked = await persist(store, artifact({ status: "blocked" }), "2026-07-05T15:40:00.000Z");
  const partial = await persist(store, artifact({ status: "partial" }), "2026-07-05T15:41:00.000Z");
  const compliant = await persist(store, artifact(), "2026-07-05T15:42:00.000Z");
  const nonCompliant = await persist(store, artifact({ changed: true }), "2026-07-05T15:43:00.000Z");

  assert.equal(blocked.status, "blocked");
  assert.equal(partial.status, "partial");
  assert.equal(compliant.status, "compliant");
  assert.equal(nonCompliant.status, "non_compliant");
});
