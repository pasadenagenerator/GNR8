import assert from "node:assert/strict";
import test from "node:test";

import {
  createAgencyProviderSettings,
  createAgencyProviderSettingsCorrelationKey,
  normalizeAgencyProviderSettings,
  type AgencyProviderSettings,
} from "@/gnr8/runtime/providers/agency-provider-settings";

function buildSettings(input?: Partial<AgencyProviderSettings>): AgencyProviderSettings {
  return normalizeAgencyProviderSettings({
    id: "aps_1",
    agencyId: "agency_1",
    providerId: "mock_provider",
    environment: "sandbox",
    credentialReference: "vault:gnr8/mock_provider/default",
    enabled: true,
    capabilities: ["dns", "domains"],
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
    ...input,
  });
}

test("agency provider settings: deterministic normalization and capability dedupe ordering", () => {
  const normalized = normalizeAgencyProviderSettings({
    id: " aps_1 ",
    agencyId: " agency_1 ",
    providerId: " MOCK_PROVIDER ",
    environment: " SANDBOX ",
    credentialReference: "vault:gnr8/mock_provider/default",
    enabled: true,
    capabilities: ["dns", "domains", "dns", "mailboxes", "domains"],
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  });

  assert.deepEqual(normalized.capabilities, ["dns", "domains", "mailboxes"]);
  assert.equal(normalized.providerId, "mock_provider");
  assert.equal(normalized.environment, "sandbox");
});

test("agency provider settings: correlation key is stable across equivalent inputs", () => {
  const left = buildSettings({ capabilities: ["domains", "dns", "dns"] });
  const right = buildSettings({ capabilities: ["dns", "domains"] });

  assert.equal(left.correlationKey, right.correlationKey);
  assert.equal(
    createAgencyProviderSettingsCorrelationKey({
      agencyId: left.agencyId,
      providerId: left.providerId,
      environment: left.environment,
      credentialReference: left.credentialReference,
      enabled: left.enabled,
      capabilities: left.capabilities,
    }),
    left.correlationKey,
  );
});

test("agency provider settings: create defaults enabled and timestamps", () => {
  const created = createAgencyProviderSettings({
    id: "aps_2",
    agencyId: "agency_1",
    providerId: "manual",
    environment: "contract",
    capabilities: ["domains"],
  });

  assert.equal(created.enabled, true);
  assert.equal(Boolean(created.createdAt), true);
  assert.equal(Boolean(created.updatedAt), true);
});

test("agency provider settings: validation fails for invalid provider/environment/capability", () => {
  assert.throws(
    () =>
      createAgencyProviderSettings({
        id: "aps_invalid_provider",
        agencyId: "agency_1",
        providerId: "bad_provider",
        environment: "sandbox",
        capabilities: ["dns"],
      }),
    /Invalid agency provider id/,
  );

  assert.throws(
    () =>
      createAgencyProviderSettings({
        id: "aps_invalid_env",
        agencyId: "agency_1",
        providerId: "manual",
        environment: "production",
        capabilities: ["dns"],
      }),
    /Invalid agency provider environment/,
  );

  assert.throws(
    () =>
      createAgencyProviderSettings({
        id: "aps_invalid_cap",
        agencyId: "agency_1",
        providerId: "manual",
        environment: "contract",
        capabilities: ["dns", "ssl"],
      }),
    /Invalid agency provider capability/,
  );
});

test("agency provider settings: rejects credential-like value and keeps reference-only model", () => {
  assert.throws(
    () =>
      createAgencyProviderSettings({
        id: "aps_secret",
        agencyId: "agency_1",
        providerId: "manual",
        environment: "sandbox",
        capabilities: ["dns"],
        credentialReference: "my secret token value",
      }),
    /Credential reference must be a non-secret reference token/,
  );

  const safe = buildSettings();
  assert.equal(Object.prototype.hasOwnProperty.call(safe, "credentialValue"), false);
});
