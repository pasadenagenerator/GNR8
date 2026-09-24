import assert from "node:assert/strict";
import test from "node:test";

import { createAirshipOnlineBuilderInMemoryRepository } from "@/gnr8/airship/online-builder/airship-online-builder-repository";
import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipOnlineBuilderWorkerLeaseRecord,
} from "@/gnr8/airship/online-builder/airship-online-builder-worker-contract";
import {
  buildAirshipOnlineBuilderWorkerBearerToken,
  hashAirshipOnlineBuilderWorkerBearerToken,
  sha256Hex,
  signAirshipOnlineBuilderWorkerRequest,
  type AirshipOnlineBuilderWorkerIdentity,
} from "@/gnr8/airship/online-builder/airship-online-builder-worker-auth";
import { createAirshipOnlineBuilderWorkerRouteHandlers } from "./airship-online-builder-worker-route-handlers";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const LATER = "2026-09-23T12:05:00.000Z";
const WORKER_ID = "worker-1";
const SESSION_ID = "aob_workerroute001";
const SIGNING_SECRET = "worker-request-signing-secret";
const TOKEN = buildAirshipOnlineBuilderWorkerBearerToken({
  tokenId: "token-001",
  secret: "secretsecretsecretsecretsecret",
});

function worker(overrides: Partial<AirshipOnlineBuilderWorkerIdentity> = {}): AirshipOnlineBuilderWorkerIdentity {
  return {
    workerId: WORKER_ID,
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
    registeredAt: NOW.toISOString(),
    rotatedAt: null,
    lastAuthenticatedAt: null,
    ...overrides,
  };
}

function lease(overrides: Partial<AirshipOnlineBuilderWorkerLeaseRecord> = {}): AirshipOnlineBuilderWorkerLeaseRecord {
  return {
    id: "lease-1",
    sessionId: SESSION_ID,
    workerId: WORKER_ID,
    leaseTokenHash: "2".repeat(64),
    state: "active",
    heartbeatAt: NOW.toISOString(),
    expiresAt: LATER,
    acquiredAt: NOW.toISOString(),
    releasedAt: null,
    ...overrides,
  };
}

async function seedRepository() {
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  await repository.workers.upsertWorker(worker());
  await repository.workerAuthTokens.upsertTokenMetadata({
    id: "token-meta-1",
    workerId: WORKER_ID,
    tokenId: TOKEN.tokenId,
    tokenHash: hashAirshipOnlineBuilderWorkerBearerToken(TOKEN.plaintextToken),
    hashAlgorithm: "sha256",
    status: "active",
    audience: "gnr8-airship-online-builder-control-plane",
    issuedAt: NOW.toISOString(),
    expiresAt: "2026-09-23T13:00:00.000Z",
    rotatedAt: null,
    replacedByTokenId: null,
    lastUsedAt: null,
  });
  return repository;
}

function signedRequest(input: {
  path: string;
  body?: unknown;
  nonce?: string;
  authorization?: string;
}) {
  const bodyText = input.body === undefined ? "" : JSON.stringify(input.body);
  const signed = signAirshipOnlineBuilderWorkerRequest({
    workerId: WORKER_ID,
    method: "POST",
    path: input.path,
    bodySha256: sha256Hex(bodyText),
    timestamp: NOW.toISOString(),
    nonce: input.nonce ?? "nonce-1",
    signingSecret: SIGNING_SECRET,
  });
  return new Request(`https://app.test${input.path}`, {
    method: "POST",
    headers: {
      authorization: input.authorization ?? TOKEN.authorizationHeader,
      "content-type": "application/json",
      "x-gnr8-airship-worker-id": signed.workerId,
      "x-gnr8-airship-body-sha256": signed.bodySha256,
      "x-gnr8-airship-timestamp": signed.timestamp,
      "x-gnr8-airship-nonce": signed.nonce,
      "x-gnr8-airship-signature": signed.signature,
    },
    body: bodyText,
  });
}

test("private worker auth readback accepts hashed bearer token and exposes no editor URL", async () => {
  const repository = await seedRepository();
  const handlers = createAirshipOnlineBuilderWorkerRouteHandlers({
    repository,
    now: () => NOW,
    requestSigningSecret: SIGNING_SECRET,
  });
  const response = await handlers.workerAuth(signedRequest({ path: "/api/internal/gnr8/airship/online-builder/worker-auth", nonce: "auth-1" }));
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.worker.workerId, WORKER_ID);
  assert.equal(json.canLaunchWorker, false);
  assert.equal(json.exposesPublicEditorUrl, false);
  assert.equal(JSON.stringify(json).includes("aobw_"), false);
  assert.equal((await repository.workerAuthTokens.readByTokenId(TOKEN.tokenId))?.lastUsedAt, NOW.toISOString());
});

test("private worker auth rejects missing and replayed auth", async () => {
  const repository = await seedRepository();
  const seenNonces = new Set<string>();
  const handlers = createAirshipOnlineBuilderWorkerRouteHandlers({
    repository,
    now: () => NOW,
    requestSigningSecret: SIGNING_SECRET,
    seenNonces,
  });

  const missing = await handlers.workerAuth(new Request("https://app.test/api/internal/gnr8/airship/online-builder/worker-auth", { method: "POST" }));
  assert.equal(missing.status >= 400, true);

  const first = await handlers.workerAuth(signedRequest({ path: "/api/internal/gnr8/airship/online-builder/worker-auth", nonce: "replay-1" }));
  assert.equal(first.status, 200);
  const replay = await handlers.workerAuth(signedRequest({ path: "/api/internal/gnr8/airship/online-builder/worker-auth", nonce: "replay-1" }));
  const replayJson = await replay.json();
  assert.equal(replay.status, 403);
  assert.equal(replayJson.failureReason, "request_replay_rejected");
});

test("private heartbeat records heartbeat, renews lease heartbeat, and appends audit", async () => {
  const repository = await seedRepository();
  await repository.leases.upsertLease(lease());
  const handlers = createAirshipOnlineBuilderWorkerRouteHandlers({
    repository,
    now: () => NOW,
    requestSigningSecret: SIGNING_SECRET,
  });
  const body = {
    workerId: WORKER_ID,
    contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
    deploymentMode: "fake_test_worker",
    workerStatus: "healthy",
    capabilities: ["create_session"],
    activeSessions: [{ sessionId: SESSION_ID, leaseId: "lease-1", state: "ready", heartbeatAt: LATER }],
    processHealth: { targetServer: "healthy", airshipSidecar: "healthy", processSupervisor: "healthy", activeProcessCount: 2 },
    cleanupHealth: { pendingCleanupCount: 0, lastCleanupAt: null, lastCleanupStatus: "not_run" },
    diagnostics: ["ok"],
    correlationId: "corr-heartbeat",
  };
  const response = await handlers.heartbeat(signedRequest({
    path: "/api/internal/gnr8/airship/online-builder/heartbeat",
    body,
    nonce: "heartbeat-1",
  }));
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal((await repository.heartbeats.readLatestForWorker(WORKER_ID))?.activeSessionCount, 1);
  assert.equal((await repository.leases.readActiveLease(SESSION_ID))?.heartbeatAt, LATER);
  assert.equal((await repository.auditEvents.listForSession(WORKER_ID)).some((event) => event.eventType === "worker_heartbeat"), true);
});

test("private lease release updates durable lease state and cannot launch workers", async () => {
  const repository = await seedRepository();
  await repository.leases.upsertLease(lease());
  const handlers = createAirshipOnlineBuilderWorkerRouteHandlers({
    repository,
    now: () => NOW,
    requestSigningSecret: SIGNING_SECRET,
  });
  const response = await handlers.lease(signedRequest({
    path: "/api/internal/gnr8/airship/online-builder/leases",
    body: { actionMode: "release", sessionId: SESSION_ID, leaseId: "lease-1", correlationId: "corr-release" },
    nonce: "lease-release-1",
  }));
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.canLaunchWorker, false);
  assert.equal(await repository.leases.readActiveLease(SESSION_ID), null);
  assert.equal((await repository.auditEvents.listForSession(SESSION_ID)).some((event) => event.eventType === "lease_released"), true);
});
