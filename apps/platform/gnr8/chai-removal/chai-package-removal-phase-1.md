# Chai Package Removal — Phase 1

## 1. Executive Summary

Phase 1 runtime/package-level cleanup was completed safely by removing ChaiBuilder runtime dependencies from `apps/platform` while preserving isolated builder/editor package code.

Removed from `apps/platform/package.json`:
- `@chaibuilder/next`
- `@gnr8/chai-renderer`

Result:
- Runtime/public/migration/publish import graph remains free of Chai package imports.
- Typecheck passes.
- Targeted migration/runtime/publish tests pass.
- `next build` in `apps/platform` succeeds.

## 2. Packages Reviewed

- `@chaibuilder/next`
- `@gnr8/chai-renderer`
- `packages/chai-renderer` (workspace package)
- `apps/platform/package.json` dependency graph
- `pnpm-lock.yaml` importer graph (`apps/platform`, `packages/chai-renderer`)

## 3. Packages Removed

1. `@chaibuilder/next` from `apps/platform/package.json`
- Removal basis: no imports found in runtime/public/migration/publish paths.
- Post-removal status: absent from `apps/platform` importer block in `pnpm-lock.yaml`.

2. `@gnr8/chai-renderer` from `apps/platform/package.json`
- Removal basis: no imports of `@gnr8/chai-renderer` found in `apps/platform` code.
- Post-removal status: absent from `apps/platform` importer block in `pnpm-lock.yaml`.

## 4. Packages Retained

1. `packages/chai-renderer` workspace package (retained)
- Reason retained: package is still present in workspace and internally imports `@chaibuilder/next`; removing/deleting package directory is out of scope for this phase and not required for runtime graph cleanup.

2. `@chaibuilder/next` under `packages/chai-renderer` importer (retained)
- Reason retained: still required by `packages/chai-renderer` package internals/manifest.
- Runtime impact: isolated to workspace package, no active runtime/public import path in `apps/platform`.

## 5. Runtime Import Graph Verification

Verification scope requested:
- `apps/platform/src/public-site/**`
- `apps/platform/gnr8/runtime/**`
- `apps/platform/gnr8/migration-factory/**`
- `apps/platform/gnr8/migration/**`
- `apps/platform/app/**`

Search command:
```bash
rg -n --glob '!**/*.md' --glob '!**/node_modules/**' --glob '!**/.next/**' "@chaibuilder/next|@gnr8/chai-renderer|chai-renderer" \
  apps/platform/src/public-site \
  apps/platform/gnr8/runtime \
  apps/platform/gnr8/migration-factory \
  apps/platform/gnr8/migration \
  apps/platform/app
```

Result:
- No matches in requested runtime/public/migration/publish paths.
- Remaining Chai imports exist only in `packages/chai-renderer/*`.

## 6. Build/Type/Test Validation

Dependency/lockfile refresh:
- `CI=true pnpm install --no-frozen-lockfile`
- Success; lockfile updated.

Typecheck:
- `pnpm exec tsc --noEmit`
- Pass.

Targeted tests:
- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory.test.ts` — pass (17/17)
- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test src/public-site/public-runtime-render.test.ts` — pass (6/6)
- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-safety-check.test.ts` — pass (3/3)
- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-enforcement.integration.test.ts` — pass (2/2)

Practical build:
- `cd apps/platform && pnpm exec next build`
- Pass.

## 7. Remaining Blockers to Full Chai Removal

- `packages/chai-renderer` is still in workspace and still depends on/imports `@chaibuilder/next`.
- Full removal of Chai packages from lockfile/workspace requires either:
  - decommissioning `packages/chai-renderer`, or
  - converting it to a non-Chai stub and removing `@chaibuilder/next` from that package.

## 8. Recommended Next Step

Proceed to **B. Builder API Decommission**, with one preparatory sub-step if desired:
- isolate/archive plan for `packages/chai-renderer` (manifest-level deprecation and final workspace de-link), then remove residual `@chaibuilder/next` from workspace entirely.
