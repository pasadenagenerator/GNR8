import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { JsonValue } from "../import/import-contract";
import { createImportManifest } from "../import/import-manifest";
import { importStaticSite } from "../import/runtime/import-static-site";
import { stableStringify } from "./runtime/diagnostics";
import { createPreparedSiteModel } from "./prepared-site-model";
import { runLinearMigrationPipeline } from "./runtime/run-linear-migration-pipeline";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../import/__fixtures__/${name}`);
}

test("createPreparedSiteModel is deterministic across repeated runs", async () => {
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

  assert.equal(stableStringify(p1 as unknown as JsonValue), stableStringify(p2 as unknown as JsonValue));
});

test("createPreparedSiteModel emits structured output for degraded imports", async () => {
  const rootDir = fixtureDir("asset-validation-site");

  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const prepared = createPreparedSiteModel({ importOutput, importManifest });

  assert.equal(prepared.kind, "prepared_site_model_v1");
  assert.ok(prepared.documents.length >= 1);
  assert.ok(prepared.status === "blocked" || prepared.status === "ready_with_warnings" || prepared.status === "ready");
  assert.equal(typeof prepared.diagnostics.import.totalCount, "number");
});

test("createPreparedSiteModel canonicalizes ordering independent of import collection order", async () => {
  const rootDir = fixtureDir("simple-site");

  const originalOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });

  const shuffledOutput = {
    ...originalOutput,
    rawDomSnapshot: {
      ...originalOutput.rawDomSnapshot,
      documents: [...originalOutput.rawDomSnapshot.documents].slice().reverse(),
    },
    assetRegistry: {
      ...originalOutput.assetRegistry,
      files: [...originalOutput.assetRegistry.files].slice().reverse(),
      references: [...originalOutput.assetRegistry.references].slice().reverse(),
    },
  };

  const p1 = createPreparedSiteModel({
    importOutput: originalOutput,
    importManifest: createImportManifest(originalOutput),
  });

  const p2 = createPreparedSiteModel({
    importOutput: shuffledOutput,
    importManifest: createImportManifest(shuffledOutput),
  });

  assert.equal(stableStringify(p1 as unknown as JsonValue), stableStringify(p2 as unknown as JsonValue));
});

test("structure_preparation stage output contains PreparedSiteModel", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-1",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const importManifest = createImportManifest(importOutput);

  const result = runLinearMigrationPipeline({ importOutput, importManifest });
  const s2 = result.stages.find((s) => s.stageId === "structure_preparation");
  assert.ok(s2);
  assert.equal(s2.output.preparedSite.kind, "prepared_site_model_v1");
  assert.ok(s2.output.preparedSite.documents.length >= 1);
});

