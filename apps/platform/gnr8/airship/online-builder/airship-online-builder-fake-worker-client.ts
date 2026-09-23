import {
  AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipOnlineBuilderCaptureDiffRequest,
  type AirshipOnlineBuilderCaptureDiffResponse,
  type AirshipOnlineBuilderCleanupExpiredSessionsRequest,
  type AirshipOnlineBuilderCleanupExpiredSessionsResponse,
  type AirshipOnlineBuilderCreateSessionRequest,
  type AirshipOnlineBuilderCreateSessionResponse,
  type AirshipOnlineBuilderEditorUrlRequest,
  type AirshipOnlineBuilderEditorUrlResponse,
  type AirshipOnlineBuilderGetSessionStatusRequest,
  type AirshipOnlineBuilderGetSessionStatusResponse,
  type AirshipOnlineBuilderHealthCheckRequest,
  type AirshipOnlineBuilderHealthCheckResponse,
  type AirshipOnlineBuilderSessionReadback,
  type AirshipOnlineBuilderSessionRecord,
  type AirshipOnlineBuilderStopSessionRequest,
  type AirshipOnlineBuilderStopSessionResponse,
  type AirshipOnlineBuilderWorkerClient,
  type AirshipOnlineBuilderWorkerLeaseRecord,
} from "./airship-online-builder-worker-contract";
import { AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES } from "./airship-online-builder-security";

export type AirshipOnlineBuilderFakeWorkerClientOptions = {
  workerId?: string;
  now?: () => Date;
};

export class AirshipOnlineBuilderFakeWorkerClient implements AirshipOnlineBuilderWorkerClient {
  readonly testOnlyFakeWorkerClient = true;

  private readonly workerId: string;
  private readonly now: () => Date;
  private readonly sessions = new Map<string, AirshipOnlineBuilderSessionRecord>();
  private readonly leases = new Map<string, AirshipOnlineBuilderWorkerLeaseRecord>();
  private captureCounter = 0;

  constructor(options: AirshipOnlineBuilderFakeWorkerClientOptions = {}) {
    this.workerId = options.workerId ?? "fake-airship-worker-1";
    this.now = options.now ?? (() => new Date("2026-09-22T12:00:00.000Z"));
  }

  async createSession(input: AirshipOnlineBuilderCreateSessionRequest): Promise<AirshipOnlineBuilderCreateSessionResponse> {
    const createdAt = this.now().toISOString();
    const expiresAt = new Date(this.now().getTime() + input.ttlSeconds * 1000).toISOString();
    const session: AirshipOnlineBuilderSessionRecord = {
      id: `record-${input.sessionId}`,
      opaqueSessionId: input.sessionId,
      state: "ready",
      migrationId: input.migrationId,
      siteKey: input.siteKey,
      allowedEditScope: input.allowedEditScope,
      requestedByUserId: input.securityContext.requestedByUserId,
      ownerOrganizationId: input.securityContext.ownerOrganizationId,
      expectedDraft: input.expectedDraft,
      editorUrlExpiresAt: new Date(this.now().getTime() + 5 * 60 * 1000).toISOString(),
      expiresAt,
      createdAt,
      updatedAt: createdAt,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
    const lease: AirshipOnlineBuilderWorkerLeaseRecord = {
      id: `lease-${input.sessionId}`,
      sessionId: input.sessionId,
      workerId: this.workerId,
      leaseTokenHash: `fake-lease-token-hash-${input.sessionId}`,
      state: "active",
      heartbeatAt: createdAt,
      expiresAt,
      acquiredAt: createdAt,
      releasedAt: null,
    };
    this.sessions.set(input.sessionId, session);
    this.leases.set(input.sessionId, lease);
    return {
      ok: true,
      sessionId: input.sessionId,
      state: "ready",
      workerId: this.workerId,
      leaseId: lease.id,
      statusUrl: `/v1/airship/sessions/${input.sessionId}`,
      diagnostics: ["fake_airship_online_builder_session_ready"],
      readback: this.readback(session),
    };
  }

  async getSessionStatus(input: AirshipOnlineBuilderGetSessionStatusRequest): Promise<AirshipOnlineBuilderGetSessionStatusResponse> {
    const session = this.sessionOrFailed(input.sessionId);
    return {
      ok: session.state !== "failed",
      failureReason: session.state === "failed" ? "session_not_found" : undefined,
      diagnostics: session.state === "failed" ? ["fake_airship_online_builder_session_not_found"] : ["fake_airship_online_builder_status_read"],
      readback: this.readback(session),
    };
  }

  async getEditorUrl(input: AirshipOnlineBuilderEditorUrlRequest): Promise<AirshipOnlineBuilderEditorUrlResponse> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      return {
        ok: false,
        sessionId: input.sessionId,
        state: "failed",
        editorUrl: null,
        expiresAt: null,
        failureReason: "session_not_found",
        diagnostics: ["fake_airship_online_builder_session_not_found"],
      };
    }
    if (Date.parse(session.expiresAt) <= this.now().getTime()) {
      this.sessions.set(input.sessionId, { ...session, state: "expired", updatedAt: this.now().toISOString() });
      return {
        ok: false,
        sessionId: input.sessionId,
        state: "expired",
        editorUrl: null,
        expiresAt: null,
        failureReason: "session_expired",
        diagnostics: ["fake_airship_online_builder_session_expired"],
      };
    }
    const updated = { ...session, state: "editor_opened" as const, updatedAt: this.now().toISOString() };
    this.sessions.set(input.sessionId, updated);
    return {
      ok: true,
      sessionId: input.sessionId,
      state: "editor_opened",
      editorUrl: `https://fake-airship-worker.test/editor/${input.sessionId}`,
      expiresAt: updated.editorUrlExpiresAt,
      diagnostics: ["fake_airship_online_builder_editor_url_minted"],
    };
  }

  async captureDiff(input: AirshipOnlineBuilderCaptureDiffRequest): Promise<AirshipOnlineBuilderCaptureDiffResponse> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      const failed = this.sessionOrFailed(input.sessionId);
      return {
        ok: false,
        sessionId: input.sessionId,
        state: "failed",
        capturedDiff: null,
        failureReason: "session_not_found",
        diagnostics: ["fake_airship_online_builder_session_not_found"],
        readback: this.readback(failed),
      };
    }
    if (Date.parse(session.expiresAt) <= this.now().getTime()) {
      const expired = { ...session, state: "expired" as const, updatedAt: this.now().toISOString() };
      this.sessions.set(input.sessionId, expired);
      return {
        ok: false,
        sessionId: input.sessionId,
        state: "expired",
        capturedDiff: null,
        failureReason: "session_expired",
        diagnostics: ["fake_airship_online_builder_session_expired"],
        readback: this.readback(expired),
      };
    }
    const captureId = `captured-diff-${++this.captureCounter}`;
    const captured = { ...session, state: "captured" as const, updatedAt: this.now().toISOString() };
    this.sessions.set(input.sessionId, captured);
    const capturedDiff = {
      id: captureId,
      sessionId: input.sessionId,
      captureRequestId: input.idempotencyKey,
      baselineSnapshotId: `baseline-${input.sessionId}`,
      captureSnapshotId: `capture-${input.sessionId}`,
      changedFileCount: 1,
      indexHtmlChanged: true,
      changedFiles: [
        {
          path: "index.html",
          status: "modified" as const,
          beforeSha256: "before",
          afterSha256: "after",
          beforeBytes: 10,
          afterBytes: 11,
          unifiedDiff: "@@ fake diff for ADAPTER 07 mapper readback @@",
        },
      ],
      createdAt: this.now().toISOString(),
    };
    return {
      ok: true,
      sessionId: input.sessionId,
      state: "captured",
      capturedDiff,
      diagnostics: ["fake_airship_online_builder_diff_captured", "adapter_07_mapper_next"],
      readback: this.readback(captured, captureId),
    };
  }

  async stopSession(input: AirshipOnlineBuilderStopSessionRequest): Promise<AirshipOnlineBuilderStopSessionResponse> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      return {
        ok: false,
        sessionId: input.sessionId,
        state: "failed",
        cleanupAttempted: false,
        failureReason: "session_not_found",
        diagnostics: ["fake_airship_online_builder_session_not_found"],
      };
    }
    const stopped = { ...session, state: "stopped" as const, updatedAt: this.now().toISOString(), editorUrlExpiresAt: null };
    this.sessions.set(input.sessionId, stopped);
    const lease = this.leases.get(input.sessionId);
    if (lease) this.leases.set(input.sessionId, { ...lease, state: "released", releasedAt: this.now().toISOString() });
    return {
      ok: true,
      sessionId: input.sessionId,
      state: "stopped",
      cleanupAttempted: true,
      diagnostics: ["fake_airship_online_builder_session_stopped", `fake_stop_reason:${input.reason}`],
    };
  }

  async cleanupExpiredSessions(input: AirshipOnlineBuilderCleanupExpiredSessionsRequest): Promise<AirshipOnlineBuilderCleanupExpiredSessionsResponse> {
    let inspectedCount = 0;
    let stoppedCount = 0;
    for (const [sessionId, session] of this.sessions) {
      if (inspectedCount >= input.limit) break;
      inspectedCount += 1;
      if (Date.parse(session.expiresAt) <= Date.parse(input.now)) {
        this.sessions.set(sessionId, { ...session, state: "expired", updatedAt: input.now, editorUrlExpiresAt: null });
        stoppedCount += 1;
      }
    }
    return {
      ok: true,
      inspectedCount,
      stoppedCount,
      failedCleanupCount: 0,
      diagnostics: ["fake_airship_online_builder_cleanup_expired_complete"],
    };
  }

  async healthCheck(_input: AirshipOnlineBuilderHealthCheckRequest): Promise<AirshipOnlineBuilderHealthCheckResponse> {
    return {
      ok: true,
      workerId: this.workerId,
      contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
      deploymentMode: "fake_test_worker",
      airshipCliVersion: null,
      capacity: {
        maxConcurrentSessions: 4,
        activeSessionCount: Array.from(this.sessions.values()).filter((session) => session.state !== "stopped" && session.state !== "expired").length,
      },
      dependencies: {
        packageCache: "healthy",
        workspaceRoot: "healthy",
        processSupervisor: "healthy",
      },
      diagnostics: ["fake_airship_online_builder_worker_healthy"],
    };
  }

  private sessionOrFailed(sessionId: string): AirshipOnlineBuilderSessionRecord {
    return this.sessions.get(sessionId) ?? {
      id: `missing-${sessionId}`,
      opaqueSessionId: sessionId,
      state: "failed",
      migrationId: "unknown",
      siteKey: "chs",
      allowedEditScope: "chs_text_safe_fields_v1",
      requestedByUserId: "unknown",
      ownerOrganizationId: "unknown",
      expectedDraft: { id: null, version: 0 },
      editorUrlExpiresAt: null,
      expiresAt: this.now().toISOString(),
      createdAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
      lastErrorCode: "session_not_found",
      lastErrorMessage: "Fake worker session not found.",
    };
  }

  private readback(session: AirshipOnlineBuilderSessionRecord, capturedDiffId: string | null = null): AirshipOnlineBuilderSessionReadback {
    const lease = this.leases.get(session.opaqueSessionId) ?? null;
    return {
      contractVersion: AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION,
      session,
      workerLease: lease
        ? {
          id: lease.id,
          workerId: lease.workerId,
          state: lease.state,
          heartbeatAt: lease.heartbeatAt,
          expiresAt: lease.expiresAt,
        }
        : null,
      baselineSnapshot: null,
      captureSnapshot: null,
      editorUrlAvailable: session.state === "ready" || session.state === "editor_opened",
      editorUrlExpiresAt: session.editorUrlExpiresAt,
      health: {
        targetServer: session.state === "stopped" || session.state === "expired" ? "stopped" : "healthy",
        airshipSidecar: session.state === "stopped" || session.state === "expired" ? "stopped" : "healthy",
      },
      reusePipeline: {
        capturedDiffToMapper: "adapter_07_captured_diff_to_draft_mapper",
        exactSafeMappingsToDraftApply: "adapter_08_confirmed_safe_draft_apply",
        appliedDraftToInternalPreview: "adapter_12_internal_preview_generation_bridge",
        capturedDiffId,
        mappingReadbackId: null,
        draftApplyReadbackId: null,
        generatedPreviewReadbackId: null,
      },
      nextRecommendedAction: session.state === "captured" ? "Map captured diff with ADAPTER 07." : "Open editor or capture when ready.",
      warnings: ["fake_worker_test_only"],
      diagnostics: ["fake_airship_online_builder_readback"],
      boundaries: AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
    };
  }
}
