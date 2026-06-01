import type { TwinApprovalPreview } from "@/gnr8/runtime/twin/twin-approval-preview";
import type { TwinProposalCandidate } from "@/gnr8/runtime/twin/twin-proposal-candidates";

export type TwinProposalApprovalStatus = "approval_required";

export type TwinProposalApprovalDecision = "not_requested";

export type TwinProposalApprovalRecord = {
  approvalId: string;
  proposalId: string;
  proposalTitle: string;
  approvalStatus: TwinProposalApprovalStatus;
  decision: TwinProposalApprovalDecision;
  requiredApprovals: number;
  receivedApprovals: number;
  approvalComplete: boolean;
  executionAllowed: boolean;
  mutationAllowed: boolean;
  publishingAllowed: boolean;
  providerExecutionAllowed: boolean;
  governanceState: string;
  summary: string;
};

export const TWIN_PROPOSAL_APPROVAL_DIAGNOSTICS = {
  STARTED: "TWIN_PROPOSAL_APPROVAL_STARTED",
  COMPLETED: "TWIN_PROPOSAL_APPROVAL_COMPLETED",
} as const;

export function generateTwinProposalApprovalRecords(input: {
  proposalCandidates: TwinProposalCandidate[];
  approvalPreviews: TwinApprovalPreview[];
}): TwinProposalApprovalRecord[] {
  const previewByProposalId = new Map(input.approvalPreviews.map((preview) => [preview.proposalId, preview]));

  return input.proposalCandidates.map((proposal) => {
    const matchingPreview = previewByProposalId.get(proposal.proposalId);
    const previewAvailable = matchingPreview != null;
    return {
      approvalId: `proposal_approval_${proposal.proposalId}`,
      proposalId: proposal.proposalId,
      proposalTitle: proposal.title,
      approvalStatus: "approval_required",
      decision: "not_requested",
      requiredApprovals: matchingPreview?.requiredApprovals ?? 1,
      receivedApprovals: 0,
      approvalComplete: false,
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "approval_required_preview_only",
      summary: previewAvailable
        ? "This proposal requires approval before any future execution planning can proceed."
        : "This proposal requires approval review, but no approval preview artifact was available.",
    };
  });
}
