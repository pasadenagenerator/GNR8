export type OpenproviderHttpResponse = {
  status: number;
  json: unknown;
};

export type OpenproviderLogin = (input: {
  endpoint: string;
  username: string;
  password: string;
}) => Promise<OpenproviderHttpResponse>;

export type OpenproviderAuthSuccess = {
  ok: true;
  token: string;
  diagnostics: string[];
};

export type OpenproviderAuthFailure = {
  ok: false;
  diagnostics: string[];
};

export type OpenproviderAuthResult = OpenproviderAuthSuccess | OpenproviderAuthFailure;

const DEFAULT_AUTH_ENDPOINT = "https://api.openprovider.eu/v1beta/auth/login";

export const OPENPROVIDER_DIAGNOSTIC_AUTH_STARTED = "OPENPROVIDER_AUTH_STARTED";
export const OPENPROVIDER_DIAGNOSTIC_AUTH_SUCCEEDED = "OPENPROVIDER_AUTH_SUCCEEDED";
export const OPENPROVIDER_DIAGNOSTIC_AUTH_FAILED_CLOSED = "OPENPROVIDER_AUTH_FAILED_CLOSED";
export const OPENPROVIDER_DIAGNOSTIC_AUTH_TOKEN_MISSING = "OPENPROVIDER_AUTH_TOKEN_MISSING";

export function sanitizeOpenproviderToken(value: unknown): string {
  return String(value ?? "").trim();
}

export function sanitizeOpenproviderDiagnostic(value: string): string {
  const lowered = value.toLowerCase();
  if (lowered.includes("password") || lowered.includes("token") || lowered.includes("secret") || lowered.includes("bearer")) {
    return "credential_redacted";
  }
  return value;
}

export function loadOpenproviderCredentials(): { username: string; password: string } {
  return {
    username: sanitizeOpenproviderToken(process.env.OPENPROVIDER_SANDBOX_USERNAME ?? process.env.OPENPROVIDER_LIVE_USERNAME),
    password: sanitizeOpenproviderToken(process.env.OPENPROVIDER_SANDBOX_PASSWORD ?? process.env.OPENPROVIDER_LIVE_PASSWORD),
  };
}

export function deriveOpenproviderAuthEndpoint(inventoryEndpoint: string): string {
  const explicit = sanitizeOpenproviderToken(process.env.OPENPROVIDER_AUTH_ENDPOINT);
  if (explicit) return explicit;
  const endpoint = sanitizeOpenproviderToken(inventoryEndpoint);
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

export function extractOpenproviderBearerToken(payload: unknown): string {
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
    const token = sanitizeOpenproviderToken(candidate);
    if (token) return token;
  }
  return "";
}

export async function defaultOpenproviderLogin(input: {
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

export async function authenticateOpenprovider(input: {
  login: OpenproviderLogin;
  inventoryEndpointForAuthDerivation: string;
}): Promise<OpenproviderAuthResult> {
  const { username, password } = loadOpenproviderCredentials();
  if (!username || !password) {
    return { ok: false, diagnostics: ["OPENPROVIDER_CREDENTIALS_MISSING"] };
  }

  const diagnostics = [OPENPROVIDER_DIAGNOSTIC_AUTH_STARTED];
  const auth = await input.login({
    endpoint: deriveOpenproviderAuthEndpoint(input.inventoryEndpointForAuthDerivation),
    username,
    password,
  });
  if (auth.status < 200 || auth.status >= 300) {
    return {
      ok: false,
      diagnostics: [
        ...diagnostics,
        OPENPROVIDER_DIAGNOSTIC_AUTH_FAILED_CLOSED,
        sanitizeOpenproviderDiagnostic(`OPENPROVIDER_AUTH_HTTP_STATUS_${auth.status}`),
      ],
    };
  }

  const token = extractOpenproviderBearerToken(auth.json);
  if (!token) {
    return {
      ok: false,
      diagnostics: [
        ...diagnostics,
        OPENPROVIDER_DIAGNOSTIC_AUTH_FAILED_CLOSED,
        OPENPROVIDER_DIAGNOSTIC_AUTH_TOKEN_MISSING,
      ],
    };
  }

  return {
    ok: true,
    token,
    diagnostics: [...diagnostics, OPENPROVIDER_DIAGNOSTIC_AUTH_SUCCEEDED],
  };
}
