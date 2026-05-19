import { createDnsCorrelationKey, type DnsProviderId } from "@/gnr8/runtime/dns/dns-provider-types";

export type ProviderCredentialEnvironment = "contract" | "sandbox" | "live";

export type ProviderCredentialSafetyStatus = "safe" | "warning" | "blocked";

export type ProviderCredentialRequirement = {
  providerId: DnsProviderId;
  environment: ProviderCredentialEnvironment;
  credentialName: string;
  required: boolean;
};

export type ProviderCredentialBoundaryReport = {
  providerId: DnsProviderId;
  environment: ProviderCredentialEnvironment;
  requiredCredentials: string[];
  missingCredentials: string[];
  forbiddenCredentials: string[];
  safetyStatus: ProviderCredentialSafetyStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type ProviderCredentialBoundaryInput = {
  providerId: DnsProviderId;
  environment: ProviderCredentialEnvironment;
  availableCredentialNames?: readonly string[];
  credentialValuesByName?: Readonly<Record<string, string | null | undefined>>;
};

const PROVIDER_REQUIREMENT_NAMES: Record<DnsProviderId, readonly string[]> = {
  manual: [],
  mock_provider: [],
  openprovider: [
    "OPENPROVIDER_SANDBOX_USERNAME",
    "OPENPROVIDER_SANDBOX_PASSWORD",
    "OPENPROVIDER_LIVE_USERNAME",
    "OPENPROVIDER_LIVE_PASSWORD",
  ],
  realtime_register: ["REALTIME_REGISTER_USERNAME", "REALTIME_REGISTER_PASSWORD"],
  netim: ["NETIM_USERNAME", "NETIM_PASSWORD"],
  inwx: ["INWX_USERNAME", "INWX_PASSWORD"],
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeCredentialName(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function listRequiredCredentialNames(providerId: DnsProviderId, environment: ProviderCredentialEnvironment): string[] {
  if (environment === "contract") {
    return [];
  }
  if (providerId === "openprovider" && environment === "sandbox") {
    return uniqueSorted(["OPENPROVIDER_SANDBOX_USERNAME", "OPENPROVIDER_SANDBOX_PASSWORD"]);
  }
  if (providerId === "openprovider" && environment === "live") {
    return uniqueSorted(["OPENPROVIDER_LIVE_USERNAME", "OPENPROVIDER_LIVE_PASSWORD"]);
  }
  return uniqueSorted(PROVIDER_REQUIREMENT_NAMES[providerId]);
}

function isSecretLikeValue(value: string): boolean {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;

  if (/-----BEGIN [A-Z ]+-----/.test(trimmed)) return true;
  if (/^[A-Za-z0-9_\-]{20,}$/.test(trimmed)) return true;
  if (/^[A-Za-z0-9+/]{24,}={0,2}$/.test(trimmed)) return true;
  if (/^sk_[A-Za-z0-9]+$/i.test(trimmed)) return true;
  if (trimmed.includes(".") && trimmed.split(".").length === 3 && trimmed.length >= 24) return true;

  const alnumCount = (trimmed.match(/[A-Za-z0-9]/g) ?? []).length;
  return trimmed.length >= 16 && alnumCount >= 12;
}

export function listProviderCredentialRequirements(input: {
  providerId: DnsProviderId;
  environment: ProviderCredentialEnvironment;
}): ProviderCredentialRequirement[] {
  return listRequiredCredentialNames(input.providerId, input.environment).map((credentialName) => ({
    providerId: input.providerId,
    environment: input.environment,
    credentialName,
    required: true,
  }));
}

export function evaluateProviderCredentialBoundary(
  input: ProviderCredentialBoundaryInput,
): ProviderCredentialBoundaryReport {
  const requiredCredentials = listRequiredCredentialNames(input.providerId, input.environment);

  const availableNames = new Set(
    (input.availableCredentialNames ?? [])
      .map((name) => normalizeCredentialName(name))
      .filter((name) => name.length > 0),
  );

  const missingCredentials = requiredCredentials.filter((name) => !availableNames.has(name));

  const forbiddenCredentials = uniqueSorted(
    Object.entries(input.credentialValuesByName ?? {})
      .map(([name, value]) => ({ name: normalizeCredentialName(name), value: String(value ?? "") }))
      .filter((entry) => entry.name.length > 0 && isSecretLikeValue(entry.value))
      .map((entry) => entry.name),
  );

  const warnings: string[] = [];
  const blockers: string[] = [];

  if (input.providerId === "manual" || input.providerId === "mock_provider") {
    // Manual and mock providers remain always safe in this phase.
  } else if (input.environment === "sandbox") {
    if (missingCredentials.length > 0) {
      warnings.push(`sandbox_required_credentials_missing:${input.providerId}`);
      blockers.push(`sandbox_credentials_unavailable_for_phase:${input.providerId}`);
    }
  } else if (input.environment === "live") {
    blockers.push(`live_credentials_blocked_in_current_phase:${input.providerId}`);
  }

  if (forbiddenCredentials.length > 0) {
    blockers.push(`forbidden_secret_like_values_passed:${input.providerId}`);
  }

  const resolvedWarnings = uniqueSorted(warnings);
  const resolvedBlockers = uniqueSorted(blockers);

  const safetyStatus: ProviderCredentialSafetyStatus =
    resolvedBlockers.length > 0 ? "blocked" : resolvedWarnings.length > 0 ? "warning" : "safe";

  const reportWithoutCorrelation = {
    providerId: input.providerId,
    environment: input.environment,
    requiredCredentials: uniqueSorted(requiredCredentials),
    missingCredentials: uniqueSorted(missingCredentials),
    forbiddenCredentials,
    safetyStatus,
    warnings: resolvedWarnings,
    blockers: resolvedBlockers,
  };

  return {
    ...reportWithoutCorrelation,
    correlationKey: createDnsCorrelationKey(reportWithoutCorrelation),
  };
}
