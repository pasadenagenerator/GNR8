import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
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
  assert.ok(html.includes("<title>Simple Site</title>"));
  assert.ok(html.includes('<meta charset="utf-8">'));
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
  assert.ok(html.includes('<link rel="stylesheet" href="./assets/styles.css">'));

  const sectionCount = (html.match(/<section /g) ?? []).length;
  assert.equal(sectionCount, renderOutput.pages[0]!.nodes.length);
  assert.ok(html.includes("<h1>Hello GNR8</h1>"));
  assert.ok(html.includes('<img src="./assets/logo.svg" alt="Logo">'));
});

test("createStaticHtmlRenderArtifact preserves minimal deterministic source metadata and body attributes", async () => {
  const fixture = readValidationFixtureSpec("real-site-02");
  const importOutput = await importStaticSite({
    rootDir: validationFixtureDirAbs("real-site-02"),
    requestId: "req-static-html-fidelity-real-site-02",
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

  const page = artifact.pages.find((p) => p.sourcePath === fixture.entryHtmlPath);
  assert.ok(page);
  const html = page!.htmlDocument!.html;

  assert.ok(html.includes('<html lang="en"'));
  assert.ok(html.includes("<title>Ridgeline Labs - Migration Fixture Two</title>"));
  assert.ok(html.includes('<meta name="description" content="Second deterministic real-site fixture with mildly messy but phase-1-compatible structure.">'));
  assert.ok(html.includes('<link rel="stylesheet" href="./assets/styles.css">'));
  assert.ok(html.includes("<body data-static-html-page-id="));
});

test("createStaticHtmlRenderArtifact preserves body id/class when available", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-html-body-attrs-"));
  await fs.mkdir(path.join(tmpRoot, "assets"), { recursive: true });
  await fs.writeFile(path.join(tmpRoot, "assets/styles.css"), "body { margin: 0; }\n", "utf-8");
  await fs.writeFile(
    path.join(tmpRoot, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>Body Attr Fixture</title>",
      "  <link rel=\"stylesheet\" href=\"./assets/styles.css\">",
      "</head>",
      "<body id=\"landing\" class=\"page shell\">",
      "  <h1>Hello</h1>",
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-static-html-body-attrs",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });

  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);
  const artifact = createStaticHtmlRenderArtifact(renderOutput);

  const html = artifact.pages[0]!.htmlDocument!.html;
  assert.ok(html.includes('<body id="landing" class="page shell"'));
});

test("createStaticHtmlRenderArtifact preserves only deterministic markup/attribute whitelist", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-html-markup-whitelist-"));
  await fs.mkdir(path.join(tmpRoot, "assets"), { recursive: true });
  await fs.writeFile(path.join(tmpRoot, "assets/styles.css"), "body { margin: 0; }\n", "utf-8");
  await fs.writeFile(
    path.join(tmpRoot, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>Markup Whitelist Fixture</title>",
      "  <link rel=\"stylesheet\" href=\"./assets/styles.css\">",
      "</head>",
      "<body>",
      "  <section class=\"hero\" data-track=\"x\">",
      "    <h2 class=\"title\" id=\"hero-title\" style=\"color:red\" onclick=\"alert(1)\">Hello</h2>",
      "    <p><a href=\"/signup\" class=\"cta\" target=\"_blank\" rel=\"noopener\" data-x=\"1\">Sign up</a></p>",
      "    <img src=\"./assets/logo.svg\" alt=\"Logo\" title=\"Hero Logo\" loading=\"lazy\" onerror=\"bad()\">",
      "    <script src=\"./assets/app.js\"></script>",
      "  </section>",
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-static-html-markup-whitelist",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);
  const artifact = createStaticHtmlRenderArtifact(renderOutput);

  const html = artifact.pages[0]!.htmlDocument!.html;
  assert.ok(html.includes('<h2 class="title" id="hero-title">Hello</h2>'));
  assert.ok(html.includes('<a href="/signup" class="cta" target="_blank" rel="noopener">Sign up</a>'));
  assert.ok(html.includes('<img src="./assets/logo.svg" alt="Logo" title="Hero Logo">'));
  assert.ok(!html.includes("data-track="));
  assert.ok(!html.includes("data-x="));
  assert.ok(!html.includes("style="));
  assert.ok(!html.includes("onclick="));
  assert.ok(!html.includes("onerror="));
  assert.ok(!html.includes("loading=\"lazy\""));
  assert.ok(!html.includes("<script"));
});

test("createStaticHtmlRenderArtifact excludes script/json-ld/analytics text from visible fallback excerpts", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-html-noise-filter-"));
  await fs.mkdir(path.join(tmpRoot, "assets"), { recursive: true });
  await fs.writeFile(path.join(tmpRoot, "assets/styles.css"), "body { margin: 0; }\n", "utf-8");
  await fs.writeFile(
    path.join(tmpRoot, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>Noise Filter Fixture</title>",
      "  <link rel=\"stylesheet\" href=\"./assets/styles.css\">",
      "</head>",
      "<body>",
      "  <div id=\"hero\">",
      "    <script type=\"application/ld+json\">{\"@context\":\"https://schema.org\",\"name\":\"Leak\"}</script>",
      "    <script>window.dataLayer = window.dataLayer || []; gtag('config', 'G-LEAK');</script>",
      "    <noscript>Google Tag Manager (noscript)</noscript>",
      "  </div>",
      "  <div><p>Visible headline</p></div>",
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-static-html-noise-filter",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);
  const artifact = createStaticHtmlRenderArtifact(renderOutput);

  const html = artifact.pages[0]!.htmlDocument!.html;
  assert.ok(!html.includes("schema.org"));
  assert.ok(!html.includes("window.dataLayer"));
  assert.ok(!html.includes("gtag("));
  assert.ok(!html.includes("Google Tag Manager (noscript)"));
  assert.ok(html.includes("Visible headline"));
  const sectionCount = (html.match(/<section /g) ?? []).length;
  assert.equal(sectionCount, 1);
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

test("createStaticHtmlRenderArtifact keeps excerpt fallback when a block has no preservable markup", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-html-fallback-"));
  await fs.mkdir(path.join(tmpRoot, "assets"), { recursive: true });
  await fs.writeFile(path.join(tmpRoot, "assets/styles.css"), "body { margin: 0; }\n", "utf-8");
  await fs.writeFile(
    path.join(tmpRoot, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>Fallback Fixture</title>",
      "  <link rel=\"stylesheet\" href=\"./assets/styles.css\">",
      "</head>",
      "<body>",
      "  <x-unknown-block>Deterministic fallback text</x-unknown-block>",
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-static-html-fallback",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared);
  const renderOutput = createRenderOutput(layout);
  const artifact = createStaticHtmlRenderArtifact(renderOutput);

  const html = artifact.pages[0]!.htmlDocument!.html;
  assert.ok(html.includes("<p>Deterministic fallback text</p>"));
  assert.ok(!html.includes("<x-unknown-block"));
});

test("all current validation fixtures render through static-html path and warning-mode fixture still emits HTML", async () => {
  const fixtureIds = ["real-site-01", "real-site-02", "real-site-03", "friend-site-01"] as const;

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

test("friend-site-01 export preserves minimal source markup for CSS/link/image applicability", async () => {
  const fixture = readValidationFixtureSpec("friend-site-01");
  const importOutput = await importStaticSite({
    rootDir: validationFixtureDirAbs("friend-site-01"),
    requestId: "req-static-html-fixture-friend-site-01-fidelity",
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

  const page = artifact.pages.find((p) => p.sourcePath === fixture.entryHtmlPath);
  assert.ok(page);
  const html = page!.htmlDocument!.html;

  assert.ok(html.includes('<nav class="navbar navbar-light bg-light static-top">'));
  assert.ok(html.includes('<header class="masthead">'));
  assert.ok(html.includes('<h1 class="mb-5">Generate more leads with a professional landing page!</h1>'));
  assert.ok(html.includes('<a class="btn btn-primary" href="#signup">Sign Up</a>'));
  assert.ok(html.includes('<img class="img-fluid rounded-circle mb-3" src="assets/img/testimonials-1.jpg" alt="...">'));
  assert.ok(!html.includes("<script"));
});
