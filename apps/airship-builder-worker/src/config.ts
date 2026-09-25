export const AIRSHIP_BUILDER_WORKER_CONTRACT_VERSION = "airship-adapter-18-online-builder-worker-contract:v1" as const;

export type AirshipBuilderWorkerDeploymentMode = "internal_vm_worker";

export type AirshipBuilderWorkerConfig = {
  workerId: string;
  displayName: string;
  host: string;
  port: number;
  publicBaseUrl: string | null;
  controlPlaneBaseUrl: string | null;
  workspaceRoot: string;
  maxConcurrentSessions: number;
  sessionTtlSeconds: number;
  heartbeatIntervalSeconds: number;
  heartbeatStaleSeconds: number;
  airshipCliVersion: string | null;
  nodeVersion: string;
  deploymentMode: AirshipBuilderWorkerDeploymentMode;
  noRuntimeExecution: boolean;
};

export type AirshipBuilderWorkerConfigReadback = {
  ok: boolean;
  config: AirshipBuilderWorkerConfig;
  diagnostics: string[];
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberFromEnv(value: unknown, fallback: number): number {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nullableText(value: unknown): string | null {
  const normalized = text(value);
  return normalized.length > 0 ? normalized : null;
}

export function readAirshipBuilderWorkerConfig(env: NodeJS.ProcessEnv = process.env): AirshipBuilderWorkerConfigReadback {
  const config: AirshipBuilderWorkerConfig = {
    workerId: text(env.GNR8_AIRSHIP_BUILDER_WORKER_ID) || "airship-builder-worker-local",
    displayName: text(env.GNR8_AIRSHIP_BUILDER_WORKER_DISPLAY_NAME) || "GNR8 Airship Builder Worker",
    host: text(env.HOST) || "0.0.0.0",
    port: numberFromEnv(env.PORT, 3002),
    publicBaseUrl: nullableText(env.GNR8_AIRSHIP_BUILDER_PUBLIC_BASE_URL),
    controlPlaneBaseUrl: nullableText(env.GNR8_AIRSHIP_CONTROL_PLANE_BASE_URL),
    workspaceRoot: text(env.GNR8_AIRSHIP_BUILDER_WORKSPACE_ROOT) || "/srv/gnr8-airship/sessions",
    maxConcurrentSessions: numberFromEnv(env.GNR8_AIRSHIP_BUILDER_MAX_CONCURRENT_SESSIONS, 1),
    sessionTtlSeconds: numberFromEnv(env.GNR8_AIRSHIP_BUILDER_SESSION_TTL_SECONDS, 1800),
    heartbeatIntervalSeconds: numberFromEnv(env.GNR8_AIRSHIP_BUILDER_HEARTBEAT_INTERVAL_SECONDS, 30),
    heartbeatStaleSeconds: numberFromEnv(env.GNR8_AIRSHIP_BUILDER_HEARTBEAT_STALE_SECONDS, 90),
    airshipCliVersion: nullableText(env.GNR8_AIRSHIP_CLI_VERSION),
    nodeVersion: process.versions.node,
    deploymentMode: "internal_vm_worker",
    noRuntimeExecution: text(env.GNR8_AIRSHIP_BUILDER_ENABLE_RUNTIME).toLowerCase() !== "true",
  };

  const diagnostics: string[] = [];
  if (!config.controlPlaneBaseUrl) diagnostics.push("GNR8_AIRSHIP_CONTROL_PLANE_BASE_URL is not configured.");
  if (!config.publicBaseUrl) diagnostics.push("GNR8_AIRSHIP_BUILDER_PUBLIC_BASE_URL is not configured.");
  if (!config.airshipCliVersion) diagnostics.push("GNR8_AIRSHIP_CLI_VERSION is not configured.");
  if (config.noRuntimeExecution) diagnostics.push("Runtime execution is disabled; session start/capture routes must remain inert.");
  if (config.heartbeatStaleSeconds < config.heartbeatIntervalSeconds) {
    diagnostics.push("Heartbeat stale threshold is lower than heartbeat interval.");
  }

  return {
    ok: diagnostics.length === 0 || (diagnostics.length === 1 && diagnostics[0].startsWith("Runtime execution is disabled")),
    config,
    diagnostics,
  };
}
