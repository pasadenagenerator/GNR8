import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipOpenAIProviderRouteHandlers } from "@/app/api/gnr8/admin/airship/ai/provider/airship-openai-provider-route-handlers";
import {
  encryptAirshipOpenAIKey,
  decryptAirshipOpenAIKey,
  missingAirshipOpenAIProviderStatus,
  type AirshipOpenAIProviderStatus,
} from "@/gnr8/single-site/airship-openai-byok-provider";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/ai/provider/airship-openai-provider-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/ai/provider/route.ts");
const PROVIDER_SOURCE = path.join(APP_ROOT, "../gnr8/single-site/airship-openai-byok-provider.ts");
const MIGRATION_SOURCE = path.join(APP_ROOT, "../supabase/migrations/20260903120000_airship_openai_byok_provider_credentials.sql");

function request(body?: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/ai/provider", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function connectedStatus(): AirshipOpenAIProviderStatus {
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected: true,
    status: "connected",
    maskedKey: "sk-...test",
    model: "gpt-5",
    lastTestedAt: null,
    lastTestStatus: null,
    updatedAt: "2026-09-03T00:00:00.000Z",
    canUseAiCommands: true,
  };
}

test("airship OpenAI provider GET requires superadmin before reading status", async () => {
  let statusCalls = 0;
  const handlers = createAirshipOpenAIProviderRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
    service: {
      async status() {
        statusCalls += 1;
        return missingAirshipOpenAIProviderStatus();
      },
      async save() {
        return connectedStatus();
      },
      async revoke() {
        return missingAirshipOpenAIProviderStatus("revoked");
      },
      async readServerCredential() {
        return null;
      },
      async markTestResult() {},
    },
  });

  const response = await handlers.GET();
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 401);
  assert.equal(statusCalls, 0);
  assert.equal(body.diagnostics.includes("airship_openai_provider_superadmin_required"), true);
  assert.equal(body.mutationFlags.liveSiteMutation, false);
});

test("airship OpenAI provider status is masked and never returns the raw key", async () => {
  const rawKey = "sk-test-secret-key-should-never-return";
  const handlers = createAirshipOpenAIProviderRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-openai",
    service: {
      async status() {
        return connectedStatus();
      },
      async save(input) {
        assert.equal(input.apiKey, rawKey);
        return connectedStatus();
      },
      async revoke() {
        return missingAirshipOpenAIProviderStatus("revoked");
      },
      async readServerCredential() {
        return null;
      },
      async markTestResult() {},
    },
  });

  const response = await handlers.POST(request({
    actionMode: "save_openai",
    apiKey: rawKey,
    model: "gpt-5",
  }));
  const bodyText = await response.text();
  const body = JSON.parse(bodyText) as { providerStatus: AirshipOpenAIProviderStatus };

  assert.equal(response.status, 200);
  assert.equal(body.providerStatus.connected, true);
  assert.equal(body.providerStatus.maskedKey, "sk-...test");
  assert.equal(bodyText.includes(rawKey), false);
  assert.equal(bodyText.includes("secret-key-should-never-return"), false);
});

test("airship OpenAI provider test reads the decrypted key server-side and redacts response payloads", async () => {
  let observedKey = "";
  let markedPassed = false;
  const handlers = createAirshipOpenAIProviderRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-openai",
    fetchModels: async (apiKey) => {
      observedKey = apiKey;
      return { ok: true, status: 200 };
    },
    service: {
      async status() {
        return { ...connectedStatus(), lastTestStatus: "passed" };
      },
      async save() {
        return connectedStatus();
      },
      async revoke() {
        return missingAirshipOpenAIProviderStatus("revoked");
      },
      async readServerCredential() {
        return { apiKey: "sk-test-server-only-key", model: "gpt-5", credentialId: "credential-openai" };
      },
      async markTestResult(input) {
        markedPassed = input.passed;
      },
    },
  });

  const response = await handlers.POST(request({ actionMode: "test_openai" }));
  const bodyText = await response.text();

  assert.equal(response.status, 200);
  assert.equal(observedKey, "sk-test-server-only-key");
  assert.equal(markedPassed, true);
  assert.equal(bodyText.includes("sk-test-server-only-key"), false);
  assert.equal(bodyText.includes("rawProviderRequest"), true);
  assert.equal(bodyText.includes("rawProviderResponse"), true);
});

test("airship OpenAI encryption roundtrips without storing raw key in ciphertext fields", () => {
  const rawKey = "sk-test-local-encryption-roundtrip";
  const secret = "test-encryption-secret-value-with-32-chars";
  const encrypted = encryptAirshipOpenAIKey(rawKey, secret);
  const decrypted = decryptAirshipOpenAIKey({
    encryptedSecret: encrypted.encryptedSecret,
    encryptionIv: encrypted.encryptionIv,
    encryptionTag: encrypted.encryptionTag,
  }, secret);

  assert.equal(decrypted, rawKey);
  assert.equal(encrypted.encryptedSecret.includes(rawKey), false);
  assert.equal(encrypted.maskedKey, "sk-...trip");
});

test("airship OpenAI provider files keep secret storage narrow and RLS closed", () => {
  const source = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(ROUTE_SOURCE, "utf8"),
    readFileSync(PROVIDER_SOURCE, "utf8"),
    readFileSync(MIGRATION_SOURCE, "utf8"),
  ].join("\n");

  assert.equal(source.includes("gnr8_airship_ai_provider_credentials"), true);
  assert.equal(source.includes("encrypted_secret"), true);
  assert.equal(source.includes("alter table public.gnr8_airship_ai_provider_credentials force row level security"), true);
  assert.equal(source.includes("revoke all on table public.gnr8_airship_ai_provider_credentials from anon, authenticated"), true);
  assert.equal(source.includes("NEXT_PUBLIC_OPENAI"), false);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|active_site_version_id|gnr8_runtime_active_pointers|runtime\/versions\/.*\/publish|source-capture|provider\/domains/i);
});
