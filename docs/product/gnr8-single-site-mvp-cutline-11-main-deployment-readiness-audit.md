# GNR8 Single-Site MVP CUTLINE-11 Main Deployment Readiness Audit

Date: 2026-08-13
Phase: MVP-CUTLINE-11
Scope: local-only audit after the single-site MVP cutline release branch landed on `main`.

## Boundary

This phase inspected only local git refs, local deployment/config evidence, local docs, and local migration filenames/content.

No deploy was performed. No Supabase migrations were applied. No production or staging Supabase call was made. No Vercel, Openprovider, DNS, Stripe, billing, domain, provider, publish, shadow-publish, runtime pointer, active pointer, publish target, or env flag mutation was performed.

## Git Landing State

Current checkout:

- Current branch: `codex/single-site-mvp-cutline-release`
- Current HEAD: `2e13f5d672001772c651824bd0e798f7875d190e`
- Current HEAD summary: `Review release branch CI state`
- Working tree: clean at audit start.

Main refs:

- `origin/main`: `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`
- `origin/main` summary: `Merge pull request #1 from pasadenagenerator/codex/single-site-mvp-cutline-release`
- Local `main`: `5c7cc096387cf475cf1e3423165d7b161cbb449d`
- Local `main` summary: `docs: add single-site MVP cutline deployment plan`
- Local `main...origin/main`: `0 3`, meaning local `main` is behind `origin/main` by 3 commits and has no unique local commits.

Release branch ancestry:

- `origin/codex/single-site-mvp-cutline-release` is an ancestor of `origin/main`.
- Merge base between `origin/codex/single-site-mvp-cutline-release` and `origin/main` is `2e13f5d672001772c651824bd0e798f7875d190e`, the release branch tip.
- `origin/codex/single-site-mvp-cutline-release...origin/main`: `0 1`, meaning `origin/main` is exactly one merge commit past the release branch tip from local ref evidence.

Local main update decision:

- Local `main` should be updated before any future local work that depends on the landed `main` state.
- It was not updated in this audit because the current release branch already contains the landed release content, the worktree is clean, and branch switching/updating is not necessary to answer the readiness questions.
- A future update should be a non-destructive fast-forward of `main` to `origin/main` after confirming the worktree is still clean.

## Deployment Status From Local Evidence

Local deploy/config evidence reviewed:

- Root `package.json` has no deploy script; it defines `check:next-route-exports`.
- `apps/platform/package.json` defines `vercel-build` as `pnpm run clean && next build`.
- `apps/worker/package.json` defines `build`, `typecheck`, and `test`.
- `apps/platform/next.config.mjs` and `apps/worker/next.config.mjs` both use Next standalone output.
- No checked-in `.github` workflow directory, `vercel.json`, `.vercel`, `.openai/hosting.json`, `netlify.toml`, `render.yaml`, `fly.toml`, `railway.json`, or equivalent deploy metadata was found in the inspected workspace.
- CUTLINE-7 and CUTLINE-9 docs already record that deploy behavior cannot be proven from local files alone and must be checked manually.

Deployment inference:

- A merge to `main` may trigger deployment through GitHub/Vercel configuration that lives outside this repo, but local evidence cannot prove that it does.
- It is not safe to infer that a deployment completed from the merge alone.
- It is also not safe to infer that no deployment happened.
- Deploy status is therefore `unknown_from_local_evidence`.

Human deploy checks required:

- Confirm GitHub `main` is at `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
- Inspect GitHub checks/runs for the merge commit.
- Inspect the deployment platform dashboard or deployment status UI for the `main` production target.
- Confirm the deployed commit SHA, build status, target environment, and health before any online GNR8 route verification.

## Migration Readiness Table

All required migration files are present locally under `apps/platform/supabase/migrations`. Application state in the target Supabase environment was not checked and remains unknown.

| Filename | Category | Required before one-site rehearsal | Dependency notes | Validation check after application | Risk if missing |
| --- | --- | --- | --- | --- | --- |
| `20260722120000_aaf_persistence_core.sql` | AAF | yes | Must precede all AAF scope, decision, evidence, and gate migrations. | Catalog confirms AAF approval/evidence/gate tables exist, RLS is enabled, indexes exist, and initial scope constraints are present. | Approval requests, decisions, evidence packages, audit events, and gate attempts cannot be recorded or read reliably. |
| `20260727120000_ddom_readiness_snapshot_persistence_core.sql` | DDOM | yes | Depends on runtime/domain readiness concepts already in repo; needed before publish activation evidence expects durable domain/readiness truth. | Catalog confirms DDOM readiness snapshot tables/indexes/RLS; rehearsal data has a fresh or explicitly excepted readiness snapshot. | Domain/readiness evidence is projection-only or missing, causing publish activation evidence to block or mislead. |
| `20260727130000_publish_target_source_truth_persistence_core.sql` | PTT | yes | Required before exact publish target refs can be used; seeds the canonical `production` target. | Catalog confirms `gnr8_publish_targets`, RLS, indexes, and an active target row for the intended environment/stage. | Dry-run/shadow-publish cannot prove the target, or may use ambiguous publish target truth. |
| `20260729120000_single_site_state_evidence_spine.sql` | single-site | yes | Core identity/state spine for every later single-site record. | Catalog confirms `gnr8_single_site_migrations`, state events, refs, blockers, closeouts, and source evidence review tables with RLS. | Orchestration status, source evidence truth, refs, and blockers are unavailable. |
| `20260730120000_single_site_clone_review_core.sql` | single-site | yes | Depends on the single-site state/evidence spine. | Catalog confirms clone review tables/events/refs and accepted or explicitly seeded review data for the selected site. | Clone acceptance cannot be proven before proposal/improvement. |
| `20260730143000_single_site_improvement_proposal_planning_core.sql` | single-site | yes | Depends on state spine and clone acceptance truth. | Catalog confirms proposal plans, recommendations, findings, refs, events, supersessions, and RLS. | Approved improvement scope cannot be represented; implementation authorization is blocked. |
| `20260730170000_aaf_single_site_implementation_authorization_scope.sql` | AAF / approval | yes | Depends on AAF core and proposal planning source truth. | Catalog confirms AAF scope/evidence/gate constraints allow exact `single_site_implementation_authorization` records. | Implementation authorization writes/evaluation can fail or use an invalid scope. |
| `20260731100000_aaf_granted_with_limitations_status.sql` | AAF / approval | yes | Depends on AAF core decision table. | Catalog confirms `gnr8_aaf_approval_decisions.status` accepts the limitations vocabulary. | Valid limited approvals can be rejected or misclassified. |
| `20260731120000_single_site_improvement_execution_core.sql` | single-site | yes | Depends on proposal planning and implementation authorization refs; extends state refs. | Catalog confirms improvement execution attempts/refs/items/events plus ref-role constraint updates. | Improved candidate lineage and execution truth cannot be persisted. |
| `20260731143000_single_site_improved_version_review_core.sql` | single-site | yes | Depends on improvement execution; extends state/event/ref constraints. | Catalog confirms improved version review tables/refs/items/events and accepted/limited review states. | Improved candidate cannot be accepted before content approval. |
| `20260803120000_aaf_single_site_content_approval_scope.sql` | AAF / approval | yes | Depends on AAF core and improved version review truth. | Catalog confirms AAF content approval scope/evidence/gate constraints. | Content approval AAF writes/evaluation fail or use wrong evidence shape. |
| `20260803143000_single_site_content_approval_core.sql` | approval | yes | Depends on improved version review and content approval AAF scope. | Catalog confirms content approval tables/refs/items/events/supersessions with RLS and AAF decision links. | Content approval truth is unavailable, blocking client and launch approvals. |
| `20260803170000_aaf_single_site_client_launch_approval_scopes.sql` | AAF / approval | yes | Depends on AAF core and content approval scope vocabulary. | Catalog confirms AAF client and launch approval scope/evidence/gate constraints. | Client/launch approval records may be invalid or blocked by constraints. |
| `20260803190000_single_site_client_approval_core.sql` | approval | yes | Depends on content approval and client AAF scope. | Catalog confirms client approval tables/refs/items/events/supersessions and state/ref constraint updates. | Launch approval lacks client approval truth unless an explicit MVP exception is recorded. |
| `20260803210000_single_site_launch_approval_core.sql` | approval | yes | Depends on content/client approvals and launch AAF scope. | Catalog confirms launch approval tables/refs/items/events/supersessions with readiness refs. | Launch readiness and publish activation cannot safely prove launch approval. |
| `20260804120000_single_site_launch_readiness_core.sql` | readiness | yes | Depends on launch approval and source-owned readiness inputs. | Catalog confirms launch readiness records/dimensions/refs/blockers/events/closeouts and fresh selected-site record or exception. | Readiness is missing/stale; rehearsal should stop or be explicitly exception-labeled. |
| `20260804143000_aaf_single_site_launch_readiness_evidence_type.sql` | AAF / readiness | yes | Depends on AAF core and launch readiness core. | Catalog confirms AAF evidence package type and required evidence type constraints include launch readiness evidence. | Publish activation evidence package construction can fail closed. |
| `20260806120000_single_site_publish_operator_action_audit.sql` | operator audit | yes | Depends on single-site refs and dry-run/shadow-publish operator routes. | Catalog confirms publish operator actions/refs/events, RLS, indexes, and successful audit write during dry-run. | Dry-run/shadow-publish may fail safely or panel/audit projection will be incomplete. |

Migration readiness decision:

- File inventory is ready locally.
- Target environment application status is unknown and must be verified manually with read-only catalog checks before any online GNR8 verification.
- Applying migrations requires explicit approval and is outside this phase.

## Environment And Flag Readiness

No environment variable values were read, changed, or enabled in this phase. The table below records what must be verified before rehearsal.

| Env/config | Required before rehearsal | Safe value/posture | Who must verify | Risk if wrong |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | yes | Present, target-specific, points to the intended Supabase/Postgres environment. | Infrastructure owner plus release operator. | Missing or wrong DB causes route failures or writes audit/source truth to the wrong environment. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Present, target-specific, matches the intended Supabase project. | Infrastructure owner. | Auth/data mismatch or accidental use of the wrong project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Present, target-specific, matches `NEXT_PUBLIC_SUPABASE_URL`. | Infrastructure owner. | Login/session helpers fail or point at the wrong project. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes where deployed server paths require it | Present only in server-side secret storage, matching the intended Supabase project; never exposed client-side. | Infrastructure owner. | Missing service-role access can break server reads/writes; wrong key increases blast radius. |
| `SUPERADMIN_EMAILS` | yes | Includes only the named rehearsal operator account(s). | Product/release owner. | Operator is blocked, or unintended users gain superadmin access. |
| `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` | no for deploy/status/preflight/dry-run; yes only for approved shadow-publish | Off/unset until explicit shadow-publish approval. Accepted enable values are documented as `1`, `true`, `enabled`, `on`, or `shadow_publish`. | Release owner before enablement. | If enabled too early, the shadow-publish route/facade can execute a publish path and may move the active pointer. |
| `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` | only for approved publish/shadow observation | Off/unset until observation is approved; `enabled` only when intentionally capturing read-only guard diagnostics during publish execution. | Release owner plus engineering owner. | Misread diagnostics as blocking enforcement, or omit diagnostics expected by the rehearsal. |
| `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE` | no unless intentionally testing the older observer | Off/unset for the single-site MVP rehearsal unless the older PASR-style observer is explicitly in scope. | Engineering owner. | Extra observer/evidence/gate dry-run records can confuse source-of-truth review. |
| Provider/domain/DNS/billing/Stripe/Openprovider/Vercel execution secrets and flags | no mutation required for this audit or dry-run | Leave unchanged; do not enable new execution capabilities for rehearsal prep. | Infrastructure owner plus release owner. | Accidental provider, billing, DNS, domain, or deployment side effects. |
| Any blocking publish enforcement flag | no | Remain off unless a later approved milestone changes enforcement posture. | Release owner. | Publish/shadow-publish behavior could block differently than the audited shadow-only cutline. |

## One-Site Rehearsal Readiness Decision

Decision: `ready_after_migrations_and_env`.

Reason:

- The code/docs branch is landed on `origin/main`.
- Local migration files and route/checklist documentation are present.
- Deployment status cannot be proven from local evidence.
- Target Supabase migration application status is unknown.
- Target env values, superadmin auth, and flag posture are unverified.
- Selected one-site source-truth data and any MVP exceptions are not yet confirmed.

Online GNR8 verification is still blocked by:

1. Manual confirmation that GitHub `main` is at `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
2. Manual confirmation that the deployment target is running that commit and is healthy.
3. Manual/read-only confirmation that all 18 required migrations are applied in the target Supabase environment.
4. Manual confirmation that required env values and superadmin auth are correct.
5. Manual decision that shadow-publish remains disabled for status/preflight/dry-run and is enabled only after explicit approval.
6. Selection of one real site plus exact tenant/client/site/migration/candidate/runtime/publish/readiness/AAF/gate refs, or labeled first-rehearsal exceptions.

## Human Checklist

- [ ] Verify GitHub `main` is `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
- [ ] Verify deployment status for `main`, including commit SHA, build result, deployment target, and health.
- [ ] Verify Supabase migration state with read-only catalog checks.
- [ ] Apply migrations only after explicit approval, backup/restore posture is known, and the target environment is confirmed.
- [ ] Verify `DATABASE_URL`, Supabase URL/anon key, service role posture, and `SUPERADMIN_EMAILS`.
- [ ] Keep `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` off for deploy/status/preflight/dry-run.
- [ ] Enable publish/shadow flags only with explicit approval and recorded owner/timestamp.
- [ ] Verify superadmin login with the selected operator account.
- [ ] Select one real site and record tenant/client/site/migration/candidate/runtime/publish/readiness/AAF/gate refs.
- [ ] Record any seeded or bypassed source-truth data as MVP exceptions before online verification.
- [ ] Then run the online panel/status/preflight/dry-run checklist.
- [ ] Stop before shadow-publish unless dry-run results are accepted and active-pointer mutation risk is explicitly approved.

## Documentation Updates

Created:

- `docs/product/gnr8-single-site-mvp-cutline-11-main-deployment-readiness-audit.md`

Updated:

- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Validation

Commands/checks run:

- `git status --short --branch`
- `git status --short --untracked-files=all`
- `git rev-parse --abbrev-ref HEAD`
- `git rev-parse HEAD`
- `git rev-parse main`
- `git rev-parse origin/main`
- `git branch -vv`
- `git log -1 --oneline HEAD`
- `git log -1 --oneline main`
- `git log -1 --oneline origin/main`
- `git merge-base --is-ancestor origin/codex/single-site-mvp-cutline-release origin/main`
- `git merge-base origin/codex/single-site-mvp-cutline-release origin/main`
- `git rev-list --left-right --count main...origin/main`
- `git rev-list --left-right --count origin/codex/single-site-mvp-cutline-release...origin/main`
- local package/config inspection for deploy scripts and hosting metadata
- local docs inspection for CUTLINE deployment, migration, env, and online verification gates
- local migration inventory inspection under `apps/platform/supabase/migrations`

Post-documentation validation results are recorded in the task response for this phase.

## Recommended Next Milestone

Recommended next milestone: MVP-CUTLINE-12, a controlled manual deploy/migration/env gate execution plan after a human confirms the production deployment status for `main`.

That milestone should still keep online GNR8 verification separate until the deployed commit, applied migrations, env posture, superadmin auth, and selected one-site source data are all confirmed.
