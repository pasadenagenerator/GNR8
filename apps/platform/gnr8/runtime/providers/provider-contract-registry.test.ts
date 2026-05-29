import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_CONTRACT_BY_ID,
  PROVIDER_CONTRACT_REGISTRY,
} from "@/gnr8/runtime/providers/provider-contract-registry";

test("provider contract registry exports deterministic providers", () => {
  assert.equal(PROVIDER_CONTRACT_REGISTRY.length, 31);
  assert.deepEqual(
    PROVIDER_CONTRACT_REGISTRY.map((provider) => provider.providerId),
    [
      "openprovider",
      "realtime_register",
      "inwx",
      "netim",
      "vercel",
      "netlify",
      "railway",
      "resend",
      "proton_mail",
      "microsoft_365",
      "pantheon",
      "cloudflare",
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
    assert.equal(typeof provider.environmentScope, "string");
    assert.equal(typeof provider.bindingScope, "string");
    assert.equal(typeof provider.status, "string");
    assert.equal(typeof provider.capabilities.domains, "boolean");
    assert.equal(typeof provider.capabilities.dns, "boolean");
    assert.equal(typeof provider.capabilities.availability, "boolean");
    assert.equal(typeof provider.capabilities.registration, "boolean");
    assert.equal(typeof provider.capabilities.execution, "boolean");
    assert.equal(typeof provider.capabilities.deployments, "boolean");
    assert.equal(typeof provider.capabilities.model_metadata, "boolean");
    assert.equal(typeof provider.capabilities.database, "boolean");
    assert.equal(typeof provider.capabilities.auth, "boolean");
    assert.equal(Array.isArray(provider.readiness), true);
    assert.equal(Array.isArray(provider.boundaries), true);
    assert.equal(Array.isArray(provider.advisor), true);
    assert.equal(typeof provider.credentialBoundary.credentialsRequired, "boolean");
    assert.equal(typeof provider.credentialBoundary.credentialStatus, "string");
    assert.equal(provider.credentialBoundary.secretResolution, "disabled");
    assert.equal(typeof provider.credentialBoundary.bindingRequired, "string");
  }
});

test("credential boundary preview values are deterministic and read-model only", () => {
  assert.equal(PROVIDER_CONTRACT_BY_ID.openprovider.credentialBoundary.credentialsRequired, true);
  assert.equal(PROVIDER_CONTRACT_BY_ID.openprovider.credentialBoundary.credentialStatus, "configured_reference_only");
  assert.equal(PROVIDER_CONTRACT_BY_ID.openprovider.credentialBoundary.secretResolution, "disabled");
  assert.equal(PROVIDER_CONTRACT_BY_ID.openprovider.credentialBoundary.bindingRequired, "global");

  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    assert.equal(provider.credentialBoundary.secretResolution, "disabled");
    assert.equal(provider.credentialBoundary.credentialsRequired, true);
    if (provider.providerId === "openprovider") continue;
    assert.equal(provider.credentialBoundary.credentialStatus, "missing");
    assert.equal(provider.credentialBoundary.bindingRequired, "global");
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
    if (provider.providerCategory === "ai") {
      assert.equal(provider.capabilities.model_metadata, true);
      assert.equal(provider.capabilities.routing_policy, true);
      assert.equal(provider.capabilities.inference, false);
      assert.equal(provider.capabilities.embeddings, false);
      assert.equal(provider.capabilities.multimodal, false);
    } else {
      assert.equal(provider.capabilities.domains, false);
      assert.equal(provider.capabilities.dns, false);
      assert.equal(provider.capabilities.availability, false);
      assert.equal(provider.capabilities.registration, false);
      assert.equal(provider.capabilities.execution, false);
    }
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
    assert.equal(provider.capabilities.model_metadata, true);
    assert.equal(provider.capabilities.routing_policy, true);
    assert.equal(provider.capabilities.inference, false);
    assert.equal(provider.capabilities.embeddings, false);
    assert.equal(provider.capabilities.multimodal, false);
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
    "communication",
    "deployment",
    "edge_infrastructure",
    "erp_accounting",
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

test("environment scope metadata is deterministic and preview-safe", () => {
  assert.equal(PROVIDER_CONTRACT_BY_ID.openprovider.environmentScope, "sandbox");
  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    if (provider.providerId === "openprovider") continue;
    assert.equal(provider.environmentScope, "global");
  }
});

test("binding scope metadata defaults to global for current fleet contracts", () => {
  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    assert.equal(provider.bindingScope, "global");
  }
});

test("openprovider preserves operational registrar capabilities", () => {
  const openprovider = PROVIDER_CONTRACT_BY_ID.openprovider;
  assert.equal(openprovider.capabilities.domains, true);
  assert.equal(openprovider.capabilities.dns, true);
  assert.equal(openprovider.capabilities.availability, true);
  assert.equal(openprovider.capabilities.registration, false);
  assert.equal(openprovider.capabilities.execution, false);
});

test("registry remains read-model only with no execution runtime exports", () => {
  assert.equal("runtimeProviderExecution" in PROVIDER_CONTRACT_BY_ID, false);
});

test("cloudflare is classified under edge infrastructure providers", () => {
  const cloudflare = PROVIDER_CONTRACT_BY_ID.cloudflare;
  assert.equal(cloudflare.providerCategory, "edge_infrastructure");
  assert.equal(cloudflare.capabilities.dns, false);
  assert.equal(cloudflare.capabilities.edge_compute, false);
  assert.equal(cloudflare.capabilities.object_storage, false);
  assert.equal(cloudflare.capabilities.cdn, false);
  assert.equal(cloudflare.capabilities.routing, false);
});

test("communication providers are present with communication capability taxonomy", () => {
  const providerIds = ["resend", "proton_mail", "microsoft_365"] as const;
  for (const providerId of providerIds) {
    const provider = PROVIDER_CONTRACT_BY_ID[providerId];
    assert.equal(provider.providerCategory, "communication");
    assert.equal(provider.capabilities.email_delivery, false);
    assert.equal(provider.capabilities.transactional_email, false);
    assert.equal(provider.capabilities.inbound_email, false);
    assert.equal(provider.capabilities.domains, false);
    assert.equal(provider.capabilities.webhooks, false);
    assert.equal(provider.status, "not_configured");
    assert.deepEqual(provider.readiness, ["not_configured", "control_plane_only"]);
    assert.deepEqual(provider.boundaries, ["execution_blocked", "read_only"]);
  }
});

test("pantheon is present under erp/accounting providers with erp capability taxonomy", () => {
  const pantheon = PROVIDER_CONTRACT_BY_ID.pantheon;
  assert.equal(pantheon.providerCategory, "erp_accounting");
  assert.equal(pantheon.capabilities.accounting, false);
  assert.equal(pantheon.capabilities.invoicing, false);
  assert.equal(pantheon.capabilities.bookkeeping, false);
  assert.equal(pantheon.capabilities.tax, false);
  assert.equal(pantheon.capabilities.synchronization, false);
  assert.equal(pantheon.status, "not_configured");
  assert.deepEqual(pantheon.readiness, ["not_configured", "control_plane_only"]);
  assert.deepEqual(pantheon.boundaries, ["execution_blocked", "read_only"]);
});
