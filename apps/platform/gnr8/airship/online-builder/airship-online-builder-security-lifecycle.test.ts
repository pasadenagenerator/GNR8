import assert from "node:assert/strict";
import test from "node:test";

import {
  createAirshipOnlineBuilderSignedEditorGatewayToken,
  verifyAirshipOnlineBuilderSignedEditorGatewayToken,
} from "./airship-online-builder-editor-gateway";
import {
  acquireAirshipOnlineBuilderWorkerLease,
  AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
  reclaimStaleAirshipOnlineBuilderWorkerLeases,
  releaseAirshipOnlineBuilderWorkerLease,
  renewAirshipOnlineBuilderWorkerLease,
} from "./airship-online-builder-lease";
import {
  AIRSHIP_ONLINE_BUILDER_DEFAULT_HEARTBEAT_POLICY,
  buildAirshipOnlineBuilderHeartbeatRecord,
  buildAirshipOnlineBuilderHeartbeatResponse,
  isAirshipOnlineBuilderWorkerHeartbeatRecordStale,
  type AirshipOnlineBuilderWorkerHeartbeatRequest,
} from "./airship-online-builder-heartbeat";
import {
  buildAirshipOnlineBuilderWorkerBearerToken,
  hashAirshipOnlineBuilderWorkerBearerToken,
  signAirshipOnlineBuilderWorkerRequest,
  verifyAirshipOnlineBuilderSignedWorkerRequest,
  verifyAirshipOnlineBuilderWorkerBearerToken,
  type AirshipOnlineBuilderWorkerIdentity,
} from "./airship-online-builder-worker-auth";
import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipOnlineBuilderSessionRecord,
  type AirshipOnlineBuilderWorkerLeaseRecord,
} from "./airship-online-builder-worker-contract";

const NOW = new Date("2026-09-23T10:00:00.000Z");
const SESSION_ID = "aob_securitylifecycle001";

function worker(overrides: Partial<AirshipOnlineBuilderWorkerIdentity> = {}): AirshipOnlineBuilderWorkerIdentity {
  return {
    workerId: "worker-1",
    displayName: "Worker 1",
    allowlisted: true,
    status: "active",
    deploymentMode: "fake_test_worker",
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    capabilities: ["create_session", "status_readback", "mint_editor_gateway_url", "capture_diff", "cleanup_session"],
    version: {
      workerImageRef: "fake",
      airshipCliVersion: null,
      adapterVersion: "airship-adapter-20-worker-auth-lease-heartbeat-gateway:v1",
    },
    registeredAt: NOW.toISOString(),
    rotatedAt: null,
    lastAuthenticatedAt: null,
    ...overrides,
  };
}

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
    expiresAt: new Date(NOW.getTime() + 30 * 60 * 1000).toISOString(),
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    lastErrorCode: null,
    lastErrorMessage: null,
    ...overrides,
  };
}

function lease(overrides: Partial<AirshipOnlineBuilderWorkerLeaseRecord> = {}): AirshipOnlineBuilderWorkerLeaseRecord {
  return {
    id: "lease-1",
    sessionId: SESSION_ID,
    workerId: "worker-1",
    leaseTokenHash: "lease-token-hash",
    state: "active",
    heartbeatAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 30 * 60 * 1000).toISOString(),
    acquiredAt: NOW.toISOString(),
    releasedAt: null,
    ...overrides,
  };
}

test("worker bearer auth verifies hashed token metadata and rejects bad tokens", () => {
  const bearer = buildAirshipOnlineBuilderWorkerBearerToken({ tokenId: "token-001", secret: "secretsecretsecretsecretsecret" });
  const tokenMetadata = {
    id: "meta-1",
    workerId: "worker-1",
    tokenId: "token-001",
    tokenHash: hashAirshipOnlineBuilderWorkerBearerToken(bearer.plaintextToken),
    hashAlgorithm: "sha256" as const,
    status: "active" as const,
    audience: "gnr8-airship-online-builder-control-plane" as const,
    issuedAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 60_000).toISOString(),
    rotatedAt: null,
    replacedByTokenId: null,
    lastUsedAt: null,
  };

  const success = verifyAirshipOnlineBuilderWorkerBearerToken({
    authorizationHeader: bearer.authorizationHeader,
    worker: worker(),
    token: tokenMetadata,
    now: NOW,
  });
  assert.equal(success.ok, true);
  assert.equal(success.ok && success.auditEventType, "worker_auth_success");

  const failure = verifyAirshipOnlineBuilderWorkerBearerToken({
    authorizationHeader: "Bearer aobw_token-001.wrongwrongwrongwrongwrongwrong",
    worker: worker(),
    token: tokenMetadata,
    now: NOW,
  });
  assert.equal(failure.ok, false);
  assert.equal(failure.ok === false && failure.failureReason, "token_hash_mismatch");
});

test("signed worker request rejects replay and expired timestamps", () => {
  const signed = signAirshipOnlineBuilderWorkerRequest({
    workerId: "worker-1",
    method: "post",
    path: "/v1/airship/heartbeat",
    bodySha256: "body-sha",
    timestamp: NOW.toISOString(),
    nonce: "nonce-1",
    signingSecret: "worker-signing-secret",
  });
  const success = verifyAirshipOnlineBuilderSignedWorkerRequest({
    request: signed,
    signingSecret: "worker-signing-secret",
    now: NOW,
    maxSkewSeconds: 120,
    seenNonces: new Set(),
  });
  assert.equal(success.ok, true);

  const replay = verifyAirshipOnlineBuilderSignedWorkerRequest({
    request: signed,
    signingSecret: "worker-signing-secret",
    now: NOW,
    maxSkewSeconds: 120,
    seenNonces: new Set(["worker-1:nonce-1"]),
  });
  assert.equal(replay.ok, false);
  assert.equal(replay.ok === false && replay.failureReason, "request_nonce_replayed");

  const expired = verifyAirshipOnlineBuilderSignedWorkerRequest({
    request: { ...signed, timestamp: "2026-09-23T09:55:00.000Z" },
    signingSecret: "worker-signing-secret",
    now: NOW,
    maxSkewSeconds: 120,
    seenNonces: new Set(),
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.ok === false && expired.failureReason, "request_expired");
});

test("lease acquire, renew, release, and reclaim enforce lifecycle rules", () => {
  const acquired = acquireAirshipOnlineBuilderWorkerLease({
    worker: worker(),
    session: session(),
    activeBindings: [],
    config: AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
    now: NOW,
    leaseId: "lease-1",
    leaseTokenHash: "hash-1",
  });
  assert.equal(acquired.ok, true);
  assert.equal(acquired.ok && acquired.lease.state, "active");

  const renewed = renewAirshipOnlineBuilderWorkerLease({
    lease: acquired.ok ? acquired.lease : lease(),
    config: AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
    now: new Date(NOW.getTime() + 30_000),
  });
  assert.equal(renewed.heartbeatAt, "2026-09-23T10:00:30.000Z");

  const released = releaseAirshipOnlineBuilderWorkerLease({ lease: renewed, now: new Date(NOW.getTime() + 40_000) });
  assert.equal(released.state, "released");

  const stale = reclaimStaleAirshipOnlineBuilderWorkerLeases({
    leases: [lease({ heartbeatAt: "2026-09-23T09:58:00.000Z" })],
    now: NOW,
    heartbeatTimeoutSeconds: 90,
  });
  assert.equal(stale.length, 1);
  assert.equal(stale[0].state, "expired");
});

test("heartbeat readback records worker status and stale detection", () => {
  const request: AirshipOnlineBuilderWorkerHeartbeatRequest = {
    workerId: "worker-1",
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    deploymentMode: "fake_test_worker" as const,
    workerStatus: "healthy" as const,
    capabilities: ["create_session", "status_readback"],
    activeSessions: [{ sessionId: SESSION_ID, leaseId: "lease-1", state: "ready" as const, heartbeatAt: NOW.toISOString() }],
    processHealth: {
      targetServer: "healthy" as const,
      airshipSidecar: "healthy" as const,
      processSupervisor: "healthy" as const,
      activeProcessCount: 2,
    },
    cleanupHealth: {
      pendingCleanupCount: 0,
      lastCleanupAt: null,
      lastCleanupStatus: "not_run" as const,
    },
    diagnostics: ["ok"],
  };
  const record = buildAirshipOnlineBuilderHeartbeatRecord({ id: "heartbeat-1", request, observedAt: NOW.toISOString() });
  assert.equal(record.activeSessionCount, 1);
  assert.equal(isAirshipOnlineBuilderWorkerHeartbeatRecordStale({ heartbeat: record, now: NOW }), false);
  assert.equal(isAirshipOnlineBuilderWorkerHeartbeatRecordStale({
    heartbeat: record,
    now: new Date(NOW.getTime() + (AIRSHIP_ONLINE_BUILDER_DEFAULT_HEARTBEAT_POLICY.staleAfterSeconds + 1) * 1000),
  }), true);

  const response = buildAirshipOnlineBuilderHeartbeatResponse({ request, acceptedAt: NOW.toISOString() });
  assert.equal(response.ok, true);
  assert.equal(response.nextHeartbeatAfterSeconds, 30);
});

test("signed editor gateway token verifies expiry, owner, session, origin, migration, and site", () => {
  const config = {
    gatewayBaseUrl: "https://airship-gateway.test",
    signingSecret: "editor-gateway-secret",
    tokenTtlSeconds: 300,
    allowedOrigins: ["https://app.test"],
  };
  const signed = createAirshipOnlineBuilderSignedEditorGatewayToken({
    session: session({ state: "ready" }),
    config,
    requestedByUserId: "superadmin-1",
    ownerOrganizationId: "org-1",
    origin: "https://app.test",
    now: NOW,
    tokenId: "editor-token-1",
  });
  assert.match(signed.editorUrl, /^https:\/\/airship-gateway\.test\/editor\/aob_securitylifecycle001\?token=/);

  const success = verifyAirshipOnlineBuilderSignedEditorGatewayToken({
    token: signed.token,
    config,
    expectedSessionId: SESSION_ID,
    expectedRequestedByUserId: "superadmin-1",
    expectedOwnerOrganizationId: "org-1",
    expectedMigrationId: session().migrationId,
    expectedSiteKey: "chs",
    origin: "https://app.test",
    now: NOW,
  });
  assert.equal(success.ok, true);

  assert.equal(verifyAirshipOnlineBuilderSignedEditorGatewayToken({
    token: signed.token,
    config,
    expectedSessionId: "aob_wrongsession0001",
    expectedRequestedByUserId: "superadmin-1",
    expectedOwnerOrganizationId: "org-1",
    expectedMigrationId: session().migrationId,
    expectedSiteKey: "chs",
    origin: "https://app.test",
    now: NOW,
  }).ok, false);

  const wrongOwner = verifyAirshipOnlineBuilderSignedEditorGatewayToken({
    token: signed.token,
    config,
    expectedSessionId: SESSION_ID,
    expectedRequestedByUserId: "other-user",
    expectedOwnerOrganizationId: "org-1",
    expectedMigrationId: session().migrationId,
    expectedSiteKey: "chs",
    origin: "https://app.test",
    now: NOW,
  });
  assert.equal(wrongOwner.ok, false);
  assert.equal(wrongOwner.ok === false && wrongOwner.failureReason, "editor_token_wrong_owner");

  const expired = verifyAirshipOnlineBuilderSignedEditorGatewayToken({
    token: signed.token,
    config,
    expectedSessionId: SESSION_ID,
    expectedRequestedByUserId: "superadmin-1",
    expectedOwnerOrganizationId: "org-1",
    expectedMigrationId: session().migrationId,
    expectedSiteKey: "chs",
    origin: "https://app.test",
    now: new Date(NOW.getTime() + 301_000),
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.ok === false && expired.failureReason, "editor_token_expired");
});
