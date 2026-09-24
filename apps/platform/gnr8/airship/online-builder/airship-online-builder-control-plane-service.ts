import {
  canTransitionAirshipOnlineBuilderSession,
  type AirshipOnlineBuilderAuditEventRecord,
  type AirshipOnlineBuilderCaptureDiffResponse,
  type AirshipOnlineBuilderCreateSessionResponse,
  type AirshipOnlineBuilderDisabledReadback,
  type AirshipOnlineBuilderDraftApplyReadbackRecord,
  type AirshipOnlineBuilderDraftRef,
  type AirshipOnlineBuilderEditorUrlResponse,
  type AirshipOnlineBuilderFailureReason,
  type AirshipOnlineBuilderGeneratedPreviewReadbackRecord,
  type AirshipOnlineBuilderGetSessionStatusResponse,
  type AirshipOnlineBuilderMutationBoundaries,
  type AirshipOnlineBuilderSecurityLifecycleReadback,
  type AirshipOnlineBuilderSessionReadback,
  type AirshipOnlineBuilderSessionState,
  type AirshipOnlineBuilderSiteKey,
  type AirshipOnlineBuilderSourceBundle,
  type AirshipOnlineBuilderStopSessionResponse,
  type AirshipOnlineBuilderWorkerClient,
} from "./airship-online-builder-worker-contract";
import { createAirshipOnlineBuilderSignedEditorGatewayToken } from "./airship-online-builder-editor-gateway";
import {
  AIRSHIP_ONLINE_BUILDER_DEFAULT_MIGRATION_ALLOWLIST,
  AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
  type AirshipOnlineBuilderMigrationAllowlistEntry,
  assertAirshipOnlineBuilderSessionOwner,
  buildAirshipOnlineBuilderAuditEvent,
  findAirshipOnlineBuilderMigrationAllowlistEntry,
  isAirshipOnlineBuilderSessionExpired,
  isValidAirshipOnlineBuilderOpaqueSessionId,
  validateAirshipOnlineBuilderOriginIntent,
} from "./airship-online-builder-security";
import type { AirshipOnlineBuilderRepositoryBoundary } from "./airship-online-builder-repository";
import {
  createConfiguredAirshipOnlineBuilderRepository,
  decorateAirshipOnlineBuilderSecurityLifecycleConfigFromEnv,
} from "./airship-online-builder-runtime-config";
import {
  gateAirshipOnlineBuilderSecurityLifecycle,
  readAirshipOnlineBuilderSecurityLifecycle,
  type AirshipOnlineBuilderSecurityLifecycleConfig,
} from "./airship-online-builder-security-lifecycle";

export type AirshipOnlineBuilderControlPlaneContext = {
  actorUserId: string;
  actorRole: "platform_superadmin" | "operator" | "viewer";
  ownerOrganizationId: string;
  isSuperadmin: boolean;
  allowedOrigins: string[];
  requestOrigin: string;
  csrfValidated: boolean;
};

export type AirshipOnlineBuilderControlPlaneFailure = {
  ok: false;
  failureReason: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
  status: number;
  mutationBoundaries: AirshipOnlineBuilderMutationBoundaries;
  auditEvent: AirshipOnlineBuilderAuditEventRecord;
  readback?: AirshipOnlineBuilderDisabledReadback;
};

export type AirshipOnlineBuilderControlPlaneSuccess<T> = {
  ok: true;
  value: T;
  diagnostics: string[];
  status: number;
  mutationBoundaries: AirshipOnlineBuilderMutationBoundaries;
  auditEvent: AirshipOnlineBuilderAuditEventRecord;
};

export type AirshipOnlineBuilderControlPlaneResult<T> =
  | AirshipOnlineBuilderControlPlaneSuccess<T>
  | AirshipOnlineBuilderControlPlaneFailure;

function isControlPlaneFailure(value: unknown): value is AirshipOnlineBuilderControlPlaneFailure {
  return Boolean(value && typeof value === "object" && "ok" in value && value.ok === false);
}

export type AirshipOnlineBuilderControlPlaneServiceDeps = {
  workerClient?: AirshipOnlineBuilderWorkerClient | null;
  repository?: AirshipOnlineBuilderRepositoryBoundary;
  migrationAllowlist?: readonly AirshipOnlineBuilderMigrationAllowlistEntry[];
  now?: () => Date;
  sessionIdFactory?: () => string;
  auditIdFactory?: () => string;
  gatewayTokenIdFactory?: () => string;
  securityLifecycleConfig?: AirshipOnlineBuilderSecurityLifecycleConfig | null;
};

export type CreateOnlineBuilderSessionInput = {
  context: AirshipOnlineBuilderControlPlaneContext;
  migrationId: string;
  siteKey?: AirshipOnlineBuilderSiteKey;
  sourceBundle: AirshipOnlineBuilderSourceBundle;
  expectedDraft: AirshipOnlineBuilderDraftRef;
  ttlSeconds?: number;
  idempotencyKey: string;
  correlationId: string;
};

export type OnlineBuilderSessionActionInput = {
  context: AirshipOnlineBuilderControlPlaneContext;
  sessionId: string;
  idempotencyKey: string;
  correlationId: string;
};

export type ConfirmedDraftApplyBridgeInput = OnlineBuilderSessionActionInput & {
  confirmed: boolean;
  mappingReadbackId: string;
  expectedDraft: AirshipOnlineBuilderDraftRef;
};

export type ConfirmedPreviewGenerationBridgeInput = OnlineBuilderSessionActionInput & {
  confirmed: boolean;
  draftApplyReadbackId: string;
};

export function createAirshipOnlineBuilderControlPlaneService(deps: AirshipOnlineBuilderControlPlaneServiceDeps = {}) {
  const now = deps.now ?? (() => new Date());
  const sessionIdFactory = deps.sessionIdFactory ?? (() => `aob_${Date.now().toString(36)}000000000000000000`);
  const auditIdFactory = deps.auditIdFactory ?? (() => `audit-${Date.now().toString(36)}`);
  const gatewayTokenIdFactory = deps.gatewayTokenIdFactory ?? (() => `editor-gateway-${Date.now().toString(36)}`);
  const migrationAllowlist = deps.migrationAllowlist ?? AIRSHIP_ONLINE_BUILDER_DEFAULT_MIGRATION_ALLOWLIST;
  const repository = deps.repository ?? createConfiguredAirshipOnlineBuilderRepository();
  const securityLifecycleConfig = decorateAirshipOnlineBuilderSecurityLifecycleConfigFromEnv(deps.securityLifecycleConfig);

  function disabledReadback(input: {
    session: AirshipOnlineBuilderDisabledReadback["session"];
    diagnostics: string[];
    reason?: AirshipOnlineBuilderDisabledReadback["reason"];
    disabledReasons?: AirshipOnlineBuilderDisabledReadback["disabledReasons"];
    securityLifecycle?: AirshipOnlineBuilderSecurityLifecycleReadback;
  }): AirshipOnlineBuilderDisabledReadback {
    const securityLifecycle = input.securityLifecycle ?? readAirshipOnlineBuilderSecurityLifecycle({ config: securityLifecycleConfig });
    return {
      status: "not_configured",
      reason: input.reason ?? "remote_worker_not_configured",
      explanation: "Remote builder worker, worker auth, lease manager, and signed editor gateway must all be configured before online Airship can launch. Local proof flow remains available.",
      disabledReasons: input.disabledReasons ?? [
        "remote_worker_not_configured",
        "worker_auth_not_configured",
        "lease_manager_not_configured",
        "signed_editor_gateway_not_configured",
        "remote_worker_lease_missing",
      ],
      securityLifecycle,
      session: input.session,
      canLaunchWorker: false,
      localProofFlowAvailable: true,
      draftApplyRequiresConfirmation: true,
      previewGenerationRequiresConfirmation: true,
      liveSiteMutation: false,
      diagnostics: input.diagnostics,
      boundaries: AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
    };
  }

  function fail(input: {
    context: Pick<AirshipOnlineBuilderControlPlaneContext, "actorUserId">;
    sessionId: string;
    failureReason: AirshipOnlineBuilderFailureReason;
    diagnostics: string[];
    status: number;
    correlationId: string;
    idempotencyKey?: string | null;
  }): AirshipOnlineBuilderControlPlaneFailure {
    const securityLifecycle = readAirshipOnlineBuilderSecurityLifecycle({ config: securityLifecycleConfig });
    return {
      ok: false,
      failureReason: input.failureReason,
      diagnostics: input.diagnostics,
      status: input.status,
      mutationBoundaries: AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
      auditEvent: buildAirshipOnlineBuilderAuditEvent({
        id: auditIdFactory(),
        sessionId: input.sessionId,
        actorUserId: input.context.actorUserId,
        eventType: input.failureReason === "worker_not_configured" ? "worker_not_configured" : "request_blocked",
        severity: input.status >= 500 ? "error" : "warning",
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey ?? null,
        metadata: { failureReason: input.failureReason, diagnostics: input.diagnostics },
        createdAt: now().toISOString(),
      }),
      ...(input.failureReason === "worker_not_configured" ||
      input.failureReason === "worker_auth_not_configured" ||
      input.failureReason === "lease_manager_not_configured" ||
      input.failureReason === "editor_gateway_not_configured"
        ? {
          readback: disabledReadback({
            session: null,
            diagnostics: input.diagnostics,
            reason: input.failureReason === "worker_auth_not_configured"
              ? "worker_auth_not_configured"
              : input.failureReason === "lease_manager_not_configured"
                ? "lease_manager_not_configured"
                : input.failureReason === "editor_gateway_not_configured"
                  ? "signed_editor_gateway_not_configured"
                  : "remote_worker_not_configured",
            securityLifecycle,
          }),
        }
        : {}),
    };
  }

  async function appendAuditEvent(event: AirshipOnlineBuilderAuditEventRecord): Promise<void> {
    await repository.auditEvents.appendAuditEvent(event);
  }

  async function persistResult<T>(result: AirshipOnlineBuilderControlPlaneResult<T>): Promise<AirshipOnlineBuilderControlPlaneResult<T>> {
    await appendAuditEvent(result.auditEvent);
    return result;
  }

  async function persistReadback(readback: AirshipOnlineBuilderSessionReadback): Promise<void> {
    const existing = await repository.sessions.readByOpaqueSessionId(readback.session.opaqueSessionId);
    if (!existing) {
      await repository.sessions.createRequestedSession(readback.session);
    } else {
      await repository.sessions.updateState({
        opaqueSessionId: readback.session.opaqueSessionId,
        state: readback.session.state,
        updatedAt: readback.session.updatedAt,
        editorUrlExpiresAt: readback.session.editorUrlExpiresAt,
        lastErrorCode: readback.session.lastErrorCode,
        lastErrorMessage: readback.session.lastErrorMessage,
      });
    }
    if (readback.workerLease) {
      const activeLease = await repository.leases.readActiveLease(readback.session.opaqueSessionId);
      await repository.leases.upsertLease({
        id: readback.workerLease.id,
        sessionId: readback.session.opaqueSessionId,
        workerId: readback.workerLease.workerId,
        leaseTokenHash: activeLease?.leaseTokenHash ?? `readback-lease-token-hash:${readback.workerLease.id}`,
        state: readback.workerLease.state,
        heartbeatAt: readback.workerLease.heartbeatAt,
        expiresAt: readback.workerLease.expiresAt,
        acquiredAt: activeLease?.acquiredAt ?? readback.session.createdAt,
        releasedAt: activeLease?.releasedAt ?? null,
      });
    }
    if (readback.baselineSnapshot) await repository.workspaceSnapshots.createSnapshot(readback.baselineSnapshot);
    if (readback.captureSnapshot) await repository.workspaceSnapshots.createSnapshot(readback.captureSnapshot);
  }

  async function persistCapturedDiff(response: AirshipOnlineBuilderCaptureDiffResponse): Promise<void> {
    if (response.capturedDiff) await repository.capturedDiffs.createCapturedDiff(response.capturedDiff);
    await persistReadback(response.readback);
  }

  function succeed<T>(input: {
    context: Pick<AirshipOnlineBuilderControlPlaneContext, "actorUserId">;
    sessionId: string;
    value: T;
    diagnostics: string[];
    correlationId: string;
    idempotencyKey?: string | null;
    eventType: AirshipOnlineBuilderAuditEventRecord["eventType"];
  }): AirshipOnlineBuilderControlPlaneSuccess<T> {
    return {
      ok: true,
      value: input.value,
      diagnostics: input.diagnostics,
      status: 200,
      mutationBoundaries: AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
      auditEvent: buildAirshipOnlineBuilderAuditEvent({
        id: auditIdFactory(),
        sessionId: input.sessionId,
        actorUserId: input.context.actorUserId,
        eventType: input.eventType,
        severity: "info",
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey ?? null,
        metadata: { diagnostics: input.diagnostics },
        createdAt: now().toISOString(),
      }),
    };
  }

  function preflight(input: {
    context: AirshipOnlineBuilderControlPlaneContext;
    sessionId: string;
    correlationId: string;
    idempotencyKey?: string | null;
  }): AirshipOnlineBuilderControlPlaneFailure | null {
    if (!input.context.isSuperadmin || input.context.actorRole !== "platform_superadmin") {
      return fail({
        ...input,
        failureReason: "superadmin_required",
        diagnostics: ["airship_online_builder_superadmin_required"],
        status: 403,
      });
    }
    const intent = validateAirshipOnlineBuilderOriginIntent({
      origin: input.context.requestOrigin,
      allowedOrigins: input.context.allowedOrigins,
      csrfValidated: input.context.csrfValidated,
    });
    if (!intent.ok) {
      return fail({
        ...input,
        failureReason: "origin_or_csrf_invalid",
        diagnostics: intent.diagnostics,
        status: 403,
      });
    }
    return null;
  }

  function workerOrFailure(input: {
    context: AirshipOnlineBuilderControlPlaneContext;
    sessionId: string;
    correlationId: string;
    idempotencyKey?: string | null;
  }): AirshipOnlineBuilderWorkerClient | AirshipOnlineBuilderControlPlaneFailure {
    if (!deps.workerClient) {
      return fail({
        ...input,
        failureReason: "worker_not_configured",
        diagnostics: ["airship_online_builder_worker_client_not_configured", "no_remote_worker_launch_attempted"],
        status: 503,
      });
    }
    return deps.workerClient;
  }

  function securityLifecycleOrFailure(input: {
    context: AirshipOnlineBuilderControlPlaneContext;
    sessionId: string;
    correlationId: string;
    idempotencyKey?: string | null;
  }): AirshipOnlineBuilderControlPlaneFailure | null {
    const gate = gateAirshipOnlineBuilderSecurityLifecycle({
      config: securityLifecycleConfig,
      workerClient: deps.workerClient,
    });
    if (gate.ok) return null;
    return {
      ...fail({
        ...input,
        failureReason: gate.failureReason,
        diagnostics: gate.diagnostics,
        status: 503,
      }),
      readback: disabledReadback({
        session: null,
        diagnostics: gate.diagnostics,
        reason: gate.failureReason === "worker_auth_not_configured"
          ? "worker_auth_not_configured"
          : gate.failureReason === "lease_manager_not_configured"
            ? "lease_manager_not_configured"
            : "signed_editor_gateway_not_configured",
        disabledReasons: gate.disabledReasons,
        securityLifecycle: gate.readback,
      }),
    };
  }

  function validateSourceBundle(sourceBundle: AirshipOnlineBuilderSourceBundle): string[] {
    const diagnostics: string[] = [];
    if (!sourceBundle.rootSha256) diagnostics.push("airship_online_builder_source_bundle_root_hash_required");
    if (sourceBundle.files.length === 0) diagnostics.push("airship_online_builder_source_bundle_files_required");
    for (const file of sourceBundle.files) {
      if (file.path.startsWith("/") || file.path.includes("..")) diagnostics.push(`airship_online_builder_source_path_forbidden:${file.path}`);
      if (!file.sha256) diagnostics.push(`airship_online_builder_source_hash_required:${file.path}`);
      if (!Number.isInteger(file.bytes) || file.bytes < 0) diagnostics.push(`airship_online_builder_source_bytes_invalid:${file.path}`);
    }
    return diagnostics;
  }

  async function statusReadback(input: OnlineBuilderSessionActionInput): Promise<AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderGetSessionStatusResponse>> {
    const preflightFailure = preflight(input);
    if (preflightFailure) return preflightFailure;
    if (!isValidAirshipOnlineBuilderOpaqueSessionId(input.sessionId)) {
      return fail({
        ...input,
        failureReason: "session_id_invalid",
        diagnostics: ["airship_online_builder_session_id_invalid"],
        status: 400,
      });
    }
    const worker = workerOrFailure(input);
    if (isControlPlaneFailure(worker)) return worker;
    const response = await worker.getSessionStatus({ sessionId: input.sessionId });
    try {
      assertAirshipOnlineBuilderSessionOwner({
        session: response.readback.session,
        actorUserId: input.context.actorUserId,
        ownerOrganizationId: input.context.ownerOrganizationId,
      });
    } catch {
      return fail({
        ...input,
        failureReason: "session_owner_mismatch",
        diagnostics: ["airship_online_builder_session_owner_mismatch"],
        status: 403,
      });
    }
    return succeed({
      context: input.context,
      sessionId: input.sessionId,
      value: response,
      diagnostics: response.diagnostics,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      eventType: "status_read",
    });
  }

  async function guardedReadback(input: OnlineBuilderSessionActionInput): Promise<AirshipOnlineBuilderControlPlaneFailure | AirshipOnlineBuilderSessionReadback> {
    const status = await statusReadback(input);
    if (!status.ok) return status;
    const readback = status.value.readback;
    if (isAirshipOnlineBuilderSessionExpired({ session: readback.session, now: now() })) {
      return fail({
        ...input,
        failureReason: "session_expired",
        diagnostics: ["airship_online_builder_session_expired"],
        status: 409,
      });
    }
    return readback;
  }

  function assertTransition(input: {
    context: AirshipOnlineBuilderControlPlaneContext;
    sessionId: string;
    from: AirshipOnlineBuilderSessionState;
    to: AirshipOnlineBuilderSessionState;
    correlationId: string;
    idempotencyKey: string;
  }): AirshipOnlineBuilderControlPlaneFailure | null {
    if (canTransitionAirshipOnlineBuilderSession(input.from, input.to)) return null;
    return fail({
      ...input,
      failureReason: "unsupported_lifecycle_transition",
      diagnostics: [`airship_online_builder_unsupported_lifecycle_transition:${input.from}->${input.to}`],
      status: 409,
    });
  }

  return {
    async createSession(input: CreateOnlineBuilderSessionInput): Promise<AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderCreateSessionResponse>> {
      const sessionId = sessionIdFactory();
      const preflightFailure = preflight({ ...input, sessionId });
      if (preflightFailure) return persistResult(preflightFailure);
      const allowlistEntry = findAirshipOnlineBuilderMigrationAllowlistEntry({
        migrationId: input.migrationId,
        siteKey: input.siteKey ?? null,
        allowlist: migrationAllowlist,
      });
      if (!allowlistEntry) {
        return persistResult(fail({
          ...input,
          sessionId,
          failureReason: "migration_not_allowlisted",
          diagnostics: ["airship_online_builder_migration_not_allowlisted"],
          status: 403,
        }));
      }
      const sourceBundleDiagnostics = validateSourceBundle(input.sourceBundle);
      if (sourceBundleDiagnostics.length > 0 || input.expectedDraft.version < 1) {
        return persistResult(fail({
          ...input,
          sessionId,
          failureReason: "invalid_request",
          diagnostics: [
            ...sourceBundleDiagnostics,
            ...(input.expectedDraft.version < 1 ? ["airship_online_builder_expected_draft_version_invalid"] : []),
          ],
          status: 400,
        }));
      }
      const ttlSeconds = input.ttlSeconds ?? 30 * 60;
      if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 2 * 60 * 60) {
        return persistResult(fail({
          ...input,
          sessionId,
          failureReason: "invalid_request",
          diagnostics: ["airship_online_builder_ttl_seconds_invalid"],
          status: 400,
        }));
      }
      const securityLifecycleFailure = securityLifecycleOrFailure({ ...input, sessionId });
      if (securityLifecycleFailure) return persistResult(securityLifecycleFailure);
      const createdAt = now().toISOString();
      const expiresAt = new Date(now().getTime() + ttlSeconds * 1000).toISOString();
      const requestedSession = await repository.sessions.createRequestedSession({
        id: `record-${sessionId}`,
        opaqueSessionId: sessionId,
        state: "requested",
        migrationId: input.migrationId,
        siteKey: allowlistEntry.siteKey,
        allowedEditScope: allowlistEntry.allowedEditScope,
        requestedByUserId: input.context.actorUserId,
        ownerOrganizationId: input.context.ownerOrganizationId,
        expectedDraft: input.expectedDraft,
        editorUrlExpiresAt: null,
        expiresAt,
        createdAt,
        updatedAt: createdAt,
        lastErrorCode: null,
        lastErrorMessage: null,
      });
      const worker = workerOrFailure({ ...input, sessionId });
      if (isControlPlaneFailure(worker)) {
        await repository.sessions.updateState({
          opaqueSessionId: sessionId,
          state: "failed",
          updatedAt: now().toISOString(),
          lastErrorCode: "worker_not_configured",
          lastErrorMessage: "Remote builder worker is not connected yet.",
        });
        const result = {
          ...worker,
          readback: disabledReadback({
            session: {
              ...requestedSession,
              state: "failed",
              updatedAt: now().toISOString(),
              lastErrorCode: "worker_not_configured",
              lastErrorMessage: "Remote builder worker is not connected yet.",
            },
            diagnostics: worker.diagnostics,
            securityLifecycle: readAirshipOnlineBuilderSecurityLifecycle({ config: securityLifecycleConfig }),
          }),
        };
        return persistResult(result);
      }
      const response = await worker.createSession({
        sessionId,
        migrationId: input.migrationId,
        siteKey: allowlistEntry.siteKey,
        allowedEditScope: allowlistEntry.allowedEditScope,
        sourceBundle: input.sourceBundle,
        expectedDraft: input.expectedDraft,
        ttlSeconds,
        securityContext: {
          requestedByUserId: input.context.actorUserId,
          ownerOrganizationId: input.context.ownerOrganizationId,
          superadminOnly: true,
          allowedOrigins: input.context.allowedOrigins,
          csrfValidatedByGnr8: true,
        },
        idempotencyKey: input.idempotencyKey,
      });
      if (response.readback) await persistReadback(response.readback);
      const transitionFailure = assertTransition({
        context: input.context,
        sessionId,
        from: "requested",
        to: response.state,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      });
      if (transitionFailure) return persistResult(transitionFailure);
      return persistResult(succeed({
        context: input.context,
        sessionId,
        value: response,
        diagnostics: ["airship_online_builder_session_create_request_built", ...response.diagnostics],
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        eventType: "session_requested",
      }));
    },

    async getSessionStatus(input: OnlineBuilderSessionActionInput): Promise<AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderGetSessionStatusResponse>> {
      const result = await statusReadback(input);
      if (result.ok) await persistReadback(result.value.readback);
      return persistResult(result);
    },

    async openEditorUrl(input: OnlineBuilderSessionActionInput): Promise<AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderEditorUrlResponse>> {
      const readback = await guardedReadback(input);
      if (isControlPlaneFailure(readback)) return persistResult(readback);
      if (readback.session.state !== "ready" && readback.session.state !== "editor_opened") {
        return persistResult(fail({
          ...input,
          failureReason: "unsupported_lifecycle_transition",
          diagnostics: [`airship_online_builder_editor_url_state_blocked:${readback.session.state}`],
          status: 409,
        }));
      }
      const securityLifecycleFailure = securityLifecycleOrFailure(input);
      if (securityLifecycleFailure) return persistResult(securityLifecycleFailure);
      const worker = workerOrFailure(input);
      if (isControlPlaneFailure(worker)) return persistResult(worker);
      const response = await worker.getEditorUrl({
        sessionId: input.sessionId,
        requestedByUserId: input.context.actorUserId,
        origin: input.context.requestOrigin,
        idempotencyKey: input.idempotencyKey,
      });
      const transitionFailure = assertTransition({
        context: input.context,
        sessionId: input.sessionId,
        from: readback.session.state,
        to: response.state,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      });
      if (transitionFailure) return persistResult(transitionFailure);
      const editorGatewayConfig = securityLifecycleConfig?.editorGateway;
      let gatewayDiagnostics: string[] = [];
      let gatewayEditorUrl = response.editorUrl;
      let gatewayExpiresAt = response.expiresAt;
      if (editorGatewayConfig && response.ok && response.state !== "expired" && response.state !== "failed") {
        const signedGateway = createAirshipOnlineBuilderSignedEditorGatewayToken({
          session: readback.session,
          config: editorGatewayConfig,
          requestedByUserId: input.context.actorUserId,
          ownerOrganizationId: input.context.ownerOrganizationId,
          origin: input.context.requestOrigin,
          now: now(),
          tokenId: gatewayTokenIdFactory(),
        });
        await repository.editorGatewayTokens.createTokenMetadata(signedGateway.metadata);
        await appendAuditEvent(buildAirshipOnlineBuilderAuditEvent({
          id: auditIdFactory(),
          sessionId: input.sessionId,
          actorUserId: input.context.actorUserId,
          eventType: "editor_gateway_token_minted",
          severity: "info",
          correlationId: input.correlationId,
          idempotencyKey: input.idempotencyKey,
          metadata: {
            tokenHash: signedGateway.metadata.tokenHash,
            expiresAt: signedGateway.metadata.expiresAt,
            allowedOrigin: signedGateway.metadata.allowedOrigin,
          },
          createdAt: now().toISOString(),
        }));
        gatewayEditorUrl = signedGateway.editorUrl;
        gatewayExpiresAt = signedGateway.metadata.expiresAt;
        gatewayDiagnostics = ["airship_online_builder_signed_editor_gateway_token_minted"];
      }
      const gatewayResponse: AirshipOnlineBuilderEditorUrlResponse = {
        ...response,
        editorUrl: gatewayEditorUrl,
        expiresAt: gatewayExpiresAt,
        diagnostics: [...response.diagnostics, ...gatewayDiagnostics],
      };
      await repository.sessions.updateState({
        opaqueSessionId: input.sessionId,
        state: response.state,
        updatedAt: now().toISOString(),
        editorUrlExpiresAt: gatewayResponse.expiresAt,
        lastErrorCode: response.failureReason ?? null,
        lastErrorMessage: response.failureReason ? response.diagnostics.join("; ") : null,
      });
      return persistResult(succeed({
        context: input.context,
        sessionId: input.sessionId,
        value: gatewayResponse,
        diagnostics: gatewayResponse.diagnostics,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        eventType: "editor_opened",
      }));
    },

    async captureDiff(input: OnlineBuilderSessionActionInput): Promise<AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderCaptureDiffResponse>> {
      const readback = await guardedReadback(input);
      if (isControlPlaneFailure(readback)) return persistResult(readback);
      if (readback.session.state !== "ready" && readback.session.state !== "editor_opened" && readback.session.state !== "capture_requested") {
        return persistResult(fail({
          ...input,
          failureReason: "unsupported_lifecycle_transition",
          diagnostics: [`airship_online_builder_capture_state_blocked:${readback.session.state}`],
          status: 409,
        }));
      }
      const securityLifecycleFailure = securityLifecycleOrFailure(input);
      if (securityLifecycleFailure) return persistResult(securityLifecycleFailure);
      const worker = workerOrFailure(input);
      if (isControlPlaneFailure(worker)) return persistResult(worker);
      const response = await worker.captureDiff({
        sessionId: input.sessionId,
        requestedByUserId: input.context.actorUserId,
        expectedDraft: readback.session.expectedDraft,
        idempotencyKey: input.idempotencyKey,
      });
      const transitionFailure = assertTransition({
        context: input.context,
        sessionId: input.sessionId,
        from: readback.session.state,
        to: response.state,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      });
      if (transitionFailure) return persistResult(transitionFailure);
      await persistCapturedDiff(response);
      return persistResult(succeed({
        context: input.context,
        sessionId: input.sessionId,
        value: response,
        diagnostics: ["airship_online_builder_captured_diff_to_adapter_07_mapper_readback", ...response.diagnostics],
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        eventType: "diff_captured",
      }));
    },

    async stopSession(input: OnlineBuilderSessionActionInput): Promise<AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderStopSessionResponse>> {
      const readback = await statusReadback(input);
      if (!readback.ok) return persistResult(readback);
      if (readback.value.readback.session.state === "stopped") {
        return persistResult(fail({
          ...input,
          failureReason: "unsupported_lifecycle_transition",
          diagnostics: ["airship_online_builder_stop_state_blocked:stopped"],
          status: 409,
        }));
      }
      const securityLifecycleFailure = securityLifecycleOrFailure(input);
      if (securityLifecycleFailure) return persistResult(securityLifecycleFailure);
      const worker = workerOrFailure(input);
      if (isControlPlaneFailure(worker)) return persistResult(worker);
      const response = await worker.stopSession({
        sessionId: input.sessionId,
        requestedByUserId: input.context.actorUserId,
        reason: "operator_requested",
        idempotencyKey: input.idempotencyKey,
      });
      const transitionFailure = assertTransition({
        context: input.context,
        sessionId: input.sessionId,
        from: readback.value.readback.session.state,
        to: response.state,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      });
      if (transitionFailure) return persistResult(transitionFailure);
      await repository.sessions.updateState({
        opaqueSessionId: input.sessionId,
        state: response.state,
        updatedAt: now().toISOString(),
        editorUrlExpiresAt: null,
        lastErrorCode: response.failureReason ?? null,
        lastErrorMessage: response.failureReason ? response.diagnostics.join("; ") : null,
      });
      const activeLease = await repository.leases.readActiveLease(input.sessionId);
      if (activeLease) {
        await repository.leases.releaseLease({
          id: activeLease.id,
          state: "released",
          releasedAt: now().toISOString(),
        });
      }
      return persistResult(succeed({
        context: input.context,
        sessionId: input.sessionId,
        value: response,
        diagnostics: response.diagnostics,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        eventType: "stop_requested",
      }));
    },

    prepareConfirmedDraftApplyBridge(input: ConfirmedDraftApplyBridgeInput): AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderDraftApplyReadbackRecord> {
      const preflightFailure = preflight(input);
      if (preflightFailure) return preflightFailure;
      if (!input.confirmed) {
        return fail({
          ...input,
          failureReason: "explicit_confirmation_required",
          diagnostics: ["airship_online_builder_draft_apply_confirmation_required"],
          status: 409,
        });
      }
      return fail({
        ...input,
        failureReason: "not_implemented",
        diagnostics: ["adapter_08_confirmed_safe_draft_apply_bridge_placeholder_only", "no_draft_mutation_performed"],
        status: 501,
      });
    },

    prepareConfirmedPreviewGenerationBridge(input: ConfirmedPreviewGenerationBridgeInput): AirshipOnlineBuilderControlPlaneResult<AirshipOnlineBuilderGeneratedPreviewReadbackRecord> {
      const preflightFailure = preflight(input);
      if (preflightFailure) return preflightFailure;
      if (!input.confirmed) {
        return fail({
          ...input,
          failureReason: "explicit_confirmation_required",
          diagnostics: ["airship_online_builder_preview_generation_confirmation_required"],
          status: 409,
        });
      }
      return fail({
        ...input,
        failureReason: "not_implemented",
        diagnostics: ["adapter_12_internal_preview_generation_bridge_placeholder_only", "no_preview_or_artifact_mutation_performed"],
        status: 501,
      });
    },
  };
}
