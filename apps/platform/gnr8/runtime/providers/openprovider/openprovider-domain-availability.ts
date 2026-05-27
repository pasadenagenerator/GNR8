import {
  authenticateOpenprovider,
  defaultOpenproviderLogin,
  sanitizeOpenproviderDiagnostic,
  sanitizeOpenproviderToken,
} from "@/gnr8/runtime/providers/openprovider/openprovider-auth";

export type OpenproviderDomainAvailabilityValue = true | false | "unknown";
export type OpenproviderDomainAvailabilityStatus = "available" | "unavailable" | "unsupported" | "failed_closed";

export type OpenproviderDomainAvailabilityResult = {
  provider: "openprovider";
  readOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  domain: string;
  available: OpenproviderDomainAvailabilityValue;
  status: OpenproviderDomainAvailabilityStatus;
  checkedAt: string;
  diagnostics: string[];
  providerSummary?: {
    topLevelKeys: string[];
    responseCode?: string;
    responseDesc?: string;
  };
};

type OpenproviderHttpResponse = { status: number; json: unknown };

type OpenproviderDomainAvailabilityDependencies = {
  login: (input: {
    endpoint: string;
    username: string;
    password: string;
  }) => Promise<OpenproviderHttpResponse>;
  checkAvailability: (input: {
    endpoint: string;
    method: "GET" | "POST";
    token: string;
    domain: string;
  }) => Promise<OpenproviderHttpResponse>;
  now: () => string;
};

const DEFAULT_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/check";
const DEFAULT_DOMAIN_INVENTORY_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/search";

const DIAGNOSTIC_STARTED = "OPENPROVIDER_AVAILABILITY_STARTED";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_AVAILABILITY_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED";
const DIAGNOSTIC_REQUEST_SHAPED = "OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED";
const DIAGNOSTIC_BOUNDARY_CONFIRMED = "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED";
const DIAGNOSTIC_UNSUPPORTED_SHAPE = "OPENPROVIDER_AVAILABILITY_RESPONSE_UNSUPPORTED_SHAPE";
const DIAGNOSTIC_PROVIDER_DESC_PRESENT = "OPENPROVIDER_AVAILABILITY_PROVIDER_DESC_PRESENT";

function isSensitiveValue(value: string): boolean {
  return /password|token|secret|bearer|credential|username|api[_-]?key|authorization/i.test(value);
}

function redactLabeledSecrets(input: string): string {
  let output = input;

  output = output.replace(
    /\b(password|token|secret|credential|credentials?|username|api[_-]?key|authorization)\b\s*([:=])\s*([^\s,;]+)/gi,
    (_match, label, separator) => `${label}${separator}[redacted]`,
  );

  output = output.replace(/\bBearer\s+([^\s,;]+)/gi, "Bearer [redacted]");
  return output;
}

function looksLikeOpaqueSecret(value: string): boolean {
  const compact = value.trim();
  if (!compact) return false;
  if (/^[A-Za-z0-9+/=_-]{24,}$/.test(compact)) return true;
  if (/^[A-Za-z0-9-_]{12,}\.[A-Za-z0-9-_]{12,}\.[A-Za-z0-9-_]{12,}$/.test(compact)) return true;
  return false;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function sanitizeProviderValue(value: unknown): string | undefined {
  const raw = sanitizeToken(value);
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (looksLikeOpaqueSecret(trimmed)) return "credential_redacted";
  const redacted = redactLabeledSecrets(trimmed);
  const sanitized = sanitizeToken(redacted);
  if (!sanitized) return undefined;
  return sanitized;
}

function summarizeProviderErrorPayload(payload: unknown): {
  providerTopLevelKeys: string[];
  providerResponseCode?: string;
  providerResponseDesc?: string;
} {
  const parsed = parseMaybeJson(payload);
  const root = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  if (!root) return { providerTopLevelKeys: [] };

  const providerTopLevelKeys = Object.keys(root)
    .map((key) => sanitizeToken(key))
    .filter((key) => key.length > 0 && !isSensitiveValue(key))
    .sort((a, b) => a.localeCompare(b));

  const providerResponseCode = sanitizeProviderValue(root.code);
  const providerResponseDesc = sanitizeProviderValue(root.desc);
  return {
    providerTopLevelKeys,
    providerResponseCode,
    providerResponseDesc,
  };
}

function sanitizeToken(value: unknown): string {
  return sanitizeOpenproviderToken(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeDomain(value: unknown): string {
  return sanitizeToken(value).toLowerCase();
}

function splitDomain(domain: string): { name: string; extension: string } | null {
  const clean = normalizeDomain(domain).replace(/\.+$/g, "");
  const labels = clean.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  const extension = labels.at(-1) ?? "";
  const name = labels.slice(0, -1).join(".");
  if (!name || !extension) return null;
  return { name, extension };
}

function resolveAvailabilityMethod(value: unknown): "GET" | "POST" {
  const normalized = sanitizeToken(value).toUpperCase();
  if (normalized === "GET") return "GET";
  if (normalized === "POST") return "POST";
  return "POST";
}

function sanitizeEndpointPath(value: string): string {
  try {
    const url = new URL(value);
    const path = sanitizeToken(url.pathname) || "/";
    return path.startsWith("/") ? path : `/${path}`;
  } catch {
    const trimmed = sanitizeToken(value).trim();
    const noQueryOrHash = trimmed.split("?")[0]?.split("#")[0] ?? "";
    if (!noQueryOrHash) return "/";
    const withLeadingSlash = noQueryOrHash.startsWith("/") ? noQueryOrHash : `/${noQueryOrHash}`;
    return sanitizeToken(withLeadingSlash) || "/";
  }
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "available", "free", "ok"].includes(normalized)) return true;
    if (["0", "false", "no", "unavailable", "taken", "registered", "active", "exists"].includes(normalized)) return false;
  }
  return null;
}

function normalizeAvailabilityFromPayload(payload: unknown): {
  supported: boolean;
  available: OpenproviderDomainAvailabilityValue;
  status: OpenproviderDomainAvailabilityStatus;
} {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!root) return { supported: false, available: "unknown", status: "unsupported" };

  const resultCandidate =
    (root.response && typeof root.response === "object" ? (root.response as Record<string, unknown>).data : null) ??
    root.data ??
    root.result ??
    root.results ??
    root;

  const listValue = Array.isArray(resultCandidate)
    ? resultCandidate[0]
    : resultCandidate && typeof resultCandidate === "object" && Array.isArray((resultCandidate as Record<string, unknown>).results)
      ? ((resultCandidate as Record<string, unknown>).results as unknown[])[0]
      : resultCandidate;

  const result = listValue && typeof listValue === "object" ? (listValue as Record<string, unknown>) : null;
  if (!result) return { supported: false, available: "unknown", status: "unsupported" };

  const boolCandidates = [
    result.available,
    result.is_available,
    result.isAvailable,
    result.free,
    result.can_register,
    result.canRegister,
    result.status,
    result.state,
  ];

  for (const candidate of boolCandidates) {
    const coerced = coerceBoolean(candidate);
    if (coerced === true) return { supported: true, available: true, status: "available" };
    if (coerced === false) return { supported: true, available: false, status: "unavailable" };
  }

  return { supported: false, available: "unknown", status: "unsupported" };
}

async function defaultCheckAvailability(input: {
  endpoint: string;
  method: "GET" | "POST";
  token: string;
  domain: string;
}): Promise<OpenproviderHttpResponse> {
  const parsed = splitDomain(input.domain);
  const body = parsed ? { domains: [{ name: parsed.name, extension: parsed.extension }] } : { domains: [{ domain: input.domain }] };

  const headers: HeadersInit = {
    authorization: `Bearer ${input.token}`,
  };
  let targetEndpoint = input.endpoint;
  const init: RequestInit = {
    method: input.method,
    headers,
  };

  if (input.method === "GET") {
    const url = new URL(input.endpoint);
    if (url.pathname.includes("/domains/check") && parsed) {
      url.searchParams.set("name", parsed.name);
      url.searchParams.set("extension", parsed.extension);
    } else {
      url.searchParams.set("domain", input.domain);
    }
    targetEndpoint = url.toString();
  } else {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(targetEndpoint, init);
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

export async function readOpenproviderDomainAvailability(
  domainInput: string,
  deps: Partial<OpenproviderDomainAvailabilityDependencies> = {},
): Promise<OpenproviderDomainAvailabilityResult> {
  const resolvedDeps: OpenproviderDomainAvailabilityDependencies = {
    login: defaultOpenproviderLogin,
    checkAvailability: defaultCheckAvailability,
    now: () => new Date().toISOString(),
    ...deps,
  };

  const checkedAt = resolvedDeps.now();
  const domain = normalizeDomain(domainInput);
  const diagnostics = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY_CONFIRMED];
  const endpoint = sanitizeToken(process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT) || DEFAULT_ENDPOINT;
  const availabilityMethod = resolveAvailabilityMethod(process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_METHOD);
  const endpointPathDiagnostic = sanitizeOpenproviderDiagnostic(
    `OPENPROVIDER_AVAILABILITY_ENDPOINT_PATH:${sanitizeEndpointPath(endpoint)}`,
  );
  const inventoryEndpointForAuthDerivation =
    sanitizeToken(process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT) || DEFAULT_DOMAIN_INVENTORY_ENDPOINT;
  diagnostics.push(sanitizeOpenproviderDiagnostic(`OPENPROVIDER_AVAILABILITY_METHOD_${availabilityMethod}`), endpointPathDiagnostic);

  if (!domain) {
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domain,
      available: "unknown",
      status: "failed_closed",
      checkedAt,
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, "OPENPROVIDER_AVAILABILITY_INVALID_DOMAIN"]),
    };
  }

  try {
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
        domain,
        available: "unknown",
        status: "failed_closed",
        checkedAt,
        diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED]),
      };
    }

    diagnostics.push(DIAGNOSTIC_REQUEST_SHAPED);
    const response = await resolvedDeps.checkAvailability({
      endpoint,
      method: availabilityMethod,
      token: auth.token,
      domain,
    });

    if (response.status < 200 || response.status >= 300) {
      const summary = summarizeProviderErrorPayload(response.json);
      const diagnosticsWithProvider = [
        ...diagnostics,
        DIAGNOSTIC_FAILED_CLOSED,
        sanitizeOpenproviderDiagnostic(`OPENPROVIDER_AVAILABILITY_HTTP_STATUS_${response.status}`),
      ];
      if (summary.providerResponseCode) {
        diagnosticsWithProvider.push(
          sanitizeOpenproviderDiagnostic(`OPENPROVIDER_AVAILABILITY_PROVIDER_CODE_${summary.providerResponseCode}`),
        );
      }
      if (summary.providerResponseDesc) {
        diagnosticsWithProvider.push(DIAGNOSTIC_PROVIDER_DESC_PRESENT);
      }

      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domain,
        available: "unknown",
        status: "failed_closed",
        checkedAt,
        diagnostics: uniqueSorted(diagnosticsWithProvider),
        providerSummary: {
          topLevelKeys: summary.providerTopLevelKeys,
          responseCode: summary.providerResponseCode,
          responseDesc: summary.providerResponseDesc,
        },
      };
    }

    const normalized = normalizeAvailabilityFromPayload(response.json);
    if (!normalized.supported) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domain,
        available: "unknown",
        status: "unsupported",
        checkedAt,
        diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_UNSUPPORTED_SHAPE]),
      };
    }

    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domain,
      available: normalized.available,
      status: normalized.status,
      checkedAt,
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_SUCCEEDED]),
    };
  } catch (error) {
    const message = sanitizeOpenproviderDiagnostic(sanitizeToken(error instanceof Error ? error.message : error));
    return {
      provider: "openprovider",
      readOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      domain,
      available: "unknown",
      status: "failed_closed",
      checkedAt,
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, message ? `OPENPROVIDER_READ_ERROR:${message}` : "OPENPROVIDER_READ_ERROR"]),
    };
  }
}
