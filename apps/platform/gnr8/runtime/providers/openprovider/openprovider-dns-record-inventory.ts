import { readOpenproviderDomainInventory } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";
import {
  authenticateOpenprovider,
  defaultOpenproviderLogin,
  sanitizeOpenproviderDiagnostic,
  sanitizeOpenproviderToken,
} from "@/gnr8/runtime/providers/openprovider/openprovider-auth";

export type OpenproviderDnsRecordInventoryRecord = {
  name: string;
  type: string;
  value: string;
  ttl: number;
};

export type OpenproviderDnsRecordInventoryDomain = {
  domain: string;
  records: OpenproviderDnsRecordInventoryRecord[];
};

export type OpenproviderDnsRecordInventoryResult = {
  provider: "openprovider";
  readOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  domains: OpenproviderDnsRecordInventoryDomain[];
  diagnostics: string[];
};

type OpenproviderHttpResponse = {
  status: number;
  json: unknown;
};

type OpenproviderDnsRecordInventoryDependencies = {
  readOpenproviderDomainInventory: typeof readOpenproviderDomainInventory;
  login: (input: {
    endpoint: string;
    username: string;
    password: string;
  }) => Promise<OpenproviderHttpResponse>;
  fetchDnsRecords: (input: { endpoint: string; token: string }) => Promise<OpenproviderHttpResponse>;
};

const DEFAULT_DOMAIN_INVENTORY_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/search";
const DEFAULT_DNS_RECORDS_ENDPOINT_TEMPLATE = "https://api.openprovider.eu/v1beta/dns/zones/{domain}/records";

const DIAGNOSTIC_STARTED = "OPENPROVIDER_DNS_READ_STARTED";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_DNS_READ_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_DNS_READ_FAILED_CLOSED";
const DIAGNOSTIC_BOUNDARY = "OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED";

function sanitizeToken(value: unknown): string {
  return sanitizeOpenproviderToken(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePositiveTtl(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return 3600;
}

function normalizeType(value: unknown): string {
  const token = sanitizeToken(value).toUpperCase();
  return token || "UNKNOWN";
}

function normalizeRecordName(value: unknown): string {
  const token = sanitizeToken(value);
  return token || "@";
}

function recordValueCandidates(record: Record<string, unknown>): string[] {
  const candidates = [
    record.value,
    record.content,
    record.target,
    record.data,
    record.destination,
    isRecord(record.rdata) ? record.rdata.value : null,
  ];
  return candidates.map((entry) => sanitizeToken(entry)).filter(Boolean);
}

function normalizeRecord(value: unknown): OpenproviderDnsRecordInventoryRecord | null {
  if (!isRecord(value)) return null;
  const recordValues = recordValueCandidates(value);
  const recordValue = recordValues[0] ?? "";
  if (!recordValue) return null;

  return {
    name: normalizeRecordName(value.name ?? value.host),
    type: normalizeType(value.type ?? value.recordType),
    value: recordValue,
    ttl: parsePositiveTtl(value.ttl ?? value.ttl_sec ?? value.ttlSeconds),
  };
}

function normalizeRecordsPayload(payload: unknown): { supported: boolean; records: OpenproviderDnsRecordInventoryRecord[] } {
  const listCandidates: unknown[] = [];

  if (Array.isArray(payload)) listCandidates.push(payload);
  if (isRecord(payload)) {
    listCandidates.push(payload.records, payload.data, payload.results);
    if (isRecord(payload.data)) listCandidates.push(payload.data.records, payload.data.results);
    if (isRecord(payload.response)) {
      listCandidates.push(payload.response.records, payload.response.data);
      if (isRecord(payload.response.data)) listCandidates.push(payload.response.data.records, payload.response.data.results);
    }
  }

  for (const candidate of listCandidates) {
    if (!Array.isArray(candidate)) continue;
    const records = candidate
      .map((entry) => normalizeRecord(entry))
      .filter((entry): entry is OpenproviderDnsRecordInventoryRecord => entry !== null)
      .sort((left, right) => {
        const typeOrder = left.type.localeCompare(right.type);
        if (typeOrder !== 0) return typeOrder;
        const nameOrder = left.name.localeCompare(right.name);
        if (nameOrder !== 0) return nameOrder;
        return left.value.localeCompare(right.value);
      });
    return { supported: true, records };
  }

  return { supported: false, records: [] };
}

function buildDnsRecordsEndpoint(domain: string): string {
  const template = sanitizeToken(process.env.OPENPROVIDER_DNS_RECORDS_ENDPOINT_TEMPLATE) || DEFAULT_DNS_RECORDS_ENDPOINT_TEMPLATE;
  return template.replaceAll("{domain}", encodeURIComponent(domain));
}

async function defaultFetchDnsRecords(input: {
  endpoint: string;
  token: string;
}): Promise<OpenproviderHttpResponse> {
  const response = await fetch(input.endpoint, {
    method: "GET",
    headers: {
      authorization: `Bearer ${input.token}`,
    },
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

export async function readOpenproviderDnsRecordInventory(
  deps: Partial<OpenproviderDnsRecordInventoryDependencies> = {},
): Promise<OpenproviderDnsRecordInventoryResult> {
  const resolvedDeps: OpenproviderDnsRecordInventoryDependencies = {
    readOpenproviderDomainInventory,
    login: defaultOpenproviderLogin,
    fetchDnsRecords: defaultFetchDnsRecords,
    ...deps,
  };

  const diagnostics: string[] = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY];

  try {
    const inventoryEndpointForAuthDerivation =
      sanitizeToken(process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT) || DEFAULT_DOMAIN_INVENTORY_ENDPOINT;
    const auth = await authenticateOpenprovider({
      login: resolvedDeps.login,
      inventoryEndpointForAuthDerivation,
    });
    diagnostics.push(...auth.diagnostics);
    if (!auth.ok) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domains: [],
        diagnostics: uniqueSorted([
          ...diagnostics,
          DIAGNOSTIC_FAILED_CLOSED,
          "OPENPROVIDER_AUTH_FAILED_CLOSED",
        ]),
      };
    }
    const token = auth.token;

    const domainInventory = await resolvedDeps.readOpenproviderDomainInventory();
    if (!Array.isArray(domainInventory.domains) || domainInventory.domains.length === 0) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domains: [],
        diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_SUCCEEDED]),
      };
    }

    const domains: OpenproviderDnsRecordInventoryDomain[] = [];
    for (const domainEntry of domainInventory.domains) {
      const domain = sanitizeToken(domainEntry.domain).toLowerCase();
      if (!domain) continue;

      const response = await resolvedDeps.fetchDnsRecords({
        endpoint: buildDnsRecordsEndpoint(domain),
        token,
      });
      if (response.status < 200 || response.status >= 300) {
        return {
          provider: "openprovider",
          readOnly: true,
          executionAllowed: false,
          executionBlocked: true,
          domains: [],
          diagnostics: uniqueSorted([
            ...diagnostics,
            DIAGNOSTIC_FAILED_CLOSED,
            sanitizeOpenproviderDiagnostic(`OPENPROVIDER_DNS_HTTP_STATUS_${response.status}`),
          ]),
        };
      }

      const normalized = normalizeRecordsPayload(response.json);
      if (!normalized.supported) {
        return {
          provider: "openprovider",
          readOnly: true,
          executionAllowed: false,
          executionBlocked: true,
          domains: [],
          diagnostics: uniqueSorted([
            ...diagnostics,
            DIAGNOSTIC_FAILED_CLOSED,
            "OPENPROVIDER_DNS_RESPONSE_UNSUPPORTED_SHAPE",
          ]),
        };
      }

      domains.push({ domain, records: normalized.records });
    }

    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domains: domains.sort((left, right) => left.domain.localeCompare(right.domain)),
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_SUCCEEDED]),
    };
  } catch (error) {
    const message = sanitizeOpenproviderDiagnostic(sanitizeToken(error instanceof Error ? error.message : error));
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domains: [],
      diagnostics: uniqueSorted([
        ...diagnostics,
        DIAGNOSTIC_FAILED_CLOSED,
        message ? `OPENPROVIDER_DNS_READ_ERROR:${message}` : "OPENPROVIDER_DNS_READ_ERROR",
      ]),
    };
  }
}
