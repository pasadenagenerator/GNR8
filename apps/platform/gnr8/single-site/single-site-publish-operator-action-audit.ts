import "server-only";

import { createHash } from "node:crypto";

import { getSuperadminPool } from "../../src/superadmin/db";
import {
  displaySingleSitePublishOperatorDryRunRef,
  type SingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunSafeResult,
} from "./single-site-publish-operator-dry-run-caller";
import type { SingleSiteShadowPublishOperatorRequest, SingleSiteShadowPublishOperatorSafeResult } from "./single-site-shadow-publish-operator-caller";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

export const SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_VERSION =
  "mvp-57-single-site-publish-operator-action-audit:v1" as const;

export const SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_TABLES = [
  "gnr8_single_site_publish_operator_actions",
  "gnr8_single_site_publish_operator_action_refs",
  "gnr8_single_site_publish_operator_action_events",
] as const;

export const SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_STATUSES = [
  "requested",
  "preflight_failed",
  "dry_run_completed",
  "shadow_publish_started",
  "shadow_publish_completed",
  "shadow_publish_failed",
  "cancelled",
  "superseded",
] as const;

export const SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_REF_ROLES = [
  "candidate_site_version",
  "runtime_artifact",
  "publish_target",
  "launch_readiness_evidence",
  "publish_activation_request",
  "publish_activation_decision",
  "gate_attempt",
  "handoff_watermark",
  "gate_input_watermark",
  "wrapper_result",
  "publish_result",
  "guard_diagnostic",
  "limitation",
  "blocker",
  "operator_confirmation",
] as const;

export const SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_EVENT_ACTIONS = [
  "action_requested",
  "preflight_failed",
  "dry_run_started",
  "dry_run_completed",
  "shadow_publish_started",
  "shadow_publish_completed",
  "shadow_publish_failed",
  "diagnostics_recorded",
  "redaction_applied",
] as const;

export type SingleSitePublishOperatorActionAuditStatus = (typeof SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_STATUSES)[number];
export type SingleSitePublishOperatorActionAuditRefRole = (typeof SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_REF_ROLES)[number];
export type SingleSitePublishOperatorActionAuditEventAction = (typeof SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_EVENT_ACTIONS)[number];
export type SingleSitePublishOperatorActionAuditMode = "dry_run" | "shadow_publish";

export type SingleSitePublishOperatorActionAuditActor = {
  actorType: "human";
  actorId: string;
  actorRole: "platform_superadmin";
};

export type SingleSitePublishOperatorActionAuditInput = {
  mode: SingleSitePublishOperatorActionAuditMode;
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  routeActionSource: string;
  actor: SingleSitePublishOperatorActionAuditActor;
  confirmationMarker: string;
  candidateSiteVersionRef: string;
  runtimeArtifactRef: string;
  publishTargetRef: string;
  publishStage: string;
  publishEnvironment: string;
  launchReadinessEvidenceRef: string;
  publishActivationRequestRef: string;
  publishActivationDecisionRef: string;
  gateAttemptResultRef: string;
  handoffWatermark: string;
  gateInputWatermark: string;
  idempotencyKey: string;
  correlationId: string;
  privacyLabel?: string | null;
  retentionClass?: string | null;
};

export type SingleSitePublishOperatorActionAuditRefInput = {
  actionId: string;
  refRole: SingleSitePublishOperatorActionAuditRefRole;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceType: string;
  sourceRecordId: string;
  sourceRef: string;
  sourceWatermark?: string | null;
  metadataJson?: Record<string, unknown>;
  correlationId: string;
  idempotencyKey: string;
};

export type SingleSitePublishOperatorActionAuditEventInput = {
  actionId: string;
  eventAction: SingleSitePublishOperatorActionAuditEventAction;
  status: SingleSitePublishOperatorActionAuditStatus;
  actor: SingleSitePublishOperatorActionAuditActor;
  resultSummaryJson?: Record<string, unknown>;
  redactedDiagnosticsJson?: Record<string, unknown>;
  errorSummaryJson?: Record<string, unknown>;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  privacyLabel?: string | null;
  retentionClass?: string | null;
};

export type SingleSitePublishOperatorActionAuditRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  site_id: string;
  migration_id: string;
  mode: SingleSitePublishOperatorActionAuditMode;
  route_action_source: string;
  actor_id: string;
  actor_type: string;
  actor_role: string;
  confirmation_marker: string;
  candidate_site_version_ref: string;
  runtime_artifact_ref: string;
  publish_target_ref: string;
  publish_stage: string;
  publish_environment: string;
  launch_readiness_evidence_ref: string;
  publish_activation_request_ref: string;
  publish_activation_decision_ref: string;
  gate_attempt_result_ref: string;
  handoff_watermark: string;
  gate_input_watermark: string;
  idempotency_key: string;
  correlation_id: string;
  semantic_fingerprint: string;
  status: SingleSitePublishOperatorActionAuditStatus;
  result_summary_json: unknown;
  redacted_diagnostics_json: unknown;
  limitation_summary_json: unknown;
  error_summary_json: unknown;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  privacy_label: string;
  retention_class: string;
};

export type SingleSitePublishOperatorActionAuditOperation = {
  action: SingleSitePublishOperatorActionAuditRow;
  reusedExisting: boolean;
  eventActions: SingleSitePublishOperatorActionAuditEventAction[];
  refRoles: SingleSitePublishOperatorActionAuditRefRole[];
};

export type SingleSitePublishOperatorActionAuditQueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number | null;
};

export type SingleSitePublishOperatorActionAuditPgClient = {
  query(sql: string, values?: readonly unknown[]): Promise<SingleSitePublishOperatorActionAuditQueryResult>;
};

export type SingleSitePublishOperatorActionAuditTx = SingleSitePublishOperatorActionAuditPgClient & {
  release?: () => void;
};

export type SingleSitePublishOperatorActionAuditPool = {
  connect(): Promise<SingleSitePublishOperatorActionAuditTx>;
};

export type SingleSitePublishOperatorActionAuditRepositoryLike = {
  withTransaction<T>(fn: (tx: SingleSitePublishOperatorActionAuditPgClient) => Promise<T>): Promise<T>;
  getActionByIdempotencyKey(tx: SingleSitePublishOperatorActionAuditPgClient, idempotencyKey: string): Promise<SingleSitePublishOperatorActionAuditRow | null>;
  getActionById(tx: SingleSitePublishOperatorActionAuditPgClient, actionId: string): Promise<SingleSitePublishOperatorActionAuditRow | null>;
  insertAction(tx: SingleSitePublishOperatorActionAuditPgClient, row: InsertActionRow): Promise<SingleSitePublishOperatorActionAuditRow>;
  updateActionStatus(tx: SingleSitePublishOperatorActionAuditPgClient, input: UpdateActionStatusInput): Promise<SingleSitePublishOperatorActionAuditRow>;
  insertRefIfNeeded(tx: SingleSitePublishOperatorActionAuditPgClient, input: SingleSitePublishOperatorActionAuditRefInput): Promise<{ reusedExisting: boolean }>;
  insertEventIfNeeded(tx: SingleSitePublishOperatorActionAuditPgClient, input: SingleSitePublishOperatorActionAuditEventInput): Promise<{ reusedExisting: boolean }>;
};

type InsertActionRow = {
  tenant_id: string;
  client_id: string;
  site_id: string;
  migration_id: string;
  mode: SingleSitePublishOperatorActionAuditMode;
  route_action_source: string;
  actor_id: string;
  actor_type: string;
  actor_role: string;
  confirmation_marker: string;
  candidate_site_version_ref: string;
  runtime_artifact_ref: string;
  publish_target_ref: string;
  publish_stage: string;
  publish_environment: string;
  launch_readiness_evidence_ref: string;
  publish_activation_request_ref: string;
  publish_activation_decision_ref: string;
  gate_attempt_result_ref: string;
  handoff_watermark: string;
  gate_input_watermark: string;
  idempotency_key: string;
  correlation_id: string;
  semantic_fingerprint: string;
  status: SingleSitePublishOperatorActionAuditStatus;
  result_summary_json: Record<string, unknown>;
  redacted_diagnostics_json: Record<string, unknown>;
  limitation_summary_json: Record<string, unknown>;
  error_summary_json: Record<string, unknown>;
  privacy_label: string;
  retention_class: string;
};

type UpdateActionStatusInput = {
  actionId: string;
  status: SingleSitePublishOperatorActionAuditStatus;
  resultSummaryJson?: Record<string, unknown>;
  redactedDiagnosticsJson?: Record<string, unknown>;
  limitationSummaryJson?: Record<string, unknown>;
  errorSummaryJson?: Record<string, unknown>;
  completed: boolean;
};

const UNKNOWN_REF = "unknown";
const DEFAULT_PRIVACY_LABEL = "internal_operational";
const DEFAULT_RETENTION_CLASS = "compliance_long";
const UNSAFE_DIAGNOSTIC_KEY = /secret|token|password|credential|stripe|payment|billing|sql|stack|provider|raw|payload|html|resolverresult|publishorchestratorinput|publishorchestratorresult/i;
const UNSAFE_DIAGNOSTIC_VALUE = /secret|token|password|credential|stripe|payment|billing|sql|stack trace|provider secret|DATABASE_URL|OPENAI_API_KEY/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new SingleSitePublishOperatorActionAuditError(`missing required audit field: ${field}`);
  return normalized;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        const entry = (value as Record<string, unknown>)[key];
        if (entry !== undefined && typeof entry !== "function") acc[key] = stableValue(entry);
        return acc;
      }, {});
  }
  return value ?? null;
}

function semanticValue(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(stableValue(JSON.parse(value)));
    } catch {
      return JSON.stringify(stableValue(value));
    }
  }
  return JSON.stringify(stableValue(value));
}

function toPg(value: unknown): unknown {
  if (value === undefined) return null;
  if (value && typeof value === "object" && !(value instanceof Date)) return JSON.stringify(stableValue(value));
  return value;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function safeText(value: unknown, fallback = UNKNOWN_REF): string {
  const normalized = text(value);
  if (!normalized) return fallback;
  if (UNSAFE_DIAGNOSTIC_VALUE.test(normalized)) return "redacted";
  return normalized.slice(0, 512);
}

function sourceId(ref: unknown): string {
  const normalized = safeText(ref);
  const parts = normalized.split(":");
  return safeText(parts.at(-1), normalized);
}

function uniqueSorted(values: readonly unknown[]): string[] {
  return Array.from(new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function safeCode(value: unknown, fallback: string): string {
  const normalized = text(value);
  if (!normalized || normalized.length > 160) return fallback;
  if (UNSAFE_DIAGNOSTIC_VALUE.test(normalized)) return fallback;
  return /^[a-zA-Z0-9_.:-]+$/.test(normalized) ? normalized : fallback;
}

function safeCodeList(values: unknown, fallback: string): string[] {
  if (!Array.isArray(values)) return [];
  return uniqueSorted(values.map((value) => safeCode(value, fallback)));
}

function safeRecordJson(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

function jsonObject(value: unknown): Record<string, unknown> {
  return safeRecordJson(value);
}

function semanticFingerprint(input: SingleSitePublishOperatorActionAuditInput): string {
  return `single-site-publish-operator-action:${digest({
    mode: input.mode,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    routeActionSource: input.routeActionSource,
    actor: input.actor,
    confirmationMarker: input.confirmationMarker,
    candidateSiteVersionRef: input.candidateSiteVersionRef,
    runtimeArtifactRef: input.runtimeArtifactRef,
    publishTargetRef: input.publishTargetRef,
    publishStage: input.publishStage,
    publishEnvironment: input.publishEnvironment,
    launchReadinessEvidenceRef: input.launchReadinessEvidenceRef,
    publishActivationRequestRef: input.publishActivationRequestRef,
    publishActivationDecisionRef: input.publishActivationDecisionRef,
    gateAttemptResultRef: input.gateAttemptResultRef,
    handoffWatermark: input.handoffWatermark,
    gateInputWatermark: input.gateInputWatermark,
    correlationId: input.correlationId,
  })}`;
}

function actionRow(input: SingleSitePublishOperatorActionAuditInput): InsertActionRow {
  return {
    tenant_id: requiredText("tenantId", input.tenantId),
    client_id: requiredText("clientId", input.clientId),
    site_id: requiredText("siteId", input.siteId),
    migration_id: requiredText("migrationId", input.migrationId),
    mode: input.mode,
    route_action_source: requiredText("routeActionSource", input.routeActionSource),
    actor_id: requiredText("actor.actorId", input.actor.actorId),
    actor_type: requiredText("actor.actorType", input.actor.actorType),
    actor_role: requiredText("actor.actorRole", input.actor.actorRole),
    confirmation_marker: requiredText("confirmationMarker", input.confirmationMarker),
    candidate_site_version_ref: requiredText("candidateSiteVersionRef", input.candidateSiteVersionRef),
    runtime_artifact_ref: requiredText("runtimeArtifactRef", input.runtimeArtifactRef),
    publish_target_ref: requiredText("publishTargetRef", input.publishTargetRef),
    publish_stage: requiredText("publishStage", input.publishStage),
    publish_environment: requiredText("publishEnvironment", input.publishEnvironment),
    launch_readiness_evidence_ref: requiredText("launchReadinessEvidenceRef", input.launchReadinessEvidenceRef),
    publish_activation_request_ref: requiredText("publishActivationRequestRef", input.publishActivationRequestRef),
    publish_activation_decision_ref: requiredText("publishActivationDecisionRef", input.publishActivationDecisionRef),
    gate_attempt_result_ref: requiredText("gateAttemptResultRef", input.gateAttemptResultRef),
    handoff_watermark: requiredText("handoffWatermark", input.handoffWatermark),
    gate_input_watermark: requiredText("gateInputWatermark", input.gateInputWatermark),
    idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
    correlation_id: requiredText("correlationId", input.correlationId),
    semantic_fingerprint: semanticFingerprint(input),
    status: "requested",
    result_summary_json: {},
    redacted_diagnostics_json: {},
    limitation_summary_json: {},
    error_summary_json: {},
    privacy_label: input.privacyLabel ?? DEFAULT_PRIVACY_LABEL,
    retention_class: input.retentionClass ?? DEFAULT_RETENTION_CLASS,
  };
}

function assertSemanticMatch(tableName: string, idempotencyKey: string, attempted: Record<string, unknown>, existing: Record<string, unknown>, fields: readonly string[]): void {
  const drifted = fields.filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError(tableName, idempotencyKey, drifted);
}

function confirmationMarker(value: unknown, mode: SingleSitePublishOperatorActionAuditMode): string {
  return `operator-confirmation:${mode}:${digest(redactAuditDiagnostics(value))}`;
}

function textFromBody(body: unknown, key: string): string | null {
  if (!isRecord(body)) return null;
  return text(body[key]);
}

function refTextFromBody(body: unknown, key: string): string | null {
  if (!isRecord(body)) return null;
  const value = body[key];
  if (typeof value === "string") return text(value);
  if (!isRecord(value)) return null;
  return text(value.sourceRef) ?? text(value.gateAttemptRef) ?? text(value.sourceRecordId) ?? text(value.gateAttemptId);
}

function safeRequestIdempotency(input: {
  mode: SingleSitePublishOperatorActionAuditMode;
  routeActionSource: string;
  actor: SingleSitePublishOperatorActionAuditActor;
  body: unknown;
  diagnostics?: readonly string[];
}): string {
  return textFromBody(input.body, "idempotencyKey") ??
    `audit-preflight:${input.mode}:${digest({
      routeActionSource: input.routeActionSource,
      actorId: input.actor.actorId,
      diagnostics: input.diagnostics ?? [],
      fields: safeBodyFields(input.body),
    })}`;
}

function safeRequestCorrelation(input: {
  mode: SingleSitePublishOperatorActionAuditMode;
  routeActionSource: string;
  actor: SingleSitePublishOperatorActionAuditActor;
  body: unknown;
  diagnostics?: readonly string[];
}): string {
  return textFromBody(input.body, "correlationId") ??
    `audit-preflight-correlation:${input.mode}:${digest({
      routeActionSource: input.routeActionSource,
      actorId: input.actor.actorId,
      diagnostics: input.diagnostics ?? [],
      fields: safeBodyFields(input.body),
    })}`;
}

function safeBodyFields(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) return {};
  const keys = [
    "mode",
    "tenantId",
    "clientId",
    "siteId",
    "migrationId",
    "candidateSiteVersionRef",
    "runtimeArtifactRef",
    "expectedPublishTargetRef",
    "publishStage",
    "publishEnvironment",
    "expectedLaunchReadinessEvidenceRef",
    "expectedPublishActivationRequestRef",
    "expectedPublishActivationDecisionRef",
    "expectedGateAttemptResultRef",
    "expectedHandoffWatermark",
    "expectedGateInputWatermark",
  ];
  return Object.fromEntries(keys.map((key) => [key, safeText(body[key])]));
}

export function buildSingleSitePublishOperatorActionAuditInputFromDryRunRequest(input: {
  request: SingleSitePublishOperatorDryRunRequest;
  actor: SingleSitePublishOperatorActionAuditActor;
  routeActionSource?: string;
}): SingleSitePublishOperatorActionAuditInput {
  return {
    mode: "dry_run",
    tenantId: input.request.tenantId,
    clientId: input.request.clientId,
    siteId: input.request.siteId,
    migrationId: input.request.migrationId,
    routeActionSource: input.routeActionSource ?? "api/gnr8/admin/single-site-publish/dry-run",
    actor: input.actor,
    confirmationMarker: confirmationMarker(input.request.operatorConfirmation, "dry_run"),
    candidateSiteVersionRef: displaySingleSitePublishOperatorDryRunRef(input.request.candidateSiteVersionRef),
    runtimeArtifactRef: displaySingleSitePublishOperatorDryRunRef(input.request.runtimeArtifactRef),
    publishTargetRef: displaySingleSitePublishOperatorDryRunRef(input.request.expectedPublishTargetRef),
    publishStage: input.request.publishStage,
    publishEnvironment: input.request.publishEnvironment,
    launchReadinessEvidenceRef: displaySingleSitePublishOperatorDryRunRef(input.request.expectedLaunchReadinessEvidenceRef),
    publishActivationRequestRef: input.request.expectedPublishActivationRequestRef,
    publishActivationDecisionRef: input.request.expectedPublishActivationDecisionRef,
    gateAttemptResultRef: input.request.expectedGateAttemptResultDisplayRef ?? input.request.expectedGateAttemptResultRef,
    handoffWatermark: input.request.expectedHandoffWatermark,
    gateInputWatermark: input.request.expectedGateInputWatermark,
    idempotencyKey: input.request.idempotencyKey,
    correlationId: input.request.correlationId,
  };
}

export function buildSingleSitePublishOperatorActionAuditInputFromShadowPublishRequest(input: {
  request: SingleSiteShadowPublishOperatorRequest;
  actor: SingleSitePublishOperatorActionAuditActor;
  routeActionSource?: string;
}): SingleSitePublishOperatorActionAuditInput {
  return {
    mode: "shadow_publish",
    tenantId: input.request.tenantId,
    clientId: input.request.clientId,
    siteId: input.request.siteId,
    migrationId: input.request.migrationId,
    routeActionSource: input.routeActionSource ?? "api/gnr8/admin/single-site-publish/shadow-publish",
    actor: input.actor,
    confirmationMarker: confirmationMarker(input.request.operatorConfirmation, "shadow_publish"),
    candidateSiteVersionRef: input.request.candidateSiteVersionRef,
    runtimeArtifactRef: input.request.runtimeArtifactRef,
    publishTargetRef: input.request.expectedPublishTargetRef,
    publishStage: input.request.publishStage,
    publishEnvironment: input.request.publishEnvironment,
    launchReadinessEvidenceRef: input.request.expectedLaunchReadinessEvidenceRef,
    publishActivationRequestRef: input.request.expectedPublishActivationRequestRef,
    publishActivationDecisionRef: input.request.expectedPublishActivationDecisionRef,
    gateAttemptResultRef: input.request.expectedGateAttemptResultRef,
    handoffWatermark: input.request.expectedHandoffWatermark,
    gateInputWatermark: input.request.expectedGateInputWatermark,
    idempotencyKey: input.request.idempotencyKey,
    correlationId: input.request.correlationId,
  };
}

export function buildSingleSitePublishOperatorActionAuditInputFromPreflightFailure(input: {
  mode: SingleSitePublishOperatorActionAuditMode;
  body: unknown;
  actor: SingleSitePublishOperatorActionAuditActor;
  routeActionSource?: string;
  diagnostics?: readonly string[];
}): SingleSitePublishOperatorActionAuditInput {
  const routeActionSource = input.routeActionSource ??
    (input.mode === "dry_run" ? "api/gnr8/admin/single-site-publish/dry-run" : "api/gnr8/admin/single-site-publish/shadow-publish");
  const idempotencyKey = safeRequestIdempotency({ ...input, routeActionSource });
  const correlationId = safeRequestCorrelation({ ...input, routeActionSource });
  return {
    mode: input.mode,
    tenantId: textFromBody(input.body, "tenantId") ?? UNKNOWN_REF,
    clientId: textFromBody(input.body, "clientId") ?? UNKNOWN_REF,
    siteId: textFromBody(input.body, "siteId") ?? UNKNOWN_REF,
    migrationId: textFromBody(input.body, "migrationId") ?? UNKNOWN_REF,
    routeActionSource,
    actor: input.actor,
    confirmationMarker: confirmationMarker(isRecord(input.body) ? input.body.operatorConfirmation : null, input.mode),
    candidateSiteVersionRef: refTextFromBody(input.body, "candidateSiteVersionRef") ?? UNKNOWN_REF,
    runtimeArtifactRef: refTextFromBody(input.body, "runtimeArtifactRef") ?? UNKNOWN_REF,
    publishTargetRef: refTextFromBody(input.body, "expectedPublishTargetRef") ?? UNKNOWN_REF,
    publishStage: textFromBody(input.body, "publishStage") ?? UNKNOWN_REF,
    publishEnvironment: textFromBody(input.body, "publishEnvironment") ?? UNKNOWN_REF,
    launchReadinessEvidenceRef: refTextFromBody(input.body, "expectedLaunchReadinessEvidenceRef") ?? UNKNOWN_REF,
    publishActivationRequestRef: textFromBody(input.body, "expectedPublishActivationRequestRef") ?? UNKNOWN_REF,
    publishActivationDecisionRef: textFromBody(input.body, "expectedPublishActivationDecisionRef") ?? UNKNOWN_REF,
    gateAttemptResultRef: refTextFromBody(input.body, "expectedGateAttemptResultRef") ?? UNKNOWN_REF,
    handoffWatermark: textFromBody(input.body, "expectedHandoffWatermark") ?? UNKNOWN_REF,
    gateInputWatermark: textFromBody(input.body, "expectedGateInputWatermark") ?? UNKNOWN_REF,
    idempotencyKey,
    correlationId,
  };
}

function defaultRefs(input: SingleSitePublishOperatorActionAuditInput, actionId: string): SingleSitePublishOperatorActionAuditRefInput[] {
  const base = {
    actionId,
    correlationId: input.correlationId,
  };
  return [
    ref(base, input, "candidate_site_version", "gnr8_runtime_site_versions", "runtime_site_version", input.candidateSiteVersionRef, input.candidateSiteVersionRef),
    ref(base, input, "runtime_artifact", "gnr8_runtime_artifacts", "runtime_artifact", input.runtimeArtifactRef, input.runtimeArtifactRef),
    ref(base, input, "publish_target", "gnr8_publish_targets", "publish_target", input.publishTargetRef, input.publishTargetRef),
    ref(base, input, "launch_readiness_evidence", "gnr8_single_site_launch_readiness_records", "launch_readiness_evidence", input.launchReadinessEvidenceRef, input.launchReadinessEvidenceRef),
    ref(base, input, "publish_activation_request", "gnr8_aaf_approval_requests", "aaf_approval_request", input.publishActivationRequestRef, input.publishActivationRequestRef),
    ref(base, input, "publish_activation_decision", "gnr8_aaf_approval_decisions", "aaf_approval_decision", input.publishActivationDecisionRef, input.publishActivationDecisionRef),
    ref(base, input, "gate_attempt", "gnr8_aaf_action_gate_attempts", "aaf_action_gate_attempt", input.gateAttemptResultRef, input.gateAttemptResultRef),
    ref(base, input, "handoff_watermark", null, "watermark", input.handoffWatermark, input.handoffWatermark),
    ref(base, input, "gate_input_watermark", null, "watermark", input.gateInputWatermark, input.gateInputWatermark),
    ref(base, input, "operator_confirmation", null, "operator_confirmation", input.confirmationMarker, input.confirmationMarker),
  ];
}

function ref(
  base: { actionId: string; correlationId: string },
  input: Pick<SingleSitePublishOperatorActionAuditInput, "idempotencyKey">,
  refRole: SingleSitePublishOperatorActionAuditRefRole,
  sourceTable: string | null,
  sourceType: string,
  sourceRecordIdValue: string,
  sourceRef: string,
  metadataJson: Record<string, unknown> = {},
): SingleSitePublishOperatorActionAuditRefInput {
  return {
    ...base,
    refRole,
    sourceSystem: "gnr8",
    sourceTable,
    sourceType,
    sourceRecordId: sourceId(sourceRecordIdValue),
    sourceRef: safeText(sourceRef),
    metadataJson,
    idempotencyKey: `${input.idempotencyKey}:ref:${refRole}`,
  };
}

function resultRefs(input: {
  action: SingleSitePublishOperatorActionAuditRow;
  result: SingleSitePublishOperatorDryRunSafeResult | SingleSiteShadowPublishOperatorSafeResult;
}): SingleSitePublishOperatorActionAuditRefInput[] {
  const base = { actionId: input.action.id, correlationId: input.action.correlation_id };
  const refs: SingleSitePublishOperatorActionAuditRefInput[] = [];
  const wrapperStatus = "wrapperDryRunStatus" in input.result ? input.result.wrapperDryRunStatus : input.result.wrapperStatus;
  refs.push({
    ...base,
    refRole: "wrapper_result",
    sourceSystem: "gnr8",
    sourceType: "single_site_publish_wrapper_result",
    sourceRecordId: safeText(wrapperStatus),
    sourceRef: safeText(wrapperStatus),
    metadataJson: { wrapperVersion: input.result.wrapperVersion, mode: input.result.mode },
    idempotencyKey: `${input.action.idempotency_key}:ref:wrapper_result:${safeText(wrapperStatus)}`,
  });
  if ("publishOrchestratorStatus" in input.result) {
    refs.push({
      ...base,
      refRole: "publish_result",
      sourceSystem: "gnr8",
      sourceType: "single_site_publish_result_projection",
      sourceRecordId: safeText(input.result.publishOrchestratorStatus),
      sourceRef: safeText(input.result.routeStatus),
      metadataJson: { publishMayHaveExecuted: input.result.publishMayHaveExecuted },
      idempotencyKey: `${input.action.idempotency_key}:ref:publish_result:${safeText(input.result.routeStatus)}`,
    });
    const guardReason = input.result.shadowGuardDiagnostics?.guardReason;
    if (guardReason) {
      refs.push({
        ...base,
        refRole: "guard_diagnostic",
        sourceSystem: "gnr8",
        sourceType: "publish_activation_shadow_guard_diagnostic",
        sourceRecordId: safeCode(guardReason, "shadow_guard_reason_redacted"),
        sourceRef: safeCode(guardReason, "shadow_guard_reason_redacted"),
        metadataJson: { guardMode: input.result.shadowGuardDiagnostics?.guardMode ?? null },
        idempotencyKey: `${input.action.idempotency_key}:ref:guard_diagnostic:${safeCode(guardReason, "shadow_guard_reason_redacted")}`,
      });
    }
  }
  for (const code of input.result.limitationCodes) {
    refs.push({
      ...base,
      refRole: "limitation",
      sourceSystem: "gnr8",
      sourceType: "limitation_code",
      sourceRecordId: safeCode(code, "limitation_redacted"),
      sourceRef: safeCode(code, "limitation_redacted"),
      metadataJson: {},
      idempotencyKey: `${input.action.idempotency_key}:ref:limitation:${safeCode(code, "limitation_redacted")}`,
    });
  }
  for (const code of input.result.blockerCodes) {
    refs.push({
      ...base,
      refRole: "blocker",
      sourceSystem: "gnr8",
      sourceType: "blocker_code",
      sourceRecordId: safeCode(code, "blocker_redacted"),
      sourceRef: safeCode(code, "blocker_redacted"),
      metadataJson: {},
      idempotencyKey: `${input.action.idempotency_key}:ref:blocker:${safeCode(code, "blocker_redacted")}`,
    });
  }
  return refs;
}

export function redactAuditDiagnostics(value: unknown): Record<string, unknown> {
  const redact = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(redact).filter((item) => item !== undefined);
    if (isRecord(entry)) {
      return Object.fromEntries(
        Object.entries(entry)
          .filter(([key]) => !UNSAFE_DIAGNOSTIC_KEY.test(key))
          .map(([key, nested]) => [key, redact(nested)])
          .filter(([, nested]) => nested !== undefined),
      );
    }
    if (typeof entry === "string") {
      const normalized = entry.trim();
      if (!normalized) return undefined;
      if (UNSAFE_DIAGNOSTIC_VALUE.test(normalized)) return "redacted";
      if (normalized.length > 512) return normalized.slice(0, 512);
      return normalized;
    }
    if (typeof entry === "number" || typeof entry === "boolean" || entry === null) return entry;
    return undefined;
  };
  const redacted = redact(value);
  return isRecord(redacted) ? redacted : {};
}

function diagnosticsFromResult(result: SingleSitePublishOperatorDryRunSafeResult | SingleSiteShadowPublishOperatorSafeResult): Record<string, unknown> {
  const base = {
    mode: result.mode,
    resolverStatus: result.resolverStatus,
    metadataCompleteness: result.metadataCompleteness,
    blockerCodes: result.blockerCodes,
    warnings: result.warnings,
    limitationCodes: result.limitationCodes,
    safeRefs: result.safeRefs,
    redactions: result.redactions,
    flags: result.flags,
  };
  if (result.mode === "dry_run") {
    return redactAuditDiagnostics({
      ...base,
      preflightStatus: result.preflightStatus,
      wrapperStatus: result.wrapperDryRunStatus,
    });
  }
  return redactAuditDiagnostics({
    ...base,
    routeStatus: result.routeStatus,
    preflightStatus: result.preflightStatus,
    wrapperStatus: result.wrapperStatus,
    publishOrchestratorStatus: result.publishOrchestratorStatus,
    publishOrchestrator: result.publishOrchestrator,
    shadowGuardDiagnostics: result.shadowGuardDiagnostics,
    publishMayHaveExecuted: result.publishMayHaveExecuted,
  });
}

function resultSummaryFromResult(result: SingleSitePublishOperatorDryRunSafeResult | SingleSiteShadowPublishOperatorSafeResult): Record<string, unknown> {
  if (result.mode === "dry_run") {
    return {
      ok: result.ok,
      mode: result.mode,
      preflightStatus: result.preflightStatus,
      wrapperStatus: result.wrapperDryRunStatus,
      resolverStatus: result.resolverStatus,
      publishes: false,
      runtimeMutation: false,
      blockingEnforcementApplied: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
    };
  }
  return {
    ok: result.ok,
    mode: result.mode,
    routeStatus: result.routeStatus,
    preflightStatus: result.preflightStatus,
    wrapperStatus: result.wrapperStatus,
    publishOrchestratorStatus: result.publishOrchestratorStatus,
    publishMayHaveExecuted: result.publishMayHaveExecuted,
    blockingEnforcementApplied: false,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
  };
}

function limitationSummaryFromResult(result: SingleSitePublishOperatorDryRunSafeResult | SingleSiteShadowPublishOperatorSafeResult): Record<string, unknown> {
  return {
    limitationCodes: [...result.limitationCodes].sort(),
    warningCodes: [...result.warnings].sort(),
    blockerCodes: [...result.blockerCodes].sort(),
  };
}

function errorSummary(errorCode: string, diagnostics: readonly string[] = []): Record<string, unknown> {
  return {
    errorCode: safeCode(errorCode, "single_site_publish_operator_error_redacted"),
    diagnosticCodes: diagnostics.map((code) => safeCode(code, "single_site_publish_operator_diagnostic_redacted")).sort(),
  };
}

function semanticActionFields(): string[] {
  return [
    "tenant_id",
    "client_id",
    "site_id",
    "migration_id",
    "mode",
    "route_action_source",
    "actor_id",
    "actor_type",
    "actor_role",
    "confirmation_marker",
    "candidate_site_version_ref",
    "runtime_artifact_ref",
    "publish_target_ref",
    "publish_stage",
    "publish_environment",
    "launch_readiness_evidence_ref",
    "publish_activation_request_ref",
    "publish_activation_decision_ref",
    "gate_attempt_result_ref",
    "handoff_watermark",
    "gate_input_watermark",
    "correlation_id",
    "semantic_fingerprint",
    "privacy_label",
    "retention_class",
  ];
}

export class SingleSitePublishOperatorActionAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SingleSitePublishOperatorActionAuditError";
  }
}

export class SingleSitePublishOperatorActionAuditRepository implements SingleSitePublishOperatorActionAuditRepositoryLike {
  constructor(private readonly pool?: SingleSitePublishOperatorActionAuditPool) {}

  async withTransaction<T>(fn: (tx: SingleSitePublishOperatorActionAuditPgClient) => Promise<T>): Promise<T> {
    const client = await (this.pool ?? getSuperadminPool()).connect();
    try {
      await client.query("begin");
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release?.();
    }
  }

  async getActionByIdempotencyKey(
    tx: SingleSitePublishOperatorActionAuditPgClient,
    idempotencyKey: string,
  ): Promise<SingleSitePublishOperatorActionAuditRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_publish_operator_actions where idempotency_key = $1 limit 1", [requiredText("idempotencyKey", idempotencyKey)]);
    return (result.rows[0] as SingleSitePublishOperatorActionAuditRow | undefined) ?? null;
  }

  async getActionById(tx: SingleSitePublishOperatorActionAuditPgClient, actionId: string): Promise<SingleSitePublishOperatorActionAuditRow | null> {
    const result = await tx.query("select * from public.gnr8_single_site_publish_operator_actions where id = $1::uuid limit 1", [requiredText("actionId", actionId)]);
    return (result.rows[0] as SingleSitePublishOperatorActionAuditRow | undefined) ?? null;
  }

  async insertAction(tx: SingleSitePublishOperatorActionAuditPgClient, row: InsertActionRow): Promise<SingleSitePublishOperatorActionAuditRow> {
    const payload = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
    const columns = Object.keys(payload);
    const values = columns.map((column) => toPg(payload[column]));
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const result = await tx.query(
      `insert into public.gnr8_single_site_publish_operator_actions (${columns.join(", ")})
       values (${placeholders.join(", ")})
       returning *`,
      values,
    );
    return result.rows[0] as SingleSitePublishOperatorActionAuditRow;
  }

  async updateActionStatus(
    tx: SingleSitePublishOperatorActionAuditPgClient,
    input: UpdateActionStatusInput,
  ): Promise<SingleSitePublishOperatorActionAuditRow> {
    const result = await tx.query(
      `
      update public.gnr8_single_site_publish_operator_actions
      set status = $2,
          result_summary_json = coalesce($3::jsonb, result_summary_json),
          redacted_diagnostics_json = coalesce($4::jsonb, redacted_diagnostics_json),
          limitation_summary_json = coalesce($5::jsonb, limitation_summary_json),
          error_summary_json = coalesce($6::jsonb, error_summary_json),
          completed_at = case when $7::boolean then coalesce(completed_at, now()) else completed_at end,
          updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        requiredText("actionId", input.actionId),
        input.status,
        input.resultSummaryJson ? JSON.stringify(stableValue(input.resultSummaryJson)) : null,
        input.redactedDiagnosticsJson ? JSON.stringify(stableValue(input.redactedDiagnosticsJson)) : null,
        input.limitationSummaryJson ? JSON.stringify(stableValue(input.limitationSummaryJson)) : null,
        input.errorSummaryJson ? JSON.stringify(stableValue(input.errorSummaryJson)) : null,
        input.completed,
      ],
    );
    const row = result.rows[0] as SingleSitePublishOperatorActionAuditRow | undefined;
    if (!row) throw new SingleSitePublishOperatorActionAuditError(`audit action not found: ${input.actionId}`);
    return row;
  }

  async insertRefIfNeeded(
    tx: SingleSitePublishOperatorActionAuditPgClient,
    input: SingleSitePublishOperatorActionAuditRefInput,
  ): Promise<{ reusedExisting: boolean }> {
    const result = await tx.query(
      `
      insert into public.gnr8_single_site_publish_operator_action_refs (
        action_id, ref_role, source_system, source_table, source_type, source_record_id,
        source_ref, source_watermark, metadata_json, correlation_id, idempotency_key
      )
      values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
      on conflict (idempotency_key) do nothing
      returning id
      `,
      [
        requiredText("actionId", input.actionId),
        input.refRole,
        input.sourceSystem ?? "gnr8",
        input.sourceTable ?? null,
        requiredText("sourceType", input.sourceType),
        requiredText("sourceRecordId", input.sourceRecordId),
        requiredText("sourceRef", input.sourceRef),
        input.sourceWatermark ?? null,
        JSON.stringify(stableValue(input.metadataJson ?? {})),
        requiredText("correlationId", input.correlationId),
        requiredText("idempotencyKey", input.idempotencyKey),
      ],
    );
    return { reusedExisting: !result.rows[0] };
  }

  async insertEventIfNeeded(
    tx: SingleSitePublishOperatorActionAuditPgClient,
    input: SingleSitePublishOperatorActionAuditEventInput,
  ): Promise<{ reusedExisting: boolean }> {
    const eventIndex = await this.nextEventIndex(tx, input.actionId);
    const result = await tx.query(
      `
      insert into public.gnr8_single_site_publish_operator_action_events (
        action_id, event_index, event_action, status, actor_id, actor_type, actor_role,
        result_summary_json, redacted_diagnostics_json, error_summary_json, correlation_id,
        causation_id, idempotency_key, privacy_label, retention_class
      )
      values ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15)
      on conflict (idempotency_key) do nothing
      returning id
      `,
      [
        requiredText("actionId", input.actionId),
        eventIndex,
        input.eventAction,
        input.status,
        requiredText("actor.actorId", input.actor.actorId),
        requiredText("actor.actorType", input.actor.actorType),
        requiredText("actor.actorRole", input.actor.actorRole),
        JSON.stringify(stableValue(input.resultSummaryJson ?? {})),
        JSON.stringify(stableValue(input.redactedDiagnosticsJson ?? {})),
        JSON.stringify(stableValue(input.errorSummaryJson ?? {})),
        requiredText("correlationId", input.correlationId),
        input.causationId ?? null,
        requiredText("idempotencyKey", input.idempotencyKey),
        input.privacyLabel ?? DEFAULT_PRIVACY_LABEL,
        input.retentionClass ?? DEFAULT_RETENTION_CLASS,
      ],
    );
    return { reusedExisting: !result.rows[0] };
  }

  private async nextEventIndex(tx: SingleSitePublishOperatorActionAuditPgClient, actionId: string): Promise<number> {
    const result = await tx.query(
      "select coalesce(max(event_index), 0) + 1 as event_index from public.gnr8_single_site_publish_operator_action_events where action_id = $1::uuid",
      [requiredText("actionId", actionId)],
    );
    return Number(result.rows[0]?.event_index ?? 1);
  }
}

export class SingleSitePublishOperatorActionAuditService {
  constructor(private readonly repository: SingleSitePublishOperatorActionAuditRepositoryLike = new SingleSitePublishOperatorActionAuditRepository()) {}

  async createOrReuseAction(input: SingleSitePublishOperatorActionAuditInput): Promise<SingleSitePublishOperatorActionAuditOperation> {
    return this.repository.withTransaction(async (tx) => {
      const attempted = actionRow(input);
      const existing = await this.repository.getActionByIdempotencyKey(tx, attempted.idempotency_key);
      const action = existing ?? await this.repository.insertAction(tx, attempted);
      let reusedExisting = Boolean(existing);
      if (existing) {
        assertSemanticMatch("gnr8_single_site_publish_operator_actions", attempted.idempotency_key, attempted, existing as unknown as Record<string, unknown>, semanticActionFields());
      }

      const refRoles: SingleSitePublishOperatorActionAuditRefRole[] = [];
      for (const refInput of defaultRefs(input, action.id)) {
        const result = await this.repository.insertRefIfNeeded(tx, refInput);
        reusedExisting ||= result.reusedExisting;
        refRoles.push(refInput.refRole);
      }

      const requestedEvent = await this.repository.insertEventIfNeeded(tx, {
        actionId: action.id,
        eventAction: "action_requested",
        status: action.status,
        actor: input.actor,
        resultSummaryJson: { mode: input.mode, auditVersion: SINGLE_SITE_PUBLISH_OPERATOR_ACTION_AUDIT_VERSION },
        redactedDiagnosticsJson: { safeRefsPersisted: true },
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:event:action_requested`,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      reusedExisting ||= requestedEvent.reusedExisting;
      return { action, reusedExisting, eventActions: ["action_requested"], refRoles };
    });
  }

  async recordRefs(input: { actionId: string; refs: readonly Omit<SingleSitePublishOperatorActionAuditRefInput, "actionId">[] }): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      for (const refInput of input.refs) {
        await this.repository.insertRefIfNeeded(tx, { ...refInput, actionId: input.actionId });
      }
    });
  }

  async markDryRunStarted(input: { actionId: string; actor: SingleSitePublishOperatorActionAuditActor; correlationId: string; idempotencyKey: string }): Promise<void> {
    await this.recordEvent({
      ...input,
      eventAction: "dry_run_started",
      status: "requested",
      resultSummaryJson: { mode: "dry_run", dryRun: true, publishes: false, runtimeMutation: false },
      redactedDiagnosticsJson: { dryRunStarted: true },
    });
  }

  async markPreflightFailed(input: {
    actionId: string;
    actor: SingleSitePublishOperatorActionAuditActor;
    correlationId: string;
    idempotencyKey: string;
    errorCode: string;
    diagnostics: readonly string[];
  }): Promise<SingleSitePublishOperatorActionAuditRow> {
    return this.transition({
      ...input,
      status: "preflight_failed",
      eventAction: "preflight_failed",
      resultSummaryJson: { ok: false, routeStatus: "denied_preflight" },
      redactedDiagnosticsJson: { diagnosticCodes: input.diagnostics.map((code) => safeCode(code, "single_site_publish_operator_diagnostic_redacted")).sort() },
      errorSummaryJson: errorSummary(input.errorCode, input.diagnostics),
      completed: true,
    });
  }

  async markDryRunCompleted(input: {
    actionId: string;
    actor: SingleSitePublishOperatorActionAuditActor;
    correlationId: string;
    idempotencyKey: string;
    result: SingleSitePublishOperatorDryRunSafeResult;
  }): Promise<SingleSitePublishOperatorActionAuditRow> {
    return this.transitionWithResult({
      ...input,
      status: "dry_run_completed",
      eventAction: "dry_run_completed",
      result: input.result,
      completed: true,
    });
  }

  async markShadowPublishStarted(input: { actionId: string; actor: SingleSitePublishOperatorActionAuditActor; correlationId: string; idempotencyKey: string }): Promise<SingleSitePublishOperatorActionAuditRow> {
    return this.transition({
      ...input,
      status: "shadow_publish_started",
      eventAction: "shadow_publish_started",
      resultSummaryJson: { ok: true, mode: "shadow_publish", shadowPublishStarted: true, blockingEnforcementApplied: false },
      redactedDiagnosticsJson: { publishMayExecuteThroughExistingWrapper: true },
      completed: false,
    });
  }

  async markShadowPublishCompleted(input: {
    actionId: string;
    actor: SingleSitePublishOperatorActionAuditActor;
    correlationId: string;
    idempotencyKey: string;
    result: SingleSiteShadowPublishOperatorSafeResult;
  }): Promise<SingleSitePublishOperatorActionAuditRow> {
    return this.transitionWithResult({
      ...input,
      status: "shadow_publish_completed",
      eventAction: "shadow_publish_completed",
      result: input.result,
      completed: true,
    });
  }

  async markShadowPublishFailed(input: {
    actionId: string;
    actor: SingleSitePublishOperatorActionAuditActor;
    correlationId: string;
    idempotencyKey: string;
    result?: SingleSiteShadowPublishOperatorSafeResult;
    errorCode?: string;
    diagnostics?: readonly string[];
  }): Promise<SingleSitePublishOperatorActionAuditRow> {
    if (input.result) {
      return this.transitionWithResult({
        ...input,
        status: "shadow_publish_failed",
        eventAction: "shadow_publish_failed",
        result: input.result,
        completed: true,
      });
    }
    return this.transition({
      ...input,
      status: "shadow_publish_failed",
      eventAction: "shadow_publish_failed",
      resultSummaryJson: { ok: false, mode: "shadow_publish", publishMayHaveExecuted: true },
      redactedDiagnosticsJson: { diagnosticCodes: (input.diagnostics ?? []).map((code) => safeCode(code, "single_site_publish_operator_diagnostic_redacted")).sort() },
      errorSummaryJson: errorSummary(input.errorCode ?? "single_site_shadow_publish_operator_failed", input.diagnostics ?? []),
      completed: true,
    });
  }

  private async transitionWithResult(input: {
    actionId: string;
    actor: SingleSitePublishOperatorActionAuditActor;
    correlationId: string;
    idempotencyKey: string;
    status: SingleSitePublishOperatorActionAuditStatus;
    eventAction: SingleSitePublishOperatorActionAuditEventAction;
    result: SingleSitePublishOperatorDryRunSafeResult | SingleSiteShadowPublishOperatorSafeResult;
    completed: boolean;
  }): Promise<SingleSitePublishOperatorActionAuditRow> {
    return this.repository.withTransaction(async (tx) => {
      const action = await this.repository.getActionById(tx, input.actionId);
      if (!action) throw new SingleSitePublishOperatorActionAuditError(`audit action not found: ${input.actionId}`);
      for (const refInput of resultRefs({ action, result: input.result })) {
        await this.repository.insertRefIfNeeded(tx, refInput);
      }
      const resultSummaryJson = resultSummaryFromResult(input.result);
      const redactedDiagnosticsJson = diagnosticsFromResult(input.result);
      const limitationSummaryJson = limitationSummaryFromResult(input.result);
      const updated = await this.repository.updateActionStatus(tx, {
        actionId: input.actionId,
        status: input.status,
        resultSummaryJson,
        redactedDiagnosticsJson,
        limitationSummaryJson,
        errorSummaryJson: input.result.ok ? {} : { blockerCodes: input.result.blockerCodes },
        completed: input.completed,
      });
      await this.repository.insertEventIfNeeded(tx, {
        actionId: input.actionId,
        eventAction: input.eventAction,
        status: input.status,
        actor: input.actor,
        resultSummaryJson,
        redactedDiagnosticsJson,
        errorSummaryJson: input.result.ok ? {} : { blockerCodes: input.result.blockerCodes },
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:event:${input.eventAction}`,
      });
      await this.repository.insertEventIfNeeded(tx, {
        actionId: input.actionId,
        eventAction: "diagnostics_recorded",
        status: input.status,
        actor: input.actor,
        resultSummaryJson: {},
        redactedDiagnosticsJson,
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:event:diagnostics_recorded:${input.eventAction}`,
      });
      await this.repository.insertEventIfNeeded(tx, {
        actionId: input.actionId,
        eventAction: "redaction_applied",
        status: input.status,
        actor: input.actor,
        resultSummaryJson: { redactions: input.result.redactions },
        redactedDiagnosticsJson: { redacted: true },
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:event:redaction_applied:${input.eventAction}`,
      });
      return updated;
    });
  }

  private async transition(input: {
    actionId: string;
    actor: SingleSitePublishOperatorActionAuditActor;
    correlationId: string;
    idempotencyKey: string;
    status: SingleSitePublishOperatorActionAuditStatus;
    eventAction: SingleSitePublishOperatorActionAuditEventAction;
    resultSummaryJson?: Record<string, unknown>;
    redactedDiagnosticsJson?: Record<string, unknown>;
    limitationSummaryJson?: Record<string, unknown>;
    errorSummaryJson?: Record<string, unknown>;
    completed: boolean;
  }): Promise<SingleSitePublishOperatorActionAuditRow> {
    return this.repository.withTransaction(async (tx) => {
      const updated = await this.repository.updateActionStatus(tx, {
        actionId: input.actionId,
        status: input.status,
        resultSummaryJson: input.resultSummaryJson,
        redactedDiagnosticsJson: redactAuditDiagnostics(input.redactedDiagnosticsJson ?? {}),
        limitationSummaryJson: input.limitationSummaryJson ?? {},
        errorSummaryJson: input.errorSummaryJson ?? {},
        completed: input.completed,
      });
      await this.repository.insertEventIfNeeded(tx, {
        actionId: input.actionId,
        eventAction: input.eventAction,
        status: input.status,
        actor: input.actor,
        resultSummaryJson: input.resultSummaryJson ?? {},
        redactedDiagnosticsJson: redactAuditDiagnostics(input.redactedDiagnosticsJson ?? {}),
        errorSummaryJson: input.errorSummaryJson ?? {},
        correlationId: input.correlationId,
        idempotencyKey: `${input.idempotencyKey}:event:${input.eventAction}`,
      });
      if (Object.keys(input.redactedDiagnosticsJson ?? {}).length > 0) {
        await this.repository.insertEventIfNeeded(tx, {
          actionId: input.actionId,
          eventAction: "redaction_applied",
          status: input.status,
          actor: input.actor,
          resultSummaryJson: {},
          redactedDiagnosticsJson: { redacted: true },
          errorSummaryJson: {},
          correlationId: input.correlationId,
          idempotencyKey: `${input.idempotencyKey}:event:redaction_applied:${input.eventAction}`,
        });
      }
      return updated;
    });
  }

  private async recordEvent(input: SingleSitePublishOperatorActionAuditEventInput): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      await this.repository.insertEventIfNeeded(tx, input);
    });
  }
}

export function createSingleSitePublishOperatorActionAuditService(
  repository?: SingleSitePublishOperatorActionAuditRepositoryLike,
): SingleSitePublishOperatorActionAuditService {
  return new SingleSitePublishOperatorActionAuditService(repository);
}
