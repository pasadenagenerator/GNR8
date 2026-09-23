export const AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION = "airship-adapter-18-online-builder-worker-contract:v1" as const;

export type AirshipOnlineBuilderSessionState =
  | "requested"
  | "provisioning"
  | "ready"
  | "editor_opened"
  | "capture_requested"
  | "captured"
  | "mapped"
  | "applied_to_draft"
  | "preview_generated"
  | "stopping"
  | "stopped"
  | "expired"
  | "failed";

export type AirshipOnlineBuilderSiteKey = "chs" | "aris";

export type AirshipOnlineBuilderAllowedEditScope =
  | "chs_text_safe_fields_v1"
  | "aris_text_safe_fields_v1"
  | "migration_text_safe_fields_v1";

export type AirshipOnlineBuilderDeploymentMode =
  | "long_running_worker_service"
  | "container_task_per_session"
  | "internal_vm_worker"
  | "local_desktop_companion"
  | "fake_test_worker";

export type AirshipOnlineBuilderAuditEventName =
  | "session_requested"
  | "status_read"
  | "lease_acquired"
  | "workspace_materialized"
  | "target_server_started"
  | "airship_sidecar_started"
  | "editor_url_minted"
  | "editor_opened"
  | "capture_requested"
  | "diff_captured"
  | "mapping_generated"
  | "mappings_applied_to_draft"
  | "preview_generated"
  | "stop_requested"
  | "cleanup_completed"
  | "session_expired"
  | "session_failed"
  | "request_blocked"
  | "worker_not_configured"
  | "worker_auth_success"
  | "worker_auth_failure"
  | "worker_heartbeat"
  | "lease_renewed"
  | "lease_released"
  | "lease_reclaimed"
  | "editor_gateway_token_minted"
  | "editor_gateway_token_verified"
  | "editor_gateway_token_blocked";

export type AirshipOnlineBuilderFailureReason =
  | "none"
  | "invalid_request"
  | "superadmin_required"
  | "origin_or_csrf_invalid"
  | "migration_not_allowlisted"
  | "session_id_invalid"
  | "session_not_found"
  | "session_owner_mismatch"
  | "session_expired"
  | "unsupported_lifecycle_transition"
  | "explicit_confirmation_required"
  | "worker_not_configured"
  | "worker_auth_not_configured"
  | "lease_manager_not_configured"
  | "editor_gateway_not_configured"
  | "worker_auth_failed"
  | "request_replay_rejected"
  | "request_expired"
  | "worker_unavailable"
  | "worker_capacity_exceeded"
  | "lease_unavailable"
  | "lease_not_found"
  | "editor_token_invalid"
  | "editor_token_expired"
  | "editor_token_wrong_owner"
  | "editor_token_wrong_session"
  | "source_bundle_invalid"
  | "draft_version_stale"
  | "capture_failed"
  | "cleanup_failed"
  | "not_implemented";

export type AirshipOnlineBuilderLifecycleTransition = {
  from: AirshipOnlineBuilderSessionState;
  to: AirshipOnlineBuilderSessionState;
};

export const AIRSHIP_ONLINE_BUILDER_ALLOWED_TRANSITIONS: readonly AirshipOnlineBuilderLifecycleTransition[] = [
  { from: "requested", to: "provisioning" },
  { from: "requested", to: "ready" },
  { from: "requested", to: "failed" },
  { from: "requested", to: "stopping" },
  { from: "provisioning", to: "ready" },
  { from: "provisioning", to: "failed" },
  { from: "provisioning", to: "stopping" },
  { from: "provisioning", to: "expired" },
  { from: "ready", to: "editor_opened" },
  { from: "ready", to: "capture_requested" },
  { from: "ready", to: "captured" },
  { from: "ready", to: "stopping" },
  { from: "ready", to: "stopped" },
  { from: "ready", to: "expired" },
  { from: "ready", to: "failed" },
  { from: "editor_opened", to: "capture_requested" },
  { from: "editor_opened", to: "captured" },
  { from: "editor_opened", to: "stopping" },
  { from: "editor_opened", to: "stopped" },
  { from: "editor_opened", to: "expired" },
  { from: "editor_opened", to: "failed" },
  { from: "capture_requested", to: "captured" },
  { from: "capture_requested", to: "stopping" },
  { from: "capture_requested", to: "stopped" },
  { from: "capture_requested", to: "expired" },
  { from: "capture_requested", to: "failed" },
  { from: "captured", to: "mapped" },
  { from: "captured", to: "stopping" },
  { from: "captured", to: "stopped" },
  { from: "captured", to: "expired" },
  { from: "captured", to: "failed" },
  { from: "mapped", to: "applied_to_draft" },
  { from: "mapped", to: "stopping" },
  { from: "mapped", to: "stopped" },
  { from: "mapped", to: "expired" },
  { from: "mapped", to: "failed" },
  { from: "applied_to_draft", to: "preview_generated" },
  { from: "applied_to_draft", to: "stopping" },
  { from: "applied_to_draft", to: "stopped" },
  { from: "applied_to_draft", to: "expired" },
  { from: "applied_to_draft", to: "failed" },
  { from: "preview_generated", to: "stopping" },
  { from: "preview_generated", to: "stopped" },
  { from: "preview_generated", to: "expired" },
  { from: "preview_generated", to: "failed" },
  { from: "stopping", to: "stopped" },
  { from: "stopping", to: "expired" },
  { from: "stopping", to: "failed" },
  { from: "expired", to: "stopping" },
  { from: "failed", to: "stopping" },
] as const;

export function canTransitionAirshipOnlineBuilderSession(
  from: AirshipOnlineBuilderSessionState,
  to: AirshipOnlineBuilderSessionState,
): boolean {
  if (from === to) return true;
  return AIRSHIP_ONLINE_BUILDER_ALLOWED_TRANSITIONS.some((transition) => transition.from === from && transition.to === to);
}

export type AirshipOnlineBuilderFileSnapshot = {
  path: string;
  sha256: string;
  bytes: number;
  contentsBase64?: string;
};

export type AirshipOnlineBuilderSourceBundle = {
  kind: "single-html-artifact" | "source-backed-workspace-archive";
  files: AirshipOnlineBuilderFileSnapshot[];
  rootSha256: string;
};

export type AirshipOnlineBuilderDraftRef = {
  id: string | null;
  version: number;
};

export type AirshipOnlineBuilderSecurityContext = {
  requestedByUserId: string;
  ownerOrganizationId: string;
  superadminOnly: true;
  allowedOrigins: string[];
  csrfValidatedByGnr8: boolean;
};

export type AirshipOnlineBuilderMutationBoundaries = {
  noPublishMutation: true;
  noLivePointerMutation: true;
  noDemoMutation: true;
  noDnsMutation: true;
  noProviderMutation: true;
  noBillingMutation: true;
  noEnvMutation: true;
  noSourceCaptureImport: true;
  noCustomerDomainMutation: true;
  noRollbackMutation: true;
  noDryRunMutation: true;
  noShadowPublishMutation: true;
  noPreviewHostBindingMutation: true;
};

export type AirshipOnlineBuilderWorkspaceSnapshotRecord = {
  id: string;
  sessionId: string;
  snapshotKind: "baseline" | "capture" | "cleanup";
  workspaceHash: string;
  sourceManifest: AirshipOnlineBuilderFileSnapshot[];
  allowedPaths: string[];
  createdAt: string;
};

export type AirshipOnlineBuilderSessionRecord = {
  id: string;
  opaqueSessionId: string;
  state: AirshipOnlineBuilderSessionState;
  migrationId: string;
  siteKey: AirshipOnlineBuilderSiteKey;
  allowedEditScope: AirshipOnlineBuilderAllowedEditScope;
  requestedByUserId: string;
  ownerOrganizationId: string;
  expectedDraft: AirshipOnlineBuilderDraftRef;
  editorUrlExpiresAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  lastErrorCode: AirshipOnlineBuilderFailureReason | null;
  lastErrorMessage: string | null;
};

export type AirshipOnlineBuilderWorkerLeaseRecord = {
  id: string;
  sessionId: string;
  workerId: string;
  leaseTokenHash: string;
  state: "active" | "released" | "expired" | "failed";
  heartbeatAt: string;
  expiresAt: string;
  acquiredAt: string;
  releasedAt: string | null;
};

export type AirshipOnlineBuilderCapturedFileDiff = {
  path: string;
  status: "added" | "modified" | "deleted";
  beforeSha256: string | null;
  afterSha256: string | null;
  beforeBytes: number | null;
  afterBytes: number | null;
  unifiedDiff: string | null;
};

export type AirshipOnlineBuilderCapturedDiffRecord = {
  id: string;
  sessionId: string;
  captureRequestId: string;
  baselineSnapshotId: string;
  captureSnapshotId: string;
  changedFileCount: number;
  indexHtmlChanged: boolean;
  changedFiles: AirshipOnlineBuilderCapturedFileDiff[];
  createdAt: string;
};

export type AirshipOnlineBuilderMappingReadbackRecord = {
  id: string;
  sessionId: string;
  capturedDiffId: string;
  status: "mapped" | "rejected";
  safeEntryCount: number;
  unsupportedEntryCount: number;
  mappingJson: unknown;
  mappedAgainstDraft: AirshipOnlineBuilderDraftRef;
  createdAt: string;
};

export type AirshipOnlineBuilderDraftApplyReadbackRecord = {
  id: string;
  sessionId: string;
  mappingReadbackId: string;
  status: "applied" | "rejected";
  appliedCount: number;
  skippedCount: number;
  draftBefore: AirshipOnlineBuilderDraftRef;
  draftAfter: AirshipOnlineBuilderDraftRef | null;
  readbackJson: unknown;
  createdAt: string;
};

export type AirshipOnlineBuilderGeneratedPreviewReadbackRecord = {
  id: string;
  sessionId: string;
  draftApplyReadbackId: string;
  status: "generated" | "failed";
  siteVersionId: string | null;
  artifactId: string | null;
  internalPreviewUrl: string | null;
  readbackJson: unknown;
  createdAt: string;
};

export type AirshipOnlineBuilderAuditEventRecord = {
  id: string;
  sessionId: string;
  actorUserId: string;
  eventType: AirshipOnlineBuilderAuditEventName;
  severity: "info" | "warning" | "error";
  correlationId: string;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AirshipOnlineBuilderReusePipelineReadback = {
  capturedDiffToMapper: "adapter_07_captured_diff_to_draft_mapper";
  exactSafeMappingsToDraftApply: "adapter_08_confirmed_safe_draft_apply";
  appliedDraftToInternalPreview: "adapter_12_internal_preview_generation_bridge";
  capturedDiffId: string | null;
  mappingReadbackId: string | null;
  draftApplyReadbackId: string | null;
  generatedPreviewReadbackId: string | null;
};

export type AirshipOnlineBuilderSessionReadback = {
  contractVersion: typeof AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION;
  session: AirshipOnlineBuilderSessionRecord;
  workerLease: Pick<AirshipOnlineBuilderWorkerLeaseRecord, "id" | "workerId" | "state" | "heartbeatAt" | "expiresAt"> | null;
  baselineSnapshot: AirshipOnlineBuilderWorkspaceSnapshotRecord | null;
  captureSnapshot: AirshipOnlineBuilderWorkspaceSnapshotRecord | null;
  editorUrlAvailable: boolean;
  editorUrlExpiresAt: string | null;
  health: {
    targetServer: "unknown" | "starting" | "healthy" | "unhealthy" | "stopped";
    airshipSidecar: "unknown" | "starting" | "healthy" | "unhealthy" | "stopped";
  };
  reusePipeline: AirshipOnlineBuilderReusePipelineReadback;
  nextRecommendedAction: string;
  warnings: string[];
  diagnostics: string[];
  boundaries: AirshipOnlineBuilderMutationBoundaries;
};

export type AirshipOnlineBuilderDisabledReason =
  | "remote_worker_not_configured"
  | "worker_auth_not_configured"
  | "lease_manager_not_configured"
  | "signed_editor_gateway_not_configured"
  | "remote_worker_lease_missing";

export type AirshipOnlineBuilderSecurityLifecycleReadback = {
  workerAuth: "configured" | "not_configured";
  leaseManager: "configured" | "not_configured";
  signedEditorGateway: "configured" | "not_configured";
  fakeTestMode: boolean;
};

export type AirshipOnlineBuilderDisabledReadback = {
  status: "not_configured";
  reason:
    | "remote_worker_not_configured"
    | "worker_auth_not_configured"
    | "lease_manager_not_configured"
    | "signed_editor_gateway_not_configured";
  explanation: string;
  disabledReasons: AirshipOnlineBuilderDisabledReason[];
  securityLifecycle: AirshipOnlineBuilderSecurityLifecycleReadback;
  session: AirshipOnlineBuilderSessionRecord | null;
  canLaunchWorker: false;
  localProofFlowAvailable: true;
  draftApplyRequiresConfirmation: true;
  previewGenerationRequiresConfirmation: true;
  liveSiteMutation: false;
  diagnostics: string[];
  boundaries: AirshipOnlineBuilderMutationBoundaries;
};

export type AirshipOnlineBuilderCreateSessionRequest = {
  sessionId: string;
  migrationId: string;
  siteKey: AirshipOnlineBuilderSiteKey;
  allowedEditScope: AirshipOnlineBuilderAllowedEditScope;
  sourceBundle: AirshipOnlineBuilderSourceBundle;
  expectedDraft: AirshipOnlineBuilderDraftRef;
  ttlSeconds: number;
  securityContext: AirshipOnlineBuilderSecurityContext;
  idempotencyKey: string;
};

export type AirshipOnlineBuilderCreateSessionResponse = {
  ok: boolean;
  sessionId: string;
  state: Extract<AirshipOnlineBuilderSessionState, "requested" | "provisioning" | "ready" | "failed">;
  workerId: string | null;
  leaseId: string | null;
  statusUrl: string;
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
  readback: AirshipOnlineBuilderSessionReadback | null;
};

export type AirshipOnlineBuilderGetSessionStatusRequest = {
  sessionId: string;
};

export type AirshipOnlineBuilderGetSessionStatusResponse = {
  ok: boolean;
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
  readback: AirshipOnlineBuilderSessionReadback;
};

export type AirshipOnlineBuilderEditorUrlRequest = {
  sessionId: string;
  requestedByUserId: string;
  origin: string;
  idempotencyKey: string;
};

export type AirshipOnlineBuilderEditorUrlResponse = {
  ok: boolean;
  sessionId: string;
  state: Extract<AirshipOnlineBuilderSessionState, "ready" | "editor_opened" | "expired" | "failed">;
  editorUrl: string | null;
  expiresAt: string | null;
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
};

export type AirshipOnlineBuilderCaptureDiffRequest = {
  sessionId: string;
  requestedByUserId: string;
  expectedDraft: AirshipOnlineBuilderDraftRef;
  idempotencyKey: string;
};

export type AirshipOnlineBuilderCaptureDiffResponse = {
  ok: boolean;
  sessionId: string;
  state: Extract<AirshipOnlineBuilderSessionState, "capture_requested" | "captured" | "expired" | "failed">;
  capturedDiff: AirshipOnlineBuilderCapturedDiffRecord | null;
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
  readback: AirshipOnlineBuilderSessionReadback;
};

export type AirshipOnlineBuilderStopSessionRequest = {
  sessionId: string;
  requestedByUserId: string;
  reason: "operator_requested" | "ttl_expired" | "failure_cleanup" | "worker_shutdown";
  idempotencyKey: string;
};

export type AirshipOnlineBuilderStopSessionResponse = {
  ok: boolean;
  sessionId: string;
  state: Extract<AirshipOnlineBuilderSessionState, "stopping" | "stopped" | "expired" | "failed">;
  cleanupAttempted: boolean;
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
};

export type AirshipOnlineBuilderCleanupExpiredSessionsRequest = {
  workerId: string;
  now: string;
  limit: number;
};

export type AirshipOnlineBuilderCleanupExpiredSessionsResponse = {
  ok: boolean;
  inspectedCount: number;
  stoppedCount: number;
  failedCleanupCount: number;
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
};

export type AirshipOnlineBuilderHealthCheckRequest = {
  includeCapacity: boolean;
};

export type AirshipOnlineBuilderHealthCheckResponse = {
  ok: boolean;
  workerId: string;
  contractVersion: typeof AIRSHIP_ONLINE_BUILDER_WORKER_CONTRACT_VERSION;
  deploymentMode: AirshipOnlineBuilderDeploymentMode;
  airshipCliVersion: string | null;
  capacity: {
    maxConcurrentSessions: number;
    activeSessionCount: number;
  };
  dependencies: {
    packageCache: "healthy" | "degraded" | "unknown";
    workspaceRoot: "healthy" | "degraded" | "unknown";
    processSupervisor: "healthy" | "degraded" | "unknown";
  };
  failureReason?: AirshipOnlineBuilderFailureReason;
  diagnostics: string[];
};

export interface AirshipOnlineBuilderWorkerClient {
  readonly testOnlyFakeWorkerClient?: true;
  createSession(input: AirshipOnlineBuilderCreateSessionRequest): Promise<AirshipOnlineBuilderCreateSessionResponse>;
  getSessionStatus(input: AirshipOnlineBuilderGetSessionStatusRequest): Promise<AirshipOnlineBuilderGetSessionStatusResponse>;
  getEditorUrl(input: AirshipOnlineBuilderEditorUrlRequest): Promise<AirshipOnlineBuilderEditorUrlResponse>;
  captureDiff(input: AirshipOnlineBuilderCaptureDiffRequest): Promise<AirshipOnlineBuilderCaptureDiffResponse>;
  stopSession(input: AirshipOnlineBuilderStopSessionRequest): Promise<AirshipOnlineBuilderStopSessionResponse>;
  cleanupExpiredSessions(input: AirshipOnlineBuilderCleanupExpiredSessionsRequest): Promise<AirshipOnlineBuilderCleanupExpiredSessionsResponse>;
  healthCheck(input: AirshipOnlineBuilderHealthCheckRequest): Promise<AirshipOnlineBuilderHealthCheckResponse>;
}
