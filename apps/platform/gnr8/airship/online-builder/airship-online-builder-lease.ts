import type {
  AirshipOnlineBuilderSessionRecord,
  AirshipOnlineBuilderWorkerLeaseRecord,
} from "./airship-online-builder-worker-contract";
import type { AirshipOnlineBuilderWorkerIdentity } from "./airship-online-builder-worker-auth";

export type AirshipOnlineBuilderLeaseBlockedReason =
  | "worker_not_allowlisted"
  | "worker_disabled"
  | "worker_capacity_exceeded"
  | "operator_capacity_exceeded"
  | "site_capacity_exceeded"
  | "migration_capacity_exceeded"
  | "session_already_leased"
  | "session_state_blocked";

export type AirshipOnlineBuilderLeaseConfig = {
  leaseTtlSeconds: number;
  heartbeatTimeoutSeconds: number;
  maxConcurrentSessionsPerWorker: number;
  maxConcurrentSessionsPerOperator: number;
  maxConcurrentSessionsPerSite: number;
  maxConcurrentSessionsPerMigration: number;
};

export type AirshipOnlineBuilderLeaseBinding = {
  lease: AirshipOnlineBuilderWorkerLeaseRecord;
  session: Pick<AirshipOnlineBuilderSessionRecord, "opaqueSessionId" | "state" | "requestedByUserId" | "ownerOrganizationId" | "migrationId" | "siteKey">;
};

export type AirshipOnlineBuilderLeaseAcquireResult =
  | { ok: true; lease: AirshipOnlineBuilderWorkerLeaseRecord; diagnostics: string[] }
  | { ok: false; blockedReason: AirshipOnlineBuilderLeaseBlockedReason; diagnostics: string[] };

export const AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG: AirshipOnlineBuilderLeaseConfig = {
  leaseTtlSeconds: 30 * 60,
  heartbeatTimeoutSeconds: 90,
  maxConcurrentSessionsPerWorker: 4,
  maxConcurrentSessionsPerOperator: 2,
  maxConcurrentSessionsPerSite: 2,
  maxConcurrentSessionsPerMigration: 1,
};

function isActiveLease(lease: AirshipOnlineBuilderWorkerLeaseRecord, now: Date): boolean {
  return lease.state === "active" && Date.parse(lease.expiresAt) > now.getTime();
}

export function isAirshipOnlineBuilderHeartbeatStale(input: {
  heartbeatAt: string;
  now: Date;
  staleAfterSeconds: number;
}): boolean {
  return Date.parse(input.heartbeatAt) + input.staleAfterSeconds * 1000 <= input.now.getTime();
}

export function acquireAirshipOnlineBuilderWorkerLease(input: {
  worker: AirshipOnlineBuilderWorkerIdentity;
  session: AirshipOnlineBuilderSessionRecord;
  activeBindings: AirshipOnlineBuilderLeaseBinding[];
  config: AirshipOnlineBuilderLeaseConfig;
  now: Date;
  leaseId: string;
  leaseTokenHash: string;
}): AirshipOnlineBuilderLeaseAcquireResult {
  if (!input.worker.allowlisted) {
    return { ok: false, blockedReason: "worker_not_allowlisted", diagnostics: ["airship_online_builder_lease_worker_not_allowlisted"] };
  }
  if (input.worker.status !== "active") {
    return { ok: false, blockedReason: "worker_disabled", diagnostics: [`airship_online_builder_lease_worker_status_blocked:${input.worker.status}`] };
  }
  if (input.session.state !== "requested" && input.session.state !== "provisioning" && input.session.state !== "ready") {
    return { ok: false, blockedReason: "session_state_blocked", diagnostics: [`airship_online_builder_lease_session_state_blocked:${input.session.state}`] };
  }

  const activeBindings = input.activeBindings.filter((binding) => isActiveLease(binding.lease, input.now));
  if (activeBindings.some((binding) => binding.session.opaqueSessionId === input.session.opaqueSessionId)) {
    return { ok: false, blockedReason: "session_already_leased", diagnostics: ["airship_online_builder_lease_session_already_leased"] };
  }
  if (activeBindings.filter((binding) => binding.lease.workerId === input.worker.workerId).length >= input.config.maxConcurrentSessionsPerWorker) {
    return { ok: false, blockedReason: "worker_capacity_exceeded", diagnostics: ["airship_online_builder_lease_worker_capacity_exceeded"] };
  }
  if (activeBindings.filter((binding) => binding.session.requestedByUserId === input.session.requestedByUserId).length >= input.config.maxConcurrentSessionsPerOperator) {
    return { ok: false, blockedReason: "operator_capacity_exceeded", diagnostics: ["airship_online_builder_lease_operator_capacity_exceeded"] };
  }
  if (activeBindings.filter((binding) => binding.session.siteKey === input.session.siteKey).length >= input.config.maxConcurrentSessionsPerSite) {
    return { ok: false, blockedReason: "site_capacity_exceeded", diagnostics: ["airship_online_builder_lease_site_capacity_exceeded"] };
  }
  if (activeBindings.filter((binding) => binding.session.migrationId === input.session.migrationId).length >= input.config.maxConcurrentSessionsPerMigration) {
    return { ok: false, blockedReason: "migration_capacity_exceeded", diagnostics: ["airship_online_builder_lease_migration_capacity_exceeded"] };
  }

  const nowIso = input.now.toISOString();
  return {
    ok: true,
    diagnostics: ["airship_online_builder_lease_acquired"],
    lease: {
      id: input.leaseId,
      sessionId: input.session.opaqueSessionId,
      workerId: input.worker.workerId,
      leaseTokenHash: input.leaseTokenHash,
      state: "active",
      heartbeatAt: nowIso,
      expiresAt: new Date(input.now.getTime() + input.config.leaseTtlSeconds * 1000).toISOString(),
      acquiredAt: nowIso,
      releasedAt: null,
    },
  };
}

export function renewAirshipOnlineBuilderWorkerLease(input: {
  lease: AirshipOnlineBuilderWorkerLeaseRecord;
  config: Pick<AirshipOnlineBuilderLeaseConfig, "leaseTtlSeconds">;
  now: Date;
}): AirshipOnlineBuilderWorkerLeaseRecord {
  return {
    ...input.lease,
    state: "active",
    heartbeatAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + input.config.leaseTtlSeconds * 1000).toISOString(),
  };
}

export function releaseAirshipOnlineBuilderWorkerLease(input: {
  lease: AirshipOnlineBuilderWorkerLeaseRecord;
  now: Date;
}): AirshipOnlineBuilderWorkerLeaseRecord {
  return {
    ...input.lease,
    state: "released",
    releasedAt: input.now.toISOString(),
  };
}

export function reclaimStaleAirshipOnlineBuilderWorkerLeases(input: {
  leases: AirshipOnlineBuilderWorkerLeaseRecord[];
  now: Date;
  heartbeatTimeoutSeconds: number;
}): AirshipOnlineBuilderWorkerLeaseRecord[] {
  return input.leases
    .filter((lease) => lease.state === "active" && isAirshipOnlineBuilderHeartbeatStale({
      heartbeatAt: lease.heartbeatAt,
      now: input.now,
      staleAfterSeconds: input.heartbeatTimeoutSeconds,
    }))
    .map((lease) => ({
      ...lease,
      state: "expired" as const,
      releasedAt: input.now.toISOString(),
    }));
}
