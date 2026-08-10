import "server-only";

import { getSuperadminPool } from "../../src/superadmin/db";
import type {
  SingleSitePublishOperatorActionAuditMode,
  SingleSitePublishOperatorActionAuditRow,
  SingleSitePublishOperatorActionAuditStatus,
} from "./single-site-publish-operator-action-audit";

export const SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_VERSION =
  "mvp-58-single-site-publish-operator-readonly-panel:v1" as const;

export const SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_FLAGS = {
  readOnly: true,
  publishes: false,
  runtimeMutation: false,
  enforcementApplied: false,
  createsAafRecords: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  pasrInvoked: false,
  createsDdomSnapshots: false,
  providerCalls: false,
} as const;

export type SingleSitePublishOperatorNextAction =
  | "run_internal_dry_run"
  | "resolve_missing_metadata"
  | "await_publish_activation_decision"
  | "refresh_launch_readiness"
  | "review_gate_blockers"
  | "shadow_publish_available"
  | "no_action";

export type SingleSitePublishOperatorReadonlyLookup = {
  migrationId?: string | null;
  siteId?: string | null;
  candidateSiteVersionRef?: string | null;
  limit?: number | null;
};

export type SingleSitePublishOperatorAuditRefRow = {
  action_id: string;
  ref_role: string;
  source_system: string | null;
  source_table: string | null;
  source_type: string | null;
  source_record_id: string | null;
  source_ref: string | null;
  source_watermark: string | null;
  metadata_json: unknown;
  correlation_id: string;
  idempotency_key: string;
  created_at: string;
};

export type SingleSitePublishOperatorAuditEventRow = {
  action_id: string;
  event_action: string;
  status: string;
  actor_id: string;
  actor_type: string;
  actor_role: string;
  result_summary_json: unknown;
  redacted_diagnostics_json: unknown;
  error_summary_json: unknown;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  occurred_at: string;
  created_at: string;
};

export type SingleSitePublishOperatorAuditProjectionInput = {
  lookup: SingleSitePublishOperatorReadonlyLookup;
  actions: SingleSitePublishOperatorActionAuditRow[];
  refs?: SingleSitePublishOperatorAuditRefRow[];
  events?: SingleSitePublishOperatorAuditEventRow[];
  generatedAt?: string | null;
};

export type SingleSitePublishOperatorActionAttemptProjection = {
  actionId: string;
  mode: SingleSitePublishOperatorActionAuditMode;
  status: SingleSitePublishOperatorActionAuditStatus;
  routeActionSource: string;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  actor: {
    actorType: string;
    actorRole: string;
    actorId: string;
  };
  correlationId: string;
  idempotencyKey: string;
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
  resultStatus: string;
  resolverStatus: string;
  wrapperStatus: string;
  publishOrchestratorStatus: string;
  blockerCodes: string[];
  warningCodes: string[];
  limitationCodes: string[];
  redactedDiagnosticSummary: {
    available: boolean;
    status: string | null;
    reasonCodes: string[];
    omittedUnsafeDiagnostics: boolean;
  };
  persistedMutationFlags: {
    publishes: boolean | null;
    runtimeMutation: boolean | null;
    blockingEnforcementApplied: boolean | null;
    enforcementApplied: boolean | null;
    publishMayHaveExecuted: boolean | null;
  };
  refs: Array<{
    role: string;
    sourceType: string;
    sourceRecordId: string;
    sourceRef: string;
    sourceWatermark: string | null;
  }>;
};

export type SingleSitePublishOperatorReadonlyProjection = {
  panelVersion: typeof SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_VERSION;
  generatedAt: string;
  lookup: {
    migrationId: string | null;
    siteId: string | null;
    candidateSiteVersionRef: string | null;
  };
  state: "lookup_required" | "empty" | "visible";
  identity: {
    tenantId: string | null;
    clientId: string | null;
    siteId: string | null;
    migrationId: string | null;
  };
  publishContext: {
    candidateSiteVersionRef: string | null;
    runtimeArtifactRef: string | null;
    publishTargetRef: string | null;
    publishStage: string | null;
    publishEnvironment: string | null;
  };
  governedPublishChain: {
    launchReadinessEvidence: { ref: string | null; status: string };
    publishActivationRequest: { ref: string | null; status: string };
    publishActivationDecision: { ref: string | null; status: string };
    gateResult: { ref: string | null; status: string };
    handoffWatermark: string | null;
    gateInputWatermark: string | null;
  };
  readinessState: "unknown" | "blocked" | "waiting" | "ready" | "published";
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  timeline: SingleSitePublishOperatorActionAttemptProjection[];
  blockerCodes: string[];
  warningCodes: string[];
  limitationCodes: string[];
  staleOrMissingMetadataIndicators: string[];
  nextAction: SingleSitePublishOperatorNextAction;
  flags: typeof SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_FLAGS;
};

type Queryable = {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
};

const UNKNOWN_REF = "unknown";
const UNSAFE_KEY = /secret|token|password|credential|stripe|payment|billing|sql|stack|provider|raw|payload|html|resolverresult|publishorchestratorinput|publishorchestratorresult/i;
const UNSAFE_VALUE = /secret|token|password|credential|stripe|payment|billing|sql|stack trace|provider secret|DATABASE_URL|OPENAI_API_KEY/i;

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function safeText(value: unknown, fallback = UNKNOWN_REF): string {
  const normalized = text(value);
  if (!normalized) return fallback;
  if (UNSAFE_VALUE.test(normalized)) return "redacted";
  return normalized.slice(0, 512);
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeCode(value: unknown): string | null {
  const normalized = text(value);
  if (!normalized || normalized.length > 160 || UNSAFE_VALUE.test(normalized)) return null;
  return /^[a-zA-Z0-9_.:-]+$/.test(normalized) ? normalized : null;
}

function codeList(...values: unknown[]): string[] {
  const codes = values.flatMap((value) => {
    if (Array.isArray(value)) return value.map(safeCode);
    return [safeCode(value)];
  });
  return Array.from(new Set(codes.filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function valueFromRecords(key: string, ...records: Record<string, unknown>[]): unknown {
  for (const record of records) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function resultStatus(row: SingleSitePublishOperatorActionAuditRow, result: Record<string, unknown>): string {
  return safeText(
    valueFromRecords("routeStatus", result) ??
      valueFromRecords("wrapperDryRunStatus", result) ??
      valueFromRecords("wrapperStatus", result) ??
      row.status,
    row.status,
  );
}

function isMissingRef(value: string | null | undefined): boolean {
  const normalized = text(value)?.toLowerCase();
  return !normalized || normalized === UNKNOWN_REF || normalized === "redacted" || normalized === "-";
}

function statusFromRef(ref: string | null | undefined, complete: boolean, missingLabel: string): string {
  if (isMissingRef(ref)) return missingLabel;
  return complete ? "available" : "ref_available";
}

function latestCompleteMetadata(attempt: SingleSitePublishOperatorActionAttemptProjection | null): boolean {
  if (!attempt) return false;
  return attempt.resolverStatus === "complete" || attempt.resultStatus === "dry_run_ready" || attempt.resultStatus === "shadow_publish_completed";
}

function refsForAction(actionId: string, refs: readonly SingleSitePublishOperatorAuditRefRow[]): SingleSitePublishOperatorActionAttemptProjection["refs"] {
  return refs
    .filter((ref) => ref.action_id === actionId)
    .map((ref) => ({
      role: safeText(ref.ref_role),
      sourceType: safeText(ref.source_type),
      sourceRecordId: safeText(ref.source_record_id),
      sourceRef: safeText(ref.source_ref),
      sourceWatermark: text(ref.source_watermark),
    }));
}

function diagnosticsSummary(...records: Record<string, unknown>[]): SingleSitePublishOperatorActionAttemptProjection["redactedDiagnosticSummary"] {
  const reasonCodes = codeList(
    ...records.flatMap((record) => [
      record.reasonCode,
      record.errorCode,
      record.guardReason,
      record.blockerCodes,
      record.warningCodes,
      record.limitationCodes,
    ]),
  );
  const status = text(valueFromRecords("status", ...records));
  const available = records.some((record) => Object.keys(record).length > 0);
  const omittedUnsafeDiagnostics = records.some((record) =>
    Object.entries(record).some(([key, value]) => UNSAFE_KEY.test(key) || UNSAFE_VALUE.test(String(value ?? ""))),
  );
  return {
    available,
    status: status ? safeText(status) : null,
    reasonCodes,
    omittedUnsafeDiagnostics,
  };
}

function attemptFromRow(
  row: SingleSitePublishOperatorActionAuditRow,
  refs: readonly SingleSitePublishOperatorAuditRefRow[],
): SingleSitePublishOperatorActionAttemptProjection {
  const result = jsonObject(row.result_summary_json);
  const limitations = jsonObject(row.limitation_summary_json);
  const diagnostics = jsonObject(row.redacted_diagnostics_json);
  const errors = jsonObject(row.error_summary_json);
  const shadowGuardDiagnostics = jsonObject(result.shadowGuardDiagnostics);
  const metadataCompleteness = jsonObject(result.metadataCompleteness);

  return {
    actionId: row.id,
    mode: row.mode,
    status: row.status,
    routeActionSource: safeText(row.route_action_source),
    startedAt: safeText(row.started_at),
    completedAt: text(row.completed_at),
    updatedAt: safeText(row.updated_at),
    actor: {
      actorType: safeText(row.actor_type),
      actorRole: safeText(row.actor_role),
      actorId: safeText(row.actor_id),
    },
    correlationId: safeText(row.correlation_id),
    idempotencyKey: safeText(row.idempotency_key),
    candidateSiteVersionRef: safeText(row.candidate_site_version_ref),
    runtimeArtifactRef: safeText(row.runtime_artifact_ref),
    publishTargetRef: safeText(row.publish_target_ref),
    publishStage: safeText(row.publish_stage),
    publishEnvironment: safeText(row.publish_environment),
    launchReadinessEvidenceRef: safeText(row.launch_readiness_evidence_ref),
    publishActivationRequestRef: safeText(row.publish_activation_request_ref),
    publishActivationDecisionRef: safeText(row.publish_activation_decision_ref),
    gateAttemptResultRef: safeText(row.gate_attempt_result_ref),
    handoffWatermark: safeText(row.handoff_watermark),
    gateInputWatermark: safeText(row.gate_input_watermark),
    resultStatus: resultStatus(row, result),
    resolverStatus: safeText(valueFromRecords("resolverStatus", result), "unknown"),
    wrapperStatus: safeText(valueFromRecords("wrapperStatus", result) ?? valueFromRecords("wrapperDryRunStatus", result), "unknown"),
    publishOrchestratorStatus: safeText(valueFromRecords("publishOrchestratorStatus", result), "not_called"),
    blockerCodes: codeList(limitations.blockerCodes, result.blockerCodes, errors.blockerCodes, shadowGuardDiagnostics.blockerCodes, metadataCompleteness.missingCodes, metadataCompleteness.mismatchCodes),
    warningCodes: codeList(limitations.warningCodes, limitations.warnings, result.warningCodes, result.warnings, metadataCompleteness.warningCodes),
    limitationCodes: codeList(limitations.limitationCodes, result.limitationCodes),
    redactedDiagnosticSummary: diagnosticsSummary(diagnostics, errors, shadowGuardDiagnostics),
    persistedMutationFlags: {
      publishes: booleanOrNull(result.publishes),
      runtimeMutation: booleanOrNull(result.runtimeMutation),
      blockingEnforcementApplied: booleanOrNull(valueFromRecords("blockingEnforcementApplied", result, shadowGuardDiagnostics)),
      enforcementApplied: booleanOrNull(valueFromRecords("enforcementApplied", result, shadowGuardDiagnostics)),
      publishMayHaveExecuted: booleanOrNull(result.publishMayHaveExecuted),
    },
    refs: refsForAction(row.id, refs),
  };
}

function latestByMode(
  attempts: readonly SingleSitePublishOperatorActionAttemptProjection[],
  mode: SingleSitePublishOperatorActionAuditMode,
): SingleSitePublishOperatorActionAttemptProjection | null {
  return attempts.find((attempt) => attempt.mode === mode) ?? null;
}

function deriveMissingMetadata(attempt: SingleSitePublishOperatorActionAttemptProjection | null): string[] {
  if (!attempt) return [];
  const indicators: string[] = [];
  if (isMissingRef(attempt.candidateSiteVersionRef)) indicators.push("candidate_site_version_ref_missing");
  if (isMissingRef(attempt.runtimeArtifactRef)) indicators.push("runtime_artifact_ref_missing");
  if (isMissingRef(attempt.publishTargetRef)) indicators.push("publish_target_ref_missing");
  if (isMissingRef(attempt.launchReadinessEvidenceRef)) indicators.push("launch_readiness_evidence_ref_missing");
  if (isMissingRef(attempt.publishActivationRequestRef)) indicators.push("publish_activation_request_ref_missing");
  if (isMissingRef(attempt.publishActivationDecisionRef)) indicators.push("publish_activation_decision_ref_missing");
  if (isMissingRef(attempt.gateAttemptResultRef)) indicators.push("gate_result_ref_missing");
  if (isMissingRef(attempt.handoffWatermark)) indicators.push("handoff_watermark_missing");
  if (isMissingRef(attempt.gateInputWatermark)) indicators.push("gate_input_watermark_missing");
  if (attempt.resolverStatus === "incomplete") indicators.push("resolver_metadata_incomplete");
  return indicators;
}

function deriveNextAction(input: {
  state: SingleSitePublishOperatorReadonlyProjection["state"];
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  blockerCodes: readonly string[];
  missingMetadata: readonly string[];
}): SingleSitePublishOperatorNextAction {
  if (input.state === "lookup_required") return "resolve_missing_metadata";
  if (input.state === "empty") return "run_internal_dry_run";
  if (input.missingMetadata.length > 0) {
    if (input.missingMetadata.some((code) => code.includes("launch_readiness"))) return "refresh_launch_readiness";
    if (input.missingMetadata.some((code) => code.includes("publish_activation_decision"))) return "await_publish_activation_decision";
    return "resolve_missing_metadata";
  }
  if (!input.latestDryRun) return "run_internal_dry_run";
  if (input.blockerCodes.length > 0) return "review_gate_blockers";
  if (!input.latestShadowPublish && input.latestDryRun.status === "dry_run_completed") return "shadow_publish_available";
  if (input.latestShadowPublish?.status === "shadow_publish_completed") return "no_action";
  return "run_internal_dry_run";
}

function readinessState(input: {
  state: SingleSitePublishOperatorReadonlyProjection["state"];
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  blockerCodes: readonly string[];
  missingMetadata: readonly string[];
}): SingleSitePublishOperatorReadonlyProjection["readinessState"] {
  if (input.state !== "visible") return "unknown";
  if (input.blockerCodes.length > 0 || input.missingMetadata.length > 0) return "blocked";
  if (input.latestShadowPublish?.status === "shadow_publish_completed") return "published";
  if (input.latestDryRun?.status === "dry_run_completed") return "ready";
  return "waiting";
}

function firstVisibleAttempt(attempts: readonly SingleSitePublishOperatorActionAttemptProjection[]): SingleSitePublishOperatorActionAttemptProjection | null {
  return attempts[0] ?? null;
}

function rowForAttempt(
  attempt: SingleSitePublishOperatorActionAttemptProjection | null,
  rows: readonly SingleSitePublishOperatorActionAuditRow[],
): SingleSitePublishOperatorActionAuditRow | null {
  if (!attempt) return null;
  return rows.find((row) => row.id === attempt.actionId) ?? null;
}

export function buildSingleSitePublishOperatorReadonlyProjection(
  input: SingleSitePublishOperatorAuditProjectionInput,
): SingleSitePublishOperatorReadonlyProjection {
  const migrationId = text(input.lookup.migrationId);
  const siteId = text(input.lookup.siteId);
  const candidateSiteVersionRef = text(input.lookup.candidateSiteVersionRef);
  const hasLookup = Boolean(migrationId || siteId || candidateSiteVersionRef);
  const attempts = [...input.actions]
    .sort((left, right) => safeText(right.updated_at).localeCompare(safeText(left.updated_at)))
    .map((row) => attemptFromRow(row, input.refs ?? []));

  const latestDryRun = latestByMode(attempts, "dry_run");
  const latestShadowPublish = latestByMode(attempts, "shadow_publish");
  const primary = latestShadowPublish ?? latestDryRun ?? firstVisibleAttempt(attempts);
  const primaryRow = rowForAttempt(primary, input.actions);
  const completeMetadata = latestCompleteMetadata(primary);
  const missingMetadata = deriveMissingMetadata(primary);
  const blockerCodes = codeList(...attempts.map((attempt) => attempt.blockerCodes));
  const warningCodes = codeList(...attempts.map((attempt) => attempt.warningCodes));
  const limitationCodes = codeList(...attempts.map((attempt) => attempt.limitationCodes));
  const state: SingleSitePublishOperatorReadonlyProjection["state"] = hasLookup ? (attempts.length > 0 ? "visible" : "empty") : "lookup_required";
  const nextAction = deriveNextAction({
    state,
    latestDryRun,
    latestShadowPublish,
    blockerCodes,
    missingMetadata,
  });

  return {
    panelVersion: SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    lookup: {
      migrationId,
      siteId,
      candidateSiteVersionRef,
    },
    state,
    identity: {
      tenantId: primaryRow ? safeText(primaryRow.tenant_id, UNKNOWN_REF) : null,
      clientId: primaryRow ? safeText(primaryRow.client_id, UNKNOWN_REF) : null,
      siteId: primaryRow ? safeText(primaryRow.site_id, UNKNOWN_REF) : null,
      migrationId: primaryRow ? safeText(primaryRow.migration_id, UNKNOWN_REF) : null,
    },
    publishContext: {
      candidateSiteVersionRef: primary?.candidateSiteVersionRef ?? null,
      runtimeArtifactRef: primary?.runtimeArtifactRef ?? null,
      publishTargetRef: primary?.publishTargetRef ?? null,
      publishStage: primary?.publishStage ?? null,
      publishEnvironment: primary?.publishEnvironment ?? null,
    },
    governedPublishChain: {
      launchReadinessEvidence: {
        ref: primary?.launchReadinessEvidenceRef ?? null,
        status: statusFromRef(primary?.launchReadinessEvidenceRef, completeMetadata, "missing"),
      },
      publishActivationRequest: {
        ref: primary?.publishActivationRequestRef ?? null,
        status: statusFromRef(primary?.publishActivationRequestRef, completeMetadata, "missing"),
      },
      publishActivationDecision: {
        ref: primary?.publishActivationDecisionRef ?? null,
        status: statusFromRef(primary?.publishActivationDecisionRef, completeMetadata, "missing_or_pending"),
      },
      gateResult: {
        ref: primary?.gateAttemptResultRef ?? null,
        status: statusFromRef(primary?.gateAttemptResultRef, completeMetadata, blockerCodes.length > 0 ? "blocked" : "missing"),
      },
      handoffWatermark: primary?.handoffWatermark ?? null,
      gateInputWatermark: primary?.gateInputWatermark ?? null,
    },
    readinessState: readinessState({
      state,
      latestDryRun,
      latestShadowPublish,
      blockerCodes,
      missingMetadata,
    }),
    latestDryRun,
    latestShadowPublish,
    timeline: attempts.slice(0, Math.max(1, input.lookup.limit ?? 12)),
    blockerCodes,
    warningCodes,
    limitationCodes,
    staleOrMissingMetadataIndicators: missingMetadata,
    nextAction,
    flags: SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_FLAGS,
  };
}

export class SingleSitePublishOperatorReadonlyProjectionRepository {
  constructor(private readonly db: Queryable = getSuperadminPool()) {}

  async read(input: SingleSitePublishOperatorReadonlyLookup): Promise<SingleSitePublishOperatorReadonlyProjection> {
    const migrationId = text(input.migrationId);
    const siteId = text(input.siteId);
    const candidateSiteVersionRef = text(input.candidateSiteVersionRef);
    if (!migrationId && !siteId && !candidateSiteVersionRef) {
      return buildSingleSitePublishOperatorReadonlyProjection({ lookup: input, actions: [] });
    }

    const limit = Math.min(Math.max(input.limit ?? 12, 1), 25);
    const actionResult = await this.db.query(
      `
        select
          id, tenant_id, client_id, site_id, migration_id, mode, route_action_source,
          actor_id, actor_type, actor_role, confirmation_marker, candidate_site_version_ref,
          runtime_artifact_ref, publish_target_ref, publish_stage, publish_environment,
          launch_readiness_evidence_ref, publish_activation_request_ref,
          publish_activation_decision_ref, gate_attempt_result_ref, handoff_watermark,
          gate_input_watermark, idempotency_key, correlation_id, semantic_fingerprint,
          status, result_summary_json, redacted_diagnostics_json, limitation_summary_json,
          error_summary_json, started_at, completed_at, created_at, updated_at,
          privacy_label, retention_class
        from public.gnr8_single_site_publish_operator_actions
        where ($1::text is null or migration_id = $1)
          and ($2::text is null or site_id = $2)
          and ($3::text is null or candidate_site_version_ref = $3 or candidate_site_version_ref like '%' || $3)
        order by updated_at desc, created_at desc
        limit $4
      `,
      [migrationId, siteId, candidateSiteVersionRef, limit],
    );

    const actions = actionResult.rows as unknown as SingleSitePublishOperatorActionAuditRow[];
    const actionIds = actions.map((row) => row.id);
    if (actionIds.length === 0) {
      return buildSingleSitePublishOperatorReadonlyProjection({ lookup: input, actions: [] });
    }

    const [refResult, eventResult] = await Promise.all([
      this.db.query(
        `
          select
            action_id, ref_role, source_system, source_table, source_type,
            source_record_id, source_ref, source_watermark, metadata_json,
            correlation_id, idempotency_key, created_at
          from public.gnr8_single_site_publish_operator_action_refs
          where action_id = any($1::uuid[])
          order by created_at desc
        `,
        [actionIds],
      ),
      this.db.query(
        `
          select
            action_id, event_action, status, actor_id, actor_type, actor_role,
            result_summary_json, redacted_diagnostics_json, error_summary_json,
            correlation_id, causation_id, idempotency_key, occurred_at, created_at
          from public.gnr8_single_site_publish_operator_action_events
          where action_id = any($1::uuid[])
          order by occurred_at desc, created_at desc
        `,
        [actionIds],
      ),
    ]);

    return buildSingleSitePublishOperatorReadonlyProjection({
      lookup: input,
      actions,
      refs: refResult.rows as unknown as SingleSitePublishOperatorAuditRefRow[],
      events: eventResult.rows as unknown as SingleSitePublishOperatorAuditEventRow[],
    });
  }
}

export async function getSingleSitePublishOperatorReadonlyProjection(
  input: SingleSitePublishOperatorReadonlyLookup,
): Promise<SingleSitePublishOperatorReadonlyProjection> {
  return new SingleSitePublishOperatorReadonlyProjectionRepository().read(input);
}
