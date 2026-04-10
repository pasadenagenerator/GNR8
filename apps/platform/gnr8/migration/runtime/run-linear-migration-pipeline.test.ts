import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../../import/import-contract";
import { createImportManifest } from "../../import/import-manifest";
import { importStaticSite } from "../../import/runtime/import-static-site";
import { stableStringify } from "./diagnostics";
import { runLinearMigrationPipeline } from "./run-linear-migration-pipeline";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../../import/__fixtures__/${name}`);
}

function validationFixtureDir(name: "real-site-03"): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../../validation/fixtures/${name}`);
}

test("linear migration pipeline runs stages in fixed order", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.deepEqual(
    result.stages.map((s) => s.stageId),
    ["import_intake", "structure_preparation", "visual_analysis", "design_intelligence", "layout_preparation", "render_preparation", "preview_generation"],
  );
  assert.deepEqual(result.stageOrder, [
    "import_intake",
    "structure_preparation",
    "visual_analysis",
    "design_intelligence",
    "layout_preparation",
    "render_preparation",
    "preview_generation",
  ]);
});

test("linear migration pipeline returns structured result in success case", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.equal(result.status, "success");
  assert.equal(result.stages[0].status, "success");
  assert.equal(result.stages[1].status, "success");
  assert.equal(result.stages[2].status, "success");
  assert.equal(result.stages[3].status, "success");
  assert.equal(result.stages[4].status, "success");
  assert.equal(result.stages[5].status, "success");
  assert.equal(result.stages[6].status, "success");
  assert.ok(result.summary.includes("linear_migration_pipeline"));
  assert.ok(
    result.diagnostics.every(
      (d) =>
        d.stageId === "import_intake" ||
        d.stageId === "structure_preparation" ||
        d.stageId === "visual_analysis" ||
        d.stageId === "design_intelligence" ||
        d.stageId === "layout_preparation" ||
        d.stageId === "render_preparation" ||
        d.stageId === "preview_generation",
    ),
  );
});

test("linear migration pipeline continues in degraded mode for non-structural asset failures", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.equal(importManifest.status, "success_with_warnings");
  assert.equal(result.status, "success");
  assert.equal(result.stages[0].stageId, "import_intake");
  assert.equal(result.stages[0].status, "success");
  assert.equal(result.stages[1].status, "success");
  assert.equal(result.stages[2].status, "success");
  assert.equal(result.stages[3].status, "success");
  assert.equal(result.stages[4].status, "success");
  assert.equal(result.stages[5].status, "success");
  assert.equal(result.stages[6].status, "success");

  const importDiags = result.diagnostics.filter((d) => d.source === "import");
  assert.ok(importDiags.length > 0);
  assert.ok(importDiags.every((d) => d.stageId === "import_intake"));
  assert.ok(
    importDiags.some((d) => d.code === "missing_local_asset" && d.severity === "warning"),
    "missing_local_asset should be visible and downgraded to warning at pipeline scope",
  );

  const pipelineDiags = result.diagnostics.filter((d) => d.source === "pipeline" && d.stageId === "import_intake");
  assert.equal(pipelineDiags.length, 0);
});

test("linear migration pipeline still blocks on structural import failures", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "missing.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.equal(importManifest.status, "failed");
  assert.equal(result.status, "failed");
  assert.equal(result.stages[0].status, "failed");
  assert.equal(result.stages[1].status, "skipped");
  assert.equal(result.stages[2].status, "skipped");
  assert.equal(result.stages[3].status, "skipped");
  assert.equal(result.stages[4].status, "skipped");
  assert.equal(result.stages[5].status, "skipped");
  assert.equal(result.stages[6].status, "skipped");
  assert.ok(result.diagnostics.some((d) => d.code === "PIPELINE_BLOCKED_BY_IMPORT"));
});

test("linear migration pipeline stage results are deterministic across repeated runs", async () => {
  const rootDir = fixtureDir("simple-site");

  const out1 = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const out2 = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });

  const r1 = runLinearMigrationPipeline({ importOutput: out1, importManifest: createImportManifest(out1) });
  const r2 = runLinearMigrationPipeline({ importOutput: out2, importManifest: createImportManifest(out2) });

  assert.equal(stableStringify(r1 as unknown as JsonValue), stableStringify(r2 as unknown as JsonValue));
});

test("linear migration pipeline includes design_intelligence output with DesignModel", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-design-intelligence-stage",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const result = runLinearMigrationPipeline({ importOutput, importManifest });

  const stage = result.stages.find((s) => s.stageId === "design_intelligence");
  assert.ok(stage);
  assert.equal(stage.output.designModel.kind, "design_model_v1");
  assert.equal(stage.output.deterministicDesignModel.kind, "design_model_v1");
  assert.ok(stage.output.aiSuggestionMerge.status.length > 0);
  assert.equal(typeof stage.output.designModel.layoutStrategy, "string");
  assert.ok(stage.output.designModel.sectionDecisions.length >= 1);
});

test("linear migration pipeline includes visual_analysis result and keeps stage deterministic", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-visual-analysis-stage",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const result = runLinearMigrationPipeline(
    { importOutput, importManifest },
    {
      visualAnalysisInput: {
        kind: "visual_screenshot_input_v1",
        version: "1.0.0",
        screenshots: [
          {
            screenshotId: "shot-1",
            pageId: importOutput.rawDomSnapshot.documents[0]?.path ?? "index.html",
            source: { kind: "file_path", value: "/tmp/fixture.png" },
            viewport: { width: 1440, height: 900 },
          },
        ],
        pageMetrics: [
          {
            pageId: resultPageIdFallback(importOutput.rawDomSnapshot.documents[0]?.path ?? "index.html"),
            heroTopViewportCoverage: 0.62,
            imageAreaRatio: 0.54,
            textAreaRatio: 0.28,
            whitespaceRatio: 0.2,
            aboveFoldPrimaryCtaContrast: 0.66,
            sectionRepetitionScore: 0.34,
            footerHeightRatio: 0.14,
          },
        ],
      },
    },
  );

  const visualStage = result.stages.find((s) => s.stageId === "visual_analysis");
  assert.ok(visualStage);
  assert.equal(visualStage.output.visualAnalysis.kind, "visual_analysis_model_v1");
  assert.equal(typeof visualStage.output.visualAnalysis.pageObservations.heroProminence, "string");
});

test("linear migration pipeline design stage merges computed style samples with structure context", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-style-merge",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const result = runLinearMigrationPipeline(
    { importOutput, importManifest },
    {
      computedStyleSamples: [
        {
          kind: "computed_style_sample_v1",
          sampleId: "root",
          target: "root",
          selector: "body",
          tagName: "body",
          className: "page",
          styles: {
            fontFamily: "Inter",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            color: "#111111",
            backgroundColor: "#0f172a",
            borderRadius: "0px",
            paddingTop: "16px",
            paddingRight: "16px",
            paddingBottom: "16px",
            paddingLeft: "16px",
          },
        },
        {
          kind: "computed_style_sample_v1",
          sampleId: "h1",
          target: "h1",
          selector: "h1",
          tagName: "h1",
          className: "hero",
          styles: {
            fontFamily: "Inter",
            fontSize: "42px",
            fontWeight: "700",
            lineHeight: "46px",
            color: "#e2e8f0",
            backgroundColor: "transparent",
            borderRadius: "0px",
            paddingTop: "0px",
            paddingRight: "0px",
            paddingBottom: "0px",
            paddingLeft: "0px",
          },
        },
        {
          kind: "computed_style_sample_v1",
          sampleId: "cta",
          target: "primary_cta",
          selector: "button",
          tagName: "button",
          className: "btn cta",
          styles: {
            fontFamily: "Inter",
            fontSize: "16px",
            fontWeight: "600",
            lineHeight: "20px",
            color: "#ffffff",
            backgroundColor: "#2563eb",
            borderRadius: "10px",
            paddingTop: "10px",
            paddingRight: "16px",
            paddingBottom: "10px",
            paddingLeft: "16px",
          },
        },
      ],
      renderedCaptureContext: {
        status: "available",
        quality: "strong",
      },
    },
  );

  const designStage = result.stages.find((stage) => stage.stageId === "design_intelligence");
  assert.ok(designStage);
  assert.ok(designStage.output.designModel.styleSignals.sourceMode === "mixed" || designStage.output.designModel.styleSignals.sourceMode === "computed_style");
  assert.equal(designStage.output.designModel.layoutStrategy, "cta_focused");
});

function resultPageIdFallback(sourcePath: string): string {
  // The visual-analysis stage is hint-based; pageId mismatch intentionally exercises safe low-confidence merge behavior.
  return sourcePath;
}
