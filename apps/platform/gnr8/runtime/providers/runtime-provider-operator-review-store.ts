import type {
  RuntimeProviderOperatorReviewArtifact,
  RuntimeProviderOperatorReviewStatus,
} from "@/gnr8/runtime/providers/runtime-provider-operator-review";

export type RuntimeProviderOperatorReviewArtifactRecord = RuntimeProviderOperatorReviewArtifact;

export type RuntimeProviderOperatorReviewArtifactRow = {
  review_id: string;
  handoff_id: string;
  correlation_key: string;
  reviewer_ref: string;
  review_status: RuntimeProviderOperatorReviewStatus;
  review_reason: string;
  created_at: string;
};

export function mapOperatorReviewArtifactToRow(
  artifact: RuntimeProviderOperatorReviewArtifactRecord,
): RuntimeProviderOperatorReviewArtifactRow {
  return {
    review_id: artifact.reviewId,
    handoff_id: artifact.handoffId,
    correlation_key: artifact.correlationKey,
    reviewer_ref: artifact.reviewerRef,
    review_status: artifact.reviewStatus,
    review_reason: artifact.reviewReason,
    created_at: artifact.createdAt,
  };
}

export function mapOperatorReviewArtifactRow(
  row: RuntimeProviderOperatorReviewArtifactRow,
): RuntimeProviderOperatorReviewArtifactRecord {
  return {
    reviewId: row.review_id,
    handoffId: row.handoff_id,
    correlationKey: row.correlation_key,
    reviewerRef: row.reviewer_ref,
    reviewStatus: row.review_status,
    reviewReason: row.review_reason,
    createdAt: row.created_at,
  };
}

export function createOperatorReviewInsertRows(
  artifacts: readonly RuntimeProviderOperatorReviewArtifactRecord[],
): RuntimeProviderOperatorReviewArtifactRow[] {
  return [...artifacts]
    .map(mapOperatorReviewArtifactToRow)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.review_id.localeCompare(b.review_id));
}

