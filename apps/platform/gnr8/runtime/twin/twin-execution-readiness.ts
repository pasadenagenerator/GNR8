import type { TwinApprovalQueueItem } from "@/gnr8/runtime/twin/twin-approval-queue-preview";
import type { TwinExecutionArtifactPreview } from "@/gnr8/runtime/twin/twin-execution-artifact-preview";
import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";

export type TwinExecutionReadinessState = "not_ready" | "partially_ready" | "ready_for_future_planning";

export type TwinExecutionReadinessRecord = {
  readinessId: string;
  proposalId: string;
  proposalTitle: string;
  readinessState: TwinExecutionReadinessState;
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_readiness_preview_only";
  summary: string;
};

export const TWIN_EXECUTION_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_READINESS_COMPLETED",
} as const;

type ReadinessRule = Pick<
  TwinExecutionReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const READINESS_RULES_BY_TITLE = new Map<string, ReadinessRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      readinessState: "partially_ready",
      readinessScore: 60,
      requirementsMet: ["homepage_detected", "approval_queue_ranked", "execution_plan_available"],
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      summary:
        "Execution planning evidence exists but additional conversion evidence is required before future execution readiness.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      readinessState: "ready_for_future_planning",
      readinessScore: 80,
      requirementsMet: [
        "homepage_detected",
        "messaging_surface_identified",
        "execution_plan_available",
        "artifact_preview_available",
      ],
      requirementsMissing: ["design_evidence"],
      summary: "Proposal has sufficient planning evidence for future planning readiness but remains governance blocked.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      readinessState: "ready_for_future_planning",
      readinessScore: 100,
      requirementsMet: [
        "governance_boundary_present",
        "validation_runtime_active",
        "execution_plan_available",
        "artifact_preview_available",
      ],
      requirementsMissing: [],
      summary: "Validation governance proposal is fully prepared within current read-only boundaries.",
    },
  ],
]);

const FALLBACK_READINESS_RULE: ReadinessRule = {
  readinessState: "not_ready",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: ["unknown_requirements"],
  summary: "Insufficient runtime evidence exists to determine future execution readiness.",
};

export function generateTwinExecutionReadinessRecords({
  approvalQueueItems,
  executionPlanPreviews,
  executionArtifactPreviews,
}: {
  approvalQueueItems: TwinApprovalQueueItem[];
  executionPlanPreviews: TwinExecutionPlanPreview[];
  executionArtifactPreviews: TwinExecutionArtifactPreview[];
}): TwinExecutionReadinessRecord[] {
  const executionPlanPreviewsByProposalId = new Map(executionPlanPreviews.map((preview) => [preview.proposalId, preview]));
  const executionArtifactPreviewTitles = new Set(executionArtifactPreviews.map((preview) => preview.proposalTitle));

  return approvalQueueItems.map((queueItem) => {
    const matchedRule = READINESS_RULES_BY_TITLE.get(queueItem.proposalTitle);
    const executionPlanPreview = executionPlanPreviewsByProposalId.get(queueItem.proposalId);
    const hasArtifactPreview = executionArtifactPreviewTitles.has(queueItem.proposalTitle);
    const hasRequiredPlanEvidence =
      !matchedRule?.requirementsMet.includes("execution_plan_available") || executionPlanPreview != null;
    const hasRequiredArtifactEvidence =
      !matchedRule?.requirementsMet.includes("artifact_preview_available") || hasArtifactPreview;
    const rule = matchedRule && hasRequiredPlanEvidence && hasRequiredArtifactEvidence ? matchedRule : FALLBACK_READINESS_RULE;

    return {
      readinessId: `execution_readiness_${queueItem.proposalId}`,
      proposalId: queueItem.proposalId,
      proposalTitle: queueItem.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_readiness_preview_only",
      summary: rule.summary,
    };
  });
}
