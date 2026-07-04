import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import type { ProviderGenerationPayload } from "./provider-generation-payload-contract";
import {
  PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND,
  ProviderGenerationPayloadPersistenceValidationError,
  loadLatestProviderGenerationPayload,
  loadProviderGenerationPayloadById,
  persistProviderGenerationPayload,
  type ProviderGenerationPayloadProvenanceSummary,
} from "./provider-generation-payload-persistence";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import type { WebsiteDesignBriefArtifact } from "./website-design-brief-contract";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";

function websiteDesignBrief(status?: WebsiteDesignBriefArtifact["status"]): WebsiteDesignBriefArtifact {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  return {
    ...wdb,
    ...(status ? { status } : {}),
  };
}

function artifact(input: {
  createdAt?: string;
  extraDiagnostic?: string;
  sourceStatus?: WebsiteDesignBriefArtifact["status"];
  status?: ProviderGenerationPayload["status"];
} = {}): ProviderGenerationPayload {
  const wgp = buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief(input.sourceStatus),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const value = buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
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
    get summary() { return summary as ProviderGenerationPayloadProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-04T12:30:00.000Z",
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
  return persistProviderGenerationPayload({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("valid Provider Generation Payload persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, PROVIDER_GENERATION_PAYLOAD_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.providerGenerationPayloadId, value.providerGenerationPayloadId);
  assert.equal(ref.providerType, "codex");
  assert.equal(ref.payloadKind, "codex_task");
  assert.equal(ref.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(ref.sourceWebsiteGenerationPackageArtifactId, SOURCE_WGP_ARTIFACT_ID);
  assert.equal(ref.status, value.status);
  assert.equal(ref.constraintCount, value.preservedConstraints.length);
  assert.equal(ref.validationExpectationCount, value.validationExpectations.length);
  assert.equal(ref.contractVersion, "MVP-1H");
  assert.equal(ref.runtimeVersion, "MVP-1H");
  assert.equal(ref.createdAt, value.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["PROVIDER_GENERATION_PAYLOAD_ARTIFACT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.providerGenerationPayloadArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full Provider Generation Payload records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestProviderGenerationPayload({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadProviderGenerationPayloadById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestProviderGenerationPayload({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadProviderGenerationPayloadById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest Provider Generation Payload reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-04T13:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-04T13:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.providerGenerationPayloadArtifacts?.length, 1);
  assert.equal(store.summary.latestProviderGenerationPayloadArtifact?.artifactId, first.artifactId);
});

test("changed Provider Generation Payload appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({ extraDiagnostic: "PROVIDER_GENERATION_PAYLOAD_CHANGED" });
  const second = await persist(store, changed, "2026-07-04T12:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.providerGenerationPayloadArtifacts?.length, 2);
  assert.equal(store.summary.latestProviderGenerationPayloadArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestProviderGenerationPayload({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadProviderGenerationPayloadById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid lineage, forbidden fields, and generated output reject before write", async () => {
  const store = memoryStore();
  const wrongLineage = { ...artifact(), dryRunId: "other-dry-run" };
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof ProviderGenerationPayloadPersistenceValidationError);
    assert.ok(error.validation.errors.includes("artifact.dryRunId must match persisted dryRunId"));
    return true;
  });

  const forbidden = {
    ...artifact(),
    codexTaskEnvelope: {
      ...artifact().codexTaskEnvelope,
      providerResult: {
        generatedHtml: "<main>nope</main>",
      },
    },
  } as unknown as ProviderGenerationPayload;
  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof ProviderGenerationPayloadPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("providerResult is forbidden")));
    assert.ok(error.validation.errors.some((message) => message.includes("generatedHtml is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("invalid and stale payloads are rejected while blocked payloads persist", async () => {
  const store = memoryStore();
  for (const status of ["stale", "invalid"] as const) {
    await assert.rejects(() => persist(store, artifact({ status })), (error: unknown) => {
      assert.ok(error instanceof ProviderGenerationPayloadPersistenceValidationError);
      assert.ok(error.validation.errors.includes("Provider Generation Payload status must not be invalid or stale for persistence"));
      return true;
    });
  }

  const blocked = artifact({ sourceStatus: "blocked" });
  const ref = await persist(store, blocked);
  assert.equal(ref.status, "blocked");
  assert.equal(store.writes, 1);
});
