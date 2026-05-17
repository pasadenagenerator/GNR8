import {
  DNS_PROVIDER_CAPABILITIES,
  createDnsCorrelationKey,
  normalizeDnsDomain,
  normalizeDnsHost,
  normalizeDnsRecordName,
  type DnsProviderAdapterContract,
  type DnsRecordSpec,
  type DnsZoneIdentity,
} from "@/gnr8/runtime/dns/dns-provider-types";

function createDeterministicRef(prefix: string, payload: unknown): string {
  return `${prefix}_${createDnsCorrelationKey(payload).slice(0, 20)}`;
}

function normalizeZone(zone: DnsZoneIdentity): DnsZoneIdentity {
  const domain = normalizeDnsDomain(zone.domain);
  return {
    ...zone,
    domain,
  };
}

function normalizeRecord(record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">, domain: string) {
  const host = normalizeDnsHost(record.host, domain);
  return {
    type: record.type,
    host,
    name: normalizeDnsRecordName({ domain, host }),
    value: String(record.value ?? "").trim(),
  };
}

function evaluateAvailability(domainInput: string): { available: boolean; reason?: string } {
  const domain = normalizeDnsDomain(domainInput);

  if (!domain) {
    return { available: false, reason: "invalid_domain" };
  }
  if (domain.endsWith(".unavailable.test") || domain.includes("taken")) {
    return { available: false, reason: "mock_fixture_unavailable" };
  }
  if (domain.endsWith(".reserved.test") || domain.startsWith("reserved.")) {
    return { available: false, reason: "mock_fixture_reserved" };
  }
  return { available: true };
}

function expectedVerificationValue(input: {
  zone: DnsZoneIdentity;
  record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">;
}): string {
  const normalizedZone = normalizeZone(input.zone);
  const normalizedRecord = normalizeRecord(input.record, normalizedZone.domain);
  return createDeterministicRef("verify", {
    providerId: "mock_provider",
    zoneId: normalizedZone.zoneId,
    domain: normalizedZone.domain,
    type: normalizedRecord.type,
    host: normalizedRecord.host,
    name: normalizedRecord.name,
  });
}

export function createMockDnsProviderAdapter(): DnsProviderAdapterContract {
  return {
    providerId: "mock_provider",
    capability: DNS_PROVIDER_CAPABILITIES.mock_provider,
    checkAvailability: async ({ domain }) => evaluateAvailability(domain),
    createZone: async ({ zone }) => {
      const normalizedZone = normalizeZone(zone);
      return {
        zoneReference: createDeterministicRef("mock_zone", {
          providerId: "mock_provider",
          zoneId: normalizedZone.zoneId,
          domain: normalizedZone.domain,
        }),
      };
    },
    upsertRecord: async ({ zone, record }) => {
      const normalizedZone = normalizeZone(zone);
      const normalizedRecord = normalizeRecord(record, normalizedZone.domain);
      return {
        recordReference: createDeterministicRef("mock_record", {
          providerId: "mock_provider",
          zoneId: normalizedZone.zoneId,
          domain: normalizedZone.domain,
          record: normalizedRecord,
        }),
      };
    },
    deleteRecord: async () => ({ deleted: true }),
    verifyRecord: async ({ zone, record }) => {
      const expected = expectedVerificationValue({ zone, record });
      const observedValue = String(record.value ?? "").trim();
      return {
        verified: observedValue === expected,
        observedValue,
      };
    },
  };
}

export function createMockDnsExpectedVerificationValue(input: {
  zone: DnsZoneIdentity;
  record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">;
}): string {
  return expectedVerificationValue(input);
}
