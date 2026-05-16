import {
  createDnsCorrelationKey,
  type DnsProviderAdapterContract,
  type DnsProviderCapability,
  type DnsProviderId,
} from "@/gnr8/runtime/dns/dns-provider-types";
import type { DnsProviderAdapterContractReport } from "@/gnr8/runtime/dns/provider-adapter-contract-test";

export type DnsProviderImplementationReadinessStatus = "ready_for_mock" | "ready_for_sandbox" | "blocked";

export type DnsProviderImplementationChecklistId =
  | "capability_defined"
  | "adapter_registered"
  | "contract_passes"
  | "credentials_not_required_for_contract"
  | "sandbox_mode_required_before_live"
  | "no_live_execution_enabled";

export type DnsProviderImplementationChecklistItem = {
  id: DnsProviderImplementationChecklistId;
  status: "pass" | "fail";
  detail: string;
};

export type DnsProviderImplementationReadinessReport = {
  providerId: DnsProviderId;
  readinessStatus: DnsProviderImplementationReadinessStatus;
  checklist: DnsProviderImplementationChecklistItem[];
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type DnsProviderImplementationReadinessInput = {
  providerId: DnsProviderId;
  capability?: DnsProviderCapability | null;
  adapter?: DnsProviderAdapterContract | null;
  contractReport?: DnsProviderAdapterContractReport | null;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function evaluateDnsProviderImplementationReadiness(
  input: DnsProviderImplementationReadinessInput,
): DnsProviderImplementationReadinessReport {
  const warnings: string[] = [];
  const blockers: string[] = [];

  const capabilityDefined = Boolean(input.capability && input.capability.providerId === input.providerId);
  const adapterRegistered = Boolean(input.adapter && input.adapter.providerId === input.providerId);
  const contractPasses = input.contractReport?.contractStatus === "pass";

  if (!capabilityDefined) {
    blockers.push("capability_missing_or_mismatched");
  }

  if (!adapterRegistered && input.providerId !== "manual") {
    blockers.push("adapter_not_registered_for_provider");
  }

  if (!contractPasses) {
    blockers.push("contract_not_passing");
  }

  warnings.push("sandbox_mode_required_before_live");
  warnings.push("live_execution_must_remain_disabled_in_current_phase");

  const checklist: DnsProviderImplementationChecklistItem[] = [
    {
      id: "capability_defined",
      status: capabilityDefined ? "pass" : "fail",
      detail: capabilityDefined ? "capability is defined for provider" : "capability is missing or mismatched for provider",
    },
    {
      id: "adapter_registered",
      status: adapterRegistered ? "pass" : "fail",
      detail: adapterRegistered
        ? "provider adapter is registered"
        : input.providerId === "manual"
          ? "manual provider does not require adapter registration for mock phase"
          : "provider adapter is not registered",
    },
    {
      id: "contract_passes",
      status: contractPasses ? "pass" : "fail",
      detail: contractPasses ? "adapter contract report is passing" : "adapter contract report is missing or failing",
    },
    {
      id: "credentials_not_required_for_contract",
      status: "pass",
      detail: "contract phase does not require live credentials",
    },
    {
      id: "sandbox_mode_required_before_live",
      status: "pass",
      detail: "sandbox mode is required before any live integration",
    },
    {
      id: "no_live_execution_enabled",
      status: "pass",
      detail: "live DNS execution remains disabled in this phase",
    },
  ];

  const resolvedBlockers = uniqueSorted(blockers);
  const resolvedWarnings = uniqueSorted(warnings);

  let readinessStatus: DnsProviderImplementationReadinessStatus = "blocked";
  if (resolvedBlockers.length === 0) {
    readinessStatus = input.providerId === "manual" ? "ready_for_mock" : "ready_for_sandbox";
  }

  const reportWithoutCorrelation = {
    providerId: input.providerId,
    readinessStatus,
    checklist,
    warnings: resolvedWarnings,
    blockers: resolvedBlockers,
  };

  return {
    ...reportWithoutCorrelation,
    correlationKey: createDnsCorrelationKey(reportWithoutCorrelation),
  };
}
