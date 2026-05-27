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
    token: string;
    domain: string;
  }) => Promise<OpenproviderHttpResponse>;
  now: () => string;
};

const DEFAULT_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/check";

const DIAGNOSTIC_STARTED = "OPENPROVIDER_AVAILABILITY_STARTED";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_AVAILABILITY_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED";
const DIAGNOSTIC_REQUEST_SHAPED = "OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED";
const DIAGNOSTIC_BOUNDARY_CONFIRMED = "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED";
const DIAGNOSTIC_UNSUPPORTED_SHAPE = "OPENPROVIDER_AVAILABILITY_RESPONSE_UNSUPPORTED_SHAPE";

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
  token: string;
  domain: string;
}): Promise<OpenproviderHttpResponse> {
  const parsed = splitDomain(input.domain);
  const body = parsed
    ? { domains: [{ name: parsed.name, extension: parsed.extension }] }
    : { domains: [{ domain: input.domain }] };

  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
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
      inventoryEndpointForAuthDerivation: endpoint,
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
      token: auth.token,
      domain,
    });

    if (response.status < 200 || response.status >= 300) {
      return {
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        domain,
        available: "unknown",
        status: "failed_closed",
        checkedAt,
        diagnostics: uniqueSorted([
          ...diagnostics,
          DIAGNOSTIC_FAILED_CLOSED,
          sanitizeOpenproviderDiagnostic(`OPENPROVIDER_AVAILABILITY_HTTP_STATUS_${response.status}`),
        ]),
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
