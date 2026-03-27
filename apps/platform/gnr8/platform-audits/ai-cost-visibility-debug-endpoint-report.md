# AI Cost Visibility Debug Endpoint Report

Date: 2026-03-27

## Endpoint path

- `GET /api/gnr8/debug/ai-usage`

## Auth/guard strategy

- Uses existing `requireSuperadminUserId()` guard (`apps/platform/src/auth/require-superadmin-user-id.ts`).
- Access requires authenticated Supabase user session plus email allowlist membership from `SUPERADMIN_EMAILS`.
- Fail-closed behavior:
  - unauthenticated -> `401`
  - authenticated but non-superadmin -> `403`
- Route does not expose public/unauthenticated access.

## Supported filters

Query params:

- `siteId` (UUID)
- `agencyId` (UUID)
- `clientId` (UUID)
- `featureContext` (exact text match)
- `operationType` (exact text match)
- `limit` (default `50`, clamped to max `200`)

Default behavior:

- Returns most recent events (`created_at desc`, then `id desc`) with default limit `50`.

## Response fields

Per event:

- `id`
- `created_at`
- `billing_account_id`
- `agency_id`
- `client_id`
- `site_id`
- `site_version_id`
- `artifact_id`
- `feature_context`
- `operation_type`
- `model_provider`
- `model_name`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `estimated_cost`
- `trace_id`
- `attribution_classification`

Summary block:

- `total_events_returned`
- `events_with_site_id`
- `events_with_client_id`
- `events_missing_billing_account_id`
- `events_with_zero_total_tokens`
- `classification_counts`

Classification labels:

- `fully_attributed`
- `agency_only`
- `missing_site`
- `missing_billing_account`
- `zero_tokens`

## What it helps diagnose

- Whether `ai_usage_events` rows are being created at all.
- Which operation/feature contexts are generating events.
- Whether billing ownership attribution resolved as expected (`agency/client/site/billing_account`).
- Which events have missing billing attribution.
- Which events have zero token accounting and may indicate instrumentation gaps.

## Environment limitations

- Endpoint requires `DATABASE_URL` and reachable Postgres/Supabase.
- If `public.ai_usage_events` does not exist in the environment, route returns an error and does not attempt fallback behavior.
- This surface is internal diagnostics only; no pricing logic, no Stripe lifecycle behavior, no customer-facing UI.
