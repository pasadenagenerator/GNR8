import type { TwinApprovalStateRecord } from "@/gnr8/runtime/twin/twin-approval-state";
import type { TwinProposalCandidate } from "@/gnr8/runtime/twin/twin-proposal-candidates";

export type TwinApprovalQueuePriority = "high" | "medium" | "low";

export type TwinApprovalQueueItem = {
  queueId: string;
  proposalId: string;
  proposalTitle: string;
  approvalState: string;
  queueRank: number;
  queuePriority: TwinApprovalQueuePriority;
  optimizationScore: number;
  governanceState: string;
  executionAllowed: boolean;
  mutationAllowed: boolean;
  publishingAllowed: boolean;
  providerExecutionAllowed: boolean;
  summary: string;
};

export const TWIN_APPROVAL_QUEUE_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_APPROVAL_QUEUE_PREVIEW_STARTED",
  COMPLETED: "TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED",
} as const;

function toQueuePriority(optimizationScore: number): TwinApprovalQueuePriority {
  if (optimizationScore >= 350) return "high";
  if (optimizationScore >= 300) return "medium";
  return "low";
}

function toSummary(queuePriority: TwinApprovalQueuePriority): string {
  if (queuePriority === "high") return "High-priority proposal awaiting future review.";
  if (queuePriority === "medium") return "Medium-priority proposal awaiting future review.";
  if (queuePriority === "low") return "Low-priority proposal awaiting future review.";
  return "Proposal is awaiting future review.";
}

export function generateTwinApprovalQueueItems(
  approvalStates: TwinApprovalStateRecord[],
  proposalCandidates: TwinProposalCandidate[],
): TwinApprovalQueueItem[] {
  const proposalCandidatesById = new Map(proposalCandidates.map((candidate) => [candidate.proposalId, candidate]));

  return approvalStates
    .flatMap((approvalState): Omit<TwinApprovalQueueItem, "queueRank">[] => {
      const proposalCandidate = proposalCandidatesById.get(approvalState.proposalId);
      if (!proposalCandidate) return [];
      const queuePriority = toQueuePriority(proposalCandidate.optimizationScore);

      return [
        {
          queueId: `approval_queue_${approvalState.proposalId}`,
          proposalId: approvalState.proposalId,
          proposalTitle: proposalCandidate.title,
          approvalState: approvalState.approvalState,
          queuePriority,
          optimizationScore: proposalCandidate.optimizationScore,
          governanceState: "approval_queue_preview_only",
          executionAllowed: false,
          mutationAllowed: false,
          publishingAllowed: false,
          providerExecutionAllowed: false,
          summary: toSummary(queuePriority),
        },
      ];
    })
    .sort((a, b) => b.optimizationScore - a.optimizationScore || a.proposalId.localeCompare(b.proposalId))
    .map((item, index) => ({
      ...item,
      queueRank: index + 1,
    }));
}
