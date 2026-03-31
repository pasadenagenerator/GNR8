# Public Entry + Role Routing + Client Dashboard Report

## 1. Routes Added/Changed
- Added:
  - `apps/platform/app/page.tsx` (`/`)
  - `apps/platform/app/signup/page.tsx` (`/signup`)
  - `apps/platform/app/gnr8/client/page.tsx` (`/gnr8/client`)
  - `apps/platform/app/api/auth/post-login-home/route.ts`
  - `apps/platform/src/auth/resolve-current-client.ts`
  - `apps/platform/src/auth/resolve-post-login-home.ts`
  - `apps/platform/gnr8/client/client-dashboard-read-model.ts`
- Changed:
  - `apps/platform/app/login/page.tsx`
  - `apps/platform/app/api/auth/callback/next/route.ts`
  - `apps/platform/app/(public)/[[...slug]]/route.ts`
- Removed:
  - `apps/platform/app/route.ts` (root runtime route handler)

## 2. Root Landing Behavior
- `/` now renders an intentional public entry page with:
  - `GNR8`
  - `WEB AGENCY OS`
  - `Login` -> `/login`
  - `Signup` -> `/signup`
- Root no longer depends on `app/route.ts` runtime artifact rendering.
- Supabase recovery query handling for root entry was preserved by redirecting `/?type=recovery` to `/reset-password?type=recovery`.

## 3. Signup Behavior
- Added minimal `/signup` page aligned with invite-based access.
- No self-serve account creation flow was introduced.
- Messaging explicitly states access is invite-based and provides request/support guidance.

## 4. Post-Login Routing Model
- Introduced canonical resolver: `src/auth/resolve-post-login-home.ts`.
- Resolver priority is deterministic and fail-closed:
  1. Superadmin -> `/gnr8/command-center`
  2. Agency member -> `/gnr8/agency` (or `?agency=<id>` when single membership)
  3. Client member -> `/gnr8/client` (or `?client=<id>` when single membership)
  4. No resolvable access -> `/signup?access=missing`
- Owner onboarding remains enforced for agency owners with incomplete setup (`/gnr8/onboarding/owner-setup`).
- Both login completion paths now use canonical resolver:
  - `/api/auth/callback/next`
  - `/api/auth/post-login-home` (used by `/login` UI flow)

## 5. Client User Resolution Model
- Added `src/auth/resolve-current-client.ts`.
- Resolution is membership-based and organization-type aware:
  - Reads `memberships` (supports `organization_id` and legacy `org_id`)
  - Resolves membership organizations
  - Accepts only `organization_type='client'`
  - Resolves parent `agency_id` from organization and agency name from `agencies`
- Multi-client memberships are fail-closed unless an active client is selected.
- Invalid/ambiguous membership context throws typed errors and blocks access.

## 6. Client Dashboard Scope
- Added `/gnr8/client` as initial client-facing dashboard foundation.
- Access scope is derived from authenticated client membership resolution (`user -> client -> agency`).
- Dashboard surface includes:
  - Client name
  - Parent agency name
  - Client site list (`sites` scoped by `org_id=client_id` and `agency_id`)
  - Basic status info (`site_status`, pipeline status, runtime state)
  - Safe links only when available (`Open Live`, `Open Preview`)
- No agency-global data is exposed from this route.

## 7. Limitations
- Client dashboard V1 is read-only and intentionally minimal.
- Client resolution currently recognizes membership roles `owner|admin|member`; if schema introduces distinct client-only role values, resolver extension may be required.
- If a user has both agency and client memberships, resolver precedence currently favors agency home over client home (after superadmin check) for deterministic behavior.
- Runtime public artifact root handling still exists for host-routed runtime entry via `/(public)/[[...slug]]`, but product app root `/` is now explicitly handled by app entry page.

## 8. Next-Step Recommendation
- Recommended next step: **B. Client Access / Membership Model Hardening**
  - Standardize client membership role taxonomy.
  - Add explicit client membership lifecycle/admin flows.
  - Add focused tests for mixed-role users and membership ambiguity edge-cases.
