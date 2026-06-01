import type { TwinApprovalPreview } from "@/gnr8/runtime/twin/twin-approval-preview";

export type TwinExecutionPlanPreview = {
  planId: string;
  proposalId: string;
  proposalTitle: string;
  executionState: "preview_only";
  plannedActions: string[];
  executionBlocked: boolean;
  providerExecutionAllowed: boolean;
  publishingAllowed: boolean;
  mutationAllowed: boolean;
  governanceState: string;
  summary: string;
};

export const TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_PLAN_PREVIEW_STARTED",
  COMPLETED: "TWIN_EXECUTION_PLAN_PREVIEW_COMPLETED",
} as const;

function toPlannedActions(proposalTitle: string): string[] {
  if (proposalTitle === "Improve Homepage Conversion Flow") {
    return [
      "analyze_homepage_conversion_flow",
      "identify_primary_conversion_path",
      "prepare_conversion_improvement_plan",
    ];
  }
  if (proposalTitle === "Improve Homepage Quality and Messaging") {
    return [
      "analyze_homepage_content",
      "identify_messaging_improvements",
      "prepare_content_improvement_plan",
    ];
  }
  if (proposalTitle === "Maintain Read-Only Validation Mode") {
    return ["maintain_read_only_runtime", "continue_validation_observation"];
  }
  return ["future_execution_plan_required"];
}

function toExecutionPlanSummary(proposalTitle: string): string {
  if (proposalTitle === "Improve Homepage Conversion Flow") {
    return "If approved in the future, Website OS would prepare a conversion-focused improvement plan before any execution.";
  }
  if (proposalTitle === "Improve Homepage Quality and Messaging") {
    return "If approved in the future, Website OS would prepare a content and messaging improvement plan before any execution.";
  }
  if (proposalTitle === "Maintain Read-Only Validation Mode") {
    return "Website OS would continue validation-mode observation without enabling mutation workflows.";
  }
  return "Future execution planning would be required before any execution.";
}

export function generateTwinExecutionPlanPreviews(
  approvalPreviews: TwinApprovalPreview[],
): TwinExecutionPlanPreview[] {
  return approvalPreviews.map((approvalPreview) => ({
    planId: `execution_plan_preview_${approvalPreview.proposalId}`,
    proposalId: approvalPreview.proposalId,
    proposalTitle: approvalPreview.proposalTitle,
    executionState: "preview_only",
    plannedActions: toPlannedActions(approvalPreview.proposalTitle),
    executionBlocked: true,
    providerExecutionAllowed: false,
    publishingAllowed: false,
    mutationAllowed: false,
    governanceState: "preview_non_executable",
    summary: toExecutionPlanSummary(approvalPreview.proposalTitle),
  }));
}
