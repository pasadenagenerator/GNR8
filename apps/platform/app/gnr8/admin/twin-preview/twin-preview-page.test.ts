import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./page.tsx", import.meta.url);

test("twin preview page source: file exists", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.length > 0, true);
});

test("twin preview page source: uses twin builder", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("buildWebsiteDigitalTwin"), true);
  assert.equal(source.includes("TWIN_PREVIEW_FIXTURE"), true);
});

test("twin preview page source: uses in-memory store", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("InMemoryTwinStore"), true);
  assert.equal(source.includes("store.saveTwin(twin)"), true);
  assert.equal(source.includes("store.getTwinBySiteVersion"), true);
});

test("twin preview page source: uses overview helper", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("createTwinOverview"), true);
  assert.equal(source.includes("const overview = createTwinOverview"), true);
});

test("twin preview page source: renders runtime preview heading", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Website Digital Twin Runtime Preview"), true);
  assert.equal(source.includes("Read-only validation surface"), true);
});

test("twin preview page source: website os navigation links render", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Website OS Navigation"), true);
  assert.equal(source.includes('href="/gnr8/admin/workspace-overview"'), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview-real"'), true);
  assert.equal(source.includes('href="/gnr8/admin/providers"'), true);
});

test("twin preview page source: contains no action controls", async () => {
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
