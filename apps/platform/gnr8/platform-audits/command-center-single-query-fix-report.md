# Command Center Single-Query Fix Report

## 1. Root Cause
`/gnr8/command-center` render still composed multiple read services (`unified-cost-view-service`, `command-center-assignment-service`, `command-center-migration-service`) inside one server-side page request. Even with reduced fan-out, this path still amplified session-mode connection pressure by combining layered service reads, schema-introspection checks, and optional enrichment reads during render. Under concurrent serverless invocations, this could still trigger `MaxClientsInSessionMode`.

## 2. Previous Approach vs New Approach
Previous approach:
- Page imported and orchestrated multiple services directly.
- Render path used a shared connected client and still traversed multiple service layers.
- Migration snapshot, client list, and cost overview were separate service calls.
- Optional failures were partly handled, but read orchestration remained layered and connection-sensitive.

New approach:
- Page now calls only `getCommandCenterReadModel()`.
- New dedicated read-model service: `apps/platform/gnr8/command-center/command-center-read-model.ts`.
- Consolidated SQL path loads site ownership, unified cost inputs, runtime migration snapshot signals, and client directory in one bounded payload.
- Margin/pricing derivation remains strictly in-memory (`mapSiteMargin`, `compareSiteAcrossPlansFromSummary`) with no DB reads.
- Fallback path returns core rows if consolidated enrichment query fails.

## 3. Final Read Path
1. `requireSuperadminUserIdForPage()` guard (unchanged protection).
2. `getCommandCenterReadModel({ clientId, limit })` from page.
3. Read model executes:
   - Metadata query (table/column availability, once per request).
   - Consolidated payload query (sites + ownership + AI/runtime/migration aggregates + runtime version snapshot + client directory).
4. Page computes:
   - Profitability filter in memory.
   - Margin and pricing simulation in memory.
   - Migration badge/status derivation in memory from read-model fields.
5. Render table.

## 4. Query Count Reduction
Before (render path effective pattern):
- Multiple service calls and schema checks, commonly resulting in many queries per request and layered read complexity.

After:
- Normal path: 2 DB queries per render (`metadata` + `consolidated payload`).
- Fallback path: 3-4 bounded queries (only when consolidated enrichment fails).
- Query count is surfaced to UI via instrumentation (`Read model query count this render`).

## 5. Connection Safety Rationale
- Page render no longer composes multiple DB-reading services.
- No `pool.connect()` in page render path.
- Read model uses bounded `pool.query(...)` calls and a single consolidated data query for the main payload.
- Site scope is capped at render limit (`50`) before heavy aggregation to keep read work bounded.
- Optional enrichment failure no longer hard-fails the page: fallback core read keeps command-center usable.
- This materially reduces per-request session occupancy and cross-service connection churn in serverless session mode.

## 6. Validation
Executed in `apps/platform`:
- `pnpm exec next build` ✅
- `pnpm exec tsc --noEmit` ✅

Notes:
- `tsc` initially failed before `.next/types` was fully present; after build generation and final fixes, both validations passed.
- Production-open verification after deploy was not performed in this local task run.

## 7. Remaining Risks
- Read model still performs one metadata query + one consolidated query (not a literal single query).
- If schema diverges unexpectedly, fallback can show reduced enrichment (core rows still render).
- Runtime snapshot quality depends on `gnr8_runtime_site_versions` schema consistency.
- True production behavior still depends on deploy environment/session settings and live traffic profile.
