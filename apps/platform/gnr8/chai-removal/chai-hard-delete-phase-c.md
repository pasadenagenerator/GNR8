# ChaiBuilder Hard Delete — Phase C

## 1. Executive Summary
Phase C hard-delete is complete for remaining ChaiBuilder/editor residue in active platform code and workspace package graph.

Completed:
- deleted decommissioned `/api/builder/orgs/*/pages*` route files
- deleted `apps/platform/gnr8/builder-only/*` modules and removed builder-only path aliases/imports
- deleted `packages/chai-renderer` workspace package
- refreshed `pnpm-lock.yaml` to remove stale `packages/chai-renderer` importer and `@chaibuilder/next` lock entries

No builder subsystem remains active in `apps/platform` runtime/migration/publish paths.

## 2. Files/Modules Deleted
Deleted files:
- `apps/platform/app/api/builder/orgs/[orgId]/pages/route.ts`
- `apps/platform/app/api/builder/orgs/[orgId]/pages/[slug]/route.ts`
- `apps/platform/gnr8/builder-only/public-pages.ts`
- `apps/platform/gnr8/builder-only/builder-api-helpers.ts`
- `apps/platform/gnr8/builder-only/builder-boundary-guard.ts`
- `packages/chai-renderer/index.ts`
- `packages/chai-renderer/package.json`
- `packages/chai-renderer/blocks/index.ts`
- `packages/chai-renderer/blocks/hello-world.tsx`
- `packages/chai-renderer/fonts/index.ts`
- `packages/chai-renderer/page-types/index.ts`
- `packages/chai-renderer/page-types/blog.ts`

Deleted directories:
- `apps/platform/gnr8/builder-only/`
- `packages/chai-renderer/`

## 3. Packages Removed
Removed workspace package:
- `@gnr8/chai-renderer` (via deletion of `packages/chai-renderer`)

Removed lockfile package graph residues:
- `packages/chai-renderer` importer block
- `@chaibuilder/next` lock entries
- `@chaibuilder/sdk` lock entries

## 4. Imports/Config Updated
Code import cleanup:
- removed `assertBuilderOnlyContext` import+call from `apps/platform/src/public-site/public-runtime-render.tsx`
- removed `assertBuilderOnlyContext` import+call from `apps/platform/gnr8/migration-factory/migration-stage-runner.ts`

Config cleanup:
- removed `@gnr8/builder-only/*` and `@gnr8/builder-only/` path aliases from `apps/platform/tsconfig.json`

Lockfile cleanup:
- regenerated `pnpm-lock.yaml` using `pnpm install --lockfile-only`

## 5. Validation Results
Search validation (active code; excludes markdown/.next/tsbuildinfo):
- `rg -n "@chaibuilder" apps/platform packages ...` -> 1 hit in runtime smoke CLI forbidden-marker list (`internal-ingress-smoke.cli.ts`), no package import/dependency usage
- `rg -n "chai-renderer" apps/platform packages ...` -> no hits
- `rg -n "builder-only" apps/platform packages ...` -> no hits
- `rg -n "/api/builder" apps/platform packages ...` -> no hits
- `find apps/platform/app/api/builder -type f` -> no files

Type/build/test validation:
- `pnpm exec tsc --noEmit` -> pass
- `apps/platform: NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory.test.ts` -> pass (17 tests)
- `apps/platform: NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory-activation.test.ts` -> pass (7 tests)
- `apps/platform: NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test src/public-site/public-runtime-render.test.ts` -> pass (6 tests)
- `apps/platform: NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-safety-check.test.ts` -> pass (3 tests)
- `apps/platform: NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-enforcement.integration.test.ts` -> pass (2 tests)
- `apps/platform: pnpm exec next build` -> pass

## 6. What Still Remains (if anything)
No active builder subsystem remains in executable app/package code.

One non-operational string marker remains:
- `apps/platform/gnr8/runtime/internal-ingress-smoke.cli.ts` contains forbidden HTML marker literals (`"@chaibuilder"`, `"chaibuilder"`, etc.) used as runtime ingress smoke assertions.
- This is not a dependency, import, route, or package coupling.

## 7. Final Cleanliness Assessment
Phase C hard-delete objective achieved:
- builder route shells removed
- builder-only helper subsystem removed
- chai renderer workspace package removed
- Chai package-lock graph residue removed
- migration/runtime/publish/public-runtime paths validated green

Repository is now clean of active ChaiBuilder/editor subsystem code in `apps/platform` and workspace package graph.

## 8. Recommended Next Step
A. DB Schema / Table Retirement Planning
