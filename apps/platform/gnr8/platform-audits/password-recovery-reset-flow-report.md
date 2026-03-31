# Password Recovery Reset Flow Report

## 1. Previous Broken Behavior
- Recovery links did not have a dedicated completion journey.
- The `/reset-password` page redirected to `/admin` after password update instead of returning users to login.
- Root public recovery forwarding only preserved `type=recovery`, which could drop query callback fields (for example `code`/`token_hash`) when present.
- Login did not provide an explicit password recovery email trigger with `redirectTo` pointing at a dedicated reset path.

## 2. New Recovery Flow
- Login now supports a minimal recovery action via `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- Recovery `redirectTo` is explicitly set to `${window.location.origin}/reset-password`.
- Recovery callback completion now resolves on `/reset-password` where link verification and password update happen.

## 3. Reset-Password Route Behavior
- Route: `app/reset-password/page.tsx` (client flow, recovery-specific).
- Supported callback/session patterns:
  - PKCE query flow via `code` + `exchangeCodeForSession`.
  - Hash token flow via `access_token` + `refresh_token` + `setSession`.
  - Token hash flow via `token_hash` + `type=recovery` + `verifyOtp`.
- Explicit Supabase error fields from query/hash are surfaced to users.
- If no valid session is established after callback handling, a clear invalid/expired recovery error state is shown.
- Sensitive callback parameters are removed from the URL via history replacement after successful verification.

## 4. Success Redirect Behavior
- After successful `supabase.auth.updateUser({ password })`, UI shows a short success message.
- Deterministic redirect is performed to `/login` using `router.replace('/login')` with a short timeout.

## 5. Error Handling
- Invalid, expired, malformed, or missing-auth-context links show explicit recovery error UI on `/reset-password`.
- Flow does not fall through into generic runtime-governed public routing.
- Flow does not silently send users to login without explanation when recovery verification fails.

## 6. Limitations
- Browser-only/manual verification is still needed for a full end-to-end Supabase email click test.
- Current UX is intentionally minimal and does not include advanced password strength UI beyond a minimum length check.

## 7. Next-Step Recommendation
- Add focused integration tests for recovery callback variants (`code`, hash tokens, `token_hash`) and invalid-link error rendering to prevent regressions in future auth changes.
