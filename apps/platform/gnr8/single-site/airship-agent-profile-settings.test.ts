import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAirshipAgencyAISettingsReadModel,
  readAirshipAgencyAISettings,
  resolveOpenAIProviderConnectionStatus,
  sanitizeAirshipMaskedOpenAIKey,
  selectDefaultAirshipProfile,
} from "@/gnr8/single-site/airship-agent-profile-settings";
import type { AirshipOpenAIProviderStatus } from "@/gnr8/single-site/airship-openai-byok-provider";

function openAIStatus(overrides: Partial<AirshipOpenAIProviderStatus> = {}): AirshipOpenAIProviderStatus {
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected: true,
    status: "connected",
    maskedKey: "sk-...safe",
    model: "gpt-5",
    lastTestedAt: null,
    lastTestStatus: "passed",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:01:00.000Z",
    canUseAiCommands: true,
    ...overrides,
  };
}

test("Airship agency AI settings derives a default profile from connected OpenAI BYOK metadata", () => {
  const model = buildAirshipAgencyAISettingsReadModel({
    openAIProviderStatus: openAIStatus({ maskedKey: "sk-...abcd", model: "gpt-5-mini" }),
    generatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.equal(model.scope, "agency_level");
  assert.equal(model.flags.providerExecutionAdded, false);
  assert.equal(model.flags.rawKeysReturned, false);
  assert.equal(model.openAIProviderStatus.maskedKey, "sk-...abcd");
  assert.equal(model.providers[0]?.provider, "openai");
  assert.equal(model.providers[0]?.connectionStatus, "connected");
  assert.equal(model.providers.some((provider) => provider.provider === "gemini" && provider.planned), true);
  assert.equal(model.providers.some((provider) => provider.provider === "anthropic" && provider.enabled), false);
  assert.equal(model.providers.some((provider) => provider.provider === "groq" && provider.enabled), false);
  assert.equal(model.providers.some((provider) => provider.provider === "openrouter" && provider.enabled), false);

  const profile = model.selectedAirshipProfile.activeProfile;
  assert.ok(profile);
  assert.equal(profile.profileName, "Airship Editor Default");
  assert.equal(profile.provider, "openai");
  assert.equal(profile.model, "gpt-5-mini");
  assert.equal(profile.purpose, "airship_editor");
  assert.equal(profile.costPosture, "balanced");
  assert.equal(profile.enabled, true);
  assert.equal(profile.defaultProfile, true);
  assert.equal(profile.source, "derived_from_openai_byok_status");
});

test("Airship agency AI settings surfaces OpenAI test failed without exposing raw key material", () => {
  const rawKey = "sk-test-raw-key-should-not-return";
  const model = buildAirshipAgencyAISettingsReadModel({
    openAIProviderStatus: openAIStatus({
      maskedKey: "sk-...fail",
      lastTestStatus: "failed",
    }),
    generatedAt: "2026-09-09T00:00:00.000Z",
  });
  const rawInputModel = buildAirshipAgencyAISettingsReadModel({
    openAIProviderStatus: openAIStatus({
      maskedKey: rawKey,
    }),
    generatedAt: "2026-09-09T00:00:00.000Z",
  });
  const bodyText = JSON.stringify(rawInputModel);

  assert.equal(resolveOpenAIProviderConnectionStatus(openAIStatus({ lastTestStatus: "failed" })), "test_failed");
  assert.equal(model.providers[0]?.connectionStatus, "test_failed");
  assert.equal(rawInputModel.openAIProviderStatus.maskedKey, null);
  assert.equal(bodyText.includes(rawKey), false);
  assert.equal(bodyText.includes("raw-key-should-not-return"), false);
});

test("Airship agency AI settings returns a safe unavailable profile when provider status read fails", async () => {
  const model = await readAirshipAgencyAISettings({
    generatedAt: () => "2026-09-09T00:00:00.000Z",
    readOpenAIProviderStatus: async () => {
      throw new Error("simulated raw status read failure with sk-test-secret");
    },
  });
  const bodyText = JSON.stringify(model);

  assert.equal(model.selectedAirshipProfile.status, "unavailable");
  assert.equal(model.selectedAirshipProfile.activeProfile, null);
  assert.equal(model.selectedAirshipProfile.diagnostics.includes("airship_agent_profile_read_failed"), true);
  assert.equal(model.openAIProviderStatus.status, "read_error");
  assert.equal(model.flags.liveSiteMutation, false);
  assert.equal(model.flags.publishes, false);
  assert.equal(bodyText.includes("sk-test-secret"), false);
  assert.equal(bodyText.includes("simulated raw status read failure"), false);
});

test("Airship agent default selector only selects enabled default profiles", () => {
  const disabled = buildAirshipAgencyAISettingsReadModel({
    openAIProviderStatus: openAIStatus({ connected: false, status: "missing", maskedKey: null, canUseAiCommands: false }),
  }).profiles[0];

  assert.ok(disabled);
  assert.equal(selectDefaultAirshipProfile([disabled]).status, "unavailable");
  assert.equal(sanitizeAirshipMaskedOpenAIKey("sk-...abcd"), "sk-...abcd");
  assert.equal(sanitizeAirshipMaskedOpenAIKey("sk-real-secret-value"), null);
});
