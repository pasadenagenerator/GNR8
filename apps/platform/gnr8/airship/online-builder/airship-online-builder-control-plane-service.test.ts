import assert from "node:assert/strict";
import test from "node:test";

import { createAirshipOnlineBuilderRouteHandlers } from "@/app/api/gnr8/admin/airship/online-builder/airship-online-builder-route-handlers";
import {
  createAirshipOnlineBuilderControlPlaneService,
  type AirshipOnlineBuilderControlPlaneContext,
} from "./airship-online-builder-control-plane-service";
import { AirshipOnlineBuilderFakeWorkerClient } from "./airship-online-builder-fake-worker-client";
import { createAirshipOnlineBuilderInMemoryRepository } from "./airship-online-builder-repository";
import { createAirshipOnlineBuilderFakeSecurityLifecycleConfig } from "./airship-online-builder-security-lifecycle";
import {
  AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID,
  AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
  buildAirshipOnlineBuilderAuditEvent,
} from "./airship-online-builder-security";
import type {
  AirshipOnlineBuilderDraftRef,
  AirshipOnlineBuilderSourceBundle,
} from "./airship-online-builder-worker-contract";

const SESSION_ID = "aob_123456789012345678";
const NOW = new Date("2026-09-22T12:00:00.000Z");

function context(overrides: Partial<AirshipOnlineBuilderControlPlaneContext> = {}): AirshipOnlineBuilderControlPlaneContext {
  return {
    actorUserId: "superadmin-1",
    actorRole: "platform_superadmin",
    ownerOrganizationId: "org-1",
    isSuperadmin: true,
    allowedOrigins: ["https://app.test"],
    requestOrigin: "https://app.test",
    csrfValidated: true,
    ...overrides,
  };
}

function sourceBundle(overrides: Partial<AirshipOnlineBuilderSourceBundle> = {}): AirshipOnlineBuilderSourceBundle {
  return {
    kind: "single-html-artifact",
    rootSha256: "root-sha",
    files: [
      {
        path: "index.html",
        sha256: "index-sha",
        bytes: 1024,
        contentsBase64: "PGh0bWw+PC9odG1sPg==",
      },
    ],
    ...overrides,
  };
}

function expectedDraft(overrides: Partial<AirshipOnlineBuilderDraftRef> = {}): AirshipOnlineBuilderDraftRef {
  return {
    id: "draft-1",
    version: 3,
    ...overrides,
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    context: context(),
    migrationId: AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID,
    sourceBundle: sourceBundle(),
    expectedDraft: expectedDraft(),
    ttlSeconds: 1800,
    idempotencyKey: "idem-create",
    correlationId: "corr-create",
    ...overrides,
  };
}

function actionInput(sessionId = SESSION_ID, ctx = context()) {
  return {
    context: ctx,
    sessionId,
    idempotencyKey: "idem-action",
    correlationId: "corr-action",
  };
}

function serviceWithFake(now = () => NOW) {
  const fake = new AirshipOnlineBuilderFakeWorkerClient({ now });
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  let auditCounter = 0;
  const service = createAirshipOnlineBuilderControlPlaneService({
    workerClient: fake,
    repository,
    now,
    sessionIdFactory: () => SESSION_ID,
    auditIdFactory: () => `audit-${++auditCounter}`,
    gatewayTokenIdFactory: () => `gateway-token-${auditCounter}`,
    securityLifecycleConfig: createAirshipOnlineBuilderFakeSecurityLifecycleConfig(),
  });
  return { fake, repository, service };
}

test("create session request validation blocks malformed source bundle", async () => {
  const { service } = serviceWithFake();
  const result = await service.createSession(createInput({
    sourceBundle: sourceBundle({
      files: [{ path: "../index.html", sha256: "", bytes: -1 }],
    }),
  }));

  assert.equal(result.ok, false);
  assert.equal(result.failureReason, "invalid_request");
  assert.deepEqual(result.mutationBoundaries, AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES);
  assert.match(result.diagnostics.join("\n"), /source_path_forbidden/);
  assert.match(result.diagnostics.join("\n"), /source_hash_required/);
});

test("superadmin/context enforcement rejects non-superadmin intent", async () => {
  const { service } = serviceWithFake();
  const result = await service.createSession(createInput({
    context: context({ actorRole: "operator", isSuperadmin: false }),
  }));

  assert.equal(result.ok, false);
  assert.equal(result.failureReason, "superadmin_required");
  assert.equal(result.status, 403);
});

test("non-allowlisted migration is blocked before any worker request", async () => {
  const { service } = serviceWithFake();
  const result = await service.createSession(createInput({ migrationId: "not-allowlisted" }));

  assert.equal(result.ok, false);
  assert.equal(result.failureReason, "migration_not_allowlisted");
  assert.equal(result.auditEvent.eventType, "request_blocked");
});

test("fake worker create/status/open/capture/stop flow is deterministic", async () => {
  const { repository, service } = serviceWithFake();
  const created = await service.createSession(createInput());
  assert.equal(created.ok, true);
  assert.equal(created.ok && created.value.state, "ready");
  assert.equal(created.ok && created.value.workerId, "fake-airship-worker-1");
  assert.equal((await repository.sessions.readByOpaqueSessionId(SESSION_ID))?.state, "ready");
  assert.equal((await repository.leases.readActiveLease(SESSION_ID))?.workerId, "fake-airship-worker-1");

  const status = await service.getSessionStatus(actionInput());
  assert.equal(status.ok, true);
  assert.equal(status.ok && status.value.readback.session.state, "ready");

  const editor = await service.openEditorUrl(actionInput());
  assert.equal(editor.ok, true);
  assert.equal(editor.ok && editor.value.state, "editor_opened");
  assert.match(editor.ok && editor.value.editorUrl || "", /^https:\/\/fake-airship-gateway\.test\/editor\/aob_123456789012345678\?token=aobe_/);
  assert.equal(Boolean(editor.ok && editor.value.editorUrl?.includes("fake-airship-worker.test")), false);

  const captured = await service.captureDiff(actionInput());
  assert.equal(captured.ok, true);
  assert.equal(captured.ok && captured.value.state, "captured");
  assert.equal(captured.ok && captured.value.capturedDiff?.changedFileCount, 1);
  assert.equal(captured.ok && captured.value.readback.reusePipeline.capturedDiffToMapper, "adapter_07_captured_diff_to_draft_mapper");
  assert.equal((await repository.capturedDiffs.readLatestForSession(SESSION_ID))?.changedFileCount, 1);

  const stopped = await service.stopSession(actionInput());
  assert.equal(stopped.ok, true);
  assert.equal(stopped.ok && stopped.value.state, "stopped");
  assert.equal(stopped.ok && stopped.value.cleanupAttempted, true);
  assert.equal((await repository.sessions.readByOpaqueSessionId(SESSION_ID))?.state, "stopped");
  assert.equal(await repository.leases.readActiveLease(SESSION_ID), null);
  assert.deepEqual(
    (await repository.auditEvents.listForSession(SESSION_ID)).map((event) => event.eventType),
    ["session_requested", "status_read", "editor_gateway_token_minted", "editor_opened", "diff_captured", "stop_requested"],
  );
});

test("lifecycle transition blocking rejects capture after captured state", async () => {
  const { service } = serviceWithFake();
  await service.createSession(createInput());
  const firstCapture = await service.captureDiff(actionInput());
  assert.equal(firstCapture.ok, true);

  const secondCapture = await service.captureDiff(actionInput());
  assert.equal(secondCapture.ok, false);
  assert.equal(secondCapture.failureReason, "unsupported_lifecycle_transition");
  assert.deepEqual(secondCapture.mutationBoundaries, AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES);
});

test("stop and capture reject session ownership mismatch", async () => {
  const { service } = serviceWithFake();
  await service.createSession(createInput());
  const otherContext = context({ actorUserId: "superadmin-2" });

  const capture = await service.captureDiff(actionInput(SESSION_ID, otherContext));
  assert.equal(capture.ok, false);
  assert.equal(capture.failureReason, "session_owner_mismatch");

  const stop = await service.stopSession(actionInput(SESSION_ID, otherContext));
  assert.equal(stop.ok, false);
  assert.equal(stop.failureReason, "session_owner_mismatch");
});

test("expired session cannot open editor or capture", async () => {
  let now = NOW;
  const { service } = serviceWithFake(() => now);
  await service.createSession(createInput({ ttlSeconds: 60 }));
  now = new Date("2026-09-22T12:01:01.000Z");

  const editor = await service.openEditorUrl(actionInput());
  assert.equal(editor.ok, false);
  assert.equal(editor.failureReason, "session_expired");

  const capture = await service.captureDiff(actionInput());
  assert.equal(capture.ok, false);
  assert.equal(capture.failureReason, "session_expired");
});

test("mutation flags prove no publish/live/demo/DNS/provider/source-capture mutation", async () => {
  const { service } = serviceWithFake();
  const result = await service.createSession(createInput());

  assert.equal(result.ok, true);
  assert.equal(result.mutationBoundaries.noPublishMutation, true);
  assert.equal(result.mutationBoundaries.noLivePointerMutation, true);
  assert.equal(result.mutationBoundaries.noDemoMutation, true);
  assert.equal(result.mutationBoundaries.noDnsMutation, true);
  assert.equal(result.mutationBoundaries.noProviderMutation, true);
  assert.equal(result.mutationBoundaries.noSourceCaptureImport, true);
  assert.equal(result.ok && result.value.readback?.boundaries.noPreviewHostBindingMutation, true);
});

test("not-configured behavior returns no-launch worker boundary", async () => {
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  const service = createAirshipOnlineBuilderControlPlaneService({
    repository,
    now: () => NOW,
    sessionIdFactory: () => SESSION_ID,
    auditIdFactory: () => "audit-1",
  });
  const result = await service.createSession(createInput());

  assert.equal(result.ok, false);
  assert.equal(result.failureReason, "worker_auth_not_configured");
  assert.equal(result.readback?.status, "not_configured");
  assert.equal(result.readback?.reason, "worker_auth_not_configured");
  assert.equal(result.readback?.canLaunchWorker, false);
  assert.equal(result.readback?.securityLifecycle.workerAuth, "not_configured");
  assert.equal(result.readback?.securityLifecycle.leaseManager, "not_configured");
  assert.equal(result.readback?.securityLifecycle.signedEditorGateway, "not_configured");
  assert.match(result.diagnostics.join("\n"), /no_remote_worker_launch_attempted/);
  assert.equal(await repository.sessions.readByOpaqueSessionId(SESSION_ID), null);
  assert.equal((await repository.auditEvents.listForSession(SESSION_ID))[0]?.eventType, "request_blocked");
});

test("route helper returns not-configured without exposing production launch behavior", async () => {
  const handlers = createAirshipOnlineBuilderRouteHandlers({
    now: () => NOW,
    sessionIdFactory: () => SESSION_ID,
    auditIdFactory: () => "audit-1",
    requireSuperadminContext: async () => context(),
  });
  const response = await handlers.POST(new Request("https://app.test/api/gnr8/admin/airship/online-builder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionMode: "create_session",
      migrationId: AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID,
      sourceBundle: sourceBundle(),
      expectedDraft: expectedDraft(),
      ttlSeconds: 1800,
      correlationId: "corr-route",
      idempotencyKey: "idem-route",
    }),
  }));
  const json = await response.json();

  assert.equal(response.status, 503);
  assert.equal(json.ok, false);
  assert.equal(json.failureReason, "worker_auth_not_configured");
  assert.equal(json.readback.status, "not_configured");
  assert.equal(json.readback.reason, "worker_auth_not_configured");
});

test("route helper Adapter 19 action names exercise typed fake worker flow", async () => {
  const repository = createAirshipOnlineBuilderInMemoryRepository();
  const fake = new AirshipOnlineBuilderFakeWorkerClient({ now: () => NOW });
  let auditCounter = 0;
  const handlers = createAirshipOnlineBuilderRouteHandlers({
    workerClient: fake,
    repository,
    now: () => NOW,
    sessionIdFactory: () => SESSION_ID,
    auditIdFactory: () => `audit-route-${++auditCounter}`,
    gatewayTokenIdFactory: () => `gateway-token-route-${auditCounter}`,
    securityLifecycleConfig: createAirshipOnlineBuilderFakeSecurityLifecycleConfig(),
    requireSuperadminContext: async () => context(),
  });
  const createResponse = await handlers.POST(new Request("https://app.test/api/gnr8/admin/airship/online-builder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionMode: "create_online_airship_session",
      migrationId: AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID,
      sourceBundle: sourceBundle(),
      expectedDraft: expectedDraft(),
      ttlSeconds: 1800,
      correlationId: "corr-route",
      idempotencyKey: "idem-route",
    }),
  }));
  assert.equal(createResponse.status, 200);

  const openResponse = await handlers.POST(new Request("https://app.test/api/gnr8/admin/airship/online-builder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionMode: "open_online_airship_editor",
      sessionId: SESSION_ID,
      correlationId: "corr-open",
      idempotencyKey: "idem-open",
    }),
  }));
  const openJson = await openResponse.json();
  assert.equal(openResponse.status, 200);
  assert.match(openJson.readback.editorUrl, /^https:\/\/fake-airship-gateway\.test\/editor\/aob_123456789012345678\?token=aobe_/);
  assert.equal((await repository.sessions.readByOpaqueSessionId(SESSION_ID))?.state, "editor_opened");
});

test("audit event construction includes boundaries and operator metadata", () => {
  const event = buildAirshipOnlineBuilderAuditEvent({
    id: "audit-1",
    sessionId: SESSION_ID,
    actorUserId: "superadmin-1",
    eventType: "session_requested",
    correlationId: "corr-1",
    idempotencyKey: "idem-1",
    metadata: { migrationId: AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID },
    createdAt: NOW.toISOString(),
  });

  assert.equal(event.eventType, "session_requested");
  assert.equal(event.severity, "info");
  assert.equal(event.idempotencyKey, "idem-1");
  assert.equal(event.metadata.migrationId, AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID);
  assert.deepEqual(event.metadata.boundaries, AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES);
});
