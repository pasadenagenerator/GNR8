import type { TwinExecutionPlanPreview } from "@/gnr8/runtime/twin/twin-execution-plan-preview";

export type ExecutionPlanReadinessState = "ready" | "nearly_ready" | "incomplete" | "not_ready";

export interface ExecutionPlanReadinessRecord {
  proposalId: string;
  proposalTitle: string;
  readinessState: ExecutionPlanReadinessState;
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  executionPlanPresent: boolean;
  planningArtifactsPresent: boolean;
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_plan_readiness_preview_only";
  summary: string;
}

export type TwinExecutionPlanReadinessRecord = ExecutionPlanReadinessRecord;

export const TWIN_EXECUTION_PLAN_READINESS_DIAGNOSTICS = {
  CREATED: "TWIN_EXECUTION_PLAN_READINESS_CREATED",
  FALLBACK_APPLIED: "TWIN_EXECUTION_PLAN_READINESS_FALLBACK_APPLIED",
} as const;

type ExecutionPlanReadinessRule = Pick<
  ExecutionPlanReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const PLAN_READINESS_RULES_BY_TITLE = new Map<string, ExecutionPlanReadinessRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      readinessState: "incomplete",
      readinessScore: 80,
      requirementsMet: [
        "execution_plan_present",
        "planning_artifacts_present",
        "conversion_plan_defined",
      ],
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      summary:
        "Execution plan readiness is incomplete because conversion baseline and design evidence are still missing.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      readinessState: "nearly_ready",
      readinessScore: 90,
      requirementsMet: [
        "execution_plan_present",
        "planning_artifacts_present",
        "content_plan_defined",
        "homepage_messaging_scope_defined",
      ],
      requirementsMissing: ["design_evidence"],
      summary: "Execution plan readiness is nearly complete but still requires design evidence.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      readinessState: "ready",
      readinessScore: 100,
      requirementsMet: [
        "execution_plan_present",
        "planning_artifacts_present",
        "governance_boundary_present",
        "validation_runtime_active",
      ],
      requirementsMissing: [],
      summary: "Execution plan readiness is complete within current read-only governance boundaries.",
    },
  ],
]);

const FALLBACK_PLAN_READINESS_RULE: ExecutionPlanReadinessRule = {
  readinessState: "not_ready",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: ["execution_plan_readiness_requirements_unknown"],
  summary: "Execution plan readiness requirements could not be determined.",
};

function hasPlanningArtifacts(executionPlanPreview: TwinExecutionPlanPreview): boolean {
  return (
    executionPlanPreview.plannedActions.length > 0 &&
    !executionPlanPreview.plannedActions.includes("future_execution_plan_required")
  );
}

function resolveExecutionPlanReadinessRule(
  executionPlanPreview: TwinExecutionPlanPreview,
): ExecutionPlanReadinessRule {
  const rule = PLAN_READINESS_RULES_BY_TITLE.get(executionPlanPreview.proposalTitle);
  if (!rule || !hasPlanningArtifacts(executionPlanPreview)) return FALLBACK_PLAN_READINESS_RULE;
  return rule;
}

export function generateTwinExecutionPlanReadinessRecords(
  executionPlanPreviews: TwinExecutionPlanPreview[],
): ExecutionPlanReadinessRecord[] {
  return executionPlanPreviews.map((executionPlanPreview) => {
    const rule = resolveExecutionPlanReadinessRule(executionPlanPreview);

    return {
      proposalId: executionPlanPreview.proposalId,
      proposalTitle: executionPlanPreview.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionPlanPresent: true,
      planningArtifactsPresent: rule !== FALLBACK_PLAN_READINESS_RULE,
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_plan_readiness_preview_only",
      summary: rule.summary,
    };
  });
}

export const generateExecutionPlanReadinessRecords = generateTwinExecutionPlanReadinessRecords;

export function hasExecutionPlanReadinessFallbackApplied(
  records: ExecutionPlanReadinessRecord[],
): boolean {
  return records.some((record) => record.readinessState === FALLBACK_PLAN_READINESS_RULE.readinessState);
}
