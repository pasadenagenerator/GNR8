import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { createTwinOverview } from "@/gnr8/runtime/twin/twin-viewer";

const FIXED_NOW = "2026-05-30T00:00:00.000Z";

function buildTwin() {
  return buildWebsiteDigitalTwin({
    siteId: "site_123",
    siteVersionId: "sv_456",
    workspaceId: "ws_789",
    environmentScope: "preview",
    sourceImportId: "import_001",
    sourceModels: ["content", "design", "governance"],
    generatedBy: "twin_viewer_test",
    nowIso: FIXED_NOW,
  });
}

test("twin viewer: overview created from twin", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);

  assert.equal(typeof overview, "object");
  assert.equal(overview !== null, true);
});

test("twin viewer: identity fields mapped", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);

  assert.equal(overview.twinId, twin.identity.twinId);
  assert.equal(overview.siteId, twin.identity.siteId);
  assert.equal(overview.siteVersionId, twin.identity.siteVersionId);
  assert.equal(overview.workspaceId, twin.identity.workspaceId);
  assert.equal(overview.environmentScope, twin.identity.environmentScope);
  assert.equal(overview.lastUpdated, twin.identity.updatedAt);
});

test("twin viewer: status mapped", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);

  assert.equal(overview.status, twin.status);
});

test("twin viewer: summaries generated", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);

  assert.equal(overview.contentSummary, twin.snapshot.contentState.summary);
  assert.equal(overview.designSummary, twin.snapshot.designState.summary);
  assert.equal(overview.experienceSummary, twin.snapshot.experienceState.summary);
  assert.equal(overview.governanceSummary, twin.snapshot.governanceState.summary);
  assert.equal(overview.operationalSummary, twin.snapshot.operationalState.summary);
});

test("twin viewer: diagnostics included", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);

  assert.deepEqual(overview.diagnostics, ["TWIN_OVERVIEW_CREATED"]);
});

test("twin viewer: no scoring fields exist", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);
  const view = overview as Record<string, unknown>;

  assert.equal("score" in view, false);
  assert.equal("scores" in view, false);
  assert.equal("scoring" in view, false);
});

test("twin viewer: no recommendation fields exist", () => {
  const twin = buildTwin();
  const overview = createTwinOverview(twin);
  const view = overview as Record<string, unknown>;

  assert.equal("recommendation" in view, false);
  assert.equal("recommendations" in view, false);
});

test("twin viewer: deterministic output", () => {
  const twinA = buildTwin();
  const twinB = buildTwin();

  const overviewA = createTwinOverview(twinA);
  const overviewB = createTwinOverview(twinB);

  assert.deepEqual(overviewA, overviewB);
});
