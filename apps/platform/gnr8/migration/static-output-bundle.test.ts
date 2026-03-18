import assert from "node:assert/strict";
import crypto from "node:crypto";
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
  const layout = createLayoutPreparationModel(prepared);
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
  assert.deepEqual(copiedAssetOutputPaths, ["assets/assets/app.js", "assets/assets/logo.svg", "assets/assets/styles.css"]);

  for (const pageFile of bundle.pageFiles.filter((p) => p.writeStatus === "written")) {
    const stat = await fs.stat(pageFile.absoluteOutputPath);
    assert.ok(stat.isFile());
  }
  for (const assetFile of bundle.assetFiles.filter((a) => a.writeStatus === "copied" && a.absoluteOutputPath !== null)) {
    const stat = await fs.stat(assetFile.absoluteOutputPath);
    assert.ok(stat.isFile());
  }
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
