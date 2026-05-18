import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAgencyProviderSettings, type AgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import {
  mapAgencyProviderSettingsRow,
  mapAgencyProviderSettingsToRow,
  type AgencyProviderSettingsRow,
} from "@/gnr8/runtime/providers/agency-provider-settings-store";

function buildSettings(input?: Partial<AgencyProviderSettings>): AgencyProviderSettings {
  return normalizeAgencyProviderSettings({
    id: "aps_1",
    agencyId: "agency_1",
    providerId: "openprovider",
    environment: "sandbox",
    credentialReference: "vault:gnr8/openprovider/shared",
    enabled: true,
    capabilities: ["domains", "dns"],
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
    ...input,
  });
}

test("agency provider settings store mapper: row roundtrip", () => {
  const settings = buildSettings();
  const row = mapAgencyProviderSettingsToRow(settings);
  const roundtrip = mapAgencyProviderSettingsRow(row);

  assert.deepEqual(roundtrip, settings);
});

test("agency provider settings store mapper: nullable credential reference maps correctly", () => {
  const settings = buildSettings({ credentialReference: undefined });
  const row = mapAgencyProviderSettingsToRow(settings);

  assert.equal(row.credential_reference, null);
  assert.equal(mapAgencyProviderSettingsRow(row).credentialReference, undefined);
});

test("agency provider settings store mapper: capabilities jsonb object and deterministic hydration", () => {
  const row: AgencyProviderSettingsRow = {
    id: "aps_1",
    agency_id: "agency_1",
    provider_id: "openprovider",
    environment: "sandbox",
    credential_reference: "vault:gnr8/openprovider/shared",
    enabled: true,
    capabilities: { domains: true, dns: true, mailboxes: false },
    created_at: "2026-05-18T10:00:00.000Z",
    updated_at: "2026-05-18T10:00:00.000Z",
  };

  const mapped = mapAgencyProviderSettingsRow(row);
  assert.deepEqual(mapped.capabilities, ["dns", "domains"]);
});

test("agency provider settings store mapper: pure mapping with no secret value fields", () => {
  const row = mapAgencyProviderSettingsToRow(buildSettings());
  assert.equal(typeof row.id, "string");
  assert.equal(Object.prototype.hasOwnProperty.call(row, "credential_value"), false);
});
