# Ownership Backfill Activation Report

- Generated at: 2026-03-26T00:00:00.000Z
- Mode: dry-run (execution blocked)
- Execution status: blocked (`DATABASE_URL is required`)

## Totals

- Runtime site versions scanned: N/A (database unavailable)
- Runtime site versions bound (before): N/A (database unavailable)
- Runtime site versions bound (after): N/A (database unavailable)
- Ownership site bindings applied: 0
- Runtime sites scanned: N/A (database unavailable)
- Site rows created: 0
- Migration jobs backfilled: 0
- Unresolved records: N/A (database unavailable)

## Assumptions Used

- Home agency defaults to `agencies.is_home_agency = true`, else canonical UUID `00000000-0000-4000-8000-000000000001`.
- Client org ownership is only auto-assigned when exactly one client org exists for home agency.
- Production candidate requires domain signal + production lineage signal.
- Ambiguous production ownership is downgraded to `draft` + `agency` billing and flagged unresolved.
- `migration_jobs` updates are schema-aware and only apply when inferable columns exist.

## Migration Jobs Backfill

- migration_jobs table present: unknown (database unavailable)
- columns observed: n/a
- agency_id backfilled: 0
- site_id backfilled: 0
- migration_owner_type defaulted to agency: 0
- migration_owner_type promoted to client: 0

## Manual Follow-Up Candidates

- Unable to enumerate without database access.

## Unresolved Records

- Unable to enumerate without database access.
