import type { RuntimeProviderGovernanceSnapshot } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot";

export type RuntimeProviderGovernanceSnapshotRecord = RuntimeProviderGovernanceSnapshot;

export type RuntimeProviderGovernanceSnapshotRow = {
  snapshot_id: string;
  handoff_id: string;
  correlation_key: string;
  readiness_status: RuntimeProviderGovernanceSnapshot["readinessStatus"];
  execution_blocked: boolean;
  review_summary_status: RuntimeProviderGovernanceSnapshot["reviewSummary"]["reviewSummaryStatus"] | null;
  review_count: number | null;
  snapshot_payload: RuntimeProviderGovernanceSnapshot;
  diagnostics: string[];
  created_at: string;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function normalizeGovernanceSnapshotPayload(snapshot: RuntimeProviderGovernanceSnapshot): RuntimeProviderGovernanceSnapshot {
  const reviewSummary = snapshot.reviewSummary;
  const workerPickupEvidence = snapshot.workerPickupEvidence;
  return {
    ...snapshot,
    diagnostics: uniqueSorted(snapshot.diagnostics),
    workerPickupEvidence: {
      ...workerPickupEvidence,
      jobRefs: uniqueSorted(workerPickupEvidence.jobRefs),
      blockedReasons: uniqueSorted(workerPickupEvidence.blockedReasons),
      diagnostics: uniqueSorted(workerPickupEvidence.diagnostics),
    },
    reviewSummary: {
      ...reviewSummary,
      reviewCount: Number.isFinite(reviewSummary.reviewCount) ? reviewSummary.reviewCount : 0,
    },
  };
}

export function mapGovernanceSnapshotToRow(
  snapshot: RuntimeProviderGovernanceSnapshotRecord,
): RuntimeProviderGovernanceSnapshotRow {
  const normalized = normalizeGovernanceSnapshotPayload(snapshot);
  return {
    snapshot_id: normalized.snapshotId,
    handoff_id: normalized.handoffId,
    correlation_key: normalized.correlationKey,
    readiness_status: normalized.readinessStatus,
    execution_blocked: normalized.executionBlocked === true,
    review_summary_status: normalized.reviewSummary.reviewSummaryStatus || null,
    review_count: Number.isFinite(normalized.reviewSummary.reviewCount) ? normalized.reviewSummary.reviewCount : null,
    snapshot_payload: normalized,
    diagnostics: uniqueSorted(normalized.diagnostics),
    created_at: normalized.createdAt,
  };
}

export function mapGovernanceSnapshotRow(
  row: RuntimeProviderGovernanceSnapshotRow,
): RuntimeProviderGovernanceSnapshotRecord {
  const payload = normalizeGovernanceSnapshotPayload(row.snapshot_payload);
  return {
    ...payload,
    snapshotId: sanitizeToken(row.snapshot_id) || payload.snapshotId,
    handoffId: sanitizeToken(row.handoff_id) || payload.handoffId,
    correlationKey: sanitizeToken(row.correlation_key) || payload.correlationKey,
    readinessStatus: row.readiness_status ?? payload.readinessStatus,
    executionBlocked: true,
    diagnostics: uniqueSorted(Array.isArray(row.diagnostics) ? row.diagnostics : payload.diagnostics),
    createdAt: sanitizeToken(row.created_at) || payload.createdAt,
    reviewSummary: {
      ...payload.reviewSummary,
      reviewSummaryStatus: row.review_summary_status ?? payload.reviewSummary.reviewSummaryStatus,
      reviewCount: Number.isFinite(row.review_count) ? Number(row.review_count) : payload.reviewSummary.reviewCount,
    },
  };
}

export function createGovernanceSnapshotInsertRows(
  snapshots: readonly RuntimeProviderGovernanceSnapshotRecord[],
): RuntimeProviderGovernanceSnapshotRow[] {
  return [...snapshots]
    .map(mapGovernanceSnapshotToRow)
    .sort((a, b) => a.correlation_key.localeCompare(b.correlation_key) || a.snapshot_id.localeCompare(b.snapshot_id));
}
