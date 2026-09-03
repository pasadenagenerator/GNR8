import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipAICommandRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/ai-command/airship-ai-command-route-handlers";
import { AirshipAICommandService, type AirshipHeroAICommandFields } from "@/gnr8/single-site/airship-ai-command-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/ai-command/airship-ai-command-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/ai-command/route.ts");
const SERVICE_SOURCE = path.join(APP_ROOT, "../gnr8/single-site/airship-ai-command-service.ts");
const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";

function fields(overrides: Partial<AirshipHeroAICommandFields> = {}): AirshipHeroAICommandFields {
  return {
    headline: "Less risk. More control. Better IT.",
    subheading: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
    ctaLabel: "Contact CHS at sales@chs.si",
    topPadding: 72,
    bottomPadding: 72,
    backgroundTint: "#ecfeff",
    ctaColor: "#0f766e",
    ...overrides,
  };
}

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/ai-command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("airship AI command route is superadmin-gated before provider command execution", async () => {
  let commandCalls = 0;
  const handlers = createAirshipAICommandRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: {
      async run() {
        commandCalls += 1;
        return {
          fields: fields(),
          changedTextFields: [],
          changedStyleFields: [],
          message: "No changes.",
          supported: false,
          provider: "openai",
          rawProviderPayloadsPersisted: false,
          redactions: [],
          mutationFlags: {
            draftDataMutation: false,
            liveSiteMutation: false,
            runtimeVersionMutation: false,
            activePointerMutation: false,
            publishes: false,
            dryRun: false,
            shadowPublish: false,
            rollback: false,
          },
        };
      },
    },
  });

  const response = await handlers.POST(request({ migrationId: MIGRATION_ID, command: "naredi naslov bolj jasen", fields: fields() }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(commandCalls, 0);
  assert.equal(body.diagnostics.includes("airship_ai_command_superadmin_required"), true);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});

test("airship AI command route returns draft-only normalized changes and no raw provider payload", async () => {
  const handlers = createAirshipAICommandRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    service: new AirshipAICommandService({
      providerService: {
        async readServerCredential() {
          return { apiKey: "sk-test-server-only-command-key", model: "gpt-5", credentialId: "credential-command" };
        },
        async markTestResult() {},
      },
      async callOpenAI() {
        return {
          status: 200,
          outputText: JSON.stringify({
            fields: fields({ headline: "CHS makes enterprise IT clearer and safer" }),
            message: "Headline clarified.",
          }),
        };
      },
    }),
  });

  const response = await handlers.POST(request({ migrationId: MIGRATION_ID, command: "naredi naslov bolj jasen", fields: fields() }));
  const bodyText = await response.text();
  const body = JSON.parse(bodyText) as { ok: boolean; result: { changedTextFields: string[]; mutationFlags: Record<string, boolean>; rawProviderPayloadsPersisted: boolean } };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(body.result.changedTextFields, ["headline"]);
  assert.equal(body.result.mutationFlags.draftDataMutation, true);
  assert.equal(body.result.mutationFlags.liveSiteMutation, false);
  assert.equal(body.result.mutationFlags.runtimeVersionMutation, false);
  assert.equal(body.result.mutationFlags.activePointerMutation, false);
  assert.equal(body.result.mutationFlags.publishes, false);
  assert.equal(body.result.rawProviderPayloadsPersisted, false);
  assert.equal(bodyText.includes("sk-test-server-only-command-key"), false);
  assert.equal(bodyText.includes("Current fields"), false);
});

test("airship AI command route reports missing provider without mutating drafts or live runtime", async () => {
  const handlers = createAirshipAICommandRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    service: new AirshipAICommandService({
      providerService: {
        async readServerCredential() {
          return null;
        },
        async markTestResult() {},
      },
      async callOpenAI() {
        throw new Error("should_not_call_provider");
      },
    }),
  });

  const response = await handlers.POST(request({ migrationId: MIGRATION_ID, command: "skrajšaj podnaslov", fields: fields() }));
  const body = await response.json() as { error: string; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 409);
  assert.equal(body.error, "AIRSHIP_OPENAI_PROVIDER_MISSING");
  assert.equal(body.mutationFlags.draftDataMutation, false);
  assert.equal(body.mutationFlags.liveSiteMutation, false);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});

test("airship AI command service blocks forbidden live-site commands and keeps CHS identity guard", async () => {
  let providerCalls = 0;
  const service = new AirshipAICommandService({
    providerService: {
      async readServerCredential() {
        return { apiKey: "sk-test-server-only-command-key", model: "gpt-5", credentialId: "credential-command" };
      },
      async markTestResult() {},
    },
    async callOpenAI() {
      providerCalls += 1;
      return {
        status: 200,
        outputText: JSON.stringify({
          fields: fields({ headline: "TRANSPORTI MAVER D.O.O." }),
          message: "Unsafe provider output.",
        }),
      };
    },
  });

  const blocked = await service.run({ command: "publish this to live site", fields: fields(), actorId: "superadmin-airship" });
  assert.equal(blocked.supported, false);
  assert.equal(blocked.mutationFlags.liveSiteMutation, false);
  assert.equal(providerCalls, 0);

  await assert.rejects(
    service.run({ command: "naredi naslov bolj jasen", fields: fields(), actorId: "superadmin-airship" }),
    /airship_openai_provider_response_invalid/,
  );
});

test("airship AI command files do not expose publish, dry-run, rollback, or active-pointer actions", () => {
  const source = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(ROUTE_SOURCE, "utf8"),
    readFileSync(SERVICE_SOURCE, "utf8"),
  ].join("\n");

  assert.equal(source.includes("rawProviderPayloadsPersisted: false"), true);
  assert.equal(source.includes("draftDataMutation"), true);
  assert.equal(source.includes("liveSiteMutation: false"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|active_site_version_id|gnr8_runtime_active_pointers|runtime\/versions\/.*\/publish|source-capture|provider\/domains/i);
});
