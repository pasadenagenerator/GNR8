import { headers } from "next/headers";

import { OpenproviderDnsInventoryView } from "@/app/gnr8/admin/providers/openprovider/dns/openprovider-dns-inventory-view";
import type { OpenproviderDnsRecordInventoryResult } from "@/gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OpenproviderDnsInventoryPayload = OpenproviderDnsRecordInventoryResult & {
  fetchedAt: string;
  error?: string;
};

const FALLBACK_PAYLOAD: OpenproviderDnsInventoryPayload = {
  provider: "openprovider",
  readOnly: true,
  executionAllowed: false,
  executionBlocked: true,
  fetchedAt: new Date(0).toISOString(),
  domains: [],
  diagnostics: ["OPENPROVIDER_DNS_READ_FAILED_CLOSED", "OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED"],
  error: "Failed to read Openprovider DNS record inventory",
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizePayload(value: unknown): OpenproviderDnsInventoryPayload {
  if (!value || typeof value !== "object") return FALLBACK_PAYLOAD;
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
      .map((entry) => {
        const recordsInput = Array.isArray(entry.records) ? entry.records : [];
        return {
          domain: normalizeToken(entry.domain).toLowerCase(),
          records: recordsInput
            .map((record) => (record && typeof record === "object" ? (record as Record<string, unknown>) : {}))
            .map((record) => ({
              name: normalizeToken(record.name) || "@",
              type: normalizeToken(record.type).toUpperCase() || "UNKNOWN",
              value: normalizeToken(record.value),
              ttl: Number.isFinite(Number(record.ttl)) && Number(record.ttl) > 0 ? Math.floor(Number(record.ttl)) : 3600,
            }))
            .filter((record) => record.value.length > 0)
            .sort((left, right) => {
              const typeOrder = left.type.localeCompare(right.type);
              if (typeOrder !== 0) return typeOrder;
              const nameOrder = left.name.localeCompare(right.name);
              if (nameOrder !== 0) return nameOrder;
              return left.value.localeCompare(right.value);
            }),
        };
      })
      .filter((entry) => entry.domain.length > 0)
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

async function fetchInventory(fetchImpl: typeof fetch = fetch): Promise<OpenproviderDnsInventoryPayload> {
  const incomingHeaders = await headers();
  const host = normalizeToken(incomingHeaders.get("host"));
  if (!host) return FALLBACK_PAYLOAD;

  const forwardedProto = normalizeToken(incomingHeaders.get("x-forwarded-proto"));
  const proto = forwardedProto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  const endpoint = `${proto}://${host}/api/gnr8/admin/providers/openprovider/dns`;
  const cookie = normalizeToken(incomingHeaders.get("cookie"));
  const requestHeaders = cookie ? { cookie } : undefined;

  try {
    const response = await fetchImpl(endpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
    const payload = normalizePayload(await response.json().catch(() => ({})));

    if (!response.ok) {
      return {
        ...payload,
        diagnostics: normalizeList([...payload.diagnostics, "OPENPROVIDER_DNS_READ_FAILED_CLOSED"]),
      };
    }

    return payload;
  } catch {
    return FALLBACK_PAYLOAD;
  }
}

export default async function OpenproviderDnsInventoryPage() {
  const payload = await fetchInventory();
  return <OpenproviderDnsInventoryView payload={payload} />;
}
