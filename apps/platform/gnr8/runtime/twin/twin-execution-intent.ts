import type { TwinExecutionAuthorizationPackageRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-package";

export type TwinExecutionIntentState =
  | "intent_blocked"
  | "intent_ready_preview";

export interface TwinExecutionIntentRecord {
  proposalId: string;

  proposalTitle: string;

  intentState: TwinExecutionIntentState;

  readinessState: string;

  readinessScore: number;

  intentType: string;

  intendedActions: string[];

  blockedReasons: string[];

  executionAllowed: false;

  mutationAllowed: false;

  publishingAllowed: false;

  providerExecutionAllowed: false;

  governanceState: string;

  summary: string;
}

export const TWIN_EXECUTION_INTENT_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_INTENT_STARTED",
  COMPLETED: "TWIN_EXECUTION_INTENT_COMPLETED",
} as const;

type ExecutionIntentRule = Pick<
  TwinExecutionIntentRecord,
  "intentState" | "intentType" | "intendedActions" | "blockedReasons" | "summary"
>;

const CONVERSION_EXECUTION_INTENT_RULE: ExecutionIntentRule = {
  intentState: "intent_blocked",
  intentType: "conversion_improvement_intent",
  intendedActions: [
    "review_conversion_path",
    "prepare_homepage_conversion_changes",
  ],
  blockedReasons: [
    "missing_conversion_baseline",
    "missing_design_evidence",
    "governance_execution_blocked",
  ],
  summary:
    "Execution intent preview is blocked until conversion baseline and design evidence are available.",
};

const CONTENT_EXECUTION_INTENT_RULE: ExecutionIntentRule = {
  intentState: "intent_ready_preview",
  intentType: "content_improvement_intent",
  intendedActions: [
    "review_homepage_messaging",
    "prepare_homepage_copy_improvements",
  ],
  blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
  summary:
    "Execution intent preview is structurally ready for future content improvement review while execution remains blocked.",
};

const GOVERNANCE_EXECUTION_INTENT_RULE: ExecutionIntentRule = {
  intentState: "intent_ready_preview",
  intentType: "governance_validation_intent",
  intendedActions: [
    "maintain_read_only_runtime",
    "continue_governance_validation",
  ],
  blockedReasons: ["governance_execution_blocked"],
  summary:
    "Execution intent preview maintains read-only governance validation with execution disabled.",
};

const FALLBACK_EXECUTION_INTENT_RULE: ExecutionIntentRule = {
  intentState: "intent_blocked",
  intentType: "unknown_intent",
  intendedActions: [],
  blockedReasons: ["unknown_authorization_type", "governance_execution_blocked"],
  summary:
    "Execution intent preview is blocked because the authorization type is unknown.",
};

function resolveExecutionIntentRule(
  authorizationType: string,
): ExecutionIntentRule {
  if (authorizationType === "conversion_authorization") {
    return CONVERSION_EXECUTION_INTENT_RULE;
  }
  if (authorizationType === "content_authorization") {
    return CONTENT_EXECUTION_INTENT_RULE;
  }
  if (authorizationType === "governance_validation_authorization") {
    return GOVERNANCE_EXECUTION_INTENT_RULE;
  }
  return FALLBACK_EXECUTION_INTENT_RULE;
}

export function generateTwinExecutionIntentRecords(
  authorizationPackageRecords: TwinExecutionAuthorizationPackageRecord[],
): TwinExecutionIntentRecord[] {
  return authorizationPackageRecords.map((authorizationPackageRecord) => {
    const rule = resolveExecutionIntentRule(authorizationPackageRecord.authorizationType);

    return {
      proposalId: authorizationPackageRecord.proposalId,
      proposalTitle: authorizationPackageRecord.proposalTitle,
      intentState: rule.intentState,
      readinessState: authorizationPackageRecord.readinessState,
      readinessScore: authorizationPackageRecord.readinessScore,
      intentType: rule.intentType,
      intendedActions: [...rule.intendedActions],
      blockedReasons: [...rule.blockedReasons],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_intent_preview_only",
      summary: rule.summary,
    };
  });
}
