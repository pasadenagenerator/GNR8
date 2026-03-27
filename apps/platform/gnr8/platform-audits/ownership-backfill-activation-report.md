# Ownership Backfill Activation Report

- Generated at: 2026-03-27T11:43:50.673Z
- Mode: apply

## Totals

- Runtime site versions scanned: 9
- Runtime site versions bound (before): 0
- Runtime site versions bound (after): 9
- Ownership site bindings applied: 9
- Runtime sites scanned: 1
- Site rows created: 1
- Migration jobs backfilled: 0
- Unresolved records: 0

## Assumptions Used

- Home agency defaults to agencies.is_home_agency=true, else canonical UUID 00000000-0000-4000-8000-000000000001.
- Client org ownership is only auto-assigned when exactly one client organization exists for the home agency.
- Production candidate requires both domain evidence and production lineage signal (published/production artifact/production binding).
- Ambiguous production ownership is downgraded to draft + agency billing and marked unresolved.
- migration_jobs backfill only updates inferable rows based on existing schema columns (site_version_id/runtime_site_id/site_id).

## Migration Jobs Backfill

- migration_jobs table present: no
- columns observed: n/a
- agency_id backfilled: 0
- site_id backfilled: 0
- migration_owner_type defaulted to agency: 0
- migration_owner_type promoted to client: 0

## Manual Follow-Up Candidates

- none

## Unresolved Records

- none
