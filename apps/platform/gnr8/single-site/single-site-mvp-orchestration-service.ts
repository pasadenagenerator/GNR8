import "server-only";

import { SingleSitePublishOperatorReadonlyProjectionRepository, type SingleSitePublishOperatorReadonlyProjection } from "./single-site-publish-operator-readonly-projection";
import { SingleSiteStateReadRepository } from "./single-site-state-read-repository";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";

export const SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION = "mvp-cutline-2-single-site-mvp-orchestration:v1" as const;

export const SINGLE_SITE_MVP_ORCHESTRATION_STEPS = [
  "source_capture",
  "source_evidence_review",
  "clone_generation",
  "clone_review",
  "proposal_planning",
  "implementation_authorization",
  "improvement_execution",
  "improved_version_review",
  "content_approval",
  "client_approval",
  "launch_approval",
  "launch_readiness",
  "publish_activation_request",
  "publish_activation_decision",
  "publish_activation_gate",
  "operator_dry_run",
  "operator_shadow_publish",
  "online_verification",
  "mvp_closeout",
] as const;

export const SINGLE_SITE_MVP_ORCHESTRATION_STATUSES = [
  "not_started",
  "blocked",
  "ready",
  "in_progress",
  "completed",
  "completed_with_limitations",
  "failed",
  "not_required",
  "unknown",
] as const;

export const SINGLE_SITE_MVP_NEXT_OPERATION_KEYS = [
  "start_source_capture",
  "review_source_evidence",
  "start_clone_generation",
  "review_clone",
  "start_proposal_planning",
  "request_implementation_authorization",
  "run_improvement_dry_run",
  "create_improved_candidate",
  "review_improved_candidate",
  "request_content_approval",
  "request_client_approval",
  "request_launch_approval",
  "collect_launch_readiness",
  "request_publish_activation",
  "record_publish_activation_decision",
  "evaluate_publish_activation_gate",
  "run_operator_dry_run",
  "run_shadow_publish",
  "verify_online_site",
  "closeout_mvp_site",
  "blocked_manual_resolution_required",
  "no_action",
] as const;

export type SingleSiteMvpOrchestrationStepKey = (typeof SINGLE_SITE_MVP_ORCHESTRATION_STEPS)[number];
export type SingleSiteMvpOrchestrationStatus = (typeof SINGLE_SITE_MVP_ORCHESTRATION_STATUSES)[number];
export type SingleSiteMvpNextOperationKey = (typeof SINGLE_SITE_MVP_NEXT_OPERATION_KEYS)[number];

export type SingleSiteMvpSourceOwner =
  | "state_spine"
  | "source_capture"
  | "source_evidence_review"
  | "clone_generation"
  | "clone_review"
  | "proposal_planning"
  | "implementation_authorization"
  | "improvement_execution"
  | "improved_version_review"
  | "content_approval"
  | "client_approval"
  | "launch_approval"
  | "launch_readiness"
  | "publish_activation_request"
  | "publish_activation_decision"
  | "publish_activation_gate"
  | "operator_audit"
  | "online_verification"
  | "mvp_closeout"
  | "unknown";

export type SingleSiteMvpOperatorActor = {
  actorType?: "human" | "system" | "ai_advisory" | string | null;
  actorId?: string | null;
  actorRole?: string | null;
  actorDisplayLabel?: string | null;
};

export type SingleSiteMvpOrchestrationInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId?: string | null;
  candidateVersionRef?: string | null;
  runtimeArtifactRef?: string | null;
  publishTargetRef?: string | null;
  actor?: SingleSiteMvpOperatorActor | null;
  correlationId?: string | null;
};

export type SingleSiteMvpCurrentRef = {
  key: string;
  sourceOwner: SingleSiteMvpSourceOwner;
  ref: string | null;
  sourceTable?: string | null;
  sourceWatermark?: string | null;
};

export type SingleSiteMvpOrchestrationStep = {
  step: SingleSiteMvpOrchestrationStepKey;
  status: SingleSiteMvpOrchestrationStatus;
  sourceOwner: SingleSiteMvpSourceOwner;
  requiredRefs: string[];
  currentRefs: SingleSiteMvpCurrentRef[];
  blockers: string[];
  warnings: string[];
  limitations: string[];
  nextOperationKey: SingleSiteMvpNextOperationKey;
  readOnly: true;
  mutatesSourceTruth: false;
  operatorActionAvailable: boolean;
};

export type SingleSiteMvpNextOperation = {
  key: SingleSiteMvpNextOperationKey;
  step: SingleSiteMvpOrchestrationStepKey | null;
  sourceOwner: SingleSiteMvpSourceOwner | null;
  reason: string;
  requiredRefs: string[];
  currentRefs: SingleSiteMvpCurrentRef[];
  readOnly: true;
  advisoryOnly: true;
  mutatesSourceTruth: false;
};

export type SingleSiteMvpOperatorChecklistItem = {
  step: SingleSiteMvpOrchestrationStepKey;
  status: SingleSiteMvpOrchestrationStatus;
  nextOperationKey: SingleSiteMvpNextOperationKey;
  operatorActionAvailable: boolean;
  blockerCount: number;
  warningCount: number;
  limitationCount: number;
  requiredRefsPresent: boolean;
  readOnly: true;
};

export type SingleSiteMvpOrchestrationStatusModel = {
  orchestrationVersion: typeof SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION;
  generatedAt: string;
  identity: {
    tenantId: string;
    clientId: string;
    siteId: string;
    migrationId: string | null;
    candidateVersionRef: string | null;
    runtimeArtifactRef: string | null;
    publishTargetRef: string | null;
    correlationId: string | null;
    actor: SingleSiteMvpOperatorActor | null;
  };
  boundary: {
    serverOnly: true;
    readOnly: true;
    advisoryOnly: true;
    mutatesSourceTruth: false;
    createsApprovals: false;
    createsAafRecords: false;
    createsGateAttempts: false;
    evaluatesGate: false;
    publishes: false;
    shadowPublishes: false;
    runtimeMutation: false;
    providerCalls: false;
    billingCalls: false;
    domainDnsCalls: false;
    routesAdded: false;
    uiAdded: false;
  };
  sourceSystemsRead: SingleSiteMvpSourceOwner[];
  stateReadModel: {
    available: boolean;
    readModelVersion: string | null;
    currentState: string | null;
    lifecycle: string | null;
    recommendedNextAction: string | null;
  };
  publishOperatorProjection: {
    available: boolean;
    panelVersion: string | null;
    nextAction: string | null;
    readinessState: string | null;
  };
  steps: SingleSiteMvpOrchestrationStep[];
  nextOperation: SingleSiteMvpNextOperation;
  checklist: SingleSiteMvpOperatorChecklistItem[];
  blockers: string[];
  warnings: string[];
  limitations: string[];
};

export type SingleSiteMvpStateReadDependency = Pick<SingleSiteStateReadRepository, "readByMigrationId" | "listBySiteId" | "listByClientId">;
export type SingleSiteMvpPublishProjectionDependency = Pick<SingleSitePublishOperatorReadonlyProjectionRepository, "read">;

export type SingleSiteMvpOrchestrationReadDependencies = {
  stateReader?: SingleSiteMvpStateReadDependency;
  publishOperatorProjectionReader?: SingleSiteMvpPublishProjectionDependency;
  generatedAt?: string | null;
};

const EMPTY_BOUNDARY = {
  serverOnly: true,
  readOnly: true,
  advisoryOnly: true,
  mutatesSourceTruth: false,
  createsApprovals: false,
  createsAafRecords: false,
  createsGateAttempts: false,
  evaluatesGate: false,
  publishes: false,
  shadowPublishes: false,
  runtimeMutation: false,
  providerCalls: false,
  billingCalls: false,
  domainDnsCalls: false,
  routesAdded: false,
  uiAdded: false,
} as const;

const SOURCE_OWNER_BY_STEP: Record<SingleSiteMvpOrchestrationStepKey, SingleSiteMvpSourceOwner> = {
  source_capture: "source_capture",
  source_evidence_review: "source_evidence_review",
  clone_generation: "clone_generation",
  clone_review: "clone_review",
  proposal_planning: "proposal_planning",
  implementation_authorization: "implementation_authorization",
  improvement_execution: "improvement_execution",
  improved_version_review: "improved_version_review",
  content_approval: "content_approval",
  client_approval: "client_approval",
  launch_approval: "launch_approval",
  launch_readiness: "launch_readiness",
  publish_activation_request: "publish_activation_request",
  publish_activation_decision: "publish_activation_decision",
  publish_activation_gate: "publish_activation_gate",
  operator_dry_run: "operator_audit",
  operator_shadow_publish: "operator_audit",
  online_verification: "online_verification",
  mvp_closeout: "mvp_closeout",
};

const NEXT_OPERATION_BY_STEP: Record<SingleSiteMvpOrchestrationStepKey, SingleSiteMvpNextOperationKey> = {
  source_capture: "start_source_capture",
  source_evidence_review: "review_source_evidence",
  clone_generation: "start_clone_generation",
  clone_review: "review_clone",
  proposal_planning: "start_proposal_planning",
  implementation_authorization: "request_implementation_authorization",
  improvement_execution: "run_improvement_dry_run",
  improved_version_review: "review_improved_candidate",
  content_approval: "request_content_approval",
  client_approval: "request_client_approval",
  launch_approval: "request_launch_approval",
  launch_readiness: "collect_launch_readiness",
  publish_activation_request: "request_publish_activation",
  publish_activation_decision: "record_publish_activation_decision",
  publish_activation_gate: "evaluate_publish_activation_gate",
  operator_dry_run: "run_operator_dry_run",
  operator_shadow_publish: "run_shadow_publish",
  online_verification: "verify_online_site",
  mvp_closeout: "closeout_mvp_site",
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function stringList(...values: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      out.push(...stringList(...value));
    } else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      out.push(text(record.code ?? record.key ?? record.description ?? record.message ?? JSON.stringify(record)) ?? "");
    } else {
      out.push(text(value) ?? "");
    }
  }
  return Array.from(new Set(out.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function ref(key: string, sourceOwner: SingleSiteMvpSourceOwner, value: unknown, sourceTable?: string | null, sourceWatermark?: string | null): SingleSiteMvpCurrentRef[] {
  const normalized = text(value);
  return normalized ? [{ key, sourceOwner, ref: normalized, sourceTable, sourceWatermark: sourceWatermark ?? null }] : [];
}

function step(input: {
  step: SingleSiteMvpOrchestrationStepKey;
  status: SingleSiteMvpOrchestrationStatus;
  requiredRefs?: string[];
  currentRefs?: SingleSiteMvpCurrentRef[];
  blockers?: string[];
  warnings?: string[];
  limitations?: string[];
  nextOperationKey?: SingleSiteMvpNextOperationKey;
  operatorActionAvailable?: boolean;
}): SingleSiteMvpOrchestrationStep {
  const nextOperationKey = input.nextOperationKey ?? NEXT_OPERATION_BY_STEP[input.step];
  return {
    step: input.step,
    status: input.status,
    sourceOwner: SOURCE_OWNER_BY_STEP[input.step],
    requiredRefs: [...(input.requiredRefs ?? [])].sort((left, right) => left.localeCompare(right)),
    currentRefs: [...(input.currentRefs ?? [])].sort((left, right) => left.key.localeCompare(right.key)),
    blockers: stringList(input.blockers ?? []),
    warnings: stringList(input.warnings ?? []),
    limitations: stringList(input.limitations ?? []),
    nextOperationKey,
    readOnly: true,
    mutatesSourceTruth: false,
    operatorActionAvailable:
      input.operatorActionAvailable ?? (input.status === "ready" && nextOperationKey !== "no_action" && nextOperationKey !== "blocked_manual_resolution_required"),
  };
}

function isCompleted(status: SingleSiteMvpOrchestrationStatus): boolean {
  return status === "completed" || status === "completed_with_limitations" || status === "not_required";
}

function acceptedStatus(status: string | null): SingleSiteMvpOrchestrationStatus | null {
  if (status === "accepted" || status === "approved" || status === "granted" || status === "allowed") return "completed";
  if (status === "accepted_with_limitations" || status === "approved_with_limitations" || status === "granted_with_limitations") return "completed_with_limitations";
  return null;
}

function reviewStatus(status: string | null): SingleSiteMvpOrchestrationStatus {
  const accepted = acceptedStatus(status);
  if (accepted) return accepted;
  if (!status || status === "missing" || status === "not_started") return "not_started";
  if (status === "ready_for_review" || status === "draft" || status === "required") return "ready";
  if (status === "in_review" || status === "review_in_progress") return "in_progress";
  if (status === "retry_required" || status === "changes_requested" || status === "blocked") return "blocked";
  if (status === "rejected" || status === "failed") return "failed";
  if (status === "cancelled" || status === "superseded") return "failed";
  if (status === "not_required_yet") return "not_required";
  return "unknown";
}

function approvalStatus(status: string | null): SingleSiteMvpOrchestrationStatus {
  const accepted = acceptedStatus(status);
  if (accepted) return accepted;
  if (!status || status === "missing") return "not_started";
  if (status === "not_required_yet") return "not_required";
  if (status === "required" || status === "draft" || status === "ready_for_review") return "ready";
  if (status === "in_review") return "in_progress";
  if (status === "changes_requested" || status === "blocked") return "blocked";
  if (status === "rejected" || status === "cancelled" || status === "superseded") return "failed";
  return "unknown";
}

function sourceSystemsRead(model: SingleSiteMigrationReadModel | null, publish: SingleSitePublishOperatorReadonlyProjection | null): SingleSiteMvpSourceOwner[] {
  const owners = new Set<SingleSiteMvpSourceOwner>();
  if (model) {
    owners.add("state_spine");
    owners.add("source_evidence_review");
    owners.add("clone_review");
    owners.add("proposal_planning");
    owners.add("implementation_authorization");
    owners.add("improvement_execution");
    owners.add("improved_version_review");
    owners.add("content_approval");
    owners.add("client_approval");
    owners.add("launch_approval");
    owners.add("mvp_closeout");
  }
  if (publish) {
    owners.add("launch_readiness");
    owners.add("publish_activation_request");
    owners.add("publish_activation_decision");
    owners.add("publish_activation_gate");
    owners.add("operator_audit");
  }
  return Array.from(owners).sort((left, right) => left.localeCompare(right));
}

function buildSteps(input: SingleSiteMvpOrchestrationInput, model: SingleSiteMigrationReadModel | null, publish: SingleSitePublishOperatorReadonlyProjection | null): SingleSiteMvpOrchestrationStep[] {
  if (!model) {
    return SINGLE_SITE_MVP_ORCHESTRATION_STEPS.map((key) =>
      step({
        step: key,
        status: key === "source_capture" ? "ready" : "not_started",
        requiredRefs: key === "source_capture" ? ["tenant_id", "client_id", "site_id"] : [],
        currentRefs: key === "source_capture" ? [...ref("tenant_id", "state_spine", input.tenantId), ...ref("client_id", "state_spine", input.clientId), ...ref("site_id", "state_spine", input.siteId)] : [],
        operatorActionAvailable: key === "source_capture",
      }),
    );
  }

  const globalLimitations = stringList(
    model.sourceEvidenceReview.limitations,
    model.cloneReview.limitations,
    model.improvementProposalPlanning.limitations,
    model.improvementExecution.limitationsCarriedForward,
    model.improvedVersionReview.limitations,
    model.contentApproval.limitations,
    model.clientApproval.limitations,
    model.launchApproval.limitations,
    publish?.limitationCodes,
  );
  const globalWarnings = stringList(model.sourceEvidenceReview.warnings, model.cloneReview.warnings, publish?.warningCodes);

  const sourceCaptureCompleted = model.currentState.state !== "site_candidate_created" && !["source_capture_started", "source_capture_failed"].includes(model.currentState.state);
  const sourceCaptureStatus: SingleSiteMvpOrchestrationStatus =
    model.currentState.state === "source_capture_failed" ? "failed" : model.currentState.state === "source_capture_started" ? "in_progress" : sourceCaptureCompleted ? "completed" : "ready";
  const sourceEvidenceStatus = model.sourceEvidenceReview.acceptedWithLimitations
    ? "completed_with_limitations"
    : model.sourceEvidenceReview.accepted
      ? "completed"
      : model.sourceEvidenceReview.retryRequired
        ? "blocked"
        : model.sourceEvidenceReview.rejected
          ? "failed"
          : model.sourceEvidenceReview.reviewStatus === "ready_for_review"
            ? "ready"
            : model.sourceEvidenceReview.reviewStatus === "review_in_progress"
              ? "in_progress"
              : sourceCaptureCompleted
                ? "ready"
                : "not_started";
  const cloneGenerated = Boolean(model.cloneReview.cloneSiteVersionRef || model.cloneReview.runtimeArtifactRef);
  const cloneGenerationStatus: SingleSiteMvpOrchestrationStatus = cloneGenerated
    ? "completed"
    : sourceEvidenceStatus === "completed" || sourceEvidenceStatus === "completed_with_limitations"
      ? "ready"
      : "not_started";
  const cloneReviewStatus = cloneGenerated ? reviewStatus(model.cloneReview.reviewStatus) : "not_started";
  const proposalStatus =
    model.cloneReview.proposalPlanningAllowed && model.improvementProposalPlanning.proposalStatus === "not_started"
      ? "ready"
      : model.cloneReview.proposalPlanningAllowed
        ? reviewStatus(model.improvementProposalPlanning.proposalStatus)
        : "not_started";
  const implementationAuthorizationStatus: SingleSiteMvpOrchestrationStatus =
    model.improvementProposalPlanning.implementationAuthorizationReady
      ? model.improvementProposalPlanning.implementationAuthorizationStatus === "granted_with_limitations"
        ? "completed_with_limitations"
        : "completed"
      : model.improvementProposalPlanning.proposalReadiness.approved
        ? model.improvementProposalPlanning.implementationAuthorizationStatus === "requested"
          ? "in_progress"
          : "ready"
        : "not_started";
  const executionStatus: SingleSiteMvpOrchestrationStatus =
    model.improvementExecution.executionStatus === "completed_with_limitations"
      ? "completed_with_limitations"
      : model.improvementExecution.executionStatus === "completed"
        ? "completed"
        : model.improvementExecution.executionStatus === "started"
          ? "in_progress"
          : model.improvementExecution.executionStatus === "ready" || model.improvementExecution.readinessFlags.readyToStart
            ? "ready"
            : model.improvementExecution.executionStatus === "blocked" || model.improvementExecution.executionStatus === "retry_required"
              ? "blocked"
              : model.improvementExecution.executionStatus === "failed"
                ? "failed"
                : "not_started";
  const improvedCandidateReady = Boolean(model.improvementExecution.improvedCandidateRefs.siteVersionRef || model.improvementExecution.improvedCandidateRefs.runtimeArtifactRef);
  const improvedReviewStatus = model.improvedVersionReview.latestReviewId ? reviewStatus(model.improvedVersionReview.reviewStatus) : improvedCandidateReady ? "ready" : "not_started";
  const contentStatus = model.contentApproval.latestContentApprovalId ? approvalStatus(model.contentApproval.status) : isCompleted(improvedReviewStatus) ? "ready" : "not_started";
  const clientStatus = model.clientApproval.latestClientApprovalId ? approvalStatus(model.clientApproval.status) : isCompleted(contentStatus) ? approvalStatus(model.clientApproval.status) : "not_started";
  const launchStatus = model.launchApproval.latestLaunchApprovalId ? approvalStatus(model.launchApproval.status) : isCompleted(clientStatus) ? "ready" : "not_started";
  const launchApproved = launchStatus === "completed" || launchStatus === "completed_with_limitations";
  const launchReadinessStatus: SingleSiteMvpOrchestrationStatus =
    publish?.launchReadiness.flags.readyWithLimitations
      ? "completed_with_limitations"
      : publish?.launchReadiness.flags.ready
        ? "completed"
        : publish?.launchReadiness.flags.blocked || publish?.launchReadiness.flags.stale
          ? "blocked"
          : launchApproved
            ? "ready"
            : "not_started";
  const publishRequestStatus: SingleSiteMvpOrchestrationStatus = publish?.publishActivationRequest.id ? "completed" : isCompleted(launchReadinessStatus) ? "ready" : "not_started";
  const publishDecisionStatus: SingleSiteMvpOrchestrationStatus =
    publish?.publishActivationDecision.grantedWithLimitations
      ? "completed_with_limitations"
      : publish?.publishActivationDecision.granted
        ? "completed"
        : publish?.publishActivationDecision.rejected || publish?.publishActivationDecision.invalid
          ? "failed"
          : publish?.publishActivationRequest.id
            ? "ready"
            : "not_started";
  const gateAllowed = publish?.gateHandoffEvaluation.gateResultStatus === "allowed" && publish.gateHandoffEvaluation.gateBlockers.length === 0;
  const gateStatus: SingleSiteMvpOrchestrationStatus =
    gateAllowed
      ? "completed"
      : publish?.gateHandoffEvaluation.gateResultId
        ? "blocked"
        : isCompleted(publishDecisionStatus)
          ? "ready"
          : "not_started";
  const dryRunStatus: SingleSiteMvpOrchestrationStatus =
    publish?.latestDryRun?.status === "dry_run_completed"
      ? "completed"
      : publish?.latestDryRun?.status?.includes("failed")
        ? "failed"
        : gateStatus === "completed"
          ? "ready"
          : "not_started";
  const shadowStatus: SingleSiteMvpOrchestrationStatus =
    publish?.latestShadowPublish?.status === "shadow_publish_completed"
      ? "completed"
      : publish?.latestShadowPublish?.status?.includes("failed")
        ? "failed"
        : dryRunStatus === "completed"
          ? "ready"
          : "not_started";
  const onlineVerificationStatus: SingleSiteMvpOrchestrationStatus = model.currentState.state === "rollback_available" || model.closeout.present ? "completed" : shadowStatus === "completed" ? "ready" : "not_started";
  const closeoutStatus: SingleSiteMvpOrchestrationStatus = model.closeout.present ? "completed" : onlineVerificationStatus === "completed" ? "ready" : "not_started";

  const steps = [
    step({
      step: "source_capture",
      status: sourceCaptureStatus,
      requiredRefs: ["tenant_id", "client_id", "site_id", "source_url"],
      currentRefs: [
        ...ref("migration_id", "state_spine", model.migration.migrationId),
        ...ref("source_url", "source_capture", model.migration.sourceUrl),
        ...ref("runtime_site_id", "source_capture", model.migration.runtimeSiteId),
      ],
      warnings: globalWarnings,
      limitations: stringList(model.diagnostics),
    }),
    step({
      step: "source_evidence_review",
      status: sourceEvidenceStatus,
      requiredRefs: ["migration_id", "source_evidence_package"],
      currentRefs: [...ref("review_id", "source_evidence_review", model.sourceEvidenceReview.reviewId), ...ref("source_watermark", "source_evidence_review", model.freshness.latestReviewWatermark)],
      blockers: stringList(model.sourceEvidenceReview.blockers),
      warnings: stringList(model.sourceEvidenceReview.warnings),
      limitations: stringList(model.sourceEvidenceReview.limitations),
    }),
    step({
      step: "clone_generation",
      status: cloneGenerationStatus,
      requiredRefs: ["accepted_source_evidence_review"],
      currentRefs: [...ref("clone_site_version_ref", "clone_generation", model.cloneReview.cloneSiteVersionRef), ...ref("runtime_artifact_ref", "clone_generation", model.cloneReview.runtimeArtifactRef)],
      blockers: cloneGenerationStatus === "not_started" && !isCompleted(sourceEvidenceStatus) ? ["source_evidence_review_not_accepted"] : [],
    }),
    step({
      step: "clone_review",
      status: cloneReviewStatus,
      requiredRefs: ["clone_site_version_ref", "runtime_artifact_ref"],
      currentRefs: [...ref("clone_review_id", "clone_review", model.cloneReview.reviewId), ...ref("clone_site_version_ref", "clone_review", model.cloneReview.cloneSiteVersionRef), ...ref("runtime_artifact_ref", "clone_review", model.cloneReview.runtimeArtifactRef)],
      blockers: stringList(model.cloneReview.blockers),
      warnings: stringList(model.cloneReview.warnings),
      limitations: stringList(model.cloneReview.limitations),
    }),
    step({
      step: "proposal_planning",
      status: proposalStatus,
      requiredRefs: ["accepted_clone_review"],
      currentRefs: [...ref("proposal_plan_id", "proposal_planning", model.improvementProposalPlanning.latestProposalPlanId)],
      limitations: globalLimitations,
    }),
    step({
      step: "implementation_authorization",
      status: implementationAuthorizationStatus,
      requiredRefs: ["approved_proposal_plan", "implementation_authorization_decision"],
      currentRefs: [
        ...ref("proposal_plan_id", "proposal_planning", model.improvementProposalPlanning.latestProposalPlanId),
        ...ref("implementation_authorization_status", "implementation_authorization", model.improvementProposalPlanning.implementationAuthorizationStatus),
      ],
      limitations: globalLimitations,
    }),
    step({
      step: "improvement_execution",
      status: executionStatus,
      requiredRefs: ["approved_proposal_plan", "implementation_authorization_decision"],
      currentRefs: [
        ...ref("execution_attempt_id", "improvement_execution", model.improvementExecution.latestExecutionAttemptId),
        ...ref("improved_candidate_site_version_ref", "improvement_execution", model.improvementExecution.improvedCandidateRefs.siteVersionRef),
        ...ref("improved_runtime_artifact_ref", "improvement_execution", model.improvementExecution.improvedCandidateRefs.runtimeArtifactRef),
      ],
      limitations: globalLimitations,
      nextOperationKey: improvedCandidateReady || executionStatus === "ready" ? "create_improved_candidate" : "run_improvement_dry_run",
    }),
    step({
      step: "improved_version_review",
      status: improvedReviewStatus,
      requiredRefs: ["improved_candidate_site_version_ref", "improved_runtime_artifact_ref"],
      currentRefs: [
        ...ref("improved_version_review_id", "improved_version_review", model.improvedVersionReview.latestReviewId),
        ...ref("improved_candidate_site_version_ref", "improved_version_review", model.improvedVersionReview.reviewedCandidateSiteVersionRef),
        ...ref("improved_runtime_artifact_ref", "improved_version_review", model.improvedVersionReview.reviewedRuntimeArtifactRef),
      ],
      limitations: globalLimitations,
    }),
    step({
      step: "content_approval",
      status: contentStatus,
      requiredRefs: ["accepted_improved_version_review"],
      currentRefs: [...ref("content_approval_id", "content_approval", model.contentApproval.latestContentApprovalId), ...ref("aaf_content_approval_decision_id", "content_approval", model.contentApproval.aafRefs.decisionId)],
      blockers: model.contentApproval.unresolvedBlockerCount > 0 ? [`content_approval_unresolved_blockers:${model.contentApproval.unresolvedBlockerCount}`] : [],
      limitations: globalLimitations,
    }),
    step({
      step: "client_approval",
      status: clientStatus,
      requiredRefs: ["content_approval_decision"],
      currentRefs: [...ref("client_approval_id", "client_approval", model.clientApproval.latestClientApprovalId), ...ref("aaf_client_approval_decision_id", "client_approval", model.clientApproval.aafRefs.decisionId)],
      blockers: model.clientApproval.unresolvedBlockerCount > 0 ? [`client_approval_unresolved_blockers:${model.clientApproval.unresolvedBlockerCount}`] : [],
      limitations: globalLimitations,
    }),
    step({
      step: "launch_approval",
      status: launchStatus,
      requiredRefs: ["content_approval_decision", "client_approval_decision_or_policy_not_required"],
      currentRefs: [...ref("launch_approval_id", "launch_approval", model.launchApproval.latestLaunchApprovalId), ...ref("aaf_launch_approval_decision_id", "launch_approval", model.launchApproval.aafRefs.decisionId)],
      blockers: model.launchApproval.unresolvedBlockerCount > 0 ? [`launch_approval_unresolved_blockers:${model.launchApproval.unresolvedBlockerCount}`] : [],
      limitations: globalLimitations,
    }),
    step({
      step: "launch_readiness",
      status: launchReadinessStatus,
      requiredRefs: ["launch_approval_decision", "improved_candidate", "publish_target", "domain_or_exception", "billing_or_bypass", "hosting_or_bypass", "rollback_readiness", "preview_smoke_qa"],
      currentRefs: [...ref("launch_readiness_record", "launch_readiness", publish?.launchReadiness.recordRef), ...ref("launch_readiness_evidence", "launch_readiness", publish?.launchReadiness.evidencePackageRef)],
      blockers: stringList(publish?.launchReadiness.blockedDimensions, publish?.launchReadiness.requiredMissingDimensions),
      warnings: stringList(publish?.launchReadiness.staleDimensions),
      limitations: globalLimitations,
    }),
    step({
      step: "publish_activation_request",
      status: publishRequestStatus,
      requiredRefs: ["launch_readiness_evidence"],
      currentRefs: [...ref("publish_activation_request", "publish_activation_request", publish?.publishActivationRequest.ref)],
      limitations: globalLimitations,
    }),
    step({
      step: "publish_activation_decision",
      status: publishDecisionStatus,
      requiredRefs: ["publish_activation_request"],
      currentRefs: [...ref("publish_activation_decision", "publish_activation_decision", publish?.publishActivationDecision.ref)],
      blockers: publish?.publishActivationDecision.rejected || publish?.publishActivationDecision.invalid ? publish.publishActivationDecision.indicators : [],
      limitations: stringList(globalLimitations, publish?.publishActivationDecision.limitations),
    }),
    step({
      step: "publish_activation_gate",
      status: gateStatus,
      requiredRefs: ["publish_activation_decision"],
      currentRefs: [...ref("gate_result", "publish_activation_gate", publish?.gateHandoffEvaluation.gateResultRef), ...ref("gate_input_watermark", "publish_activation_gate", publish?.gateHandoffEvaluation.gateInputWatermark)],
      blockers: stringList(publish?.gateHandoffEvaluation.gateBlockers, publish?.gateHandoffEvaluation.mismatchIndicators),
      warnings: publish?.gateHandoffEvaluation.gateWarnings,
      limitations: globalLimitations,
    }),
    step({
      step: "operator_dry_run",
      status: dryRunStatus,
      requiredRefs: ["allowed_publish_activation_gate"],
      currentRefs: [...ref("latest_dry_run_action_id", "operator_audit", publish?.latestDryRun?.actionId)],
      blockers: publish?.latestDryRun?.blockerCodes,
      warnings: publish?.latestDryRun?.warningCodes,
      limitations: stringList(globalLimitations, publish?.latestDryRun?.limitationCodes),
    }),
    step({
      step: "operator_shadow_publish",
      status: shadowStatus,
      requiredRefs: ["dry_run_completed"],
      currentRefs: [...ref("latest_shadow_publish_action_id", "operator_audit", publish?.latestShadowPublish?.actionId)],
      blockers: publish?.latestShadowPublish?.blockerCodes,
      warnings: publish?.latestShadowPublish?.warningCodes,
      limitations: stringList(globalLimitations, publish?.latestShadowPublish?.limitationCodes),
    }),
    step({
      step: "online_verification",
      status: onlineVerificationStatus,
      requiredRefs: ["shadow_publish_completed"],
      currentRefs: [...ref("latest_shadow_publish_action_id", "operator_audit", publish?.latestShadowPublish?.actionId), ...ref("final_url", "online_verification", model.closeout.finalUrl)],
      limitations: globalLimitations,
    }),
    step({
      step: "mvp_closeout",
      status: closeoutStatus,
      requiredRefs: ["online_verification_evidence", "rollback_or_recovery_plan"],
      currentRefs: [...ref("closeout_id", "mvp_closeout", model.closeout.closeoutId), ...ref("final_url", "mvp_closeout", model.closeout.finalUrl)],
      limitations: stringList(globalLimitations, model.closeout.exceptions),
    }),
  ];

  const openBlockers = model.blockers.hasBlockingOpenIssue ? model.blockers.items.filter((item) => item.status === "open").map((item) => item.key) : [];
  if (openBlockers.length === 0) return steps;
  const firstOpen = steps.find((item) => !isCompleted(item.status));
  if (!firstOpen) return steps;
  return steps.map((item) =>
    item.step === firstOpen.step
      ? {
          ...item,
          status: "blocked",
          blockers: stringList(item.blockers, openBlockers),
          nextOperationKey: "blocked_manual_resolution_required",
          operatorActionAvailable: true,
        }
      : item,
  );
}

export function deriveSingleSiteMvpNextOperation(status: Pick<SingleSiteMvpOrchestrationStatusModel, "steps">): SingleSiteMvpNextOperation {
  const blocked = status.steps.find((item) => item.status === "blocked");
  if (blocked) {
    return {
      key: "blocked_manual_resolution_required",
      step: blocked.step,
      sourceOwner: blocked.sourceOwner,
      reason: `${blocked.step} is blocked by source-owned state.`,
      requiredRefs: blocked.requiredRefs,
      currentRefs: blocked.currentRefs,
      readOnly: true,
      advisoryOnly: true,
      mutatesSourceTruth: false,
    };
  }

  const next = status.steps.find((item) => item.operatorActionAvailable && (item.status === "ready" || item.status === "in_progress" || item.status === "failed"));
  if (!next) {
    return {
      key: "no_action",
      step: null,
      sourceOwner: null,
      reason: "No next operation is currently recommended by the read-only orchestration projection.",
      requiredRefs: [],
      currentRefs: [],
      readOnly: true,
      advisoryOnly: true,
      mutatesSourceTruth: false,
    };
  }

  return {
    key: next.nextOperationKey,
    step: next.step,
    sourceOwner: next.sourceOwner,
    reason: `${next.step} is the first non-completed operator-available step in the single-site MVP order.`,
    requiredRefs: next.requiredRefs,
    currentRefs: next.currentRefs,
    readOnly: true,
    advisoryOnly: true,
    mutatesSourceTruth: false,
  };
}

export function buildSingleSiteMvpOperatorChecklist(status: Pick<SingleSiteMvpOrchestrationStatusModel, "steps">): SingleSiteMvpOperatorChecklistItem[] {
  return status.steps.map((item) => ({
    step: item.step,
    status: item.status,
    nextOperationKey: item.nextOperationKey,
    operatorActionAvailable: item.operatorActionAvailable,
    blockerCount: item.blockers.length,
    warningCount: item.warnings.length,
    limitationCount: item.limitations.length,
    requiredRefsPresent: item.requiredRefs.length === 0 || item.currentRefs.length >= item.requiredRefs.length,
    readOnly: true,
  }));
}

async function readStateModel(input: SingleSiteMvpOrchestrationInput, reader: SingleSiteMvpStateReadDependency): Promise<SingleSiteMigrationReadModel | null> {
  const migrationId = text(input.migrationId);
  if (migrationId) return reader.readByMigrationId(migrationId);
  const bySite = text(input.siteId) ? await reader.listBySiteId(input.siteId, 1) : [];
  if (bySite[0]) return bySite[0];
  const byClient = text(input.clientId) ? await reader.listByClientId(input.clientId, 1) : [];
  return byClient[0] ?? null;
}

export async function readSingleSiteMvpOrchestrationStatus(
  input: SingleSiteMvpOrchestrationInput,
  dependencies: SingleSiteMvpOrchestrationReadDependencies = {},
): Promise<SingleSiteMvpOrchestrationStatusModel> {
  const generatedAt = dependencies.generatedAt ?? new Date().toISOString();
  const stateReader = dependencies.stateReader ?? new SingleSiteStateReadRepository();
  const publishReader = dependencies.publishOperatorProjectionReader ?? new SingleSitePublishOperatorReadonlyProjectionRepository();
  const stateModel = await readStateModel(input, stateReader);
  const lookupMigrationId = text(input.migrationId) ?? stateModel?.migration.migrationId ?? null;
  const publishProjection =
    lookupMigrationId || text(input.siteId) || text(input.candidateVersionRef)
      ? await publishReader.read({
          migrationId: lookupMigrationId,
          siteId: input.siteId,
          candidateSiteVersionRef: input.candidateVersionRef ?? stateModel?.improvementExecution.improvedCandidateRefs.siteVersionRef ?? stateModel?.improvedVersionReview.reviewedCandidateSiteVersionRef ?? null,
          limit: 12,
        })
      : null;

  const steps = buildSteps(input, stateModel, publishProjection);
  const partial = { steps };
  const nextOperation = deriveSingleSiteMvpNextOperation(partial);
  const checklist = buildSingleSiteMvpOperatorChecklist(partial);

  return {
    orchestrationVersion: SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION,
    generatedAt,
    identity: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: lookupMigrationId,
      candidateVersionRef: input.candidateVersionRef ?? stateModel?.improvementExecution.improvedCandidateRefs.siteVersionRef ?? stateModel?.improvedVersionReview.reviewedCandidateSiteVersionRef ?? null,
      runtimeArtifactRef: input.runtimeArtifactRef ?? stateModel?.improvementExecution.improvedCandidateRefs.runtimeArtifactRef ?? stateModel?.improvedVersionReview.reviewedRuntimeArtifactRef ?? null,
      publishTargetRef: input.publishTargetRef ?? publishProjection?.publishContext.publishTargetRef ?? null,
      correlationId: input.correlationId ?? null,
      actor: input.actor ?? null,
    },
    boundary: EMPTY_BOUNDARY,
    sourceSystemsRead: sourceSystemsRead(stateModel, publishProjection),
    stateReadModel: {
      available: Boolean(stateModel),
      readModelVersion: stateModel?.readModelVersion ?? null,
      currentState: stateModel?.currentState.state ?? null,
      lifecycle: stateModel?.currentState.lifecycle ?? null,
      recommendedNextAction: stateModel?.recommendedNextAction.actionKey ?? null,
    },
    publishOperatorProjection: {
      available: Boolean(publishProjection),
      panelVersion: publishProjection?.panelVersion ?? null,
      nextAction: publishProjection?.nextAction ?? null,
      readinessState: publishProjection?.readinessState ?? null,
    },
    steps,
    nextOperation,
    checklist,
    blockers: stringList(...steps.map((item) => item.blockers)),
    warnings: stringList(...steps.map((item) => item.warnings)),
    limitations: stringList(...steps.map((item) => item.limitations)),
  };
}
