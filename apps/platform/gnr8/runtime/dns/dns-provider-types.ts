import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";

export type DnsProviderId =
  | "openprovider"
  | "realtime_register"
  | "netim"
  | "inwx"
  | "manual";

export interface DnsZoneIdentity {
  providerId: DnsProviderId;
  domain: string;
  zoneId: string;
  correlationKey: string;
}

export type DnsRecordType =
  | "a"
  | "aaaa"
  | "cname"
  | "txt"
  | "mx"
  | "ns"
  | "srv"
  | "caa"
  | "url_redirect";

export type DnsRecordIntent =
  | "internal_preview_host"
  | "custom_apex_domain"
  | "custom_www_domain"
  | "verification_txt"
  | "redirect_host";

export interface DnsRecordSpec {
  intent: DnsRecordIntent;
  type: DnsRecordType;
  host: string;
  name: string;
  value: string;
  ttlSeconds: number;
  priority?: number;
}

export interface DnsRecordPlan {
  zone: DnsZoneIdentity;
  records: DnsRecordSpec[];
  correlationKey: string;
}

export interface DnsProviderCapability {
  providerId: DnsProviderId;
  supportsApexAlias: boolean;
  supportsFlattenedCname: boolean;
  supportsHostRedirect: boolean;
  supportsTxtVerification: boolean;
  notes: string;
}

export interface DnsProviderAdapterContract {
  readonly providerId: DnsProviderId;
  readonly capability: DnsProviderCapability;
  checkAvailability(input: {
    domain: string;
  }): Promise<{ available: boolean; reason?: string }>;
  createZone(input: {
    zone: DnsZoneIdentity;
  }): Promise<{ zoneReference: string }>;
  upsertRecord(input: {
    zone: DnsZoneIdentity;
    record: DnsRecordSpec;
  }): Promise<{ recordReference: string }>;
  deleteRecord(input: {
    zone: DnsZoneIdentity;
    record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">;
  }): Promise<{ deleted: boolean }>;
  verifyRecord(input: {
    zone: DnsZoneIdentity;
    record: Pick<DnsRecordSpec, "type" | "host" | "name" | "value">;
  }): Promise<{ verified: boolean; observedValue?: string | null }>;
}

export const DNS_PROVIDER_CAPABILITIES: Record<DnsProviderId, DnsProviderCapability> = {
  openprovider: {
    providerId: "openprovider",
    supportsApexAlias: false,
    supportsFlattenedCname: false,
    supportsHostRedirect: true,
    supportsTxtVerification: true,
    notes: "placeholder capability map for future adapter integration",
  },
  realtime_register: {
    providerId: "realtime_register",
    supportsApexAlias: false,
    supportsFlattenedCname: false,
    supportsHostRedirect: true,
    supportsTxtVerification: true,
    notes: "placeholder capability map for future adapter integration",
  },
  netim: {
    providerId: "netim",
    supportsApexAlias: false,
    supportsFlattenedCname: false,
    supportsHostRedirect: true,
    supportsTxtVerification: true,
    notes: "placeholder capability map for future adapter integration",
  },
  inwx: {
    providerId: "inwx",
    supportsApexAlias: false,
    supportsFlattenedCname: false,
    supportsHostRedirect: true,
    supportsTxtVerification: true,
    notes: "placeholder capability map for future adapter integration",
  },
  manual: {
    providerId: "manual",
    supportsApexAlias: true,
    supportsFlattenedCname: true,
    supportsHostRedirect: true,
    supportsTxtVerification: true,
    notes: "placeholder capability map for manual DNS instruction workflows",
  },
};

export function normalizeDnsDomain(input: string): string {
  const normalized = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.+$/g, "");
  return normalized;
}

export function normalizeDnsHost(input: string, domain?: string): string {
  const normalizedDomain = domain ? normalizeDnsDomain(domain) : null;
  const normalized = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.+$/g, "");

  if (!normalized || normalized === "@") return "@";
  if (normalizedDomain && normalized === normalizedDomain) return "@";
  if (normalizedDomain && normalized.endsWith(`.${normalizedDomain}`)) {
    const relative = normalized.slice(0, -1 * (`.${normalizedDomain}`.length));
    return relative || "@";
  }
  return normalized;
}

export function normalizeDnsRecordName(input: { domain: string; host?: string | null }): string {
  const domain = normalizeDnsDomain(input.domain);
  const host = normalizeDnsHost(input.host ?? "@", domain);
  if (host === "@") return domain;
  return `${host}.${domain}`;
}

export function createDnsZoneIdentity(input: {
  providerId: DnsProviderId;
  domain: string;
}): DnsZoneIdentity {
  const domain = normalizeDnsDomain(input.domain);
  const zoneId = `zone_${sha256Hex(`${input.providerId}:${domain}`).slice(0, 20)}`;
  const correlationKey = createDnsCorrelationKey({
    providerId: input.providerId,
    domain,
    zoneId,
  });
  return {
    providerId: input.providerId,
    domain,
    zoneId,
    correlationKey,
  };
}

export function createDnsRecordPlan(input: {
  zone: DnsZoneIdentity;
  records: Array<Omit<DnsRecordSpec, "name" | "host"> & { host?: string | null }>;
}): DnsRecordPlan {
  const zone = createDnsZoneIdentity({
    providerId: input.zone.providerId,
    domain: input.zone.domain,
  });

  const records: DnsRecordSpec[] = input.records
    .map((record) => {
      const host = normalizeDnsHost(record.host ?? "@", zone.domain);
      const name = normalizeDnsRecordName({ domain: zone.domain, host });
      return {
        intent: record.intent,
        type: record.type,
        host,
        name,
        value: String(record.value ?? "").trim(),
        ttlSeconds: record.ttlSeconds,
        priority: record.priority,
      };
    })
    .sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.intent !== b.intent) return a.intent.localeCompare(b.intent);
      if (a.value !== b.value) return a.value.localeCompare(b.value);
      return a.ttlSeconds - b.ttlSeconds;
    });

  return {
    zone,
    records,
    correlationKey: createDnsCorrelationKey({ zone, records }),
  };
}

export function createDnsCorrelationKey(input: unknown): string {
  return sha256Hex(stableStringify(input));
}
