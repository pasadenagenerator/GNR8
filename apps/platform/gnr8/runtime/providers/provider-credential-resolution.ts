import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { AgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import type { ProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-reference";

export type ProviderCredentialResolutionStatus = "resolved" | "missing_reference" | "incomplete" | "blocked";

export type ProviderCredentialResolutionReport = {
  providerId: AgencyProviderSettings["providerId"];
  environment: AgencyProviderSettings["environment"];
  credentialReference: AgencyProviderSettings["credentialReference"] | null;
  requiredCredentialNames: string[];
  availableCredentialNames: string[];
  missingCredentialNames: string[];
  resolutionStatus: ProviderCredentialResolutionStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

const OPENPROVIDER_SANDBOX_REQUIRED = ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"];
const OPENPROVIDER_LIVE_REQUIRED = ["OPENPROVIDER_LIVE_PASSWORD", "OPENPROVIDER_LIVE_USERNAME"];

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeCredentialName(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function resolveRequiredCredentialNames(settings: AgencyProviderSettings): string[] {
  if (settings.providerId === "manual") return [];
  if (settings.environment === "contract") return [];
  if (settings.providerId === "openprovider" && settings.environment === "sandbox") {
    return uniqueSorted(OPENPROVIDER_SANDBOX_REQUIRED);
  }
  if (settings.providerId === "openprovider" && settings.environment === "live") {
    return uniqueSorted(OPENPROVIDER_LIVE_REQUIRED);
  }
  return [];
}

function createCorrelationKey(input: Omit<ProviderCredentialResolutionReport, "correlationKey">): string {
  return createRuntimeCorrelationKey({
    providerId: input.providerId,
    environment: input.environment,
    credentialReference: input.credentialReference ?? "none",
    requiredCredentialNames: input.requiredCredentialNames.join(","),
    availableCredentialNames: input.availableCredentialNames.join(","),
    missingCredentialNames: input.missingCredentialNames.join(","),
    resolutionStatus: input.resolutionStatus,
    warnings: input.warnings.join(","),
    blockers: input.blockers.join(","),
  });
}

export function resolveProviderCredentialReference(input: {
  settings: AgencyProviderSettings;
  credentialReference?: ProviderCredentialReference | null;
}): ProviderCredentialResolutionReport {
  const requiredCredentialNames = resolveRequiredCredentialNames(input.settings);
  const availableCredentialNames = uniqueSorted(
    (input.credentialReference?.credentialNames ?? [])
      .map((name) => normalizeCredentialName(name))
      .filter((name) => name.length > 0),
  );
  const missingCredentialNames = requiredCredentialNames.filter((name) => !availableCredentialNames.includes(name));

  const warnings: string[] = [];
  const blockers: string[] = [];

  let resolutionStatus: ProviderCredentialResolutionStatus = "resolved";
  const credentialReference = input.settings.credentialReference ?? null;

  if (input.settings.providerId === "openprovider" && input.settings.environment === "live") {
    resolutionStatus = "blocked";
    blockers.push("openprovider_live_credentials_blocked_in_current_phase");
  } else if (requiredCredentialNames.length > 0 && credentialReference === null) {
    resolutionStatus = "missing_reference";
    blockers.push("provider_credential_reference_missing");
  } else if (missingCredentialNames.length > 0) {
    resolutionStatus = "incomplete";
    blockers.push("provider_required_credentials_missing");
  }

  const reportWithoutCorrelation: Omit<ProviderCredentialResolutionReport, "correlationKey"> = {
    providerId: input.settings.providerId,
    environment: input.settings.environment,
    credentialReference,
    requiredCredentialNames,
    availableCredentialNames,
    missingCredentialNames,
    resolutionStatus,
    warnings: uniqueSorted(warnings),
    blockers: uniqueSorted(blockers),
  };

  return {
    ...reportWithoutCorrelation,
    correlationKey: createCorrelationKey(reportWithoutCorrelation),
  };
}
