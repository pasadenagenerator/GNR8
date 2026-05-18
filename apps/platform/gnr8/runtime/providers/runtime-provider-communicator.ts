import { hasDnsProviderAdapter } from "@/gnr8/runtime/dns/provider-adapter-registry";
import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type {
  AgencyProviderCapability,
  AgencyProviderEnvironment,
  AgencyProviderId,
} from "@/gnr8/runtime/providers/agency-provider-settings";

export type RuntimeProviderCommunicatorRouteStatus = "resolved" | "manual" | "unavailable" | "blocked";

export type RuntimeProviderCommunicatorRequest = {
  providerId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  operationKind: string;
  capability: AgencyProviderCapability;
};

export type RuntimeProviderCommunicatorResult = {
  providerId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  capability: AgencyProviderCapability;
  operationKind: string;
  adapterAvailable: boolean;
  routeStatus: RuntimeProviderCommunicatorRouteStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

function normalizeToken(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sortRequests(
  values: readonly RuntimeProviderCommunicatorRequest[],
): RuntimeProviderCommunicatorRequest[] {
  return [...values].sort((a, b) => {
    if (a.providerId !== b.providerId) return a.providerId.localeCompare(b.providerId);
    if (a.environment !== b.environment) return a.environment.localeCompare(b.environment);
    if (a.capability !== b.capability) return a.capability.localeCompare(b.capability);
    return a.operationKind.localeCompare(b.operationKind);
  });
}

function sortResults(
  values: readonly RuntimeProviderCommunicatorResult[],
): RuntimeProviderCommunicatorResult[] {
  return [...values].sort((a, b) => {
    if (a.providerId !== b.providerId) return a.providerId.localeCompare(b.providerId);
    if (a.environment !== b.environment) return a.environment.localeCompare(b.environment);
    if (a.capability !== b.capability) return a.capability.localeCompare(b.capability);
    if (a.operationKind !== b.operationKind) return a.operationKind.localeCompare(b.operationKind);
    return a.correlationKey.localeCompare(b.correlationKey);
  });
}

function resolveRouteStatus(input: {
  providerId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  adapterAvailable: boolean;
}): RuntimeProviderCommunicatorRouteStatus {
  if (input.providerId === "manual") return "manual";
  if (!input.adapterAvailable) return "unavailable";
  if (input.environment === "live") return "blocked";
  if (input.providerId === "mock_provider") return "resolved";
  return "resolved";
}

export function resolveRuntimeProviderCommunication(
  input: RuntimeProviderCommunicatorRequest,
): RuntimeProviderCommunicatorResult {
  const providerId = input.providerId;
  const environment = input.environment;
  const capability = input.capability;
  const operationKind = normalizeToken(input.operationKind);

  const adapterAvailable = hasDnsProviderAdapter(providerId);
  const routeStatus = resolveRouteStatus({
    providerId,
    environment,
    adapterAvailable,
  });

  const warnings: string[] = [];
  const blockers: string[] = [];

  if (routeStatus === "manual") {
    warnings.push("manual_provider_selected");
  }

  if (routeStatus === "unavailable") {
    blockers.push("provider_adapter_missing");
  }

  if (routeStatus === "blocked") {
    blockers.push("live_environment_provider_execution_blocked");
  }

  const normalizedWarnings = uniqueSorted(warnings);
  const normalizedBlockers = uniqueSorted(blockers);

  const correlationKey = createRuntimeCorrelationKey({
    providerId,
    environment,
    capability,
    operationKind,
    adapterAvailable: adapterAvailable ? "true" : "false",
    routeStatus,
    warnings: normalizedWarnings.join(","),
    blockers: normalizedBlockers.join(","),
  });

  return {
    providerId,
    environment,
    capability,
    operationKind,
    adapterAvailable,
    routeStatus,
    warnings: normalizedWarnings,
    blockers: normalizedBlockers,
    correlationKey,
  };
}

export function resolveRuntimeProviderCommunications(
  requests: readonly RuntimeProviderCommunicatorRequest[],
): RuntimeProviderCommunicatorResult[] {
  const sortedRequests = sortRequests(requests);
  const results = sortedRequests.map((request) => resolveRuntimeProviderCommunication(request));
  return sortResults(results);
}
