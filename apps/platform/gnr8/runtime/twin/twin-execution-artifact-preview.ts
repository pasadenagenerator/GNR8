import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";

export type TwinExecutionArtifactPreview = {
  artifactId: string;
  proposalTitle: string;
  artifactType: string;
  affectedAreas: string[];
  plannedOutputs: string[];
  executionState: "preview_only";
  mutationBlocked: boolean;
  governanceState: string;
  summary: string;
};

export const TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED",
  COMPLETED: "TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED",
} as const;

function toArtifactType(proposalTitle: string): string {
  if (proposalTitle === "Improve Homepage Conversion Flow") return "conversion_improvement_plan";
  if (proposalTitle === "Improve Homepage Quality and Messaging") return "content_improvement_plan";
  if (proposalTitle === "Maintain Read-Only Validation Mode") return "validation_continuation_plan";
  return "future_execution_artifact";
}

function toAffectedAreas(proposalTitle: string): string[] {
  if (proposalTitle === "Improve Homepage Conversion Flow") {
    return ["homepage", "primary_conversion_path"];
  }
  if (proposalTitle === "Improve Homepage Quality and Messaging") {
    return ["homepage_hero", "homepage_messaging"];
  }
  if (proposalTitle === "Maintain Read-Only Validation Mode") {
    return ["runtime_governance"];
  }
  return ["unknown"];
}

function toPlannedOutputs(proposalTitle: string): string[] {
  if (proposalTitle === "Improve Homepage Conversion Flow") {
    return ["conversion_review_document", "conversion_improvement_plan"];
  }
  if (proposalTitle === "Improve Homepage Quality and Messaging") {
    return ["messaging_review_document", "content_improvement_plan"];
  }
  if (proposalTitle === "Maintain Read-Only Validation Mode") {
    return ["validation_status_report"];
  }
  return ["future_artifact_definition"];
}

function toArtifactSummary(proposalTitle: string): string {
  if (proposalTitle === "Improve Homepage Conversion Flow") {
    return "Website OS would prepare conversion-focused planning artifacts before any future execution.";
  }
  if (proposalTitle === "Improve Homepage Quality and Messaging") {
    return "Website OS would prepare content and messaging planning artifacts before any future execution.";
  }
  if (proposalTitle === "Maintain Read-Only Validation Mode") {
    return "Website OS would prepare validation reporting artifacts while maintaining read-only governance.";
  }
  return "Website OS would prepare future execution artifacts before execution planning.";
}

export function generateTwinExecutionArtifactPreviews(
  executionPlanPreviews: TwinExecutionPlanPreview[],
): TwinExecutionArtifactPreview[] {
  return executionPlanPreviews.map((executionPlanPreview) => ({
    artifactId: `execution_artifact_preview_${executionPlanPreview.proposalId}`,
    proposalTitle: executionPlanPreview.proposalTitle,
    artifactType: toArtifactType(executionPlanPreview.proposalTitle),
    affectedAreas: toAffectedAreas(executionPlanPreview.proposalTitle),
    plannedOutputs: toPlannedOutputs(executionPlanPreview.proposalTitle),
    executionState: "preview_only",
    mutationBlocked: true,
    governanceState: "preview_non_executable",
    summary: toArtifactSummary(executionPlanPreview.proposalTitle),
  }));
}
