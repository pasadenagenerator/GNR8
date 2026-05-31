import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { buildWorkspaceOverviewModel } from "./model";

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const MODEL_FILE = new URL("./model.ts", import.meta.url);

test("workspace overview page source: file exists", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.length > 0, true);
});

test("workspace overview source: uses real-site-01 twin chain", async () => {
  const source = await readFile(MODEL_FILE, "utf8");
  assert.equal(source.includes("WORKSPACE_OVERVIEW_FIXTURE_ID"), true);
  assert.equal(source.includes("real-site-01"), true);
  assert.equal(source.includes("buildWebsiteDigitalTwin"), true);
  assert.equal(source.includes("InMemoryTwinStore"), true);
  assert.equal(source.includes("createTwinOverview"), true);
  assert.equal(source.includes("store.getTwinBySiteVersion"), true);
});

test("workspace overview model: twin overview and diagnostics render data", async () => {
  const model = await buildWorkspaceOverviewModel();

  assert.equal(model.fixtureId, "real-site-01");
  assert.equal(typeof model.overview.siteVersionId, "string");
  assert.equal(model.overview.siteVersionId.length > 0, true);
  assert.equal(typeof model.overview.contentSummary, "string");
  assert.equal(typeof model.overview.designSummary, "string");
  assert.equal(typeof model.overview.experienceSummary, "string");
  assert.equal(typeof model.overview.governanceSummary, "string");
  assert.equal(typeof model.overview.operationalSummary, "string");
  assert.equal(model.diagnostics.includes("TWIN_OVERVIEW_CREATED"), true);
});

test("workspace overview page source: renders required sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("Website Workspace Overview"), true);
  assert.equal(source.includes("Website Operating System Runtime v0"), true);

  assert.equal(source.includes("Twin Status"), true);
  assert.equal(source.includes("Environment Scope"), true);
  assert.equal(source.includes("Site Version"), true);
  assert.equal(source.includes("Last Updated"), true);

  assert.equal(source.includes("Content"), true);
  assert.equal(source.includes("Design"), true);
  assert.equal(source.includes("Experience"), true);
  assert.equal(source.includes("Governance"), true);
  assert.equal(source.includes("Operations"), true);

  assert.equal(source.includes("Diagnostics"), true);

  assert.equal(source.includes("Provider Governance Status"), true);
  assert.equal(source.includes("Execution Layer:"), true);
  assert.equal(source.includes("Blocked"), true);
  assert.equal(source.includes("Governance State:"), true);
  assert.equal(source.includes("Preview / non-executable"), true);

  assert.equal(source.includes("Read-only Workspace Runtime Preview"), true);
  assert.equal(source.includes("No editing available."), true);
  assert.equal(source.includes("No AI actions available."), true);
  assert.equal(source.includes("No publishing available."), true);
});

test("workspace overview page source: contains no action controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("<input"), false);
  assert.equal(source.includes("<textarea"), false);
  assert.equal(source.includes("<select"), false);
});
