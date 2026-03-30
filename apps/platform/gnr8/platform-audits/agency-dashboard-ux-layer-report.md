# Agency Dashboard UX Layer Report

## 1. Route/path chosen
- Implemented at `/gnr8/agency` via `apps/platform/app/gnr8/agency/page.tsx`.
- This follows existing `gnr8` route grouping (`/gnr8/command-center`) and keeps internal superadmin surfaces untouched.

## 2. Agency scoping model
- Scope is fail-closed and explicit in V1:
  - Superadmin-only page access (`requireSuperadminUserIdForPage`).
  - Mandatory agency scope selector in the page (`agencyId` query param).
  - No selected agency => no portfolio data loaded.
- Data scope enforcement is done in the read path by filtering `sites.agency_id = selectedAgencyId`.

## 3. Data sources reused
- Reused and extended Command Center read model (`getCommandCenterReadModel`) with a new `agencyId` filter.
- Reused migration state resolution already embedded in Command Center summaries.
- Reused economics logic:
  - `mapSiteMargin` from margin service.
  - `compareSiteAcrossPlansFromSummary` from pricing simulation service.
- Reused Supabase service-role stateless read path; no per-row DB calls introduced.

## 4. Summary metrics shown
- `total_sites`
- `live_sites`
- `needs_attention_sites`
- `progress_percentage`
- `total_estimated_cost`
- `total_simulated_revenue`
- `total_margin`

## 5. Action set exposed
- Conservative V1 actions in site table:
  - `View Site` (live URL when available)
  - `Open Preview` (runtime preview endpoint when available)
- No direct approve/publish/assignment mutation actions exposed in this first agency UX layer.

## 6. What is intentionally hidden vs Command Center
- Hidden internal operator-heavy controls:
  - Bulk migration actions and retry orchestration
  - Bulk/client assignment controls
  - Internal debugging density and low-level operational fields
  - Platform-global cross-agency context
- Reduced table and metric complexity to agency business-facing essentials.

## 7. Limitations
- Authorization/scoping is temporary internal mode: superadmin-selected agency scope, not final agency-user RBAC.
- Agency lookup list depends on service-role access to `agencies`; if unavailable, selector cannot be populated.
- Approve/publish/client assignment actions are intentionally deferred to keep V1 safe and conservative.

## 8. Next step recommendation
- Harden this scope model into first-class agency roles/permissions and replace superadmin impersonation mode with direct agency member authorization.
