# AI Usage Hook Integration Report

## Scope
This task introduced a reusable AI usage logging hook and integrated it into real prompt-driven AI execution paths used by GNR8 API routes.

## Hook implementation
- Hook file: `apps/platform/gnr8/billing/ai-usage-hook.ts`
- Public export added: `apps/platform/gnr8/billing/index.ts`

### Hook behavior (`wrapAIExecution(context, fn)`)
- Executes `fn()` and returns its result unchanged.
- Captures execution timing (`durationMs`) around `fn()`.
- Captures model metadata from:
  - explicit context (`modelProvider`, `modelName`) when provided
  - execution result fallbacks (`modelProvider` / `model_provider`, `modelName` / `model_name` / `model`)
- Captures usage tokens from:
  - explicit context usage object (supports both `promptTokens/completionTokens/totalTokens` and `prompt_tokens/completion_tokens/total_tokens`)
  - result fallback `result.usage`
  - defaults to `0` tokens when unavailable
- Resolves billing ownership context:
  - when `siteId` is provided, resolves via `resolveBillingContextForSite(siteId)`
  - when both `siteId` and `agencyId` are provided, fails early on mismatch
- Logs with `logAIUsageEvent()`.
- Safe-failure behavior:
  - logging failures are warning-only and do not break AI execution
  - ownership mismatch / unresolved `siteId` during preflight fails early (data integrity)

## Hook integration points (covered)
The hook is integrated at all current `runLayoutAgent(...)` API execution sites:

- `apps/platform/app/api/gnr8/ai/layout/route.ts`
- `apps/platform/app/api/gnr8/ai/layout-and-save/route.ts`
- `apps/platform/app/api/gnr8/ai/edit-and-save/route.ts`
- `apps/platform/app/api/gnr8/ai/optimization-action/route.ts`
- `apps/platform/app/api/gnr8/ai/migration-autofix/route.ts`
- `apps/platform/app/api/gnr8/ai/migration-run/route.ts`

### Feature/operation mapping used
- Content generation routes: `feature_context = content_generation`, `operation_type = llm_generate`
- Optimization/autofix routes: `feature_context = optimization`, `operation_type = llm_transform`

## Request metadata accepted at integration routes
Each integrated route now accepts optional passthrough fields for usage attribution/logging:
- `siteId` (preferred)
- `agencyId` (fallback)
- `siteVersionId`
- `artifactId`
- `modelProvider`
- `modelName`
- `usage` (camelCase or snake_case token fields)
- `traceId`

## What is still not covered
- There are currently no external provider SDK call-sites (OpenAI/Anthropic/etc.) in the repository.
- AI-style analytic/orchestration endpoints that do not call `runLayoutAgent(...)` are not yet wrapped.
- Calls without `siteId` and without `agencyId` are executed but logging is skipped with warning (backward compatibility path).

## Limitations
- In current covered paths, token usage/model info may be unavailable unless callers provide explicit metadata.
- When usage is unavailable, events are still logged with token counts set to `0`.
- Ownership attribution quality depends on request metadata availability (`siteId` or `agencyId`).

## Validation steps and outcomes
1. `pnpm exec tsc --noEmit`
- Passed.

2. Migration-factory tests
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory.test.ts` passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory-activation.test.ts` passed.

3. Publish/runtime tests
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-enforcement.integration.test.ts` passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-safety-check.test.ts` passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/runtime-artifact-response.integration.test.ts` skipped by test guard when `DATABASE_URL` is not set.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/runtime-happy-path.integration.test.ts` failed only on required env precondition (`DATABASE_URL is required for real runtime verification`).

4. `pnpm exec next build`
- Passed.

## Event insert simulation
- Direct DB insert simulation was not executed because this environment did not provide a verified `DATABASE_URL` for end-to-end runtime integration.
