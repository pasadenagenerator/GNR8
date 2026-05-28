import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_CONTRACT_BY_ID,
  PROVIDER_CONTRACT_REGISTRY,
} from "@/gnr8/runtime/providers/provider-contract-registry";

test("provider contract registry exports deterministic providers", () => {
  assert.equal(PROVIDER_CONTRACT_REGISTRY.length, 4);
  assert.deepEqual(
    PROVIDER_CONTRACT_REGISTRY.map((provider) => provider.providerId),
    ["openprovider", "realtime_register", "inwx", "netim"],
  );
});

test("provider contract shapes include canonical contract fields", () => {
  for (const provider of PROVIDER_CONTRACT_REGISTRY) {
    assert.equal(typeof provider.providerId, "string");
    assert.equal(typeof provider.displayName, "string");
    assert.equal(typeof provider.providerType, "string");
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

test("registry remains read-model only with no execution runtime exports", () => {
  assert.equal("runtimeProviderExecution" in PROVIDER_CONTRACT_BY_ID, false);
});
