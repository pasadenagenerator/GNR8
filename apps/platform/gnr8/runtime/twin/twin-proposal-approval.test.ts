import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { scoreOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import { generateTwinApprovalPreviews } from "@/gnr8/runtime/twin/twin-approval-preview";
import { generateTwinProposalCandidates } from "@/gnr8/runtime/twin/twin-proposal-candidates";
import {
  generateTwinProposalApprovalRecords,
  TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-proposal-approval";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildProposalCandidates() {
  const twin = buildWebsiteDigitalTwin({
    siteId: "site_proposal_approval",
    siteVersionId: "sv_proposal_approval",
    workspaceId: "ws_proposal_approval",
    environmentScope: "preview",
    sourceImportId: "import_proposal_approval",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Proposal Approval Site",
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

test("twin proposal approval: deterministic approval record generation", () => {
  const proposalCandidates = buildProposalCandidates();
  const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
  const first = generateTwinProposalApprovalRecords({ proposalCandidates, approvalPreviews });
  const second = generateTwinProposalApprovalRecords({ proposalCandidates, approvalPreviews });
  assert.deepEqual(first, second);
});

test("twin proposal approval: matching uses proposalId and required approvals from previews", () => {
  const proposalCandidates = buildProposalCandidates();
  const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
  const records = generateTwinProposalApprovalRecords({ proposalCandidates, approvalPreviews });
  assert.equal(records.length, proposalCandidates.length);
  assert.equal(records.every((entry) => entry.requiredApprovals === 1), true);
  assert.equal(
    records.every((entry) => entry.summary === "This proposal requires approval before any future execution planning can proceed."),
    true,
  );
});

test("twin proposal approval: fallback is used when preview is missing", () => {
  const proposalCandidates = buildProposalCandidates();
  const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
  const fallbackCandidate = proposalCandidates[0];
  assert.notEqual(fallbackCandidate, undefined);
  const truncatedPreviews = approvalPreviews.filter((entry) => entry.proposalId !== fallbackCandidate?.proposalId);

  const records = generateTwinProposalApprovalRecords({
    proposalCandidates,
    approvalPreviews: truncatedPreviews,
  });

  const fallbackRecord = records.find((entry) => entry.proposalId === fallbackCandidate?.proposalId);
  assert.notEqual(fallbackRecord, undefined);
  assert.equal(fallbackRecord?.requiredApprovals, 1);
  assert.equal(
    fallbackRecord?.summary,
    "This proposal requires approval review, but no approval preview artifact was available.",
  );
});

test("twin proposal approval: records are read-only and blocked", () => {
  const proposalCandidates = buildProposalCandidates();
  const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
  const records = generateTwinProposalApprovalRecords({ proposalCandidates, approvalPreviews });

  assert.equal(records.every((entry) => entry.approvalStatus === "approval_required"), true);
  assert.equal(records.every((entry) => entry.decision === "not_requested"), true);
  assert.equal(records.every((entry) => entry.receivedApprovals === 0), true);
  assert.equal(records.every((entry) => entry.approvalComplete === false), true);
  assert.equal(records.every((entry) => entry.executionAllowed === false), true);
  assert.equal(records.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(records.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(records.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(records.every((entry) => entry.governanceState === "approval_required_preview_only"), true);
});

test("twin proposal approval: diagnostics constants are stable", () => {
  assert.equal(TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.STARTED, "TWIN_PROPOSAL_APPROVAL_STARTED");
  assert.equal(TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS.COMPLETED, "TWIN_PROPOSAL_APPROVAL_COMPLETED");
});
