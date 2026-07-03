import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import type { WebsiteGenerationPackageArtifact } from "./website-generation-package-contract";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND,
  WebsiteGenerationPackagePersistenceValidationError,
  loadLatestWebsiteGenerationPackage,
  loadWebsiteGenerationPackageById,
  persistWebsiteGenerationPackage,
  type WebsiteGenerationPackageProvenanceSummary,
} from "./website-generation-package-persistence";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

function artifact(input: {
  createdAt?: string;
  extraDiagnostic?: string;
  status?: WebsiteGenerationPackageArtifact["status"];
} = {}): WebsiteGenerationPackageArtifact {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const value = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: input.createdAt ?? WDB_TEST_CREATED_AT,
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
    get summary() { return summary as WebsiteGenerationPackageProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-03T12:30:00.000Z",
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
  return persistWebsiteGenerationPackage({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("valid Website Generation Package artifact persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, WEBSITE_GENERATION_PACKAGE_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.websiteGenerationPackageId, value.websiteGenerationPackageId);
  assert.equal(ref.sourceWebsiteDesignBriefId, value.sourceWebsiteDesignBriefId);
  assert.equal(ref.status, value.status);
  assert.equal(ref.objectiveCount, value.generationObjectives.length);
  assert.equal(ref.audienceCount, value.audience.length);
  assert.equal(ref.messageCount, value.messages.length);
  assert.equal(ref.pageContractCount, value.pageContracts.length);
  assert.equal(ref.sectionContractCount, value.sectionContracts.length);
  assert.equal(ref.contentRequirementCount, value.contentRequirements.length);
  assert.equal(ref.constraintCount, value.constraints.length);
  assert.equal(ref.validationExpectationCount, value.validationContract.expectations.length);
  assert.equal(ref.contractVersion, "MVP-1F");
  assert.equal(ref.runtimeVersion, "MVP-1F");
  assert.equal(ref.createdAt, value.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["WEBSITE_GENERATION_PACKAGE_ARTIFACT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.websiteGenerationPackageArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full Website Generation Package records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestWebsiteGenerationPackage({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadWebsiteGenerationPackageById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestWebsiteGenerationPackage({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadWebsiteGenerationPackageById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest Website Generation Package artifact reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-03T13:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-03T13:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.websiteGenerationPackageArtifacts?.length, 1);
  assert.equal(store.summary.latestWebsiteGenerationPackageArtifact?.artifactId, first.artifactId);
});

test("changed Website Generation Package artifact appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({ extraDiagnostic: "WEBSITE_GENERATION_PACKAGE_CHANGED" });
  const second = await persist(store, changed, "2026-07-03T12:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.websiteGenerationPackageArtifacts?.length, 2);
  assert.equal(store.summary.latestWebsiteGenerationPackageArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestWebsiteGenerationPackage({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadWebsiteGenerationPackageById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid lineage and forbidden fields reject before write", async () => {
  const store = memoryStore();
  const wrongLineage = { ...artifact(), dryRunId: "other-dry-run" };
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof WebsiteGenerationPackagePersistenceValidationError);
    assert.ok(error.validation.errors.includes("artifact.dryRunId must match persisted dryRunId"));
    return true;
  });

  const forbidden = { ...artifact(), providerPayload: { prompt: "nope" } } as unknown as WebsiteGenerationPackageArtifact;
  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof WebsiteGenerationPackagePersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("providerPayload is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("invalid and stale artifacts are rejected while blocked artifacts persist", async () => {
  const store = memoryStore();
  for (const status of ["stale", "invalid"] as const) {
    await assert.rejects(() => persist(store, artifact({ status })), (error: unknown) => {
      assert.ok(error instanceof WebsiteGenerationPackagePersistenceValidationError);
      assert.ok(error.validation.errors.includes("Website Generation Package artifact status must not be invalid or stale for persistence"));
      return true;
    });
  }

  const blocked = artifact({ status: "blocked" });
  const ref = await persist(store, blocked);
  assert.equal(ref.status, "blocked");
  assert.equal(store.writes, 1);
});
