import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import { readValidationFixtureSpec } from "./fixture-spec";
import { runFirstRealSiteValidation, runRealSiteValidation } from "./run-first-real-site-validation";

test("validation fixture resolver supports both explicit fixture ids", () => {
  const f1 = readValidationFixtureSpec("real-site-01");
  const f2 = readValidationFixtureSpec("real-site-02");

  assert.equal(f1.fixtureId, "real-site-01");
  assert.equal(f2.fixtureId, "real-site-02");
  assert.equal(f1.kind, "static_marketing_site_v1");
  assert.equal(f2.kind, "static_marketing_site_v1");
});

test("first real-site validation runner executes full phase-1 flow and returns core artifacts", async () => {
  const r = await runFirstRealSiteValidation({ requestId: "req-validation-real-site-01" });

  assert.equal(r.kind, "validation_run_result_v1");
  assert.equal(r.fixtureId, "real-site-01");
  assert.equal(r.importManifest.status, "success");
  assert.equal(r.pipelineResult.status, "success");
  assert.equal(r.previewDocument.kind, "preview_document_v1");
  assert.equal(r.approvalPackage.eligibility.status, "approvable");
  assert.equal(r.executionPlan.eligibility.status, "eligible");
  assert.equal(r.executionResult.status, "executed");
  assert.equal(r.migrationRunReport.kind, "migration_run_report_v1");
  assert.equal(r.migrationRunReport.overallStatus, "success");

  assert.equal(r.validationSummary.fixtureId, "real-site-01");
  assert.equal(r.validationSummary.overallStatus, "passed");
  assert.ok(r.validationSummary.counts.previewPageCount >= 1);
  assert.ok(r.validationSummary.counts.renderedPageCount >= 1);
});

test("real-site-02 runs full phase-1 flow and emits structured summary", async () => {
  const r = await runRealSiteValidation({ fixtureId: "real-site-02", requestId: "req-validation-real-site-02" });

  assert.equal(r.kind, "validation_run_result_v1");
  assert.equal(r.fixtureId, "real-site-02");
  assert.equal(r.validationSummary.fixtureId, "real-site-02");
  assert.equal(r.validationSummary.kind, "validation_summary_v1");

  assert.equal(typeof r.validationSummary.overallStatus, "string");
  assert.equal(typeof r.validationSummary.pipeline.status, "string");
  assert.ok(r.validationSummary.counts.previewPageCount >= 1);
  assert.ok(r.validationSummary.counts.renderedPageCount >= 1);

  assert.equal(r.validationSummary.comparison.fixtureId, "real-site-02");
  assert.equal(r.validationSummary.comparison.overallValidationStatus, r.validationSummary.overallStatus);
  assert.equal(r.validationSummary.comparison.pipelineStatus, r.validationSummary.pipeline.status);
  assert.equal(r.validationSummary.comparison.previewPageCount, r.validationSummary.counts.previewPageCount);
  assert.equal(r.validationSummary.comparison.renderedPageCount, r.validationSummary.counts.renderedPageCount);
  assert.equal(r.validationSummary.comparison.runReportOverallStatus, r.validationSummary.report.overallStatus);
  assert.ok(Array.isArray(r.validationSummary.comparison.keyDiagnosticCodes));

  const layoutStage = r.pipelineResult.stages.find((s) => s.stageId === "layout_preparation");
  assert.ok(layoutStage);
  const layoutPage = layoutStage.output.layoutModel.pages[0];
  assert.ok(layoutPage);
  assert.ok(layoutPage.blocks.length > 1);
  assert.equal(layoutPage.blockExtraction.rule, "body_child_elements_with_single_child_wrapper_promotion_v2");
  assert.deepEqual(
    layoutPage.blocks.map((b) => b.ordinalIndex),
    [...layoutPage.blocks].map((_, i) => i),
  );

  assert.ok(r.previewDocument.siteSummary.previewNodeCount > 1);
  assert.equal(
    r.previewDocument.siteSummary.previewNodeCount,
    r.pipelineResult.stages.find((s) => s.stageId === "render_preparation")!.output.renderOutput.siteSummary.renderedNodeCount,
  );
});

test("real-site-01 preview markup contains deterministic visible section content", async () => {
  const r = await runFirstRealSiteValidation({ requestId: "req-validation-real-site-01" });
  const firstPreviewablePage = r.previewDocument.pages.find((p) => p.previewEligibility === "previewable") ?? null;
  assert.ok(firstPreviewablePage);

  const html = firstPreviewablePage.preview.html;
  const sectionCount = (html.match(/data-preview-section-id=/g) ?? []).length;
  const visibleCount = (html.match(/data-preview-visible=\"true\"/g) ?? []).length;

  assert.ok(sectionCount > 0);
  assert.equal(visibleCount, sectionCount);
});

test("real-site-02 output is deterministic across repeated runs", async () => {
  const r1 = await runRealSiteValidation({ fixtureId: "real-site-02", requestId: "req-validation-real-site-02" });
  const r2 = await runRealSiteValidation({ fixtureId: "real-site-02", requestId: "req-validation-real-site-02" });

  assert.equal(stableStringify(r1 as unknown as JsonValue), stableStringify(r2 as unknown as JsonValue));
});

test("validation summary reflects artifact state and pipeline stage statuses", async () => {
  const r = await runFirstRealSiteValidation({ requestId: "req-validation-real-site-01" });

  assert.deepEqual(r.validationSummary.artifacts, {
    importOutput: true,
    importManifest: true,
    pipelineResult: true,
    previewDocument: true,
    approvalPackage: true,
    executionPlan: true,
    executionResult: true,
    migrationRunReport: true,
  });

  assert.equal(r.validationSummary.pipeline.status, r.pipelineResult.status);
  assert.equal(r.validationSummary.pipeline.stages.import_intake, "success");
  assert.equal(r.validationSummary.pipeline.stages.structure_preparation, "success");
  assert.equal(r.validationSummary.pipeline.stages.layout_preparation, "success");
  assert.equal(r.validationSummary.pipeline.stages.render_preparation, "success");
  assert.equal(r.validationSummary.pipeline.stages.preview_generation, "success");
});

test("both fixtures can run through shared runner and expose comparison-capable summaries", async () => {
  const fixtureIds = ["real-site-01", "real-site-02"] as const;

  const runs = await Promise.all(
    fixtureIds.map((fixtureId) => runRealSiteValidation({ fixtureId, requestId: `req-validation-${fixtureId}` })),
  );

  for (const r of runs) {
    assert.equal(r.kind, "validation_run_result_v1");
    assert.equal(r.validationSummary.comparison.fixtureId, r.fixtureId);
    assert.equal(typeof r.validationSummary.comparison.overallValidationStatus, "string");
    assert.equal(typeof r.validationSummary.comparison.pipelineStatus, "string");
    assert.equal(typeof r.validationSummary.comparison.previewPageCount, "number");
    assert.equal(typeof r.validationSummary.comparison.renderedPageCount, "number");
    assert.equal(typeof r.validationSummary.comparison.runReportOverallStatus, "string");
  }
});

test("snapshot writing is deterministic and stable for both fixtures", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-validation-"));
  const outRoot = path.resolve(tmp, "out");
  const fixtureIds = ["real-site-01", "real-site-02"] as const;

  for (const fixtureId of fixtureIds) {
    const first = await runRealSiteValidation({
      fixtureId,
      requestId: `req-validation-${fixtureId}`,
      writeSnapshots: true,
      snapshotOutDirAbs: outRoot,
    });

    assert.equal(first.snapshots.enabled, true);
    assert.ok(first.snapshots.outDirAbs);
    assert.ok(first.snapshots.writtenFiles.includes("preview-document.json"));
    assert.ok(first.snapshots.writtenFiles.includes("migration-run-report.json"));

    const base = path.resolve(outRoot, fixtureId);
    const files = [...first.snapshots.writtenFiles].sort((a, b) => a.localeCompare(b));
    const contents1 = new Map<string, string>();
    for (const rel of files) contents1.set(rel, fs.readFileSync(path.resolve(base, rel), "utf8"));

    const second = await runRealSiteValidation({
      fixtureId,
      requestId: `req-validation-${fixtureId}`,
      writeSnapshots: true,
      snapshotOutDirAbs: outRoot,
    });
    assert.equal(second.snapshots.outDirAbs, base);

    for (const rel of files) {
      const c2 = fs.readFileSync(path.resolve(base, rel), "utf8");
      assert.equal(contents1.get(rel), c2);
    }

    const previewJson = JSON.parse(fs.readFileSync(path.resolve(base, "preview-document.json"), "utf8")) as { kind?: unknown };
    const reportJson = JSON.parse(fs.readFileSync(path.resolve(base, "migration-run-report.json"), "utf8")) as { kind?: unknown };
    assert.equal(previewJson.kind, "preview_document_v1");
    assert.equal(reportJson.kind, "migration_run_report_v1");
  }
});
