# GNR8 Single-Site Implementation Authorization Boundary Closeout

Phase: MVP-16
Scope: Documentation and architecture only

## Files Reviewed

- `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-planning-architecture.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-transition-contract.md`
- `docs/product/gnr8-single-site-improvement-proposal-operator-workflow.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md`
- `docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`
- `docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Current MVP-15 Behavior Summary

MVP-15 stores implementation authorization refs on the proposal planning model:

- plan JSON: `implementation_authorization_refs_json`;
- plan readiness flag: `implementation_authorization_attached`;
- proposal refs: `implementation_authorization_request` and `implementation_authorization_decision`;
- event action: `implementation_authorization_attached`;
- recommendation status vocabulary: `not_requested`, `requested`, `authorized`, `authorized_with_limitations`, `rejected`, `expired`, `superseded`.

The proposal planning service only attaches implementation authorization after plan status is `approved` or `approved_with_limitations`.

The transition service blocks `improvement_implementation_started` unless the latest proposal plan is approved or approved with limitations and `implementation_authorization_attached` is true.

The read model derives `implementationAuthorizationReady` from approved proposal status plus `implementation_authorization_attached`.

No implementation execution exists in MVP-15. No runtime artifacts, content, publish state, billing, domain/DNS, providers, workers, Command Center, Ops Inbox, or client portal behavior are executed by this proposal service.

No AAF validation is currently wired into implementation authorization. The attached ref is not checked for real AAF existence, scope, subject, actor/role, policy, freshness, evidence package, audit event, revocation, expiration, or supersession.

## Source-Of-Truth Decision

Selected architecture: hybrid with AAF truth.

AAF owns implementation authorization approval, audit, policy, evidence, freshness, revocation, expiration, and supersession truth.

The single-site proposal planning service stores durable AAF refs and derived readiness only.

Future implementation execution must validate AAF immediately before mutation.

AI output, generated proposal bundles, external workflow refs, and operator notes can be evidence only. Command Center and Ops Inbox are derived only.

## AAF Scope Recommendation

Recommended scope:

`single_site_improvement_implementation_authorization`

Recommended evidence package type:

`single_site_improvement_implementation_authorization_evidence`

Recommended subject type:

`single_site_improvement_proposal_plan`

Recommended allowed action:

`start_single_site_improvement_implementation`

## Required Subject Refs

- tenant id;
- client id;
- site id;
- single-site migration id;
- proposal plan id, version, and semantic watermark;
- proposal approval request id when available;
- proposal approval decision id;
- proposal evidence package id when available;
- clone review id, status, and watermark;
- clone site version ref;
- runtime artifact ref and hash/watermark when available;
- source evidence review id, status, and watermark;
- selected recommendation ids and watermarks;
- implementation target refs or intended target descriptor;
- implementation attempt id when available.

## Required Evidence Refs

- proposal plan snapshot;
- approved proposal decision;
- proposal approval limitations and exclusions;
- clone review acceptance;
- clone review limitations;
- clone site version ref;
- runtime artifact ref and hash/watermark;
- source evidence review acceptance;
- source evidence limitations;
- source capture and source evidence refs;
- selected recommendation summaries;
- risk, impact, effort, priority, confidence, and target scope;
- implementation scope summary;
- implementation approach classification;
- implementation non-goals;
- limitation carry-forward summary;
- operator notes;
- AI/provider advisory refs if used later;
- generated proposal bundle refs if used later;
- audit timeline refs.

## Status Vocabulary

- `not_required_yet`: proposal is not approved, implementation blocked.
- `required`: proposal is approved and authorization must be requested, implementation blocked.
- `requested`: AAF request exists but no effective grant exists, implementation blocked.
- `granted`: AAF grant is valid, implementation may start in a future executor after execution-time validation.
- `granted_with_limitations`: AAF grant is valid with limitations, implementation may start with limitations carried forward.
- `rejected`: AAF rejected the request, implementation blocked.
- `revoked`: AAF grant was withdrawn, implementation blocked.
- `expired`: AAF grant/request exceeded freshness/time window, implementation blocked.
- `superseded`: source, proposal, target, evidence, or policy changed, implementation blocked.
- `invalid`: ref is wrong, forged, malformed, wrong-scope, wrong-subject, or fails policy, implementation blocked.
- `stale`: ref exists but freshness/watermarks do not match, implementation blocked.

## Transition Contract Summary

- Proposal not approved blocks implementation.
- Proposal approved makes implementation authorization required.
- Proposal approved with limitations makes implementation authorization required with limitations carried forward.
- Authorization missing, requested, rejected, revoked, expired, superseded, invalid, or stale blocks implementation.
- Authorization granted may allow future implementation start only after execution-time AAF validation.
- Authorization granted with limitations may allow future implementation start only with limitations carried forward.
- Implementation started does not imply content approval.
- Implementation completed does not imply content approval.
- Content approval does not imply client, launch, or publish approval.
- Client approval does not imply publish activation approval.
- Launch approval does not imply publish activation approval.
- Publish activation approval applies only to one publish activation attempt.

## Operator Workflow Summary

The operator reviews the approved proposal, verifies upstream clone and source evidence, prepares implementation scope, attaches an evidence package, requests AAF implementation authorization, waits for reviewer grant/reject/grant-with-limitations, revises scope if rejected, records durable AAF refs if granted, and carries all limitations into future execution.

Implementation execution remains deferred.

## MVP Implementation Plan

Recommended next milestone:

MVP-17: AAF scope/contracts for implementation authorization.

Precise implementation boundary:

- add AAF scope vocabulary for `single_site_improvement_implementation_authorization`;
- add evidence package vocabulary for `single_site_improvement_implementation_authorization_evidence`;
- add prohibited action mapping;
- add replay class mapping;
- add contract tests for scope, evidence package, gate results, and prohibited actions;
- define read-only validation input shape for proposal planning refs;
- document fail-closed validator requirements;
- do not execute improvements.

MVP-17 should not yet implement runtime mutation, content editing, provider execution, AI execution, publish activation, billing, domain/DNS, UI/API routes, Command Center actions, Ops Inbox actions, client portal routes, rollback, or hosting activation.

## Explicit Deferrals

- SQL migrations for new authorization tables or AAF scope rows.
- TypeScript service bridge from proposal planning to AAF.
- AAF implementation authorization request/decision creation.
- AAF evidence builder implementation.
- Proposal service AAF-ref validation implementation.
- Implementation executor.
- AI/provider execution.
- Content editing.
- Runtime artifact or site version mutation.
- Billing/subscription/hosting activation.
- Domain/DNS readiness changes.
- Publish activation and rollback.
- UI/API/Command Center/Ops Inbox/client portal integration.
- Commits and pushes.

## Architecture Warnings

- Ref-only authorization can be forged or stale without AAF validation.
- Proposal approval can be mistaken for permission to implement.
- Implementation authorization can be mistaken for content approval, client approval, launch signoff, or publish activation approval.
- AI/provider output can be mistaken for authorization truth.
- Evidence can go stale before execution.
- Limitations can be lost across proposal approval and implementation execution.
- Command Center or Ops Inbox can accidentally become truth instead of projection.
- Direct mutation routes can bypass authorization.
- `implementation_authorization_attached = true` can be over-trusted unless future execution validates AAF.

## Whether Implementation May Begin

Improvement implementation may not begin from MVP-16.

The next safe milestone may implement AAF scope/contracts and validation foundations only. It must still not execute improvements or mutate runtime/content/publish/domain/billing state.

## Recommended Next Milestone

MVP-17: AAF scope/contracts for implementation authorization.

## Validation Performed

Performed for this closeout:

- all created docs exist and are readable;
- canonical index references MVP-16 docs;
- required sections are present;
- AAF source-of-truth decision is explicit;
- implementation authorization vs proposal approval boundary is explicit;
- implementation authorization vs content/client/launch/publish approval boundary is explicit;
- AI output non-authority boundary is explicit;
- no TypeScript, JavaScript, SQL, migration, route, worker, runtime, provider, billing, domain, publish, rollback, UI, Command Center, Ops Inbox, client portal, or AI implementation files changed;
- `git diff --check`;
- trailing whitespace check.

## Git Status Summary

Documentation-only status after validation:

- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`;
- untracked `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`;
- untracked `docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`;
- untracked `docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md`;
- untracked `docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`;
- untracked `docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`.

No implementation files should be modified.

## Commands Run

- `pwd && rg --files | rg '(^docs/|^apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql$|improvement-proposal-planning-service|proposal.*planning.*test|single-site.*contract|transition|read-model|repository|aaf|approval|generated.*proposal|command.*center|ops.*inbox)'`
- `git status --short`
- `rg -n "implementation|authorization|proposal|approved|limitations|scope|aaf|approval" ...`
- `rg -n "scope|approvalScope|approval_scope|publish|activation|evidence|policy|gate|AAF|aaf|approval" ...`
- `rg -n "implementation|authorization|proposal|approval|ref|AAF|aaf|execution|defer|no implementation" ...`
- `sed -n '1,220p' apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `sed -n '480,575p' apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `sed -n '340,370p' apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `sed -n '120,210p' apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `rg -n "implementation authorization|authorization ref|implementation_authorization|separate implementation|proposal approval" ...`
- `sed -n '1,120p' packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `sed -n '1,145p' apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `sed -n '1,130p' docs/architecture/gnr8-approval-persistence-model.md`
- `sed -n '120,260p' packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `sed -n '330,405p' apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `sed -n '170,195p' apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `sed -n '330,370p' apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `rg -n "implementationAuthorizationReady|recommendedNextAction|request_implementation_authorization|implementation_authorization" ...`
- `sed -n '145,200p' docs/architecture/gnr8-single-site-improvement-proposal-planning-architecture.md`
- `sed -n '70,170p' docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`
- `rg -n "MVP-15|improvement proposal|proposal planning|Single-Site" docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `sed -n '214,240p' docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `sed -n '210,260p' apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `sed -n '1040,1115p' apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `git diff --check`
- `git diff --name-only`
- `rg -n "MVP-16|gnr8-single-site-implementation-authorization" docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `rg -n "Source-Of-Truth Decision|AAF owns implementation authorization|Proposal approval is not implementation authorization|Implementation authorization is not content approval|AI output|No runtime behavior changed|No commit was performed|No push was performed" ...`
- `git status --short --untracked-files=all`
- `wc -l docs/architecture/gnr8-single-site-implementation-authorization-boundary.md docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `rg -n "[ \\t]+$" docs/architecture/gnr8-single-site-implementation-authorization-boundary.md docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `rg -n "^## (Current MVP-15 Behavior Summary|Source-Of-Truth Decision|AAF Scope Recommendation|Required Subject Refs|Required Evidence Refs|Status Vocabulary|Transition Contract Summary|Operator Workflow Summary|MVP Implementation Plan|Explicit Deferrals|Architecture Warnings|Whether Implementation May Begin|Recommended Next Milestone|Validation Performed|Git Status Summary|Runtime Behavior|Commit And Push)$" docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`

## Runtime Behavior

No runtime behavior changed.

## Commit And Push

No commit was performed.

No push was performed.
