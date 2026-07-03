import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import type { WebsiteDesignBriefArtifact } from "./website-design-brief-contract";
import {
  WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND,
  WebsiteDesignBriefPersistenceValidationError,
  loadLatestWebsiteDesignBrief,
  loadWebsiteDesignBriefById,
  persistWebsiteDesignBrief,
  type WebsiteDesignBriefProvenanceSummary,
} from "./website-design-brief-persistence";
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
  status?: WebsiteDesignBriefArtifact["status"];
} = {}): WebsiteDesignBriefArtifact {
  const dbt = alignedDigitalBusinessTwinFixture();
  const value = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
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
    get summary() { return summary as WebsiteDesignBriefProvenanceSummary; },
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
  return persistWebsiteDesignBrief({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("valid Website Design Brief artifact persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, WEBSITE_DESIGN_BRIEF_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.websiteDesignBriefId, value.websiteDesignBriefId);
  assert.equal(ref.sourceDigitalBusinessTwinId, value.sourceDigitalBusinessTwinId);
  assert.equal(ref.sourceBusinessAlignmentId, value.sourceBusinessAlignmentId);
  assert.equal(ref.status, value.status);
  assert.equal(ref.sectionCount, value.sections.length);
  assert.equal(ref.contractVersion, "MVP-1E");
  assert.equal(ref.runtimeVersion, "MVP-1E");
  assert.equal(ref.createdAt, value.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["WEBSITE_DESIGN_BRIEF_ARTIFACT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.websiteDesignBriefArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full Website Design Brief records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestWebsiteDesignBrief({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadWebsiteDesignBriefById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestWebsiteDesignBrief({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadWebsiteDesignBriefById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest Website Design Brief artifact reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-03T13:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-03T13:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.websiteDesignBriefArtifacts?.length, 1);
  assert.equal(store.summary.latestWebsiteDesignBriefArtifact?.artifactId, first.artifactId);
});

test("changed Website Design Brief artifact appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({ extraDiagnostic: "WEBSITE_DESIGN_BRIEF_CHANGED" });
  const second = await persist(store, changed, "2026-07-03T12:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.websiteDesignBriefArtifacts?.length, 2);
  assert.equal(store.summary.latestWebsiteDesignBriefArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestWebsiteDesignBrief({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadWebsiteDesignBriefById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid lineage and forbidden fields reject before write", async () => {
  const store = memoryStore();
  const wrongLineage = { ...artifact(), dryRunId: "other-dry-run" };
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof WebsiteDesignBriefPersistenceValidationError);
    assert.ok(error.validation.errors.includes("artifact.dryRunId must match persisted dryRunId"));
    return true;
  });

  const forbidden = { ...artifact(), generatedWebsite: { prompt: "nope" } } as unknown as WebsiteDesignBriefArtifact;
  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof WebsiteDesignBriefPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("generatedWebsite is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("invalid and stale artifacts are rejected while blocked artifacts persist", async () => {
  const store = memoryStore();
  for (const status of ["stale", "invalid"] as const) {
    await assert.rejects(() => persist(store, artifact({ status })), (error: unknown) => {
      assert.ok(error instanceof WebsiteDesignBriefPersistenceValidationError);
      assert.ok(error.validation.errors.includes("Website Design Brief artifact status must not be invalid or stale for persistence"));
      return true;
    });
  }

  const blockedDbt = alignedDigitalBusinessTwinFixture({ status: "blocked" });
  const blocked = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: blockedDbt,
    businessAlignment: businessAlignmentFixture(blockedDbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const ref = await persist(store, blocked);
  assert.equal(ref.status, "blocked");
  assert.equal(store.writes, 1);
});
