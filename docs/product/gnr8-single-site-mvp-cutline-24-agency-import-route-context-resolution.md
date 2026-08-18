# GNR8 Single-Site MVP CUTLINE-24 Agency Import Route Context Resolution

Date: 2026-08-18
Scope: route/page/auth context diagnosis for the canonical client-scoped source-capture import workflow.
Boundary: local code inspection, documentation, canonical index update, and prior read-only production evidence review only. No import/capture POST was sent, and no production data write, deploy, migration, provider/DNS/domain/billing/Stripe/Openprovider call, env mutation, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, commit, or push occurred.

## Decision

CUTLINE-24 resolves the CUTLINE-23 blocker as a route-context mismatch between the rendered importer page and the canonical import API.

The authenticated browser session was usable for superadmin-only surfaces, but the importer page does not resolve superadmin/admin-view scope. It requires an agency membership context through `resolveCurrentUserAgencyForPage(...)`. When that membership resolution fails, the page renders:

```text
Agency scope is unavailable for this client import workflow.
```

The API route itself has an existing superadmin/admin-view path through `requireAgencyActionContext(...)`, but only when the request body supplies the target `agencyId`. Therefore the blocker is not a missing client-to-agency relationship and not a missing URL/path parameter by itself. It is that the page-level importer context cannot bootstrap agency scope for a superadmin-only session.

## Inspected Implementation

Canonical source-capture route:

```text
apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts
POST /api/gnr8/agency/clients/[clientId]/sites/import
```

The route parses route `clientId`, parses JSON body `url`, then resolves action context with:

```text
requireAgencyActionContext({
  action: 'run_migration',
  requestedAgencyId: body.agencyId,
})
```

For superadmin sessions, `requireAgencyActionContext(...)` first calls `requireSuperadminUserId()`. If that succeeds and `requestedAgencyId` is present, it returns:

```text
role: superadmin
actorMode: admin_view
agencyId: requestedAgencyId
```

The route then proves client scope with `assertClientScope(...)`, which reads `public.organizations` for the route `clientId` and fails unless the row is `organization_type='client'` and `agency_id` equals the resolved action-context agency.

Client import page:

```text
apps/platform/app/gnr8/agency/clients/[clientId]/sites/import/page.tsx
```

The page reads `?agency=` and `?admin_view=1`, but it resolves page scope only through:

```text
resolveCurrentUserAgencyForPage({
  activeAgencyId: requestedAgencyId,
})
```

It does not call `requireSuperadminUserIdForPage()`, does not use the existing admin agency routes, and does not transform `admin_view=1` plus `agency` into a superadmin page context. If agency membership resolution throws any `ResolveCurrentAgencyError` other than `UNAUTHORIZED`, the page leaves `currentUserAgency` null and renders the CUTLINE-23 blocker.

Superadmin versus agency access pattern:

- Normal agency/client/import pages are membership-scoped first. Their `admin_view=1` query flag is preserved only after membership scope has already been resolved.
- Existing superadmin admin pages use explicit `/gnr8/admin/agencies/[agencyId]/...` paths plus `requireSuperadminUserIdForPage()`.
- No `/gnr8/admin/.../import` page or read-only import preflight wrapper exists for the selected client import flow.
- The mutating canonical POST route already supports superadmin admin-view context if the request body contains `agencyId`.

## Root Cause

The root cause is `page_superadmin_admin_view_not_implemented_for_importer`.

The CUTLINE-23 browser session lacked a page-resolvable agency membership context for the importer page. The importer page failed before rendering `SiteImporterClient`, so no client-side request body containing `agencyId` and `adminView` could be produced from that UI. The canonical API route could have accepted a superadmin/admin-view action context, but the page route never reached the form that would submit the request.

This is a route/page context blocker, not a production source-truth blocker and not evidence of a broken client-to-agency relationship.

## Relationship And Auth Readback

Client/agency relationship: exists, based on the CUTLINE-23 read-only production readback:

- client name: `Glazura Glizon`
- client id: `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`
- organization type: `client`
- agency id: `6a09c2d9-12c3-4c19-a466-0c29ae2f723e`

Current auth posture:

- The browser context was superadmin-capable for prior Command Center evidence.
- The same browser context was not agency-scoped for the importer page.
- The exact membership error code was not exposed by the importer page, but the observed state is effectively `superadmin_only_for_importer_page`, not agency membership-scoped for the selected agency.

Live DB checks in this CUTLINE-24 shell were not performed because `DATABASE_URL` was not present and `psql` was unavailable. No alternate read-only production credential path was used.

## Safest Resolution

Safest existing path for a later source-capture task:

1. Do not rely on the rendered importer page as proof of agency context for a superadmin-only session.
2. Use the existing canonical API route only after a separate exact action-time confirmation.
3. Include the selected agency in the body:

```json
{
  "agencyId": "6a09c2d9-12c3-4c19-a466-0c29ae2f723e",
  "adminView": true,
  "url": "https://www.chs.si/"
}
```

4. Keep the route path client-scoped:

```text
POST /api/gnr8/agency/clients/e61d1982-068f-4d84-bb6f-c3fbfc93f39b/sites/import
```

This is safe only as a later mutation task with fresh exact confirmation because the route performs source capture and writes production source-truth data on success.

Safest product implementation path if UI proof is required before mutation:

- Add a narrow superadmin-only admin import wrapper or read-only preflight page in a future milestone.
- It should use `requireSuperadminUserIdForPage()`, selected `agencyId`, selected `clientId`, and read-only `assert client belongs to agency` logic.
- It should not send import/capture by rendering alone.
- It should expose an operator-safe preflight result and leave the canonical POST behind a separate explicit confirmation.

Human action needed:

- For the no-new-code route path, a human must provide fresh exact action-time confirmation for exactly one canonical POST using the selected `clientId`, selected `agencyId`, and `https://www.chs.si/`.
- For a UI-first path, a human should authorize a new narrow admin import wrapper milestone before any source-capture retry.

## Retry Eligibility

A retry can be attempted in a later task only after one of these is true:

- the operator intentionally uses the existing superadmin-capable canonical POST route with `agencyId` in the body and fresh exact confirmation; or
- a new read-only superadmin admin import preflight/wrapper has been implemented and verified.

CUTLINE-24 itself did not retry and did not send the POST.

## Non-Actions Confirmed

- Import/capture POST attempts sent: `0`.
- Production data writes: `0`.
- Deploy/redeploy: none.
- Migration application: none.
- Env var mutation: none.
- Provider/DNS/domain/billing/Stripe/Openprovider mutation: none.
- Dry-run/shadow-publish/runtime publish/rollback/active pointer mutation: none.
- Commit/push: none.

## Validation

Local validation completed:

- `git diff --check`: passed.
- Trailing whitespace scan on changed docs: passed.
- Changed-file scope: docs and canonical index only. No application code, migrations, env files, generated assets, or runtime files changed.
- Import/capture POST: not sent.
- Production data writes: none.
- Deploy, migration, provider/DNS/domain/billing/Stripe/Openprovider, env, dry-run, shadow-publish, runtime publish, rollback, active pointer, commit, and push actions: none.

## Recommended Next Milestone

Recommended next milestone: `MVP-CUTLINE-25 - One-Site Source Capture Execution Via Existing Admin-View API Context`.

Mission shape:

- require fresh exact action-time confirmation;
- send exactly one canonical POST to the selected client-scoped route;
- include `agencyId` and `adminView: true` in the JSON body;
- stop immediately after response for read-only source-truth readback;
- do not proceed to approvals, dry-run, shadow-publish, runtime publish, provider work, rollback, or active pointer mutation.

If the team prefers UI proof before mutation, replace CUTLINE-25 with a narrow no-mutation admin import preflight wrapper milestone.
