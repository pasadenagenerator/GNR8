# Password Recovery Reset Flow Report

## 1. Root Cause Summary
- `/login` sends password recovery email links using `supabase.auth.resetPasswordForEmail(email, { redirectTo: /reset-password })`.
- Supabase can complete recovery callbacks with different credential variants, including PKCE `code`.
- A previous change removed PKCE `code` handling from `/reset-password` and performed early credential rejection before attempting code exchange.
- Result: valid recovery links that arrived as code-based callbacks were rejected with "Recovery link is missing required credentials."

## 2. Why PKCE Must Be Supported
- For this app, recovery links are generated through Supabase and can resolve to code-based callback URLs.
- Treating code links as invalid breaks a valid Supabase recovery mechanism.
- Correct behavior is to attempt `exchangeCodeForSession(code)` in browser/client context and then validate whether a session exists.

## 3. Why The Previous Removal Was Incorrect
- The prior removal assumed code recovery should not be used for password reset.
- That assumption conflicted with actual callback URLs produced by the configured Supabase recovery flow.
- The real issue was execution context/order, not the existence of PKCE itself:
  - code exchange must run in the client page where browser storage is available.
  - final acceptance must be based on successful session establishment, not parameter-shape checks alone.

## 4. Current `/reset-password` Behavior
- Route remains dedicated: `/reset-password` only.
- Callback type handling:
  - unknown `type` values are rejected.
  - known non-recovery callback types are rejected to keep invite/onboarding flows separate.
  - missing `type` is allowed if session establishment succeeds from a valid recovery credential path.
- Recovery credential variants now supported:
  - `code` -> `supabase.auth.exchangeCodeForSession(code)`
  - `token_hash` + `type=recovery` -> `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`
  - `access_token` + `refresh_token` -> `supabase.auth.setSession(...)`
- Validation now prioritizes actual auth result:
  - after attempts, `/reset-password` calls `getSession()`
  - if session exists, recovery is accepted
  - if no session exists, strict errors are shown (expired/invalid/missing context)
- On success, callback parameters are removed from URL with `history.replaceState`.

## 5. Execution Context (Client vs Server)
- PKCE code exchange is executed in `apps/platform/app/reset-password/page.tsx` (a `'use client'` page).
- No PKCE exchange is performed in a server-only render path for password recovery.
- This keeps recovery completion in the browser-safe context where Supabase client auth state/storage is available.

## 6. UX/Failure Semantics
- While auth context is being resolved, the page stays in a loading/checking state.
- Reset form is shown only after a valid session is established.
- Password update success redirects to `/login`.
- Expired/malformed/wrong-type/missing-context links still fail with clear error messaging.

## 7. Verification Scope
- Reviewed:
  - `apps/platform/app/login/page.tsx` recovery email trigger
  - `apps/platform/src/supabase/browser.ts` browser client creation
  - `apps/platform/app/reset-password/page.tsx` callback handling
- Confirmed PKCE recovery support is restored on `/reset-password` while preserving strict invalid-link handling.
