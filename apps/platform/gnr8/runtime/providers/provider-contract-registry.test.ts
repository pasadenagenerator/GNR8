import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_CONTRACT_BY_ID,
  PROVIDER_CONTRACT_REGISTRY,
} from "@/gnr8/runtime/providers/provider-contract-registry";

test("provider contract registry exports deterministic providers", () => {
  assert.equal(PROVIDER_CONTRACT_REGISTRY.length, 27);
  assert.deepEqual(
    PROVIDER_CONTRACT_REGISTRY.map((provider) => provider.providerId),
    [
      "openprovider",
      "realtime_register",
      "inwx",
      "netim",
      "vercel",
      "netlify",
      "cloudflare",
      "railway",
      "stripe",
      "paddle",
      "polar",
      "inngest",
      "trigger_dev",
      "temporal",
      "github",
      "gitlab",
      "openai",
      "anthropic",
      "gemini",
      "groq",
      "mistral",
      "supabase",
      "r2",
      "s3",
      "clerk",
      "auth0",
      "supabase_auth",
    ],
  );
});

test("provider contract shapes include canonical contract fields", () => {
  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    assert.equal(typeof provider.providerId, "string");
    assert.equal(typeof provider.displayName, "string");
    assert.equal(typeof provider.providerType, "string");
    assert.equal(typeof provider.providerCategory, "string");
    assert.equal(typeof provider.environment, "string");
    assert.equal(typeof provider.status, "string");
    assert.equal(typeof provider.capabilities.domains, "boolean");
    assert.equal(typeof provider.capabilities.dns, "boolean");
    assert.equal(typeof provider.capabilities.availability, "boolean");
    assert.equal(typeof provider.capabilities.registration, "boolean");
    assert.equal(typeof provider.capabilities.execution, "boolean");
    assert.equal(Array.isArray(provider.readiness), true);
    assert.equal(Array.isArray(provider.boundaries), true);
    assert.equal(Array.isArray(provider.advisor), true);
  }
});

test("openprovider contract preserves cockpit, domains, and dns links", () => {
  assert.deepEqual(PROVIDER_CONTRACT_BY_ID.openprovider.links, {
    cockpit: "/gnr8/admin/providers/openprovider",
    domains: "/gnr8/admin/providers/openprovider/domains",
    dns: "/gnr8/admin/providers/openprovider/dns",
  });
});

test("all non-openprovider contracts remain placeholder read-only control-plane contracts", () => {
  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    if (provider.providerId === "openprovider") continue;
    assert.equal(provider.status, "not_configured");
    assert.deepEqual(provider.readiness, ["not_configured", "control_plane_only"]);
    assert.deepEqual(provider.boundaries, ["execution_blocked", "read_only"]);
    assert.equal(provider.capabilities.domains, false);
    assert.equal(provider.capabilities.dns, false);
    assert.equal(provider.capabilities.availability, false);
    assert.equal(provider.capabilities.registration, false);
    assert.equal(provider.capabilities.execution, false);
    assert.equal(provider.links, undefined);
  }
});

test("ai providers include placeholder ai routing metadata while remaining execution blocked", () => {
  const aiProviderIds = ["openai", "anthropic", "gemini", "groq", "mistral"] as const;
  for (const providerId of aiProviderIds) {
    const provider = PROVIDER_CONTRACT_BY_ID[providerId];
    assert.equal(provider.providerCategory, "ai");
    assert.equal(provider.status, "not_configured");
    assert.deepEqual(provider.readiness, ["not_configured", "control_plane_only"]);
    assert.deepEqual(provider.boundaries, ["execution_blocked", "read_only"]);
    assert.notEqual(provider.aiRouting, undefined);
    assert.equal(provider.aiRouting!.modelFamilies.length > 0, true);
    assert.equal(provider.aiRouting!.strengths.length > 0, true);
    assert.equal(provider.aiRouting!.routingHints.length > 0, true);
    assert.equal(typeof provider.aiRouting!.latencyClass, "string");
    assert.equal(typeof provider.aiRouting!.costClass, "string");
    assert.equal(typeof provider.aiRouting!.contextWindowClass, "string");
  }
});

test("non-ai providers do not expose ai routing metadata", () => {
  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    if (provider.providerCategory === "ai") continue;
    assert.equal(provider.aiRouting, undefined);
  }
});

test("registry includes all requested provider taxonomy categories", () => {
  const categories = new Set(PROVIDER_CONTRACT_REGISTRY.map((provider) => provider.providerCategory));
  assert.deepEqual([...categories].sort(), [
    "ai",
    "commerce",
    "deployment",
    "execution",
    "identity",
    "registrar",
    "source_control",
    "storage",
  ]);
});

test("realtime register remains placeholder contract", () => {
  const realtimeRegister = PROVIDER_CONTRACT_BY_ID.realtime_register;
  assert.equal(realtimeRegister.status, "not_configured");
  assert.equal(realtimeRegister.capabilities.domains, false);
  assert.equal(realtimeRegister.capabilities.dns, false);
  assert.equal(realtimeRegister.capabilities.availability, false);
  assert.equal(realtimeRegister.capabilities.registration, false);
  assert.equal(realtimeRegister.capabilities.execution, false);
  assert.equal(realtimeRegister.links, undefined);
});

test("openprovider remains the only operational provider", () => {
  const connectedProviders = PROVIDER_CONTRACT_REGISTRY.filter((provider) => provider.status === "connected");
  assert.deepEqual(connectedProviders.map((provider) => provider.providerId), ["openprovider"]);
});

test("registry remains read-model only with no execution runtime exports", () => {
  assert.equal("runtimeProviderExecution" in PROVIDER_CONTRACT_BY_ID, false);
});
