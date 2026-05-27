import {
  authenticateOpenprovider,
  defaultOpenproviderLogin,
  sanitizeOpenproviderDiagnostic,
  sanitizeOpenproviderToken,
} from "@/gnr8/runtime/providers/openprovider/openprovider-auth";

const DIAGNOSTIC_STARTED = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_STARTED";
const DIAGNOSTIC_AUTH_SUCCEEDED = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_AUTH_SUCCEEDED";
const DIAGNOSTIC_REQUEST_SENT = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_REQUEST_SENT";
const DIAGNOSTIC_SUCCEEDED = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_SUCCEEDED";
const DIAGNOSTIC_FAILED_CLOSED = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_FAILED_CLOSED";
const DIAGNOSTIC_BOUNDARY_CONFIRMED = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED";
const DIAGNOSTIC_PERIOD_APPLIED = "OPENPROVIDER_SANDBOX_REGISTER_PROBE_PERIOD_APPLIED";

const REQUIRED_ENV_FLAG = "OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED";
const REQUIRED_ENV_FLAG_VALUE = "1";
const SANDBOX_ENDPOINT_ENV = "OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT";

type OpenproviderHttpResponse = { status: number; json: unknown };

type OpenproviderSandboxRegisterProbeDependencies = {
  login: (input: {
    endpoint: string;
    username: string;
    password: string;
  }) => Promise<OpenproviderHttpResponse>;
  registerDomain: (input: {
    endpoint: string;
    token: string;
    payload: Record<string, unknown>;
  }) => Promise<OpenproviderHttpResponse>;
  now: () => string;
};

export type OpenproviderSandboxRegisterProbeResult = {
  provider: "openprovider";
  environment: "sandbox";
  adminOnly: true;
  diagnosticOnly: true;
  executionAllowed: false;
  executionBlocked: true;
  persisted: false;
  domain: string;
  probedAt: string;
  success: boolean;
  status: number;
  summary: {
    topLevelKeys: string[];
    responseCode: string | null;
    responseDesc: string | null;
  };
  diagnostics: string[];
};

function sanitizeToken(value: unknown): string {
  return sanitizeOpenproviderToken(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parseDomain(input: string): { fqdn: string; name: string; extension: string } | null {
  const fqdn = sanitizeToken(input).toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(fqdn)) return null;
  const parts = fqdn.split(".");
  if (parts.length < 2) return null;
  const extension = parts.pop() ?? "";
  const name = parts.join(".");
  if (!name || !extension) return null;
  return { fqdn, name, extension };
}

function readSandboxRegistrationEndpoint(): string {
  return sanitizeToken(process.env[SANDBOX_ENDPOINT_ENV]);
}

function isSandboxEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = sanitizeToken(url.hostname).toLowerCase();
    if (!host) return false;
    if (host === "api.openprovider.eu") return false;
    return host.includes("sandbox") || host.endsWith("openprovider.nl") || endpoint.includes(":8480");
  } catch {
    return false;
  }
}

function isProbeEnabled(): boolean {
  return sanitizeToken(process.env[REQUIRED_ENV_FLAG]) === REQUIRED_ENV_FLAG_VALUE;
}

function summarizeResponse(payload: unknown): { topLevelKeys: string[]; responseCode: string | null; responseDesc: string | null } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { topLevelKeys: [], responseCode: null, responseDesc: null };
  }
  const record = payload as Record<string, unknown>;
  const topLevelKeys = uniqueSorted(Object.keys(record));
  const nested = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? (record.data as Record<string, unknown>)
    : null;

  const codeCandidate = sanitizeToken(record.code ?? record.status ?? nested?.code);
  const descCandidate = sanitizeOpenproviderDiagnostic(sanitizeToken(record.desc ?? record.description ?? record.message ?? nested?.desc ?? nested?.description));

  return {
    topLevelKeys,
    responseCode: codeCandidate || null,
    responseDesc: descCandidate || null,
  };
}

async function defaultRegisterDomain(input: {
  endpoint: string;
  token: string;
  payload: Record<string, unknown>;
}): Promise<OpenproviderHttpResponse> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input.payload),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

export async function runOpenproviderSandboxRegisterDomainProbe(
  input: { domain: string; period?: number },
  deps: Partial<OpenproviderSandboxRegisterProbeDependencies> = {},
): Promise<OpenproviderSandboxRegisterProbeResult> {
  const resolvedDeps: OpenproviderSandboxRegisterProbeDependencies = {
    login: defaultOpenproviderLogin,
    registerDomain: defaultRegisterDomain,
    now: () => new Date().toISOString(),
    ...deps,
  };

  const probedAt = resolvedDeps.now();
  const parsedDomain = parseDomain(input.domain);
  const period = input.period ?? 1;
  const diagnostics = [DIAGNOSTIC_STARTED, DIAGNOSTIC_BOUNDARY_CONFIRMED];

  const failClosed = (status: number, extraDiagnostics: string[] = [], summary?: OpenproviderSandboxRegisterProbeResult["summary"]): OpenproviderSandboxRegisterProbeResult => ({
    provider: "openprovider",
    environment: "sandbox",
    adminOnly: true,
    diagnosticOnly: true,
    executionAllowed: false,
    executionBlocked: true,
    persisted: false,
    domain: parsedDomain?.fqdn ?? sanitizeToken(input.domain).toLowerCase(),
    probedAt,
    success: false,
    status,
    summary: summary ?? { topLevelKeys: [], responseCode: null, responseDesc: null },
    diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_FAILED_CLOSED, ...extraDiagnostics]),
  });

  if (!isProbeEnabled()) {
    return failClosed(403, ["OPENPROVIDER_SANDBOX_REGISTER_PROBE_DISABLED", `${REQUIRED_ENV_FLAG}_REQUIRED`]);
  }

  const endpoint = readSandboxRegistrationEndpoint();
  if (!endpoint) {
    return failClosed(403, ["OPENPROVIDER_SANDBOX_REGISTER_PROBE_ENDPOINT_MISSING", `${SANDBOX_ENDPOINT_ENV}_REQUIRED`]);
  }

  if (!isSandboxEndpoint(endpoint)) {
    return failClosed(403, ["OPENPROVIDER_SANDBOX_REGISTER_PROBE_SANDBOX_ENDPOINT_REQUIRED", "OPENPROVIDER_SANDBOX_REGISTER_PROBE_LIVE_ENDPOINT_BLOCKED"]);
  }

  if (!parsedDomain) {
    return failClosed(400, ["OPENPROVIDER_SANDBOX_REGISTER_PROBE_INVALID_DOMAIN"]);
  }
  if (!Number.isInteger(period) || period < 1 || period > 10) {
    return failClosed(400, ["OPENPROVIDER_SANDBOX_REGISTER_PROBE_INVALID_PERIOD"]);
  }

  try {
    const auth = await authenticateOpenprovider({
      login: resolvedDeps.login,
      inventoryEndpointForAuthDerivation: endpoint,
    });
    diagnostics.push(...auth.diagnostics);
    if (!auth.ok) {
      return failClosed(502);
    }

    diagnostics.push(DIAGNOSTIC_AUTH_SUCCEEDED, DIAGNOSTIC_PERIOD_APPLIED, DIAGNOSTIC_REQUEST_SENT);
    const response = await resolvedDeps.registerDomain({
      endpoint,
      token: auth.token,
      payload: {
        domain: {
          name: parsedDomain.name,
          extension: parsedDomain.extension,
        },
        period,
      },
    });

    const summary = summarizeResponse(response.json);
    if (response.status < 200 || response.status >= 300) {
      return failClosed(502, [sanitizeOpenproviderDiagnostic(`OPENPROVIDER_SANDBOX_REGISTER_HTTP_STATUS_${response.status}`)], summary);
    }

    return {
      provider: "openprovider",
      environment: "sandbox",
      adminOnly: true,
      diagnosticOnly: true,
      executionAllowed: false,
      executionBlocked: true,
      persisted: false,
      domain: parsedDomain.fqdn,
      probedAt,
      success: true,
      status: response.status,
      summary,
      diagnostics: uniqueSorted([...diagnostics, DIAGNOSTIC_SUCCEEDED]),
    };
  } catch (error) {
    const message = sanitizeOpenproviderDiagnostic(sanitizeToken(error instanceof Error ? error.message : error));
    return failClosed(500, [message ? `OPENPROVIDER_SANDBOX_REGISTER_ERROR:${message}` : "OPENPROVIDER_SANDBOX_REGISTER_ERROR"]);
  }
}
