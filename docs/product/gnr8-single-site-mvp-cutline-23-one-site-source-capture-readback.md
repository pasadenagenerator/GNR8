# GNR8 Single-Site MVP CUTLINE-23 One-Site Source Capture Readback

Date: 2026-08-18
Scope: production source-capture authorization gate, selected single-site readback, authenticated route-context preflight, and read-only source-truth verification.
Boundary: documentation, local code inspection, read-only health checks, read-only production DB counts, and browser-auth route-context preflight only. No production import/capture POST was sent, and no production DB write, proposal, clone acceptance, improvement execution, approval, launch readiness, AAF request/decision/gate, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, env mutation, deploy, migration, commit, or push occurred.

## Decision

CUTLINE-23 did not run the canonical source capture mutation because the only available authenticated browser session could not resolve a usable agency route context for the client-scoped import workflow. The mission boundary required stopping before mutation when route auth/context was unclear.

The exact source-capture approval sentence appeared in the prompt:

```text
I approve running production source capture for one GNR8 single-site MVP rehearsal site.
```

The later action-time browser confirmation also explicitly approved the authenticated production POST with the selected values. The task still stopped before the POST because the route-context preflight failed.

## Required Human Input Readback

| Required input | CUTLINE-23 readback | Status |
| --- | --- | --- |
| Exact source-capture approval sentence | Present | Present |
| `clientId` | `e61d1982-068f-4d84-bb6f-c3fbfc93f39b` | Present |
| Source URL/domain | `https://www.chs.si/` | Present |
| Rehearsal posture | `internal test` | Present |
| Authenticated POST action-time confirmation | Present | Present |

The selected client resolved read-only in production:

- client name: `Glazura Glizon`
- client id: `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`
- agency id: `6a09c2d9-12c3-4c19-a466-0c29ae2f723e`
- organization type: `client`

## Production Health Preflight

Read-only health checks completed on 2026-08-18:

- Platform app: `HEAD https://app.pasadenagenerator.com/` returned HTTP 200 from Vercel.
- Worker app: `GET https://gnr8-worker.vercel.app/health` returned HTTP 200 with `ok: true`, `service: gnr8-worker`, and `status: ready`.

## Auth And Route Contract Readback

Canonical route inspected locally:

```text
POST /api/gnr8/agency/clients/[clientId]/sites/import
```

The route contract requires:

- route `clientId` as a valid UUID;
- JSON body `url` as a valid `http` or `https` URL;
- authenticated agency action context for `run_migration`;
- `agencyId` in the request body for superadmin/admin-view actions;
- client scope validation proving the selected client belongs to the authenticated agency context.

The current route response contract returns safe refs including:

- `siteId` for the ownership site;
- `runtimeSiteId`;
- `siteVersionId`;
- `siteVersionNo`;
- `actor_mode`;
- `importPathClassification: canonical_scoped`;
- `canonicalImportPath: scoped_snapshot_import_v1`;
- redacted diagnostics, preview metadata, import manifest, and pipeline status.

The capture spine adapter records `migrationId` and `reviewId` internally, but the route response does not expose those IDs directly. Any future successful capture readback must query the single-site source-truth tables read-only after the route returns.

## Route-Context Blocker

The available browser session was authenticated to the production app, but the client-scoped import page rendered:

```text
Agency scope is unavailable for this client import workflow.
```

Only the Codex in-app browser was connected for browser-authenticated execution. No alternate connected browser session was available to provide a different production auth context.

An attempted page-scope programmatic call did not send a network request because the browser page sandbox did not expose `window.fetch`. The task then inspected the actual import page and stopped before form submission because the page failed closed on agency scope. Therefore, no canonical import/capture POST was sent.

## Before And After Counts

Read-only production DB counts were captured before the blocked route-context preflight and again after it. Counts were unchanged.

| Count | Before | After |
| --- | ---: | ---: |
| `organizations` where `organization_type='client'` | 3 | 3 |
| `sites` total | 13 | 13 |
| `sites` for selected client | 12 | 12 |
| `sites` for selected client/source domain | 0 | 0 |
| `gnr8_single_site_migrations` | 0 | 0 |
| `gnr8_single_site_migrations` for selected client | 0 | 0 |
| `gnr8_single_site_migrations` for selected source | 0 | 0 |
| `gnr8_single_site_migration_refs` | 0 | 0 |
| `gnr8_single_site_source_evidence_reviews` | 0 | 0 |
| `gnr8_single_site_source_evidence_review_refs` | 0 | 0 |
| `gnr8_single_site_source_evidence_review_items` | 0 | 0 |
| `gnr8_single_site_source_evidence_review_events` | 0 | 0 |
| `gnr8_single_site_launch_readiness_records` | 0 | 0 |
| `gnr8_single_site_publish_operator_actions` | 0 | 0 |
| `gnr8_single_site_publish_operator_action_refs` | 0 | 0 |
| `gnr8_single_site_publish_operator_action_events` | 0 | 0 |
| `gnr8_aaf_approval_requests` | 0 | 0 |
| `gnr8_aaf_approval_decisions` | 0 | 0 |
| `gnr8_aaf_action_gate_attempts` | 0 | 0 |

## Import Attempt

Import/capture route used: none.

Canonical import/capture POST attempts sent: `0`.

Reason not run: the authenticated route context was not usable for the selected client-scoped import workflow.

Created or returned safe refs:

- `siteId`: none
- `migrationId`: none
- source evidence refs: none
- runtime/source refs: none
- correlation/idempotency refs: none

## Post-Capture Readback

Post-capture readback was not applicable because no capture occurred.

Read-only verification confirmed:

- no selected site/source-domain ownership row was created;
- no `gnr8_single_site_migrations` row was created;
- no source evidence review/ref/item/event row was created;
- no launch readiness record was created;
- no publish operator action/ref/event row was created;
- no AAF approval request, approval decision, or gate attempt was created;
- no dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration, commit, or push occurred.

Online verification does not move to `source_capture_completed_pending_review_or_next_step`. It remains blocked with the current blocker:

```text
blocked_route_auth_context_unavailable
```

## Recommended Next Milestone

MVP-CUTLINE-24 should provide a usable authenticated route context for the selected agency/client import workflow, then run exactly one canonical scoped import request:

```text
POST /api/gnr8/agency/clients/e61d1982-068f-4d84-bb6f-c3fbfc93f39b/sites/import
```

with JSON body:

```json
{
  "agencyId": "6a09c2d9-12c3-4c19-a466-0c29ae2f723e",
  "url": "https://www.chs.si/"
}
```

After that one request, stop immediately for read-only readback of the returned site/runtime refs plus the DB-derived `migrationId`, source evidence review refs, and source evidence item counts.
