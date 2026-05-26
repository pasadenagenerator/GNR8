export type OpenproviderDomainInventoryItem = {
  domain: string;
  provider: "openprovider";
  status: string;
  expiryDate: string;
  nameservers: string[];
  rawRef?: string;
};

export type OpenproviderDomainInventoryResult = {
  provider: "openprovider";
  readOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  fetchedAt: string;
  domains: OpenproviderDomainInventoryItem[];
  diagnostics: string[];
};

type OpenproviderHttpResponse = {
  status: number;
  json: unknown;
};

type OpenproviderDomainInventoryDependencies = {
  fetchInventoryPage: (input: {
    endpoint: string;
    username: string;
    password: string;
  }) => Promise<OpenproviderHttpResponse>;
  now: () => string;
};

type OpenproviderApiDomain = {
  name?: unknown;
  domain?: unknown;
  status?: unknown;
  expirationDate?: unknown;
  expiryDate?: unknown;
  nsGroup?: { nameServers?: unknown } | null;
  nameservers?: unknown;
  id?: unknown;
  handle?: unknown;
};

const DEFAULT_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/search";
const DIAGNOSTIC_STARTED = "OPENPROVIDER_DOMAIN_INVENTORY_READ_STARTED";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_DOMAIN_INVENTORY_READ_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED";
const DIAGNOSTIC_BOUNDARY = "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED";

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sanitizeDomain(value: unknown): string {
  return sanitizeToken(value).toLowerCase();
}

function sanitizeIsoDate(value: unknown): string {
  const token = sanitizeToken(value);
  if (!token) return "";
  const parsed = new Date(token);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function asNameservers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(value.map((entry) => sanitizeToken(entry)).filter(Boolean));
}

function sanitizeDiagnostic(value: string): string {
  const lowered = value.toLowerCase();
  if (lowered.includes("password") || lowered.includes("token") || lowered.includes("secret") || lowered.includes("bearer")) {
    return "credential_redacted";
  }
  return value;
}

function normalizeDomainItem(item: OpenproviderApiDomain): OpenproviderDomainInventoryItem | null {
  const domain = sanitizeDomain(item.name ?? item.domain);
  if (!domain) return null;
  const status = sanitizeToken(item.status) || "unknown";
  const expiryDate = sanitizeIsoDate(item.expirationDate ?? item.expiryDate) || "unknown";
  const nameservers = asNameservers(item.nsGroup?.nameServers ?? item.nameservers);
  const rawRef = sanitizeToken(item.id ?? item.handle) || undefined;
  return {
    domain,
    provider: "openprovider",
    status,
    expiryDate,
    nameservers,
    rawRef,
  };
}

function normalizeInventoryResponse(payload: unknown): OpenproviderDomainInventoryItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as {
    data?: { results?: unknown } | null;
    response?: { data?: { results?: unknown } | null } | null;
    results?: unknown;
  };

  const candidates = [
    root.data?.results,
    root.response?.data?.results,
    root.results,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate
      .map((entry) => normalizeDomainItem((entry ?? {}) as OpenproviderApiDomain))
      .filter((entry): entry is OpenproviderDomainInventoryItem => entry !== null)
      .sort((left, right) => left.domain.localeCompare(right.domain));
  }

  return [];
}

async function defaultFetchInventoryPage(input: {
  endpoint: string;
  username: string;
  password: string;
}): Promise<OpenproviderHttpResponse> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-openprovider-username": input.username,
      "x-openprovider-password": input.password,
    },
    body: JSON.stringify({ limit: 1000, offset: 0 }),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

export async function readOpenproviderDomainInventory(
  deps: Partial<OpenproviderDomainInventoryDependencies> = {},
): Promise<OpenproviderDomainInventoryResult> {
  const resolvedDeps: OpenproviderDomainInventoryDependencies = {
    fetchInventoryPage: defaultFetchInventoryPage,
    now: () => new Date().toISOString(),
    ...deps,
  };

  const fetchedAt = resolvedDeps.now();
  const diagnostics = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY];

  const username = sanitizeToken(process.env.OPENPROVIDER_SANDBOX_USERNAME ?? process.env.OPENPROVIDER_LIVE_USERNAME);
  const password = sanitizeToken(process.env.OPENPROVIDER_SANDBOX_PASSWORD ?? process.env.OPENPROVIDER_LIVE_PASSWORD);
  const endpoint = sanitizeToken(process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT) || DEFAULT_ENDPOINT;

  if (!username || !password) {
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      fetchedAt,
      domains: [],
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, "OPENPROVIDER_CREDENTIALS_MISSING"]),
    };
  }

  try {
    const response = await resolvedDeps.fetchInventoryPage({ endpoint, username, password });
    if (response.status < 200 || response.status >= 300) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        fetchedAt,
        domains: [],
        diagnostics: uniqueSorted([
          ...diagnostics,
          DIAGNOSTIC_FAILED_CLOSED,
          sanitizeDiagnostic(`OPENPROVIDER_HTTP_STATUS_${response.status}`),
        ]),
      };
    }

    const domains = normalizeInventoryResponse(response.json);
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      fetchedAt,
      domains,
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_SUCCEEDED]),
    };
  } catch (error) {
    const message = sanitizeDiagnostic(sanitizeToken(error instanceof Error ? error.message : error));
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      fetchedAt,
      domains: [],
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, message ? `OPENPROVIDER_READ_ERROR:${message}` : "OPENPROVIDER_READ_ERROR"]),
    };
  }
}
