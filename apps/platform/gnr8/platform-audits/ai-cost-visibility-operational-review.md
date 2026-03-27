# AI Cost Visibility Operational Review

Date: 2026-03-27

## 1. Executive Summary

- AI cost logging is **not operationally working** in current connected environments because `public.ai_usage_events` is missing.
- Attribution quality is **NOT_YET_TRUSTABLE** at runtime because no events can be persisted to validate resolved ownership fields.
- Token/cost fields are **TOO_INCOMPLETE_FOR_BILLING_EXPERIMENTS** operationally because there are zero persisted events to evaluate.
- Biggest remaining gap: **AI usage event storage foundation is not deployed** (missing `ai_usage_events`, and in staging also missing `sites`), so all downstream attribution/cost visibility is blocked.

## 2. Routes Reviewed

Instrumented routes reviewed in code (all use `wrapAIExecution`):
- `/api/gnr8/ai/layout`
- `/api/gnr8/ai/layout-and-save`
- `/api/gnr8/ai/edit-and-save`
- `/api/gnr8/ai/optimization-action`
- `/api/gnr8/ai/migration-autofix`
- `/api/gnr8/ai/migration-run`

Actually exercised in live operational run:
- `/api/gnr8/ai/layout`
- `/api/gnr8/ai/layout-and-save`
- `/api/gnr8/ai/edit-and-save`

Not exercised (this run):
- `/api/gnr8/ai/optimization-action` (requires existing page/action context to guarantee AI execution path)
- `/api/gnr8/ai/migration-autofix` (may choose non-AI cleanup path depending page state)
- `/api/gnr8/ai/migration-run` (requires migration-actionable page state to guarantee wrapped AI call)

## 3. Executions Performed

Execution context used:
- `siteId`: `91fb0854-9b84-4c4b-aff4-777043ab6451`
- `agencyId`: `00000000-0000-4000-8000-000000000001`
- test slug: `ai-cost-review-1774618314515`

1. Route: `/api/gnr8/ai/layout`
- Input context: `siteId`, `agencyId`, `modelProvider`, `modelName`, `traceId`; usage omitted intentionally.
- Result: `200` success.
- Event created: **No**.
- Notable issue: hook warning -> `logAIUsageEvent cannot run because public.ai_usage_events does not exist in this environment`.

2. Route: `/api/gnr8/ai/layout-and-save`
- Input context: `siteId`, `agencyId`, `modelProvider`, `modelName`, `traceId`, usage (`promptTokens=190`, `completionTokens=410`, `totalTokens=600`).
- Result: `200` success.
- Event created: **No**.
- Notable issue: same missing-table failure.

3. Route: `/api/gnr8/ai/edit-and-save`
- Input context: `siteId`, `agencyId`, `modelProvider`, `modelName`, `traceId`, usage (`prompt_tokens=120`, `completion_tokens=280`, `total_tokens=400`).
- Result: `200` success.
- Event created: **No**.
- Notable issue: same missing-table failure.

## 4. Debug Endpoint Findings

Debug surface inspected:
- Endpoint route: `GET /api/gnr8/debug/ai-usage`
- Backing service: `readAIUsageDebug(...)`

Operational findings:
- Direct route-function invocation outside Next request scope returned `500` (`cookies` outside request scope), so handler-level validation in script context is not reliable.
- Backing debug service call failed with: `ai_usage_events table does not exist in this environment`.

Required counters/classifications:
- `total_events_returned`: unavailable (blocked by missing table)
- `events_with_site_id`: unavailable
- `events_with_client_id`: unavailable
- `events_missing_billing_account_id`: unavailable
- `events_with_zero_total_tokens`: unavailable
- `classification_counts.fully_attributed`: unavailable
- `classification_counts.agency_only`: unavailable
- `classification_counts.missing_site`: unavailable
- `classification_counts.missing_billing_account`: unavailable
- `classification_counts.zero_tokens`: unavailable

Schema checks performed:
- Production env (`.env.production`):
  - `public.sites` present
  - `public.ai_usage_events` missing
  - `public.billing_accounts` missing
- Staging env (`.env.staging`):
  - `public.ai_usage_events` missing
  - `public.sites` missing

## 5. Attribution Quality Assessment

Classification: **NOT_YET_TRUSTABLE**

Reasoning:
- Runtime attribution logic is present and was reached (hook warnings confirm calls attempted with site/agency context).
- No persisted `ai_usage_events` records exist because foundational table is absent.
- Therefore attribution fields (`agency_id`, `site_id`, `client_id`, `billing_account_id`, `feature_context`, `operation_type`) cannot be operationally validated from stored events.

## 6. Token / Cost Signal Assessment

Classification: **TOO_INCOMPLETE_FOR_BILLING_EXPERIMENTS**

Reasoning:
- Route executions included both no-usage and explicit-usage inputs, but no event rows were persisted.
- `estimated_cost`, token fields, and provider/model capture cannot be evaluated in storage.
- Current signal in live environment is effectively zero because persistence is blocked.

## 7. Operational Gaps

Priority-ordered gaps:
1. `ai_usage_events` table is not deployed in active environments used for validation.
2. `billing_accounts` table missing in production-connected env (indicates broader billing foundation rollout gap).
3. Staging lacks even baseline ownership table (`sites`), preventing realistic attribution validation there.
4. Debug endpoint cannot return operational counters until table foundation exists.
5. No blocked-attempt telemetry row exists for failed log attempts (only warning logs), limiting historical diagnostics.

## 8. Recommended Next Step

**AI Provider Usage Capture Improvement** is not the right immediate move while storage is missing.

Recommended next move (one): **Runtime Usage Aggregation Hooks** only after billing schema rollout is complete; however, based on current findings the immediate operational prerequisite is to apply billing/cost-event migrations in target environments before any higher-order usage experimentation.

## 9. Appendix: commands / requests / limitations

Commands executed (selected):
- Route/hook mapping:
  - `rg -n "wrapAIExecution" apps/platform/app/api/gnr8/ai -g 'route.ts'`
- Environment variable presence check:
  - `set -a; source .env.production; set +a; node -e "...DATABASE_URL..."`
- Production ownership sample:
  - SQL via Node/pg: select latest site/agency/client from `public.sites` + `public.organizations`
- Live route execution runner:
  - `set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx /tmp/ai-cost-review-runner.ts`
- Staging schema probe:
  - `set -a; source .env.staging; set +a; node -e "select to_regclass(...)"`
- Debug route direct invocation probe:
  - `set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx /tmp/ai-usage-debug-endpoint-check.ts`

Endpoint requests used:
- Attempted internal debug route call through route function (`GET /api/gnr8/debug/ai-usage?limit=5`) in script context.
- Debug data query performed through `readAIUsageDebug({ limit: 50 })` and `readAIUsageDebug({ siteId, limit: 50 })` (service backing the endpoint).

Filters used:
- Debug reads attempted with `limit=50` and `siteId=91fb0854-9b84-4c4b-aff4-777043ab6451`.

Environment/data limitations:
- Production/staging database access required escalated network permissions.
- `public.ai_usage_events` missing in both checked environments prevented event persistence and debug counters.
- Direct invocation of Next route handler outside request scope causes dynamic API error for `cookies`.
- Because table foundation is missing, no live `ai_usage_events` rows were available for attribution/token distribution analysis.

DATABASE_URL / required envs:
- `.env.production`: `DATABASE_URL` present.
- `.env.staging`: `DATABASE_URL` present.
- Connectivity was available with escalation; schema prerequisites were not.
