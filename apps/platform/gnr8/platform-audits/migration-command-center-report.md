# Migration Command Center Report

## 1. Migration states

Frontend migration states implemented for Command Center:

- `NOT_STARTED`
- `IMPORTED`
- `PREVIEW_READY`
- `APPROVED`
- `LIVE`
- `ERROR`

State derivation:

- Primary source: latest runtime site version for each ownership site (`gnr8_runtime_site_versions`, resolved in one batched query).
- Runtime mapping:
  - `DRAFT` -> `IMPORTED`
  - `READY_FOR_REVIEW` -> `PREVIEW_READY`
  - `APPROVED` -> `APPROVED`
  - `PUBLISHED` -> `LIVE`
  - `ARCHIVED` -> `LIVE` (if any published history exists), otherwise `IMPORTED`
  - Unknown runtime state -> `ERROR`
- Fallbacks:
  - No runtime row + error-like site status (`error` / `fail`) -> `ERROR`
  - No runtime row + migration events present -> `IMPORTED`
  - Otherwise -> `NOT_STARTED`

## 2. UI flow

Command Center now acts as a migration pipeline surface:

- Table shows per-site migration status badge and contextual next actions.
- Top summary shows migration progress bar: `LIVE / total`.
- Filters include:
  - `Show NOT_STARTED`
  - `Show READY_FOR_APPROVAL`
  - `Show LIVE`
  - `Show ERROR`
  - `Needs Attention` (ERROR, NOT_STARTED, PREVIEW_READY)
- Existing ownership/cost/profitability controls remain available.

## 3. Action mapping

Row action mapping:

- `NOT_STARTED` -> `Import`
- `IMPORTED` -> `Generate Preview`
- `PREVIEW_READY` -> `Open Preview` + `Approve`
- `APPROVED` -> `Publish`
- `LIVE` -> `View Live`
- `ERROR` -> `Retry Import`

Bulk action mapping:

- `Import` applies to selected rows in `NOT_STARTED` / `ERROR`
- `Approve` applies to selected rows in `PREVIEW_READY`
- `Publish` applies to selected rows in `APPROVED`

Endpoint wiring (reused, no heavy orchestration added):

- Import: `POST /api/gnr8/runtime/migrate/url`
- Generate Preview: `POST /api/gnr8/runtime/versions/{siteVersionId}/ready`
- Approve: `POST /api/gnr8/runtime/versions/{siteVersionId}/approve`
- Publish: `POST /api/gnr8/runtime/versions/{siteVersionId}/publish`
- Open Preview: `GET /api/gnr8/runtime/versions/{siteVersionId}/preview`

## 4. Sample workflow

Example operator path:

1. Filter `Needs Attention` to focus queue.
2. For `NOT_STARTED` sites, click `Import`.
3. Once `IMPORTED`, click `Generate Preview`.
4. In `PREVIEW_READY`, open preview and then click `Approve`.
5. In `APPROVED`, click `Publish`.
6. Site transitions to `LIVE`; use `View Live` for verification.

Bulk variant:

1. Select multiple rows.
2. Run bulk `Import`, then bulk `Approve`, then bulk `Publish` as statuses advance.

## 5. Limitations

- Import action depends on domain availability/valid URL.
- UI status is derived from existing runtime/site signals and may not represent all historical migration failure modes.
- Bulk migration actions run sequentially per selected row (no background queue system).
- `READY_FOR_APPROVAL` filter maps to runtime `PREVIEW_READY` UI state.

## 6. Next steps

- Add optional status timestamp metadata (imported/approved/published at) using existing version/audit data.
- Add lightweight per-action duration metrics in the table for operator throughput visibility.
- Add optional CSV export for filtered migration views.
