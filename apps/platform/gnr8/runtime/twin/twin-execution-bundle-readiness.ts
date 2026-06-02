import type { TwinExecutionBundlePreview } from "@/gnr8/runtime/twin/twin-execution-bundle-preview";

export type TwinExecutionBundleReadinessState =
  | "incomplete"
  | "nearly_ready"
  | "ready";

export interface TwinExecutionBundleReadinessRecord {
  proposalId: string;
  proposalTitle: string;
  readinessState: TwinExecutionBundleReadinessState;
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_bundle_readiness_preview_only";
  summary: string;
}

export const TWIN_EXECUTION_BUNDLE_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_BUNDLE_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_BUNDLE_READINESS_COMPLETED",
} as const;

type BundleReadinessRule = Pick<
  TwinExecutionBundleReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const BUNDLE_READINESS_RULES_BY_TITLE_FRAGMENT: Array<[string, BundleReadinessRule]> = [
  [
    "Conversion",
    {
      readinessState: "incomplete",
      readinessScore: 80,
      requirementsMet: [
        "execution_bundle_present",
        "contract_bundle_present",
        "artifact_bundle_present",
      ],
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      summary:
        "Execution bundle requires additional conversion evidence and design evidence before future authorization readiness.",
    },
  ],
  [
    "Messaging",
    {
      readinessState: "nearly_ready",
      readinessScore: 95,
      requirementsMet: [
        "execution_bundle_present",
        "contract_bundle_present",
        "artifact_bundle_present",
        "messaging_surface_identified",
      ],
      requirementsMissing: ["design_evidence"],
      summary:
        "Execution bundle is nearly ready but requires design evidence before future authorization readiness.",
    },
  ],
  [
    "Validation",
    {
      readinessState: "ready",
      readinessScore: 100,
      requirementsMet: [
        "execution_bundle_present",
        "governance_bundle_present",
        "validation_runtime_active",
      ],
      requirementsMissing: [],
      summary: "Execution bundle is fully prepared within current governance boundaries.",
    },
  ],
];

const FALLBACK_BUNDLE_READINESS_RULE: BundleReadinessRule = {
  readinessState: "incomplete",
  readinessScore: 50,
  requirementsMet: ["execution_bundle_present"],
  requirementsMissing: ["additional_bundle_evidence_required"],
  summary: "Execution bundle requires additional readiness evidence.",
};

function resolveBundleReadinessRule(proposalTitle: string): BundleReadinessRule {
  return (
    BUNDLE_READINESS_RULES_BY_TITLE_FRAGMENT.find(([titleFragment]) =>
      proposalTitle.includes(titleFragment),
    )?.[1] ?? FALLBACK_BUNDLE_READINESS_RULE
  );
}

export function generateTwinExecutionBundleReadinessRecords(
  bundlePreviews: TwinExecutionBundlePreview[],
): TwinExecutionBundleReadinessRecord[] {
  return bundlePreviews.map((bundlePreview) => {
    const rule = resolveBundleReadinessRule(bundlePreview.proposalTitle);

    return {
      proposalId: bundlePreview.proposalId,
      proposalTitle: bundlePreview.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_bundle_readiness_preview_only",
      summary: rule.summary,
    };
  });
}
