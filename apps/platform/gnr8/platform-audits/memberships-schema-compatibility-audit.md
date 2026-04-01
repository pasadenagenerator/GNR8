# Memberships Schema Compatibility Audit

Date: 2026-04-01

## 1. Where `public.memberships` Is Used

- `apps/platform/src/auth/resolve-current-agency.ts`
- `apps/platform/src/auth/owner-setup-gate.ts`
- `apps/platform/app/gnr8/onboarding/owner-setup/complete/route.ts`
- `apps/platform/gnr8/agency/agency-membership-service.ts`
- `apps/platform/gnr8/agency/agency-provisioning-service.ts`
- `apps/platform/gnr8/agency/agency-deprovisioning-service.ts`
- `apps/platform/supabase/migrations/20260330_agency_rbac_hardening.sql`
- `apps/platform/supabase/migrations/20260330_multi_agency_rls_scope.sql`
- `apps/platform/supabase/migrations/20260401_client_access_membership_hardening.sql` (already runtime-safe prior to this pass)

## 2. Previously Incompatible Paths

- Agency member invite/update/remove used hardcoded Supabase filters on `memberships.organization_id`.
- Auth membership readers (`resolve-current-agency`, `owner-setup-gate`) used fallback chains that did not robustly cover `organization_id`-only schema variants.
- Compatibility logic for org-column resolution was duplicated across services.
- Older RLS migrations included static `coalesce(m.organization_id, m.org_id)` policy expressions that can fail in parse-time on single-column schemas.

## 3. Canonical Compatibility Strategy

- Centralized helper: `apps/platform/src/auth/membership-org-column-compat.ts`
- Canonical behavior:
  - detect available memberships org columns at runtime where SQL depends on column existence
  - resolve one safe expression: `m.organization_id`, `m.org_id`, or `coalesce(m.organization_id, m.org_id)`
  - fail closed when neither column exists
- Read fallback select planning is centralized to cover dual-column, organization_id-only, and org_id-only safely.

## 4. Read Paths Fixed

- `resolve-current-agency` now uses shared select-attempt generation and shared org-id normalization.
- `owner-setup-gate` now uses shared select-attempt generation and shared org-id normalization.
- `agency-membership-service` read list continues using dynamic SQL, now backed by shared compatibility helper.
- RLS migration policy creation in:
  - `20260330_agency_rbac_hardening.sql`
  - `20260330_multi_agency_rls_scope.sql`
  now uses runtime membership-column detection with dynamic SQL policy creation.

## 5. Write Paths Fixed

- `agency-membership-service` invite/update/remove now uses dynamic SQL with detected schema support instead of hardcoded Supabase `organization_id` filters.
- Upsert/mutation scope logic now supports:
  - `org_id`-only
  - `organization_id`-only
  - dual-column compatibility
- Deprovisioning membership deletes and org-joins now use the shared compatibility helper.
- Provisioning membership schema-column normalization now routes through shared compatibility helper.

## 6. Remaining Risks

- Environment-level dependency corruption currently blocks local `tsx` test execution and `next build` completion (module/esbuild/supabase package issues unrelated to this compatibility change).
- Existing historical migrations outside the audited set may still contain fixed-column assumptions; this pass covered active membership-related hardening paths identified in this audit scope.

## 7. Long-Term Cleanup Recommendation

- Long-term target remains a single canonical memberships org column.
- This pass intentionally preserves compatibility with mixed schema variants and does not force destructive production migration.
