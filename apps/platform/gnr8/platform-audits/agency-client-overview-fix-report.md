# Agency Client Overview Fix Report

## 1. Root Cause (Why clients were not visible)

The agency dashboard `Client Overview` was powered by `client_overview` derived from site summaries (`command_center` read model), not from canonical client organizations.  
As a result, newly created clients with zero assigned sites were absent from the table even though creation succeeded.

## 2. Read Model Fix

Updated `apps/platform/gnr8/agency/agency-dashboard-read-model.ts` to include a canonical client directory query:

- Source table: `organizations`
- Filters:
  - `organization_type = 'client'`
  - `agency_id = <resolved current agency>`
- Ordering:
  - `created_at DESC`
- Selected fields:
  - `id`
  - `name`
  - `slug`
  - `created_at`

Added `client_directory` to `AgencyDashboardReadModel` and preserved existing `client_overview` aggregation for site/economics contexts where still needed.

## 3. UI Changes

Updated `apps/platform/app/gnr8/agency/page.tsx`:

- Replaced the `Client Overview` table data source from `readModel.client_overview` to `readModel.client_directory`.
- Implemented required columns:
  - `Name`
  - `Slug`
  - `Client ID` (monospace)
  - `Created At`
  - `Actions`
- Kept `Add Client` action intact.
- Added/kept per-client actions with agency context query param:
  - `Client Dashboard`
  - `Client Settings`
  - `Client Team`
- Empty state now displays: `No clients yet.`

## 4. Scoping Guarantees

- Dashboard page requires resolved current agency context; when not resolvable, UI blocks and does not attempt broad queries.
- Client directory query is explicitly constrained to the resolved `agency_id` plus `organization_type='client'`.
- This prevents cross-agency leakage by construction.
- Existing site summary scoping guard (`assertAgencyScopedSiteSummaries`) remains in place.

## 5. Limitations

- Manual browser flow validation (create client -> return to dashboard -> click actions) was not executed in this CLI run.
- Existing `tsx` test invocation failed in this environment due to runner/tooling process spawn issues (`ENOEXEC` in `esbuild`), not type errors in changed code.
- Build-level type check succeeded (`pnpm exec tsc --noEmit`).
