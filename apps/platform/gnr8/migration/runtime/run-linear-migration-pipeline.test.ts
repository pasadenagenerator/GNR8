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
    ["import_intake", "structure_preparation", "layout_preparation", "render_preparation"],
  );
  assert.deepEqual(result.stageOrder, ["import_intake", "structure_preparation", "layout_preparation", "render_preparation"]);
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
  assert.ok(result.summary.includes("linear_migration_pipeline"));
  assert.ok(result.diagnostics.every((d) => d.stageId === "import_intake" || d.stageId === "structure_preparation" || d.stageId === "layout_preparation" || d.stageId === "render_preparation"));
});

test("linear migration pipeline returns structured result in failure case (no throw)", async () => {
  const rootDir = fixtureDir("asset-validation-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });

  assert.equal(importManifest.status, "failed");
  assert.equal(result.status, "failed");
  assert.equal(result.stages[0].stageId, "import_intake");
  assert.equal(result.stages[0].status, "failed");
  assert.equal(result.stages[1].status, "skipped");
  assert.equal(result.stages[2].status, "skipped");
  assert.equal(result.stages[3].status, "skipped");

  const importDiags = result.diagnostics.filter((d) => d.source === "import");
  assert.ok(importDiags.length > 0);
  assert.ok(importDiags.every((d) => d.stageId === "import_intake"));

  const pipelineDiags = result.diagnostics.filter((d) => d.source === "pipeline" && d.stageId === "import_intake");
  assert.ok(pipelineDiags.some((d) => d.code === "PIPELINE_BLOCKED_BY_IMPORT"));
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

