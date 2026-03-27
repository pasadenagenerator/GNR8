# Billing Foundation Implementation Report

Date: 2026-03-27

## Migration file used

- `apps/platform/supabase/migrations/20260327_billing_account_cost_center_foundation.sql`

## Tables created

- `public.billing_accounts`
  - Columns: `id`, `agency_id`, `stripe_customer_id`, `billing_mode`, `status`, `created_at`, `updated_at`
  - Constraints:
    - unique `agency_id`
    - `billing_mode` check: `agency_pays | hybrid | client_direct`
    - `status` check: `active | suspended | delinquent`
- `public.cost_centers`
  - Columns: `id`, `type`, `entity_id`, `parent_id`, `created_at`
  - Constraints:
    - `type` check: `agency | client | site | operation`
    - self-FK on `parent_id`

## Backfill behavior implemented

- Billing accounts:
  - Inserts one `billing_accounts` row for each agency missing one.
- Cost centers:
  - Inserts one `agency` cost center per agency if missing.
  - Inserts one `client` cost center per client organization (`organizations.organization_type = 'client'`) if missing.
  - Inserts one `site` cost center per site if missing.
- Parent hierarchy:
  - `agency` -> `client` -> `site` when site organization is client.
  - `agency` -> `site` fallback for non-client or unresolved site org cases.
- Safety properties:
  - Additive only.
  - No destructive updates.
  - Idempotent insert logic using `not exists`.
  - Guards for environments where `organizations`/`sites` may be absent.

## Service layer added

- `apps/platform/gnr8/billing/billing-account-service.ts`
  - `resolveAgencyBillingAccount(agencyId)`
- `apps/platform/gnr8/billing/cost-center-service.ts`
  - `resolveSiteCostCenters(siteId)`
- `apps/platform/gnr8/billing/billing-resolution-service.ts`
  - `resolveBillingContextForSite(siteId)`
  - `createMissingBillingFoundationForAgency(agencyId)`
- `apps/platform/gnr8/billing/index.ts`
  - Module exports.

## Validation results

- Typecheck (`cd apps/platform && pnpm exec tsc --noEmit`): PASS
- Migration factory tests: PASS
  - `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory.test.ts`
  - `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory-activation.test.ts`
- Publish/runtime safety tests: PARTIAL PASS
  - PASS: `gnr8/runtime/publish-safety-check.test.ts`
  - PASS: `gnr8/runtime/publish-enforcement.integration.test.ts`
  - PASS: `gnr8/runtime/publish-activation-guard.test.ts`
  - BLOCKED BY ENV: `gnr8/runtime/runtime-happy-path.integration.test.ts` requires `DATABASE_URL`
- `next build` (`cd apps/platform && pnpm exec next build`): PASS

## Backfill row counts

Execution status: NOT EXECUTED LIVE (no `DATABASE_URL` in environment)

Observed environment check:

- `DATABASE_URL_SET=0`

If `DATABASE_URL` is available, run:

```sql
select count(*) as agencies from public.agencies;
select count(*) as billing_accounts from public.billing_accounts;
select count(*) as agency_cost_centers from public.cost_centers where type = 'agency';
select count(*) as client_cost_centers from public.cost_centers where type = 'client';
select count(*) as site_cost_centers from public.cost_centers where type = 'site';
```

## Assumptions

- Ownership foundation (`agencies`, `organizations`, `sites`) is the intended baseline in target environments.
- `sites.org_id` points to `organizations.id` and `sites.agency_id` points to `agencies.id` as established by ownership migration.
- Existing duplicate cost centers (if manually created) are tolerated; services deterministically pick the earliest row.

## Unresolved cases

- Live backfill execution/count verification could not be performed in this environment because `DATABASE_URL` is not configured.
- Runtime happy-path integration test is blocked by the same DB prerequisite.
