import type { TwinProposalCandidate } from "@/gnr8/runtime/twin/twin-proposal-candidates";

export type TwinApprovalPreview = {
  previewId: string;
  proposalId: string;
  proposalTitle: string;
  currentState: "proposal_candidate";
  futureStates: string[];
  requiredApprovals: number;
  executionPermission: boolean;
  mutationPermission: boolean;
  publishingPermission: boolean;
  providerPermission: boolean;
  governanceState: string;
  summary: string;
};

export const TWIN_APPROVAL_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_APPROVAL_PREVIEW_STARTED",
  COMPLETED: "TWIN_APPROVAL_PREVIEW_COMPLETED",
} as const;

const APPROVAL_FUTURE_STATES = [
  "proposal_candidate",
  "approval_review",
  "approved",
  "execution_plan",
  "execution_blocked",
] as const;

function toApprovalSummary(proposalTitle: string): string {
  if (proposalTitle === "Improve Homepage Conversion Flow") {
    return "This proposal requires operator approval before any future execution planning can occur.";
  }
  if (proposalTitle === "Improve Homepage Quality and Messaging") {
    return "This proposal requires operator approval before any future content or design planning can occur.";
  }
  if (proposalTitle === "Maintain Read-Only Validation Mode") {
    return "This proposal remains governed by read-only validation boundaries and cannot execute.";
  }
  return "This proposal requires future approval review before execution planning.";
}

export function generateTwinApprovalPreviews(proposalCandidates: TwinProposalCandidate[]): TwinApprovalPreview[] {
  return proposalCandidates.map((proposal) => ({
    previewId: `approval_preview_${proposal.proposalId}`,
    proposalId: proposal.proposalId,
    proposalTitle: proposal.title,
    currentState: "proposal_candidate",
    futureStates: [...APPROVAL_FUTURE_STATES],
    requiredApprovals: 1,
    executionPermission: false,
    mutationPermission: false,
    publishingPermission: false,
    providerPermission: false,
    governanceState: "preview_non_executable",
    summary: toApprovalSummary(proposal.title),
  }));
}
