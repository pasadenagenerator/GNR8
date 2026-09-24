import type {
  AirshipOnlineBuilderAuditEventRecord,
  AirshipOnlineBuilderCapturedDiffRecord,
  AirshipOnlineBuilderDraftApplyReadbackRecord,
  AirshipOnlineBuilderGeneratedPreviewReadbackRecord,
  AirshipOnlineBuilderMappingReadbackRecord,
  AirshipOnlineBuilderSessionRecord,
  AirshipOnlineBuilderWorkspaceSnapshotRecord,
  AirshipOnlineBuilderWorkerLeaseRecord,
} from "./airship-online-builder-worker-contract";
import type { AirshipOnlineBuilderEditorGatewayTokenMetadata } from "./airship-online-builder-editor-gateway";
import type { AirshipOnlineBuilderWorkerHeartbeatRecord } from "./airship-online-builder-heartbeat";
import type {
  AirshipOnlineBuilderWorkerAuthTokenMetadata,
  AirshipOnlineBuilderWorkerIdentity,
} from "./airship-online-builder-worker-auth";

export type AirshipOnlineBuilderRepositoryBoundary = {
  workers: AirshipOnlineBuilderWorkerRepository;
  workerAuthTokens: AirshipOnlineBuilderWorkerAuthTokenRepository;
  sessions: AirshipOnlineBuilderSessionRepository;
  leases: AirshipOnlineBuilderWorkerLeaseRepository;
  heartbeats: AirshipOnlineBuilderHeartbeatRepository;
  editorGatewayTokens: AirshipOnlineBuilderEditorGatewayTokenRepository;
  workspaceSnapshots: AirshipOnlineBuilderWorkspaceSnapshotRepository;
  capturedDiffs: AirshipOnlineBuilderCapturedDiffRepository;
  mappingReadbacks: AirshipOnlineBuilderMappingReadbackRepository;
  draftApplyReadbacks: AirshipOnlineBuilderDraftApplyReadbackRepository;
  generatedPreviewReadbacks: AirshipOnlineBuilderGeneratedPreviewReadbackRepository;
  auditEvents: AirshipOnlineBuilderAuditEventRepository;
};

export interface AirshipOnlineBuilderWorkerRepository {
  upsertWorker(record: AirshipOnlineBuilderWorkerIdentity): Promise<AirshipOnlineBuilderWorkerIdentity>;
  readWorker(workerId: string): Promise<AirshipOnlineBuilderWorkerIdentity | null>;
  listAllowlistedWorkers(): Promise<AirshipOnlineBuilderWorkerIdentity[]>;
}

export interface AirshipOnlineBuilderWorkerAuthTokenRepository {
  upsertTokenMetadata(record: AirshipOnlineBuilderWorkerAuthTokenMetadata): Promise<AirshipOnlineBuilderWorkerAuthTokenMetadata>;
  readByTokenId(tokenId: string): Promise<AirshipOnlineBuilderWorkerAuthTokenMetadata | null>;
  markLastUsed(input: { tokenId: string; lastUsedAt: string }): Promise<AirshipOnlineBuilderWorkerAuthTokenMetadata>;
}

export interface AirshipOnlineBuilderSessionRepository {
  createRequestedSession(record: AirshipOnlineBuilderSessionRecord): Promise<AirshipOnlineBuilderSessionRecord>;
  readByOpaqueSessionId(opaqueSessionId: string): Promise<AirshipOnlineBuilderSessionRecord | null>;
  updateState(input: Pick<AirshipOnlineBuilderSessionRecord, "opaqueSessionId" | "state" | "updatedAt" | "lastErrorCode" | "lastErrorMessage"> & {
    editorUrlExpiresAt?: string | null;
  }): Promise<AirshipOnlineBuilderSessionRecord>;
  listExpiredSessions(input: { now: string; limit: number }): Promise<AirshipOnlineBuilderSessionRecord[]>;
  markExpiredSession(input: { opaqueSessionId: string; updatedAt: string }): Promise<AirshipOnlineBuilderSessionRecord>;
}

export interface AirshipOnlineBuilderWorkerLeaseRepository {
  readActiveLease(sessionId: string): Promise<AirshipOnlineBuilderWorkerLeaseRecord | null>;
  listActiveLeases(input?: { workerId?: string; now?: string }): Promise<AirshipOnlineBuilderWorkerLeaseRecord[]>;
  upsertLease(record: AirshipOnlineBuilderWorkerLeaseRecord): Promise<AirshipOnlineBuilderWorkerLeaseRecord>;
  renewLease(record: AirshipOnlineBuilderWorkerLeaseRecord): Promise<AirshipOnlineBuilderWorkerLeaseRecord>;
  releaseLease(input: Pick<AirshipOnlineBuilderWorkerLeaseRecord, "id" | "releasedAt" | "state">): Promise<AirshipOnlineBuilderWorkerLeaseRecord>;
  reclaimLeases(records: AirshipOnlineBuilderWorkerLeaseRecord[]): Promise<AirshipOnlineBuilderWorkerLeaseRecord[]>;
}

export interface AirshipOnlineBuilderHeartbeatRepository {
  upsertHeartbeat(record: AirshipOnlineBuilderWorkerHeartbeatRecord): Promise<AirshipOnlineBuilderWorkerHeartbeatRecord>;
  readLatestForWorker(workerId: string): Promise<AirshipOnlineBuilderWorkerHeartbeatRecord | null>;
  listStaleWorkers(input: { now: string; staleAfterSeconds: number }): Promise<AirshipOnlineBuilderWorkerHeartbeatRecord[]>;
}

export interface AirshipOnlineBuilderEditorGatewayTokenRepository {
  createTokenMetadata(record: AirshipOnlineBuilderEditorGatewayTokenMetadata): Promise<AirshipOnlineBuilderEditorGatewayTokenMetadata>;
  readByTokenHash(tokenHash: string): Promise<AirshipOnlineBuilderEditorGatewayTokenMetadata | null>;
  markVerified(input: { tokenHash: string; lastVerifiedAt: string }): Promise<AirshipOnlineBuilderEditorGatewayTokenMetadata>;
  revokeToken(input: { tokenHash: string; revokedAt: string }): Promise<AirshipOnlineBuilderEditorGatewayTokenMetadata>;
}

export interface AirshipOnlineBuilderWorkspaceSnapshotRepository {
  createSnapshot(record: AirshipOnlineBuilderWorkspaceSnapshotRecord): Promise<AirshipOnlineBuilderWorkspaceSnapshotRecord>;
  readLatestForSession(sessionId: string, snapshotKind: AirshipOnlineBuilderWorkspaceSnapshotRecord["snapshotKind"]): Promise<AirshipOnlineBuilderWorkspaceSnapshotRecord | null>;
}

export interface AirshipOnlineBuilderCapturedDiffRepository {
  createCapturedDiff(record: AirshipOnlineBuilderCapturedDiffRecord): Promise<AirshipOnlineBuilderCapturedDiffRecord>;
  readLatestForSession(sessionId: string): Promise<AirshipOnlineBuilderCapturedDiffRecord | null>;
}

export interface AirshipOnlineBuilderMappingReadbackRepository {
  createMappingReadback(record: AirshipOnlineBuilderMappingReadbackRecord): Promise<AirshipOnlineBuilderMappingReadbackRecord>;
  readLatestForCapturedDiff(capturedDiffId: string): Promise<AirshipOnlineBuilderMappingReadbackRecord | null>;
}

export interface AirshipOnlineBuilderDraftApplyReadbackRepository {
  createDraftApplyReadback(record: AirshipOnlineBuilderDraftApplyReadbackRecord): Promise<AirshipOnlineBuilderDraftApplyReadbackRecord>;
  readLatestForMapping(mappingReadbackId: string): Promise<AirshipOnlineBuilderDraftApplyReadbackRecord | null>;
}

export interface AirshipOnlineBuilderGeneratedPreviewReadbackRepository {
  createGeneratedPreviewReadback(record: AirshipOnlineBuilderGeneratedPreviewReadbackRecord): Promise<AirshipOnlineBuilderGeneratedPreviewReadbackRecord>;
  readLatestForDraftApply(draftApplyReadbackId: string): Promise<AirshipOnlineBuilderGeneratedPreviewReadbackRecord | null>;
}

export interface AirshipOnlineBuilderAuditEventRepository {
  appendAuditEvent(record: AirshipOnlineBuilderAuditEventRecord): Promise<AirshipOnlineBuilderAuditEventRecord>;
  listForSession(sessionId: string): Promise<AirshipOnlineBuilderAuditEventRecord[]>;
}

function cloneRecord<T>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T;
}

function byCreatedAtDesc<T extends { createdAt: string }>(left: T, right: T): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

export function createAirshipOnlineBuilderInMemoryRepository(): AirshipOnlineBuilderRepositoryBoundary {
  const sessions = new Map<string, AirshipOnlineBuilderSessionRecord>();
  const workers = new Map<string, AirshipOnlineBuilderWorkerIdentity>();
  const workerAuthTokens = new Map<string, AirshipOnlineBuilderWorkerAuthTokenMetadata>();
  const leases = new Map<string, AirshipOnlineBuilderWorkerLeaseRecord>();
  const heartbeats = new Map<string, AirshipOnlineBuilderWorkerHeartbeatRecord>();
  const editorGatewayTokens = new Map<string, AirshipOnlineBuilderEditorGatewayTokenMetadata>();
  const workspaceSnapshots = new Map<string, AirshipOnlineBuilderWorkspaceSnapshotRecord>();
  const capturedDiffs = new Map<string, AirshipOnlineBuilderCapturedDiffRecord>();
  const mappingReadbacks = new Map<string, AirshipOnlineBuilderMappingReadbackRecord>();
  const draftApplyReadbacks = new Map<string, AirshipOnlineBuilderDraftApplyReadbackRecord>();
  const generatedPreviewReadbacks = new Map<string, AirshipOnlineBuilderGeneratedPreviewReadbackRecord>();
  const auditEvents = new Map<string, AirshipOnlineBuilderAuditEventRecord>();

  function sessionOrThrow(opaqueSessionId: string): AirshipOnlineBuilderSessionRecord {
    const session = sessions.get(opaqueSessionId);
    if (!session) throw new Error(`airship_online_builder_session_not_found:${opaqueSessionId}`);
    return session;
  }

  return {
    workers: {
      async upsertWorker(record) {
        workers.set(record.workerId, cloneRecord(record));
        return cloneRecord(record);
      },
      async readWorker(workerId) {
        const worker = workers.get(workerId) ?? null;
        return worker ? cloneRecord(worker) : null;
      },
      async listAllowlistedWorkers() {
        return Array.from(workers.values())
          .filter((worker) => worker.allowlisted)
          .sort((left, right) => left.workerId.localeCompare(right.workerId))
          .map(cloneRecord);
      },
    },
    workerAuthTokens: {
      async upsertTokenMetadata(record) {
        workerAuthTokens.set(record.tokenId, cloneRecord(record));
        return cloneRecord(record);
      },
      async readByTokenId(tokenId) {
        const token = workerAuthTokens.get(tokenId) ?? null;
        return token ? cloneRecord(token) : null;
      },
      async markLastUsed(input) {
        const current = workerAuthTokens.get(input.tokenId);
        if (!current) throw new Error(`airship_online_builder_worker_auth_token_not_found:${input.tokenId}`);
        const updated = { ...current, lastUsedAt: input.lastUsedAt };
        workerAuthTokens.set(input.tokenId, cloneRecord(updated));
        return cloneRecord(updated);
      },
    },
    sessions: {
      async createRequestedSession(record) {
        if (sessions.has(record.opaqueSessionId)) return cloneRecord(sessionOrThrow(record.opaqueSessionId));
        sessions.set(record.opaqueSessionId, cloneRecord(record));
        return cloneRecord(record);
      },
      async readByOpaqueSessionId(opaqueSessionId) {
        const session = sessions.get(opaqueSessionId) ?? null;
        return session ? cloneRecord(session) : null;
      },
      async updateState(input) {
        const current = sessionOrThrow(input.opaqueSessionId);
        const updated: AirshipOnlineBuilderSessionRecord = {
          ...current,
          state: input.state,
          updatedAt: input.updatedAt,
          lastErrorCode: input.lastErrorCode,
          lastErrorMessage: input.lastErrorMessage,
          editorUrlExpiresAt: "editorUrlExpiresAt" in input ? input.editorUrlExpiresAt ?? null : current.editorUrlExpiresAt,
        };
        sessions.set(input.opaqueSessionId, cloneRecord(updated));
        return cloneRecord(updated);
      },
      async listExpiredSessions(input) {
        return Array.from(sessions.values())
          .filter((session) => session.state !== "expired" && session.state !== "stopped" && Date.parse(session.expiresAt) <= Date.parse(input.now))
          .sort(byCreatedAtDesc)
          .slice(0, input.limit)
          .map(cloneRecord);
      },
      async markExpiredSession(input) {
        const current = sessionOrThrow(input.opaqueSessionId);
        const updated: AirshipOnlineBuilderSessionRecord = {
          ...current,
          state: "expired",
          updatedAt: input.updatedAt,
          editorUrlExpiresAt: null,
          lastErrorCode: "session_expired",
          lastErrorMessage: "Online Airship session TTL expired.",
        };
        sessions.set(input.opaqueSessionId, cloneRecord(updated));
        return cloneRecord(updated);
      },
    },
    leases: {
      async readActiveLease(sessionId) {
        const lease = Array.from(leases.values()).find((candidate) => candidate.sessionId === sessionId && candidate.state === "active") ?? null;
        return lease ? cloneRecord(lease) : null;
      },
      async listActiveLeases(input = {}) {
        return Array.from(leases.values())
          .filter((lease) => lease.state === "active")
          .filter((lease) => input.workerId ? lease.workerId === input.workerId : true)
          .filter((lease) => input.now ? Date.parse(lease.expiresAt) > Date.parse(input.now) : true)
          .sort((left, right) => Date.parse(right.acquiredAt) - Date.parse(left.acquiredAt))
          .map(cloneRecord);
      },
      async upsertLease(record) {
        leases.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async renewLease(record) {
        if (!leases.has(record.id)) throw new Error(`airship_online_builder_lease_not_found:${record.id}`);
        leases.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async releaseLease(input) {
        const current = leases.get(input.id);
        if (!current) throw new Error(`airship_online_builder_lease_not_found:${input.id}`);
        const updated: AirshipOnlineBuilderWorkerLeaseRecord = {
          ...current,
          state: input.state,
          releasedAt: input.releasedAt,
        };
        leases.set(input.id, cloneRecord(updated));
        return cloneRecord(updated);
      },
      async reclaimLeases(records) {
        for (const record of records) {
          if (leases.has(record.id)) leases.set(record.id, cloneRecord(record));
        }
        return records.map(cloneRecord);
      },
    },
    heartbeats: {
      async upsertHeartbeat(record) {
        heartbeats.set(record.workerId, cloneRecord(record));
        return cloneRecord(record);
      },
      async readLatestForWorker(workerId) {
        const heartbeat = heartbeats.get(workerId) ?? null;
        return heartbeat ? cloneRecord(heartbeat) : null;
      },
      async listStaleWorkers(input) {
        const nowMs = Date.parse(input.now);
        return Array.from(heartbeats.values())
          .filter((heartbeat) => Date.parse(heartbeat.observedAt) + input.staleAfterSeconds * 1000 <= nowMs)
          .sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt))
          .map(cloneRecord);
      },
    },
    editorGatewayTokens: {
      async createTokenMetadata(record) {
        editorGatewayTokens.set(record.tokenHash, cloneRecord(record));
        return cloneRecord(record);
      },
      async readByTokenHash(tokenHash) {
        const metadata = editorGatewayTokens.get(tokenHash) ?? null;
        return metadata ? cloneRecord(metadata) : null;
      },
      async markVerified(input) {
        const current = editorGatewayTokens.get(input.tokenHash);
        if (!current) throw new Error(`airship_online_builder_editor_gateway_token_not_found:${input.tokenHash}`);
        const updated = { ...current, lastVerifiedAt: input.lastVerifiedAt };
        editorGatewayTokens.set(input.tokenHash, cloneRecord(updated));
        return cloneRecord(updated);
      },
      async revokeToken(input) {
        const current = editorGatewayTokens.get(input.tokenHash);
        if (!current) throw new Error(`airship_online_builder_editor_gateway_token_not_found:${input.tokenHash}`);
        const updated = { ...current, revokedAt: input.revokedAt };
        editorGatewayTokens.set(input.tokenHash, cloneRecord(updated));
        return cloneRecord(updated);
      },
    },
    workspaceSnapshots: {
      async createSnapshot(record) {
        workspaceSnapshots.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async readLatestForSession(sessionId, snapshotKind) {
        const snapshot = Array.from(workspaceSnapshots.values())
          .filter((candidate) => candidate.sessionId === sessionId && candidate.snapshotKind === snapshotKind)
          .sort(byCreatedAtDesc)[0] ?? null;
        return snapshot ? cloneRecord(snapshot) : null;
      },
    },
    capturedDiffs: {
      async createCapturedDiff(record) {
        capturedDiffs.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async readLatestForSession(sessionId) {
        const diff = Array.from(capturedDiffs.values())
          .filter((candidate) => candidate.sessionId === sessionId)
          .sort(byCreatedAtDesc)[0] ?? null;
        return diff ? cloneRecord(diff) : null;
      },
    },
    mappingReadbacks: {
      async createMappingReadback(record) {
        mappingReadbacks.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async readLatestForCapturedDiff(capturedDiffId) {
        const readback = Array.from(mappingReadbacks.values())
          .filter((candidate) => candidate.capturedDiffId === capturedDiffId)
          .sort(byCreatedAtDesc)[0] ?? null;
        return readback ? cloneRecord(readback) : null;
      },
    },
    draftApplyReadbacks: {
      async createDraftApplyReadback(record) {
        draftApplyReadbacks.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async readLatestForMapping(mappingReadbackId) {
        const readback = Array.from(draftApplyReadbacks.values())
          .filter((candidate) => candidate.mappingReadbackId === mappingReadbackId)
          .sort(byCreatedAtDesc)[0] ?? null;
        return readback ? cloneRecord(readback) : null;
      },
    },
    generatedPreviewReadbacks: {
      async createGeneratedPreviewReadback(record) {
        generatedPreviewReadbacks.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async readLatestForDraftApply(draftApplyReadbackId) {
        const readback = Array.from(generatedPreviewReadbacks.values())
          .filter((candidate) => candidate.draftApplyReadbackId === draftApplyReadbackId)
          .sort(byCreatedAtDesc)[0] ?? null;
        return readback ? cloneRecord(readback) : null;
      },
    },
    auditEvents: {
      async appendAuditEvent(record) {
        auditEvents.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      },
      async listForSession(sessionId) {
        return Array.from(auditEvents.values())
          .filter((event) => event.sessionId === sessionId)
          .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
          .map(cloneRecord);
      },
    },
  };
}
