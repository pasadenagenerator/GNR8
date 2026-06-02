import assert from "node:assert/strict";
import test from "node:test";

import type { TwinApprovalStateRecord } from "@/gnr8/runtime/twin/twin-approval-state";
import {
  generateTwinApprovalQueueItems,
  TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS,
  type TwinApprovalQueuePriority,
} from "@/gnr8/runtime/twin/twin-approval-queue-preview";
import type { TwinProposalCandidate } from "@/gnr8/runtime/twin/twin-proposal-candidates";

function buildApprovalState(proposalId: string, proposalTitle: string): TwinApprovalStateRecord {
  return {
    approvalId: `approval_${proposalId}`,
    proposalId,
    proposalTitle,
    approvalState: "pending_review",
    requiredApprovals: 1,
    receivedApprovals: 0,
    approvalComplete: false,
    executionAllowed: false,
    mutationAllowed: false,
    publishingAllowed: false,
    providerExecutionAllowed: false,
    governanceState: "approval_state_preview_only",
    summary: "This proposal is awaiting future operator review before approval can occur.",
  };
}

function buildProposalCandidate(
  proposalId: string,
  title: string,
  optimizationScore: number,
): TwinProposalCandidate {
  return {
    proposalId,
    status: "proposal_candidate",
    executionState: "blocked",
    title,
    summary: `${title} summary`,
    priority: "medium",
    expectedImpact: "high",
    expectedEffort: "low",
    risk: "low",
    optimizationRank: 1,
    optimizationScore,
    sourceOpportunityId: `opt_${proposalId}`,
    supportingRecommendations: [],
    reason: `${title} reason`,
    boundaries: [
      "read_only",
      "non_executable",
      "no_content_mutation",
      "no_design_mutation",
      "no_publish",
      "no_provider_execution",
    ],
  };
}

test("twin approval queue preview: deterministic ordering by optimization score", () => {
  const approvalStates = [
    buildApprovalState("proposal_low", "Approval Low"),
    buildApprovalState("proposal_high", "Approval High"),
    buildApprovalState("proposal_medium", "Approval Medium"),
  ];
  const proposalCandidates = [
    buildProposalCandidate("proposal_low", "Queue Low", 250),
    buildProposalCandidate("proposal_high", "Queue High", 375),
    buildProposalCandidate("proposal_medium", "Queue Medium", 325),
  ];

  const first = generateTwinApprovalQueueItems(approvalStates, proposalCandidates);
  const second = generateTwinApprovalQueueItems(approvalStates, proposalCandidates);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((entry) => entry.proposalId),
    ["proposal_high", "proposal_medium", "proposal_low"],
  );
});

test("twin approval queue preview: matches by proposalId and skips missing candidates", () => {
  const queueItems = generateTwinApprovalQueueItems(
    [buildApprovalState("proposal_present", "Approval Present"), buildApprovalState("proposal_missing", "Approval Missing")],
    [buildProposalCandidate("proposal_present", "Candidate Present", 300)],
  );

  assert.equal(queueItems.length, 1);
  assert.equal(queueItems[0]?.proposalId, "proposal_present");
  assert.equal(queueItems[0]?.proposalTitle, "Candidate Present");
});

test("twin approval queue preview: assigns ranks and priorities", () => {
  const queueItems = generateTwinApprovalQueueItems(
    [
      buildApprovalState("proposal_medium", "Medium"),
      buildApprovalState("proposal_low", "Low"),
      buildApprovalState("proposal_high", "High"),
    ],
    [
      buildProposalCandidate("proposal_medium", "Medium", 300),
      buildProposalCandidate("proposal_low", "Low", 299),
      buildProposalCandidate("proposal_high", "High", 350),
    ],
  );

  assert.deepEqual(
    queueItems.map((entry) => entry.queueRank),
    [1, 2, 3],
  );
  assert.deepEqual(
    queueItems.map((entry) => entry.queuePriority),
    ["high", "medium", "low"],
  );
  assert.equal(queueItems[0]?.summary, "High-priority proposal awaiting future review.");
  assert.equal(queueItems[1]?.summary, "Medium-priority proposal awaiting future review.");
  assert.equal(queueItems[2]?.summary, "Low-priority proposal awaiting future review.");
});

test("twin approval queue preview: governance values are preview-only and non-executable", () => {
  const queueItems = generateTwinApprovalQueueItems(
    [buildApprovalState("proposal_one", "One")],
    [buildProposalCandidate("proposal_one", "One", 350)],
  );

  assert.equal(queueItems.every((entry) => entry.governanceState === "approval_queue_preview_only"), true);
  assert.equal(queueItems.every((entry) => entry.executionAllowed === false), true);
  assert.equal(queueItems.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(queueItems.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(queueItems.every((entry) => entry.providerExecutionAllowed === false), true);
});

test("twin approval queue preview: priority type exists", () => {
  const value: TwinApprovalQueuePriority = "high";
  assert.equal(value, "high");
});

test("twin approval queue preview: diagnostics constants are stable", () => {
  assert.equal(TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.STARTED, "TWIN_APPROVAL_QUEUE_PREVIEW_STARTED");
  assert.equal(TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS.COMPLETED, "TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED");
});
