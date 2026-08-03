# GNR8 Single-Site Content Approval AAF Contracts Closeout

Phase: MVP-27
Scope: AAF contracts, vocabulary, focused AAF tests, AAF-only SQL vocabulary expansion, and documentation only

## Files Reviewed

- `docs/architecture/gnr8-single-site-content-approval-architecture.md`
- `docs/architecture/gnr8-single-site-content-approval-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-content-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-content-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-content-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-content-approval-architecture-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/index.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`

Updated:

- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

`packages/gnr8-runtime-contracts/src/index.ts` and `apps/platform/gnr8/aaf/aaf-writer-repository.ts` were reviewed and did not require source changes.

## Final Vocabulary

Final AAF scope name: `single_site_content_approval`

Final AAF evidence package type name: `single_site_content_approval_evidence`

Related scope contract fields:

- subject type: `single_site_improved_version_review`
- allowed action: `approve_single_site_content`
- replay class: `not_replayable`
- human approval replayable: `false`
- allowed decision statuses: `granted`, `granted_with_limitations`, `rejected`, `revoked`, `expired`, `superseded`, `cancelled`
- allowed gate results: `allowed`, `approval_required`, `evidence_missing`, `evidence_stale`, `approval_stale`, `approval_superseded`, `approval_revoked`, `policy_error`, `fail_closed`

## SQL Migration

SQL migration was needed because current AAF SQL uses hardcoded CHECK constraints for scope and evidence type vocabulary.

Migration created:

- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`

Tables and constraints changed:

- `gnr8_aaf_approval_scope_definitions.scope`
- `gnr8_aaf_approval_requests.scope`
- `gnr8_aaf_approval_policy_evaluations.scope`
- `gnr8_aaf_action_gate_attempts.scope`
- `gnr8_aaf_approval_scope_definitions.required_evidence_type`
- `gnr8_aaf_evidence_packages.package_type`

The migration only expands AAF vocabulary constraints. It creates no requests, decisions, evidence packages, policy rows, non-AAF tables, grants, broad policies, runtime records, site versions, routes, workers, provider calls, publish actions, or UI/API surfaces.

## Required Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `improved_version_review`
- `improved_version_review_status`
- `improved_version_review_watermark`
- `improved_candidate_site_version`
- `improved_candidate_site_version_watermark`
- `improved_runtime_artifact`
- `improved_runtime_artifact_watermark`
- `proposal_plan`
- `proposal_approval`
- `implementation_authorization`
- `improvement_execution_attempt`
- `selected_recommendations`
- `selected_recommendation_watermarks`
- `source_evidence_review`
- `source_evidence_review_status`
- `source_evidence_review_watermark`
- `clone_review`
- `clone_review_status`
- `clone_review_watermark`
- `clone_site_version`
- `clone_runtime_artifact`
- `limitations`

These refs make the approval exact to one tenant/client/site, one single-site migration, one accepted improved version review, one improved candidate site version, and one improved runtime artifact.

## Required Evidence Refs

- `improved_candidate_rendered_snapshot`
- `improved_candidate_content_snapshot`
- `improved_candidate_metadata_snapshot`
- `recommendation_coverage_summary`
- `selected_recommendation_application_status`
- `seo_aeo_metadata_summary`
- `headings_body_copy_cta_internal_link_review_summary`
- `alt_text_accessibility_content_caveats`
- `structured_data_summary`
- `legal_compliance_notes`
- `known_limitations`
- `unresolved_not_applied_recommendations`
- `operator_review_notes`
- `audit_timeline_refs`

Preview rendering may be evidence through `improved_candidate_rendered_snapshot`, but preview rendering is explicitly prohibited as approval truth.

## Prohibited Substitutions

These cannot satisfy `single_site_content_approval`:

- improved version review acceptance
- proposal approval
- implementation authorization
- source evidence review acceptance
- clone review acceptance
- client approval
- launch approval
- publish activation approval
- domain readiness
- DDOM readiness
- billing/subscription readiness
- content publish event
- content rollback event
- preview rendering
- public runtime rendering
- AI/provider output
- Generated Proposal Bundle
- Command Center status
- Ops Inbox item
- chat transcript

The scope also prohibits overreach into runtime mutation, site version mutation, active pointer mutation, domain/DNS mutation, billing activation, hosting activation, content publish, content rollback, provider authorization, AI approval/execution, and UI-derived status.

## Replayability

Human approval remains non-replayable.

`AAF_SCOPE_REPLAY_CLASS.single_site_content_approval` is `not_replayable`, and `AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.humanApprovalReplayable` is `false`.

## Gate And Policy Behavior

The policy/gate facade remains non-executing. It records/evaluates AAF policy and gate attempts only.

MVP-27 adds minimal gate vocabulary support so:

- exact scope matching remains required;
- wrong scopes fail closed through existing approval scope/subject mismatch behavior;
- `single_site_content_approval` does not imply client approval;
- `single_site_content_approval` does not imply launch approval;
- `single_site_content_approval` does not imply publish activation approval;
- `single_site_content_approval` does not imply domain, DNS, DDOM, billing, subscription, hosting, or runtime readiness;
- `granted_with_limitations` maps to `allowed` only for explicitly supported limited-grant scopes and only when limitations are present.

## Boundaries

Content approval is a content-readiness approval for an accepted improved candidate.

It is not:

- improved version review acceptance;
- proposal approval;
- implementation authorization;
- client approval;
- launch approval;
- publish activation approval;
- content publish;
- content rollback;
- runtime approval;
- runtime artifact mutation;
- site version mutation;
- active pointer mutation;
- preview rendering;
- public runtime rendering;
- domain, DNS, DDOM, billing, subscription, hosting, provider, or AI readiness.

No runtime/public behavior changes are introduced.

## Validation

Passed:

- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit --pretty false`
- `pnpm exec tsc --noEmit --pretty false --skipLibCheck --strict --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --allowSyntheticDefaultImports apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- static SQL vocabulary validation for `20260803120000_aaf_single_site_content_approval_scope.sql`
- `git diff --check`
- trailing whitespace search on changed/new files

Attempted but environment-blocked:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`

The integration test now applies the new migration and includes acceptance/rejection coverage for the new SQL vocabulary, but it could not run here because Docker is not running and local Postgres binaries are unavailable.

Platform-wide validation:

- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false` was attempted and failed due to unrelated existing drift in admin route tests, client route tests, migration runtime tests, preview/runtime tests, provider tests, and template-intake tests. The focused AAF typecheck above passed.

## SQL Validation

Static SQL validation passed through the AAF contracts test and a focused migration check: all canonical TypeScript scope/evidence values are present across the core AAF migrations plus `20260803120000_aaf_single_site_content_approval_scope.sql`, the new scope appears in the four scope constraints, the new evidence type appears in the two evidence constraints, and the migration does not contain `create table`, `insert into`, `update public`, `delete from public`, `create policy`, or `grant`.

Disposable PostgreSQL validation is prepared in `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts` but blocked in this environment:

- Docker API unavailable at `/Users/gregorzigon/.docker/run/docker.sock`.
- `psql`, `postgres`, `initdb`, and `pg_ctl` are not installed.
- No production or staging Supabase instance was called.

## Guardrails

Guardrail checks confirm this phase does not add:

- content approval persistence or service core;
- content approval request creation workflow;
- approval decision creation workflow;
- evidence package builder workflow;
- improved version review service changes;
- proposal planning service changes;
- runtime artifact mutation;
- site version mutation;
- active pointer mutation;
- publish, rollback, domain, DNS, billing, Stripe, Vercel, Openprovider, AI, provider, route, worker, UI, client portal, Command Center, or Ops Inbox changes.

The only synthetic AAF row writes added are focused unit/integration test assertions for writer and SQL vocabulary behavior.

`git status --short` shows only AAF contracts/foundation files, focused AAF tests, the AAF-only migration, the MVP-27 closeout, and the canonical index update. No forbidden service, route, runtime, provider, DNS/domain, billing, publish, rollback, UI, client portal, Command Center, Ops Inbox, or worker files were changed.

## External Provider Non-Call Confirmation

No AI providers, external providers, Supabase production/staging instances, Vercel, Openprovider, Stripe, DNS/domain, billing, hosting, publish, rollback, runtime artifact, or site version services were called.

## Issues Found

- AAF SQL vocabulary constraints required an additive migration.
- Disposable PostgreSQL validation could not execute on this machine because Docker is not running and local Postgres binaries are unavailable.
- Platform-wide typecheck has unrelated existing drift outside the MVP-27 changed files.

## Residual Risks

- The migration should still be run in a disposable PostgreSQL-capable environment before final acceptance.
- MVP-27 does not create content approval persistence, service logic, request creation, decision creation, or evidence building.
- Future MVP-28 work must preserve exact scope/subject/evidence validation and limitation carry-forward.

## Acceptance

MVP-27 implemented the AAF scope/contracts foundation. The TypeScript contract layer, focused unit tests, static SQL vocabulary coverage, and guardrail checks are ready.

Because disposable PostgreSQL execution was environment-blocked here, final acceptance should run `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts` in an environment with Docker or local Postgres available.

MVP-28 content approval persistence/service core may begin after that disposable SQL validation passes.

Recommended next milestone: MVP-28 single-site content approval persistence/service core, server-only and non-mutating.

## Git Status Summary

Expected changed files:

- modified `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- modified `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- modified `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- modified `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- modified `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- modified `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- added `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- added `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.
