# Login Rate-Limit Root Cause Fix

## 1. Observed Problem

During superadmin sign-in on `/login`, users still intermittently hit `Request rate limit reached` even after prior submit hardening (single-flight lock, debounce, and no explicit retries).

## 2. Root Cause Found

The post-login resolver chain was performing repeated auth identity fetches (`supabase.auth.getUser()`) across multiple helpers, instead of resolving the authenticated user once and reusing that identity.

This created avoidable auth endpoint pressure around the exact login transition window:
- `/login` `signInWithPassword`
- `/api/auth/post-login-home` resolver
- immediate post-login route/page auth checks

Additionally, the shared browser client used default URL session detection behavior before this fix, which could allow implicit callback-style auth processing outside dedicated callback handling.

## 3. Where Duplicate/Excess Auth Calls Originated

Primary resolver-path duplication sources:
- `src/auth/resolve-post-login-home.ts` pre-fix orchestration called multiple helpers that each independently called `auth.getUser()`.
- `src/auth/reconcile-client-membership-invites.ts` called `auth.getUser()` internally.
- `src/auth/resolve-current-agency.ts` and gate helpers (`owner-setup-gate`, `client-setup-gate`) each performed their own user identity fetch in page-mode helpers.
- `src/auth/resolve-current-client.ts` page resolver also fetched user identity separately.

## 4. What Was Changed

1. Added targeted, request-correlated instrumentation.
- Login page logs submit/sign-in/resolver/redirect phases with `requestId`.
- Browser auth client logs key auth method calls (`signInWithPassword`, `getUser`, `getSession`, etc.) in debug mode.
- Post-login route logs include propagated request id.

2. Enforced explicit one-request login flow policy.
- `/login` now tags each attempt with `x-auth-request-id`.
- Added defensive resolver in-flight guard and duplicate-attempt guard around the post-login resolver fetch.

3. Removed duplicated auth identity lookups in resolver path.
- `resolve-post-login-home` now resolves authenticated user once per request and reuses `{ userId, email }`.
- Added optional `userId`/`email` passthrough inputs to downstream helpers to avoid repeated `auth.getUser()` calls.

4. Isolated callback auto-processing behavior.
- Browser Supabase client now explicitly sets `detectSessionInUrl: false` by default, matching the explicit callback/recovery handling approach already used by auth callback pages.

## 5. Final Request Count Expectation (Normal Login)

Per accepted `/login` submit:
- `signInWithPassword`: **exactly 1**
- `/api/auth/post-login-home`: **exactly 1**
- post-login resolver auth identity fetch (`auth.getUser`): **exactly 1** inside resolver orchestration (not repeated across helper layers)
- redirect: **exactly 1**

## 6. Remaining Risks

- Other pages immediately loaded after redirect may still perform their own auth checks by design; this is expected and separate from login submit duplication.
- Debug logging is intentionally scoped to dev/debug-enabled environments but should still be cleaned up after verification.
- Supabase project-level rate limits can still be hit by unrelated concurrent clients/tabs.

## 7. Recommendation

After manual verification, keep the single-identity resolver pattern and remove temporary high-granularity debug logs, while retaining low-noise correlation logging at route boundaries for future incident diagnosis.
