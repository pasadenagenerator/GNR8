import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { createImportManifest } from "../import/import-manifest";
import { importStaticSite } from "../import/runtime/import-static-site";
import { readValidationFixtureSpec, validationFixtureDirAbs } from "../validation/runtime/fixture-spec";
import { createLayoutPreparationModel } from "./layout-preparation-model";
import { createPreparedSiteModel } from "./prepared-site-model";
import { createRenderOutput } from "./render-output-model";
import { createStaticHtmlRenderArtifact } from "./static-html-render-artifact";
import { stableStringify } from "./runtime/diagnostics";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../import/__fixtures__/${name}`);
}

test("createStaticHtmlRenderArtifact is deterministic across repeated runs", async () => {
  const rootDir = fixtureDir("simple-site");

  const out1 = await importStaticSite({
    rootDir,
    requestId: "req-static-html-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const out2 = await importStaticSite({
    rootDir,
    requestId: "req-static-html-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });

  const p1 = createPreparedSiteModel({ importOutput: out1, importManifest: createImportManifest(out1) });
  const p2 = createPreparedSiteModel({ importOutput: out2, importManifest: createImportManifest(out2) });
  const l1 = createLayoutPreparationModel(p1);
  const l2 = createLayoutPreparationModel(p2);
  const r1 = createRenderOutput(l1);
  const r2 = createRenderOutput(l2);

  const a1 = createStaticHtmlRenderArtifact(r1);
  const a2 = createStaticHtmlRenderArtifact(r2);

  assert.equal(stableStringify(a1 as unknown as JsonValue), stableStringify(a2 as unknown as JsonValue));
});

test("createStaticHtmlRenderArtifact canonicalizes page/node ordering and output paths", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-static-html-order",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);

  const pageA = renderOutput.pages[0]!;
  const pageB = {
    ...pageA,
    renderedPageId: `zz-${pageA.renderedPageId}`,
    sourcePageId: `zz-${pageA.sourcePageId}`,
    sourceDocumentId: `zz-${pageA.sourceDocumentId}`,
    sourcePath: "about",
    isEntry: false,
    nodes: [...pageA.nodes].slice().reverse(),
  };

  const synthetic = {
    ...renderOutput,
    pages: [pageB, { ...pageA, nodes: [...pageA.nodes].slice().reverse() }],
    pageSummaries: [
      ...renderOutput.pageSummaries,
      {
        renderedPageId: pageB.renderedPageId,
        sourcePageId: pageB.sourcePageId,
        sourcePath: pageB.sourcePath,
        eligibility: pageB.eligibility,
        renderedNodeCount: pageB.nodes.length,
      },
    ].reverse(),
    siteSummary: {
      ...renderOutput.siteSummary,
      pageCount: 2,
      eligiblePageCount: 2,
      ineligiblePageCount: 0,
      renderedNodeCount: pageA.nodes.length + pageB.nodes.length,
    },
  };

  const artifact = createStaticHtmlRenderArtifact(synthetic);

  assert.deepEqual(
    artifact.pages.map((p) => p.sourcePath),
    ["about", "index.html"],
  );
  assert.deepEqual(
    artifact.pages.map((p) => p.outputPath),
    ["about.html", "index.html"],
  );
  assert.equal(artifact.pages[0]!.renderedNodeCount, artifact.pages[0]!.sourceRenderedNodeIds.length);
  assert.ok(artifact.pages[0]!.htmlDocument?.html.includes('data-ordinal-index="0"'));
  assert.ok(artifact.pages[0]!.htmlDocument?.html.includes('data-ordinal-index="1"'));
});

test("createStaticHtmlRenderArtifact emits real HTML documents and deterministic section mapping", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-static-html-doc",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);
  const artifact = createStaticHtmlRenderArtifact(renderOutput);

  assert.equal(artifact.pages.length, 1);
  assert.equal(artifact.pages[0]!.renderability.status, "renderable");
  assert.equal(artifact.pages[0]!.htmlDocument?.kind, "static_html_document_v1");

  const html = artifact.pages[0]!.htmlDocument!.html;
  assert.ok(html.startsWith("<!doctype html>\n"));
  assert.ok(html.includes("<html"));
  assert.ok(html.includes("<head>"));
  assert.ok(html.includes("<body"));
  assert.ok(html.includes('<main data-gnr8-main="phase1-static-html">'));
  assert.ok(html.includes("<title>index.html</title>"));

  const sectionCount = (html.match(/<section /g) ?? []).length;
  assert.equal(sectionCount, renderOutput.pages[0]!.nodes.length);
  assert.ok(html.includes("<p>Hello GNR8</p>"));
});

test("createStaticHtmlRenderArtifact keeps degraded/minimal non-renderable states structured", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-static-html-degraded",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });

  const degradedPrepared = {
    ...prepared,
    documents: prepared.documents.map((d) => ({ ...d, domOutline: null })),
  };
  const degradedLayout = createLayoutPreparationModel(degradedPrepared);
  const degradedRender = createRenderOutput(degradedLayout);
  const degradedArtifact = createStaticHtmlRenderArtifact(degradedRender);

  assert.equal(degradedArtifact.status, "blocked");
  assert.equal(degradedArtifact.pages.length, degradedRender.pages.length);
  assert.equal(degradedArtifact.pages[0]!.renderability.status, "not_renderable");
  assert.equal(degradedArtifact.pages[0]!.htmlDocument, null);
  assert.ok(degradedArtifact.diagnostics.staticHtml.warnings.codes.includes("INELIGIBLE_PAGE_NOT_RENDERABLE"));
  assert.ok(degradedArtifact.diagnostics.staticHtml.warnings.codes.includes("NO_RENDERABLE_PAGES"));

  const minimalPrepared = { ...prepared, documents: [] };
  const minimalLayout = createLayoutPreparationModel(minimalPrepared);
  const minimalRender = createRenderOutput(minimalLayout);
  const minimalArtifact = createStaticHtmlRenderArtifact(minimalRender);

  assert.equal(minimalArtifact.status, "blocked");
  assert.equal(minimalArtifact.pages.length, 0);
  assert.ok(minimalArtifact.diagnostics.staticHtml.warnings.codes.includes("NO_RENDERABLE_PAGES"));
});

test("all current validation fixtures render through static-html path and warning-mode fixture still emits HTML", async () => {
  const fixtureIds = ["real-site-01", "real-site-02", "real-site-03"] as const;

  for (const fixtureId of fixtureIds) {
    const fixture = readValidationFixtureSpec(fixtureId);
    const importOutput = await importStaticSite({
      rootDir: validationFixtureDirAbs(fixtureId),
      requestId: `req-static-html-fixture-${fixtureId}`,
      source: {
        kind: "single-entry-html",
        entryHtmlPath: fixture.entryHtmlPath,
        ...(fixture.assetsDirPath ? { assetsDirPath: fixture.assetsDirPath } : {}),
      },
    });

    const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
    const layout = createLayoutPreparationModel(prepared);
    const renderOutput = createRenderOutput(layout);
    const artifact = createStaticHtmlRenderArtifact(renderOutput);

    assert.ok(artifact.pages.length >= 1);
    const renderable = artifact.pages.filter((p) => p.renderability.status === "renderable");
    assert.ok(renderable.length >= 1);
    for (const page of renderable) {
      assert.ok(page.outputPath.length > 0);
      assert.ok(page.outputPath.endsWith(".html"));
      assert.equal(page.htmlDocument?.kind, "static_html_document_v1");
      assert.ok(page.htmlDocument?.html.includes("<!doctype html>"));
      assert.ok(page.htmlDocument?.html.includes("<main"));
    }
  }

  const warningFixture = readValidationFixtureSpec("real-site-03");
  const warningImport = await importStaticSite({
    rootDir: validationFixtureDirAbs("real-site-03"),
    requestId: "req-static-html-fixture-real-site-03",
    source: {
      kind: "single-entry-html",
      entryHtmlPath: warningFixture.entryHtmlPath,
      ...(warningFixture.assetsDirPath ? { assetsDirPath: warningFixture.assetsDirPath } : {}),
    },
  });
  const warningPrepared = createPreparedSiteModel({
    importOutput: warningImport,
    importManifest: createImportManifest(warningImport),
  });
  const warningLayout = createLayoutPreparationModel(warningPrepared);
  const warningRender = createRenderOutput(warningLayout);
  const warningArtifact = createStaticHtmlRenderArtifact(warningRender);

  assert.equal(warningArtifact.status, "ready_with_warnings");
  assert.ok(warningArtifact.summary.generatedHtmlDocumentCount >= 1);
  assert.ok(warningArtifact.pages.some((p) => p.renderability.status === "renderable" && p.htmlDocument !== null));
});
