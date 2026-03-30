# Agency Owner Invite Acceptance Fix Report

## 1. Root Cause

- Agency owner invite emails were sent without an explicit `redirectTo`, so Supabase used the project/site redirect default (`https://app.pasadenagenerator.com`).
- That root landing is served by the public runtime resolver for the host and can return governance fail-closed `403` responses.
- Auth callback handling at root only inspected query params; hash-based auth errors (`#error=...`) from Supabase were never handled server-side.
- Root callback logic also treated invite callback-like query traffic as password reset flow (`/reset-password`), which is not a dedicated invite completion path.

## 2. Previous Invite Flow

1. Superadmin calls `createAgency`.
2. Service sends invite via `supabase.auth.admin.inviteUserByEmail(ownerEmail, { data })` without `redirectTo`.
3. Owner clicks email link and is redirected to root (`/`) on app domain.
4. Root/public runtime path resolves through runtime governance context and may return deterministic governance `403`.
5. Invite acceptance/session completion does not have a dedicated callback page or clear invite error surface.

## 3. New Callback Flow

1. `createAgency` now calls `inviteUserByEmail` with `redirectTo` set to `/auth/callback` on the app origin.
2. New route/page: `app/auth/callback/page.tsx` handles invite/auth completion in browser:
   - `exchangeCodeForSession` for PKCE query `code`
   - `setSession` for hash tokens (`access_token`, `refresh_token`)
   - `verifyOtp` for query `token_hash` + `type`
   - explicit query/hash auth errors rendered as user-facing auth error message
3. On success, callback validates session and redirects to `/admin` (or safe `next` path when supplied).

## 4. Governance Handling

- Runtime governance behavior remains strict and unchanged globally.
- The fix avoids routing invite acceptance through public runtime-governed root path by using dedicated app route `/auth/callback`.
- The dedicated callback route is handled by Next app routing and is not served by the runtime artifact public resolver path that emits governance `403`.
- No unrelated public paths were opened.

## 5. Validation

- Static code validation completed for invite redirect wiring:
  - `inviteUserByEmail` now receives explicit `redirectTo` callback URL.
- Dedicated callback route exists and handles:
  - query callback (`code`)
  - hash token callback (`access_token`, `refresh_token`)
  - query OTP callback (`token_hash`, `type`)
  - explicit auth errors with non-403 user-facing message.
- Root auth auto-redirect behavior narrowed to password recovery (`type=recovery`) only.
- Unit tests updated for callback redirect URL builder.
- Remaining live validation step (manual): click fresh invite email link end-to-end in deployed env and confirm session and redirect behavior.

## 6. Remaining Risks

- If environment app origin vars are not set, invite redirect falls back to `https://app.pasadenagenerator.com/auth/callback`; non-production environments may require setting `NEXT_PUBLIC_APP_URL` (or equivalent configured variable) to avoid mismatched host.
- Truly expired/invalid invite links will still fail (expected), but now show auth callback error state rather than runtime governance `403`.
- Final confirmation still depends on real Supabase email link round-trip in target environment.
