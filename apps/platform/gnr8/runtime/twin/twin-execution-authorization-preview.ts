import type { TwinExecutionBundleReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-bundle-readiness";

export type TwinExecutionAuthorizationPreviewState =
  | "authorization_preview_incomplete"
  | "authorization_preview_ready";

export interface TwinExecutionAuthorizationPreviewRecord {
  proposalId: string;
  proposalTitle: string;

  authorizationPreviewState: TwinExecutionAuthorizationPreviewState;

  readinessState: string;
  readinessScore: number;

  authorizationType: string;

  requiredAuthorizations: string[];
  blockedReasons: string[];

  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;

  governanceState: "execution_authorization_preview_only";

  summary: string;
}

export const TWIN_EXECUTION_AUTHORIZATION_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_AUTHORIZATION_PREVIEW_STARTED",
  COMPLETED: "TWIN_EXECUTION_AUTHORIZATION_PREVIEW_COMPLETED",
} as const;

type AuthorizationPreviewRule = Pick<
  TwinExecutionAuthorizationPreviewRecord,
  | "authorizationPreviewState"
  | "authorizationType"
  | "requiredAuthorizations"
  | "blockedReasons"
  | "summary"
>;

const AUTHORIZATION_PREVIEW_RULES_BY_TITLE_FRAGMENT: Array<[string, AuthorizationPreviewRule]> = [
  [
    "Conversion",
    {
      authorizationPreviewState: "authorization_preview_incomplete",
      authorizationType: "conversion_authorization",
      requiredAuthorizations: [
        "operator_review",
        "conversion_baseline_review",
        "design_review",
      ],
      blockedReasons: [
        "missing_conversion_baseline",
        "missing_design_evidence",
        "governance_execution_blocked",
      ],
      summary:
        "Authorization preview requires conversion baseline review and design review before future execution authorization.",
    },
  ],
  [
    "Messaging",
    {
      authorizationPreviewState: "authorization_preview_ready",
      authorizationType: "content_authorization",
      requiredAuthorizations: ["operator_review", "design_review"],
      blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
      summary:
        "Authorization preview is structurally ready but remains blocked by design evidence and governance restrictions.",
    },
  ],
  [
    "Validation",
    {
      authorizationPreviewState: "authorization_preview_ready",
      authorizationType: "governance_validation_authorization",
      requiredAuthorizations: ["operator_review"],
      blockedReasons: ["governance_execution_blocked"],
      summary:
        "Authorization preview is prepared for future governance validation review while remaining non-executable.",
    },
  ],
];

const FALLBACK_AUTHORIZATION_PREVIEW_RULE: AuthorizationPreviewRule = {
  authorizationPreviewState: "authorization_preview_incomplete",
  authorizationType: "generic_authorization",
  requiredAuthorizations: ["operator_review"],
  blockedReasons: ["additional_authorization_evidence_required"],
  summary: "Authorization preview requires additional authorization evidence.",
};

function resolveAuthorizationPreviewRule(proposalTitle: string): AuthorizationPreviewRule {
  return (
    AUTHORIZATION_PREVIEW_RULES_BY_TITLE_FRAGMENT.find(([titleFragment]) =>
      proposalTitle.includes(titleFragment),
    )?.[1] ?? FALLBACK_AUTHORIZATION_PREVIEW_RULE
  );
}

export function generateTwinExecutionAuthorizationPreviewRecords(
  bundleReadinessRecords: TwinExecutionBundleReadinessRecord[],
): TwinExecutionAuthorizationPreviewRecord[] {
  return bundleReadinessRecords.map((bundleReadinessRecord) => {
    const rule = resolveAuthorizationPreviewRule(bundleReadinessRecord.proposalTitle);

    return {
      proposalId: bundleReadinessRecord.proposalId,
      proposalTitle: bundleReadinessRecord.proposalTitle,
      authorizationPreviewState: rule.authorizationPreviewState,
      readinessState: bundleReadinessRecord.readinessState,
      readinessScore: bundleReadinessRecord.readinessScore,
      authorizationType: rule.authorizationType,
      requiredAuthorizations: [...rule.requiredAuthorizations],
      blockedReasons: [...rule.blockedReasons],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_authorization_preview_only",
      summary: rule.summary,
    };
  });
}
