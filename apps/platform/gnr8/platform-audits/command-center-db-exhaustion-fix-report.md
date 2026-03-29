# Command Center DB Exhaustion Fix Report

## 1. Executive Summary
The `/gnr8/command-center` server render path was refactored to reduce connection/session pressure by using a request-scoped shared DB read client, bounded enrichment workloads, and cached schema introspection checks. The page now keeps ownership, cost, margin, pricing, and migration visibility while avoiding row-level DB fan-out and hard-failing optional enrichments.

## 2. Root Cause After Migration Enhancements
After migration enhancements, the page still performed multiple service calls per render (`unified cost overview`, `client org list`, `runtime migration snapshots`), each with its own DB connection and repeated schema/table existence probing. Under concurrent traffic, this amplified session usage and metadata chatter, leading to Supabase/Postgres session-mode pool exhaustion (`MaxClientsInSessionMode`).

## 3. Remaining Fan-Out Pattern(s)
Before this fix, the main pressure points were:
- Multiple independent `pool.connect()` calls during one page render path.
- Repeated `to_regclass` and `information_schema.columns` checks across services on every request.
- Unbounded migration enrichment and pricing simulation work tied to the full filtered row set.

No per-row DB reads were found in page-level simulation/margin derivation (those were in-memory already), but connection churn + repeated metadata checks remained enough to trigger exhaustion under load.

## 4. Final Page Data Loading Strategy
Final render strategy:
- One shared request-scoped `PoolClient` for primary page reads.
- One primary bounded overview read via `getUnifiedCostOverview(..., { dbClient })`.
- Ownership directory and migration snapshots loaded through the same shared client.
- Margin and pricing comparisons derived in-memory from already loaded summaries.
- Migration status derived from batched snapshot map (or fallback summary fields) with zero DB reads in row loops.

## 5. Safety Limits Applied
Hard bounds now enforced for initial render and enrichments:
- `COMMAND_CENTER_SITE_LIMIT = 50`
- `COMMAND_CENTER_MIGRATION_ENRICHMENT_LIMIT = 50`
- `COMMAND_CENTER_SIMULATION_LIMIT = 50`

Filters operate inside this bounded set; they do not bypass the cap for server-side initial render.

## 6. Graceful Degradation Strategy
Optional enrichments now degrade safely instead of crashing page render:
- If client organization directory load fails, core rows still render and ownership data from summaries remains visible.
- If runtime migration snapshot enrichment fails, migration status falls back to summary-derived heuristics.
- If pricing simulation fails for individual sites, simulation is partial while core data remains visible.
- If enrichment limits are hit, the page shows bounded-scope notices.

## 7. Validation Results
Validation commands executed from `apps/platform`:
- `pnpm exec next build` ✅ pass
- `pnpm exec tsc --noEmit` ✅ pass

Note: `next build` attempted to auto-adjust `tsconfig.json`; those incidental config changes were reverted after validation so only fix-related files remain.

## 8. Remaining Risks
- Superadmin auth (`supabase.auth.getUser()`) still adds one external auth call per request; this is expected and unchanged.
- If traffic grows significantly, one-per-request DB reads may still need broader cross-route consolidation or caching policy tuning.
- Schema cache uses a short module-level TTL; immediate schema changes may take up to cache TTL to reflect.
