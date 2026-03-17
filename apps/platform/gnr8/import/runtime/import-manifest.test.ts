import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import-contract";
import { createImportManifest } from "../import-manifest";
import { stableStringify } from "./diagnostics";
import { importStaticSite } from "./import-static-site";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../__fixtures__/${name}`);
}

test("createImportManifest is stable across repeated runs of the same input", async () => {
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

  assert.equal(stableStringify(m1 as unknown as JsonValue), stableStringify(m2 as unknown as JsonValue));
  assert.equal(m1.status, "success");
  assert.equal(m2.status, "success");
});

test("createImportManifest differences reflect real importer differences", async () => {
  const rootDir = fixtureDir("asset-validation-site");

  const out = await importStaticSite({
    rootDir,
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const m = createImportManifest(out);

  assert.equal(m.outputStatus, "ok"); // ImportOutput only fails on fatal
  assert.equal(m.status, "failed"); // manifest fails on error/fatal

  assert.ok(m.diagnostics.codes.includes("missing_local_asset"));
  assert.ok(m.assets.missingLocalCount > 0);
  assert.ok(m.assets.referencesByValidationStatus.missing_local_asset > 0);
  assert.ok(m.assets.totalAssets > 0);
});

test("equivalent normalized inputs produce equivalent manifest summaries", async () => {
  const rootDir = fixtureDir("simple-site");
  const entryAbs = path.resolve(rootDir, "index.html");
  const assetsAbs = path.resolve(rootDir, "assets");

  const outRel = await importStaticSite({
    rootDir,
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const outAbs = await importStaticSite({
    rootDir,
    source: { kind: "single-entry-html", entryHtmlPath: entryAbs, assetsDirPath: assetsAbs },
  });

  const mRel = createImportManifest(outRel);
  const mAbs = createImportManifest(outAbs);

  assert.equal(stableStringify(mRel as unknown as JsonValue), stableStringify(mAbs as unknown as JsonValue));
  assert.equal(mAbs.entryHtmlPath, "index.html");
  assert.equal(mAbs.assetsDirPath, "assets");
});
