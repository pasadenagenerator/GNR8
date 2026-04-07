import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
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

function validationFixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../validation/fixtures/${name}`);
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

test("createPreparedSiteModel captures deterministic fidelity projection fields", async () => {
  const rootDir = fixtureDir("simple-site");

  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-fidelity-projection",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc);

  assert.equal(doc!.fidelity.kind, "prepared_document_fidelity_projection_v1");
  assert.equal(doc!.fidelity.htmlLang, "en");
  assert.equal(doc!.fidelity.title, "Simple Site");
  assert.equal(doc!.fidelity.metaCharset, "utf-8");
  assert.equal(doc!.fidelity.metaViewport, "width=device-width, initial-scale=1");
  assert.equal(doc!.fidelity.bodyClass, null);
  assert.equal(doc!.fidelity.bodyId, null);
  assert.deepEqual(doc!.fidelity.stylesheetLinks.map((l) => l.href), ["./assets/styles.css"]);
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

test("prepared-site semantic model classifies header/navigation/footer/hero on real-site-03", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-semantic-classification-real-site-03",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  const sectionTypes = new Set(doc!.semantic!.sections.map((s) => s.inferredType));
  assert.ok(sectionTypes.has("footer"));
  assert.ok(
    sectionTypes.has("navigation") || sectionTypes.has("header") || doc!.semantic!.diagnostics.some((d) => d.code === "NAVIGATION_SECTION_UNCLEAR"),
    "navigation/header should be detected or explicitly diagnosed as unclear",
  );
  assert.ok(
    sectionTypes.has("hero") || doc!.semantic!.diagnostics.some((d) => d.code === "HERO_SECTION_UNCLEAR"),
    "hero should be detected or explicitly diagnosed as unclear",
  );
});

test("prepared-site semantic model classifies hero section on deterministic synthetic fixture", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-semantic-hero-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Hero Fixture</title></head>",
    "<body>",
    "<header><nav><a href=\"#\">Home</a><a href=\"#\">Services</a></nav></header>",
    "<section class=\"hero\"><h1>Build faster with deterministic migration</h1><p>Short supporting copy.</p><a href=\"#contact\">Book demo</a><img src=\"/hero.jpg\" alt=\"hero\" /></section>",
    "<footer><p>Copyright 2026</p></footer>",
    "</body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-semantic-hero-synthetic",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);
  assert.ok(doc!.semantic!.sections.some((s) => s.inferredType === "hero"), "expected explicit hero classification");
});

test("prepared-site semantic model detects CTA, gallery/media, and contact sections", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-semantic-cta-gallery-contact-real-site-03",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  const sections = doc!.semantic!.sections;
  assert.ok(sections.some((s) => s.inferredType === "cta" || s.ctaCandidates.length > 0));
  assert.ok(sections.some((s) => s.inferredType === "gallery" || s.mediaDensity >= 0.3));
  assert.ok(sections.some((s) => s.inferredType === "contact"));
});

test("prepared-site semantic model infers page type and brand signals deterministically", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-semantic-page-type-brand-real-site-03",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.notEqual(doc!.semantic!.page.pageType, "unknown");
  assert.equal(typeof doc!.semantic!.brandSignals.visualTone, "string");
  assert.ok(Array.isArray(doc!.semantic!.brandSignals.rationale));
});

test("prepared-site semantic model emits uncertainty diagnostics for weak pages", async () => {
  const rootDir = fixtureDir("simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-semantic-weak-page-simple-site",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "BRAND_SIGNAL_WEAK"));
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "CTA_PRIMARY_UNCLEAR"));
});
