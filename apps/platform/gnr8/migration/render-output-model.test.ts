import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { createImportManifest } from "../import/import-manifest";
import { importStaticSite } from "../import/runtime/import-static-site";
import { createLayoutPreparationModel } from "./layout-preparation-model";
import { createPreparedSiteModel } from "./prepared-site-model";
import { createRenderOutput } from "./render-output-model";
import { stableStringify } from "./runtime/diagnostics";
import { runLinearMigrationPipeline } from "./runtime/run-linear-migration-pipeline";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../import/__fixtures__/${name}`);
}

test("createRenderOutput is deterministic across repeated runs", async () => {
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

  const p1 = createPreparedSiteModel({ importOutput: out1, importManifest: createImportManifest(out1) });
  const p2 = createPreparedSiteModel({ importOutput: out2, importManifest: createImportManifest(out2) });

  const l1 = createLayoutPreparationModel(p1);
  const l2 = createLayoutPreparationModel(p2);

  const r1 = createRenderOutput(l1);
  const r2 = createRenderOutput(l2);

  assert.equal(stableStringify(r1 as unknown as JsonValue), stableStringify(r2 as unknown as JsonValue));
});

test("createRenderOutput canonicalizes ordering of pages and nodes", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);

  const shuffledLayout = {
    ...layout,
    pages: [...layout.pages].slice().reverse().map((p) => ({ ...p, blocks: [...p.blocks].slice().reverse() })),
  };

  const r1 = createRenderOutput(layout);
  const r2 = createRenderOutput(shuffledLayout);

  assert.equal(stableStringify(r1 as unknown as JsonValue), stableStringify(r2 as unknown as JsonValue));

  assert.equal(r1.pages.length, 1);
  assert.equal(r1.pages[0]!.sourcePath, "index.html");
  assert.equal(r1.pages[0]!.nodes.length, 3);
  assert.deepEqual(
    r1.pages[0]!.nodes.map((n) => n.ordinalIndex),
    [0, 1, 2],
  );
});

test("createRenderOutput emits structured output for degraded/minimal inputs", async () => {
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
  const degradedLayout = createLayoutPreparationModel(degradedPrepared);
  const degradedRender = createRenderOutput(degradedLayout);
  assert.equal(degradedRender.pages.length, degradedPrepared.documents.length);
  assert.equal(degradedRender.pages[0]!.nodes.length, 0);
  assert.equal(degradedRender.pages[0]!.eligibility, "ineligible_missing_dom_outline");
  assert.equal(degradedRender.status, "blocked");

  const minimalPrepared = { ...prepared, documents: [] };
  const minimalLayout = createLayoutPreparationModel(minimalPrepared);
  const minimalRender = createRenderOutput(minimalLayout);
  assert.equal(minimalRender.pages.length, 0);
  assert.equal(minimalRender.status, "blocked");
});

test("render_preparation stage output contains RenderOutput", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });
  const s4 = result.stages.find((s) => s.stageId === "render_preparation");
  assert.ok(s4);
  assert.equal(s4.output.renderOutput.kind, "render_output_v1");
  assert.ok(s4.output.renderOutput.pages.length >= 1);
});

