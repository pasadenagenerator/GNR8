# GNR8 Single-Site MVP CUTLINE-26C Source-Capture Route Deployment Verification

Date: 2026-08-18
Status: admin source-capture route deployment verified; production source capture not approved and not executed.
Scope: deployment verification only for `POST /api/gnr8/admin/single-site-mvp/source-capture`.
Boundary: no source-capture execution, no `chs.si` import/capture POST, no production data writes, no deploy, no redeploy, no migrations, no env mutation, no dry-run, no shadow-publish, no runtime publish, no rollback, no active pointer mutation, no provider/DNS/domain/billing/Stripe/Openprovider mutation, no commit, and no push.

## Human-Provided Production Deployment Evidence

The human confirmed the Vercel `gnr8-platform` production deployment state:

- Production branch: `main`.
- Deployed SHA: `c97bee1`.

Local git resolution records:

- `git rev-parse origin/main`: `c97bee1bfa26aef7755ffa73d9b75aa7120c60cd`.
- `git rev-parse c97bee1b`: `c97bee1bfa26aef7755ffa73d9b75aa7120c60cd`.
- `git rev-parse c97bee1`: `c97bee1bfa26aef7755ffa73d9b75aa7120c60cd`.
- `git rev-parse 1cc2d495`: `1cc2d495481a3540b633699c20d41f4f7d1307af`.

`origin/main`, `c97bee1b`, and short SHA `c97bee1` resolve to the same commit:

`c97bee1bfa26aef7755ffa73d9b75aa7120c60cd`

`git merge-base --is-ancestor 1cc2d495 c97bee1b` exited successfully, confirming the earlier route bundle commit is included in the deployed commit lineage.

## Route Bundle Containment

The deployed commit contains the CUTLINE-26 route bundle from `1cc2d495`.

Route bundle paths present at `c97bee1b`:

- `apps/platform/app/api/gnr8/admin/single-site-mvp/source-capture/route.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/source-capture/source-capture-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-source-capture-route.test.ts`

`git diff --quiet 1cc2d495..c97bee1b -- apps/platform/app/api/gnr8/admin/single-site-mvp/source-capture apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-source-capture-route.test.ts` exited successfully, confirming no route-bundle file changes between the bundle commit and the deployed docs closeout commit.

## Safe Unauthenticated HTTP Preflight

An unauthenticated route-existence/auth preflight was run without cookies, auth headers, or JSON body:

`POST https://app.pasadenagenerator.com/api/gnr8/admin/single-site-mvp/source-capture`

Result:

- HTTP status: `401`.
- Server: `Vercel`.
- Matched path: `/api/gnr8/admin/single-site-mvp/source-capture`.
- Route version: `mvp-cutline-26-authenticated-admin-view-import-execution-surface:v1`.
- Error: `SUPERADMIN_REQUIRED`.
- Diagnostics: `single_site_mvp_source_capture_superadmin_required`.
- Mutation flags: all false.

This preflight proves the deployed production route exists and rejects unauthenticated access before body parsing or canonical import delegation. It did not provide a valid authenticated body and did not trigger source capture.

## Gate State

- Deployment gate: `source_capture_route_deployed`.
- Source-capture approval for this task: `not_approved`.
- Production source-capture POSTs sent in CUTLINE-26C: `0`.
- Selected `chs.si` import/capture POSTs sent in CUTLINE-26C: `0`.
- Online verification status: `blocked_pending_cutline_27_exact_source_capture_approval_and_successful_one_request_import_capture`.

Online verification remains blocked until CUTLINE-27 has fresh exact source-capture approval and exactly one approved import/capture request succeeds, after which read-only source-truth readback must record the returned refs and counts before any dry-run, shadow-publish, runtime publish, rollback, or active pointer mutation.

## Boundary Confirmation

CUTLINE-26C did not call the source-capture route with a valid authenticated body and did not send the selected `https://www.chs.si/` import/capture POST.

CUTLINE-26C did not insert, update, or delete production data; run dry-run, shadow-publish, runtime publish, rollback, or active pointer mutation; apply migrations; mutate env vars; deploy or redeploy; call provider/DNS/domain/billing/Stripe/Openprovider mutation APIs; or commit or push.

## Recommended Next Milestone

Recommended next milestone: `MVP-CUTLINE-27 - Approved One-Site Source Capture Execution And Readback`.
