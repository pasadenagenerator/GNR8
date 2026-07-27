import "server-only";

import type {
  AafApprovalScope,
  AafGateResult,
  AafPolicyEvaluationResult,
  AafPrivacyLabel,
  AafRetentionClass,
} from "@gnr8/runtime-contracts";

import {
  AafActionGateValidatorFacade,
  type AafGateValidationInput,
  type AafGateValidationResult,
  type AafPolicyRules,
} from "./aaf-policy-gate-facade";
import type { AafActorType, AafRecord, AafTenantScopeInput } from "./aaf-writer-repository";

export const PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY = "publish.activation" as const;
export const PUBLISH_ACTIVATION_DRY_RUN_SCOPE = "publish_activation" as const;
export const PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE = "site_version" as const;
export const PUBLISH_ACTIVATION_REQUIRED_EVIDENCE_TYPE = "publish_activation_evidence" as const;

export type PublishActivationDomainReadinessStatus = "ready" | "not_applicable" | "manually_excepted" | "blocked";
export type PublishActivationContentOverrideState = "published" | "not_published" | "not_applicable" | "unknown";

export type PublishActivationCanonicalSourceRef = {
  sourceSystem?: string | null;
  sourceTable: string;
  sourceRecordId: string;
  sourceRef?: string | null;
  sourceVersion?: string | null;
  currentWatermark?: string | null;
  evidenceWatermark?: string | null;
};

export type PublishActivationCanonicalSourceRefs = {
  siteVersion: PublishActivationCanonicalSourceRef;
  runtimeArtifact: PublishActivationCanonicalSourceRef;
  activePointer: PublishActivationCanonicalSourceRef;
  publishTarget: PublishActivationCanonicalSourceRef;
  domainReadiness: PublishActivationCanonicalSourceRef;
  contentOverridePublishedState?: PublishActivationCanonicalSourceRef | null;
};

export type PublishActivationApprovalRef = {
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  scope?: AafApprovalScope | null;
};

export type PublishActivationGateDryRunInput = AafTenantScopeInput & {
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  currentActivePointer: {
    siteVersionId: string | null;
    artifactId: string | null;
  };
  intendedPublishTarget: string;
  domainReadiness: {
    status: PublishActivationDomainReadinessStatus;
    snapshotRef?: string | null;
    blockers?: readonly string[];
  };
  contentOverridePublishedState?: {
    status: PublishActivationContentOverrideState;
    snapshotRef?: string | null;
  } | null;
  launchSignoffApproval?: {
    approvalDecisionId?: string | null;
    requiredByPolicy?: boolean;
  } | null;
  publishActivationApproval?: PublishActivationApprovalRef | null;
  evidencePackageId?: string | null;
  policyId?: string | null;
  policyVersion: string;
  actorType: AafActorType;
  actorId: string;
  actorRole: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  sourceRefs: PublishActivationCanonicalSourceRefs;
  policyRules?: Omit<AafPolicyRules, "allowedAction" | "blockedReason">;
  privacyLabel?: AafPrivacyLabel;
  retentionClass?: AafRetentionClass;
};

export type PublishActivationSourceWatermarkSummary = Record<
  keyof PublishActivationCanonicalSourceRefs,
  {
    sourceTable: string;
    sourceRecordId: string;
    sourceRef: string | null;
    currentWatermark: string | null;
    evidenceWatermark: string | null;
  } | null
>;

export type PublishActivationGateDryRunResult = {
  dryRunOnly: true;
  actionKey: typeof PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY;
  scope: typeof PUBLISH_ACTIVATION_DRY_RUN_SCOPE;
  subjectType: typeof PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE;
  subjectId: string;
  gateResult: AafGateResult;
  policyResult: AafPolicyEvaluationResult | "not_persisted" | null;
  approvalDecisionId: string | null;
  evidencePackageId: string | null;
  gateAttemptId: string | null;
  auditEventId: string | null;
  sourceWatermarks: PublishActivationSourceWatermarkSummary;
  missingSourceWatermarks: string[];
  staleEvidenceReasons: string[];
  blockedReasons: string[];
  warnings: string[];
  correlationId: string;
  idempotencyKey: string;
};

type PublishActivationGateValidator = {
  validateGate(input: AafGateValidationInput): Promise<AafGateValidationResult>;
};

type SourceEntry = {
  key: keyof PublishActivationCanonicalSourceRefs;
  ref: PublishActivationCanonicalSourceRef | null | undefined;
  required: boolean;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function buildSourceEntries(input: PublishActivationGateDryRunInput): SourceEntry[] {
  const contentState = input.contentOverridePublishedState?.status ?? "not_applicable";
  return [
    { key: "siteVersion", ref: input.sourceRefs.siteVersion, required: true },
    { key: "runtimeArtifact", ref: input.sourceRefs.runtimeArtifact, required: true },
    { key: "activePointer", ref: input.sourceRefs.activePointer, required: true },
    { key: "publishTarget", ref: input.sourceRefs.publishTarget, required: true },
    { key: "domainReadiness", ref: input.sourceRefs.domainReadiness, required: true },
    {
      key: "contentOverridePublishedState",
      ref: input.sourceRefs.contentOverridePublishedState,
      required: contentState !== "not_applicable",
    },
  ];
}

export function summarizePublishActivationSourceWatermarks(
  refs: PublishActivationCanonicalSourceRefs,
): PublishActivationSourceWatermarkSummary {
  return {
    siteVersion: summarizeSourceRef(refs.siteVersion),
    runtimeArtifact: summarizeSourceRef(refs.runtimeArtifact),
    activePointer: summarizeSourceRef(refs.activePointer),
    publishTarget: summarizeSourceRef(refs.publishTarget),
    domainReadiness: summarizeSourceRef(refs.domainReadiness),
    contentOverridePublishedState: summarizeSourceRef(refs.contentOverridePublishedState),
  };
}

function summarizeSourceRef(
  ref: PublishActivationCanonicalSourceRef | null | undefined,
): PublishActivationSourceWatermarkSummary[keyof PublishActivationCanonicalSourceRefs] {
  if (!ref) return null;
  return {
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceRef: text(ref.sourceRef),
    currentWatermark: text(ref.currentWatermark),
    evidenceWatermark: text(ref.evidenceWatermark),
  };
}

export function buildPublishActivationSubjectWatermark(input: PublishActivationGateDryRunInput): string | null {
  const parts: string[] = [];
  for (const entry of buildSourceEntries(input)) {
    if (!entry.required) continue;
    const watermark = text(entry.ref?.currentWatermark);
    if (!watermark) return null;
    parts.push(`${entry.key}:${watermark}`);
  }
  return parts.join("|");
}

function collectSourceWatermarkProblems(input: PublishActivationGateDryRunInput): {
  missing: string[];
  mismatches: string[];
} {
  const missing: string[] = [];
  const mismatches: string[] = [];
  for (const entry of buildSourceEntries(input)) {
    if (!entry.required) continue;
    const ref = entry.ref;
    if (!ref || !text(ref.sourceTable) || !text(ref.sourceRecordId)) {
      missing.push(`${entry.key}.sourceRef`);
      continue;
    }
    const currentWatermark = text(ref.currentWatermark);
    const evidenceWatermark = text(ref.evidenceWatermark);
    if (!currentWatermark) missing.push(`${entry.key}.currentWatermark`);
    if (!evidenceWatermark) missing.push(`${entry.key}.evidenceWatermark`);
    if (currentWatermark && evidenceWatermark && currentWatermark !== evidenceWatermark) {
      mismatches.push(`${entry.key}.watermark`);
    }
  }
  return { missing, mismatches };
}

function collectContractProblems(input: PublishActivationGateDryRunInput): string[] {
  const problems: string[] = [];
  if (text(input.sourceRefs.siteVersion.sourceRecordId) !== input.siteVersionId) {
    problems.push("site_version_source_ref_mismatch");
  }
  if (text(input.sourceRefs.runtimeArtifact.sourceRecordId) !== input.runtimeArtifactId) {
    problems.push("runtime_artifact_source_ref_mismatch");
  }
  const intendedPublishTarget = text(input.intendedPublishTarget);
  if (!intendedPublishTarget) problems.push("publish_target_missing");
  if (text(input.sourceRefs.publishTarget.sourceRecordId) !== intendedPublishTarget) {
    problems.push("publish_target_source_ref_mismatch");
  }
  if (text(input.sourceRefs.activePointer.sourceRecordId) !== input.siteId) {
    problems.push("active_pointer_source_ref_mismatch");
  }
  if (input.domainReadiness.status === "blocked") {
    problems.push("domain_readiness_blocked");
    for (const blocker of input.domainReadiness.blockers ?? []) problems.push(`domain_readiness:${blocker}`);
  }
  if (input.launchSignoffApproval?.requiredByPolicy && !text(input.launchSignoffApproval.approvalDecisionId)) {
    problems.push("launch_signoff_missing");
  }
  const publishApprovalScope = input.publishActivationApproval?.scope;
  if (publishApprovalScope && publishApprovalScope !== PUBLISH_ACTIVATION_DRY_RUN_SCOPE) {
    problems.push(`approval_scope_not_publish_activation:${publishApprovalScope}`);
  }
  return problems;
}

function staleReasons(blockedReasons: readonly string[]): string[] {
  return blockedReasons.filter((reason) =>
    /stale|expired|freshness|superseded|watermark_mismatch|source_watermark_mismatch/.test(reason),
  );
}

function policyResultFromRecord(record: AafRecord | null): AafPolicyEvaluationResult | "not_persisted" | null {
  const result = text(record?.result);
  if (!result) return null;
  return result as AafPolicyEvaluationResult;
}

export class AafPublishActivationGateAdapter {
  constructor(private readonly gateValidator: PublishActivationGateValidator = new AafActionGateValidatorFacade()) {}

  async evaluatePublishActivationGateDryRun(input: PublishActivationGateDryRunInput): Promise<PublishActivationGateDryRunResult> {
    const watermarkProblems = collectSourceWatermarkProblems(input);
    const contractProblems = collectContractProblems(input);
    const mismatchReasons = watermarkProblems.mismatches.map((item) => `source_watermark_mismatch:${item}`);
    const missingReasons = watermarkProblems.missing.map((item) => `source_watermark_missing:${item}`);
    const preGateBlockedReasons = [...missingReasons, ...mismatchReasons, ...contractProblems];
    const subjectWatermark = buildPublishActivationSubjectWatermark(input);
    const approvalDecisionId =
      input.publishActivationApproval?.scope && input.publishActivationApproval.scope !== PUBLISH_ACTIVATION_DRY_RUN_SCOPE
        ? null
        : text(input.publishActivationApproval?.approvalDecisionId);
    const approvalRequestId =
      input.publishActivationApproval?.scope && input.publishActivationApproval.scope !== PUBLISH_ACTIVATION_DRY_RUN_SCOPE
        ? null
        : text(input.publishActivationApproval?.approvalRequestId);

    try {
      const gate = await this.gateValidator.validateGate({
        tenantId: input.tenantId,
        clientId: input.clientId ?? null,
        siteId: input.siteId,
        batchId: input.batchId ?? null,
        jobId: input.jobId ?? null,
        siteVersionId: input.siteVersionId,
        domainId: input.domainId ?? null,
        costCenterId: input.costCenterId ?? null,
        correlationId: input.correlationId,
        causationId: input.causationId ?? null,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId ?? null,
        actionKey: PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY,
        scope: PUBLISH_ACTIVATION_DRY_RUN_SCOPE,
        subjectType: PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE,
        subjectId: input.siteVersionId,
        actorType: input.actorType,
        actorId: input.actorId,
        actorRole: input.actorRole,
        policyId: input.policyId ?? null,
        policyVersion: input.policyVersion,
        requiredEvidenceType: PUBLISH_ACTIVATION_REQUIRED_EVIDENCE_TYPE,
        evidencePackageId: text(input.evidencePackageId),
        approvalRequestId,
        approvalDecisionId,
        currentSubjectWatermark: subjectWatermark,
        sourceRefsRequired: true,
        auditRequired: true,
        auditEventFamily: "publish",
        policyRules: {
          ...input.policyRules,
          allowedAction: PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY,
          approvalRequired: input.policyRules?.approvalRequired ?? true,
          blockedReason: preGateBlockedReasons[0] ?? null,
        },
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      return this.mapFacadeResult(input, gate, preGateBlockedReasons, approvalDecisionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const blockedReasons = [...preGateBlockedReasons, "aaf_gate_facade_unavailable"];
      return {
        dryRunOnly: true,
        actionKey: PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY,
        scope: PUBLISH_ACTIVATION_DRY_RUN_SCOPE,
        subjectType: PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE,
        subjectId: input.siteVersionId,
        gateResult: "fail_closed",
        policyResult: "not_persisted",
        approvalDecisionId,
        evidencePackageId: text(input.evidencePackageId),
        gateAttemptId: null,
        auditEventId: null,
        sourceWatermarks: summarizePublishActivationSourceWatermarks(input.sourceRefs),
        missingSourceWatermarks: watermarkProblems.missing,
        staleEvidenceReasons: staleReasons(blockedReasons),
        blockedReasons,
        warnings: [`dry_run_only_no_publish_execution`, `facade_error:${message}`],
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
      };
    }
  }

  private mapFacadeResult(
    input: PublishActivationGateDryRunInput,
    gate: AafGateValidationResult,
    preGateBlockedReasons: string[],
    approvalDecisionId: string | null,
  ): PublishActivationGateDryRunResult {
    const facadeBlockers = gate.blockerCodes.map(String);
    const blockedReasons = [...preGateBlockedReasons, ...facadeBlockers];
    const warnings = ["dry_run_only_no_publish_execution"];
    if (input.domainReadiness.status === "not_applicable") warnings.push("domain_readiness_not_applicable");
    if ((input.contentOverridePublishedState?.status ?? "not_applicable") === "not_applicable") {
      warnings.push("content_override_state_not_applicable");
    }

    return {
      dryRunOnly: true,
      actionKey: PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY,
      scope: PUBLISH_ACTIVATION_DRY_RUN_SCOPE,
      subjectType: PUBLISH_ACTIVATION_DRY_RUN_SUBJECT_TYPE,
      subjectId: input.siteVersionId,
      gateResult: gate.gateResult,
      policyResult: policyResultFromRecord(gate.policyEvaluation),
      approvalDecisionId,
      evidencePackageId: text(input.evidencePackageId),
      gateAttemptId: text(gate.gateAttempt?.id),
      auditEventId: text(gate.preActionAuditEvent?.id),
      sourceWatermarks: summarizePublishActivationSourceWatermarks(input.sourceRefs),
      missingSourceWatermarks: collectSourceWatermarkProblems(input).missing,
      staleEvidenceReasons: staleReasons(blockedReasons),
      blockedReasons,
      warnings,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
    };
  }
}

export async function evaluatePublishActivationGateDryRun(
  input: PublishActivationGateDryRunInput,
): Promise<PublishActivationGateDryRunResult> {
  return new AafPublishActivationGateAdapter().evaluatePublishActivationGateDryRun(input);
}
