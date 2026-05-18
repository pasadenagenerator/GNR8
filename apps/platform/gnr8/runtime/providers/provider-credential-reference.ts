import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { AgencyProviderEnvironment, AgencyProviderId } from "@/gnr8/runtime/providers/agency-provider-settings";

export type ProviderCredentialReference = {
  id: string;
  agencyId: string;
  providerId: AgencyProviderId;
  referenceKey: string;
  environment: AgencyProviderEnvironment;
  credentialNames: string[];
  enabled: boolean;
  correlationKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProviderCredentialReferenceInput = {
  id: string;
  agencyId: string;
  providerId: string;
  referenceKey: string;
  environment: string;
  credentialNames: readonly string[];
  enabled?: boolean;
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
const REFERENCE_KEY_PATTERN = /^[A-Za-z0-9._:/-]+$/;
const CREDENTIAL_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeProviderId(value: string): AgencyProviderId {
  const normalized = normalizeToken(value).toLowerCase();
  if (!ALLOWED_PROVIDERS.has(normalized as AgencyProviderId)) {
    throw new Error(`Invalid provider credential reference provider id: ${value}`);
  }
  return normalized as AgencyProviderId;
}

function normalizeEnvironment(value: string): AgencyProviderEnvironment {
  const normalized = normalizeToken(value).toLowerCase();
  if (!ALLOWED_ENVIRONMENTS.has(normalized as AgencyProviderEnvironment)) {
    throw new Error(`Invalid provider credential reference environment: ${value}`);
  }
  return normalized as AgencyProviderEnvironment;
}

function normalizeReferenceKey(value: string): string {
  const normalized = normalizeToken(value);
  if (!normalized) throw new Error("Provider credential reference key is required");
  if (!REFERENCE_KEY_PATTERN.test(normalized)) {
    throw new Error("Provider credential reference key must be a non-secret reference token");
  }
  return normalized;
}

function normalizeCredentialName(value: string): string {
  const normalized = normalizeToken(value).toLowerCase();
  if (!normalized) throw new Error("Credential name is required");
  if (!CREDENTIAL_NAME_PATTERN.test(normalized)) {
    throw new Error("Credential names must be token-like names only (no secret values)");
  }
  return normalized;
}

function normalizeCredentialNames(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeCredentialName))].sort((a, b) => a.localeCompare(b));
}

export function createProviderCredentialReferenceCorrelationKey(
  input: Pick<ProviderCredentialReference, "agencyId" | "providerId" | "referenceKey" | "environment" | "credentialNames" | "enabled">,
): string {
  return createRuntimeCorrelationKey({
    agencyId: input.agencyId,
    providerId: input.providerId,
    referenceKey: input.referenceKey,
    environment: input.environment,
    credentialNames: input.credentialNames.join(","),
    enabled: input.enabled ? "true" : "false",
  });
}

export function normalizeProviderCredentialReference(
  input: Omit<ProviderCredentialReference, "correlationKey">,
): ProviderCredentialReference {
  const id = normalizeToken(input.id);
  const agencyId = normalizeToken(input.agencyId);
  if (!id) throw new Error("Provider credential reference id is required");
  if (!agencyId) throw new Error("Provider credential reference agencyId is required");

  const providerId = normalizeProviderId(input.providerId);
  const referenceKey = normalizeReferenceKey(input.referenceKey);
  const environment = normalizeEnvironment(input.environment);
  const credentialNames = normalizeCredentialNames(input.credentialNames);

  const createdAt = normalizeToken(input.createdAt);
  const updatedAt = normalizeToken(input.updatedAt);
  if (!createdAt) throw new Error("Provider credential reference createdAt is required");
  if (!updatedAt) throw new Error("Provider credential reference updatedAt is required");

  const normalizedBase = {
    id,
    agencyId,
    providerId,
    referenceKey,
    environment,
    credentialNames,
    enabled: input.enabled,
    createdAt,
    updatedAt,
  };

  return {
    ...normalizedBase,
    correlationKey: createProviderCredentialReferenceCorrelationKey(normalizedBase),
  };
}

export function createProviderCredentialReference(
  input: CreateProviderCredentialReferenceInput,
): ProviderCredentialReference {
  const now = new Date().toISOString();
  return normalizeProviderCredentialReference({
    id: normalizeToken(input.id),
    agencyId: normalizeToken(input.agencyId),
    providerId: normalizeProviderId(input.providerId),
    referenceKey: normalizeReferenceKey(input.referenceKey),
    environment: normalizeEnvironment(input.environment),
    credentialNames: normalizeCredentialNames(input.credentialNames),
    enabled: input.enabled ?? true,
    createdAt: normalizeToken(input.createdAt) || now,
    updatedAt: normalizeToken(input.updatedAt) || now,
  });
}
