# GNR8 Single-Site MVP CUTLINE-4 Closeout

Phase: MVP-CUTLINE-4
Scope: one-site rehearsal and deployment readiness plan.

## Worktree Review

Local review found a clean worktree before documentation edits:

- no staged files;
- no unstaged files;
- no untracked files;
- no uncommitted SQL migrations.

MVP-CUTLINE and MVP-64 files are already committed in `main`. No pre-existing untracked MVP-64 or CUTLINE docs were found.

Reviewed CUTLINE-2 files:

- `apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.test.ts`
- `docs/product/gnr8-single-site-mvp-end-to-end-orchestration-service-closeout.md`

Reviewed CUTLINE-3 files:

- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/status/route.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/action/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`
- `docs/product/gnr8-single-site-mvp-minimal-operator-action-surface-closeout.md`

Reviewed MVP-54/56/57 and panel surfaces:

- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/route.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/route.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`

## Created / Updated

Created:

- `docs/product/gnr8-single-site-one-site-rehearsal-plan.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/architecture/gnr8-single-site-mvp-migration-and-env-inventory.md`
- `docs/product/gnr8-single-site-mvp-cutline-4-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Migration Inventory Summary

The first one-site rehearsal requires the full single-site path migration chain plus AAF/publish target prerequisites:

- AAF core persistence;
- DDOM readiness snapshot persistence;
- publish target source truth;
- single-site state/evidence spine;
- clone review;
- proposal planning;
- implementation authorization AAF scope;
- granted-with-limitations decision vocabulary;
- improvement execution;
- improved version review;
- content approval AAF scope and core;
- client/launch approval AAF scopes;
- client approval core;
- launch approval core;
- launch readiness core;
- launch readiness AAF evidence type;
- publish operator action audit.

No new uncommitted migrations were found.

## Env Flag Summary

Runtime env flags relevant to rehearsal:

- `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`: default off; enables internal shadow-publish action/route when set to an accepted truthy value. This can move the active pointer through existing publish behavior.
- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW`: default off; enables observation-only publish activation enforcement guard diagnostics. It does not block by itself.
- `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE`: default off; enables the older AAF publish activation shadow observer path. Keep off unless intentionally testing that observer.

Dry-run has no env flag requirement beyond route availability and superadmin auth.

## Route / Panel Summary

Read-only surfaces:

- `/gnr8/command-center/single-site-publish`
- `GET /api/gnr8/admin/single-site-mvp/status`

Action/preflight surfaces:

- `POST /api/gnr8/admin/single-site-mvp/action`
- `POST /api/gnr8/admin/single-site-publish/dry-run`
- `POST /api/gnr8/admin/single-site-publish/shadow-publish`

All API routes require superadmin auth. Shadow-publish additionally requires `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`. The facade executes only dry-run and shadow-publish; all other operation keys are manual/not implemented for the cutline.

## Data Requirements

Required before dry-run:

- tenant/client/site ids;
- migration id;
- candidate site version ref;
- runtime artifact ref;
- publish target ref;
- launch readiness evidence ref;
- publish activation request ref;
- publish activation decision ref;
- gate attempt result ref;
- handoff watermark;
- gate input watermark;
- operator id from superadmin auth;
- correlation id and idempotency key.

Required before a rehearsal can count toward MVP validation:

- real source capture evidence;
- accepted source evidence review;
- real clone and accepted clone review;
- proposal plan/approval;
- implementation authorization;
- real improved candidate and accepted improved version review;
- content, client, and launch approvals;
- launch readiness record/evidence;
- publish activation request/decision/gate truth;
- online verification and closeout.

Seeded or bypassed data is allowed only for a first deployment/route rehearsal and must be labeled as an MVP exception.

## Online Verification Trigger

Online GNR8 verification is **not needed during MVP-CUTLINE-4**. It should start only after commit, push, deploy, target Supabase migrations, env flags, admin auth, selected site data, and explicit shadow-publish approval are ready.

## Success Criteria

- superadmin can load the Command Center panel;
- status route returns orchestration status;
- preflight route returns expected allow/block;
- dry-run completes or blocks with expected source-truth blocker;
- audit appears for dry-run/preflight;
- shadow-publish is blocked safely by default or succeeds only under explicit approval and flag;
- no unexpected provider/domain/DNS/billing/Stripe/Vercel/Openprovider behavior;
- no public/client exposure;
- no raw diagnostics exposed.

## Stop Criteria

- missing or failed migration;
- auth failure or unexpected non-superadmin access;
- unexpected public/client/Ops route exposure;
- unexpected mutation from dry-run or unapproved shadow-publish;
- unresolved launch readiness, approval, gate, or publish target truth;
- provider/domain/DNS/billing/Stripe/Vercel/Openprovider side effect;
- unsafe raw diagnostic exposure;
- shadow-publish treated as final MVP acceptance without online verification and closeout.

## Blockers Discovered

No code blocker was discovered in the local documentation review.

Operational blockers remain before online rehearsal:

- target environment migrations must be applied in order;
- env flags must be set deliberately;
- one selected site must have real or explicitly excepted source-truth data;
- shadow-publish must not be enabled until the team accepts active-pointer mutation risk.

## Recommended Next Milestone

Recommended next milestone: **MVP-CUTLINE-5: prepare commit/deploy bundle and migration application checklist**.

This is more urgent than building another harness because the current blocker is deployment readiness: commit scope, ordered migration application, target environment flag posture, admin auth, and one selected site data. If deploy prep proves source-truth data cannot be produced manually, CUTLINE-5 can split out a narrow seeded rehearsal harness as a follow-up.

## Boundary Confirmation

MVP-CUTLINE-4 changed documentation only. No runtime behavior changed, and no commit, push, deploy, production/staging Supabase call, migration application, provider call, DNS/domain action, billing/Stripe action, Vercel/Openprovider action, route/UI/service/worker/runtime modification, or public/client exposure was performed.
