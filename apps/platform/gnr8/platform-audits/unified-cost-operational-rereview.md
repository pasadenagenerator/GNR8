# Unified Cost Operational Re-Review

Date: 2026-03-27  
Environment: `apps/platform` with `.env.production` loaded (`DATABASE_URL` present)

## 1. Executive Summary
- Unified cost read layer is operationally working for site-level summaries and overview rollups.
- Runtime signal is now present together with AI signal for the reviewed production-bound site.
- Attribution remains correct for observed AI and runtime events (site/client/agency/billing account populated on recent rows).
- Single biggest remaining gap: cost **value** quality is still not decision-grade because AI/runtime `estimated_cost` remains `0` and migration signal is absent.

## 2. Sites Reviewed
- Primary reviewed site: `91fb0854-9b84-4c4b-aff4-777043ab6451` (`maver.app.pasadenagenerator.com`)
- Why chosen:
  - known real production-bound site
  - previously used in runtime fix validation and prior unified-cost review
  - valid ownership/client assignment already established
- Ownership/client assignment status during this re-review:
  - `client_id`: `61b953f8-ca84-417a-b275-eca1bb18bca7`
  - `client_name`: `Transporti Maver`
  - `agency_id`: `00000000-0000-4000-8000-000000000001`

## 3. Activity Triggered
- AI actions triggered (all successful `200`):
  - `POST /api/gnr8/ai/layout`
  - `POST /api/gnr8/ai/layout-and-save`
  - `POST /api/gnr8/ai/edit-and-save`
- Runtime requests triggered:
  - `GET https://maver.app.pasadenagenerator.com/` x3
  - observed statuses: `200, 200, 200`
- Migration signal:
  - no migration events were fabricated
  - existing migration signal was observed only (none present for this site/window)

## 4. Unified Cost Findings
### Maver (`site_id=91fb0854-9b84-4c4b-aff4-777043ab6451`, 30d)
- `site_id`: `91fb0854-9b84-4c4b-aff4-777043ab6451`
- `domain`: `maver.app.pasadenagenerator.com`
- `site_status`: `live`
- `client_id`: `61b953f8-ca84-417a-b275-eca1bb18bca7`
- `client_name`: `Transporti Maver`
- `agency_id`: `00000000-0000-4000-8000-000000000001`
- `ai_event_count`: `12`
- `ai_total_tokens`: `4600`
- `ai_estimated_cost_sum`: `0`
- `runtime_event_count`: `17`
- `runtime_request_count`: `17`
- `runtime_estimated_cost_sum`: `0`
- `migration_event_count`: `0`
- `migration_estimated_cost_sum`: `0`
- `total_estimated_cost`: `0`
- `cost_completeness_status`: `PARTIAL_SIGNAL`
- quality flags:
  - `has_zero_token_ai_events: true`
  - `missing_billing_account_in_ai_events: false`
  - `no_runtime_events_seen: false`
  - `no_migration_events_seen: true`

### Overview patterns (30d)
- `top_cost_sites`: Maver only
- aggregate totals:
  - `site_count: 1`
  - `ai_event_count: 12`
  - `runtime_event_count: 17`
  - `migration_event_count: 0`
  - `total_estimated_cost: 0`
- summary counts:
  - `partial_signal_sites: 1`
  - `ai_only_sites: 0`
  - `full_signal_sites: 0`

## 5. Comparison vs Previous Review
Prior review (`apps/platform/gnr8/platform-audits/unified-cost-operational-review.md`) baseline:
- `cost_completeness_status: AI_ONLY`
- `runtime_event_count: 0`
- `runtime_request_count: 0`

Now (this re-review):
- `cost_completeness_status` moved to `PARTIAL_SIGNAL`
- `runtime_event_count` is now `17`
- `runtime_request_count` is now `17`
- runtime and AI are visible together in the same 30-day unified summary
- attribution remained stable (site/client/agency and non-null billing account on sampled AI/runtime rows)

What improved:
- runtime signal is now consistently visible and attributable in unified output
- completeness class improved from `AI_ONLY` to `PARTIAL_SIGNAL`

What remains missing:
- migration signal absent (`0`)
- all estimated cost sums remain `0`

## 6. Attribution Quality Assessment
Classification: `TRUSTABLE_FOR_INTERNAL_USE`

Evidence:
- Latest sampled AI rows include consistent `site_id`, `client_id`, `agency_id`, and non-null `billing_account_id`.
- Latest sampled runtime rows include consistent `site_id`, `client_id`, `agency_id`, and non-null `billing_account_id`.
- Unified site summary ownership fields align with known Maver ownership assignment.
- `missing_billing_account_in_ai_events` stayed `false`.

## 7. Cost Completeness Assessment
Classification: `NOT_YET_GOOD_ENOUGH_FOR_COST_DECISIONS`

Evidence:
- Signal presence is improved (`PARTIAL_SIGNAL`), but cost magnitudes remain non-informative:
  - `ai_estimated_cost_sum = 0`
  - `runtime_estimated_cost_sum = 0`
  - `total_estimated_cost = 0`
- migration cost signal is still absent (`migration_event_count = 0`).
- This is adequate for operational signal-health monitoring, but not yet adequate for phase-1 pricing or margin decision-making.

## 8. Remaining Gaps
Priority 1:
- Cost precision gap: AI/runtime events are present but `estimated_cost` remains `0`, so unified totals are not monetarily actionable.

Priority 2:
- Migration signal gap: no migration events/cost in reviewed window, preventing `FULL_SIGNAL` completeness.

Priority 3:
- AI quality flag remains (`has_zero_token_ai_events: true`), indicating token-signal consistency still needs tightening.

Priority 4:
- Site coverage is still narrow (one high-confidence site reviewed), so fleet-wide confidence is not yet established.

Priority 5:
- Debug endpoint remains superadmin-gated; unauthenticated operational scripts cannot consume it directly.

## 9. Recommended Next Step
- **Runtime Cost Precision Improvements**

Reason:
- The runtime ingestion/attribution pipeline is now functioning and visible in unified summaries.
- The biggest blocker to pricing/margin readiness is not missing runtime signal anymore; it is that unified cost values remain `0` (AI/runtime), so cost totals cannot support pricing hypotheses.

## 10. Appendix: commands / requests / limitations
Commands / requests used (high-signal subset):
- `cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' node --import tsx gnr8/validation/runtime/unified-cost-operational-rereview-runner.ts`
- `curl "https://app.pasadenagenerator.com/api/gnr8/debug/unified-cost?siteId=...&days=30&limit=1"`
- `curl "https://app.pasadenagenerator.com/api/gnr8/debug/unified-cost?clientId=...&days=30&limit=1"`
- `curl "https://app.pasadenagenerator.com/api/gnr8/debug/unified-cost?agencyId=...&days=30&limit=1"`

Read surfaces validated:
- `getUnifiedCostForSite(siteId)` (direct execution against production DB)
- `getUnifiedCostOverview(filters)` with:
  - `siteId`
  - `clientId`
  - `agencyId`
  - `days`
  - `limit`
- `GET /api/gnr8/debug/unified-cost`:
  - route reachable
  - unauthenticated response remained `401 Unauthorized` for tested filter variants

SQL checks used (inside runner):
- 2-hour signal counts on:
  - `public.ai_usage_events`
  - `public.runtime_usage_events`
  - `public.migration_cost_events`
- recent-row attribution sampling from AI/runtime/migration tables
- schema column introspection via `information_schema.columns`

Environment / access limitations:
- `DATABASE_URL`: available in `.env.production`
- debug endpoint requires superadmin auth context not available in unauthenticated CLI curl
- only one production-bound site was reviewed in this run (chosen for confidence over breadth)
