# Best Rendered Run Selection (Same Import Attempt) Fix Report

## Observed Live Failure Pattern

Production/railway evidence showed two near-simultaneous runs for the same import attempt:

- Run A produced usable rendered truth (DOM + viewport/fullpage screenshots + successful execution path).
- Run B completed later with `DOM_EMPTY_AFTER_RENDER` and no usable rendered artifacts.
- UI/read-model still reflected raw fallback (`sourceMode=raw_html_fallback`, failed rendered status, zero DOM/screenshot surface).

This indicated latest-run recency was overriding rendered usefulness.

## Exact Root Cause in Code

1. `apps/platform/gnr8/site/site-workspace-read-model.ts` selected runtime row primarily by recency (`updated_at`, `created_at`) and only used rendered capture rank as a tie-break.
2. Same-wave identity was not explicitly used for arbitration.
3. `apps/platform/gnr8/site/scoped-import-pipeline.ts` persisted `executionIdentity.requestId` as `null`, reducing ability to group logically-related runs for same-attempt arbitration.

## Arbitration Rule Implemented

Implemented deterministic same-import arbitration in `site-workspace-read-model`:

- Derive wave key in priority order:
  - `executionIdentity.requestId`
  - `executionIdentity.snapshotRunId` base (suffix-trimmed)
  - `executionIdentity.snapshotId`
  - fallback ownership-site key (with bounded recency window)
- Rank runs by rendered usefulness (not timestamp-first):
  - rendered DOM + screenshots
  - rendered DOM only
  - rendered screenshots only
  - partial rendered with usable evidence
  - failed rendered run
  - raw fallback/no usable rendered
- Apply deterministic tie-breaks:
  - fidelity score
  - recency
  - stable id lexical order

## Why This Rule Is Truthful

- It does not re-label failures as success.
- It keeps failure codes/diagnostics intact.
- It only prefers a run when persisted rendered evidence is objectively more usable.
- Raw fallback is selected only when no usable rendered run exists in arbitration scope.

## What Changed in Selection Order

Before:
- latest timestamp won, even if latest run failed and older run had usable rendered artifacts.

After:
- within same import wave, best usable rendered run wins deterministically.
- later failed run cannot supersede earlier usable rendered run.
- latest-run supersession is diagnosed explicitly when it occurs.

## Diagnostics Added

Arbitration/read-model alignment now emits deterministic codes:

- `RENDERED_RUN_ARBITRATION_STARTED`
- `RENDERED_RUN_EVALUATED`
- `RENDERED_RUN_SELECTED_AS_PRIMARY`
- `LATEST_RUN_SUPERSEDED_BY_BETTER_RENDERED_RUN`
- `FAILED_RUN_REJECTED_IN_FAVOR_OF_USABLE_RENDER`
- `NO_USABLE_RENDERED_RUN_FOUND`
- `RAW_FALLBACK_SELECTED_NO_USABLE_RENDER`
- `PRIMARY_RENDERED_RUN_ALIGNED_TO_READMODEL`
- `PRIMARY_RENDERED_RUN_ALIGNED_TO_PREVIEW`

## Additional Data-Model Wiring

- Added `requestId` to `UrlSinglePageImportSnapshot` and persisted it through snapshot creation.
- Updated scoped pipeline provenance writing to persist `executionIdentity.requestId` from snapshot.

## Remaining Risks / Edge Cases

- Legacy rows without execution identity rely on fallback grouping (ownership-site + bounded recency window); this is deterministic but less semantically precise than explicit request ids.
- If upstream producers omit request identity in future paths, grouping quality degrades to fallback behavior.
- Some broader integration tests in this local environment remain blocked by existing local `react` module resolution in certain `tsx --test` paths.
