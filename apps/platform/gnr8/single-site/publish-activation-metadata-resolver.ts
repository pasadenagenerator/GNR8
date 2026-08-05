import "server-only";

import { createHash } from "node:crypto";

import type { Pool } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { AafActorType, AafPgClient } from "../aaf/aaf-writer-repository";
import {
  buildPublishActivationDecisionReadModelFromSnapshot,
  type PublishActivationDecisionReadRef,
} from "./publish-activation-decision-read-model";
import type {
  PublishActivationDecisionReadRow,
  PublishActivationDecisionReadSnapshot,
} from "./publish-activation-decision-read-repository";
import {
  evaluatePublishActivationEnforcementGuard,
  type PublishActivationEnforcementGuardPolicy,
  type PublishActivationEnforcementGuardRef,
} from "./publish-activation-enforcement-guard";
import { buildPublishActivationGateHandoff } from "./publish-activation-gate-handoff";
import {
  PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
  buildPublishActivationMetadataHandoffWatermark,
  normalizePublishActivationMetadataHandoff,
  type NormalizedPublishActivationMetadataHandoff,
  type PublishActivationMetadataHandoff,
} from "./publish-activation-metadata-handoff";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
} from "./publish-activation-request-bridge";
import { PUBLISH_ACTIVATION_DECISION_EVIDENCE_LINK_ROLE } from "./publish-activation-decision-service";

export const PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION = "mvp-49-publish-activation-metadata-resolver:v1" as const;

export const PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS = {
  readOnly: true,
  createsAafRecords: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  pasrInvoked: false,
  createsDdomSnapshots: false,
  providerCalls: false,
  publishes: false,
  runtimeMutation: false,
  enforcementApplied: false,
} as const;

export type PublishActivationMetadataResolverActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type PublishActivationMetadataResolverInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  candidateSiteVersionRef: PublishActivationEnforcementGuardRef | string;
  runtimeArtifactRef: PublishActivationEnforcementGuardRef | string;
  publishStage: "shadow" | "canary" | "production" | string;
  publishEnvironment: string;
  actor: PublishActivationMetadataResolverActor;
  correlationId: string;
  idempotencyKey: string;
  expectedPublishTargetRef?: PublishActivationEnforcementGuardRef | string | null;
  expectedPublishActivationRequestRef?: string | null;
  expectedPublishActivationDecisionRef?: string | null;
  expectedGateAttemptResultRef?: string | null;
  expectedHandoffWatermark?: string | null;
  expectedGateInputWatermark?: string | null;
  maxGateAgeMs?: number | null;
  allowWarningsWithLimitations?: boolean;
  evaluatedAt?: string | Date | null;
  requestId?: string | null;
  repositorySnapshot?: PublishActivationMetadataResolverRepositorySnapshot | null;
};

export type ReadAndResolveSingleSitePublishActivationMetadataHandoffInput =
  Omit<PublishActivationMetadataResolverInput, "repositorySnapshot"> & {
    repository?: PublishActivationMetadataResolverReadRepositoryLike;
  };

export type PublishActivationMetadataResolverRepositorySnapshot = {
  transactionCapturedAt: string;
  decisionSnapshot: PublishActivationDecisionReadSnapshot;
  gateAttempt: PublishActivationDecisionReadRow | null;
  gatePolicyEvaluation: PublishActivationDecisionReadRow | null;
  gateAuditEvent: PublishActivationDecisionReadRow | null;
  conflictingNewerGateAttempts: PublishActivationDecisionReadRow[];
};

export type PublishActivationMetadataResolverDiagnostics = {
  status: "complete" | "incomplete";
  complete: boolean;
  blockerCodes: string[];
  missingCodes: string[];
  mismatchCodes: string[];
  staleCodes: string[];
  warningCodes: string[];
  transactionCapturedAt: string | null;
  safeIds: {
    siteId: string | null;
    siteVersionId: string | null;
    runtimeArtifactId: string | null;
    publishTargetId: string | null;
    publishActivationRequestId: string | null;
    publishActivationDecisionId: string | null;
    gateAttemptId: string | null;
  };
};

export type PublishActivationMetadataResolverResult = {
  resolverVersion: typeof PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION;
  publishActivationMetadataHandoff: NormalizedPublishActivationMetadataHandoff | null;
  diagnostics: PublishActivationMetadataResolverDiagnostics;
  metadataWatermark: string | null;
  flags: typeof PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS;
};

export type PublishActivationMetadataResolverReadRepositoryLike = {
  readSnapshot(input: PublishActivationMetadataResolverInput): Promise<PublishActivationMetadataResolverRepositorySnapshot>;
};

export class PublishActivationMetadataResolverReadRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";
    super(`${message}${causeMessage}`);
    this.name = "PublishActivationMetadataResolverReadRepositoryError";
  }
}

type ResolverPgClient = AafPgClient & { release?: () => void };

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
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

function refTextId(refOrId: string | null | undefined): string | null {
  return sourceId(refOrId);
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

function rowText(row: PublishActivationDecisionReadRow | null | undefined, field: string): string | null {
  return text(row?.[field]);
}

function rowBoolean(row: PublishActivationDecisionReadRow | null | undefined, field: string): boolean {
  return row?.[field] === true;
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function isUuid(value: string | null | undefined): boolean {
  return Boolean(text(value)?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function sameRef(expected: PublishActivationEnforcementGuardRef | string | null | undefined, actual: PublishActivationEnforcementGuardRef | string | null | undefined): boolean {
  const expectedId = sourceId(expected);
  const actualId = sourceId(actual);
  if (expectedId && actualId && expectedId === actualId) return true;
  const expectedRef = sourceRef(expected);
  const actualRef = sourceRef(actual);
  return Boolean(expectedRef && actualRef && expectedRef === actualRef);
}

function ref(role: string, sourceTable: string, refOrId: PublishActivationDecisionReadRef | PublishActivationEnforcementGuardRef | string | null | undefined): PublishActivationDecisionReadRef | null {
  if (!refOrId) return null;
  if (typeof refOrId === "string") {
    const id = sourceId(refOrId);
    return id ? { role, sourceSystem: "gnr8", sourceTable, sourceRecordId: id, sourceWatermark: `ref:${sourceTable}:${id}`, sourceRef: refOrId } : null;
  }
  const id = text(refOrId.sourceRecordId);
  if (!id) return null;
  return {
    role: text(refOrId.role) ?? role,
    sourceSystem: text(refOrId.sourceSystem) ?? "gnr8",
    sourceTable: text(refOrId.sourceTable) ?? sourceTable,
    sourceRecordId: id,
    sourceVersion: text(refOrId.sourceVersion),
    sourceWatermark: text(refOrId.sourceWatermark) ?? `ref:${sourceTable}:${id}`,
    sourceRef: text(refOrId.sourceRef) ?? id,
    contentHash: text(refOrId.contentHash),
    metadataJson: refOrId.metadataJson,
  };
}

function gateInputWatermark(gateAttempt: PublishActivationDecisionReadRow | null): string | null {
  const causationId = rowText(gateAttempt, "causation_id");
  return causationId?.match(/single-site-publish-activation-gate-input:[0-9a-f]{64}/)?.[0] ?? null;
}

function isPast(value: unknown, now: Date): boolean {
  const normalized = text(value);
  if (!normalized) return false;
  const parsed = new Date(normalized);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

function ageMs(row: PublishActivationDecisionReadRow | null, now: Date): number | null {
  const raw = rowText(row, "completed_at") ?? rowText(row, "created_at");
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return now.getTime() - parsed.getTime();
}

function refMatchesText(expected: string | null | undefined, values: readonly (string | null | undefined)[]): boolean {
  const normalized = text(expected);
  if (!normalized) return true;
  return values.map(text).some((value) => value === normalized);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value ?? null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

export function buildPublishActivationMetadataResolverWatermark(input: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(stableValue(input))).digest("hex");
  return `single-site-publish-activation-metadata-resolver:${digest}`;
}

function sourceIdFromEvidence(rows: readonly PublishActivationDecisionReadRow[], payload: Record<string, unknown>, role: string): string | null {
  const row = rows.find((entry) => text(jsonObject(entry.metadata_json).refRole) === role);
  if (rowText(row, "source_record_id")) return rowText(row, "source_record_id");
  const sourceRefs = jsonObject(payload.sourceRefs);
  return sourceId(jsonObject(jsonArray(sourceRefs[role])[0]).sourceRecordId as string | null);
}

function requiredMissing(input: PublishActivationMetadataResolverInput): string[] {
  const required: Record<string, unknown> = {
    tenant_id: input.tenantId,
    client_id: input.clientId,
    site_id: input.siteId,
    migration_id: input.migrationId,
    candidate_site_version_ref: sourceId(input.candidateSiteVersionRef),
    runtime_artifact_ref: sourceId(input.runtimeArtifactRef),
    publish_stage: input.publishStage,
    publish_environment: input.publishEnvironment,
    actor_id: input.actor?.actorId,
    actor_role: input.actor?.actorRole,
    correlation_id: input.correlationId,
    idempotency_key: input.idempotencyKey,
  };
  return Object.entries(required)
    .filter(([, value]) => !text(value))
    .map(([field]) => `publish_activation_metadata_resolver_${field}_missing`);
}

function validationCodes(input: PublishActivationMetadataResolverInput, snapshot: PublishActivationMetadataResolverRepositorySnapshot, handoff: ReturnType<typeof buildPublishActivationGateHandoff>): {
  blockers: string[];
  missing: string[];
  mismatches: string[];
  stale: string[];
  warnings: string[];
} {
  const missing = [...requiredMissing(input)];
  const blockers = [...handoff.blockerSummary.blockers];
  const stale = [...handoff.blockerSummary.stale];
  const warnings = [...handoff.blockerSummary.warnings];
  const mismatches: string[] = [];
  const model = buildPublishActivationDecisionReadModelFromSnapshot(
    {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
      publishActivationRequestId: refTextId(input.expectedPublishActivationRequestRef) ?? undefined,
      publishActivationDecisionId: refTextId(input.expectedPublishActivationDecisionRef) ?? undefined,
      candidateSiteVersionId: sourceId(input.candidateSiteVersionRef),
      runtimeArtifactId: sourceId(input.runtimeArtifactRef),
      publishTargetId: sourceId(input.expectedPublishTargetRef) ?? undefined,
      improvedCandidateSiteVersionRef: ref("candidate_site_version", "gnr8_runtime_site_versions", input.candidateSiteVersionRef),
      improvedRuntimeArtifactRef: ref("runtime_artifact", "gnr8_runtime_artifacts", input.runtimeArtifactRef),
      publishTargetRef: input.expectedPublishTargetRef ? ref("publish_target", "gnr8_publish_targets", input.expectedPublishTargetRef) : undefined,
    },
    snapshot.decisionSnapshot,
  );

  missing.push(...model.diagnostics.missing);
  stale.push(...model.diagnostics.stale);
  warnings.push(...model.diagnostics.warnings);
  blockers.push(...model.diagnostics.blockers);
  if (!model.publishActivationRequest.id) missing.push("publish_activation_request_missing");
  if (!model.publishActivationDecision.id) missing.push("publish_activation_decision_missing");
  if (!model.launchReadinessEvidence.packageId) missing.push("launch_readiness_evidence_package_missing");
  if (!handoff.candidateSiteVersionRef) missing.push("candidate_site_version_ref_missing");
  if (!handoff.runtimeArtifactRef) missing.push("runtime_artifact_ref_missing");
  if (!handoff.publishTargetRef) missing.push("publish_target_ref_missing");

  const targetRef = handoff.publishTargetRef;
  if (!sameRef(input.candidateSiteVersionRef, handoff.candidateSiteVersionRef)) mismatches.push("publish_activation_candidate_mismatch");
  if (!sameRef(input.runtimeArtifactRef, handoff.runtimeArtifactRef)) mismatches.push("publish_activation_artifact_mismatch");
  if (input.expectedPublishTargetRef && !sameRef(input.expectedPublishTargetRef, targetRef)) mismatches.push("publish_activation_target_mismatch");
  if (!refMatchesText(input.expectedPublishActivationRequestRef, [handoff.request.id, handoff.request.ref])) mismatches.push("publish_activation_request_mismatch");
  if (!refMatchesText(input.expectedPublishActivationDecisionRef, [handoff.decision.id, handoff.decision.ref])) mismatches.push("publish_activation_decision_mismatch");
  if (!refMatchesText(input.expectedHandoffWatermark, [handoff.semanticHandoffWatermark])) mismatches.push("publish_activation_handoff_watermark_mismatch");

  const gate = snapshot.gateAttempt;
  const gateId = rowText(gate, "id");
  const gateInput = gateInputWatermark(gate);
  if (!gate) {
    missing.push("publish_activation_gate_missing");
  } else {
    if (!refMatchesText(input.expectedGateAttemptResultRef, [gateId])) mismatches.push("publish_activation_gate_mismatch");
    if (rowText(gate, "tenant_id") !== input.tenantId || rowText(gate, "client_id") !== input.clientId || rowText(gate, "site_id") !== input.siteId) {
      mismatches.push("publish_activation_identity_mismatch");
    }
    if (rowText(gate, "scope") !== PUBLISH_ACTIVATION_REQUEST_SCOPE) mismatches.push("publish_activation_scope_mismatch");
    if (rowText(gate, "action_key") !== PUBLISH_ACTIVATION_REQUEST_ACTION) mismatches.push("publish_activation_action_mismatch");
    if (rowText(gate, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) mismatches.push("publish_activation_subject_type_mismatch");
    if (rowText(gate, "subject_id") !== sourceId(input.candidateSiteVersionRef)) mismatches.push("publish_activation_candidate_mismatch");
    if (rowText(gate, "approval_request_id") !== handoff.request.id) mismatches.push("publish_activation_request_mismatch");
    if (rowText(gate, "approval_decision_id") !== handoff.decision.id) mismatches.push("publish_activation_decision_mismatch");
    if (rowText(gate, "evidence_package_id") !== handoff.launchReadinessEvidence.packageId) mismatches.push("publish_activation_evidence_mismatch");
    if (rowText(gate, "gate_result") !== "allowed") blockers.push(`publish_activation_gate_${rowText(gate, "gate_result") ?? "missing"}`);
    if (rowText(snapshot.gatePolicyEvaluation, "result") && rowText(snapshot.gatePolicyEvaluation, "result") !== "approval_required") {
      blockers.push(`publish_activation_gate_policy_${rowText(snapshot.gatePolicyEvaluation, "result")}`);
    }
    if (!gateInput) missing.push("publish_activation_gate_input_watermark_missing");
    if (!refMatchesText(input.expectedGateInputWatermark, [gateInput])) mismatches.push("publish_activation_gate_input_watermark_mismatch");
  }

  const target = snapshot.decisionSnapshot.publishTarget;
  if (!target) {
    missing.push("publish_activation_target_missing");
  } else {
    if (rowText(target, "id") !== sourceId(targetRef)) mismatches.push("publish_activation_target_mismatch");
    if (["disabled", "retired"].includes(String(rowText(target, "status")))) blockers.push("publish_activation_target_inactive");
    if (rowText(target, "environment") !== input.publishEnvironment) mismatches.push("publish_activation_stage_mismatch");
    if (rowText(target, "publish_stage") !== input.publishStage) mismatches.push("publish_activation_stage_mismatch");
  }

  const decision = snapshot.decisionSnapshot.selectedDecision;
  const now = new Date(text(input.evaluatedAt) ?? snapshot.transactionCapturedAt);
  if (decision) {
    const status = rowText(decision, "status");
    if (!["granted", "granted_with_limitations"].includes(String(status))) blockers.push(`publish_activation_approval_${status ?? "missing"}`);
    if (rowBoolean(decision, "revoked")) blockers.push("publish_activation_approval_revoked");
    if (rowBoolean(decision, "superseded")) blockers.push("publish_activation_approval_superseded");
    if (isPast(decision.expires_at, now)) stale.push("publish_activation_approval_expired");
  }

  if (snapshot.conflictingNewerGateAttempts.length > 0) blockers.push("publish_activation_gate_conflict");
  const maxGateAgeMs = input.maxGateAgeMs ?? 24 * 60 * 60 * 1000;
  const gateAgeMs = ageMs(gate, now);
  if (gate && (gateAgeMs === null || gateAgeMs < 0 || gateAgeMs > maxGateAgeMs)) stale.push("publish_activation_gate_stale");
  if (handoff.limitations.combined.length > 0) {
    warnings.push("limitations_carried_forward");
    if (!input.allowWarningsWithLimitations) blockers.push("publish_activation_limitations_not_accepted");
  }

  return {
    blockers: uniqueSorted(blockers),
    missing: uniqueSorted(missing),
    mismatches: uniqueSorted(mismatches),
    stale: uniqueSorted(stale),
    warnings: uniqueSorted(warnings),
  };
}

function gateResultRef(input: PublishActivationMetadataResolverInput, snapshot: PublishActivationMetadataResolverRepositorySnapshot, handoff: ReturnType<typeof buildPublishActivationGateHandoff>) {
  const gate = snapshot.gateAttempt;
  const gateInput = gateInputWatermark(gate);
  return {
    gateAttemptId: rowText(gate, "id"),
    gateAttemptRef: rowText(gate, "id") ? `aaf:action_gate_attempt:${rowText(gate, "id")}` : null,
    gateResult: rowText(gate, "gate_result"),
    evaluationStatus: rowText(gate, "gate_result") === "allowed" && handoff.limitations.combined.length > 0 ? "warning" : rowText(gate, "gate_result"),
    policyResult: rowText(snapshot.gatePolicyEvaluation, "result"),
    approvalRequestId: rowText(gate, "approval_request_id") ?? handoff.request.id,
    approvalDecisionId: rowText(gate, "approval_decision_id") ?? handoff.decision.id,
    evidencePackageId: rowText(gate, "evidence_package_id") ?? handoff.launchReadinessEvidence.packageId,
    policyEvaluationId: rowText(gate, "policy_evaluation_id"),
    auditEventId: rowText(gate, "pre_action_audit_event_id") ?? rowText(snapshot.gateAuditEvent, "id"),
    scope: rowText(gate, "scope"),
    action: rowText(gate, "action_key"),
    subjectType: rowText(gate, "subject_type"),
    subjectId: rowText(gate, "subject_id"),
    tenantId: rowText(gate, "tenant_id"),
    clientId: rowText(gate, "client_id"),
    siteId: rowText(gate, "site_id"),
    migrationId: input.migrationId,
    candidateSiteVersionRef: handoff.candidateSiteVersionRef,
    runtimeArtifactRef: handoff.runtimeArtifactRef,
    publishTargetRef: handoff.publishTargetRef,
    publishStage: input.publishStage,
    publishEnvironment: input.publishEnvironment,
    semanticHandoffWatermark: handoff.semanticHandoffWatermark,
    semanticGateInputWatermark: gateInput,
    blockerCodes: jsonArray(snapshot.gatePolicyEvaluation?.blocker_codes).map(String),
    warnings: handoff.limitations.combined.length > 0 ? ["limitations_carried_forward"] : [],
    limitations: handoff.limitations,
    createdAt: rowText(gate, "created_at"),
    completedAt: rowText(gate, "completed_at"),
    correlationId: rowText(gate, "correlation_id"),
    idempotencyKey: rowText(gate, "idempotency_key"),
  };
}

function buildRawHandoff(input: PublishActivationMetadataResolverInput, snapshot: PublishActivationMetadataResolverRepositorySnapshot): PublishActivationMetadataHandoff {
  const model = buildPublishActivationDecisionReadModelFromSnapshot(
    {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
      publishActivationRequestId: refTextId(input.expectedPublishActivationRequestRef) ?? undefined,
      publishActivationDecisionId: refTextId(input.expectedPublishActivationDecisionRef) ?? undefined,
      candidateSiteVersionId: sourceId(input.candidateSiteVersionRef),
      runtimeArtifactId: sourceId(input.runtimeArtifactRef),
      publishTargetId: sourceId(input.expectedPublishTargetRef) ?? undefined,
      improvedCandidateSiteVersionRef: ref("candidate_site_version", "gnr8_runtime_site_versions", input.candidateSiteVersionRef),
      improvedRuntimeArtifactRef: ref("runtime_artifact", "gnr8_runtime_artifacts", input.runtimeArtifactRef),
      publishTargetRef: input.expectedPublishTargetRef ? ref("publish_target", "gnr8_publish_targets", input.expectedPublishTargetRef) : undefined,
    },
    snapshot.decisionSnapshot,
  );
  const handoff = buildPublishActivationGateHandoff(model);
  const gate = gateResultRef(input, snapshot, handoff);
  return {
    sourceType: PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    candidateSiteVersionRef: handoff.candidateSiteVersionRef,
    runtimeArtifactRef: handoff.runtimeArtifactRef,
    publishTargetRef: handoff.publishTargetRef,
    publishStage: input.publishStage,
    publishEnvironment: input.publishEnvironment,
    publishActivationRequestRef: handoff.request,
    publishActivationDecisionRef: handoff.decision,
    gateAttemptResultRef: gate,
    handoffWatermark: handoff.semanticHandoffWatermark,
    gateInputWatermark: gate.semanticGateInputWatermark,
    limitations: handoff.limitations,
    actorRole: input.actor.actorRole,
    actorType: input.actor.actorType,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    requestId: text(input.requestId) ?? handoff.request.id,
    policy: {
      maxGateAgeMs: input.maxGateAgeMs,
      allowWarningsWithLimitations: input.allowWarningsWithLimitations,
      rereadAaf: true,
      rereadPublishTarget: true,
      detectConflictingNewerGate: true,
    } satisfies PublishActivationEnforcementGuardPolicy,
  };
}

export function resolveSingleSitePublishActivationMetadataHandoff(input: PublishActivationMetadataResolverInput): PublishActivationMetadataResolverResult {
  const snapshot = input.repositorySnapshot;
  if (!snapshot) {
    const missing = uniqueSorted([...requiredMissing(input), "publish_activation_metadata_resolver_snapshot_missing"]);
    return {
      resolverVersion: PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
      publishActivationMetadataHandoff: null,
      diagnostics: {
        status: "incomplete",
        complete: false,
        blockerCodes: [],
        missingCodes: missing,
        mismatchCodes: [],
        staleCodes: [],
        warningCodes: [],
        transactionCapturedAt: null,
        safeIds: {
          siteId: text(input.siteId),
          siteVersionId: sourceId(input.candidateSiteVersionRef),
          runtimeArtifactId: sourceId(input.runtimeArtifactRef),
          publishTargetId: sourceId(input.expectedPublishTargetRef),
          publishActivationRequestId: refTextId(input.expectedPublishActivationRequestRef),
          publishActivationDecisionId: refTextId(input.expectedPublishActivationDecisionRef),
          gateAttemptId: refTextId(input.expectedGateAttemptResultRef),
        },
      },
      metadataWatermark: buildPublishActivationMetadataResolverWatermark({ input, status: "snapshot_missing" }),
      flags: PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
    };
  }

  const raw = buildRawHandoff(input, snapshot);
  const model = buildPublishActivationDecisionReadModelFromSnapshot(
    {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
      publishActivationRequestId: refTextId(input.expectedPublishActivationRequestRef) ?? undefined,
      publishActivationDecisionId: refTextId(input.expectedPublishActivationDecisionRef) ?? undefined,
      candidateSiteVersionId: sourceId(input.candidateSiteVersionRef),
      runtimeArtifactId: sourceId(input.runtimeArtifactRef),
      publishTargetId: sourceId(input.expectedPublishTargetRef) ?? undefined,
      improvedCandidateSiteVersionRef: ref("candidate_site_version", "gnr8_runtime_site_versions", input.candidateSiteVersionRef),
      improvedRuntimeArtifactRef: ref("runtime_artifact", "gnr8_runtime_artifacts", input.runtimeArtifactRef),
      publishTargetRef: input.expectedPublishTargetRef ? ref("publish_target", "gnr8_publish_targets", input.expectedPublishTargetRef) : undefined,
    },
    snapshot.decisionSnapshot,
  );
  const handoff = buildPublishActivationGateHandoff(model);
  const codes = validationCodes(input, snapshot, handoff);
  const normalized = normalizePublishActivationMetadataHandoff(raw, {
    siteId: input.siteId,
    siteVersionId: sourceId(input.candidateSiteVersionRef) ?? "",
    runtimeArtifactId: sourceId(input.runtimeArtifactRef) ?? "",
    publishStage: input.publishStage as "shadow" | "canary" | "production",
  });
  const guard = normalized.normalized
    ? evaluatePublishActivationEnforcementGuard({
        tenantId: input.tenantId,
        clientId: input.clientId,
        siteId: input.siteId,
        migrationId: input.migrationId,
        candidateSiteVersionRef: normalized.normalized.candidateSiteVersionRef,
        runtimeArtifactRef: normalized.normalized.runtimeArtifactRef,
        publishTargetRef: normalized.normalized.publishTargetRef,
        publishStage: input.publishStage,
        publishEnvironment: input.publishEnvironment,
        publishActivationDecisionRef: normalized.normalized.publishActivationDecisionRef,
        gateAttemptResultRef: normalized.normalized.gateAttemptResultRef,
        handoffWatermark: normalized.normalized.handoffWatermark ?? "",
        gateInputWatermark: normalized.normalized.gateInputWatermark ?? "",
        actor: input.actor,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        evaluatedAt: input.evaluatedAt ?? snapshot.transactionCapturedAt,
        policy: {
          maxGateAgeMs: input.maxGateAgeMs,
          allowWarningsWithLimitations: input.allowWarningsWithLimitations,
          rereadAaf: false,
          rereadPublishTarget: false,
          detectConflictingNewerGate: false,
        },
        repositorySnapshot: {
          transactionCapturedAt: snapshot.transactionCapturedAt,
          gateAttempt: snapshot.gateAttempt,
          conflictingNewerGateAttempts: snapshot.conflictingNewerGateAttempts,
          approvalRequest: snapshot.decisionSnapshot.request,
          approvalDecision: snapshot.decisionSnapshot.selectedDecision,
          approvalRevoked: rowBoolean(snapshot.decisionSnapshot.selectedDecision, "revoked"),
          approvalSuperseded: rowBoolean(snapshot.decisionSnapshot.selectedDecision, "superseded"),
          publishTarget: snapshot.decisionSnapshot.publishTarget,
        },
      })
    : null;
  const blockerCodes = uniqueSorted([...codes.blockers, ...(guard && !guard.allowed ? guard.blockerCodes : [])]);
  const missingCodes = uniqueSorted([...codes.missing, ...normalized.diagnostics.missingCodes]);
  const mismatchCodes = uniqueSorted([...codes.mismatches, ...normalized.diagnostics.mismatchCodes]);
  const staleCodes = uniqueSorted(codes.stale);
  const warningCodes = uniqueSorted([...codes.warnings, ...normalized.diagnostics.warningCodes, ...(guard?.warnings ?? [])]);
  const complete = normalized.diagnostics.complete && blockerCodes.length === 0 && missingCodes.length === 0 && mismatchCodes.length === 0 && staleCodes.length === 0 && Boolean(guard?.allowed);
  const resolverWatermark = buildPublishActivationMetadataResolverWatermark({
    resolverVersion: PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
    metadataWatermark: normalized.normalized?.metadataWatermark ?? buildPublishActivationMetadataHandoffWatermark(raw),
    transactionCapturedAt: snapshot.transactionCapturedAt,
    diagnostics: { blockerCodes, missingCodes, mismatchCodes, staleCodes },
  });
  return {
    resolverVersion: PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
    publishActivationMetadataHandoff: complete ? normalized.normalized : null,
    diagnostics: {
      status: complete ? "complete" : "incomplete",
      complete,
      blockerCodes,
      missingCodes,
      mismatchCodes,
      staleCodes,
      warningCodes,
      transactionCapturedAt: snapshot.transactionCapturedAt,
      safeIds: normalized.diagnostics.safeIds,
    },
    metadataWatermark: complete ? normalized.normalized?.metadataWatermark ?? null : resolverWatermark,
    flags: PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
  };
}

export async function readAndResolveSingleSitePublishActivationMetadataHandoff(
  input: ReadAndResolveSingleSitePublishActivationMetadataHandoffInput,
): Promise<PublishActivationMetadataResolverResult> {
  const repository = input.repository ?? new PublishActivationMetadataResolverReadRepository();
  try {
    const repositorySnapshot = await repository.readSnapshot(input);
    return resolveSingleSitePublishActivationMetadataHandoff({ ...input, repositorySnapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = uniqueSorted([...requiredMissing(input), "publish_activation_metadata_resolver_read_failure"]);
    return {
      resolverVersion: PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
      publishActivationMetadataHandoff: null,
      diagnostics: {
        status: "incomplete",
        complete: false,
        blockerCodes: ["read_failure"],
        missingCodes: missing,
        mismatchCodes: [],
        staleCodes: [],
        warningCodes: [message],
        transactionCapturedAt: null,
        safeIds: {
          siteId: text(input.siteId),
          siteVersionId: sourceId(input.candidateSiteVersionRef),
          runtimeArtifactId: sourceId(input.runtimeArtifactRef),
          publishTargetId: sourceId(input.expectedPublishTargetRef),
          publishActivationRequestId: refTextId(input.expectedPublishActivationRequestRef),
          publishActivationDecisionId: refTextId(input.expectedPublishActivationDecisionRef),
          gateAttemptId: refTextId(input.expectedGateAttemptResultRef),
        },
      },
      metadataWatermark: buildPublishActivationMetadataResolverWatermark({ input, status: "read_failure" }),
      flags: PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
    };
  }
}

export class PublishActivationMetadataResolverReadRepository implements PublishActivationMetadataResolverReadRepositoryLike {
  constructor(private readonly pool: Pick<Pool, "connect"> = getSuperadminPool()) {}

  async readSnapshot(input: PublishActivationMetadataResolverInput): Promise<PublishActivationMetadataResolverRepositorySnapshot> {
    const client = (await this.pool.connect()) as ResolverPgClient;
    let started = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      started = true;
      const captured = await client.query("select transaction_timestamp()::text as captured_at");
      const transactionCapturedAt = String(captured.rows[0]?.captured_at ?? new Date().toISOString());
      const decisionSnapshot = await this.readDecisionSnapshot(client, input, transactionCapturedAt);
      const gateAttempt = await this.readGateAttempt(client, input, decisionSnapshot);
      const policyEvaluationId = rowText(gateAttempt, "policy_evaluation_id");
      const gatePolicyEvaluation = policyEvaluationId ? await this.readByUuid(client, "gnr8_aaf_approval_policy_evaluations", policyEvaluationId) : null;
      const auditEventId = rowText(gateAttempt, "pre_action_audit_event_id");
      const gateAuditEvent = auditEventId ? await this.readByUuid(client, "gnr8_aaf_audit_events", auditEventId) : null;
      const conflictingNewerGateAttempts = gateAttempt ? await this.readConflictingNewerGateAttempts(client, input, gateAttempt) : [];
      await client.query("commit");
      started = false;
      return { transactionCapturedAt, decisionSnapshot, gateAttempt, gatePolicyEvaluation, gateAuditEvent, conflictingNewerGateAttempts };
    } catch (error) {
      if (started) {
        try {
          await client.query("rollback");
        } catch {
          // Best-effort rollback after a failed read-only metadata resolver transaction.
        }
      }
      throw new PublishActivationMetadataResolverReadRepositoryError("publish_activation_metadata_resolver_read_failed", error);
    } finally {
      client.release?.();
    }
  }

  private async readDecisionSnapshot(client: AafPgClient, input: PublishActivationMetadataResolverInput, capturedAt: string): Promise<PublishActivationDecisionReadSnapshot> {
    const decisionById = input.expectedPublishActivationDecisionRef ? await this.readByUuid(client, "gnr8_aaf_approval_decisions", refTextId(input.expectedPublishActivationDecisionRef)) : null;
    const request =
      (input.expectedPublishActivationRequestRef ? await this.readByUuid(client, "gnr8_aaf_approval_requests", refTextId(input.expectedPublishActivationRequestRef)) : null) ??
      (decisionById ? await this.readByUuid(client, "gnr8_aaf_approval_requests", rowText(decisionById, "approval_request_id")) : null) ??
      (await readOne(
        client,
        `
        select *
        from public.gnr8_aaf_approval_requests
        where tenant_id = $1
          and client_id is not distinct from $2
          and site_id is not distinct from $3
          and scope = $4
          and subject_type = $5
          and subject_id = $6
        order by created_at desc, id desc
        limit 1
        `,
        [input.tenantId, input.clientId, input.siteId, PUBLISH_ACTIVATION_REQUEST_SCOPE, PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE, sourceId(input.candidateSiteVersionRef)],
      ));
    const decisions = rowText(request, "id")
      ? await readAll(
          client,
          `
          select
            d.*,
            exists(select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id) as revoked,
            exists(select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id) as superseded
          from public.gnr8_aaf_approval_decisions d
          where d.approval_request_id = $1::uuid
          order by d.created_at asc, d.id asc
          `,
          [rowText(request, "id")],
        )
      : decisionById
        ? [decisionById]
        : [];
    const selectedDecision = this.preferredDecision(decisions, refTextId(input.expectedPublishActivationDecisionRef));
    const activeDecisions = decisions.filter((decision) => {
      const status = rowText(decision, "status");
      return !["revoked", "expired", "superseded", "cancelled", "not_required_by_policy"].includes(String(status)) && !rowBoolean(decision, "revoked") && !rowBoolean(decision, "superseded");
    });
    const conflictingDecisions = activeDecisions.length > 1 ? activeDecisions : [];
    const requestId = rowText(request, "id");
    const selectedDecisionId = rowText(selectedDecision, "id");
    const requestEvidenceLinks = requestId ? await this.readEvidenceLinks(client, { requestId, decisionId: null }) : [];
    const decisionEvidenceLinks = selectedDecisionId ? await this.readEvidenceLinks(client, { requestId: null, decisionId: selectedDecisionId }) : [];
    const evidencePackageId = rowText(selectedDecision, "evidence_package_id") ?? rowText(decisionEvidenceLinks[0], "evidence_package_id") ?? rowText(requestEvidenceLinks[0], "evidence_package_id");
    const evidencePackage = evidencePackageId ? await this.readByUuid(client, "gnr8_aaf_evidence_packages", evidencePackageId) : null;
    const evidenceSourceRefs = evidencePackageId ? await readAll(client, "select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid order by source_system asc, source_table asc, source_record_id asc, source_watermark asc, id asc", [evidencePackageId]) : [];
    const freshnessRows = evidencePackageId ? await readAll(client, "select * from public.gnr8_aaf_evidence_package_freshness_checks where evidence_package_id = $1::uuid order by checked_at desc, created_at desc, id desc", [evidencePackageId]) : [];
    const policyRows = requestId
      ? await readAll(
          client,
          "select * from public.gnr8_aaf_approval_policy_evaluations where approval_request_id = $1::uuid or ($2::uuid is not null and approval_decision_id = $2::uuid) order by created_at asc, id asc",
          [requestId, selectedDecisionId],
        )
      : [];
    const auditEvents = await readAll(
      client,
      `
      select *
      from public.gnr8_aaf_audit_events
      where ($1::uuid is not null and approval_request_id = $1::uuid)
         or ($2::uuid is not null and approval_decision_id = $2::uuid)
         or ($3::uuid is not null and evidence_package_id = $3::uuid)
      order by created_at asc, id asc
      `,
      [requestId, selectedDecisionId, evidencePackageId],
    );
    const auditRefs = auditEvents.length > 0
      ? await readAll(client, "select * from public.gnr8_aaf_audit_event_refs where audit_event_id = any($1::uuid[]) order by audit_event_id asc, ref_role asc, ref_type asc, ref_id asc", [auditEvents.map((event) => rowText(event, "id"))])
      : [];
    const payload = jsonObject(evidencePackage?.limitations_json);
    const publishTargetId = sourceId(input.expectedPublishTargetRef) ?? sourceIdFromEvidence(evidenceSourceRefs, payload, "publish_target");
    const publishTarget = publishTargetId && await tableExists(client, "gnr8_publish_targets")
      ? await readOne(client, "select * from public.gnr8_publish_targets where id = $1::text limit 1", [publishTargetId])
      : null;
    return {
      transactionCapturedAt: capturedAt,
      request,
      decisions,
      selectedDecision,
      activeDecisions,
      conflictingDecisions,
      requestEvidenceLinks,
      decisionEvidenceLinks,
      evidencePackage,
      evidenceSourceRefs,
      freshnessRows,
      policyRows,
      auditEvents,
      auditRefs,
      launchReadinessRecord: null,
      launchReadinessRefs: [],
      publishTarget,
    };
  }

  private preferredDecision(decisions: readonly PublishActivationDecisionReadRow[], decisionId?: string | null): PublishActivationDecisionReadRow | null {
    const expectedId = text(decisionId);
    if (expectedId) return decisions.find((decision) => rowText(decision, "id") === expectedId) ?? null;
    return decisions.find((decision) => ["granted", "granted_with_limitations"].includes(String(rowText(decision, "status")))) ?? decisions[0] ?? null;
  }

  private async readEvidenceLinks(client: AafPgClient, input: { requestId: string | null; decisionId: string | null }): Promise<PublishActivationDecisionReadRow[]> {
    if (input.decisionId) {
      return readAll(client, "select * from public.gnr8_aaf_approval_evidence_links where approval_decision_id = $1::uuid and link_role = $2 order by created_at asc, id asc", [input.decisionId, PUBLISH_ACTIVATION_DECISION_EVIDENCE_LINK_ROLE]);
    }
    return readAll(client, "select * from public.gnr8_aaf_approval_evidence_links where approval_request_id = $1::uuid and approval_decision_id is null and link_role = $2 order by created_at asc, id asc", [input.requestId, PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE]);
  }

  private async readGateAttempt(client: AafPgClient, input: PublishActivationMetadataResolverInput, snapshot: PublishActivationDecisionReadSnapshot): Promise<PublishActivationDecisionReadRow | null> {
    const expectedGateId = refTextId(input.expectedGateAttemptResultRef);
    if (expectedGateId) return this.readByUuid(client, "gnr8_aaf_action_gate_attempts", expectedGateId);
    return readOne(
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
        and approval_request_id = $8::uuid
        and approval_decision_id = $9::uuid
        and evidence_package_id = $10::uuid
      order by created_at desc, id desc
      limit 1
      `,
      [
        input.tenantId,
        input.clientId,
        input.siteId,
        PUBLISH_ACTIVATION_REQUEST_SCOPE,
        PUBLISH_ACTIVATION_REQUEST_ACTION,
        PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
        sourceId(input.candidateSiteVersionRef),
        rowText(snapshot.request, "id"),
        rowText(snapshot.selectedDecision, "id"),
        rowText(snapshot.evidencePackage, "id"),
      ],
    );
  }

  private async readConflictingNewerGateAttempts(client: AafPgClient, input: PublishActivationMetadataResolverInput, gateAttempt: PublishActivationDecisionReadRow): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
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
    );
  }

  private async readByUuid(client: AafPgClient, tableName: string, id: string | null): Promise<PublishActivationDecisionReadRow | null> {
    if (!isUuid(id)) return null;
    return readOne(client, `select * from public.${tableName} where id = $1::uuid limit 1`, [id]);
  }
}

async function tableExists(client: AafPgClient, tableName: string): Promise<boolean> {
  const result = await client.query("select to_regclass($1) as table_name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function readAll(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<PublishActivationDecisionReadRow[]> {
  const result = await client.query(sql, values);
  return result.rows;
}

async function readOne(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<PublishActivationDecisionReadRow | null> {
  return (await readAll(client, sql, values))[0] ?? null;
}
