import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDnsProviderAdapterContract,
  getDnsProviderAdapter,
  hasDnsProviderAdapter,
  listDnsProviderAdapters,
} from "@/gnr8/runtime/dns/provider-adapter-registry";

test("provider adapter registry: manual adapter available", () => {
  const adapter = getDnsProviderAdapter("manual");

  assert.ok(adapter);
  assert.equal(adapter?.providerId, "manual");
  assert.equal(hasDnsProviderAdapter("manual"), true);
});

test("provider adapter registry: mock adapter available", () => {
  const adapter = getDnsProviderAdapter("mock_provider");

  assert.ok(adapter);
  assert.equal(adapter?.providerId, "mock_provider");
  assert.equal(hasDnsProviderAdapter("mock_provider"), true);
});

test("provider adapter registry: future providers not available", () => {
  for (const providerId of ["realtime_register", "netim", "inwx"]) {
    assert.equal(getDnsProviderAdapter(providerId), null);
    assert.equal(hasDnsProviderAdapter(providerId), false);
  }
});

test("provider adapter registry: openprovider sandbox adapter available", () => {
  const adapter = getDnsProviderAdapter("openprovider");

  assert.ok(adapter);
  assert.equal(adapter?.providerId, "openprovider");
  assert.equal(hasDnsProviderAdapter("openprovider"), true);
});

test("provider adapter registry: unknown provider returns null", () => {
  assert.equal(getDnsProviderAdapter("unknown_provider"), null);
  assert.equal(hasDnsProviderAdapter("unknown_provider"), false);
});

test("provider adapter registry: list ordering stable", () => {
  const providerIds = listDnsProviderAdapters().map((entry) => entry.providerId);
  assert.deepEqual(providerIds, ["mock_provider", "manual", "openprovider", "realtime_register", "netim", "inwx"]);
});

test("provider adapter registry: manual adapter contract passes", async () => {
  const report = await assertDnsProviderAdapterContract("manual");

  assert.ok(report);
  assert.equal(report?.providerId, "manual");
  assert.equal(report?.contractStatus, "pass");
});

test("provider adapter registry: future provider contract unavailable but non-throwing", async () => {
  const mockReport = await assertDnsProviderAdapterContract("mock_provider");
  assert.ok(mockReport);
  assert.equal(mockReport?.providerId, "mock_provider");
  assert.equal(mockReport?.contractStatus, "pass");

  const openproviderReport = await assertDnsProviderAdapterContract("openprovider");
  assert.ok(openproviderReport);
  assert.equal(openproviderReport?.providerId, "openprovider");
  assert.equal(openproviderReport?.contractStatus, "pass");

  for (const providerId of ["realtime_register", "netim", "inwx", "unknown_provider"]) {
    const report = await assertDnsProviderAdapterContract(providerId);
    assert.equal(report, null);
  }
});
