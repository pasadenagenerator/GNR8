# Chai Unknown Usage Verification

## 1. Executive Summary

- Are remaining builder APIs internally used? **NO (in-repo callers not found)**
- Is external usage likely? **UNCERTAIN (signals exist, but no caller inventory in repo)**
- Are builder-related shared remnants still active? **YES (CORS builder origin + shared cookie domain logic active; `public-pages.ts` remains unreferenced but present)**
- Is first destructive cleanup now authorized? **AFTER ONE MORE MANUAL VERIFICATION**

Conservative conclusion: in-repo code does not call `/api/builder/*`, but the repo still contains strong coupling signals for external/editor access. Removal should not start until external production/staging usage is checked.

## 2. Builder API Route Verification

Builder route inventory (`apps/platform/app/api/builder/**`):
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`

### `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- Purpose:
  - `GET`: list pages for org from `public.builder_pages` ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/route.ts) lines 62-101).
  - `POST`: upsert page in `public.builder_pages` ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/route.ts) lines 112-170).
- Auth model:
  - Requires `x-gnr8-internal-key` matching `BUILDER_INTERNAL_API_KEY` ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/route.ts) lines 24-32).
  - Requires `x-actor-user-id` header ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/route.ts) lines 34-36).
  - Requires membership record in `public.memberships` ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/route.ts) lines 39-59, 68-70, 118-120).
- DB/storage touched:
  - `public.memberships` membership check.
  - `public.builder_pages` read + upsert.
- Editor-only appearance:
  - Strongly editor/internal by header contract and route namespace `/api/builder/*`.
- Runtime-reachable from public path:
  - Yes as a normal Next API endpoint under `/api/builder/...` (no internal network isolation shown in route file).
- Intentional exposure signal:
  - Endpoint is explicitly kept and guarded with internal key + actor identity, indicating intended controlled client/service consumption.

### `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
- Purpose:
  - `GET`: read one org page by slug from `public.builder_pages` ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/[slug]/route.ts) lines 63-117).
- Auth model:
  - Same `x-gnr8-internal-key` + `BUILDER_INTERNAL_API_KEY` requirement ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/[slug]/route.ts) lines 30-35).
  - Same `x-actor-user-id` + membership check ([`route.ts`](../../app/api/builder/orgs/[orgId]/pages/[slug]/route.ts) lines 37-40, 43-61, 76-79).
- DB/storage touched:
  - `public.memberships` and `public.builder_pages`.
- Editor-only appearance:
  - Strongly editor/internal by route naming and auth shape.
- Runtime-reachable from public path:
  - Yes as a normal Next API endpoint.
- Intentional exposure signal:
  - Controlled but still routable API contract is explicit.

## 3. In-Repo Caller Verification

Searches across `apps/platform` + `packages` found **no in-repo callers** to `/api/builder/*` routes.

Evidence:
- Route-string search returned only the route definition file path, no client callsites:
  - `rg -n ... '/api/builder|api/builder|builder/orgs/.*/pages' apps/platform packages`
- Fetch/client scan found many `/api/*` callers, none to `/api/builder/*`:
  - `rg -n ... 'fetch\(|axios|...|href:"/api/builder|x-gnr8-internal-key|x-actor-user-id' apps/platform`
- No imports/calls of `getPublicPageByOrgAndSlug` outside its own file:
  - `rg -n ... '@/src/public-site/public-pages|public-site/public-pages|getPublicPageByOrgAndSlug' apps/platform`

Result: **confirmed none found in repo**.

## 4. External Usage Evidence / Signals

Classified signals:

- `BUILDER_INTERNAL_API_KEY` enforcement in both builder routes
  - Classification: **STRONG_EXTERNAL_USAGE_SIGNAL**
  - Why: contract implies caller sends internal key header; this is typically a separate trusted client/service.

- Required `x-actor-user-id` header in both routes
  - Classification: **STRONG_EXTERNAL_USAGE_SIGNAL**
  - Why: explicit actor propagation contract implies non-trivial upstream caller context.

- CORS allowlist includes `https://builder.pasadenagenerator.com` in global API middleware
  - Classification: **STRONG_EXTERNAL_USAGE_SIGNAL**
  - Why: explicit cross-origin allowance for builder domain suggests expected browser client at builder origin.

- Cookie-domain comments/logic mention sharing auth across `app.*` and `builder.*`
  - Classification: **WEAK_EXTERNAL_USAGE_SIGNAL** (active shared-platform behavior, not route-specific proof)
  - Why: indicates design assumption, but not direct evidence of live calls to `/api/builder/*`.

- Route naming `/api/builder/...`
  - Classification: **WEAK_EXTERNAL_USAGE_SIGNAL**
  - Why: semantic intent signal only.

- Presence of old docs/reports in `apps/platform/gnr8/chai-removal/*.md`
  - Classification: **LEGACY_SIGNAL**
  - Why: documentation context, not runtime proof.

- No direct telemetry/caller inventory in repo proving current production callers
  - Classification: **INCONCLUSIVE**

## 5. CORS / Origin Verification

Primary evidence:
- [`apps/platform/middleware.ts`](../../middleware.ts) lines 4-8 defines `ALLOWED_ORIGINS` with:
  - `https://app.pasadenagenerator.com`
  - `https://builder.pasadenagenerator.com`
- Same file lines 10-45 applies CORS behavior to **all** `/api/:path*` via matcher (not builder-only).

Assessment:
- Builder origin is still whitelisted: **YES**.
- Scope: **broad/global API CORS**, not scoped to builder routes.
- Known in-repo path dependency on builder-origin CORS: **none found**.
- Removal impact for known in-repo paths: likely none detected from repo call graph.

Answer: **UNKNOWN (manual production verification needed)**.

## 6. Cookie Domain / Auth Coupling Verification

Evidence of coupling:
- [`apps/platform/src/auth/require-actor-user-id.ts`](../../src/auth/require-actor-user-id.ts) lines 22-42 sets `.pasadenagenerator.com` cookie domain and comments explicitly mention sharing between `app.*` and `builder.*`.
- [`apps/platform/src/supabase/browser.ts`](../../src/supabase/browser.ts) lines 5-25 sets browser cookie domain `.pasadenagenerator.com`, comment says share across `app., builder., ...`.
- [`apps/platform/src/auth/supabase-server.ts`](../../src/auth/supabase-server.ts) lines 21-35 and [`apps/platform/src/auth/require-superadmin-user-id.ts`](../../src/auth/require-superadmin-user-id.ts) lines 25-43 apply same shared-domain rule.

Assessment:
- Builder/editor assumption still embedded: **yes (comments + host rule include builder subdomain model)**.
- Cross-subdomain auth behavior implies builder-client support: **possible**, but behavior is also shared by app/admin flows.
- Runtime criticality: this logic is in shared auth helpers used by non-builder APIs/pages too.

Classification: **SHARED_PLATFORM_COUPLING**.

## 7. Shared Helper Verification

### `apps/platform/src/public-site/public-pages.ts`
- Evidence:
  - Contains `getPublicPageByOrgAndSlug` querying `public.builder_pages` ([`public-pages.ts`](../../src/public-site/public-pages.ts) lines 26-56).
  - Search found no imports/callers outside itself.
- Additional runtime evidence:
  - Public runtime tests explicitly assert serving path no longer references `public.builder_pages` or `@/src/public-site/public-pages` ([`public-runtime-render.test.ts`](../../src/public-site/public-runtime-render.test.ts) lines 193-199).

Determination:
- **Currently unreferenced but plausibly legacy/shared contamination** (not used by present in-repo runtime path, but keep conservative because external/manual usage cannot be disproven from repo alone).

## 8. Package Runtime Necessity Verification

### `@chaibuilder/next`
- Declared in [`apps/platform/package.json`](../../package.json) line 7 (within app package file).
- Code imports appear only inside `packages/chai-renderer/*`, not in `apps/platform` runtime routes/components.
- Runtime needed? **NO (from in-repo runtime call graph evidence)**
- Editor/API needed? **UNKNOWN**
- Safe to remove from public runtime context? **YES (evidence-based for current in-repo runtime paths)**
- Safe to remove from repo now? **UNKNOWN**

### `@gnr8/chai-renderer`
- Declared in [`apps/platform/package.json`](../../package.json) line 8.
- No in-repo importers found.
- Runtime needed? **NO**
- Editor/API needed? **UNKNOWN**
- Safe to remove from public runtime context? **YES**
- Safe to remove from repo now? **UNKNOWN**

### `packages/chai-renderer/*`
- Internal package files import `@chaibuilder/next/runtime` and `@chaibuilder/next/types`.
- No app/runtime imports found from `apps/platform`.
- Runtime needed? **NO**
- Editor/API needed? **UNKNOWN**
- Safe to remove from public runtime context? **YES**
- Safe to remove from repo now? **UNKNOWN**

## 9. Confidence & Uncertainty Assessment

- No in-repo callers of `/api/builder/*`: **HIGH**
- Likely external usage: **MEDIUM**
- CORS necessity (builder origin): **LOW**
- Cookie-domain necessity (builder-specific vs shared): **MEDIUM**
- Shared helper deadness (`public-pages.ts`): **MEDIUM**
- Package removal readiness now: **LOW**

## 10. Removal Readiness Decision

**MANUAL_PRODUCTION_VERIFICATION_REQUIRED**

Why:
- Repo evidence strongly supports “no internal callers” but does not disprove external/editor consumers.
- Global API CORS allowlist still explicitly permits builder origin.
- Shared auth cookie-domain assumptions still encode app/builder cross-subdomain model.

## 11. Recommended Next Task

**Manual External Usage Verification**

## 12. Appendix: exact searches / evidence paths

Commands executed for this verification pass:

```bash
rg --files apps/platform/app/api/builder

sed -n '1,260p' 'apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts'
sed -n '1,260p' 'apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts'
sed -n '1,260p' apps/platform/middleware.ts
sed -n '1,260p' apps/platform/src/auth/require-actor-user-id.ts
sed -n '1,260p' apps/platform/src/auth/supabase-server.ts
sed -n '1,220p' apps/platform/src/auth/require-superadmin-user-id.ts
sed -n '1,220p' apps/platform/src/supabase/browser.ts
sed -n '1,260p' apps/platform/src/public-site/public-pages.ts
sed -n '1,260p' apps/platform/app/route.ts
sed -n '1,260p' 'apps/platform/app/(public)/[[...slug]]/route.ts'
sed -n '1,320p' apps/platform/src/public-site/public-runtime-render.test.ts

rg -n --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/*.md' --glob '!**/tsconfig.tsbuildinfo' '/api/builder|api/builder|builder/orgs/.*/pages' apps/platform packages

rg -n --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/*.md' --glob '!**/tsconfig.tsbuildinfo' 'fetch\(|axios|ky\(|useSWR|useQuery|router\.push\(|Link href=|href:\s*"/api/builder|x-gnr8-internal-key|x-actor-user-id' apps/platform

rg -n --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/*.md' --glob '!**/tsconfig.tsbuildinfo' '@/src/public-site/public-pages|public-site/public-pages|getPublicPageByOrgAndSlug' apps/platform

rg -n --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/dist/**' --glob '!**/*.md' --glob '!**/tsconfig.tsbuildinfo' '@gnr8/chai-renderer|@chaibuilder/next/runtime|@chaibuilder/next/types|@chaibuilder/next' apps/platform packages

rg -n --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/*.md' --glob '!**/tsconfig.tsbuildinfo' 'BUILDER_INTERNAL_API_KEY|NEXT_PUBLIC_DEFAULT_ORG_ID|builder\.pasadenagenerator\.com|x-gnr8-internal-key|x-actor-user-id' apps/platform

rg -n --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/*.md' --glob '!**/tsconfig.tsbuildinfo' --glob '!**/*.json' 'builder|chaibuilder|BUILDER_INTERNAL_API_KEY|builder_pages|builder\.pasadenagenerator|@chaibuilder|chai-renderer' apps/platform packages

cat apps/platform/package.json
cat packages/chai-renderer/package.json
cat package.json
cat pnpm-workspace.yaml
```

Primary evidence paths reviewed:
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
- `apps/platform/middleware.ts`
- `apps/platform/src/auth/require-actor-user-id.ts`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `apps/platform/src/auth/supabase-server.ts`
- `apps/platform/src/supabase/browser.ts`
- `apps/platform/src/public-site/public-pages.ts`
- `apps/platform/src/public-site/public-runtime-render.test.ts`
- `apps/platform/app/route.ts`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/package.json`
- `packages/chai-renderer/package.json`
- `packages/chai-renderer/*`
