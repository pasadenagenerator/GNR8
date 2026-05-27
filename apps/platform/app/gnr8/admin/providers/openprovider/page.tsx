import { headers } from "next/headers";

import { OpenproviderProviderCockpitView } from "@/app/gnr8/admin/providers/openprovider/openprovider-provider-cockpit-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type DomainInventoryPayload = {
  provider: "openprovider";
  readOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  fetchedAt: string;
  domains: Array<{ domain: string }>;
  diagnostics: string[];
  error?: string;
};

type DnsInventoryPayload = {
  provider: "openprovider";
  readOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  fetchedAt: string;
  domains: Array<{ domain: string; records: Array<{ value: string }> }>;
  diagnostics: string[];
  error?: string;
};

type AvailabilityPayload = {
  provider: "openprovider";
  readOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  domain: string;
  available: true | false | "unknown";
  status: "available" | "unavailable" | "unsupported" | "failed_closed";
  checkedAt: string;
  diagnostics: string[];
  error?: string;
};

type CockpitPayload = {
  provider: "openprovider";
  mode: "sandbox" | "live" | "unknown";
  auth: "connected" | "unavailable";
  availabilityHealth: "working" | "unavailable";
  domainsCount: number;
  dnsRecordsCount: number;
  diagnostics: string[];
  domainInventory: DomainInventoryPayload;
  dnsInventory: DnsInventoryPayload;
  availability: AvailabilityPayload;
};

const FALLBACK_DOMAINS: DomainInventoryPayload = {
  provider: "openprovider",
  readOnly: true,
  executionAllowed: false,
  executionBlocked: true,
  fetchedAt: new Date(0).toISOString(),
  domains: [],
  diagnostics: ["OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED", "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED"],
  error: "Failed to read Openprovider domain inventory",
};

const FALLBACK_DNS: DnsInventoryPayload = {
  provider: "openprovider",
  readOnly: true,
  executionAllowed: false,
  executionBlocked: true,
  fetchedAt: new Date(0).toISOString(),
  domains: [],
  diagnostics: ["OPENPROVIDER_DNS_READ_FAILED_CLOSED", "OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED"],
  error: "Failed to read Openprovider DNS inventory",
};

const FALLBACK_AVAILABILITY: AvailabilityPayload = {
  provider: "openprovider",
  readOnly: true,
  executionAllowed: false,
  executionBlocked: true,
  domain: "levi-testis.com",
  available: "unknown",
  status: "failed_closed",
  checkedAt: new Date(0).toISOString(),
  diagnostics: [
    "OPENPROVIDER_AVAILABILITY_STARTED",
    "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED",
    "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED",
  ],
  error: "Failed to read Openprovider domain availability",
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeDomains(value: unknown): DomainInventoryPayload {
  if (!value || typeof value !== "object") return FALLBACK_DOMAINS;
  const input = value as Record<string, unknown>;
  const domainsInput = Array.isArray(input.domains) ? input.domains : [];

  return {
    provider: "openprovider",
    readOnly: true,
    executionAllowed: false,
    executionBlocked: true,
    fetchedAt: normalizeToken(input.fetchedAt) || new Date().toISOString(),
    diagnostics: normalizeList(input.diagnostics),
    error: normalizeToken(input.error) || undefined,
    domains: domainsInput
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}))
      .map((entry) => ({ domain: normalizeToken(entry.domain).toLowerCase() }))
      .filter((entry) => entry.domain.length > 0)
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

function normalizeDns(value: unknown): DnsInventoryPayload {
  if (!value || typeof value !== "object") return FALLBACK_DNS;
  const input = value as Record<string, unknown>;
  const domainsInput = Array.isArray(input.domains) ? input.domains : [];

  return {
    provider: "openprovider",
    readOnly: true,
    executionAllowed: false,
    executionBlocked: true,
    fetchedAt: normalizeToken(input.fetchedAt) || new Date().toISOString(),
    diagnostics: normalizeList(input.diagnostics),
    error: normalizeToken(input.error) || undefined,
    domains: domainsInput
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}))
      .map((entry) => ({
        domain: normalizeToken(entry.domain).toLowerCase(),
        records: (Array.isArray(entry.records) ? entry.records : [])
          .map((record) => (record && typeof record === "object" ? (record as Record<string, unknown>) : {}))
          .map((record) => ({ value: normalizeToken(record.value) }))
          .filter((record) => record.value.length > 0),
      }))
      .filter((entry) => entry.domain.length > 0)
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

function normalizeAvailability(value: unknown): AvailabilityPayload {
  if (!value || typeof value !== "object") return FALLBACK_AVAILABILITY;
  const input = value as Record<string, unknown>;
  const availableValue = input.available;
  const available = availableValue === true || availableValue === false ? availableValue : "unknown";
  const statusToken = normalizeToken(input.status);
  const status = (["available", "unavailable", "unsupported", "failed_closed"] as const).includes(
    statusToken as "available" | "unavailable" | "unsupported" | "failed_closed",
  )
    ? (statusToken as "available" | "unavailable" | "unsupported" | "failed_closed")
    : "failed_closed";

  return {
    provider: "openprovider",
    readOnly: true,
    executionAllowed: false,
    executionBlocked: true,
    domain: normalizeToken(input.domain) || "levi-testis.com",
    available,
    status,
    checkedAt: normalizeToken(input.checkedAt) || new Date().toISOString(),
    diagnostics: normalizeList(input.diagnostics),
    error: normalizeToken(input.error) || undefined,
  };
}

function mergeDiagnostics(payloads: Array<{ diagnostics?: string[] }>): string[] {
  return normalizeList(payloads.flatMap((payload) => (Array.isArray(payload.diagnostics) ? payload.diagnostics : [])));
}

function deriveMode(diagnostics: string[]): "sandbox" | "live" | "unknown" {
  const normalizedDiagnostics = diagnostics.join(" ").toLowerCase();
  if (normalizedDiagnostics.includes("sandbox")) return "sandbox";
  if (normalizedDiagnostics.includes("live")) return "live";

  const endpointSignals = [
    process.env.OPENPROVIDER_AUTH_ENDPOINT,
    process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT,
    process.env.OPENPROVIDER_DNS_RECORDS_ENDPOINT_TEMPLATE,
    process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT,
    process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT,
  ]
    .map((value) => normalizeToken(value).toLowerCase())
    .filter(Boolean);
  if (endpointSignals.some((value) => value.includes("sandbox"))) return "sandbox";
  if (endpointSignals.some((value) => value.includes("api.openprovider.eu"))) return "live";

  const hasSandboxCredentials = [process.env.OPENPROVIDER_SANDBOX_USERNAME, process.env.OPENPROVIDER_SANDBOX_PASSWORD].some(
    (value) => normalizeToken(value).length > 0,
  );
  if (hasSandboxCredentials) return "sandbox";

  return "unknown";
}

function deriveAuthStatus(diagnostics: string[]): "connected" | "unavailable" {
  return diagnostics.includes("OPENPROVIDER_AUTH_SUCCEEDED") ? "connected" : "unavailable";
}

async function fetchJson(
  endpoint: string,
  requestHeaders: HeadersInit | undefined,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; payload: unknown }> {
  try {
    const response = await fetchImpl(endpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, payload };
  } catch {
    return { ok: false, payload: {} };
  }
}

async function fetchCockpitPayload(fetchImpl: typeof fetch = fetch): Promise<CockpitPayload> {
  const incomingHeaders = await headers();
  const host = normalizeToken(incomingHeaders.get("host"));
  if (!host) {
    return {
      provider: "openprovider",
      mode: "unknown",
      auth: "unavailable",
      availabilityHealth: "unavailable",
      domainsCount: 0,
      dnsRecordsCount: 0,
      diagnostics: mergeDiagnostics([FALLBACK_DOMAINS, FALLBACK_DNS, FALLBACK_AVAILABILITY]),
      domainInventory: FALLBACK_DOMAINS,
      dnsInventory: FALLBACK_DNS,
      availability: FALLBACK_AVAILABILITY,
    };
  }

  const forwardedProto = normalizeToken(incomingHeaders.get("x-forwarded-proto"));
  const proto = forwardedProto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;
  const cookie = normalizeToken(incomingHeaders.get("cookie"));
  const requestHeaders = cookie ? { cookie } : undefined;

  const domainsResponse = await fetchJson(`${baseUrl}/api/gnr8/admin/providers/openprovider/domains`, requestHeaders, fetchImpl);
  const dnsResponse = await fetchJson(`${baseUrl}/api/gnr8/admin/providers/openprovider/dns`, requestHeaders, fetchImpl);
  const availabilityResponse = await fetchJson(
    `${baseUrl}/api/gnr8/admin/providers/openprovider/domain-availability?domain=levi-testis.com`,
    requestHeaders,
    fetchImpl,
  );

  const domainInventory = normalizeDomains(domainsResponse.payload);
  const dnsInventory = normalizeDns(dnsResponse.payload);
  const availability = normalizeAvailability(availabilityResponse.payload);

  const domainInventoryFinal = domainsResponse.ok
    ? domainInventory
    : { ...domainInventory, diagnostics: normalizeList([...domainInventory.diagnostics, "OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"]) };
  const dnsInventoryFinal = dnsResponse.ok
    ? dnsInventory
    : { ...dnsInventory, diagnostics: normalizeList([...dnsInventory.diagnostics, "OPENPROVIDER_DNS_READ_FAILED_CLOSED"]) };
  const availabilityFinal = availabilityResponse.ok
    ? availability
    : { ...availability, diagnostics: normalizeList([...availability.diagnostics, "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED"]) };

  const diagnostics = mergeDiagnostics([domainInventoryFinal, dnsInventoryFinal, availabilityFinal]);
  const domainsCount = domainInventoryFinal.domains.length;
  const dnsRecordsCount = dnsInventoryFinal.domains.reduce((sum, entry) => sum + entry.records.length, 0);
  const availabilityHealth = availabilityFinal.status === "available" ? "working" : "unavailable";

  return {
    provider: "openprovider",
    mode: deriveMode(diagnostics),
    auth: deriveAuthStatus(diagnostics),
    availabilityHealth,
    domainsCount,
    dnsRecordsCount,
    diagnostics,
    domainInventory: domainInventoryFinal,
    dnsInventory: dnsInventoryFinal,
    availability: availabilityFinal,
  };
}

export default async function OpenproviderProviderCockpitPage() {
  const payload = await fetchCockpitPayload();
  return <OpenproviderProviderCockpitView payload={payload} />;
}
