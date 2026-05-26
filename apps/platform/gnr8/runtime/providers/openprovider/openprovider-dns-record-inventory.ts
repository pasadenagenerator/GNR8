import { readOpenproviderDomainInventory } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";

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

const DEFAULT_AUTH_ENDPOINT = "https://api.openprovider.eu/v1beta/auth/login";
const DEFAULT_DNS_RECORDS_ENDPOINT_TEMPLATE = "https://api.openprovider.eu/v1beta/dns/zones/{domain}/records";

const DIAGNOSTIC_STARTED = "OPENPROVIDER_DNS_READ_STARTED";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_DNS_READ_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_DNS_READ_FAILED_CLOSED";
const DIAGNOSTIC_BOUNDARY = "OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED";

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sanitizeDiagnostic(value: string): string {
  const lowered = value.toLowerCase();
  if (lowered.includes("password") || lowered.includes("token") || lowered.includes("secret") || lowered.includes("bearer")) {
    return "credential_redacted";
  }
  return value;
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

function extractBearerToken(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as {
    token?: unknown;
    accessToken?: unknown;
    access_token?: unknown;
    data?: { token?: unknown; accessToken?: unknown; access_token?: unknown } | null;
    response?: { token?: unknown; accessToken?: unknown; access_token?: unknown; data?: { token?: unknown; accessToken?: unknown; access_token?: unknown } | null } | null;
  };
  const candidates = [
    root.token,
    root.accessToken,
    root.access_token,
    root.data?.token,
    root.data?.accessToken,
    root.data?.access_token,
    root.response?.token,
    root.response?.accessToken,
    root.response?.access_token,
    root.response?.data?.token,
    root.response?.data?.accessToken,
    root.response?.data?.access_token,
  ];
  for (const candidate of candidates) {
    const token = sanitizeToken(candidate);
    if (token) return token;
  }
  return "";
}

function deriveAuthEndpoint(): string {
  const explicit = sanitizeToken(process.env.OPENPROVIDER_AUTH_ENDPOINT);
  return explicit || DEFAULT_AUTH_ENDPOINT;
}

function buildDnsRecordsEndpoint(domain: string): string {
  const template = sanitizeToken(process.env.OPENPROVIDER_DNS_RECORDS_ENDPOINT_TEMPLATE) || DEFAULT_DNS_RECORDS_ENDPOINT_TEMPLATE;
  return template.replaceAll("{domain}", encodeURIComponent(domain));
}

async function defaultLogin(input: {
  endpoint: string;
  username: string;
  password: string;
}): Promise<OpenproviderHttpResponse> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ username: input.username, password: input.password }),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
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
    login: defaultLogin,
    fetchDnsRecords: defaultFetchDnsRecords,
    ...deps,
  };

  const diagnostics: string[] = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY];

  const username = sanitizeToken(process.env.OPENPROVIDER_SANDBOX_USERNAME ?? process.env.OPENPROVIDER_LIVE_USERNAME);
  const password = sanitizeToken(process.env.OPENPROVIDER_SANDBOX_PASSWORD ?? process.env.OPENPROVIDER_LIVE_PASSWORD);
  if (!username || !password) {
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domains: [],
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, "OPENPROVIDER_CREDENTIALS_MISSING"]),
    };
  }

  try {
    const auth = await resolvedDeps.login({
      endpoint: deriveAuthEndpoint(),
      username,
      password,
    });
    if (auth.status < 200 || auth.status >= 300) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domains: [],
        diagnostics: uniqueSorted([
          ...diagnostics,
          DIAGNOSTIC_FAILED_CLOSED,
          sanitizeDiagnostic(`OPENPROVIDER_AUTH_HTTP_STATUS_${auth.status}`),
        ]),
      };
    }

    const token = extractBearerToken(auth.json);
    if (!token) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domains: [],
        diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, "OPENPROVIDER_AUTH_TOKEN_MISSING"]),
      };
    }

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
            sanitizeDiagnostic(`OPENPROVIDER_DNS_HTTP_STATUS_${response.status}`),
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
    const message = sanitizeDiagnostic(sanitizeToken(error instanceof Error ? error.message : error));
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
