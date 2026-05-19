import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderOperationApprovalRequirement } from "@/gnr8/runtime/providers/runtime-provider-operation-approval";
import type { RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";

export type RuntimeProviderOperationApprovalArtifactRiskLevel = "low" | "medium" | "high" | "blocked";

export type RuntimeProviderOperationApprovalArtifact = {
  artifactId: string;
  siteId: string;
  siteVersionId?: string;
  providerId: RuntimeProviderOperationBundle["providerId"];
  environment: RuntimeProviderOperationBundle["environment"];
  capability: RuntimeProviderOperationBundle["capability"];
  operationKind: RuntimeProviderOperationBundle["operationKind"];
  bundleStatus: RuntimeProviderOperationBundle["bundleStatus"];
  approvalStatus: RuntimeProviderOperationApprovalRequirement["approvalStatus"];
  requiredApprovals: string[];
  summary: string;
  riskLevel: RuntimeProviderOperationApprovalArtifactRiskLevel;
  reviewerChecklist: string[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

const REVIEWER_CHECKLIST: string[] = [
  "verify_provider",
  "verify_environment",
  "verify_operation_kind",
  "verify_required_approvals",
  "verify_no_live_execution",
];

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function resolveRiskLevel(
  bundle: RuntimeProviderOperationBundle,
  approvalRequirement: RuntimeProviderOperationApprovalRequirement,
): RuntimeProviderOperationApprovalArtifactRiskLevel {
  if (approvalRequirement.approvalStatus === "blocked") return "blocked";
  if (bundle.environment === "live") return "blocked";
  if (bundle.operationKind === "purchase_domain") return "high";
  if (bundle.operationKind === "activate_domain_binding") return "medium";
  if (bundle.providerId === "manual" || bundle.providerId === "mock_provider") return "low";
  return "low";
}

export function createRuntimeProviderOperationApprovalArtifact(
  bundle: RuntimeProviderOperationBundle,
  approvalRequirement: RuntimeProviderOperationApprovalRequirement,
): RuntimeProviderOperationApprovalArtifact {
  const requiredApprovals = uniqueSorted(approvalRequirement.requiredApprovals);
  const warnings = uniqueSorted([...bundle.warnings, ...approvalRequirement.warnings]);
  const blockers = uniqueSorted([...bundle.blockers, ...approvalRequirement.blockers]);
  const reviewerChecklist = [...REVIEWER_CHECKLIST];
  const riskLevel = resolveRiskLevel(bundle, approvalRequirement);

  const correlationKey = createRuntimeCorrelationKey({
    bundleCorrelationKey: bundle.correlationKey,
    approvalRequirementCorrelationKey: approvalRequirement.correlationKey,
    siteId: bundle.siteId,
    siteVersionId: bundle.siteVersionId ?? "",
    providerId: bundle.providerId,
    environment: bundle.environment,
    capability: bundle.capability,
    operationKind: bundle.operationKind,
    bundleStatus: bundle.bundleStatus,
    approvalStatus: approvalRequirement.approvalStatus,
    requiredApprovals: requiredApprovals.join(","),
    reviewerChecklist: reviewerChecklist.join(","),
    warnings: warnings.join(","),
    blockers: blockers.join(","),
    riskLevel,
  });

  const artifactId = createRuntimeCorrelationKey({
    approvalArtifactCorrelationKey: correlationKey,
  });

  const summary = [
    `provider=${bundle.providerId}`,
    `environment=${bundle.environment}`,
    `operation=${bundle.operationKind}`,
    `bundle=${bundle.bundleStatus}`,
    `approval=${approvalRequirement.approvalStatus}`,
    `risk=${riskLevel}`,
  ].join("; ");

  return {
    artifactId,
    siteId: bundle.siteId,
    siteVersionId: bundle.siteVersionId,
    providerId: bundle.providerId,
    environment: bundle.environment,
    capability: bundle.capability,
    operationKind: bundle.operationKind,
    bundleStatus: bundle.bundleStatus,
    approvalStatus: approvalRequirement.approvalStatus,
    requiredApprovals,
    summary,
    riskLevel,
    reviewerChecklist,
    warnings,
    blockers,
    correlationKey,
  };
}
