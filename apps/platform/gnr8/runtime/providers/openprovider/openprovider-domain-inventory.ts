import {
  authenticateOpenprovider,
  defaultOpenproviderLogin,
  sanitizeOpenproviderDiagnostic,
  sanitizeOpenproviderToken,
} from "@/gnr8/runtime/providers/openprovider/openprovider-auth";

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

type OpenproviderHttpResponse = { status: number; json: unknown };

type OpenproviderDomainInventoryDependencies = {
  login: (input: {
    endpoint: string;
    username: string;
    password: string;
  }) => Promise<OpenproviderHttpResponse>;
  fetchInventoryPage: (input: {
    endpoint: string;
    token: string;
    method: "GET" | "POST";
  }) => Promise<OpenproviderHttpResponse>;
  now: () => string;
};

type OpenproviderApiDomain = {
  name?: unknown;
  domain?: unknown;
  fqdn?: unknown;
  state?: unknown;
  status?: unknown;
  expiration_date?: unknown;
  expirationDate?: unknown;
  expiry_date?: unknown;
  expiryDate?: unknown;
  renew_date?: unknown;
  name_servers?: unknown;
  ns?: unknown;
  domainName?: unknown;
  extension?: unknown;
  tld?: unknown;
  nameServerGroup?: unknown;
  ns_group?: unknown;
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
const DIAGNOSTIC_REQUEST_SHAPED = "OPENPROVIDER_DOMAIN_INVENTORY_REQUEST_SHAPED";
const DIAGNOSTIC_RESPONSE_UNSUPPORTED_SHAPE = "OPENPROVIDER_DOMAIN_INVENTORY_RESPONSE_UNSUPPORTED_SHAPE";
const DIAGNOSTIC_EMPTY = "OPENPROVIDER_DOMAIN_INVENTORY_EMPTY";

function sanitizeToken(value: unknown): string {
  return sanitizeOpenproviderToken(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeObjectKeys(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return uniqueSorted(Object.keys(value).map((entry) => sanitizeToken(entry)).filter(Boolean));
}

function diagnosticKeys(prefix: string, value: unknown): string {
  const keys = safeObjectKeys(value);
  return `${prefix}:${keys.join(",")}`;
}

function asNameservers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(value.map((entry) => sanitizeToken(entry)).filter(Boolean));
}

function asReadableNameserverGroup(value: unknown): string[] {
  if (typeof value === "string") {
    const token = sanitizeToken(value);
    return token ? [token] : [];
  }
  if (Array.isArray(value)) {
    return uniqueSorted(value.map((entry) => sanitizeToken(entry)).filter(Boolean));
  }
  return [];
}

function joinDomainName(name: unknown, extension: unknown): string {
  const left = sanitizeToken(name).toLowerCase();
  const right = sanitizeToken(extension).toLowerCase().replace(/^\./, "");
  if (!left || !right) return "";
  return `${left}.${right}`;
}

function asDirectDomainField(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitizeDomain(value);
}

function normalizeDomainItem(item: OpenproviderApiDomain): OpenproviderDomainInventoryItem | null {
  const nestedName = isRecord(item.name) ? item.name : null;
  const nestedDomain = isRecord(item.domain) ? item.domain : null;
  const domain = [
    asDirectDomainField(item.name),
    asDirectDomainField(item.domain),
    asDirectDomainField(item.fqdn),
    joinDomainName(nestedName?.name, nestedName?.extension ?? nestedName?.tld),
    joinDomainName(nestedDomain?.name, nestedDomain?.extension ?? nestedDomain?.tld),
    asDirectDomainField(nestedName?.name),
    asDirectDomainField(nestedDomain?.name),
  ].find((entry) => Boolean(entry)) ?? "";
  if (!domain) return null;
  const status = sanitizeToken(item.status ?? item.state ?? nestedDomain?.status) || "unknown";
  const expiryDate =
    sanitizeIsoDate(
      item.expiration_date ??
        item.expirationDate ??
        item.expiry_date ??
        item.expiryDate ??
        item.renew_date,
    ) || "unknown";
  const nameservers = uniqueSorted([
    ...asNameservers(item.nameservers),
    ...asNameservers(item.name_servers),
    ...asNameservers(item.ns),
    ...asNameservers(item.nsGroup?.nameServers),
    ...asReadableNameserverGroup(item.ns_group),
    ...asReadableNameserverGroup(item.nameServerGroup),
  ]);
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

function resolveInventoryMethod(value: unknown): "GET" | "POST" {
  const method = sanitizeToken(value).toUpperCase();
  if (method === "GET") return "GET";
  return "POST";
}

function normalizeInventoryResponse(payload: unknown): {
  supported: boolean;
  domains: OpenproviderDomainInventoryItem[];
  emptyWithoutList: boolean;
} {
  if (Array.isArray(payload)) {
    return {
      supported: true,
      domains: payload
        .map((entry) => normalizeDomainItem((entry ?? {}) as OpenproviderApiDomain))
        .filter((entry): entry is OpenproviderDomainInventoryItem => entry !== null)
        .sort((left, right) => left.domain.localeCompare(right.domain)),
      emptyWithoutList: false,
    };
  }
  if (!payload || typeof payload !== "object") return { supported: false, domains: [], emptyWithoutList: false };
  const root = payload as {
    data?: unknown;
    response?: { data?: { results?: unknown } | null } | null;
    results?: unknown;
    domains?: unknown;
  };
  const data = root.data;
  const dataObject = isRecord(data) ? data : null;

  const candidates = [
    dataObject?.results,
    data,
    root.results,
    root.domains,
    root.response?.data?.results,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return {
      supported: true,
      domains: candidate
        .map((entry) => normalizeDomainItem((entry ?? {}) as OpenproviderApiDomain))
        .filter((entry): entry is OpenproviderDomainInventoryItem => entry !== null)
        .sort((left, right) => left.domain.localeCompare(right.domain)),
      emptyWithoutList: false,
    };
  }

  const dataTotal = dataObject?.total;
  if (typeof dataTotal === "number" && Number.isFinite(dataTotal)) {
    return { supported: true, domains: [], emptyWithoutList: true };
  }

  return { supported: false, domains: [], emptyWithoutList: false };
}

function unsupportedShapeDiagnostics(payload: unknown): string[] {
  const diagnostics = [
    DIAGNOSTIC_RESPONSE_UNSUPPORTED_SHAPE,
    diagnosticKeys("OPENPROVIDER_DOMAIN_INVENTORY_RESPONSE_KEYS", payload),
  ];
  if (isRecord(payload) && isRecord(payload.data)) {
    diagnostics.push(diagnosticKeys("OPENPROVIDER_DOMAIN_INVENTORY_DATA_KEYS", payload.data));
  }
  return diagnostics;
}

async function defaultFetchInventoryPage(input: {
  endpoint: string;
  token: string;
  method: "GET" | "POST";
}): Promise<OpenproviderHttpResponse> {
  const requestInit: RequestInit = {
    method: input.method,
    headers: {
      authorization: `Bearer ${input.token}`,
    },
  };
  if (input.method === "POST") {
    requestInit.headers = {
      ...requestInit.headers,
      "content-type": "application/json",
    };
    requestInit.body = JSON.stringify({ limit: 1000, offset: 0 });
  }
  const response = await fetch(input.endpoint, requestInit);
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

export async function readOpenproviderDomainInventory(
  deps: Partial<OpenproviderDomainInventoryDependencies> = {},
): Promise<OpenproviderDomainInventoryResult> {
  const resolvedDeps: OpenproviderDomainInventoryDependencies = {
    login: defaultOpenproviderLogin,
    fetchInventoryPage: defaultFetchInventoryPage,
    now: () => new Date().toISOString(),
    ...deps,
  };

  const fetchedAt = resolvedDeps.now();
  const diagnostics = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY];

  const endpoint = sanitizeToken(process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT) || DEFAULT_ENDPOINT;
  const inventoryMethod = resolveInventoryMethod(process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD);

  try {
    const auth = await authenticateOpenprovider({
      login: resolvedDeps.login,
      inventoryEndpointForAuthDerivation: endpoint,
    });
    diagnostics.push(...auth.diagnostics);
    if (!auth.ok) {
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
        ]),
      };
    }
    const token = auth.token;

    diagnostics.push(DIAGNOSTIC_REQUEST_SHAPED, `OPENPROVIDER_DOMAIN_INVENTORY_METHOD_${inventoryMethod}`);
    const response = await resolvedDeps.fetchInventoryPage({ endpoint, token, method: inventoryMethod });
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
          sanitizeOpenproviderDiagnostic(`OPENPROVIDER_DOMAIN_INVENTORY_HTTP_STATUS_${response.status}`),
        ]),
      };
    }

    const normalized = normalizeInventoryResponse(response.json);
    if (!normalized.supported) {
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
          ...unsupportedShapeDiagnostics(response.json),
        ]),
      };
    }

    const domains = normalized.domains;
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      fetchedAt,
      domains,
      diagnostics: uniqueSorted([
        ...diagnostics,
        DIAGNOSTIC_SUCCEEDED,
        ...(normalized.emptyWithoutList ? [DIAGNOSTIC_EMPTY] : []),
      ]),
    };
  } catch (error) {
    const message = sanitizeOpenproviderDiagnostic(sanitizeToken(error instanceof Error ? error.message : error));
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
