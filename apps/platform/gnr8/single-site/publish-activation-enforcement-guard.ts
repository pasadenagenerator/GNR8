import "server-only";

import type { Pool } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { AafGateResult, AafPolicyEvaluationResult } from "@gnr8/runtime-contracts";
import type { AafActorType, AafPgClient } from "../aaf/aaf-writer-repository";
import {
  PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
  type PublishActivationGateEvaluationResult,
} from "./publish-activation-gate-evaluator";
import {
  hashPublishActivationDecisionReadValue,
  type PublishActivationDecisionReadRef,
} from "./publish-activation-decision-read-model";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
} from "./publish-activation-request-bridge";

export const PUBLISH_ACTIVATION_ENFORCEMENT_GUARD_VERSION = "mvp-46-publish-activation-enforcement-guard:v1" as const;

export const PUBLISH_ACTIVATION_ENFORCEMENT_GUARD_FLAGS = {
  readOnly: true,
  enforcementEvaluated: true,
  enforcementApplied: false,
  publishes: false,
  runtimeMutation: false,
  providerCalls: false,
  createsAafRecords: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  pasrInvoked: false,
} as const;

export type PublishActivationEnforcementGuardMode = "pass" | "block" | "bypass" | "error";

export type PublishActivationEnforcementGuardActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type PublishActivationEnforcementGuardRef = PublishActivationDecisionReadRef | {
  role?: string | null;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceRef?: string | null;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  contentHash?: string | null;
  metadataJson?: Record<string, unknown>;
};

export type PublishActivationPersistedGateResultRef = {
  gateAttemptId: string | null;
  gateAttemptRef?: string | null;
  gateResult: AafGateResult | string | null;
  evaluationStatus?: PublishActivationGateEvaluationResult["evaluationStatus"] | string | null;
  policyResult?: AafPolicyEvaluationResult | string | null;
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  evidencePackageId?: string | null;
  policyEvaluationId?: string | null;
  auditEventId?: string | null;
  scope?: string | null;
  action?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  tenantId?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  migrationId?: string | null;
  candidateSiteVersionRef?: PublishActivationEnforcementGuardRef | string | null;
  runtimeArtifactRef?: PublishActivationEnforcementGuardRef | string | null;
  publishTargetRef?: PublishActivationEnforcementGuardRef | string | null;
  publishStage?: string | null;
  publishEnvironment?: string | null;
  semanticHandoffWatermark?: string | null;
  semanticGateInputWatermark?: string | null;
  blockerCodes?: readonly string[] | null;
  warnings?: readonly string[] | null;
  limitations?: PublishActivationGateEvaluationResult["limitations"] | readonly unknown[] | null;
  createdAt?: string | Date | null;
  completedAt?: string | Date | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type PublishActivationEnforcementGuardPolicy = {
  maxGateAgeMs?: number | null;
  allowWarningsWithLimitations?: boolean;
  expectedGateResult?: "allowed";
  rereadAaf?: boolean;
  rereadPublishTarget?: boolean;
  detectConflictingNewerGate?: boolean;
  emergencyBypass?: {
    enabled?: boolean;
  } | null;
};

export type PublishActivationEnforcementGuardBypassInput = {
  requested?: boolean;
  reason?: string | null;
};

export type EvaluatePublishActivationEnforcementGuardInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  candidateSiteVersionRef: PublishActivationEnforcementGuardRef | string | null;
  runtimeArtifactRef: PublishActivationEnforcementGuardRef | string | null;
  publishTargetRef: PublishActivationEnforcementGuardRef | string | null;
  publishStage: string;
  publishEnvironment: string;
  publishActivationDecisionRef: {
    id: string | null;
    ref?: string | null;
    status?: string | null;
  };
  gateAttemptResultRef: PublishActivationPersistedGateResultRef | PublishActivationGateEvaluationResult | null;
  handoffWatermark: string;
  gateInputWatermark: string;
  actor: PublishActivationEnforcementGuardActor;
  correlationId: string;
  idempotencyKey: string;
  requestId?: string | null;
  evaluatedAt?: string | Date | null;
  policy?: PublishActivationEnforcementGuardPolicy;
  bypass?: PublishActivationEnforcementGuardBypassInput | null;
  repositorySnapshot?: PublishActivationEnforcementGuardRepositorySnapshot | null;
};

export type ReadAndEvaluatePublishActivationEnforcementGuardInput = Omit<EvaluatePublishActivationEnforcementGuardInput, "repositorySnapshot"> & {
  repository?: PublishActivationEnforcementGuardReadRepositoryLike;
};

export type PublishActivationEnforcementGuardRow = Record<string, unknown>;

export type PublishActivationEnforcementGuardRepositorySnapshot = {
  transactionCapturedAt: string;
  gateAttempt: PublishActivationEnforcementGuardRow | null;
  conflictingNewerGateAttempts: PublishActivationEnforcementGuardRow[];
  approvalRequest: PublishActivationEnforcementGuardRow | null;
  approvalDecision: PublishActivationEnforcementGuardRow | null;
  approvalRevoked: boolean;
  approvalSuperseded: boolean;
  publishTarget: PublishActivationEnforcementGuardRow | null;
};

export type PublishActivationEnforcementGuardReadRepositoryLike = {
  readSnapshot(input: EvaluatePublishActivationEnforcementGuardInput): Promise<PublishActivationEnforcementGuardRepositorySnapshot>;
};

export type PublishActivationEnforcementGuardFreshnessSummary = {
  evaluatedAt: string;
  gateCompletedAt: string | null;
  gateCreatedAt: string | null;
  maxGateAgeMs: number;
  ageMs: number | null;
  fresh: boolean;
};

export type PublishActivationEnforcementGuardResult = {
  allowed: boolean;
  mode: PublishActivationEnforcementGuardMode;
  reason: string;
  blockerCodes: string[];
  warnings: string[];
  limitations: unknown[];
  bypassUsed: boolean;
  matchedRefs: {
    tenantId: string | null;
    clientId: string | null;
    siteId: string | null;
    migrationId: string | null;
    candidateSiteVersionId: string | null;
    runtimeArtifactId: string | null;
    publishTargetId: string | null;
    publishStage: string | null;
    publishEnvironment: string | null;
    publishActivationDecisionId: string | null;
    gateAttemptId: string | null;
  };
  freshnessSummary: PublishActivationEnforcementGuardFreshnessSummary;
  semanticGuardInputWatermark: string;
  sourceRefs: Record<string, string | null>;
  diagnosticRefs: Record<string, string | null>;
  flags: typeof PUBLISH_ACTIVATION_ENFORCEMENT_GUARD_FLAGS & {
    publishActionBlockedWouldBlockIfWired: boolean;
    publishActionBlocked: boolean;
    bypassUsed: boolean;
  };
};

export class PublishActivationEnforcementGuardReadRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";
    super(`${message}${causeMessage}`);
    this.name = "PublishActivationEnforcementGuardReadRepositoryError";
  }
}

const DEFAULT_MAX_GATE_AGE_MS = 24 * 60 * 60 * 1000;
const BLOCKING_GATE_RESULTS = new Set([
  "blocked",
  "approval_required",
  "evidence_missing",
  "evidence_stale",
  "approval_stale",
  "approval_superseded",
  "approval_revoked",
  "audit_unavailable",
  "not_required_by_policy",
  "policy_error",
  "fail_closed",
]);
const BLOCKING_DECISION_STATUSES = new Set(["rejected", "revoked", "expired", "superseded", "cancelled", "not_required_by_policy"]);

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function sourceId(refOrId: PublishActivationEnforcementGuardRef | string | null | undefined): string | null {
  if (!refOrId) return null;
  if (typeof refOrId === "string") {
    const normalized = text(refOrId);
    if (!normalized) return null;
    const parts = normalized.split(":");
    return parts[parts.length - 1] || normalized;
  }
  return text(refOrId.sourceRecordId);
}

function sourceRef(refOrId: PublishActivationEnforcementGuardRef | string | null | undefined): string | null {
  if (!refOrId) return null;
  if (typeof refOrId === "string") return text(refOrId);
  return text(refOrId.sourceRef) ?? text(refOrId.sourceRecordId);
}

function sourceWatermark(refOrId: PublishActivationEnforcementGuardRef | string | null | undefined): string | null {
  if (!refOrId || typeof refOrId === "string") return null;
  return text(refOrId.sourceWatermark);
}

function rowText(row: PublishActivationEnforcementGuardRow | null | undefined, field: string): string | null {
  return text(row?.[field]);
}

function rowBoolean(row: PublishActivationEnforcementGuardRow | null | undefined, field: string): boolean {
  return row?.[field] === true;
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

function gateLimitations(value: EvaluatePublishActivationEnforcementGuardInput["gateAttemptResultRef"]): unknown[] {
  if (!value) return [];
  const limitations = (value as { limitations?: unknown }).limitations;
  if (Array.isArray(limitations)) return limitations;
  if (limitations && typeof limitations === "object") {
    const record = limitations as Record<string, unknown>;
    return [...jsonArray(record.readiness), ...jsonArray(record.decision), ...jsonArray(record.combined)];
  }
  return [];
}

function sameRef(expected: PublishActivationEnforcementGuardRef | string | null | undefined, actual: PublishActivationEnforcementGuardRef | string | null | undefined): boolean {
  const expectedId = sourceId(expected);
  const actualId = sourceId(actual);
  if (expectedId && actualId && expectedId === actualId) return true;
  const expectedRef = sourceRef(expected);
  const actualRef = sourceRef(actual);
  return Boolean(expectedRef && actualRef && expectedRef === actualRef);
}

function isPast(value: unknown, now: Date): boolean {
  const normalized = text(value);
  if (!normalized) return false;
  const parsed = new Date(normalized);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

function isUuid(value: string | null | undefined): boolean {
  return Boolean(text(value)?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function unique(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value))));
}

function missingRequiredInput(input: EvaluatePublishActivationEnforcementGuardInput): string[] {
  const missing: string[] = [];
  const required: Record<string, unknown> = {
    tenant_id: input.tenantId,
    client_id: input.clientId,
    site_id: input.siteId,
    migration_id: input.migrationId,
    candidate_site_version_ref: sourceId(input.candidateSiteVersionRef),
    runtime_artifact_ref: sourceId(input.runtimeArtifactRef),
    publish_target_ref: sourceId(input.publishTargetRef),
    publish_stage: input.publishStage,
    publish_environment: input.publishEnvironment,
    publish_activation_decision_ref: input.publishActivationDecisionRef?.id ?? input.publishActivationDecisionRef?.ref,
    gate_attempt_result_ref: (input.gateAttemptResultRef as { gateAttemptId?: string | null } | null)?.gateAttemptId,
    handoff_watermark: input.handoffWatermark,
    gate_input_watermark: input.gateInputWatermark,
    actor_id: input.actor?.actorId,
    actor_role: input.actor?.actorRole,
    correlation_id: input.correlationId,
    idempotency_key: input.idempotencyKey,
  };
  for (const [field, value] of Object.entries(required)) {
    if (!text(value)) missing.push(`publish_activation_required_${field}_missing`);
  }
  return missing;
}

function normalizedGate(input: EvaluatePublishActivationEnforcementGuardInput): PublishActivationPersistedGateResultRef | null {
  const gate = input.gateAttemptResultRef;
  if (!gate) return null;
  return {
    gateAttemptId: text(gate.gateAttemptId),
    gateResult: text(gate.gateResult),
    evaluationStatus: text((gate as { evaluationStatus?: unknown }).evaluationStatus),
    policyResult: text(gate.policyResult),
    approvalRequestId: text(gate.approvalRequestId),
    approvalDecisionId: text(gate.approvalDecisionId),
    evidencePackageId: text(gate.evidencePackageId),
    policyEvaluationId: text(gate.policyEvaluationId),
    auditEventId: text(gate.auditEventId),
    scope: text((gate as PublishActivationPersistedGateResultRef).scope),
    action: text((gate as PublishActivationPersistedGateResultRef).action),
    subjectType: text((gate as PublishActivationPersistedGateResultRef).subjectType),
    subjectId: text((gate as PublishActivationPersistedGateResultRef).subjectId),
    tenantId: text((gate as PublishActivationPersistedGateResultRef).tenantId),
    clientId: text((gate as PublishActivationPersistedGateResultRef).clientId),
    siteId: text((gate as PublishActivationPersistedGateResultRef).siteId),
    migrationId: text((gate as PublishActivationPersistedGateResultRef).migrationId),
    candidateSiteVersionRef: (gate as PublishActivationPersistedGateResultRef).candidateSiteVersionRef,
    runtimeArtifactRef: (gate as PublishActivationPersistedGateResultRef).runtimeArtifactRef,
    publishTargetRef: (gate as PublishActivationPersistedGateResultRef).publishTargetRef,
    publishStage: text((gate as PublishActivationPersistedGateResultRef).publishStage),
    publishEnvironment: text((gate as PublishActivationPersistedGateResultRef).publishEnvironment),
    semanticHandoffWatermark: text(gate.semanticHandoffWatermark),
    semanticGateInputWatermark: text(gate.semanticGateInputWatermark),
    blockerCodes: gate.blockerCodes,
    warnings: gate.warnings,
    limitations: (gate as PublishActivationPersistedGateResultRef).limitations,
    createdAt: (gate as PublishActivationPersistedGateResultRef).createdAt,
    completedAt: (gate as PublishActivationPersistedGateResultRef).completedAt,
    correlationId: text(gate.correlationId),
    idempotencyKey: text(gate.idempotencyKey),
  };
}

function gateTimestamp(gate: PublishActivationPersistedGateResultRef | null, snapshot: PublishActivationEnforcementGuardRepositorySnapshot | null | undefined, field: "completed_at" | "created_at"): string | null {
  const rowValue = rowText(snapshot?.gateAttempt, field);
  if (rowValue) return rowValue;
  const value = field === "completed_at" ? gate?.completedAt : gate?.createdAt;
  if (value instanceof Date) return value.toISOString();
  return text(value);
}

function freshnessSummary(input: {
  gate: PublishActivationPersistedGateResultRef | null;
  snapshot?: PublishActivationEnforcementGuardRepositorySnapshot | null;
  evaluatedAt: Date;
  maxGateAgeMs: number;
}): PublishActivationEnforcementGuardFreshnessSummary {
  const completedAt = gateTimestamp(input.gate, input.snapshot, "completed_at");
  const createdAt = gateTimestamp(input.gate, input.snapshot, "created_at");
  const raw = completedAt ?? createdAt;
  const parsed = raw ? new Date(raw) : null;
  const ageMs = parsed && !Number.isNaN(parsed.getTime()) ? input.evaluatedAt.getTime() - parsed.getTime() : null;
  return {
    evaluatedAt: input.evaluatedAt.toISOString(),
    gateCompletedAt: completedAt,
    gateCreatedAt: createdAt,
    maxGateAgeMs: input.maxGateAgeMs,
    ageMs,
    fresh: ageMs !== null && ageMs >= 0 && ageMs <= input.maxGateAgeMs,
  };
}

function baseResult(input: EvaluatePublishActivationEnforcementGuardInput, gate: PublishActivationPersistedGateResultRef | null, blockers: string[]): Omit<PublishActivationEnforcementGuardResult, "allowed" | "mode" | "reason" | "warnings" | "limitations" | "bypassUsed" | "flags"> {
  const evaluatedAt = input.evaluatedAt ? new Date(input.evaluatedAt) : new Date();
  const maxGateAgeMs = input.policy?.maxGateAgeMs ?? DEFAULT_MAX_GATE_AGE_MS;
  return {
    blockerCodes: unique(blockers),
    matchedRefs: {
      tenantId: gate?.tenantId ?? rowText(input.repositorySnapshot?.gateAttempt, "tenant_id"),
      clientId: gate?.clientId ?? rowText(input.repositorySnapshot?.gateAttempt, "client_id"),
      siteId: gate?.siteId ?? rowText(input.repositorySnapshot?.gateAttempt, "site_id"),
      migrationId: gate?.migrationId ?? input.migrationId,
      candidateSiteVersionId: sourceId(gate?.candidateSiteVersionRef) ?? rowText(input.repositorySnapshot?.gateAttempt, "subject_id"),
      runtimeArtifactId: sourceId(gate?.runtimeArtifactRef),
      publishTargetId: sourceId(gate?.publishTargetRef) ?? rowText(input.repositorySnapshot?.publishTarget, "id"),
      publishStage: gate?.publishStage ?? rowText(input.repositorySnapshot?.publishTarget, "publish_stage"),
      publishEnvironment: gate?.publishEnvironment ?? rowText(input.repositorySnapshot?.publishTarget, "environment"),
      publishActivationDecisionId: gate?.approvalDecisionId ?? rowText(input.repositorySnapshot?.gateAttempt, "approval_decision_id"),
      gateAttemptId: gate?.gateAttemptId ?? rowText(input.repositorySnapshot?.gateAttempt, "id"),
    },
    freshnessSummary: freshnessSummary({ gate, snapshot: input.repositorySnapshot, evaluatedAt, maxGateAgeMs }),
    semanticGuardInputWatermark: buildPublishActivationEnforcementGuardInputWatermark(input),
    sourceRefs: {
      candidateSiteVersion: sourceRef(input.candidateSiteVersionRef),
      runtimeArtifact: sourceRef(input.runtimeArtifactRef),
      publishTarget: sourceRef(input.publishTargetRef),
      candidateSiteVersionWatermark: sourceWatermark(input.candidateSiteVersionRef),
      runtimeArtifactWatermark: sourceWatermark(input.runtimeArtifactRef),
      publishTargetWatermark: sourceWatermark(input.publishTargetRef),
      handoffWatermark: text(input.handoffWatermark),
      gateInputWatermark: text(input.gateInputWatermark),
    },
    diagnosticRefs: {
      requestId: text(input.requestId),
      correlationId: text(input.correlationId),
      idempotencyKey: text(input.idempotencyKey),
      gateAttemptId: gate?.gateAttemptId ?? rowText(input.repositorySnapshot?.gateAttempt, "id"),
      policyEvaluationId: gate?.policyEvaluationId ?? rowText(input.repositorySnapshot?.gateAttempt, "policy_evaluation_id"),
      approvalRequestId: gate?.approvalRequestId ?? rowText(input.repositorySnapshot?.gateAttempt, "approval_request_id"),
      approvalDecisionId: gate?.approvalDecisionId ?? rowText(input.repositorySnapshot?.gateAttempt, "approval_decision_id"),
      evidencePackageId: gate?.evidencePackageId ?? rowText(input.repositorySnapshot?.gateAttempt, "evidence_package_id"),
      transactionCapturedAt: text(input.repositorySnapshot?.transactionCapturedAt),
    },
  };
}

function result(input: EvaluatePublishActivationEnforcementGuardInput, gate: PublishActivationPersistedGateResultRef | null, output: {
  allowed: boolean;
  mode: PublishActivationEnforcementGuardMode;
  reason: string;
  blockers: string[];
  warnings?: string[];
  limitations?: unknown[];
  bypassUsed?: boolean;
}): PublishActivationEnforcementGuardResult {
  return {
    ...baseResult(input, gate, output.blockers),
    allowed: output.allowed,
    mode: output.mode,
    reason: output.reason,
    warnings: unique(output.warnings ?? []),
    limitations: output.limitations ?? gateLimitations(input.gateAttemptResultRef),
    bypassUsed: output.bypassUsed ?? false,
    flags: {
      ...PUBLISH_ACTIVATION_ENFORCEMENT_GUARD_FLAGS,
      publishActionBlockedWouldBlockIfWired: !output.allowed,
      publishActionBlocked: !output.allowed,
      bypassUsed: output.bypassUsed ?? false,
    },
  };
}

export function buildPublishActivationEnforcementGuardInputWatermark(input: EvaluatePublishActivationEnforcementGuardInput): string {
  return `single-site-publish-activation-enforcement-guard:${hashPublishActivationDecisionReadValue({
    guardVersion: PUBLISH_ACTIVATION_ENFORCEMENT_GUARD_VERSION,
    evaluatorVersion: PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
    identity: {
      tenantId: text(input.tenantId),
      clientId: text(input.clientId),
      siteId: text(input.siteId),
      migrationId: text(input.migrationId),
    },
    candidateSiteVersion: {
      id: sourceId(input.candidateSiteVersionRef),
      ref: sourceRef(input.candidateSiteVersionRef),
      watermark: sourceWatermark(input.candidateSiteVersionRef),
    },
    runtimeArtifact: {
      id: sourceId(input.runtimeArtifactRef),
      ref: sourceRef(input.runtimeArtifactRef),
      watermark: sourceWatermark(input.runtimeArtifactRef),
    },
    publishTarget: {
      id: sourceId(input.publishTargetRef),
      ref: sourceRef(input.publishTargetRef),
      watermark: sourceWatermark(input.publishTargetRef),
    },
    stage: {
      publishStage: text(input.publishStage),
      publishEnvironment: text(input.publishEnvironment),
    },
    decision: {
      id: text(input.publishActivationDecisionRef?.id),
      ref: text(input.publishActivationDecisionRef?.ref),
      status: text(input.publishActivationDecisionRef?.status),
    },
    gate: {
      gateAttemptId: text((input.gateAttemptResultRef as { gateAttemptId?: string | null } | null)?.gateAttemptId),
      gateResult: text(input.gateAttemptResultRef?.gateResult),
      evaluationStatus: text((input.gateAttemptResultRef as { evaluationStatus?: unknown } | null)?.evaluationStatus),
    },
    watermarks: {
      handoff: text(input.handoffWatermark),
      gateInput: text(input.gateInputWatermark),
    },
  })}`;
}

function evaluateBypass(input: EvaluatePublishActivationEnforcementGuardInput, gate: PublishActivationPersistedGateResultRef | null, missing: readonly string[]): PublishActivationEnforcementGuardResult | null {
  if (!input.bypass?.requested) return null;
  const blockers = [...missing];
  if (!input.policy?.emergencyBypass?.enabled) blockers.push("publish_activation_emergency_bypass_disabled");
  if (!text(input.bypass.reason)) blockers.push("publish_activation_emergency_bypass_reason_missing");
  if (!text(input.actor?.actorId)) blockers.push("publish_activation_emergency_bypass_actor_missing");
  if (!text(input.actor?.actorRole)) blockers.push("publish_activation_emergency_bypass_actor_role_missing");
  if (!text(input.correlationId)) blockers.push("publish_activation_emergency_bypass_correlation_id_missing");
  if (!text(input.idempotencyKey)) blockers.push("publish_activation_emergency_bypass_idempotency_key_missing");
  if (blockers.length > 0) {
    return result(input, gate, {
      allowed: false,
      mode: "block",
      reason: "publish activation emergency bypass failed closed",
      blockers,
      warnings: ["emergency_bypass_requested_but_not_usable", "no_publish_execution"],
      bypassUsed: false,
    });
  }
  return result(input, gate, {
    allowed: true,
    mode: "bypass",
    reason: "publish activation guard bypass selected by explicit input policy",
    blockers: [],
    warnings: [
      "emergency_bypass_used",
      "residual_risk_publish_activation_gate_not_proven",
      "mvp46_bypass_does_not_publish_or_write_audit",
      "no_publish_execution",
    ],
    limitations: ["manual post-action review required if future wiring consumes this bypass"],
    bypassUsed: true,
  });
}

function addInlineGateBlockers(input: EvaluatePublishActivationEnforcementGuardInput, gate: PublishActivationPersistedGateResultRef, blockers: string[]): void {
  if (gate.scope && gate.scope !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("publish_activation_scope_mismatch");
  if (gate.action && gate.action !== PUBLISH_ACTIVATION_REQUEST_ACTION) blockers.push("publish_activation_action_mismatch");
  if (gate.subjectType && gate.subjectType !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("publish_activation_subject_type_mismatch");
  if (gate.subjectId && gate.subjectId !== sourceId(input.candidateSiteVersionRef)) blockers.push("publish_activation_candidate_mismatch");
  if (gate.tenantId && gate.tenantId !== input.tenantId) blockers.push("publish_activation_identity_mismatch");
  if (gate.clientId && gate.clientId !== input.clientId) blockers.push("publish_activation_identity_mismatch");
  if (gate.siteId && gate.siteId !== input.siteId) blockers.push("publish_activation_identity_mismatch");
  if (gate.migrationId && gate.migrationId !== input.migrationId) blockers.push("publish_activation_identity_mismatch");
  if (gate.candidateSiteVersionRef && !sameRef(input.candidateSiteVersionRef, gate.candidateSiteVersionRef)) blockers.push("publish_activation_candidate_mismatch");
  if (gate.runtimeArtifactRef && !sameRef(input.runtimeArtifactRef, gate.runtimeArtifactRef)) blockers.push("publish_activation_artifact_mismatch");
  if (gate.publishTargetRef && !sameRef(input.publishTargetRef, gate.publishTargetRef)) blockers.push("publish_activation_target_mismatch");
  if (gate.publishStage && gate.publishStage !== input.publishStage) blockers.push("publish_activation_stage_mismatch");
  if (gate.publishEnvironment && gate.publishEnvironment !== input.publishEnvironment) blockers.push("publish_activation_stage_mismatch");
  if (gate.approvalDecisionId && gate.approvalDecisionId !== text(input.publishActivationDecisionRef?.id)) blockers.push("publish_activation_decision_mismatch");
  if (gate.semanticHandoffWatermark !== input.handoffWatermark) blockers.push("publish_activation_handoff_watermark_mismatch");
  if (gate.semanticGateInputWatermark !== input.gateInputWatermark) blockers.push("publish_activation_gate_input_watermark_mismatch");
  blockers.push(...(gate.blockerCodes ?? []).map(String));
}

function addRepositoryBlockers(input: EvaluatePublishActivationEnforcementGuardInput, gate: PublishActivationPersistedGateResultRef, blockers: string[]): void {
  const snapshot = input.repositorySnapshot;
  if (!snapshot) return;
  const gateRow = snapshot.gateAttempt;
  if (!gateRow) {
    blockers.push("publish_activation_gate_missing");
    return;
  }
  if (rowText(gateRow, "id") !== gate.gateAttemptId) blockers.push("publish_activation_gate_mismatch");
  if (rowText(gateRow, "scope") !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("publish_activation_scope_mismatch");
  if (rowText(gateRow, "action_key") !== PUBLISH_ACTIVATION_REQUEST_ACTION) blockers.push("publish_activation_action_mismatch");
  if (rowText(gateRow, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("publish_activation_subject_type_mismatch");
  if (rowText(gateRow, "subject_id") !== sourceId(input.candidateSiteVersionRef)) blockers.push("publish_activation_candidate_mismatch");
  if (rowText(gateRow, "site_version_id") && rowText(gateRow, "site_version_id") !== sourceId(input.candidateSiteVersionRef)) blockers.push("publish_activation_candidate_mismatch");
  if (rowText(gateRow, "tenant_id") !== input.tenantId || rowText(gateRow, "client_id") !== input.clientId || rowText(gateRow, "site_id") !== input.siteId) {
    blockers.push("publish_activation_identity_mismatch");
  }
  if (rowText(gateRow, "gate_result") !== gate.gateResult) blockers.push("publish_activation_gate_result_mismatch");
  if (rowText(gateRow, "approval_decision_id") !== text(input.publishActivationDecisionRef?.id)) blockers.push("publish_activation_decision_mismatch");
  if (rowText(gateRow, "approval_decision_id") !== gate.approvalDecisionId) blockers.push("publish_activation_decision_mismatch");
  if (input.policy?.detectConflictingNewerGate !== false && snapshot.conflictingNewerGateAttempts.length > 0) {
    blockers.push("publish_activation_gate_conflict");
  }

  const decision = snapshot.approvalDecision;
  if (!decision) {
    blockers.push("publish_activation_decision_missing");
  } else {
    const status = rowText(decision, "status");
    if (status && BLOCKING_DECISION_STATUSES.has(status)) blockers.push(`publish_activation_approval_${status}`);
    if (status && !["granted", "granted_with_limitations"].includes(status)) blockers.push("publish_activation_decision_not_granted");
    if (isPast(decision.expires_at, new Date(snapshot.transactionCapturedAt))) blockers.push("publish_activation_approval_expired");
    if (snapshot.approvalRevoked || rowBoolean(decision, "revoked")) blockers.push("publish_activation_approval_revoked");
    if (snapshot.approvalSuperseded || rowBoolean(decision, "superseded")) blockers.push("publish_activation_approval_superseded");
  }

  const request = snapshot.approvalRequest;
  if (!request) {
    blockers.push("publish_activation_request_missing");
  } else {
    if (rowText(request, "scope") !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("publish_activation_scope_mismatch");
    if (rowText(request, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("publish_activation_subject_type_mismatch");
    if (rowText(request, "subject_id") !== sourceId(input.candidateSiteVersionRef)) blockers.push("publish_activation_candidate_mismatch");
  }

  if (input.policy?.rereadPublishTarget !== false) {
    const target = snapshot.publishTarget;
    if (!target) {
      blockers.push("publish_activation_target_missing");
    } else {
      if (rowText(target, "id") !== sourceId(input.publishTargetRef)) blockers.push("publish_activation_target_mismatch");
      if (rowText(target, "status") === "disabled" || rowText(target, "status") === "retired") blockers.push("publish_activation_target_inactive");
      if (rowText(target, "environment") !== input.publishEnvironment) blockers.push("publish_activation_stage_mismatch");
      if (rowText(target, "publish_stage") !== input.publishStage) blockers.push("publish_activation_stage_mismatch");
    }
  }
}

export function evaluatePublishActivationEnforcementGuard(input: EvaluatePublishActivationEnforcementGuardInput): PublishActivationEnforcementGuardResult {
  const gate = normalizedGate(input);
  const missing = missingRequiredInput(input);
  const bypass = evaluateBypass(input, gate, missing);
  if (bypass) return bypass;
  if (missing.length > 0) {
    return result(input, gate, {
      allowed: false,
      mode: "block",
      reason: "publish activation guard required input missing",
      blockers: missing,
      warnings: ["fail_closed_required_input_missing", "no_publish_execution"],
    });
  }
  if (!gate) {
    return result(input, gate, {
      allowed: false,
      mode: "block",
      reason: "publish activation gate result missing",
      blockers: ["publish_activation_gate_missing"],
      warnings: ["no_publish_execution"],
    });
  }

  const blockers: string[] = [];
  const limitations = gateLimitations(input.gateAttemptResultRef);
  const gateResult = text(gate.gateResult);
  const expectedGateResult = input.policy?.expectedGateResult ?? "allowed";
  if (!gateResult) blockers.push("publish_activation_gate_missing");
  if (gateResult && gateResult !== expectedGateResult) {
    blockers.push(BLOCKING_GATE_RESULTS.has(gateResult) ? `publish_activation_gate_${gateResult}` : "publish_activation_gate_blocked");
  }
  if (gate.evaluationStatus === "warning" || limitations.length > 0 || gate.warnings?.includes("limitations_carried_forward")) {
    if (!input.policy?.allowWarningsWithLimitations) blockers.push("publish_activation_limitations_not_accepted");
  }

  addInlineGateBlockers(input, gate, blockers);
  addRepositoryBlockers(input, gate, blockers);

  const fresh = freshnessSummary({
    gate,
    snapshot: input.repositorySnapshot,
    evaluatedAt: input.evaluatedAt ? new Date(input.evaluatedAt) : new Date(),
    maxGateAgeMs: input.policy?.maxGateAgeMs ?? DEFAULT_MAX_GATE_AGE_MS,
  });
  if (!fresh.fresh) blockers.push("publish_activation_gate_stale");

  if (blockers.length > 0) {
    return result(input, gate, {
      allowed: false,
      mode: ["audit_unavailable", "policy_error", "fail_closed"].includes(gateResult ?? "") || blockers.includes("publish_activation_gate_read_failed") ? "error" : "block",
      reason: "publish activation guard blocked",
      blockers,
      warnings: ["would_block_if_wired", "no_publish_execution"],
      limitations,
    });
  }

  const warnings = ["read_only_guard_evaluated", "enforcement_not_applied_in_mvp46", "no_publish_execution"];
  if (limitations.length > 0) warnings.push("limitations_explicitly_accepted_by_policy");
  return result(input, gate, {
    allowed: true,
    mode: "pass",
    reason: "publish activation persisted gate result matched guard policy",
    blockers: [],
    warnings,
    limitations,
  });
}

export async function readAndEvaluatePublishActivationEnforcementGuard(
  input: ReadAndEvaluatePublishActivationEnforcementGuardInput,
): Promise<PublishActivationEnforcementGuardResult> {
  const repository = input.repository ?? new PublishActivationEnforcementGuardReadRepository();
  try {
    const snapshot = await repository.readSnapshot({ ...input, repositorySnapshot: null });
    return evaluatePublishActivationEnforcementGuard({ ...input, repositorySnapshot: snapshot });
  } catch (error) {
    const gate = normalizedGate({ ...input, repositorySnapshot: null } as EvaluatePublishActivationEnforcementGuardInput);
    return evaluatePublishActivationEnforcementGuard({
      ...input,
      repositorySnapshot: null,
      gateAttemptResultRef: input.gateAttemptResultRef
        ? { ...(gate ?? {}), gateAttemptId: gate?.gateAttemptId ?? null, gateResult: gate?.gateResult ?? input.gateAttemptResultRef.gateResult ?? null, blockerCodes: ["publish_activation_gate_read_failed"] }
        : input.gateAttemptResultRef,
    } as EvaluatePublishActivationEnforcementGuardInput);
  }
}

export class PublishActivationEnforcementGuardReadRepository implements PublishActivationEnforcementGuardReadRepositoryLike {
  constructor(private readonly pool: Pick<Pool, "connect"> = getSuperadminPool()) {}

  async readSnapshot(input: EvaluatePublishActivationEnforcementGuardInput): Promise<PublishActivationEnforcementGuardRepositorySnapshot> {
    const client = await this.pool.connect();
    let started = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      started = true;
      const captured = await client.query("select transaction_timestamp()::text as captured_at");
      const capturedAt = String(captured.rows[0]?.captured_at ?? new Date().toISOString());
      const snapshot = await this.readSnapshotWithClient(client, input, capturedAt);
      await client.query("commit");
      started = false;
      return snapshot;
    } catch (error) {
      if (started) {
        try {
          await client.query("rollback");
        } catch {
          // Best-effort rollback after a failed read-only guard transaction.
        }
      }
      throw new PublishActivationEnforcementGuardReadRepositoryError("publish_activation_enforcement_guard_read_failed", error);
    } finally {
      client.release?.();
    }
  }

  private async readSnapshotWithClient(client: AafPgClient, input: EvaluatePublishActivationEnforcementGuardInput, capturedAt: string): Promise<PublishActivationEnforcementGuardRepositorySnapshot> {
    const gateAttemptId = text((input.gateAttemptResultRef as { gateAttemptId?: string | null } | null)?.gateAttemptId);
    const gateAttempt = gateAttemptId && isUuid(gateAttemptId)
      ? await readOne(client, "select * from public.gnr8_aaf_action_gate_attempts where id = $1::uuid limit 1", [gateAttemptId])
      : null;
    const decisionId =
      rowText(gateAttempt, "approval_decision_id") ??
      text(input.publishActivationDecisionRef?.id) ??
      text(input.gateAttemptResultRef?.approvalDecisionId);
    const approvalDecision = decisionId && isUuid(decisionId)
      ? await readOne(
          client,
          `
          select
            d.*,
            exists(select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id) as revoked,
            exists(select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id) as superseded
          from public.gnr8_aaf_approval_decisions d
          where d.id = $1::uuid
          limit 1
          `,
          [decisionId],
        )
      : null;
    const requestId = rowText(gateAttempt, "approval_request_id") ?? rowText(approvalDecision, "approval_request_id") ?? text(input.gateAttemptResultRef?.approvalRequestId);
    const approvalRequest = requestId && isUuid(requestId)
      ? await readOne(client, "select * from public.gnr8_aaf_approval_requests where id = $1::uuid limit 1", [requestId])
      : null;
    const publishTargetId = sourceId(input.publishTargetRef);
    const publishTarget = publishTargetId && (await tableExists(client, "gnr8_publish_targets"))
      ? await readOne(client, "select * from public.gnr8_publish_targets where id = $1::text limit 1", [publishTargetId])
      : null;
    const conflictingNewerGateAttempts = gateAttempt
      ? await readAll(
          client,
          `
          select *
          from public.gnr8_aaf_action_gate_attempts
          where tenant_id = $1
            and client_id is not distinct from $2
            and site_id is not distinct from $3
            and scope = $4
            and action_key = $5
            and subject_type = $6
            and subject_id = $7
            and id <> $8::uuid
            and created_at > $9::timestamptz
          order by created_at desc, id desc
          `,
          [
            input.tenantId,
            input.clientId,
            input.siteId,
            PUBLISH_ACTIVATION_REQUEST_SCOPE,
            PUBLISH_ACTIVATION_REQUEST_ACTION,
            PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
            sourceId(input.candidateSiteVersionRef),
            rowText(gateAttempt, "id"),
            rowText(gateAttempt, "created_at"),
          ],
        )
      : [];
    return {
      transactionCapturedAt: capturedAt,
      gateAttempt,
      conflictingNewerGateAttempts,
      approvalRequest,
      approvalDecision,
      approvalRevoked: rowBoolean(approvalDecision, "revoked"),
      approvalSuperseded: rowBoolean(approvalDecision, "superseded"),
      publishTarget,
    };
  }
}

async function tableExists(client: AafPgClient, tableName: string): Promise<boolean> {
  const result = await client.query("select to_regclass($1) as table_name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function readAll(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<PublishActivationEnforcementGuardRow[]> {
  const result = await client.query(sql, values);
  return result.rows;
}

async function readOne(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<PublishActivationEnforcementGuardRow | null> {
  return (await readAll(client, sql, values))[0] ?? null;
}
