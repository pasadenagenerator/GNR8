import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildBusinessDiscoveryFromSiteEvidence } from "./business-discovery-builder";
import type { BusinessDiscoveryArtifact } from "./business-discovery-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import {
  BUSINESS_DISCOVERY_ARTIFACT_KIND,
  BusinessDiscoveryPersistenceValidationError,
  loadBusinessDiscoveryArtifactById,
  loadLatestBusinessDiscoveryArtifact,
  persistBusinessDiscoveryArtifact,
  type BusinessDiscoveryProvenanceSummary,
} from "./business-discovery-persistence";

const SITE_VERSION_ID = "site-version-business-discovery-persistence";
const DRY_RUN_ID = "dry-run-business-discovery-persistence";
const CREATED_AT = "2026-07-01T08:00:00.000Z";

function baseline(): EvidenceCaptureBaselineArtifactRecord {
  return {
    routePath: "/",
    sourceUrl: "https://www.example.test/",
    finalUrl: "https://www.example.test/",
    limitations: ["partial_asset_inventory"],
    fidelityLimitations: [],
    captureExpansionEvidence: {
      layoutGeometryEvidence: [],
      sectionBoundaryEvidence: [{
        sectionId: "section-home-hero",
        routePath: "/",
        regionType: "hero",
        selector: "main > section:nth-of-type(1)",
        boundingBox: { x: 0, y: 80, width: 1280, height: 520 },
        confidenceLevel: "HIGH",
      }],
      navigationEvidence: [{
        routePath: "/",
        navigationItems: [
          { label: "Home", href: "/", position: 0, confidenceLevel: "HIGH" },
          { label: "Services", href: "/services", position: 1, confidenceLevel: "HIGH" },
          { label: "Contact", href: "/contact", position: 2, confidenceLevel: "HIGH" },
        ],
        navigationCount: 3,
        sourceEvidenceRefs: ["navigation-ref"],
      }],
    },
    summaries: {
      assetInventory: { persistedAssetCount: 2 },
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function artifact(input: {
  createdAt?: string;
  diagnostic?: string;
  status?: BusinessDiscoveryArtifact["status"];
} = {}): BusinessDiscoveryArtifact {
  const built = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: input.createdAt ?? CREATED_AT,
    evidenceCaptureBaseline: baseline(),
  });
  return {
    ...built,
    ...(input.status ? { status: input.status } : {}),
    diagnostics: input.diagnostic
      ? [...built.diagnostics, input.diagnostic]
      : built.diagnostics,
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as BusinessDiscoveryProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-01T09:00:00.000Z",
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
  value = artifact(),
  persistedAt?: string,
) {
  return persistBusinessDiscoveryArtifact({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("valid Business Discovery artifact persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, BUSINESS_DISCOVERY_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, BUSINESS_DISCOVERY_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.businessDiscoveryId, value.businessDiscoveryId);
  assert.equal(ref.status, value.status);
  assert.equal(ref.findingCount, value.findings.length);
  assert.equal(ref.limitationCount, value.limitations.length);
  assert.equal(ref.blockerCount, 0);
  assert.equal(ref.domainCount, 9);
  assert.equal(ref.contractVersion, "MVP-1A");
  assert.equal(ref.builderVersion, "MVP-1A");
  assert.equal(ref.createdAt, value.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["BUSINESS_DISCOVERY_ARTIFACT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.businessDiscoveryArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full artifact records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestBusinessDiscoveryArtifact({ siteVersionId: SITE_VERSION_ID, options: store.options });
  const byId = await loadBusinessDiscoveryArtifactById({ siteVersionId: SITE_VERSION_ID, artifactId: ref.artifactId, options: store.options });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.equal((await loadLatestBusinessDiscoveryArtifact({ siteVersionId: SITE_VERSION_ID, options: store.options }))?.artifact.diagnostics[0], "BUSINESS_DISCOVERY_BUILDER_VERSION:MVP-1A");
  assert.equal(await loadBusinessDiscoveryArtifactById({ siteVersionId: SITE_VERSION_ID, artifactId: "missing", options: store.options }), null);
});

test("equivalent latest Business Discovery artifact reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-01T10:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-01T11:00:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.businessDiscoveryArtifacts?.length, 1);
  assert.equal(store.summary.latestBusinessDiscoveryArtifact?.artifactId, first.artifactId);
});

test("changed Business Discovery artifact appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({ diagnostic: "BUSINESS_DISCOVERY_CHANGED" });
  const second = await persist(store, changed, "2026-07-01T09:05:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.businessDiscoveryArtifacts?.length, 2);
  assert.equal(store.summary.latestBusinessDiscoveryArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestBusinessDiscoveryArtifact({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID, options: store.options }))?.artifactId, second.artifactId);
  assert.equal((await loadBusinessDiscoveryArtifactById({ siteVersionId: SITE_VERSION_ID, artifactId: first.artifactId, options: store.options }))?.artifactId, first.artifactId);
});

test("invalid lineage and forbidden fields reject before write", async () => {
  const store = memoryStore();
  const wrongLineage = { ...artifact(), dryRunId: "other-dry-run" };
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof BusinessDiscoveryPersistenceValidationError);
    assert.ok(error.validation.errors.includes("artifact.dryRunId must match persisted dryRunId"));
    return true;
  });

  const forbidden = { ...artifact(), generatedHtml: "<main />" } as BusinessDiscoveryArtifact;
  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof BusinessDiscoveryPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("generatedHtml is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("stale and invalid artifacts are rejected while blocked artifacts persist", async () => {
  const store = memoryStore();
  for (const status of ["stale", "invalid"] as const) {
    await assert.rejects(() => persist(store, artifact({ status })), (error: unknown) => {
      assert.ok(error instanceof BusinessDiscoveryPersistenceValidationError);
      assert.ok(error.validation.errors.includes("Business Discovery artifact status must not be invalid or stale for persistence"));
      return true;
    });
  }

  const blocked = artifact({ status: "blocked" });
  blocked.limitations = [
    ...blocked.limitations,
    {
      limitationId: "business-discovery:blocker:TEST_BLOCKED",
      severity: "blocker",
      code: "TEST_BLOCKED",
      message: "Blocked artifacts are valid fail-closed records.",
    },
  ];
  const ref = await persist(store, blocked);
  assert.equal(ref.status, "blocked");
  assert.equal(store.writes, 1);
});
