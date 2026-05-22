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
