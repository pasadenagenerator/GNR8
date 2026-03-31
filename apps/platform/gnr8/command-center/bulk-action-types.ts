export type BulkMigrationActionType = "import" | "approve" | "publish";

export type BulkActionOutcome = "succeeded" | "failed" | "skipped";

export type BulkActionReasonCode =
  | "SUCCEEDED"
  | "ALREADY_LIVE"
  | "ALREADY_APPROVED"
  | "MISSING_PREVIEW"
  | "GOVERNANCE_DENIED"
  | "REQUEST_FAILED"
  | "INVALID_SITE_STATE"
  | "IMPORT_SOURCE_MISSING"
  | "ROLE_FORBIDDEN"
  | "UNKNOWN_ERROR";

export type BulkActionItemResult = {
  site_id: string;
  domain: string | null;
  attempted: boolean;
  outcome: BulkActionOutcome;
  reason_code: BulkActionReasonCode;
  reason_message: string;
  retryable: boolean;
};

export type BulkActionResult = {
  action_type: BulkMigrationActionType;
  total_requested: number;
  total_attempted: number;
  total_succeeded: number;
  total_failed: number;
  total_skipped: number;
  item_results: BulkActionItemResult[];
};

export function summarizeBulkActionResult(input: {
  actionType: BulkMigrationActionType;
  totalRequested: number;
  itemResults: BulkActionItemResult[];
}): BulkActionResult {
  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const item of input.itemResults) {
    if (item.attempted) totalAttempted += 1;
    if (item.outcome === "succeeded") totalSucceeded += 1;
    if (item.outcome === "failed") totalFailed += 1;
    if (item.outcome === "skipped") totalSkipped += 1;
  }

  return {
    action_type: input.actionType,
    total_requested: input.totalRequested,
    total_attempted: totalAttempted,
    total_succeeded: totalSucceeded,
    total_failed: totalFailed,
    total_skipped: totalSkipped,
    item_results: input.itemResults,
  };
}
