import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../../import/import-contract";
import { importStaticSite } from "../../import/runtime/import-static-site";
import { createImportManifest } from "../../import/import-manifest";
import { runLinearMigrationPipeline } from "./run-linear-migration-pipeline";
import { createApprovalPackage } from "../approval-package-model";
import { createExecutionPlan } from "../execution-plan-model";
import { executePhase1ApplySimulation } from "../execution-result-model";
import { createMigrationRunReport } from "../migration-run-report";
import { stableStringify } from "./diagnostics";
import { runLinearMigrationPhase1ApproveExecute } from "./run-linear-migration-phase1-approve-execute";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../../import/__fixtures__/${name}`);
}

function validationFixtureDir(name: "real-site-03"): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../../validation/fixtures/${name}`);
}

test("migration run report is deterministic across repeated end-to-end runs", async () => {
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

  const r1 = runLinearMigrationPhase1ApproveExecute({ importOutput: out1, importManifest: createImportManifest(out1) });
  const r2 = runLinearMigrationPhase1ApproveExecute({ importOutput: out2, importManifest: createImportManifest(out2) });

  assert.equal(stableStringify(r1.report as unknown as JsonValue), stableStringify(r2.report as unknown as JsonValue));
  assert.ok(r1.report.runId.length > 0);
  assert.equal(r1.report.overallStatus, "success");
});

test("migration run report events are canonical, ordered, and stage-scoped", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest: createImportManifest(importOutput) });
  const approvalPackage = createApprovalPackage(pipeline);
  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });
  const executionResult = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  const report = createMigrationRunReport({ pipeline, approvalPackage, executionPlan, executionResult });

  assert.deepEqual(report.stageExecutionOrder, [
    "run",
    "import",
    ...pipeline.stageOrder,
    "approval",
    "execution_plan",
    "execution_simulation",
  ]);

  // Ordinals are contiguous and eventId is derived only from ordinal+stage+kind.
  for (let i = 0; i < report.events.length; i++) {
    const e = report.events[i];
    assert.equal(e.ordinal, i);
    assert.ok(e.eventId.startsWith(`evt_${String(i).padStart(4, "0")}_`));
  }

  // For each stage: artifact presence events come before stage summary.
  for (const stageId of report.stageExecutionOrder) {
    const stageEvents = report.events.filter((e) => e.stageId === stageId);
    assert.ok(stageEvents.length > 0);
    const last = stageEvents[stageEvents.length - 1];
    assert.equal(last.kind, "stage_summary_v1");
  }

  // Import stage artifact presence order is canonical (lexicographic artifactKey).
  const importEvents = report.events.filter((e) => e.stageId === "import");
  const importArtifactEvents = importEvents.filter((e) => e.kind === "artifact_presence_v1");
  assert.deepEqual(
    importArtifactEvents.map((e) => e.sourceArtifactKey),
    ["import_manifest", "import_output"],
  );
});

test("non-structural asset failures produce success_with_warnings run reports with full traceability", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const result = runLinearMigrationPhase1ApproveExecute({ importOutput, importManifest });
  const report = result.report;

  assert.equal(importManifest.status, "success_with_warnings");
  assert.equal(report.source.pipeline.pipelineStatus, "success");
  assert.equal(report.overallStatus, "success_with_warnings");

  assert.ok(report.stageExecutionOrder.length > 0);
  assert.ok(report.stages.length > 0);
  assert.ok(report.events.length > 0);

  assert.equal(report.approval.status, "approvable_with_warnings");
  assert.equal(report.execution.plan.eligibility, "eligible");
  assert.equal(report.execution.result.status, "executed_with_warnings");
  assert.ok(report.diagnostics.warnings.codes.includes("missing_local_asset"));

  // Artifact availability is always explicitly reported.
  const keys = report.artifacts.availability.map((a) => a.artifactKey).slice().sort();
  assert.deepEqual(keys, [
    "approval_package",
    "execution_plan",
    "execution_result",
    "import_manifest",
    "import_output",
    "layout_preparation_model",
    "prepared_site_model",
    "preview_document",
    "render_output",
  ]);
});

test("structural import failures still produce failed run reports", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "missing.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const result = runLinearMigrationPhase1ApproveExecute({ importOutput, importManifest });
  const report = result.report;

  assert.equal(importManifest.status, "failed");
  assert.equal(report.source.pipeline.pipelineStatus, "failed");
  assert.equal(report.overallStatus, "failed");
  assert.equal(report.approval.status, "blocked");
  assert.equal(report.execution.plan.eligibility, "blocked");
  assert.equal(report.execution.result.status, "blocked");
});

test("degraded but previewable inputs yield success_with_warnings report and preserve traceability", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest: createImportManifest(importOutput) });

  const previewStage = pipeline.stages.find((s) => s.stageId === "preview_generation");
  assert.ok(previewStage, "expected preview_generation stage");
  previewStage.output.previewDocument = {
    ...previewStage.output.previewDocument,
    status: "ready_with_warnings",
    diagnostics: {
      ...previewStage.output.previewDocument.diagnostics,
      preview: { warnings: { codes: ["SYNTHETIC_WARNING_CODE_V1"] } },
    },
  };

  const approvalPackage = createApprovalPackage(pipeline);
  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });
  const executionResult = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  const report = createMigrationRunReport({ pipeline, approvalPackage, executionPlan, executionResult });

  assert.equal(report.overallStatus, "success_with_warnings");
  assert.ok(report.diagnostics.warnings.codes.includes("SYNTHETIC_WARNING_CODE_V1"));

  assert.equal(report.execution.trace.approvalPackageId, approvalPackage.approvalPackageId);
  assert.equal(report.execution.trace.executionPlanId, executionPlan.executionPlanId);
  assert.equal(report.source.execution.executionResultId, executionResult.executionResultId);
});
