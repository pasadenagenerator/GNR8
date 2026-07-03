import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildBusinessDiscoveryFromSiteEvidence } from "./business-discovery-builder";
import type { BusinessAlignmentArtifact, BusinessAlignmentCorrection, BusinessAlignmentDecision } from "./business-alignment-contract";
import { applyBusinessAlignment } from "./business-alignment-runtime";
import { buildBusinessUnderstandingReportFromDigitalBusinessTwin } from "./business-understanding-report-builder";
import { buildDigitalBusinessTwinFromBusinessDiscovery } from "./digital-business-twin-builder";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import {
  BUSINESS_ALIGNMENT_ARTIFACT_KIND,
  BusinessAlignmentPersistenceValidationError,
  loadBusinessAlignmentById,
  loadLatestBusinessAlignment,
  persistBusinessAlignment,
  type BusinessAlignmentProvenanceSummary,
} from "./business-alignment-persistence";

const SITE_VERSION_ID = "site-version-business-alignment-persistence";
const DRY_RUN_ID = "dry-run-business-alignment-persistence";
const CREATED_AT = "2026-07-03T10:00:00.000Z";

function baseline(): EvidenceCaptureBaselineArtifactRecord {
  return {
    routePath: "/",
    sourceUrl: "https://www.example.test/",
    finalUrl: "https://www.example.test/",
    limitations: [],
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

function correction(input: Partial<BusinessAlignmentCorrection> & Pick<BusinessAlignmentCorrection, "correctionId" | "domain" | "type">): BusinessAlignmentCorrection {
  return {
    evidenceRefs: [{
      refId: `owner-note:${input.correctionId}`,
      sourceKind: "business_alignment_correction",
    }],
    limitations: [],
    diagnostics: ["BUSINESS_ALIGNMENT_PERSISTENCE_TEST_FIXTURE"],
    ...input,
  };
}

function decision(correctionIds: string[], status: BusinessAlignmentDecision["status"] = "applied"): BusinessAlignmentDecision {
  return {
    decisionId: `business-alignment-decision:${correctionIds.join("-")}:${status}`,
    status,
    correctionIds,
    summary: "Business owner applied explicit corrections.",
    decidedAt: CREATED_AT,
    diagnostics: ["BUSINESS_ALIGNMENT_DECISION_PERSISTENCE_TEST_FIXTURE"],
  };
}

function artifact(input: {
  createdAt?: string;
  extraDiagnostic?: string;
  status?: BusinessAlignmentArtifact["status"];
} = {}): BusinessAlignmentArtifact {
  const discovery = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: baseline(),
  });
  const dbt = buildDigitalBusinessTwinFromBusinessDiscovery({
    sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-alignment-persistence",
    businessDiscoveryArtifact: discovery,
    createdAt: CREATED_AT,
  });
  const bur = buildBusinessUnderstandingReportFromDigitalBusinessTwin({
    sourceDigitalBusinessTwinArtifactId: "digital-business-twin-artifact-alignment-persistence",
    digitalBusinessTwinArtifact: dbt,
    createdAt: CREATED_AT,
  });
  const target = dbt.knowledgeItems[0];
  assert.ok(target, "expected fixture knowledge item");
  const confirm = correction({
    correctionId: "confirm-persistence",
    domain: target.domain,
    type: "confirm",
    targetKnowledgeItemId: target.knowledgeItemId,
  });
  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [decision([confirm.correctionId])],
    corrections: [confirm],
    createdAt: input.createdAt ?? CREATED_AT,
  });
  return {
    ...result.businessAlignmentArtifact,
    ...(input.status ? { status: input.status } : {}),
    diagnostics: input.extraDiagnostic
      ? [...result.businessAlignmentArtifact.diagnostics, input.extraDiagnostic]
      : result.businessAlignmentArtifact.diagnostics,
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as BusinessAlignmentProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-03T10:30:00.000Z",
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
  return persistBusinessAlignment({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("valid Business Alignment artifact persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, BUSINESS_ALIGNMENT_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, BUSINESS_ALIGNMENT_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.businessAlignmentId, value.businessAlignmentId);
  assert.equal(ref.sourceBusinessUnderstandingReportId, value.sourceBusinessUnderstandingReportId);
  assert.equal(ref.sourceDigitalBusinessTwinId, value.sourceDigitalBusinessTwinId);
  assert.equal(ref.outputDigitalBusinessTwinId, value.lineage.outputDigitalBusinessTwinId);
  assert.equal(ref.status, value.status);
  assert.equal(ref.decisionCount, 1);
  assert.equal(ref.correctionCount, 1);
  assert.equal(ref.contractVersion, "MVP-1D");
  assert.equal(ref.runtimeVersion, "MVP-1D");
  assert.equal(ref.createdAt, value.createdAt);
  assert.equal(ref.persistedAt, store.options.persistedAt);
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["BUSINESS_ALIGNMENT_ARTIFACT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.businessAlignmentArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full Business Alignment records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestBusinessAlignment({ siteVersionId: SITE_VERSION_ID, options: store.options });
  const byId = await loadBusinessAlignmentById({ siteVersionId: SITE_VERSION_ID, artifactId: ref.artifactId, options: store.options });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestBusinessAlignment({ siteVersionId: SITE_VERSION_ID, options: store.options }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadBusinessAlignmentById({ siteVersionId: SITE_VERSION_ID, artifactId: "missing", options: store.options }), null);
});

test("equivalent latest Business Alignment artifact reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-03T11:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-03T11:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.businessAlignmentArtifacts?.length, 1);
  assert.equal(store.summary.latestBusinessAlignmentArtifact?.artifactId, first.artifactId);
});

test("changed Business Alignment artifact appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({ extraDiagnostic: "BUSINESS_ALIGNMENT_CHANGED" });
  const second = await persist(store, changed, "2026-07-03T10:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.businessAlignmentArtifacts?.length, 2);
  assert.equal(store.summary.latestBusinessAlignmentArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestBusinessAlignment({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID, options: store.options }))?.artifactId, second.artifactId);
  assert.equal((await loadBusinessAlignmentById({ siteVersionId: SITE_VERSION_ID, artifactId: first.artifactId, options: store.options }))?.artifactId, first.artifactId);
});

test("invalid lineage and forbidden fields reject before write", async () => {
  const store = memoryStore();
  const wrongLineage = { ...artifact(), dryRunId: "other-dry-run" };
  await assert.rejects(() => persist(store, wrongLineage), (error: unknown) => {
    assert.ok(error instanceof BusinessAlignmentPersistenceValidationError);
    assert.ok(error.validation.errors.includes("artifact.dryRunId must match persisted dryRunId"));
    return true;
  });

  const forbidden = { ...artifact(), providerPayload: { prompt: "nope" } } as unknown as BusinessAlignmentArtifact;
  await assert.rejects(() => persist(store, forbidden), (error: unknown) => {
    assert.ok(error instanceof BusinessAlignmentPersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("providerPayload is forbidden")));
    return true;
  });
  assert.equal(store.writes, 0);
});

test("invalid and stale artifacts are rejected while blocked artifacts persist", async () => {
  const store = memoryStore();
  for (const status of ["stale", "invalid"] as const) {
    await assert.rejects(() => persist(store, artifact({ status })), (error: unknown) => {
      assert.ok(error instanceof BusinessAlignmentPersistenceValidationError);
      assert.ok(error.validation.errors.includes("Business Alignment artifact status must not be invalid or stale for persistence"));
      return true;
    });
  }

  const blocked = artifact({ status: "blocked" });
  const ref = await persist(store, blocked);
  assert.equal(ref.status, "blocked");
  assert.equal(store.writes, 1);
});
