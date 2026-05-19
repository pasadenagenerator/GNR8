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

function isUnavailableDomain(domain: string): boolean {
  if (domain.endsWith(".unavailable.test")) {
    return true;
  }

  return ["reserved", "taken", "blocked"].some((token) => domain.includes(token));
}

function evaluateAvailability(domainInput: string): { available: boolean; reason?: string } {
  const domain = normalizeDnsDomain(domainInput);
  if (!domain) {
    return { available: false, reason: "invalid_domain" };
  }

  if (isUnavailableDomain(domain)) {
    return { available: false, reason: "openprovider_sandbox_unavailable" };
  }

  return { available: true };
}

function expectedVerificationValue(input: {
  zone: DnsZoneIdentity;
  record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">;
}): string {
  const normalizedZone = normalizeZone(input.zone);
  const normalizedRecord = normalizeRecord(input.record, normalizedZone.domain);

  return createDeterministicRef("openprovider_sandbox_verify", {
    providerId: "openprovider",
    zoneId: normalizedZone.zoneId,
    domain: normalizedZone.domain,
    type: normalizedRecord.type,
    host: normalizedRecord.host,
    name: normalizedRecord.name,
  });
}

export function createOpenproviderSandboxAdapter(): DnsProviderAdapterContract {
  return {
    providerId: "openprovider",
    capability: DNS_PROVIDER_CAPABILITIES.openprovider,
    checkAvailability: async ({ domain }) => evaluateAvailability(domain),
    createZone: async ({ zone }) => {
      const normalizedZone = normalizeZone(zone);
      return {
        zoneReference: createDeterministicRef("openprovider_sandbox_zone", {
          providerId: "openprovider",
          zoneId: normalizedZone.zoneId,
          domain: normalizedZone.domain,
        }),
      };
    },
    upsertRecord: async ({ zone, record }) => {
      const normalizedZone = normalizeZone(zone);
      const normalizedRecord = normalizeRecord(record, normalizedZone.domain);
      return {
        recordReference: createDeterministicRef("openprovider_sandbox_record", {
          providerId: "openprovider",
          zoneId: normalizedZone.zoneId,
          domain: normalizedZone.domain,
          record: normalizedRecord,
        }),
      };
    },
    deleteRecord: async () => ({ deleted: true }),
    verifyRecord: async ({ zone, record }) => {
      const expectedValue = expectedVerificationValue({ zone, record });
      const observedValue = String(record.value ?? "").trim();
      return {
        verified: observedValue === expectedValue,
        observedValue,
      };
    },
  };
}

export function createOpenproviderSandboxExpectedVerificationValue(input: {
  zone: DnsZoneIdentity;
  record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">;
}): string {
  return expectedVerificationValue(input);
}
