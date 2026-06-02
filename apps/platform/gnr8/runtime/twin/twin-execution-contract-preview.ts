import type { TwinExecutionPackageReadinessRecord } from "@/gnr8/runtime/twin/twin-execution-package-readiness";

export type TwinExecutionContractPreviewState =
  | "contract_preview_ready"
  | "contract_preview_incomplete"
  | "contract_preview_blocked";

export interface TwinExecutionContractPreview {
  contractPreviewId: string;
  packageId: string;
  proposalId: string;
  proposalTitle: string;
  contractPreviewState: TwinExecutionContractPreviewState;
  readinessState: string;
  readinessScore: number;
  contractType:
    | "conversion_execution_contract"
    | "content_execution_contract"
    | "governance_validation_contract"
    | "future_execution_contract";
  contractScope: string[];
  requiredInputs: string[];
  blockedReasons: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_contract_preview_only";
  summary: string;
}

export const TWIN_EXECUTION_CONTRACT_PREVIEW_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_CONTRACT_PREVIEW_STARTED",
  COMPLETED: "TWIN_EXECUTION_CONTRACT_PREVIEW_COMPLETED",
} as const;

type ContractPreviewRule = Pick<
  TwinExecutionContractPreview,
  "contractPreviewState" | "contractType" | "contractScope" | "requiredInputs" | "blockedReasons" | "summary"
>;

const CONTRACT_PREVIEW_RULES_BY_TITLE = new Map<string, ContractPreviewRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      contractPreviewState: "contract_preview_incomplete",
      contractType: "conversion_execution_contract",
      contractScope: ["homepage", "primary_conversion_path"],
      requiredInputs: ["conversion_baseline", "design_evidence"],
      blockedReasons: [
        "missing_conversion_baseline",
        "missing_design_evidence",
        "governance_execution_blocked",
      ],
      summary:
        "Execution contract preview is incomplete because conversion baseline and design evidence are missing.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      contractPreviewState: "contract_preview_ready",
      contractType: "content_execution_contract",
      contractScope: ["homepage_hero", "homepage_messaging"],
      requiredInputs: ["design_evidence"],
      blockedReasons: ["missing_design_evidence", "governance_execution_blocked"],
      summary:
        "Execution contract preview is structurally ready for future content planning, but remains governance blocked.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      contractPreviewState: "contract_preview_ready",
      contractType: "governance_validation_contract",
      contractScope: ["runtime_governance"],
      requiredInputs: [],
      blockedReasons: ["governance_execution_blocked"],
      summary:
        "Execution contract preview is ready for future governance validation planning while remaining non-executable.",
    },
  ],
]);

const FALLBACK_CONTRACT_PREVIEW_RULE: ContractPreviewRule = {
  contractPreviewState: "contract_preview_blocked",
  contractType: "future_execution_contract",
  contractScope: [],
  requiredInputs: ["execution_package_requirements"],
  blockedReasons: ["unknown_contract_requirements", "governance_execution_blocked"],
  summary: "Execution contract preview cannot be assembled because contract requirements are unknown.",
};

export function generateTwinExecutionContractPreviews(
  packageReadinessRecords: TwinExecutionPackageReadinessRecord[],
): TwinExecutionContractPreview[] {
  return packageReadinessRecords.map((packageReadinessRecord) => {
    const rule = CONTRACT_PREVIEW_RULES_BY_TITLE.get(packageReadinessRecord.proposalTitle);
    const resolvedRule = rule ?? FALLBACK_CONTRACT_PREVIEW_RULE;
    const knownContractRequirements = rule != null;

    return {
      contractPreviewId: `execution_contract_preview_${packageReadinessRecord.proposalId}`,
      packageId: packageReadinessRecord.packageId,
      proposalId: packageReadinessRecord.proposalId,
      proposalTitle: packageReadinessRecord.proposalTitle,
      contractPreviewState: resolvedRule.contractPreviewState,
      readinessState: knownContractRequirements ? packageReadinessRecord.readinessState : "not_ready",
      readinessScore: knownContractRequirements ? packageReadinessRecord.readinessScore : 0,
      contractType: resolvedRule.contractType,
      contractScope: [...resolvedRule.contractScope],
      requiredInputs: [...resolvedRule.requiredInputs],
      blockedReasons: [...resolvedRule.blockedReasons],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_contract_preview_only",
      summary: resolvedRule.summary,
    };
  });
}
