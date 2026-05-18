import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";

export type AgencyProviderCapability = "domains" | "dns" | "mailboxes";
export type AgencyProviderId = "manual" | "mock_provider" | "openprovider" | "realtime_register" | "netim" | "inwx";
export type AgencyProviderEnvironment = "contract" | "sandbox" | "live";

export type AgencyProviderSettings = {
  id: string;
  agencyId: string;
  providerId: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  credentialReference?: string;
  enabled: boolean;
  capabilities: AgencyProviderCapability[];
  correlationKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAgencyProviderSettingsInput = {
  id: string;
  agencyId: string;
  providerId: string;
  environment: string;
  credentialReference?: string | null;
  enabled?: boolean;
  capabilities?: readonly string[] | null;
  createdAt?: string;
  updatedAt?: string;
};

const ALLOWED_PROVIDERS = new Set<AgencyProviderId>([
  "manual",
  "mock_provider",
  "openprovider",
  "realtime_register",
  "netim",
  "inwx",
]);

const ALLOWED_ENVIRONMENTS = new Set<AgencyProviderEnvironment>(["contract", "sandbox", "live"]);
const ALLOWED_CAPABILITIES = new Set<AgencyProviderCapability>(["domains", "dns", "mailboxes"]);
const CREDENTIAL_REFERENCE_PATTERN = /^[A-Za-z0-9._:/-]+$/;

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeCapability(value: string): AgencyProviderCapability {
  const normalized = normalizeToken(value).toLowerCase();
  if (!ALLOWED_CAPABILITIES.has(normalized as AgencyProviderCapability)) {
    throw new Error(`Invalid agency provider capability: ${value}`);
  }
  return normalized as AgencyProviderCapability;
}

function normalizeProviderId(value: string): AgencyProviderId {
  const normalized = normalizeToken(value).toLowerCase();
  if (!ALLOWED_PROVIDERS.has(normalized as AgencyProviderId)) {
    throw new Error(`Invalid agency provider id: ${value}`);
  }
  return normalized as AgencyProviderId;
}

function normalizeEnvironment(value: string): AgencyProviderEnvironment {
  const normalized = normalizeToken(value).toLowerCase();
  if (!ALLOWED_ENVIRONMENTS.has(normalized as AgencyProviderEnvironment)) {
    throw new Error(`Invalid agency provider environment: ${value}`);
  }
  return normalized as AgencyProviderEnvironment;
}

function normalizeCredentialReference(value: string | null | undefined): string | undefined {
  const normalized = normalizeToken(value);
  if (!normalized) return undefined;
  if (!CREDENTIAL_REFERENCE_PATTERN.test(normalized)) {
    throw new Error("Credential reference must be a non-secret reference token, not a raw credential value");
  }
  return normalized;
}

function normalizeCapabilities(values: readonly string[] | null | undefined): AgencyProviderCapability[] {
  const source = values ?? [];
  return [...new Set(source.map(normalizeCapability))].sort((a, b) => a.localeCompare(b));
}

export function createAgencyProviderSettingsCorrelationKey(
  input: Pick<
    AgencyProviderSettings,
    "agencyId" | "providerId" | "environment" | "credentialReference" | "enabled" | "capabilities"
  >,
): string {
  return createRuntimeCorrelationKey({
    agencyId: input.agencyId,
    providerId: input.providerId,
    environment: input.environment,
    credentialReference: input.credentialReference ?? "none",
    enabled: input.enabled ? "true" : "false",
    capabilities: input.capabilities.join(","),
  });
}

export function normalizeAgencyProviderSettings(
  input: Omit<AgencyProviderSettings, "correlationKey">,
): AgencyProviderSettings {
  const id = normalizeToken(input.id);
  const agencyId = normalizeToken(input.agencyId);
  if (!id) throw new Error("Agency provider settings id is required");
  if (!agencyId) throw new Error("Agency provider settings agencyId is required");

  const providerId = normalizeProviderId(input.providerId);
  const environment = normalizeEnvironment(input.environment);
  const credentialReference = normalizeCredentialReference(input.credentialReference);
  const capabilities = normalizeCapabilities(input.capabilities);
  const createdAt = normalizeToken(input.createdAt);
  const updatedAt = normalizeToken(input.updatedAt);
  if (!createdAt) throw new Error("Agency provider settings createdAt is required");
  if (!updatedAt) throw new Error("Agency provider settings updatedAt is required");

  const normalizedBase = {
    id,
    agencyId,
    providerId,
    environment,
    credentialReference,
    enabled: input.enabled,
    capabilities,
    createdAt,
    updatedAt,
  };

  return {
    ...normalizedBase,
    correlationKey: createAgencyProviderSettingsCorrelationKey(normalizedBase),
  };
}

export function createAgencyProviderSettings(input: CreateAgencyProviderSettingsInput): AgencyProviderSettings {
  const now = new Date().toISOString();
  return normalizeAgencyProviderSettings({
    id: normalizeToken(input.id),
    agencyId: normalizeToken(input.agencyId),
    providerId: normalizeProviderId(input.providerId),
    environment: normalizeEnvironment(input.environment),
    credentialReference: normalizeCredentialReference(input.credentialReference),
    enabled: input.enabled ?? true,
    capabilities: normalizeCapabilities(input.capabilities),
    createdAt: normalizeToken(input.createdAt) || now,
    updatedAt: normalizeToken(input.updatedAt) || now,
  });
}
