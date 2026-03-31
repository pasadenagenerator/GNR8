# Auth Flow Integration Review

Date: 2026-03-31  
Scope: GNR8 platform auth integration hardening (consistency/determinism/isolation)

## 1. Auth Flows Mapped

Canonical model source in code: `src/auth/auth-flow-model.ts`.

- Login flow:
  - Entry: `/login`
  - Auth: `supabase.auth.signInWithPassword(...)` (browser client)
  - Resolution: `/api/auth/post-login-home` -> `resolvePostLoginHomeForPage(...)`
  - Target: role-determined dashboard or fail-closed
- Invite flow:
  - Entry: Supabase invite email (`redirectTo` explicitly `/auth/callback`)
  - Callback: `/auth/callback` accepts invite/onboarding callback types only
  - Resolution: `/api/auth/callback/next` -> `resolvePostLoginHomeForPage(...)`
  - Target: owner onboarding (`/gnr8/onboarding/owner-setup`) or role dashboard
- Owner onboarding flow:
  - Entry: `/gnr8/onboarding/owner-setup`
  - Completion: `/gnr8/onboarding/owner-setup/complete` (password/profile + membership flag)
  - Target: `/gnr8/agency?agency=<id>`
- Password recovery flow:
  - Entry: reset email from `/login` with explicit `redirectTo=<origin>/reset-password`
  - Recovery page: `/reset-password` accepts recovery tokens/types only
  - Completion target: `/login`
- Root/public routing:
  - Entry: `/`
  - Public links: `/login`, `/signup`
  - No auth-type rerouting at root
- Multi-role flow:
  - Priority: `superadmin > agency > client`
  - Implemented in `resolvePostLoginHomeForPage(...)`
  - Fail-closed target: `/signup?access=missing`

## 2. Redirect Paths Per Flow

- Login -> role home:
  - superadmin -> `/gnr8/command-center`
  - agency -> `/gnr8/agency` (or scoped `?agency=<id>`)
  - client -> `/gnr8/client` (or scoped `?client=<id>`)
  - no resolved access -> `/signup?access=missing`
- Invite -> callback -> resolver:
  - `/auth/callback` (invite/signup only) -> `/api/auth/callback/next` -> onboarding/dashboard
- Recovery:
  - `/login` sends reset email with `redirectTo=<origin>/reset-password`
  - `/auth/callback?type=recovery...` immediately forwards to `/reset-password` with tokens/query preserved
  - `/reset-password` -> `/login` after successful password update
- Root:
  - `/` stays public (login/signup links only)

## 3. Role Resolution Logic

- Single resolver: `src/auth/resolve-post-login-home.ts`
- Deterministic order:
  1. superadmin check
  2. agency memberships (+ owner onboarding gate)
  3. client memberships
  4. no access -> `/signup?access=missing`
- Multi-role precedence documented in `src/auth/auth-flow-model.ts` and enforced by resolver order.

## 4. Known Edge Cases Handled

- Invalid `next` path normalization:
  - rejects non-internal and callback self-target paths
- Multiple agency memberships:
  - deterministic onboarding + selection handling
- Multiple client memberships:
  - deterministic client selection handling
- Callback flow isolation:
  - `/auth/callback` rejects non-invite/non-onboarding callback types
  - routes `type=recovery` to `/reset-password`
- Reset flow isolation:
  - `/reset-password` rejects non-recovery types
  - rejects missing recovery credentials
  - handles invalid/expired/missing session with explicit error state
- No-access auth resolution:
  - fail-closed to `/signup?access=missing`

## 5. Issues Found And Fixed

1. Duplicate post-login route handler logic existed in:
   - `/api/auth/post-login-home`
   - `/api/auth/callback/next`
   - Fix: centralized both via shared helper `src/auth/post-login-home-route.ts`.
2. Root route mixed recovery behavior into public entry:
   - `/` previously forwarded `type=recovery` to `/reset-password`
   - Fix: removed reroute so root is public-only login/signup entry.
3. `/auth/callback` accepted mixed callback types:
   - could process non-invite callback types
   - Fix: now restricts to invite/onboarding callback types and recovery forwarding only.
4. `/reset-password` was not strict about flow isolation:
   - could proceed without strict recovery type gating
   - Fix: now enforces recovery-only callback type/token handling.
5. Canonical auth flow model was spread across files:
   - Fix: introduced `src/auth/auth-flow-model.ts` with canonical map and constants.
6. Minimal auth instrumentation missing in resolver routes:
   - Fix: added `console.info`/`console.warn` in centralized post-login route helper.

## 6. Remaining Risks

- Supabase dashboard allowlist verification (redirect URLs) was not validated directly from Supabase project settings in this pass.
  - Required allowlist entries: `/auth/callback` and `/reset-password` hosts used by runtime origins.
- Manual browser flow testing for all scenarios (invite, expired recovery, direct protected navigation, multi-role live accounts) still needed in a real environment with valid auth links/users.

## 7. Recommended Improvements

- Add integration tests for auth callback/recovery routing branches (invite/signup/recovery/invalid type).
- Add a smoke test that verifies centralized resolver outputs for representative membership permutations.
- Add an environment startup check that logs/warns when expected app origin variables are missing for invite/recovery redirect generation.
