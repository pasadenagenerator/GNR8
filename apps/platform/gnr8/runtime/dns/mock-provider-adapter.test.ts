import assert from "node:assert/strict";
import test from "node:test";

import { createDnsZoneIdentity, type DnsRecordSpec } from "@/gnr8/runtime/dns/dns-provider-types";
import {
  createMockDnsExpectedVerificationValue,
  createMockDnsProviderAdapter,
} from "@/gnr8/runtime/dns/mock-provider-adapter";

const zone = createDnsZoneIdentity({ providerId: "mock_provider", domain: "Example.com" });

const verificationRecord: DnsRecordSpec = {
  intent: "verification_txt",
  type: "txt",
  host: "_acme-challenge",
  name: "_acme-challenge.example.com",
  value: "placeholder",
  ttlSeconds: 60,
};

test("mock provider adapter: deterministic availability rules", async () => {
  const adapter = createMockDnsProviderAdapter();

  const available = await adapter.checkAvailability({ domain: "  READY.EXAMPLE.TEST. " });
  const unavailable = await adapter.checkAvailability({ domain: "taken.unavailable.test" });
  const reserved = await adapter.checkAvailability({ domain: "reserved.example.test" });

  assert.deepEqual(available, { available: true });
  assert.deepEqual(unavailable, { available: false, reason: "mock_fixture_unavailable" });
  assert.deepEqual(reserved, { available: false, reason: "mock_fixture_reserved" });
});

test("mock provider adapter: deterministic zone and record references", async () => {
  const adapter = createMockDnsProviderAdapter();

  const zoneResultA = await adapter.createZone({ zone });
  const zoneResultB = await adapter.createZone({ zone: { ...zone } });

  const recordResultA = await adapter.upsertRecord({ zone, record: verificationRecord });
  const recordResultB = await adapter.upsertRecord({ zone: { ...zone }, record: { ...verificationRecord } });

  assert.equal(zoneResultA.zoneReference, zoneResultB.zoneReference);
  assert.equal(recordResultA.recordReference, recordResultB.recordReference);
  assert.equal(zoneResultA.zoneReference.startsWith("mock_zone_"), true);
  assert.equal(recordResultA.recordReference.startsWith("mock_record_"), true);
});

test("mock provider adapter: verify behavior deterministic by expected record value", async () => {
  const adapter = createMockDnsProviderAdapter();
  const expectedValue = createMockDnsExpectedVerificationValue({
    zone,
    record: verificationRecord,
  });

  const verified = await adapter.verifyRecord({
    zone,
    record: {
      type: verificationRecord.type,
      host: verificationRecord.host,
      name: verificationRecord.name,
      value: expectedValue,
    },
  });

  const unverified = await adapter.verifyRecord({
    zone,
    record: {
      type: verificationRecord.type,
      host: verificationRecord.host,
      name: verificationRecord.name,
      value: "wrong-value",
    },
  });

  assert.deepEqual(verified, { verified: true, observedValue: expectedValue });
  assert.deepEqual(unverified, { verified: false, observedValue: "wrong-value" });
});

test("mock provider adapter: delete record deterministic and no external side effects", async () => {
  const adapter = createMockDnsProviderAdapter();

  let networkCalls = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (..._args: Parameters<typeof fetch>) => {
    networkCalls += 1;
    throw new Error("network_not_allowed");
  }) as typeof fetch;

  try {
    const result = await adapter.deleteRecord({
      zone,
      record: {
        type: verificationRecord.type,
        host: verificationRecord.host,
        name: verificationRecord.name,
        value: verificationRecord.value,
      },
    });
    assert.deepEqual(result, { deleted: true });
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = prevFetch;
  }
});
