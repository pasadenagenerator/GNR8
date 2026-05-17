import { createDnsCorrelationKey, type DnsProviderId } from "@/gnr8/runtime/dns/dns-provider-types";
import type { ProviderCredentialBoundaryReport } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import type { ProviderExecutionGateReport } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { DnsProviderImplementationReadinessReport } from "@/gnr8/runtime/dns/provider-implementation-readiness";

export type ProviderSandboxAdapterMode = "manual" | "mock" | "sandbox_disabled" | "live_blocked";

export type ProviderSandboxAdapterDescriptor = {
  providerId: DnsProviderId;
  mode: ProviderSandboxAdapterMode;
  adapterAvailable: boolean;
  sandboxEligible: boolean;
  liveEligible: boolean;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

type CreateProviderSandboxAdapterDescriptorInput = {
  providerId: DnsProviderId;
  readiness: DnsProviderImplementationReadinessReport;
  credentialBoundary: ProviderCredentialBoundaryReport;
  executionGate: ProviderExecutionGateReport;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function hasRegisteredAdapter(readiness: DnsProviderImplementationReadinessReport): boolean {
  return readiness.checklist.some((item) => item.id === "adapter_registered" && item.status === "pass");
}

export function createProviderSandboxAdapterDescriptor(
  providerId: DnsProviderId,
  readiness: DnsProviderImplementationReadinessReport,
  credentialBoundary: ProviderCredentialBoundaryReport,
  executionGate: ProviderExecutionGateReport,
): ProviderSandboxAdapterDescriptor;
export function createProviderSandboxAdapterDescriptor(
  input: CreateProviderSandboxAdapterDescriptorInput,
): ProviderSandboxAdapterDescriptor;
export function createProviderSandboxAdapterDescriptor(
  providerIdOrInput: DnsProviderId | CreateProviderSandboxAdapterDescriptorInput,
  readinessArg?: DnsProviderImplementationReadinessReport,
  credentialBoundaryArg?: ProviderCredentialBoundaryReport,
  executionGateArg?: ProviderExecutionGateReport,
): ProviderSandboxAdapterDescriptor {
  const input: CreateProviderSandboxAdapterDescriptorInput =
    typeof providerIdOrInput === "string"
      ? {
          providerId: providerIdOrInput,
          readiness: readinessArg as DnsProviderImplementationReadinessReport,
          credentialBoundary: credentialBoundaryArg as ProviderCredentialBoundaryReport,
          executionGate: executionGateArg as ProviderExecutionGateReport,
        }
      : providerIdOrInput;

  const adapterAvailable = input.providerId === "manual" ? true : hasRegisteredAdapter(input.readiness);

  const sandboxEligible =
    input.readiness.readinessStatus === "ready_for_sandbox" &&
    input.credentialBoundary.safetyStatus !== "blocked" &&
    input.executionGate.gateStatus === "open_for_sandbox_dry_run";

  const liveEligible = false;

  let mode: ProviderSandboxAdapterMode = "mock";
  if (input.executionGate.requestedEnvironment === "live") {
    mode = "live_blocked";
  } else if (input.providerId === "manual") {
    mode = "manual";
  } else if (!adapterAvailable) {
    mode = "sandbox_disabled";
  }

  const warnings = uniqueSorted([
    ...input.readiness.warnings,
    ...input.credentialBoundary.warnings,
    ...input.executionGate.warnings,
  ]);

  const blockers = uniqueSorted([
    ...input.readiness.blockers,
    ...input.credentialBoundary.blockers,
    ...input.executionGate.blockers,
    ...(liveEligible ? [] : ["live_execution_blocked_in_current_phase"]),
    ...(adapterAvailable || input.providerId === "manual" ? [] : [`provider_adapter_unavailable:${input.providerId}`]),
  ]);

  const descriptorWithoutCorrelation = {
    providerId: input.providerId,
    mode,
    adapterAvailable,
    sandboxEligible,
    liveEligible,
    warnings,
    blockers,
  };

  return {
    ...descriptorWithoutCorrelation,
    correlationKey: createDnsCorrelationKey(descriptorWithoutCorrelation),
  };
}
