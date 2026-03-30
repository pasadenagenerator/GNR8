# Internal Platform Architecture Review

Date: 2026-03-30  
Scope: Current-state architecture consolidation for GNR8 platform (code and enforcement paths in `apps/platform`)

## 1. Executive Summary

GNR8 is now architecturally a layered migration-to-runtime platform with an explicit ownership/agency model and a growing economics/operations control plane.

The architecture is coherent in its core read surface:
- Command Center and Agency Dashboard are now read-model-driven surfaces.
- Page-safe auth/data access boundaries are explicitly split (read-only vs mutating vs service-role).
- Runtime publish flow has a real governance + activation gate sequence.
- Cost visibility is unified across AI/runtime/migration events and projected through margin/pricing simulations.

Strongest parts:
- Stateless service-role PostgREST read model for command-center-style pages.
- Fail-closed current-agency resolver for multi-membership users.
- Publish activation safety stack (enforcement, artifact integrity, lineage checks, pointer safety).
- Operational bulk-action reliability model with structured outcomes/retries.

Most important risks:
- Mixed data-access architecture remains: canonical read-model paths are stateless, but many write/runtime/billing services still rely on raw `pg` pool.
- Several runtime version endpoints are not protected by explicit auth/role checks.
- Active agency context is still query-param based (not persisted at session/profile level).
- RLS is stronger for reads than writes; role/action authorization is still incomplete for operational mutations.
- Runtime host fallback (`fallback_latest_site`) remains an intentional but risky compatibility path.

Bottom line: architecture is solid and production-usable for current operating mode, but still in a transitional phase where canonical patterns coexist with legacy internals.

## 2. Canonical Architecture Map

### Platform Layers

1. Migration ingestion and canonicalization
- URL/HTML import and normalization (`gnr8/importer`, `gnr8/import`, validation shells)
- Canonical migration input construction (`gnr8/runtime/migration-factory.ts`)
- Migration governance quality gates and rollout policy (`gnr8/migration/quality-gates`, `gnr8/migration/policy`, `gnr8/migration/enforcement`)

2. Runtime versioning and serving
- Runtime site/version/artifact/pointer model (`gnr8/runtime/runtime-store.ts`)
- Version lifecycle transitions (`gnr8/runtime/version-lifecycle-enforcer.ts`)
- Publish artifact build + enforcement + activation (`gnr8/runtime/publish-activation-orchestrator.ts`)
- Public runtime resolution + usage logging (`src/public-site/public-runtime-render.tsx`)

3. Ownership and tenancy
- Agencies, organizations, memberships, sites model via Supabase migrations
- Current-agency membership resolution and fail-closed selection (`src/auth/resolve-current-agency.ts`)
- Agency- and membership-scoped UI surfaces (`/gnr8/agency`, `/gnr8/command-center`)

4. Economics and billing
- Event logging for AI/runtime/migration usage (`gnr8/billing/cost-event-logging-service.ts`)
- Unified cost view + completeness/data-quality classification (`gnr8/billing/unified-cost-view-service.ts`)
- Margin and pricing simulations (`gnr8/billing/margin-service.ts`, `gnr8/billing/pricing-simulation-service.ts`)

5. Operational UI surfaces
- Migration Command Center (`app/gnr8/command-center`)
- Agency Dashboard (`app/gnr8/agency`)
- Bulk action reliability and assignment controls (`gnr8/command-center/*`)

6. Auth and data-access boundaries
- Page-safe read-only Supabase helper (`src/auth/supabase-server-read-only.ts`)
- Mutating Supabase helper for actions/routes (`src/auth/supabase-server-mutating.ts`)
- Stateless service-role Supabase helper (`src/supabase/service-role-server.ts`)
- Lint/document enforcement (`apps/platform/.eslintrc.json`, `gnr8-supabase-architecture.md`, `ai-rules.md`)

## 3. Official Patterns

The following should be treated as canonical and officially approved:

1. `read-model -> page` for operational dashboards
- Command Center and Agency Dashboard use consolidated read-model loaders.
- Data enrichment is in-memory after bounded data fetches.

2. Stateless service-role PostgREST for server-render read models
- Command-center read path uses `getSupabaseServiceRoleClient()` and bounded batched PostgREST reads.
- Instrumentation exposes fallback/partial data states instead of silent failure.

3. Explicit auth helper split by execution mode
- Page render: `getSupabaseServerClientReadOnly()`.
- Mutations/login/actions/routes: `getSupabaseServerClientMutating()`.
- Service-role stateless server reads: `getSupabaseServiceRoleClient()`.

4. Fail-closed agency resolution for tenant scope
- `resolveCurrentUserAgencyForPage` + `selectCurrentAgencyMembership` enforce no implicit tenant selection.
- Multiple memberships require explicit active agency input.

5. Ownership/cost/runtime truth via consolidated models
- Site summaries derive cost completeness and migration status from combined evidence.
- Agency dashboard composes from command-center read model + margin + pricing simulation.

6. Governance-first publish activation
- Enforce migration governance before publish (`evaluatePublishEnforcement`).
- Validate candidate lineage/artifact integrity before pointer switch.
- Pointer switch guarded with safe no-op handling and publish safety assertions.

7. Structured operational reliability for bulk actions
- Canonical per-item outcome model (`succeeded/failed/skipped`, reason codes, retryability).
- Partial failures are isolated; retries are explicit.

8. Additive schema evolution with compatibility bridges
- `organization_id` and legacy `org_id` coexist via sync trigger.
- Ownership linkage to runtime versions uses additive `ownership_site_id`.

## 4. Transitional / Legacy Patterns

These patterns still exist and should be treated as transitional (not preferred for net-new work):

1. Raw `pg` pool services for many runtime/billing/mutation internals
- Command-center page reads are stateless now, but core runtime store and many billing services still depend on `getSuperadminPool()`.

2. Query-param active agency selection (`?agency=`)
- Correctly fail-closed, but not persisted as durable user/session preference.

3. Legacy compatibility fields and assumptions
- Membership dual columns (`organization_id` + `org_id`) remain necessary.
- Ownership backfill logic still includes home-agency and singleton-client assumptions.

4. Runtime host fallback to latest site
- Runtime resolution allows `fallback_latest_site` when host binding is missing.
- Useful for compatibility/debug; risky as a default production behavior.

5. Mixed runtime usage paths retained for compatibility
- Per-request runtime usage logging is the active path.
- Collector/flusher timer path remains as legacy compatibility.

6. Approximate economic constants and simplified pricing
- Cost model constants are flat approximations.
- Margin service still contains backward-compatible flat pricing assumptions.

7. Path-based lint enforcement limits
- Effective guardrails exist, but enforcement is directory/path scoped and not fully semantic across all client/server contexts.

## 5. Production-Safe Paths

The following paths are currently production-safe for their intended scope:

1. Command Center render read path
- Uses stateless service-role PostgREST reads with bounded batch sizes and explicit fallback instrumentation.

2. Agency Dashboard read path
- Uses fail-closed agency resolution and agency-scoped read model composition.
- Includes explicit agency-scope assertion to prevent accidental cross-tenant leakage.

3. Page-safe auth resolution
- Read-only Supabase helper avoids cookie mutation in render paths.
- Mutating helper is separated for action/route contexts.

4. Publish activation critical path
- Includes enforcement decisions, artifact governance checks, lineage checks, render-integrity checks, pointer safety checks, and audit logging.

5. Runtime usage signal persistence (current path)
- Public runtime render writes runtime usage events per request using ownership-aware billing context.

6. Bulk action reliability layer
- Structured item-level outcomes, deterministic skip/failure handling, and retry subsets make operator behavior predictable.

## 6. Architecture Risks / Technical Debt

Priority-ordered risks:

1. Missing explicit authorization on several runtime mutation endpoints (High)
- Runtime version routes (`ready/approve/publish/rollback/preview`) do not consistently enforce superadmin or role-scoped checks.
- Operational security currently relies too much on surface assumptions.

2. Hybrid data-access architecture (High)
- Canonical read models are stateless PostgREST, but many platform internals still use raw `pg` pools.
- Increases architectural drift and inconsistent failure modes.

3. Active agency context not durably persisted (High)
- Query-param based active selection is explicit but brittle for UX and automation.

4. Incomplete role/action gating (Medium-High)
- Membership roles are modeled and resolved, but mutation authorization matrix is still minimal.

5. Read-heavy RLS hardening; write-policy depth still limited (Medium)
- RLS scope for select is improved, but comprehensive write-path policy enforcement is not fully represented.

6. Runtime host fallback behavior can mask binding errors (Medium)
- `fallback_latest_site` can route traffic without explicit host binding.

7. Economic precision and model realism gaps (Medium)
- Current cost constants and flat model remain intentionally approximate.

8. Legacy compatibility burden (Medium)
- `org_id`/`organization_id` duality and home-agency/singleton assumptions increase cognitive load and migration complexity.

## 7. Recommended Standardization Priorities

1. Role/action gating refinement for runtime and operational mutation endpoints
- Make authorization explicit and centralized for all approve/publish/rollback/import actions.

2. Durable active-agency persistence
- Replace query-param selection as primary context mechanism with session/profile-backed active agency binding.

3. Standardize remaining read surfaces onto stateless read-model pattern
- Continue moving operational read paths to bounded PostgREST + in-memory derivation.

4. Tighten runtime host-resolution policy
- Make host binding explicit-first; constrain or phase out `fallback_latest_site` in production.

5. Complete tenancy-safe write-path policy coverage
- Expand RLS + app-level authorization for writes, not only reads.

6. Cost precision and pricing calibration pass
- Move from placeholder constants toward calibrated cost and plan assumptions.

## 8. Codex Guidance Summary

For future Codex work, treat these as hard rules:

1. Must follow
- Use `read-model -> page` for dashboard/internal operational pages.
- Use `getSupabaseServerClientReadOnly()` in page/render paths only.
- Use `getSupabaseServerClientMutating()` only in server actions/route handlers that mutate/auth-refresh.
- Use `getSupabaseServiceRoleClient()` for stateless service-role server reads in read models.
- Resolve tenant scope explicitly with `resolveCurrentUserAgency*` and fail closed on ambiguity.

2. Must not use
- No raw `pg` in page/layout/render read paths.
- No mutating Supabase helper in page render paths.
- No implicit tenant defaults, no silent first-agency fallback.
- No bypass of publish enforcement/integrity/safety checks in activation flow.

3. Authoritative docs/files
- `apps/platform/gnr8-supabase-architecture.md`
- `ai-rules.md` (links contract and platform-level AI guardrails)
- `apps/platform/.eslintrc.json` (enforced import/property/syntax restrictions)
- Current read models and auth helpers in `gnr8/command-center`, `gnr8/agency`, `src/auth`, `src/supabase`

4. Forbidden shortcuts
- Adding unauthenticated runtime/admin mutation routes.
- Re-introducing per-row fan-out query patterns in dashboards.
- Re-introducing pooled DB access in server-render paths.
- Reintroducing tenant scope from query params without membership validation.

## 9. Appendix: Key Modules / Files Reviewed

- `apps/platform/gnr8/command-center/command-center-read-model.ts`
- `apps/platform/gnr8/agency/agency-dashboard-read-model.ts`
- `apps/platform/src/auth/resolve-current-agency.ts`
- `apps/platform/src/auth/supabase-server-read-only.ts`
- `apps/platform/src/auth/supabase-server-mutating.ts`
- `apps/platform/src/supabase/service-role-server.ts`
- `apps/platform/src/auth/supabase-usage-guards.ts`
- `apps/platform/gnr8/billing/unified-cost-view-service.ts`
- `apps/platform/gnr8/billing/cost-event-logging-service.ts`
- `apps/platform/gnr8/billing/margin-service.ts`
- `apps/platform/gnr8/billing/pricing-simulation-service.ts`
- `apps/platform/gnr8/billing/cost-model.ts`
- `apps/platform/gnr8/billing/pricing-model.ts`
- `apps/platform/gnr8/billing/ai-usage-context-policy.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/version-lifecycle-enforcer.ts`
- `apps/platform/gnr8/runtime/runtime-usage-event-logger.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/gnr8/runtime/ownership-backfill-activation.ts`
- `apps/platform/gnr8/command-center/bulk-migration-actions.ts`
- `apps/platform/gnr8/command-center/bulk-action-types.ts`
- `apps/platform/app/gnr8/command-center/page.tsx`
- `apps/platform/app/gnr8/agency/page.tsx`
- `apps/platform/app/gnr8/command-center/_components/command-center-ops-table.tsx`
- `apps/platform/app/api/gnr8/assign-site/route.ts`
- `apps/platform/app/api/gnr8/runtime/migrate/url/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/ready/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/debug/unified-cost/route.ts`
- `apps/platform/app/api/gnr8/debug/margin/route.ts`
- `apps/platform/app/api/gnr8/debug/pricing/route.ts`
- `apps/platform/app/api/gnr8/debug/ai-usage/route.ts`
- `apps/platform/supabase/migrations/20260326_ownership_foundation.sql`
- `apps/platform/supabase/migrations/20260330_agency_rbac_hardening.sql`
- `apps/platform/supabase/migrations/20260330_multi_agency_rls_scope.sql`
- `apps/platform/supabase/schema/ownership-foundation.schema.sql`
- `apps/platform/.eslintrc.json`
- `apps/platform/gnr8-supabase-architecture.md`
- `ai-rules.md`
