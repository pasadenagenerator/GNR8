# Migration Portfolio Metrics Report

## 1. Metrics list
- `total_sites`
- `live_sites`
- `approved_sites`
- `preview_ready_sites`
- `imported_sites`
- `not_started_sites`
- `error_sites`
- `needs_attention_sites`
- `progress_percentage`
- `success_rate` (V1 optional, included)
- `status_distribution` (`NOT_STARTED`, `IMPORTED`, `PREVIEW_READY`, `APPROVED`, `LIVE`, `ERROR`)

## 2. Formulas used
All metrics are computed in-memory from already loaded Command Center rows (`rows`) in the page render path.

- `total_sites = rows.length`
- `live_sites = count(status === LIVE)`
- `approved_sites = count(status === APPROVED)`
- `preview_ready_sites = count(status === PREVIEW_READY)`
- `imported_sites = count(status === IMPORTED)`
- `not_started_sites = count(status === NOT_STARTED)`
- `error_sites = count(status === ERROR)`
- `needs_attention_sites = error_sites + not_started_sites + preview_ready_sites`
- `progress_percentage = total_sites === 0 ? 0 : round((live_sites / total_sites) * 100)`
- `success_rate = started_sites === 0 ? 0 : round((live_sites / started_sites) * 100)` where `started_sites = total_sites - not_started_sites`

## 3. UI placement
- Portfolio metrics bar is rendered in `apps/platform/app/gnr8/command-center/page.tsx`.
- Placement is above the main operations table, inside the existing Command Center summary section.
- Status distribution is rendered as a minimal badge row (no chart library).

## 4. Why metrics matter
- Converts Command Center from row-first visibility to portfolio-level operational visibility.
- Gives immediate signals for execution health (`LIVE`, `ERROR`, `NEEDS ATTENTION`).
- Supports fast founder/operator decisions without scanning all rows.

## 5. Limitations
- Metrics are scoped to the currently rendered page/filter (`COMMAND_CENTER_SITE_LIMIT`, client/profitability filters).
- Metrics are snapshot-based per render; no historical trendline.
- `success_rate` excludes `NOT_STARTED` rows by definition.
- Recent bulk-action summary is still session-local in table state and not surfaced in the page-level summary for V1.

## 6. Next improvements
- Add explicit “scope note” in the metrics bar when a filter/cap is active.
- Promote last bulk action summary to shared client state so it can appear in the portfolio header.
- Add lightweight deltas since last refresh (still derived, no additional DB queries).
