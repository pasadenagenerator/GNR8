import { headers } from "next/headers";

import { OpenproviderDomainInventoryView } from "@/app/gnr8/admin/providers/openprovider/domains/openprovider-domain-inventory-view";
import type { OpenproviderDomainInventoryResult } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OpenproviderInventoryPayload = OpenproviderDomainInventoryResult & { error?: string };

const FALLBACK_PAYLOAD: OpenproviderInventoryPayload = {
  provider: "openprovider",
  readOnly: true,
  executionAllowed: false,
  executionBlocked: true,
  fetchedAt: new Date(0).toISOString(),
  domains: [],
  diagnostics: ["OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED", "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED"],
  error: "Failed to read Openprovider domain inventory",
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeInventoryPayload(value: unknown): OpenproviderInventoryPayload {
  if (!value || typeof value !== "object") return FALLBACK_PAYLOAD;
  const input = value as Record<string, unknown>;
  const domains = Array.isArray(input.domains) ? input.domains : [];
  return {
    provider: "openprovider",
    readOnly: true,
    executionAllowed: false,
    executionBlocked: true,
    fetchedAt: normalizeToken(input.fetchedAt) || new Date().toISOString(),
    diagnostics: normalizeList(input.diagnostics),
    error: normalizeToken(input.error) || undefined,
    domains: domains
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}))
      .map((entry) => ({
        domain: normalizeToken(entry.domain).toLowerCase(),
        provider: "openprovider" as const,
        status: normalizeToken(entry.status) || "unknown",
        expiryDate: normalizeToken(entry.expiryDate),
        nameservers: normalizeList(entry.nameservers),
        rawRef: normalizeToken(entry.rawRef) || undefined,
      }))
      .filter((entry) => entry.domain.length > 0)
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

async function fetchInventory(fetchImpl: typeof fetch = fetch): Promise<OpenproviderInventoryPayload> {
  const incomingHeaders = await headers();
  const host = normalizeToken(incomingHeaders.get("host"));
  if (!host) return FALLBACK_PAYLOAD;
  const forwardedProto = normalizeToken(incomingHeaders.get("x-forwarded-proto"));
  const proto = forwardedProto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  const endpoint = `${proto}://${host}/api/gnr8/admin/providers/openprovider/domains`;
  const cookie = normalizeToken(incomingHeaders.get("cookie"));
  const requestHeaders = cookie ? { cookie } : undefined;

  try {
    const response = await fetchImpl(endpoint, { method: "GET", cache: "no-store", headers: requestHeaders });
    const payload = normalizeInventoryPayload(await response.json().catch(() => ({})));
    if (!response.ok) {
      return {
        ...payload,
        diagnostics: normalizeList([...payload.diagnostics, "OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"]),
      };
    }
    return payload;
  } catch {
    return FALLBACK_PAYLOAD;
  }
}

export default async function OpenproviderDomainInventoryPage() {
  const payload = await fetchInventory();
  return <OpenproviderDomainInventoryView payload={payload} />;
}
