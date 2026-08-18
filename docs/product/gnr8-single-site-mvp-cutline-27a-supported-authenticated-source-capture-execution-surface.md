# GNR8 Single-Site MVP CUTLINE-27A Supported Authenticated Source-Capture Execution Surface

Date: 2026-08-18

## Status

Implemented locally. No production source-capture request was sent.

## Scope

CUTLINE-27A adds a browser-clickable superadmin-only execution surface for a later task to run exactly one source capture through normal app UI/request mechanics.

- Surface: `/gnr8/command-center/single-site-publish/source-capture`, section `Source Capture Execution`.
- Route called: `POST /api/gnr8/admin/single-site-mvp/source-capture`.
- Shared contract: `apps/platform/gnr8/single-site/single-site-mvp-source-capture-execution-contract.ts`.
- Page: `apps/platform/app/gnr8/command-center/single-site-publish/source-capture/page.tsx`.
- Browser component: `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSiteMvpSourceCaptureExecutionSurface.tsx`.

## Auth Behavior

The execution surface is rendered only inside the Command Center single-site publish source-capture subpage. That page and its parent Command Center layout call `requireSuperadminUserIdForPage()`, so client portal, Ops Inbox, public, and agency users do not receive this surface.

The browser form does not implement a server action. It submits a same-origin JSON `fetch` to the existing admin route, preserving the route's existing `requireSuperadminUserId()` API guard, strict body validation, actor override rejection, and canonical import delegation behavior.

## Confirmation Behavior

The submit button is disabled until all request fields are non-empty and `explicitConfirmation` exactly matches:

`I approve sending exactly one production import/capture POST for the selected GNR8 single-site MVP rehearsal site.`

The shared contract trims submitted field values but does not broaden the confirmation phrase.

## Accepted Fields

The browser request body is built from these fields only:

- `clientId`
- `agencyId`
- `url`
- `rehearsalPosture`
- `idempotencyKey`
- `correlationId`
- `explicitConfirmation`

No actor override fields are exposed by the UI. The route still rejects unknown fields and actor override fields before delegation.

## Response Display

The UI renders a redacted status summary only:

- route
- HTTP status
- ok boolean when returned
- redacted response receipt status
- diagnostics count
- redactions count
- mutation flag summary
- sanitized error code when returned

The UI does not render raw response JSON, raw HTML, preview HTML, source artifacts, stack traces, SQL errors, provider data, billing data, payment data, site refs, migration refs, or actor overrides.

## Guardrails

CUTLINE-27A did not add dry-run, shadow-publish, runtime publish, approval, rollback, provider, billing, DNS, domain, AAF decision, gate attempt, launch-readiness, or active-pointer controls.

The surface only delegates to the deployed admin source-capture route. The existing route delegates only to the canonical scoped import handler after its own superadmin and request validation succeeds.

## Validation

Passed:

- `pnpm exec tsx --test app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/single-site-mvp-source-capture-route.test.ts`
- `pnpm exec tsc -p tmp-cutline-27a-tsconfig.json --noEmit --pretty false`

Notes:

- The temporary focused TypeScript config was removed after validation.
- Full app TypeScript no-emit still fails on unrelated existing fixture/type drift outside this cutline.
- A combined UI plus route test run under `NODE_OPTIONS='--conditions=react-server'` fails because the client React hook test file is not valid under the React server export condition; the UI test passes under the normal client React condition.

## Boundary Confirmation

- Production source-capture POSTs sent: `0`.
- `chs.si` import/capture POSTs sent: `0`.
- Production data writes: none.
- Deploys: none.
- Migrations: none.
- Env mutations: none.
- Provider, DNS, domain, billing, Stripe, Openprovider mutation calls: none.
- Dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, AAF decisions, and gate attempts: none.
- Commit/push: not performed.

## Next Milestone

Commit, push, and deploy CUTLINE-27A after human approval. Then a later source-capture task can obtain fresh exact action-time approval, open the deployed superadmin Command Center surface, enter the selected request fields, and send exactly one production source-capture request.
