# Password Recovery Reset Flow Report

## 1. Previous Broken Behavior
- Recovery links did not have a dedicated completion journey.
- The `/reset-password` page redirected to `/admin` after password update instead of returning users to login.
- Root public recovery forwarding only preserved `type=recovery`, which could drop query callback fields (for example `code`/`token_hash`) when present.
- Login did not provide an explicit password recovery email trigger with `redirectTo` pointing at a dedicated reset path.
- Recovery links containing OAuth-style `code` were incorrectly handled in-browser via `exchangeCodeForSession(code)`, which can fail in email recovery completion when PKCE verifier state is unavailable in browser storage (`PKCE code verifier not found in storage`).

## 2. New Recovery Flow
- Login now supports a minimal recovery action via `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- Recovery `redirectTo` is explicitly set to `${window.location.origin}/reset-password`.
- Recovery callback completion now resolves on `/reset-password` where link verification and password update happen.

## 3. Reset-Password Route Behavior
- Route: `app/reset-password/page.tsx` (client flow, recovery-specific).
- Supported callback/session patterns:
  - Token session flow via `access_token` + `refresh_token` + `setSession` (priority path).
  - Token hash flow via `token_hash` + `type=recovery` + `verifyOtp` (strict fallback path).
  - `code` is intentionally ignored for recovery on `/reset-password` to avoid PKCE verifier dependency.
- `type` is validated when present:
  - Unknown types are rejected.
  - Non-recovery known types (for example invite/signup) are rejected to preserve flow separation.
- Explicit Supabase error fields from query/hash are surfaced to users.
- Final acceptance is based on established auth context (`getSession`), not solely query param presence.
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
- Add focused integration tests for recovery callback variants (session tokens and `token_hash`) and invalid-link error rendering to prevent regressions in future auth changes.

## 8. PKCE Removal Rationale
- `exchangeCodeForSession(code)` depends on a matching PKCE code verifier in browser storage for code exchange completion.
- Email-driven password recovery links are not guaranteed to preserve that verifier state in the target browser context, which causes runtime failure (`PKCE code verifier not found in storage`).
- `setSession({ access_token, refresh_token })` and `verifyOtp({ type: 'recovery', token_hash })` are Supabase-supported recovery mechanisms that do not rely on PKCE local verifier storage.
- Enforcing recovery-only `type` validation and requiring one of those two auth contexts keeps invalid/expired links strict while making valid email recovery links reliable.
