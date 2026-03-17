import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { createImportManifest } from "../import/import-manifest";
import { importStaticSite } from "../import/runtime/import-static-site";
import { createLayoutPreparationModel } from "./layout-preparation-model";
import { createPreparedSiteModel } from "./prepared-site-model";
import { createPreviewDocument } from "./preview-document-model";
import { createRenderOutput } from "./render-output-model";
import { stableStringify } from "./runtime/diagnostics";
import { runLinearMigrationPipeline } from "./runtime/run-linear-migration-pipeline";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../import/__fixtures__/${name}`);
}

test("createPreviewDocument is deterministic across repeated runs", async () => {
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

  const d1 = createPreviewDocument(r1);
  const d2 = createPreviewDocument(r2);

  assert.equal(stableStringify(d1 as unknown as JsonValue), stableStringify(d2 as unknown as JsonValue));
});

test("createPreviewDocument canonicalizes ordering of pages and preview sections", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });

  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);

  const shuffledRenderOutput = {
    ...renderOutput,
    pages: [...renderOutput.pages].slice().reverse().map((p) => ({ ...p, nodes: [...p.nodes].slice().reverse() })),
    pageSummaries: [...renderOutput.pageSummaries].slice().reverse(),
  };

  const d1 = createPreviewDocument(renderOutput);
  const d2 = createPreviewDocument(shuffledRenderOutput);

  assert.equal(stableStringify(d1 as unknown as JsonValue), stableStringify(d2 as unknown as JsonValue));

  assert.equal(d1.pages.length, 1);
  assert.equal(d1.pages[0]!.sourcePath, "index.html");
  assert.equal(d1.pages[0]!.previewNodeCount, 3);
  assert.equal(d1.pages[0]!.preview.kind, "preview_markup_html_v1");
  assert.deepEqual(d1.pages[0]!.sourceRenderedNodeIds.length, 3);
  assert.ok(d1.pages[0]!.preview.html.includes('data-ordinal-index="0"'));
  assert.ok(d1.pages[0]!.preview.html.includes('data-ordinal-index="1"'));
  assert.ok(d1.pages[0]!.preview.html.includes('data-ordinal-index="2"'));
});

test("createPreviewDocument emits structured output for degraded/minimal inputs", async () => {
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
  const degradedPreview = createPreviewDocument(degradedRender);

  assert.equal(degradedPreview.pages.length, degradedRender.pages.length);
  assert.equal(degradedPreview.pages[0]!.previewEligibility, "not_previewable");
  assert.equal(degradedPreview.pages[0]!.previewNodeCount, 0);
  assert.equal(degradedPreview.status, "blocked");
  assert.ok(degradedPreview.pages[0]!.preview.html.includes('data-preview-note="not_previewable"'));

  const minimalPrepared = { ...prepared, documents: [] };
  const minimalLayout = createLayoutPreparationModel(minimalPrepared);
  const minimalRender = createRenderOutput(minimalLayout);
  const minimalPreview = createPreviewDocument(minimalRender);

  assert.equal(minimalPreview.pages.length, 0);
  assert.equal(minimalPreview.status, "blocked");
  assert.ok(minimalPreview.diagnostics.preview.warnings.codes.includes("NO_PREVIEWABLE_PAGES"));
});

test("preview_generation stage output contains PreviewDocument", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });
  const s5 = result.stages.find((s) => s.stageId === "preview_generation");
  assert.ok(s5);
  assert.equal(s5.output.previewDocument.kind, "preview_document_v1");
  assert.ok(s5.output.previewDocument.pages.length >= 1);
});
