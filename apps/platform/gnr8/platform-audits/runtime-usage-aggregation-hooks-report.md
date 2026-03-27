# Runtime Usage Aggregation Hooks Report

## Scope
Implemented lightweight runtime usage aggregation for public runtime requests and periodic persistence into `public.runtime_usage_events`.

## Hook Placement
Runtime usage hook is placed in:

- `apps/platform/src/public-site/public-runtime-render.tsx`

Inside `renderPublicPathResponse`, after artifact resolution outcome is known:

- `artifact_hit`: increments usage for resolved `siteId`/`artifactId`
- `artifact_miss` / governance denied: increments usage when `siteId` exists
- unbound host (`siteId` missing): safely skipped

The request-path hook does not perform DB writes.

## Aggregation Design
Collector module:

- `apps/platform/gnr8/runtime/runtime-usage-collector.ts`

Behavior:

- in-memory `Map<siteId, aggregate>`
- counters per site:
  - `requestCount`
  - `bandwidthBytes`
  - `computeMs`
- tracks `periodStart`, `periodEnd`, `lastUpdated`
- merges artifact IDs conservatively
  - keeps artifact id when stable
  - sets artifact id to `null` when multiple artifact ids are observed for same site aggregate window

## Flush Strategy
Flusher module:

- `apps/platform/gnr8/runtime/runtime-usage-flusher.ts`

Behavior:

- periodic flush loop started lazily on first usage write attempt
- default interval: `30000ms` (override with `GNR8_RUNTIME_USAGE_FLUSH_INTERVAL_MS`)
- drains in-memory aggregates and writes one row per site aggregate window via `logRuntimeUsageEvent`
- resets counters after drain
- if a write fails, aggregate is requeued for retry (eventual consistency)

## Billing Resolution Integration
Before each write, flusher resolves billing context via:

- `resolveBillingContextForSite(siteId)`

If billing context cannot be resolved:

- logs warning
- skips event write
- does not crash runtime path

Persisted runtime event row includes:

- `billing_account_id`
- `agency_id`
- `client_id`
- `site_id`
- `artifact_id` (nullable)
- `request_count`
- `bandwidth_bytes`
- `compute_ms`
- `estimated_cost` (currently `0`)
- `period_start`
- `period_end`

## Measurement Model
Measured:

- `request_count`: exact increment by request
- `bandwidth_bytes`: UTF-8 byte length of response HTML payload generated for runtime artifact hit/miss paths

Approximated:

- `compute_ms`: wall-clock `Date.now()` delta for `renderPublicPathResponse` execution

Not measured in this phase:

- streamed body transfer bytes
- upstream shadow asset proxy egress bytes
- infra-level CPU/network billing signals

## Validation Results
Command results:

1. `pnpm exec tsc --noEmit`
- pass

2. Runtime tests
- executed: `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/*.test.ts src/public-site/public-runtime-render.test.ts`
- result: 34 passed, 1 skipped, 1 failed
- failing test: `gnr8/runtime/runtime-happy-path.integration.test.ts`
- failure reason: requires `DATABASE_URL` (environment gate), not code regression
- newly added runtime usage tests all passed:
  - `gnr8/runtime/runtime-usage-collector.test.ts`
  - `gnr8/runtime/runtime-usage-flusher.test.ts`

3. `cd apps/platform && pnpm exec next build`
- pass

Database verification in this run:

- not executed because `DATABASE_URL` was not available in the current test context for runtime integration assertion path.

## Debug Visibility
Warnings emitted with stable prefixes for operational tracing:

- `[runtime-usage-flush] ...`
- `[gnr8.public-runtime.usage] ...`

Useful verification query:

```sql
select *
from public.runtime_usage_events
order by created_at desc
limit 20;
```

## Limitations
- Aggregation is process-local in-memory; counters do not survive process restart.
- Multi-instance deployments aggregate independently per instance.
- Asset proxy responses (`/assets/*`, `/uploads/*`) are not yet attributed to runtime usage counters.
- Cost center IDs are resolved in context but are not persisted in `runtime_usage_events` schema.
