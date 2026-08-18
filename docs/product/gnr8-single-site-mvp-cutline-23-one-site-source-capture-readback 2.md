# GNR8 Single-Site MVP CUTLINE-23 One-Site Source Capture Readback

Date: 2026-08-18
Scope: production source-capture authorization gate and read-only route/readback preflight for one selected single-site MVP rehearsal candidate.
Boundary: documentation, local code inspection, and read-only health checks only. No production import/capture request, production DB write, proposal, clone acceptance, improvement execution, approval, launch readiness, AAF request/decision/gate, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, env mutation, deploy, migration, commit, or push occurred.

## Decision

CUTLINE-23 did not run the canonical source capture mutation because the required selected single-site inputs were absent.

The exact authorization sentence appeared in the mission prompt:

```text
I approve running production source capture for one GNR8 single-site MVP rehearsal site.
```

However, the prompt did not provide an actionable selected `clientId`, source URL/domain, or rehearsal posture. The capture authorization gate therefore remained incomplete for execution, and the task stopped before any import/capture mutation.

## Required Human Input Readback

| Required input | CUTLINE-23 readback | Status |
| --- | --- | --- |
| Exact source-capture approval sentence | Present in the prompt text | Present |
| `clientId` | Not provided as a concrete UUID | Missing |
| Source URL/domain | Not provided as a selected source | Missing |
| Rehearsal posture | Not provided as `real production rehearsal`, `internal test`, or `explicit MVP exception` | Missing |

Because one or more required selected inputs were missing, the canonical scoped import route was not called.

## Production Health Preflight

Read-only health checks completed on 2026-08-18:

- Platform app: `HEAD https://app.pasadenagenerator.com/` returned HTTP 200 from Vercel.
- Worker app: `GET https://gnr8-worker.vercel.app/health` returned HTTP 200 with `ok: true`, `service: gnr8-worker`, and `status: ready`.

These health checks do not authorize source capture without the missing selected inputs.

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

On success, the route returns safe refs including:

- `siteId` for the ownership site;
- `runtimeSiteId`;
- `siteVersionId`;
- `siteVersionNo`;
- `actor_mode`;
- `importPathClassification: canonical_scoped`;
- `canonicalImportPath: scoped_snapshot_import_v1`;
- redacted diagnostics, preview metadata, import manifest, and pipeline status.

The capture spine adapter records `migrationId` and `reviewId` internally, but the current route response does not expose those IDs directly. Any future approved capture readback must therefore query the single-site source-truth tables read-only after the route returns.

## Counts And Source Truth

No fresh production DB count readback was performed in CUTLINE-23 because the task stopped before the mutation gate. The last recorded production source-truth counts remain the CUTLINE-21 read-only values:

- `gnr8_single_site_migrations = 0`
- `migrations_with_site = 0`
- `gnr8_single_site_launch_readiness_records = 0`
- `operator_actions = 0`
- `gnr8_publish_targets` active production target: `production / production / active / ptt-1`

Since no import/capture route was called in CUTLINE-23, this task created no new site, migration, source evidence review, runtime artifact, launch readiness, publish activation, dry-run, shadow-publish, runtime publish, active pointer, or provider mutation rows.

## Import Attempt

Import/capture route used: none.

Reason not run: missing selected `clientId`, missing selected source URL/domain, and missing rehearsal posture.

Created or returned safe refs:

- `siteId`: none
- `migrationId`: none
- source evidence refs: none
- runtime/source refs: none
- correlation/idempotency refs: none

Exactly one import/capture attempt was allowed by the mission only after required inputs were present. CUTLINE-23 made zero import/capture attempts.

## Post-Capture Readback

Post-capture readback was not applicable because no capture occurred.

Confirmed by boundary:

- no launch readiness record was created by this task;
- no publish activation request, decision, or gate attempt was created by this task;
- no dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration, commit, or push occurred.

Online verification does not move to `source_capture_completed_pending_review_or_next_step`. It remains blocked with the more specific current blocker:

```text
blocked_missing_required_single_site_selection
```

## Next Required Human Input

To run the next source-capture milestone, provide all of the following in one prompt:

- the exact sentence: `I approve running production source capture for one GNR8 single-site MVP rehearsal site.`
- concrete `clientId` UUID;
- selected source URL/domain;
- rehearsal posture: `real production rehearsal`, `internal test`, or `explicit MVP exception`;
- selected or authorized `agencyId` for the authenticated route context;
- optional `siteName` if the imported site name should not be derived from source title/domain.

## Recommended Next Milestone

MVP-CUTLINE-24 should be a one-site source-capture execution milestone only after the missing selected inputs are provided. It should run exactly one canonical scoped import request, then immediately stop for read-only readback of the returned site/runtime refs plus the DB-derived `migrationId`, source evidence review refs, and source evidence item counts.
