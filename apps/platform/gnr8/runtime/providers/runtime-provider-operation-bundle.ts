import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { ProviderExecutionGateReport } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { RuntimeDomainExecutionDryRun } from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type {
  RuntimeDomainExecutionActionKind,
  RuntimeDomainExecutionIntent,
} from "@/gnr8/runtime/domains/runtime-domain-execution-intent";
import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";
import type { AgencyProviderCapability, AgencyProviderEnvironment, AgencyProviderId } from "@/gnr8/runtime/providers/agency-provider-settings";
import type { AgencyProviderSelection } from "@/gnr8/runtime/providers/agency-provider-selection";
import type { ProviderCredentialResolutionReport } from "@/gnr8/runtime/providers/provider-credential-resolution";
import type { RuntimeProviderCommunicatorResult } from "@/gnr8/runtime/providers/runtime-provider-communicator";

export type RuntimeProviderOperationBundleStatus = "ready_for_manual" | "ready_for_mock" | "blocked";

export type RuntimeProviderOperationBundle = {
  siteId: string;
  siteVersionId?: string;
  providerId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  capability: AgencyProviderCapability;
  operationKind: RuntimeDomainExecutionActionKind;
  providerSelection: AgencyProviderSelection;
  credentialResolution?: ProviderCredentialResolutionReport;
  communicatorResult: RuntimeProviderCommunicatorResult;
  executionIntent: RuntimeDomainExecutionIntent;
  executionDryRun: RuntimeDomainExecutionDryRun;
  executionGate: ProviderExecutionGateReport;
  plannedJobs: RuntimeProviderJob[];
  bundleStatus: RuntimeProviderOperationBundleStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type CreateRuntimeProviderOperationBundleInput = {
  siteId: string;
  siteVersionId?: string;
  providerId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  capability: AgencyProviderCapability;
  operationKind: RuntimeDomainExecutionActionKind;
  providerSelection: AgencyProviderSelection;
  credentialResolution?: ProviderCredentialResolutionReport;
  communicatorResult: RuntimeProviderCommunicatorResult;
  executionIntent: RuntimeDomainExecutionIntent;
  executionDryRun: RuntimeDomainExecutionDryRun;
  executionGate: ProviderExecutionGateReport;
  plannedJobs: readonly RuntimeProviderJob[];
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sortPlannedJobs(values: readonly RuntimeProviderJob[]): RuntimeProviderJob[] {
  return [...values].sort((a, b) => {
    if (a.environment !== b.environment) return a.environment.localeCompare(b.environment);
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    if (a.operationKind !== b.operationKind) return a.operationKind.localeCompare(b.operationKind);
    if (a.providerId !== b.providerId) return a.providerId.localeCompare(b.providerId);
    if (a.siteId !== b.siteId) return a.siteId.localeCompare(b.siteId);
    if ((a.siteVersionId ?? "") !== (b.siteVersionId ?? "")) return (a.siteVersionId ?? "").localeCompare(b.siteVersionId ?? "");
    if (a.correlationKey !== b.correlationKey) return a.correlationKey.localeCompare(b.correlationKey);
    return a.id.localeCompare(b.id);
  });
}

function resolveBundleStatus(input: {
  providerId: AgencyProviderId;
  communicatorResult: RuntimeProviderCommunicatorResult;
  executionGate: ProviderExecutionGateReport;
  plannedJobs: readonly RuntimeProviderJob[];
}): RuntimeProviderOperationBundleStatus {
  if (input.communicatorResult.routeStatus === "blocked" || input.communicatorResult.routeStatus === "unavailable") {
    return "blocked";
  }

  if (input.executionGate.gateStatus === "blocked") {
    return "blocked";
  }

  const hasManualJobs = input.plannedJobs.some((job) => job.providerId === "manual");
  if (input.providerId === "manual" && hasManualJobs) {
    return "ready_for_manual";
  }

  const hasSandboxJobs = input.plannedJobs.some((job) => job.environment === "sandbox");
  if (input.providerId === "mock_provider" && hasSandboxJobs) {
    return "ready_for_mock";
  }

  return "blocked";
}

export function createRuntimeProviderOperationBundle(
  input: CreateRuntimeProviderOperationBundleInput,
): RuntimeProviderOperationBundle {
  const plannedJobs = sortPlannedJobs(input.plannedJobs);

  const warnings = uniqueSorted([
    ...input.providerSelection.warnings,
    ...input.communicatorResult.warnings,
    ...input.executionIntent.warnings,
    ...input.executionDryRun.warnings,
    ...input.executionGate.warnings,
  ]);

  const blockers = uniqueSorted([
    ...input.providerSelection.blockers,
    ...input.communicatorResult.blockers,
    ...input.executionIntent.blockers,
    ...input.executionDryRun.blockers,
    ...input.executionGate.blockers,
  ]);

  const bundleStatus = resolveBundleStatus({
    providerId: input.providerId,
    communicatorResult: input.communicatorResult,
    executionGate: input.executionGate,
    plannedJobs,
  });

  const correlationKey = createRuntimeCorrelationKey({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId ?? "",
    providerId: input.providerId,
    environment: input.environment,
    capability: input.capability,
    operationKind: input.operationKind,
    providerSelectionCorrelationKey: input.providerSelection.correlationKey,
    communicatorCorrelationKey: input.communicatorResult.correlationKey,
    executionIntentCorrelationKey: input.executionIntent.correlationKey,
    executionDryRunCorrelationKey: input.executionDryRun.correlationKey,
    executionGateCorrelationKey: input.executionGate.correlationKey,
    plannedJobCorrelationKeys: plannedJobs.map((job) => job.correlationKey).join(","),
    warnings: warnings.join(","),
    blockers: blockers.join(","),
    bundleStatus,
  });

  return {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    providerId: input.providerId,
    environment: input.environment,
    capability: input.capability,
    operationKind: input.operationKind,
    providerSelection: input.providerSelection,
    credentialResolution: input.credentialResolution,
    communicatorResult: input.communicatorResult,
    executionIntent: input.executionIntent,
    executionDryRun: input.executionDryRun,
    executionGate: input.executionGate,
    plannedJobs,
    bundleStatus,
    warnings,
    blockers,
    correlationKey,
  };
}
