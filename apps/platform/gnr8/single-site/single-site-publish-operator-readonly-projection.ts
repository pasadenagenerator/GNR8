import "server-only";

import { createHash } from "node:crypto";

import { getSuperadminPool } from "../../src/superadmin/db";
import type {
  SingleSitePublishOperatorActionAuditMode,
  SingleSitePublishOperatorActionAuditRow,
  SingleSitePublishOperatorActionAuditStatus,
} from "./single-site-publish-operator-action-audit";

export const SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_VERSION =
  "mvp-61-single-site-publish-operator-readonly-runbook:v1" as const;

export const SINGLE_SITE_PUBLISH_OPERATOR_DIAGNOSTIC_SNAPSHOT_VERSION =
  "mvp-62-single-site-publish-operator-readonly-diagnostic-snapshot:v1" as const;

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
  | "collect_launch_readiness_evidence"
  | "resolve_launch_readiness_blockers"
  | "request_publish_activation_approval"
  | "await_publish_activation_decision"
  | "review_rejected_publish_activation"
  | "prepare_gate_evaluation"
  | "resolve_gate_blockers"
  | "run_internal_dry_run"
  | "shadow_publish_available"
  | "review_shadow_publish_failure"
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
  sourceSnapshot?: SingleSitePublishOperatorSourceSnapshot | null;
  generatedAt?: string | null;
};

export type SingleSitePublishOperatorSourceBoundary = {
  ownership: "source-owned read" | "derived-only";
  truthRole: "source-owned read" | "derived-only";
  enforcing: false;
  mutating: false;
};

export type SingleSitePublishOperatorSourceRow = Record<string, unknown>;

export type SingleSitePublishOperatorSourceSnapshot = {
  transactionCapturedAt?: string | null;
  launchReadinessRecord?: SingleSitePublishOperatorSourceRow | null;
  launchReadinessDimensions?: SingleSitePublishOperatorSourceRow[];
  launchReadinessBlockers?: SingleSitePublishOperatorSourceRow[];
  launchReadinessRefs?: SingleSitePublishOperatorSourceRow[];
  launchReadinessEvidencePackage?: SingleSitePublishOperatorSourceRow | null;
  launchReadinessEvidenceFreshnessRows?: SingleSitePublishOperatorSourceRow[];
  publishActivationRequest?: SingleSitePublishOperatorSourceRow | null;
  publishActivationRequestEvidenceLinks?: SingleSitePublishOperatorSourceRow[];
  publishActivationDecision?: SingleSitePublishOperatorSourceRow | null;
  publishActivationDecisionEvidenceLinks?: SingleSitePublishOperatorSourceRow[];
  activePublishActivationDecisionCount?: number | null;
  gateAttempt?: SingleSitePublishOperatorSourceRow | null;
  gatePolicyEvaluation?: SingleSitePublishOperatorSourceRow | null;
  conflictingNewerGateAttempts?: SingleSitePublishOperatorSourceRow[];
  publishTarget?: SingleSitePublishOperatorSourceRow | null;
  readFailureCodes?: string[];
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

export type SingleSitePublishOperatorCodeCount = {
  key: string;
  count: number;
};

export type SingleSitePublishOperatorDrilldownRow = {
  id: string;
  group: "ready" | "stale" | "missing" | "blocked" | "optional" | "warning" | "info";
  label: string;
  status: string;
  freshnessStatus: string | null;
  severity: string | null;
  category: string | null;
  code: string | null;
  ref: string | null;
  watermark: string | null;
  summary: string;
};

export type SingleSitePublishOperatorRunbookSeverity = "info" | "warning" | "blocked" | "critical";

export type SingleSitePublishOperatorRunbookSourceOwner =
  | "launch_readiness"
  | "publish_activation_request"
  | "publish_activation_decision"
  | "gate_evaluation"
  | "metadata_resolver"
  | "operator_audit"
  | "runtime_candidate"
  | "publish_target"
  | "unknown";

export type SingleSitePublishOperatorRunbookEntry = {
  code: string;
  severity: SingleSitePublishOperatorRunbookSeverity;
  sourceOwner: SingleSitePublishOperatorRunbookSourceOwner;
  title: string;
  diagnosticExplanation: string;
  safeNextInspectionHint: string;
  requiredUpstreamSource: SingleSitePublishOperatorRunbookSourceOwner | null;
  blocking: boolean;
  stale: boolean;
  missing: boolean;
  conflict: boolean;
  relatedSafeRefs: string[];
  relatedSafeCodes: string[];
  readOnly: true;
  actionAvailable: false;
};

export type SingleSitePublishOperatorRunbookSummary = {
  totalEntries: number;
  blockingEntries: number;
  staleEntries: number;
  missingEntries: number;
  conflictEntries: number;
  severityCounts: SingleSitePublishOperatorCodeCount[];
  sourceOwnerCounts: SingleSitePublishOperatorCodeCount[];
  topBlockingReason: Pick<
    SingleSitePublishOperatorRunbookEntry,
    "code" | "severity" | "sourceOwner" | "title" | "safeNextInspectionHint"
  > | null;
  recommendedInspectionOrder: SingleSitePublishOperatorRunbookSourceOwner[];
};

export type SingleSitePublishOperatorSafeReference = {
  key: string;
  label: string;
  ref: string | null;
  sourceOwner: SingleSitePublishOperatorRunbookSourceOwner;
  boundaryLabel: "source-owned read" | "derived-only";
  sourceWatermark: string | null;
};

export type SingleSitePublishOperatorDiagnosticSnapshot = {
  snapshotVersion: typeof SINGLE_SITE_PUBLISH_OPERATOR_DIAGNOSTIC_SNAPSHOT_VERSION;
  snapshotGeneratedAt: string;
  snapshotWatermark: string;
  sourceWatermarks: Record<string, string>;
  flags: {
    readOnly: true;
    exportSafe: true;
    actionAvailable: false;
    publishes: false;
    runtimeMutation: false;
    enforcementApplied: false;
  };
  safeIdentity: SingleSitePublishOperatorReadonlyProjection["identity"];
  lookup: SingleSitePublishOperatorReadonlyProjection["lookup"];
  candidateArtifactPublishTargetRefs: {
    candidateSiteVersionRef: string | null;
    runtimeArtifactRef: string | null;
    publishTargetRef: string | null;
    publishStage: string | null;
    publishEnvironment: string | null;
  };
  launchReadinessSummary: {
    status: string;
    freshnessStatus: string;
    recordRef: string | null;
    evidencePackageRef: string | null;
    ready: boolean;
    readyWithLimitations: boolean;
    blocked: boolean;
    stale: boolean;
    missing: boolean;
    requiredMissingDimensions: string[];
    staleDimensions: string[];
    blockedDimensions: string[];
    acceptedLimitations: string[];
    sourceLabel: "source-owned read";
  };
  publishActivationRequestSummary: {
    ref: string | null;
    status: string;
    scope: string | null;
    action: string | null;
    subjectType: string | null;
    linkedLaunchReadinessEvidenceRef: string | null;
    evidenceRefs: string[];
    sourceLabel: "source-owned read";
  };
  publishActivationDecisionSummary: {
    ref: string | null;
    status: string;
    projection: SingleSitePublishOperatorReadonlyProjection["publishActivationDecision"]["projection"];
    granted: boolean;
    grantedWithLimitations: boolean;
    rejected: boolean;
    invalid: boolean;
    revoked: boolean;
    superseded: boolean;
    expired: boolean;
    limitations: string[];
    indicators: string[];
    sourceLabel: "source-owned read";
  };
  gateHandoffSummary: {
    handoffReadinessStatus: SingleSitePublishOperatorReadonlyProjection["gateHandoffEvaluation"]["handoffReadinessStatus"];
    gateResultRef: string | null;
    gateResultStatus: string;
    handoffWatermark: string | null;
    gateInputWatermark: string | null;
    gateBlockers: string[];
    gateWarnings: string[];
    newerConflict: boolean;
    stale: boolean;
    mismatchIndicators: string[];
    sourceLabel: "source-owned read";
  };
  metadataResolverSummary: {
    completenessStatus: SingleSitePublishOperatorReadonlyProjection["metadataResolver"]["completenessStatus"];
    missingMetadataCodes: string[];
    expectedResolvedMismatchCodes: string[];
    safeDiagnostics: string[];
    sourceLabel: "derived-only";
  };
  auditSummary: {
    latestDryRunActionId: string | null;
    latestShadowPublishActionId: string | null;
    recentAttemptCount: number;
    latestDryRunStatus: string | null;
    latestShadowPublishStatus: string | null;
    persistedResultFlags: SingleSitePublishOperatorReadonlyProjection["operatorAudit"]["persistedResultFlags"];
    sourceLabel: "source-owned read";
  };
  runbookSummary: SingleSitePublishOperatorRunbookSummary;
  topBlockingReason: SingleSitePublishOperatorRunbookSummary["topBlockingReason"];
  recommendedInspectionOrder: SingleSitePublishOperatorRunbookSourceOwner[];
  blockerCodes: string[];
  warningCodes: string[];
  limitationCodes: string[];
  staleOrMissingMetadataIndicators: string[];
  freshnessMissingStaleSummary: {
    staleCount: number;
    missingCount: number;
    conflictCount: number;
    staleCodes: string[];
    missingCodes: string[];
    conflictCodes: string[];
  };
  sourceLabels: {
    sourceOwnedReads: SingleSitePublishOperatorRunbookSourceOwner[];
    derivedOnly: SingleSitePublishOperatorRunbookSourceOwner[];
  };
  safeReferences: SingleSitePublishOperatorSafeReference[];
  exportSafeJsonPreview: Record<string, unknown>;
};

export type SingleSitePublishOperatorAuditEventProjection = {
  actionId: string;
  eventAction: string;
  status: string;
  actorRole: string;
  occurredAt: string;
  resultStatus: string | null;
  reasonCodes: string[];
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
  sourceBoundaries: {
    launchReadiness: SingleSitePublishOperatorSourceBoundary;
    publishActivationRequest: SingleSitePublishOperatorSourceBoundary;
    publishActivationDecision: SingleSitePublishOperatorSourceBoundary;
    gateHandoffEvaluation: SingleSitePublishOperatorSourceBoundary;
    metadataResolver: SingleSitePublishOperatorSourceBoundary;
    operatorAudit: SingleSitePublishOperatorSourceBoundary;
    derivedNextAction: SingleSitePublishOperatorSourceBoundary;
  };
  launchReadiness: {
    boundary: SingleSitePublishOperatorSourceBoundary;
    recordId: string | null;
    recordRef: string | null;
    status: string;
    freshnessStatus: string;
    sourceWatermark: string | null;
    readinessSummary: string[];
    flags: {
      ready: boolean;
      readyWithLimitations: boolean;
      blocked: boolean;
      stale: boolean;
      missing: boolean;
    };
    requiredMissingDimensions: string[];
    staleDimensions: string[];
    blockedDimensions: string[];
    acceptedLimitations: string[];
    dimensionDrilldown: SingleSitePublishOperatorDrilldownRow[];
    dimensionGroups: {
      ready: string[];
      stale: string[];
      missing: string[];
      blocked: string[];
      optional: string[];
    };
    blockerCountBySeverity: SingleSitePublishOperatorCodeCount[];
    blockerCountByCategory: SingleSitePublishOperatorCodeCount[];
    openBlockers: Array<{
      severity: string;
      category: string;
      status: string;
      description: string;
    }>;
    evidencePackageRef: string | null;
    evidencePackageStatus: string;
    evidenceWatermark: string | null;
  };
  publishActivationRequest: {
    boundary: SingleSitePublishOperatorSourceBoundary;
    id: string | null;
    ref: string | null;
    status: string;
    scope: string | null;
    action: string | null;
    subjectType: string | null;
    subjectId: string | null;
    linkedLaunchReadinessEvidenceRef: string | null;
    evidenceRefs: string[];
    policyMetadata: {
      policyVersion: string | null;
      policyEvaluationId: string | null;
      requestedExpiresAt: string | null;
    };
  };
  publishActivationDecision: {
    boundary: SingleSitePublishOperatorSourceBoundary;
    id: string | null;
    ref: string | null;
    status: string;
    projection: "granted" | "granted_with_limitations" | "rejected" | "invalid" | "missing";
    granted: boolean;
    grantedWithLimitations: boolean;
    rejected: boolean;
    invalid: boolean;
    revoked: boolean;
    superseded: boolean;
    expired: boolean;
    expiresAt: string | null;
    limitations: string[];
    evidenceRefs: string[];
    indicators: string[];
  };
  gateHandoffEvaluation: {
    boundary: SingleSitePublishOperatorSourceBoundary;
    handoffReadinessStatus: "handoff_ready" | "handoff_blocked" | "missing";
    handoffWatermark: string | null;
    gateInputWatermark: string | null;
    gateResultId: string | null;
    gateResultRef: string | null;
    gateResultStatus: string;
    gateBlockers: string[];
    gateWarnings: string[];
    newerConflict: boolean;
    stale: boolean;
    mismatchIndicators: string[];
    conflictDetails: SingleSitePublishOperatorDrilldownRow[];
  };
  metadataResolver: {
    boundary: SingleSitePublishOperatorSourceBoundary;
    completenessStatus: "complete" | "incomplete" | "unknown";
    missingMetadataCodes: string[];
    expectedResolvedMismatchCodes: string[];
    safeDiagnostics: string[];
    detailRows: SingleSitePublishOperatorDrilldownRow[];
  };
  operatorAudit: {
    boundary: SingleSitePublishOperatorSourceBoundary;
    latestDryRunActionId: string | null;
    latestShadowPublishActionId: string | null;
    recentAttemptCount: number;
    actorCorrelationIdempotencyProjection: Array<{
      actionId: string;
      actorRole: string;
      correlationId: string;
      idempotencyKey: string;
    }>;
    recentEvents: SingleSitePublishOperatorAuditEventProjection[];
    timelineSummaries: SingleSitePublishOperatorDrilldownRow[];
    persistedResultFlags: {
      anyPublishMayHaveExecuted: boolean;
      anyRuntimeMutationFlag: boolean;
      anyBlockingEnforcementAppliedFlag: boolean;
    };
  };
  readinessState: "unknown" | "blocked" | "waiting" | "ready" | "published";
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  timeline: SingleSitePublishOperatorActionAttemptProjection[];
  blockerCodes: string[];
  warningCodes: string[];
  limitationCodes: string[];
  staleOrMissingMetadataIndicators: string[];
  runbookSummary: SingleSitePublishOperatorRunbookSummary;
  runbookEntries: SingleSitePublishOperatorRunbookEntry[];
  diagnosticSnapshot: SingleSitePublishOperatorDiagnosticSnapshot;
  nextAction: SingleSitePublishOperatorNextAction;
  flags: typeof SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_FLAGS;
};

type Queryable = {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
};

type ReadonlyProjectionClient = Queryable & { release?: () => void };
type QueryableWithConnect = Queryable & {
  connect(): Promise<ReadonlyProjectionClient>;
};

const UNKNOWN_REF = "unknown";
const UNSAFE_KEY = /secret|token|password|credential|stripe|payment|billing|sql|stack|provider|raw|payload|html|resolverresult|publishorchestratorinput|publishorchestratorresult/i;
const UNSAFE_VALUE = /secret|token|password|credential|stripe|payment|billing|sql|stack trace|provider secret|DATABASE_URL|OPENAI_API_KEY/i;

const SOURCE_OWNED_READ_BOUNDARY: SingleSitePublishOperatorSourceBoundary = {
  ownership: "source-owned read",
  truthRole: "source-owned read",
  enforcing: false,
  mutating: false,
};

const DERIVED_ONLY_BOUNDARY: SingleSitePublishOperatorSourceBoundary = {
  ownership: "derived-only",
  truthRole: "derived-only",
  enforcing: false,
  mutating: false,
};

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

function jsonObjectArray(value: unknown): Record<string, unknown>[] {
  return jsonArray(value).map(jsonObject).filter((entry) => Object.keys(entry).length > 0);
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

function booleanValue(value: unknown): boolean {
  return value === true || value === "true";
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceId(value: string | null | undefined): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  const parts = normalized.split(":");
  return parts[parts.length - 1] || normalized;
}

function isUuid(value: string | null | undefined): boolean {
  return Boolean(text(value)?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function sourceRef(prefix: string, id: string | null): string | null {
  return id ? `${prefix}:${id}` : null;
}

function rowText(row: SingleSitePublishOperatorSourceRow | null | undefined, field: string): string | null {
  return text(row?.[field]);
}

function rowSafeText(row: SingleSitePublishOperatorSourceRow | null | undefined, field: string, fallback = UNKNOWN_REF): string {
  return safeText(row?.[field], fallback);
}

function rowJsonObject(row: SingleSitePublishOperatorSourceRow | null | undefined, field: string): Record<string, unknown> {
  return jsonObject(row?.[field]);
}

function rowJsonArray(row: SingleSitePublishOperatorSourceRow | null | undefined, field: string): unknown[] {
  return jsonArray(row?.[field]);
}

function safeStringList(values: readonly unknown[]): string[] {
  return codeList(values.map((value) => {
    if (typeof value === "string") return value;
    const object = jsonObject(value);
    return object.code ?? object.dimension ?? object.category ?? object.status ?? object.description;
  }));
}

function safeFreeformList(values: readonly unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => {
          if (typeof value === "string") return safeText(value);
          const object = jsonObject(value);
          return safeCode(object.code) ?? safeCode(object.dimension) ?? safeCode(object.category) ?? safeCode(object.status) ?? null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function codeCounts(values: readonly (string | null | undefined)[]): SingleSitePublishOperatorCodeCount[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const code = safeCode(value);
    if (!code) return;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function drilldownRow(input: {
  id: string | null | undefined;
  group: SingleSitePublishOperatorDrilldownRow["group"];
  label: string | null | undefined;
  status?: string | null;
  freshnessStatus?: string | null;
  severity?: string | null;
  category?: string | null;
  code?: string | null;
  ref?: string | null;
  watermark?: string | null;
  summary?: string | null;
}): SingleSitePublishOperatorDrilldownRow {
  const label = safeText(input.label, "unknown");
  const code = safeCode(input.code ?? label);
  return {
    id: safeText(input.id ?? input.ref ?? input.code ?? label),
    group: input.group,
    label,
    status: safeText(input.status ?? input.group),
    freshnessStatus: input.freshnessStatus ? safeText(input.freshnessStatus) : null,
    severity: input.severity ? safeText(input.severity) : null,
    category: input.category ? safeText(input.category) : null,
    code,
    ref: input.ref ? safeText(input.ref) : null,
    watermark: input.watermark ? safeText(input.watermark) : null,
    summary: safeText(input.summary ?? input.status ?? input.group, "available"),
  };
}

function rowSourceRef(row: SingleSitePublishOperatorSourceRow | null | undefined): string | null {
  return (
    rowText(row, "source_ref") ??
    sourceRef(safeText(row?.source_table, "source"), rowText(row, "source_record_id")) ??
    sourceRef(safeText(row?.ref_table, "source"), rowText(row, "ref_id"))
  );
}

function groupForDimension(row: SingleSitePublishOperatorSourceRow): SingleSitePublishOperatorDrilldownRow["group"] {
  const status = rowText(row, "dimension_status") ?? "missing";
  const freshness = rowText(row, "freshness_status") ?? "unknown";
  const required = booleanValue(row.required_for_launch_readiness);
  if (status === "blocked") return "blocked";
  if (status === "stale" || freshness === "stale") return "stale";
  if (!required) return "optional";
  if (status === "missing") return "missing";
  return "ready";
}

function expiredAt(value: unknown, nowIso: string): boolean {
  const normalized = text(value);
  if (!normalized) return false;
  const parsed = new Date(normalized).getTime();
  const now = new Date(nowIso).getTime();
  return Number.isFinite(parsed) && Number.isFinite(now) && parsed <= now;
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

const RUNBOOK_SEVERITY_RANK: Record<SingleSitePublishOperatorRunbookSeverity, number> = {
  critical: 0,
  blocked: 1,
  warning: 2,
  info: 3,
};

const RUNBOOK_SOURCE_OWNER_RANK: Record<SingleSitePublishOperatorRunbookSourceOwner, number> = {
  launch_readiness: 0,
  runtime_candidate: 1,
  publish_target: 2,
  publish_activation_request: 3,
  publish_activation_decision: 4,
  gate_evaluation: 5,
  metadata_resolver: 6,
  operator_audit: 7,
  unknown: 8,
};

function safeRunbookRef(value: string | null | undefined): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  if (/secret|token|password|credential|stripe|payment|billing|sql|stack|provider|payload|raw|DATABASE_URL|OPENAI_API_KEY/i.test(normalized)) return "redacted";
  return safeText(normalized);
}

function runbookEntry(input: {
  code: string;
  severity: SingleSitePublishOperatorRunbookSeverity;
  sourceOwner: SingleSitePublishOperatorRunbookSourceOwner;
  title: string;
  diagnosticExplanation: string;
  safeNextInspectionHint: string;
  requiredUpstreamSource?: SingleSitePublishOperatorRunbookSourceOwner | null;
  blocking?: boolean;
  stale?: boolean;
  missing?: boolean;
  conflict?: boolean;
  relatedSafeRefs?: readonly (string | null | undefined)[];
  relatedSafeCodes?: readonly unknown[];
}): SingleSitePublishOperatorRunbookEntry {
  return {
    code: safeCode(input.code) ?? "UNKNOWN_RUNBOOK_ENTRY",
    severity: input.severity,
    sourceOwner: input.sourceOwner,
    title: safeText(input.title),
    diagnosticExplanation: safeText(input.diagnosticExplanation),
    safeNextInspectionHint: safeText(input.safeNextInspectionHint),
    requiredUpstreamSource: input.requiredUpstreamSource ?? null,
    blocking: input.blocking ?? (input.severity === "blocked" || input.severity === "critical"),
    stale: input.stale ?? false,
    missing: input.missing ?? false,
    conflict: input.conflict ?? false,
    relatedSafeRefs: codeList((input.relatedSafeRefs ?? []).map(safeRunbookRef)),
    relatedSafeCodes: codeList(...(input.relatedSafeCodes ?? [])),
    readOnly: true,
    actionAvailable: false,
  };
}

function sortRunbookEntries(entries: readonly SingleSitePublishOperatorRunbookEntry[]): SingleSitePublishOperatorRunbookEntry[] {
  return [...entries].sort((left, right) => {
    const severity = RUNBOOK_SEVERITY_RANK[left.severity] - RUNBOOK_SEVERITY_RANK[right.severity];
    if (severity !== 0) return severity;
    const source = RUNBOOK_SOURCE_OWNER_RANK[left.sourceOwner] - RUNBOOK_SOURCE_OWNER_RANK[right.sourceOwner];
    if (source !== 0) return source;
    return left.code.localeCompare(right.code);
  });
}

function buildRunbookSummary(entries: readonly SingleSitePublishOperatorRunbookEntry[]): SingleSitePublishOperatorRunbookSummary {
  const sorted = sortRunbookEntries(entries);
  const topBlockingEntry = sorted.find((entry) => entry.blocking) ?? null;
  const recommendedInspectionOrder = Array.from(
    new Set(sorted.filter((entry) => entry.blocking || entry.severity === "warning").map((entry) => entry.sourceOwner)),
  );
  const topBlockingReason = topBlockingEntry
    ? {
        code: topBlockingEntry.code,
        severity: topBlockingEntry.severity,
        sourceOwner: topBlockingEntry.sourceOwner,
        title: topBlockingEntry.title,
        safeNextInspectionHint: topBlockingEntry.safeNextInspectionHint,
      }
    : null;

  return {
    totalEntries: entries.length,
    blockingEntries: entries.filter((entry) => entry.blocking).length,
    staleEntries: entries.filter((entry) => entry.stale).length,
    missingEntries: entries.filter((entry) => entry.missing).length,
    conflictEntries: entries.filter((entry) => entry.conflict).length,
    severityCounts: codeCounts(entries.map((entry) => entry.severity)),
    sourceOwnerCounts: codeCounts(entries.map((entry) => entry.sourceOwner)),
    topBlockingReason,
    recommendedInspectionOrder,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.keys(value as Record<string, unknown>)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function stableSnapshotWatermark(content: unknown): string {
  return `single-site-publish-operator-diagnostic-snapshot:${createHash("sha256").update(canonicalJson(content)).digest("hex")}`;
}

function safeSnapshotString(value: string | null | undefined): string | null {
  const normalized = safeRunbookRef(value);
  if (!normalized || normalized === UNKNOWN_REF) return null;
  return normalized;
}

function safeSnapshotReference(input: SingleSitePublishOperatorSafeReference): SingleSitePublishOperatorSafeReference {
  return {
    key: safeCode(input.key) ?? "unknown_ref",
    label: safeText(input.label),
    ref: safeSnapshotString(input.ref),
    sourceOwner: input.sourceOwner,
    boundaryLabel: input.boundaryLabel,
    sourceWatermark: safeSnapshotString(input.sourceWatermark),
  };
}

function safeSnapshotReferences(model: Omit<SingleSitePublishOperatorReadonlyProjection, "diagnosticSnapshot">): SingleSitePublishOperatorSafeReference[] {
  return [
    safeSnapshotReference({
      key: "launch_readiness_record",
      label: "Launch readiness record ref",
      ref: model.launchReadiness.recordRef,
      sourceOwner: "launch_readiness",
      boundaryLabel: "source-owned read",
      sourceWatermark: model.launchReadiness.sourceWatermark,
    }),
    safeSnapshotReference({
      key: "launch_readiness_evidence",
      label: "Launch readiness evidence ref",
      ref: model.launchReadiness.evidencePackageRef ?? model.governedPublishChain.launchReadinessEvidence.ref,
      sourceOwner: "launch_readiness",
      boundaryLabel: "source-owned read",
      sourceWatermark: model.launchReadiness.evidenceWatermark,
    }),
    safeSnapshotReference({
      key: "publish_activation_request",
      label: "Publish activation request ref",
      ref: model.publishActivationRequest.ref ?? model.governedPublishChain.publishActivationRequest.ref,
      sourceOwner: "publish_activation_request",
      boundaryLabel: "source-owned read",
      sourceWatermark: null,
    }),
    safeSnapshotReference({
      key: "publish_activation_decision",
      label: "Publish activation decision ref",
      ref: model.publishActivationDecision.ref ?? model.governedPublishChain.publishActivationDecision.ref,
      sourceOwner: "publish_activation_decision",
      boundaryLabel: "source-owned read",
      sourceWatermark: null,
    }),
    safeSnapshotReference({
      key: "gate_result",
      label: "Gate result ref",
      ref: model.gateHandoffEvaluation.gateResultRef ?? model.governedPublishChain.gateResult.ref,
      sourceOwner: "gate_evaluation",
      boundaryLabel: "source-owned read",
      sourceWatermark: model.gateHandoffEvaluation.gateInputWatermark ?? model.governedPublishChain.gateInputWatermark,
    }),
    safeSnapshotReference({
      key: "candidate_site_version",
      label: "Candidate version ref",
      ref: model.publishContext.candidateSiteVersionRef,
      sourceOwner: "runtime_candidate",
      boundaryLabel: "derived-only",
      sourceWatermark: null,
    }),
    safeSnapshotReference({
      key: "runtime_artifact",
      label: "Runtime artifact ref",
      ref: model.publishContext.runtimeArtifactRef,
      sourceOwner: "runtime_candidate",
      boundaryLabel: "derived-only",
      sourceWatermark: null,
    }),
    safeSnapshotReference({
      key: "publish_target",
      label: "Publish target ref",
      ref: model.publishContext.publishTargetRef,
      sourceOwner: "publish_target",
      boundaryLabel: "source-owned read",
      sourceWatermark: null,
    }),
    safeSnapshotReference({
      key: "latest_dry_run_audit",
      label: "Latest dry-run audit ref",
      ref: model.operatorAudit.latestDryRunActionId,
      sourceOwner: "operator_audit",
      boundaryLabel: "source-owned read",
      sourceWatermark: model.latestDryRun?.gateInputWatermark ?? null,
    }),
    safeSnapshotReference({
      key: "latest_shadow_publish_audit",
      label: "Latest shadow-publish audit ref",
      ref: model.operatorAudit.latestShadowPublishActionId,
      sourceOwner: "operator_audit",
      boundaryLabel: "source-owned read",
      sourceWatermark: model.latestShadowPublish?.gateInputWatermark ?? null,
    }),
  ].sort((left, right) => left.key.localeCompare(right.key));
}

function sourceWatermarksFromSafeReferences(refs: readonly SingleSitePublishOperatorSafeReference[]): Record<string, string> {
  return refs.reduce<Record<string, string>>((acc, ref) => {
    if (ref.sourceWatermark) acc[ref.key] = ref.sourceWatermark;
    return acc;
  }, {});
}

function sanitizeSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeSnapshotValue);
  }
  if (!value || typeof value !== "object" || value instanceof Date) {
    if (typeof value === "string" && UNSAFE_VALUE.test(value)) return "redacted";
    return value;
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (UNSAFE_KEY.test(key)) {
      acc[key] = "redacted";
      return acc;
    }
    acc[key] = sanitizeSnapshotValue(entry);
    return acc;
  }, {});
}

export function buildSingleSitePublishOperatorDiagnosticSnapshot(
  model: Omit<SingleSitePublishOperatorReadonlyProjection, "diagnosticSnapshot">,
  input: { snapshotGeneratedAt?: string | null } = {},
): SingleSitePublishOperatorDiagnosticSnapshot {
  const safeReferences = safeSnapshotReferences(model);
  const freshnessMissingStaleSummary = {
    staleCount: model.runbookSummary.staleEntries,
    missingCount: model.runbookSummary.missingEntries,
    conflictCount: model.runbookSummary.conflictEntries,
    staleCodes: codeList(model.runbookEntries.filter((entry) => entry.stale).map((entry) => entry.code), model.launchReadiness.staleDimensions),
    missingCodes: codeList(model.runbookEntries.filter((entry) => entry.missing).map((entry) => entry.code), model.staleOrMissingMetadataIndicators),
    conflictCodes: codeList(model.runbookEntries.filter((entry) => entry.conflict).map((entry) => entry.code), model.metadataResolver.expectedResolvedMismatchCodes),
  };
  const semanticSnapshot = {
    snapshotVersion: SINGLE_SITE_PUBLISH_OPERATOR_DIAGNOSTIC_SNAPSHOT_VERSION,
    sourceWatermarks: sourceWatermarksFromSafeReferences(safeReferences),
    flags: {
      readOnly: true,
      exportSafe: true,
      actionAvailable: false,
      publishes: false,
      runtimeMutation: false,
      enforcementApplied: false,
    },
    safeIdentity: {
      tenantId: safeSnapshotString(model.identity.tenantId),
      clientId: safeSnapshotString(model.identity.clientId),
      siteId: safeSnapshotString(model.identity.siteId),
      migrationId: safeSnapshotString(model.identity.migrationId),
    },
    lookup: {
      migrationId: safeSnapshotString(model.lookup.migrationId),
      siteId: safeSnapshotString(model.lookup.siteId),
      candidateSiteVersionRef: safeSnapshotString(model.lookup.candidateSiteVersionRef),
    },
    candidateArtifactPublishTargetRefs: {
      candidateSiteVersionRef: safeSnapshotString(model.publishContext.candidateSiteVersionRef),
      runtimeArtifactRef: safeSnapshotString(model.publishContext.runtimeArtifactRef),
      publishTargetRef: safeSnapshotString(model.publishContext.publishTargetRef),
      publishStage: safeSnapshotString(model.publishContext.publishStage),
      publishEnvironment: safeSnapshotString(model.publishContext.publishEnvironment),
    },
    launchReadinessSummary: {
      status: model.launchReadiness.status,
      freshnessStatus: model.launchReadiness.freshnessStatus,
      recordRef: safeSnapshotString(model.launchReadiness.recordRef),
      evidencePackageRef: safeSnapshotString(model.launchReadiness.evidencePackageRef),
      ready: model.launchReadiness.flags.ready,
      readyWithLimitations: model.launchReadiness.flags.readyWithLimitations,
      blocked: model.launchReadiness.flags.blocked,
      stale: model.launchReadiness.flags.stale,
      missing: model.launchReadiness.flags.missing,
      requiredMissingDimensions: model.launchReadiness.requiredMissingDimensions,
      staleDimensions: model.launchReadiness.staleDimensions,
      blockedDimensions: model.launchReadiness.blockedDimensions,
      acceptedLimitations: model.launchReadiness.acceptedLimitations,
      sourceLabel: "source-owned read" as const,
    },
    publishActivationRequestSummary: {
      ref: safeSnapshotString(model.publishActivationRequest.ref),
      status: model.publishActivationRequest.status,
      scope: safeSnapshotString(model.publishActivationRequest.scope),
      action: safeSnapshotString(model.publishActivationRequest.action),
      subjectType: safeSnapshotString(model.publishActivationRequest.subjectType),
      linkedLaunchReadinessEvidenceRef: safeSnapshotString(model.publishActivationRequest.linkedLaunchReadinessEvidenceRef),
      evidenceRefs: model.publishActivationRequest.evidenceRefs.map(safeSnapshotString).filter((ref): ref is string => Boolean(ref)),
      sourceLabel: "source-owned read" as const,
    },
    publishActivationDecisionSummary: {
      ref: safeSnapshotString(model.publishActivationDecision.ref),
      status: model.publishActivationDecision.status,
      projection: model.publishActivationDecision.projection,
      granted: model.publishActivationDecision.granted,
      grantedWithLimitations: model.publishActivationDecision.grantedWithLimitations,
      rejected: model.publishActivationDecision.rejected,
      invalid: model.publishActivationDecision.invalid,
      revoked: model.publishActivationDecision.revoked,
      superseded: model.publishActivationDecision.superseded,
      expired: model.publishActivationDecision.expired,
      limitations: model.publishActivationDecision.limitations,
      indicators: model.publishActivationDecision.indicators,
      sourceLabel: "source-owned read" as const,
    },
    gateHandoffSummary: {
      handoffReadinessStatus: model.gateHandoffEvaluation.handoffReadinessStatus,
      gateResultRef: safeSnapshotString(model.gateHandoffEvaluation.gateResultRef),
      gateResultStatus: model.gateHandoffEvaluation.gateResultStatus,
      handoffWatermark: safeSnapshotString(model.governedPublishChain.handoffWatermark),
      gateInputWatermark: safeSnapshotString(model.gateHandoffEvaluation.gateInputWatermark ?? model.governedPublishChain.gateInputWatermark),
      gateBlockers: model.gateHandoffEvaluation.gateBlockers,
      gateWarnings: model.gateHandoffEvaluation.gateWarnings,
      newerConflict: model.gateHandoffEvaluation.newerConflict,
      stale: model.gateHandoffEvaluation.stale,
      mismatchIndicators: model.gateHandoffEvaluation.mismatchIndicators,
      sourceLabel: "source-owned read" as const,
    },
    metadataResolverSummary: {
      completenessStatus: model.metadataResolver.completenessStatus,
      missingMetadataCodes: model.metadataResolver.missingMetadataCodes,
      expectedResolvedMismatchCodes: model.metadataResolver.expectedResolvedMismatchCodes,
      safeDiagnostics: model.metadataResolver.safeDiagnostics,
      sourceLabel: "derived-only" as const,
    },
    auditSummary: {
      latestDryRunActionId: safeSnapshotString(model.operatorAudit.latestDryRunActionId),
      latestShadowPublishActionId: safeSnapshotString(model.operatorAudit.latestShadowPublishActionId),
      recentAttemptCount: model.operatorAudit.recentAttemptCount,
      latestDryRunStatus: model.latestDryRun?.status ?? null,
      latestShadowPublishStatus: model.latestShadowPublish?.status ?? null,
      persistedResultFlags: model.operatorAudit.persistedResultFlags,
      sourceLabel: "source-owned read" as const,
    },
    runbookSummary: model.runbookSummary,
    topBlockingReason: model.runbookSummary.topBlockingReason,
    recommendedInspectionOrder: model.runbookSummary.recommendedInspectionOrder,
    blockerCodes: model.blockerCodes,
    warningCodes: model.warningCodes,
    limitationCodes: model.limitationCodes,
    staleOrMissingMetadataIndicators: model.staleOrMissingMetadataIndicators,
    freshnessMissingStaleSummary,
    sourceLabels: {
      sourceOwnedReads: codeList("launch_readiness", "publish_activation_request", "publish_activation_decision", "gate_evaluation", "operator_audit", "publish_target") as SingleSitePublishOperatorRunbookSourceOwner[],
      derivedOnly: codeList("metadata_resolver", "runtime_candidate") as SingleSitePublishOperatorRunbookSourceOwner[],
    },
    safeReferences,
  };
  const sanitizedSemanticSnapshot = sanitizeSnapshotValue(semanticSnapshot) as Omit<
    SingleSitePublishOperatorDiagnosticSnapshot,
    "snapshotGeneratedAt" | "snapshotWatermark" | "exportSafeJsonPreview"
  >;
  const snapshotWatermark = stableSnapshotWatermark(sanitizedSemanticSnapshot);
  const snapshotGeneratedAt = input.snapshotGeneratedAt ?? model.generatedAt;
  const snapshot = {
    ...sanitizedSemanticSnapshot,
    snapshotGeneratedAt,
    snapshotWatermark,
    exportSafeJsonPreview: {
      ...sanitizedSemanticSnapshot,
      snapshotGeneratedAt,
      snapshotWatermark,
    },
  };
  return sanitizeSnapshotValue(snapshot) as SingleSitePublishOperatorDiagnosticSnapshot;
}

export function buildSingleSitePublishOperatorRunbook(input: {
  state: SingleSitePublishOperatorReadonlyProjection["state"];
  identity: SingleSitePublishOperatorReadonlyProjection["identity"];
  publishContext: SingleSitePublishOperatorReadonlyProjection["publishContext"];
  launch: SingleSitePublishOperatorReadonlyProjection["launchReadiness"];
  request: SingleSitePublishOperatorReadonlyProjection["publishActivationRequest"];
  decision: SingleSitePublishOperatorReadonlyProjection["publishActivationDecision"];
  gate: SingleSitePublishOperatorReadonlyProjection["gateHandoffEvaluation"];
  metadata: SingleSitePublishOperatorReadonlyProjection["metadataResolver"];
  operatorAudit: SingleSitePublishOperatorReadonlyProjection["operatorAudit"];
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  nextAction: SingleSitePublishOperatorNextAction;
}): { entries: SingleSitePublishOperatorRunbookEntry[]; summary: SingleSitePublishOperatorRunbookSummary } {
  const entries: SingleSitePublishOperatorRunbookEntry[] = [];
  const add = (entry: SingleSitePublishOperatorRunbookEntry) => entries.push(entry);
  const launchRefs = [input.launch.recordRef, input.launch.evidencePackageRef, input.launch.sourceWatermark, input.launch.evidenceWatermark];
  const requestRefs = [input.request.ref, input.request.linkedLaunchReadinessEvidenceRef, ...input.request.evidenceRefs];
  const decisionRefs = [input.decision.ref, ...input.decision.evidenceRefs];
  const gateRefs = [input.gate.gateResultRef, input.gate.handoffWatermark, input.gate.gateInputWatermark];

  if (input.state === "lookup_required") {
    add(runbookEntry({
      code: "RUNBOOK_LOOKUP_REQUIRED",
      severity: "info",
      sourceOwner: "unknown",
      title: "Lookup is required",
      diagnosticExplanation: "The panel has not loaded a publish-path projection because no lookup key was provided.",
      safeNextInspectionHint: "Inspect the Command Center URL query for migrationId, siteId, or candidateSiteVersionRef.",
      blocking: false,
      missing: true,
    }));
  }

  if (input.launch.flags.missing) {
    add(runbookEntry({
      code: "LAUNCH_READINESS_RECORD_MISSING",
      severity: "blocked",
      sourceOwner: "launch_readiness",
      title: "Launch readiness record is missing",
      diagnosticExplanation: "Publish readiness cannot be trusted until the launch readiness source row exists for this lookup.",
      safeNextInspectionHint: "Inspect the launch readiness source reader output for the selected migration, site, and candidate refs.",
      requiredUpstreamSource: "launch_readiness",
      missing: true,
      relatedSafeRefs: launchRefs,
    }));
  }
  if (input.launch.flags.blocked) {
    add(runbookEntry({
      code: "LAUNCH_READINESS_BLOCKED",
      severity: "blocked",
      sourceOwner: "launch_readiness",
      title: "Launch readiness is blocked",
      diagnosticExplanation: "One or more launch readiness dimensions or source blockers prevents publish readiness.",
      safeNextInspectionHint: "Inspect open launch readiness blockers and blocked dimension rows before reviewing approval state.",
      requiredUpstreamSource: "launch_readiness",
      relatedSafeRefs: launchRefs,
      relatedSafeCodes: [input.launch.blockedDimensions, input.launch.openBlockers.map((blocker) => blocker.category)],
    }));
  }
  if (input.launch.flags.stale) {
    add(runbookEntry({
      code: "LAUNCH_READINESS_STALE",
      severity: "blocked",
      sourceOwner: "launch_readiness",
      title: "Launch readiness is stale",
      diagnosticExplanation: "The launch readiness source is stale, so current publish safety cannot be inferred from it.",
      safeNextInspectionHint: "Inspect freshness status and source watermarks for stale launch readiness dimensions.",
      requiredUpstreamSource: "launch_readiness",
      stale: true,
      relatedSafeRefs: launchRefs,
      relatedSafeCodes: input.launch.staleDimensions,
    }));
  }
  if (input.launch.requiredMissingDimensions.length > 0) {
    add(runbookEntry({
      code: "LAUNCH_REQUIRED_DIMENSIONS_MISSING",
      severity: "blocked",
      sourceOwner: "launch_readiness",
      title: "Required launch readiness dimensions are missing",
      diagnosticExplanation: "The readiness record is incomplete because required dimensions are absent.",
      safeNextInspectionHint: "Inspect missing required dimension rows and their source refs in launch readiness.",
      requiredUpstreamSource: "launch_readiness",
      missing: true,
      relatedSafeRefs: launchRefs,
      relatedSafeCodes: input.launch.requiredMissingDimensions,
    }));
  }
  if (input.launch.openBlockers.some((blocker) => /^p0/i.test(blocker.severity) && blocker.status === "open")) {
    add(runbookEntry({
      code: "LAUNCH_P0_BLOCKER_OPEN",
      severity: "critical",
      sourceOwner: "launch_readiness",
      title: "Open P0 launch blocker",
      diagnosticExplanation: "A P0 launch readiness blocker is open; publish readiness must be treated as unsafe.",
      safeNextInspectionHint: "Inspect the P0 launch readiness blocker category and source-owned blocker row.",
      requiredUpstreamSource: "launch_readiness",
      relatedSafeRefs: launchRefs,
      relatedSafeCodes: input.launch.openBlockers.filter((blocker) => /^p0/i.test(blocker.severity)).map((blocker) => blocker.category),
    }));
  }
  if (input.launch.flags.readyWithLimitations) {
    add(runbookEntry({
      code: "LAUNCH_READY_WITH_LIMITATIONS",
      severity: "warning",
      sourceOwner: "launch_readiness",
      title: "Launch readiness has accepted limitations",
      diagnosticExplanation: "Launch readiness is not fully clean; limitations are accepted in the source state but should be understood before publish.",
      safeNextInspectionHint: "Inspect accepted limitation codes and linked launch readiness evidence.",
      requiredUpstreamSource: "launch_readiness",
      blocking: false,
      relatedSafeRefs: launchRefs,
      relatedSafeCodes: input.launch.acceptedLimitations,
    }));
  }

  if (!input.request.id) {
    add(runbookEntry({
      code: "PUBLISH_ACTIVATION_REQUEST_MISSING",
      severity: "blocked",
      sourceOwner: "publish_activation_request",
      title: "Publish activation request is missing",
      diagnosticExplanation: "Publish activation cannot proceed without a source-owned approval request for this site version.",
      safeNextInspectionHint: "Inspect AAF approval request reads for publish_activation scope and site_version subject.",
      requiredUpstreamSource: "publish_activation_request",
      missing: true,
      relatedSafeRefs: requestRefs,
    }));
  } else {
    if (["requested", "pending", "open", "submitted"].includes(input.request.status)) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_REQUEST_PENDING",
        severity: "warning",
        sourceOwner: "publish_activation_request",
        title: "Publish activation request is pending",
        diagnosticExplanation: "The request exists but has not produced a usable granted decision yet.",
        safeNextInspectionHint: "Inspect the request status, requested expiration, and linked evidence refs.",
        requiredUpstreamSource: "publish_activation_decision",
        blocking: !input.decision.granted && !input.decision.grantedWithLimitations,
        relatedSafeRefs: requestRefs,
      }));
    }
    if (input.request.scope !== "publish_activation" || input.request.action !== "publish.activation" || input.request.subjectType !== "site_version") {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_REQUEST_SCOPE_MISMATCH",
        severity: "blocked",
        sourceOwner: "publish_activation_request",
        title: "Publish activation request has the wrong scope",
        diagnosticExplanation: "The request row does not match the expected publish activation scope, action, or subject type.",
        safeNextInspectionHint: "Inspect request scope, action_key, subject_type, and subject_id against the selected candidate.",
        requiredUpstreamSource: "publish_activation_request",
        conflict: true,
        relatedSafeRefs: requestRefs,
        relatedSafeCodes: [input.request.scope, input.request.action, input.request.subjectType],
      }));
    }
    if (!input.request.linkedLaunchReadinessEvidenceRef || input.request.evidenceRefs.length === 0) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_REQUEST_EVIDENCE_MISSING",
        severity: "blocked",
        sourceOwner: "publish_activation_request",
        title: "Publish activation request is missing linked evidence",
        diagnosticExplanation: "The request does not carry the launch readiness evidence refs needed for safe interpretation.",
        safeNextInspectionHint: "Inspect approval evidence link rows for the request and launch readiness evidence package.",
        requiredUpstreamSource: "launch_readiness",
        missing: true,
        relatedSafeRefs: requestRefs,
      }));
    }
  }

  if (!input.decision.id) {
    add(runbookEntry({
      code: "PUBLISH_ACTIVATION_DECISION_MISSING",
      severity: "blocked",
      sourceOwner: "publish_activation_decision",
      title: "Publish activation decision is missing",
      diagnosticExplanation: "No granted publish activation decision is available for the current request.",
      safeNextInspectionHint: "Inspect AAF approval decision reads for the linked publish activation request.",
      requiredUpstreamSource: "publish_activation_decision",
      missing: true,
      relatedSafeRefs: decisionRefs,
    }));
  } else {
    if (input.decision.rejected) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_DECISION_REJECTED",
        severity: "blocked",
        sourceOwner: "publish_activation_decision",
        title: "Publish activation decision was rejected",
        diagnosticExplanation: "The source-owned decision explicitly rejects publish activation.",
        safeNextInspectionHint: "Inspect decision status, decision evidence refs, and rejection-safe indicator codes.",
        requiredUpstreamSource: "publish_activation_decision",
        relatedSafeRefs: decisionRefs,
      }));
    }
    if (input.decision.revoked) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_DECISION_REVOKED",
        severity: "blocked",
        sourceOwner: "publish_activation_decision",
        title: "Publish activation decision was revoked",
        diagnosticExplanation: "A revoked decision cannot be used to establish publish readiness.",
        safeNextInspectionHint: "Inspect the decision revocation indicator and linked decision ref.",
        requiredUpstreamSource: "publish_activation_decision",
        conflict: true,
        relatedSafeRefs: decisionRefs,
        relatedSafeCodes: input.decision.indicators,
      }));
    }
    if (input.decision.superseded) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_DECISION_SUPERSEDED",
        severity: "blocked",
        sourceOwner: "publish_activation_decision",
        title: "Publish activation decision was superseded",
        diagnosticExplanation: "A superseded decision is not the active source-owned approval for publish activation.",
        safeNextInspectionHint: "Inspect supersession indicators and locate the current decision in AAF reads.",
        requiredUpstreamSource: "publish_activation_decision",
        conflict: true,
        relatedSafeRefs: decisionRefs,
        relatedSafeCodes: input.decision.indicators,
      }));
    }
    if (input.decision.expired) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_DECISION_EXPIRED",
        severity: "blocked",
        sourceOwner: "publish_activation_decision",
        title: "Publish activation decision expired",
        diagnosticExplanation: "The approval decision is outside its validity window and cannot establish readiness.",
        safeNextInspectionHint: "Inspect decision expiration timestamp and current generatedAt timestamp.",
        requiredUpstreamSource: "publish_activation_decision",
        stale: true,
        relatedSafeRefs: [...decisionRefs, input.decision.expiresAt],
        relatedSafeCodes: input.decision.indicators,
      }));
    }
    if (input.decision.grantedWithLimitations) {
      add(runbookEntry({
        code: "PUBLISH_ACTIVATION_GRANTED_WITH_LIMITATIONS",
        severity: "warning",
        sourceOwner: "publish_activation_decision",
        title: "Publish activation was granted with limitations",
        diagnosticExplanation: "The decision is granted, but limitations should be inspected before interpreting readiness as clean.",
        safeNextInspectionHint: "Inspect decision limitation codes and linked evidence refs.",
        requiredUpstreamSource: "publish_activation_decision",
        blocking: false,
        relatedSafeRefs: decisionRefs,
        relatedSafeCodes: input.decision.limitations,
      }));
    }
  }

  if (!input.gate.gateResultId) {
    add(runbookEntry({
      code: "GATE_RESULT_MISSING",
      severity: "blocked",
      sourceOwner: "gate_evaluation",
      title: "Gate result is missing",
      diagnosticExplanation: "No persisted gate result is available for the current publish activation chain.",
      safeNextInspectionHint: "Inspect AAF action gate attempt reads and gate input watermark refs.",
      requiredUpstreamSource: "gate_evaluation",
      missing: true,
      relatedSafeRefs: gateRefs,
    }));
  }
  if (input.gate.gateResultId && (input.gate.gateBlockers.length > 0 || !["allowed", "warning", "allowed_with_warnings"].includes(input.gate.gateResultStatus))) {
    add(runbookEntry({
      code: "GATE_EVALUATION_BLOCKED",
      severity: "blocked",
      sourceOwner: "gate_evaluation",
      title: "Gate evaluation is blocked",
      diagnosticExplanation: "The persisted gate result or policy evaluation contains blockers.",
      safeNextInspectionHint: "Inspect gate blocker codes, policy evaluation ref, and gate result status.",
      requiredUpstreamSource: "gate_evaluation",
      relatedSafeRefs: gateRefs,
      relatedSafeCodes: [input.gate.gateBlockers, input.gate.gateResultStatus],
    }));
  }
  if (input.gate.stale) {
    add(runbookEntry({
      code: "GATE_EVALUATION_STALE",
      severity: "blocked",
      sourceOwner: "gate_evaluation",
      title: "Gate evaluation is stale",
      diagnosticExplanation: "The gate result is marked stale and may not describe current publish activation inputs.",
      safeNextInspectionHint: "Inspect gate timestamps and source watermarks for the selected gate attempt.",
      requiredUpstreamSource: "gate_evaluation",
      stale: true,
      relatedSafeRefs: gateRefs,
    }));
  }
  if (input.gate.gateWarnings.length > 0) {
    add(runbookEntry({
      code: "GATE_WARNING_WITH_LIMITATIONS",
      severity: "warning",
      sourceOwner: "gate_evaluation",
      title: "Gate evaluation has warnings",
      diagnosticExplanation: "The gate did not hard-block, but warning codes limit how readiness should be interpreted.",
      safeNextInspectionHint: "Inspect gate warning codes alongside launch and decision limitations.",
      requiredUpstreamSource: "gate_evaluation",
      blocking: false,
      relatedSafeRefs: gateRefs,
      relatedSafeCodes: input.gate.gateWarnings,
    }));
  }
  if (input.gate.newerConflict) {
    add(runbookEntry({
      code: "GATE_NEWER_CONFLICT",
      severity: "critical",
      sourceOwner: "gate_evaluation",
      title: "Newer gate conflict exists",
      diagnosticExplanation: "A newer persisted gate attempt exists for the activation scope, so the current gate result may be superseded.",
      safeNextInspectionHint: "Inspect newer gate conflict rows and compare safe gate refs/watermarks.",
      requiredUpstreamSource: "gate_evaluation",
      conflict: true,
      relatedSafeRefs: gateRefs,
      relatedSafeCodes: ["publish_activation_gate_conflict"],
    }));
  }
  if (input.gate.mismatchIndicators.length > 0 || (input.gate.handoffWatermark && input.gate.gateInputWatermark && input.gate.handoffWatermark !== input.gate.gateInputWatermark)) {
    add(runbookEntry({
      code: "GATE_HANDOFF_WATERMARK_MISMATCH",
      severity: "critical",
      sourceOwner: "gate_evaluation",
      title: "Gate handoff watermark mismatch",
      diagnosticExplanation: "Gate metadata does not line up with the current request, decision, evidence, or handoff watermark.",
      safeNextInspectionHint: "Inspect gate mismatch indicators, handoff watermark, and gate input watermark together.",
      requiredUpstreamSource: "gate_evaluation",
      conflict: true,
      relatedSafeRefs: gateRefs,
      relatedSafeCodes: input.gate.mismatchIndicators,
    }));
  }

  const runtimeMissing = input.metadata.missingMetadataCodes.filter((code) => code.includes("candidate_site_version") || code.includes("runtime_artifact"));
  const targetMissing = input.metadata.missingMetadataCodes.filter((code) => code.includes("publish_target"));
  if (runtimeMissing.length > 0) {
    add(runbookEntry({
      code: "RUNTIME_CANDIDATE_METADATA_MISSING",
      severity: "blocked",
      sourceOwner: "runtime_candidate",
      title: "Runtime candidate metadata is missing",
      diagnosticExplanation: "Candidate site version or runtime artifact refs are missing from the safe projection.",
      safeNextInspectionHint: "Inspect candidate site version and runtime artifact refs in the metadata resolver section.",
      requiredUpstreamSource: "runtime_candidate",
      missing: true,
      relatedSafeRefs: [input.publishContext.candidateSiteVersionRef, input.publishContext.runtimeArtifactRef],
      relatedSafeCodes: runtimeMissing,
    }));
  }
  if (targetMissing.length > 0) {
    add(runbookEntry({
      code: "PUBLISH_TARGET_METADATA_MISSING",
      severity: "blocked",
      sourceOwner: "publish_target",
      title: "Publish target metadata is missing",
      diagnosticExplanation: "The publish target ref is missing, so the panel cannot safely interpret target readiness.",
      safeNextInspectionHint: "Inspect publish target source truth reads and the publish target ref.",
      requiredUpstreamSource: "publish_target",
      missing: true,
      relatedSafeRefs: [input.publishContext.publishTargetRef],
      relatedSafeCodes: targetMissing,
    }));
  }
  if (input.metadata.completenessStatus === "incomplete") {
    add(runbookEntry({
      code: "METADATA_RESOLVER_INCOMPLETE",
      severity: "blocked",
      sourceOwner: "metadata_resolver",
      title: "Metadata resolver is incomplete",
      diagnosticExplanation: "Required publish activation metadata is missing or inconsistent in the read-only projection.",
      safeNextInspectionHint: "Inspect missing metadata codes and resolver detail rows before reading audit outcomes.",
      requiredUpstreamSource: "metadata_resolver",
      missing: input.metadata.missingMetadataCodes.length > 0,
      conflict: input.metadata.expectedResolvedMismatchCodes.length > 0,
      relatedSafeCodes: [input.metadata.missingMetadataCodes, input.metadata.expectedResolvedMismatchCodes],
    }));
  }
  if (!input.identity.tenantId || !input.identity.clientId || !input.identity.siteId || !input.publishContext.candidateSiteVersionRef) {
    add(runbookEntry({
      code: "METADATA_STRICT_IDENTITY_MISSING",
      severity: "blocked",
      sourceOwner: "metadata_resolver",
      title: "Strict identity metadata is missing",
      diagnosticExplanation: "Tenant, client, site, or candidate identity is incomplete, making cross-source interpretation unsafe.",
      safeNextInspectionHint: "Inspect identity and target fields for missing tenant/client/site/candidate refs.",
      requiredUpstreamSource: "metadata_resolver",
      missing: true,
      relatedSafeRefs: [input.identity.tenantId, input.identity.clientId, input.identity.siteId, input.publishContext.candidateSiteVersionRef],
    }));
  }
  if (input.metadata.expectedResolvedMismatchCodes.length > 0) {
    add(runbookEntry({
      code: "METADATA_EXPECTED_REF_MISMATCH",
      severity: "critical",
      sourceOwner: "metadata_resolver",
      title: "Expected ref mismatch",
      diagnosticExplanation: "Resolved metadata conflicts with expected publish activation refs.",
      safeNextInspectionHint: "Inspect expected/resolved mismatch codes and compare only safe refs in the panel.",
      requiredUpstreamSource: "metadata_resolver",
      conflict: true,
      relatedSafeCodes: input.metadata.expectedResolvedMismatchCodes,
    }));
  }
  if (input.metadata.missingMetadataCodes.some((code) => code.includes("read_failure") || code.includes("source_table_unavailable"))) {
    add(runbookEntry({
      code: "METADATA_RESOLVER_READ_FAILURE",
      severity: "blocked",
      sourceOwner: "metadata_resolver",
      title: "Metadata resolver read failed",
      diagnosticExplanation: "A read-only source projection failed or a source table was unavailable.",
      safeNextInspectionHint: "Inspect resolver read failure codes and database read availability without retrying from this panel.",
      requiredUpstreamSource: "metadata_resolver",
      relatedSafeCodes: input.metadata.missingMetadataCodes,
    }));
  }

  if (!input.latestDryRun) {
    add(runbookEntry({
      code: "AUDIT_DRY_RUN_NOT_RECORDED",
      severity: "warning",
      sourceOwner: "operator_audit",
      title: "No dry-run is recorded yet",
      diagnosticExplanation: "The operator audit history has no persisted dry-run attempt for this lookup.",
      safeNextInspectionHint: "Inspect audit timeline and source refs to confirm whether a dry-run record should exist.",
      requiredUpstreamSource: "operator_audit",
      blocking: false,
      missing: true,
    }));
  } else if (input.latestDryRun.status.includes("failed") || input.latestDryRun.resultStatus.includes("failed") || input.latestDryRun.resultStatus.includes("preflight_blocked")) {
    add(runbookEntry({
      code: "AUDIT_LATEST_DRY_RUN_FAILED",
      severity: "blocked",
      sourceOwner: "operator_audit",
      title: "Latest dry-run failed",
      diagnosticExplanation: "The latest persisted dry-run did not complete readiness checks successfully.",
      safeNextInspectionHint: "Inspect latest dry-run blocker codes, wrapper status, resolver status, and redacted diagnostic codes.",
      requiredUpstreamSource: "operator_audit",
      relatedSafeRefs: [input.latestDryRun.actionId, input.latestDryRun.correlationId],
      relatedSafeCodes: [input.latestDryRun.blockerCodes, input.latestDryRun.redactedDiagnosticSummary.reasonCodes],
    }));
  }
  if (input.nextAction === "shadow_publish_available" && !input.latestShadowPublish) {
    add(runbookEntry({
      code: "AUDIT_SHADOW_PUBLISH_AVAILABLE_NOT_RUN",
      severity: "info",
      sourceOwner: "operator_audit",
      title: "Shadow publish is available but not recorded",
      diagnosticExplanation: "The read-only projection indicates shadow publish could be a future upstream action, but this panel provides no action control.",
      safeNextInspectionHint: "Inspect the latest dry-run and governed publish chain before using any external source-owned workflow.",
      requiredUpstreamSource: "operator_audit",
      blocking: false,
      relatedSafeRefs: [input.latestDryRun?.actionId],
    }));
  }
  if (input.latestShadowPublish && input.latestShadowPublish.status !== "shadow_publish_completed") {
    add(runbookEntry({
      code: "AUDIT_LATEST_SHADOW_PUBLISH_FAILED",
      severity: "blocked",
      sourceOwner: "operator_audit",
      title: "Latest shadow publish did not complete",
      diagnosticExplanation: "The latest persisted shadow-publish attempt is not completed and needs audit inspection.",
      safeNextInspectionHint: "Inspect shadow-publish blocker codes, wrapper status, and redacted diagnostic codes.",
      requiredUpstreamSource: "operator_audit",
      relatedSafeRefs: [input.latestShadowPublish.actionId, input.latestShadowPublish.correlationId],
      relatedSafeCodes: [input.latestShadowPublish.blockerCodes, input.latestShadowPublish.redactedDiagnosticSummary.reasonCodes],
    }));
  }
  if (input.latestShadowPublish?.status === "shadow_publish_completed") {
    add(runbookEntry({
      code: "AUDIT_SHADOW_PUBLISH_COMPLETED",
      severity: "info",
      sourceOwner: "operator_audit",
      title: "Latest shadow publish completed",
      diagnosticExplanation: "The latest persisted shadow publish completed; this is evidence only and does not create an action in the panel.",
      safeNextInspectionHint: "Inspect completed shadow-publish audit refs if final publish readiness needs evidence review.",
      requiredUpstreamSource: "operator_audit",
      blocking: false,
      relatedSafeRefs: [input.latestShadowPublish.actionId, input.latestShadowPublish.correlationId],
    }));
  }
  if (input.operatorAudit.persistedResultFlags.anyRuntimeMutationFlag || input.operatorAudit.persistedResultFlags.anyBlockingEnforcementAppliedFlag) {
    add(runbookEntry({
      code: "AUDIT_PERSISTED_MUTATION_FLAG_PRESENT",
      severity: "critical",
      sourceOwner: "operator_audit",
      title: "Persisted audit mutation flag is present",
      diagnosticExplanation: "A persisted audit record carries a runtime mutation or enforcement flag; the panel remains read-only, but the audit source needs inspection.",
      safeNextInspectionHint: "Inspect latest audit attempts and persisted result flags without using this panel for any action.",
      requiredUpstreamSource: "operator_audit",
      conflict: true,
      relatedSafeCodes: [
        input.operatorAudit.persistedResultFlags.anyRuntimeMutationFlag ? "runtime_mutation_flag_present" : null,
        input.operatorAudit.persistedResultFlags.anyBlockingEnforcementAppliedFlag ? "blocking_enforcement_flag_present" : null,
      ],
    }));
  }

  const sortedEntries = sortRunbookEntries(entries);
  return { entries: sortedEntries, summary: buildRunbookSummary(sortedEntries) };
}

function deriveNextAction(input: {
  state: SingleSitePublishOperatorReadonlyProjection["state"];
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  launch: SingleSitePublishOperatorReadonlyProjection["launchReadiness"];
  request: SingleSitePublishOperatorReadonlyProjection["publishActivationRequest"];
  decision: SingleSitePublishOperatorReadonlyProjection["publishActivationDecision"];
  gate: SingleSitePublishOperatorReadonlyProjection["gateHandoffEvaluation"];
  metadata: SingleSitePublishOperatorReadonlyProjection["metadataResolver"];
  blockerCodes: readonly string[];
  missingMetadata: readonly string[];
  hasSourceRows: boolean;
}): SingleSitePublishOperatorNextAction {
  if (input.state === "lookup_required") return "collect_launch_readiness_evidence";
  if (!input.hasSourceRows) {
    const shadowStatus = text(input.latestShadowPublish?.status);
    if (input.state === "empty") return "run_internal_dry_run";
    if (shadowStatus === "shadow_publish_completed") return "no_action";
    if (shadowStatus && shadowStatus !== "shadow_publish_completed") return "review_shadow_publish_failure";
    if (input.missingMetadata.some((code) => code.includes("launch_readiness"))) return "collect_launch_readiness_evidence";
    if (input.missingMetadata.some((code) => code.includes("publish_activation_decision"))) return "await_publish_activation_decision";
    if (!input.latestDryRun) return "run_internal_dry_run";
    if (input.blockerCodes.length > 0) return "resolve_gate_blockers";
    if (!input.latestShadowPublish && input.latestDryRun.status === "dry_run_completed") return "shadow_publish_available";
    return "run_internal_dry_run";
  }
  if (input.launch.flags.missing) return "collect_launch_readiness_evidence";
  if (input.launch.flags.blocked || input.launch.flags.stale || input.launch.requiredMissingDimensions.length > 0) return "resolve_launch_readiness_blockers";
  if (!input.request.id) return "request_publish_activation_approval";
  if (!input.decision.id) return "await_publish_activation_decision";
  if (input.decision.rejected || input.decision.invalid || input.decision.revoked || input.decision.superseded || input.decision.expired) return "review_rejected_publish_activation";
  if (input.gate.handoffReadinessStatus === "handoff_blocked") return "prepare_gate_evaluation";
  if (!input.gate.gateResultId) return "prepare_gate_evaluation";
  if (input.gate.gateBlockers.length > 0 || input.gate.gateResultStatus !== "allowed" || input.gate.newerConflict || input.gate.mismatchIndicators.length > 0 || input.metadata.expectedResolvedMismatchCodes.length > 0) {
    return "resolve_gate_blockers";
  }
  if (!input.latestDryRun) return "run_internal_dry_run";
  if (input.blockerCodes.length > 0) return "resolve_gate_blockers";
  if (!input.latestShadowPublish && input.latestDryRun.status === "dry_run_completed") return "shadow_publish_available";
  if (input.latestShadowPublish && input.latestShadowPublish.status !== "shadow_publish_completed") return "review_shadow_publish_failure";
  if (input.latestShadowPublish?.status === "shadow_publish_completed") return "no_action";
  return "run_internal_dry_run";
}

function readinessState(input: {
  state: SingleSitePublishOperatorReadonlyProjection["state"];
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null;
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null;
  blockerCodes: readonly string[];
  missingMetadata: readonly string[];
  launch: SingleSitePublishOperatorReadonlyProjection["launchReadiness"];
  gate: SingleSitePublishOperatorReadonlyProjection["gateHandoffEvaluation"];
}): SingleSitePublishOperatorReadonlyProjection["readinessState"] {
  if (input.state !== "visible") return "unknown";
  if (input.launch.flags.blocked || input.launch.flags.stale || input.blockerCodes.length > 0 || input.missingMetadata.length > 0 || input.gate.gateBlockers.length > 0) return "blocked";
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

function sourceIdentity(
  snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined,
  primaryRow: SingleSitePublishOperatorActionAuditRow | null,
): SingleSitePublishOperatorReadonlyProjection["identity"] {
  const readiness = snapshot?.launchReadinessRecord;
  const request = snapshot?.publishActivationRequest;
  const gate = snapshot?.gateAttempt;
  return {
    tenantId: rowText(readiness, "tenant_id") ?? rowText(request, "tenant_id") ?? rowText(gate, "tenant_id") ?? (primaryRow ? safeText(primaryRow.tenant_id, UNKNOWN_REF) : null),
    clientId: rowText(readiness, "client_id") ?? rowText(request, "client_id") ?? rowText(gate, "client_id") ?? (primaryRow ? safeText(primaryRow.client_id, UNKNOWN_REF) : null),
    siteId: rowText(readiness, "site_id") ?? rowText(request, "site_id") ?? rowText(gate, "site_id") ?? (primaryRow ? safeText(primaryRow.site_id, UNKNOWN_REF) : null),
    migrationId: rowText(readiness, "migration_id") ?? (primaryRow ? safeText(primaryRow.migration_id, UNKNOWN_REF) : null),
  };
}

function sourcePublishContext(
  snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined,
  primary: SingleSitePublishOperatorActionAttemptProjection | null,
): SingleSitePublishOperatorReadonlyProjection["publishContext"] {
  const readiness = snapshot?.launchReadinessRecord;
  const target = snapshot?.publishTarget;
  const evidencePayload = rowJsonObject(snapshot?.launchReadinessEvidencePackage, "limitations_json");
  const sourceRefs = jsonObject(evidencePayload.sourceRefs);
  const candidateRef = jsonObject(jsonArray(sourceRefs.improved_candidate_site_version)[0]);
  const artifactRef = jsonObject(jsonArray(sourceRefs.improved_runtime_artifact)[0]);
  return {
    candidateSiteVersionRef:
      rowText(readiness, "improved_candidate_site_version_ref") ??
      text(candidateRef.sourceRef) ??
      primary?.candidateSiteVersionRef ??
      null,
    runtimeArtifactRef:
      rowText(readiness, "improved_runtime_artifact_ref") ??
      text(artifactRef.sourceRef) ??
      primary?.runtimeArtifactRef ??
      null,
    publishTargetRef: sourceRef("gnr8:gnr8_publish_targets", rowText(target, "id")) ?? primary?.publishTargetRef ?? null,
    publishStage: rowText(target, "publish_stage") ?? primary?.publishStage ?? null,
    publishEnvironment: rowText(target, "environment") ?? primary?.publishEnvironment ?? null,
  };
}

function launchReadinessSection(snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined): SingleSitePublishOperatorReadonlyProjection["launchReadiness"] {
  const record = snapshot?.launchReadinessRecord ?? null;
  const evidence = snapshot?.launchReadinessEvidencePackage ?? null;
  const dimensions = snapshot?.launchReadinessDimensions ?? [];
  const blockers = snapshot?.launchReadinessBlockers ?? [];
  const status = rowText(record, "status") ?? "missing";
  const freshnessStatus = rowText(record, "freshness_status") ?? "missing";
  const missingDimensions = dimensions
    .filter((dimension) => booleanValue(dimension.required_for_launch_readiness) && rowText(dimension, "dimension_status") === "missing")
    .map((dimension) => rowSafeText(dimension, "dimension"));
  const staleDimensions = dimensions
    .filter((dimension) => rowText(dimension, "dimension_status") === "stale" || rowText(dimension, "freshness_status") === "stale")
    .map((dimension) => rowSafeText(dimension, "dimension"));
  const blockedDimensions = dimensions
    .filter((dimension) => rowText(dimension, "dimension_status") === "blocked")
    .map((dimension) => rowSafeText(dimension, "dimension"));
  const limitationValues = [
    ...rowJsonArray(record, "limitation_summary_json"),
    ...dimensions.flatMap((dimension) => rowJsonArray(dimension, "limitations_json")),
  ];
  const openBlockers = blockers
    .filter((blocker) => ["open", "accepted_limitation"].includes(rowText(blocker, "status") ?? "open"))
    .map((blocker) => ({
      severity: rowSafeText(blocker, "severity"),
      category: rowSafeText(blocker, "category"),
      status: rowSafeText(blocker, "status"),
      description: safeText(rowText(blocker, "description"), "available"),
    }));
  const readinessSummary = safeFreeformList([
    ...Object.values(rowJsonObject(record, "readiness_summary_json")),
    ...rowJsonArray(record, "blocker_summary_json"),
  ]);
  const dimensionDrilldown = dimensions.map((dimension) => {
    const group = groupForDimension(dimension);
    const dimensionName = rowSafeText(dimension, "dimension");
    return drilldownRow({
      id: rowText(dimension, "id") ?? dimensionName,
      group,
      label: dimensionName,
      status: rowText(dimension, "dimension_status") ?? "missing",
      freshnessStatus: rowText(dimension, "freshness_status") ?? "unknown",
      category: booleanValue(dimension.required_for_launch_readiness) ? "required" : "optional",
      code: dimensionName,
      ref: rowSourceRef(dimension),
      watermark: rowText(dimension, "semantic_source_watermark") ?? rowText(dimension, "source_watermark"),
      summary: safeStringList(rowJsonArray(dimension, "diagnostics_json")).join(", ") || rowText(dimension, "dimension_status") || group,
    });
  });
  const dimensionGroups = {
    ready: codeList(dimensionDrilldown.filter((dimension) => dimension.group === "ready").map((dimension) => dimension.code ?? dimension.label)),
    stale: codeList(dimensionDrilldown.filter((dimension) => dimension.group === "stale").map((dimension) => dimension.code ?? dimension.label)),
    missing: codeList(dimensionDrilldown.filter((dimension) => dimension.group === "missing").map((dimension) => dimension.code ?? dimension.label)),
    blocked: codeList(dimensionDrilldown.filter((dimension) => dimension.group === "blocked").map((dimension) => dimension.code ?? dimension.label)),
    optional: codeList(dimensionDrilldown.filter((dimension) => dimension.group === "optional").map((dimension) => dimension.code ?? dimension.label)),
  };

  return {
    boundary: SOURCE_OWNED_READ_BOUNDARY,
    recordId: rowText(record, "id"),
    recordRef: sourceRef("gnr8:gnr8_single_site_launch_readiness_records", rowText(record, "id")),
    status,
    freshnessStatus,
    sourceWatermark: rowText(record, "semantic_source_watermark"),
    readinessSummary,
    flags: {
      ready: status === "ready",
      readyWithLimitations: status === "ready_with_limitations",
      blocked: status === "blocked" || blockedDimensions.length > 0 || openBlockers.some((blocker) => blocker.status === "open"),
      stale: status === "stale" || freshnessStatus === "stale" || staleDimensions.length > 0,
      missing: !record,
    },
    requiredMissingDimensions: codeList(missingDimensions),
    staleDimensions: codeList(staleDimensions),
    blockedDimensions: codeList(blockedDimensions),
    acceptedLimitations: safeStringList(limitationValues),
    dimensionDrilldown,
    dimensionGroups,
    blockerCountBySeverity: codeCounts(openBlockers.map((blocker) => blocker.severity)),
    blockerCountByCategory: codeCounts(openBlockers.map((blocker) => blocker.category)),
    openBlockers,
    evidencePackageRef: sourceRef("aaf:evidence_package", rowText(evidence, "id")),
    evidencePackageStatus: rowText(evidence, "status") ?? "missing",
    evidenceWatermark: rowText(evidence, "source_watermark"),
  };
}

function publishActivationRequestSection(snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined): SingleSitePublishOperatorReadonlyProjection["publishActivationRequest"] {
  const request = snapshot?.publishActivationRequest ?? null;
  const evidenceLink = (snapshot?.publishActivationRequestEvidenceLinks ?? [])[0] ?? null;
  const policy = rowJsonObject(request, "policy_metadata_json");
  const evidenceRefs = codeList(
    (snapshot?.publishActivationRequestEvidenceLinks ?? []).map((link) => sourceRef("aaf:evidence_package", rowText(link, "evidence_package_id"))),
  );
  return {
    boundary: SOURCE_OWNED_READ_BOUNDARY,
    id: rowText(request, "id"),
    ref: sourceRef("aaf:approval_request", rowText(request, "id")),
    status: rowText(request, "status") ?? "missing",
    scope: rowText(request, "scope"),
    action: rowText(request, "action_key"),
    subjectType: rowText(request, "subject_type"),
    subjectId: rowText(request, "subject_id"),
    linkedLaunchReadinessEvidenceRef: sourceRef("aaf:evidence_package", rowText(evidenceLink, "evidence_package_id")),
    evidenceRefs,
    policyMetadata: {
      policyVersion: rowText(request, "policy_version") ?? text(policy.policyVersion),
      policyEvaluationId: rowText(request, "policy_evaluation_id") ?? text(policy.policyEvaluationId),
      requestedExpiresAt: rowText(request, "requested_expires_at"),
    },
  };
}

function publishActivationDecisionSection(
  snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined,
  generatedAt: string,
): SingleSitePublishOperatorReadonlyProjection["publishActivationDecision"] {
  const decision = snapshot?.publishActivationDecision ?? null;
  const status = rowText(decision, "status") ?? "missing";
  const revoked = booleanValue(decision?.revoked);
  const superseded = booleanValue(decision?.superseded);
  const expired = expiredAt(decision?.expires_at, generatedAt);
  const invalid = Boolean(decision && (!["granted", "granted_with_limitations", "rejected"].includes(status) || revoked || superseded || expired));
  const projection =
    status === "granted" && !invalid
      ? "granted"
      : status === "granted_with_limitations" && !invalid
        ? "granted_with_limitations"
        : status === "rejected"
          ? "rejected"
          : decision
            ? "invalid"
            : "missing";
  const limitations = safeStringList([
    ...rowJsonArray(decision, "limitation_summary_json"),
    ...rowJsonArray(decision, "limitations_json"),
  ]);
  const evidenceRefs = codeList(
    (snapshot?.publishActivationDecisionEvidenceLinks ?? []).map((link) => sourceRef("aaf:evidence_package", rowText(link, "evidence_package_id"))),
  );
  const indicators = codeList(
    revoked ? "decision_revoked" : null,
    superseded ? "decision_superseded" : null,
    expired ? "decision_expired" : null,
    invalid ? "decision_invalid" : null,
  );
  return {
    boundary: SOURCE_OWNED_READ_BOUNDARY,
    id: rowText(decision, "id"),
    ref: sourceRef("aaf:approval_decision", rowText(decision, "id")),
    status,
    projection,
    granted: projection === "granted",
    grantedWithLimitations: projection === "granted_with_limitations",
    rejected: projection === "rejected",
    invalid: projection === "invalid",
    revoked,
    superseded,
    expired,
    expiresAt: rowText(decision, "expires_at"),
    limitations,
    evidenceRefs,
    indicators,
  };
}

function gateInputWatermarkFromGate(row: SingleSitePublishOperatorSourceRow | null | undefined): string | null {
  const causationId = rowText(row, "causation_id");
  return causationId?.match(/single-site-publish-activation-gate-input:[0-9a-f]{64}/)?.[0] ?? null;
}

function gateSection(
  snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined,
  decision: SingleSitePublishOperatorReadonlyProjection["publishActivationDecision"],
  launch: SingleSitePublishOperatorReadonlyProjection["launchReadiness"],
): SingleSitePublishOperatorReadonlyProjection["gateHandoffEvaluation"] {
  const gate = snapshot?.gateAttempt ?? null;
  const policy = snapshot?.gatePolicyEvaluation ?? null;
  const gateResult = rowText(gate, "gate_result");
  const gateInputWatermark = gateInputWatermarkFromGate(gate);
  const policyBlockers = rowJsonArray(policy, "blocker_codes").map(String);
  const blockers = codeList(policyBlockers, rowJsonArray(policy, "fail_closed_reasons"), gateResult && gateResult !== "allowed" ? `gate_${gateResult}` : null);
  const warnings = codeList(rowJsonArray(policy, "warning_codes"), rowJsonArray(policy, "warnings"));
  const handoffReadinessStatus =
    decision.granted || decision.grantedWithLimitations
      ? launch.flags.ready || launch.flags.readyWithLimitations
        ? "handoff_ready"
        : "handoff_blocked"
      : gate || decision.id
        ? "handoff_blocked"
        : "missing";
  const mismatchIndicators = codeList(
    rowText(gate, "approval_request_id") && rowText(snapshot?.publishActivationRequest, "id") && rowText(gate, "approval_request_id") !== rowText(snapshot?.publishActivationRequest, "id")
      ? "gate_request_mismatch"
      : null,
    rowText(gate, "approval_decision_id") && decision.id && rowText(gate, "approval_decision_id") !== decision.id ? "gate_decision_mismatch" : null,
    rowText(gate, "evidence_package_id") && sourceId(launch.evidencePackageRef) && rowText(gate, "evidence_package_id") !== sourceId(launch.evidencePackageRef)
      ? "gate_evidence_mismatch"
      : null,
  );
  const conflictDetails = [
    ...mismatchIndicators.map((code) => drilldownRow({
      id: code,
      group: "blocked" as const,
      label: code,
      status: "mismatch",
      code,
      summary: "Persisted gate row does not match the current request, decision, or evidence reference.",
    })),
    ...(snapshot?.conflictingNewerGateAttempts ?? []).map((row, index) => drilldownRow({
      id: rowText(row, "id") ?? `newer_gate_attempt_${index + 1}`,
      group: "warning" as const,
      label: "newer_gate_attempt",
      status: rowText(row, "gate_result") ?? "available",
      code: "publish_activation_gate_conflict",
      ref: sourceRef("aaf:action_gate_attempt", rowText(row, "id")),
      watermark: gateInputWatermarkFromGate(row),
      summary: "A newer persisted gate attempt exists for this activation scope.",
    })),
  ];
  return {
    boundary: SOURCE_OWNED_READ_BOUNDARY,
    handoffReadinessStatus,
    handoffWatermark: null,
    gateInputWatermark,
    gateResultId: rowText(gate, "id"),
    gateResultRef: sourceRef("aaf:action_gate_attempt", rowText(gate, "id")),
    gateResultStatus: gateResult ?? "missing",
    gateBlockers: blockers,
    gateWarnings: warnings,
    newerConflict: (snapshot?.conflictingNewerGateAttempts ?? []).length > 0,
    stale: false,
    mismatchIndicators,
    conflictDetails,
  };
}

function metadataResolverSection(
  snapshot: SingleSitePublishOperatorSourceSnapshot | null | undefined,
  launch: SingleSitePublishOperatorReadonlyProjection["launchReadiness"],
  request: SingleSitePublishOperatorReadonlyProjection["publishActivationRequest"],
  decision: SingleSitePublishOperatorReadonlyProjection["publishActivationDecision"],
  gate: SingleSitePublishOperatorReadonlyProjection["gateHandoffEvaluation"],
  context: SingleSitePublishOperatorReadonlyProjection["publishContext"],
): SingleSitePublishOperatorReadonlyProjection["metadataResolver"] {
  const missing = codeList(
    !context.candidateSiteVersionRef ? "candidate_site_version_ref_missing" : null,
    !context.runtimeArtifactRef ? "runtime_artifact_ref_missing" : null,
    !context.publishTargetRef ? "publish_target_ref_missing" : null,
    !launch.evidencePackageRef ? "launch_readiness_evidence_ref_missing" : null,
    !request.id ? "publish_activation_request_ref_missing" : null,
    !decision.id ? "publish_activation_decision_ref_missing" : null,
    !gate.gateResultId ? "gate_result_ref_missing" : null,
    !gate.gateInputWatermark ? "gate_input_watermark_missing" : null,
    snapshot?.readFailureCodes,
  );
  const mismatches = codeList(gate.mismatchIndicators);
  const safeDiagnostics = codeList(
    launch.flags.stale ? "launch_readiness_stale" : null,
    launch.flags.blocked ? "launch_readiness_blocked" : null,
    (snapshot?.activePublishActivationDecisionCount ?? 0) > 1 ? "conflicting_active_publish_activation_decisions" : null,
    gate.newerConflict ? "publish_activation_gate_conflict" : null,
    gate.gateBlockers,
    gate.gateWarnings,
  );
  const detailRows = [
    ...missing.map((code) => drilldownRow({
      id: code,
      group: "missing" as const,
      label: code,
      status: "missing",
      code,
      summary: "Required publish activation metadata is not available in the read-only projection.",
    })),
    ...mismatches.map((code) => drilldownRow({
      id: code,
      group: "blocked" as const,
      label: code,
      status: "mismatch",
      code,
      summary: "Resolved metadata conflicts with the current source-owned publish chain.",
    })),
    ...safeDiagnostics.map((code) => drilldownRow({
      id: code,
      group: code.includes("stale") ? "stale" as const : "warning" as const,
      label: code,
      status: "diagnostic",
      code,
      summary: "Safe resolver diagnostic derived from persisted source status.",
    })),
  ];
  return {
    boundary: DERIVED_ONLY_BOUNDARY,
    completenessStatus: missing.length === 0 && mismatches.length === 0 ? "complete" : "incomplete",
    missingMetadataCodes: missing,
    expectedResolvedMismatchCodes: mismatches,
    safeDiagnostics,
    detailRows,
  };
}

function operatorAuditSection(
  attempts: readonly SingleSitePublishOperatorActionAttemptProjection[],
  latestDryRun: SingleSitePublishOperatorActionAttemptProjection | null,
  latestShadowPublish: SingleSitePublishOperatorActionAttemptProjection | null,
  events: readonly SingleSitePublishOperatorAuditEventRow[] = [],
): SingleSitePublishOperatorReadonlyProjection["operatorAudit"] {
  const recentEvents = events.slice(0, 24).map((event) => {
    const result = jsonObject(event.result_summary_json);
    const diagnostics = jsonObject(event.redacted_diagnostics_json);
    const errors = jsonObject(event.error_summary_json);
    return {
      actionId: safeText(event.action_id),
      eventAction: safeText(event.event_action),
      status: safeText(event.status),
      actorRole: safeText(event.actor_role),
      occurredAt: safeText(event.occurred_at),
      resultStatus: text(valueFromRecords("routeStatus", result) ?? valueFromRecords("wrapperStatus", result) ?? valueFromRecords("wrapperDryRunStatus", result)),
      reasonCodes: codeList(result.reasonCode, result.blockerCodes, diagnostics.reasonCode, diagnostics.blockerCodes, errors.reasonCode, errors.blockerCodes),
    };
  });
  const timelineSummaries = attempts.map((attempt) => drilldownRow({
    id: attempt.actionId,
    group: attempt.blockerCodes.length > 0 || attempt.status.includes("failed") ? "blocked" : attempt.warningCodes.length > 0 ? "warning" : "ready",
    label: attempt.mode,
    status: attempt.status,
    freshnessStatus: attempt.updatedAt,
    category: attempt.resultStatus,
    code: attempt.blockerCodes[0] ?? attempt.warningCodes[0] ?? attempt.resultStatus,
    ref: attempt.actionId,
    watermark: attempt.gateInputWatermark,
    summary: `${attempt.mode}:${attempt.status}:${attempt.resultStatus}`,
  }));
  return {
    boundary: SOURCE_OWNED_READ_BOUNDARY,
    latestDryRunActionId: latestDryRun?.actionId ?? null,
    latestShadowPublishActionId: latestShadowPublish?.actionId ?? null,
    recentAttemptCount: attempts.length,
    actorCorrelationIdempotencyProjection: attempts.slice(0, 12).map((attempt) => ({
      actionId: attempt.actionId,
      actorRole: attempt.actor.actorRole,
      correlationId: attempt.correlationId,
      idempotencyKey: attempt.idempotencyKey,
    })),
    recentEvents,
    timelineSummaries,
    persistedResultFlags: {
      anyPublishMayHaveExecuted: attempts.some((attempt) => attempt.persistedMutationFlags.publishMayHaveExecuted === true),
      anyRuntimeMutationFlag: attempts.some((attempt) => attempt.persistedMutationFlags.runtimeMutation === true),
      anyBlockingEnforcementAppliedFlag: attempts.some((attempt) => attempt.persistedMutationFlags.blockingEnforcementApplied === true),
    },
  };
}

function hasProjectionConnect(db: Queryable): db is QueryableWithConnect {
  return typeof (db as { connect?: unknown }).connect === "function";
}

export function buildSingleSitePublishOperatorReadonlyProjection(
  input: SingleSitePublishOperatorAuditProjectionInput,
): SingleSitePublishOperatorReadonlyProjection {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
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
  const identity = sourceIdentity(input.sourceSnapshot, primaryRow);
  const publishContext = sourcePublishContext(input.sourceSnapshot, primary);
  const launchReadiness = launchReadinessSection(input.sourceSnapshot);
  const publishActivationRequest = publishActivationRequestSection(input.sourceSnapshot);
  const publishActivationDecision = publishActivationDecisionSection(input.sourceSnapshot, generatedAt);
  const gateHandoffEvaluation = gateSection(input.sourceSnapshot, publishActivationDecision, launchReadiness);
  const metadataResolver = metadataResolverSection(input.sourceSnapshot, launchReadiness, publishActivationRequest, publishActivationDecision, gateHandoffEvaluation, publishContext);
  const operatorAudit = operatorAuditSection(attempts, latestDryRun, latestShadowPublish, input.events ?? []);
  const sourceCompleteMetadata = metadataResolver.completenessStatus === "complete";
  const auditCompleteMetadata = latestCompleteMetadata(primary);
  const completeMetadata = sourceCompleteMetadata || auditCompleteMetadata;
  const missingMetadata = codeList(deriveMissingMetadata(primary), metadataResolver.missingMetadataCodes, metadataResolver.expectedResolvedMismatchCodes);
  const blockerCodes = codeList(...attempts.map((attempt) => attempt.blockerCodes));
  const warningCodes = codeList(...attempts.map((attempt) => attempt.warningCodes), gateHandoffEvaluation.gateWarnings, metadataResolver.safeDiagnostics);
  const limitationCodes = codeList(...attempts.map((attempt) => attempt.limitationCodes), launchReadiness.acceptedLimitations, publishActivationDecision.limitations);
  const hasSourceRows = Boolean(
    input.sourceSnapshot?.launchReadinessRecord ||
      input.sourceSnapshot?.publishActivationRequest ||
      input.sourceSnapshot?.publishActivationDecision ||
      input.sourceSnapshot?.gateAttempt,
  );
  const state: SingleSitePublishOperatorReadonlyProjection["state"] = hasLookup ? (attempts.length > 0 || hasSourceRows ? "visible" : "empty") : "lookup_required";
  const nextAction = deriveNextAction({
    state,
    latestDryRun,
    latestShadowPublish,
    launch: launchReadiness,
    request: publishActivationRequest,
    decision: publishActivationDecision,
    gate: gateHandoffEvaluation,
    metadata: metadataResolver,
    blockerCodes,
    missingMetadata,
    hasSourceRows,
  });
  const runbook = buildSingleSitePublishOperatorRunbook({
    state,
    identity,
    publishContext,
    launch: launchReadiness,
    request: publishActivationRequest,
    decision: publishActivationDecision,
    gate: gateHandoffEvaluation,
    metadata: metadataResolver,
    operatorAudit,
    latestDryRun,
    latestShadowPublish,
    nextAction,
  });

  const projection: Omit<SingleSitePublishOperatorReadonlyProjection, "diagnosticSnapshot"> = {
    panelVersion: SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_VERSION,
    generatedAt,
    lookup: {
      migrationId,
      siteId,
      candidateSiteVersionRef,
    },
    state,
    identity,
    publishContext,
    governedPublishChain: {
      launchReadinessEvidence: {
        ref: launchReadiness.evidencePackageRef ?? primary?.launchReadinessEvidenceRef ?? null,
        status: launchReadiness.evidencePackageStatus !== "missing" ? launchReadiness.evidencePackageStatus : statusFromRef(primary?.launchReadinessEvidenceRef, completeMetadata, "missing"),
      },
      publishActivationRequest: {
        ref: publishActivationRequest.ref ?? primary?.publishActivationRequestRef ?? null,
        status: publishActivationRequest.status !== "missing" ? publishActivationRequest.status : statusFromRef(primary?.publishActivationRequestRef, completeMetadata, "missing"),
      },
      publishActivationDecision: {
        ref: publishActivationDecision.ref ?? primary?.publishActivationDecisionRef ?? null,
        status: publishActivationDecision.status !== "missing" ? publishActivationDecision.status : statusFromRef(primary?.publishActivationDecisionRef, completeMetadata, "missing_or_pending"),
      },
      gateResult: {
        ref: gateHandoffEvaluation.gateResultRef ?? primary?.gateAttemptResultRef ?? null,
        status: gateHandoffEvaluation.gateResultStatus !== "missing" ? gateHandoffEvaluation.gateResultStatus : statusFromRef(primary?.gateAttemptResultRef, completeMetadata, blockerCodes.length > 0 ? "blocked" : "missing"),
      },
      handoffWatermark: gateHandoffEvaluation.handoffWatermark ?? primary?.handoffWatermark ?? null,
      gateInputWatermark: gateHandoffEvaluation.gateInputWatermark ?? primary?.gateInputWatermark ?? null,
    },
    sourceBoundaries: {
      launchReadiness: SOURCE_OWNED_READ_BOUNDARY,
      publishActivationRequest: SOURCE_OWNED_READ_BOUNDARY,
      publishActivationDecision: SOURCE_OWNED_READ_BOUNDARY,
      gateHandoffEvaluation: SOURCE_OWNED_READ_BOUNDARY,
      metadataResolver: DERIVED_ONLY_BOUNDARY,
      operatorAudit: SOURCE_OWNED_READ_BOUNDARY,
      derivedNextAction: DERIVED_ONLY_BOUNDARY,
    },
    launchReadiness,
    publishActivationRequest,
    publishActivationDecision,
    gateHandoffEvaluation,
    metadataResolver,
    operatorAudit,
    readinessState: readinessState({
      state,
      latestDryRun,
      latestShadowPublish,
      blockerCodes,
      missingMetadata,
      launch: launchReadiness,
      gate: gateHandoffEvaluation,
    }),
    latestDryRun,
    latestShadowPublish,
    timeline: attempts.slice(0, Math.max(1, input.lookup.limit ?? 12)),
    blockerCodes,
    warningCodes,
    limitationCodes,
    staleOrMissingMetadataIndicators: missingMetadata,
    runbookSummary: runbook.summary,
    runbookEntries: runbook.entries,
    nextAction,
    flags: SINGLE_SITE_PUBLISH_OPERATOR_READONLY_PANEL_FLAGS,
  };

  return {
    ...projection,
    diagnosticSnapshot: buildSingleSitePublishOperatorDiagnosticSnapshot(projection),
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
    const primaryAction = [...actions].sort((left, right) => safeText(right.updated_at).localeCompare(safeText(left.updated_at)))[0] ?? null;
    const actionIds = actions.map((row) => row.id);
    const [refResult, eventResult, sourceSnapshot] = await Promise.all([
      actionIds.length > 0
        ? this.db.query(
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
          )
        : Promise.resolve({ rows: [] }),
      actionIds.length > 0
        ? this.db.query(
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
          )
        : Promise.resolve({ rows: [] }),
      this.readSourceSnapshot({
        migrationId,
        siteId,
        candidateSiteVersionRef,
        primaryAction,
      }),
    ]);

    return buildSingleSitePublishOperatorReadonlyProjection({
      lookup: input,
      actions,
      refs: refResult.rows as unknown as SingleSitePublishOperatorAuditRefRow[],
      events: eventResult.rows as unknown as SingleSitePublishOperatorAuditEventRow[],
      sourceSnapshot,
    });
  }

  private async readSourceSnapshot(input: {
    migrationId: string | null;
    siteId: string | null;
    candidateSiteVersionRef: string | null;
    primaryAction: SingleSitePublishOperatorActionAuditRow | null;
  }): Promise<SingleSitePublishOperatorSourceSnapshot | null> {
    const run = async (client: Queryable, transactionCapturedAt?: string | null) => this.readSourceSnapshotWithClient(client, input, transactionCapturedAt);
    if (!hasProjectionConnect(this.db)) return run(this.db, null);

    const client = await this.db.connect();
    let started = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      started = true;
      const captured = await client.query("select transaction_timestamp()::text as captured_at");
      const snapshot = await run(client, text(captured.rows[0]?.captured_at));
      await client.query("commit");
      started = false;
      return snapshot;
    } catch {
      if (started) {
        try {
          await client.query("rollback");
        } catch {
          // Best-effort cleanup after a failed read-only operator source projection.
        }
      }
      return {
        transactionCapturedAt: null,
        readFailureCodes: ["operator_source_projection_read_failure"],
      };
    } finally {
      client.release?.();
    }
  }

  private async readSourceSnapshotWithClient(
    client: Queryable,
    input: {
      migrationId: string | null;
      siteId: string | null;
      candidateSiteVersionRef: string | null;
      primaryAction: SingleSitePublishOperatorActionAuditRow | null;
    },
    transactionCapturedAt?: string | null,
  ): Promise<SingleSitePublishOperatorSourceSnapshot> {
    const primary = input.primaryAction;
    const tenantId = text(primary?.tenant_id);
    const clientId = text(primary?.client_id);
    const siteId = input.siteId ?? text(primary?.site_id);
    const migrationId = input.migrationId ?? text(primary?.migration_id);
    const candidateRef = input.candidateSiteVersionRef ?? text(primary?.candidate_site_version_ref);
    const candidateId = sourceId(candidateRef);

    const readiness = (await client.query(
      `
        select *
        from public.gnr8_single_site_launch_readiness_records
        where ($1::text is null or migration_id::text = $1)
          and ($2::text is null or site_id::text = $2)
          and ($3::text is null or improved_candidate_site_version_ref = $3 or improved_candidate_site_version_ref like '%' || $3)
        order by updated_at desc, created_at desc, id desc
        limit 1
      `,
      [migrationId, siteId, candidateId ?? candidateRef],
    )).rows[0] ?? null;
    const readinessId = rowText(readiness, "id");
    const [dimensions, blockers, readinessRefs] = readinessId
      ? await Promise.all([
          client.query("select * from public.gnr8_single_site_launch_readiness_dimensions where readiness_id = $1::uuid order by dimension asc", [readinessId]),
          client.query("select * from public.gnr8_single_site_launch_readiness_blockers where readiness_id = $1::uuid order by updated_at desc, created_at desc", [readinessId]),
          client.query("select * from public.gnr8_single_site_launch_readiness_refs where readiness_id = $1::uuid order by ref_role asc, created_at desc", [readinessId]),
        ])
      : [{ rows: [] }, { rows: [] }, { rows: [] }];

    const evidenceIdFromAudit = sourceId(text(primary?.launch_readiness_evidence_ref));
    const evidencePackage = (isUuid(evidenceIdFromAudit)
      ? (await client.query("select * from public.gnr8_aaf_evidence_packages where id = $1::uuid limit 1", [evidenceIdFromAudit])).rows[0]
      : null) ??
      (readinessId
        ? (await client.query(
            `
              select *
              from public.gnr8_aaf_evidence_packages
              where package_type = 'single_site_launch_readiness_evidence'
                and subject_type = 'single_site_launch_readiness_package'
                and subject_id = $1
              order by created_at desc, id desc
              limit 1
            `,
            [readinessId],
          )).rows[0]
        : null) ??
      null;
    const evidenceId = rowText(evidencePackage, "id");
    const evidenceFreshness = evidenceId
      ? (await client.query("select * from public.gnr8_aaf_evidence_package_freshness_checks where evidence_package_id = $1::uuid order by checked_at desc, created_at desc limit 3", [evidenceId])).rows
      : [];

    const requestIdFromAudit = sourceId(text(primary?.publish_activation_request_ref));
    const request = (isUuid(requestIdFromAudit)
      ? (await client.query("select * from public.gnr8_aaf_approval_requests where id = $1::uuid limit 1", [requestIdFromAudit])).rows[0]
      : null) ??
      (await client.query(
        `
          select *
          from public.gnr8_aaf_approval_requests
          where ($1::text is null or tenant_id = $1)
            and ($2::text is null or client_id::text = $2)
            and ($3::text is null or site_id::text = $3)
            and scope = 'publish_activation'
            and subject_type = 'site_version'
            and ($4::text is null or subject_id = $4)
          order by created_at desc, id desc
          limit 1
        `,
        [tenantId, clientId, siteId, candidateId],
      )).rows[0] ??
      null;
    const requestId = rowText(request, "id");
    const requestEvidenceLinks = requestId
      ? (await client.query("select * from public.gnr8_aaf_approval_evidence_links where approval_request_id = $1::uuid and approval_decision_id is null order by created_at asc, id asc", [requestId])).rows
      : [];

    const decisionIdFromAudit = sourceId(text(primary?.publish_activation_decision_ref));
    const decision = (isUuid(decisionIdFromAudit)
      ? (await client.query(
          `
            select
              d.*,
              exists(select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id) as revoked,
              exists(select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id) as superseded
            from public.gnr8_aaf_approval_decisions d
            where d.id = $1::uuid
            limit 1
          `,
          [decisionIdFromAudit],
        )).rows[0]
      : null) ??
      (requestId
        ? (await client.query(
            `
              select
                d.*,
                exists(select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id) as revoked,
                exists(select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id) as superseded
              from public.gnr8_aaf_approval_decisions d
              where d.approval_request_id = $1::uuid
              order by
                case when d.status in ('granted', 'granted_with_limitations') then 0 else 1 end,
                d.created_at desc,
                d.id desc
              limit 1
            `,
            [requestId],
          )).rows[0]
        : null) ??
      null;
    const decisionId = rowText(decision, "id");
    const decisionEvidenceLinks = decisionId
      ? (await client.query("select * from public.gnr8_aaf_approval_evidence_links where approval_decision_id = $1::uuid order by created_at asc, id asc", [decisionId])).rows
      : [];
    const activeDecisionCount = requestId
      ? numericValue((await client.query(
          `
            select count(*)::int as count
            from public.gnr8_aaf_approval_decisions d
            where d.approval_request_id = $1::uuid
              and d.status not in ('revoked', 'expired', 'superseded', 'cancelled', 'not_required_by_policy')
              and not exists(select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id)
              and not exists(select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id)
          `,
          [requestId],
        )).rows[0]?.count)
      : 0;

    const gateIdFromAudit = sourceId(text(primary?.gate_attempt_result_ref));
    const gateAttempt = (isUuid(gateIdFromAudit)
      ? (await client.query("select * from public.gnr8_aaf_action_gate_attempts where id = $1::uuid limit 1", [gateIdFromAudit])).rows[0]
      : null) ??
      (await client.query(
        `
          select *
          from public.gnr8_aaf_action_gate_attempts
          where scope = 'publish_activation'
            and action_key = 'publish.activation'
            and subject_type = 'site_version'
            and ($1::text is null or tenant_id = $1)
            and ($2::text is null or client_id::text = $2)
            and ($3::text is null or site_id::text = $3)
            and ($4::text is null or subject_id = $4)
            and ($5::uuid is null or approval_request_id = $5::uuid)
            and ($6::uuid is null or approval_decision_id = $6::uuid)
          order by created_at desc, id desc
          limit 1
        `,
        [tenantId, clientId, siteId, candidateId, requestId, decisionId],
      )).rows[0] ??
      null;
    const policyEvaluationId = rowText(gateAttempt, "policy_evaluation_id");
    const gatePolicyEvaluation = isUuid(policyEvaluationId)
      ? (await client.query("select * from public.gnr8_aaf_approval_policy_evaluations where id = $1::uuid limit 1", [policyEvaluationId])).rows[0] ?? null
      : null;
    const gateCreatedAt = rowText(gateAttempt, "created_at");
    const conflictingNewerGateAttempts = gateAttempt && gateCreatedAt
      ? (await client.query(
          `
            select *
            from public.gnr8_aaf_action_gate_attempts
            where scope = 'publish_activation'
              and action_key = 'publish.activation'
              and subject_type = 'site_version'
              and subject_id = $1
              and created_at > $2::timestamptz
              and id <> $3::uuid
            order by created_at desc, id desc
          `,
          [candidateId, gateCreatedAt, rowText(gateAttempt, "id")],
        )).rows
      : [];

    const publishTargetId =
      sourceId(text(primary?.publish_target_ref)) ??
      sourceId(rowText(readinessRefs.rows.find((row) => rowText(row, "ref_role") === "publish_target"), "source_record_id"));
    const publishTarget = publishTargetId
      ? (await client.query("select * from public.gnr8_publish_targets where id = $1::text limit 1", [publishTargetId])).rows[0] ?? null
      : null;

    return {
      transactionCapturedAt,
      launchReadinessRecord: readiness,
      launchReadinessDimensions: dimensions.rows,
      launchReadinessBlockers: blockers.rows,
      launchReadinessRefs: readinessRefs.rows,
      launchReadinessEvidencePackage: evidencePackage,
      launchReadinessEvidenceFreshnessRows: evidenceFreshness,
      publishActivationRequest: request,
      publishActivationRequestEvidenceLinks: requestEvidenceLinks,
      publishActivationDecision: decision,
      publishActivationDecisionEvidenceLinks: decisionEvidenceLinks,
      activePublishActivationDecisionCount: activeDecisionCount,
      gateAttempt,
      gatePolicyEvaluation,
      conflictingNewerGateAttempts,
      publishTarget,
    };
  }
}

export async function getSingleSitePublishOperatorReadonlyProjection(
  input: SingleSitePublishOperatorReadonlyLookup,
): Promise<SingleSitePublishOperatorReadonlyProjection> {
  return new SingleSitePublishOperatorReadonlyProjectionRepository().read(input);
}
