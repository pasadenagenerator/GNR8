# Agency Owner Onboarding Flow Report

## 1. Onboarding Flow Description
- New invite flow now resolves into a gated owner onboarding sequence:
  - invite email link -> `/auth/callback`
  - callback establishes Supabase session in browser
  - callback calls server resolver endpoint (`/api/auth/callback/next`) to determine safe post-auth target
  - if any owner membership is not setup-complete, redirect to `/gnr8/onboarding/owner-setup` (scoped agency query included when known)
  - owner completes setup (password + optional full name)
  - setup completion redirects to `/gnr8/agency?agency=<agency_id>`
- `/gnr8/agency` also enforces the same gate for owners to prevent URL bypass.

## 2. Data Model (Flag Location)
- V1 onboarding state is stored on `public.memberships`:
  - column: `owner_setup_completed boolean not null default false`
- Migration added:
  - `supabase/migrations/20260331_owner_setup_completed_membership_flag.sql`
- Schema snapshot updated:
  - `supabase/schema/ownership-foundation.schema.sql`

## 3. Redirect Logic
- `/auth/callback` no longer directly redirects to `next`.
- It now requests server-side target resolution from `/api/auth/callback/next`.
- Resolver behavior:
  - normalizes unsafe/invalid `next` values to `/gnr8/agency`
  - checks current user owner memberships and `owner_setup_completed`
  - routes incomplete owners to `/gnr8/onboarding/owner-setup`
  - routes completed owners (or non-owners) to normalized `next` target
- `/gnr8/agency` behavior:
  - resolves current agency via authenticated membership
  - if selected role is `owner` and setup is incomplete, redirects to onboarding route

## 4. Security Checks
- All onboarding state reads are session-bound and membership-derived.
- Owner setup page requires:
  - valid auth session
  - resolvable agency membership context
  - owner role for that agency
- Owner setup completion endpoint enforces:
  - valid session
  - membership resolution via server-side auth context
  - owner-only access for completion
  - fail-closed responses on invalid/ambiguous membership
- Password mutation is server-side only:
  - `supabase.auth.updateUser({ password, data? })` in route handler
  - no direct client-side password update call

## 5. Limitations
- Full-name persistence is written to Supabase Auth user metadata (`full_name`) for V1.
- No dedicated `profiles` table mutation is included because a profile write model is not currently established in this scope.
- Multi-agency users are still expected to select agency context when required by existing resolver behavior.

## 6. Next Steps
- Add dedicated integration tests for:
  - callback resolver target selection
  - owner setup completion route
  - `/gnr8/agency` onboarding bypass prevention
- Add optional “active agency selector” continuity on onboarding route for multi-agency owners.
