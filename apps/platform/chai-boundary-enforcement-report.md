# ChaiBuilder Boundary Enforcement Report

## Modules moved into `gnr8/builder-only/`

- `apps/platform/gnr8/builder-only/builder-boundary-guard.ts`
- `apps/platform/gnr8/builder-only/public-pages.ts` (moved from `src/public-site/public-pages.ts`)
- `apps/platform/gnr8/builder-only/builder-api-helpers.ts` (builder API auth/membership/pool helpers)
- `apps/platform/gnr8/builder-only/builder-origin.ts` (builder-origin cookie + CORS helpers)

## Modules still referencing builder DB (`public.builder_pages`)

- `apps/platform/gnr8/builder-only/public-pages.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`

## Modules importing chai packages

- `packages/chai-renderer/blocks/index.ts` (`@chaibuilder/next/runtime`)
- `packages/chai-renderer/blocks/hello-world.tsx` (`@chaibuilder/next/runtime`, `@chaibuilder/next/types`)
- `packages/chai-renderer/fonts/index.ts` (`@chaibuilder/next/runtime`)
- `packages/chai-renderer/page-types/index.ts` (`@chaibuilder/next/runtime`)
- `packages/chai-renderer/page-types/blog.ts` (`@chaibuilder/next/types`)
- `apps/platform/package.json` keeps dependency declarations for `@chaibuilder/next` and `@gnr8/chai-renderer` (no removal in this boundary pass)

## Runtime paths now guaranteed builder-free (artifact serving path)

- `apps/platform/app/route.ts` -> `renderPublicPathResponse(...)`
- `apps/platform/app/(public)/[[...slug]]/route.ts` -> `renderPublicPathResponse(...)`
- `apps/platform/src/public-site/public-runtime-render.tsx` continues artifact-only serving and now includes explicit boundary assertion
- `apps/platform/src/public-site/public-runtime-render.test.ts` regression guard still asserts no `public.builder_pages` fallback references

## Enforcement added in this task

- Runtime guard module: `assertBuilderOnlyContext()` + defensive importer enforcement in `builder-boundary-guard.ts`
- Builder API routes now tagged with `export const BUILDER_API_ONLY = true`
- TypeScript path alias added:
  - `@gnr8/builder-only/*` -> `gnr8/builder-only/*`
- ESLint boundary rule added:
  - `apps/platform/.eslintrc.json`
  - forbids `@gnr8/builder-only/*` imports from `gnr8/runtime/**`, `gnr8/migration-factory/**`, `gnr8/migration/**`, `gnr8/canonical/**`, `gnr8/layout-graph/**`
