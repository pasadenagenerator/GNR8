import type { TwinExecutionPackagePreview } from "@/gnr8/runtime/twin/twin-execution-package-preview";

export type TwinExecutionPackageReadinessState = "incomplete" | "nearly_ready" | "ready";

export interface TwinExecutionPackageReadinessRecord {
  packageId: string;
  proposalId: string;
  proposalTitle: string;
  readinessState: TwinExecutionPackageReadinessState;
  readinessScore: number;
  requirementsMet: string[];
  requirementsMissing: string[];
  executionAllowed: false;
  mutationAllowed: false;
  publishingAllowed: false;
  providerExecutionAllowed: false;
  governanceState: "execution_package_readiness_preview_only";
  summary: string;
}

export const TWIN_EXECUTION_PACKAGE_READINESS_DIAGNOSTICS = {
  STARTED: "TWIN_EXECUTION_PACKAGE_READINESS_STARTED",
  COMPLETED: "TWIN_EXECUTION_PACKAGE_READINESS_COMPLETED",
} as const;

type PackageReadinessRule = Pick<
  TwinExecutionPackageReadinessRecord,
  "readinessState" | "readinessScore" | "requirementsMet" | "requirementsMissing" | "summary"
>;

const PACKAGE_READINESS_RULES_BY_TITLE = new Map<string, PackageReadinessRule>([
  [
    "Improve Homepage Conversion Flow",
    {
      readinessState: "incomplete",
      readinessScore: 70,
      requirementsMet: ["execution_package_present", "planning_artifacts_present", "homepage_detected"],
      requirementsMissing: ["conversion_baseline", "design_evidence"],
      summary:
        "Execution package is incomplete because additional conversion evidence and design evidence are required.",
    },
  ],
  [
    "Improve Homepage Quality and Messaging",
    {
      readinessState: "nearly_ready",
      readinessScore: 90,
      requirementsMet: [
        "execution_package_present",
        "planning_artifacts_present",
        "messaging_surface_identified",
        "homepage_detected",
      ],
      requirementsMissing: ["design_evidence"],
      summary: "Execution package is nearly ready but requires additional design evidence.",
    },
  ],
  [
    "Maintain Read-Only Validation Mode",
    {
      readinessState: "ready",
      readinessScore: 100,
      requirementsMet: [
        "execution_package_present",
        "governance_boundary_present",
        "validation_runtime_active",
      ],
      requirementsMissing: [],
      summary: "Execution package is fully prepared within current governance boundaries.",
    },
  ],
]);

const FALLBACK_PACKAGE_READINESS_RULE: PackageReadinessRule = {
  readinessState: "incomplete",
  readinessScore: 0,
  requirementsMet: [],
  requirementsMissing: ["package_requirements_unknown"],
  summary: "Execution package readiness requirements could not be determined.",
};

export function generateTwinExecutionPackageReadinessRecords(
  packagePreviews: TwinExecutionPackagePreview[],
): TwinExecutionPackageReadinessRecord[] {
  return packagePreviews.map((packagePreview) => {
    const rule = PACKAGE_READINESS_RULES_BY_TITLE.get(packagePreview.proposalTitle) ?? FALLBACK_PACKAGE_READINESS_RULE;

    return {
      packageId: packagePreview.packageId,
      proposalId: packagePreview.proposalId,
      proposalTitle: packagePreview.proposalTitle,
      readinessState: rule.readinessState,
      readinessScore: rule.readinessScore,
      requirementsMet: [...rule.requirementsMet],
      requirementsMissing: [...rule.requirementsMissing],
      executionAllowed: false,
      mutationAllowed: false,
      publishingAllowed: false,
      providerExecutionAllowed: false,
      governanceState: "execution_package_readiness_preview_only",
      summary: rule.summary,
    };
  });
}
