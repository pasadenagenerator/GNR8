# DB Schema Retirement Plan (Legacy Builder / ChaiBuilder)

## 1. Executive Summary

- Builder-related schema likely still exists in production DB, with `public.builder_pages` as the only concretely evidenced legacy object from repository history/docs.
- Active repo code (non-doc files) no longer references `public.builder_pages`, `/api/builder/*`, `BUILDER_INTERNAL_API_KEY`, or `gnr8/builder-only` modules.
- Immediate destructive removal is **not** safe yet because this workspace does not include authoritative DB migration SQL, row counts, dependency metadata, or live policy/index/function inventory from the target database.
- Correct next DB step: perform **manual production DB verification** and dependency/row-count snapshot before any DROP/ALTER/DELETE.

## 2. Builder-Related Schema Inventory

Evidence basis:
- Current executable code scan in `apps/platform` and `packages/data`.
- Existing chai-removal reports in `apps/platform/gnr8/chai-removal/*.md`.
- Runtime/storage modules defining current canonical tables (`gnr8/core/page-storage.ts`, `gnr8/runtime/runtime-store.ts`).

| Object name | Object type | Likely purpose | Source of evidence | Status guess |
|---|---|---|---|---|
| `public.builder_pages` | table | Legacy builder page storage used by retired builder API/editor flows | Historical reports: `chai-editor-api-isolation-review.md`, `chai-unknown-usage-verification.md`, `builder-api-decommission.md`; runtime regression guard in `src/public-site/public-runtime-render.test.ts` | LEGACY |
| `public.builder_pages` dependent indexes/constraints (names unknown) | index/constraint | Likely uniqueness/performance support for builder page lookups/upserts | Inferred from historical upsert/read behavior in chai-removal docs; no live DDL in repo | UNKNOWN |
| `public.builder_pages` RLS policies (names unknown) | policy | Possible access control if table was managed under Supabase policy model | No policy SQL files present; historical builder API enforced auth in app layer | UNKNOWN |
| `public.builder_pages` triggers/functions (names unknown) | function/trigger | Possible timestamp/audit helpers tied to builder table | No SQL migration files or function DDL found in repo | UNKNOWN |
| Builder-specific columns on shared active tables | column set | Legacy coupling into otherwise-active tables | No builder-specific columns found in current repository SQL/query code; live DB not introspected | UNKNOWN |
| `public.gnr8_pages`, `public.gnr8_page_versions` | table | Active GNR8 page save/publish storage | `gnr8/core/page-storage.ts` | ACTIVE (not builder-related) |
| `public.gnr8_runtime_*` tables | table/index | Active runtime artifact/version/host/pointer/form storage | `gnr8/runtime/runtime-store.ts` | ACTIVE (not builder-related) |

Notes:
- No `.sql` migration/schema files were found in this workspace (`rg --files -g '*.sql'` returned none).
- No confirmed builder-specific views were found in current repo.

## 3. Active Code Reference Verification

Verification scope (minimum requested areas):
- `apps/platform` app/runtime/auth/publish code
- `packages/data` repository SQL helpers
- chai-removal docs under `apps/platform/gnr8/chai-removal`

Primary result:
- Non-doc reference scan for `public.builder_pages|builder_pages|/api/builder|BUILDER_INTERNAL_API_KEY|gnr8/builder-only|@gnr8/builder-only` found only one regression test assertion proving absence of runtime fallback (`public-runtime-render.test.ts`).

Classification by object:

| Object | Reference classification | Evidence |
|---|---|---|
| `public.builder_pages` | NO_ACTIVE_CODE_REFERENCE | `rg -n "public\.builder_pages|builder_pages|/api/builder|BUILDER_INTERNAL_API_KEY|gnr8/builder-only|@gnr8/builder-only" apps/platform ...` -> only `src/public-site/public-runtime-render.test.ts` guard assertion |
| Builder-table dependent indexes/constraints (unknown names) | UNKNOWN_REFERENCE | No DDL files or DB metadata in workspace to enumerate object names |
| Builder-table policies (unknown names) | UNKNOWN_REFERENCE | No `create policy/alter policy/enable row level security` statements found in repo; no live DB policy inventory |
| Builder-table functions/triggers (unknown names) | UNKNOWN_REFERENCE | No builder-specific SQL function/trigger definitions found in workspace |
| `public.gnr8_pages`, `public.gnr8_page_versions`, `public.gnr8_runtime_*` | ACTIVE_CODE_REFERENCE | Referenced and created/used in `gnr8/core/page-storage.ts` and `gnr8/runtime/runtime-store.ts` |

## 4. Data / Historical Value Assessment

| Object group | Assessment | Rationale |
|---|---|---|
| `public.builder_pages` rows | HISTORICAL_VALUE | Likely contains legacy builder/editor page data; could be useful for forensic review, rollback narratives, or migration provenance |
| Builder-table dependent indexes/policies/functions/triggers (if present) | SAFE_TO_ARCHIVE_FIRST | Metadata should be captured (DDL definitions) before retirement to preserve reconstruction capability |
| Builder-specific columns on shared tables (if any) | UNKNOWN_DATA_VALUE | Cannot confirm presence/usage without live schema introspection |
| Active `gnr8_*` canonical/runtime tables | HISTORICAL_VALUE (must retain) | These are active runtime/platform data paths and out of scope for builder retirement |

Important constraint:
- No row-count evidence is available from this environment; emptiness/non-use cannot be assumed.

## 5. Safe Retirement Categories

### A. Safe to retire after backup/export
- `public.builder_pages` table (only after schema+data snapshot export and dependency check pass).
- Builder-specific indexes/policies/functions/triggers directly attached to `public.builder_pages` (if confirmed).

### B. Safe to retire after one more manual DB verification
- Any builder-residual columns on shared tables (only if proven unused and builder-only).
- Any builder-named views/materialized views discovered in live DB but absent from repo.

### C. Must retain for now
- `public.gnr8_pages`, `public.gnr8_page_versions`.
- `public.gnr8_runtime_sites`, `public.gnr8_runtime_host_bindings`, `public.gnr8_runtime_pages`, `public.gnr8_runtime_site_versions`, `public.gnr8_runtime_page_versions`, `public.gnr8_runtime_artifacts`, `public.gnr8_runtime_active_pointers`, `public.gnr8_runtime_version_audit`, `public.gnr8_runtime_form_submissions`.
- Shared org/billing/auth tables used by `packages/data` (`organizations`, `memberships`, `projects`, `audit_logs`, `subscriptions`, `entitlements`, etc.).

### D. Not actually builder-related / false positives
- Source-code strings like `builderFallbackUsed` and forbidden marker checks (`chaibuilder`, `data-builder-`) in runtime tests/CLI; these are guard rails, not active DB coupling.

## 6. Recommended Retirement Sequence

### Stage 1 — Manual inventory + snapshot (non-destructive)
- Export full schema metadata for builder candidates (`builder_pages`, dependent indexes, policies, triggers, functions, FK deps).
- Capture row count/sample profile and last-update timestamps for `public.builder_pages`.
- Capture dependency graph (views, functions, triggers, foreign keys, grants, policy bindings).

### Stage 2 — Runtime/reference reconfirmation gate
- Re-run repository grep gate (non-doc files) to confirm zero builder DB references.
- Validate production logs/queries (if available) show no reads/writes against `public.builder_pages` over agreed observation window.

### Stage 3 — Archival artifact generation
- Produce immutable export artifacts:
  - table DDL
  - policy/index/function/trigger DDL
  - data export for `public.builder_pages`
  - row-count + checksum report

### Stage 4 — Draft destructive migration plan (not executed in this task)
- Prepare phase-1 migration proposal targeting builder-only objects only.
- Include explicit dependency guards (`if exists`, preflight checks) and rollback notes.

### Stage 5 — Execute in controlled order (future task)
- Drop builder-only dependencies first (views/triggers/functions/policies/indexes as needed), then table.
- Post-drop verification for query failures, runtime health, and absence of orphan dependencies.

## 7. Preconditions Before Any DROP

1. Confirm zero active code references (already true in repo; must be rechecked at execution time).
2. Confirm zero production usage over a defined observation window.
3. Complete schema + data backup/export for all builder-related objects.
4. Review row counts and data sampling for historical/audit relevance.
5. Verify foreign-key and object dependencies (`pg_depend`, `pg_constraint`, view/function deps).
6. Verify policy/trigger/function bindings on target objects.
7. Obtain explicit manual approval for destructive migration execution.
8. Ensure migration excludes active canonical/runtime/shared tables.

## 8. Risks / Unknowns

- No direct DB introspection in this task environment (cannot prove object existence beyond repository evidence).
- No row counts or storage statistics for `public.builder_pages` were available.
- No checked-in SQL migration history exists in this workspace to enumerate exact policy/index/function names.
- Possible external ops scripts/dashboards/manual SQL not represented in repo.
- Historical docs can become stale; current truth must be confirmed against live DB metadata before destructive steps.

## 9. Proposed Future Migration Tasks

1. **Builder Schema Snapshot / Export**
   - Dump DDL + data + dependency map for `public.builder_pages` and attached objects.
2. **Builder Table Dependency Verification**
   - Validate no remaining DB object dependencies and no live traffic.
3. **Builder Schema Drop Migration (Phase 1)**
   - Drop builder-only dependent objects then `public.builder_pages` in guarded sequence.
4. **Builder Policy / Trigger Cleanup**
   - Remove residual builder-named policies/functions/triggers not dropped in phase 1.
5. **Final Legacy Data Purge Verification**
   - Confirm zero residue and no runtime regressions after deployment.

## 10. Appendix: evidence paths / queries / files inspected

### Exact search commands used

```bash
rg --files -g '*.sql'

rg -n "builder_pages|public\.builder_pages|from\(\s*['\"]builder_pages['\"]\s*\)|from\(\s*['\"]builder_|chai|builder_" apps/platform --glob '!**/node_modules/**'

rg -n "builder_pages|public\.builder_pages|builder_page|builder_" --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/*.md'

rg -n "public\.builder_pages|builder_pages|/api/builder|BUILDER_INTERNAL_API_KEY|gnr8/builder-only|@gnr8/builder-only" apps/platform --glob '!**/*.md' --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/tsconfig.tsbuildinfo'

rg -n "create policy|alter policy|enable row level security" apps/platform packages/data --glob '!**/*.md' --glob '!**/node_modules/**' --glob '!**/.next/**' --glob '!**/dist/**' --glob '!**/tsconfig.tsbuildinfo'

rg -n "create table if not exists public\.gnr8_runtime_|create table if not exists public\.gnr8_pages|create table if not exists public\.gnr8_page_versions" apps/platform/gnr8/runtime/runtime-store.ts apps/platform/gnr8/core/page-storage.ts

rg -n "public\.[a-z0-9_]+" apps/platform/gnr8/runtime/runtime-store.ts apps/platform/gnr8/core/page-storage.ts apps/platform/gnr8/migration-factory/migration-job-store.ts apps/platform/src/superadmin/db.ts packages/data/src/repositories/*.ts
```

### Files inspected

- `apps/platform/gnr8/chai-removal/builder-api-decommission.md`
- `apps/platform/gnr8/chai-removal/chai-editor-api-isolation-review.md`
- `apps/platform/gnr8/chai-removal/chai-unknown-usage-verification.md`
- `apps/platform/gnr8/chai-removal/chai-hard-delete-phase-c.md`
- `apps/platform/gnr8/chai-removal/chai-package-removal-phase-1.md`
- `apps/platform/chai-boundary-enforcement-report.md`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/src/public-site/public-runtime-render.test.ts`
- `apps/platform/src/auth/require-actor-user-id.ts`
- `apps/platform/src/auth/supabase-server.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/core/page-storage.ts`
- `apps/platform/app/api/gnr8/pages/save/route.ts`
- `apps/platform/app/api/gnr8/pages/publish/route.ts`
- `apps/platform/app/api/gnr8/pages/[slug]/route.ts`
- `packages/data/src/repositories/*.ts`

### Limitations

- No direct DB query execution against production/staging in this task.
- No Supabase metadata dump/migration directory present in workspace.
- Historical doc statements were treated as supporting evidence, but live DB metadata remains the final authority.
