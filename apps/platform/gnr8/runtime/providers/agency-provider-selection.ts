import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type {
  AgencyProviderCapability,
  AgencyProviderEnvironment,
  AgencyProviderId,
  AgencyProviderSettings,
} from "@/gnr8/runtime/providers/agency-provider-settings";

export type AgencyProviderSelection = {
  selectedProviderId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  selectionReason: string;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

const PROVIDER_PRIORITY: readonly AgencyProviderId[] = [
  "mock_provider",
  "manual",
  "openprovider",
  "realtime_register",
  "netim",
  "inwx",
];

const ENVIRONMENT_FALLBACK_PRIORITY: readonly AgencyProviderEnvironment[] = ["sandbox", "contract", "live"];

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function providerRank(providerId: AgencyProviderId): number {
  const index = PROVIDER_PRIORITY.indexOf(providerId);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function environmentRank(environment: AgencyProviderEnvironment, preferredEnvironment?: AgencyProviderEnvironment): number {
  if (preferredEnvironment && environment === preferredEnvironment) return -1;
  const index = ENVIRONMENT_FALLBACK_PRIORITY.indexOf(environment);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export function resolveAgencyProviderSelection(input: {
  agencyProviderSettings: AgencyProviderSettings[];
  requiredCapability: AgencyProviderCapability;
  preferredEnvironment?: AgencyProviderEnvironment;
}): AgencyProviderSelection {
  const enabledWithCapability = input.agencyProviderSettings.filter(
    (entry) => entry.enabled && entry.capabilities.includes(input.requiredCapability),
  );

  const warnings: string[] = [];
  const blockers: string[] = [];
  const selectionReasonParts = ["agency_provider_settings"];

  if (enabledWithCapability.length === 0) {
    warnings.push("no_enabled_provider_with_required_capability");
    selectionReasonParts.push("fallback_manual");
    const environment = input.preferredEnvironment ?? "sandbox";
    const correlationKey = createRuntimeCorrelationKey({
      requiredCapability: input.requiredCapability,
      preferredEnvironment: input.preferredEnvironment ?? "none",
      selectedProviderId: "manual",
      environment,
      selectionReason: selectionReasonParts.join(":"),
      warnings: uniqueSorted(warnings).join(","),
      blockers: "",
      candidates: "",
    });
    return {
      selectedProviderId: "manual",
      environment,
      selectionReason: selectionReasonParts.join(":"),
      warnings: uniqueSorted(warnings),
      blockers,
      correlationKey,
    };
  }

  const sortedCandidates = [...enabledWithCapability].sort((left, right) => {
    const providerDelta = providerRank(left.providerId) - providerRank(right.providerId);
    if (providerDelta !== 0) return providerDelta;
    const environmentDelta = environmentRank(left.environment, input.preferredEnvironment) - environmentRank(right.environment, input.preferredEnvironment);
    if (environmentDelta !== 0) return environmentDelta;
    return left.id.localeCompare(right.id);
  });

  const selected = sortedCandidates[0]!;
  const selectedEnvironmentRank = environmentRank(selected.environment, input.preferredEnvironment);
  if (selectedEnvironmentRank !== -1 && input.preferredEnvironment) {
    warnings.push(`preferred_environment_unavailable:${input.preferredEnvironment}`);
    selectionReasonParts.push("fallback_environment_priority");
  } else if (input.preferredEnvironment) {
    selectionReasonParts.push(`preferred_environment:${input.preferredEnvironment}`);
  } else {
    selectionReasonParts.push("default_environment_priority");
  }

  const correlationKey = createRuntimeCorrelationKey({
    requiredCapability: input.requiredCapability,
    preferredEnvironment: input.preferredEnvironment ?? "none",
    selectedProviderId: selected.providerId,
    environment: selected.environment,
    selectionReason: selectionReasonParts.join(":"),
    warnings: uniqueSorted(warnings).join(","),
    blockers: "",
    candidates: sortedCandidates.map((candidate) => `${candidate.providerId}@${candidate.environment}`).join(","),
  });

  return {
    selectedProviderId: selected.providerId,
    environment: selected.environment,
    selectionReason: selectionReasonParts.join(":"),
    warnings: uniqueSorted(warnings),
    blockers,
    correlationKey,
  };
}
