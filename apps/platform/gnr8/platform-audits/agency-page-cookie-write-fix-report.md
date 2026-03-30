# Agency Page Cookie Write Fix Report

## 1. Root Cause
`/gnr8/agency` is a Server Component page, but its render auth path used `resolveCurrentUserAgency()` and `listCurrentUserAgencyMemberships()`, which called `getSupabaseServerClient()`.

`getSupabaseServerClient()` configured Supabase SSR cookies with a mutating `setAll(...)` that writes via `cookies().set(...)`. During Server Component render in production, this caused the runtime error:

`Cookies can only be modified in a Server Action or Route Handler`.

## 2. Previous Render Auth Path
1. `apps/platform/app/gnr8/agency/page.tsx`
2. `resolveCurrentUserAgency(...)` / `listCurrentUserAgencyMemberships(...)`
3. `getSupabaseServerClient()`
4. Supabase auth path may invoke cookie refresh/write via `setAll(...)`
5. Next.js Server Component render crashes on cookie mutation

## 3. New Read-Only Page Auth Path
1. `apps/platform/app/gnr8/agency/page.tsx`
2. `resolveCurrentUserAgencyForPage(...)` / `listCurrentUserAgencyMembershipsForPage(...)`
3. `getSupabaseServerClientReadOnly()`
4. `getAll()` reads cookies; `setAll()` is an intentional no-op during render
5. Auth + membership + agency resolution still executes, but render path is cookie-write safe

## 4. Why This Is Safe
- Authorization remains fail-closed:
  - unauthenticated user => `UNAUTHORIZED` => redirect to `/login`
  - zero memberships => `NO_MEMBERSHIP`
  - multi-membership without selected agency => `ACTIVE_AGENCY_REQUIRED`
  - invalid selected agency => `ACTIVE_AGENCY_INVALID`
- Membership/RBAC agency resolution logic is unchanged (`selectCurrentAgencyMembership` and membership lookup pipeline unchanged).
- No superadmin impersonation logic was introduced.
- Change scope is minimal and constrained to page-auth client wiring.

## 5. Validation
Commands executed in `apps/platform`:

1. `pnpm exec next build` => PASS
2. `pnpm exec tsc --noEmit` => PASS

Note: an initial `pnpm exec tsc --noEmit` run failed before build due stale/missing `.next/types/*` includes; after `next build` regenerated Next type artifacts, `tsc --noEmit` passed.

## 6. Remaining Risks
- Read-only page auth intentionally does not persist refreshed tokens during Server Component render. If session refresh persistence is needed, it must occur in middleware, a route handler, or a server action (write-safe contexts).
- Any future server-render path that reuses mutating auth helpers can regress into the same class of crash; page render code should continue to use read-only helpers.
