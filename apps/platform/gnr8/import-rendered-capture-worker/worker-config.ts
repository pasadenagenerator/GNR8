export type RenderedCaptureWorkerClientConfig = {
  enabled: boolean;
  endpointUrl: string | null;
  sharedToken: string | null;
  timeoutMs: number;
  endpointPath: string;
  resolvedBaseUrl: string | null;
  resolvedBaseUrlSource:
    | "worker_base_url"
    | "next_public_app_url"
    | "next_public_site_url"
    | "gnr8_app_url"
    | "vercel_url"
    | "vercel_project_production_url"
    | "default_platform_origin"
    | null;
  configStatus: "ready" | "disabled" | "missing_base_url" | "missing_shared_token" | "missing_base_url_and_shared_token";
};

const DEFAULT_TIMEOUT_MS = 35_000;
const DEFAULT_PLATFORM_APP_ORIGIN = "https://app.pasadenagenerator.com";

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
  if (floored > 180_000) return 180_000;
  return floored;
}

function normalizeBaseUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function normalizeHostnameOrUrl(raw: string): string | null {
  if (!raw) return null;
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  return normalizeBaseUrl(withProtocol);
}

function resolveFallbackBaseUrl(env: NodeJS.ProcessEnv): {
  baseUrl: string | null;
  source: RenderedCaptureWorkerClientConfig["resolvedBaseUrlSource"];
} {
  const candidates: Array<{ raw: string; source: NonNullable<RenderedCaptureWorkerClientConfig["resolvedBaseUrlSource"]> }> = [
    { raw: normalizeText(env.NEXT_PUBLIC_APP_URL), source: "next_public_app_url" },
    { raw: normalizeText(env.NEXT_PUBLIC_SITE_URL), source: "next_public_site_url" },
    { raw: normalizeText(env.GNR8_APP_URL), source: "gnr8_app_url" },
    { raw: normalizeText(env.VERCEL_URL), source: "vercel_url" },
    { raw: normalizeText(env.VERCEL_PROJECT_PRODUCTION_URL), source: "vercel_project_production_url" },
  ];

  for (const candidate of candidates) {
    const normalized = candidate.source.startsWith("vercel_")
      ? normalizeHostnameOrUrl(candidate.raw)
      : normalizeBaseUrl(candidate.raw);
    if (normalized) return { baseUrl: normalized, source: candidate.source };
  }

  const nodeEnv = normalizeText(env.NODE_ENV).toLowerCase();
  if (nodeEnv === "production") {
    return {
      baseUrl: DEFAULT_PLATFORM_APP_ORIGIN,
      source: "default_platform_origin",
    };
  }

  return { baseUrl: null, source: null };
}

export function resolveRenderedCaptureWorkerClientConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RenderedCaptureWorkerClientConfig {
  const enabledRaw = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_ENABLED);
  const enabled = enabledRaw ? normalizeBoolean(enabledRaw) : true;
  const explicitBaseUrl = normalizeBaseUrl(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_BASE_URL));
  const fallbackBaseUrl = resolveFallbackBaseUrl(env);
  const resolvedBaseUrl = explicitBaseUrl ?? fallbackBaseUrl.baseUrl;
  const resolvedBaseUrlSource: RenderedCaptureWorkerClientConfig["resolvedBaseUrlSource"] = explicitBaseUrl
    ? "worker_base_url"
    : fallbackBaseUrl.source;
  const path = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_PATH) || "/api/internal/gnr8/rendered-capture-worker";
  const endpointUrl = resolvedBaseUrl ? new URL(path, `${resolvedBaseUrl}/`).toString() : null;
  const sharedToken = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN) || null;
  const timeoutMs = normalizeTimeoutMs(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS));
  const missingBaseUrl = !endpointUrl;
  const missingSharedToken = !sharedToken;
  const configStatus: RenderedCaptureWorkerClientConfig["configStatus"] = !enabled
    ? "disabled"
    : missingBaseUrl && missingSharedToken
      ? "missing_base_url_and_shared_token"
      : missingBaseUrl
        ? "missing_base_url"
        : missingSharedToken
          ? "missing_shared_token"
          : "ready";

  return {
    enabled,
    endpointUrl,
    sharedToken,
    timeoutMs,
    endpointPath: path,
    resolvedBaseUrl,
    resolvedBaseUrlSource,
    configStatus,
  };
}
