import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { MigrationFactory } from "@/gnr8/migration-factory/migration-factory";
import { InMemoryMigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import { canRunStage, createInitialStageStates, MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";
import { createFailedStageResult, DefaultMigrationStageRunner } from "@/gnr8/migration-factory/migration-stage-runner";
import type { MigrationStage, MigrationStageResult } from "@/gnr8/migration-factory/migration-job-types";
import type { UrlSinglePageImportSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";

function createDeterministicClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-01-01T00:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

function fixtureLandingHtml(): string {
  return [
    "<!doctype html>",
    "<html>",
    "  <head><title>Factory Snapshot</title></head>",
    "  <body>",
    "    <header><nav><a href='/'>Home</a><a href='/work'>Work</a></nav></header>",
    "    <main>",
    "      <section class='hero'><h1>Deterministic Migration Factory</h1><p>Snapshot source fixture body text.</p></section>",
    "      <section class='gallery'><img src='/hero.jpg' alt='Hero'></section>",
    "    </main>",
    "    <footer><p>Footer legal copy</p></footer>",
    "  </body>",
    "</html>",
  ].join("\n");
}

function fixtureWeakLandingHtml(): string {
  return [
    "<!doctype html>",
    "<html>",
    "  <head><title>Weak Factory Snapshot</title></head>",
    "  <body>",
    "    <main>",
    "      <section><h1>Only one section</h1><p>Weak structural fixture without header/nav/footer.</p></section>",
    "    </main>",
    "  </body>",
    "</html>",
  ].join("\n");
}

function createFetchFixture(options?: {
  failAll?: boolean;
  fixtureKind?: "strong" | "weak";
}): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  const html = options?.fixtureKind === "weak" ? fixtureWeakLandingHtml() : fixtureLandingHtml();
  const imageBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return async (input): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (options?.failAll) throw new Error(`mock fetch forced failure for ${url}`);
    if (url === "https://example.com/" || url === "https://example.com") {
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url === "https://example.com/hero.jpg") {
      return new Response(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
  };
}

function createSnapshotStageRunner(input: { snapshotRootDirAbs: string; failFetch?: boolean }): DefaultMigrationStageRunner {
  return new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs: input.snapshotRootDirAbs,
      fetchImpl: createFetchFixture({ failAll: input.failFetch }),
    },
  });
}

function createMockSnapshotImporter(input: {
  snapshotRootDirAbs: string;
  sourceMode: "raw_html" | "rendered_dom";
}): (args: { sourceUrl: string }) => Promise<UrlSinglePageImportSnapshot> {
  return async ({ sourceUrl }) => {
    const snapshotRootDirAbs = input.snapshotRootDirAbs;
    const entryHtmlPathAbs = path.resolve(snapshotRootDirAbs, "index.html");
    const responseHtmlPathAbs = path.resolve(snapshotRootDirAbs, "response-html.raw.html");
    const renderedDomPathAbs = path.resolve(snapshotRootDirAbs, "rendered-capture", "rendered-dom.html");
    await fs.mkdir(path.dirname(renderedDomPathAbs), { recursive: true });
    await fs.writeFile(responseHtmlPathAbs, "<!doctype html><html><body><h1>Raw</h1></body></html>", "utf8");
    await fs.writeFile(entryHtmlPathAbs, "<!doctype html><html><body><h1>Entry</h1></body></html>", "utf8");
    await fs.writeFile(renderedDomPathAbs, "<!doctype html><html><body><h1>Rendered</h1></body></html>", "utf8");

    return {
      kind: "url_single_page_import_snapshot_v1",
      snapshotVersion: "1.3.0",
      sourceUrl,
      normalizedUrl: sourceUrl,
      snapshotId: "mock-snapshot",
      snapshotRootDirAbs,
      fixtureSpec: {
        fixtureId: "mock-snapshot",
        kind: "static_marketing_site_v1",
        entryHtmlPath: "index.html",
        assetsDirPath: "assets",
        sourceUrl,
        normalizedUrl: sourceUrl,
        snapshotVersion: "1.3.0",
        urlKeyRule: "sha256(normalized_url_without_fragment)_prefix16",
        entryRule: "index.html",
        assetPathRule: "assets/<kind>/<urlHash12>-<basename>; collisions append -N",
        fetchScope: {
          includes: [
            "entry_html",
            "rendered_dom_capture",
            "screenshot_capture",
            "computed_style_sampling",
            "direct_stylesheets",
            "direct_images",
            "direct_scripts",
            "image_srcset_candidates",
            "lazy_image_fallback_attrs",
            "gallery_image_anchor_hrefs",
            "stylesheet_linked_local_assets",
          ] as const,
          excludes: ["multi_page_crawl", "auth_fetch", "form_submission", "robots_bypass"] as const,
        },
      },
      sourceMode: input.sourceMode,
      responseHtmlPathAbs,
      entryHtmlPathAbs,
      assetsDirAbs: path.resolve(snapshotRootDirAbs, "assets"),
      renderedCapture: {
        kind: "rendered_capture_result_v1",
        version: "1.0.0",
        status: input.sourceMode === "rendered_dom" ? "available" : "unavailable",
        sourceMode: input.sourceMode,
        documents:
          input.sourceMode === "rendered_dom"
            ? [
                {
                  kind: "rendered_document_snapshot_v1",
                  sourceUrl,
                  htmlPathAbs: renderedDomPathAbs,
                  htmlSha256: "mock",
                  readinessState: "dom_stable",
                },
              ]
            : [],
        screenshots: [],
        computedStyleSamples: [],
        renderedObservedAssetUrls: [],
        diagnostics: [],
      },
      importDiagnostics: {
        summary: { infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0 },
        issues: [],
      },
      fetchManifest: [],
    } as UrlSinglePageImportSnapshot;
  };
}

function createSucceededStageResult(stage: MigrationStage, startedAt: string, endedAt: string, outputRefs: Record<string, string>): MigrationStageResult {
  return {
    stage,
    status: "SUCCEEDED",
    startedAt,
    endedAt,
    diagnostics: [{ code: `${stage}_FORCED_SUCCESS`, message: `${stage} forced success for test`, level: "INFO" }],
    outputRefs,
  };
}

test("migration factory happy path completes all stages", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "happy");
  const factory = new MigrationFactory({
    store,
    now,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });

  const job = await factory.startMigrationJob({
    jobId: "job-happy",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "COMPLETED");
  assert.deepEqual(report.completedStages, MIGRATION_STAGE_ORDER);
  assert.equal(report.failedStage, undefined);
  assert.equal(persisted?.overallState, "COMPLETED");
  for (const stage of MIGRATION_STAGE_ORDER) {
    assert.equal(persisted?.stageStates[stage].state, "SUCCEEDED");
  }
  const snapshotRefs = persisted?.stageStates.SNAPSHOT.outputRefs ?? {};
  assert.ok(snapshotRefs.snapshotId);
  assert.ok(snapshotRefs.snapshotRef);
  assert.ok(snapshotRefs.primaryDocumentRef);
  assert.ok(snapshotRefs.snapshotRootDirAbs);
  assert.ok(Number(snapshotRefs.snapshotUrlCount) >= 1);

  const layoutRefs = persisted?.stageStates.LAYOUT_GRAPH.outputRefs ?? {};
  assert.ok(layoutRefs.layoutGraphId);
  assert.ok(layoutRefs.layoutGraphRef);
  assert.ok(layoutRefs.rootNodeId);
  assert.ok(Number(layoutRefs.nodeCount) >= 1);
  assert.ok(Number(layoutRefs.regionCount) >= 1);
  assert.ok(Number(layoutRefs.anomalyCount) >= 0);

  const layoutDiagnostics = persisted?.stageStates.LAYOUT_GRAPH.diagnostics ?? [];
  assert.equal(layoutDiagnostics[0]?.code, "LAYOUT_GRAPH_BUILT");
  assert.ok(typeof layoutDiagnostics[0]?.details?.rootNodeId === "string");

  const canonicalRefs = persisted?.stageStates.CANONICAL.outputRefs ?? {};
  assert.ok(canonicalRefs.canonicalRef);
  assert.ok(canonicalRefs.canonicalPageRef);
  assert.ok(canonicalRefs.canonicalPageId);
  assert.ok(canonicalRefs.primaryPath);
  assert.ok(Number(canonicalRefs.sectionCount) > 0);
  assert.ok(Number(canonicalRefs.pageStructuralConfidence) >= 0);
  assert.ok(canonicalRefs.migrationDiagnosticsRef);

  const canonicalDiagnostics = persisted?.stageStates.CANONICAL.diagnostics ?? [];
  assert.equal(canonicalDiagnostics[0]?.code, "CANONICAL_BUILT");
  assert.ok(typeof canonicalDiagnostics[0]?.details?.sectionCount === "number");
  assert.ok(typeof canonicalDiagnostics[0]?.details?.canonicalIntentSummary === "object");

  const qualityGateRefs = persisted?.stageStates.QUALITY_GATE.outputRefs ?? {};
  assert.ok(qualityGateRefs.qualityGateRef);
  assert.ok(qualityGateRefs.governanceSummaryRef);
  assert.ok(qualityGateRefs.pageMigrationGateState);
  assert.ok(qualityGateRefs.siteMigrationGateState);
  assert.ok(qualityGateRefs.pageRolloutPolicyState);
  assert.ok(qualityGateRefs.pageEnforcementShadowDecision);
  assert.notEqual(qualityGateRefs.pageMigrationGateState, "");

  const qualityDiagnostics = persisted?.stageStates.QUALITY_GATE.diagnostics ?? [];
  assert.equal(qualityDiagnostics[0]?.code, "QUALITY_GATE_EVALUATED");
  assert.ok(typeof qualityDiagnostics[0]?.details?.pageStructuralConfidence === "number");
  assert.ok(typeof qualityDiagnostics[0]?.details?.recommendedNextStep === "string");

  const artifactRefs = persisted?.stageStates.ARTIFACT_BUILD.outputRefs ?? {};
  assert.ok(artifactRefs.artifactId);
  assert.ok(artifactRefs.artifactRef);
  assert.ok(artifactRefs.artifactManifestRef);
  assert.ok(artifactRefs.artifactBuildRef);
  assert.ok(artifactRefs.primaryPath);
  assert.ok(Number(artifactRefs.pathCount) > 0);
  assert.equal(artifactRefs.artifactGovernancePresent, "true");
  assert.ok(artifactRefs.publishStageCandidate);
  assert.ok(artifactRefs.bundleSha256);

  const artifactDiagnostics = persisted?.stageStates.ARTIFACT_BUILD.diagnostics ?? [];
  assert.equal(artifactDiagnostics[0]?.code, "ARTIFACT_BUILD_REALIZED");
  assert.equal(artifactDiagnostics[0]?.details?.artifactGovernancePresent, true);
  assert.equal(artifactDiagnostics[0]?.details?.builderMarkersPresent, false);

  const persistedArtifactRaw = await fs.readFile(artifactRefs.artifactRef!, "utf8");
  const persistedArtifact = JSON.parse(persistedArtifactRaw) as {
    artifactGovernancePresent?: boolean;
    artifactGovernance?: Record<string, unknown>;
    artifact?: { htmlByPath?: Record<string, string> };
  };
  assert.equal(persistedArtifact.artifactGovernancePresent, true);
  assert.ok(persistedArtifact.artifactGovernance);
  assert.ok(Object.keys(persistedArtifact.artifact?.htmlByPath ?? {}).length > 0);

  const shadowRefs = persisted?.stageStates.SHADOW_BIND_READY.outputRefs ?? {};
  assert.ok(shadowRefs.shadowBindReadyRef);
  assert.ok(shadowRefs.publishCandidateRef);
  assert.ok(shadowRefs.artifactId);
  assert.ok(shadowRefs.siteVersionId);
  assert.equal(shadowRefs.candidateCreated, "true");
  assert.equal(shadowRefs.shadowEligibilityState, "ALLOWED");
  assert.equal(shadowRefs.publishCandidateState, "READY_FOR_SHADOW_BIND");

  const shadowDiagnostics = persisted?.stageStates.SHADOW_BIND_READY.diagnostics ?? [];
  assert.equal(shadowDiagnostics[0]?.code, "SHADOW_BIND_READY_REALIZED");
  assert.equal(shadowDiagnostics[0]?.details?.artifactGovernancePresent, true);
  assert.equal(shadowDiagnostics[0]?.details?.candidateCreated, true);

  const shadowCandidateRaw = await fs.readFile(shadowRefs.shadowBindReadyRef!, "utf8");
  const shadowCandidate = JSON.parse(shadowCandidateRaw) as {
    kind?: string;
    shadowEligibilityState?: string;
    publishCandidateState?: string;
    candidateCreated?: boolean;
    artifactId?: string;
  };
  assert.equal(shadowCandidate.kind, "migration_factory_shadow_publish_candidate_v1");
  assert.equal(shadowCandidate.shadowEligibilityState, "ALLOWED");
  assert.equal(shadowCandidate.publishCandidateState, "READY_FOR_SHADOW_BIND");
  assert.equal(shadowCandidate.candidateCreated, true);
  assert.ok(shadowCandidate.artifactId);
});

test("snapshot rendered_dom source mode is propagated and preferred by downstream stages", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "rendered-source-mode");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImporter: createMockSnapshotImporter({
      snapshotRootDirAbs,
      sourceMode: "rendered_dom",
    }),
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-rendered-source-mode",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.equal(report.finalState, "COMPLETED");
  assert.ok(persisted);
  assert.equal(persisted?.stageStates.SNAPSHOT.outputRefs.sourceMode, "rendered_dom");
  assert.equal(path.basename(persisted?.stageStates.SNAPSHOT.outputRefs.primaryDocumentRef ?? ""), "rendered-dom.html");
  assert.equal(persisted?.stageStates.CANONICAL.outputRefs.sourceMode, "rendered_dom");
});

test("snapshot raw_html source mode remains valid when rendered capture is unavailable", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "raw-source-mode");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImporter: createMockSnapshotImporter({
      snapshotRootDirAbs,
      sourceMode: "raw_html",
    }),
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-raw-source-mode",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.equal(report.finalState, "COMPLETED");
  assert.ok(persisted);
  assert.equal(persisted?.stageStates.SNAPSHOT.outputRefs.sourceMode, "raw_html");
  assert.equal(path.basename(persisted?.stageStates.SNAPSHOT.outputRefs.primaryDocumentRef ?? ""), "index.html");
});

test("migration factory failure path stops on failed stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "canonical-fail");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      CANONICAL: async (job, stage, context) =>
        createFailedStageResult({
          stage,
          startedAt: context.now(),
          endedAt: context.now(),
          code: "CANONICAL_STAGE_FAILURE",
          message: "forced canonical failure",
          details: { jobId: job.jobId },
        }),
    },
  });
  const factory = new MigrationFactory({ store, stageRunner, now });

  const job = await factory.startMigrationJob({
    jobId: "job-fail",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "CANONICAL");
  assert.equal(persisted?.overallState, "FAILED");
  assert.equal(persisted?.stageStates.INTAKE.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.SNAPSHOT.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.LAYOUT_GRAPH.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.CANONICAL.state, "FAILED");
  assert.equal(persisted?.stageStates.QUALITY_GATE.state, "NOT_STARTED");
  assert.equal(persisted?.stageStates.ARTIFACT_BUILD.state, "NOT_STARTED");
  assert.equal(persisted?.stageStates.SHADOW_BIND_READY.state, "NOT_STARTED");
});

test("migration factory resume continues from first non-succeeded stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "resume");
  const failingRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      QUALITY_GATE: async (_job, stage, context) =>
        createFailedStageResult({
          stage,
          startedAt: context.now(),
          endedAt: context.now(),
          code: "QUALITY_GATE_FAILURE",
          message: "forced quality gate failure",
        }),
    },
  });

  const factoryWithFailure = new MigrationFactory({ store, stageRunner: failingRunner, now });
  const job = await factoryWithFailure.startMigrationJob({
    jobId: "job-resume",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  await factoryWithFailure.runMigrationJob(job.jobId);

  const afterFail = await store.getJob(job.jobId);
  assert.ok(afterFail);
  assert.equal(afterFail?.stageStates.CANONICAL.attempts, 1);
  assert.equal(afterFail?.stageStates.QUALITY_GATE.attempts, 1);
  assert.equal(afterFail?.stageStates.ARTIFACT_BUILD.attempts, 0);

  const factoryResume = new MigrationFactory({
    store,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
    now,
  });
  const report = await factoryResume.resumeMigrationJob(job.jobId);
  const afterResume = await store.getJob(job.jobId);
  assert.ok(afterResume);

  assert.equal(report.finalState, "COMPLETED");
  assert.deepEqual(report.completedStages, MIGRATION_STAGE_ORDER);
  assert.equal(afterResume?.stageStates.CANONICAL.attempts, 1);
  assert.equal(afterResume?.stageStates.QUALITY_GATE.attempts, 2);
  assert.equal(afterResume?.stageStates.ARTIFACT_BUILD.attempts, 1);
  assert.equal(afterResume?.stageStates.SHADOW_BIND_READY.attempts, 1);
});

test("artifact build failure on first attempt resumes without rerunning canonical/quality", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "artifact-resume");
  let failOnce = true;
  const failingRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      ARTIFACT_BUILD: async (_job, stage, context) => {
        if (!failOnce) {
          return createSnapshotStageRunner({ snapshotRootDirAbs }).runStage(_job, stage, context);
        }
        failOnce = false;
        return createFailedStageResult({
          stage,
          startedAt: context.now(),
          endedAt: context.now(),
          code: "FORCED_ARTIFACT_BUILD_FAILURE",
          message: "forced artifact build failure once",
        });
      },
    },
  });
  const factory = new MigrationFactory({ store, now, stageRunner: failingRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-artifact-resume",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const firstRun = await factory.runMigrationJob(job.jobId);
  assert.equal(firstRun.finalState, "FAILED");
  assert.equal(firstRun.failedStage, "ARTIFACT_BUILD");
  const afterFail = await store.getJob(job.jobId);
  assert.ok(afterFail);
  assert.equal(afterFail?.stageStates.CANONICAL.attempts, 1);
  assert.equal(afterFail?.stageStates.QUALITY_GATE.attempts, 1);
  assert.equal(afterFail?.stageStates.ARTIFACT_BUILD.attempts, 1);
  assert.equal(afterFail?.stageStates.SHADOW_BIND_READY.attempts, 0);

  const resumeFactory = new MigrationFactory({
    store,
    now,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });
  const resumed = await resumeFactory.resumeMigrationJob(job.jobId);
  assert.equal(resumed.finalState, "COMPLETED");

  const afterResume = await store.getJob(job.jobId);
  assert.ok(afterResume);
  assert.equal(afterResume?.stageStates.CANONICAL.attempts, 1);
  assert.equal(afterResume?.stageStates.QUALITY_GATE.attempts, 1);
  assert.equal(afterResume?.stageStates.ARTIFACT_BUILD.attempts, 2);
  assert.equal(afterResume?.stageStates.SHADOW_BIND_READY.attempts, 1);
});

test("stage transition guard blocks CANONICAL before LAYOUT_GRAPH succeeds", () => {
  const stageStates = createInitialStageStates();
  stageStates.INTAKE.state = "SUCCEEDED";
  stageStates.SNAPSHOT.state = "SUCCEEDED";
  stageStates.LAYOUT_GRAPH.state = "NOT_STARTED";

  assert.equal(canRunStage("CANONICAL", stageStates), false);
});

test("deterministic execution order is fixed across runs", async () => {
  const now1 = createDeterministicClock();
  const store1 = new InMemoryMigrationJobStore({ now: now1 });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "determinism");
  const factory1 = new MigrationFactory({
    store: store1,
    now: now1,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });
  const job1 = await factory1.startMigrationJob({
    jobId: "job-order-1",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report1 = await factory1.runMigrationJob(job1.jobId);

  const now2 = createDeterministicClock();
  const store2 = new InMemoryMigrationJobStore({ now: now2 });
  const factory2 = new MigrationFactory({
    store: store2,
    now: now2,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });
  const job2 = await factory2.startMigrationJob({
    jobId: "job-order-2",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report2 = await factory2.runMigrationJob(job2.jobId);

  assert.deepEqual(report1.completedStages, MIGRATION_STAGE_ORDER);
  assert.deepEqual(report2.completedStages, MIGRATION_STAGE_ORDER);
  assert.deepEqual(report1.completedStages, report2.completedStages);
  assert.deepEqual(
    Object.keys(report1.outputs).sort((a, b) => a.localeCompare(b)),
    Object.keys(report2.outputs).sort((a, b) => a.localeCompare(b)),
  );
  assert.ok(Object.keys(report1.outputs).includes("CANONICAL.canonicalPageRef"));
  assert.ok(Object.keys(report1.outputs).includes("QUALITY_GATE.pageMigrationGateState"));
  assert.ok(Object.keys(report1.outputs).includes("QUALITY_GATE.pageEnforcementShadowDecision"));
  assert.ok(Object.keys(report1.outputs).includes("ARTIFACT_BUILD.artifactBuildRef"));
  assert.ok(Object.keys(report1.outputs).includes("ARTIFACT_BUILD.pathCount"));
  assert.ok(Object.keys(report1.outputs).includes("ARTIFACT_BUILD.artifactGovernancePresent"));
  assert.ok(Object.keys(report1.outputs).includes("SHADOW_BIND_READY.shadowBindReadyRef"));
  assert.ok(Object.keys(report1.outputs).includes("SHADOW_BIND_READY.publishCandidateRef"));
  assert.ok(Object.keys(report1.outputs).includes("SHADOW_BIND_READY.shadowEligibilityState"));
  assert.ok(Object.keys(report1.outputs).includes("SHADOW_BIND_READY.candidateCreated"));
  assert.equal(report1.outputs["ARTIFACT_BUILD.artifactGovernancePresent"], "true");
  assert.equal(report2.outputs["ARTIFACT_BUILD.artifactGovernancePresent"], "true");
  assert.equal(report1.outputs["ARTIFACT_BUILD.pathCount"], report2.outputs["ARTIFACT_BUILD.pathCount"]);
  assert.equal(report1.outputs["SHADOW_BIND_READY.shadowEligibilityState"], report2.outputs["SHADOW_BIND_READY.shadowEligibilityState"]);
  assert.equal(report1.outputs["SHADOW_BIND_READY.candidateCreated"], "true");
  assert.equal(report2.outputs["SHADOW_BIND_READY.candidateCreated"], "true");
});

test("quality gate degraded input propagates to explicit shadow readiness denial", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "quality-weak");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture({ fixtureKind: "weak" }),
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-quality-weak",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SHADOW_BIND_READY");
  assert.ok(persisted);
  assert.equal(persisted?.stageStates.QUALITY_GATE.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.SHADOW_BIND_READY.state, "FAILED");
  assert.notEqual(persisted?.stageStates.QUALITY_GATE.outputRefs.pageMigrationGateState, "SHADOW_READY");
  assert.equal(persisted?.stageStates.QUALITY_GATE.outputRefs.pageMigrationGateState, "BROKEN");

  const details = persisted?.stageStates.QUALITY_GATE.diagnostics[0]?.details ?? {};
  assert.ok(typeof details.pageStructuralConfidence === "number");
  assert.ok(typeof details.weakSectionCount === "number");
  assert.ok(typeof details.anomalyCount === "number");
});

test("snapshot stage failure marks job failed and blocks later stages", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "snapshot-fail");
  const factory = new MigrationFactory({
    store,
    now,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs, failFetch: true }),
  });

  const job = await factory.startMigrationJob({
    jobId: "job-snapshot-fail",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SNAPSHOT");
  assert.equal(persisted?.stageStates.INTAKE.state, "SUCCEEDED");
  assert.equal(persisted?.stageStates.SNAPSHOT.state, "FAILED");
  assert.equal(persisted?.stageStates.LAYOUT_GRAPH.state, "NOT_STARTED");
  assert.equal(persisted?.overallState, "FAILED");
});

test("resume from layout-graph failure does not rerun snapshot stage", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "layout-resume");

  const realRunner = createSnapshotStageRunner({ snapshotRootDirAbs });
  let failOnce = true;
  const failingLayoutRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      LAYOUT_GRAPH: async (job, stage, context) => {
        if (failOnce) {
          failOnce = false;
          return createFailedStageResult({
            stage,
            startedAt: context.now(),
            endedAt: context.now(),
            code: "FORCED_LAYOUT_GRAPH_FAILURE",
            message: "forced layout graph failure once",
          });
        }
        return realRunner.runStage(job, stage, context);
      },
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner: failingLayoutRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-layout-resume",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const failed = await factory.runMigrationJob(job.jobId);
  assert.equal(failed.finalState, "FAILED");
  assert.equal(failed.failedStage, "LAYOUT_GRAPH");

  const afterFail = await store.getJob(job.jobId);
  assert.ok(afterFail);
  assert.equal(afterFail?.stageStates.SNAPSHOT.state, "SUCCEEDED");
  assert.equal(afterFail?.stageStates.SNAPSHOT.attempts, 1);
  assert.equal(afterFail?.stageStates.LAYOUT_GRAPH.attempts, 1);

  const resumeFactory = new MigrationFactory({ store, now, stageRunner: realRunner });
  const resumed = await resumeFactory.resumeMigrationJob(job.jobId);
  assert.equal(resumed.finalState, "COMPLETED");

  const afterResume = await store.getJob(job.jobId);
  assert.ok(afterResume);
  assert.equal(afterResume?.stageStates.SNAPSHOT.attempts, 1);
  assert.equal(afterResume?.stageStates.LAYOUT_GRAPH.attempts, 2);
});

test("artifact build fails explicitly when canonical ref is missing", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "artifact-missing-canonical");
  const governanceSummaryRef = path.resolve(snapshotRootDirAbs, "governance-summary.json");
  await fs.mkdir(snapshotRootDirAbs, { recursive: true });
  await fs.writeFile(
    governanceSummaryRef,
    `${JSON.stringify({
      page: {
        canonicalPageId: "p1",
        sourcePath: "/",
        pageStructuralConfidence: 0.9,
        weakSectionIds: [],
        structuralAnomalies: [],
        pageMigrationGate: { state: "SHADOW_READY", score: 0.9 },
        pageRolloutPolicy: { state: "SHADOW_ONLY", recommendedNextStep: "shadow" },
        pageEnforcement: {
          SHADOW: { decision: "ALLOW" },
          CANARY: { decision: "DENY" },
          PRODUCTION: { decision: "DENY" },
        },
      },
      site: {
        siteEnforcement: {
          SHADOW: { decision: "ALLOW" },
          CANARY: { decision: "DENY" },
          PRODUCTION: { decision: "DENY" },
        },
      },
    })}\n`,
    "utf8",
  );

  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      CANONICAL: async (_job, stage, context) =>
        createSucceededStageResult(stage, context.now(), context.now(), {
          canonicalRef: "forced-canonical-ref",
        }),
      QUALITY_GATE: async (_job, stage, context) =>
        createSucceededStageResult(stage, context.now(), context.now(), {
          governanceSummaryRef,
          pageMigrationGateState: "SHADOW_READY",
        }),
    },
  });
  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-artifact-missing-canonical",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "ARTIFACT_BUILD");
  assert.equal(persisted?.stageStates.ARTIFACT_BUILD.error?.code, "ARTIFACT_BUILD_CANONICAL_REF_MISSING");
  assert.equal(persisted?.stageStates.SHADOW_BIND_READY.state, "NOT_STARTED");
});

test("artifact build fails explicitly when governance summary ref is missing", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "artifact-missing-governance");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      QUALITY_GATE: async (_job, stage, context) =>
        createSucceededStageResult(stage, context.now(), context.now(), {
          qualityGateRef: "forced-quality-gate-ref",
          pageMigrationGateState: "SHADOW_READY",
        }),
    },
  });
  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-artifact-missing-governance",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "ARTIFACT_BUILD");
  assert.equal(persisted?.stageStates.ARTIFACT_BUILD.error?.code, "ARTIFACT_BUILD_GOVERNANCE_REF_MISSING");
  assert.equal(persisted?.stageStates.SHADOW_BIND_READY.state, "NOT_STARTED");
});

test("shadow bind ready fails explicitly when governance denies shadow eligibility", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "shadow-deny");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      ARTIFACT_BUILD: async (_job, stage, context) => {
        const result = await createSnapshotStageRunner({ snapshotRootDirAbs }).runStage(_job, stage, context);
        if (result.status !== "SUCCEEDED") return result;

        const artifactRef = result.outputRefs.artifactRef;
        assert.ok(artifactRef);
        const raw = await fs.readFile(artifactRef, "utf8");
        const artifact = JSON.parse(raw) as {
          artifactGovernance?: {
            siteEnforcementState?: {
              shadow?: string;
            };
          };
        };
        if (!artifact.artifactGovernance?.siteEnforcementState) throw new Error("missing artifact governance in fixture");
        artifact.artifactGovernance.siteEnforcementState.shadow = "DENY";
        await fs.writeFile(artifactRef, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
        return result;
      },
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-shadow-deny",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SHADOW_BIND_READY");
  assert.equal(persisted.stageStates.SHADOW_BIND_READY.state, "FAILED");
  assert.equal(persisted.stageStates.SHADOW_BIND_READY.error?.code, "SHADOW_BIND_READY_ENFORCEMENT_DENIED");
});

test("shadow bind ready fails explicitly when artifact governance is empty", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "shadow-empty-governance");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      ARTIFACT_BUILD: async (_job, stage, context) => {
        const result = await createSnapshotStageRunner({ snapshotRootDirAbs }).runStage(_job, stage, context);
        if (result.status !== "SUCCEEDED") return result;

        const artifactRef = result.outputRefs.artifactRef;
        assert.ok(artifactRef);
        const raw = await fs.readFile(artifactRef, "utf8");
        const artifact = JSON.parse(raw) as {
          artifactGovernance?: Record<string, unknown>;
        };
        artifact.artifactGovernance = {
          pageGateState: [],
          pageRolloutPolicyState: [],
          pageEnforcementState: { shadow: [], canary: [], production: [] },
          siteGateState: "",
          siteRolloutPolicyState: "",
          siteEnforcementState: { shadow: "", canary: "", production: "" },
          publishStage: "shadow",
        };
        await fs.writeFile(artifactRef, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
        return result;
      },
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-shadow-empty-governance",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SHADOW_BIND_READY");
  assert.equal(persisted.stageStates.SHADOW_BIND_READY.error?.code, "PUBLISH_GOVERNANCE_MISSING");
});

test("shadow bind ready fails explicitly when artifact lineage mismatches siteVersion", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "shadow-lineage-mismatch");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      ARTIFACT_BUILD: async (_job, stage, context) => {
        const result = await createSnapshotStageRunner({ snapshotRootDirAbs }).runStage(_job, stage, context);
        if (result.status !== "SUCCEEDED") return result;

        const artifactRef = result.outputRefs.artifactRef;
        assert.ok(artifactRef);
        const raw = await fs.readFile(artifactRef, "utf8");
        const artifact = JSON.parse(raw) as {
          siteVersionId?: string;
          artifact?: { siteVersionId?: string };
        };
        artifact.siteVersionId = "sv-lineage-mismatch";
        if (artifact.artifact) artifact.artifact.siteVersionId = "sv-lineage-mismatch";
        await fs.writeFile(artifactRef, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
        return result;
      },
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-shadow-lineage-mismatch",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SHADOW_BIND_READY");
  assert.equal(persisted.stageStates.SHADOW_BIND_READY.error?.code, "PUBLISH_LINEAGE_MISMATCH");
});

test("shadow bind ready fails explicitly when artifact build output is missing artifact ref", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "shadow-missing-artifact");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      ARTIFACT_BUILD: async (_job, stage, context) =>
        createSucceededStageResult(stage, context.now(), context.now(), {
          artifactId: "artifact-without-ref",
          publishStageCandidate: "shadow",
          artifactGovernancePresent: "true",
        }),
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-shadow-missing-artifact",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SHADOW_BIND_READY");
  assert.equal(persisted.stageStates.SHADOW_BIND_READY.error?.code, "SHADOW_BIND_READY_ARTIFACT_REF_MISSING");
});

test("shadow bind ready fails explicitly when governance summary ref is missing", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "shadow-missing-governance");
  const stageRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      QUALITY_GATE: async (_job, stage, context) =>
        createSucceededStageResult(stage, context.now(), context.now(), {
          qualityGateRef: "forced-quality-gate-ref",
          pageMigrationGateState: "SHADOW_READY",
        }),
      ARTIFACT_BUILD: async (_job, stage, context) =>
        createSucceededStageResult(stage, context.now(), context.now(), {
          artifactRef: path.resolve(snapshotRootDirAbs, "forced-artifact.json"),
        }),
    },
  });

  const factory = new MigrationFactory({ store, now, stageRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-shadow-missing-governance",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });
  const report = await factory.runMigrationJob(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(report.finalState, "FAILED");
  assert.equal(report.failedStage, "SHADOW_BIND_READY");
  assert.equal(persisted.stageStates.SHADOW_BIND_READY.error?.code, "SHADOW_BIND_READY_GOVERNANCE_REF_MISSING");
});

test("shadow bind ready resume retries only shadow stage after failure", async () => {
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const snapshotRootDirAbs = path.resolve(os.tmpdir(), "gnr8-mf-tests", "shadow-resume");
  let failOnce = true;
  const failingRunner = new DefaultMigrationStageRunner({
    snapshotImportOptions: {
      snapshotRootDirAbs,
      fetchImpl: createFetchFixture(),
    },
    executors: {
      SHADOW_BIND_READY: async (_job, stage, context) => {
        if (failOnce) {
          failOnce = false;
          return createFailedStageResult({
            stage,
            startedAt: context.now(),
            endedAt: context.now(),
            code: "FORCED_SHADOW_BIND_READY_FAILURE",
            message: "forced shadow bind ready failure once",
          });
        }
        return createSnapshotStageRunner({ snapshotRootDirAbs }).runStage(_job, stage, context);
      },
    },
  });
  const factory = new MigrationFactory({ store, now, stageRunner: failingRunner });
  const job = await factory.startMigrationJob({
    jobId: "job-shadow-resume",
    siteId: "site-1",
    sourceUrl: "https://example.com",
  });

  const failed = await factory.runMigrationJob(job.jobId);
  assert.equal(failed.finalState, "FAILED");
  assert.equal(failed.failedStage, "SHADOW_BIND_READY");
  const afterFail = await store.getJob(job.jobId);
  assert.ok(afterFail);
  assert.equal(afterFail.stageStates.ARTIFACT_BUILD.attempts, 1);
  assert.equal(afterFail.stageStates.SHADOW_BIND_READY.attempts, 1);

  const resumeFactory = new MigrationFactory({
    store,
    now,
    stageRunner: createSnapshotStageRunner({ snapshotRootDirAbs }),
  });
  const resumed = await resumeFactory.resumeMigrationJob(job.jobId);
  assert.equal(resumed.finalState, "COMPLETED");

  const afterResume = await store.getJob(job.jobId);
  assert.ok(afterResume);
  assert.equal(afterResume.stageStates.ARTIFACT_BUILD.attempts, 1);
  assert.equal(afterResume.stageStates.SHADOW_BIND_READY.attempts, 2);
});
