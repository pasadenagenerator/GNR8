import "server-only";

import { createHash } from "node:crypto";

import { AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE } from "@gnr8/runtime-contracts";

import {
  PublishActivationDecisionReadRepository,
  type PublishActivationDecisionReadRepositoryInput,
  type PublishActivationDecisionReadRepositoryLike,
  type PublishActivationDecisionReadRow,
  type PublishActivationDecisionReadSnapshot,
} from "./publish-activation-decision-read-repository";
import {
  PUBLISH_ACTIVATION_DECISION_EVIDENCE_LINK_ROLE,
  PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION,
} from "./publish-activation-decision-service";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE,
  PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
  type PublishActivationRequestSourceRef,
} from "./publish-activation-request-bridge";

export const PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION = "mvp-43-publish-activation-decision-read-model:v1" as const;

export const PUBLISH_ACTIVATION_DECISION_READ_BOUNDARY_FLAGS = {
  derivedOnly: true,
  mutatesSourceTruth: false,
  createsAafRecords: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  publishes: false,
  readyForPublishExecution: false,
} as const;

export const PUBLISH_ACTIVATION_DECISION_READ_STATUSES = [
  "not_requested",
  "request_pending",
  "decision_granted",
  "decision_granted_with_limitations",
  "decision_rejected",
  "decision_invalid",
  "decision_missing",
  "evidence_missing",
  "evidence_stale",
  "handoff_ready",
  "handoff_blocked",
  "read_failure",
] as const;

export type PublishActivationDecisionReadStatus = (typeof PUBLISH_ACTIVATION_DECISION_READ_STATUSES)[number];

export type PublishActivationDecisionNextAction =
  | "request_publish_activation"
  | "await_publish_activation_decision"
  | "review_rejected_decision"
  | "refresh_launch_readiness_evidence"
  | "resolve_publish_activation_blockers"
  | "prepare_gate_evaluation"
  | "no_action";

export type PublishActivationDecisionReadRef = PublishActivationRequestSourceRef & {
  role: string;
  sourceRef: string | null;
};

export type PublishActivationDecisionReadIdentity = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
};

export type PublishActivationDecisionReadValidationSummary = {
  valid: boolean;
  status: PublishActivationDecisionReadStatus;
  blockerCodes: string[];
  missingCodes: string[];
  staleCodes: string[];
  warningCodes: string[];
};

export type PublishActivationDecisionReadModel = {
  readModelVersion: typeof PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION;
  identity: PublishActivationDecisionReadIdentity;
  transactionCapturedAt: string | null;
  publishActivationRequest: {
    id: string | null;
    ref: string | null;
    scope: string | null;
    action: typeof PUBLISH_ACTIVATION_REQUEST_ACTION;
    subjectType: string | null;
    subjectId: string | null;
    status: string | null;
    policyVersion: string | null;
    semanticWatermark: string | null;
    requestedExpiresAt: string | null;
  };
  publishActivationDecision: {
    id: string | null;
    ref: string | null;
    status: string | null;
    policyVersion: string | null;
    semanticWatermark: string | null;
    decidedAt: string | null;
    expiresAt: string | null;
    limitations: unknown[];
  };
  launchReadinessEvidence: {
    packageId: string | null;
    packageRef: string | null;
    packageType: string | null;
    subjectType: string | null;
    subjectId: string | null;
    status: string | null;
    freshnessLabel: string | null;
    sourceWatermark: string | null;
    contentHash: string | null;
    readinessStatus: string | null;
    payloadSemanticWatermarks: Record<string, string | null>;
  };
  improvedCandidateSiteVersionRef: PublishActivationDecisionReadRef | null;
  runtimeArtifactRef: PublishActivationDecisionReadRef | null;
  publishTargetRef: PublishActivationDecisionReadRef | null;
  readinessLimitations: unknown[];
  decisionLimitations: unknown[];
  evidenceFreshnessStatus: {
    status: string | null;
    currentSourceWatermark: string | null;
    expiresAt: string | null;
    rowsRead: number;
  };
  policyMetadata: {
    requestPolicyEvaluationId: string | null;
    decisionPolicyEvaluationId: string | null;
    requestPolicyResult: string | null;
    policyVersion: string | null;
    action: string | null;
    scope: string | null;
  };
  sourceRefs: PublishActivationDecisionReadRef[];
  auditRefs: PublishActivationDecisionReadRef[];
  diagnostics: {
    blockers: string[];
    missing: string[];
    stale: string[];
    warnings: string[];
    conflictingDecisionIds: string[];
  };
  validationSummary: PublishActivationDecisionReadValidationSummary;
  nextAction: PublishActivationDecisionNextAction;
  semanticWatermark: string;
  flags: typeof PUBLISH_ACTIVATION_DECISION_READ_BOUNDARY_FLAGS & {
    publishActivationApproved: boolean;
    readyForGateEvaluation: boolean;
  };
};

export type BuildPublishActivationDecisionReadModelInput = PublishActivationDecisionReadRepositoryInput & {
  expectedRequestWatermark?: string | null;
  expectedLaunchReadinessEvidenceWatermark?: string | null;
  improvedCandidateSiteVersionRef?: PublishActivationRequestSourceRef | null;
  improvedRuntimeArtifactRef?: PublishActivationRequestSourceRef | null;
  publishTargetRef?: PublishActivationRequestSourceRef | null;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function stableJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

export function stablePublishActivationDecisionReadJson(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

export function hashPublishActivationDecisionReadValue(value: unknown): string {
  return createHash("sha256").update(stablePublishActivationDecisionReadJson(value)).digest("hex");
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function rowText(row: PublishActivationDecisionReadRow | null | undefined, field: string): string | null {
  return text(row?.[field]);
}

function sourceId(refOrId: string | null | undefined): string | null {
  const normalized = text(refOrId);
  if (!normalized) return null;
  const parts = normalized.split(":");
  return parts[parts.length - 1] || normalized;
}

function rowRef(row: PublishActivationDecisionReadRow, role: string): PublishActivationDecisionReadRef {
  return {
    role,
    sourceSystem: rowText(row, "source_system") ?? "gnr8",
    sourceTable: rowText(row, "source_table") ?? "unknown_source_table",
    sourceRecordId: rowText(row, "source_record_id") ?? "unknown_source_record",
    sourceVersion: rowText(row, "source_version"),
    sourceWatermark: rowText(row, "source_watermark") ?? "",
    sourceRef: rowText(row, "snapshot_ref") ?? rowText(row, "source_ref"),
    contentHash: rowText(row, "hash"),
    metadataJson: jsonObject(row.metadata_json),
  };
}

function roleFromRow(row: PublishActivationDecisionReadRow): string | null {
  const metadata = jsonObject(row.metadata_json);
  return text(metadata.refRole) ?? text(metadata.bridgeSubjectRole) ?? text(metadata.bridgeEvidenceRole) ?? text(row.ref_role);
}

function refFromRows(rows: readonly PublishActivationDecisionReadRow[], role: string): PublishActivationDecisionReadRef | null {
  const row = rows.find((entry) => roleFromRow(entry) === role);
  return row ? rowRef(row, role) : null;
}

function refFromPayload(payload: Record<string, unknown>, role: string): PublishActivationDecisionReadRef | null {
  const sourceRefs = jsonObject(payload.sourceRefs);
  const refs = jsonArray(sourceRefs[role]).map(jsonObject);
  const ref = refs[0];
  if (!ref) return null;
  return {
    role,
    sourceSystem: text(ref.sourceSystem) ?? "gnr8",
    sourceTable: text(ref.sourceTable) ?? "unknown_source_table",
    sourceRecordId: text(ref.sourceRecordId) ?? "unknown_source_record",
    sourceVersion: text(ref.sourceVersion),
    sourceWatermark: text(ref.sourceWatermark) ?? "",
    sourceRef: text(ref.sourceRef),
    contentHash: text(ref.contentHash),
    metadataJson: jsonObject(ref.metadataJson),
  };
}

function hasOpenP0Blocker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasOpenP0Blocker);
  if (!value || typeof value !== "object") {
    const normalized = text(value);
    return Boolean(normalized && /open[_ -]?p0|p0[_ -]?blocker/.test(normalized));
  }
  const record = value as Record<string, unknown>;
  if (text(record.severity) === "p0_blocker" && text(record.status) === "open") return true;
  return Object.values(record).some(hasOpenP0Blocker);
}

function payloadLimitations(payload: Record<string, unknown>): unknown[] {
  return [
    ...jsonArray(payload.acceptedLimitations),
    ...jsonArray(payload.unresolvedNonP0Blockers),
    ...jsonArray(jsonObject(payload.readinessCloseout).finalLimitations),
  ];
}

function decisionLimitations(snapshot: PublishActivationDecisionReadSnapshot, evidenceLimitations: readonly unknown[]): unknown[] {
  const auditPayload = jsonObject(snapshot.auditEvents.find((event) => rowText(event, "approval_decision_id") === rowText(snapshot.selectedDecision, "id"))?.payload_json);
  const fromAudit = jsonArray(auditPayload.limitationsCarriedForward);
  if (fromAudit.length > 0) return fromAudit;
  return rowText(snapshot.selectedDecision, "status") === "granted_with_limitations" ? [...evidenceLimitations] : [];
}

function requestSemanticWatermark(request: PublishActivationDecisionReadRow | null): string | null {
  return text(jsonObject(request?.reason).semanticWatermark) ?? text(request?.source_watermark) ?? null;
}

function decisionSemanticWatermark(snapshot: PublishActivationDecisionReadSnapshot): string | null {
  const decisionId = rowText(snapshot.selectedDecision, "id");
  const auditPayload = jsonObject(snapshot.auditEvents.find((event) => rowText(event, "approval_decision_id") === decisionId)?.payload_json);
  return text(auditPayload.semanticWatermark) ?? null;
}

function requestPolicyRow(snapshot: PublishActivationDecisionReadSnapshot): PublishActivationDecisionReadRow | null {
  return (
    snapshot.policyRows.find(
      (row) =>
        rowText(row, "approval_request_id") === rowText(snapshot.request, "id") &&
        rowText(row, "scope") === PUBLISH_ACTIVATION_REQUEST_SCOPE &&
        rowText(row, "action_key") === PUBLISH_ACTIVATION_REQUEST_ACTION,
    ) ?? null
  );
}

function validationCodes(
  input: BuildPublishActivationDecisionReadModelInput,
  snapshot: PublishActivationDecisionReadSnapshot,
  refs: {
    candidate: PublishActivationDecisionReadRef | null;
    artifact: PublishActivationDecisionReadRef | null;
    publishTarget: PublishActivationDecisionReadRef | null;
  },
): { blockers: string[]; missing: string[]; stale: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const missing: string[] = [];
  const stale: string[] = [];
  const warnings: string[] = [];
  const request = snapshot.request;
  const decision = snapshot.selectedDecision;
  const evidence = snapshot.evidencePackage;
  const payload = jsonObject(evidence?.limitations_json);
  const identity = jsonObject(payload.identity);
  const latestFreshness = snapshot.freshnessRows[0] ?? null;
  const policy = requestPolicyRow(snapshot);

  if (!request) missing.push("publish_activation_request_missing");
  if (request) {
    if (rowText(request, "tenant_id") !== input.tenantId) blockers.push("request_tenant_id_mismatch");
    if (rowText(request, "client_id") !== input.clientId) blockers.push("request_client_id_mismatch");
    if (rowText(request, "site_id") !== input.siteId) blockers.push("request_site_id_mismatch");
    if (rowText(request, "scope") !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("request_scope_mismatch");
    if (rowText(request, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("request_subject_type_mismatch");
    if (rowText(request, "status") !== "requested") blockers.push(`request_status_${rowText(request, "status") ?? "missing"}`);
    const expectedCandidate = sourceId(input.improvedCandidateSiteVersionRef?.sourceRecordId ?? input.candidateSiteVersionId);
    if (expectedCandidate && rowText(request, "subject_id") !== expectedCandidate) blockers.push("request_subject_mismatch");
    if (input.expectedRequestWatermark && requestSemanticWatermark(request) && requestSemanticWatermark(request) !== input.expectedRequestWatermark) stale.push("expected_request_watermark_mismatch");
  }

  if (!policy) missing.push("request_policy_evaluation_missing");
  if (policy) {
    if (rowText(policy, "result") !== "approval_required") blockers.push("request_policy_row_not_approval_required");
    if (rowText(policy, "scope") !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("request_policy_scope_mismatch");
    if (rowText(policy, "action_key") !== PUBLISH_ACTIVATION_REQUEST_ACTION) blockers.push("request_policy_action_mismatch");
    if (rowText(policy, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("request_policy_subject_type_mismatch");
  }

  if (!snapshot.requestEvidenceLinks.some((link) => rowText(link, "link_role") === PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE)) {
    missing.push("request_launch_readiness_evidence_link_missing");
  }

  if (!decision) missing.push("publish_activation_decision_missing");
  if (decision) {
    const status = rowText(decision, "status");
    if (rowText(decision, "approval_request_id") !== rowText(request, "id")) blockers.push("decision_request_mismatch");
    if (!["granted", "granted_with_limitations"].includes(String(status))) blockers.push(`approval_${status ?? "invalid"}`);
    const expiresAt = text(decision.expires_at);
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) stale.push("approval_expired");
    if (decision.revoked === true) blockers.push("approval_revoked");
    if (decision.superseded === true) blockers.push("approval_superseded");
    if (!snapshot.decisionEvidenceLinks.some((link) => rowText(link, "link_role") === PUBLISH_ACTIVATION_DECISION_EVIDENCE_LINK_ROLE)) {
      missing.push("decision_launch_readiness_evidence_link_missing");
    }
  }

  if (snapshot.conflictingDecisions.length > 0) blockers.push("conflicting_active_publish_activation_decisions");

  if (!evidence) missing.push("launch_readiness_evidence_package_missing");
  if (evidence) {
    if (rowText(evidence, "package_type") !== AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE) blockers.push("evidence_type_mismatch");
    if (rowText(evidence, "subject_type") !== "single_site_launch_readiness_package") blockers.push("evidence_subject_type_mismatch");
    if (rowText(evidence, "tenant_id") !== input.tenantId) blockers.push("evidence_tenant_id_mismatch");
    if (rowText(evidence, "client_id") !== input.clientId) blockers.push("evidence_client_id_mismatch");
    if (rowText(evidence, "site_id") !== input.siteId) blockers.push("evidence_site_id_mismatch");
    if (["invalid", "superseded"].includes(String(rowText(evidence, "status")))) blockers.push(`evidence_${rowText(evidence, "status")}`);
    if (!["fresh", "partial_timeline"].includes(String(rowText(evidence, "freshness_label")))) stale.push(`evidence_freshness_${rowText(evidence, "freshness_label") ?? "missing"}`);
    if (input.expectedLaunchReadinessEvidenceWatermark && rowText(evidence, "source_watermark") !== input.expectedLaunchReadinessEvidenceWatermark) {
      stale.push("expected_launch_readiness_evidence_watermark_mismatch");
    }
    if (identity.tenantId !== input.tenantId) blockers.push("payload_tenant_id_mismatch");
    if (identity.clientId !== input.clientId) blockers.push("payload_client_id_mismatch");
    if (identity.siteId !== input.siteId) blockers.push("payload_site_id_mismatch");
    if (identity.migrationId !== input.migrationId) blockers.push("payload_migration_id_mismatch");
    if (!["ready", "ready_with_limitations"].includes(String(text(payload.readinessStatus)))) blockers.push(`readiness_status_${text(payload.readinessStatus) ?? "missing"}`);
    if (jsonArray(payload.blockedDimensions).length > 0) blockers.push("blocked_dimensions_present");
    if (hasOpenP0Blocker(payload)) blockers.push("open_p0_blocker_present");
  }

  if (!latestFreshness) {
    missing.push("freshness_check_missing");
  } else {
    const result = rowText(latestFreshness, "result");
    if (!["fresh", "partial_timeline"].includes(String(result))) stale.push(`freshness_check_${result ?? "missing"}`);
    if (rowText(latestFreshness, "current_source_watermark") !== rowText(evidence, "source_watermark")) stale.push("freshness_watermark_mismatch");
    const expiresAt = text(latestFreshness.expires_at);
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) stale.push("freshness_expired");
  }

  if (!refs.candidate || !text(refs.candidate.sourceWatermark)) missing.push("improved_candidate_site_version_ref_missing");
  if (!refs.artifact || !text(refs.artifact.sourceWatermark)) missing.push("improved_runtime_artifact_ref_missing");
  if (!refs.publishTarget || !text(refs.publishTarget.sourceWatermark)) missing.push("publish_target_ref_missing");
  if (input.improvedCandidateSiteVersionRef && refs.candidate && !sameExpectedRef(input.improvedCandidateSiteVersionRef, refs.candidate)) stale.push("improved_candidate_site_version_ref_mismatch");
  if (input.improvedRuntimeArtifactRef && refs.artifact && !sameExpectedRef(input.improvedRuntimeArtifactRef, refs.artifact)) stale.push("improved_runtime_artifact_ref_mismatch");
  if (input.publishTargetRef && refs.publishTarget && !sameExpectedRef(input.publishTargetRef, refs.publishTarget)) stale.push("publish_target_ref_mismatch");

  if (snapshot.publishTarget && rowText(snapshot.publishTarget, "status") && rowText(snapshot.publishTarget, "status") !== "active") {
    warnings.push(`publish_target_status_${rowText(snapshot.publishTarget, "status")}`);
  }

  return {
    blockers: uniqueSorted(blockers),
    missing: uniqueSorted(missing),
    stale: uniqueSorted(stale),
    warnings: uniqueSorted(warnings),
  };
}

function sameExpectedRef(expected: PublishActivationRequestSourceRef, actual: PublishActivationDecisionReadRef): boolean {
  return (
    text(expected.sourceTable) === text(actual.sourceTable) &&
    text(expected.sourceRecordId) === text(actual.sourceRecordId) &&
    text(expected.sourceWatermark) === text(actual.sourceWatermark)
  );
}

function statusFromCodes(
  decisionStatus: string | null,
  codes: { blockers: readonly string[]; missing: readonly string[]; stale: readonly string[] },
): PublishActivationDecisionReadStatus {
  if (codes.missing.includes("publish_activation_request_missing")) return "not_requested";
  if (codes.missing.includes("launch_readiness_evidence_package_missing")) return "evidence_missing";
  if (codes.missing.includes("publish_activation_decision_missing")) return "decision_missing";
  if (codes.stale.length > 0) return "evidence_stale";
  if (decisionStatus === "rejected") return "decision_rejected";
  if (codes.missing.length > 0) return "handoff_blocked";
  if (codes.blockers.length > 0) return "handoff_blocked";
  if (decisionStatus === "granted_with_limitations") return "decision_granted_with_limitations";
  if (decisionStatus === "granted") return "handoff_ready";
  return "request_pending";
}

function nextAction(status: PublishActivationDecisionReadStatus, decisionStatus: string | null): PublishActivationDecisionNextAction {
  if (status === "not_requested") return "request_publish_activation";
  if (status === "decision_missing" || status === "request_pending") return "await_publish_activation_decision";
  if (decisionStatus === "rejected" || status === "decision_rejected") return "review_rejected_decision";
  if (status === "evidence_missing" || status === "evidence_stale") return "refresh_launch_readiness_evidence";
  if (status === "handoff_blocked" || status === "decision_invalid") return "resolve_publish_activation_blockers";
  if (status === "handoff_ready" || status === "decision_granted" || status === "decision_granted_with_limitations") return "prepare_gate_evaluation";
  return "no_action";
}

function semanticWatermark(model: Omit<PublishActivationDecisionReadModel, "semanticWatermark" | "transactionCapturedAt">): string {
  return `single-site-publish-activation-decision-read:${hashPublishActivationDecisionReadValue({
    readModelVersion: PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION,
    request: model.publishActivationRequest,
    decision: model.publishActivationDecision,
    launchReadinessEvidence: model.launchReadinessEvidence,
    candidate: model.improvedCandidateSiteVersionRef,
    artifact: model.runtimeArtifactRef,
    publishTarget: model.publishTargetRef,
    readinessLimitations: model.readinessLimitations,
    decisionLimitations: model.decisionLimitations,
    freshness: model.evidenceFreshnessStatus,
    policy: model.policyMetadata,
    diagnostics: model.diagnostics,
    flags: model.flags,
  })}`;
}

export function buildPublishActivationDecisionReadModelFromSnapshot(
  input: BuildPublishActivationDecisionReadModelInput,
  snapshot: PublishActivationDecisionReadSnapshot,
): PublishActivationDecisionReadModel {
  const payload = jsonObject(snapshot.evidencePackage?.limitations_json);
  const request = snapshot.request;
  const decision = snapshot.selectedDecision;
  const candidate = refFromRows(snapshot.evidenceSourceRefs, "improved_candidate_site_version") ?? refFromPayload(payload, "improved_candidate_site_version");
  const artifact = refFromRows(snapshot.evidenceSourceRefs, "improved_runtime_artifact") ?? refFromPayload(payload, "improved_runtime_artifact");
  const publishTarget = refFromRows(snapshot.evidenceSourceRefs, "publish_target") ?? refFromPayload(payload, "publish_target");
  const codes = validationCodes(input, snapshot, { candidate, artifact, publishTarget });
  const decisionStatus = rowText(decision, "status");
  const status = statusFromCodes(decisionStatus, codes);
  const readyForGateEvaluation = ["handoff_ready", "decision_granted_with_limitations"].includes(status) || (status === "decision_granted" && codes.blockers.length === 0);
  const publishActivationApproved = readyForGateEvaluation && ["granted", "granted_with_limitations"].includes(String(decisionStatus));
  const freshness = snapshot.freshnessRows[0] ?? null;
  const policy = requestPolicyRow(snapshot);
  const readinessLimitations = payloadLimitations(payload);
  const carriedDecisionLimitations = decisionLimitations(snapshot, readinessLimitations);
  const sourceRefs = [candidate, artifact, publishTarget].filter((ref): ref is PublishActivationDecisionReadRef => Boolean(ref));
  const auditRefs = snapshot.auditRefs.map((row) => ({
    role: rowText(row, "ref_role") ?? "audit_ref",
    sourceSystem: rowText(row, "source_system") ?? "gnr8",
    sourceTable: rowText(row, "source_table") ?? "gnr8_aaf_audit_event_refs",
    sourceRecordId: rowText(row, "ref_id") ?? "unknown_ref",
    sourceVersion: rowText(row, "ref_version"),
    sourceWatermark: rowText(row, "source_watermark") ?? "",
    sourceRef: rowText(row, "ref_id"),
    metadataJson: jsonObject(row.metadata_json),
  }));
  const base = {
    readModelVersion: PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION,
    identity: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
    },
    publishActivationRequest: {
      id: rowText(request, "id"),
      ref: rowText(request, "id") ? `aaf:approval_request:${rowText(request, "id")}` : null,
      scope: rowText(request, "scope"),
      action: PUBLISH_ACTIVATION_REQUEST_ACTION,
      subjectType: rowText(request, "subject_type"),
      subjectId: rowText(request, "subject_id"),
      status: rowText(request, "status"),
      policyVersion: rowText(request, "policy_version"),
      semanticWatermark: requestSemanticWatermark(request),
      requestedExpiresAt: rowText(request, "requested_expires_at"),
    },
    publishActivationDecision: {
      id: rowText(decision, "id"),
      ref: rowText(decision, "id") ? `aaf:approval_decision:${rowText(decision, "id")}` : null,
      status: decisionStatus,
      policyVersion: rowText(decision, "policy_version"),
      semanticWatermark: decisionSemanticWatermark(snapshot),
      decidedAt: rowText(decision, "decided_at"),
      expiresAt: rowText(decision, "expires_at"),
      limitations: carriedDecisionLimitations,
    },
    launchReadinessEvidence: {
      packageId: rowText(snapshot.evidencePackage, "id"),
      packageRef: rowText(snapshot.evidencePackage, "id") ? `aaf:evidence_package:${rowText(snapshot.evidencePackage, "id")}` : null,
      packageType: rowText(snapshot.evidencePackage, "package_type"),
      subjectType: rowText(snapshot.evidencePackage, "subject_type"),
      subjectId: rowText(snapshot.evidencePackage, "subject_id"),
      status: rowText(snapshot.evidencePackage, "status"),
      freshnessLabel: rowText(snapshot.evidencePackage, "freshness_label"),
      sourceWatermark: rowText(snapshot.evidencePackage, "source_watermark"),
      contentHash: rowText(snapshot.evidencePackage, "content_hash"),
      readinessStatus: text(payload.readinessStatus),
      payloadSemanticWatermarks: Object.fromEntries(Object.entries(jsonObject(payload.sourceWatermarks)).map(([key, value]) => [key, text(value)])),
    },
    improvedCandidateSiteVersionRef: candidate,
    runtimeArtifactRef: artifact,
    publishTargetRef: publishTarget,
    readinessLimitations,
    decisionLimitations: carriedDecisionLimitations,
    evidenceFreshnessStatus: {
      status: rowText(freshness, "result") ?? rowText(snapshot.evidencePackage, "freshness_label"),
      currentSourceWatermark: rowText(freshness, "current_source_watermark"),
      expiresAt: rowText(freshness, "expires_at"),
      rowsRead: snapshot.freshnessRows.length,
    },
    policyMetadata: {
      requestPolicyEvaluationId: rowText(policy, "id"),
      decisionPolicyEvaluationId: rowText(decision, "policy_evaluation_id"),
      requestPolicyResult: rowText(policy, "result"),
      policyVersion: rowText(policy, "policy_version") ?? rowText(request, "policy_version") ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
      action: rowText(policy, "action_key"),
      scope: rowText(policy, "scope"),
    },
    sourceRefs,
    auditRefs,
    diagnostics: {
      blockers: codes.blockers,
      missing: codes.missing,
      stale: codes.stale,
      warnings: codes.warnings,
      conflictingDecisionIds: snapshot.conflictingDecisions.map((row) => rowText(row, "id")).filter((value): value is string => Boolean(value)),
    },
    validationSummary: {
      valid: readyForGateEvaluation,
      status,
      blockerCodes: uniqueSorted([...codes.blockers, ...codes.missing, ...codes.stale]),
      missingCodes: codes.missing,
      staleCodes: codes.stale,
      warningCodes: codes.warnings,
    },
    nextAction: nextAction(status, decisionStatus),
    flags: {
      ...PUBLISH_ACTIVATION_DECISION_READ_BOUNDARY_FLAGS,
      publishActivationApproved,
      readyForGateEvaluation,
    },
  } satisfies Omit<PublishActivationDecisionReadModel, "semanticWatermark" | "transactionCapturedAt">;

  return {
    ...base,
    transactionCapturedAt: snapshot.transactionCapturedAt,
    semanticWatermark: semanticWatermark(base),
  };
}

export async function buildPublishActivationDecisionReadModel(
  input: BuildPublishActivationDecisionReadModelInput,
  repository: PublishActivationDecisionReadRepositoryLike = new PublishActivationDecisionReadRepository(),
): Promise<PublishActivationDecisionReadModel> {
  try {
    return buildPublishActivationDecisionReadModelFromSnapshot(input, await repository.readSnapshot(input));
  } catch (error) {
    const status: PublishActivationDecisionReadStatus = "read_failure";
    const message = error instanceof Error ? error.message : String(error);
    const base = {
      readModelVersion: PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION,
      identity: { tenantId: input.tenantId, clientId: input.clientId, siteId: input.siteId, migrationId: input.migrationId },
      publishActivationRequest: { id: null, ref: null, scope: null, action: PUBLISH_ACTIVATION_REQUEST_ACTION, subjectType: null, subjectId: null, status: null, policyVersion: null, semanticWatermark: null, requestedExpiresAt: null },
      publishActivationDecision: { id: null, ref: null, status: null, policyVersion: null, semanticWatermark: null, decidedAt: null, expiresAt: null, limitations: [] },
      launchReadinessEvidence: { packageId: null, packageRef: null, packageType: null, subjectType: null, subjectId: null, status: null, freshnessLabel: null, sourceWatermark: null, contentHash: null, readinessStatus: null, payloadSemanticWatermarks: {} },
      improvedCandidateSiteVersionRef: null,
      runtimeArtifactRef: null,
      publishTargetRef: null,
      readinessLimitations: [],
      decisionLimitations: [],
      evidenceFreshnessStatus: { status: null, currentSourceWatermark: null, expiresAt: null, rowsRead: 0 },
      policyMetadata: { requestPolicyEvaluationId: null, decisionPolicyEvaluationId: null, requestPolicyResult: null, policyVersion: null, action: null, scope: null },
      sourceRefs: [],
      auditRefs: [],
      diagnostics: { blockers: ["read_failure"], missing: [], stale: [], warnings: [message], conflictingDecisionIds: [] },
      validationSummary: { valid: false, status, blockerCodes: ["read_failure"], missingCodes: [], staleCodes: [], warningCodes: [message] },
      nextAction: "resolve_publish_activation_blockers" as const,
      flags: { ...PUBLISH_ACTIVATION_DECISION_READ_BOUNDARY_FLAGS, publishActivationApproved: false, readyForGateEvaluation: false },
    } satisfies Omit<PublishActivationDecisionReadModel, "semanticWatermark" | "transactionCapturedAt">;
    return { ...base, transactionCapturedAt: null, semanticWatermark: semanticWatermark(base) };
  }
}

export const PUBLISH_ACTIVATION_DECISION_READ_MODEL_REVIEWED_WRITER_VERSION = PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION;
