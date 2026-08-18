# GNR8 Single-Site One-Site Rehearsal Plan

Phase: MVP-CUTLINE-4
Scope: documentation plus local verification only.

## Purpose

This plan prepares the first real single-site MVP rehearsal without adding runtime behavior. It describes the deployable scope, migration requirements, environment flag posture, source-truth data prerequisites, internal surfaces to check, success criteria, stop criteria, and the line between a shadow-publish rehearsal and final MVP acceptance.

The rehearsal is an internal operator exercise. It must prove that one selected site can be inspected through the single-site state and publish operator read models, preflighted through the minimal operator action surface, dry-run through the existing MVP-54 caller, and, only with explicit approval and flags, shadow-published through the existing MVP-56 caller.

## Current Worktree Review

Current local status at the start of MVP-CUTLINE-4 was clean:

- no staged files;
- no unstaged files;
- no untracked files;
- no uncommitted SQL migrations.

Committed MVP-CUTLINE scope present in `main`:

- MVP-CUTLINE-1 docs: acceptance cutline, gap audit, final task plan, and closeout.
- MVP-CUTLINE-2 implementation: `apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.ts` and test.
- MVP-CUTLINE-3 implementation: operator action facade, status route, action route, and route/facade tests.
- MVP-64 docs: diagnostic snapshot history architecture, redaction/retention contract, operator workflow, and closeout. These are committed, not untracked.

The only files expected to become uncommitted after this phase are the MVP-CUTLINE-4 documentation files and canonical index update.

## What Must Be Committed Before Deployment

Before any online rehearsal or deploy prep, create one commit that contains:

- the current runtime/application state already present at `HEAD`, including MVP-CUTLINE-2 and MVP-CUTLINE-3;
- all committed migration files required by the single-site path;
- the MVP-CUTLINE-4 documentation files:
  - `docs/product/gnr8-single-site-one-site-rehearsal-plan.md`
  - `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
  - `docs/architecture/gnr8-single-site-mvp-migration-and-env-inventory.md`
  - `docs/product/gnr8-single-site-mvp-cutline-4-closeout.md`
  - `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Do not commit as part of MVP-CUTLINE-4. The commit belongs to the next milestone or a human-controlled release step.

## Rehearsal Data Requirements

The rehearsal needs one exact site identity and a complete source-owned chain. The operator action routes intentionally do not create missing upstream approvals, gate attempts, launch readiness, publish targets, runtime artifacts, or state spine records.

| Data | Requirement | Source expectation for first rehearsal |
| --- | --- | --- |
| Tenant id | Required | Must exist in deployed data. Can be selected from existing tenant truth. |
| Client id | Required | Must exist and match tenant/site scope. |
| Site id | Required | Must exist in ownership/runtime mapping for the selected site. |
| Migration id | Required for governed path | Prefer produced by real source capture/state flow. Can be seeded only under explicit MVP exception policy. |
| Source URL and captured source evidence | Required before clone/review | Must be produced by real import/capture for rehearsal unless capture itself is the rehearsal input. |
| Accepted source evidence review | Required before clone acceptance/proposal | Should be produced through the real review writer. Can be seeded for first rehearsal with explicit exception and evidence refs. |
| Clone site version/artifact refs | Required before clone review | Must be produced by clone/runtime flow for a meaningful online rehearsal. |
| Accepted clone review | Required before proposal/improvement path | Should be produced through real clone review service. Seeding is acceptable only to unblock route rehearsal, not MVP acceptance. |
| Proposal plan and approval | Required before implementation authorization | Proposal plan should be produced by proposal planning service. Approval may be seeded only with explicit exception policy. |
| Implementation authorization | Required before improvement execution | Must be AAF-scoped `single_site_improvement_implementation_authorization` truth or explicit exception. |
| Improved candidate version/artifact refs | Required for publish dry-run/shadow-publish | Must be a real runtime candidate/artifact pair. Seeded refs are not acceptable for publish execution. |
| Improved version review | Required before content approval | Should be produced by real improved version review. |
| Content approval | Required before client/launch approval | Must include single-site content approval truth and matching AAF scope when used by the flow. |
| Client approval | Required before launch approval | Must include client approval truth and matching AAF scope unless explicitly bypassed. |
| Launch approval | Required before launch readiness | Must include launch approval truth and matching AAF scope unless explicitly bypassed. |
| Launch readiness record/evidence | Required before publish activation | Must be produced from launch readiness source reader/builder. First rehearsal may seed only with explicit exception and limitation. |
| Publish activation request | Required before gate metadata resolution | Must be AAF request with scope/action `publish_activation` / `publish.activation` for the candidate. |
| Publish activation decision | Required before gate metadata resolution | Must be granted or granted-with-limitations and linked to expected evidence. |
| Publish activation gate result | Required before wrapper metadata completeness | Must be persisted AAF gate attempt/result matching request, decision, candidate, artifact, target, handoff watermark, and gate input watermark. |
| Publish target ref | Required before dry-run/shadow-publish | Must resolve to `gnr8_publish_targets`; for rehearsal this should be the shadow target if available or a documented exception if using the seeded `production` target only for dry-run. |
| Operator id | Required | Must be resolved server-side by superadmin auth. Request bodies must not provide actor overrides. |

## MVP Exception Policy

For the first rehearsal only, seeding may be used to stand in for source-truth records that do not yet have an operator-runnable UI or route. Every seeded/bypassed item must be recorded in the rehearsal notes with:

- source table or intended source table;
- seeded record id/ref;
- reason the real flow was not used;
- limitation code;
- whether the site can count toward 20-site validation.

A shadow-publish that depends on seeded or bypassed launch readiness, approval, gate, or publish target truth does not count as final MVP acceptance. It is a route/deployment rehearsal only.

## Step-By-Step Rehearsal

### A. Local / Pre-Deploy

1. Confirm worktree status: `git status --short --untracked-files=all`.
2. Review the deployment diff and ensure changed files are docs/index only for MVP-CUTLINE-4.
3. Validate all required migrations are present in `apps/platform/supabase/migrations`.
4. Run focused local tests from the readiness checklist for:
   - MVP-CUTLINE-2 orchestration service;
   - MVP-CUTLINE-3 operator action facade/route;
   - MVP-54 dry-run route;
   - MVP-56 shadow-publish route;
   - MVP-57 operator audit;
   - publish wrapper/orchestrator and publish activation guard/resolver tests.
5. Run static/type checks selected by the release operator.
6. Confirm no production/staging Supabase, provider, DNS, domain, billing, Stripe, Vercel, Openprovider, or AI calls are made locally.
7. Review env/secrets for the target deployment and document flag values before deploy.

### B. Deploy Prep

1. Create a release commit containing the approved code/docs scope. Do not include unrelated local changes.
2. Push the release branch only after the commit is reviewed.
3. Apply Supabase migrations in order to the target environment. Do not skip the AAF/publish target prerequisites.
4. Set rehearsal-safe env flags:
   - keep `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` disabled unless the rehearsal is explicitly approved for shadow-publish execution;
   - set `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW=enabled` for observation-only guard diagnostics during publish execution;
   - keep `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE` disabled unless the older PASR-style shadow observer is intentionally being tested.
5. Verify superadmin auth for the internal operator.
6. Confirm the Command Center route is internal-only and not linked from client portal or Ops Inbox action surfaces.

### C. Online Rehearsal

1. Open `/gnr8/command-center/single-site-publish` as a platform superadmin with the selected `siteId`, `migrationId`, and/or `candidateSiteVersionRef` query params.
2. Verify the panel loads and shows read-only readiness/audit state.
3. Call `GET /api/gnr8/admin/single-site-mvp/status` with `tenantId`, `clientId`, `siteId`, and known refs.
4. Call `POST /api/gnr8/admin/single-site-mvp/action` with `actionMode: "preflight"` and the current `requestedOperationKey`.
5. If preflight allows `run_operator_dry_run`, call the action route with `actionMode: "execute"` and the exact dry-run confirmation. Alternatively call MVP-54 directly at `/api/gnr8/admin/single-site-publish/dry-run`.
6. Inspect the response, operator audit records, and Command Center panel projection.
7. If and only if explicitly approved, enable `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` and call the action route or MVP-56 route for `run_shadow_publish`.
8. If shadow-publish is expected to mutate, verify previous and new active pointer IDs, published preview/public behavior, and returned `publishMayHaveExecuted`.
9. Record correlation id, idempotency key, route status, wrapper status, resolver status, gate diagnostics, audit action id, active pointer before/after, and screenshots/URLs.

### D. Post-Rehearsal

1. Capture blockers, warnings, limitations, unexpected exposure, and mutations.
2. Decide pass/fix/stop before any second site.
3. Record whether seeded/bypassed data was used.
4. Decide whether this site counts toward the 20-site validation set. It counts only if the real source-owned flow produced the required approvals/readiness/gate truth and online verification passed without unsafe exceptions.
5. Leave shadow-publish results clearly labeled as rehearsal evidence, not final MVP acceptance.

## Success Criteria

- Command Center panel loads for a platform superadmin.
- Status route returns a redacted orchestration status with source-owned blockers/warnings/limitations.
- Action route preflight returns the expected allow/block reason for the current next operation.
- Dry-run completes with `dryRun: true`, `publishes: false`, `runtimeMutation: false`, or fails with an expected source-truth blocker.
- MVP-57 audit records appear for dry-run and any invalid preflight attempt.
- Shadow-publish is either blocked safely by feature flag/preflight or succeeds only after explicit approval and flag enablement.
- If shadow-publish executes, the active pointer/public behavior is checked against the returned before/after refs.
- No provider, domain, DNS, billing, Stripe, Vercel, Openprovider, or AI behavior occurs unexpectedly.
- No public/client portal/Ops Inbox exposure is added or observed.
- Responses expose only safe refs/diagnostics and no raw SQL errors, stack traces, provider secrets, billing/payment data, or raw AAF payloads.

## Stop Criteria

Stop immediately if any of these occur:

- required migration missing or failed;
- superadmin auth fails or non-superadmin access succeeds;
- internal route is unexpectedly public, client-facing, or linked from an action UI;
- dry-run mutates runtime, publish target, rollback, active pointer, billing, domain, DNS, or provider state;
- shadow-publish mutates when it was expected to be blocked or dry-run-only;
- launch readiness, approval, gate, or publish target truth is missing and no explicit MVP exception exists;
- provider/domain/DNS/billing/Stripe/Vercel/Openprovider side effect occurs;
- raw diagnostics, secrets, SQL errors, stack traces, billing/payment data, or unredacted AAF payloads are exposed;
- shadow-publish result is being treated as final MVP acceptance without online verification and closeout.

## Recommendation

The next milestone should be **MVP-CUTLINE-5: prepare commit/deploy bundle and migration application checklist**.

Reason: the repository already has the minimal operator action surface and the worktree is clean. The immediate blocker before a real online rehearsal is not another runtime feature; it is release discipline: bundle the exact commits, apply migrations in order, set flags safely, confirm admin auth, and select/seed one site with documented source-truth exceptions. A seeded rehearsal harness can follow only if deploy prep finds that missing data cannot be produced manually through the existing flow.
