import assert from "node:assert/strict";
import test from "node:test";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

import type {
  AstroCandidateRuntimeArtifactContext,
  AstroCandidateRuntimeArtifactStore,
  AstroCandidateRuntimeArtifactWrite,
} from "./astro-candidate-runtime-artifact-store";
import {
  AstroCandidatePromotionError,
  createAstroCandidatePromotionService,
} from "./astro-candidate-promotion-service";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import {
  createAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import { AstroProductionCandidateRepositoryError } from "./astro-production-candidate-repository";

const SITE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const OWNERSHIP_SITE_ID = "22222222-2222-4222-8222-222222222222";
const ORGANIZATION_ID = "33333333-3333-4333-8333-333333333333";
const AGENCY_ID = "44444444-4444-4444-8444-444444444444";
const ARTIFACT_ID = "55555555-5555-4555-8555-555555555555";
const CANDIDATE_ID = "astro_candidate_66666666666646668666666666666666";
const SITE_ID = "test-runtime-site-promotion";

const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: SITE_ID,
  siteVersionId: SITE_VERSION_ID,
  ownershipSiteId: OWNERSHIP_SITE_ID,
  organizationId: ORGANIZATION_ID,
  agencyId: AGENCY_ID,
};

test("materializes exact stored Astro HTML/CSS with provenance and honest blocked governance", async () => {
  const record = productionRecord();
  const store = new MemoryStore(runtimeContext());
  const promote = service(record, store);
  const result = await promote(input(record));

  assert.equal(result.status, "materialized");
  assert.equal(result.runtimeArtifactId, ARTIFACT_ID);
  assert.equal(result.htmlPreservedExactly, true);
  assert.equal(result.cssPreservedExactly, true);
  assert.equal(result.governance.status, "blocked");
  assert.deepEqual(result.governance.blockerCodes, ["page_migration_governance_missing"]);
  assert.equal(result.workflowHandoff.recognized, true);
  assert.equal(result.workflowHandoff.approvalState, "ARCHIVED");
  assert.equal(result.workflowHandoff.readyForShadowActivation, false);
  assert.ok(result.workflowHandoff.blockerCodes.includes("site_version_state_archived"));
  assert.equal(result.activePointerChanged, false);
  assert.equal(result.previewBindingsChanged, false);
  assert.equal(result.published, false);

  const stored = store.context.artifact!;
  assert.equal(stored.htmlByPath["/"], record.candidate.htmlByPath["/"]);
  assert.equal(stored.compiledTokenStyles, record.candidate.compiledTokenStyles);
  assert.deepEqual(stored.assetFingerprintMap, record.candidate.assetFingerprintMap);
  const promotion = stored.manifest.astroCandidatePromotion as Record<string, unknown>;
  assert.equal(promotion.candidateContentSha256, record.candidate.contentSha256);
  assert.equal(promotion.candidateStorageSha256, record.storageSha256);
  assert.equal(promotion.sourceSnapshotSha256, record.candidate.manifest.provenance.sourceSnapshotSha256);
  assert.equal(promotion.exportSha256, record.candidate.manifest.provenance.exportSha256);
  assert.equal(promotion.convertedArtifactSha256, record.candidate.manifest.provenance.convertedArtifactSha256);
  assert.equal(promotion.htmlTransformation, "none");
  const recordEvidence = stored.manifest.astroCandidateRecord as {
    schemaVersion: unknown;
    recordKind: unknown;
    identity: unknown;
    registration: unknown;
    storageSha256: unknown;
  };
  assert.equal(recordEvidence.schemaVersion, record.schemaVersion);
  assert.equal(recordEvidence.recordKind, record.recordKind);
  assert.deepEqual(recordEvidence.identity, record.identity);
  assert.deepEqual(recordEvidence.registration, record.registration);
  assert.equal(recordEvidence.storageSha256, record.storageSha256);
});

test("rejects ownership mismatch before candidate storage access", async () => {
  const calls: string[] = [];
  const record = productionRecord();
  const promote = createAstroCandidatePromotionService({
    resolveOwnership: async () => ({ ...OWNERSHIP, siteVersionId: "77777777-7777-4777-8777-777777777777" }),
    readCandidate: async () => {
      calls.push("candidate");
      return record;
    },
    runtimeStore: new MemoryStore(runtimeContext()),
  });
  await assert.rejects(() => promote(input(record)), promotionCode("ownership_mismatch"));
  assert.deepEqual(calls, []);
});

test("rejects stale hash selection and corrupt or unsupported repository outcomes without writing", async (t) => {
  const record = productionRecord();
  await t.test("stale hashes", async () => {
    const store = new MemoryStore(runtimeContext());
    await assert.rejects(
      () => service(record, store)({ ...input(record), expectedContentSha256: "f".repeat(64) }),
      promotionCode("candidate_hash_mismatch"),
    );
    assert.equal(store.writeCount, 0);
  });
  for (const code of ["corrupt", "unsupported_version"] as const) {
    await t.test(code, async () => {
      const store = new MemoryStore(runtimeContext());
      const promote = createAstroCandidatePromotionService({
        resolveOwnership: async () => OWNERSHIP,
        readCandidate: async () => {
          throw new AstroProductionCandidateRepositoryError(code, "candidate rejected");
        },
        runtimeStore: store,
      });
      await assert.rejects(
        () => promote(input(record)),
        (error: unknown) => error instanceof AstroProductionCandidateRepositoryError && error.code === code,
      );
      assert.equal(store.writeCount, 0);
    });
  }
});

test("refuses to overwrite artifacts referenced by active or preview bindings", async (t) => {
  const record = productionRecord();
  for (const context of [
    runtimeContext({ activePointerReferencesArtifact: true }),
    runtimeContext({ previewBindingCount: 1 }),
  ]) {
    await t.test(context.activePointerReferencesArtifact ? "active" : "preview", async () => {
      const store = new MemoryStore(context);
      await assert.rejects(() => service(record, store)(input(record)), promotionCode("runtime_artifact_in_use"));
      assert.equal(store.writeCount, 0);
    });
  }
});

test("persists an actual gate denial and does not convert it into approval", async () => {
  const record = productionRecord();
  const store = new MemoryStore(runtimeContext({ siteVersion: siteVersionWithGovernance() }));
  const result = await service(record, store)(input(record));
  assert.equal(result.governance.status, "evaluated");
  assert.equal(result.governance.decision, "DENY");
  assert.deepEqual(result.governance.blockerCodes, ["publish_enforcement_denied"]);
  assert.equal(result.workflowHandoff.readyForShadowActivation, false);
});

test("identical concurrent promotions converge on one artifact update and idempotent readback", async () => {
  const record = productionRecord();
  const store = new MemoryStore(runtimeContext(), 5);
  const promote = service(record, store);
  const results = await Promise.all([promote(input(record)), promote(input(record))]);
  assert.deepEqual(results.map((result) => result.runtimeArtifactId), [ARTIFACT_ID, ARTIFACT_ID]);
  assert.equal(results.filter((result) => result.status === "materialized").length, 1);
  assert.equal(results.filter((result) => result.status === "idempotent").length, 1);
  assert.equal(store.writeCount, 2);
  assert.equal(store.successfulWriteCount, 1);

  const replay = await promote({ ...input(record), idempotencyKey: "different-safe-retry-key" });
  assert.equal(replay.status, "idempotent");
  assert.equal(store.successfulWriteCount, 1);
});

function service(record: ReturnType<typeof productionRecord>, store: AstroCandidateRuntimeArtifactStore) {
  return createAstroCandidatePromotionService({
    resolveOwnership: async () => OWNERSHIP,
    readCandidate: async () => record,
    runtimeStore: store,
  });
}

function input(record: ReturnType<typeof productionRecord>) {
  return {
    actorUserId: "superadmin-mvp20",
    siteVersionId: SITE_VERSION_ID,
    candidateId: CANDIDATE_ID,
    expectedContentSha256: record.candidate.contentSha256,
    expectedStorageSha256: record.storageSha256,
    idempotencyKey: "astro-promotion-test-1",
  };
}

function productionRecord() {
  const candidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId: CANDIDATE_ID,
    siteId: SITE_ID,
    siteVersionId: SITE_VERSION_ID,
    html: "<!doctype html><html><head><style>.hero{color:#0f766e}</style></head><body><main class=\"hero\"><h1>Exact Astro layout</h1></main></body></html>",
  });
  return createAstroProductionCandidateRecord({
    candidate,
    ownership: OWNERSHIP,
    registration: {
      registeredByActorId: "superadmin-mvp19",
      producerKind: "synthetic_test",
      producerVersion: "v1",
      producerRef: "synthetic:mvp20",
      idempotencyKey: "registration-mvp20",
      correlationId: "registration-correlation-mvp20",
    },
    storedAt: "2026-09-29T09:20:45.080Z",
  });
}

function siteVersionWithoutGovernance(): CanonicalSiteVersionSnapshot {
  return {
    id: SITE_VERSION_ID,
    siteId: SITE_ID,
    versionNo: 1,
    state: "ARCHIVED",
    source: "migration",
    actor: "test",
    createdAt: "2026-09-29T08:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: ARTIFACT_ID,
    pages: [{
      id: "page-version-root",
      siteVersionId: SITE_VERSION_ID,
      pageId: "page-root",
      path: "/",
      title: "Root",
      structureModel: { sections: [{ id: "root", type: "main", order: 0 }] },
      contentModel: { sectionProps: { root: { heading: "Root" } } },
      styleTokens: {},
      assetGraph: [],
      semanticSignals: [],
      migrationGovernance: null,
      source: "migration",
      actor: "test",
      createdAt: "2026-09-29T08:00:00.000Z",
    }],
  };
}

function siteVersionWithGovernance(): CanonicalSiteVersionSnapshot {
  const imported = importHtmlToPage({ slug: "/", html: "<html><body><main><h1>Broken</h1></main></body></html>" });
  const base = siteVersionWithoutGovernance();
  return {
    ...base,
    state: "APPROVED",
    pages: [{
      ...base.pages[0],
      pageId: imported.id,
      structureModel: {
        sections: imported.sections.map((section, order) => ({ id: section.id, type: section.type, order })),
      },
      contentModel: {
        sectionProps: Object.fromEntries(imported.sections.map((section) => [section.id, section.props ?? {}])),
      },
      migrationGovernance: imported.migrationDiagnostics ?? null,
    }],
  };
}

function fallbackArtifact(): RuntimeArtifact {
  return {
    id: ARTIFACT_ID,
    siteId: SITE_ID,
    siteVersionId: SITE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<!doctype html><html><body>Fallback</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { siteId: SITE_ID, siteVersionId: SITE_VERSION_ID, paths: ["/"] },
    publishStage: "production",
    shadowRestricted: false,
    artifactGovernance: {} as RuntimeArtifact["artifactGovernance"],
    bundleSha256: "a".repeat(64),
    createdAt: "2026-09-29T08:01:00.000Z",
  };
}

function runtimeContext(overrides: Partial<AstroCandidateRuntimeArtifactContext> = {}): AstroCandidateRuntimeArtifactContext {
  return {
    siteVersion: siteVersionWithoutGovernance(),
    artifact: fallbackArtifact(),
    activePointerReferencesArtifact: false,
    previewBindingCount: 0,
    ...overrides,
  };
}

class MemoryStore implements AstroCandidateRuntimeArtifactStore {
  context: AstroCandidateRuntimeArtifactContext;
  writeCount = 0;
  successfulWriteCount = 0;

  constructor(context: AstroCandidateRuntimeArtifactContext, private readonly delayMs = 0) {
    this.context = structuredClone(context);
  }

  async readContext(): Promise<AstroCandidateRuntimeArtifactContext> {
    return structuredClone(this.context);
  }

  async compareAndSetArtifact(input: {
    expectedBundleSha256: string;
    artifact: AstroCandidateRuntimeArtifactWrite;
  }): Promise<"updated" | "not_updated"> {
    this.writeCount += 1;
    if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.context.artifact?.bundleSha256 !== input.expectedBundleSha256) return "not_updated";
    this.context.artifact = {
      ...this.context.artifact,
      ...structuredClone(input.artifact),
    };
    this.successfulWriteCount += 1;
    return "updated";
  }
}

function promotionCode(code: AstroCandidatePromotionError["code"]) {
  return (error: unknown) => error instanceof AstroCandidatePromotionError && error.code === code;
}
