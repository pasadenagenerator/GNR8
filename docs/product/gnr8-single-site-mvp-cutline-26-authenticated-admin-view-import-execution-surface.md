# GNR8 Single-Site MVP CUTLINE-26 Authenticated Admin-View Import Execution Surface

Date: 2026-08-18
Status: implemented locally; not deployed; no production import/capture executed.

## Summary

CUTLINE-26 adds a narrow superadmin-only internal API route for the next source-capture milestone:

`POST /api/gnr8/admin/single-site-mvp/source-capture`

The route exists only to give CUTLINE-27 a supported authenticated same-origin execution surface for exactly one approved production import/capture POST. It does not add UI, client-facing routes, source capture execution in this task, dry-run, shadow-publish, runtime publish, provider/domain/DNS/billing behavior, AAF decisions, gate attempts, launch readiness, rollback, active pointer mutation, deployment, migration, env mutation, commit, or push.

## Request Contract

The route accepts only this JSON body:

- `clientId`
- `agencyId`
- `url`
- `rehearsalPosture`
- `explicitConfirmation`
- `idempotencyKey`
- `correlationId`

Unknown fields are rejected. Actor override fields such as `actor`, `actorId`, `actorRole`, `actorType`, `role`, `userId`, `principal`, and `superadminUserId` are rejected before delegation.

The only accepted confirmation string is:

`I approve sending exactly one production import/capture POST for the selected GNR8 single-site MVP rehearsal site.`

The accepted CUTLINE-26 rehearsal posture is `internal test`.

## Auth And Delegation

The route requires the existing `requireSuperadminUserId()` helper before parsing into the canonical import path. Unauthorized requests return `401`; forbidden non-superadmin requests return `403`; neither path delegates.

Valid requests delegate exactly once to:

`POST /api/gnr8/agency/clients/[clientId]/sites/import`

The delegated canonical request body is intentionally limited to:

- `url`
- `agencyId`
- `adminView: true`

This preserves the existing canonical import/capture route behavior, including its superadmin/admin-view agency action context resolution through body `agencyId`.

## Response Projection

The admin surface returns a redacted operator-safe projection of the canonical import response. It preserves safe IDs, status, diagnostics, import classification, selected pipeline summary fields, and operator trace fields (`idempotencyKey`, `correlationId`, `rehearsalPosture`).

The projection omits raw HTML, preview HTML, content-slot materialization, raw SQL errors, stack traces, provider secrets, billing/payment data, and request actor overrides. Returned mutation flags remain false for dry-run, shadow-publish, publish, runtime mutation, provider calls, billing calls, domain/DNS calls, AAF records, gate attempts, gate evaluation, and launch readiness.

## Validation

Focused local validation completed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/single-site-mvp-source-capture-route.test.ts`
- `pnpm exec tsc -p tmp-cutline-26-tsconfig.json --pretty false` with a temporary narrow no-emit config, then the temp config was removed.

The broad platform `pnpm exec tsc --noEmit --pretty false` remains blocked by pre-existing unrelated test type errors outside CUTLINE-26.

## Boundary Confirmation

CUTLINE-26 did not send any production import/capture request. It did not call the selected `https://www.chs.si/` source capture, mutate production data, run online verification, deploy, apply migrations, mutate env vars, call Supabase/Vercel/provider/DNS/domain/billing/Stripe/Openprovider mutation APIs, create AAF approval decisions, create gate attempts, run dry-run, run shadow-publish, run runtime publish, roll back, mutate active pointers, commit, or push.

## Next Milestone

Recommended next milestone: CUTLINE-27 can use the new superadmin-only admin execution surface after fresh exact action-time confirmation to send exactly one production source capture for the selected single-site MVP rehearsal candidate.
