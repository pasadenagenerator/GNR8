import "server-only";

import { createHash } from "node:crypto";

import type {
  PublishActivationEnforcementGuardActor,
  PublishActivationEnforcementGuardPolicy,
  PublishActivationEnforcementGuardReadRepositoryLike,
  PublishActivationEnforcementGuardRef,
  PublishActivationPersistedGateResultRef,
} from "./publish-activation-enforcement-guard";

export const PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE = "single_site_publish_activation" as const;
export const PUBLISH_ACTIVATION_METADATA_HANDOFF_VERSION = "mvp-48-publish-activation-metadata-handoff:v1" as const;

export type PublishActivationMetadataHandoffRef = PublishActivationEnforcementGuardRef | string;

export type PublishActivationMetadataHandoffDecisionRef = {
  id?: string | null;
  ref?: string | null;
  status?: string | null;
};

export type PublishActivationMetadataHandoffRequestRef = {
  id?: string | null;
  ref?: string | null;
  status?: string | null;
};

export type PublishActivationMetadataHandoff = {
  sourceType?: typeof PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE | string | null;
  tenantId?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  migrationId?: string | null;
  candidateSiteVersionRef?: PublishActivationMetadataHandoffRef | null;
  runtimeArtifactRef?: PublishActivationMetadataHandoffRef | null;
  publishTargetRef?: PublishActivationMetadataHandoffRef | null;
  publishStage?: "shadow" | "canary" | "production" | string | null;
  publishEnvironment?: string | null;
  publishActivationRequestRef?: PublishActivationMetadataHandoffRequestRef | null;
  publishActivationDecisionRef?: PublishActivationMetadataHandoffDecisionRef | null;
  gateAttemptResultRef?: PublishActivationPersistedGateResultRef | null;
  handoffWatermark?: string | null;
  gateInputWatermark?: string | null;
  limitations?: PublishActivationPersistedGateResultRef["limitations"];
  actorRole?: string | null;
  actorType?: PublishActivationEnforcementGuardActor["actorType"];
  correlationId?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  policy?: PublishActivationEnforcementGuardPolicy;
  repository?: PublishActivationEnforcementGuardReadRepositoryLike;
};

export type PublishActivationMetadataHandoffIntent = {
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  publishStage: "shadow" | "canary" | "production";
};

export type NormalizedPublishActivationMetadataHandoffRef = Exclude<PublishActivationEnforcementGuardRef, string>;

export type NormalizedPublishActivationMetadataHandoff = {
  handoffVersion: typeof PUBLISH_ACTIVATION_METADATA_HANDOFF_VERSION;
  sourceType: typeof PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE;
  tenantId: string | null;
  clientId: string | null;
  siteId: string | null;
  migrationId: string | null;
  candidateSiteVersionRef: NormalizedPublishActivationMetadataHandoffRef | null;
  runtimeArtifactRef: NormalizedPublishActivationMetadataHandoffRef | null;
  publishTargetRef: NormalizedPublishActivationMetadataHandoffRef | null;
  publishStage: "shadow" | "canary" | "production" | string | null;
  publishEnvironment: string | null;
  publishActivationRequestRef: {
    id: string | null;
    ref: string | null;
    status: string | null;
  };
  publishActivationDecisionRef: {
    id: string | null;
    ref: string | null;
    status: string | null;
  };
  gateAttemptResultRef: PublishActivationPersistedGateResultRef | null;
  handoffWatermark: string | null;
  gateInputWatermark: string | null;
  limitations: PublishActivationPersistedGateResultRef["limitations"];
  actorRole: string;
  actorType: PublishActivationEnforcementGuardActor["actorType"];
  correlationId: string;
  idempotencyKey: string;
  requestId: string | null;
  metadataWatermark: string;
  policy?: PublishActivationEnforcementGuardPolicy;
  repository?: PublishActivationEnforcementGuardReadRepositoryLike;
};

export type PublishActivationMetadataHandoffDiagnostics = {
  status: "complete" | "incomplete";
  complete: boolean;
  missingCodes: string[];
  mismatchCodes: string[];
  warningCodes: string[];
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

export type PublishActivationMetadataHandoffNormalizationResult = {
  normalized: NormalizedPublishActivationMetadataHandoff | null;
  diagnostics: PublishActivationMetadataHandoffDiagnostics;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function recordIdFromRef(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(":");
  return text(parts[parts.length - 1]) ?? value;
}

function refId(ref: PublishActivationMetadataHandoffRef | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") return recordIdFromRef(text(ref));
  return text(ref.sourceRecordId);
}

function normalizeRef(
  role: string,
  sourceTable: string,
  ref: PublishActivationMetadataHandoffRef | null | undefined,
): NormalizedPublishActivationMetadataHandoffRef | null {
  if (!ref) return null;
  if (typeof ref === "string") {
    const sourceRef = text(ref);
    const sourceRecordId = recordIdFromRef(sourceRef);
    if (!sourceRecordId) return null;
    return {
      role,
      sourceSystem: "gnr8",
      sourceTable,
      sourceRecordId,
      sourceRef,
    };
  }
  const sourceRecordId = text(ref.sourceRecordId);
  if (!sourceRecordId) return null;
  return {
    role: text(ref.role) ?? role,
    sourceSystem: text(ref.sourceSystem) ?? "gnr8",
    sourceTable: text(ref.sourceTable) ?? sourceTable,
    sourceRecordId,
    sourceRef: text(ref.sourceRef) ?? sourceRecordId,
    sourceVersion: text(ref.sourceVersion),
    sourceWatermark: text(ref.sourceWatermark),
    contentHash: text(ref.contentHash),
    metadataJson: ref.metadataJson,
  };
}

function normalizeDecisionRef(ref: PublishActivationMetadataHandoffDecisionRef | null | undefined): NormalizedPublishActivationMetadataHandoff["publishActivationDecisionRef"] {
  const rawRef = text(ref?.ref);
  return {
    id: text(ref?.id) ?? recordIdFromRef(rawRef),
    ref: rawRef,
    status: text(ref?.status),
  };
}

function normalizeRequestRef(ref: PublishActivationMetadataHandoffRequestRef | null | undefined): NormalizedPublishActivationMetadataHandoff["publishActivationRequestRef"] {
  const rawRef = text(ref?.ref);
  return {
    id: text(ref?.id) ?? recordIdFromRef(rawRef),
    ref: rawRef,
    status: text(ref?.status),
  };
}

function normalizeGate(gate: PublishActivationPersistedGateResultRef | null | undefined, limitations: PublishActivationMetadataHandoff["limitations"]): PublishActivationPersistedGateResultRef | null {
  if (!gate) return null;
  return {
    ...gate,
    gateAttemptId: text(gate.gateAttemptId),
    gateAttemptRef: text(gate.gateAttemptRef),
    gateResult: text(gate.gateResult),
    evaluationStatus: text(gate.evaluationStatus),
    policyResult: text(gate.policyResult),
    approvalRequestId: text(gate.approvalRequestId),
    approvalDecisionId: text(gate.approvalDecisionId),
    evidencePackageId: text(gate.evidencePackageId),
    policyEvaluationId: text(gate.policyEvaluationId),
    auditEventId: text(gate.auditEventId),
    scope: text(gate.scope),
    action: text(gate.action),
    subjectType: text(gate.subjectType),
    subjectId: text(gate.subjectId),
    tenantId: text(gate.tenantId),
    clientId: text(gate.clientId),
    siteId: text(gate.siteId),
    migrationId: text(gate.migrationId),
    publishStage: text(gate.publishStage),
    publishEnvironment: text(gate.publishEnvironment),
    semanticHandoffWatermark: text(gate.semanticHandoffWatermark),
    semanticGateInputWatermark: text(gate.semanticGateInputWatermark),
    correlationId: text(gate.correlationId),
    idempotencyKey: text(gate.idempotencyKey),
    limitations: gate.limitations ?? limitations,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((acc, key) => {
      const item = record[key];
      if (item !== undefined && typeof item !== "function") acc[key] = stableValue(item);
      return acc;
    }, {});
}

export function buildPublishActivationMetadataHandoffWatermark(input: unknown): string {
  const json = JSON.stringify(stableValue(input));
  const digest = createHash("sha256").update(json).digest("hex");
  return `single-site-publish-activation-metadata-handoff:${digest}`;
}

function missingCode(field: string): string {
  return `publish_activation_metadata_handoff_${field}_missing`;
}

function mismatchCode(field: string): string {
  return `publish_activation_metadata_handoff_${field}_mismatch`;
}

export function normalizePublishActivationMetadataHandoff(
  input: PublishActivationMetadataHandoff | null | undefined,
  intent?: PublishActivationMetadataHandoffIntent,
): PublishActivationMetadataHandoffNormalizationResult {
  const sourceType = text(input?.sourceType);
  const candidateSiteVersionRef = normalizeRef("candidate_site_version", "gnr8_runtime_site_versions", input?.candidateSiteVersionRef);
  const runtimeArtifactRef = normalizeRef("runtime_artifact", "gnr8_runtime_artifacts", input?.runtimeArtifactRef);
  const publishTargetRef = normalizeRef("publish_target", "gnr8_publish_targets", input?.publishTargetRef);
  const publishActivationRequestRef = normalizeRequestRef(input?.publishActivationRequestRef);
  const publishActivationDecisionRef = normalizeDecisionRef(input?.publishActivationDecisionRef);
  const gateAttemptResultRef = normalizeGate(input?.gateAttemptResultRef, input?.limitations ?? null);
  const semanticInput = {
    handoffVersion: PUBLISH_ACTIVATION_METADATA_HANDOFF_VERSION,
    sourceType,
    tenantId: text(input?.tenantId),
    clientId: text(input?.clientId),
    siteId: text(input?.siteId),
    migrationId: text(input?.migrationId),
    candidateSiteVersionRef,
    runtimeArtifactRef,
    publishTargetRef,
    publishStage: text(input?.publishStage),
    publishEnvironment: text(input?.publishEnvironment),
    publishActivationRequestRef,
    publishActivationDecisionRef,
    gateAttempt: {
      gateAttemptId: text(gateAttemptResultRef?.gateAttemptId),
      gateResult: text(gateAttemptResultRef?.gateResult),
      evaluationStatus: text(gateAttemptResultRef?.evaluationStatus),
      approvalDecisionId: text(gateAttemptResultRef?.approvalDecisionId),
      publishTargetRef: gateAttemptResultRef?.publishTargetRef ?? null,
    },
    handoffWatermark: text(input?.handoffWatermark),
    gateInputWatermark: text(input?.gateInputWatermark),
    limitations: input?.limitations ?? null,
  };
  const metadataWatermark = buildPublishActivationMetadataHandoffWatermark(semanticInput);
  const metadataWatermarkId = metadataWatermark.split(":").at(-1) ?? metadataWatermark;
  const normalized: NormalizedPublishActivationMetadataHandoff | null = input
    ? {
        handoffVersion: PUBLISH_ACTIVATION_METADATA_HANDOFF_VERSION,
        sourceType: PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
        tenantId: text(input.tenantId),
        clientId: text(input.clientId),
        siteId: text(input.siteId),
        migrationId: text(input.migrationId),
        candidateSiteVersionRef,
        runtimeArtifactRef,
        publishTargetRef,
        publishStage: text(input.publishStage),
        publishEnvironment: text(input.publishEnvironment),
        publishActivationRequestRef,
        publishActivationDecisionRef,
        gateAttemptResultRef,
        handoffWatermark: text(input.handoffWatermark),
        gateInputWatermark: text(input.gateInputWatermark),
        limitations: input.limitations ?? null,
        actorRole: text(input.actorRole) ?? "agency_admin",
        actorType: input.actorType === "system" ? "system" : "human",
        correlationId: text(input.correlationId) ?? `mvp48-correlation:${metadataWatermarkId}`,
        idempotencyKey: text(input.idempotencyKey) ?? `mvp48-idempotency:${metadataWatermarkId}`,
        requestId: text(input.requestId) ?? publishActivationRequestRef.id,
        metadataWatermark,
        policy: input.policy,
        repository: input.repository,
      }
    : null;

  const missing: string[] = [];
  if (!input) missing.push("publish_activation_metadata_handoff_missing");
  if (sourceType !== PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE) missing.push(missingCode("source_type"));
  if (!text(input?.tenantId)) missing.push(missingCode("tenant_id"));
  if (!text(input?.clientId)) missing.push(missingCode("client_id"));
  if (!text(input?.siteId)) missing.push(missingCode("site_id"));
  if (!text(input?.migrationId)) missing.push(missingCode("migration_id"));
  if (!refId(input?.candidateSiteVersionRef)) missing.push(missingCode("candidate_site_version_ref"));
  if (!refId(input?.runtimeArtifactRef)) missing.push(missingCode("runtime_artifact_ref"));
  if (!refId(input?.publishTargetRef)) missing.push(missingCode("publish_target_ref"));
  if (!text(input?.publishStage)) missing.push(missingCode("publish_stage"));
  if (!text(input?.publishEnvironment)) missing.push(missingCode("publish_environment"));
  if (!publishActivationRequestRef.id && !publishActivationRequestRef.ref) missing.push(missingCode("publish_activation_request_ref"));
  if (!publishActivationDecisionRef.id && !publishActivationDecisionRef.ref) missing.push(missingCode("publish_activation_decision_ref"));
  if (!text(gateAttemptResultRef?.gateAttemptId)) missing.push(missingCode("gate_attempt_result_ref"));
  if (!text(input?.handoffWatermark)) missing.push(missingCode("handoff_watermark"));
  if (!text(input?.gateInputWatermark)) missing.push(missingCode("gate_input_watermark"));

  const mismatches: string[] = [];
  if (intent && normalized) {
    if (normalized.siteId && normalized.siteId !== intent.siteId) mismatches.push(mismatchCode("site_id"));
    if (normalized.publishStage && normalized.publishStage !== intent.publishStage) mismatches.push(mismatchCode("publish_stage"));
    if (candidateSiteVersionRef?.sourceRecordId && candidateSiteVersionRef.sourceRecordId !== intent.siteVersionId) {
      mismatches.push(mismatchCode("candidate_site_version_ref"));
    }
    if (runtimeArtifactRef?.sourceRecordId && runtimeArtifactRef.sourceRecordId !== intent.runtimeArtifactId) {
      mismatches.push(mismatchCode("runtime_artifact_ref"));
    }
  }

  const warningCodes = normalized && !text(input?.actorRole) ? ["publish_activation_metadata_handoff_actor_role_defaulted"] : [];
  const complete = missing.length === 0 && mismatches.length === 0 && Boolean(normalized);
  return {
    normalized,
    diagnostics: {
      status: complete ? "complete" : "incomplete",
      complete,
      missingCodes: missing,
      mismatchCodes: mismatches,
      warningCodes,
      safeIds: {
        siteId: text(input?.siteId),
        siteVersionId: candidateSiteVersionRef?.sourceRecordId ?? null,
        runtimeArtifactId: runtimeArtifactRef?.sourceRecordId ?? null,
        publishTargetId: publishTargetRef?.sourceRecordId ?? null,
        publishActivationRequestId: publishActivationRequestRef.id,
        publishActivationDecisionId: publishActivationDecisionRef.id,
        gateAttemptId: text(gateAttemptResultRef?.gateAttemptId),
      },
    },
  };
}
