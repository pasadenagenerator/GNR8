import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";

import { buildWorkspaceOverviewModel, resolveImportedSnapshot } from "./model";

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const MODEL_FILE = new URL("./model.ts", import.meta.url);

test("workspace overview page source: file exists", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.length > 0, true);
});

test("workspace overview source: uses imported runtime twin chain", async () => {
  const source = await readFile(MODEL_FILE, "utf8");
  assert.equal(source.includes("resolveImportedSnapshot"), true);
  assert.equal(source.includes("imported-url-site-"), true);
  assert.equal(source.includes("buildWebsiteDigitalTwin"), true);
  assert.equal(source.includes("InMemoryTwinStore"), true);
  assert.equal(source.includes("createTwinOverview"), true);
  assert.equal(source.includes("store.getTwinBySiteVersion"), true);
});

test("workspace overview model: twin overview and diagnostics render data from imported runtime evidence", async () => {
  const model = await buildWorkspaceOverviewModel();

  assert.equal(typeof model.sourceId === "string" || model.sourceId === null, true);
  if (model.sourceId === null) {
    assert.equal(model.overview.contentSummary, "No imported site available.");
    return;
  }

  assert.equal(model.sourceId.startsWith("imported-url-site-"), true);
  assert.equal(typeof model.overview.siteVersionId, "string");
  assert.equal(model.overview.siteVersionId.length > 0, true);
  assert.equal(typeof model.overview.contentSummary, "string");
  assert.equal(typeof model.overview.designSummary, "string");
  assert.equal(typeof model.overview.experienceSummary, "string");
  assert.equal(typeof model.overview.governanceSummary, "string");
  assert.equal(typeof model.overview.operationalSummary, "string");
  assert.equal(model.diagnostics.includes("TWIN_OVERVIEW_CREATED"), true);
  assert.equal(model.overview.contentSummary.includes("pages="), true);
  assert.equal(model.overview.contentSummary.includes("deterministic_content_read_model"), false);
  assert.equal(model.overview.designSummary.includes("assets="), true);
  assert.equal(model.overview.experienceSummary.includes("homepageDetected="), true);
  assert.equal(model.overview.governanceSummary.includes("readOnly=true"), true);
  assert.equal(model.overview.operationalSummary.includes("providerState=preview/runtime-only"), true);
});

test("workspace overview model: no scoring recommendation or ai fields added", async () => {
  const model = await buildWorkspaceOverviewModel();
  const flat = JSON.stringify(model);
  assert.equal(flat.includes("scoring"), false);
  assert.equal(flat.includes("recommendations"), false);
  assert.equal(flat.includes("optimization"), false);
  assert.equal(flat.includes("aiOutput"), false);
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

test("workspace overview page source: validation surfaces navigation links render", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Validation Surfaces"), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview"'), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview-real"'), true);
  assert.equal(source.includes('href="/gnr8/admin/providers"'), true);
});

test("workspace overview source resolution: uses stable validation artifact when available", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-stable-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  const stableSnapshotId = "imported-url-site-stable1234567890";
  const latestSnapshotId = "imported-url-site-latest1234567890";
  await mkdir(path.join(snapshotsRoot, stableSnapshotId), { recursive: true });
  await mkdir(path.join(snapshotsRoot, latestSnapshotId), { recursive: true });
  await writeFile(path.join(snapshotsRoot, stableSnapshotId, "index.html"), "<html><title>stable</title></html>", "utf8");
  await writeFile(path.join(snapshotsRoot, latestSnapshotId, "index.html"), "<html><title>latest</title></html>", "utf8");
  await mkdir(path.join(betaRunsRoot, "run-1"), { recursive: true });
  await writeFile(
    path.join(betaRunsRoot, "run-1", "beta-migration-summary.json"),
    JSON.stringify({
      previewStatus: "passed",
      simulationStatus: "executed",
      snapshotKey: stableSnapshotId,
    }),
    "utf8",
  );

  const selected = await resolveImportedSnapshot({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
  });
  assert.notEqual(selected, null);
  assert.equal(selected?.snapshotId, stableSnapshotId);
  assert.equal(selected?.source, "stable_validation_artifact");
});

test("workspace overview model fallback: no imported site available when no snapshots exist", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-empty-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  await mkdir(snapshotsRoot, { recursive: true });
  await mkdir(betaRunsRoot, { recursive: true });

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
  });
  assert.equal(model.sourceId, null);
  assert.equal(model.overview.contentSummary, "No imported site available.");
  assert.equal(model.overview.designSummary, "No imported site available.");
  assert.equal(model.overview.experienceSummary, "No imported site available.");
  assert.equal(model.overview.governanceSummary, "No imported site available.");
  assert.equal(model.overview.operationalSummary, "No imported site available.");
});
