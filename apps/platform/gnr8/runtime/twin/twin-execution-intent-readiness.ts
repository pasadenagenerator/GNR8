import type { TwinExecutionIntentRecord } from "@/gnr8/runtime/twin/twin-execution-intent";

export type TwinExecutionIntentReadinessState =
  | "intent_not_ready"
  | "intent_nearly_ready"
  | "intent_ready_preview";

export interface TwinExecutionIntentReadinessRecord {
  proposalId: string;

  proposalTitle: string;

  readinessState: TwinExecutionIntentReadinessState;

  readinessScore: number;

  requirementsMet: string[];

  requirementsMissing: string[];

  executionAllowed: false;

  mutationAllowed: false;

  publishingAllowed: false;

  providerExecutionAllowed: false;

  governanceState: string;

  summary: string;
}

export const TWIN_EXECUTION_INTENT_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_INTENT_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_INTENT_READINESS_COMPLETED",
} as const;

type ExecutionIntentReadinessRule = Pick<
  TwinExecutionIntentReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const CONVERSION_INTENT_READINESS_RULE: ExecutionIntentReadinessRule = {
  readinessState: "intent_not_ready",
  readinessScore: 80,
  requirementsMet: [
    "execution_intent_present",
    "conversion_intent_defined",
  ],
  requirementsMissing: [
    "conversion_baseline",
    "design_evidence",
  ],
  summary:
    "Execution intent readiness remains blocked until conversion baseline and design evidence become available.",
};

const CONTENT_INTENT_READINESS_RULE: ExecutionIntentReadinessRule = {
  readinessState: "intent_nearly_ready",
  readinessScore: 95,
  requirementsMet: [
    "execution_intent_present",
    "content_intent_defined",
    "homepage_messaging_scope_defined",
  ],
  requirementsMissing: ["design_evidence"],
  summary:
    "Execution intent readiness is nearly complete but still requires design evidence.",
};

const GOVERNANCE_INTENT_READINESS_RULE: ExecutionIntentReadinessRule = {
  readinessState: "intent_ready_preview",
  readinessScore: 100,
  requirementsMet: [
    "execution_intent_present",
    "governance_intent_defined",
    "validation_runtime_active",
  ],
  requirementsMissing: [],
  summary:
    "Execution intent readiness is complete within current governance boundaries.",
};

const FALLBACK_INTENT_READINESS_RULE: ExecutionIntentReadinessRule = {
  readinessState: "intent_not_ready",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: [
    "unknown_intent_type",
    "governance_execution_blocked",
  ],
  summary: "Execution intent readiness could not be determined.",
};

function resolveExecutionIntentReadinessRule(
  intentType: string,
): ExecutionIntentReadinessRule {
  if (intentType === "conversion_improvement_intent") {
    return CONVERSION_INTENT_READINESS_RULE;
  }
  if (intentType === "content_improvement_intent") {
    return CONTENT_INTENT_READINESS_RULE;
  }
  if (intentType === "governance_validation_intent") {
    return GOVERNANCE_INTENT_READINESS_RULE;
  }
  return FALLBACK_INTENT_READINESS_RULE;
}

export function generateTwinExecutionIntentReadinessRecords(
  executionIntentRecords: TwinExecutionIntentRecord[],
): TwinExecutionIntentReadinessRecord[] {
  return executionIntentRecords.map((executionIntentRecord) => {
    const rule = resolveExecutionIntentReadinessRule(executionIntentRecord.intentType);

    return {
      proposalId: executionIntentRecord.proposalId,
      proposalTitle: executionIntentRecord.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_intent_readiness_preview_only",
      summary: rule.summary,
    };
  });
}
