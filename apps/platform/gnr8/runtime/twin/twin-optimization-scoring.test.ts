import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import {
  scoreOptimizationOpportunities,
  TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildTwin() {
  return buildWebsiteDigitalTwin({
    siteId: "site_optimization_scoring",
    siteVersionId: "sv_optimization_scoring",
    workspaceId: "ws_optimization_scoring",
    environmentScope: "preview",
    sourceImportId: "import_optimization_scoring",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Optimization Scoring Site",
      detectedHomepagePath: "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });
}

function buildOpportunities() {
  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(buildTwin())));
  return generateTwinOptimizationOpportunities(recommendations);
}

test("twin optimization scoring: deterministic scoring", () => {
  const opportunities = buildOpportunities();
  const first = scoreOptimizationOpportunities(opportunities);
  const second = scoreOptimizationOpportunities(opportunities);
  assert.deepEqual(first, second);
});

test("twin optimization scoring: maps all score dimensions and computes totals", () => {
  const opportunities = buildOpportunities();
  const scores = scoreOptimizationOpportunities(opportunities);
  const byId = new Map(scores.map((entry) => [entry.opportunityId, entry]));

  assert.deepEqual(byId.get("opt_homepage_conversion_review"), {
    opportunityId: "opt_homepage_conversion_review",
    impactScore: 100,
    effortScore: 100,
    confidenceScore: 100,
    evidenceQualityScore: 90,
    totalScore: 390,
    rank: 1,
  });
  assert.deepEqual(byId.get("opt_homepage_quality_improvement"), {
    opportunityId: "opt_homepage_quality_improvement",
    impactScore: 100,
    effortScore: 60,
    confidenceScore: 100,
    evidenceQualityScore: 80,
    totalScore: 340,
    rank: 2,
  });
  assert.deepEqual(byId.get("opt_validation_stability_preservation"), {
    opportunityId: "opt_validation_stability_preservation",
    impactScore: 20,
    effortScore: 100,
    confidenceScore: 100,
    evidenceQualityScore: 100,
    totalScore: 320,
    rank: 3,
  });
  assert.deepEqual(byId.get("opt_design_evidence_collection"), {
    opportunityId: "opt_design_evidence_collection",
    impactScore: 60,
    effortScore: 60,
    confidenceScore: 100,
    evidenceQualityScore: 50,
    totalScore: 270,
    rank: 4,
  });
});

test("twin optimization scoring: ranks by total score descending", () => {
  const opportunities = buildOpportunities();
  const scores = scoreOptimizationOpportunities(opportunities);
  assert.deepEqual(
    scores.map((entry) => entry.opportunityId),
    [
      "opt_homepage_conversion_review",
      "opt_homepage_quality_improvement",
      "opt_validation_stability_preservation",
      "opt_design_evidence_collection",
    ],
  );
  assert.deepEqual(
    scores.map((entry) => entry.totalScore),
    [390, 340, 320, 270],
  );
  assert.deepEqual(
    scores.map((entry) => entry.rank),
    [1, 2, 3, 4],
  );
});

test("twin optimization scoring: diagnostics constants are stable", () => {
  assert.equal(TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.STARTED, "TWIN_OPTIMIZATION_SCORING_STARTED");
  assert.equal(TWIN_OPTIMIZATION_SCORING_DIAGNOSTICS.COMPLETED, "TWIN_OPTIMIZATION_SCORING_COMPLETED");
});
