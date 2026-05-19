import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";

export type RuntimeProviderOperationApprovalRequirement = {
  approvalStatus: "not_required" | "required" | "blocked";
  requiredApprovals: string[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function listOperationKinds(bundle: RuntimeProviderOperationBundle): string[] {
  const plannedOperationKinds = bundle.plannedJobs.map((job) => String(job.operationKind));
  return uniqueSorted([String(bundle.operationKind), ...plannedOperationKinds]);
}

export function createRuntimeProviderOperationApprovalRequirement(
  bundle: RuntimeProviderOperationBundle,
): RuntimeProviderOperationApprovalRequirement {
  const requiredApprovals: string[] = [];
  const warnings = [...bundle.warnings];
  const blockers = [...bundle.blockers];

  if (bundle.providerId === "manual") requiredApprovals.push("manual_provider_action");
  if (bundle.providerId === "mock_provider") requiredApprovals.push("sandbox_provider_action");

  const operationKinds = listOperationKinds(bundle);
  if (operationKinds.includes("purchase_domain")) requiredApprovals.push("domain_purchase");
  if (operationKinds.includes("delete_dns_record")) requiredApprovals.push("dns_delete");
  if (operationKinds.includes("activate_domain_binding")) requiredApprovals.push("domain_activation");

  if (bundle.environment === "live") {
    blockers.push("live_environment_provider_execution_blocked");
  }

  const approvalList = uniqueSorted(requiredApprovals);
  const uniqueWarnings = uniqueSorted(warnings);
  const uniqueBlockers = uniqueSorted(blockers);

  let approvalStatus: RuntimeProviderOperationApprovalRequirement["approvalStatus"] = "not_required";
  if (bundle.bundleStatus === "blocked" || bundle.environment === "live" || uniqueBlockers.length > 0) {
    approvalStatus = "blocked";
  } else if (approvalList.length > 0) {
    approvalStatus = "required";
  }

  const correlationKey = createRuntimeCorrelationKey({
    bundleCorrelationKey: bundle.correlationKey,
    bundleStatus: bundle.bundleStatus,
    providerId: bundle.providerId,
    environment: bundle.environment,
    operationKinds: operationKinds.join(","),
    requiredApprovals: approvalList.join(","),
    warnings: uniqueWarnings.join(","),
    blockers: uniqueBlockers.join(","),
    approvalStatus,
  });

  return {
    approvalStatus,
    requiredApprovals: approvalList,
    warnings: uniqueWarnings,
    blockers: uniqueBlockers,
    correlationKey,
  };
}
