import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderCredentialReference,
  createProviderCredentialReferenceCorrelationKey,
  normalizeProviderCredentialReference,
  type ProviderCredentialReference,
} from "@/gnr8/runtime/providers/provider-credential-reference";

function buildReference(input?: Partial<ProviderCredentialReference>): ProviderCredentialReference {
  return normalizeProviderCredentialReference({
    id: "pcr_1",
    agencyId: "agency_1",
    providerId: "mock_provider",
    referenceKey: "vault:gnr8/mock_provider/default",
    environment: "sandbox",
    credentialNames: ["api_key", "api_secret"],
    enabled: true,
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...input,
  });
}

test("provider credential reference: deterministic ordering and duplicate credential names removed", () => {
  const normalized = normalizeProviderCredentialReference({
    id: " pcr_1 ",
    agencyId: " agency_1 ",
    providerId: " MOCK_PROVIDER ",
    referenceKey: " vault:gnr8/mock_provider/default ",
    environment: " SANDBOX ",
    credentialNames: ["API_SECRET", "api_key", "api_secret", "api_key"],
    enabled: true,
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
  });

  assert.deepEqual(normalized.credentialNames, ["api_key", "api_secret"]);
  assert.equal(normalized.providerId, "mock_provider");
  assert.equal(normalized.environment, "sandbox");
});

test("provider credential reference: stable correlation key across equivalent inputs", () => {
  const left = buildReference({ credentialNames: ["api_secret", "api_key", "api_secret"] });
  const right = buildReference({ credentialNames: ["api_key", "api_secret"] });

  assert.equal(left.correlationKey, right.correlationKey);
  assert.equal(
    createProviderCredentialReferenceCorrelationKey({
      agencyId: left.agencyId,
      providerId: left.providerId,
      referenceKey: left.referenceKey,
      environment: left.environment,
      credentialNames: left.credentialNames,
      enabled: left.enabled,
    }),
    left.correlationKey,
  );
});

test("provider credential reference: no secret values accepted in credential names", () => {
  assert.throws(
    () =>
      createProviderCredentialReference({
        id: "pcr_secret",
        agencyId: "agency_1",
        providerId: "manual",
        referenceKey: "vault:gnr8/manual/default",
        environment: "sandbox",
        credentialNames: ["my secret token value"],
      }),
    /Credential names must be token-like names only/,
  );

  const safe = buildReference();
  assert.equal(Object.prototype.hasOwnProperty.call(safe, "credentialValues"), false);
});
