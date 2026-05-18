import type {
  AgencyProviderCapability,
  AgencyProviderEnvironment,
  AgencyProviderId,
  AgencyProviderSettings,
} from "@/gnr8/runtime/providers/agency-provider-settings";
import { normalizeAgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";

export type AgencyProviderSettingsRow = {
  id: string;
  agency_id: string;
  provider_id: AgencyProviderId;
  environment: AgencyProviderEnvironment;
  credential_reference: string | null;
  enabled: boolean;
  capabilities: Record<string, boolean>;
  created_at: string;
  updated_at: string;
};

function mapCapabilitiesToJsonbObject(capabilities: readonly AgencyProviderCapability[]): Record<string, boolean> {
  return Object.fromEntries(capabilities.map((capability) => [capability, true]));
}

function mapJsonbObjectToCapabilities(value: Record<string, unknown>): AgencyProviderCapability[] {
  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key)
    .sort((a, b) => a.localeCompare(b)) as AgencyProviderCapability[];
}

export function mapAgencyProviderSettingsToRow(settings: AgencyProviderSettings): AgencyProviderSettingsRow {
  return {
    id: settings.id,
    agency_id: settings.agencyId,
    provider_id: settings.providerId,
    environment: settings.environment,
    credential_reference: settings.credentialReference ?? null,
    enabled: settings.enabled,
    capabilities: mapCapabilitiesToJsonbObject(settings.capabilities),
    created_at: settings.createdAt,
    updated_at: settings.updatedAt,
  };
}

export function mapAgencyProviderSettingsRow(row: AgencyProviderSettingsRow): AgencyProviderSettings {
  return normalizeAgencyProviderSettings({
    id: row.id,
    agencyId: row.agency_id,
    providerId: row.provider_id,
    environment: row.environment,
    credentialReference: row.credential_reference ?? undefined,
    enabled: row.enabled,
    capabilities: mapJsonbObjectToCapabilities(row.capabilities),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
