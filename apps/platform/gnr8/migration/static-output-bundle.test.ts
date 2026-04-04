import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { createDesignModel } from "../design-intelligence/design-intelligence-service";
import { createImportManifest } from "../import/import-manifest";
import { importStaticSite } from "../import/runtime/import-static-site";
import { readValidationFixtureSpec, validationFixtureDirAbs } from "../validation/runtime/fixture-spec";
import { createLayoutPreparationModel } from "./layout-preparation-model";
import { createPreparedSiteModel } from "./prepared-site-model";
import { createRenderOutput } from "./render-output-model";
import { createStaticHtmlRenderArtifact } from "./static-html-render-artifact";
import { materializeStaticOutputBundle } from "./static-output-bundle";
import { stableStringify } from "./runtime/diagnostics";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../import/__fixtures__/${name}`);
}

async function buildStaticHtmlForSite(input: {
  rootDir: string;
  requestId: string;
  entryHtmlPath: string;
  assetsDirPath?: string;
}) {
  const importOutput = await importStaticSite({
    rootDir: input.rootDir,
    requestId: input.requestId,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: input.entryHtmlPath,
      ...(input.assetsDirPath ? { assetsDirPath: input.assetsDirPath } : {}),
    },
  });

  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const layout = createLayoutPreparationModel(prepared, createDesignModel(prepared));
  const renderOutput = createRenderOutput(layout);
  const artifact = createStaticHtmlRenderArtifact(renderOutput);

  return { importOutput, artifact };
}

async function snapshotDir(rootAbs: string): Promise<Array<{ path: string; sha256: string; size: number }>> {
  const out: Array<{ path: string; sha256: string; size: number }> = [];

  async function walk(currentAbs: string): Promise<void> {
    const entries = (await fs.readdir(currentAbs, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const entry of entries) {
      const abs = path.join(currentAbs, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;

      const rel = path.relative(rootAbs, abs).replaceAll(path.sep, "/");
      const bytes = await fs.readFile(abs);
      out.push({
        path: rel,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        size: bytes.byteLength,
      });
    }
  }

  await walk(rootAbs);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeBundleForDeterministicCompare(bundle: Awaited<ReturnType<typeof materializeStaticOutputBundle>>): string {
  const normalized = {
    ...bundle,
    outputRootPath: "<output-root>",
    pageFiles: bundle.pageFiles.map((p) => ({ ...p, absoluteOutputPath: `<output-root>/${p.outputPath}` })),
    assetFiles: bundle.assetFiles.map((a) => ({
      ...a,
      absoluteOutputPath: a.outputPath ? `<output-root>/${a.outputPath}` : null,
    })),
  };

  return stableStringify(normalized as unknown as JsonValue);
}

test("materializeStaticOutputBundle is deterministic across repeated runs", async () => {
  const rootDir = fixtureDir("simple-site");
  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-1",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-"));
  const out1 = path.join(tmpBase, "run-a");
  const out2 = path.join(tmpBase, "run-b");

  const b1 = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir: out1,
  });
  const b2 = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir: out2,
  });

  assert.equal(normalizeBundleForDeterministicCompare(b1), normalizeBundleForDeterministicCompare(b2));

  const s1 = await snapshotDir(out1);
  const s2 = await snapshotDir(out2);
  assert.deepEqual(s1, s2);
});

test("materializeStaticOutputBundle preserves canonical page and asset paths", async () => {
  const rootDir = fixtureDir("simple-site");
  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-paths",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-paths-"));
  const outputRootDir = path.join(tmpBase, "bundle");

  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir,
  });

  assert.deepEqual(
    bundle.pageFiles.map((p) => p.outputPath),
    built.artifact.pages.map((p) => p.outputPath),
  );

  const copiedAssetOutputPaths = bundle.assetFiles
    .filter((a) => a.writeStatus === "copied")
    .map((a) => a.outputPath)
    .sort();
  assert.deepEqual(copiedAssetOutputPaths, ["assets/app.js", "assets/logo.svg", "assets/styles.css"]);

  const pageRecord = bundle.pageFiles.find((p) => p.writeStatus === "written");
  assert.ok(pageRecord);
  const html = await fs.readFile(pageRecord!.absoluteOutputPath, "utf-8");
  assert.ok(html.includes('<link rel="stylesheet" href="./assets/styles.css">'));

  for (const pageFile of bundle.pageFiles.filter((p) => p.writeStatus === "written")) {
    const stat = await fs.stat(pageFile.absoluteOutputPath);
    assert.ok(stat.isFile());
  }
  for (const assetFile of bundle.assetFiles.filter((a) => a.writeStatus === "copied" && a.absoluteOutputPath !== null)) {
    if (assetFile.absoluteOutputPath === null) continue;
    const stat = await fs.stat(assetFile.absoluteOutputPath);
    assert.ok(stat.isFile());
  }
});

test("materializeStaticOutputBundle rewrites root-relative stylesheet links to exported asset paths", async () => {
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-root-relative-"));
  const rootDir = path.join(tmpBase, "site");
  await fs.mkdir(path.join(rootDir, "assets"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "assets/styles.css"), "body { background: #fff; }\n", "utf-8");
  await fs.writeFile(
    path.join(rootDir, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>Root Relative Stylesheet Fixture</title>",
      "  <link rel=\"stylesheet\" href=\"/assets/styles.css\">",
      "</head>",
      "<body><h1>Fixture</h1></body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-root-relative-stylesheet",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const outputRootDir = path.join(tmpBase, "bundle");
  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir,
  });

  const pageRecord = bundle.pageFiles.find((p) => p.outputPath === "index.html" && p.writeStatus === "written");
  assert.ok(pageRecord);
  const html = await fs.readFile(pageRecord!.absoluteOutputPath, "utf-8");
  assert.ok(html.includes('<link rel="stylesheet" href="./assets/styles.css">'));
});

test("materializeStaticOutputBundle rewrites image-gallery anchor hrefs to exported copied assets", async () => {
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-gallery-anchor-"));
  const rootDir = path.join(tmpBase, "site");
  await fs.mkdir(path.join(rootDir, "assets/gallery"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "assets/gallery/full.webp"), "RIFF", "utf-8");
  await fs.writeFile(
    path.join(rootDir, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head><meta charset=\"utf-8\"><title>Gallery Anchor Fixture</title></head>",
      "<body>",
      "  <div>",
      "    <a href=\"/assets/gallery/full.webp\"><img src=\"/assets/gallery/full.webp\" alt=\"Gallery\"></a>",
      "    <p>Gallery section</p>",
      "  </div>",
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-gallery-anchor",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const outputRootDir = path.join(tmpBase, "bundle");
  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir,
  });

  const pageRecord = bundle.pageFiles.find((p) => p.outputPath === "index.html" && p.writeStatus === "written");
  assert.ok(pageRecord);
  const html = await fs.readFile(pageRecord!.absoluteOutputPath, "utf-8");
  assert.ok(html.includes('<a href="assets/gallery/full.webp">'));
  assert.ok(html.includes('<img src="assets/gallery/full.webp" alt="Gallery">'));
  assert.ok(bundle.assetFiles.some((a) => a.writeStatus === "copied" && a.outputPath === "assets/gallery/full.webp"));
});

test("materializeStaticOutputBundle only rewrites safe image/gallery anchors and preserves non-image href classes", async () => {
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-safe-anchor-rewrite-"));
  const rootDir = path.join(tmpBase, "site");
  await fs.mkdir(path.join(rootDir, "assets/gallery"), { recursive: true });
  await fs.mkdir(path.join(rootDir, "assets/files"), { recursive: true });
  await fs.mkdir(path.join(rootDir, "assets/brand"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "assets/gallery/full.webp"), "RIFF", "utf-8");
  await fs.writeFile(path.join(rootDir, "assets/files/brochure.jpg"), "JPG", "utf-8");
  await fs.writeFile(path.join(rootDir, "assets/brand/logo.svg"), "<svg></svg>", "utf-8");
  await fs.writeFile(path.join(rootDir, "assets/brand/hero.jpg"), "JPG", "utf-8");
  await fs.writeFile(
    path.join(rootDir, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head><meta charset=\"utf-8\"><title>Safe Anchor Rewrite Fixture</title></head>",
      "<body>",
      "  <a href=\"tel:+38640111222\">Call us</a>",
      "  <a href=\"mailto:hello@example.com\">Email us</a>",
      "  <a href=\"#pricing\">Pricing</a>",
      "  <a href=\"/about\">About</a>",
      "  <a href=\"https://example.com/blog\">Blog</a>",
      "  <header class=\"site-header\"><a class=\"logo-link\" href=\"/assets/brand/logo.svg\"><img src=\"/assets/brand/logo.svg\" alt=\"Brand\"></a></header>",
      "  <div class=\"content-card\"><a href=\"/assets/brand/hero.jpg\"><img src=\"/assets/brand/hero.jpg\" alt=\"Hero\"></a></div>",
      "  <a href=\"/assets/files/brochure.jpg\">Brochure download</a>",
      "  <a class=\"gallery-item\" href=\"/assets/gallery/full.webp\"><img src=\"/assets/gallery/full.webp\" alt=\"Gallery\"></a>",
      "</body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );

  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-safe-anchor-rewrite",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const outputRootDir = path.join(tmpBase, "bundle");
  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir,
  });

  const pageRecord = bundle.pageFiles.find((p) => p.outputPath === "index.html" && p.writeStatus === "written");
  assert.ok(pageRecord);
  const html = await fs.readFile(pageRecord!.absoluteOutputPath, "utf-8");

  assert.ok(html.includes('<a href="tel:+38640111222">Call us</a>'));
  assert.ok(html.includes('<a href="mailto:hello@example.com">Email us</a>'));
  assert.ok(html.includes('<a href="#pricing">Pricing</a>'));
  assert.ok(html.includes('<a href="/about">About</a>'));
  assert.ok(html.includes('<a href="https://example.com/blog">Blog</a>'));
  assert.ok(
    html.includes(
      '<header class="site-header"><a class="logo-link" href="/assets/brand/logo.svg"><img src="assets/brand/logo.svg" alt="Brand"></a></header>',
    ),
  );
  assert.ok(
    html.includes('<div class="content-card"><a href="/assets/brand/hero.jpg"><img src="assets/brand/hero.jpg" alt="Hero"></a></div>'),
  );
  assert.ok(html.includes('<a href="/assets/files/brochure.jpg">Brochure download</a>'));
  assert.ok(
    html.includes('<a class="gallery-item" href="assets/gallery/full.webp"><img src="assets/gallery/full.webp" alt="Gallery"></a>'),
  );

  assert.ok(bundle.rewrites.some((r) => r.fromRawRef === "/assets/gallery/full.webp" && r.toOutputRef === "assets/gallery/full.webp"));
  assert.ok(bundle.diagnostics.warnings.codes.includes("ASSET_REFERENCE_REWRITE_SKIPPED_UNSAFE_ANCHOR"));
});

test("all current validation fixtures materialize through static bundle path", async () => {
  const fixtureIds = ["real-site-01", "real-site-02", "real-site-03"] as const;
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-fixtures-"));

  for (const fixtureId of fixtureIds) {
    const fixture = readValidationFixtureSpec(fixtureId);
    const rootDir = validationFixtureDirAbs(fixtureId);
    const built = await buildStaticHtmlForSite({
      rootDir,
      requestId: `req-static-bundle-fixture-${fixtureId}`,
      entryHtmlPath: fixture.entryHtmlPath,
      ...(fixture.assetsDirPath ? { assetsDirPath: fixture.assetsDirPath } : {}),
    });

    const bundle = await materializeStaticOutputBundle({
      staticHtmlArtifact: built.artifact,
      importOutput: built.importOutput,
      importRootDir: rootDir,
      outputRootDir: path.join(tmpBase, fixtureId),
    });

    assert.equal(bundle.pageFiles.length, built.artifact.pages.length);
    assert.ok(bundle.pageFiles.some((p) => p.writeStatus === "written"));
    assert.ok(bundle.summary.pageFileCount >= 1);
  }
});

test("warning-mode fixture still materializes and reports missing/unsupported assets", async () => {
  const fixture = readValidationFixtureSpec("real-site-03");
  const rootDir = validationFixtureDirAbs("real-site-03");
  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-warning-fixture",
    entryHtmlPath: fixture.entryHtmlPath,
    ...(fixture.assetsDirPath ? { assetsDirPath: fixture.assetsDirPath } : {}),
  });

  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-warning-"));
  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir: path.join(tmpBase, "bundle"),
  });

  assert.equal(bundle.status, "ready_with_warnings");
  assert.ok(bundle.summary.writtenPageCount >= 1);
  assert.ok(bundle.summary.missingAssetCount >= 1);
  assert.ok(bundle.summary.skippedAssetCount >= 1);
  assert.ok(bundle.diagnostics.warnings.codes.includes("UNSUPPORTED_REMOTE_ASSET"));
  assert.ok(bundle.diagnostics.warnings.codes.includes("UNSUPPORTED_DATA_URL_ASSET"));
  assert.ok(bundle.diagnostics.warnings.codes.includes("MISSING_LOCAL_ASSET"));
});

test("warning-mode real-site-02 and real-site-03 remain exportable with visible fidelity warnings", async () => {
  const fixtureIds = ["real-site-02", "real-site-03"] as const;
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-warning-fixtures-"));

  for (const fixtureId of fixtureIds) {
    const fixture = readValidationFixtureSpec(fixtureId);
    const rootDir = validationFixtureDirAbs(fixtureId);
    const built = await buildStaticHtmlForSite({
      rootDir,
      requestId: `req-static-bundle-warning-${fixtureId}`,
      entryHtmlPath: fixture.entryHtmlPath,
      ...(fixture.assetsDirPath ? { assetsDirPath: fixture.assetsDirPath } : {}),
    });

    const bundle = await materializeStaticOutputBundle({
      staticHtmlArtifact: built.artifact,
      importOutput: built.importOutput,
      importRootDir: rootDir,
      outputRootDir: path.join(tmpBase, fixtureId),
    });

    assert.equal(bundle.status, "ready_with_warnings");
    assert.ok(bundle.summary.writtenPageCount >= 1);
    assert.ok(bundle.diagnostics.warnings.codes.includes("UNSUPPORTED_REMOTE_ASSET"));
  }
});

test("unsupported remote/data stylesheet references remain in exported HTML and diagnostics", async () => {
  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-remote-data-css-"));
  const rootDir = path.join(tmpBase, "site");
  await fs.mkdir(path.join(rootDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "index.html"),
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head>",
      "  <meta charset=\"utf-8\">",
      "  <title>Remote Data Stylesheet Fixture</title>",
      "  <link rel=\"stylesheet\" href=\"./assets/styles.css\">",
      "  <link rel=\"stylesheet\" href=\"https://cdn.example.invalid/site.css\">",
      "  <link rel=\"stylesheet\" href=\"data:text/css,body{color:red}\">",
      "</head>",
      "<body><h1>Fixture</h1></body>",
      "</html>",
      "",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(path.join(rootDir, "assets/styles.css"), "body { color: black; }\n", "utf-8");

  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-remote-data-css",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const outputRootDir = path.join(tmpBase, "bundle");
  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: built.artifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir,
  });

  assert.equal(bundle.status, "ready_with_warnings");
  assert.ok(bundle.diagnostics.warnings.codes.includes("UNSUPPORTED_REMOTE_ASSET"));
  assert.ok(bundle.diagnostics.warnings.codes.includes("UNSUPPORTED_DATA_URL_ASSET"));

  const pageRecord = bundle.pageFiles.find((p) => p.outputPath === "index.html" && p.writeStatus === "written");
  assert.ok(pageRecord);
  const html = await fs.readFile(pageRecord!.absoluteOutputPath, "utf-8");
  assert.ok(html.includes('<link rel="stylesheet" href="./assets/styles.css">'));
  assert.ok(html.includes('<link rel="stylesheet" href="https://cdn.example.invalid/site.css">'));
  assert.ok(html.includes('<link rel="stylesheet" href="data:text/css,body{color:red}">'));
});

test("non-renderable pages remain explicit in materialized bundle result", async () => {
  const rootDir = fixtureDir("simple-site");
  const built = await buildStaticHtmlForSite({
    rootDir,
    requestId: "req-static-bundle-non-renderable",
    entryHtmlPath: "index.html",
    assetsDirPath: "assets",
  });

  const degradedArtifact = {
    ...built.artifact,
    status: "blocked" as const,
    pages: built.artifact.pages.map((page) => ({
      ...page,
      renderability: {
        status: "not_renderable" as const,
        sourceEligibility: page.renderability.sourceEligibility,
        reasonCode: "INELIGIBLE_PAGE" as const,
      },
      htmlDocument: null,
    })),
  };

  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-static-bundle-non-renderable-"));
  const bundle = await materializeStaticOutputBundle({
    staticHtmlArtifact: degradedArtifact,
    importOutput: built.importOutput,
    importRootDir: rootDir,
    outputRootDir: path.join(tmpBase, "bundle"),
  });

  assert.equal(bundle.pageFiles.length, degradedArtifact.pages.length);
  assert.ok(bundle.pageFiles.every((p) => p.writeStatus === "skipped_not_renderable"));
  assert.equal(bundle.summary.writtenPageCount, 0);
  assert.equal(bundle.status, "ready_with_warnings");
});
