import type { TwinProposalApprovalRecord } from "@/gnr8/runtime/twin/twin-proposal-approval";

export type TwinApprovalState = "approval_required" | "pending_review" | "ready_for_future_approval";

export type TwinApprovalStateRecord = {
  approvalId: string;
  proposalId: string;
  proposalTitle: string;
  approvalState: TwinApprovalState;
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

export const TWIN_APPROVAL_STATE_DIAGNOSTICS = {
  STARTED: "TWIN_APPROVAL_STATE_STARTED",
  COMPLETED: "TWIN_APPROVAL_STATE_COMPLETED",
} as const;

function toSummary(approvalState: TwinApprovalState): string {
  if (approvalState === "pending_review") {
    return "This proposal is awaiting future operator review before approval can occur.";
  }
  return "This proposal remains in a review-required state.";
}

export function generateTwinApprovalStateRecords(
  approvalRecords: TwinProposalApprovalRecord[],
): TwinApprovalStateRecord[] {
  return approvalRecords.map((record) => {
    const approvalState: TwinApprovalState =
      record.approvalStatus === "approval_required" && record.decision === "not_requested"
        ? "pending_review"
        : "pending_review";

    return {
      approvalId: record.approvalId,
      proposalId: record.proposalId,
      proposalTitle: record.proposalTitle,
      approvalState,
      requiredApprovals: record.requiredApprovals,
      receivedApprovals: record.receivedApprovals,
      approvalComplete: false,
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "approval_state_preview_only",
      summary: toSummary(approvalState),
    };
  });
}
