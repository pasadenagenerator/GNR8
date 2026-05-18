import type {
  ProviderCredentialReference,
} from "@/gnr8/runtime/providers/provider-credential-reference";
import { normalizeProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-reference";

export type ProviderCredentialReferenceRow = {
  id: string;
  agency_id: string;
  provider_id: ProviderCredentialReference["providerId"];
  reference_key: string;
  environment: ProviderCredentialReference["environment"];
  credential_names: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function mapProviderCredentialReferenceToRow(
  value: ProviderCredentialReference,
): ProviderCredentialReferenceRow {
  return {
    id: value.id,
    agency_id: value.agencyId,
    provider_id: value.providerId,
    reference_key: value.referenceKey,
    environment: value.environment,
    credential_names: [...value.credentialNames],
    enabled: value.enabled,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}

export function mapProviderCredentialReferenceRow(
  row: ProviderCredentialReferenceRow,
): ProviderCredentialReference {
  return normalizeProviderCredentialReference({
    id: row.id,
    agencyId: row.agency_id,
    providerId: row.provider_id,
    referenceKey: row.reference_key,
    environment: row.environment,
    credentialNames: row.credential_names,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
