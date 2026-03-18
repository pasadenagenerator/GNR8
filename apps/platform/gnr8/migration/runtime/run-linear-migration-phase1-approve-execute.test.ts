import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../../import/import-contract";
import { createImportManifest } from "../../import/import-manifest";
import { importStaticSite } from "../../import/runtime/import-static-site";
import { stableStringify } from "./diagnostics";
import { runLinearMigrationPipeline } from "./run-linear-migration-pipeline";
import { createApprovalPackage } from "../approval-package-model";
import { createExecutionPlan } from "../execution-plan-model";
import { executePhase1ApplySimulation } from "../execution-result-model";
import { runLinearMigrationPhase1ApproveExecute } from "./run-linear-migration-phase1-approve-execute";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../../import/__fixtures__/${name}`);
}

function validationFixtureDir(name: "real-site-03"): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../../validation/fixtures/${name}`);
}

test("phase-1 approval package is deterministic across repeated runs", async () => {
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

  const p1 = runLinearMigrationPipeline({ importOutput: out1, importManifest: createImportManifest(out1) });
  const p2 = runLinearMigrationPipeline({ importOutput: out2, importManifest: createImportManifest(out2) });

  const a1 = createApprovalPackage(p1);
  const a2 = createApprovalPackage(p2);

  assert.equal(stableStringify(a1 as unknown as JsonValue), stableStringify(a2 as unknown as JsonValue));
  assert.equal(a1.eligibility.status, "approvable");
  assert.equal(a1.eligibility.blockingReasons.length, 0);
});

test("non-structural asset failures remain visible and produce warning-mode approval/execution artifacts", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.equal(importManifest.status, "success_with_warnings");
  assert.equal(pipeline.status, "success");

  const approvalPackage = createApprovalPackage(pipeline);
  assert.equal(approvalPackage.eligibility.status, "approvable_with_warnings");
  assert.ok(approvalPackage.approvalPackageId.length > 0);
  assert.ok(approvalPackage.eligibility.warningCodes.includes("missing_local_asset"));
  assert.equal(approvalPackage.eligibility.blockingReasons.length, 0);

  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });
  assert.equal(executionPlan.eligibility.status, "eligible");
  assert.equal(executionPlan.executionMode, "simulation_only");

  const executionResult = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  assert.equal(executionResult.status, "executed_with_warnings");
  assert.ok(executionResult.executedSteps.length > 0);
  assert.ok(executionResult.warningCodes.includes("missing_local_asset"));
});

test("structural import failures still produce blocked approval/execution artifacts", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "missing.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.equal(importManifest.status, "failed");
  assert.equal(pipeline.status, "failed");

  const approvalPackage = createApprovalPackage(pipeline);
  assert.equal(approvalPackage.eligibility.status, "blocked");
  assert.ok(approvalPackage.eligibility.blockingReasons.some((r) => r.code === "PIPELINE_STATUS_FAILED"));

  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });
  assert.equal(executionPlan.eligibility.status, "blocked");

  const executionResult = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  assert.equal(executionResult.status, "blocked");
});

test("execution plan generation is deterministic and steps are canonical", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest: createImportManifest(importOutput) });

  const approvalPackage = createApprovalPackage(pipeline);
  const plan1 = createExecutionPlan({ pipeline, approvalPackage });
  const plan2 = createExecutionPlan({ pipeline, approvalPackage });

  assert.equal(stableStringify(plan1 as unknown as JsonValue), stableStringify(plan2 as unknown as JsonValue));
  assert.deepEqual(plan1.steps.map((s) => s.stepId), [
    "validate_approval_package_v1",
    "enumerate_preview_pages_v1",
    "compute_target_artifacts_v1",
    "emit_simulation_result_v1",
  ]);
});

test("execution simulation returns stable structured results", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest: createImportManifest(importOutput) });

  const approvalPackage = createApprovalPackage(pipeline);
  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });

  const r1 = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  const r2 = executePhase1ApplySimulation({ approvalPackage, executionPlan });

  assert.equal(stableStringify(r1 as unknown as JsonValue), stableStringify(r2 as unknown as JsonValue));
  assert.ok(r1.summary.includes("phase1_apply_simulation"));
  assert.ok(r1.executionResultId.length > 0);
});

test("degraded-but-previewable inputs still produce approvable-with-warnings artifacts", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const pipeline = runLinearMigrationPipeline({ importOutput, importManifest: createImportManifest(importOutput) });

  // Deterministically degrade the PreviewDocument without introducing new parsing:
  // carry a warning code to force approvable-with-warnings paths.
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
  assert.equal(approvalPackage.eligibility.status, "approvable_with_warnings");
  assert.ok(approvalPackage.eligibility.warningCodes.includes("SYNTHETIC_WARNING_CODE_V1"));

  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });
  assert.equal(executionPlan.eligibility.status, "eligible");

  const executionResult = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  assert.equal(executionResult.status, "executed_with_warnings");
  assert.equal(executionResult.targetArtifacts.length, executionPlan.targetArtifacts.length);
});

test("phase-1 approve→execute runtime entrypoint is deterministic end-to-end", async () => {
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

  assert.equal(stableStringify(r1 as unknown as JsonValue), stableStringify(r2 as unknown as JsonValue));
});
