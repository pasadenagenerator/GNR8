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
  readErrorAirshipOpenAIProviderStatus,
  AirshipOpenAIByokProviderService,
  PostgresAirshipOpenAIByokRepository,
  AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV,
  type AirshipOpenAIProviderCredential,
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
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
    canUseAiCommands: true,
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
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

test("airship OpenAI provider GET returns a safe API error if status unexpectedly fails", async () => {
  const handlers = createAirshipOpenAIProviderRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-openai",
    service: {
      async status() {
        throw new Error("simulated_status_failure");
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
  const bodyText = await response.text();
  const body = JSON.parse(bodyText) as { ok: boolean; error: string; diagnostics: string[] };

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.error, "AIRSHIP_OPENAI_PROVIDER_STATUS_FAILED");
  assert.equal(body.diagnostics.includes("airship_openai_provider_status_failed"), true);
  assert.equal(bodyText.includes("simulated_status_failure"), false);
});

test("airship OpenAI provider repository qualifies active credential timestamps and releases the client", async () => {
  const queries: string[] = [];
  let releaseCount = 0;
  const client = {
    async query(sql: string) {
      queries.push(sql);
      assert.match(sql, /from public\.gnr8_airship_ai_provider_credentials as c/i);
      assert.match(sql, /order by c\.updated_at desc/i);
      assert.doesNotMatch(sql, /order by updated_at desc/i);
      assert.match(sql, /c\.updated_at::text as updated_at/i);
      return {
        rows: [
          {
            id: "00000000-0000-4000-8000-000000000003",
            provider: "openai",
            scope: "airship_editor",
            owner_scope: "internal_superadmin",
            encrypted_secret: "ciphertext-only",
            encryption_iv: "iv",
            encryption_tag: "tag",
            secret_fingerprint_sha256: "a".repeat(64),
            masked_secret: "sk-...test",
            model: "gpt-5",
            status: "active",
            last_tested_at: "2026-09-03T00:03:00.000Z",
            last_test_status: "passed",
            created_at: "2026-09-03T00:00:00.000Z",
            updated_at: "2026-09-03T00:04:00.000Z",
            event_updated_at: "2026-09-03T00:05:00.000Z",
          },
        ],
      };
    },
    release() {
      releaseCount += 1;
    },
  };
  const repository = new PostgresAirshipOpenAIByokRepository({
    connect: async () => client,
  } as never);

  const credential = await repository.readActiveCredential();

  assert.equal(queries.length, 1);
  assert.equal(releaseCount, 1);
  assert.equal(credential?.id, "00000000-0000-4000-8000-000000000003");
  assert.equal(credential?.updatedAt, "2026-09-03T00:04:00.000Z");
  assert.equal(credential?.lastTestStatus, "passed");
});

test("airship OpenAI provider repository releases the client when active credential read fails", async () => {
  let releaseCount = 0;
  const repository = new PostgresAirshipOpenAIByokRepository({
    connect: async () => ({
      async query() {
        throw new Error("simulated_db_read_failure");
      },
      release() {
        releaseCount += 1;
      },
    }),
  } as never);

  await assert.rejects(repository.readActiveCredential(), /simulated_db_read_failure/);
  assert.equal(releaseCount, 1);
});

test("airship OpenAI provider repository rolls back and releases when test status update fails", async () => {
  const queries: string[] = [];
  let releaseCount = 0;
  const repository = new PostgresAirshipOpenAIByokRepository({
    connect: async () => ({
      async query(sql: string) {
        queries.push(sql);
        if (/^update public\.gnr8_airship_ai_provider_credentials/i.test(sql.trim())) {
          throw new Error("simulated_test_status_failure");
        }
        return { rows: [] };
      },
      release() {
        releaseCount += 1;
      },
    }),
  } as never);

  await assert.rejects(
    repository.markTestResult({
      credentialId: "00000000-0000-4000-8000-000000000004",
      passed: false,
      actorId: "superadmin-openai",
      summary: { statusCode: 503 },
    }),
    /simulated_test_status_failure/,
  );

  assert.equal(queries[0], "begin");
  assert.equal(queries.some((sql) => sql === "rollback"), true);
  assert.equal(queries.some((sql) => sql === "commit"), false);
  assert.equal(releaseCount, 1);
});

test("airship OpenAI provider status reports read errors without returning credential material", async () => {
  const previousSecret = process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV];
  process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV] = "test-encryption-secret-value-with-32-chars";
  try {
    const service = new AirshipOpenAIByokProviderService({
      async readActiveCredential() {
        throw new Error("ORDER BY updated_at is ambiguous");
      },
      async upsertCredential() {
        throw new Error("unexpected_write");
      },
      async markTestResult() {},
      async revokeCredential() {},
      async insertEvent() {},
    });

    const status = await service.status();
    const bodyText = JSON.stringify(status);

    assert.deepEqual(status, readErrorAirshipOpenAIProviderStatus());
    assert.equal(status.connected, false);
    assert.equal(status.canUseAiCommands, false);
    assert.equal(bodyText.includes("ORDER BY"), false);
    assert.equal(bodyText.includes("encrypted"), false);
    assert.equal(bodyText.includes("ciphertext"), false);
    assert.equal(bodyText.includes("sk-"), false);
  } finally {
    restoreEnv(AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV, previousSecret);
  }
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

test("airship OpenAI provider save requires backend credential readback before reporting connected", async () => {
  const previousSecret = process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV];
  process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV] = "test-encryption-secret-value-with-32-chars";
  try {
    let upserts = 0;
    const service = new AirshipOpenAIByokProviderService({
      async readActiveCredential() {
        return null;
      },
      async upsertCredential(input) {
        upserts += 1;
        return {
          id: "00000000-0000-4000-8000-000000000001",
          provider: "openai",
          scope: "airship_editor",
          ownerScope: "internal_superadmin",
          encryptedSecret: input.encryptedSecret,
          encryptionIv: input.encryptionIv,
          encryptionTag: input.encryptionTag,
          secretFingerprintSha256: input.secretFingerprintSha256,
          maskedKey: input.maskedKey,
          model: input.model,
          status: "active",
          lastTestedAt: null,
          lastTestStatus: null,
          createdAt: "2026-09-03T00:00:00.000Z",
          updatedAt: "2026-09-03T00:00:00.000Z",
        };
      },
      async markTestResult() {},
      async revokeCredential() {},
      async insertEvent() {},
    });

    await assert.rejects(
      service.save({ apiKey: "sk-test-readback-failure-key", model: "gpt-5", actorId: "superadmin-openai" }),
      /airship_openai_provider_readback_failed/,
    );
    assert.equal(upserts, 1);
  } finally {
    restoreEnv(AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV, previousSecret);
  }
});

test("airship OpenAI provider save returns connected readback status with timestamps", async () => {
  const previousSecret = process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV];
  process.env[AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV] = "test-encryption-secret-value-with-32-chars";
  try {
    let stored: AirshipOpenAIProviderCredential | null = null;
    const service = new AirshipOpenAIByokProviderService({
      async readActiveCredential() {
        return stored;
      },
      async upsertCredential(input) {
        stored = {
          id: "00000000-0000-4000-8000-000000000002",
          provider: "openai",
          scope: "airship_editor",
          ownerScope: "internal_superadmin",
          encryptedSecret: input.encryptedSecret,
          encryptionIv: input.encryptionIv,
          encryptionTag: input.encryptionTag,
          secretFingerprintSha256: input.secretFingerprintSha256,
          maskedKey: input.maskedKey,
          model: input.model,
          status: "active",
          lastTestedAt: null,
          lastTestStatus: null,
          createdAt: "2026-09-03T00:00:00.000Z",
          updatedAt: "2026-09-03T00:01:00.000Z",
        };
        return stored;
      },
      async markTestResult() {},
      async revokeCredential() {},
      async insertEvent() {},
    });

    const status = await service.save({ apiKey: "sk-test-readback-success-key", model: "gpt-5-mini", actorId: "superadmin-openai" });

    assert.equal(status.connected, true);
    assert.equal(status.provider, "openai");
    assert.equal(status.model, "gpt-5-mini");
    assert.equal(status.maskedKey, "sk-...-key");
    assert.equal(status.createdAt, "2026-09-03T00:00:00.000Z");
    assert.equal(status.updatedAt, "2026-09-03T00:01:00.000Z");
  } finally {
    restoreEnv(AIRSHIP_OPENAI_ENCRYPTION_KEY_ENV, previousSecret);
  }
});

test("airship OpenAI provider test reads the decrypted key server-side and redacts response payloads", async () => {
  let observedKey = "";
  let markedPassed = false;
  const handlers = createAirshipOpenAIProviderRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-openai",
    testOpenAIConnection: async (apiKey) => {
      observedKey = apiKey;
      return { ok: true, status: 200, diagnostic: "airship_openai_provider_test_passed" };
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

test("airship OpenAI provider test failure returns clear safe diagnostics and refreshed status", async () => {
  let markedPassed: boolean | null = null;
  const handlers = createAirshipOpenAIProviderRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-openai",
    testOpenAIConnection: async () => ({ ok: false, status: 404, diagnostic: "airship_openai_provider_model_unavailable" }),
    service: {
      async status() {
        return { ...connectedStatus(), lastTestStatus: "failed", lastTestedAt: "2026-09-03T00:02:00.000Z" };
      },
      async save() {
        return connectedStatus();
      },
      async revoke() {
        return missingAirshipOpenAIProviderStatus("revoked");
      },
      async readServerCredential() {
        return { apiKey: "sk-test-server-only-key", model: "gpt-5-does-not-exist", credentialId: "credential-openai" };
      },
      async markTestResult(input) {
        markedPassed = input.passed;
      },
    },
  });

  const response = await handlers.POST(request({ actionMode: "test_openai" }));
  const bodyText = await response.text();
  const body = JSON.parse(bodyText) as { error: string; diagnostics: string[]; providerStatus: AirshipOpenAIProviderStatus };

  assert.equal(response.status, 502);
  assert.equal(body.error, "AIRSHIP_OPENAI_PROVIDER_TEST_FAILED");
  assert.equal(body.diagnostics.includes("airship_openai_provider_model_unavailable"), true);
  assert.equal(body.providerStatus.connected, true);
  assert.equal(body.providerStatus.lastTestStatus, "failed");
  assert.equal(markedPassed, false);
  assert.equal(bodyText.includes("sk-test-server-only-key"), false);
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
