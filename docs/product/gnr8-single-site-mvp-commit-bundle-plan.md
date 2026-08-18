# GNR8 Single-Site MVP Commit Bundle Plan

Phase: MVP-CUTLINE-5
Scope: reviewable commit/deploy/migration bundle plan only.

## Boundary

This phase prepares the first one-site MVP rehearsal bundle. It does not stage, commit, push, deploy, apply Supabase migrations, call production/staging Supabase, call provider/DNS/domain/billing/Stripe/Vercel/Openprovider actions, or modify runtime behavior.

Allowed output files for this phase are documentation and the canonical index only.

## Current Git Status Classification

Inspection commands used:

- `git status --short`
- `git diff --name-only`
- `git diff --stat`
- `git log --name-status --oneline -n 8 ...`
- `find apps/platform/supabase/migrations -maxdepth 1 -type f -name '*.sql' | sort`

Current uncommitted worktree at CUTLINE-5 start:

| File | Status | Classification | Bundle decision | Notes |
| --- | --- | --- | --- | --- |
| `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` | Modified tracked | Include but docs-only | Include in rehearsal docs commit | Pre-existing CUTLINE-4 index update. CUTLINE-5 appends new references. |
| `docs/architecture/gnr8-single-site-mvp-migration-and-env-inventory.md` | Untracked | Include but docs-only | Include in rehearsal docs commit | CUTLINE-4 migration/env inventory. |
| `docs/product/gnr8-single-site-deployment-readiness-checklist.md` | Untracked | Include but docs-only | Include in rehearsal docs commit | CUTLINE-4 deployment checklist. |
| `docs/product/gnr8-single-site-mvp-cutline-4-closeout.md` | Untracked | Include but docs-only | Include in rehearsal docs commit | CUTLINE-4 closeout. |
| `docs/product/gnr8-single-site-one-site-rehearsal-plan.md` | Untracked | Include but docs-only | Include in rehearsal docs commit | CUTLINE-4 one-site rehearsal plan. |
| `docs/product/gnr8-single-site-mvp-commit-bundle-plan.md` | New in CUTLINE-5 | Include but docs-only | Include | This plan. |
| `docs/product/gnr8-single-site-mvp-precommit-validation-plan.md` | New in CUTLINE-5 | Include but docs-only | Include | Focused validation plan. |
| `docs/product/gnr8-single-site-mvp-online-verification-checklist.md` | New in CUTLINE-5 | Include but docs-only | Include | Online operator sequence. |
| `docs/product/gnr8-single-site-mvp-cutline-5-closeout.md` | New in CUTLINE-5 | Include but docs-only | Include | Phase closeout. |

No uncommitted implementation, route, UI, worker, provider, billing, domain, DNS, Stripe, Vercel/Openprovider, or SQL migration files were found. No pre-existing untracked MVP-64 docs were found; the current untracked docs are from CUTLINE-4 and CUTLINE-5.

The recent implementation spine is already committed on `main` through `92ae50d2 Implement MVP operator action API`. Those committed files should be treated as the deployable implementation baseline for the rehearsal, but they are not uncommitted files to stage now.

## Commit Bundle Inventory

### A. Single-Site Spine/Core

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `apps/platform/gnr8/single-site/single-site-state-contracts.ts`; state read/write repositories and read model; state transition service; state evidence persistence | Core single-site state, refs, stage summaries, blockers, closeouts, and read projection | Medium: schema/data drift blocks orchestration | Yes | `single-site-state-*.test.ts`, integration tests where DB is available | Already committed; include in deploy baseline. |
| `apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.ts` | CUTLINE-2 orchestration status and next-operation read model | Medium: incorrect allow/block could mislead operator | Yes | `single-site-mvp-orchestration-service.test.ts` | Already committed in `92ae50d2`. |

### B. Source Evidence/Capture

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `single-site-capture-spine-adapter.ts`; `source-evidence-review-service.ts`; related tests | Captured source evidence and accepted source review truth | Medium: seeded evidence can make rehearsal non-representative | Yes for validation-counting rehearsal | Capture/review unit and integration tests | Real source evidence is required for final MVP validation; seeding allowed only as first rehearsal exception. |

### C. Clone/Executor/Review

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `single-site-clone-start-orchestrator.ts`; `single-site-real-clone-executor.ts`; `single-site-clone-generation-gate.ts`; `clone-review-service.ts`; related tests | Clone start, real clone execution, generation gate, and clone acceptance | Medium/high: real executor dependencies and artifact refs must be true | Yes | Clone/gate/executor unit and integration tests | Shadow-publish should not proceed against placeholder clone/candidate refs. |

### D. Proposal/Improvement Execution

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `improvement-proposal-planning-service.ts`; `implementation-authorization-bridge.ts`; `improvement-execution-service.ts`; `improvement-execution-aaf-validator.ts`; `improved-candidate-creation-adapter.ts`; `improved-candidate-dry-run-adapter.ts`; related tests | Proposal planning, implementation authorization, improved candidate creation, and dry-run candidate adapter | Medium: AAF and candidate lineage must align | Yes | Proposal, authorization, execution, validator, adapter tests | Requires AAF scope migrations before online rehearsal. |

### E. Content/Client/Launch Approvals

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `content-approval-service.ts`; `content-approval-aaf-bridge.ts`; `client-approval-service.ts`; `client-approval-aaf-bridge.ts`; `launch-approval-service.ts`; `launch-approval-aaf-bridge.ts`; related tests | Approval chain before launch readiness and publish activation | Medium/high: seeded approvals must not be counted as final truth | Yes | Content/client/launch service and bridge tests | Include with special review because approval truth and limitations decide whether one site can count. |

### F. Launch Readiness

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `launch-readiness-service.ts`; `launch-readiness-source-reader.ts`; `launch-readiness-evidence-builder.ts`; writer/read repositories; related tests | Source-owned launch readiness and evidence package input | High: stale or seeded readiness can create false publish confidence | Yes | Launch readiness service/source/evidence tests | Required before dry-run/shadow-publish unless an explicit first-rehearsal exception is recorded. |

### G. Publish Activation

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `publish-activation-request-bridge.ts`; decision service/read model/repository; gate evaluator/handoff; metadata resolver/handoff; enforcement guard; wrapper orchestrator; related tests | Publish activation request, decision, gate metadata, guard diagnostics, wrapper orchestration | High: shadow-publish may move active pointer through existing publish path | Yes | Resolver, guard, wrapper, decision, gate tests | Include with special review. Keep blocking enforcement off; use shadow diagnostics only. |

### H. Operator Dry-Run/Shadow-Publish

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `single-site-publish-operator-dry-run-caller.ts`; dry-run API route/handlers/tests | MVP-54 dry-run caller and audit-writing route | Low/medium: should be non-mutating except audit writes | Yes | `single-site-publish-operator-dry-run-route.test.ts` | Must pass before any online dry-run. |
| `single-site-shadow-publish-operator-caller.ts`; shadow-publish API route/handlers/tests | MVP-56 internal shadow-publish route | High: may publish and move pointer | Optional/approval-gated | `single-site-shadow-publish-route.test.ts` | Feature flag must stay disabled until explicit human approval. |
| `single-site-publish-operator-action-audit.ts`; audit migration/tests | MVP-57 operator action audit | Medium: missing migration breaks route/panel audit truth | Yes | Audit unit/integration tests | Requires `20260806120000_single_site_publish_operator_action_audit.sql`. |

### I. Command Center Read-Only Panel

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`; `_components/SingleSitePublishOperatorPanel.tsx`; `single-site-publish-operator-panel.test.tsx`; `single-site-publish-operator-readonly-projection.ts` and tests | Internal read-only operator panel with readiness/audit/snapshot/diff/runbook projections | Medium: auth, redaction, and unexpected action exposure | Yes | Panel and projection tests | Must remain read-only and superadmin-only. |

### J. CUTLINE Orchestration/Operator Facade

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `single-site-mvp-operator-action-facade.ts`; status/action route handlers; `status/route.ts`; `action/route.ts`; route/facade tests | CUTLINE-3 minimal operator facade for status, preflight, dry-run execution, and flag-gated shadow-publish | Medium/high: generic action route is broad and must remain narrow | Yes | `single-site-mvp-operator-action-facade.test.ts`; `single-site-mvp-operator-action-route.test.ts` | Include with special review for operation-key allowlist, actor override rejection, and shadow flag behavior. |

### K. Docs/Index

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| CUTLINE-4 docs listed above; CUTLINE-5 docs; `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` | Commit/deploy/migration/env/approval/verification plan | Low | Yes | Markdown readability, diff check, index reference check | Current phase changes docs only. |

### L. Migrations

| Changed/new files | Purpose | Risk | Required | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| `20260722120000` through `20260806120000` single-site/AAF/DDOM/PTT/audit migration chain | Database schema for rehearsal data and audit | High: online routes fail or produce misleading truth if migrations are missing/out of order | Yes before online rehearsal | Disposable DB migration apply tests as feasible; post-apply catalog checks | Already committed; do not apply in CUTLINE-5. Apply to target only after approval. |

## Migration Application Plan

Apply in chronological filename order after deploy approval and before online route verification. Do not skip intermediate AAF/DDOM/PTT prerequisites.

| Order | Filename | Dependency notes | Required before rehearsal | Touches | Validation query/check |
| --- | --- | --- | --- | --- | --- |
| 1 | `20260722120000_aaf_persistence_core.sql` | Foundation for AAF approvals, evidence, and gate attempts | Yes | AAF/core | `select to_regclass('public.gnr8_aaf_approval_requests'), to_regclass('public.gnr8_aaf_action_gate_attempts');` |
| 2 | `20260727120000_ddom_readiness_snapshot_persistence_core.sql` | DDOM readiness input for launch/publish evidence | Yes | DDOM/runtime | `select to_regclass('public.gnr8_ddom_readiness_snapshots');` |
| 3 | `20260727130000_publish_target_source_truth_persistence_core.sql` | Publish target source truth and seeded production target | Yes | PTT/runtime | `select to_regclass('public.gnr8_publish_targets'); select key from public.gnr8_publish_targets order by key;` |
| 4 | `20260729120000_single_site_state_evidence_spine.sql` | Single-site migration identity, state, refs, blockers, source evidence | Yes | single-site/core | `select to_regclass('public.gnr8_single_site_migrations'), to_regclass('public.gnr8_single_site_source_evidence_reviews');` |
| 5 | `20260730120000_single_site_clone_review_core.sql` | Requires state spine/ref vocabulary | Yes | single-site/runtime | `select to_regclass('public.gnr8_single_site_clone_reviews');` |
| 6 | `20260730143000_single_site_improvement_proposal_planning_core.sql` | Requires state spine and clone review truth | Yes | single-site | `select to_regclass('public.gnr8_single_site_improvement_proposal_plans');` |
| 7 | `20260730170000_aaf_single_site_implementation_authorization_scope.sql` | Extends AAF scopes for implementation authorization | Yes | AAF/single-site | Check AAF scope definition accepts `single_site_improvement_implementation_authorization`. |
| 8 | `20260731100000_aaf_granted_with_limitations_status.sql` | Extends AAF decision vocabulary | Yes | AAF/core | Check `gnr8_aaf_approval_decisions` status constraint accepts `granted_with_limitations` in disposable DB. |
| 9 | `20260731120000_single_site_improvement_execution_core.sql` | Requires proposal and implementation authorization scope | Yes | single-site/runtime | `select to_regclass('public.gnr8_single_site_improvement_execution_attempts');` |
| 10 | `20260731143000_single_site_improved_version_review_core.sql` | Requires improved candidate refs | Yes | single-site | `select to_regclass('public.gnr8_single_site_improved_version_reviews');` |
| 11 | `20260803120000_aaf_single_site_content_approval_scope.sql` | Extends AAF for content approval | Yes | AAF/single-site | Check AAF scope definition accepts `single_site_content_approval`. |
| 12 | `20260803143000_single_site_content_approval_core.sql` | Requires improved review | Yes | single-site | `select to_regclass('public.gnr8_single_site_content_approvals');` |
| 13 | `20260803170000_aaf_single_site_client_launch_approval_scopes.sql` | Extends AAF for client and launch approval | Yes | AAF/single-site | Check AAF scope definitions accept client/launch approval scopes. |
| 14 | `20260803190000_single_site_client_approval_core.sql` | Requires content approval | Yes | single-site | `select to_regclass('public.gnr8_single_site_client_approvals');` |
| 15 | `20260803210000_single_site_launch_approval_core.sql` | Requires client approval | Yes | single-site | `select to_regclass('public.gnr8_single_site_launch_approvals');` |
| 16 | `20260804120000_single_site_launch_readiness_core.sql` | Requires launch approval source truth | Yes | single-site/runtime/DDOM | `select to_regclass('public.gnr8_single_site_launch_readiness_records');` |
| 17 | `20260804143000_aaf_single_site_launch_readiness_evidence_type.sql` | Extends AAF evidence packages for launch readiness | Yes | AAF/single-site | Check AAF evidence package type accepts launch readiness evidence. |
| 18 | `20260806120000_single_site_publish_operator_action_audit.sql` | Required by dry-run/shadow-publish routes and panel audit projection | Yes | single-site/core | `select to_regclass('public.gnr8_single_site_publish_operator_actions');` |

If migration application fails, stop the rehearsal. Do not continue with partial schema truth. Restore from the target environment's pre-migration backup or point-in-time recovery, capture the failed migration filename and SQL error, rerun the chain only on a disposable database first, and require human approval before retrying the target.

## Environment And Feature Flag Plan

| Env/flag | Rehearsal value | Risk | Owner |
| --- | --- | --- | --- |
| `DATABASE_URL` | Present for server-side repositories in target env | Wrong DB or missing DB breaks routes or writes audit to wrong environment | Release operator plus infrastructure owner |
| `NEXT_PUBLIC_SUPABASE_URL` | Present and target-specific | Wrong project causes auth/data mismatch | Infrastructure owner |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Present and target-specific | Auth failures or wrong project | Infrastructure owner |
| `SUPABASE_SERVICE_ROLE_KEY` | Present only where already required by deployment | Secret exposure or wrong project blast radius | Infrastructure owner |
| `SUPERADMIN_EMAILS` | Includes named rehearsal operator only | Unauthorized access or blocked operator | Product/release owner |
| `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` | Off/unset for deploy, status, preflight, dry-run | If enabled too early, shadow-publish route can execute | Release owner must approve any enablement |
| `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` | `enabled` only for approved publish/shadow observation | Confusion between diagnostics and blocking enforcement | Release owner |
| `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE` | Off/unset unless testing older observer intentionally | Extra AAF evidence/gate observer data can confuse rehearsal | Engineering owner |
| Provider/domain/DNS/billing/Stripe/Vercel/Openprovider env | Unchanged | Accidental side effects if altered | Infrastructure and ops owners |
| Any blocking publish enforcement flag | Remain off unless a separate enforcement rollout is approved | Could alter publish behavior beyond rehearsal scope | Engineering lead |

## Human Approval Gates

Require explicit approval before:

- staging files;
- committing;
- pushing;
- applying migrations to any shared/online Supabase environment;
- enabling `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`;
- running any online shadow-publish;
- treating any selected site as MVP validation evidence;
- retrying after any failed migration or unexpected mutation.

## Risk Register

| Risk | Mitigation | Blocks first rehearsal |
| --- | --- | --- |
| Many committed files from a long phase chain make review hard | Split bundle into docs, schema, and runtime review sections; run focused tests by area | No, if review gates pass |
| Required migrations not applied online | Apply ordered chain only after approval; catalog checks after each group | Yes |
| Full platform typecheck drift | Run focused no-emit and document app-wide drift separately | No, unless focused checks fail |
| Shadow-publish active pointer risk | Keep flag off by default; require explicit approval and pointer before/after capture | No for dry-run; yes for shadow-publish |
| Seeded data vs real-flow truth | Label MVP exceptions and do not count seeded run as final validation | No for route rehearsal; yes for validation count |
| Supabase RLS/policy expectations | Validate superadmin service/auth paths and non-superadmin denial | Yes if auth/RLS blocks required route or exposes data |
| Env flag mistakes | Two-person env readback before deploy and before shadow-publish | Yes for online run |
| Broad generic operator action route | Guardrail tests/searches for operation allowlist and actor override rejection | Yes if allowlist/auth tests fail |
| Provider/domain/billing side effects | Keep related flags/env unchanged; monitor logs; stop on side effect | Yes if observed |

## Recommendation

Proceed to a commit-prep implementation task only after a human reviews this bundle plan. Create a release branch before staging, preferably `codex/gnr8-single-site-mvp-rehearsal-bundle`, instead of committing directly on `main`.

Split commits:

1. Documentation/index only: CUTLINE-4 and CUTLINE-5 docs.
2. Runtime/migration release commit only if implementation files are not already the desired deployed `HEAD`.

Because `main` currently points at `origin/main` and the implementation spine is already committed, the immediate local commit should be docs/index only. Migrations should be applied after deployment reaches the target code version and before online verification. Do not enable shadow-publish until dry-run verification passes and a human accepts active-pointer mutation risk.

Files to exclude/defer: none from the current docs-only worktree. Unknown/human decision: whether the first selected site may use seeded approvals/readiness/gate truth; if yes, it is a rehearsal-only exception and must not count toward final MVP validation.
