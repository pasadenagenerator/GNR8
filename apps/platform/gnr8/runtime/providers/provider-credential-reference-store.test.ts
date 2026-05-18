import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProviderCredentialReference, type ProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-reference";
import {
  mapProviderCredentialReferenceRow,
  mapProviderCredentialReferenceToRow,
  type ProviderCredentialReferenceRow,
} from "@/gnr8/runtime/providers/provider-credential-reference-store";

function buildReference(input?: Partial<ProviderCredentialReference>): ProviderCredentialReference {
  return normalizeProviderCredentialReference({
    id: "pcr_1",
    agencyId: "agency_1",
    providerId: "openprovider",
    referenceKey: "vault:gnr8/openprovider/shared",
    environment: "sandbox",
    credentialNames: ["api_key", "api_secret"],
    enabled: true,
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...input,
  });
}

test("provider credential reference store mapper: row roundtrip", () => {
  const reference = buildReference();
  const row = mapProviderCredentialReferenceToRow(reference);
  const roundtrip = mapProviderCredentialReferenceRow(row);

  assert.deepEqual(roundtrip, reference);
});

test("provider credential reference store mapper: deterministic credential_names hydration", () => {
  const row: ProviderCredentialReferenceRow = {
    id: "pcr_1",
    agency_id: "agency_1",
    provider_id: "openprovider",
    reference_key: "vault:gnr8/openprovider/shared",
    environment: "sandbox",
    credential_names: ["api_secret", "api_key", "api_secret"],
    enabled: true,
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:00:00.000Z",
  };

  const mapped = mapProviderCredentialReferenceRow(row);
  assert.deepEqual(mapped.credentialNames, ["api_key", "api_secret"]);
});

test("provider credential reference store mapper: pure mapping with no secret value fields", () => {
  const row = mapProviderCredentialReferenceToRow(buildReference());
  assert.equal(Array.isArray(row.credential_names), true);
  assert.equal(Object.prototype.hasOwnProperty.call(row, "credential_values"), false);
});
