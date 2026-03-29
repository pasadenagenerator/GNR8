# Command Center UX Improvements Report

## 1) What Was Improved
- Added client-side sortable columns for `total_cost`, `margin`, and `margin_percentage`.
- Set default sort to `total_cost` descending to surface expensive sites first.
- Added operational status badges per row:
  - Cost signal badge: `FULL_SIGNAL` / `PARTIAL_SIGNAL` (with fallback badge for other statuses).
  - Profitability badge: `PROFITABLE` / `LOSS`.
  - Assignment badge: `ASSIGNED` / `UNASSIGNED`.
- Added row emphasis for high-priority scanning:
  - Loss-making rows in red-tinted background.
  - High-cost rows in warning-tinted background.
  - Unassigned rows in highlighted yellow-tinted background.
- Added quick filters (checkboxes):
  - Show only unassigned.
  - Show only high cost.
  - Show only loss-making.
- Added bulk selection and bulk assignment:
  - Per-row checkbox.
  - Header checkbox for select-all-visible.
  - Bulk action bar with client dropdown + apply for selected sites.
- Improved plan simulation readability:
  - Best plan line visually highlighted.
  - Non-best plans muted.
- Added compact table mode (enabled by default) to reduce row padding and increase visible density.
- Added explicit empty/filter-empty states:
  - `No sites found.`
  - `No results for filter.`

## 2) Why It Matters
- Sorting and row emphasis reduce time-to-detection for expensive/loss-making sites.
- Badges convert raw table values into quick operational statuses.
- Quick filters reduce cognitive load during migration triage.
- Bulk assignment removes repetitive per-row assignment work and supports 100–200 site operations.
- Compact mode increases rows-per-viewport for faster scanning.

## 3) Before vs After Behavior
- Before: static row order and mostly raw numeric scanning.
- After: operator can pivot order instantly by cost/margin severity.
- Before: assignment was one-row-at-a-time.
- After: multi-row selection + single bulk assign action flow.
- Before: plan rows had limited hierarchy.
- After: best plan is visually obvious while alternatives stay available.
- Before: no explicit filter-empty messaging.
- After: clear empty/fallback state copy.

## 4) Limitations
- Bulk assignment currently uses repeated calls to existing single-site assignment endpoint, so partial success is possible and reported.
- No pagination added in this pass (scope kept intentionally minimal).
- Existing server-side filter form (`client`, `profitability`) remains and is complemented by new client-side quick filters.

## 5) Next UX Steps
- Add optional server-driven pagination for >250 row operator sessions while preserving current lightweight interaction model.
- Add saved filter presets (for common operations like "loss + unassigned").
- Add richer bulk result summary (per-site failures with reasons) while still using existing API contract.
