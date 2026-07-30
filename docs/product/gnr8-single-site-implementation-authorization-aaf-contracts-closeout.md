# GNR8 Single-Site Implementation Authorization AAF Contracts Closeout

Phase: MVP-17
Scope: AAF contracts, vocabulary, focused tests, AAF-only SQL scope expansion, and documentation only

## Files Reviewed

- `docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md`
- `docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`
- `docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/index.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `docs/product/gnr8-single-site-implementation-authorization-aaf-contracts-closeout.md`

Updated:

- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

`packages/gnr8-runtime-contracts/src/index.ts`, `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`, and `apps/platform/gnr8/aaf/aaf-writer-repository.ts` were reviewed but not changed.

## Final Scope Name

`single_site_improvement_implementation_authorization`

Related vocabulary:

- evidence package type: `single_site_improvement_implementation_authorization_evidence`
- subject type: `single_site_improvement_proposal_plan`
- allowed action: `start_single_site_improvement_implementation`

## SQL Migration

SQL migration was required because the AAF persistence core uses hardcoded CHECK constraints for approval scope and evidence package type vocabulary.

The additive migration only updates AAF CHECK constraints on:

- `gnr8_aaf_approval_scope_definitions.scope`
- `gnr8_aaf_approval_requests.scope`
- `gnr8_aaf_approval_policy_evaluations.scope`
- `gnr8_aaf_action_gate_attempts.scope`
- `gnr8_aaf_approval_scope_definitions.required_evidence_type`
- `gnr8_aaf_evidence_packages.package_type`

No non-AAF tables are changed. No approval requests, approval decisions, evidence packages, policy rows, runtime artifacts, site versions, proposal planning rows, provider records, DNS/domain rows, billing rows, publish rows, UI routes, API routes, server actions, Command Center actions, Ops Inbox actions, workers, or client portal routes are created or changed.

## Contract Fields Added

`packages/gnr8-runtime-contracts/src/aaf-contracts.ts` now exports:

- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_PROHIBITED_SUBSTITUTIONS`
- `AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT`
- narrow type aliases for required subject refs, evidence refs, and prohibited substitutions

The generic AAF vocabulary was extended in:

- `AAF_APPROVAL_SCOPES`
- `AAF_EVIDENCE_PACKAGE_TYPES`
- `AAF_SCOPE_REPLAY_CLASS`
- `AAF_SCOPE_PROHIBITED_ACTIONS`

## Required Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `proposal_plan`
- `proposal_plan_version`
- `proposal_plan_semantic_watermark`
- `proposal_approval_request`
- `proposal_approval_decision`
- `proposal_evidence_package`
- `clone_review`
- `clone_review_status`
- `clone_review_watermark`
- `clone_site_version`
- `runtime_artifact`
- `runtime_artifact_watermark`
- `source_evidence_review`
- `source_evidence_review_status`
- `source_evidence_review_watermark`
- `selected_recommendations`
- `selected_recommendation_watermarks`
- `implementation_target`
- `implementation_attempt_placeholder`

## Required Evidence Refs

- `proposal_plan_snapshot`
- `proposal_approval`
- `proposal_approval_limitations`
- `clone_review_acceptance`
- `clone_review_limitations`
- `source_evidence_acceptance`
- `source_evidence_limitations`
- `limitations`
- `selected_recommendations`
- `risk_impact_effort_summary`
- `implementation_scope_summary`
- `implementation_approach`
- `implementation_non_goals`
- `operator_notes`
- `advisory_ai_provider_refs`
- `generated_proposal_bundle_refs`
- `audit_timeline_refs`

## Prohibited Substitutions

These cannot satisfy implementation authorization:

- proposal approval alone
- clone review acceptance
- client approval
- content approval
- launch approval
- publish activation approval
- domain readiness
- DDOM readiness
- AI/provider output
- Command Center status
- Ops Inbox item
- chat transcript
- generated proposal bundle

The scope also prohibits action overreach into runtime mutation, content mutation, billing activation, hosting activation, DNS/domain mutation, rollback, AI execution, and provider-output authorization.

## Replayability Decision

Human approval for this scope is not replayable.

`AAF_SCOPE_REPLAY_CLASS.single_site_improvement_implementation_authorization` is `not_replayable`, and the scope contract sets `humanApprovalReplayable: false`.

## Gate And Policy Behavior

The policy/gate facade implementation was not changed.

Focused tests now prove the new scope inherits the existing fail-closed vocabulary behavior:

- exact tenant/client/site scope matching is required;
- exact subject type/id matching is required;
- the allowed action is only `start_single_site_improvement_implementation`;
- proposal approval, clone review acceptance, content approval, client approval, launch approval, publish activation, domain readiness, DDOM readiness, AI execution, Command Center status, Ops Inbox resolution, and generated proposal bundle authorization are prohibited overreach;
- implementation authorization does not imply content, client, launch, publish, domain, or readiness approval.

The existing facade already maps revoked, expired, superseded, stale evidence, missing evidence, policy errors, and fail-closed persistence outcomes to blocking gate results. `not_required_by_policy` remains explicit and policy-backed in the existing AAF contract and cannot be inferred from a missing approval row.

## Tests Run And Results

Passed:

- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`

Plain `tsx` runs for the server-only AAF platform tests failed before executing tests because `server-only` rejects loading without the repo's server-component condition. The same tests passed with `NODE_OPTIONS='--conditions=react-server'`.

## Type And Static Validation

Passed:

- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit --emitDeclarationOnly false`
- `pnpm exec tsc --noEmit --module esnext --moduleResolution bundler --target ES2022 --strict --skipLibCheck --types node --baseUrl apps/platform apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`

Platform-wide no-emit validation was attempted with `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit` and failed due to existing unrelated drift in admin route tests, client route tests, migration runtime tests, preview/runtime tests, provider tests, and template-intake tests. No reported platform-wide errors pointed to the MVP-17 changed files.

## SQL Validation

Validated on disposable local PostgreSQL using Docker `postgres:15`:

- applied `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`;
- applied `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`;
- queried `pg_constraint` to confirm the new scope appears in all four AAF scope CHECK constraints;
- queried `pg_constraint` to confirm the new evidence package type appears in both AAF evidence type CHECK constraints;
- stopped and removed the disposable container.

No production or staging Supabase instance was called.

## Guardrails

Guardrail searches were run to verify:

- changed code is confined to AAF contracts/foundation, the AAF-only migration, focused tests, and docs;
- `git diff --check` passed;
- trailing whitespace check on changed/new MVP-17 files passed;
- no single-site proposal planning service behavior changed;
- no single-site transition service behavior changed;
- no runtime mutation, content editing, provider, DNS/domain, Vercel, Openprovider, Stripe, billing, publish, rollback, route, worker, UI, client portal, Command Center, or Ops Inbox implementation files were changed;
- no approval request creation workflow was added;
- no approval decision creation workflow was added;
- no evidence package builder/workflow was added.

## External Provider Non-Call Confirmation

No AI providers, external providers, Supabase production/staging instances, Vercel, Openprovider, Stripe, billing, DNS/domain, hosting, publish, rollback, runtime artifact, or site version services were called.

The only external-style tooling used was local Docker for disposable PostgreSQL validation.

## Runtime/Public Behavior Impact

No runtime or public behavior changes are introduced by MVP-17.

The change makes the implementation authorization scope available to AAF contracts, writer enum validation, gate vocabulary tests, and AAF SQL constraints. It does not create requests, decisions, evidence packages, policy rows, bridges, loaders, builders, API routes, UI, server actions, workers, public runtime routes, or execution paths.

## Issues Found

- The AAF SQL persistence core hardcoded scope and evidence type CHECK constraints, so an additive AAF migration was required.
- Platform-wide typecheck currently has unrelated drift outside the MVP-17 scope.
- Plain `tsx` cannot run server-only AAF tests without `NODE_OPTIONS='--conditions=react-server'`.

## Residual Risks

- MVP-17 does not validate real implementation authorization refs against AAF at execution time.
- MVP-17 does not create an implementation authorization request workflow.
- MVP-17 does not build evidence packages.
- MVP-17 does not bridge proposal planning to AAF.
- Future work must preserve the exact scope, subject, evidence, freshness, revocation, expiration, supersession, and audit validation rules before any implementation mutation.

## Acceptance

MVP-17 is safe to accept as the AAF scope/contracts foundation.

The proposal-to-AAF authorization bridge may begin next, but only in a later milestone that creates request/evidence/validation plumbing without treating proposal approval as implementation authorization and without executing improvements.

Recommended next milestone:

MVP-18: proposal-to-AAF implementation authorization request and evidence package preparation bridge, still non-executing and fail-closed.

## Git Status Summary

Expected changed files:

- modified `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- modified `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- modified `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- modified `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- added `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- added `docs/product/gnr8-single-site-implementation-authorization-aaf-contracts-closeout.md`

Existing MVP-16 worktree changes remain present:

- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` already included the MVP-16 section before MVP-17 edits;
- untracked `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`;
- untracked `docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`;
- untracked `docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md`;
- untracked `docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`;
- untracked `docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`.

No commit or push was performed.

## Commands Run

- `sed -n '1,240p' docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`
- `sed -n '1,260p' docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `sed -n '1,260p' docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md`
- `sed -n '1,260p' docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`
- `sed -n '1,260p' docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`
- `sed -n '1,280p' packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `sed -n '1,360p' packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `sed -n '1,760p' apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `sed -n '1,420p' apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `sed -n '1,460p' apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `rg -n "approval_scope|request_scope|scope|CHECK|aaf" apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `rg --files apps/platform/supabase/migrations`
- `git status --short`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit --emitDeclarationOnly false`
- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit`
- `pnpm exec tsc --noEmit --module esnext --moduleResolution bundler --target ES2022 --strict --skipLibCheck --types node --baseUrl apps/platform apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `docker image inspect postgres:16-alpine`
- `docker images --format '{{.Repository}}:{{.Tag}}'`
- `docker run --rm -d --name gnr8-aaf-mvp17-postgres -e POSTGRES_PASSWORD=postgres postgres:15`
- `docker exec gnr8-aaf-mvp17-postgres pg_isready -U postgres`
- `docker cp apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql gnr8-aaf-mvp17-postgres:/tmp/20260722120000_aaf_persistence_core.sql`
- `docker cp apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql gnr8-aaf-mvp17-postgres:/tmp/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `docker exec gnr8-aaf-mvp17-postgres psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/20260722120000_aaf_persistence_core.sql`
- `docker exec gnr8-aaf-mvp17-postgres psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `docker exec gnr8-aaf-mvp17-postgres psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "select conname, pg_get_constraintdef(oid) like '%single_site_improvement_implementation_authorization%' as scope_ok, pg_get_constraintdef(oid) like '%single_site_improvement_implementation_authorization_evidence%' as evidence_ok from pg_constraint where conname in ('gnr8_aaf_approval_scope_definitions_scope_ck','gnr8_aaf_approval_requests_scope_ck','gnr8_aaf_approval_policy_evaluations_scope_ck','gnr8_aaf_action_gate_attempts_scope_ck','gnr8_aaf_approval_scope_definitions_evidence_type_ck','gnr8_aaf_evidence_packages_type_ck') order by conname"`
- `docker stop gnr8-aaf-mvp17-postgres`
- `git checkout -- apps/platform/tsconfig.tsbuildinfo`
- `git diff --check`
- `perl -ne 'print "$ARGV:$.:$_" if /[ \t]+$/' packages/gnr8-runtime-contracts/src/aaf-contracts.ts packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql docs/product/gnr8-single-site-implementation-authorization-aaf-contracts-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `rg -n "single-site|single_site|proposal|transition|runtime|provider|DNS|dns|Vercel|vercel|Openprovider|openprovider|Stripe|stripe|billing|domain|publish|rollback|AI|ai|route|worker|UI|client portal|Command Center|Ops Inbox" packages/gnr8-runtime-contracts/src/aaf-contracts.ts apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `rg -n "createApprovalRequest|writeApprovalRequestTransaction|createApprovalDecision|writeApprovalDecisionTransaction|createEvidencePackageTransaction|approval request|approval decision|evidence package builder|implementation executor|proposal-to-AAF|provider call|runtime mutation|publish activation|dns mutation|billing activation" packages/gnr8-runtime-contracts/src/aaf-contracts.ts apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
