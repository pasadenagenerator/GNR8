import type { TwinExecutionContractPreview } from "@/gnr8/runtime/twin/twin-execution-contract-preview";

export type TwinExecutionContractReadinessState = "not_ready" | "nearly_ready" | "ready";

export interface TwinExecutionContractReadinessRecord {
  contractPreviewId: string;
  proposalId: string;
  proposalTitle: string;
  readinessState: TwinExecutionContractReadinessState;
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_contract_readiness_preview_only";
  summary: string;
}

export const TWIN_EXECUTION_CONTRACT_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_CONTRACT_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_CONTRACT_READINESS_COMPLETED",
} as const;

type ContractReadinessRule = Pick<
  TwinExecutionContractReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const CONTRACT_READINESS_RULES_BY_TITLE = new Map<string, ContractReadinessRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      readinessState: "not_ready",
      readinessScore: 70,
      requirementsMet: [
        "contract_preview_present",
        "contract_scope_defined",
        "execution_package_available",
      ],
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      summary:
        "Execution contract readiness remains blocked until conversion baseline and design evidence are available.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      readinessState: "nearly_ready",
      readinessScore: 90,
      requirementsMet: [
        "contract_preview_present",
        "contract_scope_defined",
        "content_plan_available",
        "execution_package_available",
      ],
      requirementsMissing: ["design_evidence"],
      summary: "Execution contract readiness is nearly complete but requires design evidence.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      readinessState: "ready",
      readinessScore: 100,
      requirementsMet: [
        "contract_preview_present",
        "governance_boundary_present",
        "validation_runtime_active",
      ],
      requirementsMissing: [],
      summary: "Execution contract readiness is complete within current governance boundaries.",
    },
  ],
]);

const FALLBACK_CONTRACT_READINESS_RULE: ContractReadinessRule = {
  readinessState: "not_ready",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: ["contract_requirements_unknown"],
  summary: "Execution contract readiness cannot be evaluated because contract requirements are unknown.",
};

export function generateTwinExecutionContractReadinessRecords(
  contractPreviews: TwinExecutionContractPreview[],
): TwinExecutionContractReadinessRecord[] {
  return contractPreviews.map((contractPreview) => {
    const rule =
      CONTRACT_READINESS_RULES_BY_TITLE.get(contractPreview.proposalTitle) ??
      FALLBACK_CONTRACT_READINESS_RULE;

    return {
      contractPreviewId: contractPreview.contractPreviewId,
      proposalId: contractPreview.proposalId,
      proposalTitle: contractPreview.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_contract_readiness_preview_only",
      summary: rule.summary,
    };
  });
}
