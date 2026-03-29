# Bulk Migration Reliability Report

## 1. Bulk Reliability Goals

This hardening pass improves existing Migration Command Center bulk actions (import, approve, publish) for high-volume operator use without introducing queue infrastructure or background orchestration. The goals were:

- Structured and transparent per-item outcomes
- Safe handling of partial failures
- Explicit idempotent/no-op semantics for retry safety
- Retry ergonomics for retryable failed/skipped subsets
- Preservation of existing row-level manual actions

## 2. Result Model

A canonical bulk result model was added in:

- `apps/platform/gnr8/command-center/bulk-action-types.ts`

The model is now the source-of-truth response shape for bulk UX:

- `action_type`
- `total_requested`
- `total_attempted`
- `total_succeeded`
- `total_failed`
- `total_skipped`
- `item_results[]`

Each item result includes:

- `site_id`
- `domain`
- `attempted`
- `outcome` (`succeeded | failed | skipped`)
- `reason_code`
- `reason_message`
- `retryable`

## 3. Retry Behavior

Centralized bulk execution was implemented in:

- `apps/platform/gnr8/command-center/bulk-migration-actions.ts`

Behavioral guarantees:

- One-item failure does not fail the entire run
- All selected items produce a structured item result
- Retryable failures are explicitly marked
- UI supports targeted retry for:
  - retryable failed items
  - retryable skipped items
  - operator-selected subset of retryable items

## 4. Idempotency Handling

Idempotent/no-op cases are surfaced as structured skips, not opaque failures. Examples:

- `ALREADY_LIVE` for publish/import attempts on already-live sites
- `ALREADY_APPROVED` for approve/import attempts on already-approved sites
- `INVALID_SITE_STATE` for state-ineligible transitions

Additional conservative handling:

- `MISSING_PREVIEW` when version linkage required for approve/publish is unavailable
- `GOVERNANCE_DENIED` for publish enforcement denials
- `IMPORT_SOURCE_MISSING` for invalid/missing import source URL
- `REQUEST_FAILED` for request-level/transient failures
- `UNKNOWN_ERROR` fallback for uncategorized exceptions

## 5. Operator Feedback Improvements

`CommandCenterOpsTable` now shows:

- clear summary counts (e.g. succeeded/failed/skipped + attempted/requested)
- per-item failed/skipped list with reason code/message
- retryability indicator per item
- direct retry controls:
  - Retry failed
  - Retry skipped
  - Retry selected

This keeps operator feedback actionable with minimal UI overhead.

## 6. Limitations

- Bulk execution remains foreground click-driven and sequential by design (no background worker)
- Retryability classification is best-effort and conservative based on current API error contracts
- Item targeting is constrained to the current command-center read-model slice

## 7. Next-Step Recommendation

Add lightweight API-level structured error contracts for migration endpoints so reason-code mapping can rely less on message parsing and more on explicit machine-readable failure categories.
