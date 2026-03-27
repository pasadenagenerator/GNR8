# Unified Cost Operational Review

Date: 2026-03-27  
Environment: `apps/platform` with `.env.production` loaded (`DATABASE_URL` present)

## 1. Executive Summary
- Unified cost read layer is operationally working as a read surface (service returns valid site summaries and overview output).
- Attribution is correct for observed AI events on Maver (site/client/agency/billing account were populated; debug classification showed fully-attributed events).
- AI and runtime signals are **not** visible together in production data from this run; reviewed site remains `AI_ONLY`.
- Biggest remaining gap: runtime and migration cost signal coverage is effectively absent (0 events in 30-day window), so unified totals are not yet decision-grade for pricing/margin work.

## 2. Sites Reviewed
- Primary reviewed site: `91fb0854-9b84-4c4b-aff4-777043ab6451` (`maver.app.pasadenagenerator.com`)
- Why chosen:
  - known real site
  - already ownership/client-assignment bound
  - active in prior runtime governance/production checks
- Ownership/client assignment status during run:
  - `client_id`: `61b953f8-ca84-417a-b275-eca1bb18bca7`
  - `client_name`: `Transporti Maver`
  - `agency_id`: `00000000-0000-4000-8000-000000000001`

## 3. Activity Triggered
- AI actions triggered on Maver (3 actions, all successful):
  - `/api/gnr8/ai/layout` (200)
  - `/api/gnr8/ai/layout-and-save` (200)
  - `/api/gnr8/ai/edit-and-save` (200)
- Runtime requests triggered on same site:
  - `GET https://maver.app.pasadenagenerator.com/` x3 (all `200`, ~9209 bytes)
- Migration cost signal:
  - no migration activity fabricated
  - checked existing signal only (none observed in reviewed window)

## 4. Unified Cost Findings
- Site-specific (`getUnifiedCostForSite` / filtered `getUnifiedCostOverview`, 30d):
  - `ai_event_count`: `6`
  - `ai_total_tokens`: `2000`
  - `ai_estimated_cost_sum`: `0`
  - `runtime_event_count`: `0`
  - `runtime_request_count`: `0`
  - `migration_event_count`: `0`
  - `total_estimated_cost`: `0`
  - `cost_completeness_status`: `AI_ONLY`
  - flags:
    - `has_zero_token_ai_events: true`
    - `missing_billing_account_in_ai_events: false`
    - `no_runtime_events_seen: true`
    - `no_migration_events_seen: true`
- Overview (30d):
  - sites with any signal: `1`
  - `ai_only_sites: 1`
  - `full_signal_sites: 0`
  - `partial_signal_sites: 0`
  - `top_cost_sites`: only Maver, total cost `0`

## 5. Attribution Quality Assessment
- Classification: `PARTIALLY_TRUSTABLE`
- Evidence:
  - AI attribution is strong for observed events (site/client/agency/billing account populated, no missing billing account).
  - Unified view correctly resolves site identity and ownership linkage.
  - Cross-signal attribution trust is incomplete because runtime and migration channels produced no events in the same horizon.

## 6. Cost Completeness Assessment
- Classification: `NOT_YET_GOOD_ENOUGH_FOR_COST_DECISIONS`
- Evidence:
  - No runtime events in `public.runtime_usage_events` (30-day query returned `0`).
  - No migration events in `public.migration_cost_events` (30-day query returned `0`).
  - AI estimated cost currently sums to `0.000000` despite token activity.
  - Resulting unified totals are structurally incomplete for pricing exploration.

## 7. Operational Gaps
Priority 1:
- Runtime signal missing in practice (no persisted runtime usage rows in 30-day production window, including after 3 live Maver requests).

Priority 2:
- Migration cost signal missing in practice (no persisted migration rows in 30-day production window).

Priority 3:
- AI cost value quality remains low for pricing work (events exist, but estimated cost is `0`, and zero-token events are present).

Priority 4:
- Debug endpoint is superadmin-gated and not directly usable from unauthenticated operational scripts without auth/session context.

## 8. Recommended Next Step
- **Runtime Cost Accuracy Improvements**
  - Reason: runtime is currently the largest missing signal family in production data; without reliable runtime ingestion, unified site-level cost completeness cannot move beyond `AI_ONLY`.

## 9. Appendix: commands / requests / limitations
- Commands and requests executed (high-signal subset):
  - `set -a; source .env.production; set +a; node -e '...DATABASE_URL_PRESENT...'`
  - `set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx -e "getUnifiedCostOverview({ days: 30 })..."`
  - `set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx /tmp/ai-cost-review-runner.ts`
  - `curl https://maver.app.pasadenagenerator.com/` (x3)
  - `set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx /tmp/unified-cost-operational-snapshot.ts`
  - `set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx /tmp/unified-cost-signal-coverage.ts`
  - `curl -i "https://app.pasadenagenerator.com/api/gnr8/debug/unified-cost?..."`
- Endpoint behavior observed:
  - live unauthenticated debug endpoint call returned `401 Unauthorized` (expected).
  - direct local route invocation without request scope failed with Next.js cookies context error (expected technical limitation for direct function-call style testing).
- SQL used (via tsx + `pg` scripts):
  - 30-day and 2-hour aggregate checks on:
    - `public.ai_usage_events`
    - `public.runtime_usage_events`
    - `public.migration_cost_events`
- Environment/data limitations:
  - `DATABASE_URL`: available
  - required auth/session for debug endpoint: not available in CLI context
  - runtime requests were live HTTP checks; runtime ingestion remained empty at data layer after those requests in this run window
