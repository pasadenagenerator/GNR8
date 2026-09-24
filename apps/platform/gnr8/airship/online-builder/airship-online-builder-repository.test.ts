import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { AirshipOnlineBuilderPostgresRepository } from "./airship-online-builder-postgres-repository";
import { createAirshipOnlineBuilderInMemoryRepository } from "./airship-online-builder-repository";
import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
} from "./airship-online-builder-worker-contract";
import type { AirshipOnlineBuilderWorkerAuthTokenMetadata, AirshipOnlineBuilderWorkerIdentity } from "./airship-online-builder-worker-auth";
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

const NOW = "2026-09-22T12:00:00.000Z";
const LATER = "2026-09-22T12:05:00.000Z";
const SESSION_ID = "aob_repositorytest001";
const PLATFORM_ROOT = path.resolve(process.cwd());
const DURABLE_MIGRATION_PATH = path.join(PLATFORM_ROOT, "supabase/migrations/20260923120000_airship_online_builder_durable_records.sql");

function session(overrides: Partial<AirshipOnlineBuilderSessionRecord> = {}): AirshipOnlineBuilderSessionRecord {
  return {
    id: `record-${SESSION_ID}`,
    opaqueSessionId: SESSION_ID,
    state: "requested",
    migrationId: "682a09fd-8fd5-4f73-93b8-54f5d4067c63",
    siteKey: "chs",
    allowedEditScope: "chs_text_safe_fields_v1",
    requestedByUserId: "superadmin-1",
    ownerOrganizationId: "org-1",
    expectedDraft: { id: "draft-1", version: 3 },
    editorUrlExpiresAt: null,
    expiresAt: LATER,
    createdAt: NOW,
    updatedAt: NOW,
    lastErrorCode: null,
    lastErrorMessage: null,
    ...overrides,
  };
}

function lease(overrides: Partial<AirshipOnlineBuilderWorkerLeaseRecord> = {}): AirshipOnlineBuilderWorkerLeaseRecord {
  return {
    id: "lease-1",
    sessionId: SESSION_ID,
    workerId: "fake-worker-1",
    leaseTokenHash: "hash-1",
    state: "active",
    heartbeatAt: NOW,
    expiresAt: LATER,
    acquiredAt: NOW,
    releasedAt: null,
    ...overrides,
  };
}

function worker(overrides: Partial<AirshipOnlineBuilderWorkerIdentity> = {}): AirshipOnlineBuilderWorkerIdentity {
  return {
    workerId: "fake-worker-1",
    displayName: "Fake Worker 1",
    allowlisted: true,
    status: "active",
    deploymentMode: "fake_test_worker",
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    capabilities: ["create_session", "status_readback"],
    version: {
      workerImageRef: "fake",
      airshipCliVersion: null,
      adapterVersion: "airship-adapter-20-worker-auth-lease-heartbeat-gateway:v1",
    },
    registeredAt: NOW,
    rotatedAt: null,
    lastAuthenticatedAt: null,
    ...overrides,
  };
}

function workerToken(overrides: Partial<AirshipOnlineBuilderWorkerAuthTokenMetadata> = {}): AirshipOnlineBuilderWorkerAuthTokenMetadata {
  return {
    id: "token-meta-1",
    workerId: "fake-worker-1",
    tokenId: "token-1",
    tokenHash: "0".repeat(64),
    hashAlgorithm: "sha256",
    status: "active",
    audience: "gnr8-airship-online-builder-control-plane",
    issuedAt: NOW,
    expiresAt: LATER,
    rotatedAt: null,
    replacedByTokenId: null,
    lastUsedAt: null,
    ...overrides,
  };
}

function createFakePgClient() {
  type Row = {
    record_kind: string;
    record_key: string;
    session_id: string | null;
    worker_id: string | null;
    token_hash: string | null;
    state: string | null;
    status: string | null;
    payload_json: unknown;
    updated_at: string;
  };
  const rows = new Map<string, Row>();
  const serializedParams: string[] = [];
  return {
    rows,
    serializedParams,
    client: {
      async query(_sql: string, params: unknown[] = []) {
        serializedParams.push(JSON.stringify(params));
        const kind = String(params[0] ?? "");
        const key = String(params[1] ?? "");
        if (_sql.includes("insert into public.gnr8_airship_online_builder_records")) {
          const row: Row = {
            record_kind: kind,
            record_key: key,
            session_id: params[2] as string | null,
            worker_id: params[3] as string | null,
            token_hash: params[4] as string | null,
            state: params[5] as string | null,
            status: params[6] as string | null,
            payload_json: typeof params[7] === "string" ? JSON.parse(params[7]) : params[7],
            updated_at: String(params[9] ?? params[8] ?? NOW),
          };
          rows.set(`${kind}:${key}`, row);
          return { rows: [row] };
        }
        if (_sql.includes("record_key = $2::text")) {
          return { rows: rows.has(`${kind}:${key}`) ? [rows.get(`${kind}:${key}`)] : [] };
        }
        const sessionId = params[1] as string | null;
        const workerId = params[2] as string | null;
        const state = params[3] as string | null;
        const status = params[4] as string | null;
        return {
          rows: Array.from(rows.values())
            .filter((row) => row.record_kind === kind)
            .filter((row) => sessionId ? row.session_id === sessionId : true)
            .filter((row) => workerId ? row.worker_id === workerId : true)
            .filter((row) => state ? row.state === state : true)
            .filter((row) => status ? row.status === status : true),
        };
      },
    },
  };
}

test("in-memory repository creates, reads, updates, audits, and expires sessions", async () => {
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  const created = await repository.sessions.createRequestedSession(session());
  assert.equal(created.state, "requested");

  const updated = await repository.sessions.updateState({
    opaqueSessionId: SESSION_ID,
    state: "ready",
    updatedAt: LATER,
    editorUrlExpiresAt: LATER,
    lastErrorCode: null,
    lastErrorMessage: null,
  });
  assert.equal(updated.state, "ready");
  assert.equal(updated.editorUrlExpiresAt, LATER);

  await repository.auditEvents.appendAuditEvent({
    id: "audit-1",
    sessionId: SESSION_ID,
    actorUserId: "superadmin-1",
    eventType: "session_requested",
    severity: "info",
    correlationId: "corr-1",
    idempotencyKey: "idem-1",
    metadata: { proof: true },
    createdAt: NOW,
  } satisfies AirshipOnlineBuilderAuditEventRecord);
  assert.equal((await repository.auditEvents.listForSession(SESSION_ID)).length, 1);

  const expiredSeed = await repository.sessions.createRequestedSession(session({
    id: "record-expired",
    opaqueSessionId: "aob_repositoryexpired",
    expiresAt: "2026-09-22T11:59:59.000Z",
  }));
  assert.equal(expiredSeed.state, "requested");
  const expired = await repository.sessions.listExpiredSessions({ now: NOW, limit: 10 });
  assert.equal(expired.some((record) => record.opaqueSessionId === "aob_repositoryexpired"), true);

  const marked = await repository.sessions.markExpiredSession({
    opaqueSessionId: "aob_repositoryexpired",
    updatedAt: NOW,
  });
  assert.equal(marked.state, "expired");
  assert.equal(marked.lastErrorCode, "session_expired");
});

test("in-memory repository stores worker auth, heartbeat, and signed editor gateway metadata", async () => {
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  await repository.workers.upsertWorker({
    workerId: "worker-1",
    displayName: "Worker 1",
    allowlisted: true,
    status: "active",
    deploymentMode: "fake_test_worker",
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    capabilities: ["create_session", "status_readback"],
    version: {
      workerImageRef: "fake",
      airshipCliVersion: null,
      adapterVersion: "airship-adapter-20-worker-auth-lease-heartbeat-gateway:v1",
    },
    registeredAt: NOW,
    rotatedAt: null,
    lastAuthenticatedAt: null,
  });
  assert.equal((await repository.workers.readWorker("worker-1"))?.allowlisted, true);
  assert.equal((await repository.workers.listAllowlistedWorkers()).length, 1);

  await repository.workerAuthTokens.upsertTokenMetadata({
    id: "token-meta-1",
    workerId: "worker-1",
    tokenId: "token-1",
    tokenHash: "hash-1",
    hashAlgorithm: "sha256",
    status: "active",
    audience: "gnr8-airship-online-builder-control-plane",
    issuedAt: NOW,
    expiresAt: LATER,
    rotatedAt: null,
    replacedByTokenId: null,
    lastUsedAt: null,
  });
  await repository.workerAuthTokens.markLastUsed({ tokenId: "token-1", lastUsedAt: LATER });
  assert.equal((await repository.workerAuthTokens.readByTokenId("token-1"))?.lastUsedAt, LATER);

  await repository.heartbeats.upsertHeartbeat({
    id: "heartbeat-1",
    workerId: "worker-1",
    observedAt: NOW,
    workerStatus: "healthy",
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    deploymentMode: "fake_test_worker",
    capabilities: ["create_session"],
    activeSessionCount: 1,
    activeSessions: [{ sessionId: SESSION_ID, leaseId: "lease-1", state: "ready", heartbeatAt: NOW }],
    processHealth: {
      targetServer: "healthy",
      airshipSidecar: "healthy",
      processSupervisor: "healthy",
      activeProcessCount: 2,
    },
    cleanupHealth: {
      pendingCleanupCount: 0,
      lastCleanupAt: null,
      lastCleanupStatus: "not_run",
    },
    diagnostics: ["ok"],
  });
  assert.equal((await repository.heartbeats.readLatestForWorker("worker-1"))?.activeSessionCount, 1);

  await repository.editorGatewayTokens.createTokenMetadata({
    id: "gateway-token-1",
    tokenHash: "gateway-token-hash",
    sessionId: SESSION_ID,
    requestedByUserId: "superadmin-1",
    ownerOrganizationId: "org-1",
    migrationId: "682a09fd-8fd5-4f73-93b8-54f5d4067c63",
    siteKey: "chs",
    allowedOrigin: "https://app.test",
    issuedAt: NOW,
    expiresAt: LATER,
    revokedAt: null,
    lastVerifiedAt: null,
  });
  await repository.editorGatewayTokens.markVerified({ tokenHash: "gateway-token-hash", lastVerifiedAt: LATER });
  assert.equal((await repository.editorGatewayTokens.readByTokenHash("gateway-token-hash"))?.lastVerifiedAt, LATER);
});

test("in-memory repository records lease, workspace, diff, mapping, draft apply, and preview readbacks", async () => {
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  await repository.sessions.createRequestedSession(session());

  await repository.leases.upsertLease(lease());
  assert.equal((await repository.leases.readActiveLease(SESSION_ID))?.workerId, "fake-worker-1");
  await repository.leases.releaseLease({ id: "lease-1", state: "released", releasedAt: LATER });
  assert.equal(await repository.leases.readActiveLease(SESSION_ID), null);

  const baseline = {
    id: "snapshot-baseline",
    sessionId: SESSION_ID,
    snapshotKind: "baseline",
    workspaceHash: "baseline-hash",
    sourceManifest: [{ path: "index.html", sha256: "sha-1", bytes: 12 }],
    allowedPaths: ["index.html"],
    createdAt: NOW,
  } satisfies AirshipOnlineBuilderWorkspaceSnapshotRecord;
  await repository.workspaceSnapshots.createSnapshot(baseline);
  assert.equal((await repository.workspaceSnapshots.readLatestForSession(SESSION_ID, "baseline"))?.workspaceHash, "baseline-hash");

  const diff = {
    id: "diff-1",
    sessionId: SESSION_ID,
    captureRequestId: "capture-1",
    baselineSnapshotId: "snapshot-baseline",
    captureSnapshotId: "snapshot-capture",
    changedFileCount: 1,
    indexHtmlChanged: true,
    changedFiles: [{
      path: "index.html",
      status: "modified",
      beforeSha256: "before",
      afterSha256: "after",
      beforeBytes: 12,
      afterBytes: 14,
      unifiedDiff: "@@",
    }],
    createdAt: NOW,
  } satisfies AirshipOnlineBuilderCapturedDiffRecord;
  await repository.capturedDiffs.createCapturedDiff(diff);
  assert.equal((await repository.capturedDiffs.readLatestForSession(SESSION_ID))?.changedFileCount, 1);

  const mapping = {
    id: "mapping-1",
    sessionId: SESSION_ID,
    capturedDiffId: "diff-1",
    status: "mapped",
    safeEntryCount: 1,
    unsupportedEntryCount: 0,
    mappingJson: { entries: 1 },
    mappedAgainstDraft: { id: "draft-1", version: 3 },
    createdAt: NOW,
  } satisfies AirshipOnlineBuilderMappingReadbackRecord;
  await repository.mappingReadbacks.createMappingReadback(mapping);
  assert.equal((await repository.mappingReadbacks.readLatestForCapturedDiff("diff-1"))?.safeEntryCount, 1);

  const draftApply = {
    id: "draft-apply-1",
    sessionId: SESSION_ID,
    mappingReadbackId: "mapping-1",
    status: "applied",
    appliedCount: 1,
    skippedCount: 0,
    draftBefore: { id: "draft-1", version: 3 },
    draftAfter: { id: "draft-1", version: 4 },
    readbackJson: { applied: true },
    createdAt: NOW,
  } satisfies AirshipOnlineBuilderDraftApplyReadbackRecord;
  await repository.draftApplyReadbacks.createDraftApplyReadback(draftApply);
  assert.equal((await repository.draftApplyReadbacks.readLatestForMapping("mapping-1"))?.appliedCount, 1);

  const preview = {
    id: "preview-1",
    sessionId: SESSION_ID,
    draftApplyReadbackId: "draft-apply-1",
    status: "generated",
    siteVersionId: "site-version-1",
    artifactId: "artifact-1",
    internalPreviewUrl: "/preview",
    readbackJson: { preview: true },
    createdAt: NOW,
  } satisfies AirshipOnlineBuilderGeneratedPreviewReadbackRecord;
  await repository.generatedPreviewReadbacks.createGeneratedPreviewReadback(preview);
  assert.equal((await repository.generatedPreviewReadbacks.readLatestForDraftApply("draft-apply-1"))?.artifactId, "artifact-1");
});

test("postgres repository persists sessions, workers, leases, heartbeats, gateway metadata, and audit without plaintext tokens", async () => {
  const fake = createFakePgClient();
  const repository = new AirshipOnlineBuilderPostgresRepository(fake.client as never);

  await repository.sessions.createRequestedSession(session());
  assert.equal((await repository.sessions.readByOpaqueSessionId(SESSION_ID))?.state, "requested");
  assert.equal((await repository.sessions.updateState({
    opaqueSessionId: SESSION_ID,
    state: "ready",
    updatedAt: LATER,
    editorUrlExpiresAt: LATER,
    lastErrorCode: null,
    lastErrorMessage: null,
  })).editorUrlExpiresAt, LATER);

  await repository.workers.upsertWorker(worker());
  await repository.workerAuthTokens.upsertTokenMetadata(workerToken());
  await repository.workerAuthTokens.markLastUsed({ tokenId: "token-1", lastUsedAt: LATER });
  assert.equal((await repository.workerAuthTokens.readByTokenId("token-1"))?.tokenHash, "0".repeat(64));
  assert.equal((await repository.workers.listAllowlistedWorkers())[0]?.workerId, "fake-worker-1");

  await repository.leases.upsertLease(lease({ leaseTokenHash: "2".repeat(64) }));
  assert.equal((await repository.leases.readActiveLease(SESSION_ID))?.leaseTokenHash, "2".repeat(64));
  await repository.leases.releaseLease({ id: "lease-1", state: "released", releasedAt: LATER });
  assert.equal(await repository.leases.readActiveLease(SESSION_ID), null);
  await repository.leases.reclaimLeases([lease({ id: "lease-reclaimed", leaseTokenHash: "3".repeat(64), state: "expired", releasedAt: LATER })]);

  await repository.heartbeats.upsertHeartbeat({
    id: "heartbeat-1",
    workerId: "fake-worker-1",
    observedAt: NOW,
    workerStatus: "healthy",
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    deploymentMode: "fake_test_worker",
    capabilities: ["create_session"],
    activeSessionCount: 0,
    activeSessions: [],
    processHealth: { targetServer: "healthy", airshipSidecar: "healthy", processSupervisor: "healthy", activeProcessCount: 0 },
    cleanupHealth: { pendingCleanupCount: 0, lastCleanupAt: null, lastCleanupStatus: "not_run" },
    diagnostics: ["ok"],
  });
  assert.equal((await repository.heartbeats.readLatestForWorker("fake-worker-1"))?.workerStatus, "healthy");

  await repository.editorGatewayTokens.createTokenMetadata({
    id: "gateway-token-1",
    tokenHash: "1".repeat(64),
    sessionId: SESSION_ID,
    requestedByUserId: "superadmin-1",
    ownerOrganizationId: "org-1",
    migrationId: "682a09fd-8fd5-4f73-93b8-54f5d4067c63",
    siteKey: "chs",
    allowedOrigin: "https://app.test",
    issuedAt: NOW,
    expiresAt: LATER,
    revokedAt: null,
    lastVerifiedAt: null,
  });
  await repository.editorGatewayTokens.markVerified({ tokenHash: "1".repeat(64), lastVerifiedAt: LATER });
  await repository.editorGatewayTokens.revokeToken({ tokenHash: "1".repeat(64), revokedAt: LATER });
  assert.equal((await repository.editorGatewayTokens.readByTokenHash("1".repeat(64)))?.revokedAt, LATER);

  await repository.auditEvents.appendAuditEvent({
    id: "audit-1",
    sessionId: SESSION_ID,
    actorUserId: "fake-worker-1",
    eventType: "worker_heartbeat",
    severity: "info",
    correlationId: "corr-1",
    idempotencyKey: null,
    metadata: { workerId: "fake-worker-1" },
    createdAt: NOW,
  });
  assert.equal((await repository.auditEvents.listForSession(SESSION_ID))[0]?.eventType, "worker_heartbeat");
  assert.equal(fake.serializedParams.some((params) => params.includes("aobw_") || params.includes("aobe_") || params.includes("Bearer ")), false);
  await assert.rejects(
    () => repository.workerAuthTokens.upsertTokenMetadata(workerToken({ tokenHash: "0".repeat(64), replacedByTokenId: "aobw_plaintext.secretsecretsecretsecretsecret" })),
    /plaintext_token_storage_blocked/,
  );
});

test("airship online builder durable migration is private and blocks plaintext token shapes", () => {
  const sql = fs.readFileSync(DURABLE_MIGRATION_PATH, "utf8");
  assert.match(sql, /create table if not exists public\.gnr8_airship_online_builder_records/i);
  assert.match(sql, /alter table public\.gnr8_airship_online_builder_records enable row level security/i);
  assert.match(sql, /alter table public\.gnr8_airship_online_builder_records force row level security/i);
  assert.match(sql, /revoke all on table public\.gnr8_airship_online_builder_records from anon, authenticated/i);
  assert.match(sql, /aobw_/i);
  assert.match(sql, /aobe_/i);
  assert.match(sql, /token_hash is null or token_hash ~ '\^\[a-f0-9\]\{64\}\$'/i);
});
