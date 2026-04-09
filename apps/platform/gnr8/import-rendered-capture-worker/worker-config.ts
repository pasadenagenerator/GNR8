export type RenderedCaptureWorkerClientConfig = {
  enabled: boolean;
  endpointUrl: string | null;
  sharedToken: string | null;
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 35_000;

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

export function resolveRenderedCaptureWorkerClientConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RenderedCaptureWorkerClientConfig {
  const enabledRaw = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_ENABLED);
  const enabled = enabledRaw ? normalizeBoolean(enabledRaw) : true;
  const baseUrl = normalizeBaseUrl(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_BASE_URL));
  const path = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_PATH) || "/api/internal/gnr8/rendered-capture-worker";
  const endpointUrl = baseUrl ? new URL(path, `${baseUrl}/`).toString() : null;
  const sharedToken = normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN) || null;
  const timeoutMs = normalizeTimeoutMs(normalizeText(env.GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS));

  return {
    enabled,
    endpointUrl,
    sharedToken,
    timeoutMs,
  };
}
