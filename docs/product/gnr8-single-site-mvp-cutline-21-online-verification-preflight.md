# GNR8 Single-Site MVP CUTLINE-21 Online Verification Preflight

Date: 2026-08-17
Scope: read-only online verification preflight after production Supabase migrations.
Boundary: no deploy, redeploy, migration application, dry-run, shadow-publish, runtime publish, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, approval creation, AAF decision, gate attempt, launch readiness record, publish action, commit, or push.

## Decision

Dry-run readiness decision: `dry_run_blocked_missing_site_data`.

The online preflight confirms the deployed platform and worker respond, the Command Center single-site publish panel loads for a superadmin session, the admin endpoints fail closed for unauthenticated access, and the production migration/catalog prerequisite remains applied. Governed dry-run is not ready because production contains no `gnr8_single_site_migrations` rows, no launch readiness records, and no operator audit rows, so there is no candidate site/migration/source-truth chain to rehearse.

Dry-run was not run. The prompt did not contain the exact approval sentence: `I approve running the internal GNR8 single-site MVP dry-run online.`

Shadow-publish was not run and remained blocked.

## Checks Performed

| Check | Method | Result |
| --- | --- | --- |
| Platform app health | `GET https://app.pasadenagenerator.com/` | HTTP 200, `server: Vercel`, `x-matched-path: /[[...slug]]`, login/signup shell rendered. |
| Worker health | `GET https://gnr8-worker.vercel.app/health` | HTTP 200, JSON `{"ok":true,"service":"gnr8-worker","status":"ready"}`, `x-matched-path: /health`. |
| Platform deploy ref | Public HTTP headers and local deploy metadata inspection | Health observable; exact `ba0d070` commit not independently exposed through public headers or local Vercel metadata. |
| Worker deploy ref | Worker health headers and local deploy metadata inspection | Health observable; exact `ba0d070` commit not independently exposed through public headers or local Vercel metadata. |
| Env flag posture | `apps/platform/.env.production` safe key presence scan | `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` missing; `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` missing. This is the safe off posture in the production env artifact available to this workspace. |
| Superadmin auth | In-app browser opened `https://app.pasadenagenerator.com/gnr8/command-center/single-site-publish` | Passed. Page rendered `Command Center`, `Superadmin Workspace`, and `Superadmin Context`. |
| Command Center panel load | Same browser session | Passed. `Single-Site Publish Operator Panel` rendered with `read only`, `state lookup required`, and mutation boundary flags all false. |
| Status endpoint unauthenticated safety | `GET https://app.pasadenagenerator.com/api/gnr8/admin/single-site-mvp/status` | HTTP 401, `SUPERADMIN_REQUIRED`, redactions present, mutation flags false. |
| Action endpoint unauthenticated safety | `POST https://app.pasadenagenerator.com/api/gnr8/admin/single-site-mvp/action` with probe JSON | HTTP 401, `SUPERADMIN_REQUIRED`, redactions present, mutation flags false. |
| Authenticated status/action API call | In-app browser direct `/api/...` navigation and page-scope network attempt | Not completed by tooling: direct API navigation was blocked by the in-app browser with `net::ERR_BLOCKED_BY_CLIENT`; page evaluation scope exposed no fetch/form creation APIs. Panel-level superadmin auth was confirmed separately. |
| Production migration state | Production DB `BEGIN READ ONLY`; `SELECT` from `supabase_migrations.schema_migrations`; `ROLLBACK` | 18/18 required versions present. |
| Production catalog/readback | Same read-only DB transaction | Expected tables present: `gnr8_publish_targets`, `gnr8_single_site_migrations`, `gnr8_single_site_launch_readiness_records`, `gnr8_single_site_publish_operator_actions`. |
| Publish target row | Same read-only DB transaction | `production / production / active / ptt-1`, source watermark `ptt-1:gnr8_publish_targets:production`. |
| Candidate site/migration | Same read-only DB transaction | No candidate available: `gnr8_single_site_migrations=0`, `migrations_with_site=0`, `gnr8_single_site_launch_readiness_records=0`, `operator_actions=0`. |

## Endpoint Safety Notes

The live unauthenticated endpoint checks prove both admin routes are deployed, auth-gated before work, redacted, and fail with all mutation flags false. Source inspection of `apps/platform/app/api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers.ts` confirms the route requires superadmin before parsing/dispatch and rejects forbidden actor override keys before facade execution. Source inspection of `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts` confirms dry-run and shadow-publish are explicit executable operations, shadow-publish execution remains feature-flag gated, and facade-level mutation flags default false unless an approved execution path runs.

Because authenticated `/api/...` calls could not be driven from the in-app browser tooling, the next dry-run milestone should include an authenticated API client path or a browser session surface that can issue same-origin JSON requests with cookies.

## Source-Truth Readback

Read-only production query timestamp: `2026-08-17T18:03:25.767Z`.

- Database: `postgres`.
- Required migration versions: 18.
- Applied required migration versions: 18.
- Single-site migration rows: 0.
- Single-site migrations with `site_id`: 0.
- Launch readiness records: 0.
- Launch readiness records in `ready` or `ready_with_limitations`: 0.
- Operator action audit rows: 0.

No rehearsal candidate was selected because production has no source-truth row to bind `tenantId`, `clientId`, `siteId`, `migrationId`, candidate site version ref, runtime artifact ref, launch readiness evidence ref, activation request/decision/gate refs, handoff watermark, or gate input watermark.

## Boundary Confirmation

No deploy, redeploy, migration application, dry-run, shadow-publish, runtime publish, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, approval creation, AAF decision, gate attempt, launch readiness record, publish action, commit, or push occurred.

## Recommended Next Milestone

MVP-CUTLINE-22 should create or identify a production-safe single-site source-truth rehearsal candidate through the approved upstream workflow, then repeat this online preflight with concrete selected refs before requesting governed dry-run authorization.
