import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinApprovalPreviews } from "@/gnr8/runtime/twin/twin-approval-preview";
import {
  generateTwinApprovalStateRecords,
  TWIN_APPROVAL_STATE_DIAGNOSTICS,
  type TwinApprovalState,
} from "@/gnr8/runtime/twin/twin-approval-state";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { scoreOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import { generateTwinProposalCandidates } from "@/gnr8/runtime/twin/twin-proposal-candidates";
import { generateTwinProposalApprovalRecords } from "@/gnr8/runtime/twin/twin-proposal-approval";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildApprovalRecords() {
  const twin = buildWebsiteDigitalTwin({
    siteId: "site_approval_state",
    siteVersionId: "sv_approval_state",
    workspaceId: "ws_approval_state",
    environmentScope: "preview",
    sourceImportId: "import_approval_state",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Approval State Site",
      detectedHomepagePath: "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });

  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(twin)));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const scores = scoreOptimizationOpportunities(opportunities);
  const proposalCandidates = generateTwinProposalCandidates({ opportunities, scores, limit: 4 });
  const approvalPreviews = generateTwinApprovalPreviews(proposalCandidates);
  return generateTwinProposalApprovalRecords({ proposalCandidates, approvalPreviews });
}

test("twin approval state: deterministic generation", () => {
  const records = buildApprovalRecords();
  const first = generateTwinApprovalStateRecords(records);
  const second = generateTwinApprovalStateRecords(records);
  assert.deepEqual(first, second);
});

test("twin approval state: maps approval records to pending_review", () => {
  const records = buildApprovalRecords();
  const states = generateTwinApprovalStateRecords(records);
  assert.equal(states.length, records.length);
  assert.equal(states.every((entry) => entry.approvalState === "pending_review"), true);
  assert.equal(
    states.every(
      (entry) => entry.summary === "This proposal is awaiting future operator review before approval can occur.",
    ),
    true,
  );
});

test("twin approval state: ready_for_future_approval type exists", () => {
  const value: TwinApprovalState = "ready_for_future_approval";
  assert.equal(value, "ready_for_future_approval");
});

test("twin approval state: permissions are always false with preview governance", () => {
  const records = buildApprovalRecords();
  const states = generateTwinApprovalStateRecords(records);
  assert.equal(states.every((entry) => entry.approvalComplete === false), true);
  assert.equal(states.every((entry) => entry.executionAllowed === false), true);
  assert.equal(states.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(states.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(states.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(states.every((entry) => entry.governanceState === "approval_state_preview_only"), true);
});

test("twin approval state: diagnostics constants are stable", () => {
  assert.equal(TWIN_APPROVAL_STATE_DIAGNOSTICS.STARTED, "TWIN_APPROVAL_STATE_STARTED");
  assert.equal(TWIN_APPROVAL_STATE_DIAGNOSTICS.COMPLETED, "TWIN_APPROVAL_STATE_COMPLETED");
});
