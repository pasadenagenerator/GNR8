import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipOnlineBuilderDeploymentMode,
} from "./airship-online-builder-worker-contract";
import type { AirshipOnlineBuilderWorkerCapability } from "./airship-online-builder-worker-auth";
import { isAirshipOnlineBuilderHeartbeatStale } from "./airship-online-builder-lease";

export type AirshipOnlineBuilderWorkerStatus =
  | "starting"
  | "healthy"
  | "degraded"
  | "draining"
  | "unhealthy"
  | "offline";

export type AirshipOnlineBuilderProcessHealthSummary = {
  targetServer: "unknown" | "starting" | "healthy" | "unhealthy" | "stopped";
  airshipSidecar: "unknown" | "starting" | "healthy" | "unhealthy" | "stopped";
  processSupervisor: "healthy" | "degraded" | "unhealthy" | "unknown";
  activeProcessCount: number;
};

export type AirshipOnlineBuilderCleanupHealthSummary = {
  pendingCleanupCount: number;
  lastCleanupAt: string | null;
  lastCleanupStatus: "not_run" | "succeeded" | "partial" | "failed";
};

export type AirshipOnlineBuilderWorkerHeartbeatRequest = {
  workerId: string;
  contractVersion: typeof AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION;
  deploymentMode: AirshipOnlineBuilderDeploymentMode;
  workerStatus: AirshipOnlineBuilderWorkerStatus;
  capabilities: AirshipOnlineBuilderWorkerCapability[];
  activeSessions: Array<{
    sessionId: string;
    leaseId: string;
    state: "provisioning" | "ready" | "editor_opened" | "capture_requested" | "captured" | "stopping";
    heartbeatAt: string;
  }>;
  processHealth: AirshipOnlineBuilderProcessHealthSummary;
  cleanupHealth: AirshipOnlineBuilderCleanupHealthSummary;
  diagnostics: string[];
};

export type AirshipOnlineBuilderWorkerHeartbeatResponse = {
  ok: boolean;
  workerId: string;
  acceptedAt: string;
  nextHeartbeatAfterSeconds: number;
  staleAfterSeconds: number;
  status: AirshipOnlineBuilderWorkerStatus;
  reclaimRequestedSessionIds: string[];
  diagnostics: string[];
};

export type AirshipOnlineBuilderWorkerHeartbeatRecord = {
  id: string;
  workerId: string;
  observedAt: string;
  workerStatus: AirshipOnlineBuilderWorkerStatus;
  contractVersion: typeof AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION;
  deploymentMode: AirshipOnlineBuilderDeploymentMode;
  capabilities: AirshipOnlineBuilderWorkerCapability[];
  activeSessionCount: number;
  activeSessions: AirshipOnlineBuilderWorkerHeartbeatRequest["activeSessions"];
  processHealth: AirshipOnlineBuilderProcessHealthSummary;
  cleanupHealth: AirshipOnlineBuilderCleanupHealthSummary;
  diagnostics: string[];
};

export const AIRSHIP_ONLINE_BUILDER_DEFAULT_HEARTBEAT_POLICY = {
  intervalSeconds: 30,
  staleAfterSeconds: 90,
} as const;

export function buildAirshipOnlineBuilderHeartbeatRecord(input: {
  id: string;
  request: AirshipOnlineBuilderWorkerHeartbeatRequest;
  observedAt: string;
}): AirshipOnlineBuilderWorkerHeartbeatRecord {
  return {
    id: input.id,
    workerId: input.request.workerId,
    observedAt: input.observedAt,
    workerStatus: input.request.workerStatus,
    contractVersion: input.request.contractVersion,
    deploymentMode: input.request.deploymentMode,
    capabilities: input.request.capabilities,
    activeSessionCount: input.request.activeSessions.length,
    activeSessions: input.request.activeSessions,
    processHealth: input.request.processHealth,
    cleanupHealth: input.request.cleanupHealth,
    diagnostics: input.request.diagnostics,
  };
}

export function buildAirshipOnlineBuilderHeartbeatResponse(input: {
  request: AirshipOnlineBuilderWorkerHeartbeatRequest;
  acceptedAt: string;
  reclaimRequestedSessionIds?: string[];
  intervalSeconds?: number;
  staleAfterSeconds?: number;
}): AirshipOnlineBuilderWorkerHeartbeatResponse {
  return {
    ok: true,
    workerId: input.request.workerId,
    acceptedAt: input.acceptedAt,
    nextHeartbeatAfterSeconds: input.intervalSeconds ?? AIRSHIP_ONLINE_BUILDER_DEFAULT_HEARTBEAT_POLICY.intervalSeconds,
    staleAfterSeconds: input.staleAfterSeconds ?? AIRSHIP_ONLINE_BUILDER_DEFAULT_HEARTBEAT_POLICY.staleAfterSeconds,
    status: input.request.workerStatus,
    reclaimRequestedSessionIds: input.reclaimRequestedSessionIds ?? [],
    diagnostics: ["airship_online_builder_worker_heartbeat_accepted"],
  };
}

export function isAirshipOnlineBuilderWorkerHeartbeatRecordStale(input: {
  heartbeat: Pick<AirshipOnlineBuilderWorkerHeartbeatRecord, "observedAt"> | null;
  now: Date;
  staleAfterSeconds?: number;
}): boolean {
  if (!input.heartbeat) return true;
  return isAirshipOnlineBuilderHeartbeatStale({
    heartbeatAt: input.heartbeat.observedAt,
    now: input.now,
    staleAfterSeconds: input.staleAfterSeconds ?? AIRSHIP_ONLINE_BUILDER_DEFAULT_HEARTBEAT_POLICY.staleAfterSeconds,
  });
}

export function buildAirshipOnlineBuilderHeartbeatAuditMetadata(input: {
  heartbeat: AirshipOnlineBuilderWorkerHeartbeatRecord;
  stale: boolean;
}): Record<string, unknown> {
  return {
    workerId: input.heartbeat.workerId,
    workerStatus: input.heartbeat.workerStatus,
    activeSessionCount: input.heartbeat.activeSessionCount,
    processHealth: input.heartbeat.processHealth,
    cleanupHealth: input.heartbeat.cleanupHealth,
    stale: input.stale,
  };
}
