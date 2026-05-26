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
  login: (input: {
    endpoint: string;
    username: string;
    password: string;
  }) => Promise<OpenproviderHttpResponse>;
  fetchInventoryPage: (input: {
    endpoint: string;
    token: string;
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
const DEFAULT_AUTH_ENDPOINT = "https://api.openprovider.eu/v1beta/auth/login";
const DIAGNOSTIC_STARTED = "OPENPROVIDER_DOMAIN_INVENTORY_READ_STARTED";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_DOMAIN_INVENTORY_READ_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED";
const DIAGNOSTIC_BOUNDARY = "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED";
const DIAGNOSTIC_AUTH_STARTED = "OPENPROVIDER_AUTH_STARTED";
const DIAGNOSTIC_AUTH_SUCCEEDED = "OPENPROVIDER_AUTH_SUCCEEDED";
const DIAGNOSTIC_AUTH_FAILED_CLOSED = "OPENPROVIDER_AUTH_FAILED_CLOSED";
const DIAGNOSTIC_AUTH_TOKEN_MISSING = "OPENPROVIDER_AUTH_TOKEN_MISSING";

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

function deriveAuthEndpoint(inventoryEndpoint: string): string {
  const explicit = sanitizeToken(process.env.OPENPROVIDER_AUTH_ENDPOINT);
  if (explicit) return explicit;
  const endpoint = sanitizeToken(inventoryEndpoint);
  if (!endpoint) return DEFAULT_AUTH_ENDPOINT;
  try {
    const url = new URL(endpoint);
    url.pathname = "/v1beta/auth/login";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return DEFAULT_AUTH_ENDPOINT;
  }
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
  token: string;
}): Promise<OpenproviderHttpResponse> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({ limit: 1000, offset: 0 }),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
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
    body: JSON.stringify({
      username: input.username,
      password: input.password,
    }),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

export async function readOpenproviderDomainInventory(
  deps: Partial<OpenproviderDomainInventoryDependencies> = {},
): Promise<OpenproviderDomainInventoryResult> {
  const resolvedDeps: OpenproviderDomainInventoryDependencies = {
    login: defaultLogin,
    fetchInventoryPage: defaultFetchInventoryPage,
    now: () => new Date().toISOString(),
    ...deps,
  };

  const fetchedAt = resolvedDeps.now();
  const diagnostics = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY];

  const username = sanitizeToken(process.env.OPENPROVIDER_SANDBOX_USERNAME ?? process.env.OPENPROVIDER_LIVE_USERNAME);
  const password = sanitizeToken(process.env.OPENPROVIDER_SANDBOX_PASSWORD ?? process.env.OPENPROVIDER_LIVE_PASSWORD);
  const endpoint = sanitizeToken(process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT) || DEFAULT_ENDPOINT;
  const authEndpoint = deriveAuthEndpoint(endpoint);

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
    diagnostics.push(DIAGNOSTIC_AUTH_STARTED);
    const auth = await resolvedDeps.login({ endpoint: authEndpoint, username, password });
    if (auth.status < 200 || auth.status >= 300) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        fetchedAt,
        domains: [],
        diagnostics: uniqueSorted([
          ...diagnostics,
          DIAGNOSTIC_AUTH_FAILED_CLOSED,
          DIAGNOSTIC_FAILED_CLOSED,
          sanitizeDiagnostic(`OPENPROVIDER_AUTH_HTTP_STATUS_${auth.status}`),
        ]),
      };
    }
    diagnostics.push(DIAGNOSTIC_AUTH_SUCCEEDED);

    const token = extractBearerToken(auth.json);
    if (!token) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        fetchedAt,
        domains: [],
        diagnostics: uniqueSorted([
          ...diagnostics,
          DIAGNOSTIC_AUTH_FAILED_CLOSED,
          DIAGNOSTIC_FAILED_CLOSED,
          DIAGNOSTIC_AUTH_TOKEN_MISSING,
        ]),
      };
    }

    const response = await resolvedDeps.fetchInventoryPage({ endpoint, token });
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
