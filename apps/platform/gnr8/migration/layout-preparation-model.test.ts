import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { createImportManifest } from "../import/import-manifest";
import { importStaticSite } from "../import/runtime/import-static-site";
import { createLayoutPreparationModel } from "./layout-preparation-model";
import { createPreparedSiteModel } from "./prepared-site-model";
import { stableStringify } from "./runtime/diagnostics";
import { runLinearMigrationPipeline } from "./runtime/run-linear-migration-pipeline";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../import/__fixtures__/${name}`);
}

function validationFixtureDir(name: "real-site-01" | "real-site-02" | "real-site-03"): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../validation/fixtures/${name}`);
}

test("createLayoutPreparationModel is deterministic across repeated runs", async () => {
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

  const m1 = createImportManifest(out1);
  const m2 = createImportManifest(out2);

  const p1 = createPreparedSiteModel({ importOutput: out1, importManifest: m1 });
  const p2 = createPreparedSiteModel({ importOutput: out2, importManifest: m2 });

  const l1 = createLayoutPreparationModel(p1);
  const l2 = createLayoutPreparationModel(p2);

  assert.equal(stableStringify(l1 as unknown as JsonValue), stableStringify(l2 as unknown as JsonValue));
});

test("createLayoutPreparationModel canonicalizes ordering of pages and blocks", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });

  const shuffledPrepared = { ...prepared, documents: [...prepared.documents].slice().reverse() };

  const layout1 = createLayoutPreparationModel(prepared);
  const layout2 = createLayoutPreparationModel(shuffledPrepared);

  assert.equal(stableStringify(layout1 as unknown as JsonValue), stableStringify(layout2 as unknown as JsonValue));

  assert.equal(layout1.pages.length, 1);
  const page = layout1.pages[0]!;
  assert.equal(page.sourcePath, "index.html");
  assert.equal(page.blocks.length, 3);

  assert.deepEqual(
    page.blocks.map((b) => b.sourceTagName),
    ["h1", "img", "script"],
  );
  assert.deepEqual(
    page.blocks.map((b) => b.sourceDomPath),
    ["html>body>h1:nth-of-type(1)", "html>body>img:nth-of-type(1)", "html>body>script:nth-of-type(1)"],
  );
  assert.deepEqual(
    page.blocks.map((b) => b.ordinalIndex),
    [0, 1, 2],
  );
});

test("createLayoutPreparationModel emits structured output for degraded/minimal inputs", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  assert.ok(prepared.documents.length >= 1);

  const degradedPrepared = {
    ...prepared,
    documents: prepared.documents.map((d) => ({ ...d, domOutline: null })),
  };

  const layout = createLayoutPreparationModel(degradedPrepared);
  assert.equal(layout.pages.length, degradedPrepared.documents.length);
  assert.equal(layout.pages[0]!.blocks.length, 0);
  assert.equal(layout.pages[0]!.eligibility, "ineligible_missing_dom_outline");
  assert.ok(layout.status === "ready_with_warnings" || layout.status === "blocked");

  const minimalPrepared = { ...prepared, documents: [] };
  const minimalLayout = createLayoutPreparationModel(minimalPrepared);
  assert.equal(minimalLayout.pages.length, 0);
  assert.equal(minimalLayout.status, "blocked");
});

test("layout_preparation stage output contains LayoutPreparationModel", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });
  const s3 = result.stages.find((s) => s.stageId === "layout_preparation");
  assert.ok(s3);
  assert.equal(s3.output.layoutModel.kind, "layout_preparation_model_v1");
  assert.ok(s3.output.layoutModel.pages.length >= 1);
});

test("createLayoutPreparationModel promotes transparent single-child wrapper chains for nested marketing layouts", async () => {
  const rootDir = validationFixtureDir("real-site-02");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-real-site-02",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);

  assert.equal(layout.pages.length, 1);
  const page = layout.pages[0]!;
  assert.equal(page.eligibility, "eligible");
  assert.equal(page.blockExtraction.rule, "body_child_elements_with_single_child_wrapper_promotion_v2");
  assert.equal(page.blockExtraction.promotionDepth, 1);
  assert.equal(page.blockExtraction.extractionBoundaryDomPath, "html>body>div:nth-of-type(1)>div:nth-of-type(1)");

  assert.deepEqual(
    page.blocks.map((b) => b.sourceTagName),
    ["header", "main", "footer"],
  );
  assert.deepEqual(
    page.blocks.map((b) => b.sourceDomPath),
    [
      "html>body>div:nth-of-type(1)>div:nth-of-type(1)>header:nth-of-type(1)",
      "html>body>div:nth-of-type(1)>div:nth-of-type(1)>main:nth-of-type(1)",
      "html>body>div:nth-of-type(1)>div:nth-of-type(1)>footer:nth-of-type(1)",
    ],
  );
  assert.deepEqual(
    page.blocks.map((b) => b.ordinalIndex),
    [0, 1, 2],
  );
});

test("createLayoutPreparationModel records direct-text wrapper stop metadata for real-site-03", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-real-site-03",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);

  assert.equal(layout.pages.length, 1);
  const page = layout.pages[0]!;
  assert.equal(page.blockExtraction.rule, "body_child_elements_with_single_child_wrapper_promotion_v2");
  assert.equal(page.blockExtraction.promotionDepth, 1);
  assert.equal(page.blockExtraction.extractionBoundaryDomPath, "html>body>div:nth-of-type(1)");
  assert.equal(page.eligibility, "eligible");
  assert.ok(page.blocks.length > 0);
});
