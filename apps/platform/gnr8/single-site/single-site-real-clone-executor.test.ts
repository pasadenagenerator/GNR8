import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type {
  CanonicalPageVersionInput,
  CanonicalSiteVersionSnapshot,
  RenderMode,
  RuntimeArtifact,
  RuntimeImportProvenanceSummary,
} from "../runtime/types";

import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";
import { startSingleSiteCloneGeneration, type SingleSiteCloneExecutorInput } from "./single-site-clone-start-orchestrator";
import {
  createSingleSiteRealCloneExecutor,
  SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION,
} from "./single-site-real-clone-executor";
import type { SingleSiteCloneGenerationGateResult } from "./single-site-clone-generation-gate";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";
import type { SingleSiteTransitionResult } from "./single-site-state-contracts";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-real-clone-executor.ts");
const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const OWNERSHIP_SITE_ID = "33333333-3333-4333-8333-333333333333";
const CLIENT_ID = "44444444-4444-4444-8444-444444444444";
const SOURCE_VERSION_ID = "55555555-5555-4555-8555-555555555555";
const TARGET_VERSION_ID = "66666666-6666-4666-8666-666666666666";

function sourceVersion(overrides: Partial<CanonicalSiteVersionSnapshot> = {}): CanonicalSiteVersionSnapshot {
  return {
    id: SOURCE_VERSION_ID,
    siteId: "runtime-site-source",
    versionNo: 3,
    state: "DRAFT",
    source: "migration",
    actor: "test:source-import",
    createdAt: "2026-07-29T12:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: "77777777-7777-4777-8777-777777777777",
    importProvenanceSummary: {
      kind: "runtime_import_provenance_summary_v1",
      sourceMode: "rendered_dom",
      importFidelityStatus: "high_fidelity_import",
      renderedCaptureStatus: "available",
      renderedDomQuality: "strong",
      screenshotCount: 1,
      computedStyleSampleCount: 1,
      renderedCapture: {
        used: true,
        status: "available",
        quality: "strong",
        domLength: 1200,
        nodeCount: 80,
        styleSampleCount: 1,
        styleCoverage: 1,
        screenshots: { viewport: true, fullPage: false },
        execution: {
          runtimeKind: "nodejs",
          environmentSupported: true,
          browserPackageAvailable: true,
          browserBinaryAvailable: true,
          environmentStatus: "supported",
          failureCategory: "none",
          failureCode: null,
          browserLaunch: "succeeded",
          navigation: "succeeded",
          dom: "captured",
          screenshot: "captured",
          styleSampling: "captured",
        },
      },
      importDiagnosticCodes: [],
      captureEvidence: {
        selectedSourceHtmlPath: "index.html",
        responseHtmlPath: "index.html",
        entryHtmlPath: "index.html",
        renderedCaptureManifestPath: "rendered/metadata.json",
        acquisitionEvidencePath: null,
        renderedDomPath: "rendered/dom.html",
        computedStylesPath: null,
        renderedViewportScreenshotPath: "rendered/screenshot.png",
        renderedFullpageScreenshotPath: null,
        screenshotPaths: ["rendered/screenshot.png"],
      },
    },
    pages: [
      {
        id: "page-version-source",
        siteVersionId: SOURCE_VERSION_ID,
        pageId: "page-source-home",
        path: "/",
        title: "Source Home",
        structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
        contentModel: { sectionProps: { hero: { heading: "Source Hero" } } },
        styleTokens: { "color.background": "#ffffff", "color.text": "#111111" },
        assetGraph: [],
        semanticSignals: [{ label: "source.clone", confidence: 1, source: "migration" }],
        migrationGovernance: null,
        source: "migration",
        actor: "test:source-import",
        createdAt: "2026-07-29T12:00:00.000Z",
      },
    ],
    ...overrides,
  } as CanonicalSiteVersionSnapshot;
}

function sourceArtifact(): RuntimeArtifact {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    siteId: "runtime-site-source",
    siteVersionId: SOURCE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<html><body>source</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { sourceKind: "scoped_pipeline_import" },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["SCOPED_IMPORT_READY"],
      pageRolloutPolicyState: ["SCOPED_IMPORT_READY"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "SCOPED_IMPORT_READY",
      siteRolloutPolicyState: "SCOPED_IMPORT_READY",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
    bundleSha256: "source-bundle",
    createdAt: "2026-07-29T12:00:00.000Z",
  };
}

function baseInput(overrides: Partial<SingleSiteCloneExecutorInput> = {}): SingleSiteCloneExecutorInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: OWNERSHIP_SITE_ID,
    sourceEvidenceReviewId: REVIEW_ID,
    acceptedWithLimitations: false,
    limitations: [],
    actor: { actorType: "system", actorId: "mvp12-test", actorRole: "migration_operator" },
    correlationId: "corr-mvp12-test",
    idempotencyKey: "idem-mvp12-test:executor",
    idempotencyKeys: {
      gateEvaluation: "idem:gate",
      cloneGenerationStarted: "idem:started",
      executor: "idem:executor",
      cloneGenerationCompleted: "idem:completed",
      cloneReviewRequired: "idem:review",
      failure: "idem:failure",
    },
    targetRefs: {
      runtimeSiteId: "runtime-site-source",
      siteVersionId: TARGET_VERSION_ID,
    },
    sourceEvidencePackageRef: {
      sourceRecordId: "package-source",
      refType: "source_evidence_package",
      sourceWatermark: "source-watermark",
      metadataJson: {
        sourceRuntimeSiteVersionId: SOURCE_VERSION_ID,
        sourceUrl: "https://source.example.test/",
      },
    },
    sourceWatermark: "source-watermark",
    payloadHash: "payload-hash",
    metadataJson: {
      sourceRuntimeSiteVersionId: SOURCE_VERSION_ID,
      sourceUrl: "https://source.example.test/",
    },
    ...overrides,
  };
}

function fakeDeps() {
  const calls: string[] = [];
  const versions = new Map<string, CanonicalSiteVersionSnapshot>([[SOURCE_VERSION_ID, sourceVersion()]]);
  const artifacts = new Map<string, RuntimeArtifact>([[sourceArtifact().id, sourceArtifact()]]);
  const artifactBySiteVersion = new Map<string, string>([[SOURCE_VERSION_ID, sourceArtifact().id]]);

  const deps = {
    calls,
    versions,
    artifacts,
    artifactBySiteVersion,
    getSiteVersion: async (siteVersionId: string) => {
      calls.push(`getSiteVersion:${siteVersionId}`);
      return versions.get(siteVersionId) ?? null;
    },
    getArtifactById: async (artifactId: string) => {
      calls.push(`getArtifactById:${artifactId}`);
      return artifacts.get(artifactId) ?? null;
    },
    createSiteVersionFromMigration: async (input: {
      siteId: string;
      sourceUrl: string;
      actor: string;
      rendererCompatibilityVersion: string;
      importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
      pages: CanonicalPageVersionInput[];
      siteVersionId?: string;
    }) => {
      calls.push("createSiteVersionFromMigration");
      const id = input.siteVersionId ?? TARGET_VERSION_ID;
      const existing = versions.get(id);
      if (existing) return { siteId: existing.siteId, siteVersionId: existing.id, versionNo: existing.versionNo };
      const clone = sourceVersion({
        id,
        siteId: input.siteId,
        versionNo: 4,
        actor: input.actor,
        artifactId: null,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        importProvenanceSummary: input.importProvenanceSummary,
        pages: input.pages.map((page, index) => ({
          ...page,
          id: `clone-page-version-${index + 1}`,
          siteVersionId: id,
          createdAt: "2026-07-29T12:10:00.000Z",
        })),
      });
      versions.set(id, clone);
      return { siteId: clone.siteId, siteVersionId: clone.id, versionNo: clone.versionNo };
    },
    buildDeterministicArtifactBundle: (input: { siteVersion: CanonicalSiteVersionSnapshot; renderMode: RenderMode }) => {
      calls.push("buildDeterministicArtifactBundle");
      return {
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
        bundleSha256: `bundle-${input.siteVersion.id}`,
        htmlByPath: { "/": `<html><body>${input.siteVersion.id}</body></html>` },
        compiledTokenStyles: "body{}",
        assetFingerprintMap: {},
        manifest: { renderMode: input.renderMode, siteVersionId: input.siteVersion.id, generatedAt: "deterministic" },
      };
    },
    createArtifact: async (input: {
      siteId: string;
      siteVersionId: string;
      rendererCompatibilityVersion: string;
      bundleSha256: string;
      htmlByPath: Record<string, string>;
      compiledTokenStyles: string;
      assetFingerprintMap: Record<string, string>;
      manifest: Record<string, unknown>;
      publishStage: RuntimeArtifact["publishStage"];
      shadowRestricted: boolean;
      artifactGovernance: RuntimeArtifact["artifactGovernance"];
    }) => {
      calls.push("createArtifact");
      const existingId = artifactBySiteVersion.get(input.siteVersionId);
      if (existingId) return { artifactId: existingId };
      const artifactId = "88888888-8888-4888-8888-888888888888";
      artifacts.set(artifactId, {
        id: artifactId,
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        htmlByPath: input.htmlByPath,
        compiledTokenStyles: input.compiledTokenStyles,
        assetFingerprintMap: input.assetFingerprintMap,
        manifest: input.manifest,
        publishStage: input.publishStage,
        shadowRestricted: input.shadowRestricted,
        artifactGovernance: input.artifactGovernance,
        bundleSha256: input.bundleSha256,
        createdAt: "2026-07-29T12:11:00.000Z",
      });
      artifactBySiteVersion.set(input.siteVersionId, artifactId);
      return { artifactId };
    },
    bindArtifactToVersion: async (input: { siteVersionId: string; artifactId: string }) => {
      calls.push("bindArtifactToVersion");
      const version = versions.get(input.siteVersionId);
      assert.ok(version);
      versions.set(input.siteVersionId, { ...version, artifactId: input.artifactId });
      return { affectedRows: 1 };
    },
  };
  return deps;
}

test("adapter is server-only and avoids forbidden route/provider/proposal/publish activation imports", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(app\/api|site-actions|generated-website-proposal|stripe|vercel|openprovider|dns|provider|command-center|ops-inbox|rollback-switch)[^"']*["']/i);
  assert.doesNotMatch(source, /\bswitchActivePointer\b|\bmarkSiteVersionPublished\b|\bpublishDraftContentOverrides\b|\bupsertDomainHostBinding\b/);
});

test("rejects missing required identity and context before runtime primitive calls", async () => {
  const deps = fakeDeps();
  const executor = createSingleSiteRealCloneExecutor(deps);

  await assert.rejects(
    () => executor.execute(baseInput({ actor: { actorType: "system", actorId: "", actorRole: "migration_operator" } })),
    SingleSiteTransitionError,
  );
  assert.deepEqual(deps.calls, []);
});

test("creates clone site version and artifact through injected runtime primitives", async () => {
  const deps = fakeDeps();
  const executor = createSingleSiteRealCloneExecutor(deps);

  const result = await executor.execute(baseInput());

  assert.equal(result.status, "completed");
  assert.equal(result.siteVersionRef?.sourceRecordId, TARGET_VERSION_ID);
  assert.equal(result.siteVersionRef?.sourceTable, "gnr8_runtime_site_versions");
  assert.equal(result.runtimeArtifactRef?.sourceRecordId, "88888888-8888-4888-8888-888888888888");
  assert.equal(result.runtimeArtifactRef?.sourceTable, "gnr8_runtime_artifacts");
  assert.equal(result.targetRefs?.runtimeSiteId, "runtime-site-source");
  assert.equal(result.targetRefs?.siteVersionId, TARGET_VERSION_ID);
  assert.equal(result.targetRefs?.runtimeArtifactId, "88888888-8888-4888-8888-888888888888");
  assert.equal(result.reusedExisting, false);
  assert.match(result.operationKey ?? "", /^single-site-real-clone:/);
  assert.match(result.semanticOutputWatermark ?? "", /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.watermarks?.executorVersion, SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION);
  assert.deepEqual(deps.calls.filter((call) => !call.startsWith("get")), [
    "createSiteVersionFromMigration",
    "buildDeterministicArtifactBundle",
    "createArtifact",
    "bindArtifactToVersion",
  ]);
});

test("reuses existing clone output on the same idempotent semantic input", async () => {
  const deps = fakeDeps();
  const executor = createSingleSiteRealCloneExecutor(deps);

  const first = await executor.execute(baseInput());
  const second = await executor.execute(baseInput());

  assert.equal(second.status, "completed");
  assert.equal(second.reusedExisting, true);
  assert.equal(second.siteVersionRef?.sourceRecordId, first.siteVersionRef?.sourceRecordId);
  assert.equal(second.runtimeArtifactRef?.sourceRecordId, first.runtimeArtifactRef?.sourceRecordId);
  assert.equal(second.semanticOutputWatermark, first.semanticOutputWatermark);
  assert.equal(deps.calls.filter((call) => call === "createSiteVersionFromMigration").length, 1);
  assert.equal(deps.calls.filter((call) => call === "createArtifact").length, 2);
});

test("fails on idempotency drift for same target key before creating a second clone", async () => {
  const deps = fakeDeps();
  const executor = createSingleSiteRealCloneExecutor(deps);

  await executor.execute(baseInput());
  const createCount = deps.calls.filter((call) => call === "createSiteVersionFromMigration").length;
  await assert.rejects(
    () => executor.execute(baseInput({ acceptedWithLimitations: true, limitations: [{ code: "changed_semantic_input" }] })),
    SingleSiteIdempotencyConflictError,
  );
  assert.equal(deps.calls.filter((call) => call === "createSiteVersionFromMigration").length, createCount);
});

test("returns warnings and limitations when source evidence was accepted with limitations", async () => {
  const deps = fakeDeps();
  const executor = createSingleSiteRealCloneExecutor(deps);

  const result = await executor.execute(
    baseInput({
      acceptedWithLimitations: true,
      limitations: [{ category: "screenshot", reason: "desktop-only accepted" }],
    }),
  );

  assert.equal(result.status, "completed_with_warnings");
  assert.deepEqual(result.limitations, [{ category: "screenshot", reason: "desktop-only accepted" }]);
  assert.match(result.warnings?.join("\n") ?? "", /accepted with limitations/);
});

test("does not call publish, active pointer, domain, billing, proposal, provider, or worker primitives", async () => {
  const deps = fakeDeps();
  const executor = createSingleSiteRealCloneExecutor(deps);

  await executor.execute(baseInput());

  assert.deepEqual([...new Set(deps.calls.map((call) => call.split(":")[0]))].sort(), [
    "bindArtifactToVersion",
    "buildDeterministicArtifactBundle",
    "createArtifact",
    "createSiteVersionFromMigration",
    "getArtifactById",
    "getSiteVersion",
  ]);
});

test("orchestrator dry-run does not invoke the real executor", async () => {
  const readModel = {
    migration: { migrationId: MIGRATION_ID, clientId: CLIENT_ID, siteId: OWNERSHIP_SITE_ID },
    currentState: { state: "source_evidence_review_required", failed: false, cancelled: false, terminal: false },
    sourceEvidenceReview: {
      reviewId: REVIEW_ID,
      reviewStatus: "accepted",
      acceptedWithLimitations: false,
      limitations: [],
      cloneGenerationAllowed: true,
    },
  } as unknown as SingleSiteMigrationReadModel;
  const gate: SingleSiteCloneGenerationGateResult = {
    allowed: true,
    mode: "allowed",
    reason: "source_evidence_accepted",
    migrationId: MIGRATION_ID,
    siteId: OWNERSHIP_SITE_ID,
    currentState: "source_evidence_review_required",
    sourceEvidenceReviewStatus: "accepted",
    sourceEvidenceReviewId: REVIEW_ID,
    acceptedWithLimitations: false,
    limitations: [],
    missingRequirements: [],
    recommendedNextAction: "start_clone_generation",
    derivedOnly: true,
    mutatesSourceTruth: false,
  };
  const deps = fakeDeps();
  const result = await startSingleSiteCloneGeneration(
    {
      migrationId: MIGRATION_ID,
      clientId: CLIENT_ID,
      siteId: OWNERSHIP_SITE_ID,
      mode: "dry_run",
      actor: { actorType: "system", actorId: "mvp12-test", actorRole: "migration_operator" },
      correlationId: "corr-dry-run",
      idempotencyKey: "idem-dry-run",
      metadataJson: { sourceRuntimeSiteVersionId: SOURCE_VERSION_ID },
    },
    {
      readRepository: { async readByMigrationId() { return readModel; } },
      evaluateGate: async () => gate,
      transitionService: {
        async transition(): Promise<SingleSiteTransitionResult> {
          throw new Error("dry-run must not transition");
        },
      },
      executor: createSingleSiteRealCloneExecutor(deps),
    },
  );

  assert.equal(result.status, "dry_run_allowed");
  assert.equal(result.executorCalled, false);
  assert.deepEqual(deps.calls, []);
});
