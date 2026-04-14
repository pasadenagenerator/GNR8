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
  assert.ok(sections.some((s) => s.inferredType === "gallery" || s.mediaDensity >= 0.2));
  assert.ok(sections.some((s) => s.inferredType === "contact" || s.inferredType === "footer"));
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

test("section consolidation reduces fragmented blocks into fewer semantic sections", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-semantic-fragmented-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Fragmented Fixture</title></head>",
    "<body><main>",
    "<div class=\"hero-title\"><h1>Deterministic import</h1></div>",
    "<div class=\"hero-copy\"><p>We preserve structure with deterministic consolidation.</p></div>",
    "<div class=\"hero-cta\"><a href=\"#demo\">Book demo</a></div>",
    "<div class=\"services-heading\"><h2>Services</h2></div>",
    "<div class=\"services-grid\"><article>Fast onboarding</article><article>Reliable rollouts</article><article>Operator controls</article></div>",
    "<div class=\"cta-band\"><p>Need migration help?</p><a href=\"#contact\">Contact us</a></div>",
    "<div class=\"footer-links\"><a href=\"#privacy\">Privacy</a><a href=\"#terms\">Terms</a></div>",
    "<div class=\"footer-legal\"><small>Copyright 2026 Example Co</small></div>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-semantic-consolidation-fragmented",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  const rawBoundaryCount = doc!.domOutline?.bodyChildElements[0]?.childElements.length ?? 0;
  assert.ok(rawBoundaryCount >= 6, `expected fragmented boundary blocks, got ${rawBoundaryCount}`);
  assert.ok(doc!.semantic!.consolidation.outputSectionCount < rawBoundaryCount);
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "SECTION_CONSOLIDATION_APPLIED"));
});

test("section consolidation reconstructs hero from split nodes and prevents footer dominance", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-semantic-hero-recovery-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Hero Recovery Fixture</title></head>",
    "<body><main>",
    "<div><h1>Scale with confidence</h1></div>",
    "<div><p>Run deterministic migrations safely with clear diagnostics.</p></div>",
    "<div><a href=\"#start\">Start now</a></div>",
    "<div><img src=\"/hero.jpg\" alt=\"hero\" /></div>",
    "<section><h2>About</h2><p>We provide migration services.</p></section>",
    "<section><h2>Footer links</h2><p><a href=\"#privacy\">Privacy</a> <a href=\"#terms\">Terms</a></p></section>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-semantic-hero-recovery",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.ok(doc!.semantic!.sections.some((section) => section.inferredType === "hero" && section.consolidatedBlockCount >= 2));
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "HERO_RECONSTRUCTION_APPLIED"));
  const footerSections = doc!.semantic!.sections.filter((section) => section.inferredType === "footer");
  assert.ok(footerSections.length <= 1, "footer should not dominate all sections");
});

test("semantic tuning favors services/features patterns and mitigates nav false positives on mixed sections", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-semantic-services-pattern-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Services Pattern Fixture</title></head>",
    "<body><main>",
    "<header class=\"site-nav\"><h2>Navigation</h2><p>Home About Services Contact</p><p>We build and operate deterministic migration systems with rollout safety and post-launch optimization support.</p></header>",
    "<section class=\"hero\"><h1>Scale safely with deterministic migration</h1><p>Top-level intro copy with clear value proposition.</p><a href=\"#contact\">Book a demo</a><img src=\"/hero.jpg\" alt=\"Hero\" /></section>",
    "<div class=\"services-heading\"><h2>Services</h2></div>",
    "<div class=\"service-card\"><h3>Migration planning</h3><p>Roadmap and sequencing.</p></div>",
    "<div class=\"service-card\"><h3>Implementation</h3><p>Deterministic rollout.</p></div>",
    "<div class=\"service-card\"><h3>Optimization</h3><p>Continuous refinement.</p></div>",
    "<footer><p>Copyright 2026</p><a href=\"#privacy\">Privacy</a><a href=\"#terms\">Terms</a></footer>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-semantic-services-pattern",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.ok(
    doc!.semantic!.sections.some(
      (section) =>
        section.inferredType === "services" ||
        section.inferredType === "features" ||
        section.candidateSignals.servicesCandidate >= 0.4,
    ),
    "services/features candidate should remain strong for repeated card-like blocks",
  );
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "SERVICES_PATTERN_DETECTED"));
});

test("section consolidation remains deterministic across repeated prepared model creation", async () => {
  const rootDir = validationFixtureDir("real-site-03");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "req-semantic-consolidation-deterministic",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html", assetsDirPath: "assets" },
  });
  const manifest = createImportManifest(importOutput);
  const a = createPreparedSiteModel({ importOutput, importManifest: manifest });
  const b = createPreparedSiteModel({ importOutput, importManifest: manifest });

  assert.equal(stableStringify(a as unknown as JsonValue), stableStringify(b as unknown as JsonValue));
});

test("capture-driven lifts reinforce hero and CTA when rendered evidence is strong", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-lift-hero-cta-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Capture Lift Fixture</title></head>",
    "<body><main>",
    "<div class=\"hero-heading\"><h1>Design faster with confidence</h1></div>",
    "<div class=\"hero-copy\"><p>Rendered hierarchy should preserve hero prominence and CTA interpretation.</p></div>",
    "<div class=\"hero-cta\"><a href=\"#start\">Get started</a></div>",
    "<div class=\"hero-media\"><img src=\"/hero.jpg\" alt=\"Hero image\" /></div>",
    "<section><h2>Features</h2><p>Deterministic import quality and preview correctness.</p></section>",
    "<footer><a href=\"#privacy\">Privacy</a><a href=\"#terms\">Terms</a></footer>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-capture-lift-hero-cta",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.ok(doc!.semantic!.sections.some((section) => section.inferredType === "hero"));
  assert.ok(doc!.semantic!.sections.some((section) => section.ctaCandidates.length > 0));
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "CAPTURE_DRIVEN_HERO_LIFT_APPLIED"));
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "CAPTURE_DRIVEN_CTA_LIFT_APPLIED"));
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "CAPTURE_DRIVEN_SECTION_GROUPING_LIFT"));
});

test("capture-driven media prominence lift improves media-forward interpretation", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-lift-media-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Media Forward Fixture</title></head>",
    "<body><main>",
    "<section class=\"hero\"><h1>Portfolio</h1><p>Selected projects.</p><img src=\"/hero.jpg\" alt=\"Hero\" /></section>",
    "<section class=\"gallery-grid\">",
    "<img src=\"/a.jpg\" alt=\"A\" /><img src=\"/b.jpg\" alt=\"B\" /><img src=\"/c.jpg\" alt=\"C\" /><img src=\"/d.jpg\" alt=\"D\" />",
    "</section>",
    "<footer><p>Copyright 2026</p></footer>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-capture-lift-media",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.ok(doc!.semantic!.sections.some((section) => section.inferredType === "gallery" || section.mediaDensity >= 0.45));
  assert.ok(doc!.semantic!.diagnostics.some((d) => d.code === "CAPTURE_DRIVEN_MEDIA_PROMINENCE_USED"));
});

test("weak capture evidence remains conservative and avoids aggressive lifts", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-lift-weak-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Weak Capture Fixture</title></head>",
    "<body><main>",
    "<div><p>Welcome to our site.</p></div>",
    "<div><p>We provide quality service.</p></div>",
    "<div><a href=\"#more\">Learn more</a></div>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-capture-lift-weak",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const doc = prepared.documents.find((d) => d.path === "index.html");
  assert.ok(doc?.semantic);

  assert.equal(doc!.semantic!.diagnostics.some((d) => d.code === "CAPTURE_DRIVEN_HERO_LIFT_APPLIED"), false);
});

test("layout inference detects split and grid patterns deterministically", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-layout-inference-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Layout Inference Fixture</title></head>",
    "<body><main>",
    "<section class=\"hero\"><div><h1>Ship faster</h1><p>Deterministic import with strong hierarchy.</p><a href=\"#demo\">Book demo</a></div><div><img src=\"/hero.jpg\" alt=\"Hero\" /></div></section>",
    "<section class=\"feature-grid\">",
    "<article class=\"card\"><h3>Plan</h3><p>Roadmap.</p></article>",
    "<article class=\"card\"><h3>Build</h3><p>Execution.</p></article>",
    "<article class=\"card\"><h3>Scale</h3><p>Rollout.</p></article>",
    "</section>",
    "<footer><p>Copyright 2026</p></footer>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-layout-inference",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const semantic = prepared.documents.find((d) => d.path === "index.html")?.semantic;
  assert.ok(semantic);

  assert.ok(semantic!.sections.some((section) => section.layoutInference.kind === "split"));
  const gridRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-layout-inference-grid-"));
  const gridHtml = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Grid Layout Fixture</title></head>",
    "<body><main>",
    "<section class=\"pricing-grid\">",
    "<div class=\"card\">Plan A</div>",
    "<div class=\"card\">Plan B</div>",
    "<div class=\"card\">Plan C</div>",
    "</section>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(gridRoot, "index.html"), gridHtml, "utf-8");
  const gridImportOutput = await importStaticSite({
    rootDir: gridRoot,
    requestId: "req-layout-inference-grid",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const gridPrepared = createPreparedSiteModel({ importOutput: gridImportOutput, importManifest: createImportManifest(gridImportOutput) });
  const gridSemantic = gridPrepared.documents.find((d) => d.path === "index.html")?.semantic;
  assert.ok(gridSemantic);
  assert.ok(gridSemantic!.sections.some((section) => section.layoutInference.kind === "grid" || section.layoutInference.kind === "columns"));
});

test("section role classification covers faq/pricing/generic pathways", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-role-classification-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Pricing Role Coverage Fixture</title></head>",
    "<body><main>",
    "<section><h2>Pricing</h2><p>Starter $29 /mo</p><p>Pro $79 /mo</p></section>",
    "<section><h2>FAQ</h2><h3>What is included?</h3><p>Everything required for launch.</p><h3>How long does setup take?</h3><p>Usually 48 hours.</p></section>",
    "<section><p>Plain narrative block without strong section clues.</p></section>",
    "<footer><p>Copyright 2026</p></footer>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-role-classification",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const semantic = prepared.documents.find((d) => d.path === "index.html")?.semantic;
  assert.ok(semantic);

  assert.ok(semantic!.sections.some((section) => section.sectionRole === "pricing") || semantic!.page.pageType === "product_landing");
  assert.ok(
    semantic!.sections.every((section) =>
      ["hero", "feature", "cta", "gallery", "faq", "pricing", "footer", "generic"].includes(section.sectionRole),
    ),
  );
});

test("fidelity score is computed with deterministic diagnostics for degraded structures", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-fidelity-score-"));
  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>Fidelity Score Fixture</title></head>",
    "<body><main>",
    "<div><p>Minimal content only.</p></div>",
    "<div><p>No clear hierarchy.</p></div>",
    "</main></body></html>",
  ].join("");
  await fs.writeFile(path.join(tmpRoot, "index.html"), html, "utf-8");

  const importOutput = await importStaticSite({
    rootDir: tmpRoot,
    requestId: "req-fidelity-score",
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
  const prepared = createPreparedSiteModel({ importOutput, importManifest: createImportManifest(importOutput) });
  const semantic = prepared.documents.find((d) => d.path === "index.html")?.semantic;
  assert.ok(semantic);

  assert.equal(typeof semantic!.fidelityScore.overallScore, "number");
  assert.ok(semantic!.fidelityScore.overallScore >= 0 && semantic!.fidelityScore.overallScore <= 1);
  assert.ok(semantic!.diagnostics.some((d) => d.code === "IMPORT_STRUCTURE_CONFIDENCE_LOW"));
  assert.ok(semantic!.diagnostics.some((d) => d.code === "CTA_NOT_DETECTED"));
});
