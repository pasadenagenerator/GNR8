# AI Usage Required Context Enforcement Report

## Scope

This change tightens attribution context enforcement for AI usage logging and execution wrappers used by production mutation routes, while preserving controlled backward-compatible behavior for explicitly legacy paths.

## Policy Module Added

- Added `apps/platform/gnr8/billing/ai-usage-context-policy.ts`
- Introduced explicit policy categories:
  - `site_required`
  - `agency_required`
  - `optional_legacy`
- Added `validateAIUsageContext(...)` for normalized, auditable policy checks.
- Added explicit policy errors with stable codes:
  - `AI_USAGE_SITE_CONTEXT_REQUIRED`
  - `AI_USAGE_AGENCY_CONTEXT_REQUIRED`
  - `AI_USAGE_CONTEXT_INVALID`

## Enforcement Behavior Changes

- Updated `wrapAIExecution(...)` to require explicit `contextPolicy`.
- `site_required` now fails before execution when `siteId` is missing.
- `agency_required` now fails before execution when both `siteId` and `agencyId` are missing.
- Site ownership checks remain strict:
  - unresolved `siteId` now throws `AI_USAGE_CONTEXT_INVALID`
  - `agencyId`/site ownership mismatch now throws `AI_USAGE_CONTEXT_INVALID`
- Logging skip behavior (`neither siteId nor agencyId`) remains only for `optional_legacy`.

## Route / Policy Classification

### site_required

- `POST /api/gnr8/ai/layout`
- `POST /api/gnr8/ai/layout-and-save`
- `POST /api/gnr8/ai/edit-and-save`
- `POST /api/gnr8/ai/optimization-action`
- `POST /api/gnr8/ai/migration-autofix`

Rationale: These are site/page content mutation operations where site ownership context should already be known.

### agency_required

- `POST /api/gnr8/ai/migration-run`

Rationale: multi-step migration loop may run in agency-scoped exploration mode before strict site binding, but still requires at least agency attribution when `siteId` is absent.

### optional_legacy

- No current route-level AI hook integrations were assigned `optional_legacy` in this enforcement pass.
- The policy remains available for explicitly documented internal/legacy call sites that are not ownership-aware yet.

## Failure Surface

- Route handlers using `wrapAIExecution(...)` now map policy failures to HTTP `400` with `{ error, code }` payload.
- Missing required attribution context no longer silently executes under permissive fallback in classified routes.

## Backward Compatibility Exceptions Kept

- `optional_legacy` policy remains supported in `wrapAIExecution(...)` for non-classified legacy/internal paths.
- Existing behavior that skips logging (with warning) when both `siteId` and `agencyId` are absent is preserved only under `optional_legacy`.

## Validation Results

- Typecheck passed: `pnpm exec tsc --noEmit`
- Targeted policy tests passed:
  - missing `siteId` fails for `site_required`
  - missing both `siteId` and `agencyId` fails for `agency_required`
  - valid contexts pass
- Relevant runtime/publish tests passed:
  - `gnr8/runtime/publish-safety-check.test.ts`
  - `gnr8/runtime/publish-activation-guard.test.ts`
  - `gnr8/migration-factory/migration-factory.test.ts`
- `next build` passed in `apps/platform`.

## Risks / Remaining Gaps

- Only the currently integrated six route call sites were classified in this pass; additional AI entry points not using `wrapAIExecution(...)` remain out-of-scope.
- Optional debug endpoint enhancements for tracking blocked attempts were not implemented in this pass to keep scope constrained to enforcement.
