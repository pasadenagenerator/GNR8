import assert from "node:assert/strict";
import test from "node:test";

import {
  createDnsCorrelationKey,
  createDnsRecordPlan,
  createDnsZoneIdentity,
  DNS_PROVIDER_CAPABILITIES,
  normalizeDnsDomain,
  normalizeDnsHost,
  type DnsProviderAdapterContract,
} from "@/gnr8/runtime/dns/dns-provider-types";

test("dns provider types: domain normalization", () => {
  assert.equal(normalizeDnsDomain("  ExAmPlE.COM.  "), "example.com");
});

test("dns provider types: host normalization", () => {
  assert.equal(normalizeDnsHost("WWW.Example.com.", "example.com"), "www");
  assert.equal(normalizeDnsHost("@", "example.com"), "@");
  assert.equal(normalizeDnsHost("example.com", "example.com"), "@");
});

test("dns provider types: apex vs www record plan", () => {
  const zone = createDnsZoneIdentity({ providerId: "manual", domain: "Example.com" });
  const plan = createDnsRecordPlan({
    zone,
    records: [
      {
        intent: "custom_www_domain",
        type: "cname",
        host: "www",
        value: "app.example-host.test",
        ttlSeconds: 300,
      },
      {
        intent: "custom_apex_domain",
        type: "a",
        host: "@",
        value: "76.76.21.21",
        ttlSeconds: 300,
      },
    ],
  });

  assert.equal(plan.records.length, 2);
  assert.equal(plan.records[0]?.host, "@");
  assert.equal(plan.records[0]?.name, "example.com");
  assert.equal(plan.records[1]?.host, "www");
  assert.equal(plan.records[1]?.name, "www.example.com");
});

test("dns provider types: TXT verification plan", () => {
  const zone = createDnsZoneIdentity({ providerId: "manual", domain: "example.com" });
  const plan = createDnsRecordPlan({
    zone,
    records: [
      {
        intent: "verification_txt",
        type: "txt",
        host: "_acme-challenge",
        value: "verify-token",
        ttlSeconds: 60,
      },
    ],
  });

  assert.equal(plan.records[0]?.type, "txt");
  assert.equal(plan.records[0]?.name, "_acme-challenge.example.com");
  assert.equal(plan.records[0]?.intent, "verification_txt");
});

test("dns provider types: deterministic ordering", () => {
  const zone = createDnsZoneIdentity({ providerId: "manual", domain: "example.com" });
  const a = createDnsRecordPlan({
    zone,
    records: [
      {
        intent: "verification_txt",
        type: "txt",
        host: "_b",
        value: "2",
        ttlSeconds: 60,
      },
      {
        intent: "verification_txt",
        type: "txt",
        host: "_a",
        value: "1",
        ttlSeconds: 60,
      },
    ],
  });

  const b = createDnsRecordPlan({
    zone,
    records: [
      {
        intent: "verification_txt",
        type: "txt",
        host: "_a",
        value: "1",
        ttlSeconds: 60,
      },
      {
        intent: "verification_txt",
        type: "txt",
        host: "_b",
        value: "2",
        ttlSeconds: 60,
      },
    ],
  });

  assert.deepEqual(
    a.records.map((record) => record.name),
    ["_a.example.com", "_b.example.com"],
  );
  assert.deepEqual(a.records, b.records);
  assert.equal(a.correlationKey, b.correlationKey);
});

test("dns provider types: stable correlation key", () => {
  const keyA = createDnsCorrelationKey({ b: 2, a: 1 });
  const keyB = createDnsCorrelationKey({ a: 1, b: 2 });
  assert.equal(keyA, keyB);
  assert.equal(keyA.length, 64);
});

test("dns provider types: provider capability registry exists for all providers", () => {
  assert.deepEqual(Object.keys(DNS_PROVIDER_CAPABILITIES).sort(), [
    "inwx",
    "manual",
    "netim",
    "openprovider",
    "realtime_register",
  ]);

  for (const [providerId, capability] of Object.entries(DNS_PROVIDER_CAPABILITIES)) {
    assert.equal(capability.providerId, providerId);
  }
});

test("dns provider types: adapter contract has no concrete network behavior", () => {
  const shapeOnly: DnsProviderAdapterContract = {
    providerId: "manual",
    capability: DNS_PROVIDER_CAPABILITIES.manual,
    checkAvailability: async () => ({ available: true }),
    createZone: async () => ({ zoneReference: "placeholder" }),
    upsertRecord: async () => ({ recordReference: "placeholder" }),
    deleteRecord: async () => ({ deleted: true }),
    verifyRecord: async () => ({ verified: true, observedValue: null }),
  };

  assert.equal(typeof shapeOnly.checkAvailability, "function");
  assert.equal(typeof shapeOnly.createZone, "function");
  assert.equal(typeof shapeOnly.upsertRecord, "function");
  assert.equal(typeof shapeOnly.deleteRecord, "function");
  assert.equal(typeof shapeOnly.verifyRecord, "function");
});
