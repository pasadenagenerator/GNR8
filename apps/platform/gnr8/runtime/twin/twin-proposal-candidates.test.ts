import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { scoreOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import {
  generateTwinProposalCandidates,
  TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-proposal-candidates";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildInputs() {
  const twin = buildWebsiteDigitalTwin({
    siteId: "site_proposal_candidates",
    siteVersionId: "sv_proposal_candidates",
    workspaceId: "ws_proposal_candidates",
    environmentScope: "preview",
    sourceImportId: "import_proposal_candidates",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Proposal Candidates Site",
      detectedHomepagePath: "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });

  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(twin)));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const scores = scoreOptimizationOpportunities(opportunities);
  return { opportunities, scores };
}

test("twin proposal candidates: deterministic generation", () => {
  const input = buildInputs();
  const first = generateTwinProposalCandidates(input);
  const second = generateTwinProposalCandidates(input);
  assert.deepEqual(first, second);
});

test("twin proposal candidates: top-ranked limit defaults to three", () => {
  const input = buildInputs();
  const proposals = generateTwinProposalCandidates(input);
  assert.equal(proposals.length, 3);
  assert.deepEqual(
    proposals.map((entry) => entry.optimizationRank),
    [1, 2, 3],
  );
});

test("twin proposal candidates: all proposal rules map correctly", () => {
  const input = buildInputs();
  const proposals = generateTwinProposalCandidates({ ...input, limit: 4 });
  const bySourceOpportunityId = new Map(proposals.map((entry) => [entry.sourceOpportunityId, entry]));

  assert.equal(bySourceOpportunityId.get("opt_homepage_conversion_review")?.title, "Improve Homepage Conversion Flow");
  assert.equal(
    bySourceOpportunityId.get("opt_homepage_quality_improvement")?.title,
    "Improve Homepage Quality and Messaging",
  );
  assert.equal(bySourceOpportunityId.get("opt_design_evidence_collection")?.title, "Collect Additional Design Evidence");
  assert.equal(
    bySourceOpportunityId.get("opt_validation_stability_preservation")?.title,
    "Maintain Read-Only Validation Mode",
  );
});

test("twin proposal candidates: status and execution state are always read-only candidate values", () => {
  const input = buildInputs();
  const proposals = generateTwinProposalCandidates({ ...input, limit: 4 });
  assert.equal(proposals.every((entry) => entry.status === "proposal_candidate"), true);
  assert.equal(proposals.every((entry) => entry.executionState === "blocked"), true);
});

test("twin proposal candidates: required boundaries are always present", () => {
  const input = buildInputs();
  const proposals = generateTwinProposalCandidates({ ...input, limit: 4 });
  for (const proposal of proposals) {
    assert.deepEqual(proposal.boundaries, [
      "read_only",
      "non_executable",
      "no_content_mutation",
      "no_design_mutation",
      "no_publish",
      "no_provider_execution",
    ]);
  }
});

test("twin proposal candidates: diagnostics constants are stable", () => {
  assert.equal(TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.STARTED, "TWIN_PROPOSAL_CANDIDATES_STARTED");
  assert.equal(TWIN_PROPOSAL_CANDIDATES_DIAGNOSTICS.COMPLETED, "TWIN_PROPOSAL_CANDIDATES_COMPLETED");
});
