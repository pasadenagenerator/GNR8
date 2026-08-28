import "server-only";

import {
  SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
  publishSingleSiteApprovedCandidateShadow,
  type SingleSitePublishStrictContextSummary,
  type SingleSitePublishWrapperInput,
  type SingleSitePublishWrapperResult,
} from "./single-site-publish-wrapper-orchestrator";
import type { PublishActivationEnforcementGuardRef } from "./publish-activation-enforcement-guard";

export const SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION =
  "mvp-56-single-site-shadow-publish-operator-caller:v1" as const;

export const SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_FLAGS = {
  shadowPublish: true,
  dryRun: false,
  blockingEnforcementApplied: false,
  createsAafRecords: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  pasrInvoked: false,
  createsDdomSnapshots: false,
  providerCalls: false,
  billingMutation: false,
  domainMutation: false,
  rollbackMutation: false,
  clientPortalExposure: false,
  opsInboxAction: false,
} as const;

export type SingleSiteShadowPublishOperatorActor = {
  actorType: "human";
  actorId: string;
  actorRole: "platform_superadmin";
};

export type SingleSiteShadowPublishOperatorConfirmation = {
  mode: "shadow_publish";
  shadowPublish: true;
  dryRunOnly: false;
  publishMayExecute: true;
  runtimeMutationMayOccur: true;
  blockingEnforcementApplied: false;
  noAutomaticRollback: true;
  migrationId: string;
  candidateSiteVersionRef: string;
  runtimeArtifactRef: string;
  expectedPublishTargetRef: string;
};

export type SingleSiteShadowPublishOperatorCanonicalRef = PublishActivationEnforcementGuardRef | string;

export type SingleSiteShadowPublishOperatorRequest = {
  mode: "shadow_publish";
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  candidateSiteVersionRef: SingleSiteShadowPublishOperatorCanonicalRef;
  runtimeArtifactRef: SingleSiteShadowPublishOperatorCanonicalRef;
  expectedPublishTargetRef: SingleSiteShadowPublishOperatorCanonicalRef;
  publishStage: "shadow" | "canary" | "production";
  publishEnvironment: string;
  expectedLaunchReadinessEvidenceRef: SingleSiteShadowPublishOperatorCanonicalRef;
  expectedPublishActivationRequestRef: string;
  expectedPublishActivationDecisionRef: string;
  expectedGateAttemptResultRef: string;
  expectedGateAttemptResultDisplayRef?: string | null;
  expectedHandoffWatermark: string;
  expectedGateInputWatermark: string;
  operatorConfirmation: SingleSiteShadowPublishOperatorConfirmation;
  idempotencyKey: string;
  correlationId: string;
  allowWarningsWithLimitations?: boolean;
  maxGateAgeMs?: number | null;
  evaluatedAt?: string | null;
  requestId?: string | null;
};

export type SingleSiteShadowPublishOperatorValidationResult =
  | { valid: true; request: SingleSiteShadowPublishOperatorRequest }
  | { valid: false; errors: string[] };

export type SingleSiteShadowPublishSafePointer = {
  siteVersionId: string | null;
  artifactId: string | null;
};

export type SingleSiteShadowPublishOrchestratorProjection = {
  status: "not_called" | "called" | "failed";
  siteId: string | null;
  siteVersionId: string | null;
  artifactId: string | null;
  publishStage: string | null;
  pointerSwitch: string | null;
  activationOutcome: string | null;
  previousActivePointer: SingleSiteShadowPublishSafePointer | null;
  newActivePointer: SingleSiteShadowPublishSafePointer | null;
};

export type SingleSiteShadowPublishGuardDiagnostics = {
  available: boolean | null;
  guardMode: string | null;
  guardAllowed: boolean | null;
  guardReason: string | null;
  blockerCodes: string[];
  enforcementApplied: false;
} | null;

export type SingleSiteShadowPublishOperatorSafeResult = {
  ok: boolean;
  callerVersion: typeof SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION;
  wrapperVersion: typeof SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION;
  mode: "shadow_publish";
  routeStatus:
    | "shadow_publish_completed"
    | "wrapper_preflight_blocked"
    | "resolver_unavailable"
    | "publish_orchestrator_failed";
  preflightStatus: "caller_validated" | "wrapper_blocked" | "resolver_unavailable";
  resolverStatus: "complete" | "incomplete" | null;
  wrapperStatus: SingleSitePublishWrapperResult["status"];
  publishOrchestratorStatus: SingleSiteShadowPublishOrchestratorProjection["status"];
  publishOrchestrator: SingleSiteShadowPublishOrchestratorProjection;
  shadowGuardDiagnostics: SingleSiteShadowPublishGuardDiagnostics;
  metadataCompleteness: {
    status: "complete" | "incomplete" | null;
    complete: boolean;
    missingCodes: string[];
    mismatchCodes: string[];
    warningCodes: string[];
  };
  blockerCodes: string[];
  warnings: string[];
  limitationCodes: string[];
  safeRefs: SingleSitePublishStrictContextSummary;
  correlationId: string;
  idempotencyKey: string;
  shadowPublish: true;
  dryRun: false;
  blockingEnforcementApplied: false;
  publishMayHaveExecuted: boolean;
  createsAafRecords: false;
  createsGateAttempt: false;
  evaluatesGate: false;
  redactions: string[];
  flags: typeof SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_FLAGS;
};

export type SingleSiteShadowPublishOperatorCallerDependencies = {
  publishSingleSiteApprovedCandidateShadow?: typeof publishSingleSiteApprovedCandidateShadow;
};

const REQUIRED_STRING_FIELDS = [
  "tenantId",
  "clientId",
  "siteId",
  "migrationId",
  "publishEnvironment",
  "expectedPublishActivationRequestRef",
  "expectedPublishActivationDecisionRef",
  "expectedHandoffWatermark",
  "expectedGateInputWatermark",
  "idempotencyKey",
  "correlationId",
] as const;

const REQUIRED_REF_FIELDS = [
  "candidateSiteVersionRef",
  "runtimeArtifactRef",
  "expectedPublishTargetRef",
  "expectedLaunchReadinessEvidenceRef",
] as const;

const ALLOWED_KEYS = new Set([
  "mode",
  ...REQUIRED_STRING_FIELDS,
  ...REQUIRED_REF_FIELDS,
  "expectedGateAttemptResultRef",
  "expectedGateAttemptResultDisplayRef",
  "publishStage",
  "operatorConfirmation",
  "allowWarningsWithLimitations",
  "maxGateAgeMs",
  "evaluatedAt",
  "requestId",
]);

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "actor",
  "actorId",
  "actorRole",
  "actorType",
  "role",
  "userId",
  "principal",
  "superadminUserId",
]);

const FORBIDDEN_EXECUTION_KEYS = new Set([
  "dryRun",
  "enabled",
  "execute",
  "publish",
  "publishes",
  "publishOrchestrator",
  "publishOrchestratorInput",
  "runtimeMutation",
  "blockingEnforcementApplied",
  "createsAafRecords",
  "createsGateAttempt",
  "evaluatesGate",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function sourceIdFromText(value: string): string {
  const normalized = value.trim();
  const parts = normalized.split(":");
  return text(parts[parts.length - 1]) || normalized;
}

function sourceId(value: SingleSiteShadowPublishOperatorCanonicalRef | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return sourceIdFromText(value);
  return text(value.sourceRecordId);
}

function sourceRef(value: SingleSiteShadowPublishOperatorCanonicalRef | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return text(value);
  return text(value.sourceRef) || text(value.sourceRecordId);
}

export function displaySingleSiteShadowPublishOperatorRef(value: SingleSiteShadowPublishOperatorCanonicalRef | null | undefined): string {
  return sourceRef(value) || sourceId(value);
}

function normalizedRef(
  value: unknown,
  defaults: { role: string; sourceTable: string },
): SingleSiteShadowPublishOperatorCanonicalRef | null {
  if (typeof value === "string") return text(value) || null;
  if (!isRecord(value)) return null;
  const sourceRecordId = text(value.sourceRecordId);
  if (!sourceRecordId) return null;
  return {
    role: nullableText(value.role) ?? defaults.role,
    sourceSystem: nullableText(value.sourceSystem) ?? "gnr8",
    sourceTable: nullableText(value.sourceTable) ?? defaults.sourceTable,
    sourceRecordId,
    sourceRef: nullableText(value.sourceRef) ?? sourceRecordId,
    sourceVersion: nullableText(value.sourceVersion),
    sourceWatermark: nullableText(value.sourceWatermark),
    contentHash: nullableText(value.contentHash),
    metadataJson: isRecord(value.metadataJson) ? value.metadataJson : undefined,
  };
}

function metadataString(ref: SingleSiteShadowPublishOperatorCanonicalRef | null | undefined, key: string): string {
  if (!ref || typeof ref === "string" || !isRecord(ref.metadataJson)) return "";
  return text(ref.metadataJson[key]);
}

function validateCanonicalRef(
  field: string,
  value: SingleSiteShadowPublishOperatorCanonicalRef,
  input: Record<string, unknown>,
): string[] {
  if (typeof value === "string") return [];
  const errors: string[] = [];
  const id = sourceId(value);
  const ref = sourceRef(value);
  if (sourceIdFromText(ref) !== id) errors.push(`single_site_shadow_publish_operator_${field}_mismatch`);
  const sourceSystem = text(value.sourceSystem);
  if (sourceSystem && sourceSystem !== "gnr8" && sourceSystem !== "aaf") {
    errors.push(`single_site_shadow_publish_operator_${field}_source_system_mismatch`);
  }
  for (const identityField of ["tenantId", "clientId", "siteId", "migrationId"] as const) {
    const marker = metadataString(value, identityField);
    if (marker && marker !== text(input[identityField])) {
      errors.push(`single_site_shadow_publish_operator_${field}_${identityField}_mismatch`);
    }
  }
  if (field === "expectedPublishTargetRef") {
    const targetEnvironment = metadataString(value, "environment");
    const targetStage = metadataString(value, "publishStage") || metadataString(value, "publish_stage");
    const targetStatus = metadataString(value, "status");
    if (sourceId(value) === "production") {
      if (text(input.publishEnvironment) !== "production") errors.push("single_site_shadow_publish_operator_publish_environment_mismatch");
      if (text(input.publishStage) !== "production") errors.push("single_site_shadow_publish_operator_publish_stage_mismatch");
    }
    if (targetEnvironment && targetEnvironment !== text(input.publishEnvironment)) errors.push("single_site_shadow_publish_operator_publish_environment_mismatch");
    if (targetStage && targetStage !== text(input.publishStage)) errors.push("single_site_shadow_publish_operator_publish_stage_mismatch");
    if (targetStatus && targetStatus !== "active") errors.push("single_site_shadow_publish_operator_publish_target_status_mismatch");
  }
  return errors;
}

function gateAttemptId(value: unknown): string {
  if (typeof value === "string") {
    const normalized = text(value);
    return normalized.includes(":") ? "" : normalized;
  }
  if (!isRecord(value)) return "";
  return text(value.gateAttemptId) || text(value.sourceRecordId);
}

function gateAttemptDisplayRef(value: unknown): string | null {
  if (typeof value === "string") return null;
  if (!isRecord(value)) return null;
  return nullableText(value.gateAttemptRef) ?? nullableText(value.sourceRef);
}

function refSourceIdFromUnknown(value: unknown): string {
  const ref = normalizedRef(value, { role: "comparison", sourceTable: "comparison" });
  return ref ? sourceId(ref) : "";
}

function validateGateAttemptRef(value: unknown, input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const gateId = gateAttemptId(value);
  if (!gateId) {
    errors.push("single_site_shadow_publish_operator_expectedGateAttemptResultRef_raw_id_required");
    return errors;
  }
  if (typeof value === "string") return errors;
  if (!isRecord(value)) {
    errors.push("single_site_shadow_publish_operator_expectedGateAttemptResultRef_invalid");
    return errors;
  }
  const displayRef = gateAttemptDisplayRef(value);
  if (displayRef && sourceIdFromText(displayRef) !== gateId) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_ref_mismatch");
  }
  for (const identityField of ["tenantId", "clientId", "siteId", "migrationId"] as const) {
    const marker = text(value[identityField]);
    if (marker && marker !== text(input[identityField])) {
      errors.push(`single_site_shadow_publish_operator_gate_attempt_${identityField}_mismatch`);
    }
  }
  if (text(value.publishStage) && text(value.publishStage) !== text(input.publishStage)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_publish_stage_mismatch");
  }
  if (text(value.publishEnvironment) && text(value.publishEnvironment) !== text(input.publishEnvironment)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_publish_environment_mismatch");
  }
  if (text(value.semanticHandoffWatermark) && text(value.semanticHandoffWatermark) !== text(input.expectedHandoffWatermark)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_handoff_watermark_mismatch");
  }
  if (text(value.semanticGateInputWatermark) && text(value.semanticGateInputWatermark) !== text(input.expectedGateInputWatermark)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_gate_input_watermark_mismatch");
  }
  if (refSourceIdFromUnknown(value.candidateSiteVersionRef) && refSourceIdFromUnknown(value.candidateSiteVersionRef) !== refSourceIdFromUnknown(input.candidateSiteVersionRef)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_candidate_site_version_ref_mismatch");
  }
  if (refSourceIdFromUnknown(value.runtimeArtifactRef) && refSourceIdFromUnknown(value.runtimeArtifactRef) !== refSourceIdFromUnknown(input.runtimeArtifactRef)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_runtime_artifact_ref_mismatch");
  }
  if (refSourceIdFromUnknown(value.publishTargetRef) && refSourceIdFromUnknown(value.publishTargetRef) !== refSourceIdFromUnknown(input.expectedPublishTargetRef)) {
    errors.push("single_site_shadow_publish_operator_gate_attempt_publish_target_ref_mismatch");
  }
  return errors;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return text(value);
}

function validateConfirmation(
  value: unknown,
  input: Record<string, unknown>,
): SingleSiteShadowPublishOperatorConfirmation | null {
  if (!isRecord(value)) return null;
  const confirmation = {
    mode: value.mode,
    shadowPublish: value.shadowPublish,
    dryRunOnly: value.dryRunOnly,
    publishMayExecute: value.publishMayExecute,
    runtimeMutationMayOccur: value.runtimeMutationMayOccur,
    blockingEnforcementApplied: value.blockingEnforcementApplied,
    noAutomaticRollback: value.noAutomaticRollback,
    migrationId: text(value.migrationId),
    candidateSiteVersionRef: text(value.candidateSiteVersionRef),
    runtimeArtifactRef: text(value.runtimeArtifactRef),
    expectedPublishTargetRef: text(value.expectedPublishTargetRef),
  };
  if (confirmation.mode !== "shadow_publish") return null;
  if (confirmation.shadowPublish !== true) return null;
  if (confirmation.dryRunOnly !== false) return null;
  if (confirmation.publishMayExecute !== true) return null;
  if (confirmation.runtimeMutationMayOccur !== true) return null;
  if (confirmation.blockingEnforcementApplied !== false) return null;
  if (confirmation.noAutomaticRollback !== true) return null;
  if (confirmation.migrationId !== text(input.migrationId)) return null;
  if (sourceIdFromText(confirmation.candidateSiteVersionRef) !== refSourceIdFromUnknown(input.candidateSiteVersionRef)) return null;
  if (sourceIdFromText(confirmation.runtimeArtifactRef) !== refSourceIdFromUnknown(input.runtimeArtifactRef)) return null;
  if (sourceIdFromText(confirmation.expectedPublishTargetRef) !== refSourceIdFromUnknown(input.expectedPublishTargetRef)) return null;
  return confirmation as SingleSiteShadowPublishOperatorConfirmation;
}

export function validateSingleSiteShadowPublishOperatorRequest(
  body: unknown,
): SingleSiteShadowPublishOperatorValidationResult {
  if (!isRecord(body)) {
    return { valid: false, errors: ["single_site_shadow_publish_operator_request_body_must_be_object"] };
  }

  const errors: string[] = [];
  for (const key of Object.keys(body).sort()) {
    if (!ALLOWED_KEYS.has(key)) errors.push(`single_site_shadow_publish_operator_forbidden_field:${key}`);
    if (FORBIDDEN_AUTHORITY_KEYS.has(key)) errors.push(`single_site_shadow_publish_operator_actor_override_forbidden:${key}`);
    if (FORBIDDEN_EXECUTION_KEYS.has(key)) errors.push(`single_site_shadow_publish_operator_execution_field_forbidden:${key}`);
  }

  if (body.mode !== "shadow_publish") errors.push("single_site_shadow_publish_operator_mode_shadow_publish_required");
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!text(body[field])) errors.push(`single_site_shadow_publish_operator_${field}_missing`);
  }
  const canonicalRefs = {
    candidateSiteVersionRef: normalizedRef(body.candidateSiteVersionRef, { role: "candidate_site_version", sourceTable: "gnr8_runtime_site_versions" }),
    runtimeArtifactRef: normalizedRef(body.runtimeArtifactRef, { role: "runtime_artifact", sourceTable: "gnr8_runtime_artifacts" }),
    expectedPublishTargetRef: normalizedRef(body.expectedPublishTargetRef, { role: "publish_target", sourceTable: "gnr8_publish_targets" }),
    expectedLaunchReadinessEvidenceRef: normalizedRef(body.expectedLaunchReadinessEvidenceRef, { role: "launch_readiness_evidence", sourceTable: "gnr8_aaf_evidence_packages" }),
  };
  for (const field of REQUIRED_REF_FIELDS) {
    const refValue = canonicalRefs[field];
    if (!refValue || !sourceId(refValue)) errors.push(`single_site_shadow_publish_operator_${field}_missing`);
    else errors.push(...validateCanonicalRef(field, refValue, body));
  }
  errors.push(...validateGateAttemptRef(body.expectedGateAttemptResultRef, body));
  if (!["shadow", "canary", "production"].includes(text(body.publishStage))) {
    errors.push("single_site_shadow_publish_operator_publishStage_invalid");
  }

  const confirmation = validateConfirmation(body.operatorConfirmation, body);
  if (!confirmation) errors.push("single_site_shadow_publish_operator_confirmation_invalid");

  const allowWarningsWithLimitations = optionalBoolean(body.allowWarningsWithLimitations);
  if (body.allowWarningsWithLimitations !== undefined && allowWarningsWithLimitations === undefined) {
    errors.push("single_site_shadow_publish_operator_allowWarningsWithLimitations_invalid");
  }
  const maxGateAgeMs = optionalNumber(body.maxGateAgeMs);
  if (body.maxGateAgeMs !== undefined && maxGateAgeMs === undefined) {
    errors.push("single_site_shadow_publish_operator_maxGateAgeMs_invalid");
  }
  const evaluatedAt = optionalString(body.evaluatedAt);
  if (evaluatedAt !== undefined && evaluatedAt !== null && Number.isNaN(Date.parse(evaluatedAt))) {
    errors.push("single_site_shadow_publish_operator_evaluatedAt_invalid");
  }
  const requestId = optionalString(body.requestId);

  if (errors.length > 0 || !confirmation) {
    return { valid: false, errors: Array.from(new Set(errors)).sort() };
  }

  return {
    valid: true,
    request: {
      mode: "shadow_publish",
      tenantId: text(body.tenantId),
      clientId: text(body.clientId),
      siteId: text(body.siteId),
      migrationId: text(body.migrationId),
      candidateSiteVersionRef: canonicalRefs.candidateSiteVersionRef!,
      runtimeArtifactRef: canonicalRefs.runtimeArtifactRef!,
      expectedPublishTargetRef: canonicalRefs.expectedPublishTargetRef!,
      publishStage: text(body.publishStage) as SingleSiteShadowPublishOperatorRequest["publishStage"],
      publishEnvironment: text(body.publishEnvironment),
      expectedLaunchReadinessEvidenceRef: canonicalRefs.expectedLaunchReadinessEvidenceRef!,
      expectedPublishActivationRequestRef: text(body.expectedPublishActivationRequestRef),
      expectedPublishActivationDecisionRef: text(body.expectedPublishActivationDecisionRef),
      expectedGateAttemptResultRef: gateAttemptId(body.expectedGateAttemptResultRef),
      ...(nullableText(body.expectedGateAttemptResultDisplayRef) || gateAttemptDisplayRef(body.expectedGateAttemptResultRef)
        ? { expectedGateAttemptResultDisplayRef: nullableText(body.expectedGateAttemptResultDisplayRef) ?? gateAttemptDisplayRef(body.expectedGateAttemptResultRef) }
        : {}),
      expectedHandoffWatermark: text(body.expectedHandoffWatermark),
      expectedGateInputWatermark: text(body.expectedGateInputWatermark),
      operatorConfirmation: confirmation,
      idempotencyKey: text(body.idempotencyKey),
      correlationId: text(body.correlationId),
      ...(allowWarningsWithLimitations === undefined ? {} : { allowWarningsWithLimitations }),
      ...(maxGateAgeMs === undefined ? {} : { maxGateAgeMs }),
      ...(evaluatedAt === undefined ? {} : { evaluatedAt }),
      ...(requestId === undefined ? {} : { requestId }),
    },
  };
}

function wrapperInput(
  request: SingleSiteShadowPublishOperatorRequest,
  actor: SingleSiteShadowPublishOperatorActor,
): SingleSitePublishWrapperInput {
  return {
    enabled: true,
    mode: "shadow_publish",
    dryRun: false,
    tenantId: request.tenantId,
    clientId: request.clientId,
    siteId: request.siteId,
    migrationId: request.migrationId,
    candidateSiteVersionRef: request.candidateSiteVersionRef,
    runtimeArtifactRef: request.runtimeArtifactRef,
    expectedPublishTargetRef: request.expectedPublishTargetRef,
    publishStage: request.publishStage,
    publishEnvironment: request.publishEnvironment,
    expectedLaunchReadinessEvidenceRef: request.expectedLaunchReadinessEvidenceRef,
    expectedPublishActivationRequestRef: request.expectedPublishActivationRequestRef,
    expectedPublishActivationDecisionRef: request.expectedPublishActivationDecisionRef,
    expectedGateAttemptResultRef: request.expectedGateAttemptResultRef,
    expectedHandoffWatermark: request.expectedHandoffWatermark,
    expectedGateInputWatermark: request.expectedGateInputWatermark,
    actor,
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    allowWarningsWithLimitations: request.allowWarningsWithLimitations,
    maxGateAgeMs: request.maxGateAgeMs,
    evaluatedAt: request.evaluatedAt,
    requestId: request.requestId,
  };
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(nullableText).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function safeCode(value: unknown, fallback: string): string {
  const normalized = nullableText(value);
  if (!normalized) return fallback;
  if (normalized.length > 128) return fallback;
  return /^[a-zA-Z0-9_.:-]+$/.test(normalized) ? normalized : fallback;
}

function safeDiagnosticCode(value: unknown, fallback: string): string {
  const normalized = safeCode(value, fallback);
  if (normalized === fallback) return fallback;
  if (/secret|token|credential|password|stack|sql|stripe|provider/i.test(normalized)) return fallback;
  if (
    normalized.startsWith("single_site_") ||
    normalized.startsWith("publish_activation_") ||
    normalized.startsWith("limitations_") ||
    normalized.startsWith("metadata_") ||
    normalized.startsWith("wrapper_")
  ) {
    return normalized;
  }
  return fallback;
}

function safeCodes(values: readonly unknown[], fallback: string): string[] {
  return uniqueSorted(values.map((value) => safeCode(value, fallback)));
}

function safeDiagnosticCodes(values: readonly unknown[], fallback: string): string[] {
  return uniqueSorted(values.map((value) => safeDiagnosticCode(value, fallback)));
}

function limitationCodes(value: unknown): string[] {
  const result: string[] = [];
  const visit = (entry: unknown) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (!isRecord(entry)) return;
    const code = nullableText(entry.code);
    if (code) result.push(safeCode(code, "single_site_shadow_publish_limitation_redacted"));
    Object.values(entry).forEach((nested) => {
      if (Array.isArray(nested)) nested.forEach(visit);
    });
  };
  visit(value);
  return uniqueSorted(result);
}

function safePointer(value: unknown): SingleSiteShadowPublishSafePointer | null {
  if (!isRecord(value)) return null;
  return {
    siteVersionId: nullableText(value.siteVersionId),
    artifactId: nullableText(value.artifactId),
  };
}

function projectPublishOrchestratorResult(
  wrapperResult: SingleSitePublishWrapperResult,
): SingleSiteShadowPublishOrchestratorProjection {
  const raw = wrapperResult.publishOrchestratorResult;
  const status =
    wrapperResult.status === "published_via_existing_orchestrator"
      ? "called"
      : wrapperResult.status === "orchestrator_failed"
        ? "failed"
        : "not_called";
  if (!isRecord(raw)) {
    return {
      status,
      siteId: null,
      siteVersionId: null,
      artifactId: null,
      publishStage: null,
      pointerSwitch: null,
      activationOutcome: null,
      previousActivePointer: null,
      newActivePointer: null,
    };
  }
  const rawRecord = raw as Record<string, unknown>;
  return {
    status,
    siteId: nullableText(rawRecord.siteId),
    siteVersionId: nullableText(rawRecord.siteVersionId),
    artifactId: nullableText(rawRecord.artifactId),
    publishStage: nullableText(rawRecord.publishStage),
    pointerSwitch: nullableText(rawRecord.pointerSwitch),
    activationOutcome: nullableText(rawRecord.activationOutcome),
    previousActivePointer: safePointer(rawRecord.previousActivePointer),
    newActivePointer: safePointer(rawRecord.newActivePointer),
  };
}

function projectGuardDiagnostics(wrapperResult: SingleSitePublishWrapperResult): SingleSiteShadowPublishGuardDiagnostics {
  const publishResultRecord = isRecord(wrapperResult.publishOrchestratorResult)
    ? (wrapperResult.publishOrchestratorResult as Record<string, unknown>)
    : null;
  const raw = publishResultRecord
    ? publishResultRecord.publishActivationEnforcementShadowObservation ??
      publishResultRecord.enforcementShadowObservation ??
      publishResultRecord.shadowGuardDiagnostics
    : null;
  if (!isRecord(raw)) return null;
  return {
    available: typeof raw.available === "boolean" ? raw.available : null,
    guardMode: nullableText(raw.guardMode),
    guardAllowed: typeof raw.guardAllowed === "boolean" ? raw.guardAllowed : null,
    guardReason: safeDiagnosticCode(raw.guardReason, "single_site_shadow_publish_guard_reason_redacted"),
    blockerCodes: safeCodes(Array.isArray(raw.blockerCodes) ? raw.blockerCodes : [], "single_site_shadow_publish_guard_code_redacted"),
    enforcementApplied: false,
  };
}

function routeStatusForWrapper(
  wrapperStatus: SingleSitePublishWrapperResult["status"],
): SingleSiteShadowPublishOperatorSafeResult["routeStatus"] {
  if (wrapperStatus === "published_via_existing_orchestrator") return "shadow_publish_completed";
  if (wrapperStatus === "resolver_unavailable") return "resolver_unavailable";
  if (wrapperStatus === "orchestrator_failed") return "publish_orchestrator_failed";
  return "wrapper_preflight_blocked";
}

export function projectSingleSiteShadowPublishOperatorResult(input: {
  request: SingleSiteShadowPublishOperatorRequest;
  wrapperResult: SingleSitePublishWrapperResult;
}): SingleSiteShadowPublishOperatorSafeResult {
  const metadata = input.wrapperResult.metadataHandoffCompleteness;
  const resolverStatus = input.wrapperResult.resolverDiagnostics?.status ?? null;
  const preflightStatus =
    input.wrapperResult.status === "resolver_unavailable"
      ? "resolver_unavailable"
      : input.wrapperResult.status === "preflight_blocked"
        ? "wrapper_blocked"
        : "caller_validated";
  const publishOrchestrator = projectPublishOrchestratorResult(input.wrapperResult);
  const publishMayHaveExecuted =
    input.wrapperResult.status === "published_via_existing_orchestrator" ||
    input.wrapperResult.status === "orchestrator_failed";

  return {
    ok: input.wrapperResult.status === "published_via_existing_orchestrator" && input.wrapperResult.dryRun === false,
    callerVersion: SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_CALLER_VERSION,
    wrapperVersion: input.wrapperResult.wrapperVersion,
    mode: "shadow_publish",
    routeStatus: routeStatusForWrapper(input.wrapperResult.status),
    preflightStatus,
    resolverStatus,
    wrapperStatus: input.wrapperResult.status,
    publishOrchestratorStatus: publishOrchestrator.status,
    publishOrchestrator,
    shadowGuardDiagnostics: projectGuardDiagnostics(input.wrapperResult),
    metadataCompleteness: {
      status: metadata?.status ?? null,
      complete: metadata?.complete ?? false,
      missingCodes: safeCodes(metadata?.missingCodes ?? [], "single_site_shadow_publish_metadata_code_redacted"),
      mismatchCodes: safeCodes(metadata?.mismatchCodes ?? [], "single_site_shadow_publish_metadata_code_redacted"),
      warningCodes: safeCodes(metadata?.warningCodes ?? [], "single_site_shadow_publish_metadata_code_redacted"),
    },
    blockerCodes: safeCodes(input.wrapperResult.blockerCodes, "single_site_shadow_publish_blocker_redacted"),
    warnings: safeDiagnosticCodes(input.wrapperResult.warnings, "single_site_shadow_publish_warning_redacted"),
    limitationCodes: limitationCodes(input.wrapperResult.limitations),
    safeRefs: input.wrapperResult.strictContextSummary,
    correlationId: input.request.correlationId,
    idempotencyKey: input.request.idempotencyKey,
    shadowPublish: true,
    dryRun: false,
    blockingEnforcementApplied: false,
    publishMayHaveExecuted,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    redactions: [
      "resolverResult",
      "publishActivationMetadataHandoff",
      "publishOrchestratorInput",
      "rawPublishOrchestratorResult",
      "rawEvidencePayloads",
      "rawAafRows",
      "sourceRefs",
      "diagnosticRefs",
      "providerSecrets",
      "billingData",
      "rawSqlErrors",
      "stackTraces",
    ],
    flags: SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_FLAGS,
  };
}

export async function runSingleSiteShadowPublishOperatorAction(input: {
  request: SingleSiteShadowPublishOperatorRequest;
  actor: SingleSiteShadowPublishOperatorActor;
  dependencies?: SingleSiteShadowPublishOperatorCallerDependencies;
}): Promise<SingleSiteShadowPublishOperatorSafeResult> {
  const wrapper = input.dependencies?.publishSingleSiteApprovedCandidateShadow ?? publishSingleSiteApprovedCandidateShadow;
  const result = await wrapper(wrapperInput(input.request, input.actor));
  return projectSingleSiteShadowPublishOperatorResult({
    request: input.request,
    wrapperResult: result,
  });
}
