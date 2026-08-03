# GNR8 Single-Site Client And Launch Approval AAF Contracts Closeout

Phase: MVP-31
Scope: AAF contracts/foundation, SQL vocabulary constraints, focused tests, and documentation only.

## Files Reviewed

- `docs/architecture/gnr8-single-site-client-approval-architecture.md`
- `docs/architecture/gnr8-single-site-launch-approval-architecture.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-source-of-truth.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-client-launch-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-client-launch-approval-architecture-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- `docs/product/gnr8-single-site-client-launch-approval-aaf-contracts-closeout.md`

Updated:

- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Vocabulary

Client approval:

- scope: `single_site_client_approval`
- evidence type: `single_site_client_approval_evidence`
- subject type: `single_site_improved_candidate_client_acceptance`
- allowed action: `approve_single_site_client_acceptance`

Launch approval:

- scope: `single_site_launch_approval`
- evidence type: `single_site_launch_approval_evidence`
- subject type: `single_site_launch_readiness_review`
- allowed action: `approve_single_site_launch_readiness`

## SQL Migration

SQL migration was needed because the current AAF CHECK constraints rejected the new scope and evidence vocabulary.

Migration created:

- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`

Tables and constraints changed:

- `public.gnr8_aaf_approval_scope_definitions`: scope vocabulary, required evidence vocabulary, and `gnr8_aaf_scope_defs_client_launch_approval_contract_ck`
- `public.gnr8_aaf_approval_requests`: scope vocabulary and `gnr8_aaf_requests_client_launch_approval_subject_ck`
- `public.gnr8_aaf_approval_policy_evaluations`: scope vocabulary and `gnr8_aaf_policy_evals_client_launch_approval_contract_ck`
- `public.gnr8_aaf_action_gate_attempts`: scope vocabulary and `gnr8_aaf_gate_attempts_client_launch_approval_contract_ck`
- `public.gnr8_aaf_evidence_packages`: package type vocabulary and `gnr8_aaf_evidence_client_launch_approval_subject_ck`

No rows, approvals, decisions, evidence packages, policies, grants, RLS policies, workflow tables, runtime records, routes, provider calls, or publish actions were created.

## Contract Fields

AAF scope contracts now include `nonApprovalBoundaries` in addition to purpose, subject type, evidence package type, allowed action, replay class, human approval replayability, allowed decision statuses, allowed gate results, required subject refs, required evidence refs, freshness behavior, prohibited substitutions, and prohibited actions.

Human approvals remain `not_replayable` with `humanApprovalReplayable: false`.

Allowed decision statuses for both new scopes:

- `granted`
- `granted_with_limitations`
- `rejected`
- `revoked`
- `expired`
- `superseded`
- `cancelled`

## Required Client Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `content_approval`
- `improved_candidate_site_version`
- `improved_runtime_artifact`
- `improved_version_review`
- `proposal_plan`
- `proposal_approval`
- `implementation_authorization`
- `improvement_execution_attempt`
- `selected_recommendations`
- `limitations`
- `client_or_account_reviewer_identity`
- `client_or_account_reviewer_representative_role`

## Required Client Evidence Refs

- `content_approval_decision`
- `improved_candidate_rendered_snapshot`
- `client_facing_summary`
- `limitations_summary`
- `deferred_or_not_applied_recommendation_summary`
- `operator_account_notes`
- `audit_timeline_refs`

## Required Launch Subject Refs

- `tenant`
- `client`
- `site`
- `single_site_migration`
- `content_approval`
- `client_approval_if_required`
- `client_approval_requirement_policy`
- `improved_candidate_site_version`
- `improved_runtime_artifact`
- `domain_readiness_placeholder_or_ref`
- `billing_hosting_entitlement_placeholder_or_ref`
- `rollback_readiness_placeholder_or_ref`
- `publish_target_placeholder_or_ref`
- `launch_checklist_refs`
- `limitations`

## Required Launch Evidence Refs

- `content_approval_decision`
- `client_approval_decision_if_required`
- `pre_launch_checklist_snapshot`
- `blocker_limitation_summary`
- `domain_readiness_evidence_refs_if_available`
- `billing_hosting_readiness_evidence_refs_if_available`
- `rollback_readiness_evidence_refs_if_available`
- `smoke_qa_summary_refs_if_available`
- `operator_launch_notes`
- `audit_timeline_refs`

## Prohibited Substitutions

Client approval cannot be satisfied by content approval, improved version review acceptance, implementation authorization, launch approval, publish activation approval, domain readiness, billing readiness, preview rendering, public runtime rendering, Command Center status, Ops Inbox items, AI/provider output, or chat transcripts.

Launch approval cannot be satisfied by content approval alone, client approval alone, implementation authorization, publish activation approval, domain readiness alone, billing readiness alone, DDOM readiness, PASR shadow readiness, PTT publish target readiness, preview rendering, public runtime rendering, Command Center status, Ops Inbox items, AI/provider output, or chat transcripts.

Wrong scopes fail closed through exact scope/subject/action/evidence contracts in TypeScript and SQL.

## Gate And Limitations Behavior

The AAF policy/gate facade remains non-executing and exact-scope oriented. Minimal vocabulary support was added so `granted_with_limitations` can map to `allowed` for `single_site_client_approval` and `single_site_launch_approval` only when limitations are present. Without carried limitations, limited grants remain blocked.

Client approval does not imply launch approval. Launch approval does not imply publish activation approval, domain/DNS readiness, billing/subscription readiness, DDOM readiness, PASR readiness, PTT readiness, runtime mutation, active pointer mutation, rollback execution, or public/runtime behavior.

## Boundary Confirmations

Content/client/launch/publish boundary:

- Content approval remains `single_site_content_approval`.
- Client approval is `single_site_client_approval`.
- Launch approval is `single_site_launch_approval`.
- Publish activation remains separate and downstream.

Domain/billing/readiness boundary:

- Domain, DNS, DDOM, billing, subscription, hosting entitlement, rollback, smoke/QA, and publish target refs may be future evidence inputs or placeholders.
- None of those readiness states can satisfy client or launch approval.

Runtime/AI/provider boundary:

- No runtime artifacts, site versions, active pointers, content services, providers, AI providers, DNS providers, Vercel, Openprovider, Stripe, Supabase production, or Supabase staging were called or mutated.

## Validation

Unit tests:

- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`: passed, 29 tests.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`: passed, 31 tests.

SQL and disposable DB validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`: passed, 1 test.
- The integration test applied the AAF migration chain to disposable local PostgreSQL, accepted the new client/launch scope and evidence vocabulary, and rejected invalid client/launch scope, action, subject, and evidence pairings.

Type/static validation:

- `pnpm exec tsc --noEmit --pretty false -p packages/gnr8-runtime-contracts/tsconfig.json`: passed.
- Focused temporary no-emit validation for changed contracts and AAF files passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc --noEmit --pretty false -p apps/platform/tsconfig.json`: failed on existing unrelated platform drift in older app/runtime tests, including candidate review action tests, first limited dry-run tests, client content/site create route tests, preview/runtime tests, provider tests, and template intake tests. No reported errors were from the MVP-31 changed files.

Additional required checks are recorded in the final report for this phase.

## Issues And Risks

Issues found:

- AAF SQL vocabulary constraints required an additive migration.
- Platform-wide typecheck still has unrelated existing drift outside the MVP-31 files.

Residual risks:

- This phase intentionally does not create persistence, services, requests, decisions, evidence packages, evidence builders, API/UI, runtime mutation, billing/domain readiness logic, or publish behavior. MVP-32 must implement client approval workflow/service core with exact-scope AAF validation before any consuming workflow treats client approval as real.

## Acceptance

MVP-31 is safe to accept for the AAF scopes/contracts foundation.

MVP-32 client approval persistence/service core may begin next, provided it remains server-only, validates exact AAF refs, preserves limitation carry-forward, and does not collapse content, client, launch, publish, domain, or billing boundaries.

Recommended next milestone:

- MVP-32 Single-Site Client Approval Persistence And Service Core.

Git status summary:

- Modified AAF contracts, focused AAF tests, policy/gate facade limited-grant vocabulary, writer integration migration chain, canonical index, and this closeout.
- Added one AAF-only SQL vocabulary migration.
- Existing untracked MVP-30 architecture/product docs are present in the workspace.

No commit or push was performed.
