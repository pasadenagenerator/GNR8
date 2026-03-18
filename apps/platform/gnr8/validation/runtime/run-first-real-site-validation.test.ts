import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import { runFirstRealSiteValidation } from "./run-first-real-site-validation";

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

test("first real-site validation runner output is deterministic across repeated runs (no snapshots)", async () => {
  const r1 = await runFirstRealSiteValidation({ requestId: "req-validation-real-site-01" });
  const r2 = await runFirstRealSiteValidation({ requestId: "req-validation-real-site-01" });

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

test("snapshot writing is deterministic and produces inspectable preview/report artifacts", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-validation-"));
  const outRoot = path.resolve(tmp, "out");

  const first = await runFirstRealSiteValidation({
    requestId: "req-validation-real-site-01",
    writeSnapshots: true,
    snapshotOutDirAbs: outRoot,
  });

  assert.equal(first.snapshots.enabled, true);
  assert.ok(first.snapshots.outDirAbs);
  assert.ok(first.snapshots.writtenFiles.includes("preview-document.json"));
  assert.ok(first.snapshots.writtenFiles.includes("migration-run-report.json"));

  const base = path.resolve(outRoot, first.fixtureId);
  const files = [...first.snapshots.writtenFiles].sort((a, b) => a.localeCompare(b));
  const contents1 = new Map<string, string>();
  for (const rel of files) contents1.set(rel, fs.readFileSync(path.resolve(base, rel), "utf8"));

  const second = await runFirstRealSiteValidation({
    requestId: "req-validation-real-site-01",
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
});

