import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { buildRealSiteTwinPreviewModel } from "./model";

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const MODEL_FILE = new URL("./model.ts", import.meta.url);

test("twin preview real page source: file exists", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.length > 0, true);
});

test("twin preview real page source: uses real imported fixture", async () => {
  const source = await readFile(MODEL_FILE, "utf8");
  assert.equal(source.includes("REAL_TWIN_PREVIEW_FIXTURE_ID"), true);
  assert.equal(source.includes("real-site-01"), true);
  assert.equal(source.includes("readValidationFixtureSpec"), true);
  assert.equal(source.includes("validationFixtureDirAbs"), true);
  assert.equal(source.includes("importStaticSite"), true);
});

test("twin preview real page source: builder and overview flow present", async () => {
  const source = await readFile(MODEL_FILE, "utf8");
  assert.equal(source.includes("buildWebsiteDigitalTwin"), true);
  assert.equal(source.includes("InMemoryTwinStore"), true);
  assert.equal(source.includes("store.saveTwin(twin)"), true);
  assert.equal(source.includes("store.getTwinBySiteVersion"), true);
  assert.equal(source.includes("createTwinOverview"), true);
});

test("twin preview real model: provenance and overview are generated", async () => {
  const model = await buildRealSiteTwinPreviewModel();

  assert.equal(model.fixtureId, "real-site-01");
  assert.equal(typeof model.sourceSiteVersionId, "string");
  assert.equal(model.sourceSiteVersionId.length > 0, true);
  assert.equal(typeof model.sourceImportId, "string");
  assert.equal(model.sourceImportId.length > 0, true);
  assert.equal(typeof model.generatedAt, "string");
  assert.equal(model.generatedAt.length > 0, true);
  assert.equal(model.overview.siteVersionId, model.sourceSiteVersionId);
  assert.equal(model.diagnostics.includes("TWIN_OVERVIEW_CREATED"), true);
});

test("twin preview real page renders explicit real-site banner and fields", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("<main"), true);
  assert.equal(source.includes("Website Digital Twin Runtime Preview (Real Site)"), true);
  assert.equal(source.includes("sourceSiteVersionId"), true);
  assert.equal(source.includes("sourceImportId"), true);
  assert.equal(source.includes("generatedAt"), true);
  assert.equal(source.includes("model.fixtureId"), true);
});

test("twin preview real page source: website os navigation links render", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Website OS Navigation"), true);
  assert.equal(source.includes('href="/gnr8/admin/workspace-overview"'), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview"'), true);
  assert.equal(source.includes('href="/gnr8/admin/providers"'), true);
});

test("twin preview real page source: contains no action controls and no AI/scoring/recommendations", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("<input"), false);
  assert.equal(source.includes("<textarea"), false);
  assert.equal(source.includes("<select"), false);
  assert.equal(source.includes("publish"), false);
  assert.equal(source.includes("recommend"), false);
  assert.equal(source.includes("score"), false);
});
