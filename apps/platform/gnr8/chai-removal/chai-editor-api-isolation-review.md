# ChaiBuilder Editor/API Isolation Review

Date: 2026-03-25
Scope: `apps/platform` and related workspace packages (`packages/chai-renderer`)

## 1. Executive Summary

- ChaiBuilder is runtime-decoupled for public serving: **YES**. Public entry routes now resolve via artifact-only runtime renderer (`src/public-site/public-runtime-render.tsx`) with explicit regression tests ensuring no builder fallback.
- Remaining builder usage editor-only: **MOSTLY YES, with one shared-risk utility and external-usage unknowns**.
- Package removal readiness now: **READY_AFTER_ONE_CLEANUP** (cleanup/verification pass needed first).
- Single biggest blocker: **unknown external consumers of `/api/builder/orgs/*/pages*` plus shared builder-domain assumptions (CORS/cookie sharing) that indicate active external builder frontend coupling may still exist**.

## 2. Remaining Builder API Route Inventory

| File path | Route shape | Purpose | Classification |
|---|---|---|---|
| `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts` | `GET/POST /api/builder/orgs/:orgId/pages` | List and upsert builder pages in `public.builder_pages`; internal-key + membership gated | EDITOR_ONLY |
| `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts` | `GET /api/builder/orgs/:orgId/pages/:slug` | Read single builder page from `public.builder_pages`; internal-key + membership gated | EDITOR_ONLY |

Notes:
- No additional `/app/api/builder/**` route files were found.
- Both routes require `x-gnr8-internal-key` matching `BUILDER_INTERNAL_API_KEY` and `x-actor-user-id` membership.

## 3. Internal Call-Site Inventory

### Route consumer search result
- No in-repo `fetch`/client/server callers to `/api/builder/*` were found in `apps/platform/app`, `apps/platform/src`, or `apps/platform/gnr8`.
- No in-repo reuse/import of helper patterns from these route files was found.

### Implication
| Target | Internal callers found | Editor-only status |
|---|---|---|
| `/api/builder/orgs/:orgId/pages` | None in repo | UNKNOWN_REVIEW_REQUIRED (likely external editor frontend) |
| `/api/builder/orgs/:orgId/pages/:slug` | None in repo | UNKNOWN_REVIEW_REQUIRED (likely external editor frontend) |

## 4. DB / Storage Coupling Inventory

| File path | Storage/table/helper | Coupling role |
|---|---|---|
| `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts` | `public.builder_pages` (select/insert/upsert), `public.memberships` | EDITOR_ONLY |
| `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts` | `public.builder_pages` (select), `public.memberships` | EDITOR_ONLY |
| `apps/platform/src/public-site/public-pages.ts` | `public.builder_pages` reader (`getPublicPageByOrgAndSlug`) | AMBIGUOUS (shared utility, currently unreferenced) |
| `apps/platform/gnr8/core/page-storage.ts` | `public.gnr8_pages`, `public.gnr8_page_versions` | Runtime/editor platform storage, not builder-pages |

Key finding:
- `public.builder_pages` access is now limited to builder API routes and one unreferenced helper (`src/public-site/public-pages.ts`).

## 5. Editor-Only Boundary Assessment

### Cluster A: Builder API routes
- Status: **partially isolated**.
- Why: Namespaced under `/api/builder/*` and internally keyed, but still publicly routable API endpoints with no in-repo callers, indicating probable external/editor client dependence.

### Cluster B: Public runtime serving
- Status: **already isolated from builder fallback**.
- Evidence: Public route handlers (`app/route.ts`, `app/(public)/[[...slug]]/route.ts`) call `renderPublicPathResponse` from artifact-only runtime; runtime tests assert no `builder_pages` fallback markers.

### Cluster C: Shared platform middleware/auth cookie setup
- Status: **partially isolated**.
- Why: middleware CORS allowlist still includes `https://builder.pasadenagenerator.com`; auth/browser cookie domain logic and comments still explicitly target sharing across `app.*` and `builder.*` subdomains.

## 6. Shared / Contaminated Module Assessment

| Path | Contamination type | Risk |
|---|---|---|
| `apps/platform/src/public-site/public-pages.ts` | Shared-location helper still tied to `public.builder_pages` despite runtime decoupling | MEDIUM |
| `apps/platform/middleware.ts` | Global API CORS allowlist includes `builder.pasadenagenerator.com`, implying external builder client expectation | MEDIUM |
| `apps/platform/src/supabase/browser.ts` | Shared cookie-domain behavior/comment references `builder.*` subdomain sharing | LOW |
| `apps/platform/src/auth/require-actor-user-id.ts` | Server auth cookie-domain behavior/comment references `app.*` and `builder.*` sharing | LOW |
| `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts` | Legacy builder-fallback mode/marker strings in internal smoke CLI (not serving path) | LOW |

## 7. External Usage / Unknowns

Marked as **UNKNOWN_REVIEW_REQUIRED**:
- Who currently calls `/api/builder/orgs/:orgId/pages*` in production/staging (external builder UI, scripts, integrations) is not discoverable from this repo scan.
- `middleware.ts` CORS allowlist explicitly permits `builder.pasadenagenerator.com`, suggesting real cross-origin clients may still exist.
- Internal API-key model (`BUILDER_INTERNAL_API_KEY`) implies non-browser or controlled frontend usage, but concrete caller inventory is absent in-repo.

## 8. Package Removal Readiness Assessment

### `@chaibuilder/next`
- Live imports in `apps/platform` runtime/editor code: **none found**.
- Appears only as dependency declarations and in `packages/chai-renderer` implementation.

### `@gnr8/chai-renderer`
- Live imports in `apps/platform`: **none found**.
- Present as workspace dependency declaration; package files exist under `packages/chai-renderer/*`.

### `packages/chai-renderer`
- Isolated enough for later removal: **yes, appears isolated/unreferenced by app code**.

### Verdicts
| Removal scope | Verdict |
|---|---|
| Runtime package removal | READY |
| Editor package removal | UNKNOWN_REVIEW_REQUIRED |
| Full package purge | READY_AFTER_ONE_CLEANUP |

Rationale:
- Package imports appear unused, but editor API external usage is unresolved; perform one verification/boundary pass before destructive removal.

## 9. Safe Isolation Actions

Low-risk actions (not executed in this task):
1. Add explicit `EDITOR_ONLY` boundary comments on both `/api/builder/orgs/*/pages*` routes.
2. Add deprecation/TODO notice in `src/public-site/public-pages.ts` that helper is legacy builder storage and should not be used by public runtime.
3. Move `src/public-site/public-pages.ts` into an editor-namespace path (or add lint guard) to prevent accidental runtime reuse.
4. Add telemetry or structured logging on builder routes to identify active callers before removal.
5. Tighten middleware CORS scope from global `/api/*` matcher to explicit API namespaces that still need cross-origin builder access.
6. Annotate `@chaibuilder/next` and `@gnr8/chai-renderer` manifest entries as pending removal after external usage verification.

## 10. Remaining Blockers

1. Builder API routes still exist and are potentially externally consumed (`/api/builder/orgs/:orgId/pages*`).
2. `src/public-site/public-pages.ts` still directly reads `public.builder_pages` from a shared module namespace.
3. Middleware CORS allowlist still assumes builder-origin clients (`builder.pasadenagenerator.com`).
4. Shared auth/browser cookie-domain behavior still reflects app+builder shared-subdomain model.
5. Package declarations (`apps/platform/package.json`) still include `@chaibuilder/next` and `@gnr8/chai-renderer` pending verified decommission sequencing.

## 11. Recommended Next Removal Task

**Unknown Usage Verification Pass**

Reason:
- The highest-risk unknown is external usage of `/api/builder/*`; validating real caller traffic and dependency ownership should happen before package/deletion phases.

## 12. Appendix: search commands / evidence paths

### Key commands used
```bash
rg --files apps/platform/app/api/builder
rg -n "api/builder/orgs|/api/builder/|builder/orgs/|BUILDER_INTERNAL_API_KEY|NEXT_PUBLIC_DEFAULT_ORG_ID" apps/platform -S --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/tsconfig.tsbuildinfo'
rg -n "builder_pages|public\.builder_pages" apps/platform -S --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/tsconfig.tsbuildinfo'
rg -n "x-gnr8-internal-key|x-actor-user-id|BUILDER_INTERNAL_API_KEY" . -S --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/tsconfig.tsbuildinfo'
rg -n "@gnr8/chai-renderer|@chaibuilder/next/runtime|@chaibuilder/next/types|registerChai|ChaiPageType|registerChaiBlock|registerChaiFont" apps/platform packages -S --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/dist/**'
rg -n "@chaibuilder/next|@gnr8/chai-renderer|chaibuilder|chai-renderer" **/package.json -S
rg -n "builder\.pasadenagenerator|builder|chaibuilder|cors|origin" apps/platform -S --glob '!**/.next/**' --glob '!**/node_modules/**' --glob '!**/*.md'
```

### Evidence file paths reviewed
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/src/public-site/public-runtime-render.test.ts`
- `apps/platform/src/public-site/public-pages.ts`
- `apps/platform/app/route.ts`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/middleware.ts`
- `apps/platform/src/supabase/browser.ts`
- `apps/platform/src/auth/require-actor-user-id.ts`
- `apps/platform/package.json`
- `packages/chai-renderer/package.json`
- `packages/chai-renderer/*`
- `apps/platform/gnr8/chai-removal/chai-dependency-inventory.md`
