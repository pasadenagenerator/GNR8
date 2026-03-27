# Unified Cost View Report

## Scope
Implemented an internal, read-only unified cost view that aggregates site-level AI usage, runtime usage, and migration cost signals into one operational surface.

This implementation is:

- additive
- internal-only
- read/aggregation only

This implementation does not include:

- invoices
- customer billing UI
- Stripe checkout lifecycle
- pricing/rebilling logic
- source event mutation

## Service and API Paths
- Service: `apps/platform/gnr8/billing/unified-cost-view-service.ts`
- Internal debug endpoint: `apps/platform/app/api/gnr8/debug/unified-cost/route.ts`

## Service Capabilities
Primary service methods:

- `getUnifiedCostForSite(siteId, options?)`
- `getUnifiedCostOverview(filters?)`

Supported filters:

- `siteId`
- `clientId`
- `agencyId`
- `days`
- `startDate`
- `endDate`
- `limit`
- `topLimit`

## Aggregation Fields
Per site summary includes:

Identity:
- `site_id`
- `domain`
- `site_status`
- `client_id`
- `client_name` (when safely available)
- `agency_id`

AI:
- `ai_event_count`
- `ai_prompt_tokens`
- `ai_completion_tokens`
- `ai_total_tokens`
- `ai_estimated_cost_sum`

Runtime:
- `runtime_event_count`
- `runtime_request_count`
- `runtime_bandwidth_bytes`
- `runtime_compute_ms`
- `runtime_estimated_cost_sum`

Migration:
- `migration_event_count`
- `migration_compute_units`
- `migration_estimated_cost_sum`

Unified:
- `total_estimated_cost`
- `cost_completeness_status`
- `latest_signal_at`

Data quality flags:
- `has_zero_token_ai_events`
- `missing_billing_account_in_ai_events`
- `no_runtime_events_seen`
- `no_migration_events_seen`

## Cost Completeness Model
Site-level classification:

- `FULL_SIGNAL` (AI + runtime + migration signals present)
- `AI_ONLY`
- `RUNTIME_ONLY`
- `MIGRATION_ONLY`
- `PARTIAL_SIGNAL` (exactly two signal families present)
- `NO_SIGNAL`

## Conservative Join and Identity Behavior
- Aggregation is anchored on `public.sites` (site-level view).
- `public.organizations` is used conservatively for client identity.
- `client_id` is emitted only when organization type resolves to `client`.
- `client_name` is emitted only when `organizations.name` exists and is safe to read.
- Missing identity data is returned as `null`; no fabricated ownership is introduced.

## Endpoint Contract
`GET /api/gnr8/debug/unified-cost`

Guarding:
- protected with `requireSuperadminUserId()`
- fail-closed behavior inherited from auth guard + explicit error mapping

Supported query params:
- `siteId`
- `clientId`
- `agencyId`
- `days`
- `limit`

Response payload:
- `site_summaries`
- `aggregate_totals`
- `summary_counts`
- `top_cost_sites`
- `table_availability`
- normalized `filters`

## What This Unlocks
- unified operational visibility of total cost per site
- direct AI/runtime/migration cost split per site
- top consumer identification for cost concentration analysis
- better readiness signal for future pricing experiments based on completeness coverage

## Validation Results
- `pnpm exec tsc --noEmit`: pass
- relevant runtime/publish tests:
  - `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-enforcement.integration.test.ts`: pass (2 tests)
  - `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-safety-check.test.ts`: pass (3 tests)
  - `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/runtime-happy-path.integration.test.ts`: fails due to missing `DATABASE_URL` environment gate, not due to unified cost changes
- `pnpm exec next build`: pass
- real data verification with `DATABASE_URL`: not executed because `DATABASE_URL` was unavailable in this run (`DATABASE_URL_PRESENT=0`)

## Limitations
- Aggregation is event-table driven; if event ingestion is missing, totals remain partial.
- Site-level view excludes migration events that lack `site_id` attribution.
- Cost values are currently based on existing `estimated_cost` event fields, not pricing engine logic.
- This is an internal debug/reporting surface only.
