import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { scoreOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import { generateTwinProposalCandidates } from "@/gnr8/runtime/twin/twin-proposal-candidates";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";
import {
  generateTwinApprovalPreviews,
  TWIN_APPROVAL_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-approval-preview";

function buildProposalCandidates() {
  const twin = buildWebsiteDigitalTwin({
    siteId: "site_approval_preview",
    siteVersionId: "sv_approval_preview",
    workspaceId: "ws_approval_preview",
    environmentScope: "preview",
    sourceImportId: "import_approval_preview",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Approval Preview Site",
      detectedHomepagePath: "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });

  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(twin)));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const scores = scoreOptimizationOpportunities(opportunities);
  return generateTwinProposalCandidates({ opportunities, scores, limit: 4 });
}

test("twin approval preview: deterministic preview generation", () => {
  const proposalCandidates = buildProposalCandidates();
  const first = generateTwinApprovalPreviews(proposalCandidates);
  const second = generateTwinApprovalPreviews(proposalCandidates);
  assert.deepEqual(first, second);
});

test("twin approval preview: future state path generation is stable", () => {
  const proposalCandidates = buildProposalCandidates();
  const previews = generateTwinApprovalPreviews(proposalCandidates);
  for (const preview of previews) {
    assert.deepEqual(preview.futureStates, [
      "proposal_candidate",
      "approval_review",
      "approved",
      "execution_plan",
      "execution_blocked",
    ]);
  }
});

test("twin approval preview: governance permissions are always blocked", () => {
  const proposalCandidates = buildProposalCandidates();
  const previews = generateTwinApprovalPreviews(proposalCandidates);
  assert.equal(previews.every((entry) => entry.requiredApprovals === 1), true);
  assert.equal(previews.every((entry) => entry.executionPermission === false), true);
  assert.equal(previews.every((entry) => entry.mutationPermission === false), true);
  assert.equal(previews.every((entry) => entry.publishingPermission === false), true);
  assert.equal(previews.every((entry) => entry.providerPermission === false), true);
  assert.equal(previews.every((entry) => entry.governanceState === "preview_non_executable"), true);
});

test("twin approval preview: summary generation follows deterministic title rules", () => {
  const proposalCandidates = buildProposalCandidates();
  const previews = generateTwinApprovalPreviews(proposalCandidates);
  const byTitle = new Map(previews.map((entry) => [entry.proposalTitle, entry.summary]));

  assert.equal(
    byTitle.get("Improve Homepage Conversion Flow"),
    "This proposal requires operator approval before any future execution planning can occur.",
  );
  assert.equal(
    byTitle.get("Improve Homepage Quality and Messaging"),
    "This proposal requires operator approval before any future content or design planning can occur.",
  );
  assert.equal(
    byTitle.get("Maintain Read-Only Validation Mode"),
    "This proposal remains governed by read-only validation boundaries and cannot execute.",
  );

  const fallbackPreview = generateTwinApprovalPreviews([
    {
      proposalId: "proposal_candidate_custom",
      status: "proposal_candidate",
      executionState: "blocked",
      title: "Custom Proposal",
      summary: "custom",
      priority: "low",
      expectedImpact: "low",
      expectedEffort: "low",
      risk: "low",
      optimizationRank: 99,
      optimizationScore: 0,
      sourceOpportunityId: "custom",
      supportingRecommendations: [],
      reason: "custom",
      boundaries: [],
    },
  ]);
  assert.equal(
    fallbackPreview[0]?.summary,
    "This proposal requires future approval review before execution planning.",
  );
});

test("twin approval preview: diagnostics constants are stable", () => {
  assert.equal(TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.STARTED, "TWIN_APPROVAL_PREVIEW_STARTED");
  assert.equal(TWIN_APPROVAL_PREVIEW_DIAGNOSTICS.COMPLETED, "TWIN_APPROVAL_PREVIEW_COMPLETED");
});
