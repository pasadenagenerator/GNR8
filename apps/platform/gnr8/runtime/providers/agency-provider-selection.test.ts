import assert from "node:assert/strict";
import test from "node:test";

import { resolveAgencyProviderSelection } from "@/gnr8/runtime/providers/agency-provider-selection";
import { normalizeAgencyProviderSettings, type AgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";

function buildSetting(input: Partial<AgencyProviderSettings>): AgencyProviderSettings {
  return normalizeAgencyProviderSettings({
    id: "aps_default",
    agencyId: "agency_1",
    providerId: "manual",
    environment: "contract",
    enabled: true,
    capabilities: ["dns"],
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
    ...input,
  });
}

test("agency provider selection: capability filtering", () => {
  const selection = resolveAgencyProviderSelection({
    agencyProviderSettings: [
      buildSetting({ id: "a1", providerId: "openprovider", environment: "sandbox", capabilities: ["mailboxes"] }),
      buildSetting({ id: "a2", providerId: "mock_provider", environment: "sandbox", capabilities: ["dns"] }),
    ],
    requiredCapability: "dns",
    preferredEnvironment: "sandbox",
  });

  assert.equal(selection.selectedProviderId, "mock_provider");
  assert.equal(selection.environment, "sandbox");
});

test("agency provider selection: environment preference used before fallback", () => {
  const selection = resolveAgencyProviderSelection({
    agencyProviderSettings: [
      buildSetting({ id: "a1", providerId: "mock_provider", environment: "contract", capabilities: ["dns"] }),
      buildSetting({ id: "a2", providerId: "mock_provider", environment: "sandbox", capabilities: ["dns"] }),
    ],
    requiredCapability: "dns",
    preferredEnvironment: "contract",
  });

  assert.equal(selection.selectedProviderId, "mock_provider");
  assert.equal(selection.environment, "contract");
});

test("agency provider selection: deterministic ordering across providers", () => {
  const settings = [
    buildSetting({ id: "a1", providerId: "inwx", environment: "sandbox" }),
    buildSetting({ id: "a2", providerId: "netim", environment: "sandbox" }),
    buildSetting({ id: "a3", providerId: "manual", environment: "sandbox" }),
    buildSetting({ id: "a4", providerId: "mock_provider", environment: "sandbox" }),
  ];

  const one = resolveAgencyProviderSelection({
    agencyProviderSettings: settings,
    requiredCapability: "dns",
    preferredEnvironment: "sandbox",
  });
  const two = resolveAgencyProviderSelection({
    agencyProviderSettings: [...settings].reverse(),
    requiredCapability: "dns",
    preferredEnvironment: "sandbox",
  });

  assert.equal(one.selectedProviderId, "mock_provider");
  assert.equal(two.selectedProviderId, "mock_provider");
  assert.equal(one.correlationKey, two.correlationKey);
});

test("agency provider selection: disabled providers ignored", () => {
  const selection = resolveAgencyProviderSelection({
    agencyProviderSettings: [
      buildSetting({ id: "a1", providerId: "mock_provider", environment: "sandbox", enabled: false }),
      buildSetting({ id: "a2", providerId: "manual", environment: "contract", enabled: true }),
    ],
    requiredCapability: "dns",
  });

  assert.equal(selection.selectedProviderId, "manual");
  assert.equal(selection.environment, "contract");
});

test("agency provider selection: fallback manual when nothing valid", () => {
  const selection = resolveAgencyProviderSelection({
    agencyProviderSettings: [
      buildSetting({ id: "a1", providerId: "mock_provider", environment: "sandbox", enabled: false }),
      buildSetting({ id: "a2", providerId: "openprovider", environment: "live", capabilities: ["mailboxes"] }),
    ],
    requiredCapability: "dns",
    preferredEnvironment: "sandbox",
  });

  assert.equal(selection.selectedProviderId, "manual");
  assert.equal(selection.environment, "sandbox");
  assert.equal(selection.warnings.includes("no_enabled_provider_with_required_capability"), true);
});

test("agency provider selection: correlation stability", () => {
  const left = resolveAgencyProviderSelection({
    agencyProviderSettings: [
      buildSetting({ id: "a1", providerId: "mock_provider", environment: "sandbox", capabilities: ["dns", "domains"] }),
      buildSetting({ id: "a2", providerId: "manual", environment: "contract", capabilities: ["dns"] }),
    ],
    requiredCapability: "dns",
    preferredEnvironment: "sandbox",
  });
  const right = resolveAgencyProviderSelection({
    agencyProviderSettings: [
      buildSetting({ id: "a2", providerId: "manual", environment: "contract", capabilities: ["dns"] }),
      buildSetting({ id: "a1", providerId: "mock_provider", environment: "sandbox", capabilities: ["domains", "dns"] }),
    ],
    requiredCapability: "dns",
    preferredEnvironment: "sandbox",
  });

  assert.equal(left.correlationKey, right.correlationKey);
});
