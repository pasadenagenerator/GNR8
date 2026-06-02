import type { TwinExecutionContractReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-contract-readiness";

export type TwinExecutionBundlePreviewState = "bundle_incomplete" | "bundle_ready";

export interface TwinExecutionBundlePreview {
  bundleId: string;
  proposalId: string;
  proposalTitle: string;
  bundleState: TwinExecutionBundlePreviewState;
  readinessState: string;
  readinessScore: number;
  includedComponents: string[];
  missingComponents: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_bundle_preview_only";
  summary: string;
}

export const TWIN_EXECUTION_BUNDLE_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_BUNDLE_PREVIEW_STARTED",
  COMPLETED: "TWIN_EXECUTION_BUNDLE_PREVIEW_COMPLETED",
} as const;

type BundlePreviewRule = Pick<
  TwinExecutionBundlePreview,
  "bundleState" | "includedComponents" | "missingComponents" | "summary"
>;

const BASE_INCLUDED_COMPONENTS = [
  "proposal",
  "approval",
  "queue",
  "execution_package",
  "execution_contract",
];

const BUNDLE_PREVIEW_RULES_BY_TITLE = new Map<string, BundlePreviewRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      bundleState: "bundle_incomplete",
      includedComponents: BASE_INCLUDED_COMPONENTS,
      missingComponents: ["conversion_baseline", "design_evidence"],
      summary:
        "Execution bundle is incomplete because required conversion evidence is unavailable.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      bundleState: "bundle_ready",
      includedComponents: BASE_INCLUDED_COMPONENTS,
      missingComponents: ["design_evidence"],
      summary:
        "Execution bundle structure is ready for future planning but remains governance blocked.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      bundleState: "bundle_ready",
      includedComponents: BASE_INCLUDED_COMPONENTS,
      missingComponents: [],
      summary:
        "Execution bundle is complete within current governance validation boundaries.",
    },
  ],
]);

const FALLBACK_BUNDLE_PREVIEW_RULE: BundlePreviewRule = {
  bundleState: "bundle_incomplete",
  includedComponents: [],
  missingComponents: ["bundle_requirements_unknown"],
  summary:
    "Execution bundle cannot be assembled because required bundle components are unknown.",
};

export function generateTwinExecutionBundlePreviews(
  contractReadinessRecords: TwinExecutionContractReadinessRecord[],
): TwinExecutionBundlePreview[] {
  return contractReadinessRecords.map((contractReadinessRecord) => {
    const rule = BUNDLE_PREVIEW_RULES_BY_TITLE.get(contractReadinessRecord.proposalTitle);
    const resolvedRule = rule ?? FALLBACK_BUNDLE_PREVIEW_RULE;

    return {
      bundleId: `execution_bundle_preview_${contractReadinessRecord.proposalId}`,
      proposalId: contractReadinessRecord.proposalId,
      proposalTitle: contractReadinessRecord.proposalTitle,
      bundleState: resolvedRule.bundleState,
      readinessState: contractReadinessRecord.readinessState,
      readinessScore: rule != null ? contractReadinessRecord.readinessScore : 0,
      includedComponents: [...resolvedRule.includedComponents],
      missingComponents: [...resolvedRule.missingComponents],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_bundle_preview_only",
      summary: resolvedRule.summary,
    };
  });
}
