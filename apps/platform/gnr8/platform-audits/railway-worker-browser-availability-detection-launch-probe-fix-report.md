# Railway Worker Browser Availability Detection + Launch Probe Fix Report

## 1. Previous Detection Logic
- Worker/runtime availability relied on:
  - Playwright import success (`PLAYWRIGHT_PACKAGE_CHECK`)
  - Chromium executable path resolution + `fs.existsSync` (`PLAYWRIGHT_BINARY_CHECK`)
  - Runtime/path writability checks
- Support truth could be finalized before a real Chromium launch probe, so a path/package heuristic could block capture even when launch behavior was the real source of truth.
- `/health` used the same package/path heuristic and did not verify real launchability.

## 2. Real Root Cause Found
- Browser availability truth was determined too early from package/path checks rather than bounded launch behavior.
- This allowed ambiguous `ENVIRONMENT_UNSUPPORTED` outcomes and masked the true runtime launch failure class.
- There was also version drift risk:
  - `apps/platform/package.json` allowed `^1.54.2`
  - lockfile resolved `1.59.1`
  - worker Docker image was pinned to `v1.54.2-noble`

## 3. Version Alignment Findings
- Updated package/runtime alignment to Playwright `1.59.1`:
  - `apps/platform/package.json` -> `playwright: ^1.59.1`
  - `pnpm-lock.yaml` importer specifier aligned to `^1.59.1`
  - `apps/platform/gnr8/rendered-capture-worker-server/Dockerfile` -> `mcr.microsoft.com/playwright:v1.59.1-noble`
- This removes app-vs-image drift for worker execution assumptions.

## 4. Launch Probe Implementation
- Added shared launch probe utility:
  - `apps/platform/gnr8/import-rendered-capture/playwright-launch-probe.ts`
- Probe now verifies, in bounded form:
  - Chromium launch
  - context creation
  - page creation
  - clean close
- Added Railway-safe launch args:
  - `--no-sandbox`
  - `--disable-setuid-sandbox`
  - `--disable-dev-shm-usage`
- Rendered capture executor now:
  - treats `PLAYWRIGHT_BINARY_CHECK` as launch-probe truth (not just path existence)
  - finalizes support decision after launch/context probe truth
  - preserves fallback safety to raw HTML

## 5. Diagnostics Improvements
- Added explicit failure-class diagnostics:
  - `PLAYWRIGHT_IMPORT_FAILED`
  - `PLAYWRIGHT_BROWSER_LAUNCH_FAILED`
  - `PLAYWRIGHT_BROWSER_CONTEXT_FAILED`
  - `PLAYWRIGHT_LAUNCH_TIMEOUT`
  - `PLAYWRIGHT_EXECUTABLE_MISSING`
  - `PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED`
- Updated worker failure selection so these codes map to explicit worker failure truth instead of collapsing to generic environment failure.
- Updated import provenance parsing (`url-single-page-import` and `scoped-import-pipeline`) so environment failure code prefers specific launch-probe failures over generic `ENVIRONMENT_UNSUPPORTED`.

## 6. Manual Validation Results
- Local deterministic validation:
  - `gnr8/import-rendered-capture/playwright-launch-probe.test.ts` passed
  - `gnr8/rendered-capture-worker-server/server.test.ts` passed
  - `gnr8/validation/runtime/url-single-page-import.test.ts` passed
  - `gnr8/site/scoped-import-pipeline.test.ts` passed
  - `pnpm exec next build` passed
  - `pnpm exec tsc --noEmit` passed (after `.next/types` regeneration from `next build`)
- Railway live validation:
  - Not executed in this run because no live worker base URL/token were available in local env for authenticated `/health` + real import execution.

## 7. Remaining Limitations
- `/health` now performs a real launch probe; this is more truthful but more expensive than path-only checks.
- Live remote manual checks (target domains and worker endpoint) still require deployed environment credentials/config at execution time.

## 8. Next-Step Recommendation
- Run a live Railway validation pass with configured worker URL/token:
  - `GET /health`
  - fresh imports for `chs.generator.live`, `nazrob.si` (optionally `polar.sh`)
  - confirm either:
    - launch probe success (`browserBinaryAvailable=true`, `captureServiceAvailable=true`), or
    - explicit launch failure code without generic ambiguity.

## Explicit Scope Limitations
This task intentionally does **not** include:
- computed style sampling redesign
- async queue redesign
- multi-page capture
- OCR
- billing/subscription gating

Scope delivered: browser availability detection + launch probe fix only.
