import type { ProviderHandoffReadinessDebugModel } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-view";

const SECRET_LIKE = /(token|secret|password|credential|api[_-]?key|bearer|private[_-]?key)/i;

export function redactSecretLikeText(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return SECRET_LIKE.test(text) ? "[redacted]" : text;
}

export function sanitizeDisplayList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const values = input.map((value) => redactSecretLikeText(value)).filter(Boolean);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function buildProviderHandoffReadinessDebugDisplay(model: ProviderHandoffReadinessDebugModel) {
  const authorization = model.governanceAuthorization;
  const authorizationStatus = redactSecretLikeText(authorization?.authorizationStatus) || "not_requested";
  const authorizationReason = redactSecretLikeText(authorization?.authorizationReason);
  const authorizationDiagnostics = sanitizeDisplayList([
    "GOVERNANCE_AUTHORIZATION_INTENT_ONLY",
    ...(authorization?.diagnostics ?? []),
  ]);
  const governanceDecisionPackage = model.governanceDecisionPackage;
  const governanceDecisionPackagePackageId = redactSecretLikeText(governanceDecisionPackage?.packageId);
  const governanceDecisionPackageRecommendedAction =
    redactSecretLikeText(governanceDecisionPackage?.recommendedAction) || "failed_closed";
  const governanceDecisionPackageExecutionBlocked = governanceDecisionPackage?.executionBlocked === true;
  const governanceDecisionPackageReviewStatus = redactSecretLikeText(governanceDecisionPackage?.reviewStatus) || "no_reviews";
  const governanceDecisionPackageAuthorizationStatus =
    redactSecretLikeText(governanceDecisionPackage?.authorizationStatus) || "not_requested";
  const governanceDecisionPackageSnapshotCount = Number.isFinite(governanceDecisionPackage?.snapshotCount)
    ? Number(governanceDecisionPackage?.snapshotCount)
    : 0;
  const incomingGovernanceDecisionPackageDiagnostics = sanitizeDisplayList(governanceDecisionPackage?.diagnostics);
  const governanceDecisionPackageMalformed =
    Boolean(governanceDecisionPackage) &&
    (!governanceDecisionPackagePackageId ||
      !redactSecretLikeText(governanceDecisionPackage?.recommendedAction) ||
      governanceDecisionPackage?.executionBlocked !== true ||
      !redactSecretLikeText(governanceDecisionPackage?.reviewStatus) ||
      !redactSecretLikeText(governanceDecisionPackage?.authorizationStatus) ||
      !Number.isFinite(governanceDecisionPackage?.snapshotCount));
  const governanceDecisionPackageMissing = !governanceDecisionPackage;
  const governanceDecisionPackageFailedClosedSignal = governanceDecisionPackageRecommendedAction === "failed_closed";
  const governanceDecisionPackageNeedsFallbackDiagnostic =
    governanceDecisionPackageMissing ||
    !governanceDecisionPackagePackageId ||
    governanceDecisionPackageFailedClosedSignal ||
    !governanceDecisionPackageExecutionBlocked ||
    (governanceDecisionPackageMalformed && incomingGovernanceDecisionPackageDiagnostics.length === 0);
  const governanceDecisionPackageDiagnostics = sanitizeDisplayList([
    ...incomingGovernanceDecisionPackageDiagnostics,
    ...(governanceDecisionPackageNeedsFallbackDiagnostic ? ["GOVERNANCE_DECISION_PACKAGE_FAILED_CLOSED"] : []),
  ]);
  const executionReadinessGate = model.executionReadinessGate;
  const executionReadinessGateRequiredConditions = Array.isArray(executionReadinessGate?.requiredConditions)
    ? executionReadinessGate.requiredConditions.map((condition) => ({
        condition: redactSecretLikeText(condition.condition),
        status: redactSecretLikeText(condition.status),
        reason: redactSecretLikeText(condition.reason),
      }))
    : [];
  const executionPreconditionsLedger = model.executionPreconditionsLedger;
  const executionPreconditionsLedgerRequirements = Array.isArray(executionPreconditionsLedger?.requirements)
    ? executionPreconditionsLedger.requirements.map((requirement) => ({
        requirementId: redactSecretLikeText(requirement.requirementId),
        category: redactSecretLikeText(requirement.category) as "governance" | "approval" | "execution" | "provider" | "safety",
        name: redactSecretLikeText(requirement.name),
        status: redactSecretLikeText(requirement.status) as "satisfied" | "missing" | "blocked",
        reason: redactSecretLikeText(requirement.reason),
      }))
    : [];
  const executionPreconditionsLedgerMissingRequirements = Array.isArray(executionPreconditionsLedger?.missingRequirements)
    ? executionPreconditionsLedger.missingRequirements.map((requirement) => ({
        requirementId: redactSecretLikeText(requirement.requirementId),
        category: redactSecretLikeText(requirement.category) as "governance" | "approval" | "execution" | "provider" | "safety",
        name: redactSecretLikeText(requirement.name),
        status: redactSecretLikeText(requirement.status) as "satisfied" | "missing" | "blocked",
        reason: redactSecretLikeText(requirement.reason),
      }))
    : [];
  const executionPreconditionsLedgerBlockedRequirements = Array.isArray(executionPreconditionsLedger?.blockedRequirements)
    ? executionPreconditionsLedger.blockedRequirements.map((requirement) => ({
        requirementId: redactSecretLikeText(requirement.requirementId),
        category: redactSecretLikeText(requirement.category) as "governance" | "approval" | "execution" | "provider" | "safety",
        name: redactSecretLikeText(requirement.name),
        status: redactSecretLikeText(requirement.status) as "satisfied" | "missing" | "blocked",
        reason: redactSecretLikeText(requirement.reason),
      }))
    : [];
  const executionRemediationPlan = model.executionRemediationPlan;
  const executionRemediationActions = Array.isArray(executionRemediationPlan?.actions)
    ? executionRemediationPlan.actions.map((action) => ({
        actionId: redactSecretLikeText(action.actionId),
        priority: redactSecretLikeText(action.priority) as "critical" | "high" | "normal",
        source: redactSecretLikeText(action.source) as "ledger" | "gate" | "handoff",
        reason: redactSecretLikeText(action.reason),
        recommendedAction: redactSecretLikeText(action.recommendedAction),
      }))
    : [];
  const dryRunJobPlan = model.dryRunJobPlan;
  const dryRunJobs = Array.isArray(dryRunJobPlan?.jobs)
    ? dryRunJobPlan.jobs.map((job) => ({
        jobId: redactSecretLikeText(job.jobId),
        jobType: redactSecretLikeText(job.jobType) as "provider_dns_upsert" | "provider_dns_delete" | "provider_domain_attach" | "provider_unknown",
        provider: redactSecretLikeText(job.provider),
        environment: redactSecretLikeText(job.environment),
        status: redactSecretLikeText(job.status) as "planned" | "simulated",
        reason: redactSecretLikeText(job.reason),
      }))
    : [];

  return {
    executionBlockedLabel: "Execution blocked",
    reviewOnlyLabel: "Control-plane review / dry-run artifact inspection only",
    handoffId: redactSecretLikeText(model.handoffId),
    readinessStatus: redactSecretLikeText(model.readinessStatus),
    executionBlocked: String(model.executionBlocked),
    blockedReasons: sanitizeDisplayList(model.blockedReasons),
    nextAllowedAction: redactSecretLikeText(model.nextAllowedAction),
    correlationKey: redactSecretLikeText(model.correlationKey),
    diagnostics: sanitizeDisplayList(model.diagnostics),
    handoffArtifactSummary: {
      providerId: redactSecretLikeText(model.handoffArtifact?.providerId),
      environment: redactSecretLikeText(model.handoffArtifact?.environment),
      capability: redactSecretLikeText(model.handoffArtifact?.capability),
      operationKind: redactSecretLikeText(model.handoffArtifact?.operationKind),
      approvalStatus: redactSecretLikeText(model.handoffArtifact?.approvalStatus),
      riskLevel: redactSecretLikeText(model.handoffArtifact?.riskLevel),
      handoffStatus: redactSecretLikeText(model.handoffArtifact?.handoffStatus),
      plannedJobIds: sanitizeDisplayList(model.handoffArtifact?.plannedJobIds),
      warnings: sanitizeDisplayList(model.handoffArtifact?.warnings),
      blockers: sanitizeDisplayList(model.handoffArtifact?.blockers),
    },
    workerPickupEvidenceSummary: {
      providerRef: redactSecretLikeText(model.workerPickupEvidence.providerRef),
      approvalStatus: redactSecretLikeText(model.workerPickupEvidence.approvalStatus),
      readinessStatus: redactSecretLikeText(model.workerPickupEvidence.readinessStatus),
      executionBlocked: String(Boolean(model.workerPickupEvidence.executionBlocked)),
      nextAllowedAction: redactSecretLikeText(model.workerPickupEvidence.nextAllowedAction),
      jobRefs: sanitizeDisplayList(model.workerPickupEvidence.jobRefs),
      blockedReasons: sanitizeDisplayList(model.workerPickupEvidence.blockedReasons),
      diagnostics: sanitizeDisplayList(model.workerPickupEvidence.diagnostics),
    },
    governanceSnapshot: {
      snapshotId: redactSecretLikeText(model.governanceSnapshot?.snapshotId),
      handoffId: redactSecretLikeText(model.governanceSnapshot?.handoffId),
      correlationKey: redactSecretLikeText(model.governanceSnapshot?.correlationKey),
      readinessStatus: redactSecretLikeText(model.governanceSnapshot?.readinessStatus),
      executionBlocked: model.governanceSnapshot?.executionBlocked === true,
      createdAt: redactSecretLikeText(model.governanceSnapshot?.createdAt),
      reviewSummaryStatus: redactSecretLikeText(model.governanceSnapshot?.reviewSummary?.reviewSummaryStatus),
      diagnostics: sanitizeDisplayList(model.governanceSnapshot?.diagnostics),
    },
    governanceTimeline: (Array.isArray(model.governanceTimeline) ? model.governanceTimeline : [])
      .map((snapshot) => ({
        snapshotId: redactSecretLikeText(snapshot.snapshotId),
        createdAt: redactSecretLikeText(snapshot.createdAt),
        reviewSummaryStatus: redactSecretLikeText(snapshot.reviewSummaryStatus),
        reviewCount: Number.isFinite(snapshot.reviewCount) ? snapshot.reviewCount : 0,
        readinessStatus: redactSecretLikeText(snapshot.readinessStatus),
        diagnostics: sanitizeDisplayList(snapshot.diagnostics),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.snapshotId.localeCompare(a.snapshotId)),
    governanceAuthorization: {
      authorizationId: redactSecretLikeText(authorization?.authorizationId),
      handoffId: redactSecretLikeText(authorization?.handoffId),
      correlationKey: redactSecretLikeText(authorization?.correlationKey),
      authorizationStatus,
      authorizationReason,
      intentOnly: true,
      executionBlocked: true,
      createdAt: redactSecretLikeText(authorization?.createdAt),
      diagnostics: authorizationDiagnostics,
    },
    governanceDecisionPackage: {
      packageId: governanceDecisionPackagePackageId,
      recommendedAction: governanceDecisionPackageRecommendedAction,
      executionBlocked: true,
      reviewStatus: governanceDecisionPackageReviewStatus,
      authorizationStatus: governanceDecisionPackageAuthorizationStatus,
      snapshotCount: governanceDecisionPackageSnapshotCount,
      diagnostics: governanceDecisionPackageDiagnostics,
    },
    executionReadinessGate: {
      gateId: redactSecretLikeText(executionReadinessGate?.gateId),
      gateStatus: redactSecretLikeText(executionReadinessGate?.gateStatus) || "execution_disabled",
      executionAllowed: false,
      executionBlocked: true,
      blockingReasons: sanitizeDisplayList(executionReadinessGate?.blockingReasons),
      requiredConditions: executionReadinessGateRequiredConditions,
      diagnostics: sanitizeDisplayList(executionReadinessGate?.diagnostics),
    },
    executionPreconditionsLedger: {
      ledgerId: redactSecretLikeText(executionPreconditionsLedger?.ledgerId),
      overallStatus: (redactSecretLikeText(executionPreconditionsLedger?.overallStatus) ||
        "incomplete") as "incomplete" | "satisfied_but_execution_disabled" | "blocked",
      executionAllowed: false,
      executionBlocked: true,
      missingRequirements: executionPreconditionsLedgerMissingRequirements,
      blockedRequirements: executionPreconditionsLedgerBlockedRequirements,
      requirements: executionPreconditionsLedgerRequirements,
      diagnostics: sanitizeDisplayList(executionPreconditionsLedger?.diagnostics),
    },
    executionRemediationPlan: {
      planId: redactSecretLikeText(executionRemediationPlan?.planId),
      overallStatus: (redactSecretLikeText(executionRemediationPlan?.overallStatus) ||
        "ready_but_execution_disabled") as "blocked" | "missing_requirements" | "ready_but_execution_disabled",
      summary:
        redactSecretLikeText(executionRemediationPlan?.summary) ||
        "All evidence conditions satisfied; execution remains intentionally disabled.",
      executionAllowed: false,
      executionBlocked: true,
      intentOnly: true,
      actions: executionRemediationActions,
      diagnostics: sanitizeDisplayList(executionRemediationPlan?.diagnostics),
    },
    dryRunJobPlan: {
      planId: redactSecretLikeText(dryRunJobPlan?.planId),
      handoffId: redactSecretLikeText(dryRunJobPlan?.handoffId),
      executionAllowed: false,
      executionBlocked: true,
      intentOnly: true,
      jobCount: Number.isFinite(dryRunJobPlan?.jobCount) ? Number(dryRunJobPlan?.jobCount) : dryRunJobs.length,
      jobs: dryRunJobs,
      summary: redactSecretLikeText(dryRunJobPlan?.summary) || "No deterministic jobs could be generated.",
      diagnostics: sanitizeDisplayList(dryRunJobPlan?.diagnostics),
      createdAt: redactSecretLikeText(dryRunJobPlan?.createdAt),
    },
    operatorReviews: [...model.operatorReviews]
      .map((review) => ({
        reviewId: redactSecretLikeText(review.reviewId),
        reviewerRef: redactSecretLikeText(review.reviewerRef),
        reviewStatus: redactSecretLikeText(review.reviewStatus),
        reviewReason: redactSecretLikeText(review.reviewReason),
        createdAt: redactSecretLikeText(review.createdAt),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.reviewId.localeCompare(b.reviewId)),
    operatorReviewSummary: {
      reviewSummaryStatus: redactSecretLikeText(model.operatorReviewSummary.reviewSummaryStatus),
      reviewCount: Number.isFinite(model.operatorReviewSummary.reviewCount) ? model.operatorReviewSummary.reviewCount : 0,
      latestReviewer: redactSecretLikeText(model.operatorReviewSummary.latestReviewer),
      latestCreatedAt: redactSecretLikeText(model.operatorReviewSummary.latestCreatedAt),
      latestReason: redactSecretLikeText(model.operatorReviewSummary.latestReason),
      intentOnly: model.operatorReviewSummary.intentOnly === true,
      executionBlocked: model.operatorReviewSummary.executionBlocked === true,
    },
    operatorReviewIntentOnly: model.operatorReviewIntentOnly === true,
    hasMutationControls: false,
  };
}
