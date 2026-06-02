import type { TwinExecutionAuthorizationPreviewRecord } from "@/gnr8/runtime/twin/twin-execution-authorization-preview";

export type TwinExecutionAuthorizationReadinessState =
  | "not_ready"
  | "nearly_ready"
  | "ready";

export interface TwinExecutionAuthorizationReadinessRecord {
  proposalId: string;
  proposalTitle: string;

  readinessState: TwinExecutionAuthorizationReadinessState;
  readinessScore: number;

  requirementsMet: string[];
  requirementsMissing: string[];

  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;

  governanceState: "execution_authorization_readiness_preview_only";

  summary: string;
}

export const TWIN_EXECUTION_AUTHORIZATION_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED",
} as const;

type AuthorizationReadinessRule = Pick<
  TwinExecutionAuthorizationReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const AUTHORIZATION_READINESS_INCOMPLETE_RULE: AuthorizationReadinessRule = {
  readinessState: "not_ready",
  readinessScore: 85,
  requirementsMet: ["authorization_preview_present", "authorization_scope_defined"],
  requirementsMissing: ["conversion_baseline", "design_evidence"],
  summary:
    "Execution authorization readiness remains blocked until conversion baseline and design evidence become available.",
};

const AUTHORIZATION_READINESS_NEARLY_READY_RULE: AuthorizationReadinessRule = {
  readinessState: "nearly_ready",
  readinessScore: 95,
  requirementsMet: [
    "authorization_preview_present",
    "authorization_scope_defined",
    "authorization_package_available",
  ],
  requirementsMissing: ["design_evidence"],
  summary:
    "Execution authorization readiness is nearly complete but still requires design evidence.",
};

const AUTHORIZATION_READINESS_READY_RULE: AuthorizationReadinessRule = {
  readinessState: "ready",
  readinessScore: 100,
  requirementsMet: [
    "authorization_preview_present",
    "governance_boundary_present",
    "validation_runtime_active",
  ],
  requirementsMissing: [],
  summary: "Execution authorization readiness is complete within current governance boundaries.",
};

const FALLBACK_AUTHORIZATION_READINESS_RULE: AuthorizationReadinessRule = {
  readinessState: "not_ready",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: ["authorization_preview_missing"],
  summary: "Execution authorization readiness could not be determined.",
};

function resolveAuthorizationReadinessRule(
  authorizationPreview: TwinExecutionAuthorizationPreviewRecord,
): AuthorizationReadinessRule {
  if (authorizationPreview.authorizationPreviewState === "authorization_preview_incomplete") {
    return AUTHORIZATION_READINESS_INCOMPLETE_RULE;
  }
  if (
    authorizationPreview.authorizationPreviewState === "authorization_preview_ready" &&
    authorizationPreview.readinessState === "nearly_ready"
  ) {
    return AUTHORIZATION_READINESS_NEARLY_READY_RULE;
  }
  if (
    authorizationPreview.authorizationPreviewState === "authorization_preview_ready" &&
    authorizationPreview.readinessState === "ready"
  ) {
    return AUTHORIZATION_READINESS_READY_RULE;
  }
  return FALLBACK_AUTHORIZATION_READINESS_RULE;
}

export function generateTwinExecutionAuthorizationReadinessRecords(
  authorizationPreviews: TwinExecutionAuthorizationPreviewRecord[],
): TwinExecutionAuthorizationReadinessRecord[] {
  return authorizationPreviews.map((authorizationPreview) => {
    const rule = resolveAuthorizationReadinessRule(authorizationPreview);

    return {
      proposalId: authorizationPreview.proposalId,
      proposalTitle: authorizationPreview.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_authorization_readiness_preview_only",
      summary: rule.summary,
    };
  });
}
