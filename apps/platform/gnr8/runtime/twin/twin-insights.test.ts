import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";

function buildTwin(input?: { pageCount?: number; assetCount?: number; homepagePath?: string }) {
  return buildWebsiteDigitalTwin({
    siteId: "site_insights",
    siteVersionId: "sv_insights",
    workspaceId: "ws_insights",
    environmentScope: "preview",
    sourceImportId: "import_insights",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: input?.pageCount ?? 2,
      sectionCount: 5,
      assetCount: input?.assetCount ?? 0,
      detectedTitle: "Insight Site",
      detectedHomepagePath: input?.homepagePath ?? "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });
}

test("twin insights: deterministic generation", () => {
  const observations = generateTwinObservations(buildTwin());
  const first = generateTwinInsights(observations);
  const second = generateTwinInsights(observations);
  assert.deepEqual(first, second);
});

test("twin insights: applies all four initial rules", () => {
  const observations = generateTwinObservations(buildTwin());
  const insights = generateTwinInsights(observations);
  const titles = insights.map((entry) => entry.title);
  assert.equal(titles.includes("Focused Website Footprint"), true);
  assert.equal(titles.includes("Primary Entry Experience Detected"), true);
  assert.equal(titles.includes("Limited Design Evidence Available"), true);
  assert.equal(titles.includes("Governance Boundary Enforced"), true);
});

test("twin insights: supporting observations map to expected rule evidence", () => {
  const observations = generateTwinObservations(buildTwin());
  const insights = generateTwinInsights(observations);
  const byTitle = new Map(insights.map((entry) => [entry.title, entry]));
  assert.deepEqual(byTitle.get("Focused Website Footprint")?.supportingObservations, ["Small Site Footprint"]);
  assert.deepEqual(byTitle.get("Primary Entry Experience Detected")?.supportingObservations, [
    "Small Site Footprint",
    "Homepage Successfully Identified",
  ]);
  assert.deepEqual(byTitle.get("Limited Design Evidence Available")?.supportingObservations, ["No Asset Evidence Detected"]);
  assert.deepEqual(byTitle.get("Governance Boundary Enforced")?.supportingObservations, ["Read-Only Runtime Validation"]);
});
