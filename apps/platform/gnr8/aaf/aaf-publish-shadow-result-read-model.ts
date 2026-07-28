import "server-only";

export const PUBLISH_SHADOW_RESULT_READ_MODEL_VERSION = "pasr-4-publish-shadow-result-read-model:v1" as const;

export const PUBLISH_SHADOW_STATUS_VALUES = [
  "shadow_not_enabled",
  "shadow_not_available",
  "shadow_ready",
  "shadow_ready_with_warnings",
  "shadow_missing_source_truth",
  "shadow_stale_source_truth",
  "shadow_missing_ddom_snapshot",
  "shadow_stale_ddom_snapshot",
  "shadow_missing_publish_target",
  "shadow_missing_publish_activation_approval",
  "shadow_gate_not_ready",
  "shadow_evaluation_failed",
] as const;

export type PublishShadowStatus = (typeof PUBLISH_SHADOW_STATUS_VALUES)[number];
export type PublishShadowSeverity = "low" | "medium" | "high" | "critical";
export type PublishShadowFreshnessState = "fresh" | "stale" | "partial" | "unavailable";
export type PublishShadowEnabledState = "enabled" | "disabled" | "unknown" | "unavailable";
export type PublishShadowRoleVisibility = "superadmin" | "technical_operator" | "agency_admin" | "limited_internal" | "hidden";

export const PUBLISH_SHADOW_RECOMMENDED_ACTION_KEYS = [
  "none",
  "review_warnings",
  "run_ddom_manual_trigger_outside_pasr",
  "refresh_stale_ddom_snapshot_outside_pasr",
  "request_publish_activation_approval",
  "configure_verify_publish_target_source_truth",
  "review_source_reader_failure",
  "review_evidence_builder_failure",
  "review_gate_dry_run_failure",
  "escalate_domain_dns_ambiguity",
  "wait_for_shadow_observer_to_run",
] as const;

export type PublishShadowRecommendedActionKey = (typeof PUBLISH_SHADOW_RECOMMENDED_ACTION_KEYS)[number];

export type PublishShadowRecommendedNextAction = {
  actionKey: PublishShadowRecommendedActionKey;
  ownerRole: "none" | "technical_operator" | "release_approver" | "superadmin" | "engineering";
  reason: string;
  safeNow: boolean;
  blocksCurrentPublish: false;
  blocksFutureEnforcementReadiness: boolean;
  requiredRefs: string[];
};

export type PublishShadowBoundaryFlags = {
  derivedOnly: true;
  shadowOnly: true;
  enforcementApplied: false;
  publishActionBlocked: false;
  createsDdomSnapshot: false;
  createsApproval: false;
  mutatesSourceTruth: false;
};

export type PublishShadowSourceTruthSummary = {
  sourceKey: PublishShadowSourceKey;
  sourceSystem: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceRef: string | null;
  sourceVersion: string | null;
  currentWatermark: string | null;
  evidenceWatermark: string | null;
  freshness: PublishShadowFreshnessState;
  staleReason: string | null;
  limitations: string[];
};

export type PublishShadowSourceKey =
  | "siteVersion"
  | "runtimeArtifact"
  | "activePointer"
  | "publishTarget"
  | "domainReadiness"
  | "contentOverridePublishedState"
  | "launchSignoff"
  | "publishActivationApproval";

export type PublishShadowDdomReadinessSummary = {
  status: "present" | "missing" | "stale" | "blocked" | "not_applicable" | "manually_excepted" | "unavailable";
  snapshotId: string | null;
  snapshotRef: string | null;
  readinessState: string | null;
  freshnessState: PublishShadowFreshnessState;
  capturedAt: string | null;
  freshUntil: string | null;
  staleReason: string | null;
  blockers: string[];
  warnings: string[];
  createsSnapshot: false;
};

export type PublishShadowPublishTargetSummary = {
  status: "present" | "missing" | "failed_or_stale" | "unavailable";
  publishTargetId: string | null;
  environment: string | null;
  publishStage: string | null;
  policyVersion: string | null;
  sourceRef: string | null;
  sourceWatermark: string | null;
  limitations: string[];
};

export type PublishShadowApprovalSummary = {
  launchSignoff: "not_required" | "present" | "missing" | "failed_or_stale" | "unavailable";
  publishActivation: "present" | "missing" | "wrong_scope" | "failed_or_stale" | "unavailable";
  approvalRequestId: string | null;
  approvalDecisionId: string | null;
  decisionStatus: string | null;
  scope: string | null;
  expiresAt: string | null;
  createsApproval: false;
  limitations: string[];
};

export type PublishShadowEvidenceSummary = {
  evidencePackageId: string | null;
  packageStatus: string | null;
  packageType: string | null;
  evidenceCreatedAt: string | null;
  freshnessLabel: PublishShadowFreshnessState;
  sourceWatermark: string | null;
  evidenceIdempotencyKey: string | null;
  limitations: string[];
  sourceRefs: PublishShadowSourceTruthSummary[];
};

export type PublishShadowGateDryRunSummary = {
  dryRunOnly: true;
  actionKey: "publish.activation";
  scope: "publish_activation";
  subjectType: "site_version";
  subjectId: string | null;
  status: "not_attempted" | "evaluated" | "unavailable";
  gateResult: string | null;
  policyResult: string | null;
  approvalDecisionId: string | null;
  gateAttemptId: string | null;
  auditEventId: string | null;
  gateDryRunIdempotencyKey: string | null;
  blockedReasons: string[];
  staleEvidenceReasons: string[];
  missingSourceWatermarks: string[];
  warnings: string[];
};

export type PublishShadowLimitationSummary = {
  code: string;
  severity: PublishShadowSeverity;
  source: "projection" | "repository" | "aaf" | "ddom" | "publish_target" | "runtime";
  detail: string | null;
};

export type PublishShadowEmptyState = {
  isEmpty: boolean;
  reason: "shadow_disabled" | "no_shadow_records" | "not_empty";
};

export type PublishShadowErrorState = {
  hasError: boolean;
  errorCode: string | null;
  safeMessage: string | null;
};

export type PublishShadowResultReadModel = PublishShadowBoundaryFlags & {
  readModelVersion: typeof PUBLISH_SHADOW_RESULT_READ_MODEL_VERSION;
  generatedAt: string;
  projectionFreshness: PublishShadowFreshnessState;
  projectionLimitations: PublishShadowLimitationSummary[];
  roleVisibility: PublishShadowRoleVisibility;
  shadowStatus: PublishShadowStatus;
  severity: PublishShadowSeverity;
  operatorLabel: string;
  recommendedNextAction: PublishShadowRecommendedNextAction;
  emptyState: PublishShadowEmptyState;
  errorState: PublishShadowErrorState;
  tenantId: string | null;
  clientId: string | null;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string | null;
  publishAttemptRef: string | null;
  intendedPublishTarget: string | null;
  intendedPublishStage: string | null;
  trustedPublishEnvironment: string | null;
  actorType: string | null;
  actorId: string | null;
  actorRole: string | null;
  shadowEnabledState: PublishShadowEnabledState;
  sourceReadStatus: {
    status: "not_attempted" | "completed" | "unavailable";
    warnings: string[];
    limitations: string[];
  };
  evidenceBuildStatus: {
    status: "not_attempted" | "built" | "unavailable";
    evidencePackageId: string | null;
    missingSourceTruth: PublishShadowSourceKey[];
    staleSourceTruth: PublishShadowSourceKey[];
  };
  gateDryRunStatus: PublishShadowGateDryRunSummary;
  readinessResult: "ready" | "not_ready" | "unavailable";
  missingSourceTruth: PublishShadowSourceKey[];
  staleSourceTruth: PublishShadowSourceKey[];
  sourceTruth: PublishShadowSourceTruthSummary[];
  sourceWatermarks: Record<string, string | null>;
  sourceTruthSummary: {
    missingCount: number;
    staleCount: number;
    availableCount: number;
  };
  ddomReadiness: PublishShadowDdomReadinessSummary;
  publishTarget: PublishShadowPublishTargetSummary;
  approval: PublishShadowApprovalSummary;
  evidence: PublishShadowEvidenceSummary;
  evidenceRefs: {
    evidencePackageId: string | null;
    gateAttemptId: string | null;
    auditEventId: string | null;
    approvalRequestId: string | null;
    approvalDecisionId: string | null;
    ddomSnapshotRef: string | null;
    publishTargetRef: string | null;
  };
  correlation: {
    correlationId: string | null;
    causationId: string | null;
    requestId: string | null;
    idempotencyKey: string | null;
    shadowEvaluationId: string | null;
    evidenceIdempotencyKey: string | null;
    gateDryRunIdempotencyKey: string | null;
    publishAttemptRef: string | null;
    linkageStrategy: "durable_publish_attempt" | "correlation_idempotency_fallback";
  };
  failureReason: string | null;
  warnings: string[];
  limitations: string[];
};

export type PublishShadowResultReadInput = {
  tenantId?: string | null;
  clientId?: string | null;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId?: string | null;
  publishTargetId?: string | null;
  intendedPublishTarget?: string | null;
  intendedPublishStage?: string | null;
  trustedPublishEnvironment?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  publishAttemptRef?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  shadowEnabledState?: PublishShadowEnabledState;
  generatedAt?: string;
  roleVisibility?: PublishShadowRoleVisibility;
};

export type PublishShadowRawEvidencePackageRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  site_id: string | null;
  site_version_id: string | null;
  package_type: string;
  subject_type: string;
  subject_id: string;
  status: string;
  created_by_actor_type: string;
  created_by_actor_id: string;
  created_at: string;
  source_watermark: string;
  freshness_label: string;
  expires_at: string | null;
  limitations_json: unknown;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
};

export type PublishShadowRawSourceRefRow = {
  id: string;
  evidence_package_id: string;
  source_system: string;
  source_table: string;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string;
  captured_at: string;
  query_ref: string | null;
  snapshot_ref: string | null;
  metadata_json: unknown;
};

export type PublishShadowRawFreshnessCheckRow = {
  id: string;
  evidence_package_id: string;
  policy_version: string;
  result: string;
  checked_at: string;
  stale_reason: string | null;
  expires_at: string | null;
  current_source_watermark: string | null;
  audit_event_id: string | null;
  correlation_id: string;
  idempotency_key: string;
};

export type PublishShadowRawGateAttemptRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  site_id: string | null;
  site_version_id: string | null;
  action_key: string;
  scope: string;
  subject_type: string;
  subject_id: string;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  policy_evaluation_id: string | null;
  evidence_package_id: string | null;
  approval_request_id: string | null;
  approval_decision_id: string | null;
  pre_action_audit_event_id: string | null;
  outcome_audit_event_id: string | null;
  gate_result: string;
  fail_closed_reason: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type PublishShadowRawPolicyEvaluationRow = {
  id: string;
  result: string;
  policy_version: string;
  scope: string;
  action_key: string;
  subject_type: string;
  subject_id: string;
  approval_request_id: string | null;
  approval_decision_id: string | null;
  evidence_package_id: string | null;
  blocker_codes: unknown;
  stale_reason: string | null;
  audit_event_id: string | null;
  evaluated_at: string;
  correlation_id: string;
  idempotency_key: string;
};

export type PublishShadowRawAuditEventRow = {
  id: string;
  event_name: string;
  event_family: string;
  severity: string;
  subject_type: string;
  subject_id: string;
  policy_evaluation_id: string | null;
  evidence_package_id: string | null;
  approval_request_id: string | null;
  approval_decision_id: string | null;
  payload_json: unknown;
  correlation_id: string;
  idempotency_key: string;
  created_at: string;
};

export type PublishShadowRawDdomSnapshotRow = {
  id: string;
  readiness_state: string;
  readiness_blockers: unknown;
  readiness_warnings: unknown;
  freshness_state: string;
  fresh_until: string | null;
  stale_reason: string | null;
  captured_at: string;
  source_watermark: string;
  created_at: string;
};

export type PublishShadowRawPublishTargetRow = {
  id: string;
  environment: string;
  target_kind: string;
  publish_stage: string;
  status: string;
  policy_version: string;
  requires_aaf: boolean;
  requires_ddom_snapshot: boolean;
  requires_launch_signoff: boolean;
  allowed_artifact_stages: unknown;
  limitations_json: unknown;
  source_watermark: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishShadowRawApprovalTimelineRow = {
  approval_request_id: string;
  approval_decision_id: string | null;
  scope: string;
  subject_type: string;
  subject_id: string;
  request_status: string;
  request_policy_version: string;
  request_created_at: string;
  requested_expires_at: string | null;
  decision_status: string | null;
  decided_at: string | null;
  decision_policy_version: string | null;
  evidence_package_id: string | null;
  policy_evaluation_id: string | null;
  decision_expires_at: string | null;
  revocations_json: unknown;
  supersessions_json: unknown;
  partial_timeline_json: unknown;
};

export type PublishShadowRuntimeContext = {
  siteVersion: { id: string; site_id: string; state: string; artifact_id: string | null; updated_at: string | null } | null;
  runtimeArtifact: { id: string; site_id: string; site_version_id: string; publish_stage: string; created_at: string } | null;
  activePointer: { site_id: string; active_site_version_id: string; active_artifact_id: string; updated_at: string | null } | null;
};

export type PublishShadowResultRepositorySnapshot = {
  capturedAt: string | null;
  input: PublishShadowResultReadInput;
  evidencePackage: PublishShadowRawEvidencePackageRow | null;
  sourceRefs: PublishShadowRawSourceRefRow[];
  freshnessChecks: PublishShadowRawFreshnessCheckRow[];
  gateAttempt: PublishShadowRawGateAttemptRow | null;
  policyEvaluation: PublishShadowRawPolicyEvaluationRow | null;
  auditEvent: PublishShadowRawAuditEventRow | null;
  ddomSnapshot: PublishShadowRawDdomSnapshotRow | null;
  publishTarget: PublishShadowRawPublishTargetRow | null;
  approvalTimeline: PublishShadowRawApprovalTimelineRow | null;
  runtimeContext: PublishShadowRuntimeContext;
  limitations: string[];
};

const BASE_BOUNDARIES: PublishShadowBoundaryFlags = {
  derivedOnly: true,
  shadowOnly: true,
  enforcementApplied: false,
  publishActionBlocked: false,
  createsDdomSnapshot: false,
  createsApproval: false,
  mutatesSourceTruth: false,
};

const REQUIRED_SOURCE_KEYS: PublishShadowSourceKey[] = [
  "siteVersion",
  "runtimeArtifact",
  "activePointer",
  "publishTarget",
  "domainReadiness",
];

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function uniq(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function arrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function freshness(value: unknown): PublishShadowFreshnessState {
  const raw = text(value);
  if (raw === "fresh") return "fresh";
  if (raw === "stale") return "stale";
  if (raw === "partial" || raw === "partial_timeline") return "partial";
  return "unavailable";
}

function sourceKeyFromRef(row: PublishShadowRawSourceRefRow): PublishShadowSourceKey | null {
  const metadataKey = text(objectValue(row.metadata_json).sourceKey);
  if (metadataKey && isSourceKey(metadataKey)) return metadataKey;
  if (row.source_table === "gnr8_runtime_site_versions") return "siteVersion";
  if (row.source_table === "gnr8_runtime_artifacts") return "runtimeArtifact";
  if (row.source_table === "gnr8_runtime_active_pointers") return "activePointer";
  if (row.source_table === "gnr8_publish_targets") return "publishTarget";
  if (row.source_table === "gnr8_ddom_readiness_snapshots") return "domainReadiness";
  if (row.source_table === "gnr8_content_overrides") return "contentOverridePublishedState";
  if (row.source_table === "gnr8_aaf_approval_requests" || row.source_table === "gnr8_aaf_approval_decisions") {
    const queryRef = text(row.query_ref) ?? "";
    return queryRef.includes("launch_signoff") ? "launchSignoff" : "publishActivationApproval";
  }
  return null;
}

function isSourceKey(value: string): value is PublishShadowSourceKey {
  return [
    "siteVersion",
    "runtimeArtifact",
    "activePointer",
    "publishTarget",
    "domainReadiness",
    "contentOverridePublishedState",
    "launchSignoff",
    "publishActivationApproval",
  ].includes(value);
}

function sourceSummaries(sourceRefs: readonly PublishShadowRawSourceRefRow[]): PublishShadowSourceTruthSummary[] {
  return sourceRefs.flatMap((row) => {
    const sourceKey = sourceKeyFromRef(row);
    if (!sourceKey) return [];
    const metadata = objectValue(row.metadata_json);
    const refFreshness = freshness(metadata.freshnessStatus);
    const currentWatermark = text(objectValue(metadata.watermarkMetadata).canonicalWatermark) ?? text(row.source_watermark);
    return [
      {
        sourceKey,
        sourceSystem: text(row.source_system) ?? "gnr8",
        sourceTable: row.source_table,
        sourceRecordId: row.source_record_id,
        sourceRef: text(row.snapshot_ref),
        sourceVersion: text(row.source_version),
        currentWatermark,
        evidenceWatermark: text(row.source_watermark),
        freshness: refFreshness,
        staleReason: text(metadata.staleReason),
        limitations: arrayOfStrings(metadata.limitations),
      },
    ];
  });
}

function limitationCodesFromEvidence(evidencePackage: PublishShadowRawEvidencePackageRow | null): string[] {
  const payload = objectValue(evidencePackage?.limitations_json);
  return uniq([
    ...arrayOfStrings(payload.limitations),
    ...arrayOfStrings(payload.missingSourceTruth).map((key) => `missing_source_truth:${key}`),
    ...(evidencePackage?.status === "invalid" ? ["evidence_package_invalid"] : []),
  ]);
}

function missingSourceTruth(input: {
  sourceTruth: readonly PublishShadowSourceTruthSummary[];
  evidencePackage: PublishShadowRawEvidencePackageRow | null;
}): PublishShadowSourceKey[] {
  const payload = objectValue(input.evidencePackage?.limitations_json);
  const fromEvidence = arrayOfStrings(payload.missingSourceTruth).filter(isSourceKey);
  const presentKeys = new Set(input.sourceTruth.map((source) => source.sourceKey));
  const missingRequired = REQUIRED_SOURCE_KEYS.filter((key) => !presentKeys.has(key));
  return uniq([...fromEvidence, ...missingRequired]) as PublishShadowSourceKey[];
}

function staleSourceTruth(input: {
  sourceTruth: readonly PublishShadowSourceTruthSummary[];
  freshnessChecks: readonly PublishShadowRawFreshnessCheckRow[];
  gateAttempt: PublishShadowRawGateAttemptRow | null;
  policyEvaluation: PublishShadowRawPolicyEvaluationRow | null;
}): PublishShadowSourceKey[] {
  const staleKeys = input.sourceTruth.filter((source) => source.freshness === "stale" || source.freshness === "partial").map((source) => source.sourceKey);
  const staleCheck = input.freshnessChecks.some((row) => freshness(row.result) === "stale" || freshness(row.result) === "partial");
  const gateStale = [
    input.gateAttempt?.gate_result,
    input.gateAttempt?.fail_closed_reason,
    input.policyEvaluation?.stale_reason,
    ...arrayOfStrings(input.policyEvaluation?.blocker_codes),
  ].some((value) => /stale|expired|superseded|watermark/i.test(text(value) ?? ""));
  return uniq([...staleKeys, ...((staleCheck || gateStale) ? staleKeys : [])]) as PublishShadowSourceKey[];
}

function ddomSummary(input: {
  ddomSnapshot: PublishShadowRawDdomSnapshotRow | null;
  sourceTruth: readonly PublishShadowSourceTruthSummary[];
  missing: readonly PublishShadowSourceKey[];
}): PublishShadowDdomReadinessSummary {
  const source = input.sourceTruth.find((item) => item.sourceKey === "domainReadiness") ?? null;
  if (!input.ddomSnapshot && input.missing.includes("domainReadiness")) {
    return {
      status: "missing",
      snapshotId: null,
      snapshotRef: null,
      readinessState: null,
      freshnessState: "unavailable",
      capturedAt: null,
      freshUntil: null,
      staleReason: null,
      blockers: ["missing_ddom_snapshot"],
      warnings: ["run_manual_ddom_readiness_snapshot_trigger_outside_pasr"],
      createsSnapshot: false,
    };
  }
  const row = input.ddomSnapshot;
  if (!row) {
    return {
      status: "unavailable",
      snapshotId: null,
      snapshotRef: source?.sourceRef ?? null,
      readinessState: null,
      freshnessState: source?.freshness ?? "unavailable",
      capturedAt: null,
      freshUntil: null,
      staleReason: source?.staleReason ?? null,
      blockers: [],
      warnings: [],
      createsSnapshot: false,
    };
  }
  const state = text(row.readiness_state);
  const isStale = freshness(row.freshness_state) === "stale" || state === "stale" || Boolean(text(row.stale_reason));
  const status: PublishShadowDdomReadinessSummary["status"] =
    isStale
      ? "stale"
      : state === "not_applicable" || state === "manually_excepted"
        ? state
        : state === "blocked"
          ? "blocked"
          : "present";
  return {
    status,
    snapshotId: row.id,
    snapshotRef: source?.sourceRef ?? `gnr8:gnr8_ddom_readiness_snapshots:${row.id}`,
    readinessState: row.readiness_state,
    freshnessState: freshness(row.freshness_state),
    capturedAt: row.captured_at,
    freshUntil: row.fresh_until,
    staleReason: text(row.stale_reason) ?? source?.staleReason ?? null,
    blockers: arrayOfStrings(row.readiness_blockers),
    warnings: arrayOfStrings(row.readiness_warnings),
    createsSnapshot: false,
  };
}

function publishTargetSummary(input: {
  publishTarget: PublishShadowRawPublishTargetRow | null;
  sourceTruth: readonly PublishShadowSourceTruthSummary[];
  missing: readonly PublishShadowSourceKey[];
  intendedPublishTarget?: string | null;
}): PublishShadowPublishTargetSummary {
  const source = input.sourceTruth.find((item) => item.sourceKey === "publishTarget") ?? null;
  if (!input.publishTarget) {
    return {
      status: "missing",
      publishTargetId: input.intendedPublishTarget ?? source?.sourceRecordId ?? null,
      environment: null,
      publishStage: null,
      policyVersion: null,
      sourceRef: source?.sourceRef ?? null,
      sourceWatermark: source?.evidenceWatermark ?? null,
      limitations: uniq(["missing_publish_target", ...(input.missing.includes("publishTarget") ? ["missing_source_truth:publishTarget"] : [])]),
    };
  }
  const row = input.publishTarget;
  if (!row) {
    return {
      status: "unavailable",
      publishTargetId: source?.sourceRecordId ?? null,
      environment: null,
      publishStage: null,
      policyVersion: source?.sourceVersion ?? null,
      sourceRef: source?.sourceRef ?? null,
      sourceWatermark: source?.evidenceWatermark ?? null,
      limitations: source?.limitations ?? [],
    };
  }
  const status = row.status === "active" && source?.freshness !== "stale" ? "present" : "failed_or_stale";
  return {
    status,
    publishTargetId: row.id,
    environment: row.environment,
    publishStage: row.publish_stage,
    policyVersion: row.policy_version,
    sourceRef: source?.sourceRef ?? `gnr8:gnr8_publish_targets:${row.id}`,
    sourceWatermark: text(row.source_watermark),
    limitations: uniq([...(status === "present" ? [] : [`publish_target_${row.status}`]), ...arrayOfStrings(objectValue(row.limitations_json).mvpLimitations)]),
  };
}

function approvalSummary(input: {
  approvalTimeline: PublishShadowRawApprovalTimelineRow | null;
  gateAttempt: PublishShadowRawGateAttemptRow | null;
  policyEvaluation: PublishShadowRawPolicyEvaluationRow | null;
}): PublishShadowApprovalSummary {
  const row = input.approvalTimeline;
  const gateApprovalId = text(input.gateAttempt?.approval_decision_id) ?? text(input.policyEvaluation?.approval_decision_id);
  if (!row && !gateApprovalId) {
    return {
      launchSignoff: "not_required",
      publishActivation: "missing",
      approvalRequestId: text(input.gateAttempt?.approval_request_id) ?? text(input.policyEvaluation?.approval_request_id),
      approvalDecisionId: null,
      decisionStatus: null,
      scope: "publish_activation",
      expiresAt: null,
      createsApproval: false,
      limitations: ["missing_publish_activation_approval"],
    };
  }
  if (!row) {
    return {
      launchSignoff: "not_required",
      publishActivation: "unavailable",
      approvalRequestId: text(input.gateAttempt?.approval_request_id) ?? text(input.policyEvaluation?.approval_request_id),
      approvalDecisionId: gateApprovalId,
      decisionStatus: null,
      scope: "publish_activation",
      expiresAt: null,
      createsApproval: false,
      limitations: ["partial_aaf_approval_timeline"],
    };
  }
  const limitations = uniq([
    ...(row.scope !== "publish_activation" ? ["approval_wrong_scope"] : []),
    ...(!row.approval_decision_id ? ["approval_decision_missing"] : []),
    ...(row.decision_status !== "granted" && row.decision_status !== "not_required_by_policy" ? [`approval_status_${text(row.decision_status) ?? "missing"}`] : []),
    ...(arrayOfStrings(row.revocations_json).length > 0 ? ["approval_revoked"] : []),
    ...(arrayOfStrings(row.supersessions_json).length > 0 ? ["approval_superseded"] : []),
    ...(arrayOfStrings(row.partial_timeline_json).length > 0 ? ["partial_aaf_approval_timeline"] : []),
  ]);
  const publishActivation =
    row.scope !== "publish_activation"
      ? "wrong_scope"
      : limitations.length > 0
        ? "failed_or_stale"
        : "present";
  return {
    launchSignoff: "not_required",
    publishActivation,
    approvalRequestId: row.approval_request_id,
    approvalDecisionId: row.approval_decision_id,
    decisionStatus: row.decision_status,
    scope: row.scope,
    expiresAt: row.decision_expires_at ?? row.requested_expires_at,
    createsApproval: false,
    limitations,
  };
}

function evidenceSummary(input: {
  evidencePackage: PublishShadowRawEvidencePackageRow | null;
  sourceTruth: PublishShadowSourceTruthSummary[];
}): PublishShadowEvidenceSummary {
  return {
    evidencePackageId: input.evidencePackage?.id ?? null,
    packageStatus: input.evidencePackage?.status ?? null,
    packageType: input.evidencePackage?.package_type ?? null,
    evidenceCreatedAt: input.evidencePackage?.created_at ?? null,
    freshnessLabel: freshness(input.evidencePackage?.freshness_label),
    sourceWatermark: input.evidencePackage?.source_watermark ?? null,
    evidenceIdempotencyKey: input.evidencePackage?.idempotency_key ?? null,
    limitations: limitationCodesFromEvidence(input.evidencePackage),
    sourceRefs: input.sourceTruth,
  };
}

function gateSummary(input: {
  gateAttempt: PublishShadowRawGateAttemptRow | null;
  policyEvaluation: PublishShadowRawPolicyEvaluationRow | null;
  auditEvent: PublishShadowRawAuditEventRow | null;
  siteVersionId: string;
}): PublishShadowGateDryRunSummary {
  const blockers = uniq([
    ...arrayOfStrings(input.policyEvaluation?.blocker_codes),
    ...arrayOfStrings(objectValue(input.auditEvent?.payload_json).blockerCodes),
    ...(input.gateAttempt?.fail_closed_reason ? [input.gateAttempt.fail_closed_reason] : []),
  ]);
  return {
    dryRunOnly: true,
    actionKey: "publish.activation",
    scope: "publish_activation",
    subjectType: "site_version",
    subjectId: input.gateAttempt?.subject_id ?? input.policyEvaluation?.subject_id ?? input.siteVersionId,
    status: input.gateAttempt ? "evaluated" : "not_attempted",
    gateResult: input.gateAttempt?.gate_result ?? null,
    policyResult: input.policyEvaluation?.result ?? null,
    approvalDecisionId: input.gateAttempt?.approval_decision_id ?? input.policyEvaluation?.approval_decision_id ?? null,
    gateAttemptId: input.gateAttempt?.id ?? null,
    auditEventId: input.gateAttempt?.pre_action_audit_event_id ?? input.policyEvaluation?.audit_event_id ?? input.auditEvent?.id ?? null,
    gateDryRunIdempotencyKey: input.gateAttempt?.idempotency_key ?? null,
    blockedReasons: blockers,
    staleEvidenceReasons: blockers.filter((reason) => /stale|expired|superseded|watermark/i.test(reason)),
    missingSourceWatermarks: blockers.filter((reason) => /source_watermark_missing/i.test(reason)),
    warnings: ["dry_run_only_no_publish_execution"],
  };
}

function deriveStatus(input: {
  shadowEnabledState: PublishShadowEnabledState;
  evidencePackage: PublishShadowRawEvidencePackageRow | null;
  missing: readonly PublishShadowSourceKey[];
  stale: readonly PublishShadowSourceKey[];
  ddom: PublishShadowDdomReadinessSummary;
  publishTarget: PublishShadowPublishTargetSummary;
  approval: PublishShadowApprovalSummary;
  evidence: PublishShadowEvidenceSummary;
  gate: PublishShadowGateDryRunSummary;
  limitations: readonly string[];
}): PublishShadowStatus {
  if (input.shadowEnabledState === "disabled") return "shadow_not_enabled";
  if (!input.evidencePackage && !input.gate.gateAttemptId) return "shadow_not_available";
  if (input.limitations.some((item) => /source_reader_unavailable|source_reader_error/i.test(item))) {
    return "shadow_evaluation_failed";
  }
  if (input.publishTarget.status === "missing") return "shadow_missing_publish_target";
  if (input.ddom.status === "missing") return "shadow_missing_ddom_snapshot";
  if (input.ddom.status === "stale") return "shadow_stale_ddom_snapshot";
  if (input.approval.publishActivation === "missing") return "shadow_missing_publish_activation_approval";
  if (input.missing.length > 0) return "shadow_missing_source_truth";
  if (input.stale.length > 0 || input.publishTarget.status === "failed_or_stale") return "shadow_stale_source_truth";
  if (
    input.evidence.packageStatus === "invalid" ||
    input.gate.gateResult === "fail_closed" ||
    input.gate.gateResult === "audit_unavailable" ||
    input.gate.policyResult === "policy_error"
  ) {
    return "shadow_evaluation_failed";
  }
  if (input.gate.status === "unavailable") return "shadow_evaluation_failed";
  if (input.gate.gateResult && input.gate.gateResult !== "allowed" && input.gate.gateResult !== "not_required_by_policy") return "shadow_gate_not_ready";
  if (input.evidence.limitations.length > 0 || input.gate.warnings.length > 1 || input.ddom.warnings.length > 0) return "shadow_ready_with_warnings";
  return "shadow_ready";
}

function severity(status: PublishShadowStatus): PublishShadowSeverity {
  if (status === "shadow_not_enabled" || status === "shadow_ready") return "low";
  if (status === "shadow_not_available" || status === "shadow_ready_with_warnings") return "medium";
  return "high";
}

function nextAction(status: PublishShadowStatus, refs: string[]): PublishShadowRecommendedNextAction {
  const base = {
    safeNow: true,
    blocksCurrentPublish: false as const,
    requiredRefs: refs,
  };
  switch (status) {
    case "shadow_ready":
    case "shadow_not_enabled":
      return { ...base, actionKey: "none", ownerRole: "none", reason: `${status}_no_current_action`, blocksFutureEnforcementReadiness: false };
    case "shadow_ready_with_warnings":
      return { ...base, actionKey: "review_warnings", ownerRole: "technical_operator", reason: "shadow_ready_with_warnings", blocksFutureEnforcementReadiness: false };
    case "shadow_missing_ddom_snapshot":
      return {
        ...base,
        actionKey: "run_ddom_manual_trigger_outside_pasr",
        ownerRole: "technical_operator",
        reason: "missing_ddom_snapshot",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_stale_ddom_snapshot":
      return {
        ...base,
        actionKey: "refresh_stale_ddom_snapshot_outside_pasr",
        ownerRole: "technical_operator",
        reason: "stale_ddom_snapshot",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_missing_publish_target":
      return {
        ...base,
        actionKey: "configure_verify_publish_target_source_truth",
        ownerRole: "technical_operator",
        reason: "missing_publish_target",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_missing_publish_activation_approval":
      return {
        ...base,
        actionKey: "request_publish_activation_approval",
        ownerRole: "release_approver",
        reason: "missing_publish_activation_approval",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_missing_source_truth":
      return {
        ...base,
        actionKey: "review_source_reader_failure",
        ownerRole: "engineering",
        reason: "missing_source_truth",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_stale_source_truth":
      return {
        ...base,
        actionKey: "escalate_domain_dns_ambiguity",
        ownerRole: "technical_operator",
        reason: "stale_source_truth",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_gate_not_ready":
      return {
        ...base,
        actionKey: "review_gate_dry_run_failure",
        ownerRole: "technical_operator",
        reason: "gate_dry_run_not_ready",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_evaluation_failed":
      return {
        ...base,
        actionKey: "review_evidence_builder_failure",
        ownerRole: "engineering",
        reason: "shadow_evaluation_failed",
        blocksFutureEnforcementReadiness: true,
      };
    case "shadow_not_available":
      return {
        ...base,
        actionKey: "wait_for_shadow_observer_to_run",
        ownerRole: "technical_operator",
        reason: "shadow_observation_not_found",
        blocksFutureEnforcementReadiness: true,
      };
  }
}

function label(status: PublishShadowStatus): string {
  return `Shadow readiness: ${status}. Publish was not blocked; result is derived only.`;
}

function projectionFreshness(status: PublishShadowStatus): PublishShadowFreshnessState {
  if (status === "shadow_not_available" || status === "shadow_evaluation_failed") return "unavailable";
  if (status.includes("stale")) return "stale";
  if (status.includes("missing") || status === "shadow_ready_with_warnings") return "partial";
  return "fresh";
}

function limitationSummary(codes: readonly string[]): PublishShadowLimitationSummary[] {
  return uniq([
    ...codes,
    "shadow_only_publish_result_not_modified",
    "publish_action_not_blocked_by_shadow_gate",
    "derived_read_model_not_source_truth",
    "command_center_ops_inbox_derived_only",
    "ddom_readiness_not_publish_activation_approval",
    "pasr_must_not_create_ddom_snapshots",
  ]).map((code) => ({
    code,
    severity: /missing|stale|unavailable|failed|error|blocked/.test(code) ? "high" : "low",
    source: code.includes("ddom") ? "ddom" : code.includes("publish_target") ? "publish_target" : code.includes("aaf") || code.includes("approval") ? "aaf" : "projection",
    detail: null,
  }));
}

export function buildPublishShadowResultReadModel(snapshot: PublishShadowResultRepositorySnapshot): PublishShadowResultReadModel {
  const generatedAt = snapshot.input.generatedAt ?? new Date().toISOString();
  const sourceTruth = sourceSummaries(snapshot.sourceRefs);
  const missing = missingSourceTruth({ sourceTruth, evidencePackage: snapshot.evidencePackage });
  const stale = staleSourceTruth({
    sourceTruth,
    freshnessChecks: snapshot.freshnessChecks,
    gateAttempt: snapshot.gateAttempt,
    policyEvaluation: snapshot.policyEvaluation,
  });
  const ddom = ddomSummary({ ddomSnapshot: snapshot.ddomSnapshot, sourceTruth, missing });
  const publishTarget = publishTargetSummary({
    publishTarget: snapshot.publishTarget,
    sourceTruth,
    missing,
    intendedPublishTarget: snapshot.input.publishTargetId ?? snapshot.input.intendedPublishTarget ?? null,
  });
  const approval = approvalSummary({
    approvalTimeline: snapshot.approvalTimeline,
    gateAttempt: snapshot.gateAttempt,
    policyEvaluation: snapshot.policyEvaluation,
  });
  const evidence = evidenceSummary({ evidencePackage: snapshot.evidencePackage, sourceTruth });
  const gate = gateSummary({
    gateAttempt: snapshot.gateAttempt,
    policyEvaluation: snapshot.policyEvaluation,
    auditEvent: snapshot.auditEvent,
    siteVersionId: snapshot.input.siteVersionId,
  });
  const limitations = uniq([
    ...snapshot.limitations,
    ...evidence.limitations,
    ...approval.limitations,
    ...publishTarget.limitations,
    ...ddom.blockers,
    ...gate.blockedReasons,
    ...(snapshot.input.publishAttemptRef ? [] : ["durable_publish_attempt_id_unavailable_correlation_idempotency_fallback"]),
  ]);
  const shadowEnabledState = snapshot.input.shadowEnabledState ?? "unknown";
  const shadowStatus = deriveStatus({
    shadowEnabledState,
    evidencePackage: snapshot.evidencePackage,
    missing,
    stale,
    ddom,
    publishTarget,
    approval,
    evidence,
    gate,
    limitations,
  });
  const refs = uniq([
    snapshot.evidencePackage?.id,
    snapshot.gateAttempt?.id,
    snapshot.auditEvent?.id,
    approval.approvalRequestId,
    approval.approvalDecisionId,
    ddom.snapshotRef,
    publishTarget.sourceRef,
  ].flatMap((item) => (item ? [item] : [])));
  const sourceReadUnavailable = limitations.some((item) => /source_reader_unavailable|read_only_transaction_unavailable/i.test(item));
  const evidenceUnavailable = !snapshot.evidencePackage && (sourceReadUnavailable || limitations.some((item) => /evidence_builder/i.test(item)));
  const gateUnavailable = !snapshot.gateAttempt && Boolean(snapshot.evidencePackage);

  return {
    ...BASE_BOUNDARIES,
    readModelVersion: PUBLISH_SHADOW_RESULT_READ_MODEL_VERSION,
    generatedAt,
    projectionFreshness: projectionFreshness(shadowStatus),
    projectionLimitations: limitationSummary(limitations),
    roleVisibility: snapshot.input.roleVisibility ?? "technical_operator",
    shadowStatus,
    severity: severity(shadowStatus),
    operatorLabel: label(shadowStatus),
    recommendedNextAction: nextAction(shadowStatus, refs),
    emptyState: {
      isEmpty: shadowStatus === "shadow_not_enabled" || shadowStatus === "shadow_not_available",
      reason: shadowStatus === "shadow_not_enabled" ? "shadow_disabled" : shadowStatus === "shadow_not_available" ? "no_shadow_records" : "not_empty",
    },
    errorState: {
      hasError: shadowStatus === "shadow_evaluation_failed",
      errorCode: shadowStatus === "shadow_evaluation_failed" ? limitations.find((item) => /error|failed|unavailable|fail_closed/.test(item)) ?? "shadow_evaluation_failed" : null,
      safeMessage: shadowStatus === "shadow_evaluation_failed" ? "Shadow evaluation could not be reconstructed completely from persisted records." : null,
    },
    tenantId: snapshot.evidencePackage?.tenant_id ?? snapshot.gateAttempt?.tenant_id ?? snapshot.input.tenantId ?? null,
    clientId: snapshot.evidencePackage?.client_id ?? snapshot.gateAttempt?.client_id ?? snapshot.input.clientId ?? null,
    siteId: snapshot.input.siteId,
    siteVersionId: snapshot.input.siteVersionId,
    runtimeArtifactId: snapshot.runtimeContext.runtimeArtifact?.id ?? snapshot.input.runtimeArtifactId ?? null,
    publishAttemptRef: snapshot.input.publishAttemptRef ?? null,
    intendedPublishTarget: snapshot.input.intendedPublishTarget ?? snapshot.input.publishTargetId ?? publishTarget.publishTargetId,
    intendedPublishStage: snapshot.input.intendedPublishStage ?? publishTarget.publishStage,
    trustedPublishEnvironment: snapshot.input.trustedPublishEnvironment ?? publishTarget.environment,
    actorType: snapshot.gateAttempt?.actor_type ?? snapshot.input.actorType ?? null,
    actorId: snapshot.gateAttempt?.actor_id ?? snapshot.input.actorId ?? null,
    actorRole: snapshot.gateAttempt?.actor_role ?? snapshot.input.actorRole ?? null,
    shadowEnabledState,
    sourceReadStatus: {
      status: sourceReadUnavailable ? "unavailable" : snapshot.evidencePackage || sourceTruth.length > 0 ? "completed" : "not_attempted",
      warnings: uniq([...ddom.warnings, ...gate.warnings.filter((item) => item !== "dry_run_only_no_publish_execution")]),
      limitations,
    },
    evidenceBuildStatus: {
      status: evidenceUnavailable ? "unavailable" : snapshot.evidencePackage ? "built" : "not_attempted",
      evidencePackageId: evidence.evidencePackageId,
      missingSourceTruth: missing,
      staleSourceTruth: stale,
    },
    gateDryRunStatus: { ...gate, status: gateUnavailable ? "unavailable" : gate.status },
    readinessResult:
      shadowStatus === "shadow_ready" || shadowStatus === "shadow_ready_with_warnings"
        ? "ready"
        : shadowStatus === "shadow_not_available" || shadowStatus === "shadow_evaluation_failed"
          ? "unavailable"
          : "not_ready",
    missingSourceTruth: missing,
    staleSourceTruth: stale,
    sourceTruth,
    sourceWatermarks: Object.fromEntries(sourceTruth.map((source) => [source.sourceKey, source.currentWatermark])),
    sourceTruthSummary: {
      missingCount: missing.length,
      staleCount: stale.length,
      availableCount: sourceTruth.length,
    },
    ddomReadiness: ddom,
    publishTarget,
    approval,
    evidence,
    evidenceRefs: {
      evidencePackageId: evidence.evidencePackageId,
      gateAttemptId: gate.gateAttemptId,
      auditEventId: gate.auditEventId,
      approvalRequestId: approval.approvalRequestId,
      approvalDecisionId: approval.approvalDecisionId,
      ddomSnapshotRef: ddom.snapshotRef,
      publishTargetRef: publishTarget.sourceRef,
    },
    correlation: {
      correlationId: snapshot.evidencePackage?.correlation_id ?? snapshot.gateAttempt?.correlation_id ?? snapshot.input.correlationId ?? null,
      causationId: snapshot.evidencePackage?.causation_id ?? snapshot.gateAttempt?.causation_id ?? null,
      requestId: snapshot.evidencePackage?.request_id ?? snapshot.gateAttempt?.request_id ?? null,
      idempotencyKey: snapshot.input.idempotencyKey ?? snapshot.evidencePackage?.idempotency_key ?? snapshot.gateAttempt?.idempotency_key ?? null,
      shadowEvaluationId: (text(snapshot.input.correlationId) ?? text(snapshot.evidencePackage?.correlation_id))?.replace(/^pasr-2-shadow:/, "") ?? null,
      evidenceIdempotencyKey: evidence.evidenceIdempotencyKey,
      gateDryRunIdempotencyKey: gate.gateDryRunIdempotencyKey,
      publishAttemptRef: snapshot.input.publishAttemptRef ?? null,
      linkageStrategy: snapshot.input.publishAttemptRef ? "durable_publish_attempt" : "correlation_idempotency_fallback",
    },
    failureReason: limitations.find((item) => /error|failed|unavailable|fail_closed/.test(item)) ?? null,
    warnings: uniq([...ddom.warnings, ...gate.warnings]),
    limitations,
  };
}
