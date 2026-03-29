# Command Center Serverless DB Access Fix Report

## 1. Executive Summary
The `/gnr8/command-center` page render path was moved off raw `pg`/`DATABASE_URL` session-pool access and onto a stateless Supabase service-role PostgREST read path. The page still loads through one consolidated read-model loader, keeps ownership/cost/margin/pricing/migration visibility, and now reports explicit DB mode diagnostics per render.

## 2. Previous DB Access Strategy
Previous render path:
- Page auth guard: Supabase SSR (`@supabase/ssr`) via `supabase.auth.getUser()`.
- Read model: `apps/platform/gnr8/command-center/command-center-read-model.ts` used `getSuperadminPool()` from `apps/platform/src/superadmin/db.ts`.
- DB client: raw `pg` `Pool` over `DATABASE_URL` (`new Pool(...)`) with SQL aggregation/fallback queries through `pool.query(...)`.

This created a mixed-mode request path: auth over stateless Supabase HTTP, data reads over pooled PostgreSQL sessions.

## 3. Why It Failed Under Session Pool Limits
In serverless render concurrency, request bursts can stampede `pg` session clients behind `DATABASE_URL` pooler constraints. Even with reduced query count and consolidated SQL, the remaining mode was still session-client based, so render traffic could still hit Supabase session pool limits and fail with:

`MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size`.

## 4. New DB Access Strategy
New render/read-model strategy:
- Read model no longer imports `getSuperadminPool` and no longer uses `pg` in the Command Center render path.
- Added `apps/platform/src/supabase/service-role-server.ts` to build a server-only Supabase service-role client.
- `getCommandCenterReadModel(...)` now uses Supabase PostgREST table reads (stateless HTTP) and in-memory consolidation.
- Loader remains consolidated and single-entry from the page.
- Optional enrichments (AI/runtime/migration/runtime-version snapshots) are bounded and degrade safely.

## 5. Why The New Strategy Is Serverless-Safe
The Command Center page path now avoids session checkout APIs (`pool.connect`) and avoids request-time raw PostgreSQL session pooling for read-model queries. PostgREST calls are stateless request/response operations, reducing per-render session stickiness and making the route materially safer under Vercel serverless concurrency.

Diagnostic instrumentation now includes:
- `db_access_mode`
- `stateless_read_path`
- `fallback_used`
- `fallback_reason`
- `query_count`

## 6. Validation Results
Validation run from `apps/platform`:
- `pnpm exec tsc --noEmit` (executed after this change)
- `pnpm exec next build` (executed after this change)

Both command results are documented in the task output summary.

## 7. Remaining Risks
- If `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` is missing, the read model returns safe fallback diagnostics and no data.
- PostgREST enrichment scans are bounded; very high event volume can trigger capped enrichment and partial diagnostics.
- Full production verification of eliminated `MaxClientsInSessionMode` requires post-deploy observation in production logs/monitoring.
