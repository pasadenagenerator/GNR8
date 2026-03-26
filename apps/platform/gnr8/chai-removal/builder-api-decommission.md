# Builder API Decommission (Phase B)

## 1. Executive Summary

Phase B decommissioned the remaining legacy builder API surface in `apps/platform` by replacing `/api/builder/*` handlers with deterministic retirement responses and removing active `public.builder_pages` query paths from application code. Builder-origin CORS allowlist behavior was removed from middleware, and shared cookie-domain logic was moved to a neutral auth utility so auth/cookie behavior remains intact without `builder-only` coupling.

## 2. Routes Decommissioned / Deleted

Decommissioned route handlers (kept as explicit stubs):

- `app/api/builder/orgs/[orgId]/pages/route.ts`
  - `GET` now returns `410 Gone`
  - `POST` now returns `410 Gone`
- `app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
  - `GET` now returns `410 Gone`

Deterministic payload:

```json
{
  "error": "BUILDER_API_DECOMMISSIONED",
  "message": "This builder API has been retired."
}
```

No legacy builder DB mutation/read logic remains active in these handlers.

## 3. Builder Storage Access Removed / Retained

Removed active builder-page storage behavior:

- `gnr8/builder-only/public-pages.ts`
  - Removed `public.builder_pages` query usage.
  - `getPublicPageByOrgAndSlug(...)` now throws explicit `BUILDER_PAGE_STORAGE_DECOMMISSIONED`.

Additional builder API helper neutralization:

- `gnr8/builder-only/builder-api-helpers.ts`
  - Removed active pool/auth/membership DB path behavior.
  - Exported helpers now fail explicitly with `BUILDER_API_DECOMMISSIONED`.

Retained intentionally:

- DB schema/table (`public.builder_pages`) unchanged in this phase.
- Builder-only files remain as explicit non-operational shells for safe transition/auditability.

## 4. CORS / Origin Changes

- Removed builder-origin CORS allow behavior from `middleware.ts`.
- `OPTIONS /api/*` still responds `204`, but no builder-origin CORS headers are injected.
- Deleted `gnr8/builder-only/builder-origin.ts` after decoupling all imports.

Cookie-domain behavior was preserved by moving shared-domain logic into:

- `src/auth/shared-cookie-domain.ts`

and updating:

- `src/auth/require-actor-user-id.ts`
- `src/supabase/browser.ts`

## 5. Auth / Cookie Coupling Left Intact

Intentionally left intact:

- `requireActorUserId` auth flow
- Supabase browser/server cookie plumbing
- `.pasadenagenerator.com` shared cookie-domain behavior

Only builder-specific module coupling was removed; auth semantics were not broadly refactored.

## 6. Validation Results

Import/reference checks:

- Ran:
  - `rg -n "@gnr8/builder-only/builder-api-helpers|@gnr8/builder-only/public-pages|@gnr8/builder-only/builder-origin|public\.builder_pages|/api/builder/" apps/platform --glob '!**/*.md' --glob '!**/.next/**' --glob '!**/tsconfig.tsbuildinfo'`
- Result:
  - No non-doc active references matched.

Typecheck:

- `cd apps/platform && pnpm exec tsc --noEmit`
- Result: pass.

Targeted runtime/public tests:

- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test src/public-site/public-runtime-render.test.ts`
- Result: pass (6/6).

- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/runtime-artifact-response.integration.test.ts`
- Result: skipped due to missing `DATABASE_URL` (explicit test guard), no failures.

Migration-factory tests:

- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory.test.ts`
- Result: pass (17/17).

Additional runtime integration check:

- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/runtime-happy-path.integration.test.ts`
- Result: fails only because `DATABASE_URL` is not set in this environment (test precondition), not due to compile/runtime code errors.

Build:

- `cd apps/platform && pnpm exec next build`
- Result: pass.

Note: `next build` temporarily modified `tsconfig.json`/`tsconfig.tsbuildinfo`; those side effects were reverted to keep task scope clean.

## 7. Remaining Builder Residues

Still present intentionally for later phases:

- Builder API route shells remain (now hard-decommissioned with `410`).
- Builder-only helper shells (`builder-api-helpers.ts`, `public-pages.ts`) remain but are explicitly non-operational.
- Builder table/schema not dropped in this phase.
- Broader editor/builder package/workspace deletion deferred.

## 8. Recommended Next Step

Proceed to **Phase C: Editor Strategy Decision**.

If Phase C confirms no external consumers require a compatibility window, the next cleanup can safely hard-delete retired builder route/helper shells and proceed with schema/package retirement planning.
