import "server-only";

import {
  PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION,
  hashPublishActivationDecisionReadValue,
  type PublishActivationDecisionReadModel,
  type PublishActivationDecisionReadRef,
} from "./publish-activation-decision-read-model";
import { PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION } from "./publish-activation-request-bridge";

export const PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION = "mvp-43-publish-activation-gate-handoff:v1" as const;
const PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY = "publish.activation" as const;
const PUBLISH_ACTIVATION_DRY_RUN_SCOPE = "publish_activation" as const;

export const PUBLISH_ACTIVATION_GATE_HANDOFF_FLAGS = {
  derivedOnly: true,
  mutatesSourceTruth: false,
  createsAafRecords: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  publishes: false,
  readyForPublishExecution: false,
  handoffOnly: true,
} as const;

export type PublishActivationGateHandoffStatus = "handoff_ready" | "handoff_blocked";

export type PublishActivationGatePreviewSourceRef = {
  sourceSystem?: string | null;
  sourceTable: string;
  sourceRecordId: string;
  sourceRef?: string | null;
  sourceVersion?: string | null;
  currentWatermark?: string | null;
  evidenceWatermark?: string | null;
};

export type PublishActivationGateInputPreview = {
  previewOnly: true;
  tenantId: string;
  clientId: string | null;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  intendedPublishTarget: string;
  publishActivationApproval: {
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    scope?: string | null;
  };
  evidencePackageId: string | null;
  policyVersion: string;
  sourceRefs: {
    siteVersion: PublishActivationGatePreviewSourceRef;
    runtimeArtifact: PublishActivationGatePreviewSourceRef;
    activePointer: PublishActivationGatePreviewSourceRef;
    publishTarget: PublishActivationGatePreviewSourceRef;
    domainReadiness: PublishActivationGatePreviewSourceRef;
    contentOverridePublishedState?: PublishActivationGatePreviewSourceRef | null;
  };
};

export type PublishActivationGateHandoffPackage = {
  handoffVersion: typeof PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION;
  readModelVersion: typeof PUBLISH_ACTIVATION_DECISION_READ_MODEL_VERSION;
  status: PublishActivationGateHandoffStatus;
  identity: PublishActivationDecisionReadModel["identity"];
  decision: {
    id: string | null;
    ref: string | null;
    status: string | null;
    semanticWatermark: string | null;
  };
  request: {
    id: string | null;
    ref: string | null;
    status: string | null;
    semanticWatermark: string | null;
  };
  launchReadinessEvidence: {
    packageId: string | null;
    packageRef: string | null;
    sourceWatermark: string | null;
    readinessStatus: string | null;
  };
  candidateSiteVersionRef: PublishActivationDecisionReadRef | null;
  runtimeArtifactRef: PublishActivationDecisionReadRef | null;
  publishTargetRef: PublishActivationDecisionReadRef | null;
  limitations: {
    readiness: unknown[];
    decision: unknown[];
    combined: unknown[];
  };
  sourceRefs: PublishActivationDecisionReadRef[];
  auditRefs: PublishActivationDecisionReadRef[];
  watermarks: {
    readModel: string;
    request: string | null;
    decision: string | null;
    launchReadinessEvidence: string | null;
    candidateSiteVersion: string | null;
    runtimeArtifact: string | null;
    publishTarget: string | null;
  };
  freshnessSummary: PublishActivationDecisionReadModel["evidenceFreshnessStatus"];
  blockerSummary: {
    blockers: string[];
    missing: string[];
    stale: string[];
    warnings: string[];
    conflictingDecisionIds: string[];
  };
  gateInputPreview: PublishActivationGateInputPreview | null;
  semanticHandoffWatermark: string;
  flags: typeof PUBLISH_ACTIVATION_GATE_HANDOFF_FLAGS & {
    publishActivationApproved: boolean;
    readyForGateEvaluation: boolean;
    gatePass: false;
    publishPermission: false;
  };
};

export class PublishActivationGateHandoffError extends Error {
  constructor(message: string, readonly blockerCodes: readonly string[]) {
    super(message);
    this.name = "PublishActivationGateHandoffError";
  }
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function failClosedBlockers(model: PublishActivationDecisionReadModel): string[] {
  const blockers = [
    ...model.diagnostics.blockers,
    ...model.diagnostics.missing,
    ...model.diagnostics.stale,
  ];
  const decisionStatus = model.publishActivationDecision.status;
  if (!model.publishActivationDecision.id) blockers.push("publish_activation_decision_missing");
  if (decisionStatus && !["granted", "granted_with_limitations"].includes(decisionStatus)) blockers.push(`approval_${decisionStatus}`);
  if (!model.publishActivationRequest.id) blockers.push("publish_activation_request_missing");
  if (model.publishActivationRequest.scope !== PUBLISH_ACTIVATION_DRY_RUN_SCOPE) blockers.push("request_scope_mismatch");
  if (model.publishActivationRequest.action !== PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY) blockers.push("request_action_mismatch");
  if (!model.launchReadinessEvidence.packageId) blockers.push("launch_readiness_evidence_package_missing");
  if (model.launchReadinessEvidence.packageType !== "single_site_launch_readiness_evidence") blockers.push("evidence_type_mismatch");
  if (!model.improvedCandidateSiteVersionRef) blockers.push("improved_candidate_site_version_ref_missing");
  if (!model.runtimeArtifactRef) blockers.push("improved_runtime_artifact_ref_missing");
  if (!model.publishTargetRef) blockers.push("publish_target_ref_missing");
  if (!["ready", "ready_with_limitations"].includes(String(model.launchReadinessEvidence.readinessStatus))) {
    blockers.push(`readiness_status_${model.launchReadinessEvidence.readinessStatus ?? "missing"}`);
  }
  if (!["fresh", "partial_timeline"].includes(String(model.evidenceFreshnessStatus.status))) {
    blockers.push(`evidence_freshness_${model.evidenceFreshnessStatus.status ?? "missing"}`);
  }
  if (!model.policyMetadata.requestPolicyEvaluationId) blockers.push("request_policy_evaluation_missing");
  if (model.policyMetadata.requestPolicyResult !== "approval_required") blockers.push("request_policy_row_not_approval_required");
  if (model.policyMetadata.scope !== PUBLISH_ACTIVATION_DRY_RUN_SCOPE) blockers.push("request_policy_scope_mismatch");
  if (model.policyMetadata.action !== PUBLISH_ACTIVATION_DRY_RUN_ACTION_KEY) blockers.push("request_policy_action_mismatch");
  if (model.diagnostics.conflictingDecisionIds.length > 0) blockers.push("conflicting_active_publish_activation_decisions");
  return uniqueSorted(blockers);
}

function watermarkFor(ref: PublishActivationDecisionReadRef | null): string | null {
  return text(ref?.sourceWatermark);
}

function gateInputPreview(model: PublishActivationDecisionReadModel, blockers: readonly string[]): PublishActivationGateInputPreview | null {
  if (blockers.length > 0 || !model.improvedCandidateSiteVersionRef || !model.runtimeArtifactRef || !model.publishTargetRef) return null;
  const siteVersionId = model.improvedCandidateSiteVersionRef.sourceRecordId;
  const runtimeArtifactId = model.runtimeArtifactRef.sourceRecordId;
  const publishTargetId = model.publishTargetRef.sourceRecordId;
  return {
    previewOnly: true,
    tenantId: model.identity.tenantId,
    clientId: model.identity.clientId,
    siteId: model.identity.siteId,
    siteVersionId,
    runtimeArtifactId,
    intendedPublishTarget: publishTargetId,
    publishActivationApproval: {
      approvalRequestId: model.publishActivationRequest.id,
      approvalDecisionId: model.publishActivationDecision.id,
      scope: PUBLISH_ACTIVATION_DRY_RUN_SCOPE,
    },
    evidencePackageId: model.launchReadinessEvidence.packageId,
    policyVersion: model.policyMetadata.policyVersion ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
    sourceRefs: {
      siteVersion: {
        sourceSystem: model.improvedCandidateSiteVersionRef.sourceSystem,
        sourceTable: model.improvedCandidateSiteVersionRef.sourceTable,
        sourceRecordId: siteVersionId,
        sourceRef: model.improvedCandidateSiteVersionRef.sourceRef,
        sourceVersion: text(model.improvedCandidateSiteVersionRef.sourceVersion),
        currentWatermark: model.improvedCandidateSiteVersionRef.sourceWatermark,
        evidenceWatermark: model.improvedCandidateSiteVersionRef.sourceWatermark,
      },
      runtimeArtifact: {
        sourceSystem: model.runtimeArtifactRef.sourceSystem,
        sourceTable: model.runtimeArtifactRef.sourceTable,
        sourceRecordId: runtimeArtifactId,
        sourceRef: model.runtimeArtifactRef.sourceRef,
        sourceVersion: text(model.runtimeArtifactRef.sourceVersion),
        currentWatermark: model.runtimeArtifactRef.sourceWatermark,
        evidenceWatermark: model.runtimeArtifactRef.sourceWatermark,
      },
      activePointer: {
        sourceSystem: "gnr8",
        sourceTable: "mvp43_handoff_preview_only_no_active_pointer_read",
        sourceRecordId: model.identity.siteId,
        sourceRef: null,
        sourceVersion: null,
        currentWatermark: "preview_only_not_gate_input_complete",
        evidenceWatermark: "preview_only_not_gate_input_complete",
      },
      publishTarget: {
        sourceSystem: model.publishTargetRef.sourceSystem,
        sourceTable: model.publishTargetRef.sourceTable,
        sourceRecordId: publishTargetId,
        sourceRef: model.publishTargetRef.sourceRef,
        sourceVersion: text(model.publishTargetRef.sourceVersion),
        currentWatermark: model.publishTargetRef.sourceWatermark,
        evidenceWatermark: model.publishTargetRef.sourceWatermark,
      },
      domainReadiness: {
        sourceSystem: "gnr8",
        sourceTable: "mvp43_handoff_preview_only_launch_readiness_domain_ref",
        sourceRecordId: model.launchReadinessEvidence.subjectId ?? model.identity.siteId,
        sourceRef: model.launchReadinessEvidence.packageRef,
        sourceVersion: null,
        currentWatermark: model.launchReadinessEvidence.sourceWatermark,
        evidenceWatermark: model.launchReadinessEvidence.sourceWatermark,
      },
      contentOverridePublishedState: null,
    },
  };
}

function semanticHandoffWatermark(input: {
  model: PublishActivationDecisionReadModel;
  blockers: readonly string[];
  preview: PublishActivationGateInputPreview | null;
}): string {
  const model = input.model;
  return `single-site-publish-activation-gate-handoff:${hashPublishActivationDecisionReadValue({
    handoffVersion: PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION,
    request: model.publishActivationRequest,
    decision: model.publishActivationDecision,
    evidence: model.launchReadinessEvidence,
    candidate: model.improvedCandidateSiteVersionRef,
    artifact: model.runtimeArtifactRef,
    publishTarget: model.publishTargetRef,
    limitations: {
      readiness: model.readinessLimitations,
      decision: model.decisionLimitations,
    },
    freshness: model.evidenceFreshnessStatus,
    blockers: input.blockers,
    readModelWatermark: model.semanticWatermark,
    gateInputPreview: input.preview,
  })}`;
}

export function buildPublishActivationGateHandoff(model: PublishActivationDecisionReadModel): PublishActivationGateHandoffPackage {
  const blockers = failClosedBlockers(model);
  const status: PublishActivationGateHandoffStatus = blockers.length === 0 && model.flags.readyForGateEvaluation ? "handoff_ready" : "handoff_blocked";
  const preview = gateInputPreview(model, blockers);
  const combinedLimitations = [...model.readinessLimitations, ...model.decisionLimitations];
  return {
    handoffVersion: PUBLISH_ACTIVATION_GATE_HANDOFF_VERSION,
    readModelVersion: model.readModelVersion,
    status,
    identity: model.identity,
    decision: {
      id: model.publishActivationDecision.id,
      ref: model.publishActivationDecision.ref,
      status: model.publishActivationDecision.status,
      semanticWatermark: model.publishActivationDecision.semanticWatermark,
    },
    request: {
      id: model.publishActivationRequest.id,
      ref: model.publishActivationRequest.ref,
      status: model.publishActivationRequest.status,
      semanticWatermark: model.publishActivationRequest.semanticWatermark,
    },
    launchReadinessEvidence: {
      packageId: model.launchReadinessEvidence.packageId,
      packageRef: model.launchReadinessEvidence.packageRef,
      sourceWatermark: model.launchReadinessEvidence.sourceWatermark,
      readinessStatus: model.launchReadinessEvidence.readinessStatus,
    },
    candidateSiteVersionRef: model.improvedCandidateSiteVersionRef,
    runtimeArtifactRef: model.runtimeArtifactRef,
    publishTargetRef: model.publishTargetRef,
    limitations: {
      readiness: model.readinessLimitations,
      decision: model.decisionLimitations,
      combined: combinedLimitations,
    },
    sourceRefs: model.sourceRefs,
    auditRefs: model.auditRefs,
    watermarks: {
      readModel: model.semanticWatermark,
      request: model.publishActivationRequest.semanticWatermark,
      decision: model.publishActivationDecision.semanticWatermark,
      launchReadinessEvidence: model.launchReadinessEvidence.sourceWatermark,
      candidateSiteVersion: watermarkFor(model.improvedCandidateSiteVersionRef),
      runtimeArtifact: watermarkFor(model.runtimeArtifactRef),
      publishTarget: watermarkFor(model.publishTargetRef),
    },
    freshnessSummary: model.evidenceFreshnessStatus,
    blockerSummary: {
      blockers,
      missing: model.diagnostics.missing,
      stale: model.diagnostics.stale,
      warnings: model.diagnostics.warnings,
      conflictingDecisionIds: model.diagnostics.conflictingDecisionIds,
    },
    gateInputPreview: preview,
    semanticHandoffWatermark: semanticHandoffWatermark({ model, blockers, preview }),
    flags: {
      ...PUBLISH_ACTIVATION_GATE_HANDOFF_FLAGS,
      publishActivationApproved: model.flags.publishActivationApproved,
      readyForGateEvaluation: status === "handoff_ready",
      gatePass: false,
      publishPermission: false,
    },
  };
}

export function assertPublishActivationGateHandoffReady(model: PublishActivationDecisionReadModel): PublishActivationGateHandoffPackage {
  const handoff = buildPublishActivationGateHandoff(model);
  if (handoff.status !== "handoff_ready") {
    throw new PublishActivationGateHandoffError("publish activation gate handoff blocked", handoff.blockerSummary.blockers);
  }
  return handoff;
}
