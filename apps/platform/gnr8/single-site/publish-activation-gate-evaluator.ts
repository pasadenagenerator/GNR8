import "server-only";

import type { AafGateResult, AafPolicyEvaluationResult, AafPrivacyLabel, AafRetentionClass } from "@gnr8/runtime-contracts";

import {
  AafActionGateValidatorFacade,
  type AafGateValidationInput,
  type AafGateValidationResult,
} from "../aaf/aaf-policy-gate-facade";
import type { AafActorType } from "../aaf/aaf-writer-repository";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
} from "./publish-activation-request-bridge";
import {
  hashPublishActivationDecisionReadValue,
  type PublishActivationDecisionReadRef,
} from "./publish-activation-decision-read-model";
import {
  PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION,
  type PublishActivationGateHandoffPackage,
} from "./publish-activation-gate-handoff";

export const PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION = "mvp-44-publish-activation-gate-evaluator:v1" as const;

export const PUBLISH_ACTIVATION_GATE_EVALUATOR_FLAGS = {
  gateEvaluated: true,
  enforcementApplied: false,
  publishActionBlocked: false,
  publishes: false,
  runtimeMutation: false,
  providerCalls: false,
  createsApprovalRequest: false,
  createsApprovalDecision: false,
  createsDdomSnapshots: false,
  pasrInvoked: false,
} as const;

export type PublishActivationGateEvaluationFlags = Omit<typeof PUBLISH_ACTIVATION_GATE_EVALUATOR_FLAGS, "gateEvaluated"> & {
  gateEvaluated: boolean;
};

export type PublishActivationGateEvaluationActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type EvaluatePublishActivationGateFromHandoffInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  handoff: PublishActivationGateHandoffPackage | null | undefined;
  actor: PublishActivationGateEvaluationActor;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  policyId?: string | null;
  policyVersion?: string | null;
  expectedHandoffWatermark?: string | null;
  expectedDecisionRef?: string | null;
  expectedEvidencePackageRef?: string | null;
  expectedPublishTargetRef?: string | null;
  privacyLabel?: AafPrivacyLabel;
  retentionClass?: AafRetentionClass;
};

export type PublishActivationGateSourceWatermarks = {
  readModel: string;
  request: string | null;
  decision: string | null;
  launchReadinessEvidence: string | null;
  candidateSiteVersion: string | null;
  runtimeArtifact: string | null;
  publishTarget: string | null;
  semanticHandoff: string;
  semanticGateInput: string;
};

export type PublishActivationGateInput = {
  evaluatorVersion: typeof PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION;
  handoffVersion: typeof PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION;
  scope: typeof PUBLISH_ACTIVATION_REQUEST_SCOPE;
  action: typeof PUBLISH_ACTIVATION_REQUEST_ACTION;
  subjectType: typeof PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE;
  subjectId: string;
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  publishActivationRequestRef: string;
  publishActivationDecisionRef: string;
  launchReadinessEvidencePackageRef: string;
  candidateSiteVersionRef: PublishActivationDecisionReadRef;
  runtimeArtifactRef: PublishActivationDecisionReadRef;
  publishTargetRef: PublishActivationDecisionReadRef;
  limitations: {
    readiness: unknown[];
    decision: unknown[];
    combined: unknown[];
  };
  freshnessSummary: PublishActivationGateHandoffPackage["freshnessSummary"];
  sourceRefs: PublishActivationGateHandoffPackage["sourceRefs"];
  auditRefs: PublishActivationGateHandoffPackage["auditRefs"];
  sourceWatermarks: PublishActivationGateSourceWatermarks;
  semanticHandoffWatermark: string;
  semanticGateInputWatermark: string;
  aafGateValidationInput: AafGateValidationInput;
};

export type PublishActivationGateEvaluationStatus = "allowed" | "blocked" | "warning" | "error";

export type PublishActivationGateEvaluationResult = {
  evaluatorVersion: typeof PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION;
  gateEvaluated: boolean;
  evaluationStatus: PublishActivationGateEvaluationStatus;
  gateResult: AafGateResult;
  policyResult: AafPolicyEvaluationResult | null;
  approvalRequestId: string | null;
  approvalDecisionId: string | null;
  evidencePackageId: string | null;
  policyEvaluationId: string | null;
  gateAttemptId: string | null;
  auditEventId: string | null;
  blockerCodes: string[];
  staleEvidenceReasons: string[];
  warnings: string[];
  limitations: {
    readiness: unknown[];
    decision: unknown[];
    combined: unknown[];
  };
  sourceWatermarks: PublishActivationGateSourceWatermarks | null;
  semanticHandoffWatermark: string | null;
  semanticGateInputWatermark: string | null;
  correlationId: string;
  idempotencyKey: string;
  flags: PublishActivationGateEvaluationFlags;
};

type PublishActivationGateValidator = {
  validateGate(input: AafGateValidationInput): Promise<AafGateValidationResult>;
};

export class PublishActivationGateEvaluatorError extends Error {
  constructor(message: string, readonly blockerCodes: readonly string[]) {
    super(message);
    this.name = "PublishActivationGateEvaluatorError";
  }
}

export class PublishActivationGateEvaluatorIdempotencyConflictError extends PublishActivationGateEvaluatorError {
  constructor(message: string) {
    super(`publish activation gate idempotency conflict: semantic payload drift: ${message}`, ["idempotency_semantic_drift"]);
    this.name = "PublishActivationGateEvaluatorIdempotencyConflictError";
  }
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new PublishActivationGateEvaluatorError(`missing required publish activation gate field: ${field}`, [`missing_${field}`]);
  return normalized;
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function refMatchesExpected(expected: string | null | undefined, values: readonly (string | null | undefined)[]): boolean {
  const normalized = text(expected);
  if (!normalized) return true;
  return values.map(text).some((value) => value === normalized);
}

function semanticGateInputWatermark(input: {
  handoff: PublishActivationGateHandoffPackage;
  actor: PublishActivationGateEvaluationActor;
  policyVersion: string;
}): string {
  return `single-site-publish-activation-gate-input:${hashPublishActivationDecisionReadValue({
    evaluatorVersion: PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
    identity: input.handoff.identity,
    request: input.handoff.request,
    decision: input.handoff.decision,
    launchReadinessEvidence: input.handoff.launchReadinessEvidence,
    candidateSiteVersionRef: input.handoff.candidateSiteVersionRef,
    runtimeArtifactRef: input.handoff.runtimeArtifactRef,
    publishTargetRef: input.handoff.publishTargetRef,
    limitations: input.handoff.limitations,
    freshnessSummary: input.handoff.freshnessSummary,
    sourceWatermarks: input.handoff.watermarks,
    semanticHandoffWatermark: input.handoff.semanticHandoffWatermark,
    actor: input.actor,
    policyVersion: input.policyVersion,
  })}`;
}

export function buildPublishActivationSemanticGateInputWatermark(
  input: Omit<EvaluatePublishActivationGateFromHandoffInput, "correlationId" | "causationId" | "requestId" | "idempotencyKey">,
): string {
  const handoff = assertPublishActivationGateHandoffEvaluable(input);
  const policyVersion = text(input.policyVersion) ?? text(handoff.gateInputPreview?.policyVersion) ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION;
  return semanticGateInputWatermark({ handoff, actor: input.actor, policyVersion });
}

function validationBlockers(input: Omit<EvaluatePublishActivationGateFromHandoffInput, "correlationId" | "causationId" | "requestId" | "idempotencyKey">): string[] {
  const blockers: string[] = [];
  const handoff = input.handoff;
  if (!handoff) return ["handoff_missing"];
  if (handoff.handoffVersion !== PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION) blockers.push("handoff_version_mismatch");
  if (handoff.status !== "handoff_ready") blockers.push(`handoff_status_${handoff.status ?? "missing"}`);
  if (!handoff.flags.readyForGateEvaluation) blockers.push("handoff_not_ready_for_gate_evaluation");
  if (handoff.flags.gatePass !== false) blockers.push("handoff_gate_pass_substitution");
  if (handoff.flags.publishPermission !== false) blockers.push("handoff_publish_permission_substitution");
  if (handoff.identity.tenantId !== input.tenantId) blockers.push("tenant_id_mismatch");
  if (handoff.identity.clientId !== input.clientId) blockers.push("client_id_mismatch");
  if (handoff.identity.siteId !== input.siteId) blockers.push("site_id_mismatch");
  if (handoff.identity.migrationId !== input.migrationId) blockers.push("migration_id_mismatch");
  if (!["granted", "granted_with_limitations"].includes(String(handoff.decision.status))) blockers.push(`decision_${handoff.decision.status ?? "missing"}`);
  if (!text(handoff.decision.id)) blockers.push("publish_activation_decision_missing");
  if (!text(handoff.decision.ref)) blockers.push("publish_activation_decision_ref_missing");
  if (!text(handoff.request.id)) blockers.push("publish_activation_request_missing");
  if (!text(handoff.request.ref)) blockers.push("publish_activation_request_ref_missing");
  if (handoff.request.status !== "requested") blockers.push(`request_status_${handoff.request.status ?? "missing"}`);
  if (!text(handoff.launchReadinessEvidence.packageId)) blockers.push("launch_readiness_evidence_package_missing");
  if (!text(handoff.launchReadinessEvidence.packageRef)) blockers.push("launch_readiness_evidence_package_ref_missing");
  if (!text(handoff.launchReadinessEvidence.sourceWatermark)) blockers.push("launch_readiness_evidence_watermark_missing");
  if (!handoff.candidateSiteVersionRef || !text(handoff.candidateSiteVersionRef.sourceRecordId)) blockers.push("candidate_site_version_ref_missing");
  if (!handoff.candidateSiteVersionRef || !text(handoff.candidateSiteVersionRef.sourceWatermark)) blockers.push("candidate_site_version_watermark_missing");
  if (!handoff.runtimeArtifactRef || !text(handoff.runtimeArtifactRef.sourceRecordId)) blockers.push("runtime_artifact_ref_missing");
  if (!handoff.runtimeArtifactRef || !text(handoff.runtimeArtifactRef.sourceWatermark)) blockers.push("runtime_artifact_watermark_missing");
  if (!handoff.publishTargetRef || !text(handoff.publishTargetRef.sourceRecordId)) blockers.push("publish_target_ref_missing");
  if (!handoff.publishTargetRef || !text(handoff.publishTargetRef.sourceWatermark)) blockers.push("publish_target_watermark_missing");
  if (text(input.expectedHandoffWatermark) && handoff.semanticHandoffWatermark !== text(input.expectedHandoffWatermark)) blockers.push("expected_handoff_watermark_mismatch");
  if (!refMatchesExpected(input.expectedDecisionRef, [handoff.decision.ref, handoff.decision.id])) blockers.push("expected_decision_ref_mismatch");
  if (!refMatchesExpected(input.expectedEvidencePackageRef, [handoff.launchReadinessEvidence.packageRef, handoff.launchReadinessEvidence.packageId])) blockers.push("expected_evidence_package_ref_mismatch");
  if (
    !refMatchesExpected(input.expectedPublishTargetRef, [
      handoff.publishTargetRef?.sourceRef,
      handoff.publishTargetRef?.sourceRecordId,
    ])
  ) {
    blockers.push("expected_publish_target_ref_mismatch");
  }
  blockers.push(...handoff.blockerSummary.blockers);
  blockers.push(...handoff.blockerSummary.missing);
  blockers.push(...handoff.blockerSummary.stale);
  if (handoff.blockerSummary.conflictingDecisionIds.length > 0) blockers.push("conflicting_active_publish_activation_decisions");
  if (!handoff.gateInputPreview) blockers.push("gate_input_preview_missing");
  if (handoff.gateInputPreview && handoff.gateInputPreview.publishActivationApproval.scope !== PUBLISH_ACTIVATION_REQUEST_SCOPE) {
    blockers.push("gate_input_preview_scope_mismatch");
  }
  return uniqueSorted(blockers);
}

export function assertPublishActivationGateHandoffEvaluable(
  input: Omit<EvaluatePublishActivationGateFromHandoffInput, "correlationId" | "causationId" | "requestId" | "idempotencyKey">,
): PublishActivationGateHandoffPackage {
  const blockers = validationBlockers(input);
  if (blockers.length > 0 || !input.handoff) {
    throw new PublishActivationGateEvaluatorError("publish activation gate evaluation blocked by handoff validation", blockers);
  }
  return input.handoff;
}

function sourceWatermarks(handoff: PublishActivationGateHandoffPackage, semanticGateWatermark: string): PublishActivationGateSourceWatermarks {
  return {
    readModel: handoff.watermarks.readModel,
    request: handoff.watermarks.request,
    decision: handoff.watermarks.decision,
    launchReadinessEvidence: handoff.watermarks.launchReadinessEvidence,
    candidateSiteVersion: handoff.watermarks.candidateSiteVersion,
    runtimeArtifact: handoff.watermarks.runtimeArtifact,
    publishTarget: handoff.watermarks.publishTarget,
    semanticHandoff: handoff.semanticHandoffWatermark,
    semanticGateInput: semanticGateWatermark,
  };
}

function semanticCausationId(causationId: string | null | undefined, semanticGateWatermark: string): string {
  return `${text(causationId) ?? PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION}:${semanticGateWatermark}`;
}

export function buildPublishActivationGateInputFromHandoff(input: EvaluatePublishActivationGateFromHandoffInput): PublishActivationGateInput {
  const handoff = assertPublishActivationGateHandoffEvaluable(input);
  const candidate = handoff.candidateSiteVersionRef!;
  const artifact = handoff.runtimeArtifactRef!;
  const publishTarget = handoff.publishTargetRef!;
  const policyVersion = text(input.policyVersion) ?? text(handoff.gateInputPreview?.policyVersion) ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION;
  const semanticGateWatermark = semanticGateInputWatermark({ handoff, actor: input.actor, policyVersion });
  const watermarks = sourceWatermarks(handoff, semanticGateWatermark);
  const subjectId = requiredText("candidateSiteVersionRef.sourceRecordId", candidate.sourceRecordId);
  const aafGateValidationInput: AafGateValidationInput = {
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    batchId: null,
    jobId: null,
    siteVersionId: subjectId,
    domainId: null,
    costCenterId: null,
    correlationId: requiredText("correlationId", input.correlationId),
    causationId: semanticCausationId(input.causationId, semanticGateWatermark),
    idempotencyKey: requiredText("idempotencyKey", input.idempotencyKey),
    requestId: text(input.requestId),
    actionKey: PUBLISH_ACTIVATION_REQUEST_ACTION,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
    subjectId,
    actorType: input.actor.actorType,
    actorId: requiredText("actor.actorId", input.actor.actorId),
    actorRole: requiredText("actor.actorRole", input.actor.actorRole),
    policyId: text(input.policyId),
    policyVersion,
    requiredEvidenceType: null,
    evidencePackageId: requiredText("launchReadinessEvidence.packageId", handoff.launchReadinessEvidence.packageId),
    approvalRequestId: requiredText("request.id", handoff.request.id),
    approvalDecisionId: requiredText("decision.id", handoff.decision.id),
    currentSubjectWatermark: semanticGateWatermark,
    sourceRefsRequired: false,
    auditRequired: true,
    auditEventFamily: "publish",
    policyRules: {
      allowedAction: PUBLISH_ACTIVATION_REQUEST_ACTION,
      approvalRequired: true,
      blockedReason: null,
    },
    privacyLabel: input.privacyLabel,
    retentionClass: input.retentionClass,
  };

  return {
    evaluatorVersion: PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
    handoffVersion: handoff.handoffVersion,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
    subjectId,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    publishActivationRequestRef: requiredText("request.ref", handoff.request.ref),
    publishActivationDecisionRef: requiredText("decision.ref", handoff.decision.ref),
    launchReadinessEvidencePackageRef: requiredText("launchReadinessEvidence.packageRef", handoff.launchReadinessEvidence.packageRef),
    candidateSiteVersionRef: candidate,
    runtimeArtifactRef: artifact,
    publishTargetRef: publishTarget,
    limitations: handoff.limitations,
    freshnessSummary: handoff.freshnessSummary,
    sourceRefs: handoff.sourceRefs,
    auditRefs: handoff.auditRefs,
    sourceWatermarks: watermarks,
    semanticHandoffWatermark: handoff.semanticHandoffWatermark,
    semanticGateInputWatermark: semanticGateWatermark,
    aafGateValidationInput,
  };
}

function policyResult(record: AafGateValidationResult["policyEvaluation"]): AafPolicyEvaluationResult | null {
  const result = text(record?.result);
  return result ? (result as AafPolicyEvaluationResult) : null;
}

function staleReasons(blockers: readonly string[]): string[] {
  return blockers.filter((reason) => /stale|expired|freshness|superseded|watermark_mismatch|source_watermark_mismatch/.test(reason));
}

function statusFromGate(gateResult: AafGateResult, limitations: readonly unknown[]): PublishActivationGateEvaluationStatus {
  if (gateResult === "allowed" && limitations.length > 0) return "warning";
  if (gateResult === "allowed" || gateResult === "not_required_by_policy") return "allowed";
  if (gateResult === "fail_closed" || gateResult === "audit_unavailable" || gateResult === "policy_error") return "error";
  return "blocked";
}

function failedResult(input: EvaluatePublishActivationGateFromHandoffInput, blockers: readonly string[]): PublishActivationGateEvaluationResult {
  return {
    evaluatorVersion: PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
    gateEvaluated: false,
    evaluationStatus: "error",
    gateResult: "fail_closed",
    policyResult: null,
    approvalRequestId: null,
    approvalDecisionId: null,
    evidencePackageId: null,
    policyEvaluationId: null,
    gateAttemptId: null,
    auditEventId: null,
    blockerCodes: uniqueSorted(blockers),
    staleEvidenceReasons: staleReasons(blockers),
    warnings: ["fail_closed_before_aaf_gate_evaluation"],
    limitations: { readiness: [], decision: [], combined: [] },
    sourceWatermarks: null,
    semanticHandoffWatermark: text(input.handoff?.semanticHandoffWatermark),
    semanticGateInputWatermark: null,
    correlationId: text(input.correlationId) ?? "",
    idempotencyKey: text(input.idempotencyKey) ?? "",
    flags: { ...PUBLISH_ACTIVATION_GATE_EVALUATOR_FLAGS, gateEvaluated: false },
  };
}

function isIdempotencyConflict(error: unknown, seen = new Set<unknown>()): boolean {
  if (seen.has(error)) return false;
  seen.add(error);
  const message = error instanceof Error ? error.message : String(error);
  if (/idempotency conflict|semantic payload drift/i.test(message)) return true;
  if (error && typeof error === "object" && "cause" in error) {
    return isIdempotencyConflict((error as { cause?: unknown }).cause, seen);
  }
  return false;
}

export class SingleSitePublishActivationGateEvaluator {
  constructor(private readonly gateValidator: PublishActivationGateValidator = new AafActionGateValidatorFacade()) {}

  async evaluatePublishActivationGateFromHandoff(input: EvaluatePublishActivationGateFromHandoffInput): Promise<PublishActivationGateEvaluationResult> {
    let gateInput: PublishActivationGateInput;
    try {
      gateInput = buildPublishActivationGateInputFromHandoff(input);
    } catch (error) {
      if (error instanceof PublishActivationGateEvaluatorError) return failedResult(input, error.blockerCodes);
      throw error;
    }

    try {
      const gate = await this.gateValidator.validateGate(gateInput.aafGateValidationInput);
      const blockers = uniqueSorted(gate.blockerCodes);
      const warnings = ["non_enforcing_gate_evaluation", "no_publish_execution"];
      if (gateInput.limitations.combined.length > 0) warnings.push("limitations_carried_forward");
      return {
        evaluatorVersion: PUBLISH_ACTIVATION_GATE_EVALUATOR_VERSION,
        gateEvaluated: true,
        evaluationStatus: statusFromGate(gate.gateResult, gateInput.limitations.combined),
        gateResult: gate.gateResult,
        policyResult: policyResult(gate.policyEvaluation),
        approvalRequestId: gateInput.aafGateValidationInput.approvalRequestId ?? null,
        approvalDecisionId: gateInput.aafGateValidationInput.approvalDecisionId ?? null,
        evidencePackageId: gateInput.aafGateValidationInput.evidencePackageId ?? null,
        policyEvaluationId: text(gate.policyEvaluation?.id),
        gateAttemptId: text(gate.gateAttempt?.id),
        auditEventId: text(gate.preActionAuditEvent?.id),
        blockerCodes: blockers,
        staleEvidenceReasons: staleReasons(blockers),
        warnings,
        limitations: gateInput.limitations,
        sourceWatermarks: gateInput.sourceWatermarks,
        semanticHandoffWatermark: gateInput.semanticHandoffWatermark,
        semanticGateInputWatermark: gateInput.semanticGateInputWatermark,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        flags: PUBLISH_ACTIVATION_GATE_EVALUATOR_FLAGS,
      };
    } catch (error) {
      if (isIdempotencyConflict(error)) {
        throw new PublishActivationGateEvaluatorIdempotencyConflictError(error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  }
}

export async function evaluatePublishActivationGateFromHandoff(
  input: EvaluatePublishActivationGateFromHandoffInput,
): Promise<PublishActivationGateEvaluationResult> {
  return new SingleSitePublishActivationGateEvaluator().evaluatePublishActivationGateFromHandoff(input);
}
