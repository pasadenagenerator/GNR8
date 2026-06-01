import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildTwin(input?: { pageCount?: number; assetCount?: number; homepagePath?: string }) {
  return buildWebsiteDigitalTwin({
    siteId: "site_recommendations",
    siteVersionId: "sv_recommendations",
    workspaceId: "ws_recommendations",
    environmentScope: "preview",
    sourceImportId: "import_recommendations",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: input?.pageCount ?? 2,
      sectionCount: 5,
      assetCount: input?.assetCount ?? 0,
      detectedTitle: "Recommendation Site",
      detectedHomepagePath: input?.homepagePath ?? "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });
}

test("twin recommendations: deterministic generation", () => {
  const observations = generateTwinObservations(buildTwin());
  const insights = generateTwinInsights(observations);
  const first = generateTwinRecommendations(insights);
  const second = generateTwinRecommendations(insights);
  assert.deepEqual(first, second);
});

test("twin recommendations: applies all four initial rules", () => {
  const observations = generateTwinObservations(buildTwin());
  const insights = generateTwinInsights(observations);
  const recommendations = generateTwinRecommendations(insights);
  const titles = recommendations.map((entry) => entry.title);
  assert.equal(titles.includes("Prioritize Core Page Quality"), true);
  assert.equal(titles.includes("Evaluate Homepage Conversion Flow"), true);
  assert.equal(titles.includes("Collect Additional Design Evidence"), true);
  assert.equal(titles.includes("Maintain Read-Only Validation Mode"), true);
});

test("twin recommendations: supporting insights map to expected rule evidence", () => {
  const observations = generateTwinObservations(buildTwin());
  const insights = generateTwinInsights(observations);
  const recommendations = generateTwinRecommendations(insights);
  const byTitle = new Map(recommendations.map((entry) => [entry.title, entry]));
  assert.deepEqual(byTitle.get("Prioritize Core Page Quality")?.supportingInsights, ["Focused Website Footprint"]);
  assert.deepEqual(byTitle.get("Evaluate Homepage Conversion Flow")?.supportingInsights, [
    "Primary Entry Experience Detected",
  ]);
  assert.deepEqual(byTitle.get("Collect Additional Design Evidence")?.supportingInsights, [
    "Limited Design Evidence Available",
  ]);
  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode")?.supportingInsights, ["Governance Boundary Enforced"]);
});
