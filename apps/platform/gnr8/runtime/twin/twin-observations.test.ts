import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";

function buildTwin(input?: { pageCount?: number; assetCount?: number; homepagePath?: string }) {
  return buildWebsiteDigitalTwin({
    siteId: "site_obs",
    siteVersionId: "sv_obs",
    workspaceId: "ws_obs",
    environmentScope: "preview",
    sourceImportId: "import_obs",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: input?.pageCount ?? 2,
      sectionCount: 5,
      assetCount: input?.assetCount ?? 0,
      detectedTitle: "Observation Site",
      detectedHomepagePath: input?.homepagePath ?? "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });
}

test("twin observations: generates deterministic observations from twin evidence", () => {
  const twin = buildTwin();
  const first = generateTwinObservations(twin);
  const second = generateTwinObservations(twin);

  assert.deepEqual(first, second);
});

test("twin observations: applies all four initial rules", () => {
  const observations = generateTwinObservations(buildTwin());
  const titles = observations.map((entry) => entry.title);

  assert.equal(titles.includes("Small Site Footprint"), true);
  assert.equal(titles.includes("No Asset Evidence Detected"), true);
  assert.equal(titles.includes("Homepage Successfully Identified"), true);
  assert.equal(titles.includes("Read-Only Runtime Validation"), true);
});

test("twin observations: empty observations are not returned", () => {
  const observations = generateTwinObservations(buildTwin({ pageCount: 5, assetCount: 3, homepagePath: "unknown" }));
  assert.equal(observations.length > 0, true);
  assert.equal(observations.every((entry) => entry.summary.trim().length > 0), true);
});

test("twin observations: always includes governance read-only rule", () => {
  const observations = generateTwinObservations(buildTwin({ pageCount: 9, assetCount: 12, homepagePath: "unknown" }));
  assert.equal(observations.some((entry) => entry.title === "Read-Only Runtime Validation"), true);
});
