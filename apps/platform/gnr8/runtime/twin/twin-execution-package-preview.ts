import type { TwinExecutionArtifactPreview } from "@/gnr8/runtime/twin/twin-execution-artifact-preview";
import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";
import type { TwinExecutionReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-readiness";

export type TwinExecutionPackageState = "preview_ready" | "preview_incomplete";

export type TwinExecutionPackagePreview = {
  packageId: string;
  proposalId: string;
  proposalTitle: string;
  packageState: TwinExecutionPackageState;
  readinessState: string;
  readinessScore: number;
  includedArtifacts: string[];
  includedPlans: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_package_preview_only";
  summary: string;
};

export const TWIN_EXECUTION_PACKAGE_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_PACKAGE_PREVIEW_STARTED",
  COMPLETED: "TWIN_EXECUTION_PACKAGE_PREVIEW_COMPLETED",
} as const;

const PACKAGE_SUMMARIES_BY_TITLE = new Map<string, string>([
  [
    "Improve Homepage Conversion Flow",
    "Execution package preview contains conversion planning evidence and supporting planning artifacts.",
  ],
  [
    "Improve Homepage Quality and Messaging",
    "Execution package preview contains content planning evidence and supporting planning artifacts.",
  ],
  [
    "Maintain Read-Only Validation Mode",
    "Execution package preview contains governance validation planning evidence and reporting artifacts.",
  ],
]);

const FALLBACK_SUMMARY = "Insufficient planning evidence exists to assemble an execution package preview.";

export function generateTwinExecutionPackagePreviews({
  readinessRecords,
  executionPlanPreviews,
  executionArtifactPreviews,
}: {
  readinessRecords: TwinExecutionReadinessRecord[];
  executionPlanPreviews: TwinExecutionPlanPreview[];
  executionArtifactPreviews: TwinExecutionArtifactPreview[];
}): TwinExecutionPackagePreview[] {
  const executionPlanPreviewsByProposalId = new Map(executionPlanPreviews.map((preview) => [preview.proposalId, preview]));
  const executionArtifactPreviewsByTitle = new Map(executionArtifactPreviews.map((preview) => [preview.proposalTitle, preview]));

  return readinessRecords.map((readinessRecord) => {
    const executionPlanPreview = executionPlanPreviewsByProposalId.get(readinessRecord.proposalId);
    const executionArtifactPreview = executionArtifactPreviewsByTitle.get(readinessRecord.proposalTitle);
    const summary = PACKAGE_SUMMARIES_BY_TITLE.get(readinessRecord.proposalTitle);
    const hasCompletePlanningEvidence = summary != null && executionPlanPreview != null && executionArtifactPreview != null;

    return {
      packageId: `execution_package_preview_${readinessRecord.proposalId}`,
      proposalId: readinessRecord.proposalId,
      proposalTitle: readinessRecord.proposalTitle,
      packageState: hasCompletePlanningEvidence ? "preview_ready" : "preview_incomplete",
      readinessState: hasCompletePlanningEvidence ? readinessRecord.readinessState : "not_ready",
      readinessScore: hasCompletePlanningEvidence ? readinessRecord.readinessScore : 0,
      includedArtifacts: hasCompletePlanningEvidence ? [...executionArtifactPreview.plannedOutputs] : [],
      includedPlans: hasCompletePlanningEvidence ? [...executionPlanPreview.plannedActions] : [],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_package_preview_only",
      summary: hasCompletePlanningEvidence ? summary : FALLBACK_SUMMARY,
    };
  });
}
