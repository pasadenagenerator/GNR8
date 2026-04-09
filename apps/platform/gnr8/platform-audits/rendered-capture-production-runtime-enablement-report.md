# Rendered Capture Production Runtime Enablement Report

## 1. Actual Production Runtime Findings
- Scoped import execution surfaces are Node routes (`runtime = 'nodejs'`) at:
  - `app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
  - `app/api/gnr8/runtime/migrate/url/route.ts`
- Rendered capture previously loaded Playwright through an opaque dynamic import shim (`new Function(...import(specifier))`), which is not reliably output-traceable for standalone/deployed bundles.
- Browser runtime checks were present, but production truth was still too coarse to distinguish package presence vs binary availability vs runtime incompatibility.

## 2. Exact Root Cause Of ENVIRONMENT_UNSUPPORTED
- Primary root cause:
  - Playwright module loading path was not production tracing-friendly, so deployment packaging could miss required runtime assets despite dependency presence.
- Secondary root cause:
  - Browser binary availability was not explicitly checked before launch with a persistent support-decision contract.
- Result:
  - Imports degraded with `ENVIRONMENT_UNSUPPORTED` / `RENDERED_CAPTURE_UNAVAILABLE` without precise runtime support truth.

## 3. Solution Chosen
- Kept capture in the existing Node API execution surface (no over-architecture).
- Replaced non-traceable Playwright loading with static `import('playwright')`.
- Added explicit support detection and persisted support truth:
  - runtime kind compatibility
  - Playwright package availability
  - browser binary availability
  - final support decision
- Hardened Next standalone tracing config for capture routes to include Playwright browser binary paths.

## 4. Runtime / Config / Dependency Changes Made
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-service.ts`
  - Added runtime kind detection (`nodejs|edge|unknown`) and compatibility guard.
  - Added package and binary checks before launch.
  - Added explicit support decision diagnostics.
  - Converted unsupported browser-launch incompatibility to explicit unavailable path with truthful diagnostics.
  - Switched to static `import('playwright')`.
- `apps/platform/next.config.mjs`
  - Added `playwright` and `playwright-core` to `serverExternalPackages`.
  - Added `outputFileTracingIncludes` entries for capture-invoking API routes with:
    - `node_modules/playwright/.local-browsers/**`
    - `node_modules/playwright-core/.local-browsers/**`
    - `node_modules/playwright-core/lib/server/registry/**`
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-contract.ts`
  - Added diagnostics:
    - `PLAYWRIGHT_PACKAGE_CHECK`
    - `PLAYWRIGHT_BINARY_CHECK`
    - `RENDERED_CAPTURE_SUPPORT_DECISION`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
  - Added new diagnostic codes to URL import diagnostics.
  - Enriched `executionTruth` with:
    - `runtimeKind`
    - `environmentSupported`
    - `browserPackageAvailable`
    - `browserBinaryAvailable`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
  - Persisted the same explicit support truth into runtime import provenance.
- `apps/platform/gnr8/runtime/types.ts`
  - Extended persisted `RuntimeImportProvenanceSummary.renderedCapture.execution` with runtime support truth fields.
- `apps/platform/gnr8/site/site-workspace-read-model.ts`
  - Parsed and preserved new execution truth fields for Site Workspace reads.

## 5. Diagnostics Improvements
- Added deterministic, explicit diagnostics for:
  - Runtime compatibility (`RENDERED_CAPTURE_RUNTIME_ENVIRONMENT`)
  - Playwright package check (`PLAYWRIGHT_PACKAGE_CHECK`)
  - Browser binary check (`PLAYWRIGHT_BINARY_CHECK`)
  - Final support decision (`RENDERED_CAPTURE_SUPPORT_DECISION`)
- Environment failure now clearly separates:
  - runtime incompatible
  - Playwright package unavailable
  - browser binary missing
  - browser launch environment incompatibility
- Page failures remain separate (`NAVIGATION_FAILED`, DOM/style/screenshot failures).

## 6. Remaining Unsupported Cases
- Runtime kind is not Node (`edge`/unknown): explicitly unsupported.
- Browser package or binary absent in the deployment artifact: explicitly unsupported.
- Browser launch blocked by platform sandbox/policy: explicitly unsupported and classified.

## 7. Limitations
- Manual live-site validation in this sandbox is network-constrained.
  - Attempts were executed for:
    - `https://servis-chs.generator.live/`
    - `https://polar.sh/`
    - `https://example.com/` (control)
  - All three failed at entry fetch in current environment (`ENTRY_FETCH_FAILED`), so real external-site runtime confirmation here is blocked by environment access, not importer logic.
- `pnpm exec tsc --noEmit` currently fails due missing `.next/types` files from existing workspace typing setup.
- `pnpm exec next build` remains blocked by the known unrelated Stripe module export issue.

## 8. Next-Step Recommendation
- Proceed with a production deployment smoke run using this explicit support contract:
  - verify `renderedCapture.execution.runtimeKind= nodejs`
  - verify `environmentSupported/browserPackageAvailable/browserBinaryAvailable`
  - verify `renderedCapture.status` transitions to `available|partial` on supported targets
  - verify fallback is only used when support truth says unsupported or true page failure.

## Explicit Scope Boundary (This Task)
- This task did not implement:
  - multi-page crawl
  - consolidation redesign
  - style-signal redesign
  - screenshot semantic segmentation
  - billing/subscription gating
