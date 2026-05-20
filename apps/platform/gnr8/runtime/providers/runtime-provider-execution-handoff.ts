import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderOperationApprovalRequirement } from "@/gnr8/runtime/providers/runtime-provider-operation-approval";
import type { RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";

export type RuntimeProviderExecutionHandoffArtifact = {
  handoffId: string;
  artifactId: string;
  siteId: string;
  siteVersionId?: string;
  providerId: string;
  environment: string;
  capability: string;
  operationKind: string;
  approvalStatus: string;
  riskLevel: string;
  handoffStatus: "ready" | "blocked";
  plannedJobIds: string[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

type ApprovalArtifactLike = {
  artifactId: string;
  siteId: string;
  siteVersionId?: string;
  providerId: string;
  environment: string;
  capability: string;
  operationKind: string;
  approvalStatus: string;
  riskLevel: string;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sortPlannedJobIds(bundle: RuntimeProviderOperationBundle): string[] {
  return [...bundle.plannedJobs]
    .map((job) => String(job.id))
    .sort((a, b) => a.localeCompare(b));
}

function resolveHandoffStatus(input: {
  approvalStatus: string;
  bundleStatus: RuntimeProviderOperationBundle["bundleStatus"];
  environment: string;
}): RuntimeProviderExecutionHandoffArtifact["handoffStatus"] {
  if (input.approvalStatus !== "approved") return "blocked";
  if (input.bundleStatus === "blocked") return "blocked";
  if (input.environment === "live") return "blocked";
  return "ready";
}

export function createRuntimeProviderExecutionHandoffArtifact(
  approvalArtifact: ApprovalArtifactLike,
  approvalRequirement: RuntimeProviderOperationApprovalRequirement,
  bundle: RuntimeProviderOperationBundle,
): RuntimeProviderExecutionHandoffArtifact {
  const plannedJobIds = sortPlannedJobIds(bundle);
  const warnings = uniqueSorted([...approvalArtifact.warnings, ...approvalRequirement.warnings, ...bundle.warnings]);
  const blockers = uniqueSorted([...approvalArtifact.blockers, ...approvalRequirement.blockers, ...bundle.blockers]);

  const handoffStatus = resolveHandoffStatus({
    approvalStatus: approvalArtifact.approvalStatus,
    bundleStatus: bundle.bundleStatus,
    environment: approvalArtifact.environment,
  });

  const correlationKey = createRuntimeCorrelationKey({
    approvalArtifactCorrelationKey: approvalArtifact.correlationKey,
    approvalRequirementCorrelationKey: approvalRequirement.correlationKey,
    bundleCorrelationKey: bundle.correlationKey,
    artifactId: approvalArtifact.artifactId,
    siteId: approvalArtifact.siteId,
    siteVersionId: approvalArtifact.siteVersionId ?? "",
    providerId: approvalArtifact.providerId,
    environment: approvalArtifact.environment,
    capability: approvalArtifact.capability,
    operationKind: approvalArtifact.operationKind,
    approvalStatus: approvalArtifact.approvalStatus,
    riskLevel: approvalArtifact.riskLevel,
    bundleStatus: bundle.bundleStatus,
    handoffStatus,
    plannedJobIds: plannedJobIds.join(","),
    warnings: warnings.join(","),
    blockers: blockers.join(","),
  });

  const handoffId = createRuntimeCorrelationKey({
    handoffArtifactCorrelationKey: correlationKey,
  });

  return {
    handoffId,
    artifactId: approvalArtifact.artifactId,
    siteId: approvalArtifact.siteId,
    siteVersionId: approvalArtifact.siteVersionId,
    providerId: approvalArtifact.providerId,
    environment: approvalArtifact.environment,
    capability: approvalArtifact.capability,
    operationKind: approvalArtifact.operationKind,
    approvalStatus: approvalArtifact.approvalStatus,
    riskLevel: approvalArtifact.riskLevel,
    handoffStatus,
    plannedJobIds,
    warnings,
    blockers,
    correlationKey,
  };
}
