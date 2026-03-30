# Agency RBAC Hardening Report

## 1. RBAC model
- Tenant boundary: `user -> memberships -> organizations -> agencies -> sites`.
- Agency Dashboard scope is resolved from authenticated user membership, not query params or impersonation controls.
- Authorization now has two layers:
  - Application guardrail: `resolveCurrentUserAgency()` fails closed.
  - Database guardrail: RLS policies on core tenant tables.

## 2. Membership schema
- Table: `public.memberships` (created or hardened additively).
- Required fields:
  - `id`
  - `user_id` (`auth.users.id`)
  - `organization_id` (`public.organizations.id`)
  - `role` (`public.membership_role_enum`)
  - `created_at`
- Backward compatibility:
  - Preserved `org_id` and synced it with `organization_id` via trigger for legacy repository compatibility.
  - Added additive indexes and uniqueness on `(organization_id, user_id)`.

## 3. Role definitions
- `owner`: full control within agency scope.
- `admin`: operational access within agency scope.
- `member`: baseline/read-limited access within agency scope.
- Current dashboard behavior is read-oriented; role is resolved and surfaced, with stricter action gating deferred.

## 4. RLS strategy
- Enabled RLS on:
  - `public.memberships`
  - `public.organizations`
  - `public.sites`
- Minimal policies:
  - Membership rows visible only to `auth.uid() = memberships.user_id`.
  - Organizations visible only if the user has membership in that organization.
  - Sites visible only if site `agency_id` matches agency derived from user memberships through organizations.

## 5. How access is enforced
- `apps/platform/src/auth/resolve-current-agency.ts` resolves `{ user_id, agency_id, role }`.
- Agency dashboard (`/gnr8/agency`) no longer accepts manual agency scope selection.
- Read model is always called with resolved `agency_id`.
- Query pattern remains agency-scoped (`where sites.agency_id = <resolved agency id>`), and RLS provides DB-level defense-in-depth.
- No fallback to global data paths when membership resolution fails.

## 6. Limitations
- V1 intentionally fails on ambiguous multi-membership users (no active-org selector yet).
- Role-specific UI/action matrix is intentionally minimal in this phase.
- Command center still uses service-role superadmin path by design (separate operator surface).

## 7. Next steps
- Add explicit “active agency” selection flow for multi-membership users with deterministic session binding.
- Expand role-based action guards for non-read operations (imports/approvals/publish endpoints).
- Add integration tests for RLS behavior (cross-agency deny, membership removal deny, positive-path allow).
