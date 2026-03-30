# Supabase Architecture Enforcement Report

## 1. Source architecture rules enforced

Authoritative policy source:

- `apps/platform/gnr8-supabase-architecture.md`

Developer/AI guidance linkage added:

- root `ai-rules.md` now explicitly references the Supabase architecture contract and its enforcement scope.

## 2. Approved helper categories

Implemented helper categories and explicit exports:

- Read-only page-safe helper:
  - `apps/platform/src/auth/supabase-server-read-only.ts`
  - export: `getSupabaseServerClientReadOnly()`
- Mutating helper (Server Actions / Route Handlers):
  - `apps/platform/src/auth/supabase-server-mutating.ts`
  - export: `getSupabaseServerClientMutating()`
- Service-role/stateless helper:
  - `apps/platform/src/supabase/service-role-server.ts`
  - export: `getSupabaseServiceRoleClient()`

Compatibility barrel retained without ambiguous generic export:

- `apps/platform/src/auth/supabase-server.ts` now re-exports only explicit helpers.

## 3. Lint restrictions added

Updated ESLint config:

- `apps/platform/.eslintrc.json`

Added overrides:

1. `app/**/page.tsx`, `app/**/layout.tsx`
- forbid `pg` imports
- forbid `@/src/superadmin/db`
- forbid mutating helper import (`@/src/auth/supabase-server-mutating`)
- forbid `pool.connect()` and `new Pool(...)`

2. `gnr8/**/*read-model*.{ts,tsx}`
- forbid `pg` imports
- forbid `@/src/superadmin/db`
- forbid page/mutating auth helper usage in read models
- forbid `pool.connect()` and `new Pool(...)`

3. `app/**/_components/**/*.{ts,tsx,js,jsx,mjs,cjs}`
- forbid server Supabase/auth/db helper imports and raw `pg`

## 4. Forbidden patterns now blocked

Now lint-blocked in scoped layers:

- raw `pg` usage in page/layout render paths
- pooled DB helper import in page/layout render paths
- mutating Supabase helper import in page/layout render paths
- `pool.connect()` / `new Pool(...)` in page/layout and read-model paths
- server Supabase/db helpers imported into app `_components` UI layer

## 5. Remaining unenforced risks

- ESLint client-component enforcement is path-based (`app/**/_components/**`) and does not parse `'use client'` directives globally.
- Existing raw `pg` usage outside guarded paths remains by design in this enforcement phase.
- Mutating-helper usage is constrained by import rules in key paths, but Route Handler vs Server Action provenance is still convention-based.

## 6. Validation results

Validation commands executed from `apps/platform`:

- `pnpm exec eslint .`
- `pnpm exec tsc --noEmit`
- `pnpm exec next build`

All passed after enforcement changes.

## 7. Next-step recommendation

Add a custom ESLint rule (or lightweight codemod check) that detects `'use client'` files directly and blocks all `@/src/auth/*`, `@/src/supabase/*`, and pooled DB imports regardless of folder naming.

