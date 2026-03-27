# Cost Event Logging Foundation Report

Date: 2026-03-27

## Migration file

- `apps/platform/supabase/migrations/20260327_cost_event_logging_foundation.sql`

## Tables created

- `public.ai_usage_events`
  - Columns: `id`, `billing_account_id`, `agency_id`, `client_id`, `site_id`, `site_version_id`, `artifact_id`, `operation_type`, `feature_context`, `model_provider`, `model_name`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `trace_id`, `created_at`
  - Indexes:
    - `ai_usage_events_site_id_idx` on `(site_id)`
    - `ai_usage_events_agency_id_created_at_idx` on `(agency_id, created_at)`
- `public.runtime_usage_events`
  - Columns: `id`, `billing_account_id`, `agency_id`, `client_id`, `site_id`, `artifact_id`, `request_count`, `bandwidth_bytes`, `compute_ms`, `estimated_cost`, `period_start`, `period_end`, `created_at`
  - Indexes:
    - `runtime_usage_events_site_id_idx` on `(site_id)`
    - `runtime_usage_events_agency_id_period_start_idx` on `(agency_id, period_start)`
- `public.migration_cost_events`
  - Columns: `id`, `billing_account_id`, `agency_id`, `site_id`, `migration_job_id`, `cost_type`, `compute_units`, `estimated_cost`, `created_at`
  - Indexes:
    - `migration_cost_events_agency_id_created_at_idx` on `(agency_id, created_at)`

## Services added

- `apps/platform/gnr8/billing/cost-event-types.ts`
  - Input/result contracts for AI/runtime/migration cost event logging.
- `apps/platform/gnr8/billing/cost-event-logging-service.ts`
  - `logAIUsageEvent(input)`
  - `logRuntimeUsageEvent(input)`
  - `logMigrationCostEvent(input)`
  - Shared behavior:
    - table guards for older environments (`to_regclass` check, explicit error when missing)
    - ownership anchor validation with clear failures
    - billing attribution resolution and cost-center hierarchy resolution
- `apps/platform/gnr8/billing/index.ts`
  - Added exports for new cost-event types/service.

## What is logged now

- AI usage events:
  - Site-aware path: resolves attribution via `resolveBillingContextForSite(siteId)`.
  - Agency-only path: supports migration-oriented and other agency-attributed AI usage when `siteId` is absent.
  - Writes `billing_account_id` when resolvable.
- Runtime usage events:
  - Requires `siteId`.
  - Resolves agency/client/site attribution and billing account through site ownership context.
- Migration cost events:
  - Requires `agencyId`.
  - Supports optional `siteId` and optional `migration_job_id`.
  - Defaults to agency attribution when no `siteId` is provided.

## What is scaffolded for future hooks

- Logging services are ready for call-site integration but are not wired into hot runtime serving paths.
- No semantic change was made to runtime serving, publish activation, governance, or migration execution.
- No dynamic pricing engine, invoice logic, Stripe charging logic, or rebilling behavior is introduced.

## Validation results

- Typecheck: PASS
  - `cd apps/platform && pnpm exec tsc --noEmit`
- Migration factory tests: PASS
  - `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory.test.ts`
  - `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/migration-factory/migration-factory-activation.test.ts`
- Publish/runtime safety tests: PASS (DB-dependent coverage explicitly blocked/skipped)
  - PASS: `gnr8/runtime/publish-safety-check.test.ts`
  - PASS: `gnr8/runtime/publish-enforcement.integration.test.ts`
  - PASS: `gnr8/runtime/publish-activation-guard.test.ts`
  - SKIPPED (requires DB): `gnr8/runtime/runtime-artifact-response.integration.test.ts`
  - FAILS CLOSED WITHOUT DB (expected): `gnr8/runtime/runtime-happy-path.integration.test.ts`
- Next build: PASS
  - `cd apps/platform && pnpm exec next build`

## Environment limitations

- Live DB inserts for the new cost-event tables were not exercised in this environment.
- `DATABASE_URL` availability check:
  - `DATABASE_URL_SET=0`
