# Multi-Agency Support Expansion Report

Date: 2026-03-30
Scope: Multi-agency foundation hardening (auth resolution, tenancy scoping, onboarding path, RLS, and tests)

## 1. Single-Agency Assumptions Found

- `resolveCurrentUserAgency()` previously required exactly one valid agency membership and failed as ambiguous otherwise.
- `/gnr8/agency` had no active-agency selector path, so multi-membership users could not enter an explicit agency context.
- Command Center client directory fetch was unscoped by `agency_id` even when site reads were agency-filtered.
- Site-to-client mapping in the Command Center read model trusted `org_id -> client` lookup without an explicit same-agency guard.
- Ownership backfill logic (`ownership-backfill-activation`) still includes home-agency/singleton-client assumptions for historical migration safety (left unchanged for this task, documented as a limitation).
- There was no single documented or scripted agency provisioning path that atomically bootstrapped agency/org/billing/cost-center/membership.

## 2. New Multi-Agency Resolution Model

Implemented in `src/auth/resolve-current-agency.ts`:

- Case A: exactly one valid agency membership -> auto-resolve.
- Case B: zero valid agency memberships -> fail closed (`NO_MEMBERSHIP`).
- Case C: multiple valid agency memberships -> explicit active agency required (`ACTIVE_AGENCY_REQUIRED`), no silent selection.
- Invalid selected agency -> fail closed (`ACTIVE_AGENCY_INVALID`).

Membership normalization behavior:

- Membership rows are normalized from `organization_id` or legacy `org_id`.
- Only memberships resolving to `organizations.organization_type = 'agency'` with a valid `agency_id` are accepted.
- Duplicates are deduplicated per agency with highest role retained (`owner > admin > member`).

## 3. Active Agency Strategy

V1 strategy: explicit query-parameter-based active agency selection (`?agency=<agency_uuid>`) validated on each request.

- Resolver accepts `activeAgencyId` and validates it against current user memberships.
- `/gnr8/agency` now:
  - shows select-agency prompt when active context is required,
  - renders selectable agency chips for valid memberships,
  - keeps selected agency context across filters,
  - provides a minimal in-page agency switch control when user has multiple memberships.

This is intentionally minimal and fail-closed.

## 4. Onboarding / Provisioning Path

Added a safe provisioning foundation:

- Service: `gnr8/agency/agency-provisioning-service.ts`
- CLI: `gnr8/agency/agency-provisioning.cli.ts`

Provisioning transaction creates and wires:

- agency row,
- agency organization (`organization_type='agency'`),
- bootstrap membership (`owner/admin/member`) for supplied user,
- billing account (`agency_pays`, `active`),
- agency cost center,
- optional default client org + client cost center.

Safety:

- strict UUID/slug validation,
- slug uniqueness check,
- transaction rollback on failure,
- dry-run mode (`--dry-run`).

## 5. RLS Implications

Added migration: `supabase/migrations/20260330_multi_agency_rls_scope.sql`

- `memberships`: user can read own membership rows.
- `organizations`: user can read direct membership org rows OR any org in agencies where they have an agency-org membership.
- `sites`: user can read sites only when they have an agency-org membership in matching `agency_id`.

Result: reduces cross-agency leakage risk for users with client-only membership while preserving agency-scoped visibility for agency members.

## 6. Validation Results

Code and tests:

- Added tests for active-agency selection and fail-closed behavior:
  - `src/auth/resolve-current-agency.test.ts`
- Added tests for agency scope non-leakage guard in dashboard read path:
  - `gnr8/agency/agency-dashboard-read-model.test.ts`

Executed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test src/auth/resolve-current-agency.test.ts gnr8/agency/agency-dashboard-read-model.test.ts` -> pass (7/7)
- `pnpm exec tsc --noEmit` -> pass
- `pnpm exec next build` -> pass

Additional hardening in read paths:

- Command Center client directory now honors optional `agencyId` filter.
- Site summary client mapping now enforces client-agency match.
- Agency dashboard read model now asserts all returned site summaries match selected agency and fails closed on mismatch.

## 7. Remaining Limitations

- Active agency context is query-param based (not yet session/profile persisted).
- No dedicated API route/server action for durable active-agency selection yet.
- Ownership backfill utilities still contain home-agency/singleton-client assumptions for legacy migration workflows.
- This task intentionally does not add marketplace, white-label, Stripe lifecycle expansion, or full enterprise write-RBAC matrix.

## 8. Next-Step Recommendation

C. Agency Dashboard Role/Permission Refinement

Reason: multi-agency tenancy and selection are now explicit and fail-closed; the highest leverage next step is tightening role-based action controls and write-path authorization inside each agency boundary.
