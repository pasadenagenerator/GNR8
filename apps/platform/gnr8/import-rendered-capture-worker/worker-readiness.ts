export type RenderedCaptureWorkerReadinessConfig = {
  enabled: boolean;
  baseUrl: string | null;
  path: string;
  healthPath: string;
  sharedTokenConfigured: boolean;
  timeoutMs: number;
  configured: boolean;
  diagnostics: RenderedCaptureWorkerReadinessDiagnosticCode[];
};

export type RenderedCaptureWorkerReadinessDiagnosticCode =
  | "RENDERED_CAPTURE_WORKER_CONFIG_DISABLED"
  | "RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL"
  | "RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN"
  | "RENDERED_CAPTURE_WORKER_HEALTH_STARTED"
  | "RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED"
  | "RENDERED_CAPTURE_WORKER_HEALTH_FAILED"
  | "RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE";

export type RenderedCaptureWorkerHealthStatus =
  | "ready"
  | "disabled"
  | "misconfigured"
  | "unreachable"
  | "invalid_response";

export type RenderedCaptureWorkerReadinessResult = {
  ok: boolean;
  enabled: boolean;
  configured: boolean;
  baseUrlPresent: boolean;
  path: string;
  healthPath: string;
  sharedTokenConfigured: boolean;
  timeoutMs: number;
  healthStatus: RenderedCaptureWorkerHealthStatus;
  healthHttpStatus: number | null;
  diagnostics: RenderedCaptureWorkerReadinessDiagnosticCode[];
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 10_000;

// Production rendered capture workers expose capture at this path by default.
export const DEFAULT_RENDERED_CAPTURE_WORKER_PATH = "/internal/gnr8/rendered-capture-worker";
export const DEFAULT_RENDERED_CAPTURE_WORKER_HEALTH_PATH = "/health";

const TOKEN_HEADER_NAME = "x-gnr8-rendered-capture-worker-token";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeTimeoutMs(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  const floored = Math.floor(parsed);
  if (floored < 1_000) return 1_000;
  if (floored > 60_000) return 60_000;
  return floored;
}

function normalizePath(raw: string, fallback: string): string {
  const normalized = normalizeText(raw) || fallback;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeBaseUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildHealthUrl(config: RenderedCaptureWorkerReadinessConfig): string | null {
  if (!config.baseUrl) return null;
  try {
    return new URL(config.healthPath, `${config.baseUrl}/`).toString();
  } catch {
    return null;
  }
}

function isReadyHealthPayload(payload: unknown): boolean {
  if (!isObjectRecord(payload)) return false;
  if (payload.ok !== true) return false;
  if (payload.status === "ready") return true;
  if (!isObjectRecord(payload.health)) return false;
  return payload.health.authenticated === true && payload.health.captureServiceAvailable === true;
}

export function resolveRenderedCaptureWorkerReadinessConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): RenderedCaptureWorkerReadinessConfig {
  const enabledRaw = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_ENABLED);
  const enabled = enabledRaw ? normalizeBoolean(enabledRaw) : true;
  const baseUrl = normalizeBaseUrl(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_BASE_URL));
  const sharedTokenConfigured = Boolean(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN));
  const path = normalizePath(env.GNR8_RENDERED_CAPTURE_WORKER_PATH ?? "", DEFAULT_RENDERED_CAPTURE_WORKER_PATH);
  const healthPath = normalizePath(
    env.GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH ?? "",
    DEFAULT_RENDERED_CAPTURE_WORKER_HEALTH_PATH,
  );
  const timeoutMs = normalizeTimeoutMs(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS));
  const diagnostics: RenderedCaptureWorkerReadinessDiagnosticCode[] = [];

  if (!enabled) diagnostics.push("RENDERED_CAPTURE_WORKER_CONFIG_DISABLED");
  if (enabled && !baseUrl) diagnostics.push("RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL");
  if (enabled && !sharedTokenConfigured) diagnostics.push("RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN");

  return {
    enabled,
    baseUrl,
    path,
    healthPath,
    sharedTokenConfigured,
    timeoutMs,
    configured: Boolean(baseUrl && sharedTokenConfigured),
    diagnostics,
  };
}

export async function checkRenderedCaptureWorkerReadiness(input?: {
  config?: RenderedCaptureWorkerReadinessConfig;
  fetchImpl?: FetchLike;
  sharedToken?: string | null;
}): Promise<RenderedCaptureWorkerReadinessResult> {
  const config = input?.config ?? resolveRenderedCaptureWorkerReadinessConfigFromEnv();
  const diagnostics = [...config.diagnostics];

  const base = {
    enabled: config.enabled,
    configured: config.configured,
    baseUrlPresent: Boolean(config.baseUrl),
    path: config.path,
    healthPath: config.healthPath,
    sharedTokenConfigured: config.sharedTokenConfigured,
    timeoutMs: config.timeoutMs,
  };

  if (!config.enabled) {
    return {
      ok: false,
      ...base,
      healthStatus: "disabled",
      healthHttpStatus: null,
      diagnostics,
    };
  }

  if (!config.configured) {
    return {
      ok: false,
      ...base,
      healthStatus: "misconfigured",
      healthHttpStatus: null,
      diagnostics,
    };
  }

  const healthUrl = buildHealthUrl(config);
  if (!healthUrl) {
    return {
      ok: false,
      ...base,
      healthStatus: "misconfigured",
      healthHttpStatus: null,
      diagnostics: [...diagnostics, "RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL"],
    };
  }

  diagnostics.push("RENDERED_CAPTURE_WORKER_HEALTH_STARTED");

  try {
    const response = await (input?.fetchImpl ?? fetch)(healthUrl, {
      method: "GET",
      headers: {
        [TOKEN_HEADER_NAME]: normalizeText(input?.sharedToken ?? process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN),
      },
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });
    const healthHttpStatus = response.status;
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return {
        ok: false,
        ...base,
        healthStatus: "unreachable",
        healthHttpStatus,
        diagnostics: [...diagnostics, "RENDERED_CAPTURE_WORKER_HEALTH_FAILED"],
      };
    }

    if (!isReadyHealthPayload(payload)) {
      return {
        ok: false,
        ...base,
        healthStatus: "invalid_response",
        healthHttpStatus,
        diagnostics: [...diagnostics, "RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE"],
      };
    }

    return {
      ok: true,
      ...base,
      healthStatus: "ready",
      healthHttpStatus,
      diagnostics: [...diagnostics, "RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED"],
    };
  } catch {
    return {
      ok: false,
      ...base,
      healthStatus: "unreachable",
      healthHttpStatus: null,
      diagnostics: [...diagnostics, "RENDERED_CAPTURE_WORKER_HEALTH_FAILED"],
    };
  }
}
