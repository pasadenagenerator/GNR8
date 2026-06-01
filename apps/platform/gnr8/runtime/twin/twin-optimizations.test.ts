import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import {
  generateTwinOptimizationOpportunities,
  TWIN_OPTIMIZATION_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-optimizations";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildTwin(input?: { pageCount?: number; assetCount?: number; homepagePath?: string }) {
  return buildWebsiteDigitalTwin({
    siteId: "site_optimizations",
    siteVersionId: "sv_optimizations",
    workspaceId: "ws_optimizations",
    environmentScope: "preview",
    sourceImportId: "import_optimizations",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: input?.pageCount ?? 2,
      sectionCount: 5,
      assetCount: input?.assetCount ?? 0,
      detectedTitle: "Optimization Site",
      detectedHomepagePath: input?.homepagePath ?? "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });
}

test("twin optimizations: deterministic generation", () => {
  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(buildTwin())));
  const first = generateTwinOptimizationOpportunities(recommendations);
  const second = generateTwinOptimizationOpportunities(recommendations);
  assert.deepEqual(first, second);
});

test("twin optimizations: applies all four rules", () => {
  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(buildTwin())));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const titles = opportunities.map((entry) => entry.title);
  assert.equal(titles.includes("Homepage Quality Improvement"), true);
  assert.equal(titles.includes("Homepage Conversion Review"), true);
  assert.equal(titles.includes("Design Evidence Collection"), true);
  assert.equal(titles.includes("Validation Stability Preservation"), true);
});

test("twin optimizations: sorts by priority high to low deterministically", () => {
  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(buildTwin())));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  assert.deepEqual(
    opportunities.map((entry) => entry.priority),
    ["high", "high", "medium", "low"],
  );
  assert.deepEqual(
    opportunities.map((entry) => entry.title),
    [
      "Homepage Quality Improvement",
      "Homepage Conversion Review",
      "Design Evidence Collection",
      "Validation Stability Preservation",
    ],
  );
});

test("twin optimizations: supporting recommendations map to expected rule evidence", () => {
  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(buildTwin())));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const byTitle = new Map(opportunities.map((entry) => [entry.title, entry]));
  assert.deepEqual(byTitle.get("Homepage Quality Improvement")?.supportingRecommendations, [
    "Prioritize Core Page Quality",
  ]);
  assert.deepEqual(byTitle.get("Homepage Conversion Review")?.supportingRecommendations, [
    "Evaluate Homepage Conversion Flow",
  ]);
  assert.deepEqual(byTitle.get("Design Evidence Collection")?.supportingRecommendations, [
    "Collect Additional Design Evidence",
  ]);
  assert.deepEqual(byTitle.get("Validation Stability Preservation")?.supportingRecommendations, [
    "Maintain Read-Only Validation Mode",
  ]);
});

test("twin optimizations: diagnostics constants are stable", () => {
  assert.equal(TWIN_OPTIMIZATION_DIAGNOSTICS.STARTED, "TWIN_OPTIMIZATIONS_STARTED");
  assert.equal(TWIN_OPTIMIZATION_DIAGNOSTICS.COMPLETED, "TWIN_OPTIMIZATIONS_COMPLETED");
});
