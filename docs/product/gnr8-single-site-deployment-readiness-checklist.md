# GNR8 Single-Site Deployment Readiness Checklist

Phase: MVP-CUTLINE-4
Scope: checklist for the first one-site MVP rehearsal.

## Release Scope

- [ ] Confirm the worktree is clean before preparing the release commit.
- [ ] Confirm the release includes MVP-CUTLINE-2 orchestration service files.
- [ ] Confirm the release includes MVP-CUTLINE-3 operator action facade and admin routes.
- [ ] Confirm the release includes MVP-CUTLINE-26 authenticated admin-view import execution surface.
- [ ] Confirm the release includes MVP-CUTLINE-27A browser-clickable superadmin source-capture execution surface.
- [ ] Confirm MVP-CUTLINE-28 source evidence operator review was recorded before clone/proposal/improvement work.
- [ ] Confirm MVP-CUTLINE-29 clone generation/review is recorded before proposal planning.
- [ ] Confirm the production deployment gate is recorded as `source_capture_route_deployed` before any source-capture POST.
- [ ] Confirm the release includes MVP-54 dry-run route and MVP-56 shadow-publish route.
- [ ] Confirm the release includes MVP-57 operator action audit migration/service integration.
- [ ] Confirm the release includes Command Center read-only publish operator panel through MVP-64 committed scope.
- [ ] Confirm MVP-CUTLINE-4 docs and canonical index are included.
- [ ] Confirm no unrelated runtime, route, provider, billing, domain, DNS, SQL, UI, worker, or generated files are included.

## Local Static Checks

Run these locally before online deploy. If broader checks are too noisy due to unrelated existing issues, record the exact focused checks and known unrelated failures.

- [ ] `git diff --check`
- [ ] trailing whitespace check over changed docs
- [ ] changed-file scope check: docs/index only for MVP-CUTLINE-4
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-source-capture-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`

## Migration Application

Apply migrations in repository order. Required before the one-site rehearsal and before online deploy:

- [ ] `20260722120000_aaf_persistence_core.sql`
- [ ] `20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- [ ] `20260727130000_publish_target_source_truth_persistence_core.sql`
- [ ] `20260729120000_single_site_state_evidence_spine.sql`
- [ ] `20260730120000_single_site_clone_review_core.sql`
- [ ] `20260730143000_single_site_improvement_proposal_planning_core.sql`
- [ ] `20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- [ ] `20260731100000_aaf_granted_with_limitations_status.sql`
- [ ] `20260731120000_single_site_improvement_execution_core.sql`
- [ ] `20260731143000_single_site_improved_version_review_core.sql`
- [ ] `20260803120000_aaf_single_site_content_approval_scope.sql`
- [ ] `20260803143000_single_site_content_approval_core.sql`
- [ ] `20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- [ ] `20260803190000_single_site_client_approval_core.sql`
- [ ] `20260803210000_single_site_launch_approval_core.sql`
- [ ] `20260804120000_single_site_launch_readiness_core.sql`
- [ ] `20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`
- [ ] `20260806120000_single_site_publish_operator_action_audit.sql`

Do not apply migrations to production or staging during MVP-CUTLINE-4. This checklist is for the next release step.

### MVP-CUTLINE-20 Production Migration Status

Status as of 2026-08-17: the production Supabase migration gate for the single-site MVP is complete.

- Migration count reconciliation: passed; the current checklist resolved the required set as 18 migrations.
- Target: production Supabase project `ujfbpzugdsdmroqvhfvn`, database host `aws-1-eu-west-1.pooler.supabase.com`, database `postgres`.
- Execution: all 18 required migrations were applied by `supabase db push --linked --yes`; no migration failed or was skipped.
- Post-migration readback: passed; 76 expected tables were present, RLS was enabled on all expected tables, 49 expected append-only triggers were present, and AAF vocabulary/contract constraints contained the required single-site approval and launch-readiness evidence vocabulary.
- Backup posture used for the gate: recorded evidence `backup_restore_confirmed`, latest visible backup `17 Aug 2026 03:08:21 (+0000)`; Supabase Storage objects remain outside database backups.
- Online verification gate: unblocked for the migration/catalog prerequisite only. Deploy, env flag, superadmin auth, selected site data, dry-run, shadow-publish, provider, DNS/domain, billing, Vercel/Openprovider, and runtime publish verification were not performed in CUTLINE-20.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-20-production-migration-execution-closeout.md`.

### MVP-CUTLINE-21 Online Verification Preflight

Status as of 2026-08-17: the first read-only online verification preflight completed with a governed dry-run no-go: `dry_run_blocked_missing_site_data`.

- Platform app health: `GET https://app.pasadenagenerator.com/` returned HTTP 200 from Vercel and rendered the GNR8 shell.
- Worker health: `GET https://gnr8-worker.vercel.app/health` returned HTTP 200 with `{"ok":true,"service":"gnr8-worker","status":"ready"}`.
- Deploy ref posture: production was supplied as `main / ba0d070`, but exact commit was not independently observable from public HTTP headers or local Vercel metadata in this workspace.
- Safe flag posture from the available production env artifact: `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` missing and `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` missing.
- Superadmin auth and panel: `/gnr8/command-center/single-site-publish` loaded in the in-app browser as `Superadmin Workspace`; the panel rendered `read only`, `state lookup required`, and all mutation boundary flags false.
- Admin endpoint safety: unauthenticated `GET /api/gnr8/admin/single-site-mvp/status` and unauthenticated `POST /api/gnr8/admin/single-site-mvp/action` both returned HTTP 401 `SUPERADMIN_REQUIRED`, redactions, and all mutation flags false.
- Production read-only DB source truth: 18/18 required migration versions remained present; `gnr8_publish_targets` contained `production / production / active / ptt-1`; candidate source-truth rows were missing (`gnr8_single_site_migrations=0`, launch readiness records `0`, operator audit rows `0`).
- Dry-run: not run because the exact approval sentence was absent and no selected site/migration source truth exists.
- Shadow-publish/runtime publish: not run.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-21-online-verification-preflight.md`.

### MVP-CUTLINE-22 Rehearsal Candidate Source-Truth Plan

Status as of 2026-08-17: source-truth planning completed with no production mutation. The recommended first candidate path is a real selected production site created later through the canonical client-scoped import and capture-spine workflow, not a legacy import, inferred existing runtime site, seeded internal test, or exception fixture by default.

Online verification remains blocked until a candidate has at minimum tenant/client/site/migration identity, source evidence, accepted source evidence review, clone/review refs, proposal and implementation authorization refs, improved candidate and review refs, content/client/launch approval refs, launch readiness evidence, publish activation request/decision/gate refs, handoff and gate input watermarks, and the exact dry-run request refs.

Plan: `docs/product/gnr8-single-site-mvp-cutline-22-rehearsal-candidate-source-truth-plan.md`.

### MVP-CUTLINE-23 One-Site Source Capture Authorization Readback

Status as of 2026-08-18: source-capture execution remained blocked before mutation. The exact source-capture approval sentence, concrete selected `clientId`, source URL/domain, rehearsal posture, and action-time authenticated POST confirmation were present, but the only available authenticated browser session could not resolve a usable agency route context for the client-scoped import workflow. No import/capture POST was sent.

- Platform app health: `HEAD https://app.pasadenagenerator.com/` returned HTTP 200 from Vercel.
- Worker health: `GET https://gnr8-worker.vercel.app/health` returned HTTP 200 with `ok: true`, `service: gnr8-worker`, and `status: ready`.
- Selected client: `Glazura Glizon`, `clientId=e61d1982-068f-4d84-bb6f-c3fbfc93f39b`, `agencyId=6a09c2d9-12c3-4c19-a466-0c29ae2f723e`.
- Selected source URL/domain: `https://www.chs.si/`; rehearsal posture: `internal test`.
- Canonical route inspected: `POST /api/gnr8/agency/clients/[clientId]/sites/import`.
- Route request contract: route `clientId` UUID, JSON body `url`, authenticated `run_migration` agency context, and `agencyId` body value for superadmin/admin-view route context.
- Route-context blocker: import page rendered `Agency scope is unavailable for this client import workflow.`
- Canonical import/capture POST attempts sent by this task: `0`.
- Created refs: none.
- Before/after read-only counts: unchanged; `gnr8_single_site_migrations=0`, source evidence rows `0`, launch readiness records `0`, publish operator action rows `0`, AAF approval requests/decisions/gate attempts `0`.
- Online verification status: `blocked_route_auth_context_unavailable`.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-23-one-site-source-capture-readback.md`.

### MVP-CUTLINE-24 Agency Import Route Context Resolution

Status as of 2026-08-18: route/auth context diagnosis completed with no import/capture POST and no production mutation. The blocker root cause is page-level superadmin admin-view support missing from the client import page: the page requires membership-based agency scope, while the canonical POST route already supports superadmin/admin-view context when `agencyId` is supplied in the JSON body.

- Root cause: `page_superadmin_admin_view_not_implemented_for_importer`.
- Client/agency relationship: exists from CUTLINE-23 read-only production readback; `Glazura Glizon`, `clientId=e61d1982-068f-4d84-bb6f-c3fbfc93f39b`, `agencyId=6a09c2d9-12c3-4c19-a466-0c29ae2f723e`.
- Current auth posture: superadmin-capable for prior Command Center evidence, but not agency-scoped for the importer page.
- Existing route path: canonical POST route can resolve superadmin/admin-view action context only with body `agencyId`.
- Missing UI path: no superadmin-only admin import page or read-only import preflight wrapper exists.
- Safest later retry path: fresh exact action-time confirmation, then exactly one canonical POST using route `clientId` and body `agencyId`, `adminView: true`, and `url`.
- CUTLINE-24 import/capture POST attempts sent: `0`.
- Production data writes, deploys, migrations, env mutations, provider calls, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, commit, and push: none.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-24-agency-import-route-context-resolution.md`.

### MVP-CUTLINE-25 One-Site Source Capture Admin-View Execution

Status as of 2026-08-18: source-capture execution stopped before production mutation. The exact approval sentence was present, selected client/agency/source/posture were confirmed, the canonical route contract was confirmed, production app/worker health was green, and before source-truth counts were still zero. No import/capture POST reached the network because the available authenticated browser surface could prove superadmin page auth but could not issue the required same-origin JSON POST, and the importer page still failed closed on agency scope.

- Exact approval sentence: present.
- Selected client: `Glazura Glizon`, `clientId=e61d1982-068f-4d84-bb6f-c3fbfc93f39b`, `agencyId=6a09c2d9-12c3-4c19-a466-0c29ae2f723e`.
- Selected source URL/domain: `https://www.chs.si/`; rehearsal posture: `internal test`.
- Canonical route contract: `POST /api/gnr8/agency/clients/[clientId]/sites/import` accepts body `agencyId`, `adminView`, and `url`; `agencyId` enables superadmin/admin-view action context.
- Auth proof: `/gnr8/command-center/single-site-publish` rendered `Superadmin Workspace`.
- Execution blocker: browser page-evaluation did not expose `fetch`, `XMLHttpRequest`, or `navigator.sendBeacon`; importer page rendered `Agency scope is unavailable for this client import workflow.`
- Import/capture POSTs that reached the network: `0`.
- Created refs: none.
- Before/after read-only counts: unchanged; selected source-domain sites `0`, `gnr8_single_site_migrations=0`, source evidence rows `0`, launch readiness records `0`, publish operator action rows `0`, AAF approval requests/decisions/gate attempts `0`.
- Online verification status: `blocked_authenticated_post_execution_surface_unavailable`.
- Production data writes, deploys, migrations, env mutations, provider calls, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, commit, and push: none.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-25-one-site-source-capture-admin-view-execution.md`.

### MVP-CUTLINE-26 Authenticated Admin-View Import Execution Surface

Status as of 2026-08-18: implemented locally with focused tests and docs. No production import/capture POST was sent, and no production data, env, deploy, migration, provider, DNS/domain, billing, Stripe, Openprovider, dry-run, shadow-publish, runtime publish, rollback, active pointer, AAF decision, or gate state was mutated.

- New route: `POST /api/gnr8/admin/single-site-mvp/source-capture`.
- Auth: existing `requireSuperadminUserId()`; unauthorized/forbidden requests fail before canonical delegation.
- Strict body: `clientId`, `agencyId`, `url`, `rehearsalPosture`, `explicitConfirmation`, `idempotencyKey`, and `correlationId` only.
- Required confirmation: `I approve sending exactly one production import/capture POST for the selected GNR8 single-site MVP rehearsal site.`
- Accepted rehearsal posture: `internal test`.
- Delegation path: valid requests call the canonical scoped import route `POST /api/gnr8/agency/clients/[clientId]/sites/import` with `url`, `agencyId`, and `adminView: true`.
- Response: redacted operator projection with raw HTML, preview HTML, content-slot materialization, stack traces, raw SQL errors, provider secrets, billing/payment data, and request actor overrides omitted.
- UI/client exposure: none added.
- Focused tests: `single-site-mvp-source-capture-route.test.ts` covers auth rejection, missing confirmation, unknown fields, actor override, invalid posture, exact single delegation, response redaction, and forbidden behavior guardrails.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-26-authenticated-admin-view-import-execution-surface.md`.

### MVP-CUTLINE-26B Source-Capture Route Commit Deploy Readiness

Status as of 2026-08-18: route commit/push readiness recorded. The route implementation bundle from production baseline `ba0d070` through `1cc2d495` is present on `main` and `origin/main` in this workspace. No manual deploy was run and no production source-capture request was sent.

- Exact commit/push approval sentence: present.
- Route bundle commit: `1cc2d495`.
- Branch/ref: `main` / `origin/main`.
- Deployment posture: Vercel auto-deploy from `main` is expected, but deployment status was not verified in CUTLINE-26B.
- Scope: admin source-capture route, route handler, route tests, docs/index/checklists only.
- Still needed before source capture: verify production is running the pushed commit, then obtain fresh exact action-time approval for exactly one source-capture POST.
- Production data writes, deploys, migrations, env mutations, provider calls, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, AAF decisions, and gate attempts: none.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-26b-source-capture-route-commit-deploy-readiness.md`.

### MVP-CUTLINE-26C Source-Capture Route Deployment Verification

Status as of 2026-08-18: deployment verification recorded. The human confirmed Vercel `gnr8-platform` production branch `main` and deployed SHA `c97bee1`. Local git resolves `c97bee1` to `c97bee1bfa26aef7755ffa73d9b75aa7120c60cd`, matching `origin/main` and `c97bee1b`; `1cc2d495` is an ancestor of that commit and contains the CUTLINE-26 route bundle.

- Deployment gate: `source_capture_route_deployed`.
- Route bundle containment: deployed commit includes `POST /api/gnr8/admin/single-site-mvp/source-capture`, its handler, and focused route tests.
- Safe unauthenticated production preflight: bare no-auth `POST https://app.pasadenagenerator.com/api/gnr8/admin/single-site-mvp/source-capture` returned HTTP 401 from Vercel with `x-matched-path: /api/gnr8/admin/single-site-mvp/source-capture`, route version `mvp-cutline-26-authenticated-admin-view-import-execution-surface:v1`, `SUPERADMIN_REQUIRED`, and all mutation flags false.
- Source-capture approval for CUTLINE-26C: `not_approved`.
- Source-capture POSTs with a valid authenticated body: `0`.
- `chs.si` import/capture POSTs sent: `0`.
- Online verification status: `blocked_pending_cutline_27_exact_source_capture_approval_and_successful_one_request_import_capture`.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-26c-source-capture-route-deployment-verification.md`.

### MVP-CUTLINE-27 One-Site Source Capture Execution Readback

Status as of 2026-08-18: exact source-capture approval was present and preflight passed, but execution stopped before production mutation because no supported authenticated superadmin API-request surface was available to send the required JSON POST through the deployed admin route.

- Exact approval sentence: present.
- Deployment gate: `source_capture_route_deployed`.
- Selected client/source: `Glazura Glizon`, `clientId=e61d1982-068f-4d84-bb6f-c3fbfc93f39b`, `agencyId=6a09c2d9-12c3-4c19-a466-0c29ae2f723e`, `url=https://www.chs.si/`, rehearsal posture `internal test`.
- Intended route: `POST https://app.pasadenagenerator.com/api/gnr8/admin/single-site-mvp/source-capture`.
- Route version: `mvp-cutline-26-authenticated-admin-view-import-execution-surface:v1`.
- Auth proof: `/gnr8/command-center/single-site-publish` rendered `Superadmin Workspace`.
- Execution blocker: the browser surface could prove superadmin page auth but could not issue the JSON POST; page evaluation is read-only/no outbound request API, and same-origin `javascript:` execution was blocked by Browser Use security policy.
- Source-capture/import POSTs sent: `0`.
- Before/after read-only counts: unchanged; selected source-domain sites, single-site migrations, source evidence rows, launch readiness rows, publish operator action rows, AAF approval requests/decisions/gate attempts remained `0`; runtime active pointers remained `6`.
- Online verification status: `blocked_authenticated_superadmin_api_request_context_unavailable`.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-27-one-site-source-capture-execution-readback.md`.

### MVP-CUTLINE-28 Source Evidence Operator Review

Status as of 2026-08-18: source evidence operator review passed for the first production single-site rehearsal site. The existing `SourceEvidenceReviewService.accept(...)` workflow accepted review `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3` for `https://www.chs.si/`.

- Status before: `ready_for_review`; status after: `accepted`.
- Decision after: `accept`; `clone_generation_allowed=true`.
- Evidence sufficiency: all ten required categories were present; `font` was `present_with_warnings`; no item blocked clone generation.
- Warnings accepted as non-blocking source-review warnings: rendered capture partial/timeout, stabilization timeout, primary stylesheet warning, image rewrite skips, unsupported-scheme assets, low-confidence content/section slot inference.
- Production source-review rows written: one review update and one `accepted` source evidence review event `c7b33fae-d62d-40ac-b8d9-74758db328cd`.
- Migration state/readiness impact: migration remained `source_evidence_review_required` / `source_evidence_review`; source review now permits a later clone milestone, but clone was not started.
- Forbidden downstream counts after review: clone reviews `0`, proposal plans `0`, improvement attempts `0`, content/client/launch approvals `0`, launch readiness `0`, publish operator actions `0`, AAF approval requests/decisions/gate attempts `0`, runtime active pointers unchanged at `6`.
- Online verification status: `source_evidence_review_accepted_pending_clone`.
- Production data writes outside source-review rows, deploys, migrations, env mutations, provider calls, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, commits, and pushes: none.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-28-source-evidence-operator-review.md`.

### MVP-CUTLINE-29 One-Site Clone Generation And Review

Status as of 2026-08-18: clone generation and clone review passed for the accepted first production single-site rehearsal source evidence.

- Exact clone-generation approval sentence: present.
- Path used: `startSingleSiteCloneGeneration(..., { executor: singleSiteRealCloneExecutor })`, then `CloneReviewService.createOrReuseReview(...)` and `CloneReviewService.accept(...)`.
- Clone generation idempotency/correlation id: `gnr8-cutline-29-chs-si-clone-generation-20260818`.
- Clone runtime site version: `6b172a5b-200e-471c-9599-5dc70f04ea53`.
- Clone runtime artifact: `929106cd-fa19-47eb-9582-ce6931d0e370`.
- Clone semantic output watermark: `sha256:b27fb986be0366de66a1577e0d1771fbc053affa5b7329a0294e2f0c7fae5522`.
- Clone review id: `79176567-4911-4900-bc86-0fefa6043fbe`; status `accepted`; decision `accept`; `proposal_planning_allowed=true`.
- Clone review events: created `4719d8fa-ed77-4c3e-ac77-eccdeea4f4a7`, accepted `3458772b-772b-432d-8ec8-d3d97061a10d`.
- Migration state after clone: `clone_review_required` / `clone`.
- Forbidden downstream counts after review: proposal plans `0`, improvement attempts `0`, improved reviews `0`, content/client/launch approvals `0`, launch readiness `0`, publish operator actions `0`, AAF approval requests/decisions/gate attempts `0`, runtime active pointers unchanged at `6`, selected runtime active pointers `0`.
- Online verification status: `clone_review_accepted_pending_proposal`.
- Boundary: no proposal planning, implementation authorization, improvement execution, approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, deploy, migration, env mutation, commit, or push.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-29-one-site-clone-generation-review.md`.

## Environment Flags

Baseline non-flag environment required for the internal surfaces:

- [ ] `DATABASE_URL` available to server-side repositories that read/write the single-site, AAF, publish target, and operator audit tables.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` available for auth helpers.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` available only where the deployment already requires server-side Supabase service role access.
- [ ] `SUPERADMIN_EMAILS` includes the rehearsal operator account.

Safe pre-shadow posture:

- [ ] `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` unset/disabled.
- [ ] `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW=enabled` only when observing publish activation guard diagnostics during publish execution.
- [ ] `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE` unset/disabled unless testing the older PASR evidence/gate dry-run observer.

Shadow-publish posture, explicit approval required:

- [ ] `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION=enabled`
- [ ] `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW=enabled`
- [ ] operator request confirmation includes `publishMayExecute: true`, `runtimeMutationMayOccur: true`, `blockingEnforcementApplied: false`, and `noAutomaticRollback: true`.

## Admin Auth And Route Access

- [ ] `/gnr8/command-center/single-site-publish` requires platform superadmin page auth.
- [ ] `GET /api/gnr8/admin/single-site-mvp/status` requires superadmin auth.
- [ ] `POST /api/gnr8/admin/single-site-mvp/action` requires superadmin auth.
- [ ] `POST /api/gnr8/admin/single-site-mvp/source-capture` requires superadmin auth and exact confirmation before canonical import delegation.
- [ ] `POST /api/gnr8/admin/single-site-publish/dry-run` requires superadmin auth.
- [ ] `POST /api/gnr8/admin/single-site-publish/shadow-publish` requires feature flag and superadmin auth.
- [ ] Non-superadmin requests fail with 401/403.
- [ ] Request bodies cannot override `actor`, `actorId`, `actorRole`, `userId`, `principal`, or `superadminUserId`.

## Online Verification Trigger

Online verification is triggered only after:

- [ ] release commit exists;
- [ ] branch is pushed to the target deploy path;
- [ ] deployment succeeds;
- [ ] all required Supabase migrations are applied to the target environment;
- [ ] env flags are set according to the approved rehearsal mode;
- [ ] selected site data exists or explicit MVP exceptions are recorded;
- [ ] CUTLINE-22 candidate source-truth requirements are satisfied for the selected site;
- [ ] superadmin auth is verified;
- [ ] dry-run preflight has passed or failed with an expected source-truth blocker.

CUTLINE-21 result: migration/catalog, app health, worker health, and superadmin panel prerequisites were confirmed, but selected site data does not exist in production. Governed dry-run remains blocked until a source-truth rehearsal candidate is created or identified.

CUTLINE-22 result: the next source-owned path is defined, but no candidate was created. Governed dry-run and online verification remain blocked until the future candidate creation milestone records the required source-truth chain.

CUTLINE-23 result: selected inputs and action-time confirmation are now present, but the available authenticated browser session cannot resolve the agency context for the client-scoped import workflow. The canonical route contract is known, but online verification remains blocked until a usable authenticated route context exists and exactly one approved source capture succeeds.

CUTLINE-24 result: the missing agency scope is explained. The importer page is membership-scoped and lacks a superadmin/admin-view context path, while the canonical POST route can use superadmin admin-view context if `agencyId` is supplied. Online verification remains blocked until a later task receives fresh exact confirmation and either uses that existing route context directly or implements a narrow no-mutation admin import preflight wrapper first.

CUTLINE-25 result: fresh exact confirmation and route contract were present, but the available authenticated execution surface could not send the required canonical JSON POST without unsupported cookie/session handling. Online verification remains blocked until a supported authenticated admin-view import execution surface exists and a future task receives fresh exact confirmation for exactly one POST.

CUTLINE-26 result: a supported superadmin-only admin-view import execution surface now exists locally and is tested, but it was not deployed and was not called against production. Online verification remains blocked until CUTLINE-27 receives fresh exact confirmation and sends exactly one source-capture request through the deployed route.

CUTLINE-26B result: the route bundle is present on `main` and `origin/main` at `1cc2d495`; Vercel auto-deploy is expected but not verified by this task. Online verification remains blocked until production is confirmed to be running the pushed route commit and CUTLINE-27 receives fresh exact source-capture approval.

CUTLINE-26C result: production route deployment is verified and the gate is recorded as `source_capture_route_deployed`. The human-confirmed Vercel production branch/SHA is `main` / `c97bee1`, which resolves locally to `c97bee1bfa26aef7755ffa73d9b75aa7120c60cd` and contains route bundle commit `1cc2d495`. A safe unauthenticated preflight returned HTTP 401 from the deployed route with all mutation flags false. Source-capture approval remains `not_approved`, no valid authenticated source-capture body was sent, and online verification remains blocked until CUTLINE-27 receives exact approval and exactly one import/capture request succeeds.

CUTLINE-27 result: exact approval was present, route deployment gate and selected input were confirmed, app and worker health returned HTTP 200, and read-only before counts were clean. The task stopped before POST because authenticated superadmin page auth was available only through the in-app browser, while no supported browser/API surface could issue the required JSON POST. Source-capture/import POSTs sent remained `0`; after counts were unchanged, and online verification remains blocked with `blocked_authenticated_superadmin_api_request_context_unavailable`.

CUTLINE-27A result: a supported browser-clickable execution surface now exists locally at `/gnr8/command-center/single-site-publish/source-capture` under the superadmin-only Command Center. It accepts only `clientId`, `agencyId`, `url`, `rehearsalPosture`, `idempotencyKey`, `correlationId`, and `explicitConfirmation`; disables execution until the exact confirmation sentence is entered; posts only to `POST /api/gnr8/admin/single-site-mvp/source-capture`; and renders only redacted response/status. No production source-capture POST, deploy, migration, env mutation, provider/DNS/domain/billing mutation, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, AAF decision, gate attempt, commit, or push occurred.

CUTLINE-27C result: the human-submitted deployed superadmin UI source-capture request was verified by read-only production DB readback. The selected `www.chs.si` site exists with `siteId=a03fcb5b-6ad9-4b19-a682-4c06f998881a`; the selected single-site migration exists with `migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`; source evidence review `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3` is `ready_for_review`; selected migration refs/events and source evidence refs/items now exist; launch readiness, publish operator actions, AAF approval requests, AAF approval decisions, and AAF gate attempts remain `0`; runtime active pointers remain `6`. Online verification status is `source_capture_completed_pending_review_or_next_step`. Codex performed no production mutation, second source-capture POST, deploy, migration, env mutation, provider/DNS/domain/billing mutation, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, commit, or push in CUTLINE-27C.

CUTLINE-28 result: source evidence review `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3` was accepted through `SourceEvidenceReviewService.accept(...)`; `clone_generation_allowed=true`; no clone/proposal/improvement/readiness/publish work occurred; online verification status moved to `source_evidence_review_accepted_pending_clone`.

CUTLINE-29 result: clone generation and clone review were completed through existing server-only clone workflows. Clone version `6b172a5b-200e-471c-9599-5dc70f04ea53` and artifact `929106cd-fa19-47eb-9582-ce6931d0e370` were generated, clone review `79176567-4911-4900-bc86-0fefa6043fbe` was accepted with no P0 blockers, and `proposal_planning_allowed=true`. Forbidden downstream counts remained clean and runtime active pointers remained unchanged at `6`. Online verification status is `clone_review_accepted_pending_proposal`.

## Online Checklist

- [ ] Open the Command Center panel with selected refs.
- [ ] Confirm panel remains superadmin-only and shows only the gated source-capture execution button, with no dry-run, shadow-publish, runtime publish, provider, rollback, approval, gate, AAF decision, or active-pointer controls.
- [ ] Run status route and save redacted response.
- [ ] Run action preflight and save redacted response.
- [ ] Run dry-run through action route or direct MVP-54 route.
- [ ] Confirm audit creation/update for dry-run.
- [ ] Refresh panel and confirm latest audit projection.
- [ ] With explicit approval only, run shadow-publish.
- [ ] Confirm audit creation/update for shadow-publish.
- [ ] If `publishMayHaveExecuted=true`, verify active pointer before/after and public/preview behavior.
- [ ] Confirm no unexpected provider/domain/DNS/billing/Stripe/Vercel/Openprovider calls.
- [ ] Confirm no raw diagnostics or secrets are exposed.
- [ ] Record pass/fix/stop decision.

## Acceptance Boundary

A successful shadow-publish rehearsal is not final MVP acceptance by itself. Final acceptance requires:

- real source capture or documented first-rehearsal exception;
- source-owned approvals/readiness/gate truth;
- online verification;
- no unexpected side effects;
- closeout record;
- repeatability across the later validation set.
