import type { Pool, PoolClient } from "pg";

import type {
  AirshipOnlineBuilderAuditEventRecord,
  AirshipOnlineBuilderCapturedDiffRecord,
  AirshipOnlineBuilderDraftApplyReadbackRecord,
  AirshipOnlineBuilderGeneratedPreviewReadbackRecord,
  AirshipOnlineBuilderMappingReadbackRecord,
  AirshipOnlineBuilderSessionRecord,
  AirshipOnlineBuilderWorkerLeaseRecord,
  AirshipOnlineBuilderWorkspaceSnapshotRecord,
} from "./airship-online-builder-worker-contract";
import type { AirshipOnlineBuilderEditorGatewayTokenMetadata } from "./airship-online-builder-editor-gateway";
import type { AirshipOnlineBuilderWorkerHeartbeatRecord } from "./airship-online-builder-heartbeat";
import type {
  AirshipOnlineBuilderRepositoryBoundary,
} from "./airship-online-builder-repository";
import type {
  AirshipOnlineBuilderWorkerAuthTokenMetadata,
  AirshipOnlineBuilderWorkerIdentity,
} from "./airship-online-builder-worker-auth";

type QueryableClient = Pick<Pool | PoolClient, "query">;

type RecordKind =
  | "session"
  | "worker"
  | "worker_auth_token"
  | "worker_lease"
  | "worker_heartbeat"
  | "editor_gateway_token"
  | "workspace_snapshot"
  | "captured_diff"
  | "mapping_readback"
  | "draft_apply_readback"
  | "generated_preview_readback"
  | "audit_event";

type OnlineBuilderRecordRow = {
  record_kind: RecordKind;
  record_key: string;
  session_id: string | null;
  worker_id: string | null;
  token_hash: string | null;
  state: string | null;
  status: string | null;
  payload_json: unknown;
};

type RecordIndex = {
  sessionId?: string | null;
  workerId?: string | null;
  tokenHash?: string | null;
  state?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function cloneRecord<T>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T;
}

function payload<T>(row: OnlineBuilderRecordRow | undefined): T | null {
  if (!row) return null;
  return cloneRecord(row.payload_json as T);
}

function dateText(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function jsonParam(value: unknown): string {
  return JSON.stringify(value);
}

function sortCreatedAtDesc<T extends { createdAt: string }>(records: T[]): T[] {
  return records.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function assertNoPlaintextToken(record: unknown): void {
  const serialized = JSON.stringify(record);
  if (/(aobw_|aobe_|authorization|plaintextToken|plainTextToken|bearer\s+[A-Za-z0-9_.-]+)/i.test(serialized)) {
    throw new Error("airship_online_builder_plaintext_token_storage_blocked");
  }
}

export class AirshipOnlineBuilderPostgresRepository implements AirshipOnlineBuilderRepositoryBoundary {
  readonly workers = {
    upsertWorker: (record: AirshipOnlineBuilderWorkerIdentity) => this.upsertRecord("worker", record.workerId, record, {
      workerId: record.workerId,
      status: record.status,
      createdAt: record.registeredAt,
      updatedAt: record.rotatedAt ?? record.registeredAt,
    }),
    readWorker: (workerId: string) => this.readRecord<AirshipOnlineBuilderWorkerIdentity>("worker", workerId),
    listAllowlistedWorkers: async () => {
      const records = await this.listRecords<AirshipOnlineBuilderWorkerIdentity>("worker");
      return records
        .filter((worker) => worker.allowlisted)
        .sort((left, right) => left.workerId.localeCompare(right.workerId));
    },
  };

  readonly workerAuthTokens = {
    upsertTokenMetadata: (record: AirshipOnlineBuilderWorkerAuthTokenMetadata) => this.upsertRecord("worker_auth_token", record.tokenId, record, {
      workerId: record.workerId,
      tokenHash: record.tokenHash,
      status: record.status,
      createdAt: record.issuedAt,
      updatedAt: record.lastUsedAt ?? record.rotatedAt ?? record.issuedAt,
    }),
    readByTokenId: (tokenId: string) => this.readRecord<AirshipOnlineBuilderWorkerAuthTokenMetadata>("worker_auth_token", tokenId),
    markLastUsed: async (input: { tokenId: string; lastUsedAt: string }) => {
      const current = await this.workerAuthTokens.readByTokenId(input.tokenId);
      if (!current) throw new Error(`airship_online_builder_worker_auth_token_not_found:${input.tokenId}`);
      return this.workerAuthTokens.upsertTokenMetadata({ ...current, lastUsedAt: input.lastUsedAt });
    },
  };

  readonly sessions = {
    createRequestedSession: async (record: AirshipOnlineBuilderSessionRecord) => {
      const existing = await this.sessions.readByOpaqueSessionId(record.opaqueSessionId);
      if (existing) return existing;
      return this.upsertRecord("session", record.opaqueSessionId, record, {
        sessionId: record.opaqueSessionId,
        state: record.state,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    },
    readByOpaqueSessionId: (opaqueSessionId: string) => this.readRecord<AirshipOnlineBuilderSessionRecord>("session", opaqueSessionId),
    updateState: async (input: Pick<AirshipOnlineBuilderSessionRecord, "opaqueSessionId" | "state" | "updatedAt" | "lastErrorCode" | "lastErrorMessage"> & {
      editorUrlExpiresAt?: string | null;
    }) => {
      const current = await this.sessions.readByOpaqueSessionId(input.opaqueSessionId);
      if (!current) throw new Error(`airship_online_builder_session_not_found:${input.opaqueSessionId}`);
      const updated: AirshipOnlineBuilderSessionRecord = {
        ...current,
        state: input.state,
        updatedAt: input.updatedAt,
        lastErrorCode: input.lastErrorCode,
        lastErrorMessage: input.lastErrorMessage,
        editorUrlExpiresAt: "editorUrlExpiresAt" in input ? input.editorUrlExpiresAt ?? null : current.editorUrlExpiresAt,
      };
      return this.upsertRecord("session", updated.opaqueSessionId, updated, {
        sessionId: updated.opaqueSessionId,
        state: updated.state,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    },
    listExpiredSessions: async (input: { now: string; limit: number }) => {
      const records = await this.listRecords<AirshipOnlineBuilderSessionRecord>("session");
      return sortCreatedAtDesc(records.filter((session) =>
        session.state !== "expired" &&
        session.state !== "stopped" &&
        Date.parse(session.expiresAt) <= Date.parse(input.now),
      )).slice(0, input.limit);
    },
    markExpiredSession: async (input: { opaqueSessionId: string; updatedAt: string }) => {
      const current = await this.sessions.readByOpaqueSessionId(input.opaqueSessionId);
      if (!current) throw new Error(`airship_online_builder_session_not_found:${input.opaqueSessionId}`);
      const updated: AirshipOnlineBuilderSessionRecord = {
        ...current,
        state: "expired",
        updatedAt: input.updatedAt,
        editorUrlExpiresAt: null,
        lastErrorCode: "session_expired",
        lastErrorMessage: "Online Airship session TTL expired.",
      };
      return this.upsertRecord("session", updated.opaqueSessionId, updated, {
        sessionId: updated.opaqueSessionId,
        state: updated.state,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    },
  };

  readonly leases = {
    readActiveLease: async (sessionId: string) => {
      const records = await this.listRecords<AirshipOnlineBuilderWorkerLeaseRecord>("worker_lease", { sessionId, state: "active" });
      return records.find((lease) => lease.state === "active") ?? null;
    },
    listActiveLeases: async (input: { workerId?: string; now?: string } = {}) => {
      const records = await this.listRecords<AirshipOnlineBuilderWorkerLeaseRecord>("worker_lease", {
        workerId: input.workerId,
        state: "active",
      });
      return records
        .filter((lease) => lease.state === "active")
        .filter((lease) => input.now ? Date.parse(lease.expiresAt) > Date.parse(input.now) : true)
        .sort((left, right) => Date.parse(right.acquiredAt) - Date.parse(left.acquiredAt));
    },
    upsertLease: (record: AirshipOnlineBuilderWorkerLeaseRecord) => this.upsertRecord("worker_lease", record.id, record, {
      sessionId: record.sessionId,
      workerId: record.workerId,
      tokenHash: record.leaseTokenHash,
      state: record.state,
      createdAt: record.acquiredAt,
      updatedAt: record.releasedAt ?? record.heartbeatAt,
    }),
    renewLease: async (record: AirshipOnlineBuilderWorkerLeaseRecord) => {
      const current = await this.readRecord<AirshipOnlineBuilderWorkerLeaseRecord>("worker_lease", record.id);
      if (!current) throw new Error(`airship_online_builder_lease_not_found:${record.id}`);
      return this.leases.upsertLease(record);
    },
    releaseLease: async (input: Pick<AirshipOnlineBuilderWorkerLeaseRecord, "id" | "releasedAt" | "state">) => {
      const current = await this.readRecord<AirshipOnlineBuilderWorkerLeaseRecord>("worker_lease", input.id);
      if (!current) throw new Error(`airship_online_builder_lease_not_found:${input.id}`);
      return this.leases.upsertLease({ ...current, state: input.state, releasedAt: input.releasedAt });
    },
    reclaimLeases: async (records: AirshipOnlineBuilderWorkerLeaseRecord[]) => {
      const updated: AirshipOnlineBuilderWorkerLeaseRecord[] = [];
      for (const record of records) updated.push(await this.leases.upsertLease(record));
      return updated;
    },
  };

  readonly heartbeats = {
    upsertHeartbeat: (record: AirshipOnlineBuilderWorkerHeartbeatRecord) => this.upsertRecord("worker_heartbeat", record.workerId, record, {
      workerId: record.workerId,
      status: record.workerStatus,
      createdAt: record.observedAt,
      updatedAt: record.observedAt,
    }),
    readLatestForWorker: (workerId: string) => this.readRecord<AirshipOnlineBuilderWorkerHeartbeatRecord>("worker_heartbeat", workerId),
    listStaleWorkers: async (input: { now: string; staleAfterSeconds: number }) => {
      const nowMs = Date.parse(input.now);
      const records = await this.listRecords<AirshipOnlineBuilderWorkerHeartbeatRecord>("worker_heartbeat");
      return records
        .filter((heartbeat) => Date.parse(heartbeat.observedAt) + input.staleAfterSeconds * 1000 <= nowMs)
        .sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt));
    },
  };

  readonly editorGatewayTokens = {
    createTokenMetadata: (record: AirshipOnlineBuilderEditorGatewayTokenMetadata) => this.upsertRecord("editor_gateway_token", record.tokenHash, record, {
      sessionId: record.sessionId,
      tokenHash: record.tokenHash,
      status: record.revokedAt ? "revoked" : "active",
      createdAt: record.issuedAt,
      updatedAt: record.lastVerifiedAt ?? record.revokedAt ?? record.issuedAt,
    }),
    readByTokenHash: (tokenHash: string) => this.readRecord<AirshipOnlineBuilderEditorGatewayTokenMetadata>("editor_gateway_token", tokenHash),
    markVerified: async (input: { tokenHash: string; lastVerifiedAt: string }) => {
      const current = await this.editorGatewayTokens.readByTokenHash(input.tokenHash);
      if (!current) throw new Error(`airship_online_builder_editor_gateway_token_not_found:${input.tokenHash}`);
      return this.editorGatewayTokens.createTokenMetadata({ ...current, lastVerifiedAt: input.lastVerifiedAt });
    },
    revokeToken: async (input: { tokenHash: string; revokedAt: string }) => {
      const current = await this.editorGatewayTokens.readByTokenHash(input.tokenHash);
      if (!current) throw new Error(`airship_online_builder_editor_gateway_token_not_found:${input.tokenHash}`);
      return this.editorGatewayTokens.createTokenMetadata({ ...current, revokedAt: input.revokedAt });
    },
  };

  readonly workspaceSnapshots = {
    createSnapshot: (record: AirshipOnlineBuilderWorkspaceSnapshotRecord) => this.upsertRecord("workspace_snapshot", record.id, record, {
      sessionId: record.sessionId,
      state: record.snapshotKind,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }),
    readLatestForSession: async (sessionId: string, snapshotKind: AirshipOnlineBuilderWorkspaceSnapshotRecord["snapshotKind"]) => {
      const records = await this.listRecords<AirshipOnlineBuilderWorkspaceSnapshotRecord>("workspace_snapshot", { sessionId, state: snapshotKind });
      return sortCreatedAtDesc(records)[0] ?? null;
    },
  };

  readonly capturedDiffs = {
    createCapturedDiff: (record: AirshipOnlineBuilderCapturedDiffRecord) => this.upsertRecord("captured_diff", record.id, record, {
      sessionId: record.sessionId,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }),
    readLatestForSession: async (sessionId: string) => {
      const records = await this.listRecords<AirshipOnlineBuilderCapturedDiffRecord>("captured_diff", { sessionId });
      return sortCreatedAtDesc(records)[0] ?? null;
    },
  };

  readonly mappingReadbacks = {
    createMappingReadback: (record: AirshipOnlineBuilderMappingReadbackRecord) => this.upsertRecord("mapping_readback", record.id, record, {
      sessionId: record.sessionId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }),
    readLatestForCapturedDiff: async (capturedDiffId: string) => {
      const records = await this.listRecords<AirshipOnlineBuilderMappingReadbackRecord>("mapping_readback");
      return sortCreatedAtDesc(records.filter((record) => record.capturedDiffId === capturedDiffId))[0] ?? null;
    },
  };

  readonly draftApplyReadbacks = {
    createDraftApplyReadback: (record: AirshipOnlineBuilderDraftApplyReadbackRecord) => this.upsertRecord("draft_apply_readback", record.id, record, {
      sessionId: record.sessionId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }),
    readLatestForMapping: async (mappingReadbackId: string) => {
      const records = await this.listRecords<AirshipOnlineBuilderDraftApplyReadbackRecord>("draft_apply_readback");
      return sortCreatedAtDesc(records.filter((record) => record.mappingReadbackId === mappingReadbackId))[0] ?? null;
    },
  };

  readonly generatedPreviewReadbacks = {
    createGeneratedPreviewReadback: (record: AirshipOnlineBuilderGeneratedPreviewReadbackRecord) => this.upsertRecord("generated_preview_readback", record.id, record, {
      sessionId: record.sessionId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }),
    readLatestForDraftApply: async (draftApplyReadbackId: string) => {
      const records = await this.listRecords<AirshipOnlineBuilderGeneratedPreviewReadbackRecord>("generated_preview_readback");
      return sortCreatedAtDesc(records.filter((record) => record.draftApplyReadbackId === draftApplyReadbackId))[0] ?? null;
    },
  };

  readonly auditEvents = {
    appendAuditEvent: (record: AirshipOnlineBuilderAuditEventRecord) => this.upsertRecord("audit_event", record.id, record, {
      sessionId: record.sessionId,
      status: record.severity,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    }),
    listForSession: async (sessionId: string) => {
      const records = await this.listRecords<AirshipOnlineBuilderAuditEventRecord>("audit_event", { sessionId });
      return records.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    },
  };

  private readonly client: QueryableClient;

  constructor(client: QueryableClient) {
    this.client = client;
  }

  private async upsertRecord<T>(kind: RecordKind, key: string, record: T, index: RecordIndex = {}): Promise<T> {
    assertNoPlaintextToken(record);
    const res = await this.client.query<OnlineBuilderRecordRow>(
      `
      insert into public.gnr8_airship_online_builder_records (
        record_kind,
        record_key,
        session_id,
        worker_id,
        token_hash,
        state,
        status,
        payload_json,
        created_at,
        updated_at
      )
      values (
        $1::text,
        $2::text,
        $3::text,
        $4::text,
        $5::text,
        $6::text,
        $7::text,
        $8::jsonb,
        coalesce($9::timestamptz, now()),
        coalesce($10::timestamptz, now())
      )
      on conflict (record_kind, record_key) do update
      set
        session_id = excluded.session_id,
        worker_id = excluded.worker_id,
        token_hash = excluded.token_hash,
        state = excluded.state,
        status = excluded.status,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
      returning
        record_kind,
        record_key,
        session_id,
        worker_id,
        token_hash,
        state,
        status,
        payload_json
      `,
      [
        kind,
        key,
        index.sessionId ?? null,
        index.workerId ?? null,
        index.tokenHash ?? null,
        index.state ?? null,
        index.status ?? null,
        jsonParam(record),
        dateText(index.createdAt),
        dateText(index.updatedAt),
      ],
    );
    const persisted = payload<T>(res.rows[0]);
    if (!persisted) throw new Error(`airship_online_builder_record_not_persisted:${kind}:${key}`);
    return persisted;
  }

  private async readRecord<T>(kind: RecordKind, key: string): Promise<T | null> {
    const res = await this.client.query<OnlineBuilderRecordRow>(
      `
      select
        record_kind,
        record_key,
        session_id,
        worker_id,
        token_hash,
        state,
        status,
        payload_json
      from public.gnr8_airship_online_builder_records
      where record_kind = $1::text and record_key = $2::text
      limit 1
      `,
      [kind, key],
    );
    return payload<T>(res.rows[0]);
  }

  private async listRecords<T>(kind: RecordKind, filter: {
    sessionId?: string;
    workerId?: string;
    state?: string;
    status?: string;
  } = {}): Promise<T[]> {
    const res = await this.client.query<OnlineBuilderRecordRow>(
      `
      select
        record_kind,
        record_key,
        session_id,
        worker_id,
        token_hash,
        state,
        status,
        payload_json
      from public.gnr8_airship_online_builder_records
      where record_kind = $1::text
        and ($2::text is null or session_id = $2::text)
        and ($3::text is null or worker_id = $3::text)
        and ($4::text is null or state = $4::text)
        and ($5::text is null or status = $5::text)
      order by updated_at desc, record_key asc
      `,
      [
        kind,
        filter.sessionId ?? null,
        filter.workerId ?? null,
        filter.state ?? null,
        filter.status ?? null,
      ],
    );
    return res.rows.map((row) => payload<T>(row)).filter((record): record is T => Boolean(record));
  }
}
